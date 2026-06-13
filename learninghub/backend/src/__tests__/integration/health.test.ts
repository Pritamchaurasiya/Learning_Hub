import { platformHealthService } from '../../services/PlatformHealthService'

describe('PlatformHealthService Integration', () => {
  it('should return healthy status if DB is reachable', async () => {
    const health = await platformHealthService.getHealth()
    expect(health.systemHealth.databaseStatus).toBe('healthy')
    expect(health.systemHealth.memoryUsageMB).toBeGreaterThan(0)
  })

  it('should fetch database metrics correctly', async () => {
    const health = await platformHealthService.getHealth()
    expect(typeof health.systemHealth.activeConnections).toBe('number')
    expect(typeof health.systemHealth.idleConnections).toBe('number')
  })
})
