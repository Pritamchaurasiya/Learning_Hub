import { render, screen, fireEvent } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import { TestCatalogHeader } from './TestCatalogHeader'

describe('TestCatalogHeader Component', () => {
  it('renders title and descriptive text', () => {
    render(
      <TestCatalogHeader
        onOpenImportModal={vi.fn()}
        onOpenManualModal={vi.fn()}
        onOpenAIModal={vi.fn()}
      />
    )

    expect(screen.getByRole('heading', { name: /Tests A\+/i })).toBeInTheDocument()
    expect(
      screen.getByText(/Practice with our comprehensive test collection and track your progress/i)
    ).toBeInTheDocument()
  })

  it('triggers action callbacks when action buttons are clicked', () => {
    const handleImport = vi.fn()
    const handleManual = vi.fn()
    const handleAI = vi.fn()

    render(
      <TestCatalogHeader
        onOpenImportModal={handleImport}
        onOpenManualModal={handleManual}
        onOpenAIModal={handleAI}
      />
    )

    const importBtn = screen.getByRole('button', { name: /Import Questions/i })
    fireEvent.click(importBtn)
    expect(handleImport).toHaveBeenCalledTimes(1)

    const manualBtn = screen.getByRole('button', { name: /Create Custom Test/i })
    fireEvent.click(manualBtn)
    expect(handleManual).toHaveBeenCalledTimes(1)

    const aiBtn = screen.getByRole('button', { name: /Adaptive Custom Mock|AI Custom Mock/i })
    fireEvent.click(aiBtn)
    expect(handleAI).toHaveBeenCalledTimes(1)
  })
})
