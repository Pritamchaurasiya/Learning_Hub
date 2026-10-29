/**
 * AdaptiveRemediationService.ts
 * 
 * Milestone 32: AI-Powered Computerized Adaptive Remediation (CAR)
 * Analyzes question telemetry (response time, difficulty, discrimination, choice)
 * to classify mistake etiology (Knowledge Deficit, Careless Slip, Lucky Guess, Fatigue),
 * synthesize dynamic 3-step scaffolding remediation drills, and calculate BKT mastery updates.
 */

export type MistakeEtiology = 
  | 'KNOWLEDGE_DEFICIT'
  | 'CARELESS_SLIP'
  | 'LUCKY_GUESS'
  | 'FATIGUE_FLAG'
  | 'CONCEPT_CONFUSION'

export interface QuestionTelemetry {
  questionId: string
  conceptId: string
  conceptName: string
  prerequisiteConceptId?: string
  prerequisiteConceptName?: string
  difficulty: number // 3PL IRT b-parameter (-3.0 to +3.0)
  discrimination: number // 3PL IRT a-parameter (0.5 to 2.5)
  timeSpentSeconds: number
  benchmarkTimeSeconds: number
  isCorrect: boolean
  selectedOptionIndex: number
  correctOptionIndex: number
  userPriorMastery: number // 0.0 to 1.0 (from BKT)
}

export interface DiagnosticAssessment {
  questionId: string
  conceptId: string
  conceptName: string
  etiology: MistakeEtiology
  confidence: number // 0.0 to 1.0
  explanation: string
  prescribedScaffold: {
    prerequisiteId: string
    prerequisiteName: string
    targetDifficulty: number
    drillStepCount: number
    estimatedRecoveryTimeMinutes: number
  }
}

export interface RemediationDrillStep {
  stepNumber: number
  tier: 'PREREQUISITE_ANCHOR' | 'CONCEPTUAL_TRANSFER' | 'MASTERY_VERIFICATION'
  prompt: string
  options: string[]
  correctIndex: number
  hint: string
  explanation: string
  difficulty: number
}

export interface RemediationDrillPayload {
  conceptId: string
  conceptName: string
  etiology: MistakeEtiology
  steps: RemediationDrillStep[]
  potentialMasteryDelta: number
}

export interface DrillSubmissionResult {
  conceptId: string
  passed: boolean
  score: number // e.g. 3/3
  previousMastery: number
  updatedMastery: number
  masteryDelta: number
  feedback: string
  recoveredStatus: 'FULLY_RECOVERED' | 'PARTIALLY_RECOVERED' | 'NEEDS_PREREQUISITE_COURSE'
}

export class AdaptiveRemediationService {
  /**
   * Diagnoses mistake etiology using multidimensional telemetry.
   */
  public diagnoseMistake(telemetry: QuestionTelemetry): DiagnosticAssessment {
    const timeRatio = telemetry.timeSpentSeconds / Math.max(1, telemetry.benchmarkTimeSeconds)
    const isFast = timeRatio < 0.35
    const isVerySlow = timeRatio > 1.75
    const highPriorMastery = telemetry.userPriorMastery >= 0.75
    const lowPriorMastery = telemetry.userPriorMastery < 0.45

    let etiology: MistakeEtiology = 'KNOWLEDGE_DEFICIT'
    let confidence = 0.85
    let explanation = ''

    if (telemetry.isCorrect) {
      if (isFast && telemetry.difficulty > 1.2 && lowPriorMastery) {
        etiology = 'LUCKY_GUESS'
        confidence = 0.88
        explanation = 'Rapid response on high-difficulty item with low baseline mastery indicates speculative guessing.'
      } else {
        etiology = 'KNOWLEDGE_DEFICIT' // Not a mistake, but base fallback
        confidence = 0.95
        explanation = 'Question was answered correctly according to normative cognitive expectation.'
      }
    } else {
      // Question is incorrect
      if (isFast && highPriorMastery && telemetry.difficulty < 0.5) {
        etiology = 'CARELESS_SLIP'
        confidence = 0.92
        explanation = 'Swift response time below 35% of benchmark with high historical mastery indicates speed-induced cognitive error rather than deep conceptual lack.'
      } else if (isVerySlow && telemetry.difficulty > 1.0) {
        etiology = 'CONCEPT_CONFUSION'
        confidence = 0.87
        explanation = 'Extended cognitive effort exceeding 175% of benchmark reflects struggle with competing multi-step reasoning models or ambiguous problem constraints.'
      } else if (lowPriorMastery || telemetry.difficulty >= 0) {
        etiology = 'KNOWLEDGE_DEFICIT'
        confidence = 0.94
        explanation = 'Direct deficit in fundamental domain knowledge and prerequisite conceptual models.'
      } else {
        etiology = 'FATIGUE_FLAG'
        confidence = 0.78
        explanation = 'Pattern shows sub-optimal cognitive pacing and potential mental fatigue during sustained test-taking.'
      }
    }

    const prereqId = telemetry.prerequisiteConceptId || `prereq-${telemetry.conceptId}`
    const prereqName = telemetry.prerequisiteConceptName || `Foundational Principles of ${telemetry.conceptName}`

    return {
      questionId: telemetry.questionId,
      conceptId: telemetry.conceptId,
      conceptName: telemetry.conceptName,
      etiology,
      confidence: parseFloat(confidence.toFixed(2)),
      explanation,
      prescribedScaffold: {
        prerequisiteId: prereqId,
        prerequisiteName: prereqName,
        targetDifficulty: Math.max(-2.0, parseFloat((telemetry.difficulty - 0.6).toFixed(2))),
        drillStepCount: etiology === 'CARELESS_SLIP' ? 1 : 3,
        estimatedRecoveryTimeMinutes: etiology === 'CARELESS_SLIP' ? 2 : 6
      }
    }
  }

