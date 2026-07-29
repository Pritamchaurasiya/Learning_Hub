import { fetchApi } from '../utils/api'

// Types aligned with Express/Prisma test engine API
export interface TestA {
  id: string
  title: string
  description: string
  exam_name: string
  exam_code: string
  country_name: string
  mode: 'practice' | 'mock' | 'timed_challenge' | 'adaptive' | 'review'
  difficulty: 'easy' | 'medium' | 'hard' | 'mixed' | 'adaptive'
  time_limit_minutes: number
  passing_score: number
  total_marks: number
  negative_marks_per_question: number
  question_count: number
  is_ai_generated: boolean
  is_featured: boolean
  attempt_count: number
  created_at: string
}

export interface TestQuestion {
  id: string
  text: string
  question_type:
    'mcq' | 'multiple_select' | 'true_false' | 'numerical' | 'fill_blank' | 'subjective'
  type?: string
  difficulty: number
  bloom_level: string
  options: {
    id: string
    text: string
    order: number
  }[]
  order: number
  marks: number
}

export interface TestAttempt {
  id: string
  test: string
  test_title: string
  exam_name: string
  mode: string
  status: 'not_started' | 'in_progress' | 'submitted' | 'expired' | 'abandoned'
  score: number
  total_marks: number
  percentage: number
  passed: boolean | null
  time_taken_seconds: number
  time_remaining_seconds?: number
  attempt_number: number
  answered_count?: number
  started_at: string
  submitted_at: string | null
  answers?: Array<{
    id: string
    question_id: string
    question_text: string
    question_type: string
    selected_options: Array<{ id: string; text: string }>
    text_answer: string
    is_correct: boolean | null
    marks_obtained: number
    time_spent: number
    is_flagged: boolean
    is_bookmarked: boolean
    answered_at: string | null
  }>
}

export interface TestResult {
  attempt_id: string
  test_id: string
  test_title: string
  mode: string
  score: number
  total_marks: number
  percentage: number
  passed: boolean
  time_taken: number
  time_limit: number
  correct_count: number
  incorrect_count: number
  unanswered_count: number
  is_mock?: boolean
  question_results: Array<{
    question_id: string
    question_text: string
    question_type: string
    selected_options: Array<{ id: string; text: string }>
    correct_options: Array<{ id: string; text: string }>
    is_correct: boolean | null
    marks_obtained: number
    text_answer?: string
    ai_feedback?: string
    explanation: string
    time_spent: number
    is_flagged: boolean
    topic?: string
    confidence?: string
  }>
}

const normalizeEnum = (value: unknown, fallback: string): string =>
  typeof value === 'string' ? value.toLowerCase() : fallback

interface RawTestData {
  id?: string
  title?: string
  description?: string
  exam_name?: string
  exam_code?: string
  country_name?: string
  mode?: string
  difficulty?: string
  time_limit_minutes?: number
  time_limit?: number
  passing_score?: number
  total_marks?: number
  negative_marks_per_question?: number
  negative_marks?: number
  question_count?: number
  total_questions?: number
  is_ai_generated?: boolean
  is_featured?: boolean
  attempt_count?: number
  attempts_made?: number
  created_at?: string
}

const normalizeTest = (raw: RawTestData): TestA => ({
  id: raw.id ?? '',
  title: raw.title ?? '',
  description: raw.description ?? '',
  exam_name: raw.exam_name ?? '',
  exam_code: raw.exam_code ?? '',
  country_name: raw.country_name ?? '',
  mode: normalizeEnum(raw.mode, 'mock') as TestA['mode'],
  difficulty: normalizeEnum(raw.difficulty, 'mixed') as TestA['difficulty'],
  time_limit_minutes: raw.time_limit_minutes ?? raw.time_limit ?? 0,
  passing_score: raw.passing_score ?? 0,
  total_marks: raw.total_marks ?? 0,
  negative_marks_per_question: raw.negative_marks_per_question ?? raw.negative_marks ?? 0,
  question_count: raw.question_count ?? raw.total_questions ?? 0,
  is_ai_generated: raw.is_ai_generated ?? false,
  is_featured: raw.is_featured ?? false,
  attempt_count: raw.attempt_count ?? raw.attempts_made ?? 0,
  created_at: raw.created_at ?? new Date(0).toISOString(),
})

const normalizeAttemptStatus = (rawStatus: unknown): TestAttempt['status'] => {
  const status = normalizeEnum(rawStatus, 'not_started')

  if (status === 'completed' || status === 'submitted') return 'submitted'
  if (status === 'timeout' || status === 'expired') return 'expired'
  if (status === 'abandoned') return 'abandoned'
  if (status === 'in_progress') return 'in_progress'
  return 'not_started'
}

interface RawAttemptData {
  id?: string
  test_id?: string
  test_title?: string
  test?: string | { title?: string }
  exam_name?: string
  mode?: string
  status?: string
  score?: number
  total_marks?: number
  totalPoints?: number
  percentage?: number
  passed?: boolean | null
  time_taken_seconds?: number
  timeTaken?: number
  attempt_number?: number
  attemptNumber?: number
  answered_count?: number
  started_at?: string
  startedAt?: string
  submitted_at?: string | null
  completedAt?: string | null
  answers?: TestAttempt['answers']
}

