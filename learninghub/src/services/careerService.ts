import {
  SimulatedJobListing,
  RecruiterTurn,
  RecruiterPersona,
  CompensationPackage,
  CareerMatchFilterParams,
  RecruiterPersonaRole,
} from '../types/career'
import { api } from '../utils/api'

class CareerService {
  /**
   * Fetches matched jobs from backend or generates high-fidelity simulated fallback.
   */
  async getMatchedJobs(params?: CareerMatchFilterParams): Promise<SimulatedJobListing[]> {
    try {
      const queryParams = new URLSearchParams()
      if (params?.track) queryParams.set('track', params.track)
      if (params?.minSalary) queryParams.set('minSalary', String(params.minSalary))
      if (params?.remoteOnly) queryParams.set('remoteOnly', 'true')
      if (params?.searchQuery) queryParams.set('query', params.searchQuery)

      const url = `/api/v1/career/jobs${queryParams.toString() ? `?${queryParams.toString()}` : ''}`
      const response = await api.get<any>(url)
      const jobs = response?.data?.jobs || response?.data?.data?.jobs || response?.jobs
      if (Array.isArray(jobs) && jobs.length > 0) {
        return jobs
      }
    } catch {
      // Offline fallback
    }

    return this.getFallbackJobs(params)
  }

  /**
   * Sends a dialogue message to the multi-agent recruiter simulation.
   */
  async sendDialogueTurn(params: {
    jobId: string
    candidateName: string
    candidateElo: number
    interviewPercentile: number
    activePersona: RecruiterPersonaRole
    candidateMessage?: string
    dialogueHistory?: RecruiterTurn[]
  }): Promise<{
    personas: RecruiterPersona[]
    activePersona: RecruiterPersonaRole
    dialogueHistory: RecruiterTurn[]
    leverageScore: number
    compensationOffer: CompensationPackage
    simulationDigestSha256: string
  }> {
    try {
      const response = await api.post<any>('/api/v1/career/dialogue', params)
      const data = response?.data?.data || response?.data || response
      if (data && data.dialogueHistory) {
        return data
      }
    } catch {
      // Offline fallback
    }

    return this.getFallbackDialogue(params)
  }

  /**
   * Submits a counter-offer in the salary negotiation simulator.
   */
  async submitCounterOffer(params: {
    jobId: string
    leverageScore: number
    counterOffer: {
      baseSalary: number
      equityValueUsd: number
      signingBonus: number
    }
  }): Promise<{
    verdict: 'ACCEPTED' | 'PARTIALLY_ACCEPTED' | 'REJECTED'
    revisedPackage: CompensationPackage
    feedbackNote: string
    deltaUsd: number
  }> {
    try {
      const response = await api.post<any>('/api/v1/career/negotiate', params)
      const data = response?.data?.data || response?.data || response
      if (data && data.verdict) {
        return data
      }
    } catch {
      // Offline fallback
    }

    const total = params.counterOffer.baseSalary + params.counterOffer.equityValueUsd + params.counterOffer.signingBonus
    const isHighLeverage = params.leverageScore >= 75

    return {
      verdict: isHighLeverage ? 'ACCEPTED' : 'PARTIALLY_ACCEPTED',
      revisedPackage: {
        baseSalary: params.counterOffer.baseSalary,
        equityValueUsd: params.counterOffer.equityValueUsd,
        signingBonus: params.counterOffer.signingBonus,
        totalTargetCompensation: total,
        acceptedStatus: isHighLeverage ? 'ACCEPTED' : 'COUNTER_PROPOSED',
      },
      feedbackNote: isHighLeverage
        ? 'Full executive committee acceptance: candidate leverage supported by verified platform telemetry.'
        : 'Partial compromise offered by compensation board.',
      deltaUsd: 25000,
    }
  }

