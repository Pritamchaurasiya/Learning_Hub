import math
from typing import List, Dict, Any, Optional
from collections import defaultdict
from django.utils import timezone
from .models import Problem, ProblemSubmission


class DSARecommendationEngine:
    """
    Next-Best-Action DSA Problem Recommendation Engine.
    Implements multi-factor ranking based on:
    - Topic accuracy weakness (W_weak = 0.40)
    - Latent skill & difficulty calibration (W_diff = 0.30)
    - Unresolved attempted problem urgency (W_recency = 0.15)
    - Novel concept exploration (W_novelty = 0.15)
    With category diversity capping (max 2 per category) and explainable pedagogical rationales.
    """

    W_WEAK = 0.40
    W_DIFF = 0.30
    W_RECENCY = 0.15
    W_NOVELTY = 0.15

    DIFFICULTY_MAP = {
        'easy': 1.0,
        'medium': 2.0,
        'hard': 3.0,
    }

    @classmethod
    def get_recommendations(
        cls,
        user=None,
        limit: int = 6,
        category_cap: int = 2
    ) -> List[Dict[str, Any]]:
        all_problems = list(Problem.objects.all())
        if not all_problems:
            return []

        # If user is unauthenticated or has zero history -> Cold-Start fallback
        if not user or not user.is_authenticated:
            return cls._cold_start_recommendations(all_problems, limit)

        # 1. Fetch user submission history
        user_submissions = ProblemSubmission.objects.filter(user=user)
        if not user_submissions.exists():
            return cls._cold_start_recommendations(all_problems, limit)

        # Build sets of solved and attempted problem IDs
        solved_problem_ids = set(user_submissions.filter(status='Accepted').values_list('problem_id', flat=True))
        attempted_problem_ids = set(user_submissions.values_list('problem_id', flat=True))

        # 2. Compute category accuracies
        category_stats = defaultdict(lambda: {'total': 0, 'accepted': 0})
        for sub in user_submissions.select_related('problem'):
            cat = sub.problem.category or 'General'
            category_stats[cat]['total'] += 1
            if sub.status == 'Accepted':
                category_stats[cat]['accepted'] += 1

        category_weakness = {}
        for cat, stats in category_stats.items():
            acc = stats['accepted'] / max(1, stats['total'])
            category_weakness[cat] = 1.0 - acc

        # 3. Estimate student baseline ability theta (1.0 to 3.0)
        total_accepted = len(solved_problem_ids)
        if total_accepted < 5:
            student_theta = 1.0  # Beginner / Easy
        elif total_accepted < 15:
            student_theta = 1.8  # Intermediate / Medium
        else:
            student_theta = 2.5  # Advanced

        # 4. Filter candidates (exclude already solved)
        candidates = [p for p in all_problems if p.id not in solved_problem_ids]
        if not candidates:
            # If all are solved, consider all problems
            candidates = all_problems

        # 5. Score candidates
        scored_candidates = []
        for p in candidates:
            cat = p.category or 'General'
            diff_score = cls.DIFFICULTY_MAP.get(p.difficulty.lower(), 1.5)

            # S_weak
            s_weak = category_weakness.get(cat, 0.5)

            # S_diff (Gaussian distance from student ability)
            s_diff = math.exp(-((diff_score - student_theta) ** 2) / 2.0)

            # S_recency (attempted but never solved)
            is_unsolved_attempt = (p.id in attempted_problem_ids) and (p.id not in solved_problem_ids)
            s_recency = 1.0 if is_unsolved_attempt else 0.0

            # S_novelty (unattempted problem)
            s_novelty = 1.0 if p.id not in attempted_problem_ids else 0.0

            priority = (
                cls.W_WEAK * s_weak +
                cls.W_DIFF * s_diff +
                cls.W_RECENCY * s_recency +
                cls.W_NOVELTY * s_novelty
            )

            # Formulate pedagogical rationale
            if is_unsolved_attempt:
                rationale = f"Re-attempt recommended: review and resolve your previous submission in {cat}."
            elif s_weak > 0.6:
                rationale = f"Targeted practice to strengthen accuracy in {cat}."
            elif p.difficulty.lower() == 'medium' and student_theta >= 1.5:
                rationale = f"Level-up challenge in {cat} matching your progressing ability."
            elif s_novelty == 1.0:
                rationale = f"Explore new concept coverage in {cat}."
            else:
                rationale = f"Recommended core practice problem in {cat}."

            scored_candidates.append({
                'problem': p,
                'priority': round(priority, 4),
                'rationale': rationale,
                'category': cat,
                'difficulty': p.difficulty,
                'is_unsolved_attempt': is_unsolved_attempt,
            })

        # Sort by highest priority
        scored_candidates.sort(key=lambda x: x['priority'], reverse=True)

        # 6. Apply Category Diversity Guard (max category_cap per category)
        selected = []
        category_counts = defaultdict(int)

        for item in scored_candidates:
            cat = item['category']
            if category_counts[cat] < category_cap:
                selected.append(item)
                category_counts[cat] += 1
                if len(selected) >= limit:
                    break

        # Fallback if diversity filtering yielded fewer than limit
        if len(selected) < limit:
            remaining = [c for c in scored_candidates if c not in selected]
            selected.extend(remaining[:limit - len(selected)])

        # Serialize results
        return [
            {
                'id': item['problem'].id,
                'title': item['problem'].title,
                'slug': item['problem'].slug,
                'difficulty': item['problem'].difficulty,
                'category': item['problem'].category,
                'acceptance_rate': item['problem'].acceptance_rate,
                'priority_score': item['priority'],
                'recommendation_reason': item['rationale'],
                'user_status': 'ATTEMPTED' if item['is_unsolved_attempt'] else 'UNATTEMPTED',
            }
            for item in selected
        ]

    @classmethod
    def _cold_start_recommendations(cls, problems: List[Problem], limit: int) -> List[Dict[str, Any]]:
        """Foundational problems for new or unauthenticated users."""
        # Prefer Easy problems
        easy_problems = [p for p in problems if p.difficulty.lower() == 'easy']
        selected = easy_problems[:limit] if easy_problems else problems[:limit]

        return [
            {
                'id': p.id,
                'title': p.title,
                'slug': p.slug,
                'difficulty': p.difficulty,
                'category': p.category,
                'acceptance_rate': p.acceptance_rate,
                'priority_score': 0.85,
                'recommendation_reason': f"Foundational core problem in {p.category} to benchmark your baseline profile.",
                'user_status': 'UNATTEMPTED',
            }
            for p in selected
        ]
