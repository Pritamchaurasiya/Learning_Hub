import { Request, Response } from 'express'
import { prisma } from '../prismaClient'
import { getPaginationParams, createPaginatedResponse } from '../utils/pagination'
import logger from '../utils/logger'
import { Prisma } from '@prisma/client'

export const listTests = async (req: Request, res: Response): Promise<void> => {
  try {
    const { courseId } = req.query
    const { page, limit, skip } = getPaginationParams(req.query)
    const userId = req.user?.userId

    const filters: Prisma.TestWhereInput = { isPublished: true }
    if (courseId) filters.courseId = courseId as string

    const total = await prisma.test.count({ where: filters })

    const tests = await prisma.test.findMany({
      where: filters,
      skip,
      take: limit,
      orderBy: { createdAt: 'desc' },
      include: {
        _count: {
          select: { questions: true, results: true },
        },
        course: {
          select: { title: true, id: true },
        },
      },
    })

    const userAttemptMap = new Map<string, number>()
    if (userId) {
      const userAttempts = await prisma.testResult.groupBy({
        by: ['testId'],
        where: { userId, testId: { in: tests.map(t => t.id) }, status: 'COMPLETED' },
        _count: { id: true },
      })
      userAttempts.forEach(a => userAttemptMap.set(a.testId, a._count.id))
    }

    const transformedTests = tests.map(t => ({
      id: t.id,
      title: t.title,
      description: t.description,
      course_id: t.courseId,
      course_title: t.course?.title || 'General',
      time_limit: t.timeLimit,
      passing_score: t.passingScore,
      total_questions: t._count.questions,
      max_attempts: 3,
      attempts_made: userAttemptMap.get(t.id) ?? 0,
      mode: t.mode,
      difficulty: t.difficulty,
      total_marks: t.totalMarks,
      negative_marks: t.negativeMarks,
    }))

    res.status(200).json(createPaginatedResponse(transformedTests, total, page, limit))
  } catch (error) {
    logger.error(
      '[TestsController] listTests error',
      error instanceof Error ? error : new Error(String(error))
    )
    res.status(500).json({ status: 'error', message: 'Internal server error' })
  }
}

export const getTestDetails = async (req: Request, res: Response): Promise<void> => {
  try {
    const id = req.params.id as string
    const test = await prisma.test.findUnique({
      where: { id },
      include: {
        course: {
          select: { title: true },
        },
        _count: {
          select: { questions: true },
        },
      },
    })

    if (!test) {
      res.status(404).json({ status: 'error', message: 'Test not found' })
      return
    }

    const quizData = {
      id: test.id,
      title: test.title,
      description: test.description,
      course_id: test.courseId,
      course_title: test.course?.title || 'General',
      time_limit: test.timeLimit,
      passing_score: test.passingScore,
      total_questions: test._count.questions,
      mode: test.mode,
      difficulty: test.difficulty,
      total_marks: test.totalMarks,
      negative_marks: test.negativeMarks,
      is_ai_generated: test.isAiGenerated,
    }

    res.json({ status: 'success', data: { quiz: quizData } })
  } catch (error) {
    logger.error(
      '[TestsController] getTestDetails error',
      error instanceof Error ? error : new Error(String(error))
    )
    res.status(500).json({ status: 'error', message: 'Internal server error' })
  }
}

