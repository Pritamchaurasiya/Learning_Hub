import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { CommandPalette } from './CommandPalette'

const mockedNavigate = vi.fn()
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom')
  return {
    ...actual,
    useNavigate: () => mockedNavigate,
  }
})

describe('CommandPalette Component', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('does not render modal by default', () => {
    render(
      <MemoryRouter>
        <CommandPalette />
      </MemoryRouter>
    )
    expect(screen.queryByPlaceholderText(/Type a command or search/i)).toBeNull()
  })

  it('opens on Ctrl+K keyboard shortcut', () => {
    render(
      <MemoryRouter>
        <CommandPalette />
      </MemoryRouter>
    )
    fireEvent.keyDown(window, { key: 'k', ctrlKey: true })
    expect(screen.getByPlaceholderText(/Type a command or search/i)).toBeDefined()
  })

  it('filters commands according to query input', () => {
    render(
      <MemoryRouter>
        <CommandPalette />
      </MemoryRouter>
    )
    fireEvent.keyDown(window, { key: 'k', ctrlKey: true })
    const input = screen.getByPlaceholderText(/Type a command or search/i)
    fireEvent.change(input, { target: { value: 'visualizer' } })

    expect(screen.getByText('Algorithm Visualizer')).toBeDefined()
  })

  it('navigates to selected item when enter is pressed', () => {
    render(
      <MemoryRouter>
        <CommandPalette />
      </MemoryRouter>
    )
    fireEvent.keyDown(window, { key: 'k', ctrlKey: true })
    const input = screen.getByPlaceholderText(/Type a command or search/i)
    fireEvent.change(input, { target: { value: 'ai tutor' } })
    fireEvent.keyDown(input, { key: 'Enter' })

    expect(mockedNavigate).toHaveBeenCalledWith('/ai-tutor')
  })
})
