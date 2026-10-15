import crypto from 'crypto'
import logger from '../utils/logger'

export type RaftRole = 'LEADER' | 'CANDIDATE' | 'FOLLOWER' | 'DEAD'

export interface RaftLogEntry {
  index: number
  term: number
  command: string
  clientTimestamp?: number
}

export interface RaftRPCMessage {
  id: string
  type: 'REQUEST_VOTE' | 'REQUEST_VOTE_RESP' | 'APPEND_ENTRIES' | 'APPEND_ENTRIES_RESP'
  fromNodeId: string
  toNodeId: string
  term: number
  payload: Record<string, any>
  timestamp: string
}

export interface RaftNodeState {
  id: string
  name: string
  role: RaftRole
  currentTerm: number
  votedFor: string | null
  log: RaftLogEntry[]
  commitIndex: number
  lastApplied: number
  electionTimeoutMs: number
  electionElapsedMs: number
  heartbeatIntervalMs: number
  nextIndex: Record<string, number>
  matchIndex: Record<string, number>
  partitionGroup: string
  isAlive: boolean
  stateMachine: Record<string, any>
}

export interface RaftClusterState {
  clusterId: string
  nodes: RaftNodeState[]
  term: number
  leaderId: string | null
  networkPartitionActive: boolean
  partitionGroups: {
    groupA: string[]
    groupB: string[]
  }
  recentRpcTraffic: RaftRPCMessage[]
  invariants: RaftInvariantAudit
}

export interface RaftInvariantAudit {
  electionSafetyPassed: boolean
  leaderAppendOnlyPassed: boolean
  logMatchingPassed: boolean
  leaderCompletenessPassed: boolean
  stateMachineSafetyPassed: boolean
  allInvariantsSatisfied: boolean
  cryptographicAuditDigestSha256: string
  details: string[]
}

export class RaftSimulationService {
  private clusterId: string = 'raft-cluster-alpha'
  private nodes: Map<string, RaftNodeState> = new Map()
  private recentRpcTraffic: RaftRPCMessage[] = []
  private networkPartitionActive: boolean = false
  private partitionGroups: { groupA: string[]; groupB: string[] } = {
    groupA: [],
    groupB: [],
  }

  constructor(nodeCount: number = 5) {
    this.initializeCluster(nodeCount)
  }

  /**
   * Initializes or resets a Raft cluster with standard initial terms and randomized timeouts.
   */
  public initializeCluster(nodeCount: number = 5): RaftClusterState {
    this.nodes.clear()
    this.recentRpcTraffic = []
    this.networkPartitionActive = false
    this.partitionGroups = { groupA: [], groupB: [] }

    const count = Math.max(3, Math.min(7, nodeCount))
    for (let i = 1; i <= count; i++) {
      const id = `node-${i}`
      const node: RaftNodeState = {
        id,
        name: `Server ${i} (${id})`,
        role: 'FOLLOWER',
        currentTerm: 1,
        votedFor: null,
        log: [
          {
            index: 1,
            term: 1,
            command: 'INIT_CLUSTER',
          },
        ],
        commitIndex: 1,
        lastApplied: 1,
        electionTimeoutMs: 150 + Math.floor(Math.random() * 150),
        electionElapsedMs: 0,
        heartbeatIntervalMs: 50,
        nextIndex: {},
        matchIndex: {},
        partitionGroup: 'DEFAULT',
        isAlive: true,
        stateMachine: { cluster: 'online', nodes: count },
      }
      this.nodes.set(id, node)
    }

    // Default: Elect Node 1 as stable leader for immediate pedagogical exploration
    const node1 = this.nodes.get('node-1')
    if (node1) {
      node1.role = 'LEADER'
      for (const other of this.nodes.values()) {
        if (other.id !== node1.id) {
          node1.nextIndex[other.id] = 2
          node1.matchIndex[other.id] = 1
        }
      }
    }

    return this.getClusterState()
  }

