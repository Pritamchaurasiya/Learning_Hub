import { prisma } from '../prismaClient'
import { BloomLevel, QuestionType, Prisma } from '@prisma/client'
import { z } from 'zod'
import logger from '../utils/logger'
import { sanitizeInput } from '../utils/TokenTrimmer'
import { ValidationError, NotFoundError } from '../utils/errors'

// Validation schemas for Question Ingestion
export const rawOptionSchema = z.object({
  id: z.string().optional(),
  text: z.string().min(1, 'Option text cannot be empty'),
  isCorrect: z.boolean().default(false),
  explanation: z.string().optional(),
  order: z.number().int().nonnegative().optional(),
})

export const rawQuestionSchema = z.object({
  text: z.string().min(3, 'Question text must be at least 3 characters'),
  type: z
    .enum(['MCQ', 'MSQ', 'TRUE_FALSE', 'NUMERICAL', 'SHORT_ANSWER', 'SUBJECTIVE', 'CODING'])
    .default('MCQ'),
  difficulty: z.number().min(0).max(5).default(0.5),
  bloomLevel: z
    .enum(['REMEMBER', 'UNDERSTAND', 'APPLY', 'ANALYZE', 'EVALUATE', 'CREATE'])
    .default('UNDERSTAND'),
  explanation: z.string().optional(),
  tags: z.array(z.string()).default([]),
  points: z.number().int().positive().default(10),
  options: z.array(rawOptionSchema).default([]),
  topicId: z.string().optional(),
  testId: z.string().optional(),
})

export type RawQuestionInput = z.infer<typeof rawQuestionSchema>

export type ReviewStatus = 'DRAFT' | 'PENDING_REVIEW' | 'APPROVED' | 'REJECTED'

export interface ReviewInput {
  status: ReviewStatus
  reviewerId?: string
  reviewerName?: string
  feedback?: string
  rating?: number
}

export interface QuestionListQuery {
  testId?: string
  topicId?: string
  type?: QuestionType | string
  difficultyMin?: number
  difficultyMax?: number
  search?: string
  status?: string
  page?: number
  limit?: number
}

export interface ImportResult {
  totalProcessed: number
  importedCount: number
  skippedDuplicates: number
  errorCount: number
  errors: Array<{ index: number; questionText: string; error: string }>
  importedQuestionIds: string[]
}

export class QuestionBankService {
  /**
   * Validate a single raw question and normalize its payload
   */
  validateQuestion(
    raw: unknown,
    index: number = 0
  ): { isValid: boolean; normalized?: RawQuestionInput; error?: string } {
    try {
      const rawObj = (typeof raw === 'object' && raw !== null ? raw : {}) as Record<string, unknown>
      const parsed = rawQuestionSchema.parse({
        ...rawObj,
        text: sanitizeInput(String(rawObj.text || ''), 3000),
        explanation: rawObj.explanation
          ? sanitizeInput(String(rawObj.explanation), 2000)
          : undefined,
        tags: Array.isArray(rawObj.tags)
          ? rawObj.tags.map((t: unknown) => sanitizeInput(String(t), 50))
          : [],
      })

      // Type-specific invariant validation
      if (parsed.type === 'MCQ') {
        if (parsed.options.length < 2) {
          return { isValid: false, error: `MCQ at item ${index + 1} requires at least 2 options` }
        }
        const correctCount = parsed.options.filter(o => o.isCorrect).length
        if (correctCount !== 1) {
          return {
            isValid: false,
            error: `MCQ at item ${index + 1} must have exactly 1 correct option (found ${correctCount})`,
          }
        }
      } else if (parsed.type === 'MSQ') {
        if (parsed.options.length < 2) {
          return { isValid: false, error: `MSQ at item ${index + 1} requires at least 2 options` }
        }
        const correctCount = parsed.options.filter(o => o.isCorrect).length
        if (correctCount < 1) {
          return {
            isValid: false,
            error: `MSQ at item ${index + 1} requires at least 1 correct option`,
          }
        }
      } else if (parsed.type === 'TRUE_FALSE') {
        if (parsed.options.length === 0) {
          parsed.options = [
            { text: 'True', isCorrect: true, order: 0 },
            { text: 'False', isCorrect: false, order: 1 },
          ]
        }
        const correctCount = parsed.options.filter(o => o.isCorrect).length
        if (correctCount !== 1) {
          return {
            isValid: false,
            error: `True/False at item ${index + 1} must have exactly 1 correct option`,
          }
        }
      } else if (parsed.type === 'NUMERICAL') {
        if (parsed.options.length === 0) {
          return {
            isValid: false,
            error: `Numerical question at item ${index + 1} must specify the correct numerical answer in an option`,
          }
        }
        const firstOpt = parsed.options[0]?.text
        if (isNaN(parseFloat(firstOpt))) {
          return {
            isValid: false,
            error: `Numerical question at item ${index + 1} has non-numeric correct answer: "${firstOpt}"`,
          }
        }
      } else if (parsed.type === 'SHORT_ANSWER') {
        if (parsed.options.length === 0) {
          return {
            isValid: false,
            error: `Short Answer question at item ${index + 1} requires at least one accepted valid answer`,
          }
        }
      }

      return { isValid: true, normalized: parsed }
    } catch (err: unknown) {
      const msg =
        err instanceof z.ZodError ? err.issues.map(e => e.message).join('; ') : String(err)
      return { isValid: false, error: `Validation error at item ${index + 1}: ${msg}` }
    }
  }

