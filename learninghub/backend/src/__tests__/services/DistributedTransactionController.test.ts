import { Request, Response } from 'express'
import { distributedTransactionController } from '../../controllers/distributedTransactionController'

describe('DistributedTransactionController (Milestone 32)', () => {
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

  test('execute2PC should return committed transaction with 200 status', async () => {
    mockRequest = { body: {} }
    await distributedTransactionController.execute2PC(mockRequest as Request, mockResponse as Response)

    expect(responseStatus).toBe(200)
    expect(responseData.status).toBe('success')
    expect(responseData.data.finalVerdict).toBe('COMMITTED')
  })

  test('executeSaga should return rolled back saga with compensating history when step fails', async () => {
    mockRequest = { body: { failAtStepIndex: 2 } }
    await distributedTransactionController.executeSaga(mockRequest as Request, mockResponse as Response)

    expect(responseStatus).toBe(200)
    expect(responseData.status).toBe('success')
    expect(responseData.data.overallStatus).toBe('ROLLED_BACK')
    expect(responseData.data.compensationHistory.length).toBe(1)
  })

  test('getComparison should return protocol comparisons', async () => {
    mockRequest = {}
    await distributedTransactionController.getComparison(mockRequest as Request, mockResponse as Response)

    expect(responseStatus).toBe(200)
    expect(responseData.data.protocols.length).toBe(2)
  })
})
