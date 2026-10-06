import { useState, useEffect } from 'react'
import { Volume2, VolumeX } from 'lucide-react'
import type { InterviewPersona } from '../../types/interview'
import { AudioVisualizerWave } from './AudioVisualizerWave'

interface InterviewerAvatarHUDProps {
  persona: InterviewPersona
  status: 'listening' | 'speaking' | 'thinking' | 'idle'
  onToggleSpeech?: (enabled: boolean) => void
  lastSpokenText?: string
}

export function InterviewerAvatarHUD({
  persona,
  status,
  onToggleSpeech,
  lastSpokenText,
}: InterviewerAvatarHUDProps) {
  const [speechEnabled, setSpeechEnabled] = useState(true)

  const isAlex = persona === 'ALEX_STAFF_ARCHITECT'
  const displayName = isAlex ? 'Alex' : 'Sophia'
  const displayRole = isAlex ? 'Senior Staff Systems Architect' : 'Algorithm & Coding Specialist'
  const avatarInitials = isAlex ? 'AX' : 'SP'
  const gradientColor = isAlex
    ? 'from-amber-500 via-orange-600 to-rose-600'
    : 'from-cyan-500 via-indigo-600 to-purple-600'

  // Handle SpeechSynthesis audio narration if supported
  useEffect(() => {
    if (!speechEnabled || !lastSpokenText || status !== 'speaking') return

    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel() // Stop any previous speech
      const utterance = new SpeechSynthesisUtterance(lastSpokenText)
      utterance.rate = 1.05
      utterance.pitch = isAlex ? 0.95 : 1.15

      // Select natural sounding voice if available
      const voices = window.speechSynthesis.getVoices()
      const preferred = voices.find(v =>
        isAlex ? v.name.includes('Male') || v.name.includes('David') : v.name.includes('Female') || v.name.includes('Zira')
      )
      if (preferred) utterance.voice = preferred

      window.speechSynthesis.speak(utterance)
    }

    return () => {
      if ('speechSynthesis' in window) {
        window.speechSynthesis.cancel()
      }
    }
  }, [lastSpokenText, speechEnabled, isAlex, status])

  const handleToggleVoice = () => {
    const next = !speechEnabled
    setSpeechEnabled(next)
    if (!next && 'speechSynthesis' in window) {
      window.speechSynthesis.cancel()
    }
    onToggleSpeech?.(next)
  }

  return (
    <div className="flex flex-wrap items-center justify-between gap-3 p-3.5 bg-slate-900/90 border border-slate-800 rounded-xl backdrop-blur-md shadow-lg">
      <div className="flex items-center gap-3">
        <div className="relative">
          <div
            className={`w-11 h-11 rounded-xl bg-gradient-to-tr ${gradientColor} flex items-center justify-center text-white font-bold text-base shadow-md ring-2 ${
              status === 'speaking' ? 'ring-indigo-400 ring-offset-2 ring-offset-slate-900 animate-pulse' : 'ring-slate-700'
            }`}
          >
            {avatarInitials}
          </div>
          <span
            className={`absolute -bottom-1 -right-1 w-3.5 h-3.5 rounded-full border-2 border-slate-900 ${
              status === 'speaking'
                ? 'bg-emerald-500 animate-ping'
                : status === 'thinking'
                ? 'bg-amber-400'
                : 'bg-indigo-500'
            }`}
          />
        </div>

        <div>
          <div className="flex items-center gap-2">
            <h4 className="font-semibold text-slate-100 text-sm">{displayName}</h4>
            <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
              AI Interviewer
            </span>
          </div>
          <p className="text-xs text-slate-400">{displayRole}</p>
        </div>
      </div>

      <div className="flex items-center gap-2">
        <AudioVisualizerWave
          isActive={status === 'speaking' || status === 'listening'}
          accentColor={isAlex ? '#F59E0B' : '#6366F1'}
          label={
            status === 'speaking'
              ? `${displayName} speaking...`
              : status === 'listening'
              ? 'Candidate speaking...'
              : status === 'thinking'
              ? 'Synthesizing...'
              : 'Channel ready'
          }
        />

        <button
          type="button"
          onClick={handleToggleVoice}
          title={speechEnabled ? 'Mute AI voice output' : 'Enable AI voice output'}
          className={`p-2 rounded-lg border text-xs flex items-center gap-1.5 transition-colors ${
            speechEnabled
              ? 'bg-indigo-600/20 text-indigo-300 border-indigo-500/40 hover:bg-indigo-600/30'
              : 'bg-slate-800 text-slate-400 border-slate-700 hover:bg-slate-700'
          }`}
        >
          {speechEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
          <span className="hidden sm:inline">{speechEnabled ? 'Voice On' : 'Muted'}</span>
        </button>
      </div>
    </div>
  )
}
