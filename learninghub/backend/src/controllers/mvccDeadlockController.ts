import { Request, Response } from 'express'
import { mvccDeadlockService } from '../services/MvccDeadlockService'
import logger from '../utils/logger'

export const mvccDeadlockController = {
  /**
   * GET /api/v1/concurrency/mvcc/state
   */
  async getMvccState(_req: Request, res: Response) {
    try {
      const state = mvccDeadlockService.getMvccState()
      return res.status(200).json({
        status: 'success',
        data: state,
      })
    } catch (error: any) {
      logger.error('Failed to get MVCC state', error as Error)
      return res.status(500).json({
        status: 'error',
        message: 'Internal server error retrieving MVCC state',
      })
    }
  },

  /**
   * POST /api/v1/concurrency/mvcc/write-skew
   */
  async simulateWriteSkew(req: Request, res: Response) {
    try {
      const protocol = req.body.protocol === 'SERIALIZABLE_SSI' ? 'SERIALIZABLE_SSI' : 'SNAPSHOT_ISOLATION'
      const result = mvccDeadlockService.simulateWriteSkew(protocol)
      return res.status(200).json({
        status: 'success',
        data: result,
      })
    } catch (error: any) {
      logger.error('Failed to simulate write skew', error as Error)
      return res.status(500).json({
        status: 'error',
        message: 'Internal server error during write skew simulation',
      })
    }
  },

  /**
   * POST /api/v1/concurrency/deadlock/detect
   */
  async detectDeadlock(req: Request, res: Response) {
    try {
      const { scenario, victimPolicy } = req.body
      const result = mvccDeadlockService.detectAndResolveDeadlock({
        scenario,
        victimPolicy,
      })
      return res.status(200).json({
        status: 'success',
        data: result,
      })
    } catch (error: any) {
      logger.error('Failed to detect/resolve deadlock', error as Error)
      return res.status(500).json({
        status: 'error',
        message: 'Internal server error during deadlock detection',
      })
    }
  },

  /**
   * GET /api/v1/concurrency/comparison
   */
  async getIsolationComparison(_req: Request, res: Response) {
    try {
      const result = mvccDeadlockService.getIsolationComparison()
      return res.status(200).json({
        status: 'success',
        data: result,
      })
    } catch (error: any) {
      logger.error('Failed to get isolation comparison', error as Error)
      return res.status(500).json({
        status: 'error',
        message: 'Internal server error retrieving isolation comparison',
      })
    }
  },
}
