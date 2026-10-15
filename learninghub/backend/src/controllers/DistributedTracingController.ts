import { Request, Response } from 'express'
import { distributedTracingSimulationService } from '../services/DistributedTracingSimulationService'
import { sendSuccess, sendBadRequest, sendNotFound, sendInternalError } from '../utils/responseHelper'
import logger from '../utils/logger'

export class DistributedTracingController {
  public getTraces = async (_req: Request, res: Response) => {
    try {
      const traces = distributedTracingSimulationService.getTraces()
      return sendSuccess(res, traces, 'Distributed traces retrieved successfully')
    } catch (error) {
      logger.error(
        '[DistributedTracingController] Error retrieving traces:',
        error instanceof Error ? error : new Error(String(error))
      )
      return sendInternalError(res, 'Failed to retrieve traces')
    }
  }

  public getTraceById = async (req: Request, res: Response) => {
    try {
      const traceId = String(req.params.traceId)
      const trace = distributedTracingSimulationService.getTraceById(traceId)
      if (!trace) {
        return sendNotFound(res, `Trace ${traceId} not found`)
      }
      return sendSuccess(res, trace, 'Trace details retrieved')
    } catch (error) {
      logger.error(
        '[DistributedTracingController] Error retrieving trace by id:',
        error instanceof Error ? error : new Error(String(error))
      )
      return sendInternalError(res, 'Failed to retrieve trace')
    }
  }

  public simulateRequest = async (req: Request, res: Response) => {
    try {
      const { scenarioName, userId, courseId, clientBaggage, customDelays, forceErrorOnService } = req.body

      const trace = distributedTracingSimulationService.simulateTransactionRequest({
        scenarioName: scenarioName || 'CheckoutAndEnrollment',
        userId: userId || 'usr-guest-99',
        courseId: courseId || 'course-distributed-systems',
        clientBaggage,
        customDelays,
        forceErrorOnService,
      })

      return sendSuccess(res, trace, 'Transaction traced and analyzed successfully')
    } catch (error) {
      logger.error(
        '[DistributedTracingController] Error simulating request:',
        error instanceof Error ? error : new Error(String(error))
      )
      return sendInternalError(res, 'Failed to simulate distributed request')
    }
  }

  public setChaosRule = async (req: Request, res: Response) => {
    try {
      const { targetService, additionalLatencyMs, injectError, errorRate } = req.body
      if (!targetService) {
        return sendBadRequest(res, 'targetService is required')
      }

      distributedTracingSimulationService.setChaosRule({
        targetService: String(targetService),
        additionalLatencyMs: Number(additionalLatencyMs || 0),
        injectError: Boolean(injectError),
        errorRate: Number(errorRate ?? 0.5),
      })

      return sendSuccess(res, { targetService }, `Chaos rule configured for ${targetService}`)
    } catch (error) {
      logger.error(
        '[DistributedTracingController] Error setting chaos rule:',
        error instanceof Error ? error : new Error(String(error))
      )
      return sendInternalError(res, 'Failed to set chaos rule')
    }
  }

  public clearChaosRules = async (_req: Request, res: Response) => {
    try {
      distributedTracingSimulationService.clearChaosRules()
      return sendSuccess(res, null, 'All chaos rules cleared')
    } catch (error) {
      logger.error(
        '[DistributedTracingController] Error clearing chaos rules:',
        error instanceof Error ? error : new Error(String(error))
      )
      return sendInternalError(res, 'Failed to clear chaos rules')
    }
  }

  public getLatencyDistributions = async (_req: Request, res: Response) => {
    try {
      const distributions = distributedTracingSimulationService.getLatencyDistributions()
      return sendSuccess(res, distributions, 'Latency distributions calculated')
    } catch (error) {
      logger.error(
        '[DistributedTracingController] Error calculating latency distributions:',
        error instanceof Error ? error : new Error(String(error))
      )
      return sendInternalError(res, 'Failed to calculate latency distributions')
    }
  }

  public reset = async (_req: Request, res: Response) => {
    try {
      distributedTracingSimulationService.reset()
      return sendSuccess(res, null, 'Tracing simulation reset')
    } catch (error) {
      logger.error(
        '[DistributedTracingController] Error resetting simulation:',
        error instanceof Error ? error : new Error(String(error))
      )
      return sendInternalError(res, 'Failed to reset simulation')
    }
  }
}

export const distributedTracingController = new DistributedTracingController()
