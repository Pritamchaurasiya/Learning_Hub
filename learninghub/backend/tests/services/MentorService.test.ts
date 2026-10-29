/**
 * MentorService — Unit Tests
 * Tests the mentorship features: mentors, sessions, booking
 */
import { mentorService } from '../../src/services/MentorService'

describe('MentorService', () => {
  describe('getMentors', () => {
    it('should return all mentors when no expertise filter', async () => {
      const mentors = await mentorService.getMentors()

      expect(Array.isArray(mentors)).toBe(true)
      expect(mentors.length).toBe(3) // 3 mock mentors
    })

    it('should filter by expertise', async () => {
      const dsaMentors = await mentorService.getMentors('Data Structures')
      const physicsMentors = await mentorService.getMentors('Physics')
      const mlMentors = await mentorService.getMentors('Machine Learning')

      expect(dsaMentors.every(m => m.expertise.some(e => e.toLowerCase().includes('data structures')))).toBe(true)
      expect(physicsMentors.every(m => m.expertise.some(e => e.toLowerCase().includes('physics')))).toBe(true)
      expect(mlMentors.every(m => m.expertise.some(e => e.toLowerCase().includes('machine learning')))).toBe(true)
    })

    it('should be case-insensitive', async () => {
      const lower = await mentorService.getMentors('data structures')
      const upper = await mentorService.getMentors('DATA STRUCTURES')
      const mixed = await mentorService.getMentors('Data Structures')

      expect(lower.length).toBe(upper.length)
      expect(lower.length).toBe(mixed.length)
    })

    it('should return empty array for unknown expertise', async () => {
      const mentors = await mentorService.getMentors('Unknown Topic')
      expect(mentors).toEqual([])
    })
  })

  describe('getMentorById', () => {
    it('should return mentor for valid ID', async () => {
      const mentor = await mentorService.getMentorById('mentor-1')

      expect(mentor).toBeDefined()
      expect(mentor?.id).toBe('mentor-1')
      expect(mentor?.user.username).toBe('arjun_iitd')
      expect(mentor?.user.display_name).toBe('Dr. Arjun Rao')
      expect(mentor?.expertise).toContain('Data Structures')
      expect(mentor?.rating).toBe(4.95)
    })

    it('should return null for non-existent ID', async () => {
      const mentor = await mentorService.getMentorById('non-existent')
      expect(mentor).toBeNull()
    })
  })

  describe('getUserSessions', () => {
    it('should return empty array for user with no sessions', async () => {
      const sessions = await mentorService.getUserSessions('usr-no-sessions')
      expect(sessions).toEqual([])
    })

    it('should return sessions for user with booked sessions', async () => {
      // First book a session
      await mentorService.bookSession('usr-1', {
        mentor_id: 'mentor-1',
        scheduled_at: new Date(Date.now() + 86400000).toISOString(),
        duration_minutes: 60,
        topic: 'DSA Review',
      })

      const sessions = await mentorService.getUserSessions('usr-1')
      expect(sessions.length).toBeGreaterThanOrEqual(1)
      expect(sessions.every(s => s.student.id === 'usr-1')).toBe(true)
    })
  })

  describe('bookSession', () => {
    it('should book session with valid mentor', async () => {
      const session = await mentorService.bookSession('usr-1', {
        mentor_id: 'mentor-1',
        scheduled_at: new Date(Date.now() + 86400000).toISOString(),
        duration_minutes: 60,
        topic: 'System Design',
        notes: 'Focus on scalability',
      })

      expect(session.id).toMatch(/^session-\d+$/)
      expect(session.mentor.id).toBe('mentor-1')
      expect(session.student.id).toBe('usr-1')
      expect(session.student.username).toBe('student')
      expect(session.topic).toBe('System Design')
      expect(session.notes).toBe('Focus on scalability')
      expect(session.status).toBe('scheduled')
      expect(session.meeting_link).toMatch(/^https:\/\/meet\.learninghub\.app\/mentor-mentor-1-\d+$/)
    })

    it('should use default duration when not provided', async () => {
      const session = await mentorService.bookSession('usr-1', {
        mentor_id: 'mentor-2',
        scheduled_at: new Date(Date.now() + 86400000).toISOString(),
        topic: 'Physics Review',
      })

      expect(session.duration_minutes).toBe(60)
    })

    it('should throw for non-existent mentor', async () => {
      await expect(mentorService.bookSession('usr-1', {
        mentor_id: 'non-existent',
        scheduled_at: new Date(Date.now() + 86400000).toISOString(),
        duration_minutes: 60,
        topic: 'Test',
      })).rejects.toThrow('Mentor not found')
    })

    it('should add session to mock sessions array', async () => {
      const initialLength = (await mentorService.getUserSessions('usr-999')).length

      await mentorService.bookSession('usr-999', {
        mentor_id: 'mentor-1',
        scheduled_at: new Date(Date.now() + 86400000).toISOString(),
        duration_minutes: 30,
        topic: 'Test',
      })

      const sessions = await mentorService.getUserSessions('usr-999')
      expect(sessions.length).toBe(initialLength + 1)
    })
  })

  describe('Mentor data integrity', () => {
    it('should have valid mentor data', async () => {
      const mentors = await mentorService.getMentors()

      for (const mentor of mentors) {
        expect(mentor.id).toBeDefined()
        expect(mentor.user.id).toBeDefined()
        expect(mentor.user.username).toBeDefined()
        expect(mentor.user.display_name).toBeDefined()
        expect(Array.isArray(mentor.expertise)).toBe(true)
        expect(mentor.expertise.length).toBeGreaterThan(0)
        expect(typeof mentor.bio).toBe('string')
        expect(typeof mentor.hourly_rate).toBe('number')
        expect(mentor.hourly_rate).toBeGreaterThan(0)
        expect(typeof mentor.rating).toBe('number')
        expect(mentor.rating).toBeGreaterThanOrEqual(0)
        expect(mentor.rating).toBeLessThanOrEqual(5)
        expect(typeof mentor.total_reviews).toBe('number')
        expect(typeof mentor.is_available).toBe('boolean')
        expect(Array.isArray(mentor.availability)).toBe(true)
        expect(mentor.created_at).toBeDefined()
      }
    })

    it('should have valid availability format', async () => {
      const mentors = await mentorService.getMentors()

      for (const mentor of mentors) {
        for (const slot of mentor.availability) {
          expect(slot.day).toBeDefined()
          expect(slot.start_time).toMatch(/^\d{2}:\d{2}$/)
          expect(slot.end_time).toMatch(/^\d{2}:\d{2}$/)
          expect(slot.start_time).not.toBe(slot.end_time)
        }
      }
    })

    it('should return mentor availability slots', async () => {
      const availability = await mentorService.getAvailability('mentor-1')
      expect(Array.isArray(availability)).toBe(true)
      expect(availability.length).toBeGreaterThan(0)
    })

    it('should cancel an existing mentorship session', async () => {
      const session = await mentorService.bookSession('user-cancel-test', {
        mentor_id: 'mentor-1',
        scheduled_at: new Date().toISOString(),
        duration_minutes: 45,
        topic: 'System Architecture',
      })
      const cancelled = await mentorService.cancelSession(session.id, 'user-cancel-test', 'Personal emergency')
      expect(cancelled.status).toBe('cancelled')
      expect(cancelled.notes).toContain('Personal emergency')
    })
  })
})