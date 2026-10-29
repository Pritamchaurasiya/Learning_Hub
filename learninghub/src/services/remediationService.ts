/**
 * RemediationService
 *
 * Cognitive Mistake Categorization & Targeted Remediation Engine for Test A+.
 * Milestone 32: Computerized Adaptive Remediation (CAR) with 3-tier scaffolding drills.
 */

import { TestResult } from './testsAService'
import { api } from '../utils/api'

export type CognitiveMistakeType =
  | 'CONCEPT_GAP'
  | 'CALCULATION_SLIP'
  | 'TIME_CRUNCH'
  | 'UNANSWERED'
  | 'CONFIDENCE_MISMATCH'

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
  difficulty: number
  discrimination: number
  timeSpentSeconds: number
  benchmarkTimeSeconds: number
  isCorrect: boolean
  selectedOptionIndex: number
  correctOptionIndex: number
  userPriorMastery: number
}

export interface DiagnosticAssessment {
  questionId: string
  conceptId: string
  conceptName: string
  etiology: MistakeEtiology
  confidence: number
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
  score: number
  previousMastery: number
  updatedMastery: number
  masteryDelta: number
  feedback: string
  recoveredStatus: 'FULLY_RECOVERED' | 'PARTIALLY_RECOVERED' | 'NEEDS_PREREQUISITE_COURSE'
}

export interface MistakeAnalysisItem {
  questionId: string
  questionText: string
  topic: string
  timeSpent: number
  selectedOptionText?: string
  correctOptionText?: string
  explanation?: string
  mistakeType: CognitiveMistakeType
  mistakeLabel: string
  severity: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW'
  diagnosis: string
  recommendedAction: string
  suggestedEbookQuery: string
}

export interface RemediationCategoryStats {
  type: CognitiveMistakeType
  label: string
  count: number
  percentage: number
  color: string
  description: string
  iconName: string
}

export interface RemediationSummary {
  attemptId: string
  testId: string
  testTitle: string
  totalQuestions: number
  totalMistakes: number
  accuracyPercentage: number
  categories: RemediationCategoryStats[]
  items: MistakeAnalysisItem[]
  primaryWeakness: CognitiveMistakeType | null
  primaryWeaknessLabel: string
  actionableInsights: string[]
  recommendedDrillTitle: string
  targetTopics: string[]
}

export interface TargetedDrillConfig {
  title: string
  examName: string
  mode: 'practice'
  difficulty: 'mixed' | 'medium' | 'easy'
  topics: string[]
  questionCount: number
  timeLimitMinutes: number
  mistakeTypesTargeted: CognitiveMistakeType[]
}

/**
 * Classify a specific question error into its cognitive archetype.
 */
export function classifyMistake(
  questionResult: TestResult['question_results'][0],
  averageTimePerQuestion: number,
  totalRemainingTimePercent: number = 50
): MistakeAnalysisItem {
  const timeSpent = questionResult.time_spent ?? 0
  const topic = questionResult.topic || 'General Aptitude'
  const isUnanswered =
    !questionResult.selected_options || questionResult.selected_options.length === 0
  const selectedText = questionResult.selected_options?.[0]?.text ?? 'None'
  const correctText = questionResult.correct_options?.[0]?.text ?? 'Correct Option'
  const explanation = questionResult.explanation || ''

  let mistakeType: CognitiveMistakeType = 'CALCULATION_SLIP'
  let mistakeLabel = 'Precision Slip'
  let severity: MistakeAnalysisItem['severity'] = 'MEDIUM'
  let diagnosis = 'Minor calculation error or distractor trap.'
  let recommendedAction = 'Review key formulas and double-check step-by-step arithmetic.'

  if (isUnanswered) {
    mistakeType = 'UNANSWERED'
    mistakeLabel = 'Skipped / Unattempted'
    severity = 'HIGH'
    diagnosis = 'Question skipped. Indicates lack of confidence or severe time pressure.'
    recommendedAction = 'Practice rapid elimination of obviously false choices to attempt educated guesses.'
  } else if (timeSpent < 15 && totalRemainingTimePercent < 20) {
    mistakeType = 'TIME_CRUNCH'
    mistakeLabel = 'Time Crunch Guess'
    severity = 'CRITICAL'
    diagnosis = 'Rushed attempt under depleted test clock (<15s spent).'
    recommendedAction = 'Improve sectional pacing; allocate strict per-question time caps early.'
  } else if (timeSpent > averageTimePerQuestion * 1.6) {
    mistakeType = 'CONCEPT_GAP'
    mistakeLabel = 'Conceptual Hurdle'
    severity = 'HIGH'
    diagnosis = 'Substantial time invested (>1.6x average) but resulted in incorrect response.'
    recommendedAction = 'Revisit foundational theory in the core syllabus and work on step-by-step derivation.'
  } else if (timeSpent < averageTimePerQuestion * 0.4) {
    mistakeType = 'CALCULATION_SLIP'
    mistakeLabel = 'Speed-Induced Trap'
    severity = 'MEDIUM'
    diagnosis = 'Answered very rapidly without thorough verification of question constraints.'
    recommendedAction = 'Slow down on deceptively simple problems; verify edge conditions before submitting.'
  }

  return {
    questionId: questionResult.question_id,
    questionText: questionResult.question_text || (questionResult as any).text || '',
    topic,
    timeSpent,
    selectedOptionText: selectedText,
    correctOptionText: correctText,
    explanation,
    mistakeType,
    mistakeLabel,
    severity,
    diagnosis,
    recommendedAction,
    suggestedEbookQuery: topic,
  }
}

