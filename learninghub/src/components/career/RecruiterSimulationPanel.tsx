import React, { useState } from 'react'
import {
  RecruiterPersona,
  RecruiterTurn,
  RecruiterPersonaRole,
  CompensationPackage,
  SimulatedJobListing,
} from '../../types/career'
import {
  Send,
  Sparkles,
  TrendingUp,
  Bot,
  User,
  Sliders,
} from 'lucide-react'

interface RecruiterSimulationPanelProps {
  job: SimulatedJobListing
  personas: RecruiterPersona[]
  activePersona: RecruiterPersonaRole
  dialogueHistory: RecruiterTurn[]
  currentOffer: CompensationPackage
  leverageScore: number
  onPersonaSelect: (role: RecruiterPersonaRole) => void
  onSendMessage: (message: string) => void
  onOpenNegotiator: () => void
  isLoading?: boolean
}

export const RecruiterSimulationPanel: React.FC<RecruiterSimulationPanelProps> = ({
  job,
  personas,
  activePersona,
  dialogueHistory,
  currentOffer: _currentOffer,
  leverageScore,
  onPersonaSelect,
  onSendMessage,
  onOpenNegotiator,
  isLoading,
}) => {
  const [inputText, setInputText] = useState('')

  const handleSend = (e: React.FormEvent) => {
    e.preventDefault()
    if (!inputText.trim() || isLoading) return
    onSendMessage(inputText)
    setInputText('')
  }

  const latestRecruiterTurn = [...dialogueHistory].reverse().find(t => t.speaker === 'RECRUITER')

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-3xl p-5 sm:p-6 space-y-6 shadow-xl">
      {/* Top Header: Target Job and Leverage Summary */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-800">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-blue-500/10 text-blue-400 border border-blue-500/20 flex items-center gap-1">
              <Bot className="w-3 h-3" /> Multi-Agent Hiring Council
            </span>
            <span className="text-xs text-slate-400 font-mono">{job.company}</span>
          </div>
          <h2 className="text-lg sm:text-xl font-bold text-white mt-1">
            {job.title}
          </h2>
        </div>

        {/* Leverage & Current Offer Chip */}
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-2xl bg-slate-950 border border-slate-800 text-right">
            <div className="text-[10px] uppercase font-mono text-slate-500">Candidate Leverage</div>
            <div className="text-sm font-extrabold text-emerald-400 flex items-center gap-1 justify-end">
              <TrendingUp className="w-3.5 h-3.5 text-emerald-400" />
              <span>{leverageScore} / 100</span>
            </div>
          </div>

          <button
            type="button"
            onClick={onOpenNegotiator}
            className="px-3.5 py-2.5 rounded-2xl text-xs font-bold bg-emerald-600 hover:bg-emerald-500 text-white shadow-md shadow-emerald-600/20 flex items-center gap-1.5 transition-all"
          >
            <Sliders className="w-4 h-4" />
            <span>Counter Offer</span>
          </button>
        </div>
      </div>

      {/* Recruiter Persona Switcher Tabs */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {personas.map(persona => {
          const isActive = persona.role === activePersona
          return (
            <div
              key={persona.role}
              onClick={() => onPersonaSelect(persona.role)}
              className={`p-3.5 rounded-2xl border transition-all cursor-pointer ${
                isActive
                  ? 'bg-slate-950 border-blue-500 ring-1 ring-blue-500/40 shadow-md'
                  : 'bg-slate-950/60 border-slate-800 hover:border-slate-700'
              }`}
            >
              <div className="flex items-center gap-2.5">
                <div className={`w-8 h-8 rounded-xl bg-gradient-to-tr ${persona.avatarColor} flex items-center justify-center text-white font-bold text-xs shadow-sm`}>
                  {persona.name.charAt(0)}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="text-xs font-bold text-white truncate">{persona.name}</div>
                  <div className="text-[10px] text-slate-400 truncate">{persona.title}</div>
                </div>
              </div>
              <div className="mt-2 text-[10px] text-slate-400 line-clamp-1">
                {persona.evaluationFocus}
              </div>
            </div>
          )
        })}
      </div>

      {/* Dialogue Conversation Stream */}
      <div className="space-y-4 max-h-[420px] overflow-y-auto p-3 rounded-2xl bg-slate-950 border border-slate-800">
        {dialogueHistory.map(turn => {
          if (turn.speaker === 'SYSTEM') {
            return (
              <div key={turn.id} className="text-center my-2">
                <span className="px-3 py-1 rounded-full text-[11px] font-mono text-slate-400 bg-slate-900 border border-slate-800">
                  {turn.content}
                </span>
              </div>
            )
          }

          const isCandidate = turn.speaker === 'CANDIDATE'
          return (
            <div
              key={turn.id}
              className={`flex items-start gap-2.5 ${isCandidate ? 'justify-end' : 'justify-start'}`}
            >
              {!isCandidate && (
                <div className="w-7 h-7 rounded-lg bg-blue-600/20 border border-blue-500/30 flex items-center justify-center text-blue-400 text-xs font-bold shrink-0 mt-1">
                  <Bot className="w-4 h-4" />
                </div>
              )}

              <div
                className={`max-w-[85%] sm:max-w-[75%] p-3.5 rounded-2xl text-xs leading-relaxed space-y-1.5 ${
                  isCandidate
                    ? 'bg-emerald-600 text-white rounded-br-none shadow-sm'
                    : 'bg-slate-900 text-slate-200 border border-slate-800 rounded-bl-none'
                }`}
              >
                {!isCandidate && (
                  <div className="flex items-center justify-between gap-2 text-[10px] font-mono text-slate-400 pb-1 border-b border-slate-800">
                    <span className="font-bold text-blue-400">{turn.personaName}</span>
                    {turn.sentimentTag && (
                      <span className="px-1.5 py-0.2 rounded bg-slate-800 text-slate-300">
                        {turn.sentimentTag.replace(/_/g, ' ')}
                      </span>
                    )}
                  </div>
                )}
                <div>{turn.content}</div>
              </div>

              {isCandidate && (
                <div className="w-7 h-7 rounded-lg bg-emerald-600/20 border border-emerald-500/30 flex items-center justify-center text-emerald-400 text-xs font-bold shrink-0 mt-1">
                  <User className="w-4 h-4" />
                </div>
              )}
            </div>
          )
        })}

        {isLoading && (
          <div className="flex items-center gap-2 text-xs text-slate-400 p-2">
            <div className="w-4 h-4 border-2 border-blue-400 border-t-transparent rounded-full animate-spin" />
            <span>Recruiter agent is analyzing telemetry & response...</span>
          </div>
        )}
      </div>

      {/* Suggested Response Chips */}
      {latestRecruiterTurn?.suggestedResponses && latestRecruiterTurn.suggestedResponses.length > 0 && (
        <div className="space-y-1.5">
          <div className="text-[11px] font-semibold text-slate-400 flex items-center gap-1">
            <Sparkles className="w-3 h-3 text-cyan-400" />
            <span>Recommended Strategic Replies:</span>
          </div>
          <div className="flex flex-wrap gap-2">
            {latestRecruiterTurn.suggestedResponses.map((suggestion, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => onSendMessage(suggestion)}
                className="text-left text-xs px-3 py-1.5 rounded-xl bg-slate-950 border border-slate-800 hover:border-cyan-500/40 text-slate-300 hover:text-white transition-colors"
              >
                {suggestion}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Input Field & Send Action */}
      <form onSubmit={handleSend} className="flex items-center gap-2 pt-2">
        <input
          type="text"
          value={inputText}
          onChange={e => setInputText(e.target.value)}
          placeholder={`Type message to ${personas.find(p => p.role === activePersona)?.name || 'Recruiter'}...`}
          disabled={isLoading}
          className="flex-1 px-4 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 transition-colors"
        />
        <button
          type="submit"
          disabled={!inputText.trim() || isLoading}
          className="p-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white transition-colors shadow-sm"
        >
          <Send className="w-4 h-4" />
        </button>
      </form>
    </div>
  )
}
