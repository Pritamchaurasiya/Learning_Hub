import { PrismaClient } from '@prisma/client'
import 'dotenv/config'
import logger from './utils/logger'

logger.debug('Prisma Debug Info', {
  engineType: process.env.PRISMA_CLIENT_ENGINE_TYPE,
  hasDatabaseUrl: !!process.env.DATABASE_URL,
})

try {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const prisma = new PrismaClient()
  logger.info('Prisma initialized successfully')
  process.exit(0)
} catch (error) {
  logger.error(
    'Failed to initialize Prisma',
    error instanceof Error ? error : new Error(String(error))
  )
  process.exit(1)
}
