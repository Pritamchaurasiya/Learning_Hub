/**
 * AdaptiveRemediationService.test.ts
 * 
 * Test suite for Milestone 32 Computerized Adaptive Remediation (CAR).
 */

import { AdaptiveRemediationService, QuestionTelemetry } from '../../services/AdaptiveRemediationService'

describe('AdaptiveRemediationService', () => {
  let service: AdaptiveRemediationService

  beforeEach(() => {
    service = new AdaptiveRemediationService()
  })

  describe('diagnoseMistake', () => {
    it('should classify rapid incorrect responses on low-difficulty items as CARELESS_SLIP for high-mastery users', () => {
      const telemetry: QuestionTelemetry = {
        questionId: 'q-101',
        conceptId: 'binary-search',
        conceptName: 'Binary Search Invariants',
        difficulty: -0.2,
        discrimination: 1.2,
        timeSpentSeconds: 12,
        benchmarkTimeSeconds: 60,
        isCorrect: false,
        selectedOptionIndex: 1,
        correctOptionIndex: 0,
        userPriorMastery: 0.88
      }

      const diagnosis = service.diagnoseMistake(telemetry)
      expect(diagnosis.etiology).toBe('CARELESS_SLIP')
      expect(diagnosis.confidence).toBeGreaterThan(0.9)
      expect(diagnosis.prescribedScaffold.drillStepCount).toBe(1)
    })

    it('should classify prolonged incorrect responses on hard items as CONCEPT_CONFUSION', () => {
      const telemetry: QuestionTelemetry = {
        questionId: 'q-102',
        conceptId: 'segment-tree',
        conceptName: 'Segment Tree Lazy Propagation',
        difficulty: 1.8,
        discrimination: 1.6,
        timeSpentSeconds: 190,
        benchmarkTimeSeconds: 90,
        isCorrect: false,
        selectedOptionIndex: 2,
        correctOptionIndex: 0,
        userPriorMastery: 0.55
      }

      const diagnosis = service.diagnoseMistake(telemetry)
      expect(diagnosis.etiology).toBe('CONCEPT_CONFUSION')
      expect(diagnosis.prescribedScaffold.drillStepCount).toBe(3)
    })

    it('should classify rapid correct responses on hard items by low-mastery users as LUCKY_GUESS', () => {
      const telemetry: QuestionTelemetry = {
        questionId: 'q-103',
        conceptId: 'red-black-tree',
        conceptName: 'Red-Black Tree Rotations',
        difficulty: 1.9,
        discrimination: 1.5,
        timeSpentSeconds: 8,
        benchmarkTimeSeconds: 80,
        isCorrect: true,
        selectedOptionIndex: 3,
        correctOptionIndex: 3,
        userPriorMastery: 0.25
      }

      const diagnosis = service.diagnoseMistake(telemetry)
      expect(diagnosis.etiology).toBe('LUCKY_GUESS')
      expect(diagnosis.confidence).toBeGreaterThanOrEqual(0.85)
    })

    it('should identify general KNOWLEDGE_DEFICIT on incorrect attempts with low prior mastery', () => {
      const telemetry: QuestionTelemetry = {
        questionId: 'q-104',
        conceptId: 'dynamic-programming',
        conceptName: 'Bitmask DP Transitions',
        difficulty: 0.8,
        discrimination: 1.1,
        timeSpentSeconds: 65,
        benchmarkTimeSeconds: 70,
        isCorrect: false,
        selectedOptionIndex: 1,
        correctOptionIndex: 0,
        userPriorMastery: 0.35
      }

      const diagnosis = service.diagnoseMistake(telemetry)
      expect(diagnosis.etiology).toBe('KNOWLEDGE_DEFICIT')
      expect(diagnosis.prescribedScaffold.drillStepCount).toBe(3)
      expect(diagnosis.prescribedScaffold.targetDifficulty).toBeLessThan(0.8)
    })
  })

  describe('generateScaffoldDrill', () => {
    it('should generate a 3-step scaffold drill for knowledge deficit', () => {
      const drill = service.generateScaffoldDrill('dijkstra', 'Dijkstra Priority Queue Relaxation', 'KNOWLEDGE_DEFICIT')
      expect(drill.conceptId).toBe('dijkstra')
      expect(drill.steps.length).toBe(3)
      expect(drill.steps[0].tier).toBe('PREREQUISITE_ANCHOR')
      expect(drill.steps[1].tier).toBe('CONCEPTUAL_TRANSFER')
      expect(drill.steps[2].tier).toBe('MASTERY_VERIFICATION')
      expect(drill.potentialMasteryDelta).toBeGreaterThanOrEqual(0.15)
    })

    it('should generate a streamlined 1-step verification drill for careless slip', () => {
      const drill = service.generateScaffoldDrill('two-pointer', 'Two-Pointer Array Traversal', 'CARELESS_SLIP')
      expect(drill.steps.length).toBe(1)
      expect(drill.steps[0].tier).toBe('PREREQUISITE_ANCHOR')
    })
  })

  describe('evaluateDrillSubmission', () => {
    it('should calculate FULLY_RECOVERED status and positive mastery delta on 100% score', () => {
      const result = service.evaluateDrillSubmission(
        'bkt-mastery',
        [0, 0, 0],
        [0, 0, 0],
        0.5
      )

      expect(result.passed).toBe(true)
      expect(result.score).toBe(3)
      expect(result.recoveredStatus).toBe('FULLY_RECOVERED')
      expect(result.updatedMastery).toBeGreaterThan(0.5)
      expect(result.masteryDelta).toBeGreaterThan(0)
    })

    it('should flag NEEDS_PREREQUISITE_COURSE when score is below threshold', () => {
      const result = service.evaluateDrillSubmission(
        'bkt-mastery',
        [1, 2, 3],
        [0, 0, 0],
        0.5
      )

      expect(result.passed).toBe(false)
      expect(result.score).toBe(0)
      expect(result.recoveredStatus).toBe('NEEDS_PREREQUISITE_COURSE')
      expect(result.updatedMastery).toBeLessThan(0.5)
    })
  })
})
