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
  AlertTriangle,
} from 'lucide-react'
import { SEO } from '../components/SEO'
import { Button } from '../components/ui/Button'
import { Card } from '../components/ui/Card'
import { Skeleton } from '../components/ui/Skeleton'
import { useQuery } from '@tanstack/react-query'
import { liveClassService } from '../services/liveClassService'
import { aiTutorService } from '../services/aiTutorService'
import { useStore } from '../stores/useStore'
import { useWebRTC } from '../hooks/useWebRTC'

// Simple helper component to render a MediaStream into a video element
function VideoStream({
  stream,
  isMuted = false,
  className = '',
}: {
  stream: MediaStream
  isMuted?: boolean
  className?: string
}) {
  const videoRef = useRef<HTMLVideoElement>(null)

  useEffect(() => {
    if (videoRef.current && stream) {
      videoRef.current.srcObject = stream
    }
  }, [stream])

  return (
    <video
      ref={videoRef}
      autoPlay
      playsInline
      muted={isMuted}
      className={`object-cover w-full h-full ${className}`}
    />
  )
}

export default function LiveClassPage() {
  const [isInClass, setIsInClass] = useState(false)
  const [isHandRaised, setIsHandRaised] = useState(false)
  const [activeTab, setActiveTab] = useState<'upcoming' | 'live' | 'my'>('upcoming')
  const addToast = useStore(state => state.addToast)

  const {
    data: classes = [],
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: ['liveSessions', activeTab],
    queryFn: async () => {
      let res
      if (activeTab === 'live') {
        res = await liveClassService.getLiveSessions()
      } else if (activeTab === 'my') {
        res = await liveClassService.getMySessions()
      } else {
        res = await liveClassService.getUpcomingSessions()
      }
      return res.data || []
    },
    staleTime: 60 * 1000,
  })

  const { connect, disconnect, on, emit, joinRoom } = useWebSocket()
  const auth = useStore(state => state.auth)

  const [messages, setMessages] = useState<
    { id: string; sender: string; content: string; timestamp: string }[]
  >([])
  const [chatInput, setChatInput] = useState('')
  const [isAITyping, setIsAITyping] = useState(false)
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null)

  const { localStream, remoteStreams, isAudioEnabled, isVideoEnabled, toggleAudio, toggleVideo } =
    useWebRTC(activeSessionId)

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
      } catch {
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

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!chatInput.trim() || !activeSessionId) return

    const userInput = chatInput.trim()
    emit('send-message', { roomId: activeSessionId, message: userInput })

    // Optimistically add to UI
    setMessages(prev => [
      ...prev,
      {
        id: Math.random().toString(),
        sender: auth.user?.username ?? 'You',
        content: userInput,
        timestamp: new Date().toISOString(),
      },
    ])

    setChatInput('')

    // Intercept @ai command
    if (userInput.toLowerCase().startsWith('@ai ')) {
      const aiPrompt = userInput.slice(4).trim()
      if (aiPrompt) {
        setIsAITyping(true)
        try {
          // Find the active session to pass context if needed
          const currentSession = classes.find(c => c.id === activeSessionId)

          const response = await aiTutorService.sendMessage({
            message: aiPrompt,
            context: { topic: currentSession?.title || 'Live Class' },
          })

          if (response.status === 'success') {
            setMessages(prev => [
              ...prev,
              {
                id: Math.random().toString(),
                sender: '🤖 AI Mentor',
                content: response.data.message.content,
                timestamp: new Date().toISOString(),
              },
            ])
          } else {
            setMessages(prev => [
              ...prev,
              {
                id: Math.random().toString(),
                sender: '🤖 AI Mentor',
                content: 'Sorry, I encountered an error processing your request.',
                timestamp: new Date().toISOString(),
              },
            ])
          }
        } catch (error) {
          setMessages(prev => [
            ...prev,
            {
              id: Math.random().toString(),
              sender: '🤖 AI Mentor',
              content: 'Failed to connect to the intelligence engine.',
              timestamp: new Date().toISOString(),
            },
          ])
        } finally {
          setIsAITyping(false)
        }
      }
    }
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

        <div className="flex items-center justify-between bg-white dark:bg-gray-900 p-4 rounded-[2rem] shadow-sm border border-gray-100 dark:border-gray-800">
          <div className="flex items-center gap-4 pl-2">
            <div className="flex items-center gap-2 bg-red-50 dark:bg-red-900/10 px-4 py-2.5 rounded-xl border border-red-100 dark:border-red-900/30">
              <div className="w-2.5 h-2.5 bg-red-500 rounded-full animate-ping" />
              <span className="text-xs font-black text-red-600 uppercase tracking-widest">
                Live Environment
              </span>
            </div>
            <h1 className="text-2xl font-black tracking-tight text-gray-900 dark:text-white truncate max-w-[200px] sm:max-w-md uppercase">
              System Design Workshop
            </h1>
          </div>
          <Button
            variant="outline"
            onClick={leaveClass}
            className="rounded-xl border-2 font-black tracking-widest uppercase text-[10px] px-6 text-red-500 border-red-200 hover:bg-red-50 dark:border-red-900/50 dark:hover:bg-red-900/20 py-4"
          >
            Terminate Session
          </Button>
        </div>

        <div className="flex-1 flex gap-6 overflow-hidden">
          {/* Main Video Area */}
          <Card className="flex-1 flex flex-col overflow-hidden rounded-[2.5rem] border-none shadow-2xl bg-black relative">
            <div className="flex-1 relative flex items-center justify-center overflow-hidden">
              <div className="absolute inset-0 bg-[url('/img/grid.svg')] opacity-10" />

              {/* Remote Streams Grid */}
              <div className="absolute inset-0 p-4 z-10 flex flex-wrap items-center justify-center gap-4">
                {Array.from(remoteStreams.entries()).map(([id, stream]) => (
                  <div
                    key={id}
                    className="relative w-full h-full max-w-4xl max-h-full bg-gray-900 rounded-[2rem] overflow-hidden shadow-2xl border border-white/10"
                  >
                    <VideoStream stream={stream} />
                    <span className="absolute bottom-4 left-5 bg-black/50 px-3 py-1 rounded-lg text-[10px] font-black text-white/90 uppercase tracking-widest backdrop-blur-md">
                      Peer {id.slice(0, 4)}
                    </span>
                  </div>
                ))}

                {remoteStreams.size === 0 && (
                  <div className="text-center space-y-6 relative">
                    <motion.div
                      animate={{ y: [0, -10, 0] }}
                      transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}
                      className="w-32 h-32 bg-white/5 rounded-[2.5rem] flex items-center justify-center mx-auto backdrop-blur-xl border border-white/10 shadow-2xl"
                    >
                      <Video className="w-14 h-14 text-white/40" />
                    </motion.div>
                    <div className="space-y-4">
                      <p className="text-white/80 font-black text-2xl tracking-tighter uppercase">
                        Waiting for Peers...
                      </p>
                      <div className="flex flex-wrap items-center justify-center gap-4">
                        <span className="flex items-center gap-2 text-[10px] font-black text-emerald-400 uppercase tracking-widest bg-emerald-400/10 px-4 py-2 rounded-xl border border-emerald-400/20">
                          <Wifi className="w-3.5 h-3.5" /> Secure Connection
                        </span>
                        <span className="flex items-center gap-2 text-[10px] font-black text-indigo-400 uppercase tracking-widest bg-indigo-400/10 px-4 py-2 rounded-xl border border-indigo-400/20">
                          <Shield className="w-3.5 h-3.5" /> End-to-End Encrypted
                        </span>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Picture in Picture Local Stream */}
              {localStream && isVideoEnabled && (
                <div className="absolute bottom-8 right-8 z-20 flex gap-4 hidden lg:flex">
                  <motion.div
                    whileHover={{ scale: 1.05 }}
                    className="w-56 h-36 bg-gray-900 backdrop-blur-md rounded-[1.5rem] border-2 border-white/20 flex items-center justify-center shadow-2xl relative overflow-hidden"
                  >
                    <VideoStream
                      stream={localStream}
                      isMuted={true}
                      className="transform -scale-x-100"
                    />
                    <span className="absolute bottom-2 left-3 bg-black/60 px-2 py-1 rounded text-[10px] font-black text-white/90 uppercase tracking-widest">
                      You
                    </span>
                  </motion.div>
                </div>
              )}
            </div>

            <div className="p-6 bg-gray-900/50 backdrop-blur-2xl border-t border-white/5 relative z-20">
              <div className="flex flex-col sm:flex-row items-center justify-between gap-4 sm:gap-6">
                <div className="flex items-center gap-3 sm:gap-4 flex-wrap justify-center">
                  {[
                    {
                      icon: isAudioEnabled ? Mic : MicOff,
                      active: isAudioEnabled,
                      onClick: toggleAudio,
                      label: isAudioEnabled ? 'Mute microphone' : 'Unmute microphone',
                    },
                    {
                      icon: isVideoEnabled ? Video : VideoOff,
                      active: isVideoEnabled,
                      onClick: toggleVideo,
                      label: isVideoEnabled ? 'Turn off camera' : 'Turn on camera',
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
                      key={idx}
                      whileHover={{ y: -4 }}
                      whileTap={{ scale: 0.9 }}
                      onClick={ctrl.onClick}
                      aria-label={ctrl.label}
                      className={`w-16 h-16 rounded-[1.25rem] flex items-center justify-center transition-all shadow-lg ${ctrl.active ? 'bg-primary-600 text-white shadow-primary-500/30' : 'bg-white/10 text-white/60 hover:bg-white/20 border border-white/10'}`}
                    >
                      <ctrl.icon className="w-6 h-6" />
                    </motion.button>
                  ))}
                </div>

                <div className="flex items-center gap-6">
                  <div className="hidden sm:flex flex-col items-end mr-4">
                    <p className="text-white font-black text-xl tabular-nums tracking-tighter">
                      {remoteStreams.size + 1}
                    </p>
                    <p className="text-[10px] text-white/40 font-black uppercase tracking-widest mt-1">
                      Active Nodes
                    </p>
                  </div>
                  <Button
                    variant="outline"
                    className="hidden lg:flex h-16 px-8 rounded-[1.25rem] border-2 border-white/10 bg-white/5 text-white hover:bg-white/10 font-black uppercase tracking-widest text-[10px] items-center gap-3"
                  >
                    <Monitor className="w-5 h-5" /> Share Screen
                  </Button>
                </div>
              </div>
            </div>
          </Card>

          {/* Real-time Chat Sidebar */}
          <Card className="hidden md:flex w-96 flex-col overflow-hidden rounded-[2.5rem] bg-white dark:bg-gray-900 border-none shadow-2xl">
            <div className="p-6 border-b border-gray-100 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-800/20 flex items-center justify-between">
              <div>
                <h3 className="font-black text-[10px] uppercase tracking-widest text-gray-900 dark:text-white flex items-center gap-3">
                  <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse shadow-sm shadow-emerald-500/50" />
                  Live Chat Protocol
                </h3>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-6 space-y-6 relative">
              <div className="absolute inset-0 bg-[url('/img/grid.svg')] bg-center opacity-5 dark:opacity-10 pointer-events-none mix-blend-overlay" />
              {messages.map(msg => (
                <div
                  key={msg.id}
                  className={`flex flex-col relative z-10 ${msg.sender === (auth.user?.username ?? 'You') ? 'items-end' : 'items-start'}`}
                >
                  <div className="flex items-baseline gap-2 mb-2">
                    <span
                      className={`text-[10px] font-black uppercase tracking-widest ${msg.sender === '🤖 AI Mentor' ? 'text-primary-500' : 'text-gray-900 dark:text-gray-300'}`}
                    >
                      {msg.sender}
                    </span>
                    <span className="text-[9px] text-gray-400 font-bold uppercase tracking-widest">
                      {new Date(msg.timestamp).toLocaleTimeString([], {
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </span>
                  </div>
                  <div
                    className={`px-5 py-4 rounded-[1.25rem] text-sm font-medium leading-relaxed ${
                      msg.sender === 'System'
                        ? 'bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400 font-bold w-full text-center text-[10px] uppercase tracking-widest rounded-xl border border-gray-200 dark:border-gray-700'
                        : msg.sender === (auth.user?.username ?? 'You')
                          ? 'bg-primary-600 text-white rounded-tr-none shadow-xl shadow-primary-500/20'
                          : msg.sender === '🤖 AI Mentor'
                            ? 'bg-gradient-to-br from-primary-500/10 to-purple-500/10 dark:from-primary-500/20 dark:to-purple-500/20 text-gray-900 dark:text-white rounded-tl-none border border-primary-500/30 shadow-lg shadow-primary-500/10'
                            : 'bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-white rounded-tl-none border border-gray-100 dark:border-gray-700'
                    }`}
                  >
                    {msg.content}
                  </div>
                </div>
              ))}
              {isAITyping && (
                <div className="flex flex-col relative z-10 items-start">
                  <div className="flex items-baseline gap-2 mb-2">
                    <span className="text-[10px] font-black uppercase tracking-widest text-primary-500">
                      🤖 AI Mentor
                    </span>
                  </div>
                  <div className="px-5 py-4 rounded-[1.25rem] rounded-tl-none bg-gradient-to-br from-primary-500/10 to-purple-500/10 border border-primary-500/30 flex items-center gap-2">
                    <span className="w-2 h-2 bg-primary-500 rounded-full animate-bounce" />
                    <span className="w-2 h-2 bg-primary-500 rounded-full animate-bounce [animation-delay:0.2s]" />
                    <span className="w-2 h-2 bg-primary-500 rounded-full animate-bounce [animation-delay:0.4s]" />
                  </div>
                </div>
              )}
              <div ref={chatEndRef} />
            </div>

            <div className="p-5 bg-white dark:bg-gray-900 border-t border-gray-100 dark:border-gray-800 relative z-20">
              <form onSubmit={handleSendMessage} className="flex gap-3">
                <input
                  type="text"
                  value={chatInput}
                  onChange={e => setChatInput(e.target.value)}
                  placeholder="Transmit message..."
                  className="flex-1 bg-gray-50 dark:bg-gray-800 border-2 border-transparent focus:border-primary-500/30 rounded-2xl px-5 text-sm font-medium outline-none transition-all dark:text-white placeholder:text-gray-400"
                />
                <Button
                  type="submit"
                  disabled={!chatInput.trim()}
                  className="rounded-2xl px-6 font-black uppercase tracking-widest text-[10px] shadow-lg shadow-primary-500/20"
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
    <AnimatedPage className="space-y-10 pb-12 pt-4">
      <SEO title="Live Learning" description="Enterprise-grade live workshops" />

      <div className="max-w-7xl mx-auto space-y-10">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 bg-white dark:bg-gray-900 p-8 rounded-[2.5rem] shadow-sm border border-gray-100 dark:border-gray-800">
          <div className="space-y-4">
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 rounded-[1.25rem] bg-primary-600 flex items-center justify-center shadow-xl shadow-primary-500/30 border border-primary-500">
                <Video className="w-8 h-8 text-white" />
              </div>
              <h1 className="text-4xl font-black tracking-tight text-gray-900 dark:text-white uppercase">
                Live Workshops
              </h1>
            </div>
            <p className="text-gray-500 dark:text-gray-400 font-medium text-lg max-w-2xl">
              Interact with leading engineering mentors in real-time sessions.
            </p>
          </div>

          <div className="flex p-2 bg-gray-50 dark:bg-gray-800 rounded-[1.5rem] shrink-0 border border-gray-100 dark:border-gray-700">
            {[
              { id: 'upcoming', label: 'Upcoming' },
              { id: 'live', label: 'Live Now' },
              { id: 'my', label: 'Enrolled' },
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`px-8 py-4 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === tab.id ? 'bg-white dark:bg-gray-700 text-primary-600 shadow-md' : 'text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700/50'}`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        <AnimatePresence mode="wait">
          {error ? (
            <motion.div
              key="error"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            >
              <Card className="p-16 text-center border-none shadow-xl rounded-[2.5rem] bg-white dark:bg-gray-900">
                <div className="w-24 h-24 rounded-[1.5rem] bg-rose-50 dark:bg-rose-900/20 flex items-center justify-center mx-auto mb-6 shadow-inner">
                  <AlertTriangle className="w-10 h-10 text-rose-500" />
                </div>
                <h2 className="text-2xl font-black text-gray-900 dark:text-white mb-2 uppercase tracking-tight">
                  Connection Severed
                </h2>
                <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-8">
                  Failed to download session protocols.
                </p>
                <Button
                  onClick={() => refetch()}
                  className="px-8 py-4 rounded-xl font-black uppercase tracking-widest text-[10px]"
                >
                  Retry Connection
                </Button>
              </Card>
            </motion.div>
          ) : isLoading ? (
            <motion.div
              key="loading"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8"
            >
              {[1, 2, 3].map(i => (
                <Card
                  key={i}
                  className="h-[500px] rounded-[2.5rem] border-none shadow-md bg-white dark:bg-gray-900 p-0 overflow-hidden"
                >
                  <Skeleton className="h-[200px] w-full" />
                  <div className="p-8 space-y-6">
                    <Skeleton className="h-4 w-32" />
                    <Skeleton className="h-8 w-full" />
                    <Skeleton className="h-8 w-3/4" />
                    <div className="flex gap-4 mt-8">
                      <Skeleton className="h-12 flex-1 rounded-xl" />
                      <Skeleton className="h-12 flex-1 rounded-xl" />
                    </div>
                  </div>
                </Card>
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
                  whileHover={{ y: -8 }}
                >
                  <Card className="h-full overflow-hidden rounded-[2.5rem] border-none shadow-xl hover:shadow-2xl transition-all duration-500 group bg-white dark:bg-gray-900 flex flex-col">
                    <div className="aspect-[4/3] bg-gradient-to-br from-indigo-500 via-purple-600 to-pink-500 flex items-center justify-center relative overflow-hidden shrink-0">
                      <div className="absolute inset-0 bg-[url('/img/grid.svg')] opacity-10 mix-blend-overlay pointer-events-none" />
                      <motion.div
                        whileHover={{ scale: 1.1, rotate: 5 }}
                        transition={{ type: 'spring', stiffness: 300 }}
                      >
                        <Video className="w-24 h-24 text-white/30 drop-shadow-2xl" />
                      </motion.div>
                      <div className="absolute inset-0 bg-black/20 group-hover:bg-transparent transition-all duration-500" />

                      {cls.status === 'live' && (
                        <div className="absolute top-6 left-6 bg-red-500 text-white px-5 py-2 rounded-xl text-[9px] font-black uppercase tracking-[0.2em] flex items-center gap-2 shadow-2xl border border-red-400 backdrop-blur-md">
                          <div className="w-2 h-2 bg-white rounded-full animate-ping" />
                          Live Now
                        </div>
                      )}

                      <div className="absolute top-6 right-6">
                        <div className="w-12 h-12 rounded-xl bg-white/20 backdrop-blur-md flex items-center justify-center text-white border border-white/20 group-hover:bg-white group-hover:text-primary-600 transition-all shadow-xl">
                          <MoreVertical className="w-6 h-6" />
                        </div>
                      </div>
                    </div>

                    <div className="p-8 space-y-6 flex-1 flex flex-col">
                      <div className="space-y-4">
                        <div className="flex items-center justify-between">
                          <span className="text-[10px] font-black text-primary-500 uppercase tracking-[0.2em] bg-primary-50 dark:bg-primary-900/20 px-3 py-1.5 rounded-lg">
                            WORKSHOP
                          </span>
                          <div className="flex items-center gap-2 text-[9px] font-black text-gray-400 uppercase tracking-widest bg-gray-50 dark:bg-gray-800 px-3 py-1.5 rounded-lg">
                            <Wifi className="w-3 h-3" /> HQ STREAM
                          </div>
                        </div>
                        <h3 className="text-2xl font-black text-gray-900 dark:text-white leading-tight tracking-tight group-hover:text-primary-600 transition-colors">
                          {cls.title}
                        </h3>
                        <div className="flex items-center gap-4 bg-gray-50 dark:bg-gray-800/50 p-4 rounded-[1.5rem] border border-gray-100 dark:border-gray-800">
                          <div className="w-10 h-10 rounded-xl bg-white dark:bg-gray-700 flex items-center justify-center shadow-sm">
                            <Shield className="w-5 h-5 text-gray-400" />
                          </div>
                          <p className="text-sm font-black text-gray-700 dark:text-gray-300 uppercase tracking-tight">
                            {cls.instructorName}
                          </p>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-4 py-6 border-y border-gray-100 dark:border-gray-800 mt-auto">
                        <div className="space-y-2">
                          <div className="flex items-center gap-2 text-primary-500">
                            <Calendar className="w-4 h-4" />
                            <span className="text-[10px] font-black uppercase tracking-widest">
                              {formatTime(cls.scheduledAt)}
                            </span>
                          </div>
                          <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest pl-6">
                            Scheduled
                          </p>
                        </div>
                        <div className="space-y-2">
                          <div className="flex items-center gap-2 text-indigo-500">
                            <Clock className="w-4 h-4" />
                            <span className="text-[10px] font-black uppercase tracking-widest">
                              {cls.durationMinutes} MIN
                            </span>
                          </div>
                          <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest pl-6">
                            Duration
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center justify-between pt-2 gap-4">
                        <div className="flex items-center gap-3 bg-gray-50 dark:bg-gray-800/80 px-5 py-4 rounded-[1.25rem] border border-gray-100 dark:border-gray-800">
                          <Users className="w-5 h-5 text-gray-400" />
                          <span className="text-[10px] font-black uppercase tracking-widest tabular-nums text-gray-600 dark:text-gray-300">
                            {cls.currentParticipants}{' '}
                            <span className="text-gray-400">/ {cls.maxParticipants}</span>
                          </span>
                        </div>
                        <Button
                          onClick={() => joinClass(cls.id)}
                          className={`flex-1 py-5 rounded-[1.25rem] font-black uppercase tracking-widest text-[10px] flex items-center justify-center gap-3 shadow-xl transition-all ${cls.status === 'live' ? 'bg-primary-600 text-white shadow-primary-500/30 hover:bg-primary-700' : 'bg-gray-900 text-white hover:bg-black dark:bg-white dark:text-gray-900 dark:hover:bg-gray-100 shadow-gray-900/20'}`}
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
                        </Button>
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
              className="text-center py-32 space-y-8 bg-white dark:bg-gray-900 rounded-[3rem] border-none shadow-xl max-w-4xl mx-auto"
            >
              <div className="w-32 h-32 bg-gray-50 dark:bg-gray-800 rounded-[2.5rem] flex items-center justify-center mx-auto shadow-inner relative border border-gray-100 dark:border-gray-700">
                <div className="absolute inset-0 bg-primary-500/10 rounded-[2.5rem] animate-ping" />
                <Video className="w-12 h-12 text-gray-400 dark:text-gray-500 relative z-10" />
              </div>
              <div className="space-y-4">
                <h3 className="text-3xl font-black text-gray-900 dark:text-white tracking-tight uppercase">
                  No Active Transmissions
                </h3>
                <p className="text-gray-500 dark:text-gray-400 font-bold max-w-sm mx-auto text-[10px] tracking-widest uppercase leading-relaxed">
                  We&apos;re currently preparing the next series of engineering workshops. Sync back
                  later.
                </p>
              </div>
              <Button
                onClick={() => refetch()}
                variant="outline"
                className="rounded-xl py-6 px-10 border-2 font-black uppercase tracking-widest text-[10px] hover:bg-gray-50"
              >
                Refresh Frequency
              </Button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </AnimatedPage>
  )
}
