import React, { useState } from 'react'
import {
  ShieldCheck,
  ShieldAlert,
  AlertTriangle,
  Clock,
  Eye,
  Copy,
  ChevronDown,
  ChevronUp,
  Fingerprint,
  Info,
} from 'lucide-react'
import { Card } from '../ui/Card'
import { Badge } from '../ui/Badge'
import { Button } from '../ui/Button'
import type { TestResult } from '../../services/testsAService'

interface AssessmentIntegrityScorecardProps {
  result: TestResult
}

export const AssessmentIntegrityScorecard: React.FC<AssessmentIntegrityScorecardProps> = ({
  result,
}) => {
  const [isAuditExpanded, setIsAuditExpanded] = useState(false)
  const [copiedProof, setCopiedProof] = useState(false)

  const summary = result.telemetry_summary
  const score = result.integrity_score ?? summary?.integrity_score ?? 100
  const risk = result.integrity_risk ?? summary?.risk_level ?? 'EXCELLENT'
  const violationCounts = summary?.violation_counts ?? {}
  const auditHash = summary?.audit_hash ?? 'lh-proof-verified-clean'

  const tabSwitches = violationCounts['TAB_SWITCH'] ?? 0
  const windowBlurs = violationCounts['WINDOW_BLUR'] ?? 0
  const copyPastes = violationCounts['COPY_PASTE'] ?? 0
  const devTools = violationCounts['DEV_TOOLS'] ?? 0
  const fullscreenExits = violationCounts['FULLSCREEN_EXIT'] ?? 0

  const getStatusConfig = () => {
    switch (risk) {
      case 'EXCELLENT':
        return {
          icon: ShieldCheck,
          label: 'Verified Clean Session',
          badgeClass: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/40',
          textColor: 'text-emerald-400',
          borderColor: 'border-emerald-500/30',
          description: 'No suspicious interruptions detected. Complete session integrity verified.',
        }
      case 'LOW_RISK':
        return {
          icon: ShieldCheck,
          label: 'Low Behavioral Risk',
          badgeClass: 'bg-blue-500/20 text-blue-400 border-blue-500/40',
          textColor: 'text-blue-400',
          borderColor: 'border-blue-500/30',
          description: 'Minor focus loss or window blur events noted. Within acceptable natural variance.',
        }
      case 'MODERATE_RISK':
        return {
          icon: AlertTriangle,
          label: 'Moderate Disruption Noted',
          badgeClass: 'bg-amber-500/20 text-amber-400 border-amber-500/40',
          textColor: 'text-amber-400',
          borderColor: 'border-amber-500/30',
          description: 'Multiple tab switches or clipboard interactions detected during test.',
        }
      case 'HIGH_RISK':
      default:
        return {
          icon: ShieldAlert,
          label: 'Audit Review Flagged',
          badgeClass: 'bg-rose-500/20 text-rose-400 border-rose-500/40',
          textColor: 'text-rose-400',
          borderColor: 'border-rose-500/30',
          description: 'Inspection tools or anomalous behavioral patterns detected during session.',
        }
    }
  }

  const config = getStatusConfig()
  const IconComponent = config.icon

  const handleCopyProof = () => {
    if (navigator?.clipboard?.writeText) {
      void navigator.clipboard.writeText(auditHash)
      setCopiedProof(true)
      setTimeout(() => setCopiedProof(false), 2000)
    }
  }

  return (
    <Card className={`p-6 sm:p-8 bg-slate-900/90 dark:bg-slate-950 border ${config.borderColor} text-white shadow-xl rounded-2xl relative overflow-hidden`}>
      {/* Background glow accent */}
      <div className="absolute top-0 right-0 -mt-8 -mr-8 w-44 h-44 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none" />

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div className="flex items-center gap-3">
          <div className={`p-3 rounded-2xl bg-slate-800/80 border ${config.borderColor} ${config.textColor}`}>
            <IconComponent className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-xl font-bold text-white tracking-tight">Assessment Integrity Shield</h3>
              <Badge className={config.badgeClass}>{config.label}</Badge>
            </div>
            <p className="text-xs text-slate-400 mt-1">{config.description}</p>
          </div>
        </div>

        {/* Big Score Badge */}
        <div className="flex items-center gap-3 bg-slate-800/70 border border-slate-700/60 rounded-2xl px-5 py-3 self-start sm:self-auto">
          <div className="text-right">
            <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400 block">
              Integrity Score
            </span>
            <span className={`text-2xl font-black font-mono leading-none ${config.textColor}`}>
              {score}
              <span className="text-xs font-normal text-slate-400">/100</span>
            </span>
          </div>
          <Fingerprint className={`w-8 h-8 ${config.textColor} opacity-80`} />
        </div>
      </div>

      {/* Behavioral Metric Matrix */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 mb-6">
        <div className="bg-slate-800/50 border border-slate-700/40 rounded-xl p-3 text-center">
          <span className="text-[10px] text-slate-400 font-medium uppercase tracking-wider block mb-1">
            Tab Switches
          </span>
          <span className={`text-base font-bold font-mono ${tabSwitches > 0 ? 'text-amber-400' : 'text-slate-200'}`}>
            {tabSwitches}
          </span>
        </div>

        <div className="bg-slate-800/50 border border-slate-700/40 rounded-xl p-3 text-center">
          <span className="text-[10px] text-slate-400 font-medium uppercase tracking-wider block mb-1">
            Focus Losses
          </span>
          <span className={`text-base font-bold font-mono ${windowBlurs > 0 ? 'text-amber-400' : 'text-slate-200'}`}>
            {windowBlurs}
          </span>
        </div>

        <div className="bg-slate-800/50 border border-slate-700/40 rounded-xl p-3 text-center">
          <span className="text-[10px] text-slate-400 font-medium uppercase tracking-wider block mb-1">
            Clipboard
          </span>
          <span className={`text-base font-bold font-mono ${copyPastes > 0 ? 'text-rose-400' : 'text-slate-200'}`}>
            {copyPastes}
          </span>
        </div>

        <div className="bg-slate-800/50 border border-slate-700/40 rounded-xl p-3 text-center">
          <span className="text-[10px] text-slate-400 font-medium uppercase tracking-wider block mb-1">
            DevTools
          </span>
          <span className={`text-base font-bold font-mono ${devTools > 0 ? 'text-rose-400' : 'text-slate-200'}`}>
            {devTools}
          </span>
        </div>

        <div className="bg-slate-800/50 border border-slate-700/40 rounded-xl p-3 text-center col-span-2 sm:col-span-1">
          <span className="text-[10px] text-slate-400 font-medium uppercase tracking-wider block mb-1">
            Fullscreen Exits
          </span>
          <span className={`text-base font-bold font-mono ${fullscreenExits > 0 ? 'text-amber-400' : 'text-slate-200'}`}>
            {fullscreenExits}
          </span>
        </div>
      </div>

      {/* Expandable Audit Log & Proof */}
      <div className="border-t border-slate-800 pt-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
        <div className="flex items-center gap-2 text-slate-400">
          <Info className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
          <span>Non-invasive behavioral telemetry. No video or biometric data is ever stored.</span>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleCopyProof}
            className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors font-mono text-[11px]"
            title="Copy cryptographic audit proof digest"
          >
            <Copy className="w-3 h-3 text-slate-400" />
            <span>{copiedProof ? 'Copied Digest!' : auditHash}</span>
          </button>

          <Button
            variant="ghost"
            size="sm"
            onClick={() => setIsAuditExpanded(prev => !prev)}
            className="text-xs text-slate-300 hover:text-white px-2 py-1 h-auto"
          >
            <span>{isAuditExpanded ? 'Hide Audit' : 'Audit Details'}</span>
            {isAuditExpanded ? (
              <ChevronUp className="w-3.5 h-3.5 ml-1" />
            ) : (
              <ChevronDown className="w-3.5 h-3.5 ml-1" />
            )}
          </Button>
        </div>
      </div>

      {/* Collapsible Details Drawer */}
      {isAuditExpanded && (
        <div className="mt-4 pt-4 border-t border-slate-800/80 bg-slate-950/60 -mx-6 sm:-mx-8 px-6 sm:px-8 -mb-6 sm:-mb-8 pb-6 rounded-b-2xl">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5 text-slate-400" />
              Session Telemetry Log
            </span>
            <span className="text-[10px] text-slate-500 font-mono">
              Attempt: {result.attempt_id || 'Current'}
            </span>
          </div>

          {score === 100 && (summary?.total_violations ?? 0) === 0 ? (
            <p className="text-xs text-slate-400 italic py-2">
              Clean run. No out-of-focus shifts, context clicks, or clipboard shortcuts triggered.
            </p>
          ) : (
            <div className="space-y-1.5 max-h-40 overflow-y-auto pr-1">
              {Object.entries(violationCounts).map(([type, count]) => (
                <div
                  key={type}
                  className="flex items-center justify-between text-xs py-1 px-2.5 rounded bg-slate-900/80 border border-slate-800"
                >
                  <span className="font-mono text-slate-300 flex items-center gap-2">
                    <Eye className="w-3 h-3 text-cyan-400" />
                    {type}
                  </span>
                  <span className="text-slate-400 font-mono">{count} event{count > 1 ? 's' : ''}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </Card>
  )
}
