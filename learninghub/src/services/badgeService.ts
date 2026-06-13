import { fetchApi } from '../utils/api'

export interface Badge {
  id: string
  name: string
  description: string
  icon: string
  category: 'TEST' | 'STREAK' | 'ACHIEVEMENT'
  requirement: number
  currentProgress: number
  earnedAt?: string
  isEarned: boolean
}

export interface UserBadges {
  badges: Badge[]
  totalEarned: number
  totalAvailable: number
  nextBadge?: Badge
}

interface AchievementBadgeSource {
  id: string
  achievementId?: string
  name: string
  description: string
  icon?: string | null
  unlockedAt?: string
}

const toBadge = (achievement: AchievementBadgeSource): Badge => ({
  id: achievement.id ?? achievement.achievementId ?? '',
  name: achievement.name ?? '',
  description: achievement.description ?? '',
  icon: achievement.icon ?? 'award',
  category: 'ACHIEVEMENT',
  requirement: 1,
  currentProgress: 1,
  earnedAt: achievement.unlockedAt,
  isEarned: true,
})

export const badgeService = {
  // Back badges with the persisted achievement stream until a badge catalog exists.
  getUserBadges: () =>
    fetchApi('/gamification/achievements').then(res => {
      const achievements = Array.isArray(res.data) ? res.data : []
      const badges = achievements.map(toBadge)

      return {
        status: res.status ?? 'success',
        data: {
          badges,
          totalEarned: badges.length,
          totalAvailable: badges.length,
        },
      }
    }) as Promise<{ status: string; data: UserBadges }>,

  // Check and award badges after test completion
  checkTestBadges: (testScore: number, isPassed: boolean, timeTaken: number) =>
    fetchApi('/badges/check', {
      method: 'POST',
      body: JSON.stringify({ testScore, isPassed, timeTaken }),
    }).then(res => ({
      status: res.status ?? 'success',
      data: res.data ?? [],
    })) as Promise<{ status: string; data: Badge[] }>,
}

export default badgeService
