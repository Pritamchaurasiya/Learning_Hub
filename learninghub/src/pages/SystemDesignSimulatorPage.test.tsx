import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor, fireEvent } from '@testing-library/react'
import { BrowserRouter } from 'react-router-dom'
import { SystemDesignSimulatorPage } from './SystemDesignSimulatorPage'
import { systemDesignService } from '../services/systemDesignService'

vi.mock('../services/systemDesignService', () => ({
  systemDesignService: {
    getPreset: vi.fn(),
    simulateArchitecture: vi.fn(),
  },
}))

const mockPresetData = {
  presetId: 'URL_SHORTENER_TINYURL' as const,
  topology: {
    nodes: [
      { id: 'client-1', name: 'Web Client', type: 'CLIENT' as const, capacityQps: 50000, baseLatencyMs: 20, replicationFactor: 1, isHealthy: true, failureProb: 0 },
      { id: 'db-primary', name: 'Postgres Primary', type: 'PRIMARY_DATABASE' as const, capacityQps: 5000, baseLatencyMs: 15, replicationFactor: 1, isHealthy: true, failureProb: 0.01 },
    ],
    edges: [
      { id: 'e1', sourceNodeId: 'client-1', targetNodeId: 'db-primary', protocol: 'TCP' as const, latencyMs: 10, bandwidthLimitMbps: 1000 },
    ],
  },
  spofNodeIds: ['db-primary'],
}

const mockSimData = {
  simulatedQps: 25000,
  p50LatencyMs: 18.2,
  p95LatencyMs: 35.6,
  p99LatencyMs: 82.4,
  errorRatePercentage: 0.5,
  throughputAchievedQps: 24875,
  systemStatus: 'OPTIMAL' as const,
  saturatedNodeIds: [],
  failedNodeIds: [],
  spofNodeIds: ['db-primary'],
  activeFault: 'NONE' as const,
  capClassification: {
    primaryModel: 'CP' as const,
    consistencyScore: 92,
    availabilityScore: 95,
    partitionToleranceScore: 85,
    rationale: 'CP consistency invariant.',
  },
  architecturalScorecard: {
    overallGrade: 'A+' as const,
    scalabilityScore: 94,
    resilienceScore: 88,
    costEfficiencyScore: 90,
    detectedVulnerabilities: [],
    recommendedMitigations: [],
  },
  socraticCritique: {
    architectPersona: 'Principal Systems Architect',
    critiqueSummary: 'System is resilient under nominal load.',
    deepAnalysisMarkdown: 'Critique analysis.',
    katexFormulas: ['L = \\lambda W'],
  },
  generatedAt: '2026-10-10T20:00:00Z',
}

describe('SystemDesignSimulatorPage (Milestone 18)', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(systemDesignService.getPreset).mockResolvedValue(mockPresetData)
    vi.mocked(systemDesignService.simulateArchitecture).mockResolvedValue(mockSimData)
  })

  it('renders page header, title, and initial architecture canvas', async () => {
    render(
      <BrowserRouter>
        <SystemDesignSimulatorPage />
      </BrowserRouter>
    )

    await waitFor(() => {
      expect(screen.getByText(/Distributed System Design & Chaos Engineering Simulator/i)).toBeInTheDocument()
    })

    expect(screen.getByText('Milestone 18')).toBeInTheDocument()
    expect(screen.getByText('Postgres Primary')).toBeInTheDocument()
    expect(screen.getByText('TinyURL / Bitly')).toBeInTheDocument()
  })

  it('switches architecture preset and recalibrates simulation', async () => {
    render(
      <BrowserRouter>
        <SystemDesignSimulatorPage />
      </BrowserRouter>
    )

    await waitFor(() => {
      expect(screen.getByText('TinyURL / Bitly')).toBeInTheDocument()
    })

    const chatPresetBtn = screen.getByText('Global Chat (WhatsApp)')
    fireEvent.click(chatPresetBtn)

    await waitFor(() => {
      expect(systemDesignService.getPreset).toHaveBeenCalledWith('GLOBAL_CHAT_MESSENGER')
    })
  })

  it('renders telemetry metrics and scorecard cards', async () => {
    render(
      <BrowserRouter>
        <SystemDesignSimulatorPage />
      </BrowserRouter>
    )

    await waitFor(() => {
      expect(screen.getByText('Grade A+')).toBeInTheDocument()
      expect(screen.getByText('CP Profile')).toBeInTheDocument()
      expect(screen.getByText('82.4')).toBeInTheDocument() // P99 ms
    })
  })
})
