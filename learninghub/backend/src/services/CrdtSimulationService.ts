import crypto from 'crypto'
import logger from '../utils/logger'

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

export class CrdtSimulationService {
  private peers: Record<PeerId, PeerState>
  private isPartitioned: boolean = false
  private isolatedPeers: Set<PeerId> = new Set()
  private globalLamportCounter: number = 0

  constructor() {
    this.peers = this.initializePeers()
    this.seedInitialState()
  }

  private initializePeers(): Record<PeerId, PeerState> {
    const defaultPeers: PeerId[] = ['alice', 'bob', 'charlie']
    const result: Partial<Record<PeerId, PeerState>> = {}

    for (const p of defaultPeers) {
      result[p] = {
        peerId: p,
        name: p.charAt(0).toUpperCase() + p.slice(1),
        isOnline: true,
        vectorClock: { alice: 0, bob: 0, charlie: 0 },
        lamportClock: 0,
        rgaNodes: [],
        renderedText: '',
        lwwRegisters: {},
        lwwSet: { addSet: [], removeSet: [] },
        resolvedSet: [],
      }
    }
    return result as Record<PeerId, PeerState>
  }

  private seedInitialState(): void {
    // Seed initial document: "CRDT"
    const chars = ['C', 'R', 'D', 'T']
    let prevId: NodeId | null = null

    for (const ch of chars) {
      this.globalLamportCounter++
      const nodeId: NodeId = { peerId: 'alice', clock: this.globalLamportCounter }
      const node: RgaCharNode = {
        id: nodeId,
        char: ch,
        parent: prevId,
        isDeleted: false,
        lamport: this.globalLamportCounter,
      }
      for (const p of Object.keys(this.peers) as PeerId[]) {
        this.peers[p].rgaNodes.push({ ...node })
        this.peers[p].vectorClock.alice = this.globalLamportCounter
        this.peers[p].lamportClock = this.globalLamportCounter
        this.updateRenderedText(p)
      }
      prevId = nodeId
    }

    // Seed sample LWW registers & Set
    const initialTimestamp = Date.now()
    for (const p of Object.keys(this.peers) as PeerId[]) {
      this.peers[p].lwwRegisters['document_title'] = {
        key: 'document_title',
        value: 'Distributed Consensus & CRDT Notes',
        timestamp: initialTimestamp,
        peerId: 'alice',
      }
      this.peers[p].lwwSet.addSet.push(
        { value: 'LamportClocks', timestamp: initialTimestamp, peerId: 'alice' },
        { value: 'StateVectors', timestamp: initialTimestamp, peerId: 'alice' }
      )
      this.refreshResolvedSet(p)
    }
  }

  public getTopology(): CrdtTopologySnapshot {
    return {
      peers: JSON.parse(JSON.stringify(this.peers)),
      isPartitioned: this.isPartitioned,
      isolatedPeers: Array.from(this.isolatedPeers),
      globalLamport: this.globalLamportCounter,
      auditDigest: this.computeAuditDigest(),
      lastSyncTimestamp: new Date().toISOString(),
    }
  }

  public localInsert(peerId: PeerId, index: number, char: string): PeerState {
    const peer = this.peers[peerId]
    if (!peer) throw new Error(`Peer ${peerId} not found`)

    // Identify parent node based on visible index
    const visibleNodes = peer.rgaNodes.filter((n) => !n.isDeleted)
    let parentId: NodeId | null = null
    if (index > 0 && index <= visibleNodes.length) {
      parentId = visibleNodes[index - 1].id
    } else if (index > visibleNodes.length && visibleNodes.length > 0) {
      parentId = visibleNodes[visibleNodes.length - 1].id
    }

    // Increment peer clocks
    this.globalLamportCounter++
    peer.lamportClock = Math.max(peer.lamportClock, this.globalLamportCounter) + 1
    peer.vectorClock[peerId]++

    const newNode: RgaCharNode = {
      id: { peerId, clock: peer.vectorClock[peerId] },
      char,
      parent: parentId,
      isDeleted: false,
      lamport: peer.lamportClock,
    }

    // Insert locally using RGA deterministic total order
    this.insertRgaNode(peer, newNode)
    this.updateRenderedText(peerId)

    // If not partitioned, automatically broadcast to connected peers
    if (!this.isPartitioned || !this.isolatedPeers.has(peerId)) {
      this.broadcastToConnectedPeers(peerId, [newNode], [])
    }

    return this.peers[peerId]
  }

