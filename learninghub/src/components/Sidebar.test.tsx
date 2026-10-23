import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import Sidebar from './Sidebar'

const { mockUseStore, setMockStore } = vi.hoisted(() => {
  const mockSetSidebarOpen = vi.fn()

  const createDefaultStore = () => ({
    sidebarOpen: true,
    setSidebarOpen: mockSetSidebarOpen,
    progress: { xp: 1200, streak: 5, completedCourses: ['c1'] },
    auth: {
      isAuthenticated: true,
      user: { username: 'testuser', role: 'STUDENT' },
    },
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

  return { mockUseStore, setMockStore, mockSetSidebarOpen }
})

vi.mock('../stores/useStore', () => ({
  useStore: mockUseStore,
}))

vi.mock('../hooks/useMediaQuery', () => ({
  useBreakpoint: () => true, // desktop mode
}))

vi.mock('framer-motion', () => ({
  motion: new Proxy(
    {},
    {
      get: (_target, prop) => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        return ({ children, ...props }: any) => {
          const Tag = typeof prop === 'string' ? prop : 'div'
          const {
            initial: _i,
            animate: _a,
            exit: _e,
            transition: _t,
            variants: _v,
            whileHover: _wh,
            whileTap: _wt,
            drag: _d,
            dragConstraints: _dc,
            dragElastic: _de,
            onDragEnd: _ode,
            ...domProps
          } = props
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          return <Tag {...(domProps as any)}>{children}</Tag>
        }
      },
    }
  ),
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  AnimatePresence: ({ children }: any) => <>{children}</>,
}))

describe('Sidebar Component', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    setMockStore()
  })

  it('renders primary navigation items like Dashboard, Explore, and Library', () => {
    render(
      <MemoryRouter>
        <Sidebar />
      </MemoryRouter>
    )

    expect(screen.getByText('Dashboard')).toBeInTheDocument()
    expect(screen.getByText('Explore')).toBeInTheDocument()
    expect(screen.getByText('My Library')).toBeInTheDocument()
  })

  it('renders section headers without experimental Engineering Labs', () => {
    render(
      <MemoryRouter>
        <Sidebar />
      </MemoryRouter>
    )

    expect(screen.getByText('Practice')).toBeInTheDocument()
    expect(screen.queryByText('Engineering Labs')).not.toBeInTheDocument()
    expect(screen.getByText('Community')).toBeInTheDocument()
    expect(screen.getByText('Study Tools & Mentorship')).toBeInTheDocument()
    expect(screen.getByText('Account')).toBeInTheDocument()
  })

  it('verifies Engineering Labs studio links are not present', () => {
    render(
      <MemoryRouter>
        <Sidebar />
      </MemoryRouter>
    )

    expect(screen.queryByText('Edge AI Neural Tutor')).not.toBeInTheDocument()
    expect(screen.queryByText('Self-Healing Code')).not.toBeInTheDocument()
    expect(screen.queryByText('P2P Collab Canvas')).not.toBeInTheDocument()
    expect(screen.queryByText('Chaos Cluster Sandbox')).not.toBeInTheDocument()
  })

  it('renders admin navigation items when user role is ADMIN', () => {
    setMockStore({
      auth: {
        isAuthenticated: true,
        user: { username: 'adminuser', role: 'ADMIN' },
      },
    })

    render(
      <MemoryRouter>
        <Sidebar />
      </MemoryRouter>
    )

    expect(screen.getByText('Admin Panel')).toBeInTheDocument()
    expect(screen.getByText('AI Workshop')).toBeInTheDocument()
    expect(screen.getByText('System Health')).toBeInTheDocument()
  })
})
