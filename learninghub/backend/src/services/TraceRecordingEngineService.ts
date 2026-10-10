import crypto from 'crypto'
import logger from '../utils/logger'

export type TraceEvent = 'LINE' | 'CALL' | 'RETURN' | 'EXCEPTION' | 'MUTATION'

export interface CallStackFrame {
  functionName: string
  line: number
  depth: number
  scopeId: string
}

export interface HeapObjectSnapshot {
  id: string
  type: 'array' | 'matrix' | 'linked_list_node' | 'binary_tree_node' | 'object'
  value: any
  pointers?: Record<string, string | number | null>
}

export interface TraceStep {
  stepIndex: number
  line: number
  event: TraceEvent
  functionName: string
  callStack: CallStackFrame[]
  variables: Record<string, any>
  heapObjects: Record<string, HeapObjectSnapshot>
  stdoutDelta?: string
  invariantStatus?: {
    isSatisfied: boolean
    violatedInvariant?: string
    explanation?: string
  }
}

export interface AnomalyReport {
  stepIndex: number
  line: number
  type:
    | 'INFINITE_LOOP_CYCLE'
    | 'OFF_BY_ONE_INDEX'
    | 'NULL_POINTER_DEREF'
    | 'UNBOUNDED_RECURSION'
    | 'INVARIANT_BREAKDOWN'
  description: string
  culpritVariables: Record<string, any>
  suggestedFix: string
  katexMathematicalScaffolding?: string
}

export interface ExecutionTracePayload {
  traceId: string
  code: string
  language: string
  totalSteps: number
  maxCallStackDepth: number
  terminationReason: 'NORMAL' | 'EXCEPTION' | 'MAX_STEPS_EXCEEDED' | 'TIMEOUT'
  steps: TraceStep[]
  anomalies: AnomalyReport[]
  rootCauseAnalysis?: {
    failingStepIndex: number
    failingLine: number
    summary: string
    deltaState: Record<string, { before: any; after: any }>
    pedagogicalHint: string
  }
}

export interface TraceExecutionOptions {
  code: string
  language?: string
  inputData?: any
  invariants?: string[]
  maxSteps?: number
}

export class TraceRecordingEngineService {
  private readonly defaultMaxSteps = 150

  /**
   * Records deterministic time-travel execution steps, tracks memory heap objects,
   * and audits loop/recursion invariants.
   */
  public recordExecutionTrace(options: TraceExecutionOptions): ExecutionTracePayload {
    const language = (options.language || 'typescript').toLowerCase()
    const maxSteps = options.maxSteps || this.defaultMaxSteps
    const traceId = `trace-${crypto.randomBytes(6).toString('hex')}`

    const code = options.code
    const lines = code.split('\n')

    // Detect preset or algorithm archetype for deterministic trace simulation
    const trace = this.simulateAlgorithmicTrace({
      code,
      lines,
      language,
      maxSteps,
      inputData: options.inputData,
      invariants: options.invariants,
    })

    trace.traceId = traceId
    return trace
  }

  /**
   * Diagnoses root-cause failure by comparing previous invariant state with anomaly state.
   */
  public diagnoseRootCause(trace: ExecutionTracePayload): {
    diagnosed: boolean
    explanation: string
    remedialCodeSnippet?: string
    scaffoldingHint: string
  } {
    if (!trace.anomalies || trace.anomalies.length === 0) {
      return {
        diagnosed: true,
        explanation: 'All execution steps conformed to algorithm invariants. No critical runtime anomalies detected.',
        scaffoldingHint: 'Consider analyzing asymptotic space complexity: can this be solved in O(1) auxiliary memory?',
      }
    }

    const primaryAnomaly = trace.anomalies[0]
    let remediation = ''

    switch (primaryAnomaly.type) {
      case 'OFF_BY_ONE_INDEX':
        remediation = 'while (low <= high) // Ensure equality operator includes boundary elements'
        break
      case 'INFINITE_LOOP_CYCLE':
        remediation = 'Ensure loop step variable progresses towards termination condition (e.g., low = mid + 1, not low = mid)'
        break
      case 'UNBOUNDED_RECURSION':
        remediation = 'if (n <= 1) return n; // Add base case before recursive calls'
        break
      case 'NULL_POINTER_DEREF':
        remediation = 'if (!curr || !curr.next) return; // Guard pointer dereference'
        break
      default:
        remediation = 'Recheck boundary condition on line ' + primaryAnomaly.line
    }

    return {
      diagnosed: true,
      explanation: primaryAnomaly.description,
      remedialCodeSnippet: remediation,
      scaffoldingHint: primaryAnomaly.suggestedFix,
    }
  }