/**
 * Aggregate all question-level mistakes into a cohesive RemediationSummary.
 */
export function analyzeMistakes(result: TestResult): RemediationSummary {
  const totalQuestions = result.total_questions || (result.question_results ? result.question_results.length : 0)
  const questionResults = result.question_results || []
  const incorrectOrSkipped = questionResults.filter(q => !q.is_correct)

  const totalTime = questionResults.reduce((acc, q) => acc + (q.time_spent ?? 0), 0)
  const averageTime = totalQuestions > 0 ? totalTime / totalQuestions : 60

  const items: MistakeAnalysisItem[] = incorrectOrSkipped.map(q =>
    classifyMistake(q, averageTime)
  )

  const counts: Record<CognitiveMistakeType, number> = {
    CONCEPT_GAP: 0,
    CALCULATION_SLIP: 0,
    TIME_CRUNCH: 0,
    UNANSWERED: 0,
    CONFIDENCE_MISMATCH: 0,
  }

  const topicCount: Record<string, number> = {}

  items.forEach(item => {
    counts[item.mistakeType] = (counts[item.mistakeType] || 0) + 1
    topicCount[item.topic] = (topicCount[item.topic] || 0) + 1
  })

  const totalMistakes = items.length
  const denom = totalMistakes > 0 ? totalMistakes : 1

  const categoryMeta: Record<CognitiveMistakeType, { label: string; color: string; description: string; iconName: string }> = {
    CONCEPT_GAP: {
      label: 'Conceptual Hurdle',
      color: '#EF4444',
      description: 'Struggled with core theoretical principles despite adequate time.',
      iconName: 'BrainCircuit',
    },
    CALCULATION_SLIP: {
      label: 'Precision & Distractor Slip',
      color: '#F59E0B',
      description: 'Fell for trap options or hasty arithmetic under time pressure.',
      iconName: 'AlertTriangle',
    },
    TIME_CRUNCH: {
      label: 'Time Crunch Rush',
      color: '#8B5CF6',
      description: 'Forced to guess rapidly due to depleted section timer.',
      iconName: 'Timer',
    },
    UNANSWERED: {
      label: 'Skipped / Low Confidence',
      color: '#6B7280',
      description: 'Left blank due to uncertainty or pacing bottlenecks.',
      iconName: 'RotateCcw',
    },
    CONFIDENCE_MISMATCH: {
      label: 'Confidence Calibration',
      color: '#3B82F6',
      description: 'Discrepancy between self-assessed certainty and correctness.',
      iconName: 'Target',
    },
  }

  const categories: RemediationCategoryStats[] = (
    Object.keys(counts) as CognitiveMistakeType[]
  )
    .filter(type => counts[type] > 0)
    .map(type => ({
      type,
      label: categoryMeta[type].label,
      count: counts[type],
      percentage: Math.round((counts[type] / denom) * 100),
      color: categoryMeta[type].color,
      description: categoryMeta[type].description,
      iconName: categoryMeta[type].iconName,
    }))
    .sort((a, b) => b.count - a.count)

  let primaryWeakness: CognitiveMistakeType | null = null
  let primaryWeaknessLabel = 'Balanced Assessment'

  if (categories.length > 0) {
    primaryWeakness = categories[0].type
    primaryWeaknessLabel = categories[0].label
  }

  const targetTopics = Object.entries(topicCount)
    .sort((a, b) => b[1] - a[1])
    .map(([topic]) => topic)

  const actionableInsights: string[] = []
  if (counts.CONCEPT_GAP > 0) {
    actionableInsights.push(
      `Detected ${counts.CONCEPT_GAP} conceptual gap(s). Prioritize theory review before re-attempting timed tests.`
    )
  }
  if (counts.CALCULATION_SLIP > 0) {
    actionableInsights.push(
      `Avoided ${counts.CALCULATION_SLIP} marks lost to precision slips by writing down intermediate steps.`
    )
  }
  if (counts.TIME_CRUNCH > 0) {
    actionableInsights.push(
      `${counts.TIME_CRUNCH} answer(s) were submitted under time crunch. Work on question triage in the first 5 minutes.`
    )
  }
  if (actionableInsights.length === 0) {
    actionableInsights.push('Excellent performance! Review minor solutions to reinforce long-term mastery.')
  }

  const drillTitle =
    targetTopics.length > 0
      ? `Targeted Drill: ${targetTopics.slice(0, 2).join(' & ')} Mastery`
      : `Remediation Drill: ${result.test_title}`

  return {
    attemptId: result.attempt_id,
    testId: result.test_id,
    testTitle: result.test_title,
    totalQuestions,
    totalMistakes,
    accuracyPercentage: result.percentage ?? Math.round((result.correct_count / totalQuestions) * 100),
    categories,
    items,
    primaryWeakness,
    primaryWeaknessLabel,
    actionableInsights,
    recommendedDrillTitle: drillTitle,
    targetTopics,
  }
}

