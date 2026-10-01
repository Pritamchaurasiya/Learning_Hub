import { fetchApi } from '../utils/api'

export type ReviewStatus = 'DRAFT' | 'PENDING_REVIEW' | 'APPROVED' | 'REJECTED'

export interface RawOptionInput {
  id?: string
  text: string
  isCorrect: boolean
  explanation?: string
  order?: number
}

export interface RawQuestionInput {
  text: string
  type: 'MCQ' | 'MSQ' | 'TRUE_FALSE' | 'NUMERICAL' | 'SHORT_ANSWER' | 'SUBJECTIVE' | 'CODING'
  difficulty: number
  bloomLevel: 'REMEMBER' | 'UNDERSTAND' | 'APPLY' | 'ANALYZE' | 'EVALUATE' | 'CREATE'
  explanation?: string
  tags: string[]
  points: number
  options: RawOptionInput[]
  topicId?: string
  testId?: string
}

export interface QuestionBankOption {
  id?: string
  text: string
  isCorrect: boolean
  explanation?: string | null
  order: number
}

export interface ReviewHistoryEntry {
  status: ReviewStatus
  reviewerId?: string
  reviewerName?: string
  feedback?: string
  rating?: number
  reviewedAt: string
}

export interface QuestionBankItem {
  id: string
  testId: string
  topicId?: string | null
  sectionId?: string | null
  text: string
  type: 'MCQ' | 'MSQ' | 'TRUE_FALSE' | 'NUMERICAL' | 'SHORT_ANSWER' | 'SUBJECTIVE' | 'CODING'
  difficulty: number
  bloomLevel: 'REMEMBER' | 'UNDERSTAND' | 'APPLY' | 'ANALYZE' | 'EVALUATE' | 'CREATE'
  explanation?: string | null
  tags: string[]
  points: number
  order: number
  status: ReviewStatus
  reviewHistory?: ReviewHistoryEntry[]
  section?: { id: string; title: string } | null
  topic?: { id: string; name: string } | null
  options: QuestionBankOption[]
}

export interface QuestionListParams {
  testId?: string
  topicId?: string
  type?: string
  difficultyMin?: number
  difficultyMax?: number
  search?: string
  status?: ReviewStatus | string
  page?: number
  limit?: number
}

export interface QuestionListResponse {
  questions: QuestionBankItem[]
  pagination: {
    total: number
    page: number
    limit: number
    totalPages: number
  }
}

export interface ReviewQuestionInput {
  status: ReviewStatus
  feedback?: string
  rating?: number
}

export interface ImportResult {
  totalProcessed: number
  importedCount: number
  skippedDuplicates: number
  errorCount: number
  errors: Array<{ index: number; questionText: string; error: string }>
  importedQuestionIds: string[]
}

export interface QuestionBankStats {
  totalQuestions: number
  byType: Record<string, number>
  avgDifficulty: number
  avgPoints: number
}

export const questionBankService = {
  /**
   * List questions with pagination, filtering, search, and review status
   */
  async listQuestions(params: QuestionListParams = {}): Promise<QuestionListResponse> {
    const searchParams = new URLSearchParams()
    if (params.testId) searchParams.set('testId', params.testId)
    if (params.topicId) searchParams.set('topicId', params.topicId)
    if (params.type) searchParams.set('type', params.type)
    if (params.difficultyMin !== undefined)
      searchParams.set('difficultyMin', String(params.difficultyMin))
    if (params.difficultyMax !== undefined)
      searchParams.set('difficultyMax', String(params.difficultyMax))
    if (params.search) searchParams.set('search', params.search)
    if (params.status) searchParams.set('status', params.status)
    if (params.page !== undefined) searchParams.set('page', String(params.page))
    if (params.limit !== undefined) searchParams.set('limit', String(params.limit))

    const query = searchParams.toString()
    const endpoint = query ? `/question-bank/questions?${query}` : '/question-bank/questions'
    const response = await fetchApi(endpoint, { method: 'GET' })
    return (response.data as QuestionListResponse) || response
  },

  /**
   * Retrieve single question with options and review history
   */
  async getQuestion(id: string): Promise<QuestionBankItem> {
    const response = await fetchApi(`/question-bank/questions/${id}`, { method: 'GET' })
    return (response.data as QuestionBankItem) || response
  },

  /**
   * Create a single question in question bank
   */
  async createQuestion(question: RawQuestionInput): Promise<QuestionBankItem> {
    const response = await fetchApi('/question-bank/questions', {
      method: 'POST',
      body: JSON.stringify(question),
    })
    return (response.data as QuestionBankItem) || response
  },

  /**
   * Update an existing question and its options
   */
  async updateQuestion(
    id: string,
    question: Partial<RawQuestionInput>
  ): Promise<QuestionBankItem> {
    const response = await fetchApi(`/question-bank/questions/${id}`, {
      method: 'PUT',
      body: JSON.stringify(question),
    })
    return (response.data as QuestionBankItem) || response
  },

  /**
   * Delete a question from question bank
   */
  async deleteQuestion(id: string): Promise<{ success: boolean; id: string }> {
    const response = await fetchApi(`/question-bank/questions/${id}`, {
      method: 'DELETE',
    })
    return (response.data as { success: boolean; id: string }) || response
  },

  /**
   * Submit an editorial review / status transition
   */
  async reviewQuestion(id: string, review: ReviewQuestionInput): Promise<QuestionBankItem> {
    const response = await fetchApi(`/question-bank/questions/${id}/review`, {
      method: 'POST',
      body: JSON.stringify(review),
    })
    return (response.data as QuestionBankItem) || response
  },

  /**
   * Bulk import questions
   */
  async importQuestions(payload: {
    testId?: string
    topicId?: string
    defaultTopic?: string
    questions: RawQuestionInput[]
    skipDuplicates?: boolean
  }): Promise<ImportResult> {
    const response = await fetchApi('/question-bank/import', {
      method: 'POST',
      body: JSON.stringify(payload),
    })
    return (response.data as ImportResult) || response
  },

  /**
   * Validate a question payload
   */
  async validateQuestion(
    question: RawQuestionInput
  ): Promise<{ isValid: boolean; normalized?: RawQuestionInput; error?: string }> {
    const response = await fetchApi('/question-bank/validate', {
      method: 'POST',
      body: JSON.stringify(question),
    })
    return (
      (response.data as { isValid: boolean; normalized?: RawQuestionInput; error?: string }) ||
      response
    )
  },

  /**
   * Export questions by test or topic
   */
  async exportQuestions(
    filters: {
      testId?: string
      topicId?: string
      type?: string
    } = {}
  ): Promise<{ questions: unknown[]; count: number }> {
    const searchParams = new URLSearchParams()
    if (filters.testId) searchParams.set('testId', filters.testId)
    if (filters.topicId) searchParams.set('topicId', filters.topicId)
    if (filters.type) searchParams.set('type', filters.type)
    const queryString = searchParams.toString()
    const endpoint = queryString ? `/question-bank/export?${queryString}` : '/question-bank/export'
    const response = await fetchApi(endpoint, { method: 'GET' })
    return (response.data as { questions: unknown[]; count: number }) || response
  },

  /**
   * Get Question Bank distribution statistics
   */
  async getQuestionBankStats(): Promise<QuestionBankStats> {
    const response = await fetchApi('/question-bank/stats', { method: 'GET' })
    return (response.data as QuestionBankStats) || response
  },
}

export default questionBankService

