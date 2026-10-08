import React, { useEffect, useState } from 'react'
import { ProctoringSummaryReport } from '../../types/proctoring'
import { proctoringService } from '../../services/proctoringService'
import {
  ShieldCheck,
  ShieldAlert,
  X,
  FileCheck,
  Fingerprint,
} from 'lucide-react'

interface ProctoringReportModalProps {
  sessionId: string
  isOpen: boolean
  onClose: () => void
}

export const ProctoringReportModal: React.FC<ProctoringReportModalProps> = ({
  sessionId,
  isOpen,
  onClose,
}) => {
  const [report, setReport] = useState<ProctoringSummaryReport | null>(null)
  const [loading, setLoading] = useState<boolean>(true)

  useEffect(() => {
    if (!isOpen) return
    setLoading(true)
    proctoringService
      .finalizeSession(sessionId)
      .then(res => {
        setReport(res)
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }, [sessionId, isOpen])

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-2xl w-full p-6 space-y-6 shadow-2xl text-slate-200">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-800 pb-4">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400">
              <FileCheck className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white">AI Proctoring Integrity Audit</h2>
              <p className="text-xs text-slate-400 font-mono">Session ID: {sessionId}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {loading || !report ? (
          <div className="py-12 text-center text-slate-400 text-sm">
            Generating cryptographic audit report...
          </div>
        ) : (
          <div className="space-y-5">
            {/* Verdict Card */}
            <div
              className={`p-4 rounded-2xl border flex items-center justify-between ${
                report.verdict === 'VERIFIED_CLEAN'
                  ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-300'
                  : report.verdict === 'FLAGGED_FOR_MANUAL_REVIEW'
                  ? 'bg-amber-500/10 border-amber-500/20 text-amber-300'
                  : 'bg-rose-500/10 border-rose-500/20 text-rose-300'
              }`}
            >
              <div className="flex items-center gap-3">
                {report.verdict === 'VERIFIED_CLEAN' ? (
                  <ShieldCheck className="w-7 h-7 text-emerald-400" />
                ) : (
                  <ShieldAlert className="w-7 h-7 text-amber-400" />
                )}
                <div>
                  <div className="text-xs font-semibold uppercase tracking-wider opacity-80">
                    Official Exam Verdict
                  </div>
                  <div className="text-base font-extrabold text-white">
                    {report.verdict.replace(/_/g, ' ')}
                  </div>
                </div>
              </div>
              <div className="text-right">
                <div className="text-2xl font-black text-white">{report.finalIntegrityScore}%</div>
                <div className="text-[10px] font-mono text-slate-400">Integrity Score</div>
              </div>
            </div>

            {/* Metrics Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="bg-slate-950 p-3 rounded-xl border border-slate-800 text-center">
                <div className="text-xs text-slate-400">Duration</div>
                <div className="text-base font-bold text-white mt-0.5">{report.durationMinutes}m</div>
              </div>
              <div className="bg-slate-950 p-3 rounded-xl border border-slate-800 text-center">
                <div className="text-xs text-slate-400">Gaze Compliance</div>
                <div className="text-base font-bold text-emerald-400 mt-0.5">
                  {report.gazeCompliancePercentage}%
                </div>
              </div>
              <div className="bg-slate-950 p-3 rounded-xl border border-slate-800 text-center">
                <div className="text-xs text-slate-400">Acoustic Score</div>
                <div className="text-base font-bold text-sky-400 mt-0.5">
                  {report.acousticCompliancePercentage}%
                </div>
              </div>
              <div className="bg-slate-950 p-3 rounded-xl border border-slate-800 text-center">
                <div className="text-xs text-slate-400">High Risk Events</div>
                <div
                  className={`text-base font-bold mt-0.5 ${
                    report.highSeverityCount === 0 ? 'text-emerald-400' : 'text-rose-400'
                  }`}
                >
                  {report.highSeverityCount}
                </div>
              </div>
            </div>

            {/* Infraction Breakdown */}
            <div className="space-y-2">
              <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                Infraction Type Breakdown
              </h4>
              <div className="grid grid-cols-2 gap-2 text-xs font-mono">
                {Object.entries(report.incidentBreakdown).map(([type, count]) => (
                  <div
                    key={type}
                    className="p-2 rounded-xl bg-slate-950 border border-slate-800 flex justify-between items-center"
                  >
                    <span className="text-slate-400 truncate pr-2">{type.replace(/_/g, ' ')}</span>
                    <span
                      className={`font-bold px-1.5 py-0.5 rounded ${
                        count > 0 ? 'bg-amber-500/20 text-amber-300' : 'text-slate-600'
                      }`}
                    >
                      {count}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Cryptographic Audit Hash */}
            <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 space-y-1">
              <div className="flex items-center gap-1.5 text-xs text-slate-400">
                <Fingerprint className="w-3.5 h-3.5 text-purple-400" />
                <span>HMAC-SHA256 Cryptographic Audit Proof</span>
              </div>
              <code className="text-[11px] text-purple-300 font-mono break-all select-all block">
                {report.cryptographicAuditHash}
              </code>
            </div>

            {/* Close Button */}
            <button
              onClick={onClose}
              className="w-full py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs transition-colors"
            >
              Acknowledge & Close Report
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
