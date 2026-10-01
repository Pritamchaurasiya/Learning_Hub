import { describe, it, expect, vi, beforeEach } from 'vitest'
import { screen, waitFor, fireEvent } from '@testing-library/react'
import { render } from '../test/test-utils'
import SettingsPage from './SettingsPage'
import * as apiModule from '../utils/api'
import { useStore } from '../stores/useStore'

vi.mock('../utils/api', () => ({
  fetchApi: vi.fn(),
  clearTokens: vi.fn(),
}))

describe('SettingsPage Component', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    useStore.setState({
      theme: { mode: 'dark' },
      settings: {
        notifications: true,
        dailyReminder: true,
        progressUpdates: true,
        achievements: true,
        weeklyDigest: false,
        showProfile: true,
        showProgress: true,
        showStreak: true,
        lowPerformanceMode: false,
        compactMode: false,
        soundEffects: true,
        autoplay: false,
      },
      auth: {
        isAuthenticated: true,
        user: {
          id: 'usr-1',
          username: 'Ada Lovelace',
          email: 'ada@example.com',
          role: 'STUDENT',
          xp: 1000,
          level: 3,
          streak: 5,
          lastActive: new Date().toISOString(),
          examPreference: {
            id: 'pref-1',
            userId: 'usr-1',
            countryId: 'c-in',
            examId: 'ex-jee',
            subjectIds: ['s-math'],
            difficulty: 'HARD',
            dailyGoal: 20,
          },
        },
        isHydrated: true,
      },
    })

    vi.mocked(apiModule.fetchApi).mockImplementation(async (url: string) => {
      if (url.includes('/exam-content/countries')) {
        return { data: [{ id: 'c-in', name: 'India', code: 'IN' }] }
      }
      if (url.includes('/exam-content/exams')) {
        return { data: [{ id: 'ex-jee', name: 'JEE Advanced', category: 'Engineering' }] }
      }
      if (url.includes('/subjects')) {
        return { data: [{ id: 's-math', name: 'Mathematics' }] }
      }
      return { data: null }
    })
  })

  it('renders settings sections, header, and theme selectors', async () => {
    render(<SettingsPage />)

    await waitFor(() => {
      expect(screen.getByText('Configuration')).toBeInTheDocument()
      expect(screen.getByText('Display Interface')).toBeInTheDocument()
    })

    expect(screen.getByText('Efficiency Mode')).toBeInTheDocument()
    expect(screen.getByText('System Parameters & Preferences')).toBeInTheDocument()
  })

  it('switches theme to light and activates sync changes button', async () => {
    render(<SettingsPage />)

    await waitFor(() => {
      expect(screen.getByText('Light')).toBeInTheDocument()
    })

    fireEvent.click(screen.getByText('Light'))

    await waitFor(() => {
      expect(screen.getByText(/Sync Changes/i)).toBeInTheDocument()
    })
  })

  it('toggles efficiency mode', async () => {
    render(<SettingsPage />)

    await waitFor(() => {
      expect(screen.getByText('Efficiency Mode')).toBeInTheDocument()
    })

    const efficiencyToggle = screen.getByLabelText(/Efficiency Mode/i)
    fireEvent.click(efficiencyToggle)

    expect(useStore.getState().settings.lowPerformanceMode).toBe(true)
  })

  it('renders Web3 On-Chain Identity section and validates wallet input', async () => {
    render(<SettingsPage />)

    await waitFor(() => {
      expect(screen.getByText('Web3 On-Chain Identity')).toBeInTheDocument()
      expect(screen.getByPlaceholderText('0x71C63729Ed55c7e230CDE7920D9bAfEC529289A2')).toBeInTheDocument()
    })

    const input = screen.getByPlaceholderText('0x71C63729Ed55c7e230CDE7920D9bAfEC529289A2')
    fireEvent.change(input, { target: { value: '0xinvalid' } })

    const syncButton = screen.getByText('Sync Web3 Wallet')
    fireEvent.click(syncButton)

    await waitFor(() => {
      expect(screen.getByText(/Please enter a valid 40-character hexadecimal Ethereum\/Polygon address/i)).toBeInTheDocument()
    })
  })

  it('renders 2FA section in disabled state and initiates setup flow', async () => {
    vi.mocked(apiModule.fetchApi).mockImplementation(async (url: string) => {
      if (url.includes('/exam-content/countries')) {
        return { data: [{ id: 'c-in', name: 'India', code: 'IN' }] }
      }
      if (url === '/auth/mfa/setup') {
        return {
          data: {
            secret: 'TESTSECRETKEY123456',
            qrCodeUrl: 'data:image/png;base64,mockqrcode',
          },
        }
      }
      return { data: [] }
    })

    render(<SettingsPage />)

    await waitFor(() => {
      expect(screen.getByText('Two-Factor Auth (2FA)')).toBeInTheDocument()
      expect(screen.getByText('Enable 2FA Protection')).toBeInTheDocument()
    })

    fireEvent.click(screen.getByText('Enable 2FA Protection'))

    await waitFor(() => {
      expect(screen.getByAltText('2FA QR Code')).toBeInTheDocument()
      expect(screen.getByText('TESTSECRETKEY123456')).toBeInTheDocument()
      expect(screen.getByTestId('mfa-token-input')).toBeInTheDocument()
      expect(screen.getByTestId('mfa-verify-btn')).toBeInTheDocument()
    })
  })

  it('verifies 6-digit TOTP code and activates 2FA', async () => {
    vi.mocked(apiModule.fetchApi).mockImplementation(async (url: string) => {
      if (url.includes('/exam-content/countries')) {
        return { data: [{ id: 'c-in', name: 'India', code: 'IN' }] }
      }
      if (url === '/auth/mfa/setup') {
        return {
          data: {
            secret: 'TESTSECRETKEY123456',
            qrCodeUrl: 'data:image/png;base64,mockqrcode',
          },
        }
      }
      if (url === '/auth/mfa/verify') {
        return { data: { success: true } }
      }
      return { data: [] }
    })

    render(<SettingsPage />)

    await waitFor(() => {
      expect(screen.getByText('Enable 2FA Protection')).toBeInTheDocument()
    })

    fireEvent.click(screen.getByText('Enable 2FA Protection'))

    await waitFor(() => {
      expect(screen.getByTestId('mfa-token-input')).toBeInTheDocument()
    })

    const tokenInput = screen.getByTestId('mfa-token-input')
    fireEvent.change(tokenInput, { target: { value: '123456' } })

    const verifyBtn = screen.getByTestId('mfa-verify-btn')
    expect(verifyBtn).not.toBeDisabled()
    fireEvent.click(verifyBtn)

    await waitFor(() => {
      expect(apiModule.fetchApi).toHaveBeenCalledWith('/auth/mfa/verify', {
        method: 'POST',
        body: JSON.stringify({ token: '123456' }),
      })
    })
  })

  it('renders 2FA active state when mfaEnabled is true and handles disabling', async () => {
    useStore.setState({
      auth: {
        isAuthenticated: true,
        user: {
          id: 'usr-1',
          username: 'Ada Lovelace',
          email: 'ada@example.com',
          role: 'STUDENT',
          xp: 1000,
          level: 3,
          streak: 5,
          lastActive: new Date().toISOString(),
          mfaEnabled: true,
        },
        isHydrated: true,
      },
    })

    vi.mocked(apiModule.fetchApi).mockImplementation(async (url: string) => {
      if (url.includes('/exam-content/countries')) {
        return { data: [{ id: 'c-in', name: 'India', code: 'IN' }] }
      }
      if (url === '/auth/mfa/disable') {
        return { data: { success: true } }
      }
      return { data: [] }
    })

    render(<SettingsPage />)

    await waitFor(() => {
      expect(screen.getByText('2FA Active & Protected')).toBeInTheDocument()
      expect(screen.getByText('Disable 2FA Protection')).toBeInTheDocument()
    })

    fireEvent.click(screen.getByText('Disable 2FA Protection'))

    await waitFor(() => {
      expect(screen.getByText(/Enter your 6-digit authenticator code to confirm/i)).toBeInTheDocument()
    })

    const input = screen.getByPlaceholderText('000000')
    fireEvent.change(input, { target: { value: '654321' } })

    const confirmBtn = screen.getByText('Confirm Disable')
    fireEvent.click(confirmBtn)

    await waitFor(() => {
      expect(apiModule.fetchApi).toHaveBeenCalledWith('/auth/mfa/disable', {
        method: 'POST',
        body: JSON.stringify({ token: '654321' }),
      })
    })
  })
})

