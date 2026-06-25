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

import { prisma } from '../prismaClient'
import logger from '../utils/logger'
import { parseJsonArray, parseJsonObject } from '../utils/json'
import { topicPerformanceService } from './TopicPerformanceService'
import { growthEngineService } from './GrowthEngineService'

export interface PracticeAnswerRequest {
  userId: string
  testId: string
  questionId: string
  selectedOptionId: string
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
        test: { select: { id: true, mode: true, timeLimit: true } },
      },
    })

    if (!question) {
      throw new Error('Question not found')
    }

    if (question.test.mode !== 'PRACTICE') {
      throw new Error('Practice mode is only available for practice tests')
    }

    const correctOption = question.options.find(o => o.isCorrect)
    const isCorrect = req.selectedOptionId === correctOption?.id

    const maxRetries = 3
    let currentTry = 0

    while (currentTry < maxRetries) {
      try {
        return await prisma.$transaction(async tx => {
          // Find or create a practice test result for this user/test
          let practiceResult = await tx.testResult.findFirst({
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
            const nextAttemptNumber = (maxAttempt?.attemptNumber ?? 0) + 1

            practiceResult = await tx.testResult.create({
              data: {
                userId: req.userId,
                testId: req.testId,
                score: 0,
                totalPoints: 0,
                percentage: 0,
                passed: false,
                timeTaken: 0,
                answers: {},
                questionResults: [],
                status: 'IN_PROGRESS',
                attemptNumber: nextAttemptNumber,
              },
            })
          }

          // Merge answers
          const existingAnswers = parseJsonObject(practiceResult.answers) as Record<string, string>
          const updatedAnswers = { ...existingAnswers, [req.questionId]: req.selectedOptionId }

          // Merge question results
          const existingResults = parseJsonArray<any>(practiceResult.questionResults)
          const existingResultIndex = existingResults.findIndex(
            (r: any) => r.question_id === req.questionId
          )
          const newResult = {
            question_id: req.questionId,
            is_correct: isCorrect,
            marks_obtained: isCorrect ? question.points : 0,
          }

          if (existingResultIndex >= 0) {
            existingResults[existingResultIndex] = newResult
          } else {
            existingResults.push(newResult)
          }

          // Calculate current score across ALL answered questions
          let currentScore = 0
          for (const r of existingResults) {
            if (r.is_correct) currentScore += r.marks_obtained
          }
          // Total points = sum of points for all questions the user has attempted
          const attemptedQuestionIds = existingResults
            .map((r: any) => r.question_id)
            .filter(Boolean)
          let totalPoints = question.points // at minimum the current question
          if (attemptedQuestionIds.length > 0) {
            const attemptedQuestions = await tx.question.findMany({
              where: { id: { in: attemptedQuestionIds } },
              select: { points: true },
            })
            totalPoints = (attemptedQuestions ?? []).reduce((s, q) => s + q.points, 0)
          }
          const percentage = totalPoints > 0 ? (currentScore / totalPoints) * 100 : 0

          await tx.testResult.update({
            where: { id: practiceResult.id },
            data: {
              score: currentScore,
              totalPoints,
              percentage,
              passed: percentage >= 60,
              answers: updatedAnswers as any,
              questionResults: existingResults as any,
            },
          })

          // Update topic performance (Core Analytics Engine)
          const topicName = question.tags?.[0] ?? 'General'
          await topicPerformanceService.updateForSingleAnswer(req.userId, topicName, isCorrect, {
            subjectName: (question.test as any).subjectId,
            tx,
          })

          // Growth Engine: Practice XP securely executed IN transaction
          await growthEngineService.awardXP(req.userId, 'practice_session', tx)

          return {
            questionId: req.questionId,
            isCorrect,
            explanation: question.explanation ?? '',
            correctOptionId: correctOption?.id ?? '',
            points: isCorrect ? question.points : 0,
          }
        })
      } catch (error: any) {
        // P2002: Unique constraint failed
        if (error?.code === 'P2002') {
          currentTry++
          if (currentTry >= maxRetries) {
            logger.error(
              '[TestEngineService] Max retries reached for Practice Answer concurrency',
              error
            )
            throw new Error('Concurrent submission error. Please try again.')
          }
          // Exponential backoff
          await new Promise(res => setTimeout(res, 50 * Math.pow(2, currentTry)))
          continue
        }
        throw error
      }
    }

    throw new Error('Unexpected error in practice answer flow')
  }

  /**
   * Get questions for a test with randomized order.
   */
  async getTestQuestions(testId: string, _userId: string): Promise<any[]> {
    const test = await prisma.test.findUnique({
      where: { id: testId, isPublished: true },
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

    // For practice mode, shuffle questions
    const questions =
      test.mode === 'PRACTICE' ? this.shuffleArray([...test.questions]) : test.questions

    return questions.map(q => ({
      id: q.id,
      text: q.text,
      type: q.type,
      difficulty: q.difficulty,
      bloom_level: q.bloomLevel,
      points: q.points,
      order: q.order,
      options: q.options.map(o => ({
        id: o.id,
        text: o.text,
        order: o.order,
      })),
    }))
  }

  /**
   * Get test analytics for a user — performance breakdown by topic, difficulty, etc.
   */
  async getTestAnalytics(userId: string): Promise<any> {
    const results = await prisma.testResult.findMany({
      where: { userId, status: 'COMPLETED' },
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
    const passedTests = results.filter(r => r.passed).length
    const avgScore =
      totalTests > 0
        ? Math.round(results.reduce((sum, r) => sum + r.percentage, 0) / totalTests)
        : 0

    // Performance by difficulty
    const byDifficulty: Record<string, { total: number; passed: number; avgScore: number }> = {}
    for (const r of results) {
      const diff = r.test.difficulty
      if (!byDifficulty[diff]) byDifficulty[diff] = { total: 0, passed: 0, avgScore: 0 }
      byDifficulty[diff].total++
      if (r.passed) byDifficulty[diff].passed++
    }
    for (const key of Object.keys(byDifficulty)) {
      const items = results.filter(r => r.test.difficulty === key)
      byDifficulty[key].avgScore = Math.round(
        items.reduce((s, r) => s + r.percentage, 0) / items.length
      )
    }

    // Performance trend (last 10 tests)
    const trend = results
      .slice(0, 10)
      .reverse()
      .map(r => ({
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
  ): Promise<any> {
    const page = filters?.page ?? 1
    const limit = Math.min(filters?.limit ?? 20, 100)
    const skip = (page - 1) * limit

    const where: Record<string, unknown> = { userId }
    if (filters?.testId) where.testId = filters.testId
    if (filters?.mode) where.test = { mode: filters.mode }
    if (filters?.status) where.status = filters.status

    const [attempts, total] = await Promise.all([
      prisma.testResult.findMany({
        where: where as any,
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
      prisma.testResult.count({ where: where as any }),
    ])

    return {
      attempts: attempts.map(a => ({
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
   * Auto-submit test when time expires.
   */
  async autoSubmitExpiredTests(): Promise<number> {
    const expiredAttempts = await prisma.testResult.findMany({
      where: {
        status: 'IN_PROGRESS',
        test: {
          timeLimit: { gt: 0 },
        },
      },
      include: {
        test: {
          include: {
            questions: {
              include: { options: true },
            },
          },
        },
      },
    })

    let submittedCount = 0

    for (const attempt of expiredAttempts) {
      const timeLimitSeconds = attempt.test.timeLimit * 60
      const startedAtMs =
        attempt.startedAt instanceof Date
          ? attempt.startedAt.getTime()
          : Date.parse(String(attempt.startedAt))
      const elapsedSeconds = Number.isFinite(startedAtMs)
        ? Math.max(0, Math.floor((Date.now() - startedAtMs) / 1000))
        : 0

      if (elapsedSeconds > timeLimitSeconds) {
        const answers = parseJsonObject(attempt.answers) as Record<string, string>

        let score = 0
        const questionResults = attempt.test.questions.map(q => {
          const correctOption = q.options.find(o => o.isCorrect)
          const userAnswer = answers[q.id]
          const hasAnswer =
            userAnswer !== undefined && userAnswer !== null && String(userAnswer).trim().length > 0
          const isCorrect = hasAnswer && userAnswer === correctOption?.id

          if (isCorrect) {
            score += q.points
          } else if (hasAnswer && attempt.test.negativeMarks > 0) {
            score -= attempt.test.negativeMarks
          }

          return {
            question_id: q.id,
            is_correct: isCorrect,
            marks_obtained: isCorrect ? q.points : hasAnswer ? -attempt.test.negativeMarks : 0,
          }
        })

        score = Math.max(0, score)

        const totalPossibleScore = attempt.test.questions.reduce((acc, q) => acc + q.points, 0)
        const percentage = totalPossibleScore > 0 ? (score / totalPossibleScore) * 100 : 0

        await prisma.testResult.update({
          where: { id: attempt.id },
          data: {
            score,
            totalPoints: totalPossibleScore,
            percentage,
            passed: percentage >= attempt.test.passingScore,
            timeTaken: timeLimitSeconds,
            questionResults: questionResults as any,
            completedAt: new Date(),
            status: 'TIMEOUT',
          },
        })

        submittedCount++
      }
    }

    if (submittedCount > 0) {
      logger.info(`Auto-submitted ${submittedCount} expired tests`)
    }

    return submittedCount
  }

  // ─── Private Helpers ───────────────────────────────────────────────────────

  private async getExistingAnswers(
    userId: string,
    testId: string
  ): Promise<Record<string, string>> {
    // Find the most recent in-progress attempt (not hardcoded to attempt 1)
    const result = await prisma.testResult.findFirst({
      where: { userId, testId, status: 'IN_PROGRESS' },
      orderBy: { attemptNumber: 'desc' },
      select: { answers: true },
    })
    return parseJsonObject(result?.answers) as Record<string, string>
  }

  private shuffleArray<T>(array: T[]): T[] {
    for (let i = array.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1))
      ;[array[i], array[j]] = [array[j], array[i]]
    }
    return array
  }
}

export const testEngineService = new TestEngineService()
