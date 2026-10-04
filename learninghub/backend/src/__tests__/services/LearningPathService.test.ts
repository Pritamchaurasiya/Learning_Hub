import { learningPathService } from '../../services/LearningPathService'

describe('LearningPathService', () => {
  const testUserId = 'test-path-user-321'

  it('should list all learning paths with enrollment indicators', async () => {
    const paths = await learningPathService.getLearningPaths(testUserId)
    expect(paths.length).toBeGreaterThanOrEqual(3)
    const first = paths[0]
    expect(first.id).toBeDefined()
    expect(first.title).toBeDefined()
    expect(first.level).toBeDefined()
    expect(first.skills.length).toBeGreaterThan(0)
  })

  it('should retrieve a single path by ID', async () => {
    const path = await learningPathService.getLearningPath('path-fullstack-ts', testUserId)
    expect(path).toBeDefined()
    expect(path?.id).toBe('path-fullstack-ts')
  })

  it('should enroll user in a learning path and track progress', async () => {
    const pathId = 'path-dsa-faang'
    const enrolled = await learningPathService.enroll(testUserId, pathId)
    expect(enrolled.enrolled).toBe(true)

    const myProgress = await learningPathService.getMyProgress(testUserId)
    const found = myProgress.find(p => p.id === pathId)
    expect(found).toBeDefined()
    expect(found?.enrolled).toBe(true)
  })
})
