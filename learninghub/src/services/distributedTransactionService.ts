import { fetchApi } from '../utils/api'
import type {
  TwoPhaseTransactionRecord,
  SagaExecutionRecord,
  ProtocolComparisonResponse,
} from '../types/distributedTransaction'

export const distributedTransactionService = {
  /**
   * Executes a simulated Two-Phase Commit transaction.
   */
  async execute2PC(params?: {
    failingParticipantId?: string
    simulateCoordinatorCrash?: boolean
  }): Promise<TwoPhaseTransactionRecord> {
    try {
      const res = await fetchApi<{ status: string; data: TwoPhaseTransactionRecord }>(
        '/transactions/2pc/execute',
        {
          method: 'POST',
          body: JSON.stringify(params || {}),
        }
      )
      return res.data ?? (res as unknown as TwoPhaseTransactionRecord)
    } catch {
      return this.getMock2PCRecord(params)
    }
  },

  /**
   * Executes a simulated Saga orchestration transaction.
   */
  async executeSaga(params?: {
    failingStepIndex?: number
  }): Promise<SagaExecutionRecord> {
    try {
      const res = await fetchApi<{ status: string; data: SagaExecutionRecord }>(
        '/transactions/saga/execute',
        {
          method: 'POST',
          body: JSON.stringify(params || {}),
        }
      )
      return res.data ?? (res as unknown as SagaExecutionRecord)
    } catch {
      return this.getMockSagaRecord(params?.failingStepIndex)
    }
  },

  /**
   * Fetches the 2PC vs Saga architectural comparison matrix.
   */
  async getComparison(): Promise<ProtocolComparisonResponse> {
    try {
      const res = await fetchApi<{ status: string; data: ProtocolComparisonResponse }>(
        '/transactions/comparison'
      )
      return res.data ?? (res as unknown as ProtocolComparisonResponse)
    } catch {
      return this.getMockComparison()
    }
  },

  /**
   * Mock 2PC fallback generator for offline / test environments
   */
  getMock2PCRecord(params?: {
    failingParticipantId?: string
    simulateCoordinatorCrash?: boolean
  }): TwoPhaseTransactionRecord {
    const isCrash = !!params?.simulateCoordinatorCrash
    const failingId = params?.failingParticipantId
    const isAbort = !isCrash && !!failingId

    const participants = [
      {
        id: 'billing-db',
        name: 'Billing & Invoicing Store',
        serviceName: 'BillingService (PostgreSQL-1)',
        status: (isCrash
          ? 'LOCKED'
          : isAbort
          ? failingId === 'billing-db'
            ? 'ABORTED'
            : 'ABORTED'
          : 'COMMITTED') as any,
        vote: (failingId === 'billing-db' ? 'VOTE_ABORT' : 'VOTE_COMMIT') as any,
        lockedResources: ['user_wallet_101', 'invoice_draft_902'],
        latencyMs: 14,
      },
      {
        id: 'enrollment-db',
        name: 'Course Enrollment Store',
        serviceName: 'EnrollmentService (PostgreSQL-2)',
        status: (isCrash
          ? 'LOCKED'
          : isAbort
          ? failingId === 'enrollment-db'
            ? 'ABORTED'
            : 'ABORTED'
          : 'COMMITTED') as any,
        vote: (failingId === 'enrollment-db' ? 'VOTE_ABORT' : 'VOTE_COMMIT') as any,
        lockedResources: ['course_seat_cs301', 'student_grant_101'],
        latencyMs: 18,
      },
      {
        id: 'inventory-db',
        name: 'Digital Textbook License Store',
        serviceName: 'LicenseService (MySQL)',
        status: (isCrash
          ? 'LOCKED'
          : isAbort
          ? failingId === 'inventory-db'
            ? 'ABORTED'
            : 'ABORTED'
          : 'COMMITTED') as any,
        vote: (failingId === 'inventory-db' ? 'VOTE_ABORT' : 'VOTE_COMMIT') as any,
        lockedResources: ['ebook_license_405'],
        latencyMs: 12,
      },
    ]

    return {
      transactionId: `mock-2pc-${Date.now()}`,
      coordinatorStatus: isCrash ? 'DECIDING' : 'DONE',
      finalVerdict: isCrash ? 'BLOCKED_TIMEOUT' : isAbort ? 'ABORTED' : 'COMMITTED',
      participants,
      executionLog: [
        {
          phase: 'PHASE_1_PREPARE',
          source: 'Coordinator',
          target: 'ALL_PARTICIPANTS',
          message: 'Broadcasting PREPARE request to all resource managers',
          timestamp: new Date().toISOString(),
        },
        {
          phase: 'PHASE_2_DECISION',
          source: 'Coordinator',
          target: 'ALL_PARTICIPANTS',
          message: isCrash
            ? 'COORDINATOR_CRASH: Coordinator died before decision broadcast'
            : isAbort
            ? 'GLOBAL_ABORT broadcasted due to participant rejection'
            : 'GLOBAL_COMMIT broadcasted to all participants',
          timestamp: new Date().toISOString(),
        },
        {
          phase: 'AUDIT',
          source: 'AuditEngine',
          target: 'SystemLedger',
          message: 'HMAC-SHA256 consensus audit proof recorded',
          timestamp: new Date().toISOString(),
        },
      ],
      durationMs: 44,
      cryptographicProof: 'mock-2pc-sha256-proof-verified-44f8a92b',
    }
  },

  /**
   * Mock Saga fallback generator for offline / test environments
   */
  getMockSagaRecord(failingStepIndex?: number): SagaExecutionRecord {
    const isFailed = failingStepIndex !== undefined && failingStepIndex >= 0 && failingStepIndex <= 3

    const defaultSteps = [
      {
        stepIndex: 0,
        serviceName: 'OrderOrchestrator',
        actionName: 'CreatePendingOrder',
        compensationName: 'CancelPendingOrder',
        status: 'SUCCESS' as const,
        payload: { orderId: 'ord-8891', amount: 149.0 },
        executionTimeMs: 12,
      },
      {
        stepIndex: 1,
        serviceName: 'PaymentGatewayService',
        actionName: 'AuthorizeAndCaptureCharge',
        compensationName: 'RefundCharge',
        status: 'SUCCESS' as const,
        payload: { transactionRef: 'chg_stripe_9921' },
        executionTimeMs: 45,
      },
      {
        stepIndex: 2,
        serviceName: 'CourseEnrollmentService',
        actionName: 'ReserveCourseSeatAndGrantAccess',
        compensationName: 'RevokeCourseSeatAndAccess',
        status: 'SUCCESS' as const,
        payload: { seatNumber: 'CS301-S44' },
        executionTimeMs: 25,
      },
      {
        stepIndex: 3,
        serviceName: 'NotificationService',
        actionName: 'DispatchReceiptAndWelcomeEmail',
        compensationName: 'SendCancellationNotice',
        status: 'SUCCESS' as const,
        payload: { dispatchChannel: 'SES_EMAIL' },
        executionTimeMs: 18,
      },
    ]

    const compensationHistory: SagaExecutionRecord['compensationHistory'] = []

    if (isFailed) {
      for (let i = 0; i < defaultSteps.length; i++) {
        if (i < failingStepIndex!) {
          defaultSteps[i].status = 'COMPENSATED'
          compensationHistory.push({
            compensatedStep: defaultSteps[i].actionName,
            compensationAction: defaultSteps[i].compensationName,
            status: 'SUCCESS',
            timestamp: new Date().toISOString(),
          })
        } else if (i === failingStepIndex) {
          defaultSteps[i].status = 'FAILED'
          defaultSteps[i].errorReason = 'Simulated step failure (e.g. Quota Exceeded or Card Declined)'
        } else {
          defaultSteps[i].status = 'PENDING'
        }
      }
    }

    return {
      sagaId: `mock-saga-${Date.now()}`,
      sagaName: 'CoursePurchaseAndEnrollmentSaga',
      overallStatus: isFailed ? 'ROLLED_BACK' : 'COMPLETED',
      steps: defaultSteps,
      compensationHistory,
      totalDurationMs: 100,
      cryptographicProof: 'mock-saga-sha256-proof-verified-e71ab08d',
    }
  },

  /**
   * Mock protocol comparison fallback
   */
  getMockComparison(): ProtocolComparisonResponse {
    return {
      protocols: {
        twoPhaseCommit: {
          name: 'Two-Phase Commit (2PC / XA)',
          consistencyModel: 'Strict Strong Consistency (ACID)',
          coordinationStyle: 'Centralized Coordinator with Blocking Locks',
          performanceCharacteristics: {
            latency: 'Higher (requires multiple round trips + synchronous disk flushes)',
            throughput: 'Limited by duration of exclusive lock holding',
            resourceLockDuration: 'Locks held from Phase 1 Prepare until Phase 2 Commit/Abort',
          },
          failureResilience: {
            coordinatorCrash: 'Blocks all participants holding locks until coordinator recovers',
            networkPartition: 'Partitions cannot commit; participants remain frozen/blocked',
            partialFailureRecovery: 'Any single participant rejection aborts the entire transaction',
          },
          recommendedUseCases: [
            'Core Financial Ledgers & Double-Entry Accounting',
            'Relational Multi-Table Partition Transactions',
            'Cross-Database Atomicity where isolation violations are unacceptable',
          ],
        },
        sagaOrchestration: {
          name: 'Saga Pattern (Choreography / Orchestration)',
          consistencyModel: 'Eventual Consistency (BASE)',
          coordinationStyle: 'Decoupled Orchestrator or Event-Driven Reactive Choreography',
          performanceCharacteristics: {
            latency: 'Lower per local step; asynchronous execution pipeline',
            throughput: 'High scalability; no distributed exclusive locks held',
            resourceLockDuration: 'Zero distributed locks; local transactions commit immediately',
          },
          failureResilience: {
            coordinatorCrash: 'Can resume from durable state machine store (Kafka, Temporal, Step Functions)',
            networkPartition: 'Steps queue independently with retry idempotency',
            partialFailureRecovery: 'Executes compensating actions in reverse order for committed steps',
          },
          recommendedUseCases: [
            'Long-Running Business Processes (Checkout -> Fulfillment -> Shipping)',
            'Polyglot Microservices across diverse databases and cloud boundaries',
            'High-Throughput E-Commerce & Course Enrollment systems',
          ],
        },
      },
      summaryVerdict:
        'Use 2PC for low-latency, strictly synchronized micro-transactions inside a tightly coupled VPC. Use Sagas for resilient, loosely coupled distributed workflows spanning microservices.',
    }
  },
}
