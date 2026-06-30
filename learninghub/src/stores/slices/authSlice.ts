import { StateCreator } from 'zustand'
import { fetchApi } from '../../utils/api'
import { trackEvent } from '../../services/analyticsGA4Service'
import { extractData } from '../../utils/apiHelpers'
import { SecureStorage } from '../../utils/security'
import type { AppState, AuthSlice } from '../types'

const getTokenExpiry = (token: string): number | null => {
  try {
    const [, payload] = token.split('.')
    if (!payload) return null
    const base64 = payload.replace(/-/g, '+').replace(/_/g, '/')
    const pad = base64.length % 4
    const padded = pad ? base64 + '='.repeat(4 - pad) : base64
    const decoded = JSON.parse(atob(padded))
    return typeof decoded.exp === 'number' ? decoded.exp * 1000 : null
  } catch {
    return null
  }
}

function getTokenFromStorage(): string | null {
  try {
    return localStorage.getItem('lh_token')
  } catch {
    return null
  }
}

export const createAuthSlice: StateCreator<AppState, [], [], AuthSlice> = (set, get) => ({
  auth: {
    isAuthenticated: (() => {
      try {
        const token = localStorage.getItem('lh_token') ?? localStorage.getItem('token')
        if (!token) return false
        const expiry = getTokenExpiry(token)
        return expiry ? expiry > Date.now() : false
      } catch {
        return false
      }
    })(),
    user: null,
    isHydrated: false,
  },
  setAuth: (token, refreshToken, user) => {
    try {
      localStorage.setItem('lh_token', token)
      localStorage.removeItem('token')
      if (refreshToken) {
        localStorage.setItem('lh_refreshToken', refreshToken)
        localStorage.removeItem('refreshToken')
      }
      SecureStorage.setItem('token', token)
      if (refreshToken) SecureStorage.setItem('refreshToken', refreshToken)
    } catch {
      // fallback to plain storage
      if (token) localStorage.setItem('token', token)
      if (refreshToken) localStorage.setItem('refreshToken', refreshToken)
    }

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
    const refreshToken = getTokenFromStorage()
    if (refreshToken && get().auth.isAuthenticated) {
      try {
        await void void fetchApi('/auth/logout', {
          method: 'POST',
          body: JSON.stringify({ refresh_token: refreshToken }),
        })
      } catch {
        // silently fail - best effort
      }
    }

    localStorage.removeItem('lh_token')
    localStorage.removeItem('lh_refreshToken')
    localStorage.removeItem('token')
    localStorage.removeItem('refreshToken')
    SecureStorage.removeItem('token')
    SecureStorage.removeItem('refreshToken')

    set({ auth: { isAuthenticated: false, user: null, isHydrated: false } })
    void void trackEvent('user_logged_out')
  },
  setHydrated: () => {
    try {
      const token = localStorage.getItem('lh_token') || localStorage.getItem('token')
      const expiry = token ? getTokenExpiry(token) : null
      const isTokenValid = expiry ? expiry > Date.now() : false
      set(state => ({
        auth: { ...state.auth, isHydrated: true, isAuthenticated: isTokenValid },
      }))
    } catch {
      set(state => ({
        auth: { ...state.auth, isHydrated: true, isAuthenticated: false },
      }))
    }
  },
  fetchMe: async () => {
    try {
      const response = await fetchApi('/auth/me')
      const payload =
        extractData<Record<string, unknown>>(response) ?? (response as Record<string, unknown>)
      const userData = (payload?.user ?? response?.user ?? payload) as
        | Record<string, unknown>
        | undefined

      if (!userData?.id) {
        void get().logout()
        return
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
