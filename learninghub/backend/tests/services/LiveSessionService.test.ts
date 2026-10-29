/**
 * LiveSessionService — Unit Tests
 * Tests the live session features: sessions, registration, joining
 */
import { liveSessionService } from '../../src/services/LiveSessionService'

describe('LiveSessionService', () => {
  describe('getAllSessions', () => {
    it('should return all sessions when no status filter', async () => {
      const sessions = await liveSessionService.getAllSessions()

      expect(Array.isArray(sessions)).toBe(true)
      expect(sessions.length).toBe(4) // 4 mock sessions
    })

    it('should filter by status', async () => {
      const upcoming = await liveSessionService.getAllSessions('upcoming')
      const live = await liveSessionService.getAllSessions('live')
      const completed = await liveSessionService.getAllSessions('completed')

      expect(upcoming.every(s => s.status === 'upcoming')).toBe(true)
      expect(live.every(s => s.status === 'live')).toBe(true)
      expect(completed.every(s => s.status === 'completed')).toBe(true)

      expect(upcoming.length + live.length + completed.length).toBe(4)
    })

    it('should return empty array for unknown status', async () => {
      const sessions = await liveSessionService.getAllSessions('unknown')
      expect(sessions).toEqual([])
    })
  })

  describe('getSessionById', () => {
    it('should return session for valid ID', async () => {
      const session = await liveSessionService.getSessionById('live-101')

      expect(session).toBeDefined()
      expect(session?.id).toBe('live-101')
      expect(session?.title).toContain('Graph Theory')
      expect(session?.instructorName).toContain('Arjun Rao')
    })

    it('should return null for non-existent ID', async () => {
      const session = await liveSessionService.getSessionById('non-existent')
      expect(session).toBeNull()
    })
  })

  describe('joinSession', () => {
    it('should join session and increment participants', async () => {
      const initialSession = await liveSessionService.getSessionById('live-101')
      const initialParticipants = initialSession?.currentParticipants || 0

      const result = await liveSessionService.joinSession('live-101', 'usr-1')

      expect(result.success).toBe(true)
      expect(result.session.id).toBe('live-101')
      expect(result.session.currentParticipants).toBe(initialParticipants + 1)
      expect(result.token).toMatch(/^rtc-token-live-101-usr-1-\d+$/)
    })

    it('should not exceed max participants', async () => {
      // Join multiple times to test cap
      const session = await liveSessionService.getSessionById('live-101')
      const max = session?.maxParticipants || 300

      for (let i = 0; i < max + 10; i++) {
        await liveSessionService.joinSession('live-101', `usr-${i}`)
      }

      const finalSession = await liveSessionService.getSessionById('live-101')
      expect(finalSession?.currentParticipants).toBe(max)
    })

    it('should throw for non-existent session', async () => {
      await expect(liveSessionService.joinSession('non-existent', 'usr-1'))
        .rejects.toThrow('Session not found')
    })
  })

  describe('registerSession', () => {
    it('should register user and increment participants', async () => {
      const initialSession = await liveSessionService.getSessionById('live-102')
      const initialParticipants = initialSession?.currentParticipants || 0

      const result = await liveSessionService.registerSession('live-102', 'usr-1')

      expect(result.success).toBe(true)
      expect(result.registered).toBe(true)
      expect(result.session.id).toBe('live-102')
      expect(result.session.currentParticipants).toBe(initialParticipants + 1)
    })

    it('should not exceed max participants', async () => {
      const session = await liveSessionService.getSessionById('live-102')
      const max = session?.maxParticipants || 500

      for (let i = 0; i < max + 10; i++) {
        await liveSessionService.registerSession('live-102', `usr-${i}`)
      }

      const finalSession = await liveSessionService.getSessionById('live-102')
      expect(finalSession?.currentParticipants).toBe(max)
    })

    it('should throw for non-existent session', async () => {
      await expect(liveSessionService.registerSession('non-existent', 'usr-1'))
        .rejects.toThrow('Session not found')
    })
  })

  describe('Session data integrity', () => {
    it('should have valid session data', async () => {
      const sessions = await liveSessionService.getAllSessions()

      for (const session of sessions) {
        expect(session.id).toBeDefined()
        expect(session.title).toBeDefined()
        expect(session.instructorName).toBeDefined()
        expect(session.scheduledAt).toBeDefined()
        expect(typeof session.durationMinutes).toBe('number')
        expect(['upcoming', 'live', 'completed']).toContain(session.status)
        expect(typeof session.maxParticipants).toBe('number')
        expect(typeof session.currentParticipants).toBe('number')
        expect(session.currentParticipants).toBeLessThanOrEqual(session.maxParticipants)
      }
    })

    it('should have correct status timestamps', async () => {
      const sessions = await liveSessionService.getAllSessions()

      for (const session of sessions) {
        const scheduled = new Date(session.scheduledAt).getTime()
        const now = Date.now()

        if (session.status === 'completed') {
          expect(scheduled).toBeLessThan(now)
        } else if (session.status === 'live') {
          // Live sessions should be scheduled around now (within reasonable window)
          expect(Math.abs(scheduled - now)).toBeLessThan(86400000 * 2) // 2 days
        }
      }
    })
  })
})