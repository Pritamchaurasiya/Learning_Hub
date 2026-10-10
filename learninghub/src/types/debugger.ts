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

export interface TraceExecutionRequest {
  code: string
  language?: string
  inputData?: any
  invariants?: string[]
  maxSteps?: number
}
