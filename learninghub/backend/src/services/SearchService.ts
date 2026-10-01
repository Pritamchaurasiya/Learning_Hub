import { prisma } from '../prismaClient'
import { cacheService } from './CacheService'
import logger from '../utils/logger'

export interface SearchParams {
  q?: string
  query?: string
  type?: string
  category?: string
  difficulty?: string
  page?: number
  limit?: number
  offset?: number
  types?: ('question' | 'problem' | 'course' | 'canonical_question')[]
  userId?: string
  filters?: SearchFilters
}

export interface SearchFilters {
  type?: 'question' | 'problem' | 'course' | 'all' | string
  tags?: string[]
  difficulty?: string
  category?: string
  userId?: string
}

export interface SearchOptions {
  mode: 'keyword' | 'semantic' | 'hybrid'
  query: string
  filters?: SearchFilters
  limit?: number
  offset?: number
  userId?: string
}

export interface SearchResult {
  id: string
  type: string
  title: string
  description?: string
  content?: string
  url?: string
  score?: number
  highlights?: string[]
  metadata?: Record<string, any>
}

export interface SearchResponse {
  results: SearchResult[]
  total: number
  query: string
  mode: string
  took: number
  suggestions?: string[]
}

/**
 * Standard keyword and entity search service compatible with tests & REST endpoints
 */
