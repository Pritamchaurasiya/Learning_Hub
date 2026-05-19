import { Request, Response } from 'express'
import { prisma } from '../config/database'
import logger from '../utils/logger'
import { z } from 'zod'

const createContestSchema = z.object({
  title: z.string().min(3).max(100),
  slug: z
    .string()
    .min(3)
    .max(100)
    .regex(/^[a-z0-9-]+$/),
  description: z.string().max(500).optional(),
  type: z.enum(['WEEKLY', 'MONTHLY', 'SPECIAL', 'PRACTICE']).default('WEEKLY'),
  difficulty: z.enum(['EASY', 'MEDIUM', 'HARD', 'EXPERT']).default('MEDIUM'),
  startTime: z.string().datetime(),
  endTime: z.string().datetime(),
  duration: z.number().int().positive(),
  prize: z.string().max(200).optional(),
  rules: z.string().optional(),
  problemIds: z.array(z.string().uuid()).min(1),
  isPublished: z.boolean().default(false),
})

const joinContestSchema = z.object({
  contestId: z.string().uuid(),
})

const submitContestSolutionSchema = z.object({
  contestId: z.string().uuid(),
  questionId: z.string().uuid(),
  code: z.string().optional(),
  language: z.string().optional(),
  answer: z.string().optional(),
})

export const listContests = async (req: Request, res: Response): Promise<void> => {
  try {
    const status = req.query.status as string | undefined
    const type = req.query.type as string | undefined
    const difficulty = req.query.difficulty as string | undefined
    const page = parseInt((req.query.page as string) || '1', 10)
    const limit = parseInt((req.query.limit as string) || '10', 10)
    const skip = (page - 1) * limit

    const where: any = { isPublished: true }

    if (status) {
      const now = new Date()
      switch (status) {
        case 'upcoming':
          where.status = 'UPCOMING'
          where.startTime = { gt: now }
          break
        case 'active':
          where.status = 'ACTIVE'
          where.startTime = { lte: now }
          where.endTime = { gt: now }
          break
        case 'completed':
          where.status = 'COMPLETED'
          where.endTime = { lte: now }
          break
      }
    }

    if (type) where.type = type
    if (difficulty) where.difficulty = difficulty

    const [contests, total] = await Promise.all([
      prisma.contest.findMany({
        where,
        skip,
        take: limit,
        orderBy: { startTime: 'asc' },
        select: {
          id: true,
          title: true,
          slug: true,
          description: true,
          type: true,
          difficulty: true,
          status: true,
          startTime: true,
          endTime: true,
          duration: true,
          problemCount: true,
          participantCount: true,
          prize: true,
          isPublished: true,
        },
      }),
      prisma.contest.count({ where }),
    ])

    res.json({
      status: 'success',
      data: contests,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    })
  } catch (error) {
    logger.error(
      '[ContestsController] listContests error',
      error instanceof Error ? error : new Error(String(error))
    )
    res.status(500).json({ status: 'error', message: 'Internal server error' })
  }
}

export const getContest = async (req: Request, res: Response): Promise<void> => {
  try {
    const id = req.params.id as string
    const userId = req.user?.userId

    const contest = await prisma.contest.findUnique({
      where: { id },
      include: {
        problems: {
          include: {
            question: {
              select: {
                id: true,
                text: true,
                type: true,
                difficulty: true,
                points: true,
                order: true,
                explanation: true,
                options: {
                  select: {
                    id: true,
                    text: true,
                    order: true,
                  },
                },
              },
            },
          },
          orderBy: { order: 'asc' },
        },
      },
    })

    if (!contest) {
      res.status(404).json({ status: 'error', message: 'Contest not found' })
      return
    }

    let isRegistered = false
    let participantScore = 0
    let participantRank: number | null = null

    if (userId) {
      const participant = await prisma.contestParticipant.findUnique({
        where: {
          contestId_userId: {
            contestId: id,
            userId,
          },
        },
      })

      if (participant) {
        isRegistered = true
        participantScore = participant.score
        participantRank = participant.rank
      }
    }

    const now = new Date()
    const showAnswers = contest.status === 'COMPLETED' || contest.endTime <= now

    const problems = contest.problems.map((p: any) => ({
      ...p.question,
      options: showAnswers
        ? p.question.options
        : p.question.options.map((o: any) => ({ id: o.id, text: o.text, order: o.order })),
      explanation: showAnswers ? p.question.explanation : undefined,
    }))

    res.json({
      status: 'success',
      data: {
        ...contest,
        problems,
        isRegistered,
        participantScore,
        participantRank,
      },
    })
  } catch (error) {
    logger.error(
      '[ContestsController] getContest error',
      error instanceof Error ? error : new Error(String(error))
    )
    res.status(500).json({ status: 'error', message: 'Internal server error' })
  }
}

