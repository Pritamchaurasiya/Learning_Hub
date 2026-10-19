import { StateCreator } from 'zustand'
import { fetchApi, clearTokens } from '../../utils/api'
import { trackEvent } from '../../services/analyticsGA4Service'
import { useLearningContextStore } from '../useLearningContextStore'
import { clearWsAuthToken } from '../../services/examStationWebSocketService'
import type { UserPreferencePayload } from '../../types/learningContext'
import type { AppState, AuthSlice } from '../types'

const initialAuthState = { isAuthenticated: false, user: null, isHydrated: false }

function extractUserFromResponse(response: unknown): Record<string, unknown> | undefined {
  if (!response || typeof response !== 'object') return undefined
  const obj = response as Record<string, unknown>
  if (obj?.data && typeof obj.data === 'object') {
    const data = obj.data as Record<string, unknown>
    if (data?.user && typeof data.user === 'object') return data.user as Record<string, unknown>
    if (data?.id) return data
  }
  if (obj?.user && typeof obj.user === 'object') return obj.user as Record<string, unknown>
  if (obj?.id) return obj
  return undefined
}

export const createAuthSlice: StateCreator<AppState, [], [], AuthSlice> = (set, get) => ({
  auth: initialAuthState,
  setAuth: (_token, _refreshToken, user) => {
    // SECURITY: Tokens are now stored in httpOnly cookies set by the backend.
    // The backend sets these via Set-Cookie headers on login/register/refresh.
    // _token and _refreshToken parameters are kept for backward compatibility
    // but are NOT stored in the frontend (to prevent XSS vulnerabilities).
    // The httpOnly cookies are automatically sent with requests via credentials: 'include'.
    set(state => ({
      auth: { isAuthenticated: true, user, isHydrated: state.auth.isHydrated },
      progress: {
        ...state.progress,
        xp: user?.xp ?? state.progress.xp ?? 0,
        level: user?.level ?? state.progress.level ?? 1,
        streak: user?.streak ?? state.progress.streak ?? 0,
        lastActive: user?.lastActive ?? state.progress.lastActive ?? new Date().toISOString(),
      },
    }))
    if (user?.examPreference) {
      useLearningContextStore.getState().reconcileWithUser(user.examPreference)
    }
    trackEvent('user_authenticated', { user_id: user?.id })
  },
  updateUser: userData => {
    set(state => ({
      auth: {
        ...state.auth,
        user: state.auth.user ? { ...state.auth.user, ...userData } : null,
      },
    }))
  },
  logout: async () => {
    if (get().auth.isAuthenticated) {
      try {
        await fetchApi('/auth/logout', { method: 'POST' })
      } catch (error) {
        console.warn('[Auth] Logout request failed:', error)
      }
    }
    // clearTokens expires cookies and clears any legacy localStorage
    await clearTokens()
    // Clear in-memory WebSocket auth token
    clearWsAuthToken()
    useLearningContextStore.getState().clearContext()
    set({ auth: { isAuthenticated: false, user: null, isHydrated: true } })
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('data:progress-updated'))
    }
    trackEvent('user_logged_out')
  },
  setHydrated: async () => {
    set(state => ({
      auth: { ...state.auth, isHydrated: true },
    }))
  },
  fetchMe: async () => {
    try {
      const response = await fetchApi('/auth/me')
      const userData = extractUserFromResponse(response)

      if (!userData?.id) {
        void get().logout()
        return
      }

      const examPref =
        (userData as Record<string, unknown>).examPreference ||
        (userData as Record<string, unknown>).exam_preference
      if (examPref) {
        useLearningContextStore
          .getState()
          .reconcileWithUser(examPref as unknown as UserPreferencePayload)
      }

      set(state => ({
        auth: {
          ...state.auth,
          isAuthenticated: true,
          user: userData as unknown as AppState['auth']['user'],
        },
        progress: {
          ...state.progress,
          xp: (userData.xp as number) ?? state.progress.xp ?? 0,
          level: (userData.level as number) ?? state.progress.level ?? 1,
          streak: (userData.streak as number) ?? state.progress.streak ?? 0,
          lastActive:
            (userData.lastActive as string) ??
            (userData.last_login_at as string) ??
            state.progress.lastActive ??
            new Date().toISOString(),
          completedCourses:
            (userData.completedCourses as string[]) ??
            (userData.completed_courses as string[]) ??
            state.progress.completedCourses ??
            [],
        },
      }))
    } catch (err) {
      if (
        err instanceof Error &&
        (err.message === 'Unauthorized' || err.message.includes('Session expired'))
      ) {
        void get().logout()
      }
    }
  },
})
