import { StateCreator } from 'zustand'
import { fetchApi } from '../../utils/api'
import { trackEvent } from '../../services/analyticsGA4Service'
import { AppState, AuthSlice } from '../types'

export const createAuthSlice: StateCreator<AppState, [], [], AuthSlice> = (set, get) => ({
  auth: {
    // Auth state: tokens are stored in localStorage and sent as Bearer headers
    isAuthenticated: !!localStorage.getItem('token'),
    user: null,
  },
  setAuth: (token, refreshToken, user) => {
    // Store tokens in localStorage for Bearer auth
    if (token) localStorage.setItem('token', token)
    if (refreshToken) localStorage.setItem('refreshToken', refreshToken)

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
    // Clear tokens from localStorage
    localStorage.removeItem('token')
    localStorage.removeItem('refreshToken')

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
