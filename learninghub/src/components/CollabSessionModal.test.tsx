import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { CollabSessionModal } from './CollabSessionModal'

describe('CollabSessionModal', () => {
  it('does not render when isOpen is false', () => {
    const { container } = render(
      <CollabSessionModal
        isOpen={false}
        onClose={vi.fn()}
        roomId={null}
        isConnected={false}
        activePeers={[]}
        remoteCursor={null}
        onStartSession={vi.fn()}
        onLeaveSession={vi.fn()}
      />
    )
    expect(container.firstChild).toBeNull()
  })

  it('renders creation and join options when no active room exists', () => {
    const onStartSession = vi.fn()
    render(
      <CollabSessionModal
        isOpen={true}
        onClose={vi.fn()}
        roomId={null}
        isConnected={false}
        activePeers={[]}
        remoteCursor={null}
        onStartSession={onStartSession}
        onLeaveSession={vi.fn()}
      />
    )

    expect(screen.getByText('Live Collaborative DSA Session')).toBeInTheDocument()
    expect(screen.getByText('Create Collaborative Room')).toBeInTheDocument()
    expect(screen.getByPlaceholderText(/Enter Room Code/i)).toBeInTheDocument()

    fireEvent.click(screen.getByText('Create Collaborative Room'))
    expect(onStartSession).toHaveBeenCalled()
  })

  it('renders active room details and peer indicators when room is active', () => {
    const onLeaveSession = vi.fn()
    render(
      <CollabSessionModal
        isOpen={true}
        onClose={vi.fn()}
        roomId="collab-dsa-test-room-1"
        isConnected={true}
        activePeers={[
          {
            socketId: 'sock-peer-1',
            userId: 'usr-charlie',
            joinedAt: Date.now(),
          },
        ]}
        remoteCursor={{
          socketId: 'sock-peer-1',
          userId: 'usr-charlie',
          line: 5,
          ch: 10,
        }}
        onStartSession={vi.fn()}
        onLeaveSession={onLeaveSession}
      />
    )

    expect(screen.getByText('collab-dsa-test-room-1')).toBeInTheDocument()
    expect(screen.getByText('LIVE ONLINE')).toBeInTheDocument()
    expect(screen.getByText(/usr-char/i)).toBeInTheDocument()
    expect(screen.getByText('Line 6, Col 11')).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: /Leave Session/i }))
    expect(onLeaveSession).toHaveBeenCalled()
  })
})