const normalizeAttempt = (raw: RawAttemptData): TestAttempt => ({
  id: raw.id ?? '',
  test: typeof raw.test === 'string' ? raw.test : (raw.test_id ?? ''),
  test_title:
    raw.test_title ?? (typeof raw.test === 'object' ? raw.test?.title : undefined) ?? 'Test',
  exam_name: raw.exam_name ?? '',
  mode: normalizeEnum(raw.mode, 'mock'),
  status: normalizeAttemptStatus(raw.status),
  score: raw.score ?? 0,
  total_marks: raw.total_marks ?? raw.totalPoints ?? 0,
  percentage: raw.percentage ?? 0,
  passed: raw.passed ?? null,
  time_taken_seconds: raw.time_taken_seconds ?? raw.timeTaken ?? 0,
  attempt_number: raw.attempt_number ?? raw.attemptNumber ?? 1,
  answered_count: raw.answered_count,
  started_at: raw.started_at ?? raw.startedAt ?? new Date(0).toISOString(),
  submitted_at: raw.submitted_at ?? raw.completedAt ?? null,
  answers: raw.answers,
})

interface RawQuestionResult {
  question_id?: string
  question_text?: string
  question_type?: string
  selected_options?: Array<{ id: string; text: string }>
  selected_option_id?: string
  correct_options?: Array<{ id: string; text: string }>
  correct_option_id?: string
  is_correct?: boolean | null
  marks_obtained?: number
  explanation?: string
  time_spent?: number
  is_flagged?: boolean
}

interface RawResultData {
  attempt_id?: string
  id?: string
  test_id?: string
  testId?: string
  test?: { id?: string; title?: string; mode?: string; totalMarks?: number; timeLimit?: number }
  test_title?: string
  mode?: string
  score?: number
  total_marks?: number
  totalPoints?: number
  percentage?: number
  passed?: boolean
  time_taken?: number
  timeTaken?: number
  time_taken_seconds?: number
  time_limit?: number
  correct_count?: number
  incorrect_count?: number
  unanswered_count?: number
  question_results?: RawQuestionResult[]
}

const normalizeAttemptResult = (raw: RawResultData): TestResult => {
  const rawQuestionResults = Array.isArray(raw.question_results) ? raw.question_results : []
  const questionResults: TestResult['question_results'] = rawQuestionResults.map(
    (question: RawQuestionResult) => ({
      question_id: question.question_id ?? '',
      question_text: question.question_text ?? '',
      question_type: question.question_type ?? 'mcq',
      selected_options:
        question.selected_options ??
        (question.selected_option_id ? [{ id: question.selected_option_id, text: '' }] : []),
      correct_options:
        question.correct_options ??
        (question.correct_option_id ? [{ id: question.correct_option_id, text: '' }] : []),
      is_correct: question.is_correct ?? null,
      marks_obtained: question.marks_obtained ?? 0,
      explanation: question.explanation ?? '',
      time_spent: question.time_spent ?? 0,
      is_flagged: question.is_flagged ?? false,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      topic: (question as any).topic,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      confidence: (question as any).confidence,
    })
  )

  return {
    attempt_id: raw.attempt_id ?? raw.id ?? '',
    test_id:
      raw.test_id ?? raw.testId ?? (typeof raw.test === 'object' ? raw.test?.id : undefined) ?? '',
    test_title:
      raw.test_title ?? (typeof raw.test === 'object' ? raw.test?.title : undefined) ?? 'Test',
    mode: normalizeEnum(
      raw.mode ?? (typeof raw.test === 'object' ? raw.test?.mode : undefined),
      'mock'
    ),
    score: raw.score ?? 0,
    total_marks:
      raw.total_marks ??
      raw.totalPoints ??
      (typeof raw.test === 'object' ? raw.test?.totalMarks : undefined) ??
      0,
    percentage: raw.percentage ?? 0,
    passed: raw.passed ?? false,
    time_taken: raw.time_taken ?? raw.timeTaken ?? raw.time_taken_seconds ?? 0,
    time_limit:
      raw.time_limit ?? (typeof raw.test === 'object' ? raw.test?.timeLimit : undefined) ?? 0,
    correct_count: raw.correct_count ?? questionResults.filter(q => q.is_correct).length,
    incorrect_count:
      raw.incorrect_count ?? questionResults.filter(q => q.is_correct === false).length,
    unanswered_count:
      raw.unanswered_count ?? questionResults.filter(q => q.selected_options.length === 0).length,
    question_results: questionResults,
  }
}

