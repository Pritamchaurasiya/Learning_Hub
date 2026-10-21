/**
 * AI Controller — Integration Tests
 * Tests the AI endpoints: learning-path, tutor, council, weak-topics, models
 */
import request from 'supertest'
import express, { Router } from 'express'

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

jest.mock('../../src/services/AITestService', () => ({
  aiTestService: {
    generateTest: jest.fn().mockResolvedValue({ test: { id: 'test-1', title: 'Mock Test' } }),
    generateQuestions: jest.fn().mockResolvedValue([]),
    getWeakTopics: jest.fn().mockResolvedValue([]),
  },
}))

jest.mock('../../src/services/ai/AILearningService', () => ({
  aiLearningService: {
    analyzeLearningPath: jest.fn().mockResolvedValue({ weakAreas: [], recommendations: [] }),
    getTutorResponse: jest.fn().mockResolvedValue({ response: 'Mock response', sessionId: 'sess-1' }),
    getTutorResponseStream: jest.fn().mockImplementation(async function* () {
      yield 'Mock chunk 1';
      yield 'Mock chunk 2';
    }),
  },
}))

jest.mock('../../src/services/ai/MultiAgentCouncilService', () => ({
  multiAgentCouncilService: {
    consultCouncil: jest.fn().mockResolvedValue({ summary: 'Mock council response', recommendations: [] }),
  },
}))

jest.mock('../../src/services/CacheService', () => ({
  cacheService: {
    generateKey: jest.fn().mockReturnValue('mock-key'),
    get: jest.fn().mockResolvedValue(null),
    set: jest.fn().mockResolvedValue(true),
    invalidatePattern: jest.fn().mockResolvedValue(true),
  },
}))

import {
  analyzeLearningPath,
  getTutorResponse,
  getTutorResponseStream,
  getWeakTopics,
  getAvailableAIModels,
  consultCouncil,
} from '../../src/controllers/aiController'

function makeApp(userId = 'user-123') {
  const app = express()
  app.use(express.json())
  app.use((req: any, _res: any, next: any) => {
    req.user = { userId, email: 'test@test.com', role: 'STUDENT' }
    next()
  })
  const r = Router()
  r.post('/ai/learning-path', analyzeLearningPath)
  r.post('/ai/tutor', getTutorResponse)
  r.post('/ai/tutor/stream', getTutorResponseStream)
  r.get('/ai/weak-topics', getWeakTopics)
  r.get('/ai/models', getAvailableAIModels)
  r.post('/ai/council/consult', consultCouncil)
  app.use('/api/v1', r)
  return app
}

describe('AI Controller', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('POST /api/v1/ai/learning-path', () => {
    it('should return learning path analysis for authenticated user', async () => {
      const app = makeApp()

      const res = await request(app)
        .post('/api/v1/ai/learning-path')
        .send({})
        .expect(200)

      expect(res.body.status).toBe('success')
      expect(res.body.data).toHaveProperty('weakAreas')
      expect(res.body.data).toHaveProperty('recommendations')
    })

    it('should call aiLearningService.analyzeLearningPath with userId', async () => {
      const { aiLearningService } = await import('../../src/services/ai/AILearningService')
      const app = makeApp('user-456')

      await request(app).post('/api/v1/ai/learning-path').send({}).expect(200)

      expect(aiLearningService.analyzeLearningPath).toHaveBeenCalledWith('user-456')
    })
  })

  describe('POST /api/v1/ai/tutor', () => {
    it('should return tutor response for valid message', async () => {
      const app = makeApp()

      const res = await request(app)
        .post('/api/v1/ai/tutor')
        .send({ message: 'Explain recursion', context: { course_id: 'course-1' } })
        .expect(200)

      expect(res.body.status).toBe('success')
      expect(res.body.data).toHaveProperty('response')
      expect(res.body.data).toHaveProperty('sessionId')
    })

    it('should return 400 for missing message', async () => {
      const app = makeApp()

      const res = await request(app)
        .post('/api/v1/ai/tutor')
        .send({ context: {} })
        .expect(400)

      expect(res.body.status).toBe('error')
      expect(res.body.message).toContain('Message is required')
    })

    it('should pass context to tutor service', async () => {
      const { aiLearningService } = await import('../../src/services/ai/AILearningService')
      const app = makeApp()

      await request(app)
        .post('/api/v1/ai/tutor')
        .send({
          message: 'Help',
          context: { course_id: 'course-1', language: 'python', problem_title: 'Two Sum' },
        })
        .expect(200)

      expect(aiLearningService.getTutorResponse).toHaveBeenCalledWith(
        expect.any(String),
        'Help',
        expect.objectContaining({
          course_id: 'course-1',
          language: 'python',
          problem_title: 'Two Sum',
        }),
        undefined
      )
    })
  })

  describe('POST /api/v1/ai/tutor/stream', () => {
    it('should return SSE stream for valid message', async () => {
      const app = makeApp()

      const res = await request(app)
        .post('/api/v1/ai/tutor/stream')
        .send({ message: 'Stream test' })
        .expect(200)

      expect(res.headers['content-type']).toContain('text/event-stream')
      expect(res.headers['cache-control']).toContain('no-cache')
    })

    it('should return 400 for missing message', async () => {
      const app = makeApp()

      const res = await request(app)
        .post('/api/v1/ai/tutor/stream')
        .send({})
        .expect(400)

      expect(res.body.status).toBe('error')
      expect(res.body.message).toContain('Message is required')
    })
  })

  describe('GET /api/v1/ai/weak-topics', () => {
    it('should return weak topics for authenticated user', async () => {
      const app = makeApp()

      const res = await request(app).get('/api/v1/ai/weak-topics').expect(200)

      expect(res.body.status).toBe('success')
      expect(res.body.data).toHaveProperty('weak_topics')
      expect(Array.isArray(res.body.data.weak_topics)).toBe(true)
    })
  })

  describe('GET /api/v1/ai/models', () => {
    it('should return available AI models', async () => {
      const app = makeApp()

      const res = await request(app).get('/api/v1/ai/models').expect(200)

      expect(res.body.status).toBe('success')
      expect(res.body.data).toHaveProperty('providers')
      expect(Array.isArray(res.body.data.providers)).toBe(true)
    })
  })

  describe('POST /api/v1/ai/council/consult', () => {
    it('should return council consultation', async () => {
      const app = makeApp()

      const res = await request(app)
        .post('/api/v1/ai/council/consult')
        .send({ query: 'How to improve DSA skills?' })
        .expect(200)

      expect(res.body.status).toBe('success')
      expect(res.body.data).toHaveProperty('summary')
      expect(res.body.data).toHaveProperty('recommendations')
    })

    it('should return 400 for missing query', async () => {
      const app = makeApp()
      const res = await request(app)
        .post('/api/v1/ai/council/consult')
        .send({})
        .expect(400)

      expect(res.body.status).toBe('error')
      expect(res.body.message).toContain('Query is required')
    })
  })
})