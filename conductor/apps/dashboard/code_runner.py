
import subprocess
import sys
import tempfile
import os
import re
import ast


class CodeExecutionService:
    """
    Executes user-submitted Python code in a secure-ish environment.
    
    Security Layers:
    1. Static Analysis (AST + Regex)
    2. Subprocess isolation with timeout
    3. Resource limits (timeout)
    
    Note: For true production security, use Docker/NSJail/Firecracker.
    This implementation provides defense-in-depth but is NOT fully sandboxed.
    """
    
    # Comprehensive dangerous patterns (regex)
    DANGEROUS_PATTERNS = [
        r'\bimport\s+(os|sys|subprocess|shutil|socket|pickle|marshal)\b',
        r'\bfrom\s+(os|sys|subprocess|shutil|socket|pickle|marshal)\s+import\b',
        r'__import__\s*\(',
        r'\bopen\s*\(',
        r'\beval\s*\(',
        r'\bexec\s*\(',
        r'\bcompile\s*\(',
        r'\bglobals\s*\(',
        r'\blocals\s*\(',
        r'\bgetattr\s*\(',
        r'\bsetattr\s*\(',
        r'\bdelattr\s*\(',
        r'__builtins__',
        r'__class__',
        r'__bases__',
        r'__subclasses__',
        r'__mro__',
        r'__code__',
        r'__globals__',
        r'\.__dict__',
    ]
    
    # Allowed imports (whitelist)
    ALLOWED_IMPORTS = {
        'math', 'collections', 'itertools', 'functools',
        'heapq', 'bisect', 'random', 'string', 're',
        'typing', 'dataclasses', 'enum', 'copy'
    }
    
    @classmethod
    def validate_code(cls, code: str) -> tuple[bool, str]:
        """
        Perform static security analysis on code.
        Returns (is_safe, error_message).
        """
        # Check regex patterns
        for pattern in cls.DANGEROUS_PATTERNS:
            if re.search(pattern, code, re.IGNORECASE):
                return False, f"Security Violation: Forbidden pattern detected"
        
        # AST-based import validation
        try:
            tree = ast.parse(code)
            for node in ast.walk(tree):
                if isinstance(node, ast.Import):
                    for alias in node.names:
                        module = alias.name.split('.')[0]
                        if module not in cls.ALLOWED_IMPORTS:
                            return False, f"Security Violation: Import '{module}' not allowed"
                elif isinstance(node, ast.ImportFrom):
                    if node.module:
                        module = node.module.split('.')[0]
                        if module not in cls.ALLOWED_IMPORTS:
                            return False, f"Security Violation: Import from '{module}' not allowed"
        except SyntaxError as e:
            return False, f"Syntax Error: {e}"
        
        return True, ""
    
    @classmethod
    def run_python_code(cls, code: str, timeout: int = 5):
        """
        Run python code and return stdout/stderr.
        """
        # Security validation
        is_safe, error_msg = cls.validate_code(code)
        if not is_safe:
            return {
                "status": "error",
                "output": error_msg
            }
        
        # Write to temp file
        tmp_path = None
        try:
            with tempfile.NamedTemporaryFile(
                mode='w', suffix='.py', delete=False, encoding='utf-8'
            ) as tmp_file:
                tmp_file.write(code)
                tmp_path = tmp_file.name
            
            # Execute with restricted environment
            result = subprocess.run(
                [sys.executable, '-u', tmp_path],
                capture_output=True,
                text=True,
                timeout=timeout,
                env={
                    'PATH': '',  # Minimal PATH
                    'PYTHONDONTWRITEBYTECODE': '1',
                },
                cwd=tempfile.gettempdir()  # Isolated working directory
            )
            
            output = result.stdout
            if result.stderr:
                output += f"\nError:\n{result.stderr}"
            
            return {
                "status": "success" if result.returncode == 0 else "failure",
                "output": output[:10000]  # Limit output size
            }
        
        except subprocess.TimeoutExpired:
            return {
                "status": "timeout",
                "output": f"Execution timed out after {timeout} seconds."
            }
        except Exception as e:
            return {
                "status": "error",
                "output": f"Execution failed: {type(e).__name__}"
            }
        finally:
            if tmp_path and os.path.exists(tmp_path):
                try:
                    os.remove(tmp_path)
                except OSError:
                    pass

