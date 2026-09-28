import { useState } from 'react'
import {
  Users,
  Sparkles,
  X,
  Send,
  Loader2,
  CheckCircle2,
  ArrowRight,
} from 'lucide-react'
import {
  aiCouncilService,
  type CouncilConsultationResult,
  type AgentPerspective,
  type AgentRole,
} from '../services/aiCouncilService'

interface AICouncilModalProps {
  isOpen: boolean
  onClose: () => void
  initialQuery?: string
  initialCode?: string
  language?: string
  problemTitle?: string
  problemDescription?: string
}

export function AICouncilModal({
  isOpen,
  onClose,
  initialQuery = '',
  initialCode = '',
  language = 'python',
  problemTitle = 'Algorithmic Challenge',
  problemDescription = '',
}: AICouncilModalProps) {
  const [query, setQuery] = useState(initialQuery)
  const [studentLevel, setStudentLevel] = useState<'beginner' | 'intermediate' | 'advanced'>('intermediate')
  const [isLoading, setIsLoading] = useState(false)
  const [result, setResult] = useState<CouncilConsultationResult | null>(null)
  const [activeTab, setActiveTab] = useState<'all' | AgentRole>('all')

  if (!isOpen) return null

  const handleConsult = async () => {
    if (!query.trim()) return
    setIsLoading(true)
    try {
      const res = await aiCouncilService.consultCouncil({
        query: query.trim(),
        codeSnippet: initialCode || undefined,
        language,
        problemTitle,
        problemDescription,
        studentLevel,
      })
      setResult(res)
      setActiveTab('all')
    } catch (err) {
      console.error('Council consultation error:', err)
    } finally {
      setIsLoading(false)
    }
  }

  const renderAgentCard = (agent: AgentPerspective, borderTheme: string, bgTheme: string) => (
    <div className={`p-4 rounded-xl border ${borderTheme} ${bgTheme} space-y-3 transition-all shadow-sm`}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <span className="text-2xl">{agent.avatar}</span>
          <div>
            <h4 className="text-sm font-bold text-gray-100">{agent.name}</h4>
            <span className="text-[11px] font-medium text-gray-400">{agent.badge}</span>
          </div>
        </div>
        <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-gray-800 text-gray-300 border border-gray-700">
          {Math.round(agent.confidenceScore * 100)}% Match
        </span>
      </div>

      <p className="text-xs text-gray-300 leading-relaxed font-sans">{agent.recommendation}</p>

      {agent.keyObservations && agent.keyObservations.length > 0 && (
        <div className="space-y-1.5 pt-1 border-t border-gray-800/60">
          <span className="text-[10px] uppercase font-bold tracking-wider text-gray-400">Key Observations</span>
          <ul className="text-xs text-gray-400 space-y-1 pl-4 list-disc">
            {agent.keyObservations.map((obs, idx) => (
              <li key={idx}>{obs}</li>
            ))}
          </ul>
        </div>
      )}

      {agent.suggestedAction && (
        <div className="p-2.5 rounded-lg bg-gray-900/90 border border-gray-800 flex items-start gap-2">
          <ArrowRight className="w-3.5 h-3.5 text-primary-400 mt-0.5 shrink-0" />
          <span className="text-xs text-primary-200 font-medium">{agent.suggestedAction}</span>
        </div>
      )}
    </div>
  )

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-150">
      <div className="bg-gray-950 border border-gray-800 rounded-2xl w-full max-w-4xl max-h-[92vh] flex flex-col shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="px-5 py-4 border-b border-gray-800/80 bg-gray-900/60 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-500 p-0.5 shadow-lg shadow-purple-500/20">
              <div className="w-full h-full bg-gray-950 rounded-[10px] flex items-center justify-center">
                <Users className="w-5 h-5 text-purple-400" />
              </div>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm sm:text-base font-bold text-gray-100">Multi-Agent Collaborative Tutor</h3>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-purple-500/20 text-purple-300 border border-purple-500/30">
                  Council Mode (3 Agents)
                </span>
              </div>
              <p className="text-xs text-gray-400">
                Cooperative guidance from Dr. Socratic, Staff Reviewer, and Coach Maya
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-gray-400 hover:text-white hover:bg-gray-800 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Area */}
        <div className="flex-1 overflow-y-auto p-5 space-y-5 custom-scrollbar">
          {/* Query Bar */}
          <div className="space-y-3 bg-gray-900/40 p-4 rounded-xl border border-gray-800">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <label className="text-xs font-semibold text-gray-300 flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                Describe what you are working through or where you feel blocked:
              </label>
              <div className="flex items-center gap-1 bg-gray-950 p-0.5 rounded-lg border border-gray-800 text-[11px]">
                <button
                  onClick={() => setStudentLevel('beginner')}
                  className={`px-2 py-0.5 rounded ${studentLevel === 'beginner' ? 'bg-primary-600 text-white font-bold' : 'text-gray-400'}`}
                >
                  Beginner
                </button>
                <button
                  onClick={() => setStudentLevel('intermediate')}
                  className={`px-2 py-0.5 rounded ${studentLevel === 'intermediate' ? 'bg-primary-600 text-white font-bold' : 'text-gray-400'}`}
                >
                  Intermediate
                </button>
                <button
                  onClick={() => setStudentLevel('advanced')}
                  className={`px-2 py-0.5 rounded ${studentLevel === 'advanced' ? 'bg-primary-600 text-white font-bold' : 'text-gray-400'}`}
                >
                  Advanced
                </button>
              </div>
            </div>

            <div className="flex gap-2">
              <input
                type="text"
                value={query}
                onChange={e => setQuery(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleConsult()}
                placeholder="e.g. My recursion exceeds maximum call stack on large graphs, or I feel stuck on the base case..."
                className="flex-1 bg-gray-950 border border-gray-800 rounded-xl px-3.5 py-2 text-xs text-gray-100 placeholder-gray-500 focus:outline-none focus:border-primary-500"
              />
              <button
                onClick={handleConsult}
                disabled={isLoading || !query.trim()}
                className="px-4 py-2 bg-gradient-to-r from-primary-600 to-purple-600 hover:from-primary-500 hover:to-purple-500 disabled:opacity-50 text-white text-xs font-bold rounded-xl flex items-center gap-2 shadow-lg shadow-purple-600/20 transition-all shrink-0"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>Convening...</span>
                  </>
                ) : (
                  <>
                    <Send className="w-3.5 h-3.5" />
                    <span>Consult Council</span>
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Results Display */}
          {result && (
            <div className="space-y-5 animate-in fade-in slide-in-from-bottom-2 duration-200">
              {/* Executive Summary Card */}
              <div className="p-4 rounded-xl bg-purple-950/20 border border-purple-500/30 space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-purple-400" />
                    <h4 className="text-xs font-bold uppercase tracking-wider text-purple-300">
                      Executive Council Consensus
                    </h4>
                  </div>
                  {result.sentimentDetected && (
                    <span className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full border ${
                      result.sentimentDetected === 'frustrated'
                        ? 'bg-rose-500/10 text-rose-300 border-rose-500/30'
                        : result.sentimentDetected === 'fatigued'
                          ? 'bg-amber-500/10 text-amber-300 border-amber-500/30'
                          : 'bg-emerald-500/10 text-emerald-300 border-emerald-500/30'
                    }`}>
                      Sentiment: {result.sentimentDetected.toUpperCase()}
                    </span>
                  )}
                </div>
                <p className="text-xs sm:text-sm text-gray-200 leading-relaxed font-sans">
                  {result.councilSummary}
                </p>
              </div>

              {/* Specialist Filter Tabs */}
              <div className="flex items-center gap-2 border-b border-gray-800 pb-2">
                <button
                  onClick={() => setActiveTab('all')}
                  className={`text-xs px-3 py-1.5 rounded-lg font-medium transition-colors ${
                    activeTab === 'all'
                      ? 'bg-gray-800 text-white shadow-sm'
                      : 'text-gray-400 hover:text-gray-200'
                  }`}
                >
                  All 3 Perspectives
                </button>
                <button
                  onClick={() => setActiveTab('socratic_guide')}
                  className={`text-xs px-3 py-1.5 rounded-lg font-medium transition-colors flex items-center gap-1.5 ${
                    activeTab === 'socratic_guide'
                      ? 'bg-blue-900/40 text-blue-300 border border-blue-500/30'
                      : 'text-gray-400 hover:text-gray-200'
                  }`}
                >
                  <span>🦉</span> Socratic Guide
                </button>
                <button
                  onClick={() => setActiveTab('code_reviewer')}
                  className={`text-xs px-3 py-1.5 rounded-lg font-medium transition-colors flex items-center gap-1.5 ${
                    activeTab === 'code_reviewer'
                      ? 'bg-emerald-900/40 text-emerald-300 border border-emerald-500/30'
                      : 'text-gray-400 hover:text-gray-200'
                  }`}
                >
                  <span>⚡</span> Code Reviewer
                </button>
                <button
                  onClick={() => setActiveTab('motivational_coach')}
                  className={`text-xs px-3 py-1.5 rounded-lg font-medium transition-colors flex items-center gap-1.5 ${
                    activeTab === 'motivational_coach'
                      ? 'bg-amber-900/40 text-amber-300 border border-amber-500/30'
                      : 'text-gray-400 hover:text-gray-200'
                  }`}
                >
                  <span>🌟</span> Motivational Coach
                </button>
              </div>

              {/* Agent Cards Grid */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5">
                {(activeTab === 'all' || activeTab === 'socratic_guide') &&
                  renderAgentCard(
                    result.perspectives.socratic_guide,
                    'border-blue-500/30',
                    'bg-blue-950/10'
                  )}
                {(activeTab === 'all' || activeTab === 'code_reviewer') &&
                  renderAgentCard(
                    result.perspectives.code_reviewer,
                    'border-emerald-500/30',
                    'bg-emerald-950/10'
                  )}
                {(activeTab === 'all' || activeTab === 'motivational_coach') &&
                  renderAgentCard(
                    result.perspectives.motivational_coach,
                    'border-amber-500/30',
                    'bg-amber-950/10'
                  )}
              </div>

              {/* Action Plan */}
              {result.actionPlan && result.actionPlan.length > 0 && (
                <div className="p-4 rounded-xl bg-gray-900/50 border border-gray-800 space-y-2.5">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-gray-300 flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                    Recommended Multi-Step Action Plan
                  </h4>
                  <div className="space-y-1.5">
                    {result.actionPlan.map((step, idx) => (
                      <div key={idx} className="flex items-start gap-2.5 text-xs text-gray-300 font-sans">
                        <span className="w-4 h-4 rounded-full bg-gray-800 text-[10px] font-bold flex items-center justify-center text-primary-400 mt-0.5 shrink-0">
                          {idx + 1}
                        </span>
                        <span>{step}</span>
                      </div>
                    ))}
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
