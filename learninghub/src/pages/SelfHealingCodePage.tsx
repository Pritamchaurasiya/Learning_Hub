import React, { useState, useEffect } from 'react'
import {
  CodeSnippetPresetId,
  CodeAnalysisPayload,
} from '../types/selfHealing'
import { selfHealingService } from '../services/selfHealingService'
import { VulnerabilityDiagnosticCard } from '../components/selfHealing/VulnerabilityDiagnosticCard'
import { CodeDiffViewerPanel } from '../components/selfHealing/CodeDiffViewerPanel'
import { PatchImpactScorecard } from '../components/selfHealing/PatchImpactScorecard'
import {
  Sparkles,
  RefreshCw,
  CheckCircle2,
} from 'lucide-react'

export const SelfHealingCodePage: React.FC = () => {
  const [selectedPreset, setSelectedPreset] = useState<CodeSnippetPresetId>('N_PLUS_ONE_QUERY_LOOP')
  const [code, setCode] = useState<string>('')
  const [fileName, setFileName] = useState<string>('userCourseService.ts')
  const [analysis, setAnalysis] = useState<CodeAnalysisPayload | null>(null)
  const [isLoading, setIsLoading] = useState<boolean>(true)
  const [isAnalyzing, setIsAnalyzing] = useState<boolean>(false)
  const [isPatchApplied, setIsPatchApplied] = useState<boolean>(false)

  const presets: { id: CodeSnippetPresetId; label: string; tag: string }[] = [
    { id: 'N_PLUS_ONE_QUERY_LOOP', label: 'N+1 Query Loop in Express/Prisma', tag: 'PERFORMANCE' },
    { id: 'SQL_INJECTION_CONCATENATION', label: 'SQL Injection via String Concat', tag: 'SECURITY' },
    { id: 'REACT_MEMORY_LEAK_INTERVAL', label: 'React Memory Leak in useEffect', tag: 'MEMORY' },
    { id: 'EVENT_LOOP_SYNC_BLOCKING', label: 'Synchronous Event-Loop Blocking I/O', tag: 'ASYNC' },
  ]

  // Fetch preset code snippet
  useEffect(() => {
    let isMounted = true
    setIsLoading(true)
    setIsPatchApplied(false)

    selfHealingService
      .getPreset(selectedPreset)
      .then(res => {
        if (!isMounted) return
        setCode(res.code)
        setFileName(res.fileName)
        setIsLoading(false)

        return selfHealingService.analyzeCode({
          code: res.code,
          fileName: res.fileName,
        })
      })
      .then(analysisRes => {
        if (isMounted && analysisRes) {
          setAnalysis(analysisRes)
        }
      })
      .catch(() => {
        if (isMounted) setIsLoading(false)
      })

    return () => {
      isMounted = false
    }
  }, [selectedPreset])

  const handleRunAnalysis = async (codeToAnalyze?: string) => {
    const c = codeToAnalyze || code
    if (!c.trim()) return

    setIsAnalyzing(true)
    try {
      const res = await selfHealingService.analyzeCode({
        code: c,
        fileName,
      })
      setAnalysis(res)
    } finally {
      setIsAnalyzing(false)
    }
  }

  const handleApplyPatch = () => {
    if (!analysis) return
    const remediatedCode = analysis.recommendedPatch.patchedCode
    setCode(remediatedCode)
    setIsPatchApplied(true)
    handleRunAnalysis(remediatedCode)
  }

  if (isLoading || !code) {
    return (
      <div className="min-h-screen bg-slate-950 text-slate-100 flex items-center justify-center p-6">
        <div className="text-center space-y-4">
          <div className="w-12 h-12 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-sm font-medium text-slate-400">
            Scanning Source AST and Synthesizing Self-Healing Patches...
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 p-4 sm:p-6 lg:p-8 space-y-6">
      {/* Top Header */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-4 border-b border-slate-800">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 flex items-center gap-1">
              <Sparkles className="w-3 h-3" /> Milestone 20
            </span>
            <span className="text-xs text-slate-400 font-mono">Enterprise DevSecOps Pipeline</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-white mt-1 tracking-tight">
            Autonomous AI Code Refactoring & Self-Healing Studio
          </h1>
          <p className="text-xs sm:text-sm text-slate-400 mt-1 max-w-3xl">
            Static AST multi-vector inspection for N+1 queries, OWASP Top 10 vulnerabilities, and React memory leaks.
            Synthesizes verifiable semantic Unified Diffs with zero-downtime safety guarantees.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => handleRunAnalysis()}
            disabled={isAnalyzing}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-500 text-white shadow-lg shadow-emerald-600/20 transition-all disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isAnalyzing ? 'animate-spin' : ''}`} />
            <span>Re-Analyze AST</span>
          </button>
        </div>
      </div>

      {/* Preset Anti-Pattern Selector */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 space-y-2">
        <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider block">
          Select Vulnerability / Performance Anti-Pattern Preset
        </label>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2">
          {presets.map(p => (
            <button
              key={p.id}
              type="button"
              onClick={() => setSelectedPreset(p.id)}
              className={`p-3 rounded-xl border text-left transition-all flex flex-col justify-between gap-1.5 ${
                selectedPreset === p.id
                  ? 'bg-emerald-950/40 border-emerald-500 text-white shadow-md'
                  : 'bg-slate-950/60 border-slate-800 text-slate-400 hover:border-slate-700 hover:text-slate-200'
              }`}
            >
              <div className="text-xs font-semibold">{p.label}</div>
              <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-slate-900 text-slate-400 border border-slate-800 w-fit">
                {p.tag}
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* Main Grid: Diagnostics & Diff Viewer */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Column: Diagnostics & Scorecard */}
        <div className="lg:col-span-5 space-y-6">
          {analysis && analysis.detectedIssues.map(issue => (
            <VulnerabilityDiagnosticCard key={issue.id} issue={issue} />
          ))}

          {analysis && (
            <PatchImpactScorecard
              patch={analysis.recommendedPatch}
              scoreBefore={analysis.overallHealthScoreBefore}
              scoreAfter={analysis.overallHealthScoreAfter}
            />
          )}
        </div>

        {/* Right Column: Code Diff Viewer Panel */}
        <div className="lg:col-span-7 space-y-6">
          {analysis && (
            <CodeDiffViewerPanel
              fileName={fileName}
              originalCode={code}
              patch={analysis.recommendedPatch}
              onApplyPatch={handleApplyPatch}
            />
          )}

          {isPatchApplied && (
            <div className="p-4 rounded-xl bg-emerald-950/30 border border-emerald-500/40 text-emerald-300 text-xs flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>Remediation patch successfully applied to source AST. Quality index restored to 98%.</span>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
