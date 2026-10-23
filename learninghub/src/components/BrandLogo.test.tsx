import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, act } from '@testing-library/react'
import BrandLogo, { BrandEmblem, useTypewriter, BRAND_STAGES } from './BrandLogo'
import { renderHook } from '@testing-library/react'

describe('BrandLogo Component with ChatGPT Keyboard Typewriter Effect', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('renders official brand emblem image with alt text', () => {
    render(<BrandLogo size="md" variant="full" />)
    const img = screen.getByAltText('LearningHub Logo')
    expect(img).toBeInTheDocument()
    expect(img).toHaveAttribute('src', '/logo.png')
  })

  it('initially displays LearningHub text with ChatGPT keyboard caret cursor', () => {
    render(<BrandLogo size="md" variant="full" />)
    expect(screen.getByText('Learning')).toBeInTheDocument()
    expect(screen.getByText('Hub')).toBeInTheDocument()
  })

  it('useTypewriter hook types and deletes character by character like ChatGPT', () => {
    const { result } = renderHook(() =>
      useTypewriter({
        words: BRAND_STAGES,
        enabled: true,
        typingSpeed: 50,
        deletingSpeed: 25,
        pauseDelay: 500,
      })
    )

    // Initial word is LearningHub
    expect(result.current.displayText).toBe('LearningHub')
    expect(result.current.currentStage.word).toBe('LearningHub')

    // Advance step-by-step through pause (500ms), deleting 11 chars (11*25ms), word switch (300ms), and typing "Learn" (5*50ms)
    for (let i = 0; i < 40; i++) {
      act(() => {
        vi.advanceTimersByTime(50)
      })
    }

    expect(result.current.currentStage.word).toBe('Learn')
    expect(result.current.displayText).toBe('Learn')
  })

  it('renders icon-only variant properly', () => {
    render(<BrandLogo variant="icon-only" size="sm" />)
    const img = screen.getByAltText('LearningHub Logo')
    expect(img).toBeInTheDocument()
  })

  it('renders vertical variant for auth and splash pages', () => {
    render(<BrandLogo variant="vertical" size="lg" subtitle="Pro Edition" />)
    expect(screen.getByAltText('LearningHub Logo')).toBeInTheDocument()
    expect(screen.getByText('Learning')).toBeInTheDocument()
    expect(screen.getByText('Hub')).toBeInTheDocument()
    expect(screen.getByText('Pro Edition')).toBeInTheDocument()
  })

  it('renders static LearningHub when animated is false', () => {
    render(<BrandLogo animated={false} size="md" />)
    expect(screen.getByText('Learning')).toBeInTheDocument()
    expect(screen.getByText('Hub')).toBeInTheDocument()
  })

  it('renders standalone BrandEmblem component', () => {
    render(<BrandEmblem size={50} />)
    const img = screen.getByAltText('LearningHub Logo')
    expect(img).toBeInTheDocument()
  })
})
