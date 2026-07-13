import crypto from 'crypto'
import logger from '../../utils/logger'
import { CircuitBreaker } from '../../utils/CircuitBreaker'

const MAX_RETRIES = 2
const BASE_DELAY_MS = 500

/**
 * ConductorClient
 *
 * Handles REST communication with the Django `conductor` service using native fetch.
 * Includes exponential backoff and circuit breaking.
 */
export class ConductorClient {
  private circuitBreaker = new CircuitBreaker('ConductorAPI', {
    failureThreshold: 3,
    resetTimeout: 15000,
  })

  private baseURL: string

  constructor() {
    this.baseURL = process.env.CONDUCTOR_URL || 'http://localhost:8000/api/v1'
  }

  private async fetchWithTimeout(url: string, options: RequestInit & { timeout?: number } = {}) {
    const { timeout = 2000, ...fetchOptions } = options
    const controller = new AbortController()
    const id = setTimeout(() => controller.abort(), timeout)
    try {
      const response = await fetch(url, { ...fetchOptions, signal: controller.signal })
      return response
    } finally {
      clearTimeout(id)
    }
  }

  private async withRetry<T>(
    operation: () => Promise<T>,
    operationName: string,
    fallbackValue: T
  ): Promise<T> {
    for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
      try {
        return await this.circuitBreaker.execute(() => operation())
      } catch (error: any) {
        // 404 is a valid "not found" state for ML APIs, not an error to retry.
        if (error.status === 404) return fallbackValue

        const isRetryable =
          error.name === 'AbortError' ||
          error.cause?.code === 'ECONNREFUSED' ||
          error.cause?.code === 'ECONNRESET' ||
          error.status === 429 ||
          (error.status && error.status >= 500)

        if (!isRetryable || attempt === MAX_RETRIES || error.message?.includes('circuitbreaker')) {
          logger.warn(
            `[ConductorClient] ${operationName} failed, degrading to heuristics. Error: ${error instanceof Error ? error.message : String(error)}`
          )
          return fallbackValue
        }

        const delayMs = BASE_DELAY_MS * Math.pow(2, attempt) + crypto.randomInt(0, 200)
        await new Promise(resolve => setTimeout(resolve, delayMs))
      }
    }
    return fallbackValue
  }

  /**
   * Run 3PL IRT Bayesian Item Calibration on the ML engine
   */
  async calibrateItem(
    questionId: string,
    history: Array<{ isCorrect: boolean }>
  ): Promise<{ difficulty: number; discrimination: number } | null> {
    return this.withRetry(
      async () => {
        const res = await this.fetchWithTimeout(`${this.baseURL}/ai/irt/calibrate`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            item_id: questionId,
            responses: history.map(h => (h.isCorrect ? 1 : 0)),
          }),
        })
        if (!res.ok) throw Object.assign(new Error(`HTTP ${res.status}`), { status: res.status })
        return await res.json()
      },
      'calibrateItem',
      null
    )
  }

  /**
   * Fetch DKT (Deep Knowledge Tracing) spaced repetition recommendations
   */
  async getDktRecommendations(
    userId: string
  ): Promise<Array<{ topic_name: string; priority: number; expected_accuracy: number }> | null> {
    return this.withRetry(
      async () => {
        const res = await this.fetchWithTimeout(
          `${this.baseURL}/ai/dkt/recommendations/${encodeURIComponent(userId)}`
        )
        if (!res.ok) throw Object.assign(new Error(`HTTP ${res.status}`), { status: res.status })
        const data = await res.json()
        return data.recommendations
      },
      'getDktRecommendations',
      null
    )
  }

  /**
   * Run test attempt anomaly detection (anti-cheating)
   */
  async detectTestAnomaly(
    attemptId: string,
    timeVariance: Array<{ questionId: string; timeSpentSeconds: number; difficulty: number }>
  ): Promise<{ isSuspicious: boolean; confidence: number } | null> {
    return this.withRetry(
      async () => {
        const res = await this.fetchWithTimeout(`${this.baseURL}/ai/anomaly/detect`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            attempt_id: attemptId,
            metrics: timeVariance,
          }),
        })
        if (!res.ok) throw Object.assign(new Error(`HTTP ${res.status}`), { status: res.status })
        return await res.json()
      },
      'detectTestAnomaly',
      null
    )
  }
}

export const conductorClient = new ConductorClient()
