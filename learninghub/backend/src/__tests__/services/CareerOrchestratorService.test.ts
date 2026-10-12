import {
  careerOrchestratorService,
  CareerTrack,
  RecruiterPersonaRole,
} from '../../services/CareerOrchestratorService'

describe('CareerOrchestratorService (Milestone 26 Anti-Gravity Career Orchestrator)', () => {
  it('should match jobs based on candidate skills, Elo rating, and interview percentile', () => {
    const jobs = careerOrchestratorService.matchJobs({
      candidateSkills: [
        'Distributed Consensus (Raft/Paxos)',
        'Go / Rust',
        'CRDTs',
        'Zero-Trust Security',
      ],
      candidateElo: 1980,
      interviewPercentile: 94,
    })

    expect(jobs).toBeDefined()
    expect(jobs.length).toBeGreaterThan(0)
    expect(jobs[0].matchAffinityScore).toBeGreaterThanOrEqual(40)
    expect(jobs[0].matchAffinityScore).toBeLessThanOrEqual(100)
    expect(jobs[0].telemetryAlignment).toHaveProperty('eloRatingMatch')
  })

  it('should filter jobs accurately by track, minSalary, and remote preference', () => {
    const remoteOnlyJobs = careerOrchestratorService.matchJobs({
      candidateSkills: ['PyTorch / CUDA', 'LLM Kernel Optimization'],
      candidateElo: 2000,
      interviewPercentile: 95,
      track: 'AI_RESEARCH' as CareerTrack,
      remoteOnly: true,
    })

    expect(remoteOnlyJobs.length).toBeGreaterThan(0)
    remoteOnlyJobs.forEach(job => {
      expect(job.track).toBe('AI_RESEARCH')
      expect(job.workplaceType).toBe('REMOTE')
    })
  })

  it('should initialize multi-agent recruiter simulation with default personas and greeting', () => {
    const simulation = careerOrchestratorService.generateRecruiterDialogue({
      jobId: 'job-dist-sys-01',
      candidateName: 'Alex Morgan',
      candidateElo: 2100,
      interviewPercentile: 96,
      activePersona: 'EXECUTIVE_TALENT_LEAD' as RecruiterPersonaRole,
    })

    expect(simulation.personas.length).toBe(3)
    expect(simulation.dialogueHistory.length).toBe(2)
    expect(simulation.dialogueHistory[0].speaker).toBe('SYSTEM')
    expect(simulation.dialogueHistory[1].speaker).toBe('RECRUITER')
    expect(simulation.leverageScore).toBeGreaterThanOrEqual(75)
    expect(simulation.compensationOffer.totalTargetCompensation).toBeGreaterThan(0)
    expect(simulation.simulationDigestSha256).toMatch(/^[a-f0-9]{64}$/)
  })

  it('should progress multi-agent dialogue when candidate responds', () => {
    const initialSim = careerOrchestratorService.generateRecruiterDialogue({
      jobId: 'job-dist-sys-01',
      candidateName: 'Alex Morgan',
      candidateElo: 2100,
      interviewPercentile: 96,
      activePersona: 'EXECUTIVE_TALENT_LEAD' as RecruiterPersonaRole,
    })

    const updatedSim = careerOrchestratorService.generateRecruiterDialogue({
      jobId: 'job-dist-sys-01',
      candidateName: 'Alex Morgan',
      candidateElo: 2100,
      interviewPercentile: 96,
      activePersona: 'EXECUTIVE_TALENT_LEAD' as RecruiterPersonaRole,
      candidateMessage: 'I would like to explore higher base compensation given my verified Elo of 2100.',
      dialogueHistory: initialSim.dialogueHistory,
    })

    expect(updatedSim.dialogueHistory.length).toBe(4)
    expect(updatedSim.dialogueHistory[2].speaker).toBe('CANDIDATE')
    expect(updatedSim.dialogueHistory[3].speaker).toBe('RECRUITER')
    expect(updatedSim.dialogueHistory[3].sentimentTag).toBe('NEGOTIATION_TIGHT')
  })

  it('should evaluate and accept reasonable compensation counter-offers with high leverage', () => {
    const result = careerOrchestratorService.evaluateCounterOffer({
      jobId: 'job-dist-sys-01',
      leverageScore: 88,
      counterOffer: {
        baseSalary: 235000,
        equityValueUsd: 130000,
        signingBonus: 50000,
      },
    })

    expect(result.verdict).toBe('ACCEPTED')
    expect(result.revisedPackage.acceptedStatus).toBe('ACCEPTED')
    expect(result.revisedPackage.totalTargetCompensation).toBe(415000)
    expect(result.deltaUsd).toBeGreaterThan(0)
  })

  it('should counter-propose a compromise when numbers exceed standard bands', () => {
    const result = careerOrchestratorService.evaluateCounterOffer({
      jobId: 'job-dist-sys-01',
      leverageScore: 80,
      counterOffer: {
        baseSalary: 260000,
        equityValueUsd: 155000,
        signingBonus: 70000,
      },
    })

    expect(result.verdict).toBe('PARTIALLY_ACCEPTED')
    expect(result.revisedPackage.acceptedStatus).toBe('COUNTER_PROPOSED')
    expect(result.feedbackNote).toContain('compromise')
  })
})
