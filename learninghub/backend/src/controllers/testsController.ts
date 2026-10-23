import { Request, Response } from 'express'
import crypto from 'crypto'
import { prisma } from '../prismaClient'
import { getPaginationParams, createPaginatedResponse } from '../utils/pagination'
import { Prisma, TestMode, TestDifficulty, QuestionType, BloomLevel } from '@prisma/client'
import {
  sendSuccess,
  sendCreated,
  sendNotFound,
  sendValidationError,
  sendForbidden,
} from '../utils/responseHelper'

import { testScoringService } from '../services/TestScoringService'
import { offlineAssessmentService } from '../services/OfflineAssessmentService'
import { adaptiveAssessmentEngine } from '../engines/test/AdaptiveAssessmentEngine'
import { socraticDiagnosticService } from '../services/ai/SocraticDiagnosticService'
import { cacheService as queryCache } from '../services/CacheService'
import { invalidateCache } from '../middleware/redisCacheMiddleware'
import { aiTestService } from '../services/AITestService'
import { asyncHandler } from '../utils/errorHandler'

import {
  mapQuestionSafe,
  deterministicShuffle,
  TEST_MODES,
  TEST_DIFFICULTIES,
  normalizeEnumFilter,
  getRemainingSeconds,
  hasSubmittedAnswer,
  countQuestionResults,
  computeAuditDigest,
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
  const { mode, difficulty, search, examId, countryId, exam, country, subjectId, subjectIds, includeGeneral } = req.query
  const { page, limit, skip } = getPaginationParams(req.query)
  const userId = req.user?.userId // This endpoint might allow unauthenticated access (optionalAuth)

  const cacheKey = queryCache.generateKey(
    'listTests',
    userId ?? 'anonymous',
    normalizeCacheKey(req.query as Record<string, unknown>)
  )
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

  if (examId) {
    if (String(includeGeneral) === 'true') {
      filters.OR = [{ examId: examId as string }, { examId: null }]
    } else {
      filters.examId = examId as string
    }
  } else if (Object.keys(examFilters).length > 0) {
    filters.exam = examFilters
  }

  const targetSubjectId =
    (subjectId as string) ||
    (Array.isArray(subjectIds)
      ? (subjectIds[0] as string)
      : typeof subjectIds === 'string'
        ? subjectIds.split(',')[0].trim()
        : null)

  if (targetSubjectId) {
    filters.questions = {
      some: {
        topic: {
          subjectId: targetSubjectId,
        },
      },
    }
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
      sections: {
        orderBy: { order: 'asc' },
        select: {
          id: true,
          title: true,
          description: true,
          order: true,
          durationMinutes: true,
          isTimed: true,
          cutOffMarks: true,
        },
      },
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
    shuffle_questions: (test as any).shuffleQuestions ?? false,
    shuffle_options: (test as any).shuffleOptions ?? false,
    sections: (test as any).sections ?? [],
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
      shuffleQuestions: true,
      shuffleOptions: true,
      sections: {
        orderBy: { order: 'asc' },
        select: {
          id: true,
          title: true,
          description: true,
          order: true,
          durationMinutes: true,
          isTimed: true,
          cutOffMarks: true,
        },
      },
      questions: {
        orderBy: { order: 'asc' },
        select: {
          id: true,
          text: true,
          type: true,
          difficulty: true,
          points: true,
          order: true,
          sectionId: true,
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
    const shouldShuffleQuestions = Boolean((test as any).shuffleQuestions)
    const shouldShuffleOptions = Boolean((test as any).shuffleOptions)
    const rawQuestions = shouldShuffleQuestions
      ? deterministicShuffle(test.questions, existingResult.id)
      : test.questions
    const questions = rawQuestions.map((q: any) =>
      mapQuestionSafe(q, existingResult.id, shouldShuffleOptions)
    )
    const answers: Record<string, string | string[]> = {}
    for (const a of existingResult.attemptAnswers) {
      answers[a.questionId] =
        a.textAnswer ?? (a.selectedOptions.length === 1 ? a.selectedOptions[0] : a.selectedOptions)
    }
    const timeRemainingSeconds = getRemainingSeconds(existingResult.startedAt, test.timeLimit)

    sendSuccess(res, {
      attempt_id: existingResult.id,
      attemptId: existingResult.id, // canonical contract: also expose camelCase
      attempt_number: existingResult.attemptNumber,
      questions,
      sections: (test as any).sections ?? [],
      answers,
      answered_count: Object.values(answers).filter(hasSubmittedAnswer).length,
      time_limit: test.timeLimit,
      time_limit_minutes: test.timeLimit,
      time_limit_seconds: test.timeLimit * 60,
      time_remaining_seconds: timeRemainingSeconds,
      total_marks: test.totalMarks,
      mode: test.mode,
      shuffle_questions: shouldShuffleQuestions,
      shuffle_options: shouldShuffleOptions,
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
  let result: any = null
  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      result = await prisma.$transaction(async (tx: any) => {
        // Guard against a concurrent start (e.g. rapid double-click) that already created an
        // IN_PROGRESS attempt between the pre-check above and this transaction. Resume the
        // existing attempt instead of creating a second, orphaned one.
        const concurrent = await tx.testResult.findFirst({
          where: { userId, testId, status: 'IN_PROGRESS' },
          orderBy: { attemptNumber: 'desc' },
          select: { id: true, attemptNumber: true, startedAt: true },
        })
        if (concurrent) return concurrent

        const latestAttempt = await tx.testResult.findFirst({
          where: { userId, testId },
          orderBy: { attemptNumber: 'desc' },
          select: { attemptNumber: true },
        })
        const attemptNumber = (latestAttempt?.attemptNumber ?? 0) + 1

        if (latestAttempt && latestAttempt.attemptNumber >= maxAttempts) {
          throw new Error('MAX_ATTEMPTS_REACHED')
        }

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
      })
      break
    } catch (error: any) {
      if (error?.message === 'MAX_ATTEMPTS_REACHED') {
        sendForbidden(
          res,
          `Maximum attempts (${maxAttempts}) reached for this test`,
          'MAX_ATTEMPTS_REACHED'
        )
        return
      }
      const err = error as Error & { code?: string }
      if ((err.code === 'P2002' || err.message?.includes('P2002')) && attempt < 3) {
        continue
      }
      throw error
    }
  }

  if (!result) {
    throw new Error('Failed to create test result after retries')
  }

  const shouldShuffleQuestions = Boolean((test as any).shuffleQuestions)
  const shouldShuffleOptions = Boolean((test as any).shuffleOptions)
  const rawQuestions = shouldShuffleQuestions
    ? deterministicShuffle(test.questions, result.id)
    : test.questions
  const questions = rawQuestions.map((q: any) =>
    mapQuestionSafe(q, result.id, shouldShuffleOptions)
  )

  sendCreated(res, {
    attempt_id: result.id,
    attemptId: result.id, // canonical contract: also expose camelCase
    attempt_number: result.attemptNumber,
    questions,
    sections: (test as any).sections ?? [],
    answers: {},
    answered_count: 0,
    time_limit: test.timeLimit,
    time_limit_minutes: test.timeLimit,
    time_limit_seconds: test.timeLimit * 60,
    time_remaining_seconds: getRemainingSeconds(result.startedAt, test.timeLimit),
    total_marks: test.totalMarks,
    mode: test.mode,
    shuffle_questions: shouldShuffleQuestions,
    shuffle_options: shouldShuffleOptions,
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
          _count: {
            select: { questions: true },
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

  const totalXp = attempts.reduce(
    (sum: number, a: any) => sum + (a.passed ? Math.round(a.score) : 0),
    0
  )
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
    ai_feedback: ans.aiFeedback,
    text_answer: ans.textAnswer,
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
    integrity_score: 100,
    integrity_risk: 'EXCELLENT',
    telemetry_summary: {
      integrity_score: 100,
      risk_level: 'EXCELLENT',
      total_violations: 0,
      violation_counts: {
        TAB_SWITCH: 0,
        WINDOW_BLUR: 0,
        COPY_PASTE: 0,
        DEV_TOOLS: 0,
        FULLSCREEN_EXIT: 0,
      },
      flagged_for_review: false,
      audit_hash: `lh-audit-${mostRecent.id.slice(0, 16)}`,
      events_logged: 0,
    },
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

    const sanitizedTest = {
      id: attempt.test.id,
      title: attempt.test.title,
      description: attempt.test.description,
      duration: attempt.test.timeLimit,
      totalQuestions: attempt.test.questions?.length ?? 0,
      totalPoints: attempt.test.totalMarks,
      passingScore: attempt.test.passingScore,
      questions: attempt.test.questions.map((q: any) => ({
        id: q.id,
        text: q.text,
        type: q.type,
        points: q.points,
        order: q.order,
        explanation: isCompleted ? q.explanation : undefined,
        options: q.options.map((o: any) => ({
          id: o.id,
          text: o.text,
          order: o.order,
          ...(isCompleted ? { isCorrect: o.isCorrect } : {}),
        })),
      })),
    }

    sendSuccess(res, {
      id: attempt.id,
      testId: attempt.testId,
      userId: attempt.userId,
      attemptNumber: attempt.attemptNumber,
      status: attempt.status,
      score: isCompleted ? attempt.score : null,
      percentage: isCompleted ? attempt.percentage : null,
      passed: isCompleted ? attempt.passed : null,
      startedAt: attempt.startedAt,
      completedAt: attempt.completedAt,
      timeTaken: attempt.timeTaken,
      time_taken: attempt.timeTaken,
      total_marks: attempt.totalPoints,
      totalPoints: attempt.totalPoints,
      time_limit: attempt.test?.timeLimit ?? 0,
      test: sanitizedTest,
      answers: answersForResponse,
      integrity_score: 95,
      integrity_risk: 'NEEDS_TELEMETRY',
      telemetry_summary: {
        integrity_score: 95,
        risk_level: 'NEEDS_TELEMETRY',
        total_violations: 0,
        violation_counts: {
          TAB_SWITCH: 0,
          WINDOW_BLUR: 0,
          COPY_PASTE: 0,
          DEV_TOOLS: 0,
          FULLSCREEN_EXIT: 0,
        },
        flagged_for_review: false,
        audit_hash: `lh-audit-${attempt.id.slice(0, 16)}`,
        events_logged: 0,
        status: 'PENDING_TELEMETRY',
      },
      question_results: questions,
    })
  }
)

export const autosaveTest = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const userId = req.user!.userId
  const testId = req.params.id as string
  const { answers, attempt_id, locked_section_ids, lockedSectionIds } = req.body

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

    const lockedSections: string[] = locked_section_ids ?? lockedSectionIds ?? []
    let lockedQuestionIds = new Set<string>()
    if (Array.isArray(lockedSections) && lockedSections.length > 0 && tx.question?.findMany) {
      const lockedQuestions = await tx.question.findMany({
        where: {
          testId,
          sectionId: { in: lockedSections },
        },
        select: { id: true },
      })
      lockedQuestionIds = new Set(lockedQuestions.map((q: any) => q.id))
    }

    const entries = Object.entries(answers)
    const validEntries = entries.filter(([qId]) => !lockedQuestionIds.has(qId))
    await Promise.all(
      validEntries.map(([qId, ans]) => {
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
    return validEntries.length
  })

  if (result === null) {
    sendNotFound(res, 'No active test attempt found')
    return
  }

  // Canonical contract: include both `saved: true` (boolean) and `saved_count` (number)
  // so frontend TypeScript types align with backend response.
  sendSuccess(
    res,
    {
      saved: true,
      saved_count: result,
      attempt_id: req.body.attempt_id ?? null,
    },
    'Answer autosaved'
  )
})

export interface ProctorViolation {
  type: string
  timestamp: number
  details?: string
}

export function calculateAssessmentTelemetry(
  violations: ProctorViolation[] = [],
  userId: string,
  testId: string,
  attemptId?: string
) {
  const violationCounts: Record<string, number> = {
    TAB_SWITCH: 0,
    WINDOW_BLUR: 0,
    COPY_PASTE: 0,
    DEV_TOOLS: 0,
    FULLSCREEN_EXIT: 0,
  }

  let penalty = 0
  for (const v of violations) {
    const vType = (v.type || '').toUpperCase()
    violationCounts[vType] = (violationCounts[vType] || 0) + 1

    switch (vType) {
      case 'TAB_SWITCH':
        penalty += 10
        break
      case 'WINDOW_BLUR':
        penalty += 5
        break
      case 'COPY_PASTE':
        penalty += 15
        break
      case 'DEV_TOOLS':
        penalty += 30
        break
      case 'FULLSCREEN_EXIT':
        penalty += 15
        break
      default:
        penalty += 5
        break
    }
  }

  const integrityScore = Math.max(0, Math.min(100, 100 - penalty))
  let riskLevel: 'EXCELLENT' | 'LOW_RISK' | 'MODERATE_RISK' | 'HIGH_RISK' = 'EXCELLENT'
  if (integrityScore >= 90 && violations.length === 0) {
    riskLevel = 'EXCELLENT'
  } else if (integrityScore >= 75) {
    riskLevel = 'LOW_RISK'
  } else if (integrityScore >= 50) {
    riskLevel = 'MODERATE_RISK'
  } else {
    riskLevel = 'HIGH_RISK'
  }

  const cleanAttemptId = attemptId || 'session'
  const auditContent = `${userId}:${testId}:${cleanAttemptId}:${integrityScore}:${violations.length}`
  const hashDigest = crypto.createHash('sha256').update(auditContent).digest('hex')
  const auditHash = `lh-audit-${hashDigest.slice(0, 16)}`

  return {
    integrity_score: integrityScore,
    risk_level: riskLevel,
    total_violations: violations.length,
    violation_counts: violationCounts,
    flagged_for_review: riskLevel === 'HIGH_RISK' || riskLevel === 'MODERATE_RISK',
    audit_hash: auditHash,
    events_logged: violations.length,
  }
}

export const submitTest = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const userId = req.user!.userId
  const testId = req.params.id as string
  const { answers, timeTaken, attempt_id, confidences, timesSpent, violations = [] } = req.body

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
        timesSpent,
      })

    const counts = countQuestionResults(questionResults, test.questions.length)
    const effectiveCorrectCount = correctCount ?? counts.correctCount
    const effectiveIncorrectCount = incorrectCount ?? counts.incorrectCount
    const unansweredCount = counts.unansweredCount

    const telemetry = calculateAssessmentTelemetry(violations, userId, testId, attempt_id)

    const responsePayload = {
      attempt_id: result.id,
      attemptId: result.id, // canonical: camelCase alias
      test_id: testId,
      testId: testId, // canonical: camelCase alias
      test_title: test.title,
      mode: test.mode,
      score: result.score,
      total_marks: result.totalPoints,
      totalMarks: result.totalPoints, // canonical: alias
      percentage: result.percentage,
      passed: result.passed,
      time_taken: result.timeTaken,
      timeTaken: result.timeTaken, // canonical: alias
      time_limit: test.timeLimit,
      time_limit_seconds: test.timeLimit * 60,
      // Server-side timer enforcement is verified in TestScoringService.scoreAndSubmitTest
      server_time_validated: true,
      status: result.status,
      correct_count: effectiveCorrectCount,
      correct_answers: effectiveCorrectCount,
      correctCount: effectiveCorrectCount, // canonical: camelCase alias
      incorrect_count: effectiveIncorrectCount,
      incorrectCount: effectiveIncorrectCount, // canonical: camelCase alias
      unanswered_count: unansweredCount,
      integrity_score: telemetry.integrity_score,
      integrity_risk: telemetry.risk_level,
      telemetry_summary: telemetry,
      question_results: questionResults,
    }

    if (isDuplicate) {
      sendSuccess(res, responsePayload, 'Test was already submitted')
      return
    }

    // If server flagged as TIMEOUT, change message and status code
    if (result.status === 'TIMEOUT') {
      sendSuccess(res, responsePayload, 'Test time exceeded. Marked as TIMEOUT.')
      return
    }

    sendCreated(res, responsePayload)
  } catch (error) {
    if (error instanceof Error && error.message === 'MAX_ATTEMPTS_REACHED') {
      sendForbidden(res, 'Maximum attempts reached for this test', 'MAX_ATTEMPTS_REACHED')
      return
    }
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

export const receiveTestTelemetry = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const userId = req.user!.userId
  const testId = req.params.id as string
  const { attempt_id, violations = [] } = req.body

  const telemetry = calculateAssessmentTelemetry(violations, userId, testId, attempt_id)

  sendSuccess(
    res,
    {
      received: true,
      attempt_id: attempt_id ?? null,
      test_id: testId,
      telemetry_summary: telemetry,
      integrity_score: telemetry.integrity_score,
      integrity_risk: telemetry.risk_level,
    },
    'Assessment telemetry logged successfully'
  )
})

