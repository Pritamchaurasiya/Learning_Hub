import { aiLearningService } from '../../src/services/ai/AILearningService'
import { prisma } from '../../src/prismaClient'
import { AIServiceFactory } from '../../src/services/ai/AIServiceFactory'
import { cacheService } from '../../src/services/CacheService'
import { TimeoutError } from '../../src/utils/timeout'

// Mock dependencies
jest.mock('../../src/prismaClient', () => ({
  prisma: {
    user: {
      findUnique: jest.fn(),
    },
    testResult: {
      count: jest.fn(),
      findMany: jest.fn(),
    },
    test: {
      findUnique: jest.fn(),
    },
    topicPerformance: {
      findMany: jest.fn(),
    },
    learningVelocityEvent: {
      findMany: jest.fn(),
    },
    aIChatSession: {
      findMany: jest.fn(),
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
    aIChatMessage: {
      findMany: jest.fn().mockResolvedValue([]),
      create: jest.fn(),
    },
  },
}))

jest.mock('../../src/services/CacheService', () => ({
  cacheService: {
    get: jest.fn(),
    set: jest.fn(),
    del: jest.fn(),
  },
}))

jest.mock('../../src/services/ai/AIServiceFactory', () => ({
  AIServiceFactory: {
    getAgent: jest.fn(),
  },
}))

describe('AILearningService', () => {
  let mockAgent: {
    generateChat: jest.Mock
    generateJSON: jest.Mock
    generateChatStream?: jest.Mock
  }

  beforeEach(() => {
    jest.clearAllMocks()
    ;(prisma.aIChatMessage.findMany as jest.Mock).mockResolvedValue([])

    mockAgent = {
      generateChat: jest.fn().mockResolvedValue({
        text: 'This is an AI response.',
        usage: { promptTokens: 50, completionTokens: 30, totalTokens: 80 },
      }),
      generateJSON: jest.fn().mockResolvedValue({
        strengths: ['Dynamic Programming', 'Arrays'],
        weaknesses: ['Graphs'],
        recommendation: 'Practice BFS and DFS algorithms.',
        next_steps: ['Solve 3 graph questions'],
      }),
      generateChatStream: jest.fn().mockImplementation(async function* () {
        yield 'Hello '
        yield 'world'
      }),
    }
    ;(AIServiceFactory.getAgent as jest.Mock).mockReturnValue(mockAgent)
  })

  describe('analyzeLearningPath', () => {
    it('returns cached analysis if available', async () => {
      const cachedData = {
        strengths: ['Recursion'],
        weaknesses: ['DP'],
        recommendation: 'Cached plan',
        next_steps: ['Review'],
        ai_powered: true,
      }
      ;(cacheService.get as jest.Mock).mockResolvedValue(cachedData)

      const result = await aiLearningService.analyzeLearningPath('user-1')

      expect(cacheService.get).toHaveBeenCalledWith('ai:learningPath:user-1')
      expect(result).toEqual(cachedData)
      expect(mockAgent.generateJSON).not.toHaveBeenCalled()
    })

    it('computes analysis via AI and caches result when cache misses', async () => {
      ;(cacheService.get as jest.Mock).mockResolvedValue(null)
      ;(prisma.testResult.findMany as jest.Mock)
        .mockResolvedValueOnce([{ test: { title: 'Array Basics', difficulty: 'Easy' } }]) // passedTests
        .mockResolvedValueOnce([{ test: { title: 'Binary Search' } }]) // inProgressTests
        .mockResolvedValueOnce([
          { percentage: 80, passed: true, test: { title: 'Array Basics', difficulty: 'Easy' } },
        ]) // testResults
        .mockResolvedValueOnce([]) // weakTopics

      const result = await aiLearningService.analyzeLearningPath('user-1')

      expect(mockAgent.generateJSON).toHaveBeenCalled()
      expect(cacheService.set).toHaveBeenCalledWith(
        'ai:learningPath:user-1',
        expect.objectContaining({ ai_powered: true }),
        3600
      )
      expect(result.ai_powered).toBe(true)
    })

    it('falls back to rule-based stats if AI generation fails', async () => {
      ;(cacheService.get as jest.Mock).mockResolvedValue(null)
      ;(prisma.testResult.findMany as jest.Mock)
        .mockResolvedValueOnce([{ test: { title: 'Array Basics', difficulty: 'Easy' } }])
        .mockResolvedValueOnce([{ test: { title: 'Binary Search' } }])
        .mockResolvedValueOnce([
          { percentage: 40, passed: false, test: { title: 'Binary Search', difficulty: 'Medium' } },
        ])
        .mockResolvedValueOnce([{ test: { title: 'Binary Search' }, percentage: 40 }])
      mockAgent.generateJSON.mockRejectedValue(new Error('AI Service Unavailable'))

      const result = await aiLearningService.analyzeLearningPath('user-1')

      expect(result.ai_powered).toBe(false)
      expect(result.weaknesses).toContain('Binary Search')
      expect(result.stats.avg_score).toBe(40)
      expect(cacheService.set).toHaveBeenCalledWith(
        'ai:learningPath:user-1',
        expect.objectContaining({ ai_powered: false }),
        3600
      )
    })
  })

  describe('Chat Sessions Lifecycle', () => {
    it('retrieves user chat sessions sorted by updatedAt', async () => {
      const mockSessions = [
        { id: 'sess-1', title: 'Two Sum Help', createdAt: new Date(), updatedAt: new Date() },
      ]
      ;(prisma.aIChatSession.findMany as jest.Mock).mockResolvedValue(mockSessions)

      const result = await aiLearningService.getChatSessions('user-1')

      expect(prisma.aIChatSession.findMany).toHaveBeenCalledWith({
        where: { userId: 'user-1' },
        orderBy: { updatedAt: 'desc' },
        select: { id: true, title: true, createdAt: true, updatedAt: true },
      })
      expect(result).toEqual(mockSessions)
    })

    it('retrieves single session if owned by user', async () => {
      const session = {
        id: 'sess-1',
        userId: 'user-1',
        title: 'Two Sum',
        messages: [{ id: 'msg-1', role: 'USER', content: 'Help!', createdAt: new Date() }],
      }
      ;(prisma.aIChatSession.findUnique as jest.Mock).mockResolvedValue(session)

      const result = await aiLearningService.getChatSessionById('user-1', 'sess-1')
      expect(result).toEqual(session)
    })

    it('throws error when retrieving session of another user', async () => {
      const session = { id: 'sess-1', userId: 'user-2', title: 'Private Session' }
      ;(prisma.aIChatSession.findUnique as jest.Mock).mockResolvedValue(session)

      await expect(aiLearningService.getChatSessionById('user-1', 'sess-1')).rejects.toThrow(
        'Session not found'
      )
    })

    it('creates a new chat session', async () => {
      const createdSession = { id: 'sess-new', userId: 'user-1', title: 'DP Algorithms' }
      ;(prisma.aIChatSession.create as jest.Mock).mockResolvedValue(createdSession)

      const result = await aiLearningService.createChatSession('user-1', 'DP Algorithms')
      expect(prisma.aIChatSession.create).toHaveBeenCalledWith({
        data: { userId: 'user-1', title: 'DP Algorithms' },
      })
      expect(result).toEqual(createdSession)
    })

    it('deletes user chat session', async () => {
      ;(prisma.aIChatSession.findUnique as jest.Mock).mockResolvedValue({
        id: 'sess-1',
        userId: 'user-1',
      })
      ;(prisma.aIChatSession.delete as jest.Mock).mockResolvedValue({})

      const result = await aiLearningService.deleteChatSession('user-1', 'sess-1')
      expect(prisma.aIChatSession.delete).toHaveBeenCalledWith({ where: { id: 'sess-1' } })
      expect(result).toEqual({ success: true })
    })

    it('rejects deletion of session belonging to different user', async () => {
      ;(prisma.aIChatSession.findUnique as jest.Mock).mockResolvedValue({
        id: 'sess-1',
        userId: 'other-user',
      })

      await expect(aiLearningService.deleteChatSession('user-1', 'sess-1')).rejects.toThrow(
        'Session not found'
      )
    })
  })

  describe('getTutorResponse', () => {
    it('returns tutor response and persists messages when sessionId provided', async () => {
      ;(prisma.user.findUnique as jest.Mock).mockResolvedValue({
        username: 'Alex',
        level: 3,
        xp: 450,
        streak: 7,
      })
      ;(prisma.testResult.count as jest.Mock).mockResolvedValue(12)
      ;(prisma.testResult.findMany as jest.Mock).mockResolvedValue([])

      const response = await aiLearningService.getTutorResponse(
        'user-1',
        'How does quicksort partition work?',
        undefined,
        'sess-1'
      )

      expect(response.ai_powered).toBe(true)
      expect(response.response).toBe('This is an AI response.')
      expect(response.usage?.total_tokens).toBe(80)
    })

    it('applies active-test safeguard prompt when is_review is false', async () => {
      ;(prisma.user.findUnique as jest.Mock).mockResolvedValue(null)
      ;(prisma.testResult.count as jest.Mock).mockResolvedValue(0)
      ;(prisma.testResult.findMany as jest.Mock).mockResolvedValue([])

      await aiLearningService.getTutorResponse('user-1', 'Is option B correct?', {
        question_text: 'What is the time complexity of binary search?',
        options: ['O(N)', 'O(log N)', 'O(1)'],
        selected_option: 'O(log N)',
        is_review: false,
      })

      expect(mockAgent.generateChat).toHaveBeenCalled()
      const callMessages = mockAgent.generateChat.mock.calls[0][0]
      const systemPrompt = callMessages[0].content
      expect(systemPrompt).toContain('[MODE: ACTIVE TEST]')
      expect(systemPrompt).toContain('DO NOT give away the correct answer')
    })

    it('applies review mode prompt when is_review is true', async () => {
      ;(prisma.user.findUnique as jest.Mock).mockResolvedValue(null)
      ;(prisma.testResult.count as jest.Mock).mockResolvedValue(0)
      ;(prisma.testResult.findMany as jest.Mock).mockResolvedValue([])

      await aiLearningService.getTutorResponse('user-1', 'Explain question 1', {
        question_text: 'What is the space complexity of merge sort?',
        is_review: true,
      })

      const callMessages = mockAgent.generateChat.mock.calls[0][0]
      const systemPrompt = callMessages[0].content
      expect(systemPrompt).toContain('[MODE: REVIEW]')
      expect(systemPrompt).toContain('Provide the correct answer')
    })

    it('handles TimeoutError gracefully', async () => {
      ;(prisma.user.findUnique as jest.Mock).mockResolvedValue(null)
      ;(prisma.testResult.count as jest.Mock).mockResolvedValue(0)
      ;(prisma.testResult.findMany as jest.Mock).mockResolvedValue([])
      mockAgent.generateChat.mockRejectedValue(new TimeoutError('Timed out'))

      const response = await aiLearningService.getTutorResponse('user-1', 'Slow query')

      expect(response.ai_powered).toBe(false)
      expect(response.model).toBe('fallback')
      expect(response.response).toContain('taking too long to respond')
    })
  })

  describe('getTutorResponseStream', () => {
    it('streams chunks asynchronously to caller', async () => {
      ;(prisma.user.findUnique as jest.Mock).mockResolvedValue(null)
      ;(prisma.testResult.count as jest.Mock).mockResolvedValue(0)
      ;(prisma.testResult.findMany as jest.Mock).mockResolvedValue([])

      const generator = aiLearningService.getTutorResponseStream('user-1', 'Hello streaming')
      const chunks: string[] = []
      for await (const chunk of generator) {
        chunks.push(chunk)
      }

      expect(chunks).toEqual(['Hello ', 'world'])
    })

    it('aborts stream when signal is already aborted', async () => {
      ;(prisma.user.findUnique as jest.Mock).mockResolvedValue(null)
      ;(prisma.testResult.count as jest.Mock).mockResolvedValue(0)
      ;(prisma.testResult.findMany as jest.Mock).mockResolvedValue([])

      const abortController = new AbortController()
      abortController.abort()

      const generator = aiLearningService.getTutorResponseStream(
        'user-1',
        'Hello streaming',
        undefined,
        undefined,
        abortController.signal
      )
      const chunks: string[] = []
      for await (const chunk of generator) {
        chunks.push(chunk)
      }

      expect(chunks.length).toBe(0)
    })
  })

  describe('Algorithmic & Code Operations', () => {
    it('reviews code for time/space complexity and security vulnerabilities', async () => {
      mockAgent.generateJSON.mockResolvedValue({
        timeComplexity: 'O(N^2)',
        spaceComplexity: 'O(1)',
        vulnerabilities: [],
        optimizationHints: ['Use hash map for O(N) lookup'],
        overallFeedback: 'Quadratic approach can be optimized.',
      })

      const review = await aiLearningService.reviewCode(
        'user-1',
        'for (let i = 0; i < n; i++) for (let j = 0; j < n; j++) {}',
        'javascript',
        'Find pairs'
      )

      expect(review.timeComplexity).toBe('O(N^2)')
      expect(review.optimizationHints).toContain('Use hash map for O(N) lookup')
    })

    it('provides structured debugging help', async () => {
      mockAgent.generateJSON.mockResolvedValue({
        rootCause: 'Off by one error in loop condition',
        fix: 'Change <= to <',
        explanation: 'Index exceeds array bounds at length n',
        preventionTips: ['Check zero-indexed bounds'],
        suggestedCode: 'for (let i = 0; i < arr.length; i++)',
      })

      const debugResult = await aiLearningService.getDebuggingHelp({
        userId: 'user-1',
        code: 'for (let i = 0; i <= arr.length; i++)',
        language: 'javascript',
        problemDescription: 'Iterate over array',
        errorMessage: 'IndexOutOfBoundsException',
        expectedBehavior: 'Iterate over all elements',
        actualBehavior: 'Throws exception at the end',
      })

      expect(debugResult.rootCause).toContain('Off by one')
      expect(debugResult.fix).toBe('Change <= to <')
    })

    it('explains code line by line with complexity focus', async () => {
      mockAgent.generateJSON.mockResolvedValue({
        summary: 'Binary search algorithm',
        lineByLineExplanation: [{ line: 1, explanation: 'Initialize left and right pointers' }],
        timeComplexity: 'O(log N)',
        spaceComplexity: 'O(1)',
        potentialIssues: ['Integer overflow on (left + right) / 2'],
        improvements: ['Use left + Math.floor((right - left) / 2)'],
      })

      const explanation = await aiLearningService.explainCode({
        userId: 'user-1',
        code: 'let left = 0, right = nums.length - 1;',
        language: 'javascript',
        focusAreas: ['timeComplexity', 'bestPractices'],
      })

      expect(explanation.summary).toBe('Binary search algorithm')
      expect(explanation.timeComplexity).toBe('O(log N)')
      expect(explanation.potentialIssues.length).toBeGreaterThan(0)
    })

    it('explains a concept with real-world analogy and practice questions', async () => {
      mockAgent.generateJSON.mockResolvedValue({
        definition: 'Dynamic Programming is an optimization technique.',
        analogy: 'Writing down intermediate answers on a notepad instead of recomputing.',
        keyPoints: ['Overlapping subproblems', 'Optimal substructure'],
        examples: [{ description: 'Fibonacci numbers' }],
        relatedConcepts: ['Memoization', 'Tabulation'],
        practiceProblems: ['Climbing Stairs', 'Coin Change'],
      })

      const concept = await aiLearningService.explainConcept({
        userId: 'user-1',
        concept: 'Dynamic Programming',
        userLevel: 'beginner',
      })

      expect(concept.definition).toContain('Dynamic Programming')
      expect(concept.analogy).toContain('notepad')
      expect(concept.keyPoints).toContain('Overlapping subproblems')
    })

    it('generates personalized study plan using weak topics and caches it', async () => {
      ;(cacheService.get as jest.Mock).mockResolvedValue(null)
      ;(prisma.testResult.findMany as jest.Mock)
        .mockResolvedValueOnce([{ passed: true, percentage: 90, test: { title: 'Strings' } }])
        .mockResolvedValueOnce([])
      ;(prisma.topicPerformance.findMany as jest.Mock).mockResolvedValueOnce([
        { topic: 'Dynamic Programming', accuracy: 40 },
      ])
      ;(prisma.learningVelocityEvent.findMany as jest.Mock).mockResolvedValueOnce([
        { id: 'ev-1', createdAt: new Date() },
      ])

      mockAgent.generateJSON.mockResolvedValue({
        focusAreas: ['Dynamic Programming'],
        dailyGoals: [
          { day: 1, topic: '1D DP', estimatedHours: 2, resources: ['Intro to Memoization'] },
        ],
        milestones: [{ day: 7, goal: 'Master Knapsack variants' }],
        estimatedCompletionDays: 14,
      })

      const plan = await aiLearningService.generatePersonalizedStudyPlan(
        'user-1',
        'Ace FAANG Interviews'
      )

      expect(plan.focusAreas).toContain('Dynamic Programming')
      expect(plan.estimatedCompletionDays).toBe(14)
      expect(cacheService.set).toHaveBeenCalledWith(
        'studyPlan:user-1:Ace FAANG Interviews',
        expect.any(Object),
        86400
      )
    })
  })
})
