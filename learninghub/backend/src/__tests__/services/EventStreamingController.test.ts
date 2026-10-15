import { Request, Response } from 'express'
import { eventStreamingController } from '../../controllers/EventStreamingController'

describe('EventStreamingController (Milestone 33)', () => {
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

  it('getTopology should return 200 with topology snapshot', async () => {
    mockRequest = {}
    await eventStreamingController.getTopology(mockRequest as Request, mockResponse as Response)

    expect(responseStatus).toBe(200)
    expect(responseData.status).toBe('success')
    expect(Array.isArray(responseData.data.topics)).toBe(true)
    expect(Array.isArray(responseData.data.consumerGroups)).toBe(true)
    expect(responseData.data.telemetry).toBeDefined()
  })

  it('produceEvent should validate payload and return 200 with message info', async () => {
    mockRequest = {
      body: {
        topic: 'course-enrollments',
        key: 'student-42',
        value: { course: 'system-design' },
      },
    }
    await eventStreamingController.produceEvent(mockRequest as Request, mockResponse as Response)

    expect(responseStatus).toBe(200)
    expect(responseData.status).toBe('success')
    expect(responseData.data.partition).toBeDefined()
    expect(responseData.data.offset).toBeDefined()
    expect(responseData.data.message).toBeDefined()
  })

  it('rebalanceConsumerGroup should trigger rebalance and return updated group', async () => {
    mockRequest = {
      body: {
        groupId: 'enrollment-worker-group',
        action: 'ADD_CONSUMER',
        protocol: 'COOPERATIVE_STICKY',
      },
    }
    await eventStreamingController.rebalanceConsumerGroup(mockRequest as Request, mockResponse as Response)

    expect(responseStatus).toBe(200)
    expect(responseData.status).toBe('success')
    expect(responseData.data.group).toBeDefined()
    expect(Array.isArray(responseData.data.rebalanceHistory)).toBe(true)
  })

  it('processOutbox should return 200 with outboxEvent and publishedToKafka status', async () => {
    mockRequest = {
      body: {
        aggregateId: 'enroll-order-888',
        aggregateType: 'CourseEnrollment',
        eventType: 'OrderCreated',
        payload: { price: 99 },
      },
    }
    await eventStreamingController.processOutbox(mockRequest as Request, mockResponse as Response)

    expect(responseStatus).toBe(200)
    expect(responseData.status).toBe('success')
    expect(responseData.data.outboxEvent.status).toBe('PUBLISHED')
    expect(responseData.data.publishedToKafka).toBe(true)
  })

  it('injectPoisonPill and replayDlqMessage should handle dead-letter lifecycle', async () => {
    mockRequest = {
      body: {
        topic: 'course-enrollments',
      },
    }
    await eventStreamingController.injectPoisonPill(mockRequest as Request, mockResponse as Response)

    expect(responseStatus).toBe(200)
    expect(responseData.status).toBe('success')
    expect(responseData.data.routedToDlq).toBe(true)
    const dlqId = responseData.data.dlqEntry.id

    // Replay
    mockRequest = {
      body: {
        dlqId,
      },
    }
    responseData = null
    responseStatus = 200

    await eventStreamingController.replayDlqMessage(mockRequest as Request, mockResponse as Response)
    expect(responseStatus).toBe(200)
    expect(responseData.status).toBe('success')
    expect(responseData.data.success).toBe(true)
    expect(responseData.data.replayedMessageId).toBeDefined()
  })
})
