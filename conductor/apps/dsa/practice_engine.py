"""
Enhanced DSA Practice Engine

Advanced Data Structures & Algorithms practice system with:
1. AI-powered problem recommendations
2. Code execution and validation
3. Performance analysis
4. Learning path integration
5. Contest/Competition support
"""

import logging
import hashlib
import re
from datetime import timedelta
from typing import Dict, Any, List, Optional, Tuple
from enum import Enum
from dataclasses import dataclass

from django.utils import timezone
from django.db.models import Count, Avg, Q, F
from django.core.cache import cache

logger = logging.getLogger(__name__)


class Difficulty(Enum):
    """Problem difficulty levels."""
    EASY = "easy"
    MEDIUM = "medium"
    HARD = "hard"
    EXPERT = "expert"


class ProblemCategory(Enum):
    """DSA problem categories."""
    ARRAYS = "arrays"
    STRINGS = "strings"
    LINKED_LISTS = "linked_lists"
    TREES = "trees"
    GRAPHS = "graphs"
    DYNAMIC_PROGRAMMING = "dynamic_programming"
    SORTING = "sorting"
    SEARCHING = "searching"
    RECURSION = "recursion"
    GREEDY = "greedy"
    BACKTRACKING = "backtracking"
    HEAP = "heap"
    STACK = "stack"
    QUEUE = "queue"
    HASH_TABLE = "hash_table"
    BIT_MANIPULATION = "bit_manipulation"


@dataclass
class TestResult:
    """Result of a single test case."""
    test_id: int
    passed: bool
    expected: str
    actual: str
    execution_time_ms: float
    memory_kb: int


@dataclass
class SubmissionResult:
    """Complete submission result."""
    submission_id: str
    status: str  # accepted, wrong_answer, time_limit, runtime_error, etc.
    passed_tests: int
    total_tests: int
    execution_time_ms: float
    memory_kb: int
    test_results: List[TestResult]
    feedback: Optional[str]


