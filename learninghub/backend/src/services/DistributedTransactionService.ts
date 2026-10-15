import crypto from 'crypto'
import logger from '../utils/logger'

export type TransactionProtocol = 'TWO_PHASE_COMMIT' | 'SAGA_ORCHESTRATOR'

// --- 2PC (Two-Phase Commit) Types ---
export type TwoPhaseParticipantVote = 'VOTE_COMMIT' | 'VOTE_ABORT' | 'TIMEOUT' | 'CRASHED'
export type TwoPhaseFinalStatus = 'COMMITTED' | 'ABORTED' | 'BLOCKED_TIMEOUT'

export interface TwoPhaseParticipantState {
  id: string
  name: string
  serviceName: string
  status: 'IDLE' | 'PREPARED' | 'COMMITTED' | 'ABORTED' | 'LOCKED' | 'CRASHED'
  vote: TwoPhaseParticipantVote | null
  lockedResources: string[]
  latencyMs: number
}

export interface TwoPhaseTransactionRecord {
  transactionId: string
  coordinatorStatus: 'IDLE' | 'PREPARING' | 'DECIDING' | 'COMMITTING' | 'ABORTING' | 'DONE'
  finalVerdict: TwoPhaseFinalStatus
  participants: TwoPhaseParticipantState[]
  executionLog: Array<{
    phase: 'PHASE_1_PREPARE' | 'PHASE_2_DECISION' | 'AUDIT'
    source: string
    target: string
    message: string
    timestamp: string
  }>
  durationMs: number
  cryptographicProof: string
}

// --- SAGA Pattern Types ---
export type SagaStepStatus = 'PENDING' | 'RUNNING' | 'SUCCESS' | 'FAILED' | 'COMPENSATING' | 'COMPENSATED'

export interface SagaStepDefinition {
  stepIndex: number
  serviceName: string
  actionName: string
  compensationName: string
  status: SagaStepStatus
  payload: Record<string, any>
  errorReason?: string
  executionTimeMs: number
}

export interface SagaExecutionRecord {
  sagaId: string
  sagaName: string
  overallStatus: 'COMPLETED' | 'ROLLED_BACK' | 'FAILED'
  steps: SagaStepDefinition[]
  compensationHistory: Array<{
    compensatedStep: string
    compensationAction: string
    status: 'SUCCESS' | 'FAILED'
    timestamp: string
  }>
  totalDurationMs: number
  cryptographicProof: string
}

export class DistributedTransactionService {
  private secretKey: string = process.env.TRANSACTION_SECRET_KEY || 'learninghub-distributed-tx-key-v1'

