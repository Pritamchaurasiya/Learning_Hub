import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { ComplexityProfilerPage } from './ComplexityProfilerPage'
import { complexityService } from '../services/complexityService'

vi.mock('../services/complexityService', () => ({
  complexityService: {
    getPresets: vi.fn(),
    benchmarkAlgorithm: vi.fn(),
  },
}))

describe('ComplexityProfilerPage (Milestone 17)', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(complexityService.getPresets).mockResolvedValue([
      { id: 'MERGE_SORT', name: 'Merge Sort', complexity: 'O(N log N)', code: '...' },
      { id: 'BINARY_SEARCH', name: 'Binary Search', complexity: 'O(log N)', code: '...' },
    ])
    vi.mocked(complexityService.benchmarkAlgorithm).mockResolvedValue({
      benchmarkId: 'bm-mock-123',
      algorithmName: 'Merge Sort',
      codeSnippet: '...',
      classifiedClass: 'O(N log N)',
      confidenceScore: 98,
      empiricalData: [
        { n: 100, executionTimeMicros: 34.5, memoryAllocatedBytes: 65536, iterationsMeasured: 20, standardDeviationMicros: 1.2 },
      ],
      fittedModels: [
        {
          complexityClass: 'O(N log N)',
          formula: 't(N) = a * N ln(N) + b',
          rSquared: 0.99,
          residualSumOfSquares: 12.0,
          coefficients: { a: 0.045, b: 5.0 },
        },
      ],
      primaryModel: {
        complexityClass: 'O(N log N)',
        formula: 't(N) = a * N ln(N) + b',
        rSquared: 0.99,
        residualSumOfSquares: 12.0,
        coefficients: { a: 0.045, b: 5.0 },
      },
      asymptoticProjections: [
        { targetN: 1000, projectedTimeMs: 0.45, projectedMemoryMb: 0.03, feasibilityVerdict: 'INSTANT' },
        { targetN: 10000, projectedTimeMs: 4.5, projectedMemoryMb: 0.31, feasibilityVerdict: 'INSTANT' },
        { targetN: 100000, projectedTimeMs: 50.0, projectedMemoryMb: 3.05, feasibilityVerdict: 'ACCEPTABLE' },
        { targetN: 1000000, projectedTimeMs: 600.0, projectedMemoryMb: 30.52, feasibilityVerdict: 'DEGRADED_SLA' },
      ],
      bottleneckAnalysis: {
        primaryLimiter: 'MEMORY_BANDWIDTH',
        detectedAnomalies: ['Optimal comparison-based bounding model achieved.'],
        actionableSuggestions: ['Inspect recursion depth'],
        katexFormalProof: 'T(N) = \\Theta(N \\log N)',
      },
      generatedAt: '2026-10-09T22:00:00.000Z',
    })
  })

  it('renders page header, title, and algorithm preset chips', async () => {
    render(
      <MemoryRouter>
        <ComplexityProfilerPage />
      </MemoryRouter>
    )

    expect(screen.getByText(/Asymptotic Complexity Profiler/i)).toBeInTheDocument()
    expect(screen.getByText(/Milestone 17/i)).toBeInTheDocument()
    await waitFor(() => {
      expect(screen.getByText('Merge Sort (Divide & Conquer)')).toBeInTheDocument()
    })
  })

  it('displays classified Big-O complexity and goodness-of-fit telemetry HUD', async () => {
    render(
      <MemoryRouter>
        <ComplexityProfilerPage />
      </MemoryRouter>
    )

    await waitFor(() => {
      expect(screen.getByText('O(N log N)')).toBeInTheDocument()
      expect(screen.getByText('0.990')).toBeInTheDocument()
    })
  })

  it('allows switching between tabs (Scalability Projections, Bottlenecks, Raw Data)', async () => {
    render(
      <MemoryRouter>
        <ComplexityProfilerPage />
      </MemoryRouter>
    )

    await waitFor(() => {
      expect(screen.getByText(/Scalability Projections/i)).toBeInTheDocument()
    })

    const projTab = screen.getByText(/Scalability Projections/i)
    fireEvent.click(projTab)

    expect(screen.getByText(/Asymptotic Scalability Projections/i)).toBeInTheDocument()
  })
})
