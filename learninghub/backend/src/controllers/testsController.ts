import { Request, Response } from 'express'
import { prisma } from '../prismaClient'
import { getPaginationParams, createPaginatedResponse } from '../utils/pagination'
import { Prisma, TestMode, TestDifficulty } from '@prisma/client'
import {
  sendSuccess,
  sendCreated,
  sendNotFound,
  sendValidationError,
  sendForbidden,
} from '../utils/responseHelper'

import { testScoringService } from '../services/TestScoringService'
import { cacheService as queryCache } from '../services/CacheService'
import { asyncHandler } from '../utils/errorHandler'

import {
  mapQuestionSafe,
  TEST_MODES,
  TEST_DIFFICULTIES,
  normalizeEnumFilter,
  getRemainingSeconds,
  hasSubmittedAnswer,
  countQuestionResults,
} from '../utils/testsHelper'

const normalizeCacheKey = (query: Record<string, unknown>): string => {
  const canonical: Record<string, string> = {}
  for (const [key, value] of Object.entries(query)) {
    if (!value || (typeof value === 'string' && !value.trim())) continue
    let normalized = String(value).trim()
    if (key === 'mode') normalized = normalizeEnumFilter(normalized, TEST_MODES) ?? normalized
    if (key === 'difficulty')
      normalized = normalizeEnumFilter(normalized, TEST_DIFFICULTIES) ?? normalized
    canonical[key] = normalized
  }
  return JSON.stringify(canonical, Object.keys(canonical).sort())
}

export const listTests = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const { mode, difficulty, search, examId, countryId, exam, country } = req.query
  const { page, limit, skip } = getPaginationParams(req.query)
  const userId = req.user?.userId // This endpoint might allow unauthenticated access (optionalAuth)

  const cacheKey = queryCache.generateKey('listTests', {
    ...normalizeCacheKey(req.query as Record<string, unknown>),
    userId: userId ?? 'anonymous',
  })
  const cachedResponse = await queryCache.get(cacheKey)
  if (cachedResponse) {
    const { data, meta } = cachedResponse as { data: unknown; meta: unknown }
    sendSuccess(res, data, undefined, 200, meta)
    return
  }

  const filters: Prisma.TestWhereInput = { isPublished: true, deletedAt: null }

  const modeFilter = normalizeEnumFilter(mode, TEST_MODES)
  if (modeFilter) filters.mode = modeFilter as TestMode

  const difficultyFilter = normalizeEnumFilter(difficulty, TEST_DIFFICULTIES)
  if (difficultyFilter) filters.difficulty = difficultyFilter as TestDifficulty

  if (typeof search === 'string' && search.trim()) {
    const query = search.trim()
    const matchingIds = await prisma.$queryRaw<{ id: string }[]>`
      SELECT id FROM "tests"
      WHERE search_vector IS NOT NULL
        AND search_vector @@ plainto_tsquery('english', ${query})
      UNION
      SELECT id FROM "tests"
      WHERE search_vector IS NULL
        AND (title ILIKE ${`%${query}%`} OR description ILIKE ${`%${query}%`})
    `
    if (matchingIds.length === 0) {
      filters.id = { in: [] }
    } else {
      filters.id = { in: matchingIds.map((m: any) => m.id) }
    }
  }

  const examFilters: Prisma.ExamWhereInput = {}
  if (examId) examFilters.id = examId as string
  if (countryId) examFilters.countryId = countryId as string

  if (typeof exam === 'string' && exam.trim()) {
    const examQuery = exam.trim()
    examFilters.OR = [
      { id: examQuery },
      { slug: examQuery },
      { name: { contains: examQuery, mode: 'insensitive' } },
    ]
  }

  if (typeof country === 'string' && country.trim()) {
    const countryQuery = country.trim()
    examFilters.country = {
      OR: [
        { id: countryQuery },
        { code: { equals: countryQuery.toUpperCase() } },
        { name: { contains: countryQuery, mode: 'insensitive' } },
      ],
    }
  }

  if (Object.keys(examFilters).length > 0) {
    filters.exam = examFilters
  }

  const [total, tests] = await Promise.all([
    prisma.test.count({ where: filters }),
    prisma.test.findMany({
      where: filters,
      skip,
      take: limit,
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        title: true,
        description: true,
        examId: true,
        timeLimit: true,
        passingScore: true,
        maxAttempts: true,
        mode: true,
        difficulty: true,
        totalMarks: true,
        negativeMarks: true,
        isAiGenerated: true,
        createdAt: true,
        _count: {
          select: { questions: true, results: true },
        },
        exam: {
          select: {
            id: true,
            name: true,
            slug: true,
            country: {
              select: { id: true, name: true, code: true },
            },
          },
        },
      },
    }),
  ])

  const userAttemptMap = new Map<string, number>()
  if (userId) {
    const userAttempts = await prisma.testResult.groupBy({
      by: ['testId'],
      where: { userId, testId: { in: tests.map((t: any) => t.id) }, status: 'COMPLETED' },
      _count: { id: true },
    })
    userAttempts.forEach((a: any) => userAttemptMap.set(a.testId, a._count.id))
  }

  const transformedTests = tests.map((t: any) => ({
    id: t.id,
    title: t.title,
    description: t.description,
    exam_id: t.examId,
    exam_name: t.exam?.name ?? '',
    exam_code: t.exam?.slug ?? '',
    country_id: t.exam?.country?.id ?? '',
    country_name: t.exam?.country?.name ?? '',
    country_code: t.exam?.country?.code ?? '',
    course_id: null,
    course_title: 'General',
    time_limit: t.timeLimit,
    time_limit_minutes: t.timeLimit,
    passing_score: t.passingScore,
    total_questions: t._count.questions,
    question_count: t._count.questions,
    max_attempts: t.maxAttempts,
    attempts_made: userAttemptMap.get(t.id) ?? 0,
    attempt_count: userAttemptMap.get(t.id) ?? 0,
    mode: t.mode,
    difficulty: t.difficulty,
    total_marks: t.totalMarks,
    negative_marks: t.negativeMarks,
    negative_marks_per_question: t.negativeMarks,
    is_ai_generated: t.isAiGenerated,
    created_at: t.createdAt.toISOString(),
  }))

  const paginated = createPaginatedResponse(transformedTests, total, page, limit)

  await queryCache.set(cacheKey, { data: paginated.data, meta: paginated.meta }, 60)
  sendSuccess(res, paginated.data, undefined, 200, paginated.meta)
})

