import { StateCreator } from 'zustand'
import { fetchApi } from '../../utils/api'
import { trackEvent } from '../../services/analyticsGA4Service'
import { AppState, ProgressSlice, Achievement, Notification } from '../types'

const defaultProgress = {
  completedCourses: [],
  currentCourse: null,
  xp: 0,
  level: 1,
  streak: 0,
  lastActive: new Date().toISOString(),
  bookmarks: [],
  notes: {},
}

const defaultAchievements: Achievement[] = [
  {
    id: 'first-course',
    name: 'First Steps',
    description: 'Complete your first course',
    icon: '🎯',
    unlocked: false,
  },
  {
    id: 'streak-3',
    name: 'Consistent',
    description: 'Maintain a 3-day streak',
    icon: '🔥',
    unlocked: false,
  },
  {
    id: 'all-phase-1',
    name: 'Beginner Master',
    description: 'Complete all Phase 1 courses',
    icon: '🎓',
    unlocked: false,
  },
]

export const createProgressSlice: StateCreator<AppState, [], [], ProgressSlice> = (set, get) => ({
  progress: defaultProgress,
  completeCourse: async (courseId, xp) => {
    const isAlreadyCompleted = get().progress.completedCourses.includes(courseId)
    if (isAlreadyCompleted) return

    const isFirstCourse = get().progress.completedCourses.length === 0

    set(state => ({
      loading: { ...state.loading, isLoading: true, message: 'Saving progress...' },
      progress: {
        ...state.progress,
        completedCourses: [...state.progress.completedCourses, courseId],
        xp: state.progress.xp + xp,
        level: Math.floor((state.progress.xp + xp) / 100) + 1,
      },
    }))

    get().addToast({ message: `Course completed! +${xp} XP`, type: 'success' })
    trackEvent('course_completed', { course_id: courseId, xp })

    if (isFirstCourse) {
      get().unlockAchievement('first-course')
    }
    get().updateDailyGoal(xp)

    try {
      const res = await fetchApi('/gamification/award-xp/', {
        method: 'POST',
        body: JSON.stringify({ amount: xp, reason: `Completed course: ${courseId}` }),
      })
      // Sync actual server state if available
      if (res.data?.xp !== undefined) {
        set(state => ({
          progress: {
            ...state.progress,
            xp: res.data.xp,
            level: res.data.level ?? state.progress.level,
          },
        }))
      }
    } catch (err) {
      if (import.meta.env.DEV) console.warn('[Progress] Sync failed:', err)
      // Rollback optimistic update on failure
      set(state => ({
        progress: {
          ...state.progress,
          completedCourses: state.progress.completedCourses.filter(id => id !== courseId),
          xp: Math.max(0, state.progress.xp - xp),
          level: Math.max(1, Math.floor(Math.max(0, state.progress.xp - xp) / 100) + 1),
        },
      }))
    } finally {
      set(state => ({ loading: { ...state.loading, isLoading: false } }))
    }
  },
  setCurrentCourse: courseId => {
    set(state => ({ progress: { ...state.progress, currentCourse: courseId } }))
  },
  toggleBookmark: async courseId => {
    const previousBookmarks = get().progress.bookmarks
    const isBookmarked = previousBookmarks.includes(courseId)

    set(state => {
      const newBookmarks = isBookmarked
        ? state.progress.bookmarks.filter(id => id !== courseId)
        : [...state.progress.bookmarks, courseId]
      return { progress: { ...state.progress, bookmarks: newBookmarks } }
    })

    get().addToast({
      message: isBookmarked ? 'Bookmark removed' : 'Bookmark added',
      type: 'success',
    })

    try {
      if (isBookmarked) await fetchApi(`/users/bookmarks/${courseId}`, { method: 'DELETE' })
      else
        await fetchApi('/users/bookmarks', {
          method: 'POST',
          body: JSON.stringify({ course_id: courseId }),
        })
    } catch (err) {
      if (import.meta.env.DEV) console.warn('[Progress] Bookmark sync failed, reverting:', err)
      set(state => ({ progress: { ...state.progress, bookmarks: previousBookmarks } }))
      get().addToast({ message: 'Sync failed. Bookmark reverted.', type: 'error' })
    }
  },
  addBookmark: async courseId => {
    const previousBookmarks = get().progress.bookmarks
    if (previousBookmarks.includes(courseId)) return

    set(state => ({
      progress: { ...state.progress, bookmarks: [...state.progress.bookmarks, courseId] },
    }))
    get().addToast({ message: 'Added to bookmarks', type: 'success' })

    try {
      await fetchApi('/users/bookmarks', {
        method: 'POST',
        body: JSON.stringify({ course_id: courseId }),
      })
    } catch (err) {
      if (import.meta.env.DEV) console.warn('[Progress] Bookmark add failed, reverting:', err)
      set(state => ({ progress: { ...state.progress, bookmarks: previousBookmarks } }))
      get().addToast({ message: 'Failed to add bookmark.', type: 'error' })
    }
  },
  removeBookmark: async courseId => {
    const previousBookmarks = get().progress.bookmarks

    set(state => ({
      progress: {
        ...state.progress,
        bookmarks: state.progress.bookmarks.filter(id => id !== courseId),
      },
    }))
    try {
      await fetchApi(`/users/bookmarks/${courseId}`, { method: 'DELETE' })
    } catch (err) {
      if (import.meta.env.DEV) console.warn('[Progress] Bookmark remove failed, reverting:', err)
      set(state => ({ progress: { ...state.progress, bookmarks: previousBookmarks } }))
      get().addToast({ message: 'Failed to remove bookmark.', type: 'error' })
    }
  },
  addNote: (courseId, note) => {
    set(state => ({
      progress: { ...state.progress, notes: { ...state.progress.notes, [courseId]: note } },
    }))
  },
  updateStreak: async () => {
    if (get().auth.isAuthenticated) {
      set(state => ({
        progress: {
          ...state.progress,
          streak: state.progress.streak + 1,
          lastActive: new Date().toISOString(),
        },
      }))
      try {
        await fetchApi('/gamification/streak', { method: 'POST' })
      } catch {
        if (import.meta.env.DEV) console.warn('[Progress] Streak sync failed')
      }
    }
  },

  achievements: defaultAchievements,
  unlockAchievement: id => {
    set(state => ({
      achievements: state.achievements.map(a => (a.id === id ? { ...a, unlocked: true } : a)),
    }))
    const achievement = get().achievements.find(a => a.id === id)
    if (achievement) {
      get().addToast({
        message: `Achievement Unlocked: ${achievement.name}`,
        type: 'success',
        duration: 5000,
      })
    }
  },

  dailyGoal: { target: 50, progress: 0, lastReset: new Date().toISOString() },
  updateDailyGoal: amount => {
    set(state => {
      const newProgress = state.dailyGoal.progress + amount
      if (
        newProgress >= state.dailyGoal.target &&
        state.dailyGoal.progress < state.dailyGoal.target
      ) {
        get().addToast({ message: 'Daily goal achieved! 🎉', type: 'success' })
      }
      return { dailyGoal: { ...state.dailyGoal, progress: newProgress } }
    })
  },
  resetDailyGoal: () => {
    set({ dailyGoal: { target: 50, progress: 0, lastReset: new Date().toISOString() } })
  },

  notifications: [],
  unreadCount: 0,
  fetchNotifications: async () => {
    try {
      const response = await fetchApi('/notifications')
      const notifs = response.data ?? []
      set({
        notifications: notifs,
        unreadCount: notifs.filter((n: Notification) => !n.isRead).length,
      })
    } catch {
      if (import.meta.env.DEV) console.warn('[Progress] Failed to fetch notifications')
    }
  },
  markNotificationAsRead: id => {
    set(state => ({
      notifications: state.notifications.map(n => (n.id === id ? { ...n, isRead: true } : n)),
      unreadCount: Math.max(0, state.unreadCount - 1),
    }))
    fetchApi(`/notifications/${id}/mark-read`, { method: 'POST' }).catch(() => {})
  },
  markAllNotificationsAsRead: () => {
    set(state => ({
      notifications: state.notifications.map(n => ({ ...n, isRead: true })),
      unreadCount: 0,
    }))
    fetchApi('/notifications/mark-all-read', { method: 'POST' }).catch(() => {})
  },
  clearNotifications: () => {
    set({ notifications: [], unreadCount: 0 })
    fetchApi('/notifications/clear-all', { method: 'POST' }).catch(() => {})
  },
  addNotification: notification => {
    const newNotification: Notification = {
      ...notification,
      id: `notif-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      createdAt: new Date().toISOString(),
    }
    set(state => ({
      notifications: [newNotification, ...state.notifications].slice(0, 50),
      unreadCount: state.unreadCount + 1,
    }))
    get().addToast({
      message: notification.message,
      type: notification.type === 'achievement' ? 'success' : 'info',
      duration: 5000,
    })
  },
})
