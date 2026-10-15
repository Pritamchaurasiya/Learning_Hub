import { fetchApi } from '../utils/api'
import type {
  StreamingTopologySnapshot,
  KafkaMessage,
  ConsumerGroup,
  OutboxEvent,
  DeadLetterMessage,
} from '../types/eventStreaming'

export const eventStreamingService = {
  /**
   * Retrieves full event streaming topology and telemetry snapshot.
   */
  async getTopology(): Promise<StreamingTopologySnapshot> {
    try {
      const res = await fetchApi<{ status: string; data: StreamingTopologySnapshot }>(
        '/streaming/topology'
      )
      return res.data ?? (res as unknown as StreamingTopologySnapshot)
    } catch {
      return this.getMockTopology()
    }
  },

  /**
   * Produces an event with partition key and headers.
   */
  async produceEvent(params: {
    topic: string
    key?: string | null
    value: Record<string, any>
    headers?: Record<string, string>
  }): Promise<{ partition: number; offset: number; message: KafkaMessage }> {
    try {
      const res = await fetchApi<{
        status: string
        data: { partition: number; offset: number; message: KafkaMessage }
      }>('/streaming/produce', {
        method: 'POST',
        body: JSON.stringify(params),
      })
      return (
        res.data ??
        (res as unknown as { partition: number; offset: number; message: KafkaMessage })
      )
    } catch {
      const pIdx = params.key ? (params.key.length % 3) : 0
      return {
        partition: pIdx,
        offset: Math.floor(Math.random() * 50) + 10,
        message: {
          id: `msg-${pIdx}-${Date.now().toString(36)}`,
          offset: 12,
          key: params.key ?? null,
          value: params.value,
          timestamp: new Date().toISOString(),
          headers: params.headers ?? { source: 'browser-client' },
          partitionIndex: pIdx,
          status: 'UNCOMMITTED',
        },
      }
    }
  },

  /**
   * Consumes next uncommitted message(s) for a given consumer group.
   */
  async consumeNext(params?: {
    groupId?: string
    maxMessages?: number
  }): Promise<{ processedCount: number; updatedLag: number; group: ConsumerGroup }> {
    try {
      const res = await fetchApi<{
        status: string
        data: { processedCount: number; updatedLag: number; group: ConsumerGroup }
      }>('/streaming/consume', {
        method: 'POST',
        body: JSON.stringify(params || {}),
      })
      return (
        res.data ??
        (res as unknown as { processedCount: number; updatedLag: number; group: ConsumerGroup })
      )
    } catch {
      const mockTopo = this.getMockTopology()
      return {
        processedCount: 1,
        updatedLag: Math.max(0, mockTopo.consumerGroups[0].totalLag - 1),
        group: mockTopo.consumerGroups[0],
      }
    }
  },

  /**
   * Rebalances a consumer group with specified action and protocol.
   */
  async rebalanceConsumerGroup(params: {
    groupId?: string
    action: 'ADD_CONSUMER' | 'REMOVE_CONSUMER' | 'CRASH_CONSUMER' | 'HEAL_CONSUMER'
    protocol?: 'EAGER' | 'COOPERATIVE_STICKY'
  }): Promise<{ group: ConsumerGroup; rebalanceHistory: string[] }> {
    try {
      const res = await fetchApi<{
        status: string
        data: { group: ConsumerGroup; rebalanceHistory: string[] }
      }>('/streaming/consumer-groups/rebalance', {
        method: 'POST',
        body: JSON.stringify(params),
      })
      return (
        res.data ??
        (res as unknown as { group: ConsumerGroup; rebalanceHistory: string[] })
      )
    } catch {
      const mockTopo = this.getMockTopology()
      const group = mockTopo.consumerGroups[0]
      group.generationId += 1
      return {
        group,
        rebalanceHistory: [
          `Rebalance initiated: Action=${params.action}, Protocol=${params.protocol || 'COOPERATIVE_STICKY'}`,
          `Updated generationId=${group.generationId}`,
        ],
      }
    }
  },

  /**
   * Executes transactional outbox batch and relays to Kafka.
   */
  async processOutbox(params?: {
    aggregateId?: string
    aggregateType?: string
    eventType?: string
    payload?: Record<string, any>
  }): Promise<{ outboxEvent: OutboxEvent; publishedToKafka: boolean; partition: number; offset: number }> {
    try {
      const res = await fetchApi<{
        status: string
        data: { outboxEvent: OutboxEvent; publishedToKafka: boolean; partition: number; offset: number }
      }>('/streaming/outbox/process', {
        method: 'POST',
        body: JSON.stringify(params || {}),
      })
      return (
        res.data ??
        (res as unknown as { outboxEvent: OutboxEvent; publishedToKafka: boolean; partition: number; offset: number })
      )
    } catch {
      return {
        outboxEvent: {
          id: `outbox-${Date.now().toString(36)}`,
          aggregateType: params?.aggregateType || 'CourseEnrollment',
          aggregateId: params?.aggregateId || 'enroll-999',
          eventType: params?.eventType || 'EnrollmentCreated',
          payload: params?.payload || { course: 'system-design', tier: 'PRO' },
          status: 'PUBLISHED',
          createdAt: new Date().toISOString(),
          publishedAt: new Date().toISOString(),
        },
        publishedToKafka: true,
        partition: 0,
        offset: 4,
      }
    }
  },

  /**
   * Injects a poison pill to simulate consumer failure and Dead Letter Queue routing.
   */
  async injectPoisonPill(params?: {
    topic?: string
    failureReason?: string
  }): Promise<{ originalMessageId: string; retryAttempts: number; routedToDlq: boolean; dlqEntry: DeadLetterMessage }> {
    try {
      const res = await fetchApi<{
        status: string
        data: { originalMessageId: string; retryAttempts: number; routedToDlq: boolean; dlqEntry: DeadLetterMessage }
      }>('/streaming/chaos/poison-pill', {
        method: 'POST',
        body: JSON.stringify(params || {}),
      })
      return (
        res.data ??
        (res as unknown as { originalMessageId: string; retryAttempts: number; routedToDlq: boolean; dlqEntry: DeadLetterMessage })
      )
    } catch {
      return {
        originalMessageId: `msg-poison-${Date.now().toString(36)}`,
        retryAttempts: 3,
        routedToDlq: true,
        dlqEntry: {
          id: `dlq-${Date.now().toString(36)}`,
          originalTopic: params?.topic || 'course-enrollments',
          originalPartition: 1,
          originalOffset: 42,
          payload: { errorTrigger: 'NULL_POINTER_EXCEPTION' },
          failureReason: params?.failureReason || 'SchemaValidationException: null pointer encountered',
          retryCount: 3,
          maxRetries: 3,
          status: 'IN_DLQ',
          createdAt: new Date().toISOString(),
        },
      }
    }
  },

  /**
   * Re-drives a message from the Dead Letter Queue back to a healthy topic.
   */
  async replayDlqMessage(params: {
    dlqId: string
    targetTopic?: string
  }): Promise<{ success: boolean; replayedMessageId: string; newOffset: number }> {
    try {
      const res = await fetchApi<{
        status: string
        data: { success: boolean; replayedMessageId: string; newOffset: number }
      }>('/streaming/dlq/replay', {
        method: 'POST',
        body: JSON.stringify(params),
      })
      return (
        res.data ??
        (res as unknown as { success: boolean; replayedMessageId: string; newOffset: number })
      )
    } catch {
      return {
        success: true,
        replayedMessageId: `msg-replayed-${Date.now().toString(36)}`,
        newOffset: 5,
      }
    }
  },

  /**
   * Reconstructs an Event Sourced aggregate state at a specific version.
   */
  async reconstructAggregateAtVersion(
    aggregateId: string,
    version?: number
  ): Promise<{
    aggregateId: string
    targetVersion: number
    reconstructedState: Record<string, any>
    eventsApplied: number
    usedSnapshotVersion: number | null
  }> {
    try {
      const query = version !== undefined ? `?version=${version}` : ''
      const res = await fetchApi<{
        status: string
        data: {
          aggregateId: string
          targetVersion: number
          reconstructedState: Record<string, any>
          eventsApplied: number
          usedSnapshotVersion: number | null
        }
      }>(`/streaming/event-sourcing/${aggregateId}${query}`)
      return (
        res.data ??
        (res as unknown as {
          aggregateId: string
          targetVersion: number
          reconstructedState: Record<string, any>
          eventsApplied: number
          usedSnapshotVersion: number | null
        })
      )
    } catch {
      return {
        aggregateId,
        targetVersion: version ?? 4,
        reconstructedState: {
          studentId: 'stu-777',
          courseId: 'system-design-v15',
          status: (version ?? 4) >= 4 ? 'COMPLETED_ENROLLED' : 'PAYMENT_CONFIRMED',
          paidAmount: 99.0,
          seatNumber: (version ?? 4) >= 3 ? 15 : undefined,
          hasAccess: (version ?? 4) >= 4,
        },
        eventsApplied: (version ?? 4) > 2 ? (version ?? 4) - 2 : (version ?? 4),
        usedSnapshotVersion: (version ?? 4) >= 2 ? 2 : null,
      }
    }
  },

  getMockTopology(): StreamingTopologySnapshot {
    return {
      topics: [
        {
          name: 'course-enrollments',
          partitionCount: 3,
          replicationFactor: 3,
          partitions: [
            {
              partitionIndex: 0,
              leaderBrokerId: 101,
              replicas: [101, 102, 103],
              inSyncReplicas: [101, 102, 103],
              logStartOffset: 0,
              logEndOffset: 3,
              highWatermark: 3,
              messages: [
                {
                  id: 'msg-0-0',
                  offset: 0,
                  key: 'user-101',
                  value: { userId: 'user-101', courseId: 'dsa-mastery', tier: 'PRO', amount: 49 },
                  timestamp: new Date(Date.now() - 3600000).toISOString(),
                  headers: { correlationId: 'corr-001' },
                  partitionIndex: 0,
                  status: 'COMMITTED',
                },
                {
                  id: 'msg-0-1',
                  offset: 1,
                  key: 'user-101',
                  value: { userId: 'user-101', courseId: 'system-design', tier: 'PRO', amount: 99 },
                  timestamp: new Date(Date.now() - 2400000).toISOString(),
                  headers: { correlationId: 'corr-002' },
                  partitionIndex: 0,
                  status: 'COMMITTED',
                },
                {
                  id: 'msg-0-2',
                  offset: 2,
                  key: 'user-104',
                  value: { userId: 'user-104', courseId: 'ml-ops', tier: 'FREE', amount: 0 },
                  timestamp: new Date(Date.now() - 1200000).toISOString(),
                  headers: { correlationId: 'corr-003' },
                  partitionIndex: 0,
                  status: 'UNCOMMITTED',
                },
              ],
            },
            {
              partitionIndex: 1,
              leaderBrokerId: 102,
              replicas: [102, 103, 101],
              inSyncReplicas: [102, 103, 101],
              logStartOffset: 0,
              logEndOffset: 2,
              highWatermark: 2,
              messages: [
                {
                  id: 'msg-1-0',
                  offset: 0,
                  key: 'user-202',
                  value: { userId: 'user-202', courseId: 'dsa-mastery', tier: 'STANDARD', amount: 29 },
                  timestamp: new Date(Date.now() - 3000000).toISOString(),
                  headers: { correlationId: 'corr-004' },
                  partitionIndex: 1,
                  status: 'COMMITTED',
                },
                {
                  id: 'msg-1-1',
                  offset: 1,
                  key: 'user-205',
                  value: { userId: 'user-205', courseId: 'cloud-arch', tier: 'ENTERPRISE', amount: 199 },
                  timestamp: new Date(Date.now() - 1500000).toISOString(),
                  headers: { correlationId: 'corr-005' },
                  partitionIndex: 1,
                  status: 'UNCOMMITTED',
                },
              ],
            },
            {
              partitionIndex: 2,
              leaderBrokerId: 103,
              replicas: [103, 101, 102],
              inSyncReplicas: [103, 101, 102],
              logStartOffset: 0,
              logEndOffset: 1,
              highWatermark: 1,
              messages: [
                {
                  id: 'msg-2-0',
                  offset: 0,
                  key: 'user-303',
                  value: { userId: 'user-303', courseId: 'gate-cs', tier: 'PRO', amount: 79 },
                  timestamp: new Date(Date.now() - 1800000).toISOString(),
                  headers: { correlationId: 'corr-006' },
                  partitionIndex: 2,
                  status: 'COMMITTED',
                },
              ],
            },
          ],
        },
      ],
      consumerGroups: [
        {
          groupId: 'enrollment-worker-group',
          protocolType: 'consumer',
          rebalanceProtocol: 'COOPERATIVE_STICKY',
          state: 'STABLE',
          generationId: 14,
          leaderId: 'consumer-worker-alpha',
          members: [
            {
              consumerId: 'consumer-worker-alpha',
              host: '10.0.4.12:9092',
              assignedPartitions: [0, 2],
              currentOffsets: { 0: 2, 2: 1 },
              status: 'ACTIVE',
            },
            {
              consumerId: 'consumer-worker-beta',
              host: '10.0.4.13:9092',
              assignedPartitions: [1],
              currentOffsets: { 1: 1 },
              status: 'ACTIVE',
            },
          ],
          lagPerPartition: { 0: 1, 1: 1, 2: 0 },
          totalLag: 2,
        },
      ],
      outboxQueue: [
        {
          id: 'outbox-1',
          aggregateType: 'CourseEnrollment',
          aggregateId: 'enroll-901',
          eventType: 'EnrollmentPaymentCaptured',
          payload: { studentId: 'usr-88', courseId: 'dist-systems', amount: 89 },
          status: 'PUBLISHED',
          createdAt: new Date(Date.now() - 600000).toISOString(),
          publishedAt: new Date(Date.now() - 590000).toISOString(),
        },
      ],
      dlqQueue: [
        {
          id: 'dlq-item-1',
          originalTopic: 'course-enrollments',
          originalPartition: 1,
          originalOffset: 99,
          payload: { userId: 'malformed_user', corruptedPayload: true },
          failureReason: 'SchemaValidationException: courseId cannot be null or empty',
          retryCount: 3,
          maxRetries: 3,
          status: 'IN_DLQ',
          createdAt: new Date(Date.now() - 1200000).toISOString(),
        },
      ],
      eventSourcingAggregates: [
        {
          aggregateId: 'enrollment-agg-777',
          aggregateType: 'CourseEnrollment',
          currentVersion: 4,
          events: [
            {
              eventId: 'evt-1',
              version: 1,
              eventType: 'EnrollmentRequested',
              timestamp: new Date(Date.now() - 3600000).toISOString(),
              payload: { studentId: 'stu-777', courseId: 'system-design-v15', requestedTier: 'PRO' },
            },
            {
              eventId: 'evt-2',
              version: 2,
              eventType: 'PaymentAuthorized',
              timestamp: new Date(Date.now() - 3500000).toISOString(),
              payload: { chargeId: 'ch_stripe_888', amountCents: 9900, currency: 'USD' },
            },
            {
              eventId: 'evt-3',
              version: 3,
              eventType: 'CourseSeatAllocated',
              timestamp: new Date(Date.now() - 3400000).toISOString(),
              payload: { seatNumber: 15, batch: 'OCT_2026' },
            },
            {
              eventId: 'evt-4',
              version: 4,
              eventType: 'WelcomeKitDispatched',
              timestamp: new Date(Date.now() - 3300000).toISOString(),
              payload: { trackingNumber: 'TRK_991823', accessGranted: true },
            },
          ],
          snapshots: [
            {
              version: 2,
              state: {
                studentId: 'stu-777',
                courseId: 'system-design-v15',
                status: 'PAYMENT_CONFIRMED',
                paidAmount: 99.0,
                hasAccess: false,
              },
              timestamp: new Date(Date.now() - 3500000).toISOString(),
            },
          ],
          state: {
            studentId: 'stu-777',
            courseId: 'system-design-v15',
            status: 'COMPLETED_ENROLLED',
            paidAmount: 99.0,
            seatNumber: 15,
            batch: 'OCT_2026',
            hasAccess: true,
            welcomeKitSent: true,
          },
        },
      ],
      telemetry: {
        totalProduced: 6,
        totalConsumed: 4,
        averageLag: 2,
        dlqCount: 1,
        rebalanceCount: 2,
      },
      auditDigest: 'a3f9c812d480e72f91bc745100fae94d88e61239aaef5401928bc189d99214ab',
    }
  },
}
