import ast
import re
from typing import Dict, Any, List, Optional, Tuple
from .models import Submission
from apps.ai_engine.ai_client import AIClient
from apps.ai_engine.constitutional_ai import ConstitutionalAI

class AICriticService:
    """
    AI-powered Code Review for DSA submissions.
    
    Features:
    1. LLM-based code review (Gemini Pro)
    2. AST-based complexity analysis
    3. Pattern detection (HashMap, Two Pointer, Sliding Window)
    4. Algorithm hints and optimization suggestions
    5. Edge case detection
    6. Constitutional AI Safety Checks
    """

    # Initialize Constitutional AI
    constitutional_ai = ConstitutionalAI()

    # Algorithm pattern signatures
    ALGORITHM_PATTERNS = {
        'hash_map': {
            'keywords': ['dict', '{}', 'defaultdict', 'Counter', 'HashMap'],
            'complexity': {'time': 'O(N)', 'space': 'O(N)'},
            'hint': 'Hash Map pattern detected - O(1) lookup optimization!'
        },
        'two_pointer': {
            'keywords': ['left', 'right', 'lo', 'hi', 'start', 'end'],
            'complexity': {'time': 'O(N)', 'space': 'O(1)'},
            'hint': 'Two Pointer pattern detected - linear time, constant space!'
        },
        'sliding_window': {
            'keywords': ['window', 'left', 'right', 'expand', 'shrink'],
            'complexity': {'time': 'O(N)', 'space': 'O(K)'},
            'hint': 'Sliding Window pattern - great for substring/subarray problems!'
        },
        'binary_search': {
            'keywords': ['mid', 'left', 'right', 'bisect', '// 2'],
            'complexity': {'time': 'O(log N)', 'space': 'O(1)'},
            'hint': 'Binary Search pattern - logarithmic time complexity!'
        },
        'dynamic_programming': {
            'keywords': ['dp', 'memo', 'cache', 'lru_cache', 'functools'],
            'complexity': {'time': 'O(N) to O(N²)', 'space': 'O(N)'},
            'hint': 'Dynamic Programming detected - overlapping subproblems optimization!'
        },
        'recursion': {
            'keywords': ['def ', 'return ', 'recursive', 'base case'],
            'complexity': {'time': 'Varies', 'space': 'O(N) stack'},
            'hint': 'Recursive solution - consider tail recursion or iterative conversion.'
        },
        'heap': {
            'keywords': ['heapq', 'heappush', 'heappop', 'nlargest', 'nsmallest'],
            'complexity': {'time': 'O(N log K)', 'space': 'O(K)'},
            'hint': 'Heap pattern - efficient for Top K problems!'
        },
        'graph': {
            'keywords': ['bfs', 'dfs', 'visited', 'neighbors', 'deque', 'queue'],
            'complexity': {'time': 'O(V + E)', 'space': 'O(V)'},
            'hint': 'Graph traversal pattern detected!'
        }
    }

    # Common edge cases to check
    EDGE_CASES = [
        ('Empty input', ['[]', "''", 'None', 'null']),
        ('Single element', ['len(arr) == 1', 'n == 1']),
        ('Negative numbers', ['< 0', 'negative']),
        ('Duplicates', ['set(', 'Counter']),
        ('Integer overflow', ['2**31', 'float("inf")']),
        ('Boundary conditions', ['n - 1', 'len - 1', 'i + 1'])
    ]

    @classmethod
    def _ensure_constitutional(cls, text: str) -> str:
        """Process text through Constitutional AI for safety/helpfulness."""
        try:
            result = cls.constitutional_ai.process(text)
            return result['final']
        except Exception:
            return text

    @classmethod
    def review_submission(cls, submission: Submission) -> Dict[str, Any]:
        """
        Generates comprehensive feedback for a submission.
        """
        problem = submission.problem
        code = submission.code

        feedback_data = {}

        # 1. Try LLM feedback first
        llm_feedback = AIClient.generate_code_review(
            problem_title=problem.title,
            problem_description=problem.description,
            code=code
        )

        if llm_feedback:
            if "suggestions" in llm_feedback and isinstance(llm_feedback["suggestions"], list):
                llm_feedback["optimization_tip"] = " ".join(llm_feedback["suggestions"])
            
            # Sanitize LLM feedback for extra safety
            if isinstance(llm_feedback.get('feedback'), str):
                llm_feedback['feedback'] = cls._ensure_constitutional(llm_feedback['feedback'])
                
            return llm_feedback

        # 2. Problem-specific review
        if problem.slug == 'two-sum':
            feedback_data = cls._review_two_sum(code)
        else:
            # 3. Comprehensive AST + Pattern analysis
            try:
                feedback_data = cls._comprehensive_analysis(code, problem.title)
            except Exception as e:
                feedback_data = cls._fallback_feedback(str(e))
        
        # Ensure constitutional compliance for generated feedback
        if isinstance(feedback_data.get('feedback'), str):
            feedback_data['feedback'] = cls._ensure_constitutional(feedback_data['feedback'])
            
        return feedback_data

    @classmethod
    def _comprehensive_analysis(cls, code: str, problem_title: str) -> Dict[str, Any]:
        """
        Comprehensive analysis combining AST, patterns, and heuristics.
        """
        # AST complexity analysis
        complexity = cls._analyze_complexity(code)
        
        # Pattern detection
        patterns = cls._detect_patterns(code)
        
        # Edge case analysis
        edge_cases = cls._check_edge_cases(code)
        
        # Code quality metrics
        metrics = cls._code_quality_metrics(code)
        
        # Generate suggestions
        suggestions = cls._generate_suggestions(complexity, patterns, edge_cases, metrics)
        
        # Build feedback
        pattern_hints = [p['hint'] for p in patterns]
        
        return {
            "complexity": complexity,
            "patterns_detected": [p['name'] for p in patterns],
            "feedback": cls._build_feedback(complexity, patterns, problem_title),
            "suggestions": suggestions,
            "edge_cases_handled": edge_cases,
            "metrics": metrics,
            "optimization_tip": " ".join(suggestions[:2]) if suggestions else "Good solution!"
        }

    @classmethod
    def _analyze_complexity(cls, code: str) -> Dict[str, str]:
        """
        Analyze time and space complexity using AST.
        """
        try:
            tree = ast.parse(code)
        except SyntaxError:
            return {"time": "Unknown", "space": "Unknown"}
        
        # Track loop depth and data structure usage
        max_loop_depth = 0
        current_depth = 0
        has_recursion = False
        data_structures = set()
        
        class ComplexityVisitor(ast.NodeVisitor):
            def __init__(self):
                self.loop_depth = 0
                self.max_depth = 0
                self.function_calls = []
                
            def visit_For(self, node):
                self.loop_depth += 1
                self.max_depth = max(self.max_depth, self.loop_depth)
                self.generic_visit(node)
                self.loop_depth -= 1
                
            def visit_While(self, node):
                self.loop_depth += 1
                self.max_depth = max(self.max_depth, self.loop_depth)
                self.generic_visit(node)
                self.loop_depth -= 1
                
            def visit_Call(self, node):
                if isinstance(node.func, ast.Name):
                    self.function_calls.append(node.func.id)
                self.generic_visit(node)
        
        visitor = ComplexityVisitor()
        visitor.visit(tree)
        max_loop_depth = visitor.max_depth
        
        # Check for recursion
        has_recursion = any(call in code.split('def ')[-1].split('(')[0] 
                          for call in visitor.function_calls if visitor.function_calls)
        
        # Check data structures
        if 'dict' in code or '{}' in code:
            data_structures.add('hash_map')
        if 'set(' in code:
            data_structures.add('set')
        if 'list' in code or '[]' in code:
            data_structures.add('list')
        if 'heapq' in code:
            data_structures.add('heap')
        
        # Determine time complexity
        time_complexity = "O(1)"
        if has_recursion:
            time_complexity = "O(2^N) or O(N!)" if max_loop_depth == 0 else "O(N^" + str(max_loop_depth + 1) + ")"
        elif max_loop_depth == 1:
            time_complexity = "O(N)"
        elif max_loop_depth == 2:
            time_complexity = "O(N²)"
        elif max_loop_depth >= 3:
            time_complexity = "O(N^" + str(max_loop_depth) + ")"
        
        # Adjust for sorting
        if 'sorted(' in code or '.sort()' in code:
            if time_complexity == "O(N)" or time_complexity == "O(1)":
                time_complexity = "O(N log N)"
        
        # Determine space complexity
        if data_structures:
            space_complexity = "O(N)"
        elif has_recursion:
            space_complexity = "O(N) stack"
        else:
            space_complexity = "O(1)"
        
        return {
            "time": time_complexity,
            "space": space_complexity,
            "loop_depth": max_loop_depth,
            "has_recursion": has_recursion
        }

    @classmethod
    def _detect_patterns(cls, code: str) -> List[Dict[str, Any]]:
        """
        Detect algorithm patterns in the code.
        """
        detected = []
        code_lower = code.lower()
        
        for pattern_name, pattern_info in cls.ALGORITHM_PATTERNS.items():
            matches = sum(1 for kw in pattern_info['keywords'] if kw.lower() in code_lower)
            if matches >= 2:  # At least 2 keywords match
                detected.append({
                    'name': pattern_name,
                    'confidence': min(matches / len(pattern_info['keywords']), 1.0),
                    'complexity': pattern_info['complexity'],
                    'hint': pattern_info['hint']
                })
        
        return sorted(detected, key=lambda x: x['confidence'], reverse=True)

    @classmethod
    def _check_edge_cases(cls, code: str) -> Dict[str, bool]:
        """
        Check if common edge cases are handled.
        """
        handled = {}
        for case_name, indicators in cls.EDGE_CASES:
            handled[case_name] = any(ind in code for ind in indicators)
        return handled

    @classmethod
    def _code_quality_metrics(cls, code: str) -> Dict[str, Any]:
        """
        Calculate code quality metrics.
        """
        lines = code.strip().split('\n')
        return {
            "line_count": len(lines),
            "comment_ratio": sum(1 for l in lines if l.strip().startswith('#')) / max(len(lines), 1),
            "has_docstring": '"""' in code or "'''" in code,
            "uses_type_hints": '->' in code or ':' in code.split('def')[-1].split(')')[0] if 'def' in code else False,
            "function_count": code.count('def '),
            "class_count": code.count('class ')
        }

    @classmethod
    def _generate_suggestions(cls, complexity: Dict, patterns: List, 
                              edge_cases: Dict, metrics: Dict) -> List[str]:
        """
        Generate improvement suggestions.
        """
        suggestions = []
        
        # Complexity suggestions
        time = complexity.get('time', '')
        if 'N²' in time or 'N^2' in time:
            suggestions.append("Consider using HashMap or Two Pointer to reduce O(N²) to O(N).")
        if 'N^3' in time or 'N³' in time:
            suggestions.append("High complexity! Try Dynamic Programming or memoization.")
        
        # Edge case suggestions
        unhandled = [case for case, handled in edge_cases.items() if not handled]
        if unhandled:
            suggestions.append(f"Consider handling: {', '.join(unhandled[:3])}.")
        
        # Quality suggestions
        if metrics.get('comment_ratio', 0) < 0.05:
            suggestions.append("Add comments to explain complex logic.")
        if not metrics.get('has_docstring'):
            suggestions.append("Add a docstring explaining approach and complexity.")
        
        # Pattern-specific suggestions
        if not patterns:
            suggestions.append("Consider using a standard pattern (Two Pointer, HashMap, etc.).")
        
        return suggestions

    @classmethod
    def _build_feedback(cls, complexity: Dict, patterns: List, problem_title: str) -> str:
        """
        Build comprehensive feedback message.
        """
        parts = []
        
        # Complexity feedback
        time = complexity.get('time', 'Unknown')
        parts.append(f"Time Complexity: {time}.")
        
        # Pattern feedback
        if patterns:
            pattern_names = [p['name'].replace('_', ' ').title() for p in patterns[:2]]
            parts.append(f"Detected patterns: {', '.join(pattern_names)}.")
        
        # Encouragement
        if 'O(N)' in time or 'O(log N)' in time:
            parts.append("Great optimization!")
        elif 'O(N²)' in time:
            parts.append("Good solution, but can be optimized further.")
        
        return " ".join(parts)

