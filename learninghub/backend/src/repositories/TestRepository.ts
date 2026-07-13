import { Test, TestMode, TestDifficulty } from '@prisma/client'
import { BaseRepository, QueryParams, PaginatedResult, TxClient } from './BaseRepository'

export interface CreateTestInput {
  examId?: string
  title: string
  description?: string
  timeLimit?: number
  passingScore?: number
  maxAttempts?: number
  mode?: TestMode
  difficulty?: TestDifficulty
  totalMarks?: number
  negativeMarks?: number
  isPublished?: boolean
  isAiGenerated?: boolean
  templateId?: string
}

export interface UpdateTestInput {
  examId?: string
  title?: string
  description?: string
  timeLimit?: number
  passingScore?: number
  maxAttempts?: number
  mode?: TestMode
  difficulty?: TestDifficulty
  totalMarks?: number
  negativeMarks?: number
  isPublished?: boolean
  isAiGenerated?: boolean
  templateId?: string
}

export interface TestFilters {
  examId?: string
  mode?: TestMode
  difficulty?: TestDifficulty
  isPublished?: boolean
  search?: string
}

export interface TestSummary {
  id: string
  title: string
  description: string | null
  timeLimit: number
  passingScore: number
  maxAttempts: number
  mode: TestMode
  difficulty: TestDifficulty
  totalMarks: number
  negativeMarks: number
  isPublished: boolean
  isAiGenerated: boolean
  questionCount: number
  resultCount: number
}

export class TestRepository extends BaseRepository<Test, CreateTestInput, UpdateTestInput> {
  async findById(id: string, includeRelations = false): Promise<Test | null> {
    return this.prisma.test.findUnique({
      where: { id, deletedAt: null },
      include: includeRelations
        ? {
            questions: true,
            results: true,
          }
        : undefined,
    })
  }

  async findPublishedByExam(examId: string): Promise<Test[]> {
    return this.prisma.test.findMany({
      where: { examId, isPublished: true, deletedAt: null },
      orderBy: { createdAt: 'desc' },
    })
  }

  async findManyList(
    params: QueryParams & TestFilters = {}
  ): Promise<PaginatedResult<TestSummary>> {
    const { page, limit, skip } = this.buildPaginationParams(params)

    const where = {
      deletedAt: null,
      ...(params.examId && { examId: params.examId }),
      ...(params.mode && { mode: params.mode }),
      ...(params.difficulty && { difficulty: params.difficulty }),
      ...(params.isPublished !== undefined && { isPublished: params.isPublished }),
      ...(params.search && {
        OR: [
          { title: { contains: params.search, mode: 'insensitive' as const } },
          { description: { contains: params.search, mode: 'insensitive' as const } },
        ],
      }),
    }

    const [total, data] = await Promise.all([
      this.prisma.test.count({ where }),
      this.prisma.test.findMany({
        where,
        skip,
        take: limit,
        orderBy: this.buildOrderBy(params.sortBy, params.sortOrder),
      }),
    ])

    const formatted: TestSummary[] = data.map(t => ({
      id: t.id,
      title: t.title,
      description: t.description,
      timeLimit: t.timeLimit,
      passingScore: t.passingScore,
      maxAttempts: t.maxAttempts,
      mode: t.mode,
      difficulty: t.difficulty,
      totalMarks: t.totalMarks,
      negativeMarks: t.negativeMarks,
      isPublished: t.isPublished,
      isAiGenerated: t.isAiGenerated,
      questionCount: 0,
      resultCount: 0,
    }))

    return this.buildPaginatedResponse(formatted, total, page, limit)
  }

  async create(data: CreateTestInput, tx?: TxClient): Promise<Test> {
    const prisma = this.getPrismaInstance(tx)
    return prisma.test.create({
      data,
    })
  }

  async update(id: string, data: UpdateTestInput, tx?: TxClient): Promise<Test> {
    const prisma = this.getPrismaInstance(tx)
    return prisma.test.update({
      where: { id },
      data: {
        ...data,
        updatedAt: new Date(),
      },
    })
  }

  async delete(id: string, tx?: TxClient): Promise<void> {
    const prisma = this.getPrismaInstance(tx)
    await prisma.test.delete({ where: { id } })
  }

  async softDelete(id: string, tx?: TxClient): Promise<void> {
    const prisma = this.getPrismaInstance(tx)
    await prisma.test.update({
      where: { id },
      data: { deletedAt: new Date(), updatedAt: new Date() },
    })
  }

  async restore(id: string, tx?: TxClient): Promise<void> {
    const prisma = this.getPrismaInstance(tx)
    await prisma.test.update({
      where: { id },
      data: { deletedAt: null, updatedAt: new Date() },
    })
  }
}
