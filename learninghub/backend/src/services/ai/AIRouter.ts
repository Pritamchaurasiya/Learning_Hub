import crypto from 'crypto'
import { IAIAgent, AIProviderOptions, AIGenerationResult, AIMessage } from './AIAgent'
import { GeminiAdapter } from './GeminiAdapter'
import { OpenAIAdapter } from './OpenAIAdapter'
import { AnthropicAdapter } from './AnthropicAdapter'
import { MockAIAdapter } from './MockAIAdapter'
import logger from '../../utils/logger'

interface CacheEntry {
  result: AIGenerationResult
  expiresAt: number
}

export class AIRouter implements IAIAgent {
  private providers: Map<string, IAIAgent> = new Map()
  private providerPriority: string[] = ['gemini', 'openai', 'anthropic', 'mock']
  private cache: Map<string, CacheEntry> = new Map()
  private maxCacheSize: number = 1000
  private defaultTtlMs: number = 60 * 60 * 1000 // 1 hour

  constructor(customPriority?: string[]) {
    if (customPriority && customPriority.length > 0) {
      this.providerPriority = customPriority
    }
    this.initializeProviders()
  }

  private initializeProviders(): void {
    // 1. Gemini
    if (process.env.GEMINI_API_KEY) {
      try {
        this.providers.set('gemini', new GeminiAdapter())
        logger.info('[AIRouter] Registered Gemini provider')
      } catch (err) {
        logger.warn('[AIRouter] Failed to register Gemini provider:', { error: String(err) })
      }
    }

    // 2. OpenAI
    if (process.env.OPENAI_API_KEY) {
      try {
        this.providers.set('openai', new OpenAIAdapter())
        logger.info('[AIRouter] Registered OpenAI provider')
      } catch (err) {
        logger.warn('[AIRouter] Failed to register OpenAI provider:', { error: String(err) })
      }
    }

    // 3. Anthropic
    if (process.env.ANTHROPIC_API_KEY) {
      try {
        this.providers.set('anthropic', new AnthropicAdapter())
        logger.info('[AIRouter] Registered Anthropic provider')
      } catch (err) {
        logger.warn('[AIRouter] Failed to register Anthropic provider:', { error: String(err) })
      }
    }

    // 4. Mock (Always available)
    this.providers.set('mock', new MockAIAdapter())
    logger.info('[AIRouter] Registered Mock provider as safety fallback')
  }

  /**
   * Allows registering or overriding an adapter explicitly (useful for testing).
   */
  public registerProvider(name: string, adapter: IAIAgent): void {
    this.providers.set(name, adapter)
    if (!this.providerPriority.includes(name)) {
      this.providerPriority.unshift(name)
    }
  }

  public getRegisteredProviders(): string[] {
    return Array.from(this.providers.keys())
  }

  /**
   * Generates a deterministic cache key for prompts/messages + options.
   */
  private computeCacheKey(payload: string, options?: AIProviderOptions): string {
    const raw = JSON.stringify({
      payload,
      temperature: options?.temperature ?? 0.7,
      task: options?.task ?? 'general',
      model: options?.model ?? 'default',
    })
    return crypto.createHash('sha256').update(raw).digest('hex')
  }

  private getFromCache(key: string): AIGenerationResult | null {
    const entry = this.cache.get(key)
    if (!entry) return null
    if (Date.now() > entry.expiresAt) {
      this.cache.delete(key)
      return null
    }
    // Refresh LRU order
    this.cache.delete(key)
    this.cache.set(key, entry)
    return { ...entry.result, cached: true }
  }

  private saveToCache(key: string, result: AIGenerationResult): void {
    if (this.cache.size >= this.maxCacheSize) {
      // Evict oldest (first key in map iterator)
      const oldestKey = this.cache.keys().next().value
      if (oldestKey) this.cache.delete(oldestKey)
    }
    this.cache.set(key, {
      result,
      expiresAt: Date.now() + this.defaultTtlMs,
    })
  }

  public clearCache(): void {
    this.cache.clear()
  }

  /**
   * Resolves the provider resolution order for a given request.
   */
  private resolveProviderChain(options?: AIProviderOptions): string[] {
    const chain: string[] = []

    if (options?.preferredProvider && this.providers.has(options.preferredProvider)) {
      chain.push(options.preferredProvider)
    }

    for (const p of this.providerPriority) {
      if (!chain.includes(p) && this.providers.has(p)) {
        chain.push(p)
      }
    }

    return chain
  }

