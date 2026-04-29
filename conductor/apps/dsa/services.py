import logging
import sys
import io
import contextlib
import traceback
from typing import Optional, Dict, Any, List
from django.db import transaction
from django.conf import settings
from .models import Submission, Problem, TestCase
from apps.users.models import User

logger = logging.getLogger(__name__)


class DsaService:
    """
    Service layer to handle all business logic for DSA problems & submissions.
    Separates concerns from Views/Serializers.
    """

    @staticmethod
    def get_problem_context(slug: str, user: User) -> Optional[Dict[str, Any]]:
        """
        Retrieves problem context including previous submission status.
        Optimized with select_related/prefetch_related to prevent N+1.
        """
        try:
            problem = Problem.objects.prefetch_related('tags').get(slug=slug)

            # Check for previous submissions by this user
            previous_submission = Submission.objects.filter(
                problem=problem,
                user=user
            ).order_by('-created_at').first()

            return {
                'problem': problem,
                'previous_status': (
                    previous_submission.status if previous_submission else None
                )
            }
        except Problem.DoesNotExist:
            return None

    @staticmethod
    def submit_solution(user: User, problem_id: int, code: str, language: str) -> Submission:
        """
        Handles the creation of a submission transactionally.
        """
        try:
            problem = Problem.objects.get(id=problem_id)

            with transaction.atomic():
                submission = Submission.objects.create(
                    user=user,
                    problem=problem,
                    code=code,
                    language=language,
                    status='PENDING'
                )

                # Trigger the Celery task
                from .tasks import evaluate_submission_task
                evaluate_submission_task.delay(submission.id)

                logger.info("Submission %s created for User %s", submission.id, user.id)
                return submission
        except Exception as e:
            logger.error("Error creating submission: %s", e)
            raise e

    @staticmethod
    def get_ai_hint(user: User, problem_slug: str) -> str:
        """
        Generates a smart hint using the AI Engine.
        Adapted to the user's skill level.
        """
        try:
            problem = Problem.objects.get(slug=problem_slug)
            
            # Import here to avoid circular dependency if apps.ai_engine imports from apps.dsa
            from apps.ai_engine.ai_client import AIClient
            
            # 1. Determine User Level
            try:
                user_level = user.xp_profile.level
            except Exception:
                user_level = 1 # Default to beginner
                
            # 2. Generate Hint
            hint = AIClient.generate_problem_hint(problem.title, problem.description, user_level)
            return hint
        except Problem.DoesNotExist:
            return "Error: Problem not found."
        except Exception as e:
            logger.error("Error generating AI hint: %s", e)
            return "Hint: Review the problem statement carefully and check constraints."


