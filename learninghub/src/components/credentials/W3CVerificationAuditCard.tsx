import React, { useState } from 'react'
import {
  ShieldCheck,
  CheckCircle2,
  XCircle,
  FileCode,
  Download,
  Copy,
  Check,
  Share2,
  ExternalLink,
  Lock,
  Layers,
  Award,
} from 'lucide-react'
import type { CredentialVerificationResult } from '../../types/credentials'
import { verifiableCredentialService } from '../../services/verifiableCredentialService'

interface Props {
  result: CredentialVerificationResult
  rawCredential?: any
}

export const W3CVerificationAuditCard: React.FC<Props> = ({ result, rawCredential }) => {
  const [showRawJson, setShowRawJson] = useState(false)
  const [copiedLink, setCopiedLink] = useState(false)
  const [copiedJson, setCopiedJson] = useState(false)

  const handleCopyLink = () => {
    void navigator.clipboard.writeText(window.location.href)
    setCopiedLink(true)
    setTimeout(() => setCopiedLink(false), 2000)
  }

  const handleCopyJson = () => {
    const jsonStr = JSON.stringify(rawCredential || result, null, 2)
    void navigator.clipboard.writeText(jsonStr)
    setCopiedJson(true)
    setTimeout(() => setCopiedJson(false), 2000)
  }

  const handleDownloadSvg = () => {
    if (rawCredential) {
      const svg = verifiableCredentialService.generateCertificateSvg(rawCredential)
      const blob = new Blob([svg], { type: 'image/svg+xml' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `credential-${result.credentialId.replace(/[^a-zA-Z0-9-]/g, '_')}.svg`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
    }
  }

  const handleDownloadJson = () => {
    if (rawCredential) {
      verifiableCredentialService.downloadJson(rawCredential)
    }
  }

  return (
    <div className="bg-card border border-border/80 rounded-2xl shadow-xl overflow-hidden transition-all">
      {/* Top Banner Status */}
      <div
        className={`px-6 py-5 flex items-center justify-between border-b ${
          result.valid
            ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-600 dark:text-emerald-400'
            : 'bg-rose-500/10 border-rose-500/20 text-rose-600 dark:text-rose-400'
        }`}
      >
        <div className="flex items-center gap-3">
          <div
            className={`p-2.5 rounded-xl ${
              result.valid ? 'bg-emerald-500/20 text-emerald-600 dark:text-emerald-300' : 'bg-rose-500/20 text-rose-600'
            }`}
          >
            {result.valid ? <ShieldCheck className="w-6 h-6" /> : <XCircle className="w-6 h-6" />}
          </div>
          <div>
            <h3 className="font-bold text-base sm:text-lg text-foreground">
              {result.valid
                ? 'W3C Cryptographically Verified Credential'
                : 'Cryptographic Verification Failure'}
            </h3>
            <p className="text-xs sm:text-sm text-muted-foreground">
              {result.auditReport.summary}
            </p>
          </div>
        </div>

        <div className="hidden sm:flex items-center gap-2">
          <button
            type="button"
            onClick={handleCopyLink}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-background hover:bg-muted text-foreground border border-border transition-colors shadow-xs"
          >
            {copiedLink ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Share2 className="w-3.5 h-3.5" />}
            {copiedLink ? 'Copied' : 'Share'}
          </button>
        </div>
      </div>

      {/* Main Achievement Summary */}
      <div className="p-6 sm:p-8 space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 bg-muted/30 p-5 rounded-xl border border-border/60">
          <div>
            <span className="text-xs font-bold text-primary-500 tracking-wider uppercase">
              {result.subject.achievementType.replace('_', ' ')}
            </span>
            <h2 className="text-xl font-extrabold text-foreground mt-1">
              {result.subject.achievementTitle}
            </h2>
            <p className="text-sm text-muted-foreground mt-1">
              Awarded to <span className="font-semibold text-foreground">{result.subject.studentName}</span>
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3 md:justify-end">
            {result.subject.percentileRank !== undefined && (
              <div className="px-4 py-2 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-600 dark:text-amber-400">
                <div className="text-xs font-semibold uppercase">Percentile</div>
                <div className="text-lg font-black">{result.subject.percentileRank}%ile</div>
              </div>
            )}
            {result.subject.score !== undefined && (
              <div className="px-4 py-2 rounded-xl bg-primary-500/10 border border-primary-500/20 text-primary-600 dark:text-primary-400">
                <div className="text-xs font-semibold uppercase">Score</div>
                <div className="text-lg font-black">{result.subject.score} pts</div>
              </div>
            )}
            <div className="px-4 py-2 rounded-xl bg-slate-500/10 border border-slate-500/20 text-muted-foreground">
              <div className="text-xs font-semibold uppercase">Issued</div>
              <div className="text-xs font-bold text-foreground">
                {result.issuanceDate ? new Date(result.issuanceDate).toLocaleDateString() : 'N/A'}
              </div>
            </div>
          </div>
        </div>

        {/* 6-Point Cryptographic Audit Checklist */}
        <div className="space-y-3">
          <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
            <Lock className="w-3.5 h-3.5 text-primary-500" />
            Cryptographic Integrity Audit (6 Invariants)
          </h4>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {result.checks.map((check, idx) => (
              <div
                key={idx}
                className="p-3.5 rounded-xl border border-border/70 bg-card flex items-start gap-3 shadow-xs"
              >
                <div className="mt-0.5">
                  {check.passed ? (
                    <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                  ) : (
                    <XCircle className="w-4 h-4 text-rose-500" />
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="text-xs font-bold text-foreground">{check.name}</div>
                  <div className="text-xs text-muted-foreground truncate" title={check.details}>
                    {check.details}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Decentralized Identifiers & Anchoring Breakdown */}
        <div className="bg-muted/40 p-5 rounded-xl border border-border/70 space-y-3 font-mono text-xs">
          <div className="flex items-center justify-between border-b border-border/50 pb-2">
            <span className="text-muted-foreground flex items-center gap-1.5">
              <Layers className="w-3.5 h-3.5 text-primary-500" />
              Issuer DID:
            </span>
            <span className="font-semibold text-foreground truncate max-w-[280px] sm:max-w-md">
              {result.issuer.id}
            </span>
          </div>

          <div className="flex items-center justify-between border-b border-border/50 pb-2">
            <span className="text-muted-foreground">Subject DID:</span>
            <span className="font-semibold text-foreground truncate max-w-[280px] sm:max-w-md">
              {result.subject.id}
            </span>
          </div>

          <div className="flex items-center justify-between">
            <span className="text-muted-foreground">Credential ID:</span>
            <span className="font-semibold text-primary-500 truncate max-w-[280px] sm:max-w-md">
              {result.credentialId}
            </span>
          </div>
        </div>

        {/* Action Controls & Raw Inspector */}
        <div className="pt-2 flex flex-wrap items-center justify-between gap-3 border-t border-border/60">
          <div className="flex flex-wrap items-center gap-2">
            {rawCredential && (
              <>
                <button
                  type="button"
                  onClick={handleDownloadSvg}
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold bg-primary-600 hover:bg-primary-700 text-white transition-colors shadow-xs"
                >
                  <Award className="w-3.5 h-3.5" />
                  Download Certificate (SVG)
                </button>
                <button
                  type="button"
                  onClick={handleDownloadJson}
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold bg-muted hover:bg-muted/80 text-foreground border border-border transition-colors shadow-xs"
                >
                  <Download className="w-3.5 h-3.5" />
                  W3C JSON-LD (.json)
                </button>
              </>
            )}
            <button
              type="button"
              onClick={() => setShowRawJson(!showRawJson)}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold bg-muted/60 hover:bg-muted text-muted-foreground hover:text-foreground border border-border transition-colors"
            >
              <FileCode className="w-3.5 h-3.5" />
              {showRawJson ? 'Hide W3C JSON-LD' : 'Inspect JSON-LD'}
            </button>
          </div>

          <a
            href="https://www.w3.org/TR/vc-data-model/"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-primary-500 transition-colors"
          >
            <span>W3C Standard Compliance</span>
            <ExternalLink className="w-3 h-3" />
          </a>
        </div>

        {/* Collapsible Raw JSON-LD Inspector */}
        {showRawJson && (
          <div className="mt-4 rounded-xl border border-border/80 bg-slate-950 p-4 relative overflow-hidden">
            <div className="flex items-center justify-between pb-2 mb-2 border-b border-slate-800">
              <span className="text-xs font-bold text-slate-400">Canonical W3C JSON-LD Document</span>
              <button
                type="button"
                onClick={handleCopyJson}
                className="inline-flex items-center gap-1 px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-mono transition-colors"
              >
                {copiedJson ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                {copiedJson ? 'Copied' : 'Copy JSON'}
              </button>
            </div>
            <pre className="text-xs font-mono text-emerald-400 overflow-x-auto max-h-72 leading-relaxed p-1">
              {JSON.stringify(rawCredential || result, null, 2)}
            </pre>
          </div>
        )}
      </div>
    </div>
  )
}
