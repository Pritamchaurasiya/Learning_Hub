import crypto from 'crypto'
import logger from '../utils/logger'

export type CareerTrack =
  | 'DISTRIBUTED_SYSTEMS'
  | 'AI_RESEARCH'
  | 'FULL_STACK_WEB3'
  | 'STAFF_SRE'
  | 'ALGORITHM_QUANT'

export type RecruiterPersonaRole =
  | 'EXECUTIVE_TALENT_LEAD'
  | 'ENGINEERING_DIRECTOR'
  | 'BAR_RAISER_PRINCIPAL'

export interface SimulatedJobListing {
  id: string
  title: string
  company: string
  tier: 'FAANG_FRONTIER' | 'SERIES_C_UNICORN' | 'AI_LAB_RESEARCH' | 'FINTECH_TRADING'
  location: string
  workplaceType: 'REMOTE' | 'HYBRID' | 'ONSITE'
  baseSalaryMin: number
  baseSalaryMax: number
  equityAnnualUsd: number
  signingBonusUsd: number
  currency: string
  track: CareerTrack
  requiredSkills: string[]
  preferredSkills: string[]
  minimumElo: number
  matchAffinityScore: number
  matchedSkills: string[]
  missingSkills: string[]
  telemetryAlignment: {
    eloRatingMatch: boolean
    bktMasteryMatch: boolean
    interviewReadinessMatch: boolean
  }
  description: string
}

export interface RecruiterTurn {
  id: string
  speaker: 'RECRUITER' | 'CANDIDATE' | 'SYSTEM'
  personaRole?: RecruiterPersonaRole
  personaName?: string
  content: string
  timestamp: string
  sentimentTag?: 'ENTHUSIASTIC' | 'NEUTRAL' | 'CRITICAL' | 'NEGOTIATION_TIGHT'
  suggestedResponses?: string[]
}

export interface RecruiterPersona {
  role: RecruiterPersonaRole
  name: string
  title: string
  avatarColor: string
  evaluationFocus: string
  currentImpressionScore: number
}

export interface CompensationPackage {
  baseSalary: number
  equityValueUsd: number
  signingBonus: number
  totalTargetCompensation: number
  acceptedStatus: 'PENDING' | 'ACCEPTED' | 'REJECTED' | 'COUNTER_PROPOSED'
}

export interface CareerSimulationState {
  candidateName: string
  candidateDid: string
  candidateElo: number
  topConceptsMastered: string[]
  interviewPercentile: number
  selectedJobId: string
  recruiterPersonas: RecruiterPersona[]
  activePersona: RecruiterPersonaRole
  dialogueHistory: RecruiterTurn[]
  currentOffer: CompensationPackage
  candidateCounterOffer: CompensationPackage
  leverageScore: number
  marketCompetitivenessPercentile: number
  simulationDigestSha256: string
}

export class CareerOrchestratorService {
  private secretKey: string = process.env.CAREER_SIGNING_SECRET || 'learninghub-career-orchestrator-salt-v1'

  private sampleJobs: Omit<SimulatedJobListing, 'matchAffinityScore' | 'matchedSkills' | 'missingSkills' | 'telemetryAlignment'>[] = [
    {
      id: 'job-dist-sys-01',
      title: 'Senior Distributed Systems Infrastructure Engineer',
      company: 'Novacloud Systems',
      tier: 'FAANG_FRONTIER',
      location: 'San Francisco, CA / Seattle, WA',
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
      description: 'Fortify mission-critical tier-0 services through proactive chaos simulations, zero-downtime rollouts, and automated blast-radius containment.',
    },
    {
      id: 'job-quant-05',
      title: 'Algorithmic Execution & Low-Latency Engineer',
      company: 'Strata Quantitative Capital',
      tier: 'FINTECH_TRADING',
      location: 'Chicago, IL / New York, NY',
      workplaceType: 'ONSITE',
      baseSalaryMin: 250000,
      baseSalaryMax: 320000,
      equityAnnualUsd: 180000,
      signingBonusUsd: 75000,
      currency: 'USD',
      track: 'ALGORITHM_QUANT',
      requiredSkills: ['C++20 / Modern C++', 'Order Book Microstructure', 'Lock-Free Queues', 'Cache-Aware Asymptotic Analysis'],
      preferredSkills: ['Kernel Bypass (Solarflare/DPDK)', 'FPGA Integration', 'SIMD Parallelism'],
      minimumElo: 2100,
      description: 'Design deterministic sub-microsecond limit order book matching engines and competitive algorithmic execution pipelines.',
    },
  ]

