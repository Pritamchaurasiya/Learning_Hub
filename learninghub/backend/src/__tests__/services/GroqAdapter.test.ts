import { GroqAdapter } from '../../services/ai/GroqAdapter'

describe('GroqAdapter (Free & Ultra-Fast Cloud Models)', () => {
  const originalFetch = global.fetch
  const originalApiKey = process.env.GROQ_API_KEY

  beforeEach(() => {
    process.env.GROQ_API_KEY = 'mock'
  })

  afterEach(() => {
    global.fetch = originalFetch
    process.env.GROQ_API_KEY = originalApiKey
    jest.clearAllMocks()
  })

  it('should throw error when GROQ_API_KEY is missing', () => {
    delete process.env.GROQ_API_KEY
    expect(() => new GroqAdapter(undefined)).toThrow('GROQ_API_KEY is missing')
  })

  it('should generate text using DeepSeek R1 model', async () => {
    const mockResponse = {
      choices: [
        {
          message: {
            content: 'Step 1: Analyze problem. Step 2: Optimal O(N log N) solution.',
          },
        },
      ],
      usage: {
        prompt_tokens: 25,
        completion_tokens: 30,
        total_tokens: 55,
      },
    }

    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: jest.fn().mockResolvedValue(mockResponse),
    } as any)

    const adapter = new GroqAdapter('test-groq-key-not-a-secret', 'deepseek-r1-distill-llama-70b')
    const result = await adapter.generateText('Explain binary search')

    expect(result.text).toContain('Optimal O(N log N) solution')
    expect(result.provider).toBe('groq')
    expect(result.usage?.totalTokens).toBe(55)
    expect(global.fetch).toHaveBeenCalledWith(
      expect.stringContaining('/chat/completions'),
      expect.objectContaining({
        method: 'POST',
        headers: expect.objectContaining({
          Authorization: 'Bearer mock',
        }),
      })
    )
  })

  it('should generate chat response across multi-turn dialog', async () => {
    const mockResponse = {
      choices: [
        {
          message: {
            content: 'Here is the Llama 3.3 recursive solution.',
          },
        },
      ],
      usage: { prompt_tokens: 15, completion_tokens: 15, total_tokens: 30 },
    }

    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: jest.fn().mockResolvedValue(mockResponse),
    } as any)

    const adapter = new GroqAdapter('mock', 'llama-3.3-70b-versatile')
    const result = await adapter.generateChat([
      { role: 'user', content: 'How do I invert a binary tree?' },
    ])

    expect(result.text).toContain('recursive solution')
    expect(result.provider).toBe('groq')
  })

  it('should generate structured JSON output', async () => {
    const mockJson = { concepts: ['DFS', 'BFS'], difficulty: 'Medium' }
    const mockResponse = {
      choices: [
        {
          message: {
            content: JSON.stringify(mockJson),
          },
        },
      ],
    }

    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: jest.fn().mockResolvedValue(mockResponse),
    } as any)

    const adapter = new GroqAdapter('mock')
    const result = await adapter.generateJSON<{ concepts: string[]; difficulty: string }>(
      'Return graph algorithms in json'
    )

    expect(result.concepts).toEqual(['DFS', 'BFS'])
    expect(result.difficulty).toBe('Medium')
  })
})
