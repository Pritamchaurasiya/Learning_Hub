export type DebatePersonaId = 'ARCHITECT_AVA' | 'SENTINEL_REX' | 'VELOCITY_VIK' | 'CHAOS_CHLOE'

export interface DebatePersona {
  id: DebatePersonaId
  name: string
  title: string
  stance: string
  avatarColor: string
  specialty: string
  corePriority: string
}

export interface DialecticalClaim {
  id: string
  claim: string
  evidence: string
  severity: 'CRITICAL' | 'WARNING' | 'NEUTRAL' | 'ENDORSEMENT'
  counterExample?: string
}

export interface DebateTurn {
  id: string
  roundIndex: number
  personaId: DebatePersonaId
  personaName: string
  timestamp: number
  critique: string
  claims: DialecticalClaim[]
  rebuttalTargetPersonaId?: DebatePersonaId
  scoreContribution: {
    security: number
    performance: number
    reliability: number
    maintainability: number
    costEfficiency: number
  }
}

export interface ParetoMetrics {
  security: number // 0-100
  performance: number // 0-100
  reliability: number // 0-100
  maintainability: number // 0-100
  costEfficiency: number // 0-100
  compositeConsensusScore: number // 0-100
}

export interface ArchitectureRFC {
  rfcId: string
  title: string
  date: string
  status: 'APPROVED' | 'APPROVED_WITH_CONDITIONS' | 'REJECTED_REVISION_REQUIRED'
  authorCouncil: string[]
  executiveSummary: string
  architecturalDecisions: Array<{
    decision: string
    rationale: string
    champion: string
  }>
  criticalMitigations: Array<{
    risk: string
    mitigation: string
    assignedLead: string
  }>
  paretoMetrics: ParetoMetrics
  cryptographicApprovalHash: string
}

export interface DebateSessionResult {
  sessionId: string
  topic: string
  proposalContent: string
  personas: DebatePersona[]
  totalRounds: number
  turns: DebateTurn[]
  paretoMetrics: ParetoMetrics
  rfc: ArchitectureRFC
}

export interface PresetArchitectureTopic {
  id: string
  title: string
  category: 'DISTRIBUTED_SYSTEMS' | 'DATABASE_SCALING' | 'WEB3_SECURITY' | 'AI_INFRASTRUCTURE'
  description: string
  defaultProposal: string
}
