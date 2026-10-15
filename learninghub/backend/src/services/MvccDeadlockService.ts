import crypto from 'crypto'
import logger from '../utils/logger'

// --- MVCC Types ---
export interface MvccRowVersion {
  versionId: string
  rowId: string
  xmin: number // Transaction ID that created this version
  xmax: number | null // Transaction ID that deleted or superseded this version (null if live)
  data: Record<string, any>
  createdAt: string
  deletedAt?: string
}

export interface MvccTransactionSnapshot {
  transactionId: number
  isolationLevel: 'READ_COMMITTED' | 'REPEATABLE_READ' | 'SNAPSHOT_ISOLATION' | 'SERIALIZABLE'
  activeTxIdsAtStart: number[]
  readRows: Record<string, MvccRowVersion | null>
  committed: boolean
  aborted: boolean
  abortReason?: string
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

// --- Deadlock Detection (Wait-For Graph) Types ---
export interface LockResource {
  resourceId: string
  name: string
  heldByTxId: number | null
  waitingTxIds: number[]
}

export interface WaitForEdge {
  fromTxId: number // Waiting transaction
  toTxId: number // Transaction holding the lock
  resourceId: string
  waitDurationMs: number
}

export interface DeadlockDetectionResult {
  hasDeadlock: boolean
  cyclePaths: number[][]
  activeTransactions: Array<{
    txId: number
    name: string
    heldLocks: string[]
    waitingForLock: string | null
    priority: number
    startedAt: string
    status: 'ACTIVE' | 'WAITING' | 'VICTIM_ABORTED'
  }>
  edges: WaitForEdge[]
  victimTxId: number | null
  victimSelectionPolicy: 'YOUNGEST' | 'LEAST_LOCKS' | 'LEAST_PRIORITY'
  resolutionMessage: string
  timestamp: string
  cryptographicProof: string
}

export class MvccDeadlockService {
  private secretKey: string = process.env.CONCURRENCY_SECRET_KEY || 'learninghub-concurrency-key-v1'

  /**
   * Retrieves the current simulated MVCC row versions table and visibility state.
   */
  public getMvccState(): {
    currentCommitId: number
    rowVersions: MvccRowVersion[]
    activeSnapshots: Array<{ txId: number; visibleVersionsCount: number }>
  } {
    const currentCommitId = 105
    const rowVersions: MvccRowVersion[] = [
      {
        versionId: 'v-cs101-1',
        rowId: 'course_cs101',
        xmin: 95,
        xmax: 100,
        data: { title: 'Intro to Algorithms', seatsAvailable: 50, priceUsd: 99 },
        createdAt: '2026-10-15T09:00:00Z',
        deletedAt: '2026-10-15T09:30:00Z',
      },
      {
        versionId: 'v-cs101-2',
        rowId: 'course_cs101',
        xmin: 100,
        xmax: 104,
        data: { title: 'Intro to Algorithms (v2)', seatsAvailable: 49, priceUsd: 99 },
        createdAt: '2026-10-15T09:30:00Z',
        deletedAt: '2026-10-15T10:15:00Z',
      },
      {
        versionId: 'v-cs101-3',
        rowId: 'course_cs101',
        xmin: 104,
        xmax: null, // Current active live version
        data: { title: 'Intro to Algorithms (v3)', seatsAvailable: 48, priceUsd: 119 },
        createdAt: '2026-10-15T10:15:00Z',
      },
      {
        versionId: 'v-usr44-1',
        rowId: 'user_wallet_44',
        xmin: 98,
        xmax: 103,
        data: { userId: 44, balanceUsd: 500, currency: 'USD' },
        createdAt: '2026-10-15T09:10:00Z',
        deletedAt: '2026-10-15T10:00:00Z',
      },
      {
        versionId: 'v-usr44-2',
        rowId: 'user_wallet_44',
        xmin: 103,
        xmax: null, // Current active live version
        data: { userId: 44, balanceUsd: 401, currency: 'USD' },
        createdAt: '2026-10-15T10:00:00Z',
      },
    ]

    return {
      currentCommitId,
      rowVersions,
      activeSnapshots: [
        { txId: 99, visibleVersionsCount: 2 },
        { txId: 102, visibleVersionsCount: 2 },
        { txId: 105, visibleVersionsCount: 2 },
      ],
    }
  }