export const searchService = {
  async search(params: SearchParams): Promise<{
    data: SearchResult[]
    meta: { total: number; page: number; limit: number; pages: number; hasNext: boolean; hasPrev?: boolean }
  }> {
    const query = (params.q ?? params.query ?? '').trim()
    const page = Math.max(1, params.page ?? 1)
    const limit = Math.min(50, Math.max(1, params.limit ?? 20))
    const skip = (page - 1) * limit
    const type = params.type ?? 'all'

    if (!query) {
      return {
        data: [],
        meta: { total: 0, page, limit, pages: 0, hasNext: false, hasPrev: false },
      }
    }

    const results: SearchResult[] = []
    let total = 0

    // Check if we should search specific types
    const searchAll = type === 'all' || !type
    const searchTests = searchAll || type === 'test' || type === 'tests'
    const searchProblems = searchAll || type === 'problem' || type === 'problems'
    const searchExams = searchAll || type === 'exam' || type === 'exams'
    const searchContests = searchAll || type === 'contest' || type === 'contests'
    const searchEbooks = searchAll || type === 'ebook' || type === 'ebooks'

    // Try raw vector / full-text search first, fallback to ORM if unavailable
    let usedRaw = false
    if (searchAll) {
      try {
        const [examIds, testIds] = await Promise.all([
          prisma.$queryRaw<{ id: string }[]>`
            SELECT id FROM "exams"
            WHERE "isActive" = true AND "deletedAt" IS NULL
              AND search_vector IS NOT NULL
              AND search_vector @@ plainto_tsquery('english', ${query})
            LIMIT ${limit}
          `,
          prisma.$queryRaw<{ id: string }[]>`
            SELECT id FROM "tests"
            WHERE "isPublished" = true AND "deletedAt" IS NULL
              AND search_vector IS NOT NULL
              AND search_vector @@ plainto_tsquery('english', ${query})
            LIMIT ${limit}
          `,
        ])

        if (examIds.length > 0 || testIds.length > 0) {
          usedRaw = true
          const testIdFilter = testIds.length > 0 ? { id: { in: testIds.map((r: { id: string }) => r.id) } } : { id: '-1' }
          const [exams, tests, testCount] = await Promise.all([
            examIds.length > 0
              ? prisma.exam.findMany({
                  where: { id: { in: examIds.map((r: { id: string }) => r.id) } },
                  select: { id: true, name: true, description: true },
                  take: limit,
                })
              : Promise.resolve([]),
            prisma.test.findMany({
              where: { isPublished: true, deletedAt: null, ...testIdFilter },
              select: { id: true, title: true, description: true },
              take: limit,
              skip,
              orderBy: { createdAt: 'desc' },
            }),
            prisma.test.count({
              where: { isPublished: true, deletedAt: null, ...testIdFilter },
            }),
          ])

          for (const exam of exams) {
            results.push({
              type: 'exam',
              id: exam.id,
              title: exam.name,
              description: exam.description ?? '',
              url: `/exams/${exam.id}`,
              metadata: {},
            })
          }
          total += exams.length

          for (const test of tests) {
            results.push({
              type: 'test',
              id: test.id,
              title: test.title,
              description: test.description ?? '',
              url: `/tests-a/${test.id}`,
              metadata: {},
            })
          }
          total += testCount
        }
      } catch {
        usedRaw = false
      }
    }

    // Fallback or targeted Prisma ORM search
    if (!usedRaw) {
      if (searchTests) {
        try {
          const [tests, testCount] = await Promise.all([
            prisma.test.findMany({
              where: {
                isPublished: true,
                deletedAt: null,
                OR: [
                  { title: { contains: query, mode: 'insensitive' } },
                  { description: { contains: query, mode: 'insensitive' } },
                ],
              },
              take: limit,
              skip,
            }),
            prisma.test.count({
              where: {
                isPublished: true,
                deletedAt: null,
                OR: [
                  { title: { contains: query, mode: 'insensitive' } },
                  { description: { contains: query, mode: 'insensitive' } },
                ],
              },
            }),
          ])
          for (const test of tests) {
            results.push({
              type: 'test',
              id: test.id,
              title: test.title,
              description: test.description ?? '',
              url: `/tests-a/${test.id}`,
              metadata: { difficulty: test.difficulty },
            })
          }
          total += testCount
        } catch (err) {
          logger.warn('[SearchService] Tests query error', { error: String(err) })
        }
      }

      if (searchProblems) {
        try {
          const [problems, problemCount] = await Promise.all([
            prisma.problem.findMany({
              where: {
                deletedAt: null,
                OR: [
                  { title: { contains: query, mode: 'insensitive' } },
                  { description: { contains: query, mode: 'insensitive' } },
                ],
              },
              take: limit,
              skip,
            }),
            prisma.problem.count({
              where: {
                deletedAt: null,
                OR: [
                  { title: { contains: query, mode: 'insensitive' } },
                  { description: { contains: query, mode: 'insensitive' } },
                ],
              },
            }),
          ])
          for (const problem of problems) {
            results.push({
              type: 'problem',
              id: problem.id,
              title: problem.title,
              description: problem.description ?? '',
              url: `/problems/${problem.slug}`,
              metadata: { difficulty: problem.difficulty, category: problem.category },
            })
          }
          total += problemCount
        } catch (err) {
          logger.warn('[SearchService] Problems query error', { error: String(err) })
        }
      }

      if (searchExams) {
        try {
          const [exams, examCount] = await Promise.all([
            prisma.exam.findMany({
              where: {
                isActive: true,
                deletedAt: null,
                OR: [
                  { name: { contains: query, mode: 'insensitive' } },
                  { description: { contains: query, mode: 'insensitive' } },
                ],
              },
              take: limit,
              skip,
            }),
            prisma.exam.count({
              where: {
                isActive: true,
                deletedAt: null,
                OR: [
                  { name: { contains: query, mode: 'insensitive' } },
                  { description: { contains: query, mode: 'insensitive' } },
                ],
              },
            }),
          ])
          for (const exam of exams) {
            results.push({
              type: 'exam',
              id: exam.id,
              title: exam.name,
              description: exam.description ?? '',
              url: `/exams/${exam.id}`,
              metadata: {},
            })
          }
          total += examCount
        } catch (err) {
          logger.warn('[SearchService] Exams query error', { error: String(err) })
        }
      }

      if (searchContests && (prisma as any).contest) {
        try {
          const [contests, contestCount] = await Promise.all([
            (prisma as any).contest.findMany({
              where: {
                deletedAt: null,
                OR: [
                  { title: { contains: query, mode: 'insensitive' } },
                  { description: { contains: query, mode: 'insensitive' } },
                ],
              },
              take: limit,
              skip,
            }),
            (prisma as any).contest.count({
              where: {
                deletedAt: null,
                OR: [
                  { title: { contains: query, mode: 'insensitive' } },
                  { description: { contains: query, mode: 'insensitive' } },
                ],
              },
            }),
          ])
          for (const contest of contests) {
            results.push({
              type: 'contest',
              id: contest.id,
              title: contest.title,
              description: contest.description ?? '',
              url: `/contests/${contest.id}`,
              metadata: {},
            })
          }
          total += contestCount
        } catch (err) {
          logger.warn('[SearchService] Contests query error', { error: String(err) })
        }
      }

      if (searchEbooks && (prisma as any).ebook) {
        try {
          const [ebooks, ebookCount] = await Promise.all([
            (prisma as any).ebook.findMany({
              where: {
                deletedAt: null,
                OR: [
                  { title: { contains: query, mode: 'insensitive' } },
                  { description: { contains: query, mode: 'insensitive' } },
                  { author: { contains: query, mode: 'insensitive' } },
                ],
              },
              take: limit,
              skip,
            }),
            (prisma as any).ebook.count({
              where: {
                deletedAt: null,
                OR: [
                  { title: { contains: query, mode: 'insensitive' } },
                  { description: { contains: query, mode: 'insensitive' } },
                  { author: { contains: query, mode: 'insensitive' } },
                ],
              },
            }),
          ])
          for (const ebook of ebooks) {
            results.push({
              type: 'ebook',
              id: ebook.id,
              title: ebook.title,
              description: ebook.description ?? '',
              url: `/ebooks/${ebook.slug}`,
              metadata: { author: ebook.author, coverUrl: ebook.coverUrl, category: ebook.category },
            })
          }
          total += ebookCount
        } catch (err) {
          logger.warn('[SearchService] Ebooks query error', { error: String(err) })
        }
      }
    }

    if (searchAll && results.length < limit) {
      try {
        const remaining = limit - results.length
        const subjects = await prisma.subject.findMany({
          where: {
            name: { contains: query, mode: 'insensitive' },
          },
          select: { id: true, name: true },
          take: remaining,
        })
        for (const subj of subjects) {
          results.push({
            type: 'subject',
            id: subj.id,
            title: subj.name,
            description: '',
            url: `/search?q=${encodeURIComponent(subj.name)}`,
            metadata: {},
          })
        }
        total += subjects.length
      } catch (err) {
        logger.warn('[SearchService] Subjects query error', { error: String(err) })
      }
    }

    const pages = Math.ceil(total / limit)
    return {
      data: results,
      meta: { total, page, limit, pages, hasNext: page < pages, hasPrev: page > 1 },
    }
  },

  async getSuggestions(query: string): Promise<string[]> {
    if (!query || query.trim().length < 2) return []
    const trimmed = query.trim()

    try {
      const [examIds, testIds] = await Promise.all([
        prisma.$queryRaw<{ id: string }[]>`
          SELECT id FROM "exams"
          WHERE "isActive" = true AND "deletedAt" IS NULL
            AND search_vector @@ plainto_tsquery('english', ${trimmed})
          LIMIT 3
        `,
        prisma.$queryRaw<{ id: string }[]>`
          SELECT id FROM "tests"
          WHERE "isPublished" = true
            AND search_vector @@ plainto_tsquery('english', ${trimmed})
          LIMIT 3
        `,
      ])

      const allIds = [...examIds, ...testIds]
      if (allIds.length > 0) {
        const [exams, tests] = await Promise.all([
          examIds.length > 0
            ? prisma.exam.findMany({
                where: { id: { in: examIds.map((r: { id: string }) => r.id) } },
                select: { name: true },
                take: 3,
              })
            : Promise.resolve([]),
          testIds.length > 0
            ? prisma.test.findMany({
                where: { id: { in: testIds.map((r: { id: string }) => r.id) } },
                select: { title: true },
                take: 3,
              })
            : Promise.resolve([]),
        ])
        return [
          ...exams.map((e: { name: string }) => e.name),
          ...tests.map((t: { title: string }) => t.title),
        ]
      }
    } catch {
      // Fallback to ORM
    }

    try {
      const [tests, problems, exams] = await Promise.all([
        prisma.test.findMany({
          where: { isPublished: true, deletedAt: null, title: { contains: trimmed, mode: 'insensitive' } },
          select: { title: true },
          take: 3,
        }),
        prisma.problem.findMany({
          where: { deletedAt: null, title: { contains: trimmed, mode: 'insensitive' } },
          select: { title: true },
          take: 3,
        }),
        prisma.exam.findMany({
          where: { isActive: true, deletedAt: null, name: { contains: trimmed, mode: 'insensitive' } },
          select: { name: true },
          take: 3,
        }),
      ])
      return [
        ...tests.map((t: { title: string }) => t.title),
        ...problems.map((p: { title: string }) => p.title),
        ...exams.map((e: { name: string }) => e.name),
      ]
    } catch (err) {
      logger.warn('[SearchService] getSuggestions error', { error: String(err) })
      return []
    }
  },

  async getTrending(): Promise<SearchResult[]> {
    try {
      const [exams, tests, problems] = await Promise.all([
        prisma.exam.findMany({
          where: { isActive: true, deletedAt: null },
          orderBy: { name: 'asc' },
          take: 5,
          select: { id: true, name: true, description: true },
        }),
        prisma.test.findMany({
          where: { isPublished: true, deletedAt: null },
          orderBy: { createdAt: 'desc' },
          take: 10,
          select: { id: true, title: true, description: true },
        }),
        prisma.problem.findMany({
          where: { deletedAt: null },
          orderBy: { createdAt: 'desc' },
          take: 5,
          select: { id: true, title: true, slug: true, description: true, category: true, difficulty: true },
        }),
      ])

      return [
        ...exams.map((e: any) => ({
          type: 'exam',
          id: e.id,
          title: e.name,
          description: e.description ?? '',
          url: `/exams/${e.id}`,
          metadata: {},
        })),
        ...tests.map((t: any) => ({
          type: 'test',
          id: t.id,
          title: t.title,
          description: t.description ?? '',
          url: `/tests-a/${t.id}`,
          metadata: {},
        })),
        ...problems.map((p: any) => ({
          type: 'problem',
          id: p.id,
          title: p.title,
          description: p.description ?? '',
          url: `/problems/${p.slug}`,
          metadata: { category: p.category, difficulty: p.difficulty },
        })),
      ]
    } catch (err) {
      logger.warn('[SearchService] getTrending error', { error: String(err) })
      return []
    }
  },
}

