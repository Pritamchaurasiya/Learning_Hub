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

      res.status(200).json({
        success: true,
        data: {
          presetId,
          topology,
          spofNodeIds: spofs,
        },
      })
    } catch (err: any) {
      logger.error(`[SystemDesignController] getPreset error: ${err.message}`)
      res.status(500).json({ success: false, message: 'Failed to retrieve architecture preset' })
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
        res.status(400).json({ success: false, message: 'Invalid topology provided' })
        return
      }

      const qps = typeof targetQps === 'number' && targetQps > 0 ? targetQps : 5000
      const fault = activeFault || 'NONE'

      const result = systemDesignSimulatorService.runSimulation({
        topology,
        targetQps: qps,
        activeFault: fault,
      })

      res.status(200).json({
        success: true,
        data: result,
      })
    } catch (err: any) {
      logger.error(`[SystemDesignController] simulate error: ${err.message}`)
      res.status(500).json({ success: false, message: 'System simulation computation failed' })
    }
  }
}

export const systemDesignController = new SystemDesignController()
