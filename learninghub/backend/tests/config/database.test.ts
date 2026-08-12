import { PrismaClient } from '@prisma/client'
import { ExtendedPrismaClient } from '../../src/config/database'

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

class TestableExtendedPrismaClient extends ExtendedPrismaClient {
  constructor() {
    super({})
  }
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
    db.$transaction = jest.fn().mockImplementation((fn: any) => {
      const mockTx = { ...db, $queryRaw: jest.fn() }
      return fn(mockTx)
    })
  })

  afterEach(async () => {
    await db.$disconnect()
  })

  describe('isRetryableError', () => {
    it('returns false for non-Error inputs', () => {
      expect(db.isRetryable(null)).toBe(false)
    })
    it('returns true for P1002 (database timeout)', () => {
      const err = new Error('P1002: database timeout')
      expect(db.isRetryable(err)).toBe(true)
    })
  })

  describe('executeTransaction', () => {
    it('retries on retryable errors up to maxRetries', async () => {
      let calls = 0
      const fn = jest.fn().mockImplementation(() => {
        calls++
        if (calls < 3) throw new Error('P1002: database timeout')
        return 'success'
      })

      db.$transaction = jest.fn().mockImplementation((cb: any) => {
        return cb({ ...db, $queryRaw: jest.fn() })
      })

      const result = await db.executeTransaction(fn, 3)
      expect(result).toBe('success')
      expect(calls).toBe(3)
    })

    it('throws immediately on non-retryable errors', async () => {
      const fn = jest.fn().mockImplementation(() => {
        throw new Error('P2003: Foreign key constraint failed')
      })
      await expect(db.executeTransaction(fn, 3)).rejects.toThrow('P2003')
    })

    it('throws after exhausting retries on persistent retryable error', async () => {
      const fn = jest.fn().mockImplementation(() => {
        throw new Error('P1002: database timeout')
      })
      await expect(db.executeTransaction(fn, 2)).rejects.toThrow('P1002')
    })

    it('passes transaction client to callback', async () => {
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
