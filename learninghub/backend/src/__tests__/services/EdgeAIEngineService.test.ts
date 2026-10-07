import { EdgeAIEngineService } from '../../services/EdgeAIEngineService'

describe('EdgeAIEngineService (Milestone 13 Edge AI Offline Tutor)', () => {
  let service: EdgeAIEngineService

  beforeEach(() => {
    service = EdgeAIEngineService.getInstance()
  })

  it('provides curated edge model manifests with sha256 checksums and weight shard paths', () => {
    const manifests = service.getModelManifests()
    expect(manifests.length).toBeGreaterThanOrEqual(5)

    const qwen = manifests.find(m => m.id === 'qwen2.5-coder-0.5b')
    expect(qwen).toBeDefined()
    expect(qwen?.family).toBe('Qwen')
    expect(qwen?.quantization).toBe('q4f16')
    expect(qwen?.sha256Checksum.length).toBe(64)
    expect(qwen?.shardUrls.length).toBeGreaterThanOrEqual(2)

    const phi = manifests.find(m => m.id === 'phi-3.5-mini')
    expect(phi).toBeDefined()
    expect(phi?.contextWindow).toBe(16384)
  })

  it('generates cloud fallback proxy response for coding and theoretical queries', () => {
    const codeFallback = service.generateCloudFallback('Can you check my binary search tree implementation?', 'CODE_REVIEWER')
    expect(codeFallback.reply).toContain('Cloud AI Code Review')
    expect(codeFallback.engineMode).toBe('CLOUD_PROXY_FALLBACK')
    expect(codeFallback.tokensGenerated).toBeGreaterThan(10)

    const tutorFallback = service.generateCloudFallback('Explain Bayes theorem', 'SOCRATIC_TUTOR')
    expect(tutorFallback.reply).toContain('Cloud Socratic Tutor')
    expect(tutorFallback.engineMode).toBe('CLOUD_PROXY_FALLBACK')
  })

  it('registers client-side WebGPU benchmarks and calculates percentile rank', () => {
    const report1 = service.registerClientBenchmark({
      adapterName: 'NVIDIA GeForce RTX 4070 Laptop GPU',
      tier: 'TIER_1_WEBGPU_FULL',
      tokensPerSec: 62.5,
      ttftMs: 28,
      modelTested: 'Qwen2.5 Coder 0.5B (q4f16)',
      grade: 'EXCELLENT',
      timestamp: new Date().toISOString(),
    })

    expect(report1.success).toBe(true)
    expect(report1.percentileRank).toBeGreaterThanOrEqual(1)

    const report2 = service.registerClientBenchmark({
      adapterName: 'Intel Iris Xe Graphics',
      tier: 'TIER_2_WEBGPU_LITE',
      tokensPerSec: 34.0,
      ttftMs: 68,
      modelTested: 'SmolLM2-135M',
      grade: 'GOOD',
      timestamp: new Date().toISOString(),
    })

    expect(report2.success).toBe(true)

    const analytics = service.getBenchmarkAnalytics()
    expect(analytics.totalReports).toBeGreaterThanOrEqual(2)
    expect(analytics.avgTokensPerSec).toBeGreaterThan(0)
    expect(analytics.tierDistribution['TIER_1_WEBGPU_FULL']).toBeGreaterThanOrEqual(1)
  })
})