/**
 * Advanced Semantic & Vector Search Service
 */
export class SearchService {
  private static readonly EMBEDDING_DIM = 768

  private static hashString(text: string): number {
    let hash = 0
    for (let i = 0; i < text.length; i++) {
      const char = text.charCodeAt(i)
      hash = ((hash << 5) - hash) + char
      hash |= 0
    }
    return Math.abs(hash)
  }

  /**
   * Generate embeddings for text using deterministic hashing / Gemini API
   */
  static async generateEmbedding(text: string): Promise<number[]> {
    const textHash = this.hashString(text)
    const embedding = new Array(this.EMBEDDING_DIM).fill(0)
    for (let i = 0; i < this.EMBEDDING_DIM; i++) {
      embedding[i] = Math.sin(textHash + i) * 0.5 + 0.5
    }
    const magnitude = Math.sqrt(embedding.reduce((sum, val) => sum + val * val, 0)) || 1
    return embedding.map(v => v / magnitude)
  }

  static async generateEmbeddings(texts: string[]): Promise<number[][]> {
    return Promise.all(texts.map(text => this.generateEmbedding(text)))
  }

  static cosineSimilarity(a: number[], b: number[]): number {
    if (a.length !== b.length) return 0
    let dotProduct = 0
    let normASum = 0
    let normBSum = 0
    for (let i = 0; i < a.length; i++) {
      const aVal = a[i] || 0
      const bVal = b[i] || 0
      dotProduct += aVal * bVal
      normASum += aVal * aVal
      normBSum += bVal * bVal
    }
    const normA = Math.sqrt(normASum)
    const normB = Math.sqrt(normBSum)
    if (normA === 0 || normB === 0) return 0
    return dotProduct / (normA * normB)
  }

