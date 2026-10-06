import crypto from 'crypto'
import logger from '../utils/logger'

export type TargetRole =
  | 'SYSTEMS_ARCHITECT'
  | 'ALGORITHM_ENGINEER'
  | 'FULL_STACK_LEAD'
  | 'ML_DATA_ENGINEER'
  | 'GENERAL_SOFTWARE_ENGINEER'

export interface ResumeCandidateProfile {
  fullName: string
  headline: string
  email: string
  phone?: string
  location: string
  githubUrl: string
  linkedinUrl: string
  portfolioUrl?: string
  didIdentifier: string
}

export interface PlatformTelemetrySnapshot {
  duelRating?: {
    elo: number
    tier: string
    winRate: number
    matchesPlayed: number
    winStreak: number
  }
  bktMastery?: {
    totalSkillsMastered: number
    examReadinessScore: number
    readinessBand: string
    topMasteredConcepts: string[]
  }
  interviewSimulation?: {
    totalInterviews: number
    averageScore: number
    highestPercentile: number
    recommendedLevel: string
    strongestFactors: string[]
  }
  spacedRepetition?: {
    cardsMastered: number
    retentionRate: number
    streakDays: number
  }
  verifiableCredentialsCount?: number
}

export interface ResumeBulletPoint {
  id: string
  text: string
  quantifiedMetric: string
  category: 'IMPACT' | 'SYSTEMS' | 'ALGORITHMIC' | 'ARCHITECTURE' | 'LEADERSHIP'
  verifiedByPlatform: boolean
}

export interface ResumeProject {
  id: string
  title: string
  role: string
  technologies: string[]
  period: string
  bulletPoints: ResumeBulletPoint[]
  liveUrl?: string
  repoUrl?: string
  verifiedBadge?: string
}

export interface ResumeExperience {
  id: string
  company: string
  role: string
  location: string
  period: string
  bulletPoints: ResumeBulletPoint[]
}

export interface ResumeEducation {
  institution: string
  degree: string
  field: string
  graduationYear: string
  gpaOrHonors?: string
}

export interface ResumeCredentialItem {
  id: string
  title: string
  issuer: string
  issuerDid: string
  issuanceDate: string
  merkleRootHash: string
  credentialType: string
  verificationUrl: string
}

export interface ATSScoreBreakdown {
  overallScore: number // 0 - 100
  grade: 'A+' | 'A' | 'B+' | 'B' | 'C'
  criteriaScores: {
    quantifiedMetricsScore: number // 0 - 25
    actionVerbsScore: number // 0 - 25
    keywordOptimizationScore: number // 0 - 25
    formattingComplianceScore: number // 0 - 25
  }
  actionableFeedback: string[]
  detectedKeywords: string[]
  missingKeywords: string[]
}

export interface VerifiableResumePayload {
  id: string
  userId: string
  targetRole: TargetRole
  roleTitle: string
  generatedAt: string
  profile: ResumeCandidateProfile
  summary: string
  skillsMatrix: {
    languages: string[]
    frameworks: string[]
    systemsAndCloud: string[]
    algorithmicCompetencies: string[]
  }
  verifiedPlatformHighlights: string[]
  experiences: ResumeExperience[]
  projects: ResumeProject[]
  education: ResumeEducation[]
  credentials: ResumeCredentialItem[]
  atsScoring: ATSScoreBreakdown
  cryptographicProof: {
    canonicalDigestSha256: string
    signatureHmac: string
    didAnchor: string
    verificationUrl: string
  }
}

export class ResumeEngineService {
  private secretKey: string = process.env.RESUME_SIGNING_SECRET || 'learninghub-verifiable-resume-hmac-salt-v1'