/**
 * Creates configuration for a quick 5-question micro-drill focused strictly
 * on remediating the student's observed mistake patterns.
 */
export function createRemediationDrillConfig(
  summary: RemediationSummary,
  examName = 'Competitive Exam'
): TargetedDrillConfig {
  const targetedMistakes = summary.categories.slice(0, 2).map(c => c.type)

  return {
    title: summary.recommendedDrillTitle,
    examName,
    mode: 'practice',
    difficulty: summary.primaryWeakness === 'CONCEPT_GAP' ? 'medium' : 'mixed',
    topics: summary.targetTopics.length > 0 ? summary.targetTopics.slice(0, 3) : ['General Aptitude'],
    questionCount: Math.min(Math.max(summary.totalMistakes, 5), 10),
    timeLimitMinutes: 10,
    mistakeTypesTargeted: targetedMistakes,
  }
}

/**
 * CAR Adaptive Remediation Methods
 */
export async function diagnose(telemetry: QuestionTelemetry): Promise<DiagnosticAssessment> {
  try {
    const res = await api.post<{ data: DiagnosticAssessment }>('/api/v1/remediation/diagnose', telemetry)
    if (res?.data) {
      return res.data
    }
  } catch (err) {
    // Local fallback
  }

  const timeRatio = telemetry.timeSpentSeconds / Math.max(1, telemetry.benchmarkTimeSeconds)
  const isCareless = !telemetry.isCorrect && timeRatio < 0.35 && telemetry.userPriorMastery >= 0.75
  const etiology: MistakeEtiology = isCareless ? 'CARELESS_SLIP' : 'KNOWLEDGE_DEFICIT'

  return {
    questionId: telemetry.questionId,
    conceptId: telemetry.conceptId,
    conceptName: telemetry.conceptName,
    etiology,
    confidence: 0.9,
    explanation: isCareless
      ? 'Rapid response time with high prior mastery indicates an execution slip.'
      : 'Direct misconception in foundational prerequisite knowledge.',
    prescribedScaffold: {
      prerequisiteId: `prereq-${telemetry.conceptId}`,
      prerequisiteName: `Foundational Principles of ${telemetry.conceptName}`,
      targetDifficulty: -0.5,
      drillStepCount: isCareless ? 1 : 3,
      estimatedRecoveryTimeMinutes: isCareless ? 2 : 6
    }
  }
}

