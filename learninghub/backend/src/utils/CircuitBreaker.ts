import logger from './logger'

export type CircuitBreakerState = 'CLOSED' | 'OPEN' | 'HALF_OPEN'

export interface CircuitBreakerOptions {
  failureThreshold?: number // Number of failures before opening
  resetTimeout?: number // Milliseconds to wait before half-open
}

export class CircuitBreaker {
  private state: CircuitBreakerState = 'CLOSED'
  private failureCount = 0
  private nextAttempt = Date.now()
  private readonly failureThreshold: number
  private readonly resetTimeout: number
  private readonly serviceName: string

  constructor(serviceName: string, options?: CircuitBreakerOptions) {
    this.serviceName = serviceName
    this.failureThreshold = options?.failureThreshold ?? 5
    this.resetTimeout = options?.resetTimeout ?? 30000 // default 30s
  }

  async execute<T>(operation: () => Promise<T>): Promise<T> {
    if (this.state === 'OPEN') {
      if (Date.now() > this.nextAttempt) {
        this.state = 'HALF_OPEN'
        logger.info(`[CircuitBreaker] ${this.serviceName} entered HALF_OPEN state`)
      } else {
        throw new Error(`CircuitBreaker is OPEN for service: ${this.serviceName}. Fast-failing.`)
      }
    }

    try {
      const result = await operation()
      this.onSuccess()
      return result
    } catch (error) {
      this.onFailure()
      throw error
    }
  }

  private onSuccess(): void {
    this.failureCount = 0
    if (this.state !== 'CLOSED') {
      this.state = 'CLOSED'
      logger.info(`[CircuitBreaker] ${this.serviceName} closed, service recovered`)
    }
  }

  private onFailure(): void {
    this.failureCount++
    if (this.failureCount >= this.failureThreshold) {
      this.state = 'OPEN'
      this.nextAttempt = Date.now() + this.resetTimeout
      logger.error(
        `[CircuitBreaker] ${this.serviceName} OPENED after ${this.failureCount} failures. Will retry after ${this.resetTimeout}ms`
      )
    }
  }

  getState(): CircuitBreakerState {
    return this.state
  }
}
