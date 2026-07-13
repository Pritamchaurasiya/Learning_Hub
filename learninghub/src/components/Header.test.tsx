import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'

const { mockUseStore, setMockStore } = vi.hoisted(() => {
  const mockToggleDarkMode = vi.fn()
  const mockSetSidebarOpen = vi.fn()
  const mockLogout = vi.fn()

  const createDefaultStore = () => ({
    theme: { mode: 'system' },
    toggleDarkMode: mockToggleDarkMode,
    progress: { xp: 100, level: 5 },
    setSidebarOpen: mockSetSidebarOpen,
    dailyGoal: { progress: 30, target: 50 },
    auth: { isAuthenticated: false, user: null },
    logout: mockLogout,
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

vi.mock('../utils/api', () => ({
  fetchApi: vi.fn(),
}))

vi.mock('framer-motion', () => ({
  motion: {
    div: ({
      children,
      initial: _initial,
      animate: _animate,
      exit: _exit,
      transition: _transition,
      whileHover: _whileHover,
      whileTap: _whileTap,
      ...props
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    }: any) => <div {...props}>{children}</div>,
    h1: ({
      children,
      initial: _initial,
      animate: _animate,
      exit: _exit,
      transition: _transition,
      whileHover: _whileHover,
      whileTap: _whileTap,
      ...props
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    }: any) => <h1 {...props}>{children}</h1>,
    button: ({
      children,
      initial: _initial,
      animate: _animate,
      exit: _exit,
      transition: _transition,
      whileHover: _whileHover,
      whileTap: _whileTap,
      ...props
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    }: any) => <button {...props}>{children}</button>,
  },
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  AnimatePresence: ({ children }: any) => <>{children}</>,
}))

vi.mock('./NotificationBell', () => ({
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  NotificationBell: (_props: any) => <div>🔔</div>,
}))

vi.mock('./ui/ProgressRing', () => ({
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  default: (_props: any) => <div>progress</div>,
}))

import Header from './Header'

function renderHeader() {
  return render(
    <MemoryRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
      <Header />
    </MemoryRouter>
  )
}

describe('Header Component', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    setMockStore()
  })

  it('renders header with logo text', () => {
    renderHeader()
    expect(screen.getByText('LearningHub')).toBeInTheDocument()
    expect(screen.getByText('LH')).toBeInTheDocument()
  })

  it('renders search input', () => {
    renderHeader()
    expect(screen.getByPlaceholderText('Search courses...')).toBeInTheDocument()
  })

  it('renders XP and level badges', () => {
    renderHeader()
    expect(screen.getByText('100')).toBeInTheDocument()
    expect(screen.getByText('Lv.5')).toBeInTheDocument()
  })

  it('shows theme toggle button', () => {
    renderHeader()
    const themeButton = screen.getByLabelText(/mode/i)
    expect(themeButton).toBeInTheDocument()
    expect(screen.getByRole('img', { name: /daily goal/i })).toBeInTheDocument()
  })

  it('shows menu button and calls setSidebarOpen on click', () => {
    const setSidebarOpen = vi.fn()
    setMockStore({
      setSidebarOpen,
    })
    renderHeader()
    const menuButton = screen.getByLabelText('Open menu')
    expect(menuButton).toBeInTheDocument()
    fireEvent.click(menuButton)
    expect(setSidebarOpen).toHaveBeenCalledWith(true)
  })

  it('does not show user menu when unauthenticated', () => {
    renderHeader()
    expect(screen.queryByLabelText('User menu')).not.toBeInTheDocument()
  })

  it('does not show notification bell when unauthenticated', () => {
    renderHeader()
    expect(screen.queryByText('🔔')).not.toBeInTheDocument()
  })

  describe('when authenticated', () => {
    beforeEach(() => {
      setMockStore({
        theme: { mode: 'dark' },
        progress: { xp: 500, level: 12 },
        dailyGoal: { progress: 45, target: 100 },
        auth: { isAuthenticated: true, user: { username: 'TestUser' } },
      })
    })

    it('renders user menu when authenticated', () => {
      renderHeader()
      expect(screen.getByLabelText('User menu')).toBeInTheDocument()
    })

    it('shows notification bell when authenticated', () => {
      renderHeader()
      expect(screen.getByText('🔔')).toBeInTheDocument()
    })

    it('displays username in dropdown', () => {
      renderHeader()
      fireEvent.click(screen.getByLabelText('User menu'))
      expect(screen.getByText('TestUser')).toBeInTheDocument()
    })

    it('opens user menu dropdown on click', () => {
      renderHeader()
      fireEvent.click(screen.getByLabelText('User menu'))
      expect(screen.getByText('My Profile')).toBeInTheDocument()
      expect(screen.getByText('Bookmarks')).toBeInTheDocument()
      expect(screen.getByText('Settings')).toBeInTheDocument()
      expect(screen.getByText('Logout')).toBeInTheDocument()
    })

    it('calls logout on logout button click', () => {
      const logout = vi.fn()
      setMockStore({
        theme: { mode: 'dark' },
        progress: { xp: 500, level: 12 },
        dailyGoal: { progress: 45, target: 100 },
        auth: { isAuthenticated: true, user: { username: 'TestUser' } },
        logout,
      })
      renderHeader()
      fireEvent.click(screen.getByLabelText('User menu'))
      fireEvent.click(screen.getByText('Logout'))
      expect(logout).toHaveBeenCalledTimes(1)
    })
  })
})
