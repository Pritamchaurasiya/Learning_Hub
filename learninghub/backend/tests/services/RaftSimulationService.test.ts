import { RaftSimulationService } from '../../src/services/RaftSimulationService'

describe('RaftSimulationService Unit Tests', () => {
  let raftService: RaftSimulationService

  beforeEach(() => {
    raftService = new RaftSimulationService(5)
  })

  describe('Cluster Initialization', () => {
    it('initializes a 5-node cluster with followers and elected leader by default', () => {
      const state = raftService.getClusterState()
      expect(state.nodes.length).toBe(5)
      expect(state.term).toBeGreaterThanOrEqual(1)
      expect(state.networkPartitionActive).toBe(false)
      expect(state.leaderId).toBe('node-1')

      state.nodes.forEach(node => {
        expect(node.isAlive).toBe(true)
        expect(node.log.length).toBeGreaterThanOrEqual(1)
      })
    })

    it('customizes initial node count', () => {
      const customCluster = new RaftSimulationService(3)
      const state = customCluster.getClusterState()
      expect(state.nodes.length).toBe(3)
    })
  })

  describe('Election and Heartbeats', () => {
    it('elects a leader when election timeout is triggered', () => {
      // Force crash node-1 so new leader must be elected
      raftService.crashNode('node-1')
      const stateAfterCrash = raftService.tick(600)
      const aliveLeader = stateAfterCrash.nodes.find(n => n.role === 'LEADER' && n.isAlive)
      expect(aliveLeader).toBeDefined()
      expect(aliveLeader?.id).not.toBe('node-1')
    })

    it('satisfies Election Safety invariant (at most one leader per term)', () => {
      raftService.tick(500)
      const audit = raftService.verifyInvariants()
      expect(audit.electionSafetyPassed).toBe(true)
    })
  })

  describe('Log Replication and Commit', () => {
    it('appends and commits client commands via leader', () => {
      const result = raftService.submitClientCommand('SET x = 42')
      expect(result.success).toBe(true)
      expect(result.entryIndex).toBeGreaterThanOrEqual(2)

      const leaderNode = result.clusterState.nodes.find(n => n.id === result.leaderId)
      expect(leaderNode?.log.some(e => e.command === 'SET x = 42')).toBe(true)

      // Advance clock for heartbeat quorum confirmation
      const stateAfterTick = raftService.tick(200)
      const leaderAfter = stateAfterTick.nodes.find(n => n.id === stateAfterTick.leaderId)
      expect(leaderAfter?.commitIndex).toBeGreaterThanOrEqual(2)
    })

    it('handles client commands when all leaders are crashed', () => {
      // Crash all nodes
      const state = raftService.getClusterState()
      state.nodes.forEach(n => raftService.crashNode(n.id))

      const result = raftService.submitClientCommand('SET counter = 1')
      expect(result.success).toBe(false)
      expect(result.leaderId).toBeNull()
    })
  })

  describe('Fault Injection: Node Crash & Recovery', () => {
    it('crashes a specific node and updates its state', () => {
      const state = raftService.getClusterState()
      const targetNode = state.nodes[0]

      const crashedState = raftService.crashNode(targetNode.id)
      const crashedNode = crashedState.nodes.find(n => n.id === targetNode.id)
      expect(crashedNode?.isAlive).toBe(false)
      expect(crashedNode?.role).toBe('DEAD')
    })

    it('recovers a crashed node back to FOLLOWER', () => {
      const state = raftService.getClusterState()
      const targetNode = state.nodes[0]

      raftService.crashNode(targetNode.id)
      const recoveredState = raftService.recoverNode(targetNode.id)
      const recoveredNode = recoveredState.nodes.find(n => n.id === targetNode.id)
      expect(recoveredNode?.isAlive).toBe(true)
      expect(recoveredNode?.role).toBe('FOLLOWER')
    })
  })

  describe('Network Partitioning and Healing', () => {
    it('partitions the cluster into two isolated sub-groups', () => {
      const state = raftService.getClusterState()
      const groupA = [state.nodes[0].id, state.nodes[1].id, state.nodes[2].id]
      const groupB = [state.nodes[3].id, state.nodes[4].id]

      const partitionedState = raftService.partitionCluster({ groupA, groupB })
      expect(partitionedState.networkPartitionActive).toBe(true)
      expect(partitionedState.partitionGroups.groupA).toEqual(groupA)
      expect(partitionedState.partitionGroups.groupB).toEqual(groupB)
    })

    it('heals partition and restores full cluster communication', () => {
      const state = raftService.getClusterState()
      raftService.partitionCluster({
        groupA: [state.nodes[0].id, state.nodes[1].id],
        groupB: [state.nodes[2].id, state.nodes[3].id, state.nodes[4].id],
      })

      const healedState = raftService.healPartition()
      expect(healedState.networkPartitionActive).toBe(false)
      expect(healedState.partitionGroups.groupA.length).toBe(0)
    })
  })

  describe('Formal Safety Invariants Verification', () => {
    it('verifies all 5 formal Raft invariants pass in healthy cluster', () => {
      raftService.submitClientCommand('SET key = 100')
      raftService.tick(200)

      const audit = raftService.verifyInvariants()
      expect(audit.electionSafetyPassed).toBe(true)
      expect(audit.leaderAppendOnlyPassed).toBe(true)
      expect(audit.logMatchingPassed).toBe(true)
      expect(audit.leaderCompletenessPassed).toBe(true)
      expect(audit.stateMachineSafetyPassed).toBe(true)
    })
  })
})