export const createContest = async (req: Request, res: Response): Promise<void> => {
  try {
    const validation = createContestSchema.safeParse(req.body)
    if (!validation.success) {
      res.status(400).json({
        status: 'error',
        message: 'Invalid contest data',
        errors: validation.error.issues,
      })
      return
    }

    const {
      title,
      slug,
      description,
      type,
      difficulty,
      startTime,
      endTime,
      duration,
      prize,
      rules,
      problemIds,
      isPublished,
    } = validation.data

    const existing = await prisma.contest.findUnique({ where: { slug } })
    if (existing) {
      res.status(409).json({ status: 'error', message: 'Contest slug already exists' })
      return
    }

    const contest = await prisma.contest.create({
      data: {
        title,
        slug,
        description,
        type,
        difficulty,
        status: new Date(startTime) > new Date() ? 'UPCOMING' : 'ACTIVE',
        startTime: new Date(startTime),
        endTime: new Date(endTime),
        duration,
        problemCount: problemIds.length,
        prize,
        rules,
        isPublished,
        createdBy: (req as any).user?.id,
        problems: {
          create: problemIds.map((questionId, index) => ({
            questionId,
            order: index,
          })),
        },
      },
    })

    res.status(201).json({ status: 'success', data: contest })
  } catch (error) {
    logger.error(
      '[ContestsController] createContest error',
      error instanceof Error ? error : new Error(String(error))
    )
    res.status(500).json({ status: 'error', message: 'Internal server error' })
  }
}

export const joinContest = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.user?.userId
    if (!userId) {
      res.status(401).json({ status: 'error', message: 'Authentication required' })
      return
    }

    const validation = joinContestSchema.safeParse(req.body)
    if (!validation.success) {
      res.status(400).json({ status: 'error', message: 'Invalid contest ID' })
      return
    }

    const { contestId } = validation.data

    const contest = await prisma.contest.findUnique({ where: { id: contestId } })
    if (!contest) {
      res.status(404).json({ status: 'error', message: 'Contest not found' })
      return
    }

    if (contest.status === 'COMPLETED' || contest.status === 'CANCELLED') {
      res
        .status(400)
        .json({ status: 'error', message: 'Cannot join a completed or cancelled contest' })
      return
    }

    const now = new Date()
    if (now < contest.startTime) {
      res.status(400).json({ status: 'error', message: 'Contest has not started yet' })
      return
    }

    if (now > contest.endTime) {
      res.status(400).json({ status: 'error', message: 'Contest has ended' })
      return
    }

    const existing = await prisma.contestParticipant.findUnique({
      where: {
        contestId_userId: { contestId, userId },
      },
    })

    if (existing) {
      res.status(409).json({ status: 'error', message: 'Already registered for this contest' })
      return
    }

    // Atomic transaction: create participant AND increment count together
    const participant = await prisma.$transaction(async tx => {
      const newParticipant = await tx.contestParticipant.create({
        data: {
          contestId,
          userId,
        },
      })
      await tx.contest.update({
        where: { id: contestId },
        data: { participantCount: { increment: 1 } },
      })
      return newParticipant
    })

    res.status(201).json({ status: 'success', data: participant })
  } catch (error) {
    logger.error(
      '[ContestsController] joinContest error',
      error instanceof Error ? error : new Error(String(error))
    )
    res.status(500).json({ status: 'error', message: 'Internal server error' })
  }
}

