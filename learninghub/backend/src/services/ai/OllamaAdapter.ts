import { IAIAgent, AIProviderOptions, AIGenerationResult, AIMessage } from './AIAgent'
import logger from '../../utils/logger'
import { CircuitBreaker } from '../../utils/CircuitBreaker'
import { aiOperationsDuration, aiOperationsTotal } from '../../utils/metrics'

const MAX_RETRIES = 2
const BASE_DELAY_MS = 800

export interface OllamaModelTag {
  name: string
  model: string
  modified_at: string
  size: number
  digest: string
}

/**
 * OllamaAdapter connects to a local or on-premise Ollama instance
 * (default: http://localhost:11434).
 * Provides 100% Free, Private, Offline AI inference with zero API keys.
 * Popular local models: deepseek-r1, llama3.3, qwen2.5-coder, mistral, phi3.
 */
export class OllamaAdapter implements IAIAgent {
  private baseUrl: string
  private defaultModel: string
  private circuitBreaker = new CircuitBreaker('OllamaAPI', {
    failureThreshold: 3,
    resetTimeout: 20000,
  })

  constructor(baseUrl?: string, model?: string) {
    this.baseUrl = (baseUrl ?? process.env.OLLAMA_BASE_URL ?? 'http://localhost:11434').replace(/\/$/, '')
    this.defaultModel = model ?? process.env.OLLAMA_MODEL ?? 'deepseek-r1:latest'
  }

  /**
   * Health check to detect if local Ollama daemon is running.
   */
  public async isAvailable(): Promise<boolean> {
    try {
      const res = await fetch(`${this.baseUrl}/api/tags`, {
        method: 'GET',
        signal: AbortSignal.timeout(2000),
      })
      return res.ok
    } catch {
      return false
    }
  }

  /**
   * Discovers all locally installed and pulled models in Ollama.
   */
  public async getInstalledModels(): Promise<string[]> {
    try {
      const res = await fetch(`${this.baseUrl}/api/tags`, {
        method: 'GET',
        signal: AbortSignal.timeout(3000),
      })
      if (!res.ok) return []
      const data = (await res.json()) as { models?: OllamaModelTag[] }
      return (data.models ?? []).map(m => m.name)
    } catch (err) {
      logger.warn('[OllamaAdapter] Failed to query local Ollama models:', { error: String(err) })
      return []
    }
  }

  private async withRetry<T>(operation: () => Promise<T>, operationName: string): Promise<T> {
    let lastError: Error | undefined
    const startTime = Date.now()

    for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
      try {
        const result = await this.circuitBreaker.execute(() => operation())
        try {
          aiOperationsDuration.observe(
            { operation: operationName, provider: 'ollama' },
            (Date.now() - startTime) / 1000
          )
          aiOperationsTotal.inc({
            operation: operationName,
            status: 'success',
            provider: 'ollama',
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
              provider: 'ollama',
            })
          } catch {
            // Ignore metrics errors
          }
          throw lastError
        }

        const isRetryable =
          errorMessage.includes('econnrefused') ||
          errorMessage.includes('timeout') ||
          errorMessage.includes('500') ||
          errorMessage.includes('503')

        if (!isRetryable || attempt === MAX_RETRIES) {
          try {
            aiOperationsTotal.inc({
              operation: operationName,
              status: 'error',
              provider: 'ollama',
            })
          } catch {
            // Ignore metrics errors
          }
          throw lastError
        }

        const delay = BASE_DELAY_MS * Math.pow(2, attempt)
        logger.warn(
          `[OllamaAdapter] ${operationName} failed (attempt ${attempt + 1}/${MAX_RETRIES + 1}), retrying in ${delay}ms: ${lastError.message}`
        )
        await new Promise(resolve => setTimeout(resolve, delay))
      }
    }

    throw lastError || new Error(`[OllamaAdapter] ${operationName} failed after ${MAX_RETRIES} retries`)
  }

  private async postChat(body: Record<string, unknown>): Promise<Response> {
    const res = await fetch(`${this.baseUrl}/api/chat`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    })

    if (!res.ok) {
      const errorText = await res.text().catch(() => '')
      throw new Error(`Ollama API error [${res.status}]: ${errorText || res.statusText}`)
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
        stream: false,
        options: {
          temperature: options?.temperature ?? 0.7,
        },
      })

      const data = (await res.json()) as any
      const text = data?.message?.content ?? ''
      return {
        text,
        usage: {
          promptTokens: data?.prompt_eval_count ?? 0,
          completionTokens: data?.eval_count ?? 0,
          totalTokens: (data?.prompt_eval_count ?? 0) + (data?.eval_count ?? 0),
        },
        provider: 'ollama',
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
        stream: false,
        options: {
          temperature: options?.temperature ?? 0.7,
        },
      })

      const data = (await res.json()) as any
      const text = data?.message?.content ?? ''
      return {
        text,
        usage: {
          promptTokens: data?.prompt_eval_count ?? 0,
          completionTokens: data?.eval_count ?? 0,
          totalTokens: (data?.prompt_eval_count ?? 0) + (data?.eval_count ?? 0),
        },
        provider: 'ollama',
        latencyMs: Date.now() - startTime,
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
            content: 'Output raw valid JSON only. No explanations, no markdown fences.',
          },
          { role: 'user', content: prompt },
        ],
        format: 'json',
        stream: false,
        options: {
          temperature: options?.temperature ?? 0.2,
        },
      })

      const data = (await res.json()) as any
      const text = data?.message?.content ?? ''

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
    const res = await this.postChat({
      model,
      messages: messages.map(m => ({ role: m.role, content: m.content })),
      stream: true,
      options: {
        temperature: options?.temperature ?? 0.7,
      },
    })

    if (!res.body) {
      throw new Error('Ollama response body is null')
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
        if (!trimmed) continue
        try {
          const parsed = JSON.parse(trimmed)
          if (parsed.message?.content) {
            yield parsed.message.content
          }
          if (parsed.done) return
        } catch {
          // Ignore partial frames
        }
      }
    }
  }
}
