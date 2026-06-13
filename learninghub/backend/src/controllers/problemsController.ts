import { Request, Response } from 'express'
import { prisma } from '../prismaClient'
import { getPaginationParams, createPaginatedResponse } from '../utils/pagination'
import logger from '../utils/logger'
import { Prisma } from '@prisma/client'
import { cacheService } from '../services/CacheService'
import {
  sendSuccess,
  sendUnauthorized,
  sendError,
  sendNotFound,
  sendInternalError,
} from '../utils/responseHelper'

interface ProblemWithCounts {
  id: string
  title: string
  slug?: string | null
  difficulty?: string | null
  category?: string | null
  description?: string | null
  tags?: string[] | string | null
  starterCode?: string | null
  testCases?: string | null
  points?: number | null
  _count?: { submissions: number }
  _acceptedCount?: number
  userSubmissionStatus?: string | null
}

function transformProblem(problem: ProblemWithCounts, userId?: string): Record<string, unknown> {
  const tagsArray = Array.isArray(problem.tags)
    ? problem.tags.map((t: string, idx: number) => ({ id: String(idx), name: t.trim() }))
    : typeof problem.tags === 'string'
      ? problem.tags.split(',').map((t: string, idx: number) => ({
          id: String(idx),
          name: t.trim(),
        }))
      : []

  let starterCode = []
  try {
    if (problem.starterCode) {
      starterCode = JSON.parse(problem.starterCode)
    } else {
      starterCode = [
        { language: 'python', code: '# Write your solution here\n' },
        { language: 'javascript', code: '// Write your solution here\n' },
        { language: 'java', code: '// Write your solution here\npublic class Solution {\n}' },
      ]
    }
  } catch {
    starterCode = []
  }

  let examples: { input: string; output: string; explanation?: string }[] = []
  try {
    if (problem.testCases) {
      const parsed = JSON.parse(problem.testCases)
      if (Array.isArray(parsed)) {
        examples = parsed.map((tc: { input?: string; output?: string; explanation?: string }) => ({
          input: tc.input ?? '',
          output: tc.output ?? '',
          explanation: tc.explanation,
        }))
      }
    }
  } catch {
    examples = []
  }

  const totalSubmissions = problem._count?.submissions ?? 0
  const acceptedCount = problem._acceptedCount ?? 0

  let user_status: 'SOLVED' | 'ATTEMPTED' | 'UNATTEMPTED' = 'UNATTEMPTED'
  if (userId && problem.userSubmissionStatus) {
    user_status = problem.userSubmissionStatus === 'accepted' ? 'SOLVED' : 'ATTEMPTED'
  }

  return {
    id: problem.id,
    title: problem.title,
    slug:
      problem.slug ??
      problem.title
        .toLowerCase()
        .replace(/\s+/g, '-')
        .replace(/[^a-z0-9-]/g, ''),
    difficulty: (problem.difficulty ?? 'medium').toLowerCase() as 'easy' | 'medium' | 'hard',
    category: problem.category ?? '',
    description: problem.description ?? '',
    examples,
    constraints: [],
    starter_code: starterCode,
    acceptance_rate: totalSubmissions > 0 ? (acceptedCount / totalSubmissions) * 100 : 0,
    submission_count: totalSubmissions,
    total_submissions: totalSubmissions,
    solved_count: acceptedCount,
    user_status,
    tags: tagsArray,
    points: problem.points ?? 100,
  }
}

