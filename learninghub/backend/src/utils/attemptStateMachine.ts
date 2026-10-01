/**
 * Test Attempt State Machine
 *
 * Enforces valid state transitions for test attempts, preventing:
 *  - Double-submission (IN_PROGRESS → COMPLETED twice)
 *  - Invalid transitions (COMPLETED → IN_PROGRESS)
 *  - Missing guard validation
 *
 * States: IN_PROGRESS → COMPLETED | TIMEOUT | ABANDONED
 *
 * This is the single source of truth for which transitions are legal.
 */

import { AttemptStatus } from '@prisma/client'
import logger from './logger'

/**
 * Defines all valid state transitions.
 * Key = current status, Value = set of allowed target statuses.
 */
const VALID_TRANSITIONS: Record<AttemptStatus, Set<AttemptStatus>> = {
  IN_PROGRESS: new Set(['COMPLETED', 'TIMEOUT', 'ABANDONED'] as AttemptStatus[]),
  COMPLETED: new Set<AttemptStatus>(), // Terminal — no outgoing transitions
  TIMEOUT: new Set<AttemptStatus>(), // Terminal
  ABANDONED: new Set<AttemptStatus>(), // Terminal
}

/**
 * Human-readable labels for logging and error messages.
 */
const STATUS_LABELS: Record<AttemptStatus, string> = {
  IN_PROGRESS: 'In Progress',
  COMPLETED: 'Completed',
  TIMEOUT: 'Timed Out',
  ABANDONED: 'Abandoned',
}

export class AttemptTransitionError extends Error {
  public readonly from: AttemptStatus
  public readonly to: AttemptStatus
  public readonly attemptId: string

  constructor(attemptId: string, from: AttemptStatus, to: AttemptStatus) {
    super(
      `Invalid attempt state transition: ${STATUS_LABELS[from]} → ${STATUS_LABELS[to]} ` +
        `(attempt: ${attemptId})`
    )
    this.name = 'AttemptTransitionError'
    this.from = from
    this.to = to
    this.attemptId = attemptId
  }
}

/**
 * Validates that a state transition is legal.
 *
 * @returns true if the transition is valid
 * @throws AttemptTransitionError if the transition is invalid
 */
export function assertValidTransition(
  attemptId: string,
  from: AttemptStatus,
  to: AttemptStatus
): true {
  if (from === to) {
    // Idempotent — re-applying the same status is a no-op, not an error.
    // This supports retry-safe submission flows.
    logger.debug(
      `[StateMachine] Idempotent transition for attempt ${attemptId}: ${STATUS_LABELS[from]} → ${STATUS_LABELS[to]}`
    )
    return true
  }

  const allowed = VALID_TRANSITIONS[from]
  if (!allowed || !allowed.has(to)) {
    throw new AttemptTransitionError(attemptId, from, to)
  }

  logger.debug(
    `[StateMachine] Valid transition for attempt ${attemptId}: ${STATUS_LABELS[from]} → ${STATUS_LABELS[to]}`
  )
  return true
}

/**
 * Checks whether a transition is valid WITHOUT throwing.
 * Use this for conditional logic where you want to branch, not crash.
 */
export function isValidTransition(from: AttemptStatus, to: AttemptStatus): boolean {
  if (from === to) return true
  const allowed = VALID_TRANSITIONS[from]
  return !!allowed && allowed.has(to)
}

/**
 * Returns whether a status is terminal (no further transitions possible).
 */
export function isTerminalStatus(status: AttemptStatus): boolean {
  const allowed = VALID_TRANSITIONS[status]
  return !allowed || allowed.size === 0
}

/**
 * Returns all valid target statuses from the given status.
 */
export function getValidTargetStatuses(from: AttemptStatus): AttemptStatus[] {
  const allowed = VALID_TRANSITIONS[from]
  return allowed ? Array.from(allowed) : []
}
