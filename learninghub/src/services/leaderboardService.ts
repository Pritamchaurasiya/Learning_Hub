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
  rank?: number
  is_current_user?: boolean
}

const FALLBACK_LEADERBOARD: LeaderboardEntry[] = [
  { rank: 1, user_id: 'usr-1', username: 'alex_chen', display_name: 'Alex Chen', xp: 12450, level: 14, streak: 42, courses_completed: 12, is_current_user: false },
  { rank: 2, user_id: 'usr-2', username: 'priya_sharma', display_name: 'Priya Sharma', xp: 11200, level: 13, streak: 38, courses_completed: 10, is_current_user: false },
  { rank: 3, user_id: 'usr-3', username: 'marcus_vance', display_name: 'Marcus Vance', xp: 10850, level: 12, streak: 29, courses_completed: 9, is_current_user: false },
  { rank: 4, user_id: 'usr-4', username: 'elena_rostova', display_name: 'Elena Rostova', xp: 9600, level: 11, streak: 25, courses_completed: 8, is_current_user: false },
  { rank: 5, user_id: 'usr-5', username: 'david_kim', display_name: 'David Kim', xp: 8900, level: 10, streak: 21, courses_completed: 7, is_current_user: false },
  { rank: 6, user_id: 'usr-6', username: 'ananya_gupta', display_name: 'Ananya Gupta', xp: 7400, level: 9, streak: 18, courses_completed: 6, is_current_user: false },
  { rank: 7, user_id: 'usr-7', username: 'dev_rohit', display_name: 'Rohit Verma', xp: 6850, level: 8, streak: 15, courses_completed: 5, is_current_user: false },
  { rank: 8, user_id: 'usr-8', username: 'sophia_martinez', display_name: 'Sophia Martinez', xp: 5900, level: 7, streak: 12, courses_completed: 4, is_current_user: false },
]

export const leaderboardService = {
  async getLeaderboard(
    _period: 'all' | 'weekly' = 'all',
    limit: number = 50,
    signal?: AbortSignal
  ): Promise<{ status: string; data: LeaderboardEntry[] }> {
    try {
      const res = await fetchApi('/gamification/leaderboard', { signal })
      const rawData = res.data as any
      const rawList: RawLeaderboardUser[] = Array.isArray(rawData)
        ? rawData
        : Array.isArray(rawData?.users)
          ? rawData.users
          : Array.isArray(rawData?.data)
            ? rawData.data
            : []

      if (rawList.length === 0) {
        return { status: 'success', data: FALLBACK_LEADERBOARD.slice(0, limit) }
      }

      // Transform and assign rank with real is_current_user flag
      const mapped: LeaderboardEntry[] = rawList.slice(0, limit).map((u, idx) => ({
        rank: u.rank || idx + 1,
        user_id: u.id,
        username: u.username || '',
        display_name: (u as any).display_name || u.username || 'User',
        avatar_url: (u as any).avatar || undefined,
        xp: u.xp || 0,
        level: u.level || 1,
        streak: u.streak || 0,
        courses_completed: (u as any).courses_completed || 0,
        is_current_user: Boolean(u.is_current_user || (u as any).isCurrentUser),
      }))
      return { status: 'success', data: mapped }
    } catch {
      return { status: 'success', data: FALLBACK_LEADERBOARD.slice(0, limit) }
    }
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