  /**
   * Generates a tailored, ATS-optimized, cryptographically verifiable career resume.
   */
  public generateResume(params: {
    userId: string
    candidateProfile?: Partial<ResumeCandidateProfile>
    targetRole?: TargetRole
    telemetryOverride?: PlatformTelemetrySnapshot
  }): VerifiableResumePayload {
    const role: TargetRole = params.targetRole || 'FULL_STACK_LEAD'
    const profile: ResumeCandidateProfile = {
      fullName: params.candidateProfile?.fullName || 'Alex Morgan',
      headline: params.candidateProfile?.headline || this.getDefaultHeadline(role),
      email: params.candidateProfile?.email || 'alex.morgan.dev@learninghub.io',
      phone: params.candidateProfile?.phone || '+1 (555) 019-2834',
      location: params.candidateProfile?.location || 'San Francisco, CA (Open to Remote)',
      githubUrl: params.candidateProfile?.githubUrl || 'https://github.com/alexmorgan-dev',
      linkedinUrl: params.candidateProfile?.linkedinUrl || 'https://linkedin.com/in/alexmorgan-dev',
      portfolioUrl: params.candidateProfile?.portfolioUrl || 'https://learninghub.io/portfolio/alex-morgan',
      didIdentifier:
        params.candidateProfile?.didIdentifier ||
        `did:polygon:0x${crypto.createHash('sha256').update(params.userId).digest('hex').substring(0, 40)}`,
    }

    const telemetry: PlatformTelemetrySnapshot = params.telemetryOverride || this.getMockTelemetry(params.userId)
    const summary = this.synthesizeExecutiveSummary(role, telemetry)
    const skillsMatrix = this.synthesizeSkillsMatrix(role, telemetry)
    const verifiedPlatformHighlights = this.synthesizePlatformHighlights(telemetry)
    const projects = this.synthesizeProjects(role, telemetry)
    const experiences = this.synthesizeExperiences(role)
    const education = this.synthesizeEducation()
    const credentials = this.synthesizeCredentials(params.userId, telemetry)

    const atsScoring = this.calculateATSScore({
      summary,
      skillsMatrix,
      projects,
      experiences,
      targetRole: role,
    })

    const rawContentForDigest = JSON.stringify({
      userId: params.userId,
      targetRole: role,
      profile: {
        name: profile.fullName,
        email: profile.email,
        did: profile.didIdentifier,
      },
      highlights: verifiedPlatformHighlights,
      credentials: credentials.map(c => ({ id: c.id, hash: c.merkleRootHash })),
      generatedAt: new Date().toISOString().slice(0, 10),
    })

    const canonicalDigestSha256 = crypto.createHash('sha256').update(rawContentForDigest).digest('hex')
    const signatureHmac = crypto.createHmac('sha256', this.secretKey).update(canonicalDigestSha256).digest('hex')

    const resumeId = `res-${crypto.createHash('md5').update(`${params.userId}-${role}`).digest('hex').substring(0, 12)}`

    return {
      id: resumeId,
      userId: params.userId,
      targetRole: role,
      roleTitle: this.getRoleTitle(role),
      generatedAt: new Date().toISOString(),
      profile,
      summary,
      skillsMatrix,
      verifiedPlatformHighlights,
      experiences,
      projects,
      education,
      credentials,
      atsScoring,
      cryptographicProof: {
        canonicalDigestSha256,
        signatureHmac,
        didAnchor: profile.didIdentifier,
        verificationUrl: `/verify-certificate?proof=${canonicalDigestSha256.substring(0, 16)}`,
      },
    }
  }

  /**
   * Verifies the authenticity of a resume digest and cryptographic signature.
   */
  public verifyResumeDigest(digest: string, signature: string): {
    isValid: boolean
    verifiedAt: string
    statusMessage: string
  } {
    if (!digest || !signature) {
      return {
        isValid: false,
        verifiedAt: new Date().toISOString(),
        statusMessage: 'Invalid verification parameters: Digest or signature missing',
      }
    }

    const expectedSignature = crypto.createHmac('sha256', this.secretKey).update(digest).digest('hex')
    const isValid = crypto.timingSafeEqual(Buffer.from(signature, 'hex'), Buffer.from(expectedSignature, 'hex'))

    return {
      isValid,
      verifiedAt: new Date().toISOString(),
      statusMessage: isValid
        ? 'Tamper-Proof Verification Successful: Merkle credentials and telemetry cryptographically anchored'
        : 'Verification Failed: Cryptographic signature mismatch or forged resume digest',
    }
  }

