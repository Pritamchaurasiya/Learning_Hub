import React, { useState, useEffect, useCallback } from 'react'
import {
  Shield,
  Play,
  RotateCcw,
  Sparkles,
  BookOpen,
  CheckCircle2,
  Cpu,
  Layers,
  Award,
} from 'lucide-react'
import {
  DebatePersona,
  PresetArchitectureTopic,
  DebateSessionResult,
  DebatePersonaId,
} from '../types/agentDebate'
import { agentDebateService } from '../services/agentDebateService'
import { DebatePersonaAvatarHUD } from '../components/debate/DebatePersonaAvatarHUD'
import { DialecticalTurnTimeline } from '../components/debate/DialecticalTurnTimeline'
import { ParetoTradeoffRadar } from '../components/debate/ParetoTradeoffRadar'
import { ConsensusRfcModal } from '../components/debate/ConsensusRfcModal'

export const AgentDebateArenaPage: React.FC = () => {
  const [personas, setPersonas] = useState<DebatePersona[]>([])
  const [presetTopics, setPresetTopics] = useState<PresetArchitectureTopic[]>([])
  const [selectedTopicId, setSelectedTopicId] = useState<string>('')
  const [topicInput, setTopicInput] = useState<string>('')
  const [proposalInput, setProposalInput] = useState<string>('')
  const [roundsCount, setRoundsCount] = useState<number>(3)

  const [isDebating, setIsDebating] = useState<boolean>(false)
  const [activeSpeakerId, setActiveSpeakerId] = useState<DebatePersonaId | null>(null)
  const [activeTurnIndex, setActiveTurnIndex] = useState<number>(0)
  const [sessionResult, setSessionResult] = useState<DebateSessionResult | null>(null)
  const [isRfcModalOpen, setIsRfcModalOpen] = useState<boolean>(false)

  // Load initial personas and preset topics
  useEffect(() => {
    let mounted = true
    const initData = async () => {
      try {
        const [fetchedPersonas, fetchedPresets] = await Promise.all([
          agentDebateService.getPersonas(),
          agentDebateService.getPresetTopics(),
        ])
        if (mounted) {
          setPersonas(fetchedPersonas)
          setPresetTopics(fetchedPresets)
          if (fetchedPresets.length > 0) {
            setSelectedTopicId(fetchedPresets[0].id)
            setTopicInput(fetchedPresets[0].title)
            setProposalInput(fetchedPresets[0].defaultProposal)
          }
        }
      } catch (err) {
        console.error('Failed to load debate presets:', err)
      }
    }
    initData()
    return () => {
      mounted = false
    }
  }, [])

  // Handle Preset selection
  const handleSelectPreset = (preset: PresetArchitectureTopic) => {
    setSelectedTopicId(preset.id)
    setTopicInput(preset.title)
    setProposalInput(preset.defaultProposal)
  }

  // Conduct Debate
  const handleStartDebate = useCallback(async () => {
    if (!topicInput.trim() || !proposalInput.trim()) return

    setIsDebating(true)
    try {
      const result = await agentDebateService.conductDebate({
        topic: topicInput.trim(),
        proposal: proposalInput.trim(),
        targetRounds: roundsCount,
      })
      setSessionResult(result)

      // Animate active speakers sequentially through turns
      if (result.turns.length > 0) {
        setActiveSpeakerId(result.turns[0].personaId)
        setActiveTurnIndex(0)
      }
    } catch (err) {
      console.error('Debate simulation failed:', err)
    } finally {
      setIsDebating(false)
    }
  }, [topicInput, proposalInput, roundsCount])

  // Select Turn in timeline
  const handleSelectTurn = (index: number) => {
    setActiveTurnIndex(index)
    if (sessionResult && sessionResult.turns[index]) {
      setActiveSpeakerId(sessionResult.turns[index].personaId)
    }
  }

  const currentRound = sessionResult
    ? Math.min(
        roundsCount,
        Math.floor(
          ((sessionResult.turns[activeTurnIndex]?.roundIndex ?? 1) - 1) *
            (roundsCount / Math.max(1, sessionResult.totalRounds))
        ) + 1
      )
    : 1

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 p-4 sm:p-6 lg:p-8 space-y-6 max-w-7xl mx-auto">
      {/* Top Banner Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-6 border-b border-slate-800">
        <div>
          <div className="flex items-center gap-2 mb-1.5">
            <span className="px-2.5 py-0.5 rounded-full bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 text-xs font-bold uppercase tracking-wider flex items-center gap-1.5">
              <Cpu className="w-3.5 h-3.5" />
              Milestone 22 Autonomous Council
            </span>
            <span className="px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-xs font-mono font-semibold">
              BFT Dialectical Synthesis
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight flex items-center gap-3">
            Multi-Agent Architecture Review Council & Debate Arena
          </h1>
          <p className="text-sm text-slate-400 mt-1 max-w-3xl leading-relaxed">
            Convene 4 adversarial AI personas to vigorously stress-test distributed system proposals, uncover hidden single points of failure, calculate 5D Pareto trade-offs, and synthesize signed production RFCs.
          </p>
        </div>

        {sessionResult?.rfc && (
          <button
            onClick={() => setIsRfcModalOpen(true)}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-indigo-600/90 hover:bg-indigo-600 text-white text-xs font-bold shadow-lg shadow-indigo-600/20 border border-indigo-500/40 transition shrink-0"
          >
            <Award className="w-4 h-4" />
            <span>View Signed RFC ({sessionResult.rfc.rfcId})</span>
          </button>
        )}
      </div>

      {/* Council Persona HUD */}
      <DebatePersonaAvatarHUD
        personas={personas}
        activeSpeakerId={activeSpeakerId}
        roundNumber={currentRound}
        totalRounds={roundsCount}
      />

      {/* Main Grid: Proposal Input & Presets (Left) vs Real-Time Debate Arena (Right) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Preset Topics & Architecture Input */}
        <div className="lg:col-span-5 space-y-6">
          {/* Preset Topics Carousel / List */}
          <div className="bg-slate-900/90 rounded-2xl border border-slate-800 p-5 shadow-xl space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-2">
                <BookOpen className="w-4 h-4 text-indigo-400" />
                Architectural Scenarios & Presets
              </h3>
              <span className="text-xs text-slate-500 font-mono">
                {presetTopics.length} Benchmarks
              </span>
            </div>

            <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
              {presetTopics.map((preset) => {
                const isSelected = selectedTopicId === preset.id
                return (
                  <button
                    key={preset.id}
                    onClick={() => handleSelectPreset(preset)}
                    className={`w-full text-left p-3 rounded-xl border transition-all text-xs ${
                      isSelected
                        ? 'bg-indigo-600/10 border-indigo-500/80 text-white'
                        : 'bg-slate-950/60 border-slate-800 text-slate-300 hover:border-slate-700'
                    }`}
                  >
                    <div className="flex items-center justify-between font-bold mb-1">
                      <span className="line-clamp-1">{preset.title}</span>
                      <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-slate-800 text-indigo-300">
                        {preset.category}
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-400 line-clamp-2 leading-relaxed">
                      {preset.description}
                    </p>
                  </button>
                )
              })}
            </div>
          </div>

          {/* Architecture Proposal Editor */}
          <div className="bg-slate-900/90 rounded-2xl border border-slate-800 p-5 shadow-xl space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-2">
                <Layers className="w-4 h-4 text-purple-400" />
                Architecture Specification Proposal
              </h3>
              <span className="text-xs text-slate-500 font-mono">Input Specs</span>
            </div>

            <div className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1">
                  Architecture Title / Goal
                </label>
                <input
                  type="text"
                  value={topicInput}
                  onChange={(e) => setTopicInput(e.target.value)}
                  placeholder="e.g. Multi-Region Sharded Event Sourcing Pipeline"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-slate-600 focus:outline-none focus:border-indigo-500 transition font-mono"
                />
              </div>

              <div>
                <div className="flex items-center justify-between text-xs font-medium text-slate-400 mb-1">
                  <span>Component Topology & Security Controls</span>
                  <span className="text-slate-500 font-mono">{proposalInput.length} chars</span>
                </div>
                <textarea
                  rows={7}
                  value={proposalInput}
                  onChange={(e) => setProposalInput(e.target.value)}
                  placeholder="Paste your architecture draft, database engine choices, caching tiers, or security mechanisms..."
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-xs text-slate-200 placeholder-slate-600 focus:outline-none focus:border-indigo-500 transition font-mono resize-none leading-relaxed"
                />
              </div>

              {/* Rounds Config */}
              <div className="flex items-center justify-between pt-2 border-t border-slate-800/80">
                <span className="text-xs text-slate-400 font-medium">Deliberation Depth</span>
                <div className="flex items-center gap-1.5 bg-slate-950 px-2 py-1 rounded-xl border border-slate-800 text-xs">
                  {[2, 3, 4].map((r) => (
                    <button
                      key={r}
                      onClick={() => setRoundsCount(r)}
                      className={`px-2 py-0.5 rounded-lg text-xs font-bold transition ${
                        roundsCount === r
                          ? 'bg-indigo-600 text-white shadow-sm'
                          : 'text-slate-400 hover:text-white'
                      }`}
                    >
                      {r} Rnds
                    </button>
                  ))}
                </div>
              </div>

              {/* Action Buttons */}
              <div className="pt-2 flex items-center gap-3">
                <button
                  onClick={handleStartDebate}
                  disabled={isDebating || !topicInput.trim() || !proposalInput.trim()}
                  className="flex-1 py-3 px-4 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 disabled:opacity-50 text-white text-xs font-bold shadow-lg shadow-indigo-600/30 transition flex items-center justify-center gap-2 cursor-pointer"
                >
                  {isDebating ? (
                    <>
                      <RotateCcw className="w-4 h-4 animate-spin text-white" />
                      <span>Council Deliberating...</span>
                    </>
                  ) : (
                    <>
                      <Play className="w-4 h-4 fill-white text-white" />
                      <span>Convene Adversarial Council</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: Debate Stream & Pareto Radar */}
        <div className="lg:col-span-7 space-y-6">
          {sessionResult ? (
            <>
              {/* Pareto Tradeoff Radar */}
              <ParetoTradeoffRadar
                metrics={sessionResult.paretoMetrics}
                status={sessionResult.rfc.status}
                onOpenRfcModal={() => setIsRfcModalOpen(true)}
              />

              {/* Dialectical Turn Timeline */}
              <DialecticalTurnTimeline
                turns={sessionResult.turns}
                activeTurnIndex={activeTurnIndex}
                onSelectTurn={handleSelectTurn}
              />
            </>
          ) : (
            <div className="bg-slate-900/60 rounded-3xl border border-slate-800/80 p-12 text-center space-y-4">
              <div className="w-16 h-16 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 flex items-center justify-center mx-auto shadow-inner">
                <Sparkles className="w-8 h-8" />
              </div>
              <div className="max-w-md mx-auto space-y-2">
                <h3 className="text-base font-bold text-white">Council Chamber Ready</h3>
                <p className="text-xs text-slate-400 leading-relaxed">
                  Select an architectural benchmark from the left or input your customized design proposal. The council will initiate dialectical rounds across security, performance, fault-tolerance, and cost dimensions.
                </p>
              </div>
              <div className="pt-2 flex flex-wrap items-center justify-center gap-2">
                <span className="text-[11px] font-mono px-2.5 py-1 rounded-full bg-slate-800 text-slate-300 border border-slate-700 flex items-center gap-1.5">
                  <Shield className="w-3 h-3 text-rose-400" /> Threat Analysis
                </span>
                <span className="text-[11px] font-mono px-2.5 py-1 rounded-full bg-slate-800 text-slate-300 border border-slate-700 flex items-center gap-1.5">
                  <Cpu className="w-3 h-3 text-indigo-400" /> DDD Cohesion
                </span>
                <span className="text-[11px] font-mono px-2.5 py-1 rounded-full bg-slate-800 text-slate-300 border border-slate-700 flex items-center gap-1.5">
                  <CheckCircle2 className="w-3 h-3 text-emerald-400" /> BFT Consensus
                </span>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* RFC Signed Document Modal */}
      {sessionResult?.rfc && (
        <ConsensusRfcModal
          isOpen={isRfcModalOpen}
          rfc={sessionResult.rfc}
          onClose={() => setIsRfcModalOpen(false)}
        />
      )}
    </div>
  )
}

export default AgentDebateArenaPage
