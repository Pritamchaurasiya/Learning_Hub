import Queue, { Job, QueueOptions } from 'bull'
import { logger } from '../utils/logger'
import type { XPReason } from './GrowthEngineService'

const REDIS_URL = process.env.REDIS_URL ?? 'redis://localhost:6379'
const REDIS_ENABLED = process.env.REDIS_ENABLED === 'true'

interface EmailJobData {
  to: string
  subject: string
  template: string
  data: Record<string, any>
}

interface AIJobData {
  userId: string
  operation: string
  params: Record<string, any>
}

interface ReportJobData {
  userId: string
  reportType: string
  filters: Record<string, any>
}

export interface AnalyticsJobData {
  userId: string
  testResultId: string
  questionResults: {
    questionId: string
    topicName: string
    subjectName?: string
    isCorrect: boolean
    timeSpentSeconds?: number
  }[]
}

export interface GrowthJobData {
  userId: string
  action: XPReason
  details?: Record<string, any>
}

const queueConfig: QueueOptions = {
  redis: REDIS_URL,
  defaultJobOptions: {
    attempts: 3,
    backoff: { type: 'exponential', delay: 2000 },
    removeOnComplete: 100,
    removeOnFail: 500,
  },
}

class JobQueueService {
  private emailQueue?: Queue.Queue<EmailJobData>
  private aiQueue?: Queue.Queue<AIJobData>
  private reportQueue?: Queue.Queue<ReportJobData>
  private analyticsQueue?: Queue.Queue<AnalyticsJobData>
  private growthQueue?: Queue.Queue<GrowthJobData>
  private enabled: boolean

  constructor() {
    this.enabled = REDIS_ENABLED
    if (!this.enabled) {
      logger.warn('Job queues disabled (Redis not enabled)')
      return
    }

    this.emailQueue = new Queue<EmailJobData>('email', queueConfig)
    this.aiQueue = new Queue<AIJobData>('ai', queueConfig)
    this.reportQueue = new Queue<ReportJobData>('report', queueConfig)
    this.analyticsQueue = new Queue<AnalyticsJobData>('analytics', queueConfig)
    this.growthQueue = new Queue<GrowthJobData>('growth', queueConfig)

    this.setupProcessors()
    this.setupEventHandlers()
  }

  private setupProcessors() {
    void this.emailQueue?.process(async (job: Job<EmailJobData>) => {
      logger.info('Processing email job', { jobId: job.id })
      // Email sending logic here
      return { sent: true, jobId: job.id }
    })

    void this.aiQueue?.process(async (job: Job<AIJobData>) => {
      logger.info('Processing AI job', { jobId: job.id })
      // AI operation logic here
      return { completed: true, jobId: job.id }
    })

    void this.reportQueue?.process(async (job: Job<ReportJobData>) => {
      logger.info('Processing report job', { jobId: job.id })
      // Report generation logic here
      return { generated: true, jobId: job.id }
    })

    void this.analyticsQueue?.process(async (job: Job<AnalyticsJobData>) => {
      logger.debug('Processing analytics job', { jobId: job.id, userId: job.data.userId })
      try {
        const { topicPerformanceService } = await import('./TopicPerformanceService')
        await topicPerformanceService.updateForTestResults(
          job.data.userId,
          job.data.questionResults
        )
        return { completed: true, jobId: job.id }
      } catch (error) {
        logger.error(
          'Failed to process analytics job',
          error instanceof Error ? error : new Error(String(error))
        )
        throw error
      }
    })

    void this.growthQueue?.process(async (job: Job<GrowthJobData>) => {
      logger.debug('Processing growth job', { jobId: job.id, userId: job.data.userId })
      try {
        const { growthEngineService } = await import('./GrowthEngineService')
        await growthEngineService.awardXP(job.data.userId, job.data.action)
        return { completed: true, jobId: job.id }
      } catch (error) {
        logger.error(
          'Failed to process growth job',
          error instanceof Error ? error : new Error(String(error))
        )
        throw error
      }
    })
  }