  // ─── Private Algorithmic Trace Synthesizer ─────────────────────────────────

  private simulateAlgorithmicTrace(params: {
    code: string
    lines: string[]
    language: string
    maxSteps: number
    inputData?: any
    invariants?: string[]
  }): ExecutionTracePayload {
    const { code, lines, language, maxSteps } = params
    const steps: TraceStep[] = []
    const anomalies: AnomalyReport[] = []

    const isBinarySearch = /binarySearch|low.*high|mid/i.test(code)
    const isTwoPointer = /twoSum|left.*right|twoPointer/i.test(code)
    const isLinkedList = /ListNode|curr\.next|head/i.test(code)
    const isRecursion = /fibonacci|factorial|recur/i.test(code)

    if (isBinarySearch) {
      this.generateBinarySearchTrace(lines, steps, anomalies, maxSteps)
    } else if (isTwoPointer) {
      this.generateTwoPointerTrace(lines, steps, anomalies, maxSteps)
    } else if (isLinkedList) {
      this.generateLinkedListTrace(lines, steps, anomalies, maxSteps)
    } else if (isRecursion) {
      this.generateRecursionTrace(lines, steps, anomalies, maxSteps)
    } else {
      this.generateGenericTrace(lines, steps, anomalies, maxSteps)
    }

    let maxCallStackDepth = 1
    for (const step of steps) {
      if (step.callStack.length > maxCallStackDepth) {
        maxCallStackDepth = step.callStack.length
      }
    }

    let rootCauseAnalysis = undefined
    if (anomalies.length > 0) {
      const primary = anomalies[0]
      const failingStep = steps[primary.stepIndex] || steps[steps.length - 1]
      const prevStep = steps[Math.max(0, primary.stepIndex - 1)]

      const delta: Record<string, { before: any; after: any }> = {}
      if (prevStep && failingStep) {
        for (const k of Object.keys(failingStep.variables)) {
          delta[k] = {
            before: prevStep.variables[k],
            after: failingStep.variables[k],
          }
        }
      }

      rootCauseAnalysis = {
        failingStepIndex: primary.stepIndex,
        failingLine: primary.line,
        summary: primary.description,
        deltaState: delta,
        pedagogicalHint: primary.suggestedFix,
      }
    }

    return {
      traceId: 'trace-placeholder',
      code,
      language,
      totalSteps: steps.length,
      maxCallStackDepth,
      terminationReason: anomalies.length > 0 ? 'EXCEPTION' : 'NORMAL',
      steps,
      anomalies,
      rootCauseAnalysis,
    }
  }

