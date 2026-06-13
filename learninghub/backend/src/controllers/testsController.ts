import { Request, Response } from 'express'
import { prisma } from '../prismaClient'
import { getPaginationParams, createPaginatedResponse } from '../utils/pagination'
import logger from '../utils/logger'
import { Prisma } from '@prisma/client'
import {
  sendSuccess,
  sendCreated,
  sendUnauthorized,
  sendNotFound,
  sendValidationError,
  sendForbidden,
  sendInternalError,
  sendError,
} from '../utils/responseHelper'
import { parseJsonArray, parseJsonObject } from '../utils/json'
import { testScoringService } from '../services/TestScoringService'
import { cacheService as queryCache } from '../services/CacheService'

import {
  mapQuestionSafe,
  TEST_MODES,
  TEST_DIFFICULTIES,
  normalizeEnumFilter,
  getRemainingSeconds,
  hasSubmittedAnswer,
  countQuestionResults,
} from '../utils/testsHelper'

export const listTests = async (req: Request, res: Response): Promise<void> => {
  try {
    const { courseId, examId, countryId, exam, country, mode, difficulty, search } = req.query
    const { page, limit, skip } = getPaginationParams(req.query)
    const userId = req.user?.userId

    const cacheKey = queryCache.generateKey('listTests', JSON.stringify({ ...req.query, userId }))
    const cachedResponse = await queryCache.get(cacheKey)
    if (cachedResponse) {
      const { data, meta } = cachedResponse as any
      sendSuccess(res, data, undefined, 200, meta)
      return
    }

    const filters: Prisma.TestWhereInput = { isPublished: true }
    if (courseId) filters.courseId = courseId as string

    const modeFilter = normalizeEnumFilter(mode, TEST_MODES)
    if (modeFilter) filters.mode = modeFilter as any

    const difficultyFilter = normalizeEnumFilter(difficulty, TEST_DIFFICULTIES)
    if (difficultyFilter) filters.difficulty = difficultyFilter as any

    if (typeof search === 'string' && search.trim()) {
      const query = search.trim()
      filters.OR = [
        { title: { contains: query, mode: 'insensitive' } },
        { description: { contains: query, mode: 'insensitive' } },
      ]
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
      exam_id: t.examId,
      exam_name: t.exam?.name ?? '',
      exam_code: t.exam?.slug ?? '',
      country_id: t.exam?.country?.id ?? '',
      country_name: t.exam?.country?.name ?? '',
      country_code: t.exam?.country?.code ?? '',
      course_id: t.courseId,
      course_title: t.course?.title ?? 'General',
      time_limit: t.timeLimit,
      time_limit_minutes: t.timeLimit,
      passing_score: t.passingScore,
      total_questions: t._count.questions,
      question_count: t._count.questions,
      max_attempts: 3,
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

    // Cache the response for 60 seconds to avoid hitting DB continuously for same list queries
    await queryCache.set(cacheKey, { data: paginated.data, meta: paginated.meta }, 60)

    sendSuccess(res, paginated.data, undefined, 200, paginated.meta)
  } catch (error) {
    logger.error(
      '[TestsController] listTests error',
      error instanceof Error ? error : new Error(String(error))
    )
    sendInternalError(res)
  }
}

export const getTestDetails = async (req: Request, res: Response): Promise<void> => {
  try {
    const id = req.params.id as string

    const cacheKey = queryCache.generateKey('getTestDetails', id)
    const cachedTest = await queryCache.get(cacheKey)
    if (cachedTest) {
      sendSuccess(res, { quiz: cachedTest })
      return
    }

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
      sendNotFound(res, 'Test not found')
      return
    }

    const quizData = {
      id: test.id,
      title: test.title,
      description: test.description,
      course_id: test.courseId,
      course_title: test.course?.title ?? 'General',
      time_limit: test.timeLimit,
      passing_score: test.passingScore,
      total_questions: test._count.questions,
      mode: test.mode,
      difficulty: test.difficulty,
      total_marks: test.totalMarks,
      negative_marks: test.negativeMarks,
      is_ai_generated: test.isAiGenerated,
    }

    // Cache test details for 5 minutes
    await queryCache.set(cacheKey, quizData, 300)

    sendSuccess(res, { quiz: quizData })
  } catch (error) {
    logger.error(
      '[TestsController] getTestDetails error',
      error instanceof Error ? error : new Error(String(error))
    )
    sendInternalError(res)
  }
}

export const startTest = async (req: Request, res: Response): Promise<void> => {
  try {
    const testId = req.params.id as string
    const userId = req.user?.userId
    if (!userId) {
      sendUnauthorized(res)
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
        answers: true,
        startedAt: true,
      },
    })

    if (existingResult) {
      const questions = test.questions.map(mapQuestionSafe)
      const answers = parseJsonObject(existingResult.answers)
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

    // Enforce max attempts (configurable, default 3)
    const MAX_ATTEMPTS = parseInt(process.env.MAX_TEST_ATTEMPTS ?? '3', 10)
    if (maxAttemptResult && maxAttemptResult.attemptNumber >= MAX_ATTEMPTS) {
      sendForbidden(
        res,
        `Maximum attempts (${MAX_ATTEMPTS}) reached for this test`,
        'MAX_ATTEMPTS_REACHED'
      )
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
        answers: {},
        attemptNumber: nextAttemptNumber,
      },
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
  } catch (error) {
    logger.error('StartTest error', error instanceof Error ? error : new Error(String(error)), {
      testId: req.params.id,
      userId: req.user?.userId,
    })
    sendInternalError(res)
  }
}

