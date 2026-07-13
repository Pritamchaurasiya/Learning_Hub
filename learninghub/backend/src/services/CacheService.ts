/* eslint-disable security/detect-non-literal-regexp */
import { createClient } from 'redis'
import NodeCache from 'node-cache'
import logger from '../utils/logger'

type RedisClient = Awaited<ReturnType<typeof createClient>>

type RedisOperation<T> = () => Promise<T>

export class CacheService {
  private client: RedisClient | null = null
  private memoryCache = new NodeCache({ stdTTL: 300, maxKeys: 5000 })
  private connectionPromise: Promise<void> | null = null
  private reconnectTimer: NodeJS.Timeout | null = null
  private healthCheckInterval: NodeJS.Timeout | null = null
  private readonly DEFAULT_TTL = 300 // 5 minutes
  private readonly EXTENDED_TTL = 3600 // 1 hour
  private readonly SHORT_TTL = 60 // 1 minute
  private readonly HEALTH_CHECK_INTERVAL_MS = 30_000
  private readonly RECONNECT_INTERVAL_MS = 30_000
  private readonly version = process.env.CACHE_VERSION ?? '1'

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
        logger.warn(
          '[CacheService] Redis configured but disabled (REDIS_ENABLED=false), using in-memory cache'
        )
      } else {
        logger.warn('[CacheService] REDIS_URL not set, caching disabled')
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

    const client = createClient({
      url: redisUrl,
      socket: {
        reconnectStrategy: retries => {
          if (retries > 10) {
            logger.warn(
              '[CacheService] Redis reconnection failed after 10 attempts, falling back to memory cache'
            )
            return new Error('Max retries exceeded')
          }
          return Math.min(Math.pow(2, retries) * 100, 30000)
        },
      },
    })

    client.on('error', err => {
      logger.error(
        '[CacheService] Redis Client Error:',
        err instanceof Error ? err : new Error(String(err))
      )
    })

    client.on('reconnecting', () => {
      logger.warn('[CacheService] Redis reconnecting...')
    })

    try {
      await client.connect()
      this.client = client
      this.startHealthCheckLoop()
      logger.info('[CacheService] Redis connected successfully')
    } catch (error) {
      await client
        .disconnect()
        .catch(err =>
          logger.error(
            '[CacheService] Failed to disconnect Redis client after connection error',
            err instanceof Error ? err : new Error(String(err))
          )
        )
      logger.error(
        '[CacheService] Failed to connect to Redis:',
        error instanceof Error ? error : new Error(String(error))
      )
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
        void failedClient
          .disconnect()
          .catch(err =>
            logger.error(
              '[CacheService] Failed to disconnect Redis client after health check failure',
              err instanceof Error ? err : new Error(String(err))
            )
          )
      }

      logger.warn(
        `[CacheService] Redis health check failed, falling back to memory cache: ${error instanceof Error ? error.message : String(error)}`
      )
      return false
    }
  }

  private async withRedis<T>(
    operation: RedisOperation<T>,
    fallback: () => T | Promise<T>,
    errorMessage: string,
    disableMemoryFallback: boolean = false
  ): Promise<T> {
    if (!this.client) {
      if (disableMemoryFallback) {
        throw new Error('Redis is unavailable and memory fallback is disabled.')
      }
      return fallback()
    }

    try {
      return await operation()
    } catch (error) {
      const failedClient = this.client
      this.client = null
      this.stopHealthCheckLoop()
      this.scheduleReconnect()

      if (failedClient) {
        void failedClient
          .disconnect()
          .catch(err =>
            logger.error(
              '[CacheService] Failed to disconnect Redis client',
              err instanceof Error ? err : new Error(String(err))
            )
          )
      }

      logger.error(
        `[CacheService] ${errorMessage}`,
        error instanceof Error ? error : new Error(String(error))
      )
      if (disableMemoryFallback) {
        throw error
      }
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

  async get<T>(key: string, disableMemoryFallback = false): Promise<T | null> {
    return this.withRedis<T | null>(
      async () => {
        if (!this.client) return null
        const value = await this.client.get(key)
        if (!value) return null
        return JSON.parse(value) as T
      },
      () => this.getFromMemory<T>(key),
      'Cache get error:',
      disableMemoryFallback
    )
  }

  async set(
    key: string,
    value: unknown,
    ttl: number = this.DEFAULT_TTL,
    disableMemoryFallback = false
  ): Promise<void> {
    await this.withRedis(
      async () => {
        if (!this.client) return
        const serialized = JSON.stringify(value)
        await this.client.setEx(key, ttl, serialized)
      },
      () => {
        this.setInMemory(key, value, ttl)
      },
      'Cache set error:',
      disableMemoryFallback
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
      'Cache delete error:',
      false
    )
  }

  async withDistributedLock<T>(
    key: string,
    ttlMs: number,
    operation: () => Promise<T>,
    heartbeatIntervalMs?: number
  ): Promise<T> {
    if (!this.client) {
      // Fallback: If no Redis, just execute the operation.
      // Not safe for distributed locking, but graceful fallback.
      return operation()
    }

    const lockKey = `lock:${key}`
    const lockValue = crypto.randomUUID()

    // Acquire Lock
    const acquired = await this.client.set(lockKey, lockValue, {
      NX: true,
      PX: ttlMs,
    })

    if (!acquired) {
      throw new Error(`Could not acquire distributed lock for ${key}`)
    }

    // Start heartbeat to extend lock TTL for long-running operations
    const heartbeat = heartbeatIntervalMs
      ? setInterval(() => {
          this.client?.pExpire(lockKey, ttlMs).catch(() => {})
        }, heartbeatIntervalMs)
      : null

    try {
      return await operation()
    } finally {
      if (heartbeat) clearInterval(heartbeat)
      // Release Lock via Lua script to ensure we only delete our own lock
      const releaseScript = `
        if redis.call("get",KEYS[1]) == ARGV[1] then
            return redis.call("del",KEYS[1])
        else
            return 0
        end
      `
      try {
        await this.client.eval(releaseScript, {
          keys: [lockKey],
          arguments: [lockValue],
        })
      } catch (err) {
        logger.error(
          '[CacheService] Failed to release distributed lock',
          err instanceof Error ? err : new Error(String(err))
        )
      }
    }
  }

  async deletePattern(pattern: string): Promise<void> {
    await this.withRedis(
      async () => {
        if (!this.client) return

        const batchSize = 100
        let cursor = 0
        const versionedPattern = `v${this.version}:${pattern}`

        do {
          const result = await this.client.scan(cursor, {
            MATCH: versionedPattern,
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
        // Prevent event loop blocking on massive in-memory scans:
        if (keys.length > 500) {
          this.memoryCache.flushAll()
          return
        }
        // Escape regex special characters, leaving * intact
        const escaped = pattern.replace(/[.+?^${}()|[\]\\]/g, '\\$&')
        const regexStr = `^v${this.version}:${escaped.replace(/\*/g, '.*')}$`
        const regex = new RegExp(regexStr)
        const toDelete = keys.filter(k => regex.test(k))
        if (toDelete.length > 0) {
          this.memoryCache.del(toDelete)
        }
      },
      'Cache delete pattern error:'
    )
  }

  /**
   * Pre-populate cache keys without distributed locking (avoid stampede during warmup).
   * Errors are logged but never thrown — warmup is best-effort.
   */
  async warm<T>(
    entries: Array<{ key: string; factory: () => Promise<T>; ttl?: number }>
  ): Promise<void> {
    await Promise.allSettled(
      entries.map(async ({ key, factory, ttl }) => {
        try {
          const exists = await this.get<T>(key)
          if (exists !== null) return
          const value = await factory()
          await this.set(key, value, ttl ?? this.DEFAULT_TTL)
        } catch (err) {
          logger.warn(
            `[CacheService] Warmup failed for key "${key}": ${err instanceof Error ? err.message : String(err)}`
          )
        }
      })
    )
  }

  async getOrSet<T>(
    key: string,
    factory: () => Promise<T>,
    ttl: number = this.DEFAULT_TTL,
    disableMemoryFallback = false
  ): Promise<T> {
    const cached = await this.get<T>(key, disableMemoryFallback)
    if (cached !== null) return cached

    return this.withDistributedLock(
      key,
      30_000,
      async () => {
        // Double check in case another process populated it while waiting
        const doubleCheck = await this.get<T>(key, disableMemoryFallback)
        if (doubleCheck !== null) return doubleCheck

        const value = await factory()
        await this.set(key, value, ttl, disableMemoryFallback)
        return value
      },
      10_000
    ) // Heartbeat every 10s to prevent lock expiry for long factories
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
        return (await this.client!.eval(this.INCR_WITH_EXPIRY_SCRIPT, {
          keys: [key],
          arguments: [windowMs.toString()],
        })) as number
      },
      () => {
        const current = (this.memoryCache.get<number>(key) ?? 0) + amount
        this.memoryCache.set(key, current, Math.max(1, Math.ceil(windowMs / 1000)))
        return current
      },
      'Cache incrementWithExpiry error:',
      true
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
    return `v${this.version}:${parts.filter(p => p != null).join(':')}`
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
    return this.client !== null && this.client.isReady
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
        logger.error(
          '[CacheService] Failed to disconnect Redis client:',
          error instanceof Error ? error : new Error(String(error))
        )
      }
    }
  }
}

// Singleton instance
export const cacheService = new CacheService()
