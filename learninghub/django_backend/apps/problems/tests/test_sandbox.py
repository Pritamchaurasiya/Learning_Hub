import io
import subprocess
from unittest.mock import patch

from apps.problems.sandbox import CodeSandboxService


class FakeDockerProcess:
    def __init__(self, stdout=b'42\n', stderr=b'', returncode=0):
        self.stdin = io.BytesIO()
        self.stdout = io.BytesIO(stdout)
        self.stderr = io.BytesIO(stderr)
        self.returncode = returncode
        self.wait_timeout = None
        self.wait_timeouts = []

    def wait(self, timeout=None):
        self.wait_timeout = timeout
        self.wait_timeouts.append(timeout)
        return self.returncode


class TimedOutDockerProcess(FakeDockerProcess):
    def __init__(self):
        super().__init__(stdout=b'', stderr=b'')
        self.wait_calls = 0

    def wait(self, timeout=None):
        self.wait_calls += 1
        self.wait_timeout = timeout
        self.wait_timeouts.append(timeout)
        if self.wait_calls == 1:
            raise subprocess.TimeoutExpired('docker run', timeout)
        return -9


def test_missing_docker_runtime_fails_without_starting_process():
    with (
        patch('apps.problems.sandbox.shutil.which', return_value=None),
        patch('apps.problems.sandbox.subprocess.Popen') as popen,
    ):
        result = CodeSandboxService.execute_code('print(42)')

    assert result['success'] is False
    assert result['status'] == 'Runtime Error'
    assert 'runtime unavailable' in result['stderr'].lower()
    assert 'analysis' in result
    popen.assert_not_called()


def test_unsupported_language_is_not_reported_as_success_or_run():
    with (
        patch('apps.problems.sandbox.shutil.which') as which,
        patch('apps.problems.sandbox.subprocess.Popen') as popen,
    ):
        result = CodeSandboxService.execute_code('print(42)', language='cpp')

    assert result['success'] is False
    assert result['status'] == 'Runtime Error'
    assert 'unsupported language' in result['stderr'].lower()
    which.assert_not_called()
    popen.assert_not_called()


def test_python_invocation_uses_a_restricted_container_and_bounded_timeout():
    fake_process = FakeDockerProcess()
    with (
        patch('apps.problems.sandbox.shutil.which', return_value='docker'),
        patch('apps.problems.sandbox.subprocess.Popen', return_value=fake_process) as popen,
    ):
        result = CodeSandboxService.execute_code('print(42)', timeout_sec=60)

    command = popen.call_args.args[0]
    assert command[0:2] == ['docker', 'run']
    assert '--network=none' in command
    assert '--cpus=0.5' in command
    assert '--memory=128m' in command
    assert '--memory-swap=128m' in command
    assert '--pids-limit=32' in command
    assert '--read-only' in command
    assert '--cap-drop=ALL' in command
    assert '--security-opt=no-new-privileges:true' in command
    assert '--user=65534:65534' in command
    assert '--tmpfs=/tmp:rw,nosuid,nodev,noexec,size=16m' in command

    mount = command[command.index('--mount') + 1]
    assert mount.startswith('type=bind,src=')
    assert mount.endswith(',dst=/sandbox,readonly')
    assert command[command.index('python:3.12-slim') + 1:] == [
        'python', '-I', '-S', '-B', '/sandbox/submission.py'
    ]
    assert 'print(42)' not in command
    assert fake_process.wait_timeout == (
        CodeSandboxService.MAX_TIMEOUT_SECONDS + CodeSandboxService.STARTUP_GRACE_SECONDS
    )
    assert result['success'] is True
    assert result['stdout'] == '42\n'
    assert result['status'] == 'Accepted'
    popen.assert_called_once_with(
        command,
        stdin=subprocess.PIPE,
        stdout=subprocess.PIPE,
        stderr=subprocess.PIPE,
    )


def test_missing_javascript_runtime_never_falls_back_to_host_node():
    with (
        patch('apps.problems.sandbox.shutil.which', return_value='docker'),
        patch(
            'apps.problems.sandbox.subprocess.Popen',
            side_effect=FileNotFoundError('docker executable disappeared'),
        ) as popen,
    ):
        result = CodeSandboxService.execute_code('console.log("ok")', language='javascript')

    command = popen.call_args.args[0]
    assert command[0:2] == ['docker', 'run']
    assert result['success'] is False
    assert result['status'] == 'Runtime Error'
    assert 'runtime unavailable' in result['stderr'].lower()
    assert not any(part == 'node' for part in command[:2])


def test_timeout_kills_the_container_and_returns_failure():
    fake_process = TimedOutDockerProcess()
    with (
        patch('apps.problems.sandbox.shutil.which', return_value='docker'),
        patch('apps.problems.sandbox.subprocess.Popen', return_value=fake_process),
        patch('apps.problems.sandbox.subprocess.run') as docker_kill,
    ):
        result = CodeSandboxService.execute_code('while True: pass', timeout_sec=0.1)

    assert result['success'] is False
    assert result['status'] == 'Time Limit Exceeded'
    assert 'wall-clock limit' in result['stderr']
    assert fake_process.wait_timeouts[0] == 0.1 + CodeSandboxService.STARTUP_GRACE_SECONDS
    docker_kill.assert_called_once()
    assert docker_kill.call_args.args[0][0:2] == ['docker', 'kill']
