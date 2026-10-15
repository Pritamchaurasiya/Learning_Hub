import { ResumeEngineService } from '../src/services/ResumeEngineService'

const engine = new ResumeEngineService()

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
  targetRole: 'SYSTEMS_ARCHITECT',
  telemetryOverride: {
    duelRating: {
      elo: 2450,
      tier: 'GRANDMASTER',
      winRate: 94.2,
      matchesPlayed: 180,
      winStreak: 24
    },
    bktMastery: {
      totalSkillsMastered: 48,
      examReadinessScore: 98.4,
      readinessBand: 'ELITE',
      topMasteredConcepts: [
        'Distributed Consensus (Raft/Paxos)',
        'Bayesian Knowledge Tracing (BKT)',
        'Asynchronous Event Streams & WebSockets',
        'WebAssembly Sandboxing & Isolation',
        'Chaos Fault Injection & Circuit Breakers'
      ]
    },
    interviewSimulation: {
      totalInterviews: 15,
      averageScore: 97.2,
      highestPercentile: 99.8,
      recommendedLevel: 'STAFF / PRINCIPAL SYSTEMS ARCHITECT (L6+)',
      strongestFactors: [
        'Distributed Systems Architecture',
        'Algorithmic Complexity & Bounds',
        'Resilience & Fault Tolerance',
        'Cryptographic Proof Verification'
      ]
    },
    spacedRepetition: {
      cardsMastered: 350,
      retentionRate: 96.5,
      streakDays: 45
    },
    verifiableCredentialsCount: 8
  }
})

console.log('=== ANTI-GRAVITY RESUME METADATA ===')
console.log('ID:', resume.id)
console.log('ROLE:', resume.roleTitle)
console.log('ATS OVERALL SCORE:', resume.atsScoring.overallScore)
console.log('ATS GRADE:', resume.atsScoring.grade)
console.log('DID ANCHOR:', resume.cryptographicProof.didAnchor)
console.log('CANONICAL SHA-256 DIGEST:', resume.cryptographicProof.canonicalDigestSha256)
console.log('HMAC SIGNATURE:', resume.cryptographicProof.signatureHmac)
console.log('VERIFICATION URL:', resume.cryptographicProof.verificationUrl)
console.log('\n=== ATS PLAIN TEXT FORMAT ===\n')
console.log(engine.formatATSPlainText(resume))
console.log('\n=== JSON RESUME EXPORT ===\n')
console.log(JSON.stringify(engine.formatJSONResume(resume), null, 2))
