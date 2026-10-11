import { Request, Response } from 'express'
import { chaosClusterSimulationService } from '../services/ChaosClusterSimulationService'
import { sendSuccess, sendBadRequest } from '../utils/responseHelper'
import logger from '../utils/logger'

/**
 * Controller for Chaos Monkey & Cluster Partition Simulator (Milestone 23)
 */
export class ChaosClusterController {
  /**
   * GET /api/v1/chaos/presets
   */
  public getPresets = async (req: Request, res: Response): Promise<void> => {
    try {
      const presets = chaosClusterSimulationService.getPresetTopologies()
      sendSuccess(res, presets)
    } catch (error) {
      logger.error('Failed to retrieve chaos presets:', error as Error)
      sendBadRequest(res, 'Could not retrieve preset cluster topologies')
    }
  }

  /**
   * POST /api/v1/chaos/experiment
   */
  public runExperiment = async (req: Request, res: Response): Promise<void> => {
    try {
      const { topology, experiment } = req.body

      if (!topology || !topology.nodes || !Array.isArray(topology.nodes)) {
        sendBadRequest(res, 'Valid cluster topology with nodes is required')
        return
      }

      if (!experiment || !experiment.faultType) {
        sendBadRequest(res, 'Valid experiment configuration with faultType is required')
        return
      }

      const result = chaosClusterSimulationService.runChaosExperiment({
        topology,
        experiment,
      })

      sendSuccess(res, result)
    } catch (error) {
      logger.error('Failed to execute chaos experiment:', error as Error)
      sendBadRequest(res, 'An error occurred during cluster chaos experiment')
    }
  }
}

export const chaosClusterController = new ChaosClusterController()
