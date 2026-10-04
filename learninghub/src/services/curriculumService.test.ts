import { describe, it, expect, vi, beforeEach } from 'vitest'
import { curriculumService, FALLBACK_DEMO_PLAN } from './curriculumService'
import { EXAM_REGISTRY } from '../types/curriculum'

describe('curriculumService', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
  })

  it('exposes full competitive exam registry metadata', () => {
    expect(Object.keys(EXAM_REGISTRY)).toHaveLength(5)
    expect(EXAM_REGISTRY.GATE_CS.name).toContain('GATE')
    expect(EXAM_REGISTRY.JEE_ADVANCED.name).toContain('JEE')
    expect(EXAM_REGISTRY.SYSTEM_DESIGN_DSA.name).toContain('Systems')
    expect(EXAM_REGISTRY.SAT_DIGITAL.name).toContain('SAT')
    expect(EXAM_REGISTRY.FULL_STACK_DEV.name).toContain('Full-Stack')
  })

  it('retrieves default curriculum plan with fallback', async () => {
    const res = await curriculumService.getPlan()
    expect(res.status).toBe('success')
    expect(res.data.plan.id).toBeDefined()
    expect(res.data.plan.modules.length).toBeGreaterThan(0)
    expect(res.data.plan.estimatedReadinessScore).toBeGreaterThan(0)
  })

  it('generates a new curriculum plan with appropriate pacing mode', async () => {
    const res = await curriculumService.generatePlan({
      targetExam: 'SYSTEM_DESIGN_DSA',
      targetDate: new Date(Date.now() + 60 * 86400000).toISOString().split('T')[0],
      weeklyStudyHours: 25,
      diagnosticScorePercent: 75,
    })

    expect(res.status).toBe('success')
    expect(res.data.plan.targetExam).toBe('SYSTEM_DESIGN_DSA')
    expect(res.data.plan.pacingMode).toBe('INTENSIVE')
    expect(res.data.plan.weeklyStudyHours).toBe(25)
  })

  it('recalibrates pacing and updates readiness score dynamically', async () => {
    const res = await curriculumService.recalibratePlan(90)
    expect(res.status).toBe('success')
    expect(res.data.plan.estimatedReadinessScore).toBeGreaterThanOrEqual(FALLBACK_DEMO_PLAN.estimatedReadinessScore)
    expect(res.data.plan.notes).toContain('Outstanding progress')
  })

  it('toggles concept completion cleanly', async () => {
    const res = await curriculumService.toggleConcept('mod-w1', 'c-1-1')
    expect(res.status).toBe('success')
    expect(res.data.plan.modules[0].concepts[0].isCompleted).toBe(false)
  })
})
