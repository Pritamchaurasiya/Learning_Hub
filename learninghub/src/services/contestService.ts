import { fetchApi } from '../utils/api'

export interface Contest {
  contest_id: string
  title: string
  description?: string
  start_time: string
  end_time: string
  duration?: number
  status: 'upcoming' | 'active' | 'completed'
  participants: number
  problem_count: number
  is_registered?: boolean
  prize?: string
  difficulty?: 'easy' | 'medium' | 'hard' | 'expert'
}

export interface ContestProblem {
  id: string
  title: string
  difficulty: 'easy' | 'medium' | 'hard'
  points: number
  solved: boolean
  submissions: number
}

export interface ContestLeaderboardEntry {
  rank: number
  user: string
  score: number
  problems_solved: number
  finish_time: string | null
}

export const contestService = {
  getContests: () =>
    fetchApi(`/dsa/contests/`) as Promise<{
      status: string
      data: Contest[]
    }>,

  getLeaderboard: (id: string) =>
    fetchApi(`/dsa/contests/${id}/leaderboard/`) as Promise<{
      status: string
      data: ContestLeaderboardEntry[]
    }>,
}
