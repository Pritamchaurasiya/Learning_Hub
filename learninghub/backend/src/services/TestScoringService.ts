import { prisma } from '../prismaClient'
import logger from '../utils/logger'
import { AttemptStatus } from '@prisma/client'
import { normalizeAnswerIds, answersMatch } from '../utils/testsHelper'
import { topicPerformanceService, QuestionResult } from './TopicPerformanceService'
import { growthEngineService } from './GrowthEngineService'
import { jobQueueService } from './JobQueueService'
import { aiTestService } from './AITestService'

export class TestScoringService {
  /**
   * Evaluates and scores a completed test attempt, updating analytics and returning the result.
   */
  async scoreAndSubmitTest({
    userId,
    testId,
    answers,
    timeTaken,
    attemptId,
    confidences,
  }: {
    userId: string
    testId: string
    answers: Record<string, string | string[]>
    timeTaken?: number
    attemptId?: string
    confidences?: Record<string, string>
  }) {
    const test = await prisma.test.findUnique({
      where: { id: testId },
      include: {
        questions: {
          include: { options: true },
        },
      },
    })

    if (!test) throw new Error('Test not found')

    let existingResult = null
    if (attemptId) {
      existingResult = await prisma.testResult.findFirst({
        where: { id: attemptId, userId, testId },
        select: { id: true, status: true, startedAt: true, attemptNumber: true },
      })
      if (!existingResult) throw new Error('Attempt not found')
    } else {
      existingResult = await prisma.testResult.findFirst({
        where: { userId, testId, status: 'IN_PROGRESS' },
        select: { id: true, status: true, startedAt: true, attemptNumber: true },
      })
    }

    if (existingResult && existingResult.status !== 'IN_PROGRESS') {
      const alreadyCompleted = await prisma.testResult.findUnique({
        where: { id: existingResult.id },
      })
      if (alreadyCompleted) {
        return {
          isDuplicate: true,
          result: alreadyCompleted,
          test,
          correctCount: undefined,
          incorrectCount: undefined,
        }
      }
    }

    const timeLimitSeconds = test.timeLimit * 60
    let actualTimeTaken = typeof timeTaken === 'number' ? timeTaken : 0

    if (existingResult?.startedAt) {
      const serverTimeTaken = Math.floor((Date.now() - existingResult.startedAt.getTime()) / 1000)
      if (serverTimeTaken > actualTimeTaken + 10) {
        actualTimeTaken = serverTimeTaken
      }
    }

    const isOverTime = actualTimeTaken > timeLimitSeconds
    const finalStatus: AttemptStatus = isOverTime ? 'TIMEOUT' : 'COMPLETED'

    let score = 0
    let correctCount = 0
    let incorrectCount = 0

    const questionResults = await Promise.all(
      test.questions.map(async q => {
        const correctOptions = q.options.filter(o => o.isCorrect)
        const userAnswerId = answers[q.id]
        const submittedIds = normalizeAnswerIds(userAnswerId)
        const hasAnswer =
          submittedIds.length > 0 ||
          (typeof userAnswerId === 'string' && userAnswerId.trim().length > 0)

        let isCorrect = false
        let marksObtained = 0
        let aiFeedback = undefined

        if (hasAnswer) {
          if (q.type === 'subjective') {
            // Send raw string answer to AI Grading Engine
            const answerText = Array.isArray(userAnswerId)
              ? userAnswerId[0]
              : String(userAnswerId ?? '')
            const grading = await aiTestService.gradeSubjectiveAnswer(q.text, answerText, q.points)
            marksObtained = grading.score
            isCorrect = grading.score >= q.points * 0.5 // Pass if score is 50%+
            aiFeedback = grading.feedback
          } else if (correctOptions.length > 0) {
            if (q.type === 'multiple_select') {
              isCorrect = answersMatch(
                submittedIds,
                correctOptions.map(o => o.id)
              )
            } else {
              isCorrect = submittedIds[0] === correctOptions[0].id
            }
            marksObtained = isCorrect ? q.points : -test.negativeMarks
          }
        }

        if (q.type !== 'subjective') {
          if (isCorrect) {
            score += q.points
            correctCount++
          } else if (hasAnswer) {
            incorrectCount++
            if (test.negativeMarks > 0) score -= test.negativeMarks
          }
        } else if (hasAnswer) {
          score += marksObtained
          if (isCorrect) correctCount++
          else incorrectCount++
        }

        return {
          question_id: q.id,
          question_text: q.text,
          question_type: q.type,
          selected_options: submittedIds.map(id => ({ id })),
          correct_options: correctOptions.map(o => ({ id: o.id, text: o.text })),
          is_correct: isCorrect,
          marks_obtained: marksObtained,
          explanation: aiFeedback ? aiFeedback : q.explanation,
          time_spent: 0,
          is_flagged: false,
          confidence: confidences ? confidences[q.id] : undefined,
          topic: q.tags?.[0] ?? 'General',
        }
      })
    )

    if (isOverTime) score = Math.floor(score * 0.75)
    score = Math.max(0, score)

    const totalPossibleScore = test.questions.reduce((acc, q) => acc + q.points, 0)
    const percentage = totalPossibleScore > 0 ? (score / totalPossibleScore) * 100 : 0
    const passed = percentage >= test.passingScore

    const result = await prisma.$transaction(async tx => {
      let txExistingResult = null
      if (existingResult?.id) {
        txExistingResult = await tx.testResult.findUnique({
          where: { id: existingResult.id },
        })
      }

      if (txExistingResult && txExistingResult.status !== 'IN_PROGRESS') {
        return {
          isDuplicate: true,
          result: txExistingResult,
          correctCount: undefined,
          incorrectCount: undefined,
        }
      }

      const submissionData = {
        score,
        totalPoints: totalPossibleScore,
        percentage,
        passed,
        timeTaken: actualTimeTaken,
        answers: answers as any,
        questionResults: questionResults as any,
        completedAt: new Date(),
        status: finalStatus,
      }

      let resultRecord
      if (txExistingResult) {
        resultRecord = await tx.testResult.update({
          where: { id: txExistingResult.id },
          data: submissionData,
        })
      } else {
        const maxAttempt = await tx.testResult.findFirst({
          where: { userId, testId },
          orderBy: { attemptNumber: 'desc' },
          select: { attemptNumber: true },
        })
        const attemptNumber = (maxAttempt?.attemptNumber ?? 0) + 1
        resultRecord = await tx.testResult.create({
          data: { userId, testId, ...submissionData, attemptNumber },
        })
      }

      if (passed) {
        // We now delegate XP handling fully to GrowthEngineService.
        // We don't do inline XP increments anymore to maintain single responsibility.
      }

      return { isDuplicate: false, result: resultRecord }
    })

    const newResult = result.isDuplicate ? undefined : result.result
    if (newResult) {
      // Fire-and-forget analytics and growth triggers via background job queues
      this.handlePostTestEvents(
        userId,
        test,
        newResult.id,
        questionResults,
        passed,
        actualTimeTaken,
        score
      ).catch(e => {
        logger.error(
          '[TestScoringService] Post-test job queue dispatch failed',
          e instanceof Error ? e : new Error(String(e))
        )
      })
    }

    return { ...result, test, correctCount, incorrectCount }
  }

