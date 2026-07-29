import { SpacedRepetitionEngine } from '../../src/engines/learning/SpacedRepetitionEngine'
import { prisma } from '../../src/prismaClient'

const mockPrisma = prisma as any

jest.mock('../../src/utils/logger', () => {
  const mockLogger = {
    warn: jest.fn(),
    error: jest.fn(),
    info: jest.fn(),
    debug: jest.fn(),
  }
  return {
    ...mockLogger,
    default: mockLogger,
  }
})

describe('SpacedRepetitionEngine Suite', () => {
  let engine: SpacedRepetitionEngine

  beforeEach(() => {
    engine = new SpacedRepetitionEngine()
    jest.clearAllMocks()
  })

  describe('calculateSM2', () => {
    it('should initialize first review with interval 1 for quality >= 3', () => {
      const result = engine.calculateSM2(4, 0, 2.5, 0)
      expect(result.intervalDays).toBe(1)
      expect(result.repetitions).toBe(1)
      expect(result.easeFactor).toBeGreaterThanOrEqual(2.5)
    })

    it('should set second review interval to 6 for repetitions = 1', () => {
      const result = engine.calculateSM2(5, 1, 2.5, 1)
      expect(result.intervalDays).toBe(6)
      expect(result.repetitions).toBe(2)
    })

    it('should multiply previous interval by easeFactor for repetitions > 1', () => {
      const result = engine.calculateSM2(4, 6, 2.5, 2)
      expect(result.intervalDays).toBe(Math.round(6 * result.easeFactor))
      expect(result.repetitions).toBe(3)
    })

    it('should reset repetitions to 0 and set interval to 1 on failure (quality < 3)', () => {
      const result = engine.calculateSM2(1, 10, 2.5, 3)
      expect(result.intervalDays).toBe(1)
      expect(result.repetitions).toBe(0)
    })

    it('should clamp easeFactor to minimum 1.3', () => {
      let ease = 2.5
      for (let i = 0; i < 10; i++) {
        const res = engine.calculateSM2(0, 1, ease, 0)
        ease = res.easeFactor
      }
      expect(ease).toBe(1.3)
    })
  })

  describe('updateTopicSchedule', () => {
    it('should create a new spaced repetition schedule if none exists', async () => {
      ;(mockPrisma.spacedRepetitionSchedule.findUnique as jest.Mock).mockResolvedValue(null)
      ;(mockPrisma.spacedRepetitionSchedule.create as jest.Mock).mockResolvedValue({
        id: 'sched-1',
        userId: 'user-1',
        topicId: 'topic-1',
        intervalDays: 1,
        easeFactor: 2.5,
        repetitions: 1,
      })

      await engine.updateTopicSchedule('user-1', 'topic-1', 0.8) // 0.8 * 5 = quality 4

      expect(mockPrisma.spacedRepetitionSchedule.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          userId: 'user-1',
          topicId: 'topic-1',
          intervalDays: 1,
          repetitions: 1,
        }),
      })
    })

    it('should update existing schedule when one exists', async () => {
      ;(mockPrisma.spacedRepetitionSchedule.findUnique as jest.Mock).mockResolvedValue({
        id: 'sched-1',
        userId: 'user-1',
        topicId: 'topic-1',
        intervalDays: 1,
        easeFactor: 2.5,
        repetitions: 1,
        lapses: 0,
      })
      ;(mockPrisma.spacedRepetitionSchedule.update as jest.Mock).mockResolvedValue({})

      await engine.updateTopicSchedule('user-1', 'topic-1', 1.0) // quality 5

      expect(mockPrisma.spacedRepetitionSchedule.update).toHaveBeenCalledWith({
        where: { id: 'sched-1' },
        data: expect.objectContaining({
          intervalDays: 6,
          repetitions: 2,
        }),
      })
    })

    it('should increment lapses when accuracy is low (quality < 3)', async () => {
      ;(mockPrisma.spacedRepetitionSchedule.findUnique as jest.Mock).mockResolvedValue({
        id: 'sched-1',
        userId: 'user-1',
        topicId: 'topic-1',
        intervalDays: 6,
        easeFactor: 2.5,
        repetitions: 2,
        lapses: 1,
      })
      ;(mockPrisma.spacedRepetitionSchedule.update as jest.Mock).mockResolvedValue({})

      await engine.updateTopicSchedule('user-1', 'topic-1', 0.2) // quality 1

      expect(mockPrisma.spacedRepetitionSchedule.update).toHaveBeenCalledWith({
        where: { id: 'sched-1' },
        data: expect.objectContaining({
          intervalDays: 1,
          repetitions: 0,
          lapses: 2,
        }),
      })
    })
  })
})
