import { Request, Response } from 'express'
import { crdtSimulationService, PeerId } from '../services/CrdtSimulationService'
import { sendSuccess, sendBadRequest, sendInternalError } from '../utils/responseHelper'
import logger from '../utils/logger'

export class CrdtSimulationController {
  public getTopology = async (_req: Request, res: Response) => {
    try {
      const topology = crdtSimulationService.getTopology()
      return sendSuccess(res, topology, 'CRDT topology retrieved successfully')
    } catch (error) {
      logger.error(
        '[CrdtSimulationController] Error fetching topology:',
        error instanceof Error ? error : new Error(String(error))
      )
      return sendInternalError(res, 'Failed to fetch CRDT topology')
    }
  }

  public localInsert = async (req: Request, res: Response) => {
    try {
      const { peerId, index, char } = req.body
      if (!peerId || index === undefined || char === undefined) {
        return sendBadRequest(res, 'peerId, index, and char are required')
      }

      if (!['alice', 'bob', 'charlie'].includes(peerId)) {
        return sendBadRequest(res, 'peerId must be alice, bob, or charlie')
      }

      const updatedPeer = crdtSimulationService.localInsert(
        peerId as PeerId,
        Number(index),
        String(char)
      )
      return sendSuccess(res, updatedPeer, `Inserted "${char}" at index ${index} on peer ${peerId}`)
    } catch (error) {
      logger.error(
        '[CrdtSimulationController] Error performing localInsert:',
        error instanceof Error ? error : new Error(String(error))
      )
      return sendInternalError(res, (error as Error).message || 'Failed to insert character')
    }
  }

  public localDelete = async (req: Request, res: Response) => {
    try {
      const { peerId, visibleIndex } = req.body
      if (!peerId || visibleIndex === undefined) {
        return sendBadRequest(res, 'peerId and visibleIndex are required')
      }

      if (!['alice', 'bob', 'charlie'].includes(peerId)) {
        return sendBadRequest(res, 'peerId must be alice, bob, or charlie')
      }

      const updatedPeer = crdtSimulationService.localDelete(
        peerId as PeerId,
        Number(visibleIndex)
      )
      return sendSuccess(res, updatedPeer, `Deleted character at index ${visibleIndex} on peer ${peerId}`)
    } catch (error) {
      logger.error(
        '[CrdtSimulationController] Error performing localDelete:',
        error instanceof Error ? error : new Error(String(error))
      )
      return sendInternalError(res, (error as Error).message || 'Failed to delete character')
    }
  }

  public syncPeers = async (req: Request, res: Response) => {
    try {
      const { sourceId, targetId } = req.body
      if (!sourceId || !targetId) {
        return sendBadRequest(res, 'sourceId and targetId are required')
      }

      const result = crdtSimulationService.syncPeers(sourceId as PeerId, targetId as PeerId)
      return sendSuccess(res, result, `Synced ${result.syncedNodes} operations from ${sourceId} to ${targetId}`)
    } catch (error) {
      logger.error(
        '[CrdtSimulationController] Error syncing peers:',
        error instanceof Error ? error : new Error(String(error))
      )
      return sendInternalError(res, (error as Error).message || 'Failed to sync peers')
    }
  }

  public syncAll = async (_req: Request, res: Response) => {
    try {
      const topology = crdtSimulationService.syncAll()
      return sendSuccess(res, topology, 'Synchronized all non-partitioned peers')
    } catch (error) {
      logger.error(
        '[CrdtSimulationController] Error syncing all:',
        error instanceof Error ? error : new Error(String(error))
      )
      return sendInternalError(res, 'Failed to broadcast sync across peers')
    }
  }

  public setPartition = async (req: Request, res: Response) => {
    try {
      const { isolatedPeer, partitionActive } = req.body
      if (!isolatedPeer || partitionActive === undefined) {
        return sendBadRequest(res, 'isolatedPeer and partitionActive are required')
      }

      const topology = crdtSimulationService.setPartition(
        isolatedPeer as PeerId,
        Boolean(partitionActive)
      )
      return sendSuccess(
        res,
        topology,
        partitionActive
          ? `Network barrier activated: ${isolatedPeer} isolated`
          : `Network barrier healed: ${isolatedPeer} reconnected and synced`
      )
    } catch (error) {
      logger.error(
        '[CrdtSimulationController] Error toggling partition:',
        error instanceof Error ? error : new Error(String(error))
      )
      return sendInternalError(res, 'Failed to toggle network partition')
    }
  }

  public updateLwwRegister = async (req: Request, res: Response) => {
    try {
      const { peerId, key, value, timestamp } = req.body
      if (!peerId || !key || value === undefined) {
        return sendBadRequest(res, 'peerId, key, and value are required')
      }

      const updated = crdtSimulationService.updateLwwRegister(
        peerId as PeerId,
        String(key),
        value,
        timestamp ? Number(timestamp) : undefined
      )
      return sendSuccess(res, updated, `LWW Register "${key}" updated`)
    } catch (error) {
      logger.error(
        '[CrdtSimulationController] Error updating LWW register:',
        error instanceof Error ? error : new Error(String(error))
      )
      return sendInternalError(res, 'Failed to update LWW register')
    }
  }

  public mutateLwwSet = async (req: Request, res: Response) => {
    try {
      const { peerId, action, value, timestamp } = req.body
      if (!peerId || !action || !value) {
        return sendBadRequest(res, 'peerId, action (ADD/REMOVE), and value are required')
      }

      const resolved = crdtSimulationService.mutateLwwSet(
        peerId as PeerId,
        action as 'ADD' | 'REMOVE',
        String(value),
        timestamp ? Number(timestamp) : undefined
      )
      return sendSuccess(res, resolved, `LWW-Element-Set ${action} "${value}" performed`)
    } catch (error) {
      logger.error(
        '[CrdtSimulationController] Error mutating LWW set:',
        error instanceof Error ? error : new Error(String(error))
      )
      return sendInternalError(res, 'Failed to mutate LWW set')
    }
  }

  public verifyAlgebraicLaws = async (_req: Request, res: Response) => {
    try {
      const proofs = crdtSimulationService.verifyAlgebraicLaws()
      return sendSuccess(res, proofs, 'Algebraic semilattice laws formally verified')
    } catch (error) {
      logger.error(
        '[CrdtSimulationController] Error verifying algebraic laws:',
        error instanceof Error ? error : new Error(String(error))
      )
      return sendInternalError(res, 'Failed to verify algebraic laws')
    }
  }

  public reset = async (_req: Request, res: Response) => {
    try {
      const topology = crdtSimulationService.reset()
      return sendSuccess(res, topology, 'CRDT simulation reset to initial state')
    } catch (error) {
      logger.error(
        '[CrdtSimulationController] Error resetting CRDT:',
        error instanceof Error ? error : new Error(String(error))
      )
      return sendInternalError(res, 'Failed to reset CRDT simulation')
    }
  }
}

export const crdtSimulationController = new CrdtSimulationController()
