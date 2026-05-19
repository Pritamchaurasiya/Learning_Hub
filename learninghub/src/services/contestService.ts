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

export interface ContestResult {
  contestId: string
  rank: number
  score: number
  time: number
  solved: number
}

export const contestService = {
  getContests: () =>
    fetchApi(`/contests/`) as Promise<{
      status: string
      data: Contest[]
    }>,

  getLeaderboard: (id: string) =>
    fetchApi(`/contests/${id}/leaderboard/`) as Promise<{
      status: string
      data: ContestLeaderboardEntry[]
    }>,

  getContestResults: (id: string) =>
    fetchApi(`/contests/${id}/results/`) as Promise<{
      status: string
      data: ContestResult[]
    }>,

  participate: (id: string) =>
    fetchApi(`/contests/${id}/participate/`, {
      method: 'POST',
    }) as Promise<{ status: string; data: { registered: boolean } }>,

  submitSolution: (id: string, problemId: string, solution: string) =>
    fetchApi(`/contests/${id}/submit/`, {
      method: 'POST',
      body: JSON.stringify({ problem_id: problemId, solution }),
    }) as Promise<{ status: string; data: { accepted: boolean; score: number } }>,
}
