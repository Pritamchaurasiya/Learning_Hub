import { realtimeEventBridge } from '../../services/RealtimeEventBridge'
import { domainEvents } from '../../services/DomainEventBus'
import { webSocketService } from '../../services/WebSocketService'

jest.mock('../../services/WebSocketService', () => ({
  webSocketService: {
    broadcastToRoom: jest.fn(),
    broadcastAdmin: jest.fn(),
    notifyUser: jest.fn(),
    broadcast: jest.fn(),
  },
}))

describe('RealtimeEventBridge (Milestone 35 WebSocket Event Streaming Bridge)', () => {
  beforeAll(() => {
    realtimeEventBridge.init()
  })

  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('marks bridge as initialized', () => {
    expect(realtimeEventBridge.isInitialized()).toBe(true)
  })

  it('broadcasts to contest room when CONTEST_REGISTERED event is emitted', async () => {
    await domainEvents.emit('CONTEST_REGISTERED', {
      contestId: 'contest-grand-1',
      userId: 'student-99',
      registeredAt: '2026-10-30T10:00:00Z',
    })

    expect(webSocketService.broadcastToRoom).toHaveBeenCalledWith(
      'contest-contest-grand-1',
      'contest-participant-joined',
      {
        contestId: 'contest-grand-1',
        userId: 'student-99',
        timestamp: '2026-10-30T10:00:00Z',
      }
    )
  })

  it('broadcasts to admin and contest room when PROCTOR_ALERT_TRIGGERED is emitted', async () => {
    const alertData = {
      contestId: 'contest-grand-1',
      userId: 'student-cheat-1',
      eventType: 'MULTIPLE_FACES_DETECTED',
      metadata: { faceCount: 2 },
      timestamp: '2026-10-30T10:05:00Z',
    }

    await domainEvents.emit('PROCTOR_ALERT_TRIGGERED', alertData)

    expect(webSocketService.broadcastAdmin).toHaveBeenCalledWith('proctor-alert', alertData)
    expect(webSocketService.broadcastToRoom).toHaveBeenCalledWith(
      'contest-contest-grand-1',
      'proctor-violation-logged',
      {
        contestId: 'contest-grand-1',
        userId: 'student-cheat-1',
        eventType: 'MULTIPLE_FACES_DETECTED',
        timestamp: '2026-10-30T10:05:00Z',
      }
    )
  })

  it('notifies specific user when CAT_SESSION_COMPLETED is emitted', async () => {
    await domainEvents.emit('CAT_SESSION_COMPLETED', {
      sessionId: 'cat-session-42',
      userId: 'student-cat-1',
      subject: 'Physics',
      examSlug: 'jee-main',
      finalTheta: 1.85,
      finalSem: 0.22,
      abilityBand: 'MASTER',
      stoppingReason: 'SEM_CONVERGENCE',
      totalQuestions: 15,
    })

    expect(webSocketService.notifyUser).toHaveBeenCalledWith(
      'student-cat-1',
      'cat-scorecard-ready',
      {
        sessionId: 'cat-session-42',
        subject: 'Physics',
        examSlug: 'jee-main',
        finalTheta: 1.85,
        abilityBand: 'MASTER',
      }
    )
  })

  it('notifies specific user when ACHIEVEMENT_UNLOCKED is emitted', async () => {
    await domainEvents.emit('ACHIEVEMENT_UNLOCKED', {
      userId: 'student-achiever-1',
      achievementId: 'ach-speed-demon',
      achievementName: 'Speed Demon',
      xpAwarded: 100,
    })

    expect(webSocketService.notifyUser).toHaveBeenCalledWith(
      'student-achiever-1',
      'achievement-unlocked',
      {
        achievementId: 'ach-speed-demon',
        name: 'Speed Demon',
        xpAwarded: 100,
      }
    )
  })

  it('notifies specific user when LEVEL_UP is emitted', async () => {
    await domainEvents.emit('LEVEL_UP', {
      userId: 'student-gamer-1',
      previousLevel: 4,
      newLevel: 5,
      totalXP: 5000,
    })

    expect(webSocketService.notifyUser).toHaveBeenCalledWith(
      'student-gamer-1',
      'user-level-up',
      {
        previousLevel: 4,
        newLevel: 5,
        totalXP: 5000,
      }
    )
  })
})