export const startTest = async (req: Request, res: Response): Promise<void> => {
  try {
    const testId = req.params.id as string
    const userId = req.user?.userId
    if (!userId) {
      res.status(401).json({ status: 'error', message: 'Authentication required' })
      return
    }

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
      res.status(404).json({ status: 'error', message: 'Test not found' })
      return
    }

    const existingResult = await prisma.testResult.findFirst({
      where: {
        userId,
        testId,
        completedAt: null,
      },
    })

    if (existingResult) {
      const questions = test.questions.map(q => ({
        id: q.id,
        text: q.text,
        type: q.type,
        points: q.points,
        order: q.order,
        options: q.options.map(o => ({
          id: o.id,
          text: o.text,
          order: o.order,
        })),
      }))

      res.status(200).json({
        status: 'success',
        data: {
          attempt_id: existingResult.id,
          attempt_number: existingResult.attemptNumber,
          questions,
          time_limit: test.timeLimit,
          total_marks: test.totalMarks,
          mode: test.mode,
        },
      })
      return
    }

    const maxAttemptResult = await prisma.testResult.findFirst({
      where: { userId, testId },
      orderBy: { attemptNumber: 'desc' },
      select: { attemptNumber: true },
    })
    const nextAttemptNumber = (maxAttemptResult?.attemptNumber ?? 0) + 1

    // Enforce max attempts (configurable, default 3)
    const MAX_ATTEMPTS = parseInt(process.env.MAX_TEST_ATTEMPTS ?? '3', 10)
    if (maxAttemptResult && maxAttemptResult.attemptNumber >= MAX_ATTEMPTS) {
      res.status(403).json({
        status: 'error',
        message: `Maximum attempts (${MAX_ATTEMPTS}) reached for this test`,
        code: 'MAX_ATTEMPTS_REACHED',
      })
      return
    }

    const result = await prisma.testResult.create({
      data: {
        userId,
        testId,
        score: 0,
        totalPoints: 0,
        percentage: 0,
        passed: false,
        timeTaken: 0,
        answers: JSON.stringify({}),
        attemptNumber: nextAttemptNumber,
      },
    })

    const questions = test.questions.map(q => ({
      id: q.id,
      text: q.text,
      type: q.type,
      points: q.points,
      order: q.order,
      options: q.options.map(o => ({
        id: o.id,
        text: o.text,
        order: o.order,
      })),
    }))

    res.status(201).json({
      status: 'success',
      data: {
        attempt_id: result.id,
        attempt_number: result.attemptNumber,
        questions,
        time_limit: test.timeLimit,
        total_marks: test.totalMarks,
        mode: test.mode,
      },
    })
  } catch (error) {
    logger.error('StartTest error', error instanceof Error ? error : new Error(String(error)), {
      testId: req.params.id,
      userId: req.user?.userId,
    })
    res.status(500).json({ status: 'error', message: 'Internal server error' })
  }
}

export const getTestAttempts = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.user?.userId
    if (!userId) {
      res.status(401).json({ status: 'error', message: 'Authentication required' })
      return
    }

    const attempts = await prisma.testResult.findMany({
      where: { userId, status: 'COMPLETED' },
      include: {
        test: {
          select: {
            id: true,
            title: true,
            description: true,
            mode: true,
            difficulty: true,
            timeLimit: true,
            passingScore: true,
            totalMarks: true,
          },
        },
      },
      orderBy: { completedAt: 'desc' },
    })

    const transformedAttempts = attempts.map(attempt => ({
      id: attempt.id,
      test_id: attempt.testId,
      test_title: attempt.test?.title || 'Unknown Test',
      exam_name: '',
      mode: attempt.test?.mode || 'mock',
      status: attempt.status,
      score: attempt.score,
      total_marks: attempt.totalPoints,
      percentage: attempt.percentage,
      passed: attempt.passed,
      time_taken_seconds: attempt.timeTaken,
      attempt_number: attempt.attemptNumber,
      started_at: attempt.startedAt.toISOString(),
      submitted_at: attempt.completedAt?.toISOString() ?? null,
    }))

    const totalXp = attempts.reduce((sum, a) => sum + (a.passed ? Math.round(a.score) : 0), 0)

    res.status(200).json({
      status: 'success',
      data: { results: transformedAttempts, totalXp },
    })
  } catch (error) {
    logger.error(
      '[TestsController] getTestAttempts error',
      error instanceof Error ? error : new Error(String(error))
    )
    res.status(500).json({ status: 'error', message: 'Internal server error' })
  }
}

