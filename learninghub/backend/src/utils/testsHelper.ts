/**
 * Deterministic pseudo-random number generator (Mulberry32)
 */
export const createSeededRng = (seedStr: string): (() => number) => {
  let h = 0x811c9dc5
  for (let i = 0; i < seedStr.length; i++) {
    h = Math.imul(h ^ seedStr.charCodeAt(i), 0x01000193)
  }
  let s = h >>> 0
  return () => {
    s |= 0
    s = (s + 0x6d2b79f5) | 0
    let t = Math.imul(s ^ (s >>> 15), 1 | s)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

/**
 * Deterministically shuffles an array copy using a seed string
 */
export const deterministicShuffle = <T>(array: T[], seed: string): T[] => {
  if (!array || array.length <= 1) return array ? [...array] : []
  const rng = createSeededRng(seed)
  const result = [...array]
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1))
    const temp = result[i]
    result[i] = result[j]
    result[j] = temp
  }
  return result
}

export const mapQuestionSafe = (
  q: {
    id: string
    text: string
    type: string
    difficulty?: number
    bloomLevel?: string
    points: number
    order: number
    sectionId?: string | null
    options: Array<{ id: string; text: string; order: number }>
  },
  attemptSeed?: string,
  shuffleOptions?: boolean
) => {
  const optionsToMap =
    shuffleOptions && attemptSeed
      ? deterministicShuffle(q.options, `${attemptSeed}-${q.id}`)
      : q.options

  return {
    id: q.id,
    text: q.text,
    type: q.type,
    difficulty: q.difficulty ?? 0.5,
    bloom_level: q.bloomLevel ?? 'UNDERSTAND',
    points: q.points,
    marks: q.points,
    order: q.order,
    section_id: q.sectionId ?? null,
    sectionId: q.sectionId ?? null,
    options: optionsToMap.map(o => ({ id: o.id, text: o.text, order: o.order })),
  }
}

export const TEST_MODES = [
  'PRACTICE',
  'MOCK',
  'TIMED_CHALLENGE',
  'ADAPTIVE',
  'FLASHCARD',
  'CONTEST',
] as const
export const TEST_DIFFICULTIES = ['EASY', 'MEDIUM', 'HARD', 'MIXED', 'ADAPTIVE'] as const

export const normalizeEnumFilter = <T extends readonly string[]>(
  value: unknown,
  allowedValues: T
): T[number] | undefined => {
  if (typeof value !== 'string' || value.trim() === '') return undefined
  const normalized = value.trim().toUpperCase()
  return allowedValues.includes(normalized) ? normalized : undefined
}

export const getRemainingSeconds = (
  startedAt: Date | string | null | undefined,
  timeLimitMinutes: number
): number => {
  const timeLimitSeconds = Math.max(0, timeLimitMinutes * 60)
  const startedAtMs =
    startedAt instanceof Date ? startedAt.getTime() : Date.parse(String(startedAt))

  if (!Number.isFinite(startedAtMs)) {
    return timeLimitSeconds
  }

  const elapsedSeconds = Math.max(0, Math.floor((Date.now() - startedAtMs) / 1000))
  return Math.max(0, timeLimitSeconds - elapsedSeconds)
}

export const hasSubmittedAnswer = (answer: unknown): boolean => {
  if (Array.isArray(answer)) return answer.some(item => hasSubmittedAnswer(item))
  if (typeof answer === 'string') return answer.trim().length > 0
  return answer !== null && answer !== undefined
}

export const normalizeAnswerIds = (answer: unknown): string[] => {
  const rawAnswers = Array.isArray(answer) ? answer : [answer]
  const normalized = rawAnswers
    .filter(hasSubmittedAnswer)
    .map(item => String(item).trim())
    .filter(Boolean)

  return Array.from(new Set(normalized))
}

export const answersMatch = (submittedIds: string[], correctIds: string[]): boolean => {
  if (submittedIds.length !== correctIds.length) return false
  const submitted = [...submittedIds].sort()
  const correct = [...correctIds].sort()
  // eslint-disable-next-line security/detect-object-injection
  return submitted.every((id, index) => id === correct[index])
}

export interface LegacyQuestionResult {
  is_correct?: boolean | null
  selected_options?: { id: string }[]
  selected_option_id?: string
  [key: string]: unknown
}

export const hasQuestionResultAnswer = (questionResult: LegacyQuestionResult): boolean => {
  if (Array.isArray(questionResult?.selected_options)) {
    return questionResult.selected_options.some(option => hasSubmittedAnswer(option?.id))
  }
  return hasSubmittedAnswer(questionResult?.selected_option_id)
}

export const countQuestionResults = (
  questionResults: LegacyQuestionResult[],
  totalQuestions: number = questionResults.length
): { correctCount: number; incorrectCount: number; unansweredCount: number } => {
  const correctCount = questionResults.filter(q => q.is_correct === true).length
  const incorrectCount = questionResults.filter(
    q => q.is_correct === false && hasQuestionResultAnswer(q)
  ).length
  const unansweredFromResults = questionResults.filter(q => !hasQuestionResultAnswer(q)).length
  const missingQuestionCount = Math.max(0, totalQuestions - questionResults.length)

  return {
    correctCount,
    incorrectCount,
    unansweredCount: unansweredFromResults + missingQuestionCount,
  }
}
