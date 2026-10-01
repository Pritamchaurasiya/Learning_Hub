/**
 * Course Service Security Tests
 *
 * Verifies server-side enforcement of:
 * - Progress validation (no fake 100% without passing)
 * - Enrollment lookup correctness
 * - Anti-cheat measures
 */
import { courseService } from '../../src/services/CourseService'
import { prisma } from '../../src/prismaClient'

jest.mock('../../src/prismaClient', () => ({
  prisma: {
    test: {
      findFirst: jest.fn(),
      findMany: jest.fn(),
      count: jest.fn(),
    },
    testResult: {
      findFirst: jest.fn(),
      findMany: jest.fn(),
      count: jest.fn(),
    },
  },
}))

jest.mock('../../src/services/CacheService', () => ({
  cacheService: {
    generateKey: jest.fn().mockReturnValue('mock-key'),
    get: jest.fn().mockResolvedValue(null),
    set: jest.fn().mockResolvedValue(true),
  },
}))

describe('CourseService — updateProgress (anti-cheat)', () => {
  beforeEach(() => {
    jest.resetAllMocks()
  })

  it('rejects 100% claim without passing test', async () => {
    ;(prisma.testResult.findFirst as jest.Mock).mockResolvedValue({
      score: 30,
      passed: false,
      completedAt: new Date(),
    })

    await expect(
      courseService.updateProgress('user-1', 'test-1', 100)
    ).rejects.toThrow('Cannot claim 100% completion without passing the test')
  })

  it('accepts 100% claim when user has passed', async () => {
    ;(prisma.testResult.findFirst as jest.Mock).mockResolvedValue({
      score: 90,
      passed: true,
      completedAt: new Date(),
    })

    const result = await courseService.updateProgress('user-1', 'test-1', 100)
    expect(result.enrollment.progress).toBeLessThanOrEqual(100)
  })

  it('clamps progress to 0-100 range', async () => {
    ;(prisma.testResult.findFirst as jest.Mock).mockResolvedValue({
      score: 100,
      passed: true,
      completedAt: new Date(),
    })

    const result = await courseService.updateProgress('user-1', 'test-1', 500)
    expect(result.enrollment.progress).toBeLessThanOrEqual(100)

    const result2 = await courseService.updateProgress('user-1', 'test-1', -50)
    expect(result2.enrollment.progress).toBeGreaterThanOrEqual(0)
  })

  it('rejects NaN or non-numeric progress', async () => {
    await expect(
      courseService.updateProgress('user-1', 'test-1', NaN)
    ).rejects.toThrow('Invalid progress value')

    await expect(
      courseService.updateProgress('user-1', 'test-1', Infinity)
    ).rejects.toThrow('Invalid progress value')

    await expect(
      // @ts-expect-error testing runtime guard
      courseService.updateProgress('user-1', 'test-1', 'not-a-number')
    ).rejects.toThrow('Invalid progress value')
  })

  it('requires authentication', async () => {
    await expect(
      courseService.updateProgress(undefined, 'test-1', 50)
    ).rejects.toThrow('Authentication required')
  })

  it('server-computed progress caps client claim', async () => {
    // User has 30% score but claims 80%
    ;(prisma.testResult.findFirst as jest.Mock).mockResolvedValue({
      score: 30,
      passed: false,
      completedAt: new Date(),
    })

    const result = await courseService.updateProgress('user-1', 'test-1', 80)
    // Cannot inflate beyond what server computed
    expect(result.enrollment.progress).toBeLessThanOrEqual(30)
  })
})

describe('CourseService — enroll', () => {
  beforeEach(() => {
    jest.resetAllMocks()
  })

  it('returns proper enrollment response for new user', async () => {
    ;(prisma.test.findFirst as jest.Mock).mockResolvedValue({
      id: 'test-1',
      title: 'Test Course',
      isPublished: true,
    })
    ;(prisma.testResult.findFirst as jest.Mock).mockResolvedValue(null)

    const result = await courseService.enroll('user-1', 'test-1')
    expect(result.status).toBe('enrolled')
    expect(result.course_id).toBe('test-1')
    expect(result.course_title).toBe('Test Course')
    expect(result.enrollment_id).toBeTruthy() // not empty string
  })

  it('returns existing enrollment for returning user', async () => {
    ;(prisma.test.findFirst as jest.Mock).mockResolvedValue({
      id: 'test-1',
      title: 'Test Course',
      isPublished: true,
    })
    ;(prisma.testResult.findFirst as jest.Mock).mockResolvedValue({
      id: 'result-1',
      status: 'COMPLETED',
      attemptNumber: 2,
    })

    const result = await courseService.enroll('user-1', 'test-1')
    expect(result.status).toBe('enrolled')
    expect(result.message).toBe('Already enrolled')
    expect(result.enrollment_id).toBe('result-1')
    expect(result.attempt_number).toBe(2)
  })

  it('rejects enrollment for non-existent course', async () => {
    ;(prisma.test.findFirst as jest.Mock).mockResolvedValue(null)

    await expect(
      courseService.enroll('user-1', 'nonexistent')
    ).rejects.toThrow('Course not found or not available')
  })

  it('requires authentication', async () => {
    await expect(
      courseService.enroll(undefined, 'test-1')
    ).rejects.toThrow('Authentication required')
  })
})

