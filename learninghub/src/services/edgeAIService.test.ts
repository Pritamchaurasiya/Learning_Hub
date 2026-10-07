import { describe, it, expect, beforeEach, vi } from 'vitest'
import { edgeAIService } from './edgeAIService'
import { EdgeTutorStreamChunk } from '../types/edgeAI'

describe('EdgeAIService (Milestone 13 Edge AI Offline Tutor)', () => {
  beforeEach(() => {
    localStorage.clear()
    vi.clearAllMocks()
  })

  it('detects GPU hardware with graceful fallback in node/jsdom environment', async () => {
    const gpu = await edgeAIService.detectGpuHardware()
    expect(gpu).toBeDefined()
    expect(gpu.tier).toMatch(/TIER_1_WEBGPU_FULL|TIER_2_WEBGPU_LITE|TIER_3_WASM_CPU_FALLBACK/)
    expect(gpu.vramEstimateMB).toBeGreaterThan(0)
    expect(gpu.adapterName).toBeDefined()
  })

  it('returns curated edge model presets with cache states', () => {
    const presets = edgeAIService.getAvailableModelPresets()
    expect(presets.length).toBeGreaterThanOrEqual(5)

    const qwen = presets.find(p => p.id === 'qwen2.5-coder-0.5b')
    expect(qwen).toBeDefined()
    expect(qwen?.recommendedFor).toBe('CODE_DSA')
    expect(qwen?.isDownloaded).toBe(true)

    const phi = presets.find(p => p.id === 'phi-3.5-mini')
    expect(phi).toBeDefined()
    expect(phi?.family).toBe('Phi')
  })

  it('provides distinct system prompts tailored to specialized edge roles', () => {
    const socratic = edgeAIService.getSystemPromptForRole('SOCRATIC_TUTOR')
    expect(socratic).toContain('Socratic')
    expect(socratic).toContain('Never reveal answers directly')

    const code = edgeAIService.getSystemPromptForRole('CODE_REVIEWER')
    expect(code).toContain('Code Reviewer')
    expect(code).toContain('complexity')

    const dsa = edgeAIService.getSystemPromptForRole('DSA_EXPERT')
    expect(dsa).toContain('Data Structures and Algorithms')

    const math = edgeAIService.getSystemPromptForRole('MATH_SOLVER')
    expect(math).toContain('Mathematical')
  })

  it('streams response chunks with live micro-inference performance telemetry', async () => {
    const chunks: EdgeTutorStreamChunk[] = []

    const fullText = await edgeAIService.generateStreamingResponse(
      {
        prompt: 'How do I optimize quicksort?',
        systemRole: 'CODE_REVIEWER',
        modelId: 'qwen2.5-coder-0.5b',
      },
      chunk => {
        chunks.push(chunk)
      }
    )

    expect(fullText.length).toBeGreaterThan(0)
    expect(chunks.length).toBeGreaterThan(0)

    const lastChunk = chunks[chunks.length - 1]
    expect(lastChunk.done).toBe(true)
    expect(lastChunk.metrics).toBeDefined()
    expect(lastChunk.metrics?.tokensPerSec).toBeGreaterThan(0)
    expect(lastChunk.metrics?.ttftMs).toBeGreaterThan(0)
    expect(lastChunk.metrics?.engineMode).toBe('WEBGPU_SHADERS')
  })

  it('simulates model download with progress updates and caches to local storage', async () => {
    const progressHistory: number[] = []

    const success = await edgeAIService.downloadModel('smollm2-360m', state => {
      progressHistory.push(state.progressPercent)
    })

    expect(success).toBe(true)
    expect(progressHistory).toContain(100)

    const cachedIds = edgeAIService.getCachedModelIds()
    expect(cachedIds.has('smollm2-360m')).toBe(true)

    const deleted = edgeAIService.deleteModel('smollm2-360m')
    expect(deleted).toBe(true)
    expect(edgeAIService.getCachedModelIds().has('smollm2-360m')).toBe(false)
  })

  it('executes edge hardware micro-benchmark with performance rating', async () => {
    const benchmark = await edgeAIService.runEdgeHardwareBenchmark()

    expect(benchmark).toBeDefined()
    expect(benchmark.tokensPerSec).toBeGreaterThan(0)
    expect(benchmark.ttftMs).toBeGreaterThan(0)
    expect(['EXCELLENT', 'GOOD', 'FAIR', 'POOR']).toContain(benchmark.grade)
    expect(benchmark.modelTested).toBeDefined()

    const history = edgeAIService.loadBenchmarks()
    expect(history.length).toBeGreaterThanOrEqual(1)
  })

  it('creates, saves, and clears edge chat sessions', () => {
    const session = edgeAIService.createChatSession('DSA_EXPERT', 'qwen2.5-coder-0.5b')
    expect(session.id).toBeDefined()
    expect(session.systemRole).toBe('DSA_EXPERT')

    const loaded = edgeAIService.loadChatSessions()
    expect(loaded.length).toBe(1)
    expect(loaded[0].id).toBe(session.id)

    edgeAIService.clearChatSessions()
    expect(edgeAIService.loadChatSessions().length).toBe(0)
  })
})