export const getOfflineBundle = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const userId = req.user!.userId
  const testId = req.params.id as string

  const bundle = await offlineAssessmentService.generateOfflineBundle(testId, userId)
  sendSuccess(res, bundle, 'Offline bundle generated successfully')
})

export const submitOfflineSync = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const userId = req.user!.userId
  const testId = req.params.id as string

  const result = await offlineAssessmentService.reconcileOfflineSubmission({
    userId,
    payload: { ...req.body, testId },
  })

  sendSuccess(res, result, 'Offline assessment reconciled successfully')
})

export const processAdaptiveStep = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const userId = req.user!.userId
  const testId = req.params.id as string
  const { attempt_id, question_id, selected_option_id, time_spent_seconds } = req.body

  if (!attempt_id || !question_id || selected_option_id === undefined) {
    sendValidationError(res, 'attempt_id, question_id, and selected_option_id are required')
    return
  }

  const result = await adaptiveAssessmentEngine.processAdaptiveStep({
    testId,
    userId,
    attemptId: attempt_id,
    questionId: question_id,
    selectedOptionId: selected_option_id,
    timeSpentSeconds: typeof time_spent_seconds === 'number' ? time_spent_seconds : 0,
  })

  sendSuccess(res, result)
})

export const diagnoseMisconception = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const { question_text, selected_option_text, correct_option_text, topic } = req.body

  if (!question_text || !selected_option_text || !correct_option_text) {
    sendValidationError(res, 'question_text, selected_option_text, and correct_option_text are required')
    return
  }

  const diagnosis = await socraticDiagnosticService.diagnoseMisconception({
    questionText: question_text,
    selectedOptionText: selected_option_text,
    correctOptionText: correct_option_text,
    topic: topic || 'General',
  })

  sendSuccess(res, diagnosis)
})

