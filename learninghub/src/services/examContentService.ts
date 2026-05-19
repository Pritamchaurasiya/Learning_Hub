import { fetchApi } from '../utils/api'

export interface PYQ {
  id: string
  examType: string
  year: number
  paper: string
  subject: string
  question: string
  options: string[]
  answer: string
  explanation: string
  difficulty: string
  marks: number
  tags: string[]
}

export interface Formula {
  id: string
  examType: string
  subject: string
  topic: string
  name: string
  formula: string
  description: string
  examples: string[]
  tags: string[]
}

export interface RevisionNote {
  id: string
  examType: string
  subject: string
  topic: string
  content: string
  keyPoints: string[]
  tags: string[]
}

export const examContentService = {
  // PYQs
  getPYQs: async (filters: {
    examType?: string
    year?: number
    subject?: string
    page?: number
    limit?: number
  }) => {
    const params = new URLSearchParams()
    Object.entries(filters).forEach(([key, value]) => {
      if (value) params.append(key, String(value))
    })
    return fetchApi(`/exam-content/pyqs?${params}`) as Promise<{
      status: string
      data: PYQ[]
      meta: { total: number; page: number; pages: number }
    }>
  },

  getPYQById: async (id: string) => {
    return fetchApi(`/exam-content/pyqs/${id}`) as Promise<{
      status: string
      data: PYQ
    }>
  },

  // Formulas
  getFormulas: async (filters: { examType?: string; subject?: string; topic?: string }) => {
    const params = new URLSearchParams()
    if (filters.examType) params.append('examType', filters.examType)
    if (filters.subject) params.append('subject', filters.subject)
    if (filters.topic) params.append('topic', filters.topic)
    return fetchApi(`/exam-content/formulas?${params.toString()}`) as Promise<{
      status: string
      data: Formula[]
    }>
  },

  // Revision Notes
  getRevisionNotes: async (filters: { examType?: string; subject?: string; topic?: string }) => {
    const params = new URLSearchParams()
    if (filters.examType) params.append('examType', filters.examType)
    if (filters.subject) params.append('subject', filters.subject)
    if (filters.topic) params.append('topic', filters.topic)
    return fetchApi(`/exam-content/notes?${params.toString()}`) as Promise<{
      status: string
      data: RevisionNote[]
    }>
  },
}