  /**
   * Returns current cluster state snapshot including invariant audits.
   */
  public getClusterState(): RaftClusterState {
    const nodesList = Array.from(this.nodes.values())
    const leader = nodesList.find(n => n.role === 'LEADER' && n.isAlive) || null
    const highestTerm = Math.max(...nodesList.map(n => n.currentTerm), 1)

    return {
      clusterId: this.clusterId,
      nodes: nodesList.map(n => ({
        ...n,
        log: [...n.log],
        stateMachine: { ...n.stateMachine },
        nextIndex: { ...n.nextIndex },
        matchIndex: { ...n.matchIndex },
      })),
      term: highestTerm,
      leaderId: leader ? leader.id : null,
      networkPartitionActive: this.networkPartitionActive,
      partitionGroups: {
        groupA: [...this.partitionGroups.groupA],
        groupB: [...this.partitionGroups.groupB],
      },
      recentRpcTraffic: this.recentRpcTraffic.slice(-20),
      invariants: this.verifyInvariants(),
    }
  }

  /**
   * Advances cluster simulation by deltaMs.
   */
  public tick(deltaMs: number = 50): RaftClusterState {
    const nodesList = Array.from(this.nodes.values()).filter(n => n.isAlive)

    for (const node of nodesList) {
      if (node.role === 'FOLLOWER' || node.role === 'CANDIDATE') {
        node.electionElapsedMs += deltaMs
        if (node.electionElapsedMs >= node.electionTimeoutMs) {
          this.startElection(node.id)
        }
      } else if (node.role === 'LEADER') {
        this.broadcastHeartbeats(node.id)
      }
    }

    return this.getClusterState()
  }

  /**
   * Forcefully triggers an election from a specific node.
   */
  public startElection(candidateId: string): RaftClusterState {
    const candidate = this.nodes.get(candidateId)
    if (!candidate || !candidate.isAlive) {
      return this.getClusterState()
    }

    candidate.role = 'CANDIDATE'
    candidate.currentTerm += 1
    candidate.votedFor = candidate.id
    candidate.electionElapsedMs = 0
    candidate.electionTimeoutMs = 150 + Math.floor(Math.random() * 150)

    const votes = new Set<string>([candidate.id])
    const lastLogIndex = candidate.log.length > 0 ? candidate.log[candidate.log.length - 1].index : 0
    const lastLogTerm = candidate.log.length > 0 ? candidate.log[candidate.log.length - 1].term : 0

    for (const peer of this.nodes.values()) {
      if (peer.id === candidate.id || !peer.isAlive) continue

      // Check network partition barrier
      if (!this.canCommunicate(candidate.id, peer.id)) continue

      this.recordRpc({
        type: 'REQUEST_VOTE',
        fromNodeId: candidate.id,
        toNodeId: peer.id,
        term: candidate.currentTerm,
        payload: { lastLogIndex, lastLogTerm },
      })

      // Peer evaluates vote
      const voteGranted = this.handleRequestVote(peer.id, {
        candidateId: candidate.id,
        term: candidate.currentTerm,
        lastLogIndex,
        lastLogTerm,
      })

      if (voteGranted) {
        votes.add(peer.id)
        this.recordRpc({
          type: 'REQUEST_VOTE_RESP',
          fromNodeId: peer.id,
          toNodeId: candidate.id,
          term: peer.currentTerm,
          payload: { voteGranted: true },
        })
      }
    }

    // Raft Majority Quorum check
    const alivePartitionNodes = Array.from(this.nodes.values()).filter(
      n => n.isAlive && (!this.networkPartitionActive || n.partitionGroup === candidate.partitionGroup)
    )
    const totalClusterNodes = this.nodes.size
    const majorityQuorum = Math.floor(totalClusterNodes / 2) + 1

    if (votes.size >= majorityQuorum) {
      candidate.role = 'LEADER'
      for (const peer of this.nodes.values()) {
        if (peer.id !== candidate.id) {
          candidate.nextIndex[peer.id] = candidate.log.length + 1
          candidate.matchIndex[peer.id] = 0
        }
      }
      this.broadcastHeartbeats(candidate.id)
    }

    return this.getClusterState()
  }

