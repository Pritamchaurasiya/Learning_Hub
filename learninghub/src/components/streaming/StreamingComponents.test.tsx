import { render, screen, fireEvent } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import { KafkaPartitionVisualizer } from './KafkaPartitionVisualizer'
import { ConsumerGroupRebalanceHUD } from './ConsumerGroupRebalanceHUD'
import { TransactionalOutboxStudio } from './TransactionalOutboxStudio'
import { PoisonPillDlqControlPanel } from './PoisonPillDlqControlPanel'
import { EventSourcingTimelineInspector } from './EventSourcingTimelineInspector'
import { eventStreamingService } from '../../services/eventStreamingService'

describe('Streaming Components (Milestone 33)', () => {
  const mockTopology = eventStreamingService.getMockTopology()

  it('KafkaPartitionVisualizer renders partitions and triggers onProduce callback', () => {
    const handleProduce = vi.fn()
    render(
      <KafkaPartitionVisualizer
        topics={mockTopology.topics}
        onProduce={handleProduce}
      />
    )

    expect(
      screen.getByText('Distributed Log & Partitioning Visualizer')
    ).toBeInTheDocument()
    expect(screen.getByText('Partition 0')).toBeInTheDocument()
    expect(screen.getByText('Partition 1')).toBeInTheDocument()
    expect(screen.getByText('Partition 2')).toBeInTheDocument()

    const produceBtn = screen.getByRole('button', { name: /Produce Event/i })
    fireEvent.click(produceBtn)
    expect(handleProduce).toHaveBeenCalled()
  })

  it('ConsumerGroupRebalanceHUD renders member cards, lag telemetry, and rebalance triggers', () => {
    const handleConsume = vi.fn()
    const handleRebalance = vi.fn()

    render(
      <ConsumerGroupRebalanceHUD
        group={mockTopology.consumerGroups[0]}
        onConsumeNext={handleConsume}
        onRebalance={handleRebalance}
      />
    )

    expect(screen.getByText(/Consumer Group Coordinator & Rebalance HUD/i)).toBeInTheDocument()
    expect(screen.getByText(/Total Lag: 2 msgs/i)).toBeInTheDocument()
    expect(screen.getByText('consumer-worker-alpha')).toBeInTheDocument()

    const pollBtn = screen.getByRole('button', { name: /Poll & Commit/i })
    fireEvent.click(pollBtn)
    expect(handleConsume).toHaveBeenCalled()

    const addWorkerBtn = screen.getByRole('button', { name: /\+ Add Worker/i })
    fireEvent.click(addWorkerBtn)
    expect(handleRebalance).toHaveBeenCalledWith('ADD_CONSUMER', 'COOPERATIVE_STICKY')
  })

  it('TransactionalOutboxStudio renders 3-step architecture and handles submission', () => {
    const handleOutbox = vi.fn()
    render(
      <TransactionalOutboxStudio
        outboxQueue={mockTopology.outboxQueue}
        onProcessOutbox={handleOutbox}
      />
    )

    expect(screen.getByText('Transactional Outbox Pattern Studio')).toBeInTheDocument()
    expect(screen.getByText(/Step 1: Atomic ACID Tx/i)).toBeInTheDocument()
    expect(screen.getByText(/Step 2: Outbox CDC/i)).toBeInTheDocument()

    const commitBtn = screen.getByRole('button', { name: /Commit Tx & Outbox/i })
    fireEvent.click(commitBtn)
    expect(handleOutbox).toHaveBeenCalled()
  })

  it('PoisonPillDlqControlPanel renders chaos trigger and DLQ table with redrive action', () => {
    const handleInject = vi.fn()
    const handleReplay = vi.fn()

    render(
      <PoisonPillDlqControlPanel
        dlqQueue={mockTopology.dlqQueue}
        onInjectPoisonPill={handleInject}
        onReplayDlq={handleReplay}
      />
    )

    expect(screen.getByText(/Poison Pill Injection & Dead Letter Queue/i)).toBeInTheDocument()
    expect(screen.getByText(/DLQ Quarantined: 1/i)).toBeInTheDocument()

    const injectBtn = screen.getByRole('button', { name: /Inject Poison Pill/i })
    fireEvent.click(injectBtn)
    expect(handleInject).toHaveBeenCalled()

    const redriveBtn = screen.getByRole('button', { name: /Re-drive/i })
    fireEvent.click(redriveBtn)
    expect(handleReplay).toHaveBeenCalledWith(mockTopology.dlqQueue[0].id)
  })

  it('EventSourcingTimelineInspector renders timeline and allows slider scrub', () => {
    const handleReconstruct = vi.fn()
    render(
      <EventSourcingTimelineInspector
        aggregates={mockTopology.eventSourcingAggregates}
        onReconstructVersion={handleReconstruct}
      />
    )

    expect(screen.getByText('Event Sourcing & CQRS Aggregate Reconstructor')).toBeInTheDocument()
    expect(screen.getByText(/Formal Event Sourcing Invariant/i)).toBeInTheDocument()

    const slider = screen.getByRole('slider')
    fireEvent.change(slider, { target: { value: '2' } })
    expect(handleReconstruct).toHaveBeenCalledWith('enrollment-agg-777', 2)
  })
})
