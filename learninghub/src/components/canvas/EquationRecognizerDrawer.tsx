import React from 'react'
import { LatexRecognitionResult } from '../../types/canvasStudio'
import { Binary, Sparkles, Copy, Check, ArrowRight } from 'lucide-react'

interface EquationRecognizerDrawerProps {
  result: LatexRecognitionResult | null
  onInsertLatex: (latex: string) => void
}

export const EquationRecognizerDrawer: React.FC<EquationRecognizerDrawerProps> = ({
  result,
  onInsertLatex,
}) => {
  const [copied, setCopied] = React.useState<boolean>(false)

  if (!result) return null

  const handleCopy = () => {
    navigator.clipboard.writeText(result.latexString)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 space-y-3 text-slate-200">
      <div className="flex items-center justify-between border-b border-slate-800 pb-2">
        <div className="flex items-center gap-2">
          <Binary className="w-4 h-4 text-sky-400" />
          <h3 className="font-bold text-sm text-white">LaTeX Formula Recognizer</h3>
        </div>
        <span className="px-2 py-0.5 rounded text-xs font-mono bg-sky-500/10 text-sky-400 border border-sky-500/20">
          {(result.confidence * 100).toFixed(0)}% OCR Confidence
        </span>
      </div>

      {result.formulaName && (
        <div className="text-xs text-slate-400">
          Identified Formulation: <span className="text-white font-semibold">{result.formulaName}</span>
        </div>
      )}

      {/* Rendered Math Box */}
      <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 text-center">
        <code className="text-sm text-emerald-400 font-mono select-all">
          {result.latexString}
        </code>
      </div>

      {/* Step Breakdown */}
      {result.suggestedSteps && result.suggestedSteps.length > 0 && (
        <div className="space-y-1.5 pt-1">
          <div className="text-xs font-semibold text-slate-400 flex items-center gap-1">
            <Sparkles className="w-3.5 h-3.5 text-amber-400" />
            <span>Mathematical Derivation Steps:</span>
          </div>
          <ul className="space-y-1 text-xs text-slate-300">
            {result.suggestedSteps.map((step, idx) => (
              <li key={idx} className="flex items-start gap-1.5">
                <span className="text-slate-500 font-mono">{idx + 1}.</span>
                <span>{step}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Actions */}
      <div className="flex items-center gap-2 pt-2 border-t border-slate-800">
        <button
          onClick={handleCopy}
          className="flex-1 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-slate-200 flex items-center justify-center gap-1.5 transition-colors"
        >
          {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
          <span>{copied ? 'Copied LaTeX' : 'Copy LaTeX'}</span>
        </button>
        <button
          onClick={() => onInsertLatex(result.latexString)}
          className="flex-1 py-1.5 rounded-xl bg-sky-500 hover:bg-sky-400 text-slate-950 text-xs font-bold flex items-center justify-center gap-1.5 transition-colors"
        >
          <span>Insert onto Canvas</span>
          <ArrowRight className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  )
}
