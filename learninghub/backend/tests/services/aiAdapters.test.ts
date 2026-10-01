import { MockAIAdapter } from '../../src/services/ai/MockAIAdapter'
import { AIServiceFactory } from '../../src/services/ai/AIServiceFactory'
import { GeminiAdapter } from '../../src/services/ai/GeminiAdapter'

describe('AI Adapters', () => {
  describe('MockAIAdapter', () => {
    let adapter: MockAIAdapter

    beforeEach(() => {
      adapter = new MockAIAdapter()
    })

    it('generates mock text response with usage metrics', async () => {
      const result = await adapter.generateText('Explain binary search')
      expect(result.text).toBeDefined()
      expect(result.text).toContain('mocked AI text response')
      expect(result.usage).toBeDefined()
      expect(result.usage?.totalTokens).toBeGreaterThan(0)
    })

    it('generates chat responses based on user query', async () => {
      const chatResult = await adapter.generateChat([
        { role: 'user', content: 'hello world in js' },
      ])
      expect(chatResult.text).toContain('helloWorld')
      expect(chatResult.usage?.totalTokens).toBe(40)
    })

    it('streams chat chunks correctly', async () => {
      const stream = adapter.generateChatStream([{ role: 'user', content: 'tell me a story' }])
      const chunks: string[] = []

      for await (const chunk of stream) {
        chunks.push(chunk)
      }

      expect(chunks.length).toBeGreaterThan(0)
      const fullText = chunks.join('')
      expect(fullText).toContain('This is a mocked AI chat response')
    })

    it('generates structured JSON for subjective answer grading', async () => {
      const gradingPrompt = 'Grade the following subjective answer for question 1'
      const jsonResult = await adapter.generateJSON<{ score: number; feedback: string }>(
        gradingPrompt
      )

      expect(jsonResult.score).toBe(5)
      expect(jsonResult.feedback).toContain('[MOCK]')
    })

    it('generates structured JSON for test creation', async () => {
      const testPrompt = 'Generate a 5 question quiz on Python'
      const jsonResult = await adapter.generateJSON<{ questions: any[] }>(testPrompt)

      expect(jsonResult.questions).toHaveLength(5)
      expect(jsonResult.questions[0].options).toHaveLength(4)
      expect(jsonResult.questions[0].correct_option_id).toBe('a')
    })
  })

  describe('AIServiceFactory', () => {
    it('returns MockAIAdapter when mock provider is configured', () => {
      AIServiceFactory.initialize('mock')
      const agent = AIServiceFactory.getAgent()
      expect(agent).toBeDefined()
    })
  })

  describe('GeminiAdapter Configuration', () => {
    it('throws error when GEMINI_API_KEY is missing', () => {
      const originalKey = process.env.GEMINI_API_KEY
      delete process.env.GEMINI_API_KEY

      expect(() => new GeminiAdapter()).toThrow(/GEMINI_API_KEY is missing/)

      process.env.GEMINI_API_KEY = originalKey
    })

    it('initializes cleanly when API key is provided', () => {
      const adapter = new GeminiAdapter('test-gemini-key-12345', 'gemini-2.0-flash')
      expect(adapter).toBeDefined()
    })
  })
})
