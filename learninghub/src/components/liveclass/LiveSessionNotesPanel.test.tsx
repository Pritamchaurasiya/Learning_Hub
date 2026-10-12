import { describe, it, expect, vi, beforeEach } from 'vitest'
import { screen, fireEvent, waitFor } from '@testing-library/react'
import { render } from '../../test/test-utils'
import { LiveSessionNotesPanel } from './LiveSessionNotesPanel'

// Mock localStorage
const localStorageMock = (() => {
  let store: Record<string, string> = {}
  return {
    getItem: vi.fn((key: string) => store[key] ?? null),
    setItem: vi.fn((key: string, value: string) => {
      store[key] = value
    }),
    removeItem: vi.fn((key: string) => {
      delete store[key]
    }),
    clear: vi.fn(() => {
      store = {}
    }),
  }
})()

Object.defineProperty(window, 'localStorage', { value: localStorageMock })

describe('LiveSessionNotesPanel', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    localStorageMock.clear()
  })

  it('renders the notes panel with empty state', () => {
    render(
      <LiveSessionNotesPanel sessionId="sess-1" sessionTitle="Test Session" />
    )

    expect(screen.getByTestId('live-session-notes-panel')).toBeInTheDocument()
    expect(screen.getByText('Session Notes')).toBeInTheDocument()
    expect(screen.getByText('No notes yet')).toBeInTheDocument()
    expect(
      screen.getByPlaceholderText(/Take a quick note/i)
    ).toBeInTheDocument()
  })

  it('adds a new timestamped note when the button is clicked', async () => {
    render(
      <LiveSessionNotesPanel sessionId="sess-1" sessionTitle="Test Session" />
    )

    const textarea = screen.getByPlaceholderText(/Take a quick note/i)
    fireEvent.change(textarea, {
      target: { value: 'Dijkstra uses a priority queue for O((V+E)logV)' },
    })

    const addButton = screen.getByText(/Add Timestamped Note/i)
    fireEvent.click(addButton)

    await waitFor(() => {
      expect(
        screen.getByText('Dijkstra uses a priority queue for O((V+E)logV)')
      ).toBeInTheDocument()
    })

    // Should show elapsed time label
    expect(screen.getByTestId('live-note-item')).toBeInTheDocument()

    // Input should be cleared
    expect(textarea).toHaveValue('')
  })

  it('does not add empty notes', () => {
    render(
      <LiveSessionNotesPanel sessionId="sess-1" sessionTitle="Test Session" />
    )

    const addButton = screen.getByText(/Add Timestamped Note/i)
    fireEvent.click(addButton)

    expect(screen.getByText('No notes yet')).toBeInTheDocument()
  })

  it('adds a note via Ctrl+Enter keyboard shortcut', async () => {
    render(
      <LiveSessionNotesPanel sessionId="sess-1" sessionTitle="Test Session" />
    )

    const textarea = screen.getByPlaceholderText(/Take a quick note/i)
    fireEvent.change(textarea, {
      target: { value: 'Quick keyboard note' },
    })

    fireEvent.keyDown(textarea, { key: 'Enter', ctrlKey: true })

    await waitFor(() => {
      expect(screen.getByText('Quick keyboard note')).toBeInTheDocument()
    })
  })

  it('deletes a specific note', async () => {
    render(
      <LiveSessionNotesPanel sessionId="sess-1" sessionTitle="Test Session" />
    )

    // Add a note first
    const textarea = screen.getByPlaceholderText(/Take a quick note/i)
    fireEvent.change(textarea, { target: { value: 'Note to delete' } })
    fireEvent.click(screen.getByText(/Add Timestamped Note/i))

    await waitFor(() => {
      expect(screen.getByText('Note to delete')).toBeInTheDocument()
    })

    // Delete it
    const deleteButton = screen.getByTitle('Delete note')
    fireEvent.click(deleteButton)

    await waitFor(() => {
      expect(screen.queryByText('Note to delete')).not.toBeInTheDocument()
      expect(screen.getByText('No notes yet')).toBeInTheDocument()
    })
  })

  it('clears all notes when clear button is clicked', async () => {
    render(
      <LiveSessionNotesPanel sessionId="sess-1" sessionTitle="Test Session" />
    )

    // Add two notes
    const textarea = screen.getByPlaceholderText(/Take a quick note/i)

    fireEvent.change(textarea, { target: { value: 'Note A' } })
    fireEvent.click(screen.getByText(/Add Timestamped Note/i))

    fireEvent.change(textarea, { target: { value: 'Note B' } })
    fireEvent.click(screen.getByText(/Add Timestamped Note/i))

    await waitFor(() => {
      expect(screen.getByText('Note A')).toBeInTheDocument()
      expect(screen.getByText('Note B')).toBeInTheDocument()
    })

    // Clear all
    const clearButton = screen.getByTitle('Clear all notes')
    fireEvent.click(clearButton)

    await waitFor(() => {
      expect(screen.getByText('No notes yet')).toBeInTheDocument()
    })
  })

  it('persists notes to localStorage', async () => {
    render(
      <LiveSessionNotesPanel sessionId="sess-42" sessionTitle="Test Session" />
    )

    const textarea = screen.getByPlaceholderText(/Take a quick note/i)
    fireEvent.change(textarea, { target: { value: 'Persisted note' } })
    fireEvent.click(screen.getByText(/Add Timestamped Note/i))

    await waitFor(() => {
      expect(localStorageMock.setItem).toHaveBeenCalledWith(
        'lh_live_notes_sess-42',
        expect.stringContaining('Persisted note')
      )
    })
  })

  it('shows the note count badge when notes exist', async () => {
    render(
      <LiveSessionNotesPanel sessionId="sess-1" sessionTitle="Test Session" />
    )

    const textarea = screen.getByPlaceholderText(/Take a quick note/i)
    fireEvent.change(textarea, { target: { value: 'Counted note' } })
    fireEvent.click(screen.getByText(/Add Timestamped Note/i))

    await waitFor(() => {
      expect(screen.getByText('1')).toBeInTheDocument()
    })
  })

  it('triggers markdown export when export button is clicked', async () => {
    // Mock URL.createObjectURL and revokeObjectURL
    const mockCreateObjectURL = vi.fn(() => 'blob:mock-url')
    const mockRevokeObjectURL = vi.fn()
    global.URL.createObjectURL = mockCreateObjectURL
    global.URL.revokeObjectURL = mockRevokeObjectURL

    render(
      <LiveSessionNotesPanel sessionId="sess-1" sessionTitle="Test Session" />
    )

    // Add a note
    const textarea = screen.getByPlaceholderText(/Take a quick note/i)
    fireEvent.change(textarea, { target: { value: 'Export this note' } })
    fireEvent.click(screen.getByText(/Add Timestamped Note/i))

    await waitFor(() => {
      expect(screen.getByText('Export this note')).toBeInTheDocument()
    })

    // Click export
    const exportButton = screen.getByTitle('Export notes as Markdown')
    fireEvent.click(exportButton)

    expect(mockCreateObjectURL).toHaveBeenCalled()
    expect(mockRevokeObjectURL).toHaveBeenCalled()
  })
})
