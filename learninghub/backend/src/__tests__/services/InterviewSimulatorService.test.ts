import {
  interviewSimulatorService,
  InterviewTrack,
  InterviewDifficulty,
} from '../../services/InterviewSimulatorService'

describe('InterviewSimulatorService (Milestone 11)', () => {
  const userId = 'test-candidate-123'

  it('should return available interview blueprint templates', () => {
    const templates = interviewSimulatorService.getTemplates()
    expect(templates.length).toBeGreaterThanOrEqual(3)

    const lruTemplate = templates.find(t => t.id === 'algo-lru-cache-staff')
    expect(lruTemplate).toBeDefined()
    expect(lruTemplate?.track).toBe('ALGORITHM_CODING')
    expect(lruTemplate?.difficulty).toBe('SENIOR')
  })

  it('should initiate an interview session with proper greeting and role persona', () => {
    const session = interviewSimulatorService.startSession({
      userId,
      track: 'ALGORITHM_CODING',
      difficulty: 'SENIOR',
      persona: 'SOPHIA_ALGO_SPECIALIST',
      questionId: 'algo-lru-cache-staff',
    })

    expect(session.id).toBeDefined()
    expect(session.userId).toBe(userId)
    expect(session.persona).toBe('SOPHIA_ALGO_SPECIALIST')
    expect(session.currentStage).toBe('CLARIFICATION')
    expect(session.transcript.length).toBe(1)
    expect(session.transcript[0].sender).toBe('interviewer')
    expect(session.transcript[0].text).toContain('Sophia')
    expect(session.candidateCode).toContain('LRUCacheWithTTL')
  })

  it('should synthesize responsive interviewer dialogue when candidate asks clarifying questions', () => {
    const session = interviewSimulatorService.startSession({
      userId,
      track: 'ALGORITHM_CODING',
      difficulty: 'SENIOR',
      questionId: 'algo-lru-cache-staff',
    })

    const { interviewerResponse, stageTransitioned } = interviewSimulatorService.interact({
      sessionId: session.id,
      candidateText: 'What are the capacity limits and memory bounds for this LRU cache?',
    })

    expect(interviewerResponse.sender).toBe('interviewer')
    expect(interviewerResponse.text.toLowerCase()).toContain('capacity')
    expect(stageTransitioned).toBe(true)
    expect(session.currentStage).toBe('HIGH_LEVEL_DESIGN')
  })

  it('should progressively unlock hints (Nudge -> Structural -> Skeleton)', () => {
    const session = interviewSimulatorService.startSession({
      userId,
      track: 'ALGORITHM_CODING',
      difficulty: 'SENIOR',
      questionId: 'algo-lru-cache-staff',
    })

    // Hint 1: Nudge
    const hint1 = interviewSimulatorService.requestHint(session.id)
    expect(hint1.hint.level).toBe(1)
    expect(hint1.hint.type).toBe('nudge')
    expect(hint1.totalHintsUnlocked).toBe(1)

    // Hint 2: Structural
    const hint2 = interviewSimulatorService.requestHint(session.id)
    expect(hint2.hint.level).toBe(2)
    expect(hint2.hint.type).toBe('structural_hint')
    expect(hint2.totalHintsUnlocked).toBe(2)

    // Hint 3: Code Skeleton
    const hint3 = interviewSimulatorService.requestHint(session.id)
    expect(hint3.hint.level).toBe(3)
    expect(hint3.hint.type).toBe('code_skeleton')
    expect(hint3.totalHintsUnlocked).toBe(3)
  })

  it('should evaluate the candidate session across the 5-factor rubric', () => {
    const session = interviewSimulatorService.startSession({
      userId,
      track: 'SYSTEM_DESIGN',
      difficulty: 'STAFF',
      persona: 'ALEX_STAFF_ARCHITECT',
      questionId: 'system-design-global-feed',
    })

    // Simulate conversational turns and code
    interviewSimulatorService.interact({
      sessionId: session.id,
      candidateText: 'We should implement a hybrid fan-out model with Redis Sorted Sets for hot feed caching.',
      candidateCode: `class FeedDistributionBroker {
  async publishActivity(event) {
    if (isCelebrity(event.actorId)) {
      await kafka.publish('celebrity-events', event);
    } else {
      await redis.zadd(\`timeline:\${followerId}\`, Date.now(), event.id);
    }
  }
}`,
    })

    const evaluation = interviewSimulatorService.evaluateSession(session.id)
    expect(evaluation.overallScore).toBeGreaterThanOrEqual(50)
    expect(evaluation.factorScores.length).toBe(5)

    const problemSolving = evaluation.factorScores.find(f => f.factor === 'PROBLEM_SOLVING')
    expect(problemSolving).toBeDefined()
    expect(problemSolving?.score).toBeGreaterThan(0)

    expect(evaluation.hiringRecommendation).toBeDefined()
    expect(evaluation.starAnalysis).toBeDefined()
    expect(evaluation.strengths.length).toBeGreaterThan(0)
    expect(evaluation.recommendedRevisionTopics.length).toBeGreaterThan(0)
  })

  it('should track user past interview history', () => {
    const history = interviewSimulatorService.getUserHistory(userId)
    expect(history.length).toBeGreaterThanOrEqual(1)
    expect(history[0].sessionId).toBeDefined()
    expect(history[0].track).toBeDefined()
  })
})
