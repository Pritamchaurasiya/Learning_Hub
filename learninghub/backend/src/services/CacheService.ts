import { createClient } from 'redis'
import NodeCache from 'node-cache'

type RedisClient = Awaited<ReturnType<typeof createClient>>

type RedisOperation<T> = () => Promise<T>

export class CacheService {
  private client: RedisClient | null = null
  private memoryCache = new NodeCache({ stdTTL: 300 })
  private connectionPromise: Promise<void> | null = null
  private reconnectTimer: NodeJS.Timeout | null = null
  private healthCheckInterval: NodeJS.Timeout | null = null
  private readonly DEFAULT_TTL = 300 // 5 minutes
  private readonly EXTENDED_TTL = 3600 // 1 hour
  private readonly SHORT_TTL = 60 // 1 minute
  private readonly HEALTH_CHECK_INTERVAL_MS = 30_000
  private readonly RECONNECT_INTERVAL_MS = 30_000

  // Lua script for atomic increment + conditional TTL set
  // Only sets PEXPIRE on first increment to avoid extending the window on each request
  private readonly INCR_WITH_EXPIRY_SCRIPT = `
    local current = redis.call('INCR', KEYS[1])
    if current == 1 then
      redis.call('PEXPIRE', KEYS[1], ARGV[1])
    end
    return current
  ` as const

  async connect(): Promise<void> {
    if (this.client) return
    if (this.connectionPromise) return this.connectionPromise

    const redisEnabled = process.env.REDIS_ENABLED === 'true'
    const redisUrl = process.env.REDIS_URL

    if (!redisEnabled || !redisUrl) {
      if (!redisEnabled && redisUrl) {
        console.warn('Redis configured but disabled (REDIS_ENABLED=false), using in-memory cache')
      } else {
        console.warn('REDIS_URL not set, caching disabled')
      }
      return
    }

    this.connectionPromise = this.initializeClient(redisUrl)

    try {
      await this.connectionPromise
    } finally {
      this.connectionPromise = null
    }
  }

  private async initializeClient(redisUrl: string): Promise<void> {
    if (this.client) return

    try {
      const client = createClient({
        url: redisUrl,
        socket: {
          reconnectStrategy: retries => {
            if (retries > 3) {
              console.warn(
                'Redis reconnection failed after 3 attempts, falling back to memory cache'
              )
              return new Error('Max retries exceeded')
            }
            return Math.min(retries * 100, 5000)
          },
        },
      })

      client.on('error', err => {
        console.error('Redis Client Error:', err)
      })

      client.on('reconnecting', () => {
        console.warn('Redis reconnecting...')
      })

      this.client = client
      await client.connect()
      this.startHealthCheckLoop()
      console.warn('Redis connected successfully')
    } catch (error) {
      const failedClient = this.client
      this.client = null
      this.stopHealthCheckLoop()

      if (failedClient) {
        await failedClient.disconnect().catch(() => {})
      }

      console.error('Failed to connect to Redis:', error)
      throw error
    }
  }

  private startHealthCheckLoop(): void {
    if (this.healthCheckInterval) return

    this.healthCheckInterval = setInterval(() => {
      void this.healthCheck()
    }, this.HEALTH_CHECK_INTERVAL_MS)
    this.healthCheckInterval.unref?.()
  }

  private stopHealthCheckLoop(): void {
    if (!this.healthCheckInterval) return

    clearInterval(this.healthCheckInterval)
    this.healthCheckInterval = null
  }

  private scheduleReconnect(): void {
    if (this.reconnectTimer || this.client) return

    this.reconnectTimer = setTimeout(() => {
      this.reconnectTimer = null
      void this.connect()
    }, this.RECONNECT_INTERVAL_MS)
    this.reconnectTimer.unref?.()
  }

  async healthCheck(): Promise<boolean> {
    if (!this.client) {
      this.scheduleReconnect()
      return false
    }

    try {
      await this.client.ping()
      return true
    } catch (error) {
      const failedClient = this.client
      this.client = null
      this.stopHealthCheckLoop()
      this.scheduleReconnect()

      if (failedClient) {
        void failedClient.disconnect().catch(() => {})
      }

      console.warn('Redis health check failed, falling back to memory cache', error)
      return false
    }
  }

  private async withRedis<T>(
    operation: RedisOperation<T>,
    fallback: () => T | Promise<T>,
    errorMessage: string
  ): Promise<T> {
    if (!this.client) return fallback()

    try {
      return await operation()
    } catch (error) {
      const failedClient = this.client
      this.client = null
      this.stopHealthCheckLoop()
      this.scheduleReconnect()

      if (failedClient) {
        void failedClient.disconnect().catch(() => {})
      }

      console.error(errorMessage, error)
      return fallback()
    }
  }

  private getFromMemory<T>(key: string): T | null {
    const val = this.memoryCache.get<T>(key)
    return val ?? null
  }

  private setInMemory(key: string, value: unknown, ttl: number): void {
    this.memoryCache.set(key, value, ttl)
  }

  async get<T>(key: string): Promise<T | null> {
    return this.withRedis<T | null>(
      async () => {
        if (!this.client) return null
        const value = await this.client.get(key)
        if (!value) return null
        return JSON.parse(value) as T
      },
      () => this.getFromMemory<T>(key),
      'Cache get error:'
    )
  }

  async set(key: string, value: unknown, ttl: number = this.DEFAULT_TTL): Promise<void> {
    await this.withRedis(
      async () => {
        if (!this.client) return
        const serialized = JSON.stringify(value)
        await this.client.setEx(key, ttl, serialized)
      },
      () => {
        this.setInMemory(key, value, ttl)
      },
      'Cache set error:'
    )
  }

