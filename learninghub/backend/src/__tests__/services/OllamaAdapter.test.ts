import { OllamaAdapter } from '../../services/ai/OllamaAdapter'

describe('OllamaAdapter (Free, Local, Private & Offline Models)', () => {
  const originalFetch = global.fetch

  afterEach(() => {
    global.fetch = originalFetch
    jest.clearAllMocks()
  })

  it('should detect when local Ollama is available', async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: jest.fn().mockResolvedValue({
        models: [{ name: 'deepseek-r1:latest' }, { name: 'llama3.3:latest' }],
      }),
    } as any)

    const adapter = new OllamaAdapter('http://localhost:11434')
    const isAvailable = await adapter.isAvailable()
    const models = await adapter.getInstalledModels()

    expect(isAvailable).toBe(true)
    expect(models).toEqual(['deepseek-r1:latest', 'llama3.3:latest'])
  })

  it('should return false for isAvailable when connection refused', async () => {
    global.fetch = jest.fn().mockRejectedValue(new Error('connect ECONNREFUSED 127.0.0.1:11434'))

    const adapter = new OllamaAdapter('http://localhost:11434')
    const isAvailable = await adapter.isAvailable()

    expect(isAvailable).toBe(false)
  })

  it('should generate text from local model', async () => {
    const mockResponse = {
      message: {
        content: 'Local DeepSeek R1 reasoning: Time complexity is O(V + E).',
      },
      prompt_eval_count: 18,
      eval_count: 22,
    }

    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: jest.fn().mockResolvedValue(mockResponse),
    } as any)

    const adapter = new OllamaAdapter('http://localhost:11434', 'deepseek-r1:latest')
    const result = await adapter.generateText('What is Dijkstra time complexity?')

    expect(result.text).toContain('Time complexity is O(V + E)')
    expect(result.provider).toBe('ollama')
    expect(result.usage?.totalTokens).toBe(40)
  })

  it('should generate structured JSON format from local model', async () => {
    const mockJson = { solved: true, steps: 3 }
    const mockResponse = {
      message: {
        content: JSON.stringify(mockJson),
      },
    }

    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: jest.fn().mockResolvedValue(mockResponse),
    } as any)

    const adapter = new OllamaAdapter('http://localhost:11434')
    const result = await adapter.generateJSON<{ solved: boolean; steps: number }>(
      'Solve puzzle in json'
    )

    expect(result.solved).toBe(true)
    expect(result.steps).toBe(3)
  })
})
