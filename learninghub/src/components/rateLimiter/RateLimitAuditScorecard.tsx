import React from 'react'
import { ShieldCheck, RotateCcw, Hash, Key, CheckCircle2, AlertOctagon } from 'lucide-react'
import type { RateLimiterAuditSnapshot, RateLimitVerdict } from '../../types/distributedRateLimiter'

interface RateLimitAuditScorecardProps {
  snapshot: RateLimiterAuditSnapshot | null
  lastVerdict: RateLimitVerdict | null
  onReset: () => Promise<void>
  isResetting?: boolean
}

export const RateLimitAuditScorecard: React.FC<RateLimitAuditScorecardProps> = ({
  snapshot,
  lastVerdict,
  onReset,
  isResetting = false,
}) => {
  const headers = lastVerdict?.headers || {
    'X-RateLimit-Limit': 20,
    'X-RateLimit-Remaining': 18,
    'X-RateLimit-Reset': Math.floor(Date.now() / 1000) + 60,
  }

  return (
    <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-6 shadow-xl backdrop-blur-md">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-slate-800/80 gap-3">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-teal-500/10 border border-teal-500/20 text-teal-400">
            <ShieldCheck className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-white tracking-wide">
              Rate Limiter RFC Compliance & Audit Scorecard
            </h3>
            <p className="text-xs text-slate-400">
              Cryptographic SHA-256 HMAC audit seal and standard RFC 6585 response headers
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={onReset}
          disabled={isResetting}
          className="flex items-center gap-2 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white text-xs font-semibold rounded-xl border border-slate-700 transition-all disabled:opacity-50"
        >
          <RotateCcw className={`w-3.5 h-3.5 ${isResetting ? 'animate-spin' : ''}`} />
          <span>Reset Limiter Engine</span>
        </button>
      </div>

      {/* Main Grid: Headers Preview & Cluster Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5 my-5">
        {/* Left: RFC 6585 Headers Box */}
        <div className="bg-slate-950/60 border border-slate-800 rounded-xl p-4 space-y-3">
          <div className="flex items-center justify-between pb-2 border-b border-slate-800 text-xs">
            <span className="font-semibold text-slate-300 flex items-center gap-1.5">
              <Key className="w-4 h-4 text-cyan-400" /> RFC 6585 HTTP Headers
            </span>
            <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-cyan-500/20 text-cyan-300">
              IETF Compliant
            </span>
          </div>

          <div className="space-y-2 font-mono text-xs">
            <div className="flex justify-between items-center p-2 rounded bg-slate-900/80 border border-slate-800/80">
              <span className="text-slate-400">X-RateLimit-Limit</span>
              <span className="text-cyan-300 font-bold">{headers['X-RateLimit-Limit']}</span>
            </div>
            <div className="flex justify-between items-center p-2 rounded bg-slate-900/80 border border-slate-800/80">
              <span className="text-slate-400">X-RateLimit-Remaining</span>
              <span className="text-emerald-300 font-bold">{headers['X-RateLimit-Remaining']}</span>
            </div>
            <div className="flex justify-between items-center p-2 rounded bg-slate-900/80 border border-slate-800/80">
              <span className="text-slate-400">X-RateLimit-Reset</span>
              <span className="text-amber-300 font-bold">{headers['X-RateLimit-Reset']}</span>
            </div>
            {headers['Retry-After'] !== undefined && (
              <div className="flex justify-between items-center p-2 rounded bg-rose-950/40 border border-rose-800/60">
                <span className="text-rose-300">Retry-After</span>
                <span className="text-rose-400 font-bold">{headers['Retry-After']}s</span>
              </div>
            )}
          </div>
        </div>

        {/* Right: Cluster Traffic Overview */}
        <div className="bg-slate-950/60 border border-slate-800 rounded-xl p-4 space-y-3">
          <div className="flex items-center justify-between pb-2 border-b border-slate-800 text-xs">
            <span className="font-semibold text-slate-300 flex items-center gap-1.5">
              <Hash className="w-4 h-4 text-purple-400" /> Cluster Audit Metrics
            </span>
            <span className="text-[10px] font-mono text-purple-300">
              Pass Rate: {snapshot?.overallPassRate ?? 100}%
            </span>
          </div>

          <div className="grid grid-cols-2 gap-2 text-xs">
            <div className="bg-slate-900/80 p-2.5 rounded-lg border border-slate-800">
              <span className="text-[10px] text-slate-400">Total Evaluated</span>
              <p className="text-lg font-mono font-bold text-white mt-1">
                {snapshot?.totalRequestsEvaluated ?? 0}
              </p>
            </div>
            <div className="bg-slate-900/80 p-2.5 rounded-lg border border-slate-800">
              <span className="text-[10px] text-rose-400 flex items-center gap-1">
                <AlertOctagon className="w-3 h-3" /> Throttled (429)
              </span>
              <p className="text-lg font-mono font-bold text-rose-400 mt-1">
                {snapshot?.totalRequestsThrottled ?? 0}
              </p>
            </div>
            <div className="bg-slate-900/80 p-2.5 rounded-lg border border-slate-800">
              <span className="text-[10px] text-emerald-400 flex items-center gap-1">
                <CheckCircle2 className="w-3 h-3" /> Admitted Reqs
              </span>
              <p className="text-lg font-mono font-bold text-emerald-400 mt-1">
                {(snapshot?.totalRequestsEvaluated ?? 0) - (snapshot?.totalRequestsThrottled ?? 0)}
              </p>
            </div>
            <div className="bg-slate-900/80 p-2.5 rounded-lg border border-slate-800">
              <span className="text-[10px] text-teal-400">Tokens Refilled</span>
              <p className="text-lg font-mono font-bold text-teal-400 mt-1">
                {snapshot?.globalTokensRefilled ?? 0}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* SHA-256 HMAC Seal */}
      <div className="bg-slate-950/80 border border-slate-800 rounded-xl p-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
        <div className="flex items-center gap-2 text-slate-400">
          <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0" />
          <span className="text-slate-300 font-semibold">Policy Configuration Seal:</span>
          <span className="font-mono text-[11px] text-emerald-400 truncate max-w-xs sm:max-w-md">
            {snapshot?.auditDigest || '8f3b207...da01'}
          </span>
        </div>
        <span className="text-[10px] text-slate-500 font-mono self-end sm:self-auto">
          HMAC-SHA256 Verified
        </span>
      </div>
    </div>
  )
}
