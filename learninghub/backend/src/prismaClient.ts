/**
 * Unified Prisma Client Export
 *
 * All imports should use this file. It re-exports the extended Prisma client
 * from config/database.ts which includes query logging, transaction retry,
 * connection pooling, and health checks.
 *
 * DO NOT create additional PrismaClient instances elsewhere.
 */

export { prisma, default } from './config/database'
