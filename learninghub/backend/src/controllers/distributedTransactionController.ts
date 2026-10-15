import { Request, Response } from 'express'
import { distributedTransactionService } from '../services/DistributedTransactionService'
import { sendSuccess, sendBadRequest } from '../utils/responseHelper'
import logger from '../utils/logger'

export class DistributedTransactionController {
  /**
   * POST /api/v1/transactions/2pc/execute
   */
  public execute2PC = async (req: Request, res: Response): Promise<void> => {
    try {
      const { failingParticipantId, simulateCoordinatorCrash } = req.body || {}
      const result = distributedTransactionService.executeTwoPhaseCommit({
        failingParticipantId,
        simulateCoordinatorCrash,
      })
      sendSuccess(res, result)
    } catch (error) {
      logger.error('Failed to execute 2PC simulation:', error as Error)
      sendBadRequest(res, 'Could not execute Two-Phase Commit transaction')
    }
  }

  /**
   * POST /api/v1/transactions/saga/execute
   */
  public executeSaga = async (req: Request, res: Response): Promise<void> => {
    try {
      const { failAtStepIndex } = req.body || {}
      const result = distributedTransactionService.executeSagaWorkflow({
        failAtStepIndex: failAtStepIndex !== undefined ? Number(failAtStepIndex) : undefined,
      })
      sendSuccess(res, result)
    } catch (error) {
      logger.error('Failed to execute Saga workflow simulation:', error as Error)
      sendBadRequest(res, 'Could not execute Saga workflow transaction')
    }
  }

  /**
   * GET /api/v1/transactions/comparison
   */
  public getComparison = async (req: Request, res: Response): Promise<void> => {
    try {
      const data = distributedTransactionService.getProtocolComparison()
      sendSuccess(res, data)
    } catch (error) {
      logger.error('Failed to retrieve protocol comparison:', error as Error)
      sendBadRequest(res, 'Could not retrieve transaction protocol comparison')
    }
  }
}

export const distributedTransactionController = new DistributedTransactionController()
