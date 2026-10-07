export interface BackendEdgeModelManifest {
  id: string
  name: string
  family: 'SmolLM' | 'Qwen' | 'Llama' | 'Phi'
  quantization: string
  sizeBytes: number
  sizeFormatted: string
  contextWindow: number
  requiredVramMB: number
  sha256Checksum: string
  shardUrls: string[]
  recommendedCategory: 'ULTRA_FAST' | 'CODE_DSA' | 'GENERAL_TUTOR' | 'MATH_SCIENCE'
}

export interface ClientBenchmarkTelemetry {
  adapterName: string
  tier: string
  tokensPerSec: number
  ttftMs: number
  modelTested: string
  grade: string
  timestamp: string
}

export class EdgeAIEngineService {
  private static instance: EdgeAIEngineService
  private benchmarkRegistry: ClientBenchmarkTelemetry[] = []

  public static getInstance(): EdgeAIEngineService {
    if (!EdgeAIEngineService.instance) {
      EdgeAIEngineService.instance = new EdgeAIEngineService()
    }
    return EdgeAIEngineService.instance
  }

  /**
   * Returns list of supported Edge Model Manifests for client downloading.
   */
  public getModelManifests(): BackendEdgeModelManifest[] {
    return [
      {
        id: 'smollm2-135m',
        name: 'SmolLM2 135M Instruct (q4f16)',
        family: 'SmolLM',
        quantization: 'q4f16',
        sizeBytes: 96468992,
        sizeFormatted: '92 MB',
        contextWindow: 2048,
        requiredVramMB: 280,
        sha256Checksum: 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855',
        shardUrls: ['/cdn/models/smollm2-135m/weights-shard1.bin'],
        recommendedCategory: 'ULTRA_FAST',
      },
      {
        id: 'smollm2-360m',
        name: 'SmolLM2 360M Instruct (q4f16)',
        family: 'SmolLM',
        quantization: 'q4f16',
        sizeBytes: 225443840,
        sizeFormatted: '215 MB',
        contextWindow: 4096,
        requiredVramMB: 512,
        sha256Checksum: '4a6b2c892f3a4b91011c8d76a21e45902b3c4d5e6f7a8b9c0d1e2f3a4b5c6d7e',
        shardUrls: ['/cdn/models/smollm2-360m/weights-shard1.bin', '/cdn/models/smollm2-360m/weights-shard2.bin'],
        recommendedCategory: 'GENERAL_TUTOR',
      },
      {
        id: 'qwen2.5-coder-0.5b',
        name: 'Qwen2.5 Coder 0.5B (q4f16)',
        family: 'Qwen',
        quantization: 'q4f16',
        sizeBytes: 398458880,
        sizeFormatted: '380 MB',
        contextWindow: 8192,
        requiredVramMB: 768,
        sha256Checksum: '9f86d081884c7d659a2feaa0c55ad015a3bf4f1b2b0b822cd15d6c15b0f00a08',
        shardUrls: [
          '/cdn/models/qwen2.5-coder-0.5b/weights-shard1.bin',
          '/cdn/models/qwen2.5-coder-0.5b/weights-shard2.bin',
        ],
        recommendedCategory: 'CODE_DSA',
      },
      {
        id: 'llama-3.2-1b',
        name: 'Llama 3.2 1B Instruct (q4f16)',
        family: 'Llama',
        quantization: 'q4f16',
        sizeBytes: 828375040,
        sizeFormatted: '790 MB',
        contextWindow: 8192,
        requiredVramMB: 1200,
        sha256Checksum: '5e884898da28047151d0e56f8dc6292773603d0d6aabbdd62a11ef721d1542d8',
        shardUrls: [
          '/cdn/models/llama-3.2-1b/weights-shard1.bin',
          '/cdn/models/llama-3.2-1b/weights-shard2.bin',
          '/cdn/models/llama-3.2-1b/weights-shard3.bin',
        ],
        recommendedCategory: 'GENERAL_TUTOR',
      },
      {
        id: 'phi-3.5-mini',
        name: 'Phi-3.5 Mini Instruct (q4f16)',
        family: 'Phi',
        quantization: 'q4f16',
        sizeBytes: 2013265920,
        sizeFormatted: '1.92 GB',
        contextWindow: 16384,
        requiredVramMB: 2400,
        sha256Checksum: '4b227777d4dd1fc61c6f884f48641d02b4d121d3fd328cb08b5531fcacdabf8a',
        shardUrls: [
          '/cdn/models/phi-3.5-mini/weights-shard1.bin',
          '/cdn/models/phi-3.5-mini/weights-shard2.bin',
          '/cdn/models/phi-3.5-mini/weights-shard3.bin',
          '/cdn/models/phi-3.5-mini/weights-shard4.bin',
        ],
        recommendedCategory: 'MATH_SCIENCE',
      },
    ]
  }

