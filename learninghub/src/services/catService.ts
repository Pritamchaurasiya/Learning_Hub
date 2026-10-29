import { fetchApi } from '../utils/api'

export type ConfidenceLevel = 'LOW' | 'MEDIUM' | 'HIGH'

export type AbilityBand = 'BEGINNER' | 'INTERMEDIATE' | 'PROFICIENT' | 'ADVANCED' | 'MASTER'

export interface CatOption {
  id: string
  text: string
}

export interface CatItem {
  id: string
  text: string
  subject: string
  topic: string
  options: CatOption[]
  bloomLevel?: 'REMEMBER' | 'UNDERSTAND' | 'APPLY' | 'ANALYZE' | 'EVALUATE'
  a?: number
  b?: number
  c?: number
  explanation?: string
}

export interface CatResponseRecord {
  itemId: string
  selectedOptionId: string
  isCorrect: boolean
  confidence: ConfidenceLevel
  cbmScore: number
  thetaAfter: number
  semAfter: number
  timeSpentSeconds: number
  timestamp: string
}

export interface CatSessionState {
  sessionId: string
  userId: string
  subject: string
  examSlug?: string
  stage: 1 | 2 | 3
  currentTheta: number
  currentSem: number
  normalizedScore: number
  estimatedPercentile: number
  abilityBand: AbilityBand
  isCompleted: boolean
  stoppingReason?: 'SEM_CONVERGENCE' | 'MAX_QUESTIONS_REACHED' | 'MANUAL_SUBMIT'
  questionsAnswered: number
  maxQuestions: number
  minQuestions: number
  targetSem: number
  responses: CatResponseRecord[]
  activeItem?: CatItem
  startedAt: number
  updatedAt: number
}

export interface TopicMasteryEntry {
  total: number
  correct: number
  accuracy: number
  masteryLevel: 'NEEDS_FOCUS' | 'PROFICIENT' | 'MASTERED'
}

export interface CatScorecard {
  sessionId: string
  userId: string
  subject: string
  examSlug?: string
  finalTheta: number
  finalSem: number
  confidenceInterval95: [number, number]
  normalizedScore: number
  percentileRank: number
  abilityBand: AbilityBand
  totalQuestions: number
  accuracyRate: number
  cbmBreakdown: {
    masteryCount: number
    intuitionCount: number
    hesitationCount: number
    blindspotCount: number
    totalCbmScore: number
  }
  topicMastery?: Record<string, TopicMasteryEntry>
  suggestedRemediationAction?: string
  convergencePath: Array<{
    step: number
    theta: number
    sem: number
    itemDifficulty: number
    isCorrect: boolean
  }>
  testInformationCurve: Array<{
    thetaPoint: number
    informationValue: number
    semValue: number
  }>
  cryptographicAuditProof: {
    hash: string
    signedAt: string
    algorithm: string
  }
}

export interface CatItemBankStats {
  totalItems: number
  subjects: string[]
  meanDiscrimination: number
  meanDifficulty: number
  meanGuessing: number
  bloomDistribution: Record<string, number>
}

export const catService = {
  getStats: async (): Promise<CatItemBankStats> => {
    const res = await fetchApi('/cat/stats')
    return res.data
  },

  startSession: async (subject?: string, examSlug?: string): Promise<CatSessionState> => {
    const res = await fetchApi('/cat/session/start', {
      method: 'POST',
      body: JSON.stringify({ subject, examSlug }),
    })
    return res.data?.session
  },

  submitAnswer: async (params: {
    sessionId: string
    itemId: string
    selectedOptionId: string
    confidence: ConfidenceLevel
    timeSpentSeconds?: number
  }): Promise<{ session: CatSessionState; stepResult: CatResponseRecord }> => {
    const res = await fetchApi('/cat/session/submit', {
      method: 'POST',
      body: JSON.stringify(params),
    })
    return res.data
  },

  getSession: async (sessionId: string): Promise<CatSessionState> => {
    const res = await fetchApi(`/cat/session/${sessionId}`)
    return res.data?.session
  },

  getScorecard: async (sessionId: string): Promise<CatScorecard> => {
    const res = await fetchApi(`/cat/session/${sessionId}/scorecard`)
    return res.data?.scorecard
  },
}
