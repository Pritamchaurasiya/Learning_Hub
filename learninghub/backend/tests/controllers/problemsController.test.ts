import { Request, Response } from 'express'
import { mockDeep, DeepMockProxy } from 'jest-mock-extended'
import {
  listProblems,
  getProblemDetails,
  submitProblemSolution,
} from '../../src/controllers/problemsController'
import { prisma } from '../../src/prismaClient'
import { CodeSandboxService } from '../../src/services/CodeSandboxService'

jest.mock('../../src/services/CodeSandboxService', () => ({
  CodeSandboxService: {
    execute: jest.fn(),
  },
}))

jest.mock('../../src/services/CacheService', () => ({
  cacheService: {
    generateKey: jest.fn((prefix, str) => `${prefix}:${str}`),
    get: jest.fn().mockResolvedValue(null),
    set: jest.fn().mockResolvedValue(true),
    delete: jest.fn().mockResolvedValue(true),
    invalidatePattern: jest.fn().mockResolvedValue(true),
  },
}))

jest.mock('../../src/utils/logger', () => {
  const mockLogger = {
    error: jest.fn(),
    warn: jest.fn(),
    info: jest.fn(),
    debug: jest.fn(),
    audit: jest.fn(),
  }
  return {
    ...mockLogger,
    default: mockLogger,
  }
})