// Service
export const testsAService = {
  // Get all tests with optional filters
  getTests: (filters?: {
    exam?: string
    mode?: string
    difficulty?: string
    country?: string
    search?: string
  }) => {
    const params = new URLSearchParams()
    if (filters?.exam) params.append('exam', filters.exam)
    if (filters?.mode) params.append('mode', filters.mode)
    if (filters?.difficulty) params.append('difficulty', filters.difficulty)
    if (filters?.country) params.append('country', filters.country)
    if (filters?.search) params.append('search', filters.search)

    const queryString = params.toString()
    const url = `/tests${queryString ? `?${queryString}` : ''}`

    return fetchApi(url).then(res => {
      const tests = Array.isArray(res.data) ? res.data : (res.data?.results ?? [])
      return {
        status: res.status ?? 'success',
        data: tests.map(normalizeTest),
      }
    }) as Promise<{ status: string; data: TestA[] }>
  },

  // Get single test details with questions
  getTest: (testId: string) =>
    fetchApi(`/tests/${testId}`).then(res => {
      const quiz = res.data?.quiz ?? res.data ?? {}
      return {
        status: res.status ?? 'success',
        data: normalizeTest(quiz),
      }
    }) as Promise<{ status: string; data: TestA }>,

  // AI-generate a new test
  generateTest: (config: {
    topic: string
    difficulty?: string
    count?: number
    mode?: string
    time_limit?: number
  }) =>
    fetchApi('/ai/generate-test', {
      method: 'POST',
      body: JSON.stringify(config),
    }).then(res => ({
      status: res.status ?? 'success',
      data: res.data,
    })) as Promise<{ status: string; data: TestA }>,

  // Start a test attempt
  startTest: (testId: string) =>
    fetchApi(`/tests/${testId}/start`, {
      method: 'POST',
      body: JSON.stringify({}),
    }).then(res => ({
      status: res.status ?? 'success',
      data: res.data,
    })) as Promise<{
      status: string
      data: {
        attemptId?: string
        attempt_id?: string
        questions?: TestQuestion[]
        answers?: Record<string, string>
        time_limit?: number
        time_remaining_seconds?: number
      }
    }>,

  // Autosave an answer during test (uses inline route in routes/index.ts)
  autosaveAnswer: (testId: string, questionId: string, optionId: string, attemptId?: string) =>
    fetchApi(`/tests/${testId}/autosave`, {
      method: 'POST',
      body: JSON.stringify({ answers: { [questionId]: optionId }, attempt_id: attemptId }),
    }).then(res => ({
      status: res.status ?? 'success',
      data: res.data,
    })) as Promise<{ status: string; data: { saved: boolean } }>,

  // Batch autosave: send ALL current answers at once (used by periodic autosave)
  batchAutosave: (testId: string, answers: Record<string, string | string[]>, attemptId?: string) =>
    fetchApi(`/tests/${testId}/autosave`, {
      method: 'POST',
      body: JSON.stringify({ answers, attempt_id: attemptId }),
    }).then(res => ({
      status: res.status ?? 'success',
      data: res.data,
    })) as Promise<{ status: string; data: { saved: boolean } }>,

  // Submit test
  submitTest: (
    testId: string,
    answers: Record<string, string | string[]>,
    timeTaken: number,
    attemptId: string,
    confidences?: Record<string, string>
  ) =>
    fetchApi(`/tests/${testId}/submit`, {
      method: 'POST',
      body: JSON.stringify({ answers, timeTaken, attempt_id: attemptId, confidences }),
    }).then(res => ({
      status: res.status ?? 'success',
      data: res.data,
    })) as Promise<{ status: string; data: TestResult }>,

  // Get test result
  getResult: (testId: string) =>
    fetchApi(`/tests/${testId}/result`).then(res => ({
      status: res.status ?? 'success',
      data: res.data,
    })) as Promise<{ status: string; data: TestResult }>,

  // Get user's test attempts
  getAttempts: () =>
    fetchApi('/tests/attempts').then(res => {
      const data = res.data ?? res
      const results = data?.results ?? data?.data ?? []
      return {
        status: res.status ?? 'success',
        data: Array.isArray(results) ? results.map(normalizeAttempt) : [],
      }
    }) as Promise<{ status: string; data: TestAttempt[] }>,

  // Alias for getAttempts (used by TestsAHistoryPage)
  getMyResults: () =>
    fetchApi('/tests/attempts').then(res => {
      const data = res.data ?? res
      const results = data?.results ?? data?.data ?? []
      return {
        status: res.status ?? 'success',
        data: Array.isArray(results) ? results.map(normalizeAttempt) : [],
      }
    }) as Promise<{ status: string; data: TestAttempt[] }>,

  // Get specific attempt detail
  getAttempt: (attemptId: string) =>
    fetchApi(`/tests/attempts/${attemptId}`).then(res => ({
      status: res.status ?? 'success',
      data: res.data,
    })) as Promise<{ status: string; data: TestAttempt }>,

  getAttemptResult: (attemptId: string) =>
    fetchApi(`/tests/attempts/${attemptId}`).then(res => ({
      status: res.status ?? 'success',
      data: normalizeAttemptResult(res.data ?? {}),
    })) as Promise<{ status: string; data: TestResult }>,

  // List all available tests
  listTests: () =>
    fetchApi('/tests').then(res => {
      const tests = Array.isArray(res.data) ? res.data : (res.data?.results ?? [])
      return {
        status: res.status ?? 'success',
        data: tests.map(normalizeTest),
      }
    }) as Promise<{ status: string; data: TestA[] }>,
}

export default testsAService
