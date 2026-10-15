import { Router } from 'express'
import { eventStreamingController } from '../../controllers/EventStreamingController'

const router = Router()

// Topology & Overview
router.get('/topology', eventStreamingController.getTopology)

// Producing & Consuming Messages
router.post('/produce', eventStreamingController.produceEvent)
router.post('/consume', eventStreamingController.consumeNext)

// Consumer Group Rebalance
router.post('/consumer-groups/rebalance', eventStreamingController.rebalanceConsumerGroup)

// Transactional Outbox Pattern
router.post('/outbox/process', eventStreamingController.processOutbox)

// Chaos & Dead Letter Queue (DLQ)
router.post('/chaos/poison-pill', eventStreamingController.injectPoisonPill)
router.post('/dlq/replay', eventStreamingController.replayDlqMessage)

// Event Sourcing & CQRS Aggregate Reconstructor
router.get('/event-sourcing/:aggregateId', eventStreamingController.getReconstructedState)

export default router
