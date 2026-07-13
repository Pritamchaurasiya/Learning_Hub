export class TimeoutError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'TimeoutError'
  }
}

export const withTimeout = <T>(promise: Promise<T>, timeoutMs: number): Promise<T> => {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      reject(new TimeoutError(`Operation timed out after ${timeoutMs}ms`))
    }, timeoutMs)

    promise
      .then(res => {
        clearTimeout(timer)
        resolve(res)
      })
      .catch(err => {
        clearTimeout(timer)
        reject(err)
      })
  })
}
