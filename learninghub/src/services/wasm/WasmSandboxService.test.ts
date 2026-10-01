import { describe, it, expect } from 'vitest'
import { wasmSandboxService } from './WasmSandboxService'

describe('WasmSandboxService', () => {
  it('supports javascript, typescript, and python', () => {
    expect(wasmSandboxService.supportsWasm('javascript')).toBe(true)
    expect(wasmSandboxService.supportsWasm('typescript')).toBe(true)
    expect(wasmSandboxService.supportsWasm('python')).toBe(true)
    expect(wasmSandboxService.supportsWasm('cpp')).toBe(false)
    expect(wasmSandboxService.supportsWasm('java')).toBe(false)
  })

  it('provides correct engine labels', () => {
    expect(wasmSandboxService.getEngineLabel('javascript')).toContain('WASM')
    expect(wasmSandboxService.getEngineLabel('python')).toContain('Pyodide')
    expect(wasmSandboxService.getEngineLabel('rust')).toContain('Cloud')
  })

  it('normalizes outputs properly (arrays, json, booleans)', () => {
    expect(wasmSandboxService.normalizeOutput('[0, 1]')).toBe('[0,1]')
    expect(wasmSandboxService.normalizeOutput('True')).toBe('true')
    expect(wasmSandboxService.normalizeOutput('  hello world  ')).toBe('hello world')
    expect(wasmSandboxService.compareOutputs('[0, 1]', '[0,1]')).toBe(true)
    expect(wasmSandboxService.compareOutputs('true', 'True')).toBe(true)
  })

  it('executes JavaScript code and verifies matching test cases', async () => {
    const code = `
      function solve(nums, target) {
        const map = new Map();
        for (let i = 0; i < nums.length; i++) {
          const complement = target - nums[i];
          if (map.has(complement)) {
            return [map.get(complement), i];
          }
          map.set(nums[i], i);
        }
        return [];
      }
    `
    const testCases = [
      { input: 'nums = [2,7,11,15], target = 9', output: '[0,1]' },
      { input: 'nums = [3,2,4], target = 6', output: '[1,2]' },
    ]

    const result = await wasmSandboxService.execute('javascript', code, { testCases })

    expect(result.status).toBe('AC')
    expect(result.overallPassed).toBe(true)
    expect(result.passedTests).toBe(2)
    expect(result.totalTests).toBe(2)
    expect(result.testResults[0]?.status).toBe('AC')
    expect(result.testResults[0]?.passed).toBe(true)
    expect(result.totalExecutionTimeMs).toBeGreaterThanOrEqual(0)
  })

  it('flags Wrong Answer (WA) when code produces different output', async () => {
    const code = `
      function solve(nums, target) {
        return [99, 99];
      }
    `
    const testCases = [
      { input: 'nums = [2,7,11,15], target = 9', output: '[0,1]' },
    ]

    const result = await wasmSandboxService.execute('javascript', code, { testCases })

    expect(result.status).toBe('WA')
    expect(result.overallPassed).toBe(false)
    expect(result.passedTests).toBe(0)
    expect(result.testResults[0]?.actualOutput).toBe('[99,99]')
  })

  it('handles syntax and runtime errors gracefully (RE)', async () => {
    const code = `
      function solve() {
        const obj = null;
        return obj.nonExistentMethod();
      }
    `
    const testCases = [{ input: '', output: 'something' }]

    const result = await wasmSandboxService.execute('javascript', code, { testCases })

    expect(result.status).toBe('RE')
    expect(result.overallPassed).toBe(false)
    expect(result.testResults[0]?.error).toBeDefined()
  })

  it('enforces air-gapped security by neutralizing window, fetch, and localStorage', async () => {
    const code = `
      function solve() {
        if (typeof window !== 'undefined' && window !== null && window.document) {
          throw new Error('Window accessed');
        }
        if (typeof fetch !== 'undefined' && fetch) {
          throw new Error('Fetch accessed');
        }
        if (typeof localStorage !== 'undefined' && localStorage) {
          throw new Error('LocalStorage accessed');
        }
        return [0, 1];
      }
    `
    const testCases = [{ input: '', output: '[0,1]' }]

    const result = await wasmSandboxService.execute('javascript', code, { testCases })
    expect(result.status).toBe('AC')
    expect(result.overallPassed).toBe(true)
  })

  it('executes custom testcase input', async () => {
    const code = `
      function solve(nums, target) {
        return nums.length;
      }
    `
    const result = await wasmSandboxService.execute('javascript', code, {
      customInput: 'nums = [1, 2, 3, 4, 5], target = 10',
    })

    expect(result.status).toBe('AC')
    expect(result.testResults[0]?.actualOutput).toBe('5')
  })

  it('handles Python WASM execution correctly', async () => {
    const code = `
class Solution:
    def twoSum(self, nums, target):
        return [0, 1]
    `
    const testCases = [
      { input: 'nums = [2,7,11,15], target = 9', output: '[0,1]' },
    ]

    const result = await wasmSandboxService.execute('python', code, { testCases })

    expect(result.status).toBe('AC')
    expect(result.overallPassed).toBe(true)
    expect(result.engine).toContain('Pyodide')
  })

  it('returns UNSUPPORTED for languages requiring cloud compilation', async () => {
    const result = await wasmSandboxService.execute('cpp', '#include <iostream>', {})
    expect(result.status).toBe('UNSUPPORTED')
    expect(result.executionMode).toBe('cloud')
    expect(result.engine).toContain('Cloud')
  })
})
