import { describe, it, expect, vi, beforeEach } from 'vitest'
import { resumeService } from './resumeService'
import { api } from '../utils/api'

vi.mock('../utils/api', () => ({
  api: {
    get: vi.fn(),
    post: vi.fn(),
  },
}))

describe('resumeService (Milestone 12 Anti-Gravity Resume)', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should fetch tailored resume from API when available', async () => {
    const mockResumeData = {
      id: 'res-api-123',
      userId: 'student-test',
      targetRole: 'SYSTEMS_ARCHITECT',
      roleTitle: 'Staff Systems Architect',
      profile: {
        fullName: 'Alex Morgan',
        headline: 'Staff Systems Architect',
      },
      summary: 'Systems Architect summary',
      skillsMatrix: {
        languages: ['TypeScript', 'Go'],
        frameworks: ['React', 'Node.js'],
        systemsAndCloud: ['PostgreSQL', 'Redis'],
        algorithmicCompetencies: ['B-Trees'],
      },
      verifiedPlatformHighlights: ['Maintained 2240 Elo in Algorithm Arena'],
      projects: [],
      experiences: [],
      education: [],
      credentials: [],
      atsScoring: {
        overallScore: 94,
        grade: 'A',
        criteriaScores: {
          quantifiedMetricsScore: 24,
          actionVerbsScore: 23,
          keywordOptimizationScore: 23,
          formattingComplianceScore: 24,
        },
        actionableFeedback: [],
        detectedKeywords: ['redis'],
        missingKeywords: [],
      },
      cryptographicProof: {
        canonicalDigestSha256: 'abc123hash',
        signatureHmac: 'hmac123sig',
        didAnchor: 'did:polygon:0x123',
        verificationUrl: '/verify-certificate?proof=abc',
      },
    }

    vi.mocked(api.get).mockResolvedValueOnce({
      data: { data: { resume: mockResumeData } },
    } as any)

    const result = await resumeService.getTailoredResume({ targetRole: 'SYSTEMS_ARCHITECT' })
    expect(result.id).toBe('res-api-123')
    expect(result.roleTitle).toBe('Staff Systems Architect')
    expect(api.get).toHaveBeenCalledWith('/api/v1/resume/generate?targetRole=SYSTEMS_ARCHITECT')
  })

  it('should gracefully fall back to deterministic client-side synthesizer if API throws an error', async () => {
    vi.mocked(api.get).mockRejectedValueOnce(new Error('Network Offline'))

    const result = await resumeService.getTailoredResume({ targetRole: 'ALGORITHM_ENGINEER' })
    expect(result).toBeDefined()
    expect(result.targetRole).toBe('ALGORITHM_ENGINEER')
    expect(result.roleTitle).toBe('Senior Algorithmic Engineer')
    expect(result.atsScoring.overallScore).toBeGreaterThanOrEqual(90)
    expect(result.cryptographicProof.canonicalDigestSha256).toBeDefined()
  })

  it('should verify cryptographic proof via API when reachable', async () => {
    vi.mocked(api.post).mockResolvedValueOnce({
      data: {
        data: {
          isValid: true,
          verifiedAt: '2026-10-06T00:00:00Z',
          statusMessage: 'Cryptographically valid signature',
        },
      },
    } as any)

    const verification = await resumeService.verifyResumeProof('digest123', 'signature123')
    expect(verification.isValid).toBe(true)
    expect(verification.statusMessage).toContain('valid')
  })

  it('should handle offline cryptographic verification fallback', async () => {
    vi.mocked(api.post).mockRejectedValueOnce(new Error('Network Error'))

    const validDigest = 'a'.repeat(64)
    const validSignature = 'b'.repeat(64)

    const verification = await resumeService.verifyResumeProof(validDigest, validSignature)
    expect(verification.isValid).toBe(true)
    expect(verification.statusMessage).toContain('Client Cryptographic Verification')
  })
})
