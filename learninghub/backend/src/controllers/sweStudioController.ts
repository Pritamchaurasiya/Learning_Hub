import { Request, Response } from 'express'
import { AutonomousSweStudioService } from '../services/AutonomousSweStudioService'
import { sendSuccess, sendError } from '../utils/responseHelper'
import logger from '../utils/logger'

export class SweStudioController {
  /**
   * GET /api/v1/swe-studio/presets
   */
  public static getPresets(req: Request, res: Response): void {
    try {
      const presets = AutonomousSweStudioService.getBenchmarkPresets()
      sendSuccess(res, { presets }, 'Benchmark issues retrieved successfully')
    } catch (err: any) {
      logger.error('[SweStudioController] Failed to retrieve presets:', err)
      sendError(res, err.message || 'Failed to retrieve presets', 500)
    }
  }

  /**
   * POST /api/v1/swe-studio/resolve
   */
  public static async resolveIssue(req: Request, res: Response): Promise<void> {
    try {
      const issueInput = req.body
      if (!issueInput || (!issueInput.id && !issueInput.title)) {
        sendError(res, 'Missing issue identification (id or title)', 400)
        return
      }

      const resolution = await AutonomousSweStudioService.runAutonomousResolution(issueInput)
      sendSuccess(res, resolution, 'Autonomous issue resolution pipeline completed successfully')
    } catch (err: any) {
      logger.error('[SweStudioController] Failed to resolve issue:', err)
      sendError(res, err.message || 'Failed to resolve issue', 500)
    }
  }

  /**
   * POST /api/v1/swe-studio/sbfl
   */
  public static calculateSbfl(req: Request, res: Response): void {
    try {
      const { failedCount, passedCount, totalFailed, totalPassed } = req.body
      if (
        typeof failedCount !== 'number' ||
        typeof passedCount !== 'number' ||
        typeof totalFailed !== 'number'
      ) {
        sendError(res, 'Invalid SBFL parameter payload', 400)
        return
      }

      const ochiaiScore = AutonomousSweStudioService.calculateOchiaiSuspiciousness(
        failedCount,
        passedCount,
        totalFailed
      )
      const tarantulaScore = AutonomousSweStudioService.calculateTarantulaScore(
        failedCount,
        passedCount,
        totalFailed,
        totalPassed || passedCount + 10
      )

      sendSuccess(res, { ochiaiScore, tarantulaScore }, 'SBFL calculations computed')
    } catch (err: any) {
      logger.error('[SweStudioController] Failed SBFL calculation:', err)
      sendError(res, err.message || 'Failed SBFL calculation', 500)
    }
  }
}
