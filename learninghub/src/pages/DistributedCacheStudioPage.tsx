import { useState, useEffect, useCallback, type FC } from 'react'
import {
  Database,
  Flame,
  Layers,
  Cpu,
  ShieldCheck,
  RefreshCw,
  Sparkles,
  Server,
  BookOpen,
} from 'lucide-react'
import type {
  RingTopology,
  VirtualNode,
  CacheItem,
  NodeMigrationDiff,
  QuorumReadResult,
  QuorumWriteResult,
  StampedeSimulationResult,
  MultiTierLookupResult,
} from '../types/distributedCache'
import { distributedCacheService } from '../services/distributedCacheService'
import { ConsistentHashingRingVisualizer } from '../components/cache/ConsistentHashingRingVisualizer'
import { CacheStampedeSandbox } from '../components/cache/CacheStampedeSandbox'
import { QuorumTunerControlPanel } from '../components/cache/QuorumTunerControlPanel'
import { MultiTierLatencyWaterfall } from '../components/cache/MultiTierLatencyWaterfall'
import { CacheAuditScorecard } from '../components/cache/CacheAuditScorecard'

export type CacheViewTab = 'RING_TOPOLOGY' | 'CACHE_STAMPEDE' | 'QUORUM_TUNER' | 'MULTI_TIER' | 'AUDIT_MATRIX'

