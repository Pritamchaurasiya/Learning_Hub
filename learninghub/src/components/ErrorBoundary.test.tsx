import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '../test/test-utils'
import { ErrorBoundary } from './ErrorBoundary'

const ThrowingComponent = ({ shouldThrow }: { shouldThrow: boolean }) => {
  if (shouldThrow) {
    throw new Error('Test boundary crash')
  }
  return <div>Normal Content</div>
}

describe('ErrorBoundary', () => {
  it('renders children when no error occurs', () => {
    render(
      <ErrorBoundary>
        <ThrowingComponent shouldThrow={false} />
      </ErrorBoundary>
    )

    expect(screen.getByText('Normal Content')).toBeInTheDocument()
  })

  it('catches render error and displays error UI', () => {
    // Suppress console.error in tests for expected boundary catch
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {})

    render(
      <ErrorBoundary>
        <ThrowingComponent shouldThrow={true} />
      </ErrorBoundary>
    )

    expect(screen.getByText('Something went wrong')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /try again/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /reload page/i })).toBeInTheDocument()

    spy.mockRestore()
  })

  it('renders custom fallback when provided', () => {
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {})

    render(
      <ErrorBoundary fallback={<div>Custom Error View</div>}>
        <ThrowingComponent shouldThrow={true} />
      </ErrorBoundary>
    )

    expect(screen.getByText('Custom Error View')).toBeInTheDocument()
    spy.mockRestore()
  })

  it('triggers onReset callback when Try Again is clicked', () => {
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {})
    const onReset = vi.fn()

    render(
      <ErrorBoundary onReset={onReset}>
        <ThrowingComponent shouldThrow={true} />
      </ErrorBoundary>
    )

    const tryAgainBtn = screen.getByRole('button', { name: /try again/i })
    fireEvent.click(tryAgainBtn)

    expect(onReset).toHaveBeenCalledTimes(1)
    spy.mockRestore()
  })
})