  /**
   * Evaluates candidate skills against market roles and computes match affinity.
   */
  public matchJobs(params: {
    candidateSkills: string[]
    candidateElo: number
    interviewPercentile: number
    track?: CareerTrack
    minSalary?: number
    remoteOnly?: boolean
  }): SimulatedJobListing[] {
    const candidateSkillsLower = new Set(params.candidateSkills.map(s => s.toLowerCase()))

    let jobs = this.sampleJobs.map(job => {
      const matchedSkills: string[] = []
      const missingSkills: string[] = []

      job.requiredSkills.forEach(req => {
        const isMatched = Array.from(candidateSkillsLower).some(cs =>
          req.toLowerCase().includes(cs) || cs.includes(req.toLowerCase().split(' ')[0])
        )
        if (isMatched) matchedSkills.push(req)
        else missingSkills.push(req)
      })

      const skillOverlapRatio = job.requiredSkills.length > 0
        ? matchedSkills.length / job.requiredSkills.length
        : 1

      const eloFactor = Math.min(1.2, Math.max(0.7, params.candidateElo / job.minimumElo))
      const interviewFactor = params.interviewPercentile / 100

      const matchAffinityScore = Math.min(
        100,
        Math.max(
          40,
          Math.round(
            (skillOverlapRatio * 0.50 + eloFactor * 0.25 + interviewFactor * 0.25) * 100
          )
        )
      )

      return {
        ...job,
        matchAffinityScore,
        matchedSkills,
        missingSkills,
        telemetryAlignment: {
          eloRatingMatch: params.candidateElo >= job.minimumElo,
          bktMasteryMatch: skillOverlapRatio >= 0.60,
          interviewReadinessMatch: params.interviewPercentile >= 80,
        },
      }
    })

    if (params.track) {
      jobs = jobs.filter(j => j.track === params.track)
    }

    if (params.minSalary) {
      jobs = jobs.filter(j => j.baseSalaryMax >= (params.minSalary || 0))
    }

    if (params.remoteOnly) {
      jobs = jobs.filter(j => j.workplaceType === 'REMOTE')
    }

    return jobs.sort((a, b) => b.matchAffinityScore - a.matchAffinityScore)
  }