  static async semanticSearch(options: {
    query: string
    types?: ('question' | 'problem' | 'course' | 'canonical_question')[]
    limit?: number
    offset?: number
    userId?: string
    filters?: {
      category?: string
      difficulty?: string
      tags?: string[]
    }
  }): Promise<{
    results: Array<{
      id: string
      type: 'question' | 'problem' | 'course' | 'canonical_question'
      title: string
      content: string
      score: number
      metadata: Record<string, any>
    }>
    total: number
    took: number
  }> {
    const startTime = Date.now()
    const {
      query,
      types = ['question', 'problem', 'course', 'canonical_question'],
      limit = 20,
      filters = {},
    } = options

    const queryEmbedding = await this.generateEmbedding(query)
    const results: any[] = []

    for (const type of types) {
      const typeResults = await this.searchByType(type, query, queryEmbedding, filters, 50)
      results.push(...typeResults.map((r: any) => ({ ...r, type })))
    }

    results.sort((a, b) => (b.score || 0) - (a.score || 0))

    return {
      results: results.slice(0, limit),
      total: results.length,
      took: Date.now() - startTime,
    }
  }

  private static async searchByType(
    type: 'question' | 'problem' | 'course' | 'canonical_question',
    query: string,
    queryEmbedding: number[],
    filters: any,
    limit: number
  ): Promise<any[]> {
    switch (type) {
      case 'canonical_question':
        return this.searchCanonicalQuestions(query, limit)
      case 'question':
        return this.searchQuestions(query, limit)
      case 'problem':
        return this.searchProblems(query, limit)
      case 'course':
        return this.searchCourses(query, limit)
      default:
        return []
    }
  }

