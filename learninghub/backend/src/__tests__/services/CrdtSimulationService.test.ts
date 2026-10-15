import { CrdtSimulationService } from '../../services/CrdtSimulationService'

describe('CrdtSimulationService (Milestone 35)', () => {
  let service: CrdtSimulationService

  beforeEach(() => {
    service = new CrdtSimulationService()
  })

  describe('Topology & Initialization', () => {
    it('initializes with default peers alice, bob, and charlie with initial "CRDT" text', () => {
      const topology = service.getTopology()
      expect(topology.peers.alice).toBeDefined()
      expect(topology.peers.bob).toBeDefined()
      expect(topology.peers.charlie).toBeDefined()
      expect(topology.peers.alice.renderedText).toBe('CRDT')
      expect(topology.peers.bob.renderedText).toBe('CRDT')
      expect(topology.peers.charlie.renderedText).toBe('CRDT')
      expect(topology.isPartitioned).toBe(false)
      expect(topology.auditDigest).toBeDefined()
      expect(topology.auditDigest.length).toBe(64)
    })
  })

  describe('RGA Text Operations (Concurrent Commutative Editing)', () => {
    it('inserts characters locally and broadcasts to connected peers', () => {
      // Alice inserts '!' at index 4 (end of "CRDT")
      const updated = service.localInsert('alice', 4, '!')
      expect(updated.renderedText).toBe('CRDT!')

      const topology = service.getTopology()
      expect(topology.peers.bob.renderedText).toBe('CRDT!')
      expect(topology.peers.charlie.renderedText).toBe('CRDT!')
      expect(topology.peers.alice.vectorClock.alice).toBeGreaterThan(4)
    })

    it('marks character as deleted tombstone and updates rendered text', () => {
      // "CRDT" -> delete index 0 ('C') -> "RDT"
      const updated = service.localDelete('alice', 0)
      expect(updated.renderedText).toBe('RDT')

      const topology = service.getTopology()
      expect(topology.peers.bob.renderedText).toBe('RDT')
    })
  })

  describe('Network Partitioning & Divergence Reconvergence', () => {
    it('permits concurrent divergent editing during network partition and converges deterministically upon heal', () => {
      // Isolate Charlie
      service.setPartition('charlie', true)
      const topoPartitioned = service.getTopology()
      expect(topoPartitioned.isPartitioned).toBe(true)
      expect(topoPartitioned.isolatedPeers).toContain('charlie')
      expect(topoPartitioned.peers.charlie.isOnline).toBe(false)

      // Alice types 'X' at index 4 -> "CRDTX"
      service.localInsert('alice', 4, 'X')
      expect(service.getTopology().peers.alice.renderedText).toBe('CRDTX')
      expect(service.getTopology().peers.bob.renderedText).toBe('CRDTX')
      // Charlie still has "CRDT"
      expect(service.getTopology().peers.charlie.renderedText).toBe('CRDT')

      // Charlie concurrently types 'Y' at index 4 -> "CRDTY"
      service.localInsert('charlie', 4, 'Y')
      expect(service.getTopology().peers.charlie.renderedText).toBe('CRDTY')

      // Heal partition -> triggers automatic syncAll()
      const healedTopo = service.setPartition('charlie', false)
      expect(healedTopo.isPartitioned).toBe(false)
      expect(healedTopo.peers.charlie.isOnline).toBe(true)

      // Both must converge to the EXACT same text deterministically
      const aliceText = healedTopo.peers.alice.renderedText
      const bobText = healedTopo.peers.bob.renderedText
      const charlieText = healedTopo.peers.charlie.renderedText

      expect(aliceText).toBe(bobText)
      expect(bobText).toBe(charlieText)
      // Both 'X' and 'Y' must be present without data loss
      expect(aliceText).toContain('X')
      expect(aliceText).toContain('Y')
    })
  })

  describe('LWW-Register & LWW-Element-Set Semantics', () => {
    it('updates LWW register using highest timestamp tie-breaker', () => {
      const reg1 = service.updateLwwRegister('alice', 'title', 'First Title', 1000)
      expect(reg1.value).toBe('First Title')

      // Bob updates with higher timestamp -> wins
      const reg2 = service.updateLwwRegister('bob', 'title', 'Second Title', 2000)
      expect(reg2.value).toBe('Second Title')

      const topo = service.getTopology()
      expect(topo.peers.alice.lwwRegisters['title'].value).toBe('Second Title')
      expect(topo.peers.bob.lwwRegisters['title'].value).toBe('Second Title')

      // Alice attempts update with older timestamp 1500 -> ignored by Bob
      service.updateLwwRegister('alice', 'title', 'Stale Title', 1500)
      const topo2 = service.getTopology()
      expect(topo2.peers.bob.lwwRegisters['title'].value).toBe('Second Title')
    })

    it('resolves LWW-Element-Set with Add-bias upon identical timestamp', () => {
      const ts = 5000
      // Add and remove at exact same timestamp
      service.mutateLwwSet('alice', 'ADD', 'RaftConsensus', ts)
      service.mutateLwwSet('alice', 'REMOVE', 'RaftConsensus', ts)

      // Add bias means element remains in resolved set
      const topo = service.getTopology()
      expect(topo.peers.alice.resolvedSet).toContain('RaftConsensus')

      // If remove timestamp is strictly higher, element is deleted
      service.mutateLwwSet('alice', 'REMOVE', 'RaftConsensus', ts + 1)
      const topo2 = service.getTopology()
      expect(topo2.peers.alice.resolvedSet).not.toContain('RaftConsensus')
    })
  })

  describe('Mathematical Algebraic Proofs (Join-Semilattice)', () => {
    it('formally proves Commutativity, Associativity, and Idempotence', () => {
      const proof = service.verifyAlgebraicLaws()
      expect(proof.isCommutative).toBe(true)
      expect(proof.isAssociative).toBe(true)
      expect(proof.isIdempotent).toBe(true)
      expect(proof.convergenceVerified).toBe(true)
      expect(proof.leftRightHash).toBe(proof.rightLeftHash)
      expect(proof.proofDetails).toContain('semilattice')
    })
  })
})
