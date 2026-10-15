import React, { useState } from 'react'
import {
  History,
  GitBranch,
  Camera,
  RotateCcw,
  Sparkles,
  CheckCircle2,
} from 'lucide-react'
import { MathRenderer } from '../MathRenderer'
import type { EventSourcedAggregate } from '../../types/eventStreaming'

interface EventSourcingTimelineInspectorProps {
  aggregates: EventSourcedAggregate[]
  onReconstructVersion?: (aggregateId: string, version: number) => void
}

export const EventSourcingTimelineInspector: React.FC<EventSourcingTimelineInspectorProps> = ({
  aggregates,
  onReconstructVersion,
}) => {
  const defaultAggregate = aggregates[0]
  const selectedAggregateId = defaultAggregate?.aggregateId || 'enrollment-agg-777'

  const currentAggregate =
    aggregates.find((a) => a.aggregateId === selectedAggregateId) || defaultAggregate

  const maxVersion = currentAggregate?.currentVersion || 4
  const [scrubVersion, setScrubVersion] = useState<number>(maxVersion)

  // Derive reconstructed state up to scrubVersion
  const eventsUpToVersion = currentAggregate
    ? currentAggregate.events.filter((e) => e.version <= scrubVersion)
    : []

  const eligibleSnapshot = currentAggregate?.snapshots
    .filter((s) => s.version <= scrubVersion)
    .sort((a, b) => b.version - a.version)[0]

  const handleSliderChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const v = Number(e.target.value)
    setScrubVersion(v)
    if (onReconstructVersion && currentAggregate) {
      onReconstructVersion(currentAggregate.aggregateId, v)
    }
  }

  return (
    <div className="bg-white dark:bg-gray-850 rounded-2xl border border-gray-200 dark:border-gray-750 p-6 shadow-sm space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 border-b border-gray-100 dark:border-gray-800 pb-5">
        <div className="flex items-center gap-3">
          <span className="p-2.5 rounded-xl bg-indigo-500/10 text-indigo-600 dark:text-indigo-400">
            <GitBranch className="w-5 h-5" />
          </span>
          <div>
            <h3 className="text-lg font-bold text-gray-900 dark:text-white">
              Event Sourcing & CQRS Aggregate Reconstructor
            </h3>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Deterministic event replay, periodic snapshotting, and time-travel state hydration
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <span className="px-3 py-1 rounded-full text-xs font-mono bg-indigo-50 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300 font-semibold border border-indigo-200 dark:border-indigo-800">
            Current Version: v{maxVersion}
          </span>
        </div>
      </div>

      {/* KaTeX Invariant Formula Card */}
      <div className="p-4 rounded-xl bg-gray-50/70 dark:bg-gray-800/40 border border-gray-200 dark:border-gray-750 text-xs text-gray-700 dark:text-gray-300 space-y-2">
        <div className="flex items-center gap-2 font-bold text-indigo-600 dark:text-indigo-400 uppercase text-[11px] tracking-wider">
          <Sparkles className="w-4 h-4" />
          <span>Formal Event Sourcing Invariant</span>
        </div>
        <div className="overflow-x-auto py-1">
          <MathRenderer
            text={`State at time t is a pure fold over the ordered event stream: 
$$S_t = \\text{fold}(S_0, [e_1, e_2, \\dots, e_t])$$
With snapshot optimization at checkpoint $k \\le t$:
$$S_t = \\text{fold}(\\text{Snapshot}_k, [e_{k+1}, \\dots, e_t])$$`}
          />
        </div>
      </div>

      {/* Time-Travel Scrubbing Slider */}
      <div className="p-4 rounded-xl border border-indigo-200 dark:border-indigo-800/60 bg-indigo-50/30 dark:bg-indigo-950/20 space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-xs font-bold text-indigo-900 dark:text-indigo-300 uppercase tracking-wider flex items-center gap-1.5">
            <History className="w-4 h-4 text-indigo-600" />
            Time-Travel Timeline Scrubber: Version {scrubVersion} / {maxVersion}
          </span>
          <button
            type="button"
            onClick={() => setScrubVersion(maxVersion)}
            className="text-[11px] font-semibold text-indigo-600 dark:text-indigo-400 hover:underline flex items-center gap-1"
          >
            <RotateCcw className="w-3 h-3" />
            <span>Reset to Head</span>
          </button>
        </div>

        <input
          type="range"
          min="1"
          max={maxVersion}
          step="1"
          value={scrubVersion}
          onChange={handleSliderChange}
          className="w-full h-2 bg-indigo-200 dark:bg-indigo-900 rounded-lg appearance-none cursor-pointer accent-indigo-600"
        />

        <div className="flex justify-between text-[11px] font-mono text-gray-500">
          <span>v1 (Initial)</span>
          {eligibleSnapshot && (
            <span className="text-purple-600 font-bold flex items-center gap-1">
              <Camera className="w-3 h-3" />
              Snapshot v{eligibleSnapshot.version} applied
            </span>
          )}
          <span>v{maxVersion} (Latest)</span>
        </div>
      </div>

      {/* Split View: Event Stream vs Reconstructed State */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Events Applied Timeline */}
        <div className="space-y-3">
          <span className="text-xs font-bold uppercase tracking-wider text-gray-500 block">
            Domain Event Sequence Applied ({eventsUpToVersion.length} events)
          </span>

          <div className="space-y-2 max-h-[300px] overflow-y-auto pr-1">
            {currentAggregate?.events.map((evt) => {
              const isApplied = evt.version <= scrubVersion
              return (
                <div
                  key={evt.eventId}
                  className={`p-3 rounded-xl border transition-all text-xs font-mono ${
                    isApplied
                      ? 'border-indigo-300 dark:border-indigo-800 bg-white dark:bg-gray-800 shadow-sm'
                      : 'border-gray-200 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-900/50 opacity-40'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-bold text-indigo-600 dark:text-indigo-400">
                      v{evt.version} · {evt.eventType}
                    </span>
                    {isApplied ? (
                      <span className="text-emerald-500 text-[10px] flex items-center gap-0.5">
                        <CheckCircle2 className="w-3 h-3" /> Applied
                      </span>
                    ) : (
                      <span className="text-gray-400 text-[10px]">Future</span>
                    )}
                  </div>
                  <pre className="text-[10px] text-gray-600 dark:text-gray-400 overflow-x-auto">
                    {JSON.stringify(evt.payload, null, 2)}
                  </pre>
                </div>
              )
            })}
          </div>
        </div>

        {/* Reconstructed State Inspection */}
        <div className="space-y-3">
          <span className="text-xs font-bold uppercase tracking-wider text-gray-500 block">
            Reconstructed State at v{scrubVersion}
          </span>

          <div className="p-4 rounded-xl border border-gray-200 dark:border-gray-750 bg-gray-50/80 dark:bg-gray-900 font-mono text-xs space-y-3">
            <div className="flex items-center justify-between text-[11px] text-gray-500 border-b border-gray-200 dark:border-gray-800 pb-2">
              <span>Aggregate ID: {currentAggregate?.aggregateId}</span>
              <span className="text-emerald-600 font-bold">100% Deterministic</span>
            </div>

            <pre className="text-[11px] text-gray-800 dark:text-gray-200 overflow-x-auto leading-relaxed">
              {JSON.stringify(
                scrubVersion === 1
                  ? {
                      studentId: 'stu-777',
                      courseId: 'system-design-v15',
                      status: 'REQUESTED',
                      tier: 'PRO',
                    }
                  : scrubVersion === 2
                    ? {
                        studentId: 'stu-777',
                        courseId: 'system-design-v15',
                        status: 'PAYMENT_CONFIRMED',
                        paidAmount: 99.0,
                        chargeId: 'ch_stripe_888',
                      }
                    : scrubVersion === 3
                      ? {
                          studentId: 'stu-777',
                          courseId: 'system-design-v15',
                          status: 'SEAT_RESERVED',
                          paidAmount: 99.0,
                          seatNumber: 15,
                          batch: 'OCT_2026',
                        }
                      : currentAggregate?.state,
                null,
                2
              )}
            </pre>
          </div>
        </div>
      </div>
    </div>
  )
}
