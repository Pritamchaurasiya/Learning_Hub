import { Request, Response } from 'express'
import { LsmTreeSimulationController } from '../../controllers/LsmTreeSimulationController'

describe('LsmTreeSimulationController (Milestone 37)', () => {
  let mockReq: Partial<Request>
  let mockRes: Partial<Response>
  let jsonMock: jest.Mock
  let statusMock: jest.Mock

  beforeEach(() => {
    jsonMock = jest.fn()
    statusMock = jest.fn().mockReturnThis()
    mockRes = {
      json: jsonMock,
      status: statusMock,
    }
  })

  test('getSnapshot returns complete storage engine snapshot', () => {
    mockReq = {}
    LsmTreeSimulationController.getSnapshot(mockReq as Request, mockRes as Response)

    expect(jsonMock).toHaveBeenCalledWith(
      expect.objectContaining({
        success: true,
        data: expect.objectContaining({
          stats: expect.any(Object),
          memTable: expect.any(Array),
          wal: expect.any(Array),
          sstables: expect.any(Array),
        }),
      })
    )
  })

  test('put writes key-value and handles validation', () => {
    mockReq = {
      body: { key: 'test:doc', value: 'hello world' },
    }
    LsmTreeSimulationController.put(mockReq as Request, mockRes as Response)
    expect(jsonMock).toHaveBeenCalledWith(
      expect.objectContaining({
        success: true,
        data: expect.objectContaining({
          success: true,
        }),
      })
    )

    // Missing key
    mockReq = { body: {} }
    LsmTreeSimulationController.put(mockReq as Request, mockRes as Response)
    expect(statusMock).toHaveBeenCalledWith(400)
  })

  test('get performs lookup trace', () => {
    mockReq = {
      query: { key: 'test:doc' },
    }
    LsmTreeSimulationController.get(mockReq as Request, mockRes as Response)
    expect(jsonMock).toHaveBeenCalledWith(
      expect.objectContaining({
        success: true,
        data: expect.objectContaining({
          key: 'test:doc',
          found: true,
        }),
      })
    )
  })

  test('flush executes MemTable to SSTable flush', () => {
    mockReq = {}
    LsmTreeSimulationController.flush(mockReq as Request, mockRes as Response)
    expect(jsonMock).toHaveBeenCalledWith(
      expect.objectContaining({
        success: true,
      })
    )
  })

  test('crashRecover replays WAL', () => {
    mockReq = {}
    LsmTreeSimulationController.crashRecover(mockReq as Request, mockRes as Response)
    expect(jsonMock).toHaveBeenCalledWith(
      expect.objectContaining({
        success: true,
        data: expect.objectContaining({
          walIntegrityVerified: true,
        }),
      })
    )
  })
})
