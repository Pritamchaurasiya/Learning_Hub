import React, { useState } from 'react'
import {
  FileText,
  Copy,
  Check,
  ShieldCheck,
  Tag,
} from 'lucide-react'
import type { TraceAggregate } from '../../types/distributedTracing'

interface W3cTraceContextInspectorProps {
  trace: TraceAggregate
}

export const W3cTraceContextInspector: React.FC<W3cTraceContextInspectorProps> = ({
  trace,
}) => {
  const [copied, setCopied] = useState<string | null>(null)

  const handleCopy = (text: string, label: string) => {
    navigator.clipboard.writeText(text)
    setCopied(label)
    setTimeout(() => setCopied(null), 2500)
  }

  const { w3cTraceparent, baggage, auditDigest } = trace

  return (
    <div className="bg-white dark:bg-gray-850 rounded-2xl border border-gray-200 dark:border-gray-750 p-6 shadow-sm space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-2 bg-purple-50 dark:bg-purple-950/40 text-purple-600 dark:text-purple-400 rounded-xl">
              <FileText className="w-5 h-5" />
            </span>
            <h3 className="text-lg font-bold text-gray-900 dark:text-gray-100">
              W3C TraceContext & Baggage Header Propagation
            </h3>
          </div>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            Universal HTTP headers standardized by W3C for distributed context propagation across heterogeneous microservices.
          </p>
        </div>

        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-purple-50 dark:bg-purple-950/40 text-purple-700 dark:text-purple-300 font-mono text-xs font-semibold border border-purple-200 dark:border-purple-800">
          W3C Recommendation REC-trace-context
        </span>
      </div>

      {/* Raw Traceparent Header */}
      <div className="p-4 bg-gray-50 dark:bg-gray-800/60 rounded-xl border border-gray-200 dark:border-gray-700 space-y-3">
        <div className="flex items-center justify-between">
          <label className="text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400 font-mono">
            HTTP Header: traceparent
          </label>
          <button
            onClick={() => handleCopy(w3cTraceparent.rawHeader, 'traceparent')}
            className="flex items-center gap-1.5 text-xs font-medium text-indigo-600 dark:text-indigo-400 hover:underline"
          >
            {copied === 'traceparent' ? (
              <>
                <Check className="w-3.5 h-3.5 text-emerald-500" /> Copied!
              </>
            ) : (
              <>
                <Copy className="w-3.5 h-3.5" /> Copy Header
              </>
            )}
          </button>
        </div>

        <div className="p-3 bg-gray-900 text-gray-100 rounded-lg font-mono text-xs break-all select-all flex items-center justify-between">
          <span>{w3cTraceparent.rawHeader}</span>
        </div>
      </div>

      {/* Breakdown Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {/* Version */}
        <div className="p-4 bg-gray-50 dark:bg-gray-800/50 rounded-xl border border-gray-200 dark:border-gray-750 space-y-1">
          <span className="text-[10px] font-mono font-bold uppercase text-gray-400">
            Version (2 Hex)
          </span>
          <p className="font-mono font-black text-lg text-indigo-600 dark:text-indigo-400">
            {w3cTraceparent.version}
          </p>
          <p className="text-[11px] text-gray-500 dark:text-gray-400">
            Current specification version (`00`).
          </p>
        </div>

        {/* Trace ID */}
        <div className="p-4 bg-gray-50 dark:bg-gray-800/50 rounded-xl border border-gray-200 dark:border-gray-750 space-y-1 md:col-span-2">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-mono font-bold uppercase text-gray-400">
              Trace-Id (16 Bytes / 32 Hex)
            </span>
            <button
              onClick={() => handleCopy(w3cTraceparent.traceId, 'traceId')}
              className="text-[10px] text-indigo-600 dark:text-indigo-400 hover:underline flex items-center gap-1"
            >
              {copied === 'traceId' ? <Check className="w-3 h-3 text-emerald-500" /> : <Copy className="w-3 h-3" />}
            </button>
          </div>
          <p className="font-mono font-bold text-sm text-gray-900 dark:text-gray-100 break-all select-all">
            {w3cTraceparent.traceId}
          </p>
          <p className="text-[11px] text-gray-500 dark:text-gray-400">
            Globally unique identifier across the entire request journey.
          </p>
        </div>

        {/* Flags */}
        <div className="p-4 bg-gray-50 dark:bg-gray-800/50 rounded-xl border border-gray-200 dark:border-gray-750 space-y-1">
          <span className="text-[10px] font-mono font-bold uppercase text-gray-400">
            Trace-Flags (8-bit)
          </span>
          <p className="font-mono font-black text-lg text-emerald-600 dark:text-emerald-400">
            {w3cTraceparent.traceFlags}{' '}
            <span className="text-xs font-medium text-gray-500">
              ({w3cTraceparent.traceFlags === '01' ? 'Sampled' : 'Not Sampled'})
            </span>
          </p>
          <p className="text-[11px] text-gray-500 dark:text-gray-400">
            `01` records spans in telemetry storage.
          </p>
        </div>
      </div>

      {/* Baggage Section */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h4 className="text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400 flex items-center gap-1.5">
            <Tag className="w-4 h-4 text-purple-500" />
            Distributed Baggage Context (Cross-Cutting Metadata)
          </h4>
          <span className="text-xs text-gray-400 font-mono">
            {Object.keys(baggage).length} key-value pair(s)
          </span>
        </div>

        <p className="text-xs text-gray-500 dark:text-gray-400">
          Baggage allows business metadata (e.g. tenant, user role, transaction origin) to traverse all RPC and message queue hops without re-authenticating at every service boundary.
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {Object.entries(baggage).map(([key, val]) => (
            <div
              key={key}
              className="p-3 bg-purple-50/40 dark:bg-purple-950/20 rounded-xl border border-purple-100 dark:border-purple-900/40 flex items-center justify-between"
            >
              <div className="space-y-0.5">
                <span className="text-[10px] font-mono uppercase text-purple-700 dark:text-purple-300 font-bold">
                  {key}
                </span>
                <p className="font-mono font-semibold text-xs text-gray-900 dark:text-gray-100">
                  {val}
                </p>
              </div>
              <button
                onClick={() => handleCopy(`${key}=${val}`, key)}
                className="p-1 hover:bg-purple-200 dark:hover:bg-purple-900 rounded text-purple-600 dark:text-purple-400"
              >
                {copied === key ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* Cryptographic Trace Integrity Digest */}
      <div className="p-4 bg-emerald-50/50 dark:bg-emerald-950/20 rounded-xl border border-emerald-200 dark:border-emerald-900/40 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="flex items-start gap-3">
          <ShieldCheck className="w-5 h-5 text-emerald-600 dark:text-emerald-400 flex-shrink-0 mt-0.5" />
          <div>
            <h4 className="text-xs font-bold text-emerald-900 dark:text-emerald-200 uppercase tracking-wider">
              Cryptographic Trace Audit Digest (SHA-256)
            </h4>
            <p className="text-xs font-mono text-emerald-700 dark:text-emerald-300 break-all select-all mt-0.5">
              {auditDigest}
            </p>
            <p className="text-[11px] text-emerald-600 dark:text-emerald-400 mt-1">
              Deterministic hash computed across span topologies to ensure immutable, tamper-evident audit trails for SOC2 and ISO-27001 compliance.
            </p>
          </div>
        </div>

        <button
          onClick={() => handleCopy(auditDigest, 'digest')}
          className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-mono text-xs font-medium flex items-center gap-1.5 flex-shrink-0"
        >
          {copied === 'digest' ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
          Copy Digest
        </button>
      </div>
    </div>
  )
}