  /**
   * Initializes or continues a multi-agent recruiter simulation.
   */
  public generateRecruiterDialogue(params: {
    jobId: string
    candidateName: string
    candidateElo: number
    interviewPercentile: number
    activePersona: RecruiterPersonaRole
    candidateMessage?: string
    dialogueHistory?: RecruiterTurn[]
  }): {
    personas: RecruiterPersona[]
    activePersona: RecruiterPersonaRole
    dialogueHistory: RecruiterTurn[]
    leverageScore: number
    compensationOffer: CompensationPackage
    simulationDigestSha256: string
  } {
    const job = this.sampleJobs.find(j => j.id === params.jobId) || this.sampleJobs[0]

    const personas: RecruiterPersona[] = [
      {
        role: 'EXECUTIVE_TALENT_LEAD',
        name: 'Sarah Lin',
        title: 'Executive Technical Recruiter & Talent Partner',
        avatarColor: 'from-blue-600 to-indigo-700',
        evaluationFocus: 'Compensation bands, leadership cadence, and role trajectory',
        currentImpressionScore: 92,
      },
      {
        role: 'ENGINEERING_DIRECTOR',
        name: 'David Vance',
        title: 'Director of Systems Architecture',
        avatarColor: 'from-emerald-600 to-teal-700',
        evaluationFocus: 'Architectural trade-offs, fault tolerance, and cross-team leverage',
        currentImpressionScore: 88,
      },
      {
        role: 'BAR_RAISER_PRINCIPAL',
        name: 'Elena Rostova',
        title: 'Principal Staff Bar Raiser',
        avatarColor: 'from-purple-600 to-pink-700',
        evaluationFocus: 'Asymptotic complexity rigor, high-stakes incidents, and standards elevation',
        currentImpressionScore: 94,
      },
    ]

    const dialogueHistory: RecruiterTurn[] = params.dialogueHistory ? [...params.dialogueHistory] : []

    if (dialogueHistory.length === 0) {
      dialogueHistory.push({
        id: `turn-${Date.now()}-1`,
        speaker: 'SYSTEM',
        content: `Application reviewed for "${job.title}" at ${job.company}. Cryptographic platform credentials verified (Arena Elo: ${params.candidateElo}, Mock Interview Percentile: ${params.interviewPercentile}th).`,
        timestamp: new Date().toISOString(),
      })

      dialogueHistory.push({
        id: `turn-${Date.now()}-2`,
        speaker: 'RECRUITER',
        personaRole: 'EXECUTIVE_TALENT_LEAD',
        personaName: 'Sarah Lin',
        content: `Hi ${params.candidateName}! I reviewed your Anti-Gravity Verifiable Portfolio. Your ${params.candidateElo} Elo in the 1v1 Arena and top-tier mock interview percentiles placed you in our top 2% candidate pool for the ${job.title} role. We are prepared to offer an initial total compensation package of $${((job.baseSalaryMin + job.equityAnnualUsd + job.signingBonusUsd) / 1000).toFixed(0)}k. How does this alignment feel given your expectations?`,
        timestamp: new Date().toISOString(),
        sentimentTag: 'ENTHUSIASTIC',
        suggestedResponses: [
          `Thank you Sarah. My verifiable telemetry and systems architecture benchmarks warrant evaluating the upper base band of $${(job.baseSalaryMax / 1000).toFixed(0)}k.`,
          `I am thrilled by the mission at ${job.company}. Let's discuss equity weighting versus upfront signing incentives.`,
          `Can you provide insights into how David and Elena evaluate multi-region resilience and team impact?`,
        ],
      })
    } else if (params.candidateMessage) {
      dialogueHistory.push({
        id: `turn-${Date.now()}-candidate`,
        speaker: 'CANDIDATE',
        content: params.candidateMessage,
        timestamp: new Date().toISOString(),
      })

      const reply = this.synthesizePersonaResponse({
        personaRole: params.activePersona,
        candidateMessage: params.candidateMessage,
        candidateName: params.candidateName,
        candidateElo: params.candidateElo,
        job,
      })

      dialogueHistory.push({
        id: `turn-${Date.now()}-recruiter`,
        speaker: 'RECRUITER',
        personaRole: params.activePersona,
        personaName: personas.find(p => p.role === params.activePersona)?.name || 'Recruiter',
        content: reply.content,
        timestamp: new Date().toISOString(),
        sentimentTag: reply.sentimentTag,
        suggestedResponses: reply.suggestedResponses,
      })
    }

    // Leverage calculation: 0 - 100
    const eloLeverage = Math.min(40, (params.candidateElo / 2400) * 40)
    const interviewLeverage = (params.interviewPercentile / 100) * 35
    const credentialsLeverage = 25
    const leverageScore = Math.min(100, Math.round(eloLeverage + interviewLeverage + credentialsLeverage))

    const baseSalary = Math.round(job.baseSalaryMin + (job.baseSalaryMax - job.baseSalaryMin) * (leverageScore / 100 * 0.7))
    const equityValueUsd = Math.round(job.equityAnnualUsd * (1 + (leverageScore - 70) / 200))
    const signingBonus = Math.round(job.signingBonusUsd * (1 + (leverageScore - 70) / 150))
    const totalTargetCompensation = baseSalary + equityValueUsd + signingBonus

    const compensationOffer: CompensationPackage = {
      baseSalary,
      equityValueUsd,
      signingBonus,
      totalTargetCompensation,
      acceptedStatus: 'PENDING',
    }

    const digestPayload = JSON.stringify({
      jobId: job.id,
      candidateName: params.candidateName,
      candidateElo: params.candidateElo,
      leverageScore,
      totalTargetCompensation,
      timestamp: new Date().toISOString().slice(0, 10),
    })

    const simulationDigestSha256 = crypto
      .createHmac('sha256', this.secretKey)
      .update(digestPayload)
      .digest('hex')

    return {
      personas,
      activePersona: params.activePersona,
      dialogueHistory,
      leverageScore,
      compensationOffer,
      simulationDigestSha256,
    }
  }

