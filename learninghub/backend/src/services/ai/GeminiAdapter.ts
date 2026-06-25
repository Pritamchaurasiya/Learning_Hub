import { GoogleGenerativeAI } from '@google/generative-ai'
import { IAIAgent, AIProviderOptions, AIGenerationResult, AIMessage } from './AIAgent'
import logger from '../../utils/logger'
import { CircuitBreaker } from '../../utils/CircuitBreaker'

const MAX_RETRIES = 3
const BASE_DELAY_MS = 1000 // 1 second, doubles each retry

export class GeminiAdapter implements IAIAgent {
  private ai: GoogleGenerativeAI
  private defaultModel = 'gemini-1.5-flash'
  private circuitBreaker = new CircuitBreaker('GeminiAPI', {
    failureThreshold: 5,
    resetTimeout: 30000,
  })

  constructor(apiKey?: string) {
    const key = apiKey ?? process.env.GEMINI_API_KEY
    if (!key) {
      logger.error('[GeminiAdapter] GEMINI_API_KEY is not configured')
      throw new Error('GEMINI_API_KEY is missing')
    }
    this.ai = new GoogleGenerativeAI(key)
  }

  /**
   * Retry wrapper with exponential backoff for transient API failures.
   * Retries on 429 (rate limit), 503 (service unavailable), and network errors.
   */
  private async withRetry<T>(operation: () => Promise<T>, operationName: string): Promise<T> {
    let lastError: Error | undefined

    for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
      try {
        return await this.circuitBreaker.execute(() => operation())
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error))
        const errorMessage = lastError.message.toLowerCase()

        // Don't retry if the circuit is open
        if (errorMessage.includes('circuitbreaker is open')) {
          throw lastError
        }

        // Only retry on transient errors
        const isRetryable =
          errorMessage.includes('429') ||
          errorMessage.includes('rate limit') ||
          errorMessage.includes('503') ||
          errorMessage.includes('service unavailable') ||
          errorMessage.includes('internal') ||
          errorMessage.includes('deadline') ||
          errorMessage.includes('timeout') ||
          errorMessage.includes('econnreset') ||
          errorMessage.includes('enotfound')

        if (!isRetryable || attempt === MAX_RETRIES) {
          logger.error(
            `[GeminiAdapter] ${operationName} failed after ${attempt + 1} attempt(s)`,
            lastError
          )
          throw lastError
        }

        const delayMs = BASE_DELAY_MS * Math.pow(2, attempt) + Math.random() * 500
        logger.warn(
          `[GeminiAdapter] ${operationName} attempt ${attempt + 1} failed (${lastError.message}), retrying in ${Math.round(delayMs)}ms`
        )
        await new Promise(resolve => setTimeout(resolve, delayMs))
      }
    }

    throw lastError!
  }

  async generateText(prompt: string, options?: AIProviderOptions): Promise<AIGenerationResult> {
    return this.withRetry(async () => {
      const model = this.ai.getGenerativeModel({
        model: options?.model ?? this.defaultModel,
        generationConfig: {
          temperature: options?.temperature ?? 0.7,
          maxOutputTokens: options?.maxTokens ?? 2048,
        },
      })

      const result = await model.generateContent(prompt)
      const response = await result.response

      return {
        text: response.text(),
        usage: response.usageMetadata
          ? {
              promptTokens: response.usageMetadata.promptTokenCount,
              completionTokens: response.usageMetadata.candidatesTokenCount,
              totalTokens: response.usageMetadata.totalTokenCount,
            }
          : undefined,
      }
    }, 'generateText')
  }

  async generateChat(
    messages: AIMessage[],
    options?: AIProviderOptions
  ): Promise<AIGenerationResult> {
    return this.withRetry(async () => {
      const systemMessage = messages.find(m => m.role === 'system')

      const model = this.ai.getGenerativeModel({
        model: options?.model ?? this.defaultModel,
        generationConfig: {
          temperature: options?.temperature ?? 0.7,
          maxOutputTokens: options?.maxTokens ?? 2048,
        },
        ...(systemMessage && { systemInstruction: systemMessage.content }),
      })

      // Convert generic messages to Gemini format
      const history = messages
        .filter(m => m.role !== 'system')
        .map(m => ({
          role: m.role === 'assistant' ? 'model' : 'user',
          parts: [{ text: m.content }],
        }))

      // We extract the last message to send, and the rest is history
      const latestMessage = history.pop()?.parts[0].text ?? ''

      const chat = model.startChat({ history })
      const result = await chat.sendMessage(latestMessage)
      const response = await result.response

      return {
        text: response.text(),
      }
    }, 'generateChat')
  }

  async *generateChatStream(
    messages: AIMessage[],
    options?: AIProviderOptions
  ): AsyncGenerator<string, void, unknown> {
    try {
      const systemMessage = messages.find(m => m.role === 'system')

      const model = this.ai.getGenerativeModel({
        model: options?.model ?? this.defaultModel,
        generationConfig: {
          temperature: options?.temperature ?? 0.7,
          maxOutputTokens: options?.maxTokens ?? 2048,
        },
        ...(systemMessage && { systemInstruction: systemMessage.content }),
      })

      const history = messages
        .filter(m => m.role !== 'system')
        .map(m => ({
          role: m.role === 'assistant' ? 'model' : 'user',
          parts: [{ text: m.content }],
        }))

      const latestMessage = history.pop()?.parts[0].text ?? ''

      const chat = model.startChat({ history })
      const result = await chat.sendMessageStream(latestMessage)

      for await (const chunk of result.stream) {
        yield chunk.text()
      }
    } catch (error) {
      logger.error('[GeminiAdapter] generateChatStream failed', error as Error)
      throw error
    }
  }

  async generateJSON<T>(prompt: string, options?: AIProviderOptions): Promise<T> {
    return this.withRetry(async () => {
      // For JSON generation, Gemini Flash/Pro 1.5 natively supports response_mime_type
      const model = this.ai.getGenerativeModel({
        model: options?.model ?? this.defaultModel,
        generationConfig: {
          temperature: options?.temperature ?? 0.2, // Lower temp for structured output
          maxOutputTokens: options?.maxTokens ?? 2048,
          responseMimeType: 'application/json',
        },
      })

      const result = await model.generateContent(prompt)
      const response = await result.response
      const text = response.text()

      // Gemini sometimes wraps in ```json ... ``` even with responseMimeType
      let cleanText = text.trim()
      if (cleanText.startsWith('```json')) {
        cleanText = cleanText
          .replace(/```json/, '')
          .replace(/```$/, '')
          .trim()
      } else if (cleanText.startsWith('```')) {
        cleanText = cleanText.replace(/```/, '').replace(/```$/, '').trim()
      }

      return JSON.parse(cleanText) as T
    }, 'generateJSON')
  }
}
