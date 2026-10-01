/**
 * Tests Controller — Integration Tests
 * Uses the global prisma mock from tests/setup.ts (jest-mock-extended mockDeep).
 */
import request from 'supertest'
import express, { Router } from 'express'
import { prisma } from '../../src/prismaClient'

jest.mock('../../src/utils/logger', () => {
  const mockLogger = {
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
    audit: jest.fn(),
    debug: jest.fn(),
  }
  return {
    __esModule: true,
    default: mockLogger,
    logger: mockLogger,
  }
})

jest.mock('../../src/services/GrowthEngineService', () => ({
  growthEngineService: {
    checkAndUpdateStreak: jest.fn().mockResolvedValue(true),
    checkAchievements: jest.fn().mockResolvedValue(true),
    updateDailyGoal: jest.fn().mockResolvedValue(true),
    calculateLevel: jest.fn().mockReturnValue(1),
    awardXP: jest.fn().mockResolvedValue({}),
    getUserStats: jest.fn().mockResolvedValue({}),
  },
}))

jest.mock('../../src/services/CacheService', () => ({
  cacheService: {
    generateKey: jest.fn().mockReturnValue('mock-key'),
    coursesListKey: jest.fn().mockReturnValue('mock-key'),
    courseDetailsKey: jest.fn().mockReturnValue('mock-key'),
    courseKey: jest.fn().mockReturnValue('mock-key'),
    get: jest.fn().mockResolvedValue(null),
    set: jest.fn().mockResolvedValue(true),
    invalidatePattern: jest.fn().mockResolvedValue(true),
    delete: jest.fn().mockResolvedValue(true),
  },
}))

import {
  listTests,
  getTestDetails,
  startTest,
  submitTest,
  getTestAttempts,
  autosaveTest,
} from '../../src/controllers/testsController'

// ─── App factory ──────────────────────────────────────────────────────────────
function makeApp(userId = 'user-123') {
  const app = express()
  app.use(express.json())
  app.use((req: any, _res: any, next: any) => {
    req.user = { userId, email: 'test@test.com', role: 'STUDENT' }
    next()
  })
  const r = Router()
  r.get('/tests', listTests)
  r.get('/tests/attempts', getTestAttempts) // static BEFORE /:id
  r.get('/tests/:id', getTestDetails)
  r.post('/tests/:id/start', startTest)
  r.post('/tests/:id/autosave', autosaveTest)
  r.post('/tests/:id/submit', submitTest)
  app.use('/api', r)
  return app
}

