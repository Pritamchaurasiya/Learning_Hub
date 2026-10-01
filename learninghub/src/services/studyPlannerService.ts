import { fetchApi } from '../utils/api'

export interface StudyTask {
  id: string
  title: string
  description?: string
  course?: {
    id: string
    title: string
  }
  task_type: 'reading' | 'video' | 'quiz' | 'assignment' | 'practice' | 'review'
  scheduled_date: string
  scheduled_time?: string
  duration_minutes: number
  priority: 'low' | 'medium' | 'high'
  status: 'pending' | 'in_progress' | 'completed' | 'skipped'
  completed_at?: string
  notes?: string
  created_at: string
  updated_at: string
}

export interface StudySchedule {
  id: string
  title: string
  description?: string
  start_date: string
  end_date: string
  daily_goal_minutes: number
  preferred_study_times: string[]
  is_active: boolean
  created_at: string
  updated_at: string
}

export interface StudyProgress {
  date: string
  total_minutes: number
  tasks_completed: number
  tasks_total: number
  streak_days: number
}

export interface StudyTasksResponse {
  status: string
  data: StudyTask[]
  count: number
}

export interface SingleStudyTaskResponse {
  status: string
  data: StudyTask
}

export interface StudyScheduleResponse {
  status: string
  data: StudySchedule
}

export interface StudyProgressResponse {
  status: string
  data: StudyProgress[]
}

export interface CreateTaskRequest {
  title: string
  description?: string
  course_id?: string
  task_type: StudyTask['task_type']
  scheduled_date: string
  scheduled_time?: string
  duration_minutes: number
  priority?: StudyTask['priority']
  notes?: string
}

export interface CreateScheduleRequest {
  title: string
  description?: string
  start_date: string
  end_date: string
  daily_goal_minutes: number
  preferred_study_times: string[]
}

export const studyPlannerService = {
  getTasks: async (filters?: {
    date?: string
    status?: string
    course_id?: string
  }): Promise<StudyTasksResponse> => {
    const params = new URLSearchParams()
    if (filters?.date) params.append('date', filters.date)
    if (filters?.status) params.append('status', filters.status)
    if (filters?.course_id) params.append('course_id', filters.course_id)
    const query = params.toString() ? `?${params.toString()}` : ''
    return fetchApi(`/study-planner/tasks${query}`)
  },

  getTodayTasks: async (): Promise<StudyTasksResponse> => {
    return fetchApi('/study-planner/tasks/today')
  },

  getUpcomingTasks: async (): Promise<StudyTasksResponse> => {
    return fetchApi('/study-planner/tasks/upcoming')
  },

  createTask: async (data: CreateTaskRequest): Promise<SingleStudyTaskResponse> => {
    return fetchApi('/study-planner/tasks', {
      method: 'POST',
      body: JSON.stringify(data),
    })
  },

  updateTask: async (
    id: string,
    data: Partial<CreateTaskRequest>
  ): Promise<SingleStudyTaskResponse> => {
    return fetchApi(`/study-planner/tasks/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    })
  },

  completeTask: async (id: string, notes?: string): Promise<SingleStudyTaskResponse> => {
    return fetchApi(`/study-planner/tasks/${id}/complete`, {
      method: 'POST',
      body: notes ? JSON.stringify({ notes }) : undefined,
    })
  },

  deleteTask: async (id: string): Promise<{ status: string }> => {
    return fetchApi(`/study-planner/tasks/${id}`, {
      method: 'DELETE',
    })
  },

  getSchedule: async (): Promise<StudyScheduleResponse> => {
    return fetchApi('/study-planner/schedules/my-schedule')
  },

  createSchedule: async (data: CreateScheduleRequest): Promise<StudyScheduleResponse> => {
    return fetchApi('/study-planner/schedules', {
      method: 'POST',
      body: JSON.stringify(data),
    })
  },

  updateSchedule: async (
    id: string,
    data: Partial<CreateScheduleRequest>
  ): Promise<StudyScheduleResponse> => {
    return fetchApi(`/study-planner/schedules/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    })
  },

  getProgress: async (days: number = 30): Promise<StudyProgressResponse> => {
    return fetchApi(`/study-planner/progress?days=${days}`)
  },
}
