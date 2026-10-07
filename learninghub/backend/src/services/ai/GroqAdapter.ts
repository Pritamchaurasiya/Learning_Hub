import { IAIAgent, AIProviderOptions, AIGenerationResult, AIMessage } from './AIAgent'
import logger from '../../utils/logger'
import { CircuitBreaker } from '../../utils/CircuitBreaker'
import { aiOperationsDuration, aiOperationsTotal } from '../../utils/metrics'

const MAX_RETRIES = 2
const BASE_DELAY_MS = 1000

export interface GroqModelConfig {
  id: string
  name: string
  contextWindow: number
  isFreeTier: boolean
  specialty: string
}

export const GROQ_SUPPORTED_MODELS: GroqModelConfig[] = [
  {
    id: 'deepseek-r1-distill-llama-70b',
    name: 'DeepSeek R1 (Distill 70B)',
    contextWindow: 128000,
    isFreeTier: true,
    specialty: 'State-of-the-Art Reasoning & Socratic Deductions',
  },
  {
    id: 'llama-3.3-70b-versatile',
    name: 'Meta Llama 3.3 (70B Versatile)',
    contextWindow: 128000,
    isFreeTier: true,
    specialty: 'Full-Spectrum Complex Coding & Systems Engineering',
  },
  {
    id: 'llama-3.1-8b-instant',
    name: 'Meta Llama 3.1 (8B Instant)',
    contextWindow: 128000,
    isFreeTier: true,
    specialty: 'Ultra-Low Latency (<100ms TTFT) Micro-Tutoring',
  },
  {
    id: 'gemma2-9b-it',
    name: 'Google Gemma 2 (9B Instruct)',
    contextWindow: 8192,
    isFreeTier: true,
    specialty: 'Concise Explanation & Socratic Hints',
  },
]

/**
 * GroqAdapter provides ultra-fast (300-800 tok/sec) inference for top open-source models
 * (DeepSeek-R1, Llama 3.3 70B, etc.) via Groq's high-performance LPU cloud API.
 * Free-tier eligible.
 */
export class GroqAdapter implements IAIAgent {
  private apiKey: string
  private baseUrl: string
  private defaultModel: string
  private circuitBreaker = new CircuitBreaker('GroqAPI', {
    failureThreshold: 4,
    resetTimeout: 30000,
  })

  constructor(apiKey?: string, model?: string, baseUrl?: string) {
    const key = apiKey ?? process.env.GROQ_API_KEY
    if (!key) {
      logger.warn('[GroqAdapter] GROQ_API_KEY is not configured')
      throw new Error('GROQ_API_KEY is missing')
    }
    this.apiKey = key
    this.defaultModel = model ?? process.env.GROQ_MODEL ?? 'deepseek-r1-distill-llama-70b'
    this.baseUrl = (baseUrl ?? process.env.GROQ_BASE_URL ?? 'https://api.groq.com/openai/v1').replace(/\/$/, '')
  }

  private async withRetry<T>(operation: () => Promise<T>, operationName: string): Promise<T> {
    let lastError: Error | undefined
    const startTime = Date.now()

    for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
      try {
        const result = await this.circuitBreaker.execute(() => operation())
        try {
          aiOperationsDuration.observe(
            { operation: operationName, provider: 'groq' },
            (Date.now() - startTime) / 1000
          )
          aiOperationsTotal.inc({
            operation: operationName,
            status: 'success',
            provider: 'groq',
          })
        } catch {
          // Ignore metrics errors
        }
        return result
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error))
        const errorMessage = lastError.message.toLowerCase()

        if (errorMessage.includes('circuitbreaker is open')) {
          try {
            aiOperationsTotal.inc({
              operation: operationName,
              status: 'circuit_open',
              provider: 'groq',
            })
          } catch {
            // Ignore metrics errors
          }
          throw lastError
        }

        const isRetryable =
          errorMessage.includes('429') ||
          errorMessage.includes('rate limit') ||
          errorMessage.includes('503') ||
          errorMessage.includes('502') ||
          errorMessage.includes('500') ||
          errorMessage.includes('timeout') ||
          errorMessage.includes('econnreset')

        if (!isRetryable || attempt === MAX_RETRIES) {
          try {
            aiOperationsTotal.inc({
              operation: operationName,
              status: 'error',
              provider: 'groq',
            })
          } catch {
            // Ignore metrics errors
          }
          throw lastError
        }

