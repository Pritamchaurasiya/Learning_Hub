import { Request, Response } from 'express'
import { RaftSimulationService } from '../services/RaftSimulationService'
import { sendSuccess, sendBadRequest } from '../utils/responseHelper'
import logger from '../utils/logger'

export class RaftSimulationController {
  private service: RaftSimulationService

  constructor() {
    this.service = new RaftSimulationService(5)
  }

  /**
   * GET /api/v1/raft/state
   */
  public getState = async (req: Request, res: Response): Promise<void> => {
    try {
      const state = this.service.getClusterState()
      sendSuccess(res, state)
    } catch (error) {
      logger.error('Failed to get Raft cluster state:', error as Error)
      sendBadRequest(res, 'Could not retrieve Raft cluster state')
    }
  }

  /**
   * POST /api/v1/raft/reset
   */
  public resetCluster = async (req: Request, res: Response): Promise<void> => {
    try {
      const nodeCount = req.body?.nodeCount ? Number(req.body.nodeCount) : 5
      const state = this.service.initializeCluster(nodeCount)
      sendSuccess(res, state)
    } catch (error) {
      logger.error('Failed to reset Raft cluster:', error as Error)
      sendBadRequest(res, 'Could not reset Raft cluster')
    }
  }

  /**
   * POST /api/v1/raft/tick
   */
  public tick = async (req: Request, res: Response): Promise<void> => {
    try {
      const deltaMs = req.body?.deltaMs ? Number(req.body.deltaMs) : 50
      const state = this.service.tick(deltaMs)
      sendSuccess(res, state)
    } catch (error) {
      logger.error('Failed to advance Raft tick:', error as Error)
      sendBadRequest(res, 'Could not advance Raft simulation tick')
    }
  }

  /**
   * POST /api/v1/raft/election
   */
  public startElection = async (req: Request, res: Response): Promise<void> => {
    try {
      const { candidateId } = req.body
      if (!candidateId) {
        sendBadRequest(res, 'candidateId is required to start an election')
        return
      }
      const state = this.service.startElection(candidateId)
      sendSuccess(res, state)
    } catch (error) {
      logger.error('Failed to trigger Raft election:', error as Error)
      sendBadRequest(res, 'Could not trigger Raft election')
    }
  }

  /**
   * POST /api/v1/raft/command
   */
  public submitCommand = async (req: Request, res: Response): Promise<void> => {
    try {
      const { command } = req.body
      if (!command) {
        sendBadRequest(res, 'command string is required')
        return
      }
      const result = this.service.submitClientCommand(command)
      sendSuccess(res, result)
    } catch (error) {
      logger.error('Failed to submit client command to Raft leader:', error as Error)
      sendBadRequest(res, 'Could not execute client write command')
    }
  }

  /**
   * POST /api/v1/raft/partition
   */
  public partition = async (req: Request, res: Response): Promise<void> => {
    try {
      const { groupA, groupB } = req.body
      if (!Array.isArray(groupA) || !Array.isArray(groupB)) {
        sendBadRequest(res, 'groupA and groupB arrays of node IDs are required')
        return
      }
      const state = this.service.partitionCluster({ groupA, groupB })
      sendSuccess(res, state)
    } catch (error) {
      logger.error('Failed to partition Raft cluster:', error as Error)
      sendBadRequest(res, 'Could not apply network partition')
    }
  }

  /**
   * POST /api/v1/raft/heal
   */
  public heal = async (req: Request, res: Response): Promise<void> => {
    try {
      const state = this.service.healPartition()
      sendSuccess(res, state)
    } catch (error) {
      logger.error('Failed to heal Raft network partition:', error as Error)
      sendBadRequest(res, 'Could not heal network partition')
    }
  }

  /**
   * POST /api/v1/raft/nodes/:nodeId/crash
   */
  public crashNode = async (req: Request, res: Response): Promise<void> => {
    try {
      const nodeId = Array.isArray(req.params.nodeId) ? req.params.nodeId[0] : req.params.nodeId
      const state = this.service.crashNode(nodeId)
      sendSuccess(res, state)
    } catch (error) {
      logger.error('Failed to crash Raft node:', error as Error)
      sendBadRequest(res, 'Could not crash node')
    }
  }

  /**
   * POST /api/v1/raft/nodes/:nodeId/recover
   */
  public recoverNode = async (req: Request, res: Response): Promise<void> => {
    try {
      const nodeId = Array.isArray(req.params.nodeId) ? req.params.nodeId[0] : req.params.nodeId
      const state = this.service.recoverNode(nodeId)
      sendSuccess(res, state)
    } catch (error) {
      logger.error('Failed to recover Raft node:', error as Error)
      sendBadRequest(res, 'Could not recover node')
    }
  }

  /**
   * GET /api/v1/raft/invariants
   */
  public auditInvariants = async (req: Request, res: Response): Promise<void> => {
    try {
      const audit = this.service.verifyInvariants()
      sendSuccess(res, audit)
    } catch (error) {
      logger.error('Failed to audit Raft invariants:', error as Error)
      sendBadRequest(res, 'Could not audit Raft invariants')
    }
  }
}

export const raftSimulationController = new RaftSimulationController()