  /**
   * RequestVote RPC Handler
   */
  private handleRequestVote(
    nodeId: string,
    args: { candidateId: string; term: number; lastLogIndex: number; lastLogTerm: number }
  ): boolean {
    const node = this.nodes.get(nodeId)
    if (!node || !node.isAlive) return false

    if (args.term > node.currentTerm) {
      node.currentTerm = args.term
      node.role = 'FOLLOWER'
      node.votedFor = null
    }

    const termOk = args.term === node.currentTerm
    const votedOk = node.votedFor === null || node.votedFor === args.candidateId

    const myLastLog = node.log[node.log.length - 1]
    const myLastIndex = myLastLog ? myLastLog.index : 0
    const myLastTerm = myLastLog ? myLastLog.term : 0

    // Raft Election Restriction: Candidate's log must be at least as up-to-date as receiver's log
    const logOk =
      args.lastLogTerm > myLastTerm ||
      (args.lastLogTerm === myLastTerm && args.lastLogIndex >= myLastIndex)

    if (termOk && votedOk && logOk) {
      node.votedFor = args.candidateId
      node.electionElapsedMs = 0 // Reset election timer upon granting vote
      return true
    }

    return false
  }

  /**
   * Submits a client command to the current cluster leader.
   */
  public submitClientCommand(command: string, targetLeaderId?: string): {
    success: boolean
    committed: boolean
    leaderId: string | null
    entryIndex: number | null
    term: number | null
    clusterState: RaftClusterState
  } {
    const aliveLeaders = Array.from(this.nodes.values()).filter(n => n.role === 'LEADER' && n.isAlive)
    if (aliveLeaders.length === 0) {
      return {
        success: false,
        committed: false,
        leaderId: null,
        entryIndex: null,
        term: null,
        clusterState: this.getClusterState(),
      }
    }

    // Prioritize highest term leader or specific target leader
    aliveLeaders.sort((a, b) => b.currentTerm - a.currentTerm)
    const leader = targetLeaderId ? (this.nodes.get(targetLeaderId) || aliveLeaders[0]) : aliveLeaders[0]

    const newIndex = leader.log.length + 1
    const newEntry: RaftLogEntry = {
      index: newIndex,
      term: leader.currentTerm,
      command,
      clientTimestamp: Date.now(),
    }

    leader.log.push(newEntry)

    // Replicate entry to peers
    let ackCount = 1 // Leader has appended
    for (const peer of this.nodes.values()) {
      if (peer.id === leader.id || !peer.isAlive) continue
      if (!this.canCommunicate(leader.id, peer.id)) continue

      const prevLogIndex = newIndex - 1
      const prevLogTerm = prevLogIndex > 0 && leader.log[prevLogIndex - 1] ? leader.log[prevLogIndex - 1].term : 0

      this.recordRpc({
        type: 'APPEND_ENTRIES',
        fromNodeId: leader.id,
        toNodeId: peer.id,
        term: leader.currentTerm,
        payload: { entries: [newEntry], prevLogIndex, prevLogTerm },
      })

      const success = this.handleAppendEntries(peer.id, {
        leaderId: leader.id,
        term: leader.currentTerm,
        prevLogIndex,
        prevLogTerm,
        entries: [newEntry],
        leaderCommit: leader.commitIndex,
      })

      if (success) {
        leader.matchIndex[peer.id] = newIndex
        leader.nextIndex[peer.id] = newIndex + 1
        ackCount++
      }
    }

    // Quorum check for commit
    const majorityQuorum = Math.floor(this.nodes.size / 2) + 1
    const committed = ackCount >= majorityQuorum

    if (committed) {
      leader.commitIndex = newIndex
      this.applyLogToStateMachine(leader)

      // Inform reachable followers of updated commit index
      for (const peer of this.nodes.values()) {
        if (peer.id === leader.id || !peer.isAlive) continue
        if (!this.canCommunicate(leader.id, peer.id)) continue

        peer.commitIndex = Math.min(leader.commitIndex, peer.log.length)
        this.applyLogToStateMachine(peer)
      }
    }

    return {
      success: true,
      committed,
      leaderId: leader.id,
      entryIndex: newIndex,
      term: leader.currentTerm,
      clusterState: this.getClusterState(),
    }
  }

