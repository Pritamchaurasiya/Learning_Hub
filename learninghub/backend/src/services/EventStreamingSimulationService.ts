import crypto from 'crypto'
import logger from '../utils/logger'

export interface KafkaMessage {
  id: string
  offset: number
  key: string | null
  value: Record<string, any>
  timestamp: string
  headers: Record<string, string>
  partitionIndex: number
  status: 'UNCOMMITTED' | 'COMMITTED' | 'DEAD_LETTER'
}

export interface KafkaPartition {
  partitionIndex: number
  leaderBrokerId: number
  replicas: number[]
  inSyncReplicas: number[]
  logStartOffset: number
  logEndOffset: number
  highWatermark: number
  messages: KafkaMessage[]
}

export interface KafkaTopic {
  name: string
  partitionCount: number
  replicationFactor: number
  partitions: KafkaPartition[]
}

export interface ConsumerMember {
  consumerId: string
  host: string
  assignedPartitions: number[]
  currentOffsets: Record<number, number>
  status: 'ACTIVE' | 'REBALANCING' | 'CRASHED'
}

export interface ConsumerGroup {
  groupId: string
  protocolType: 'consumer'
  rebalanceProtocol: 'EAGER' | 'COOPERATIVE_STICKY'
  state: 'STABLE' | 'PREPARING_REBALANCE' | 'COMPLETING_REBALANCE' | 'EMPTY'
  generationId: number
  leaderId: string
  members: ConsumerMember[]
  lagPerPartition: Record<number, number>
  totalLag: number
}

export interface OutboxEvent {
  id: string
  aggregateType: string
  aggregateId: string
  eventType: string
  payload: Record<string, any>
  status: 'PENDING' | 'PUBLISHED' | 'FAILED'
  createdAt: string
  publishedAt: string | null
}

export interface DeadLetterMessage {
  id: string
  originalTopic: string
  originalPartition: number
  originalOffset: number
  payload: Record<string, any>
  failureReason: string
  retryCount: number
  maxRetries: number
  status: 'IN_DLQ' | 'RETRIED' | 'DISCARDED'
  createdAt: string
}

export interface DomainEvent {
  eventId: string
  version: number
  eventType: string
  timestamp: string
  payload: Record<string, any>
}

export interface AggregateSnapshot {
  version: number
  state: Record<string, any>
  timestamp: string
}

export interface EventSourcedAggregate {
  aggregateId: string
  aggregateType: string
  currentVersion: number
  events: DomainEvent[]
  snapshots: AggregateSnapshot[]
  state: Record<string, any>
}

export interface StreamingTopologySnapshot {
  topics: KafkaTopic[]
  consumerGroups: ConsumerGroup[]
  outboxQueue: OutboxEvent[]
  dlqQueue: DeadLetterMessage[]
  eventSourcingAggregates: EventSourcedAggregate[]
  telemetry: {
    totalProduced: number
    totalConsumed: number
    averageLag: number
    dlqCount: number
    rebalanceCount: number
  }
  auditDigest: string
}

export class EventStreamingSimulationService {
  private topics: Map<string, KafkaTopic> = new Map()
  private consumerGroups: Map<string, ConsumerGroup> = new Map()
  private outboxQueue: OutboxEvent[] = []
  private dlqQueue: DeadLetterMessage[] = []
  private aggregates: Map<string, EventSourcedAggregate> = new Map()
  private totalProduced = 0
  private totalConsumed = 0
  private rebalanceCount = 0

  constructor() {
    this.initializeDefaultState()
  }

  /**
   * Simple deterministic 32-bit Murmur2-like hash for partition key routing.
   * Returns partition index [0, partitionCount - 1].
   */
  public static hashKeyToPartition(key: string | null, partitionCount: number): number {
    if (!key || partitionCount <= 1) {
      return 0
    }
    let hash = 0x811c9dc5
    for (let i = 0; i < key.length; i++) {
      hash ^= key.charCodeAt(i)
      hash = Math.imul(hash, 0x01000193)
    }
    const positiveHash = (hash >>> 0)
    return positiveHash % partitionCount
  }

