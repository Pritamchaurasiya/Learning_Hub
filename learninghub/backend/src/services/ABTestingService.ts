import { prisma } from '../prismaClient'
import { Prisma } from '@prisma/client'
import { cacheService } from './CacheService'
import logger from '../utils/logger'
import { createHash } from 'crypto'

export interface Experiment {
  id: string
  name: string
  description: string
  status: 'draft' | 'running' | 'paused' | 'completed' | 'archived'
  trafficAllocation: number // percentage 0-100
  variants: ExperimentVariant[]
  startDate?: Date
  endDate?: Date
  createdAt: Date
  updatedAt: Date
}

export interface ExperimentVariant {
  id: string
  name: string
  description: string
  trafficWeight: number // percentage of allocated traffic
  config: Record<string, any>
  isControl: boolean
}

export interface ExperimentAssignment {
  userId: string
  experimentId: string
  variantId: string
  assignedAt: Date
}

export interface ExperimentEvent {
  experimentId: string
  variantId: string
  userId: string
  event: string
  value?: number
  metadata?: Record<string, any>
  timestamp: Date
}

export interface ExperimentResults {
  experimentId: string
  variantResults: VariantResult[]
  significance: 'significant' | 'not_significant' | 'inconclusive'
  winner?: string
  confidence: number
}

export interface VariantResult {
  variantId: string
  variantName: string
  participants: number
  conversions: number
  conversionRate: number
  avgValue: number
  confidenceInterval: [number, number]
  isSignificant: boolean
}

interface ExperimentVariantModel {
  id: string
  experimentId: string
  name: string
  description: string
  trafficWeight: number
  config: Prisma.InputJsonValue
  isControl: boolean
  createdAt: Date
  updatedAt: Date
}

export class ABTestingService {
  private static readonly CACHE_TTL = 300 // 5 minutes for assignments

