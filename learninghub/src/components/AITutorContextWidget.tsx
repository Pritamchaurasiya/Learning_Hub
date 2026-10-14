import { useState, useRef, useEffect, useMemo, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Send,
  User,
  Loader2,
  ChevronDown,
  Lightbulb,
  Code2,
  BookOpen,
  GraduationCap,
  ShieldCheck,
  Compass,
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
          : 'Active Test Session',
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
        bannerText: 'Reviewing Test Diagnostic',
        bannerSubtext: testsA.testInfo?.testTitle ?? 'Completed Assessment',
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
        bannerText: 'Coding Problem Workspace',
        bannerSubtext: 'Ask for algorithmic hints or complexity bounds',
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
      content:
        'Welcome to Socratic Mentorship. I am your teaching assistant, here to guide you step-by-step through first-principles reasoning without spoiling the solution. What concept or derivation step would you like to explore?',
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
      void aiTutorService.createChatSession(context?.topic ?? 'Socratic Guidance').then(res => {
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
        addToast({ message: 'Mentorship connection timeout. Retrying...', type: 'warning' })
        setMessages(prev => [
          ...prev,
          {
            id: `err-${Date.now()}`,
            role: 'assistant',
            content: 'Mentorship engine is briefly reconnecting. Please submit your question again.',
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

  const handleQuickAction = (promptText: string) => {
    void handleSend(promptText)
  }

  const quickActions = useMemo(() => {
    if (!activeContext) {
      return [
        {
          label: 'Study Roadmap',
          icon: Compass,
          prompt: 'Help me review the high-yield topics for competitive entrance and system design.',
        },
        {
          label: 'Concept Clarity',
          icon: Lightbulb,
          prompt: 'I want to review core mathematical formulas and derivation methods.',
        },
      ]
    }

    if (activeContext.type === 'test') {
      return [
        {
          label: 'Socratic Hint',
          icon: Lightbulb,
          prompt:
            'Can you give me a first-principles conceptual hint without revealing the final answer?',
        },
        {
          label: 'Underlying Formula',
          icon: BookOpen,
          prompt: 'What physical laws, theorems, or data structures govern this question?',
        },
        {
          label: 'Common Pitfalls',
          icon: ShieldCheck,
          prompt: 'What are the typical sign errors or edge-case traps students fall into here?',
        },
      ]
    }

    if (activeContext.type === 'review') {
      return [
        {
          label: 'Root Cause Analysis',
          icon: GraduationCap,
          prompt: 'Help me analyze why I missed this problem and what concept I should review.',
        },
        {
          label: 'Alternative Proof',
          icon: BookOpen,
          prompt: 'Is there a faster shortcut or alternate calculus derivation for this solution?',
        },
      ]
    }

    if (activeContext.type === 'problem') {
      return [
        {
          label: 'Analyze Invariants',
          icon: Code2,
          prompt:
            'Analyze my current approach and discuss optimal loop invariants and edge cases.',
        },
        {
          label: 'Algorithmic Hint',
          icon: Lightbulb,
          prompt: 'Give me a hint for solving this problem without giving away the complete code.',
        },
        {
          label: 'Time & Space Bounds',
          icon: BookOpen,
          prompt: 'What are the theoretical lower bounds for time and space complexity on this problem?',
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
            className="fixed bottom-20 lg:bottom-8 right-4 sm:right-8 z-40 pointer-events-auto"
          >
            <Button
              onClick={() => setIsOpen(true)}
              aria-label="Open Socratic Teaching Assistant"
              className="w-14 h-14 rounded-full shadow-2xl bg-slate-900 border border-slate-700 hover:border-amber-400 text-amber-400 hover:text-amber-300 flex items-center justify-center group relative overflow-hidden transition-all shadow-slate-950/60"
            >
              <div className="absolute inset-0 bg-amber-400/10 scale-0 group-hover:scale-100 transition-transform rounded-full origin-center" />
              <GraduationCap className="w-6 h-6 relative z-10" />
            </Button>
            {/* Contextual badge */}
            {activeContext && (
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                className="absolute -top-1 -left-1 w-5 h-5 bg-amber-500 rounded-full border-2 border-slate-900 flex items-center justify-center shadow-lg"
              >
                <Lightbulb className="w-3 h-3 text-slate-950 font-bold" />
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
            className="fixed bottom-0 right-0 sm:bottom-6 sm:right-6 z-50 w-full sm:w-[380px] h-[80vh] sm:h-[600px] max-h-[100dvh] bg-slate-950 sm:rounded-2xl shadow-2xl border-t sm:border border-slate-800 flex flex-col overflow-hidden text-white"
          >
            {/* Header */}
            <div className="p-4 bg-slate-900 border-b border-slate-800 text-white flex items-center justify-between shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center">
                  <GraduationCap className="w-5 h-5 text-amber-400" />
                </div>
                <div>
                  <h3 className="font-bold text-sm leading-tight text-white">Socratic Mentor</h3>
                  <div className="flex items-center gap-1.5 mt-0.5">
                    <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                    <span className="text-[10px] uppercase font-mono tracking-wider font-semibold text-slate-400">
                      {activeContext
                        ? activeContext.isReview
                          ? 'Review Session'
                          : 'Context Synced'
                        : 'Office Hours Active'}
                    </span>
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-1">
                <Button
                  variant="ghost"
                  className="text-slate-400 hover:text-white hover:bg-slate-800 w-8 h-8 rounded-lg p-0"
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
                className="px-4 py-2.5 bg-slate-900/60 border-b border-slate-800 shrink-0"
              >
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 rounded bg-amber-500/10 border border-amber-500/20 flex items-center justify-center shrink-0">
                    {activeContext.type === 'test' ? (
                      <BookOpen className="w-3.5 h-3.5 text-amber-400" />
                    ) : (
                      <Code2 className="w-3.5 h-3.5 text-blue-400" />
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-semibold text-white truncate">
                      {activeContext.bannerText}
                    </p>
                    <p className="text-[11px] text-slate-400 truncate">
                      {activeContext.bannerSubtext}
                    </p>
                  </div>
                </div>
              </motion.div>
            )}

            {/* Messages Area */}
            <div className="flex-1 p-4 overflow-y-auto space-y-4">
              {messages.map(msg => (
                <motion.div
                  key={msg.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className={`flex gap-2.5 ${
                    msg.role === 'user' ? 'justify-end' : 'justify-start'
                  }`}
                >
                  {msg.role === 'assistant' && (
                    <div className="w-7 h-7 rounded-lg bg-amber-500/10 border border-amber-500/20 shrink-0 flex items-center justify-center">
                      <GraduationCap className="w-3.5 h-3.5 text-amber-400" />
                    </div>
                  )}

                  <div
                    className={`px-3.5 py-2.5 rounded-xl max-w-[85%] text-xs leading-relaxed ${
                      msg.role === 'user'
                        ? 'bg-amber-400 text-slate-950 font-medium rounded-br-none shadow-sm'
                        : 'bg-slate-900 text-slate-200 rounded-bl-none border border-slate-800'
                    }`}
                  >
                    {msg.content}
                  </div>

                  {msg.role === 'user' && (
                    <div className="w-7 h-7 rounded-lg bg-slate-800 shrink-0 flex items-center justify-center">
                      <User className="w-3.5 h-3.5 text-slate-300" />
                    </div>
                  )}
                </motion.div>
              ))}
              {isLoading && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="flex gap-2.5 justify-start"
                >
                  <div className="w-7 h-7 rounded-lg bg-amber-500/10 border border-amber-500/20 shrink-0 flex items-center justify-center">
                    <GraduationCap className="w-3.5 h-3.5 text-amber-400" />
                  </div>
                  <div className="px-4 py-2.5 rounded-xl bg-slate-900 rounded-bl-none border border-slate-800 flex items-center gap-1.5">
                    <span
                      className="w-1.5 h-1.5 bg-amber-400 rounded-full animate-bounce"
                      style={{ animationDelay: '0ms' }}
                    />
                    <span
                      className="w-1.5 h-1.5 bg-amber-400 rounded-full animate-bounce"
                      style={{ animationDelay: '150ms' }}
                    />
                    <span
                      className="w-1.5 h-1.5 bg-amber-400 rounded-full animate-bounce"
                      style={{ animationDelay: '300ms' }}
                    />
                  </div>
                </motion.div>
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Quick Action Pills */}
            {quickActions.length > 0 && !isLoading && (
              <div className="px-4 pt-2 pb-1 bg-slate-950 border-t border-slate-800/80 flex gap-2 overflow-x-auto shrink-0 scrollbar-none">
                {quickActions.map(action => {
                  const Icon = action.icon
                  return (
                    <button
                      key={action.label}
                      onClick={() => handleQuickAction(action.prompt)}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-medium whitespace-nowrap
                        bg-slate-900 text-slate-300 border border-slate-800 hover:border-slate-700 hover:text-white
                        transition-all duration-150 active:scale-95"
                    >
                      <Icon className="w-3 h-3 text-amber-400" />
                      {action.label}
                    </button>
                  )
                })}
              </div>
            )}

            {/* Input Area */}
            <div className="p-3 bg-slate-900 border-t border-slate-800 shrink-0">
              <div className="flex items-end gap-2 bg-slate-950 p-1.5 rounded-xl border border-slate-800 focus-within:border-amber-400 transition-all">
                <Input
                  value={input}
                  onChange={e => setInput(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="Ask a question or request a derivation hint..."
                  className="flex-1 bg-transparent border-none focus:ring-0 px-2.5 py-1.5 text-xs text-white placeholder:text-slate-500 max-h-32 resize-none"
                  disabled={isLoading}
                />
                <Button
                  onClick={() => void handleSend()}
                  disabled={!input.trim() || isLoading}
                  className="w-8 h-8 rounded-lg bg-amber-400 hover:bg-amber-300 text-slate-950 font-bold shrink-0 p-0 flex items-center justify-center shadow-sm"
                >
                  {isLoading ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <Send className="w-3.5 h-3.5" />
                  )}
                </Button>
              </div>
              <div className="mt-2 text-center">
                <span className="text-[10px] text-slate-500 font-mono">
                  Socratic Pedagogical Assistant • Verified Faculty Methodology
                </span>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  )
}

export default AITutorContextWidget
