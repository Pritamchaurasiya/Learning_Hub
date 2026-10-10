import React, { useState, useEffect, useCallback } from 'react'
import {
  Users,
  Code2,
  Plus,
  RefreshCw,
  Share2,
  Cpu,
  Layers,
  ArrowRight,
} from 'lucide-react'
import {
  CollabRoomState,
  CrdtStroke,
  CrdtCodeSnippet,
  CrdtOperation,
  CanvasToolType,
} from '../types/crdtCollab'
import { crdtCollabService } from '../services/crdtCollabService'
import { PeerPresenceHUD } from '../components/collab/PeerPresenceHUD'
import { P2PCollaborativeCanvas } from '../components/collab/P2PCollaborativeCanvas'
import { CrdtStateVectorInspector } from '../components/collab/CrdtStateVectorInspector'
import { P2PCollaborativeCodeBlock } from '../components/collab/P2PCollaborativeCodeBlock'

export const P2PCollabCanvasPage: React.FC = () => {
  const [currentPeerId] = useState<string>(
    () => `peer-${Math.random().toString(36).substring(2, 7)}`
  )
  const [room, setRoom] = useState<CollabRoomState | null>(null)
  const [recentOperations, setRecentOperations] = useState<CrdtOperation[]>([])
  const [isSavingSnapshot, setIsSavingSnapshot] = useState<boolean>(false)
  const [isLoading, setIsLoading] = useState<boolean>(true)
  const [joinInputRoomId, setJoinInputRoomId] = useState<string>('')
  const [showJoinModal, setShowJoinModal] = useState<boolean>(false)

  // Initialize or create room on mount
  const initRoom = useCallback(async (roomName = 'Systems Design Whiteboard') => {
    setIsLoading(true)
    try {
      const newRoom = await crdtCollabService.createRoom({
        roomName,
        creatorId: currentPeerId,
        maxPeers: 6,
      })

      // Add a default simulated peer to showcase WebRTC multi-user presence
      const simulatedPeer = {
        peerId: 'peer-sim-arch',
        displayName: 'Distributed-Node-A',
        role: 'PARTICIPANT' as const,
        color: '#10B981',
        joinedAt: Date.now() - 30000,
        lastSeen: Date.now(),
        connectionType: 'P2P_WEBRTC' as const,
        latencyMs: 14,
        cursor: { x: 380, y: 220, activeTool: 'pen' as CanvasToolType },
      }

      // Add initial starter stroke for demonstration
      const demoStroke: CrdtStroke = {
        id: 'stroke-demo-init',
        peerId: simulatedPeer.peerId,
        color: '#10B981',
        width: 3,
        tool: 'pen',
        points: [
          { x: 320, y: 180 },
          { x: 360, y: 220 },
          { x: 420, y: 190 },
          { x: 480, y: 240 },
        ],
        createdAt: Date.now() - 25000,
        lamportClock: 1,
      }

      const defaultSnippet: CrdtCodeSnippet = {
        id: 'code-snippet-1',
        peerId: simulatedPeer.peerId,
        title: 'CRDT Lamport Clock & State Vector',
        language: 'typescript',
        code: `// Lamport Logical Clock & CRDT State Vector\nexport function advanceClock(vector: Record<string, number>, peer: string) {\n  const current = vector[peer] || 0;\n  return { ...vector, [peer]: current + 1 };\n}`,
        lamportClock: 2,
        updatedAt: Date.now() - 20000,
      }

      const initialRoomState: CollabRoomState = {
        ...newRoom,
        peers: [...newRoom.peers, simulatedPeer],
        strokes: [demoStroke],
        codeSnippets: [defaultSnippet],
        vectorClock: {
          [currentPeerId]: 1,
          [simulatedPeer.peerId]: 2,
        },
      }

      setRoom(initialRoomState)
    } finally {
      setIsLoading(false)
    }
  }, [currentPeerId])

  useEffect(() => {
    initRoom()
  }, [initRoom])

  // Handle adding stroke with CRDT Lamport clock increment
  const handleAddStroke = (stroke: CrdtStroke) => {
    if (!room) return

    const { clock, lamport } = crdtCollabService.advanceVectorClock(
      room.vectorClock,
      currentPeerId
    )
    const stampedStroke: CrdtStroke = {
      ...stroke,
      lamportClock: lamport,
    }

    const updatedStrokes = crdtCollabService.mergeStrokes(room.strokes, stampedStroke)

    const op: CrdtOperation = {
      id: `op-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      opType: 'STROKE_ADD',
      peerId: currentPeerId,
      lamportClock: lamport,
      timestamp: Date.now(),
      payload: { stroke: stampedStroke },
    }

    setRoom({
      ...room,
      strokes: updatedStrokes,
      vectorClock: clock,
    })
    setRecentOperations((prev) => [...prev, op])

    // Broadcast operation asynchronously
    void crdtCollabService.applyOperation(room.roomId, op)
  }

  // Handle stroke deletion (CRDT Tombstone)
  const handleDeleteStroke = (strokeId: string) => {
    if (!room) return

    const { clock, lamport } = crdtCollabService.advanceVectorClock(
      room.vectorClock,
      currentPeerId
    )
    const updatedStrokes = room.strokes.map((s) =>
      s.id === strokeId ? { ...s, isDeleted: true, lamportClock: lamport } : s
    )

    const op: CrdtOperation = {
      id: `op-del-${Date.now()}`,
      opType: 'STROKE_DELETE',
      peerId: currentPeerId,
      lamportClock: lamport,
      timestamp: Date.now(),
      payload: { strokeId },
    }

    setRoom({
      ...room,
      strokes: updatedStrokes,
      vectorClock: clock,
    })
    setRecentOperations((prev) => [...prev, op])
    void crdtCollabService.applyOperation(room.roomId, op)
  }

  // Handle clear canvas
  const handleClearCanvas = () => {
    if (!room) return

    const { clock, lamport } = crdtCollabService.advanceVectorClock(
      room.vectorClock,
      currentPeerId
    )
    const updatedStrokes = room.strokes.map((s) => ({
      ...s,
      isDeleted: true,
      lamportClock: lamport,
    }))

    const op: CrdtOperation = {
      id: `op-clear-${Date.now()}`,
      opType: 'CLEAR_CANVAS',
      peerId: currentPeerId,
      lamportClock: lamport,
      timestamp: Date.now(),
      payload: {},
    }

    setRoom({
      ...room,
      strokes: updatedStrokes,
      vectorClock: clock,
    })
    setRecentOperations((prev) => [...prev, op])
  }

  // Handle cursor move broadcasting
  const handleCursorMove = (x: number, y: number, tool: CanvasToolType) => {
    if (!room) return

    // Update local peer cursor in state
    setRoom((prev) => {
      if (!prev) return null
      return {
        ...prev,
        peers: prev.peers.map((p) =>
          p.peerId === currentPeerId
            ? { ...p, cursor: { x, y, activeTool: tool }, lastSeen: Date.now() }
            : p
        ),
      }
    })
  }

  // Handle Code snippet updates
  const handleUpdateCode = (snippetId: string, newCode: string) => {
    if (!room) return

    const { clock, lamport } = crdtCollabService.advanceVectorClock(
      room.vectorClock,
      currentPeerId
    )
    const updatedSnippets = room.codeSnippets.map((c) =>
      c.id === snippetId
        ? {
            ...c,
            code: newCode,
            lamportClock: lamport,
            updatedAt: Date.now(),
          }
        : c
    )

    setRoom({
      ...room,
      codeSnippets: updatedSnippets,
      vectorClock: clock,
    })
  }

  // Handle adding new code snippet
  const handleAddCodeSnippet = () => {
    if (!room) return

    const { clock, lamport } = crdtCollabService.advanceVectorClock(
      room.vectorClock,
      currentPeerId
    )
    const newSnippet: CrdtCodeSnippet = {
      id: `snippet-${Date.now()}`,
      peerId: currentPeerId,
      title: `Shared Code Block #${room.codeSnippets.length + 1}`,
      language: 'typescript',
      code: '// Type distributed collaborative code here\n',
      lamportClock: lamport,
      updatedAt: Date.now(),
    }

    setRoom({
      ...room,
      codeSnippets: [...room.codeSnippets, newSnippet],
      vectorClock: clock,
    })
  }

  // Handle deleting code snippet
  const handleDeleteCodeSnippet = (snippetId: string) => {
    if (!room) return
    setRoom({
      ...room,
      codeSnippets: room.codeSnippets.filter((c) => c.id !== snippetId),
    })
  }

  // Handle IPFS multihash snapshot pinning
  const handleSaveSnapshot = async () => {
    if (!room) return
    setIsSavingSnapshot(true)
    try {
      const res = await crdtCollabService.saveSnapshot(room.roomId, room)
      setRoom({
        ...room,
        ipfsSnapshotCid: res.snapshotCid,
      })
    } finally {
      setIsSavingSnapshot(false)
    }
  }

  // Handle SVG export download
  const handleExportSvg = () => {
    if (!room) return
    const svgStr = crdtCollabService.serializeCanvasSvg(room.strokes)
    const blob = new Blob([svgStr], { type: 'image/svg+xml' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${room.roomName.toLowerCase().replace(/\s+/g, '-')}-crdt-export.svg`
    a.click()
    URL.revokeObjectURL(url)
  }

  // Handle JSON export download
  const handleExportJson = () => {
    if (!room) return
    const jsonStr = crdtCollabService.exportCanvasJson(room)
    const blob = new Blob([jsonStr], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${room.roomId}-crdt-state.json`
    a.click()
    URL.revokeObjectURL(url)
  }

  // Join Room via ID
  const handleJoinExistingRoom = async () => {
    if (!joinInputRoomId.trim()) return
    setIsLoading(true)
    try {
      const joined = await crdtCollabService.joinRoom(joinInputRoomId.trim(), {
        displayName: 'Visiting Architect',
        role: 'PARTICIPANT',
      })
      setRoom(joined.room)
      setShowJoinModal(false)
      setJoinInputRoomId('')
    } finally {
      setIsLoading(false)
    }
  }

  const convergencePercentage = room
    ? crdtCollabService.calculateConvergence(room.peers, room.vectorClock)
    : 100

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 p-4 sm:p-6 lg:p-8 space-y-6">
      {/* Top Banner & Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-slate-800">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-3 py-1 rounded-full text-xs font-bold bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 flex items-center gap-1.5">
              <Cpu className="w-3.5 h-3.5" /> Milestone 21 • P2P WebRTC & CRDT Canvas
            </span>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-mono bg-purple-500/10 text-purple-300 border border-purple-500/20">
              Lamport Clocks
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-white mt-2 tracking-tight">
            Real-Time Decentralized Whiteboard & Code Canvas
          </h1>
          <p className="text-sm text-slate-400 mt-1 max-w-3xl">
            Conflict-free replicated data types (CRDTs) with Lamport vector clocks, peer-to-peer WebRTC DataChannels, and IPFS multihash snapshots.
          </p>
        </div>

        {/* Action Buttons: New Room / Join Room */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowJoinModal(true)}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold border border-slate-700 transition shadow-lg"
          >
            <Share2 className="w-3.5 h-3.5 text-indigo-400" />
            <span>Join Room</span>
          </button>
          <button
            onClick={() => initRoom('Decentralized Workspace')}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold shadow-lg shadow-indigo-600/30 transition"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>New Room</span>
          </button>
        </div>
      </div>

      {/* Peer Presence Ribbon */}
      <PeerPresenceHUD
        room={room}
        currentPeerId={currentPeerId}
        convergencePercentage={convergencePercentage}
      />

      {/* Main Workspace Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Left 3 Cols: Canvas & Shared Code Snippets */}
        <div className="lg:col-span-3 space-y-6">
          {/* Interactive Whiteboard Canvas */}
          <P2PCollaborativeCanvas
            strokes={room?.strokes || []}
            peers={room?.peers || []}
            currentPeerId={currentPeerId}
            onAddStroke={handleAddStroke}
            onDeleteStroke={handleDeleteStroke}
            onClearCanvas={handleClearCanvas}
            onCursorMove={handleCursorMove}
          />

          {/* Collaborative Code Blocks Section */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Code2 className="w-5 h-5 text-indigo-400" />
                <h3 className="text-base font-bold text-white">
                  Collaborative Code Blocks ({room?.codeSnippets.length || 0})
                </h3>
              </div>
              <button
                onClick={handleAddCodeSnippet}
                className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-indigo-600/20 hover:bg-indigo-600/30 text-indigo-300 text-xs font-medium border border-indigo-500/30 transition"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add Code Block</span>
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {(room?.codeSnippets || []).map((snippet) => (
                <P2PCollaborativeCodeBlock
                  key={snippet.id}
                  snippet={snippet}
                  currentPeerId={currentPeerId}
                  onUpdateCode={handleUpdateCode}
                  onDeleteSnippet={handleDeleteCodeSnippet}
                />
              ))}
            </div>
          </div>
        </div>

        {/* Right 1 Col: CRDT Inspector & System Health */}
        <div className="space-y-6">
          <CrdtStateVectorInspector
            room={room}
            currentPeerId={currentPeerId}
            recentOperations={recentOperations}
            convergencePercentage={convergencePercentage}
            isSavingSnapshot={isSavingSnapshot}
            onSaveSnapshot={handleSaveSnapshot}
            onExportSvg={handleExportSvg}
            onExportJson={handleExportJson}
          />

          {/* Distributed Architecture Explainer Card */}
          <div className="p-5 rounded-2xl bg-slate-900/70 border border-slate-800 text-xs space-y-3">
            <div className="flex items-center gap-2 text-indigo-400 font-semibold">
              <Layers className="w-4 h-4" />
              <span>CRDT State Convergence Principles</span>
            </div>
            <p className="text-slate-400 leading-relaxed text-[11px]">
              Every drawing stroke and code delta is tagged with a monotonically increasing Lamport timestamp. In the event of network partition or latency spikes, peers deterministically converge without centralized locks.
            </p>
            <div className="p-2.5 rounded-xl bg-slate-950 font-mono text-[10px] text-slate-300 space-y-1">
              <div>• Clock: Lamport Scalar + Vector Clocks</div>
              <div>• Resolution: Last-Write-Wins (LWW)</div>
              <div>• Network: WebRTC DataChannels + Relay</div>
              <div>• Storage: Content-Addressed IPFS CID</div>
            </div>
          </div>
        </div>
      </div>

      {/* Join Room Modal */}
      {showJoinModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-md p-6 rounded-2xl bg-slate-900 border border-slate-800 shadow-2xl space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <Users className="w-5 h-5 text-indigo-400" /> Join Collaborative Room
              </h3>
              <button
                onClick={() => setShowJoinModal(false)}
                className="text-slate-500 hover:text-white text-sm"
              >
                ✕
              </button>
            </div>

            <p className="text-xs text-slate-400">
              Enter a collaborative Room ID to connect to the peer swarm and synchronize canvas state vectors:
            </p>

            <input
              type="text"
              placeholder="e.g. room-alpha-123"
              value={joinInputRoomId}
              onChange={(e) => setJoinInputRoomId(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-sm text-white font-mono placeholder:text-slate-600 focus:outline-none focus:border-indigo-500"
            />

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                onClick={() => setShowJoinModal(false)}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-400 hover:text-white transition"
              >
                Cancel
              </button>
              <button
                onClick={handleJoinExistingRoom}
                disabled={isLoading || !joinInputRoomId.trim()}
                className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white text-xs font-semibold transition"
              >
                {isLoading ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <ArrowRight className="w-3.5 h-3.5" />}
                <span>Connect Swarm</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
export default P2PCollabCanvasPage