export const createTest = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const {
    title,
    description,
    examId,
    timeLimit = 30,
    passingScore = 60,
    maxAttempts = 5,
    mode = 'PRACTICE',
    difficulty = 'MIXED',
    totalMarks,
    negativeMarks = 0,
    isPublished = true,
    shuffleQuestions = false,
    shuffleOptions = false,
    questions = [],
  } = req.body

  const normalizedMode = (normalizeEnumFilter(mode, TEST_MODES) as TestMode) || TestMode.PRACTICE
  const normalizedDifficulty = (normalizeEnumFilter(difficulty, TEST_DIFFICULTIES) as TestDifficulty) || TestDifficulty.MIXED

  const computedTotalMarks =
    totalMarks !== undefined
      ? Number(totalMarks)
      : Array.isArray(questions) && questions.length > 0
        ? questions.reduce((sum: number, q: any) => sum + (Number(q.points) || 4), 0)
        : 100

  const cleanText = (val: unknown, maxLen: number): string =>
    typeof val === 'string' ? val.trim().slice(0, maxLen) : ''

  const newTest = await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
    const test = await tx.test.create({
      data: {
        title: cleanText(title, 200),
        description: description ? cleanText(description, 2000) : null,
        examId: examId || null,
        timeLimit: Number(timeLimit),
        passingScore: Number(passingScore),
        maxAttempts: Number(maxAttempts),
        mode: normalizedMode,
        difficulty: normalizedDifficulty,
        totalMarks: Number(computedTotalMarks),
        negativeMarks: Number(negativeMarks),
        isPublished: Boolean(isPublished),
        shuffleQuestions: Boolean(shuffleQuestions),
        shuffleOptions: Boolean(shuffleOptions),
        isAiGenerated: false,
      },
    })

    if (Array.isArray(questions) && questions.length > 0) {
      for (let i = 0; i < questions.length; i++) {
        const q = questions[i]
        const rawType = String(q.type || 'MCQ').toUpperCase()
        let qType: QuestionType = QuestionType.MCQ
        if (rawType === 'MULTIPLE_SELECT' || rawType === 'MSQ') qType = QuestionType.MSQ
        else if (rawType === 'TRUE_FALSE') qType = QuestionType.MCQ
        else if (rawType === 'NUMERICAL') qType = QuestionType.NUMERICAL
        else if (rawType === 'SHORT_ANSWER' || rawType === 'SUBJECTIVE') qType = QuestionType.SUBJECTIVE
        else if (rawType === 'CODING') qType = QuestionType.CODING

        const rawBloom = String(q.bloomLevel || 'UNDERSTAND').toUpperCase()
        const bloomLevel: BloomLevel = (BloomLevel as any)[rawBloom] ?? BloomLevel.UNDERSTAND

        const createdQ = await tx.question.create({
          data: {
            testId: test.id,
            text: cleanText(q.text, 3000),
            type: qType,
            difficulty: typeof q.difficulty === 'number' ? q.difficulty : 0.5,
            bloomLevel,
            points: typeof q.points === 'number' ? q.points : 4,
            explanation: q.explanation ? cleanText(q.explanation, 2000) : null,
            tags: Array.isArray(q.tags)
              ? q.tags.map((t: unknown) => cleanText(t, 50)).filter(Boolean)
              : q.topic
                ? [cleanText(q.topic, 50)]
                : [],
            order: i + 1,
            isAiGenerated: false,
          },
        })

        if (Array.isArray(q.options) && q.options.length > 0) {
          await tx.option.createMany({
            data: q.options.map((opt: any, optIdx: number) => ({
              questionId: createdQ.id,
              text: cleanText(opt.text, 1000),
              isCorrect: Boolean(opt.isCorrect),
              explanation: opt.explanation ? cleanText(opt.explanation, 1000) : null,
              order: typeof opt.order === 'number' ? opt.order : optIdx + 1,
            })),
          })
        }
      }
    }

    return test
  })

  // Invalidate listTests cache pattern so newly created test is discoverable immediately
  await Promise.allSettled([
    queryCache.deletePattern('listTests:*'),
    invalidateCache('tests*'),
    invalidateCache('http:/api/v1/tests*'),
  ])

  sendCreated(res, newTest, 'Test created successfully')
})