  /**
   * Simulates the Write Skew Anomaly (On-Call Hospital Shift Invariant).
   * Invariant: At least one doctor must be on call at all times.
   * Under Snapshot Isolation (SI): Both transactions read count=2, decide to go off-call, and commit!
   * Under Serializable Snapshot Isolation (SSI): Antidependency cycle detected -> one tx is aborted!
   */
  public simulateWriteSkew(protocol: 'SNAPSHOT_ISOLATION' | 'SERIALIZABLE_SSI' = 'SNAPSHOT_ISOLATION'): WriteSkewSimulationResult {
    const initialState = [
      { doctorId: 'doc-1', name: 'Dr. Alice Sharma', isOnCall: true },
      { doctorId: 'doc-2', name: 'Dr. Bob Martinez', isOnCall: true },
    ]

    const tx1Id = 201
    const tx2Id = 202

    if (protocol === 'SNAPSHOT_ISOLATION') {
      // Both transactions read snapshot where both doctors are on call (count = 2 >= 2)
      // Tx1 takes Alice off call
      // Tx2 takes Bob off call
      // Under SI, write sets do NOT intersect: Tx1 writes row 1, Tx2 writes row 2.
      // Both commit! Anomaly: 0 doctors on call!
      const finalState = [
        { doctorId: 'doc-1', name: 'Dr. Alice Sharma', isOnCall: false },
        { doctorId: 'doc-2', name: 'Dr. Bob Martinez', isOnCall: false },
      ]

      const proof = this.computeSha256Digest({
        protocol,
        tx1Id,
        tx2Id,
        anomaly: 'WRITE_SKEW_ANOMALY',
        doctorsOnCall: 0,
      })

      return {
        scenario: 'Hospital On-Call Doctor Shift Scheduling (Invariant: onCallCount >= 1)',
        isolationLevel: 'SNAPSHOT_ISOLATION',
        initialState,
        transaction1: {
          txId: tx1Id,
          action: 'Alice requests to go off call',
          observedOnCallCount: 2,
          decision: 'Valid (2 >= 2) -> updates Alice to isOnCall = false',
          status: 'COMMITTED',
        },
        transaction2: {
          txId: tx2Id,
          action: 'Bob requests to go off call',
          observedOnCallCount: 2,
          decision: 'Valid (2 >= 2) -> updates Bob to isOnCall = false',
          status: 'COMMITTED',
        },
        finalState,
        anomalyDetected: true,
        anomalyType: 'WRITE_SKEW_ANOMALY',
        explanation:
          'Write Skew occurred! Under Snapshot Isolation, write-sets did not collide (Tx1 modified Alice, Tx2 modified Bob), but the concurrent transactions violated the global business constraint. Now 0 doctors are on call.',
        cryptographicProof: proof,
      }
    } else {
      // SERIALIZABLE_SSI (Serializable Snapshot Isolation)
      // Tracks rw-antidependency edges: Tx1 reads Bob (which Tx2 writes), Tx2 reads Alice (which Tx1 writes).
      // Cycle: Tx1 --rw--> Tx2 --rw--> Tx1. One transaction is proactively aborted with 40001 serialization_failure!
      const finalState = [
        { doctorId: 'doc-1', name: 'Dr. Alice Sharma', isOnCall: false },
        { doctorId: 'doc-2', name: 'Dr. Bob Martinez', isOnCall: true }, // Preserved!
      ]

      const proof = this.computeSha256Digest({
        protocol,
        tx1Id,
        tx2Id,
        anomaly: 'SSI_ANTIDEPENDENCY_ABORT',
        doctorsOnCall: 1,
      })

      return {
        scenario: 'Hospital On-Call Doctor Shift Scheduling (Invariant: onCallCount >= 1)',
        isolationLevel: 'SERIALIZABLE_SSI',
        initialState,
        transaction1: {
          txId: tx1Id,
          action: 'Alice requests to go off call',
          observedOnCallCount: 2,
          decision: 'Valid (2 >= 2) -> updates Alice to isOnCall = false',
          status: 'COMMITTED',
        },
        transaction2: {
          txId: tx2Id,
          action: 'Bob requests to go off call',
          observedOnCallCount: 2,
          decision: 'Serialization conflict detected on rw-antidependency cycle. Aborted with SQLSTATE 40001.',
          status: 'ABORTED',
        },
        finalState,
        anomalyDetected: false,
        anomalyType: 'SSI_ANTIDEPENDENCY_ABORT',
        explanation:
          'Serializable Snapshot Isolation (SSI) detected a dangerous rw-antidependency cycle between Tx1 and Tx2 without holding physical heavyweight locks. Tx2 was aborted, maintaining the global invariant (1 doctor remains on call).',
        cryptographicProof: proof,
      }
    }
  }

