import { fetchApi } from '../utils/api'

export interface Mentor {
  id: string
  user: {
    id: string
    username: string
    display_name: string
    avatar?: string
  }
  expertise: string[]
  bio: string
  hourly_rate: number
  rating: number
  total_reviews: number
  is_available: boolean
  availability: {
    day: string
    start_time: string
    end_time: string
  }[]
  created_at: string
}

export interface MentorshipSession {
  id: string
  mentor: Mentor
  student: {
    id: string
    username: string
    display_name: string
  }
  scheduled_at: string
  duration_minutes: number
  status: 'scheduled' | 'completed' | 'cancelled'
  topic: string
  notes?: string
  meeting_link?: string
  created_at: string
}

export interface MentorsResponse {
  status: string
  data: Mentor[]
  count: number
}

export interface SessionsResponse {
  status: string
  data: MentorshipSession[]
  count: number
}

export interface SingleMentorResponse {
  status: string
  data: Mentor
}

export interface SingleSessionResponse {
  status: string
  data: MentorshipSession
}

export interface BookSessionRequest {
  mentor_id: string
  scheduled_at: string
  duration_minutes: number
  topic: string
  notes?: string
}

export const mentorService = {
  getMentors: async (filters?: {
    expertise?: string
    available?: boolean
  }): Promise<MentorsResponse> => {
    const params = new URLSearchParams()
    if (filters?.expertise) params.append('expertise', filters.expertise)
    if (filters?.available !== undefined) params.append('available', String(filters.available))
    const query = params.toString() ? `?${params.toString()}` : ''
    return fetchApi(`/mentors${query}`)
  },

  getMentor: async (id: string): Promise<SingleMentorResponse> => {
    return fetchApi(`/mentors/${id}`)
  },

  getMySessions: async (): Promise<SessionsResponse> => {
    return fetchApi('/mentors/sessions/my-sessions')
  },

  bookSession: async (data: BookSessionRequest): Promise<SingleSessionResponse> => {
    return fetchApi('/mentors/book', {
      method: 'POST',
      body: JSON.stringify(data),
    })
  },

  cancelSession: async (id: string, reason?: string): Promise<SingleSessionResponse> => {
    return fetchApi(`/mentors/sessions/${id}/cancel`, {
      method: 'POST',
      body: JSON.stringify({ reason: reason ?? 'User requested cancellation' }),
    })
  },

  getAvailability: async (
    mentorId: string
  ): Promise<{ status: string; data: { day: string; slots: string[] }[] }> => {
    try {
      return await fetchApi(`/mentors/${mentorId}/availability`)
    } catch {
      return { status: 'success', data: [] }
    }
  },
}