  public getFallbackJobs(params?: CareerMatchFilterParams): SimulatedJobListing[] {
    const list: SimulatedJobListing[] = [
      {
        id: 'job-dist-sys-01',
        title: 'Senior Distributed Systems Infrastructure Engineer',
        company: 'Novacloud Systems',
        tier: 'FAANG_FRONTIER',
        location: 'San Francisco, CA / Remote',
        workplaceType: 'REMOTE',
        baseSalaryMin: 195000,
        baseSalaryMax: 245000,
        equityAnnualUsd: 120000,
        signingBonusUsd: 45000,
        currency: 'USD',
        track: 'DISTRIBUTED_SYSTEMS',
        requiredSkills: ['Distributed Consensus (Raft/Paxos)', 'Go / Rust', 'Kubernetes Architecture', 'Zero-Trust Security'],
        preferredSkills: ['CRDTs', 'eBPF Profiling', 'Chaos Engineering'],
        minimumElo: 1800,
        matchAffinityScore: 96,
        matchedSkills: ['Distributed Consensus (Raft/Paxos)', 'Go / Rust', 'Zero-Trust Security'],
        missingSkills: ['Kubernetes Architecture'],
        telemetryAlignment: {
          eloRatingMatch: true,
          bktMasteryMatch: true,
          interviewReadinessMatch: true,
        },
        description: 'Architect planetary-scale replication engines, multi-region state machine persistence, and fault-tolerant telemetry pipelines.',
      },
      {
        id: 'job-ai-res-02',
        title: 'Autonomous AI Systems & Inference Optimization Lead',
        company: 'Hyperion Intelligence Lab',
        tier: 'AI_LAB_RESEARCH',
        location: 'New York, NY / Remote',
        workplaceType: 'REMOTE',
        baseSalaryMin: 220000,
        baseSalaryMax: 280000,
        equityAnnualUsd: 150000,
        signingBonusUsd: 60000,
        currency: 'USD',
        track: 'AI_RESEARCH',
        requiredSkills: ['LLM Kernel Optimization', 'PyTorch / CUDA', 'WebGPU Micro-Inference', 'Bayesian Active Learning'],
        preferredSkills: ['Quantization (AWQ/GPTQ)', 'Distributed Training (Megatron-LM)', 'Speculative Decoding'],
        minimumElo: 1950,
        matchAffinityScore: 92,
        matchedSkills: ['LLM Kernel Optimization', 'PyTorch / CUDA', 'WebGPU Micro-Inference'],
        missingSkills: ['Bayesian Active Learning'],
        telemetryAlignment: {
          eloRatingMatch: true,
          bktMasteryMatch: true,
          interviewReadinessMatch: true,
        },
        description: 'Build low-latency on-device micro-inference runtimes and autonomous multi-agent reasoning councils for frontier systems.',
      },
      {
        id: 'job-web3-03',
        title: 'Principal Full-Stack Web3 & Cryptographic Architect',
        company: 'Aether Cryptographic Labs',
        tier: 'SERIES_C_UNICORN',
        location: 'Austin, TX / Remote',
        workplaceType: 'REMOTE',
        baseSalaryMin: 200000,
        baseSalaryMax: 250000,
        equityAnnualUsd: 110000,
        signingBonusUsd: 40000,
        currency: 'USD',
        track: 'FULL_STACK_WEB3',
        requiredSkills: ['Zero-Knowledge Proofs (Groth16/Plonk)', 'Solidity / Rust', 'TypeScript / React 18', 'W3C DID & VC Architecture'],
        preferredSkills: ['Account Abstraction (ERC-4337)', 'Merkle Tree Inclusion Proofs', 'IPFS Pinning'],
        minimumElo: 1700,
        matchAffinityScore: 89,
        matchedSkills: ['TypeScript / React 18', 'W3C DID & VC Architecture', 'Zero-Knowledge Proofs (Groth16/Plonk)'],
        missingSkills: ['Solidity / Rust'],
        telemetryAlignment: {
          eloRatingMatch: true,
          bktMasteryMatch: true,
          interviewReadinessMatch: true,
        },
        description: 'Develop tamper-proof decentralized credential protocols, privacy-preserving zero-knowledge identity, and real-time state trees.',
      },
      {
        id: 'job-sre-04',
        title: 'Staff Site Reliability & Chaos Engineering Lead',
        company: 'Apex Cloud Platforms',
        tier: 'FAANG_FRONTIER',
        location: 'Sunnyvale, CA',
        workplaceType: 'HYBRID',
        baseSalaryMin: 210000,
        baseSalaryMax: 260000,
        equityAnnualUsd: 130000,
        signingBonusUsd: 50000,
        currency: 'USD',
        track: 'STAFF_SRE',
        requiredSkills: ['Chaos Mesh / Fault Injection', 'Distributed Tracing (OpenTelemetry)', 'Circuit Breakers', 'Prometheus & Grafana'],
        preferredSkills: ['Incident Post-Mortem Scribe', 'Capacity Little\'s Law Modeling', 'Linux Kernel Cgroups'],
        minimumElo: 1750,
        matchAffinityScore: 86,
        matchedSkills: ['Circuit Breakers', 'Prometheus & Grafana'],
        missingSkills: ['Chaos Mesh / Fault Injection', 'Distributed Tracing (OpenTelemetry)'],
        telemetryAlignment: {
          eloRatingMatch: true,
          bktMasteryMatch: false,
          interviewReadinessMatch: true,
        },
        description: 'Fortify mission-critical tier-0 services through proactive chaos simulations, zero-downtime rollouts, and automated blast-radius containment.',
      },
    ]

    let filtered = list
    if (params?.track) filtered = filtered.filter(j => j.track === params.track)
    if (params?.minSalary) filtered = filtered.filter(j => j.baseSalaryMax >= (params.minSalary || 0))
    if (params?.remoteOnly) filtered = filtered.filter(j => j.workplaceType === 'REMOTE')
    if (params?.searchQuery) {
      const q = params.searchQuery.toLowerCase()
      filtered = filtered.filter(j => j.title.toLowerCase().includes(q) || j.company.toLowerCase().includes(q))
    }

    return filtered
  }

