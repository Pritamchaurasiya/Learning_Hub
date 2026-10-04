import { skillEngineService } from '../../services/SkillEngineService'

describe('SkillEngineService (Bayesian Knowledge Tracing & Skill DAG)', () => {
  const testUserId = 'test-bkt-user-789'

  it('should retrieve full skill graph with mastery beliefs and status tiers', async () => {
    const graph = await skillEngineService.getSkillGraph(testUserId)

    expect(graph).toBeDefined()
    expect(graph.skills.length).toBeGreaterThanOrEqual(5)
    expect(graph.edges.length).toBeGreaterThan(0)
    expect(graph.masteryStats.totalSkills).toBe(graph.skills.length)
    expect(graph.masteryStats.examReadinessScore).toBeGreaterThanOrEqual(0)
    expect(graph.masteryStats.examReadinessScore).toBeLessThanOrEqual(100)

    // Check Foundations skill is unlocked or mastered
    const asymptotic = graph.skills.find(s => s.id === 'skill-asymptotic')
    expect(asymptotic).toBeDefined()
    expect(['UNLOCKED', 'IN_PROGRESS', 'MASTERED']).toContain(asymptotic?.status)
  })

  it('should update posterior mastery belief following correct and incorrect observations', async () => {
    // Record a correct observation
    const correctRes = await skillEngineService.recordInteraction(
      testUserId,
      'skill-binary-search',
      true
    )
    expect(correctRes.skillId).toBe('skill-binary-search')
    expect(correctRes.updatedMastery).toBeGreaterThanOrEqual(correctRes.previousMastery)

    // Record an incorrect observation
    const incorrectRes = await skillEngineService.recordInteraction(
      testUserId,
      'skill-binary-search',
      false
    )
    expect(incorrectRes.updatedMastery).toBeLessThanOrEqual(correctRes.updatedMastery + 0.1)
  })

  it('should recommend Next Best Action within the Zone of Proximal Development', async () => {
    const nba = await skillEngineService.getNextBestAction(testUserId)
    expect(nba).toBeDefined()
    expect(nba.recommendation).toBeDefined()
    expect(nba.recommendation.skillId).toBeDefined()
    expect(nba.recommendation.reason).toBeDefined()
    expect(nba.recommendation.practiceUrl).toBeDefined()
    expect(nba.readinessSummary).toBeDefined()
  })
})
