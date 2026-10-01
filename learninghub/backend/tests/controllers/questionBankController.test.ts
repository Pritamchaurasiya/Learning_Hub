import { Request, Response } from 'express'
import {
  importQuestions,
  validateQuestion,
  exportQuestions,
  getQuestionBankStats,
  listQuestions,
  getQuestion,
  createQuestion,
  updateQuestion,
  deleteQuestion,
  reviewQuestion,
} from '../../src/controllers/questionBankController'
import { questionBankService } from '../../src/services/QuestionBankService'

jest.mock('../../src/services/QuestionBankService', () => ({
  questionBankService: {
    importQuestions: jest.fn(),
    validateQuestion: jest.fn(),
    exportQuestions: jest.fn(),
    getQuestionBankStats: jest.fn(),
    listQuestions: jest.fn(),
    getQuestion: jest.fn(),
    createSingleQuestion: jest.fn(),
    updateQuestion: jest.fn(),
    deleteQuestion: jest.fn(),
    reviewQuestion: jest.fn(),
  },
}))

describe('questionBankController', () => {
  let mockReq: Partial<Request>
  let mockRes: Partial<Response>
  let jsonFn: jest.Mock
  let statusFn: jest.Mock

  beforeEach(() => {
    jest.clearAllMocks()
    jsonFn = jest.fn()
    statusFn = jest.fn().mockReturnValue({ json: jsonFn })
    mockRes = {
      status: statusFn,
      json: jsonFn,
    }
  })

  describe('listQuestions', () => {
    it('should list questions and return 200', async () => {
      mockReq = {
        query: { page: '1', limit: '10', status: 'APPROVED' },
      }
      const fakeResult = {
        questions: [{ id: 'q-1', text: 'Test?', status: 'APPROVED' }],
        pagination: { total: 1, page: 1, limit: 10, totalPages: 1 },
      }
      ;(questionBankService.listQuestions as jest.Mock).mockResolvedValueOnce(fakeResult)

      await listQuestions(mockReq as Request, mockRes as Response, jest.fn())

      expect(statusFn).toHaveBeenCalledWith(200)
      expect(jsonFn).toHaveBeenCalledWith({
        status: 'success',
        data: fakeResult,
      })
    })
  })

  describe('getQuestion', () => {
    it('should get question by id and return 200', async () => {
      mockReq = { params: { id: 'q-123' } }
      const fakeQ = { id: 'q-123', text: 'Sample', status: 'APPROVED' }
      ;(questionBankService.getQuestion as jest.Mock).mockResolvedValueOnce(fakeQ)

      await getQuestion(mockReq as Request, mockRes as Response, jest.fn())

      expect(statusFn).toHaveBeenCalledWith(200)
      expect(jsonFn).toHaveBeenCalledWith({
        status: 'success',
        data: fakeQ,
      })
    })
  })

  describe('createQuestion', () => {
    it('should create question and return 201', async () => {
      mockReq = {
        body: { text: 'New question?', type: 'MCQ' },
        user: { userId: 'inst-1', email: 'inst@test.com', role: 'INSTRUCTOR' },
      }
      const created = { id: 'q-new', text: 'New question?', status: 'PENDING_REVIEW' }
      ;(questionBankService.createSingleQuestion as jest.Mock).mockResolvedValueOnce(created)

      await createQuestion(mockReq as Request, mockRes as Response, jest.fn())

      expect(statusFn).toHaveBeenCalledWith(201)
      expect(jsonFn).toHaveBeenCalledWith({
        status: 'success',
        data: created,
        message: 'Question created successfully',
      })
    })
  })

  describe('updateQuestion', () => {
    it('should update question and return 200', async () => {
      mockReq = {
        params: { id: 'q-123' },
        body: { text: 'Updated question?' },
        user: { userId: 'inst-1', email: 'inst@test.com', role: 'INSTRUCTOR' },
      }
      const updated = { id: 'q-123', text: 'Updated question?' }
      ;(questionBankService.updateQuestion as jest.Mock).mockResolvedValueOnce(updated)

      await updateQuestion(mockReq as Request, mockRes as Response, jest.fn())

      expect(statusFn).toHaveBeenCalledWith(200)
      expect(jsonFn).toHaveBeenCalledWith({
        status: 'success',
        data: updated,
        message: 'Question updated successfully',
      })
    })
  })

  describe('deleteQuestion', () => {
    it('should delete question and return 200', async () => {
      mockReq = { params: { id: 'q-123' } }
      ;(questionBankService.deleteQuestion as jest.Mock).mockResolvedValueOnce({
        success: true,
        id: 'q-123',
      })

      await deleteQuestion(mockReq as Request, mockRes as Response, jest.fn())

      expect(statusFn).toHaveBeenCalledWith(200)
      expect(jsonFn).toHaveBeenCalledWith({
        status: 'success',
        data: { success: true, id: 'q-123' },
        message: 'Question deleted successfully',
      })
    })
  })

  describe('reviewQuestion', () => {
    it('should review question and return 200', async () => {
      mockReq = {
        params: { id: 'q-123' },
        body: { status: 'APPROVED', feedback: 'Approved by peer reviewer' },
        user: { userId: 'reviewer-1', email: 'rev@test.com', role: 'INSTRUCTOR' },
      }
      const reviewed = { id: 'q-123', status: 'APPROVED' }
      ;(questionBankService.reviewQuestion as jest.Mock).mockResolvedValueOnce(reviewed)

      await reviewQuestion(mockReq as Request, mockRes as Response, jest.fn())

      expect(statusFn).toHaveBeenCalledWith(200)
      expect(jsonFn).toHaveBeenCalledWith({
        status: 'success',
        data: reviewed,
        message: 'Question review status updated to APPROVED',
      })
    })

    it('should send validation error when status is missing', async () => {
      mockReq = {
        params: { id: 'q-123' },
        body: {},
      }

      await reviewQuestion(mockReq as Request, mockRes as Response, jest.fn())

      expect(statusFn).toHaveBeenCalledWith(400)
      expect(jsonFn).toHaveBeenCalledWith({
        status: 'error',
        message: 'Review status is required (APPROVED, REJECTED, PENDING_REVIEW, DRAFT)',
        code: 'VALIDATION_ERROR',
      })
    })
  })

  describe('importQuestions', () => {
    it('should import questions and return 201', async () => {
      mockReq = {
        body: { questions: [{ text: 'Q1' }] },
        user: { userId: 'inst-1', email: 'inst@test.com', role: 'INSTRUCTOR' },
      }
      const importRes = {
        totalProcessed: 1,
        importedCount: 1,
        skippedDuplicates: 0,
        errorCount: 0,
        errors: [],
        importedQuestionIds: ['q-1'],
      }
      ;(questionBankService.importQuestions as jest.Mock).mockResolvedValueOnce(importRes)

      await importQuestions(mockReq as Request, mockRes as Response, jest.fn())

      expect(statusFn).toHaveBeenCalledWith(201)
      expect(jsonFn).toHaveBeenCalledWith(
        expect.objectContaining({
          status: 'success',
          data: importRes,
        })
      )
    })
  })

  describe('validateQuestion', () => {
    it('should validate valid question payload', async () => {
      mockReq = {
        body: { text: 'Valid?', type: 'MCQ' },
      }
      ;(questionBankService.validateQuestion as jest.Mock).mockReturnValueOnce({
        isValid: true,
        normalized: { text: 'Valid?', type: 'MCQ' },
      })

      await validateQuestion(mockReq as Request, mockRes as Response, jest.fn())

      expect(statusFn).toHaveBeenCalledWith(200)
    })
  })

  describe('exportQuestions', () => {
    it('should export questions and return 200', async () => {
      mockReq = { query: { testId: 'test-1' } }
      ;(questionBankService.exportQuestions as jest.Mock).mockResolvedValueOnce([{ id: 'q-1' }])

      await exportQuestions(mockReq as Request, mockRes as Response, jest.fn())

      expect(statusFn).toHaveBeenCalledWith(200)
      expect(jsonFn).toHaveBeenCalledWith({
        status: 'success',
        data: { questions: [{ id: 'q-1' }], count: 1 },
      })
    })
  })

  describe('getQuestionBankStats', () => {
    it('should return stats with 200', async () => {
      mockReq = {}
      const stats = { totalQuestions: 50, byType: {}, avgDifficulty: 0.5, avgPoints: 10 }
      ;(questionBankService.getQuestionBankStats as jest.Mock).mockResolvedValueOnce(stats)

      await getQuestionBankStats(mockReq as Request, mockRes as Response, jest.fn())

      expect(statusFn).toHaveBeenCalledWith(200)
      expect(jsonFn).toHaveBeenCalledWith({
        status: 'success',
        data: stats,
      })
    })
  })
})