  /**
   * Resolve or initialize the Master Question Bank container test
   */
  async resolveMasterBankTestId(): Promise<string> {
    let bankTest = await prisma.test.findFirst({
      where: {
        title: 'Master Question Bank',
        mode: 'PRACTICE',
      },
      select: { id: true },
    })

    if (!bankTest) {
      let adminUser = await prisma.user.findFirst({
        where: { role: { in: ['ADMIN', 'SUPERADMIN', 'INSTRUCTOR'] } },
        select: { id: true },
      })

      if (!adminUser) {
        adminUser = await prisma.user.create({
          data: {
            email: 'system.bank@learninghub.internal',
            role: 'ADMIN',
            username: 'SystemAdmin',
            password: '$argon2id$v=19$m=65536,t=3,p=4$systemfallback$hash',
          },
          select: { id: true },
        })
      }

      bankTest = await prisma.test.create({
        data: {
          title: 'Master Question Bank',
          description: 'Central repository for imported and curated practice questions',
          mode: 'PRACTICE',
          difficulty: 'MIXED',
          timeLimit: 60,
          passingScore: 50,
          totalMarks: 100,
          negativeMarks: 0,
          isAiGenerated: false,
        },
        select: { id: true },
      })
    }

    return bankTest.id
  }

  /**
   * Bulk import questions into Question Bank or Test Blueprint with automatic deduplication
   */
  async importQuestions(
    payload: {
      testId?: string
      topicId?: string
      defaultTopic?: string
      questions: unknown[]
      skipDuplicates?: boolean
    },
    instructorId?: string
  ): Promise<ImportResult> {
    const { testId, topicId, defaultTopic, questions, skipDuplicates = true } = payload
    const result: ImportResult = {
      totalProcessed: questions.length,
      importedCount: 0,
      skippedDuplicates: 0,
      errorCount: 0,
      errors: [],
      importedQuestionIds: [],
    }

    if (questions.length === 0) {
      return result
    }

    if (questions.length > 500) {
      throw new ValidationError('Maximum 500 questions allowed per import batch')
    }

    // Resolve or create container test if testId not provided
    const effectiveTestId = testId || (await this.resolveMasterBankTestId())

    // Query existing question texts in this test/topic to avoid duplicates
    const existingQuestions = await prisma.question.findMany({
      where: {
        testId: effectiveTestId,
      },
      select: { text: true },
    })
    const existingTextSet = new Set(
      existingQuestions.map((q: { text: string }) => q.text.trim().toLowerCase())
    )

    // Process questions inside atomic batch
    const validQuestionsToInsert: Array<{ normalized: RawQuestionInput; order: number }> = []

    for (let i = 0; i < questions.length; i++) {
      const raw = questions[i]
      const validation = this.validateQuestion(raw, i)

      if (!validation.isValid || !validation.normalized) {
        result.errorCount++
        const rawObj = (typeof raw === 'object' && raw !== null ? raw : {}) as Record<
          string,
          unknown
        >
        result.errors.push({
          index: i,
          questionText: String(rawObj.text || `Item ${i + 1}`),
          error: validation.error || 'Unknown validation failure',
        })
        continue
      }

      const normText = validation.normalized.text.trim().toLowerCase()
      if (skipDuplicates && existingTextSet.has(normText)) {
        result.skippedDuplicates++
        continue
      }

      // Add to set to prevent within-batch duplicates
      existingTextSet.add(normText)
      validQuestionsToInsert.push({
        normalized: validation.normalized,
        order: existingQuestions.length + validQuestionsToInsert.length + 1,
      })
    }

    if (validQuestionsToInsert.length > 0) {
      const createdQuestions = await prisma.$transaction(
        validQuestionsToInsert.map(({ normalized, order }) =>
          prisma.question.create({
            data: {
              testId: effectiveTestId!,
              topicId: normalized.topicId || topicId || null,
              text: normalized.text,
              type: normalized.type as QuestionType,
              difficulty: normalized.difficulty,
              bloomLevel: normalized.bloomLevel as BloomLevel,
              explanation: normalized.explanation,
              tags: (() => {
                const baseTags =
                  normalized.tags.length > 0 ? [...normalized.tags] : defaultTopic ? [defaultTopic] : []
                if (!baseTags.some(t => t.toLowerCase().startsWith('status:'))) {
                  baseTags.unshift('status:PENDING_REVIEW')
                }
                return baseTags
              })(),
              points: normalized.points,
              order,
              isAiGenerated: false,
              options: {
                create: normalized.options.map((opt, optIdx) => ({
                  text: opt.text,
                  isCorrect: opt.isCorrect,
                  explanation: opt.explanation,
                  order: opt.order ?? optIdx,
                })),
              },
            },
            select: { id: true },
          })
        )
      )

      result.importedCount = createdQuestions.length
      result.importedQuestionIds = createdQuestions.map((q: { id: string }) => q.id)
    }

    logger.info('[QuestionBankService] Bulk import completed', {
      total: result.totalProcessed,
      imported: result.importedCount,
      duplicates: result.skippedDuplicates,
      errors: result.errorCount,
    })

    return result
  }

