import Queue, { Job, QueueOptions } from 'bull'
import logger from '../utils/logger'
import type { XPReason } from './GrowthEngineService'

const REDIS_URL = process.env.REDIS_QUEUE_URL ?? process.env.REDIS_URL ?? 'redis://localhost:6379'
const REDIS_ENABLED = process.env.REDIS_ENABLED === 'true'

interface EmailJobData {
  to: string
  subject: string
  template: string
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  data: Record<string, any>
}

interface AIJobData {
  userId: string
  operation: string
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  params: Record<string, any>
}

interface ReportJobData {
  userId: string
  reportType: string
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
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
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  details?: Record<string, any>
}

export interface TestSubmissionJobData {
  attemptId: string
  testId: string
  userId: string
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
  private testSubmissionQueue?: Queue.Queue<TestSubmissionJobData>
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
    this.testSubmissionQueue = new Queue<TestSubmissionJobData>('test-submission', queueConfig)

    this.setupProcessors()
    this.setupEventHandlers()
  }

  private setupProcessors() {
    void this.emailQueue?.process(10, async (job: Job<EmailJobData>) => {
      logger.info('Processing email job', { jobId: job.id })
      // Email sending logic here
      return { sent: true, jobId: job.id }
    })

    void this.aiQueue?.process(5, async (job: Job<AIJobData>) => {
      logger.info('Processing AI job', { jobId: job.id, operation: job.data.operation })
      try {
        await this.processAIJobData(job.data)
        return { completed: true, jobId: job.id }
      } catch (error) {
        logger.error(
          'Failed to process AI job',
          error instanceof Error ? error : new Error(String(error))
        )
        throw error
      }
    })

    void this.reportQueue?.process(2, async (job: Job<ReportJobData>) => {
      logger.info('Processing report job', { jobId: job.id })
      // Report generation logic here
      return { generated: true, jobId: job.id }
    })

    void this.analyticsQueue?.process(5, async (job: Job<AnalyticsJobData>) => {
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

    void this.growthQueue?.process(10, async (job: Job<GrowthJobData>) => {
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

    void this.testSubmissionQueue?.process(5, async (job: Job<TestSubmissionJobData>) => {
      logger.info('Processing test submission job', { attemptId: job.data.attemptId })
      try {
        const { testEngineService } = await import('./TestEngineService')
        await testEngineService.processExpiredTestSubmission(job.data.attemptId)
        return { completed: true, attemptId: job.data.attemptId }
      } catch (error) {
        logger.error(
          `Failed to process test submission job for attempt ${job.data.attemptId}`,
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
      this.testSubmissionQueue,
    ]
    queues.forEach(queue => {
      queue?.on('completed', (job: Job) => {
        logger.info('Job completed', { queue: queue.name, jobId: job.id })
      })

      queue?.on('failed', async (job: Job | undefined, err: Error) => {
        logger.error(`Job failed in queue ${queue?.name}`, err, {
          jobId: job?.id,
          attemptsMade: job?.attemptsMade,
        })

        // Dead-Letter Queue Logic for AI Grading
        if (queue?.name === 'ai' && job && job.data?.operation === 'GRADE_SUBJECTIVE') {
          const maxAttempts = job.opts.attempts ?? 3
          if (job.attemptsMade >= maxAttempts) {
            logger.warn(
              `[DLQ] AI Grading permanently failed for job ${job.id}. Flagging for manual review.`
            )
            try {
              const { prisma } = await import('../prismaClient')
              const { testResultId, questionId } = job.data.params

              // Safely set the score to 0 and explicitly flag AI Feedback so the frontend/teacher knows
              await prisma.testAttemptAnswer.update({
                where: {
                  testResultId_questionId: {
                    testResultId,
                    questionId,
                  },
                },
                data: {
                  marksObtained: 0,
                  isCorrect: false,
                  aiFeedback:
                    'SYSTEM ERROR: AI Grading Service permanently failed. Marked for manual review.',
                },
              })
            } catch (dlqError) {
              logger.error(
                '[DLQ] Failed to update TestAttemptAnswer fallback',
                dlqError instanceof Error ? dlqError : new Error(String(dlqError))
              )
            }
          }
        }
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

  private async processAIJobData(data: AIJobData): Promise<void> {
    if (data.operation === 'GRADE_SUBJECTIVE') {
      const { aiTestService } = await import('./AITestService')
      const { prisma } = await import('../prismaClient')

      const { testResultId, questionId, questionText, answerText, points, testId } = data.params

      const grading = await aiTestService.gradeSubjectiveAnswer(questionText, answerText, points)
      const isCorrect = grading.score >= points * 0.5

      // Update the attempt answer with graded score
      await prisma.testAttemptAnswer.update({
        where: {
          testResultId_questionId: {
            testResultId,
            questionId,
          },
        },
        data: {
          marksObtained: Math.min(points, Math.max(0, grading.score)),
          isCorrect,
          aiFeedback: grading.feedback,
        },
      })

      // Recalculate total score for the test result
      const allAnswers = await prisma.testAttemptAnswer.findMany({
        where: { testResultId },
        select: { marksObtained: true },
      })

      let newScore = 0
      for (const a of allAnswers) {
        newScore += a.marksObtained ?? 0
      }

      // Fetch test passing score to update pass/fail status
      const test = await prisma.test.findUnique({
        where: { id: testId },
        select: { passingScore: true, totalMarks: true },
      })

      const totalPoints = test?.totalMarks ?? points
      const percentage = totalPoints > 0 ? (newScore / totalPoints) * 100 : 0
      const passed = percentage >= (test?.passingScore ?? 0)

      await prisma.testResult.update({
        where: { id: testResultId },
        data: {
          score: newScore,
          percentage,
          passed,
        },
      })

      // Notify the user in real-time that grading is complete
      const { webSocketService } = await import('./WebSocketService')
      webSocketService.notifyUser(data.userId, 'subjective_grade_completed', {
        testResultId,
        questionId,
        marksObtained: grading.score,
        isCorrect,
        aiFeedback: grading.feedback,
        newTotalScore: newScore,
        percentage,
        passed,
      })
    } else if (data.operation === 'GENERATE_PRACTICE_TEST') {
      const { aiTestService } = await import('./AITestService')
      const { webSocketService } = await import('./WebSocketService')

      try {
        const testResult = await aiTestService.generateTest({
          userId: data.userId,
          ...data.params,
        } as any)

        webSocketService.notifyUser(data.userId, 'ai_test_generated', {
          success: true,
          testId: testResult.testId,
          title: testResult.title,
        })
      } catch (error) {
        logger.error('[JobQueueService] GENERATE_PRACTICE_TEST failed', error as Error)
        webSocketService.notifyUser(data.userId, 'ai_test_generated', {
          success: false,
          error: (error as Error).message,
        })
      }
    }
  }

  async addAIJob(data: AIJobData, priority?: number) {
    if (!this.enabled || !this.aiQueue) {
      logger.warn('[JobQueueService] AI job falling back to in-memory processing')
      setImmediate(() => {
        this.processAIJobData(data).catch(err => {
          logger.error('[JobQueueService] In-memory AI job failed:', err)
        })
      })
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

  async addTestSubmissionJob(data: TestSubmissionJobData) {
    if (!this.enabled || !this.testSubmissionQueue) {
      const { testEngineService } = await import('./TestEngineService')
      await testEngineService
        .processExpiredTestSubmission(data.attemptId)
        .catch(e => logger.error('Fallback test submission err', e as Error))
      return null
    }
    return this.testSubmissionQueue.add(data)
  }

  async getJobStatus(
    queue: 'email' | 'ai' | 'report' | 'analytics' | 'growth' | 'testSubmission',
    jobId: string
  ) {
    const targetQueue =
      queue === 'email'
        ? this.emailQueue
        : queue === 'ai'
          ? this.aiQueue
          : queue === 'report'
            ? this.reportQueue
            : queue === 'analytics'
              ? this.analyticsQueue
              : queue === 'growth'
                ? this.growthQueue
                : this.testSubmissionQueue
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
      const [email, ai, report, analytics, growth, testSubmission] = await Promise.all([
        this.emailQueue?.getJobCounts() ?? Promise.resolve({}),
        this.aiQueue?.getJobCounts() ?? Promise.resolve({}),
        this.reportQueue?.getJobCounts() ?? Promise.resolve({}),
        this.analyticsQueue?.getJobCounts() ?? Promise.resolve({}),
        this.growthQueue?.getJobCounts() ?? Promise.resolve({}),
        this.testSubmissionQueue?.getJobCounts() ?? Promise.resolve({}),
      ])
      return {
        status: 'redis_active',
        queues: { email, ai, report, analytics, growth, testSubmission },
      }
    } catch (error) {
      return { status: 'error', message: (error as Error).message }
    }
  }

  async close() {
    logger.info('[JobQueueService] Shutting down — flushing pending work...')

    // Flush pending topic performance cache invalidations before closing
    try {
      const { topicPerformanceService } = await import('./TopicPerformanceService')
      await topicPerformanceService.flushPendingInvalidations()
      logger.info('[JobQueueService] Topic performance cache invalidations flushed')
    } catch (e) {
      logger.error(
        '[JobQueueService] Failed to flush topic performance invalidations during shutdown',
        e instanceof Error ? e : new Error(String(e))
      )
    }

    await Promise.all([
      this.emailQueue?.close(),
      this.aiQueue?.close(),
      this.reportQueue?.close(),
      this.analyticsQueue?.close(),
      this.growthQueue?.close(),
      this.testSubmissionQueue?.close(),
    ])
    logger.info('[JobQueueService] All queues closed')
  }
}

export const jobQueueService = new JobQueueService()
