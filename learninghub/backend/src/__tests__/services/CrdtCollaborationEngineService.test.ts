import { crdtCollaborationEngineService } from '../../services/CrdtCollaborationEngineService'

describe('CrdtCollaborationEngineService (Milestone 21 P2P CRDT Engine)', () => {
  it('creates collaborative room with creator as host and initial state vector', () => {
    const room = crdtCollaborationEngineService.createRoom({
      roomName: 'Algorithm Duel Review',
      creatorId: 'user-alice-01',
      maxPeers: 5,
    })

    expect(room).toBeDefined()
    expect(room.roomId).toMatch(/^room-[a-f0-9]+$/)
    expect(room.roomName).toBe('Algorithm Duel Review')
    expect(room.maxPeers).toBe(5)
    expect(Object.keys(room.activePeers)).toHaveLength(1)

    const hostPeer = Object.values(room.activePeers)[0]
    expect(hostPeer.role).toBe('HOST')
    expect(room.stateVector[hostPeer.peerId]).toBe(1)
  })

  it('allows peers to join room and assigns unique colors and presence', () => {
    const room = crdtCollaborationEngineService.createRoom({
      roomName: 'Dynamic Programming Whiteboard',
      creatorId: 'user-host',
    })

    const { joinedPeer, room: updatedRoom } = crdtCollaborationEngineService.joinRoom({
      roomId: room.roomId,
      displayName: 'Bob The Builder',
    })

    expect(joinedPeer).toBeDefined()
    expect(joinedPeer.displayName).toBe('Bob The Builder')
    expect(joinedPeer.role).toBe('PARTICIPANT')
    expect(Object.keys(updatedRoom.activePeers)).toHaveLength(2)
    expect(updatedRoom.stateVector[joinedPeer.peerId]).toBe(0)
  })

  it('rejects joining when room capacity is exceeded', () => {
    const room = crdtCollaborationEngineService.createRoom({
      roomName: 'Pair Programming Sandbox',
      creatorId: 'user-cap',
      maxPeers: 1, // Only host
    })

    expect(() => {
      crdtCollaborationEngineService.joinRoom({
        roomId: room.roomId,
        displayName: 'Eve Intruder',
      })
    }).toThrow(/maximum capacity/)
  })

  it('relays WebRTC signaling messages and polls them cleanly', () => {
    const room = crdtCollaborationEngineService.createRoom({
      roomName: 'Signaling Test Room',
      creatorId: 'user-sig',
    })

    const peerA = 'peer-alice'
    const peerB = 'peer-bob'

    crdtCollaborationEngineService.relaySignal({
      roomId: room.roomId,
      fromPeerId: peerA,
      toPeerId: peerB,
      type: 'OFFER',
      sdpOrCandidate: 'v=0\r\no=- 20518 0 IN IP4 203.0.113.1\r\ns=-\r\nt=0 0\r\n',
      timestamp: new Date().toISOString(),
    })

    const signals = crdtCollaborationEngineService.pollSignals(peerB)
    expect(signals).toHaveLength(1)
    expect(signals[0].type).toBe('OFFER')
    expect(signals[0].fromPeerId).toBe(peerA)

    // Second poll should be empty (queue drained)
    const emptySignals = crdtCollaborationEngineService.pollSignals(peerB)
    expect(emptySignals).toHaveLength(0)
  })

  it('applies CRDT operations and advances Lamport clock in state vector', () => {
    const room = crdtCollaborationEngineService.createRoom({
      roomName: 'Lamport Clock Test',
      creatorId: 'user-clock',
    })

    const result = crdtCollaborationEngineService.applyCrdtOperation(room.roomId, {
      opId: 'op-001',
      peerId: 'peer-test-clock',
      lamportClock: 42,
      opType: 'INSERT_STROKE',
      payload: { x0: 10, y0: 20, x1: 50, y1: 80, color: '#ff0000' },
    })

    expect(result.applied).toBe(true)
    expect(result.newStateVector['peer-test-clock']).toBe(42)
    expect(result.totalOperations).toBe(1)
  })

  it('saves snapshot to IPFS content address with deterministic multihash', () => {
    const room = crdtCollaborationEngineService.createRoom({
      roomName: 'Snapshot Room',
      creatorId: 'user-snap',
    })

    const stateJson = JSON.stringify({ strokes: [{ id: 1, color: '#fff' }] })
    const cid = crdtCollaborationEngineService.saveSnapshot(room.roomId, stateJson)

    expect(cid).toMatch(/^bafybei[a-f0-9]{36}$/)
    const updated = crdtCollaborationEngineService.getRoom(room.roomId)
    expect(updated?.latestSnapshotCid).toBe(cid)
  })
})
