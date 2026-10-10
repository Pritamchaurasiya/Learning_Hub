import React, { useState } from 'react'
import {
  X,
  Copy,
  Check,
  Download,
  ShieldCheck,
  FileText,
  Users,
} from 'lucide-react'
import { ArchitectureRFC } from '../../types/agentDebate'
import { agentDebateService } from '../../services/agentDebateService'

interface ConsensusRfcModalProps {
  rfc: ArchitectureRFC | null
  isOpen: boolean
  onClose: () => void
}

export const ConsensusRfcModal: React.FC<ConsensusRfcModalProps> = ({
  rfc,
  isOpen,
  onClose,
}) => {
  const [copied, setCopied] = useState(false)

  if (!isOpen || !rfc) return null

  const markdownContent = agentDebateService.exportRfcMarkdown(rfc)

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(markdownContent)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      // ignore
    }
  }

  const handleDownload = () => {
    const blob = new Blob([markdownContent], { type: 'text/markdown;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `${rfc.rfcId.toLowerCase()}-architecture-consensus.md`
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-4xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden">
        {/* Modal Header */}
        <div className="flex items-center justify-between p-5 border-b border-slate-800 bg-slate-950/60">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400">
              <FileText className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-mono text-xs font-bold text-indigo-400">{rfc.rfcId}</span>
                <span className="text-xs px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-bold uppercase">
                  {rfc.status.replace(/_/g, ' ')}
                </span>
              </div>
              <h2 className="text-base sm:text-lg font-bold text-white tracking-tight mt-0.5 line-clamp-1">
                {rfc.title}
              </h2>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleCopy}
              className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition text-xs font-medium flex items-center gap-1.5 border border-slate-700"
              title="Copy Markdown to Clipboard"
            >
              {copied ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
              <span className="hidden sm:inline">{copied ? 'Copied' : 'Copy RFC'}</span>
            </button>
            <button
              onClick={handleDownload}
              className="p-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white transition text-xs font-medium flex items-center gap-1.5 shadow-lg shadow-indigo-600/30"
              title="Download Markdown Document"
            >
              <Download className="w-4 h-4" />
              <span className="hidden sm:inline">Download</span>
            </button>
            <button
              onClick={onClose}
              className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition"
              aria-label="Close modal"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6 custom-scrollbar text-sm text-slate-300">
          {/* Executive Summary */}
          <div className="bg-slate-950/70 p-4 rounded-2xl border border-slate-800 space-y-2">
            <div className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-2">
              <Users className="w-4 h-4 text-indigo-400" /> Council Executive Summary
            </div>
            <p className="text-slate-200 leading-relaxed text-xs sm:text-sm">
              {rfc.executiveSummary}
            </p>
          </div>

          {/* Cryptographic Approval Seal */}
          <div className="p-3.5 rounded-xl bg-indigo-950/20 border border-indigo-500/20 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
            <div className="flex items-center gap-2 text-indigo-300 font-medium">
              <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>Cryptographic SHA-256 Approval Digest:</span>
            </div>
            <span className="font-mono text-[11px] text-slate-400 truncate max-w-sm bg-slate-950/80 px-2 py-1 rounded border border-slate-800">
              {rfc.cryptographicApprovalHash}
            </span>
          </div>

          {/* Architectural Decision Records (ADRs) */}
          <div className="space-y-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">
              Formal Architectural Decisions (ADRs)
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {rfc.architecturalDecisions.map((adr, index) => (
                <div
                  key={index}
                  className="p-3.5 rounded-xl bg-slate-950/60 border border-slate-800/80 space-y-1.5"
                >
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-mono text-indigo-400 font-bold">ADR-{index + 1}</span>
                    <span className="text-[11px] font-semibold text-slate-400 bg-slate-800/80 px-2 py-0.5 rounded">
                      {adr.champion}
                    </span>
                  </div>
                  <div className="font-bold text-white text-xs">{adr.decision}</div>
                  <p className="text-xs text-slate-400 leading-relaxed">{adr.rationale}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Critical Mitigations */}
          <div className="space-y-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">
              Mandatory Security & Reliability Mitigations
            </h3>
            <div className="space-y-2">
              {rfc.criticalMitigations.map((mit, index) => (
                <div
                  key={index}
                  className="p-3 rounded-xl bg-slate-950/40 border border-slate-800 text-xs flex flex-col sm:flex-row sm:items-center justify-between gap-2"
                >
                  <div className="space-y-0.5">
                    <span className="font-semibold text-rose-300">Risk: {mit.risk}</span>
                    <p className="text-slate-400">{mit.mitigation}</p>
                  </div>
                  <span className="text-[11px] font-mono text-slate-400 shrink-0 bg-slate-800 px-2.5 py-1 rounded border border-slate-700">
                    Lead: {mit.assignedLead}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="p-4 border-t border-slate-800 bg-slate-950/70 flex items-center justify-between text-xs text-slate-500">
          <span>Signatories: {rfc.authorCouncil.join(', ')}</span>
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold transition"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  )
}
