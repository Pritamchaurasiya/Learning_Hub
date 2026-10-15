import { Request, Response } from 'express'
import { raftSimulationController } from '../../controllers/raftSimulationController'

describe('RaftSimulationController (Milestone 31)', () => {
  let mockRequest: Partial<Request>
  let mockResponse: Partial<Response>
  let responseData: any
  let responseStatus: number

  beforeEach(() => {
    responseData = null
    responseStatus = 200

    mockResponse = {
      status: jest.fn().mockImplementation((code: number) => {
        responseStatus = code
        return mockResponse
      }),
      json: jest.fn().mockImplementation((data: any) => {
        responseData = data
        return mockResponse
      }),
    }
  })

  test('getState should return cluster state with 200 status', async () => {
    mockRequest = {}
    await raftSimulationController.getState(mockRequest as Request, mockResponse as Response)

    expect(responseStatus).toBe(200)
    expect(responseData.status).toBe('success')
    expect(responseData.data.nodes.length).toBe(5)
  })

  test('resetCluster should reset nodes count to 3', async () => {
    mockRequest = { body: { nodeCount: 3 } }
    await raftSimulationController.resetCluster(mockRequest as Request, mockResponse as Response)

    expect(responseStatus).toBe(200)
    expect(responseData.data.nodes.length).toBe(3)
  })

  test('submitCommand should submit client write and return committed result', async () => {
    // Reset to 5 nodes first
    mockRequest = { body: { nodeCount: 5 } }
    await raftSimulationController.resetCluster(mockRequest as Request, mockResponse as Response)

    mockRequest = { body: { command: 'SET config = enabled' } }
    await raftSimulationController.submitCommand(mockRequest as Request, mockResponse as Response)

    expect(responseStatus).toBe(200)
    expect(responseData.data.success).toBe(true)
    expect(responseData.data.committed).toBe(true)
  })

  test('auditInvariants should return cryptographic audit digest', async () => {
    mockRequest = {}
    await raftSimulationController.auditInvariants(mockRequest as Request, mockResponse as Response)

    expect(responseStatus).toBe(200)
    expect(responseData.data.allInvariantsSatisfied).toBe(true)
    expect(responseData.data.cryptographicAuditDigestSha256).toBeDefined()
  })
})
