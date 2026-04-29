import { fetchApi } from '../utils/api'

export interface Problem {
  id: string
  title: string
  slug: string
  difficulty: 'easy' | 'medium' | 'hard'
  category: string
  description: string
  examples: {
    input: string
    output: string
    explanation?: string
  }[]
  constraints: string[]
  starter_code: {
    language: string
    code: string
  }[]
  acceptance_rate: number
  submission_count: number
  solved_count: number
}

export interface ProblemSubmission {
  id: string
  problem_id: string
  language: string
  code: string
  status: 'pending' | 'accepted' | 'wrong_answer' | 'time_limit_exceeded' | 'runtime_error' | 'compilation_error'
  runtime: number | null
  memory: number | null
  submitted_at: string
}

export const problemService = {
  getProblems: (params?: { difficulty?: string; category?: string; page?: number }) =>
    fetchApi(`/problems/?${new URLSearchParams(params as Record<string, string>).toString()}`) as Promise<{
      status: string
      data: Problem[]
      meta: { total: number; page: number; pages: number }
    }>,

  getProblem: (slug: string) =>
    fetchApi(`/problems/${slug}/`) as Promise<{ status: string; data: Problem }>,

  submitSolution: (problemId: string, language: string, code: string) =>
    fetchApi(`/problems/${problemId}/submit/`, {
      method: 'POST',
      body: JSON.stringify({ language, code })
    }) as Promise<{ status: string; data: ProblemSubmission }>,

  getSubmissions: (problemId: string) =>
    fetchApi(`/problems/${problemId}/submissions/`) as Promise<{ status: string; data: ProblemSubmission[] }>,

  getSubmission: (problemId: string, submissionId: string) =>
    fetchApi(`/problems/${problemId}/submissions/${submissionId}/`) as Promise<{ status: string; data: ProblemSubmission }>,

  getCategories: () =>
    fetchApi('/problems/categories/') as Promise<{ status: string; data: string[] }>
}
