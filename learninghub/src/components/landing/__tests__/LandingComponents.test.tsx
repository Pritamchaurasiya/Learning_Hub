import { describe, it, expect, vi } from 'vitest'
import { screen, fireEvent } from '@testing-library/react'
import { render } from '../../../test/test-utils'
import { HeroSection } from '../HeroSection'
import { FacultyAdvisorySection } from '../FacultyAdvisorySection'
import { FounderMissionSection } from '../FounderMissionSection'
import { SystemStatusBar } from '../SystemStatusBar'
import { KeyboardShortcutsModal } from '../KeyboardShortcutsModal'

describe('Landing Components Craftsmanship Test Suite', () => {
  it('renders HeroSection and allows toggling between Competitive STEM and Engineering tracks', () => {
    const handleStartFree = vi.fn()
    const handleViewDemo = vi.fn()
    const handleTrackChange = vi.fn()

    render(
      <HeroSection
        onStartFree={handleStartFree}
        onViewDemo={handleViewDemo}
        onTrackChange={handleTrackChange}
      />
    )

    // Heading exists
    expect(screen.getByRole('heading', { level: 1 })).toBeInTheDocument()

    // Track switcher buttons
    const engTrackBtn = screen.getByRole('button', { name: /Software Engineering Track/i })
    fireEvent.click(engTrackBtn)
    expect(handleTrackChange).toHaveBeenCalledWith('engineering')

    // Click Run Test Cases
    const runBtn = screen.getByRole('button', { name: /Run Test Cases/i })
    expect(runBtn).toBeInTheDocument()
    fireEvent.click(runBtn)
  })

  it('renders FacultyAdvisorySection with verified faculty members', () => {
    render(<FacultyAdvisorySection />)

    expect(screen.getByText(/Prof. Anirban Mukherjee, Ph.D./i)).toBeInTheDocument()
    expect(screen.getByText(/Dr. Meenakshi Sundaram, Ph.D./i)).toBeInTheDocument()
    expect(screen.getByText(/Our Triple-Pass Verification Guarantee/i)).toBeInTheDocument()
  })

  it('renders FounderMissionSection with anti-spam and academic integrity pledges', () => {
    render(<FounderMissionSection />)

    expect(screen.getByText(/Why We Built LearningHub:/i)).toBeInTheDocument()
    expect(screen.getByText(/Zero Telemarketing Spam/i)).toBeInTheDocument()
    expect(screen.getByText(/Faculty-Audited Explanations/i)).toBeInTheDocument()
  })

  it('renders SystemStatusBar with live telemetry and triggers shortcut modal', () => {
    const handleOpenShortcuts = vi.fn()
    render(<SystemStatusBar onOpenKeyboardShortcuts={handleOpenShortcuts} />)

    expect(screen.getByText(/All Systems Operational/i)).toBeInTheDocument()
    expect(screen.getByText(/AST Sandbox: <14ms/i)).toBeInTheDocument()

    const shortcutBtn = screen.getByTitle(/View Keyboard Shortcuts/i)
    fireEvent.click(shortcutBtn)
    expect(handleOpenShortcuts).toHaveBeenCalled()
  })

  it('renders KeyboardShortcutsModal when open and closes on dismiss', () => {
    const handleClose = vi.fn()
    const { rerender } = render(<KeyboardShortcutsModal isOpen={false} onClose={handleClose} />)

    expect(screen.queryByText(/Keyboard Shortcuts/i)).not.toBeInTheDocument()

    rerender(<KeyboardShortcutsModal isOpen={true} onClose={handleClose} />)
    expect(screen.getByText(/Keyboard Shortcuts/i)).toBeInTheDocument()
    expect(screen.getByText(/Jump to Dashboard/i)).toBeInTheDocument()

    const closeBtn = screen.getByLabelText(/Close shortcuts/i)
    fireEvent.click(closeBtn)
    expect(handleClose).toHaveBeenCalled()
  })
})