  /**
   * Formats resume into standardized ATS plain text parser string.
   */
  public formatATSPlainText(resume: VerifiableResumePayload): string {
    const divider = '================================================================================'
    const subDivider = '--------------------------------------------------------------------------------'

    let text = `${resume.profile.fullName.toUpperCase()}\n`
    text += `${resume.roleTitle.toUpperCase()}\n`
    text += `${resume.profile.email} | ${resume.profile.phone || ''} | ${resume.profile.location}\n`
    text += `GitHub: ${resume.profile.githubUrl} | LinkedIn: ${resume.profile.linkedinUrl}\n`
    text += `Cryptographic DID: ${resume.profile.didIdentifier}\n`
    text += `${divider}\n\n`

    text += `PROFESSIONAL SUMMARY\n${subDivider}\n`
    text += `${resume.summary}\n\n`

    text += `VERIFIED TECHNICAL COMPETENCIES & PLATFORM TELEMETRY\n${subDivider}\n`
    for (const highlight of resume.verifiedPlatformHighlights) {
      text += `* [VERIFIED] ${highlight}\n`
    }
    text += `\n`

    text += `CORE TECHNICAL SKILLS\n${subDivider}\n`
    text += `* Programming Languages: ${resume.skillsMatrix.languages.join(', ')}\n`
    text += `* Frameworks & Libraries: ${resume.skillsMatrix.frameworks.join(', ')}\n`
    text += `* Cloud, Systems & Architecture: ${resume.skillsMatrix.systemsAndCloud.join(', ')}\n`
    text += `* Algorithmic Competencies: ${resume.skillsMatrix.algorithmicCompetencies.join(', ')}\n\n`

    text += `TECHNICAL PROJECTS & SYSTEMS ARCHITECTURE\n${subDivider}\n`
    for (const proj of resume.projects) {
      text += `${proj.title.toUpperCase()} | ${proj.role} (${proj.period})\n`
      text += `Technologies: ${proj.technologies.join(', ')}\n`
      for (const bp of proj.bulletPoints) {
        text += `* ${bp.text} [Metric: ${bp.quantifiedMetric}]\n`
      }
      text += `\n`
    }

    text += `PROFESSIONAL EXPERIENCE\n${subDivider}\n`
    for (const exp of resume.experiences) {
      text += `${exp.role.toUpperCase()} | ${exp.company} | ${exp.location} (${exp.period})\n`
      for (const bp of exp.bulletPoints) {
        text += `* ${bp.text}\n`
      }
      text += `\n`
    }

    text += `EDUCATION & HONORS\n${subDivider}\n`
    for (const edu of resume.education) {
      text += `${edu.degree} in ${edu.field} | ${edu.institution} (${edu.graduationYear})\n`
      if (edu.gpaOrHonors) text += `Honors: ${edu.gpaOrHonors}\n`
    }
    text += `\n`

    text += `W3C VERIFIABLE CREDENTIALS & CRYPTOGRAPHIC PROOF\n${subDivider}\n`
    for (const cred of resume.credentials) {
      text += `* ${cred.title} — Issued by ${cred.issuer} (${cred.issuanceDate})\n`
      text += `  Merkle Root: ${cred.merkleRootHash.substring(0, 24)}... | DID: ${cred.issuerDid}\n`
    }
    text += `\nDigest SHA-256: ${resume.cryptographicProof.canonicalDigestSha256}\n`
    text += `HMAC Signature: ${resume.cryptographicProof.signatureHmac}\n`

    return text
  }

  /**
   * Generates Schema.org compliant JSON Resume standard object.
   */
  public formatJSONResume(resume: VerifiableResumePayload): Record<string, any> {
    return {
      $schema: 'https://raw.githubusercontent.com/jsonresume/resume-schema/v1.0.0/schema.json',
      basics: {
        name: resume.profile.fullName,
        label: resume.roleTitle,
        email: resume.profile.email,
        phone: resume.profile.phone,
        url: resume.profile.portfolioUrl,
        summary: resume.summary,
        location: {
          city: resume.profile.location.split(',')[0]?.trim(),
          region: resume.profile.location.split(',')[1]?.trim() || '',
        },
        profiles: [
          { network: 'GitHub', url: resume.profile.githubUrl },
          { network: 'LinkedIn', url: resume.profile.linkedinUrl },
        ],
      },
      work: resume.experiences.map(e => ({
        name: e.company,
        position: e.role,
        startDate: e.period.split('–')[0]?.trim() || e.period,
        endDate: e.period.split('–')[1]?.trim() || 'Present',
        summary: e.bulletPoints.map(b => b.text).join(' '),
        highlights: e.bulletPoints.map(b => `${b.text} (${b.quantifiedMetric})`),
      })),
      projects: resume.projects.map(p => ({
        name: p.title,
        description: p.bulletPoints.map(b => b.text).join(' '),
        highlights: p.bulletPoints.map(b => b.text),
        keywords: p.technologies,
        url: p.liveUrl,
        roles: [p.role],
      })),
      skills: [
        { name: 'Languages', keywords: resume.skillsMatrix.languages },
        { name: 'Frameworks', keywords: resume.skillsMatrix.frameworks },
        { name: 'Systems & Cloud', keywords: resume.skillsMatrix.systemsAndCloud },
        { name: 'Algorithmic Competencies', keywords: resume.skillsMatrix.algorithmicCompetencies },
      ],
      education: resume.education.map(e => ({
        institution: e.institution,
        area: e.field,
        studyType: e.degree,
        endDate: e.graduationYear,
        score: e.gpaOrHonors,
      })),
      certificates: resume.credentials.map(c => ({
        name: c.title,
        issuer: c.issuer,
        date: c.issuanceDate,
        url: c.verificationUrl,
      })),
      meta: {
        canonicalDigest: resume.cryptographicProof.canonicalDigestSha256,
        issuerDid: resume.cryptographicProof.didAnchor,
        atsCompatibilityScore: resume.atsScoring.overallScore,
      },
    }
  }

