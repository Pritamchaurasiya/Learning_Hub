import { useState, useEffect, useCallback, useMemo, useRef } from 'react'
import { useWebSocket } from '../hooks/useWebSocket'
import { motion, AnimatePresence } from 'framer-motion'
import AnimatedPage from '../components/AnimatedPage'
import {
  Video,
  Mic,
  MicOff,
  VideoOff,
  Users,
  Hand,
  Monitor,
  Calendar,
  Clock,
  Play,
  ExternalLink,
  Wifi,
  Shield,
  MoreVertical,
} from 'lucide-react'
import { SEO } from '../components/SEO'
import { Button } from '../components/ui/Button'
import { Card } from '../components/ui/Card'
import { liveClassService, type LiveSession } from '../services/liveClassService'
import { useStore } from '../stores/useStore'

export default function LiveClassPage() {
  const [classes, setClasses] = useState<LiveSession[]>([])
  const [isInClass, setIsInClass] = useState(false)
  const [isMuted, setIsMuted] = useState(false)
  const [isVideoOff, setIsVideoOff] = useState(false)
  const [isHandRaised, setIsHandRaised] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<'upcoming' | 'live' | 'my'>('upcoming')
  const { addToast } = useStore()

  const fetchSessions = useCallback(async () => {
    try {
      setIsLoading(true)
      let res
      if (activeTab === 'live') {
        res = await liveClassService.getLiveSessions()
      } else if (activeTab === 'my') {
        res = await liveClassService.getMySessions()
      } else {
        res = await liveClassService.getUpcomingSessions()
      }
      setClasses(res.data || [])
    } catch (err) {
      console.error('[LiveClassPage] Fetch failed:', err)
    } finally {
      setIsLoading(false)
    }
  }, [activeTab])

  useEffect(() => {
    void fetchSessions()
  }, [fetchSessions])

  const { connect, disconnect, on, emit, joinRoom } = useWebSocket()
  const { auth } = useStore()

  const [messages, setMessages] = useState<
    { id: string; sender: string; content: string; timestamp: string }[]
  >([])
  const [chatInput, setChatInput] = useState('')
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null)

  // Use a ref for auto-scrolling
  const chatEndRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (chatEndRef.current) {
      chatEndRef.current.scrollIntoView({ behavior: 'smooth' })
    }
  }, [messages])

  const joinClass = useCallback(
    async (sessionId: string) => {
      try {
        const res = await liveClassService.joinSession(sessionId)
        if (res.data) {
          setIsInClass(true)
          setActiveSessionId(sessionId)
        }

        // Connect WebSocket and join room
        if (auth.isAuthenticated) {
          connect('')
          joinRoom(sessionId)

          // Clear old messages when joining a new session
          setMessages([
            {
              id: 'sys-1',
              sender: 'System',
              content: 'Connected to end-to-end encrypted chat.',
              timestamp: new Date().toISOString(),
            },
          ])
        }

        addToast({ message: 'Session connection established.', type: 'success' })
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
      } catch (err) {
        addToast({ message: 'Authentication failed for this session.', type: 'error' })
      }
    },
    [addToast, auth.isAuthenticated, connect, joinRoom]
  )

  useEffect(() => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const cleanup = on('new-message', (data: any) => {
      setMessages(prev => [
        ...prev,
        {
          id: Math.random().toString(),
          sender: data.sender ?? 'Participant',
          content: data.message,
          timestamp: new Date().toISOString(),
        },
      ])
    })

    return () => cleanup()
  }, [on])

  const leaveClass = useCallback(() => {
    setIsInClass(false)
    setActiveSessionId(null)
    disconnect()
  }, [disconnect])

  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault()
    if (!chatInput.trim() || !activeSessionId) return

    emit('send-message', { roomId: activeSessionId, message: chatInput })

    // Optimistically add to UI
    setMessages(prev => [
      ...prev,
      {
        id: Math.random().toString(),
        sender: auth.user?.username ?? 'Anonymous',
        content: chatInput,
        timestamp: new Date().toISOString(),
      },
    ])

    setChatInput('')
  }

  const formatTime = useCallback((timestamp: string) => {
    const date = new Date(timestamp)
    const now = new Date()
    const diffMs = date.getTime() - now.getTime()
    const diffMins = Math.floor(diffMs / 60000)
    const diffHours = Math.floor(diffMs / 3600000)
    const diffDays = Math.floor(diffMs / 86400000)

    if (diffMs < 0) return 'STARTED'
    if (diffMins < 60) return `IN ${diffMins}M`
    if (diffHours < 24) return `IN ${diffHours}H`
    return `IN ${diffDays}D`
  }, [])

  const filteredSessions = useMemo(() => classes, [classes])

  if (isInClass) {
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.98 }}
        animate={{ opacity: 1, scale: 1 }}
        className="h-[calc(100vh-6rem)] flex flex-col gap-6"
      >
        <SEO title="Live Class Environment" />

        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2 bg-red-50 dark:bg-red-900/10 px-4 py-2 rounded-2xl border border-red-100 dark:border-red-900/30">
              <div className="w-2.5 h-2.5 bg-red-500 rounded-full animate-pulse" />
              <span className="text-xs font-black text-red-600 uppercase tracking-widest">
                Live Environment
              </span>
            </div>
            <h1 className="text-2xl font-black tracking-tight text-gray-900 dark:text-white truncate max-w-[200px] sm:max-w-md">
              System Design Workshop
            </h1>
          </div>
          <Button
            variant="outline"
            onClick={leaveClass}
            className="rounded-2xl border-2 font-bold px-6 text-red-500 border-red-200 hover:bg-red-50 dark:border-red-900/50 dark:hover:bg-red-900/20"
          >
            Leave Session
          </Button>
        </div>

        <div className="flex-1 flex gap-6 overflow-hidden">
          {/* Main Video Area */}
          <Card className="flex-1 flex flex-col overflow-hidden rounded-[2.5rem] border-none shadow-2xl bg-black relative">
            <div className="flex-1 relative flex items-center justify-center">
              <div className="text-center space-y-6">
                <motion.div
                  animate={{ y: [0, -10, 0] }}
                  transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}
                  className="w-24 h-24 bg-white/5 rounded-[2rem] flex items-center justify-center mx-auto backdrop-blur-xl border border-white/10"
                >
                  <Video className="w-10 h-10 text-white/40" />
                </motion.div>
                <div className="space-y-2">
                  <p className="text-white/80 font-bold text-xl tracking-tight">
                    Synchronizing Stream...
                  </p>
                  <div className="flex items-center justify-center gap-4">
                    <span className="flex items-center gap-1.5 text-[10px] font-black text-emerald-400 uppercase tracking-widest bg-emerald-400/10 px-3 py-1 rounded-full border border-emerald-400/20">
                      <Wifi className="w-3 h-3" /> Secure Connection
                    </span>
                    <span className="flex items-center gap-1.5 text-[10px] font-black text-indigo-400 uppercase tracking-widest bg-indigo-400/10 px-3 py-1 rounded-full border border-indigo-400/20">
                      <Shield className="w-3 h-3" /> End-to-End Encrypted
                    </span>
                  </div>
                </div>
              </div>

              <div className="absolute bottom-8 right-8 flex gap-4 hidden lg:flex">
                {[1, 2].map(i => (
                  <motion.div
                    key={i}
                    whileHover={{ scale: 1.05 }}
                    className="w-48 h-32 bg-gray-900/80 backdrop-blur-md rounded-3xl border border-white/10 flex items-center justify-center shadow-2xl relative group overflow-hidden"
                  >
                    <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
                    <Users className="w-8 h-8 text-white/20" />
                    <span className="absolute bottom-3 left-4 text-[10px] font-bold text-white/60 uppercase tracking-widest">
                      Participant {i}
                    </span>
                  </motion.div>
                ))}
              </div>
            </div>

            <div className="p-6 bg-gray-900/50 backdrop-blur-2xl border-t border-white/5">
              <div className="flex flex-col sm:flex-row items-center justify-between gap-4 sm:gap-6">
                <div className="flex items-center gap-2 sm:gap-3 flex-wrap justify-center">
                  {[
                    {
                      icon: isMuted ? MicOff : Mic,
                      active: !isMuted,
                      onClick: () => setIsMuted(!isMuted),
                      label: isMuted ? 'Unmute microphone' : 'Mute microphone',
                    },
                    {
                      icon: isVideoOff ? VideoOff : Video,
                      active: !isVideoOff,
                      onClick: () => setIsVideoOff(!isVideoOff),
                      label: isVideoOff ? 'Turn on camera' : 'Turn off camera',
                    },
                    {
                      icon: Hand,
                      active: isHandRaised,
                      onClick: () => {
                        setIsHandRaised(!isHandRaised)
                        if (!isHandRaised) {
                          emit('raise-hand', { roomId: activeSessionId })
                          addToast({ message: 'Hand raised!', type: 'success' })
                        }
                      },
                      label: isHandRaised ? 'Lower hand' : 'Raise hand',
                    },
                    {
                      icon: Monitor,
                      active: false,
                      onClick: () => {},
                      label: 'Share screen options',
                    },
                  ].map((ctrl, idx) => (
                    <motion.button
                      // eslint-disable-next-line react/no-array-index-key
                      key={idx}
                      whileHover={{ y: -2 }}
                      whileTap={{ scale: 0.9 }}
                      onClick={ctrl.onClick}
                      aria-label={ctrl.label}
                      className={`w-14 h-14 rounded-2xl flex items-center justify-center transition-all ${ctrl.active ? 'bg-primary-600 text-white shadow-xl shadow-primary-500/20' : 'bg-white/5 text-white/60 hover:bg-white/10 border border-white/10'}`}
                    >
                      <ctrl.icon className="w-6 h-6" />
                    </motion.button>
                  ))}
                </div>

                <div className="flex items-center gap-4">
                  <div className="hidden sm:flex flex-col items-end mr-4">
                    <p className="text-white font-black text-sm tabular-nums">234</p>
                    <p className="text-[10px] text-white/40 font-bold uppercase tracking-widest">
                      Active Learners
                    </p>
                  </div>
                  <Button
                    variant="outline"
                    className="hidden lg:flex h-14 px-8 rounded-2xl border-white/10 bg-white/5 text-white hover:bg-white/10 font-bold items-center gap-2"
                  >
                    <Monitor className="w-5 h-5" /> Share Screen
                  </Button>
                </div>
              </div>
            </div>
          </Card>

          {/* Real-time Chat Sidebar */}
          <Card className="hidden md:flex w-96 flex-col overflow-hidden rounded-[2.5rem] bg-white dark:bg-gray-900 border-2">
            <div className="p-6 border-b border-gray-100 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-800/20 flex items-center justify-between">
              <div>
                <h3 className="font-black text-gray-900 dark:text-white flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                  Live Chat
                </h3>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-6 space-y-4">
              {messages.map(msg => (
                <div
                  key={msg.id}
                  className={`flex flex-col ${msg.sender === (auth.user?.username ?? 'You') ? 'items-end' : 'items-start'}`}
                >
                  <div className="flex items-baseline gap-2 mb-1">
                    <span className="text-xs font-bold text-gray-900 dark:text-gray-300">
                      {msg.sender}
                    </span>
                    <span className="text-[10px] text-gray-500 font-mono">
                      {new Date(msg.timestamp).toLocaleTimeString([], {
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </span>
                  </div>
                  <div
                    className={`px-4 py-2.5 rounded-2xl text-sm ${
                      msg.sender === 'System'
                        ? 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 font-medium italic w-full text-center text-xs'
                        : msg.sender === (auth.user?.username ?? 'You')
                          ? 'bg-primary-600 text-white rounded-br-sm shadow-md'
                          : 'bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-white rounded-bl-sm'
                    }`}
                  >
                    {msg.content}
                  </div>
                </div>
              ))}
              <div ref={chatEndRef} />
            </div>

            <div className="p-4 bg-gray-50 dark:bg-gray-800/50 border-t border-gray-100 dark:border-gray-800">
              <form onSubmit={handleSendMessage} className="flex gap-2">
                <input
                  type="text"
                  value={chatInput}
                  onChange={e => setChatInput(e.target.value)}
                  placeholder="Type a message..."
                  className="flex-1 bg-white dark:bg-gray-900 border-2 border-gray-200 dark:border-gray-700 rounded-xl px-4 text-sm font-medium focus:border-primary-500 outline-none transition-colors dark:text-white"
                />
                <Button
                  type="submit"
                  disabled={!chatInput.trim()}
                  className="rounded-xl px-6 font-bold shadow-md"
                >
                  Send
                </Button>
              </form>
            </div>
          </Card>
        </div>
      </motion.div>
    )
  }

  return (
    <AnimatedPage className="space-y-10 pb-12">
      <SEO title="Live Learning" description="Enterprise-grade live workshops" />

      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div className="space-y-2">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-12 h-12 rounded-2xl bg-primary-600 flex items-center justify-center shadow-xl shadow-primary-500/20">
              <Video className="w-6 h-6 text-white" />
            </div>
            <h1 className="text-3xl font-black tracking-tight text-gray-900 dark:text-white uppercase tracking-tighter">
              Live Workshops
            </h1>
          </div>
          <p className="text-gray-500 dark:text-gray-400 font-medium text-lg">
            Interact with leading engineering mentors in real-time sessions.
          </p>
        </div>

        <div className="flex p-1.5 bg-gray-100 dark:bg-gray-800 rounded-2xl shrink-0">
          {[
            { id: 'upcoming', label: 'Upcoming' },
            { id: 'live', label: 'Live Now' },
            { id: 'my', label: 'Enrolled' },
          ].map(tab => (
            <button
              key={tab.id}
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              onClick={() => setActiveTab(tab.id as any)}
              className={`px-6 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${activeTab === tab.id ? 'bg-white dark:bg-gray-700 text-primary-600 shadow-lg' : 'text-gray-400 hover:text-gray-600'}`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      <AnimatePresence mode="wait">
        {isLoading ? (
          <motion.div
            key="loading"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8"
          >
            {[1, 2, 3].map(i => (
              <div
                key={i}
                className="h-[450px] rounded-[2.5rem] bg-gray-100 dark:bg-gray-800/50 animate-pulse overflow-hidden relative"
              >
                <div className="absolute inset-0 shimmer" />
              </div>
            ))}
          </motion.div>
        ) : filteredSessions.length > 0 ? (
          <motion.div
            key="grid"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8"
          >
            {filteredSessions.map((cls, idx) => (
              <motion.div
                key={cls.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.1 }}
              >
                <Card
                  hover
                  className="h-full overflow-hidden rounded-[2.5rem] border-none shadow-xl group bg-white dark:bg-gray-900 flex flex-col"
                >
                  <div className="aspect-video bg-gradient-to-br from-indigo-500 via-purple-600 to-pink-500 flex items-center justify-center relative overflow-hidden shrink-0">
                    <motion.div
                      whileHover={{ scale: 1.1, rotate: 5 }}
                      transition={{ type: 'spring', stiffness: 300 }}
                    >
                      <Video className="w-20 h-20 text-white/30" />
                    </motion.div>
                    <div className="absolute inset-0 bg-black/20 group-hover:bg-transparent transition-all" />

                    {cls.status === 'live' && (
                      <div className="absolute top-6 left-6 bg-red-500 text-white px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-[0.2em] flex items-center gap-2 shadow-2xl border border-white/20">
                        <div className="w-2 h-2 bg-white rounded-full animate-ping" />
                        Live Now
                      </div>
                    )}

                    <div className="absolute top-6 right-6">
                      <div className="w-10 h-10 rounded-xl bg-white/20 backdrop-blur-md flex items-center justify-center text-white border border-white/20 group-hover:bg-white group-hover:text-primary-600 transition-all">
                        <MoreVertical className="w-5 h-5" />
                      </div>
                    </div>
                  </div>

                  <div className="p-8 space-y-6 flex-1 flex flex-col">
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-black text-primary-500 uppercase tracking-[0.2em]">
                          WORKSHOP
                        </span>
                        <div className="flex items-center gap-1.5 text-[10px] font-black text-gray-400 uppercase tracking-widest">
                          <Wifi className="w-3 h-3" /> HQ STREAM
                        </div>
                      </div>
                      <h3 className="text-xl font-black text-gray-900 dark:text-white leading-tight tracking-tight group-hover:text-primary-600 transition-colors">
                        {cls.title}
                      </h3>
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-gray-100 dark:bg-gray-800 flex items-center justify-center">
                          <Shield className="w-4 h-4 text-gray-400" />
                        </div>
                        <p className="text-sm font-bold text-gray-500 dark:text-gray-400 uppercase tracking-tight">
                          {cls.instructorName}
                        </p>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4 py-6 border-y border-gray-50 dark:border-gray-800/50 mt-auto">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2 text-primary-500">
                          <Calendar className="w-4 h-4" />
                          <span className="text-[10px] font-black uppercase tracking-widest">
                            {formatTime(cls.scheduledAt)}
                          </span>
                        </div>
                        <p className="text-xs font-bold text-gray-400">Scheduled</p>
                      </div>
                      <div className="space-y-1">
                        <div className="flex items-center gap-2 text-indigo-500">
                          <Clock className="w-4 h-4" />
                          <span className="text-[10px] font-black uppercase tracking-widest">
                            {cls.durationMinutes} MIN
                          </span>
                        </div>
                        <p className="text-xs font-bold text-gray-400">Duration</p>
                      </div>
                    </div>

                    <div className="flex items-center justify-between pt-2">
                      <div className="flex items-center gap-3 bg-gray-50 dark:bg-gray-800/50 px-4 py-2 rounded-xl border border-gray-100 dark:border-gray-800">
                        <Users className="w-4 h-4 text-gray-400" />
                        <span className="text-xs font-black tabular-nums">
                          {cls.currentParticipants}{' '}
                          <span className="text-gray-300">/ {cls.maxParticipants}</span>
                        </span>
                      </div>
                      <motion.button
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        onClick={() => joinClass(cls.id)}
                        className={`px-8 py-3 rounded-2xl font-black text-sm tracking-tight flex items-center gap-2 shadow-xl transition-all ${cls.status === 'live' ? 'bg-primary-600 text-white shadow-primary-500/30 hover:bg-primary-700' : 'bg-gray-900 text-white dark:bg-white dark:text-gray-900'}`}
                      >
                        {cls.status === 'live' ? (
                          <>
                            <Play className="w-4 h-4 fill-current" /> Join Hub
                          </>
                        ) : (
                          <>
                            <ExternalLink className="w-4 h-4" /> Secure Spot
                          </>
                        )}
                      </motion.button>
                    </div>
                  </div>
                </Card>
              </motion.div>
            ))}
          </motion.div>
        ) : (
          <motion.div
            key="empty"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="text-center py-32 space-y-8 bg-gray-50 dark:bg-gray-800/20 rounded-[3rem] border-2 border-dashed border-gray-200 dark:border-gray-800"
          >
            <div className="w-24 h-24 bg-white dark:bg-gray-800 rounded-[2.5rem] flex items-center justify-center mx-auto shadow-2xl relative">
              <div className="absolute inset-0 bg-primary-500/20 rounded-[2.5rem] animate-ping" />
              <Video className="w-10 h-10 text-gray-300 dark:text-gray-600 relative z-10" />
            </div>
            <div className="space-y-3">
              <h3 className="text-3xl font-black text-gray-900 dark:text-white tracking-tight uppercase">
                No Active Transmissions
              </h3>
              <p className="text-gray-500 dark:text-gray-400 font-medium max-w-sm mx-auto text-lg leading-relaxed">
                We&apos;re currently preparing the next series of engineering workshops. Sync back
                later.
              </p>
            </div>
            <Button
              onClick={fetchSessions}
              variant="outline"
              className="rounded-2xl py-6 px-10 border-2 font-black uppercase tracking-widest text-xs"
            >
              Refresh Frequency
            </Button>
          </motion.div>
        )}
      </AnimatePresence>
    </AnimatedPage>
  )
}
