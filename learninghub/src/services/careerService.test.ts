import { describe, it, expect, vi } from 'vitest'
import { careerService } from './careerService'

vi.mock('../utils/api', () => ({
  api: {
    get: vi.fn().mockRejectedValue(new Error('Mock network offline')),
    post: vi.fn().mockRejectedValue(new Error('Mock network offline')),
  },
}))

describe('careerService (Milestone 26 Anti-Gravity Career Orchestrator)', () => {
  it('should fetch matched jobs with default filters and match affinity scores', async () => {
    const jobs = await careerService.getMatchedJobs()
    expect(jobs).toBeDefined()
    expect(jobs.length).toBeGreaterThan(0)
    expect(jobs[0].matchAffinityScore).toBeGreaterThanOrEqual(40)
    expect(jobs[0].matchAffinityScore).toBeLessThanOrEqual(100)
    expect(jobs[0].requiredSkills.length).toBeGreaterThan(0)
  })

  it('should filter jobs by track and workplace type', async () => {
    const aiJobs = await careerService.getMatchedJobs({
      track: 'AI_RESEARCH',
      remoteOnly: true,
    })
    expect(aiJobs.length).toBeGreaterThan(0)
    aiJobs.forEach(job => {
      expect(job.track).toBe('AI_RESEARCH')
      expect(job.workplaceType).toBe('REMOTE')
    })
  })

  it('should send dialogue turns and receive persona response with sentiment and suggestions', async () => {
    const response = await careerService.sendDialogueTurn({
      jobId: 'job-dist-sys-01',
      candidateName: 'Alex Morgan',
      candidateElo: 2150,
      interviewPercentile: 96,
      activePersona: 'EXECUTIVE_TALENT_LEAD',
    })

    expect(response.personas.length).toBe(3)
    expect(response.dialogueHistory.length).toBeGreaterThan(0)
    expect(response.compensationOffer.totalTargetCompensation).toBeGreaterThan(0)
    expect(response.simulationDigestSha256).toBeDefined()
  })

  it('should evaluate candidate counter offers and return revised package', async () => {
    const res = await careerService.submitCounterOffer({
      jobId: 'job-dist-sys-01',
      leverageScore: 88,
      counterOffer: {
        baseSalary: 240000,
        equityValueUsd: 140000,
        signingBonus: 50000,
      },
    })

    expect(res.verdict).toBe('ACCEPTED')
    expect(res.revisedPackage.totalTargetCompensation).toBe(430000)
    expect(res.feedbackNote).toBeDefined()
  })
})
