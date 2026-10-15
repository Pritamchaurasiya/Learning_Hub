import { useState, useEffect, type FC } from 'react'
import {
  Database,
  Layers,
  AlertTriangle,
  GitFork,
  BookOpen,
  Sparkles,
  RefreshCw,
} from 'lucide-react'
import type {
  MvccStateResponse,
  WriteSkewSimulationResult,
  DeadlockDetectionResult,
  IsolationComparisonResponse,
} from '../types/mvccDeadlock'
import { mvccDeadlockService } from '../services/mvccDeadlockService'
import { MvccVersionChainVisualizer } from '../components/concurrency/MvccVersionChainVisualizer'
import { WriteSkewAnomalySandbox } from '../components/concurrency/WriteSkewAnomalySandbox'
import { WaitForGraphDeadlockHUD } from '../components/concurrency/WaitForGraphDeadlockHUD'
import { IsolationLevelAuditCard } from '../components/concurrency/IsolationLevelAuditCard'

export const MvccDeadlockStudioPage: FC = () => {
  const [activeTab, setActiveTab] = useState<'MVCC' | 'WRITE_SKEW' | 'DEADLOCK'>('MVCC')
  const [mvccState, setMvccState] = useState<MvccStateResponse | null>(null)
  const [writeSkewResult, setWriteSkewResult] = useState<WriteSkewSimulationResult | null>(null)
  const [writeSkewProtocol, setWriteSkewProtocol] = useState<'SNAPSHOT_ISOLATION' | 'SERIALIZABLE_SSI'>('SNAPSHOT_ISOLATION')
  const [deadlockResult, setDeadlockResult] = useState<DeadlockDetectionResult | null>(null)
  const [deadlockScenario, setDeadlockScenario] = useState<'TWO_NODE_CYCLE' | 'THREE_NODE_CYCLE' | 'NO_DEADLOCK'>('TWO_NODE_CYCLE')
  const [victimPolicy, setVictimPolicy] = useState<'YOUNGEST' | 'LEAST_LOCKS' | 'LEAST_PRIORITY'>('YOUNGEST')
  const [comparison, setComparison] = useState<IsolationComparisonResponse | null>(null)
  const [isLoading, setIsLoading] = useState<boolean>(false)
  const [feedback, setFeedback] = useState<string | null>(null)

  useEffect(() => {
    initStudio()
  }, [])

  const initStudio = async () => {
    setIsLoading(true)
    try {
      const [mvccData, skewData, dlData, compData] = await Promise.all([
        mvccDeadlockService.getMvccState(),
        mvccDeadlockService.simulateWriteSkew(writeSkewProtocol),
        mvccDeadlockService.detectDeadlock({ scenario: deadlockScenario, victimPolicy }),
        mvccDeadlockService.getIsolationComparison(),
      ])
      setMvccState(mvccData)
      setWriteSkewResult(skewData)
      setDeadlockResult(dlData)
      setComparison(compData)
    } catch {
      setMvccState(mvccDeadlockService.getMockMvccState())
      setWriteSkewResult(mvccDeadlockService.getMockWriteSkew(writeSkewProtocol))
      setDeadlockResult(mvccDeadlockService.getMockDeadlock(deadlockScenario, victimPolicy))
      setComparison(mvccDeadlockService.getMockIsolationComparison())
    } finally {
      setIsLoading(false)
    }
  }

  const handleRunWriteSkew = async (protocol: 'SNAPSHOT_ISOLATION' | 'SERIALIZABLE_SSI') => {
    setIsLoading(true)
    try {
      const res = await mvccDeadlockService.simulateWriteSkew(protocol)
      setWriteSkewResult(res)
      if (res.anomalyDetected) {
        setFeedback('Write Skew anomaly confirmed under Snapshot Isolation! (0 doctors on call)')
      } else {
        setFeedback('Serializable SSI prevented Write Skew by aborting Tx 202 on rw-antidependency cycle.')
      }
    } catch {
      setFeedback('Error running Write Skew simulation')
    } finally {
      setIsLoading(false)
      setTimeout(() => setFeedback(null), 4000)
    }
  }

  const handleRunDeadlock = async () => {
    setIsLoading(true)
    try {
      const res = await mvccDeadlockService.detectDeadlock({
        scenario: deadlockScenario,
        victimPolicy,
      })
      setDeadlockResult(res)
      if (res.victimTxId) {
        setFeedback(`Deadlock cycle broken! Tx #${res.victimTxId} was aborted to free locks.`)
      } else {
        setFeedback('No deadlock detected in Wait-For Graph (DAG topological sort successful).')
      }
    } catch {
      setFeedback('Error executing deadlock cycle analysis')
    } finally {
      setIsLoading(false)
      setTimeout(() => setFeedback(null), 4000)
    }
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 p-6 max-w-7xl mx-auto space-y-6">
      {/* Studio Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-6 border-b border-slate-800">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="px-2.5 py-0.5 rounded text-xs font-mono font-semibold bg-cyan-950 text-cyan-300 border border-cyan-800">
              Milestone 33
            </span>
            <span className="px-2.5 py-0.5 rounded text-xs font-mono font-semibold bg-rose-950 text-rose-300 border border-rose-800 flex items-center gap-1">
              <Sparkles className="w-3 h-3" />
              Storage Engine Lab
            </span>
          </div>
          <h1 className="text-2xl md:text-3xl font-extrabold text-slate-100 tracking-tight flex items-center gap-3">
            <Database className="w-7 h-7 text-cyan-400" />
            MVCC &amp; Distributed Deadlock Detection Studio
          </h1>
          <p className="text-sm text-slate-400 mt-1 max-w-3xl">
            Inspect Multi-Version Concurrency Control (xmin/xmax heap tuples), reproduce Snapshot
            Isolation Write Skew anomalies, and resolve circular lock deadlocks via Tarjan&apos;s Wait-For Graph.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={initStudio}
            disabled={isLoading}
            className="px-3.5 py-2 bg-slate-900 hover:bg-slate-800 disabled:opacity-50 text-slate-200 border border-slate-700 rounded-lg text-xs font-mono font-medium flex items-center gap-2 transition-all shadow-sm"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
            Reset State
          </button>
        </div>
      </div>

      {/* Feedback Banner */}
      {feedback && (
        <div className="p-3 bg-cyan-950/70 border border-cyan-700 rounded-lg text-xs font-mono text-cyan-200 animate-fadeIn flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-cyan-400 shrink-0" />
          <span>{feedback}</span>
        </div>
      )}

      {/* Systems Architecture Concept Card */}
      <div className="p-5 bg-slate-900/60 border border-slate-800 rounded-xl space-y-4">
        <div className="flex items-center gap-2 text-sm font-bold text-slate-200">
          <BookOpen className="w-4 h-4 text-cyan-400" />
          Systems Engineering Deep Dive: Concurrency Control &amp; Deadlock Invariants
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs text-slate-300">
          {/* MVCC */}
          <div className="p-3.5 rounded-lg bg-slate-950/60 border border-slate-800/80 space-y-2">
            <h4 className="font-bold text-cyan-300 flex items-center gap-1.5">
              <Layers className="w-3.5 h-3.5" />
              1. MVCC Tuple Visibility
            </h4>
            <p className="text-slate-400 leading-relaxed">
              Updates do not overwrite in place. PostgreSQL/InnoDB creates a new tuple with{' '}
              <code className="text-cyan-300">xmin=currentTx</code> and marks the predecessor with{' '}
              <code className="text-cyan-300">xmax=currentTx</code>. Readers read past committed snapshots
              without blocking writers.
            </p>
          </div>

          {/* Write Skew */}
          <div className="p-3.5 rounded-lg bg-slate-950/60 border border-slate-800/80 space-y-2">
            <h4 className="font-bold text-amber-300 flex items-center gap-1.5">
              <AlertTriangle className="w-3.5 h-3.5" />
              2. Write Skew &amp; SSI
            </h4>
            <p className="text-slate-400 leading-relaxed">
              Snapshot Isolation prevents dirty &amp; phantom reads but allows <strong>Write Skew</strong>{' '}
              when disjoint writes depend on overlapping reads. Serializable Snapshot Isolation (SSI) detects
              these rw-antidependency cycles in memory and aborts one transaction.
            </p>
          </div>

          {/* Wait-For Graph */}
          <div className="p-3.5 rounded-lg bg-slate-950/60 border border-slate-800/80 space-y-2">
            <h4 className="font-bold text-rose-300 flex items-center gap-1.5">
              <GitFork className="w-3.5 h-3.5" />
              3. Tarjan Deadlock Resolution
            </h4>
            <p className="text-slate-400 leading-relaxed">
              In heavy lock contention, mutual circular waits form a cycle ($T_1 \to T_2 \to T_1$).
              Tarjan&apos;s SCC algorithm finds cycles in $O(V+E)$ time. The lock manager selects a victim
              (e.g. youngest or lowest priority) to abort and release locks.
            </p>
          </div>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="flex border-b border-slate-800 space-x-6 text-xs font-mono">
        <button
          onClick={() => setActiveTab('MVCC')}
          className={`pb-3 text-sm font-bold border-b-2 transition-colors flex items-center gap-2 ${
            activeTab === 'MVCC'
              ? 'border-cyan-500 text-cyan-400'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <Database className="w-4 h-4" />
          MVCC Version Chains &amp; Visibility
        </button>

        <button
          onClick={() => setActiveTab('WRITE_SKEW')}
          className={`pb-3 text-sm font-bold border-b-2 transition-colors flex items-center gap-2 ${
            activeTab === 'WRITE_SKEW'
              ? 'border-purple-500 text-purple-400'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <AlertTriangle className="w-4 h-4" />
          Write Skew Anomaly Lab
        </button>

        <button
          onClick={() => setActiveTab('DEADLOCK')}
          className={`pb-3 text-sm font-bold border-b-2 transition-colors flex items-center gap-2 ${
            activeTab === 'DEADLOCK'
              ? 'border-rose-500 text-rose-400'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <GitFork className="w-4 h-4" />
          Wait-For Graph &amp; Deadlocks
        </button>
      </div>

      {/* Active Tab Workspace */}
      <div className="space-y-6">
        {activeTab === 'MVCC' && (
          <MvccVersionChainVisualizer state={mvccState} isLoading={isLoading} />
        )}

        {activeTab === 'WRITE_SKEW' && (
          <WriteSkewAnomalySandbox
            result={writeSkewResult}
            currentProtocol={writeSkewProtocol}
            onSelectProtocol={setWriteSkewProtocol}
            onRunSimulation={handleRunWriteSkew}
            isLoading={isLoading}
          />
        )}

        {activeTab === 'DEADLOCK' && (
          <WaitForGraphDeadlockHUD
            result={deadlockResult}
            currentScenario={deadlockScenario}
            currentPolicy={victimPolicy}
            onSelectScenario={setDeadlockScenario}
            onSelectPolicy={setVictimPolicy}
            onRunDetection={handleRunDeadlock}
            isLoading={isLoading}
          />
        )}
      </div>

      {/* Concurrency Isolation Audit Card */}
      <IsolationLevelAuditCard
        comparison={comparison}
        currentProof={
          activeTab === 'WRITE_SKEW'
            ? writeSkewResult?.cryptographicProof
            : deadlockResult?.cryptographicProof
        }
      />
    </div>
  )
}

export default MvccDeadlockStudioPage
