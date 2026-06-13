import crypto from 'crypto'
import { prisma } from '../config'

interface Experiment {
  id: string
  name: string
  variants: string[]
  active: boolean
}

interface ExperimentAssignment {
  experimentId: string
  variant: string
}

export class ABTestingService {
  private experiments: Map<string, Experiment> = new Map()

  constructor() {
    // Define experiments here
    this.experiments.set('homepage-cta', {
      id: 'homepage-cta',
      name: 'Homepage CTA Button Color',
      variants: ['control', 'blue', 'green'],
      active: true,
    })

    this.experiments.set('course-card-layout', {
      id: 'course-card-layout',
      name: 'Course Card Layout',
      variants: ['control', 'compact', 'detailed'],
      active: true,
    })
  }

  /**
   * Assign user to experiment variant (deterministic based on userId)
   */
  assignVariant(userId: string, experimentId: string): string {
    const experiment = this.experiments.get(experimentId)
    if (!experiment?.active) {
      return 'control'
    }

    // Hash userId to get consistent assignment
    const hash = crypto.createHash('md5').update(`${userId}-${experimentId}`).digest('hex')
    const hashInt = parseInt(hash.substring(0, 8), 16)
    const variantIndex = hashInt % experiment.variants.length

    return experiment.variants[variantIndex]
  }

  /**
   * Get all active experiments for a user
   */
  getUserExperiments(userId: string): ExperimentAssignment[] {
    const assignments: ExperimentAssignment[] = []

    for (const [id, experiment] of this.experiments) {
      if (experiment.active) {
        assignments.push({
          experimentId: id,
          variant: this.assignVariant(userId, id),
        })
      }
    }

    return assignments
  }

  /**
   * Track experiment conversion event
   */
  async trackConversion(userId: string, experimentId: string, eventName: string, value?: number) {
    const variant = this.assignVariant(userId, experimentId)

    await prisma.experimentEvent.create({
      data: {
        experimentId,
        variant,
        userId,
        event: eventName,
        value: value ?? 0,
      }
    })
  }

  /**
   * Get experiment results
   */
  async getExperimentResults(experimentId: string) {
    const results = await prisma.$queryRaw<any[]>`
      SELECT 
        "variant",
        COUNT(DISTINCT "userId") as users,
        COUNT(*) as events,
        SUM("value") as total_value,
        AVG("value") as avg_value
      FROM "experiment_events"
      WHERE "experimentId" = ${experimentId}
      GROUP BY "variant"
      ORDER BY "variant"
    `

    return results.map(r => ({
      variant: r.variant,
      users: Number(r.users),
      events: Number(r.events),
      totalValue: Number(r.total_value),
      avgValue: Number(r.avg_value),
    }))
  }

  /**
   * Calculate statistical significance (Chi-square test)
   */
  async getExperimentSignificance(
    experimentId: string
  ): Promise<{ significant: boolean; pValue: number }> {
    const results = await this.getExperimentResults(experimentId)

    if (results.length < 2) {
      return { significant: false, pValue: 1.0 }
    }

    // Simplified chi-square calculation
    const control = results.find(r => r.variant === 'control')
    const variant = results.find(r => r.variant !== 'control')

    if (!control || !variant) {
      return { significant: false, pValue: 1.0 }
    }

    const controlRate = control.events / control.users
    const variantRate = variant.events / variant.users
    const pooledRate = (control.events + variant.events) / (control.users + variant.users)

    const se = Math.sqrt(pooledRate * (1 - pooledRate) * (1 / control.users + 1 / variant.users))
    const zScore = Math.abs(variantRate - controlRate) / se

    // Approximate p-value (two-tailed)
    const pValue = 2 * (1 - this.normalCDF(Math.abs(zScore)))

    return {
      significant: pValue < 0.05,
      pValue,
    }
  }

  private normalCDF(x: number): number {
    // Approximation of normal CDF
    const t = 1 / (1 + 0.2316419 * Math.abs(x))
    const d = 0.3989423 * Math.exp((-x * x) / 2)
    const p =
      d * t * (0.3193815 + t * (-0.3565638 + t * (1.781478 + t * (-1.821256 + t * 1.330274))))
    return x > 0 ? 1 - p : p
  }
}

export const abTestingService = new ABTestingService()
