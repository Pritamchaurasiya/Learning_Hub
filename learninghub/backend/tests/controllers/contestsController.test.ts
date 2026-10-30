import { Request, Response } from 'express'
import { mockDeep, DeepMockProxy } from 'jest-mock-extended'
import {
  listContests,
  getContest,
  getLeaderboard,
  registerContest,
  getContestResults,
  logProctorEvent,
  getTimeSync,
} from '../../src/controllers/contestsController'
import { contestService } from '../../src/services/ContestService'
import { prisma } from '../../src/prismaClient'

jest.mock('../../src/services/ContestService', () => ({
  contestService: {
    getContests: jest.fn(),
    getContestById: jest.fn(),
    getLeaderboard: jest.fn(),
    getLeaderboardPaginated: jest.fn(),
    register: jest.fn(),
    logProctorEvent: jest.fn(),
    getServerTime: jest.fn(),
  },
}))

describe('ContestsController', () => {
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
    mockReq.query = {}
    mockReq.params = {}
    mockReq.body = {}
    mockReq.user = { userId: 'user-contest-1', email: 'contestant@test.com', role: 'STUDENT' }
    jest.clearAllMocks()
  })

  describe('listContests', () => {
    it('returns 200 with list of contests and count metadata', async () => {
      const mockContests = [
        {
          contest_id: 'c-1',
          title: 'Algorithmic Duel #1',
          slug: 'algo-duel-1',
          status: 'active' as const,
          participants: 450,
          problem_count: 4,
          start_time: new Date().toISOString(),
          end_time: new Date(Date.now() + 3600000).toISOString(),
          duration: 120,
          difficulty: 'medium' as const,
          freeze_minutes: 30,
          is_frozen: false,
        },
      ]
      ;(contestService.getContests as jest.Mock).mockResolvedValue(mockContests)

      await listContests(mockReq, mockRes, jest.fn())

      expect(contestService.getContests).toHaveBeenCalledWith('user-contest-1')
      expect(statusMock).toHaveBeenCalledWith(200)
      expect(jsonMock).toHaveBeenCalledWith(
        expect.objectContaining({
          status: 'success',
          data: mockContests,
          meta: { count: 1 },
        })
      )
    })
  })

  describe('getContest', () => {
    it('returns contest details when contest exists', async () => {
      mockReq.params.id = 'c-1'
      const mockContest = {
        contest_id: 'c-1',
        title: 'Algorithmic Duel #1',
        slug: 'algo-duel-1',
        status: 'active',
      }
      ;(contestService.getContestById as jest.Mock).mockResolvedValue(mockContest)

      await getContest(mockReq, mockRes, jest.fn())

      expect(contestService.getContestById).toHaveBeenCalledWith('c-1', 'user-contest-1')
      expect(statusMock).toHaveBeenCalledWith(200)
      expect(jsonMock).toHaveBeenCalledWith(
        expect.objectContaining({
          status: 'success',
          data: mockContest,
        })
      )
    })

    it('returns 404 when contest does not exist', async () => {
      mockReq.params.id = 'non-existent-contest'
      ;(contestService.getContestById as jest.Mock).mockResolvedValue(null)

      await getContest(mockReq, mockRes, jest.fn())

      expect(statusMock).toHaveBeenCalledWith(404)
      expect(jsonMock).toHaveBeenCalledWith(
        expect.objectContaining({
          status: 'error',
          message: 'Contest not found',
        })
      )
    })
  })

  describe('getLeaderboard', () => {
    it('returns paginated leaderboard using getLeaderboardPaginated', async () => {
      mockReq.params.id = 'c-1'
      mockReq.query = { page: '2', limit: '20' }

      const mockLeaderboardData = [
        { rank: 21, userId: 'u-21', user: 'coder21', score: 300, penalty_seconds: 450, problems_solved: 3, finish_time: null, is_disqualified: false },
      ]
      ;(contestService.getLeaderboardPaginated as jest.Mock).mockResolvedValue({
        data: mockLeaderboardData,
        meta: { count: 100, page: 2, limit: 20, hasNext: true },
      })

      await getLeaderboard(mockReq, mockRes, jest.fn())

      expect(contestService.getLeaderboardPaginated).toHaveBeenCalledWith('c-1', 2, 20)
      expect(statusMock).toHaveBeenCalledWith(200)
      expect(jsonMock).toHaveBeenCalledWith(
        expect.objectContaining({
          status: 'success',
          data: mockLeaderboardData,
          meta: { count: 100, page: 2, limit: 20, hasNext: true },
        })
      )
    })

    it('clamps invalid query parameters gracefully', async () => {
      mockReq.params.id = 'c-1'
      mockReq.query = { page: '-5', limit: '9999' }

      ;(contestService.getLeaderboardPaginated as jest.Mock).mockResolvedValue({
        data: [],
        meta: { count: 0, page: 1, limit: 100, hasNext: false },
      })

      await getLeaderboard(mockReq, mockRes, jest.fn())

      expect(contestService.getLeaderboardPaginated).toHaveBeenCalledWith('c-1', 1, 100)
    })
  })

  describe('registerContest', () => {
    it('returns 400 when user is not authenticated', async () => {
      mockReq.params.id = 'c-1'
      mockReq.user = undefined

      await registerContest(mockReq, mockRes, jest.fn())

      expect(statusMock).toHaveBeenCalledWith(400)
      expect(jsonMock).toHaveBeenCalledWith(
        expect.objectContaining({
          status: 'error',
          message: 'Authentication required to register for contests',
        })
      )
    })

    it('registers user and returns 200 with confirmation', async () => {
      mockReq.params.id = 'c-1'
      ;(contestService.register as jest.Mock).mockResolvedValue({
        contest_id: 'c-1',
        is_registered: true,
      })

      await registerContest(mockReq, mockRes, jest.fn())

      expect(contestService.register).toHaveBeenCalledWith('c-1', 'user-contest-1')
      expect(statusMock).toHaveBeenCalledWith(200)
      expect(jsonMock).toHaveBeenCalledWith(
        expect.objectContaining({
          status: 'success',
          message: 'Registered for contest successfully',
        })
      )
    })
  })

  describe('getContestResults', () => {
    it('returns user participant result when found in DB', async () => {
      mockReq.params.id = 'c-1'
      ;(prisma.contestParticipant.findUnique as jest.Mock).mockResolvedValue({
        rank: 3,
        score: 400.0,
        penaltySeconds: 1200,
        solvedCount: 4,
        completedAt: new Date('2026-10-30T10:00:00Z'),
        contest: { title: 'Grand Algorithm Arena' },
      })

      await getContestResults(mockReq, mockRes, jest.fn())

      expect(statusMock).toHaveBeenCalledWith(200)
      expect(jsonMock).toHaveBeenCalledWith(
        expect.objectContaining({
          status: 'success',
          data: [
            {
              contestId: 'c-1',
              contestTitle: 'Grand Algorithm Arena',
              rank: 3,
              score: 400,
              penaltySeconds: 1200,
              solved: 4,
              completedAt: expect.any(Date),
            },
          ],
        })
      )
    })

    it('returns empty array when participant record is not found', async () => {
      mockReq.params.id = 'c-1'
      ;(prisma.contestParticipant.findUnique as jest.Mock).mockResolvedValue(null)

      await getContestResults(mockReq, mockRes, jest.fn())

      expect(statusMock).toHaveBeenCalledWith(200)
      expect(jsonMock).toHaveBeenCalledWith(
        expect.objectContaining({
          status: 'success',
          data: [],
        })
      )
    })
  })

  describe('logProctorEvent', () => {
    it('returns 400 when event_type is missing', async () => {
      mockReq.params.id = 'c-1'
      mockReq.body = { metadata: { tab: 'inactive' } }

      await logProctorEvent(mockReq, mockRes, jest.fn())

      expect(statusMock).toHaveBeenCalledWith(400)
      expect(jsonMock).toHaveBeenCalledWith(
        expect.objectContaining({
          status: 'error',
          message: 'event_type is required',
        })
      )
    })

    it('records proctor event and returns 200', async () => {
      mockReq.params.id = 'c-1'
      mockReq.body = { event_type: 'TAB_BLUR', metadata: { blurDurationSec: 5 } }
      ;(contestService.logProctorEvent as jest.Mock).mockResolvedValue({
        id: 'proc-1',
        eventType: 'TAB_BLUR',
      })

      await logProctorEvent(mockReq, mockRes, jest.fn())

      expect(contestService.logProctorEvent).toHaveBeenCalledWith(
        'c-1',
        'user-contest-1',
        'TAB_BLUR',
        { blurDurationSec: 5 }
      )
      expect(statusMock).toHaveBeenCalledWith(200)
      expect(jsonMock).toHaveBeenCalledWith(
        expect.objectContaining({
          status: 'success',
          message: 'Proctor event recorded',
        })
      )
    })
  })

  describe('getTimeSync', () => {
    it('returns synchronized server time', async () => {
      const mockTime = {
        server_time: 1761800000000,
        iso: '2026-10-30T10:00:00.000Z',
      }
      ;(contestService.getServerTime as jest.Mock).mockReturnValue(mockTime)

      await getTimeSync(mockReq, mockRes, jest.fn())

      expect(contestService.getServerTime).toHaveBeenCalled()
      expect(statusMock).toHaveBeenCalledWith(200)
      expect(jsonMock).toHaveBeenCalledWith(
        expect.objectContaining({
          status: 'success',
          data: mockTime,
        })
      )
    })
  })
})
