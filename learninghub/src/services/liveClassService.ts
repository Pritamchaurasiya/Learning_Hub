import { fetchApi } from '../utils/api'

export interface LiveSession {
  id: string
  title: string
  description: string
  instructor: {
    id: string
    username: string
    display_name: string
    avatar?: string
  }
  course?: {
    id: string
    title: string
  }
  scheduled_at: string
  duration_minutes: number
  status: 'scheduled' | 'live' | 'ended' | 'cancelled'
  max_participants: number
  current_participants: number
  meeting_url?: string
  recording_url?: string
  is_joined: boolean
  has_recordings: boolean
  created_at: string
  updated_at: string
}

export interface LiveSessionsResponse {
  status: string
  data: LiveSession[]
  count: number
}

export interface SingleLiveSessionResponse {
  status: string
  data: LiveSession
}

export interface SessionNotes {
  id: string
  session_id: string
  content: string
  created_at: string
  updated_at: string
}

export const liveClassService = {
  getUpcomingSessions: async (): Promise<LiveSessionsResponse> => {
    return fetchApi('/live-sessions/sessions/upcoming/')
  },

  getLiveSessions: async (): Promise<LiveSessionsResponse> => {
    return fetchApi('/live-sessions/sessions/live/')
  },

  getMySessions: async (): Promise<LiveSessionsResponse> => {
    return fetchApi('/live-sessions/sessions/my-sessions/')
  },

  getSession: async (id: string): Promise<SingleLiveSessionResponse> => {
    return fetchApi(`/live-sessions/sessions/${id}/`)
  },

  joinSession: async (id: string): Promise<SingleLiveSessionResponse> => {
    return fetchApi(`/live-sessions/sessions/${id}/join/`, {
      method: 'POST',
    })
  },

  leaveSession: async (id: string): Promise<{ status: string }> => {
    return fetchApi(`/live-sessions/sessions/${id}/leave/`, {
      method: 'POST',
    })
  },

  getSessionNotes: async (sessionId: string): Promise<{ status: string; data: SessionNotes }> => {
    return fetchApi(`/live-sessions/sessions/${sessionId}/notes/`)
  },

  saveSessionNotes: async (sessionId: string, content: string): Promise<{ status: string; data: SessionNotes }> => {
    return fetchApi(`/live-sessions/sessions/${sessionId}/notes/`, {
      method: 'POST',
      body: JSON.stringify({ content }),
    })
  },

  getRecordings: async (): Promise<{ status: string; data: { id: string; session: LiveSession; recording_url: string; duration_seconds: number; created_at: string }[] }> => {
    return fetchApi('/live-sessions/recordings/')
  },
}
