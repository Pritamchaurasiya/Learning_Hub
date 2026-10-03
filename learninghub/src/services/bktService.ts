import type { BKTParameters, BKTUpdateResult, ExamReadinessBreakdown, ReadinessLevel } from '../types/bkt'

export const DEFAULT_BKT_PARAMS: BKTParameters = {
  pL0: 0.15,
  pT: 0.20,
  pG: 0.20,
  pS: 0.08,
}

export const BKT_MASTERY_THRESHOLD = 0.85

export const bktService = {
  /**
   * Updates student mastery belief following a practice opportunity using Bayesian Knowledge Tracing.
   *
   * @param priorP Prior probability of knowing the concept P(L_{t-1})
   * @param isCorrect Whether the student's answer was correct (O_t = 1) or incorrect (O_t = 0)
   * @param customParams Optional tuned BKT parameters for the specific topic or difficulty
   */
  updateMastery(
    priorP: number,
    isCorrect: boolean,
    customParams?: Partial<BKTParameters>
  ): BKTUpdateResult {
    const params: BKTParameters = { ...DEFAULT_BKT_PARAMS, ...customParams }
    const pPrior = Math.max(0.001, Math.min(0.999, priorP))

    let pPosterior: number
    if (isCorrect) {
      const numerator = pPrior * (1 - params.pS)
      const denominator = numerator + (1 - pPrior) * params.pG
      pPosterior = denominator > 0 ? numerator / denominator : pPrior
    } else {
      const numerator = pPrior * params.pS
      const denominator = numerator + (1 - pPrior) * (1 - params.pG)
      pPosterior = denominator > 0 ? numerator / denominator : pPrior
    }

    // Account for learning acquisition step
    const pNext = pPosterior + (1 - pPosterior) * params.pT
    const clampedNext = Math.max(0.001, Math.min(0.999, pNext))

    return {
      posteriorKnown: Math.round(pPosterior * 1000) / 1000,
      projectedMastery: Math.round(clampedNext * 1000) / 1000,
      isMastered: clampedNext >= BKT_MASTERY_THRESHOLD,
    }
  },

  /**
   * Computes multi-factor composite competitive exam readiness score (0 - 100%).
   * Follows the 4-factor psychometric formula:
   * R_exam = 0.35 * Syllabus + 0.30 * Mock + 0.20 * Speed + 0.15 * Retention
   */
  calculateExamReadiness(
    syllabusMastery: number,
    mockScore: number,
    speedAccuracy: number,
    retentionRate: number
  ): ExamReadinessBreakdown {
    const sMastery = Math.max(0, Math.min(100, syllabusMastery))
    const mScore = Math.max(0, Math.min(100, mockScore))
    const sAccuracy = Math.max(0, Math.min(100, speedAccuracy))
    const rRate = Math.max(0, Math.min(100, retentionRate))

    const compositeScore = Math.round(
      0.35 * sMastery + 0.30 * mScore + 0.20 * sAccuracy + 0.15 * rRate
    )

    let readinessLevel: ReadinessLevel
    if (compositeScore >= 85) readinessLevel = 'ELITE'
    else if (compositeScore >= 70) readinessLevel = 'COMPETITIVE'
    else if (compositeScore >= 50) readinessLevel = 'DEVELOPING'
    else readinessLevel = 'NEEDS_REINFORCEMENT'

    const strengths: string[] = []
    const weaknesses: string[] = []

    if (sMastery >= 75) strengths.push('Broad curriculum topic coverage')
    else weaknesses.push('Curriculum gaps in core prerequisite modules')

    if (mScore >= 75) strengths.push('Strong performance under full-length test conditions')
    else weaknesses.push('Score volatility on comprehensive mixed-topic mocks')

    if (sAccuracy >= 75) strengths.push('High speed-to-accuracy pacing efficiency')
    else weaknesses.push('Pacing bottlenecks on multi-step analytical questions')

    if (rRate >= 80) strengths.push('High memory retention against the forgetting curve')
    else weaknesses.push('Knowledge decay detected in topics not reviewed recently')

    let recommendation: string
    switch (readinessLevel) {
      case 'ELITE':
        recommendation = 'Ready for peak competition. Focus on timed high-difficulty edge cases and full mock stamina.'
        break
      case 'COMPETITIVE':
        recommendation = 'Solid competitive foundation. Shore up speed-accuracy tradeoffs and schedule spaced reviews for older topics.'
        break
      case 'DEVELOPING':
        recommendation = 'Progressing well. Prioritize unlocking locked prerequisite nodes on your knowledge graph.'
        break
      case 'NEEDS_REINFORCEMENT':
        recommendation = 'Strengthen fundamentals through guided problem workspaces and daily spaced revision cards.'
        break
    }

    return {
      compositeScore,
      readinessLevel,
      syllabusMastery: sMastery,
      mockScore: mScore,
      speedAccuracy: sAccuracy,
      retentionRate: rRate,
      strengths,
      weaknesses,
      recommendation,
    }
  },
}
