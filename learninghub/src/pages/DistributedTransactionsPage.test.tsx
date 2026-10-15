import { render, screen, waitFor, fireEvent } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { DistributedTransactionsPage } from './DistributedTransactionsPage'
import { distributedTransactionService } from '../services/distributedTransactionService'

describe('DistributedTransactionsPage (Milestone 32)', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
    vi.spyOn(distributedTransactionService, 'execute2PC').mockResolvedValue(
      distributedTransactionService.getMock2PCRecord()
    )
    vi.spyOn(distributedTransactionService, 'executeSaga').mockResolvedValue(
      distributedTransactionService.getMockSagaRecord()
    )
    vi.spyOn(distributedTransactionService, 'getComparison').mockResolvedValue(
      distributedTransactionService.getMockComparison()
    )
  })

  it('renders page header, protocol tabs, and subcomponents', async () => {
    render(<DistributedTransactionsPage />)

    await waitFor(() => {
      expect(
        screen.getByRole('heading', { name: /Distributed Transaction Studio/i })
      ).toBeInTheDocument()
    })

    expect(screen.getByText(/Milestone 32/i)).toBeInTheDocument()
    expect(screen.getAllByRole('button', { name: /Two-Phase Commit \(2PC\)/i }).length).toBeGreaterThanOrEqual(1)
    expect(screen.getAllByRole('button', { name: /Saga Orchestration/i }).length).toBeGreaterThanOrEqual(1)
    expect(screen.getByText(/Active Protocol Topology & State Transition/i)).toBeInTheDocument()
    expect(screen.getByText(/Formal Verification & Trade-off Matrix/i)).toBeInTheDocument()
  })

  it('switches between 2PC and Saga tabs', async () => {
    render(<DistributedTransactionsPage />)

    await waitFor(() => {
      expect(screen.getAllByRole('button', { name: /Saga Orchestration/i })[0]).toBeInTheDocument()
    })

    fireEvent.click(screen.getAllByRole('button', { name: /Saga Orchestration/i })[0])

    await waitFor(() => {
      expect(screen.getByText(/Saga Orchestrator Pattern/i)).toBeInTheDocument()
    })
  })

  it('triggers reset state when reset button clicked', async () => {
    render(<DistributedTransactionsPage />)

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /Reset State/i })).toBeInTheDocument()
    })

    const execute2PCSpy = vi.spyOn(distributedTransactionService, 'execute2PC')
    fireEvent.click(screen.getByRole('button', { name: /Reset State/i }))

    await waitFor(() => {
      expect(execute2PCSpy).toHaveBeenCalled()
    })
  })
})
