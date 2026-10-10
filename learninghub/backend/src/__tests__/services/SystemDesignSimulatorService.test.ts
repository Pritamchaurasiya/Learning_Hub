import {
  SystemDesignSimulatorService,
  systemDesignSimulatorService,
} from '../../services/SystemDesignSimulatorService'

describe('SystemDesignSimulatorService (Milestone 18)', () => {
  let service: SystemDesignSimulatorService

  beforeEach(() => {
    service = new SystemDesignSimulatorService()
  })

  it('generates standard architecture presets with valid topologies', () => {
    const tinyUrl = service.getPresetTopology('URL_SHORTENER_TINYURL')
    expect(tinyUrl.nodes.length).toBeGreaterThan(5)
    expect(tinyUrl.edges.length).toBeGreaterThan(5)
    expect(tinyUrl.nodes.some(n => n.type === 'PRIMARY_DATABASE')).toBe(true)
    expect(tinyUrl.nodes.some(n => n.type === 'DISTRIBUTED_CACHE')).toBe(true)

    const chat = service.getPresetTopology('GLOBAL_CHAT_MESSENGER')
    expect(chat.nodes.some(n => n.type === 'MESSAGE_QUEUE')).toBe(true)

    const limiter = service.getPresetTopology('DISTRIBUTED_RATE_LIMITER')
    expect(limiter.nodes.length).toBeGreaterThan(4)

    const video = service.getPresetTopology('VIDEO_STREAMING_PLATFORM')
    expect(video.nodes.some(n => n.type === 'BLOB_STORAGE')).toBe(true)
  })

  it('detects unmitigated Single Points of Failure (SPOF) when replication is 1', () => {
    const topology = service.getPresetTopology('URL_SHORTENER_TINYURL')
    const spofs = service.detectSPOFNodes(topology)

    // db-primary in TinyURL has replicationFactor: 1
    expect(spofs).toContain('db-primary')
  })

  it('calculates nominal telemetry and queueing latency under baseline QPS load', () => {
    const topology = service.getPresetTopology('URL_SHORTENER_TINYURL')
    const result = service.runSimulation({
      topology,
      targetQps: 5000,
      activeFault: 'NONE',
    })

    expect(result.simulatedQps).toBe(5000)
    expect(result.p50LatencyMs).toBeGreaterThan(0)
    expect(result.p95LatencyMs).toBeGreaterThan(result.p50LatencyMs)
    expect(result.p99LatencyMs).toBeGreaterThan(result.p95LatencyMs)
    expect(result.errorRatePercentage).toBeLessThan(10)
    expect(result.systemStatus).toBe('OPTIMAL')
    expect(result.socraticCritique.katexFormulas.length).toBeGreaterThan(0)
  })

  it('simulates PRIMARY_DB_CRASH chaos fault triggering high error rate and degraded state', () => {
    const topology = service.getPresetTopology('URL_SHORTENER_TINYURL')
    const result = service.runSimulation({
      topology,
      targetQps: 15000,
      activeFault: 'PRIMARY_DB_CRASH',
    })

    expect(result.activeFault).toBe('PRIMARY_DB_CRASH')
    expect(result.errorRatePercentage).toBeGreaterThan(50)
    expect(['CRITICAL_FAILURE', 'DEGRADED', 'OUTAGE']).toContain(result.systemStatus)
    expect(result.failedNodeIds).toContain('db-primary')
  })

  it('simulates CACHE_THUNDERING_HERD chaos fault with latency inflation', () => {
    const topology = service.getPresetTopology('URL_SHORTENER_TINYURL')
    const result = service.runSimulation({
      topology,
      targetQps: 10000,
      activeFault: 'CACHE_THUNDERING_HERD',
    })

    expect(result.activeFault).toBe('CACHE_THUNDERING_HERD')
    expect(result.p99LatencyMs).toBeGreaterThan(400)
    expect(result.architecturalScorecard.detectedVulnerabilities.some(v => v.includes('Cache stampede'))).toBe(true)
  })

  it('evaluates CAP Theorem consistency and availability scores', () => {
    const topology = service.getPresetTopology('URL_SHORTENER_TINYURL')
    const result = service.runSimulation({
      topology,
      targetQps: 5000,
    })

    expect(['CP', 'AP', 'CA_THEORETICAL']).toContain(result.capClassification.primaryModel)
    expect(result.capClassification.consistencyScore).toBeGreaterThanOrEqual(0)
    expect(result.capClassification.availabilityScore).toBeGreaterThanOrEqual(0)
    expect(result.capClassification.partitionToleranceScore).toBeGreaterThanOrEqual(0)
  })
})
