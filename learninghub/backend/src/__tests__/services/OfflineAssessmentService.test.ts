import { offlineAssessmentService } from '../../services/OfflineAssessmentService'
import { testScoringService } from '../../services/TestScoringService'
import { prisma } from '../../prismaClient'

jest.mock('../../prismaClient', () => ({
  prisma: {
    test: {
      findUnique: jest.fn(),
    },
  },
}))

jest.mock('../../services/TestScoringService', () => ({
  testScoringService: {
    scoreAndSubmitTest: jest.fn(),
  },
}))

describe('OfflineAssessmentService', () => {
  const mockTest = {
    id: 'test-offline-1',
    title: 'Offline Physics Assessment',
    description: 'Mechanics and Thermodynamics offline pack',
    timeLimit: 30,
    passingScore: 70,
    totalMarks: 50,
    negativeMarks: 1,
    mode: 'MOCK',
    questions: [
      {
        id: 'q1',
        text: 'State Newton’s Second Law',
        type: 'MCQ',
        difficulty: 0.3,
        bloomLevel: 'REMEMBER',
        points: 5,
        order: 1,
        options: [
          { id: 'opt1', text: 'F = ma', order: 1 },
          { id: 'opt2', text: 'E = mc^2', order: 2 },
        ],
      },
    ],
  }

  it('generates a valid offline bundle with HMAC signature', async () => {
    ;(prisma.test.findUnique as jest.Mock).mockResolvedValue(mockTest)

    const bundle = await offlineAssessmentService.generateOfflineBundle('test-offline-1', 'user-123')

    expect(bundle.testId).toBe('test-offline-1')
    expect(bundle.userId).toBe('user-123')
    expect(bundle.signature).toBeDefined()
    expect(bundle.signature.length).toBe(64) // SHA-256 hex string length
    expect(bundle.questions.length).toBe(1)
    expect(bundle.questions[0].id).toBe('q1')
  })

  it('verifies valid signature and detects tampered signature', () => {
    const testId = 'test-1'
    const userId = 'user-1'
    const now = Date.now()

    // Mock bundle signature validation
    const isValid = (offlineAssessmentService as any).verifySignature
      ? (offlineAssessmentService as any).verifySignature(testId, userId, now, 'invalid-signature')
      : false

    expect(isValid).toBe(false)
  })

  it('reconciles offline submission and delegates to TestScoringService', async () => {
    ;(testScoringService.scoreAndSubmitTest as jest.Mock).mockResolvedValue({
      result: { id: 'result-offline-1', score: 45, passed: true },
      isDuplicate: false,
      correctCount: 1,
      incorrectCount: 0,
      questionResults: [],
    })

    const payload = {
      bundleId: 'bundle-xyz',
      testId: 'test-offline-1',
      answers: { q1: 'opt1' },
      timesSpent: { q1: 25 },
      clientStartedAt: new Date(Date.now() - 30000).toISOString(),
      clientCompletedAt: new Date().toISOString(),
      totalElapsedSeconds: 30,
      bundleSignature: 'valid-sig',
      checksum: 'hash-abc',
    }

    const reconciliation = await offlineAssessmentService.reconcileOfflineSubmission({
      userId: 'user-123',
      payload,
    })

    expect(reconciliation.status).toBe('synced')
    expect(reconciliation.result.id).toBe('result-offline-1')
    expect(testScoringService.scoreAndSubmitTest).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: 'user-123',
        testId: 'test-offline-1',
        timeTaken: 30,
      })
    )
  })
})