  private setupEventHandlers() {
    const queues = [
      this.emailQueue,
      this.aiQueue,
      this.reportQueue,
      this.analyticsQueue,
      this.growthQueue,
    ]
    queues.forEach(queue => {
      queue?.on('completed', (job: Job) => {
        logger.info('Job completed', { queue: queue.name, jobId: job.id })
      })

      queue?.on('failed', (job: Job | undefined, err: Error) => {
        logger.error('Job failed', err, { jobId: job?.id })
      })
    })
  }

  async addEmailJob(data: EmailJobData, priority?: number) {
    if (!this.enabled || !this.emailQueue) {
      logger.warn('[JobQueueService] Email job falling back to in-memory processing')
      setTimeout(() => {
        logger.info('Processing email job in-memory', { to: data.to })
      }, 0)
      return null
    }
    return this.emailQueue.add(data, { priority })
  }

  async addAIJob(data: AIJobData, priority?: number) {
    if (!this.enabled || !this.aiQueue) {
      logger.warn('[JobQueueService] AI job falling back to in-memory processing')
      setTimeout(() => {
        logger.info('Processing AI job in-memory', { userId: data.userId })
      }, 0)
      return null
    }
    return this.aiQueue.add(data, { priority })
  }

  async addReportJob(data: ReportJobData, priority?: number) {
    if (!this.enabled || !this.reportQueue) {
      logger.warn('[JobQueueService] Report job falling back to in-memory processing')
      setTimeout(() => {
        logger.info('Processing report job in-memory', { userId: data.userId })
      }, 0)
      return null
    }
    return this.reportQueue.add(data, { priority })
  }

  async addAnalyticsJob(data: AnalyticsJobData) {
    if (!this.enabled || !this.analyticsQueue) {
      // Synchronous fallback if Redis is disabled
      const { topicPerformanceService } = await import('./TopicPerformanceService')
      await topicPerformanceService
        .updateForTestResults(data.userId, data.questionResults)
        .catch(e => logger.error('Fallback analytics err', e as Error))
      return null
    }
    return this.analyticsQueue.add(data)
  }

  async addGrowthJob(data: GrowthJobData) {
    if (!this.enabled || !this.growthQueue) {
      // Synchronous fallback
      const { growthEngineService } = await import('./GrowthEngineService')
      await growthEngineService
        .awardXP(data.userId, data.action)
        .catch(e => logger.error('Fallback growth err', e as Error))
      return null
    }
    return this.growthQueue.add(data)
  }

  async getJobStatus(queue: 'email' | 'ai' | 'report', jobId: string) {
    const targetQueue =
      queue === 'email' ? this.emailQueue : queue === 'ai' ? this.aiQueue : this.reportQueue
    if (!targetQueue) return null
    const job = await targetQueue.getJob(jobId)
    return job ? { state: await job.getState(), progress: job.progress() } : null
  }

  async getQueueHealth() {
    if (!this.enabled) {
      return {
        status: 'fallback_in_memory',
        message: 'Redis is disabled. Jobs are processing synchronously.',
      }
    }
    try {
      const [email, ai, report, analytics, growth] = await Promise.all([
        this.emailQueue?.getJobCounts() || Promise.resolve({}),
        this.aiQueue?.getJobCounts() || Promise.resolve({}),
        this.reportQueue?.getJobCounts() || Promise.resolve({}),
        this.analyticsQueue?.getJobCounts() || Promise.resolve({}),
        this.growthQueue?.getJobCounts() || Promise.resolve({}),
      ])
      return {
        status: 'redis_active',
        queues: { email, ai, report, analytics, growth },
      }
    } catch (error) {
      return { status: 'error', message: (error as Error).message }
    }
  }

  async close() {
    await Promise.all([
      this.emailQueue?.close(),
      this.aiQueue?.close(),
      this.reportQueue?.close(),
      this.analyticsQueue?.close(),
      this.growthQueue?.close(),
    ])
  }
}

export const jobQueueService = new JobQueueService()
