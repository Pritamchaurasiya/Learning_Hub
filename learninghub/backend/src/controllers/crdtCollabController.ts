import { Request, Response } from 'express'
import {
  crdtCollaborationEngineService,
  SignalingPayload,
  CrdtOperationPayload,
} from '../services/CrdtCollaborationEngineService'
import { sendSuccess, sendBadRequest, sendNotFound, sendInternalError } from '../utils/responseHelper'
import logger from '../utils/logger'

export class CrdtCollabController {
  public createRoom = async (req: Request, res: Response) => {
    try {
      const { roomName, creatorId, maxPeers } = req.body

      const room = crdtCollaborationEngineService.createRoom({
        roomName: roomName || 'Collaborative Whiteboard',
        creatorId: creatorId || 'anon-creator',
        maxPeers: maxPeers ? Number(maxPeers) : 6,
      })

      return sendSuccess(res, room, 'Collaborative room created successfully')
    } catch (error) {
      logger.error(
        '[CrdtCollabController] Error creating room:',
        error instanceof Error ? error : new Error(String(error))
      )
      return sendInternalError(res, 'Failed to create room')
    }
  }

  public getRoom = async (req: Request, res: Response) => {
    try {
      const roomId = String(req.params.roomId)
      const room = crdtCollaborationEngineService.getRoom(roomId)

      if (!room) {
        return sendNotFound(res, `Room ${roomId} not found`)
      }

      return sendSuccess(res, room, 'Room details retrieved')
    } catch (error) {
      logger.error(
        '[CrdtCollabController] Error retrieving room:',
        error instanceof Error ? error : new Error(String(error))
      )
      return sendInternalError(res, 'Failed to retrieve room')
    }
  }

  public joinRoom = async (req: Request, res: Response) => {
    try {
      const roomId = String(req.params.roomId)
      const { displayName, role } = req.body

      const result = crdtCollaborationEngineService.joinRoom({
        roomId,
        displayName: displayName || 'Collaborator',
        role: role || 'PARTICIPANT',
      })

      return sendSuccess(res, result, 'Successfully joined collaborative room')
    } catch (error) {
      logger.error(
        '[CrdtCollabController] Error joining room:',
        error instanceof Error ? error : new Error(String(error))
      )
      const msg = error instanceof Error ? error.message : 'Failed to join room'
      return sendBadRequest(res, msg)
    }
  }

  public relaySignal = async (req: Request, res: Response) => {
    try {
      const signal = req.body as SignalingPayload

      if (!signal || !signal.roomId || !signal.fromPeerId || !signal.toPeerId || !signal.type) {
        return sendBadRequest(res, 'Invalid signaling payload')
      }

      crdtCollaborationEngineService.relaySignal(signal)
      return sendSuccess(res, { relayed: true }, 'Signaling message relayed successfully')
    } catch (error) {
      logger.error(
        '[CrdtCollabController] Error relaying signal:',
        error instanceof Error ? error : new Error(String(error))
      )
      return sendInternalError(res, 'Failed to relay signal')
    }
  }

  public pollSignals = async (req: Request, res: Response) => {
    try {
      const peerId = String(req.params.peerId || '')
      if (!peerId) {
        return sendBadRequest(res, 'peerId parameter is required')
      }

      const signals = crdtCollaborationEngineService.pollSignals(peerId)
      return sendSuccess(res, signals, 'Pending signals retrieved')
    } catch (error) {
      logger.error(
        '[CrdtCollabController] Error polling signals:',
        error instanceof Error ? error : new Error(String(error))
      )
      return sendInternalError(res, 'Failed to poll signals')
    }
  }

  public applyOperation = async (req: Request, res: Response) => {
    try {
      const roomId = String(req.params.roomId)
      const op = req.body as CrdtOperationPayload

      if (!op || !op.peerId || op.lamportClock === undefined) {
        return sendBadRequest(res, 'Invalid CRDT operation structure')
      }

      const result = crdtCollaborationEngineService.applyCrdtOperation(roomId, op)
      return sendSuccess(res, result, 'CRDT operation applied and merged')
    } catch (error) {
      logger.error(
        '[CrdtCollabController] Error applying CRDT operation:',
        error instanceof Error ? error : new Error(String(error))
      )
      return sendInternalError(res, 'Failed to apply operation')
    }
  }

  public saveSnapshot = async (req: Request, res: Response) => {
    try {
      const roomId = String(req.params.roomId)
      const { serializedState } = req.body

      if (!serializedState) {
        return sendBadRequest(res, 'serializedState string is required')
      }

      const cid = crdtCollaborationEngineService.saveSnapshot(roomId, serializedState)
      return sendSuccess(res, { snapshotCid: cid }, 'Snapshot saved to IPFS content address')
    } catch (error) {
      logger.error(
        '[CrdtCollabController] Error saving snapshot:',
        error instanceof Error ? error : new Error(String(error))
      )
      return sendInternalError(res, 'Failed to save snapshot')
    }
  }
}

export const crdtCollabController = new CrdtCollabController()
