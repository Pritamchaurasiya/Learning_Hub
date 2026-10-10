import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { TestSectionTabBar } from './TestSectionTabBar'
import type { TestSection } from '../../services/testsAService'

describe('TestSectionTabBar', () => {
  const mockSections: TestSection[] = [
    {
      id: 'sec-1',
      title: 'Physics',
      order: 1,
      is_timed: true,
      duration_minutes: 45,
    },
    {
      id: 'sec-2',
      title: 'Chemistry',
      order: 2,
      allow_backward_navigation: false,
    },
    {
      id: 'sec-3',
      title: 'Mathematics',
      order: 3,
    },
  ]

  const mockQuestions = [
    { id: 'q1', section_id: 'sec-1' },
    { id: 'q2', section_id: 'sec-1' },
    { id: 'q3', section_id: 'sec-2' },
    { id: 'q4', sectionId: 'sec-3' },
  ]

  const mockAnswers = {
    q1: 'A',
  }

  it('renders null when sections array is empty', () => {
    const { container } = render(
      <TestSectionTabBar
        sections={[]}
        questions={mockQuestions}
        answers={mockAnswers}
        onSelectSection={vi.fn()}
      />
    )
    expect(container.firstChild).toBeNull()
  })

  it('renders all sections with their answered counts and question totals', () => {
    render(
      <TestSectionTabBar
        sections={mockSections}
        questions={mockQuestions}
        answers={mockAnswers}
        activeSectionId="sec-1"
        onSelectSection={vi.fn()}
      />
    )

    expect(screen.getByText('Exam Sections (3)')).toBeInTheDocument()
    expect(screen.getByText('Physics')).toBeInTheDocument()
    expect(screen.getByText('Chemistry')).toBeInTheDocument()
    expect(screen.getByText('Mathematics')).toBeInTheDocument()

    // Physics: 1 answered out of 2
    expect(screen.getByTestId('section-progress-sec-1')).toHaveTextContent('1 / 2')
    // Chemistry: 0 answered out of 1
    expect(screen.getByTestId('section-progress-sec-2')).toHaveTextContent('0 / 1')
    // Mathematics: 0 answered out of 1
    expect(screen.getByTestId('section-progress-sec-3')).toHaveTextContent('0 / 1')
  })

  it('displays section time limit badge for active timed section', () => {
    render(
      <TestSectionTabBar
        sections={mockSections}
        questions={mockQuestions}
        answers={mockAnswers}
        activeSectionId="sec-1"
        onSelectSection={vi.fn()}
      />
    )

    const badge = screen.getByTestId('section-limit-badge')
    expect(badge).toHaveTextContent('Section Limit: 45m')
  })

  it('navigates to selected section and its first question index when clicked', () => {
    const onSelectSection = vi.fn()
    render(
      <TestSectionTabBar
        sections={mockSections}
        questions={mockQuestions}
        answers={mockAnswers}
        activeSectionId="sec-1"
        onSelectSection={onSelectSection}
      />
    )

    const chemTab = screen.getByTestId('section-tab-sec-2')
    fireEvent.click(chemTab)

    expect(onSelectSection).toHaveBeenCalledWith('sec-2', 2)
  })

  it('prevents navigation to locked section with backward navigation disabled and triggers warning', () => {
    const onSelectSection = vi.fn()
    const onWarning = vi.fn()

    render(
      <TestSectionTabBar
        sections={mockSections}
        questions={mockQuestions}
        answers={mockAnswers}
        activeSectionId="sec-3"
        lockedSectionIds={['sec-2']}
        onSelectSection={onSelectSection}
        onWarning={onWarning}
      />
    )

    const chemTab = screen.getByTestId('section-tab-sec-2')
    fireEvent.click(chemTab)

    expect(onSelectSection).not.toHaveBeenCalled()
    expect(onWarning).toHaveBeenCalledWith(
      expect.stringContaining('Section "Chemistry" is locked')
    )
  })

  it('handles section locking with user confirmation', () => {
    const onLockSection = vi.fn()
    const confirmSpy = vi.spyOn(window, 'confirm').mockReturnValue(true)

    render(
      <TestSectionTabBar
        sections={mockSections}
        questions={mockQuestions}
        answers={mockAnswers}
        activeSectionId="sec-1"
        onSelectSection={vi.fn()}
        onLockSection={onLockSection}
      />
    )

    const lockBtn = screen.getByTestId('lock-section-btn')
    fireEvent.click(lockBtn)

    expect(confirmSpy).toHaveBeenCalled()
    expect(onLockSection).toHaveBeenCalledWith('sec-1')

    confirmSpy.mockRestore()
  })

  it('cancels section locking when user dismisses confirmation dialog', () => {
    const onLockSection = vi.fn()
    const confirmSpy = vi.spyOn(window, 'confirm').mockReturnValue(false)

    render(
      <TestSectionTabBar
        sections={mockSections}
        questions={mockQuestions}
        answers={mockAnswers}
        activeSectionId="sec-1"
        onSelectSection={vi.fn()}
        onLockSection={onLockSection}
      />
    )

    const lockBtn = screen.getByTestId('lock-section-btn')
    fireEvent.click(lockBtn)

    expect(confirmSpy).toHaveBeenCalled()
    expect(onLockSection).not.toHaveBeenCalled()

    confirmSpy.mockRestore()
  })
})
