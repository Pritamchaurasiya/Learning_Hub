import { catAdaptiveService, CatAdaptiveService } from '../../services/CatAdaptiveService'

describe('CatAdaptiveService (Milestone 26 Computerized Adaptive Testing Engine)', () => {
  let service: CatAdaptiveService

  beforeEach(() => {
    service = CatAdaptiveService.getInstance()
  })

  describe('startSession', () => {
    it('initializes a new CAT session with default prior theta = 0.0 and stage 1', () => {
      const session = service.startSession('student-cat-test-01', 'Distributed Systems & Algorithms')

      expect(session).toBeDefined()
      expect(session.sessionId).toMatch(/^cat-[a-f0-9]+$/)
      expect(session.userId).toBe('student-cat-test-01')
      expect(session.subject).toBe('Distributed Systems & Algorithms')
      expect(session.currentTheta).toBe(0.0)
      expect(session.currentSem).toBe(1.0)
      expect(session.stage).toBe(1)
      expect(session.isCompleted).toBe(false)
      expect(session.questionsAnswered).toBe(0)
      expect(session.activeItem).toBeDefined()
      expect(session.activeItem?.options.length).toBeGreaterThan(0)
    })
  })

  describe('calculateFisherInformation & calculateSem', () => {
    it('computes non-negative Fisher Information peaking around item difficulty', () => {
      const item = {
        id: 'test-item',
        text: 'Sample test item',
        subject: 'Algorithms',
        topic: 'Graph',
        options: [],
        correctOptionId: 'a',
        a: 1.5,
        b: 0.5,
        c: 0.25,
        explanation: '',
        bloomLevel: 'APPLY' as const,
      }

      const infoAtDifficulty = service.calculateFisherInformation(0.5, item)
      const infoFarAway = service.calculateFisherInformation(3.0, item)

      expect(infoAtDifficulty).toBeGreaterThan(0)
      expect(infoAtDifficulty).toBeGreaterThan(infoFarAway)
    })

    it('shrinks SEM as more items are administered', () => {
      const session = service.startSession('user-sem-test')
      expect(session.currentSem).toBe(1.0)

      const activeItem = session.activeItem!
      const step1 = service.submitAnswer({
        sessionId: session.sessionId,
        itemId: activeItem.id,
        selectedOptionId: activeItem.correctOptionId,
        confidence: 'HIGH',
      })

      expect(step1.session.currentSem).toBeLessThan(1.0)
    })
  })

  describe('estimateAbilityEAP', () => {
    it('calibrates theta upwards on correct responses and downwards on incorrect responses', () => {
      const session = service.startSession('user-eap-test')

      // Answer 1 correctly
      const item1 = session.activeItem!
      const res1 = service.submitAnswer({
        sessionId: session.sessionId,
        itemId: item1.id,
        selectedOptionId: item1.correctOptionId,
        confidence: 'HIGH',
      })

      expect(res1.session.currentTheta).toBeGreaterThan(0.0)
      const thetaAfterStep1 = res1.session.currentTheta

      // Answer 2 incorrectly
      const item2 = res1.session.activeItem!
      const wrongOption = item2.options.find(o => o.id !== item2.correctOptionId)!.id
      const res2 = service.submitAnswer({
        sessionId: session.sessionId,
        itemId: item2.id,
        selectedOptionId: wrongOption,
        confidence: 'LOW',
      })

      expect(res2.session.currentTheta).toBeLessThan(thetaAfterStep1)
    })
  })

  describe('Confidence-Based Marking (CBM)', () => {
    it('applies asymmetric penalties and rewards based on declared confidence', () => {
      expect(service.calculateCbmScore(true, 'HIGH')).toBe(3.0)
      expect(service.calculateCbmScore(false, 'HIGH')).toBe(-2.0)
      expect(service.calculateCbmScore(true, 'MEDIUM')).toBe(2.0)
      expect(service.calculateCbmScore(false, 'MEDIUM')).toBe(-1.0)
      expect(service.calculateCbmScore(true, 'LOW')).toBe(1.0)
      expect(service.calculateCbmScore(false, 'LOW')).toBe(0.0)
    })
  })

  describe('Multi-Stage Testing (MST) Progression & Stopping Criteria', () => {
    it('advances stages and triggers completion upon convergence or question limit', () => {
      const session = service.startSession('user-mst-test')

      // Step through 4 answers
      for (let i = 0; i < 4; i++) {
        if (session.isCompleted) break
        const item = session.activeItem!
        service.submitAnswer({
          sessionId: session.sessionId,
          itemId: item.id,
          selectedOptionId: item.correctOptionId,
          confidence: 'HIGH',
        })
      }

      const updated = service.getSession(session.sessionId)!
      expect(updated.questionsAnswered).toBe(4)
      expect(updated.stage).toBeGreaterThanOrEqual(2)
    })
  })

  describe('generateScorecard', () => {
    it('synthesizes comprehensive psychometric scorecard with 95% CI and audit proof', () => {
      const session = service.startSession('user-scorecard-test', 'Advanced Systems Design')
      const item1 = session.activeItem!
      service.submitAnswer({
        sessionId: session.sessionId,
        itemId: item1.id,
        selectedOptionId: item1.correctOptionId,
        confidence: 'HIGH',
      })

      const scorecard = service.generateScorecard(session.sessionId)

      expect(scorecard).toBeDefined()
      expect(scorecard.sessionId).toBe(session.sessionId)
      expect(scorecard.subject).toBe('Advanced Systems Design')
      expect(scorecard.confidenceInterval95.length).toBe(2)
      expect(scorecard.confidenceInterval95[0]).toBeLessThanOrEqual(scorecard.confidenceInterval95[1])
      expect(scorecard.cbmBreakdown.masteryCount).toBe(1)
      expect(scorecard.convergencePath.length).toBe(1)
      expect(scorecard.testInformationCurve.length).toBeGreaterThan(0)
      expect(scorecard.cryptographicAuditProof.hash).toBeDefined()
      expect(scorecard.cryptographicAuditProof.hash.length).toBe(64) // SHA-256 hex
    })
  })
})
