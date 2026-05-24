import { fetchApi } from '../utils/api'

// Types aligned with Django test_engine API
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
  question_type: 'mcq' | 'multiple_select' | 'true_false' | 'numerical' | 'fill_blank'
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
  attempt_number: number
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
  question_results: Array<{
    question_id: string
    question_text: string
    question_type: string
    selected_options: Array<{ id: string; text: string }>
    correct_options: Array<{ id: string; text: string }>
    is_correct: boolean | null
    marks_obtained: number
    explanation: string
    time_spent: number
    is_flagged: boolean
  }>
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

    return fetchApi(url).then(res => ({
      status: res.status ?? 'success',
      data: res.data?.results ?? [],
    })) as Promise<{ status: string; data: TestA[] }>
  },

  // Get single test details with questions
  getTest: (testId: string) =>
    fetchApi(`/tests/${testId}`).then(res => ({
      status: res.status ?? 'success',
      data: res.data,
    })) as Promise<{ status: string; data: TestA & { questions: TestQuestion[] } }>,

  // AI-generate a new test (placeholder - not implemented in backend)
  generateTest: (config: {
    exam_id: string
    subject_id?: string
    topic_ids?: string[]
    mode?: string
    difficulty?: string
    question_count?: number
    time_limit_minutes?: number
  }) =>
    fetchApi('/tests/generate', {
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
    })) as Promise<{ status: string; data: any }>,

  // Autosave an answer during test (uses inline route in routes/index.ts)
  autosaveAnswer: (
    testId: string,
    questionId: string,
    answerData: {
      selected_options?: string[]
      text_answer?: string
      time_spent?: number
    }
  ) =>
    fetchApi(`/tests/${testId}/autosave`, {
      method: 'POST',
      body: JSON.stringify({ question_id: questionId, ...answerData }),
    }).then(res => ({
      status: res.status ?? 'success',
      data: res.data,
    })) as Promise<{ status: string; data: any }>,

  // Submit test
  submitTest: (
    testId: string,
    answers: Record<string, string>,
    timeTaken: number,
    attemptId: string
  ) =>
    fetchApi(`/tests/${testId}/submit`, {
      method: 'POST',
      body: JSON.stringify({ answers, timeTaken, attempt_id: attemptId }),
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
      return { status: res.status ?? 'success', data: Array.isArray(results) ? results : [] }
    }) as Promise<{ status: string; data: TestAttempt[] }>,

  // Alias for getAttempts (used by TestsAHistoryPage)
  getMyResults: () =>
    fetchApi('/tests/attempts').then(res => {
      const data = res.data ?? res
      const results = data?.results ?? data?.data ?? []
      return { status: res.status ?? 'success', data: Array.isArray(results) ? results : [] }
    }) as Promise<{ status: string; data: TestAttempt[] }>,

  // Get specific attempt detail
  getAttempt: (attemptId: string) =>
    fetchApi(`/tests/attempts/${attemptId}`).then(res => ({
      status: res.status ?? 'success',
      data: res.data,
    })) as Promise<{ status: string; data: TestAttempt }>,

  // List all available tests
  listTests: () =>
    fetchApi('/tests').then(res => ({
      status: res.status ?? 'success',
      data: res.data?.results ?? [],
    })) as Promise<{ status: string; data: TestA[] }>,
}

export default testsAService