  private async handlePostTestEvents(
    userId: string,
    test: any,
    testResultId: string,
    questionResults: any[],
    passed: boolean,
    timeTakenSeconds: number,
    score: number
  ) {
    // 1. Dispatch Analytics Job
    const topicUpdates: QuestionResult[] = questionResults.map(qr => {
      const q = test.questions.find((q: any) => q.id === qr.question_id)
      return {
        questionId: qr.question_id,
        topicName: q?.tags?.[0] ?? 'General',
        subjectName: test.subjectId,
        isCorrect: qr.is_correct,
        timeSpentSeconds: qr.time_spent || 0,
      }
    })

    await jobQueueService.addAnalyticsJob({
      userId,
      testResultId,
      questionResults: topicUpdates,
    })

    // 2. Dispatch Growth Jobs
    // Check if it's their first test
    const userStats = await prisma.testResult.count({ where: { userId } })
    if (userStats === 1) {
      await jobQueueService.addGrowthJob({ userId, action: 'first_test' })
    }

    // Base test completed XP
    await jobQueueService.addGrowthJob({ userId, action: 'test_completed' })

    // Passing XP
    if (passed) {
      await jobQueueService.addGrowthJob({ userId, action: 'test_passed' })
    }

    // Perfect score XP
    const totalPossibleScore = test.questions.reduce((acc: number, q: any) => acc + q.points, 0)
    if (score >= totalPossibleScore && totalPossibleScore > 0) {
      await jobQueueService.addGrowthJob({ userId, action: 'perfect_score' })
    }

    // 3. Growth Engine: Daily Goal
    const timeTakenMinutes = Math.round(timeTakenSeconds / 60)
    if (timeTakenMinutes > 0) {
      await this.retryAsync(
        () => growthEngineService.updateDailyGoal(userId, timeTakenMinutes),
        'updateDailyGoal',
        userId
      )
    }

    // Streaks and Achievements — critical for user retention, must not silently fail
    await this.retryAsync(
      () => growthEngineService.checkAndUpdateStreak(userId),
      'checkAndUpdateStreak',
      userId
    )
    await this.retryAsync(
      () => growthEngineService.checkAchievements(userId),
      'checkAchievements',
      userId
    )
  }

  /**
   * Retry an async operation up to 3 times with exponential backoff.
   * Logs structured errors on each failure for observability.
   */
  private async retryAsync(
    fn: () => Promise<any>,
    operationName: string,
    userId: string,
    maxRetries = 3
  ): Promise<void> {
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        await fn()
        return
      } catch (error) {
        logger.error(
          `[TestScoringService] ${operationName} failed for user ${userId} (attempt ${attempt}/${maxRetries})`,
          error instanceof Error ? error : new Error(String(error))
        )
        if (attempt < maxRetries) {
          await new Promise(res => setTimeout(res, 500 * Math.pow(2, attempt)))
        }
      }
    }
  }
}

export const testScoringService = new TestScoringService()
