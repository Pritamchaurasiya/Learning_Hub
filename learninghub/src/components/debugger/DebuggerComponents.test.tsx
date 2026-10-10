import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { TimeTravelControlsBar } from './TimeTravelControlsBar'
import { VisualMemoryHeapGraph } from './VisualMemoryHeapGraph'
import { CallStackScopePanel } from './CallStackScopePanel'
import { InvariantAnomalyCard } from './InvariantAnomalyCard'
import { TraceStep } from '../../types/debugger'

describe('DebuggerComponents', () => {
  const mockSteps: TraceStep[] = [
    {
      stepIndex: 0,
      line: 1,
      event: 'CALL',
      functionName: 'binarySearch',
      callStack: [{ functionName: 'binarySearch', line: 1, depth: 1, scopeId: 'scope-0' }],
      variables: { low: 0, high: 9 },
      heapObjects: {
        'heap-arr': {
          id: 'heap-arr',
          type: 'array',
          value: [2, 5, 8, 12, 16],
          pointers: { low: 0, high: 4 },
        },
      },
      stdoutDelta: 'Init trace',
    },
    {
      stepIndex: 1,
      line: 4,
      event: 'MUTATION',
      functionName: 'binarySearch',
      callStack: [{ functionName: 'binarySearch', line: 4, depth: 1, scopeId: 'scope-0' }],
      variables: { low: 2, high: 4, mid: 2 },
      heapObjects: {},
    },
  ]

  it('renders TimeTravelControlsBar and handles step back and forward', () => {
    const onStepChange = vi.fn()
    const onTogglePlay = vi.fn()

    render(
      <TimeTravelControlsBar
        currentStepIndex={0}
        totalSteps={2}
        isPlaying={false}
        playbackSpeed={1}
        steps={mockSteps}
        onStepChange={onStepChange}
        onTogglePlay={onTogglePlay}
        onSpeedChange={vi.fn()}
        onReset={vi.fn()}
      />
    )

    expect(screen.getByText(/Step 1 of 2/i)).toBeInTheDocument()
    expect(screen.getByText(/CALL : Line 1/i)).toBeInTheDocument()

    const stepForwardBtn = screen.getByRole('button', { name: /Step Forward/i })
    fireEvent.click(stepForwardBtn)
    expect(onStepChange).toHaveBeenCalledWith(1)

    const playBtn = screen.getByRole('button', { name: /Play/i })
    fireEvent.click(playBtn)
    expect(onTogglePlay).toHaveBeenCalled()
  })

  it('renders VisualMemoryHeapGraph with array pointers', () => {
    render(
      <VisualMemoryHeapGraph
        heapObjects={mockSteps[0].heapObjects}
        activeVariables={mockSteps[0].variables}
      />
    )

    expect(screen.getByText(/Visual Memory Heap & Active Pointers/i)).toBeInTheDocument()
    expect(screen.getByText('heap-arr')).toBeInTheDocument()
    expect(screen.getByText('[0]')).toBeInTheDocument()
    expect(screen.getByText('low')).toBeInTheDocument()
  })

  it('renders CallStackScopePanel with frames and scope variables', () => {
    render(
      <CallStackScopePanel
        callStack={mockSteps[0].callStack}
        variables={mockSteps[0].variables}
        stdoutDelta={mockSteps[0].stdoutDelta}
      />
    )

    expect(screen.getByText(/binarySearch\(\)/i)).toBeInTheDocument()
    expect(screen.getByText('low:')).toBeInTheDocument()
    expect(screen.getByText('high:')).toBeInTheDocument()
    expect(screen.getByText(/> Init trace/i)).toBeInTheDocument()
  })

  it('renders InvariantAnomalyCard when anomaly exists', () => {
    render(
      <InvariantAnomalyCard
        anomalies={[
          {
            stepIndex: 1,
            line: 4,
            type: 'OFF_BY_ONE_INDEX',
            description: 'Index out of bounds on loop exit',
            culpritVariables: { low: 5, high: 4 },
            suggestedFix: 'Use while (low <= high)',
          },
        ]}
      />
    )

    expect(screen.getByText(/OFF BY ONE INDEX/i)).toBeInTheDocument()
    expect(screen.getByText(/Index out of bounds on loop exit/i)).toBeInTheDocument()
    expect(screen.getByText(/Use while \(low <= high\)/i)).toBeInTheDocument()
  })
})