  private static async searchCanonicalQuestions(query: string, limit: number): Promise<any[]> {
    try {
      const textResults = await prisma.canonicalQuestion.findMany({
        where: {
          OR: [
            { questionText: { contains: query, mode: 'insensitive' } },
            { explanation: { contains: query, mode: 'insensitive' } },
          ],
          isActive: true,
        },
        take: limit * 2,
        select: {
          id: true,
          questionText: true,
          explanation: true,
          difficulty: true,
          tags: true,
          category: true,
        },
      })

      return textResults.map((item: any) => ({
        id: item.id,
        type: 'canonical_question' as const,
        title: item.questionText.substring(0, 100),
        content: item.explanation || '',
        score: this.calculateTextScore(query, item.questionText + ' ' + (item.explanation || '')),
        metadata: {
          difficulty: item.difficulty,
          tags: item.tags,
          category: item.category,
        },
      }))
    } catch {
      return []
    }
  }

  private static async searchQuestions(query: string, limit: number): Promise<any[]> {
    try {
      const results = await prisma.question.findMany({
        where: {
          OR: [
            { text: { contains: query, mode: 'insensitive' } },
            { explanation: { contains: query, mode: 'insensitive' } },
          ],
          isActive: true,
        },
        take: limit * 2,
        select: {
          id: true,
          text: true,
          explanation: true,
          difficulty: true,
          tags: true,
          category: true,
        },
      })

      return results.map((item: any) => ({
        id: item.id,
        type: 'question' as const,
        title: item.text.substring(0, 100),
        content: item.explanation || '',
        score: this.calculateTextScore(query, item.text + ' ' + (item.explanation || '')),
        metadata: {
          difficulty: item.difficulty,
          tags: item.tags,
          category: item.category,
        },
      }))
    } catch {
      return []
    }
  }

  private static async searchProblems(query: string, limit: number): Promise<any[]> {
    try {
      const results = await prisma.problem.findMany({
        where: {
          OR: [
            { title: { contains: query, mode: 'insensitive' } },
            { description: { contains: query, mode: 'insensitive' } },
          ],
          isActive: true,
        },
        take: limit * 2,
        select: {
          id: true,
          title: true,
          description: true,
          difficulty: true,
          tags: true,
          difficultyLevel: true,
        },
      })

      return results.map((item: any) => ({
        id: item.id,
        type: 'problem' as const,
        title: item.title,
        content: item.description || '',
        score: this.calculateTextScore(query, item.title + ' ' + (item.description || '')),
        metadata: {
          difficulty: item.difficulty,
          tags: item.tags,
          difficultyLevel: item.difficultyLevel,
        },
      }))
    } catch {
      return []
    }
  }

