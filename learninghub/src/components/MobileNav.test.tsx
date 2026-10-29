import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import MobileNav from './MobileNav'

const { mockUseStore, setMockStore } = vi.hoisted(() => {
  const createDefaultStore = () => ({
    auth: { isAuthenticated: false, user: null },
  })

  let storeState = createDefaultStore()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const mockUseStore = vi.fn((selector?: (state: any) => unknown) =>
    typeof selector === 'function' ? selector(storeState) : storeState
  )

  const setMockStore = (overrides: Record<string, unknown> = {}) => {
    storeState = { ...createDefaultStore(), ...overrides }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    mockUseStore.mockImplementation((selector?: (state: any) => unknown) =>
      typeof selector === 'function' ? selector(storeState) : storeState
    )
  }

  return { mockUseStore, setMockStore }
})

vi.mock('../stores/useStore', () => ({
  useStore: mockUseStore,
}))

vi.mock('framer-motion', () => ({
  AnimatePresence: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  motion: {
    div: ({
      children,
      initial: _initial,
      animate: _animate,
      exit: _exit,
      transition: _transition,
      whileHover: _whileHover,
      whileTap: _whileTap,
      layoutId: _layoutId,
      ...props
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    }: any) => <div {...props}>{children}</div>,
  },
}))

describe('MobileNav Component', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    setMockStore({
      auth: { isAuthenticated: false, user: null },
    })
  })

  describe('Unauthenticated / Public Visitor', () => {
    it('renders the public navigation bar with 4 items', () => {
      render(
        <MemoryRouter initialEntries={['/']}>
          <MobileNav />
        </MemoryRouter>
      )

      const nav = screen.getByRole('navigation', { name: /mobile navigation/i })
      expect(nav).toBeInTheDocument()

      expect(screen.getByRole('link', { name: 'Home' })).toBeInTheDocument()
      expect(screen.getByRole('link', { name: 'Updates' })).toBeInTheDocument()
      expect(screen.getByRole('link', { name: 'Pricing' })).toBeInTheDocument()
      expect(screen.getByRole('link', { name: 'Sign In' })).toBeInTheDocument()
    })

    it('does not display the More feature drawer button when unauthenticated', () => {
      render(
        <MemoryRouter initialEntries={['/']}>
          <MobileNav />
        </MemoryRouter>
      )

      expect(screen.queryByRole('button', { name: /more features/i })).not.toBeInTheDocument()
    })
  })

  describe('Authenticated Learner', () => {
    beforeEach(() => {
      setMockStore({
        auth: {
          isAuthenticated: true,
          user: { id: 'user-1', username: 'AlexLearner', role: 'STUDENT' },
        },
      })
    })

    it('renders the 4 primary authenticated tabs and the More launcher button', () => {
      render(
        <MemoryRouter initialEntries={['/dashboard']}>
          <MobileNav />
        </MemoryRouter>
      )

      expect(screen.getByRole('link', { name: 'Home' })).toHaveAttribute('href', '/dashboard')
      expect(screen.getByRole('link', { name: 'Practice' })).toHaveAttribute('href', '/problems')
      expect(screen.getByRole('link', { name: 'Tests A+' })).toHaveAttribute('href', '/tests-a')
      expect(screen.getByRole('link', { name: 'Stats' })).toHaveAttribute('href', '/analytics')

      const moreButton = screen.getByRole('button', { name: /more features/i })
      expect(moreButton).toBeInTheDocument()
      expect(moreButton).toHaveAttribute('aria-expanded', 'false')
    })

    it('opens the bottom drawer when More button is clicked', () => {
      render(
        <MemoryRouter initialEntries={['/dashboard']}>
          <MobileNav />
        </MemoryRouter>
      )

      const moreButton = screen.getByRole('button', { name: /more features/i })
      fireEvent.click(moreButton)

      expect(screen.getByRole('dialog', { name: /all features menu/i })).toBeInTheDocument()
      expect(screen.getByText('Platform Features')).toBeInTheDocument()
      expect(
        screen.getByText('Quick access to all practice & learning modules')
      ).toBeInTheDocument()

      // Verify feature items in the drawer
      expect(screen.getByText('1v1 Arena Duel')).toBeInTheDocument()
      expect(screen.getByText('Spaced Revision')).toBeInTheDocument()
      expect(screen.getByText('Study Planner')).toBeInTheDocument()
      expect(screen.getByText('Contests')).toBeInTheDocument()
      expect(screen.getByText('Library & Ebooks')).toBeInTheDocument()
      expect(screen.getByText('Platform Updates')).toBeInTheDocument()
      expect(screen.getByText('Account Settings')).toBeInTheDocument()
    })

    it('closes the drawer when clicking the close (X) button', () => {
      render(
        <MemoryRouter initialEntries={['/dashboard']}>
          <MobileNav />
        </MemoryRouter>
      )

      const moreButton = screen.getByRole('button', { name: /more features/i })
      fireEvent.click(moreButton)

      const closeButton = screen.getByRole('button', { name: /close menu/i })
      fireEvent.click(closeButton)

      expect(screen.queryByRole('dialog', { name: /all features menu/i })).not.toBeInTheDocument()
    })

    it('closes the drawer when the Escape key is pressed', () => {
      render(
        <MemoryRouter initialEntries={['/dashboard']}>
          <MobileNav />
        </MemoryRouter>
      )

      const moreButton = screen.getByRole('button', { name: /more features/i })
      fireEvent.click(moreButton)
      expect(screen.getByRole('dialog', { name: /all features menu/i })).toBeInTheDocument()

      fireEvent.keyDown(window, { key: 'Escape' })
      expect(screen.queryByRole('dialog', { name: /all features menu/i })).not.toBeInTheDocument()
    })

    it('renders the authenticated user card and Profile item in the drawer', () => {
      render(
        <MemoryRouter initialEntries={['/dashboard']}>
          <MobileNav />
        </MemoryRouter>
      )

      fireEvent.click(screen.getByRole('button', { name: /more features/i }))

      // User card
      expect(screen.getByText('AlexLearner')).toBeInTheDocument()
      expect(screen.getByRole('button', { name: 'Profile' })).toBeInTheDocument()

      // Feature item in grid
      expect(screen.getByText('Profile & Portfolio')).toBeInTheDocument()
    })

    it('navigates to /profile and closes drawer when Profile quick button is clicked', () => {
      render(
        <MemoryRouter initialEntries={['/dashboard']}>
          <MobileNav />
        </MemoryRouter>
      )

      fireEvent.click(screen.getByRole('button', { name: /more features/i }))
      const profileBtn = screen.getByRole('button', { name: 'Profile' })
      fireEvent.click(profileBtn)

      expect(screen.queryByRole('dialog', { name: /all features menu/i })).not.toBeInTheDocument()
    })
  })
})
