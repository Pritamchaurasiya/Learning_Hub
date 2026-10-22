import { sendSuccess, sendError, sendInternalError, sendUnauthorized, sendBadRequest } from '../utils/responseHelper'
import { Request, Response } from 'express'
import {
  systemDesignSimulatorService,
  ArchitecturePresetId,
  ArchitectureTopology,
  ChaosFaultType,
} from '../services/SystemDesignSimulatorService'
import logger from '../utils/logger'

export class SystemDesignController {
  /**
   * GET /api/v1/system-design/presets/:presetId
   */
  public getPreset(req: Request, res: Response): void {
    try {
      const presetId = (req.params.presetId as ArchitecturePresetId) || 'URL_SHORTENER_TINYURL'
      const topology = systemDesignSimulatorService.getPresetTopology(presetId)
      const spofs = systemDesignSimulatorService.detectSPOFNodes(topology)

      sendSuccess(res, {
          presetId,
          topology,
          spofNodeIds: spofs,
        })
    } catch (err: any) {
      logger.error(`[SystemDesignController] getPreset error: ${err.message}`)
      sendInternalError(res, 'Failed to retrieve architecture preset')
    }
  }

  /**
   * POST /api/v1/system-design/simulate
   */
  public simulate(req: Request, res: Response): void {
    try {
      const { topology, targetQps, activeFault } = req.body as {
        topology: ArchitectureTopology
        targetQps: number
        activeFault?: ChaosFaultType
      }

      if (!topology || !topology.nodes || !topology.edges) {
        sendBadRequest(res, 'Invalid topology provided')
        return
      }

      const qps = typeof targetQps === 'number' && targetQps > 0 ? targetQps : 5000
      const fault = activeFault || 'NONE'

      const result = systemDesignSimulatorService.runSimulation({
        topology,
        targetQps: qps,
        activeFault: fault,
      })

      sendSuccess(res, result)
    } catch (err: any) {
      logger.error(`[SystemDesignController] simulate error: ${err.message}`)
      sendInternalError(res, 'System simulation computation failed')
    }
  }
}

export const systemDesignController = new SystemDesignController()
