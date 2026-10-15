import { render, screen, fireEvent } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import { SpanWaterfallTimeline } from './SpanWaterfallTimeline'
import { ServiceDependencyGraph } from './ServiceDependencyGraph'
import { CriticalPathAnalyzerCard } from './CriticalPathAnalyzerCard'
import { TraceChaosControlPanel } from './TraceChaosControlPanel'
import { W3cTraceContextInspector } from './W3cTraceContextInspector'
import { distributedTracingService } from '../../services/distributedTracingService'

describe('Tracing Components (Milestone 37)', () => {
  const mockTraces = distributedTracingService.getMockTraces()
  const activeTrace = mockTraces[0]

  it('SpanWaterfallTimeline renders spans and timeline metrics', () => {
    render(<SpanWaterfallTimeline trace={activeTrace} />)

    expect(
      screen.getByText('Distributed Span Waterfall & Gantt Timeline')
    ).toBeInTheDocument()
    expect(screen.getByText('HTTP POST /api/v1/CourseEnrollmentFlow')).toBeInTheDocument()
    expect(screen.getByText('AuthService:ValidateToken')).toBeInTheDocument()

    // Clicking a span reveals the details panel
    const rootSpanRow = screen.getByText('HTTP POST /api/v1/CourseEnrollmentFlow')
    fireEvent.click(rootSpanRow)
    expect(screen.getByText('Span Details & Telemetry Attributes')).toBeInTheDocument()
    expect(screen.getByText('http.method')).toBeInTheDocument()
  })

  it('ServiceDependencyGraph renders nodes and RPC link propagation', () => {
    const handleSelectService = vi.fn()
    render(
      <ServiceDependencyGraph
        trace={activeTrace}
        onSelectService={handleSelectService}
      />
    )

    expect(
      screen.getByText('Microservice Dependency DAG & Call Topology')
    ).toBeInTheDocument()
    const gatewayElements = screen.getAllByText('api-gateway')
    expect(gatewayElements.length).toBeGreaterThan(0)
    expect(screen.getAllByText('auth-service').length).toBeGreaterThan(0)

    // Clicking a service node opens the spans drawer and calls onSelectService
    fireEvent.click(gatewayElements[0])
    expect(handleSelectService).toHaveBeenCalledWith('api-gateway')
    expect(screen.getByText(/Service Spans in api-gateway/i)).toBeInTheDocument()
  })

  it('CriticalPathAnalyzerCard computes bottleneck and concurrency metrics', () => {
    render(<CriticalPathAnalyzerCard trace={activeTrace} />)

    expect(
      screen.getByText('Critical Path & Bottleneck Latency Analysis')
    ).toBeInTheDocument()
    expect(screen.getByText('Sequential Execution Chain (Critical Path)')).toBeInTheDocument()
    expect(screen.getByText('Concurrency Factor')).toBeInTheDocument()
    expect(screen.getByText(/Automated Performance Recommendation/i)).toBeInTheDocument()
  })

  it('TraceChaosControlPanel renders controls and triggers chaos simulation', async () => {
    const handleSimulate = vi.fn()
    render(<TraceChaosControlPanel onSimulateWithChaos={handleSimulate} />)

    expect(
      screen.getByText('Chaos Engineering & Latency Injection Lab')
    ).toBeInTheDocument()
    expect(screen.getByText('Target Microservice')).toBeInTheDocument()
    expect(screen.getByText(/Microservice Latency Distributions/i)).toBeInTheDocument()

    const applyBtn = screen.getByRole('button', { name: /Apply Chaos Rule/i })
    fireEvent.click(applyBtn)

    const simulateBtn = screen.getByRole('button', {
      name: /Execute Simulation with Chaos/i,
    })
    fireEvent.click(simulateBtn)
  })

  it('W3cTraceContextInspector renders traceparent breakdown, baggage, and audit digest', () => {
    render(<W3cTraceContextInspector trace={activeTrace} />)

    expect(
      screen.getByText('W3C TraceContext & Baggage Header Propagation')
    ).toBeInTheDocument()
    expect(screen.getByText(/HTTP Header: traceparent/i)).toBeInTheDocument()
    expect(screen.getByText(activeTrace.w3cTraceparent.rawHeader)).toBeInTheDocument()
    expect(screen.getByText('Distributed Baggage Context (Cross-Cutting Metadata)')).toBeInTheDocument()
    expect(screen.getByText('Cryptographic Trace Audit Digest (SHA-256)')).toBeInTheDocument()
  })
})