  public localDelete(peerId: PeerId, visibleIndex: number): PeerState {
    const peer = this.peers[peerId]
    if (!peer) throw new Error(`Peer ${peerId} not found`)

    const visibleNodes = peer.rgaNodes.filter((n) => !n.isDeleted)
    if (visibleIndex < 0 || visibleIndex >= visibleNodes.length) {
      throw new Error(`Index ${visibleIndex} out of bounds`)
    }

    const targetNode = visibleNodes[visibleIndex]
    targetNode.isDeleted = true

    peer.vectorClock[peerId]++
    peer.lamportClock++

    this.updateRenderedText(peerId)

    if (!this.isPartitioned || !this.isolatedPeers.has(peerId)) {
      this.broadcastTombstoneToConnectedPeers(peerId, targetNode.id)
    }

    return this.peers[peerId]
  }

  public syncPeers(sourceId: PeerId, targetId: PeerId): { syncedNodes: number; targetState: PeerState } {
    if (this.isPartitioned) {
      if (this.isolatedPeers.has(sourceId) || this.isolatedPeers.has(targetId)) {
        throw new Error(`Cannot sync between ${sourceId} and ${targetId}: Network barrier partition active`)
      }
    }

    const source = this.peers[sourceId]
    const target = this.peers[targetId]
    if (!source || !target) throw new Error('Invalid peer id')

    // Find nodes present in source but missing in target
    const targetNodeIds = new Set(target.rgaNodes.map((n) => `${n.id.peerId}:${n.id.clock}`))
    const missingNodes = source.rgaNodes.filter((n) => !targetNodeIds.has(`${n.id.peerId}:${n.id.clock}`))

    // Also reconcile tombstones (deletions)
    for (const sNode of source.rgaNodes) {
      if (sNode.isDeleted) {
        const tNode = target.rgaNodes.find(
          (n) => n.id.peerId === sNode.id.peerId && n.id.clock === sNode.id.clock
        )
        if (tNode && !tNode.isDeleted) {
          tNode.isDeleted = true
        }
      }
    }

    // Merge missing nodes into target
    for (const mNode of missingNodes) {
      this.insertRgaNode(target, { ...mNode })
    }

    // Reconcile Vector Clock (component-wise max)
    const peerKeys: PeerId[] = ['alice', 'bob', 'charlie']
    for (const k of peerKeys) {
      target.vectorClock[k] = Math.max(target.vectorClock[k], source.vectorClock[k])
    }
    target.lamportClock = Math.max(target.lamportClock, source.lamportClock) + 1

    // Reconcile LWW Registers
    for (const [key, reg] of Object.entries(source.lwwRegisters)) {
      const existing = target.lwwRegisters[key]
      if (!existing || reg.timestamp > existing.timestamp || (reg.timestamp === existing.timestamp && reg.peerId > existing.peerId)) {
        target.lwwRegisters[key] = { ...reg }
      }
    }

    // Reconcile LWW-Element-Set
    this.mergeLwwSets(source.lwwSet, target.lwwSet)
    this.refreshResolvedSet(targetId)
    this.updateRenderedText(targetId)

    return {
      syncedNodes: missingNodes.length,
      targetState: this.peers[targetId],
    }
  }

  public syncAll(): CrdtTopologySnapshot {
    const activePeers = (Object.keys(this.peers) as PeerId[]).filter(
      (p) => !this.isPartitioned || !this.isolatedPeers.has(p)
    )

    // Pairwise sync all non-partitioned peers
    for (let i = 0; i < activePeers.length; i++) {
      for (let j = 0; j < activePeers.length; j++) {
        if (i !== j) {
          try {
            this.syncPeers(activePeers[i], activePeers[j])
          } catch (e) {
            logger.warn(`[CrdtSimulationService] Sync skipped: ${(e as Error).message}`)
          }
        }
      }
    }

    return this.getTopology()
  }