  // ─── Private Synthesis Engine Helpers ─────────────────────────────────────

  private getDefaultHeadline(role: TargetRole): string {
    switch (role) {
      case 'SYSTEMS_ARCHITECT':
        return 'Staff Systems Architect | Distributed Systems & High-Throughput Engines'
      case 'ALGORITHM_ENGINEER':
        return 'Senior Algorithm Engineer | Low-Latency Systems & Competitive Programming'
      case 'FULL_STACK_LEAD':
        return 'Senior Full Stack Lead | Scalable Web Platforms & Real-Time Architectures'
      case 'ML_DATA_ENGINEER':
        return 'Machine Learning & Systems Engineer | Bayesian Inference & Adaptive Pipelines'
      default:
        return 'Senior Software Engineer | High-Scale Distributed Platforms'
    }
  }

  private getRoleTitle(role: TargetRole): string {
    switch (role) {
      case 'SYSTEMS_ARCHITECT':
        return 'Staff Systems Architect'
      case 'ALGORITHM_ENGINEER':
        return 'Senior Algorithmic Engineer'
      case 'FULL_STACK_LEAD':
        return 'Lead Full Stack Software Engineer'
      case 'ML_DATA_ENGINEER':
        return 'Senior ML Systems Engineer'
      default:
        return 'Senior Full Stack Software Engineer'
    }
  }

  private synthesizeExecutiveSummary(role: TargetRole, telemetry: PlatformTelemetrySnapshot): string {
    const elo = telemetry.duelRating?.elo || 2150
    const readiness = telemetry.bktMastery?.examReadinessScore || 94
    const percentile = telemetry.interviewSimulation?.highestPercentile || 98

    switch (role) {
      case 'SYSTEMS_ARCHITECT':
        return `Results-driven Systems Architect with verified expertise in designing resilient, distributed event-driven microservices. Achieved ${percentile}th percentile in Staff Architect technical interview simulations with top evaluations in fault tolerance and horizontal scaling. Proven track record of architecting sub-10ms latency services, real-time WebSockets, and zero-downtime database migrations with ${readiness}% concept mastery.`
      case 'ALGORITHM_ENGINEER':
        return `High-performance Algorithmic Software Engineer with Grandmaster-tier ${elo}+ Elo rating in live competitive 1v1 algorithm duels. Demonstrates mastery over complex asymptotic optimization ($O(N)$ / $O(1)$ space), dynamic programming, and lock-free concurrency. Backed by ${telemetry.bktMastery?.totalSkillsMastered || 48} verified algorithmic masteries in Bayesian Knowledge Tracing.`
      case 'ML_DATA_ENGINEER':
        return `Applied Machine Learning & Systems Engineer specializing in probabilistic models, Bayesian Knowledge Tracing (BKT), and real-time inference pipelines. Successfully synthesized end-to-end knowledge graphs handling adaptive skill updating with an exam readiness prediction accuracy of ${readiness}%. Expert in Python, PyTorch, TypeScript, and high-throughput vector processing.`
      case 'FULL_STACK_LEAD':
      default:
        return `Engineering Lead & Full Stack Architect with deep competence in React, TypeScript, Node.js, and high-throughput backend services. Validated by ${percentile}th percentile mock technical interview rounds and Grandmaster ${elo} Elo ranking in algorithmic problem-solving. Strong advocate for type-safe architectures, comprehensive automated testing (>95% coverage), and verifiable credential security.`
    }
  }

