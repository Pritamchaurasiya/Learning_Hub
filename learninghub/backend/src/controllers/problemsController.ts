import { Request, Response } from 'express'
import { prisma } from '../prismaClient'
import { getPaginationParams, createPaginatedResponse } from '../utils/pagination'
import logger from '../utils/logger'
import { Prisma } from '@prisma/client'

/**
 * Transform Prisma Problem to frontend format
 */

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function transformProblem(problem: any, userId?: string): Record<string, any> {
  // Parse tags from comma-separated string to array of objects
  const tagsArray = problem.tags
    ? problem.tags.split(',').map((t: string, idx: number) => ({
        id: String(idx),
        name: t.trim(),
      }))
    : []

  // Parse starterCode JSON if it exists, otherwise default
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

  // Parse testCases JSON for examples
  let examples: { input: string; output: string; explanation?: string }[] = []
  try {
    if (problem.testCases) {
      const parsed = JSON.parse(problem.testCases)
      if (Array.isArray(parsed)) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        examples = parsed.map((tc: any) => ({
          input: tc.input ?? '',
          output: tc.output ?? '',
          explanation: tc.explanation,
        }))
      }
    }
  } catch {
    examples = []
  }

  // Compute submission stats
  const totalSubmissions = problem._count?.submissions ?? 0
  const acceptedCount = problem._acceptedCount ?? 0

  // Determine user's status
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
    total_submissions: totalSubmissions, // Alias for frontend compatibility
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

    res.json(createPaginatedResponse(transformed, total, page, limit))
  } catch (error) {
    logger.error(
      '[ProblemsController] listProblems error',
      error instanceof Error ? error : new Error(String(error))
    )
    res.status(500).json({ status: 'error', message: 'Internal server error' })
  }
}

export const getProblemDetails = async (req: Request, res: Response): Promise<void> => {
  try {
    const id = req.params.id as string
    const userId = req.user?.userId

    const problem = await prisma.problem.findUnique({
      where: { id },
      include: {
        _count: { select: { submissions: true } },
      },
    })

    if (!problem) {
      res.status(404).json({ status: 'error', message: 'Problem not found' })
      return
    }

    const transformed = transformProblem(problem, userId)
    res.json({ status: 'success', data: transformed })
  } catch (error) {
    logger.error(
      '[ProblemsController] getProblemDetails error',
      error instanceof Error ? error : new Error(String(error)),
      {
        problemId: req.params.id,
      }
    )
    res.status(500).json({ status: 'error', message: 'Internal server error' })
  }
}

export const submitProblemSolution = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.user?.userId
    if (!userId) {
      res.status(401).json({ status: 'error', message: 'Authentication required' })
      return
    }
    const problemId = req.params.id as string
    const { code, language } = req.body

    // Validate required fields
    if (!code || typeof code !== 'string' || code.trim().length === 0) {
      res.status(400).json({ status: 'error', message: 'Code submission is required' })
      return
    }

    // Verify problem exists
    const problem = await prisma.problem.findUnique({
      where: { id: problemId },
      select: { id: true, title: true, testCases: true },
    })
    if (!problem) {
      res.status(404).json({ status: 'error', message: 'Problem not found' })
      return
    }

    // Rate limiting: prevent spam submissions (10-second window)
    const recentSubmissions = await prisma.problemSubmission.count({
      where: {
        userId,
        problemId,
        submittedAt: { gte: new Date(Date.now() - 10000) },
      },
    })
    if (recentSubmissions >= 5) {
      res.status(429).json({
        status: 'error',
        message: 'Too many submissions. Please wait before trying again.',
      })
      return
    }

    // Execute code through sandbox service
    const { CodeSandboxService } = await import('../services/CodeSandboxService')
    const executionResult = await CodeSandboxService.execute({
      code,
      language: language ?? 'javascript',
      testCases: problem.testCases ? JSON.parse(problem.testCases) : [],
      timeLimit: 2000, // 2 seconds
      memoryLimit: 256 * 1024, // 256MB
    })

    // Create submission record
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

    // Award XP for accepted solutions
    if (executionResult.status === 'accepted') {
      await prisma.user.update({
        where: { id: userId },
        data: { xp: { increment: 50 } },
      })

      if (req.io) {
        req.io.emit('ranking_update', { userId, xpEarned: 50 })
      }
    }

    res.json({
      status: 'success',
      data: {
        submissionId: submission.id,
        status: executionResult.status,
        time: `${executionResult.executionTime}ms`,
        memory: `${executionResult.memoryUsed}KB`,
        message: executionResult.message,
        testCasesPassed: executionResult.testCasesPassed,
        testCasesTotal: executionResult.testCasesTotal,
      },
    })
  } catch (error) {
    logger.error(
      '[ProblemsController] submitSolution error',
      error instanceof Error ? error : new Error(String(error)),
      {
        userId: req.user?.userId,
        problemId: req.params.id,
      }
    )
    res.status(500).json({ status: 'error', message: 'Internal server error' })
  }
}
