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

export const badgeService = {
  // Get user's badges
  getUserBadges: () =>
    fetchApi('/badges').then(res => ({
      status: res.status ?? 'success',
      data: res.data ?? { badges: [], totalEarned: 0, totalAvailable: 0 },
    })) as Promise<{ status: string; data: UserBadges }>,

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
