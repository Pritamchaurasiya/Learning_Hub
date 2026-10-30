import { ExamContentService } from '../../services/ExamContentService'
import { ExamType, Prisma } from '@prisma/client'

// Mock prismaClient
jest.mock('../../prismaClient', () => ({
  prisma: {
    pYQ: {
      findMany: jest.fn(),
      create: jest.fn(),
      findUnique: jest.fn(),
      count: jest.fn(),
    },
    formula: {
      findMany: jest.fn(),
    },
    revisionNote: {
      findMany: jest.fn(),
    },
    country: {
      findMany: jest.fn(),
    },
    exam: {
      findMany: jest.fn(),
    },
    subject: {
      findMany: jest.fn(),
    },
  },
}))

import { prisma } from '../../prismaClient'

describe('ExamContentService (Milestone 33 International Exam Tracks & Curriculums)', () => {
  let service: ExamContentService

  beforeEach(() => {
    service = new ExamContentService()
    jest.clearAllMocks()
  })

  describe('getPYQs', () => {
    it('retrieves PYQs with filters and pagination', async () => {
      const mockPYQs = [
        { id: 'pyq-1', examType: ExamType.JEE_MAIN, year: 2023, subjectName: 'Physics', question: 'Q1', options: ['A', 'B', 'C', 'D'], answer: 'A', explanation: 'Exp', difficulty: 'MEDIUM', marks: 4, negativeMarks: 1, tags: ['mechanics'] },
        { id: 'pyq-2', examType: ExamType.NEET_UG, year: 2022, subjectName: 'Chemistry', question: 'Q2', options: ['A', 'B', 'C', 'D'], answer: 'B', explanation: 'Exp', difficulty: 'EASY', marks: 4, negativeMarks: 1, tags: ['organic'] },
      ]
      ;(prisma.pYQ.findMany as jest.Mock).mockResolvedValue(mockPYQs)
      ;(prisma.pYQ.count as jest.Mock).mockResolvedValue(2)

      const result = await service.getPYQs({ examType: ExamType.JEE_MAIN, year: 2023, subject: 'Physics', page: 1, limit: 20 })

      expect(result.data).toHaveLength(2)
      expect(result.meta).toEqual({ total: 2, page: 1, limit: 20, pages: 1 })
      expect(prisma.pYQ.findMany).toHaveBeenCalledWith(expect.objectContaining({
        where: expect.objectContaining({ examType: ExamType.JEE_MAIN, year: 2023, subjectName: { contains: 'Physics', mode: 'insensitive' } }),
        skip: 0,
        take: 20,
        orderBy: { year: 'desc' },
      }))
    })

    it('uses default pagination when not provided', async () => {
      ;(prisma.pYQ.findMany as jest.Mock).mockResolvedValue([])
      ;(prisma.pYQ.count as jest.Mock).mockResolvedValue(0)

      const result = await service.getPYQs({})

      expect(result.meta).toEqual({ total: 0, page: 1, limit: 20, pages: 0 })
    })

    it('handles subject filter with case-insensitive search', async () => {
      ;(prisma.pYQ.findMany as jest.Mock).mockResolvedValue([])
      ;(prisma.pYQ.count as jest.Mock).mockResolvedValue(0)

      await service.getPYQs({ subject: 'physics' })

      expect(prisma.pYQ.findMany).toHaveBeenCalledWith(expect.objectContaining({
        where: expect.objectContaining({ subjectName: { contains: 'physics', mode: 'insensitive' } }),
      }))
    })
  })

  describe('createPYQ', () => {
    it('creates a new PYQ with all fields', async () => {
      const input = {
        examType: ExamType.NEET_UG,
        year: 2024,
        paper: 'NEET UG 2024',
        subject: 'Biology',
        question: 'What is the powerhouse of the cell?',
        options: ['Mitochondria', 'Nucleus', 'Ribosome', 'Golgi'],
        answer: 'Mitochondria',
        explanation: 'Mitochondria produces ATP',
        difficulty: 'EASY',
        marks: 4,
        negativeMarks: 1,
        tags: ['cell-biology', 'mitochondria'],
      }
      const created = { id: 'pyq-new', ...input, subjectName: input.subject }
      ;(prisma.pYQ.create as jest.Mock).mockResolvedValue(created)

      const result = await service.createPYQ(input)

      expect(result).toEqual(created)
      expect(prisma.pYQ.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          examType: ExamType.NEET_UG,
          year: 2024,
          paper: 'NEET UG 2024',
          subjectName: 'Biology',
          question: 'What is the powerhouse of the cell?',
          options: ['Mitochondria', 'Nucleus', 'Ribosome', 'Golgi'],
          answer: 'Mitochondria',
          explanation: 'Mitochondria produces ATP',
          difficulty: 'EASY',
          marks: 4,
          negativeMarks: 1,
          tags: ['cell-biology', 'mitochondria'],
        }),
      })
    })
  })

  describe('getPYQById', () => {
    it('returns PYQ when found', async () => {
      const mockPYQ = { id: 'pyq-1', examType: ExamType.JEE_MAIN, year: 2023, subjectName: 'Physics', question: 'Q1', options: ['A', 'B'], answer: 'A', explanation: 'Exp', difficulty: 'MEDIUM', marks: 4, negativeMarks: 1, tags: [] }
      ;(prisma.pYQ.findUnique as jest.Mock).mockResolvedValue(mockPYQ)

      const result = await service.getPYQById('pyq-1')

      expect(result).toEqual(mockPYQ)
      expect(prisma.pYQ.findUnique).toHaveBeenCalledWith({ where: { id: 'pyq-1' } })
    })

    it('returns null when not found', async () => {
      ;(prisma.pYQ.findUnique as jest.Mock).mockResolvedValue(null)

      const result = await service.getPYQById('non-existent')

      expect(result).toBeNull()
    })
  })

  describe('getFormulas', () => {
    it('returns formulas with filters', async () => {
      const mockFormulas = [
        { id: 'f-1', examType: ExamType.JEE_MAIN, topic: 'Physics - Mechanics', formula: 'F = ma', description: 'Newton\'s second law' },
        { id: 'f-2', examType: ExamType.JEE_MAIN, topic: 'Physics - Optics', formula: 'n1 sin i = n2 sin r', description: 'Snell\'s law' },
      ]
      ;(prisma.formula.findMany as jest.Mock).mockResolvedValue(mockFormulas)

      const result = await service.getFormulas({ examType: ExamType.JEE_MAIN, subject: 'Physics' })

      expect(result).toHaveLength(2)
      expect(prisma.formula.findMany).toHaveBeenCalledWith(expect.objectContaining({
        where: expect.objectContaining({ examType: ExamType.JEE_MAIN, topic: { contains: 'Physics', mode: 'insensitive' } }),
        orderBy: { createdAt: 'desc' },
      }))
    })

    it('returns empty array when no formulas match', async () => {
      ;(prisma.formula.findMany as jest.Mock).mockResolvedValue([])

      const result = await service.getFormulas({ examType: ExamType.NEET_UG, subject: 'NonExistent' })

      expect(result).toEqual([])
    })
  })

  describe('getRevisionNotes', () => {
    it('returns revision notes with filters', async () => {
      const mockNotes = [
        { id: 'rn-1', examType: ExamType.JEE_ADVANCED, topic: 'Physics - Thermodynamics', content: 'Entropy always increases' },
        { id: 'rn-2', examType: ExamType.JEE_ADVANCED, topic: 'Physics - Electrodynamics', content: 'Maxwell\'s equations' },
      ]
      ;(prisma.revisionNote.findMany as jest.Mock).mockResolvedValue(mockNotes)

      const result = await service.getRevisionNotes({ examType: ExamType.JEE_ADVANCED, subject: 'Physics' })

      expect(result).toHaveLength(2)
      expect(prisma.revisionNote.findMany).toHaveBeenCalledWith(expect.objectContaining({
        where: expect.objectContaining({ examType: ExamType.JEE_ADVANCED, topic: { contains: 'Physics', mode: 'insensitive' } }),
        orderBy: { createdAt: 'desc' },
      }))
    })
  })

  describe('getCountries', () => {
    it('returns countries from database when available', async () => {
      const dbCountries = [
        { id: 'country-in', name: 'India', code: 'IN', flagEmoji: '🇮🇳', isActive: true, exams: [{ id: 'exam-jee-main', name: 'JEE Main', slug: 'jee-main' }] },
      ]
      ;(prisma.country.findMany as jest.Mock).mockResolvedValue(dbCountries)

      const result = await service.getCountries()

      expect(result).toEqual(dbCountries)
      expect(prisma.country.findMany).toHaveBeenCalledWith(expect.objectContaining({
        where: { isActive: true },
        include: { exams: { where: { isActive: true }, select: { id: true, name: true, slug: true } } },
        orderBy: { name: 'asc' },
      }))
    })

    it('falls back to curated countries when database fails', async () => {
      ;(prisma.country.findMany as jest.Mock).mockRejectedValue(new Error('DB connection failed'))

      const result = await service.getCountries()

      expect(result).toBeDefined()
      expect(Array.isArray(result)).toBe(true)
      expect(result.length).toBeGreaterThan(0)
      // Check curated fallback structure
      const india = result.find((c: any) => c.code === 'IN')
      expect(india).toBeDefined()
      expect(india.name).toBe('India')
      expect(india.exams).toBeDefined()
      expect(india.exams.length).toBeGreaterThan(0)
    })

    it('falls back to curated countries when database returns empty', async () => {
      ;(prisma.country.findMany as jest.Mock).mockResolvedValue([])

      const result = await service.getCountries()

      expect(result).toBeDefined()
      expect(result.length).toBeGreaterThan(0)
    })
  })

  describe('getExams', () => {
    it('returns exams from database with filters', async () => {
      const dbExams = [
        { id: 'exam-jee-main', name: 'JEE Main', slug: 'jee-main', countryId: 'country-in', country: { id: 'country-in', name: 'India', code: 'IN' }, subjects: [{ id: 'sub-1', name: 'Physics', slug: 'physics' }] },
      ]
      ;(prisma.exam.findMany as jest.Mock).mockResolvedValue(dbExams)

      const result = await service.getExams({ countryId: 'country-in', search: 'JEE' })

      expect(result).toEqual(dbExams)
      expect(prisma.exam.findMany).toHaveBeenCalledWith(expect.objectContaining({
        where: expect.objectContaining({
          isActive: true,
          deletedAt: null,
          countryId: 'country-in',
          OR: expect.arrayContaining([
            expect.objectContaining({ name: { contains: 'JEE', mode: 'insensitive' } }),
            expect.objectContaining({ description: { contains: 'JEE', mode: 'insensitive' } }),
          ]),
        }),
        include: expect.objectContaining({
          country: { select: { id: true, name: true, code: true } },
          subjects: { select: { id: true, name: true, slug: true } },
        }),
        orderBy: { name: 'asc' },
      }))
    })

    it('filters by country code when countryId not provided', async () => {
      ;(prisma.exam.findMany as jest.Mock).mockResolvedValue([])

      await service.getExams({ country: 'IN' })

      expect(prisma.exam.findMany).toHaveBeenCalledWith(expect.objectContaining({
        where: expect.objectContaining({
          country: { code: { equals: 'IN', mode: 'insensitive' } },
        }),
      }))
    })

    it('falls back to curated exams when database fails', async () => {
      ;(prisma.exam.findMany as jest.Mock).mockRejectedValue(new Error('DB failed'))

      const result = await service.getExams({})

      expect(result).toBeDefined()
      expect(result.length).toBeGreaterThan(0)
      const jeeMain = result.find((e: any) => e.slug === 'jee-main')
      expect(jeeMain).toBeDefined()
      expect(jeeMain.subjects).toBeDefined()
      expect(jeeMain.subjects.length).toBe(3)
    })

    it('filters fallback exams by countryId', async () => {
      ;(prisma.exam.findMany as jest.Mock).mockRejectedValue(new Error('DB failed'))

      const result = await service.getExams({ countryId: 'country-us' })

      expect(result.every((e: any) => e.countryId === 'country-us')).toBe(true)
    })

    it('filters fallback exams by country code', async () => {
      ;(prisma.exam.findMany as jest.Mock).mockRejectedValue(new Error('DB failed'))

      const result = await service.getExams({ country: 'GB' })

      expect(result.every((e: any) => e.country.code === 'GB')).toBe(true)
    })

    it('filters fallback exams by search query', async () => {
      ;(prisma.exam.findMany as jest.Mock).mockRejectedValue(new Error('DB failed'))

      const result = await service.getExams({ search: 'sat' })

      expect(result.some((e: any) => e.slug === 'sat')).toBe(true)
      expect(result.every((e: any) => e.name.toLowerCase().includes('sat') || e.slug.includes('sat') || e.description.toLowerCase().includes('sat') || e.category.toLowerCase().includes('sat'))).toBe(true)
    })
  })

  describe('getExamCurriculum', () => {
    it('delegates to getSubjects', async () => {
      const mockSubjects = [{ id: 'sub-1', name: 'Physics', slug: 'physics', topics: [] }]
      ;(prisma.subject.findMany as jest.Mock).mockResolvedValue(mockSubjects)

      const result = await service.getExamCurriculum('exam-jee-main')

      expect(result).toEqual(mockSubjects)
    })
  })

  describe('getSubjects', () => {
    it('returns subjects from database with topics', async () => {
      const dbSubjects = [
        { id: 'sub-1', name: 'Physics', slug: 'physics', examId: 'exam-jee-main', topics: [{ id: 'top-1', name: 'Mechanics', slug: 'mechanics' }] },
      ]
      ;(prisma.subject.findMany as jest.Mock).mockResolvedValue(dbSubjects)

      const result = await service.getSubjects('exam-jee-main')

      expect(result).toEqual(dbSubjects)
      expect(prisma.subject.findMany).toHaveBeenCalledWith(expect.objectContaining({
        where: { examId: 'exam-jee-main', deletedAt: null },
        include: { topics: { select: { id: true, name: true, slug: true } } },
        orderBy: { name: 'asc' },
      }))
    })

    it('returns fallback JEE Advanced subjects', async () => {
      ;(prisma.subject.findMany as jest.Mock).mockRejectedValue(new Error('DB failed'))

      const result = await service.getSubjects('exam-jee-advanced')

      expect(result.length).toBe(3)
      const physics = result.find((s: any) => s.slug === 'jee-adv-physics')
      expect(physics).toBeDefined()
      expect(physics.topics.length).toBeGreaterThan(0)
      expect(physics.topics.some((t: any) => t.slug === 'adv-mechanics')).toBe(true)
    })

    it('returns fallback JEE Main subjects', async () => {
      ;(prisma.subject.findMany as jest.Mock).mockRejectedValue(new Error('DB failed'))

      const result = await service.getSubjects('exam-jee-main')

      expect(result.length).toBe(3)
      const math = result.find((s: any) => s.slug === 'jee-main-mathematics')
      expect(math).toBeDefined()
      expect(math.topics.some((t: any) => t.slug === 'calculus-derivatives')).toBe(true)
    })

    it('returns fallback NEET subjects', async () => {
      ;(prisma.subject.findMany as jest.Mock).mockRejectedValue(new Error('DB failed'))

      const result = await service.getSubjects('exam-neet-ug')

      expect(result.length).toBe(3)
      expect(result.some((s: any) => s.slug === 'neet-biology')).toBe(true)
      expect(result.some((s: any) => s.slug === 'neet-physics')).toBe(true)
      expect(result.some((s: any) => s.slug === 'neet-chemistry')).toBe(true)
    })

    it('returns fallback SSC subjects', async () => {
      ;(prisma.subject.findMany as jest.Mock).mockRejectedValue(new Error('DB failed'))

      const result = await service.getSubjects('exam-ssc-cgl')

      expect(result.length).toBe(4)
      expect(result.some((s: any) => s.slug === 'ssc-quantitative-aptitude')).toBe(true)
    })

    it('returns fallback UPSC subjects', async () => {
      ;(prisma.subject.findMany as jest.Mock).mockRejectedValue(new Error('DB failed'))

      const result = await service.getSubjects('exam-upsc-cse')

      expect(result.length).toBe(2)
      expect(result.some((s: any) => s.slug === 'upsc-gs-1')).toBe(true)
    })

    it('returns fallback GATE subjects', async () => {
      ;(prisma.subject.findMany as jest.Mock).mockRejectedValue(new Error('DB failed'))

      const result = await service.getSubjects('exam-gate-cse')

      expect(result.length).toBe(3)
      expect(result.some((s: any) => s.slug === 'gate-dsa')).toBe(true)
      expect(result.some((s: any) => s.slug === 'gate-os')).toBe(true)
    })

    it('returns fallback SAT subjects', async () => {
      ;(prisma.subject.findMany as jest.Mock).mockRejectedValue(new Error('DB failed'))

      const result = await service.getSubjects('exam-sat')

      expect(result.length).toBe(2)
      expect(result.some((s: any) => s.slug === 'sat-reading-writing')).toBe(true)
    })

    it('returns fallback CAT subjects', async () => {
      ;(prisma.subject.findMany as jest.Mock).mockRejectedValue(new Error('DB failed'))

      const result = await service.getSubjects('exam-cat-mba')

      expect(result.length).toBe(3)
      expect(result.some((s: any) => s.slug === 'cat-qa')).toBe(true)
    })

    it('returns fallback GRE subjects', async () => {
      ;(prisma.subject.findMany as jest.Mock).mockRejectedValue(new Error('DB failed'))

      const result = await service.getSubjects('exam-gre-general')

      expect(result.length).toBe(3)
      expect(result.some((s: any) => s.slug === 'gre-verbal')).toBe(true)
    })

    it('returns fallback GMAT subjects', async () => {
      ;(prisma.subject.findMany as jest.Mock).mockRejectedValue(new Error('DB failed'))

      const result = await service.getSubjects('gmat-focus')

      expect(result.length).toBe(3)
      expect(result.some((s: any) => s.slug === 'gmat-data-insights')).toBe(true)
    })

    it('returns fallback USMLE subjects', async () => {
      ;(prisma.subject.findMany as jest.Mock).mockRejectedValue(new Error('DB failed'))

      const result = await service.getSubjects('usmle-step-1')

      expect(result.length).toBe(3)
      expect(result.some((s: any) => s.slug === 'usmle-foundations')).toBe(true)
    })

    it('returns fallback MCAT subjects', async () => {
      ;(prisma.subject.findMany as jest.Mock).mockRejectedValue(new Error('DB failed'))

      const result = await service.getSubjects('mcat-2026')

      expect(result.length).toBe(4)
      expect(result.some((s: any) => s.slug === 'mcat-cpbs')).toBe(true)
    })

    it('returns fallback DSA subjects for unmapped exam', async () => {
      ;(prisma.subject.findMany as jest.Mock).mockRejectedValue(new Error('DB failed'))

      const result = await service.getSubjects('unmapped-custom-exam')

      expect(result.length).toBe(3)
      expect(result.some((s: any) => s.slug === 'dsa-core')).toBe(true)
      expect(result.some((s: any) => s.slug === 'system-design')).toBe(true)
    })
  })
})