  /**
   * Export questions by test or topic
   */
  async exportQuestions(filters: { testId?: string; topicId?: string; type?: string }) {
    const where: Prisma.QuestionWhereInput = {}
    if (filters.testId) where.testId = filters.testId
    if (filters.topicId) where.topicId = filters.topicId
    if (filters.type) where.type = filters.type as QuestionType

    const questions = await prisma.question.findMany({
      where,
      include: {
        options: {
          orderBy: { order: 'asc' },
        },
      },
      orderBy: { order: 'asc' },
    })

    return questions.map(
      (q: {
        id: string
        text: string
        type: QuestionType
        difficulty: number
        bloomLevel: BloomLevel
        points: number
        explanation: string | null
        tags: string[]
        options: Array<{
          id: string
          text: string
          isCorrect: boolean
          explanation: string | null
          order: number
        }>
      }) => ({
        id: q.id,
        text: q.text,
        type: q.type,
        difficulty: q.difficulty,
        bloomLevel: q.bloomLevel,
        points: q.points,
        explanation: q.explanation,
        tags: q.tags,
        options: q.options.map(o => ({
          id: o.id,
          text: o.text,
          isCorrect: o.isCorrect,
          explanation: o.explanation,
          order: o.order,
        })),
      })
    )
  }

  /**
   * Get comprehensive Question Bank distribution statistics
   */
  async getQuestionBankStats() {
    const [totalQuestions, typeDistribution, difficultyAvg] = await Promise.all([
      prisma.question.count(),
      prisma.question.groupBy({
        by: ['type'],
        _count: { id: true },
      }),
      prisma.question.aggregate({
        _avg: { difficulty: true, points: true },
      }),
    ])

    const byType: Record<string, number> = {}
    typeDistribution.forEach((d: { type: string; _count: { id: number } }) => {
      byType[d.type] = d._count.id
    })

    return {
      totalQuestions,
      byType,
      avgDifficulty: difficultyAvg._avg.difficulty ?? 0.5,
      avgPoints: difficultyAvg._avg.points ?? 10,
    }
  }

