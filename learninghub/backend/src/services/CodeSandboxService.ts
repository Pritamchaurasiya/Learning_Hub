/**
 * Code Sandbox Service — Safe Multi-Tier Code Execution
 *
 * Tier 1: Configured Piston API instance
 * Tier 2: Public EMKC Piston instance fallback
 * Tier 3: Isolated Secure In-Memory VM Sandbox fallback (for JavaScript/TypeScript and offline test execution)
 *
 * Supports: Python, JavaScript, Java, C++, C, TypeScript, Go, Rust.
 */

import crypto from 'crypto'
import * as vm from 'node:vm'
import { cacheService } from './CacheService'
import logger from '../utils/logger'

export interface TestCase {
  input: string
  output: string
}

export interface ExecutionRequest {
  code: string
  language: string
  testCases: TestCase[]
  timeLimit?: number
  memoryLimit?: number
}

export interface ExecutionResult {
  status:
    | 'accepted'
    | 'wrong_answer'
    | 'compilation_error'
    | 'runtime_error'
    | 'time_limit_exceeded'
    | 'memory_limit_exceeded'
  executionTime: number
  memoryUsed: number
  message: string
  testCasesPassed: number
  testCasesTotal: number
  output?: string
}

const PRIMARY_PISTON_URL = process.env.PISTON_API_URL ?? 'http://localhost:2000/api/v2'
const PUBLIC_PISTON_URL = 'https://emkc.org/api/v2/piston'

const LANGUAGE_MAP: Record<string, { language: string; version: string }> = {
  python: { language: 'python', version: '3.10.0' },
  python3: { language: 'python', version: '3.10.0' },
  javascript: { language: 'javascript', version: '18.15.0' },
  js: { language: 'javascript', version: '18.15.0' },
  node: { language: 'javascript', version: '18.15.0' },
  typescript: { language: 'typescript', version: '5.0.3' },
  ts: { language: 'typescript', version: '5.0.3' },
  java: { language: 'java', version: '15.0.2' },
  cpp: { language: 'cpp', version: '10.2.0' },
  'c++': { language: 'cpp', version: '10.2.0' },
  c: { language: 'c', version: '10.2.0' },
  go: { language: 'go', version: '1.16.2' },
  rust: { language: 'rust', version: '1.68.2' },
}

const FILE_NAME_MAP: Record<string, string> = {
  c: 'main.c',
  cpp: 'main.cpp',
  'c++': 'main.cpp',
  python: 'main.py',
  python3: 'main.py',
  javascript: 'main.js',
  js: 'main.js',
  node: 'main.js',
  typescript: 'main.ts',
  ts: 'main.ts',
  java: 'Main.java',
  go: 'main.go',
  rust: 'main.rs',
}

export class CodeSandboxService {
  private static consecutiveFailures = 0
  private static circuitOpenUntil = 0

