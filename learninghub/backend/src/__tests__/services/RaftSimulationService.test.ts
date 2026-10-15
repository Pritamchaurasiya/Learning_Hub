import { RaftSimulationService } from '../../services/RaftSimulationService'

describe('RaftSimulationService (Milestone 31 Distributed Consensus)', () => {
  let service: RaftSimulationService

  beforeEach(() => {
    service = new RaftSimulationService(5)
  })

  test('should initialize a 5-node cluster with exactly one leader and matching term', () => {
    const state = service.getClusterState()
    expect(state.nodes.length).toBe(5)
    expect(state.leaderId).toBe('node-1')

    const leader = state.nodes.find(n => n.id === state.leaderId)
    expect(leader?.role).toBe('LEADER')

    const followers = state.nodes.filter(n => n.id !== state.leaderId)
    expect(followers.every(f => f.role === 'FOLLOWER')).toBe(true)

    // Initial commit index and state machine
    expect(leader?.commitIndex).toBe(1)
    expect(leader?.stateMachine.cluster).toBe('online')
  })

  test('should advance simulation ticks and maintain leader heartbeats', () => {
    const initialTraffic = service.getClusterState().recentRpcTraffic.length
    service.tick(100)
    const state = service.getClusterState()
    expect(state.recentRpcTraffic.length).toBeGreaterThanOrEqual(initialTraffic)
  })

  test('should trigger election and elect new candidate with incremented term upon quorum', () => {
    const stateBefore = service.getClusterState()
    const initialTerm = stateBefore.term

    // Trigger election on node-2
    const stateAfter = service.startElection('node-2')
    const node2 = stateAfter.nodes.find(n => n.id === 'node-2')

    expect(node2?.role).toBe('LEADER')
    expect(node2?.currentTerm).toBe(initialTerm + 1)
    expect(stateAfter.leaderId).toBe('node-2')
  })

  test('should replicate client write commands and commit upon quorum', () => {
    const writeResult = service.submitClientCommand('SET distributed_db = rocksdb')
    expect(writeResult.success).toBe(true)
    expect(writeResult.committed).toBe(true)
    expect(writeResult.entryIndex).toBe(2)

    const leader = writeResult.clusterState.nodes.find(n => n.id === writeResult.leaderId)
    expect(leader?.log.length).toBe(2)
    expect(leader?.commitIndex).toBe(2)
    expect(leader?.stateMachine.distributed_db).toBe('rocksdb')

    // Reachable followers should also have the command committed and applied
    const followers = writeResult.clusterState.nodes.filter(n => n.role === 'FOLLOWER')
    for (const follower of followers) {
      expect(follower.commitIndex).toBe(2)
      expect(follower.stateMachine.distributed_db).toBe('rocksdb')
    }
  })

  test('should prevent write commits in minority partition and elect majority leader', () => {
    // Partition: Group A (node-1, node-2) vs Group B (node-3, node-4, node-5)
    service.partitionCluster({
      groupA: ['node-1', 'node-2'],
      groupB: ['node-3', 'node-4', 'node-5'],
    })

    const partitionedState = service.getClusterState()
    expect(partitionedState.networkPartitionActive).toBe(true)

    // Client attempts write to minority leader node-1
    const minorityWrite = service.submitClientCommand('SET payment_status = completed')
    expect(minorityWrite.success).toBe(true)
    // In 5-node cluster, 2 nodes is NOT a majority quorum (needs >= 3)
    expect(minorityWrite.committed).toBe(false)

    // Trigger election in majority partition (node-3)
    const majorityElection = service.startElection('node-3')
    const node3 = majorityElection.nodes.find(n => n.id === 'node-3')
    expect(node3?.role).toBe('LEADER')

    // Majority leader can commit writes
    const majorityWrite = service.submitClientCommand('SET ledger_balance = 5000')
    expect(majorityWrite.committed).toBe(true)
  })

  test('should heal partition and restore unified cluster state', () => {
    service.partitionCluster({
      groupA: ['node-1', 'node-2'],
      groupB: ['node-3', 'node-4', 'node-5'],
    })

    const healedState = service.healPartition()
    expect(healedState.networkPartitionActive).toBe(false)
    expect(healedState.nodes.every(n => n.partitionGroup === 'DEFAULT')).toBe(true)
  })

  test('should handle crashing and recovering nodes', () => {
    const crashedState = service.crashNode('node-2')
    const node2 = crashedState.nodes.find(n => n.id === 'node-2')
    expect(node2?.isAlive).toBe(false)
    expect(node2?.role).toBe('DEAD')

    const recoveredState = service.recoverNode('node-2')
    const recoveredNode2 = recoveredState.nodes.find(n => n.id === 'node-2')
    expect(recoveredNode2?.isAlive).toBe(true)
    expect(recoveredNode2?.role).toBe('FOLLOWER')
  })

  test('should verify all 5 Raft safety invariants and produce cryptographic audit digest', () => {
    const audit = service.verifyInvariants()
    expect(audit.electionSafetyPassed).toBe(true)
    expect(audit.leaderAppendOnlyPassed).toBe(true)
    expect(audit.logMatchingPassed).toBe(true)
    expect(audit.leaderCompletenessPassed).toBe(true)
    expect(audit.stateMachineSafetyPassed).toBe(true)
    expect(audit.allInvariantsSatisfied).toBe(true)
    expect(typeof audit.cryptographicAuditDigestSha256).toBe('string')
    expect(audit.cryptographicAuditDigestSha256.length).toBe(64)
    expect(audit.details.length).toBeGreaterThanOrEqual(5)
  })
})
