import crypto from 'crypto'
import logger from '../utils/logger'

export type ServiceHealthStatus = 'HEALTHY' | 'DEGRADED' | 'CRASHED' | 'RECOVERING'
export type CircuitBreakerState = 'CLOSED' | 'OPEN' | 'HALF_OPEN'
export type NetworkLinkState = 'CONNECTED' | 'PARTITIONED' | 'DEGRADED_LATENCY' | 'PACKET_LOSS'
export type ChaosFaultType =
  | 'NETWORK_PARTITION'
  | 'LATENCY_SPIKE'
  | 'PACKET_LOSS'
  | 'PROCESS_CRASH'
  | 'THREAD_POOL_SATURATION'

export interface ServiceNode {
  id: string
  name: string
  role: 'GATEWAY' | 'CORE_LOGIC' | 'CACHE' | 'DATABASE' | 'MESSAGE_BUS' | 'THIRD_PARTY'
  status: ServiceHealthStatus
  cpuPercent: number // 0-100
  threadPoolUsed: number
  threadPoolCapacity: number
  errorRatePercent: number // 0-100
  circuitBreaker: {
    state: CircuitBreakerState
    failureThresholdPercent: number
    consecutiveFailures: number
    fallbackStrategy: 'STALE_CACHE' | 'EMPTY_COLLECTION' | 'FAIL_FAST_429'
    fallbackInvocations: number
  }
}

export interface NetworkLink {
  id: string
  sourceNodeId: string
  targetNodeId: string
  state: NetworkLinkState
  latencyMs: number
  jitterMs: number
  packetLossPercent: number
}

export interface ClusterTopology {
  clusterId: string
  name: string
  description: string
  nodes: ServiceNode[]
  links: NetworkLink[]
}

export interface ChaosExperimentConfig {
  faultType: ChaosFaultType
  targetNodeId?: string
  targetLinkId?: string
  injectedLatencyMs?: number
  injectedPacketLossPercent?: number
  durationSeconds: number
}

export interface ChaosTelemetryEvent {
  timestampOffsetMs: number
  serviceId: string
  severity: 'INFO' | 'WARN' | 'ERROR' | 'CRITICAL'
  message: string
  metricsSnapshot: {
    availabilityPercent: number
    activeThreads: number
    circuitBreakerTripped: boolean
  }
}

export interface ResilienceAuditScorecard {
  overallResilienceGrade: 'A+' | 'A' | 'B' | 'C' | 'D' | 'F'
  availabilitySlaPercent: number
  blastRadiusPercent: number // percentage of total cluster affected
  meanTimeToRecoverMs: number
  circuitBreakerEffectivenessPercent: number
  cascadingFailuresPrevented: number
  postMortemSummary: string
  mitigationRecommendations: string[]
  cryptographicAuditDigest: string
}

export interface ChaosSimulationResult {
  simulationId: string
  experimentConfig: ChaosExperimentConfig
  initialTopology: ClusterTopology
  finalTopology: ClusterTopology
  telemetryEvents: ChaosTelemetryEvent[]
  auditScorecard: ResilienceAuditScorecard
}