export const getTestDetails = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const id = req.params.id as string

  const cacheKey = queryCache.generateKey('getTestDetails', id)
  const cachedTest = await queryCache.get(cacheKey)
  if (cachedTest) {
    sendSuccess(res, { quiz: cachedTest })
    return
  }

  const test = await prisma.test.findUnique({
    where: { id, isPublished: true, deletedAt: null },
    select: {
      id: true,
      title: true,
      description: true,
      timeLimit: true,
      passingScore: true,
      mode: true,
      difficulty: true,
      totalMarks: true,
      negativeMarks: true,
      isAiGenerated: true,
      _count: {
        select: { questions: true },
      },
    },
  })

  if (!test) {
    sendNotFound(res, 'Test not found')
    return
  }

  const quizData = {
    id: test.id,
    title: test.title,
    description: test.description,
    course_id: null,
    course_title: 'General',
    time_limit: test.timeLimit,
    passing_score: test.passingScore,
    total_questions: test._count.questions,
    mode: test.mode,
    difficulty: test.difficulty,
    total_marks: test.totalMarks,
    negative_marks: test.negativeMarks,
    is_ai_generated: test.isAiGenerated,
  }

  await queryCache.set(cacheKey, quizData, 300)
  sendSuccess(res, { quiz: quizData })
})

