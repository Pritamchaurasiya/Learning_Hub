import {
  EventStreamingSimulationService,
  eventStreamingSimulationService,
} from '../../services/EventStreamingSimulationService'

describe('EventStreamingSimulationService (Milestone 33)', () => {
  let service: EventStreamingSimulationService

  beforeEach(() => {
    service = new EventStreamingSimulationService()
  })

  describe('Kafka Topic & Partition Hashing', () => {
    it('deterministically hashes identical keys to the same partition index', () => {
      const part1 = EventStreamingSimulationService.hashKeyToPartition('user-101', 3)
      const part2 = EventStreamingSimulationService.hashKeyToPartition('user-101', 3)
      expect(part1).toBe(part2)
      expect(part1).toBeGreaterThanOrEqual(0)
      expect(part1).toBeLessThan(3)
    })

    it('falls back to partition 0 when key is null or empty', () => {
      expect(EventStreamingSimulationService.hashKeyToPartition(null, 3)).toBe(0)
      expect(EventStreamingSimulationService.hashKeyToPartition('', 3)).toBe(0)
      expect(EventStreamingSimulationService.hashKeyToPartition('any-key', 1)).toBe(0)
    })

    it('produces events and updates partition log end offset and high watermark', () => {
      const initialTopology = service.getTopology()
      const initialProduced = initialTopology.telemetry.totalProduced

      const result = service.produceEvent('course-enrollments', 'student-xyz', {
        courseId: 'algo-101',
        fee: 50,
      })

      expect(result.partition).toBeDefined()
      expect(result.offset).toBeGreaterThanOrEqual(0)
      expect(result.message.value.courseId).toBe('algo-101')
      expect(result.message.status).toBe('UNCOMMITTED')

      const updated = service.getTopology()
      expect(updated.telemetry.totalProduced).toBe(initialProduced + 1)
    })
  })

  describe('Consumer Groups & Rebalancing', () => {
    it('consumes uncommitted messages and increments committed offsets', () => {
      const { processedCount, updatedLag, group } = service.consumeNext('enrollment-worker-group', 2)
      expect(processedCount).toBeGreaterThanOrEqual(1)
      expect(group.groupId).toBe('enrollment-worker-group')
      expect(updatedLag).toBeDefined()
    })

    it('rebalances group on ADD_CONSUMER with Cooperative Sticky protocol', () => {
      const initialMemberCount = service.getTopology().consumerGroups[0].members.length
      const { group, rebalanceHistory } = service.rebalanceConsumerGroup(
        'enrollment-worker-group',
        'ADD_CONSUMER',
        'COOPERATIVE_STICKY'
      )

      expect(group.members.length).toBe(initialMemberCount + 1)
      expect(group.generationId).toBeGreaterThan(14)
      expect(group.rebalanceProtocol).toBe('COOPERATIVE_STICKY')
      expect(rebalanceHistory.length).toBeGreaterThan(0)
    })

    it('handles consumer crash and marks member as CRASHED', () => {
      const { group, rebalanceHistory } = service.rebalanceConsumerGroup(
        'enrollment-worker-group',
        'CRASH_CONSUMER',
        'EAGER'
      )

      const crashedMember = group.members.find((m) => m.status === 'CRASHED')
      expect(crashedMember).toBeDefined()
      expect(rebalanceHistory.some((h) => h.includes('CRASHED'))).toBe(true)
    })
  })

  describe('Transactional Outbox Pattern', () => {
    it('atomically records outbox event and relays to Kafka topic', () => {
      const result = service.executeTransactionalOutbox(
        'enrollment-uuid-999',
        'CourseEnrollment',
        'EnrollmentPaymentConfirmed',
        { amount: 120, studentId: 'student-999' }
      )

      expect(result.outboxEvent.status).toBe('PUBLISHED')
      expect(result.outboxEvent.publishedAt).not.toBeNull()
      expect(result.publishedToKafka).toBe(true)
      expect(result.partition).toBeDefined()

      const topology = service.getTopology()
      const savedOutbox = topology.outboxQueue.find((o) => o.id === result.outboxEvent.id)
      expect(savedOutbox).toBeDefined()
      expect(savedOutbox?.status).toBe('PUBLISHED')
    })
  })

  describe('Dead Letter Queue (DLQ) & Poison Pill Handling', () => {
    it('intercepts poison pill message and routes to DLQ after 3 simulated retries', () => {
      const result = service.injectPoisonPill(
        'course-enrollments',
        'InvalidSchemaException: circular reference in payload'
      )

      expect(result.routedToDlq).toBe(true)
      expect(result.retryAttempts).toBe(3)
      expect(result.dlqEntry.status).toBe('IN_DLQ')

      const topology = service.getTopology()
      const inDlq = topology.dlqQueue.find((d) => d.id === result.dlqEntry.id)
      expect(inDlq).toBeDefined()
    })

    it('replays message from DLQ back to primary topic and updates status to RETRIED', () => {
      const topology = service.getTopology()
      const existingDlq = topology.dlqQueue[0]
      expect(existingDlq).toBeDefined()

      const replayResult = service.replayDlqMessage(existingDlq.id, 'course-enrollments')
      expect(replayResult.success).toBe(true)
      expect(replayResult.replayedMessageId).toBeDefined()

      const updated = service.getTopology()
      const targetDlq = updated.dlqQueue.find((d) => d.id === existingDlq.id)
      expect(targetDlq?.status).toBe('RETRIED')
    })
  })

  describe('Event Sourcing & State Reconstruction', () => {
    it('reconstructs aggregate state at intermediate version using snapshot and delta fold', () => {
      const intermediate = service.reconstructAggregateAtVersion('enrollment-agg-777', 2)
      expect(intermediate.targetVersion).toBe(2)
      expect(intermediate.usedSnapshotVersion).toBe(2)
      expect(intermediate.reconstructedState.status).toBe('PAYMENT_CONFIRMED')
      expect(intermediate.reconstructedState.seatNumber).toBeUndefined()

      const finalState = service.reconstructAggregateAtVersion('enrollment-agg-777', 4)
      expect(finalState.targetVersion).toBe(4)
      expect(finalState.reconstructedState.status).toBe('COMPLETED_ENROLLED')
      expect(finalState.reconstructedState.seatNumber).toBe(15)
      expect(finalState.reconstructedState.hasAccess).toBe(true)
    })
  })

  describe('Cryptographic Audit Digest', () => {
    it('generates a valid 64-character SHA-256 hex digest of the streaming topology', () => {
      const digest = service.computeAuditDigest()
      expect(digest).toMatch(/^[a-f0-9]{64}$/)
    })
  })
})
