import { sendSuccess, sendError, sendInternalError, sendUnauthorized, sendBadRequest } from '../utils/responseHelper'
import { Request, Response } from 'express'
import {
  selfHealingCodeService,
  CodeSnippetPresetId,
} from '../services/SelfHealingCodeService'
import logger from '../utils/logger'

export class SelfHealingCodeController {
  /**
   * GET /api/v1/self-healing/presets/:presetId
   */
  public getPreset(req: Request, res: Response): void {
    try {
      const presetId = (req.params.presetId as CodeSnippetPresetId) || 'N_PLUS_ONE_QUERY_LOOP'
      const preset = selfHealingCodeService.getPresetCode(presetId)

      sendSuccess(res, {
          presetId,
          fileName: preset.fileName,
          code: preset.code,
        })
    } catch (err: any) {
      logger.error(`[SelfHealingCodeController] getPreset error: ${err.message}`)
      sendInternalError(res, 'Failed to retrieve code preset')
    }
  }

  /**
   * POST /api/v1/self-healing/analyze
   */
  public analyze(req: Request, res: Response): void {
    try {
      const { code, fileName } = req.body as {
        code: string
        fileName?: string
      }

      if (!code || typeof code !== 'string') {
        sendBadRequest(res, 'Source code string is required for analysis')
        return
      }

      const result = selfHealingCodeService.analyzeAndGeneratePatch({
        code,
        fileName,
      })

      sendSuccess(res, result)
    } catch (err: any) {
      logger.error(`[SelfHealingCodeController] analyze error: ${err.message}`)
      sendInternalError(res, 'Code analysis and patch synthesis failed')
    }
  }
}

export const selfHealingCodeController = new SelfHealingCodeController()
