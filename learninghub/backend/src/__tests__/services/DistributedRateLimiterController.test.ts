import { Request, Response } from 'express'
import { distributedRateLimiterController } from '../../controllers/DistributedRateLimiterController'
import { distributedRateLimiterService } from '../../services/DistributedRateLimiterService'

describe('DistributedRateLimiterController (Milestone 37)', () => {
  let mockRequest: Partial<Request>
  let mockResponse: Partial<Response>
  let jsonMock: jest.Mock
  let statusMock: jest.Mock

  beforeEach(() => {
    distributedRateLimiterService.reset()
    jsonMock = jest.fn()
    statusMock = jest.fn().mockReturnValue({ json: jsonMock })
    mockResponse = {
      status: statusMock,
      json: jsonMock,
    }
  })

  it('evaluateRequest should return 200 with rate limit verdict', async () => {
    mockRequest = {
      body: {
        algorithm: 'TOKEN_BUCKET',
        key: 'user:controller_test',
        capacity: 10,
        refillRate: 2,
      },
    }
    await distributedRateLimiterController.evaluateRequest(mockRequest as Request, mockResponse as Response)

    expect(statusMock).toHaveBeenCalledWith(200)
    expect(jsonMock).toHaveBeenCalledWith(
      expect.objectContaining({
        status: 'success',
        data: expect.objectContaining({
          verdict: expect.objectContaining({
            allowed: true,
            algorithm: 'TOKEN_BUCKET',
          }),
        }),
      })
    )
  })

  it('simulateRaceCondition should return 200 with race audit results', async () => {
    mockRequest = {
      body: {
        concurrency: 80,
        capacity: 10,
      },
    }
    await distributedRateLimiterController.simulateRaceCondition(mockRequest as Request, mockResponse as Response)

    expect(statusMock).toHaveBeenCalledWith(200)
    expect(jsonMock).toHaveBeenCalledWith(
      expect.objectContaining({
        status: 'success',
        data: expect.objectContaining({
          result: expect.objectContaining({
            luaAtomicAllowed: 10,
            luaAtomicBreaches: 0,
          }),
        }),
      })
    )
  })

  it('getAdaptiveState and updateAdaptiveConcurrency should manage dynamic concurrency state', async () => {
    mockRequest = {}
    await distributedRateLimiterController.getAdaptiveState(mockRequest as Request, mockResponse as Response)
    expect(statusMock).toHaveBeenCalledWith(200)

    mockRequest = {
      body: { measuredRttMs: 85 },
    }
    await distributedRateLimiterController.updateAdaptiveConcurrency(mockRequest as Request, mockResponse as Response)
    expect(statusMock).toHaveBeenCalledWith(200)
  })

  it('getAuditSnapshot and reset should return cluster audit configurations', async () => {
    mockRequest = {}
    await distributedRateLimiterController.getAuditSnapshot(mockRequest as Request, mockResponse as Response)
    expect(statusMock).toHaveBeenCalledWith(200)

    await distributedRateLimiterController.reset(mockRequest as Request, mockResponse as Response)
    expect(statusMock).toHaveBeenCalledWith(200)
  })
})
