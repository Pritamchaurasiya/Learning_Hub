import { Request, Response } from 'express'
import { mvccDeadlockController } from '../../controllers/mvccDeadlockController'

describe('MvccDeadlockController (Milestone 33)', () => {
  let mockRequest: Partial<Request>
  let mockResponse: Partial<Response>
  let statusMock: jest.Mock
  let jsonMock: jest.Mock

  beforeEach(() => {
    jsonMock = jest.fn()
    statusMock = jest.fn().mockReturnValue({ json: jsonMock })
    mockResponse = {
      status: statusMock,
      json: jsonMock,
    }
  })

  it('getMvccState should return MVCC table with 200 status', async () => {
    mockRequest = {}
    await mvccDeadlockController.getMvccState(mockRequest as Request, mockResponse as Response)
    expect(statusMock).toHaveBeenCalledWith(200)
    expect(jsonMock).toHaveBeenCalledWith(
      expect.objectContaining({
        status: 'success',
        data: expect.objectContaining({
          currentCommitId: 105,
        }),
      })
    )
  })

  it('simulateWriteSkew should return write skew simulation with 200 status', async () => {
    mockRequest = { body: { protocol: 'SERIALIZABLE_SSI' } }
    await mvccDeadlockController.simulateWriteSkew(mockRequest as Request, mockResponse as Response)
    expect(statusMock).toHaveBeenCalledWith(200)
    expect(jsonMock).toHaveBeenCalledWith(
      expect.objectContaining({
        status: 'success',
        data: expect.objectContaining({
          isolationLevel: 'SERIALIZABLE_SSI',
        }),
      })
    )
  })

  it('detectDeadlock should return cycle resolution with 200 status', async () => {
    mockRequest = { body: { scenario: 'TWO_NODE_CYCLE', victimPolicy: 'YOUNGEST' } }
    await mvccDeadlockController.detectDeadlock(mockRequest as Request, mockResponse as Response)
    expect(statusMock).toHaveBeenCalledWith(200)
    expect(jsonMock).toHaveBeenCalledWith(
      expect.objectContaining({
        status: 'success',
        data: expect.objectContaining({
          victimTxId: 302,
        }),
      })
    )
  })

  it('getIsolationComparison should return isolation matrix with 200 status', async () => {
    mockRequest = {}
    await mvccDeadlockController.getIsolationComparison(mockRequest as Request, mockResponse as Response)
    expect(statusMock).toHaveBeenCalledWith(200)
    expect(jsonMock).toHaveBeenCalledWith(
      expect.objectContaining({
        status: 'success',
        data: expect.objectContaining({
          levels: expect.any(Array),
        }),
      })
    )
  })
})
