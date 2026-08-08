import { PrismaClient, Prisma } from '@prisma/client'
import { readReplicas } from '@prisma/extension-read-replicas'
import winston from 'winston'

// Type definitions for Prisma event payloads
type PrismaQueryEvent = {
  timestamp: Date
  query: string
  params: string
  duration: number
  target: string
}

type PrismaErrorEvent = {
  timestamp: Date
  message: string
  target: string
}

type PrismaWarnEvent = {
  timestamp: Date
  message: string
  target: string
}

// Logger for database operations
const dbLogger = winston.createLogger({
  level: process.env.LOG_LEVEL ?? 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    winston.format.json()
  ),
  defaultMeta: { service: 'database' },
  transports: [
    new winston.transports.Console({
      format: winston.format.combine(winston.format.colorize(), winston.format.simple()),
    }),
  ],
})

// Global Prisma client instance for connection pooling
const globalForPrisma = global as unknown as { prisma: PrismaClient }

/**
 * Get connection pool configuration based on environment
 */
const getConnectionPoolConfig = () => {
  if (process.env.NODE_ENV === 'production') {
    return {
      connection_limit: parseInt(process.env.DATABASE_CONNECTION_LIMIT ?? '20', 10),
      pool_timeout: parseInt(process.env.DATABASE_POOL_TIMEOUT ?? '30', 10),
      statement_cache_size: parseInt(process.env.DATABASE_STATEMENT_CACHE_SIZE ?? '100', 10),
    }
  }
  return {
    connection_limit: 10,
    pool_timeout: 30,
    statement_cache_size: 50,
  }
}

/**
 * Build database URL with connection pool parameters
 */
const buildDatabaseUrl = (): string => {
  const baseUrl = process.env.DATABASE_URL
  if (!baseUrl) {
    if (process.env.NODE_ENV === 'test') {
      return 'postgresql://test:test@localhost:5432/test'
    }
    throw new Error('DATABASE_URL environment variable is required')
  }

  const poolConfig = getConnectionPoolConfig()

  // Respect provider-specific URL settings (for example PgBouncer or constrained
  // local Postgres runners) while still supplying application defaults.
  const url = new URL(baseUrl)
  if (!url.searchParams.has('connection_limit')) {
    url.searchParams.set('connection_limit', String(poolConfig.connection_limit))
  }
  if (!url.searchParams.has('pool_timeout')) {
    url.searchParams.set('pool_timeout', String(poolConfig.pool_timeout))
  }

  return url.toString()
}

/**
 * Prisma client options with production optimizations
 */
const prismaOptions: Prisma.PrismaClientOptions = {
  log:
    process.env.NODE_ENV === 'production'
      ? ([
          { emit: 'event', level: 'error' },
          { emit: 'event', level: 'warn' },
        ] as Prisma.LogDefinition[])
      : ([
          { emit: 'event', level: 'query' },
          { emit: 'event', level: 'error' },
          { emit: 'event', level: 'warn' },
          { emit: 'stdout', level: 'info' },
        ] as Prisma.LogDefinition[]),
  datasources: {
    db: {
      url: buildDatabaseUrl(),
    },
  },
}

/**
 * Extended Prisma Client with query logging and metrics
 */
export class ExtendedPrismaClient extends PrismaClient {
  private queryMetrics = {
    total: 0,
    slowQueries: 0,
    errors: 0,
  }

  constructor(options: Prisma.PrismaClientOptions) {
    super(options)
    this.setupQueryLogging()
  }

  private setupQueryLogging(): void {
    // Log queries in development
    if (process.env.NODE_ENV !== 'production') {
      this.$on('query' as never, (event: PrismaQueryEvent) => {
        const duration = event.duration
        if (duration > 1000) {
          dbLogger.warn('Slow query detected', {
            query: event.query,
            duration,
            params: event.params,
          })
        }
        this.queryMetrics.total++
        if (duration > 1000) {
          this.queryMetrics.slowQueries++
        }
      })
    }

    // Log errors
    this.$on('error' as never, (event: PrismaErrorEvent) => {
      dbLogger.error('Prisma error', {
        message: event.message,
        target: event.target,
      })
      this.queryMetrics.errors++
    })

    // Log warnings
    this.$on('warn' as never, (event: PrismaWarnEvent) => {
      dbLogger.warn('Prisma warning', {
        message: event.message,
      })
    })

    this.setupSoftDeleteMiddleware()
  }

