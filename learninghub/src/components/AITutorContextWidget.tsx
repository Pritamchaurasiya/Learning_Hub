import { useState, useRef, useEffect, useMemo, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Send,
  Bot,
  User,
  Sparkles,
  Loader2,
  ChevronDown,
  Lightbulb,
  Code2,
  BookOpen,
  GraduationCap,
} from 'lucide-react'
import { Button } from './ui/Button'
import { Input } from './ui/Input'
import { aiTutorService, AIChatMessage, ChatRequest } from '../services/aiTutorService'
import { useStore } from '../stores/useStore'
import { useLocation } from 'react-router-dom'

interface AITutorContextWidgetProps {
  context?: {
    course_id?: string
    lesson_id?: string
    topic?: string
    test_id?: string
    question_id?: string
  }
}

/**
 * Derives rich context from the global Zustand store based on the current route.
 * Returns the context payload + any display metadata for the contextual banner.
 */
function useActiveContext() {
  const location = useLocation()
  const testsA = useStore(state => state.testsA)

  return useMemo(() => {
    const path = location.pathname

    // Active Test Attempt (TestsAPage)
    if (testsA.isActive && testsA.questions.length > 0) {
      const currentQ = testsA.questions[testsA.currentQuestionIndex]
      const selectedAnswerId = currentQ ? testsA.answers[currentQ.id] : undefined
      const selectedOption = currentQ?.options?.find(o => o.id === selectedAnswerId)

      return {
        type: 'test' as const,
        isReview: false,
        bannerText: currentQ
          ? `Question ${testsA.currentQuestionIndex + 1} of ${testsA.questions.length}`
          : 'Active Test',
        bannerSubtext: currentQ?.text?.substring(0, 80) ?? '',
        payload: {
          course_id: testsA.testInfo?.testId,
          question_text: currentQ?.text,
          options: currentQ?.options?.map(o => o.text),
          selected_option: selectedOption?.text,
          is_review: false,
        },
      }
    }

    // Review Mode — User is viewing test results
    if (!testsA.isActive && testsA.results && path.includes('/tests-a/')) {
      return {
        type: 'review' as const,
        isReview: true,
        bannerText: 'Reviewing Test Results',
        bannerSubtext: testsA.testInfo?.testTitle ?? 'Completed Test',
        payload: {
          course_id: testsA.testInfo?.testId,
          is_review: true,
        },
      }
    }

    // Problem Workspace — detected by route
    if (path.startsWith('/problem/') || path.startsWith('/problems/')) {
      return {
        type: 'problem' as const,
        isReview: false,
        bannerText: 'Coding Workspace',
        bannerSubtext: 'Ask about your current problem',
        payload: {
          is_review: false,
        },
      }
    }

    return null
  }, [
    location.pathname,
    testsA.isActive,
    testsA.questions,
    testsA.currentQuestionIndex,
    testsA.answers,
    testsA.results,
    testsA.testInfo,
  ])
}