  /**
   * Create a new experiment
   */
  static async createExperiment(data: {
    name: string
    description: string
    trafficAllocation: number
    variants: Omit<ExperimentVariant, 'id'>[]
    startDate?: Date
    endDate?: Date
  }): Promise<Experiment> {
    try {
      const variants = data.variants.map(v => ({
        ...v,
        id: `var-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      }))

      const experiment = await prisma.experiment.create({
        data: {
          name: data.name,
          description: data.description,
          status: 'draft',
          trafficAllocation: data.trafficAllocation,
          variants: {
            createMany: {
              data: variants.map(v => ({
                ...v,
                config: JSON.stringify(v.config),
              })),
            },
          },
        },
        include: { variants: true },
      })

      // Invalidate cache
      await cacheService.delete('experiments:active')

      logger.info('[ABTestingService] Experiment created', { experimentId: experiment.id })
      return experiment
    } catch (error) {
      logger.error('[ABTestingService] Create experiment failed', error instanceof Error ? error : new Error(String(error)))
      throw new Error('Failed to create experiment')
    }
  }

  /**
   * Get active experiments for a user
   */
  static async getUserExperiments(userId: string): Promise<Experiment[]> {
    const cacheKey = `experiments:user:${userId}`
    const cached = await cacheService.get<Experiment[]>(cacheKey)
    if (cached) return cached

    try {
      const experiments = await prisma.experiment.findMany({
        where: {
          status: 'running',
          trafficAllocation: { gt: 0 },
          OR: [
            { startDate: { lte: new Date() } },
            { startDate: null },
          ],
          AND: [
            { endDate: { gte: new Date() } },
            { endDate: null },
          ],
        },
        include: { variants: true },
        orderBy: { createdAt: 'desc' },
      })

      // Filter by traffic allocation using consistent hashing
      const eligibleExperiments = experiments.filter((exp: any) => {
        const hash = this.getDeterministicHash(`${exp.id}:${userId}`)
        return (hash % 100) < exp.trafficAllocation
      })

      // Assign variants for eligible experiments
      const assignedExperiments = await Promise.all(
        eligibleExperiments.map(async (exp: any) => {
          const variant = this.assignVariant(userId, exp)
          return { ...exp, assignedVariant: variant }
        })
      )

      await cacheService.set(`experiments:user:${userId}`, assignedExperiments, 300)
      return assignedExperiments as any
    } catch (error) {
      logger.error('[ABTestingService] Get user experiments failed', error instanceof Error ? error : new Error(String(error)))
      throw new Error('Failed to get user experiments')
    }
  }

  /**
   * Assign user to variant using deterministic hashing
   */
  static assignVariant(userId: string, experiment: any): ExperimentVariant | null {
    if (!experiment.variants || experiment.variants.length === 0) return null

    const hash = this.getDeterministicHash(`${experiment.id}:${userId}`)
    let cumulativeWeight = 0
    const roll = hash % 100

    for (const variant of experiment.variants) {
      cumulativeWeight += variant.trafficWeight
      if (roll < cumulativeWeight) {
        return variant
      }
    }

    // Fallback to control
    return experiment.variants.find((v: any) => v.isControl) || experiment.variants[0]
  }

  /**
   * Get user's assigned variant for an experiment
   */
  static async getUserVariant(userId: string, experimentId: string): Promise<ExperimentVariant | null> {
    const experiment = await prisma.experiment.findUnique({
      where: { id: experimentId },
      include: { variants: true },
    })
    if (!experiment || experiment.status !== 'running') return null

    const assignment = await prisma.experimentAssignment.findUnique({
      where: { userId_experimentId: { userId, experimentId } },
    })

    if (assignment) {
      return (assignment as any).variant || experiment.variants.find((v: any) => v.id === assignment.variantId) || null
    }

    // Assign new variant
    const variant = this.assignVariant(userId, { variants: experiment.variants, id: experimentId })
    if (variant) {
      await prisma.experimentAssignment.upsert({
        where: { userId_experimentId: { userId, experimentId } },
        update: { variantId: variant.id },
        create: { userId, experimentId, variantId: variant.id },
      })
    }
    return variant
  }

  /**
   * Record an experiment event (conversion, click, etc.)
   */
  static async recordEvent(data: {
    experimentId: string
    variantId: string
    userId: string
    event: string
    value?: number
    metadata?: Record<string, any>
  }): Promise<void> {
    try {
      await prisma.experimentEvent.create({
        data: {
          experimentId: data.experimentId,
          variant: data.variantId,
          userId: data.userId,
          event: data.event,
          value: data.value ?? 0,
        },
      })

      // Invalidate results cache
      await cacheService.delete(`experiment:results:${data.experimentId}`)
    } catch (error) {
      logger.error('[ABTestingService] Record event failed', error instanceof Error ? error : new Error(String(error)))
    }
  }

  /**
   * Get experiment results with statistical significance
   */
  static async getExperimentResults(experimentId: string): Promise<ExperimentResults> {
    const cacheKey = `experiment:results:${experimentId}`
    const cached = await cacheService.get<ExperimentResults>(cacheKey)
    if (cached) return cached

    try {
      const experiment = await prisma.experiment.findUnique({
        where: { id: experimentId },
        include: { variants: true },
      })
      if (!experiment) throw new Error('Experiment not found')

      const events = await prisma.experimentEvent.findMany({
        where: { experimentId },
        orderBy: { createdAt: 'asc' },
      })

      // Group events by variant
      const variantData = new Map<string, {
        participants: Set<string>
        conversions: number
        totalValue: number
      }>()

      for (const event of events) {
        const variantKey = event.variant || (event as any).variantId
        if (!variantData.has(variantKey)) {
          variantData.set(variantKey, { participants: new Set(), conversions: 0, totalValue: 0 })
        }
        const variant = variantData.get(variantKey)!
        variant.participants.add(event.userId)
        if (event.event === 'conversion') {
          variant.conversions++
          variant.totalValue += event.value || 0
        }
      }

      const variantResults: VariantResult[] = []
      for (const variant of experiment.variants) {
        const data = variantData.get(variant.id) || { participants: new Set(), conversions: 0, totalValue: 0 }
        const participants = data.participants.size
        const conversions = data.conversions
        const conversionRate = participants > 0 ? conversions / participants : 0
        const avgValue = conversions > 0 ? data.totalValue / conversions : 0

        // Calculate confidence interval (Wilson score interval)
        const ci = this.wilsonConfidenceInterval(conversions, participants)

        const controlVariant = experiment.variants.find((v: any) => v.isControl)
        const isControl = variant.isControl
        let isSignificant = false

        if (!isControl && controlVariant) {
          const controlData = variantData.get(controlVariant.id) || { participants: new Set(), conversions: 0, totalValue: 0 }
          isSignificant = this.isStatisticallySignificant(
            conversions, participants,
            controlData.conversions, controlData.participants.size
          )
        }

        variantResults.push({
          variantId: variant.id,
          variantName: variant.name,
          participants,
          conversions,
          conversionRate,
          avgValue: conversions > 0 ? (data.totalValue || 0) / conversions : 0,
          confidenceInterval: ci,
          isSignificant,
        })
      }

      // Determine overall significance and winner
      const significantVariants = variantResults.filter((v: any) => v.isSignificant && v.variantId !== experiment.variants.find((cv: any) => cv.isControl)?.id)
      let winner: string | undefined
      let significance: 'significant' | 'not_significant' | 'inconclusive' = 'inconclusive'

      if (significantVariants.length > 0) {
        significance = 'significant'
        winner = significantVariants.sort((a, b) => b.conversionRate - a.conversionRate)[0].variantId
      } else if (variantResults.every((v: any) => v.participants > 30)) {
        significance = 'not_significant'
      }

      const results: ExperimentResults = {
        experimentId,
        variantResults,
        significance,
        winner,
        confidence: variantResults.length > 0 ? 0.95 : 0,
      }

      await cacheService.set(`experiment:results:${experimentId}`, results, 300)
      return results
    } catch (error) {
      logger.error('[ABTestingService] Get experiment results failed', error instanceof Error ? error : new Error(String(error)))
      throw new Error('Failed to get experiment results')
    }
  }

  /**
   * Wilson score interval for binomial proportion confidence interval
   */
  private static wilsonConfidenceInterval(conversions: number, participants: number): [number, number] {
    if (participants === 0) return [0, 0]
    const p = conversions / participants
    const z = 1.96 // 95% confidence
    const denominator = 1 + 3.8416 / participants
    const center = (p + 1.9208 / participants) / (1 + 3.8416 / participants)
    const halfWidth = (1.96 * Math.sqrt(p * (1 - p) / participants + 0.9604 / participants)) / (1 + 3.8416 / participants)
    return [
      Math.max(0, center - halfWidth),
      Math.min(1, center + halfWidth)
    ]
  }

  /**
   * Chi-square test for statistical significance
   */
  private static isStatisticallySignificant(
    conversionsA: number, participantsA: number,
    conversionsB: number, participantsB: number
  ): boolean {
    if (participantsA < 30 || participantsB < 30) return false

    const pA = conversionsA / participantsA
    const pB = conversionsB / participantsB
    const pPooled = (conversionsA + conversionsB) / (participantsA + participantsB)
    const se = Math.sqrt(pPooled * (1 - pPooled) * (1 / participantsA + 1 / participantsB))
    const z = Math.abs(pA - pB) / se

    return z > 1.96 // 95% confidence
  }

  /**
   * Deterministic hash for consistent user assignment
   */
  private static getDeterministicHash(input: string): number {
    return parseInt(createHash('md5').update(input).digest('hex').substring(0, 8), 16)
  }

  /**
   * Start an experiment
   */
  static async startExperiment(experimentId: string): Promise<void> {
    await prisma.experiment.update({
      where: { id: experimentId },
      data: { status: 'running', startDate: new Date() },
    })
    await cacheService.delete('experiments:active')
    await cacheService.delete('experiments:active')
  }

  /**
   * Pause an experiment
   */
  static async pauseExperiment(experimentId: string): Promise<void> {
    await prisma.experiment.update({
      where: { id: experimentId },
      data: { status: 'paused' },
    })
    await cacheService.delete('experiments:active')
  }

  /**
   * Complete an experiment
   */
  static async completeExperiment(experimentId: string): Promise<void> {
    await prisma.experiment.update({
      where: { id: experimentId },
      data: { status: 'completed', endDate: new Date() },
    })
    await cacheService.delete('experiments:active')
    await cacheService.delete(`experiment:results:${experimentId}`)
  }

  /**
   * Get all experiments
   */
  static async getAllExperiments(): Promise<Experiment[]> {
    return prisma.experiment.findMany({
      include: { variants: true },
      orderBy: { createdAt: 'desc' },
    })
  }

  /**
   * Update experiment
   */
  static async updateExperiment(experimentId: string, data: Partial<Experiment>): Promise<Experiment> {
    const experiment = await prisma.experiment.update({
      where: { id: experimentId },
      data: { ...data, updatedAt: new Date() },
      include: { variants: true },
    })
    await cacheService.delete('experiments:active')
    return experiment
  }

  /**
   * Track conversion event for user's assigned variant
   */
  static async trackConversion(userId: string, experimentId: string, eventName: string, value?: number): Promise<void> {
    const variant = await this.getUserVariant(userId, experimentId)
    if (variant) {
      await this.recordEvent({
        experimentId,
        variantId: variant.id,
        userId,
        event: eventName,
        value,
      })
    }
  }

  getUserExperiments(userId: string) {
    return ABTestingService.getUserExperiments(userId)
  }

  getUserVariant(userId: string, experimentId: string) {
    return ABTestingService.getUserVariant(userId, experimentId)
  }

  trackConversion(userId: string, experimentId: string, eventName: string, value?: number) {
    return ABTestingService.trackConversion(userId, experimentId, eventName, value)
  }

  getExperimentResults(experimentId: string) {
    return ABTestingService.getExperimentResults(experimentId)
  }
}

export const abTestingService = new ABTestingService()