// ─── Shared fixtures ──────────────────────────────────────────────────────────
const Q1 = {
  id: 'q1',
  text: 'What is 2+2?',
  type: 'mcq',
  difficulty: 0.3,
  bloomLevel: 'remember',
  points: 10,
  order: 1,
  explanation: '4',
  options: [
    { id: 'o1', text: '3', isCorrect: false, order: 0 },
    { id: 'o2', text: '4', isCorrect: true, order: 1 },
  ],
}
const TEST = {
  id: 'test-1',
  title: 'Sample',
  description: 'desc',
  examId: 'e1',
  timeLimit: 30,
  passingScore: 60,
  totalMarks: 10,
  negativeMarks: 0,
  mode: 'mock',
  difficulty: 'medium',
  isPublished: true,
  isAiGenerated: false,
  createdAt: new Date(),
  updatedAt: new Date(),
  _count: { questions: 1, results: 0 },
  questions: [Q1],
}

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
      .mockResolvedValueOnce(null) // no in-progress
      .mockResolvedValueOnce(null) // no previous (attempt #1)
    ;(prisma.testResult.create as jest.Mock).mockResolvedValue({ id: 'a1', attemptNumber: 1 })

    const res = await request(makeApp()).post('/api/tests/test-1/start')
    expect(res.status).toBe(201)
    expect(res.body.data.attempt_id).toBe('a1')
    expect(res.body.data.questions).toHaveLength(1)
  })

  it('resumes in-progress attempt → 200', async () => {
    ;(prisma.test.findUnique as jest.Mock).mockResolvedValue(TEST)
    ;(prisma.testResult.findFirst as jest.Mock).mockResolvedValueOnce({
      id: 'existing',
      attemptNumber: 1,
      completedAt: null,
      startedAt: new Date(),
      attemptAnswers: [],
    })

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

  it('retries on unique constraint violation (attemptNumber race condition)', async () => {
    ;(prisma.test.findUnique as jest.Mock).mockResolvedValue(TEST)
    ;(prisma.testResult.findFirst as jest.Mock)
      .mockResolvedValueOnce(null) // pre-check in-progress
      .mockResolvedValueOnce(null) // pre-check maxAttempt
      .mockResolvedValueOnce(null) // tx attempt 1: concurrent in-progress
      .mockResolvedValueOnce(null) // tx attempt 1: latestAttempt (attemptNumber = 1)
      .mockResolvedValueOnce(null) // tx attempt 2: concurrent in-progress
      .mockResolvedValueOnce({ attemptNumber: 1 }) // tx attempt 2: latestAttempt found attempt #1 -> next is #2!

    // First create fails with P2002, second succeeds
    const prismaError = new Error('P2002: Unique constraint violation') as any
    prismaError.code = 'P2002'

    const createMock = jest
      .fn()
      .mockRejectedValueOnce(prismaError)
      .mockResolvedValueOnce({ id: 'a1', attemptNumber: 1 })

    ;(prisma.testResult.create as jest.Mock) = createMock

    const res = await request(makeApp()).post('/api/tests/test-1/start')
    expect(res.status).toBe(201)
    expect(res.body.data.attempt_id).toBe('a1')
    expect(createMock).toHaveBeenCalledTimes(2)
    // Second call should have attemptNumber: 2
    expect(createMock.mock.calls[1][0].data.attemptNumber).toBe(2)
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
          findFirst: overrides.findFirst ?? jest.fn().mockResolvedValue(null),
          update: overrides.update ?? jest.fn().mockResolvedValue({}),
          create: overrides.create ?? jest.fn().mockResolvedValue({}),
        },
        testAttemptAnswer: {
          createMany: jest.fn().mockResolvedValue({ count: 1 }),
          upsert: jest.fn().mockResolvedValue({}),
        },
        user: {
          findUnique: jest
            .fn()
            .mockResolvedValue({ id: 'user-123', xp: 0, level: 1, streak: 0, longestStreak: 0 }),
          update: jest.fn().mockResolvedValue({}),
        },
        achievement: {
          findMany: jest.fn().mockResolvedValue([]),
        },
        userAchievement: {
          findMany: jest.fn().mockResolvedValue([]),
          createMany: jest.fn().mockResolvedValue({ count: 0 }),
        },
        topicPerformance: {
          findMany: jest.fn().mockResolvedValue([]),
        },
      }
      return cb(tx)
    })
  }

  it('scores correctly, passes, awards XP → 201', async () => {
    ;(prisma.test.findUnique as jest.Mock).mockResolvedValue(TEST)
    ;(prisma.testResult.findFirst as jest.Mock).mockResolvedValue({
      id: 'a1',
      status: 'IN_PROGRESS',
      startedAt: new Date(Date.now() - 120000),
      attemptNumber: 1,
    })
    const mockUpdate = jest.fn().mockResolvedValue({
      id: 'a1',
      score: 10,
      totalPoints: 10,
      percentage: 100,
      passed: true,
      timeTaken: 120,
      completedAt: new Date(),
      attemptNumber: 1,
      questionResults: '[]',
    })
    mockTx({
      findFirst: jest.fn().mockResolvedValue({ id: 'a1', status: 'IN_PROGRESS' }),
      findUnique: jest.fn().mockResolvedValue({
        id: 'a1',
        status: 'IN_PROGRESS',
        score: 0,
        totalPoints: 0,
        percentage: 0,
        passed: false,
        timeTaken: 0,
        attemptNumber: 1,
      }),
      update: mockUpdate,
    })

    const res = await request(makeApp())
      .post('/api/tests/test-1/submit')
      .send({ answers: { q1: 'o2' }, timeTaken: 120, attempt_id: 'a1' })
    if (res.status === 500) console.error('TEXT:', res.text)
    expect(res.status).toBe(201)
    expect(res.body.data.passed).toBe(true)
    expect(res.body.data.correct_count).toBe(1)
    expect(res.body.data.incorrect_count).toBe(0)
  })

  it('applies negative marking for wrong answer → 201', async () => {
    ;(prisma.test.findUnique as jest.Mock).mockResolvedValue({ ...TEST, negativeMarks: 2 })
    ;(prisma.testResult.findFirst as jest.Mock).mockResolvedValue({
      id: 'a1',
      status: 'IN_PROGRESS',
      startedAt: new Date(Date.now() - 120000),
      attemptNumber: 1,
    })
    mockTx({
      findUnique: jest.fn().mockResolvedValue({
        id: 'a1',
        status: 'IN_PROGRESS',
        score: 0,
        totalPoints: 0,
        percentage: 0,
        passed: false,
        timeTaken: 0,
        attemptNumber: 1,
      }),
      update: jest.fn().mockResolvedValue({
        id: 'a1',
        score: 0,
        totalPoints: 10,
        percentage: 0,
        passed: false,
        timeTaken: 60,
        completedAt: new Date(),
        attemptNumber: 1,
        questionResults: '[]',
      }),
    })

    const res = await request(makeApp())
      .post('/api/tests/test-1/submit')
      .send({ answers: { q1: 'o1' }, timeTaken: 60, attempt_id: 'a1' })
    if (res.status === 500) console.error('TEXT:', res.text)
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
    const res = await request(makeApp())
      .post('/api/tests/bad/submit')
      .send({ answers: { q1: 'a' }, timeTaken: 0, attempt_id: 'a1' })
    if (res.status === 500) console.error('TEXT:', res.text)
    expect(res.status).toBe(404)
  })

  it('enforces server-side timer: marks TIMEOUT when over time limit', async () => {
    // 60-minute test (timeLimit: 60)
    const test60min = { ...TEST, timeLimit: 60 }
    ;(prisma.test.findUnique as jest.Mock).mockResolvedValue(test60min)
    // Started 65 minutes ago — over time limit
    const startedAt = new Date(Date.now() - 65 * 60 * 1000)
    ;(prisma.testResult.findFirst as jest.Mock).mockResolvedValue({
      id: 'a1',
      status: 'IN_PROGRESS',
      startedAt,
      attemptNumber: 1,
    })
    const mockUpdate = jest.fn().mockResolvedValue({
      id: 'a1',
      status: 'TIMEOUT',
      score: 5,
      totalPoints: 10,
      percentage: 50,
      passed: false,
      timeTaken: 65 * 60, // 65 minutes
      attemptNumber: 1,
      questionResults: '[]',
    })
    mockTx({
      findFirst: jest.fn().mockResolvedValue({ id: 'a1', status: 'IN_PROGRESS', startedAt }),
      findUnique: jest.fn().mockResolvedValue({
        id: 'a1',
        status: 'IN_PROGRESS',
        score: 0,
        totalPoints: 0,
        percentage: 0,
        passed: false,
        timeTaken: 0,
        attemptNumber: 1,
        startedAt,
      }),
      update: mockUpdate,
    })

    // Cheater claims they took only 30 seconds (lie!)
    const res = await request(makeApp())
      .post('/api/tests/test-1/submit')
      .send({ answers: { q1: 'o2' }, timeTaken: 30, attempt_id: 'a1' })
    if (res.status === 500) console.error('TEXT:', res.text)

    // Server should have computed actual time (65 min) and marked TIMEOUT
    expect(res.status).toBe(200)
    expect(res.body.data.status).toBe('TIMEOUT')
    expect(res.body.data.server_time_validated).toBe(true)
    // Server time wins over client lie
    expect(res.body.data.time_taken).toBeGreaterThanOrEqual(60 * 60)
  })

  it('anti-cheat: server time wins over client-supplied time', async () => {
    const test60min = { ...TEST, timeLimit: 60 }
    ;(prisma.test.findUnique as jest.Mock).mockResolvedValue(test60min)
    // Started 10 minutes ago
    const startedAt = new Date(Date.now() - 10 * 60 * 1000)
    ;(prisma.testResult.findFirst as jest.Mock).mockResolvedValue({
      id: 'a1',
      status: 'IN_PROGRESS',
      startedAt,
      attemptNumber: 1,
    })
    const mockUpdate = jest.fn().mockResolvedValue({
      id: 'a1',
      status: 'COMPLETED',
      score: 8,
      totalPoints: 10,
      percentage: 80,
      passed: true,
      timeTaken: 10 * 60,
      attemptNumber: 1,
      questionResults: '[]',
    })
    mockTx({
      findFirst: jest.fn().mockResolvedValue({ id: 'a1', status: 'IN_PROGRESS', startedAt }),
      findUnique: jest.fn().mockResolvedValue({
        id: 'a1',
        status: 'IN_PROGRESS',
        score: 0,
        totalPoints: 0,
        percentage: 0,
        passed: false,
        timeTaken: 0,
        attemptNumber: 1,
        startedAt,
      }),
      update: mockUpdate,
    })

    // Client lies: claims 60 seconds
    const res = await request(makeApp())
      .post('/api/tests/test-1/submit')
      .send({ answers: { q1: 'o2' }, timeTaken: 60, attempt_id: 'a1' })
    if (res.status === 500) console.error('TEXT:', res.text)

    // Server should use the actual time (10 min), not client's claim
    expect(res.status).toBe(201)
    expect(res.body.data.time_taken).toBeGreaterThanOrEqual(10 * 60)
    expect(res.body.data.server_time_validated).toBe(true)
  })
})

