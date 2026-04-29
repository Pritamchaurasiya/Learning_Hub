import ast
import logging
from typing import List, Tuple

logger = logging.getLogger(__name__)


class CodeValidator:
    """
    Secure static analysis for untrusted Python code using AST.
    Far superior to regex-based filtering as it parses structure/intent.
    
    Security Features:
    1. Forbidden module imports
    2. Forbidden built-in calls
    3. Forbidden attribute access
    4. Loop depth limits
    5. Code size limits
    """

    # Modules that are completely forbidden
    FORBIDDEN_MODULES = {
        'os', 'sys', 'subprocess', 'socket', 'requests', 'shutil',
        'pathlib', 'pickle', 'importlib', 'inspect', 'traceback',
        'ctypes', 'multiprocessing', 'threading', 'asyncio',
        'signal', 'resource', 'pty', 'pwd', 'grp', 'crypt',
        'tempfile', 'glob', 'fnmatch', 'codecs', 'marshal'
    }

    # Safe modules explicitly allowed
    ALLOWED_MODULES = {
        'math', 'collections', 'itertools', 'functools', 'heapq',
        'bisect', 'random', 'string', 're', 'typing', 'dataclasses',
        'enum', 'copy', 'operator', 'fractions', 'decimal', 'statistics'
    }

    # Built-ins that are forbidden to CALL
    FORBIDDEN_CALLS = {
        'exec', 'eval', 'compile', 'open', 'globals', 'locals', 'vars',
        'getattr', 'setattr', 'delattr', '__import__', 'input',
        'breakpoint', 'memoryview', 'bytearray', 'bytes'
    }

    # Attributes/Dunders that are forbidden to ACCESS
    FORBIDDEN_ATTRIBUTES = {
        '__subclasses__', '__bases__', '__globals__', '__code__',
        '__closure__', '__func__', '__self__', '__module__', '__dict__',
        '__mro__', '__class__', '__call__', '__reduce__', '__reduce_ex__',
        '__getstate__', '__setstate__', '__builtins__'
    }

    # Limits
    MAX_CODE_LENGTH = 50000  # 50KB
    MAX_LINE_COUNT = 500
    MAX_LOOP_DEPTH = 5
    MAX_FUNCTION_COUNT = 50

    class SecurityVisitor(ast.NodeVisitor):
        def __init__(self):
            self.errors: List[str] = []
            self.loop_depth = 0
            self.max_loop_depth_seen = 0
            self.function_count = 0
            self.class_count = 0

        def visit_Import(self, node):
            for alias in node.names:
                module_name = alias.name.split('.')[0]
                if module_name in CodeValidator.FORBIDDEN_MODULES:
                    self.errors.append(f"Importing '{alias.name}' is forbidden.")
                elif module_name not in CodeValidator.ALLOWED_MODULES:
                    self.errors.append(f"Import '{module_name}' not in allowed list.")
            self.generic_visit(node)

        def visit_ImportFrom(self, node):
            if node.module:
                module_name = node.module.split('.')[0]
                if module_name in CodeValidator.FORBIDDEN_MODULES:
                    self.errors.append(f"Importing from '{node.module}' is forbidden.")
                elif module_name not in CodeValidator.ALLOWED_MODULES:
                    self.errors.append(f"Import from '{module_name}' not in allowed list.")
            self.generic_visit(node)

        def visit_Call(self, node):
            # Check function calls: func()
            if isinstance(node.func, ast.Name):
                if node.func.id in CodeValidator.FORBIDDEN_CALLS:
                    self.errors.append(f"Calling '{node.func.id}()' is forbidden.")
            self.generic_visit(node)

        def visit_Attribute(self, node):
            # Check attribute access: obj.attr
            if node.attr in CodeValidator.FORBIDDEN_ATTRIBUTES:
                self.errors.append(f"Accessing sensitive attribute '{node.attr}' is forbidden.")
            self.generic_visit(node)

        def visit_FunctionDef(self, node):
            self.function_count += 1
            if self.function_count > CodeValidator.MAX_FUNCTION_COUNT:
                self.errors.append(f"Too many functions (max {CodeValidator.MAX_FUNCTION_COUNT}).")
            self.generic_visit(node)

        def visit_For(self, node):
            self.loop_depth += 1
            self.max_loop_depth_seen = max(self.max_loop_depth_seen, self.loop_depth)
            if self.loop_depth > CodeValidator.MAX_LOOP_DEPTH:
                self.errors.append(f"Loop nesting too deep (max {CodeValidator.MAX_LOOP_DEPTH}).")
            self.generic_visit(node)
            self.loop_depth -= 1

        def visit_While(self, node):
            self.loop_depth += 1
            self.max_loop_depth_seen = max(self.max_loop_depth_seen, self.loop_depth)
            if self.loop_depth > CodeValidator.MAX_LOOP_DEPTH:
                self.errors.append(f"Loop nesting too deep (max {CodeValidator.MAX_LOOP_DEPTH}).")
            self.generic_visit(node)
            self.loop_depth -= 1

    @staticmethod
    def validate(code: str) -> None:
        """
        Parses and validates code structure.
        Raises ValueError if dangerous patterns are found.
        """
        # Size limits
        if len(code) > CodeValidator.MAX_CODE_LENGTH:
            raise ValueError(f"Code too long (max {CodeValidator.MAX_CODE_LENGTH // 1000}KB).")
        
        line_count = code.count('\n') + 1
        if line_count > CodeValidator.MAX_LINE_COUNT:
            raise ValueError(f"Too many lines (max {CodeValidator.MAX_LINE_COUNT}).")

        try:
            tree = ast.parse(code)
        except SyntaxError as e:
            raise ValueError(f"Syntax Error: {e.msg} at line {e.lineno}")
        except Exception as e:
            raise ValueError(f"Failed to parse code: {str(e)}")

        visitor = CodeValidator.SecurityVisitor()
        visitor.visit(tree)

        if visitor.errors:
            # Limit to first 3 errors to avoid information overload
            limited_errors = visitor.errors[:3]
            raise ValueError("Security Violation: " + "; ".join(limited_errors))

    @staticmethod
    def get_code_metrics(code: str) -> dict:
        """
        Get metrics about the code for analytics.
        """
        try:
            tree = ast.parse(code)
            visitor = CodeValidator.SecurityVisitor()
            visitor.visit(tree)
            
            return {
                'line_count': code.count('\n') + 1,
                'char_count': len(code),
                'function_count': visitor.function_count,
                'max_loop_depth': visitor.max_loop_depth_seen,
                'is_valid': len(visitor.errors) == 0
            }
        except Exception:
            return {
                'line_count': code.count('\n') + 1,
                'char_count': len(code),
                'is_valid': False
            }

