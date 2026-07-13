import { Request, Response } from 'express'
import { prisma } from '../prismaClient'
import { asyncHandler } from '../utils/errorHandler'
import { sendSuccess, sendNotFound } from '../utils/responseHelper'
import { getPaginationParams, createPaginatedResponse } from '../utils/pagination'
import { cacheService } from '../services/CacheService'
import { Prisma } from '@prisma/client'
import logger from '../utils/logger'
import { CodeSandboxService } from '../services/CodeSandboxService'
import { growthEngineService } from '../services/GrowthEngineService'
export const listProblems = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const { difficulty, search, status } = req.query
  const { page, limit, skip } = getPaginationParams(req.query)
  const userId = req.user?.userId

  // Redis Cache Implementation
  const cacheKey = cacheService.generateKey(
    'problems',
    JSON.stringify({ difficulty, search, status, page, limit, userId: userId || 'anonymous' })
  )
  const cachedData = await cacheService.get<any>(cacheKey)

  if (cachedData) {
    sendSuccess(res, cachedData.data, undefined, 200, cachedData.meta)
    return
  }

  const where: Prisma.ProblemWhereInput = { deletedAt: null }

  if (difficulty && difficulty !== 'ALL') {
    where.difficulty = difficulty as any
  }

  if (search && typeof search === 'string') {
    where.OR = [
      { title: { contains: search, mode: 'insensitive' } },
      { description: { contains: search, mode: 'insensitive' } },
      { category: { contains: search, mode: 'insensitive' } },
    ]
  }

  if (status && status !== 'ALL' && userId) {
    if (status === 'SOLVED') {
      where.submissions = { some: { userId, status: 'ACCEPTED' } }
    } else if (status === 'ATTEMPTED') {
      where.submissions = { some: { userId } }
    } else if (status === 'UNATTEMPTED') {
      where.submissions = { none: { userId } }
    }
  }

  const [total, problems] = await prisma.$transaction([
    prisma.problem.count({ where }),
    prisma.problem.findMany({
      where,
      skip,
      take: limit,
      orderBy: { points: 'asc' },
    }),
  ])

  // Attach user status if authenticated
  let mappedProblems = problems as any[]
  if (userId) {
    const userSubmissions = await prisma.problemSubmission.findMany({
      where: { userId, problemId: { in: problems.map((p: any) => p.id) } },
      select: { problemId: true, status: true },
    })

    mappedProblems = problems.map((p: any) => {
      const submissionsForProblem = userSubmissions.filter((s: any) => s.problemId === p.id)
      let user_status = 'UNATTEMPTED'
      if (submissionsForProblem.some((s: any) => s.status === 'ACCEPTED')) {
        user_status = 'SOLVED'
      } else if (submissionsForProblem.length > 0) {
        user_status = 'ATTEMPTED'
      }
      return { ...p, user_status }
    })
  } else {
    mappedProblems = problems.map((p: any) => ({ ...p, user_status: 'UNATTEMPTED' }))
  }

  const paginatedResult = createPaginatedResponse(mappedProblems, total, page, limit)

  await cacheService.set(cacheKey, { data: paginatedResult.data, meta: paginatedResult.meta }, 300) // Cache for 5 mins

  sendSuccess(res, paginatedResult.data, undefined, 200, paginatedResult.meta)
})

export const getProblem = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const slug = req.params.slug as string

  const cacheKey = cacheService.generateKey('problem', slug)
  const cachedData = await cacheService.get<any>(cacheKey)

  if (cachedData) {
    sendSuccess(res, cachedData)
    return
  }

  const problem = await prisma.problem.findUnique({
    where: { slug, deletedAt: null },
    select: {
      id: true,
      slug: true,
      title: true,
      description: true,
      difficulty: true,
      category: true,
      tags: true,
      points: true,
      starterCode: true,
      createdAt: true,
      updatedAt: true,
    },
  })

  if (!problem) {
    sendNotFound(res, 'Problem not found')
    return
  }

  await cacheService.set(cacheKey, problem, 600) // Cache for 10 mins
  sendSuccess(res, problem)
})

export const submitSolution = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const problemId = req.params.id as string
  const { code, language } = req.body
  const userId = req.user!.userId

  const problem = await prisma.problem.findUnique({ where: { id: problemId } })
  if (!problem) {
    sendNotFound(res, 'Problem not found')
    return
  }

  let testCases = []
  if (problem.testCases) {
    try {
      testCases = JSON.parse(problem.testCases)
    } catch (e) {
      logger.error(
        `Failed to parse test cases for problem ${problemId}`,
        e instanceof Error ? e : new Error(String(e))
      )
    }
  }

  if (!Array.isArray(testCases) || testCases.length === 0) {
    // Graceful fallback if no test cases defined, just run execution and assume passing if no error
    testCases = [{ input: '', output: '' }]
  }

  const executionResult = await CodeSandboxService.execute({
    code,
    language,
    testCases,
    timeLimit: 5,
    memoryLimit: 256,
  })

  const status =
    executionResult.status === 'accepted'
      ? 'ACCEPTED'
      : executionResult.status === 'wrong_answer'
        ? 'WRONG_ANSWER'
        : executionResult.status === 'compilation_error'
          ? 'COMPILATION_ERROR'
          : executionResult.status === 'time_limit_exceeded'
            ? 'TIME_LIMIT_EXCEEDED'
            : 'RUNTIME_ERROR'

  const executionTime = executionResult.executionTime
  const memoryUsed = executionResult.memoryUsed
  const score =
    status === 'ACCEPTED'
      ? problem.points
      : Math.floor(
          problem.points * (executionResult.testCasesPassed / executionResult.testCasesTotal)
        )

  const result = await prisma.$transaction(async (tx: any) => {
    const submission = await tx.problemSubmission.create({
      data: {
        problemId,
        userId,
        code,
        language,
        status,
        score,
        executionTime,
        memoryUsed,
      },
    })

    if (status === 'ACCEPTED') {
      await growthEngineService.awardXP(userId, 'practice_session', tx)
    }

    return submission
  })

  await cacheService.deletePattern('problems*')
  await cacheService.delete(`dsaStats:${userId}`)

  sendSuccess(res, result)
})

export const getSubmissions = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const problemId = req.params.id as string
  const userId = req.user!.userId

  const submissions = await prisma.problemSubmission.findMany({
    where: { problemId, userId },
    orderBy: { submittedAt: 'desc' },
  })

  sendSuccess(res, submissions)
})