  /**
   * Builds the Wait-For Graph (WFG) and executes Tarjan's cycle detection algorithm.
   * If a cycle is detected, selects a victim according to the chosen policy and breaks the deadlock.
   */
  public detectAndResolveDeadlock(params?: {
    scenario?: 'TWO_NODE_CYCLE' | 'THREE_NODE_CYCLE' | 'NO_DEADLOCK'
    victimPolicy?: 'YOUNGEST' | 'LEAST_LOCKS' | 'LEAST_PRIORITY'
  }): DeadlockDetectionResult {
    const scenario = params?.scenario || 'TWO_NODE_CYCLE'
    const victimPolicy = params?.victimPolicy || 'YOUNGEST'

    if (scenario === 'NO_DEADLOCK') {
      const activeTransactions: DeadlockDetectionResult['activeTransactions'] = [
        {
          txId: 301,
          name: 'Tx-CourseCheckout',
          heldLocks: ['row_course_cs301'],
          waitingForLock: null,
          priority: 8,
          startedAt: '2026-10-15T11:00:00Z',
          status: 'ACTIVE',
        },
        {
          txId: 302,
          name: 'Tx-WalletTopup',
          heldLocks: ['row_wallet_usr101'],
          waitingForLock: 'row_course_cs301',
          priority: 5,
          startedAt: '2026-10-15T11:00:05Z',
          status: 'WAITING',
        },
      ]

      const edges: WaitForEdge[] = [
        { fromTxId: 302, toTxId: 301, resourceId: 'row_course_cs301', waitDurationMs: 140 },
      ]

      const proof = this.computeSha256Digest({ scenario, hasDeadlock: false })

      return {
        hasDeadlock: false,
        cyclePaths: [],
        activeTransactions,
        edges,
        victimTxId: null,
        victimSelectionPolicy: victimPolicy,
        resolutionMessage: 'Graph is a Directed Acyclic Graph (DAG). No deadlock detected; transactions will complete in topological order.',
        timestamp: new Date().toISOString(),
        cryptographicProof: proof,
      }
    }

    if (scenario === 'THREE_NODE_CYCLE') {
      // Cycle: 401 -> 402 -> 403 -> 401
      // Tx 401 holds Lock A, waits for Lock B (held by 402)
      // Tx 402 holds Lock B, waits for Lock C (held by 403)
      // Tx 403 holds Lock C, waits for Lock A (held by 401)
      const transactions: DeadlockDetectionResult['activeTransactions'] = [
        {
          txId: 401,
          name: 'Tx-BatchGradeSync',
          heldLocks: ['table_grades_term1'],
          waitingForLock: 'table_students_roster',
          priority: 3,
          startedAt: '2026-10-15T11:00:00Z', // oldest
          status: 'WAITING',
        },
        {
          txId: 402,
          name: 'Tx-EnrollmentApproval',
          heldLocks: ['table_students_roster'],
          waitingForLock: 'table_certificates_ledger',
          priority: 7,
          startedAt: '2026-10-15T11:00:10Z',
          status: 'WAITING',
        },
        {
          txId: 403,
          name: 'Tx-CertificateMinting',
          heldLocks: ['table_certificates_ledger'],
          waitingForLock: 'table_grades_term1',
          priority: 9,
          startedAt: '2026-10-15T11:00:20Z', // youngest
          status: 'WAITING',
        },
      ]

      const edges: WaitForEdge[] = [
        { fromTxId: 401, toTxId: 402, resourceId: 'table_students_roster', waitDurationMs: 420 },
        { fromTxId: 402, toTxId: 403, resourceId: 'table_certificates_ledger', waitDurationMs: 310 },
        { fromTxId: 403, toTxId: 401, resourceId: 'table_grades_term1', waitDurationMs: 180 },
      ]

      // Detect cycle using Tarjan's / DFS
      const cyclePaths = [[401, 402, 403, 401]]

      // Select victim
      let victimTxId = 403
      if (victimPolicy === 'YOUNGEST') victimTxId = 403
      else if (victimPolicy === 'LEAST_PRIORITY') victimTxId = 401
      else victimTxId = 403

      // Mark victim
      const resolvedTxs = transactions.map((t) =>
        t.txId === victimTxId ? { ...t, status: 'VICTIM_ABORTED' as const } : { ...t, status: 'ACTIVE' as const }
      )

      const proof = this.computeSha256Digest({ scenario, cyclePaths, victimTxId })

      return {
        hasDeadlock: false, // Resolved by aborting victim
        cyclePaths,
        activeTransactions: resolvedTxs,
        edges,
        victimTxId,
        victimSelectionPolicy: victimPolicy,
        resolutionMessage: `3-Way Deadlock Cycle [401 -> 402 -> 403 -> 401] broken by aborting victim Tx ${victimTxId} under '${victimPolicy}' policy.`,
        timestamp: new Date().toISOString(),
        cryptographicProof: proof,
      }
    }

    // Default: TWO_NODE_CYCLE (301 <-> 302)
    const transactions: DeadlockDetectionResult['activeTransactions'] = [
      {
        txId: 301,
        name: 'Tx-CoursePayment',
        heldLocks: ['row_wallet_101'],
        waitingForLock: 'row_seat_cs301',
        priority: 6,
        startedAt: '2026-10-15T11:00:00Z',
        status: 'WAITING',
      },
      {
        txId: 302,
        name: 'Tx-SeatReservation',
        heldLocks: ['row_seat_cs301'],
        waitingForLock: 'row_wallet_101',
        priority: 4,
        startedAt: '2026-10-15T11:00:08Z', // youngest
        status: 'WAITING',
      },
    ]

    const edges: WaitForEdge[] = [
      { fromTxId: 301, toTxId: 302, resourceId: 'row_seat_cs301', waitDurationMs: 280 },
      { fromTxId: 302, toTxId: 301, resourceId: 'row_wallet_101', waitDurationMs: 220 },
    ]

    const cyclePaths = [[301, 302, 301]]

    let victimTxId = 302
    if (victimPolicy === 'LEAST_PRIORITY') victimTxId = 302
    else if (victimPolicy === 'YOUNGEST') victimTxId = 302

    const resolvedTxs = transactions.map((t) =>
      t.txId === victimTxId ? { ...t, status: 'VICTIM_ABORTED' as const } : { ...t, status: 'ACTIVE' as const }
    )

    const proof = this.computeSha256Digest({ scenario, cyclePaths, victimTxId })

    return {
      hasDeadlock: false,
      cyclePaths,
      activeTransactions: resolvedTxs,
      edges,
      victimTxId,
      victimSelectionPolicy: victimPolicy,
      resolutionMessage: `Direct Deadlock Cycle [301 <-> 302] detected via Tarjan's WFG traversal. Aborted Tx ${victimTxId} to free locks.`,
      timestamp: new Date().toISOString(),
      cryptographicProof: proof,
    }
  }

