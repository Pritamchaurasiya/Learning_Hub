import React, { useState } from 'react'
import { Check, Copy, FileCode, GitCommit, Sparkles } from 'lucide-react'
import { MultiFilePatch } from '../../types/sweStudio'

interface SwePatchDiffViewerProps {
  patches: MultiFilePatch[]
}

export const SwePatchDiffViewer: React.FC<SwePatchDiffViewerProps> = ({ patches }) => {
  const [selectedFileIndex, setSelectedFileIndex] = useState(0)
  const [copied, setCopied] = useState(false)

  const activePatch = patches[selectedFileIndex] || patches[0]

  const handleCopyDiff = () => {
    if (!activePatch) return
    navigator.clipboard.writeText(activePatch.unifiedDiff)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  if (!patches || patches.length === 0) {
    return (
      <div className="p-6 text-center text-slate-400 bg-slate-900 border border-slate-800 rounded-xl">
        No candidate patches generated yet.
      </div>
    )
  }

  const renderDiffLines = (diff: string) => {
    const lines = diff.split('\n')
    return lines.map((line, idx) => {
      let bg = 'text-slate-300'
      let lineBg = 'bg-transparent'
      if (line.startsWith('+') && !line.startsWith('+++')) {
        bg = 'text-emerald-400 font-semibold'
        lineBg = 'bg-emerald-950/40 border-l-2 border-emerald-500'
      } else if (line.startsWith('-') && !line.startsWith('---')) {
        bg = 'text-rose-400 font-semibold'
        lineBg = 'bg-rose-950/40 border-l-2 border-rose-500'
      } else if (line.startsWith('@@')) {
        bg = 'text-sky-400'
        lineBg = 'bg-sky-950/20'
      }

      return (
        <div
          key={idx}
          className={`px-3 py-0.5 font-mono text-xs flex items-center gap-2 ${lineBg}`}
        >
          <span className="w-6 text-[10px] text-slate-600 select-none text-right">
            {idx + 1}
          </span>
          <span className={bg}>{line}</span>
        </div>
      )
    })
  }

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-lg space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-800 pb-3">
        <div className="flex items-center gap-2">
          <GitCommit className="w-4 h-4 text-emerald-400" />
          <h4 className="text-sm font-bold text-slate-200">
            Multi-File Unified Diffs ({patches.length} files)
          </h4>
        </div>
        <button
          type="button"
          onClick={handleCopyDiff}
          className="flex items-center gap-1.5 px-3 py-1 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs rounded-lg transition-colors border border-slate-700"
        >
          {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
          {copied ? 'Copied to Clipboard' : 'Copy Unified Diff'}
        </button>
      </div>

      {/* File Navigation Tabs */}
      <div className="flex flex-wrap gap-2">
        {patches.map((p, idx) => (
          <button
            key={p.filePath}
            type="button"
            onClick={() => setSelectedFileIndex(idx)}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-mono transition-all ${
              selectedFileIndex === idx
                ? 'bg-indigo-600 text-white shadow-md'
                : 'bg-slate-950 text-slate-400 border border-slate-800 hover:text-slate-200'
            }`}
          >
            <FileCode className="w-3.5 h-3.5" />
            <span>{p.filePath.split('/').pop()}</span>
            <span className="text-[10px] px-1 rounded bg-black/30">
              +{p.linesAdded} / -{p.linesRemoved}
            </span>
          </button>
        ))}
      </div>

      {activePatch && (
        <div className="space-y-3">
          <div className="bg-slate-950/80 border border-slate-800/80 rounded-lg p-3 flex items-start gap-2.5">
            <Sparkles className="w-4 h-4 text-amber-400 flex-shrink-0 mt-0.5" />
            <div className="text-xs text-slate-300">
              <span className="font-semibold text-slate-200">Semantic Fix Rationale:</span>{' '}
              {activePatch.semanticRationale}
            </div>
          </div>

          <div className="bg-slate-950 border border-slate-800 rounded-lg overflow-hidden">
            <div className="px-3 py-2 bg-slate-950 border-b border-slate-800 flex items-center justify-between text-xs text-slate-400 font-mono">
              <span>{activePatch.filePath}</span>
              <span className="text-[11px] text-slate-500">
                +{activePatch.linesAdded} / -{activePatch.linesRemoved} lines
              </span>
            </div>
            <div className="p-2 overflow-x-auto max-h-[350px]">
              {renderDiffLines(activePatch.unifiedDiff)}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