export const startTest = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const testId = req.params.id as string
  const userId = req.user!.userId

  const test = await prisma.test.findUnique({
    where: { id: testId, isPublished: true, deletedAt: null },
    select: {
      id: true,
      timeLimit: true,
      maxAttempts: true,
      totalMarks: true,
      mode: true,
      questions: {
        orderBy: { order: 'asc' },
        select: {
          id: true,
          text: true,
          type: true,
          difficulty: true,
          points: true,
          order: true,
          tags: true,
          explanation: true,
          topicId: true,
          imageUrl: true,
          isAiGenerated: true,
          options: {
            orderBy: { order: 'asc' },
            select: { id: true, text: true, order: true },
          },
        },
      },
    },
  })

  if (!test) {
    sendNotFound(res, 'Test not found')
    return
  }

  const existingResult = await prisma.testResult.findFirst({
    where: {
      userId,
      testId,
      status: 'IN_PROGRESS',
    },
    orderBy: { attemptNumber: 'desc' },
    select: {
      id: true,
      attemptNumber: true,
      startedAt: true,
      attemptAnswers: {
        select: { questionId: true, selectedOptions: true, textAnswer: true },
      },
    },
  })

  if (existingResult) {
    const questions = test.questions.map(mapQuestionSafe)
    const answers: Record<string, string | string[]> = {}
    for (const a of existingResult.attemptAnswers) {
      answers[a.questionId] =
        a.textAnswer ?? (a.selectedOptions.length === 1 ? a.selectedOptions[0] : a.selectedOptions)
    }
    const timeRemainingSeconds = getRemainingSeconds(existingResult.startedAt, test.timeLimit)

    sendSuccess(res, {
      attempt_id: existingResult.id,
      attempt_number: existingResult.attemptNumber,
      questions,
      answers,
      answered_count: Object.values(answers).filter(hasSubmittedAnswer).length,
      time_limit: test.timeLimit,
      time_limit_seconds: test.timeLimit * 60,
      time_remaining_seconds: timeRemainingSeconds,
      total_marks: test.totalMarks,
      mode: test.mode,
    })
    return
  }

  const maxAttemptResult = await prisma.testResult.findFirst({
    where: { userId, testId },
    orderBy: { attemptNumber: 'desc' },
    select: { attemptNumber: true },
  })
  const nextAttemptNumber = (maxAttemptResult?.attemptNumber ?? 0) + 1

  const maxAttempts = test.maxAttempts ?? parseInt(process.env.MAX_TEST_ATTEMPTS ?? '3', 10)
  if (maxAttemptResult && maxAttemptResult.attemptNumber >= maxAttempts) {
    sendForbidden(
      res,
      `Maximum attempts (${maxAttempts}) reached for this test`,
      'MAX_ATTEMPTS_REACHED'
    )
    return
  }

  // Create test result with retry on unique constraint violation (attemptNumber race condition)
  const result = await prisma.$transaction(async (tx: any) => {
    let attemptNumber = nextAttemptNumber
    for (let attempt = 1; attempt <= 3; attempt++) {
      try {
        return await tx.testResult.create({
          data: {
            userId,
            testId,
            score: 0,
            totalPoints: 0,
            percentage: 0,
            passed: false,
            timeTaken: 0,
            attemptNumber,
          },
        })
      } catch (error) {
        const err = error as Error & { code?: string }
        if (err.code === 'P2002' && attempt < 3) {
          attemptNumber++
          continue
        }
        throw error
      }
    }
    throw new Error('Failed to create test result after retries')
  })

  const questions = test.questions.map(mapQuestionSafe)

  sendCreated(res, {
    attempt_id: result.id,
    attempt_number: result.attemptNumber,
    questions,
    answers: {},
    answered_count: 0,
    time_limit: test.timeLimit,
    time_limit_seconds: test.timeLimit * 60,
    time_remaining_seconds: getRemainingSeconds(result.startedAt, test.timeLimit),
    total_marks: test.totalMarks,
    mode: test.mode,
  })
})

