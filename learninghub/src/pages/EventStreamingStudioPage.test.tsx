import { render, screen, waitFor, fireEvent } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { EventStreamingStudioPage } from './EventStreamingStudioPage'
import { eventStreamingService } from '../services/eventStreamingService'

describe('EventStreamingStudioPage (Milestone 33)', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
    vi.spyOn(eventStreamingService, 'getTopology').mockResolvedValue(
      eventStreamingService.getMockTopology()
    )
    vi.spyOn(eventStreamingService, 'produceEvent').mockResolvedValue({
      partition: 0,
      offset: 15,
      message: {
        id: 'msg-test',
        offset: 15,
        key: 'test-key',
        value: { course: 'system-design' },
        timestamp: new Date().toISOString(),
        headers: {},
        partitionIndex: 0,
        status: 'UNCOMMITTED',
      },
    })
    vi.spyOn(eventStreamingService, 'consumeNext').mockResolvedValue({
      processedCount: 1,
      updatedLag: 1,
      group: eventStreamingService.getMockTopology().consumerGroups[0],
    })
  })

  it('renders page title, metrics telemetry, and default Kafka partition tab', async () => {
    render(<EventStreamingStudioPage />)

    await waitFor(() => {
      expect(
        screen.getByText('Event Streaming & Outbox Studio')
      ).toBeInTheDocument()
    })

    expect(screen.getByText(/Milestone 33 · Distributed Systems Trilogy/i)).toBeInTheDocument()
    expect(screen.getByText('Total Produced')).toBeInTheDocument()
    expect(screen.getByText('Distributed Log & Partitioning Visualizer')).toBeInTheDocument()
  })

  it('switches between tabs: Consumer Groups, Outbox, DLQ, and Event Sourcing', async () => {
    render(<EventStreamingStudioPage />)

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /Consumer Rebalancing/i })).toBeInTheDocument()
    })

    // Switch to Consumer Groups
    fireEvent.click(screen.getByRole('button', { name: /Consumer Rebalancing/i }))
    await waitFor(() => {
      expect(screen.getByText(/Consumer Group Coordinator & Rebalance HUD/i)).toBeInTheDocument()
    })

    // Switch to Outbox
    fireEvent.click(screen.getByRole('button', { name: /Transactional Outbox/i }))
    await waitFor(() => {
      expect(screen.getByText('Transactional Outbox Pattern Studio')).toBeInTheDocument()
    })

    // Switch to DLQ
    fireEvent.click(screen.getByRole('button', { name: /Poison Pill & DLQ/i }))
    await waitFor(() => {
      expect(screen.getByText(/Poison Pill Injection & Dead Letter Queue/i)).toBeInTheDocument()
    })

    // Switch to Event Sourcing
    fireEvent.click(screen.getByRole('button', { name: /Event Sourcing CQRS/i }))
    await waitFor(() => {
      expect(screen.getByText('Event Sourcing & CQRS Aggregate Reconstructor')).toBeInTheDocument()
    })
  })
})
