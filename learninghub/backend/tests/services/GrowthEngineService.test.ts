import { GrowthEngineService } from '../../src/services/GrowthEngineService'
import { prisma } from '../../src/prismaClient'

jest.mock('../../src/prismaClient', () => {
  const mockClient = {
    user: {
      findUnique: jest.fn(),
      update: jest.fn(),
      updateMany: jest.fn(),
    },
    userAchievement: {
      findMany: jest.fn(),
      create: jest.fn(),
    },
    dailyGoal: {
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    },
    userExamPreference: {
      findUnique: jest.fn(),
    },
    testResult: {
      findMany: jest.fn(),
      count: jest.fn(),
    },
    topicPerformance: {
      findMany: jest.fn(),
      count: jest.fn(),
    },
    $queryRaw: jest.fn(),
    $transaction: jest.fn(),
  }
  mockClient.$transaction.mockImplementation(async (cb: unknown) => {
    if (typeof cb === 'function') {
      return await cb(mockClient)
    }
    if (Array.isArray(cb)) {
      return await Promise.all(cb)
    }
    return undefined
  })
  return { prisma: mockClient }
})

jest.mock('../../src/utils/logger', () => {
  const mockLogger = {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    debug: jest.fn(),
  }
  return { ...mockLogger, default: mockLogger }
})

