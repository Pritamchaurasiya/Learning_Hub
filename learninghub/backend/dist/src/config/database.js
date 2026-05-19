"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.prisma = void 0;
const client_1 = require("@prisma/client");
const winston_1 = __importDefault(require("winston"));
// Logger for database operations
const dbLogger = winston_1.default.createLogger({
    level: process.env.LOG_LEVEL ?? 'info',
    format: winston_1.default.format.combine(winston_1.default.format.timestamp(), winston_1.default.format.errors({ stack: true }), winston_1.default.format.json()),
    defaultMeta: { service: 'database' },
    transports: [
        new winston_1.default.transports.Console({
            format: winston_1.default.format.combine(winston_1.default.format.colorize(), winston_1.default.format.simple()),
        }),
    ],
});
// Global Prisma client instance for connection pooling
const globalForPrisma = global;
/**
 * Get connection pool configuration based on environment
 */
const getConnectionPoolConfig = () => {
    if (process.env.NODE_ENV === 'production') {
        return {
            connection_limit: parseInt(process.env.DATABASE_CONNECTION_LIMIT ?? '20', 10),
            pool_timeout: parseInt(process.env.DATABASE_POOL_TIMEOUT ?? '30', 10),
            statement_cache_size: parseInt(process.env.DATABASE_STATEMENT_CACHE_SIZE ?? '100', 10),
        };
    }
    return {
        connection_limit: 10,
        pool_timeout: 30,
        statement_cache_size: 50,
    };
};
/**
 * Build database URL with connection pool parameters
 */
const buildDatabaseUrl = () => {
    const baseUrl = process.env.DATABASE_URL;
    if (!baseUrl) {
        throw new Error('DATABASE_URL environment variable is required');
    }
    const poolConfig = getConnectionPoolConfig();
    // Add connection pool parameters to URL
    const url = new URL(baseUrl);
    url.searchParams.set('connection_limit', String(poolConfig.connection_limit));
    url.searchParams.set('pool_timeout', String(poolConfig.pool_timeout));
    return url.toString();
};
/**
 * Prisma client options with production optimizations
 */
const prismaOptions = {
    log: process.env.NODE_ENV === 'production'
        ? [
            { emit: 'event', level: 'error' },
            { emit: 'event', level: 'warn' },
        ]
        : [
            { emit: 'event', level: 'query' },
            { emit: 'event', level: 'error' },
            { emit: 'event', level: 'warn' },
            { emit: 'stdout', level: 'info' },
        ],
    datasources: {
        db: {
            url: buildDatabaseUrl(),
        },
    },
};
/**
 * Extended Prisma Client with query logging and metrics
 */
class ExtendedPrismaClient extends client_1.PrismaClient {
    queryMetrics = {
        total: 0,
        slowQueries: 0,
        errors: 0,
    };
    constructor(options) {
        super(options);
        this.setupQueryLogging();
    }
    setupQueryLogging() {
        // Log queries in development
        if (process.env.NODE_ENV !== 'production') {
            this.$on('query', (event) => {
                const duration = event.duration;
                if (duration > 1000) {
                    dbLogger.warn('Slow query detected', {
                        query: event.query,
                        duration,
                        params: event.params,
                    });
                }
                this.queryMetrics.total++;
                if (duration > 1000) {
                    this.queryMetrics.slowQueries++;
                }
            });
        }
        // Log errors
        this.$on('error', (event) => {
            dbLogger.error('Prisma error', {
                message: event.message,
                target: event.target,
            });
            this.queryMetrics.errors++;
        });
        // Log warnings
        this.$on('warn', (event) => {
            dbLogger.warn('Prisma warning', {
                message: event.message,
            });
        });
    }
    /**
     * Execute a transaction with retry logic
     */
    async executeTransaction(fn, maxRetries = 3) {
        let lastError;
        for (let attempt = 1; attempt <= maxRetries; attempt++) {
            try {
                return await this.$transaction(fn);
            }
            catch (error) {
                lastError = error;
                // Only retry on deadlock or connection errors
                if (!this.isRetryableError(error)) {
                    throw error;
                }
                dbLogger.warn(`Transaction failed (attempt ${attempt}/${maxRetries})`, {
                    error: lastError.message,
                });
                // Exponential backoff
                await this.sleep(100 * Math.pow(2, attempt - 1));
            }
        }
        throw lastError;
    }
    /**
     * Check if an error is retryable
     */
    isRetryableError(error) {
        if (!(error instanceof Error))
            return false;
        const retryableErrors = [
            'P1002', // Database timeout
            'P1008', // Operations timed out
            'P1017', // Server has closed the connection
            'P2002', // Unique constraint violation (possible race condition)
            'P2024', // Timed out fetching a connection from the pool
            'P2034', // Transaction failed due to a write conflict or a deadlock
        ];
        return retryableErrors.some(code => error.message?.includes(code));
    }
    sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
    /**
     * Get query metrics for monitoring
     */
    getQueryMetrics() {
        return { ...this.queryMetrics };
    }
    /**
     * Health check for database connectivity
     */
    async healthCheck() {
        const start = Date.now();
        try {
            await this.$queryRaw `SELECT 1`;
            return {
                healthy: true,
                latency: Date.now() - start,
            };
        }
        catch (error) {
            dbLogger.error('Database health check failed', { error });
            return {
                healthy: false,
                latency: Date.now() - start,
            };
        }
    }
}
// Create singleton instance
exports.prisma = globalForPrisma.prisma || new ExtendedPrismaClient(prismaOptions);
// Cache instance in development to prevent hot-reload issues
if (process.env.NODE_ENV !== 'production') {
    globalForPrisma.prisma = exports.prisma;
}
// Graceful shutdown — database disconnect only (server.ts handles full shutdown)
process.on('beforeExit', async () => {
    await exports.prisma.$disconnect();
    dbLogger.info('Database connection closed');
});
// NOTE: SIGINT/SIGTERM handlers are managed by server.ts to ensure
// proper shutdown ordering (HTTP server drain → WebSocket close → DB disconnect).
// Do NOT add signal handlers here — they would call process.exit(0) before
// server.ts can gracefully close connections.
process.on('uncaughtException', async (error) => {
    dbLogger.error('Uncaught exception, disconnecting database', { error });
    await exports.prisma.$disconnect();
    process.exit(1);
});
exports.default = exports.prisma;