  private setupSoftDeleteMiddleware(): void {
    const modelsWithSoftDelete = [
      'User',
      'Test',
      'Problem',
      'Exam',
      'Subject',
      'Topic',
      'CanonicalQuestion',
    ]

    const injectDeletedAt = (
      where: Record<string, unknown> | undefined
    ): Record<string, unknown> => {
      if (!where) return { deletedAt: null }
      if (where.deletedAt !== undefined) return where

      const newWhere: Record<string, unknown> = { ...where }
      if (Array.isArray(newWhere.OR)) {
        newWhere.OR = newWhere.OR.map(cond => injectDeletedAt(cond as Record<string, unknown>))
      }
      if (newWhere.AND) {
        if (Array.isArray(newWhere.AND)) {
          newWhere.AND = newWhere.AND.map(cond => injectDeletedAt(cond as Record<string, unknown>))
        } else {
          newWhere.AND = injectDeletedAt(newWhere.AND as Record<string, unknown>)
        }
      }
      if (newWhere.NOT) {
        if (Array.isArray(newWhere.NOT)) {
          newWhere.NOT = newWhere.NOT.map(cond => injectDeletedAt(cond as Record<string, unknown>))
        } else {
          newWhere.NOT = injectDeletedAt(newWhere.NOT as Record<string, unknown>)
        }
      }

      if (newWhere.deletedAt === undefined) {
        newWhere.deletedAt = null
      }

      return newWhere
    }

    this.$use(async (params, next) => {
      if (params.model && modelsWithSoftDelete.includes(params.model)) {
        if (
          params.action === 'findUnique' ||
          params.action === 'findFirst' ||
          params.action === 'findUniqueOrThrow' ||
          params.action === 'findFirstOrThrow'
        ) {
          // Keep findUnique as findUnique to preserve unique-index fast path
          // Inject deletedAt: null to exclude soft-deleted rows
          params.args.where = injectDeletedAt(params.args.where)
        }
        if (
          params.action === 'findMany' ||
          params.action === 'count' ||
          params.action === 'aggregate' ||
          params.action === 'groupBy'
        ) {
          params.args.where = injectDeletedAt(params.args.where)
        }
        if (params.action === 'updateMany') {
          params.args.where = injectDeletedAt(params.args.where)
        }
        if (params.action === 'delete') {
          params.action = 'update'
          params.args.data = { deletedAt: new Date() }
        }
        if (params.action === 'deleteMany') {
          params.action = 'updateMany'
          params.args.data = { ...(params.args.data || {}), deletedAt: new Date() }
        }
      }
      return next(params)
    })
  }

  /**
   * Execute a transaction with retry logic
   */
  async executeTransaction<T>(
    fn: (
      tx: Omit<
        PrismaClient,
        '$on' | '$connect' | '$disconnect' | '$use' | '$transaction' | '$extends'
      >
    ) => Promise<T>,
    maxRetries = 3
  ): Promise<T> {
    let lastError: Error | undefined

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        return await this.$transaction(fn)
      } catch (error) {
        lastError = error as Error

        // Only retry on deadlock or connection errors
        if (!this.isRetryableError(error)) {
          throw error
        }

        dbLogger.warn(`Transaction failed (attempt ${attempt}/${maxRetries})`, {
          error: lastError.message,
        })

        // Exponential backoff
        await this.sleep(100 * Math.pow(2, attempt - 1))
      }
    }

    throw lastError
  }

  /**
   * Check if an error is retryable
   */
  private isRetryableError(error: unknown): boolean {
    if (!(error instanceof Error)) return false

    const retryableErrors = [
      'P1002', // Database timeout
      'P1008', // Operations timed out
      'P1017', // Server has closed the connection
      'P2002', // Unique constraint violation (possible race condition)
      'P2024', // Timed out fetching a connection from the pool
      'P2034', // Transaction failed due to a write conflict or a deadlock
    ]

    return retryableErrors.some(code => error.message?.includes(code))
  }

  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms))
  }

  /**
   * Get query metrics for monitoring
   */
  getQueryMetrics() {
    return { ...this.queryMetrics }
  }

  /**
   * Health check for database connectivity
   */
  async healthCheck(): Promise<{ healthy: boolean; latency: number }> {
    const start = Date.now()
    try {
      await this.$queryRaw`SELECT 1`
      return {
        healthy: true,
        latency: Date.now() - start,
      }
    } catch (error) {
      dbLogger.error('Database health check failed', { error })
      return {
        healthy: false,
        latency: Date.now() - start,
      }
    }
  }
}

// Create base singleton instance
const basePrisma = globalForPrisma.prisma || new ExtendedPrismaClient(prismaOptions)

const replicaUrl = process.env.DATABASE_URL_REPLICA
let replicaClient: PrismaClient | undefined

if (replicaUrl) {
  replicaClient = new PrismaClient({
    datasources: { db: { url: replicaUrl } },
  })
}

// Apply Read Replicas extension only when a replica is configured
export const prisma = replicaClient
  ? basePrisma.$extends(
      readReplicas({
        replicas: [
          replicaClient as unknown as Parameters<typeof readReplicas>[0]['replicas'][number],
        ],
      })
    )
  : basePrisma

// Cache instance in development to prevent hot-reload issues
if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = basePrisma
}

// Graceful shutdown — database disconnect only (server.ts handles full shutdown)
process.on('beforeExit', async () => {
  await prisma.$disconnect()
  dbLogger.info('Database connection closed')
})

// NOTE: SIGINT/SIGTERM handlers are managed by server.ts to ensure
// proper shutdown ordering (HTTP server drain → WebSocket close → DB disconnect).
// Do NOT add signal handlers here — they would call process.exit(0) before
// server.ts can gracefully close connections.

export default prisma