  /**
   * Format question object with typed review status and parsed review history
   */
  formatQuestionResponse(q: any) {
    const statusTag = q.tags?.find((t: string) => t.toLowerCase().startsWith('status:'))
    const status = (
      statusTag ? statusTag.split(':')[1].toUpperCase() : 'PENDING_REVIEW'
    ) as ReviewStatus

    let reviewHistory: unknown[] = []
    if (
      q.solutionSteps &&
      typeof q.solutionSteps === 'object' &&
      Array.isArray((q.solutionSteps as any).reviewHistory)
    ) {
      reviewHistory = (q.solutionSteps as any).reviewHistory
    }

    return {
      id: q.id,
      testId: q.testId,
      topicId: q.topicId,
      sectionId: q.sectionId,
      text: q.text,
      type: q.type,
      difficulty: q.difficulty,
      bloomLevel: q.bloomLevel,
      explanation: q.explanation,
      tags: q.tags,
      points: q.points,
      order: q.order,
      status,
      reviewHistory,
      section: q.section,
      topic: q.topic,
      options: q.options
        ? q.options.map((o: any) => ({
            id: o.id,
            text: o.text,
            isCorrect: o.isCorrect,
            explanation: o.explanation,
            order: o.order,
          }))
        : [],
    }
  }

  /**
   * List questions with pagination, full filtering, search, and review status
   */
  async listQuestions(query: QuestionListQuery = {}) {
    const page = Math.max(1, Number(query.page) || 1)
    const limit = Math.min(100, Math.max(1, Number(query.limit) || 20))
    const skip = (page - 1) * limit

    const where: Prisma.QuestionWhereInput = {}

    if (query.testId) {
      where.testId = query.testId
    }
    if (query.topicId) {
      where.topicId = query.topicId
    }
    if (query.type) {
      where.type = query.type as QuestionType
    }
    if (query.difficultyMin !== undefined || query.difficultyMax !== undefined) {
      where.difficulty = {
        ...(query.difficultyMin !== undefined ? { gte: Number(query.difficultyMin) } : {}),
        ...(query.difficultyMax !== undefined ? { lte: Number(query.difficultyMax) } : {}),
      }
    }

    const andConditions: Prisma.QuestionWhereInput[] = []

    if (query.status) {
      andConditions.push({
        tags: { has: `status:${query.status.toUpperCase()}` },
      })
    }

    if (query.search && query.search.trim()) {
      const term = query.search.trim()
      andConditions.push({
        text: { contains: term, mode: 'insensitive' },
      })
    }

    if (andConditions.length > 0) {
      where.AND = andConditions
    }

    const [total, questions] = await Promise.all([
      prisma.question.count({ where }),
      prisma.question.findMany({
        where,
        include: {
          options: { orderBy: { order: 'asc' } },
          section: { select: { id: true, title: true } },
          topic: { select: { id: true, name: true } },
        },
        skip,
        take: limit,
        orderBy: { order: 'asc' },
      }),
    ])

    return {
      questions: questions.map((q: any) => this.formatQuestionResponse(q)),
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    }
  }

  /**
   * Retrieve a single question by ID with options and review status
   */
  async getQuestion(id: string) {
    const question = await prisma.question.findUnique({
      where: { id },
      include: {
        options: { orderBy: { order: 'asc' } },
        section: { select: { id: true, title: true } },
        topic: { select: { id: true, name: true } },
      },
    })

    if (!question) {
      throw new NotFoundError(`Question with ID ${id} not found`)
    }

    return this.formatQuestionResponse(question)
  }