export const getTestResults = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.user?.userId
    const testId = req.params.id as string

    if (!userId) {
      res.status(401).json({ status: 'error', message: 'Authentication required' })
      return
    }

    const attempts = await prisma.testResult.findMany({
      where: { userId, testId, status: 'COMPLETED' },
      include: {
        test: {
          select: {
            id: true,
            title: true,
            description: true,
            mode: true,
            difficulty: true,
            timeLimit: true,
            passingScore: true,
            totalMarks: true,
          },
        },
      },
      orderBy: { completedAt: 'desc' },
    })

    // Return the most recent result for /result endpoint
    const mostRecent = attempts[0]
    if (!mostRecent) {
      res.status(404).json({ status: 'error', message: 'No results found' })
      return
    }

    const qr = mostRecent.questionResults as any[] | null
    const correctCount = qr ? qr.filter((q: any) => q.is_correct).length : 0
    const incorrectCount = qr ? qr.filter((q: any) => !q.is_correct).length : 0

    const transformed = {
      attempt_id: mostRecent.id,
      test_id: mostRecent.testId,
      test_title: mostRecent.test?.title || 'Unknown Test',
      mode: mostRecent.test?.mode || 'MOCK',
      score: mostRecent.score,
      total_marks: mostRecent.totalPoints,
      percentage: mostRecent.percentage,
      passed: mostRecent.passed,
      time_taken: mostRecent.timeTaken,
      time_limit: mostRecent.test?.timeLimit ?? 0,
      correct_count: correctCount,
      incorrect_count: incorrectCount,
      unanswered_count: 0,
      question_results: qr ?? [],
    }

    res.status(200).json({
      status: 'success',
      data: transformed,
    })
  } catch (error) {
    logger.error(
      '[TestsController] getTestResults error',
      error instanceof Error ? error : new Error(String(error)),
      { testId: req.params.id, userId: req.user?.userId }
    )
    res.status(500).json({ status: 'error', message: 'Internal server error' })
  }
}

export const getTestAttemptDetails = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.user?.userId
    const attemptId = req.params.id as string

    if (!userId) {
      res.status(401).json({ status: 'error', message: 'Authentication required' })
      return
    }

    const attempt = await prisma.testResult.findUnique({
      where: { id: attemptId },
      include: {
        test: {
          include: {
            questions: {
              include: {
                options: {
                  // Always fetch isCorrect for scoring; only exposed in response for completed tests
                  select: { id: true, text: true, isCorrect: true, order: true },
                },
              },
            },
          },
        },
      },
    })

    if (!attempt) {
      res.status(404).json({ status: 'error', message: 'Attempt not found' })
      return
    }

    if (attempt.userId !== userId) {
      res.status(403).json({ status: 'error', message: 'Access denied' })
      return
    }

    const isCompleted = attempt.status === 'COMPLETED'

    // For completed tests, fetch correct answers for review
    // For in-progress tests, do NOT expose correct options
    const questions = attempt.test.questions.map(q => {
      const correctOption = isCompleted ? q.options.find(o => (o as any).isCorrect) : null
      const userAnswer = (attempt.answers as Record<string, unknown>)?.[q.id]
      const isCorrect = isCompleted && userAnswer !== undefined && userAnswer === correctOption?.id

      return {
        question_id: q.id,
        question_text: q.text,
        question_type: q.type,
        selected_option_id: userAnswer ?? null,
        correct_option_id: isCompleted ? (correctOption?.id ?? null) : null,
        is_correct: isCompleted ? isCorrect : null,
        marks_obtained: isCompleted ? (isCorrect ? q.points : 0) : null,
        explanation: isCompleted ? q.explanation : undefined,
      }
    })

    res.status(200).json({
      status: 'success',
      data: {
        ...attempt,
        answers: (attempt.answers as Record<string, unknown>) ?? {},
        question_results: questions,
      },
    })
  } catch (error) {
    logger.error(
      '[TestsController] getTestAttemptDetails error',
      error instanceof Error ? error : new Error(String(error))
    )
    res.status(500).json({ status: 'error', message: 'Internal server error' })
  }
}

