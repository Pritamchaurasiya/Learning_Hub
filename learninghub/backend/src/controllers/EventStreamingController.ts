import { Request, Response } from 'express'
import { eventStreamingSimulationService } from '../services/EventStreamingSimulationService'
import { sendSuccess, sendBadRequest } from '../utils/responseHelper'
import logger from '../utils/logger'

export class EventStreamingController {
  /**
   * GET /api/v1/streaming/topology
   */
  public getTopology = async (req: Request, res: Response): Promise<void> => {
    try {
      const topology = eventStreamingSimulationService.getTopology()
      sendSuccess(res, topology)
    } catch (error) {
      logger.error('Failed to get streaming topology:', error as Error)
      sendBadRequest(res, 'Could not retrieve event streaming topology')
    }
  }

  /**
   * POST /api/v1/streaming/produce
   */
  public produceEvent = async (req: Request, res: Response): Promise<void> => {
    try {
      const { topic, key, value, headers } = req.body || {}
      if (!topic || !value) {
        sendBadRequest(res, 'topic and value are required')
        return
      }
      const result = eventStreamingSimulationService.produceEvent(
        String(topic),
        key ? String(key) : null,
        value,
        headers
      )
      sendSuccess(res, result)
    } catch (error) {
      logger.error('Failed to produce event:', error as Error)
      sendBadRequest(res, 'Could not produce event')
    }
  }

  /**
   * POST /api/v1/streaming/consume
   */
  public consumeNext = async (req: Request, res: Response): Promise<void> => {
    try {
      const { groupId, maxMessages } = req.body || {}
      const effectiveGroup = groupId ? String(groupId) : 'enrollment-worker-group'
      const result = eventStreamingSimulationService.consumeNext(
        effectiveGroup,
        maxMessages ? Number(maxMessages) : 1
      )
      sendSuccess(res, result)
    } catch (error) {
      logger.error('Failed to consume messages:', error as Error)
      sendBadRequest(res, 'Could not consume messages')
    }
  }

  /**
   * POST /api/v1/streaming/consumer-groups/rebalance
   */
  public rebalanceConsumerGroup = async (req: Request, res: Response): Promise<void> => {
    try {
      const { groupId, action, protocol } = req.body || {}
      const effectiveGroup = groupId ? String(groupId) : 'enrollment-worker-group'
      const effectiveAction = action || 'ADD_CONSUMER'
      const result = eventStreamingSimulationService.rebalanceConsumerGroup(
        effectiveGroup,
        effectiveAction,
        protocol || 'COOPERATIVE_STICKY'
      )
      sendSuccess(res, result)
    } catch (error) {
      logger.error('Failed to rebalance consumer group:', error as Error)
      sendBadRequest(res, 'Could not rebalance consumer group')
    }
  }

  /**
   * POST /api/v1/streaming/outbox/process
   */
  public processOutbox = async (req: Request, res: Response): Promise<void> => {
    try {
      const { aggregateId, aggregateType, eventType, payload } = req.body || {}
      const result = eventStreamingSimulationService.executeTransactionalOutbox(
        aggregateId || `agg-${Date.now().toString(36)}`,
        aggregateType || 'CourseEnrollment',
        eventType || 'EnrollmentCreated',
        payload || { course: 'system-design', tier: 'PRO' }
      )
      sendSuccess(res, result)
    } catch (error) {
      logger.error('Failed to process transactional outbox event:', error as Error)
      sendBadRequest(res, 'Could not process outbox event')
    }
  }

  /**
   * POST /api/v1/streaming/chaos/poison-pill
   */
  public injectPoisonPill = async (req: Request, res: Response): Promise<void> => {
    try {
      const { topic, failureReason } = req.body || {}
      const result = eventStreamingSimulationService.injectPoisonPill(
        topic ? String(topic) : 'course-enrollments',
        failureReason ? String(failureReason) : undefined
      )
      sendSuccess(res, result)
    } catch (error) {
      logger.error('Failed to inject poison pill:', error as Error)
      sendBadRequest(res, 'Could not inject poison pill')
    }
  }

  /**
   * POST /api/v1/streaming/dlq/replay
   */
  public replayDlqMessage = async (req: Request, res: Response): Promise<void> => {
    try {
      const { dlqId, targetTopic } = req.body || {}
      if (!dlqId) {
        sendBadRequest(res, 'dlqId is required')
        return
      }
      const result = eventStreamingSimulationService.replayDlqMessage(
        String(dlqId),
        targetTopic ? String(targetTopic) : undefined
      )
      sendSuccess(res, result)
    } catch (error) {
      logger.error('Failed to replay DLQ message:', error as Error)
      sendBadRequest(res, 'Could not replay DLQ message')
    }
  }

  /**
   * GET /api/v1/streaming/event-sourcing/:aggregateId
   */
  public getReconstructedState = async (req: Request, res: Response): Promise<void> => {
    try {
      const aggregateId = String(req.params.aggregateId)
      const version = req.query.version !== undefined ? Number(req.query.version) : undefined
      const result = eventStreamingSimulationService.reconstructAggregateAtVersion(
        aggregateId,
        version
      )
      sendSuccess(res, result)
    } catch (error) {
      logger.error('Failed to reconstruct aggregate state:', error as Error)
      sendBadRequest(res, 'Could not reconstruct aggregate state')
    }
  }
}

export const eventStreamingController = new EventStreamingController()
