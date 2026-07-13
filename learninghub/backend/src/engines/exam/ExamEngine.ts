import { prisma } from '../../prismaClient'
import logger from '../../utils/logger'
import crypto from 'crypto'

export interface ProctoredSessionConfig {
  sessionId: string
  userId: string
  testId: string
  startTime: Date
  expiresAt: Date
  securityConfig: {
    fullscreenMandatory: boolean
    maxTabSwitches: number
    copyPasteDisabled: boolean
    webcamMonitoring: boolean
  }
}

export interface IRTItemEvaluation {
  sessionId: string
  questionId: string
  isCorrect: boolean
  timeSpentMs: number
  previousTheta: number
  updatedTheta: number
  nextRecommendedDifficulty: number // 1 to 5
}

export interface SecurityIncidentLog {
  sessionId: string
  incidentType:
    'TAB_SWITCH' | 'FULLSCREEN_EXIT' | 'MULTIPLE_FACES' | 'COPY_PASTE' | 'DEV_TOOLS_OPEN'
  timestamp: Date
  totalViolations: number
  isTerminated: boolean
  warningMessage: string
}

export interface ExamFinalReport {
  sessionId: string
  rawScore: number
  totalQuestions: number
  percentage: number
  scaledScore: number // 0 to 1000
  gradeBand: 'A+' | 'A' | 'B' | 'C' | 'D' | 'FAIL'
  verificationStatus: 'VERIFIED' | 'FLAGGED' | 'VOIDED'
  integrityHash: string
  completedAt: Date
}

export class ExamEngine {
  private activeViolations: Map<string, number> = new Map()

  /**
   * Initializes a new proctored exam session with security parameters.
   */
  public async createProctoredSession(
    userId: string,
    testId: string,
    durationMinutes: number = 60,
    strictProctoring: boolean = true
  ): Promise<ProctoredSessionConfig> {
    const sessionId = `exam_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`
    const startTime = new Date()
    const expiresAt = new Date(startTime.getTime() + durationMinutes * 60000)

    logger.info(
      `[ExamEngine] Creating proctored session ${sessionId} for user ${userId}, test ${testId}`
    )
    this.activeViolations.set(sessionId, 0)

    // Optionally record session initialization in DB if session table exists
    try {
      await prisma.testSession.create({
        data: {
          id: sessionId,
          userId,
          testId,
          status: 'IN_PROGRESS',
          startedAt: startTime,
        },
      })
    } catch (err) {
      logger.debug(
        `[ExamEngine] Could not persist test session to DB (fallback mode): ${err instanceof Error ? err.message : String(err)}`
      )
    }

    return {
      sessionId,
      userId,
      testId,
      startTime,
      expiresAt,
      securityConfig: {
        fullscreenMandatory: true,
        maxTabSwitches: strictProctoring ? 3 : 5,
        copyPasteDisabled: true,
        webcamMonitoring: strictProctoring,
      },
    }
  }

  /**
   * Evaluates an answer attempt using Item Response Theory (2PL model) and computes updated theta.
   */
  public evaluateItemResponse(
    sessionId: string,
    questionId: string,
    isCorrect: boolean,
    timeSpentMs: number,
    currentTheta: number = 0.0,
    itemDifficultyB: number = 0.0,
    itemDiscriminationA: number = 1.0
  ): IRTItemEvaluation {
    logger.info(
      `[ExamEngine] Evaluating item ${questionId} for session ${sessionId}, correct: ${isCorrect}`
    )

    // 2PL IRT Probability: P(theta) = 1 / (1 + exp(-a * (theta - b)))
    const logit = itemDiscriminationA * (currentTheta - itemDifficultyB)
    const probCorrect = 1.0 / (1.0 + Math.exp(-logit))

    // Learning rate update based on residual prediction error
    const learningRate = 0.35
    const errorResidual = (isCorrect ? 1.0 : 0.0) - probCorrect
    let updatedTheta = currentTheta + learningRate * errorResidual

    // Clamp theta between -3.0 and +3.0
    updatedTheta = Math.min(3.0, Math.max(-3.0, Math.round(updatedTheta * 100) / 100))

    // Determine next question difficulty (1 to 5) mapping from theta
    let nextRecommendedDifficulty = 3
    if (updatedTheta > 1.5) nextRecommendedDifficulty = 5
    else if (updatedTheta > 0.5) nextRecommendedDifficulty = 4
    else if (updatedTheta > -0.5) nextRecommendedDifficulty = 3
    else if (updatedTheta > -1.5) nextRecommendedDifficulty = 2
    else nextRecommendedDifficulty = 1

    return {
      sessionId,
      questionId,
      isCorrect,
      timeSpentMs,
      previousTheta: currentTheta,
      updatedTheta,
      nextRecommendedDifficulty,
    }
  }

