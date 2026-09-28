import request from 'supertest'
import express from 'express'
import aiRouter from '../../src/routes/v1/ai.routes'

jest.mock('../../src/middleware/authMiddleware', () => ({
  authenticate: (req: any, _res: any, next: any) => {
    req.user = { userId: 'usr-council-test', role: 'STUDENT' }
    next()
  },
}))

jest.mock('../../src/middleware/rateLimiter', () => ({
  createRateLimiter: () => (_req: any, _res: any, next: any) => next(),
}))

jest.mock('../../src/services/ai/AIServiceFactory', () => ({
  AIServiceFactory: {
    getAgent: () => ({
      generateJSON: jest.fn().mockRejectedValue(new Error('Mock AI offline')),
    }),
  },
}))

const app = express()
app.use(express.json())
app.use('/api/v1/ai', aiRouter)

describe('AI Council Controller Endpoints', () => {
  it('POST /api/v1/ai/council/consult should return 200 and council analysis', async () => {
    const res = await request(app)
      .post('/api/v1/ai/council/consult')
      .send({
        query: 'How should I solve binary tree maximum path sum?',
        problemTitle: 'Binary Tree Maximum Path Sum',
        language: 'python',
        studentLevel: 'intermediate',
      })

    expect(res.status).toBe(200)
    expect(res.body.status).toBe('success')
    expect(res.body.data.perspectives.socratic_guide).toBeDefined()
    expect(res.body.data.perspectives.code_reviewer).toBeDefined()
    expect(res.body.data.perspectives.motivational_coach).toBeDefined()
    expect(res.body.data.actionPlan).toBeDefined()
  })

  it('POST /api/v1/ai/council/consult should return 400 when query is missing', async () => {
    const res = await request(app)
      .post('/api/v1/ai/council/consult')
      .send({})

    expect(res.status).toBe(400)
  })

  it('POST /api/v1/ai/council/specialist should return 200 for valid specialist role', async () => {
    const res = await request(app)
      .post('/api/v1/ai/council/specialist')
      .send({
        role: 'socratic_guide',
        query: 'What is the base case for recursion in trees?',
      })

    expect(res.status).toBe(200)
    expect(res.body.status).toBe('success')
    expect(res.body.data.role).toBe('socratic_guide')
    expect(res.body.data.name).toBe('Dr. Socratic')
  })

  it('POST /api/v1/ai/council/specialist should return 400 for invalid role', async () => {
    const res = await request(app)
      .post('/api/v1/ai/council/specialist')
      .send({
        role: 'invalid_role',
        query: 'Hello',
      })

    expect(res.status).toBe(400)
  })
})
