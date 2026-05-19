/**
 * Shared Types for Tests A+ System
 *
 * These types are shared between frontend and backend to ensure consistency.
 * Import these types in both frontend and backend code.
 */

export interface Test {
  id: string
  title: string
  description: string | null
  course_id: string
  course_title: string
  time_limit: number
  passing_score: number
  total_questions: number
  max_attempts: number
  attempts_made: number
  created_at?: string
}

export interface TestQuestion {
  id: string
  question: string
  type: 'multiple_choice' | 'true_false' | 'short_answer' | 'essay'
  options: string[]
  correct_answer: string
  explanation: string | null
  points: number
  order?: number
}

export interface TestAttempt {
  id: string
  user_id: string
  test_id: string
  test?: Test
  attempt_number: number
  score: number
  total_points: number
  percentage: number
  passed: boolean
  time_taken: number
  answers: Record<string, string | number> | Array<{ questionId: string; answer: string | number }>
  status: 'IN_PROGRESS' | 'COMPLETED' | 'ABANDONED' | 'TIMEOUT'
  completed_at: string | null
  started_at: string
  created_at: string
  updated_at: string
}

export interface TestResult {
  attempt_id: string
  score: number
  passed: boolean
  total_questions: number
  correct_answers: number
  time_taken: number
  percentage: number
}

export interface StartTestResponse {
  attempt_id: string
  questions: TestQuestion[]
}

export interface SubmitTestRequest {
  answers: Record<string, string | number>
  timeTaken: number
  attempt_id?: string
}

export interface Badge {
  id: string
  name: string
  description: string
  icon: string
  requirement: string
  progress: number
  isEarned: boolean
}
