import { IAIAgent, AIProviderOptions, AIGenerationResult, AIMessage } from './AIAgent'
import logger from '../../utils/logger'
import { CircuitBreaker } from '../../utils/CircuitBreaker'
import { aiOperationsDuration, aiOperationsTotal } from '../../utils/metrics'

const MAX_RETRIES = 2
const BASE_DELAY_MS = 1000

export class OpenAIAdapter implements IAIAgent {
  private apiKey: string
  private baseUrl: string
  private defaultModel: string
  private circuitBreaker = new CircuitBreaker('OpenAIAPI', {
    failureThreshold: 4,
    resetTimeout: 30000,
  })

  constructor(apiKey?: string, model?: string, baseUrl?: string) {
    const key = apiKey ?? process.env.OPENAI_API_KEY
    if (!key) {
      logger.warn('[OpenAIAdapter] OPENAI_API_KEY is not configured')
      throw new Error('OPENAI_API_KEY is missing')
    }
    this.apiKey = key
    this.defaultModel = model ?? process.env.OPENAI_MODEL ?? 'gpt-4o-mini'
    this.baseUrl = (baseUrl ?? process.env.OPENAI_BASE_URL ?? 'https://api.openai.com/v1').replace(/\/$/, '')
  }

  private async withRetry<T>(operation: () => Promise<T>, operationName: string): Promise<T> {
    let lastError: Error | undefined
    const startTime = Date.now()

    for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
      try {
        const result = await this.circuitBreaker.execute(() => operation())
        try {
          aiOperationsDuration.observe(
            { operation: operationName, provider: 'openai' },
            (Date.now() - startTime) / 1000
          )
          aiOperationsTotal.inc({
            operation: operationName,
            status: 'success',
            provider: 'openai',
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
              provider: 'openai',
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
              provider: 'openai',
            })
          } catch {
            // Ignore metrics errors
          }
          throw lastError
        }

        const delay = BASE_DELAY_MS * Math.pow(2, attempt) + Math.random() * 200
        logger.warn(
          `[OpenAIAdapter] ${operationName} failed (attempt ${attempt + 1}/${MAX_RETRIES + 1}), retrying in ${Math.round(delay)}ms: ${lastError.message}`
        )
        await new Promise(resolve => setTimeout(resolve, delay))
      }
    }

    throw lastError || new Error(`[OpenAIAdapter] ${operationName} failed after ${MAX_RETRIES} retries`)
  }

  private async postChat(body: Record<string, unknown>, stream = false): Promise<Response> {
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
      throw new Error(`OpenAI API error [${res.status}]: ${errorText || res.statusText}`)
    }

    return res
  }

  async generateText(prompt: string, options?: AIProviderOptions): Promise<AIGenerationResult> {
    return this.withRetry(async () => {
      const model = options?.model || this.defaultModel
      const res = await this.postChat({
        model,
        messages: [{ role: 'user', content: prompt }],
        temperature: options?.temperature ?? 0.7,
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
        provider: 'openai',
      }
    }, 'generateText')
  }

  async generateChat(messages: AIMessage[], options?: AIProviderOptions): Promise<AIGenerationResult> {
    return this.withRetry(async () => {
      const model = options?.model || this.defaultModel
      const res = await this.postChat({
        model,
        messages: messages.map(m => ({ role: m.role, content: m.content })),
        temperature: options?.temperature ?? 0.7,
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
        provider: 'openai',
      }
    }, 'generateChat')
  }

  async generateJSON<T>(prompt: string, options?: AIProviderOptions): Promise<T> {
    return this.withRetry(async () => {
      const model = options?.model || this.defaultModel
      const res = await this.postChat({
        model,
        messages: [
          {
            role: 'system',
            content: 'You are a precise backend system that strictly returns valid, minified JSON without commentary.',
          },
          { role: 'user', content: prompt },
        ],
        temperature: options?.temperature ?? 0.2,
        response_format: { type: 'json_object' },
      })

      const data = (await res.json()) as any
      let content = data?.choices?.[0]?.message?.content ?? '{}'
      content = content.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '').trim()
      return JSON.parse(content) as T
    }, 'generateJSON')
  }

  async *generateChatStream(
    messages: AIMessage[],
    options?: AIProviderOptions
  ): AsyncGenerator<string, void, unknown> {
    const model = options?.model || this.defaultModel
    const res = await this.postChat(
      {
        model,
        messages: messages.map(m => ({ role: m.role, content: m.content })),
        temperature: options?.temperature ?? 0.7,
        max_tokens: options?.maxTokens ?? 2048,
        stream: true,
      },
      true
    )

    if (!res.body) {
      throw new Error('[OpenAIAdapter] Response body is empty for stream')
    }

    const reader = res.body.getReader()
    const decoder = new TextDecoder('utf-8')
    let buffer = ''

    try {
      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        buffer += decoder.decode(value, { stream: true })
        const lines = buffer.split('\n')
        buffer = lines.pop() ?? ''

        for (const line of lines) {
          const trimmed = line.trim()
          if (!trimmed || trimmed.startsWith(':')) continue
          if (trimmed === 'data: [DONE]') return
          if (trimmed.startsWith('data: ')) {
            try {
              const json = JSON.parse(trimmed.substring(6))
              const delta = json.choices?.[0]?.delta?.content
              if (delta) {
                yield delta
              }
            } catch {
              // Ignore partial JSON parse errors
            }
          }
        }
      }
    } finally {
      reader.releaseLock()
    }
  }
}
