import React, { useState } from 'react'
import { SelfHealingPatch } from '../../types/selfHealing'
import {
  Code,
  Copy,
  Check,
  FileCheck,
  Split,
  Eye,
  Wand2,
} from 'lucide-react'

interface CodeDiffViewerPanelProps {
  fileName: string
  originalCode: string
  patch: SelfHealingPatch
  onApplyPatch?: () => void
}

export const CodeDiffViewerPanel: React.FC<CodeDiffViewerPanelProps> = ({
  fileName,
  originalCode,
  patch,
  onApplyPatch,
}) => {
  const [viewMode, setViewMode] = useState<'split' | 'patched' | 'diff'>('split')
  const [copied, setCopied] = useState(false)

  const handleCopy = () => {
    navigator.clipboard.writeText(patch.patchedCode)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-4 shadow-xl">
      {/* Top Header & View Modes */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-3">
        <div className="flex items-center gap-2">
          <Code className="w-5 h-5 text-emerald-400" />
          <div>
            <h4 className="text-sm sm:text-base font-bold text-white tracking-tight flex items-center gap-2">
              <span>Automated Semantic Patch Diff</span>
              <span className="text-xs px-2 py-0.5 rounded font-mono bg-slate-800 text-slate-300 font-normal">
                {fileName}
              </span>
            </h4>
            <p className="text-xs text-slate-400">Deterministic code remediation with verified invariant preservation.</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* View Mode Toggle */}
          <div className="flex items-center gap-1 p-1 bg-slate-950 border border-slate-800 rounded-xl text-xs font-medium">
            <button
              type="button"
              onClick={() => setViewMode('split')}
              className={`px-2.5 py-1 rounded-lg transition-colors flex items-center gap-1 ${
                viewMode === 'split' ? 'bg-emerald-600 text-white' : 'text-slate-400 hover:text-white'
              }`}
            >
              <Split className="w-3.5 h-3.5" />
              <span>Split</span>
            </button>
            <button
              type="button"
              onClick={() => setViewMode('patched')}
              className={`px-2.5 py-1 rounded-lg transition-colors flex items-center gap-1 ${
                viewMode === 'patched' ? 'bg-emerald-600 text-white' : 'text-slate-400 hover:text-white'
              }`}
            >
              <Eye className="w-3.5 h-3.5" />
              <span>Patched</span>
            </button>
            <button
              type="button"
              onClick={() => setViewMode('diff')}
              className={`px-2.5 py-1 rounded-lg transition-colors flex items-center gap-1 ${
                viewMode === 'diff' ? 'bg-emerald-600 text-white' : 'text-slate-400 hover:text-white'
              }`}
            >
              <FileCheck className="w-3.5 h-3.5" />
              <span>Unified</span>
            </button>
          </div>

          <button
            type="button"
            onClick={handleCopy}
            className="flex items-center gap-1 px-3 py-1.5 rounded-xl text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-200 transition-colors"
            title="Copy patched code to clipboard"
          >
            {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
            <span>{copied ? 'Copied' : 'Copy'}</span>
          </button>
        </div>
      </div>

      {/* Code Display Area */}
      {viewMode === 'split' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
          {/* Left: Original Code */}
          <div className="space-y-1.5">
            <div className="text-[11px] font-mono font-semibold text-rose-400 flex items-center justify-between px-1">
              <span>BEFORE (Vulnerable)</span>
              <span className="text-slate-500">{originalCode.split('\n').length} lines</span>
            </div>
            <pre className="p-3.5 rounded-xl bg-slate-950 border border-rose-500/30 text-xs font-mono text-rose-200/90 overflow-x-auto max-h-[380px] leading-relaxed">
              <code>{originalCode}</code>
            </pre>
          </div>

          {/* Right: Patched Code */}
          <div className="space-y-1.5">
            <div className="text-[11px] font-mono font-semibold text-emerald-400 flex items-center justify-between px-1">
              <span>AFTER (Remediated)</span>
              <span className="text-slate-500">{patch.patchedCode.split('\n').length} lines</span>
            </div>
            <pre className="p-3.5 rounded-xl bg-slate-950 border border-emerald-500/30 text-xs font-mono text-emerald-200/90 overflow-x-auto max-h-[380px] leading-relaxed">
              <code>{patch.patchedCode}</code>
            </pre>
          </div>
        </div>
      )}

      {viewMode === 'patched' && (
        <div className="space-y-1.5">
          <div className="text-[11px] font-mono font-semibold text-emerald-400 flex items-center justify-between px-1">
            <span>Production-Ready Patched Code</span>
            <span className="text-slate-500">{patch.patchedCode.split('\n').length} lines</span>
          </div>
          <pre className="p-4 rounded-xl bg-slate-950 border border-emerald-500/40 text-xs font-mono text-emerald-200/90 overflow-x-auto max-h-[420px] leading-relaxed">
            <code>{patch.patchedCode}</code>
          </pre>
        </div>
      )}

      {viewMode === 'diff' && (
        <div className="space-y-1.5">
          <div className="text-[11px] font-mono font-semibold text-slate-400 flex items-center justify-between px-1">
            <span>Standard Unified Diff (Patch format)</span>
          </div>
          <pre className="p-4 rounded-xl bg-slate-950 border border-slate-800 text-xs font-mono text-slate-300 overflow-x-auto max-h-[420px] leading-relaxed whitespace-pre">
            <code>{patch.unifiedDiff}</code>
          </pre>
        </div>
      )}

      {/* Apply Patch Button */}
      {onApplyPatch && (
        <button
          type="button"
          onClick={onApplyPatch}
          className="w-full py-2.5 rounded-xl font-bold text-xs bg-emerald-600 hover:bg-emerald-500 text-white shadow-lg shadow-emerald-600/20 transition-all flex items-center justify-center gap-2"
        >
          <Wand2 className="w-4 h-4" />
          <span>Apply Autonomous Remediation Patch</span>
        </button>
      )}
    </div>
  )
}
