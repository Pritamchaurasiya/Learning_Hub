import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'
import { fetchApi } from '../utils/api'
import type {
  ActiveExamInfo,
  ActiveSubjectInfo,
  ExamDifficulty,
  LearningContextState,
  StudentPreferenceUpdate,
  UserPreferencePayload,
} from '../types/learningContext'

interface LearningContextStore extends LearningContextState {
  hasHydrated: boolean
  setHasHydrated: (val: boolean) => void
}

const initialState: Omit<
  LearningContextState,
  | 'setContext'
  | 'switchExam'
  | 'setSubjects'
  | 'toggleSubject'
  | 'setDifficulty'
  | 'setDailyGoal'
  | 'setStudentPreferences'
  | 'addTargetExam'
  | 'removeTargetExam'
  | 'clearContext'
  | 'reconcileWithUser'
> = {
  countryId: null,
  stateRegion: null,
  examId: null,
  examAuthority: null,
  targetExamDate: null,
  preparationStage: null,
  preferredLanguage: 'English',
  studyHoursPerDay: 2,
  subjectIds: [],
  difficulty: 'MEDIUM',
  dailyGoal: 15,
  activeCountry: null,
  activeExam: null,
  activeSubjects: [],
  targetExams: [],
  isConfigured: false,
  isLoading: false,
  lastUpdated: null,
}

