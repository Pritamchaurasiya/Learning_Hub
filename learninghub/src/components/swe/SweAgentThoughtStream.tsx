import React, { useState } from 'react'
import {
  CheckCircle2,
  Clock,
  Compass,
  FileCheck,
  GitPullRequest,
  Search,
  Wrench,
  ChevronDown,
  ChevronUp,
} from 'lucide-react'
import { SweAgentThoughtStep, SweAgentStepName } from '../../types/sweStudio'

interface SweAgentThoughtStreamProps {
  steps: SweAgentThoughtStep[]
  activeStep?: SweAgentStepName
}

export const SweAgentThoughtStream: React.FC<SweAgentThoughtStreamProps> = ({ steps }) => {
  const [expandedStep, setExpandedStep] = useState<number | null>(null)

  const getStepIcon = (stepName: SweAgentStepName) => {
    switch (stepName) {
      case 'INGESTION_AND_TRIAGE':
        return <Search className="w-4 h-4 text-sky-400" />
      case 'FAULT_LOCALIZATION':
        return <Compass className="w-4 h-4 text-purple-400" />
      case 'REPRODUCTION_TEST_SYNTHESIS':
        return <FileCheck className="w-4 h-4 text-amber-400" />
      case 'PATCH_GENERATION':
        return <Wrench className="w-4 h-4 text-blue-400" />
      case 'REGRESSION_AND_VERIFICATION':
        return <CheckCircle2 className="w-4 h-4 text-emerald-400" />
      case 'PR_SYNTHESIS':
        return <GitPullRequest className="w-4 h-4 text-indigo-400" />
      default:
        return <CheckCircle2 className="w-4 h-4 text-slate-400" />
    }
  }

  const toggleExpand = (index: number) => {
    setExpandedStep(expandedStep === index ? null : index)
  }

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-lg space-y-4">
      <div className="flex items-center justify-between border-b border-slate-800 pb-3">
        <h4 className="text-sm font-bold text-slate-200 flex items-center gap-2">
          <Compass className="w-4 h-4 text-indigo-400" />
          Autonomous Agent Execution Stream
        </h4>
        <span className="text-xs text-slate-400 font-mono">
          {steps.filter(s => s.status === 'COMPLETED').length}/{steps.length} Phases Completed
        </span>
      </div>

      <div className="space-y-3 relative before:absolute before:left-3.5 before:top-4 before:bottom-4 before:w-0.5 before:bg-slate-800">
        {steps.map((step, idx) => {
          const isExpanded = expandedStep === idx
          return (
            <div key={step.step} className="relative pl-8 group">
              <div className="absolute left-1.5 top-2 -translate-x-1/2 w-4 h-4 rounded-full bg-slate-900 border-2 border-indigo-500 flex items-center justify-center">
                <div className="w-1.5 h-1.5 rounded-full bg-indigo-400" />
              </div>

              <div className="bg-slate-950/80 border border-slate-800/80 rounded-lg p-3 hover:border-slate-700 transition-colors">
                <div
                  className="flex items-center justify-between cursor-pointer"
                  onClick={() => toggleExpand(idx)}
                >
                  <div className="flex items-center gap-2.5">
                    <div className="p-1 rounded bg-slate-900 border border-slate-800">
                      {getStepIcon(step.step)}
                    </div>
                    <div>
                      <div className="text-sm font-semibold text-slate-200">{step.title}</div>
                      <div className="text-xs text-slate-400 mt-0.5">{step.summary}</div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <span className="flex items-center gap-1 text-[11px] font-mono text-slate-500 bg-slate-900 px-2 py-0.5 rounded border border-slate-800">
                      <Clock className="w-3 h-3" />
                      {step.durationMs}ms
                    </span>
                    <button
                      type="button"
                      aria-label="Toggle details"
                      className="text-slate-400 hover:text-slate-200"
                    >
                      {isExpanded ? (
                        <ChevronUp className="w-4 h-4" />
                      ) : (
                        <ChevronDown className="w-4 h-4" />
                      )}
                    </button>
                  </div>
                </div>

                {isExpanded && step.details && step.details.length > 0 && (
                  <div className="mt-3 pt-3 border-t border-slate-800/60 space-y-1.5">
                    {step.details.map((detail, dIdx) => (
                      <div
                        key={dIdx}
                        className="text-xs text-slate-300 font-mono bg-slate-900/60 px-2.5 py-1 rounded border border-slate-800/40"
                      >
                        {detail}
                      </div>
                    ))}
                    {step.metrics && (
                      <div className="flex flex-wrap gap-2 pt-1">
                        {Object.entries(step.metrics).map(([k, v]) => (
                          <span
                            key={k}
                            className="text-[10px] uppercase font-mono px-2 py-0.5 rounded bg-indigo-950/60 text-indigo-300 border border-indigo-900/50"
                          >
                            {k}: {String(v)}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
