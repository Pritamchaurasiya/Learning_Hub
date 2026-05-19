import { fetchApi } from '../utils/api'

export interface StudyGoal {
  id: string
  title: string
  target: string
  deadline: string
  progress: number
  color: string
  description?: string
  category?: string
  created_at?: string
  updated_at?: string
}

export interface CreateGoalRequest {
  title: string
  target: string
  deadline: string
  description?: string
  category?: string
  color?: string
}

export interface UpdateGoalRequest {
  title?: string
  target?: string
  deadline?: string
  progress?: number
  description?: string
  category?: string
  color?: string
}

export interface StudyGoalsResponse {
  status: string
  data: StudyGoal[]
  count: number
}

export interface SingleGoalResponse {
  status: string
  data: StudyGoal
}

/**
 * Service for managing study goals
 */
export const studyGoalsService = {
  /**
   * Get all study goals for the current user
   */
  getGoals: async (): Promise<StudyGoalsResponse> => {
    return fetchApi('/study-goals/')
  },

  /**
   * Get a single goal by ID
   */
  getGoal: async (id: string): Promise<SingleGoalResponse> => {
    return fetchApi(`/study-goals/${id}/`)
  },

  /**
   * Create a new study goal
   */
  createGoal: async (data: CreateGoalRequest): Promise<SingleGoalResponse> => {
    return fetchApi('/study-goals/', {
      method: 'POST',
      body: JSON.stringify(data),
    })
  },

  /**
   * Update an existing goal
   */
  updateGoal: async (id: string, data: UpdateGoalRequest): Promise<SingleGoalResponse> => {
    return fetchApi(`/study-goals/${id}/`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    })
  },

  /**
   * Update goal progress
   */
  updateProgress: async (id: string, progress: number): Promise<SingleGoalResponse> => {
    return fetchApi(`/study-goals/${id}/progress/`, {
      method: 'PATCH',
      body: JSON.stringify({ progress }),
    })
  },

  /**
   * Delete a goal
   */
  deleteGoal: async (id: string): Promise<{ status: string }> => {
    return fetchApi(`/study-goals/${id}/`, {
      method: 'DELETE',
    })
  },

  /**
   * Get goals by category
   */
  getGoalsByCategory: async (category: string): Promise<StudyGoalsResponse> => {
    return fetchApi(`/study-goals/?category=${encodeURIComponent(category)}`)
  },

  /**
   * Get active goals (not completed)
   */
  getActiveGoals: async (): Promise<StudyGoalsResponse> => {
    return fetchApi('/study-goals/?status=active')
  },

  /**
   * Get completed goals
   */
  getCompletedGoals: async (): Promise<StudyGoalsResponse> => {
    return fetchApi('/study-goals/?status=completed')
  },
}
