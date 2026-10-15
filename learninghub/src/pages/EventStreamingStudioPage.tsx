import { useState, useEffect, useCallback, type FC } from 'react'
import {
  Layers,
  Users,
  Inbox,
  Skull,
  GitBranch,
  RefreshCw,
  Sparkles,
  ShieldCheck,
} from 'lucide-react'
import type {
  StreamingTopologySnapshot,
  StreamingViewTab,
} from '../types/eventStreaming'
import { eventStreamingService } from '../services/eventStreamingService'
import { KafkaPartitionVisualizer } from '../components/streaming/KafkaPartitionVisualizer'
import { ConsumerGroupRebalanceHUD } from '../components/streaming/ConsumerGroupRebalanceHUD'
import { TransactionalOutboxStudio } from '../components/streaming/TransactionalOutboxStudio'
import { PoisonPillDlqControlPanel } from '../components/streaming/PoisonPillDlqControlPanel'
import { EventSourcingTimelineInspector } from '../components/streaming/EventSourcingTimelineInspector'

export const EventStreamingStudioPage: FC = () => {
  const [activeTab, setActiveTab] = useState<StreamingViewTab>('KAFKA_TOPOLOGY')
  const [topology, setTopology] = useState<StreamingTopologySnapshot | null>(null)
  const [isLoading, setIsLoading] = useState<boolean>(true)
  const [isOperating, setIsOperating] = useState<boolean>(false)
  const [rebalanceHistory, setRebalanceHistory] = useState<string[]>([])
  const [feedbackMessage, setFeedbackMessage] = useState<string | null>(null)

  const showNotification = (msg: string) => {
    setFeedbackMessage(msg)
    setTimeout(() => setFeedbackMessage(null), 4000)
  }

  const loadTopology = useCallback(async () => {
    try {
      const data = await eventStreamingService.getTopology()
      setTopology(data)
    } catch (err) {
      console.error('Failed to load streaming topology:', err)
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    loadTopology()
  }, [loadTopology])

  const handleProduce = async (topic: string, key: string | null, value: Record<string, any>) => {
    setIsOperating(true)
    try {
      const result = await eventStreamingService.produceEvent({ topic, key, value })
      showNotification(`Produced to partition ${result.partition} at offset ${result.offset}!`)
      await loadTopology()
    } catch (err) {
      console.error('Produce failed:', err)
    } finally {
      setIsOperating(false)
    }
  }

  const handleConsumeNext = async () => {
    if (!topology || topology.consumerGroups.length === 0) return
    setIsOperating(true)
    try {
      const result = await eventStreamingService.consumeNext({
        groupId: topology.consumerGroups[0].groupId,
        maxMessages: 1,
      })
      showNotification(`Poll complete! Processed ${result.processedCount} message(s). Remaining lag: ${result.updatedLag}`)
      await loadTopology()
    } catch (err) {
      console.error('Consume failed:', err)
    } finally {
      setIsOperating(false)
    }
  }

  const handleRebalance = async (
    action: 'ADD_CONSUMER' | 'REMOVE_CONSUMER' | 'CRASH_CONSUMER' | 'HEAL_CONSUMER',
    protocol: 'EAGER' | 'COOPERATIVE_STICKY'
  ) => {
    if (!topology || topology.consumerGroups.length === 0) return
    setIsOperating(true)
    try {
      const result = await eventStreamingService.rebalanceConsumerGroup({
        groupId: topology.consumerGroups[0].groupId,
        action,
        protocol,
      })
      setRebalanceHistory(result.rebalanceHistory)
      showNotification(`Rebalance complete (${protocol}): Generation #${result.group.generationId}`)
      await loadTopology()
    } catch (err) {
      console.error('Rebalance failed:', err)
    } finally {
      setIsOperating(false)
    }
  }

  const handleProcessOutbox = async (params: {
    aggregateId: string
    aggregateType: string
    eventType: string
    payload: Record<string, any>
  }) => {
    setIsOperating(true)
    try {
      const result = await eventStreamingService.processOutbox(params)
      showNotification(`Outbox event ${result.outboxEvent.id} committed and published to Kafka!`)
      await loadTopology()
    } catch (err) {
      console.error('Outbox process failed:', err)
    } finally {
      setIsOperating(false)
    }
  }

  const handleInjectPoisonPill = async (failureReason?: string) => {
    setIsOperating(true)
    try {
      const result = await eventStreamingService.injectPoisonPill({ failureReason })
      showNotification(`Poison pill intercepted! After 3 retries, routed to DLQ ${result.dlqEntry.id}`)
      await loadTopology()
    } catch (err) {
      console.error('Poison pill failed:', err)
    } finally {
      setIsOperating(false)
    }
  }

  const handleReplayDlq = async (dlqId: string) => {
    setIsOperating(true)
    try {
      const result = await eventStreamingService.replayDlqMessage({ dlqId })
      showNotification(`DLQ item replayed successfully as msg ${result.replayedMessageId}!`)
      await loadTopology()
    } catch (err) {
      console.error('DLQ replay failed:', err)
    } finally {
      setIsOperating(false)
    }
  }

  const primaryGroup = topology?.consumerGroups[0]

  return (
    <div className="min-h-screen bg-gray-50/50 dark:bg-gray-900 py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Page Header */}
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-purple-600 dark:text-purple-400">
              <Sparkles className="w-4 h-4" />
              <span>Milestone 33 · Distributed Systems Trilogy</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-gray-900 dark:text-white mt-1">
              Event Streaming & Outbox Studio
            </h1>
            <p className="text-sm text-gray-600 dark:text-gray-400 mt-1 max-w-2xl">
              Interactive laboratory for Kafka partition hashing, dynamic consumer group rebalancing,
              transactional outbox atomicity, poison-pill DLQ quarantine, and event sourcing state replay.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              type="button"
              disabled={isLoading || isOperating}
              onClick={loadTopology}
              className="flex items-center gap-2 px-4 py-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 hover:bg-gray-50 text-gray-800 dark:text-gray-200 text-xs font-bold rounded-xl shadow-sm transition-all disabled:opacity-50"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
              <span>Refresh Topology</span>
            </button>
          </div>
        </div>

        {/* Real-time Telemetry Metrics Strip */}
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
          <div className="p-3.5 rounded-xl bg-white dark:bg-gray-850 border border-gray-200 dark:border-gray-750 shadow-sm">
            <span className="text-[11px] font-medium text-gray-500 uppercase tracking-wider block">
              Total Produced
            </span>
            <span className="text-xl font-bold font-mono text-purple-600 dark:text-purple-400">
              {topology?.telemetry.totalProduced ?? 0}
            </span>
          </div>

          <div className="p-3.5 rounded-xl bg-white dark:bg-gray-850 border border-gray-200 dark:border-gray-750 shadow-sm">
            <span className="text-[11px] font-medium text-gray-500 uppercase tracking-wider block">
              Total Consumed
            </span>
            <span className="text-xl font-bold font-mono text-emerald-600 dark:text-emerald-400">
              {topology?.telemetry.totalConsumed ?? 0}
            </span>
          </div>

          <div className="p-3.5 rounded-xl bg-white dark:bg-gray-850 border border-gray-200 dark:border-gray-750 shadow-sm">
            <span className="text-[11px] font-medium text-gray-500 uppercase tracking-wider block">
              Active Group Lag
            </span>
            <span className="text-xl font-bold font-mono text-amber-600 dark:text-amber-400">
              {primaryGroup?.totalLag ?? 0} msgs
            </span>
          </div>

          <div className="p-3.5 rounded-xl bg-white dark:bg-gray-850 border border-gray-200 dark:border-gray-750 shadow-sm">
            <span className="text-[11px] font-medium text-gray-500 uppercase tracking-wider block">
              DLQ Quarantined
            </span>
            <span className="text-xl font-bold font-mono text-red-600 dark:text-red-400">
              {topology?.telemetry.dlqCount ?? 0}
            </span>
          </div>

          <div className="col-span-2 sm:col-span-1 p-3.5 rounded-xl bg-white dark:bg-gray-850 border border-gray-200 dark:border-gray-750 shadow-sm">
            <span className="text-[11px] font-medium text-gray-500 uppercase tracking-wider block">
              Rebalances
            </span>
            <span className="text-xl font-bold font-mono text-blue-600 dark:text-blue-400">
              #{topology?.telemetry.rebalanceCount ?? 0}
            </span>
          </div>
        </div>

        {/* Global Feedback Banner */}
        {feedbackMessage && (
          <div className="p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300 text-xs font-semibold flex items-center gap-2 animate-in fade-in">
            <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>{feedbackMessage}</span>
          </div>
        )}

        {/* Studio View Tabs */}
        <div className="flex items-center gap-2 border-b border-gray-200 dark:border-gray-800 overflow-x-auto pb-1">
          <button
            type="button"
            onClick={() => setActiveTab('KAFKA_TOPOLOGY')}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all shrink-0 ${
              activeTab === 'KAFKA_TOPOLOGY'
                ? 'bg-purple-600 text-white shadow-sm'
                : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800'
            }`}
          >
            <Layers className="w-4 h-4" />
            <span>Kafka Partition Logs</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('CONSUMER_GROUPS')}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all shrink-0 ${
              activeTab === 'CONSUMER_GROUPS'
                ? 'bg-blue-600 text-white shadow-sm'
                : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800'
            }`}
          >
            <Users className="w-4 h-4" />
            <span>Consumer Rebalancing</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('OUTBOX_PATTERN')}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all shrink-0 ${
              activeTab === 'OUTBOX_PATTERN'
                ? 'bg-emerald-600 text-white shadow-sm'
                : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800'
            }`}
          >
            <Inbox className="w-4 h-4" />
            <span>Transactional Outbox</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('DEAD_LETTER_QUEUE')}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all shrink-0 ${
              activeTab === 'DEAD_LETTER_QUEUE'
                ? 'bg-red-600 text-white shadow-sm'
                : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800'
            }`}
          >
            <Skull className="w-4 h-4" />
            <span>Poison Pill & DLQ</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('EVENT_SOURCING')}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all shrink-0 ${
              activeTab === 'EVENT_SOURCING'
                ? 'bg-indigo-600 text-white shadow-sm'
                : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800'
            }`}
          >
            <GitBranch className="w-4 h-4" />
            <span>Event Sourcing CQRS</span>
          </button>
        </div>

        {/* Tab Content Display */}
        {topology && (
          <div className="space-y-6">
            {activeTab === 'KAFKA_TOPOLOGY' && (
              <KafkaPartitionVisualizer
                topics={topology.topics}
                onProduce={handleProduce}
                isProducing={isOperating}
              />
            )}

            {activeTab === 'CONSUMER_GROUPS' && primaryGroup && (
              <ConsumerGroupRebalanceHUD
                group={primaryGroup}
                onConsumeNext={handleConsumeNext}
                onRebalance={handleRebalance}
                rebalanceHistory={rebalanceHistory}
                isOperating={isOperating}
              />
            )}

            {activeTab === 'OUTBOX_PATTERN' && (
              <TransactionalOutboxStudio
                outboxQueue={topology.outboxQueue}
                onProcessOutbox={handleProcessOutbox}
                isProcessing={isOperating}
              />
            )}

            {activeTab === 'DEAD_LETTER_QUEUE' && (
              <PoisonPillDlqControlPanel
                dlqQueue={topology.dlqQueue}
                onInjectPoisonPill={handleInjectPoisonPill}
                onReplayDlq={handleReplayDlq}
                isInjecting={isOperating}
                isReplaying={isOperating}
              />
            )}

            {activeTab === 'EVENT_SOURCING' && (
              <EventSourcingTimelineInspector
                aggregates={topology.eventSourcingAggregates}
              />
            )}
          </div>
        )}
      </div>
    </div>
  )
}
