import { IAIAgent, AIProviderOptions, AIGenerationResult, AIMessage } from './AIAgent'
import logger from '../../utils/logger'
import { CircuitBreaker } from '../../utils/CircuitBreaker'
import { aiOperationsDuration, aiOperationsTotal } from '../../utils/metrics'

const MAX_RETRIES = 2
const BASE_DELAY_MS = 1000

export class AnthropicAdapter implements IAIAgent {
  private apiKey: string
  private baseUrl: string
  private defaultModel: string
  private circuitBreaker = new CircuitBreaker('AnthropicAPI', {
    failureThreshold: 4,
    resetTimeout: 30000,
  })

  constructor(apiKey?: string, model?: string, baseUrl?: string) {
    const key = apiKey ?? process.env.ANTHROPIC_API_KEY
    if (!key) {
      logger.warn('[AnthropicAdapter] ANTHROPIC_API_KEY is not configured')
      throw new Error('ANTHROPIC_API_KEY is missing')
    }
    this.apiKey = key
    this.defaultModel = model ?? process.env.ANTHROPIC_MODEL ?? 'claude-3-5-haiku-20241022'
    this.baseUrl = (baseUrl ?? process.env.ANTHROPIC_BASE_URL ?? 'https://api.anthropic.com/v1').replace(/\/$/, '')
  }

  private async withRetry<T>(operation: () => Promise<T>, operationName: string): Promise<T> {
    let lastError: Error | undefined
    const startTime = Date.now()

    for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
      try {
        const result = await this.circuitBreaker.execute(() => operation())
        try {
          aiOperationsDuration.observe(
            { operation: operationName, provider: 'anthropic' },
            (Date.now() - startTime) / 1000
          )
          aiOperationsTotal.inc({
            operation: operationName,
            status: 'success',
            provider: 'anthropic',
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
              provider: 'anthropic',
            })
          } catch {
            // Ignore metrics errors
          }
          throw lastError
        }

        const isRetryable =
          errorMessage.includes('429') ||
          errorMessage.includes('rate limit') ||
          errorMessage.includes('529') ||
          errorMessage.includes('503') ||
          errorMessage.includes('500') ||
          errorMessage.includes('timeout') ||
          errorMessage.includes('econnreset')

        if (!isRetryable || attempt === MAX_RETRIES) {
          try {
            aiOperationsTotal.inc({
              operation: operationName,
              status: 'error',
              provider: 'anthropic',
            })
          } catch {
            // Ignore metrics errors
          }
          throw lastError
        }

        const delay = BASE_DELAY_MS * Math.pow(2, attempt) + Math.random() * 200
        logger.warn(
          `[AnthropicAdapter] ${operationName} failed (attempt ${attempt + 1}/${MAX_RETRIES + 1}), retrying in ${Math.round(delay)}ms: ${lastError.message}`
        )
        await new Promise(resolve => setTimeout(resolve, delay))
      }
    }

    throw lastError || new Error(`[AnthropicAdapter] ${operationName} failed after ${MAX_RETRIES} retries`)
  }

  private formatMessages(messages: AIMessage[]): { system?: string; messages: { role: 'user' | 'assistant'; content: string }[] } {
    let systemText = ''
    const filteredMessages: { role: 'user' | 'assistant'; content: string }[] = []

    for (const m of messages) {
      if (m.role === 'system') {
        systemText += (systemText ? '\n\n' : '') + m.content
      } else {
        filteredMessages.push({ role: m.role, content: m.content })
      }
    }

    // Anthropic requires at least one user message
    if (filteredMessages.length === 0) {
      filteredMessages.push({ role: 'user', content: 'Hello' })
    }

    return {
      system: systemText || undefined,
      messages: filteredMessages,
    }
  }

  private async postMessages(body: Record<string, unknown>): Promise<Response> {
    const res = await fetch(`${this.baseUrl}/messages`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': this.apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify(body),
    })

    if (!res.ok) {
      const errorText = await res.text().catch(() => '')
      throw new Error(`Anthropic API error [${res.status}]: ${errorText || res.statusText}`)
    }

    return res
  }

  async generateText(prompt: string, options?: AIProviderOptions): Promise<AIGenerationResult> {
    return this.withRetry(async () => {
      const model = options?.model || this.defaultModel
      const res = await this.postMessages({
        model,
        messages: [{ role: 'user', content: prompt }],
        max_tokens: options?.maxTokens ?? 2048,
        temperature: options?.temperature ?? 0.7,
      })

      const data = (await res.json()) as any
      const text = data?.content?.[0]?.text ?? ''
      return {
        text,
        usage: {
          promptTokens: data?.usage?.input_tokens ?? 0,
          completionTokens: data?.usage?.output_tokens ?? 0,
          totalTokens: (data?.usage?.input_tokens ?? 0) + (data?.usage?.output_tokens ?? 0),
        },
        provider: 'anthropic',
      }
    }, 'generateText')
  }

  async generateChat(messages: AIMessage[], options?: AIProviderOptions): Promise<AIGenerationResult> {
    return this.withRetry(async () => {
      const model = options?.model || this.defaultModel
      const { system, messages: formatted } = this.formatMessages(messages)
      const res = await this.postMessages({
        model,
        system,
        messages: formatted,
        max_tokens: options?.maxTokens ?? 2048,
        temperature: options?.temperature ?? 0.7,
      })

      const data = (await res.json()) as any
      const text = data?.content?.[0]?.text ?? ''
      return {
        text,
        usage: {
          promptTokens: data?.usage?.input_tokens ?? 0,
          completionTokens: data?.usage?.output_tokens ?? 0,
          totalTokens: (data?.usage?.input_tokens ?? 0) + (data?.usage?.output_tokens ?? 0),
        },
        provider: 'anthropic',
      }
    }, 'generateChat')
  }

  async generateJSON<T>(prompt: string, options?: AIProviderOptions): Promise<T> {
    return this.withRetry(async () => {
      const model = options?.model || this.defaultModel
      const res = await this.postMessages({
        model,
        system: 'You are a precise backend system. Return only valid, minified JSON without any surrounding text or markdown formatting.',
        messages: [{ role: 'user', content: prompt }],
        max_tokens: options?.maxTokens ?? 2048,
        temperature: options?.temperature ?? 0.2,
      })

      const data = (await res.json()) as any
      let content = data?.content?.[0]?.text ?? '{}'
      content = content.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '').trim()
      return JSON.parse(content) as T
    }, 'generateJSON')
  }

  async *generateChatStream(
    messages: AIMessage[],
    options?: AIProviderOptions
  ): AsyncGenerator<string, void, unknown> {
    const model = options?.model || this.defaultModel
    const { system, messages: formatted } = this.formatMessages(messages)
    const res = await this.postMessages({
      model,
      system,
      messages: formatted,
      max_tokens: options?.maxTokens ?? 2048,
      temperature: options?.temperature ?? 0.7,
      stream: true,
    })

    if (!res.body) {
      throw new Error('[AnthropicAdapter] Response body is empty for stream')
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
          if (trimmed.startsWith('data: ')) {
            try {
              const json = JSON.parse(trimmed.substring(6))
              if (json.type === 'content_block_delta' && json.delta?.type === 'text_delta') {
                yield json.delta.text
              }
            } catch {
              // Ignore partial JSON
            }
          }
        }
      }
    } finally {
      reader.releaseLock()
    }
  }
}
