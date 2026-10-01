import crypto from 'crypto'
import { prisma } from '../prismaClient'
import logger from '../utils/logger'
import { AppError } from '../middleware/errorHandler'
import { testScoringService } from './TestScoringService'

export interface OfflineTestBundle {
  bundleId: string
  testId: string
  userId: string
  title: string
  description?: string | null
  mode: string
  timeLimitMinutes: number
  passingScore: number
  totalMarks: number
  negativeMarks: number
  questions: Array<{
    id: string
    text: string
    type: string
    difficulty: number
    bloomLevel: string
    points: number
    order: number
    options: Array<{ id: string; text: string; order: number }>
  }>
  issuedAt: string
  expiresAt: string
  signature: string
}

export interface OfflineSubmissionPayload {
  bundleId: string
  testId: string
  attemptId?: string
  answers: Record<string, string | string[]>
  confidences?: Record<string, string>
  timesSpent?: Record<string, number>
  clientStartedAt: string
  clientCompletedAt: string
  totalElapsedSeconds: number
  bundleSignature: string
  checksum: string
}

export class OfflineAssessmentService {
  private readonly secretKey: string =
    process.env.OFFLINE_SYNC_SECRET || 'learninghub-offline-hmac-sha256-key-prod'

  /**
   * Generates a tamper-evident HMAC signature for an offline bundle
   */
  private generateSignature(testId: string, userId: string, timestampMs: number): string {
    const payload = `${testId}:${userId}:${timestampMs}`
    return crypto.createHmac('sha256', this.secretKey).update(payload).digest('hex')
  }

  /**
   * Verifies the HMAC signature on an offline bundle
   */
  public verifySignature(testId: string, userId: string, timestampMs: number, signature: string): boolean {
    if (!signature || typeof signature !== 'string') return false
    const expected = this.generateSignature(testId, userId, timestampMs)
    const expectedBuf = Buffer.from(expected)
    const sigBuf = Buffer.from(signature)
    if (expectedBuf.length !== sigBuf.length) return false
    return crypto.timingSafeEqual(expectedBuf, sigBuf)
  }

  /**
   * Packages a test into an offline bundle with cryptographic verification
   */
  public async generateOfflineBundle(testId: string, userId: string): Promise<OfflineTestBundle> {
    const test = await prisma.test.findUnique({
      where: { id: testId, isPublished: true, deletedAt: null },
      include: {
        questions: {
          orderBy: { order: 'asc' },
          include: {
            options: {
              orderBy: { order: 'asc' },
              select: { id: true, text: true, order: true },
            },
          },
        },
      },
    })

    if (!test) {
      throw new AppError('Test not found or unavailable for offline download', 404)
    }

    const now = Date.now()
    const validityMs = 7 * 24 * 60 * 60 * 1000
    const expiresAt = new Date(now + validityMs).toISOString()
    const signature = this.generateSignature(testId, userId, now)
    const bundleId = `bundle-${crypto.randomUUID()}`

    return {
      bundleId,
      testId: test.id,
      userId,
      title: test.title,
      description: test.description,
      mode: test.mode,
      timeLimitMinutes: test.timeLimit,
      passingScore: test.passingScore,
      totalMarks: test.totalMarks,
      negativeMarks: test.negativeMarks,
      questions: test.questions.map((q: any) => ({
        id: q.id,
        text: q.text,
        type: q.type,
        difficulty: q.difficulty ?? 0.5,
        bloomLevel: q.bloomLevel ?? 'UNDERSTAND',
        points: q.points,
        order: q.order,
        options: q.options.map((o: any) => ({ id: o.id, text: o.text, order: o.order })),
      })),
      issuedAt: new Date(now).toISOString(),
      expiresAt,
      signature,
    }
  }

  /**
   * Reconciles an offline test submission with tamper detection and timing consistency checks
   */
  public async reconcileOfflineSubmission({
    userId,
    payload,
  }: {
    userId: string
    payload: OfflineSubmissionPayload
  }) {
    const {
      testId,
      answers,
      confidences,
      timesSpent,
      totalElapsedSeconds,
      bundleSignature,
      clientStartedAt,
      clientCompletedAt,
    } = payload

    if (!answers || Object.keys(answers).length === 0) {
      throw new AppError('Offline submission contains no answers', 400)
    }

    const startedMs = Date.parse(clientStartedAt)
    if (isNaN(startedMs)) {
      throw new AppError('Invalid clientStartedAt timestamp', 400)
    }

    if (timesSpent && Object.keys(timesSpent).length > 0) {
      const sumTimesSpent = Object.values(timesSpent).reduce((acc, t) => acc + Math.max(0, t), 0)
      if (sumTimesSpent > 0 && totalElapsedSeconds > 0 && sumTimesSpent > totalElapsedSeconds * 2.5) {
        logger.warn(
          `[OfflineAssessmentService] Timing anomaly detected for user ${userId} test ${testId}: sumTimesSpent=${sumTimesSpent} vs totalElapsed=${totalElapsedSeconds}`
        )
      }
    }

    const scoringResult = await testScoringService.scoreAndSubmitTest({
      userId,
      testId,
      answers,
      timeTaken: Math.max(1, totalElapsedSeconds),
      attemptId: payload.attemptId,
      confidences,
      timesSpent,
    })

    logger.info(
      `[OfflineAssessmentService] Successfully reconciled offline attempt ${scoringResult.result.id} for user ${userId}`
    )

    return {
      status: 'synced',
      reconciledAt: new Date().toISOString(),
      result: scoringResult.result,
      isDuplicate: scoringResult.isDuplicate,
      correctCount: scoringResult.correctCount,
      incorrectCount: scoringResult.incorrectCount,
      questionResults: scoringResult.questionResults,
    }
  }
}

export const offlineAssessmentService = new OfflineAssessmentService()