export class ChaosClusterSimulationService {
  /**
   * Generates standard enterprise benchmark topologies
   */
  public getPresetTopologies(): ClusterTopology[] {
    return [
      {
        clusterId: 'ecommerce-checkout-mesh',
        name: 'E-Commerce Distributed Checkout Pipeline',
        description: 'Multi-tier microservice architecture: API Gateway -> Order Service -> Payment Service & Postgres with Redis Caching.',
        nodes: [
          {
            id: 'svc-gateway',
            name: 'API Gateway (Kong/Envoy)',
            role: 'GATEWAY',
            status: 'HEALTHY',
            cpuPercent: 24,
            threadPoolUsed: 42,
            threadPoolCapacity: 200,
            errorRatePercent: 0.1,
            circuitBreaker: {
              state: 'CLOSED',
              failureThresholdPercent: 50,
              consecutiveFailures: 0,
              fallbackStrategy: 'FAIL_FAST_429',
              fallbackInvocations: 0,
            },
          },
          {
            id: 'svc-order',
            name: 'Order Service',
            role: 'CORE_LOGIC',
            status: 'HEALTHY',
            cpuPercent: 35,
            threadPoolUsed: 65,
            threadPoolCapacity: 150,
            errorRatePercent: 0.2,
            circuitBreaker: {
              state: 'CLOSED',
              failureThresholdPercent: 40,
              consecutiveFailures: 0,
              fallbackStrategy: 'STALE_CACHE',
              fallbackInvocations: 0,
            },
          },
          {
            id: 'svc-payment',
            name: 'Payment Gateway Client',
            role: 'THIRD_PARTY',
            status: 'HEALTHY',
            cpuPercent: 18,
            threadPoolUsed: 22,
            threadPoolCapacity: 100,
            errorRatePercent: 0.4,
            circuitBreaker: {
              state: 'CLOSED',
              failureThresholdPercent: 30,
              consecutiveFailures: 0,
              fallbackStrategy: 'FAIL_FAST_429',
              fallbackInvocations: 0,
            },
          },
          {
            id: 'svc-redis',
            name: 'Distributed Redis Cache',
            role: 'CACHE',
            status: 'HEALTHY',
            cpuPercent: 12,
            threadPoolUsed: 15,
            threadPoolCapacity: 500,
            errorRatePercent: 0.0,
            circuitBreaker: {
              state: 'CLOSED',
              failureThresholdPercent: 60,
              consecutiveFailures: 0,
              fallbackStrategy: 'STALE_CACHE',
              fallbackInvocations: 0,
            },
          },
          {
            id: 'svc-postgres',
            name: 'PostgreSQL Primary DB',
            role: 'DATABASE',
            status: 'HEALTHY',
            cpuPercent: 45,
            threadPoolUsed: 80,
            threadPoolCapacity: 100,
            errorRatePercent: 0.05,
            circuitBreaker: {
              state: 'CLOSED',
              failureThresholdPercent: 50,
              consecutiveFailures: 0,
              fallbackStrategy: 'STALE_CACHE',
              fallbackInvocations: 0,
            },
          },
        ],
        links: [
          {
            id: 'link-gw-order',
            sourceNodeId: 'svc-gateway',
            targetNodeId: 'svc-order',
            state: 'CONNECTED',
            latencyMs: 4,
            jitterMs: 1,
            packetLossPercent: 0,
          },
          {
            id: 'link-order-payment',
            sourceNodeId: 'svc-order',
            targetNodeId: 'svc-payment',
            state: 'CONNECTED',
            latencyMs: 12,
            jitterMs: 3,
            packetLossPercent: 0,
          },
          {
            id: 'link-order-redis',
            sourceNodeId: 'svc-order',
            targetNodeId: 'svc-redis',
            state: 'CONNECTED',
            latencyMs: 1,
            jitterMs: 0.5,
            packetLossPercent: 0,
          },
          {
            id: 'link-order-postgres',
            sourceNodeId: 'svc-order',
            targetNodeId: 'svc-postgres',
            state: 'CONNECTED',
            latencyMs: 6,
            jitterMs: 2,
            packetLossPercent: 0,
          },
        ],
      },
    ]
  }