export const getTestAttempts = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const userId = req.user!.userId

  const attempts = await prisma.testResult.findMany({
    where: { userId },
    select: {
      id: true,
      testId: true,
      status: true,
      score: true,
      totalPoints: true,
      percentage: true,
      passed: true,
      timeTaken: true,
      startedAt: true,
      completedAt: true,
      attemptNumber: true,
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
          questions: {
            select: { id: true },
          },
        },
      },
      attemptAnswers: {
        select: { questionId: true, selectedOptions: true, textAnswer: true },
      },
    },
    orderBy: { startedAt: 'desc' },
  })

  const transformedAttempts = attempts.map((attempt: any) => {
    const answers: Record<string, string | string[]> = {}
    for (const a of attempt.attemptAnswers) {
      answers[a.questionId] =
        a.textAnswer ?? (a.selectedOptions.length === 1 ? a.selectedOptions[0] : a.selectedOptions)
    }

    return {
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
      time_remaining_seconds:
        attempt.status === 'IN_PROGRESS'
          ? getRemainingSeconds(attempt.startedAt, attempt.test?.timeLimit ?? 0)
          : 0,
      attempt_number: attempt.attemptNumber,
      answered_count: Object.values(answers).filter(hasSubmittedAnswer).length,
      started_at: attempt.startedAt.toISOString(),
      submitted_at: attempt.completedAt?.toISOString() ?? null,
    }
  })

  const totalXp = attempts.reduce((sum: number, a: any) => sum + (a.passed ? Math.round(a.score) : 0), 0)
  sendSuccess(res, { results: transformedAttempts, totalXp })
})

export const getTestResults = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const userId = req.user!.userId
  const testId = req.params.id as string

  const attempts = await prisma.testResult.findMany({
    where: { userId, testId, status: 'COMPLETED' },
    select: {
      id: true,
      testId: true,
      userId: true,
      status: true,
      score: true,
      totalPoints: true,
      percentage: true,
      passed: true,
      timeTaken: true,
      attemptAnswers: {
        select: {
          questionId: true,
          isCorrect: true,
          marksObtained: true,
          selectedOptions: true,
          timeSpent: true,
          aiFeedback: true,
          textAnswer: true,
        },
      },
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

  const mostRecent = attempts[0]
  if (!mostRecent) {
    sendNotFound(res, 'No results found')
    return
  }

  const qr = mostRecent.attemptAnswers.map((ans: any) => ({
    question_id: ans.questionId,
    is_correct: ans.isCorrect,
    marks_obtained: ans.marksObtained,
    selected_options: ans.selectedOptions.map((id: any) => ({ id })),
    time_spent: ans.timeSpent,
    explanation: ans.aiFeedback,
  }))
  const { correctCount, incorrectCount, unansweredCount } = countQuestionResults(qr)

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
    unanswered_count: unansweredCount,
    question_results: qr,
  }

  sendSuccess(res, transformed)
})

export const getTestAttemptDetails = asyncHandler(
  async (req: Request, res: Response): Promise<void> => {
    const userId = req.user!.userId
    const attemptId = req.params.id as string

    const attempt = await prisma.testResult.findUnique({
      where: { id: attemptId },
      include: {
        test: {
          include: {
            questions: {
              include: {
                options: {
                  select: { id: true, text: true, isCorrect: true, order: true },
                },
              },
            },
          },
        },
        attemptAnswers: true,
      },
    })

    if (!attempt) {
      sendNotFound(res, 'Attempt not found')
      return
    }

    if (attempt.userId !== userId) {
      sendForbidden(res, 'Access denied')
      return
    }

    const isCompleted = attempt.status === 'COMPLETED'

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const attemptAnswersMap = new Map<string, any>()
    for (const a of attempt.attemptAnswers) {
      attemptAnswersMap.set(a.questionId, a)
    }

    const answersForResponse: Record<string, string | string[]> = {}
    for (const a of attempt.attemptAnswers) {
      answersForResponse[a.questionId] =
        a.textAnswer ?? (a.selectedOptions.length === 1 ? a.selectedOptions[0] : a.selectedOptions)
    }

    const questions = attempt.test.questions.map((q: any) => {
      const correctOption = isCompleted ? q.options.find((o: any) => o.isCorrect) : null
      const dbAnswer = attemptAnswersMap.get(q.id)
      const userAnswer = answersForResponse[q.id]

      let isCorrect = null
      let marksObtained = null

      if (isCompleted) {
        if (dbAnswer?.isCorrect !== null && dbAnswer?.isCorrect !== undefined) {
          isCorrect = dbAnswer.isCorrect
        } else {
          isCorrect = userAnswer !== undefined && userAnswer === correctOption?.id
        }
        marksObtained = dbAnswer?.marksObtained ?? (isCorrect ? q.points : 0)
      }

      return {
        question_id: q.id,
        question_text: q.text,
        question_type: q.type,
        selected_option_id: q.type !== 'SUBJECTIVE' ? (userAnswer ?? null) : null,
        text_answer: q.type === 'SUBJECTIVE' ? (dbAnswer?.textAnswer ?? null) : null,
        correct_option_id: isCompleted ? (correctOption?.id ?? null) : null,
        is_correct: isCompleted ? isCorrect : null,
        marks_obtained: isCompleted ? marksObtained : null,
        explanation: isCompleted ? q.explanation : undefined,
        ai_feedback: isCompleted ? dbAnswer?.aiFeedback : undefined,
      }
    })

    sendSuccess(res, {
      ...attempt,
      answers: answersForResponse,
      question_results: questions,
    })
  }
)

