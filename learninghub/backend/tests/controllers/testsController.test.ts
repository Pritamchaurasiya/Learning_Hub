/**
 * Tests Controller — Integration Tests
 * Uses the global prisma mock from tests/setup.ts (jest-mock-extended mockDeep).
 */
import request from 'supertest'
import express, { Router } from 'express'
import { prisma } from '../../src/prismaClient'

jest.mock('../../src/utils/logger', () => ({
  default: { info: jest.fn(), error: jest.fn(), warn: jest.fn(), audit: jest.fn(), debug: jest.fn() },
}))

import { listTests, getTestDetails, startTest, submitTest, getTestAttempts } from '../../src/controllers/testsController'

// ─── App factory ──────────────────────────────────────────────────────────────
function makeApp(userId = 'user-123') {
  const app = express()
  app.use(express.json())
  app.use((req: any, _res: any, next: any) => { req.user = { userId, email: 'test@test.com', role: 'STUDENT' }; next() })
  const r = Router()
  r.get('/tests', listTests)
  r.get('/tests/attempts', getTestAttempts)   // static BEFORE /:id
  r.get('/tests/:id', getTestDetails)
  r.post('/tests/:id/start', startTest)
  r.post('/tests/:id/submit', submitTest)
  app.use('/api', r)
  return app
}

// ─── Shared fixtures ──────────────────────────────────────────────────────────
const Q1 = { id: 'q1', text: 'What is 2+2?', type: 'mcq', difficulty: 0.3, bloomLevel: 'remember', points: 10, order: 1, explanation: '4', options: [{ id: 'o1', text: '3', isCorrect: false, order: 0 }, { id: 'o2', text: '4', isCorrect: true, order: 1 }] }
const TEST = { id: 'test-1', title: 'Sample', description: 'desc', courseId: 'c1', timeLimit: 30, passingScore: 60, totalMarks: 10, negativeMarks: 0, mode: 'mock', difficulty: 'medium', isPublished: true, isAiGenerated: false, createdAt: new Date(), updatedAt: new Date(), _count: { questions: 1, results: 0 }, course: { title: 'Course', id: 'c1' }, questions: [Q1] }

// ─── GET /tests ───────────────────────────────────────────────────────────────
describe('GET /tests', () => {
  it('returns 200 with test list', async () => {
    ;(prisma.test.count as jest.Mock).mockResolvedValue(1)
    ;(prisma.test.findMany as jest.Mock).mockResolvedValue([TEST])
    ;(prisma.testResult.groupBy as jest.Mock).mockResolvedValue([])

    const res = await request(makeApp()).get('/api/tests')
    expect(res.status).toBe(200)
    expect(res.body.data[0].id).toBe('test-1')
  })

  it('filters by courseId', async () => {
    ;(prisma.test.count as jest.Mock).mockResolvedValue(0)
    ;(prisma.test.findMany as jest.Mock).mockResolvedValue([])
    ;(prisma.testResult.groupBy as jest.Mock).mockResolvedValue([])

    const res = await request(makeApp()).get('/api/tests?courseId=c1')
    expect(res.status).toBe(200)
    const where = (prisma.test.findMany as jest.Mock).mock.calls[0]?.[0]?.where
    expect(where).toMatchObject({ courseId: 'c1' })
  })

  it('returns 500 on DB error', async () => {
    ;(prisma.test.count as jest.Mock).mockRejectedValue(new Error('DB down'))
    const res = await request(makeApp()).get('/api/tests')
    expect(res.status).toBe(500)
  })
})

// ─── GET /tests/:id ───────────────────────────────────────────────────────────
describe('GET /tests/:id', () => {
  it('returns 200 with quiz data', async () => {
    ;(prisma.test.findUnique as jest.Mock).mockResolvedValue(TEST)
    const res = await request(makeApp()).get('/api/tests/test-1')
    expect(res.status).toBe(200)
    expect(res.body.data.quiz.id).toBe('test-1')
    expect(res.body.data.quiz.total_questions).toBe(1)
    // getTestDetails does NOT return questions array (use startTest for that)
    expect(res.body.data.quiz).not.toHaveProperty('isCorrect')
  })

  it('returns 404 when not found', async () => {
    ;(prisma.test.findUnique as jest.Mock).mockResolvedValue(null)
    const res = await request(makeApp()).get('/api/tests/nope')
    expect(res.status).toBe(404)
  })
})

// ─── POST /tests/:id/start ────────────────────────────────────────────────────
describe('POST /tests/:id/start', () => {
  it('creates new attempt → 201', async () => {
    ;(prisma.test.findUnique as jest.Mock).mockResolvedValue(TEST)
    ;(prisma.testResult.findFirst as jest.Mock)
      .mockResolvedValueOnce(null)   // no in-progress
      .mockResolvedValueOnce(null)   // no previous (attempt #1)
    ;(prisma.testResult.create as jest.Mock).mockResolvedValue({ id: 'a1', attemptNumber: 1 })

    const res = await request(makeApp()).post('/api/tests/test-1/start')
    expect(res.status).toBe(201)
    expect(res.body.data.attempt_id).toBe('a1')
    expect(res.body.data.questions).toHaveLength(1)
  })

  it('resumes in-progress attempt → 200', async () => {
    ;(prisma.test.findUnique as jest.Mock).mockResolvedValue(TEST)
    ;(prisma.testResult.findFirst as jest.Mock).mockResolvedValue({ id: 'existing', attemptNumber: 1, completedAt: null })

    const res = await request(makeApp()).post('/api/tests/test-1/start')
    expect(res.status).toBe(200)
    expect(res.body.data.attempt_id).toBe('existing')
    expect(prisma.testResult.create).not.toHaveBeenCalled()
  })

  it('returns 404 when test not found', async () => {
    ;(prisma.test.findUnique as jest.Mock).mockResolvedValue(null)
    const res = await request(makeApp()).post('/api/tests/bad/start')
    expect(res.status).toBe(404)
  })

  it('returns 403 when max attempts reached', async () => {
    ;(prisma.test.findUnique as jest.Mock).mockResolvedValue(TEST)
    ;(prisma.testResult.findFirst as jest.Mock)
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce({ attemptNumber: 3 })

    const res = await request(makeApp()).post('/api/tests/test-1/start')
    expect(res.status).toBe(403)
    expect(res.body.code).toBe('MAX_ATTEMPTS_REACHED')
  })
})

