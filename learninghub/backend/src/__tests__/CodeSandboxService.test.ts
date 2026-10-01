import { CodeSandboxService } from '../services/CodeSandboxService'

describe('CodeSandboxService', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('Language validation & unsupported languages', () => {
    it('returns compilation_error for unknown or unsupported languages', async () => {
      const result = await CodeSandboxService.execute({
        code: 'print("hello")',
        language: 'brainfuck',
        testCases: [{ input: '', output: 'hello' }],
      })

      expect(result.status).toBe('compilation_error')
      expect(result.message).toContain('Unsupported language: brainfuck')
    })
  })

  describe('Security AST and Token Screening', () => {
    it('blocks process access in local JS sandbox fallback', async () => {
      const result = await CodeSandboxService.execute({
        code: 'console.log(process.env)',
        language: 'javascript',
        testCases: [{ input: '', output: '' }],
      })

      expect(result.status).toBe('runtime_error')
      expect(result.message).toContain('Unauthorized execution tokens detected')
    })

    it('blocks child_process access in local JS sandbox fallback', async () => {
      const result = await CodeSandboxService.execute({
        code: 'const cp = child_process; console.log(cp)',
        language: 'javascript',
        testCases: [{ input: '', output: '' }],
      })

      expect(result.status).toBe('runtime_error')
      expect(result.message).toContain('Unauthorized execution tokens detected')
    })

    it('blocks require and eval tokens', async () => {
      const evalResult = await CodeSandboxService.execute({
        code: 'eval("2 + 2")',
        language: 'javascript',
        testCases: [{ input: '', output: '' }],
      })
      expect(evalResult.status).toBe('runtime_error')

      const reqResult = await CodeSandboxService.execute({
        code: 'require("fs")',
        language: 'javascript',
        testCases: [{ input: '', output: '' }],
      })
      expect(reqResult.status).toBe('runtime_error')
    })
  })

  describe('Local JavaScript execution fallback', () => {
    it('executes safe JavaScript code and reports accepted on matching output', async () => {
      const result = await CodeSandboxService.execute({
        code: 'console.log(2 + 3);',
        language: 'javascript',
        testCases: [{ input: '', output: '5' }],
      })

      expect(result.status).toBe('accepted')
      expect(result.testCasesPassed).toBe(1)
      expect(result.testCasesTotal).toBe(1)
    })

    it('detects wrong_answer when output mismatches', async () => {
      const result = await CodeSandboxService.execute({
        code: 'console.log(10);',
        language: 'javascript',
        testCases: [{ input: '', output: '20' }],
      })

      expect(result.status).toBe('wrong_answer')
      expect(result.testCasesPassed).toBe(0)
    })

    it('matches JSON formatted outputs correctly', async () => {
      const result = await CodeSandboxService.execute({
        code: 'console.log(JSON.stringify([1, 2, 3]));',
        language: 'javascript',
        testCases: [{ input: '', output: '[1, 2, 3]' }],
      })

      expect(result.status).toBe('accepted')
      expect(result.testCasesPassed).toBe(1)
    })

    it('handles runtime exceptions in user code gracefully', async () => {
      const result = await CodeSandboxService.execute({
        code: 'const a = null; a.someMethod();',
        language: 'javascript',
        testCases: [{ input: '', output: 'something' }],
      })

      expect(result.status).toBe('runtime_error')
      expect(result.testCasesPassed).toBe(0)
    })
  })
})
