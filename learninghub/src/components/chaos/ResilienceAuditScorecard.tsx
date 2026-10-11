import React, { useState } from 'react'
import {
  Award,
  CheckCircle,
  ShieldCheck,
  Copy,
  Check,
  Activity,
  FileText,
  ListOrdered,
} from 'lucide-react'
import {
  ResilienceAuditScorecard as ResilienceScorecardType,
  ChaosTelemetryEvent,
} from '../../types/chaosCluster'

interface ResilienceAuditScorecardProps {
  scorecard: ResilienceScorecardType
  telemetryEvents?: ChaosTelemetryEvent[]
}

export const ResilienceAuditScorecard: React.FC<ResilienceAuditScorecardProps> = ({
  scorecard,
  telemetryEvents = [],
}) => {
  const [copiedDigest, setCopiedDigest] = useState(false)
  const [showTelemetry, setShowTelemetry] = useState(true)

  const handleCopyDigest = async () => {
    try {
      await navigator.clipboard.writeText(scorecard.cryptographicAuditDigest)
      setCopiedDigest(true)
      setTimeout(() => setCopiedDigest(false), 2000)
    } catch {
      // ignore
    }
  }

  const getGradeBadge = (grade: ResilienceScorecardType['overallResilienceGrade']) => {
    switch (grade) {
      case 'A+':
      case 'A':
        return 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
      case 'B':
        return 'bg-blue-500/10 text-blue-400 border-blue-500/30'
      case 'C':
        return 'bg-amber-500/10 text-amber-400 border-amber-500/30'
      case 'D':
      case 'F':
        return 'bg-rose-500/10 text-rose-400 border-rose-500/30'
      default:
        return 'bg-slate-500/10 text-slate-400 border-slate-500/30'
    }
  }

  const getSeverityBadge = (severity: ChaosTelemetryEvent['severity']) => {
    switch (severity) {
      case 'INFO':
        return 'bg-slate-800 text-slate-300 border-slate-700'
      case 'WARN':
        return 'bg-amber-500/10 text-amber-400 border-amber-500/20'
      case 'ERROR':
        return 'bg-rose-500/10 text-rose-400 border-rose-500/20'
      case 'CRITICAL':
        return 'bg-rose-600/20 text-rose-300 border-rose-600/40 font-bold'
    }
  }

  return (
    <div className="bg-slate-900/90 rounded-2xl border border-slate-800 p-5 shadow-xl space-y-5">
      {/* Header and Grade Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-800">
        <div>
          <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
            <Award className="w-4 h-4 text-amber-400" />
            Resilience Audit Scorecard & Post-Mortem
          </h3>
          <p className="text-xs text-slate-400 mt-0.5">
            Empirical stress analysis with fault isolation grading & cryptographic verification.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div
            className={`px-4 py-2 rounded-xl border text-xl font-black font-mono tracking-wider ${getGradeBadge(
              scorecard.overallResilienceGrade
            )}`}
          >
            Grade {scorecard.overallResilienceGrade}
          </div>
        </div>
      </div>

      {/* 4 Core Quantitative Metrics */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="p-3 rounded-xl bg-slate-950/70 border border-slate-800 space-y-1">
          <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">
            Availability SLA
          </span>
          <div className="text-lg font-mono font-bold text-white">
            {scorecard.availabilitySlaPercent.toFixed(1)}%
          </div>
          <div className="text-[10px] text-emerald-400 font-mono">Target: 99.90%</div>
        </div>

        <div className="p-3 rounded-xl bg-slate-950/70 border border-slate-800 space-y-1">
          <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">
            Blast Radius
          </span>
          <div className="text-lg font-mono font-bold text-amber-400">
            {scorecard.blastRadiusPercent.toFixed(1)}%
          </div>
          <div className="text-[10px] text-slate-400 font-mono">Cluster contained</div>
        </div>

        <div className="p-3 rounded-xl bg-slate-950/70 border border-slate-800 space-y-1">
          <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">
            MTTR (Recovery)
          </span>
          <div className="text-lg font-mono font-bold text-cyan-400">
            {scorecard.meanTimeToRecoverMs} ms
          </div>
          <div className="text-[10px] text-slate-400 font-mono">Failover latency</div>
        </div>

        <div className="p-3 rounded-xl bg-slate-950/70 border border-slate-800 space-y-1">
          <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">
            CB Effectiveness
          </span>
          <div className="text-lg font-mono font-bold text-purple-400">
            {scorecard.circuitBreakerEffectivenessPercent.toFixed(1)}%
          </div>
          <div className="text-[10px] text-emerald-400 font-mono">
            {scorecard.cascadingFailuresPrevented} Cascades Stopped
          </div>
        </div>
      </div>

      {/* Post-Mortem Narrative */}
      <div className="p-4 rounded-xl bg-slate-950/60 border border-slate-800 space-y-2">
        <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
          <FileText className="w-3.5 h-3.5 text-indigo-400" />
          Autonomous Post-Mortem Analysis
        </h4>
        <p className="text-xs text-slate-300 leading-relaxed font-sans">
          {scorecard.postMortemSummary}
        </p>
      </div>

      {/* Mitigation Recommendations */}
      <div className="p-4 rounded-xl bg-slate-950/60 border border-slate-800 space-y-2.5">
        <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
          <ListOrdered className="w-3.5 h-3.5 text-emerald-400" />
          Hardening & Mitigation Recommendations
        </h4>
        <ul className="space-y-1.5">
          {scorecard.mitigationRecommendations.map((rec, i) => (
            <li key={i} className="flex items-start gap-2 text-xs text-slate-300">
              <CheckCircle className="w-3.5 h-3.5 text-emerald-400 shrink-0 mt-0.5" />
              <span>{rec}</span>
            </li>
          ))}
        </ul>
      </div>

      {/* Cryptographic Digest Card */}
      <div className="p-3 rounded-xl bg-slate-950 border border-slate-800/90 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        <div className="flex items-center gap-2 overflow-hidden">
          <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0" />
          <div className="truncate">
            <span className="text-[10px] text-slate-500 font-mono block">
              CRYPTOGRAPHIC SHA-256 AUDIT DIGEST:
            </span>
            <span className="text-[11px] font-mono text-slate-300 select-all truncate block">
              {scorecard.cryptographicAuditDigest}
            </span>
          </div>
        </div>
        <button
          type="button"
          onClick={handleCopyDigest}
          className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-mono bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 transition-colors shrink-0"
        >
          {copiedDigest ? (
            <>
              <Check className="w-3 h-3 text-emerald-400" /> Copied
            </>
          ) : (
            <>
              <Copy className="w-3 h-3 text-slate-400" /> Copy Digest
            </>
          )}
        </button>
      </div>

      {/* Telemetry Stream Toggle */}
      {telemetryEvents.length > 0 && (
        <div className="space-y-2 pt-1 border-t border-slate-800/80">
          <div className="flex items-center justify-between">
            <button
              type="button"
              onClick={() => setShowTelemetry(!showTelemetry)}
              className="text-xs font-bold text-slate-400 uppercase tracking-wider hover:text-white flex items-center gap-1.5"
            >
              <Activity className="w-3.5 h-3.5 text-cyan-400" />
              Chaos Telemetry Timeline ({telemetryEvents.length} events)
            </button>
            <span className="text-[10px] text-slate-500 font-mono">
              {showTelemetry ? 'Click to collapse' : 'Click to expand'}
            </span>
          </div>

          {showTelemetry && (
            <div className="max-h-60 overflow-y-auto space-y-1.5 pr-1 font-mono text-xs">
              {telemetryEvents.map((evt, idx) => (
                <div
                  key={idx}
                  className="p-2 rounded-lg bg-slate-950/80 border border-slate-800/80 flex items-start justify-between gap-2"
                >
                  <div className="flex items-start gap-2 truncate">
                    <span
                      className={`text-[9px] px-1.5 py-0.5 rounded border shrink-0 ${getSeverityBadge(
                        evt.severity
                      )}`}
                    >
                      {evt.severity}
                    </span>
                    <span className="text-slate-500 shrink-0">+{evt.timestampOffsetMs}ms</span>
                    <span className="text-indigo-400 font-bold shrink-0">{evt.serviceId}:</span>
                    <span className="text-slate-300 truncate">{evt.message}</span>
                  </div>

                  <div className="text-[10px] text-slate-500 shrink-0 text-right">
                    <span>Avail: {evt.metricsSnapshot.availabilityPercent}%</span>
                    {evt.metricsSnapshot.circuitBreakerTripped && (
                      <span className="text-rose-400 font-bold ml-1.5">CB TRIPPED</span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
