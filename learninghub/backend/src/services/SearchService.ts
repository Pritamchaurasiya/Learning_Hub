import { prisma } from '../prismaClient'

export interface SearchParams {
  q?: string
  type?: string
  category?: string
  difficulty?: string
  page?: number
  limit?: number
}

export interface SearchResult {
  type: string
  id: string
  title: string
  description: string
  url: string
  metadata: Record<string, unknown>
}

export const searchService = {
  async search(params: SearchParams) {
    const query = params.q?.trim() ?? ''
    const page = Math.max(1, params.page ?? 1)
    const limit = Math.min(50, Math.max(1, params.limit ?? 20))
    const skip = (page - 1) * limit

    if (!query) {
      return { data: [], meta: { total: 0, page, limit, pages: 0 } }
    }

    const results: SearchResult[] = []
    let total = 0

    const [examIds, testIds] = query
      ? await Promise.all([
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
      : [[], []]
    const testIdFilter =
      testIds.length > 0 ? { id: { in: testIds.map((r: { id: string }) => r.id) } } : { id: '-1' }

    const [exams, tests, _total] = await Promise.all([
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
    total += _total

    if (results.length < limit) {
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
    }

    const pages = Math.ceil(total / limit)

    return {
      data: results,
      meta: { total, page, limit, pages, hasNext: page < pages, hasPrev: page > 1 },
    }
  },

  async getSuggestions(query: string): Promise<string[]> {
    if (!query || query.length < 2) return []
    const [examIds, testIds] = await Promise.all([
      prisma.$queryRaw<{ id: string }[]>`
        SELECT id FROM "exams"
        WHERE "isActive" = true AND "deletedAt" IS NULL
          AND search_vector @@ plainto_tsquery('english', ${query})
        LIMIT 3
      `,
      prisma.$queryRaw<{ id: string }[]>`
        SELECT id FROM "tests"
        WHERE "isPublished" = true
          AND search_vector @@ plainto_tsquery('english', ${query})
        LIMIT 3
      `,
    ])
    const allIds = [...examIds, ...testIds]
    if (allIds.length === 0) return []
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
  },

  async getTrending(): Promise<SearchResult[]> {
    const [exams, tests] = await Promise.all([
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
    ])
    return [
      ...exams.map((e: { id: string; name: string; description: string | null }) => ({
        type: 'exam' as const,
        id: e.id,
        title: e.name,
        description: e.description ?? '',
        url: `/exams/${e.id}`,
        metadata: {},
      })),
      ...tests.map((t: { id: string; title: string; description: string | null }) => ({
        type: 'test' as const,
        id: t.id,
        title: t.title,
        description: t.description ?? '',
        url: `/tests-a/${t.id}`,
        metadata: {},
      })),
    ]
  },
}
