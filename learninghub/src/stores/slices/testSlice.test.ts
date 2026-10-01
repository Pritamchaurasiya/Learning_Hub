import { describe, it, expect, beforeEach } from 'vitest'
import { useStore } from '../useStore'

describe('testSlice - Section Timers & Lockout Protocol', () => {
  beforeEach(() => {
    useStore.setState({
      test: {
        ...useStore.getState().test,
        isActive: true,
        mode: 'tests-a',
        timeRemaining: 3600,
        currentQuestionIndex: 0,
        questions: [
          {
            id: 'q1',
            text: 'Physics Question 1',
            question_type: 'mcq',
            difficulty: 0.5,
            bloom_level: 'apply',
            order: 1,
            marks: 4,
            section_id: 'sec-physics',
            options: [
              { id: 'opt1', text: 'Option A', order: 1 },
              { id: 'opt2', text: 'Option B', order: 2 },
            ],
          },
          {
            id: 'q2',
            text: 'Chemistry Question 1',
            question_type: 'mcq',
            difficulty: 0.6,
            bloom_level: 'analyze',
            order: 2,
            marks: 4,
            section_id: 'sec-chemistry',
            options: [
              { id: 'opt3', text: 'Option C', order: 1 },
              { id: 'opt4', text: 'Option D', order: 2 },
            ],
          },
        ],
        sections: [
          {
            id: 'sec-physics',
            title: 'Physics',
            order: 1,
            question_count: 1,
            duration_minutes: 30,
            is_timed: true,
            is_locked: false,
          },
          {
            id: 'sec-chemistry',
            title: 'Chemistry',
            order: 2,
            question_count: 1,
            duration_minutes: 30,
            is_timed: true,
            is_locked: false,
          },
        ],
        lockedSectionIds: [],
        sectionTimeRemaining: {
          'sec-physics': 1800,
          'sec-chemistry': 1800,
        },
        activeSectionId: 'sec-physics',
        answers: {},
        confidences: {},
        flaggedQuestions: [],
      },
    })
  })

  it('allows answering questions in an unlocked section', () => {
    const { answerQuestion, setConfidence, flagQuestion } = useStore.getState()

    answerQuestion('q1', 'opt1')
    setConfidence('q1', 'high')
    flagQuestion('q1')

    const state = useStore.getState().test
    expect(state.answers['q1']).toBe('opt1')
    expect(state.confidences['q1']).toBe('high')
    expect(state.flaggedQuestions).toContain('q1')
  })

  it('locks section and advances active section to the next unlocked section', () => {
    const { lockSection } = useStore.getState()

    lockSection('sec-physics')

    const state = useStore.getState().test
    expect(state.lockedSectionIds).toContain('sec-physics')
    expect(state.activeSectionId).toBe('sec-chemistry')
    expect(state.currentQuestionIndex).toBe(1)
  })

  it('prevents modifying answers, confidence, and flags for questions in a locked section', () => {
    const { lockSection, answerQuestion, setConfidence, flagQuestion } = useStore.getState()

    // Answer before locking
    answerQuestion('q1', 'opt1')
    expect(useStore.getState().test.answers['q1']).toBe('opt1')

    // Lock physics section
    lockSection('sec-physics')

    // Attempt to modify answer, confidence, or flag for locked question
    answerQuestion('q1', 'opt2')
    setConfidence('q1', 'low')
    flagQuestion('q1')

    const state = useStore.getState().test
    // State remains unchanged
    expect(state.answers['q1']).toBe('opt1')
    expect(state.confidences['q1']).toBeUndefined()
    expect(state.flaggedQuestions).not.toContain('q1')
  })

  it('updates individual section timer countdowns', () => {
    const { updateSectionTimer } = useStore.getState()

    updateSectionTimer('sec-physics', 1750)
    updateSectionTimer('sec-chemistry', 1795)

    const state = useStore.getState().test
    expect(state.sectionTimeRemaining?.['sec-physics']).toBe(1750)
    expect(state.sectionTimeRemaining?.['sec-chemistry']).toBe(1795)
  })
})
