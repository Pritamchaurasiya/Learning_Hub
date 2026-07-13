import { aiEngineInstance } from '../../src/engines/ai'
import { examEngineInstance } from '../../src/engines/exam'
import { progressionEngineInstance } from '../../src/engines/progression'
import { questionEngineInstance } from '../../src/engines/question'
import { adminEngineInstance } from '../../src/engines/admin'
import { engineRegistry } from '../../src/engines'

describe('Production Engines Suite', () => {
  describe('Engine Registry', () => {
    it('should register all engines with Production status', () => {
      expect(engineRegistry.ai).toBe('Production')
      expect(engineRegistry.exam).toBe('Production')
      expect(engineRegistry.progression).toBe('Production')
      expect(engineRegistry.question).toBe('Production')
      expect(engineRegistry.admin).toBe('Production')
    })
  })

  describe('AIEngine', () => {
    it('should generate an adaptive learning path', async () => {
      const path = await aiEngineInstance.generateAdaptiveLearningPath(
        'user_test',
        'React Development',
        0
      )
      expect(path.userId).toBe('user_test')
      expect(path.targetSkill).toBe('React Development')
      expect(path.steps.length).toBeGreaterThan(0)
      expect(path.projectedMastery).toBeGreaterThan(path.currentMastery)
    })

    it('should predict question difficulty using IRT theta estimation', () => {
      const diff = aiEngineInstance.predictQuestionDifficulty(
        'Analyze and evaluate the time complexity of distributed consensus algorithms.',
        10,
        0.3
      )
      expect(diff.estimatedTheta).toBeDefined()
      expect(diff.confidenceScore).toBeGreaterThan(0)
      expect(diff.bloomsTaxonomyLevel).toBe('EVALUATE')
    })

    it('should analyze dropout risk based on inactivity and recent scores', () => {
      const risk = aiEngineInstance.analyzeDropoutRisk('user_test', 12, [40, 45, 35])
      expect(risk.riskTier).toBe('CRITICAL')
      expect(risk.riskScore).toBeGreaterThanOrEqual(80)
      expect(risk.primaryRiskFactors.length).toBeGreaterThan(0)
    })
  })

  describe('ExamEngine', () => {
    it('should initialize a proctored exam session', async () => {
      const session = await examEngineInstance.createProctoredSession('user_1', 'test_1', 60, true)
      expect(session.sessionId).toContain('exam_')
      expect(session.securityConfig.fullscreenMandatory).toBe(true)
    })

    it('should evaluate item response and update theta', () => {
      const evalResult = examEngineInstance.evaluateItemResponse('sess_1', 'q_1', true, 15000, 0.0)
      expect(evalResult.updatedTheta).toBeGreaterThan(evalResult.previousTheta)
      expect(evalResult.nextRecommendedDifficulty).toBeGreaterThanOrEqual(3)
    })

    it('should log security incident and flag termination on limit exceed', () => {
      examEngineInstance.logSecurityIncident('sess_terminate', 'TAB_SWITCH', 2)
      const incident = examEngineInstance.logSecurityIncident(
        'sess_terminate',
        'FULLSCREEN_EXIT',
        2
      )
      expect(incident.totalViolations).toBe(2)
      expect(incident.isTerminated).toBe(true)
    })
  })

  describe('ProgressionEngine', () => {
    it('should calculate XP with streak and difficulty multipliers', () => {
      const res = progressionEngineInstance.calculateXP(20, 5, 4)
      expect(res.streakMultiplier).toBe(1.5)
      expect(res.difficultyMultiplier).toBe(1.4)
      expect(res.totalAwardedXP).toBe(42)
    })

    it('should evaluate level up correctly', () => {
      const res = progressionEngineInstance.evaluateLevelUp(90, 20)
      expect(res.previousLevel).toBe(1)
      expect(res.newLevel).toBe(2)
      expect(res.didLevelUp).toBe(true)
    })

    it('should maintain streak and consume freeze when 1 day missed', () => {
      const twoDaysAgo = new Date(Date.now() - 2 * 24 * 60 * 60 * 1000)
      const res = progressionEngineInstance.maintainStreak(twoDaysAgo, 10, 2)
      expect(res.status).toBe('FROZEN')
      expect(res.freezesRemaining).toBe(1)
      expect(res.newStreak).toBe(10)
    })
  })

  describe('QuestionEngine', () => {
    it('should filter questions by Bloom taxonomy level', () => {
      const questions = [
        { id: '1', text: 'Define what a variable is in Javascript', difficulty: 1, tags: [] },
        {
          id: '2',
          text: 'Design and architect a distributed caching system',
          difficulty: 5,
          tags: [],
        },
      ]
      const remember = questionEngineInstance.filterByBloomsTaxonomy(questions, 'REMEMBER')
      expect(remember.length).toBe(1)
      expect(remember[0].id).toBe('1')
    })

    it('should generate plausible distractors for numeric calculation answers', () => {
      const res = questionEngineInstance.generatePlausibleDistractors('42', 'Algebra', 3)
      expect(res.distractors.length).toBe(3)
      expect(res.distractors[0].text).toBe('-42')
    })

    it('should detect similar duplicate questions via Jaccard overlap', () => {
      const bank = [
        {
          id: 'q100',
          text: 'What is the primary purpose of useEffect hook in React component?',
          difficulty: 3,
          tags: [],
        },
      ]
      const check = questionEngineInstance.checkQuestionSimilarity(
        'What is the primary purpose of useEffect hook in React component?',
        bank,
        0.75
      )
      expect(check.isDuplicate).toBe(true)
      expect(check.mostSimilarQuestionId).toBe('q100')
    })
  })

  describe('AdminEngine', () => {
    it('should run system diagnostics and return memory and DB status', async () => {
      const report = await adminEngineInstance.runSystemDiagnostics()
      expect(report.status).toBeDefined()
      expect(report.memoryUsageMb.heapUsed).toBeGreaterThan(0)
      expect(report.checks.length).toBe(3)
    })

    it('should detect platform anomalies when error count is elevated', () => {
      const res = adminEngineInstance.detectPlatformAnomalies({
        errorCount: 300,
        authFailures: 5,
        avgResponseTimeMs: 400,
        activeRequests: 100,
      })
      expect(res.hasAnomalies).toBe(true)
      expect(res.riskLevel).toBe('CRITICAL')
      expect(res.anomalies[0].type).toBe('HIGH_ERROR_RATE')
    })
  })
})
