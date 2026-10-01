export type ExecutionMode = 'wasm' | 'cloud'

export interface WasmTestCase {
  input: string
  output: string
  explanation?: string
}

export type WasmStatus = 'AC' | 'WA' | 'TLE' | 'RE' | 'CE' | 'UNSUPPORTED'

export interface WasmTestCaseResult {
  testCaseIndex: number
  input: string
  expectedOutput: string
  actualOutput: string
  status: 'AC' | 'WA' | 'TLE' | 'RE'
  passed: boolean
  executionTimeMs: number
  memoryKb: number
  logs: string[]
  error?: string
}

export interface WasmExecutionResult {
  status: WasmStatus
  engine: string
  executionMode: ExecutionMode
  overallPassed: boolean
  passedTests: number
  totalTests: number
  totalExecutionTimeMs: number
  peakMemoryKb: number
  testResults: WasmTestCaseResult[]
  rawLogs: string[]
  feedback: string
}

export interface WasmExecutionOptions {
  timeoutMs?: number
  customInput?: string
  testCases?: WasmTestCase[]
}
