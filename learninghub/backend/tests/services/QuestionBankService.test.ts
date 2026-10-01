import { questionBankService } from '../../src/services/QuestionBankService'
import { prisma } from '../../src/prismaClient'

jest.mock('../../src/prismaClient', () => {
  const mockPrisma: any = {
    question: {
      findUnique: jest.fn(),
      findMany: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      count: jest.fn(),
      groupBy: jest.fn(),
      aggregate: jest.fn(),
    },
    option: {
      deleteMany: jest.fn(),
    },
    test: {
      findFirst: jest.fn(),
      create: jest.fn(),
    },
    $transaction: jest.fn((cb: any) => {
      if (typeof cb === 'function') {
        return cb(mockPrisma)
      }
      return cb
    }),
  }
  return { prisma: mockPrisma }
})

describe('QuestionBankService - Ingestion, Validation & Lifecycle', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('validateQuestion', () => {
    it('should validate a well-formed MCQ', () => {
      const raw = {
        text: 'What is the time complexity of binary search?',
        type: 'MCQ',
        difficulty: 0.3,
        bloomLevel: 'UNDERSTAND',
        points: 10,
        options: [
          { text: 'O(1)', isCorrect: false },
          { text: 'O(log n)', isCorrect: true },
          { text: 'O(n)', isCorrect: false },
        ],
      }

      const result = questionBankService.validateQuestion(raw)
      expect(result.isValid).toBe(true)
      expect(result.normalized?.text).toBe(raw.text)
    })

    it('should reject MCQ with multiple or zero correct answers', () => {
      const raw = {
        text: 'Invalid Question',
        type: 'MCQ',
        options: [
          { text: 'Opt A (correct)', isCorrect: true },
          { text: 'Opt B (also correct)', isCorrect: true },
        ],
      }

      const result = questionBankService.validateQuestion(raw)
      expect(result.isValid).toBe(false)
      expect(result.error).toContain('must have exactly 1 correct option')
    })

    it('should validate Numerical question with numeric values', () => {
      const raw = {
        text: 'Calculate g in m/s^2',
        type: 'NUMERICAL',
        options: [{ text: '9.81', isCorrect: true }],
      }

      const result = questionBankService.validateQuestion(raw)
      expect(result.isValid).toBe(true)
    })

    it('should auto-populate True/False options if omitted', () => {
      const raw = {
        text: 'JavaScript is a compiled language',
        type: 'TRUE_FALSE',
        options: [
          { text: 'True', isCorrect: false },
          { text: 'False', isCorrect: true },
        ],
      }

      const result = questionBankService.validateQuestion(raw)
      expect(result.isValid).toBe(true)
      expect(result.normalized?.options.length).toBe(2)
    })
  })

  describe('importQuestions', () => {
    it('should bulk import valid questions and skip duplicates', async () => {
      ;(prisma.test.findFirst as jest.Mock).mockResolvedValueOnce({ id: 'test-1' })
      ;(prisma.question.findMany as jest.Mock).mockResolvedValueOnce([
        { text: 'Existing question in bank' },
      ])

      ;(prisma.question.create as jest.Mock).mockResolvedValue({ id: 'new-q-1' })
      ;(prisma.$transaction as jest.Mock).mockResolvedValueOnce([{ id: 'new-q-1' }])

      const payload = {
        testId: 'test-1',
        questions: [
          {
            // Duplicate
            text: 'Existing question in bank',
            type: 'MCQ',
            options: [
              { text: 'A', isCorrect: true },
              { text: 'B', isCorrect: false },
            ],
          },
          {
            // New Valid
            text: 'Brand new unique question',
            type: 'MCQ',
            options: [
              { text: 'A', isCorrect: true },
              { text: 'B', isCorrect: false },
            ],
          },
          {
            // Invalid
            text: 'Invalid shape',
            type: 'MCQ',
            options: [],
          },
        ],
      }

      const output = await questionBankService.importQuestions(payload)
      expect(output.totalProcessed).toBe(3)
      expect(output.skippedDuplicates).toBe(1)
      expect(output.errorCount).toBe(1)
      expect(output.importedCount).toBe(1)
    })

    it('should throw ValidationError if question batch exceeds 500', async () => {
      const oversized = new Array(501).fill({
        text: 'Dummy question',
        type: 'MCQ',
        options: [{ text: 'A', isCorrect: true }],
      })

      await expect(
        questionBankService.importQuestions({
          questions: oversized,
        })
      ).rejects.toThrow('Maximum 500 questions allowed per import batch')
    })
  })

  describe('getQuestionBankStats', () => {
    it('should return aggregated statistics', async () => {
      ;(prisma.question.count as jest.Mock).mockResolvedValueOnce(100)
      ;(prisma.question.groupBy as jest.Mock).mockResolvedValueOnce([
        { type: 'MCQ', _count: { id: 70 } },
        { type: 'MSQ', _count: { id: 30 } },
      ])
      ;(prisma.question.aggregate as jest.Mock).mockResolvedValueOnce({
        _avg: { difficulty: 1.5, points: 10 },
      })

      const stats = await questionBankService.getQuestionBankStats()
      expect(stats.totalQuestions).toBe(100)
      expect(stats.byType.MCQ).toBe(70)
      expect(stats.byType.MSQ).toBe(30)
      expect(stats.avgDifficulty).toBe(1.5)
    })
  })

  describe('listQuestions', () => {
    it('should list questions with pagination and format status correctly', async () => {
      ;(prisma.question.count as jest.Mock).mockResolvedValueOnce(1)
      ;(prisma.question.findMany as jest.Mock).mockResolvedValueOnce([
        {
          id: 'q-101',
          testId: 'test-1',
          text: 'What is photosynthesis?',
          type: 'MCQ',
          difficulty: 0.4,
          bloomLevel: 'UNDERSTAND',
          tags: ['biology', 'status:APPROVED'],
          points: 10,
          order: 1,
          solutionSteps: {
            reviewHistory: [{ status: 'APPROVED', reviewerName: 'Prof. Oak' }],
          },
          options: [
            { id: 'opt-1', text: 'Light to chemical energy', isCorrect: true, order: 0 },
            { id: 'opt-2', text: 'Respiration', isCorrect: false, order: 1 },
          ],
        },
      ])

      const res = await questionBankService.listQuestions({
        page: 1,
        limit: 10,
        status: 'APPROVED',
        search: 'photosynthesis',
      })

      expect(res.questions.length).toBe(1)
      expect(res.questions[0].status).toBe('APPROVED')
      expect(res.questions[0].options.length).toBe(2)
      expect(res.pagination.total).toBe(1)
      expect(res.pagination.totalPages).toBe(1)
    })
  })

  describe('getQuestion', () => {
    it('should return question when found', async () => {
      ;(prisma.question.findUnique as jest.Mock).mockResolvedValueOnce({
        id: 'q-101',
        testId: 'test-1',
        text: 'Sample Q',
        type: 'MCQ',
        difficulty: 0.5,
        bloomLevel: 'APPLY',
        tags: ['status:PENDING_REVIEW'],
        points: 10,
        order: 1,
        options: [{ id: 'opt-1', text: 'A', isCorrect: true, order: 0 }],
      })

      const q = await questionBankService.getQuestion('q-101')
      expect(q.id).toBe('q-101')
      expect(q.status).toBe('PENDING_REVIEW')
    })

    it('should throw NotFoundError if question does not exist', async () => {
      ;(prisma.question.findUnique as jest.Mock).mockResolvedValueOnce(null)
      await expect(questionBankService.getQuestion('nonexistent')).rejects.toThrow(
        'Question with ID nonexistent not found'
      )
    })
  })

  describe('createSingleQuestion', () => {
    it('should validate, set order, default status, and create question', async () => {
      ;(prisma.test.findFirst as jest.Mock).mockResolvedValueOnce({ id: 'bank-test-id' })
      ;(prisma.question.aggregate as jest.Mock).mockResolvedValueOnce({ _max: { order: 5 } })
      ;(prisma.question.create as jest.Mock).mockResolvedValueOnce({
        id: 'new-q-id',
        testId: 'bank-test-id',
        text: 'What is QuickSort?',
        type: 'MCQ',
        difficulty: 0.6,
        bloomLevel: 'APPLY',
        tags: ['status:PENDING_REVIEW', 'dsa'],
        points: 10,
        order: 6,
        options: [
          { id: 'opt-1', text: 'Divide and conquer', isCorrect: true, order: 0 },
          { id: 'opt-2', text: 'Greedy', isCorrect: false, order: 1 },
        ],
      })

      const input = {
        text: 'What is QuickSort?',
        type: 'MCQ',
        difficulty: 0.6,
        bloomLevel: 'APPLY',
        tags: ['dsa'],
        points: 10,
        options: [
          { text: 'Divide and conquer', isCorrect: true },
          { text: 'Greedy', isCorrect: false },
        ],
      }

      const created = await questionBankService.createSingleQuestion(input, 'instructor-123')
      expect(created.id).toBe('new-q-id')
      expect(created.status).toBe('PENDING_REVIEW')
      expect(prisma.question.create).toHaveBeenCalled()
    })

    it('should throw ValidationError on malformed question', async () => {
      const invalid = {
        text: 'Too short',
        type: 'MCQ',
        options: [], // invalid for MCQ
      }

      await expect(questionBankService.createSingleQuestion(invalid)).rejects.toThrow(
        'MCQ at item 1 requires at least 2 options'
      )
    })
  })

  describe('updateQuestion', () => {
    it('should update question fields and replace options in transaction', async () => {
      ;(prisma.question.findUnique as jest.Mock)
        .mockResolvedValueOnce({
          id: 'q-101',
          testId: 'test-1',
          text: 'Old Text',
          type: 'MCQ',
          difficulty: 0.5,
          bloomLevel: 'UNDERSTAND',
          tags: ['status:APPROVED'],
          points: 10,
          order: 1,
          options: [{ id: 'opt-old', text: 'Old', isCorrect: true, order: 0 }],
        })
        .mockResolvedValueOnce({
          id: 'q-101',
          testId: 'test-1',
          text: 'Updated Text',
          type: 'MCQ',
          difficulty: 0.8,
          bloomLevel: 'ANALYZE',
          tags: ['status:APPROVED', 'updated'],
          points: 20,
          order: 1,
          options: [
            { id: 'opt-new-1', text: 'New 1', isCorrect: true, order: 0 },
            { id: 'opt-new-2', text: 'New 2', isCorrect: false, order: 1 },
          ],
        })

      ;(prisma.option.deleteMany as jest.Mock).mockResolvedValueOnce({ count: 1 })
      ;(prisma.question.update as jest.Mock).mockResolvedValueOnce({ id: 'q-101' })

      const updated = await questionBankService.updateQuestion('q-101', {
        text: 'Updated Text',
        difficulty: 0.8,
        bloomLevel: 'ANALYZE',
        points: 20,
        options: [
          { text: 'New 1', isCorrect: true },
          { text: 'New 2', isCorrect: false },
        ],
      })

      expect(updated.text).toBe('Updated Text')
      expect(updated.points).toBe(20)
      expect(prisma.option.deleteMany).toHaveBeenCalledWith({ where: { questionId: 'q-101' } })
    })

    it('should throw NotFoundError if question does not exist', async () => {
      ;(prisma.question.findUnique as jest.Mock).mockResolvedValueOnce(null)
      await expect(
        questionBankService.updateQuestion('nonexistent', { text: 'Valid text with options' })
      ).rejects.toThrow('Question with ID nonexistent not found')
    })
  })

  describe('deleteQuestion', () => {
    it('should delete existing question', async () => {
      ;(prisma.question.findUnique as jest.Mock).mockResolvedValueOnce({ id: 'q-101' })
      ;(prisma.question.delete as jest.Mock).mockResolvedValueOnce({ id: 'q-101' })

      const res = await questionBankService.deleteQuestion('q-101')
      expect(res.success).toBe(true)
      expect(res.id).toBe('q-101')
      expect(prisma.question.delete).toHaveBeenCalledWith({ where: { id: 'q-101' } })
    })

    it('should throw NotFoundError when deleting non-existent question', async () => {
      ;(prisma.question.findUnique as jest.Mock).mockResolvedValueOnce(null)
      await expect(questionBankService.deleteQuestion('ghost')).rejects.toThrow(
        'Question with ID ghost not found'
      )
    })
  })

  describe('reviewQuestion', () => {
    it('should transition review status and update audit trail', async () => {
      ;(prisma.question.findUnique as jest.Mock).mockResolvedValueOnce({
        id: 'q-101',
        testId: 'test-1',
        text: 'Evaluate integral',
        type: 'NUMERICAL',
        difficulty: 0.9,
        bloomLevel: 'EVALUATE',
        tags: ['math', 'status:PENDING_REVIEW'],
        points: 10,
        order: 1,
        solutionSteps: {
          reviewHistory: [
            { status: 'PENDING_REVIEW', reviewerId: 'creator', reviewedAt: '2026-09-01T00:00:00Z' },
          ],
        },
        options: [{ id: 'opt-1', text: '42', isCorrect: true, order: 0 }],
      })

      ;(prisma.question.update as jest.Mock).mockResolvedValueOnce({
        id: 'q-101',
        testId: 'test-1',
        text: 'Evaluate integral',
        type: 'NUMERICAL',
        difficulty: 0.9,
        bloomLevel: 'EVALUATE',
        tags: ['status:APPROVED', 'math'],
        points: 10,
        order: 1,
        solutionSteps: {
          reviewHistory: [
            {
              status: 'APPROVED',
              reviewerId: 'reviewer-99',
              reviewerName: 'Dr. Gauss',
              feedback: 'Flawless question',
              reviewedAt: new Date().toISOString(),
            },
            { status: 'PENDING_REVIEW', reviewerId: 'creator', reviewedAt: '2026-09-01T00:00:00Z' },
          ],
        },
        options: [{ id: 'opt-1', text: '42', isCorrect: true, order: 0 }],
      })

      const res = await questionBankService.reviewQuestion('q-101', {
        status: 'APPROVED',
        reviewerId: 'reviewer-99',
        reviewerName: 'Dr. Gauss',
        feedback: 'Flawless question',
        rating: 5,
      })

      expect(res.status).toBe('APPROVED')
      expect(res.reviewHistory?.length).toBe(2)
      expect((res.reviewHistory as any[])?.[0].status).toBe('APPROVED')
      expect(prisma.question.update).toHaveBeenCalled()
    })

    it('should reject invalid review status', async () => {
      await expect(
        questionBankService.reviewQuestion('q-101', {
          status: 'UNAUTHORIZED_STATUS' as any,
        })
      ).rejects.toThrow('Invalid review status')
    })
  })
})

