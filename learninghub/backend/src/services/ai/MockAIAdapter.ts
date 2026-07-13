import { IAIAgent, AIProviderOptions, AIGenerationResult, AIMessage } from './AIAgent'
import logger from '../../utils/logger'

export class MockAIAdapter implements IAIAgent {
  async generateText(prompt: string, options?: AIProviderOptions): Promise<AIGenerationResult> {
    logger.info('[MockAIAdapter] generateText called', {
      promptLength: prompt.length,
      model: options?.model,
    })
    return {
      text: 'This is a mocked AI text response. The real AI service is either disabled or unreachable.',
      usage: { promptTokens: 10, completionTokens: 20, totalTokens: 30 },
    }
  }

  async generateChat(
    messages: AIMessage[],
    options?: AIProviderOptions
  ): Promise<AIGenerationResult> {
    logger.info('[MockAIAdapter] generateChat called', {
      messagesCount: messages.length,
      model: options?.model,
    })

    const lastMessage = messages[messages.length - 1]?.content || ''
    let text = 'This is a mocked AI chat response.'
    if (lastMessage.toLowerCase().includes('hello world')) {
      text =
        'Here is your code:\n```javascript\nfunction helloWorld() {\n  console.log("hello world");\n}\n```'
    }

    return {
      text,
      usage: { promptTokens: 15, completionTokens: 25, totalTokens: 40 },
    }
  }

  async *generateChatStream(
    messages: AIMessage[],
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    options?: AIProviderOptions
  ): AsyncGenerator<string, void, unknown> {
    logger.info('[MockAIAdapter] generateChatStream called')
    const lastMessage = messages[messages.length - 1]?.content || ''
    let text = 'This is a mocked AI chat response.'
    if (lastMessage.toLowerCase().includes('hello world')) {
      text =
        'Here is your code:\n```javascript\nfunction helloWorld() {\n  console.log("hello world");\n}\n```'
    }

    // Yield chunks to simulate streaming
    const words = text.split(' ')
    for (const word of words) {
      yield `${word} `
      await new Promise(r => setTimeout(r, 20)) // mock streaming delay
    }
  }

  async generateJSON<T>(prompt: string, options?: AIProviderOptions): Promise<T> {
    logger.info('[MockAIAdapter] generateJSON called', {
      promptLength: prompt.length,
      model: options?.model,
    })

    // Provide a mocked response that satisfies the subjective grading and test generation schema
    if (
      prompt.includes('score the following subjective answer') ||
      prompt.includes('Grade the following subjective answer')
    ) {
      return {
        score: 5,
        feedback:
          '[MOCK] Your answer was evaluated by the mock fallback. This is a generic response.',
      } as unknown as T
    }

    // Default mock test generation
    return {
      questions: Array.from({ length: 5 }).map((_, i) => ({
        text: `[MOCK FALLBACK] Sample Question ${i + 1}`,
        options: [
          { id: 'a', text: 'Option A (Correct)' },
          { id: 'b', text: 'Option B' },
          { id: 'c', text: 'Option C' },
          { id: 'd', text: 'Option D' },
        ],
        correct_option_id: 'a',
        explanation: 'This is a mocked fallback explanation.',
        difficulty: 'MEDIUM',
        bloom_level: 'UNDERSTAND',
        tags: ['mock', 'fallback'],
      })),
    } as unknown as T
  }
}
