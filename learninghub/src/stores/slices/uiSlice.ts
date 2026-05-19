import { StateCreator } from 'zustand'
import { AppState, UISlice } from '../types'

let toastCounter = 0
function generateToastId(): string {
  toastCounter += 1
  return `toast-${Date.now()}-${toastCounter}`
}

export const createUISlice: StateCreator<AppState, [], [], UISlice> = (set, get) => ({
  theme: (() => {
    try {
      const saved = localStorage.getItem('theme')
      if (saved === 'dark' || saved === 'light' || saved === 'system') {
        return { mode: saved as 'light' | 'dark' | 'system' }
      }
    } catch {}
    return { mode: 'system' }
  })(),
  setTheme: theme => {
    set({ theme })
    try {
      localStorage.setItem('theme', theme.mode)
    } catch {}
  },
  toggleDarkMode: () => {
    const current = get().theme.mode
    const newMode: 'light' | 'dark' | 'system' =
      current === 'light' ? 'dark' : current === 'dark' ? 'system' : 'light'
    set({ theme: { mode: newMode } })
    try {
      localStorage.setItem('theme', newMode)
    } catch {}
  },

  sidebarOpen: false,
  setSidebarOpen: open => set({ sidebarOpen: open }),

  toasts: [],
  addToast: toast => {
    const id = generateToastId()
    set(state => ({ toasts: [...state.toasts, { ...toast, id }] }))
    setTimeout(() => {
      get().removeToast(id)
    }, toast.duration ?? 3000)
  },
  removeToast: id => {
    set(state => ({ toasts: state.toasts.filter(t => t.id !== id) }))
  },

  loading: { isLoading: false },
  setLoading: (isLoading, message) => set({ loading: { isLoading, message } }),

  searchQuery: '',
  setSearchQuery: query => set({ searchQuery: query }),
  recentSearches: [],
  addRecentSearch: query => {
    if (!query.trim()) return
    set(state => ({
      recentSearches: [query, ...state.recentSearches.filter(s => s !== query)].slice(0, 10),
    }))
  },
  clearRecentSearches: () => set({ recentSearches: [] }),

  settings: {
    notifications: true,
    soundEffects: true,
    autoplay: false,
    compactMode: false,
    lowPerformanceMode: false,
  },
  updateSettings: newSettings => {
    set(state => ({ settings: { ...state.settings, ...newSettings } }))
  },

  hasSeenOnboarding: false,
  setHasSeenOnboarding: seen => set({ hasSeenOnboarding: seen }),
})
