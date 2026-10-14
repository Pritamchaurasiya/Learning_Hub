import math
import logging
from datetime import timedelta
from typing import Dict, Any, List, Optional
from django.utils import timezone
from django.db import transaction
from django.db.models import Avg, Q

from .models import SpacedRepetitionCard, TestAttempt, AttemptAnswer, QuestionBookmark, Question

logger = logging.getLogger(__name__)


class SuperMemoEngine:
    """
    SuperMemo SM-2+ Spaced Repetition Engine with Memory Stability Decay modeling.
    Calculates dynamic review schedules, retention probabilities, and daily revision decks.
    """

    @staticmethod
    def calculate_review(
        quality: int,
        previous_interval: int,
        previous_ease_factor: float,
        previous_repetitions: int,
        previous_stability: float = 1.0,
    ) -> Dict[str, Any]:
        """
        Calculates the next SM-2 interval, ease factor, repetition count, and stability.
        Quality range: 0 (complete blackout) to 5 (perfect instantaneous recall).
        """
        q = max(0, min(5, int(quality)))

        # Update Ease Factor: EF' = EF + (0.1 - (5 - q) * (0.08 + (5 - q) * 0.02))
        ef_delta = 0.1 - (5 - q) * (0.08 + (5 - q) * 0.02)
        new_ef = round(max(1.3, previous_ease_factor + ef_delta), 3)

        if q >= 3:
            # Successful recall
            if previous_repetitions == 0:
                new_interval = 1
            elif previous_repetitions == 1:
                new_interval = 6
            else:
                new_interval = max(1, round(previous_interval * new_ef))

            new_repetitions = previous_repetitions + 1
            is_lapse = False
            # Stability grows with interval and quality
            new_stability = round(max(0.5, new_interval * (0.8 + 0.2 * (q / 5.0))), 2)
        else:
            # Failed recall / lapse
            new_repetitions = 0
            new_interval = 1
            is_lapse = True
            new_stability = round(max(0.3, previous_stability * 0.4), 2)

        now = timezone.now()
        next_review = now + timedelta(days=new_interval)

        return {
            'quality': q,
            'interval_days': new_interval,
            'ease_factor': new_ef,
            'repetitions': new_repetitions,
            'is_lapse': is_lapse,
            'stability': new_stability,
            'next_review_at': next_review,
            'last_reviewed_at': now,
        }

    @classmethod
    def get_daily_deck(
        cls,
        user,
        topic: Optional[str] = None,
        card_type: Optional[str] = None,
        limit: int = 30,
    ) -> Dict[str, Any]:
        """
        Retrieves the user's active review deck prioritized by due timestamp,
        supplemented with new/unseen cards up to the specified limit.
        """
        now = timezone.now()
        base_qs = SpacedRepetitionCard.objects.filter(user=user)

        if topic and topic.strip() and topic.lower() != 'all':
            base_qs = base_qs.filter(topic__iexact=topic.strip())
        if card_type and card_type.strip() and card_type.lower() != 'all':
            base_qs = base_qs.filter(card_type__iexact=card_type.strip())

        # 1. Cards due for review (next_review_at <= now + 2 hours grace period)
        due_cards = list(
            base_qs.filter(next_review_at__lte=now + timedelta(hours=2))
            .order_by('next_review_at')[:limit]
        )

        # 2. If due cards are less than limit, add new unreviewed cards
        remaining_slots = limit - len(due_cards)
        new_cards = []
        if remaining_slots > 0:
            due_ids = [c.id for c in due_cards]
            new_cards = list(
                base_qs.filter(repetitions=0, last_reviewed_at__isnull=True)
                .exclude(id__in=due_ids)
                .order_by('created_at')[:remaining_slots]
            )

        active_cards = due_cards + new_cards

        # Aggregate stats
        total_cards = base_qs.count()
        total_due = base_qs.filter(next_review_at__lte=now + timedelta(hours=2)).count()
        mastered_count = base_qs.filter(repetitions__gte=4).count()
        learning_count = base_qs.filter(repetitions__gt=0, repetitions__lt=4).count()
        new_count = base_qs.filter(repetitions=0, last_reviewed_at__isnull=True).count()

        # Compute average retention
        retention_scores = [c.retention_probability for c in active_cards]
        avg_retention = round(sum(retention_scores) / len(retention_scores), 2) if retention_scores else 1.0

        return {
            'cards': [cls.serialize_card(c) for c in active_cards],
            'stats': {
                'total_cards': total_cards,
                'total_due': total_due,
                'mastered_count': mastered_count,
                'learning_count': learning_count,
                'new_count': new_count,
                'average_retention': avg_retention,
            },
        }

    @classmethod
    def record_card_review(cls, user, card_id: str, quality: int) -> Dict[str, Any]:
        """
        Executes a SuperMemo review on a card, updating DB state atomically.
        Guarded with idempotency cooldown to prevent accidental double-tap interval inflation.
        """
        with transaction.atomic():
            card = SpacedRepetitionCard.objects.select_for_update().get(id=card_id, user=user)

            # Idempotency / rapid-fire double review protection:
            # If the exact same quality was submitted within a 2-second debounce window, return existing card
            if card.last_reviewed_at and card.last_quality == quality:
                elapsed_sec = (timezone.now() - card.last_reviewed_at).total_seconds()
                if elapsed_sec < 2.0:
                    return {
                        'card': cls.serialize_card(card),
                        'review_result': {
                            'quality': card.last_quality,
                            'interval_days': card.interval_days,
                            'ease_factor': card.ease_factor,
                            'repetitions': card.repetitions,
                            'is_lapse': False,
                            'stability': card.stability,
                            'next_review_at': card.next_review_at,
                            'last_reviewed_at': card.last_reviewed_at,
                            'idempotent_skip': True,
                        },
                    }

            result = cls.calculate_review(
                quality=quality,
                previous_interval=card.interval_days,
                previous_ease_factor=card.ease_factor,
                previous_repetitions=card.repetitions,
                previous_stability=card.stability,
            )

            card.interval_days = result['interval_days']
            card.ease_factor = result['ease_factor']
            card.repetitions = result['repetitions']
            if result['is_lapse']:
                card.lapses += 1
            card.stability = result['stability']
            card.last_quality = result['quality']
            card.last_reviewed_at = result['last_reviewed_at']
            card.next_review_at = result['next_review_at']
            card.save()

            logger.info(
                f"[SuperMemo] Card {card.id} reviewed by {user.email}: "
                f"quality={quality}, next_interval={card.interval_days}d, EF={card.ease_factor}"
            )

            return {
                'card': cls.serialize_card(card),
                'review_result': result,
            }

    @classmethod
    def generate_from_mistakes(cls, user, attempt_id: str) -> Dict[str, Any]:
        """
        Auto-generates MISTAKE review cards from incorrect answers in a test attempt.
        """
        attempt = TestAttempt.objects.get(id=attempt_id, user=user)
        incorrect_answers = AttemptAnswer.objects.filter(
            attempt=attempt,
            is_correct=False
        ).select_related('question')

        created_cards = []
        for ans in incorrect_answers:
            q = ans.question
            # Idempotency check: don't create multiple cards for the exact same question & user
            existing = SpacedRepetitionCard.objects.filter(
                user=user,
                question=q,
                card_type='MISTAKE',
            ).first()
            if existing:
                continue

            # Find correct option texts
            correct_opts = list(q.options.filter(is_correct=True).values_list('text', flat=True))
            back_text = "\n".join(f"- {opt}" for opt in correct_opts) if correct_opts else "See detailed explanation."

            card = SpacedRepetitionCard.objects.create(
                user=user,
                question=q,
                card_type='MISTAKE',
                front=q.prompt,
                back=back_text,
                explanation=q.explanation or "Carefully review the conceptual foundation for this problem.",
                topic=q.topic or 'General',
                subject=attempt.test.category or 'General',
                difficulty=q.difficulty,
                interval_days=1,
                ease_factor=2.4, # slightly lower initial ease factor for errors
                stability=0.8,
            )
            created_cards.append(card)

        return {
            'created_count': len(created_cards),
            'cards': [cls.serialize_card(c) for c in created_cards],
        }

    @classmethod
    def generate_from_bookmarks(cls, user) -> Dict[str, Any]:
        """
        Converts question bookmarks into active recall spaced repetition cards.
        """
        bookmarks = QuestionBookmark.objects.filter(user=user).select_related('question')
        created_cards = []

        for bm in bookmarks:
            q = bm.question
            existing = SpacedRepetitionCard.objects.filter(
                user=user,
                question=q,
                card_type='QUESTION',
            ).first()
            if existing:
                continue

            correct_opts = list(q.options.filter(is_correct=True).values_list('text', flat=True))
            back_text = "\n".join(f"- {opt}" for opt in correct_opts) if correct_opts else "See solution."

            card = SpacedRepetitionCard.objects.create(
                user=user,
                question=q,
                card_type='QUESTION',
                front=q.prompt,
                back=back_text,
                explanation=(bm.notes + "\n" + q.explanation).strip() if bm.notes else q.explanation,
                topic=q.topic or 'General',
                subject='General',
                difficulty=q.difficulty,
            )
            created_cards.append(card)

        return {
            'created_count': len(created_cards),
            'cards': [cls.serialize_card(c) for c in created_cards],
        }

    @classmethod
    def get_retention_analytics(cls, user) -> Dict[str, Any]:
        """
        Aggregates comprehensive psychometric memory analytics and retention curves.
        """
        cards = SpacedRepetitionCard.objects.filter(user=user)
        total = cards.count()
        now = timezone.now()

        if total == 0:
            return {
                'total_cards': 0,
                'mastery_rate': 0.0,
                'average_retention': 1.0,
                'due_today': 0,
                'forecast_7d': [0] * 7,
                'topic_breakdown': [],
            }

        # Topic breakdown
        topics = {}
        forecast_7d = [0] * 7
        total_retention = 0.0

        for c in cards:
            r = c.retention_probability
            total_retention += r

            top = c.topic or 'General'
            if top not in topics:
                topics[top] = {'topic': top, 'total': 0, 'mastered': 0, 'sum_retention': 0.0}
            topics[top]['total'] += 1
            if c.repetitions >= 4:
                topics[top]['mastered'] += 1
            topics[top]['sum_retention'] += r

            # Forecast due days
            if c.next_review_at:
                diff_days = (c.next_review_at.date() - now.date()).days
                if 0 <= diff_days < 7:
                    forecast_7d[diff_days] += 1

        topic_list = []
        for t, data in topics.items():
            topic_list.append({
                'topic': t,
                'total_cards': data['total'],
                'mastered_cards': data['mastered'],
                'mastery_percentage': round((data['mastered'] / data['total']) * 100, 1),
                'average_retention': round(data['sum_retention'] / data['total'], 2),
            })

        topic_list.sort(key=lambda x: x['total_cards'], reverse=True)

        mastered_count = cards.filter(repetitions__gte=4).count()
        due_today = cards.filter(next_review_at__lte=now + timedelta(hours=2)).count()

        return {
            'total_cards': total,
            'mastered_count': mastered_count,
            'mastery_rate': round((mastered_count / total) * 100, 1),
            'average_retention': round(total_retention / total, 2),
            'due_today': due_today,
            'forecast_7d': forecast_7d,
            'topic_breakdown': topic_list,
        }

    @staticmethod
    def serialize_card(card: SpacedRepetitionCard) -> Dict[str, Any]:
        """
        Serializes a SpacedRepetitionCard instance into API response dict.
        """
        return {
            'id': card.id,
            'card_type': card.card_type,
            'front': card.front,
            'back': card.back,
            'explanation': card.explanation,
            'topic': card.topic,
            'subject': card.subject,
            'difficulty': card.difficulty,
            'interval_days': card.interval_days,
            'ease_factor': card.ease_factor,
            'repetitions': card.repetitions,
            'lapses': card.lapses,
            'stability': card.stability,
            'last_quality': card.last_quality,
            'retention_probability': card.retention_probability,
            'last_reviewed_at': card.last_reviewed_at.isoformat() if card.last_reviewed_at else None,
            'next_review_at': card.next_review_at.isoformat() if card.next_review_at else None,
            'created_at': card.created_at.isoformat(),
        }