  async delete(key: string): Promise<void> {
    await this.withRedis(
      async () => {
        if (!this.client) return
        await this.client.del(key)
      },
      () => {
        this.memoryCache.del(key)
      },
      'Cache delete error:'
    )
  }

  async deletePattern(pattern: string): Promise<void> {
    await this.withRedis(
      async () => {
        if (!this.client) return

        const batchSize = 100
        let cursor = 0

        do {
          const result = await this.client.scan(cursor, {
            MATCH: pattern,
            COUNT: batchSize,
          })
          cursor = result.cursor
          if (result.keys.length > 0) {
            await this.client.del(result.keys)
          }
        } while (cursor !== 0)
      },
      () => {
        const keys = this.memoryCache.keys()
        const regexStr = pattern.replace(/\*/g, '.*')
        const regex = new RegExp(`^${regexStr}$`)
        const toDelete = keys.filter(k => regex.test(k))
        this.memoryCache.del(toDelete)
      },
      'Cache delete pattern error:'
    )
  }

  async getOrSet<T>(
    key: string,
    factory: () => Promise<T>,
    ttl: number = this.DEFAULT_TTL
  ): Promise<T> {
    const cached = await this.get<T>(key)
    if (cached !== null) return cached

    const value = await factory()
    await this.set(key, value, ttl)
    return value
  }

  async increment(key: string, amount: number = 1): Promise<number> {
    return this.withRedis(
      async () => {
        if (!this.client) return 0
        return await this.client.incrBy(key, amount)
      },
      () => {
        const current = (this.memoryCache.get<number>(key) ?? 0) + amount
        this.memoryCache.set(key, current)
        return current
      },
      'Cache increment error:'
    )
  }

  async incrementWithExpiry(key: string, amount: number, windowMs: number): Promise<number> {
    return this.withRedis(
      async () => {
        if (!this.client) return 0
        return (await this.client.eval(this.INCR_WITH_EXPIRY_SCRIPT, {
          keys: [key],
          arguments: [windowMs.toString()],
        })) as number
      },
      () => {
        const current = (this.memoryCache.get<number>(key) ?? 0) + amount
        this.memoryCache.set(key, current, Math.max(1, Math.ceil(windowMs / 1000)))
        return current
      },
      'Cache incrementWithExpiry error:'
    )
  }

  async expire(key: string, seconds: number): Promise<void> {
    await this.withRedis(
      async () => {
        if (!this.client) return
        await this.client.expire(key, seconds)
      },
      () => {
        this.memoryCache.ttl(key, seconds)
      },
      'Cache expire error:'
    )
  }

  async exists(key: string): Promise<boolean> {
    return this.withRedis(
      async () => {
        if (!this.client) return false
        const result = await this.client.exists(key)
        return result === 1
      },
      () => this.memoryCache.has(key),
      'Cache exists error:'
    )
  }

  generateKey(...parts: (string | number | undefined)[]): string {
    return parts.filter(Boolean).join(':')
  }

  // Cache key generators for common entities
  userKey(userId: string): string {
    return this.generateKey('user', userId)
  }

  userByEmailKey(email: string): string {
    return this.generateKey('user', 'email', email.toLowerCase().trim())
  }

  courseKey(courseId: string): string {
    return this.generateKey('course', courseId)
  }

  coursesListKey(filters: Record<string, unknown>): string {
    const filterHash = Object.entries(filters)
      .sort()
      .map(([k, v]) => `${k}=${v}`)
      .join(',')
    return this.generateKey('courses', 'list', filterHash || 'all')
  }

  userProgressKey(userId: string, courseId?: string): string {
    return this.generateKey('progress', userId, courseId)
  }

  quizKey(quizId: string): string {
    return this.generateKey('quiz', quizId)
  }

  leaderboardKey(timeframe: string): string {
    return this.generateKey('leaderboard', timeframe)
  }

  searchKey(query: string, filters: Record<string, unknown>): string {
    const filterHash = Object.entries(filters)
      .sort()
      .map(([k, v]) => `${k}=${v}`)
      .join(',')
    return this.generateKey('search', query.toLowerCase().trim(), filterHash)
  }

  topicMasteryKey(userId: string): string {
    return this.generateKey('topic-performance', 'mastery', userId)
  }

  topicWeakKey(userId: string): string {
    return this.generateKey('topic-performance', 'weak', userId)
  }

  topicReviewKey(userId: string): string {
    return this.generateKey('topic-performance', 'review', userId)
  }

  recommendationStudyKey(userId: string): string {
    return this.generateKey('recommendation', 'study', userId)
  }

  recommendationTestKey(userId: string): string {
    return this.generateKey('recommendation', 'test', userId)
  }

  recommendationRoadmapKey(userId: string): string {
    return this.generateKey('recommendation', 'roadmap', userId)
  }

  recommendationSpacedKey(userId: string): string {
    return this.generateKey('recommendation', 'spaced', userId)
  }

  isAvailable(): boolean {
    return this.client !== null
  }

  async disconnect(): Promise<void> {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer)
      this.reconnectTimer = null
    }

    this.stopHealthCheckLoop()

    if (!this.client) return

    const client = this.client
    this.client = null

    try {
      await client.quit()
    } catch {
      try {
        await client.disconnect()
      } catch (error) {
        console.error('Failed to disconnect Redis client:', error)
      }
    }
  }
}

// Singleton instance
export const cacheService = new CacheService()