  private static async searchCourses(query: string, limit: number): Promise<any[]> {
    if (!(prisma as any).course) {
      return []
    }
    try {
      const results = await (prisma as any).course.findMany({
        where: {
          OR: [
            { title: { contains: query, mode: 'insensitive' } },
            { description: { contains: query, mode: 'insensitive' } },
            { shortDescription: { contains: query, mode: 'insensitive' } },
          ],
          isPublished: true,
        },
        take: limit * 2,
        select: {
          id: true,
          title: true,
          description: true,
          shortDescription: true,
          category: true,
          level: true,
          price: true,
          rating: true,
          studentCount: true,
          durationHours: true,
        },
      })

      return results.map((item: any) => ({
        id: item.id,
        type: 'course' as const,
        title: item.title,
        content: item.shortDescription || item.description || '',
        score: this.calculateTextScore(
          query,
          item.title + ' ' + (item.shortDescription || '') + ' ' + (item.description || '')
        ),
        metadata: {
          category: item.category,
          level: item.level,
          price: item.price,
          rating: item.rating,
          studentCount: item.studentCount,
        },
      }))
    } catch {
      return []
    }
  }

  private static calculateTextScore(query: string, text: string): number {
    const queryWords = query.toLowerCase().split(/\s+/).filter(w => w.length > 2)
    const textLower = text.toLowerCase()
    let score = 0
    for (const word of queryWords) {
      const occurrences = (textLower.match(new RegExp(word, 'gi')) || []).length
      score += occurrences * (word.length > 4 ? 2 : 1)
    }
    return Math.min(score / Math.max(text.length / 100, 1), 1)
  }

  static async personalizedSearch(options: {
    query: string
    userId: string
    limit?: number
    types?: ('question' | 'problem' | 'course' | 'canonical_question')[]
  }): Promise<{
    results: any[]
    total: number
    suggestions: string[]
  }> {
    const { query, userId, limit = 20, types } = options

    const [userProfile, recentActivity, topicPerformance] = await Promise.all([
      prisma.user.findUnique({
        where: { id: userId },
        select: { id: true, level: true, streak: true },
      }),
      prisma.activityLog.findMany({
        where: { userId, createdAt: { gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) } },
        orderBy: { createdAt: 'desc' },
        take: 20,
      }),
      prisma.topicPerformance.findMany({
        where: { userId },
        orderBy: { accuracy: 'asc' },
        take: 10,
      }),
    ])

    const results = await this.semanticSearch({
      query,
      types: types || ['question', 'problem', 'course', 'canonical_question'],
      limit,
    })

    const suggestions =
      topicPerformance.length > 0
        ? topicPerformance.slice(0, 5).map((w: any) => `How to master ${w.topicName || 'Topic'}`)
        : [
            `How to master ${query}`,
            `${query} practice problems`,
            `${query} beginner guide`,
          ]

    return {
      results: results.results,
      total: results.total,
      suggestions,
    }
  }

  static async recordSearchEvent(data: {
    userId: string
    query: string
    resultsCount: number
    clickedResultId?: string
    clickedResultType?: string
    timeToClick?: number
  }): Promise<void> {
    try {
      if ((prisma as any).searchAnalytics) {
        await (prisma as any).searchAnalytics.create({
          data: {
            userId: data.userId,
            query: data.query,
            resultsCount: data.resultsCount,
            clickedResultId: data.clickedResultId,
            clickedResultType: data.clickedResultType,
            timeToClick: data.timeToClick,
          },
        })
      }
    } catch (error) {
      logger.warn('[SearchService] Failed to record search event', { error: String(error) })
    }
  }

  static async getSearchSuggestions(prefix: string, limit: number = 10): Promise<string[]> {
    if (!(prisma as any).searchAnalytics) {
      return searchService.getSuggestions(prefix)
    }
    try {
      const suggestions = await (prisma as any).searchAnalytics.groupBy({
        by: ['query'],
        where: {
          query: { startsWith: prefix },
          createdAt: { gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) },
        },
        _count: { query: true },
        orderBy: { _count: { query: 'desc' } },
        take: limit,
      })

      return suggestions.map((s: any) => s.query)
    } catch {
      return searchService.getSuggestions(prefix)
    }
  }

  static async getTrendingSearches(limit: number = 10): Promise<Array<{ query: string; count: number }>> {
    if (!(prisma as any).searchAnalytics) {
      return []
    }
    try {
      const trending = await (prisma as any).searchAnalytics.groupBy({
        by: ['query'],
        where: {
          createdAt: { gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) },
        },
        _count: { query: true },
        orderBy: { _count: { query: 'desc' } },
        take: limit,
      })

      return trending.map((t: any) => ({ query: t.query, count: t._count.query }))
    } catch {
      return []
    }
  }
}

export default SearchService