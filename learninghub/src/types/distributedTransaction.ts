/**
 * Distributed Transaction Coordinator Types (Milestone 32)
 * Supports Two-Phase Commit (2PC) and Saga Pattern Orchestration.
 */

export type TransactionProtocol = 'TWO_PHASE_COMMIT' | 'SAGA_ORCHESTRATOR'

// --- Two-Phase Commit (2PC) ---
export type TwoPhaseParticipantVote = 'VOTE_COMMIT' | 'VOTE_ABORT' | 'TIMEOUT' | 'CRASHED'
export type TwoPhaseFinalStatus = 'COMMITTED' | 'ABORTED' | 'BLOCKED_TIMEOUT'
export type TwoPhaseCoordinatorStatus = 'IDLE' | 'PREPARING' | 'DECIDING' | 'COMMITTING' | 'ABORTING' | 'DONE'

export interface TwoPhaseParticipantState {
  id: string
  name: string
  serviceName: string
  status: 'IDLE' | 'PREPARED' | 'COMMITTED' | 'ABORTED' | 'LOCKED' | 'CRASHED'
  vote: TwoPhaseParticipantVote | null
  lockedResources: string[]
  latencyMs: number
}

export interface TwoPhaseLogEntry {
  phase: 'PHASE_1_PREPARE' | 'PHASE_2_DECISION' | 'AUDIT'
  source: string
  target: string
  message: string
  timestamp: string
}

export interface TwoPhaseTransactionRecord {
  transactionId: string
  coordinatorStatus: TwoPhaseCoordinatorStatus
  finalVerdict: TwoPhaseFinalStatus
  participants: TwoPhaseParticipantState[]
  executionLog: TwoPhaseLogEntry[]
  durationMs: number
  cryptographicProof: string
}

// --- SAGA Pattern ---
export type SagaStepStatus = 'PENDING' | 'RUNNING' | 'SUCCESS' | 'FAILED' | 'COMPENSATING' | 'COMPENSATED'

export interface SagaStepDefinition {
  stepIndex: number
  serviceName: string
  actionName: string
  compensationName: string
  status: SagaStepStatus
  payload: Record<string, unknown>
  errorReason?: string
  executionTimeMs: number
}

export interface SagaCompensationEntry {
  compensatedStep: string
  compensationAction: string
  status: 'SUCCESS' | 'FAILED'
  timestamp: string
}

export interface SagaExecutionRecord {
  sagaId: string
  sagaName: string
  overallStatus: 'COMPLETED' | 'ROLLED_BACK' | 'FAILED'
  steps: SagaStepDefinition[]
  compensationHistory: SagaCompensationEntry[]
  totalDurationMs: number
  cryptographicProof: string
}

// --- Architectural Comparison ---
export interface ProtocolComparisonItem {
  name: string
  consistencyModel: string
  coordinationStyle: string
  performanceCharacteristics: {
    latency: string
    throughput: string
    resourceLockDuration: string
  }
  failureResilience: {
    coordinatorCrash: string
    networkPartition: string
    partialFailureRecovery: string
  }
  recommendedUseCases: string[]
}

export interface ProtocolComparisonResponse {
  protocols: {
    twoPhaseCommit: ProtocolComparisonItem
    sagaOrchestration: ProtocolComparisonItem
  }
  summaryVerdict: string
}
