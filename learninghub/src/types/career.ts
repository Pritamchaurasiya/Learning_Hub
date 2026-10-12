export type CareerTrack =
  | 'DISTRIBUTED_SYSTEMS'
  | 'AI_RESEARCH'
  | 'FULL_STACK_WEB3'
  | 'STAFF_SRE'
  | 'ALGORITHM_QUANT'

export type RecruiterPersonaRole =
  | 'EXECUTIVE_TALENT_LEAD'
  | 'ENGINEERING_DIRECTOR'
  | 'BAR_RAISER_PRINCIPAL'

export interface SimulatedJobListing {
  id: string
  title: string
  company: string
  tier: 'FAANG_FRONTIER' | 'SERIES_C_UNICORN' | 'AI_LAB_RESEARCH' | 'FINTECH_TRADING'
  location: string
  workplaceType: 'REMOTE' | 'HYBRID' | 'ONSITE'
  baseSalaryMin: number
  baseSalaryMax: number
  equityAnnualUsd: number
  signingBonusUsd: number
  currency: string
  track: CareerTrack
  requiredSkills: string[]
  preferredSkills: string[]
  minimumElo: number
  matchAffinityScore: number // 0 - 100
  matchedSkills: string[]
  missingSkills: string[]
  telemetryAlignment: {
    eloRatingMatch: boolean
    bktMasteryMatch: boolean
    interviewReadinessMatch: boolean
  }
  description: string
}

export interface RecruiterTurn {
  id: string
  speaker: 'RECRUITER' | 'CANDIDATE' | 'SYSTEM'
  personaRole?: RecruiterPersonaRole
  personaName?: string
  content: string
  timestamp: string
  sentimentTag?: 'ENTHUSIASTIC' | 'NEUTRAL' | 'CRITICAL' | 'NEGOTIATION_TIGHT'
  suggestedResponses?: string[]
}

export interface RecruiterPersona {
  role: RecruiterPersonaRole
  name: string
  title: string
  avatarColor: string
  evaluationFocus: string
  currentImpressionScore: number // 0 - 100
}

export interface CompensationPackage {
  baseSalary: number
  equityValueUsd: number
  signingBonus: number
  totalTargetCompensation: number
  acceptedStatus: 'PENDING' | 'ACCEPTED' | 'REJECTED' | 'COUNTER_PROPOSED'
}

export interface CareerSimulationState {
  candidateName: string
  candidateDid: string
  candidateElo: number
  topConceptsMastered: string[]
  interviewPercentile: number
  selectedJobId: string
  recruiterPersonas: RecruiterPersona[]
  activePersona: RecruiterPersonaRole
  dialogueHistory: RecruiterTurn[]
  currentOffer: CompensationPackage
  candidateCounterOffer: CompensationPackage
  leverageScore: number // 0 - 100
  marketCompetitivenessPercentile: number // 0 - 100
}

export interface CareerMatchFilterParams {
  track?: CareerTrack
  minSalary?: number
  remoteOnly?: boolean
  searchQuery?: string
}
