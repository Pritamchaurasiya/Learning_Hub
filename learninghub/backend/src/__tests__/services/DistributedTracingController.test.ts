import { Request, Response } from 'express'
import { distributedTracingController } from '../../controllers/DistributedTracingController'

describe('DistributedTracingController (Milestone 37)', () => {
  let req: Partial<Request>
  let res: Partial<Response>
  let jsonMock: jest.Mock
  let statusMock: jest.Mock

  beforeEach(() => {
    jsonMock = jest.fn()
    statusMock = jest.fn().mockReturnValue({ json: jsonMock })
    req = {}
    res = {
      status: statusMock,
      json: jsonMock,
    }
  })

  it('getTraces returns 200 with list of traces', async () => {
    await distributedTracingController.getTraces(req as Request, res as Response)
    expect(statusMock).toHaveBeenCalledWith(200)
    expect(jsonMock).toHaveBeenCalledWith(
      expect.objectContaining({
        status: 'success',
        data: expect.any(Array),
      })
    )
  })

  it('simulateRequest creates a trace and returns 200 with trace aggregate', async () => {
    req.body = {
      scenarioName: 'TestControllerFlow',
      userId: 'usr-controller-1',
      courseId: 'ds-301',
    }

    await distributedTracingController.simulateRequest(req as Request, res as Response)
    expect(statusMock).toHaveBeenCalledWith(200)
    expect(jsonMock).toHaveBeenCalledWith(
      expect.objectContaining({
        status: 'success',
        data: expect.objectContaining({
          traceId: expect.any(String),
          spans: expect.any(Array),
          criticalPathSpanIds: expect.any(Array),
        }),
      })
    )
  })

  it('setChaosRule and clearChaosRules manage fault injection lifecycle with 200', async () => {
    req.body = {
      targetService: 'postgres-db',
      additionalLatencyMs: 150,
      injectError: false,
    }

    await distributedTracingController.setChaosRule(req as Request, res as Response)
    expect(statusMock).toHaveBeenCalledWith(200)

    // Clear
    await distributedTracingController.clearChaosRules(req as Request, res as Response)
    expect(statusMock).toHaveBeenCalledWith(200)
  })

  it('getLatencyDistributions returns 200 with service latency percentiles', async () => {
    await distributedTracingController.getLatencyDistributions(req as Request, res as Response)
    expect(statusMock).toHaveBeenCalledWith(200)
    expect(jsonMock).toHaveBeenCalledWith(
      expect.objectContaining({
        status: 'success',
        data: expect.any(Array),
      })
    )
  })
})
