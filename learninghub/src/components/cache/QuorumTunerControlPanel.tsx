import React, { useState } from 'react'
import { CheckCircle2, AlertTriangle, ShieldCheck, Wrench, RefreshCw, Layers } from 'lucide-react'
import type { QuorumReadResult, QuorumWriteResult } from '../../types/distributedCache'

interface QuorumTunerControlPanelProps {
  initialN?: number
  initialR?: number
  initialW?: number
  onExecuteRead: (key: string, readQuorum?: number) => Promise<QuorumReadResult>
  onExecuteWrite: (key: string, value: string, writeQuorum?: number) => Promise<QuorumWriteResult>
}

export const QuorumTunerControlPanel: React.FC<QuorumTunerControlPanelProps> = ({
  initialN = 3,
  initialR = 2,
  initialW = 2,
  onExecuteRead,
  onExecuteWrite,
}) => {
  const [nReplicas, setNReplicas] = useState(initialN)
  const [readQuorum, setReadQuorum] = useState(initialR)
  const [writeQuorum, setWriteQuorum] = useState(initialW)
  const [targetKey, setTargetKey] = useState('course:metadata:cs101')
  const [writeValue, setWriteValue] = useState('{"title":"Distributed Systems V2","updated":true}')

  const [readResult, setReadResult] = useState<QuorumReadResult | null>(null)
  const [writeResult, setWriteResult] = useState<QuorumWriteResult | null>(null)
  const [isLoading, setIsLoading] = useState(false)

  const isStrongConsistency = readQuorum + writeQuorum > nReplicas

  const handleRead = async () => {
    setIsLoading(true)
    try {
      const res = await onExecuteRead(targetKey, readQuorum)
      setReadResult(res)
    } finally {
      setIsLoading(false)
    }
  }

  const handleWrite = async () => {
    setIsLoading(true)
    try {
      const res = await onExecuteWrite(targetKey, writeValue, writeQuorum)
      setWriteResult(res)
      // Automatically run read to verify version
      const readRes = await onExecuteRead(targetKey, readQuorum)
      setReadResult(readRes)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="space-y-6">
      {/* Parameter Sliders Card */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
          <div>
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <Layers className="w-5 h-5 text-purple-400" />
              Tunable Quorum Consistency Studio ($N, R, W$)
            </h3>
            <p className="text-xs text-slate-400 mt-1">
              Adjust replication factor ($N$), read quorum ($R$), and write quorum ($W$) to observe the consistency-latency boundary.
            </p>
          </div>

          <div
            className={`px-3 py-1.5 rounded-xl border flex items-center gap-2 text-xs font-semibold ${
              isStrongConsistency
                ? 'bg-emerald-950/80 border-emerald-500/50 text-emerald-300'
                : 'bg-amber-950/80 border-amber-500/50 text-amber-300'
            }`}
          >
            {isStrongConsistency ? (
              <>
                <ShieldCheck className="w-4 h-4 text-emerald-400" />
                <span>Strong Consistency: $R + W &gt; N$ ({readQuorum} + {writeQuorum} &gt; {nReplicas})</span>
              </>
            ) : (
              <>
                <AlertTriangle className="w-4 h-4 text-amber-400" />
                <span>Eventual / Weak: $R + W \le N$ (Stale Reads Possible)</span>
              </>
            )}
          </div>
        </div>

        {/* Sliders Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-4 border-t border-slate-800">
          <div className="space-y-2">
            <div className="flex justify-between text-xs">
              <span className="text-slate-300 font-medium">Replication Factor ($N$)</span>
              <span className="text-purple-400 font-mono font-bold">{nReplicas} nodes</span>
            </div>
            <input
              type="range"
              min="1"
              max="5"
              value={nReplicas}
              onChange={e => setNReplicas(Number(e.target.value))}
              className="w-full accent-purple-400"
            />
            <p className="text-[10px] text-slate-500">Number of distinct physical replicas holding each key.</p>
          </div>

          <div className="space-y-2">
            <div className="flex justify-between text-xs">
              <span className="text-slate-300 font-medium">Read Quorum ($R$)</span>
              <span className="text-cyan-400 font-mono font-bold">{readQuorum} acks</span>
            </div>
            <input
              type="range"
              min="1"
              max={nReplicas}
              value={readQuorum}
              onChange={e => setReadQuorum(Number(e.target.value))}
              className="w-full accent-cyan-400"
            />
            <p className="text-[10px] text-slate-500">Number of replica nodes required to acknowledge a read query.</p>
          </div>

          <div className="space-y-2">
            <div className="flex justify-between text-xs">
              <span className="text-slate-300 font-medium">Write Quorum ($W$)</span>
              <span className="text-emerald-400 font-mono font-bold">{writeQuorum} acks</span>
            </div>
            <input
              type="range"
              min="1"
              max={nReplicas}
              value={writeQuorum}
              onChange={e => setWriteQuorum(Number(e.target.value))}
              className="w-full accent-emerald-400"
            />
            <p className="text-[10px] text-slate-500">Number of replica nodes required to acknowledge a write mutation.</p>
          </div>
        </div>

        {/* Action Testing Bar */}
        <div className="mt-6 pt-4 border-t border-slate-800 grid grid-cols-1 md:grid-cols-12 gap-3">
          <div className="md:col-span-4">
            <input
              type="text"
              value={targetKey}
              onChange={e => setTargetKey(e.target.value)}
              placeholder="Key"
              className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-white focus:outline-none focus:border-purple-500 font-mono"
            />
          </div>
          <div className="md:col-span-5">
            <input
              type="text"
              value={writeValue}
              onChange={e => setWriteValue(e.target.value)}
              placeholder="Payload"
              className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-white focus:outline-none focus:border-purple-500 font-mono"
            />
          </div>
          <div className="md:col-span-3 flex gap-2">
            <button
              onClick={handleRead}
              disabled={isLoading}
              className="flex-1 bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-bold py-1.5 rounded-lg flex items-center justify-center gap-1 transition-colors"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
              Quorum Read
            </button>
            <button
              onClick={handleWrite}
              disabled={isLoading}
              className="flex-1 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold py-1.5 rounded-lg flex items-center justify-center gap-1 transition-colors"
            >
              <CheckCircle2 className="w-3.5 h-3.5" />
              Quorum Write
            </button>
          </div>
        </div>
      </div>

      {/* Results Dual Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Read Quorum Diagnostics */}
        {readResult && (
          <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-5 space-y-4">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-bold text-white flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-cyan-400" />
                Quorum Read Execution Verdict
              </h4>
              <span className="text-[10px] font-mono text-slate-400">
                Latency: {readResult.latencyMs}ms
              </span>
            </div>

            <div className="space-y-2 text-xs">
              <div className="flex justify-between py-1 border-b border-slate-800">
                <span className="text-slate-400">Resolved Monotonic Version:</span>
                <span className="font-mono text-cyan-300 font-bold">v{readResult.resolvedVersion}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-800">
                <span className="text-slate-400">Replica Consistency:</span>
                <span className={readResult.isConsistent ? 'text-emerald-400 font-semibold' : 'text-amber-400 font-semibold'}>
                  {readResult.isConsistent ? 'Consistent (All Versions Matched)' : 'Discrepancy Detected'}
                </span>
              </div>
              {readResult.readRepairTriggered && (
                <div className="p-2.5 rounded-lg bg-amber-950/60 border border-amber-500/40 text-amber-200 text-xs flex items-center gap-2">
                  <Wrench className="w-4 h-4 text-amber-400 shrink-0" />
                  <span>
                    <strong>Read Repair Triggered:</strong> Outdated replicas ({readResult.readRepairNodes.join(', ')}) updated synchronously.
                  </span>
                </div>
              )}
            </div>

            <div className="space-y-1.5">
              <span className="text-[11px] text-slate-400 font-medium">Replicas Queried:</span>
              <div className="space-y-1">
                {readResult.responses.map(resp => (
                  <div key={resp.nodeId} className="flex items-center justify-between bg-slate-950 rounded px-2.5 py-1 text-[11px] font-mono">
                    <span className="text-slate-300">{resp.nodeId}</span>
                    <span className="text-cyan-400">version: {resp.version}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Write Quorum Diagnostics */}
        {writeResult && (
          <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-5 space-y-4">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-bold text-white flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                Quorum Write Execution Verdict
              </h4>
              <span className="text-[10px] font-mono text-slate-400">
                Latency: {writeResult.latencyMs}ms
              </span>
            </div>

            <div className="space-y-2 text-xs">
              <div className="flex justify-between py-1 border-b border-slate-800">
                <span className="text-slate-400">Write Status:</span>
                <span className={writeResult.isSuccessful ? 'text-emerald-400 font-bold' : 'text-red-400 font-bold'}>
                  {writeResult.isSuccessful ? `QUORUM ACHIEVED (${writeResult.successfulWrites.length}/${writeResult.writeQuorum})` : 'QUORUM FAILED'}
                </span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-800">
                <span className="text-slate-400">Committed Version:</span>
                <span className="font-mono text-emerald-300 font-bold">v{writeResult.newVersion}</span>
              </div>
            </div>

            <div className="space-y-1.5">
              <span className="text-[11px] text-slate-400 font-medium">Target Replicas Acknowledged:</span>
              <div className="flex flex-wrap gap-1.5">
                {writeResult.nodesTargeted.map(nId => {
                  const acked = writeResult.successfulWrites.includes(nId)
                  return (
                    <span
                      key={nId}
                      className={`text-xs font-mono px-2 py-0.5 rounded border ${
                        acked
                          ? 'bg-emerald-950/80 border-emerald-500/40 text-emerald-300'
                          : 'bg-red-950/80 border-red-500/40 text-red-300'
                      }`}
                    >
                      {nId} {acked ? '✓ ACK' : '✗ FAIL'}
                    </span>
                  )
                })}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