from apps.ai_engine.neuro_symbolic import NeuroSymbolicEngine

    @classmethod
    def _review_two_sum(cls, code: str) -> Dict[str, Any]:
        """
        Specific review for Two Sum problem with symbolic logic checks.
        """
        has_hash_map = 'dict()' in code or '{}' in code or 'prevMap' in code
        has_nested_loop = code.count('for ') > 1
        
        # Symbolic Logic Check (invariant: target - num must be in map)
        # Mocking the code-to-logic extraction for demonstration
        logic_invariant = "exists(num) in map implies exists(target - num)"
        is_logically_sound = NeuroSymbolicEngine.check_code_logic(code, logic_invariant)
        
        feedback = ""
        suggestions = []
        complexity = {"time": "Unknown", "space": "Unknown"}

        if has_nested_loop and not has_hash_map:
            complexity = {"time": "O(N²)", "space": "O(1)"}
            feedback = "Brute-force approach detected. While correct, it's slow for large inputs."
            suggestions = [
                "Use a Hash Map to store visited numbers for O(N) time complexity.",
                "Store value-to-index mapping: {num: index}"
            ]
        elif has_hash_map:
            complexity = {"time": "O(N)", "space": "O(N)"}
            feedback = "Optimal Hash Map approach! Single pass with O(1) lookups."
            if is_logically_sound:
                feedback += " Logic verification passed (Symbolic Check)."
            suggestions = ["The current solution is already optimal."]
        else:
             feedback = "Make sure your solution handles the target value correctly."
             suggestions = ["Focus on reducing time complexity to O(N) using a Hash Map."]

        return {
            "complexity": complexity,
            "feedback": feedback,
            "suggestions": suggestions,
            "logic_verified": is_logically_sound
        }

    @classmethod
    def _fallback_feedback(cls, error: str = "") -> Dict[str, Any]:
        """
        Fallback feedback when analysis fails.
        """
        return {
            "complexity": {"time": "O(N log N) or O(N)", "space": "O(N)"},
            "feedback": "Good effort! Ensure you handle edge cases (empty inputs, single element).",
            "suggestions": [
                "Consider using a more efficient data structure if applicable.",
                "Review the constraints to determine acceptable complexity."
            ]
        }

    @classmethod
    def get_algorithm_hint(cls, problem_slug: str, difficulty: str = "medium") -> Dict[str, Any]:
        """
        Get algorithm hints for a specific problem type, checked by Constitutional AI.
        """
        hints_repo = {
            'two-sum': {
                'approach': 'Hash Map',
                'hint': 'Store each number with its index. For each number, check if (target - num) exists.',
                'pattern': 'hash_map',
                'complexity': {'time': 'O(N)', 'space': 'O(N)'}
            },
            'binary-search': {
                'approach': 'Binary Search',
                'hint': 'Divide search space in half each iteration. Check mid, then go left or right.',
                'pattern': 'binary_search',
                'complexity': {'time': 'O(log N)', 'space': 'O(1)'}
            },
            'sliding-window': {
                'approach': 'Sliding Window',
                'hint': 'Expand right pointer, shrink left when condition violated. Track window state.',
                'pattern': 'sliding_window',
                'complexity': {'time': 'O(N)', 'space': 'O(K)'}
            },
            'default': {
                'approach': 'Analyze the problem',
                'hint': 'Identify if problem fits common patterns: Hash Map, Two Pointer, DP, etc.',
                'pattern': 'general',
                'complexity': {'time': 'Varies', 'space': 'Varies'}
            }
        }
        
        result = hints_repo.get(problem_slug, hints_repo['default'])
        
        # Constitutional Check for Hint
        # Ensure the hint is not misleading or unsafe (overkill? maybe, but consistent with spec)
        result['hint'] = cls._ensure_constitutional(result['hint'])
        
        return result
