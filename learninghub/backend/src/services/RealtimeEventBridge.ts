/**
 * RealtimeEventBridge - Subscribes to DomainEventBus and pushes live updates
 * to targeted WebSocket clients and rooms.
 */

import { domainEvents } from './DomainEventBus'
import { webSocketService } from './WebSocketService'
import logger from '../utils/logger'

export class RealtimeEventBridge {
  private initialized = false

  public init(): void {
    if (this.initialized) return
    this.initialized = true

    // 1. Contest Registrations -> update room contest-{contestId}
    domainEvents.on('CONTEST_REGISTERED', async (data) => {
      try {
        webSocketService.broadcastToRoom(`contest-${data.contestId}`, 'contest-participant-joined', {
          contestId: data.contestId,
          userId: data.userId,
          timestamp: data.registeredAt,
        })
      } catch (err) {
        logger.warn('[RealtimeEventBridge] Failed to broadcast CONTEST_REGISTERED:', {
          error: String(err),
        })
      }
    })

    // 2. Proctor Alerts -> send to admin_dashboard and contest room
    domainEvents.on('PROCTOR_ALERT_TRIGGERED', async (data) => {
      try {
        webSocketService.broadcastAdmin('proctor-alert', data)
        webSocketService.broadcastToRoom(`contest-${data.contestId}`, 'proctor-violation-logged', {
          contestId: data.contestId,
          userId: data.userId,
          eventType: data.eventType,
          timestamp: data.timestamp,
        })
      } catch (err) {
        logger.warn('[RealtimeEventBridge] Failed to broadcast PROCTOR_ALERT_TRIGGERED:', {
          error: String(err),
        })
      }
    })

    // 3. CAT Diagnostic Scorecard Ready -> notify user
    domainEvents.on('CAT_SESSION_COMPLETED', async (data) => {
      try {
        webSocketService.notifyUser(data.userId, 'cat-scorecard-ready', {
          sessionId: data.sessionId,
          subject: data.subject,
          examSlug: data.examSlug,
          finalTheta: data.finalTheta,
          abilityBand: data.abilityBand,
        })
      } catch (err) {
        logger.warn('[RealtimeEventBridge] Failed to notify CAT_SESSION_COMPLETED:', {
          error: String(err),
        })
      }
    })

    // 4. Achievement Unlocked -> live gamification celebratory popup
    domainEvents.on('ACHIEVEMENT_UNLOCKED', async (data) => {
      try {
        webSocketService.notifyUser(data.userId, 'achievement-unlocked', {
          achievementId: data.achievementId,
          name: data.achievementName,
          xpAwarded: data.xpAwarded,
        })
      } catch (err) {
        logger.warn('[RealtimeEventBridge] Failed to notify ACHIEVEMENT_UNLOCKED:', {
          error: String(err),
        })
      }
    })

    // 5. Level Up -> real-time celebratory XP burst
    domainEvents.on('LEVEL_UP', async (data) => {
      try {
        webSocketService.notifyUser(data.userId, 'user-level-up', {
          previousLevel: data.previousLevel,
          newLevel: data.newLevel,
          totalXP: data.totalXP,
        })
      } catch (err) {
        logger.warn('[RealtimeEventBridge] Failed to notify LEVEL_UP:', {
          error: String(err),
        })
      }
    })

    logger.info('[RealtimeEventBridge] Initialized and subscribed to DomainEventBus.')
  }

  public isInitialized(): boolean {
    return this.initialized
  }
}

export const realtimeEventBridge = new RealtimeEventBridge()

