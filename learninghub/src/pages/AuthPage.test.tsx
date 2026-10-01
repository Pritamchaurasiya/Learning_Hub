import { describe, it, expect, vi, beforeEach } from 'vitest'
import { screen, waitFor, fireEvent } from '@testing-library/react'
import { render } from '../test/test-utils'
import AuthPage from './AuthPage'
import * as apiModule from '../utils/api'
import { useStore } from '../stores/useStore'

vi.mock('../utils/api', () => ({
  fetchApi: vi.fn(),
  clearTokens: vi.fn(),
  setAccessToken: vi.fn(),
  setRefreshToken: vi.fn(),
  getAccessToken: vi.fn(),
  getRefreshToken: vi.fn(),
}))

const mockNavigate = vi.fn()
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom')
  return {
    ...actual,
    useNavigate: () => mockNavigate,
    useLocation: () => ({ pathname: '/auth', search: '', state: null }),
  }
})

describe('AuthPage Component & MFA Challenge Integration', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    useStore.setState({
      auth: {
        isAuthenticated: false,
        user: null,
        isHydrated: true,
      },
    })
  })

  it('renders login form with email and password fields', async () => {
    render(<AuthPage />)

    expect(screen.getByLabelText(/Email Address/i)).toBeInTheDocument()
    expect(screen.getByPlaceholderText(/Enter your password/i)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Sign In/i })).toBeInTheDocument()
  })

  it('handles standard authentication without MFA', async () => {
    vi.mocked(apiModule.fetchApi).mockResolvedValueOnce({
      data: {
        user: {
          id: 'usr-123',
          email: 'student@learninghub.com',
          username: 'student',
          role: 'STUDENT',
          xp: 100,
          level: 1,
          streak: 1,
        },
        tokens: {
          accessToken: 'access-token-xyz',
          refreshToken: 'refresh-token-xyz',
        },
      },
    })

    render(<AuthPage />)

    const emailInput = screen.getByLabelText(/Email Address/i)
    const passwordInput = screen.getByPlaceholderText(/Enter your password/i)

    fireEvent.change(emailInput, { target: { value: 'student@learninghub.com' } })
    fireEvent.change(passwordInput, { target: { value: 'Student@123!' } })

    const submitBtn = screen.getByRole('button', { name: /Sign In/i })
    fireEvent.click(submitBtn)

    await waitFor(() => {
      expect(apiModule.fetchApi).toHaveBeenCalledWith('/auth/login', {
        method: 'POST',
        body: JSON.stringify({
          email: 'student@learninghub.com',
          password: 'Student@123!',
        }),
      })
      expect(useStore.getState().auth.isAuthenticated).toBe(true)
      expect(mockNavigate).toHaveBeenCalledWith('/dashboard', { replace: true })
    })
  })

  it('transitions to MFA challenge when server responds with mfaRequired', async () => {
    vi.mocked(apiModule.fetchApi).mockResolvedValueOnce({
      data: {
        mfaRequired: true,
        mfaSessionToken: 'session-jwt-token-456',
      },
    })

    render(<AuthPage />)

    const emailInput = screen.getByLabelText(/Email Address/i)
    const passwordInput = screen.getByPlaceholderText(/Enter your password/i)

    fireEvent.change(emailInput, { target: { value: 'mfa.user@learninghub.com' } })
    fireEvent.change(passwordInput, { target: { value: 'Password@123!' } })

    const submitBtn = screen.getByRole('button', { name: /Sign In/i })
    fireEvent.click(submitBtn)

    await waitFor(() => {
      expect(screen.getByText('Two-Factor Verification')).toBeInTheDocument()
      expect(screen.getByTestId('auth-mfa-code')).toBeInTheDocument()
      expect(screen.getByRole('button', { name: /Verify & Continue/i })).toBeInTheDocument()
    })
  })

  it('submits MFA 6-digit code to /auth/mfa/login and completes authentication', async () => {
    vi.mocked(apiModule.fetchApi)
      .mockResolvedValueOnce({
        data: {
          mfaRequired: true,
          mfaSessionToken: 'session-jwt-token-456',
        },
      })
      .mockResolvedValueOnce({
        data: {
          user: {
            id: 'usr-mfa',
            email: 'mfa.user@learninghub.com',
            username: 'mfa_user',
            role: 'STUDENT',
            xp: 500,
            level: 2,
            streak: 3,
            mfaEnabled: true,
          },
          tokens: {
            accessToken: 'mfa-verified-token',
            refreshToken: 'mfa-refresh-token',
          },
        },
      })

    render(<AuthPage />)

    fireEvent.change(screen.getByLabelText(/Email Address/i), {
      target: { value: 'mfa.user@learninghub.com' },
    })
    fireEvent.change(screen.getByPlaceholderText(/Enter your password/i), {
      target: { value: 'Password@123!' },
    })
    fireEvent.click(screen.getByRole('button', { name: /Sign In/i }))

    await waitFor(() => {
      expect(screen.getByTestId('auth-mfa-code')).toBeInTheDocument()
    })

    const mfaInput = screen.getByTestId('auth-mfa-code')
    fireEvent.change(mfaInput, { target: { value: '654321' } })

    const verifyBtn = screen.getByRole('button', { name: /Verify & Continue/i })
    expect(verifyBtn).not.toBeDisabled()
    fireEvent.click(verifyBtn)

    await waitFor(() => {
      expect(apiModule.fetchApi).toHaveBeenCalledWith('/auth/mfa/login', {
        method: 'POST',
        body: JSON.stringify({
          mfaSessionToken: 'session-jwt-token-456',
          token: '654321',
        }),
      })
      expect(useStore.getState().auth.isAuthenticated).toBe(true)
      expect(mockNavigate).toHaveBeenCalledWith('/dashboard', { replace: true })
    })
  })

  it('allows user to cancel MFA challenge and return to login', async () => {
    vi.mocked(apiModule.fetchApi).mockResolvedValueOnce({
      data: {
        mfaRequired: true,
        mfaSessionToken: 'session-jwt-token-456',
      },
    })

    render(<AuthPage />)

    fireEvent.change(screen.getByLabelText(/Email Address/i), {
      target: { value: 'mfa.user@learninghub.com' },
    })
    fireEvent.change(screen.getByPlaceholderText(/Enter your password/i), {
      target: { value: 'Password@123!' },
    })
    fireEvent.click(screen.getByRole('button', { name: /Sign In/i }))

    await waitFor(() => {
      expect(screen.getByText('Two-Factor Verification')).toBeInTheDocument()
    })

    const cancelBtn = screen.getByRole('button', { name: /Cancel & Back to Login/i })
    fireEvent.click(cancelBtn)

    await waitFor(() => {
      expect(screen.getByLabelText(/Email Address/i)).toBeInTheDocument()
      expect(screen.getByPlaceholderText(/Enter your password/i)).toBeInTheDocument()
    })
  })
})
