import React, { useState } from 'react'
import { ShieldCheck, Lock, ExternalLink, CheckCircle2, Copy, Check, QrCode } from 'lucide-react'
import { resumeService } from '../../services/resumeService'

interface VerifiablePortfolioBadgeProps {
  didAnchor: string
  canonicalDigest: string
  signatureHmac: string
  verificationUrl: string
}

export const VerifiablePortfolioBadge: React.FC<VerifiablePortfolioBadgeProps> = ({
  didAnchor,
  canonicalDigest,
  signatureHmac,
  verificationUrl,
}) => {
  const [copied, setCopied] = useState<boolean>(false)
  const [isVerifying, setIsVerifying] = useState<boolean>(false)
  const [verificationResult, setVerificationResult] = useState<{
    isValid: boolean
    statusMessage: string
  } | null>(null)
  const [showProofModal, setShowProofModal] = useState<boolean>(false)

  const handleCopyProof = () => {
    const proofText = JSON.stringify(
      {
        didAnchor,
        canonicalDigestSha256: canonicalDigest,
        signatureHmac,
        verifiedAt: new Date().toISOString(),
      },
      null,
      2
    )
    navigator.clipboard.writeText(proofText)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const handleLiveVerification = async () => {
    setIsVerifying(true)
    try {
      const res = await resumeService.verifyResumeProof(canonicalDigest, signatureHmac)
      setVerificationResult({
        isValid: res.isValid,
        statusMessage: res.statusMessage,
      })
    } finally {
      setIsVerifying(false)
    }
  }

  return (
    <div className="bg-gradient-to-r from-emerald-950/40 via-teal-950/30 to-blue-950/40 border border-emerald-500/30 rounded-xl p-4 shadow-lg backdrop-blur-sm">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-lg bg-emerald-500/20 border border-emerald-500/40 text-emerald-400">
            <ShieldCheck className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-semibold text-emerald-300 text-sm tracking-wide uppercase">
                Anti-Gravity Cryptographically Verifiable Resume
              </span>
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                W3C DID Anchored
              </span>
            </div>
            <p className="text-xs text-slate-300 font-mono mt-0.5 truncate max-w-md">
              {didAnchor}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
          <button
            type="button"
            onClick={handleLiveVerification}
            disabled={isVerifying}
            className="px-3 py-1.5 text-xs font-medium rounded-lg bg-emerald-600/80 hover:bg-emerald-600 text-white transition-colors flex items-center gap-1.5 disabled:opacity-50"
          >
            {isVerifying ? (
              <span className="animate-spin w-3 h-3 border-2 border-white border-t-transparent rounded-full" />
            ) : (
              <CheckCircle2 className="w-3.5 h-3.5" />
            )}
            Verify Integrity
          </button>

          <button
            type="button"
            onClick={() => setShowProofModal(true)}
            className="px-3 py-1.5 text-xs font-medium rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition-colors flex items-center gap-1.5"
          >
            <Lock className="w-3.5 h-3.5 text-slate-400" />
            Inspect Proof
          </button>
        </div>
      </div>

      {verificationResult && (
        <div
          className={`mt-3 p-2.5 rounded-lg border text-xs flex items-center gap-2 ${
            verificationResult.isValid
              ? 'bg-emerald-950/60 border-emerald-500/40 text-emerald-200'
              : 'bg-red-950/60 border-red-500/40 text-red-200'
          }`}
        >
          <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400" />
          <span>{verificationResult.statusMessage}</span>
        </div>
      )}

      {showProofModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-in fade-in">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl max-w-lg w-full p-6 shadow-2xl relative">
            <div className="flex items-center justify-between pb-4 border-b border-slate-800">
              <div className="flex items-center gap-2 text-emerald-400 font-semibold text-base">
                <Lock className="w-5 h-5" />
                <span>Cryptographic Proof Invariant Inspector</span>
              </div>
              <button
                type="button"
                onClick={() => setShowProofModal(false)}
                className="text-slate-400 hover:text-white text-lg p-1"
              >
                ✕
              </button>
            </div>

            <div className="mt-4 space-y-4 text-xs font-mono">
              <div>
                <span className="text-slate-400 block mb-1">W3C Decentralized Identifier (DID):</span>
                <div className="p-2.5 rounded-lg bg-slate-950 border border-slate-800 text-slate-200 break-all select-all">
                  {didAnchor}
                </div>
              </div>

              <div>
                <span className="text-slate-400 block mb-1">RFC 8785 Canonical SHA-256 Digest:</span>
                <div className="p-2.5 rounded-lg bg-slate-950 border border-slate-800 text-emerald-400 break-all select-all">
                  {canonicalDigest}
                </div>
              </div>

              <div>
                <span className="text-slate-400 block mb-1">HMAC-SHA256 Issuer Signature:</span>
                <div className="p-2.5 rounded-lg bg-slate-950 border border-slate-800 text-teal-400 break-all select-all">
                  {signatureHmac}
                </div>
              </div>

              <div className="flex items-center justify-between p-3 rounded-lg bg-emerald-950/30 border border-emerald-500/30">
                <div className="flex items-center gap-2 text-emerald-300">
                  <QrCode className="w-4 h-4" />
                  <span>Public Verification URL</span>
                </div>
                <a
                  href={verificationUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="text-emerald-400 hover:underline flex items-center gap-1 font-sans"
                >
                  Verify Portal <ExternalLink className="w-3 h-3" />
                </a>
              </div>
            </div>

            <div className="mt-6 flex justify-end gap-3 font-sans">
              <button
                type="button"
                onClick={handleCopyProof}
                className="px-4 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium flex items-center gap-2 border border-slate-700 transition-colors"
              >
                {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                {copied ? 'Proof Copied!' : 'Copy JSON Proof'}
              </button>
              <button
                type="button"
                onClick={() => setShowProofModal(false)}
                className="px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-medium transition-colors"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
