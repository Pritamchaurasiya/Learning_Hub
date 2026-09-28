import { useState } from 'react'
import {
  Users,
  Copy,
  Check,
  X,
  Share2,
  Video,
  VideoOff,
  Mic,
  MicOff,
  LogOut,
  Radio,
} from 'lucide-react'
import type { CollabPeer, RemoteCursor } from '../hooks/useCollaborativeSession'

interface CollabSessionModalProps {
  isOpen: boolean
  onClose: () => void
  roomId: string | null
  isConnected: boolean
  activePeers: CollabPeer[]
  remoteCursor: RemoteCursor | null
  onStartSession: (customRoomId?: string) => void
  onLeaveSession: () => void
  peerRunningTests?: boolean
}

export function CollabSessionModal({
  isOpen,
  onClose,
  roomId,
  isConnected,
  activePeers,
  remoteCursor,
  onStartSession,
  onLeaveSession,
  peerRunningTests,
}: CollabSessionModalProps) {
  const [copied, setCopied] = useState(false)
  const [customInput, setCustomInput] = useState('')
  const [isAudioEnabled, setIsAudioEnabled] = useState(false)
  const [isVideoEnabled, setIsVideoEnabled] = useState(false)

  if (!isOpen) return null

  const handleCopy = () => {
    if (!roomId) return
    navigator.clipboard.writeText(roomId)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const handleJoinCustom = () => {
    if (!customInput.trim()) return
    onStartSession(customInput.trim())
    setCustomInput('')
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-150">
      <div className="bg-gray-950 border border-gray-800 rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden flex flex-col">
        {/* Header */}
        <div className="px-5 py-4 border-b border-gray-800/80 bg-gray-900/60 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 p-0.5 shadow-lg shadow-emerald-500/20">
              <div className="w-full h-full bg-gray-950 rounded-[10px] flex items-center justify-center">
                <Users className="w-5 h-5 text-emerald-400" />
              </div>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm sm:text-base font-bold text-gray-100">
                  Live Collaborative DSA Session
                </h3>
                <span
                  className={`text-[9px] font-bold px-2 py-0.5 rounded-full border ${
                    isConnected
                      ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30'
                      : 'bg-gray-800 text-gray-400 border-gray-700'
                  }`}
                >
                  {isConnected ? 'LIVE ONLINE' : 'DISCONNECTED'}
                </span>
              </div>
              <p className="text-xs text-gray-400">
                Real-time concurrent pair programming & mock technical interviews
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-gray-400 hover:text-white hover:bg-gray-800 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="p-5 space-y-4">
          {roomId ? (
            <div className="space-y-4">
              {/* Room ID Share Card */}
              <div className="p-3.5 bg-gray-900/70 border border-gray-800 rounded-xl space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-gray-300 flex items-center gap-1.5">
                    <Share2 className="w-3.5 h-3.5 text-primary-400" />
                    Collaborative Room Code
                  </span>
                  <span className="text-[10px] text-gray-400">Share with your peer or interviewer</span>
                </div>
                <div className="flex items-center gap-2">
                  <code className="flex-1 bg-gray-950 px-3 py-2 rounded-lg font-mono text-xs text-emerald-400 border border-gray-800 select-all truncate">
                    {roomId}
                  </code>
                  <button
                    onClick={handleCopy}
                    className="p-2 bg-gray-800 hover:bg-gray-700 text-gray-200 rounded-lg transition-colors shrink-0"
                    title="Copy Room ID"
                  >
                    {copied ? (
                      <Check className="w-4 h-4 text-emerald-400" />
                    ) : (
                      <Copy className="w-4 h-4" />
                    )}
                  </button>
                </div>
              </div>

              {/* Active Peers List */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-gray-300">
                    Connected Participants ({activePeers.length + 1})
                  </span>
                  {peerRunningTests && (
                    <span className="text-[10px] font-bold text-amber-400 animate-pulse flex items-center gap-1">
                      <Radio className="w-3 h-3 animate-spin" />
                      Peer executing tests...
                    </span>
                  )}
                </div>

                <div className="space-y-1.5">
                  {/* Current User */}
                  <div className="flex items-center justify-between p-2.5 rounded-lg bg-gray-900/40 border border-gray-800/60">
                    <div className="flex items-center gap-2">
                      <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 shadow-sm shadow-emerald-500/50" />
                      <span className="text-xs font-medium text-gray-200">You (Host/Developer)</span>
                    </div>
                    <span className="text-[10px] font-mono text-gray-500">Local Cursor</span>
                  </div>

                  {/* Remote Peers */}
                  {activePeers.map(peer => (
                    <div
                      key={peer.socketId}
                      className="flex items-center justify-between p-2.5 rounded-lg bg-gray-900/40 border border-gray-800/60"
                    >
                      <div className="flex items-center gap-2">
                        <div className="w-2.5 h-2.5 rounded-full bg-cyan-400 shadow-sm shadow-cyan-400/50" />
                        <span className="text-xs font-medium text-cyan-200">
                          Peer: {peer.userId.slice(0, 8)}
                        </span>
                      </div>
                      <span className="text-[10px] font-mono text-cyan-400">
                        {remoteCursor?.socketId === peer.socketId
                          ? `Line ${remoteCursor.line + 1}, Col ${remoteCursor.ch + 1}`
                          : 'Idle'}
                      </span>
                    </div>
                  ))}

                  {activePeers.length === 0 && (
                    <p className="text-xs text-gray-500 italic py-1">
                      Waiting for a peer to join with your room code...
                    </p>
                  )}
                </div>
              </div>

              {/* WebRTC AV Toggles */}
              <div className="pt-2 border-t border-gray-800/80 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setIsAudioEnabled(!isAudioEnabled)}
                    className={`p-2 rounded-lg border text-xs flex items-center gap-1.5 transition-colors ${
                      isAudioEnabled
                        ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                        : 'bg-gray-900 text-gray-400 border-gray-800 hover:text-gray-200'
                    }`}
                  >
                    {isAudioEnabled ? <Mic className="w-4 h-4" /> : <MicOff className="w-4 h-4" />}
                    <span>{isAudioEnabled ? 'Mic On' : 'Mic Off'}</span>
                  </button>
                  <button
                    onClick={() => setIsVideoEnabled(!isVideoEnabled)}
                    className={`p-2 rounded-lg border text-xs flex items-center gap-1.5 transition-colors ${
                      isVideoEnabled
                        ? 'bg-purple-500/20 text-purple-300 border-purple-500/40'
                        : 'bg-gray-900 text-gray-400 border-gray-800 hover:text-gray-200'
                    }`}
                  >
                    {isVideoEnabled ? <Video className="w-4 h-4" /> : <VideoOff className="w-4 h-4" />}
                    <span>{isVideoEnabled ? 'Video On' : 'Video Off'}</span>
                  </button>
                </div>

                <button
                  onClick={onLeaveSession}
                  className="px-3 py-2 bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 border border-rose-500/30 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-colors"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  Leave Session
                </button>
              </div>
            </div>
          ) : (
            /* Not currently in a session: Options to Create or Join */
            <div className="space-y-4">
              <div className="p-4 bg-gray-900/60 border border-gray-800 rounded-xl space-y-3">
                <h4 className="text-xs font-bold text-gray-200">Start a New Collaboration Room</h4>
                <p className="text-xs text-gray-400">
                  Generate an instant room ID for this problem and invite another developer or interviewer to code with you in real-time.
                </p>
                <button
                  onClick={() => onStartSession()}
                  className="w-full py-2.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold text-xs rounded-xl shadow-lg shadow-emerald-600/20 transition-all flex items-center justify-center gap-2"
                >
                  <Users className="w-4 h-4" />
                  Create Collaborative Room
                </button>
              </div>

              <div className="relative flex items-center justify-center">
                <div className="border-t border-gray-800 w-full" />
                <span className="bg-gray-950 px-2 text-[10px] font-bold uppercase tracking-wider text-gray-500 absolute">
                  OR
                </span>
              </div>

              <div className="space-y-2">
                <label className="text-xs font-semibold text-gray-300">Join an Existing Room</label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={customInput}
                    onChange={e => setCustomInput(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && handleJoinCustom()}
                    placeholder="Enter Room Code (e.g. collab-dsa-1234)"
                    className="flex-1 bg-gray-900 border border-gray-800 rounded-xl px-3 py-2 text-xs text-gray-100 placeholder-gray-500 focus:outline-none focus:border-primary-500"
                  />
                  <button
                    onClick={handleJoinCustom}
                    disabled={!customInput.trim()}
                    className="px-4 py-2 bg-gray-800 hover:bg-gray-700 disabled:opacity-50 text-white text-xs font-bold rounded-xl transition-colors shrink-0"
                  >
                    Join
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
