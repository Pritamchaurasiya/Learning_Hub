import { describe, it, expect, beforeEach, vi } from 'vitest'
import { useStore } from './useStore'

// Mock fetchApi
vi.mock('../utils/api', () => ({
  fetchApi: vi.fn(),
}))

describe('useStore', () => {
  beforeEach(() => {
    const { logout } = useStore.getState()
    logout()
    vi.clearAllMocks()
    localStorage.clear()
  })

  it('should have correct initial state', () => {
    const state = useStore.getState()
    expect(state.auth.isAuthenticated).toBe(false)
    expect(state.progress.xp).toBe(0)
    expect(state.progress.level).toBe(1)
    expect(state.sidebarOpen).toBe(false)
  })

  it('should toggle sidebar', () => {
    const { setSidebarOpen } = useStore.getState()

    setSidebarOpen(true)
    expect(useStore.getState().sidebarOpen).toBe(true)

    setSidebarOpen(false)
    expect(useStore.getState().sidebarOpen).toBe(false)
  })

  it('should toggle dark mode', () => {
    const { toggleDarkMode } = useStore.getState()

    // Initial state is system
    expect(useStore.getState().theme.mode).toBe('system')

    toggleDarkMode()
    expect(useStore.getState().theme.mode).toBe('light')

    toggleDarkMode()
    expect(useStore.getState().theme.mode).toBe('dark')

    toggleDarkMode()
    expect(useStore.getState().theme.mode).toBe('system')
  })

  it('should add and remove toasts', () => {
    const { addToast, removeToast } = useStore.getState()

    addToast({ message: 'Test message', type: 'success' })
    let state = useStore.getState()
    expect(state.toasts.length).toBe(1)
    expect(state.toasts[0].message).toBe('Test message')

    const toastId = state.toasts[0].id
    removeToast(toastId)
    state = useStore.getState()
    expect(state.toasts.length).toBe(0)
  })

  it('should handle authentication state', () => {
    const { setAuth, logout } = useStore.getState()
    const mockUser = {
      id: '1',
      email: 'test@example.com',
      xp: 0,
      level: 1,
      streak: 0,
      lastActive: new Date().toISOString(),
    }

    setAuth('fake-token', 'fake-refresh-token', mockUser)
    expect(useStore.getState().auth.isAuthenticated).toBe(true)
    expect(useStore.getState().auth.user).toEqual(mockUser)

    logout()
    expect(useStore.getState().auth.isAuthenticated).toBe(false)
    expect(useStore.getState().auth.user).toBeNull()
  })

  it('should set search query', () => {
    const { setSearchQuery } = useStore.getState()
    setSearchQuery('react tutorial')
    expect(useStore.getState().searchQuery).toBe('react tutorial')
  })

  it('should track recent searches', () => {
    const { addRecentSearch } = useStore.getState()
    addRecentSearch('react')
    addRecentSearch('typescript')
    addRecentSearch('python')

    const { recentSearches } = useStore.getState()
    expect(recentSearches).toContain('react')
    expect(recentSearches).toContain('typescript')
    expect(recentSearches).toContain('python')
  })

  it('should limit recent searches to 10', () => {
    const { addRecentSearch } = useStore.getState()
    for (let i = 0; i < 15; i++) {
      addRecentSearch(`search-${i}`)
    }

    expect(useStore.getState().recentSearches.length).toBeLessThanOrEqual(10)
  })

  it('should update daily goal', () => {
    const { updateDailyGoal } = useStore.getState()
    updateDailyGoal(10)
    expect(useStore.getState().dailyGoal.progress).toBe(10)
  })

  it('should reset daily goal', () => {
    const { updateDailyGoal, resetDailyGoal } = useStore.getState()
    updateDailyGoal(25)
    resetDailyGoal()

    const { dailyGoal } = useStore.getState()
    expect(dailyGoal.progress).toBe(0)
    expect(dailyGoal.target).toBe(50)
  })

  it('should set loading state', () => {
    const { setLoading } = useStore.getState()
    setLoading(true, 'Loading...')

    const { loading } = useStore.getState()
    expect(loading.isLoading).toBe(true)
    expect(loading.message).toBe('Loading...')
  })
})
