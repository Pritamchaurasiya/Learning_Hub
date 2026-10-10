import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { TopologyCanvas } from './TopologyCanvas'
import { ChaosControlPanel } from './ChaosControlPanel'
import { TelemetryMetricsHUD } from './TelemetryMetricsHUD'
import { ArchitectScorecardCard } from './ArchitectScorecardCard'
import { ArchitectureTopology, SimulationTelemetryResult } from '../../types/systemDesign'

const mockTopology: ArchitectureTopology = {
  nodes: [
    { id: 'client-1', name: 'Web Client', type: 'CLIENT', capacityQps: 50000, baseLatencyMs: 20, replicationFactor: 1, isHealthy: true, failureProb: 0 },
    { id: 'db-primary', name: 'Postgres Primary', type: 'PRIMARY_DATABASE', capacityQps: 5000, baseLatencyMs: 15, replicationFactor: 1, isHealthy: true, failureProb: 0.01 },
  ],
  edges: [
    { id: 'e1', sourceNodeId: 'client-1', targetNodeId: 'db-primary', protocol: 'TCP', latencyMs: 10, bandwidthLimitMbps: 1000 },
  ],
}

const mockTelemetry: SimulationTelemetryResult = {
  simulatedQps: 10000,
  p50LatencyMs: 24.5,
  p95LatencyMs: 45.2,
  p99LatencyMs: 92.1,
  errorRatePercentage: 1.2,
  throughputAchievedQps: 9880,
  systemStatus: 'OPTIMAL',
  saturatedNodeIds: [],
  failedNodeIds: [],
  spofNodeIds: ['db-primary'],
  activeFault: 'NONE',
  capClassification: {
    primaryModel: 'CP',
    consistencyScore: 92,
    availabilityScore: 94,
    partitionToleranceScore: 88,
    rationale: 'Strong consistency with primary read replication.',
  },
  architecturalScorecard: {
    overallGrade: 'A',
    scalabilityScore: 88,
    resilienceScore: 82,
    costEfficiencyScore: 90,
    detectedVulnerabilities: ['Single point of failure on primary DB.'],
    recommendedMitigations: ['Deploy active-passive replica.'],
  },
  socraticCritique: {
    architectPersona: 'Principal Systems Architect',
    critiqueSummary: 'Architecture performs stably under load.',
    deepAnalysisMarkdown: 'Analysis content',
    katexFormulas: ['L = \\lambda W'],
  },
  generatedAt: '2026-10-10T20:00:00Z',
}

describe('SystemDesign Components (Milestone 18)', () => {
  it('renders TopologyCanvas and handles node interactions', () => {
    const onToggle = vi.fn()
    const onIncrement = vi.fn()

    render(
      <TopologyCanvas
        topology={mockTopology}
        spofNodeIds={['db-primary']}
        failedNodeIds={[]}
        saturatedNodeIds={[]}
        onToggleNodeHealth={onToggle}
        onIncrementReplication={onIncrement}
      />
    )

    expect(screen.getByText('Postgres Primary')).toBeInTheDocument()
    expect(screen.getByText('SPOF')).toBeInTheDocument()

    const crashButton = screen.getAllByRole('button', { name: /Simulate Crash/i })[0]
    fireEvent.click(crashButton)
    expect(onToggle).toHaveBeenCalledWith('client-1')
  })

  it('renders ChaosControlPanel and triggers simulation', () => {
    const onRun = vi.fn()
    const onSelectFault = vi.fn()

    render(
      <ChaosControlPanel
        selectedPreset="URL_SHORTENER_TINYURL"
        onSelectPreset={vi.fn()}
        currentQps={20000}
        onChangeQps={vi.fn()}
        activeFault="NONE"
        onSelectFault={onSelectFault}
        isSimulating={false}
        onRunSimulation={onRun}
        onResetNominal={vi.fn()}
      />
    )

    expect(screen.getByText('TinyURL / Bitly')).toBeInTheDocument()
    expect(screen.getByText('20,000 QPS')).toBeInTheDocument()

    const runBtn = screen.getByRole('button', { name: /Execute Discrete-Event Simulation/i })
    fireEvent.click(runBtn)
    expect(onRun).toHaveBeenCalled()
  })

  it('renders TelemetryMetricsHUD with latency and throughput', () => {
    render(<TelemetryMetricsHUD telemetry={mockTelemetry} />)

    expect(screen.getByText('92.1')).toBeInTheDocument() // P99 ms
    expect(screen.getByText('1.2%')).toBeInTheDocument() // error rate
    expect(screen.getByText('CP Profile')).toBeInTheDocument()
    expect(screen.getByText('System SLA Nominal')).toBeInTheDocument()
  })

  it('renders ArchitectScorecardCard with Grade, vulnerabilities and formulas', () => {
    render(
      <ArchitectScorecardCard
        scorecard={mockTelemetry.architecturalScorecard}
        socraticCritique={mockTelemetry.socraticCritique}
        spofNodeIds={['db-primary']}
      />
    )

    expect(screen.getByText('Grade A')).toBeInTheDocument()
    expect(screen.getByText('Single point of failure on primary DB.')).toBeInTheDocument()
    expect(screen.getByText('Deploy active-passive replica.')).toBeInTheDocument()
    expect(screen.getByText('$$ L = \\lambda W $$')).toBeInTheDocument()
  })
})
