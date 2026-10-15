import { useState } from 'react'
import type { FC } from 'react'
import {
  Play,
  Flame,
  ZapOff,
  CheckCircle2,
  Layers,
  Database,
  RotateCcw,
} from 'lucide-react'
import type { TransactionProtocol } from '../../types/distributedTransaction'

interface TransactionChaosControlPanelProps {
  currentProtocol: TransactionProtocol
  onSelectProtocol: (protocol: TransactionProtocol) => void
  onRun2PC: (params?: { failingParticipantId?: string; simulateCoordinatorCrash?: boolean }) => void
  onRunSaga: (params?: { failingStepIndex?: number }) => void
  isLoading?: boolean
}

export const TransactionChaosControlPanel: FC<TransactionChaosControlPanelProps> = ({
  currentProtocol,
  onSelectProtocol,
  onRun2PC,
  onRunSaga,
  isLoading = false,
}) => {
  const [selected2PCFailNode, setSelected2PCFailNode] = useState<string>('enrollment-db')
  const [selectedSagaFailStep, setSelectedSagaFailStep] = useState<number>(2)

  return (
    <div className="p-5 bg-slate-900/80 border border-slate-800 rounded-xl space-y-5">
      {/* Protocol Toggle */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-800">
        <div>
          <h3 className="text-sm font-bold text-slate-100 flex items-center gap-2">
            <Flame className="w-4 h-4 text-amber-400" />
            Distributed Transaction Chaos Controller
          </h3>
          <p className="text-xs text-slate-400 mt-0.5">
            Inject real-world network partitions, participant aborts, and coordinator failures
          </p>
        </div>

        <div className="flex items-center gap-1.5 p-1 bg-slate-950 rounded-lg border border-slate-800 self-start sm:self-auto">
          <button
            onClick={() => onSelectProtocol('TWO_PHASE_COMMIT')}
            className={`px-3 py-1.5 rounded-md text-xs font-mono font-medium transition-all flex items-center gap-1.5 ${
              currentProtocol === 'TWO_PHASE_COMMIT'
                ? 'bg-indigo-600 text-white shadow-sm'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Database className="w-3.5 h-3.5" />
            Two-Phase Commit (2PC)
          </button>
          <button
            onClick={() => onSelectProtocol('SAGA_ORCHESTRATOR')}
            className={`px-3 py-1.5 rounded-md text-xs font-mono font-medium transition-all flex items-center gap-1.5 ${
              currentProtocol === 'SAGA_ORCHESTRATOR'
                ? 'bg-purple-600 text-white shadow-sm'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            Saga Orchestrator
          </button>
        </div>
      </div>

      {/* 2PC Controls */}
      {currentProtocol === 'TWO_PHASE_COMMIT' && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Happy Path */}
          <div className="p-3.5 bg-slate-950/70 rounded-lg border border-emerald-900/40 flex flex-col justify-between">
            <div>
              <div className="flex items-center gap-2 text-xs font-mono font-bold text-emerald-400 mb-1">
                <CheckCircle2 className="w-4 h-4" />
                Scenario 1: Happy Path Commit
              </div>
              <p className="text-[11px] text-slate-400">
                All 3 participants prepare successfully. Coordinator broadcasts GLOBAL_COMMIT.
              </p>
            </div>
            <button
              disabled={isLoading}
              onClick={() => onRun2PC()}
              className="mt-3 w-full inline-flex items-center justify-center gap-1.5 px-3 py-2 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white rounded-lg text-xs font-mono font-medium transition-all shadow-sm"
            >
              <Play className="w-3.5 h-3.5" />
              Execute 2PC Commit
            </button>
          </div>

          {/* Participant Abort */}
          <div className="p-3.5 bg-slate-950/70 rounded-lg border border-rose-900/40 flex flex-col justify-between">
            <div>
              <div className="flex items-center gap-2 text-xs font-mono font-bold text-rose-400 mb-1">
                <ZapOff className="w-4 h-4" />
                Scenario 2: Participant Abort
              </div>
              <p className="text-[11px] text-slate-400 mb-2">
                Simulates resource conflict or constraint failure in Phase 1 voting.
              </p>
              <select
                value={selected2PCFailNode}
                onChange={(e) => setSelected2PCFailNode(e.target.value)}
                className="w-full bg-slate-900 border border-slate-700 rounded px-2 py-1 text-xs font-mono text-slate-200 focus:outline-none focus:border-rose-500"
              >
                <option value="billing-db">Billing DB (Wallet insufficient)</option>
                <option value="enrollment-db">Enrollment DB (Seat occupied)</option>
                <option value="inventory-db">License DB (Out of licenses)</option>
              </select>
            </div>
            <button
              disabled={isLoading}
              onClick={() => onRun2PC({ failingParticipantId: selected2PCFailNode })}
              className="mt-3 w-full inline-flex items-center justify-center gap-1.5 px-3 py-2 bg-rose-600 hover:bg-rose-500 disabled:opacity-50 text-white rounded-lg text-xs font-mono font-medium transition-all shadow-sm"
            >
              <ZapOff className="w-3.5 h-3.5" />
              Trigger Participant Abort
            </button>
          </div>

          {/* Coordinator Crash */}
          <div className="p-3.5 bg-slate-950/70 rounded-lg border border-amber-900/40 flex flex-col justify-between">
            <div>
              <div className="flex items-center gap-2 text-xs font-mono font-bold text-amber-400 mb-1">
                <Flame className="w-4 h-4" />
                Scenario 3: Coordinator Crash
              </div>
              <p className="text-[11px] text-slate-400">
                Coordinator dies after Phase 1. Participants are BLOCKED holding exclusive row locks!
              </p>
            </div>
            <button
              disabled={isLoading}
              onClick={() => onRun2PC({ simulateCoordinatorCrash: true })}
              className="mt-3 w-full inline-flex items-center justify-center gap-1.5 px-3 py-2 bg-amber-600 hover:bg-amber-500 disabled:opacity-50 text-white rounded-lg text-xs font-mono font-medium transition-all shadow-sm"
            >
              <Flame className="w-3.5 h-3.5" />
              Crash Coordinator (Lock Block)
            </button>
          </div>
        </div>
      )}

      {/* SAGA Controls */}
      {currentProtocol === 'SAGA_ORCHESTRATOR' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Forward Success */}
          <div className="p-3.5 bg-slate-950/70 rounded-lg border border-emerald-900/40 flex flex-col justify-between">
            <div>
              <div className="flex items-center gap-2 text-xs font-mono font-bold text-emerald-400 mb-1">
                <CheckCircle2 className="w-4 h-4" />
                Scenario 1: End-to-End Saga Completion
              </div>
              <p className="text-[11px] text-slate-400">
                Order creation &rarr; Payment capture &rarr; Course enrollment &rarr; Receipt dispatch.
                No distributed exclusive locks held at any point.
              </p>
            </div>
            <button
              disabled={isLoading}
              onClick={() => onRunSaga()}
              className="mt-3 w-full inline-flex items-center justify-center gap-1.5 px-3 py-2 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white rounded-lg text-xs font-mono font-medium transition-all shadow-sm"
            >
              <Play className="w-3.5 h-3.5" />
              Execute Complete Saga
            </button>
          </div>

          {/* Saga Compensation Rollback */}
          <div className="p-3.5 bg-slate-950/70 rounded-lg border border-purple-900/40 flex flex-col justify-between">
            <div>
              <div className="flex items-center gap-2 text-xs font-mono font-bold text-purple-400 mb-1">
                <RotateCcw className="w-4 h-4" />
                Scenario 2: Mid-Pipeline Failure &amp; Compensation
              </div>
              <p className="text-[11px] text-slate-400 mb-2">
                Simulate failure at any stage to observe LIFO reverse compensating actions.
              </p>
              <select
                value={selectedSagaFailStep}
                onChange={(e) => setSelectedSagaFailStep(parseInt(e.target.value, 10))}
                className="w-full bg-slate-900 border border-slate-700 rounded px-2 py-1 text-xs font-mono text-slate-200 focus:outline-none focus:border-purple-500"
              >
                <option value={1}>Step 2: Payment Gateway Declined</option>
                <option value={2}>Step 3: Course Enrollment Full (Quota Exceeded)</option>
                <option value={3}>Step 4: Notification Service Down</option>
              </select>
            </div>
            <button
              disabled={isLoading}
              onClick={() => onRunSaga({ failingStepIndex: selectedSagaFailStep })}
              className="mt-3 w-full inline-flex items-center justify-center gap-1.5 px-3 py-2 bg-purple-600 hover:bg-purple-500 disabled:opacity-50 text-white rounded-lg text-xs font-mono font-medium transition-all shadow-sm"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              Simulate Failure &amp; Rollback
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
