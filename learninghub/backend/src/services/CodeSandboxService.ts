/**
 * Code Sandbox Service — Safe Code Execution via Piston API
 *
 * Executes user-submitted code in isolated Docker containers via the Piston API.
 * This eliminates the critical RCE vulnerability of the previous child_process.exec approach.
 *
 * Public Piston instances:
 *  - https://emkc.org/api/v2/piston (official)
 *  - Self-hosted: https://github.com/engineer-man/piston
 *
 * Supports: Python, JavaScript, Java, C++, C, TypeScript, Go, Rust, and more.
 */

interface TestCase {
  input: string
  output: string
}

interface ExecutionRequest {
  code: string
  language: string
  testCases: TestCase[]
  timeLimit: number
  memoryLimit: number
}

interface ExecutionResult {
  status:
    | 'accepted'
    | 'wrong_answer'
    | 'compilation_error'
    | 'runtime_error'
    | 'time_limit_exceeded'
  executionTime: number
  memoryUsed: number
  message: string
  testCasesPassed: number
  testCasesTotal: number
}

const PISTON_API_URL = process.env.PISTON_API_URL ?? 'https://emkc.org/api/v2/piston'

const LANGUAGE_MAP: Record<string, { language: string; version: string }> = {
  python: { language: 'python', version: '3.10.0' },
  python3: { language: 'python', version: '3.10.0' },
  javascript: { language: 'javascript', version: '18.15.0' },
  node: { language: 'javascript', version: '18.15.0' },
  typescript: { language: 'typescript', version: '5.0.3' },
  java: { language: 'java', version: '15.0.2' },
  cpp: { language: 'cpp', version: '10.2.0' },
  c: { language: 'c', version: '10.2.0' },
  go: { language: 'go', version: '1.16.2' },
  rust: { language: 'rust', version: '1.68.2' },
}

export class CodeSandboxService {
  static async execute(req: ExecutionRequest): Promise<ExecutionResult> {
    const langConfig = LANGUAGE_MAP[req.language.toLowerCase()]
    if (!langConfig) {
      return {
        status: 'compilation_error',
        executionTime: 0,
        memoryUsed: 0,
        message: `Unsupported language: ${req.language}. Supported: ${Object.keys(LANGUAGE_MAP).join(', ')}`,
        testCasesPassed: 0,
        testCasesTotal: req.testCases.length,
      }
    }

    let passed = 0
    let totalExecutionTime = 0
    let maxMemory = 0

    for (let i = 0; i < req.testCases.length; i++) {
      const tc = req.testCases[i]
      const result = await this.runTestCase(langConfig, req.code, tc.input, req.timeLimit)

      if (result.status === 'time_limit_exceeded') {
        return {
          status: 'time_limit_exceeded',
          executionTime: result.executionTime,
          memoryUsed: result.memoryUsed,
          message: `Time limit exceeded on test case ${i + 1}`,
          testCasesPassed: passed,
          testCasesTotal: req.testCases.length,
        }
      }

      if (result.status === 'compilation_error') {
        return {
          status: 'compilation_error',
          executionTime: 0,
          memoryUsed: 0,
          message: result.message,
          testCasesPassed: 0,
          testCasesTotal: req.testCases.length,
        }
      }

      if (result.status === 'runtime_error') {
        return {
          status: 'runtime_error',
          executionTime: result.executionTime,
          memoryUsed: result.memoryUsed,
          message: result.message,
          testCasesPassed: passed,
          testCasesTotal: req.testCases.length,
        }
      }

      totalExecutionTime += result.executionTime
      maxMemory = Math.max(maxMemory, result.memoryUsed)

      if (this.compareOutput(result.output, tc.output)) {
        passed++
      } else {
        return {
          status: 'wrong_answer',
          executionTime: totalExecutionTime,
          memoryUsed: maxMemory,
          message: `Wrong answer on test case ${i + 1}`,
          testCasesPassed: passed,
          testCasesTotal: req.testCases.length,
        }
      }
    }

    return {
      status: 'accepted',
      executionTime: totalExecutionTime,
      memoryUsed: maxMemory,
      message: `All ${req.testCases.length} test cases passed`,
      testCasesPassed: passed,
      testCasesTotal: req.testCases.length,
    }
  }

  private static async runTestCase(
    langConfig: { language: string; version: string },
    code: string,
    input: string,
    timeLimit: number
  ): Promise<{
    status: 'success' | 'runtime_error' | 'time_limit_exceeded' | 'compilation_error'
    output: string
    message: string
    executionTime: number
    memoryUsed: number
  }> {
    try {
      const timeoutSeconds = Math.max(1, Math.floor(timeLimit / 1000))

      const response = await fetch(`${PISTON_API_URL}/execute`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          language: langConfig.language,
          version: langConfig.version,
          files: [{ name: 'main', content: code }],
          stdin: input,
          args: [],
          compile_timeout: timeoutSeconds * 1000,
          run_timeout: timeoutSeconds * 1000,
        }),
        signal: AbortSignal.timeout((timeoutSeconds + 5) * 1000),
      })

      if (!response.ok) {
        return {
          status: 'runtime_error',
          output: '',
          message: `Piston API error: ${response.status} ${response.statusText}`,
          executionTime: 0,
          memoryUsed: 0,
        }
      }

      const data = await response.json()

      if (data.compile && data.compile.code !== 0) {
        return {
          status: 'compilation_error',
          output: '',
          message: data.compile.stderr?.substring(0, 500) ?? 'Compilation failed',
          executionTime: 0,
          memoryUsed: 0,
        }
      }

      if (data.run?.signal === 'SIGKILL') {
        return {
          status: 'time_limit_exceeded',
          output: data.run.stdout ?? '',
          message: 'Time limit exceeded',
          executionTime: timeLimit,
          memoryUsed: 0,
        }
      }

      if (data.run && data.run.code !== 0) {
        return {
          status: 'runtime_error',
          output: data.run.stdout ?? '',
          message: data.run.stderr?.substring(0, 500) ?? 'Runtime error',
          executionTime: parseInt(data.run.time ?? '0'),
          memoryUsed: parseInt(data.run.memory ?? '0'),
        }
      }

      return {
        status: 'success',
        output: data.run?.stdout ?? '',
        message: 'Success',
        executionTime: parseInt(data.run?.time ?? '0'),
        memoryUsed: parseInt(data.run?.memory ?? '0'),
      }
    } catch (error) {
      if (error instanceof Error && error.name === 'TimeoutError') {
        return {
          status: 'time_limit_exceeded',
          output: '',
          message: 'Execution timed out',
          executionTime: timeLimit,
          memoryUsed: 0,
        }
      }
      return {
        status: 'runtime_error',
        output: '',
        message: error instanceof Error ? error.message : 'Execution service unavailable',
        executionTime: 0,
        memoryUsed: 0,
      }
    }
  }

  private static compareOutput(actual: string, expected: string): boolean {
    return actual.trim().replace(/\r\n/g, '\n') === expected.trim().replace(/\r\n/g, '\n')
  }
}
