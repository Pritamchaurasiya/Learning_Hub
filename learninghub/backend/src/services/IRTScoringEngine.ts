/**
 * IRTScoringEngine
 * Implements Item Response Theory (3PL Model) and Confidence-Based Marking (CBM)
 * Also includes heuristic algorithms for Cheating Detection (time-variance analysis).
 *
 * Production-hardened with:
 * - Standard Error of Measurement (SEM) computation
 * - Proper edge-case handling (all-correct, all-incorrect, empty)
 * - Adaptive theta initialization from classical score
 * - Fisher Information-based reliability metrics
 */

export class IRTScoringEngine {
  /**
   * 3PL (Three-Parameter Logistic) Model
   * P(theta) = c + (1 - c) / (1 + exp(-a * (theta - b)))
   *
   * @param theta Ability level of the student
   * @param a Discrimination parameter (typically 0.5 – 2.5)
   * @param b Difficulty parameter (same scale as theta)
   * @param c Guessing probability (typically 0.0 – 0.35)
   * @returns Probability of answering correctly, clamped to (0.0001, 0.9999) for numerical stability
   */
  public static calculateProbability(theta: number, a: number, b: number, c: number): number {
    // Bound the exponent to [-50, 50] to prevent overflow (Infinity) or underflow (0)
    // which causes NaNs in derivative calculations during MLE.
    const exponent = Math.max(-50, Math.min(50, -a * (theta - b)))
    const expTerm = Math.exp(exponent)
    const P = c + (1 - c) / (1 + expTerm)
    // Clamp to avoid log(0) in MLE
    return Math.max(0.0001, Math.min(0.9999, P))
  }

  /**
   * Estimate ability (theta) using Maximum Likelihood Estimation (Newton-Raphson method)
   *
   * Handles edge cases:
   * - Empty responses → returns 50 (midpoint)
   * - All correct → returns 95 (high-confidence upper bound)
   * - All incorrect → returns 5 (low-confidence lower bound)
   *
   * @param responses Array of binary responses (1=correct, 0=incorrect)
   * @param parameters Array of {a, b, c} for each question
   * @returns Estimated ability score normalized to 0-100 scale
   */
  public static estimateAbility(
    responses: number[],
    parameters: Array<{ a: number; b: number; c: number }>
  ): number {
    if (responses.length === 0) return 50

    // Edge case: all correct → theta near upper bound
    const allCorrect = responses.every(r => r === 1)
    if (allCorrect) return 95

    // Edge case: all incorrect → theta near lower bound
    const allIncorrect = responses.every(r => r === 0)
    if (allIncorrect) return 5

    // Adaptive initial theta from classical proportion correct
    const proportionCorrect = responses.reduce((s, r) => s + r, 0) / responses.length
    // Map proportion [0,1] → theta [-3, 3] using probit-like mapping without padding bias
    const p = Math.max(0.01, Math.min(0.99, proportionCorrect))
    let theta = Math.log(p / (1 - p))
    theta = Math.max(-3, Math.min(3, theta))

    const MAX_ITER = 25
    const EPSILON = 0.0005

    for (let iter = 0; iter < MAX_ITER; iter++) {
      let firstDerivative = 0
      let secondDerivative = 0

      for (let i = 0; i < responses.length; i++) {
        // eslint-disable-next-line security/detect-object-injection
        const u = responses[i]
        // eslint-disable-next-line security/detect-object-injection
        const { a, b, c } = parameters[i]

        const P = this.calculateProbability(theta, a, b, c)
        const Q = 1 - P

        // P' = a * (P - c) * Q / (1 - c) — derivative of 3PL w.r.t. theta
        const denom = 1 - c
        if (denom <= 0 || P <= 0 || Q <= 0) continue

        const pPrime = (a * (P - c) * Q) / denom

        // First derivative of log-likelihood
        firstDerivative += ((u - P) * pPrime) / (P * Q)

        // Second derivative (negative Fisher Information)
        secondDerivative -= (pPrime * pPrime) / (P * Q)
      }

      if (Math.abs(firstDerivative) < EPSILON || secondDerivative === 0) {
        break
      }

      // Newton-Raphson update with step-size dampening for stability
      const step = firstDerivative / secondDerivative
      const dampenedStep = Math.max(-1, Math.min(1, step)) // Prevent wild jumps
      theta -= dampenedStep

      // Bound theta to reasonable psychometric limits [-4, 4]
      theta = Math.max(-4, Math.min(4, theta))
    }

    // Normalize theta [-3, +3] → [0, 100]
    let normalized = ((theta + 3) / 6) * 100
    normalized = Math.max(0, Math.min(100, normalized))

    return Math.round(normalized * 100) / 100 // 2 decimal precision
  }

  /**
   * Compute Standard Error of Measurement (SEM)
   * SEM = 1 / sqrt(I(theta)) where I is Fisher Information
   *
   * Lower SEM = more precise estimate. Useful for confidence intervals.
   *
   * @returns SEM value (lower is better). Returns Infinity if no information.
   */
  public static computeSEM(
    theta: number,
    parameters: Array<{ a: number; b: number; c: number }>
  ): number {
    let fisherInfo = 0

    for (const { a, b, c } of parameters) {
      const P = this.calculateProbability(theta, a, b, c)
      const Q = 1 - P
      const denom = 1 - c

      if (denom <= 0 || P <= 0 || Q <= 0) continue

      const pPrime = (a * (P - c) * Q) / denom
      fisherInfo += (pPrime * pPrime) / (P * Q)
    }

    return fisherInfo > 0 ? 1 / Math.sqrt(fisherInfo) : Infinity
  }

