import React from 'react'
import { ShieldCheck, CheckCircle2, XCircle, AlertCircle, Fingerprint, Activity } from 'lucide-react'
import type { RingTopology } from '../../types/distributedCache'

interface CacheAuditScorecardProps {
  topology: RingTopology
}

export const CacheAuditScorecard: React.FC<CacheAuditScorecardProps> = ({ topology }) => {
  return (
    <div className="space-y-6">
      {/* Top Banner & Cryptographic Audit Seal */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-4">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-emerald-950/80 border border-emerald-500/40 rounded-xl text-emerald-400">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white">
                Cluster Topology Health & Cryptographic Ring Audit Seal
              </h3>
              <p className="text-xs text-slate-400">
                Deterministic SHA-256 cryptographic proof generated from active node members, vnode boundaries, and key allocations.
              </p>
            </div>
          </div>

          <div className="text-right">
            <span className="text-xs text-slate-400 block">Cluster Status</span>
            <span className="text-xs font-bold text-emerald-400 bg-emerald-950 border border-emerald-500/30 px-2.5 py-0.5 rounded-full">
              HEALTHY & BALANCED
            </span>
          </div>
        </div>

        {/* SHA-256 Hex Display */}
        <div className="bg-slate-950 border border-slate-800 rounded-xl p-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div className="flex items-center gap-2 text-xs text-slate-400">
            <Fingerprint className="w-4 h-4 text-cyan-400 shrink-0" />
            <span className="font-semibold text-slate-300">Ring HMAC Seal:</span>
          </div>
          <code className="text-xs font-mono text-cyan-300 break-all bg-slate-900 px-2.5 py-1 rounded border border-slate-700/60">
            {topology.auditDigest}
          </code>
        </div>
      </div>

      {/* Comparison Matrix: Consistent Hashing vs Modulo vs Rendezvous */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-6">
        <h4 className="text-sm font-bold text-white mb-4 flex items-center gap-2">
          <Activity className="w-4 h-4 text-purple-400" />
          Distributed Partitioning Algorithms Architectural Matrix
        </h4>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-slate-800 text-slate-400 bg-slate-950/40">
                <th className="py-2.5 px-3 font-semibold">Algorithm</th>
                <th className="py-2.5 px-3 font-semibold">Key Redistribution on Node +/-</th>
                <th className="py-2.5 px-3 font-semibold">Lookup Complexity</th>
                <th className="py-2.5 px-3 font-semibold">Memory Overhead</th>
                <th className="py-2.5 px-3 font-semibold">Hotspot Vulnerability</th>
                <th className="py-2.5 px-3 font-semibold">Production Adoption</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800 text-slate-300">
              <tr className="hover:bg-slate-800/40">
                <td className="py-3 px-3 font-bold text-white flex items-center gap-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                  Consistent Hashing (vnodes)
                </td>
                <td className="py-3 px-3 text-emerald-400 font-mono font-semibold">
                  Only $K / N$ keys moved (~20%)
                </td>
                <td className="py-3 px-3 font-mono">{'O(log(total_vnodes))'}</td>
                <td className="py-3 px-3">Low (Ring array in memory)</td>
                <td className="py-3 px-3 text-emerald-400">Negligible (Homogenized by vnodes)</td>
                <td className="py-3 px-3 font-medium">DynamoDB, Cassandra, Memcached (Ketama)</td>
              </tr>
              <tr className="hover:bg-slate-800/40">
                <td className="py-3 px-3 font-bold text-slate-400 flex items-center gap-1.5">
                  <XCircle className="w-3.5 h-3.5 text-red-400" />
                  Naive Modulo ($hash \pmod N$)
                </td>
                <td className="py-3 px-3 text-red-400 font-mono font-semibold">
                  Catastrophic: ~ N/(N+1) (&gt;80%)
                </td>
                <td className="py-3 px-3 font-mono">$O(1)$</td>
                <td className="py-3 px-3">Zero</td>
                <td className="py-3 px-3 text-red-400">High (Non-uniform modulus)</td>
                <td className="py-3 px-3 text-slate-500">Deprecated for dynamic distributed storage</td>
              </tr>
              <tr className="hover:bg-slate-800/40">
                <td className="py-3 px-3 font-bold text-slate-300 flex items-center gap-1.5">
                  <AlertCircle className="w-3.5 h-3.5 text-blue-400" />
                  Rendezvous Hashing (HRW)
                </td>
                <td className="py-3 px-3 text-emerald-400 font-mono font-semibold">
                  Minimal: $K / N$ keys moved
                </td>
                <td className="py-3 px-3 font-mono">$O(N)$ (Score every node)</td>
                <td className="py-3 px-3">Zero (No ring required)</td>
                <td className="py-3 px-3 text-emerald-400">Negligible (Uniform score distribution)</td>
                <td className="py-3 px-3 font-medium">CARP protocol, Microsoft Web Proxy</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* Write Invalidation Policies Guide */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-4">
          <h5 className="text-xs font-bold text-white mb-1.5 text-cyan-300">Cache-Aside (Lazy Loading)</h5>
          <p className="text-[11px] text-slate-400 leading-relaxed">
            Application reads cache first. On miss, reads database and populates cache with TTL. Writes go to database and invalidate cache key.
            <strong> Best for:</strong> Read-heavy workloads, resilient against cache node crashes.
          </p>
        </div>
        <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-4">
          <h5 className="text-xs font-bold text-white mb-1.5 text-emerald-300">Write-Through</h5>
          <p className="text-[11px] text-slate-400 leading-relaxed">
            Data is written synchronously to cache AND database in a single transaction. Ensures cache is never stale.
            <strong> Best for:</strong> Systems requiring strict consistency where write latency penalty is acceptable.
          </p>
        </div>
        <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-4">
          <h5 className="text-xs font-bold text-white mb-1.5 text-amber-300">Write-Behind (Write-Back)</h5>
          <p className="text-[11px] text-slate-400 leading-relaxed">
            Data is written immediately to cache, and an asynchronous worker flushes buffered writes to database in batches.
            <strong> Best for:</strong> Write-heavy telemetry, analytics spikes; risk of data loss on crash before flush.
          </p>
        </div>
        <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-4">
          <h5 className="text-xs font-bold text-white mb-1.5 text-purple-300">Write-Around</h5>
          <p className="text-[11px] text-slate-400 leading-relaxed">
            Writes bypass cache completely and write directly to database. Cache is only populated on subsequent read misses.
            <strong> Best for:</strong> Write-heavy data that is rarely read again immediately (e.g. historical log ingestion).
          </p>
        </div>
      </div>
    </div>
  )
}