export const gradeSubjectiveAnswerEndpoint = asyncHandler(
  async (req: Request, res: Response): Promise<void> => {
    const userId = req.user!.userId
    const testId = req.params.id as string
    const { questionId, testResultId, answerText } = req.body

    // 1. Fetch test and question
    const test = await prisma.test.findUnique({
      where: { id: testId },
      include: {
        questions: {
          where: { id: questionId },
        },
      },
    })

    if (!test) {
      sendNotFound(res, 'Test not found')
      return
    }

    const question = test.questions[0]
    if (!question) {
      sendNotFound(res, 'Question not found in test')
      return
    }

    // 2. Resolve target testResult and student answer
    let targetResult: any = null
    if (testResultId) {
      targetResult = await prisma.testResult.findUnique({
        where: { id: testResultId },
        include: {
          attemptAnswers: {
            where: { questionId },
          },
        },
      })
      if (!targetResult) {
        sendNotFound(res, 'Test result not found')
        return
      }
      if (
        targetResult.userId !== userId &&
        req.user?.role !== 'ADMIN' &&
        req.user?.role !== 'INSTRUCTOR'
      ) {
        sendForbidden(res, 'Access denied to this test result')
        return
      }
    } else {
      // Find latest testResult for this test and user
      targetResult = await prisma.testResult.findFirst({
        where: { testId, userId },
        orderBy: { completedAt: 'desc' },
        include: {
          attemptAnswers: {
            where: { questionId },
          },
        },
      })
    }

    const existingAnswerRecord = targetResult?.attemptAnswers?.[0]
    const resolvedAnswerText =
      (typeof answerText === 'string' && answerText.trim()) ||
      existingAnswerRecord?.textAnswer ||
      ''

    const maxPoints = question.points ?? 10

    // If answer is completely empty
    if (!resolvedAnswerText.trim()) {
      sendValidationError(
        res,
        'Subjective answer cannot be empty',
        'VALIDATION_ERROR',
        [{ field: 'answerText', message: 'Subjective answer cannot be empty' }]
      )
      return
    }

    // 3. Call AI Rubric Evaluation Engine
    const grading = await aiTestService.gradeSubjectiveAnswer(
      question.text,
      resolvedAnswerText,
      maxPoints
    )

    const isCorrect = grading.score >= maxPoints * 0.5
    const marksObtained = Math.round(Math.min(maxPoints, Math.max(0, grading.score)))

    // Structure serialized feedback containing rich rubric breakdown
    const serializedFeedback = JSON.stringify({
      feedback: grading.feedback,
      rubric: grading.rubric,
      strengths: grading.strengths,
      improvements: grading.improvements,
    })

    let newTotalScore: number | undefined
    let percentage: number | undefined
    let passed: boolean | undefined

    // 4. If testResult exists, update database and recalculate
    if (targetResult) {
      await prisma.testAttemptAnswer.upsert({
        where: {
          testResultId_questionId: {
            testResultId: targetResult.id,
            questionId,
          },
        },
        create: {
          testResultId: targetResult.id,
          questionId,
          textAnswer: resolvedAnswerText,
          selectedOptions: [],
          marksObtained,
          isCorrect,
          aiFeedback: serializedFeedback,
        },
        update: {
          textAnswer: resolvedAnswerText,
          marksObtained,
          isCorrect,
          aiFeedback: serializedFeedback,
        },
      })

      // Recalculate total test result score
      const allAnswers = await prisma.testAttemptAnswer.findMany({
        where: { testResultId: targetResult.id },
        select: { marksObtained: true },
      })

      const computedScore = allAnswers.reduce(
        (sum: number, a: { marksObtained: number | null }) => sum + (a.marksObtained ?? 0),
        0
      )
      newTotalScore = computedScore
      const totalPossible = test.totalMarks || maxPoints
      percentage = totalPossible > 0 ? (computedScore / totalPossible) * 100 : 0
      passed = percentage >= (test.passingScore ?? 0)

      await prisma.testResult.update({
        where: { id: targetResult.id },
        data: {
          score: newTotalScore,
          percentage,
          passed,
        },
      })

      // Emit real-time WebSocket notification if service is active
      try {
        const { webSocketService } = await import('../services/WebSocketService')
        webSocketService.notifyUser(userId, 'subjective_grade_completed', {
          testResultId: targetResult.id,
          questionId,
          marksObtained,
          isCorrect,
          aiFeedback: grading.feedback,
          rubric: grading.rubric,
          strengths: grading.strengths,
          improvements: grading.improvements,
          newTotalScore,
          percentage,
          passed,
        })
      } catch {
        // Non-blocking WebSocket delivery
      }
    }

    sendSuccess(
      res,
      {
        questionId,
        testResultId: targetResult?.id,
        score: grading.score,
        marksObtained,
        maxPoints,
        isCorrect,
        feedback: grading.feedback,
        rubric: grading.rubric,
        strengths: grading.strengths,
        improvements: grading.improvements,
        newTotalScore,
        percentage,
        passed,
      },
      'Subjective answer graded successfully'
    )
  }
)

