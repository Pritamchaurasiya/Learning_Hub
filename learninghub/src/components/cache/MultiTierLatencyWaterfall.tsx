import React, { useState } from 'react'
import { Cpu, HardDrive, Database, ArrowRight, Zap, RefreshCw, Radio } from 'lucide-react'
import type { MultiTierLookupResult } from '../../types/distributedCache'

interface MultiTierLatencyWaterfallProps {
  onSimulateAccess: (key: string) => Promise<MultiTierLookupResult>
}

export const MultiTierLatencyWaterfall: React.FC<MultiTierLatencyWaterfallProps> = ({ onSimulateAccess }) => {
  const [testKey, setTestKey] = useState('user:session:usr_9901')
  const [result, setResult] = useState<MultiTierLookupResult | null>(null)
  const [isLoading, setIsLoading] = useState(false)

  const handleAccess = async () => {
    setIsLoading(true)
    try {
      const res = await onSimulateAccess(testKey)
      setResult(res)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="space-y-6">
      {/* Overview Card */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
          <div>
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <Cpu className="w-5 h-5 text-cyan-400" />
              Multi-Tier Cache Latency Waterfall (L1 Memory $\to$ L2 Distributed $\to$ Database)
            </h3>
            <p className="text-xs text-slate-400 mt-1">
              Observe how sub-millisecond in-process L1 caching shields network-bound L2 Redis and disk-bound databases.
            </p>
          </div>

          <div className="flex gap-2">
            <input
              type="text"
              value={testKey}
              onChange={e => setTestKey(e.target.value)}
              placeholder="Cache Key"
              className="bg-slate-950 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-white focus:outline-none focus:border-cyan-500 font-mono"
            />
            <button
              onClick={handleAccess}
              disabled={isLoading}
              className="bg-cyan-600 hover:bg-cyan-500 disabled:opacity-50 text-white text-xs font-bold px-3 py-1.5 rounded-lg flex items-center gap-1.5 transition-colors"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
              Fetch Key
            </button>
          </div>
        </div>

        {/* Tier Diagram Architecture */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* L1 Tier */}
          <div
            className={`border rounded-xl p-4 transition-all ${
              result?.tierServed === 'L1_MEMORY'
                ? 'bg-cyan-950/40 border-cyan-500 shadow-lg shadow-cyan-500/10'
                : 'bg-slate-950/60 border-slate-800'
            }`}
          >
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold text-white flex items-center gap-1.5">
                <Cpu className="w-4 h-4 text-cyan-400" />
                L1 In-Memory LRU
              </span>
              <span className="text-[10px] font-mono bg-cyan-950 text-cyan-300 border border-cyan-500/40 px-1.5 py-0.5 rounded">
                ~0.1ms
              </span>
            </div>
            <p className="text-[11px] text-slate-400">Node.js process RAM (NodeCache / BigCache). Zero network hop.</p>
            {result?.l1Hit && (
              <div className="mt-3 text-xs text-cyan-300 font-bold flex items-center gap-1">
                <Zap className="w-3.5 h-3.5" />
                CACHE HIT (SERVED)
              </div>
            )}
          </div>

          {/* L2 Tier */}
          <div
            className={`border rounded-xl p-4 transition-all ${
              result?.tierServed === 'L2_DISTRIBUTED'
                ? 'bg-blue-950/40 border-blue-500 shadow-lg shadow-blue-500/10'
                : 'bg-slate-950/60 border-slate-800'
            }`}
          >
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold text-white flex items-center gap-1.5">
                <HardDrive className="w-4 h-4 text-blue-400" />
                L2 Distributed Cluster
              </span>
              <span className="text-[10px] font-mono bg-blue-950 text-blue-300 border border-blue-500/40 px-1.5 py-0.5 rounded">
                ~2.4ms
              </span>
            </div>
            <p className="text-[11px] text-slate-400">Redis / Memcached consistent hash ring with cross-AZ replica nodes.</p>
            {result?.l2Hit && (
              <div className="mt-3 text-xs text-blue-300 font-bold flex items-center gap-1">
                <Zap className="w-3.5 h-3.5" />
                CACHE HIT (SERVED)
              </div>
            )}
          </div>

          {/* Database Tier */}
          <div
            className={`border rounded-xl p-4 transition-all ${
              result?.tierServed === 'DATABASE'
                ? 'bg-amber-950/40 border-amber-500 shadow-lg shadow-amber-500/10'
                : 'bg-slate-950/60 border-slate-800'
            }`}
          >
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold text-white flex items-center gap-1.5">
                <Database className="w-4 h-4 text-amber-400" />
                Primary Persistent DB
              </span>
              <span className="text-[10px] font-mono bg-amber-950 text-amber-300 border border-amber-500/40 px-1.5 py-0.5 rounded">
                ~45.0ms
              </span>
            </div>
            <p className="text-[11px] text-slate-400">PostgreSQL / NVMe SSD storage with ACID guarantees and B-Tree indexes.</p>
            {result?.dbHit && (
              <div className="mt-3 text-xs text-amber-300 font-bold flex items-center gap-1">
                <Database className="w-3.5 h-3.5" />
                FALLBACK FETCH & REPOPULATE
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Latency Waterfall Breakdown */}
      {result && (
        <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-5 space-y-4 animate-in fade-in">
          <div className="flex items-center justify-between">
            <h4 className="text-xs font-bold text-white flex items-center gap-2">
              <Radio className="w-4 h-4 text-emerald-400" />
              Waterfall Timing Breakdown
            </h4>
            <span className="text-xs font-mono font-bold text-cyan-300">
              Total Latency: {result.latencies.totalMs} ms
            </span>
          </div>

          {/* Timing Bars */}
          <div className="space-y-2">
            <div className="space-y-1">
              <div className="flex justify-between text-[11px] text-slate-400">
                <span>L1 Check</span>
                <span className="font-mono">{result.latencies.l1Ms} ms</span>
              </div>
              <div className="h-2 w-full bg-slate-950 rounded-full overflow-hidden">
                <div className="bg-cyan-400 h-full w-[4%]" />
              </div>
            </div>

            {result.latencies.l2Ms > 0 && (
              <div className="space-y-1">
                <div className="flex justify-between text-[11px] text-slate-400">
                  <span>L2 Network Hop</span>
                  <span className="font-mono">{result.latencies.l2Ms} ms</span>
                </div>
                <div className="h-2 w-full bg-slate-950 rounded-full overflow-hidden">
                  <div className="bg-blue-500 h-full w-[16%]" />
                </div>
              </div>
            )}

            {result.latencies.dbMs > 0 && (
              <div className="space-y-1">
                <div className="flex justify-between text-[11px] text-slate-400">
                  <span>Database Disk I/O & Query Execution</span>
                  <span className="font-mono">{result.latencies.dbMs} ms</span>
                </div>
                <div className="h-2 w-full bg-slate-950 rounded-full overflow-hidden">
                  <div className="bg-amber-500 h-full w-[80%]" />
                </div>
              </div>
            )}
          </div>

          {/* Invalidation Pub/Sub Flow */}
          {result.evictionBroadcastSent && (
            <div className="mt-4 p-3 rounded-xl bg-purple-950/40 border border-purple-500/40 text-xs text-purple-200 flex items-center gap-2">
              <ArrowRight className="w-4 h-4 text-purple-400 shrink-0" />
              <span>
                <strong>Cache-Aside Repopulated:</strong> L1 and L2 caches populated. Invalidation event broadcasted over Redis Pub/Sub channel <code className="font-mono text-purple-300">cache:invalidate:all</code> to synchronize all app instances.
              </span>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