export const submitContestSolution = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.user?.userId
    if (!userId) {
      res.status(401).json({ status: 'error', message: 'Authentication required' })
      return
    }

    const validation = submitContestSolutionSchema.safeParse(req.body)
    if (!validation.success) {
      res.status(400).json({
        status: 'error',
        message: 'Invalid submission data',
        errors: validation.error.issues,
      })
      return
    }

    const { contestId, questionId, code, language, answer } = validation.data

    const contest = await prisma.contest.findUnique({ where: { id: contestId } })
    if (!contest) {
      res.status(404).json({ status: 'error', message: 'Contest not found' })
      return
    }

    const now = new Date()
    if (now < contest.startTime || now > contest.endTime) {
      res.status(400).json({ status: 'error', message: 'Contest is not active' })
      return
    }

    const participant = await prisma.contestParticipant.findUnique({
      where: {
        contestId_userId: { contestId, userId },
      },
    })

    if (!participant) {
      res.status(403).json({ status: 'error', message: 'Not registered for this contest' })
      return
    }

    const existingSubmission = await prisma.contestSubmission.findFirst({
      where: {
        contestId,
        participantId: participant.id,
        questionId,
        status: 'accepted',
      },
    })

    if (existingSubmission) {
      res.status(409).json({ status: 'error', message: 'Question already solved' })
      return
    }

    const question = await prisma.question.findUnique({
      where: { id: questionId },
      include: { options: true },
    })

    if (!question) {
      res.status(404).json({ status: 'error', message: 'Question not found' })
      return
    }

    const isCorrect = answer ? question.options.some(o => o.isCorrect && o.id === answer) : false

    const points = isCorrect ? question.points : 0
    const status = isCorrect ? 'accepted' : 'wrong_answer'

    const submission = await prisma.contestSubmission.create({
      data: {
        contestId,
        participantId: participant.id,
        questionId,
        code,
        language,
        status,
        points,
        timeTaken: 0,
      },
    })

    if (isCorrect) {
      const totalScore = await prisma.contestSubmission.aggregate({
        where: { participantId: participant.id },
        _sum: { points: true },
      })

      const problemsSolved = await prisma.contestSubmission.count({
        where: {
          participantId: participant.id,
          status: 'accepted',
        },
      })

      await prisma.contestParticipant.update({
        where: { id: participant.id },
        data: {
          score: totalScore._sum.points || 0,
          problemsSolved,
          lastSubmitAt: now,
        },
      })
    }

    res.json({
      status: 'success',
      data: {
        submission,
        isCorrect,
        points,
      },
    })
  } catch (error) {
    logger.error(
      '[ContestsController] submitContestSolution error',
      error instanceof Error ? error : new Error(String(error))
    )
    res.status(500).json({ status: 'error', message: 'Internal server error' })
  }
}

export const getContestLeaderboard = async (req: Request, res: Response): Promise<void> => {
  try {
    const id = req.params.id as string
    const page = parseInt((req.query.page as string) || '1', 10)
    const limit = parseInt((req.query.limit as string) || '50', 10)
    const skip = (page - 1) * limit

    const contest = await prisma.contest.findUnique({ where: { id } })
    if (!contest) {
      res.status(404).json({ status: 'error', message: 'Contest not found' })
      return
    }

    const [participants, total] = await Promise.all([
      prisma.contestParticipant.findMany({
        where: { contestId: id },
        skip,
        take: limit,
        orderBy: [{ score: 'desc' }, { totalTime: 'asc' }, { joinedAt: 'asc' }],
        include: {
          user: {
            select: {
              id: true,
              username: true,
              avatar: true,
              level: true,
            },
          },
        },
      }),
      prisma.contestParticipant.count({ where: { contestId: id } }),
    ])

    const ranked = participants.map((p, i) => ({
      ...p,
      rank: skip + i + 1,
    }))

    if (ranked.length > 0 && (contest.status === 'ACTIVE' || contest.status === 'COMPLETED')) {
      // Bulk update ranks in a single transaction instead of N individual queries
      await prisma.$transaction(
        ranked.map(p =>
          prisma.contestParticipant.update({
            where: { id: p.id },
            data: { rank: p.rank },
          })
        )
      )
    }

    res.json({
      status: 'success',
      data: ranked,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    })
  } catch (error) {
    logger.error(
      '[ContestsController] getContestLeaderboard error',
      error instanceof Error ? error : new Error(String(error))
    )
    res.status(500).json({ status: 'error', message: 'Internal server error' })
  }
}