  /**
   * Create a single question in the question bank or a test
   */
  async createSingleQuestion(input: unknown, instructorId?: string) {
    const validation = this.validateQuestion(input)
    if (!validation.isValid || !validation.normalized) {
      throw new ValidationError(validation.error || 'Invalid question data')
    }

    const { normalized } = validation
    const testId = normalized.testId || (await this.resolveMasterBankTestId())

    const maxOrder = await prisma.question.aggregate({
      where: { testId },
      _max: { order: true },
    })
    const nextOrder = (maxOrder._max.order ?? 0) + 1

    const tags = [...normalized.tags]
    if (!tags.some(t => t.toLowerCase().startsWith('status:'))) {
      tags.unshift('status:PENDING_REVIEW')
    }

    const initialAudit: Prisma.InputJsonValue = {
      createdBy: instructorId || 'system',
      createdAt: new Date().toISOString(),
      reviewHistory: [
        {
          status: 'PENDING_REVIEW',
          reviewerId: instructorId,
          feedback: 'Initial creation',
          reviewedAt: new Date().toISOString(),
        },
      ],
    }

    const question = await prisma.question.create({
      data: {
        testId,
        topicId: normalized.topicId || null,
        text: normalized.text,
        type: normalized.type as QuestionType,
        difficulty: normalized.difficulty,
        bloomLevel: normalized.bloomLevel as BloomLevel,
        explanation: normalized.explanation,
        solutionSteps: initialAudit,
        tags,
        points: normalized.points,
        order: nextOrder,
        isAiGenerated: false,
        options: {
          create: normalized.options.map((opt, optIdx) => ({
            text: opt.text,
            isCorrect: opt.isCorrect,
            explanation: opt.explanation,
            order: opt.order ?? optIdx,
          })),
        },
      },
      include: {
        options: { orderBy: { order: 'asc' } },
        section: { select: { id: true, title: true } },
        topic: { select: { id: true, name: true } },
      },
    })

    logger.info('[QuestionBankService] Single question created', {
      questionId: question.id,
      testId,
      instructorId,
    })

    return this.formatQuestionResponse(question)
  }

