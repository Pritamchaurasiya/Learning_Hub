import { useState, useRef, useEffect, useCallback } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  Send,
  Bot,
  User,
  BookOpen,
  Code,
  Lightbulb,
  Trash2,
  History,
  Plus,
  MessageSquare,
  Loader2,
  StopCircle,
  RotateCcw,
  Mic,
  MicOff,
  Volume2,
  VolumeX,
  Copy,
  Check,
  Download,
  Sparkles,
  Code2,
  Users,
} from 'lucide-react'
import { AICouncilModal } from '../components/AICouncilModal'
import { motion, AnimatePresence } from 'framer-motion'
import { SEO } from '../components/SEO'
import AnimatedPage from '../components/AnimatedPage'
import { Button } from '../components/ui/Button'
import { Card } from '../components/ui/Card'
import { Skeleton } from '../components/ui/Skeleton'
import { aiTutorService, type AIChatMessage, type AIChatSession } from '../services/aiTutorService'
import { useStore } from '../stores/useStore'
import { useSpeechVoice } from '../hooks/useSpeechVoice'

import { renderMarkdown } from '../utils/markdown'
import { useBreakpoint } from '../hooks/useMediaQuery'
import { getCsrfToken, getSessionId, getAccessToken } from '../utils/api'

const quickActions = [
  {
    icon: BookOpen,
    label: 'Explain a concept',
    prompt: 'Explain the concept of Closure in JavaScript with examples.',
    color: 'text-blue-500',
    bg: 'bg-blue-50 dark:bg-blue-900/20',
  },
  {
    icon: Code,
    label: 'Debug code',
    prompt: 'I have a bug in my React component. How do I debug the state updates?',
    color: 'text-purple-500',
    bg: 'bg-purple-50 dark:bg-purple-900/20',
  },
  {
    icon: Lightbulb,
    label: 'Learning path',
    prompt: 'What should I learn next after mastering Python basics?',
    color: 'text-amber-500',
    bg: 'bg-amber-50 dark:bg-amber-900/20',
  },
  {
    icon: Code,
    label: 'DSA & Complexity',
    prompt: 'Explain Dynamic Programming state transitions and space optimization with an example.',
    color: 'text-emerald-500',
    bg: 'bg-emerald-50 dark:bg-emerald-900/20',
  },
  {
    icon: BookOpen,
    label: 'System Design',
    prompt: 'Explain how distributed caching and Redis Pub/Sub work at enterprise scale.',
    color: 'text-indigo-500',
    bg: 'bg-indigo-50 dark:bg-indigo-900/20',
  },
  {
    icon: Lightbulb,
    label: 'Exam Prep & Strategy',
    prompt:
      'What is the most effective way to revise high-yield formulas and solve timed mock tests?',
    color: 'text-rose-500',
    bg: 'bg-rose-50 dark:bg-rose-900/20',
  },
]

