import { describe, it, expect, vi, beforeEach } from 'vitest'
import { useStore } from '../useStore'
import { fetchApi } from '../../utils/api'

vi.mock('../../utils/api', () => ({
  fetchApi: vi.fn(),
  setAccessToken: vi.fn(),
  setRefreshToken: vi.fn(),
  clearTokens: vi.fn(),
  getAccessToken: vi.fn().mockResolvedValue(null),
  getRefreshToken: vi.fn().mockResolvedValue(null),
}))

vi.mock('../../services/analyticsGA4Service', () => ({
  trackEvent: vi.fn(),
}))

describe('progressSlice - Canonical Progression & Level Up Modal', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    useStore.setState({
      progress: {
        completedCourses: [],
        currentCourse: null,
        xp: 0,
        level: 1,
        streak: 0,
        lastActive: new Date().toISOString(),
        bookmarks: [],
        notes: {},
      },
      levelUpState: null,
      toasts: [],
      dailyGoal: { target: 50, progress: 0, lastReset: new Date().toISOString() },
    })
  })

  it('calculates canonical level on course completion without level-up if threshold not crossed', async () => {
    vi.mocked(fetchApi).mockResolvedValueOnce({
      data: { xp_awarded: 200 },
    })

    const { completeCourse } = useStore.getState()
    await completeCourse('course-1', 200)

    const state = useStore.getState()
    expect(state.progress.completedCourses).toContain('course-1')
    expect(state.progress.xp).toBe(200)
    expect(state.progress.level).toBe(1) // 200 XP is Level 1 (< 400 XP)
    expect(state.levelUpState).toBeNull()
  })

  it('triggers levelUpState and celebration toast when XP crosses canonical level threshold', async () => {
    // Starting with 350 XP (Level 1)
    useStore.setState({
      progress: {
        ...useStore.getState().progress,
        xp: 350,
        level: 1,
      },
    })

    // Award 150 XP -> Total 500 XP (Level 2: requires >= 400 XP)
    vi.mocked(fetchApi).mockResolvedValueOnce({
      data: { xp_awarded: 150 },
    })

    const { completeCourse } = useStore.getState()
    await completeCourse('course-algo', 150)

    const state = useStore.getState()
    expect(state.progress.xp).toBe(500)
    expect(state.progress.level).toBe(2)
    expect(state.levelUpState).not.toBeNull()
    expect(state.levelUpState?.isOpen).toBe(true)
    expect(state.levelUpState?.previousLevel).toBe(1)
    expect(state.levelUpState?.newLevel).toBe(2)
    expect(state.levelUpState?.xpGained).toBe(150)

    // Verify toast announcement
    expect(state.toasts.some(t => t.message.includes('LEVEL UP!'))).toBe(true)
  })

  it('allows manual opening and closing of levelUpModal', () => {
    const { showLevelUpModal, closeLevelUpModal } = useStore.getState()

    showLevelUpModal({
      previousLevel: 2,
      newLevel: 3,
      xpGained: 400,
    })

    expect(useStore.getState().levelUpState?.isOpen).toBe(true)
    expect(useStore.getState().levelUpState?.newLevel).toBe(3)

    closeLevelUpModal()
    expect(useStore.getState().levelUpState).toBeNull()
  })

  it('updates daily goal progress and alerts on goal completion', () => {
    const { updateDailyGoal } = useStore.getState()

    updateDailyGoal(30)
    expect(useStore.getState().dailyGoal.progress).toBe(30)

    updateDailyGoal(25) // Total 55 (target 50)
    expect(useStore.getState().dailyGoal.progress).toBe(55)
    expect(useStore.getState().toasts.some(t => t.message.includes('Daily goal achieved!'))).toBe(true)
  })
})