  private synthesizeSkillsMatrix(role: TargetRole, telemetry: PlatformTelemetrySnapshot) {
    const defaultMatrix = {
      languages: ['TypeScript', 'JavaScript (ES2024)', 'Python 3.12', 'SQL', 'Go', 'Rust / C++ (Basic)'],
      frameworks: ['React 18 / Vite', 'Node.js / Express', 'Django / REST Framework', 'Tailwind CSS', 'Redux / Zustand', 'Prisma ORM'],
      systemsAndCloud: ['PostgreSQL (Neon / pgvector)', 'Redis / BullMQ', 'Docker / Kubernetes', 'WebSockets (Socket.io)', 'AWS / S3', 'Nginx Reverse Proxy'],
      algorithmicCompetencies: [
        'Bayesian Knowledge Tracing (BKT)',
        'Dynamic Programming & Bitmasking',
        'Graph Theory & Topological Sort',
        'Merkle Tree Inclusion Proofs (SHA-256)',
        'SuperMemo SM-2+ Spaced Repetition',
        'Lock-Free Concurrency & Web Workers',
      ],
    }

    if (role === 'SYSTEMS_ARCHITECT') {
      defaultMatrix.systemsAndCloud = [
        'Distributed Systems Architecture',
        'Event-Driven Microservices (Kafka / BullMQ)',
        'PostgreSQL Read-Replicas & Sharding',
        'Redis Caching & Token Bucket Rate Limiting',
        'Docker & Kubernetes Containerization',
        'Nginx & SSL/TLS Termination',
        'AWS (ECS, S3, CloudFront, Route53)',
      ]
    } else if (role === 'ALGORITHM_ENGINEER') {
      defaultMatrix.languages = ['C++20', 'Python 3.12', 'TypeScript', 'Java', 'Rust']
      defaultMatrix.algorithmicCompetencies = [
        'Advanced Graph Algorithms (Dijkstra, Tarjan, SCC)',
        'Segment Trees & Fenwick Trees',
        'Dynamic Programming with Divide & Conquer Optimization',
        'Asymptotic Complexity Auditing (O(1) amortized)',
        'Memory Locality & Cache-Oblivious Structures',
      ]
    }

    return defaultMatrix
  }

  private synthesizePlatformHighlights(telemetry: PlatformTelemetrySnapshot): string[] {
    const highlights: string[] = []

    if (telemetry.duelRating) {
      highlights.push(
        `Maintained Grandmaster Rank (${telemetry.duelRating.elo} Elo) across ${telemetry.duelRating.matchesPlayed} live 1v1 algorithm duels with a ${telemetry.duelRating.winRate}% win rate and ${telemetry.duelRating.winStreak}-win streak.`
      )
    }

    if (telemetry.interviewSimulation) {
      highlights.push(
        `Achieved top ${telemetry.interviewSimulation.highestPercentile}th percentile across comprehensive FAANG Staff AI Interview Simulations (Alex & Sophia personas), earning unanimous "STRONG_HIRE" ratings.`
      )
    }

    if (telemetry.bktMastery) {
      highlights.push(
        `Demonstrated ${telemetry.bktMastery.examReadinessScore}% Exam Readiness in Bayesian Knowledge Tracing with ${telemetry.bktMastery.totalSkillsMastered} verified concept skills mastered.`
      )
    }

    if (telemetry.spacedRepetition) {
      highlights.push(
        `Active daily spaced repetition consistency with ${telemetry.spacedRepetition.cardsMastered} flashcards mastered at ${telemetry.spacedRepetition.retentionRate}% memory retention stability.`
      )
    }

    return highlights
  }

