import { describe, it, expect } from 'vitest'
import { debuggerService } from './debuggerService'

describe('debuggerService', () => {
  it('should return a valid execution trace with steps and callstack', async () => {
    const trace = await debuggerService.recordTrace({
      code: 'function binarySearch(arr, target) { let low = 0; let high = 9; }',
      language: 'javascript',
    })

    expect(trace).toBeDefined()
    expect(trace.totalSteps).toBeGreaterThanOrEqual(2)
    expect(trace.steps.length).toBe(trace.totalSteps)
    expect(trace.steps[0].callStack.length).toBeGreaterThanOrEqual(1)
  })

  it('should diagnose trace and return explanation', async () => {
    const trace = await debuggerService.recordTrace({
      code: 'function test() {}',
      language: 'javascript',
    })

    const diagnosis = await debuggerService.diagnoseTrace(trace)
    expect(diagnosis.diagnosed).toBe(true)
    expect(diagnosis.explanation.length).toBeGreaterThan(10)
    expect(diagnosis.scaffoldingHint).toBeDefined()
  })
})