  /**
   * Generate default item parameters when the database doesn't have IRT-calibrated values.
   * Maps difficulty labels to reasonable 3PL parameter sets.
   */
  public static getDefaultParameters(difficulty: string): { a: number; b: number; c: number } {
    const diffMap: Record<string, { a: number; b: number; c: number }> = {
      EASY: { a: 1.0, b: -1.5, c: 0.2 },
      MEDIUM: { a: 1.2, b: 0.0, c: 0.2 },
      HARD: { a: 1.5, b: 1.5, c: 0.15 },
      EXPERT: { a: 2.0, b: 2.5, c: 0.1 },
    }
    return diffMap[difficulty?.toUpperCase()] ?? diffMap.MEDIUM
  }

  /**
   * Confidence-Based Marking (CBM) Modifier
   * Applies modifiers based on user confidence levels.
   *
   * Scoring Matrix:
   *   Correct + HIGH confidence = 3.0x (reward deep knowledge)
   *   Correct + MEDIUM confidence = 2.0x
   *   Correct + LOW confidence = 1.0x
   *   Incorrect + HIGH confidence = -2.0x (penalty for overconfidence)
   *   Incorrect + MEDIUM confidence = 0.0x (neutral)
   *   Incorrect + LOW confidence = 0.0x (acknowledged uncertainty)
   */
  public static calculateCBMMultiplier(
    isCorrect: boolean,
    confidence: 'LOW' | 'MEDIUM' | 'HIGH'
  ): number {
    if (isCorrect) {
      switch (confidence) {
        case 'HIGH':
          return 3.0
        case 'MEDIUM':
          return 2.0
        case 'LOW':
          return 1.0
        default:
          return 1.0
      }
    } else {
      switch (confidence) {
        case 'HIGH':
          return -2.0 // Heavy penalty for confident but wrong
        case 'MEDIUM':
          return 0.0
        case 'LOW':
          return 0.0
        default:
          return 0.0
      }
    }
  }

  /**
   * Anti-Cheating: Time Variance Detection
   * Flags suspicious behavior based on multiple heuristics:
   * 1. Ultra-fast answers on hard questions (< 3s)
   * 2. Statistical outlier detection (unusually fast for any difficulty)
   *
   * @param timeSpentSeconds Time spent on the question
   * @param difficulty Question difficulty on 0-1 scale (0 = easy, 1 = hard)
   * @returns Suspicion result with confidence score
   */
  public static detectSuspiciousActivity(
    timeSpentSeconds: number,
    difficulty: number
  ): { isSuspicious: boolean; reason?: string; confidence: number } {
    // Minimum expected reading time scales with difficulty
    const minExpectedSeconds = 2 + difficulty * 8 // 2s for easiest, 10s for hardest

    // Ultra-fast on hard questions — very suspicious
    if (difficulty >= 0.8 && timeSpentSeconds <= 3) {
      return {
        isSuspicious: true,
        reason: `Answered very high difficulty question in ${timeSpentSeconds}s (expected ≥${Math.round(minExpectedSeconds)}s)`,
        confidence: 0.9,
      }
    }

    // Fast answer on medium+ difficulty
    if (difficulty >= 0.5 && timeSpentSeconds <= 2) {
      return {
        isSuspicious: true,
        reason: `Answered medium+ difficulty question in ${timeSpentSeconds}s (unrealistically fast)`,
        confidence: 0.7,
      }
    }

    // Suspiciously fast for any question (sub-1 second)
    if (timeSpentSeconds <= 1) {
      return {
        isSuspicious: true,
        reason: `Answer submitted in ${timeSpentSeconds}s — faster than human reading speed`,
        confidence: 0.8,
      }
    }

    return { isSuspicious: false, confidence: 0 }
  }

  /**
   * Batch analysis: Check an entire test for suspicious patterns
   * Looks for statistically improbable speed patterns across all answers.
   *
   * @param answerTimes Array of {timeSpentSeconds, difficulty} for each question
   * @returns Overall suspicion assessment
   */
  public static analyzeTestSuspicion(
    answerTimes: Array<{ timeSpentSeconds: number; difficulty: number }>
  ): { overallSuspicious: boolean; suspiciousCount: number; details: string[] } {
    if (answerTimes.length === 0) {
      return { overallSuspicious: false, suspiciousCount: 0, details: [] }
    }

    const results = answerTimes.map((at, i) => ({
      index: i + 1,
      ...this.detectSuspiciousActivity(at.timeSpentSeconds, at.difficulty),
    }))

    const suspicious = results.filter(r => r.isSuspicious)
    const suspiciousRatio = suspicious.length / answerTimes.length

    return {
      overallSuspicious: suspiciousRatio >= 0.3, // 30%+ suspicious answers → flag
      suspiciousCount: suspicious.length,
      details: suspicious.map(s => `Q${s.index}: ${s.reason}`),
    }
  }
}
