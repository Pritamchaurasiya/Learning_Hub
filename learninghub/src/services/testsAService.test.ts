import { describe, it, expect, vi, beforeEach } from 'vitest'
import { testsAService } from './testsAService'
import { fetchApi } from '../utils/api'

// Mock fetchApi
vi.mock('../utils/api', () => ({
  fetchApi: vi.fn(),
}))

describe('testsAService', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('getTests', () => {
    it('fetches tests with no filters', async () => {
      const mockResponse = { data: { results: [{ id: '1', title: 'Test 1' }] }, status: 'success' }
      vi.mocked(fetchApi).mockResolvedValueOnce(mockResponse)

      const result = await testsAService.getTests()
      expect(fetchApi).toHaveBeenCalledWith('/tests')
      expect(result.data.length).toBe(1)
      expect(result.data[0].id).toBe('1')
    })

    it('fetches tests with filters', async () => {
      const mockResponse = { data: [{ id: '1', title: 'Test 1' }] }
      vi.mocked(fetchApi).mockResolvedValueOnce(mockResponse)

      await testsAService.getTests({ exam: 'NEET', difficulty: 'hard' })
      expect(fetchApi).toHaveBeenCalledWith('/tests?exam=NEET&difficulty=hard')
    })
  })

  describe('getTest', () => {
    it('fetches single test by ID', async () => {
      const mockResponse = { data: { quiz: { id: 'test-1', title: 'Sample' } } }
      vi.mocked(fetchApi).mockResolvedValueOnce(mockResponse)

      const result = await testsAService.getTest('test-1')
      expect(fetchApi).toHaveBeenCalledWith('/tests/test-1')
      expect(result.data.id).toBe('test-1')
    })
  })

  describe('generateTest', () => {
    it('calls AI generate-test endpoint', async () => {
      vi.mocked(fetchApi).mockResolvedValueOnce({ data: { id: 'ai-1' } })

      const config = { topic: 'Math', difficulty: 'easy' }
      await testsAService.generateTest(config)

      expect(fetchApi).toHaveBeenCalledWith('/ai/generate-test', {
        method: 'POST',
        body: JSON.stringify(config),
      })
    })
  })

  describe('startTest', () => {
    it('starts a test and returns attempt data', async () => {
      vi.mocked(fetchApi).mockResolvedValueOnce({ data: { attemptId: 'att-1' } })

      await testsAService.startTest('test-1')
      expect(fetchApi).toHaveBeenCalledWith('/tests/test-1/start', {
        method: 'POST',
        body: '{}',
      })
    })
  })

  describe('autosaveAnswer and batchAutosave', () => {
    it('autosaves single answer', async () => {
      vi.mocked(fetchApi).mockResolvedValueOnce({ data: { saved: true } })

      await testsAService.autosaveAnswer('test-1', 'q-1', 'opt-1', 'att-1')
      expect(fetchApi).toHaveBeenCalledWith('/tests/test-1/autosave', {
        method: 'POST',
        body: JSON.stringify({ answers: { 'q-1': 'opt-1' }, attempt_id: 'att-1' }),
      })
    })

    it('autosaves batch answers', async () => {
      vi.mocked(fetchApi).mockResolvedValueOnce({ data: { saved: true } })

      await testsAService.batchAutosave('test-1', { 'q-1': 'opt-1' }, 'att-1')
      expect(fetchApi).toHaveBeenCalledWith('/tests/test-1/autosave', {
        method: 'POST',
        body: JSON.stringify({ answers: { 'q-1': 'opt-1' }, attempt_id: 'att-1' }),
      })
    })
  })

  describe('submitTest', () => {
    it('submits a test', async () => {
      vi.mocked(fetchApi).mockResolvedValueOnce({ data: { score: 100 } })

      await testsAService.submitTest('test-1', { 'q-1': 'opt-1' }, 120, 'att-1')
      expect(fetchApi).toHaveBeenCalledWith('/tests/test-1/submit', {
        method: 'POST',
        body: JSON.stringify({ answers: { 'q-1': 'opt-1' }, timeTaken: 120, attempt_id: 'att-1' }),
      })
    })
  })

  describe('getResult and getAttemptResult', () => {
    it('gets test result', async () => {
      vi.mocked(fetchApi).mockResolvedValueOnce({ data: { score: 90 } })
      await testsAService.getResult('test-1')
      expect(fetchApi).toHaveBeenCalledWith('/tests/test-1/result')
    })

    it('gets attempt result with normalization', async () => {
      vi.mocked(fetchApi).mockResolvedValueOnce({ data: { score: 85, question_results: [] } })
      const res = await testsAService.getAttemptResult('att-1')
      expect(fetchApi).toHaveBeenCalledWith('/tests/attempts/att-1')
      expect(res.data.score).toBe(85)
    })
  })

  describe('Attempts list', () => {
    it('gets user attempts via getAttempts', async () => {
      vi.mocked(fetchApi).mockResolvedValueOnce({
        data: { results: [{ id: 'att-1', status: 'completed' }] },
      })
      const res = await testsAService.getAttempts()
      expect(fetchApi).toHaveBeenCalledWith('/tests/attempts')
      expect(res.data.length).toBe(1)
      expect(res.data[0].status).toBe('submitted')
    })

    it('gets user attempts via getMyResults', async () => {
      vi.mocked(fetchApi).mockResolvedValueOnce({
        data: { results: [{ id: 'att-2', status: 'in_progress' }] },
      })
      const res = await testsAService.getMyResults()
      expect(fetchApi).toHaveBeenCalledWith('/tests/attempts')
      expect(res.data[0].status).toBe('in_progress')
    })

    it('gets specific attempt detail', async () => {
      vi.mocked(fetchApi).mockResolvedValueOnce({ data: { id: 'att-3' } })
      await testsAService.getAttempt('att-3')
      expect(fetchApi).toHaveBeenCalledWith('/tests/attempts/att-3')
    })
  })

  describe('listTests', () => {
    it('lists all available tests', async () => {
      vi.mocked(fetchApi).mockResolvedValueOnce({ data: [{ id: '1' }] })
      const res = await testsAService.listTests()
      expect(fetchApi).toHaveBeenCalledWith('/tests')
      expect(res.data[0].id).toBe('1')
    })
  })
})
