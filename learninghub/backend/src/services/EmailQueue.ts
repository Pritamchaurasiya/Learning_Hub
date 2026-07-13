import Queue from 'bull'
import { emailService, type EmailOptions } from './EmailService'
import logger from '../utils/logger'

const REDIS_URL = process.env.REDIS_URL ?? 'redis://localhost:6379'

export interface EmailJobData {
  type: 'send'
  options: EmailOptions
}

export interface TemplateEmailJobData {
  type:
    | 'verification'
    | 'passwordReset'
    | 'welcome'
    | 'contestNotification'
    | 'subscriptionConfirmation'
  to: string
  templateData: Record<string, unknown>
}

export type EmailJob = EmailJobData | TemplateEmailJobData

class EmailQueueService {
  private queue: Queue.Queue<EmailJob> | null = null
  private isInitialized = false

  constructor() {
    if (process.env.NODE_ENV !== 'test' && process.env.REDIS_ENABLED === 'true') {
      this.initialize()
    }
  }

  private initialize(): void {
    try {
      this.queue = new Queue<EmailJob>('email', REDIS_URL, {
        defaultJobOptions: {
          attempts: 3,
          backoff: {
            type: 'exponential',
            delay: 5000,
          },
          removeOnComplete: 100,
          removeOnFail: 50,
        },
      })

      void this.queue.process(async job => {
        const data = job.data
        switch (data.type) {
          case 'send':
            return emailService.sendInline(data.options)
          case 'verification':
            return emailService.sendVerificationEmail(
              data.to,
              data.templateData.token as string,
              data.templateData.username as string | undefined
            )
          case 'passwordReset':
            return emailService.sendPasswordResetEmail(
              data.to,
              data.templateData.token as string,
              data.templateData.username as string | undefined
            )
          case 'welcome':
            return emailService.sendWelcomeEmail(
              data.to,
              data.templateData.username as string | undefined
            )
          case 'contestNotification':
            return emailService.sendContestNotification(
              data.to,
              data.templateData.contestTitle as string,
              data.templateData.startTime as Date,
              data.templateData.username as string | undefined
            )
          case 'subscriptionConfirmation':
            return emailService.sendSubscriptionConfirmation(
              data.to,
              data.templateData.tierName as string,
              data.templateData.amount as string,
              data.templateData.username as string | undefined
            )
          default:
            throw new Error(`Unknown email job type: ${(data as { type: string }).type}`)
        }
      })

      this.queue.on('completed', job => {
        logger.debug(`[EmailQueue] Job ${job.id} completed: ${job.data.type}`)
      })

      this.queue.on('failed', (job, err) => {
        logger.error(`[EmailQueue] Job ${job?.id} failed: ${err.message}`)
      })

      this.isInitialized = true
      logger.info('[EmailQueue] Email queue initialized')
    } catch (error) {
      logger.error(
        '[EmailQueue] Queue initialization failed. Emails will be sent inline.',
        error instanceof Error ? error : new Error(String(error))
      )
    }
  }

  async enqueue(job: EmailJob): Promise<void> {
    if (!this.queue || !this.isInitialized) {
      await emailService.sendInline(
        job.type === 'send'
          ? job.options
          : {
              to: job.to,
              subject: 'LearningHub Notification',
              html: '',
            }
      )
      return
    }

    try {
      await this.queue.add(job)
    } catch (error) {
      logger.error(
        '[EmailQueue] Failed to enqueue email job, sending inline',
        error instanceof Error ? error : new Error(String(error))
      )
      if (job.type === 'send') {
        await emailService.sendInline(job.options)
      }
    }
  }

  async getQueueStats(): Promise<{
    waiting: number
    active: number
    completed: number
    failed: number
  } | null> {
    if (!this.queue) return null

    const [waiting, active, completed, failed] = await Promise.all([
      this.queue.getWaitingCount(),
      this.queue.getActiveCount(),
      this.queue.getCompletedCount(),
      this.queue.getFailedCount(),
    ])

    return { waiting, active, completed, failed }
  }

  async close(): Promise<void> {
    if (this.queue) {
      await this.queue.close()
      this.isInitialized = false
    }
  }
}

export const emailQueue = new EmailQueueService()
export default emailQueue
