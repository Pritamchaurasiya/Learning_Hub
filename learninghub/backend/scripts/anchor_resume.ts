import { ResumeEngineService, TargetRole } from '../src/services/ResumeEngineService'

const engine = new ResumeEngineService()
const roles: TargetRole[] = ['SYSTEMS_ARCHITECT', 'ALGORITHM_ENGINEER', 'FULL_STACK_LEAD', 'ML_DATA_ENGINEER']

const commonTelemetry = {
  duelRating: { elo: 2450, tier: 'GRANDMASTER', winRate: 94.2, matchesPlayed: 180, winStreak: 24 },
  bktMastery: { totalSkillsMastered: 48, examReadinessScore: 98.4, readinessBand: 'ELITE', topMasteredConcepts: ['Distributed Consensus (Raft/Paxos)', 'Bayesian Knowledge Tracing (BKT)', 'Asynchronous Event Streams & WebSockets', 'WebAssembly Sandboxing & Isolation', 'Chaos Fault Injection & Circuit Breakers'] },
  interviewSimulation: { totalInterviews: 15, averageScore: 97.2, highestPercentile: 99.8, recommendedLevel: 'STAFF / PRINCIPAL SYSTEMS ARCHITECT (L6+)', strongestFactors: ['Distributed Systems Architecture', 'Algorithmic Complexity & Bounds', 'Resilience & Fault Tolerance', 'Cryptographic Proof Verification'] },
  spacedRepetition: { cardsMastered: 350, retentionRate: 96.5, streakDays: 45 },
  verifiableCredentialsCount: 8
}

console.log('================================================================================')
console.log('ANTI-GRAVITY RESUME: ON-CHAIN & IPFS ANCHORING ENGINE')
console.log('================================================================================\n')

const anchorResults = []

for (const role of roles) {
  const resume = engine.generateResume({
    userId: 'usr-shiva-principal-architect',
    candidateProfile: {
      fullName: 'Shiva',
      headline: 'Principal AI Architect & Distributed Systems Engineer',
      email: 'shiva.architect@antigravity.ai',
      phone: '+91 (987) 654-3210',
      location: 'Bengaluru / San Francisco (Remote)',
      githubUrl: 'https://github.com/Pritamchaurasiya/Learning_Hub',
      linkedinUrl: 'https://linkedin.com/in/shiva-ai-architect',
      portfolioUrl: 'https://learninghub.io/portfolio/shiva',
      didIdentifier: 'did:polygon:0x7a8b9c0d1e2f3a4b5c6d7e8f9a0b1c2d3e4f5a6b'
    },
    targetRole: role,
    telemetryOverride: commonTelemetry
  })

  const anchor = engine.anchorToIpfsAndChain(resume)

  const verification = engine.verifyResumeDigest(
    resume.cryptographicProof.canonicalDigestSha256,
    resume.cryptographicProof.signatureHmac
  )

  anchorResults.push({
    role,
    roleTitle: resume.roleTitle,
    resumeId: resume.id,
    atsScore: `${resume.atsScoring.overallScore}/100 (${resume.atsScoring.grade})`,
    didAnchor: resume.cryptographicProof.didAnchor,
    canonicalDigest: resume.cryptographicProof.canonicalDigestSha256,
    hmacSignature: resume.cryptographicProof.signatureHmac,
    ipfsCid: anchor.ipfsCid,
    polygonTxHash: anchor.polygonTxHash,
    blockNumber: anchor.blockNumber,
    anchoredAt: anchor.anchoredAt,
    explorerUrl: anchor.explorerUrl,
    isTamperProof: verification.isValid
  })

  console.log(`[ANCHORED TRACK: ${role}]`)
  console.log(`  Title:           ${resume.roleTitle}`)
  console.log(`  Resume ID:       ${resume.id}`)
  console.log(`  ATS Score:       ${resume.atsScoring.overallScore}/100 (${resume.atsScoring.grade})`)
  console.log(`  W3C DID:         ${resume.cryptographicProof.didAnchor}`)
  console.log(`  SHA-256 Digest:  ${resume.cryptographicProof.canonicalDigestSha256}`)
  console.log(`  HMAC Signature:  ${resume.cryptographicProof.signatureHmac}`)
  console.log(`  IPFS CIDv1:      ${anchor.ipfsCid}`)
  console.log(`  Polygon Tx:      ${anchor.polygonTxHash}`)
  console.log(`  Block Number:    #${anchor.blockNumber}`)
  console.log(`  Explorer URL:    ${anchor.explorerUrl}`)
  console.log(`  Tamper Check:    ${verification.isValid ? 'VERIFIED (PASS)' : 'FAILED'}`)
  console.log('--------------------------------------------------------------------------------\n')
}
