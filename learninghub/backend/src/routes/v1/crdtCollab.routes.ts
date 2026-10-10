import { Router } from 'express'
import { crdtCollabController } from '../../controllers/crdtCollabController'

const router = Router()

// Rooms
router.post('/rooms', crdtCollabController.createRoom)
router.get('/rooms/:roomId', crdtCollabController.getRoom)
router.post('/rooms/:roomId/join', crdtCollabController.joinRoom)
router.post('/rooms/:roomId/operations', crdtCollabController.applyOperation)
router.post('/rooms/:roomId/snapshot', crdtCollabController.saveSnapshot)

// WebRTC Signaling Relay
router.post('/signaling/relay', crdtCollabController.relaySignal)
router.get('/signaling/poll/:peerId', crdtCollabController.pollSignals)

export default router
