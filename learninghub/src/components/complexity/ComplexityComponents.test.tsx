import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { AsymptoticGrowthChart } from './AsymptoticGrowthChart'
import { AsymptoticProjectionTable } from './AsymptoticProjectionTable'
import { BottleneckAnalysisCard } from './BottleneckAnalysisCard'
import { ProfilerResultPayload } from '../../types/complexity'

const mockPayload: ProfilerResultPayload = {
  benchmarkId: 'bm-test-123',
  algorithmName: 'Merge Sort Benchmark',
  codeSnippet: 'function mergeSort(arr) {}',
  classifiedClass: 'O(N log N)',
  confidenceScore: 95,
  empiricalData: [
    { n: 100, executionTimeMicros: 34.5, memoryAllocatedBytes: 65536, iterationsMeasured: 20, standardDeviationMicros: 1.2 },
    { n: 500, executionTimeMicros: 210.0, memoryAllocatedBytes: 73728, iterationsMeasured: 20, standardDeviationMicros: 6.8 },
    { n: 1000, executionTimeMicros: 480.2, memoryAllocatedBytes: 81920, iterationsMeasured: 20, standardDeviationMicros: 14.1 },
    { n: 5000, executionTimeMicros: 2890.5, memoryAllocatedBytes: 147456, iterationsMeasured: 20, standardDeviationMicros: 85.3 },
  ],
  fittedModels: [
    {
      complexityClass: 'O(N log N)',
      formula: 't(N) = 0.045 * (N * ln(N)) + 5.0',
      rSquared: 0.985,
      residualSumOfSquares: 42.1,
      coefficients: { a: 0.045, b: 5.0 },
    },
    {
      complexityClass: 'O(N^2)',
      formula: 't(N) = 0.001 * N^2 + 10.0',
      rSquared: 0.74,
      residualSumOfSquares: 310.2,
      coefficients: { a: 0.001, b: 10.0 },
    },
  ],
  primaryModel: {
    complexityClass: 'O(N log N)',
    formula: 't(N) = 0.045 * (N * ln(N)) + 5.0',
    rSquared: 0.985,
    residualSumOfSquares: 42.1,
    coefficients: { a: 0.045, b: 5.0 },
  },
  asymptoticProjections: [
    { targetN: 1000, projectedTimeMs: 0.48, projectedMemoryMb: 0.03, feasibilityVerdict: 'INSTANT' },
    { targetN: 10000, projectedTimeMs: 5.2, projectedMemoryMb: 0.31, feasibilityVerdict: 'INSTANT' },
    { targetN: 100000, projectedTimeMs: 62.1, projectedMemoryMb: 3.05, feasibilityVerdict: 'ACCEPTABLE' },
    { targetN: 1000000, projectedTimeMs: 720.0, projectedMemoryMb: 30.52, feasibilityVerdict: 'DEGRADED_SLA' },
  ],
  bottleneckAnalysis: {
    primaryLimiter: 'MEMORY_BANDWIDTH',
    detectedAnomalies: ['Optimal comparison-based bounding model achieved.'],
    actionableSuggestions: ['Inspect auxiliary array allocations to ensure recursion does not incur GC pressure.'],
    katexFormalProof: 'T(N) = 2 \\cdot T(N/2) + O(N) = \\Theta(N \\log N)',
  },
  generatedAt: '2026-10-09T22:00:00.000Z',
}

describe('Complexity UI Components (Milestone 17)', () => {
  it('renders AsymptoticGrowthChart with empirical data and classified badge', () => {
    render(
      <AsymptoticGrowthChart
        empiricalData={mockPayload.empiricalData}
        primaryModel={mockPayload.primaryModel}
        fittedModels={mockPayload.fittedModels}
        classifiedClass={mockPayload.classifiedClass}
      />
    )

    expect(screen.getByText(/Empirical Asymptotic Growth Curve/i)).toBeInTheDocument()
    expect(screen.getByText(/Classified: O\(N log N\)/i)).toBeInTheDocument()
    expect(screen.getByText(/Compare All Big-O Models/i)).toBeInTheDocument()
  })

  it('renders AsymptoticProjectionTable with multi-scale N rows and verdicts', () => {
    render(
      <AsymptoticProjectionTable
        projections={mockPayload.asymptoticProjections}
        primaryModel={mockPayload.primaryModel}
      />
    )

    expect(screen.getByText(/Asymptotic Scalability Projections/i)).toBeInTheDocument()
    expect(screen.getByText('1,000,000')).toBeInTheDocument()
    expect(screen.getByText(/Acceptable/i)).toBeInTheDocument()
    expect(screen.getByText(/Degraded SLA/i)).toBeInTheDocument()
  })

  it('renders BottleneckAnalysisCard with limiter badge, proof and suggestions', () => {
    render(
      <BottleneckAnalysisCard
        bottleneckAnalysis={mockPayload.bottleneckAnalysis}
        classifiedClass={mockPayload.classifiedClass}
        confidenceScore={mockPayload.confidenceScore}
      />
    )

    expect(screen.getByText(/Asymptotic Bottleneck & Proof Diagnostics/i)).toBeInTheDocument()
    expect(screen.getByText(/Memory Bus \/ Bandwidth Bound/i)).toBeInTheDocument()
    expect(screen.getByText('95%')).toBeInTheDocument()
    expect(screen.getByText(/Optimal comparison-based bounding model achieved/i)).toBeInTheDocument()
  })
})
