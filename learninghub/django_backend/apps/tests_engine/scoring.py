import math
from django.utils import timezone
from .models import Test, Question, Option, TestAttempt, AttemptAnswer, TopicPerformance

class IRTScoringEngine:
    @staticmethod
    def calculate_score_and_irt(attempt: TestAttempt, answers_data: list):
        test = attempt.test
        questions = {q.id: q for q in test.questions.prefetch_related('options').all()}

        total_marks_obtained = 0.0
        correct_count = 0
        total_attempted = 0
        topic_deltas = {}

        for item in answers_data:
            q_id = item.get('questionId') or item.get('question_id')
            if not q_id or q_id not in questions:
                continue

            question = questions[q_id]
            selected_opt_id = item.get('selectedOptionId') or item.get('selected_option_id')
            selected_opt_ids = item.get('selectedOptionIds') or item.get('selected_option_ids')
            if selected_opt_ids is None and selected_opt_id is not None:
                selected_opt_ids = [selected_opt_id]
            elif selected_opt_ids is None:
                selected_opt_ids = []

            time_spent = item.get('timeSpentSeconds') or item.get('time_spent', 0)

            is_correct = False
            correct_opts = [o.id for o in question.options.all() if o.is_correct]

            if selected_opt_ids:
                total_attempted += 1
                # Support both single-select and multi-select exact match
                if set(selected_opt_ids) == set(correct_opts) and len(correct_opts) > 0:
                    is_correct = True
                    marks = question.marks
                    correct_count += 1
                else:
                    is_correct = False
                    marks = -question.negative_marks if test.negative_marking else 0.0

                total_marks_obtained += marks
            else:
                marks = 0.0

            # Store answer
            AttemptAnswer.objects.update_or_create(
                attempt=attempt,
                question=question,
                defaults={
                    'selected_option_id': selected_opt_id,
                    'is_correct': is_correct,
                    'marks_awarded': marks,
                    'time_spent_sec': time_spent
                }
            )

            # Topic tracking
            topic = question.topic
            if topic not in topic_deltas:
                topic_deltas[topic] = {'correct': 0, 'total': 0}
            topic_deltas[topic]['total'] += 1
            if is_correct:
                topic_deltas[topic]['correct'] += 1

        total_questions = len(questions)
        accuracy = round((correct_count / max(1, total_attempted)) * 100, 1) if total_attempted > 0 else 0.0
        percentage = round((max(0, total_marks_obtained) / max(1, test.total_marks)) * 100, 1)
        passed = total_marks_obtained >= test.passing_marks

        # IRT Theta estimation: simplified MLE log-odds estimation
        p = max(0.01, min(0.99, correct_count / max(1, total_questions)))
        theta = round(math.log(p / (1.0 - p)), 2)

        # Predicted Rank estimation (Simulation based on candidate pool of 50,000)
        predicted_rank = max(1, int(50000 * (1.0 - (percentage / 100.0) ** 1.5)))

        attempt.score = round(total_marks_obtained, 2)
        attempt.percentage = percentage
        attempt.accuracy = accuracy
        attempt.passed = passed
        attempt.irt_ability_theta = theta
        attempt.predicted_rank = predicted_rank
        # Preserve TIMEOUT set by SubmitTestView timer enforcement (anti-cheat).
        # Scoring must not clobber the terminal TIMEOUT state back to SUBMITTED.
        if attempt.status != 'TIMEOUT':
            attempt.status = 'SUBMITTED'
        if not attempt.submitted_at:
            attempt.submitted_at = timezone.now()
        attempt.save()

        # Update user topic performances
        for topic, stats in topic_deltas.items():
            tp, created = TopicPerformance.objects.get_or_create(
                user=attempt.user,
                topic=topic,
                defaults={'correct_count': 0, 'total_count': 0, 'accuracy': 0.0}
            )
            tp.correct_count += stats['correct']
            tp.total_count += stats['total']
            tp.accuracy = round((tp.correct_count / max(1, tp.total_count)) * 100, 1)
            tp.ability_theta = theta
            tp.save()

        return {
            'score': attempt.score,
            'totalMarks': test.total_marks,
            'percentage': percentage,
            'accuracy': accuracy,
            'passed': passed,
            'predictedRank': predicted_rank,
            'irtAbilityTheta': theta,
            'correctCount': correct_count,
            'totalQuestions': total_questions,
        }

    @staticmethod
    def calculate_3pl_probability(theta: float, a: float = 1.0, b: float = 0.0, c: float = 0.25) -> float:
        """
        Calculate 3-parameter logistic (3PL) probability:
        P(theta) = c + (1 - c) / (1 + exp(-a * (theta - b)))
        """
        try:
            exp_term = math.exp(-max(-15.0, min(15.0, a * (theta - b))))
            return c + (1.0 - c) / (1.0 + exp_term)
        except OverflowError:
            return 1.0 if (theta - b) > 0 else c

    @staticmethod
    def fisher_information(theta: float, a: float = 1.0, b: float = 0.0, c: float = 0.25) -> float:
        """Calculate Fisher Information for 3PL item at given latent ability theta."""
        p = IRTScoringEngine.calculate_3pl_probability(theta, a, b, c)
        if p <= c or p >= 1.0:
            return 0.01
        q = 1.0 - p
        numerator = (p - c) ** 2 * q
        denominator = (1.0 - c) ** 2 * p
        return (a ** 2) * (numerator / max(1e-5, denominator))

    @staticmethod
    def update_adaptive_theta(current_theta: float, question: Question, is_correct: bool, step: int) -> float:
        """
        Adaptive Newton-Raphson / bounded Bayesian ability update.
        Adjusts theta dynamically based on item response correctness and discrimination.
        """
        a = getattr(question, 'discrimination', 1.0) or 1.0
        b = getattr(question, 'difficulty', 0.0) or 0.0
        c = 0.25

        p = IRTScoringEngine.calculate_3pl_probability(current_theta, a, b, c)
        info = IRTScoringEngine.fisher_information(current_theta, a, b, c)

        # Dampened step size to prevent wild oscillation
        learning_rate = 1.0 / math.sqrt(max(1, step))
        delta = learning_rate * (1.0 if is_correct else 0.0 - p) / (info + 0.2)

        # Bound step delta to +/- 1.0 per question
        delta = max(-1.0, min(1.0, delta))
        new_theta = current_theta + delta

        # Global ability bounded between -3.0 and +3.0
        return round(max(-3.0, min(3.0, new_theta)), 3)

    @staticmethod
    def get_next_adaptive_question(attempt: TestAttempt, max_questions: int = 10):
        """
        Selects the next unattempted question that maximizes Fisher Information
        at the student's current latent ability theta.
        """
        answered_ids = set(attempt.answers.values_list('question_id', flat=True))
        total_available = attempt.test.questions.count()

        if len(answered_ids) >= max_questions or len(answered_ids) >= total_available:
            return None

        unanswered_qs = (
            attempt.test.questions
            .exclude(id__in=answered_ids)
            .prefetch_related('options')
        )

        if not unanswered_qs.exists():
            return None

        theta = attempt.irt_ability_theta
        # Rank by maximum Fisher Information (or closest difficulty b to theta)
        best_q = None
        max_info = -1.0

        for q in unanswered_qs:
            a = q.discrimination or 1.0
            b = q.difficulty or 0.0
            info = IRTScoringEngine.fisher_information(theta, a, b)
            if info > max_info:
                max_info = info
                best_q = q

        return best_q or unanswered_qs.first()

    @staticmethod
    def calculate_sem(total_information: float) -> float:
        """
        Calculate Standard Error of Measurement (SEM):
        SEM(theta) = 1.0 / sqrt(I(theta))
        """
        if total_information <= 0.0:
            return 9.99
        return round(1.0 / math.sqrt(total_information), 3)

    @staticmethod
    def has_converged(attempt: TestAttempt, target_sem: float = 0.35, min_questions: int = 5, max_questions: int = 25) -> bool:
        """
        Determines whether the adaptive CAT test has reached statistical stopping criteria.
        """
        answered_count = attempt.answers.count()
        if answered_count >= max_questions:
            return True
        if answered_count < min_questions:
            return False

        theta = attempt.irt_ability_theta
        total_info = 0.0
        for ans in attempt.answers.select_related('question').all():
            q = ans.question
            a = getattr(q, 'discrimination', 1.0) or 1.0
            b = getattr(q, 'difficulty', 0.0) or 0.0
            total_info += IRTScoringEngine.fisher_information(theta, a, b)

        sem = IRTScoringEngine.calculate_sem(total_info)
        return sem <= target_sem

