import { fetchApi } from '../utils/api'
import type { Problem, Submission, DSAStats } from '../types/dsa'

export const problemService = {
  getProblems: async (params?: {
    difficulty?: string
    search?: string
    status?: string
    page?: number
  }) => {
    const searchParams = new URLSearchParams()
    if (params?.difficulty && params.difficulty !== 'ALL')
      searchParams.append('difficulty', params.difficulty)
    if (params?.search) searchParams.append('search', params.search)
    if (params?.status && params.status !== 'ALL') searchParams.append('status', params.status)
    if (params?.page) searchParams.append('page', params.page.toString())

    const res = await fetchApi(`/problems?${searchParams.toString()}`)
    return res as {
      status: string
      data: { results: Problem[]; total: number; page: number; pages: number } | Problem[]
    }
  },

  getProblem: async (slug: string) => {
    const res = await fetchApi(`/problems/${slug}`)
    return res as { status: string; data: Problem }
  },

  submitSolution: async (problemId: string, language: string, code: string) => {
    const res = await fetchApi(`/problems/${problemId}/submit`, {
      method: 'POST',
      body: JSON.stringify({ language, code }),
    })
    return res as { status: string; data: Submission }
  },

  getSubmissions: async (problemId: string) => {
    const res = await fetchApi(`/problems/${problemId}/submissions`)
    return res as { status: string; data: Submission[] }
  },

  getDsaStats: async () => {
    const res = await fetchApi('/gamification/dsa-stats')
    return res as { status: string; data: DSAStats }
  },
}
