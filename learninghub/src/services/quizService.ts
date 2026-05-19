import { fetchApi } from '../utils/api'

export interface Quiz {
  id: string
  title: string
  description: string
  course_id: string
  course_title: string
  time_limit: number
  passing_score: number
  total_questions: number
  max_attempts: number
  attempts_made: number
}

export interface QuizQuestion {
  id: string
  question: string
  type: 'multiple_choice' | 'true_false' | 'short_answer'
  options: string[]
  correct_answer: string
  explanation: string
  points: number
}

export interface QuizAttempt {
  id: string
  test_id: string
  started_at: string
  completed_at: string | null
  score: number
  passed: boolean
  answers: {
    question_id: string
    answer: string
    correct: boolean
    points: number
  }[]
}

export interface QuizResult {
  attempt_id: string
  score: number
  passed: boolean
  total_questions: number
  correct_answers: number
  time_taken: number
  percentage: number
}

// Raw API response types for mapping
interface RawOption {
  id: string
  text: string
  is_correct?: boolean
}

interface RawQuestion {
  id: string
  text: string
  question_type: 'multiple_choice' | 'true_false' | 'short_answer'
  options?: RawOption[]
  explanation?: string
  marks: number
}

export const quizService = {
  getCourseQuizzes: (courseId: string) =>
    fetchApi(`/tests?courseId=${courseId}`).then(res => {
      const data = res.data ?? res
      return Promise.resolve({
        status: res.status ?? 'success',
        data: Array.isArray(data) ? data : (data.data ?? []),
      })
    }) as Promise<{ status: string; data: Quiz[] }>,

  getQuiz: (quizId: string) =>
    fetchApi(`/tests/${quizId}`).then(res => ({
      status: res.status ?? 'success',
      data: {
        quiz: res.data ?? res,
        questions: (res.data?.questions ?? res.questions ?? []).map((q: RawQuestion) => ({
          id: q.id,
          question: q.text,
          type: q.question_type,
          options: q.options?.map((o: RawOption) => o.text) ?? [],
          correct_answer: q.options?.find((o: RawOption) => o.is_correct)?.text ?? '',
          explanation: q.explanation ?? '',
          points: q.marks,
        })),
      },
    })) as Promise<{
      status: string
      data: { quiz: Quiz; questions: QuizQuestion[] }
    }>,

  startAttempt: (quizId: string) =>
    fetchApi(`/tests/${quizId}/start`, {
      method: 'POST',
    }).then(res => ({ // Fixed: removed unnecessary body
      status: res.status ?? 'success',
      data: {
        attempt_id: res.data?.attempt_id ?? res.data?.id,
        questions: (res.data?.questions ?? []).map((q: RawQuestion) => ({
          id: q.id,
          question: q.text,
          type: q.question_type,
          options: q.options?.map((o: RawOption) => o.text) ?? [],
          correct_answer: q.options?.find((o: RawOption) => o.is_correct)?.text ?? '',
          explanation: q.explanation ?? '',
          points: q.marks,
        })),
      },
    })) as Promise<{ status: string; data: { attempt_id: string; questions: QuizQuestion[] } }>,

  async submitQuiz(
    quizId: string,
    attemptId: string,
    answers: Record<string, string>,
    timeTaken: number
  ) {
    const res = await fetchApi(`/tests/${quizId}/submit`, {
      method: 'POST',
      body: JSON.stringify({
        attempt_id: attemptId,
        answers,
        timeTaken,
      }),
    })
    const data = res.data ?? res
    return {
      status: res.status ?? 'success',
      data: {
        attempt_id: data.attempt_id ?? data.id ?? attemptId,
        score: data.score ?? 0,
        passed: data.passed ?? false,
        total_questions: data.total_questions ?? 0,
        correct_answers: data.correct_answers ?? 0,
        time_taken: data.time_taken ?? timeTaken,
        percentage: data.percentage ?? 0,
      },
    }
  },

  getResults(quizId: string) { // Fixed: corrected endpoint and parameter
    return fetchApi(`/tests/${quizId}/result`).then(res => ({
      status: res.status ?? 'success',
      data: res.data ?? {} as QuizResult,
    })) as Promise<{ status: string; data: QuizResult }>
  },

  getAttempts: (quizId?: string, signal?: AbortSignal) => { // Fixed: parameter name
    const url = quizId ? `/tests/${quizId}/attempts` : '/tests/attempts'
    const options = signal !== undefined ? { signal } : undefined
    return (options ? fetchApi(url, options) : fetchApi(url)).then(res => {
      const raw = res.data ?? res
      const data = raw?.data ?? raw?.results ?? (Array.isArray(raw) ? raw : [])
      return {
        status: res.status ?? 'success',
        data: Array.isArray(data) ? data : [],
      }
    }) as Promise<{ status: string; data: QuizAttempt[] }>
  },

  getMyResults: () => // Fixed: corrected endpoint
    fetchApi(`/tests/my-results`).then(res => ({
      status: res.status ?? 'success',
      data: {
        results: res.data?.data ?? [],
        totalXp: 0,
      },
    })) as Promise<{
      status: string
      data: { results: QuizResult[]; totalXp: number }
    }>,

  listQuizzes: () =>
    fetchApi(`/tests`).then(res => ({ // Fixed: removed trailing slash
      status: res.status ?? 'success',
      data: res.data?.data ?? res.results ?? [],
    })) as Promise<{ status: string; data: Quiz[] }>,
}
