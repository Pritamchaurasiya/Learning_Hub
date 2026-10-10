/**
 * CRDT & P2P WebRTC Collaborative Whiteboard & Code Canvas Types
 * Milestone 19 - Real-time decentralized peer synchronization with Lamport Clocks
 */

export type CanvasToolType = 'pen' | 'highlighter' | 'eraser' | 'shape' | 'text'
export type ShapeKind = 'rectangle' | 'circle' | 'arrow' | 'line'
export type PeerRole = 'HOST' | 'PARTICIPANT' | 'OBSERVER'
export type PeerConnectionType = 'P2P_WEBRTC' | 'RELAY_FALLBACK' | 'CONNECTING'

export interface CanvasPoint {
  x: number
  y: number
  pressure?: number
}

export interface CrdtVectorClock {
  [peerId: string]: number
}

export interface CrdtStroke {
  id: string
  peerId: string
  color: string
  width: number
  tool: CanvasToolType
  shapeType?: ShapeKind
  points: CanvasPoint[]
  text?: string
  createdAt: number
  lamportClock: number
  isDeleted?: boolean
}

export interface CrdtCodeSnippet {
  id: string
  peerId: string
  title: string
  language: string
  code: string
  lamportClock: number
  updatedAt: number
  isDeleted?: boolean
}

export type CrdtOpType =
  | 'STROKE_ADD'
  | 'STROKE_DELETE'
  | 'CODE_UPDATE'
  | 'CURSOR_BEACON'
  | 'CLEAR_CANVAS'
  | 'DELTA_SYNC'

export interface CrdtOperation {
  id: string
  opType: CrdtOpType
  peerId: string
  lamportClock: number
  timestamp: number
  payload: {
    stroke?: CrdtStroke
    strokeId?: string
    codeSnippet?: CrdtCodeSnippet
    cursor?: { x: number; y: number; activeTool?: CanvasToolType }
    fullSync?: {
      strokes: CrdtStroke[]
      codeSnippets: CrdtCodeSnippet[]
      vectorClock: CrdtVectorClock
    }
  }
}

export interface CollabPeer {
  peerId: string
  displayName: string
  role: PeerRole
  color: string
  joinedAt: number
  lastSeen: number
  cursor?: {
    x: number
    y: number
    activeTool?: CanvasToolType
  }
  connectionType: PeerConnectionType
  latencyMs: number
}

export interface CollabRoomState {
  roomId: string
  roomName: string
  creatorId: string
  createdAt: number
  maxPeers: number
  peers: CollabPeer[]
  strokes: CrdtStroke[]
  codeSnippets: CrdtCodeSnippet[]
  vectorClock: CrdtVectorClock
  ipfsSnapshotCid?: string
}

export type SignalingMessageType =
  | 'OFFER'
  | 'ANSWER'
  | 'ICE_CANDIDATE'
  | 'PEER_JOIN'
  | 'PEER_LEAVE'

export interface WebRtcSignalingMessage {
  id: string
  roomId: string
  fromPeerId: string
  toPeerId: string
  type: SignalingMessageType
  data: unknown
  timestamp: number
}

export interface CanvasToolSettings {
  tool: CanvasToolType
  color: string
  width: number
  shapeType: ShapeKind
  gridVisible: boolean
  zoom: number
}
