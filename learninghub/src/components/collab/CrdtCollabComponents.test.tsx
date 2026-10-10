import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { PeerPresenceHUD } from './PeerPresenceHUD'
import { CrdtStateVectorInspector } from './CrdtStateVectorInspector'
import { P2PCollaborativeCanvas } from './P2PCollaborativeCanvas'
import { P2PCollaborativeCodeBlock } from './P2PCollaborativeCodeBlock'
import { CollabRoomState, CrdtOperation, CrdtCodeSnippet } from '../../types/crdtCollab'

const mockRoom: CollabRoomState = {
  roomId: 'room-alpha-99',
  roomName: 'Autonomous AI Architecture Board',
  creatorId: 'peer-alice',
  createdAt: 1000,
  maxPeers: 6,
  peers: [
    {
      peerId: 'peer-alice',
      displayName: 'Alice Host',
      role: 'HOST',
      color: '#3B82F6',
      joinedAt: 1000,
      lastSeen: 1000,
      connectionType: 'P2P_WEBRTC',
      latencyMs: 12,
    },
    {
      peerId: 'peer-bob',
      displayName: 'Bob Dev',
      role: 'PARTICIPANT',
      color: '#10B981',
      joinedAt: 1005,
      lastSeen: 1005,
      connectionType: 'P2P_WEBRTC',
      latencyMs: 18,
      cursor: { x: 250, y: 180, activeTool: 'pen' },
    },
  ],
  strokes: [
    {
      id: 'stroke-1',
      peerId: 'peer-alice',
      color: '#3B82F6',
      width: 4,
      tool: 'pen',
      points: [{ x: 50, y: 50 }, { x: 100, y: 100 }],
      createdAt: 1000,
      lamportClock: 1,
    },
  ],
  codeSnippets: [],
  vectorClock: {
    'peer-alice': 4,
    'peer-bob': 3,
  },
  ipfsSnapshotCid: 'bafybeialphacollab1234567890',
}

const mockOperations: CrdtOperation[] = [
  {
    id: 'op-1',
    opType: 'STROKE_ADD',
    peerId: 'peer-alice',
    lamportClock: 1,
    timestamp: 1000,
    payload: {},
  },
  {
    id: 'op-2',
    opType: 'CURSOR_BEACON',
    peerId: 'peer-bob',
    lamportClock: 2,
    timestamp: 1010,
    payload: {},
  },
]

describe('PeerPresenceHUD Component', () => {
  it('renders room metadata, active peers, and convergence percentage', () => {
    render(
      <PeerPresenceHUD
        room={mockRoom}
        currentPeerId="peer-alice"
        convergencePercentage={95}
      />
    )

    expect(screen.getByText('Autonomous AI Architecture Board')).toBeDefined()
    expect(screen.getByText('room-alpha-99')).toBeDefined()
    expect(screen.getByText(/95% Convergence/i)).toBeDefined()
    expect(screen.getByText(/2\/6 Peers/i)).toBeDefined()
    expect(screen.getByText('Host')).toBeDefined()
  })

  it('triggers invite copy interaction when clicked', () => {
    const onInvite = vi.fn()
    render(
      <PeerPresenceHUD
        room={mockRoom}
        currentPeerId="peer-alice"
        convergencePercentage={95}
        onInviteClick={onInvite}
      />
    )

    const inviteBtn = screen.getByRole('button', { name: /invite/i })
    fireEvent.click(inviteBtn)
    expect(onInvite).toHaveBeenCalled()
  })
})

describe('CrdtStateVectorInspector Component', () => {
  it('displays Lamport clock vector values and IPFS snapshot CID', () => {
    const onSaveSnapshot = vi.fn()
    const onExportSvg = vi.fn()
    const onExportJson = vi.fn()

    render(
      <CrdtStateVectorInspector
        room={mockRoom}
        currentPeerId="peer-alice"
        recentOperations={mockOperations}
        convergencePercentage={95}
        isSavingSnapshot={false}
        onSaveSnapshot={onSaveSnapshot}
        onExportSvg={onExportSvg}
        onExportJson={onExportJson}
      />
    )

    expect(screen.getByText('CRDT State Vector & Consensus')).toBeDefined()
    expect(screen.getByText('bafybeialphacollab1234567890')).toBeDefined()
    expect(screen.getByText('Recent CRDT Operations (2)')).toBeDefined()

    // Test export actions
    const svgBtn = screen.getByRole('button', { name: /svg/i })
    fireEvent.click(svgBtn)
    expect(onExportSvg).toHaveBeenCalled()

    const jsonBtn = screen.getByRole('button', { name: /json/i })
    fireEvent.click(jsonBtn)
    expect(onExportJson).toHaveBeenCalled()
  })
})

describe('P2PCollaborativeCanvas Component', () => {
  it('renders canvas controls and toolbar tools', () => {
    const onAddStroke = vi.fn()
    const onDeleteStroke = vi.fn()
    const onClearCanvas = vi.fn()
    const onCursorMove = vi.fn()

    render(
      <P2PCollaborativeCanvas
        strokes={mockRoom.strokes}
        peers={mockRoom.peers}
        currentPeerId="peer-alice"
        onAddStroke={onAddStroke}
        onDeleteStroke={onDeleteStroke}
        onClearCanvas={onClearCanvas}
        onCursorMove={onCursorMove}
      />
    )

    expect(screen.getByTitle('Pen (P)')).toBeDefined()
    expect(screen.getByTitle('Highlighter (H)')).toBeDefined()
    expect(screen.getByTitle('Eraser (E)')).toBeDefined()
    expect(screen.getByTitle('Clear Canvas')).toBeDefined()
    expect(screen.getByText(/CRDT Strokes: 1/i)).toBeDefined()

    // Clear canvas trigger
    const clearBtn = screen.getByTitle('Clear Canvas')
    fireEvent.click(clearBtn)
    expect(onClearCanvas).toHaveBeenCalled()
  })
})

describe('P2PCollaborativeCodeBlock Component', () => {
  it('renders shared code snippet and propagates code changes', () => {
    const snippet: CrdtCodeSnippet = {
      id: 'snippet-1',
      peerId: 'peer-alice',
      title: 'CRDT Consensus Engine',
      language: 'typescript',
      code: 'export const converge = () => true',
      lamportClock: 7,
      updatedAt: Date.now(),
    }

    const onUpdateCode = vi.fn()
    const onDeleteSnippet = vi.fn()

    render(
      <P2PCollaborativeCodeBlock
        snippet={snippet}
        currentPeerId="peer-alice"
        onUpdateCode={onUpdateCode}
        onDeleteSnippet={onDeleteSnippet}
      />
    )

    expect(screen.getByText('CRDT Consensus Engine')).toBeDefined()
    expect(screen.getByText(/typescript/i)).toBeDefined()
    expect(screen.getByText('L:7')).toBeDefined()

    const textarea = screen.getByPlaceholderText('// Type collaborative code snippet here...')
    fireEvent.change(textarea, { target: { value: 'export const converge = () => false' } })
    expect(onUpdateCode).toHaveBeenCalledWith('snippet-1', 'export const converge = () => false')
  })
})
