import { ComplexityProfilerService } from '../../services/ComplexityProfilerService'

describe('ComplexityProfilerService (Milestone 17)', () => {
  let service: ComplexityProfilerService

  beforeEach(() => {
    service = new ComplexityProfilerService()
  })

  it('correctly classifies O(N^2) quadratic algorithm preset', () => {
    const result = service.benchmarkAlgorithm({
      algorithmName: 'Bubble Sort',
      codeSnippet: 'for (let i = 0; i < n; i++) for (let j = 0; j < n; j++) {}',
      presetAlgorithm: 'BUBBLE_SORT',
    })

    expect(result.classifiedClass).toBe('O(N^2)')
    expect(result.confidenceScore).toBeGreaterThanOrEqual(80)
    expect(result.primaryModel.rSquared).toBeGreaterThanOrEqual(0.85)
    expect(result.empiricalData.length).toBeGreaterThanOrEqual(4)
    expect(result.asymptoticProjections.length).toBe(4)
    expect(result.bottleneckAnalysis.katexFormalProof).toContain('N^2')
  })

  it('correctly classifies O(N log N) algorithm preset', () => {
    const result = service.benchmarkAlgorithm({
      algorithmName: 'Merge Sort',
      codeSnippet: 'function mergeSort(arr) { ... }',
      presetAlgorithm: 'MERGE_SORT',
    })

    expect(result.classifiedClass).toBe('O(N log N)')
    expect(result.confidenceScore).toBeGreaterThanOrEqual(80)
    expect(result.bottleneckAnalysis.primaryLimiter).toBe('MEMORY_BANDWIDTH')
  })

  it('correctly classifies O(log N) algorithm preset', () => {
    const result = service.benchmarkAlgorithm({
      algorithmName: 'Binary Search',
      codeSnippet: 'function binarySearch(arr, target) { ... }',
      presetAlgorithm: 'BINARY_SEARCH',
    })

    expect(result.classifiedClass).toBe('O(log N)')
    expect(result.confidenceScore).toBeGreaterThanOrEqual(80)
    expect(result.bottleneckAnalysis.katexFormalProof).toContain('\\log N')
  })

  it('calculates realistic asymptotic projections and feasibility verdicts', () => {
    const result = service.benchmarkAlgorithm({
      algorithmName: 'Linear Search',
      codeSnippet: 'for (let i = 0; i < n; i++) if (arr[i] === target) return i;',
      presetAlgorithm: 'LINEAR_SEARCH',
    })

    expect(result.classifiedClass).toBe('O(N)')
    const millionProj = result.asymptoticProjections.find(p => p.targetN === 1000000)
    expect(millionProj).toBeDefined()
    expect(millionProj?.projectedTimeMs).toBeGreaterThan(0)
    expect(['ACCEPTABLE', 'DEGRADED_SLA', 'TIMEOUT_RISK', 'INSTANT']).toContain(millionProj?.feasibilityVerdict)
  })

  it('generates non-linear least-squares fits across 6 theoretical Big-O models', () => {
    const data = [
      { n: 10, executionTimeMicros: 10, memoryAllocatedBytes: 100, iterationsMeasured: 1, standardDeviationMicros: 0.1 },
      { n: 20, executionTimeMicros: 40, memoryAllocatedBytes: 200, iterationsMeasured: 1, standardDeviationMicros: 0.2 },
      { n: 30, executionTimeMicros: 90, memoryAllocatedBytes: 300, iterationsMeasured: 1, standardDeviationMicros: 0.3 },
      { n: 40, executionTimeMicros: 160, memoryAllocatedBytes: 400, iterationsMeasured: 1, standardDeviationMicros: 0.4 },
    ]

    const fits = service.fitRegressionModels(data)
    expect(fits.length).toBe(6)
    const oN2 = fits.find(f => f.complexityClass === 'O(N^2)')
    expect(oN2).toBeDefined()
    expect(oN2!.rSquared).toBeGreaterThan(0.95)
  })
})
