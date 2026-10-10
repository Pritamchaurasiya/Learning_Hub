import React from 'react'
import { Shield, Cpu, Zap, Activity, Mic, MicOff } from 'lucide-react'
import { DebatePersona, DebatePersonaId } from '../../types/agentDebate'

interface DebatePersonaAvatarHUDProps {
  personas: DebatePersona[]
  activeSpeakerId?: DebatePersonaId | null
  roundNumber: number
  totalRounds: number
}

export const DebatePersonaAvatarHUD: React.FC<DebatePersonaAvatarHUDProps> = ({
  personas,
  activeSpeakerId,
  roundNumber,
  totalRounds,
}) => {
  const getPersonaIcon = (id: DebatePersonaId) => {
    switch (id) {
      case 'ARCHITECT_AVA':
        return <Cpu className="w-5 h-5" />
      case 'SENTINEL_REX':
        return <Shield className="w-5 h-5" />
      case 'VELOCITY_VIK':
        return <Zap className="w-5 h-5" />
      case 'CHAOS_CHLOE':
        return <Activity className="w-5 h-5" />
      default:
        return <Cpu className="w-5 h-5" />
    }
  }

  return (
    <div className="bg-slate-900/90 backdrop-blur-md rounded-2xl border border-slate-800 p-4 shadow-xl">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4 pb-3 border-b border-slate-800">
        <div>
          <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-indigo-500 animate-ping" />
            Adversarial Council Personas
          </h3>
          <p className="text-xs text-slate-400 mt-0.5">
            4 Specialized Multi-Agent Reviewers deliberating architectural trade-offs
          </p>
        </div>
        <div className="flex items-center gap-2 bg-slate-950 px-3 py-1.5 rounded-xl border border-slate-800 text-xs font-mono text-slate-300">
          <span className="text-indigo-400 font-semibold">Dialectical Round</span>
          <span className="text-white font-bold">{roundNumber}</span>
          <span className="text-slate-500">/</span>
          <span>{totalRounds}</span>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        {personas.map((persona) => {
          const isSpeaking = activeSpeakerId === persona.id
          return (
            <div
              key={persona.id}
              className={`p-3.5 rounded-xl border transition-all duration-300 relative overflow-hidden ${
                isSpeaking
                  ? 'bg-slate-800/90 border-indigo-500/80 shadow-lg shadow-indigo-500/20 scale-[1.02]'
                  : 'bg-slate-950/60 border-slate-800/80 hover:border-slate-700'
              }`}
            >
              {isSpeaking && (
                <div
                  className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 animate-pulse"
                />
              )}

              <div className="flex items-center justify-between mb-2">
                <div
                  className="w-10 h-10 rounded-xl flex items-center justify-center text-white shadow-inner"
                  style={{ backgroundColor: `${persona.avatarColor}25`, color: persona.avatarColor }}
                >
                  {getPersonaIcon(persona.id)}
                </div>
                <div className="flex items-center gap-1.5">
                  {isSpeaking ? (
                    <span className="flex items-center gap-1 text-[11px] font-bold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/30">
                      <Mic className="w-3 h-3 animate-bounce" /> Speaking
                    </span>
                  ) : (
                    <span className="text-[11px] font-medium text-slate-500 flex items-center gap-1">
                      <MicOff className="w-3 h-3" /> Listening
                    </span>
                  )}
                </div>
              </div>

              <div className="space-y-1">
                <div className="font-bold text-white text-sm tracking-tight">{persona.name}</div>
                <div className="text-[11px] font-medium text-indigo-400">{persona.title}</div>
                <p className="text-[11px] text-slate-400 line-clamp-2 leading-relaxed mt-1">
                  {persona.specialty}
                </p>
              </div>

              <div className="mt-2.5 pt-2 border-t border-slate-800/80 flex items-center justify-between text-[10px] text-slate-500">
                <span className="font-mono">Priority:</span>
                <span className="text-slate-300 font-semibold truncate max-w-[130px]">
                  {persona.corePriority}
                </span>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
