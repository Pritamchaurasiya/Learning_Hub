import React, { useState } from 'react'
import { VoiceTurnResponse } from '../../types/multimodal'
import {
  Mic,
  MicOff,
  Zap,
  Volume2,
  Sparkles,
  HelpCircle,
  TrendingUp,
} from 'lucide-react'

interface VoiceConversationBarProps {
  lastVoiceTurn: VoiceTurnResponse | null
  isListening: boolean
  onToggleListening: () => void
  onSendSpokenPrompt: (text: string) => Promise<void>
  isProcessing: boolean
}

export const VoiceConversationBar: React.FC<VoiceConversationBarProps> = ({
  lastVoiceTurn,
  isListening,
  onToggleListening,
  onSendSpokenPrompt,
  isProcessing,
}) => {
  const [quickSpeechText, setQuickSpeechText] = useState<string>('')

  const handleQuickSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!quickSpeechText.trim()) return
    onSendSpokenPrompt(quickSpeechText.trim())
    setQuickSpeechText('')
  }

  const sentiment = lastVoiceTurn?.studentSentiment || 'CONFIDENT'
  const latency = lastVoiceTurn?.latencyMs || 185

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 space-y-3 shadow-xl">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        {/* Mic Activation & Waveform */}
        <div className="flex items-center gap-3">
          <button
            type="button"
            aria-label={isListening ? 'Stop voice recording' : 'Start voice conversation'}
            onClick={onToggleListening}
            className={`p-3 rounded-xl transition-all shadow-lg flex items-center justify-center ${
              isListening
                ? 'bg-rose-500 text-white shadow-rose-500/30 animate-pulse'
                : 'bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white shadow-blue-500/20'
            }`}
          >
            {isListening ? <Mic className="w-5 h-5" /> : <MicOff className="w-5 h-5" />}
          </button>

          <div>
            <div className="flex items-center gap-2">
              <span className="text-sm font-bold text-white">Bi-Directional Voice Studio</span>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-cyan-500/20 text-cyan-400 border border-cyan-500/30 flex items-center gap-1">
                <Zap className="w-3 h-3" /> {latency}ms Latency
              </span>
            </div>
            <p className="text-[11px] text-slate-400">
              {isListening ? 'Streaming spoken audio... Speak clearly into microphone' : 'Push-to-Talk ready (<300ms round-trip)'}
            </p>
          </div>
        </div>

        {/* Audio Waveform Simulator */}
        <div className="flex items-center gap-1 h-8 px-3 py-1 bg-slate-950 rounded-xl border border-slate-800">
          {[12, 24, 16, 28, 20, 10, 22, 14, 26, 18, 8, 20].map((h, i) => (
            <div
              key={i}
              className={`w-1 rounded-full transition-all duration-150 ${
                isListening
                  ? 'bg-cyan-400 animate-pulse'
                  : isProcessing
                  ? 'bg-indigo-400 animate-bounce'
                  : 'bg-slate-700'
              }`}
              style={{
                height: isListening ? `${h}px` : isProcessing ? `${(i % 3) * 8 + 8}px` : '4px',
              }}
            />
          ))}
        </div>
      </div>

      {/* Quick Speech input for headless/testing environments */}
      <form onSubmit={handleQuickSubmit} className="flex gap-2">
        <input
          type="text"
          value={quickSpeechText}
          onChange={e => setQuickSpeechText(e.target.value)}
          placeholder="Simulate spoken response (e.g. 'I see, the invariant holds because...')"
          className="flex-1 bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-cyan-500"
        />
        <button
          type="submit"
          disabled={isProcessing || !quickSpeechText.trim()}
          className="px-3 py-2 bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-slate-200 rounded-xl disabled:opacity-40 transition-colors"
        >
          Send Speech
        </button>
      </form>

      {/* Latest Voice Feedback Bubble */}
      {lastVoiceTurn && (
        <div className="p-3 bg-slate-950 rounded-xl border border-slate-800/80 space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Volume2 className="w-3.5 h-3.5 text-cyan-400" />
              <span className="text-xs font-semibold text-white">Dr. Socratic Audio Response</span>
            </div>

            <div className="flex items-center gap-1.5">
              {sentiment === 'CONFIDENT' ? (
                <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-emerald-500/20 text-emerald-400 flex items-center gap-1">
                  <TrendingUp className="w-3 h-3" /> Confident (130 WPM)
                </span>
              ) : sentiment === 'EXCITED' ? (
                <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-purple-500/20 text-purple-400 flex items-center gap-1">
                  <Sparkles className="w-3 h-3" /> Breakthrough Detected
                </span>
              ) : (
                <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-amber-500/20 text-amber-400 flex items-center gap-1">
                  <HelpCircle className="w-3 h-3" /> Cognitive Nudge
                </span>
              )}
            </div>
          </div>

          <p className="text-xs text-slate-300 italic">
            "{lastVoiceTurn.synthesizedResponseText}"
          </p>

          {lastVoiceTurn.followUpQuestions.length > 0 && (
            <div className="text-[11px] text-cyan-400/90 font-medium">
              Target Question: {lastVoiceTurn.followUpQuestions[0]}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
