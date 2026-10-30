import { ExamContentService } from '../../services/ExamContentService'

// Mock prismaClient
jest.mock('../../prismaClient', () => ({
  prisma: {
    subject: {
      findMany: jest.fn().mockResolvedValue([]),
    },
    examCatalog: {
      findMany: jest.fn().mockResolvedValue([]),
      findUnique: jest.fn().mockResolvedValue(null),
    },
    course: {
      findMany: jest.fn().mockResolvedValue([]),
    },
    test: {
      findMany: jest.fn().mockResolvedValue([]),
    },
  },
}))

describe('ExamContentService (Milestone 33 International Exam Tracks & Curriculums)', () => {
  let service: ExamContentService

  beforeEach(() => {
    service = new ExamContentService()
  })

  it('retrieves comprehensive GRE taxonomy curriculum', async () => {
    const curriculum = await service.getExamCurriculum('exam-gre-general')
    expect(curriculum.length).toBeGreaterThanOrEqual(3)

    const verbal = curriculum.find(s => s.slug === 'gre-verbal')
    const quant = curriculum.find(s => s.slug === 'gre-quant')
    const awa = curriculum.find(s => s.slug === 'gre-awa')

    expect(verbal).toBeDefined()
    expect(quant).toBeDefined()
    expect(awa).toBeDefined()

    expect(verbal?.topics.some(t => t.slug === 'text-completion')).toBe(true)
    expect(quant?.topics.some(t => t.slug === 'gre-algebra')).toBe(true)
  })

  it('retrieves comprehensive GMAT Focus Edition taxonomy curriculum', async () => {
    const curriculum = await service.getExamCurriculum('gmat-focus')
    expect(curriculum.length).toBeGreaterThanOrEqual(3)

    const quant = curriculum.find(s => s.slug === 'gmat-quant')
    const verbal = curriculum.find(s => s.slug === 'gmat-verbal')
    const di = curriculum.find(s => s.slug === 'gmat-data-insights')

    expect(quant).toBeDefined()
    expect(verbal).toBeDefined()
    expect(di).toBeDefined()

    expect(di?.topics.some(t => t.slug === 'data-sufficiency')).toBe(true)
  })

  it('retrieves comprehensive USMLE medical foundations taxonomy curriculum', async () => {
    const curriculum = await service.getExamCurriculum('usmle-step-1')
    expect(curriculum.length).toBeGreaterThanOrEqual(3)

    const foundations = curriculum.find(s => s.slug === 'usmle-foundations')
    const organSystems = curriculum.find(s => s.slug === 'usmle-organ-systems')
    const microImmuno = curriculum.find(s => s.slug === 'usmle-micro-immuno')

    expect(foundations).toBeDefined()
    expect(organSystems).toBeDefined()
    expect(microImmuno).toBeDefined()

    expect(foundations?.topics.some(t => t.slug === 'general-pathology')).toBe(true)
    expect(organSystems?.topics.some(t => t.slug === 'cardio-pulmonary')).toBe(true)
  })

  it('retrieves comprehensive MCAT biological and physical foundations curriculum', async () => {
    const curriculum = await service.getExamCurriculum('mcat-2026')
    expect(curriculum.length).toBeGreaterThanOrEqual(4)

    const cpbs = curriculum.find(s => s.slug === 'mcat-cpbs')
    const bbls = curriculum.find(s => s.slug === 'mcat-bbls')
    const cars = curriculum.find(s => s.slug === 'mcat-cars')
    const psbb = curriculum.find(s => s.slug === 'mcat-psbb')

    expect(cpbs).toBeDefined()
    expect(bbls).toBeDefined()
    expect(cars).toBeDefined()
    expect(psbb).toBeDefined()

    expect(bbls?.topics.some(t => t.slug === 'enzyme-kinetics')).toBe(true)
  })

  it('falls back gracefully to core DSA and software architecture on unmapped exam IDs', async () => {
    const curriculum = await service.getExamCurriculum('unmapped-custom-assessment')
    expect(curriculum.length).toBeGreaterThanOrEqual(3)

    const dsa = curriculum.find(s => s.slug === 'dsa-core')
    const sysDesign = curriculum.find(s => s.slug === 'system-design')

    expect(dsa).toBeDefined()
    expect(sysDesign).toBeDefined()
  })
})
