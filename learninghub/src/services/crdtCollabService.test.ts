import { describe, it, expect, vi, beforeEach } from 'vitest'
import { crdtCollabService } from './crdtCollabService'
import { CrdtStroke, CrdtCodeSnippet } from '../types/crdtCollab'
import { api } from '../utils/api'

vi.mock('../utils/api', () => ({
  api: {
    get: vi.fn(),
    post: vi.fn(),
  },
}))

describe('crdtCollabService (Milestone 19 CRDT & P2P Engine)', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('creates a new room with host peer and vector clock initialized', async () => {
    vi.mocked(api.post).mockResolvedValueOnce({
      data: {
        roomId: 'room-123456',
        roomName: 'Design Architecture Whiteboard',
        creatorId: 'peer-alice',
        createdAt: 1000,
        maxPeers: 8,
        peers: [
          {
            peerId: 'peer-alice',
            displayName: 'Room Creator',
            role: 'HOST',
            color: '#3B82F6',
            joinedAt: 1000,
            lastSeen: 1000,
            connectionType: 'P2P_WEBRTC',
            latencyMs: 12,
          },
        ],
        strokes: [],
        codeSnippets: [],
        vectorClock: { 'peer-alice': 1 },
      },
    })

    const room = await crdtCollabService.createRoom({
      roomName: 'Design Architecture Whiteboard',
      creatorId: 'peer-alice',
      maxPeers: 8,
    })

    expect(room).toBeDefined()
    expect(room.roomId).toBe('room-123456')
    expect(room.creatorId).toBe('peer-alice')
    expect(room.peers.length).toBe(1)
    expect(room.peers[0].role).toBe('HOST')
    expect(room.vectorClock['peer-alice']).toBe(1)
  })

  it('joins room and returns new peer presence', async () => {
    vi.mocked(api.post).mockResolvedValueOnce({
      data: {
        room: {
          roomId: 'room-test-123',
          roomName: 'Design Collab',
          creatorId: 'peer-host',
          createdAt: 1000,
          maxPeers: 6,
          peers: [],
          strokes: [],
          codeSnippets: [],
          vectorClock: {},
        },
        peer: {
          peerId: 'peer-bob-999',
          displayName: 'Bob Dev',
          role: 'PARTICIPANT',
          color: '#10B981',
          joinedAt: 1005,
          lastSeen: 1005,
          connectionType: 'P2P_WEBRTC',
          latencyMs: 15,
        },
      },
    })

    const result = await crdtCollabService.joinRoom('room-test-123', {
      displayName: 'Bob Dev',
      role: 'PARTICIPANT',
    })

    expect(result).toBeDefined()
    expect(result.peer.displayName).toBe('Bob Dev')
    expect(result.peer.role).toBe('PARTICIPANT')
    expect(result.peer.connectionType).toBe('P2P_WEBRTC')
  })

  it('merges new CRDT strokes deterministically', () => {
    const initialStroke: CrdtStroke = {
      id: 'stroke-1',
      peerId: 'alice',
      color: '#FF0000',
      width: 4,
      tool: 'pen',
      points: [{ x: 10, y: 10 }, { x: 20, y: 20 }],
      createdAt: 1000,
      lamportClock: 1,
    }

    const merged = crdtCollabService.mergeStrokes([], initialStroke)
    expect(merged.length).toBe(1)
    expect(merged[0].id).toBe('stroke-1')

    // Adding second distinct stroke
    const secondStroke: CrdtStroke = {
      id: 'stroke-2',
      peerId: 'bob',
      color: '#00FF00',
      width: 2,
      tool: 'pen',
      points: [{ x: 30, y: 30 }],
      createdAt: 1050,
      lamportClock: 2,
    }
    const mergedTwo = crdtCollabService.mergeStrokes(merged, secondStroke)
    expect(mergedTwo.length).toBe(2)
  })

  it('resolves concurrent CRDT stroke conflicts using Lamport clocks and peer tie-breaker', () => {
    const olderStroke: CrdtStroke = {
      id: 'stroke-1',
      peerId: 'alice',
      color: '#FF0000',
      width: 4,
      tool: 'pen',
      points: [{ x: 10, y: 10 }],
      createdAt: 1000,
      lamportClock: 2,
    }

    const newerStroke: CrdtStroke = {
      id: 'stroke-1',
      peerId: 'bob',
      color: '#0000FF',
      width: 6,
      tool: 'highlighter',
      points: [{ x: 10, y: 10 }, { x: 50, y: 50 }],
      createdAt: 1100,
      lamportClock: 3, // Higher Lamport clock wins
    }

    const state = [olderStroke]
    const updated = crdtCollabService.mergeStrokes(state, newerStroke)
    expect(updated.length).toBe(1)
    expect(updated[0].color).toBe('#0000FF')
    expect(updated[0].tool).toBe('highlighter')
    expect(updated[0].lamportClock).toBe(3)
  })

  it('merges code snippets using LWW register semantics', () => {
    const initialSnippet: CrdtCodeSnippet = {
      id: 'snippet-1',
      peerId: 'alice',
      title: 'CRDT Math',
      language: 'typescript',
      code: 'function add(a: number, b: number) { return a + b }',
      lamportClock: 1,
      updatedAt: 1000,
    }

    const updatedSnippet: CrdtCodeSnippet = {
      id: 'snippet-1',
      peerId: 'bob',
      title: 'CRDT Math & Vector Clocks',
      language: 'typescript',
      code: 'function add(a: number, b: number) { return a + b + lamport }',
      lamportClock: 2,
      updatedAt: 1200,
    }

    const merged = crdtCollabService.mergeCodeSnippets([initialSnippet], updatedSnippet)
    expect(merged.length).toBe(1)
    expect(merged[0].code).toContain('lamport')
    expect(merged[0].lamportClock).toBe(2)
  })

  it('advances vector clock and computes peer convergence metrics', () => {
    const clock = { alice: 5, bob: 5 }
    const advanced = crdtCollabService.advanceVectorClock(clock, 'alice')
    expect(advanced.lamport).toBe(6)
    expect(advanced.clock.alice).toBe(6)

    const peers = [
      {
        peerId: 'alice',
        displayName: 'Alice',
        role: 'HOST' as const,
        color: '#3B82F6',
        joinedAt: 1,
        lastSeen: 1,
        connectionType: 'P2P_WEBRTC' as const,
        latencyMs: 10,
      },
      {
        peerId: 'bob',
        displayName: 'Bob',
        role: 'PARTICIPANT' as const,
        color: '#10B981',
        joinedAt: 1,
        lastSeen: 1,
        connectionType: 'P2P_WEBRTC' as const,
        latencyMs: 15,
      },
    ]

    const convergence = crdtCollabService.calculateConvergence(peers, { alice: 10, bob: 10 })
    expect(convergence).toBe(100)

    const skewedConvergence = crdtCollabService.calculateConvergence(peers, { alice: 10, bob: 1 })
    expect(skewedConvergence).toBeLessThan(50)
  })

  it('serializes strokes to standalone SVG graphics', () => {
    const strokes: CrdtStroke[] = [
      {
        id: 's1',
        peerId: 'alice',
        color: '#10B981',
        width: 3,
        tool: 'pen',
        points: [{ x: 50, y: 50 }, { x: 100, y: 150 }],
        createdAt: 100,
        lamportClock: 1,
      },
      {
        id: 's2',
        peerId: 'bob',
        color: '#3B82F6',
        width: 2,
        tool: 'shape',
        shapeType: 'rectangle',
        points: [{ x: 200, y: 200 }, { x: 400, y: 350 }],
        createdAt: 120,
        lamportClock: 2,
      },
    ]

    const svg = crdtCollabService.serializeCanvasSvg(strokes, 1920, 1080)
    expect(svg).toContain('<svg xmlns="http://www.w3.org/2000/svg"')
    expect(svg).toContain('viewBox="0 0 1920 1080"')
    expect(svg).toContain('<path d="M 50 50 L 100 150"')
    expect(svg).toContain('<rect x="200" y="200"')
  })

  it('generates an IPFS multihash snapshot', async () => {
    vi.mocked(api.post).mockResolvedValueOnce({
      data: {
        snapshotCid: 'bafybeicollab998877665544',
      },
    })

    const roomState = {
      roomId: 'room-123',
      roomName: 'Snapshot Test',
      creatorId: 'alice',
      createdAt: 1,
      maxPeers: 4,
      peers: [],
      strokes: [],
      codeSnippets: [],
      vectorClock: {},
    }
    const snapshot = await crdtCollabService.saveSnapshot(roomState.roomId, roomState)

    expect(snapshot).toBeDefined()
    expect(snapshot.snapshotCid).toMatch(/^bafybei/)
  })
})
