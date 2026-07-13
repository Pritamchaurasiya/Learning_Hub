import 'dotenv/config'
import { initSentry } from './utils/sentry'
initSentry()

import logger from './utils/logger'
import { prisma } from './config'
import { cacheService } from './services/CacheService'
import { jobQueueService } from './services/JobQueueService'

async function startWorker() {
  logger.info('🚀 Starting LearningHub ML Worker...')

  try {
    await cacheService.connect()
    logger.info('✅ Worker connected to Redis')

    // The JobQueueService initializes its Queues and Workers in its constructor.
    // By setting WORKER_MODE=true in ecosystem.config.js, the logic in JobQueueService
    // will be modified (we will implement this next) to ONLY process jobs when in worker mode.

    // We explicitly call health check just to verify connection
    const health = await jobQueueService.getQueueHealth()
    logger.info('✅ Worker connected to Job Queues.', { health })

    // Handle graceful shutdown
    const gracefulShutdown = async (signal: string) => {
      logger.info(`Received ${signal}, shutting down worker gracefully...`)
      await jobQueueService.close()
      await cacheService.disconnect()
      await prisma.$disconnect()
      process.exit(0)
    }

    process.on('SIGTERM', () => gracefulShutdown('SIGTERM'))
    process.on('SIGINT', () => gracefulShutdown('SIGINT'))
  } catch (error) {
    logger.error('❌ Failed to start worker:', error as Error)
    process.exit(1)
  }
}

void startWorker()
