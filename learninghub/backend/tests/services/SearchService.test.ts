import { searchService } from '../../src/services/SearchService'
import { prisma } from '../../src/prismaClient'

// Mock prisma client
jest.mock('../../src/prismaClient', () => ({
  prisma: {
    $queryRaw: jest.fn(),
    test: {
      findMany: jest.fn(),
      count: jest.fn(),
    },
    problem: {
      findMany: jest.fn(),
      count: jest.fn(),
    },
    exam: {
      findMany: jest.fn(),
      count: jest.fn(),
    },
    contest: {
      findMany: jest.fn(),
      count: jest.fn(),
    },
    ebook: {
      findMany: jest.fn(),
      count: jest.fn(),
    },
    subject: {
      findMany: jest.fn(),
    },
  },
}))

describe('SearchService', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('returns empty results when query string is empty', async () => {
    const res = await searchService.search({ q: '' })
    expect(res.data).toEqual([])
    expect(res.meta.total).toBe(0)
    expect(res.meta.pages).toBe(0)
    expect(res.meta.hasNext).toBe(false)
  })

  it('searches across multiple entities with type=all using fallback Prisma query', async () => {
    // Simulate Postgres raw query throwing (forcing fallback to Prisma ORM)
    ;(prisma.$queryRaw as jest.Mock).mockRejectedValue(new Error('relation does not exist'))

    ;(prisma.test.findMany as jest.Mock).mockResolvedValue([
      { id: 't1', title: 'Data Structures Mock Test', description: 'Advanced test', difficulty: 'HARD' },
    ])
    ;(prisma.test.count as jest.Mock).mockResolvedValue(1)

    ;(prisma.problem.findMany as jest.Mock).mockResolvedValue([
      { id: 'p1', title: 'Binary Search Problem', slug: 'binary-search', description: 'Find target in sorted array', difficulty: 'EASY', category: 'DSA' },
    ])
    ;(prisma.problem.count as jest.Mock).mockResolvedValue(1)

    ;(prisma.exam.findMany as jest.Mock).mockResolvedValue([
      { id: 'e1', name: 'GATE CS Exam', description: 'National engineering entrance' },
    ])
    ;(prisma.exam.count as jest.Mock).mockResolvedValue(1)

    ;(prisma.contest.findMany as jest.Mock).mockResolvedValue([])
    ;(prisma.contest.count as jest.Mock).mockResolvedValue(0)

    ;(prisma.ebook.findMany as jest.Mock).mockResolvedValue([
      { id: 'eb1', title: 'Algorithms Handbook', slug: 'algo-book', author: 'Dr. Knuth', description: 'Comprehensive guide', coverUrl: 'http://img.png', category: 'Computer Science' },
    ])
    ;(prisma.ebook.count as jest.Mock).mockResolvedValue(1)

    ;(prisma.subject.findMany as jest.Mock).mockResolvedValue([])

    const res = await searchService.search({ q: 'Search', type: 'all', page: 1, limit: 10 })

    expect(res.data.length).toBe(4)
    expect(res.meta.total).toBe(4)

    const types = res.data.map((d: any) => d.type)
    expect(types).toContain('test')
    expect(types).toContain('problem')
    expect(types).toContain('exam')
    expect(types).toContain('ebook')
  })

  it('filters specifically for problems when type=problem', async () => {
    ;(prisma.$queryRaw as jest.Mock).mockRejectedValue(new Error('raw query disabled'))

    ;(prisma.problem.findMany as jest.Mock).mockResolvedValue([
      { id: 'p2', title: 'Two Sum Problem', slug: 'two-sum', description: 'Hash map solution', difficulty: 'EASY', category: 'Arrays' },
    ])
    ;(prisma.problem.count as jest.Mock).mockResolvedValue(1)

    const res = await searchService.search({ q: 'sum', type: 'problem' })

    expect(res.data.length).toBe(1)
    expect(res.data[0].type).toBe('problem')
    expect(res.data[0].title).toBe('Two Sum Problem')
    expect(prisma.test.findMany).not.toHaveBeenCalled()
    expect(prisma.exam.findMany).not.toHaveBeenCalled()
  })

  it('filters specifically for tests when type=test', async () => {
    ;(prisma.$queryRaw as jest.Mock).mockRejectedValue(new Error('raw query disabled'))

    ;(prisma.test.findMany as jest.Mock).mockResolvedValue([
      { id: 't-mock', title: 'Full Length Test 1', description: 'Simulated exam', difficulty: 'MEDIUM' },
    ])
    ;(prisma.test.count as jest.Mock).mockResolvedValue(1)

    const res = await searchService.search({ q: 'full length', type: 'test' })

    expect(res.data.length).toBe(1)
    expect(res.data[0].type).toBe('test')
    expect(res.data[0].title).toBe('Full Length Test 1')
    expect(prisma.problem.findMany).not.toHaveBeenCalled()
  })

  it('returns autocompletion suggestions from tests, problems, and exams', async () => {
    ;(prisma.test.findMany as jest.Mock).mockResolvedValue([{ title: 'Dynamic Programming Test' }])
    ;(prisma.problem.findMany as jest.Mock).mockResolvedValue([{ title: 'Dynamic Programming Fibonacci' }])
    ;(prisma.exam.findMany as jest.Mock).mockResolvedValue([{ name: 'DP Master Certification' }])

    const suggestions = await searchService.getSuggestions('Dynamic')

    expect(suggestions).toHaveLength(3)
    expect(suggestions).toContain('Dynamic Programming Test')
    expect(suggestions).toContain('Dynamic Programming Fibonacci')
    expect(suggestions).toContain('DP Master Certification')
  })

  it('returns empty suggestions when query is less than 2 characters', async () => {
    const suggestions = await searchService.getSuggestions('a')
    expect(suggestions).toEqual([])
  })

  it('returns trending entities across exams, tests, and problems', async () => {
    ;(prisma.exam.findMany as jest.Mock).mockResolvedValue([
      { id: 'ex-trend', name: 'Trending Exam 2026', description: 'Hot topic' },
    ])
    ;(prisma.test.findMany as jest.Mock).mockResolvedValue([
      { id: 't-trend', title: 'Trending Test', description: 'Weekly challenge', difficulty: 'HARD' },
    ])
    ;(prisma.problem.findMany as jest.Mock).mockResolvedValue([
      { id: 'p-trend', title: 'Trending Graph Problem', slug: 'graph-problem', description: 'Dijkstra', difficulty: 'MEDIUM', category: 'Graphs' },
    ])

    const trending = await searchService.getTrending()

    expect(trending.length).toBe(3)
    const types = trending.map((t: any) => t.type)
    expect(types).toContain('exam')
    expect(types).toContain('test')
    expect(types).toContain('problem')
  })
})