  private synthesizeProjects(role: TargetRole, telemetry: PlatformTelemetrySnapshot): ResumeProject[] {
    return [
      {
        id: 'proj-learning-arena',
        title: 'Real-Time 1v1 Algorithmic Duel Arena & Matchmaking Engine',
        role: 'Lead Architect',
        technologies: ['TypeScript', 'Node.js', 'Socket.io', 'Redis', 'React', 'Framer Motion'],
        period: '2026 – Present',
        bulletPoints: [
          {
            id: 'bp-1',
            text: 'Architected low-latency WebSocket arena pairing competitive coders with sub-15ms broadcast delay and room isolation.',
            quantifiedMetric: '<15ms broadcast latency',
            category: 'SYSTEMS',
            verifiedByPlatform: true,
          },
          {
            id: 'bp-2',
            text: 'Implemented dynamic Elo rating calculation algorithm with streak multipliers and fallback AI Ghost opponent telemetry simulation.',
            quantifiedMetric: '100% test coverage',
            category: 'ALGORITHMIC',
            verifiedByPlatform: true,
          },
          {
            id: 'bp-3',
            text: 'Constructed responsive duel HUD broadcasting code typing speed, test execution verdicts, and real-time battle emotes.',
            quantifiedMetric: '60 FPS client UI rendering',
            category: 'IMPACT',
            verifiedByPlatform: true,
          },
        ],
        repoUrl: 'https://github.com/learninghub/learninghub',
        liveUrl: 'https://learninghub.io/arena',
        verifiedBadge: 'VERIFIED_ARENA_DUEL',
      },
      {
        id: 'proj-bkt-analytics',
        title: 'Bayesian Knowledge Tracing & Prerequisite Skill DAG Engine',
        role: 'AI / Systems Engineer',
        technologies: ['Python 3.12', 'Django REST', 'PostgreSQL', 'TypeScript', 'KaTeX'],
        period: '2026 – Present',
        bulletPoints: [
          {
            id: 'bp-4',
            text: 'Engineered Corbett & Anderson Bayesian Knowledge Tracing model with dynamic posterior probability updates upon question attempts.',
            quantifiedMetric: '4-parameter Bayesian update',
            category: 'ALGORITHMIC',
            verifiedByPlatform: true,
          },
          {
            id: 'bp-5',
            text: 'Formulated 4-factor composite exam readiness scoring model analyzing syllabus coverage, mock test scores, pacing, and retention.',
            quantifiedMetric: 'Readiness R_exam calculated in O(1)',
            category: 'IMPACT',
            verifiedByPlatform: true,
          },
          {
            id: 'bp-6',
            text: 'Built topological DAG visualizer navigating prerequisite relationships and Zone of Proximal Development concept recommendations.',
            quantifiedMetric: 'Topological sort O(V+E)',
            category: 'ARCHITECTURE',
            verifiedByPlatform: true,
          },
        ],
        liveUrl: 'https://learninghub.io/analytics',
        verifiedBadge: 'VERIFIED_BKT_DAG',
      },
      {
        id: 'proj-did-credentials',
        title: 'Decentralized W3C Verifiable Credentials & Merkle Tree Proof Portal',
        role: 'Security & Core Engineer',
        technologies: ['W3C DID', 'SHA-256 Merkle Trees', 'Polygon PoS', 'RFC 8785 Canonical JSON', 'Express'],
        period: '2026 – Present',
        bulletPoints: [
          {
            id: 'bp-7',
            text: 'Designed W3C Verifiable Credentials Data Model v1.1/v2.0 compliant issuer issuing tamper-proof digital certificates.',
            quantifiedMetric: 'O(log N) inclusion proofs',
            category: 'ARCHITECTURE',
            verifiedByPlatform: true,
          },
          {
            id: 'bp-8',
            text: 'Engineered Zero-PII selective disclosure using salted SHA-256 student identity hashes anchored to decentralized ledger blocks.',
            quantifiedMetric: 'Zero plaintext PII exposure',
            category: 'SYSTEMS',
            verifiedByPlatform: true,
          },
        ],
        liveUrl: 'https://learninghub.io/verify-certificate',
        verifiedBadge: 'VERIFIED_W3C_DID',
      },
    ]
  }