  /**
   * Update an existing question and synchronize its options
   */
  async updateQuestion(id: string, input: unknown, instructorId?: string) {
    const existing = await prisma.question.findUnique({
      where: { id },
      include: { options: { orderBy: { order: 'asc' } } },
    })

    if (!existing) {
      throw new NotFoundError(`Question with ID ${id} not found`)
    }

    const rawObj = (typeof input === 'object' && input !== null ? input : {}) as Record<
      string,
      unknown
    >

    const mergedForValidation = {
      text: rawObj.text !== undefined ? rawObj.text : existing.text,
      type: rawObj.type !== undefined ? rawObj.type : existing.type,
      difficulty: rawObj.difficulty !== undefined ? rawObj.difficulty : existing.difficulty,
      bloomLevel: rawObj.bloomLevel !== undefined ? rawObj.bloomLevel : existing.bloomLevel,
      explanation: rawObj.explanation !== undefined ? rawObj.explanation : existing.explanation,
      tags: rawObj.tags !== undefined ? rawObj.tags : existing.tags,
      points: rawObj.points !== undefined ? rawObj.points : existing.points,
      options: rawObj.options !== undefined ? rawObj.options : existing.options,
      topicId: rawObj.topicId !== undefined ? rawObj.topicId : existing.topicId,
      testId: rawObj.testId !== undefined ? rawObj.testId : existing.testId,
    }

    const validation = this.validateQuestion(mergedForValidation)
    if (!validation.isValid || !validation.normalized) {
      throw new ValidationError(validation.error || 'Invalid question update payload')
    }

    const { normalized } = validation

    const tags = [...normalized.tags]
    if (!tags.some((t: string) => t.toLowerCase().startsWith('status:'))) {
      const existingStatusTag = existing.tags.find((t: string) => t.toLowerCase().startsWith('status:'))
      if (existingStatusTag) {
        tags.push(existingStatusTag)
      } else {
        tags.push('status:PENDING_REVIEW')
      }
    }

    if (rawObj.options !== undefined) {
      await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
        await tx.option.deleteMany({ where: { questionId: id } })
        await tx.question.update({
          where: { id },
          data: {
            text: normalized.text,
            type: normalized.type as QuestionType,
            difficulty: normalized.difficulty,
            bloomLevel: normalized.bloomLevel as BloomLevel,
            explanation: normalized.explanation,
            tags,
            points: normalized.points,
            topicId: normalized.topicId || null,
            options: {
              create: normalized.options.map((opt, optIdx) => ({
                text: opt.text,
                isCorrect: opt.isCorrect,
                explanation: opt.explanation,
                order: opt.order ?? optIdx,
              })),
            },
          },
        })
      })
    } else {
      await prisma.question.update({
        where: { id },
        data: {
          text: normalized.text,
          type: normalized.type as QuestionType,
          difficulty: normalized.difficulty,
          bloomLevel: normalized.bloomLevel as BloomLevel,
          explanation: normalized.explanation,
          tags,
          points: normalized.points,
          topicId: normalized.topicId || null,
        },
      })
    }

    logger.info('[QuestionBankService] Question updated', {
      questionId: id,
      instructorId,
    })

    return this.getQuestion(id)
  }

  /**
   * Delete a question from the question bank
   */
  async deleteQuestion(id: string) {
    const existing = await prisma.question.findUnique({
      where: { id },
      select: { id: true },
    })

    if (!existing) {
      throw new NotFoundError(`Question with ID ${id} not found`)
    }

    await prisma.question.delete({
      where: { id },
    })

    logger.info('[QuestionBankService] Question deleted', { questionId: id })

    return { success: true, id }
  }

  /**
   * Record a review status transition with audit history
   */
  async reviewQuestion(id: string, review: ReviewInput) {
    const validStatuses: ReviewStatus[] = ['DRAFT', 'PENDING_REVIEW', 'APPROVED', 'REJECTED']
    if (!review.status || !validStatuses.includes(review.status)) {
      throw new ValidationError(
        `Invalid review status: "${review.status}". Allowed values: ${validStatuses.join(', ')}`
      )
    }

    const existing = await prisma.question.findUnique({
      where: { id },
      include: {
        options: { orderBy: { order: 'asc' } },
        section: { select: { id: true, title: true } },
        topic: { select: { id: true, name: true } },
      },
    })

    if (!existing) {
      throw new NotFoundError(`Question with ID ${id} not found`)
    }

    const newTags = existing.tags.filter((t: string) => !t.toLowerCase().startsWith('status:'))
    newTags.unshift(`status:${review.status}`)

    let currentSteps: Record<string, unknown> = {}
    if (existing.solutionSteps && typeof existing.solutionSteps === 'object') {
      currentSteps = { ...(existing.solutionSteps as Record<string, unknown>) }
    }

    const existingHistory = Array.isArray(currentSteps.reviewHistory)
      ? (currentSteps.reviewHistory as unknown[])
      : []

    const newEntry = {
      status: review.status,
      reviewerId: review.reviewerId || 'system',
      reviewerName: review.reviewerName || 'Reviewer',
      feedback: review.feedback ? sanitizeInput(review.feedback, 1000) : undefined,
      rating: review.rating,
      reviewedAt: new Date().toISOString(),
    }

    currentSteps.reviewHistory = [newEntry, ...existingHistory]
    currentSteps.lastReviewedAt = newEntry.reviewedAt
    currentSteps.lastReviewStatus = review.status

    const updated = await prisma.question.update({
      where: { id },
      data: {
        tags: newTags,
        solutionSteps: currentSteps as Prisma.InputJsonValue,
      },
      include: {
        options: { orderBy: { order: 'asc' } },
        section: { select: { id: true, title: true } },
        topic: { select: { id: true, name: true } },
      },
    })

    logger.info('[QuestionBankService] Question review status updated', {
      questionId: id,
      newStatus: review.status,
      reviewerId: review.reviewerId,
    })

    return this.formatQuestionResponse(updated)
  }
}

export const questionBankService = new QuestionBankService()
