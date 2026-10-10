import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor, fireEvent } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { P2PCollabCanvasPage } from './P2PCollabCanvasPage'
import { crdtCollabService } from '../services/crdtCollabService'

vi.mock('../utils/api', () => ({
  api: {
    get: vi.fn(),
    post: vi.fn(),
  },
}))

describe('P2PCollabCanvasPage (Milestone 21 P2P CRDT Collaborative Canvas)', () => {
  beforeEach(() => {
    vi.clearAllMocks()

    vi.spyOn(crdtCollabService, 'createRoom').mockResolvedValue({
      roomId: 'room-alpha-test',
      roomName: 'Systems Design Whiteboard',
      creatorId: 'peer-test-user',
      createdAt: 1000,
      maxPeers: 6,
      peers: [
        {
          peerId: 'peer-test-user',
          displayName: 'Test Host',
          role: 'HOST',
          color: '#3B82F6',
          joinedAt: 1000,
          lastSeen: 1000,
          connectionType: 'P2P_WEBRTC',
          latencyMs: 10,
        },
      ],
      strokes: [],
      codeSnippets: [],
      vectorClock: { 'peer-test-user': 1 },
    })

    vi.spyOn(crdtCollabService, 'saveSnapshot').mockResolvedValue({
      snapshotCid: 'bafybeicollabtest999999',
    })
  })

  it('renders page header with Milestone 21 badges and P2P canvas elements', async () => {
    render(
      <MemoryRouter>
        <P2PCollabCanvasPage />
      </MemoryRouter>
    )

    expect(
      screen.getByText(/Real-Time Decentralized Whiteboard & Code Canvas/i)
    ).toBeDefined()
    expect(
      screen.getByText(/Milestone 21 • P2P WebRTC & CRDT Canvas/i)
    ).toBeDefined()

    await waitFor(() => {
      expect(screen.getByText('Systems Design Whiteboard')).toBeDefined()
      expect(screen.getByText(/WebRTC Mesh/i)).toBeDefined()
    })
  })

  it('allows adding a collaborative code block', async () => {
    render(
      <MemoryRouter>
        <P2PCollabCanvasPage />
      </MemoryRouter>
    )

    await waitFor(() => {
      expect(screen.getByText(/Collaborative Code Blocks/i)).toBeDefined()
    })

    const addCodeBtn = screen.getByRole('button', { name: /add code block/i })
    fireEvent.click(addCodeBtn)

    await waitFor(() => {
      expect(screen.getByText(/Shared Code Block #2/i)).toBeDefined()
    })
  })

  it('pins an IPFS multihash snapshot', async () => {
    render(
      <MemoryRouter>
        <P2PCollabCanvasPage />
      </MemoryRouter>
    )

    const pinBtn = await screen.findByRole('button', { name: /pin snapshot/i })
    fireEvent.click(pinBtn)

    await waitFor(() => {
      expect(crdtCollabService.saveSnapshot).toHaveBeenCalled()
      expect(screen.getByText('bafybeicollabtest999999')).toBeDefined()
    })
  })

  it('opens and interacts with the Join Room modal', async () => {
    render(
      <MemoryRouter>
        <P2PCollabCanvasPage />
      </MemoryRouter>
    )

    const joinBtn = screen.getByRole('button', { name: /join room/i })
    fireEvent.click(joinBtn)

    expect(screen.getByText(/Join Collaborative Room/i)).toBeDefined()
    const input = screen.getByPlaceholderText('e.g. room-alpha-123')
    fireEvent.change(input, { target: { value: 'room-remote-456' } })

    const cancelBtn = screen.getByRole('button', { name: /cancel/i })
    fireEvent.click(cancelBtn)

    await waitFor(() => {
      expect(screen.queryByText(/Join Collaborative Room/i)).toBeNull()
    })
  })
})