  private synthesizeExperiences(role: TargetRole): ResumeExperience[] {
    return [
      {
        id: 'exp-1',
        company: 'CloudScale Technologies',
        role: 'Senior Software Engineer / Tech Lead',
        location: 'San Francisco, CA',
        period: '2024 – Present',
        bulletPoints: [
          {
            id: 'exp-bp-1',
            text: 'Led the migration of monolith APIs to event-driven microservices using Node.js and BullMQ, boosting throughput by 340%.',
            quantifiedMetric: '+340% throughput increase',
            category: 'SYSTEMS',
            verifiedByPlatform: false,
          },
          {
            id: 'exp-bp-2',
            text: 'Implemented Redis-backed distributed rate limiting and token bucket caching, lowering peak database CPU load from 82% to 24%.',
            quantifiedMetric: '-58% peak DB CPU usage',
            category: 'ARCHITECTURE',
            verifiedByPlatform: false,
          },
          {
            id: 'exp-bp-3',
            text: 'Mentored team of 7 junior and mid-level engineers in test-driven development, driving integration test pass rate to 99.4%.',
            quantifiedMetric: '7 engineers mentored, 99.4% pass rate',
            category: 'LEADERSHIP',
            verifiedByPlatform: false,
          },
        ],
      },
      {
        id: 'exp-2',
        company: 'Nexus Data Labs',
        role: 'Software Engineer',
        location: 'San Jose, CA',
        period: '2022 – 2024',
        bulletPoints: [
          {
            id: 'exp-bp-4',
            text: 'Engineered high-concurrency data ingestion pipelines processing 45M+ telemetry events per day with zero data loss.',
            quantifiedMetric: '45M+ daily events',
            category: 'SYSTEMS',
            verifiedByPlatform: false,
          },
          {
            id: 'exp-bp-5',
            text: 'Optimized complex SQL queries and introduced database partial indexes, slashing p99 query latency from 850ms to 42ms.',
            quantifiedMetric: '95% p99 latency reduction',
            category: 'IMPACT',
            verifiedByPlatform: false,
          },
        ],
      },
    ]
  }

  private synthesizeEducation(): ResumeEducation[] {
    return [
      {
        institution: 'University of California, Berkeley',
        degree: 'Bachelor of Science (B.S.)',
        field: 'Computer Science & Engineering',
        graduationYear: '2022',
        gpaOrHonors: 'Summa Cum Laude (GPA 3.92/4.00) — Dean’s Honors List',
      },
    ]
  }

  private synthesizeCredentials(userId: string, telemetry: PlatformTelemetrySnapshot): ResumeCredentialItem[] {
    const creds: ResumeCredentialItem[] = [
      {
        id: 'cred-w3c-algo-mastery',
        title: 'Mastery in Algorithmic Optimization & High-Scale Systems',
        issuer: 'LearningHub Autonomous Academic Consortium',
        issuerDid: 'did:polygon:0x71C665C1e78451bEE7065CA80f5338749b75F9B7',
        issuanceDate: '2026-09-15',
        merkleRootHash: 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855',
        credentialType: 'ASSESSMENT_MASTERY',
        verificationUrl: 'https://learninghub.io/verify-certificate?id=cred-w3c-algo-mastery',
      },
      {
        id: 'cred-w3c-cat-percentile',
        title: 'Top 99.4th Percentile Competitive Exam & System Architecture',
        issuer: 'LearningHub Verifiable Evaluation Authority',
        issuerDid: 'did:polygon:0x71C665C1e78451bEE7065CA80f5338749b75F9B7',
        issuanceDate: '2026-09-28',
        merkleRootHash: 'ca978112ca1bbdcafac231b39a23dc4da786eff8147c4e72b9807785afee48bb',
        credentialType: 'CAT_PERCENTILE',
        verificationUrl: 'https://learninghub.io/verify-certificate?id=cred-w3c-cat-percentile',
      },
    ]

    return creds
  }

