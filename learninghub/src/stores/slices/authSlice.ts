import { StateCreator } from 'zustand'
import { fetchApi } from '../../utils/api'
import { trackEvent } from '../../services/analyticsGA4Service'
import { AppState, AuthSlice } from '../types'

export const createAuthSlice: StateCreator<AppState, [], [], AuthSlice> = (set, get) => ({
  auth: {
    // JWTs are securely stored in httpOnly cookies
    isAuthenticated: false,
    user: null,
  },
  setAuth: (_token, _refreshToken, user) => {
    // Backend handles httpOnly cookie creation; no local token storage needed

    // Store user data in memory only + sync progress from user profile
    set(state => ({
      auth: { isAuthenticated: true, user },
      progress: {
        ...state.progress,
        xp: user?.xp ?? state.progress.xp ?? 0,
        level: user?.level ?? state.progress.level ?? 1,
        streak: user?.streak ?? state.progress.streak ?? 0,
        lastActive: user?.lastActive ?? state.progress.lastActive ?? new Date().toISOString(),
      },
    }))
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
  logout: () => {
    // Backend handles cookie clearing via /auth/logout (if implemented)
    // Or it relies on the httpOnly cookie expiring or being ignored.

    // Clear auth state from memory
    set({ auth: { isAuthenticated: false, user: null } })
    trackEvent('user_logged_out')
  },
  fetchMe: async () => {
    try {
      const response = await fetchApi('/auth/me')
      // Handle nested response formats: { status, data: { user: {...} } } or { data: {...} }
      const payload = response.data ?? response
      const userData = payload.user ?? response.user ?? payload

      // Validate we have at least an id - if not, this isn't a valid user response
      if (!userData?.id) {
        get().logout()
        return null
      }

      set(state => ({
        auth: { isAuthenticated: true, user: userData },
        progress: {
          ...state.progress,
          xp: userData.xp ?? state.progress.xp ?? 0,
          level: userData.level ?? state.progress.level ?? 1,
          streak: userData.streak ?? state.progress.streak ?? 0,
          lastActive:
            userData.lastActive ??
            userData.last_login_at ??
            state.progress.lastActive ??
            new Date().toISOString(),
          completedCourses:
            userData.completedCourses ??
            userData.completed_courses ??
            state.progress.completedCourses ??
            [],
        },
      }))
      return userData
    } catch (err) {
      if (
        err instanceof Error &&
        (err.message === 'Unauthorized' || err.message.includes('Session expired'))
      ) {
        get().logout()
      }
      throw err
    }
  },
})
