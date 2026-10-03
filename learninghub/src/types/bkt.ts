export interface BKTParameters {
  pL0: number // Prior probability of mastery before practice
  pT: number  // Transition probability of learning during practice
  pG: number  // Guess probability (answering correctly despite lack of knowledge)
  pS: number  // Slip probability (making a careless error despite mastery)
}

export interface BKTUpdateResult {
  posteriorKnown: number  // P(L_t | O_t)
  projectedMastery: number // P(L_{t+1}) after transition
  isMastered: boolean      // projectedMastery >= masteryThreshold (default 0.85)
}

export type ReadinessLevel = 'ELITE' | 'COMPETITIVE' | 'DEVELOPING' | 'NEEDS_REINFORCEMENT'

export interface ExamReadinessBreakdown {
  compositeScore: number   // 0 - 100
  readinessLevel: ReadinessLevel
  syllabusMastery: number  // 0 - 100 (35% weight)
  mockScore: number        // 0 - 100 (30% weight)
  speedAccuracy: number    // 0 - 100 (20% weight)
  retentionRate: number    // 0 - 100 (15% weight)
  strengths: string[]
  weaknesses: string[]
  recommendation: string
}
