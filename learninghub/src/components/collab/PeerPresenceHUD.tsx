import React, { useState } from 'react'
import {
  Users,
  Wifi,
  Radio,
  Share2,
  Check,
  Shield,
  Clock,
  Sparkles,
} from 'lucide-react'
import { CollabPeer, CollabRoomState } from '../../types/crdtCollab'

interface PeerPresenceHUDProps {
  room: CollabRoomState | null
  currentPeerId: string
  convergencePercentage: number
  onInviteClick?: () => void
}

export const PeerPresenceHUD: React.FC<PeerPresenceHUDProps> = ({
  room,
  currentPeerId,
  convergencePercentage,
  onInviteClick,
}) => {
  const [copied, setCopied] = useState(false)

  if (!room) {
    return (
      <div className="flex items-center justify-between p-3 rounded-xl bg-slate-900/80 border border-slate-800 text-slate-400 text-xs">
        <div className="flex items-center gap-2">
          <Users className="w-4 h-4 animate-pulse text-indigo-400" />
          <span>Connecting to P2P Signaling Swarm...</span>
        </div>
      </div>
    )
  }

  const handleCopyRoomId = () => {
    navigator.clipboard?.writeText(room.roomId)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
    if (onInviteClick) onInviteClick()
  }

  return (
    <div className="flex flex-wrap items-center justify-between gap-3 p-3.5 rounded-2xl bg-slate-900/90 border border-slate-800 shadow-xl backdrop-blur-md">
      {/* Room Title & P2P Swarm Status */}
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2">
          <div className="p-2 rounded-xl bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
            <Radio className="w-4 h-4 animate-pulse" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-bold text-white tracking-wide">{room.roomName}</h3>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-medium bg-slate-800 text-slate-300 border border-slate-700">
                {room.roomId}
              </span>
            </div>
            <div className="flex items-center gap-2 text-[11px] text-slate-400 mt-0.5">
              <span className="flex items-center gap-1 text-emerald-400 font-medium">
                <Wifi className="w-3 h-3" /> WebRTC Mesh
              </span>
              <span>•</span>
              <span className="flex items-center gap-1">
                <Clock className="w-3 h-3 text-slate-500" /> {room.peers.length}/{room.maxPeers} Peers
              </span>
              <span>•</span>
              <span className="flex items-center gap-1 text-indigo-300 font-medium">
                <Sparkles className="w-3 h-3" /> {convergencePercentage}% Convergence
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Peer Avatars Ribbon */}
      <div className="flex items-center gap-3">
        <div className="flex items-center -space-x-2 overflow-hidden py-1">
          {room.peers.map((peer: CollabPeer) => {
            const isMe = peer.peerId === currentPeerId
            const initials = peer.displayName.slice(0, 2).toUpperCase()
            return (
              <div
                key={peer.peerId}
                title={`${peer.displayName} (${peer.role}) - ${peer.latencyMs}ms latency`}
                className="relative group transition-transform hover:scale-110 hover:z-10 cursor-pointer"
              >
                <div
                  className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold text-white shadow-md ring-2 ring-slate-900"
                  style={{ backgroundColor: peer.color }}
                >
                  {initials}
                </div>
                {/* Connection Ping Badge */}
                <span
                  className={`absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full ring-1 ring-slate-900 ${
                    peer.connectionType === 'P2P_WEBRTC'
                      ? 'bg-emerald-400'
                      : peer.connectionType === 'RELAY_FALLBACK'
                      ? 'bg-amber-400'
                      : 'bg-blue-400'
                  }`}
                />
                {/* Tooltip on Hover */}
                <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 hidden group-hover:flex flex-col items-center z-30 pointer-events-none">
                  <div className="bg-slate-950 text-white text-[10px] px-2 py-1 rounded shadow-lg border border-slate-700 whitespace-nowrap">
                    <span className="font-semibold">{peer.displayName}</span>
                    {isMe && <span className="text-indigo-400 ml-1">(You)</span>}
                    <div className="text-slate-400 text-[9px] flex items-center gap-1 mt-0.5">
                      <span>{peer.role}</span> • <span>{peer.latencyMs}ms</span>
                    </div>
                  </div>
                </div>
              </div>
            )
          })}
        </div>

        {/* Action Buttons: Copy / Invite */}
        <button
          onClick={handleCopyRoomId}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium border border-slate-700 transition"
        >
          {copied ? (
            <>
              <Check className="w-3.5 h-3.5 text-emerald-400" />
              <span className="text-emerald-400">Copied!</span>
            </>
          ) : (
            <>
              <Share2 className="w-3.5 h-3.5 text-slate-400" />
              <span>Invite</span>
            </>
          )}
        </button>

        {room.creatorId === currentPeerId && (
          <span className="hidden sm:inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-indigo-500/10 text-indigo-400 text-xs font-semibold border border-indigo-500/20">
            <Shield className="w-3 h-3" /> Host
          </span>
        )}
      </div>
    </div>
  )
}
