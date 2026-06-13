export const mapQuestionSafe = (q: {
  id: string
  text: string
  type: string
  difficulty?: number
  bloomLevel?: string
  points: number
  order: number
  options: Array<{ id: string; text: string; order: number }>
}) => ({
  id: q.id,
  text: q.text,
  type: q.type,
  difficulty: q.difficulty ?? 0.5,
  bloom_level: q.bloomLevel ?? 'understand',
  points: q.points,
  marks: q.points,
  order: q.order,
  options: q.options.map(o => ({ id: o.id, text: o.text, order: o.order })),
})

export const TEST_MODES = ['PRACTICE', 'MOCK', 'TIMED_CHALLENGE', 'ADAPTIVE', 'FLASHCARD'] as const
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
  return submitted.every((id, index) => id === correct[index])
}

export const hasQuestionResultAnswer = (questionResult: any): boolean => {
  if (Array.isArray(questionResult?.selected_options)) {
    return questionResult.selected_options.some((option: any) => hasSubmittedAnswer(option?.id))
  }
  return hasSubmittedAnswer(questionResult?.selected_option_id)
}

export const countQuestionResults = (
  questionResults: any[],
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