export const useLearningContextStore = create<LearningContextStore>()(
  persist(
    (set, get) => ({
      ...initialState,
      hasHydrated: false,
      setHasHydrated: val => set({ hasHydrated: val }),

      setContext: async (partial, persistServer = true) => {
        set(state => ({
          ...state,
          ...partial,
          isConfigured: Boolean(partial.examId || state.examId),
          lastUpdated: new Date().toISOString(),
        }))

        if (persistServer) {
          const current = get()
          try {
            await fetchApi('/auth/preferences', {
              method: 'PUT',
              body: JSON.stringify({
                countryId: current.countryId,
                examId: current.examId,
                subjectIds: current.subjectIds,
                difficulty: current.difficulty,
                dailyGoal: current.dailyGoal,
              }),
            })
          } catch (err) {
            // Silently handle guest / unauthenticated persistence error
            console.warn('[LearningContext] Server persistence skipped or deferred:', err)
          }
        }

        if (typeof window !== 'undefined') {
          window.dispatchEvent(
            new CustomEvent('lh:exam-context-changed', {
              detail: {
                examId: get().examId,
                subjectIds: get().subjectIds,
                examName: get().activeExam?.name,
              },
            })
          )
        }
      },

      setStudentPreferences: async (prefs: Partial<StudentPreferenceUpdate>) => {
        set(state => {
          const nextExam =
            prefs.examId && prefs.examId !== state.examId && state.activeExam
              ? { ...state.activeExam, id: prefs.examId }
              : state.activeExam

          return {
            ...state,
            countryId: prefs.countryId !== undefined ? prefs.countryId : state.countryId,
            stateRegion: prefs.stateRegion !== undefined ? prefs.stateRegion : state.stateRegion,
            examId: prefs.examId !== undefined ? prefs.examId : state.examId,
            examAuthority:
              prefs.examAuthority !== undefined ? prefs.examAuthority : state.examAuthority,
            targetExamDate:
              prefs.targetExamDate !== undefined ? prefs.targetExamDate : state.targetExamDate,
            preparationStage:
              prefs.preparationStage !== undefined
                ? prefs.preparationStage
                : state.preparationStage,
            preferredLanguage:
              prefs.preferredLanguage !== undefined
                ? prefs.preferredLanguage
                : state.preferredLanguage,
            studyHoursPerDay:
              prefs.studyHoursPerDay !== undefined
                ? prefs.studyHoursPerDay
                : state.studyHoursPerDay,
            difficulty: prefs.difficulty !== undefined ? prefs.difficulty : state.difficulty,
            dailyGoal: prefs.dailyGoal !== undefined ? prefs.dailyGoal : state.dailyGoal,
            subjectIds: prefs.subjectIds !== undefined ? prefs.subjectIds : state.subjectIds,
            activeExam: nextExam,
            isConfigured: true,
            lastUpdated: new Date().toISOString(),
          }
        })

        try {
          await fetchApi('/auth/preferences', {
            method: 'PUT',
            body: JSON.stringify({
              countryId: get().countryId,
              examId: get().examId,
              subjectIds: get().subjectIds,
              difficulty: get().difficulty,
              dailyGoal: get().dailyGoal,
            }),
          })
        } catch {
          // Handled gracefully for offline / guest
        }

        if (typeof window !== 'undefined') {
          window.dispatchEvent(
            new CustomEvent('lh:exam-context-changed', {
              detail: {
                examId: get().examId,
                subjectIds: get().subjectIds,
                examName: get().activeExam?.name,
              },
            })
          )
        }
      },

      switchExam: async (exam: ActiveExamInfo, defaultSubjects?: ActiveSubjectInfo[]) => {
        const subjects = defaultSubjects ?? exam.subjects ?? []
        const subjectIds = subjects.map(s => s.id)
        const currentTargets = get().targetExams || []
        const exists = currentTargets.some(t => t.id === exam.id)
        const updatedTargets = exists ? currentTargets : [...currentTargets, exam]

        set({
          countryId: exam.countryId,
          examId: exam.id,
          examAuthority: exam.authority ?? null,
          targetExamDate: exam.targetExamDate ?? get().targetExamDate,
          activeExam: exam,
          activeCountry: exam.country ?? null,
          subjectIds,
          activeSubjects: subjects,
          targetExams: updatedTargets,
          isConfigured: true,
          lastUpdated: new Date().toISOString(),
        })

        // Background server sync if authenticated
        try {
          await fetchApi('/auth/preferences', {
            method: 'PUT',
            body: JSON.stringify({
              countryId: exam.countryId,
              examId: exam.id,
              subjectIds,
              difficulty: get().difficulty,
              dailyGoal: get().dailyGoal,
            }),
          })
        } catch {
          // Handled gracefully for anonymous users
        }

        if (typeof window !== 'undefined') {
          window.dispatchEvent(
            new CustomEvent('lh:exam-context-changed', {
              detail: {
                examId: exam.id,
                subjectIds,
                examName: exam.name,
              },
            })
          )
        }
      },

      addTargetExam: async (exam: ActiveExamInfo) => {
        const currentTargets = get().targetExams || []
        if (!currentTargets.some(t => t.id === exam.id)) {
          set({
            targetExams: [...currentTargets, exam],
            lastUpdated: new Date().toISOString(),
          })
        }
      },

      removeTargetExam: async (examId: string) => {
        const currentTargets = get().targetExams || []
        const updated = currentTargets.filter(t => t.id !== examId)
        set({
          targetExams: updated,
          lastUpdated: new Date().toISOString(),
        })
      },

      setSubjects: async (subjectIds: string[]) => {
        const currentExam = get().activeExam
        let filteredSubjects: ActiveSubjectInfo[] = []
        if (currentExam?.subjects) {
          filteredSubjects = currentExam.subjects.filter(s => subjectIds.includes(s.id))
        }

        set({
          subjectIds,
          activeSubjects: filteredSubjects.length > 0 ? filteredSubjects : get().activeSubjects,
          lastUpdated: new Date().toISOString(),
        })

        try {
          await fetchApi('/auth/preferences', {
            method: 'PUT',
            body: JSON.stringify({
              countryId: get().countryId,
              examId: get().examId,
              subjectIds,
              difficulty: get().difficulty,
              dailyGoal: get().dailyGoal,
            }),
          })
        } catch {
          // Handled gracefully
        }
      },

      toggleSubject: async (subjectId: string) => {
        const currentIds = get().subjectIds
        const nextIds = currentIds.includes(subjectId)
          ? currentIds.filter(id => id !== subjectId)
          : [...currentIds, subjectId]

        await get().setSubjects(nextIds)
      },

      setDifficulty: async (difficulty: ExamDifficulty) => {
        set({ difficulty, lastUpdated: new Date().toISOString() })
        try {
          await fetchApi('/auth/preferences', {
            method: 'PUT',
            body: JSON.stringify({
              countryId: get().countryId,
              examId: get().examId,
              subjectIds: get().subjectIds,
              difficulty,
              dailyGoal: get().dailyGoal,
            }),
          })
        } catch {
          // Handled gracefully
        }
      },

      setDailyGoal: async (dailyGoal: number) => {
        set({ dailyGoal, lastUpdated: new Date().toISOString() })
        try {
          await fetchApi('/auth/preferences', {
            method: 'PUT',
            body: JSON.stringify({
              countryId: get().countryId,
              examId: get().examId,
              subjectIds: get().subjectIds,
              difficulty: get().difficulty,
              dailyGoal,
            }),
          })
        } catch {
          // Handled gracefully
        }
      },

      clearContext: () => {
        set({
          ...initialState,
          hasHydrated: true,
        })
      },

      reconcileWithUser: (pref: UserPreferencePayload | null | undefined) => {
        if (!pref || !pref.examId) {
          return
        }

        set(state => {
          const prefExam = pref.exam
          const examCountryId =
            (prefExam &&
              'countryId' in prefExam &&
              typeof prefExam.countryId === 'string' &&
              prefExam.countryId) ||
            pref.countryId ||
            ''
          const activeExam: ActiveExamInfo = {
            id: pref.examId || '',
            name: prefExam?.name ?? 'Target Exam',
            slug: prefExam?.slug ?? 'target-exam',
            countryId: examCountryId,
            country: pref.country ?? null,
            subjects: (pref.subjects as ActiveSubjectInfo[]) ?? [],
          }

          const activeSubjects = (pref.subjects as ActiveSubjectInfo[]) ?? []
          const subjectIds =
            pref.subjectIds && pref.subjectIds.length > 0
              ? pref.subjectIds
              : activeSubjects.map(s => s.id)

          const currentTargets = state.targetExams || []
          const hasTarget = currentTargets.some(t => t.id === activeExam.id)
          const targetExams = hasTarget ? currentTargets : [...currentTargets, activeExam]

          return {
            ...state,
            countryId: pref.countryId ?? activeExam.countryId ?? state.countryId,
            examId: pref.examId,
            activeExam,
            activeCountry: pref.country ?? state.activeCountry,
            subjectIds,
            activeSubjects,
            targetExams,
            difficulty: pref.difficulty ?? state.difficulty,
            dailyGoal: pref.dailyGoal ?? state.dailyGoal,
            isConfigured: true,
            lastUpdated: new Date().toISOString(),
          }
        })
      },
    }),
    {
      name: 'lh_active_learning_context',
      storage: createJSONStorage(() => localStorage),
      onRehydrateStorage: () => state => {
        state?.setHasHydrated(true)
      },
    }
  )
)