  /**
   * Executes a simulated Two-Phase Commit (2PC) transaction.
   * Can inject participant aborts or crashes in Phase 1 to demonstrate atomic rollback.
   */
  public executeTwoPhaseCommit(params?: {
    failingParticipantId?: string
    simulateCoordinatorCrash?: boolean
  }): TwoPhaseTransactionRecord {
    const startTime = Date.now()
    const txId = `2pc-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`
    const failingId = params?.failingParticipantId

    const participants: TwoPhaseParticipantState[] = [
      {
        id: 'billing-db',
        name: 'Billing & Invoicing Store',
        serviceName: 'BillingService (PostgreSQL-1)',
        status: 'IDLE',
        vote: null,
        lockedResources: ['user_wallet_101', 'invoice_draft_902'],
        latencyMs: 14,
      },
      {
        id: 'enrollment-db',
        name: 'Course Enrollment Store',
        serviceName: 'EnrollmentService (PostgreSQL-2)',
        status: 'IDLE',
        vote: null,
        lockedResources: ['course_seat_cs301', 'student_grant_101'],
        latencyMs: 18,
      },
      {
        id: 'inventory-db',
        name: 'Digital Textbook License Store',
        serviceName: 'LicenseService (MySQL)',
        status: 'IDLE',
        vote: null,
        lockedResources: ['ebook_license_405'],
        latencyMs: 12,
      },
    ]

    const executionLog: TwoPhaseTransactionRecord['executionLog'] = []

    // --- PHASE 1: PREPARE (Voting) ---
    executionLog.push({
      phase: 'PHASE_1_PREPARE',
      source: 'Coordinator',
      target: 'ALL_PARTICIPANTS',
      message: 'Broadcasting PREPARE request to all resource managers',
      timestamp: new Date().toISOString(),
    })

    let allVotesCommit = true

    for (const p of participants) {
      if (failingId === p.id) {
        p.vote = 'VOTE_ABORT'
        p.status = 'ABORTED'
        allVotesCommit = false
        executionLog.push({
          phase: 'PHASE_1_PREPARE',
          source: p.id,
          target: 'Coordinator',
          message: `VOTE_ABORT: Resource conflict or constraint violation detected on ${p.name}`,
          timestamp: new Date().toISOString(),
        })
      } else {
        p.vote = 'VOTE_COMMIT'
        p.status = 'PREPARED'
        executionLog.push({
          phase: 'PHASE_1_PREPARE',
          source: p.id,
          target: 'Coordinator',
          message: `VOTE_COMMIT: Local transaction prepared and resources locked on ${p.name}`,
          timestamp: new Date().toISOString(),
        })
      }
    }

    // --- PHASE 2: GLOBAL COMMIT OR GLOBAL ABORT ---
    let finalVerdict: TwoPhaseFinalStatus

    if (params?.simulateCoordinatorCrash) {
      finalVerdict = 'BLOCKED_TIMEOUT'
      executionLog.push({
        phase: 'PHASE_2_DECISION',
        source: 'Coordinator',
        target: 'NONE',
        message: 'FATAL: Coordinator crashed before broadcasting Phase 2 decision. Participants remain BLOCKED.',
        timestamp: new Date().toISOString(),
      })
      for (const p of participants) {
        if (p.status === 'PREPARED') {
          p.status = 'LOCKED'
        }
      }
    } else if (allVotesCommit) {
      finalVerdict = 'COMMITTED'
      executionLog.push({
        phase: 'PHASE_2_DECISION',
        source: 'Coordinator',
        target: 'ALL_PARTICIPANTS',
        message: 'All participants voted COMMIT. Broadcasting GLOBAL_COMMIT decision.',
        timestamp: new Date().toISOString(),
      })
      for (const p of participants) {
        p.status = 'COMMITTED'
        executionLog.push({
          phase: 'PHASE_2_DECISION',
          source: p.id,
          target: 'Coordinator',
          message: `ACK: Committed local changes and released locks on ${p.name}`,
          timestamp: new Date().toISOString(),
        })
      }
    } else {
      finalVerdict = 'ABORTED'
      executionLog.push({
        phase: 'PHASE_2_DECISION',
        source: 'Coordinator',
        target: 'ALL_PARTICIPANTS',
        message: 'One or more participants voted ABORT. Broadcasting GLOBAL_ABORT decision.',
        timestamp: new Date().toISOString(),
      })
      for (const p of participants) {
        p.status = 'ABORTED'
        executionLog.push({
          phase: 'PHASE_2_DECISION',
          source: p.id,
          target: 'Coordinator',
          message: `ACK: Rolled back local changes and released locks on ${p.name}`,
          timestamp: new Date().toISOString(),
        })
      }
    }

    const durationMs = Math.max(12, Date.now() - startTime + 25)
    const proofRaw = JSON.stringify({ txId, finalVerdict, participants: participants.map(p => ({ id: p.id, vote: p.vote })) })
    const cryptographicProof = crypto.createHmac('sha256', this.secretKey).update(proofRaw).digest('hex')

    return {
      transactionId: txId,
      coordinatorStatus: 'DONE',
      finalVerdict,
      participants,
      executionLog,
      durationMs,
      cryptographicProof,
    }
  }

