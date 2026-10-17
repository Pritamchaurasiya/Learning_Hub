/**
 * Query Key Factory for TanStack React Query.
 * Guarantees strict cache isolation by always scoping content queries
 * to active examId and subjectIds.
 */

export const queryKeys = {
  // Global
  all: ['learninghub'] as const,

  // Exam Taxonomy
  countries: () => [...queryKeys.all, 'countries'] as const,
  exams: (countryId?: string | null) => [...queryKeys.all, 'exams', countryId ?? 'all'] as const,
  subjects: (examId?: string | null) => [...queryKeys.all, 'subjects', examId ?? 'none'] as const,

  // Learning Context / Preferences
  preferences: () => [...queryKeys.all, 'auth', 'preferences'] as const,
  me: () => [...queryKeys.all, 'auth', 'me'] as const,

  // Courses / Library (Scoped to examId and subjectIds)
  courses: (examId?: string | null, subjectIds?: string[], filters?: Record<string, unknown>) =>
    [
      ...queryKeys.all,
      'courses',
      examId ?? 'all',
      (subjectIds ?? []).slice().sort().join(','),
      filters ?? {},
    ] as const,

  courseDetails: (courseId: string) => [...queryKeys.all, 'course', courseId] as const,

  // Tests A+ (Scoped to examId and subjectIds)
  tests: (examId?: string | null, subjectIds?: string[], filters?: Record<string, unknown>) =>
    [
      ...queryKeys.all,
      'tests',
      examId ?? 'all',
      (subjectIds ?? []).slice().sort().join(','),
      filters ?? {},
    ] as const,

  testDetails: (testId: string) => [...queryKeys.all, 'test', testId] as const,
  testAttempts: (examId?: string | null) =>
    [...queryKeys.all, 'test-attempts', examId ?? 'all'] as const,

  // Personalized Dashboard (Scoped to active exam and subjects)
  dashboard: (examId?: string | null, subjectIds?: string[]) =>
    [
      ...queryKeys.all,
      'dashboard-stats',
      examId ?? 'default',
      (subjectIds ?? []).slice().sort().join(','),
    ] as const,

  dashboardWeakTopics: (examId?: string | null) =>
    [...queryKeys.all, 'weak-topics', examId ?? 'all'] as const,

  dashboardRecommendations: (examId?: string | null) =>
    [...queryKeys.all, 'recommendations', examId ?? 'all'] as const,

  // Context-Aware Search
  search: (query: string, examId?: string | null, filters?: Record<string, unknown>) =>
    [...queryKeys.all, 'search', query, examId ?? 'all', filters ?? {}] as const,
}