  /**
   * Evaluates counter-offers in the salary negotiation simulator.
   */
  public evaluateCounterOffer(params: {
    jobId: string
    leverageScore: number
    counterOffer: {
      baseSalary: number
      equityValueUsd: number
      signingBonus: number
    }
  }): {
    verdict: 'ACCEPTED' | 'PARTIALLY_ACCEPTED' | 'REJECTED'
    revisedPackage: CompensationPackage
    feedbackNote: string
    deltaUsd: number
  } {
    const job = this.sampleJobs.find(j => j.id === params.jobId) || this.sampleJobs[0]
    const maxAllowableBase = job.baseSalaryMax * 1.05
    const maxAllowableEquity = job.equityAnnualUsd * 1.30
    const maxAllowableSign = job.signingBonusUsd * 1.50

    const proposedTotal = params.counterOffer.baseSalary + params.counterOffer.equityValueUsd + params.counterOffer.signingBonus
    const initialTotal = job.baseSalaryMin + job.equityAnnualUsd + job.signingBonusUsd

    const deltaUsd = proposedTotal - initialTotal

    if (
      params.counterOffer.baseSalary <= maxAllowableBase &&
      params.counterOffer.equityValueUsd <= maxAllowableEquity &&
      params.counterOffer.signingBonus <= maxAllowableSign &&
      params.leverageScore >= 75
    ) {
      return {
        verdict: 'ACCEPTED',
        revisedPackage: {
          baseSalary: params.counterOffer.baseSalary,
          equityValueUsd: params.counterOffer.equityValueUsd,
          signingBonus: params.counterOffer.signingBonus,
          totalTargetCompensation: proposedTotal,
          acceptedStatus: 'ACCEPTED',
        },
        feedbackNote: `Outstanding negotiation! Your leverage score of ${params.leverageScore} supported by verified platform telemetry warranted full executive sign-off on your requested numbers.`,
        deltaUsd,
      }
    } else if (params.counterOffer.baseSalary <= maxAllowableBase * 1.10) {
      const compromiseBase = Math.min(params.counterOffer.baseSalary, job.baseSalaryMax)
      const compromiseEquity = Math.round((params.counterOffer.equityValueUsd + job.equityAnnualUsd) / 2)
      const compromiseSign = Math.round((params.counterOffer.signingBonus + job.signingBonusUsd) / 2)
      const compromiseTotal = compromiseBase + compromiseEquity + compromiseSign

      return {
        verdict: 'PARTIALLY_ACCEPTED',
        revisedPackage: {
          baseSalary: compromiseBase,
          equityValueUsd: compromiseEquity,
          signingBonus: compromiseSign,
          totalTargetCompensation: compromiseTotal,
          acceptedStatus: 'COUNTER_PROPOSED',
        },
        feedbackNote: `We cannot fully meet the outlier ceiling on all three levers simultaneously, but executive committee approved a compromise that locks your upper-band base salary while boosting your equity grant.`,
        deltaUsd: compromiseTotal - initialTotal,
      }
    } else {
      return {
        verdict: 'REJECTED',
        revisedPackage: {
          baseSalary: job.baseSalaryMax,
          equityValueUsd: job.equityAnnualUsd,
          signingBonus: job.signingBonusUsd,
          totalTargetCompensation: job.baseSalaryMax + job.equityAnnualUsd + job.signingBonusUsd,
          acceptedStatus: 'REJECTED',
        },
        feedbackNote: `The proposed numbers exceed the structural compensation parity limits for this role tier. We must hold at our strong top-of-market offer.`,
        deltaUsd: (job.baseSalaryMax + job.equityAnnualUsd + job.signingBonusUsd) - initialTotal,
      }
    }
  }

