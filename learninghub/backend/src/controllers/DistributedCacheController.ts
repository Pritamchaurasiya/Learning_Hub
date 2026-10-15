import { Request, Response } from 'express'
import { distributedCacheSimulationService } from '../services/DistributedCacheSimulationService'
import { sendSuccess, sendError } from '../utils/responseHelper'
import logger from '../utils/logger'

export class DistributedCacheController {
  public getTopology = async (_req: Request, res: Response): Promise<void> => {
    try {
      const topology = distributedCacheSimulationService.getRingTopology()
      const sampleTokens = distributedCacheSimulationService.getRingTokens(100)
      const items = distributedCacheSimulationService.getAllItems()

      sendSuccess(res, {
        topology,
        tokens: sampleTokens,
        items,
      })
    } catch (error: any) {
      logger.error('[DistributedCacheController] getTopology error:', error)
      sendError(res, error.message || 'Failed to retrieve cache topology', 500)
    }
  }

  public putItem = async (req: Request, res: Response): Promise<void> => {
    try {
      const { key, value, ttlSeconds } = req.body
      if (!key || typeof key !== 'string') {
        sendError(res, 'Missing or invalid key', 400)
        return
      }

      const item = distributedCacheSimulationService.putItem(
        key,
        typeof value === 'string' ? value : JSON.stringify(value ?? {}),
        ttlSeconds ? Number(ttlSeconds) : 3600
      )

      sendSuccess(res, { item })
    } catch (error: any) {
      logger.error('[DistributedCacheController] putItem error:', error)
      sendError(res, error.message || 'Failed to put cache item', 500)
    }
  }

  public addNode = async (req: Request, res: Response): Promise<void> => {
    try {
      const { id, name, host, port, weight, maxMemoryMb, vnodesPerNode } = req.body
      if (!id || !name) {
        sendError(res, 'Missing node id or name', 400)
        return
      }

      const diff = distributedCacheSimulationService.addNode(
        {
          id,
          name,
          host: host || '10.0.1.' + Math.floor(Math.random() * 200 + 20),
          port: port ? Number(port) : 6379,
          weight: weight ? Number(weight) : 1,
          status: 'HEALTHY',
          maxMemoryMb: maxMemoryMb ? Number(maxMemoryMb) : 4096,
        },
        vnodesPerNode ? Number(vnodesPerNode) : 50
      )

      const topology = distributedCacheSimulationService.getRingTopology()
      sendSuccess(res, { diff, topology })
    } catch (error: any) {
      logger.error('[DistributedCacheController] addNode error:', error)
      sendError(res, error.message || 'Failed to add cache node', 500)
    }
  }

  public removeNode = async (req: Request, res: Response): Promise<void> => {
    try {
      const { nodeId } = req.params
      if (!nodeId) {
        sendError(res, 'Missing nodeId parameter', 400)
        return
      }

      const diff = distributedCacheSimulationService.removeNode(String(nodeId))
      const topology = distributedCacheSimulationService.getRingTopology()
      sendSuccess(res, { diff, topology })
    } catch (error: any) {
      logger.error('[DistributedCacheController] removeNode error:', error)
      sendError(res, error.message || 'Failed to remove cache node', 500)
    }
  }

  public setNodeStatus = async (req: Request, res: Response): Promise<void> => {
    try {
      const { nodeId } = req.params
      const { status } = req.body
      if (!['HEALTHY', 'DEGRADED', 'DOWN'].includes(status)) {
        sendError(res, 'Invalid node status. Expected HEALTHY, DEGRADED, or DOWN', 400)
        return
      }

      const node = distributedCacheSimulationService.setNodeStatus(String(nodeId), status)
      const topology = distributedCacheSimulationService.getRingTopology()
      sendSuccess(res, { node, topology })
    } catch (error: any) {
      logger.error('[DistributedCacheController] setNodeStatus error:', error)
      sendError(res, error.message || 'Failed to update node status', 500)
    }
  }

  public executeQuorumRead = async (req: Request, res: Response): Promise<void> => {
    try {
      const { key, readQuorum } = req.body
      if (!key) {
        sendError(res, 'Missing key for quorum read', 400)
        return
      }

      const result = distributedCacheSimulationService.executeQuorumRead(
        key,
        readQuorum ? Number(readQuorum) : undefined
      )
      sendSuccess(res, { result })
    } catch (error: any) {
      logger.error('[DistributedCacheController] executeQuorumRead error:', error)
      sendError(res, error.message || 'Failed to execute quorum read', 500)
    }
  }

  public executeQuorumWrite = async (req: Request, res: Response): Promise<void> => {
    try {
      const { key, value, writeQuorum } = req.body
      if (!key || !value) {
        sendError(res, 'Missing key or value for quorum write', 400)
        return
      }

      const result = distributedCacheSimulationService.executeQuorumWrite(
        key,
        typeof value === 'string' ? value : JSON.stringify(value),
        writeQuorum ? Number(writeQuorum) : undefined
      )
      sendSuccess(res, { result })
    } catch (error: any) {
      logger.error('[DistributedCacheController] executeQuorumWrite error:', error)
      sendError(res, error.message || 'Failed to execute quorum write', 500)
    }
  }

  public simulateStampede = async (req: Request, res: Response): Promise<void> => {
    try {
      const { key, concurrency, strategy } = req.body
      const result = distributedCacheSimulationService.simulateStampede(
        key || 'course:metadata:cs101',
        concurrency ? Number(concurrency) : 250,
        strategy || 'MUTEX_LOCK'
      )
      sendSuccess(res, { result })
    } catch (error: any) {
      logger.error('[DistributedCacheController] simulateStampede error:', error)
      sendError(res, error.message || 'Failed to simulate cache stampede', 500)
    }
  }

  public simulateMultiTierAccess = async (req: Request, res: Response): Promise<void> => {
    try {
      const { key } = req.body
      const result = distributedCacheSimulationService.simulateMultiTierAccess(
        key || 'user:session:usr_9901'
      )
      sendSuccess(res, { result })
    } catch (error: any) {
      logger.error('[DistributedCacheController] simulateMultiTierAccess error:', error)
      sendError(res, error.message || 'Failed to simulate multi-tier access', 500)
    }
  }

  public updateQuorumConfig = async (req: Request, res: Response): Promise<void> => {
    try {
      const { replicationFactor, readQuorum, writeQuorum } = req.body
      distributedCacheSimulationService.updateQuorumConfig(
        Number(replicationFactor || 3),
        Number(readQuorum || 2),
        Number(writeQuorum || 2)
      )
      const topology = distributedCacheSimulationService.getRingTopology()
      sendSuccess(res, { topology })
    } catch (error: any) {
      logger.error('[DistributedCacheController] updateQuorumConfig error:', error)
      sendError(res, error.message || 'Failed to update quorum configuration', 500)
    }
  }

  public resetToDefault = async (_req: Request, res: Response): Promise<void> => {
    try {
      distributedCacheSimulationService.resetToDefault()
      const topology = distributedCacheSimulationService.getRingTopology()
      sendSuccess(res, { topology })
    } catch (error: any) {
      logger.error('[DistributedCacheController] resetToDefault error:', error)
      sendError(res, error.message || 'Failed to reset cache simulation', 500)
    }
  }
}

export const distributedCacheController = new DistributedCacheController()
