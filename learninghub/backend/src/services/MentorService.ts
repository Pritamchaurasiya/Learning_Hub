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

const mockMentors: Mentor[] = [
  {
    id: 'mentor-1',
    user: {
      id: 'usr-m-1',
      username: 'arjun_iitd',
      display_name: 'Dr. Arjun Rao',
      avatar:
        'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&h=100&fit=crop&crop=faces',
    },
    expertise: ['Data Structures', 'Algorithms', 'Competitive Programming', 'System Design'],
    bio: 'Ex-Google Staff Engineer & ICPC World Finalist. Mentored 500+ engineers into FAANG & top tech tiers.',
    hourly_rate: 45,
    rating: 4.95,
    total_reviews: 142,
    is_available: true,
    availability: [
      { day: 'Monday', start_time: '18:00', end_time: '21:00' },
      { day: 'Wednesday', start_time: '18:00', end_time: '21:00' },
      { day: 'Saturday', start_time: '10:00', end_time: '16:00' },
    ],
    created_at: new Date(Date.now() - 86400000 * 60).toISOString(),
  },
  {
    id: 'mentor-2',
    user: {
      id: 'usr-m-2',
      username: 'priya_physics',
      display_name: 'Prof. Priya Nair',
      avatar:
        'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=100&h=100&fit=crop&crop=faces',
    },
    expertise: [
      'Physics (JEE Advanced / NEET)',
      'Electromagnetism',
      'Rotational Mechanics',
      'Quantum Physics',
    ],
    bio: '12+ years preparing national top-100 rankers in JEE & NEET. Specializes in multi-concept physics problem framing.',
    hourly_rate: 40,
    rating: 4.92,
    total_reviews: 188,
    is_available: true,
    availability: [
      { day: 'Tuesday', start_time: '17:00', end_time: '20:00' },
      { day: 'Thursday', start_time: '17:00', end_time: '20:00' },
      { day: 'Sunday', start_time: '09:00', end_time: '14:00' },
    ],
    created_at: new Date(Date.now() - 86400000 * 90).toISOString(),
  },
  {
    id: 'mentor-3',
    user: {
      id: 'usr-m-3',
      username: 'dev_ai_lead',
      display_name: 'Vikram Sengupta',
      avatar:
        'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100&h=100&fit=crop&crop=faces',
    },
    expertise: ['Machine Learning', 'Deep Learning', 'LLMs', 'Python', 'MLOps'],
    bio: 'AI Research Engineer & Author. Helping students transition to state-of-the-art Generative AI and research tracks.',
    hourly_rate: 55,
    rating: 4.88,
    total_reviews: 94,
    is_available: true,
    availability: [
      { day: 'Friday', start_time: '18:00', end_time: '22:00' },
      { day: 'Saturday', start_time: '14:00', end_time: '18:00' },
    ],
    created_at: new Date(Date.now() - 86400000 * 45).toISOString(),
  },
]

const mockSessions: MentorshipSession[] = []

export class MentorService {
  async getMentors(expertise?: string): Promise<Mentor[]> {
    if (expertise) {
      return mockMentors.filter(m =>
        m.expertise.some(e => e.toLowerCase().includes(expertise.toLowerCase()))
      )
    }
    return mockMentors
  }

  async getMentorById(id: string): Promise<Mentor | null> {
    return mockMentors.find(m => m.id === id) || null
  }

  async getUserSessions(userId: string): Promise<MentorshipSession[]> {
    return mockSessions.filter(s => s.student.id === userId)
  }

  async bookSession(
    userId: string,
    input: {
      mentor_id: string
      scheduled_at: string
      duration_minutes: number
      topic: string
      notes?: string
    }
  ): Promise<MentorshipSession> {
    const mentor = mockMentors.find(m => m.id === input.mentor_id)
    if (!mentor) throw new Error('Mentor not found')

    const newSession: MentorshipSession = {
      id: `session-${Date.now()}`,
      mentor,
      student: {
        id: userId,
        username: 'student',
        display_name: 'Student Learner',
      },
      scheduled_at: input.scheduled_at,
      duration_minutes: input.duration_minutes || 60,
      status: 'scheduled',
      topic: input.topic,
      notes: input.notes,
      meeting_link: `https://meet.learninghub.app/mentor-${input.mentor_id}-${Date.now()}`,
      created_at: new Date().toISOString(),
    }

    mockSessions.push(newSession)
    return newSession
  }
}

export const mentorService = new MentorService()
