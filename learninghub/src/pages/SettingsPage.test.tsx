import { describe, it, expect, vi, beforeEach } from 'vitest'
import { screen, fireEvent, waitFor } from '@testing-library/react'
import { render } from '../test/test-utils'
import SettingsPage from './SettingsPage'
import { useStore } from '../stores/useStore'

vi.mock('../utils/api', () => ({
  fetchApi: vi.fn().mockImplementation((url: string) => {
    if (url.includes('/web3/profile')) {
      return Promise.resolve({ data: { wallet_address: '0x123' } })
    }
    if (url.includes('/exam-content/countries')) {
      return Promise.resolve({ data: [{ id: 'in', name: 'India' }] })
    }
    return Promise.resolve({ data: [] })
  }),
}))

vi.mock('../utils/haptics', () => ({
  triggerHaptic: vi.fn().mockReturnValue(true),
  isHapticSupported: vi.fn().mockReturnValue(true),
}))

vi.mock('../utils/soundEffects', () => ({
  playRewardChime: vi.fn(),
  playArenaChime: vi.fn(),
  playExamChime: vi.fn(),
}))

describe('SettingsPage Component', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders settings sections including Sensory & Accessibility', async () => {
    render(<SettingsPage />)

    expect(screen.getByText('Sensory & Accessibility')).toBeInTheDocument()
    expect(screen.getByText('Audio Cues')).toBeInTheDocument()
    expect(screen.getByText('Haptic Vibrations')).toBeInTheDocument()
    expect(screen.getByText('Reduced Motion Mode')).toBeInTheDocument()
    expect(screen.getByText('High-Density Compact View')).toBeInTheDocument()
    expect(screen.getByText('Test Tactile Tap')).toBeInTheDocument()
  })

  it('triggers haptic test pulse when Test Tactile Tap is clicked', async () => {
    const { triggerHaptic } = await import('../utils/haptics')
    render(<SettingsPage />)

    const testBtn = screen.getByText('Test Tactile Tap')
    fireEvent.click(testBtn)

    expect(triggerHaptic).toHaveBeenCalledWith('success')
  })

  it('toggles audio cues and updates store settings', async () => {
    render(<SettingsPage />)

    const audioSwitch = screen.getByRole('button', { name: /Audio Cues/i })
    fireEvent.click(audioSwitch)

    await waitFor(() => {
      const state = useStore.getState()
      expect(state.settings.soundEffects).toBe(false)
    })
  })
})