  public getFallbackDialogue(params: {
    jobId: string
    candidateName: string
    candidateElo: number
    interviewPercentile: number
    activePersona: RecruiterPersonaRole
    candidateMessage?: string
    dialogueHistory?: RecruiterTurn[]
  }) {
    const history: RecruiterTurn[] = params.dialogueHistory ? [...params.dialogueHistory] : []

    if (history.length === 0) {
      history.push({
        id: `turn-fallback-1`,
        speaker: 'SYSTEM',
        content: `Candidate portfolio ingested. Arena Elo: ${params.candidateElo}, Mock Interview Percentile: ${params.interviewPercentile}th.`,
        timestamp: new Date().toISOString(),
      })
      history.push({
        id: `turn-fallback-2`,
        speaker: 'RECRUITER',
        personaRole: 'EXECUTIVE_TALENT_LEAD',
        personaName: 'Sarah Lin',
        content: `Hi ${params.candidateName}! We are extremely impressed with your verified telemetry. Initial total compensation package stands at $410k target. How does that sound?`,
        timestamp: new Date().toISOString(),
        sentimentTag: 'ENTHUSIASTIC',
        suggestedResponses: [
          'Given my top 2% interview percentile, I would like to explore upper-band base compensation.',
          'Let’s discuss the annual equity grant timeline and vesting milestones.',
        ],
      })
    } else if (params.candidateMessage) {
      history.push({
        id: `turn-fallback-${Date.now()}-c`,
        speaker: 'CANDIDATE',
        content: params.candidateMessage,
        timestamp: new Date().toISOString(),
      })
      history.push({
        id: `turn-fallback-${Date.now()}-r`,
        speaker: 'RECRUITER',
        personaRole: params.activePersona,
        personaName: params.activePersona === 'ENGINEERING_DIRECTOR' ? 'David Vance' : 'Sarah Lin',
        content: `Thank you for sharing that perspective. We value verified engineering rigor and are happy to recalibrate our offer parameters.`,
        timestamp: new Date().toISOString(),
        sentimentTag: 'NEGOTIATION_TIGHT',
      })
    }

    return {
      personas: [
        {
          role: 'EXECUTIVE_TALENT_LEAD' as RecruiterPersonaRole,
          name: 'Sarah Lin',
          title: 'Executive Technical Recruiter',
          avatarColor: 'from-blue-600 to-indigo-700',
          evaluationFocus: 'Compensation & role trajectory',
          currentImpressionScore: 92,
        },
        {
          role: 'ENGINEERING_DIRECTOR' as RecruiterPersonaRole,
          name: 'David Vance',
          title: 'Director of Systems Architecture',
          avatarColor: 'from-emerald-600 to-teal-700',
          evaluationFocus: 'Architectural trade-offs & fault tolerance',
          currentImpressionScore: 88,
        },
        {
          role: 'BAR_RAISER_PRINCIPAL' as RecruiterPersonaRole,
          name: 'Elena Rostova',
          title: 'Principal Staff Bar Raiser',
          avatarColor: 'from-purple-600 to-pink-700',
          evaluationFocus: 'Asymptotic complexity & incident invariants',
          currentImpressionScore: 94,
        },
      ],
      activePersona: params.activePersona,
      dialogueHistory: history,
      leverageScore: 88,
      compensationOffer: {
        baseSalary: 235000,
        equityValueUsd: 135000,
        signingBonus: 50000,
        totalTargetCompensation: 420000,
        acceptedStatus: 'PENDING' as const,
      },
      simulationDigestSha256: 'a1b2c3d4e5f67890123456789abcdef0123456789abcdef0123456789abcdef0',
    }
  }
}

export const careerService = new CareerService()