export default function AITutorPage() {
  const navigate = useNavigate()
  const location = useLocation()
  const queryClient = useQueryClient()
  const addToast = useStore(state => state.addToast)
  const isDesktop = useBreakpoint('lg')

  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null)
  const [input, setInput] = useState('')
  const [showHistory, setShowHistory] = useState(false)
  const [isStreaming, setIsStreaming] = useState(false)
  const [isSocraticMode, setIsSocraticMode] = useState(false)
  const [isCouncilModalOpen, setIsCouncilModalOpen] = useState(false)
  const [lastFailedMessage, setLastFailedMessage] = useState<string | null>(null)
  const [copiedMessageId, setCopiedMessageId] = useState<string | null>(null)

  const messagesEndRef = useRef<HTMLDivElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const abortControllerRef = useRef<AbortController | null>(null)

  const extractCodeBlock = (content: string): { code: string; language: string } | null => {
    const startIdx = content.indexOf('```')
    if (startIdx === -1) return null
    const afterStart = content.slice(startIdx + 3)
    const endIdx = afterStart.indexOf('```')
    if (endIdx === -1) return null

    const firstLineEnd = afterStart.indexOf('\n')
    if (firstLineEnd !== -1 && firstLineEnd < endIdx) {
      const language = afterStart.slice(0, firstLineEnd).trim().toLowerCase() || 'python'
      const code = afterStart.slice(firstLineEnd + 1, endIdx).trim()
      return { language, code }
    }
    const code = afterStart.slice(0, endIdx).trim()
    return { language: 'python', code }
  }

  const handleOpenInWorkspace = useCallback(
    (codeSnippet: string, language: string) => {
      navigate('/problems', {
        state: {
          initialCode: codeSnippet,
          language:
            language === 'js' || language === 'javascript'
              ? 'javascript'
              : language === 'cpp'
                ? 'cpp'
                : 'python',
        },
      })
      addToast({ message: 'Code copied to Problem Workspace', type: 'info' })
    },
    [navigate, addToast]
  )

  const handleExportSession = useCallback(
    (
      currentMessages: Array<{ id: string; role: string; content: string; createdAt: string }>,
      sessionList: AIChatSession[],
      activeSessionId: string | null
    ) => {
      if (currentMessages.length === 0) return
      const title = sessionList.find(s => s.id === activeSessionId)?.title || 'AI Tutor Session'
      let mdContent = `# ${title}\n\n*Exported from LearningHub AI Tutor on ${new Date().toLocaleString()}*\n\n---\n\n`
      currentMessages.forEach(msg => {
        const roleLabel = msg.role === 'assistant' ? '🤖 AI Tutor' : '👤 User'
        mdContent += `### ${roleLabel} (${new Date(msg.createdAt).toLocaleTimeString()})\n\n${msg.content}\n\n---\n\n`
      })

      const blob = new Blob([mdContent], { type: 'text/markdown;charset=utf-8' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `${title.replace(/[^a-zA-Z0-9_-]/g, '_')}_${new Date().toISOString().slice(0, 10)}.md`
      a.click()
      URL.revokeObjectURL(url)
      addToast({ message: 'Conversation exported as Markdown', type: 'success' })
    },
    [addToast]
  )

  const { isListening, speakingMessageId, toggleListening, speak, stopSpeaking } = useSpeechVoice({
    onTranscript: transcript => {
      setInput(prev => (prev ? `${prev} ${transcript}` : transcript))
      if (textareaRef.current) {
        textareaRef.current.focus()
      }
    },
    onError: err => {
      addToast({ message: `Voice: ${err}`, type: 'error' })
    },
  })

  const handleCopyMessage = useCallback(
    (id: string, text: string) => {
      void navigator.clipboard.writeText(text)
      setCopiedMessageId(id)
      setTimeout(() => setCopiedMessageId(null), 2000)
      addToast({ message: 'Message copied to clipboard', type: 'success' })
    },
    [addToast]
  )

  // Auto-populate initialPrompt from navigation state (e.g. from Knowledge Graph or Study Planner)
  useEffect(() => {
    const promptState = (location.state as { initialPrompt?: string })?.initialPrompt
    if (promptState && promptState.trim()) {
      setInput(promptState)
      setTimeout(() => {
        textareaRef.current?.focus()
      }, 100)
    }
  }, [location.state])

  // Fetch Chat History (Sessions List)
  const { data: sessions = [], isLoading: isSessionsLoading } = useQuery({
    queryKey: ['aiTutor', 'sessions'],
    queryFn: async () => {
      const res = await aiTutorService.getChatHistory()
      return res.data || []
    },
    staleTime: 5 * 60 * 1000,
  })

  // Set default session if none selected
  useEffect(() => {
    if (!currentSessionId && sessions.length > 0 && !isSessionsLoading) {
      setCurrentSessionId(sessions[0].id)
    }
  }, [sessions, currentSessionId, isSessionsLoading])

  // Fetch Current Session Messages
  const { data: messages = [], isLoading: isMessagesLoading } = useQuery({
    queryKey: ['aiTutor', 'session', currentSessionId],
    queryFn: async () => {
      if (!currentSessionId) return []
      const res = await aiTutorService.getChatSession(currentSessionId)
      const msgs = res.data.messages || []

      if (msgs.length === 0) {
        return [
          {
            id: 'welcome',
            role: 'assistant',
            content: 'Continuing our session. How can I help you further?',
            createdAt: new Date().toISOString(),
          },
        ]
      }
      return msgs
    },
    enabled: !!currentSessionId,
    staleTime: Infinity, // messages shouldn't get stale in the background
  })

  // Create New Session Mutation
  const createSessionMutation = useMutation({
    mutationFn: async () => {
      const res = await aiTutorService.createChatSession(`Chat ${new Date().toLocaleDateString()}`)
      return res.data
    },
    onSuccess: newSession => {
      setCurrentSessionId(newSession.id)
      queryClient.setQueryData(
        ['aiTutor', 'session', newSession.id],
        [
          {
            id: 'welcome',
            role: 'assistant',
            content:
              "Hello! I'm your AI Tutor. I can help you with coding concepts, explain topics, answer questions, and guide your learning journey. What would you like to learn today?",
            createdAt: new Date().toISOString(),
          },
        ]
      )
      void queryClient.invalidateQueries({ queryKey: ['aiTutor', 'sessions'] })
    },
    onError: () => {
      addToast({ message: 'Failed to create new chat session', type: 'error' })
    },
  })

  // Delete Session Mutation
  const deleteSessionMutation = useMutation({
    mutationFn: async (sessionId: string) => {
      return aiTutorService.deleteChatSession(sessionId)
    },
    onMutate: async sessionId => {
      await queryClient.cancelQueries({ queryKey: ['aiTutor', 'sessions'] })
      const previousSessions = queryClient.getQueryData<AIChatSession[]>(['aiTutor', 'sessions'])
      queryClient.setQueryData(['aiTutor', 'sessions'], (old: AIChatSession[] | undefined) =>
        old ? old.filter(s => s.id !== sessionId) : []
      )
      return { previousSessions }
    },
    onSuccess: (_, deletedSessionId) => {
      if (currentSessionId === deletedSessionId) {
        const remaining = queryClient.getQueryData<AIChatSession[]>(['aiTutor', 'sessions']) ?? []
        if (remaining.length > 0) {
          setCurrentSessionId(remaining[0].id)
        } else {
          setCurrentSessionId(null)
          createSessionMutation.mutate()
        }
      }
      addToast({ message: 'Chat deleted', type: 'success' })
    },
    onError: (_err, _id, context) => {
      if (context?.previousSessions) {
        queryClient.setQueryData(['aiTutor', 'sessions'], context.previousSessions)
      }
      addToast({ message: 'Failed to delete chat', type: 'error' })
    },
  })

  const scrollToBottom = useCallback(() => {
    if (typeof messagesEndRef.current?.scrollIntoView === 'function') {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' })
    }
  }, [])

  // Send Message using Fetch API for Streaming support
  const handleSendMessage = useCallback(
    async (retryMessage?: string) => {
      const messageToSend = retryMessage || input.trim()
      if (!messageToSend || isStreaming || !currentSessionId) return

      if (!retryMessage) {
        setInput('')
        // Reset textarea height
        if (textareaRef.current) {
          textareaRef.current.style.height = 'auto'
        }
      }
      setLastFailedMessage(null)

      // Optimistically add the user message
      const userMessage: AIChatMessage = {
        id: Date.now().toString(),
        role: 'user',
        content: messageToSend,
        createdAt: new Date().toISOString(),
      }

      // Add a placeholder assistant message that will be updated
      const assistantMessageId = `msg-${Date.now() + 1}`
      const initialAssistantMessage: AIChatMessage = {
        id: assistantMessageId,
        role: 'assistant',
        content: '',
        createdAt: new Date().toISOString(),
      }

      queryClient.setQueryData(
        ['aiTutor', 'session', currentSessionId],
        (old: AIChatMessage[] = []) => [...old, userMessage, initialAssistantMessage]
      )

      scrollToBottom()
      setIsStreaming(true)

      // Create abort controller for this stream
      const controller = new AbortController()
      abortControllerRef.current = controller

      try {
        const csrfToken = getCsrfToken()
        const sessionId = getSessionId()
        const token = await getAccessToken()

        const headers: Record<string, string> = {
          'Content-Type': 'application/json',
        }

        if (token) headers['Authorization'] = `Bearer ${token}`
        if (csrfToken) headers['x-csrf-token'] = csrfToken
        if (sessionId) headers['x-session-id'] = sessionId

        const formattedPayload = isSocraticMode
          ? `[Socratic Hint Mode: Please guide me by asking probing questions and explaining core intuition step-by-step rather than immediately giving the full final solution.] ${messageToSend}`
          : messageToSend

        const response = await fetch(`${import.meta.env.VITE_API_URL}/ai/tutor/stream`, {
          method: 'POST',
          headers,
          body: JSON.stringify({
            message: formattedPayload,
            session_id: currentSessionId,
            socratic_mode: isSocraticMode,
          }),
          credentials: 'include',
          signal: controller.signal,
        })

        if (!response.body) throw new Error('No readable stream')

        const reader = response.body.getReader()
        const decoder = new TextDecoder()
        let fullResponse = ''
        let buffer = ''

        while (true) {
          const { done, value } = await reader.read()
          if (done) break

          buffer += decoder.decode(value, { stream: true })

          // Process complete events separated by \n\n
          let eventEndIndex
          while ((eventEndIndex = buffer.indexOf('\n\n')) >= 0) {
            const event = buffer.substring(0, eventEndIndex)
            buffer = buffer.substring(eventEndIndex + 2)

            const lines = event.split('\n')
            for (const line of lines) {
              if (line.startsWith('data: ')) {
                const dataStr = line.replace('data: ', '').trim()
                if (dataStr === '[DONE]') break

                try {
                  const data = JSON.parse(dataStr)
                  if (data.text) {
                    fullResponse += data.text
                    // Update the UI with streamed text
                    queryClient.setQueryData(
                      ['aiTutor', 'session', currentSessionId],
                      (old: AIChatMessage[] = []) => {
                        const newMessages = [...old]
                        const targetIdx = newMessages.findIndex(m => m.id === assistantMessageId)
                        if (targetIdx !== -1) {
                          // eslint-disable-next-line security/detect-object-injection
                          newMessages[targetIdx] = {
                            // eslint-disable-next-line security/detect-object-injection
                            ...newMessages[targetIdx],
                            content: fullResponse,
                          }
                        }
                        return newMessages
                      }
                    )
                    // Auto-scroll as text comes in
                    messagesEndRef.current?.scrollIntoView({ behavior: 'auto' })
                  }
                  if (data.error) {
                    throw new Error(data.error)
                  }
                } catch (parseError) {
                  // Only throw if it's a real error, not a JSON parse of partial chunk
                  if (
                    parseError instanceof Error &&
                    parseError.message !== 'Unexpected end of JSON input'
                  ) {
                    if (import.meta.env.DEV)
                      console.warn('[AITutor] SSE parse issue:', parseError.message)
                  }
                }
              }
            }
          }
        }
      } catch (error) {
        // Don't show error toast for intentional abort
        if (error instanceof DOMException && error.name === 'AbortError') {
          // Stream was intentionally stopped by user
          return
        }

        // Fallback to standard HTTP JSON endpoint if streaming encounters an error
        try {
          const fallbackRes = await aiTutorService.sendMessage({
            message: messageToSend,
            session_id: currentSessionId,
          })

          if (fallbackRes.data?.message) {
            queryClient.setQueryData(
              ['aiTutor', 'session', currentSessionId],
              (old: AIChatMessage[] = []) => {
                const newMessages = [...old]
                const targetIdx = newMessages.findIndex(m => m.id === assistantMessageId)
                if (targetIdx !== -1) {
                  newMessages[targetIdx] = fallbackRes.data.message
                } else {
                  newMessages.push(fallbackRes.data.message)
                }
                return newMessages
              }
            )
            return
          }
        } catch {
          // Both stream and fallback failed
        }

        setLastFailedMessage(messageToSend)
        addToast({ message: 'Failed to get response from AI Tutor.', type: 'error' })
        // Remove placeholder message on error
        queryClient.setQueryData(
          ['aiTutor', 'session', currentSessionId],
          (old: AIChatMessage[] = []) => old.filter(m => m.id !== assistantMessageId)
        )
      } finally {
        abortControllerRef.current = null
        setIsStreaming(false)
        scrollToBottom()
      }
    },
    [input, isStreaming, currentSessionId, queryClient, addToast, scrollToBottom]
  )

  // Stop streaming handler
  const handleStopStreaming = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort()
      abortControllerRef.current = null
    }
  }, [])

  // Retry last failed message
  const handleRetry = useCallback(() => {
    if (lastFailedMessage) {
      void handleSendMessage(lastFailedMessage)
    }
  }, [lastFailedMessage, handleSendMessage])

  const [hasAttemptedCreate, setHasAttemptedCreate] = useState(false)

  useEffect(() => {
    // If no sessions exist after loading, create one automatically
    if (
      !isSessionsLoading &&
      sessions.length === 0 &&
      !createSessionMutation.isPending &&
      !currentSessionId &&
      !hasAttemptedCreate
    ) {
      setHasAttemptedCreate(true)
      createSessionMutation.mutate()
    }
  }, [
    sessions.length,
    isSessionsLoading,
    createSessionMutation,
    currentSessionId,
    hasAttemptedCreate,
  ])

  useEffect(() => {
    scrollToBottom()
  }, [messages.length, scrollToBottom])

  const handleStartNewChat = useCallback(() => {
    if (!createSessionMutation.isPending) {
      createSessionMutation.mutate()
      if (!isDesktop) setShowHistory(false)
    }
  }, [createSessionMutation, isDesktop])

  const handleSelectSession = useCallback(
    (sessionId: string) => {
      setCurrentSessionId(sessionId)
      if (!isDesktop) setShowHistory(false)
    },
    [isDesktop]
  )

  // Replaced with handleSendMessage callback above.

  const handleDeleteSession = (sessionId: string, e: React.MouseEvent) => {
    e.stopPropagation()
    deleteSessionMutation.mutate(sessionId)
  }

  // Clean up abort controller on unmount
  useEffect(() => {
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort()
      }
    }
  }, [])

  const formatTime = (timestamp: string) => {
    return new Date(timestamp).toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  if (isSessionsLoading && !currentSessionId) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[70vh] space-y-6">
        <div className="relative">
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 1.5, repeat: Infinity, ease: 'linear' }}
            className="w-24 h-24 border-4 border-primary-500/20 border-t-primary-500 rounded-full"
          />
          <Bot className="w-10 h-10 text-primary-500 absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2" />
        </div>
        <div className="text-center">
          <p className="font-black text-xl tracking-tight uppercase">Syncing with AI Core</p>
          <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest animate-pulse mt-1">
            Initializing neural environment...
          </p>
        </div>
      </div>
    )
  }

  return (
    <AnimatedPage className="h-[calc(100vh-8rem)] flex flex-col gap-6 pt-2 pb-6">
      <SEO title="AI Tutor - LearningHub" />

      {/* Main Layout Grid */}
      <div className="flex-1 flex gap-6 overflow-hidden relative">
        {/* Sidebar History (Desktop) or Overlay (Mobile) */}
        <AnimatePresence>
          {!isDesktop && showHistory && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowHistory(false)}
              className="absolute inset-0 z-30 bg-gray-900/60 backdrop-blur-sm lg:hidden rounded-[2.5rem]"
            />
          )}
        </AnimatePresence>

        <AnimatePresence>
          {(showHistory || isDesktop) && (
            <motion.div
              initial={{ x: -300, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              exit={{ x: -300, opacity: 0 }}
              className="absolute lg:relative z-40 w-80 h-full bg-white dark:bg-gray-900 border-none rounded-[2.5rem] flex flex-col overflow-hidden shadow-2xl"
            >
              <div className="p-6 border-b border-gray-100 dark:border-gray-800 flex items-center justify-between bg-gray-50 dark:bg-gray-800/50">
                <h3 className="font-black text-[10px] uppercase tracking-widest text-gray-500 flex items-center gap-3">
                  <div className="p-2 bg-gray-200 dark:bg-gray-700 rounded-lg">
                    <History className="w-4 h-4 text-gray-700 dark:text-gray-300" />
                  </div>
                  Session History
                </h3>
                <button
                  onClick={handleStartNewChat}
                  disabled={createSessionMutation.isPending}
                  className="p-3 bg-primary-100 dark:bg-primary-900/40 text-primary-600 rounded-xl hover:scale-105 active:scale-95 transition-all shadow-sm disabled:opacity-50"
                  aria-label="Start new chat session"
                >
                  <Plus className="w-4 h-4" />
                </button>
              </div>
              <div className="flex-1 overflow-y-auto p-4 space-y-2 scrollbar-thin">
                {sessions.map(session => (
                  <button
                    key={session.id}
                    onClick={() => handleSelectSession(session.id)}
                    className={`w-full text-left p-4 rounded-[1.25rem] group transition-all duration-300 relative ${
                      currentSessionId === session.id
                        ? 'bg-primary-600 text-white shadow-xl shadow-primary-500/20'
                        : 'hover:bg-gray-50 dark:hover:bg-gray-800 text-gray-600 dark:text-gray-400'
                    }`}
                  >
                    <div className="flex items-center gap-4">
                      <MessageSquare
                        className={`w-5 h-5 shrink-0 ${currentSessionId === session.id ? 'text-primary-100' : 'text-gray-400 group-hover:text-primary-500 transition-colors'}`}
                      />
                      <div className="min-w-0 pr-8">
                        <p
                          className={`text-sm font-black truncate ${currentSessionId === session.id ? 'text-white' : 'text-gray-800 dark:text-gray-200'}`}
                        >
                          {session.title}
                        </p>
                        <p
                          className={`text-[9px] uppercase font-bold tracking-widest mt-1 ${currentSessionId === session.id ? 'text-primary-200' : 'text-gray-400'}`}
                        >
                          {new Date(session.updatedAt).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                    <button
                      onClick={e => handleDeleteSession(session.id, e)}
                      disabled={deleteSessionMutation.isPending}
                      aria-label="Delete chat session"
                      className={`absolute right-3 top-1/2 -translate-y-1/2 p-2 rounded-xl opacity-0 group-hover:opacity-100 hover:bg-red-500 hover:text-white transition-all ${currentSessionId === session.id ? 'text-white/80' : 'text-gray-400 bg-gray-100 dark:bg-gray-700'}`}
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </button>
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Chat Interface */}
        <div className="flex-1 flex flex-col min-w-0">
          <Card className="flex-1 flex flex-col overflow-hidden border-none shadow-2xl rounded-[2.5rem] bg-white dark:bg-gray-900 relative">
            {/* Header */}
            <div className="px-6 py-5 border-b border-gray-100 dark:border-gray-800 flex items-center justify-between bg-white/50 dark:bg-gray-900/50 backdrop-blur-xl z-20">
              <div className="flex items-center gap-4">
                <button
                  onClick={() => setShowHistory(!showHistory)}
                  aria-label="Toggle chat history"
                  className="lg:hidden p-3 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-[1rem] transition-colors"
                >
                  <History className="w-5 h-5" />
                </button>
                <div className="w-12 h-12 rounded-[1rem] bg-gradient-to-br from-primary-500 to-indigo-600 flex items-center justify-center shadow-lg shadow-primary-500/20">
                  <Bot className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h2 className="font-black text-sm uppercase tracking-tight leading-none text-gray-900 dark:text-white">
                    Neural Tutor
                  </h2>
                  <div className="flex items-center gap-2 mt-1.5">
                    <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse shadow-sm shadow-emerald-500/50" />
                    <span className="text-[9px] font-black text-gray-400 uppercase tracking-widest">
                      Engine Online v4.5
                    </span>
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setIsSocraticMode(!isSocraticMode)
                    addToast({
                      message: !isSocraticMode
                        ? 'Socratic Mode ON: AI will guide you with questions'
                        : 'Socratic Mode OFF: Standard explanations',
                      type: 'info',
                    })
                  }}
                  className={`px-3 py-1.5 rounded-xl text-xs font-black uppercase tracking-wider flex items-center gap-1.5 transition-all border ${
                    isSocraticMode
                      ? 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/30 ring-1 ring-amber-500/30'
                      : 'bg-gray-50 dark:bg-gray-800 text-gray-500 hover:text-gray-700 dark:text-gray-400 border-gray-200 dark:border-gray-700'
                  }`}
                  title="Toggle Socratic tutoring style"
                >
                  <Sparkles
                    className={`w-3.5 h-3.5 ${isSocraticMode ? 'text-amber-500 animate-spin' : 'text-gray-400'}`}
                  />
                  <span className="hidden sm:inline">Socratic</span>
                </button>
                <button
                  type="button"
                  onClick={() => setIsCouncilModalOpen(true)}
                  className="px-3 py-1.5 rounded-xl text-xs font-black uppercase tracking-wider flex items-center gap-1.5 transition-all border bg-purple-500/10 hover:bg-purple-500/20 text-purple-600 dark:text-purple-400 border-purple-500/30 ring-1 ring-purple-500/20"
                  title="Consult 3-Agent Collaborative Council"
                >
                  <Users className="w-3.5 h-3.5 text-purple-500" />
                  <span className="hidden sm:inline">AI Council</span>
                </button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleExportSession(messages, sessions, currentSessionId)}
                  disabled={messages.length === 0}
                  className="rounded-xl font-black uppercase tracking-widest text-[10px] border-2"
                  title="Export conversation as Markdown"
                >
                  <Download className="w-4 h-4 mr-1.5" />
                  <span className="hidden md:inline">Export</span>
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => navigate('/study-planner')}
                  className="rounded-xl font-black uppercase tracking-widest text-[10px] border-2"
                >
                  <BookOpen className="w-4 h-4 mr-1.5" />{' '}
                  <span className="hidden sm:inline">Study Planner</span>
                </Button>
              </div>
            </div>

            {/* Messages Area */}
            <div className="flex-1 overflow-y-auto p-6 md:p-8 space-y-10 scrollbar-thin z-10 relative">
              <div className="absolute inset-0 bg-[url('/img/grid.svg')] bg-center opacity-5 dark:opacity-10 pointer-events-none mix-blend-overlay" />

              {isMessagesLoading ? (
                <div className="flex gap-4">
                  <Skeleton className="w-12 h-12 rounded-[1.25rem] shrink-0" />
                  <Skeleton className="h-24 w-64 rounded-[2rem] rounded-tl-none" />
                </div>
              ) : (
                <>
                  {messages.map(message => (
                    <motion.div
                      key={message.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className={`flex gap-5 relative z-10 ${message.role === 'user' ? 'flex-row-reverse' : 'flex-row'}`}
                    >
                      <div
                        className={`w-12 h-12 rounded-[1.25rem] shrink-0 flex items-center justify-center shadow-lg ${
                          message.role === 'user'
                            ? 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300'
                            : 'bg-gradient-to-br from-primary-500 to-indigo-600 text-white shadow-primary-500/20'
                        }`}
                      >
                        {message.role === 'user' ? (
                          <User className="w-6 h-6" />
                        ) : (
                          <Bot className="w-6 h-6" />
                        )}
                      </div>
                      <div
                        className={`max-w-[85%] lg:max-w-[75%] space-y-2 ${message.role === 'user' ? 'items-end' : 'items-start'}`}
                      >
                        <div
                          className={`p-6 rounded-[2.5rem] text-sm leading-relaxed ${
                            message.role === 'user'
                              ? 'bg-primary-600 text-white rounded-tr-none shadow-xl shadow-primary-500/20'
                              : 'bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-200 rounded-tl-none border-2 border-gray-100 dark:border-gray-700 shadow-md'
                          }`}
                        >
                          {message.role === 'assistant' ? (
                            <div>
                              <div
                                className="prose-custom prose-sm max-w-none prose-headings:font-black prose-a:text-primary-500"
                                // eslint-disable-next-line react/no-danger
                                dangerouslySetInnerHTML={{
                                  __html: renderMarkdown(message.content),
                                }}
                              />
                              {message.id !== 'welcome' && (
                                <div className="flex items-center gap-2 mt-3 pt-2 border-t border-gray-100 dark:border-gray-700/60">
                                  <button
                                    type="button"
                                    onClick={() => {
                                      if (speakingMessageId === message.id) {
                                        stopSpeaking()
                                      } else {
                                        speak(message.content, message.id)
                                      }
                                    }}
                                    className={`px-2.5 py-1 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all ${
                                      speakingMessageId === message.id
                                        ? 'bg-primary-500/20 text-primary-600 dark:text-primary-400 ring-1 ring-primary-500'
                                        : 'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700/50'
                                    }`}
                                    title={
                                      speakingMessageId === message.id
                                        ? 'Stop reading'
                                        : 'Read aloud'
                                    }
                                  >
                                    {speakingMessageId === message.id ? (
                                      <VolumeX className="w-3.5 h-3.5 text-primary-500 animate-pulse" />
                                    ) : (
                                      <Volume2 className="w-3.5 h-3.5" />
                                    )}
                                    <span className="text-[10px]">
                                      {speakingMessageId === message.id ? 'Stop' : 'Listen'}
                                    </span>
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => handleCopyMessage(message.id, message.content)}
                                    className="px-2.5 py-1 rounded-lg text-xs font-semibold flex items-center gap-1.5 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700/50 transition-all"
                                    title="Copy message"
                                  >
                                    {copiedMessageId === message.id ? (
                                      <Check className="w-3.5 h-3.5 text-emerald-500" />
                                    ) : (
                                      <Copy className="w-3.5 h-3.5" />
                                    )}
                                    <span className="text-[10px]">
                                      {copiedMessageId === message.id ? 'Copied' : 'Copy'}
                                    </span>
                                  </button>
                                  {extractCodeBlock(message.content) && (
                                    <button
                                      type="button"
                                      onClick={() => {
                                        const extracted = extractCodeBlock(message.content)
                                        if (extracted) {
                                          handleOpenInWorkspace(extracted.code, extracted.language)
                                        }
                                      }}
                                      className="px-2.5 py-1 rounded-lg text-xs font-semibold flex items-center gap-1.5 text-primary-600 dark:text-primary-400 hover:bg-primary-50 dark:hover:bg-primary-900/30 transition-all"
                                      title="Open code in Problem Workspace"
                                    >
                                      <Code2 className="w-3.5 h-3.5 text-primary-500" />
                                      <span className="text-[10px]">Open in IDE</span>
                                    </button>
                                  )}
                                </div>
                              )}
                            </div>
                          ) : (
                            <p className="font-medium text-lg">{message.content}</p>
                          )}
                        </div>
                        <p
                          className={`text-[9px] font-black uppercase tracking-widest px-4 ${message.role === 'user' ? 'text-right text-gray-400' : 'text-gray-400'}`}
                        >
                          {message.role === 'assistant' ? 'AI Core' : 'User'} •{' '}
                          {formatTime(message.createdAt)}
                        </p>
                      </div>
                    </motion.div>
                  ))}
                  {isStreaming && (
                    <div className="flex items-center justify-center gap-4 py-2 relative z-20">
                      <div className="flex items-center gap-2 p-3 rounded-full bg-white/80 dark:bg-gray-800/80 backdrop-blur-md shadow-lg border border-gray-100 dark:border-gray-700">
                        <div className="w-2 h-2 bg-primary-500 rounded-full animate-bounce shadow-sm" />
                        <div
                          className="w-2 h-2 bg-primary-500 rounded-full animate-bounce shadow-sm"
                          style={{ animationDelay: '150ms' }}
                        />
                        <div
                          className="w-2 h-2 bg-primary-500 rounded-full animate-bounce shadow-sm"
                          style={{ animationDelay: '300ms' }}
                        />
                        <span className="text-[9px] font-black text-gray-500 uppercase tracking-widest ml-2">
                          Generating
                        </span>
                      </div>
                      <button
                        onClick={handleStopStreaming}
                        className="flex items-center gap-2 px-4 py-2.5 rounded-full bg-red-500/10 hover:bg-red-500/20 text-red-600 dark:text-red-400 border border-red-200 dark:border-red-800 transition-all hover:scale-105 active:scale-95 shadow-sm"
                        aria-label="Stop generating"
                      >
                        <StopCircle className="w-4 h-4" />
                        <span className="text-[10px] font-black uppercase tracking-widest">
                          Stop
                        </span>
                      </button>
                    </div>
                  )}
                  {lastFailedMessage && !isStreaming && (
                    <div className="flex items-center justify-center py-2 relative z-20">
                      <button
                        onClick={handleRetry}
                        className="flex items-center gap-2 px-5 py-2.5 rounded-full bg-amber-500/10 hover:bg-amber-500/20 text-amber-600 dark:text-amber-400 border border-amber-200 dark:border-amber-800 transition-all hover:scale-105 active:scale-95 shadow-sm"
                        aria-label="Retry last message"
                      >
                        <RotateCcw className="w-4 h-4" />
                        <span className="text-[10px] font-black uppercase tracking-widest">
                          Retry
                        </span>
                      </button>
                    </div>
                  )}
                </>
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Empty State / Quick Actions */}
            {messages.length <= 1 && !isStreaming && !isMessagesLoading && (
              <div className="px-6 md:px-8 pb-6 relative z-20">
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {quickActions.map((action, i) => (
                    <button
                      // eslint-disable-next-line react/no-array-index-key
                      key={i}
                      onClick={() => setInput(action.prompt)}
                      className="p-6 rounded-[1.5rem] bg-gray-50/50 dark:bg-gray-800/30 border-2 border-gray-100 dark:border-gray-800 hover:border-primary-500/30 hover:bg-white dark:hover:bg-gray-800 text-left transition-all group shadow-sm hover:shadow-md"
                    >
                      <div
                        className={`w-12 h-12 rounded-2xl ${action.bg} flex items-center justify-center mb-5 transition-transform duration-300 group-hover:scale-110 group-hover:rotate-3 shadow-sm`}
                      >
                        <action.icon className={`w-6 h-6 ${action.color}`} />
                      </div>
                      <p className="text-[10px] font-black uppercase tracking-widest text-gray-500 dark:text-gray-400 mb-2">
                        {action.label}
                      </p>
                      <p className="text-xs text-gray-400 dark:text-gray-500 line-clamp-2 italic font-medium leading-relaxed">
                        &quot;{action.prompt}&quot;
                      </p>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Quick Follow-up Chips when in active conversation */}
            {messages.length > 1 && !isStreaming && (
              <div className="px-6 md:px-8 pb-2 flex flex-wrap gap-2 relative z-20">
                {[
                  'Give an example',
                  'What is the time complexity?',
                  'Provide step-by-step proof',
                  'Write unit tests for this',
                ].map(chip => (
                  <button
                    key={chip}
                    type="button"
                    onClick={() => {
                      setInput(chip)
                      textareaRef.current?.focus()
                    }}
                    className="px-3 py-1 text-xs rounded-full bg-gray-100 dark:bg-gray-800 hover:bg-primary-50 dark:hover:bg-primary-950/40 hover:text-primary-600 dark:hover:text-primary-400 border border-gray-200 dark:border-gray-700 transition-colors text-gray-600 dark:text-gray-300 font-medium"
                  >
                    + {chip}
                  </button>
                ))}
              </div>
            )}

            {/* Input Area */}
            <div className="p-6 md:p-8 pt-2 bg-white/50 dark:bg-gray-900/50 backdrop-blur-md relative z-20">
              <div className="relative group">
                <textarea
                  ref={textareaRef}
                  rows={1}
                  value={input}
                  onChange={e => {
                    setInput(e.target.value)
                    e.target.style.height = 'auto'
                    e.target.style.height = `${Math.min(e.target.scrollHeight, 200)}px`
                  }}
                  onKeyDown={e => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault()
                      void handleSendMessage()
                    }
                  }}
                  placeholder={
                    isListening
                      ? 'Listening to your voice... Speak now.'
                      : 'Ask your tutor anything engineering or speak your question...'
                  }
                  className="w-full pl-8 pr-32 py-6 bg-gray-50 dark:bg-gray-800 border-2 border-transparent focus:border-primary-500/30 focus:bg-white dark:focus:bg-gray-900 rounded-[2.5rem] text-base resize-none outline-none shadow-inner transition-all scrollbar-none font-medium placeholder:text-gray-400"
                  disabled={isStreaming || isMessagesLoading}
                />
                <div className="absolute right-4 top-1/2 -translate-y-1/2 flex items-center gap-2">
                  <button
                    type="button"
                    onClick={toggleListening}
                    disabled={isStreaming || isMessagesLoading}
                    aria-label={isListening ? 'Stop listening' : 'Start voice recording'}
                    title={isListening ? 'Stop listening' : 'Voice input'}
                    className={`w-12 h-12 rounded-[1.2rem] flex items-center justify-center transition-all duration-300 ${
                      isListening
                        ? 'bg-rose-500 text-white animate-pulse shadow-lg shadow-rose-500/40 ring-4 ring-rose-500/20'
                        : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                    }`}
                  >
                    {isListening ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
                  </button>
                  <button
                    onClick={() => void handleSendMessage()}
                    disabled={!input.trim() || isStreaming || isMessagesLoading}
                    aria-label="Send message"
                    className="w-12 h-12 bg-primary-600 text-white rounded-[1.2rem] flex items-center justify-center shadow-xl shadow-primary-500/30 hover:scale-105 active:scale-95 disabled:opacity-40 disabled:scale-100 transition-all duration-300"
                  >
                    {isStreaming ? (
                      <Loader2 className="w-5 h-5 animate-spin" />
                    ) : (
                      <Send className="w-5 h-5 ml-0.5" />
                    )}
                  </button>
                </div>
              </div>
              <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest text-center mt-5 opacity-60">
                System Advisory: Neural net responses are predictive. Verify critical algorithms.
              </p>
            </div>
          </Card>
        </div>
      </div>

      <AICouncilModal
        isOpen={isCouncilModalOpen}
        onClose={() => setIsCouncilModalOpen(false)}
        initialQuery={input}
      />
    </AnimatedPage>
  )
}