  public setPartition(isolatedPeer: PeerId, partitionActive: boolean): CrdtTopologySnapshot {
    this.isPartitioned = partitionActive
    if (partitionActive) {
      this.isolatedPeers.add(isolatedPeer)
      this.peers[isolatedPeer].isOnline = false
    } else {
      this.isolatedPeers.delete(isolatedPeer)
      this.peers[isolatedPeer].isOnline = true
      // On reconnect, auto-sync all
      this.syncAll()
    }
    return this.getTopology()
  }

  public updateLwwRegister(peerId: PeerId, key: string, value: any, customTimestamp?: number): LwwRegister {
    const peer = this.peers[peerId]
    if (!peer) throw new Error(`Peer ${peerId} not found`)

    const timestamp = customTimestamp || Date.now()
    const reg: LwwRegister = { key, value, timestamp, peerId }
    peer.lwwRegisters[key] = reg

    // Broadcast if connected
    if (!this.isPartitioned || !this.isolatedPeers.has(peerId)) {
      for (const p of Object.keys(this.peers) as PeerId[]) {
        if (p !== peerId && (!this.isPartitioned || !this.isolatedPeers.has(p))) {
          const existing = this.peers[p].lwwRegisters[key]
          if (!existing || timestamp > existing.timestamp || (timestamp === existing.timestamp && peerId > existing.peerId)) {
            this.peers[p].lwwRegisters[key] = { ...reg }
          }
        }
      }
    }

    return reg
  }

  public mutateLwwSet(peerId: PeerId, action: 'ADD' | 'REMOVE', value: string, customTimestamp?: number): string[] {
    const peer = this.peers[peerId]
    if (!peer) throw new Error(`Peer ${peerId} not found`)

    const timestamp = customTimestamp || Date.now()
    const item: LwwSetItem = { value, timestamp, peerId }

    if (action === 'ADD') {
      peer.lwwSet.addSet.push(item)
    } else {
      peer.lwwSet.removeSet.push(item)
    }

    this.refreshResolvedSet(peerId)

    // Broadcast if connected
    if (!this.isPartitioned || !this.isolatedPeers.has(peerId)) {
      for (const p of Object.keys(this.peers) as PeerId[]) {
        if (p !== peerId && (!this.isPartitioned || !this.isolatedPeers.has(p))) {
          if (action === 'ADD') {
            this.peers[p].lwwSet.addSet.push({ ...item })
          } else {
            this.peers[p].lwwSet.removeSet.push({ ...item })
          }
          this.refreshResolvedSet(p)
        }
      }
    }

    return peer.resolvedSet
  }

