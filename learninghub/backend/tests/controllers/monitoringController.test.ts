import { Request, Response } from 'express'
import {
  deepHealthCheck,
  getMetrics,
  getDatabaseStatus,
  getCacheStatus,
  getProcesses,
} from '../../src/controllers/monitoringController'
import { prisma } from '../../src/prismaClient'
import { cacheService } from '../../src/services/CacheService'

describe('Monitoring Controller', () => {
  let req: Partial<Request>
  let res: Partial<Response>
  let jsonMock: jest.Mock
  let statusMock: jest.Mock

  beforeEach(() => {
    jsonMock = jest.fn().mockReturnThis()
    statusMock = jest.fn().mockReturnValue({ json: jsonMock })

    req = {
      user: undefined,
      query: {},
      params: {},
    }
    res = {
      status: statusMock,
      json: jsonMock,
    }
  })

  describe('deepHealthCheck', () => {
    it('returns healthy status for non-admin requests', async () => {
      ;(prisma.$queryRaw as jest.Mock).mockResolvedValueOnce([{ 1: 1 }])
      ;(cacheService.get as jest.Mock).mockResolvedValueOnce('pong')

      await deepHealthCheck(req as Request, res as Response, jest.fn())

      expect(statusMock).toHaveBeenCalledWith(200)
      expect(jsonMock).toHaveBeenCalledWith(
        expect.objectContaining({
          status: 'success',
          data: expect.objectContaining({
            status: 'healthy',
            components: expect.objectContaining({
              database: expect.objectContaining({ status: 'healthy' }),
              cache: expect.objectContaining({ status: 'healthy' }),
              ai_engine: expect.objectContaining({ status: 'healthy' }),
            }),
          }),
        })
      )
    })

    it('includes detailed system metrics for admin users', async () => {
      req.user = { userId: 'admin-1', role: 'ADMIN' } as any
      ;(prisma.$queryRaw as jest.Mock).mockResolvedValueOnce([{ 1: 1 }])
      ;(cacheService.get as jest.Mock).mockResolvedValueOnce('pong')

      await deepHealthCheck(req as Request, res as Response, jest.fn())

      expect(statusMock).toHaveBeenCalledWith(200)
      const data = jsonMock.mock.calls[0][0].data
      expect(data.components.system).toBeDefined()
      expect(typeof data.components.system.cpu_percent).toBe('number')
      expect(typeof data.components.system.memory_used_percent).toBe('number')
    })

    it('returns 503 critical status when database fails for admin', async () => {
      req.user = { userId: 'admin-1', role: 'ADMIN' } as any
      ;(prisma.$queryRaw as jest.Mock).mockRejectedValueOnce(new Error('Connection refused'))

      await deepHealthCheck(req as Request, res as Response, jest.fn())

      expect(statusMock).toHaveBeenCalledWith(503)
      const data = jsonMock.mock.calls[0][0].data
      expect(data.status).toBe('critical')
      expect(data.components.database.status).toBe('unhealthy')
    })
  })

  describe('getMetrics', () => {
    it('returns system and application statistics', async () => {
      ;(prisma.user.count as jest.Mock).mockResolvedValueOnce(1250)
      ;(prisma.test.count as jest.Mock).mockResolvedValueOnce(84)
      ;(prisma.testResult.count as jest.Mock).mockResolvedValueOnce(3420)

      await getMetrics(req as Request, res as Response, jest.fn())

      expect(statusMock).toHaveBeenCalledWith(200)
      expect(jsonMock).toHaveBeenCalledWith(
        expect.objectContaining({
          status: 'success',
          data: expect.objectContaining({
            system: expect.objectContaining({
              cpu_count: expect.any(Number),
              memory_percent: expect.any(Number),
            }),
            application: expect.objectContaining({
              total_users: 1250,
              total_tests: 84,
              total_submissions: 3420,
            }),
          }),
        })
      )
    })
  })

  describe('getDatabaseStatus', () => {
    it('returns connected status when database responds', async () => {
      ;(prisma.$queryRaw as jest.Mock).mockResolvedValueOnce([{ 1: 1 }])

      await getDatabaseStatus(req as Request, res as Response, jest.fn())

      expect(statusMock).toHaveBeenCalledWith(200)
      expect(jsonMock).toHaveBeenCalledWith(
        expect.objectContaining({
          status: 'success',
          data: expect.objectContaining({
            status: 'connected',
            response_time_ms: expect.any(Number),
          }),
        })
      )
    })

    it('returns 503 when database query throws error', async () => {
      ;(prisma.$queryRaw as jest.Mock).mockRejectedValueOnce(new Error('DB Timeout'))

      await getDatabaseStatus(req as Request, res as Response, jest.fn())

      expect(statusMock).toHaveBeenCalledWith(503)
      expect(jsonMock).toHaveBeenCalledWith(
        expect.objectContaining({
          status: 'error',
          code: 'DATABASE_ERROR',
        })
      )
    })
  })

  describe('getCacheStatus', () => {
    it('returns connected status when cache responds with pong', async () => {
      ;(cacheService.get as jest.Mock).mockResolvedValueOnce('pong')

      await getCacheStatus(req as Request, res as Response, jest.fn())

      expect(statusMock).toHaveBeenCalledWith(200)
      expect(jsonMock).toHaveBeenCalledWith(
        expect.objectContaining({
          status: 'success',
          data: expect.objectContaining({
            status: 'connected',
            test_value: 'ok',
          }),
        })
      )
    })
  })

  describe('getProcesses', () => {
    it('returns active process information', async () => {
      await getProcesses(req as Request, res as Response, jest.fn())

      expect(statusMock).toHaveBeenCalledWith(200)
      expect(jsonMock).toHaveBeenCalledWith(
        expect.objectContaining({
          status: 'success',
          data: expect.objectContaining({
            processes: expect.arrayContaining([
              expect.objectContaining({
                name: 'learninghub-api',
                status: 'running',
                pid: expect.any(Number),
              }),
            ]),
          }),
        })
      )
    })
  })
})
