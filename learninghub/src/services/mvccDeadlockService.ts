import { fetchApi } from '../utils/api'
import type {
  MvccStateResponse,
  WriteSkewSimulationResult,
  DeadlockDetectionResult,
  IsolationComparisonResponse,
} from '../types/mvccDeadlock'

export const mvccDeadlockService = {
  /**
   * Fetches current simulated MVCC row versions and snapshot visibility.
   */
  async getMvccState(): Promise<MvccStateResponse> {
    try {
      const res = await fetchApi<{ status: string; data: MvccStateResponse }>(
        '/concurrency/mvcc/state'
      )
      return res.data ?? (res as unknown as MvccStateResponse)
    } catch {
      return this.getMockMvccState()
    }
  },

  /**
   * Simulates Write Skew Anomaly (Snapshot Isolation vs Serializable SSI).
   */
  async simulateWriteSkew(
    protocol: 'SNAPSHOT_ISOLATION' | 'SERIALIZABLE_SSI' = 'SNAPSHOT_ISOLATION'
  ): Promise<WriteSkewSimulationResult> {
    try {
      const res = await fetchApi<{ status: string; data: WriteSkewSimulationResult }>(
        '/concurrency/mvcc/write-skew',
        {
          method: 'POST',
          body: JSON.stringify({ protocol }),
        }
      )
      return res.data ?? (res as unknown as WriteSkewSimulationResult)
    } catch {
      return this.getMockWriteSkew(protocol)
    }
  },

  /**
   * Runs Wait-For Graph cycle detection and resolves deadlocks via victim selection.
   */
  async detectDeadlock(params?: {
    scenario?: 'TWO_NODE_CYCLE' | 'THREE_NODE_CYCLE' | 'NO_DEADLOCK'
    victimPolicy?: 'YOUNGEST' | 'LEAST_LOCKS' | 'LEAST_PRIORITY'
  }): Promise<DeadlockDetectionResult> {
    try {
      const res = await fetchApi<{ status: string; data: DeadlockDetectionResult }>(
        '/concurrency/deadlock/detect',
        {
          method: 'POST',
          body: JSON.stringify(params || {}),
        }
      )
      return res.data ?? (res as unknown as DeadlockDetectionResult)
    } catch {
      return this.getMockDeadlock(params?.scenario, params?.victimPolicy)
    }
  },

  /**
   * Fetches the ANSI SQL vs Modern MVCC isolation matrix.
   */
  async getIsolationComparison(): Promise<IsolationComparisonResponse> {
    try {
      const res = await fetchApi<{ status: string; data: IsolationComparisonResponse }>(
        '/concurrency/comparison'
      )
      return res.data ?? (res as unknown as IsolationComparisonResponse)
    } catch {
      return this.getMockIsolationComparison()
    }
  },

  /**
   * Mock MVCC state fallback
   */
  getMockMvccState(): MvccStateResponse {
    return {
      currentCommitId: 105,
      rowVersions: [
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
          xmax: null,
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
          xmax: null,
          data: { userId: 44, balanceUsd: 401, currency: 'USD' },
          createdAt: '2026-10-15T10:00:00Z',
        },
      ],
      activeSnapshots: [
        { txId: 99, visibleVersionsCount: 2 },
        { txId: 102, visibleVersionsCount: 2 },
        { txId: 105, visibleVersionsCount: 2 },
      ],
    }
  },

  /**
   * Mock Write Skew fallback
   */
  getMockWriteSkew(
    protocol: 'SNAPSHOT_ISOLATION' | 'SERIALIZABLE_SSI' = 'SNAPSHOT_ISOLATION'
  ): WriteSkewSimulationResult {
    const initialState = [
      { doctorId: 'doc-1', name: 'Dr. Alice Sharma', isOnCall: true },
      { doctorId: 'doc-2', name: 'Dr. Bob Martinez', isOnCall: true },
    ]

    if (protocol === 'SNAPSHOT_ISOLATION') {
      return {
        scenario: 'Hospital On-Call Doctor Shift Scheduling (Invariant: onCallCount >= 1)',
        isolationLevel: 'SNAPSHOT_ISOLATION',
        initialState,
        transaction1: {
          txId: 201,
          action: 'Alice requests to go off call',
          observedOnCallCount: 2,
          decision: 'Valid (2 >= 2) -> updates Alice to isOnCall = false',
          status: 'COMMITTED',
        },
        transaction2: {
          txId: 202,
          action: 'Bob requests to go off call',
          observedOnCallCount: 2,
          decision: 'Valid (2 >= 2) -> updates Bob to isOnCall = false',
          status: 'COMMITTED',
        },
        finalState: [
          { doctorId: 'doc-1', name: 'Dr. Alice Sharma', isOnCall: false },
          { doctorId: 'doc-2', name: 'Dr. Bob Martinez', isOnCall: false },
        ],
        anomalyDetected: true,
        anomalyType: 'WRITE_SKEW_ANOMALY',
        explanation:
          'Write Skew occurred! Under Snapshot Isolation, write-sets did not collide (Tx1 modified Alice, Tx2 modified Bob), but the concurrent transactions violated the global business constraint. Now 0 doctors are on call.',
        cryptographicProof: 'mock-write-skew-proof-sha256-4b8c9d1a',
      }
    } else {
      return {
        scenario: 'Hospital On-Call Doctor Shift Scheduling (Invariant: onCallCount >= 1)',
        isolationLevel: 'SERIALIZABLE_SSI',
        initialState,
        transaction1: {
          txId: 201,
          action: 'Alice requests to go off call',
          observedOnCallCount: 2,
          decision: 'Valid (2 >= 2) -> updates Alice to isOnCall = false',
          status: 'COMMITTED',
        },
        transaction2: {
          txId: 202,
          action: 'Bob requests to go off call',
          observedOnCallCount: 2,
          decision: 'Serialization conflict detected on rw-antidependency cycle. Aborted with SQLSTATE 40001.',
          status: 'ABORTED',
        },
        finalState: [
          { doctorId: 'doc-1', name: 'Dr. Alice Sharma', isOnCall: false },
          { doctorId: 'doc-2', name: 'Dr. Bob Martinez', isOnCall: true },
        ],
        anomalyDetected: false,
        anomalyType: 'SSI_ANTIDEPENDENCY_ABORT',
        explanation:
          'Serializable Snapshot Isolation (SSI) detected a dangerous rw-antidependency cycle between Tx1 and Tx2 without holding physical heavyweight locks. Tx2 was aborted, maintaining the global invariant (1 doctor remains on call).',
        cryptographicProof: 'mock-ssi-proof-sha256-9e8a7b6c',
      }
    }
  },

  /**
   * Mock Deadlock Detection fallback
   */
  getMockDeadlock(
    scenario: 'TWO_NODE_CYCLE' | 'THREE_NODE_CYCLE' | 'NO_DEADLOCK' = 'TWO_NODE_CYCLE',
    victimPolicy: 'YOUNGEST' | 'LEAST_LOCKS' | 'LEAST_PRIORITY' = 'YOUNGEST'
  ): DeadlockDetectionResult {
    if (scenario === 'NO_DEADLOCK') {
      return {
        hasDeadlock: false,
        cyclePaths: [],
        activeTransactions: [
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
        ],
        edges: [
          { fromTxId: 302, toTxId: 301, resourceId: 'row_course_cs301', waitDurationMs: 140 },
        ],
        victimTxId: null,
        victimSelectionPolicy: victimPolicy,
        resolutionMessage:
          'Graph is a Directed Acyclic Graph (DAG). No deadlock detected; transactions will complete in topological order.',
        timestamp: new Date().toISOString(),
        cryptographicProof: 'mock-no-deadlock-proof-sha256-11aa22bb',
      }
    }

    if (scenario === 'THREE_NODE_CYCLE') {
      const victimTxId = victimPolicy === 'LEAST_PRIORITY' ? 401 : 403
      return {
        hasDeadlock: false,
        cyclePaths: [[401, 402, 403, 401]],
        activeTransactions: [
          {
            txId: 401,
            name: 'Tx-BatchGradeSync',
            heldLocks: ['table_grades_term1'],
            waitingForLock: 'table_students_roster',
            priority: 3,
            startedAt: '2026-10-15T11:00:00Z',
            status: victimTxId === 401 ? 'VICTIM_ABORTED' : 'ACTIVE',
          },
          {
            txId: 402,
            name: 'Tx-EnrollmentApproval',
            heldLocks: ['table_students_roster'],
            waitingForLock: 'table_certificates_ledger',
            priority: 7,
            startedAt: '2026-10-15T11:00:10Z',
            status: 'ACTIVE',
          },
          {
            txId: 403,
            name: 'Tx-CertificateMinting',
            heldLocks: ['table_certificates_ledger'],
            waitingForLock: 'table_grades_term1',
            priority: 9,
            startedAt: '2026-10-15T11:00:20Z',
            status: victimTxId === 403 ? 'VICTIM_ABORTED' : 'ACTIVE',
          },
        ],
        edges: [
          { fromTxId: 401, toTxId: 402, resourceId: 'table_students_roster', waitDurationMs: 420 },
          { fromTxId: 402, toTxId: 403, resourceId: 'table_certificates_ledger', waitDurationMs: 310 },
          { fromTxId: 403, toTxId: 401, resourceId: 'table_grades_term1', waitDurationMs: 180 },
        ],
        victimTxId,
        victimSelectionPolicy: victimPolicy,
        resolutionMessage: `3-Way Deadlock Cycle [401 -> 402 -> 403 -> 401] broken by aborting victim Tx ${victimTxId} under '${victimPolicy}' policy.`,
        timestamp: new Date().toISOString(),
        cryptographicProof: 'mock-3way-deadlock-proof-sha256-33cc44dd',
      }
    }

    return {
      hasDeadlock: false,
      cyclePaths: [[301, 302, 301]],
      activeTransactions: [
        {
          txId: 301,
          name: 'Tx-CoursePayment',
          heldLocks: ['row_wallet_101'],
          waitingForLock: 'row_seat_cs301',
          priority: 6,
          startedAt: '2026-10-15T11:00:00Z',
          status: 'ACTIVE',
        },
        {
          txId: 302,
          name: 'Tx-SeatReservation',
          heldLocks: ['row_seat_cs301'],
          waitingForLock: 'row_wallet_101',
          priority: 4,
          startedAt: '2026-10-15T11:00:08Z',
          status: 'VICTIM_ABORTED',
        },
      ],
      edges: [
        { fromTxId: 301, toTxId: 302, resourceId: 'row_seat_cs301', waitDurationMs: 280 },
        { fromTxId: 302, toTxId: 301, resourceId: 'row_wallet_101', waitDurationMs: 220 },
      ],
      victimTxId: 302,
      victimSelectionPolicy: victimPolicy,
      resolutionMessage: `Direct Deadlock Cycle [301 <-> 302] detected via Tarjan's WFG traversal. Aborted Tx 302 to free locks.`,
      timestamp: new Date().toISOString(),
      cryptographicProof: 'mock-2way-deadlock-proof-sha256-22bb33cc',
    }
  },

  /**
   * Mock Isolation comparison fallback
   */
  getMockIsolationComparison(): IsolationComparisonResponse {
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
          phantomRead: false,
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
          writeSkew: true,
          lockOverhead: 'Low: First-Committer-Wins conflict checking on write sets',
          primaryMechanism: 'MVCC multi-version timestamp intervals; readers never block writers',
        },
        {
          name: 'Serializable (SSI)',
          standardName: 'ANSI Level 3 (Postgres SSI / CockroachDB Strict)',
          dirtyRead: false,
          nonRepeatableRead: false,
          phantomRead: false,
          writeSkew: false,
          lockOverhead: 'Lightweight in-memory SIREAD lock graph tracking rw-antidependency cycles',
          primaryMechanism: 'Mathematical cycle detection on dependency graphs without blocking locks',
        },
      ],
      summary:
        'Snapshot Isolation provides near-zero lock overhead but remains vulnerable to Write Skew. Serializable Snapshot Isolation (SSI) eliminates all concurrency anomalies by detecting rw-antidependency cycles at commit time.',
    }
  },
}
