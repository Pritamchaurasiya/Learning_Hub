import { ResumeEngineService, TargetRole } from '../src/services/ResumeEngineService'

const engine = new ResumeEngineService()
const roles: TargetRole[] = ['SYSTEMS_ARCHITECT', 'ALGORITHM_ENGINEER', 'FULL_STACK_LEAD', 'ML_DATA_ENGINEER']
const commonTelemetry = {
  duelRating: { elo: 2450, tier: 'GRANDMASTER', winRate: 94.2, matchesPlayed: 180, winStreak: 24 },
  bktMastery: { totalSkillsMastered: 48, examReadinessScore: 98.4, readinessBand: 'ELITE', topMasteredConcepts: ['Distributed Consensus', 'Bayesian Knowledge Tracing', 'WebAssembly Sandbox'] },
  interviewSimulation: { totalInterviews: 15, averageScore: 97.2, highestPercentile: 99.8, recommendedLevel: 'STAFF / PRINCIPAL (L6+)', strongestFactors: ['Architecture', 'Complexity'] },
  spacedRepetition: { cardsMastered: 350, retentionRate: 96.5, streakDays: 45 },
  verifiableCredentialsCount: 8
}

console.log('================================================================================')
console.log('ANTI-GRAVITY RESUME: TARGET ROLE CUSTOMIZATION MATRIX')
console.log('================================================================================\n')

for (const r of roles) {
  const res = engine.generateResume({
    userId: 'usr-shiva',
    candidateProfile: {
      fullName: 'Shiva',
      email: 'shiva.architect@antigravity.ai',
      location: 'Bengaluru / San Francisco (Remote)',
      githubUrl: 'https://github.com/Pritamchaurasiya/Learning_Hub',
      linkedinUrl: 'https://linkedin.com/in/shiva-ai-architect',
      portfolioUrl: 'https://learninghub.io/portfolio/shiva',
      didIdentifier: 'did:polygon:0x7a8b9c0d1e2f3a4b5c6d7e8f9a0b1c2d3e4f5a6b'
    },
    targetRole: r,
    telemetryOverride: commonTelemetry
  })

  console.log(`[ROLE: ${r}]`)
  console.log(`  Role Title:       ${res.roleTitle}`)
  console.log(`  ATS Score:        ${res.atsScoring.overallScore} / 100 (Grade: ${res.atsScoring.grade})`)
  console.log(`  Quantified:       ${res.atsScoring.criteriaScores.quantifiedMetricsScore}/25 | Verbs: ${res.atsScoring.criteriaScores.actionVerbsScore}/25 | Keywords: ${res.atsScoring.criteriaScores.keywordOptimizationScore}/25 | Format: ${res.atsScoring.criteriaScores.formattingComplianceScore}/25`)
  console.log(`  Languages:        ${res.skillsMatrix.languages.join(', ')}`)
  console.log(`  Systems / Cloud:  ${res.skillsMatrix.systemsAndCloud.slice(0, 4).join(', ')}`)
  console.log(`  Algorithmic Core: ${res.skillsMatrix.algorithmicCompetencies.slice(0, 3).join(', ')}`)
  console.log(`  Canonical Digest: ${res.cryptographicProof.canonicalDigestSha256.slice(0, 32)}...`)
  console.log(`  Executive Summary:`)
  console.log(`    "${res.summary}"\n`)
}
