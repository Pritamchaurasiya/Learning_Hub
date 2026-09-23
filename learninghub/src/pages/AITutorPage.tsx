import { useState, useRef, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
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
} from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { SEO } from '../components/SEO'
import AnimatedPage from '../components/AnimatedPage'
import { Button } from '../components/ui/Button'
import { Card } from '../components/ui/Card'
import { Skeleton } from '../components/ui/Skeleton'
import { aiTutorService, type AIChatMessage, type AIChatSession } from '../services/aiTutorService'
import { useStore } from '../stores/useStore'

import { renderMarkdown } from '../utils/markdown'
import { useBreakpoint } from '../hooks/useMediaQuery'
import { getCsrfToken, getSessionId } from '../utils/api'

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
]

export default function AITutorPage() {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const addToast = useStore(state => state.addToast)
  const isDesktop = useBreakpoint('lg')

  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null)
  const [input, setInput] = useState('')
  const [showHistory, setShowHistory] = useState(false)
  const [isStreaming, setIsStreaming] = useState(false)
  const [lastFailedMessage, setLastFailedMessage] = useState<string | null>(null)

  const messagesEndRef = useRef<HTMLDivElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const abortControllerRef = useRef<AbortController | null>(null)

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
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
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

        const headers: Record<string, string> = {
          'Content-Type': 'application/json',
        }

        if (csrfToken) headers['x-csrf-token'] = csrfToken
        if (sessionId) headers['x-session-id'] = sessionId

        const response = await fetch(`${import.meta.env.VITE_API_URL}/ai/tutor/stream`, {
          method: 'POST',
          headers,
          body: JSON.stringify({
            message: messageToSend,
            session_id: currentSessionId,
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
        setLastFailedMessage(messageToSend)
        addToast({ message: 'Failed to stream response from AI Tutor.', type: 'error' })
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
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => navigate('/learning-path')}
                  className="rounded-xl font-black uppercase tracking-widest text-[10px] border-2"
                >
                  <BookOpen className="w-4 h-4 mr-2" />{' '}
                  <span className="hidden sm:inline">Reference</span>
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
                            <div
                              className="prose-custom prose-sm max-w-none prose-headings:font-black prose-a:text-primary-500"
                              // eslint-disable-next-line react/no-danger
                              dangerouslySetInnerHTML={{
                                __html: renderMarkdown(message.content),
                              }}
                            />
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
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
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
                  placeholder="Ask your tutor anything engineering..."
                  className="w-full pl-8 pr-20 py-6 bg-gray-50 dark:bg-gray-800 border-2 border-transparent focus:border-primary-500/30 focus:bg-white dark:focus:bg-gray-900 rounded-[2.5rem] text-base resize-none outline-none shadow-inner transition-all scrollbar-none font-medium placeholder:text-gray-400"
                  disabled={isStreaming || isMessagesLoading}
                />
                <div className="absolute right-4 top-1/2 -translate-y-1/2">
                  <button
                    onClick={() => void handleSendMessage()}
                    disabled={!input.trim() || isStreaming || isMessagesLoading}
                    aria-label="Send message"
                    className="w-14 h-14 bg-primary-600 text-white rounded-[1.5rem] flex items-center justify-center shadow-xl shadow-primary-500/30 hover:scale-105 active:scale-95 disabled:opacity-40 disabled:scale-100 transition-all duration-300"
                  >
                    {isStreaming ? (
                      <Loader2 className="w-6 h-6 animate-spin" />
                    ) : (
                      <Send className="w-6 h-6 ml-1" />
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
    </AnimatedPage>
  )
}
