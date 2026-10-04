import request from 'supertest'
import express from 'express'
import curriculumRouter from '../../src/routes/v1/curriculum.routes'
import revisionRouter from '../../src/routes/v1/revision.routes'
import skillsRouter from '../../src/routes/v1/skills.routes'
import learningPathsRouter from '../../src/routes/v1/learningPaths.routes'
import coursesRouter from '../../src/routes/v1/courses.routes'

const app = express()
app.use(express.json())

app.use('/api/v1/curriculum', curriculumRouter)
app.use('/api/v1/revision', revisionRouter)
app.use('/api/v1/skills', skillsRouter)
app.use('/api/v1/learning-paths', learningPathsRouter)
app.use('/api/v1/courses', coursesRouter)

describe('New Engines API Endpoints', () => {
  describe('Curriculum Endpoints (Milestone 10)', () => {
    it('GET /api/v1/curriculum/templates returns available syllabus blueprints', async () => {
      const res = await request(app).get('/api/v1/curriculum/templates')
      expect(res.status).toBe(200)
      expect(res.body.status).toBe('success')
      expect(res.body.data.templates.length).toBeGreaterThan(0)
    })

    it('POST /api/v1/curriculum/synthesize creates a personalized roadmap', async () => {
      const res = await request(app)
        .post('/api/v1/curriculum/synthesize')
        .send({
          examTarget: 'GATE_CS',
          targetHorizonWeeks: 10,
          weeklyHours: 12,
        })
      expect(res.status).toBe(201)
      expect(res.body.status).toBe('success')
      expect(res.body.data.examTarget).toBe('GATE_CS')
      expect(res.body.data.modules.length).toBe(10)
    })

    it('GET /api/v1/curriculum/active returns active curriculum', async () => {
      const res = await request(app).get('/api/v1/curriculum/active')
      expect(res.status).toBe(200)
      expect(res.body.data.id).toBeDefined()
    })
  })

  describe('Revision Endpoints (SuperMemo SM-2+)', () => {
    it('GET /api/v1/revision/deck returns daily spaced cards', async () => {
      const res = await request(app).get('/api/v1/revision/deck')
      expect(res.status).toBe(200)
      expect(res.body.status).toBe('success')
      expect(res.body.data.cards.length).toBeGreaterThan(0)
      expect(res.body.data.stats).toBeDefined()
    })

    it('POST /api/v1/revision/review updates card SM-2 metrics', async () => {
      const deckRes = await request(app).get('/api/v1/revision/deck')
      const cardId = deckRes.body.data.cards[0].id

      const res = await request(app)
        .post('/api/v1/revision/review')
        .send({ card_id: cardId, quality: 4 })
      expect(res.status).toBe(200)
      expect(res.body.data.card.repetitions).toBeGreaterThan(0)
    })

    it('GET /api/v1/revision/stats returns retention breakdown', async () => {
      const res = await request(app).get('/api/v1/revision/stats')
      expect(res.status).toBe(200)
      expect(res.body.data.average_retention).toBeDefined()
      expect(res.body.data.forecast_7_days.length).toBe(7)
    })
  })

  describe('Skills Endpoints (BKT & Skill DAG)', () => {
    it('GET /api/v1/skills/graph returns DAG nodes and edges', async () => {
      const res = await request(app).get('/api/v1/skills/graph')
      expect(res.status).toBe(200)
      expect(res.body.status).toBe('success')
      expect(res.body.data.skills.length).toBeGreaterThan(0)
      expect(res.body.data.edges.length).toBeGreaterThan(0)
    })

    it('POST /api/v1/skills/interaction updates posterior belief', async () => {
      const res = await request(app)
        .post('/api/v1/skills/interaction')
        .send({ skillId: 'skill-asymptotic', isCorrect: true })
      expect(res.status).toBe(200)
      expect(res.body.data.updatedMastery).toBeDefined()
    })

    it('GET /api/v1/skills/next-action returns zone of proximal development recommendation', async () => {
      const res = await request(app).get('/api/v1/skills/next-action')
      expect(res.status).toBe(200)
      expect(res.body.data.recommendation).toBeDefined()
    })
  })

  describe('Learning Paths Endpoints', () => {
    it('GET /api/v1/learning-paths returns curated tracks', async () => {
      const res = await request(app).get('/api/v1/learning-paths')
      expect(res.status).toBe(200)
      expect(res.body.data.length).toBeGreaterThan(0)
    })

    it('POST /api/v1/learning-paths/:id/enroll enrolls student in path', async () => {
      const res = await request(app).post('/api/v1/learning-paths/path-fullstack-ts/enroll')
      expect(res.status).toBe(200)
      expect(res.body.data.enrolled).toBe(true)
    })
  })

  describe('Courses Expansion Endpoints', () => {
    it('GET /api/v1/courses/categories returns valid categories list', async () => {
      const res = await request(app).get('/api/v1/courses/categories')
      expect(res.status).toBe(200)
      expect(Array.isArray(res.body.data)).toBe(true)
      expect(res.body.data).toContain('Algorithms')
    })

    it('GET /api/v1/courses/:id/lessons returns lessons list without crashing', async () => {
      const res = await request(app).get('/api/v1/courses/course-algo-1/lessons')
      expect(res.status).toBe(200)
      expect(Array.isArray(res.body.data)).toBe(true)
    })
  })
})