  /**
   * Executes a simulated Saga Orchestration transaction with backward compensating rollback.
   */
  public executeSagaWorkflow(params?: {
    failAtStepIndex?: number
  }): SagaExecutionRecord {
    const startTime = Date.now()
    const sagaId = `saga-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`
    const failStep = params?.failAtStepIndex ?? null

    const initialSteps: SagaStepDefinition[] = [
      {
        stepIndex: 1,
        serviceName: 'OrderService',
        actionName: 'CreatePendingOrder',
        compensationName: 'CancelOrder',
        status: 'PENDING',
        payload: { orderId: 'ord-892', amount: 4999, currency: 'USD' },
        executionTimeMs: 15,
      },
      {
        stepIndex: 2,
        serviceName: 'PaymentService',
        actionName: 'CaptureStripePayment',
        compensationName: 'RefundStripePayment',
        status: 'PENDING',
        payload: { paymentIntentId: 'pi_3M9q4A', cardBrand: 'Visa' },
        executionTimeMs: 28,
      },
      {
        stepIndex: 3,
        serviceName: 'EnrollmentService',
        actionName: 'GrantCourseAccess',
        compensationName: 'RevokeCourseAccess',
        status: 'PENDING',
        payload: { courseId: 'cs-distributed-raft', licenseType: 'ACADEMIC_PRO' },
        executionTimeMs: 22,
      },
      {
        stepIndex: 4,
        serviceName: 'NotificationService',
        actionName: 'DispatchWelcomeEmail',
        compensationName: 'DispatchCancellationNotice',
        status: 'PENDING',
        payload: { recipient: 'learner@learninghub.app', template: 'PRO_ENROLLMENT' },
        executionTimeMs: 12,
      },
    ]

    const compensationHistory: SagaExecutionRecord['compensationHistory'] = []
    let failedIndex: number | null = null

    // Forward Execution
    for (let i = 0; i < initialSteps.length; i++) {
      const step = initialSteps[i]
      if (failStep !== null && step.stepIndex === failStep) {
        step.status = 'FAILED'
        step.errorReason = `Simulated domain failure at Step ${step.stepIndex} (${step.serviceName}): Quota or payment authorization rejected`
        failedIndex = i
        break
      } else {
        step.status = 'SUCCESS'
      }
    }

    let overallStatus: SagaExecutionRecord['overallStatus'] = 'COMPLETED'

    // If a step failed, execute backward compensating transactions
    if (failedIndex !== null) {
      overallStatus = 'ROLLED_BACK'
      logger.info(`Saga ${sagaId} failed at step ${failedIndex + 1}. Initiating compensating transactions...`)

      for (let j = failedIndex - 1; j >= 0; j--) {
        const stepToCompensate = initialSteps[j]
        stepToCompensate.status = 'COMPENSATING'

        // Simulate compensation
        compensationHistory.push({
          compensatedStep: stepToCompensate.actionName,
          compensationAction: stepToCompensate.compensationName,
          status: 'SUCCESS',
          timestamp: new Date().toISOString(),
        })

        stepToCompensate.status = 'COMPENSATED'
      }
    }

    const totalDurationMs = Math.max(30, Date.now() - startTime + initialSteps.reduce((acc, s) => acc + s.executionTimeMs, 0))
    const proofRaw = JSON.stringify({ sagaId, overallStatus, steps: initialSteps.map(s => ({ idx: s.stepIndex, status: s.status })) })
    const cryptographicProof = crypto.createHmac('sha256', this.secretKey).update(proofRaw).digest('hex')

    return {
      sagaId,
      sagaName: 'CourseSubscriptionCheckoutSaga',
      overallStatus,
      steps: initialSteps,
      compensationHistory,
      totalDurationMs,
      cryptographicProof,
    }
  }

  /**
   * Returns metadata and comparative analysis between 2PC and Saga.
   */
  public getProtocolComparison(): {
    protocols: Array<{
      id: TransactionProtocol
      title: string
      consistencyModel: string
      performanceProfile: string
      lockingBehavior: string
      faultTolerance: string
      bestSuitedFor: string
    }>
  } {
    return {
      protocols: [
        {
          id: 'TWO_PHASE_COMMIT',
          title: 'Two-Phase Commit (2PC)',
          consistencyModel: 'Strict ACID / Immediate Consistency',
          performanceProfile: 'High Latency (Multiple synchronous network rounds)',
          lockingBehavior: 'Pessimistic Locking (Resources held until Phase 2 decision)',
          faultTolerance: 'Blocking on Coordinator failure without termination protocols',
          bestSuitedFor: 'Core banking ledgers, critical inventory transfers, single-datacenter databases',
        },
        {
          id: 'SAGA_ORCHESTRATOR',
          title: 'Saga Pattern (Compensating Transactions)',
          consistencyModel: 'BASE / Eventual Consistency',
          performanceProfile: 'Low Latency (Local transactions commit asynchronously)',
          lockingBehavior: 'Lock-Free (No distributed locks; semantic compensation on abort)',
          faultTolerance: 'Non-blocking; orchestrator or event choreography drives state machine',
          bestSuitedFor: 'Cross-service e-commerce checkouts, subscription provisioning, multi-cloud microservices',
        },
      ],
    }
  }
}

export const distributedTransactionService = new DistributedTransactionService()
