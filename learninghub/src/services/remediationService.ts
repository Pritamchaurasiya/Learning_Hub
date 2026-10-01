/**
 * RemediationService
 *
 * Cognitive Mistake Categorization & Targeted Remediation Engine for Test A+.
 * Classifies mistakes into cognitive archetypes:
 *  - Concept Gap: High time spent, wrong answer selected (fundamental conceptual hurdle).
 *  - Calculation Slip / Trap: Moderate time spent, fell for distractor trap or hasty execution.
 *  - Time Crunch: Answered in <15s under low clock or rushed at end of assessment.
 *  - Unanswered / Hesitation: Question skipped due to lack of confidence or time depletion.
 *
 * Generates instant targeted micro-drills, Ebook deep links, and psychometric study recommendations.
 */

import { TestResult } from './testsAService'

export type CognitiveMistakeType =
  | 'CONCEPT_GAP'
  | 'CALCULATION_SLIP'
  | 'TIME_CRUNCH'
  | 'UNANSWERED'
  | 'CONFIDENCE_MISMATCH'

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
    diagnosis = 'Question was left unattempted, likely due to uncertainty or pacing bottlenecks.'
    recommendedAction = 'Practice pacing drills to attempt accessible marks in first-pass sweeps.'
  } else if (timeSpent > averageTimePerQuestion * 1.5 || timeSpent >= 60) {
    mistakeType = 'CONCEPT_GAP'
    mistakeLabel = 'Conceptual Gap'
    severity = 'CRITICAL'
    diagnosis = `Dedicated significant cognitive time (${timeSpent}s) but arrived at an incorrect formulation. Signals an underlying conceptual gap in ${topic}.`
    recommendedAction = `Re-read core chapter theory for "${topic}" and practice 5 standard foundation problems.`
  } else if (timeSpent < 15 || totalRemainingTimePercent < 15) {
    mistakeType = 'TIME_CRUNCH'
    mistakeLabel = 'Time Pressure / Rush'
    severity = 'HIGH'
    diagnosis = `Answered very quickly (${timeSpent}s) under time pressure, likely guessing or rushing.`
    recommendedAction = 'Improve time budgeting: allocate at least 45 seconds per multi-step problem.'
  } else if (questionResult.confidence === 'high') {
    mistakeType = 'CONFIDENCE_MISMATCH'
    mistakeLabel = 'Overconfidence Trap'
    severity = 'HIGH'
    diagnosis = 'Selected wrong answer with high self-reported confidence. Typical of classic distractor traps.'
    recommendedAction = 'Pay close attention to negative constraints (e.g. "which of the following is NOT true").'
  }

  return {
    questionId: questionResult.question_id,
    questionText: questionResult.question_text,
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
 * Generate full cognitive mistake analysis and remediation plan from a completed TestResult.
 */
export function analyzeMistakes(result: TestResult): RemediationSummary {
  const questionResults = result.question_results || []
  const totalQuestions = questionResults.length || result.correct_count + result.incorrect_count + result.unanswered_count || 1
  const incorrectResults = questionResults.filter(q => q.is_correct === false || (!q.is_correct && q.selected_options?.length === 0))

  const totalTimeTaken = result.time_taken || 60
  const avgTimePerQuestion = totalQuestions > 0 ? totalTimeTaken / totalQuestions : 60

  const items: MistakeAnalysisItem[] = incorrectResults.map(q =>
    classifyMistake(q, avgTimePerQuestion)
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

  const categoryMeta: Record<
    CognitiveMistakeType,
    { label: string; color: string; description: string; iconName: string }
  > = {
    CONCEPT_GAP: {
      label: 'Conceptual Gaps',
      color: 'text-red-600 bg-red-50 border-red-200 dark:bg-red-950/40 dark:text-red-400 dark:border-red-900',
      description: 'Misunderstanding of core theorems, definitions, or algorithms.',
      iconName: 'BrainCircuit',
    },
    CALCULATION_SLIP: {
      label: 'Precision Slips',
      color: 'text-amber-600 bg-amber-50 border-amber-200 dark:bg-amber-950/40 dark:text-amber-400 dark:border-amber-900',
      description: 'Minor algebraic, boundary, or distractor oversight.',
      iconName: 'AlertTriangle',
    },
    TIME_CRUNCH: {
      label: 'Time Crunch Rushes',
      color: 'text-purple-600 bg-purple-50 border-purple-200 dark:bg-purple-950/40 dark:text-purple-400 dark:border-purple-900',
      description: 'Rushed answers under low exam clock or rapid guesswork.',
      iconName: 'Clock',
    },
    UNANSWERED: {
      label: 'Unattempted / Hesitations',
      color: 'text-slate-600 bg-slate-50 border-slate-200 dark:bg-slate-900/40 dark:text-slate-400 dark:border-slate-800',
      description: 'Questions skipped due to low confidence or exhaustion.',
      iconName: 'XCircle',
    },
    CONFIDENCE_MISMATCH: {
      label: 'Overconfidence Traps',
      color: 'text-rose-600 bg-rose-50 border-rose-200 dark:bg-rose-950/40 dark:text-rose-400 dark:border-rose-900',
      description: 'High confidence placed on deceptively worded trap choices.',
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

  // Sorted target weak topics
  const targetTopics = Object.entries(topicCount)
    .sort((a, b) => b[1] - a[1])
    .map(([topic]) => topic)

  // Generate actionable insights
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

export const remediationService = {
  classifyMistake,
  analyzeMistakes,
  createRemediationDrillConfig,
}