class DSAPracticeEngine:
    """
    AI-powered DSA practice engine.
    """
    
    CACHE_TIMEOUT = 1800  # 30 minutes
    
    # ==========================================================================
    # PROBLEM RECOMMENDATION
    # ==========================================================================
    
    @classmethod
    def get_recommended_problems(
        cls,
        user,
        limit: int = 5,
        category: Optional[ProblemCategory] = None
    ) -> List[Dict[str, Any]]:
        """
        Get personalized problem recommendations.
        
        Algorithm:
        1. Analyze user's solved problems and success rate
        2. Identify weak areas from failed attempts
        3. Select problems at appropriate difficulty
        4. Mix in some challenging problems for growth
        """
        from apps.dsa.models import Problem, Submission
        
        cache_key = f"dsa_recommendations:{user.id}:{category}"
        cached = cache.get(cache_key)
        if cached:
            return cached
        
        # Get user's submission history
        submissions = Submission.objects.filter(user=user)
        solved_ids = set(submissions.filter(status='accepted').values_list('problem_id', flat=True))
        
        # Analyze by category
        category_stats = cls._analyze_category_performance(user)
        
        # Identify weak categories
        weak_categories = [
            cat for cat, stats in category_stats.items()
            if stats['success_rate'] < 0.5
        ]
        
        # Determine appropriate difficulty
        avg_success_rate = sum(
            s['success_rate'] for s in category_stats.values()
        ) / len(category_stats) if category_stats else 0.5
        
        if avg_success_rate >= 0.7:
            target_difficulty = ['medium', 'hard']
        elif avg_success_rate >= 0.4:
            target_difficulty = ['easy', 'medium']
        else:
            target_difficulty = ['easy']
        
        # Build query
        query = Problem.objects.filter(is_active=True).exclude(id__in=solved_ids)
        
        if category:
            query = query.filter(category=category.value)
        elif weak_categories:
            # Prioritize weak categories
            query = query.filter(category__in=weak_categories[:3])
        
        query = query.filter(difficulty__in=target_difficulty)
        
        # Get problems with some randomization
        problems = list(query.order_by('?')[:limit])
        
        result = [
            {
                'problem_id': str(p.id),
                'title': p.title,
                'difficulty': p.difficulty,
                'category': p.category,
                'acceptance_rate': cls._get_acceptance_rate(p),
                'reason': cls._get_recommendation_reason(p, weak_categories)
            }
            for p in problems
        ]
        
        cache.set(cache_key, result, timeout=cls.CACHE_TIMEOUT)
        return result
    
    @classmethod
    def _analyze_category_performance(cls, user) -> Dict[str, Dict]:
        """Analyze user performance by category."""
        from apps.dsa.models import Submission
        
        stats = {}
        
        for category in ProblemCategory:
            submissions = Submission.objects.filter(
                user=user,
                problem__category=category.value
            )
            
            total = submissions.count()
            if total > 0:
                accepted = submissions.filter(status='accepted').count()
                stats[category.value] = {
                    'total_attempts': total,
                    'accepted': accepted,
                    'success_rate': accepted / total
                }
        
        return stats
    
    @classmethod
    def _get_acceptance_rate(cls, problem) -> float:
        """Get acceptance rate for a problem."""
        from apps.dsa.models import Submission
        
        total = Submission.objects.filter(problem=problem).count()
        if total == 0:
            return 0.5  # Default
        
        accepted = Submission.objects.filter(problem=problem, status='accepted').count()
        return round(accepted / total, 2)
    
    @classmethod
    def _get_recommendation_reason(cls, problem, weak_categories: List[str]) -> str:
        """Generate recommendation reason."""
        if problem.category in weak_categories:
            return f"Practice your weak area: {problem.category.replace('_', ' ').title()}"
        elif problem.difficulty == 'easy':
            return "Build confidence with this warmup problem"
        elif problem.difficulty == 'hard':
            return "Challenge yourself with this advanced problem"
        else:
            return "Good practice for skill building"
    
    # ==========================================================================
    # CODE VALIDATION
    # ==========================================================================
    
    @classmethod
    def validate_solution(
        cls,
        user,
        problem_id: str,
        code: str,
        language: str
    ) -> SubmissionResult:
        """
        Validate a user's solution.
        
        This is a simplified implementation. In production:
        - Use isolated code execution (Docker/sandbox)
        - Implement proper timeout handling
        - Support multiple languages
        """
        from apps.dsa.models import Problem, Submission, TestCase
        import uuid
        
        problem = Problem.objects.get(id=problem_id)
        test_cases = TestCase.objects.filter(problem=problem)
        
        submission_id = str(uuid.uuid4())
        test_results = []
        passed = 0
        total_time = 0.0
        total_memory = 0
        
        for idx, tc in enumerate(test_cases):
            # In production, this would actually execute the code
            result = cls._run_test_case(code, language, tc.input_data, tc.expected_output)
            
            test_results.append(TestResult(
                test_id=idx + 1,
                passed=result['passed'],
                expected=tc.expected_output[:100],  # Truncate for safety
                actual=result.get('output', '')[:100],
                execution_time_ms=result.get('time_ms', 0),
                memory_kb=result.get('memory_kb', 0)
            ))
            
            if result['passed']:
                passed += 1
            total_time += result.get('time_ms', 0)
            total_memory = max(total_memory, result.get('memory_kb', 0))
        
        # Determine status
        if passed == len(test_cases):
            status = 'accepted'
        elif passed == 0:
            status = 'wrong_answer'
        else:
            status = 'partial'
        
        # Save submission
        Submission.objects.create(
            id=submission_id,
            user=user,
            problem=problem,
            code=code,
            language=language,
            status=status,
            passed_tests=passed,
            total_tests=len(test_cases),
            execution_time=total_time,
            memory_used=total_memory
        )
        
        # Generate AI feedback
        feedback = cls._generate_feedback(code, language, status, passed, len(test_cases))
        
        return SubmissionResult(
            submission_id=submission_id,
            status=status,
            passed_tests=passed,
            total_tests=len(test_cases),
            execution_time_ms=total_time,
            memory_kb=total_memory,
            test_results=test_results,
            feedback=feedback
        )
    
    @classmethod
    def _run_test_case(
        cls,
        code: str,
        language: str,
        input_data: str,
        expected_output: str
    ) -> Dict[str, Any]:
        """
        Run a single test case using secure execution.
        Supports Python.
        """
        if language.lower() not in ['python', 'python3', 'py']:
            return {'passed': False, 'output': 'Language not supported backend', 'time_ms': 0, 'error': 'Unsupported Language'}

        import subprocess
        import time
        
        start_time = time.perf_counter()
        error = None
        output = ""
        
        # Security wrapper to prevent basic OS interaction
        # While not a full sandbox, it severely limits the attack surface
        # by removing common dangerous modules and running in a separate process.
        security_header = """
import sys
import builtins

_allowed_modules = {"math", "collections", "itertools", "functools", "heapq", "bisect", "datetime", "re", "string", "typing"}

original_import = builtins.__import__
def _safe_import(name, globals=None, locals=None, fromlist=(), level=0):
    base_module = name.split(".")[0]
    if base_module not in _allowed_modules and base_module not in sys.builtin_module_names:
        raise ImportError(f"Import of module '{name}' is strictly prohibited for security reasons.")
    return original_import(name, globals, locals, fromlist, level)
builtins.__import__ = _safe_import

# Remove references to sys to prevent circumvention
del sys
"""
        # We append the user code after the security header
        secure_code = security_header + "\n" + code

        try:
            # ⚠️ SECURITY WARNING:
            # This is using a spawned subprocess with strict timeouts.
            # For massive scale production with hostile user code, use Docker/NSJail/Firecracker.
            process = subprocess.run(
                ["python", "-I", "-c", secure_code],
                input=input_data.encode('utf-8'),
                capture_output=True,
                timeout=2.0,  # Strict 2 second timeout per test case
            )
            
            output = process.stdout.decode('utf-8').strip()
            
            if process.returncode != 0:
                error = process.stderr.decode('utf-8').strip()
                if not error:
                    error = f"Process exited with non-zero code: {process.returncode}"
                    
        except subprocess.TimeoutExpired:
            error = "Time Limit Exceeded (2.0s)"
        except Exception as e:
            error = f"Execution Error: {str(e)}"
            
        execution_time = (time.perf_counter() - start_time) * 1000
        
        # Normalize output (trim whitespace)
        passed = (output == expected_output.strip()) and (error is None)
        
        return {
            'passed': passed,
            'output': output,
            'time_ms': round(execution_time, 2),
            'memory_kb': 0, # Placeholder
            'error': error
        }
    
    @classmethod
    def _generate_feedback(
        cls,
        code: str,
        language: str,
        status: str,
        passed: int,
        total: int
    ) -> str:
        """Generate AI feedback using Concept Bottleneck Model + LLM."""
        from apps.ai_engine.ai_client import AIClient
        from apps.ai_engine.integrated_services import IntegratedAIService
        
        # 1. Get Concept Analysis
        try:
            ai_service = IntegratedAIService()
            concept_analysis = ai_service.analyze_dsa_submission(
                code, 
                {'passed_tests': passed, 'total_tests': total, 'memory_kb': 0}
            )
            concept_str = ", ".join([f"{k}: {v:.2f}" for k, v in concept_analysis['concept_scores'].items()])
        except Exception as e:
            logger.error(f"Concept analysis failed: {e}")
            concept_str = "Concept analysis unavailable"

        # 2. Use LLM for personalized feedback
        prompt = f"""
        Review this DSA Solution.
        Language: {language}
        Status: {status} ({passed}/{total} tests passed)
        
        AI Concept Analysis:
        {concept_str}
        
        Code:
        {code}
        
        Provide brief, constructive feedback based on the concept scores.
        """
        
        try:
            feedback_json = AIClient.generate_code_review(
                problem_title="DSA Submission",
                problem_description=prompt,
                code=code
            )
            return feedback_json.get('feedback', "Good effort.") + "\n" + feedback_json.get('suggestions', "")
        except Exception:
            if status == 'accepted':
                return "🎉 Great job! Solution passed."
            else:
                return f"Solution failed ({passed}/{total}). Check edge cases."

    @classmethod
    def get_hint(cls, problem_id: str, code: str) -> str:
        """Generate a hint for the current problem state."""
        from apps.dsa.models import Problem
        from apps.ai_engine.ai_client import AIClient
        
        try:
            problem = Problem.objects.get(id=problem_id)
            prompt = f"Problem: {problem.title}\nDescription: {problem.description}\nUser Code:\n{code}\n\nGive a helpful small hint without revealing the full answer."
            
            # Simple text generation via AI Client (assuming we have a method or mock it)
            # Since generate_code_review returns structured JSON...
            review = AIClient.generate_code_review("Hint Request", prompt, code)
            return review.get('feedback', "Try breaking the problem into smaller parts.")
            
        except Exception:
            return "Focus on the base case and constraints."
    
    # ==========================================================================
    # PERFORMANCE ANALYSIS
    # ==========================================================================
    
    @classmethod
    def analyze_solution_complexity(cls, code: str, language: str) -> Dict[str, Any]:
        """
        Analyze time and space complexity of solution.
        Uses pattern matching for common constructs.
        """
        analysis = {
            'time_complexity': 'Unknown',
            'space_complexity': 'Unknown',
            'patterns_detected': [],
            'suggestions': []
        }
        
        # Detect common patterns
        patterns = {
            'nested_loops': (r'for\s+.*:\s*\n\s*for|while\s+.*:\s*\n\s*while', 'O(n²)'),
            'single_loop': (r'for\s+.*:|while\s+.*:', 'O(n)'),
            'recursion': (r'def\s+(\w+)\([^)]*\)[^:]*:\s*.*\1\(', 'O(2^n) or O(n)'),
            'sorting': (r'\.sort\(\)|sorted\(', 'O(n log n)'),
            'binary_search': (r'while\s+\w+\s*[<>]=?\s*\w+.*mid', 'O(log n)'),
            'hash_lookup': (r'\w+\s*=\s*\{|\w+\[.+\]\s*=', 'O(1) lookup'),
        }
        
        for pattern_name, (regex, complexity) in patterns.items():
            if re.search(regex, code, re.MULTILINE):
                analysis['patterns_detected'].append(pattern_name)
                if analysis['time_complexity'] == 'Unknown':
                    analysis['time_complexity'] = complexity
        
        # Suggestions based on patterns
        if 'nested_loops' in analysis['patterns_detected']:
            analysis['suggestions'].append(
                "Consider using a hash table to reduce nested loop to O(n)"
            )
        
        if 'recursion' in analysis['patterns_detected']:
            analysis['suggestions'].append(
                "Consider memoization to optimize recursive calls"
            )
        
        return analysis
    
    # ==========================================================================
    # CONTEST/COMPETITION
    # ==========================================================================
    
    @classmethod
    def get_active_contests(cls) -> List[Dict[str, Any]]:
        """Get currently active or upcoming contests."""
        from apps.dsa.models import Contest
        
        now = timezone.now()
        
        contests = Contest.objects.filter(
            Q(start_time__lte=now, end_time__gte=now) |  # Active
            Q(start_time__gt=now)  # Upcoming
        ).order_by('start_time')[:10]
        
        return [
            {
                'contest_id': str(c.id),
                'title': c.title,
                'start_time': c.start_time.isoformat(),
                'end_time': c.end_time.isoformat(),
                'status': 'active' if c.start_time <= now <= c.end_time else 'upcoming',
                'problem_count': c.problems.count(),
                'participants': c.participants.count()
            }
            for c in contests
        ]
    
    @classmethod
    def get_contest_leaderboard(cls, contest_id: str) -> List[Dict[str, Any]]:
        """Get leaderboard for a contest."""
        from apps.dsa.models import ContestParticipant
        
        participants = ContestParticipant.objects.filter(
            contest_id=contest_id
        ).select_related('user').order_by('-score', 'finish_time')[:100]
        
        return [
            {
                'rank': idx + 1,
                'user': p.user.username,
                'score': p.score,
                'problems_solved': p.problems_solved,
                'finish_time': p.finish_time.isoformat() if p.finish_time else None
            }
            for idx, p in enumerate(participants)
        ]
    
    # ==========================================================================
    # USER PROGRESS
    # ==========================================================================
    
    @classmethod
    def get_user_dsa_stats(cls, user) -> Dict[str, Any]:
        """Get comprehensive DSA practice stats for a user."""
        from apps.dsa.models import Submission, Problem
        
        submissions = Submission.objects.filter(user=user)
        
        # Overall stats
        total_problems = Problem.objects.filter(is_active=True).count()
        solved = submissions.filter(status='accepted').values('problem_id').distinct().count()
        
        # By difficulty
        difficulty_stats = {}
        for diff in Difficulty:
            diff_problems = Problem.objects.filter(difficulty=diff.value, is_active=True)
            diff_solved = submissions.filter(
                status='accepted',
                problem__difficulty=diff.value
            ).values('problem_id').distinct().count()
            
            difficulty_stats[diff.value] = {
                'total': diff_problems.count(),
                'solved': diff_solved
            }
        
        # By category
        category_stats = cls._analyze_category_performance(user)
        
        # Recent activity
        recent = submissions.order_by('-created_at')[:10]
        recent_activity = [
            {
                'problem_title': s.problem.title,
                'status': s.status,
                'language': s.language,
                'submitted_at': s.created_at.isoformat()
            }
            for s in recent
        ]
        
        # Streak
        streak = cls._calculate_dsa_streak(user)
        
        return {
            'total_problems': total_problems,
            'solved': solved,
            'solve_rate': round((solved / total_problems * 100) if total_problems > 0 else 0, 1),
            'by_difficulty': difficulty_stats,
            'by_category': category_stats,
            'recent_activity': recent_activity,
            'streak_days': streak,
            'ranking': cls._get_user_ranking(user)
        }
    
    @classmethod
    def _calculate_dsa_streak(cls, user) -> int:
        """Calculate consecutive days of DSA practice."""
        from apps.dsa.models import Submission
        
        today = timezone.now().date()
        streak = 0
        
        for i in range(365):  # Max 1 year
            date = today - timedelta(days=i)
            has_submission = Submission.objects.filter(
                user=user,
                created_at__date=date
            ).exists()
            
            if has_submission:
                streak += 1
            else:
                break
        
        return streak
    
    @classmethod
    def _get_user_ranking(cls, user) -> Dict[str, Any]:
        """Get user's global ranking."""
        from apps.dsa.models import Submission
        from django.db.models import Count
        
        # Get all users sorted by solved problems
        user_scores = Submission.objects.filter(
            status='accepted'
        ).values('user_id').annotate(
            solved=Count('problem_id', distinct=True)
        ).order_by('-solved')
        
        user_id = user.id
        rank = 1
        user_solved = 0
        
        for score in user_scores:
            if score['user_id'] == user_id:
                user_solved = score['solved']
                break
            rank += 1
        
        return {
            'rank': rank,
            'solved': user_solved,
            'percentile': round((1 - rank / max(user_scores.count(), 1)) * 100, 1)
        }
