/**
 * DomainEventBus — Typed, async event bus for cross-service coordination.
 *
 * Replaces ad-hoc try/catch blocks scattered across services with a
 * structured, fire-and-forget event system that:
 * - Decouples producers from consumers
 * - Logs all event emissions and handler failures
 * - Never lets a handler failure propagate to the producer
 * - Supports wildcard listeners for audit/analytics
 *
 * Usage:
 *   domainEvents.emit('TEST_COMPLETED', { userId, testId, score, passed })
 *   domainEvents.on('TEST_COMPLETED', async (data) => { ... })
 */

import logger from '../utils/logger'

// ─── Event Definitions ──────────────────────────────────────────────────────

export interface DomainEventMap {
  TEST_COMPLETED: {
    userId: string
    testId: string
    attemptId: string
    score: number
    percentage: number
    passed: boolean
    timeTaken: number
  }
  ORDER_CREATED: {
    userId: string
    orderId: string
    totalAmount: number
    currency: string
    items: Array<{ courseId: string; courseTitle: string; price: number }>
  }
  ORDER_PAID: {
    userId: string
    orderId: string
    totalAmount: number
    gateway: string
  }
  SUBSCRIPTION_CREATED: {
    userId: string
    subscriptionId: string
    tierId: string
    tierName: string
  }
  SUBSCRIPTION_CANCELLED: {
    userId: string
    subscriptionId: string
    tierId: string
  }
  CERTIFICATE_ISSUED: {
    userId: string
    certificateId: string
    certificateCode: string
    courseId: string
    courseTitle: string
  }
  CERTIFICATE_REVOKED: {
    userId: string
    certificateId: string
    reason: string
  }
  ACHIEVEMENT_UNLOCKED: {
    userId: string
    achievementId: string
    achievementName: string
    xpAwarded: number
  }
  LEVEL_UP: {
    userId: string
    previousLevel: number
    newLevel: number
    totalXP: number
  }
  STREAK_MILESTONE: {
    userId: string
    streakDays: number
  }
  COURSE_COMPLETED: {
    userId: string
    courseId: string
    courseTitle: string
    completionPercentage: number
  }
  ENROLLMENT_CREATED: {
    userId: string
    courseId: string
    source: string
    orderId?: string
  }
  USER_REGISTERED: {
    userId: string
    email: string
  }
  PASSWORD_CHANGED: {
    userId: string
  }
}

type EventName = keyof DomainEventMap
type EventHandler<T> = (data: T) => Promise<void> | void
type WildcardHandler = (event: string, data: unknown) => Promise<void> | void

// ─── Bus Implementation ──────────────────────────────────────────────────────

class DomainEventBus {
  private handlers: Map<string, Array<EventHandler<any>>> = new Map()
  private wildcardHandlers: WildcardHandler[] = []

  /**
   * Register a handler for a specific event type.
   */
  on<E extends EventName>(event: E, handler: EventHandler<DomainEventMap[E]>): void {
    const existing = this.handlers.get(event) ?? []
    existing.push(handler)
    this.handlers.set(event, existing)
    logger.debug(`[DomainEventBus] Handler registered for ${event}`)
  }

  /**
   * Register a handler that receives ALL events (for audit, analytics, etc.)
   */
  onAny(handler: WildcardHandler): void {
    this.wildcardHandlers.push(handler)
  }

  /**
   * Emit an event. All handlers run async and failures are logged but never propagated.
   */
  async emit<E extends EventName>(event: E, data: DomainEventMap[E]): Promise<void> {
    const handlers = this.handlers.get(event) ?? []
    const allHandlers = [
      ...handlers.map((h) => () => h(data)),
      ...this.wildcardHandlers.map((h) => () => h(event, data)),
    ]

    if (allHandlers.length === 0) {
      logger.debug(`[DomainEventBus] No handlers for event: ${event}`)
      return
    }

    logger.info(`[DomainEventBus] Emitting ${event} to ${allHandlers.length} handler(s)`)

    // Run all handlers concurrently; failures are isolated
    const results = await Promise.allSettled(allHandlers.map((h) => h()))

    for (let i = 0; i < results.length; i++) {
      const result = results[i]
      if (result.status === 'rejected') {
        logger.error(
          `[DomainEventBus] Handler ${i} for ${event} failed:`,
          result.reason instanceof Error ? result.reason : new Error(String(result.reason))
        )
      }
    }
  }

  /**
   * Remove all handlers for an event (useful for testing).
   */
  off<E extends EventName>(event: E): void {
    this.handlers.delete(event)
  }

  /**
   * Remove all handlers (useful for testing).
   */
  removeAll(): void {
    this.handlers.clear()
    this.wildcardHandlers = []
  }
}

// Singleton instance
export const domainEvents = new DomainEventBus()

// Export types for consumers
export type { EventName }