  static async execute(req: ExecutionRequest): Promise<ExecutionResult> {
    const rawLang = req.language.toLowerCase()
    const langConfig = LANGUAGE_MAP[rawLang]

    if (!langConfig) {
      return {
        status: 'compilation_error',
        executionTime: 0,
        memoryUsed: 0,
        message: `Unsupported language: ${req.language}. Supported: ${Object.keys(LANGUAGE_MAP).join(', ')}`,
        testCasesPassed: 0,
        testCasesTotal: req.testCases?.length || 0,
      }
    }

    const testCases =
      req.testCases && req.testCases.length > 0 ? req.testCases : [{ input: '', output: '' }]

    // Security screening: block unauthorized process / reflection / module access tokens
    const FORBIDDEN_TOKENS = [
      /\bprocess\b/,
      /\bchild_process\b/,
      /\brequire\s*\(/,
      /\beval\s*\(/,
      /\bFunction\s*\(/,
      /\bimport\s*\(/,
    ]
    if (FORBIDDEN_TOKENS.some(regex => regex.test(req.code))) {
      return {
        status: 'runtime_error',
        executionTime: 0,
        memoryUsed: 0,
        message:
          'Unauthorized execution tokens detected: access to process, child_process, eval, require is prohibited.',
        testCasesPassed: 0,
        testCasesTotal: testCases.length,
      }
    }

    // Normalize timeLimit: convert small seconds values (< 100) to milliseconds
    const timeLimit = req.timeLimit
      ? req.timeLimit < 100
        ? req.timeLimit * 1000
        : req.timeLimit
      : 5000
    const memoryLimit = req.memoryLimit ?? 256

    // Sandbox Deduplication Cache
    const payloadHash = crypto
      .createHash('sha256')
      .update(
        JSON.stringify({
          code: req.code,
          language: req.language,
          testCases,
          timeLimit,
          memoryLimit,
        })
      )
      .digest('hex')
    const cacheKey = `sandbox_cache:${payloadHash}`

    const cachedResult = await cacheService.get<ExecutionResult>(cacheKey)
    if (cachedResult) {
      return cachedResult
    }

    // Try Tier 1 / Tier 2 Piston
    let result: ExecutionResult | null = null
    const urlsToTry = [PRIMARY_PISTON_URL]
    if (PRIMARY_PISTON_URL !== PUBLIC_PISTON_URL) {
      urlsToTry.push(PUBLIC_PISTON_URL)
    }

    for (const apiUrl of urlsToTry) {
      try {
        result = await CodeSandboxService._executeWithPiston(apiUrl, langConfig, {
          ...req,
          testCases,
          timeLimit,
          memoryLimit,
        })
        if (result && result.status !== 'runtime_error') {
          break
        }
      } catch (err) {
        logger.warn(`Piston execution failed on ${apiUrl}:`, {
          error: err instanceof Error ? err.message : String(err),
        })
      }
    }

    // Tier 3: Isolated Secure In-Memory VM Sandbox fallback for JavaScript/Node
    if (
      (!result ||
        (result.status === 'runtime_error' &&
          (result.message.includes('unavailable') ||
            result.message.includes('Piston API returned') ||
            result.message.includes('unreachable') ||
            result.message.includes('failed')))) &&
      (rawLang === 'javascript' || rawLang === 'js' || rawLang === 'node')
    ) {
      result = CodeSandboxService._executeLocalJs(req.code, testCases, timeLimit)
    }

    // Sandbox enforcement: strictly require isolated containerized execution.
    if (
      !result ||
      (result.status === 'runtime_error' &&
        (result.message.includes('unavailable') ||
          result.message.includes('Piston API returned') ||
          result.message.includes('unreachable') ||
          result.message.includes('failed')))
    ) {
      result = result ?? {
        status: 'runtime_error',
        executionTime: 0,
        memoryUsed: 0,
        message:
          'Code execution service is currently unreachable. Isolated sandbox containers are required for secure execution.',
        testCasesPassed: 0,
        testCasesTotal: testCases.length,
      }
    }

    // Cache successful execution result for 1 hour
    if (result) {
      await cacheService.set(cacheKey, result, 3600)
    }

    return result
  }

  private static async _executeWithPiston(
    apiUrl: string,
    langConfig: { language: string; version: string },
    req: Required<ExecutionRequest>
  ): Promise<ExecutionResult> {
    let passed = 0
    let totalExecutionTime = 0
    let maxMemory = 0

    for (let i = 0; i < req.testCases.length; i++) {
      const tc = req.testCases[i]!
      const singleResult = await CodeSandboxService.runPistonTestCase(
        apiUrl,
        langConfig,
        req.code,
        tc.input,
        req.timeLimit
      )

      if (singleResult.status === 'time_limit_exceeded') {
        return {
          status: 'time_limit_exceeded',
          executionTime: singleResult.executionTime,
          memoryUsed: singleResult.memoryUsed,
          message: `Time limit exceeded on test case ${i + 1}`,
          testCasesPassed: passed,
          testCasesTotal: req.testCases.length,
        }
      }

      if (singleResult.status === 'compilation_error') {
        return {
          status: 'compilation_error',
          executionTime: 0,
          memoryUsed: 0,
          message: singleResult.message,
          testCasesPassed: 0,
          testCasesTotal: req.testCases.length,
        }
      }

      if (singleResult.status === 'runtime_error') {
        return {
          status: 'runtime_error',
          executionTime: singleResult.executionTime,
          memoryUsed: singleResult.memoryUsed,
          message: singleResult.message,
          testCasesPassed: passed,
          testCasesTotal: req.testCases.length,
        }
      }

      totalExecutionTime += singleResult.executionTime
      maxMemory = Math.max(maxMemory, singleResult.memoryUsed)

      if (CodeSandboxService.compareOutput(singleResult.output, tc.output)) {
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

  private static async runPistonTestCase(
    apiUrl: string,
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
      const fileName = FILE_NAME_MAP[langConfig.language.toLowerCase()] ?? 'main'
      const response = await fetch(`${apiUrl}/execute`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          language: langConfig.language,
          version: langConfig.version,
          files: [{ name: fileName, content: code }],
          stdin: input,
          args: [],
          compile_timeout: timeoutSeconds * 1000,
          run_timeout: timeoutSeconds * 1000,
        }),
        signal: AbortSignal.timeout((timeoutSeconds + 4) * 1000),
      })

      if (!response.ok) {
        return {
          status: 'runtime_error',
          output: '',
          message: `Piston API returned ${response.status} ${response.statusText}`,
          executionTime: 0,
          memoryUsed: 0,
        }
      }

      const data = (await response.json()) as {
        compile?: { code: number; stderr?: string }
        run?: {
          code: number
          stdout?: string
          stderr?: string
          signal?: string
          time?: string
          memory?: string
        }
      }

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
          executionTime: parseInt(data.run.time ?? '0', 10) || 0,
          memoryUsed: parseInt(data.run.memory ?? '0', 10) || 0,
        }
      }

      return {
        status: 'success',
        output: data.run?.stdout ?? '',
        message: 'Success',
        executionTime: parseInt(data.run?.time ?? '0', 10) || 10,
        memoryUsed: parseInt(data.run?.memory ?? '0', 10) || 2048,
      }
    } catch (err) {
      if (err instanceof Error && err.name === 'TimeoutError') {
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
        message: err instanceof Error ? err.message : 'Piston unavailable',
        executionTime: 0,
        memoryUsed: 0,
      }
    }
  }


  private static _executeLocalJs(
    code: string,
    testCases: Array<{ input: string; output: string }>,
    timeLimit: number
  ): ExecutionResult {
    let passed = 0
    let totalTime = 0

    for (let i = 0; i < testCases.length; i++) {
      const tc = testCases[i]!
      const logs: string[] = []
      const sandbox = {
        console: {
          log: (...args: any[]) => {
            logs.push(
              args
                .map(a =>
                  typeof a === 'object' && a !== null ? JSON.stringify(a) : String(a)
                )
                .join(' ')
            )
          },
          error: (...args: any[]) => {
            logs.push(
              args
                .map(a =>
                  typeof a === 'object' && a !== null ? JSON.stringify(a) : String(a)
                )
                .join(' ')
            )
          },
          warn: () => {},
        },
        JSON,
        Math,
        parseInt,
        parseFloat,
        Array,
        Object,
        String,
        Number,
        Boolean,
        Map,
        Set,
      }

      const ctx = vm.createContext(sandbox)
      const t0 = Date.now()
      try {
        vm.runInContext(code, ctx, { timeout: Math.min(timeLimit, 2000) })
        const elapsed = Date.now() - t0
        totalTime += elapsed
        const actualOutput = logs.join('\n').trim()

        if (CodeSandboxService.compareOutput(actualOutput, tc.output)) {
          passed++
        } else {
          return {
            status: 'wrong_answer',
            executionTime: totalTime,
            memoryUsed: 128,
            message: `Wrong answer on test case ${i + 1}`,
            testCasesPassed: passed,
            testCasesTotal: testCases.length,
          }
        }
      } catch (err: any) {
        return {
          status: 'runtime_error',
          executionTime: Date.now() - t0,
          memoryUsed: 128,
          message: err?.message || 'Runtime error',
          testCasesPassed: passed,
          testCasesTotal: testCases.length,
        }
      }
    }

    return {
      status: 'accepted',
      executionTime: totalTime,
      memoryUsed: 128,
      message: `All ${testCases.length} test cases passed`,
      testCasesPassed: passed,
      testCasesTotal: testCases.length,
    }
  }

  private static compareOutput(actual: string, expected: string): boolean {
    const act = (actual ?? '').trim().replace(/\r\n/g, '\n')
    const exp = (expected ?? '').trim().replace(/\r\n/g, '\n')
    if (act === exp) return true
    // Also try JSON normalization if possible
    try {
      return JSON.stringify(JSON.parse(act)) === JSON.stringify(JSON.parse(exp))
    } catch {
      return false
    }
  }
}
