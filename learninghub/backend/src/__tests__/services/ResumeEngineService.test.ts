import {
  resumeEngineService,
  TargetRole,
  PlatformTelemetrySnapshot,
} from '../../services/ResumeEngineService'

describe('ResumeEngineService (Milestone 12 Anti-Gravity Resume)', () => {
  const userId = 'student-candidate-123'

  const customTelemetry: PlatformTelemetrySnapshot = {
    duelRating: {
      elo: 2350,
      tier: 'DIAMOND',
      winRate: 88.2,
      matchesPlayed: 60,
      winStreak: 12,
    },
    bktMastery: {
      totalSkillsMastered: 54,
      examReadinessScore: 96.5,
      readinessBand: 'ELITE',
      topMasteredConcepts: ['B-Trees', 'Paxos', 'Dynamic Programming', 'Merkle Proofs'],
    },
    interviewSimulation: {
      totalInterviews: 15,
      averageScore: 94.0,
      highestPercentile: 99.2,
      recommendedLevel: 'STAFF_ARCHITECT',
      strongestFactors: ['PROBLEM_SOLVING', 'SYSTEM_SCALABILITY'],
    },
    spacedRepetition: {
      cardsMastered: 210,
      retentionRate: 97.4,
      streakDays: 45,
    },
    verifiableCredentialsCount: 4,
  }

  it('should generate a complete, ATS-optimized verifiable resume', () => {
    const resume = resumeEngineService.generateResume({
      userId,
      targetRole: 'FULL_STACK_LEAD',
      telemetryOverride: customTelemetry,
    })

    expect(resume.id).toBeDefined()
    expect(resume.userId).toBe(userId)
    expect(resume.targetRole).toBe('FULL_STACK_LEAD')
    expect(resume.roleTitle).toBe('Lead Full Stack Software Engineer')
    expect(resume.profile.fullName).toBe('Alex Morgan')
    expect(resume.profile.didIdentifier).toMatch(/^did:polygon:0x/)
    expect(resume.summary.length).toBeGreaterThan(50)
    expect(resume.skillsMatrix.languages.length).toBeGreaterThan(3)
    expect(resume.projects.length).toBeGreaterThanOrEqual(3)
    expect(resume.experiences.length).toBeGreaterThanOrEqual(2)
    expect(resume.credentials.length).toBeGreaterThanOrEqual(2)
  })

  it('should tailor content and keywords specifically for Systems Architect role', () => {
    const resume = resumeEngineService.generateResume({
      userId,
      targetRole: 'SYSTEMS_ARCHITECT',
      telemetryOverride: customTelemetry,
    })

    expect(resume.roleTitle).toBe('Staff Systems Architect')
    expect(resume.profile.headline).toContain('Systems Architect')
    expect(resume.summary).toContain('Staff Architect')
    expect(resume.skillsMatrix.systemsAndCloud).toContain('Distributed Systems Architecture')
    expect(resume.atsScoring.detectedKeywords).toContain('distributed systems')
  })

  it('should tailor content and competencies for Algorithm Engineer role', () => {
    const resume = resumeEngineService.generateResume({
      userId,
      targetRole: 'ALGORITHM_ENGINEER',
      telemetryOverride: customTelemetry,
    })

    expect(resume.roleTitle).toBe('Senior Algorithmic Engineer')
    expect(resume.summary).toContain('2350+ Elo')
    expect(resume.skillsMatrix.languages).toContain('C++20')
    expect(resume.atsScoring.detectedKeywords).toContain('asymptotic')
  })

  it('should incorporate verified platform telemetry into verifiable highlights', () => {
    const resume = resumeEngineService.generateResume({
      userId,
      telemetryOverride: customTelemetry,
    })

    expect(resume.verifiedPlatformHighlights.length).toBe(4)
    const highlightString = resume.verifiedPlatformHighlights.join(' ')
    expect(highlightString).toContain('2350 Elo')
    expect(highlightString).toContain('99.2th percentile')
    expect(highlightString).toContain('96.5% Exam Readiness')
    expect(highlightString).toContain('210 flashcards')
  })

  it('should calculate an ATS compatibility score with criteria breakdown and actionable feedback', () => {
    const resume = resumeEngineService.generateResume({
      userId,
      targetRole: 'FULL_STACK_LEAD',
    })

    expect(resume.atsScoring.overallScore).toBeGreaterThanOrEqual(75)
    expect(resume.atsScoring.criteriaScores.quantifiedMetricsScore).toBeGreaterThanOrEqual(15)
    expect(resume.atsScoring.criteriaScores.actionVerbsScore).toBeGreaterThanOrEqual(15)
    expect(resume.atsScoring.criteriaScores.keywordOptimizationScore).toBeGreaterThanOrEqual(15)
    expect(resume.atsScoring.criteriaScores.formattingComplianceScore).toBe(25)
    expect(resume.atsScoring.actionableFeedback.length).toBeGreaterThanOrEqual(1)
  })

  it('should generate verifiable cryptographic digest and successfully verify authentic vs forged proofs', () => {
    const resume = resumeEngineService.generateResume({
      userId,
      targetRole: 'SYSTEMS_ARCHITECT',
    })

    const { canonicalDigestSha256, signatureHmac } = resume.cryptographicProof

    expect(canonicalDigestSha256).toBeDefined()
    expect(signatureHmac).toBeDefined()

    // Valid verification
    const verificationSuccess = resumeEngineService.verifyResumeDigest(canonicalDigestSha256, signatureHmac)
    expect(verificationSuccess.isValid).toBe(true)
    expect(verificationSuccess.statusMessage).toContain('Successful')

    // Forged digest verification
    const forgedDigest = canonicalDigestSha256.replace(/a/g, 'b')
    const verificationFailed = resumeEngineService.verifyResumeDigest(forgedDigest, signatureHmac)
    expect(verificationFailed.isValid).toBe(false)
    expect(verificationFailed.statusMessage).toContain('Failed')

    // Malformed/short signature verification should not throw RangeError
    const shortSigVerification = resumeEngineService.verifyResumeDigest(canonicalDigestSha256, 'deadbeef')
    expect(shortSigVerification.isValid).toBe(false)
    expect(shortSigVerification.statusMessage).toContain('Failed')
  })

  it('should export ATS plain text format parser string with all standard sections', () => {
    const resume = resumeEngineService.generateResume({
      userId,
      targetRole: 'FULL_STACK_LEAD',
      telemetryOverride: customTelemetry,
    })

    const atsText = resumeEngineService.formatATSPlainText(resume)

    expect(atsText).toContain('ALEX MORGAN')
    expect(atsText).toContain('PROFESSIONAL SUMMARY')
    expect(atsText).toContain('VERIFIED TECHNICAL COMPETENCIES & PLATFORM TELEMETRY')
    expect(atsText).toContain('CORE TECHNICAL SKILLS')
    expect(atsText).toContain('TECHNICAL PROJECTS & SYSTEMS ARCHITECTURE')
    expect(atsText).toContain('PROFESSIONAL EXPERIENCE')
    expect(atsText).toContain('W3C VERIFIABLE CREDENTIALS')
    expect(atsText).toContain('HMAC Signature:')
  })

  it('should format schema.org compliant JSON Resume standard', () => {
    const resume = resumeEngineService.generateResume({
      userId,
      targetRole: 'FULL_STACK_LEAD',
      telemetryOverride: customTelemetry,
    })

    const jsonResume = resumeEngineService.formatJSONResume(resume)

    expect(jsonResume.basics.name).toBe('Alex Morgan')
    expect(jsonResume.work.length).toBeGreaterThanOrEqual(2)
    expect(jsonResume.projects.length).toBeGreaterThanOrEqual(3)
    expect(jsonResume.skills.length).toBeGreaterThanOrEqual(4)
    expect(jsonResume.certificates.length).toBeGreaterThanOrEqual(2)
    expect(jsonResume.meta.canonicalDigest).toBe(resume.cryptographicProof.canonicalDigestSha256)
  })

  it('should format a compile-ready ATS LaTeX resume document with escaping and watermark', () => {
    const resume = resumeEngineService.generateResume({
      userId,
      targetRole: 'SYSTEMS_ARCHITECT',
      telemetryOverride: customTelemetry,
    })

    const latex = resumeEngineService.formatLatexResume(resume)

    expect(latex).toContain('\\documentclass[letterpaper,10pt]{article}')
    expect(latex).toContain('\\begin{document}')
    expect(latex).toContain('Staff Systems Architect')
    expect(latex).toContain('\\section{Technical Skills}')
    expect(latex).toContain('\\section{Key Projects \\& Architecture}')
    expect(latex).toContain('Tamper-Proof Cryptographic Verification Digest')
    expect(latex).toContain('\\end{document}')
  })

  it('should parse LinkedIn profile data from raw text or JSON and extract skills', () => {
    const rawText = `Jane Doe
Staff Engineer at TechCorp
jane.doe@example.com
https://linkedin.com/in/janedoe
Experienced in TypeScript, Python, Kubernetes, and Distributed Systems.`

    const parsedFromText = resumeEngineService.importLinkedInProfile({ rawText })
    expect(parsedFromText.profile.fullName).toBe('Jane Doe')
    expect(parsedFromText.profile.email).toBe('jane.doe@example.com')
    expect(parsedFromText.profile.linkedinUrl).toBe('https://linkedin.com/in/janedoe')
    expect(parsedFromText.importedSkills).toContain('TypeScript')
    expect(parsedFromText.importedSkills).toContain('Kubernetes')
    expect(parsedFromText.importedSkills).toContain('Distributed Systems')

    const parsedFromJson = resumeEngineService.importLinkedInProfile({
      linkedInJson: {
        name: 'Jane Doe',
        headline: 'Principal Architect',
        skills: ['Rust', 'PostgreSQL', 'Docker'],
      },
    })
    expect(parsedFromJson.profile.fullName).toBe('Jane Doe')
    expect(parsedFromJson.profile.headline).toBe('Principal Architect')
    expect(parsedFromJson.importedSkills).toEqual(['Rust', 'PostgreSQL', 'Docker'])
  })

  it('should anchor resume to IPFS CIDv1 and Polygon PoS with cryptographic transaction hash', () => {
    const resume = resumeEngineService.generateResume({
      userId,
      targetRole: 'FULL_STACK_LEAD',
    })

    const anchor = resumeEngineService.anchorToIpfsAndChain(resume)

    expect(anchor.ipfsCid).toMatch(/^bafybeig/)
    expect(anchor.polygonTxHash).toMatch(/^0x[a-f0-9]{64}$/)
    expect(anchor.blockNumber).toBeGreaterThan(58000000)
    expect(anchor.explorerUrl).toContain('https://polygonscan.com/tx/0x')
  })
})

