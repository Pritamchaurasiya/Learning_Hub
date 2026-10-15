import { render, screen, waitFor, fireEvent } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { MvccDeadlockStudioPage } from './MvccDeadlockStudioPage'
import { mvccDeadlockService } from '../services/mvccDeadlockService'

describe('MvccDeadlockStudioPage (Milestone 33)', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
    vi.spyOn(mvccDeadlockService, 'getMvccState').mockResolvedValue(
      mvccDeadlockService.getMockMvccState()
    )
    vi.spyOn(mvccDeadlockService, 'simulateWriteSkew').mockResolvedValue(
      mvccDeadlockService.getMockWriteSkew()
    )
    vi.spyOn(mvccDeadlockService, 'detectDeadlock').mockResolvedValue(
      mvccDeadlockService.getMockDeadlock()
    )
    vi.spyOn(mvccDeadlockService, 'getIsolationComparison').mockResolvedValue(
      mvccDeadlockService.getMockIsolationComparison()
    )
  })

  it('renders page header, deep dive cards, and initial MVCC tab visualizer', async () => {
    render(<MvccDeadlockStudioPage />)

    await waitFor(() => {
      expect(
        screen.getByText(/MVCC & Distributed Deadlock Detection Studio/i)
      ).toBeInTheDocument()
    })

    expect(screen.getByText(/Systems Engineering Deep Dive: Concurrency Control/i)).toBeInTheDocument()
    expect(screen.getByText(/Append-Only Version Chains & Snapshot Visibility/i)).toBeInTheDocument()
    expect(screen.getByText(/Isolation Level & Concurrency Anomaly Matrix/i)).toBeInTheDocument()
  })

  it('switches to Write Skew tab and triggers simulation', async () => {
    render(<MvccDeadlockStudioPage />)

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /Write Skew Anomaly Lab/i })).toBeInTheDocument()
    })

    fireEvent.click(screen.getByRole('button', { name: /Write Skew Anomaly Lab/i }))

    await waitFor(() => {
      expect(screen.getByText(/Write Skew Anomaly Simulator/i)).toBeInTheDocument()
    })

    const runBtn = screen.getByRole('button', { name: /Run Simulation/i })
    fireEvent.click(runBtn)
    expect(mvccDeadlockService.simulateWriteSkew).toHaveBeenCalled()
  })

  it('switches to Deadlock tab and triggers cycle detection', async () => {
    render(<MvccDeadlockStudioPage />)

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /Wait-For Graph & Deadlocks/i })).toBeInTheDocument()
    })

    fireEvent.click(screen.getByRole('button', { name: /Wait-For Graph & Deadlocks/i }))

    await waitFor(() => {
      expect(screen.getByText(/Wait-For Graph \(WFG\) & Deadlock Resolver/i)).toBeInTheDocument()
    })

    const detectBtn = screen.getByRole('button', { name: /Run Cycle Detection/i })
    fireEvent.click(detectBtn)
    expect(mvccDeadlockService.detectDeadlock).toHaveBeenCalled()
  })
})