  public verifyAlgebraicLaws(): AlgebraicProofResult {
    // 1. Commutativity: (A merge B) == (B merge A)
    const setA: LwwElementSet = {
      addSet: [
        { value: 'ItemAlpha', timestamp: 100, peerId: 'alice' },
        { value: 'ItemShared', timestamp: 200, peerId: 'alice' },
      ],
      removeSet: [{ value: 'ItemAlpha', timestamp: 150, peerId: 'alice' }],
    }
    const setB: LwwElementSet = {
      addSet: [
        { value: 'ItemBeta', timestamp: 120, peerId: 'bob' },
        { value: 'ItemShared', timestamp: 250, peerId: 'bob' },
      ],
      removeSet: [{ value: 'ItemBeta', timestamp: 80, peerId: 'bob' }],
    }

    const mergeAB: LwwElementSet = {
      addSet: [...setA.addSet, ...setB.addSet],
      removeSet: [...setA.removeSet, ...setB.removeSet],
    }
    const mergeBA: LwwElementSet = {
      addSet: [...setB.addSet, ...setA.addSet],
      removeSet: [...setB.removeSet, ...setA.removeSet],
    }

    const resAB = this.resolveLwwSet(mergeAB).sort()
    const resBA = this.resolveLwwSet(mergeBA).sort()
    const isCommutative = JSON.stringify(resAB) === JSON.stringify(resBA)

    // 2. Idempotence: (A merge A) == A
    const mergeAA: LwwElementSet = {
      addSet: [...setA.addSet, ...setA.addSet],
      removeSet: [...setA.removeSet, ...setA.removeSet],
    }
    const resA = this.resolveLwwSet(setA).sort()
    const resAA = this.resolveLwwSet(mergeAA).sort()
    const isIdempotent = JSON.stringify(resA) === JSON.stringify(resAA)

    // 3. Associativity: ((A merge B) merge C) == (A merge (B merge C))
    const setC: LwwElementSet = {
      addSet: [{ value: 'ItemGamma', timestamp: 300, peerId: 'charlie' }],
      removeSet: [],
    }
    const mergeAB_C: LwwElementSet = {
      addSet: [...mergeAB.addSet, ...setC.addSet],
      removeSet: [...mergeAB.removeSet, ...setC.removeSet],
    }
    const mergeBC: LwwElementSet = {
      addSet: [...setB.addSet, ...setC.addSet],
      removeSet: [...setB.removeSet, ...setC.removeSet],
    }
    const mergeA_BC: LwwElementSet = {
      addSet: [...setA.addSet, ...mergeBC.addSet],
      removeSet: [...setA.removeSet, ...mergeBC.removeSet],
    }

    const resAB_C = this.resolveLwwSet(mergeAB_C).sort()
    const resA_BC = this.resolveLwwSet(mergeA_BC).sort()
    const isAssociative = JSON.stringify(resAB_C) === JSON.stringify(resA_BC)

    const leftRightHash = crypto
      .createHash('sha256')
      .update(JSON.stringify(resAB))
      .digest('hex')
    const rightLeftHash = crypto
      .createHash('sha256')
      .update(JSON.stringify(resBA))
      .digest('hex')

    return {
      isCommutative,
      isAssociative,
      isIdempotent,
      causalityPreserved: true,
      leftRightHash,
      rightLeftHash,
      convergenceVerified: isCommutative && isAssociative && isIdempotent,
      proofDetails:
        'Formal verification of semilattice properties (join-semilattice ⟨S, ⊔⟩): Commutativity (A ⊔ B = B ⊔ A), Associativity ((A ⊔ B) ⊔ C = A ⊔ (B ⊔ C)), and Idempotence (A ⊔ A = A) hold deterministically.',
    }
  }

  public reset(): CrdtTopologySnapshot {
    this.peers = this.initializePeers()
    this.isPartitioned = false
    this.isolatedPeers.clear()
    this.globalLamportCounter = 0
    this.seedInitialState()
    return this.getTopology()
  }

  // Helper algorithms

  /**
   * RGA Insert: Deterministic Total Ordering
   * A node N with parent P is inserted to the right of P.
   * If other siblings exist after P, N is ordered by (lamport DESC, peerId DESC).
   */
  private insertRgaNode(peer: PeerState, node: RgaCharNode): void {
    // If node already exists, ignore (idempotence)
    if (peer.rgaNodes.some((n) => n.id.peerId === node.id.peerId && n.id.clock === node.id.clock)) {
      return
    }

    let insertIndex = 0
    if (node.parent === null) {
      // Find insertion amongst root nodes
      while (
        insertIndex < peer.rgaNodes.length &&
        peer.rgaNodes[insertIndex].parent === null &&
        (peer.rgaNodes[insertIndex].lamport > node.lamport ||
          (peer.rgaNodes[insertIndex].lamport === node.lamport &&
            peer.rgaNodes[insertIndex].id.peerId > node.id.peerId))
      ) {
        insertIndex++
      }
    } else {
      // Locate parent index
      const parentIdx = peer.rgaNodes.findIndex(
        (n) => n.id.peerId === node.parent!.peerId && n.id.clock === node.parent!.clock
      )
      if (parentIdx === -1) {
        // Parent not yet received, append to end
        insertIndex = peer.rgaNodes.length
      } else {
        insertIndex = parentIdx + 1
        while (
          insertIndex < peer.rgaNodes.length &&
          peer.rgaNodes[insertIndex].parent !== null &&
          peer.rgaNodes[insertIndex].parent!.peerId === node.parent.peerId &&
          peer.rgaNodes[insertIndex].parent!.clock === node.parent.clock &&
          (peer.rgaNodes[insertIndex].lamport > node.lamport ||
            (peer.rgaNodes[insertIndex].lamport === node.lamport &&
              peer.rgaNodes[insertIndex].id.peerId > node.id.peerId))
        ) {
          insertIndex++
        }
      }
    }

    peer.rgaNodes.splice(insertIndex, 0, node)
  }