export const getTestAttempts = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.user?.userId
    if (!userId) {
      sendUnauthorized(res)
      return
    }

    const attempts = await prisma.testResult.findMany({
      where: { userId },
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
            questions: {
              select: { id: true },
            },
          },
        },
      },
      orderBy: { startedAt: 'desc' },
    })

    const transformedAttempts = attempts.map(attempt => {
      const answers = parseJsonObject(attempt.answers)

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

    const totalXp = attempts.reduce((sum, a) => sum + (a.passed ? Math.round(a.score) : 0), 0)

    sendSuccess(res, { results: transformedAttempts, totalXp })
  } catch (error) {
    logger.error(
      '[TestsController] getTestAttempts error',
      error instanceof Error ? error : new Error(String(error))
    )
    sendInternalError(res)
  }
}

export const getTestResults = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.user?.userId
    const testId = req.params.id as string

    if (!userId) {
      sendUnauthorized(res)
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
      sendNotFound(res, 'No results found')
      return
    }

    const qr = parseJsonArray<any>(mostRecent.questionResults)
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
  } catch (error) {
    logger.error(
      '[TestsController] getTestResults error',
      error instanceof Error ? error : new Error(String(error)),
      { testId: req.params.id, userId: req.user?.userId }
    )
    sendInternalError(res)
  }
}

export const getTestAttemptDetails = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.user?.userId
    const attemptId = req.params.id as string

    if (!userId) {
      sendUnauthorized(res)
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
      sendNotFound(res, 'Attempt not found')
      return
    }

    if (attempt.userId !== userId) {
      sendForbidden(res, 'Access denied')
      return
    }

    const isCompleted = attempt.status === 'COMPLETED'
    const attemptAnswers = parseJsonObject(attempt.answers)

    // For completed tests, fetch correct answers for review
    // For in-progress tests, do NOT expose correct options
    const questions = attempt.test.questions.map(q => {
      const correctOption = isCompleted ? q.options.find(o => (o as any).isCorrect) : null
      const userAnswer = attemptAnswers[q.id]
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

    sendSuccess(res, {
      ...attempt,
      answers: attemptAnswers,
      question_results: questions,
    })
  } catch (error) {
    logger.error(
      '[TestsController] getTestAttemptDetails error',
      error instanceof Error ? error : new Error(String(error))
    )
    sendInternalError(res)
  }
}

export const autosaveTest = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.user?.userId
    const testId = req.params.id as string
    const { answers, attempt_id } = req.body

    if (!userId) {
      sendUnauthorized(res)
      return
    }

    if (!answers || typeof answers !== 'object') {
      sendValidationError(res, 'Answers are required and must be an object')
      return
    }

    if (attempt_id && typeof attempt_id !== 'string') {
      sendValidationError(res, 'attempt_id must be a string')
      return
    }

    const result = await prisma.$transaction(async tx => {
      const attempt = await tx.testResult.findFirst({
        where: attempt_id
          ? { id: attempt_id, userId, testId, status: 'IN_PROGRESS' }
          : { userId, testId, status: 'IN_PROGRESS' },
        orderBy: { attemptNumber: 'desc' },
        select: { id: true, answers: true },
      })

      if (!attempt) {
        return null
      }

      const existingAnswers = parseJsonObject(attempt.answers)
      const mergedAnswers = { ...existingAnswers, ...answers }

      await tx.testResult.update({
        where: { id: attempt.id },
        data: { answers: mergedAnswers as any },
      })
      return Object.keys(answers).length
    })

    if (result === null) {
      sendNotFound(res, 'No active test attempt found')
      return
    }

    sendSuccess(res, { saved_count: result }, 'Answer autosaved')
  } catch (error) {
    logger.error(
      '[TestsController] autosaveTest error',
      error instanceof Error ? error : new Error(String(error)),
      { testId: req.params.id, userId: req.user?.userId }
    )
    sendInternalError(res, 'Autosave failed')
  }
}

export const submitTest = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.user?.userId
    if (!userId) {
      sendUnauthorized(res)
      return
    }
    const testId = req.params.id as string
    const { answers, timeTaken, attempt_id, confidences } = req.body

    if (!answers || typeof answers !== 'object') {
      sendValidationError(res, 'Answers are required')
      return
    }

    const { result, test, isDuplicate, correctCount, incorrectCount } =
      await testScoringService.scoreAndSubmitTest({
        userId,
        testId,
        answers,
        timeTaken,
        attemptId: attempt_id,
        confidences,
      })

    const questionResults = parseJsonArray<any>(result.questionResults)
    const { unansweredCount } = countQuestionResults(questionResults, test.questions.length)
    const effectiveCorrectCount =
      correctCount ?? countQuestionResults(questionResults, test.questions.length).correctCount
    const effectiveIncorrectCount =
      incorrectCount ?? countQuestionResults(questionResults, test.questions.length).incorrectCount

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
    logger.error(
      '[TestsController] submitTest error',
      error instanceof Error ? error : new Error(String(error)),
      { testId: req.params.id, userId: req.user?.userId }
    )

    if (
      error instanceof Error &&
      (error.message === 'Test not found' || error.message === 'Attempt not found')
    ) {
      sendNotFound(res, error.message)
      return
    }

    console.error('SUBMIT TEST ERROR:', error)
    sendError(res, error instanceof Error ? error.message : 'Internal server error', 500)
  }
}