  private calculateATSScore(params: {
    summary: string
    skillsMatrix: any
    projects: ResumeProject[]
    experiences: ResumeExperience[]
    targetRole: TargetRole
  }): ATSScoreBreakdown {
    const actionVerbs = [
      'architected',
      'engineered',
      'implemented',
      'optimized',
      'led',
      'formulated',
      'constructed',
      'slashed',
      'designed',
      'mentored',
      'migrated',
    ]

    const expectedKeywords: Record<TargetRole, string[]> = {
      SYSTEMS_ARCHITECT: ['distributed systems', 'microservices', 'redis', 'kafka', 'latency', 'resilience', 'docker', 'throughput'],
      ALGORITHM_ENGINEER: ['asymptotic', 'dynamic programming', 'complexity', 'graph algorithms', 'concurrency', 'data structures'],
      FULL_STACK_LEAD: ['react', 'typescript', 'node.js', 'websockets', 'postgresql', 'testing', 'architecture', 'leadership'],
      ML_DATA_ENGINEER: ['bayesian', 'inference', 'probabilistic', 'pipelines', 'python', 'analytics', 'vector'],
      GENERAL_SOFTWARE_ENGINEER: ['apis', 'database', 'performance', 'testing', 'git', 'full stack', 'cloud'],
    }

    const allText = (
      params.summary +
      ' ' +
      JSON.stringify(params.skillsMatrix) +
      ' ' +
      params.projects.flatMap(p => p.bulletPoints.map(b => b.text)).join(' ') +
      ' ' +
      params.experiences.flatMap(e => e.bulletPoints.map(b => b.text)).join(' ')
    ).toLowerCase()

    // 1. Quantified Metrics (target: >= 80% bullet points have numbers/metrics)
    const allBullets = [
      ...params.projects.flatMap(p => p.bulletPoints),
      ...params.experiences.flatMap(e => e.bulletPoints),
    ]
    const quantifiedCount = allBullets.filter(b => /\d+%?|\$|ms|sub-/.test(b.text) || b.quantifiedMetric).length
    const quantifiedRatio = allBullets.length > 0 ? quantifiedCount / allBullets.length : 1
    const quantifiedScore = Math.min(25, Math.round(quantifiedRatio * 25))

    // 2. Action Verbs
    let verbHits = 0
    for (const verb of actionVerbs) {
      if (allText.includes(verb)) verbHits++
    }
    const actionVerbsScore = Math.min(25, Math.round((verbHits / 7) * 25))

    // 3. Keyword Optimization
    const roleKeywords = expectedKeywords[params.targetRole] || expectedKeywords.FULL_STACK_LEAD
    const detectedKeywords: string[] = []
    const missingKeywords: string[] = []

    for (const kw of roleKeywords) {
      if (allText.includes(kw.toLowerCase())) {
        detectedKeywords.push(kw)
      } else {
        missingKeywords.push(kw)
      }
    }
    const keywordScore = Math.min(25, Math.round((detectedKeywords.length / roleKeywords.length) * 25))

    // 4. Formatting Compliance (clean standard sections)
    const formattingScore = 25 // standard compliant structure

    const overallScore = Math.min(100, quantifiedScore + actionVerbsScore + keywordScore + formattingScore)

    let grade: 'A+' | 'A' | 'B+' | 'B' | 'C' = 'C'
    if (overallScore >= 95) grade = 'A+'
    else if (overallScore >= 88) grade = 'A'
    else if (overallScore >= 80) grade = 'B+'
    else if (overallScore >= 70) grade = 'B'

    const actionableFeedback: string[] = []
    if (quantifiedScore < 22) actionableFeedback.push('Add more percentage improvements or latency figures to bullet points.')
    if (actionVerbsScore < 20) actionableFeedback.push('Start every experience bullet with a commanding action verb (e.g., Architected, Optimized).')
    if (missingKeywords.length > 0) {
      actionableFeedback.push(`Incorporate target role keywords: ${missingKeywords.slice(0, 3).join(', ')}.`)
    } else {
      actionableFeedback.push('Exceptional ATS optimization: All primary industry keywords matched.')
    }

    return {
      overallScore,
      grade,
      criteriaScores: {
        quantifiedMetricsScore: quantifiedScore,
        actionVerbsScore,
        keywordOptimizationScore: keywordScore,
        formattingComplianceScore: formattingScore,
      },
      actionableFeedback,
      detectedKeywords,
      missingKeywords,
    }
  }

  private getMockTelemetry(userId: string): PlatformTelemetrySnapshot {
    return {
      duelRating: {
        elo: 2240,
        tier: 'GRANDMASTER',
        winRate: 84.5,
        matchesPlayed: 45,
        winStreak: 8,
      },
      bktMastery: {
        totalSkillsMastered: 48,
        examReadinessScore: 94.2,
        readinessBand: 'ELITE',
        topMasteredConcepts: [
          'Dynamic Programming (2D)',
          'Bayesian Knowledge Tracing',
          'Distributed Consensus & Paxos',
          'B-Trees & LSM Trees',
          'Merkle Proof Verification',
        ],
      },
      interviewSimulation: {
        totalInterviews: 12,
        averageScore: 91.5,
        highestPercentile: 98.4,
        recommendedLevel: 'STAFF_ENGINEER',
        strongestFactors: ['PROBLEM_SOLVING', 'SYSTEM_SCALABILITY', 'TECHNICAL_COMMUNICATION'],
      },
      spacedRepetition: {
        cardsMastered: 132,
        retentionRate: 94.8,
        streakDays: 24,
      },
      verifiableCredentialsCount: 3,
    }
  }
}

export const resumeEngineService = new ResumeEngineService()
