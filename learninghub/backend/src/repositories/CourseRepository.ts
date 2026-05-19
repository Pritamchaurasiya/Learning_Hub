import { PrismaClient, Course, Prisma, CoursePhase, DifficultyLevel } from '@prisma/client'
import { BaseRepository, QueryParams, PaginatedResult } from './BaseRepository'

import { Decimal } from '@prisma/client/runtime/library'

// Summary type for featured courses (partial fields)
export interface CourseSummary {
  id: string
  title: string
  shortDescription: string | null
  thumbnail: string | null
  difficulty: DifficultyLevel
  duration: number
  rating: number
  studentCount: number
  price: Decimal | null
  category: string | null
}

// Type for course listings (matches findMany select)
export interface CourseListItem {
  id: string
  title: string
  shortDescription: string | null
  phase: CoursePhase
  difficulty: DifficultyLevel
  category: string | null
  tags: string[]
  thumbnail: string | null
  duration: number
  price: Decimal | null
  originalPrice: Decimal | null
  currency: string
  rating: number
  reviewCount: number
  studentCount: number
  certificate: boolean
  isPublished: boolean
  publishedAt: Date | null
  createdAt: Date
  updatedAt: Date
  instructor: {
    id: string
    username: string | null
    avatar: string | null
  } | null
}

export interface CreateCourseInput {
  title: string
  description: string
  shortDescription?: string
  phase: CoursePhase
  duration: number
  difficulty: DifficultyLevel
  category?: string
  tags?: string[]
  content: string
  thumbnail?: string
  trailerVideo?: string
  instructorId?: string
  price?: number
  originalPrice?: number
  currency?: string
  certificate?: boolean
  language?: string
  prerequisites?: string[]
  learningOutcomes?: string[]
  isPublished?: boolean
}

export interface UpdateCourseInput {
  title?: string
  description?: string
  shortDescription?: string
  phase?: CoursePhase
  duration?: number
  difficulty?: DifficultyLevel
  category?: string
  tags?: string[]
  content?: string
  thumbnail?: string
  trailerVideo?: string
  instructorId?: string
  price?: number
  originalPrice?: number
  currency?: string
  certificate?: boolean
  language?: string
  prerequisites?: string[]
  learningOutcomes?: string[]
  isPublished?: boolean
  publishedAt?: Date
  rating?: number
  reviewCount?: number
  studentCount?: number
}

export interface CourseFilters {
  phase?: CoursePhase
  difficulty?: DifficultyLevel
  category?: string
  tags?: string[]
  isPublished?: boolean
  instructorId?: string
  minPrice?: number
  maxPrice?: number
  search?: string
  hasCertificate?: boolean
}

export class CourseRepository extends BaseRepository<Course, CreateCourseInput, UpdateCourseInput> {
  async findById(id: string, includeRelations = false): Promise<Course | null> {
    return this.prisma.course.findUnique({
      where: { id, deletedAt: null },
      include: includeRelations
        ? {
            instructor: {
              select: {
                id: true,
                username: true,
                avatar: true,
                bio: true,
              },
            },
            modules: {
              orderBy: { order: 'asc' },
              include: {
                lessons: {
                  orderBy: { order: 'asc' },
                },
              },
            },
            reviews: {
              where: { isVisible: true },
              take: 5,
              orderBy: { createdAt: 'desc' },
              include: {
                reviewer: {
                  select: {
                    id: true,
                    username: true,
                    avatar: true,
                  },
                },
              },
            },
            tests: {
              select: {
                id: true,
                title: true,
                description: true,
                timeLimit: true,
                passingScore: true,
              },
            },
          }
        : undefined,
    })
  }

  async findManyList(
    params: QueryParams & CourseFilters = {}
  ): Promise<PaginatedResult<CourseListItem>> {
    const { page, limit, skip } = this.buildPaginationParams(params)

    const where: Prisma.CourseWhereInput = {
      deletedAt: null,
      isPublished: params.isPublished ?? true,
      ...(params.phase && { phase: params.phase }),
      ...(params.difficulty && { difficulty: params.difficulty }),
      ...(params.category && { category: { equals: params.category, mode: 'insensitive' } }),
      ...(params.tags &&
        params.tags.length > 0 && {
          tags: { hasEvery: params.tags },
        }),
      ...(params.instructorId && { instructorId: params.instructorId }),
      ...(params.minPrice !== undefined && { price: { gte: params.minPrice } }),
      ...(params.maxPrice !== undefined && { price: { lte: params.maxPrice } }),
      ...(params.hasCertificate !== undefined && { certificate: params.hasCertificate }),
      ...(params.search && {
        OR: [
          { title: { contains: params.search, mode: 'insensitive' } },
          { description: { contains: params.search, mode: 'insensitive' } },
          { shortDescription: { contains: params.search, mode: 'insensitive' } },
        ],
      }),
    }

    const [total, data] = await Promise.all([
      this.prisma.course.count({ where }),
      this.prisma.course.findMany({
        where,
        skip,
        take: limit,
        orderBy: this.buildOrderBy(params.sortBy, params.sortOrder),
        select: {
          id: true,
          title: true,
          shortDescription: true,
          phase: true,
          difficulty: true,
          category: true,
          tags: true,
          thumbnail: true,
          duration: true,
          price: true,
          originalPrice: true,
          currency: true,
          rating: true,
          reviewCount: true,
          studentCount: true,
          certificate: true,
          isPublished: true,
          publishedAt: true,
          createdAt: true,
          updatedAt: true,
          instructor: {
            select: {
              id: true,
              username: true,
              avatar: true,
            },
          },
        },
      }),
    ])

    return this.buildPaginatedResponse(data, total, page, limit)
  }