  /**
   * Executes a Chaos Engineering discrete event simulation
   */
  public runChaosExperiment(params: {
    topology: ClusterTopology
    experiment: ChaosExperimentConfig
  }): ChaosSimulationResult {
    const simulationId = `chaos-sim-${crypto.randomBytes(6).toString('hex')}`
    logger.info(`Starting Chaos Monkey Experiment [${simulationId}] of type: ${params.experiment.faultType}`)

    // Clone initial topology
    const finalNodes: ServiceNode[] = JSON.parse(JSON.stringify(params.topology.nodes))
    const finalLinks: NetworkLink[] = JSON.parse(JSON.stringify(params.topology.links))
    const telemetryEvents: ChaosTelemetryEvent[] = []

    const { faultType, targetNodeId, targetLinkId, injectedLatencyMs, injectedPacketLossPercent } = params.experiment

    // Target service or default to first core logic service
    const targetService = finalNodes.find((n) => n.id === targetNodeId) || finalNodes.find((n) => n.role === 'CORE_LOGIC') || finalNodes[1]
    const targetLink = finalLinks.find((l) => l.id === targetLinkId) || finalLinks.find((l) => l.sourceNodeId === targetService.id) || finalLinks[0]

    // Step 1: Initial Baseline Telemetry
    telemetryEvents.push({
      timestampOffsetMs: 0,
      serviceId: targetService.id,
      severity: 'INFO',
      message: `Experiment started: Injecting ${faultType} into ${targetService.name}`,
      metricsSnapshot: {
        availabilityPercent: 99.9,
        activeThreads: targetService.threadPoolUsed,
        circuitBreakerTripped: false,
      },
    })

    let cascadingPrevented = 0
    let blastRadiusCount = 1

    // Step 2: Fault Injection & Resilience Dynamics
    switch (faultType) {
      case 'NETWORK_PARTITION': {
        targetLink.state = 'PARTITIONED'
        targetLink.packetLossPercent = 100
        targetService.status = 'DEGRADED'
        targetService.errorRatePercent = 88.5
        targetService.threadPoolUsed = Math.min(targetService.threadPoolCapacity, targetService.threadPoolUsed + 70)

        telemetryEvents.push({
          timestampOffsetMs: 500,
          serviceId: targetService.id,
          severity: 'CRITICAL',
          message: `Network link between ${targetLink.sourceNodeId} and ${targetLink.targetNodeId} severed. 100% packet drop detected.`,
          metricsSnapshot: {
            availabilityPercent: 42.0,
            activeThreads: targetService.threadPoolUsed,
            circuitBreakerTripped: false,
          },
        })

        // Trip Circuit Breaker
        targetService.circuitBreaker.state = 'OPEN'
        targetService.circuitBreaker.consecutiveFailures = 15
        targetService.circuitBreaker.fallbackInvocations = 420
        cascadingPrevented += 1

        telemetryEvents.push({
          timestampOffsetMs: 1200,
          serviceId: targetService.id,
          severity: 'WARN',
          message: `Circuit Breaker TRIPPED to OPEN state. Traffic rerouted to ${targetService.circuitBreaker.fallbackStrategy} fallback handler.`,
          metricsSnapshot: {
            availabilityPercent: 91.5,
            activeThreads: 30, // Thread pool shed
            circuitBreakerTripped: true,
          },
        })
        break
      }

      case 'LATENCY_SPIKE': {
        const addedLatency = injectedLatencyMs || 2500
        targetLink.state = 'DEGRADED_LATENCY'
        targetLink.latencyMs += addedLatency
        targetService.status = 'DEGRADED'
        targetService.cpuPercent = Math.min(100, targetService.cpuPercent + 45)
        targetService.threadPoolUsed = Math.min(targetService.threadPoolCapacity, targetService.threadPoolCapacity - 5)

        telemetryEvents.push({
          timestampOffsetMs: 400,
          serviceId: targetService.id,
          severity: 'ERROR',
          message: `Injected latency spike of +${addedLatency}ms. Thread pool saturation climbing rapidly to ${targetService.threadPoolUsed}/${targetService.threadPoolCapacity}.`,
          metricsSnapshot: {
            availabilityPercent: 64.0,
            activeThreads: targetService.threadPoolUsed,
            circuitBreakerTripped: false,
          },
        })

        // Upstream Circuit Breaker Shedding
        targetService.circuitBreaker.state = 'OPEN'
        targetService.circuitBreaker.consecutiveFailures = 12
        targetService.circuitBreaker.fallbackInvocations = 310
        cascadingPrevented += 1

        telemetryEvents.push({
          timestampOffsetMs: 1400,
          serviceId: targetService.id,
          severity: 'INFO',
          message: `Upstream gateway bulkheading engaged. Fast-failing requests in 2ms to protect thread pools.`,
          metricsSnapshot: {
            availabilityPercent: 94.2,
            activeThreads: 35,
            circuitBreakerTripped: true,
          },
        })
        break
      }

      case 'PACKET_LOSS': {
        const dropRate = injectedPacketLossPercent || 45
        targetLink.state = 'PACKET_LOSS'
        targetLink.packetLossPercent = dropRate
        targetService.status = 'DEGRADED'
        targetService.errorRatePercent = dropRate

        telemetryEvents.push({
          timestampOffsetMs: 600,
          serviceId: targetService.id,
          severity: 'WARN',
          message: `Packet loss rate elevated to ${dropRate}%. TCP retransmit overhead causing intermittent timeouts.`,
          metricsSnapshot: {
            availabilityPercent: 100 - dropRate,
            activeThreads: targetService.threadPoolUsed + 20,
            circuitBreakerTripped: false,
          },
        })
        break
      }

      case 'PROCESS_CRASH': {
        targetService.status = 'CRASHED'
        targetService.cpuPercent = 0
        targetService.threadPoolUsed = 0
        targetService.errorRatePercent = 100

        telemetryEvents.push({
          timestampOffsetMs: 200,
          serviceId: targetService.id,
          severity: 'CRITICAL',
          message: `SIGKILL / Panic encountered: Process ${targetService.name} terminated abruptly.`,
          metricsSnapshot: {
            availabilityPercent: 0,
            activeThreads: 0,
            circuitBreakerTripped: false,
          },
        })

        // Automated recovery
        targetService.circuitBreaker.state = 'OPEN'
        targetService.circuitBreaker.fallbackInvocations = 850
        cascadingPrevented += 2
        blastRadiusCount = 2

        telemetryEvents.push({
          timestampOffsetMs: 1800,
          serviceId: targetService.id,
          severity: 'INFO',
          message: `Automated health check detected failure. Container orchestrator restarting replica pod.`,
          metricsSnapshot: {
            availabilityPercent: 88.0,
            activeThreads: 10,
            circuitBreakerTripped: true,
          },
        })
        break
      }

      case 'THREAD_POOL_SATURATION': {
        targetService.status = 'DEGRADED'
        targetService.threadPoolUsed = targetService.threadPoolCapacity
        targetService.cpuPercent = 98
        targetService.errorRatePercent = 45

        telemetryEvents.push({
          timestampOffsetMs: 300,
          serviceId: targetService.id,
          severity: 'CRITICAL',
          message: `Thread pool exhausted: ${targetService.threadPoolUsed}/${targetService.threadPoolCapacity} workers busy. Little's law queue capacity exceeded.`,
          metricsSnapshot: {
            availabilityPercent: 55.0,
            activeThreads: targetService.threadPoolCapacity,
            circuitBreakerTripped: false,
          },
        })

        targetService.circuitBreaker.state = 'HALF_OPEN'
        cascadingPrevented += 1
        break
      }
    }

    // Step 3: Compute Audit Scorecard
    const availabilitySla = targetService.circuitBreaker.state === 'OPEN' ? 95.8 : 88.4
    const blastRadiusPercent = Math.round((blastRadiusCount / finalNodes.length) * 100)
    const mttrMs = targetService.circuitBreaker.state === 'OPEN' ? 1200 : 2800

    const scorecard: ResilienceAuditScorecard = {
      overallResilienceGrade: targetService.circuitBreaker.state === 'OPEN' ? 'A' : 'B',
      availabilitySlaPercent: availabilitySla,
      blastRadiusPercent,
      meanTimeToRecoverMs: mttrMs,
      circuitBreakerEffectivenessPercent: targetService.circuitBreaker.state === 'OPEN' ? 96.5 : 78.0,
      cascadingFailuresPrevented: cascadingPrevented,
      postMortemSummary: `During the ${faultType} fault injection against ${targetService.name}, the cluster successfully isolated the failure domain within ${mttrMs}ms. Fallback responses (${targetService.circuitBreaker.fallbackStrategy}) shielded upstream services, preserving a ${availabilitySla}% Availability SLA.`,
      mitigationRecommendations: [
        'Enforce connection pool timeouts (<= 250ms) on all downstream HTTP/gRPC clients.',
        'Configure jittered exponential backoff (initial 100ms, max 3000ms, jitter 0.2) to eliminate retry thundering herds.',
        'Deploy redundant read replicas for database queries to decouple read traffic during primary partitions.',
      ],
      cryptographicAuditDigest: crypto
        .createHash('sha256')
        .update(`${simulationId}|${faultType}|${availabilitySla}|${mttrMs}`)
        .digest('hex'),
    }

    return {
      simulationId,
      experimentConfig: params.experiment,
      initialTopology: params.topology,
      finalTopology: {
        ...params.topology,
        nodes: finalNodes,
        links: finalLinks,
      },
      telemetryEvents,
      auditScorecard: scorecard,
    }
  }
}

export const chaosClusterSimulationService = new ChaosClusterSimulationService()
