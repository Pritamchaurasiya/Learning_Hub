/**
 * Concurrency & Deadlock Detection Types (Milestone 33)
 * Multi-Version Concurrency Control (MVCC), Write Skew, and Tarjan Wait-For Graph.
 */

export interface MvccRowVersion {
  versionId: string
  rowId: string
  xmin: number
  xmax: number | null
  data: Record<string, unknown>
  createdAt: string
  deletedAt?: string
}

export interface MvccStateResponse {
  currentCommitId: number
  rowVersions: MvccRowVersion[]
  activeSnapshots: Array<{ txId: number; visibleVersionsCount: number }>
}

export interface WriteSkewSimulationResult {
  scenario: string
  isolationLevel: 'SNAPSHOT_ISOLATION' | 'SERIALIZABLE_SSI'
  initialState: Array<{ doctorId: string; name: string; isOnCall: boolean }>
  transaction1: {
    txId: number
    action: string
    observedOnCallCount: number
    decision: string
    status: 'COMMITTED' | 'ABORTED'
  }
  transaction2: {
    txId: number
    action: string
    observedOnCallCount: number
    decision: string
    status: 'COMMITTED' | 'ABORTED'
  }
  finalState: Array<{ doctorId: string; name: string; isOnCall: boolean }>
  anomalyDetected: boolean
  anomalyType?: 'WRITE_SKEW_ANOMALY' | 'SSI_ANTIDEPENDENCY_ABORT'
  explanation: string
  cryptographicProof: string
}

export interface WaitForEdge {
  fromTxId: number
  toTxId: number
  resourceId: string
  waitDurationMs: number
}

export interface ActiveTransactionInfo {
  txId: number
  name: string
  heldLocks: string[]
  waitingForLock: string | null
  priority: number
  startedAt: string
  status: 'ACTIVE' | 'WAITING' | 'VICTIM_ABORTED'
}

export interface DeadlockDetectionResult {
  hasDeadlock: boolean
  cyclePaths: number[][]
  activeTransactions: ActiveTransactionInfo[]
  edges: WaitForEdge[]
  victimTxId: number | null
  victimSelectionPolicy: 'YOUNGEST' | 'LEAST_LOCKS' | 'LEAST_PRIORITY'
  resolutionMessage: string
  timestamp: string
  cryptographicProof: string
}

export interface IsolationLevelItem {
  name: string
  standardName: string
  dirtyRead: boolean
  nonRepeatableRead: boolean
  phantomRead: boolean
  writeSkew: boolean
  lockOverhead: string
  primaryMechanism: string
}

export interface IsolationComparisonResponse {
  levels: IsolationLevelItem[]
  summary: string
}
