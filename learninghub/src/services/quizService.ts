import { fetchApi } from '../utils/api';

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
  quiz_id: string
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

export const quizService = {
  getCourseQuizzes: (courseId: string) =>
    fetchApi(`/tests?courseId=${courseId}`) as Promise<{ status: string; data: Quiz[] }>,

  getQuiz: (quizId: string) =>
    fetchApi(`/tests/${quizId}`) as Promise<{ status: string; data: { quiz: Quiz; questions: QuizQuestion[] } }>,

  startAttempt: (quizId: string) =>
    fetchApi(`/tests/${quizId}/start`, {
      method: 'POST'
    }) as Promise<{ status: string; data: { attempt_id: string; questions: QuizQuestion[] } }>,

  submitQuiz: (quizId: string, _attemptId: string, answers: Record<string, string>) =>
    fetchApi(`/tests/${quizId}/submit`, {
      method: 'POST',
      body: JSON.stringify({ answers })
    }) as Promise<{ status: string; data: QuizResult }>,

  getResults: (_quizId: string, _attemptId: string) =>
    // Not directly supported; could fetch from test results list filtered by attempt. Omit for now.
    Promise.resolve({ status: 'success', data: {} } as any),

  getAttempts: (_quizId: string) =>
    // Not implemented
    Promise.resolve({ status: 'success', data: [] } as any)
};