// ─── POST /tests/:id/autosave ─────────────────────────────────────────────────
describe('POST /tests/:id/autosave', () => {
  function mockTx(overrides: { findFirst?: jest.Mock; upsert?: jest.Mock } = {}) {
    ;(prisma.$transaction as jest.Mock).mockImplementation(async (cb: any) => {
      const tx = {
        testResult: {
          findFirst:
            overrides.findFirst ?? jest.fn().mockResolvedValue({ id: 'attempt-1' }),
        },
        testAttemptAnswer: {
          upsert: overrides.upsert ?? jest.fn().mockResolvedValue({}),
        },
      }
      return cb(tx)
    })
  }

  it('returns canonical contract: saved: true and saved_count', async () => {
    mockTx()
    const res = await request(makeApp())
      .post('/api/tests/test-1/autosave')
      .send({
        answers: { 'q-1': 'opt-a', 'q-2': 'opt-b' },
        attempt_id: 'attempt-1',
      })

    expect(res.status).toBe(200)
    expect(res.body.status).toBe('success')
    expect(res.body.data).toEqual(
      expect.objectContaining({
        saved: true,
        saved_count: 2,
        attempt_id: 'attempt-1',
      })
    )
  })

  it('handles multiple answer types (string and array)', async () => {
    const upsertMock = jest.fn().mockResolvedValue({})
    mockTx({ upsert: upsertMock })
    const res = await request(makeApp())
      .post('/api/tests/test-1/autosave')
      .send({
        answers: {
          'q-1': 'opt-a',
          'q-2': ['opt-a', 'opt-b'], // multi-select
          'q-3': 'free text answer', // text answer
        },
        attempt_id: 'attempt-1',
      })

    expect(res.status).toBe(200)
    expect(res.body.data.saved_count).toBe(3)
    // Verify upsert was called 3 times sequentially
    expect(upsertMock).toHaveBeenCalledTimes(3)
  })

  it('skips overwriting answers for questions in locked sections', async () => {
    const upsertMock = jest.fn().mockResolvedValue({})
    ;(prisma.$transaction as jest.Mock).mockImplementation(async (cb: any) => {
      const tx = {
        testResult: {
          findFirst: jest.fn().mockResolvedValue({ id: 'attempt-1' }),
        },
        question: {
          findMany: jest.fn().mockResolvedValue([{ id: 'q-locked' }]),
        },
        testAttemptAnswer: {
          upsert: upsertMock,
        },
      }
      return cb(tx)
    })

    const res = await request(makeApp())
      .post('/api/tests/test-1/autosave')
      .send({
        answers: {
          'q-locked': 'new-tampered-answer',
          'q-active': 'active-valid-answer',
        },
        attempt_id: 'attempt-1',
        locked_section_ids: ['sec-locked'],
      })

    expect(res.status).toBe(200)
    expect(res.body.data.saved_count).toBe(1)
    expect(upsertMock).toHaveBeenCalledTimes(1)
    expect(upsertMock).toHaveBeenCalledWith(
      expect.objectContaining({
        create: expect.objectContaining({ questionId: 'q-active' }),
      })
    )
  })

  it('returns 404 when no active attempt', async () => {
    ;(prisma.$transaction as jest.Mock).mockImplementation(async (cb: any) => {
      const tx = {
        testResult: {
          findFirst: jest.fn().mockResolvedValue(null),
        },
        testAttemptAnswer: { upsert: jest.fn() },
      }
      return cb(tx)
    })
    const res = await request(makeApp())
      .post('/api/tests/test-1/autosave')
      .send({ answers: { 'q-1': 'opt-a' } })

    expect(res.status).toBe(404)
  })

  it('returns 400 when answers missing', async () => {
    const res = await request(makeApp())
      .post('/api/tests/test-1/autosave')
      .send({ attempt_id: 'attempt-1' })

    expect(res.status).toBe(400)
  })
})

// ─── GET /tests/attempts ──────────────────────────────────────────────────────
describe('GET /tests/attempts', () => {
  it('returns attempt history → 200', async () => {
    ;(prisma.testResult.findMany as jest.Mock).mockResolvedValue([
      {
        id: 'a1',
        testId: 'test-1',
        score: 80,
        totalPoints: 100,
        percentage: 80,
        passed: true,
        timeTaken: 900,
        attemptNumber: 1,
        status: 'COMPLETED',
        startedAt: new Date(),
        completedAt: new Date(),
        test: {
          id: 'test-1',
          title: 'Sample',
          mode: 'mock',
          difficulty: 'medium',
          timeLimit: 30,
          passingScore: 60,
          totalMarks: 100,
        },
        attemptAnswers: [],
      },
    ])

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