export const autosaveTest = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const userId = req.user!.userId
  const testId = req.params.id as string
  const { answers, attempt_id } = req.body

  if (!answers || typeof answers !== 'object') {
    sendValidationError(res, 'Answers are required and must be an object')
    return
  }

  if (attempt_id && typeof attempt_id !== 'string') {
    sendValidationError(res, 'attempt_id must be a string')
    return
  }

  const result = await prisma.$transaction(async (tx: any) => {
    const attempt = await tx.testResult.findFirst({
      where: attempt_id
        ? { id: attempt_id, userId, testId, status: 'IN_PROGRESS' }
        : { userId, testId, status: 'IN_PROGRESS' },
      orderBy: { attemptNumber: 'desc' },
      select: { id: true },
    })

    if (!attempt) {
      return null
    }

    const entries = Object.entries(answers)
    await Promise.all(
      entries.map(([qId, ans]) => {
        const submittedIds = ans ? (Array.isArray(ans) ? ans : [ans]) : []
        return tx.testAttemptAnswer.upsert({
          where: {
            testResultId_questionId: {
              testResultId: attempt.id,
              questionId: qId,
            },
          },
          update: {
            selectedOptions: submittedIds,
            textAnswer: typeof ans === 'string' ? ans : null,
          },
          create: {
            testResultId: attempt.id,
            questionId: qId,
            selectedOptions: submittedIds,
            textAnswer: typeof ans === 'string' ? ans : null,
          },
        })
      })
    )
    return entries.length
  })

  if (result === null) {
    sendNotFound(res, 'No active test attempt found')
    return
  }

  sendSuccess(res, { saved_count: result }, 'Answer autosaved')
})

export const submitTest = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const userId = req.user!.userId
  const testId = req.params.id as string
  const { answers, timeTaken, attempt_id, confidences } = req.body

  if (!answers || typeof answers !== 'object' || Object.keys(answers).length === 0) {
    sendValidationError(res, 'Answers are required and must contain at least one answer')
    return
  }

  try {
    const { result, test, isDuplicate, correctCount, incorrectCount, questionResults } =
      await testScoringService.scoreAndSubmitTest({
        userId,
        testId,
        answers,
        timeTaken,
        attemptId: attempt_id,
        confidences,
      })

    const counts = countQuestionResults(questionResults, test.questions.length)
    const effectiveCorrectCount = correctCount ?? counts.correctCount
    const effectiveIncorrectCount = incorrectCount ?? counts.incorrectCount
    const unansweredCount = counts.unansweredCount

    const responsePayload = {
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
      correct_count: effectiveCorrectCount,
      correct_answers: effectiveCorrectCount,
      incorrect_count: effectiveIncorrectCount,
      unanswered_count: unansweredCount,
      question_results: questionResults,
    }

    if (isDuplicate) {
      sendSuccess(res, responsePayload, 'Test was already submitted')
      return
    }

    sendCreated(res, responsePayload)
  } catch (error) {
    if (
      error instanceof Error &&
      (error.message === 'Test not found' || error.message === 'Attempt not found')
    ) {
      sendNotFound(res, error.message)
      return
    }
    throw error // Let asyncHandler catch this and handle it globally
  }
})
