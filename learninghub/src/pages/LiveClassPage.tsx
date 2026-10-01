import { useState, useRef, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import {
  Video,
  Clock,
  Users,
  Calendar,
  Play,
  ArrowRight,
  Mic,
  MicOff,
  VideoOff,
  MonitorUp,
  Hand,
  Search,
  PenTool,
  RotateCcw,
  Trash2,
  Download,
  Code2,
  LogOut,
  Send,
  ThumbsUp,
  Radio,
} from 'lucide-react'
import { useQuery } from '@tanstack/react-query'
import { liveClassService } from '../services/liveClassService'
import { SEO } from '../components/SEO'
import { Card } from '../components/ui/Card'
import { Badge } from '../components/ui/Badge'
import { Button } from '../components/ui/Button'
import { Skeleton } from '../components/ui/Skeleton'
import { ErrorState } from '../components/ui/ErrorState'
import { EmptyState } from '../components/ui/EmptyState'
import AnimatedPage from '../components/AnimatedPage'
import { useStore } from '../stores/useStore'

// ─── Interactive Whiteboard Component ─────────────────────────────────
function WhiteboardCanvas() {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [isDrawing, setIsDrawing] = useState(false)
  const [brushColor, setBrushColor] = useState('#6366f1') // Indigo
  const [brushSize, setBrushSize] = useState(4)
  const [isEraser, setIsEraser] = useState(false)
  const [undoStack, setUndoStack] = useState<ImageData[]>([])

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    // Set canvas dimensions
    canvas.width = canvas.parentElement?.clientWidth ?? 800
    canvas.height = 500

    ctx.fillStyle = '#0f172a'
    ctx.fillRect(0, 0, canvas.width, canvas.height)
    ctx.lineCap = 'round'
    ctx.lineJoin = 'round'
  }, [])

  const saveState = () => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    try {
      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height)
      setUndoStack(prev => [...prev.slice(-15), imageData])
    } catch {}
  }

  const startDrawing = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    saveState()
    const rect = canvas.getBoundingClientRect()
    ctx.beginPath()
    ctx.moveTo(e.clientX - rect.left, e.clientY - rect.top)
    setIsDrawing(true)
  }

  const draw = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDrawing) return
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const rect = canvas.getBoundingClientRect()
    ctx.strokeStyle = isEraser ? '#0f172a' : brushColor
    ctx.lineWidth = isEraser ? brushSize * 4 : brushSize
    ctx.lineTo(e.clientX - rect.left, e.clientY - rect.top)
    ctx.stroke()
  }

  const handleTouchStart = (e: React.TouchEvent<HTMLCanvasElement>) => {
    if (e.touches.length !== 1) return
    const touch = e.touches[0]
    const canvas = canvasRef.current
    if (!canvas || !touch) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    saveState()
    const rect = canvas.getBoundingClientRect()
    ctx.beginPath()
    ctx.moveTo(touch.clientX - rect.left, touch.clientY - rect.top)
    setIsDrawing(true)
  }

  const handleTouchMove = (e: React.TouchEvent<HTMLCanvasElement>) => {
    if (!isDrawing || e.touches.length !== 1) return
    const touch = e.touches[0]
    const canvas = canvasRef.current
    if (!canvas || !touch) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const rect = canvas.getBoundingClientRect()
    ctx.strokeStyle = isEraser ? '#0f172a' : brushColor
    ctx.lineWidth = isEraser ? brushSize * 4 : brushSize
    ctx.lineTo(touch.clientX - rect.left, touch.clientY - rect.top)
    ctx.stroke()
  }

  const stopDrawing = () => {
    setIsDrawing(false)
  }

  const handleUndo = () => {
    if (undoStack.length === 0) return
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    const last = undoStack[undoStack.length - 1]
    if (last) {
      ctx.putImageData(last, 0, 0)
      setUndoStack(prev => prev.slice(0, -1))
    }
  }

  const clearCanvas = () => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    saveState()
    ctx.fillStyle = '#0f172a'
    ctx.fillRect(0, 0, canvas.width, canvas.height)
  }

  const downloadSnapshot = () => {
    const canvas = canvasRef.current
    if (!canvas) return
    const dataUrl = canvas.toDataURL('image/png')
    const a = document.createElement('a')
    a.href = dataUrl
    a.download = `whiteboard-${Date.now()}.png`
    a.click()
  }

  const colors = ['#6366f1', '#10b981', '#f43f5e', '#f59e0b', '#0ea5e9', '#ffffff']

  return (
    <div className="flex flex-col h-full space-y-3">
      {/* Whiteboard Controls */}
      <div className="flex flex-wrap items-center justify-between gap-3 p-3 bg-slate-900 border border-slate-800 rounded-2xl">
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5 p-1 bg-slate-800 rounded-xl">
            {colors.map(c => (
              <button
                key={c}
                onClick={() => {
                  setBrushColor(c)
                  setIsEraser(false)
                }}
                className={`w-6 h-6 rounded-full transition-transform ${
                  brushColor === c && !isEraser ? 'scale-125 ring-2 ring-white' : ''
                }`}
                style={{ backgroundColor: c }}
                aria-label={`Select color ${c}`}
              />
            ))}
          </div>

          <div className="h-6 w-px bg-slate-800 mx-1" />

          {/* Stroke sizes */}
          <div className="flex items-center gap-1 bg-slate-800 p-1 rounded-xl">
            {[2, 4, 8].map(size => (
              <button
                key={size}
                onClick={() => setBrushSize(size)}
                className={`px-2.5 py-1 text-[10px] font-black rounded-lg ${
                  brushSize === size
                    ? 'bg-indigo-600 text-white'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                {size}px
              </button>
            ))}
          </div>

          <Button
            size="sm"
            variant="outline"
            onClick={() => setIsEraser(!isEraser)}
            className={`rounded-xl text-xs gap-1.5 ${
              isEraser
                ? 'bg-rose-500 text-white border-rose-500'
                : 'text-slate-300 border-slate-700'
            }`}
          >
            <RotateCcw className="w-3.5 h-3.5" /> Eraser
          </Button>

          <Button
            size="sm"
            variant="outline"
            disabled={undoStack.length === 0}
            onClick={handleUndo}
            className="rounded-xl text-xs gap-1.5 text-slate-300 border-slate-700 disabled:opacity-40"
            title="Undo last stroke"
          >
            <RotateCcw className="w-3.5 h-3.5" /> Undo
          </Button>
        </div>

        <div className="flex items-center gap-2">
          <Button
            size="sm"
            variant="outline"
            onClick={clearCanvas}
            className="rounded-xl text-xs gap-1.5 text-slate-300 border-slate-700 hover:text-rose-400"
          >
            <Trash2 className="w-3.5 h-3.5" /> Clear
          </Button>
          <Button
            size="sm"
            onClick={downloadSnapshot}
            className="rounded-xl text-xs gap-1.5 bg-indigo-600 hover:bg-indigo-500 text-white font-bold"
          >
            <Download className="w-3.5 h-3.5" /> Export
          </Button>
        </div>
      </div>

      {/* Canvas */}
      <div className="flex-1 bg-slate-950 rounded-2xl overflow-hidden border border-slate-800 shadow-inner relative flex items-center justify-center min-h-[400px]">
        <canvas
          ref={canvasRef}
          onMouseDown={startDrawing}
          onMouseMove={draw}
          onMouseUp={stopDrawing}
          onMouseLeave={stopDrawing}
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={stopDrawing}
          className="cursor-crosshair w-full h-full touch-none"
        />
      </div>
    </div>
  )
}

// ─── Live Class Room Studio (When ID is present) ──────────────────────
function LiveClassRoomStudio({ sessionId }: { sessionId: string }) {
  const navigate = useNavigate()
  const addToast = useStore(state => state.addToast)

  const [activeTab, setActiveTab] = useState<'stage' | 'whiteboard' | 'code'>('stage')
  const [sidebarTab, setSidebarTab] = useState<'chat' | 'qa' | 'people'>('chat')
  const [isMicOn, setIsMicOn] = useState(false)
  const [isVideoOn, setIsVideoOn] = useState(true)
  const [isScreenSharing, setIsScreenSharing] = useState(false)
  const [isHandRaised, setIsHandRaised] = useState(false)

  const [chatMessages, setChatMessages] = useState<
    Array<{ id: string; sender: string; text: string; time: string; isInstructor?: boolean }>
  >([
    {
      id: 'msg_1',
      sender: 'Dr. Sarah Chen',
      text: 'Welcome everyone! Today we are covering Graph Theory & Dijkstra algorithm implementation.',
      time: '12:00 PM',
      isInstructor: true,
    },
    {
      id: 'msg_2',
      sender: 'Alex M.',
      text: 'Excited for this session! Audio is crystal clear.',
      time: '12:01 PM',
    },
  ])
  const [inputMsg, setInputMsg] = useState('')

  const [questions, setQuestions] = useState([
    {
      id: 'q_1',
      author: 'Priya K.',
      text: 'How does Priority Queue improve Dijkstra time complexity from O(V^2) to O((V+E) log V)?',
      upvotes: 6,
      answered: false,
    },
    {
      id: 'q_2',
      author: 'Liam T.',
      text: 'Can Dijkstra handle negative weight cycles?',
      upvotes: 4,
      answered: true,
    },
  ])

  const { data: sessionRes, isLoading } = useQuery({
    queryKey: ['live-session', sessionId],
    queryFn: () => liveClassService.getSession(sessionId),
  })

  const session = sessionRes?.data ?? {
    id: sessionId,
    title: 'Advanced Data Structures & Algorithms Masterclass',
    instructorName: 'Dr. Sarah Chen',
    durationMinutes: 90,
    status: 'live' as const,
    maxParticipants: 250,
    currentParticipants: 42,
    scheduledAt: new Date().toISOString(),
  }

  const handleSendMessage = () => {
    if (!inputMsg.trim()) return
    setChatMessages(prev => [
      ...prev,
      {
        id: `msg_${Date.now()}`,
        sender: 'You',
        text: inputMsg.trim(),
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      },
    ])
    setInputMsg('')
  }

  const handleToggleHand = () => {
    const next = !isHandRaised
    setIsHandRaised(next)
    addToast({
      message: next ? 'Hand raised! The instructor has been notified.' : 'Hand lowered.',
      type: 'info',
    })
  }

  const handleUpvoteQuestion = (qId: string) => {
    setQuestions(prev => prev.map(q => (q.id === qId ? { ...q, upvotes: q.upvotes + 1 } : q)))
  }

  if (isLoading) {
    return (
      <div className="h-screen w-full flex items-center justify-center bg-slate-950 text-white">
        <Skeleton className="h-40 w-80 rounded-3xl bg-slate-900" />
      </div>
    )
  }

  return (
    <div className="h-[calc(100vh-4rem)] flex flex-col bg-slate-950 text-white overflow-hidden">
      <SEO title={`${session.title} - Live Studio`} />

      {/* Top Header Bar */}
      <header className="h-16 px-6 bg-slate-900/90 backdrop-blur-md border-b border-slate-800 flex items-center justify-between shrink-0 z-20">
        <div className="flex items-center gap-3">
          <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-rose-500/20 text-rose-400 border border-rose-500/30 text-[10px] font-black uppercase tracking-widest animate-pulse">
            <Radio className="w-3 h-3 text-rose-500" /> Live Stream
          </span>
          <div>
            <h2 className="text-sm font-bold text-slate-100 max-w-md truncate leading-tight">
              {session.title}
            </h2>
            <p className="text-[11px] text-slate-400 font-medium">
              Instructor:{' '}
              <span className="text-indigo-400 font-bold">{session.instructorName}</span>
            </p>
          </div>
        </div>

        {/* View Switcher Center Tabs */}
        <div className="hidden md:flex items-center gap-1 bg-slate-950 p-1 rounded-xl border border-slate-800">
          <button
            onClick={() => setActiveTab('stage')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
              activeTab === 'stage'
                ? 'bg-indigo-600 text-white shadow-md'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Video className="w-3.5 h-3.5" /> Stage
          </button>
          <button
            onClick={() => setActiveTab('whiteboard')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
              activeTab === 'whiteboard'
                ? 'bg-indigo-600 text-white shadow-md'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <PenTool className="w-3.5 h-3.5" /> Whiteboard
          </button>
          <button
            onClick={() => setActiveTab('code')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
              activeTab === 'code'
                ? 'bg-indigo-600 text-white shadow-md'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Code2 className="w-3.5 h-3.5" /> Live Code
          </button>
        </div>

        {/* Action Controls & Leave */}
        <div className="flex items-center gap-3">
          <div className="hidden sm:flex items-center gap-1.5 text-xs text-slate-400 font-bold bg-slate-800/60 px-3 py-1.5 rounded-xl border border-slate-700">
            <Users className="w-3.5 h-3.5 text-indigo-400" />
            <span className="tabular-nums font-black text-slate-200">
              {session.currentParticipants}
            </span>
          </div>

          <Button
            size="sm"
            variant="outline"
            onClick={() => navigate('/live-class')}
            className="rounded-xl text-xs gap-1.5 border-rose-500/30 text-rose-400 hover:bg-rose-500/10 font-bold"
          >
            <LogOut className="w-3.5 h-3.5" /> Exit Room
          </Button>
        </div>
      </header>

      {/* Main Studio Body */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left / Center Viewport Stage */}
        <div className="flex-1 flex flex-col p-4 overflow-hidden relative">
          <div className="flex-1 rounded-3xl overflow-hidden bg-slate-900 border border-slate-800 relative flex flex-col">
            {activeTab === 'stage' && (
              <div className="flex-1 flex flex-col justify-between p-6 relative bg-gradient-to-br from-slate-900 via-indigo-950/40 to-slate-950">
                {/* Main Presenter Video View */}
                <div className="flex-1 flex items-center justify-center relative rounded-2xl overflow-hidden bg-slate-950/80 border border-slate-800">
                  <div className="text-center space-y-3">
                    <div className="w-24 h-24 rounded-full bg-gradient-to-tr from-indigo-500 to-purple-600 flex items-center justify-center mx-auto shadow-2xl ring-4 ring-indigo-500/30">
                      <span className="text-3xl font-black text-white">SC</span>
                    </div>
                    <div>
                      <h4 className="text-base font-black text-slate-100">
                        {session.instructorName}
                      </h4>
                      <p className="text-xs text-indigo-400 font-bold mt-0.5">
                        Presenter &bull; Screen Active
                      </p>
                    </div>
                  </div>

                  {/* Audio Wave / Live indicator */}
                  <div className="absolute top-4 left-4 flex items-center gap-2 bg-slate-900/80 backdrop-blur-md px-3 py-1.5 rounded-xl border border-slate-800">
                    <div className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
                    <span className="text-xs font-bold text-slate-200">
                      1080p HD Audio &bull; 60fps
                    </span>
                  </div>
                </div>

                {/* Bottom Participant Grid Strip */}
                <div className="h-24 grid grid-cols-4 gap-3 mt-3">
                  {[
                    { name: 'Alex M.', role: 'Student', mic: false },
                    { name: 'Priya K.', role: 'Student', mic: true },
                    { name: 'Liam T.', role: 'Student', mic: false },
                    { name: 'You', role: 'Student', mic: isMicOn },
                  ].map(p => (
                    <div
                      key={p.name}
                      className="bg-slate-950/60 rounded-2xl border border-slate-800 p-2 flex items-center gap-3 relative overflow-hidden"
                    >
                      <div className="w-10 h-10 rounded-xl bg-indigo-600/30 flex items-center justify-center font-bold text-xs text-indigo-300">
                        {p.name.slice(0, 2).toUpperCase()}
                      </div>
                      <div className="truncate">
                        <p className="text-xs font-bold text-slate-200 truncate">{p.name}</p>
                        <p className="text-[10px] text-slate-500">{p.role}</p>
                      </div>
                      <div className="absolute top-2 right-2">
                        {p.mic ? (
                          <Mic className="w-3 h-3 text-emerald-400" />
                        ) : (
                          <MicOff className="w-3 h-3 text-slate-600" />
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {activeTab === 'whiteboard' && (
              <div className="flex-1 p-4">
                <WhiteboardCanvas />
              </div>
            )}

            {activeTab === 'code' && (
              <div className="flex-1 p-4 bg-slate-950 font-mono text-xs overflow-auto space-y-2">
                <div className="flex justify-between items-center pb-2 border-b border-slate-800 text-slate-400">
                  <span>dijkstra_shortest_path.py (Live Synced)</span>
                  <span className="px-2 py-0.5 rounded-full border border-slate-700 text-[10px] text-slate-300">
                    Python 3.11
                  </span>
                </div>
                <pre className="text-indigo-300 leading-relaxed">
                  {`import heapq

def dijkstra(graph, start_node):
    # Min-heap priority queue storing (distance, node)
    pq = [(0, start_node)]
    distances = {node: float('inf') for node in graph}
    distances[start_node] = 0
    visited = set()

    while pq:
        current_dist, current_node = heapq.heappop(pq)
        
        if current_node in visited:
            continue
        visited.add(current_node)

        for neighbor, weight in graph[current_node].items():
            distance = current_dist + weight
            if distance < distances[neighbor]:
                distances[neighbor] = distance
                heapq.heappush(pq, (distance, neighbor))

    return distances`}
                </pre>
              </div>
            )}
          </div>

          {/* Bottom Stream Floating Action Toolbar */}
          <div className="h-16 mt-3 flex items-center justify-center gap-3">
            <Button
              size="sm"
              onClick={() => setIsMicOn(!isMicOn)}
              className={`rounded-2xl w-12 h-12 p-0 flex items-center justify-center transition-all ${
                isMicOn
                  ? 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-lg shadow-emerald-600/30'
                  : 'bg-slate-800 hover:bg-slate-700 text-slate-300'
              }`}
            >
              {isMicOn ? <Mic className="w-5 h-5" /> : <MicOff className="w-5 h-5 text-rose-400" />}
            </Button>

            <Button
              size="sm"
              onClick={() => setIsVideoOn(!isVideoOn)}
              className={`rounded-2xl w-12 h-12 p-0 flex items-center justify-center transition-all ${
                isVideoOn
                  ? 'bg-indigo-600 hover:bg-indigo-500 text-white shadow-lg shadow-indigo-600/30'
                  : 'bg-slate-800 hover:bg-slate-700 text-slate-300'
              }`}
            >
              {isVideoOn ? (
                <Video className="w-5 h-5" />
              ) : (
                <VideoOff className="w-5 h-5 text-rose-400" />
              )}
            </Button>

            <Button
              size="sm"
              onClick={() => setIsScreenSharing(!isScreenSharing)}
              className={`rounded-2xl w-12 h-12 p-0 flex items-center justify-center transition-all ${
                isScreenSharing
                  ? 'bg-purple-600 hover:bg-purple-500 text-white shadow-lg shadow-purple-600/30'
                  : 'bg-slate-800 hover:bg-slate-700 text-slate-300'
              }`}
            >
              <MonitorUp className="w-5 h-5" />
            </Button>

            <Button
              size="sm"
              onClick={handleToggleHand}
              className={`rounded-2xl w-12 h-12 p-0 flex items-center justify-center transition-all ${
                isHandRaised
                  ? 'bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold shadow-lg shadow-amber-500/30 ring-2 ring-amber-300 animate-bounce'
                  : 'bg-slate-800 hover:bg-slate-700 text-slate-300'
              }`}
            >
              <Hand className="w-5 h-5" />
            </Button>
          </div>
        </div>

        {/* Right Interactive Sidebar (Chat, Q&A, Participants) */}
        <div className="w-80 border-l border-slate-800 bg-slate-900 flex flex-col shrink-0">
          {/* Sidebar Tabs */}
          <div className="flex border-b border-slate-800 p-2 gap-1 bg-slate-950">
            <button
              onClick={() => setSidebarTab('chat')}
              className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition-all ${
                sidebarTab === 'chat'
                  ? 'bg-slate-800 text-white'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Chat
            </button>
            <button
              onClick={() => setSidebarTab('qa')}
              className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition-all ${
                sidebarTab === 'qa'
                  ? 'bg-slate-800 text-white'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Q&A ({questions.length})
            </button>
            <button
              onClick={() => setSidebarTab('people')}
              className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition-all ${
                sidebarTab === 'people'
                  ? 'bg-slate-800 text-white'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              People
            </button>
          </div>

          {/* Chat Panel */}
          {sidebarTab === 'chat' && (
            <div className="flex-1 flex flex-col justify-between overflow-hidden">
              <div className="flex-1 p-4 space-y-3 overflow-y-auto">
                {chatMessages.map(msg => (
                  <div key={msg.id} className="space-y-1">
                    <div className="flex items-center justify-between text-[10px] text-slate-400">
                      <span
                        className={`font-bold ${msg.isInstructor ? 'text-indigo-400' : 'text-slate-300'}`}
                      >
                        {msg.sender} {msg.isInstructor && '• Instructor'}
                      </span>
                      <span>{msg.time}</span>
                    </div>
                    <div className="p-2.5 rounded-xl bg-slate-800/80 text-xs text-slate-200 leading-relaxed font-medium">
                      {msg.text}
                    </div>
                  </div>
                ))}
              </div>

              {/* Chat Input */}
              <div className="p-3 border-t border-slate-800 bg-slate-950 flex gap-2">
                <input
                  type="text"
                  value={inputMsg}
                  onChange={e => setInputMsg(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && handleSendMessage()}
                  placeholder="Send a message..."
                  className="flex-1 px-3 py-2 text-xs rounded-xl bg-slate-800 border border-slate-700 text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
                <Button
                  size="sm"
                  onClick={handleSendMessage}
                  className="rounded-xl px-3 bg-indigo-600 hover:bg-indigo-500"
                >
                  <Send className="w-3.5 h-3.5" />
                </Button>
              </div>
            </div>
          )}

          {/* Q&A Panel */}
          {sidebarTab === 'qa' && (
            <div className="flex-1 p-4 space-y-3 overflow-y-auto">
              {questions.map(q => (
                <div
                  key={q.id}
                  className="p-3 bg-slate-800 rounded-2xl border border-slate-700 space-y-2"
                >
                  <div className="flex justify-between items-start">
                    <span className="text-[10px] font-bold text-indigo-400">{q.author}</span>
                    {q.answered && (
                      <Badge className="bg-emerald-500/20 text-emerald-300 text-[9px]">
                        Answered
                      </Badge>
                    )}
                  </div>
                  <p className="text-xs text-slate-200 font-medium">{q.text}</p>
                  <button
                    onClick={() => handleUpvoteQuestion(q.id)}
                    className="flex items-center gap-1 text-[10px] font-bold text-slate-400 hover:text-indigo-300 transition-colors"
                  >
                    <ThumbsUp className="w-3 h-3" /> {q.upvotes} Upvotes
                  </button>
                </div>
              ))}
            </div>
          )}

          {/* People Panel */}
          {sidebarTab === 'people' && (
            <div className="flex-1 p-4 space-y-2 overflow-y-auto">
              <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2">
                Host & Instructor
              </p>
              <div className="flex items-center justify-between p-2.5 bg-slate-800/80 rounded-xl">
                <span className="text-xs font-bold text-indigo-300">{session.instructorName}</span>
                <Badge className="bg-indigo-500/20 text-indigo-300 text-[9px]">Host</Badge>
              </div>

              <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mt-4 mb-2">
                Students ({session.currentParticipants})
              </p>
              {['Alex M.', 'Priya K.', 'Liam T.', 'Elena R.', 'Marco S.', 'You'].map(name => (
                <div
                  key={name}
                  className="flex items-center justify-between p-2 text-xs text-slate-300 hover:bg-slate-800/50 rounded-lg"
                >
                  <span>{name}</span>
                  <span className="w-2 h-2 rounded-full bg-emerald-400" />
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

// ─── Default Session Catalog (When ID is absent) ──────────────────────
export default function LiveClassPage() {
  const { id } = useParams<{ id?: string }>()
  const navigate = useNavigate()
  const [filterTab, setFilterTab] = useState<'ALL' | 'LIVE' | 'UPCOMING'>('ALL')
  const [searchQuery, setSearchQuery] = useState('')

  const {
    data: sessions = [],
    isLoading,
    isError,
    error,
    refetch,
  } = useQuery({
    queryKey: ['live-sessions'],
    enabled: !id,
    queryFn: async () => {
      const response = await liveClassService.getAllSessions()
      const list = response?.data ?? []
      if (list.length === 0) {
        // High quality fallback sessions for immediate interactive exploration
        return [
          {
            id: 'session_dsa_live_1',
            title: 'Advanced Graph Algorithms & Dynamic Programming Studio',
            instructorName: 'Dr. Sarah Chen',
            scheduledAt: new Date().toISOString(),
            durationMinutes: 90,
            status: 'live' as const,
            maxParticipants: 300,
            currentParticipants: 84,
          },
          {
            id: 'session_sysdesign_2',
            title: 'System Design: Scalable Microservices & Kafka Pipelines',
            instructorName: 'Alex Rivera',
            scheduledAt: new Date(Date.now() + 3600 * 1000 * 4).toISOString(),
            durationMinutes: 60,
            status: 'upcoming' as const,
            maxParticipants: 500,
            currentParticipants: 215,
          },
          {
            id: 'session_mlops_3',
            title: 'LLM Fine-Tuning & Quantization in Production',
            instructorName: 'Dr. Priya Patel',
            scheduledAt: new Date(Date.now() + 3600 * 1000 * 24).toISOString(),
            durationMinutes: 75,
            status: 'upcoming' as const,
            maxParticipants: 400,
            currentParticipants: 180,
          },
        ]
      }
      return list
    },
    staleTime: 5 * 60 * 1000,
    refetchInterval: 60 * 1000,
  })

  // If a session ID is present in URL params, render the Studio Room
  if (id) {
    return <LiveClassRoomStudio sessionId={id} />
  }

  const statusColors: Record<string, string> = {
    live: 'bg-rose-500/20 text-rose-500 dark:text-rose-400 border border-rose-500/30',
    upcoming: 'bg-blue-500/20 text-blue-600 dark:text-blue-400 border border-blue-500/30',
    completed: 'bg-gray-500/20 text-gray-600 dark:text-gray-400 border border-gray-500/30',
  }

  const filteredSessions = sessions.filter(session => {
    const matchesTab =
      filterTab === 'ALL'
        ? true
        : filterTab === 'LIVE'
          ? session.status === 'live'
          : session.status === 'upcoming'

    const matchesSearch =
      searchQuery.trim() === '' ||
      session.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      session.instructorName.toLowerCase().includes(searchQuery.toLowerCase())

    return matchesTab && matchesSearch
  })

  return (
    <AnimatedPage>
      <SEO title="Live Classes & Collaborative Studios - LearningHub" />
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        {/* Header Banner */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-8 rounded-3xl bg-gradient-to-r from-indigo-900 via-purple-900 to-slate-900 text-white shadow-2xl relative overflow-hidden">
          <div className="relative z-10 space-y-2">
            <span className="px-3 py-1 rounded-full bg-white/10 text-indigo-300 text-[10px] font-black uppercase tracking-widest border border-white/10">
              Interactive Video & Whiteboard Studios
            </span>
            <h1 className="text-3xl font-black tracking-tight">Live Interactive Classrooms</h1>
            <p className="text-sm text-indigo-200/80 font-medium max-w-xl">
              Join peer coding sessions, real-time whiteboards, and live interactive lectures with
              master architects.
            </p>
          </div>
          <div className="relative z-10 flex items-center gap-3">
            <Button
              onClick={() => navigate('/live-class/session_dsa_live_1')}
              className="bg-rose-500 hover:bg-rose-600 text-white font-black rounded-2xl text-xs gap-2 shadow-xl shadow-rose-500/30 animate-pulse"
              leftIcon={<Radio className="w-4 h-4" />}
            >
              Join Active Live Room
            </Button>
          </div>
        </div>

        {/* Filters and Search Bar */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-1 bg-gray-100 dark:bg-gray-800 p-1 rounded-xl w-full sm:w-auto">
            {(['ALL', 'LIVE', 'UPCOMING'] as const).map(tab => (
              <button
                key={tab}
                onClick={() => setFilterTab(tab)}
                className={`flex-1 sm:flex-initial px-4 py-2 rounded-lg text-xs font-black uppercase tracking-wider transition-all ${
                  filterTab === tab
                    ? 'bg-white dark:bg-gray-700 text-indigo-600 dark:text-white shadow-sm'
                    : 'text-gray-500 hover:text-gray-900 dark:hover:text-white'
                }`}
              >
                {tab === 'LIVE' ? '🔴 Live Now' : tab}
              </button>
            ))}
          </div>

          <div className="relative w-full sm:w-72">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="Search live classes..."
              className="w-full pl-9 pr-4 py-2.5 text-xs font-bold rounded-xl bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>
        </div>

        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3].map(i => (
              <Skeleton key={i} className="h-56 rounded-3xl" />
            ))}
          </div>
        ) : isError ? (
          <ErrorState
            title="Failed to load live sessions"
            message={error?.message ?? 'Could not load live sessions.'}
            error={error}
            onRetry={() => void refetch()}
          />
        ) : filteredSessions.length === 0 ? (
          <EmptyState
            icon={Video}
            title="No Live Sessions Scheduled"
            description="Check back later for upcoming live classes."
          />
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredSessions.map((session, idx) => (
              <motion.div
                key={session.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.05 }}
              >
                <Card className="h-full flex flex-col p-6 rounded-3xl border border-gray-200 dark:border-gray-800 hover:border-indigo-500 dark:hover:border-indigo-500 shadow-xl transition-all group">
                  <div className="flex items-start justify-between mb-4">
                    <Badge className={statusColors[session.status] ?? statusColors.upcoming}>
                      {session.status === 'live'
                        ? '🔴 Live Now'
                        : session.status.charAt(0).toUpperCase() + session.status.slice(1)}
                    </Badge>
                  </div>

                  <h3 className="text-base font-bold text-gray-900 dark:text-white mb-2 line-clamp-2">
                    {session.title}
                  </h3>

                  {session.instructorName && (
                    <p className="text-xs text-gray-500 dark:text-gray-400 mb-4 font-medium">
                      By <span className="font-bold text-indigo-500">{session.instructorName}</span>
                    </p>
                  )}

                  <div className="mt-auto space-y-2 pt-4 border-t border-gray-100 dark:border-gray-800 text-xs text-gray-500 dark:text-gray-400 font-medium">
                    <div className="flex items-center gap-2">
                      <Calendar className="w-3.5 h-3.5 text-gray-400" />
                      <span>
                        {new Date(session.scheduledAt).toLocaleDateString('en-US', {
                          weekday: 'short',
                          month: 'short',
                          day: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Clock className="w-3.5 h-3.5 text-gray-400" />
                      <span>{session.durationMinutes} min Studio Session</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Users className="w-3.5 h-3.5 text-gray-400" />
                      <span>
                        {session.currentParticipants ?? 0}/{session.maxParticipants ?? '∞'}{' '}
                        participants
                      </span>
                    </div>
                  </div>

                  <Button
                    className={`mt-5 w-full rounded-xl text-xs font-bold gap-2 ${
                      session.status === 'live'
                        ? 'bg-rose-500 hover:bg-rose-600 text-white shadow-lg shadow-rose-500/20'
                        : 'bg-indigo-600 hover:bg-indigo-700 text-white'
                    }`}
                    onClick={() => navigate(`/live-class/${session.id}`)}
                  >
                    {session.status === 'live' ? (
                      <>
                        <Play className="w-3.5 h-3.5" /> Join Live Studio
                      </>
                    ) : (
                      <>
                        <ArrowRight className="w-3.5 h-3.5" /> Enter Classroom
                      </>
                    )}
                  </Button>
                </Card>
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </AnimatedPage>
  )
}
