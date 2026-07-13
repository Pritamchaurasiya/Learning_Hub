import { Request, Response } from 'express'
import { mockDeep, DeepMockProxy } from 'jest-mock-extended'
import {
  listProblems,
  getProblem,
  submitSolution,
  getSubmissions,
} from '../../src/controllers/problemsController'
import { prisma } from '../../src/prismaClient'
import { CodeSandboxService } from '../../src/services/CodeSandboxService'
import { growthEngineService } from '../../src/services/GrowthEngineService'

jest.mock('../../src/services/CodeSandboxService', () => ({
  CodeSandboxService: {
    execute: jest.fn(),
  },
}))

jest.mock('../../src/services/GrowthEngineService', () => ({
  growthEngineService: {
    awardXP: jest.fn().mockResolvedValue(undefined),
  },
}))

describe('ProblemsController', () => {
  let mockReq: DeepMockProxy<Request>
  let mockRes: DeepMockProxy<Response>
  let jsonMock: jest.Mock
  let statusMock: jest.Mock
  let nextMock: jest.Mock

  beforeEach(() => {
    jsonMock = jest.fn().mockReturnThis()
    statusMock = jest.fn().mockReturnValue({ json: jsonMock })
    nextMock = jest.fn()
    mockReq = mockDeep<Request>()
    mockRes = mockDeep<Response>()
    mockRes.status = statusMock as any
    mockRes.json = jsonMock as any
    mockReq.query = {}
    mockReq.user = { userId: 'user-1', email: 'student@test.com', role: 'STUDENT' }
    ;(prisma.problemSubmission.create as jest.Mock).mockImplementation(async ({ data }) => data)
  })

  describe('listProblems', () => {
    it('returns paginated problems list', async () => {
      ;(prisma.problem.count as jest.Mock).mockResolvedValue(2)
      ;(prisma.problem.findMany as jest.Mock).mockResolvedValue([
        { id: 'p1', title: 'Two Sum', difficulty: 'EASY', points: 100, user_status: 'UNATTEMPTED' },
        { id: 'p2', title: 'Reverse Linked List', difficulty: 'MEDIUM', points: 200, user_status: 'ATTEMPTED' },
      ])
      ;(prisma.problemSubmission.findMany as jest.Mock).mockResolvedValue([])

      await listProblems(mockReq as any, mockRes as any, nextMock)

      expect(statusMock).toHaveBeenCalledWith(200)
      expect(jsonMock).toHaveBeenCalledWith(
        expect.objectContaining({
          status: 'success',
          data: expect.arrayContaining([
            expect.objectContaining({ id: 'p1', title: 'Two Sum' }),
            expect.objectContaining({ id: 'p2', title: 'Reverse Linked List' }),
          ]),
          meta: expect.objectContaining({ total: 2 }),
        })
      )
    })

    it('filters problems by difficulty', async () => {
      mockReq.query = { difficulty: 'EASY' }
      ;(prisma.problem.count as jest.Mock).mockResolvedValue(1)
      ;(prisma.problem.findMany as jest.Mock).mockResolvedValue([
        { id: 'p1', title: 'Two Sum', difficulty: 'EASY', points: 100, user_status: 'UNATTEMPTED' },
      ])
      // Setup empty user submissions
      ;(prisma.problemSubmission.findMany as jest.Mock).mockResolvedValue([])

      await listProblems(mockReq as any, mockRes as any, nextMock)

      expect(prisma.problem.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ difficulty: 'EASY' }),
        })
      )
    })
  })

  describe('getProblem', () => {
    it('returns problem by slug', async () => {
      mockReq.params = { slug: 'two-sum' }
      ;(prisma.problem.findUnique as jest.Mock).mockResolvedValue({
        id: 'p1',
        slug: 'two-sum',
        title: 'Two Sum',
        description: 'Find two numbers that add up to target',
        difficulty: 'EASY',
        points: 100,
      })

      await getProblem(mockReq as any, mockRes as any, nextMock)

      expect(statusMock).toHaveBeenCalledWith(200)
      expect(jsonMock).toHaveBeenCalledWith(
        expect.objectContaining({
          status: 'success',
          data: expect.objectContaining({ id: 'p1', slug: 'two-sum' }),
        })
      )
    })

    it('returns 404 when problem not found', async () => {
      mockReq.params = { slug: 'non-existent' }
      ;(prisma.problem.findUnique as jest.Mock).mockResolvedValue(null)

      await getProblem(mockReq as any, mockRes as any, nextMock)

      expect(statusMock).toHaveBeenCalledWith(404)
      expect(jsonMock).toHaveBeenCalledWith({
        status: 'error',
        message: 'Problem not found',
        code: 'NOT_FOUND',
      })
    })
  })

  describe('submitSolution', () => {
    it('submits code and returns accepted result', async () => {
      mockReq.params = { id: 'p1' }
      mockReq.body = { code: 'console.log("hello")', language: 'javascript' }
      ;(prisma.problem.findUnique as jest.Mock).mockResolvedValue({
        id: 'p1',
        title: 'Two Sum',
        points: 100,
        testCases: '[{"input":"1 2","output":"3"}]',
      })
      ;(CodeSandboxService.execute as jest.Mock).mockResolvedValue({
        status: 'accepted',
        executionTime: 120,
        memoryUsed: 256,
        testCasesPassed: 1,
        testCasesTotal: 1,
      })

      await submitSolution(mockReq as any, mockRes as any, nextMock)

      expect(CodeSandboxService.execute).toHaveBeenCalledWith(
        expect.objectContaining({
          code: 'console.log("hello")',
          language: 'javascript',
          timeLimit: 5,
          memoryLimit: 256,
        })
      )
      expect(statusMock).toHaveBeenCalledWith(200)
      expect(jsonMock).toHaveBeenCalledWith(
        expect.objectContaining({
          status: 'success',
          data: expect.objectContaining({ status: 'ACCEPTED', score: 100 }),
        })
      )
    })

    it('returns partial score for wrong answer', async () => {
      mockReq.params = { id: 'p1' }
      mockReq.body = { code: 'console.log("wrong")', language: 'javascript' }
      ;(prisma.problem.findUnique as jest.Mock).mockResolvedValue({
        id: 'p1',
        title: 'Two Sum',
        points: 100,
        testCases: '[{"input":"1 2","output":"3"}]',
      })
      ;(CodeSandboxService.execute as jest.Mock).mockResolvedValue({
        status: 'wrong_answer',
        executionTime: 120,
        memoryUsed: 256,
        testCasesPassed: 0,
        testCasesTotal: 1,
      })

      await submitSolution(mockReq as any, mockRes as any, nextMock)

      expect(statusMock).toHaveBeenCalledWith(200)
      expect(jsonMock).toHaveBeenCalledWith(
        expect.objectContaining({
          status: 'success',
          data: expect.objectContaining({ status: 'WRONG_ANSWER', score: 0 }),
        })
      )
    })

    it('returns 404 when problem does not exist', async () => {
      mockReq.params = { id: 'non-existent' }
      mockReq.body = { code: 'console.log("hello")', language: 'javascript' }
      ;(prisma.problem.findUnique as jest.Mock).mockResolvedValue(null)

      await submitSolution(mockReq as any, mockRes as any, nextMock)

      expect(statusMock).toHaveBeenCalledWith(404)
      expect(jsonMock).toHaveBeenCalledWith({
        status: 'error',
        message: 'Problem not found',
        code: 'NOT_FOUND',
      })
    })

    it('handles compilation error gracefully', async () => {
      mockReq.params = { id: 'p1' }
      mockReq.body = { code: 'invalid syntax here !!!', language: 'javascript' }
      ;(prisma.problem.findUnique as jest.Mock).mockResolvedValue({
        id: 'p1',
        title: 'Two Sum',
        points: 100,
        testCases: '[{"input":"1 2","output":"3"}]',
      })
      ;(CodeSandboxService.execute as jest.Mock).mockResolvedValue({
        status: 'compilation_error',
        executionTime: 0,
        memoryUsed: 0,
        testCasesPassed: 0,
        testCasesTotal: 1,
      })

      await submitSolution(mockReq as any, mockRes as any, nextMock)

      expect(statusMock).toHaveBeenCalledWith(200)
      expect(jsonMock).toHaveBeenCalledWith(
        expect.objectContaining({
          status: 'success',
          data: expect.objectContaining({ status: 'COMPILATION_ERROR' }),
        })
      )
    })
  })

  describe('getSubmissions', () => {
    it('returns submissions for a problem', async () => {
      mockReq.params = { id: 'p1' }
      mockReq.user = { userId: 'user-1', email: 'student@test.com', role: 'STUDENT' }
      ;(prisma.problemSubmission.findMany as jest.Mock).mockResolvedValue([
        { id: 's1', status: 'ACCEPTED', score: 100, language: 'javascript', createdAt: new Date() },
        { id: 's2', status: 'WRONG_ANSWER', score: 0, language: 'javascript', createdAt: new Date() },
      ])

      await getSubmissions(mockReq as any, mockRes as any, nextMock)

      expect(statusMock).toHaveBeenCalledWith(200)
      expect(jsonMock).toHaveBeenCalledWith(
        expect.objectContaining({
          status: 'success',
          data: expect.arrayContaining([
            expect.objectContaining({ id: 's1', status: 'ACCEPTED' }),
            expect.objectContaining({ id: 's2', status: 'WRONG_ANSWER' }),
          ]),
        })
      )
    })
  })
})
