/**
 * Test Engine Service
 *
 * Handles all test-related business logic:
 *  - Timed test enforcement
 *  - Practice mode with instant feedback
 *  - Question bookmarks
 *  - Test analytics per topic
 *  - Test retry with different questions
 *  - Test attempt history
 */

import crypto from 'crypto'
import { Prisma, TestMode, AttemptStatus } from '@prisma/client'
import { prisma } from '../prismaClient'
import logger from '../utils/logger'
import { topicPerformanceService } from './TopicPerformanceService'
import { growthEngineService } from './GrowthEngineService'
import { adaptiveTestEngine } from '../engines/test/AdaptiveTestEngine'

export interface PracticeAnswerRequest {
  userId: string
  testId: string
  questionId: string
  selectedOptionId?: string | string[]
  textAnswer?: string
  timeSpent?: number
}

export interface PracticeAnswerResponse {
  questionId: string
  isCorrect: boolean
  explanation: string
  correctOptionId: string
  points: number
}

export class TestEngineService {
  /**
   * Submit a single answer in practice mode — returns instant feedback.
   */
  async submitPracticeAnswer(req: PracticeAnswerRequest): Promise<PracticeAnswerResponse> {
    const question = await prisma.question.findUnique({
      where: { id: req.questionId },
      include: {
        options: true,
        topic: { select: { name: true } },
        test: { select: { id: true, mode: true, timeLimit: true } },
      },
    })

    if (!question) {
      throw new Error('Question not found')
    }

    if (question.test.mode !== 'PRACTICE' && question.test.mode !== 'ADAPTIVE') {
      throw new Error('Practice mode is only available for practice tests')
    }

    const correctOption = question.options.find((o: { isCorrect: boolean }) => o.isCorrect)
    const isCorrect = req.selectedOptionId === correctOption?.id

    const maxRetries = 3
    let currentTry = 0

    while (currentTry < maxRetries) {
      try {
        const txResult = await prisma.$transaction(
          async (tx: Prisma.TransactionClient) => {
            // Find or create a practice test result for this user/test
            let practiceResult: any = await tx.testResult.findFirst({
              where: { userId: req.userId, testId: req.testId, status: 'IN_PROGRESS' },
              orderBy: { attemptNumber: 'desc' },
            })

            if (!practiceResult) {
              // Get next attempt number
              const maxAttempt = await tx.testResult.findFirst({
                where: { userId: req.userId, testId: req.testId },
                orderBy: { attemptNumber: 'desc' },
                select: { attemptNumber: true },
              })
              let nextAttemptNumber = (maxAttempt?.attemptNumber ?? 0) + 1

              // Retry on unique constraint violation (attemptNumber race condition)
              for (let attempt = 1; attempt <= 3; attempt++) {
                try {
                  practiceResult = await tx.testResult.create({
                    data: {
                      userId: req.userId,
                      testId: req.testId,
                      score: 0,
                      totalPoints: 0,
                      percentage: 0,
                      passed: false,
                      timeTaken: 0,
                      status: 'IN_PROGRESS',
                      attemptNumber: nextAttemptNumber,
                    },
                  })
                  break
                } catch (error) {
                  const err = error as Error & { code?: string }
                  if ((err.code === 'P2002' || err.message?.includes('P2002')) && attempt < 3) {
                    nextAttemptNumber++
                    continue
                  }
                  throw error
                }
              }
            }

            // 1. Upsert TestAttemptAnswer with incremental score update
            const submittedIds = req.selectedOptionId
              ? Array.isArray(req.selectedOptionId)
                ? req.selectedOptionId
                : [req.selectedOptionId]
              : []

            const existingAnswer = await tx.testAttemptAnswer.findUnique({
              where: {
                testResultId_questionId: {
                  testResultId: practiceResult.id,
                  questionId: req.questionId,
                },
              },
              select: { marksObtained: true },
            })

            const newMarks = isCorrect ? question.points : 0
            const oldMarks = existingAnswer?.marksObtained ?? 0
            const marksDelta = newMarks - oldMarks

            await tx.testAttemptAnswer.upsert({
              where: {
                testResultId_questionId: {
                  testResultId: practiceResult.id,
                  questionId: req.questionId,
                },
              },
              create: {
                testResultId: practiceResult.id,
                questionId: req.questionId,
                selectedOptions: submittedIds,
                textAnswer: req.textAnswer ?? null,
                isCorrect,
                marksObtained: newMarks,
                timeSpent: req.timeSpent ?? 0,
              },
              update: {
                selectedOptions: submittedIds,
                textAnswer: req.textAnswer ?? null,
                isCorrect,
                marksObtained: newMarks,
                timeSpent: req.timeSpent ?? 0,
              },
            })

            // 2. Update aggregate score incrementally (no full-scan N+1)
            const totalPointsIncrement = existingAnswer ? 0 : question.points
            const updatedResult = await tx.testResult.update({
              where: { id: practiceResult.id },
              data: {
                score: { increment: marksDelta },
                totalPoints: { increment: totalPointsIncrement },
              },
              select: { score: true, totalPoints: true },
            })
            await tx.testResult.update({
              where: { id: practiceResult.id },
              data: {
                percentage:
                  updatedResult.totalPoints > 0
                    ? Math.round((updatedResult.score / updatedResult.totalPoints) * 100)
                    : 0,
              },
            })

            return {
              questionId: question.id,
              isCorrect,
              explanation: question.explanation || 'No explanation available',
              correctOptionId: correctOption?.id || '',
              points: isCorrect ? question.points : 0,
            }
          },
          { isolationLevel: 'ReadCommitted' }
        )

        // Fire-and-forget growth engine updates AFTER transaction commits successfully.
        // These are non-critical and should not block the response or hold a DB transaction open.
        try {
          await growthEngineService.checkAndUpdateStreak(req.userId)
          await growthEngineService.awardXP(req.userId, 'practice_session')
          if (question.tags && question.tags.length > 0) {
            await topicPerformanceService.updateForSingleAnswer(
              req.userId,
              question.tags[0],
              isCorrect
            )
          }
        } catch (growthErr: unknown) {
          logger.warn(
            '[TestEngineService] Non-critical growth engine update failed:',
            growthErr instanceof Error ? { error: growthErr.message } : { error: String(growthErr) }
          )
        }

        return txResult
      } catch (error) {
        currentTry++
        if (currentTry >= maxRetries) {
          logger.error(
            `[TestEngineService] submitPracticeAnswer failed after ${maxRetries} tries`,
            error instanceof Error ? error : new Error(String(error))
          )
          throw error
        }
        await new Promise(r => setTimeout(r, 50 * Math.pow(2, currentTry)))
      }
    }
    throw new Error('Failed to submit answer')
  }

