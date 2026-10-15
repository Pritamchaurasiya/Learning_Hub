import React, { useState } from 'react'
import {
  Layers,
  Send,
  Hash,
  Clock,
  CheckCircle2,
  AlertCircle,
  FileJson,
  X,
  Server,
} from 'lucide-react'
import type { KafkaTopic, KafkaMessage } from '../../types/eventStreaming'

interface KafkaPartitionVisualizerProps {
  topics: KafkaTopic[]
  onProduce: (topic: string, key: string | null, value: Record<string, any>) => void
  isProducing?: boolean
}

export const KafkaPartitionVisualizer: React.FC<KafkaPartitionVisualizerProps> = ({
  topics,
  onProduce,
  isProducing = false,
}) => {
  const [selectedTopicName, setSelectedTopicName] = useState<string>(
    topics[0]?.name || 'course-enrollments'
  )
  const [activeMessage, setActiveMessage] = useState<KafkaMessage | null>(null)
  const [inputKey, setInputKey] = useState<string>('student-88')
  const [inputPayload, setInputPayload] = useState<string>(
    JSON.stringify({ courseId: 'system-design', tier: 'PRO', amount: 99 }, null, 2)
  )
  const [parseError, setParseError] = useState<string | null>(null)

  const currentTopic = topics.find((t) => t.name === selectedTopicName) || topics[0]

  const handleProduceSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    setParseError(null)
    try {
      const parsedValue = JSON.parse(inputPayload)
      onProduce(selectedTopicName, inputKey.trim() || null, parsedValue)
    } catch {
      setParseError('Invalid JSON format in message payload')
    }
  }

  return (
    <div className="bg-white dark:bg-gray-850 rounded-2xl border border-gray-200 dark:border-gray-750 p-6 shadow-sm space-y-6">
      {/* Header and Topic Selector */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 border-b border-gray-100 dark:border-gray-800 pb-5">
        <div>
          <div className="flex items-center gap-3">
            <span className="p-2.5 rounded-xl bg-purple-500/10 text-purple-600 dark:text-purple-400">
              <Layers className="w-5 h-5" />
            </span>
            <div>
              <h3 className="text-lg font-bold text-gray-900 dark:text-white">
                Distributed Log & Partitioning Visualizer
              </h3>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Key-based partitioning (Murmur2 hash), commit log segments, and high-watermark offsets
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <label htmlFor="topic-select" className="text-xs font-semibold text-gray-500 uppercase">
            Topic:
          </label>
          <select
            id="topic-select"
            value={selectedTopicName}
            onChange={(e) => setSelectedTopicName(e.target.value)}
            className="text-sm bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg px-3 py-1.5 font-medium text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-purple-500"
          >
            {topics.map((t) => (
              <option key={t.name} value={t.name}>
                {t.name} ({t.partitionCount} partitions)
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Partitions Stream Grid */}
      <div className="space-y-4">
        {currentTopic?.partitions.map((partition) => (
          <div
            key={partition.partitionIndex}
            className="p-4 rounded-xl border border-gray-200 dark:border-gray-750 bg-gray-50/60 dark:bg-gray-800/40 space-y-3"
          >
            <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
              <div className="flex items-center gap-2 font-bold text-gray-800 dark:text-gray-200">
                <Server className="w-4 h-4 text-purple-500" />
                <span>Partition {partition.partitionIndex}</span>
                <span className="px-2 py-0.5 rounded bg-gray-200 dark:bg-gray-700 font-mono text-[11px] text-gray-700 dark:text-gray-300">
                  Leader: Broker #{partition.leaderBrokerId}
                </span>
                <span className="px-2 py-0.5 rounded bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 font-mono text-[11px]">
                  ISR: [{partition.inSyncReplicas.join(', ')}]
                </span>
              </div>

              <div className="flex items-center gap-3 text-gray-500 dark:text-gray-400 font-mono">
                <span>Start: {partition.logStartOffset}</span>
                <span>HW: {partition.highWatermark}</span>
                <span className="font-semibold text-purple-600 dark:text-purple-400">
                  LEO: {partition.logEndOffset}
                </span>
              </div>
            </div>

            {/* Message Offset Strip */}
            <div className="flex items-center gap-2 overflow-x-auto py-2 px-1">
              {partition.messages.length === 0 ? (
                <div className="text-xs text-gray-400 italic py-2">
                  No messages recorded in partition {partition.partitionIndex}
                </div>
              ) : (
                partition.messages.map((msg) => (
                  <button
                    key={msg.id}
                    type="button"
                    onClick={() => setActiveMessage(msg)}
                    className={`shrink-0 px-3 py-2 rounded-lg border text-left transition-all ${
                      activeMessage?.id === msg.id
                        ? 'border-purple-500 bg-purple-50 dark:bg-purple-900/30 ring-2 ring-purple-400'
                        : msg.status === 'DEAD_LETTER'
                          ? 'border-red-300 dark:border-red-800 bg-red-50 dark:bg-red-950/30 hover:bg-red-100/50'
                          : msg.status === 'COMMITTED'
                            ? 'border-emerald-200 dark:border-emerald-800 bg-white dark:bg-gray-850 hover:border-emerald-400'
                            : 'border-amber-200 dark:border-amber-800 bg-amber-50/50 dark:bg-amber-950/20 hover:border-amber-400'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-3 text-[11px] font-mono">
                      <span className="font-bold text-gray-900 dark:text-gray-100">
                        Offset #{msg.offset}
                      </span>
                      {msg.status === 'COMMITTED' ? (
                        <span className="text-emerald-500 flex items-center gap-0.5">
                          <CheckCircle2 className="w-3 h-3" />
                        </span>
                      ) : msg.status === 'DEAD_LETTER' ? (
                        <span className="text-red-500 flex items-center gap-0.5">
                          <AlertCircle className="w-3 h-3" />
                        </span>
                      ) : (
                        <span className="text-amber-500 flex items-center gap-0.5">
                          <Clock className="w-3 h-3" />
                        </span>
                      )}
                    </div>
                    <div className="text-[11px] text-gray-500 truncate max-w-[120px] mt-0.5">
                      Key: {msg.key || '<null>'}
                    </div>
                  </button>
                ))
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Produce Event Mini Studio */}
      <form onSubmit={handleProduceSubmit} className="pt-4 border-t border-gray-100 dark:border-gray-800 space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-xs font-bold uppercase tracking-wider text-gray-500 flex items-center gap-1.5">
            <Send className="w-3.5 h-3.5 text-purple-500" />
            Produce Message to Stream
          </span>
          {parseError && <span className="text-xs text-red-500 font-medium">{parseError}</span>}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
          <div>
            <label htmlFor="partition-key-input" className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
              Partition Key (Optional)
            </label>
            <div className="relative">
              <Hash className="w-4 h-4 text-gray-400 absolute left-3 top-2.5" />
              <input
                id="partition-key-input"
                type="text"
                value={inputKey}
                onChange={(e) => setInputKey(e.target.value)}
                placeholder="e.g. user-101"
                className="w-full text-xs font-mono pl-9 pr-3 py-2 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 text-gray-900 dark:text-gray-100"
              />
            </div>
            <p className="text-[10px] text-gray-400 mt-1">
              Murmur2(key) % partitions routes messages deterministically.
            </p>
          </div>

          <div className="md:col-span-2">
            <label htmlFor="payload-input" className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
              JSON Payload
            </label>
            <textarea
              id="payload-input"
              rows={2}
              value={inputPayload}
              onChange={(e) => setInputPayload(e.target.value)}
              className="w-full text-xs font-mono p-2 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 text-gray-900 dark:text-gray-100"
            />
          </div>

          <div className="flex items-end">
            <button
              type="submit"
              disabled={isProducing}
              className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold rounded-lg transition-colors shadow-sm disabled:opacity-50"
            >
              <Send className="w-3.5 h-3.5" />
              <span>{isProducing ? 'Publishing...' : 'Produce Event'}</span>
            </button>
          </div>
        </div>
      </form>

      {/* Message Inspector Modal / Drawer */}
      {activeMessage && (
        <div className="p-4 rounded-xl border border-purple-200 dark:border-purple-800 bg-purple-50/40 dark:bg-purple-950/20 space-y-2 animate-in fade-in">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-xs font-bold text-purple-900 dark:text-purple-300">
              <FileJson className="w-4 h-4 text-purple-600" />
              <span>Message Inspector: Partition {activeMessage.partitionIndex} | Offset #{activeMessage.offset}</span>
            </div>
            <button
              type="button"
              onClick={() => setActiveMessage(null)}
              className="p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
            <div>
              <span className="font-semibold text-gray-500 block mb-1">Metadata & Headers:</span>
              <pre className="p-2.5 rounded bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 font-mono text-[11px] overflow-x-auto text-gray-800 dark:text-gray-200">
                {JSON.stringify(
                  {
                    id: activeMessage.id,
                    key: activeMessage.key,
                    timestamp: activeMessage.timestamp,
                    status: activeMessage.status,
                    headers: activeMessage.headers,
                  },
                  null,
                  2
                )}
              </pre>
            </div>
            <div>
              <span className="font-semibold text-gray-500 block mb-1">Payload Body:</span>
              <pre className="p-2.5 rounded bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 font-mono text-[11px] overflow-x-auto text-gray-800 dark:text-gray-200">
                {JSON.stringify(activeMessage.value, null, 2)}
              </pre>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
