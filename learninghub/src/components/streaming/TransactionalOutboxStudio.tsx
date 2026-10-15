import React, { useState } from 'react'
import {
  Inbox,
  Database,
  Send,
  CheckCircle2,
  AlertOctagon,
  ShieldCheck,
  RefreshCw,
  GitCommit,
} from 'lucide-react'
import type { OutboxEvent } from '../../types/eventStreaming'

interface TransactionalOutboxStudioProps {
  outboxQueue: OutboxEvent[]
  onProcessOutbox: (params: {
    aggregateId: string
    aggregateType: string
    eventType: string
    payload: Record<string, any>
  }) => void
  isProcessing?: boolean
}

export const TransactionalOutboxStudio: React.FC<TransactionalOutboxStudioProps> = ({
  outboxQueue,
  onProcessOutbox,
  isProcessing = false,
}) => {
  const [studentId, setStudentId] = useState('student-994')
  const [courseId, setCourseId] = useState('distributed-systems-101')
  const amount = 89

  const handleExecute = (e: React.FormEvent) => {
    e.preventDefault()
    onProcessOutbox({
      aggregateId: `enroll-${Date.now().toString(36)}`,
      aggregateType: 'CourseEnrollment',
      eventType: 'EnrollmentPaymentCaptured',
      payload: { studentId, courseId, amount, status: 'PAID' },
    })
  }

  return (
    <div className="bg-white dark:bg-gray-850 rounded-2xl border border-gray-200 dark:border-gray-750 p-6 shadow-sm space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 border-b border-gray-100 dark:border-gray-800 pb-5">
        <div className="flex items-center gap-3">
          <span className="p-2.5 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
            <Inbox className="w-5 h-5" />
          </span>
          <div>
            <h3 className="text-lg font-bold text-gray-900 dark:text-white">
              Transactional Outbox Pattern Studio
            </h3>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Guaranteed at-least-once dual-write prevention using atomic local DB transactions & CDC relay
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <span className="px-3 py-1 rounded-full text-xs font-mono bg-emerald-50 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300 font-semibold border border-emerald-200 dark:border-emerald-800 flex items-center gap-1.5">
            <ShieldCheck className="w-4 h-4" />
            Zero Dual-Write Loss
          </span>
        </div>
      </div>

      {/* Architectural Diagram Flow */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs font-mono">
        <div className="p-4 rounded-xl border border-blue-200 dark:border-blue-900/50 bg-blue-50/40 dark:bg-blue-950/20 space-y-2">
          <div className="flex items-center gap-2 font-bold text-blue-800 dark:text-blue-300">
            <Database className="w-4 h-4" />
            <span>Step 1: Atomic ACID Tx</span>
          </div>
          <p className="text-gray-600 dark:text-gray-400 text-[11px] leading-relaxed">
            Writes `enrollments` row AND inserts into `outbox_events` in the same database transaction. If DB fails, both rollback.
          </p>
        </div>

        <div className="p-4 rounded-xl border border-purple-200 dark:border-purple-900/50 bg-purple-50/40 dark:bg-purple-950/20 space-y-2">
          <div className="flex items-center gap-2 font-bold text-purple-800 dark:text-purple-300">
            <RefreshCw className="w-4 h-4" />
            <span>Step 2: Outbox CDC / Poller</span>
          </div>
          <p className="text-gray-600 dark:text-gray-400 text-[11px] leading-relaxed">
            Debezium CDC or background poller tails `outbox_events` table asynchronously without blocking the client request thread.
          </p>
        </div>

        <div className="p-4 rounded-xl border border-emerald-200 dark:border-emerald-900/50 bg-emerald-50/40 dark:bg-emerald-950/20 space-y-2">
          <div className="flex items-center gap-2 font-bold text-emerald-800 dark:text-emerald-300">
            <Send className="w-4 h-4" />
            <span>Step 3: Kafka Broker Produce</span>
          </div>
          <p className="text-gray-600 dark:text-gray-400 text-[11px] leading-relaxed">
            Publishes event to `course-enrollments` topic with message key. On ACK, marks outbox row as `PUBLISHED`.
          </p>
        </div>
      </div>

      {/* Transaction Trigger Form */}
      <form onSubmit={handleExecute} className="p-4 rounded-xl bg-gray-50/80 dark:bg-gray-800/40 border border-gray-200 dark:border-gray-750 space-y-3">
        <span className="text-xs font-bold uppercase tracking-wider text-gray-600 dark:text-gray-400 block">
          Trigger Atomic Enrollment & Outbox Insertion:
        </span>
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
          <div>
            <label htmlFor="student-id-input" className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
              Student ID
            </label>
            <input
              id="student-id-input"
              type="text"
              value={studentId}
              onChange={(e) => setStudentId(e.target.value)}
              className="w-full text-xs font-mono px-3 py-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
          </div>

          <div className="sm:col-span-2">
            <label htmlFor="course-id-input" className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
              Course Target
            </label>
            <input
              id="course-id-input"
              type="text"
              value={courseId}
              onChange={(e) => setCourseId(e.target.value)}
              className="w-full text-xs font-mono px-3 py-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
          </div>

          <div className="flex items-end">
            <button
              type="submit"
              disabled={isProcessing}
              className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-lg transition-colors shadow-sm disabled:opacity-50"
            >
              <GitCommit className="w-4 h-4" />
              <span>{isProcessing ? 'Executing...' : 'Commit Tx & Outbox'}</span>
            </button>
          </div>
        </div>
      </form>

      {/* Outbox Table Preview */}
      <div className="space-y-3">
        <div className="flex items-center justify-between text-xs font-bold uppercase tracking-wider text-gray-500">
          <span>Relational Database: `outbox_events` Table ({outboxQueue.length} records)</span>
        </div>

        <div className="border border-gray-200 dark:border-gray-750 rounded-xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs font-mono">
              <thead className="bg-gray-50 dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400">
                <tr>
                  <th className="px-4 py-2.5">Outbox ID</th>
                  <th className="px-4 py-2.5">Aggregate</th>
                  <th className="px-4 py-2.5">Event Type</th>
                  <th className="px-4 py-2.5">Payload Preview</th>
                  <th className="px-4 py-2.5">Status</th>
                  <th className="px-4 py-2.5">Created At</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-800 bg-white dark:bg-gray-850">
                {outboxQueue.map((item) => (
                  <tr key={item.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/50">
                    <td className="px-4 py-2.5 font-bold text-gray-900 dark:text-gray-100">{item.id}</td>
                    <td className="px-4 py-2.5 text-gray-600 dark:text-gray-400">
                      {item.aggregateType} ({item.aggregateId})
                    </td>
                    <td className="px-4 py-2.5 text-purple-600 dark:text-purple-400 font-semibold">
                      {item.eventType}
                    </td>
                    <td className="px-4 py-2.5 text-gray-500 truncate max-w-[200px]">
                      {JSON.stringify(item.payload)}
                    </td>
                    <td className="px-4 py-2.5">
                      <span
                        className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold ${
                          item.status === 'PUBLISHED'
                            ? 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300'
                            : 'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300'
                        }`}
                      >
                        {item.status === 'PUBLISHED' ? (
                          <CheckCircle2 className="w-3 h-3" />
                        ) : (
                          <AlertOctagon className="w-3 h-3" />
                        )}
                        {item.status}
                      </span>
                    </td>
                    <td className="px-4 py-2.5 text-gray-400 text-[11px]">{item.createdAt.slice(11, 19)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  )
}