describe('GrowthEngineService Suite', () => {
  let service: GrowthEngineService

  beforeEach(() => {
    jest.clearAllMocks()
    ;(prisma.$transaction as jest.Mock).mockImplementation(async (cb: unknown) => {
      if (typeof cb === 'function') {
        return await cb(prisma)
      }
      if (Array.isArray(cb)) {
        return await Promise.all(cb)
      }
      return undefined
    })
    ;(prisma.user.updateMany as jest.Mock).mockResolvedValue({ count: 1 })
    ;(prisma.$queryRaw as jest.Mock).mockResolvedValue([{ totalQuestions: 0, totalCorrect: 0 }])
    ;(prisma.testResult.count as jest.Mock).mockResolvedValue(1)
    ;(prisma.topicPerformance.count as jest.Mock).mockResolvedValue(0)
    service = new GrowthEngineService()
  })

  describe('awardXP', () => {
    it('should return null for invalid XP reason', async () => {
      // @ts-expect-error Testing invalid reason
      const result = await service.awardXP('user-1', 'invalid_reason')
      expect(result).toBeNull()
    })

    it('should return null when user is not found', async () => {
      ;(prisma.user.update as jest.Mock).mockResolvedValue(null)
      const result = await service.awardXP('user-1', 'test_completed')
      expect(result).toBeNull()
    })

    it('should award XP and stay at same level when under threshold', async () => {
      // test_completed = 10 XP -> atomic increment from 150 -> 160 -> Level 1
      ;(prisma.user.update as jest.Mock)
        .mockResolvedValueOnce({ xp: 160, level: 1 })

      const result = await service.awardXP('user-1', 'test_completed')

      expect(result).toEqual({
        xpAwarded: 10,
        totalXP: 160,
        previousLevel: 1,
        newLevel: 1,
        leveledUp: false,
        nextLevelXP: 400, // Level 2 is 2*2*100 = 400
        progressToNextLevel: 20, // (160 - 100) / (400 - 100) = 60 / 300 = 20%
      })
      expect(prisma.user.update).toHaveBeenNthCalledWith(1, {
        where: { id: 'user-1' },
        data: { xp: { increment: 10 } },
        select: { xp: true, level: true },
      })
      // No level update when not leveled up
      expect(prisma.user.update).toHaveBeenCalledTimes(1)
    })

    it('should award XP and trigger levelUp when crossing threshold', async () => {
      // perfect_score = 50 XP -> atomic increment from 380 -> 430 -> Level 2
      ;(prisma.user.update as jest.Mock)
        .mockResolvedValueOnce({ xp: 430, level: 1 })

      const result = await service.awardXP('user-1', 'perfect_score')

      expect(result?.leveledUp).toBe(true)
      expect(result?.newLevel).toBe(2)
      expect(result?.previousLevel).toBe(1)
      expect(prisma.user.update).toHaveBeenNthCalledWith(1, {
        where: { id: 'user-1' },
        data: { xp: { increment: 50 } },
        select: { xp: true, level: true },
      })
      // Second call updates level
      expect(prisma.user.update).toHaveBeenNthCalledWith(2, {
        where: { id: 'user-1' },
        data: { level: 2 },
      })
    })

    it('should work when passing a custom transaction client (txParam)', async () => {
      const mockTx = {
        user: {
          update: jest.fn().mockResolvedValue({ xp: 125, level: 1 }),
        },
      }

      const result = await service.awardXP('user-1', 'test_passed', mockTx)
      expect(result?.totalXP).toBe(125)
      expect(mockTx.user.update).toHaveBeenNthCalledWith(1, {
        where: { id: 'user-1' },
        data: { xp: { increment: 25 } },
        select: { xp: true, level: true },
      })
    })
  })

  describe('checkAndUpdateStreak', () => {
    it('should maintain streak when lastActive was earlier today', async () => {
      const now = new Date()
      ;(prisma.user.findUnique as jest.Mock).mockResolvedValue({
        streak: 5,
        longestStreak: 10,
        lastActive: now,
      })
      ;(prisma.user.update as jest.Mock).mockResolvedValue({})

      const result = await service.checkAndUpdateStreak('user-1')

      expect(result.currentStreak).toBe(5)
      expect(result.streakMaintained).toBe(true)
      expect(result.streakBroken).toBe(false)
    })

    it('should increment streak when lastActive was yesterday and hit milestone', async () => {
      const yesterday = new Date()
      yesterday.setDate(yesterday.getDate() - 1)

      ;(prisma.user.findUnique as jest.Mock)
        .mockResolvedValueOnce({
          streak: 6,
          longestStreak: 6,
          lastActive: yesterday,
        })
      ;(prisma.user.update as jest.Mock).mockResolvedValue({
        xp: 200,
        level: 1,
      })

      const result = await service.checkAndUpdateStreak('user-1')

      expect(result.currentStreak).toBe(7)
      expect(result.milestoneReached).toBe(7)
      expect(result.longestStreak).toBe(7)
    })

    it('should reset streak to 1 when there was a gap in activity', async () => {
      const threeDaysAgo = new Date()
      threeDaysAgo.setDate(threeDaysAgo.getDate() - 3)

      ;(prisma.user.findUnique as jest.Mock).mockResolvedValue({
        streak: 15,
        longestStreak: 15,
        lastActive: threeDaysAgo,
      })
      ;(prisma.user.update as jest.Mock).mockResolvedValue({})

      const result = await service.checkAndUpdateStreak('user-1')

      expect(result.currentStreak).toBe(1)
      expect(result.streakBroken).toBe(true)
      expect(result.longestStreak).toBe(15)
    })

    it('should handle null lastActive without throwing', async () => {
      ;(prisma.user.findUnique as jest.Mock).mockResolvedValue({
        streak: 0,
        longestStreak: 0,
        lastActive: null,
      })
      ;(prisma.user.update as jest.Mock).mockResolvedValue({})

      const result = await service.checkAndUpdateStreak('user-1')

      expect(result.currentStreak).toBe(1)
      expect(result.streakBroken).toBe(false)
    })
  })

  describe('checkAchievements', () => {
    it('should unlock new achievements when conditions are met and ignore already unlocked', async () => {
      ;(prisma.user.findUnique as jest.Mock).mockResolvedValue({
        xp: 500,
        level: 2,
        streak: 7,
        longestStreak: 7,
      })
      ;(prisma.testResult.findMany as jest.Mock).mockResolvedValue([
        {
          passed: true,
          percentage: 100,
          attemptAnswers: [{ isCorrect: true }, { isCorrect: true }],
        },
      ])
      ;(prisma.topicPerformance.findMany as jest.Mock).mockResolvedValue([])
      ;(prisma.userAchievement.findMany as jest.Mock).mockResolvedValue([
        { achievementId: 'first_test' }, // Already unlocked
      ])
      ;(prisma.userAchievement.create as jest.Mock).mockResolvedValue({})

      const unlocked = await service.checkAchievements('user-1')

      const unlockedIds = unlocked.map(u => u.id)
      expect(unlockedIds).not.toContain('first_test') // Because it was in existing
      expect(unlockedIds).toContain('first_perfect') // Because percentage >= 100
      expect(unlockedIds).toContain('streak_7') // Because longestStreak >= 7
    })

    it('should catch race condition unique constraint errors without throwing', async () => {
      ;(prisma.user.findUnique as jest.Mock).mockResolvedValue({
        xp: 100,
        level: 1,
        streak: 1,
        longestStreak: 1,
      })
      ;(prisma.testResult.findMany as jest.Mock).mockResolvedValue([
        { passed: true, percentage: 80, attemptAnswers: [{ isCorrect: true }] },
      ])
      ;(prisma.topicPerformance.findMany as jest.Mock).mockResolvedValue([])
      ;(prisma.userAchievement.findMany as jest.Mock).mockResolvedValue([])
      ;(prisma.userAchievement.create as jest.Mock).mockRejectedValue(
        new Error('Unique constraint failed on the fields')
      )

      const unlocked = await service.checkAchievements('user-1')
      expect(unlocked).toHaveLength(0)
    })
  })

  describe('getLevelProgress', () => {
    it('should return level, currentXP, xpForCurrentLevel, xpForNextLevel, and progressPercent', async () => {
      ;(prisma.user.findUnique as jest.Mock).mockResolvedValue({
        xp: 250,
        level: 1, // Level 1 is 100 XP, Level 2 is 400 XP
      })

      const progress = await service.getLevelProgress('user-1')

      expect(progress).toEqual({
        level: 1,
        currentXP: 250,
        xpForCurrentLevel: 100,
        xpForNextLevel: 400,
        progressPercent: 50, // (250 - 100) / (400 - 100) = 150 / 300 = 50%
        xpNeeded: 150,
      })
    })

    it('should throw error when user is not found', async () => {
      ;(prisma.user.findUnique as jest.Mock).mockResolvedValue(null)
      await expect(service.getLevelProgress('user-1')).rejects.toThrow('User not found')
    })
  })

  describe('updateDailyGoal', () => {
    it('should create today daily goal and award XP if target met', async () => {
      ;(prisma.dailyGoal.findUnique as jest.Mock).mockResolvedValue(null)
      ;(prisma.userExamPreference.findUnique as jest.Mock).mockResolvedValue({ dailyGoal: 10 }) // 10 questions = 30 mins
      ;(prisma.dailyGoal.create as jest.Mock).mockResolvedValue({})
      ;(prisma.user.findUnique as jest.Mock).mockResolvedValue({ xp: 100, level: 1 })
      ;(prisma.user.update as jest.Mock).mockResolvedValue({})

      const result = await service.updateDailyGoal('user-1', 30)

      expect(result.completed).toBe(true)
      expect(result.targetMinutes).toBe(30)
      expect(prisma.dailyGoal.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          userId: 'user-1',
          targetMinutes: 30,
          completedMinutes: 30,
          completed: true,
        }),
      })
    })

    it('should update existing goal and award XP only when transitioning from incomplete to complete', async () => {
      ;(prisma.dailyGoal.findUnique as jest.Mock).mockResolvedValue({
        id: 'goal-1',
        targetMinutes: 30,
        completedMinutes: 20,
        completed: false,
      })
      ;(prisma.dailyGoal.update as jest.Mock).mockResolvedValue({})
      ;(prisma.user.findUnique as jest.Mock).mockResolvedValue({ xp: 100, level: 1 })
      ;(prisma.user.update as jest.Mock).mockResolvedValue({})

      // Add 15 mins -> total 35 mins >= 30 mins -> complete!
      const result = await service.updateDailyGoal('user-1', 15)

      expect(result.completed).toBe(true)
      expect(result.completedMinutes).toBe(35)
      expect(prisma.dailyGoal.update).toHaveBeenCalledWith({
        where: { id: 'goal-1' },
        data: {
          completedMinutes: 35,
          completed: true,
        },
      })
    })
  })
})
