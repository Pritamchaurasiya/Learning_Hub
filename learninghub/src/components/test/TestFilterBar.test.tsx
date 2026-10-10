import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { TestFilterBar, TestFilterState } from './TestFilterBar'

describe('TestFilterBar', () => {
  const initialFilter: TestFilterState = {
    mode: '',
    difficulty: '',
    aiMode: '',
    exam: '',
  }

  it('renders all 7 mode pills with proper active styling', () => {
    const onSelectModePill = vi.fn()
    render(
      <TestFilterBar
        selectedModePill="all"
        onSelectModePill={onSelectModePill}
        searchQuery=""
        onSearchChange={vi.fn()}
        filter={initialFilter}
        onFilterChange={vi.fn()}
        offlineCount={3}
      />
    )

    expect(screen.getByTestId('mode-pill-all')).toBeInTheDocument()
    expect(screen.getByTestId('mode-pill-adaptive')).toBeInTheDocument()
    expect(screen.getByTestId('mode-pill-contest')).toBeInTheDocument()
    expect(screen.getByTestId('mode-pill-practice')).toBeInTheDocument()
    expect(screen.getByTestId('mode-pill-ai')).toBeInTheDocument()
    expect(screen.getByTestId('mode-pill-non_ai')).toBeInTheDocument()
    expect(screen.getByTestId('mode-pill-offline')).toBeInTheDocument()

    expect(screen.getByText('Offline Ready (3)')).toBeInTheDocument()
    expect(screen.getByTestId('mode-pill-all')).toHaveAttribute('aria-selected', 'true')
    expect(screen.getByTestId('mode-pill-adaptive')).toHaveAttribute('aria-selected', 'false')
  })

  it('triggers onSelectModePill when a mode pill is clicked', () => {
    const onSelectModePill = vi.fn()
    render(
      <TestFilterBar
        selectedModePill="all"
        onSelectModePill={onSelectModePill}
        searchQuery=""
        onSearchChange={vi.fn()}
        filter={initialFilter}
        onFilterChange={vi.fn()}
      />
    )

    fireEvent.click(screen.getByTestId('mode-pill-adaptive'))
    expect(onSelectModePill).toHaveBeenCalledWith('adaptive', {
      mode: 'adaptive',
      aiMode: '',
    })

    fireEvent.click(screen.getByTestId('mode-pill-ai'))
    expect(onSelectModePill).toHaveBeenCalledWith('ai', {
      mode: '',
      aiMode: 'ai_required',
    })
  })

  it('updates search query and shows clear button when non-empty', () => {
    const onSearchChange = vi.fn()
    const { rerender } = render(
      <TestFilterBar
        selectedModePill="all"
        onSelectModePill={vi.fn()}
        searchQuery=""
        onSearchChange={onSearchChange}
        filter={initialFilter}
        onFilterChange={vi.fn()}
      />
    )

    const searchInput = screen.getByTestId('test-search-input')
    fireEvent.change(searchInput, { target: { value: 'JEE Advanced' } })
    expect(onSearchChange).toHaveBeenCalledWith('JEE Advanced')

    expect(screen.queryByTestId('clear-search-btn')).not.toBeInTheDocument()

    rerender(
      <TestFilterBar
        selectedModePill="all"
        onSelectModePill={vi.fn()}
        searchQuery="JEE Advanced"
        onSearchChange={onSearchChange}
        filter={initialFilter}
        onFilterChange={vi.fn()}
      />
    )

    const clearBtn = screen.getByTestId('clear-search-btn')
    expect(clearBtn).toBeInTheDocument()
    fireEvent.click(clearBtn)
    expect(onSearchChange).toHaveBeenCalledWith('')
  })

  it('triggers onFilterChange when dropdown selects change', () => {
    const onFilterChange = vi.fn()
    render(
      <TestFilterBar
        selectedModePill="all"
        onSelectModePill={vi.fn()}
        searchQuery=""
        onSearchChange={vi.fn()}
        filter={initialFilter}
        onFilterChange={onFilterChange}
        availableExams={['JEE Advanced', 'GATE CS', 'Digital SAT']}
      />
    )

    const examSelect = screen.getByTestId('exam-filter-select')
    fireEvent.change(examSelect, { target: { value: 'GATE CS' } })
    expect(onFilterChange).toHaveBeenCalledWith({ exam: 'GATE CS' })

    const modeSelect = screen.getByTestId('mode-filter-select')
    fireEvent.change(modeSelect, { target: { value: 'timed_challenge' } })
    expect(onFilterChange).toHaveBeenCalledWith({ mode: 'timed_challenge' })

    const diffSelect = screen.getByTestId('difficulty-filter-select')
    fireEvent.change(diffSelect, { target: { value: 'hard' } })
    expect(onFilterChange).toHaveBeenCalledWith({ difficulty: 'hard' })

    const aiSelect = screen.getByTestId('ai-mode-filter-select')
    fireEvent.change(aiSelect, { target: { value: 'no_ai' } })
    expect(onFilterChange).toHaveBeenCalledWith({ aiMode: 'no_ai' })
  })
})
