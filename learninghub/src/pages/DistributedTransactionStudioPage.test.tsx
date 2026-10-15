import { render, screen, waitFor, fireEvent } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { DistributedTransactionStudioPage } from './DistributedTransactionStudioPage'
import { distributedTransactionService } from '../services/distributedTransactionService'

describe('DistributedTransactionStudioPage (Milestone 32)', () => {
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

  it('renders page header, metrics, and initial 2PC visualizer', async () => {
    render(<DistributedTransactionStudioPage />)

    await waitFor(() => {
      expect(
        screen.getByText('Distributed Transaction Studio')
      ).toBeInTheDocument()
    })

    expect(screen.getByText(/Distributed Transaction Chaos Controller/i)).toBeInTheDocument()
    expect(screen.getByText(/Active Protocol Topology & State Transition/i)).toBeInTheDocument()
    expect(screen.getByText('Coordinator: Transaction Manager')).toBeInTheDocument()
  })

  it('switches between 2PC and Saga simulation workflows and triggers execution', async () => {
    render(<DistributedTransactionStudioPage />)

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /Saga Orchestrator/i })).toBeInTheDocument()
    })

    // Switch to Saga tab / chaos button
    fireEvent.click(screen.getByRole('button', { name: /Saga Orchestrator/i }))

    await waitFor(() => {
      expect(screen.getByText('CoursePurchaseAndEnrollmentSaga')).toBeInTheDocument()
    })

    // Execute complete saga
    const sagaBtn = screen.getByRole('button', { name: /Execute Complete Saga/i })
    fireEvent.click(sagaBtn)
    expect(distributedTransactionService.executeSaga).toHaveBeenCalled()
  })

  it('triggers 2PC participant failure simulation', async () => {
    render(<DistributedTransactionStudioPage />)

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /Trigger Participant Abort/i })).toBeInTheDocument()
    })

    fireEvent.click(screen.getByRole('button', { name: /Trigger Participant Abort/i }))
    expect(distributedTransactionService.execute2PC).toHaveBeenCalledWith({
      failingParticipantId: 'enrollment-db',
    })
  })
})
