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
  nextIndex?: Record<string, number>
  matchIndex?: Record<string, number>
  partitionGroup: string
  isAlive: boolean
  stateMachine: Record<string, any>
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

export interface ClientCommandResult {
  success: boolean
  committed: boolean
  leaderId: string | null
  entryIndex: number | null
  term: number | null
  clusterState: RaftClusterState
}
