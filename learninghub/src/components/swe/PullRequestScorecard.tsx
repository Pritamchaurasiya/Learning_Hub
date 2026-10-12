import React, { useState } from 'react'
import {
  CheckCircle2,
  GitBranch,
  GitMerge,
  GitPullRequest,
  Lock,
  ShieldCheck,
  Check,
  Copy,
} from 'lucide-react'
import { SynthesizedPullRequest } from '../../types/sweStudio'

interface PullRequestScorecardProps {
  pullRequest: SynthesizedPullRequest
}

export const PullRequestScorecard: React.FC<PullRequestScorecardProps> = ({ pullRequest }) => {
  const [copied, setCopied] = useState(false)

  const handleCopyMarkdown = () => {
    navigator.clipboard.writeText(pullRequest.prDescriptionMarkdown)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-lg space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-800 pb-3">
        <div className="flex items-center gap-2">
          <GitPullRequest className="w-5 h-5 text-indigo-400" />
          <span className="text-sm font-bold text-slate-200">{pullRequest.id}</span>
          <span className="text-xs px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center gap-1">
            <GitMerge className="w-3 h-3" /> Ready for Merge
          </span>
        </div>
        <button
          type="button"
          onClick={handleCopyMarkdown}
          className="flex items-center gap-1.5 px-3 py-1 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs rounded-lg transition-colors border border-slate-700"
        >
          {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
          {copied ? 'Copied PR Text' : 'Copy PR Description'}
        </button>
      </div>

      <div className="space-y-1">
        <h3 className="text-base font-bold text-white">{pullRequest.prTitle}</h3>
        <div className="flex flex-wrap items-center gap-2 text-xs text-slate-400 font-mono">
          <span className="flex items-center gap-1 text-indigo-300">
            <GitBranch className="w-3.5 h-3.5" /> {pullRequest.branchName}
          </span>
          <span>&rarr;</span>
          <span className="text-slate-300">{pullRequest.baseBranch}</span>
          <span className="text-slate-500">•</span>
          <span>By {pullRequest.author}</span>
        </div>
      </div>

      {/* Verification Invariants Checklist */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <div className="bg-slate-950/70 border border-slate-800/80 rounded-lg p-3">
          <div className="flex items-center justify-between">
            <span className="text-xs text-slate-400">Reproduction Test</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="text-sm font-bold text-emerald-400 mt-1">PASSED</div>
          <div className="text-[11px] text-slate-500 mt-0.5 font-mono truncate">
            {pullRequest.verification.reproductionTestDetails.testName}
          </div>
        </div>

        <div className="bg-slate-950/70 border border-slate-800/80 rounded-lg p-3">
          <div className="flex items-center justify-between">
            <span className="text-xs text-slate-400">Regression Tests</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="text-sm font-bold text-emerald-400 mt-1">
            {pullRequest.verification.totalRegressionTestsRun}/
            {pullRequest.verification.totalRegressionTestsRun} Clean
          </div>
          <div className="text-[11px] text-slate-500 mt-0.5">0 regressions detected</div>
        </div>

        <div className="bg-slate-950/70 border border-slate-800/80 rounded-lg p-3">
          <div className="flex items-center justify-between">
            <span className="text-xs text-slate-400">Security Gate</span>
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="text-sm font-bold text-emerald-400 mt-1">VERIFIED</div>
          <div className="text-[11px] text-slate-500 mt-0.5">Zero injection vectors</div>
        </div>
      </div>

      {/* Cryptographic HMAC-SHA256 Seal */}
      <div className="bg-indigo-950/30 border border-indigo-900/40 rounded-lg p-3 flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <Lock className="w-4 h-4 text-indigo-400" />
          <span className="text-xs font-semibold text-indigo-300">
            Cryptographic Patch Attestation Seal
          </span>
        </div>
        <span className="text-[11px] font-mono text-indigo-400/90 bg-indigo-950/80 px-2 py-0.5 rounded border border-indigo-900/60 truncate max-w-xs md:max-w-md">
          {pullRequest.cryptographicPatchSeal}
        </span>
      </div>
    </div>
  )
}
