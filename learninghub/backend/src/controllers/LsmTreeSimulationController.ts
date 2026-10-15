import { Request, Response } from 'express'
import { LsmTreeSimulationService } from '../services/LsmTreeSimulationService'

const lsmService = new LsmTreeSimulationService()

export class LsmTreeSimulationController {
  public static getSnapshot(req: Request, res: Response): void {
    try {
      const snapshot = lsmService.getSnapshot()
      res.json({
        success: true,
        data: snapshot,
      })
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message })
    }
  }

  public static put(req: Request, res: Response): void {
    try {
      const { key, value } = req.body
      if (!key || value === undefined) {
        res.status(400).json({ success: false, error: 'Key and value are required.' })
        return
      }

      const result = lsmService.put(String(key), typeof value === 'string' ? value : JSON.stringify(value))
      res.json({
        success: true,
        data: result,
      })
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message })
    }
  }

  public static delete(req: Request, res: Response): void {
    try {
      const { key } = req.body
      if (!key) {
        res.status(400).json({ success: false, error: 'Key is required for deletion.' })
        return
      }

      const result = lsmService.delete(String(key))
      res.json({
        success: true,
        data: result,
      })
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message })
    }
  }

  public static get(req: Request, res: Response): void {
    try {
      const { key } = req.query
      if (!key) {
        res.status(400).json({ success: false, error: 'Key query parameter is required.' })
        return
      }

      const trace = lsmService.get(String(key))
      res.json({
        success: true,
        data: trace,
      })
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message })
    }
  }

  public static flush(req: Request, res: Response): void {
    try {
      const sstable = lsmService.flushMemTable()
      res.json({
        success: true,
        data: {
          flushed: !!sstable,
          sstable,
        },
      })
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message })
    }
  }

  public static compact(req: Request, res: Response): void {
    try {
      const level = req.body.level !== undefined ? Number(req.body.level) : 0
      const result = lsmService.compactLevel(level)
      res.json({
        success: true,
        data: result,
      })
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message })
    }
  }

  public static crashRecover(req: Request, res: Response): void {
    try {
      const result = lsmService.simulateCrashAndRecover()
      res.json({
        success: true,
        data: result,
      })
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message })
    }
  }
}
