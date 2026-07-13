/**
 * User type for authenticated user data.
 * Replaces the `any` type used previously in auth state.
 */
export interface UserExamPreference {
  id: string
  userId: string
  countryId?: string | null
  examId?: string | null
  subjectIds: string[]
  difficulty: 'EASY' | 'MEDIUM' | 'HARD' | 'MIXED' | 'ADAPTIVE'
  dailyGoal: number
  country?: { id: string; name: string; code: string; flagEmoji?: string | null } | null
  exam?: { id: string; name: string; slug: string; description?: string | null } | null
  subjects?: Array<{ id: string; name: string; slug: string }>
}

export interface User {
  id: string
  email: string
  username?: string
  avatar?: string
  xp: number
  level: number
  streak: number
  lastActive: string
  is_active?: boolean
  date_joined?: string
  examPreference?: UserExamPreference | null
  role?: 'STUDENT' | 'INSTRUCTOR' | 'ADMIN' | 'SUPERADMIN'
}
