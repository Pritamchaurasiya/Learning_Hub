import React, { useState, useEffect, useRef } from 'react'
import {
  GpuDeviceInfo,
  EdgeModelPreset,
  EdgeSystemRole,
  EdgeChatMessage,
  EdgeInferenceMetrics,
  EdgeHardwareBenchmark,
} from '../types/edgeAI'
import { edgeAIService } from '../services/edgeAIService'
import { EdgeHardwareDiagnosticCard } from '../components/edge/EdgeHardwareDiagnosticCard'
import { EdgeModelSelectorPanel } from '../components/edge/EdgeModelSelectorPanel'
import { EdgeTelemetryBanner } from '../components/edge/EdgeTelemetryBanner'
import {
  Sparkles,
  Send,
  Code,
  RefreshCw,
  BookOpen,
  Terminal,
  Calculator,
  User,
  Bot,
  Zap,
} from 'lucide-react'

export const EdgeAIPage: React.FC = () => {
  const [deviceInfo, setDeviceInfo] = useState<GpuDeviceInfo | null>(null)
  const [models, setModels] = useState<EdgeModelPreset[]>([])
  const [activeModelId, setActiveModelId] = useState<string>('qwen2.5-coder-0.5b')
  const [systemRole, setSystemRole] = useState<EdgeSystemRole>('SOCRATIC_TUTOR')
  const [isAirGappedActive, setIsAirGappedActive] = useState<boolean>(true)
  const [messages, setMessages] = useState<EdgeChatMessage[]>([
    {
      id: 'welcome-msg',
      role: 'assistant',
      content:
        '👋 Welcome to the **Edge Compute Studio**!\n\n' +
        'I am running **100% locally on your machine via WebGPU compute shaders**.\n' +
        'Your code, prompts, and notes never leave your browser: **zero cloud latency, zero token costs, and 100% air-gapped privacy**.\n\n' +
        'Choose a tutoring mode above, enter a question or paste code, and let us dissect the problem together!',
      timestamp: new Date().toISOString(),
      modelId: 'qwen2.5-coder-0.5b',
      systemRole: 'SOCRATIC_TUTOR',
    },
  ])

  const [inputPrompt, setInputPrompt] = useState<string>('')
  const [codeSnippet, setCodeSnippet] = useState<string>('')
  const [showCodeEditor, setShowCodeEditor] = useState<boolean>(false)
  const [isStreaming, setIsStreaming] = useState<boolean>(false)
  const [latestMetrics, setLatestMetrics] = useState<EdgeInferenceMetrics | null>(null)
  const [lastBenchmark, setLastBenchmark] = useState<EdgeHardwareBenchmark | null>(null)
  const [isDownloadingId, setIsDownloadingId] = useState<string | null>(null)
  const [downloadProgress, setDownloadProgress] = useState<number>(0)

  const messagesEndRef = useRef<HTMLDivElement>(null)
  const abortControllerRef = useRef<AbortController | null>(null)

  useEffect(() => {
    let isMounted = true

    // Initialize hardware capabilities and model preset inventory
    edgeAIService.detectGpuHardware().then(info => {
      if (isMounted) setDeviceInfo(info)
    })

    const presets = edgeAIService.getAvailableModelPresets()
    setModels(presets)

    const benches = edgeAIService.loadBenchmarks()
    if (benches.length > 0) {
      setLastBenchmark(benches[0])
    }

    return () => {
      isMounted = false
    }
  }, [])

  useEffect(() => {
    if (typeof messagesEndRef.current?.scrollIntoView === 'function') {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' })
    }
  }, [messages])

  const handleRunBenchmark = async (): Promise<EdgeHardwareBenchmark> => {
    const bench = await edgeAIService.runEdgeHardwareBenchmark()
    setLastBenchmark(bench)
    return bench
  }

  const handleDownloadModel = async (modelId: string) => {
    setIsDownloadingId(modelId)
    setDownloadProgress(0)

    try {
      await edgeAIService.downloadModel(modelId, state => {
        setDownloadProgress(state.progressPercent)
      })
      setModels(edgeAIService.getAvailableModelPresets())
    } finally {
      setIsDownloadingId(null)
      setDownloadProgress(0)
    }
  }

  const handleDeleteModel = (modelId: string) => {
    edgeAIService.deleteModel(modelId)
    setModels(edgeAIService.getAvailableModelPresets())
  }

  const handleSendMessage = async (promptOverride?: string) => {
    const rawPrompt = promptOverride !== undefined ? promptOverride : inputPrompt
    if (!rawPrompt.trim() && !codeSnippet.trim()) return

    const combinedPrompt = codeSnippet.trim()
      ? `${rawPrompt}\n\n\`\`\`typescript\n${codeSnippet}\n\`\`\``
      : rawPrompt

    const userMessage: EdgeChatMessage = {
      id: `user-${Date.now()}`,
      role: 'user',
      content: combinedPrompt,
      timestamp: new Date().toISOString(),
      systemRole,
      modelId: activeModelId,
    }

    const assistantMsgId = `assistant-${Date.now()}`
    const placeholderAssistant: EdgeChatMessage = {
      id: assistantMsgId,
      role: 'assistant',
      content: 'Thinking...',
      timestamp: new Date().toISOString(),
      systemRole,
      modelId: activeModelId,
    }

    setMessages(prev => [...prev, userMessage, placeholderAssistant])
    setInputPrompt('')
    setIsStreaming(true)

    const abortController = new AbortController()
    abortControllerRef.current = abortController

    try {
      await edgeAIService.generateStreamingResponse(
        {
          prompt: combinedPrompt,
          systemRole,
          modelId: activeModelId,
        },
        chunk => {
          setMessages(prev =>
            prev.map(msg =>
              msg.id === assistantMsgId
                ? {
                    ...msg,
                    content: chunk.accumulatedText,
                    metrics: chunk.metrics,
                  }
                : msg
            )
          )
          if (chunk.metrics) {
            setLatestMetrics(chunk.metrics)
          }
        },
        abortController.signal
      )
    } finally {
      setIsStreaming(false)
      abortControllerRef.current = null
    }
  }

  const presetQueries = [
    { label: 'DSA Quicksort Invariants', prompt: 'Explain the loop invariants of Lomuto vs Hoare partitioning.' },
    { label: 'Off-by-One Review', prompt: 'Review my binary search logic for boundary bugs and integer overflow.' },
    { label: 'Bayes Theorem Proof', prompt: 'Derive Bayes Theorem from conditional probability axioms.' },
    { label: 'WebGPU Shader Architecture', prompt: 'How does WebGPU workgroup shared memory compare to CUDA shared memory?' },
  ]

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 p-4 sm:p-6 lg:p-8 space-y-6">
      {/* Top Header */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-4 border-b border-slate-800">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 flex items-center gap-1">
              <Sparkles className="w-3 h-3" /> Milestone 13
            </span>
            <span className="text-xs text-slate-400 font-mono">WebGPU Client Inference Engine</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-white mt-1 tracking-tight">
            Edge AI Offline Tutor & Local WebGPU Studio
          </h1>
          <p className="text-xs sm:text-sm text-slate-400 mt-1 max-w-3xl">
            Execute private, air-gapped Small Language Models (SLMs) directly in your browser using hardware WebGPU shader cores.
            Zero cloud API latency, zero token costs, and 100% confidential student telemetry.
          </p>
        </div>

        {/* Offline Air-Gapped Toggle */}
        <div className="flex items-center gap-3 bg-slate-900 border border-slate-800 px-4 py-2 rounded-xl">
          <div className="text-right">
            <span className="text-xs font-bold text-slate-200 block">Air-Gapped Mode</span>
            <span className="text-[10px] text-slate-400">
              {isAirGappedActive ? 'Network Completely Disconnected' : 'Adaptive Online Mode'}
            </span>
          </div>
          <button
            onClick={() => setIsAirGappedActive(!isAirGappedActive)}
            className={`w-11 h-6 flex items-center rounded-full p-1 transition duration-200 ${
              isAirGappedActive ? 'bg-emerald-600' : 'bg-slate-700'
            }`}
          >
            <div
              className={`bg-white w-4 h-4 rounded-full shadow-md transform transition duration-200 ${
                isAirGappedActive ? 'translate-x-5' : 'translate-x-0'
              }`}
            />
          </button>
        </div>
      </div>

      {/* Hardware Diagnostics Card */}
      <EdgeHardwareDiagnosticCard
        deviceInfo={deviceInfo}
        onRunBenchmark={handleRunBenchmark}
        lastBenchmark={lastBenchmark}
      />

      {/* Model Preset Selection Panel */}
      <EdgeModelSelectorPanel
        models={models}
        activeModelId={activeModelId}
        onSelectModel={setActiveModelId}
        onDownloadModel={handleDownloadModel}
        onDeleteModel={handleDeleteModel}
        isDownloadingId={isDownloadingId}
        downloadProgress={downloadProgress}
      />

      {/* Main Interactive Studio Grid */}
      <div className="space-y-4">
        {/* Role Selector Tabs */}
        <div className="flex flex-wrap items-center justify-between gap-3 bg-slate-900/90 border border-slate-800 rounded-xl p-3">
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-slate-300">Tutor Persona:</span>
            <div className="flex items-center gap-1.5 flex-wrap">
              {[
                { role: 'SOCRATIC_TUTOR', label: 'Socratic Tutor', icon: BookOpen },
                { role: 'CODE_REVIEWER', label: 'Code Reviewer', icon: Terminal },
                { role: 'DSA_EXPERT', label: 'DSA Specialist', icon: Zap },
                { role: 'MATH_SOLVER', label: 'Math & Proofs', icon: Calculator },
              ].map(tab => {
                const Icon = tab.icon
                const isSelected = systemRole === tab.role
                return (
                  <button
                    key={tab.role}
                    onClick={() => setSystemRole(tab.role as EdgeSystemRole)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-medium flex items-center gap-1.5 transition ${
                      isSelected
                        ? 'bg-cyan-600 text-white shadow-sm'
                        : 'bg-slate-800/60 text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    <Icon className="w-3.5 h-3.5" />
                    {tab.label}
                  </button>
                )
              })}
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowCodeEditor(!showCodeEditor)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium flex items-center gap-1.5 border transition ${
                showCodeEditor
                  ? 'bg-indigo-600/20 text-indigo-300 border-indigo-500/40'
                  : 'bg-slate-800/60 text-slate-400 border-slate-700 hover:text-slate-200'
              }`}
            >
              <Code className="w-3.5 h-3.5" />
              {showCodeEditor ? 'Hide Code Scratchpad' : 'Attach Code Snippet'}
            </button>

            <button
              onClick={() => {
                setMessages([])
                setLatestMetrics(null)
              }}
              className="p-1.5 rounded-lg text-slate-500 hover:text-slate-200 hover:bg-slate-800 transition"
              title="Clear Conversation"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Real-time Telemetry Banner */}
        <EdgeTelemetryBanner
          metrics={latestMetrics}
          isStreaming={isStreaming}
          isAirGappedActive={isAirGappedActive}
        />

        {/* Code Scratchpad (Optional Accordion) */}
        {showCodeEditor && (
          <div className="bg-slate-900 border border-indigo-500/30 rounded-xl p-4 space-y-2">
            <div className="flex items-center justify-between text-xs text-indigo-300 font-semibold">
              <span className="flex items-center gap-1.5">
                <Code className="w-4 h-4" /> Local Code Scratchpad (Private AST Review)
              </span>
              <span className="text-slate-500">TypeScript / Python / C++</span>
            </div>
            <textarea
              value={codeSnippet}
              onChange={e => setCodeSnippet(e.target.value)}
              placeholder="// Paste your algorithm or data structure implementation here..."
              rows={5}
              className="w-full bg-slate-950 font-mono text-xs text-slate-200 p-3 rounded-lg border border-slate-800 focus:outline-none focus:border-indigo-500"
            />
          </div>
        )}

        {/* Chat History Container */}
        <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-5 min-h-[360px] max-h-[550px] overflow-y-auto space-y-4">
          {messages.length === 0 ? (
            <div className="text-center py-12 text-slate-500 text-xs">
              No messages yet. Select a prompt preset or type a question below to start local micro-inference.
            </div>
          ) : (
            messages.map(msg => (
              <div
                key={msg.id}
                className={`flex gap-3 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                {msg.role === 'assistant' && (
                  <div className="p-2 rounded-xl bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 h-fit">
                    <Bot className="w-4 h-4" />
                  </div>
                )}

                <div
                  className={`max-w-2xl rounded-xl p-4 text-xs leading-relaxed space-y-2 ${
                    msg.role === 'user'
                      ? 'bg-indigo-600 text-white rounded-br-none'
                      : 'bg-slate-950/80 border border-slate-800/80 text-slate-200 rounded-bl-none shadow-sm'
                  }`}
                >
                  <div className="whitespace-pre-wrap font-sans">{msg.content}</div>

                  {msg.metrics && (
                    <div className="pt-2 mt-2 border-t border-slate-800/80 flex items-center justify-between text-[10px] text-slate-400 font-mono">
                      <span>
                        ⚡ {msg.metrics.tokensPerSec} tok/s • TTFT: {msg.metrics.ttftMs}ms
                      </span>
                      <span className="text-cyan-400">{msg.metrics.engineMode}</span>
                    </div>
                  )}
                </div>

                {msg.role === 'user' && (
                  <div className="p-2 rounded-xl bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 h-fit">
                    <User className="w-4 h-4" />
                  </div>
                )}
              </div>
            ))
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Quick Preset Queries */}
        <div className="flex items-center gap-2 overflow-x-auto py-1">
          <span className="text-[11px] text-slate-400 font-medium whitespace-nowrap">Suggested:</span>
          {presetQueries.map((pq, idx) => (
            <button
              key={idx}
              onClick={() => handleSendMessage(pq.prompt)}
              disabled={isStreaming}
              className="text-[11px] bg-slate-900 border border-slate-800 hover:border-slate-700 text-slate-300 px-3 py-1 rounded-full whitespace-nowrap transition"
            >
              {pq.label}
            </button>
          ))}
        </div>

        {/* Input Bar */}
        <div className="flex items-center gap-2 bg-slate-900 border border-slate-800 rounded-xl p-2 focus-within:border-cyan-500/50 transition">
          <input
            type="text"
            value={inputPrompt}
            onChange={e => setInputPrompt(e.target.value)}
            onKeyDown={e => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault()
                handleSendMessage()
              }
            }}
            placeholder="Ask anything about algorithms, proofs, or system design (100% on-device)..."
            disabled={isStreaming}
            className="flex-1 bg-transparent px-3 py-1.5 text-xs text-slate-100 placeholder-slate-500 focus:outline-none"
          />

          <button
            onClick={() => handleSendMessage()}
            disabled={isStreaming || (!inputPrompt.trim() && !codeSnippet.trim())}
            aria-label="Send prompt"
            className="p-2 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white transition disabled:opacity-40"
          >
            <Send className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  )
}

export default EdgeAIPage
