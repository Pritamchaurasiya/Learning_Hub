import { CircuitBreaker } from '../../src/utils/CircuitBreaker'

describe('CircuitBreaker', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('initializes in CLOSED state', () => {
    const cb = new CircuitBreaker('test-service')
    expect(cb.getState()).toBe('CLOSED')
  })

  it('executes successful operations and stays CLOSED', async () => {
    const cb = new CircuitBreaker('test-service', { failureThreshold: 3 })
    const operation = jest.fn().mockResolvedValue('success')

    const result = await cb.execute(operation)
    expect(result).toBe('success')
    expect(cb.getState()).toBe('CLOSED')
    expect(operation).toHaveBeenCalledTimes(1)
  })

  it('opens after reaching failure threshold', async () => {
    const cb = new CircuitBreaker('test-service', { failureThreshold: 2, resetTimeout: 1000 })
    const failingOp = jest.fn().mockRejectedValue(new Error('service error'))

    // First failure
    await expect(cb.execute(failingOp)).rejects.toThrow('service error')
    expect(cb.getState()).toBe('CLOSED')

    // Second failure - should trigger OPEN
    await expect(cb.execute(failingOp)).rejects.toThrow('service error')
    expect(cb.getState()).toBe('OPEN')

    // Third call - should fast-fail without calling the operation
    await expect(cb.execute(failingOp)).rejects.toThrow(/CircuitBreaker is OPEN for service/)
    expect(failingOp).toHaveBeenCalledTimes(2)
  })

  it('transitions from OPEN to HALF_OPEN after resetTimeout and resets on success', async () => {
    const cb = new CircuitBreaker('test-service', { failureThreshold: 1, resetTimeout: 50 })
    const failingOp = jest.fn().mockRejectedValue(new Error('fail'))

    await expect(cb.execute(failingOp)).rejects.toThrow('fail')
    expect(cb.getState()).toBe('OPEN')

    // Wait for timeout to expire
    await new Promise(resolve => setTimeout(resolve, 60))

    const successOp = jest.fn().mockResolvedValue('recovered')
    const result = await cb.execute(successOp)

    expect(result).toBe('recovered')
    expect(cb.getState()).toBe('CLOSED')
  })

  it('re-opens from HALF_OPEN if probe request fails', async () => {
    const cb = new CircuitBreaker('test-service', { failureThreshold: 1, resetTimeout: 50 })
    const failingOp = jest.fn().mockRejectedValue(new Error('fail'))

    await expect(cb.execute(failingOp)).rejects.toThrow('fail')
    expect(cb.getState()).toBe('OPEN')

    // Wait for timeout
    await new Promise(resolve => setTimeout(resolve, 60))

    // Next attempt fails in HALF_OPEN
    await expect(cb.execute(failingOp)).rejects.toThrow('fail')
    expect(cb.getState()).toBe('OPEN')
  })
})
