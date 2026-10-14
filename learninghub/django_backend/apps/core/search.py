import re
from typing import List, Dict, Any, Type, Sequence
from django.db.models import Q, Model


class TokenizedSearchEngine:
    """
    Tokenized Multi-Word Search & Relevance Engine.
    Implements:
    - Stopword stripping & query normalization
    - Token decomposition & bounded Q filter construction
    - Weighted multi-field relevance scoring:
        * Title match: 10.0 pts per token
        * Tag match: 5.0 pts per token
        * Description match: 1.0 pt per token
        * Exact phrase bonus in title: +25.0 pts
        * Full token coverage bonus: +15.0 pts
    """

    STOP_WORDS = {
        'a', 'an', 'the', 'in', 'on', 'for', 'and', 'to', 'of',
        'with', 'is', 'at', 'by', 'from', 'or', 'as', 'into', 'how'
    }

    @classmethod
    def normalize_and_tokenize(cls, query: str) -> List[str]:
        if not query or not query.strip():
            return []
        cleaned = re.sub(r'[^\w\s-]', ' ', query.lower())
        tokens = [t.strip() for t in cleaned.split() if t.strip()]
        meaningful_tokens = [t for t in tokens if t not in cls.STOP_WORDS and len(t) > 1]
        return meaningful_tokens if meaningful_tokens else tokens

    @classmethod
    def search_and_rank(
        cls,
        queryset,
        query: str,
        title_field: str = 'title',
        desc_field: str = 'description',
        tags_field: str = None,
        limit: int = 50
    ) -> List[Any]:
        if not query or not query.strip():
            return list(queryset[:limit])

        raw_query = query.strip().lower()
        tokens = cls.normalize_and_tokenize(query)

        if not tokens:
            return list(queryset[:limit])

        # Construct broad Q filter for database pre-filtering
        broad_q = Q()
        for token in tokens:
            token_q = Q(**{f"{title_field}__icontains": token})
            if desc_field:
                token_q |= Q(**{f"{desc_field}__icontains": token})
            if tags_field:
                token_q |= Q(**{f"{tags_field}__icontains": token})
            broad_q |= token_q

        candidates = list(queryset.filter(broad_q)[:limit * 3])

        # In-memory relevance ranking
        scored = []
        for item in candidates:
            title_val = (getattr(item, title_field, '') or '').lower()
            desc_val = (getattr(item, desc_field, '') or '').lower() if desc_field else ''
            tags_val = ''
            if tags_field:
                raw_tags = getattr(item, tags_field, '')
                if isinstance(raw_tags, list):
                    tags_val = ' '.join(str(t).lower() for t in raw_tags)
                else:
                    tags_val = str(raw_tags or '').lower()

            score = 0.0
            matched_tokens = 0

            # Exact phrase bonus
            if raw_query in title_val:
                score += 25.0

            # Token scoring
            for token in tokens:
                token_matched = False
                if token in title_val:
                    score += 10.0
                    token_matched = True
                if tags_field and token in tags_val:
                    score += 5.0
                    token_matched = True
                if desc_field and token in desc_val:
                    score += 1.0
                    token_matched = True

                if token_matched:
                    matched_tokens += 1

            # Full coverage bonus
            if matched_tokens == len(tokens):
                score += 15.0

            scored.append((score, item))

        # Sort by score descending
        scored.sort(key=lambda x: x[0], reverse=True)
        return [item for _, item in scored[:limit]]
