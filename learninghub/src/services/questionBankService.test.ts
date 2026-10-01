import { describe, it, expect, vi, beforeEach } from 'vitest'
import { questionBankService, RawQuestionInput, ReviewQuestionInput } from './questionBankService'
import { fetchApi } from '../utils/api'

vi.mock('../utils/api', () => ({
  fetchApi: vi.fn(),
}))

describe('questionBankService', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('listQuestions', () => {
    it('fetches questions with query params', async () => {
      const mockResult = {
        questions: [{ id: 'q-1', text: 'Sample', status: 'APPROVED', options: [] }],
        pagination: { total: 1, page: 1, limit: 10, totalPages: 1 },
      }
      vi.mocked(fetchApi).mockResolvedValueOnce({ data: mockResult })

      const res = await questionBankService.listQuestions({
        status: 'APPROVED',
        search: 'algebra',
        page: 1,
        limit: 10,
      })

      expect(fetchApi).toHaveBeenCalledWith(
        '/question-bank/questions?search=algebra&status=APPROVED&page=1&limit=10',
        { method: 'GET' }
      )
      expect(res.questions.length).toBe(1)
      expect(res.questions[0].id).toBe('q-1')
    })
  })

  describe('getQuestion', () => {
    it('fetches a single question by id', async () => {
      const mockQ = { id: 'q-42', text: 'Specific question', status: 'PENDING_REVIEW' }
      vi.mocked(fetchApi).mockResolvedValueOnce({ data: mockQ })

      const res = await questionBankService.getQuestion('q-42')
      expect(fetchApi).toHaveBeenCalledWith('/question-bank/questions/q-42', { method: 'GET' })
      expect(res.id).toBe('q-42')
    })
  })

  describe('createQuestion', () => {
    it('posts new question payload', async () => {
      const input: RawQuestionInput = {
        text: 'What is O(log n)?',
        type: 'MCQ',
        difficulty: 0.4,
        bloomLevel: 'UNDERSTAND',
        tags: ['dsa'],
        points: 10,
        options: [
          { text: 'Binary Search', isCorrect: true },
          { text: 'Linear Search', isCorrect: false },
        ],
      }
      const created = { id: 'q-new', ...input, status: 'PENDING_REVIEW' }
      vi.mocked(fetchApi).mockResolvedValueOnce({ data: created })

      const res = await questionBankService.createQuestion(input)
      expect(fetchApi).toHaveBeenCalledWith('/question-bank/questions', {
        method: 'POST',
        body: JSON.stringify(input),
      })
      expect(res.id).toBe('q-new')
    })
  })

  describe('updateQuestion', () => {
    it('sends PUT request to update question', async () => {
      const updateData = { text: 'Updated text', points: 15 }
      const updated = { id: 'q-42', ...updateData, status: 'APPROVED' }
      vi.mocked(fetchApi).mockResolvedValueOnce({ data: updated })

      const res = await questionBankService.updateQuestion('q-42', updateData)
      expect(fetchApi).toHaveBeenCalledWith('/question-bank/questions/q-42', {
        method: 'PUT',
        body: JSON.stringify(updateData),
      })
      expect(res.points).toBe(15)
    })
  })

  describe('deleteQuestion', () => {
    it('sends DELETE request for question id', async () => {
      vi.mocked(fetchApi).mockResolvedValueOnce({ data: { success: true, id: 'q-42' } })

      const res = await questionBankService.deleteQuestion('q-42')
      expect(fetchApi).toHaveBeenCalledWith('/question-bank/questions/q-42', {
        method: 'DELETE',
      })
      expect(res.success).toBe(true)
    })
  })

  describe('reviewQuestion', () => {
    it('posts review verdict with feedback', async () => {
      const review: ReviewQuestionInput = {
        status: 'APPROVED',
        feedback: 'Excellent question with good distractor choices',
        rating: 5,
      }
      const reviewed = { id: 'q-42', status: 'APPROVED' }
      vi.mocked(fetchApi).mockResolvedValueOnce({ data: reviewed })

      const res = await questionBankService.reviewQuestion('q-42', review)
      expect(fetchApi).toHaveBeenCalledWith('/question-bank/questions/q-42/review', {
        method: 'POST',
        body: JSON.stringify(review),
      })
      expect(res.status).toBe('APPROVED')
    })
  })

  describe('importQuestions', () => {
    it('posts import payload and returns result', async () => {
      const payload = {
        questions: [
          {
            text: 'Import Q',
            type: 'MCQ' as const,
            difficulty: 0.5,
            bloomLevel: 'APPLY' as const,
            tags: [],
            points: 10,
            options: [{ text: 'Yes', isCorrect: true }, { text: 'No', isCorrect: false }],
          },
        ],
      }
      const importResult = {
        totalProcessed: 1,
        importedCount: 1,
        skippedDuplicates: 0,
        errorCount: 0,
        errors: [],
        importedQuestionIds: ['q-imp-1'],
      }
      vi.mocked(fetchApi).mockResolvedValueOnce({ data: importResult })

      const res = await questionBankService.importQuestions(payload)
      expect(fetchApi).toHaveBeenCalledWith('/question-bank/import', {
        method: 'POST',
        body: JSON.stringify(payload),
      })
      expect(res.importedCount).toBe(1)
    })
  })

  describe('validateQuestion', () => {
    it('validates question payload', async () => {
      const q = {
        text: 'Valid Q?',
        type: 'MCQ' as const,
        difficulty: 0.5,
        bloomLevel: 'UNDERSTAND' as const,
        tags: [],
        points: 10,
        options: [{ text: 'A', isCorrect: true }, { text: 'B', isCorrect: false }],
      }
      vi.mocked(fetchApi).mockResolvedValueOnce({ data: { isValid: true } })

      const res = await questionBankService.validateQuestion(q)
      expect(fetchApi).toHaveBeenCalledWith('/question-bank/validate', {
        method: 'POST',
        body: JSON.stringify(q),
      })
      expect(res.isValid).toBe(true)
    })
  })

  describe('exportQuestions', () => {
    it('exports questions with filter params', async () => {
      vi.mocked(fetchApi).mockResolvedValueOnce({ data: { questions: [{ id: 'q-1' }], count: 1 } })

      const res = await questionBankService.exportQuestions({ testId: 'test-1', type: 'MCQ' })
      expect(fetchApi).toHaveBeenCalledWith('/question-bank/export?testId=test-1&type=MCQ', {
        method: 'GET',
      })
      expect(res.count).toBe(1)
    })
  })

  describe('getQuestionBankStats', () => {
    it('fetches Question Bank statistics', async () => {
      const stats = { totalQuestions: 100, byType: { MCQ: 80, MSQ: 20 }, avgDifficulty: 0.5, avgPoints: 10 }
      vi.mocked(fetchApi).mockResolvedValueOnce({ data: stats })

      const res = await questionBankService.getQuestionBankStats()
      expect(fetchApi).toHaveBeenCalledWith('/question-bank/stats', { method: 'GET' })
      expect(res.totalQuestions).toBe(100)
    })
  })
})
