import { jobQueueService } from '../../src/services/JobQueueService'
import { topicPerformanceService } from '../../src/services/TopicPerformanceService'
import { growthEngineService } from '../../src/services/GrowthEngineService'
import { testEngineService } from '../../src/services/TestEngineService'

jest.mock('../../src/utils/logger', () => {
  const mockLogger = {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    debug: jest.fn(),
  }
  return { ...mockLogger, default: mockLogger }
})

jest.mock('../../src/services/TopicPerformanceService', () => ({
  topicPerformanceService: {
    updateForTestResults: jest.fn().mockResolvedValue(undefined),
  },
}))

jest.mock('../../src/services/GrowthEngineService', () => ({
  growthEngineService: {
    awardXP: jest.fn().mockResolvedValue(undefined),
  },
}))

jest.mock('../../src/services/TestEngineService', () => ({
  testEngineService: {
    processExpiredTestSubmission: jest.fn().mockResolvedValue(undefined),
  },
}))

describe('JobQueueService Suite (Fallback Mode / Redis Disabled)', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('should return fallback health status when Redis is disabled', async () => {
    const health = await jobQueueService.getQueueHealth()
    expect(health.status).toBe('fallback_in_memory')
  })

  it('should process addEmailJob in memory and return null', async () => {
    const res = await jobQueueService.addEmailJob({
      to: 'test@example.com',
      subject: 'Hello',
      template: 'welcome',
      data: {},
    })
    expect(res).toBeNull()
  })

  it('should process addAIJob in memory and return null', async () => {
    const res = await jobQueueService.addAIJob({
      userId: 'user-1',
      operation: 'SUMMARIZE',
      params: {},
    })
    expect(res).toBeNull()
  })

  it('should process addReportJob in memory and return null', async () => {
    const res = await jobQueueService.addReportJob({
      userId: 'user-1',
      reportType: 'WEEKLY',
      filters: {},
    })
    expect(res).toBeNull()
  })

  it('should synchronously invoke topicPerformanceService in addAnalyticsJob fallback', async () => {
    const questionResults = [{ questionId: 'q1', topicName: 'Algebra', isCorrect: true }]
    const res = await jobQueueService.addAnalyticsJob({
      userId: 'user-1',
      testResultId: 'tr-1',
      questionResults,
    })
    expect(res).toBeNull()
    expect(topicPerformanceService.updateForTestResults).toHaveBeenCalledWith(
      'user-1',
      questionResults
    )
  })

  it('should synchronously invoke growthEngineService in addGrowthJob fallback', async () => {
    const res = await jobQueueService.addGrowthJob({
      userId: 'user-1',
      action: 'test_completed',
    })
    expect(res).toBeNull()
    expect(growthEngineService.awardXP).toHaveBeenCalledWith('user-1', 'test_completed')
  })

  it('should synchronously invoke testEngineService in addTestSubmissionJob fallback', async () => {
    const res = await jobQueueService.addTestSubmissionJob({
      attemptId: 'att-1',
      testId: 'test-1',
      userId: 'user-1',
    })
    expect(res).toBeNull()
    expect(testEngineService.processExpiredTestSubmission).toHaveBeenCalledWith('att-1')
  })

  it('should return null for getJobStatus when queue is not initialized', async () => {
    const status = await jobQueueService.getJobStatus('email', 'job-1')
    expect(status).toBeNull()
  })
})