export const DistributedCacheStudioPage: FC = () => {
  const [activeTab, setActiveTab] = useState<CacheViewTab>('RING_TOPOLOGY')
  const [topology, setTopology] = useState<RingTopology | null>(null)
  const [tokens, setTokens] = useState<VirtualNode[]>([])
  const [items, setItems] = useState<CacheItem[]>([])
  const [isLoading, setIsLoading] = useState<boolean>(true)
  const [notification, setNotification] = useState<string | null>(null)

  const showNotification = (msg: string) => {
    setNotification(msg)
    setTimeout(() => setNotification(null), 4000)
  }

  const loadClusterData = useCallback(async () => {
    try {
      const data = await distributedCacheService.getTopology()
      setTopology(data.topology)
      setTokens(data.tokens)
      setItems(data.items)
    } catch (err) {
      console.error('Failed to load cache cluster data:', err)
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    loadClusterData()
  }, [loadClusterData])

  const handleAddNode = async (node: { id: string; name: string; weight?: number }): Promise<NodeMigrationDiff | void> => {
    try {
      const res = await distributedCacheService.addNode(node)
      setTopology(res.topology)
      await loadClusterData()
      showNotification(`Node ${node.name} successfully joined the ring!`)
      return res.diff
    } catch (err: any) {
      showNotification(err.message || 'Failed to add node')
    }
  }

  const handleRemoveNode = async (nodeId: string): Promise<NodeMigrationDiff | void> => {
    try {
      const res = await distributedCacheService.removeNode(nodeId)
      setTopology(res.topology)
      await loadClusterData()
      showNotification(`Node ${nodeId} successfully evicted and keys rebalanced.`)
      return res.diff
    } catch (err: any) {
      showNotification(err.message || 'Failed to remove node')
    }
  }

  const handlePutItem = async (key: string, value: string): Promise<void> => {
    try {
      await distributedCacheService.putItem(key, value)
      await loadClusterData()
      showNotification(`Key ${key} mapped into consistent ring!`)
    } catch (err: any) {
      showNotification(err.message || 'Failed to put cache item')
    }
  }

  const handleExecuteQuorumRead = async (key: string, readQuorum?: number): Promise<QuorumReadResult> => {
    return await distributedCacheService.executeQuorumRead(key, readQuorum)
  }

  const handleExecuteQuorumWrite = async (key: string, value: string, writeQuorum?: number): Promise<QuorumWriteResult> => {
    const res = await distributedCacheService.executeQuorumWrite(key, value, writeQuorum)
    await loadClusterData()
    return res
  }

  const handleSimulateStampede = async (key: string, concurrency: number, strategy: 'NONE' | 'MUTEX_LOCK' | 'XFETCH'): Promise<StampedeSimulationResult> => {
    return await distributedCacheService.simulateStampede(key, concurrency, strategy)
  }

  const handleSimulateMultiTierAccess = async (key: string): Promise<MultiTierLookupResult> => {
    return await distributedCacheService.simulateMultiTierAccess(key)
  }

  const handleReset = async () => {
    setIsLoading(true)
    try {
      await distributedCacheService.resetCluster()
      await loadClusterData()
      showNotification('Cluster topology reset to initial state.')
    } finally {
      setIsLoading(false)
    }
  }

  if (isLoading || !topology) {
    return (
      <div className="min-h-screen bg-slate-950 text-white flex flex-col items-center justify-center p-6">
        <RefreshCw className="w-8 h-8 text-cyan-400 animate-spin mb-4" />
        <h2 className="text-base font-semibold text-slate-300">
          Initializing Consistent Hashing & Distributed Cache Studio...
        </h2>
        <p className="text-xs text-slate-500 mt-1">
          Generating 200 virtual nodes across 32-bit integer keyspace
        </p>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 p-4 md:p-8">
      {/* Page Header */}
      <div className="max-w-7xl mx-auto space-y-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-800 pb-6">
          <div>
            <div className="flex items-center gap-2 text-xs font-mono text-cyan-400 mb-1 uppercase tracking-wider">
              <Sparkles className="w-4 h-4 text-cyan-400" />
              Distributed Systems Laboratory • Milestone 35
            </div>
            <h1 className="text-2xl md:text-3xl font-extrabold text-white tracking-tight flex items-center gap-3">
              <Database className="w-7 h-7 text-cyan-400" />
              Consistent Hashing & Distributed Cache Studio
            </h1>
            <p className="text-sm text-slate-400 mt-1 max-w-3xl leading-relaxed">
              Master DynamoDB-style consistent hashing rings with virtual nodes, tunable quorum replication ($R + W &gt; N$), cache stampede defense (Mutex Leases &amp; Probabilistic XFetch), and multi-tier L1/L2 latency waterfalls.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={handleReset}
              className="bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-700/80 text-xs font-semibold px-3 py-2 rounded-xl flex items-center gap-1.5 transition-colors shadow-sm"
              title="Reset cluster to default nodes"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              Reset Cluster
            </button>
            <div className="bg-cyan-950/70 border border-cyan-500/40 text-cyan-300 px-3 py-1.5 rounded-xl text-xs font-mono flex items-center gap-2">
              <Server className="w-3.5 h-3.5" />
              <span>{topology.nodes.length} Physical Nodes ({tokens.length} vnodes)</span>
            </div>
          </div>
        </div>

        {/* Global Notification Banner */}
        {notification && (
          <div className="bg-cyan-950/80 border border-cyan-500/50 text-cyan-200 text-xs px-4 py-2.5 rounded-xl flex items-center justify-between animate-in fade-in">
            <span>{notification}</span>
            <button onClick={() => setNotification(null)} className="text-cyan-400 hover:text-white">
              ✕
            </button>
          </div>
        )}

        {/* Deep Dive Educational Scaffolding Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-slate-900/60 border border-slate-800/80 rounded-xl p-4 space-y-1.5">
            <div className="flex items-center gap-2 text-xs font-bold text-cyan-300">
              <Database className="w-4 h-4 text-cyan-400" />
              Consistent Hashing &amp; Virtual Nodes
            </div>
            <p className="text-[11px] text-slate-400 leading-relaxed">
              Maps keys and nodes onto a circular ring $[0, 2^{32}-1]$. When a node joins or leaves, only $K/N$ keys move (instead of $&gt;80\%$ under naive modulo $hash \pmod N$), preventing catastrophic cache wipeouts.
            </p>
          </div>

          <div className="bg-slate-900/60 border border-slate-800/80 rounded-xl p-4 space-y-1.5">
            <div className="flex items-center gap-2 text-xs font-bold text-amber-300">
              <Flame className="w-4 h-4 text-amber-400" />
              Thundering Herd &amp; XFetch Defense
            </div>
            <p className="text-[11px] text-slate-400 leading-relaxed">
              When a hotspot key expires, 1000s of clients simultaneously miss and crash the DB. Single-flight mutex leases and probabilistic early refresh (<code className="text-amber-300 font-mono">{'delta * beta * -ln(rand()) > TTL'}</code>) guarantee zero downtime.
            </p>
          </div>

          <div className="bg-slate-900/60 border border-slate-800/80 rounded-xl p-4 space-y-1.5">
            <div className="flex items-center gap-2 text-xs font-bold text-purple-300">
              <Layers className="w-4 h-4 text-purple-400" />
              Quorum Consistency &amp; Multi-Tier
            </div>
            <p className="text-[11px] text-slate-400 leading-relaxed">
              Enforcing $R + W &gt; N$ guarantees overlapping replicas and strict consistency with read repair. In-process L1 RAM (0.1ms) shields L2 distributed Redis (2.4ms) and disk databases (45ms).
            </p>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="flex border-b border-slate-800 overflow-x-auto gap-2">
          <button
            onClick={() => setActiveTab('RING_TOPOLOGY')}
            className={`pb-3 px-4 text-xs font-bold flex items-center gap-2 border-b-2 whitespace-nowrap transition-all ${
              activeTab === 'RING_TOPOLOGY'
                ? 'border-cyan-400 text-cyan-300'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Database className="w-4 h-4" />
            Ring Topology &amp; Vnodes
          </button>

          <button
            onClick={() => setActiveTab('CACHE_STAMPEDE')}
            className={`pb-3 px-4 text-xs font-bold flex items-center gap-2 border-b-2 whitespace-nowrap transition-all ${
              activeTab === 'CACHE_STAMPEDE'
                ? 'border-amber-400 text-amber-300'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Flame className="w-4 h-4" />
            Cache Stampede (XFetch)
          </button>

          <button
            onClick={() => setActiveTab('QUORUM_TUNER')}
            className={`pb-3 px-4 text-xs font-bold flex items-center gap-2 border-b-2 whitespace-nowrap transition-all ${
              activeTab === 'QUORUM_TUNER'
                ? 'border-purple-400 text-purple-300'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Layers className="w-4 h-4" />
            Quorum Tuner ($N, R, W$)
          </button>

          <button
            onClick={() => setActiveTab('MULTI_TIER')}
            className={`pb-3 px-4 text-xs font-bold flex items-center gap-2 border-b-2 whitespace-nowrap transition-all ${
              activeTab === 'MULTI_TIER'
                ? 'border-blue-400 text-blue-300'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Cpu className="w-4 h-4" />
            Multi-Tier Waterfall (L1/L2/DB)
          </button>

          <button
            onClick={() => setActiveTab('AUDIT_MATRIX')}
            className={`pb-3 px-4 text-xs font-bold flex items-center gap-2 border-b-2 whitespace-nowrap transition-all ${
              activeTab === 'AUDIT_MATRIX'
                ? 'border-emerald-400 text-emerald-300'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <ShieldCheck className="w-4 h-4" />
            Audit Scorecard &amp; Invalidation
          </button>
        </div>

        {/* Tab Content Display */}
        <div className="pt-2">
          {activeTab === 'RING_TOPOLOGY' && (
            <ConsistentHashingRingVisualizer
              topology={topology}
              items={items}
              onAddNode={handleAddNode}
              onRemoveNode={handleRemoveNode}
              onPutItem={handlePutItem}
            />
          )}

          {activeTab === 'CACHE_STAMPEDE' && (
            <CacheStampedeSandbox onSimulate={handleSimulateStampede} />
          )}

          {activeTab === 'QUORUM_TUNER' && (
            <QuorumTunerControlPanel
              initialN={topology.replicationFactor}
              initialR={topology.readQuorum}
              initialW={topology.writeQuorum}
              onExecuteRead={handleExecuteQuorumRead}
              onExecuteWrite={handleExecuteQuorumWrite}
            />
          )}

          {activeTab === 'MULTI_TIER' && (
            <MultiTierLatencyWaterfall onSimulateAccess={handleSimulateMultiTierAccess} />
          )}

          {activeTab === 'AUDIT_MATRIX' && (
            <CacheAuditScorecard topology={topology} />
          )}
        </div>

        {/* Footer Concept Scaffolding */}
        <div className="mt-8 pt-6 border-t border-slate-800 text-xs text-slate-500 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <BookOpen className="w-4 h-4 text-cyan-400" />
            <span>LearningHub Enterprise Distributed Systems Laboratory • Milestone 35</span>
          </div>
          <span className="font-mono text-[11px] text-slate-400">
            Hash Space: $[0, 2^{32}-1]$ • Audit HMAC: {topology.auditDigest.slice(0, 16)}...
          </span>
        </div>
      </div>
    </div>
  )
}

export default DistributedCacheStudioPage
