import { domainEvents } from '../../services/DomainEventBus'
import { cacheService } from '../../services/CacheService'

jest.mock('../../services/CacheService', () => ({
  cacheService: {
    xAdd: jest.fn().mockResolvedValue('1761800000000-0'),
    xRead: jest.fn().mockResolvedValue([]),
    isAvailable: jest.fn().mockReturnValue(true),
  },
}))

describe('DomainEventBus (Milestone 34 Redis Streams Distributed Event Bus)', () => {
  beforeEach(() => {
    domainEvents.removeAll()
    jest.clearAllMocks()
  })

  it('registers typed listener and delivers event payload', async () => {
    const handler = jest.fn()
    domainEvents.on('TEST_COMPLETED', handler)

    const payload = {
      userId: 'u-1',
      testId: 't-1',
      attemptId: 'att-1',
      score: 95,
      percentage: 95,
      passed: true,
      timeTaken: 1200,
    }

    await domainEvents.emit('TEST_COMPLETED', payload)

    expect(handler).toHaveBeenCalledTimes(1)
    expect(handler).toHaveBeenCalledWith(payload)
  })

  it('delivers psychometric CAT_ITEM_ANSWERED and CAT_SESSION_COMPLETED events', async () => {
    const itemHandler = jest.fn()
    const sessionHandler = jest.fn()

    domainEvents.on('CAT_ITEM_ANSWERED', itemHandler)
    domainEvents.on('CAT_SESSION_COMPLETED', sessionHandler)

    const itemPayload = {
      sessionId: 'cat-sess-1',
      userId: 'u-cat-1',
      itemId: 'phy-01',
      isCorrect: true,
      confidence: 'HIGH' as const,
      cbmScore: 3,
      thetaAfter: 0.85,
      semAfter: 0.45,
      timeSpentSeconds: 40,
    }

    const sessionPayload = {
      sessionId: 'cat-sess-1',
      userId: 'u-cat-1',
      subject: 'Physics',
      examSlug: 'jee-main',
      finalTheta: 1.45,
      finalSem: 0.28,
      abilityBand: 'ADVANCED',
      stoppingReason: 'SEM_CONVERGENCE',
      totalQuestions: 12,
    }

    await domainEvents.emit('CAT_ITEM_ANSWERED', itemPayload)
    await domainEvents.emit('CAT_SESSION_COMPLETED', sessionPayload)

    expect(itemHandler).toHaveBeenCalledWith(itemPayload)
    expect(sessionHandler).toHaveBeenCalledWith(sessionPayload)
  })

  it('delivers contest registration and proctor alert events', async () => {
    const contestHandler = jest.fn()
    const proctorHandler = jest.fn()

    domainEvents.on('CONTEST_REGISTERED', contestHandler)
    domainEvents.on('PROCTOR_ALERT_TRIGGERED', proctorHandler)

    await domainEvents.emit('CONTEST_REGISTERED', {
      contestId: 'c-weekly-1',
      userId: 'u-proctor-1',
      registeredAt: new Date().toISOString(),
    })

    await domainEvents.emit('PROCTOR_ALERT_TRIGGERED', {
      contestId: 'c-weekly-1',
      userId: 'u-proctor-1',
      eventType: 'TAB_BLUR',
      metadata: { durationSec: 4 },
      timestamp: new Date().toISOString(),
    })

    expect(contestHandler).toHaveBeenCalledTimes(1)
    expect(proctorHandler).toHaveBeenCalledTimes(1)
  })

  it('isolates handler exceptions without throwing or breaking subsequent handlers', async () => {
    const failingHandler = jest.fn().mockRejectedValue(new Error('Handler crashed unexpectedly'))
    const healthyHandler = jest.fn()

    domainEvents.on('LEVEL_UP', failingHandler)
    domainEvents.on('LEVEL_UP', healthyHandler)

    await expect(
      domainEvents.emit('LEVEL_UP', {
        userId: 'u-1',
        previousLevel: 2,
        newLevel: 3,
        totalXP: 1500,
      })
    ).resolves.not.toThrow()

    expect(failingHandler).toHaveBeenCalledTimes(1)
    expect(healthyHandler).toHaveBeenCalledTimes(1)
  })

  it('streams emitted events to Redis Streams via cacheService.xAdd', async () => {
    await domainEvents.emit('USER_REGISTERED', {
      userId: 'u-new-student',
      email: 'student@example.com',
    })

    expect(cacheService.xAdd).toHaveBeenCalledWith(
      'domain:events:stream',
      expect.objectContaining({
        event: 'USER_REGISTERED',
        payload: JSON.stringify({
          userId: 'u-new-student',
          email: 'student@example.com',
        }),
        timestamp: expect.any(String),
      })
    )
  })

  it('notifies wildcard onAny listener for all event types', async () => {
    const wildcard = jest.fn()
    domainEvents.onAny(wildcard)

    await domainEvents.emit('PASSWORD_CHANGED', { userId: 'u-audit-9' })

    expect(wildcard).toHaveBeenCalledWith('PASSWORD_CHANGED', { userId: 'u-audit-9' })
  })

  it('maintains bounded in-memory audit log accessible via getInMemoryAuditLog', async () => {
    await domainEvents.emit('ACHIEVEMENT_UNLOCKED', {
      userId: 'u-1',
      achievementId: 'ach-first-test',
      achievementName: 'Pioneer',
      xpAwarded: 50,
    })

    const auditLog = domainEvents.getInMemoryAuditLog()
    expect(auditLog.length).toBe(1)
    expect(auditLog[0].event).toBe('ACHIEVEMENT_UNLOCKED')
    expect(auditLog[0].data).toEqual(
      expect.objectContaining({
        achievementId: 'ach-first-test',
        xpAwarded: 50,
      })
    )
  })

  it('deregisters handlers cleanly with off and clears audit with removeAll', async () => {
    const handler = jest.fn()
    domainEvents.on('STREAK_MILESTONE', handler)
    domainEvents.off('STREAK_MILESTONE')

    await domainEvents.emit('STREAK_MILESTONE', { userId: 'u-1', streakDays: 7 })
    expect(handler).not.toHaveBeenCalled()

    domainEvents.removeAll()
    expect(domainEvents.getInMemoryAuditLog()).toHaveLength(0)
  })
})