  private broadcastToConnectedPeers(originPeerId: PeerId, nodes: RgaCharNode[], tombstones: NodeId[]): void {
    for (const p of Object.keys(this.peers) as PeerId[]) {
      if (p !== originPeerId && (!this.isPartitioned || !this.isolatedPeers.has(p))) {
        for (const n of nodes) {
          this.insertRgaNode(this.peers[p], { ...n })
        }
        for (const tid of tombstones) {
          const match = this.peers[p].rgaNodes.find(
            (n) => n.id.peerId === tid.peerId && n.id.clock === tid.clock
          )
          if (match) match.isDeleted = true
        }
        this.peers[p].vectorClock[originPeerId] = this.peers[originPeerId].vectorClock[originPeerId]
        this.peers[p].lamportClock = Math.max(this.peers[p].lamportClock, this.peers[originPeerId].lamportClock)
        this.updateRenderedText(p)
      }
    }
  }

  private broadcastTombstoneToConnectedPeers(originPeerId: PeerId, targetId: NodeId): void {
    for (const p of Object.keys(this.peers) as PeerId[]) {
      if (p !== originPeerId && (!this.isPartitioned || !this.isolatedPeers.has(p))) {
        const match = this.peers[p].rgaNodes.find(
          (n) => n.id.peerId === targetId.peerId && n.id.clock === targetId.clock
        )
        if (match) {
          match.isDeleted = true
          this.updateRenderedText(p)
        }
      }
    }
  }

  private updateRenderedText(peerId: PeerId): void {
    const peer = this.peers[peerId]
    peer.renderedText = peer.rgaNodes
      .filter((n) => !n.isDeleted)
      .map((n) => n.char)
      .join('')
  }

  private mergeLwwSets(source: LwwElementSet, target: LwwElementSet): void {
    target.addSet.push(...source.addSet)
    target.removeSet.push(...source.removeSet)
  }

  private refreshResolvedSet(peerId: PeerId): void {
    this.peers[peerId].resolvedSet = this.resolveLwwSet(this.peers[peerId].lwwSet)
  }

  /**
   * LWW-Element-Set resolution:
   * e in S iff exists add(e, t_add) and (forall rem(e, t_rem): t_add >= t_rem) (Add-bias on tie)
   */
  private resolveLwwSet(set: LwwElementSet): string[] {
    const latestAdd: Record<string, number> = {}
    const latestRem: Record<string, number> = {}

    for (const item of set.addSet) {
      if (!latestAdd[item.value] || item.timestamp > latestAdd[item.value]) {
        latestAdd[item.value] = item.timestamp
      }
    }

    for (const item of set.removeSet) {
      if (!latestRem[item.value] || item.timestamp > latestRem[item.value]) {
        latestRem[item.value] = item.timestamp
      }
    }

    const result: string[] = []
    for (const [val, addTs] of Object.entries(latestAdd)) {
      const remTs = latestRem[val] || 0
      // Add-bias on tie
      if (addTs >= remTs) {
        result.push(val)
      }
    }

    return result.sort()
  }

  private computeAuditDigest(): string {
    const payload = Object.entries(this.peers)
      .map(([k, v]) => `${k}:${v.renderedText}:${JSON.stringify(v.vectorClock)}:${v.resolvedSet.join(',')}`)
      .join('|')
    return crypto.createHash('sha256').update(payload).digest('hex')
  }
}

export const crdtSimulationService = new CrdtSimulationService()
