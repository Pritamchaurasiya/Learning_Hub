import { useState, useEffect, useRef, useCallback } from 'react'
import {
  Mic,
  MicOff,
  Send,
  Sparkles,
  Code2,
  FileText,
  Lightbulb,
  Clock,
  RotateCcw,
  Award,
} from 'lucide-react'
import { useQuery } from '@tanstack/react-query'
import { SEO } from '../components/SEO'
import AnimatedPage from '../components/AnimatedPage'
import { Button } from '../components/ui/Button'
import { Card } from '../components/ui/Card'
import { Modal } from '../components/ui/Modal'
import { useStore } from '../stores/useStore'
import { interviewService, FALLBACK_TEMPLATES } from '../services/interviewService'
import { InterviewerAvatarHUD } from '../components/interview/InterviewerAvatarHUD'
import { InterviewEvaluationScorecard } from '../components/interview/InterviewEvaluationScorecard'
import type {
  InterviewSession,
  InterviewTrack,
  InterviewDifficulty,
  InterviewPersona,
  TurnStage,
} from '../types/interview'

export default function InterviewSimulatorPage() {
  const addToast = useStore(state => state.addToast)

  // Setup modal state
  const [isSetupOpen, setIsSetupOpen] = useState(false)
  const [selectedTrack, setSelectedTrack] = useState<InterviewTrack>('ALGORITHM_CODING')
  const [selectedDifficulty, setSelectedDifficulty] = useState<InterviewDifficulty>('SENIOR')
  const [selectedPersona, setSelectedPersona] = useState<InterviewPersona>('SOPHIA_ALGO_SPECIALIST')

  // Active session state
  const [session, setSession] = useState<InterviewSession | null>(null)
  const [activeRightTab, setActiveRightTab] = useState<'code' | 'whiteboard' | 'hints'>('code')
  const [candidateInput, setCandidateInput] = useState('')
  const [isListening, setIsListening] = useState(false)
  const [interviewerStatus, setInterviewerStatus] = useState<'listening' | 'speaking' | 'thinking' | 'idle'>('idle')
  const [lastInterviewerText, setLastInterviewerText] = useState('')
  const [isEvaluating, setIsEvaluating] = useState(false)
  const [isScorecardOpen, setIsScorecardOpen] = useState(false)
  const [elapsedSeconds, setElapsedSeconds] = useState(0)

  const transcriptEndRef = useRef<HTMLDivElement>(null)
  const recognitionRef = useRef<any>(null)

  // Query templates
  const { data: templates = FALLBACK_TEMPLATES } = useQuery({
    queryKey: ['interview', 'templates'],
    queryFn: () => interviewService.getTemplates(),
  })

  // Timer effect
  useEffect(() => {
    if (!session || session.currentStage === 'COMPLETED') return
    const interval = setInterval(() => setElapsedSeconds(s => s + 1), 1000)
    return () => clearInterval(interval)
  }, [session])

  // Scroll transcript to bottom on new messages
  useEffect(() => {
    transcriptEndRef.current?.scrollIntoView?.({ behavior: 'smooth' })
  }, [session?.transcript])

  // Initialize Speech Recognition (Web Speech API)
  useEffect(() => {
    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition
    if (SpeechRecognition) {
      const recognition = new SpeechRecognition()
      recognition.continuous = false
      recognition.interimResults = false
      recognition.lang = 'en-US'

      recognition.onresult = (event: any) => {
        const transcript = event.results[0][0].transcript
        setCandidateInput(prev => (prev ? `${prev} ${transcript}` : transcript))
        setIsListening(false)
        setInterviewerStatus('idle')
      }

      recognition.onerror = () => {
        setIsListening(false)
        setInterviewerStatus('idle')
      }

      recognition.onend = () => {
        setIsListening(false)
      }

      recognitionRef.current = recognition
    }
  }, [])

  // Start new mock session
  const handleStartSession = useCallback(async () => {
    try {
      const newSession = await interviewService.startSession({
        track: selectedTrack,
        difficulty: selectedDifficulty,
        persona: selectedPersona,
      })
      setSession(newSession)
      setElapsedSeconds(0)
      setIsSetupOpen(false)
      if (newSession.transcript.length > 0) {
        setLastInterviewerText(newSession.transcript[0].text)
        setInterviewerStatus('speaking')
        setTimeout(() => setInterviewerStatus('idle'), 4000)
      }
      addToast({ message: 'Technical mock interview started!', type: 'success' })
    } catch {
      addToast({ message: 'Failed to initialize interview', type: 'error' })
    }
  }, [selectedTrack, selectedDifficulty, selectedPersona, addToast])

  // Auto-init on mount if no session
  useEffect(() => {
    if (!session) {
      void handleStartSession()
    }
  }, [handleStartSession, session])

  // Toggle voice recognition
  const toggleListening = () => {
    if (!recognitionRef.current) {
      addToast({ message: 'Speech recognition is not supported in this browser.', type: 'info' })
      return
    }

    if (isListening) {
      recognitionRef.current.stop()
      setIsListening(false)
      setInterviewerStatus('idle')
    } else {
      try {
        recognitionRef.current.start()
        setIsListening(true)
        setInterviewerStatus('listening')
      } catch {
        setIsListening(false)
      }
    }
  }

  // Send candidate response
  const handleSendMessage = async () => {
    if (!session || !candidateInput.trim()) return

    const textToSend = candidateInput.trim()
    setCandidateInput('')
    setInterviewerStatus('thinking')

    try {
      const res = await interviewService.interact({
        sessionId: session.id,
        candidateText: textToSend,
        candidateCode: session.candidateCode,
        whiteboardNotes: session.whiteboardNotes,
      })

      setSession(res.session)
      setLastInterviewerText(res.interviewerResponse.text)
      setInterviewerStatus('speaking')
      setTimeout(() => setInterviewerStatus('idle'), 4500)
    } catch {
      setInterviewerStatus('idle')
      addToast({ message: 'Failed to communicate with interviewer', type: 'error' })
    }
  }

  // Request progressive hint
  const handleRequestHint = async () => {
    if (!session) return
    try {
      const res = await interviewService.requestHint(session.id)
      setSession(prev => (prev ? {
        ...prev,
        hintsRequested: prev.hintsRequested + 1,
        unlockedHints: [...prev.unlockedHints, res.hint],
        transcript: [
          ...prev.transcript,
          {
            id: `hint-${Date.now()}`,
            sender: 'system',
            text: `[HINT LEVEL ${res.hint.level}]: ${res.hint.text}`,
            timestamp: new Date().toISOString(),
          },
        ],
      } : null))
      setActiveRightTab('hints')
      addToast({ message: `Level ${res.hint.level} hint unlocked!`, type: 'info' })
    } catch {
      addToast({ message: 'Unable to unlock hint', type: 'error' })
    }
  }

  // Evaluate interview session
  const handleEvaluate = async () => {
    if (!session) return
    setIsEvaluating(true)
    try {
      const report = await interviewService.evaluateSession(session.id)
      setSession(prev => (prev ? { ...prev, currentStage: 'COMPLETED', evaluation: report } : null))
      setIsScorecardOpen(true)
      addToast({ message: 'Evaluation scorecard generated!', type: 'success' })
    } catch {
      addToast({ message: 'Evaluation failed', type: 'error' })
    } finally {
      setIsEvaluating(false)
    }
  }

  const formatTimer = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
  }

  const stageLabels: Record<TurnStage, { label: string; color: string }> = {
    GREETING: { label: 'Greeting', color: 'bg-indigo-500/20 text-indigo-400' },
    CLARIFICATION: { label: 'Scoping & Clarifications', color: 'bg-cyan-500/20 text-cyan-400' },
    HIGH_LEVEL_DESIGN: { label: 'Architectural Sketch', color: 'bg-blue-500/20 text-blue-400' },
    IMPLEMENTATION: { label: 'Live Implementation', color: 'bg-amber-500/20 text-amber-400' },
    OPTIMIZATION_EDGE_CASES: { label: 'Edge Cases & Bounds', color: 'bg-purple-500/20 text-purple-400' },
    BEHAVIORAL_FOLLOWUP: { label: 'Behavioral Follow-up', color: 'bg-emerald-500/20 text-emerald-400' },
    WRAPUP: { label: 'Wrap-up', color: 'bg-slate-500/20 text-slate-400' },
    COMPLETED: { label: 'Completed', color: 'bg-emerald-500 text-white' },
  }

  return (
    <AnimatedPage>
      <SEO
        title="AI Technical Interview Simulator | Real-Time Audio & Coding Mock"
        description="Simulate FAANG, Quant, and Staff Engineering technical interviews with dual AI personas, voice synthesis, live code execution, and 5-factor scoring."
      />

      <div className="container mx-auto px-4 py-4 max-w-[1600px] flex flex-col gap-4">
        {/* Top Control Header */}
        <div className="flex flex-wrap items-center justify-between gap-3 p-4 bg-slate-900/90 border border-slate-800 rounded-2xl shadow-xl backdrop-blur-md">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-indigo-600/20 text-indigo-400 border border-indigo-500/30">
              <Sparkles className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-lg font-bold text-white tracking-tight">
                  AI Technical Interview Simulator
                </h1>
                {session && (
                  <span
                    className={`text-[11px] font-semibold px-2.5 py-0.5 rounded-full border border-current ${
                      stageLabels[session.currentStage].color
                    }`}
                  >
                    {stageLabels[session.currentStage].label}
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-400">
                {session?.question?.title || 'Interactive AI Mock Experience'} •{' '}
                {session?.question?.targetRole}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-slate-800/80 border border-slate-700/60 text-slate-200 text-xs font-mono">
              <Clock className="w-3.5 h-3.5 text-indigo-400" />
              <span>{formatTimer(elapsedSeconds)}</span>
            </div>

            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsSetupOpen(true)}
              className="border-slate-700 text-slate-300 text-xs gap-1.5"
            >
              <RotateCcw className="w-3.5 h-3.5" /> Track Presets
            </Button>

            <Button
              size="sm"
              onClick={handleEvaluate}
              disabled={isEvaluating}
              className="bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white text-xs gap-1.5 shadow-md shadow-indigo-900/30"
            >
              <Award className="w-3.5 h-3.5" />
              {isEvaluating ? 'Evaluating...' : 'Submit & Evaluate'}
            </Button>
          </div>
        </div>

        {/* Workspace Split Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 h-[calc(100vh-170px)] min-h-[640px]">
          {/* Left Column: Interviewer HUD, Problem Statement & Transcript (5 Cols) */}
          <div className="lg:col-span-5 flex flex-col gap-3 h-full overflow-hidden">
            {/* Interviewer Avatar HUD with voice narration */}
            {session && (
              <InterviewerAvatarHUD
                persona={session.persona}
                status={interviewerStatus}
                lastSpokenText={lastInterviewerText}
              />
            )}

            {/* Problem Details Collapsible Card */}
            <div className="p-3.5 bg-slate-900/80 border border-slate-800 rounded-xl text-xs space-y-1.5">
              <div className="flex items-center justify-between text-slate-400 font-semibold text-[11px]">
                <span className="text-indigo-400 uppercase tracking-wider">Problem Statement</span>
                <span>{session?.question?.companyStyle} Style</span>
              </div>
              <p className="text-slate-200 line-clamp-3 leading-relaxed">
                {session?.question?.problemStatement}
              </p>
            </div>

            {/* Transcript Chat Stream */}
            <Card className="flex-1 bg-slate-900/60 border-slate-800 p-4 flex flex-col justify-between overflow-hidden shadow-inner">
              <div className="flex-1 overflow-y-auto space-y-3 pr-2 text-xs">
                {session?.transcript.map(msg => (
                  <div
                    key={msg.id}
                    className={`flex flex-col ${
                      msg.sender === 'candidate'
                        ? 'items-end'
                        : msg.sender === 'system'
                        ? 'items-center'
                        : 'items-start'
                    }`}
                  >
                    {msg.sender === 'system' ? (
                      <div className="px-3 py-1.5 rounded-lg bg-indigo-950/60 border border-indigo-800/40 text-indigo-300 text-[11px] max-w-md text-center my-1">
                        {msg.text}
                      </div>
                    ) : (
                      <div
                        className={`max-w-[85%] rounded-2xl p-3 shadow-md ${
                          msg.sender === 'candidate'
                            ? 'bg-indigo-600 text-white rounded-br-none'
                            : 'bg-slate-800 border border-slate-700/60 text-slate-200 rounded-bl-none'
                        }`}
                      >
                        <div className="flex items-center gap-1.5 mb-1 text-[10px] opacity-75 font-semibold">
                          <span>
                            {msg.sender === 'candidate'
                              ? 'You (Candidate)'
                              : session.persona === 'ALEX_STAFF_ARCHITECT'
                              ? 'Alex (Staff Architect)'
                              : 'Sophia (Algo Specialist)'}
                          </span>
                        </div>
                        <p className="leading-relaxed whitespace-pre-wrap">{msg.text}</p>
                      </div>
                    )}
                  </div>
                ))}
                <div ref={transcriptEndRef} />
              </div>

              {/* Chat Input & Audio Recording Bar */}
              <div className="pt-3 border-t border-slate-800 flex items-center gap-2">
                <button
                  type="button"
                  onClick={toggleListening}
                  title={isListening ? 'Stop listening' : 'Speak your answer'}
                  className={`p-2.5 rounded-xl border transition-all ${
                    isListening
                      ? 'bg-rose-600 text-white border-rose-500 animate-pulse'
                      : 'bg-slate-800 text-slate-300 border-slate-700 hover:bg-slate-700'
                  }`}
                >
                  {isListening ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
                </button>

                <input
                  type="text"
                  value={candidateInput}
                  onChange={e => setCandidateInput(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && void handleSendMessage()}
                  placeholder={
                    isListening
                      ? 'Listening to your voice... Speak now.'
                      : 'Explain your reasoning or ask a clarifying question...'
                  }
                  className="flex-1 bg-slate-950/80 border border-slate-700/80 rounded-xl px-3.5 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
                />

                <Button
                  size="sm"
                  onClick={handleSendMessage}
                  disabled={!candidateInput.trim()}
                  className="bg-indigo-600 hover:bg-indigo-500 text-white p-2.5 rounded-xl"
                >
                  <Send className="w-4 h-4" />
                </Button>
              </div>
            </Card>
          </div>

          {/* Right Column: Code Editor, Scratchpad, & Hint Scaffolding (7 Cols) */}
          <div className="lg:col-span-7 flex flex-col h-full bg-slate-900/90 border border-slate-800 rounded-2xl overflow-hidden shadow-2xl">
            {/* Tab Selector Header */}
            <div className="flex items-center justify-between px-4 py-2.5 bg-slate-950 border-b border-slate-800">
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => setActiveRightTab('code')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors ${
                    activeRightTab === 'code'
                      ? 'bg-indigo-600/20 text-indigo-400 border border-indigo-500/30'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <Code2 className="w-3.5 h-3.5" /> Live Code Editor
                </button>
                <button
                  type="button"
                  onClick={() => setActiveRightTab('whiteboard')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors ${
                    activeRightTab === 'whiteboard'
                      ? 'bg-indigo-600/20 text-indigo-400 border border-indigo-500/30'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <FileText className="w-3.5 h-3.5" /> Architecture Scratchpad
                </button>
                <button
                  type="button"
                  onClick={() => setActiveRightTab('hints')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors ${
                    activeRightTab === 'hints'
                      ? 'bg-indigo-600/20 text-indigo-400 border border-indigo-500/30'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <Lightbulb className="w-3.5 h-3.5" />
                  Hints ({session?.unlockedHints.length || 0}/3)
                </button>
              </div>

              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleRequestHint}
                  disabled={(session?.hintsRequested || 0) >= 3}
                  className="border-slate-800 text-amber-400 text-xs py-1 h-7 gap-1"
                >
                  <Lightbulb className="w-3 h-3" /> Get Hint
                </Button>
              </div>
            </div>

            {/* Tab Contents */}
            <div className="flex-1 p-4 overflow-hidden flex flex-col">
              {activeRightTab === 'code' && (
                <div className="flex-1 flex flex-col gap-2 h-full">
                  <div className="flex items-center justify-between text-xs text-slate-400">
                    <span className="font-mono text-[11px] text-slate-500">
                      Language: {session?.activeLanguage || 'javascript'}
                    </span>
                    <button
                      type="button"
                      onClick={() => {
                        if (session?.question?.starterCode) {
                          setSession(prev => (prev ? {
                            ...prev,
                            candidateCode: prev.question.starterCode[prev.activeLanguage],
                          } : null))
                        }
                      }}
                      className="hover:text-slate-200 text-[11px] text-slate-500"
                    >
                      Reset Starter Code
                    </button>
                  </div>
                  <textarea
                    value={session?.candidateCode || ''}
                    onChange={e => {
                      const newCode = e.target.value
                      setSession(prev => (prev ? { ...prev, candidateCode: newCode } : null))
                    }}
                    className="flex-1 w-full bg-slate-950 font-mono text-xs text-slate-200 p-4 rounded-xl border border-slate-800 focus:outline-none focus:border-indigo-500 resize-none leading-relaxed"
                    placeholder="// Write your solution here..."
                    spellCheck={false}
                  />
                </div>
              )}

              {activeRightTab === 'whiteboard' && (
                <div className="flex-1 flex flex-col gap-2 h-full">
                  <span className="text-[11px] text-slate-400 font-semibold">
                    Architecture & System Design Whiteboard (Markdown supported)
                  </span>
                  <textarea
                    value={session?.whiteboardNotes || ''}
                    onChange={e => {
                      const notes = e.target.value
                      setSession(prev => (prev ? { ...prev, whiteboardNotes: notes } : null))
                    }}
                    className="flex-1 w-full bg-slate-950 font-mono text-xs text-slate-200 p-4 rounded-xl border border-slate-800 focus:outline-none focus:border-indigo-500 resize-none leading-relaxed"
                    placeholder="# Trade-offs\n- Fan-out on write vs read\n- Caching tier\n- Partitioning..."
                  />
                </div>
              )}

              {activeRightTab === 'hints' && (
                <div className="flex-1 overflow-y-auto space-y-3">
                  <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800 text-xs text-slate-400">
                    Progressive hints unlock targeted scaffolding without revealing full solutions immediately.
                  </div>

                  {session?.unlockedHints.length === 0 ? (
                    <div className="text-center py-12 text-slate-500 text-xs">
                      No hints requested yet. Click &quot;Get Hint&quot; if you need a conceptual nudge.
                    </div>
                  ) : (
                    session?.unlockedHints.map((hint, idx) => (
                      <div
                        key={idx}
                        className="p-4 rounded-xl bg-slate-950 border border-indigo-500/20 space-y-1.5"
                      >
                        <div className="flex items-center justify-between text-xs font-semibold">
                          <span className="text-amber-400 flex items-center gap-1.5">
                            <Lightbulb className="w-3.5 h-3.5" />
                            Level {hint.level}: {hint.type.replace(/_/g, ' ').toUpperCase()}
                          </span>
                        </div>
                        <p className="text-xs text-slate-200 leading-relaxed font-mono whitespace-pre-wrap">
                          {hint.text}
                        </p>
                      </div>
                    ))
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Setup & Role Selection Modal */}
      <Modal
        isOpen={isSetupOpen}
        onClose={() => setIsSetupOpen(false)}
        title="Choose Technical Interview Track"
      >
        <div className="space-y-4 text-slate-200 text-xs">
          <div>
            <label className="font-semibold text-slate-300 block mb-2">Track & Domain</label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {templates.map(tmpl => (
                <button
                  key={tmpl.id}
                  type="button"
                  onClick={() => setSelectedTrack(tmpl.track)}
                  className={`p-3 rounded-xl border text-left transition-all ${
                    selectedTrack === tmpl.track
                      ? 'bg-indigo-600/20 border-indigo-500 text-white shadow-lg'
                      : 'bg-slate-900 border-slate-800 text-slate-400 hover:border-slate-700'
                  }`}
                >
                  <div className="font-bold text-slate-100">{tmpl.title}</div>
                  <div className="text-[11px] text-indigo-400 mt-1">{tmpl.targetRole}</div>
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="font-semibold text-slate-300 block mb-2">Seniority / Difficulty</label>
            <div className="grid grid-cols-3 gap-2">
              {(['MID', 'SENIOR', 'STAFF'] as InterviewDifficulty[]).map(diff => (
                <button
                  key={diff}
                  type="button"
                  onClick={() => setSelectedDifficulty(diff)}
                  className={`py-2 px-3 rounded-lg border text-center font-bold text-xs transition-colors ${
                    selectedDifficulty === diff
                      ? 'bg-indigo-600/20 border-indigo-500 text-white'
                      : 'bg-slate-900 border-slate-800 text-slate-400 hover:border-slate-700'
                  }`}
                >
                  {diff}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="font-semibold text-slate-300 block mb-2">AI Interviewer Persona</label>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setSelectedPersona('SOPHIA_ALGO_SPECIALIST')}
                className={`p-3 rounded-xl border text-left ${
                  selectedPersona === 'SOPHIA_ALGO_SPECIALIST'
                    ? 'bg-indigo-600/20 border-indigo-500 text-white'
                    : 'bg-slate-900 border-slate-800 text-slate-400'
                }`}
              >
                <div className="font-bold text-slate-100">Sophia</div>
                <div className="text-[11px] text-slate-400">Algorithm & Coding Specialist</div>
              </button>

              <button
                type="button"
                onClick={() => setSelectedPersona('ALEX_STAFF_ARCHITECT')}
                className={`p-3 rounded-xl border text-left ${
                  selectedPersona === 'ALEX_STAFF_ARCHITECT'
                    ? 'bg-amber-600/20 border-amber-500 text-white'
                    : 'bg-slate-900 border-slate-800 text-slate-400'
                }`}
              >
                <div className="font-bold text-slate-100">Alex</div>
                <div className="text-[11px] text-slate-400">Senior Staff Systems Architect</div>
              </button>
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={() => setIsSetupOpen(false)} className="border-slate-700">
              Cancel
            </Button>
            <Button onClick={handleStartSession} className="bg-indigo-600 hover:bg-indigo-500 text-white">
              Launch Interview Session
            </Button>
          </div>
        </div>
      </Modal>

      {/* Post-Interview Evaluation Modal */}
      <Modal
        isOpen={isScorecardOpen}
        onClose={() => setIsScorecardOpen(false)}
        title="Technical Interview Evaluation Matrix"
      >
        {session?.evaluation && (
          <InterviewEvaluationScorecard
            evaluation={session.evaluation}
            onClose={() => setIsScorecardOpen(false)}
            onRetake={() => {
              setIsScorecardOpen(false)
              void handleStartSession()
            }}
          />
        )}
      </Modal>
    </AnimatedPage>
  )
}
