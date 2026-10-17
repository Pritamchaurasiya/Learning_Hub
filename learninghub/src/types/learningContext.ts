/**
 * Canonical Types for LearningHub Active Learning Context.
 * Single source of truth across Header, Dashboard, Catalog, Tests A+, and Search.
 */

export type ExamDifficulty = 'EASY' | 'MEDIUM' | 'HARD' | 'MIXED' | 'ADAPTIVE'

export interface ActiveCountryInfo {
  id: string
  name: string
  code: string
  flagEmoji?: string | null
}

export interface ActiveTopicInfo {
  id: string
  name: string
  slug: string
  order?: number
}

export interface ActiveSubjectInfo {
  id: string
  name: string
  slug: string
  icon?: string | null
  topics?: ActiveTopicInfo[]
}

export interface ActiveExamInfo {
  id: string
  name: string
  slug: string
  description?: string | null
  countryId: string
  country?: ActiveCountryInfo | null
  subjects?: ActiveSubjectInfo[]
  category?: string
  pattern?: Record<string, unknown> | null
}

export interface ExamCategoryGroup {
  id: string
  name: string
  icon?: string
  description?: string
  examSlugs: string[]
}

export interface LearningContextState {
  // Primary identifiers
  countryId: string | null
  examId: string | null
  subjectIds: string[]
  difficulty: ExamDifficulty
  dailyGoal: number

  // Hydrated metadata for zero-latency UI rendering
  activeCountry: ActiveCountryInfo | null
  activeExam: ActiveExamInfo | null
  activeSubjects: ActiveSubjectInfo[]

  // Status flags
  isConfigured: boolean
  isLoading: boolean
  lastUpdated: string | null

  // Actions
  setContext: (context: Partial<LearningContextState>, persistServer?: boolean) => Promise<void>
  switchExam: (exam: ActiveExamInfo, defaultSubjects?: ActiveSubjectInfo[]) => Promise<void>
  setSubjects: (subjectIds: string[]) => Promise<void>
  toggleSubject: (subjectId: string) => Promise<void>
  setDifficulty: (difficulty: ExamDifficulty) => Promise<void>
  setDailyGoal: (dailyGoal: number) => Promise<void>
  clearContext: () => void
  reconcileWithUser: (userPreference: UserPreferencePayload | null | undefined) => void
}

export interface UserPreferencePayload {
  id?: string
  userId?: string
  countryId?: string | null
  examId?: string | null
  subjectIds?: string[]
  difficulty?: ExamDifficulty
  dailyGoal?: number
  country?: ActiveCountryInfo | null
  exam?:
    | ActiveExamInfo
    | { id: string; name: string; slug: string; description?: string | null; countryId?: string }
    | null
  subjects?: ActiveSubjectInfo[] | Array<{ id: string; name: string; slug: string }>
}

export interface ContentFilterContext {
  examId?: string | null
  subjectIds?: string[]
  countryId?: string | null
  difficulty?: ExamDifficulty | string
  includeGeneral?: boolean
  search?: string
  page?: number
  limit?: number
}
