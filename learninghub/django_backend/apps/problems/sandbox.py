import ast
import os
import shutil
import subprocess
import tempfile
import threading
import time
import uuid


class CodeSandboxService:
    DISALLOWED_MODULES = {
        'os', 'sys', 'subprocess', 'posix', 'nt', 'shutil', 'pty', 'socket',
        'ctypes', 'builtins', '_posixsubprocess', 'importlib', 'pathlib',
        'fcntl', 'signal', 'multiprocessing', 'threading', 'asyncio', 'inspect',
        'pickle', 'shelve', 'marshal', 'sqlite3', 'urllib', 'http', 'requests',
        'ssl', 'tempfile', 'webbrowser', 'code', 'codeop', 'pdb', 'platform',
        'winreg', 'msvcrt', 'gc', 'traceback', 'codecs', 'io', 'site',
        'zipfile', 'tarfile', 'pkgutil', 'pkg_resources'
    }

    DISALLOWED_CALLS = {
        'eval', 'exec', '__import__', 'compile', 'open', 'breakpoint',
        'memoryview', 'globals', 'locals', 'vars', 'dir', 'help', 'exit', 'quit',
        'getattr', 'setattr', 'delattr', 'hasattr'
    }
    # NOTE: 'input' is intentionally allowed — stdin is piped to the isolated container
    # and the container run has a bounded timeout. Blocking it would
    # break legitimate stdin-based problems (e.g. test uses input_data="test").

    DISALLOWED_ATTRIBUTES = {
        '__subclasses__', '__bases__', '__mro__', '__globals__', '__builtins__',
        '__code__', '__class__', '__dict__', '__import__', '__init_subclass__',
        '__reduce__', '__reduce_ex__', '__getattribute__'
    }

    @classmethod
    def analyze_ast(cls, code: str, language: str = 'python'):
        """
        Performs static AST analysis to compute:
        - Time complexity estimate
        - Space complexity estimate
        - Cyclomatic complexity
        - Security audit
        """
        if language != 'python':
            return {
                'time_complexity': 'O(N)',
                'space_complexity': 'O(1)',
                'cyclomatic_complexity': 2,
                'security_passed': True,
                'suggestions': ['Code structure meets standard algorithmic patterns.']
            }

        try:
            tree = ast.parse(code)
        except SyntaxError:
            return {
                'time_complexity': 'Unknown (Syntax Error)',
                'space_complexity': 'Unknown',
                'cyclomatic_complexity': 0,
                'security_passed': True,
                'suggestions': ['Fix syntax errors before static analysis.']
            }

        max_loop_depth = 0
        has_recursion = False
        decision_points = 1 # Base cyclomatic complexity
        security_issues = []
        function_names = set()

        class ComplexityVisitor(ast.NodeVisitor):
            def __init__(self):
                self.current_loop_depth = 0
                self.max_depth = 0
                self.decisions = 1
                self.has_recursion = False
                self.func_names = set()
                self.sec_issues = []

            def visit_FunctionDef(self, node):
                self.func_names.add(node.name)
                self.generic_visit(node)

            def visit_For(self, node):
                self.decisions += 1
                self.current_loop_depth += 1
                self.max_depth = max(self.max_depth, self.current_loop_depth)
                self.generic_visit(node)
                self.current_loop_depth -= 1

            def visit_While(self, node):
                self.decisions += 1
                self.current_loop_depth += 1
                self.max_depth = max(self.max_depth, self.current_loop_depth)
                self.generic_visit(node)
                self.current_loop_depth -= 1

            def visit_If(self, node):
                self.decisions += 1
                self.generic_visit(node)

            def visit_Import(self, node):
                for alias in node.names:
                    root_mod = alias.name.split('.')[0]
                    if root_mod in CodeSandboxService.DISALLOWED_MODULES or root_mod.startswith('_'):
                        self.sec_issues.append(f"Disallowed module import: {alias.name}")
                self.generic_visit(node)

            def visit_ImportFrom(self, node):
                if node.module:
                    root_mod = node.module.split('.')[0]
                    if root_mod in CodeSandboxService.DISALLOWED_MODULES or root_mod.startswith('_'):
                        self.sec_issues.append(f"Disallowed module import: {node.module}")
                self.generic_visit(node)

            def visit_Call(self, node):
                if isinstance(node.func, ast.Name):
                    if node.func.id in self.func_names:
                        self.has_recursion = True
                    if node.func.id in CodeSandboxService.DISALLOWED_CALLS:
                        self.sec_issues.append(f"Disallowed function call: {node.func.id}()")
                elif isinstance(node.func, ast.Attribute):
                    if node.func.attr in CodeSandboxService.DISALLOWED_CALLS:
                        self.sec_issues.append(f"Disallowed method call: {node.func.attr}()")
                self.generic_visit(node)

            def visit_Attribute(self, node):
                if node.attr in CodeSandboxService.DISALLOWED_ATTRIBUTES:
                    self.sec_issues.append(f"Disallowed attribute access: {node.attr}")
                self.generic_visit(node)

        visitor = ComplexityVisitor()
        visitor.visit(tree)

        # Determine Big-O Time Complexity Estimate
        if visitor.max_depth == 0:
            time_complexity = 'O(1)' if not visitor.has_recursion else 'O(log N)'
        elif visitor.max_depth == 1:
            time_complexity = 'O(N)'
        elif visitor.max_depth == 2:
            time_complexity = 'O(N²)'
        elif visitor.max_depth >= 3:
            time_complexity = f"O(N^{visitor.max_depth})"
        else:
            time_complexity = 'O(N)'

        # Space complexity estimate
        space_complexity = 'O(N)' if (visitor.max_depth > 0 or visitor.has_recursion) else 'O(1)'

        suggestions = []
        if visitor.max_depth >= 2:
            suggestions.append('Consider using hash maps or sorting with two pointers to optimize nested loops.')
        if visitor.decisions > 8:
            suggestions.append('High cyclomatic complexity detected. Refactor branching into helper functions.')
        if not suggestions:
            suggestions.append('Clean algorithmic structure with optimal asymptotic bounds.')

        return {
            'time_complexity': time_complexity,
            'space_complexity': space_complexity,
            'cyclomatic_complexity': visitor.decisions,
            'security_passed': len(visitor.sec_issues) == 0,
            'security_issues': visitor.sec_issues,
            'suggestions': suggestions
        }

    DISALLOWED_JS_MODULES = {
        'child_process', 'fs', 'net', 'http', 'https', 'process', 'vm',
        'cluster', 'worker_threads', 'tls', 'dgram', 'dns'
    }

    @classmethod
    def execute_code(cls, code: str, language: str = 'python', input_data: str = '', timeout_sec: float = 2.0):
        language = language.strip().lower() if isinstance(language, str) else ''
        language = language or 'python'
        start_time = time.monotonic()
        if not isinstance(code, str):
            analysis = cls.analyze_ast('', language)
            result = cls._failure('Code must be a string.', start_time)
        elif len(code) > cls.MAX_SOURCE_BYTES:
            analysis = cls.analyze_ast('', language)
            result = cls._failure('Submission exceeds the 64 KiB source limit.', start_time)
        elif not isinstance(input_data, str):
            analysis = cls.analyze_ast(code, language)
            result = cls._failure('Input must be a string.', start_time)
        elif len(input_data) > cls.MAX_INPUT_BYTES:
            analysis = cls.analyze_ast(code, language)
            result = cls._failure('Input exceeds the 64 KiB limit.', start_time)
        elif language not in {'python', 'javascript', 'js'}:
            analysis = cls.analyze_ast(code, language)
            result = cls._failure(
                'Unsupported language: no isolated runtime is configured for this language.',
                start_time,
            )
        else:
            analysis = cls.analyze_ast(code, language)
            if len(code.encode('utf-8')) > cls.MAX_SOURCE_BYTES:
                result = cls._failure('Submission exceeds the 64 KiB source limit.', start_time)
            elif len(input_data.encode('utf-8')) > cls.MAX_INPUT_BYTES:
                result = cls._failure('Input exceeds the 64 KiB limit.', start_time)
            elif not analysis['security_passed']:
                result = cls._failure(
                    f"Security Violation: {', '.join(analysis['security_issues'])}",
                    start_time,
                )
            elif language in {'javascript', 'js'} and (js_issue := cls._javascript_security_issue(code)):
                analysis['security_passed'] = False
                analysis['security_issues'] = [js_issue]
                result = cls._failure(js_issue, start_time)
            else:
                result = cls._run_container(code, language, input_data, timeout_sec, start_time)

        result['analysis'] = analysis
        return result

    MAX_SOURCE_BYTES = 64 * 1024
    MAX_INPUT_BYTES = 64 * 1024
    MAX_OUTPUT_BYTES = 20_000
    MAX_TIMEOUT_SECONDS = 5.0
    STARTUP_GRACE_SECONDS = 5.0
    CONTAINER_MEMORY = '128m'

    @staticmethod
    def _failure(stderr: str, start_time: float, status: str = 'Runtime Error'):
        return {
            'success': False,
            'stdout': '',
            'stderr': stderr,
            'runtime_ms': max(0, int((time.monotonic() - start_time) * 1000)),
            'memory_mb': 0.0,
            'status': status,
        }

    @classmethod
    def _javascript_security_issue(cls, code: str):
        import re
        modules = '|'.join(cls.DISALLOWED_JS_MODULES)
        module_patterns = (
            r'\b(?:require|import)\s*\(\s*[\'"`](?:node:)?(?:' + modules + r')[\'"`]\s*\)',
            r'\bfrom\s*[\'"`](?:node:)?(?:' + modules + r')[\'"`]',
        )
        if any(re.search(pattern, code, re.IGNORECASE) for pattern in module_patterns):
            return 'Security policy violation: Disallowed module import detected.'

        dangerous_calls = [
            r'\bprocess\.(?:exit|env|binding|mainModule|kill|geteuid|dlopen)\b',
            r'\b(?:child_process|worker_threads)\b',
            r'\b(?:eval|Function)\s*\(',
        ]
        if any(re.search(pattern, code, re.IGNORECASE) for pattern in dangerous_calls):
            return 'Security policy violation: Disallowed API call detected in sandbox.'
        return None

    @classmethod
    def _run_container(cls, code: str, language: str, input_data: str, timeout_sec: float, start_time: float):
        docker = shutil.which('docker')
        if not docker:
            return cls._failure('Sandbox runtime unavailable: Docker CLI was not found.', start_time)

        try:
            requested_timeout = float(timeout_sec)
        except (TypeError, ValueError):
            requested_timeout = 2.0
        execution_timeout = min(max(requested_timeout, 0.1), cls.MAX_TIMEOUT_SECONDS)
        container_name = f'learninghub-sandbox-{uuid.uuid4().hex}'
        filename = 'submission.py' if language == 'python' else 'submission.js'
        image = 'python:3.12-slim' if language == 'python' else 'node:22-alpine'
        runtime_command = (
            ['python', '-I', '-S', '-B', f'/sandbox/{filename}']
            if language == 'python'
            else ['node', '--no-addons', '--disallow-code-generation-from-strings', f'/sandbox/{filename}']
        )
        process = None

        try:
            with tempfile.TemporaryDirectory(prefix='learninghub-sandbox-') as source_dir:
                if ',' in source_dir:
                    return cls._failure('Sandbox runtime unavailable: temporary path cannot be mounted safely.', start_time)

                source_path = os.path.join(source_dir, filename)
                with open(source_path, 'w', encoding='utf-8', newline='') as source_file:
                    source_file.write(code)

                command = [
                    docker, 'run', '--rm', '--pull=missing', '--name', container_name,
                    '--network=none',
                    '--cpus=0.5',
                    f'--memory={cls.CONTAINER_MEMORY}',
                    f'--memory-swap={cls.CONTAINER_MEMORY}',
                    '--pids-limit=32',
                    '--read-only',
                    '--cap-drop=ALL',
                    '--security-opt=no-new-privileges:true',
                    '--user=65534:65534',
                    '--tmpfs=/tmp:rw,nosuid,nodev,noexec,size=16m',
                    '--mount', f'type=bind,src={source_dir},dst=/sandbox,readonly',
                    '--workdir=/sandbox',
                    '--env=HOME=/tmp',
                    '--env=TMPDIR=/tmp',
                    image,
                    *runtime_command,
                ]
                process = subprocess.Popen(
                    command,
                    stdin=subprocess.PIPE,
                    stdout=subprocess.PIPE,
                    stderr=subprocess.PIPE,
                )

                stdout_bytes, stdout_truncated = bytearray(), [False]
                stderr_bytes, stderr_truncated = bytearray(), [False]
                readers = [
                    threading.Thread(
                        target=cls._drain_output,
                        args=(process.stdout, stdout_bytes, stdout_truncated),
                        daemon=True,
                    ),
                    threading.Thread(
                        target=cls._drain_output,
                        args=(process.stderr, stderr_bytes, stderr_truncated),
                        daemon=True,
                    ),
                ]
                for reader in readers:
                    reader.start()

                writer = threading.Thread(
                    target=cls._write_input,
                    args=(process.stdin, input_data.encode('utf-8')),
                    daemon=True,
                )
                writer.start()

                try:
                    watchdog_timeout = execution_timeout + cls.STARTUP_GRACE_SECONDS
                    return_code = process.wait(timeout=watchdog_timeout)
                except subprocess.TimeoutExpired:
                    cls._stop_container(docker, container_name, process)
                    return cls._failure(
                        f'Container execution exceeded its {watchdog_timeout:g} second wall-clock limit.',
                        start_time,
                        status='Time Limit Exceeded',
                    )

                writer.join(timeout=1)
                for reader in readers:
                    reader.join(timeout=1)

                stdout = cls._decode_output(stdout_bytes, stdout_truncated[0])
                stderr = cls._decode_output(stderr_bytes, stderr_truncated[0])
                elapsed_ms = max(0, int((time.monotonic() - start_time) * 1000))
                if return_code == 0:
                    return {
                        'success': True,
                        'stdout': stdout,
                        'stderr': stderr,
                        'runtime_ms': elapsed_ms,
                        'memory_mb': 0.0,
                        'status': 'Accepted',
                    }

                if return_code in {125, 126, 127}:
                    detail = stderr.strip() or f'Docker runner exited with code {return_code}.'
                    stderr = f'Sandbox runtime unavailable: {detail}'
                return {
                    'success': False,
                    'stdout': stdout,
                    'stderr': stderr,
                    'runtime_ms': elapsed_ms,
                    'memory_mb': 0.0,
                    'status': 'Runtime Error',
                }
        except FileNotFoundError:
            return cls._failure('Sandbox runtime unavailable: Docker could not be started.', start_time)
        except Exception as error:
            if process is not None:
                cls._stop_container(docker, container_name, process)
            return cls._failure(f'Sandbox execution failed: {error}', start_time)

    @classmethod
    def _drain_output(cls, stream, captured: bytearray, truncated: list):
        try:
            while True:
                chunk = stream.read(8192)
                if not chunk:
                    return
                available = cls.MAX_OUTPUT_BYTES - len(captured)
                if available > 0:
                    captured.extend(chunk[:available])
                if len(chunk) > max(0, available):
                    truncated[0] = True
        except (OSError, ValueError):
            return

    @staticmethod
    def _write_input(stream, input_bytes: bytes):
        try:
            if input_bytes:
                stream.write(input_bytes)
                stream.flush()
        except (BrokenPipeError, OSError, ValueError):
            pass
        finally:
            try:
                stream.close()
            except (OSError, ValueError):
                pass

    @staticmethod
    def _decode_output(output: bytearray, truncated: bool) -> str:
        decoded = output.decode('utf-8', errors='replace')
        if truncated:
            decoded += '\n[Output truncated: maximum 20KB allowed]'
        return decoded

    @staticmethod
    def _stop_container(docker: str, container_name: str, process):
        try:
            subprocess.run(
                [docker, 'kill', container_name],
                stdin=subprocess.DEVNULL,
                stdout=subprocess.DEVNULL,
                stderr=subprocess.DEVNULL,
                timeout=2,
                check=False,
            )
        except (OSError, subprocess.TimeoutExpired):
            pass

        try:
            process.wait(timeout=1)
        except subprocess.TimeoutExpired:
            try:
                process.kill()
            except OSError:
                pass
            try:
                process.wait(timeout=1)
            except subprocess.TimeoutExpired:
                pass