  private synthesizePersonaResponse(params: {
    personaRole: RecruiterPersonaRole
    candidateMessage: string
    candidateName: string
    candidateElo: number
    job: Omit<SimulatedJobListing, 'matchAffinityScore' | 'matchedSkills' | 'missingSkills' | 'telemetryAlignment'>
  }): {
    content: string
    sentimentTag: 'ENTHUSIASTIC' | 'NEUTRAL' | 'CRITICAL' | 'NEGOTIATION_TIGHT'
    suggestedResponses: string[]
  } {
    const text = params.candidateMessage.toLowerCase()

    if (params.personaRole === 'EXECUTIVE_TALENT_LEAD') {
      if (text.includes('salary') || text.includes('base') || text.includes('compensation') || text.includes('equity')) {
        return {
          content: `I appreciate you laying out your expectations with clarity, ${params.candidateName}. Given your verified credentials, our compensation committee is receptive to adjusting the structure. We can pull on the equity grant or bump the upfront sign-on bonus to bridge any delta. Let's see what compromise feels optimal for you.`,
          sentimentTag: 'NEGOTIATION_TIGHT',
          suggestedResponses: [
            `I'd prefer weighting more heavily toward annual equity given my conviction in the platform.`,
            `Could we raise the base to $${(params.job.baseSalaryMax / 1000).toFixed(0)}k with an accelerated 6-month review?`,
            `Let's finalize this offer structure so I can review with my mentors.`,
          ],
        }
      }
      return {
        content: `That aligns well with how we operate. As talent lead, my priority is ensuring our engineers have unconstrained runway to innovate. Would you like to hear from David on architectural ownership or Elena on team standards?`,
        sentimentTag: 'ENTHUSIASTIC',
        suggestedResponses: [
          `I would love to speak with David on system architecture and design ownership.`,
          `Let's bring in Elena to discuss technical standards and incident culture.`,
          `Let's proceed directly to the formal compensation breakdown.`,
        ],
      }
    }

    if (params.personaRole === 'ENGINEERING_DIRECTOR') {
      return {
        content: `David Vance here. I looked closely at your systems design telemetry. What impressed me most was how you decoupled the storage plane from the consensus state machine during partition scenarios. On our team, you would own the core replication engine and lead the migration to zero-trust RPC gateways. Does that scope energize you?`,
        sentimentTag: 'ENTHUSIASTIC',
        suggestedResponses: [
          `That exact scope is why I chose this track, David. How does the team handle schema evolution during live zero-downtime upgrades?`,
          `I'd love to lead that initiative. What are the key P99 latency SLAs our downstream consumers expect?`,
          `Sounds exciting. How closely does the engineering org collaborate with SRE during chaos experiments?`,
        ],
      }
    }

    // BAR_RAISER_PRINCIPAL
    return {
      content: `Elena here. As bar raiser, I ensure every addition elevates the technical ceiling of the team. Your ${params.candidateElo} Elo in algorithmic dueling and clean asymptotic bounds demonstrate high cognitive agility. My question is: when a catastrophic production outage occurs where logs are inconclusive, what is your first mental invariant?`,
      sentimentTag: 'CRITICAL',
      suggestedResponses: [
        `I isolate the blast radius immediately, verify whether external dependencies or network partitions altered queueing dynamics, and restore deterministic steady state.`,
        `I check kernel telemetry, CPU scheduling jitter, and connection pool saturations before touching stateful storage.`,
        `I activate circuit breakers to prevent cascading downstream exhaustion while enabling omniscient trace sampling.`,
      ],
    }
  }
}

export const careerOrchestratorService = new CareerOrchestratorService()