export function AITutorContextWidget({ context }: AITutorContextWidgetProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [messages, setMessages] = useState<AIChatMessage[]>([
    {
      id: 'welcome',
      role: 'assistant',
      content: 'Hi! I am your AI Tutor. How can I help you with this topic?',
      createdAt: new Date().toISOString(),
    },
  ])
  const [input, setInput] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [sessionId, setSessionId] = useState<string>('')

  const messagesEndRef = useRef<HTMLDivElement>(null)
  const addToast = useStore(state => state.addToast)
  const activeContext = useActiveContext()

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  useEffect(() => {
    if (isOpen) {
      scrollToBottom()
    }
  }, [messages, isOpen])

  useEffect(() => {
    if (isOpen && !sessionId) {
      void aiTutorService.createChatSession(context?.topic ?? 'Contextual Help').then(res => {
        if (res.status === 'success') {
          setSessionId(res.data.id)
        }
      })
    }
  }, [isOpen, sessionId, context])

  /** Build the merged context payload from both props and auto-detected state */
  const buildContext = useCallback((): ChatRequest['context'] => {
    const base = context ?? {}
    const auto = activeContext?.payload ?? {}
    return { ...base, ...auto }
  }, [context, activeContext])

  const handleSend = useCallback(
    async (messageOverride?: string) => {
      const msg = messageOverride ?? input.trim()
      if (!msg || isLoading) return

      const userMsg: AIChatMessage = {
        id: `usr-${Date.now()}`,
        role: 'user',
        content: msg,
        createdAt: new Date().toISOString(),
      }

      setMessages(prev => [...prev, userMsg])
      setInput('')
      setIsLoading(true)

      try {
        const response = await aiTutorService.sendMessage({
          message: userMsg.content,
          session_id: sessionId,
          context: buildContext(),
        })

        if (response.status === 'success') {
          setMessages(prev => [...prev, response.data.message])
        } else {
          throw new Error('Failed to get response')
        }
      } catch {
        addToast({ message: 'Failed to connect to AI Tutor', type: 'error' })
        setMessages(prev => [
          ...prev,
          {
            id: `err-${Date.now()}`,
            role: 'assistant',
            content: 'Sorry, I am having trouble connecting right now. Please try again later.',
            createdAt: new Date().toISOString(),
          },
        ])
      } finally {
        setIsLoading(false)
      }
    },
    [input, isLoading, sessionId, addToast, buildContext]
  )

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      void handleSend()
    }
  }

  /** Quick-action pill handler — sends a pre-built prompt */
  const handleQuickAction = (action: string) => {
    void handleSend(action)
  }

  /** Compute which quick-action pills to display */
  const quickActions = useMemo(() => {
    if (!activeContext) return []

    if (activeContext.isReview) {
      return [
        {
          label: 'Explain Solution',
          icon: GraduationCap,
          prompt: 'Explain the correct solution for this question step by step.',
        },
        {
          label: 'Explain Concept',
          icon: BookOpen,
          prompt: 'Explain the underlying concept behind this question.',
        },
      ]
    }

    if (activeContext.type === 'test') {
      return [
        {
          label: 'Get a Hint',
          icon: Lightbulb,
          prompt: 'Give me a hint for this question without revealing the answer.',
        },
        {
          label: 'Explain Concept',
          icon: BookOpen,
          prompt: 'Explain the concept behind this question so I can solve it myself.',
        },
      ]
    }

    if (activeContext.type === 'problem') {
      return [
        {
          label: 'Analyze my Code',
          icon: Code2,
          prompt:
            'Analyze my current code draft and point out any issues or areas for improvement.',
        },
        {
          label: 'Get a Hint',
          icon: Lightbulb,
          prompt: 'Give me a hint for solving this problem without giving away the full solution.',
        },
        {
          label: 'Explain Concept',
          icon: BookOpen,
          prompt: 'Explain the algorithm or data structure concept needed for this problem.',
        },
      ]
    }

    return []
  }, [activeContext])

  return (
    <>
      {/* Floating Action Button */}
      <AnimatePresence>
        {!isOpen && (
          <motion.div
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0, opacity: 0 }}
            className="fixed bottom-6 right-6 z-50"
          >
            <Button
              onClick={() => setIsOpen(true)}
              className="w-14 h-14 rounded-full shadow-2xl bg-gradient-to-r from-primary-600 to-purple-600 hover:from-primary-700 hover:to-purple-700 text-white flex items-center justify-center group relative overflow-hidden"
            >
              <div className="absolute inset-0 bg-white/20 scale-0 group-hover:scale-100 transition-transform rounded-full origin-center" />
              <Sparkles className="w-6 h-6 absolute animate-ping opacity-20" />
              <Bot className="w-6 h-6 relative z-10" />
            </Button>
            {/* Contextual badge */}
            {activeContext && (
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                className="absolute -top-1 -left-1 w-5 h-5 bg-amber-500 rounded-full border-2 border-white dark:border-gray-900 flex items-center justify-center shadow-lg"
              >
                <Lightbulb className="w-3 h-3 text-white" />
              </motion.div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Chat Window */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 50, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 50, scale: 0.95 }}
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            className="fixed bottom-0 right-0 sm:bottom-6 sm:right-6 z-50 w-full sm:w-[380px] h-[80vh] sm:h-[600px] max-h-[100dvh] bg-white dark:bg-gray-900 sm:rounded-3xl shadow-2xl border-t sm:border border-gray-200 dark:border-gray-800 flex flex-col overflow-hidden"
          >
            {/* Header */}
            <div className="p-4 bg-gradient-to-r from-primary-600 to-purple-600 text-white flex items-center justify-between shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center backdrop-blur-sm">
                  <Bot className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h3 className="font-bold text-sm leading-tight">AI Tutor</h3>
                  <div className="flex items-center gap-1.5 mt-0.5">
                    <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
                    <span className="text-[10px] uppercase tracking-wider font-medium text-white/80">
                      {activeContext
                        ? activeContext.isReview
                          ? 'Review Mode'
                          : 'Context Active'
                        : 'Online'}
                    </span>
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-1">
                <Button
                  variant="ghost"
                  className="text-white hover:bg-white/20 w-8 h-8 rounded-full p-0"
                  onClick={() => setIsOpen(false)}
                >
                  <ChevronDown className="w-5 h-5" />
                </Button>
              </div>
            </div>

            {/* Contextual Banner */}
            {activeContext && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                className="px-4 py-2.5 bg-gradient-to-r from-amber-50 to-orange-50 dark:from-amber-950/30 dark:to-orange-950/30 border-b border-amber-100 dark:border-amber-900/40 shrink-0"
              >
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-lg bg-amber-500/15 flex items-center justify-center shrink-0">
                    {activeContext.type === 'test' ? (
                      <BookOpen className="w-4 h-4 text-amber-600 dark:text-amber-400" />
                    ) : activeContext.type === 'problem' ? (
                      <Code2 className="w-4 h-4 text-amber-600 dark:text-amber-400" />
                    ) : (
                      <GraduationCap className="w-4 h-4 text-amber-600 dark:text-amber-400" />
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-[11px] font-semibold text-amber-700 dark:text-amber-300 uppercase tracking-wider">
                      {activeContext.bannerText}
                    </p>
                    {activeContext.bannerSubtext && (
                      <p className="text-xs text-amber-600/80 dark:text-amber-400/70 truncate mt-0.5">
                        {activeContext.bannerSubtext}
                      </p>
                    )}
                  </div>
                </div>
              </motion.div>
            )}

            {/* Messages Area */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-gray-50/50 dark:bg-gray-900/50">
              {messages.map(msg => (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  key={msg.id}
                  className={`flex gap-3 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  {msg.role === 'assistant' && (
                    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-primary-500 to-purple-500 shrink-0 flex items-center justify-center shadow-sm">
                      <Bot className="w-4 h-4 text-white" />
                    </div>
                  )}

                  <div
                    className={`px-4 py-2.5 rounded-2xl max-w-[80%] text-sm ${
                      msg.role === 'user'
                        ? 'bg-primary-600 text-white rounded-br-sm shadow-md shadow-primary-600/20'
                        : 'bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-200 rounded-bl-sm border border-gray-100 dark:border-gray-700 shadow-sm'
                    }`}
                  >
                    {msg.content}
                  </div>

                  {msg.role === 'user' && (
                    <div className="w-8 h-8 rounded-full bg-gray-200 dark:bg-gray-700 shrink-0 flex items-center justify-center shadow-sm">
                      <User className="w-4 h-4 text-gray-500 dark:text-gray-400" />
                    </div>
                  )}
                </motion.div>
              ))}
              {isLoading && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="flex gap-3 justify-start"
                >
                  <div className="w-8 h-8 rounded-full bg-gradient-to-br from-primary-500 to-purple-500 shrink-0 flex items-center justify-center shadow-sm">
                    <Bot className="w-4 h-4 text-white" />
                  </div>
                  <div className="px-4 py-3 rounded-2xl bg-white dark:bg-gray-800 rounded-bl-sm border border-gray-100 dark:border-gray-700 shadow-sm flex items-center gap-2">
                    <span
                      className="w-1.5 h-1.5 bg-primary-500 rounded-full animate-bounce"
                      style={{ animationDelay: '0ms' }}
                    />
                    <span
                      className="w-1.5 h-1.5 bg-primary-500 rounded-full animate-bounce"
                      style={{ animationDelay: '150ms' }}
                    />
                    <span
                      className="w-1.5 h-1.5 bg-primary-500 rounded-full animate-bounce"
                      style={{ animationDelay: '300ms' }}
                    />
                  </div>
                </motion.div>
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Quick Action Pills */}
            {quickActions.length > 0 && !isLoading && (
              <div className="px-4 pt-2 pb-1 bg-white dark:bg-gray-900 border-t border-gray-50 dark:border-gray-800/50 flex gap-2 overflow-x-auto shrink-0 scrollbar-hide">
                {quickActions.map(action => {
                  const Icon = action.icon
                  return (
                    <button
                      key={action.label}
                      onClick={() => handleQuickAction(action.prompt)}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap
                        bg-gradient-to-r from-primary-50 to-purple-50 dark:from-primary-950/30 dark:to-purple-950/30
                        text-primary-700 dark:text-primary-300
                        border border-primary-200/60 dark:border-primary-800/40
                        hover:from-primary-100 hover:to-purple-100 dark:hover:from-primary-950/50 dark:hover:to-purple-950/50
                        transition-all duration-200 hover:shadow-sm active:scale-95"
                    >
                      <Icon className="w-3.5 h-3.5" />
                      {action.label}
                    </button>
                  )
                })}
              </div>
            )}

            {/* Input Area */}
            <div className="p-4 bg-white dark:bg-gray-900 border-t border-gray-100 dark:border-gray-800 shrink-0">
              <div className="flex items-end gap-2 bg-gray-50 dark:bg-gray-800 p-1.5 rounded-2xl border border-gray-200 dark:border-gray-700 focus-within:ring-2 focus-within:ring-primary-500/50 focus-within:border-primary-500 transition-all">
                <Input
                  value={input}
                  onChange={e => setInput(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="Ask your AI Tutor..."
                  className="flex-1 bg-transparent border-none focus:ring-0 px-3 py-2 text-sm max-h-32 resize-none"
                  disabled={isLoading}
                />
                <Button
                  onClick={() => void handleSend()}
                  disabled={!input.trim() || isLoading}
                  className="w-10 h-10 rounded-xl bg-primary-600 hover:bg-primary-700 text-white shrink-0 p-0 flex items-center justify-center shadow-md shadow-primary-600/20"
                >
                  {isLoading ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Send className="w-4 h-4 ml-0.5" />
                  )}
                </Button>
              </div>
              <div className="mt-2 text-center">
                <span className="text-[10px] text-gray-400 font-medium tracking-wide">
                  Powered by Gemini Flash 2.0
                </span>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  )
}
