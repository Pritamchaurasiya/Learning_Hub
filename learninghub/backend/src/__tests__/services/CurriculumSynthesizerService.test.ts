import {
  CurriculumSynthesizerService,
  TargetExam,
} from '../../services/CurriculumSynthesizerService'

describe('CurriculumSynthesizerService Engine', () => {
  let service: CurriculumSynthesizerService

  beforeEach(() => {
    service = new CurriculumSynthesizerService()
  })

  describe('Pacing & Time Calculations', () => {
    it('accurately maps weekly hours to pacing modes', () => {
      expect(service.determinePacingMode(25)).toBe('INTENSIVE')
      expect(service.determinePacingMode(22)).toBe('INTENSIVE')
      expect(service.determinePacingMode(15)).toBe('BALANCED')
      expect(service.determinePacingMode(12)).toBe('BALANCED')
      expect(service.determinePacingMode(10)).toBe('STEADY')
      expect(service.determinePacingMode(5)).toBe('STEADY')
    })

    it('calculates remaining weeks from target date', () => {
      const futureDate = new Date(Date.now() + 70 * 86400000).toISOString().split('T')[0] // 70 days = 10 weeks
      const weeks = service.calculateWeeksRemaining(futureDate)
      expect(weeks).toBe(10)
    })
  })

  describe('Plan Generation', () => {
    it('synthesizes a structured multi-week plan for GATE_CS', () => {
      const targetDate = new Date(Date.now() + 84 * 86400000).toISOString().split('T')[0] // 12 weeks
      const plan = service.generatePlan({
        userId: 'student-gate-1',
        targetExam: 'GATE_CS',
        targetDate,
        weeklyStudyHours: 18,
        diagnosticScorePercent: 70,
      })

      expect(plan.id).toBeDefined()
      expect(plan.userId).toBe('student-gate-1')
      expect(plan.targetExam).toBe('GATE_CS')
      expect(plan.pacingMode).toBe('BALANCED')
      expect(plan.weeksRemaining).toBe(12)
      expect(plan.bufferWeeks).toBeGreaterThanOrEqual(1)
      expect(plan.modules.length).toBe(12)
      expect(plan.estimatedReadinessScore).toBeGreaterThanOrEqual(70)

      // Verify active modules have concepts with KaTeX / Code snippets
      const firstModule = plan.modules[0]
      expect(firstModule.status).toBe('IN_PROGRESS')
      expect(firstModule.concepts.length).toBeGreaterThan(0)
      const hasFormulaOrCode = firstModule.concepts.some(
        c => Boolean(c.formulaLatex) || Boolean(c.codeSnippet)
      )
      expect(hasFormulaOrCode).toBe(true)

      // Verify resource links exist
      expect(firstModule.resourceLinks.length).toBeGreaterThan(0)
    })

    it('synthesizes a curriculum for SYSTEM_DESIGN_DSA with proper domain mapping', () => {
      const targetDate = new Date(Date.now() + 42 * 86400000).toISOString().split('T')[0] // 6 weeks
      const plan = service.generatePlan({
        userId: 'faang-aspirant-1',
        targetExam: 'SYSTEM_DESIGN_DSA',
        targetDate,
        weeklyStudyHours: 25,
        diagnosticScorePercent: 80,
      })

      expect(plan.pacingMode).toBe('INTENSIVE')
      expect(plan.targetExam).toBe('SYSTEM_DESIGN_DSA')
      expect(plan.modules.some(m => m.domain.includes('Algorithmic') || m.domain.includes('Distributed'))).toBe(true)
    })

    it('provisions buffer consolidation weeks for long-horizon study plans', () => {
      const targetDate = new Date(Date.now() + 140 * 86400000).toISOString().split('T')[0] // 20 weeks
      const plan = service.generatePlan({
        userId: 'student-jee-1',
        targetExam: 'JEE_ADVANCED',
        targetDate,
        weeklyStudyHours: 20,
      })

      expect(plan.bufferWeeks).toBe(3) // 15% of 20 = 3
      const bufferModule = plan.modules[plan.modules.length - 1]
      expect(bufferModule.domain).toBe('Synthesis & Review')
      expect(bufferModule.title).toContain('High-Yield Consolidation')
    })
  })

  describe('Dynamic Pacing Recalibration', () => {
    it('accelerates readiness score and adds positive notes on high accuracy test (>85%)', () => {
      const plan = service.generatePlan({
        userId: 'recalib-user-1',
        targetExam: 'GATE_CS',
        targetDate: new Date(Date.now() + 56 * 86400000).toISOString().split('T')[0],
        weeklyStudyHours: 15,
        diagnosticScorePercent: 60,
      })

      const initialReadiness = plan.estimatedReadinessScore
      const updated = service.recalibratePlan('recalib-user-1', 92)

      expect(updated).not.toBeNull()
      expect(updated!.estimatedReadinessScore).toBeGreaterThan(initialReadiness)
      expect(updated!.notes).toContain('Outstanding progress')
      expect(updated!.recalibratedAt).toBeDefined()
    })

    it('injects reinforcement alert and reduces readiness on low accuracy test (<60%)', () => {
      service.generatePlan({
        userId: 'recalib-user-2',
        targetExam: 'GATE_CS',
        targetDate: new Date(Date.now() + 56 * 86400000).toISOString().split('T')[0],
        weeklyStudyHours: 15,
        diagnosticScorePercent: 60,
      })

      const updated = service.recalibratePlan('recalib-user-2', 45)

      expect(updated).not.toBeNull()
      expect(updated!.notes).toContain('Pacing alert')
      expect(updated!.notes).toContain('Reinforcement sessions flagged')
    })
  })

  describe('Concept Tracking & Progress Updates', () => {
    it('toggles concept completion and updates module and overall progress', () => {
      const plan = service.generatePlan({
        userId: 'track-user-1',
        targetExam: 'GATE_CS',
        targetDate: new Date(Date.now() + 28 * 86400000).toISOString().split('T')[0],
        weeklyStudyHours: 10,
      })

      const mod = plan.modules[0]
      const concept = mod.concepts[0]
      expect(concept.isCompleted).toBe(false)
      expect(plan.overallProgress).toBe(0)

      const result = service.toggleConcept('track-user-1', mod.id, concept.id)
      expect(result).not.toBeNull()
      expect(result!.concept.isCompleted).toBe(true)
      expect(result!.plan.overallProgress).toBeGreaterThan(0)

      // Toggle back to incomplete
      const toggledBack = service.toggleConcept('track-user-1', mod.id, concept.id)
      expect(toggledBack!.concept.isCompleted).toBe(false)
      expect(toggledBack!.plan.overallProgress).toBe(0)
    })
  })
})