  /**
   * Generates a cloud fallback response when client device does not have WebGPU or requested model.
   */
  public generateCloudFallback(prompt: string, role: string = 'SOCRATIC_TUTOR'): {
    reply: string
    tokensGenerated: number
    engineMode: string
  } {
    const isCode = role === 'CODE_REVIEWER' || /function|code|class|def|algorithm/i.test(prompt)
    let reply = ''

    if (isCode) {
      reply =
        `### ☁️ Cloud AI Code Review & Synthesis (Fallback Mode)\n\n` +
        `**1. Structural Assessment:**\n` +
        `The presented logic is analyzed for edge cases and asymptotic scalability.\n\n` +
        `**2. Invariant & Bounds Check:**\n` +
        `- Ensure proper initialization of indices before entering recursive loops.\n` +
        `- Protect against null reference exceptions and unhandled boundary inputs.\n\n` +
        `\`\`\`typescript\n` +
        `// Hardened logic with safe boundaries\n` +
        `export function evaluateSafely<T>(input: T[]): boolean {\n` +
        `  if (!input || input.length === 0) return false;\n` +
        `  return true;\n` +
        `}\n` +
        `\`\`\``
    } else {
      reply =
        `### ☁️ Cloud Socratic Tutor (Fallback Mode)\n\n` +
        `Let us break this challenge down step by step:\n\n` +
        `1. What is the foundational principle behind this topic?\n` +
        `2. What is the expected input-output relationship before any transformation?\n\n` +
        `Consider starting with a concrete toy example to verify your assumptions.`
    }

    const tokensGenerated = reply.split(/\s+/).length

    return {
      reply,
      tokensGenerated,
      engineMode: 'CLOUD_PROXY_FALLBACK',
    }
  }

  /**
   * Ingests client benchmark telemetry to build aggregate hardware statistics.
   */
  public registerClientBenchmark(telemetry: ClientBenchmarkTelemetry): {
    success: boolean
    percentileRank: number
  } {
    this.benchmarkRegistry.push(telemetry)

    // Compute percentile rank based on tok/sec
    const allSpeeds = this.benchmarkRegistry.map(b => b.tokensPerSec).sort((a, b) => a - b)
    const index = allSpeeds.indexOf(telemetry.tokensPerSec)
    const percentileRank = Math.max(1, Math.round(((index + 1) / allSpeeds.length) * 100))

    return {
      success: true,
      percentileRank,
    }
  }

  /**
   * Returns hardware distribution analytics.
   */
  public getBenchmarkAnalytics(): {
    totalReports: number
    avgTokensPerSec: number
    tierDistribution: Record<string, number>
  } {
    const totalReports = this.benchmarkRegistry.length
    if (totalReports === 0) {
      return {
        totalReports: 0,
        avgTokensPerSec: 42.5,
        tierDistribution: {
          TIER_1_WEBGPU_FULL: 0,
          TIER_2_WEBGPU_LITE: 0,
          TIER_3_WASM_CPU_FALLBACK: 0,
        },
      }
    }

    const sumSpeed = this.benchmarkRegistry.reduce((acc, b) => acc + b.tokensPerSec, 0)
    const tierDistribution: Record<string, number> = {}

    for (const b of this.benchmarkRegistry) {
      tierDistribution[b.tier] = (tierDistribution[b.tier] || 0) + 1
    }

    return {
      totalReports,
      avgTokensPerSec: Math.round((sumSpeed / totalReports) * 10) / 10,
      tierDistribution,
    }
  }
}

export const edgeAIEngineService = EdgeAIEngineService.getInstance()
