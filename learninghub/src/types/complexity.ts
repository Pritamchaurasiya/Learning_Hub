export type ComplexityClass =
  | 'O(1)'
  | 'O(log N)'
  | 'O(N)'
  | 'O(N log N)'
  | 'O(N^2)'
  | 'O(2^N)'
  | 'UNKNOWN'

export interface EmpiricalDataPoint {
  n: number
  executionTimeMicros: number
  memoryAllocatedBytes: number
  iterationsMeasured: number
  standardDeviationMicros: number
}

export interface ModelFitResult {
  complexityClass: ComplexityClass
  formula: string
  rSquared: number
  residualSumOfSquares: number
  coefficients: {
    a: number
    b: number
    c?: number
  }
}

export interface AsymptoticProjection {
  targetN: number
  projectedTimeMs: number
  projectedMemoryMb: number
  feasibilityVerdict: 'INSTANT' | 'ACCEPTABLE' | 'DEGRADED_SLA' | 'TIMEOUT_RISK' | 'CRITICAL_FAILURE'
}

export interface ProfilerResultPayload {
  benchmarkId: string
  algorithmName: string
  codeSnippet: string
  classifiedClass: ComplexityClass
  confidenceScore: number
  empiricalData: EmpiricalDataPoint[]
  fittedModels: ModelFitResult[]
  primaryModel: ModelFitResult
  asymptoticProjections: AsymptoticProjection[]
  bottleneckAnalysis: {
    primaryLimiter: 'CPU_COMPUTATIONAL' | 'MEMORY_BANDWIDTH' | 'ALLOCATION_OVERHEAD' | 'CACHE_MISSES'
    detectedAnomalies: string[]
    actionableSuggestions: string[]
    katexFormalProof: string
  }
  generatedAt: string
}

export interface BenchmarkRequestParams {
  algorithmName: string
  codeSnippet?: string
  inputSizes?: number[]
  presetAlgorithm?: 'BUBBLE_SORT' | 'MERGE_SORT' | 'BINARY_SEARCH' | 'LINEAR_SEARCH' | 'FIBONACCI_RECURSIVE' | 'HASHMAP_LOOKUP'
}

export interface AlgorithmPreset {
  id: string
  name: string
  complexity: string
  code: string
}
