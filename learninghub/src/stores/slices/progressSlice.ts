import { StateCreator } from 'zustand'
import { fetchApi } from '../../utils/api'
import { trackEvent } from '../../services/analyticsGA4Service'
import type { AppState, ProgressSlice, Achievement, Notification } from '../types'

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
    }))

    try {
      const res = await fetchApi('/progress/complete-course', {
        method: 'POST',
        body: JSON.stringify({ courseId }),
      })
      const awardedXp = res?.data?.xp_awarded ?? xp

      set(state => ({
        progress: {
          ...state.progress,
          completedCourses: [...state.progress.completedCourses, courseId],
          xp: state.progress.xp + awardedXp,
          level: Math.floor((state.progress.xp + awardedXp) / 100) + 1,
        },
        loading: { ...state.loading, isLoading: false },
      }))

      get().addToast({ message: `Course completed! +${awardedXp} XP`, type: 'success' })
      trackEvent('course_completed', { course_id: courseId, xp: awardedXp })

      if (isFirstCourse) get().unlockAchievement('first-course')
      get().updateDailyGoal(awardedXp)
    } catch {
      set(state => ({ loading: { ...state.loading, isLoading: false } }))
      get().addToast({ message: 'Failed to save progress. Please try again.', type: 'error' })
    }
  },

  setCurrentCourse: courseId => {
    set(state => ({ progress: { ...state.progress, currentCourse: courseId } }))
  },

  toggleBookmark: async itemId => {
    const previousBookmarks = get().progress.bookmarks
    const isBookmarked = previousBookmarks.includes(itemId)

    set(state => {
      const newBookmarks = isBookmarked
        ? state.progress.bookmarks.filter(id => id !== itemId)
        : [...state.progress.bookmarks, itemId]
      return { progress: { ...state.progress, bookmarks: newBookmarks } }
    })

    try {
      if (isBookmarked) {
        await fetchApi(`/bookmarks/${itemId}`, { method: 'DELETE' })
      } else {
        await fetchApi('/bookmarks', {
          method: 'POST',
          body: JSON.stringify({ item_id: itemId, item_type: 'course' }),
        })
      }
      get().addToast({
        message: isBookmarked ? 'Bookmark removed' : 'Bookmark added',
        type: 'success',
      })
    } catch {
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

    try {
      await fetchApi('/bookmarks', {
        method: 'POST',
        body: JSON.stringify({ item_id: courseId, item_type: 'course' }),
      })
      get().addToast({ message: 'Added to bookmarks', type: 'success' })
    } catch {
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
      await fetchApi(`/bookmarks/${courseId}`, { method: 'DELETE' })
    } catch {
      if (import.meta.env.DEV) console.warn('[Progress] Bookmark remove failed, reverting:')
      set(state => ({ progress: { ...state.progress, bookmarks: previousBookmarks } }))
    }
  },

  addNote: (courseId, note) => {
    set(state => ({
      progress: { ...state.progress, notes: { ...state.progress.notes, [courseId]: note } },
    }))
  },

  updateStreak: async () => {
    if (get().auth.isAuthenticated) {
      try {
        const res = await fetchApi('/progress/update-streak', { method: 'POST' })
        const serverStreak = res?.data?.streak
        set(state => ({
          progress: {
            ...state.progress,
            streak: serverStreak ?? state.progress.streak + 1,
            lastActive: new Date().toISOString(),
          },
        }))
      } catch {
        // Offline — increment locally anyway
        set(state => ({
          progress: {
            ...state.progress,
            streak: state.progress.streak + 1,
            lastActive: new Date().toISOString(),
          },
        }))
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
    if (!get().auth.isAuthenticated) return
    try {
      const res = await fetchApi('/notifications')
      const data = res?.data ?? res?.notifications ?? []
      const notifs = Array.isArray(data) ? data : []
      set({
        notifications: notifs.map((n: any) => ({
          id: n.id ?? `notif-${Math.random()}`,
          type: n.type ?? 'info',
          title: n.title ?? '',
          message: n.message ?? '',
          createdAt: n.createdAt ?? new Date().toISOString(),
          ...n,
          isRead: n.isRead ?? n.read ?? false,
        })) as any[],
        unreadCount: notifs.filter((n: any) => !(n.isRead ?? n.read ?? false)).length,
      })
    } catch {
      if (import.meta.env.DEV) console.warn('[Progress] Failed to fetch notifications')
    }
  },
  markNotificationAsRead: async (id: string) => {
    set(state => ({
      notifications: state.notifications.map(n => (n.id === id ? { ...n, isRead: true } : n)),
      unreadCount: Math.max(0, state.unreadCount - 1),
    }))
    try {
      await fetchApi(`/notifications/${id}/read`, { method: 'POST' })
    } catch {
      if (import.meta.env.DEV) console.warn('[Progress] Failed to mark notification as read')
    }
  },
  markAllNotificationsAsRead: async () => {
    set(state => ({
      notifications: state.notifications.map(n => ({ ...n, isRead: true })),
      unreadCount: 0,
    }))
    try {
      await fetchApi('/notifications/read-all', { method: 'POST' })
    } catch {
      if (import.meta.env.DEV) console.warn('[Progress] Failed to mark all as read')
    }
  },
  clearNotifications: () => {
    set({ notifications: [], unreadCount: 0 })
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