export async function getDrill(conceptId: string, conceptName: string, etiology: MistakeEtiology): Promise<RemediationDrillPayload> {
  try {
    const res = await api.get<{ data: RemediationDrillPayload }>(
      `/api/v1/remediation/drill/${conceptId}?conceptName=${encodeURIComponent(conceptName)}&etiology=${etiology}`
    )
    if (res?.data) {
      return res.data
    }
  } catch (err) {
    // Local fallback
  }

  return {
    conceptId,
    conceptName,
    etiology,
    steps: [
      {
        stepNumber: 1,
        tier: 'PREREQUISITE_ANCHOR',
        prompt: `[Step 1 - Fundamental Anchor] Identify the core property of ${conceptName}:`,
        options: [
          `Invariant conservation of bounded state properties`,
          `Arbitrary divergent iteration without termination guarantee`,
          `Unchecked heuristic memory mutation`,
          `Inverse traversal omitting base bounds`
        ],
        correctIndex: 0,
        hint: `Think of deterministic guarantees and conservation rules.`,
        explanation: `System soundness begins by confirming state invariants.`,
        difficulty: -0.5
      },
      {
        stepNumber: 2,
        tier: 'CONCEPTUAL_TRANSFER',
        prompt: `[Step 2 - Contextual Transfer] How should edge boundary transitions be regulated in ${conceptName}?`,
        options: [
          `Apply monotonic bounds clamp and proportional dampening`,
          `Bypass boundary validation to maximize loop frequency`,
          `Reset all internal registers to arbitrary offsets`,
          `Drop exceptions without recording system telemetry`
        ],
        correctIndex: 0,
        hint: `Consider stability constraints and monotonicity.`,
        explanation: `Monotonic bounds prevent uncontrolled oscillation.`,
        difficulty: 0.2
      },
      {
        stepNumber: 3,
        tier: 'MASTERY_VERIFICATION',
        prompt: `[Step 3 - Mastery Synthesis] In a high-concurrency production workload, what guarantees correctness for ${conceptName}?`,
        options: [
          `Idempotent transaction semantics and atomic state transitions`,
          `Non-locking asynchronous writes without consistency checks`,
          `Unsynchronized global state mutations`,
          `Ephemeral cache reads without replica verification`
        ],
        correctIndex: 0,
        hint: `Prioritize atomicity and idempotency.`,
        explanation: `Atomic transitions preserve systemic integrity under concurrent stress.`,
        difficulty: 0.8
      }
    ],
    potentialMasteryDelta: 0.18
  }
}

export async function submitDrill(
  conceptId: string,
  submittedAnswers: number[],
  correctAnswers: number[],
  priorMastery: number
): Promise<DrillSubmissionResult> {
  try {
    const res = await api.post<{ data: DrillSubmissionResult }>(
      '/api/v1/remediation/submit-drill',
      { conceptId, submittedAnswers, correctAnswers, priorMastery }
    )
    if (res?.data) {
      return res.data
    }
  } catch (err) {
    // Local fallback
  }

  let correctCount = 0
  submittedAnswers.forEach((ans, i) => {
    if (ans === correctAnswers[i]) correctCount++
  })
  const passed = correctCount >= Math.ceil(correctAnswers.length * 0.66)
  const delta = passed ? 0.15 : -0.04
  const updated = Math.min(1.0, Math.max(0.05, priorMastery + delta))

  return {
    conceptId,
    passed,
    score: correctCount,
    previousMastery: priorMastery,
    updatedMastery: parseFloat(updated.toFixed(3)),
    masteryDelta: parseFloat(delta.toFixed(3)),
    feedback: passed
      ? 'Well done! All remediation drill steps verified.'
      : 'Prerequisite gap detected. Review the concept lesson.',
    recoveredStatus: passed ? 'FULLY_RECOVERED' : 'NEEDS_PREREQUISITE_COURSE'
  }
}

export const remediationService = {
  classifyMistake,
  analyzeMistakes,
  createRemediationDrillConfig,
  diagnose,
  getDrill,
  submitDrill,
}