export const autosaveTest = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.user?.userId
    const testId = req.params.id as string
    const { answers } = req.body

    if (!userId) {
      res.status(401).json({ status: 'error', message: 'Authentication required' })
      return
    }

    if (!answers || typeof answers !== 'object') {
      res
        .status(400)
        .json({ status: 'error', message: 'Answers are required and must be an object' })
      return
    }

    const attempt = await prisma.testResult.findFirst({
      where: { userId, testId, status: 'IN_PROGRESS' },
      select: { id: true, answers: true },
    })

    if (!attempt) {
      res.status(404).json({ status: 'error', message: 'No active test attempt found' })
      return
    }

    const existingAnswers = (attempt.answers as Record<string, unknown>) ?? {}
    const mergedAnswers = { ...existingAnswers, ...answers }

    await prisma.testResult.update({
      where: { id: attempt.id },
      data: { answers: mergedAnswers as any },
    })

    res.json({
      status: 'success',
      message: 'Answer autosaved',
      data: { saved_count: Object.keys(answers).length },
    })
  } catch (error) {
    logger.error(
      '[TestsController] autosaveTest error',
      error instanceof Error ? error : new Error(String(error)),
      { testId: req.params.id, userId: req.user?.userId }
    )
    res.status(500).json({ status: 'error', message: 'Autosave failed' })
  }
}