// ─── POST /tests/:id/submit ───────────────────────────────────────────────────
describe('POST /tests/:id/submit', () => {
  // submitTest uses prisma.$transaction — mock it to run the callback with a tx proxy
  function mockTx(overrides: Record<string, jest.Mock> = {}) {
    ;(prisma.$transaction as jest.Mock).mockImplementation(async (cb: any) => {
      const tx = {
        testResult: {
          findUnique: overrides.findUnique ?? jest.fn().mockResolvedValue(null),
          findFirst:  overrides.findFirst  ?? jest.fn().mockResolvedValue(null),
          update:     overrides.update     ?? jest.fn().mockResolvedValue({}),
          create:     overrides.create     ?? jest.fn().mockResolvedValue({}),
        },
        user: { update: overrides.userUpdate ?? jest.fn().mockResolvedValue({}) },
      }
      return cb(tx)
    })
  }

  it('scores correctly, passes, awards XP → 201', async () => {
    ;(prisma.test.findUnique as jest.Mock).mockResolvedValue(TEST)
    const mockUpdate = jest.fn().mockResolvedValue({ id: 'a1', score: 10, totalPoints: 10, percentage: 100, passed: true, timeTaken: 120, completedAt: new Date(), attemptNumber: 1 })
    const mockUserUpdate = jest.fn().mockResolvedValue({})
    mockTx({
      findUnique: jest.fn().mockResolvedValue({ id: 'a1', status: 'IN_PROGRESS', score: 0, totalPoints: 0, percentage: 0, passed: false, timeTaken: 0, attemptNumber: 1 }),
      update: mockUpdate,
      userUpdate: mockUserUpdate,
    })

    const res = await request(makeApp()).post('/api/tests/test-1/submit').send({ answers: { q1: 'o2' }, timeTaken: 120, attempt_id: 'a1' })
    expect(res.status).toBe(201)
    expect(res.body.data.passed).toBe(true)
    expect(res.body.data.correct_count).toBe(1)
    expect(res.body.data.incorrect_count).toBe(0)
    expect(mockUserUpdate).toHaveBeenCalled()
  })

  it('applies negative marking for wrong answer → 201', async () => {
    ;(prisma.test.findUnique as jest.Mock).mockResolvedValue({ ...TEST, negativeMarks: 2 })
    mockTx({
      findUnique: jest.fn().mockResolvedValue({ id: 'a1', status: 'IN_PROGRESS', score: 0, totalPoints: 0, percentage: 0, passed: false, timeTaken: 0, attemptNumber: 1 }),
      update: jest.fn().mockResolvedValue({ id: 'a1', score: 0, totalPoints: 10, percentage: 0, passed: false, timeTaken: 60, completedAt: new Date(), attemptNumber: 1 }),
    })

    const res = await request(makeApp()).post('/api/tests/test-1/submit').send({ answers: { q1: 'o1' }, timeTaken: 60, attempt_id: 'a1' })
    expect(res.status).toBe(201)
    expect(res.body.data.incorrect_count).toBe(1)
    expect(res.body.data.passed).toBe(false)
  })

  it('returns 400 when answers missing', async () => {
    const res = await request(makeApp()).post('/api/tests/test-1/submit').send({ timeTaken: 60 })
    expect(res.status).toBe(400)
  })

  it('returns 404 when test not found', async () => {
    ;(prisma.test.findUnique as jest.Mock).mockResolvedValue(null)
    const res = await request(makeApp()).post('/api/tests/bad/submit').send({ answers: {}, timeTaken: 0, attempt_id: 'a1' })
    expect(res.status).toBe(404)
  })
})

// ─── GET /tests/attempts ──────────────────────────────────────────────────────
describe('GET /tests/attempts', () => {
  it('returns attempt history → 200', async () => {
    ;(prisma.testResult.findMany as jest.Mock).mockResolvedValue([{
      id: 'a1', testId: 'test-1', score: 80, totalPoints: 100, percentage: 80, passed: true,
      timeTaken: 900, attemptNumber: 1, status: 'COMPLETED', startedAt: new Date(), completedAt: new Date(),
      test: { id: 'test-1', title: 'Sample', mode: 'mock', difficulty: 'medium', timeLimit: 30, passingScore: 60, totalMarks: 100 },
    }])

    const res = await request(makeApp()).get('/api/tests/attempts')
    expect(res.status).toBe(200)
    expect(res.body.data.results).toHaveLength(1)
    expect(res.body.data.results[0].score).toBe(80)
  })

  it('returns empty list when no attempts', async () => {
    ;(prisma.testResult.findMany as jest.Mock).mockResolvedValue([])
    const res = await request(makeApp()).get('/api/tests/attempts')
    expect(res.status).toBe(200)
    expect(res.body.data.results).toHaveLength(0)
    expect(res.body.data.totalXp).toBe(0)
  })
})
