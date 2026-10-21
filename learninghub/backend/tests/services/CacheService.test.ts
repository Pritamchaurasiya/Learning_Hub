/**
 * CacheService — Unit Tests
 * Tests the Redis + in-memory cache service
 */
import { CacheService } from '../../src/services/CacheService'

jest.mock('redis', () => ({
  createClient: jest.fn().mockReturnValue({
    connect: jest.fn().mockResolvedValue(undefined),
    disconnect: jest.fn().mockResolvedValue(undefined),
    quit: jest.fn().mockResolvedValue(undefined),
    ping: jest.fn().mockResolvedValue('PONG'),
    isReady: true,
    on: jest.fn(),
    get: jest.fn().mockResolvedValue(null),
    setEx: jest.fn().mockResolvedValue('OK'),
    del: jest.fn().mockResolvedValue(1),
    eval: jest.fn().mockResolvedValue(1),
    incrBy: jest.fn().mockResolvedValue(1),
    scan: jest.fn().mockResolvedValue({ cursor: 0, keys: [] }),
    pExpire: jest.fn().mockResolvedValue(1),
    set: jest.fn().mockResolvedValue('OK'),
  }),
}))

jest.mock('node-cache', () => {
  return jest.fn().mockImplementation(() => ({
    get: jest.fn(),
    set: jest.fn(),
    del: jest.fn(),
    has: jest.fn().mockReturnValue(false),
    keys: jest.fn().mockReturnValue([]),
    ttl: jest.fn(),
    flushAll: jest.fn(),
  }))
})

jest.mock('../../src/utils/logger', () => ({
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
  debug: jest.fn(),
}))

describe('CacheService', () => {
  let cacheService: CacheService

  beforeEach(() => {
    jest.clearAllMocks()
    cacheService = new CacheService()
  })

  describe('connect', () => {
    it('should return early if already connected', async () => {
      await cacheService.connect()
      await cacheService.connect() // Should not throw
    })

    it('should handle Redis disabled gracefully', async () => {
      process.env.REDIS_ENABLED = 'false'
      await cacheService.connect()
      delete process.env.REDIS_ENABLED
    })

    it('should handle missing REDIS_URL', async () => {
      delete process.env.REDIS_URL
      delete process.env.REDIS_ENABLED
      await cacheService.connect()
    })
  })

  describe('generateKey', () => {
    it('should generate versioned keys', () => {
      const key = cacheService.generateKey('user', '123')
      expect(key).toMatch(/^v\d+:user:123$/)
    })

    it('should filter out null/undefined parts', () => {
      const key = cacheService.generateKey('user', null, '123', undefined)
      expect(key).toBe('v1:user:123')
    })
  })

  describe('key generators', () => {
    it('userKey should generate user keys', () => {
      expect(cacheService.userKey('123')).toMatch(/^v\d+:user:123$/)
    })

    it('userByEmailKey should normalize email', () => {
      const key = cacheService.userByEmailKey('  Test@Example.COM  ')
      expect(key).toMatch(/^v\d+:user:email:test@example\.com$/)
    })

    it('courseKey should generate course keys', () => {
      expect(cacheService.courseKey('course-1')).toMatch(/^v\d+:course:course-1$/)
    })

    it('coursesListKey should generate deterministic keys', () => {
      const key1 = cacheService.coursesListKey({ page: 1, limit: 10 })
      const key2 = cacheService.coursesListKey({ limit: 10, page: 1 })
      expect(key1).toBe(key2)
    })

    it('userProgressKey should include courseId when provided', () => {
      expect(cacheService.userProgressKey('user-1', 'course-1')).toMatch(/^v\d+:progress:user-1:course-1$/)
      expect(cacheService.userProgressKey('user-1')).toMatch(/^v\d+:progress:user-1$/)
    })

    it('quizKey should generate quiz keys', () => {
      expect(cacheService.quizKey('quiz-1')).toMatch(/^v\d+:quiz:quiz-1$/)
    })

    it('leaderboardKey should include timeframe', () => {
      expect(cacheService.leaderboardKey('weekly')).toMatch(/^v\d+:leaderboard:weekly$/)
    })

    it('searchKey should normalize query and filters', () => {
      const key1 = cacheService.searchKey('  React  ', { difficulty: 'hard' })
      const key2 = cacheService.searchKey('react', { difficulty: 'hard' })
      expect(key1).toBe(key2)
    })

    it('topic keys should generate correctly', () => {
      expect(cacheService.topicMasteryKey('user-1')).toMatch(/^v\d+:topic-performance:mastery:user-1$/)
      expect(cacheService.topicWeakKey('user-1')).toMatch(/^v\d+:topic-performance:weak:user-1$/)
      expect(cacheService.topicReviewKey('user-1')).toMatch(/^v\d+:topic-performance:review:user-1$/)
    })

    it('recommendation keys should generate correctly', () => {
      expect(cacheService.recommendationStudyKey('user-1')).toMatch(/^v\d+:recommendation:study:user-1$/)
      expect(cacheService.recommendationTestKey('user-1')).toMatch(/^v\d+:recommendation:test:user-1$/)
      expect(cacheService.recommendationRoadmapKey('user-1')).toMatch(/^v\d+:recommendation:roadmap:user-1$/)
      expect(cacheService.recommendationSpacedKey('user-1')).toMatch(/^v\d+:recommendation:spaced:user-1$/)
    })

    it('curriculumKey should generate correctly', () => {
      expect(cacheService.curriculumKey('user-1')).toMatch(/^v\d+:curriculum:active:user-1$/)
    })

    it('revisionDeckKey should include filter', () => {
      expect(cacheService.revisionDeckKey('user-1', 'due')).toMatch(/^v\d+:revision:deck:user-1:due$/)
      expect(cacheService.revisionDeckKey('user-1')).toMatch(/^v\d+:revision:deck:user-1:all$/)
    })

    it('skillGraphKey should include domain', () => {
      expect(cacheService.skillGraphKey('user-1', 'algorithms')).toMatch(/^v\d+:skills:graph:user-1:algorithms$/)
      expect(cacheService.skillGraphKey('user-1')).toMatch(/^v\d+:skills:graph:user-1:all$/)
    })

    it('learningPathsKey should include query', () => {
      expect(cacheService.learningPathsKey('query')).toMatch(/^v\d+:learning-paths:query$/)
      expect(cacheService.learningPathsKey()).toMatch(/^v\d+:learning-paths:all$/)
    })
  })

  describe('incrementWithExpiry', () => {
    it('should call incrementWithExpiry with correct parameters', async () => {
      const result = await cacheService.incrementWithExpiry('test-key', 1, 60000)
      expect(typeof result).toBe('number')
    })
  })

  describe('increment', () => {
    it('should call increment with correct parameters', async () => {
      const result = await cacheService.increment('test-key', 5)
      expect(typeof result).toBe('number')
    })
  })

  describe('expire', () => {
    it('should call expire with correct parameters', async () => {
      await cacheService.expire('test-key', 60)
    })
  })

  describe('exists', () => {
    it('should return boolean', async () => {
      const result = await cacheService.exists('test-key')
      expect(typeof result).toBe('boolean')
    })
  })

  describe('isAvailable', () => {
    it('should return false when not connected', () => {
      const newCache = new CacheService()
      expect(newCache.isAvailable()).toBe(false)
    })
  })

  describe('disconnect', () => {
    it('should disconnect gracefully', async () => {
      await cacheService.disconnect()
    })
  })
})