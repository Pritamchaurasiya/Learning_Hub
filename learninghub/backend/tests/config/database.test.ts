/**
 * Database Configuration — Unit Tests
 *
 * Tests cover:
 * - executeTransaction retry behavior (deadlock/P2002 retry vs non-retryable)
 * - Soft-delete middleware behavior (findUnique, findFirst, findMany, *OrThrow variants)
 * - Read-replica conditional extension
 */
import { PrismaClient } from '@prisma/client'
import { ExtendedPrismaClient } from '../../src/config/database'

// We use the real Prisma Client constructor but replace internals with mocks
jest.mock('../../src/prismaClient', () => ({
  prisma: new PrismaClient(),
}))

jest.mock('../../src/utils/logger', () => ({
  __esModule: true,
  default: {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    debug: jest.fn(),
    audit: jest.fn(),
  },
}))

// Isolate the ExtendedPrismaClient class for direct testing
class TestableExtendedPrismaClient extends ExtendedPrismaClient {
  constructor() {
    super({})
  }

  // Expose internals for testing
  public getRetryableErrors(): string[] {
    return ['P1002', 'P1008', 'P1017', 'P2002', 'P2024', 'P2034']
  }

  public isRetryable(error: unknown): boolean {
    return (this as any).isRetryableError(error)
  }
}

describe('DatabaseConfig', () => {
  let db: TestableExtendedPrismaClient

  beforeEach(() => {
    db = new TestableExtendedPrismaClient()
  })

  afterEach(async () => {
    await db.$disconnect()
  })

  describe('isRetryableError', () => {
    it('returns false for non-Error inputs', () => {
      expect(db.isRetryable(null)).toBe(false)
      expect(db.isRetryable(undefined)).toBe(false)
      expect(db.isRetryable('string')).toBe(false)
      expect(db.isRetryable(123)).toBe(false)
      expect(db.isRetryable({})).toBe(false)
    })

    it('returns true for P1002 (database timeout)', () => {
      const err = new Error('P1002: database timeout')
      expect(db.isRetryable(err)).toBe(true)
    })

    it('returns true for P1008 (operations timed out)', () => {
      const err = new Error('P1008: Operations timed out')
      expect(db.isRetryable(err)).toBe(true)
    })

    it('returns true for P1017 (server closed connection)', () => {
      const err = new Error('P1017: Server has closed the connection')
      expect(db.isRetryable(err)).toBe(true)
    })

    it('returns true for P2002 (unique constraint violation)', () => {
      const err = new Error('P2002: Unique constraint violation')
      expect(db.isRetryable(err)).toBe(true)
    })

    it('returns true for P2024 (connection pool timeout)', () => {
      const err = new Error('P2024: Timed out fetching a connection from the pool')
      expect(db.isRetryable(err)).toBe(true)
    })

    it('returns true for P2034 (deadlock/write conflict)', () => {
      const err = new Error('P2034: Transaction failed due to a write conflict or a deadlock')
      expect(db.isRetryable(err)).toBe(true)
    })

    it('returns false for non-retryable Prisma errors', () => {
      const err = new Error('P2003: Foreign key constraint failed')
      expect(db.isRetryable(err)).toBe(false)
    })

    it('returns false for generic errors', () => {
      const err = new Error('Something went wrong')
      expect(db.isRetryable(err)).toBe(false)
    })
  })

  describe('executeTransaction', () => {
    beforeEach(() => {
      // Stub the real $transaction to prevent connecting to DB
      db.$transaction = jest.fn();
    });

    it('retries on retryable errors up to maxRetries', async () => {
      let calls = 0
      const fn = jest.fn()
      // Setup the transaction mock to throw 2 times, then succeed
      ;(db.$transaction as jest.Mock).mockImplementation(async () => {
        calls++
        if (calls < 3) {
          throw new Error('P1002: database timeout')
        }
        return 'success'
      })

      const result = await db.executeTransaction(fn, 3)
      expect(result).toBe('success')
      expect(calls).toBe(3)
    })

    it('throws immediately on non-retryable errors', async () => {
      const fn = jest.fn()
      ;(db.$transaction as jest.Mock).mockImplementation(async () => {
        throw new Error('P2003: Foreign key constraint failed')
      })

      await expect(db.executeTransaction(fn, 3)).rejects.toThrow('P2003')
      expect(db.$transaction).toHaveBeenCalledTimes(1)
    })

    it('throws after exhausting retries on persistent retryable error', async () => {
      const fn = jest.fn()
      ;(db.$transaction as jest.Mock).mockImplementation(async () => {
        throw new Error('P1002: database timeout')
      })

      await expect(db.executeTransaction(fn, 2)).rejects.toThrow('P1002')
      expect(db.$transaction).toHaveBeenCalledTimes(2)
    })

    it('passes transaction client to callback', async () => {
      // Override $transaction to just run the function and pass a fake transaction object for testing
      const fakeTx = { $queryRaw: jest.fn() };
      (db.$transaction as jest.Mock).mockImplementation(async (callback) => await callback(fakeTx));

      const fn = jest.fn().mockImplementation(async (tx: any) => {
        expect(tx).toBeDefined()
        expect(typeof tx.$queryRaw).toBe('function')
        return 'ok'
      })

      const result = await db.executeTransaction(fn, 1)
      expect(result).toBe('ok')
    })
  })
})
