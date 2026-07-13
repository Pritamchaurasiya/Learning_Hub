import { GrowthEngineService } from '../../services/GrowthEngineService'
import { prisma } from '../../prismaClient'

jest.mock('../../utils/logger', () => ({
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn((msg, err) => console.error('TEST LOGGER ERROR:', msg, err)),
}))

jest.mock('../../prismaClient', () => ({
  prisma: {
    user: {
      findUnique: jest.fn(),
      update: jest.fn(),
      updateMany: jest.fn(),
    },
    userAchievement: {
      findMany: jest.fn(),
      create: jest.fn(),
    },
    testResult: {
      count: jest.fn(),
    },
    topicPerformance: {
      count: jest.fn(),
    },
    dailyGoal: {
      findUnique: jest.fn(),
      update: jest.fn(),
      create: jest.fn(),
    },
    userExamPreference: {
      findUnique: jest.fn(),
    },
    $transaction: jest.fn().mockImplementation(callback => {
      if (typeof callback === 'function') {
        return callback(prisma)
      }
      return Promise.all(callback) // in case it's an array of queries
    }),
    $queryRaw: jest.fn(),
  },
}))

describe('GrowthEngineService', () => {
  let growthService: GrowthEngineService

  beforeEach(() => {
    growthService = new GrowthEngineService()
    jest.clearAllMocks()
  })

  describe('awardXP', () => {
    it('should award XP and handle level up correctly', async () => {
      // Arrange
      ;(prisma.user.findUnique as jest.Mock).mockResolvedValue({
        xp: 90,
        level: 1,
      })
      ;(prisma.user.update as jest.Mock).mockResolvedValue({})

      // Act
      const result = await growthService.awardXP('user-1', 'test_completed', prisma) // bypass $transaction

      // Assert
      expect(result).toBeDefined()
      expect(result?.xpAwarded).toBe(10)
      expect(result?.totalXP).toBe(100) // 90 + 10 = 100 -> Level 1
      expect(result?.leveledUp).toBe(false)
      expect(prisma.user.update).toHaveBeenCalledWith({
        where: { id: 'user-1' },
        data: { xp: 100, level: 1 },
      })
    })

    it('should trigger level up when crossing XP threshold', async () => {
      // Arrange
      ;(prisma.user.findUnique as jest.Mock).mockResolvedValue({
        xp: 390,
        level: 1,
      })
      ;(prisma.user.update as jest.Mock).mockResolvedValue({})

      // Act
      const result = await growthService.awardXP('user-1', 'test_passed', prisma) // bypass $transaction

      // Assert
      expect(result?.totalXP).toBe(415) // 390 + 25 = 415 -> Level 2
      expect(result?.leveledUp).toBe(true)
      expect(result?.previousLevel).toBe(1)
      expect(result?.newLevel).toBe(2)
      expect(prisma.user.update).toHaveBeenCalledWith({
        where: { id: 'user-1' },
        data: { xp: 415, level: 2 },
      })
    })

    it('should return null for invalid reason', async () => {
      const result = await growthService.awardXP('user-1', 'invalid_reason' as any)
      expect(result).toBeNull()
    })
  })

  describe('checkAndUpdateStreak', () => {
    const mockDate = new Date('2023-10-15T12:00:00Z')

    beforeAll(() => {
      jest.useFakeTimers()
      jest.setSystemTime(mockDate)
    })

    afterAll(() => {
      jest.useRealTimers()
    })

    it('should maintain streak if already active today', async () => {
      // Arrange
      ;(prisma.user.findUnique as jest.Mock).mockResolvedValue({
        streak: 5,
        longestStreak: 5,
        lastActive: mockDate,
      })
      ;(prisma.user.updateMany as jest.Mock).mockResolvedValue({ count: 1 })

      // Act
      const result = await growthService.checkAndUpdateStreak('user-1')

      // Assert
      expect(result.streakMaintained).toBe(true)
      expect(result.streakBroken).toBe(false)
      expect(result.currentStreak).toBe(5)
    })

    it('should increment streak if last active was yesterday', async () => {
      // Arrange
      const yesterday = new Date(mockDate)
      yesterday.setDate(yesterday.getDate() - 1)

      ;(prisma.user.findUnique as jest.Mock).mockResolvedValue({
        streak: 5,
        longestStreak: 5,
        lastActive: yesterday,
      })
      ;(prisma.user.updateMany as jest.Mock).mockResolvedValue({ count: 1 })

      // Act
      const result = await growthService.checkAndUpdateStreak('user-1')

      // Assert
      expect(result.streakMaintained).toBe(true)
      expect(result.streakBroken).toBe(false)
      expect(result.currentStreak).toBe(6)
      expect(result.longestStreak).toBe(6)
    })

    it('should break streak and reset to 1 if last active was before yesterday', async () => {
      // Arrange
      const twoDaysAgo = new Date(mockDate)
      twoDaysAgo.setDate(twoDaysAgo.getDate() - 2)

      ;(prisma.user.findUnique as jest.Mock).mockResolvedValue({
        streak: 5,
        longestStreak: 10,
        lastActive: twoDaysAgo,
      })
      ;(prisma.user.updateMany as jest.Mock).mockResolvedValue({ count: 1 })

      // Act
      const result = await growthService.checkAndUpdateStreak('user-1')

      // Assert
      expect(result.streakMaintained).toBe(false)
      expect(result.streakBroken).toBe(true)
      expect(result.currentStreak).toBe(1)
      expect(result.longestStreak).toBe(10) // Longest streak untouched
    })
  })

  describe('checkAchievements', () => {
    it('should unlock new achievement if condition is met', async () => {
      // Arrange
      ;(prisma.user.findUnique as jest.Mock).mockResolvedValue({
        xp: 100,
        level: 1,
        streak: 0,
        longestStreak: 0,
      })
      ;(prisma.testResult.count as jest.Mock).mockResolvedValue(1) // totalTestsCompleted = 1
      ;(prisma.$queryRaw as jest.Mock).mockResolvedValue([
        { totalQuestions: BigInt(10), totalCorrect: BigInt(5) },
      ])
      ;(prisma.topicPerformance.count as jest.Mock).mockResolvedValue(0)

      // User has no achievements yet
      ;(prisma.userAchievement.findMany as jest.Mock).mockResolvedValue([])
      ;(prisma.userAchievement.create as jest.Mock).mockResolvedValue({})

      // Act
      const unlocked = await growthService.checkAchievements('user-1')

      // Assert
      expect(unlocked.length).toBeGreaterThan(0)
      expect(unlocked.some(a => a.id === 'first_test')).toBe(true)
      expect(prisma.userAchievement.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            userId: 'user-1',
            achievementId: 'first_test',
          }),
        })
      )
    })

    it('should not unlock already unlocked achievements', async () => {
      // Arrange
      ;(prisma.user.findUnique as jest.Mock).mockResolvedValue({
        xp: 100,
        level: 1,
        streak: 0,
        longestStreak: 0,
      })
      ;(prisma.testResult.count as jest.Mock).mockResolvedValue(1)
      ;(prisma.$queryRaw as jest.Mock).mockResolvedValue([
        { totalQuestions: BigInt(10), totalCorrect: BigInt(5) },
      ])
      ;(prisma.topicPerformance.count as jest.Mock).mockResolvedValue(0)

      // User already has ALL achievements (hack: make condition return false for everything to avoid guessing names)
      // Actually, better: we just say they have everything.
      // Or we just mock userAchievement.findMany to return an ID for every possible achievement.
      const mockExisting = [
        'first_test',
        'ten_tests',
        'fifty_tests',
        'hundred_tests',
        'first_perfect',
        'streak_7',
        'streak_30',
        'streak_100',
        'speed_demon',
        'master_of_one',
        'persistence',
        'accuracy_king',
        'century_club',
      ].map(id => ({ achievementId: id }))

      ;(prisma.userAchievement.findMany as jest.Mock).mockResolvedValue(mockExisting)

      // Act
      const unlocked = await growthService.checkAchievements('user-1')

      // Assert
      expect(unlocked.length).toBe(0) // None unlocked
    })
  })
})
