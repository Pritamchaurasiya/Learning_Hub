import { describe, it, expect } from 'vitest'
import {
  classifyMistake,
  analyzeMistakes,
  createRemediationDrillConfig,
} from './remediationService'
import { TestResult } from './testsAService'

describe('remediationService', () => {
  const mockResult: TestResult = {
    attempt_id: 'att_123',
    test_id: 'test_456',
    test_title: 'Full Stack Engineering Assessment',
    mode: 'mock',
    score: 60,
    total_marks: 100,
    percentage: 60,
    passed: true,
    time_taken: 300,
    time_limit: 600,
    correct_count: 6,
    incorrect_count: 3,
    unanswered_count: 1,
    question_results: [
      {
        question_id: 'q1',
        question_text: 'What is the time complexity of quickselect?',
        question_type: 'mcq',
        selected_options: [{ id: 'opt_a', text: 'O(N^2)' }],
        correct_options: [{ id: 'opt_b', text: 'O(N) average' }],
        is_correct: false,
        marks_obtained: 0,
        explanation: 'Quickselect has average linear time.',
        time_spent: 85, // High time spent -> Concept gap
        is_flagged: false,
        topic: 'Algorithms',
      },
      {
        question_id: 'q2',
        question_text: 'What does ACID stand for in databases?',
        question_type: 'mcq',
        selected_options: [{ id: 'opt_c', text: 'Asynchronous Consistent...' }],
        correct_options: [{ id: 'opt_d', text: 'Atomicity Consistency...' }],
        is_correct: false,
        marks_obtained: 0,
        explanation: 'Atomicity, Consistency, Isolation, Durability.',
        time_spent: 10, // Very low time spent -> Time crunch
        is_flagged: false,
        topic: 'Databases',
      },
      {
        question_id: 'q3',
        question_text: 'Which data structure is best for LRU cache?',
        question_type: 'mcq',
        selected_options: [{ id: 'opt_e', text: 'Hash Map + Binary Tree' }],
        correct_options: [{ id: 'opt_f', text: 'Hash Map + Doubly Linked List' }],
        is_correct: false,
        marks_obtained: 0,
        explanation: 'Doubly linked list allows O(1) removal.',
        time_spent: 35,
        is_flagged: false,
        topic: 'Algorithms',
        confidence: 'high', // Overconfidence trap
      },
      {
        question_id: 'q4',
        question_text: 'Explain Raft consensus leader election.',
        question_type: 'mcq',
        selected_options: [],
        correct_options: [{ id: 'opt_g', text: 'Heartbeats and term numbers' }],
        is_correct: false,
        marks_obtained: 0,
        explanation: 'Nodes timeout and request votes.',
        time_spent: 20,
        is_flagged: false,
        topic: 'Distributed Systems',
      },
      {
        question_id: 'q5',
        question_text: 'Correct answer sample',
        question_type: 'mcq',
        selected_options: [{ id: 'opt_h', text: 'Correct' }],
        correct_options: [{ id: 'opt_h', text: 'Correct' }],
        is_correct: true,
        marks_obtained: 10,
        explanation: 'Good job',
        time_spent: 25,
        is_flagged: false,
        topic: 'General',
      },
    ],
  }

  describe('classifyMistake', () => {
    it('classifies question with high time spent as CONCEPT_GAP', () => {
      const q = mockResult.question_results[0]
      const classification = classifyMistake(q, 30)
      expect(classification.mistakeType).toBe('CONCEPT_GAP')
      expect(classification.severity).toBe('CRITICAL')
      expect(classification.topic).toBe('Algorithms')
    })

    it('classifies question with low time spent as TIME_CRUNCH', () => {
      const q = mockResult.question_results[1]
      const classification = classifyMistake(q, 30)
      expect(classification.mistakeType).toBe('TIME_CRUNCH')
      expect(classification.severity).toBe('HIGH')
      expect(classification.topic).toBe('Databases')
    })

    it('classifies unattempted question as UNANSWERED', () => {
      const q = mockResult.question_results[3]
      const classification = classifyMistake(q, 30)
      expect(classification.mistakeType).toBe('UNANSWERED')
      expect(classification.severity).toBe('HIGH')
    })

    it('classifies high confidence wrong answer as CONFIDENCE_MISMATCH', () => {
      const q = mockResult.question_results[2]
      const classification = classifyMistake(q, 30)
      expect(classification.mistakeType).toBe('CONFIDENCE_MISMATCH')
      expect(classification.severity).toBe('HIGH')
    })
  })

  describe('analyzeMistakes', () => {
    it('generates full remediation summary with categories and insights', () => {
      const summary = analyzeMistakes(mockResult)
      expect(summary.totalMistakes).toBe(4)
      expect(summary.categories.length).toBeGreaterThan(0)
      expect(summary.targetTopics).toContain('Algorithms')
      expect(summary.actionableInsights.length).toBeGreaterThan(0)
      expect(summary.recommendedDrillTitle).toContain('Targeted Drill')
    })

    it('identifies primary weakness appropriately', () => {
      const summary = analyzeMistakes(mockResult)
      expect(summary.primaryWeakness).not.toBeNull()
      expect(summary.primaryWeaknessLabel).toBeDefined()
    })
  })

  describe('createRemediationDrillConfig', () => {
    it('produces valid targeted practice drill configuration', () => {
      const summary = analyzeMistakes(mockResult)
      const drillConfig = createRemediationDrillConfig(summary, 'GATE Computer Science')

      expect(drillConfig.examName).toBe('GATE Computer Science')
      expect(drillConfig.mode).toBe('practice')
      expect(drillConfig.questionCount).toBeGreaterThanOrEqual(5)
      expect(drillConfig.timeLimitMinutes).toBe(10)
      expect(drillConfig.topics.length).toBeGreaterThan(0)
    })
  })
})
