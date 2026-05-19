import { fetchApi } from '../utils/api'

export interface LeaderboardEntry {
  rank: number
  user_id: string
  username: string
  display_name: string
  avatar_url?: string
  xp: number
  level: number
  streak: number
  courses_completed: number
  is_current_user: boolean
}

export interface LeaderboardPeriod {
  period: 'all' | 'weekly' | 'monthly'
  start_date?: string
  end_date?: string
}

interface RawLeaderboardUser {
  id: string
  username: string
  xp: number
  level: number
  streak: number
}

export const leaderboardService = {
  async getLeaderboard(
    _period: 'all' | 'weekly' = 'all',
    limit: number = 50,
    signal?: AbortSignal
  ): Promise<{ status: string; data: LeaderboardEntry[] }> {
    const res = await fetchApi('/gamification/leaderboard', { signal })
    const users: RawLeaderboardUser[] = res.data ?? []
    // Transform and assign rank
    const mapped: LeaderboardEntry[] = users.slice(0, limit).map((u, idx) => ({
      rank: idx + 1,
      user_id: u.id,
      username: u.username || '',
      display_name: u.username || 'User',
      avatar_url: undefined,
      xp: u.xp || 0,
      level: u.level || 1,
      streak: u.streak || 0,
      courses_completed: 0, // not available
      is_current_user: false, // will be filled by client if needed
    }))
    return { status: 'success', data: mapped }
  },

  async getUserRank(): Promise<{
    status: string
    data: { rank: number; total_users: number; percentile: number }
  }> {
    // Try to fetch user rank from backend
    try {
      return await fetchApi('/leaderboard/me/')
    } catch {
      // Backend endpoint not implemented - calculate from leaderboard data
      const leaderboard = await this.getLeaderboard('all', 1000)
      const currentUserId = localStorage.getItem('userId')
      const userEntry = leaderboard.data.find(u => u.user_id === currentUserId)

      if (userEntry) {
        const percentile =
          leaderboard.data.length > 1
            ? Math.round(
                ((leaderboard.data.length - userEntry.rank) / (leaderboard.data.length - 1)) * 100
              )
            : 100
        return {
          status: 'success',
          data: {
            rank: userEntry.rank,
            total_users: leaderboard.data.length,
            percentile,
          },
        }
      }

      return { status: 'success', data: { rank: 0, total_users: 0, percentile: 0 } }
    }
  },

  async getNearbyUsers(limit: number = 10): Promise<{ status: string; data: LeaderboardEntry[] }> {
    // Return top users as placeholder
    return this.getLeaderboard('all', limit)
  },
}