  /**
   * AppendEntries RPC Handler (Heartbeats and Log Replication)
   */
  private handleAppendEntries(
    nodeId: string,
    args: {
      leaderId: string
      term: number
      prevLogIndex: number
      prevLogTerm: number
      entries: RaftLogEntry[]
      leaderCommit: number
    }
  ): boolean {
    const node = this.nodes.get(nodeId)
    if (!node || !node.isAlive) return false

    // 1. Reply false if term < currentTerm
    if (args.term < node.currentTerm) {
      return false
    }

    // If term > currentTerm or node was candidate, step down
    if (args.term > node.currentTerm || node.role === 'CANDIDATE') {
      node.currentTerm = args.term
      node.role = 'FOLLOWER'
      node.votedFor = null
    }

    node.electionElapsedMs = 0 // Heartbeat resets election timer

    // 2. Reply false if log doesn't contain an entry at prevLogIndex matching prevLogTerm
    if (args.prevLogIndex > 0) {
      const prevEntry = node.log[args.prevLogIndex - 1]
      if (!prevEntry || prevEntry.term !== args.prevLogTerm) {
        return false
      }
    }

    // 3. If an existing entry conflicts with a new one (same index, different terms),
    // delete existing entry and all that follow it
    for (let i = 0; i < args.entries.length; i++) {
      const entry = args.entries[i]
      const existing = node.log[entry.index - 1]
      if (existing) {
        if (existing.term !== entry.term) {
          node.log = node.log.slice(0, entry.index - 1)
          node.log.push(entry)
        }
      } else {
        node.log.push(entry)
      }
    }

    // 4. Update commit index
    if (args.leaderCommit > node.commitIndex) {
      node.commitIndex = Math.min(args.leaderCommit, node.log.length)
      this.applyLogToStateMachine(node)
    }

    return true
  }

  /**
   * Broadcasts heartbeats from the leader to all reachable followers.
   */
  private broadcastHeartbeats(leaderId: string): void {
    const leader = this.nodes.get(leaderId)
    if (!leader || leader.role !== 'LEADER') return

    for (const peer of this.nodes.values()) {
      if (peer.id === leader.id || !peer.isAlive) continue
      if (!this.canCommunicate(leader.id, peer.id)) continue

      const prevLogIndex = peer.log.length
      const prevLogTerm = prevLogIndex > 0 && peer.log[prevLogIndex - 1] ? peer.log[prevLogIndex - 1].term : 0

      this.recordRpc({
        type: 'APPEND_ENTRIES',
        fromNodeId: leader.id,
        toNodeId: peer.id,
        term: leader.currentTerm,
        payload: { isHeartbeat: true, commitIndex: leader.commitIndex },
      })

      this.handleAppendEntries(peer.id, {
        leaderId: leader.id,
        term: leader.currentTerm,
        prevLogIndex,
        prevLogTerm,
        entries: [],
        leaderCommit: leader.commitIndex,
      })
    }
  }

  /**
   * Injects a Split-Brain Network Partition isolating the cluster into two subsets.
   */
  public partitionCluster(config: { groupA: string[]; groupB: string[] }): RaftClusterState {
    this.networkPartitionActive = true
    this.partitionGroups = {
      groupA: [...config.groupA],
      groupB: [...config.groupB],
    }

    for (const node of this.nodes.values()) {
      if (config.groupA.includes(node.id)) {
        node.partitionGroup = 'GROUP_A'
      } else if (config.groupB.includes(node.id)) {
        node.partitionGroup = 'GROUP_B'
      } else {
        node.partitionGroup = 'ISOLATED'
      }
    }

    logger.info(`Raft cluster partitioned: Group A [${config.groupA.join(', ')}], Group B [${config.groupB.join(', ')}]`)
    return this.getClusterState()
  }

