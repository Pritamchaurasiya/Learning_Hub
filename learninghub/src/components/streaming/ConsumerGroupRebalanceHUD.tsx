import React, { useState } from 'react'
import {
  Users,
  Play,
  UserPlus,
  UserMinus,
  Skull,
  Activity,
  Gauge,
  History,
} from 'lucide-react'
import type { ConsumerGroup } from '../../types/eventStreaming'

interface ConsumerGroupRebalanceHUDProps {
  group: ConsumerGroup
  onConsumeNext: () => void
  onRebalance: (
    action: 'ADD_CONSUMER' | 'REMOVE_CONSUMER' | 'CRASH_CONSUMER' | 'HEAL_CONSUMER',
    protocol: 'EAGER' | 'COOPERATIVE_STICKY'
  ) => void
  rebalanceHistory?: string[]
  isOperating?: boolean
}

export const ConsumerGroupRebalanceHUD: React.FC<ConsumerGroupRebalanceHUDProps> = ({
  group,
  onConsumeNext,
  onRebalance,
  rebalanceHistory = [],
  isOperating = false,
}) => {
  const [selectedProtocol, setSelectedProtocol] = useState<'EAGER' | 'COOPERATIVE_STICKY'>(
    group.rebalanceProtocol || 'COOPERATIVE_STICKY'
  )

  const activeConsumers = group.members.filter((m) => m.status === 'ACTIVE')
  const crashedConsumers = group.members.filter((m) => m.status === 'CRASHED')

  return (
    <div className="bg-white dark:bg-gray-850 rounded-2xl border border-gray-200 dark:border-gray-750 p-6 shadow-sm space-y-6">
      {/* Header and Telemetry */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 border-b border-gray-100 dark:border-gray-800 pb-5">
        <div className="flex items-center gap-3">
          <span className="p-2.5 rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-400">
            <Users className="w-5 h-5" />
          </span>
          <div>
            <h3 className="text-lg font-bold text-gray-900 dark:text-white">
              Consumer Group Coordinator & Rebalance HUD
            </h3>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Offset tracking, generation sync, and partition reassignment algorithms
            </p>
          </div>
        </div>

        {/* Top Badges */}
        <div className="flex flex-wrap items-center gap-2">
          <span className="px-3 py-1 rounded-full text-xs font-mono bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 font-semibold border border-blue-200 dark:border-blue-800">
            Group: {group.groupId}
          </span>
          <span className="px-3 py-1 rounded-full text-xs font-mono bg-purple-50 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 font-semibold border border-purple-200 dark:border-purple-800">
            Generation: #{group.generationId}
          </span>
          <span
            className={`px-3 py-1 rounded-full text-xs font-mono font-semibold border flex items-center gap-1.5 ${
              group.totalLag === 0
                ? 'bg-emerald-50 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300 border-emerald-200'
                : 'bg-amber-50 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300 border-amber-200'
            }`}
          >
            <Gauge className="w-3.5 h-3.5" />
            Total Lag: {group.totalLag} msgs
          </span>
        </div>
      </div>

      {/* Protocol Selection & Action Controls */}
      <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-4 p-4 rounded-xl bg-gray-50/70 dark:bg-gray-800/40 border border-gray-200 dark:border-gray-750">
        <div className="flex items-center gap-3">
          <span className="text-xs font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wider">
            Rebalance Protocol:
          </span>
          <div className="flex rounded-lg border border-gray-200 dark:border-gray-700 p-0.5 bg-white dark:bg-gray-900">
            <button
              type="button"
              onClick={() => setSelectedProtocol('COOPERATIVE_STICKY')}
              className={`px-3 py-1 text-xs font-semibold rounded-md transition-all ${
                selectedProtocol === 'COOPERATIVE_STICKY'
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'text-gray-600 dark:text-gray-400 hover:text-gray-900'
              }`}
            >
              Cooperative Sticky (Incremental)
            </button>
            <button
              type="button"
              onClick={() => setSelectedProtocol('EAGER')}
              className={`px-3 py-1 text-xs font-semibold rounded-md transition-all ${
                selectedProtocol === 'EAGER'
                  ? 'bg-purple-600 text-white shadow-sm'
                  : 'text-gray-600 dark:text-gray-400 hover:text-gray-900'
              }`}
            >
              Eager (Stop-The-World)
            </button>
          </div>
        </div>

        {/* Simulation Buttons */}
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            disabled={isOperating}
            onClick={onConsumeNext}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm transition-colors disabled:opacity-50"
          >
            <Play className="w-3.5 h-3.5" />
            <span>Poll & Commit (1 msg)</span>
          </button>

          <button
            type="button"
            disabled={isOperating}
            onClick={() => onRebalance('ADD_CONSUMER', selectedProtocol)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 hover:bg-blue-100 border border-blue-200 dark:border-blue-800 transition-colors disabled:opacity-50"
          >
            <UserPlus className="w-3.5 h-3.5" />
            <span>+ Add Worker</span>
          </button>

          <button
            type="button"
            disabled={isOperating || group.members.length <= 1}
            onClick={() => onRebalance('REMOVE_CONSUMER', selectedProtocol)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 border border-gray-300 dark:border-gray-700 transition-colors disabled:opacity-50"
          >
            <UserMinus className="w-3.5 h-3.5" />
            <span>- Remove Worker</span>
          </button>

          {crashedConsumers.length === 0 ? (
            <button
              type="button"
              disabled={isOperating || activeConsumers.length === 0}
              onClick={() => onRebalance('CRASH_CONSUMER', selectedProtocol)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-red-50 dark:bg-red-950/30 text-red-700 dark:text-red-400 hover:bg-red-100 border border-red-200 dark:border-red-800 transition-colors disabled:opacity-50"
            >
              <Skull className="w-3.5 h-3.5" />
              <span>Crash Worker</span>
            </button>
          ) : (
            <button
              type="button"
              disabled={isOperating}
              onClick={() => onRebalance('HEAL_CONSUMER', selectedProtocol)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-emerald-50 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-400 hover:bg-emerald-100 border border-emerald-200 dark:border-emerald-800 transition-colors disabled:opacity-50"
            >
              <Activity className="w-3.5 h-3.5" />
              <span>Recover Worker</span>
            </button>
          )}
        </div>
      </div>

      {/* Consumer Workers Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {group.members.map((member) => (
          <div
            key={member.consumerId}
            className={`p-4 rounded-xl border transition-all ${
              member.status === 'CRASHED'
                ? 'border-red-300 dark:border-red-800 bg-red-50/50 dark:bg-red-950/20'
                : 'border-gray-200 dark:border-gray-750 bg-white dark:bg-gray-850 shadow-sm'
            }`}
          >
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <span
                  className={`w-2.5 h-2.5 rounded-full ${
                    member.status === 'ACTIVE'
                      ? 'bg-emerald-500 animate-pulse'
                      : 'bg-red-500'
                  }`}
                />
                <span className="font-mono text-xs font-bold text-gray-900 dark:text-gray-100">
                  {member.consumerId}
                </span>
              </div>
              <span
                className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                  member.status === 'ACTIVE'
                    ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300'
                    : 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300'
                }`}
              >
                {member.status}
              </span>
            </div>

            <div className="text-xs text-gray-500 dark:text-gray-400 font-mono space-y-1 mb-3">
              <div>Host: {member.host}</div>
              <div className="flex items-center gap-1">
                <span>Assigned Partitions:</span>
                {member.assignedPartitions.length === 0 ? (
                  <span className="text-amber-500 italic">None</span>
                ) : (
                  member.assignedPartitions.map((p) => (
                    <span
                      key={p}
                      className="px-1.5 py-0.2 rounded bg-purple-100 dark:bg-purple-900/40 text-purple-700 dark:text-purple-300 font-bold"
                    >
                      P{p}
                    </span>
                  ))
                )}
              </div>
            </div>

            {/* Partition Offsets & Lag */}
            <div className="border-t border-gray-100 dark:border-gray-800 pt-2 space-y-1 text-[11px] font-mono">
              {member.assignedPartitions.map((p) => {
                const cur = member.currentOffsets[p] ?? 0
                const lag = group.lagPerPartition[p] ?? 0
                return (
                  <div key={p} className="flex items-center justify-between">
                    <span className="text-gray-500">P{p} Committed: #{cur}</span>
                    <span className={lag > 0 ? 'text-amber-600 font-bold' : 'text-emerald-600'}>
                      Lag: {lag}
                    </span>
                  </div>
                )
              })}
            </div>
          </div>
        ))}
      </div>

      {/* Rebalance History Log */}
      {rebalanceHistory.length > 0 && (
        <div className="p-3.5 rounded-xl border border-gray-200 dark:border-gray-750 bg-gray-50/70 dark:bg-gray-900 text-xs font-mono space-y-1">
          <div className="flex items-center gap-1.5 text-gray-500 font-bold uppercase mb-1">
            <History className="w-3.5 h-3.5" />
            <span>Rebalance Event Audit Trail:</span>
          </div>
          {rebalanceHistory.map((item, i) => (
            <div key={i} className="text-gray-700 dark:text-gray-300 flex items-start gap-2">
              <span className="text-purple-500 font-bold">›</span>
              <span>{item}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
