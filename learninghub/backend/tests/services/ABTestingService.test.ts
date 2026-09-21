import { ABTestingService } from '../../src/services/ABTestingService'
import { prisma } from '../../src/prismaClient'
import { cacheService } from '../../src/services/CacheService'

jest.mock('../../src/prismaClient', () => ({
  prisma: {
    experiment: {
      create: jest.fn(),
      findUnique: jest.fn(),
      findMany: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
    experimentVariant: {
      findUnique: jest.fn(),
    },
    experimentAssignment: {
      findUnique: jest.fn(),
      upsert: jest.fn(),
    },
    experimentEvent: {
      create: jest.fn(),
      findMany: jest.fn(),
    },
    $transaction: jest.fn((cb) => cb(prisma)),
  },
}))

jest.mock('../../src/services/CacheService', () => ({
  cacheService: {
    get: jest.fn(),
    set: jest.fn(),
    delete: jest.fn(),
  },
}))

describe('ABTestingService', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('createExperiment', () => {
    it('should create an experiment with variants', async () => {
      const mockExperiment = {
        id: 'exp-1',
        name: 'Test Experiment',
        description: 'Test',
        status: 'draft',
        trafficAllocation: 100,
        variants: [
          { id: 'var-1', name: 'Control', isControl: true, trafficWeight: 50, config: {} },
          { id: 'var-2', name: 'Variant', isControl: false, trafficWeight: 50, config: {} },
        ],
      }

      prisma.experiment.create.mockResolvedValue({
        ...mockExperiment,
        variants: [
          { id: 'var-1', name: 'Control', isControl: true, trafficWeight: 50, config: {} },
          { id: 'var-2', name: 'Variant', isControl: false, trafficWeight: 50, config: {} },
        ],
      })

      const result = await ABTestingService.createExperiment({
        name: 'Test Experiment',
        description: 'Test',
        trafficAllocation: 100,
        variants: [
          { name: 'Control', description: 'Control variant', isControl: true, trafficWeight: 50, config: {} },
          { name: 'Variant', description: 'Variant B', isControl: false, trafficWeight: 50, config: {} },
        ],
      })

      expect(prisma.experiment.create).toHaveBeenCalled()
      expect(prisma.experiment.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            name: 'Test Experiment',
            trafficAllocation: 100,
          }),
        })
      )
    })

    it('should throw error on failure', async () => {
      prisma.experiment.create.mockRejectedValue(new Error('DB Error'))
      await expect(ABTestingService.createExperiment({
        name: 'Test',
        description: 'Test',
        trafficAllocation: 100,
        variants: [],
      })).rejects.toThrow('Failed to create experiment')
    })
  })

  describe('assignVariant', () => {
    it('should assign variant deterministically', () => {
      const experiment = {
        id: 'exp-1',
        variants: [
          { id: 'var-1', name: 'Control', trafficWeight: 50, isControl: true },
          { id: 'var-2', name: 'Variant', trafficWeight: 50, isControl: false },
        ],
      }

      // Same user + experiment should always get same variant
      const variant1 = ABTestingService.assignVariant('user-1', { id: 'exp-1', variants: [
        { id: 'var-1', trafficWeight: 50 },
        { id: 'var-2', trafficWeight: 50 },
      ]})

      const variant2 = ABTestingService.assignVariant('user-1', { id: 'exp-1', variants: [
        { id: 'var-1', trafficWeight: 50 },
        { id: 'var-2', trafficWeight: 50 },
      ]})

      expect(variant1?.id).toBe(variant2?.id)
    })

    it('should respect traffic weights', () => {
      const experiment = {
        id: 'exp-1',
        variants: [
          { id: 'var-1', name: 'Control', trafficWeight: 80, isControl: true },
          { id: 'var-2', name: 'Variant', trafficWeight: 20, isControl: false },
        ],
      }

      // With 80/20 split, most users should get control
      let controlCount = 0
      for (let i = 0; i < 1000; i++) {
        const variant = ABTestingService.assignVariant(`user-${i}`, {
          id: 'exp-1',
          variants: [
            { id: 'var-1', trafficWeight: 80, isControl: true },
            { id: 'var-2', trafficWeight: 20, isControl: false },
          ],
        })
        if (variant?.id === 'var-1') controlCount++
      }

      // Should be roughly 80% (allow some variance)
      expect(controlCount).toBeGreaterThan(700)
      expect(controlCount).toBeLessThan(900)
    })
  })

  describe('getUserVariant', () => {
    it('should return cached assignment if exists', async () => {
      prisma.experiment.findUnique.mockResolvedValue({
        id: 'exp-1',
        status: 'running',
        variants: [{ id: 'var-1', name: 'Control', isControl: true }],
      })
      prisma.experimentAssignment.findUnique.mockResolvedValue({ variantId: 'var-1' })

      const variant = await ABTestingService.getUserVariant('user-1', 'exp-1')
      expect(variant?.id).toBe('var-1')
      expect(prisma.experimentAssignment.findUnique).toHaveBeenCalled()
    })

    it('should assign new variant if no assignment exists', async () => {
      prisma.experiment.findUnique.mockResolvedValue({
        id: 'exp-1',
        status: 'running',
        variants: [{ id: 'var-1', name: 'Control', isControl: true, trafficWeight: 50 }],
      })
      prisma.experimentAssignment.findUnique.mockResolvedValue(null)
      prisma.experimentAssignment.upsert.mockResolvedValue({ variantId: 'var-1' })

      const variant = await ABTestingService.getUserVariant('user-1', 'exp-1')
      expect(variant).toBeDefined()
      expect(prisma.experimentAssignment.upsert).toHaveBeenCalled()
    })

    it('should return null for non-running experiment', async () => {
      prisma.experiment.findUnique.mockResolvedValue({
        id: 'exp-1',
        status: 'draft',
      })

      const variant = await ABTestingService.getUserVariant('user-1', 'exp-1')
      expect(variant).toBeNull()
    })
  })

  describe('recordEvent', () => {
    it('should record experiment event', async () => {
      await ABTestingService.recordEvent({
        experimentId: 'exp-1',
        variantId: 'var-1',
        userId: 'user-1',
        event: 'conversion',
        value: 100,
      })

      expect(prisma.experimentEvent.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          experimentId: 'exp-1',
          variant: 'var-1',
          userId: 'user-1',
          event: 'conversion',
          value: 100,
        }),
      })
      expect(cacheService.delete).toHaveBeenCalledWith('experiment:results:exp-1')
    })
  })

  describe('getExperimentResults', () => {
    it('should calculate results with statistical significance', async () => {
      prisma.experiment.findUnique.mockResolvedValue({
        id: 'exp-1',
        variants: [
          { id: 'var-1', name: 'Control', isControl: true },
          { id: 'var-2', name: 'Variant', isControl: false },
        ],
      })

      // Control: 100 participants, 10 conversions (10%)
      // Variant: 100 participants, 40 conversions (40%)
      const controlConversions = Array.from({ length: 10 }, (_, i) => ({ variant: 'var-1', userId: `ctrl-conv-${i}`, event: 'conversion', value: 1 }))
      const controlViews = Array.from({ length: 90 }, (_, i) => ({ variant: 'var-1', userId: `ctrl-view-${i}`, event: 'view' }))
      const variantConversions = Array.from({ length: 40 }, (_, i) => ({ variant: 'var-2', userId: `var-conv-${i}`, event: 'conversion', value: 1 }))
      const variantViews = Array.from({ length: 60 }, (_, i) => ({ variant: 'var-2', userId: `var-view-${i}`, event: 'view' }))

      prisma.experimentEvent.findMany.mockResolvedValue([
        ...controlConversions,
        ...controlViews,
        ...variantConversions,
        ...variantViews,
      ])

      prisma.experiment.findUnique.mockResolvedValue({
        id: 'exp-1',
        variants: [
          { id: 'var-1', name: 'Control', isControl: true },
          { id: 'var-2', name: 'Variant', isControl: false },
        ],
      })

      const results = await ABTestingService.getExperimentResults('exp-1')

      expect(results.variantResults).toHaveLength(2)
      expect(results.significance).toBe('significant')
      expect(results.winner).toBe('var-2')
    })

    it('should return cached results if available', async () => {
      ;(cacheService.get as jest.Mock).mockResolvedValue({ variantResults: [], significance: 'cached' })

      const results = await ABTestingService.getExperimentResults('exp-1')
      expect(results.significance).toBe('cached')
      expect(prisma.experiment.findUnique).not.toHaveBeenCalled()
    })
  })

  describe('startExperiment, pauseExperiment, completeExperiment', () => {
    it('should start experiment', async () => {
      await ABTestingService.startExperiment('exp-1')
      expect(prisma.experiment.update).toHaveBeenCalledWith({
        where: { id: 'exp-1' },
        data: { status: 'running', startDate: expect.any(Date) },
      })
      expect(cacheService.delete).toHaveBeenCalledWith('experiments:active')
    })

    it('should pause experiment', async () => {
      await ABTestingService.pauseExperiment('exp-1')
      expect(prisma.experiment.update).toHaveBeenCalledWith({
        where: { id: 'exp-1' },
        data: { status: 'paused' },
      })
    })

    it('should complete experiment', async () => {
      await ABTestingService.completeExperiment('exp-1')
      expect(prisma.experiment.update).toHaveBeenCalledWith({
        where: { id: 'exp-1' },
        data: { status: 'completed', endDate: expect.any(Date) },
      })
      expect(cacheService.delete).toHaveBeenCalledWith('experiment:results:exp-1')
    })
  })

  describe('getDeterministicHash', () => {
    it('should produce consistent hash for same input', () => {
      const hash1 = (ABTestingService as any).getDeterministicHash('test:input')
      const hash2 = (ABTestingService as any).getDeterministicHash('test:input')
      expect(hash1).toBe(hash2)
    })

    it('should produce different hashes for different inputs', () => {
      const hash1 = (ABTestingService as any).getDeterministicHash('input1')
      const hash2 = (ABTestingService as any).getDeterministicHash('input2')
      expect(hash1).not.toBe(hash2)
    })
  })
})