export const submitTest = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.user?.userId
    if (!userId) {
      res.status(401).json({ status: 'error', message: 'Authentication required' })
      return
    }
    const testId = req.params.id as string
    const { answers, timeTaken, attempt_id } = req.body

    if (!answers || typeof answers !== 'object') {
      res.status(400).json({ status: 'error', message: 'Answers are required' })
      return
    }

    const test = await prisma.test.findUnique({
      where: { id: testId },
      include: {
        questions: {
          include: {
            options: true,
          },
        },
      },
    })

    if (!test) {
      res.status(404).json({ status: 'error', message: 'Test not found' })
      return
    }

    const timeLimitSeconds = test.timeLimit * 60
    const submittedTimeTaken = typeof timeTaken === 'number' ? timeTaken : 0
    const isOverTime = submittedTimeTaken > timeLimitSeconds

    if (isOverTime) {
      logger.warn(
        `User ${userId} submitted test ${testId} ${submittedTimeTaken - timeLimitSeconds}s over time limit`
      )
    }

    let score = 0
    let correctCount = 0
    let incorrectCount = 0
    const totalQuestions = test.questions.length

    const questionResults = test.questions.map(q => {
      const correctOption = q.options.find(o => o.isCorrect)
      const userAnswerId = answers[q.id]
      const isCorrect =
        userAnswerId !== undefined &&
        correctOption !== undefined &&
        userAnswerId === correctOption.id

      if (isCorrect) {
        score += q.points
        correctCount++
      } else if (userAnswerId !== undefined) {
        incorrectCount++
        if (test.negativeMarks > 0) {
          score -= test.negativeMarks
        }
      }

      return {
        question_id: q.id,
        question_text: q.text,
        question_type: q.type,
        selected_options: userAnswerId ? [{ id: userAnswerId }] : [],
        correct_options: correctOption ? [{ id: correctOption.id, text: correctOption.text }] : [],
        is_correct: isCorrect,
        marks_obtained: isCorrect ? q.points : userAnswerId !== undefined ? -test.negativeMarks : 0,
        explanation: q.explanation,
        time_spent: 0,
        is_flagged: false,
      }
    })

    // Apply overtime penalty BEFORE clamping to preserve the penalty effect
    if (isOverTime) {
      score = Math.floor(score * 0.75)
    }

    // Clamp score to 0 (can't have negative total)
    score = Math.max(0, score)

    const totalPossibleScore = test.questions.reduce((acc, q) => acc + q.points, 0)
    const percentage = totalPossibleScore > 0 ? (score / totalPossibleScore) * 100 : 0
    const passed = percentage >= test.passingScore
    const unansweredCount = totalQuestions - correctCount - incorrectCount

    const result = await prisma.$transaction(async tx => {
      let existingResult: {
        id: string
        status: string
        score: number
        totalPoints: number
        percentage: number
        passed: boolean
        timeTaken: number
        attemptNumber: number
      } | null = null

      if (attempt_id) {
        existingResult = await tx.testResult.findUnique({
          where: { id: attempt_id, userId },
          select: {
            id: true,
            status: true,
            score: true,
            totalPoints: true,
            percentage: true,
            passed: true,
            timeTaken: true,
            attemptNumber: true,
          },
        })
      }

      if (!existingResult) {
        existingResult = await tx.testResult.findFirst({
          where: { userId, testId, status: 'IN_PROGRESS' },
          select: {
            id: true,
            status: true,
            score: true,
            totalPoints: true,
            percentage: true,
            passed: true,
            timeTaken: true,
            attemptNumber: true,
          },
        })
      }

      if (existingResult?.status === 'COMPLETED') {
        return { ...existingResult, isDuplicate: true }
      }

      const submissionData = {
        score,
        totalPoints: totalPossibleScore,
        percentage,
        passed,
        timeTaken: submittedTimeTaken,
        answers: answers as any,
        questionResults: questionResults as any,
        completedAt: new Date(),
        status: 'COMPLETED' as const,
      }

      let resultRecord
      if (existingResult) {
        resultRecord = await tx.testResult.update({
          where: { id: existingResult.id },
          data: submissionData,
        })
      } else {
        const maxAttemptResult = await tx.testResult.findFirst({
          where: { userId, testId },
          orderBy: { attemptNumber: 'desc' },
          select: { attemptNumber: true },
        })
        const nextAttemptNumber = (maxAttemptResult?.attemptNumber ?? 0) + 1

        const MAX_ATTEMPTS = parseInt(process.env.MAX_TEST_ATTEMPTS ?? '3', 10)
        if (maxAttemptResult && maxAttemptResult.attemptNumber >= MAX_ATTEMPTS) {
          throw new Error(`Maximum attempts (${MAX_ATTEMPTS}) reached for this test`)
        }

        resultRecord = await tx.testResult.create({
          data: {
            userId,
            testId,
            ...submissionData,
            attemptNumber: nextAttemptNumber,
          },
        })
      }

      if (passed) {
        await tx.user.update({
          where: { id: userId },
          data: { xp: { increment: Math.round(score) } },
        })
      }

      return { ...resultRecord, isDuplicate: false }
    })

    if ((result as any).isDuplicate) {
      res.status(200).json({
        status: 'success',
        message: 'Test was already submitted',
        data: {
          attempt_id: result.id,
          test_id: testId,
          test_title: test.title,
          mode: test.mode,
          score: result.score,
          total_marks: result.totalPoints,
          percentage: result.percentage,
          passed: result.passed,
          time_taken: result.timeTaken,
          time_limit: test.timeLimit,
          correct_count: correctCount,
          incorrect_count: incorrectCount,
          unanswered_count: unansweredCount,
          question_results: questionResults,
        },
      })
      return
    }

    res.status(201).json({
      status: 'success',
      data: {
        attempt_id: result.id,
        test_id: testId,
        test_title: test.title,
        mode: test.mode,
        score: result.score,
        total_marks: result.totalPoints,
        percentage: result.percentage,
        passed: result.passed,
        time_taken: result.timeTaken,
        time_limit: test.timeLimit,
        correct_count: correctCount,
        incorrect_count: incorrectCount,
        unanswered_count: unansweredCount,
        question_results: questionResults,
      },
    })
  } catch (error) {
    logger.error(
      '[TestsController] submitTest error',
      error instanceof Error ? error : new Error(String(error)),
      { testId: req.params.id, userId: req.user?.userId }
    )
    res.status(500).json({
      status: 'error',
      message: error instanceof Error ? error.message : 'Internal server error',
    })
  }
}