describe('CourseService — getProgress (server-computed)', () => {
  beforeEach(() => {
    jest.resetAllMocks()
  })

  it('returns 0% for user with no attempts', async () => {
    ;(prisma.testResult.findFirst as jest.Mock).mockResolvedValue(null)
    const progress = await courseService.getProgress('user-1', 'test-1')
    expect(progress.progress_percent).toBe(0)
    expect(progress.server_computed).toBe(true)
  })

  it('returns 100% for user who passed', async () => {
    ;(prisma.testResult.findFirst as jest.Mock).mockResolvedValue({
      score: 90,
      passed: true,
      completedAt: new Date(),
      status: 'COMPLETED',
    })
    const progress = await courseService.getProgress('user-1', 'test-1')
    expect(progress.progress_percent).toBe(100)
    expect(progress.completed_lessons).toBe(1)
  })

  it('caps in-progress at 10% (cannot claim more without completing)', async () => {
    ;(prisma.testResult.findFirst as jest.Mock).mockResolvedValue({
      score: 0,
      passed: false,
      completedAt: null,
      status: 'IN_PROGRESS',
    })
    const progress = await courseService.getProgress('user-1', 'test-1')
    expect(progress.progress_percent).toBeLessThanOrEqual(10)
  })

  it('caps failed attempt progress to actual score', async () => {
    ;(prisma.testResult.findFirst as jest.Mock).mockResolvedValue({
      score: 45,
      passed: false,
      completedAt: new Date(),
      status: 'COMPLETED',
    })
    const progress = await courseService.getProgress('user-1', 'test-1')
    expect(progress.progress_percent).toBeLessThanOrEqual(45)
  })
})

describe('CourseService — queries', () => {
  beforeEach(() => {
    jest.resetAllMocks()
  })

  it('getCourses returns paginated list of published courses', async () => {
    ;(prisma.test.findMany as jest.Mock).mockResolvedValue([
      {
        id: 'test-1',
        title: 'Algorithms 101',
        description: 'Basics',
        difficulty: 'EASY',
        timeLimit: 30,
        passingScore: 70,
        totalMarks: 100,
        createdAt: new Date(),
      },
    ])
    ;(prisma.test.count as jest.Mock).mockResolvedValue(1)

    const result = await courseService.getCourses({ page: '1', limit: '10', search: 'Algo' })
    expect(result.data).toHaveLength(1)
    expect(result.data[0].id).toBe('test-1')
    expect(result.meta.total).toBe(1)
  })

  it('getCourse returns course details with questions', async () => {
    ;(prisma.test.findFirst as jest.Mock).mockResolvedValue({
      id: 'test-1',
      title: 'Algorithms 101',
      description: 'Basics',
      difficulty: 'EASY',
      timeLimit: 30,
      passingScore: 70,
      totalMarks: 100,
      questions: [],
    })

    const result = await courseService.getCourse('test-1')
    expect(result).not.toBeNull()
    expect(result?.title).toBe('Algorithms 101')
  })

  it('getCourseReviews returns user review scores', async () => {
    ;(prisma.testResult.findMany as jest.Mock).mockResolvedValue([
      {
        id: 'res-1',
        score: 95,
        passed: true,
        completedAt: new Date(),
        user: { id: 'u-1', username: 'Scholar' },
      },
    ])
    ;(prisma.testResult.count as jest.Mock).mockResolvedValue(1)

    const result = await courseService.getCourseReviews('test-1', { page: '1', limit: '10' })
    expect(result.data).toHaveLength(1)
    expect(result.data[0].rating).toBe(5)
    expect(result.meta.total).toBe(1)
  })
})
