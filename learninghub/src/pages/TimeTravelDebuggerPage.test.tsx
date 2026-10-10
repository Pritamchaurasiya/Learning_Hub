import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor, fireEvent } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { TimeTravelDebuggerPage } from './TimeTravelDebuggerPage'
import { debuggerService } from '../services/debuggerService'

import { ExecutionTracePayload } from '../types/debugger'

const mockTrace: ExecutionTracePayload = {
  traceId: 'mock-trace-1',
  code: 'function binarySearch() {}',
  language: 'javascript',
  totalSteps: 5,
  maxCallStackDepth: 1,
  terminationReason: 'NORMAL',
  steps: [
    {
      stepIndex: 0,
      line: 1,
      event: 'CALL',
      functionName: 'binarySearch',
      callStack: [{ functionName: 'binarySearch', line: 1, depth: 1, scopeId: 'scope-1' }],
      variables: {},
      heapObjects: {},
    },
    {
      stepIndex: 1,
      line: 2,
      event: 'MUTATION',
      functionName: 'binarySearch',
      callStack: [{ functionName: 'binarySearch', line: 2, depth: 1, scopeId: 'scope-1' }],
      variables: { low: 0 },
      heapObjects: {},
    },
  ],
  anomalies: [],
}

describe('TimeTravelDebuggerPage (Milestone 16)', () => {
  beforeEach(() => {
    vi.spyOn(debuggerService, 'recordTrace').mockImplementation(async (req) => {
      return {
        ...mockTrace,
        code: req.code,
      }
    })
  })

  it('renders page header, title, and algorithm preset chips', async () => {
    render(
      <MemoryRouter>
        <TimeTravelDebuggerPage />
      </MemoryRouter>
    )

    expect(screen.getByText(/Milestone 16/i)).toBeInTheDocument()
    expect(screen.getByText(/Time-Travel Debugger & Memory Trace Studio/i)).toBeInTheDocument()
    expect(screen.getByText(/Binary Search \(Classic\)/i)).toBeInTheDocument()
    expect(screen.getByText(/Two-Pointer Sorted Convergence/i)).toBeInTheDocument()
  })

  it('loads trace and renders step timeline scrubber', async () => {
    render(
      <MemoryRouter>
        <TimeTravelDebuggerPage />
      </MemoryRouter>
    )

    await waitFor(() => {
      expect(screen.getByText(/Step 1 of/i)).toBeInTheDocument()
    })

    expect(screen.getByRole('button', { name: /Step Forward/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Play/i })).toBeInTheDocument()
  })

  it('allows switching between algorithm presets', async () => {
    render(
      <MemoryRouter>
        <TimeTravelDebuggerPage />
      </MemoryRouter>
    )

    const twoPointerBtn = screen.getByText(/Two-Pointer Sorted Convergence/i)
    fireEvent.click(twoPointerBtn)

    await waitFor(() => {
      expect(screen.getByText(/twoSumSorted/i)).toBeInTheDocument()
    })
  })
})