  /**
   * Get questions for a test with randomized order (or IRT adaptive ordering).
   */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  async getTestQuestions(testId: string, _userId: string): Promise<any[]> {
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
      throw new Error('Test not found')
    }

    // For practice mode, shuffle questions. For adaptive mode, sort by IRT Fisher Information.
    let questions = test.questions
    if (test.mode === 'PRACTICE') {
      questions = this.shuffleArray([...test.questions])
    } else if (test.mode === 'ADAPTIVE') {
      const theta = await adaptiveTestEngine.estimateUserAbility(
        _userId,
        test.questions[0]?.topicId
      )
      questions = adaptiveTestEngine.sortQuestionsByInformation([...test.questions], theta)
    }

    return questions.map((q: any) => ({
      id: q.id,
      text: q.text,
      type: q.type,
      difficulty: q.difficulty,
      bloom_level: q.bloomLevel,
      points: q.points,
      order: q.order,
      options: q.options.map((o: any) => ({
        id: o.id,
        text: o.text,
        order: o.order,
      })),
    }))
  }

  /**
   * Get the optimal next question for an adaptive test based on real-time IRT ability theta.
   */

  async getNextAdaptiveTestQuestion(
    testId: string,
    userId: string,
    answeredQuestionIds: string[]
  ): Promise<any | null> {
    const test = await prisma.test.findUnique({
      where: { id: testId, isPublished: true, deletedAt: null },
      include: {
        questions: {
          where:
            answeredQuestionIds.length > 0 ? { id: { notIn: answeredQuestionIds } } : undefined,
          include: {
            options: {
              orderBy: { order: 'asc' },
              select: { id: true, text: true, order: true },
            },
          },
        },
      },
    })

    if (!test || test.questions.length === 0) {
      return null
    }

    const theta = await adaptiveTestEngine.estimateUserAbility(userId, test.questions[0]?.topicId)
    const sorted = adaptiveTestEngine.sortQuestionsByInformation(test.questions, theta)
    const bestQ = sorted[0] as any

    if (!bestQ) return null

    return {
      id: bestQ.id,
      text: bestQ.text,
      type: bestQ.type,
      difficulty: bestQ.difficulty,
      bloom_level: bestQ.bloomLevel,
      points: bestQ.points,
      order: bestQ.order,
      options: bestQ.options.map((o: any) => ({
        id: o.id,
        text: o.text,
        order: o.order,
      })),
    }
  }

  /**
   * Get test analytics for a user — performance breakdown by topic, difficulty, etc.
   */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  async getTestAnalytics(userId: string): Promise<any> {
    const userPref = await prisma.userExamPreference.findUnique({
      where: { userId },
      select: { examId: true },
    })

    const targetExamId = userPref?.examId ?? undefined

    const results = await prisma.testResult.findMany({
      where: {
        userId,
        status: 'COMPLETED',
        ...(targetExamId && {
          test: { examId: targetExamId },
        }),
      },
      include: {
        test: {
          select: {
            id: true,
            title: true,
            mode: true,
            difficulty: true,
            isAiGenerated: true,
          },
        },
      },
      orderBy: { completedAt: 'desc' },
      take: 50,
    })

    const totalTests = results.length
    const passedTests = results.filter((r: { passed: boolean | null }) => r.passed).length
    const avgScore =
      totalTests > 0
        ? Math.round(results.reduce((sum: number, r: { percentage: number }) => sum + r.percentage, 0) / totalTests)
        : 0

    // Performance by difficulty
    const byDifficulty: Record<string, { total: number; passed: number; avgScore: number }> = {}
    for (const r of results) {
      const diff = r.test.difficulty
      if (!byDifficulty[diff]) byDifficulty[diff] = { total: 0, passed: 0, avgScore: 0 } // eslint-disable-line security/detect-object-injection
      byDifficulty[diff].total++ // eslint-disable-line security/detect-object-injection
      if (r.passed) byDifficulty[diff].passed++ // eslint-disable-line security/detect-object-injection
    }
    for (const key of Object.keys(byDifficulty)) {
      const items = results.filter((r: { test: { difficulty: string } }) => r.test.difficulty === key)
      // eslint-disable-next-line security/detect-object-injection
      byDifficulty[key].avgScore = Math.round(
        items.reduce((s: number, r: { percentage: number }) => s + r.percentage, 0) / items.length
      )
    }

    // Performance trend (last 10 tests)
    const trend = results
      .slice(0, 10)
      .reverse()
      .map((r: { test: { title: string }; percentage: number; passed: boolean | null; completedAt: Date | null }) => ({
        test_title: r.test.title,
        score: r.percentage,
        passed: r.passed,
        completed_at: r.completedAt,
      }))

    // Use the shared topic map from topicPerformanceService for accurate global topic data
    const topicMastery = await topicPerformanceService.getTopicMasteryMap(userId)

    return {
      total_tests: totalTests,
      passed_tests: passedTests,
      pass_rate: totalTests > 0 ? Math.round((passedTests / totalTests) * 100) : 0,
      average_score: avgScore,
      by_difficulty: byDifficulty,
      trend,
      topic_performance: topicMastery.topics.map(t => ({
        topic: t.topicName,
        accuracy: t.accuracy,
        total_attempts: t.totalAttempts,
        strength_level: t.strengthLevel,
      })),
    }
  }

  /**
   * Bookmark a question for later review.
   */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  async bookmarkQuestion(userId: string, questionId: string, notes?: string): Promise<any> {
    const existing = await prisma.questionBookmark.findUnique({
      where: { userId_questionId: { userId, questionId } },
    })

    if (existing) {
      throw new Error('Question already bookmarked')
    }

    return prisma.questionBookmark.create({
      data: {
        userId,
        questionId,
        notes,
      },
      include: {
        question: {
          select: {
            id: true,
            text: true,
            type: true,
            tags: true,
            test: { select: { title: true } },
          },
        },
      },
    })
  }

  /**
   * Get user's bookmarked questions.
   */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  async getBookmarkedQuestions(userId: string): Promise<any[]> {
    return prisma.questionBookmark.findMany({
      where: { userId },
      include: {
        question: {
          select: {
            id: true,
            text: true,
            type: true,
            tags: true,
            difficulty: true,
            test: { select: { title: true, id: true } },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    })
  }

  /**
   * Remove a question bookmark.
   */
  async removeBookmark(userId: string, questionId: string): Promise<void> {
    await prisma.questionBookmark.deleteMany({
      where: { userId, questionId },
    })
  }

  /**
   * Get test attempt history with filtering.
   */
  async getAttemptHistory(
    userId: string,
    filters?: {
      testId?: string
      mode?: string
      status?: string
      page?: number
      limit?: number
    }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  ): Promise<any> {
    const page = filters?.page ?? 1
    const limit = Math.min(filters?.limit ?? 20, 100)
    const skip = (page - 1) * limit

    const where: Prisma.TestResultWhereInput = { userId }
    if (filters?.testId) where.testId = filters.testId
    if (filters?.mode) where.test = { mode: filters.mode as TestMode }
    if (filters?.status) where.status = filters.status as AttemptStatus

    const [attempts, total] = await Promise.all([
      prisma.testResult.findMany({
        where,
        skip,
        take: limit,
        include: {
          test: {
            select: {
              id: true,
              title: true,
              mode: true,
              difficulty: true,
              timeLimit: true,
              passingScore: true,
              isAiGenerated: true,
            },
          },
        },
        orderBy: { completedAt: 'desc' },
      }),
      prisma.testResult.count({ where }),
    ])

    return {
      attempts: attempts.map((a: any) => ({
        id: a.id,
        test_id: a.testId,
        test_title: a.test?.title ?? 'Unknown',
        mode: a.test?.mode ?? 'MOCK',
        difficulty: a.test?.difficulty ?? 'MIXED',
        status: a.status,
        score: a.score,
        total_marks: a.totalPoints,
        percentage: a.percentage,
        passed: a.passed,
        time_taken: a.timeTaken,
        time_limit: a.test?.timeLimit ?? 0,
        attempt_number: a.attemptNumber,
        started_at: a.startedAt,
        completed_at: a.completedAt,
        is_ai_generated: a.test?.isAiGenerated ?? false,
      })),
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    }
  }

  /**
   * Get timed test remaining time validation.
   */
  async validateTimeRemaining(
    userId: string,
    testId: string
  ): Promise<{
    isValid: boolean
    remainingSeconds: number
    timeLimitSeconds: number
  }> {
    const attempt = await prisma.testResult.findFirst({
      where: { userId, testId, status: 'IN_PROGRESS' },
      include: { test: { select: { timeLimit: true } } },
    })

    if (!attempt) {
      return { isValid: false, remainingSeconds: 0, timeLimitSeconds: 0 }
    }

    const timeLimitSeconds = attempt.test.timeLimit * 60
    const startedAtMs =
      attempt.startedAt instanceof Date
        ? attempt.startedAt.getTime()
        : Date.parse(String(attempt.startedAt))
    const elapsedSeconds = Number.isFinite(startedAtMs)
      ? Math.max(0, Math.floor((Date.now() - startedAtMs) / 1000))
      : 0
    const remainingSeconds = Math.max(0, timeLimitSeconds - elapsedSeconds)

    return {
      isValid: remainingSeconds > 0,
      remainingSeconds,
      timeLimitSeconds,
    }
  }

  /**
   * Auto-submit test when time expires - pushes jobs to BullMQ for distributed processing.
   */
  async autoSubmitExpiredTests(): Promise<number> {
    // Highly optimized raw query: Calculate expiration in PostgreSQL instead of pulling all rows into Node.js
    const expiredAttempts = await prisma.$queryRaw<
      { id: string; testId: string; userId: string }[]
    >`
      SELECT tr.id, tr."testId", tr."userId"
      FROM "test_results" tr
      INNER JOIN "tests" t ON tr."testId" = t.id
      WHERE tr.status = 'IN_PROGRESS'
        AND t."timeLimit" > 0
        AND tr."startedAt" + (t."timeLimit" * interval '1 minute') < NOW()
    `

    let queuedCount = 0

    if (expiredAttempts.length > 0) {
      // Import dynamically to avoid circular dependencies if any
      const { jobQueueService } = await import('./JobQueueService')

      for (const attempt of expiredAttempts) {
        try {
          await jobQueueService.addTestSubmissionJob({
            attemptId: attempt.id,
            testId: attempt.testId,
            userId: attempt.userId,
          })
          queuedCount++
        } catch (err) {
          // A single failure (e.g. Redis down) must not abort the whole batch.
          logger.error(
            `Failed to queue expired test ${attempt.id} for auto-submission`,
            err instanceof Error ? err : new Error(String(err))
          )
        }
      }
      logger.info(`Queued ${queuedCount} expired tests for auto-submission`)
    }

    return queuedCount
  }

  /**
   * Worker processor function to actually score an auto-submitted test.
   */
  async processExpiredTestSubmission(attemptId: string): Promise<void> {
    const attempt = await prisma.testResult.findUnique({
      where: { id: attemptId },
      include: { test: true },
    })

    // Double check status to avoid double processing

    if (!attempt || attempt.status !== 'IN_PROGRESS') {
      return
    }

    try {
      const answers = await this.getExistingAnswers(attempt.id)

      // Use TestScoringService to ensure Analytics + Growth logic executes
      const { testScoringService } = await import('./TestScoringService')
      await testScoringService.scoreAndSubmitTest({
        userId: attempt.userId,
        testId: attempt.testId,
        answers,
        timeTaken: attempt.test.timeLimit * 60,
        attemptId: attempt.id,
      })
      logger.info(`Successfully auto-submitted expired test attempt ${attemptId}`)
    } catch (e) {
      logger.error('Failed to trigger post-test analytics for auto-submission', e as Error)
    }
  }

  // ─── Private Helpers ───────────────────────────────────────────────────────

  private async getExistingAnswers(
    attemptId: string
  ): Promise<Record<string, string | string[]>> {
    // Scope answers to the specific attempt (testResultId) rather than the latest
    // IN_PROGRESS result for the user+test. Otherwise an auto-submitted expired
    // attempt could be scored using answers saved to a different concurrent attempt.
    const answers = await prisma.testAttemptAnswer.findMany({
      where: { testResultId: attemptId },
      select: { questionId: true, textAnswer: true, selectedOptions: true },
    })

    const result: Record<string, string | string[]> = {}
    for (const a of answers) {
      result[a.questionId] =
        a.textAnswer ??
        (a.selectedOptions.length === 1 ? a.selectedOptions[0] : a.selectedOptions)
    }
    return result
  }

  private shuffleArray<T>(array: T[]): T[] {
    for (let i = array.length - 1; i > 0; i--) {
      const j = crypto.randomInt(0, i + 1)
      ;[array[i], array[j]] = [array[j], array[i]] // eslint-disable-line security/detect-object-injection
    }
    return array
  }
}

export const testEngineService = new TestEngineService()