  /**
   * Generates a calibrated 3-step scaffolding drill tailored to concept & etiology.
   */
  public generateScaffoldDrill(conceptId: string, conceptName: string, etiology: MistakeEtiology): RemediationDrillPayload {
    const isCareless = etiology === 'CARELESS_SLIP'

    const steps: RemediationDrillStep[] = [
      {
        stepNumber: 1,
        tier: 'PREREQUISITE_ANCHOR',
        prompt: `[Step 1 - Fundamental Anchor] Identify the foundational invariant governing ${conceptName}:`,
        options: [
          `Conservation of state invariants and continuous bounded conditions`,
          `Unrestricted asymptotic divergence without convergence checks`,
          `Randomized heuristic fallback under deterministic edge cases`,
          `Inverse boundary skipping during sequential traversal`
        ],
        correctIndex: 0,
        hint: `Focus on the conservation law or mathematical identity that always holds true.`,
        explanation: `Foundational mastery requires verifying that boundary invariants remain conserved before evaluating advanced compound transformations.`,
        difficulty: -0.5
      }
    ]

    if (!isCareless) {
      steps.push({
        stepNumber: 2,
        tier: 'CONCEPTUAL_TRANSFER',
        prompt: `[Step 2 - Contextual Transfer] When applying ${conceptName} to a compound system with perturbations, how should parameters be adjusted?`,
        options: [
          `Scale parameters proportionally while dampening high-frequency oscillation`,
          `Discard all prior boundary bounds and reset to uniform priors`,
          `Double the learning rate arbitrarily to overcome local minima`,
          `Negate the denominator without checking non-zero criteria`
        ],
        correctIndex: 0,
        hint: `Think about stability criteria and dampening factor constraints.`,
        explanation: `In compound applications, stabilizing the system through proportional parameter scaling prevents asymptotic divergence.`,
        difficulty: 0.2
      })

      steps.push({
        stepNumber: 3,
        tier: 'MASTERY_VERIFICATION',
        prompt: `[Step 3 - Synthesis & Target Recovery] In a critical production system utilizing ${conceptName}, an anomaly occurs at the boundary. What is the optimal deterministic mitigation?`,
        options: [
          `Activate idempotent fallback handler, preserve invariant snapshot, and alert supervisor`,
          `Suppress the error exception and continue stream processing without audit log`,
          `Force synchronous thread block until manual operator intervention`,
          `Flush all cached persistent state to disk in an unencrypted temporary buffer`
        ],
        correctIndex: 0,
        hint: `Prioritize idempotency, auditability, and state consistency.`,
        explanation: `Robust systems maintain deterministic guarantees by combining idempotent fallback execution with state snapshot integrity.`,
        difficulty: 0.8
      })
    }

    const potentialDelta = isCareless ? 0.08 : 0.18

    return {
      conceptId,
      conceptName,
      etiology,
      steps,
      potentialMasteryDelta: potentialDelta
    }
  }

  /**
   * Evaluates user drill submission and computes new Bayesian Knowledge Tracing mastery level.
   */
  public evaluateDrillSubmission(
    conceptId: string,
    submittedAnswers: number[], // indices chosen for each step
    correctAnswers: number[],
    priorMastery: number
  ): DrillSubmissionResult {
    let correctCount = 0
    const total = correctAnswers.length

    for (let i = 0; i < total; i++) {
      if (submittedAnswers[i] === correctAnswers[i]) {
        correctCount++
      }
    }

    const passRate = total > 0 ? correctCount / total : 0
    const passed = passRate >= 0.66

    // Bayesian Knowledge Tracing (BKT) Posterior Mastery Update:
    // P(L_n | Correct) = (P(L_{n-1}) * (1 - s)) / (P(L_{n-1}) * (1 - s) + (1 - P(L_{n-1})) * g)
    // Here simplified into a calibrated bounded delta based on drill performance:
    let masteryDelta = 0
    let status: 'FULLY_RECOVERED' | 'PARTIALLY_RECOVERED' | 'NEEDS_PREREQUISITE_COURSE' = 'NEEDS_PREREQUISITE_COURSE'
    let feedback = ''

    if (passRate === 1.0) {
      masteryDelta = 0.16 * (1.0 - priorMastery)
      status = 'FULLY_RECOVERED'
      feedback = 'Outstanding! You correctly resolved all scaffolding drill steps and fully repaired the underlying concept.'
    } else if (passed) {
      masteryDelta = 0.09 * (1.0 - priorMastery)
      status = 'PARTIALLY_RECOVERED'
      feedback = 'Good recovery. You demonstrated solid understanding on fundamental steps but should review the synthesis tier.'
    } else {
      masteryDelta = -0.04 * priorMastery
      status = 'NEEDS_PREREQUISITE_COURSE'
      feedback = 'Prerequisite concept gap detected. We recommend taking the dedicated foundational prerequisite lesson module.'
    }

    const updatedMastery = Math.min(1.0, Math.max(0.05, parseFloat((priorMastery + masteryDelta).toFixed(3))))

    return {
      conceptId,
      passed,
      score: correctCount,
      previousMastery: priorMastery,
      updatedMastery,
      masteryDelta: parseFloat(masteryDelta.toFixed(3)),
      feedback,
      recoveredStatus: status
    }
  }
}

export const adaptiveRemediationService = new AdaptiveRemediationService()
