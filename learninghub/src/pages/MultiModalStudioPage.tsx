import React, { useState, useEffect } from 'react'
import {
  CanvasStroke,
  ParsedMathEquation,
  VisionTelemetryFrame,
  VoiceTurnResponse,
  CanvasPresetTemplate,
} from '../types/multimodal'
import { multiModalService } from '../services/multimodalService'
import { CanvasWhiteboard } from '../components/multimodal/CanvasWhiteboard'
import { VisionTelemetryHUD } from '../components/multimodal/VisionTelemetryHUD'
import { VoiceConversationBar } from '../components/multimodal/VoiceConversationBar'
import {
  Sparkles,
  Zap,
  Activity,
  Layers,
  BookOpen,
} from 'lucide-react'

export const MultiModalStudioPage: React.FC = () => {
  const [sessionId] = useState<string>(`multimodal_${Date.now()}`)
  const [strokes, setStrokes] = useState<CanvasStroke[]>([])
  const [isParsingMath, setIsParsingMath] = useState<boolean>(false)
  const [parsedEquation, setParsedEquation] = useState<ParsedMathEquation | null>(null)
  const [selectedDomain, setSelectedDomain] = useState<'CALCULUS' | 'LINEAR_ALGEBRA' | 'DATA_STRUCTURES' | 'GENERAL_MATH'>('CALCULUS')

  // Vision State
  const [isCameraActive, setIsCameraActive] = useState<boolean>(true)
  const [visionTelemetry, setVisionTelemetry] = useState<VisionTelemetryFrame | null>(null)

  // Voice State
  const [isListening, setIsListening] = useState<boolean>(false)
  const [isVoiceProcessing, setIsVoiceProcessing] = useState<boolean>(false)
  const [lastVoiceTurn, setLastVoiceTurn] = useState<VoiceTurnResponse | null>(null)

  // Presets
  const [presets, setPresets] = useState<CanvasPresetTemplate[]>([])

  useEffect(() => {
    const list = multiModalService.getPresetTemplates()
    setPresets(list)

    // Initial vision telemetry frame
    multiModalService
      .submitVisionTelemetry(sessionId, { gazeX: 0.05, gazeY: 0.01, faceCount: 1 })
      .then(setVisionTelemetry)
  }, [sessionId])

  const handleParseMath = async () => {
    setIsParsingMath(true)
    try {
      const result = await multiModalService.parseCanvasStrokes(sessionId, strokes, selectedDomain)
      setParsedEquation(result)
    } finally {
      setIsParsingMath(false)
    }
  }

  const handleApplyPreset = (preset: CanvasPresetTemplate) => {
    setStrokes(preset.initialStrokes)
    setSelectedDomain(preset.domain)
    setParsedEquation({
      sessionId,
      recognizedLatex: preset.initialLatex,
      displayKaTeX: `$${preset.initialLatex}$`,
      confidence: 0.98,
      astTree: { type: 'RELATION', value: '=' },
      complexityCategory: preset.domain === 'CALCULUS' ? 'ADVANCED' : 'INTERMEDIATE',
      socraticSuggestions: [
        `Examine the core theorem represented by: ${preset.initialLatex}`,
        'Can you trace the inductive step or coordinate transformation required to prove this?',
      ],
    })
  }

  const handleSimulateVisionAnomaly = async (type: 'LOOKING_AWAY' | 'MULTI_FACE' | 'NORMAL') => {
    let payload = { gazeX: 0.05, gazeY: 0.02, faceCount: 1 }
    if (type === 'LOOKING_AWAY') {
      payload = { gazeX: 0.75, gazeY: 0.1, faceCount: 1 }
    } else if (type === 'MULTI_FACE') {
      payload = { gazeX: 0.1, gazeY: 0.0, faceCount: 2 }
    }

    const frame = await multiModalService.submitVisionTelemetry(sessionId, payload)
    setVisionTelemetry(frame)
  }

  const handleSendSpokenPrompt = async (transcript: string) => {
    setIsVoiceProcessing(true)
    try {
      const response = await multiModalService.submitVoiceTurn(sessionId, transcript)
      setLastVoiceTurn(response)
    } finally {
      setIsVoiceProcessing(false)
    }
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 p-4 sm:p-6 lg:p-8 space-y-6">
      {/* Top Header */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-4 border-b border-slate-800">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-purple-500/10 text-purple-400 border border-purple-500/20 flex items-center gap-1">
              <Sparkles className="w-3 h-3" /> Milestone 14
            </span>
            <span className="text-xs text-slate-400 font-mono">Multi-Modal AI Engine</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-white mt-1 tracking-tight">
            Voice, Vision & Interactive Canvas Studio
          </h1>
          <p className="text-sm text-slate-400 mt-1 max-w-2xl">
            Real-time multi-modal tutoring with vector whiteboard LaTeX recognition, sub-300ms audio conversational dialogue, and camera-based gaze telemetry.
          </p>
        </div>

        {/* Status Indicators */}
        <div className="flex items-center gap-2 flex-wrap">
          <span className="px-3 py-1 rounded-xl text-xs font-semibold bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 flex items-center gap-1.5">
            <Zap className="w-3.5 h-3.5 text-cyan-400" />
            &lt; 300ms Voice Turn
          </span>
          <span className="px-3 py-1 rounded-xl text-xs font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 flex items-center gap-1.5">
            <Activity className="w-3.5 h-3.5 text-emerald-400" />
            Active Gaze Telemetry
          </span>
        </div>
      </div>

      {/* Preset Sketch Templates Bar */}
      <div className="flex items-center gap-2 overflow-x-auto pb-2">
        <span className="text-xs text-slate-400 font-semibold flex items-center gap-1 whitespace-nowrap">
          <BookOpen className="w-3.5 h-3.5 text-purple-400" /> Load Template:
        </span>
        {presets.map(p => (
          <button
            key={p.id}
            type="button"
            onClick={() => handleApplyPreset(p)}
            className="px-3 py-1.5 rounded-xl text-xs font-medium bg-slate-900 border border-slate-800 hover:border-purple-500/50 hover:bg-slate-850 text-slate-200 whitespace-nowrap transition-all flex items-center gap-1.5"
          >
            <Layers className="w-3 h-3 text-purple-400" />
            {p.title}
          </button>
        ))}
      </div>

      {/* Main Studio Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Canvas Whiteboard (7 cols) */}
        <div className="lg:col-span-7 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-bold text-white flex items-center gap-2">
              <span>Mathematical Canvas & Sketchpad</span>
            </h2>

            {/* Domain Switcher */}
            <div className="flex items-center gap-1 bg-slate-900 p-1 rounded-xl border border-slate-800 text-xs">
              {(['CALCULUS', 'LINEAR_ALGEBRA', 'DATA_STRUCTURES'] as const).map(d => (
                <button
                  key={d}
                  type="button"
                  onClick={() => setSelectedDomain(d)}
                  className={`px-2.5 py-1 rounded-lg font-medium transition-colors ${
                    selectedDomain === d
                      ? 'bg-purple-600 text-white font-bold'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  {d === 'CALCULUS' ? 'Calculus' : d === 'LINEAR_ALGEBRA' ? 'Linear Alg' : 'DSA'}
                </button>
              ))}
            </div>
          </div>

          <CanvasWhiteboard
            strokes={strokes}
            onStrokesChange={setStrokes}
            onParseMath={handleParseMath}
            isParsing={isParsingMath}
            parsedEquation={parsedEquation}
          />
        </div>

        {/* Right Column: Vision & Voice Telemetry HUD (5 cols) */}
        <div className="lg:col-span-5 space-y-6">
          <VisionTelemetryHUD
            telemetry={visionTelemetry}
            isCameraActive={isCameraActive}
            onToggleCamera={() => setIsCameraActive(!isCameraActive)}
            onSimulateAnomaly={handleSimulateVisionAnomaly}
          />

          <VoiceConversationBar
            lastVoiceTurn={lastVoiceTurn}
            isListening={isListening}
            onToggleListening={() => setIsListening(!isListening)}
            onSendSpokenPrompt={handleSendSpokenPrompt}
            isProcessing={isVoiceProcessing}
          />
        </div>
      </div>
    </div>
  )
}
export default MultiModalStudioPage