describe('ProblemsController', () => {
  let mockReq: DeepMockProxy<Request>
  let mockRes: DeepMockProxy<Response>
  let jsonMock: jest.Mock
  let statusMock: jest.Mock

  beforeEach(() => {
    jsonMock = jest.fn().mockReturnThis()
    statusMock = jest.fn().mockReturnValue({ json: jsonMock })
    mockReq = mockDeep<Request>()
    mockRes = mockDeep<Response>()
    mockRes.status = statusMock as any
    mockRes.json = jsonMock as any

    jest.clearAllMocks()
  })

  describe('listProblems', () => {
    it('should return paginated list of problems', async () => {
      const mockProblems = [
        {
          id: 'prob-1',
          title: 'Two Sum',
          slug: 'two-sum',
          difficulty: 'easy',
          category: 'Arrays',
          tags: 'arrays,hashmap',
          points: 100,
          description: 'Solve two sum',
          starterCode: null,
          testCases: null,
          createdAt: new Date(),
          _count: { submissions: 10 },
        },
      ]

      ;(prisma.problem.count as jest.Mock).mockResolvedValue(1)
      ;(prisma.problem.findMany as jest.Mock).mockResolvedValue(mockProblems)

      mockReq.query = { page: '1', limit: '10' }

      await listProblems(mockReq, mockRes)

      expect(statusMock).toHaveBeenCalledWith(200)
      expect(jsonMock).toHaveBeenCalledWith(
        expect.objectContaining({
          status: 'success',
          data: expect.any(Array),
          meta: expect.objectContaining({
            total: 1,
            page: 1,
            pages: 1,
          }),
        })
      )
    })
  })

  describe('getProblemDetails', () => {
    it('should locate a problem by id successfully', async () => {
      const mockProblem = {
        id: 'prob-123-uuid',
        title: 'Reverse String',
        slug: 'reverse-string',
        difficulty: 'easy',
        category: 'Strings',
        tags: 'strings',
        points: 50,
        description: 'Reverse it',
        starterCode: null,
        testCases: null,
        createdAt: new Date(),
      }

      ;(mockReq as any).params = { slug: 'prob-123-uuid' }
      ;(prisma.problem.findFirst as jest.Mock).mockResolvedValue(mockProblem)

      await getProblemDetails(mockReq, mockRes)

      expect(prisma.problem.findFirst).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {
            OR: [{ id: 'prob-123-uuid' }, { slug: 'prob-123-uuid' }],
          },
        })
      )
      expect(statusMock).not.toHaveBeenCalledWith(404)
      expect(jsonMock).toHaveBeenCalledWith(
        expect.objectContaining({
          status: 'success',
          data: expect.objectContaining({ id: 'prob-123-uuid' }),
        })
      )
    })

    it('should locate a problem by slug successfully', async () => {
      const mockProblem = {
        id: 'prob-123-uuid',
        title: 'Reverse String',
        slug: 'reverse-string',
        difficulty: 'easy',
        category: 'Strings',
        tags: 'strings',
        points: 50,
        description: 'Reverse it',
        starterCode: null,
        testCases: null,
        createdAt: new Date(),
      }

      ;(mockReq as any).params = { slug: 'reverse-string' }
      ;(prisma.problem.findFirst as jest.Mock).mockResolvedValue(mockProblem)

      await getProblemDetails(mockReq, mockRes)

      expect(prisma.problem.findFirst).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {
            OR: [{ id: 'reverse-string' }, { slug: 'reverse-string' }],
          },
        })
      )
      expect(statusMock).not.toHaveBeenCalledWith(404)
      expect(jsonMock).toHaveBeenCalledWith(
        expect.objectContaining({
          status: 'success',
          data: expect.objectContaining({ slug: 'reverse-string' }),
        })
      )
    })

    it('should return 404 when problem not found', async () => {
      ;(mockReq as any).params = { slug: 'non-existent' }
      ;(prisma.problem.findFirst as jest.Mock).mockResolvedValue(null)

      await getProblemDetails(mockReq, mockRes)

      expect(statusMock).toHaveBeenCalledWith(404)
      expect(jsonMock).toHaveBeenCalledWith({
        status: 'error',
        message: 'Problem not found',
        code: 'NOT_FOUND',
      })
    })
  })

  describe('submitProblemSolution', () => {
    it('should return 401 when user not authenticated', async () => {
      mockReq.user = undefined
      await submitProblemSolution(mockReq, mockRes)
      expect(statusMock).toHaveBeenCalledWith(401)
    })

    it('should return 400 when code is empty', async () => {
      mockReq.user = { userId: 'user-1' } as any
      ;(mockReq as any).params = { id: 'prob-1' }
      mockReq.body = { code: '', language: 'javascript' }

      await submitProblemSolution(mockReq, mockRes)

      expect(statusMock).toHaveBeenCalledWith(400)
      expect(jsonMock).toHaveBeenCalledWith(
        expect.objectContaining({
          message: 'Code submission is required',
        })
      )
    })

    it('should return 404 when problem does not exist', async () => {
      mockReq.user = { userId: 'user-1' } as any
      ;(mockReq as any).params = { id: 'prob-nonexistent' }
      mockReq.body = { code: 'console.log("hello")', language: 'javascript' }
      ;(prisma.problem.findUnique as jest.Mock).mockResolvedValue(null)

      await submitProblemSolution(mockReq, mockRes)

      expect(statusMock).toHaveBeenCalledWith(404)
      expect(jsonMock).toHaveBeenCalledWith(
        expect.objectContaining({
          message: 'Problem not found',
        })
      )
    })

    it('should submit successfully, award 50 XP if accepted', async () => {
      mockReq.user = { userId: 'user-1' } as any
      ;(mockReq as any).params = { id: 'prob-1' }
      mockReq.body = { code: 'function f() {}', language: 'javascript' }

      const mockProblem = {
        id: 'prob-1',
        title: 'Two Sum',
        testCases: '[{"input": "1", "output": "2"}]',
      }
      ;(prisma.problem.findUnique as jest.Mock).mockResolvedValue(mockProblem)
      ;(prisma.problemSubmission.count as jest.Mock).mockResolvedValue(0)

      const mockExecResult = {
        status: 'accepted',
        executionTime: 50,
        memoryUsed: 1024,
        message: 'All passed',
        testCasesPassed: 1,
        testCasesTotal: 1,
      }
      ;(CodeSandboxService.execute as jest.Mock).mockResolvedValue(mockExecResult)

      const mockSubmission = {
        id: 'sub-123',
        userId: 'user-1',
        problemId: 'prob-1',
        status: 'accepted',
        executionTime: 50,
        memoryUsed: 1024,
      }
      ;(prisma.problemSubmission.create as jest.Mock).mockResolvedValue(mockSubmission)

      await submitProblemSolution(mockReq, mockRes)

      expect(prisma.problemSubmission.create).toHaveBeenCalled()
      expect(prisma.user.update).toHaveBeenCalledWith({
        where: { id: 'user-1' },
        data: { xp: { increment: 50 } },
      })
      expect(statusMock).toHaveBeenCalledWith(200)
      expect(jsonMock).toHaveBeenCalledWith(
        expect.objectContaining({
          status: 'success',
          data: expect.objectContaining({
            submissionId: 'sub-123',
            status: 'accepted',
          }),
        })
      )
    })
  })
})
