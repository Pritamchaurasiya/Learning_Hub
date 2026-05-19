import { fetchApi } from '../utils/api'

export interface LearningPath {
  id: string
  title: string
  description: string
  level: 'Beginner' | 'Intermediate' | 'Advanced'
  duration: string
  courses: number
  enrolled: boolean
  progress: number
  completed_courses: number
  image?: string
  skills: string[]
  created_at: string
  updated_at: string
}

export interface LearningPathResponse {
  status: string
  data: LearningPath[]
  count: number
}

export interface SingleLearningPathResponse {
  status: string
  data: LearningPath
}

export const learningPathService = {
  getLearningPaths: async (): Promise<LearningPathResponse> => {
    return fetchApi('/learning-paths/') as Promise<LearningPathResponse>
  },

  getLearningPath: async (id: string): Promise<SingleLearningPathResponse> => {
    return fetchApi(`/learning-paths/${id}/`) as Promise<SingleLearningPathResponse>
  },

  enrollInPath: async (id: string): Promise<SingleLearningPathResponse> => {
    return fetchApi(`/learning-paths/${id}/enroll/`, {
      method: 'POST',
    }) as Promise<SingleLearningPathResponse>
  },

  getMyProgress: async (): Promise<LearningPathResponse> => {
    return fetchApi('/learning-paths/my-progress/') as Promise<LearningPathResponse>
  },
}