  /**
   * Logs a security violation during the proctored exam and determines auto-termination.
   */
  public logSecurityIncident(
    sessionId: string,
    incidentType: SecurityIncidentLog['incidentType'],
    maxAllowedViolations: number = 3
  ): SecurityIncidentLog {
    const currentCount = (this.activeViolations.get(sessionId) || 0) + 1
    this.activeViolations.set(sessionId, currentCount)

    logger.warn(
      `[ExamEngine] Security incident [${incidentType}] on session ${sessionId}. Violation count: ${currentCount}/${maxAllowedViolations}`
    )

    const isTerminated = currentCount >= maxAllowedViolations
    let warningMessage = `Security warning (${currentCount}/${maxAllowedViolations}): Please remain in fullscreen mode and do not switch tabs.`

    if (isTerminated) {
      warningMessage = `CRITICAL: Maximum security infractions exceeded (${currentCount}/${maxAllowedViolations}). Your exam session has been terminated and flagged for review.`
    }

    return {
      sessionId,
      incidentType,
      timestamp: new Date(),
      totalViolations: currentCount,
      isTerminated,
      warningMessage,
    }
  }

  /**
   * Computes final exam scoring, grade banding, and generates cryptographic verification hash.
   */
  public async finalizeSessionScoring(
    sessionId: string,
    rawScore: number,
    totalQuestions: number
  ): Promise<ExamFinalReport> {
    logger.info(`[ExamEngine] Finalizing scoring for session ${sessionId}`)

    const percentage =
      totalQuestions > 0 ? Math.round((rawScore / totalQuestions) * 10000) / 100 : 0
    const scaledScore = Math.round(percentage * 10) // 0 to 1000 scale
    const violations = this.activeViolations.get(sessionId) || 0

    let gradeBand: ExamFinalReport['gradeBand'] = 'FAIL'
    if (percentage >= 90) gradeBand = 'A+'
    else if (percentage >= 80) gradeBand = 'A'
    else if (percentage >= 70) gradeBand = 'B'
    else if (percentage >= 60) gradeBand = 'C'
    else if (percentage >= 50) gradeBand = 'D'

    let verificationStatus: ExamFinalReport['verificationStatus'] = 'VERIFIED'
    if (violations >= 3) {
      verificationStatus = 'VOIDED'
      gradeBand = 'FAIL'
    } else if (violations > 0) {
      verificationStatus = 'FLAGGED'
    }

    // Generate cryptographic integrity hash for non-repudiation
    const payload = `${sessionId}:${rawScore}:${totalQuestions}:${scaledScore}:${verificationStatus}:${Date.now()}`
    const integrityHash = crypto.createHash('sha256').update(payload).digest('hex')

    // Clean up memory
    this.activeViolations.delete(sessionId)

    // Try updating session in DB if available (only from IN_PROGRESS state)
    try {
      await prisma.testSession.updateMany({
        where: { id: sessionId, status: 'IN_PROGRESS' },
        data: {
          status: 'COMPLETED',
          completedAt: new Date(),
          score: Math.round(percentage),
        },
      })
    } catch {
      // Ignore DB missing session
    }

    return {
      sessionId,
      rawScore,
      totalQuestions,
      percentage,
      scaledScore,
      gradeBand,
      verificationStatus,
      integrityHash,
      completedAt: new Date(),
    }
  }
}

export const examEngineInstance = new ExamEngine()