class SandboxService:
    """
    Secure sandbox execution service for untrusted code.
    Currently mimics security checks for Python.
    
    Security Note: This is a defense-in-depth approach. For production,
    consider using Docker/nsjail for true isolation.
    """

    @staticmethod
    def sanitize_code(code: str) -> str:
        """
        Uses AST-based static analysis to reject dangerous code.
        Secure against obfuscation and formatting tricks.
        """
        # Lazy import to avoid circular dependency issues if any
        from .validator import CodeValidator
        CodeValidator.validate(code)
        return code

    @staticmethod
    def evaluate(submission: Submission) -> None:
        """
        Evaluates the submission against test cases.
        """
        try:
            SandboxService.sanitize_code(submission.code)

            test_cases = submission.problem.test_cases.all()
            if not test_cases.exists():
                submission.status = 'AC'
                submission.error_log = "No test cases found. Automatically accepted."
                submission.save(update_fields=['status', 'error_log'])
                return

            log = []
            max_memory = 0
            
            for i, test in enumerate(test_cases):
                result = SandboxService.run_code(submission.code, test.input_data)
                
                # Update max memory usage observed
                max_memory = max(max_memory, result.get('memory_bytes', 0))

                # Check Memory Limit (10MB Soft Limit for Mastery Exercise)
                MEMORY_LIMIT_BYTES = 10 * 1024 * 1024
                if result.get('memory_bytes', 0) > MEMORY_LIMIT_BYTES:
                     submission.status = 'RE' # Runtime Error due to Memory
                     submission.error_log = f"Memory Limit Exceeded on Test Case {i+1}. Used: {result['memory_bytes']/1024/1024:.2f} MB"
                     submission.save(update_fields=['status', 'error_log'])
                     return

                if result['error']:
                    submission.status = 'RE'
                    submission.error_log = f"Runtime Error on Test Case {i+1}:\n{result['error']}"
                    submission.save(update_fields=['status', 'error_log'])
                    return

                # Normalize output (strip whitespace)
                actual = result['output'].strip()
                expected = test.expected_output.strip()

                if actual != expected:
                    submission.status = 'WA'
                    submission.error_log = (
                        f"Wrong Answer on Test Case {i+1}.\n"
                        f"Input: {test.input_data}\n"
                        f"Expected: {expected}\n"
                        f"Actual: {actual}"
                    )
                    submission.save(update_fields=['status', 'error_log'])
                    return
                
                log.append(f"Test Case {i+1}: Passed")

            submission.status = 'AC'
            submission.error_log = "\n".join(log)
            submission.runtime_ms = 10  # Mock runtime
            submission.memory_kb = int(max_memory / 1024) 
            submission.save(update_fields=['status', 'error_log', 'runtime_ms', 'memory_kb'])

        except ValueError as e:
            submission.status = 'RE' # Security violation treated as Runtime Error
            submission.error_log = str(e)
            submission.save(update_fields=['status', 'error_log'])
        except Exception as e:
            submission.status = 'RE'
            submission.error_log = f"System Error: {traceback.format_exc()}"
            submission.save(update_fields=['status', 'error_log'])

    @staticmethod
    def run_code(code: str, input_data: str) -> Dict[str, Any]:
        """
        Runs code securely inside an isolated Docker container with strict
        cgroups (CPU/Memory limits) and no network access.
        Falls back to local subprocess if Docker is unavailable.
        """
        import os
        import tempfile
        import time
        try:
            import docker
            from docker.errors import DockerException, ContainerError
        except ImportError:
            logger.warning("Docker SDK missing. Falling back to subprocess isolation.")
            return SandboxService._run_code_subprocess(code, input_data)
            
        try:
            client = docker.from_env()
            # Test connection
            client.ping()
        except DockerException:
            logger.warning("Docker daemon not reachable. Falling back to subprocess isolation.")
            return SandboxService._run_code_subprocess(code, input_data)

        # 1. Prepare secure execution script
        wrapper_script = f"""
import sys
import traceback

def safe_run():
    try:
        sys.stdin = open(sys.stdin.fileno(), 'r')
        
{chr(10).join(["        " + line for line in code.split(chr(10))])}

    except Exception:
        traceback.print_exc()

if __name__ == "__main__":
    safe_run()
"""
        
        tmp_dir = tempfile.mkdtemp()
        script_path = os.path.join(tmp_dir, "solution.py")
        input_path = os.path.join(tmp_dir, "input.txt")
        
        with open(script_path, "w", encoding="utf-8") as f:
            f.write(wrapper_script)
            
        with open(input_path, "w", encoding="utf-8") as f:
            f.write(input_data)
            
        volume_mounts = {
            tmp_dir: {'bind': '/sandbox', 'mode': 'ro'}
        }
        
        container = None
        start_time = time.time()
        
        try:
            # 2. Spin up ephemeral container with strict resource limits
            container = client.containers.run(
                image="python:3.11-alpine", # Minimal surface area
                command="sh -c 'python /sandbox/solution.py < /sandbox/input.txt'",
                volumes=volume_mounts,
                detach=True,
                network_disabled=True,        # No internet
                mem_limit="50m",              # 50MB RAM limit
                memswap_limit="50m",          # No Swap
                cpu_quota=50000,              # 50% of 1 CPU core
                pids_limit=20,                # Prevent fork bombs
                security_opt=["no-new-privileges"],
                cap_drop=["ALL"],
                read_only=True                # Immutable root fs
            )
            
            # 3. Wait with timeout
            result = container.wait(timeout=3)
            logs = container.logs().decode('utf-8')
            
            # Approximate memory usage from container stats before it dies (optional)
            # For this version, we will return 0 as stats API can be slow
            
            if result.get('StatusCode', 0) != 0:
                # Execution failed (OOM, Runtime Error, etc)
                return {
                    "output": "",
                    "error": logs,
                    "memory_bytes": 0
                }
                
            return {
                "output": logs,
                "error": None,
                "memory_bytes": 0
            }
            
        except docker.errors.ContainerError as e:
            return {
                "output": "",
                "error": str(e),
                "memory_bytes": 0
            }
        except docker.errors.APIError as e:
            # Timeout triggers APIError from docker-py's wait
            return {
                "output": "",
                "error": "Time Limit Exceeded (TLE) or Docker Error",
                "memory_bytes": 0
            }
        except Exception as e:
            return {
                "output": "",
                "error": f"Sandbox Error: {str(e)}",
                "memory_bytes": 0
            }
        finally:
            if container:
                try:
                    container.remove(force=True)
                except Exception:
                    pass
            # Cleanup temp files
            import shutil
            shutil.rmtree(tmp_dir, ignore_errors=True)

    @staticmethod
    def _run_code_subprocess(code: str, input_data: str) -> Dict[str, Any]:
        """
        Fallback implementation using subprocess. Less secure, but works 
        without Docker Daemon.
        """
        import subprocess
        import sys
        import tempfile
        import os

        wrapper_script = f"""
import sys
import traceback

def safe_run():
    try:
        sys.stdin = open(sys.stdin.fileno(), 'r')
        
{chr(10).join(["        " + line for line in code.split(chr(10))])}

    except Exception:
        traceback.print_exc()

if __name__ == "__main__":
    safe_run()
"""
        
        try:
            with tempfile.NamedTemporaryFile(mode='w', suffix='.py', delete=False) as f:
                f.write(wrapper_script)
                script_path = f.name
            
            process = subprocess.Popen(
                [sys.executable, script_path],
                stdin=subprocess.PIPE,
                stdout=subprocess.PIPE,
                stderr=subprocess.PIPE,
                text=True
            )
            
            try:
                stdout, stderr = process.communicate(input=input_data, timeout=2.0)
            except subprocess.TimeoutExpired:
                process.kill()
                return {
                    "output": "",
                    "error": "Time Limit Exceeded (TLE)",
                    "memory_bytes": 0
                }

            if os.path.exists(script_path):
                os.remove(script_path)
                
            if stderr:
                return {
                    "output": stdout,
                    "error": stderr,
                    "memory_bytes": 0
                }
            
            return {
                "output": stdout,
                "error": None,
                "memory_bytes": 0
            }

        except Exception as e:
            return {
                "output": "",
                "error": f"System Error: {str(e)}",
                "memory_bytes": 0
            }