        const delay = BASE_DELAY_MS * Math.pow(2, attempt) + Math.random() * 200
        logger.warn(
          `[GroqAdapter] ${operationName} failed (attempt ${attempt + 1}/${MAX_RETRIES + 1}), retrying in ${Math.round(delay)}ms: ${lastError.message}`
        )
        await new Promise(resolve => setTimeout(resolve, delay))
      }
    }

    throw lastError || new Error(`[GroqAdapter] ${operationName} failed after ${MAX_RETRIES} retries`)
  }

  private async postChat(body: Record<string, unknown>): Promise<Response> {
    const res = await fetch(`${this.baseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${this.apiKey}`,
      },
      body: JSON.stringify(body),
    })

    if (!res.ok) {
      const errorText = await res.text().catch(() => '')
      throw new Error(`Groq API error [${res.status}]: ${errorText || res.statusText}`)
    }

    return res
  }

  async generateText(prompt: string, options?: AIProviderOptions): Promise<AIGenerationResult> {
    return this.withRetry(async () => {
      const startTime = Date.now()
      const model = options?.model || this.defaultModel
      const res = await this.postChat({
        model,
        messages: [{ role: 'user', content: prompt }],
        temperature: options?.temperature ?? 0.6,
        max_tokens: options?.maxTokens ?? 2048,
      })

      const data = (await res.json()) as any
      const text = data?.choices?.[0]?.message?.content ?? ''
      return {
        text,
        usage: {
          promptTokens: data?.usage?.prompt_tokens ?? 0,
          completionTokens: data?.usage?.completion_tokens ?? 0,
          totalTokens: data?.usage?.total_tokens ?? 0,
        },
        provider: 'groq',
        latencyMs: Date.now() - startTime,
      }
    }, 'generateText')
  }

  async generateChat(messages: AIMessage[], options?: AIProviderOptions): Promise<AIGenerationResult> {
    return this.withRetry(async () => {
      const startTime = Date.now()
      const model = options?.model || this.defaultModel
      const res = await this.postChat({
        model,
        messages: messages.map(m => ({ role: m.role, content: m.content })),
        temperature: options?.temperature ?? 0.6,
        max_tokens: options?.maxTokens ?? 2048,
      })

      const data = (await res.json()) as any
      const text = data?.choices?.[0]?.message?.content ?? ''
      return {
        text,
        usage: {
          promptTokens: data?.usage?.prompt_tokens ?? 0,
          completionTokens: data?.usage?.completion_tokens ?? 0,
          totalTokens: data?.usage?.total_tokens ?? 0,
        },
        provider: 'groq',
        latencyMs: Date.now() - startTime,
      }
    }, 'generateChat')
  }

  async generateJSON<T>(prompt: string, options?: AIProviderOptions): Promise<T> {
    return this.withRetry(async () => {
      const model = options?.model || this.defaultModel
      const systemInstruction: AIMessage = {
        role: 'system',
        content: 'You are a precise JSON generator. Output only valid raw JSON. Do not include Markdown blocks, markdown fences, or conversational filler.',
      }

      const res = await this.postChat({
        model,
        messages: [systemInstruction, { role: 'user', content: prompt }],
        temperature: options?.temperature ?? 0.2,
        response_format: { type: 'json_object' },
      })

      const data = (await res.json()) as any
      const text = data?.choices?.[0]?.message?.content ?? ''

      const cleanText = text
        .replace(/^```json\s*/i, '')
        .replace(/^```\s*/i, '')
        .replace(/\s*```$/i, '')
        .trim()

      return JSON.parse(cleanText) as T
    }, 'generateJSON')
  }

  async *generateChatStream(
    messages: AIMessage[],
    options?: AIProviderOptions
  ): AsyncGenerator<string, void, unknown> {
    const model = options?.model || this.defaultModel
    const res = await fetch(`${this.baseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${this.apiKey}`,
      },
      body: JSON.stringify({
        model,
        messages: messages.map(m => ({ role: m.role, content: m.content })),
        temperature: options?.temperature ?? 0.6,
        max_tokens: options?.maxTokens ?? 2048,
        stream: true,
      }),
    })

    if (!res.ok) {
      const errorText = await res.text().catch(() => '')
      throw new Error(`Groq stream error [${res.status}]: ${errorText || res.statusText}`)
    }

    if (!res.body) {
      throw new Error('Groq stream response body is null')
    }

    const reader = res.body.getReader()
    const decoder = new TextDecoder()
    let buffer = ''

    while (true) {
      const { done, value } = await reader.read()
      if (done) break
      buffer += decoder.decode(value, { stream: true })
      const lines = buffer.split('\n')
      buffer = lines.pop() ?? ''

      for (const line of lines) {
        const trimmed = line.trim()
        if (!trimmed || !trimmed.startsWith('data:')) continue
        const dataStr = trimmed.slice(5).trim()
        if (dataStr === '[DONE]') return

        try {
          const parsed = JSON.parse(dataStr)
          const content = parsed.choices?.[0]?.delta?.content
          if (content) yield content
        } catch {
          // Ignore partial or unparseable frames
        }
      }
    }
  }
}
