import { Request, Response, NextFunction } from 'express'
import { serverTimingMiddleware } from '../middleware/serverTimingMiddleware'

describe('ServerTimingMiddleware', () => {
  it('should attach timing API to request and inject Server-Timing headers upon response', done => {
    const req: Partial<Request> = {}
    const headers: Record<string, string> = {}

    const res: any = {
      headersSent: false,
      setHeader: jest.fn((name: string, value: string) => {
        headers[name] = value
      }),
      end: jest.fn(() => {
        expect(res.setHeader).toHaveBeenCalledWith('Server-Timing', expect.stringContaining('total;dur='))
        expect(res.setHeader).toHaveBeenCalledWith('Keep-Alive', 'timeout=65, max=1000')
        expect(headers['X-Response-Time']).toBeDefined()
        expect(headers['Server-Timing']).toContain('db;dur=')
        done()
      }),
    }

    const next: NextFunction = jest.fn(() => {
      expect(req.timing).toBeDefined()
      req.timing?.record('db', 4.5, 'Database Query Latency')
      req.timing?.record('cache', 0.2, 'Cache Lookup Latency')
      res.end()
    })

    serverTimingMiddleware(req as Request, res as Response, next)
    expect(next).toHaveBeenCalled()
  })
})
