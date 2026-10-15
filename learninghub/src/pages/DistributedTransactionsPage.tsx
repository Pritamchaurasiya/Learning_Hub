import { useState, useEffect, useCallback, type FC } from 'react'
import {
  Layers,
  RotateCcw,
  Sparkles,
  GitMerge,
  ShieldCheck,
  Cpu,
  Database,
} from 'lucide-react'
import type {
  TransactionProtocol,
  TwoPhaseTransactionRecord,
  SagaExecutionRecord,
  ProtocolComparisonResponse,
} from '../types/distributedTransaction'
import { distributedTransactionService } from '../services/distributedTransactionService'
import { TwoPhaseCommitVisualizer } from '../components/transactions/TwoPhaseCommitVisualizer'
import { SagaTimelineOrchestrator } from '../components/transactions/SagaTimelineOrchestrator'
import { TransactionChaosControlPanel } from '../components/transactions/TransactionChaosControlPanel'
import { TransactionAuditScorecard } from '../components/transactions/TransactionAuditScorecard'

export const DistributedTransactionsPage: FC = () => {
  const [protocol, setProtocol] = useState<TransactionProtocol>('TWO_PHASE_COMMIT')
  const [twoPhaseRecord, setTwoPhaseRecord] = useState<TwoPhaseTransactionRecord | null>(null)
  const [sagaRecord, setSagaRecord] = useState<SagaExecutionRecord | null>(null)
  const [comparison, setComparison] = useState<ProtocolComparisonResponse | null>(null)
  const [isLoading, setIsLoading] = useState<boolean>(false)
  const [feedbackMessage, setFeedbackMessage] = useState<string | null>(null)

  const showNotification = (msg: string) => {
    setFeedbackMessage(msg)
    setTimeout(() => setFeedbackMessage(null), 4000)
  }

  // Initial simulation load on mount
  useEffect(() => {
    loadInitialData()
  }, [])

  const loadInitialData = async () => {
    setIsLoading(true)
    try {
      const [rec2PC, recSaga, compData] = await Promise.all([
        distributedTransactionService.execute2PC(),
        distributedTransactionService.executeSaga(),
        distributedTransactionService.getComparison(),
      ])
      setTwoPhaseRecord(rec2PC)
      setSagaRecord(recSaga)
      setComparison(compData)
    } catch (err) {
      console.error('Failed to load initial transaction states:', err)
    } finally {
      setIsLoading(false)
    }
  }

  const handleRun2PC = useCallback(
    async (params?: { failingParticipantId?: string; simulateCoordinatorCrash?: boolean }) => {
      setIsLoading(true)
      try {
        const record = await distributedTransactionService.execute2PC(params)
        setTwoPhaseRecord(record)
        if (params?.simulateCoordinatorCrash) {
          showNotification('Simulated Coordinator Crash: Participants blocked waiting for decision.')
        } else if (params?.failingParticipantId) {
          showNotification(`Simulated Abort from ${params.failingParticipantId}: Transaction rolled back.`)
        } else {
          showNotification('2PC Completed Successfully: All participants committed atomically.')
        }
      } catch (err) {
        console.error('2PC Execution error:', err)
        showNotification('Failed to execute 2PC simulation.')
      } finally {
        setIsLoading(false)
      }
    },
    []
  )

  const handleRunSaga = useCallback(async (params?: { failingStepIndex?: number }) => {
    setIsLoading(true)
    try {
      const record = await distributedTransactionService.executeSaga(params)
      setSagaRecord(record)
      if (params?.failingStepIndex !== undefined) {
        showNotification(
          `Saga Step ${params.failingStepIndex + 1} Failed: Executing backward compensating transactions.`
        )
      } else {
        showNotification('Saga Orchestrator Completed: All pipeline steps executed successfully.')
      }
    } catch (err) {
      console.error('Saga Execution error:', err)
      showNotification('Failed to execute Saga simulation.')
    } finally {
      setIsLoading(false)
    }
  }, [])

  const handleReset = async () => {
    await loadInitialData()
    showNotification('Reset distributed transaction coordinator state.')
  }

  const activeProof =
    protocol === 'TWO_PHASE_COMMIT'
      ? twoPhaseRecord?.cryptographicProof
      : sagaRecord?.cryptographicProof

  const protocolDisplayName =
    protocol === 'TWO_PHASE_COMMIT' ? 'Two-Phase Commit (2PC)' : 'Saga Orchestration'

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 p-4 sm:p-6 lg:p-8 space-y-8">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-6 border-b border-slate-800">
        <div>
          <div className="flex items-center gap-2.5 mb-1.5">
            <span className="p-2 rounded-xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-400">
              <GitMerge className="w-6 h-6" />
            </span>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white">
              Distributed Transaction Studio
            </h1>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-mono font-bold bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
              Milestone 32
            </span>
          </div>
          <p className="text-sm text-slate-400 max-w-2xl">
            Interactive dual-protocol engineering studio for simulating <strong>Two-Phase Commit (2PC)</strong> strict
            ACID locking, coordinator crashes, and <strong>Saga Pattern</strong> eventual consistency with backward
            compensations.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={handleReset}
            disabled={isLoading}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-slate-900 border border-slate-800 text-xs font-semibold text-slate-300 hover:text-white hover:bg-slate-800 transition-colors disabled:opacity-50"
          >
            <RotateCcw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
            Reset State
          </button>
        </div>
      </div>

      {/* Floating Action / Feedback Notification */}
      {feedbackMessage && (
        <div className="p-3.5 rounded-xl bg-indigo-950/90 border border-indigo-500/40 text-xs font-medium text-indigo-200 flex items-center gap-2 shadow-lg animate-in fade-in slide-in-from-top-2">
          <Sparkles className="w-4 h-4 text-indigo-400 shrink-0" />
          <span>{feedbackMessage}</span>
        </div>
      )}

      {/* Protocol Selector Tabs */}
      <div className="flex border-b border-slate-800 space-x-6">
        <button
          onClick={() => setProtocol('TWO_PHASE_COMMIT')}
          className={`pb-3 text-sm font-bold border-b-2 transition-colors flex items-center gap-2 ${
            protocol === 'TWO_PHASE_COMMIT'
              ? 'border-indigo-500 text-indigo-400'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <Database className="w-4 h-4" />
          Two-Phase Commit (2PC)
          {twoPhaseRecord && (
            <span
              className={`text-[10px] font-mono px-2 py-0.5 rounded-full ${
                twoPhaseRecord.finalVerdict === 'COMMITTED'
                  ? 'bg-emerald-950 text-emerald-400 border border-emerald-800'
                  : 'bg-rose-950 text-rose-400 border border-rose-800'
              }`}
            >
              {twoPhaseRecord.finalVerdict}
            </span>
          )}
        </button>

        <button
          onClick={() => setProtocol('SAGA_ORCHESTRATOR')}
          className={`pb-3 text-sm font-bold border-b-2 transition-colors flex items-center gap-2 ${
            protocol === 'SAGA_ORCHESTRATOR'
              ? 'border-indigo-500 text-indigo-400'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <Layers className="w-4 h-4" />
          Saga Orchestration
          {sagaRecord && (
            <span
              className={`text-[10px] font-mono px-2 py-0.5 rounded-full ${
                sagaRecord.overallStatus === 'COMPLETED'
                  ? 'bg-emerald-950 text-emerald-400 border border-emerald-800'
                  : 'bg-amber-950 text-amber-400 border border-amber-800'
              }`}
            >
              {sagaRecord.overallStatus}
            </span>
          )}
        </button>
      </div>

      {/* Chaos Control Panel */}
      <TransactionChaosControlPanel
        currentProtocol={protocol}
        onSelectProtocol={setProtocol}
        onRun2PC={handleRun2PC}
        onRunSaga={handleRunSaga}
        isLoading={isLoading}
      />

      {/* Primary Visualizer Workspace */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold text-white flex items-center gap-2">
            <Cpu className="w-5 h-5 text-indigo-400" />
            Active Protocol Topology & State Transition
          </h2>
          <span className="text-xs font-mono text-slate-400">
            Current Protocol: <strong className="text-indigo-300">{protocolDisplayName}</strong>
          </span>
        </div>

        {protocol === 'TWO_PHASE_COMMIT' ? (
          <TwoPhaseCommitVisualizer record={twoPhaseRecord} isLoading={isLoading} />
        ) : (
          <SagaTimelineOrchestrator record={sagaRecord} isLoading={isLoading} />
        )}
      </div>

      {/* Architectural Audit & Comparative Evaluation */}
      <div className="space-y-4 pt-4 border-t border-slate-800/80">
        <h2 className="text-lg font-bold text-white flex items-center gap-2">
          <ShieldCheck className="w-5 h-5 text-emerald-400" />
          Formal Verification & Trade-off Matrix
        </h2>
        <TransactionAuditScorecard
          comparison={comparison}
          currentProof={activeProof}
          protocolName={protocolDisplayName}
        />
      </div>
    </div>
  )
}

export { DistributedTransactionsPage as DistributedTransactionStudioPage }
export default DistributedTransactionsPage