export const getContestResults = async (req: Request, res: Response): Promise<void> => {
  try {
    const id = req.params.id as string
    const userId = req.user?.userId

    const contest = await prisma.contest.findUnique({ where: { id } })
    if (!contest) {
      res.status(404).json({ status: 'error', message: 'Contest not found' })
      return
    }

    if (contest.status !== 'COMPLETED' && contest.endTime > new Date()) {
      res.status(403).json({ status: 'error', message: 'Results not available until contest ends' })
      return
    }

    let participant: any = null
    let submissions: any[] = []

    if (userId) {
      participant = await prisma.contestParticipant.findUnique({
        where: {
          contestId_userId: { contestId: id, userId },
        },
      })

      if (participant) {
        submissions = await prisma.contestSubmission.findMany({
          where: { participantId: participant.id },
          include: {
            question: {
              select: {
                id: true,
                text: true,
                type: true,
                points: true,
                explanation: true,
                options: true,
              },
            },
          },
          orderBy: { submittedAt: 'asc' },
        })
      }
    }

    const topParticipants = await prisma.contestParticipant.findMany({
      where: { contestId: id },
      take: 10,
      orderBy: [{ score: 'desc' }, { totalTime: 'asc' }],
      include: {
        user: {
          select: {
            id: true,
            username: true,
            avatar: true,
            level: true,
          },
        },
      },
    })

    res.json({
      status: 'success',
      data: {
        contest: {
          id: contest.id,
          title: contest.title,
          status: contest.status,
          endTime: contest.endTime,
        },
        participant: participant
          ? {
              score: participant.score,
              rank: participant.rank,
              problemsSolved: participant.problemsSolved,
              totalTime: participant.totalTime,
            }
          : null,
        submissions,
        topParticipants: topParticipants.map((p: any, i: number) => ({
          rank: i + 1,
          user: p.user,
          score: p.score,
          problemsSolved: p.problemsSolved,
        })),
      },
    })
  } catch (error) {
    logger.error(
      '[ContestsController] getContestResults error',
      error instanceof Error ? error : new Error(String(error))
    )
    res.status(500).json({ status: 'error', message: 'Internal server error' })
  }
}

export const updateContestStatus = async (req: Request, res: Response): Promise<void> => {
  try {
    const id = req.params.id as string
    const status = req.body.status as string

    if (!['UPCOMING', 'ACTIVE', 'COMPLETED', 'CANCELLED'].includes(status)) {
      res.status(400).json({ status: 'error', message: 'Invalid status' })
      return
    }

    // Validate state transitions
    const contest = await prisma.contest.findUnique({ where: { id }, select: { status: true } })
    if (!contest) {
      res.status(404).json({ status: 'error', message: 'Contest not found' })
      return
    }

    const validTransitions: Record<string, string[]> = {
      DRAFT: ['UPCOMING', 'CANCELLED'],
      UPCOMING: ['ACTIVE', 'CANCELLED'],
      ACTIVE: ['COMPLETED', 'CANCELLED'],
      COMPLETED: [], // Terminal state
      CANCELLED: [], // Terminal state
    }

    const allowed = validTransitions[contest.status] ?? []
    if (!allowed.includes(status)) {
      res.status(400).json({
        status: 'error',
        message: `Cannot transition from ${contest.status} to ${status}. Allowed: ${allowed.join(', ') || 'none (terminal state)'}`,
      })
      return
    }

    const updated = await prisma.contest.update({
      where: { id },
      data: { status: status as any },
    })

    res.json({ status: 'success', data: updated })
  } catch (error) {
    logger.error(
      '[ContestsController] updateContestStatus error',
      error instanceof Error ? error : new Error(String(error))
    )
    res.status(500).json({ status: 'error', message: 'Internal server error' })
  }
}
