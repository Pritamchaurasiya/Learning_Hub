import { curriculumService } from '../../services/CurriculumService'

describe('CurriculumService (Milestone 10 Engine)', () => {
  const testUserId = 'test-curriculum-user-123'

  it('should synthesize a comprehensive multi-week curriculum for GATE CS', async () => {
    const curriculum = await curriculumService.synthesizeCurriculum(testUserId, {
      examTarget: 'GATE_CS',
      targetHorizonWeeks: 12,
      weeklyHours: 15,
      diagnosticScore: 60,
    })

    expect(curriculum).toBeDefined()
    expect(curriculum.examTarget).toBe('GATE_CS')
    expect(curriculum.targetHorizonWeeks).toBe(12)
    expect(curriculum.weeklyHours).toBe(15)
    expect(curriculum.totalAllocatedHours).toBe(180)
    expect(curriculum.modules.length).toBe(12)
    expect(curriculum.milestones.length).toBeGreaterThanOrEqual(3)
    expect(curriculum.status).toBe('ACTIVE')
    expect(curriculum.pacingStatus).toBe('ON_TRACK')

    // Check buffer mock weeks
    const lastModule = curriculum.modules[curriculum.modules.length - 1]
    expect(lastModule.phase).toBe('MOCK_REINFORCEMENT')
    expect(lastModule.checkpointTest.durationMinutes).toBe(180)
  })

  it('should prioritize specified weak areas during syllabus synthesis', async () => {
    const curriculum = await curriculumService.synthesizeCurriculum(testUserId, {
      examTarget: 'GATE_CS',
      targetHorizonWeeks: 8,
      weeklyHours: 10,
      weakAreas: ['Dynamic Programming'],
    })

    expect(curriculum.modules.length).toBe(8)
    const firstWeekTopics = curriculum.modules[0].topics.map(t => t.title.toLowerCase())
    const hasDpInFirstHalf = curriculum.modules
      .slice(0, 3)
      .some(m => m.topics.some(t => t.title.toLowerCase().includes('dynamic programming')))
    expect(hasDpInFirstHalf).toBe(true)
  })

  it('should retrieve active curriculum and update module completion', async () => {
    const active = await curriculumService.getActiveCurriculum(testUserId)
    expect(active.userId).toBe(testUserId)

    const updated = await curriculumService.updateModuleProgress(testUserId, 1, true)
    expect(updated.completedModulesCount).toBe(1)
    expect(updated.progressPercent).toBeGreaterThan(0)
    expect(updated.modules[0].isCompleted).toBe(true)
    expect(updated.modules[0].completedAt).toBeDefined()
  })

  it('should return curriculum blueprint templates', () => {
    const templates = curriculumService.getTemplates()
    expect(templates.length).toBeGreaterThanOrEqual(3)
    const gateTemplate = templates.find(t => t.key === 'GATE_CS')
    expect(gateTemplate).toBeDefined()
    expect(gateTemplate?.subjectCount).toBeGreaterThan(0)
  })
})