  async generateText(prompt: string, options?: AIProviderOptions): Promise<AIGenerationResult> {
    const startTime = Date.now()
    const canCache = !options?.skipCache && (options?.temperature ?? 0.7) <= 0.8
    const cacheKey = canCache ? this.computeCacheKey(prompt, options) : null

    if (cacheKey) {
      const cached = this.getFromCache(cacheKey)
      if (cached) {
        logger.debug('[AIRouter] Cache HIT for generateText', { key: cacheKey.substring(0, 10) })
        return {
          ...cached,
          latencyMs: Date.now() - startTime,
        }
      }
    }

    const chain = this.resolveProviderChain(options)
    let lastError: Error | null = null

    for (const providerName of chain) {
      const adapter = this.providers.get(providerName)
      if (!adapter) continue

      try {
        const result = await adapter.generateText(prompt, options)
        const enriched: AIGenerationResult = {
          ...result,
          provider: providerName,
          cached: false,
          latencyMs: Date.now() - startTime,
        }

        if (cacheKey && providerName !== 'mock') {
          this.saveToCache(cacheKey, enriched)
        }

        return enriched
      } catch (err) {
        lastError = err instanceof Error ? err : new Error(String(err))
        logger.warn(
          `[AIRouter] Provider '${providerName}' failed during generateText: ${lastError.message}. Attempting fallback...`
        )
      }
    }

    throw lastError || new Error('[AIRouter] All AI providers in mesh failed')
  }

  async generateChat(messages: AIMessage[], options?: AIProviderOptions): Promise<AIGenerationResult> {
    const startTime = Date.now()
    const serialized = messages.map(m => `${m.role}:${m.content}`).join('\n')
    const canCache = !options?.skipCache && (options?.temperature ?? 0.7) <= 0.8
    const cacheKey = canCache ? this.computeCacheKey(serialized, options) : null

    if (cacheKey) {
      const cached = this.getFromCache(cacheKey)
      if (cached) {
        logger.debug('[AIRouter] Cache HIT for generateChat', { key: cacheKey.substring(0, 10) })
        return {
          ...cached,
          latencyMs: Date.now() - startTime,
        }
      }
    }

    const chain = this.resolveProviderChain(options)
    let lastError: Error | null = null

    for (const providerName of chain) {
      const adapter = this.providers.get(providerName)
      if (!adapter) continue

      try {
        const result = await adapter.generateChat(messages, options)
        const enriched: AIGenerationResult = {
          ...result,
          provider: providerName,
          cached: false,
          latencyMs: Date.now() - startTime,
        }

        if (cacheKey && providerName !== 'mock') {
          this.saveToCache(cacheKey, enriched)
        }

        return enriched
      } catch (err) {
        lastError = err instanceof Error ? err : new Error(String(err))
        logger.warn(
          `[AIRouter] Provider '${providerName}' failed during generateChat: ${lastError.message}. Attempting fallback...`
        )
      }
    }

    throw lastError || new Error('[AIRouter] All AI providers in mesh failed')
  }

  async generateJSON<T>(prompt: string, options?: AIProviderOptions): Promise<T> {
    const chain = this.resolveProviderChain(options)
    let lastError: Error | null = null

    for (const providerName of chain) {
      const adapter = this.providers.get(providerName)
      if (!adapter) continue

      try {
        return await adapter.generateJSON<T>(prompt, options)
      } catch (err) {
        lastError = err instanceof Error ? err : new Error(String(err))
        logger.warn(
          `[AIRouter] Provider '${providerName}' failed during generateJSON: ${lastError.message}. Attempting fallback...`
        )
      }
    }

    throw lastError || new Error('[AIRouter] All AI providers in mesh failed for generateJSON')
  }

  async *generateChatStream(
    messages: AIMessage[],
    options?: AIProviderOptions
  ): AsyncGenerator<string, void, unknown> {
    const chain = this.resolveProviderChain(options)
    let lastError: Error | null = null

    for (const providerName of chain) {
      const adapter = this.providers.get(providerName)
      if (!adapter || !adapter.generateChatStream) continue

      try {
        const stream = adapter.generateChatStream(messages, options)
        for await (const chunk of stream) {
          yield chunk
        }
        return
      } catch (err) {
        lastError = err instanceof Error ? err : new Error(String(err))
        logger.warn(
          `[AIRouter] Streaming failed on provider '${providerName}': ${lastError.message}. Attempting fallback stream...`
        )
      }
    }

    throw lastError || new Error('[AIRouter] All streaming AI providers in mesh failed')
  }
}