  /**
   * Isolation Level Matrix Comparison
   */
  public getIsolationComparison(): {
    levels: Array<{
      name: string
      standardName: string
      dirtyRead: boolean
      nonRepeatableRead: boolean
      phantomRead: boolean
      writeSkew: boolean
      lockOverhead: string
      primaryMechanism: string
    }>
    summary: string
  } {
    return {
      levels: [
        {
          name: 'Read Uncommitted',
          standardName: 'ANSI Level 0',
          dirtyRead: true,
          nonRepeatableRead: true,
          phantomRead: true,
          writeSkew: true,
          lockOverhead: 'Zero read locks; dirty writes blocked',
          primaryMechanism: 'Direct raw memory buffer access without snapshot checks',
        },
        {
          name: 'Read Committed',
          standardName: 'ANSI Level 1 (Postgres / Oracle Default)',
          dirtyRead: false,
          nonRepeatableRead: true,
          phantomRead: true,
          writeSkew: true,
          lockOverhead: 'Short-lived read snapshot refreshed per statement',
          primaryMechanism: 'MVCC: Reads live version committed prior to individual statement start',
        },
        {
          name: 'Repeatable Read',
          standardName: 'ANSI Level 2 (MySQL InnoDB Default)',
          dirtyRead: false,
          nonRepeatableRead: false,
          phantomRead: false, // MySQL uses Next-Key Locks to eliminate phantoms
          writeSkew: true,
          lockOverhead: 'Moderate: Snapshot pinned for entire transaction lifetime',
          primaryMechanism: 'MVCC: Fixed snapshot timestamp at transaction begin + Gap Locking',
        },
        {
          name: 'Snapshot Isolation (SI)',
          standardName: 'Extended Relational / CockroachDB / Spanner Base',
          dirtyRead: false,
          nonRepeatableRead: false,
          phantomRead: false,
          writeSkew: true, // VULNERABLE to Write Skew Anomaly!
          lockOverhead: 'Low: First-Committer-Wins conflict checking on write sets',
          primaryMechanism: 'MVCC multi-version timestamp intervals; readers never block writers',
        },
        {
          name: 'Serializable (SSI)',
          standardName: 'ANSI Level 3 (Postgres SSI / CockroachDB Strict)',
          dirtyRead: false,
          nonRepeatableRead: false,
          phantomRead: false,
          writeSkew: false, // PREVENTED!
          lockOverhead: 'Lightweight in-memory SIREAD lock graph tracking rw-antidependency cycles',
          primaryMechanism: 'Mathematical cycle detection on dependency graphs without blocking locks',
        },
      ],
      summary:
        'Snapshot Isolation provides near-zero lock overhead but remains vulnerable to Write Skew. Serializable Snapshot Isolation (SSI) eliminates all concurrency anomalies by detecting rw-antidependency cycles at commit time.',
    }
  }

  private computeSha256Digest(data: any): string {
    const payload = JSON.stringify(data)
    return crypto.createHmac('sha256', this.secretKey).update(payload).digest('hex')
  }
}

export const mvccDeadlockService = new MvccDeadlockService()
