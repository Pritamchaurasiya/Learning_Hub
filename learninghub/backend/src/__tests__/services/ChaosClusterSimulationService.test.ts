import { chaosClusterSimulationService } from '../../services/ChaosClusterSimulationService'

describe('ChaosClusterSimulationService (Milestone 23 Chaos Sandbox)', () => {
  it('provides default preset topologies with services and network links', () => {
    const presets = chaosClusterSimulationService.getPresetTopologies()
    expect(presets.length).toBeGreaterThanOrEqual(1)

    const checkout = presets[0]
    expect(checkout.nodes.length).toBeGreaterThanOrEqual(4)
    expect(checkout.links.length).toBeGreaterThanOrEqual(3)

    const gateway = checkout.nodes.find((n) => n.role === 'GATEWAY')
    expect(gateway).toBeDefined()
    expect(gateway?.circuitBreaker.state).toBe('CLOSED')
  })

  it('simulates network partition fault and trips circuit breaker to OPEN', () => {
    const topology = chaosClusterSimulationService.getPresetTopologies()[0]
    const result = chaosClusterSimulationService.runChaosExperiment({
      topology,
      experiment: {
        faultType: 'NETWORK_PARTITION',
        durationSeconds: 10,
      },
    })

    expect(result).toBeDefined()
    expect(result.simulationId).toMatch(/^chaos-sim-[a-f0-9]+$/)
    expect(result.telemetryEvents.length).toBeGreaterThanOrEqual(2)

    // Check circuit breaker tripped
    const degradedNode = result.finalTopology.nodes.find((n) => n.circuitBreaker.state === 'OPEN')
    expect(degradedNode).toBeDefined()
    expect(degradedNode?.circuitBreaker.fallbackInvocations).toBeGreaterThan(0)
  })

  it('simulates latency spike injection and handles thread pool shedding', () => {
    const topology = chaosClusterSimulationService.getPresetTopologies()[0]
    const result = chaosClusterSimulationService.runChaosExperiment({
      topology,
      experiment: {
        faultType: 'LATENCY_SPIKE',
        injectedLatencyMs: 3000,
        durationSeconds: 5,
      },
    })

    expect(result.auditScorecard.cascadingFailuresPrevented).toBeGreaterThanOrEqual(1)
    expect(result.auditScorecard.availabilitySlaPercent).toBeGreaterThan(90)
    expect(result.auditScorecard.cryptographicAuditDigest).toHaveLength(64)
  })

  it('simulates process crash panic and generates post-mortem recommendations', () => {
    const topology = chaosClusterSimulationService.getPresetTopologies()[0]
    const result = chaosClusterSimulationService.runChaosExperiment({
      topology,
      experiment: {
        faultType: 'PROCESS_CRASH',
        durationSeconds: 5,
      },
    })

    const { auditScorecard, telemetryEvents } = result
    expect(telemetryEvents.some((e) => e.message.includes('SIGKILL / Panic'))).toBe(true)
    expect(auditScorecard.postMortemSummary).toContain('PROCESS_CRASH')
    expect(auditScorecard.mitigationRecommendations.length).toBeGreaterThanOrEqual(3)
    expect(auditScorecard.meanTimeToRecoverMs).toBeLessThanOrEqual(5000)
  })

  it('simulates packet loss and thread pool saturation faults', () => {
    const topology = chaosClusterSimulationService.getPresetTopologies()[0]
    const packetLossResult = chaosClusterSimulationService.runChaosExperiment({
      topology,
      experiment: {
        faultType: 'PACKET_LOSS',
        injectedPacketLossPercent: 75,
        durationSeconds: 15,
      },
    })

    expect(packetLossResult.telemetryEvents.some((e) => e.message.includes('Packet loss'))).toBe(true)
    expect(packetLossResult.auditScorecard.overallResilienceGrade).toMatch(/^[A-F][+-]?$/)

    const threadSaturationResult = chaosClusterSimulationService.runChaosExperiment({
      topology,
      experiment: {
        faultType: 'THREAD_POOL_SATURATION',
        targetNodeId: topology.nodes[1].id,
        durationSeconds: 8,
      },
    })

    expect(threadSaturationResult.finalTopology.nodes[1].threadPoolUsed).toBeGreaterThanOrEqual(
      threadSaturationResult.finalTopology.nodes[1].threadPoolCapacity
    )
    expect(threadSaturationResult.auditScorecard.mitigationRecommendations).toBeDefined()
  })
})