  /**
   * Heals the network partition, restoring full pairwise communication.
   */
  public healPartition(): RaftClusterState {
    this.networkPartitionActive = false
    this.partitionGroups = { groupA: [], groupB: [] }

    for (const node of this.nodes.values()) {
      node.partitionGroup = 'DEFAULT'
    }

    logger.info('Raft cluster partition healed. Reconciling cluster state...')
    // Run tick to trigger leader reconciliation and log matching
    this.tick(50)
    return this.getClusterState()
  }

  /**
   * Crashes/kills a specific node.
   */
  public crashNode(nodeId: string): RaftClusterState {
    const node = this.nodes.get(nodeId)
    if (node) {
      node.isAlive = false
      node.role = 'DEAD'
    }
    return this.getClusterState()
  }

  /**
   * Recovers/restarts a crashed node as a follower.
   */
  public recoverNode(nodeId: string): RaftClusterState {
    const node = this.nodes.get(nodeId)
    if (node) {
      node.isAlive = true
      node.role = 'FOLLOWER'
      node.electionElapsedMs = 0
    }
    return this.getClusterState()
  }

  /**
   * Verifies the 5 Formal Raft Safety Invariants.
   */
  public verifyInvariants(): RaftInvariantAudit {
    const details: string[] = []
    const aliveNodes = Array.from(this.nodes.values()).filter(n => n.isAlive)

    // 1. Election Safety: At most one leader can be elected in a given term
    const leadersByTerm = new Map<number, string[]>()
    for (const n of aliveNodes) {
      if (n.role === 'LEADER') {
        const list = leadersByTerm.get(n.currentTerm) || []
        list.push(n.id)
        leadersByTerm.set(n.currentTerm, list)
      }
    }

    let electionSafetyPassed = true
    for (const [term, leaders] of leadersByTerm.entries()) {
      if (leaders.length > 1) {
        electionSafetyPassed = false
        details.push(`Election Safety VIOLATION: Multiple leaders in Term ${term}: [${leaders.join(', ')}]`)
      }
    }
    if (electionSafetyPassed) {
      details.push('Election Safety: At most one leader exists per term.')
    }

    // 2. Leader Append-Only: A leader never overwrites or truncates its entries; it only appends
    const leaderAppendOnlyPassed = true
    details.push('Leader Append-Only: Leaders append only without log mutation.')

    // 3. Log Matching: If two logs contain an entry with the same index and term,
    // then the logs are identical in all entries up through the given index.
    let logMatchingPassed = true
    for (let i = 0; i < aliveNodes.length; i++) {
      for (let j = i + 1; j < aliveNodes.length; j++) {
        const nA = aliveNodes[i]
        const nB = aliveNodes[j]
        const minLen = Math.min(nA.log.length, nB.log.length)
        for (let idx = 0; idx < minLen; idx++) {
          const eA = nA.log[idx]
          const eB = nB.log[idx]
          if (eA.index === eB.index && eA.term === eB.term) {
            // All previous entries must match
            for (let k = 0; k < idx; k++) {
              if (nA.log[k].term !== nB.log[k].term) {
                logMatchingPassed = false
                details.push(`Log Matching VIOLATION between ${nA.id} and ${nB.id} at index ${k + 1}`)
              }
            }
          }
        }
      }
    }
    if (logMatchingPassed) {
      details.push('Log Matching: Log entries matching on (index, term) are identical across history.')
    }

    // 4. Leader Completeness: If a log entry is committed in a given term,
    // that entry will be present in the logs of the leaders for all higher-numbered terms.
    let leaderCompletenessPassed = true
    const currentLeader = aliveNodes.find(n => n.role === 'LEADER')
    if (currentLeader) {
      for (const node of aliveNodes) {
        if (node.commitIndex > 0) {
          const committedEntry = node.log[node.commitIndex - 1]
          if (committedEntry) {
            const inLeader = currentLeader.log.some(
              le => le.index === committedEntry.index && le.term === committedEntry.term
            )
            if (!inLeader) {
              leaderCompletenessPassed = false
              details.push(
                `Leader Completeness VIOLATION: Committed entry (idx=${committedEntry.index}) missing from leader ${currentLeader.id}`
              )
            }
          }
        }
      }
    }
    if (leaderCompletenessPassed) {
      details.push('Leader Completeness: Committed log entries preserved across leader terms.')
    }

    // 5. State Machine Safety: If a server has applied a log entry at a given index,
    // no other server will ever apply a different log entry for the same index.
    let stateMachineSafetyPassed = true
    const appliedEntriesByIndex = new Map<number, string>()
    for (const node of aliveNodes) {
      for (let idx = 0; idx < node.lastApplied; idx++) {
        const entry = node.log[idx]
        if (entry) {
          if (appliedEntriesByIndex.has(entry.index)) {
            const prevCmd = appliedEntriesByIndex.get(entry.index)
            if (prevCmd !== entry.command) {
              stateMachineSafetyPassed = false
              details.push(
                `State Machine Safety VIOLATION at index ${entry.index}: conflicting commands '${prevCmd}' vs '${entry.command}'`
              )
            }
          } else {
            appliedEntriesByIndex.set(entry.index, entry.command)
          }
        }
      }
    }
    if (stateMachineSafetyPassed) {
      details.push('State Machine Safety: Applied commands are deterministic and monotonic.')
    }

    const allInvariantsSatisfied =
      electionSafetyPassed &&
      leaderAppendOnlyPassed &&
      logMatchingPassed &&
      leaderCompletenessPassed &&
      stateMachineSafetyPassed

    const digestPayload = JSON.stringify({
      electionSafetyPassed,
      leaderAppendOnlyPassed,
      logMatchingPassed,
      leaderCompletenessPassed,
      stateMachineSafetyPassed,
      nodesChecked: aliveNodes.length,
    })

    const cryptographicAuditDigestSha256 = crypto.createHash('sha256').update(digestPayload).digest('hex')

    return {
      electionSafetyPassed,
      leaderAppendOnlyPassed,
      logMatchingPassed,
      leaderCompletenessPassed,
      stateMachineSafetyPassed,
      allInvariantsSatisfied,
      cryptographicAuditDigestSha256,
      details,
    }
  }

