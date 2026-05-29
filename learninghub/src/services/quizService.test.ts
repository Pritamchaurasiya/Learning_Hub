import { describe, it, expect, vi, beforeEach } from 'vitest'
import { quizService } from './quizService'

// Mock fetchApi function
vi.mock('../utils/api', () => ({
  fetchApi: vi.fn(),
}))

describe('quizService', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('getCourseQuizzes', () => {
    it('should fetch quizzes for a course', async () => {
      const { fetchApi } = await import('../utils/api')
      vi.mocked(fetchApi).mockResolvedValue({
        status: 'success',
        data: [
          { id: '1', title: 'Quiz 1', time_limit: 30 },
          { id: '2', title: 'Quiz 2', time_limit: 45 },
        ],
      })

      const result = await quizService.getCourseQuizzes('course-123')

      expect(fetchApi).toHaveBeenCalledWith('/tests?courseId=course-123')
      expect(result).toEqual({
        status: 'success',
        data: [
          { id: '1', title: 'Quiz 1', time_limit: 30 },
          { id: '2', title: 'Quiz 2', time_limit: 45 },
        ],
      })
    })

    it('should handle paginated response', async () => {
      const { fetchApi } = await import('../utils/api')
      vi.mocked(fetchApi).mockResolvedValue({
        status: 'success',
        data: [{ id: '1', title: 'Quiz 1' }],
        meta: { page: 1, limit: 10, total: 1 },
      })

      const result = await quizService.getCourseQuizzes('course-123')

      expect(result.data).toEqual([{ id: '1', title: 'Quiz 1' }])
    })
  })

  describe('getQuiz', () => {
    it('should fetch quiz details with questions', async () => {
      const { fetchApi } = await import('../utils/api')
      const mockQuizData = {
        id: '1',
        title: 'Test Quiz',
        time_limit: 30,
        passing_score: 70,
        questions: [
          { id: 'q1', text: 'Question 1', question_type: 'mcq', marks: 1 },
          { id: 'q2', text: 'Question 2', question_type: 'mcq', marks: 1 },
        ],
      }

      vi.mocked(fetchApi).mockResolvedValue({
        status: 'success',
        data: mockQuizData,
      })

      const result = await quizService.getQuiz('quiz-123')

      expect(fetchApi).toHaveBeenCalledWith('/tests/quiz-123')
      expect(result.data.quiz.id).toEqual('1')
      expect(result.data.questions[0].id).toBe('q1')
      expect(result.data.questions[0].question).toBe('Question 1')
    })
  })

  describe('startAttempt', () => {
    it('should start a quiz attempt', async () => {
      const { fetchApi } = await import('../utils/api')
      vi.mocked(fetchApi).mockResolvedValue({
        status: 'success',
        data: {
          attempt_id: 'attempt-123',
          questions: [{ id: 'q1', text: 'Q1', question_type: 'mcq', marks: 1 }],
        },
      })

      const result = await quizService.startAttempt('quiz-123')

      expect(fetchApi).toHaveBeenCalledWith('/tests/quiz-123/start', {
        method: 'POST',
      })
      expect(result.data.attempt_id).toBe('attempt-123')
    })
  })

  describe('submitQuiz', () => {
    it('should submit quiz with answers and timeTaken', async () => {
      const { fetchApi } = await import('../utils/api')
      const mockResult = {
        id: 'result-123',
        score: 85,
        passed: true,
      }

      vi.mocked(fetchApi).mockResolvedValue({
        status: 'success',
        data: mockResult,
      })

      const answers = { q1: 'a', q2: 'b' }
      const timeTaken = 300

      const result = await quizService.submitQuiz('quiz-123', 'attempt-123', answers, timeTaken)

      expect(fetchApi).toHaveBeenCalledWith('/tests/quiz-123/submit', {
        method: 'POST',
        body: JSON.stringify({ attempt_id: 'attempt-123', answers, timeTaken }),
      })
      expect(result.data.attempt_id).toEqual('result-123')
      expect(result.data.score).toEqual(85)
    })

    it('should include timeTaken in request body', async () => {
      const { fetchApi } = await import('../utils/api')
      vi.mocked(fetchApi).mockResolvedValue({
        status: 'success',
        data: { id: 'result-123' },
      })

      await quizService.submitQuiz('quiz-123', 'attempt-123', {}, 300)

      const callArgs = vi.mocked(fetchApi).mock.calls[0]
      if (callArgs?.[1]?.body) {
        const body = JSON.parse(callArgs[1].body as string)
        expect(body.timeTaken).toBe(300)
      }
    })
  })

  describe('getResults', () => {
    it('should fetch quiz results', async () => {
      const { fetchApi } = await import('../utils/api')
      const mockResult = {
        id: 'result-123',
        score: 85,
        total_score: 100,
        passed: true,
      }

      vi.mocked(fetchApi).mockResolvedValue({
        status: 'success',
        data: mockResult, // The service returns res.data directly now
      })

      const result = await quizService.getResults('quiz-123')

      expect(fetchApi).toHaveBeenCalledWith('/tests/quiz-123/result')
      expect(result.data).toEqual(mockResult)
    })
  })

  describe('getAttempts', () => {
    it('should fetch quiz attempts', async () => {
      const { fetchApi } = await import('../utils/api')
      const mockAttempts = [
        { id: 'attempt-1', score: 80 },
        { id: 'attempt-2', score: 90 },
      ]

      vi.mocked(fetchApi).mockResolvedValue({
        status: 'success',
        data: { data: mockAttempts }, // service expects res.data?.data
      })

      const result = await quizService.getAttempts('quiz-123')

      expect(fetchApi).toHaveBeenCalledWith('/tests/quiz-123/attempts')
      expect(result.data).toEqual(mockAttempts)
    })
  })

  describe('getMyResults', () => {
    it('should fetch user quiz results', async () => {
      const { fetchApi } = await import('../utils/api')
      const mockResults = [
        { id: 'result-1', score: 85 },
        { id: 'result-2', score: 90 },
      ]

      vi.mocked(fetchApi).mockResolvedValue({
        status: 'success',
        data: { data: mockResults }, // expects res.data?.data
      })

      const result = await quizService.getMyResults()

      expect(fetchApi).toHaveBeenCalledWith('/tests/my-results')
      expect(result.data.results).toEqual(mockResults)
    })
  })
})
