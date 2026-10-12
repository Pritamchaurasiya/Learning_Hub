import React from 'react'
import { CanaryRelease, RolloutStage } from '../../types/canary'
import { Check, GitCommit, GitPullRequest, Globe2, ShieldCheck, XCircle } from 'lucide-react'

interface CanaryPipelineStepperProps {
  deployment: CanaryRelease
  onAdvanceStage?: () => void
  onRollback?: () => void
}

const STAGES: Array<{ id: RolloutStage; label: string; percent: string }> = [
  { id: 'PREFLIGHT_HEALTH', label: 'Pre-flight Check', percent: '0%' },
  { id: 'CANARY_10_PERCENT', label: 'Canary Tier 1', percent: '10%' },
  { id: 'CANARY_25_PERCENT', label: 'Canary Tier 2', percent: '25%' },
  { id: 'CANARY_50_PERCENT', label: 'Parity Load', percent: '50%' },
  { id: 'FULL_PROMOTION', label: 'Production', percent: '100%' },
]

export const CanaryPipelineStepper: React.FC<CanaryPipelineStepperProps> = ({
  deployment,
  onAdvanceStage,
  onRollback,
}) => {
  const currentStageIndex = STAGES.findIndex(s => s.id === deployment.stage)
  const isRolledBack = deployment.stage === 'ROLLED_BACK'
  const isPromoted = deployment.stage === 'FULL_PROMOTION'

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-xl">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 mb-6">
        <div>
          <div className="flex items-center gap-2">
            <h3 className="text-base font-semibold text-white">
              Progressive Delivery Staircase Pipeline
            </h3>
            <span className="px-2 py-0.5 text-xs font-mono rounded bg-slate-800 text-slate-300 border border-slate-700">
              {deployment.serviceName}
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-0.5">
            Automated progressive stepping with error budget & latency guardrails
          </p>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2">
          {!isRolledBack && !isPromoted && (
            <>
              <button
                type="button"
                onClick={onAdvanceStage}
                className="px-3.5 py-1.5 text-xs font-semibold rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white transition-colors shadow-sm flex items-center gap-1.5"
              >
                Advance Stage &rarr;
              </button>
              <button
                type="button"
                onClick={onRollback}
                className="px-3.5 py-1.5 text-xs font-semibold rounded-lg bg-rose-600 hover:bg-rose-500 text-white transition-colors shadow-sm flex items-center gap-1.5"
              >
                Emergency Rollback
              </button>
            </>
          )}
        </div>
      </div>

      {/* Stepper Graphic */}
      <div className="relative flex items-center justify-between w-full mb-6 px-2">
        {/* Connecting line */}
        <div className="absolute top-1/2 left-0 right-0 h-1 bg-slate-800 -translate-y-1/2 z-0" />
        <div
          style={{
            width: isRolledBack
              ? '100%'
              : `${Math.max(0, (currentStageIndex / (STAGES.length - 1)) * 100)}%`,
          }}
          className={`absolute top-1/2 left-0 h-1 -translate-y-1/2 z-0 transition-all duration-500 ${
            isRolledBack ? 'bg-rose-600' : 'bg-indigo-500'
          }`}
        />

        {STAGES.map((step, idx) => {
          const isPassed = !isRolledBack && currentStageIndex > idx
          const isCurrent = !isRolledBack && currentStageIndex === idx

          return (
            <div key={step.id} className="relative z-10 flex flex-col items-center">
              <div
                className={`w-9 h-9 rounded-full flex items-center justify-center font-mono text-xs font-bold transition-all shadow-md ${
                  isPassed
                    ? 'bg-emerald-600 text-white border-2 border-emerald-400 ring-4 ring-emerald-950'
                    : isCurrent
                    ? 'bg-indigo-600 text-white border-2 border-indigo-400 ring-4 ring-indigo-950 animate-pulse'
                    : 'bg-slate-800 text-slate-400 border border-slate-700'
                }`}
              >
                {isPassed ? <Check className="w-4 h-4 text-white" /> : step.percent}
              </div>
              <span
                className={`mt-2 text-xs font-medium ${
                  isCurrent
                    ? 'text-indigo-300 font-bold'
                    : isPassed
                    ? 'text-emerald-400'
                    : 'text-slate-400'
                }`}
              >
                {step.label}
              </span>
            </div>
          )
        })}
      </div>

      {/* Rolled back banner if applicable */}
      {isRolledBack && (
        <div
          data-testid="rollback-status-banner"
          className="p-3 mb-4 rounded-lg bg-rose-950/70 border border-rose-800 flex items-center gap-2 text-rose-300 text-xs font-medium"
        >
          <XCircle className="w-4 h-4 text-rose-400 flex-shrink-0" />
          <span>
            Deployment aborted. Traffic immediately reverted to baseline (
            <strong>{deployment.previousVersion}</strong>) with zero downtime.
          </span>
        </div>
      )}

      {/* GitOps & Cryptographic Provenance Bar */}
      <div className="pt-4 border-t border-slate-800 grid grid-cols-2 md:grid-cols-4 gap-3 text-xs">
        <div className="flex items-center gap-1.5 text-slate-400">
          <GitCommit className="w-3.5 h-3.5 text-blue-400 flex-shrink-0" />
          <span className="truncate">Commit: <strong className="text-slate-300 font-mono">{deployment.gitCommitHash}</strong></span>
        </div>
        <div className="flex items-center gap-1.5 text-slate-400">
          <GitPullRequest className="w-3.5 h-3.5 text-purple-400 flex-shrink-0" />
          <span className="truncate">Version: <strong className="text-slate-300 font-mono">{deployment.version}</strong></span>
        </div>
        <div className="flex items-center gap-1.5 text-slate-400">
          <Globe2 className="w-3.5 h-3.5 text-emerald-400 flex-shrink-0" />
          <span className="truncate">Region: <strong className="text-slate-300 font-mono">{deployment.region}</strong></span>
        </div>
        <div className="flex items-center gap-1.5 text-slate-400">
          <ShieldCheck className="w-3.5 h-3.5 text-amber-400 flex-shrink-0" />
          <span className="truncate">Signed: <strong className="text-slate-300 font-mono">{deployment.provenanceAttestation.signedDigest.substring(0, 10)}...</strong></span>
        </div>
      </div>
    </div>
  )
}
