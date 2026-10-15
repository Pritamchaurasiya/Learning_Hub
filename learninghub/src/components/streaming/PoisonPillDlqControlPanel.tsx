import React, { useState } from 'react'
import {
  Skull,
  RotateCcw,
  AlertTriangle,
  ShieldAlert,
  Flame,
  CheckCircle2,
} from 'lucide-react'
import type { DeadLetterMessage } from '../../types/eventStreaming'

interface PoisonPillDlqControlPanelProps {
  dlqQueue: DeadLetterMessage[]
  onInjectPoisonPill: (failureReason?: string) => void
  onReplayDlq: (dlqId: string) => void
  isInjecting?: boolean
  isReplaying?: boolean
}

export const PoisonPillDlqControlPanel: React.FC<PoisonPillDlqControlPanelProps> = ({
  dlqQueue,
  onInjectPoisonPill,
  onReplayDlq,
  isInjecting = false,
  isReplaying = false,
}) => {
  const [selectedFailureType, setSelectedFailureType] = useState<string>(
    'SchemaValidationException: null pointer or corrupted field'
  )

  const activeDlqItems = dlqQueue.filter((item) => item.status === 'IN_DLQ')

  return (
    <div className="bg-white dark:bg-gray-850 rounded-2xl border border-gray-200 dark:border-gray-750 p-6 shadow-sm space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 border-b border-gray-100 dark:border-gray-800 pb-5">
        <div className="flex items-center gap-3">
          <span className="p-2.5 rounded-xl bg-red-500/10 text-red-600 dark:text-red-400">
            <Skull className="w-5 h-5" />
          </span>
          <div>
            <h3 className="text-lg font-bold text-gray-900 dark:text-white">
              Poison Pill Injection & Dead Letter Queue (DLQ)
            </h3>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Quarantine unprocessable messages after exponential retry exhaustion and re-drive repaired events
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <span
            className={`px-3 py-1 rounded-full text-xs font-mono font-semibold border flex items-center gap-1.5 ${
              activeDlqItems.length > 0
                ? 'bg-red-50 dark:bg-red-950/30 text-red-700 dark:text-red-400 border-red-200'
                : 'bg-emerald-50 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300 border-emerald-200'
            }`}
          >
            <ShieldAlert className="w-3.5 h-3.5" />
            DLQ Quarantined: {activeDlqItems.length}
          </span>
        </div>
      </div>

      {/* Poison Pill Trigger Section */}
      <div className="p-4 rounded-xl bg-red-50/50 dark:bg-red-950/20 border border-red-200 dark:border-red-900/40 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-xs font-bold text-red-900 dark:text-red-300 uppercase tracking-wider">
            <Flame className="w-4 h-4 text-red-600" />
            <span>Chaos Fault Injection: Poison Pill Message</span>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
          <div className="flex-1">
            <label htmlFor="poison-failure-select" className="sr-only">Failure Reason</label>
            <select
              id="poison-failure-select"
              value={selectedFailureType}
              onChange={(e) => setSelectedFailureType(e.target.value)}
              className="w-full text-xs font-mono bg-white dark:bg-gray-800 border border-red-200 dark:border-red-800 rounded-lg px-3 py-2 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-red-500"
            >
              <option value="SchemaValidationException: null pointer or corrupted field">
                SchemaValidationException: null pointer or corrupted field
              </option>
              <option value="DeserializationError: non-JSON byte sequence encountered">
                DeserializationError: non-JSON byte sequence encountered
              </option>
              <option value="DatabaseConstraintViolation: foreign key target missing">
                DatabaseConstraintViolation: foreign key target missing
              </option>
            </select>
          </div>

          <button
            type="button"
            disabled={isInjecting}
            onClick={() => onInjectPoisonPill(selectedFailureType)}
            className="flex items-center justify-center gap-2 px-4 py-2 bg-red-600 hover:bg-red-700 text-white text-xs font-bold rounded-lg transition-colors shadow-sm disabled:opacity-50"
          >
            <Skull className="w-3.5 h-3.5" />
            <span>{isInjecting ? 'Injecting Chaos...' : 'Inject Poison Pill'}</span>
          </button>
        </div>

        <p className="text-[11px] text-gray-500 dark:text-gray-400">
          The consumer will execute 3 retry attempts with exponential backoff before sending the message to the Dead Letter Queue.
        </p>
      </div>

      {/* Dead Letter Queue Table */}
      <div className="space-y-3">
        <div className="flex items-center justify-between text-xs font-bold uppercase tracking-wider text-gray-500">
          <span>Quarantine Topic: `course-enrollments.DLQ` ({dlqQueue.length} records)</span>
        </div>

        <div className="border border-gray-200 dark:border-gray-750 rounded-xl overflow-hidden">
          {dlqQueue.length === 0 ? (
            <div className="p-8 text-center text-xs text-gray-400 italic bg-gray-50/50 dark:bg-gray-800/30">
              No quarantined messages in the Dead Letter Queue. Streaming health is optimal!
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs font-mono">
                <thead className="bg-gray-50 dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400">
                  <tr>
                    <th className="px-4 py-2.5">DLQ ID</th>
                    <th className="px-4 py-2.5">Original Loc</th>
                    <th className="px-4 py-2.5">Failure Diagnostic</th>
                    <th className="px-4 py-2.5">Retries</th>
                    <th className="px-4 py-2.5">Status</th>
                    <th className="px-4 py-2.5 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-gray-800 bg-white dark:bg-gray-850">
                  {dlqQueue.map((item) => (
                    <tr key={item.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/50">
                      <td className="px-4 py-2.5 font-bold text-gray-900 dark:text-gray-100">{item.id}</td>
                      <td className="px-4 py-2.5 text-gray-600 dark:text-gray-400">
                        {item.originalTopic} [P{item.originalPartition}#{item.originalOffset}]
                      </td>
                      <td className="px-4 py-2.5 text-red-600 dark:text-red-400 max-w-[280px] truncate" title={item.failureReason}>
                        {item.failureReason}
                      </td>
                      <td className="px-4 py-2.5 text-gray-500 font-bold">
                        {item.retryCount} / {item.maxRetries}
                      </td>
                      <td className="px-4 py-2.5">
                        <span
                          className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold ${
                            item.status === 'IN_DLQ'
                              ? 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300'
                              : 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300'
                          }`}
                        >
                          {item.status === 'IN_DLQ' ? (
                            <AlertTriangle className="w-3 h-3" />
                          ) : (
                            <CheckCircle2 className="w-3 h-3" />
                          )}
                          {item.status}
                        </span>
                      </td>
                      <td className="px-4 py-2.5 text-right">
                        {item.status === 'IN_DLQ' ? (
                          <button
                            type="button"
                            disabled={isReplaying}
                            onClick={() => onReplayDlq(item.id)}
                            className="inline-flex items-center gap-1 px-2.5 py-1 rounded bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 hover:bg-blue-100 border border-blue-200 dark:border-blue-800 font-bold text-[11px] transition-colors disabled:opacity-50"
                          >
                            <RotateCcw className="w-3 h-3" />
                            <span>Re-drive</span>
                          </button>
                        ) : (
                          <span className="text-gray-400 text-[11px]">Resolved</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
