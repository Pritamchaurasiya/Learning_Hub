import { AIRouter } from '../../src/services/ai/AIRouter'
import { AIServiceFactory } from '../../src/services/ai/AIServiceFactory'
import { IAIAgent, AIMessage, AIProviderOptions, AIGenerationResult } from '../../src/services/ai/AIAgent'
import { MockAIAdapter } from '../../src/services/ai/MockAIAdapter'

describe('AIRouter and Multi-Model Fallback Mesh', () => {
  let router: AIRouter

  beforeEach(() => {
    router = new AIRouter(['primary', 'secondary', 'mock'])
    router.clearCache()
  })

  it('routes text generation to primary provider when healthy', async () => {
    const mockPrimary: IAIAgent = {
      generateText: jest.fn().mockResolvedValue({
        text: 'Response from Primary',
        usage: { promptTokens: 5, completionTokens: 5, totalTokens: 10 },
      }),
      generateChat: jest.fn(),
      generateJSON: jest.fn(),
    }

    router.registerProvider('primary', mockPrimary)

    const res = await router.generateText('Explain quicksort', { skipCache: true })
    expect(res.text).toBe('Response from Primary')
    expect(res.provider).toBe('primary')
    expect(res.cached).toBe(false)
    expect(res.latencyMs).toBeGreaterThanOrEqual(0)
    expect(mockPrimary.generateText).toHaveBeenCalledTimes(1)
  })

  it('caches text responses and serves subsequent identical requests from cache', async () => {
    const mockPrimary: IAIAgent = {
      generateText: jest.fn().mockResolvedValue({
        text: 'Cached content for binary search',
        usage: { promptTokens: 10, completionTokens: 10, totalTokens: 20 },
      }),
      generateChat: jest.fn(),
      generateJSON: jest.fn(),
    }

    router.registerProvider('primary', mockPrimary)

    const first = await router.generateText('What is binary search?')
    expect(first.cached).toBe(false)
    expect(first.text).toBe('Cached content for binary search')

    const second = await router.generateText('What is binary search?')
    expect(second.cached).toBe(true)
    expect(second.text).toBe('Cached content for binary search')
    // Primary was only called once because second was cached
    expect(mockPrimary.generateText).toHaveBeenCalledTimes(1)
  })

  it('bypasses cache when skipCache is true', async () => {
    const mockPrimary: IAIAgent = {
      generateText: jest.fn().mockResolvedValue({
        text: 'Fresh generation',
        usage: { promptTokens: 8, completionTokens: 8, totalTokens: 16 },
      }),
      generateChat: jest.fn(),
      generateJSON: jest.fn(),
    }

    router.registerProvider('primary', mockPrimary)

    await router.generateText('Generate dynamic test', { skipCache: true })
    await router.generateText('Generate dynamic test', { skipCache: true })

    expect(mockPrimary.generateText).toHaveBeenCalledTimes(2)
  })

  it('falls back to secondary provider if primary throws rate limit error', async () => {
    const mockFailingPrimary: IAIAgent = {
      generateText: jest.fn().mockRejectedValue(new Error('Rate limit exceeded (HTTP 429)')),
      generateChat: jest.fn(),
      generateJSON: jest.fn(),
    }

    const mockSecondary: IAIAgent = {
      generateText: jest.fn().mockResolvedValue({
        text: 'Response from Secondary Fallback',
        usage: { promptTokens: 12, completionTokens: 15, totalTokens: 27 },
      }),
      generateChat: jest.fn(),
      generateJSON: jest.fn(),
    }

    router.registerProvider('primary', mockFailingPrimary)
    router.registerProvider('secondary', mockSecondary)

    const result = await router.generateText('Explain merge sort', { skipCache: true })

    expect(result.text).toBe('Response from Secondary Fallback')
    expect(result.provider).toBe('secondary')
    expect(mockFailingPrimary.generateText).toHaveBeenCalledTimes(1)
    expect(mockSecondary.generateText).toHaveBeenCalledTimes(1)
  })

  it('falls back to MockAIAdapter if all external providers fail', async () => {
    const mockFailing1: IAIAgent = {
      generateText: jest.fn().mockRejectedValue(new Error('503 Service Unavailable')),
      generateChat: jest.fn(),
      generateJSON: jest.fn(),
    }
    const mockFailing2: IAIAgent = {
      generateText: jest.fn().mockRejectedValue(new Error('Timeout after 30s')),
      generateChat: jest.fn(),
      generateJSON: jest.fn(),
    }

    router.registerProvider('primary', mockFailing1)
    router.registerProvider('secondary', mockFailing2)
    router.registerProvider('mock', new MockAIAdapter())

    const result = await router.generateText('Emergency fallback query', { skipCache: true })

    expect(result.text).toContain('mocked AI text response')
    expect(result.provider).toBe('mock')
  })

  it('handles chat generation and fallback cleanly', async () => {
    const mockFailingPrimary: IAIAgent = {
      generateText: jest.fn(),
      generateChat: jest.fn().mockRejectedValue(new Error('Primary chat disconnected')),
      generateJSON: jest.fn(),
    }

    const mockSecondary: IAIAgent = {
      generateText: jest.fn(),
      generateChat: jest.fn().mockResolvedValue({
        text: 'Secondary chat response',
        usage: { promptTokens: 20, completionTokens: 20, totalTokens: 40 },
      }),
      generateJSON: jest.fn(),
    }

    router.registerProvider('primary', mockFailingPrimary)
    router.registerProvider('secondary', mockSecondary)

    const messages: AIMessage[] = [{ role: 'user', content: 'Hello tutor' }]
    const result = await router.generateChat(messages, { skipCache: true })

    expect(result.text).toBe('Secondary chat response')
    expect(result.provider).toBe('secondary')
  })

  it('handles structured JSON generation with provider failover', async () => {
    const mockFailingPrimary: IAIAgent = {
      generateText: jest.fn(),
      generateChat: jest.fn(),
      generateJSON: jest.fn().mockRejectedValue(new Error('Failed to parse JSON')),
    }

    const mockSecondary: IAIAgent = {
      generateText: jest.fn(),
      generateChat: jest.fn(),
      generateJSON: jest.fn().mockResolvedValue({ score: 95, verified: true }),
    }

    router.registerProvider('primary', mockFailingPrimary)
    router.registerProvider('secondary', mockSecondary)

    const json = await router.generateJSON<{ score: number; verified: boolean }>('Grade test')
    expect(json.score).toBe(95)
    expect(json.verified).toBe(true)
  })

  it('streams chat chunks and falls back if primary streaming fails', async () => {
    const mockFailingStreamPrimary: IAIAgent = {
      generateText: jest.fn(),
      generateChat: jest.fn(),
      generateJSON: jest.fn(),
      generateChatStream: jest.fn().mockImplementation(async function* () {
        throw new Error('Stream connection dropped')
      }),
    }

    const mockStreamingSecondary: IAIAgent = {
      generateText: jest.fn(),
      generateChat: jest.fn(),
      generateJSON: jest.fn(),
      generateChatStream: async function* () {
        yield 'Chunk1 '
        yield 'Chunk2 '
        yield 'Done'
      },
    }

    router.registerProvider('primary', mockFailingStreamPrimary)
    router.registerProvider('secondary', mockStreamingSecondary)

    const chunks: string[] = []
    for await (const chunk of router.generateChatStream([{ role: 'user', content: 'stream test' }])) {
      chunks.push(chunk)
    }

    expect(chunks.join('')).toBe('Chunk1 Chunk2 Done')
  })

  describe('AIServiceFactory Integration', () => {
    afterEach(() => {
      AIServiceFactory.initialize('gemini')
    })

    it('returns an AIRouter when provider is set to router', () => {
      AIServiceFactory.initialize('router')
      const agent = AIServiceFactory.getAgent()
      expect(agent).toBeInstanceOf(AIRouter)
    })

    it('returns dedicated router via getRouter()', () => {
      const customRouter = AIServiceFactory.getRouter()
      expect(customRouter).toBeInstanceOf(AIRouter)
    })
  })
})
