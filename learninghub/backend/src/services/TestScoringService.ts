import { prisma } from '../prismaClient'
import logger from '../utils/logger'
import { AttemptStatus } from '@prisma/client'
import { normalizeAnswerIds, answersMatch } from '../utils/testsHelper'
import { QuestionResult } from './TopicPerformanceService'
import { growthEngineService } from './GrowthEngineService'
import { jobQueueService } from './JobQueueService'
import { conductorClient } from './ml/ConductorClient'
import { webSocketService } from './WebSocketService'
import { IRTScoringEngine } from './IRTScoringEngine'

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
    timesSpent,
  }: {
    userId: string
    testId: string
    answers: Record<string, string | string[]>
    timeTaken?: number
    attemptId?: string
    confidences?: Record<string, string>
    timesSpent?: Record<string, number>
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
          correctCount: 0,
          incorrectCount: 0,
          questionResults: [],
        }
      }
      throw new Error('Test attempt in unexpected state: record not found')
    }

    const timeLimitSeconds = test.timeLimit * 60
    let actualTimeTaken = typeof timeTaken === 'number' ? Math.max(0, timeTaken) : 0

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
      test.questions.map(async (q: any) => {
        const correctOptions = q.options.filter((o: any) => o.isCorrect)
        const userAnswerId = answers[q.id]
        const submittedIds = normalizeAnswerIds(userAnswerId)
        const hasAnswer =
          submittedIds.length > 0 ||
          (typeof userAnswerId === 'string' && userAnswerId.trim().length > 0)

        let isCorrect = false
        let marksObtained = 0
        let aiFeedback = undefined
        let isPendingSubjective = false

        if (hasAnswer) {
          if (q.type === 'SUBJECTIVE') {
            // Instead of blocking to grade here, we mark as pending and dispatch an AI job later.
            marksObtained = 0
            isCorrect = null // Will be updated by async worker - use null to indicate "pending"
            aiFeedback = 'Grading in progress by AI worker...'
            isPendingSubjective = true
          } else if (correctOptions.length > 0) {
            if (q.type === 'MSQ') {
              isCorrect = answersMatch(
                submittedIds,
                correctOptions.map((o: any) => o.id)
              )
            } else {
              isCorrect = submittedIds[0] === correctOptions[0].id
            }
            marksObtained = isCorrect ? q.points : -Math.abs(test.negativeMarks ?? 0)
          }
        }

        if (q.type !== 'SUBJECTIVE') {
          score += marksObtained
          if (isCorrect) {
            correctCount++
          } else if (hasAnswer) {
            incorrectCount++
          }
        } else if (hasAnswer && !isPendingSubjective) {
          // Only count if already graded (not pending)
          score += marksObtained
          if (isCorrect) correctCount++
          else incorrectCount++
        }

        const qConfidence = confidences ? confidences[q.id] : undefined
        const confidenceEnum = qConfidence
          ? (qConfidence.toUpperCase() as 'LOW' | 'MEDIUM' | 'HIGH')
          : 'MEDIUM'
        const cbmMultiplier = hasAnswer
          ? IRTScoringEngine.calculateCBMMultiplier(isCorrect ?? false, confidenceEnum)
          : 1.0
        const qTimeSpent =
          timesSpent && typeof timesSpent[q.id] === 'number' ? Math.max(0, timesSpent[q.id]) : 0

        return {
          question_id: q.id,
          question_text: q.text,
          question_type: q.type,
          selected_options: submittedIds.map(id => ({ id })),
          correct_options: correctOptions.map((o: any) => ({ id: o.id, text: o.text })),
          is_correct: isCorrect,
          marks_obtained: marksObtained,
          cbm_multiplier: cbmMultiplier,
          explanation: aiFeedback ?? q.explanation,
          time_spent: qTimeSpent,
          is_flagged: false,
          confidence: qConfidence,
          topic: q.tags?.[0] ?? 'General',
          is_pending: isPendingSubjective, // New field to indicate subjective question awaiting AI grading
        }
      })
    )

    if (isOverTime) score = Math.floor(score * 0.75)
    score = Math.max(0, score)

    const totalPossibleScore = test.questions.reduce((acc: number, q: any) => acc + q.points, 0)
    const percentage = totalPossibleScore > 0 ? (score / totalPossibleScore) * 100 : 0
    const passed = percentage >= test.passingScore

    const result = await prisma.$transaction(async (tx: any) => {
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
          correctCount: 0,
          incorrectCount: 0,
          questionResults: [],
        }
      }

      const submissionData = {
        score,
        totalPoints: totalPossibleScore,
        percentage,
        passed,
        timeTaken: actualTimeTaken,
        completedAt: new Date(),
        status: finalStatus,
      }

      let resultRecord: any
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
        const currentAttemptNumber = maxAttempt?.attemptNumber ?? 0
        const maxAttempts = test.maxAttempts ?? parseInt(process.env.MAX_TEST_ATTEMPTS ?? '3', 10)
        if (currentAttemptNumber >= maxAttempts) {
          // No in-progress attempt exists and the user has exhausted their attempts.
          // Refuse to silently create a new attempt, which would bypass the limit enforced in startTest.
          throw new Error('MAX_ATTEMPTS_REACHED')
        }
        let attemptNumber = currentAttemptNumber + 1

        // Retry on unique constraint violation (attemptNumber race condition)
        for (let attempt = 1; attempt <= 3; attempt++) {
          try {
            resultRecord = await tx.testResult.create({
              data: { userId, testId, ...submissionData, attemptNumber },
            })
            break
          } catch (error) {
            const err = error as Error & { code?: string }
            if ((err.code === 'P2002' || err.message?.includes('P2002')) && attempt < 3) {
              attemptNumber++
              continue
            }
            throw error
          }
        }
      }

      // Sort questionResults by question_id to prevent PostgreSQL transaction deadlocks,
      // then batch upsert in chunks to reduce round-trips while maintaining ordering safety.
      const sortedResults = [...questionResults].sort((a, b) =>
        a.question_id.localeCompare(b.question_id)
      )
      const CHUNK_SIZE = 10

      for (let i = 0; i < sortedResults.length; i += CHUNK_SIZE) {
        const chunk = sortedResults.slice(i, i + CHUNK_SIZE)
        await Promise.all(
          chunk.map(qr =>
            tx.testAttemptAnswer.upsert({
              where: {
                testResultId_questionId: {
                  testResultId: resultRecord.id,
                  questionId: qr.question_id,
                },
              },
              update: {
                selectedOptions: qr.selected_options.map((o: any) => o.id),
                textAnswer:
                  qr.question_type === 'SUBJECTIVE' ? String(answers[qr.question_id] ?? '') : null,
                isCorrect: qr.is_correct,
                marksObtained: qr.marks_obtained,
                timeSpent: qr.time_spent,
                aiFeedback: qr.explanation,
              },
              create: {
                testResultId: resultRecord.id,
                questionId: qr.question_id,
                selectedOptions: qr.selected_options.map((o: any) => o.id),
                textAnswer:
                  qr.question_type === 'SUBJECTIVE' ? String(answers[qr.question_id] ?? '') : null,
                isCorrect: qr.is_correct,
                marksObtained: qr.marks_obtained,
                timeSpent: qr.time_spent,
                aiFeedback: qr.explanation,
              },
            })
          )
        )
      }

      return { isDuplicate: false, result: resultRecord }
    })

    const newResult = result.isDuplicate ? undefined : result.result
    if (newResult) {
      // Dispatch background jobs for Subjective questions now that the database transaction is fully committed

      for (const qr of questionResults) {
        if (qr.question_type === 'SUBJECTIVE') {
          const answerText = String(answers[qr.question_id] ?? '')
          await jobQueueService
            .addAIJob({
              userId,
              operation: 'GRADE_SUBJECTIVE',
              params: {
                testResultId: newResult.id,
                questionId: qr.question_id,
                questionText: qr.question_text,
                answerText,
                points: test.questions.find((q: any) => q.id === qr.question_id)?.points ?? 0,
                testId,
              },
            })
            .catch(e => {
              logger.error('[TestScoringService] Failed to dispatch AI grading job', e as Error)
            })
        }
      }

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

      // Notify client in real-time that their test expired
      if (finalStatus === 'TIMEOUT') {
        try {
          webSocketService.notifyUser(userId, 'test_timeout', {
            testId,
            attemptId: newResult.id,
            score,
            percentage,
          })
        } catch (err) {
          logger.error('[TestScoringService] Failed to notify timeout', err as Error)
        }
      }
    }

    return { ...result, test, correctCount, incorrectCount, questionResults }
  }

  private async handlePostTestEvents(
    userId: string,
    test: {
      id: string
      subjectId?: string | null
      questions: Array<{ id: string; tags: string[]; points: number; difficulty?: number }>
    },
    testResultId: string,
    questionResults: Array<{ question_id: string; is_correct: boolean; time_spent?: number }>,
    passed: boolean,
    timeTakenSeconds: number,
    score: number
  ) {
    // 1. Dispatch Analytics Job
    const topicUpdates: QuestionResult[] = questionResults.map(qr => {
      const q = test.questions.find(q => q.id === qr.question_id)
      return {
        questionId: qr.question_id,
        topicName: q?.tags?.[0] ?? 'General',
        subjectName: test.subjectId ?? undefined,
        isCorrect: qr.is_correct,
        timeSpentSeconds: qr.time_spent ?? 0,
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
    const totalPossibleScore = test.questions.reduce((acc: number, q) => acc + q.points, 0)
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

    // 4. Anomaly detection via Conductor ML
    try {
      const timeVarianceData = questionResults.map(qr => ({
        questionId: qr.question_id,
        timeSpentSeconds: qr.time_spent ?? 0,
        difficulty: test.questions.find(q => q.id === qr.question_id)?.difficulty ?? 0.5,
      }))
      const anomaly = await conductorClient.detectTestAnomaly(testResultId, timeVarianceData)
      if (anomaly && anomaly.isSuspicious) {
        logger.warn(
          `[Anomaly] Test result ${testResultId} flagged as suspicious. Confidence: ${anomaly.confidence}`
        )
        // If we had a schema column, we'd mark it: await prisma.testResult.update({ where: { id: testResultId }, data: { isFlagged: true }})
      }
    } catch (e) {
      logger.error(
        '[TestScoringService] Anomaly detection failed',
        e instanceof Error ? e : new Error(String(e))
      )
    }
  }

  /**
   * Retry an async operation up to 3 times with exponential backoff.
   * Logs structured errors on each failure for observability.
   */
  private async retryAsync(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
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