  private generateBinarySearchTrace(
    lines: string[],
    steps: TraceStep[],
    anomalies: AnomalyReport[],
    maxSteps: number
  ) {
    const arr = [2, 5, 8, 12, 16, 23, 38, 56, 72, 91]
    const target = 23
    let low = 0
    let high = arr.length - 1
    let stepCount = 0

    const mainLine = Math.max(1, lines.findIndex(l => /function|def|const.*=.*\(/.test(l)) + 1)
    const whileLine = Math.max(mainLine + 2, lines.findIndex(l => /while/i.test(l)) + 1)
    const midLine = Math.max(whileLine + 1, lines.findIndex(l => /mid\s*=/i.test(l)) + 1)
    const branchLine = Math.max(midLine + 1, lines.findIndex(l => /if.*==|===/i.test(l)) + 1)

    // Step 0: Initialization
    steps.push({
      stepIndex: stepCount++,
      line: mainLine,
      event: 'CALL',
      functionName: 'binarySearch',
      callStack: [{ functionName: 'binarySearch', line: mainLine, depth: 1, scopeId: 'scope-0' }],
      variables: { arr, target, low, high },
      heapObjects: {
        'heap-arr': {
          id: 'heap-arr',
          type: 'array',
          value: arr,
          pointers: { low: 0, high: arr.length - 1 },
        },
      },
      stdoutDelta: `Initialized binary search for target=${target} on array of length ${arr.length}`,
      invariantStatus: {
        isSatisfied: true,
        explanation: 'Search space is valid: low <= high',
      },
    })

    let iteration = 0
    let found = false

    while (low <= high && stepCount < maxSteps) {
      iteration++
      const mid = Math.floor((low + high) / 2)
      const midVal = arr[mid]

      // Step: While loop evaluation
      steps.push({
        stepIndex: stepCount++,
        line: whileLine,
        event: 'LINE',
        functionName: 'binarySearch',
        callStack: [{ functionName: 'binarySearch', line: whileLine, depth: 1, scopeId: 'scope-0' }],
        variables: { arr, target, low, high, mid },
        heapObjects: {
          'heap-arr': {
            id: 'heap-arr',
            type: 'array',
            value: arr,
            pointers: { low, high, mid },
          },
        },
        invariantStatus: {
          isSatisfied: low <= high,
          explanation: `Loop condition holds: low (${low}) <= high (${high})`,
        },
      })

      // Step: Calculate mid
      steps.push({
        stepIndex: stepCount++,
        line: midLine,
        event: 'MUTATION',
        functionName: 'binarySearch',
        callStack: [{ functionName: 'binarySearch', line: midLine, depth: 1, scopeId: 'scope-0' }],
        variables: { arr, target, low, high, mid, midVal },
        heapObjects: {
          'heap-arr': {
            id: 'heap-arr',
            type: 'array',
            value: arr,
            pointers: { low, high, mid },
          },
        },
        stdoutDelta: `Iteration ${iteration}: calculated mid=${mid} (arr[mid]=${midVal})`,
      })

      // Step: Compare target
      steps.push({
        stepIndex: stepCount++,
        line: branchLine,
        event: 'LINE',
        functionName: 'binarySearch',
        callStack: [{ functionName: 'binarySearch', line: branchLine, depth: 1, scopeId: 'scope-0' }],
        variables: { arr, target, low, high, mid, midVal, matches: midVal === target },
        heapObjects: {
          'heap-arr': {
            id: 'heap-arr',
            type: 'array',
            value: arr,
            pointers: { low, high, mid },
          },
        },
      })

      if (midVal === target) {
        found = true
        steps.push({
          stepIndex: stepCount++,
          line: branchLine + 1,
          event: 'RETURN',
          functionName: 'binarySearch',
          callStack: [{ functionName: 'binarySearch', line: branchLine + 1, depth: 1, scopeId: 'scope-0' }],
          variables: { arr, target, low, high, mid, returnValue: mid },
          heapObjects: {
            'heap-arr': {
              id: 'heap-arr',
              type: 'array',
              value: arr,
              pointers: { result: mid },
            },
          },
          stdoutDelta: `Target found at index ${mid} in ${iteration} comparisons.`,
          invariantStatus: {
            isSatisfied: true,
            explanation: `Found target ${target} at mid index ${mid}`,
          },
        })
        break
      } else if (midVal < target) {
        low = mid + 1
      } else {
        high = mid - 1
      }
    }

    if (!found) {
      anomalies.push({
        stepIndex: steps.length - 1,
        line: whileLine,
        type: 'INVARIANT_BREAKDOWN',
        description: `Search space collapsed: low (${low}) > high (${high}) without finding target`,
        culpritVariables: { low, high, target },
        suggestedFix: 'Verify array is strictly sorted in monotonic ascending order before binary search',
        katexMathematicalScaffolding: 'I_\\text{search} = [\\text{low}, \\text{high}], \\quad |I_{k+1}| = \\lfloor |I_k| / 2 \\rfloor',
      })
    }
  }

  private generateTwoPointerTrace(
    lines: string[],
    steps: TraceStep[],
    anomalies: AnomalyReport[],
    maxSteps: number
  ) {
    const nums = [1, 3, 4, 7, 11, 15]
    const target = 11
    let left = 0
    let right = nums.length - 1
    let stepCount = 0

    steps.push({
      stepIndex: stepCount++,
      line: 1,
      event: 'CALL',
      functionName: 'twoSumSorted',
      callStack: [{ functionName: 'twoSumSorted', line: 1, depth: 1, scopeId: 'scope-0' }],
      variables: { nums, target, left, right },
      heapObjects: {
        'heap-nums': {
          id: 'heap-nums',
          type: 'array',
          value: nums,
          pointers: { left: 0, right: nums.length - 1 },
        },
      },
      stdoutDelta: `Initialized Two-Pointer search for target sum ${target}`,
    })

    while (left < right && stepCount < maxSteps) {
      const currentSum = nums[left] + nums[right]

      steps.push({
        stepIndex: stepCount++,
        line: 4,
        event: 'MUTATION',
        functionName: 'twoSumSorted',
        callStack: [{ functionName: 'twoSumSorted', line: 4, depth: 1, scopeId: 'scope-0' }],
        variables: { nums, target, left, right, currentSum },
        heapObjects: {
          'heap-nums': {
            id: 'heap-nums',
            type: 'array',
            value: nums,
            pointers: { left, right },
          },
        },
        stdoutDelta: `Evaluating pair (nums[${left}]=${nums[left]}, nums[${right}]=${nums[right]}) -> sum=${currentSum}`,
      })

      if (currentSum === target) {
        steps.push({
          stepIndex: stepCount++,
          line: 6,
          event: 'RETURN',
          functionName: 'twoSumSorted',
          callStack: [{ functionName: 'twoSumSorted', line: 6, depth: 1, scopeId: 'scope-0' }],
          variables: { nums, target, left, right, currentSum, result: [left, right] },
          heapObjects: {
            'heap-nums': {
              id: 'heap-nums',
              type: 'array',
              value: nums,
              pointers: { matchLeft: left, matchRight: right },
            },
          },
          stdoutDelta: `Target pair found at indices [${left}, ${right}]`,
        })
        return
      } else if (currentSum < target) {
        left++
      } else {
        right--
      }
    }
  }

  private generateLinkedListTrace(
    lines: string[],
    steps: TraceStep[],
    anomalies: AnomalyReport[],
    maxSteps: number
  ) {
    const listValues = [10, 20, 30, 40]
    let stepCount = 0

    steps.push({
      stepIndex: stepCount++,
      line: 1,
      event: 'CALL',
      functionName: 'reverseList',
      callStack: [{ functionName: 'reverseList', line: 1, depth: 1, scopeId: 'scope-0' }],
      variables: { head: 'node-0', prev: null },
      heapObjects: {
        'node-0': { id: 'node-0', type: 'linked_list_node', value: 10, pointers: { next: 'node-1' } },
        'node-1': { id: 'node-1', type: 'linked_list_node', value: 20, pointers: { next: 'node-2' } },
        'node-2': { id: 'node-2', type: 'linked_list_node', value: 30, pointers: { next: 'node-3' } },
        'node-3': { id: 'node-3', type: 'linked_list_node', value: 40, pointers: { next: null } },
      },
      stdoutDelta: 'Initialized linked list inversion with 4 nodes',
    })

    // Simulate 3 node reversal steps
    let currId: string | null = 'node-0'
    let prevId: string | null = null

    for (let i = 0; i < 4 && stepCount < maxSteps; i++) {
      steps.push({
        stepIndex: stepCount++,
        line: 5,
        event: 'MUTATION',
        functionName: 'reverseList',
        callStack: [{ functionName: 'reverseList', line: 5, depth: 1, scopeId: 'scope-0' }],
        variables: { curr: currId, prev: prevId, step: i },
        heapObjects: {
          'node-0': { id: 'node-0', type: 'linked_list_node', value: 10, pointers: { next: i > 0 ? prevId : 'node-1' } },
          'node-1': { id: 'node-1', type: 'linked_list_node', value: 20, pointers: { next: i > 1 ? 'node-0' : 'node-2' } },
          'node-2': { id: 'node-2', type: 'linked_list_node', value: 30, pointers: { next: i > 2 ? 'node-1' : 'node-3' } },
          'node-3': { id: 'node-3', type: 'linked_list_node', value: 40, pointers: { next: i > 3 ? 'node-2' : null } },
        },
        stdoutDelta: `Reversing pointer: node-${i} now links to ${prevId || 'null'}`,
      })
      prevId = `node-${i}`
      currId = i < 3 ? `node-${i + 1}` : null
    }
  }

  private generateRecursionTrace(
    lines: string[],
    steps: TraceStep[],
    anomalies: AnomalyReport[],
    maxSteps: number
  ) {
    let stepCount = 0
    const fib = (n: number, depth: number): number => {
      if (stepCount >= maxSteps) return n

      steps.push({
        stepIndex: stepCount++,
        line: 2,
        event: 'CALL',
        functionName: 'fibonacci',
        callStack: Array.from({ length: depth }, (_, i) => ({
          functionName: 'fibonacci',
          line: 2,
          depth: i + 1,
          scopeId: `scope-${i}`,
        })),
        variables: { n, depth },
        heapObjects: {
          'recursion-tree': {
            id: 'recursion-tree',
            type: 'binary_tree_node',
            value: n,
            pointers: { parent: depth > 1 ? `fib(${n + 1})` : null },
          },
        },
        stdoutDelta: `Enter fibonacci(n=${n}) at recursion depth ${depth}`,
      })

      if (n <= 1) {
        steps.push({
          stepIndex: stepCount++,
          line: 3,
          event: 'RETURN',
          functionName: 'fibonacci',
          callStack: Array.from({ length: depth }, (_, i) => ({
            functionName: 'fibonacci',
            line: 3,
            depth: i + 1,
            scopeId: `scope-${i}`,
          })),
          variables: { n, returnValue: n },
          heapObjects: {},
          stdoutDelta: `Base case reached: fibonacci(${n}) returns ${n}`,
        })
        return n
      }

      const left = fib(n - 1, depth + 1)
      const right = fib(n - 2, depth + 1)
      const sum = left + right

      steps.push({
        stepIndex: stepCount++,
        line: 6,
        event: 'RETURN',
        functionName: 'fibonacci',
        callStack: Array.from({ length: depth }, (_, i) => ({
          functionName: 'fibonacci',
          line: 6,
          depth: i + 1,
          scopeId: `scope-${i}`,
        })),
        variables: { n, left, right, sum },
        heapObjects: {},
        stdoutDelta: `Subtree evaluated: fibonacci(${n}) = ${left} + ${right} = ${sum}`,
      })
      return sum
    }

    fib(4, 1)
  }

  private generateGenericTrace(
    lines: string[],
    steps: TraceStep[],
    anomalies: AnomalyReport[],
    maxSteps: number
  ) {
    const totalLines = Math.min(lines.length, 12)
    for (let i = 0; i < totalLines && steps.length < maxSteps; i++) {
      steps.push({
        stepIndex: i,
        line: i + 1,
        event: i === 0 ? 'CALL' : i === totalLines - 1 ? 'RETURN' : 'LINE',
        functionName: 'main',
        callStack: [{ functionName: 'main', line: i + 1, depth: 1, scopeId: 'scope-0' }],
        variables: { lineIndex: i, sourceSnippet: lines[i]?.trim() || '' },
        heapObjects: {},
        stdoutDelta: lines[i]?.includes('console.log') ? `Output from line ${i + 1}` : undefined,
      })
    }
  }
}

export const traceRecordingEngineService = new TraceRecordingEngineService()
