export type PeerId = 'alice' | 'bob' | 'charlie'

export interface VectorClock {
  alice: number
  bob: number
  charlie: number
}

export interface NodeId {
  peerId: PeerId
  clock: number
}

export interface RgaCharNode {
  id: NodeId
  char: string
  parent: NodeId | null
  isDeleted: boolean
  lamport: number
}

export interface LwwRegister {
  key: string
  value: any
  timestamp: number
  peerId: PeerId
}

export interface LwwSetItem {
  value: string
  timestamp: number
  peerId: PeerId
}

export interface LwwElementSet {
  addSet: LwwSetItem[]
  removeSet: LwwSetItem[]
}

export interface PeerState {
  peerId: PeerId
  name: string
  isOnline: boolean
  vectorClock: VectorClock
  lamportClock: number
  rgaNodes: RgaCharNode[]
  renderedText: string
  lwwRegisters: Record<string, LwwRegister>
  lwwSet: LwwElementSet
  resolvedSet: string[]
}

export interface CrdtTopologySnapshot {
  peers: Record<PeerId, PeerState>
  isPartitioned: boolean
  isolatedPeers: PeerId[]
  globalLamport: number
  auditDigest: string
  lastSyncTimestamp: string
}

export interface AlgebraicProofResult {
  isCommutative: boolean
  isAssociative: boolean
  isIdempotent: boolean
  causalityPreserved: boolean
  leftRightHash: string
  rightLeftHash: string
  convergenceVerified: boolean
  proofDetails: string
}

export type CrdtStudioTab =
  | 'P2P_EDITORS'
  | 'RGA_DAG'
  | 'VECTOR_CLOCKS'
  | 'LWW_SETS'
  | 'ALGEBRAIC_PROOFS'
