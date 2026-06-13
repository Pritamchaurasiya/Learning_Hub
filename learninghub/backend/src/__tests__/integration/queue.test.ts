import { jobQueueService } from '../../services/JobQueueService'

describe('JobQueueService Integration', () => {
  it('should gracefully return queue health without throwing if Redis is missing', async () => {
    const health = await jobQueueService.getQueueHealth()
    expect(health).toBeDefined()
    expect(['redis_active', 'fallback_in_memory', 'error']).toContain(health.status)
  })

  afterAll(async () => {
    await jobQueueService.close()
  })
})
