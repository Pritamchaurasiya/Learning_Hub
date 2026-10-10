import { traceRecordingEngineService } from '../../services/TraceRecordingEngineService'

describe('TraceRecordingEngineService (Milestone 16 Time-Travel Debugger)', () => {
  it('should record deterministic execution trace for Binary Search with heap pointers', () => {
    const code = `
function binarySearch(arr, target) {
  let low = 0
  let high = arr.length - 1
  while (low <= high) {
    let mid = Math.floor((low + high) / 2)
    if (arr[mid] === target) return mid
    else if (arr[mid] < target) low = mid + 1
    else high = mid - 1
  }
  return -1
}
`
    const trace = traceRecordingEngineService.recordExecutionTrace({
      code,
      language: 'javascript',
    })

    expect(trace.traceId).toMatch(/^trace-/)
    expect(trace.totalSteps).toBeGreaterThanOrEqual(4)
    expect(trace.steps.length).toBe(trace.totalSteps)

    const firstStep = trace.steps[0]
    expect(firstStep.event).toBe('CALL')
    expect(firstStep.functionName).toBe('binarySearch')
    expect(firstStep.variables.low).toBe(0)
    expect(firstStep.variables.target).toBe(23)
    expect(firstStep.heapObjects['heap-arr']).toBeDefined()
    expect(firstStep.heapObjects['heap-arr'].pointers?.low).toBe(0)

    const returnStep = trace.steps.find(s => s.event === 'RETURN')
    expect(returnStep).toBeDefined()
    expect(returnStep?.variables.returnValue).toBe(5)
  })

  it('should record execution trace for Two-Pointer algorithm', () => {
    const code = `
function twoSumSorted(nums, target) {
  let left = 0, right = nums.length - 1
  while (left < right) {
    const sum = nums[left] + nums[right]
    if (sum === target) return [left, right]
    else if (sum < target) left++
    else right--
  }
}
`
    const trace = traceRecordingEngineService.recordExecutionTrace({
      code,
      language: 'typescript',
    })

    expect(trace.totalSteps).toBeGreaterThanOrEqual(2)
    const returnStep = trace.steps.find(s => s.event === 'RETURN')
    expect(returnStep).toBeDefined()
    expect(returnStep?.variables.result).toEqual([2, 3])
  })

  it('should record pointer mutation steps for Linked List Reversal', () => {
    const code = `
function reverseList(head) {
  let prev = null, curr = head
  while (curr) {
    let next = curr.next
    curr.next = prev
    prev = curr
    curr = next
  }
  return prev
}
`
    const trace = traceRecordingEngineService.recordExecutionTrace({
      code,
      language: 'javascript',
    })

    expect(trace.totalSteps).toBeGreaterThanOrEqual(4)
    const mutationStep = trace.steps.find(s => s.event === 'MUTATION')
    expect(mutationStep).toBeDefined()
    expect(mutationStep?.heapObjects['node-0']).toBeDefined()
  })

  it('should track call stack frame depth for recursive functions', () => {
    const code = `
function fibonacci(n) {
  if (n <= 1) return n
  return fibonacci(n - 1) + fibonacci(n - 2)
}
`
    const trace = traceRecordingEngineService.recordExecutionTrace({
      code,
      language: 'javascript',
    })

    expect(trace.maxCallStackDepth).toBeGreaterThanOrEqual(2)
    expect(trace.steps.some(s => s.callStack.length >= 2)).toBe(true)
  })

  it('should diagnose root-cause anomaly and provide remedial hints', () => {
    const traceWithAnomaly = {
      traceId: 'trace-anomaly',
      code: 'while (low < high) {}',
      language: 'javascript',
      totalSteps: 10,
      maxCallStackDepth: 1,
      terminationReason: 'EXCEPTION' as const,
      steps: [],
      anomalies: [
        {
          stepIndex: 8,
          line: 4,
          type: 'OFF_BY_ONE_INDEX' as const,
          description: 'Loop terminated prematurely due to strict inequality',
          culpritVariables: { low: 5, high: 5 },
          suggestedFix: 'Change while (low < high) to while (low <= high)',
        },
      ],
    }

    const diagnosis = traceRecordingEngineService.diagnoseRootCause(traceWithAnomaly)
    expect(diagnosis.diagnosed).toBe(true)
    expect(diagnosis.remedialCodeSnippet).toContain('while (low <= high)')
    expect(diagnosis.scaffoldingHint).toContain('while (low <= high)')
  })
})
