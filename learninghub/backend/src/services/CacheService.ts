import { createClient, RedisClientType } from 'redis'

export class CacheService {
  private client: RedisClientType | null = null
  private readonly DEFAULT_TTL = 300 // 5 minutes
  private readonly EXTENDED_TTL = 3600 // 1 hour
  private readonly SHORT_TTL = 60 // 1 minute

  constructor() {
    void this.initializeClient()
  }

  private async initializeClient(): Promise<void> {
    if (this.client) return

    try {
      const redisUrl = process.env.REDIS_URL
      if (!redisUrl) {
        console.warn('REDIS_URL not set, caching disabled')
        return
      }

      this.client = createClient({
        url: redisUrl,
        socket: {
          reconnectStrategy: retries => Math.min(retries * 100, 5000),
        },
      })

      this.client.on('error', err => {
        console.error('Redis Client Error:', err)
      })

      await this.client.connect()
      // eslint-disable-next-line no-console
      console.log('Redis connected successfully')
    } catch (error) {
      console.error('Failed to connect to Redis:', error)
      this.client = null
    }
  }

  async get<T>(key: string): Promise<T | null> {
    if (!this.client) return null

    try {
      const value = await this.client.get(key)
      if (!value) return null
      return JSON.parse(value) as T
    } catch (error) {
      console.error('Cache get error:', error)
      return null
    }
  }

  async set(key: string, value: unknown, ttl: number = this.DEFAULT_TTL): Promise<void> {
    if (!this.client) return

    try {
      const serialized = JSON.stringify(value)
      await this.client.setEx(key, ttl, serialized)
    } catch (error) {
      console.error('Cache set error:', error)
    }
  }

  async delete(key: string): Promise<void> {
    if (!this.client) return

    try {
      await this.client.del(key)
    } catch (error) {
      console.error('Cache delete error:', error)
    }
  }

  async deletePattern(pattern: string): Promise<void> {
    if (!this.client) return

    try {
      const keys = await this.client.keys(pattern)
      if (keys.length > 0) {
        await this.client.del(keys)
      }
    } catch (error) {
      console.error('Cache delete pattern error:', error)
    }
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
    if (!this.client) return 0

    try {
      return await this.client.incrBy(key, amount)
    } catch (error) {
      console.error('Cache increment error:', error)
      return 0
    }
  }

  async expire(key: string, seconds: number): Promise<void> {
    if (!this.client) return

    try {
      await this.client.expire(key, seconds)
    } catch (error) {
      console.error('Cache expire error:', error)
    }
  }

  async exists(key: string): Promise<boolean> {
    if (!this.client) return false

    try {
      const result = await this.client.exists(key)
      return result === 1
    } catch (error) {
      console.error('Cache exists error:', error)
      return false
    }
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

  async disconnect(): Promise<void> {
    if (this.client) {
      await this.client.quit()
      this.client = null
    }
  }
}

// Singleton instance
export const cacheService = new CacheService()
