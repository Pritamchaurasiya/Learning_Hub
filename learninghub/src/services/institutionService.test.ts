import { describe, it, expect, beforeEach, vi } from 'vitest'
import { InstitutionService } from './institutionService'

describe('institutionService — Frontend LTI & Multi-Tenant Hub Service', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
  })

  it('should fetch registered institutions from API with fallback support', async () => {
    const institutions = await InstitutionService.getInstitutions()
    expect(institutions).toBeDefined()
    expect(institutions.length).toBeGreaterThanOrEqual(3)
    expect(institutions[0].id).toBe('inst_stanford_eng')
    expect(institutions[0].domain).toBe('stanford.edu')
  })

  it('should fetch aggregated institution analytics', async () => {
    const analytics = await InstitutionService.getInstitutionAnalytics('inst_stanford_eng')
    expect(analytics).toBeDefined()
    expect(analytics.institutionName).toContain('Stanford')
    expect(analytics.totalLearners).toBeGreaterThan(1000)
    expect(analytics.averageScorePercent).toBeGreaterThan(80)
    expect(analytics.topExams.length).toBeGreaterThan(0)
  })

  it('should simulate an incoming LTI 1.3 launch session', async () => {
    const res = await InstitutionService.simulateLaunch({
      institutionId: 'inst_stanford_eng',
      role: 'Learner',
      userName: 'Alex Mercer',
      userEmail: 'alex@stanford.edu',
    })

    expect(res.session).toBeDefined()
    expect(res.session.name).toBe('Alex Mercer')
    expect(res.session.isInstructor).toBe(false)
    expect(res.session.sessionId).toContain('lti_sess_')
  })

  it('should push simulated AGS grade passback and generate proof digest', async () => {
    const res = await InstitutionService.passbackGrade({
      institutionId: 'inst_stanford_eng',
      lineItemUrl: 'https://canvas.stanford.edu/api/v1/courses/401/line_items/101',
      studentLtiUserId: 'usr_lti_test_01',
      scoreGiven: 95,
      scoreMaximum: 100,
      comment: 'Excellent performance on Distributed Systems & Raft Consensus',
    })

    expect(res.success).toBe(true)
    expect(res.normalizedScore).toBe(0.95)
    expect(res.scoreGiven).toBe(95)
    expect(res.transactionId).toBeDefined()
    expect(res.proofDigest).toBeDefined()
  })
})
