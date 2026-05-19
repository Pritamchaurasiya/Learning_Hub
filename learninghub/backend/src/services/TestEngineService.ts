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

    // Record the practice attempt
    await prisma.testResult.upsert({
      where: {
        userId_testId_attemptNumber: {
          userId: req.userId,
          testId: req.testId,
          attemptNumber: 1,
        },
      },
      create: {
        userId: req.userId,
        testId: req.testId,
        score: isCorrect ? question.points : 0,
        totalPoints: question.points,
        percentage: isCorrect ? 100 : 0,
        passed: isCorrect,
        timeTaken: 0,
        answers: { [req.questionId]: req.selectedOptionId } as any,
        questionResults: [
          {
            question_id: req.questionId,
            is_correct: isCorrect,
            marks_obtained: isCorrect ? question.points : 0,
          },
        ] as any,
        status: 'IN_PROGRESS',
        attemptNumber: 1,
      },
      update: {
        answers: {
          ...(await this.getExistingAnswers(req.userId, req.testId)),
          [req.questionId]: req.selectedOptionId,
        } as any,
      },
    })

    // Update topic performance
    await this.updateTopicPerformance(req.userId, question)

    return {
      questionId: req.questionId,
      isCorrect,
      explanation: question.explanation ?? '',
      correctOptionId: correctOption?.id ?? '',
      points: isCorrect ? question.points : 0,
    }
  }

  /**
   * Get questions for a test with randomized order.
   */
  async getTestQuestions(testId: string, userId: string): Promise<any[]> {
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

    // Topic performance from question results
    const topicStats = await this.getTopicStatsFromResults(results)

    return {
      total_tests: totalTests,
      passed_tests: passedTests,
      pass_rate: totalTests > 0 ? Math.round((passedTests / totalTests) * 100) : 0,
      average_score: avgScore,
      by_difficulty: byDifficulty,
      trend,
      topic_performance: topicStats,
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
    const elapsedSeconds = Math.floor((Date.now() - attempt.startedAt.getTime()) / 1000)
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
      const elapsedSeconds = Math.floor((Date.now() - attempt.startedAt.getTime()) / 1000)

      if (elapsedSeconds > timeLimitSeconds) {
        const answers = (attempt.answers as Record<string, string>) ?? {}

        let score = 0
        const questionResults = attempt.test.questions.map(q => {
          const correctOption = q.options.find(o => o.isCorrect)
          const userAnswer = answers[q.id]
          const isCorrect = userAnswer === correctOption?.id
          if (isCorrect) score += q.points

          return {
            question_id: q.id,
            is_correct: isCorrect,
            marks_obtained: isCorrect ? q.points : 0,
          }
        })

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
    const result = await prisma.testResult.findFirst({
      where: { userId, testId, attemptNumber: 1 },
      select: { answers: true },
    })
    return (result?.answers as Record<string, string>) ?? {}
  }

  private async updateTopicPerformance(userId: string, question: any): Promise<void> {
    for (const tag of question.tags ?? []) {
      await prisma.topicPerformance.upsert({
        where: { userId_topicName: { userId, topicName: tag } },
        create: {
          userId,
          topicName: tag,
          totalAttempts: 1,
          correctAnswers: 0,
          accuracy: 0,
        },
        update: {
          totalAttempts: { increment: 1 },
          updatedAt: new Date(),
          lastAttemptAt: new Date(),
        },
      })
    }
  }

  private async getTopicStatsFromResults(results: any[]): Promise<any[]> {
    const topicMap: Record<string, { correct: number; total: number }> = {}

    for (const result of results) {
      const questionResults = (result.questionResults as any[]) ?? []
      for (const qr of questionResults) {
        const tags = qr.tags ?? []
        for (const tag of tags) {
          if (!topicMap[tag]) topicMap[tag] = { correct: 0, total: 0 }
          topicMap[tag].total++
          if (qr.is_correct) topicMap[tag].correct++
        }
      }
    }

    return Object.entries(topicMap)
      .map(([topic, stats]) => ({
        topic,
        accuracy: stats.total > 0 ? Math.round((stats.correct / stats.total) * 100) : 0,
        total_attempts: stats.total,
      }))
      .sort((a, b) => a.accuracy - b.accuracy)
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
