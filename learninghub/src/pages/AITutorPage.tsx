import { useState, useRef, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
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
} from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { SEO } from '../components/SEO'
import AnimatedPage from '../components/AnimatedPage'
import { Button } from '../components/ui/Button'
import { Card } from '../components/ui/Card'
import { aiTutorService, type AIChatMessage, type AIChatSession } from '../services/aiTutorService'
import { useStore } from '../stores/useStore'
import { renderMarkdown } from '../utils/markdown'
import { useBreakpoint } from '../hooks/useMediaQuery'

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
  const [messages, setMessages] = useState<AIChatMessage[]>([])
  const [sessions, setSessions] = useState<AIChatSession[]>([])
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null)
  const [input, setInput] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [isInitialLoading, setIsInitialLoading] = useState(true)
  const [showHistory, setShowHistory] = useState(false)

  const messagesEndRef = useRef<HTMLDivElement>(null)
  const { addToast } = useStore()
  const isDesktop = useBreakpoint('lg')

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [])

  useEffect(() => {
    scrollToBottom()
  }, [messages, scrollToBottom])

  const loadHistory = useCallback(async () => {
    try {
      const res = await aiTutorService.getChatHistory()
      setSessions(res.data)
      return res.data
    } catch (err) {
      if (import.meta.env.DEV) {
        console.error('[AITutorPage] Failed to fetch history:', err)
      }
      return []
    }
  }, [])

  const startNewChat = useCallback(async () => {
    try {
      setIsLoading(true)
      const res = await aiTutorService.createChatSession(`Chat ${new Date().toLocaleDateString()}`)
      setCurrentSessionId(res.data.id)
      setMessages([
        {
          id: 'welcome',
          role: 'assistant',
          content:
            "Hello! I'm your AI Tutor. I can help you with coding concepts, explain topics, answer questions, and guide your learning journey. What would you like to learn today?",
          timestamp: new Date().toISOString(),
        },
      ])
      await loadHistory()
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
    } catch (err) {
      addToast({ message: 'Failed to create new chat session', type: 'error' })
    } finally {
      setIsLoading(false)
    }
  }, [addToast, loadHistory])

  const selectSession = useCallback(
    async (sessionId: string) => {
      try {
        setIsLoading(true)
        const res = await aiTutorService.getChatSession(sessionId)
        setCurrentSessionId(res.data.id)
        setMessages(
          res.data.messages.length > 0
            ? res.data.messages
            : [
                {
                  id: 'welcome',
                  role: 'assistant',
                  content: 'Continuing our session. How can I help you further?',
                  timestamp: new Date().toISOString(),
                },
              ]
        )
        if (!isDesktop) setShowHistory(false)
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
      } catch (err) {
        addToast({ message: 'Failed to load chat session', type: 'error' })
      } finally {
        setIsLoading(false)
      }
    },
    [addToast, isDesktop]
  )

  useEffect(() => {
    const controller = new AbortController()
    const init = async () => {
      if (controller.signal.aborted) return
      setIsInitialLoading(true)
      const history = await loadHistory()
      if (controller.signal.aborted) return
      if (history.length > 0) {
        await selectSession(history[0].id)
      } else {
        await startNewChat()
      }
      if (!controller.signal.aborted) setIsInitialLoading(false)
    }
    void init()
    return () => controller.abort()
  }, [loadHistory, selectSession, startNewChat])

  const sendMessage = async () => {
    if (!input.trim() || isLoading || !currentSessionId) return

    const userMessage: AIChatMessage = {
      id: Date.now().toString(),
      role: 'user',
      content: input,
      timestamp: new Date().toISOString(),
    }

    setMessages(prev => [...prev, userMessage])
    setInput('')
    setIsLoading(true)

    try {
      const res = await aiTutorService.sendMessage({
        message: input,
        session_id: currentSessionId,
      })
      setMessages(prev => [...prev, res.data.message])
    } catch (err) {
      addToast({ message: 'Failed to get AI response', type: 'error' })
      if (import.meta.env.DEV) {
        console.error('[AITutorPage] Failed to send message:', err)
      }
    } finally {
      setIsLoading(false)
    }
  }

  const handleDeleteSession = async (sessionId: string, e: React.MouseEvent) => {
    e.stopPropagation()
    try {
      await aiTutorService.deleteChatSession(sessionId)
      setSessions(prev => prev.filter(s => s.id !== sessionId))
      if (currentSessionId === sessionId) {
        const remaining = sessions.filter(s => s.id !== sessionId)
        if (remaining.length > 0) void selectSession(remaining[0].id)
        else void startNewChat()
      }
      addToast({ message: 'Chat deleted', type: 'success' })
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
    } catch (err) {
      addToast({ message: 'Failed to delete chat', type: 'error' })
    }
  }

  const formatTime = (timestamp: string) => {
    return new Date(timestamp).toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  if (isInitialLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[70vh] space-y-6">
        <div className="relative">
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 1.5, repeat: Infinity, ease: 'linear' }}
            className="w-20 h-20 border-4 border-primary-500/20 border-t-primary-500 rounded-full"
          />
          <Bot className="w-8 h-8 text-primary-500 absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2" />
        </div>
        <div className="text-center">
          <p className="font-bold text-xl tracking-tight">Syncing with AI Tutor</p>
          <p className="text-sm text-gray-500 animate-pulse">
            Initializing neural learning environment...
          </p>
        </div>
      </div>
    )
  }

  return (
    <AnimatedPage className="h-[calc(100vh-10rem)] flex flex-col gap-6">
      <SEO title="AI Engineering Tutor - LearningHub" />

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
              className="absolute inset-0 z-30 bg-gray-900/40 backdrop-blur-sm lg:hidden rounded-[2.5rem]"
            />
          )}
        </AnimatePresence>

        <AnimatePresence>
          {(showHistory || isDesktop) && (
            <motion.div
              initial={{ x: -300, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              exit={{ x: -300, opacity: 0 }}
              className={`absolute lg:relative z-40 w-72 h-full bg-white dark:bg-gray-950 border border-gray-200 dark:border-gray-800 rounded-[2rem] flex flex-col overflow-hidden shadow-2xl lg:shadow-none`}
            >
              <div className="p-5 border-b border-gray-100 dark:border-gray-800 flex items-center justify-between">
                <h3 className="font-black text-xs uppercase tracking-widest text-gray-400 flex items-center gap-2">
                  <History className="w-4 h-4" /> Session History
                </h3>
                <button
                  onClick={startNewChat}
                  className="p-2 bg-primary-50 dark:bg-primary-900/20 text-primary-600 rounded-xl hover:scale-105 active:scale-95 transition-all"
                  aria-label="Start new chat session"
                >
                  <Plus className="w-4 h-4" />
                </button>
              </div>
              <div className="flex-1 overflow-y-auto p-3 space-y-2 scrollbar-thin">
                {sessions.map(session => (
                  <button
                    key={session.id}
                    onClick={() => selectSession(session.id)}
                    className={`w-full text-left p-4 rounded-2xl group transition-all relative ${
                      currentSessionId === session.id
                        ? 'bg-primary-600 text-white shadow-lg shadow-primary-500/30'
                        : 'hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-600 dark:text-gray-400'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <MessageSquare
                        className={`w-4 h-4 shrink-0 ${currentSessionId === session.id ? 'text-white' : 'text-gray-400'}`}
                      />
                      <div className="min-w-0">
                        <p className="text-sm font-bold truncate">{session.title}</p>
                        <p
                          className={`text-[10px] uppercase font-black tracking-tighter opacity-60`}
                        >
                          {new Date(session.updated_at).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                    <button
                      onClick={e => handleDeleteSession(session.id, e)}
                      aria-label="Delete chat session"
                      className={`absolute right-3 top-1/2 -translate-y-1/2 p-2 rounded-lg opacity-0 group-hover:opacity-100 hover:bg-red-500 hover:text-white transition-all ${currentSessionId === session.id ? 'text-white/80' : 'text-gray-400'}`}
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </button>
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Chat Interface */}
        <div className="flex-1 flex flex-col min-w-0">
          <Card className="flex-1 flex flex-col overflow-hidden border-none shadow-2xl rounded-[2.5rem] bg-white dark:bg-gray-900/50 backdrop-blur-xl">
            {/* Header */}
            <div className="p-4 border-b border-gray-100 dark:border-gray-800 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <button
                  onClick={() => setShowHistory(!showHistory)}
                  aria-label="Toggle chat history"
                  className="lg:hidden p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-xl"
                >
                  <History className="w-5 h-5" />
                </button>
                <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-primary-500 to-purple-600 flex items-center justify-center shadow-lg">
                  <Bot className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h2 className="font-black text-sm uppercase tracking-wider leading-none">
                    Neural Tutor v4.5
                  </h2>
                  <div className="flex items-center gap-1.5 mt-1">
                    <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                    <span className="text-[10px] font-black text-gray-400 uppercase tracking-tighter">
                      Engine Online
                    </span>
                  </div>
                </div>
              </div>
              <div className="flex gap-2">
                <Button variant="ghost" size="sm" onClick={() => navigate('/learning-path')}>
                  <BookOpen className="w-4 h-4 mr-2" />{' '}
                  <span className="hidden sm:inline">Reference</span>
                </Button>
              </div>
            </div>

            {/* Messages Area */}
            <div className="flex-1 overflow-y-auto p-6 space-y-8 scrollbar-thin">
              {messages.map(message => (
                <motion.div
                  key={message.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className={`flex gap-4 ${message.role === 'user' ? 'flex-row-reverse' : 'flex-row'}`}
                >
                  <div
                    className={`w-10 h-10 rounded-2xl shrink-0 flex items-center justify-center shadow-md ${
                      message.role === 'user'
                        ? 'bg-gray-100 dark:bg-gray-800 text-gray-500'
                        : 'bg-gradient-to-br from-primary-500 to-indigo-600 text-white'
                    }`}
                  >
                    {message.role === 'user' ? (
                      <User className="w-5 h-5" />
                    ) : (
                      <Bot className="w-5 h-5" />
                    )}
                  </div>
                  <div
                    className={`max-w-[85%] lg:max-w-[75%] space-y-2 ${message.role === 'user' ? 'items-end' : 'items-start'}`}
                  >
                    <div
                      className={`p-5 rounded-[2rem] text-sm leading-relaxed ${
                        message.role === 'user'
                          ? 'bg-primary-600 text-white rounded-tr-none shadow-xl shadow-primary-500/10'
                          : 'bg-gray-50 dark:bg-gray-800/80 text-gray-800 dark:text-gray-200 rounded-tl-none border border-gray-100 dark:border-gray-700/30'
                      }`}
                    >
                      {message.role === 'assistant' ? (
                        <div
                          className="prose-custom prose-sm max-w-none"
                          // eslint-disable-next-line react/no-danger
                          dangerouslySetInnerHTML={{ __html: renderMarkdown(message.content) }}
                        />
                      ) : (
                        <p>{message.content}</p>
                      )}
                    </div>
                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest px-2">
                      {message.role === 'assistant' ? 'Tutor' : 'Student'} •{' '}
                      {formatTime(message.timestamp)}
                    </p>
                  </div>
                </motion.div>
              ))}
              {isLoading && (
                <div className="flex gap-4">
                  <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-primary-500 to-indigo-600 flex items-center justify-center shadow-md">
                    <Bot className="w-5 h-5 text-white" />
                  </div>
                  <div className="bg-gray-50 dark:bg-gray-800/80 rounded-[2rem] rounded-tl-none p-6 flex gap-2">
                    <div className="w-2 h-2 bg-primary-400 rounded-full animate-bounce" />
                    <div className="w-2 h-2 bg-primary-400 rounded-full animate-bounce delay-150" />
                    <div className="w-2 h-2 bg-primary-400 rounded-full animate-bounce delay-300" />
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Empty State / Quick Actions */}
            {messages.length <= 1 && !isLoading && (
              <div className="px-6 pb-6">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  {quickActions.map((action, i) => (
                    <button
                      // eslint-disable-next-line react/no-array-index-key
                      key={i}
                      onClick={() => setInput(action.prompt)}
                      className="p-5 rounded-3xl bg-gray-50 dark:bg-gray-800/50 border border-gray-100 dark:border-gray-800 hover:border-primary-500/50 hover:bg-white dark:hover:bg-gray-800 text-left transition-all group"
                    >
                      <div
                        className={`w-10 h-10 rounded-xl ${action.bg} flex items-center justify-center mb-4 transition-transform group-hover:scale-110 group-hover:rotate-3`}
                      >
                        <action.icon className={`w-5 h-5 ${action.color}`} />
                      </div>
                      <p className="text-xs font-black uppercase tracking-widest text-gray-400 mb-1">
                        {action.label}
                      </p>
                      <p className="text-[11px] text-gray-500 line-clamp-1 italic">
                        &quot;{action.prompt}&quot;
                      </p>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Input Area */}
            <div className="p-6 pt-2">
              <div className="relative group">
                <textarea
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
                      void sendMessage()
                      const target = e.target as HTMLTextAreaElement
                      target.style.height = 'auto'
                    }
                  }}
                  placeholder="Ask your tutor anything engineering..."
                  className="w-full pl-6 pr-16 py-5 bg-gray-50 dark:bg-gray-800 border-2 border-transparent focus:border-primary-500/50 focus:bg-white dark:focus:bg-gray-900 rounded-[2rem] text-sm resize-none outline-none shadow-inner transition-all scrollbar-none"
                  disabled={isLoading}
                />
                <div className="absolute right-3 top-1/2 -translate-y-1/2">
                  <button
                    onClick={sendMessage}
                    disabled={!input.trim() || isLoading}
                    aria-label="Send message"
                    className="w-12 h-12 bg-primary-600 text-white rounded-2xl flex items-center justify-center shadow-xl shadow-primary-500/20 hover:scale-105 active:scale-95 disabled:opacity-30 disabled:scale-100 transition-all"
                  >
                    {isLoading ? (
                      <Loader2 className="w-5 h-5 animate-spin" />
                    ) : (
                      <Send className="w-5 h-5" />
                    )}
                  </button>
                </div>
              </div>
              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-tighter text-center mt-4 opacity-50">
                System Advisory: AI responses may be speculative. Cross-reference with
                documentation.
              </p>
            </div>
          </Card>
        </div>
      </div>
    </AnimatedPage>
  )
}