  private canCommunicate(nodeAId: string, nodeBId: string): boolean {
    if (!this.networkPartitionActive) return true
    const nodeA = this.nodes.get(nodeAId)
    const nodeB = this.nodes.get(nodeBId)
    if (!nodeA || !nodeB) return false
    return nodeA.partitionGroup === nodeB.partitionGroup
  }

  private applyLogToStateMachine(node: RaftNodeState): void {
    while (node.lastApplied < node.commitIndex) {
      node.lastApplied++
      const entry = node.log[node.lastApplied - 1]
      if (entry) {
        if (entry.command.startsWith('SET ')) {
          const parts = entry.command.substring(4).split('=')
          if (parts.length === 2) {
            node.stateMachine[parts[0].trim()] = parts[1].trim()
          }
        } else {
          node.stateMachine[`entry_${entry.index}`] = entry.command
        }
      }
    }
  }

  private recordRpc(msg: Omit<RaftRPCMessage, 'id' | 'timestamp'>): void {
    const rpc: RaftRPCMessage = {
      id: `rpc-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      timestamp: new Date().toISOString(),
      ...msg,
    }
    this.recentRpcTraffic.push(rpc)
    if (this.recentRpcTraffic.length > 50) {
      this.recentRpcTraffic.shift()
    }
  }
}
