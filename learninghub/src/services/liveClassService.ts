import { fetchApi } from '../utils/api'

export interface LiveSession {
  id: string
  title: string
  instructorName: string
  scheduledAt: string
  durationMinutes: number
  status: 'upcoming' | 'live' | 'completed'
  maxParticipants: number
  currentParticipants: number
  createdAt?: string
}

export interface LiveSessionsResponse {
  status: string
  data: LiveSession[]
  count?: number
}

export interface SingleLiveSessionResponse {
  status: string
  data: LiveSession
}

// Map backend LiveSession shape to frontend shape
function mapSession(raw: any): LiveSession {
  return {
    id: raw.id,
    title: raw.title ?? '',
    instructorName: raw.instructorName ?? raw.instructor_name ?? '',
    scheduledAt: raw.scheduledAt ?? raw.scheduled_at ?? new Date().toISOString(),
    durationMinutes: raw.durationMinutes ?? raw.duration_minutes ?? 60,
    status: raw.status ?? 'upcoming',
    maxParticipants: raw.maxParticipants ?? raw.max_participants ?? 100,
    currentParticipants: raw.currentParticipants ?? raw.current_participants ?? 0,
    createdAt: raw.createdAt ?? raw.created_at,
  }
}

export const liveClassService = {
  // GET /live-sessions — returns all sessions, filter client-side by status
  getAllSessions: async (): Promise<LiveSessionsResponse> => {
    const res = await fetchApi('/live-sessions')
    const items: any[] = res.data?.results ?? res.data ?? res.results ?? []
    return {
      status: res.status ?? 'success',
      data: items.map(mapSession),
      count: items.length,
    }
  },

  getUpcomingSessions: async (): Promise<LiveSessionsResponse> => {
    const all = await liveClassService.getAllSessions()
    return { ...all, data: all.data.filter(s => s.status === 'upcoming') }
  },

  getLiveSessions: async (): Promise<LiveSessionsResponse> => {
    const all = await liveClassService.getAllSessions()
    return { ...all, data: all.data.filter(s => s.status === 'live') }
  },

  getMySessions: async (): Promise<LiveSessionsResponse> => {
    // Backend doesn't track per-user sessions yet — return all as fallback
    return liveClassService.getAllSessions()
  },

  getSession: async (id: string): Promise<SingleLiveSessionResponse> => {
    const res = await fetchApi(`/live-sessions/${id}`)
    return {
      status: res.status ?? 'success',
      data: mapSession(res.data ?? res),
    }
  },

  joinSession: async (id: string): Promise<SingleLiveSessionResponse> => {
    const res = await fetchApi(`/live-sessions/${id}/join`, { method: 'POST' })
    return {
      status: res.status ?? 'success',
      data: mapSession(res.data ?? res),
    }
  },

  createSession: async (data: {
    title: string
    instructorName: string
    scheduledAt: string
    durationMinutes: number
    maxParticipants?: number
  }): Promise<SingleLiveSessionResponse> => {
    const res = await fetchApi('/live-sessions', {
      method: 'POST',
      body: JSON.stringify(data),
    })
    return {
      status: res.status ?? 'success',
      data: mapSession(res.data ?? res),
    }
  },
}
