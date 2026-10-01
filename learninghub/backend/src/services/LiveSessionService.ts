export interface LiveSession {
  id: string
  title: string
  instructorName: string
  scheduledAt: string
  durationMinutes: number
  status: 'upcoming' | 'live' | 'completed'
  maxParticipants: number
  currentParticipants: number
  topic?: string
  roomUrl?: string
  recordingUrl?: string
  createdAt?: string
}

const mockSessions: LiveSession[] = [
  {
    id: 'live-101',
    title: 'Live Masterclass: Conquering Graph Theory & Shortest Path Algorithms',
    instructorName: 'Prof. Arjun Rao (IIT Bombay)',
    scheduledAt: new Date(Date.now() + 1800000).toISOString(),
    durationMinutes: 90,
    status: 'live',
    maxParticipants: 300,
    currentParticipants: 142,
    topic: 'DSA & Competitive Programming',
    roomUrl: '/live-class?room=live-101',
    createdAt: new Date(Date.now() - 86400000 * 2).toISOString(),
  },
  {
    id: 'live-102',
    title: 'Rapid Problem Solving: Electrostatics & Magnetic Effects of Current',
    instructorName: 'Dr. Priya Nair (Ex-FIITJEE Senior Faculty)',
    scheduledAt: new Date(Date.now() + 3600000 * 4).toISOString(),
    durationMinutes: 60,
    status: 'upcoming',
    maxParticipants: 500,
    currentParticipants: 289,
    topic: 'Physics for JEE / NEET',
    roomUrl: '/live-class?room=live-102',
    createdAt: new Date(Date.now() - 86400000 * 3).toISOString(),
  },
  {
    id: 'live-103',
    title: 'High-Yield Organic Reagents & Synthetic Conversions Workshop',
    instructorName: 'Dr. Vivek Sharma (AIIMS Alumnus)',
    scheduledAt: new Date(Date.now() + 3600000 * 24).toISOString(),
    durationMinutes: 75,
    status: 'upcoming',
    maxParticipants: 400,
    currentParticipants: 195,
    topic: 'Chemistry',
    roomUrl: '/live-class?room=live-103',
    createdAt: new Date(Date.now() - 86400000 * 4).toISOString(),
  },
  {
    id: 'live-104',
    title: 'Calculus Deep Dive: Definite Integration & Area Under Curves',
    instructorName: 'Er. Rajesh Kumar',
    scheduledAt: new Date(Date.now() - 3600000 * 24).toISOString(),
    durationMinutes: 120,
    status: 'completed',
    maxParticipants: 250,
    currentParticipants: 238,
    topic: 'Mathematics',
    recordingUrl: 'https://learninghub.app/recordings/calculus-mastery-104',
    createdAt: new Date(Date.now() - 86400000 * 5).toISOString(),
  },
]

export class LiveSessionService {
  async getAllSessions(status?: string): Promise<LiveSession[]> {
    if (status) {
      return mockSessions.filter(s => s.status === status)
    }
    return mockSessions
  }

  async getSessionById(id: string): Promise<LiveSession | null> {
    return mockSessions.find(s => s.id === id) || null
  }

  async joinSession(
    sessionId: string,
    userId: string
  ): Promise<{ success: boolean; session: LiveSession; token: string }> {
    const session = mockSessions.find(s => s.id === sessionId)
    if (!session) throw new Error('Session not found')
    session.currentParticipants = Math.min(session.maxParticipants, session.currentParticipants + 1)
    return {
      success: true,
      session,
      token: `rtc-token-${sessionId}-${userId}-${Date.now()}`,
    }
  }

  async registerSession(
    sessionId: string,
    _userId: string
  ): Promise<{ success: boolean; registered: boolean; session: LiveSession }> {
    const session = mockSessions.find(s => s.id === sessionId)
    if (!session) throw new Error('Session not found')
    session.currentParticipants = Math.min(session.maxParticipants, session.currentParticipants + 1)
    return {
      success: true,
      registered: true,
      session,
    }
  }
}

export const liveSessionService = new LiveSessionService()
