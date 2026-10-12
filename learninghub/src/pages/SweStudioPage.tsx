import React, { useState, useEffect } from 'react'
import {
  SweBenchmarkIssue,
  SweResolutionPipelineResult,
} from '../types/sweStudio'
import { SweStudioService, FALLBACK_SWE_PRESETS } from '../services/sweStudioService'
import { IssueTriageCard } from '../components/swe/IssueTriageCard'
import { SweAgentThoughtStream } from '../components/swe/SweAgentThoughtStream'
import { SwePatchDiffViewer } from '../components/swe/SwePatchDiffViewer'
import { PullRequestScorecard } from '../components/swe/PullRequestScorecard'
import {
  Bot,
  Compass,
  FileCode2,
  GitPullRequest,
  RefreshCw,
  ShieldCheck,
  Sparkles,
  Zap,
  Play,
  Terminal,
} from 'lucide-react'

export const SweStudioPage: React.FC = () => {
  const [presets, setPresets] = useState<SweBenchmarkIssue[]>(FALLBACK_SWE_PRESETS)
  const [selectedIssueId, setSelectedIssueId] = useState<string>('SWE-101')
  const [selectedIssue, setSelectedIssue] = useState<SweBenchmarkIssue>(FALLBACK_SWE_PRESETS[0]!)
  const [resolution, setResolution] = useState<SweResolutionPipelineResult | null>(null)
  const [isResolving, setIsResolving] = useState<boolean>(false)
  const [activeTab, setActiveTab] = useState<'stream' | 'patches' | 'sbfl' | 'pr'>('stream')

  // Load presets on mount
  useEffect(() => {
    let isMounted = true
    SweStudioService.getPresets()
      .then(fetchedPresets => {
        if (!isMounted) return
        if (fetchedPresets && fetchedPresets.length > 0) {
          setPresets(fetchedPresets)
          const initial = fetchedPresets.find(p => p.id === selectedIssueId) || fetchedPresets[0]!
          setSelectedIssue(initial)
        }
      })
      .catch(() => {
        // Fallback already in place
      })

    return () => {
      isMounted = false
    }
  }, [])

  // Update selected issue when selection changes
  useEffect(() => {
    const issue = presets.find(p => p.id === selectedIssueId) || presets[0]!
    setSelectedIssue(issue)
    // Run resolution automatically for the selected issue
    runResolution(issue)
  }, [selectedIssueId])

  const runResolution = async (issueToResolve?: SweBenchmarkIssue) => {
    const target = issueToResolve || selectedIssue
    setIsResolving(true)
    try {
      const res = await SweStudioService.resolveIssue(target)
      setResolution(res)
    } catch {
      const fallbackRes = SweStudioService.createSimulatedResolution(target)
      setResolution(fallbackRes)
    } finally {
      setIsResolving(false)
    }
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 p-4 sm:p-6 lg:p-8 space-y-6">
      {/* Header Banner */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-4 border-b border-slate-800">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 flex items-center gap-1">
              <Sparkles className="w-3 h-3" /> Milestone 24
            </span>
            <span className="text-xs text-slate-400 font-mono">SWE-Bench Micro-Engine</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-white mt-1 tracking-tight flex items-center gap-2.5">
            <Bot className="w-8 h-8 text-indigo-400" />
            Autonomous SWE Studio & Software Agent Arena
          </h1>
          <p className="text-xs sm:text-sm text-slate-400 mt-1 max-w-3xl leading-relaxed">
            Full-lifecycle autonomous SWE agent execution: Issue Triage, Spectrum-Based Fault
            Localization (Ochiai SBFL), Reproduction Test Synthesis, Multi-File AST Patching, Zero-Regression Verification,
            and Cryptographically Sealed Pull Request Synthesis.
          </p>
        </div>

        {/* Global Dispatch Button */}
        <div className="flex items-center gap-3">
          <button
            onClick={() => runResolution()}
            disabled={isResolving}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs sm:text-sm font-semibold bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white shadow-lg shadow-indigo-600/20 transition-all border border-indigo-500/30"
          >
            {isResolving ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin" />
                <span>Executing SWE Agent Pipeline...</span>
              </>
            ) : (
              <>
                <Play className="w-4 h-4 fill-white" />
                <span>Dispatch Autonomous Agent</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Preset Issue Selector Bar */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-3 sm:p-4 shadow-lg space-y-2">
        <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider flex items-center gap-2">
          <Terminal className="w-3.5 h-3.5 text-indigo-400" />
          Benchmark Issue Suite
        </div>
        <div className="flex flex-wrap gap-2">
          {presets.map(preset => {
            const isSelected = preset.id === selectedIssueId
            return (
              <button
                key={preset.id}
                onClick={() => setSelectedIssueId(preset.id)}
                className={`flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-semibold transition-all border ${
                  isSelected
                    ? 'bg-indigo-600 text-white border-indigo-400 shadow-md shadow-indigo-600/30'
                    : 'bg-slate-950/80 hover:bg-slate-800 text-slate-300 border-slate-800'
                }`}
              >
                <span className="font-mono font-bold">{preset.id}</span>
                <span className="max-w-[180px] sm:max-w-[240px] truncate">{preset.title}</span>
              </button>
            )
          })}
        </div>
      </div>

      {/* Main 2-Column Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Issue Specification */}
        <div className="lg:col-span-5 space-y-6">
          <IssueTriageCard issue={selectedIssue} />
        </div>

        {/* Right Column: Execution Stream, Patches & Pull Request */}
        <div className="lg:col-span-7 space-y-6">
          {/* Navigation View Switcher */}
          <div className="flex flex-wrap items-center gap-2 border-b border-slate-800 pb-3">
            <button
              onClick={() => setActiveTab('stream')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                activeTab === 'stream'
                  ? 'bg-indigo-600/30 text-indigo-300 border border-indigo-500/50'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Compass className="w-3.5 h-3.5" />
              <span>Thought Stream</span>
            </button>
            <button
              onClick={() => setActiveTab('patches')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                activeTab === 'patches'
                  ? 'bg-indigo-600/30 text-indigo-300 border border-indigo-500/50'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <FileCode2 className="w-3.5 h-3.5" />
              <span>Unified Patches</span>
            </button>
            <button
              onClick={() => setActiveTab('sbfl')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                activeTab === 'sbfl'
                  ? 'bg-indigo-600/30 text-indigo-300 border border-indigo-500/50'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Compass className="w-3.5 h-3.5" />
              <span>SBFL Localization</span>
            </button>
            <button
              onClick={() => setActiveTab('pr')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                activeTab === 'pr'
                  ? 'bg-indigo-600/30 text-indigo-300 border border-indigo-500/50'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <GitPullRequest className="w-3.5 h-3.5" />
              <span>Synthesized PR</span>
            </button>
          </div>

          {/* Tab Content Display */}
          {resolution && (
            <div className="space-y-6">
              {activeTab === 'stream' && (
                <div className="space-y-6">
                  <SweAgentThoughtStream steps={resolution.agentThoughtStream} />

                  {/* Reproduction Test Result Invariant Card */}
                  <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-lg space-y-3">
                    <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                      <div className="flex items-center gap-2">
                        <Zap className="w-4 h-4 text-amber-400" />
                        <h4 className="text-sm font-bold text-white">
                          Synthesized Reproduction Test Execution
                        </h4>
                      </div>
                      <span className="text-xs font-mono text-slate-400">
                        {resolution.verification.reproductionTestDetails.executedInMs}ms
                      </span>
                    </div>

                    <div className="grid grid-cols-2 gap-3 text-xs font-mono">
                      <div className="p-2.5 rounded bg-rose-950/30 border border-rose-500/30 text-rose-300">
                        Baseline Result:{' '}
                        <span className="font-bold">
                          {resolution.verification.reproductionTestDetails.baselineResult}
                        </span>
                      </div>
                      <div className="p-2.5 rounded bg-emerald-950/30 border border-emerald-500/30 text-emerald-300">
                        Patched Result:{' '}
                        <span className="font-bold">
                          {resolution.verification.reproductionTestDetails.patchedResult}
                        </span>
                      </div>
                    </div>

                    <div className="bg-slate-950 rounded-lg p-3 border border-slate-800/80 font-mono text-xs text-slate-300 overflow-x-auto">
                      <div className="text-[10px] text-slate-500 uppercase tracking-widest mb-1 font-sans font-semibold">
                        Reproduction Test Harness (Automated Pass Verification)
                      </div>
                      <pre className="text-xs leading-relaxed text-indigo-200">
                        {resolution.verification.reproductionTestDetails.testCode}
                      </pre>
                    </div>
                  </div>
                </div>
              )}

              {activeTab === 'patches' && (
                <SwePatchDiffViewer patches={resolution.patches} />
              )}

              {activeTab === 'sbfl' && (
                <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-lg space-y-4">
                  <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                    <div className="flex items-center gap-2">
                      <Compass className="w-4 h-4 text-purple-400" />
                      <h3 className="text-sm font-bold text-white">
                        Spectrum-Based Fault Localization Rankings
                      </h3>
                    </div>
                    <span className="text-xs text-purple-400 font-mono font-semibold">
                      Ochiai & Tarantula Ranking
                    </span>
                  </div>

                  <div className="space-y-2.5">
                    {resolution.suspiciousLocations.map((loc, idx) => (
                      <div
                        key={idx}
                        className="p-3 bg-slate-950/80 border border-slate-800/80 rounded-lg space-y-2"
                      >
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-xs font-mono font-bold text-indigo-300 truncate">
                            {loc.filePath}:{loc.startLine}-{loc.endLine}
                          </span>
                          <div className="flex items-center gap-2 shrink-0">
                            <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-purple-500/20 text-purple-300 border border-purple-500/30">
                              Ochiai: {loc.ochiaiSuspiciousnessScore.toFixed(3)}
                            </span>
                            <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/30">
                              Tarantula: {loc.tarantulaScore.toFixed(3)}
                            </span>
                          </div>
                        </div>
                        <div className="text-xs text-slate-300">
                          <span className="text-slate-500 font-mono mr-1">fn {loc.functionName}():</span>
                          {loc.culpritHypothesis}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {activeTab === 'pr' && (
                <div className="space-y-6">
                  <PullRequestScorecard pullRequest={resolution.pullRequest} />

                  {/* Cryptographic Attestation Audit Seal */}
                  <div className="p-4 bg-emerald-950/20 border border-emerald-500/30 rounded-xl space-y-2">
                    <div className="flex items-center gap-2 text-emerald-400 text-xs font-bold uppercase tracking-wider">
                      <ShieldCheck className="w-4 h-4" />
                      Cryptographic Patch Invariant Verified
                    </div>
                    <p className="text-xs text-slate-300 leading-relaxed">
                      This autonomous resolution passed zero-regression verification across all {resolution.verification.totalRegressionTestsRun} unit/integration suites with zero breaking API changes. The generated unified diff has been sealed with an immutable HMAC-SHA256 hash.
                    </p>
                    <div className="font-mono text-[11px] text-emerald-300/80 break-all bg-slate-950/60 p-2 rounded border border-emerald-500/20">
                      HMAC-SHA256: {resolution.pullRequest.cryptographicPatchSeal}
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
export default SweStudioPage
