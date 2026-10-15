import { describe, it, expect, vi, beforeEach } from 'vitest'
import { eventStreamingService } from './eventStreamingService'

describe('eventStreamingService (Milestone 33)', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
  })

  it('getTopology returns mock topology snapshot on network fallback', async () => {
    const topology = await eventStreamingService.getTopology()

    expect(topology).toBeDefined()
    expect(topology.topics.length).toBeGreaterThanOrEqual(1)
    expect(topology.topics[0].name).toBe('course-enrollments')
    expect(topology.consumerGroups.length).toBeGreaterThanOrEqual(1)
    expect(topology.telemetry).toBeDefined()
    expect(topology.auditDigest).toBeDefined()
  })

  it('produceEvent produces message with key and returns partition routing', async () => {
    const result = await eventStreamingService.produceEvent({
      topic: 'course-enrollments',
      key: 'user-77',
      value: { course: 'system-design', tier: 'PRO' },
    })

    expect(result).toBeDefined()
    expect(result.partition).toBeGreaterThanOrEqual(0)
    expect(result.offset).toBeGreaterThanOrEqual(0)
    expect(result.message.value.course).toBe('system-design')
  })

  it('consumeNext increments consumed offset and returns updated group', async () => {
    const result = await eventStreamingService.consumeNext({
      groupId: 'enrollment-worker-group',
      maxMessages: 1,
    })

    expect(result).toBeDefined()
    expect(result.processedCount).toBe(1)
    expect(result.group.groupId).toBe('enrollment-worker-group')
  })

  it('rebalanceConsumerGroup triggers rebalance and updates generation', async () => {
    const result = await eventStreamingService.rebalanceConsumerGroup({
      groupId: 'enrollment-worker-group',
      action: 'ADD_CONSUMER',
      protocol: 'COOPERATIVE_STICKY',
    })

    expect(result.group).toBeDefined()
    expect(result.rebalanceHistory.length).toBeGreaterThanOrEqual(1)
  })

  it('processOutbox records and relays event to Kafka', async () => {
    const result = await eventStreamingService.processOutbox({
      aggregateId: 'enroll-123',
      aggregateType: 'CourseEnrollment',
      eventType: 'EnrollmentPaymentCaptured',
      payload: { amount: 99 },
    })

    expect(result.outboxEvent.status).toBe('PUBLISHED')
    expect(result.publishedToKafka).toBe(true)
  })

  it('injectPoisonPill and replayDlqMessage simulate poison pill DLQ escalation and redrive', async () => {
    const poisonResult = await eventStreamingService.injectPoisonPill({
      topic: 'course-enrollments',
      failureReason: 'SchemaValidationException: null pointer encountered',
    })

    expect(poisonResult.routedToDlq).toBe(true)
    expect(poisonResult.retryAttempts).toBe(3)
    expect(poisonResult.dlqEntry.status).toBe('IN_DLQ')

    const replayResult = await eventStreamingService.replayDlqMessage({
      dlqId: poisonResult.dlqEntry.id,
    })

    expect(replayResult.success).toBe(true)
    expect(replayResult.replayedMessageId).toBeDefined()
  })

  it('reconstructAggregateAtVersion reconstructs aggregate state at version', async () => {
    const state = await eventStreamingService.reconstructAggregateAtVersion('enrollment-agg-777', 2)

    expect(state.targetVersion).toBe(2)
    expect(state.reconstructedState.status).toBe('PAYMENT_CONFIRMED')
  })
})
