import { useState, useRef, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Send, Bot, User, Sparkles, Loader2, ChevronDown } from 'lucide-react'
import { Button } from './ui/Button'
import { Input } from './ui/Input'
import { aiTutorService, AIChatMessage } from '../services/aiTutorService'
import { useStore } from '../stores/useStore'

interface AITutorContextWidgetProps {
  context?: {
    course_id?: string
    lesson_id?: string
    topic?: string
    test_id?: string
    question_id?: string
  }
}

export function AITutorContextWidget({ context }: AITutorContextWidgetProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [messages, setMessages] = useState<AIChatMessage[]>([
    {
      id: 'welcome',
      role: 'assistant',
      content: 'Hi! I am your AI Tutor. How can I help you with this topic?',
      createdAt: new Date().toISOString()
    }
  ])
  const [input, setInput] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [sessionId, setSessionId] = useState<string>('')
  
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const addToast = useStore(state => state.addToast)

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  useEffect(() => {
    if (isOpen) {
      scrollToBottom()
    }
  }, [messages, isOpen])

  useEffect(() => {
    // Initialize chat session when opened
    if (isOpen && !sessionId) {
      aiTutorService.createChatSession(context?.topic || 'Contextual Help').then(res => {
        if (res.status === 'success') {
          setSessionId(res.data.id)
        }
      })
    }
  }, [isOpen, sessionId, context])

  const handleSend = async () => {
    if (!input.trim() || isLoading) return

    const userMsg: AIChatMessage = {
      id: `usr-${Date.now()}`,
      role: 'user',
      content: input.trim(),
      createdAt: new Date().toISOString()
    }

    setMessages(prev => [...prev, userMsg])
    setInput('')
    setIsLoading(true)

    try {
      const response = await aiTutorService.sendMessage({
        message: userMsg.content,
        session_id: sessionId,
        context: context
      })

      if (response.status === 'success') {
        setMessages(prev => [...prev, response.data.message])
      } else {
        throw new Error('Failed to get response')
      }
    } catch (error) {
      addToast({ message: 'Failed to connect to AI Tutor', type: 'error' })
      setMessages(prev => [...prev, {
        id: `err-${Date.now()}`,
        role: 'assistant',
        content: 'Sorry, I am having trouble connecting right now. Please try again later.',
        createdAt: new Date().toISOString()
      }])
    } finally {
      setIsLoading(false)
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

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
                    <span className="text-[10px] uppercase tracking-wider font-medium text-white/80">Online</span>
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

            {/* Messages Area */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-gray-50/50 dark:bg-gray-900/50">
              {messages.map((msg) => (
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
                    <span className="w-1.5 h-1.5 bg-primary-500 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                    <span className="w-1.5 h-1.5 bg-primary-500 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                    <span className="w-1.5 h-1.5 bg-primary-500 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                  </div>
                </motion.div>
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Input Area */}
            <div className="p-4 bg-white dark:bg-gray-900 border-t border-gray-100 dark:border-gray-800 shrink-0">
              <div className="flex items-end gap-2 bg-gray-50 dark:bg-gray-800 p-1.5 rounded-2xl border border-gray-200 dark:border-gray-700 focus-within:ring-2 focus-within:ring-primary-500/50 focus-within:border-primary-500 transition-all">
                <Input
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="Ask your AI Tutor..."
                  className="flex-1 bg-transparent border-none focus:ring-0 px-3 py-2 text-sm max-h-32 resize-none"
                  disabled={isLoading}
                />
                <Button
                  onClick={handleSend}
                  disabled={!input.trim() || isLoading}
                  className="w-10 h-10 rounded-xl bg-primary-600 hover:bg-primary-700 text-white shrink-0 p-0 flex items-center justify-center shadow-md shadow-primary-600/20"
                >
                  {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4 ml-0.5" />}
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