export const listProblems = async (req: Request, res: Response): Promise<void> => {
  try {
    const { difficulty, category } = req.query
    const { page, limit, skip } = getPaginationParams(req.query)
    const userId = req.user?.userId

    const filters: Prisma.ProblemWhereInput = {}
    if (difficulty) filters.difficulty = difficulty as string
    if (category) filters.category = category as string

    const cacheKey = cacheService.generateKey(
      'problems_list',
      JSON.stringify({ filters, page, limit })
    )
    const cachedData = await cacheService.get<any>(cacheKey)
    if (cachedData) {
      sendSuccess(res, cachedData.data, undefined, 200, cachedData.meta)
      return
    }

    const [total, problems] = await Promise.all([
      prisma.problem.count({ where: filters }),
      prisma.problem.findMany({
        where: filters,
        skip,
        take: limit,
        include: {
          _count: { select: { submissions: true } },
        },
        orderBy: { createdAt: 'desc' },
      }),
    ])

    const transformed = problems.map(p => transformProblem(p, userId))
    const responseData = createPaginatedResponse(transformed, total, page, limit)

    await cacheService.set(cacheKey, responseData, 300)

    sendSuccess(res, responseData.data, undefined, 200, responseData.meta)
  } catch (error) {
    logger.error(
      '[ProblemsController] listProblems error',
      error instanceof Error ? error : new Error(String(error))
    )
    sendInternalError(res)
  }
}

export const getProblemDetails = async (req: Request, res: Response): Promise<void> => {
  try {
    const slugOrId = (req.params.slug ?? req.params.id) as string
    const userId = req.user?.userId

    const problem = await prisma.problem.findFirst({
      where: {
        OR: [{ id: slugOrId }, { slug: slugOrId }],
      },
      include: {
        _count: { select: { submissions: true } },
      },
    })

    if (!problem) {
      sendNotFound(res, 'Problem not found')
      return
    }

    const transformed = transformProblem(problem, userId)
    sendSuccess(res, transformed)
  } catch (error) {
    logger.error(
      '[ProblemsController] getProblemDetails error',
      error instanceof Error ? error : new Error(String(error)),
      { slug: req.params.slug ?? req.params.id }
    )
    sendInternalError(res)
  }
}

export const submitProblemSolution = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.user?.userId
    if (!userId) {
      sendUnauthorized(res)
      return
    }
    const problemId = req.params.id as string
    const { code, language } = req.body

    if (!code || typeof code !== 'string' || code.trim().length === 0) {
      sendError(res, 'Code submission is required', 400, 'VALIDATION_ERROR')
      return
    }

    const problem = await prisma.problem.findUnique({
      where: { id: problemId },
      select: { id: true, title: true, testCases: true },
    })
    if (!problem) {
      sendNotFound(res, 'Problem not found')
      return
    }

    const { CodeSandboxService } = await import('../services/CodeSandboxService')
    const executionResult = await CodeSandboxService.execute({
      code,
      language: language ?? 'javascript',
      testCases: problem.testCases ? JSON.parse(problem.testCases) : [],
      timeLimit: 2000,
      memoryLimit: 256 * 1024,
    })

    const submission = await prisma.problemSubmission.create({
      data: {
        userId,
        problemId,
        code,
        language: language ?? 'javascript',
        status: executionResult.status,
        executionTime: executionResult.executionTime,
        memoryUsed: executionResult.memoryUsed,
      },
    })

    if (executionResult.status === 'accepted') {
      await prisma.user.update({
        where: { id: userId },
        data: { xp: { increment: 50 } },
      })

      if (req.io) {
        req.io.emit('ranking_update', { userId, xpEarned: 50 })
      }
    }

    sendSuccess(res, {
      submissionId: submission.id,
      status: executionResult.status,
      time: `${executionResult.executionTime}ms`,
      memory: `${executionResult.memoryUsed}KB`,
      message: executionResult.message,
      testCasesPassed: executionResult.testCasesPassed,
      testCasesTotal: executionResult.testCasesTotal,
    })
  } catch (error) {
    logger.error(
      '[ProblemsController] submitSolution error',
      error instanceof Error ? error : new Error(String(error)),
      { userId: req.user?.userId, problemId: req.params.id }
    )
    sendInternalError(res)
  }
}

export const getProblemSubmissions = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.user?.userId
    if (!userId) {
      sendUnauthorized(res)
      return
    }
    const problemId = req.params.id as string
    const submissions = await prisma.problemSubmission.findMany({
      where: { problemId, userId },
      orderBy: { submittedAt: 'desc' },
      take: 50,
    })
    sendSuccess(res, submissions)
  } catch (error) {
    logger.error(
      '[ProblemsController] getSubmissions error',
      error instanceof Error ? error : new Error(String(error))
    )
    sendInternalError(res)
  }
}