  async create(data: CreateCourseInput, tx?: PrismaClient): Promise<Course> {
    const prisma = this.getPrismaInstance(tx)

    const courseData: Prisma.CourseCreateInput = {
      title: data.title,
      description: data.description,
      shortDescription: data.shortDescription,
      phase: data.phase,
      duration: data.duration,
      difficulty: data.difficulty,
      category: data.category,
      tags: data.tags ?? [],
      content: data.content,
      thumbnail: data.thumbnail,
      trailerVideo: data.trailerVideo,
      price: data.price ?? 0,
      originalPrice: data.originalPrice,
      currency: data.currency ?? 'USD',
      certificate: data.certificate ?? false,
      language: data.language ?? 'en',
      prerequisites: data.prerequisites ?? [],
      learningOutcomes: data.learningOutcomes ?? [],
      isPublished: data.isPublished ?? false,
      ...(data.instructorId && {
        instructor: { connect: { id: data.instructorId } },
      }),
    }

    return prisma.course.create({ data: courseData })
  }

  async update(id: string, data: UpdateCourseInput, tx?: PrismaClient): Promise<Course> {
    const prisma = this.getPrismaInstance(tx)

    const updateData: Prisma.CourseUpdateInput = {
      ...data,
      updatedAt: new Date(),
      ...(data.instructorId && {
        instructor: { connect: { id: data.instructorId } },
      }),
      ...(data.isPublished === true &&
        !data.publishedAt && {
          publishedAt: new Date(),
        }),
    }

    return prisma.course.update({
      where: { id },
      data: updateData,
    })
  }

  async delete(id: string, tx?: PrismaClient): Promise<void> {
    const prisma = this.getPrismaInstance(tx)
    await prisma.course.delete({ where: { id } })
  }

  async softDelete(id: string, tx?: PrismaClient): Promise<void> {
    const prisma = this.getPrismaInstance(tx)
    await prisma.course.update({
      where: { id },
      data: { deletedAt: new Date(), updatedAt: new Date() },
    })
  }

  async restore(id: string, tx?: PrismaClient): Promise<void> {
    const prisma = this.getPrismaInstance(tx)
    await prisma.course.update({
      where: { id },
      data: { deletedAt: null, updatedAt: new Date() },
    })
  }

  async publish(id: string, tx?: PrismaClient): Promise<Course> {
    const prisma = this.getPrismaInstance(tx)
    return prisma.course.update({
      where: { id },
      data: {
        isPublished: true,
        publishedAt: new Date(),
        updatedAt: new Date(),
      },
    })
  }

  async unpublish(id: string, tx?: PrismaClient): Promise<Course> {
    const prisma = this.getPrismaInstance(tx)
    return prisma.course.update({
      where: { id },
      data: {
        isPublished: false,
        updatedAt: new Date(),
      },
    })
  }

  async incrementStudentCount(id: string, tx?: PrismaClient): Promise<void> {
    const prisma = this.getPrismaInstance(tx)
    await prisma.course.update({
      where: { id },
      data: {
        studentCount: { increment: 1 },
        updatedAt: new Date(),
      },
    })
  }

  async decrementStudentCount(id: string, tx?: PrismaClient): Promise<void> {
    const prisma = this.getPrismaInstance(tx)
    await prisma.course.update({
      where: { id },
      data: {
        studentCount: { decrement: 1 },
        updatedAt: new Date(),
      },
    })
  }

  async updateRating(id: string, tx?: PrismaClient): Promise<void> {
    const prisma = this.getPrismaInstance(tx)

    // Calculate average rating from reviews
    const result = await prisma.courseReview.aggregate({
      where: { courseId: id, isVisible: true },
      _avg: { rating: true },
      _count: { rating: true },
    })

    await prisma.course.update({
      where: { id },
      data: {
        rating: result._avg.rating ?? 0,
        reviewCount: result._count.rating || 0,
        updatedAt: new Date(),
      },
    })
  }

  async findFeatured(limit: number = 6): Promise<CourseSummary[]> {
    return this.prisma.course.findMany({
      where: {
        deletedAt: null,
        isPublished: true,
      },
      orderBy: [{ rating: 'desc' }, { studentCount: 'desc' }, { createdAt: 'desc' }],
      take: limit,
    })
  }

  async findByInstructor(instructorId: string, includeUnpublished = false): Promise<Course[]> {
    return this.prisma.course.findMany({
      where: {
        deletedAt: null,
        instructorId,
        ...(includeUnpublished ? {} : { isPublished: true }),
      },
      orderBy: { createdAt: 'desc' },
    })
  }

  async getCategories(): Promise<string[]> {
    const result = await this.prisma.course.findMany({
      where: {
        deletedAt: null,
        isPublished: true,
        category: { not: null },
      },
      distinct: ['category'],
      select: { category: true },
    })
    return result.map(c => c.category).filter((c): c is string => c !== null)
  }

  async getTags(): Promise<string[]> {
    const result = await this.prisma.course.findMany({
      where: {
        deletedAt: null,
        isPublished: true,
      },
      select: { tags: true },
    })

    const allTags = result.flatMap(c => c.tags)
    return [...new Set(allTags)]
  }
}
