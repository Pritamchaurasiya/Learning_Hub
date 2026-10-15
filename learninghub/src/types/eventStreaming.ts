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

export type StreamingViewTab = 'KAFKA_TOPOLOGY' | 'CONSUMER_GROUPS' | 'OUTBOX_PATTERN' | 'DEAD_LETTER_QUEUE' | 'EVENT_SOURCING'