  public initializeDefaultState(): void {
    this.topics.clear()
    this.consumerGroups.clear()
    this.outboxQueue = []
    this.dlqQueue = []
    this.aggregates.clear()
    this.totalProduced = 0
    this.totalConsumed = 0
    this.rebalanceCount = 0

    // 1. Topic: course-enrollments with 3 partitions
    const enrollmentTopic: KafkaTopic = {
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
              headers: { correlationId: 'corr-001', traceId: 'trc-101' },
              partitionIndex: 0,
              status: 'COMMITTED',
            },
            {
              id: 'msg-0-1',
              offset: 1,
              key: 'user-101',
              value: { userId: 'user-101', courseId: 'system-design', tier: 'PRO', amount: 99 },
              timestamp: new Date(Date.now() - 2400000).toISOString(),
              headers: { correlationId: 'corr-002', traceId: 'trc-102' },
              partitionIndex: 0,
              status: 'COMMITTED',
            },
            {
              id: 'msg-0-2',
              offset: 2,
              key: 'user-104',
              value: { userId: 'user-104', courseId: 'ml-ops', tier: 'FREE', amount: 0 },
              timestamp: new Date(Date.now() - 1200000).toISOString(),
              headers: { correlationId: 'corr-003', traceId: 'trc-103' },
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
              headers: { correlationId: 'corr-004', traceId: 'trc-201' },
              partitionIndex: 1,
              status: 'COMMITTED',
            },
            {
              id: 'msg-1-1',
              offset: 1,
              key: 'user-205',
              value: { userId: 'user-205', courseId: 'cloud-arch', tier: 'ENTERPRISE', amount: 199 },
              timestamp: new Date(Date.now() - 1500000).toISOString(),
              headers: { correlationId: 'corr-005', traceId: 'trc-202' },
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
              headers: { correlationId: 'corr-006', traceId: 'trc-301' },
              partitionIndex: 2,
              status: 'COMMITTED',
            },
          ],
        },
      ],
    }

    this.topics.set(enrollmentTopic.name, enrollmentTopic)
    this.totalProduced = 6
    this.totalConsumed = 4

    // 2. Consumer Group: enrollment-worker-group with 2 consumers over 3 partitions
    const group: ConsumerGroup = {
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
    }
    this.consumerGroups.set(group.groupId, group)

    // 3. Outbox Table Prepopulation
    this.outboxQueue = [
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
      {
        id: 'outbox-2',
        aggregateType: 'CourseEnrollment',
        aggregateId: 'enroll-902',
        eventType: 'EnrollmentSeatAllocated',
        payload: { studentId: 'usr-89', courseId: 'dist-systems', seatNo: 42 },
        status: 'PENDING',
        createdAt: new Date(Date.now() - 60000).toISOString(),
        publishedAt: null,
      },
    ]

    // 4. Dead Letter Queue Prepopulation
    this.dlqQueue = [
      {
        id: 'dlq-item-1',
        originalTopic: 'course-enrollments',
        originalPartition: 1,
        originalOffset: 99,
        payload: { userId: 'malformed_user', courseId: null, corruptedPayload: true },
        failureReason: 'SchemaValidationException: courseId cannot be null or empty',
        retryCount: 3,
        maxRetries: 3,
        status: 'IN_DLQ',
        createdAt: new Date(Date.now() - 1200000).toISOString(),
      },
    ]

    // 5. Event Sourced Aggregate Prepopulation
    const enrollmentAggregate: EventSourcedAggregate = {
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
    }
    this.aggregates.set(enrollmentAggregate.aggregateId, enrollmentAggregate)
  }

  public getTopology(): StreamingTopologySnapshot {
    this.updateConsumerGroupLags()

    const topics = Array.from(this.topics.values())
    const consumerGroups = Array.from(this.consumerGroups.values())
    const totalLag = consumerGroups.reduce((acc, g) => acc + g.totalLag, 0)

    const digest = this.computeAuditDigest()

    return {
      topics,
      consumerGroups,
      outboxQueue: [...this.outboxQueue],
      dlqQueue: [...this.dlqQueue],
      eventSourcingAggregates: Array.from(this.aggregates.values()),
      telemetry: {
        totalProduced: this.totalProduced,
        totalConsumed: this.totalConsumed,
        averageLag: consumerGroups.length > 0 ? Math.round(totalLag / consumerGroups.length) : 0,
        dlqCount: this.dlqQueue.filter((m) => m.status === 'IN_DLQ').length,
        rebalanceCount: this.rebalanceCount,
      },
      auditDigest: digest,
    }
  }

  public produceEvent(
    topicName: string,
    key: string | null,
    value: Record<string, any>,
    headers: Record<string, string> = {}
  ): { partition: number; offset: number; message: KafkaMessage } {
    let topic = this.topics.get(topicName)
    if (!topic) {
      topic = {
        name: topicName,
        partitionCount: 3,
        replicationFactor: 3,
        partitions: [0, 1, 2].map((idx) => ({
          partitionIndex: idx,
          leaderBrokerId: 101 + idx,
          replicas: [101, 102, 103],
          inSyncReplicas: [101, 102, 103],
          logStartOffset: 0,
          logEndOffset: 0,
          highWatermark: 0,
          messages: [],
        })),
      }
      this.topics.set(topicName, topic)
    }

    const partitionIndex = EventStreamingSimulationService.hashKeyToPartition(
      key,
      topic.partitionCount
    )
    const partition = topic.partitions[partitionIndex]
    const offset = partition.logEndOffset

    const message: KafkaMessage = {
      id: `msg-${partitionIndex}-${offset}-${Date.now().toString(36)}`,
      offset,
      key,
      value,
      timestamp: new Date().toISOString(),
      headers: {
        correlationId: headers.correlationId || `corr-${crypto.randomBytes(4).toString('hex')}`,
        producerId: 'producer-web-app-gateway',
        ...headers,
      },
      partitionIndex,
      status: 'UNCOMMITTED',
    }

    partition.messages.push(message)
    partition.logEndOffset += 1
    partition.highWatermark += 1
    this.totalProduced += 1

    this.updateConsumerGroupLags()

    logger.info(
      `Produced message to topic=${topicName} partition=${partitionIndex} offset=${offset} key=${key}`
    )
    return { partition: partitionIndex, offset, message }
  }

  public consumeNext(
    groupId: string,
    maxMessages: number = 1
  ): { processedCount: number; updatedLag: number; group: ConsumerGroup } {
    const group = this.consumerGroups.get(groupId)
    if (!group) {
      throw new Error(`Consumer group '${groupId}' not found`)
    }

    const topic = this.topics.get('course-enrollments')
    if (!topic) {
      throw new Error('Default topic course-enrollments not found')
    }

    let processedCount = 0

    // Iterate through active members and commit uncommitted offsets
    for (const member of group.members) {
      if (member.status !== 'ACTIVE') continue

      for (const pIdx of member.assignedPartitions) {
        const partition = topic.partitions[pIdx]
        if (!partition) continue

        const currentOffset = member.currentOffsets[pIdx] ?? 0
        const unconsumedMessages = partition.messages.filter(
          (m) => m.offset >= currentOffset && m.status === 'UNCOMMITTED'
        )

        const toProcess = unconsumedMessages.slice(0, maxMessages)
        for (const msg of toProcess) {
          msg.status = 'COMMITTED'
          member.currentOffsets[pIdx] = msg.offset + 1
          processedCount += 1
          this.totalConsumed += 1
          if (processedCount >= maxMessages) break
        }

        if (processedCount >= maxMessages) break
      }
      if (processedCount >= maxMessages) break
    }

    this.updateConsumerGroupLags()
    return {
      processedCount,
      updatedLag: group.totalLag,
      group,
    }
  }

  public rebalanceConsumerGroup(
    groupId: string,
    action: 'ADD_CONSUMER' | 'REMOVE_CONSUMER' | 'CRASH_CONSUMER' | 'HEAL_CONSUMER',
    protocol: 'EAGER' | 'COOPERATIVE_STICKY' = 'COOPERATIVE_STICKY'
  ): { group: ConsumerGroup; rebalanceHistory: string[] } {
    const group = this.consumerGroups.get(groupId)
    if (!group) {
      throw new Error(`Consumer group '${groupId}' not found`)
    }

    const topic = this.topics.get('course-enrollments')
    const totalPartitions = topic ? topic.partitionCount : 3
    const partitionIndices = Array.from({ length: totalPartitions }, (_, i) => i)

    group.rebalanceProtocol = protocol
    group.generationId += 1
    this.rebalanceCount += 1

    const history: string[] = []
    history.push(`Rebalance initiated: Action=${action}, Protocol=${protocol}, Gen=${group.generationId}`)

    switch (action) {
      case 'ADD_CONSUMER': {
        const newId = `consumer-worker-gamma-${Date.now().toString(36).slice(-4)}`
        group.members.push({
          consumerId: newId,
          host: `10.0.4.${20 + group.members.length}:9092`,
          assignedPartitions: [],
          currentOffsets: {},
          status: 'ACTIVE',
        })
        history.push(`New member joined: ${newId}`)
        break
      }
      case 'REMOVE_CONSUMER': {
        if (group.members.length > 1) {
          const removed = group.members.pop()
          history.push(`Gracefully removed member: ${removed?.consumerId}`)
        }
        break
      }
      case 'CRASH_CONSUMER': {
        const activeMember = group.members.find((m) => m.status === 'ACTIVE')
        if (activeMember) {
          activeMember.status = 'CRASHED'
          history.push(`Heartbeat timeout detected: ${activeMember.consumerId} marked as CRASHED`)
        }
        break
      }
      case 'HEAL_CONSUMER': {
        const crashedMember = group.members.find((m) => m.status === 'CRASHED')
        if (crashedMember) {
          crashedMember.status = 'ACTIVE'
          history.push(`Member recovered and re-joined: ${crashedMember.consumerId}`)
        }
        break
      }
    }

    // Partition Reassignment algorithm (Cooperative Sticky vs Round Robin)
    const healthyMembers = group.members.filter((m) => m.status === 'ACTIVE')
    if (healthyMembers.length === 0) {
      group.state = 'EMPTY'
      history.push('Zero active consumers; all partitions unassigned!')
      return { group, rebalanceHistory: history }
    }

    group.state = 'STABLE'

    if (protocol === 'COOPERATIVE_STICKY') {
      // Retain sticky assignments where possible, only rebalance delta
      healthyMembers.forEach((m) => (m.assignedPartitions = []))
      partitionIndices.forEach((pIdx, i) => {
        const assignedMember = healthyMembers[i % healthyMembers.length]
        assignedMember.assignedPartitions.push(pIdx)
        if (assignedMember.currentOffsets[pIdx] === undefined) {
          assignedMember.currentOffsets[pIdx] = 0
        }
      })
      history.push(
        `Cooperative Sticky: Minimized revocation overhead across ${healthyMembers.length} consumers.`
      )
    } else {
      // EAGER: Revoke all partitions globally, then reassign range
      healthyMembers.forEach((m) => (m.assignedPartitions = []))
      partitionIndices.forEach((pIdx, i) => {
        const assignedMember = healthyMembers[i % healthyMembers.length]
        assignedMember.assignedPartitions.push(pIdx)
      })
      history.push('EAGER: Full Stop-The-World revocation completed before assignment.')
    }

    this.updateConsumerGroupLags()
    return { group, rebalanceHistory: history }
  }

  public executeTransactionalOutbox(
    aggregateId: string,
    aggregateType: string,
    eventType: string,
    payload: Record<string, any>
  ): { outboxEvent: OutboxEvent; publishedToKafka: boolean; partition: number; offset: number } {
    // 1. Transactional Write to Outbox table
    const outboxEvent: OutboxEvent = {
      id: `outbox-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`,
      aggregateType,
      aggregateId,
      eventType,
      payload,
      status: 'PENDING',
      createdAt: new Date().toISOString(),
      publishedAt: null,
    }
    this.outboxQueue.unshift(outboxEvent)

    // 2. Outbox CDC / Poller Relay to Kafka Broker
    const { partition, offset } = this.produceEvent('course-enrollments', aggregateId, {
      ...payload,
      eventType,
      aggregateId,
    })

    outboxEvent.status = 'PUBLISHED'
    outboxEvent.publishedAt = new Date().toISOString()

    logger.info(
      `Transactional Outbox published event ${outboxEvent.id} to topic=course-enrollments partition=${partition} offset=${offset}`
    )
    return { outboxEvent, publishedToKafka: true, partition, offset }
  }

  public injectPoisonPill(
    topicName: string = 'course-enrollments',
    failureReason: string = 'InvalidSchemaException: payload contains non-serializable circular graph'
  ): { originalMessageId: string; retryAttempts: number; routedToDlq: boolean; dlqEntry: DeadLetterMessage } {
    // Produce malformed poison pill message
    const { partition, offset, message } = this.produceEvent(topicName, 'poison-pill-key', {
      corrupted: true,
      errorTrigger: 'NULL_POINTER_EXCEPTION',
    })

    message.status = 'DEAD_LETTER'

    // Simulate 3 retries with exponential backoff before sending to DLQ
    const dlqEntry: DeadLetterMessage = {
      id: `dlq-${Date.now().toString(36)}`,
      originalTopic: topicName,
      originalPartition: partition,
      originalOffset: offset,
      payload: message.value,
      failureReason,
      retryCount: 3,
      maxRetries: 3,
      status: 'IN_DLQ',
      createdAt: new Date().toISOString(),
    }

    this.dlqQueue.unshift(dlqEntry)
    logger.warn(
      `Poison pill intercepted! After 3 retries, message ${message.id} routed to DLQ ${dlqEntry.id}`
    )

    return {
      originalMessageId: message.id,
      retryAttempts: 3,
      routedToDlq: true,
      dlqEntry,
    }
  }

  public replayDlqMessage(
    dlqId: string,
    targetTopic: string = 'course-enrollments'
  ): { success: boolean; replayedMessageId: string; newOffset: number } {
    const entry = this.dlqQueue.find((item) => item.id === dlqId)
    if (!entry) {
      throw new Error(`DLQ message '${dlqId}' not found`)
    }

    // Replay to target topic with fixed sanitized payload
    const sanitizedPayload = {
      ...entry.payload,
      corrupted: false,
      replayedAt: new Date().toISOString(),
      originalDlqId: dlqId,
    }

    const { offset, message } = this.produceEvent(targetTopic, 'replayed-key', sanitizedPayload, {
      replayedFromDlq: 'true',
    })

    entry.status = 'RETRIED'
    logger.info(`DLQ item ${dlqId} successfully re-driven to topic=${targetTopic} offset=${offset}`)

    return {
      success: true,
      replayedMessageId: message.id,
      newOffset: offset,
    }
  }

  public reconstructAggregateAtVersion(
    aggregateId: string,
    targetVersion?: number
  ): {
    aggregateId: string
    targetVersion: number
    reconstructedState: Record<string, any>
    eventsApplied: number
    usedSnapshotVersion: number | null
  } {
    const aggregate = this.aggregates.get(aggregateId)
    if (!aggregate) {
      throw new Error(`Aggregate '${aggregateId}' not found`)
    }

    const effectiveTargetVersion =
      targetVersion !== undefined
        ? Math.max(0, Math.min(targetVersion, aggregate.currentVersion))
        : aggregate.currentVersion

    // 1. Locate latest snapshot with version <= effectiveTargetVersion
    let baseState: Record<string, any> = {}
    let startingVersion = 0
    let usedSnapshotVersion: number | null = null

    const eligibleSnapshots = aggregate.snapshots
      .filter((s) => s.version <= effectiveTargetVersion)
      .sort((a, b) => b.version - a.version)

    if (eligibleSnapshots.length > 0) {
      const bestSnapshot = eligibleSnapshots[0]
      baseState = JSON.parse(JSON.stringify(bestSnapshot.state))
      startingVersion = bestSnapshot.version
      usedSnapshotVersion = bestSnapshot.version
    }

    // 2. Fold remaining events from startingVersion to effectiveTargetVersion
    const eventsToApply = aggregate.events.filter(
      (e) => e.version > startingVersion && e.version <= effectiveTargetVersion
    )

    let currentState = { ...baseState }
    for (const evt of eventsToApply) {
      currentState = this.applyDomainEvent(currentState, evt)
    }

    return {
      aggregateId,
      targetVersion: effectiveTargetVersion,
      reconstructedState: currentState,
      eventsApplied: eventsToApply.length,
      usedSnapshotVersion,
    }
  }

  private applyDomainEvent(state: Record<string, any>, event: DomainEvent): Record<string, any> {
    const newState = { ...state }
    switch (event.eventType) {
      case 'EnrollmentRequested':
        newState.studentId = event.payload.studentId
        newState.courseId = event.payload.courseId
        newState.status = 'REQUESTED'
        newState.tier = event.payload.requestedTier
        break
      case 'PaymentAuthorized':
        newState.paidAmount = event.payload.amountCents / 100
        newState.chargeId = event.payload.chargeId
        newState.status = 'PAYMENT_CONFIRMED'
        break
      case 'CourseSeatAllocated':
        newState.seatNumber = event.payload.seatNumber
        newState.batch = event.payload.batch
        newState.status = 'SEAT_RESERVED'
        break
      case 'WelcomeKitDispatched':
        newState.trackingNumber = event.payload.trackingNumber
        newState.hasAccess = true
        newState.status = 'COMPLETED_ENROLLED'
        break
      default:
        Object.assign(newState, event.payload)
        break
    }
    return newState
  }

  private updateConsumerGroupLags(): void {
    const topic = this.topics.get('course-enrollments')
    if (!topic) return

    for (const group of this.consumerGroups.values()) {
      let groupTotalLag = 0
      const partitionLag: Record<number, number> = {}

      for (const partition of topic.partitions) {
        const pIdx = partition.partitionIndex
        let maxConsumedOffset = 0

        for (const member of group.members) {
          if (member.assignedPartitions.includes(pIdx)) {
            maxConsumedOffset = Math.max(maxConsumedOffset, member.currentOffsets[pIdx] ?? 0)
          }
        }

        const lag = Math.max(0, partition.logEndOffset - maxConsumedOffset)
        partitionLag[pIdx] = lag
        groupTotalLag += lag
      }

      group.lagPerPartition = partitionLag
      group.totalLag = groupTotalLag
    }
  }

  public computeAuditDigest(): string {
    const topicSummary = Array.from(this.topics.values())
      .map((t) => `${t.name}:${t.partitions.map((p) => p.logEndOffset).join(',')}`)
      .join('|')
    const groupSummary = Array.from(this.consumerGroups.values())
      .map((g) => `${g.groupId}:${g.generationId}:${g.totalLag}`)
      .join('|')
    const dlqCount = this.dlqQueue.length
    const raw = `${topicSummary}#${groupSummary}#dlq:${dlqCount}#p:${this.totalProduced}#c:${this.totalConsumed}`
    return crypto.createHash('sha256').update(raw).digest('hex')
  }
}

export const eventStreamingSimulationService = new EventStreamingSimulationService()