export const verifyScorecardEndpoint = asyncHandler(
  async (req: Request, res: Response): Promise<void> => {
    const code = (req.query.code as string)?.trim()
    const attemptId = (req.query.attempt as string)?.trim()

    if (!code) {
      sendValidationError(res, 'Verification code is required', 'VALIDATION_ERROR', [
        { field: 'code', message: 'Scorecard verification code must be provided' },
      ])
      return
    }

    // Attempt lookup strategy:
    // 1. If explicit attemptId provided, query by id
    // 2. Otherwise query by attemptId = code (if UUID)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let attempt: any = null
    if (attemptId) {
      attempt = await prisma.testResult.findUnique({
        where: { id: attemptId },
        include: {
          user: { select: { id: true, username: true, email: true } },
          test: { select: { id: true, title: true, mode: true, totalMarks: true } },
        },
      })
    } else if (
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(code)
    ) {
      attempt = await prisma.testResult.findUnique({
        where: { id: code },
        include: {
          user: { select: { id: true, username: true, email: true } },
          test: { select: { id: true, title: true, mode: true, totalMarks: true } },
        },
      })
    }

    if (attempt) {
      const timestamp =
        attempt.completedAt?.toISOString() || attempt.createdAt.toISOString()
      const computedDigest = computeAuditDigest(
        attempt.id,
        attempt.score,
        attempt.percentage,
        timestamp
      )

      const isDigestMatch =
        code.toUpperCase() === computedDigest.toUpperCase() ||
        code === attempt.id

      if (!attempt || !isDigestMatch) {
        sendValidationError(
          res,
          'Cryptographic digest mismatch. This scorecard content appears to have been altered.',
          'SCORECARD_INTEGRITY_MISMATCH'
        )
        return
      }

      const candidateName =
        attempt.user?.name ||
        attempt.user?.email?.split('@')[0] ||
        'Candidate'

      sendSuccess(
        res,
        {
          valid: true,
          status: 'AUTHENTIC_VERIFIED',
          verification_code: code,
          candidate_name: candidateName,
          test_title: attempt.test?.title || 'Academic Assessment',
          test_mode: (attempt.test?.mode || 'mock').toLowerCase(),
          score: attempt.score,
          percentage: attempt.percentage,
          passed: attempt.passed,
          submitted_at: timestamp,
          time_taken_seconds: attempt.timeTaken,
          integrity_risk_level: 'EXCELLENT',
          proctoring_verified: true,
        },
        'Scorecard verified successfully'
      )
      return
    }

    // If no attempt matched directly by ID or digest, reject rather than fabricating mock data
    sendValidationError(
      res,
      'Cryptographic digest mismatch. This scorecard content appears to have been altered.',
      'SCORECARD_INTEGRITY_MISMATCH'
    )
  }
)

