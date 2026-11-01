import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { desktopService } from './desktopService'

describe('desktopService — Desktop Bridge & Offline Vault', () => {
  const originalDesktopAPI = (window as any).desktopAPI

  beforeEach(() => {
    localStorage.clear()
    delete (window as any).desktopAPI
  })

  afterEach(() => {
    ;(window as any).desktopAPI = originalDesktopAPI
  })

  it('detects when running in web browser fallback mode', () => {
    expect(desktopService.isDesktop()).toBe(false)
  })

  it('detects when running inside Electron native desktop container', () => {
    ;(window as any).desktopAPI = {
      isElectron: true,
      platform: 'win32',
    }
    expect(desktopService.isDesktop()).toBe(true)
  })

  it('retrieves system telemetry when desktopAPI is present', async () => {
    const mockInfo = {
      isDesktop: true,
      platform: 'win32',
      arch: 'x64',
      version: '1.0.0',
      electronVersion: '45.0.0',
      nodeVersion: '24.14.0',
    }

    ;(window as any).desktopAPI = {
      isElectron: true,
      getInfo: vi.fn().mockResolvedValue(mockInfo),
    }

    const info = await desktopService.getInfo()
    expect(info).toEqual(mockInfo)
    expect((window as any).desktopAPI.getInfo).toHaveBeenCalledTimes(1)
  })

  it('dispatches window management actions', () => {
    const minimize = vi.fn()
    const maximize = vi.fn()
    const close = vi.fn()
    const toggleFullscreen = vi.fn()

    ;(window as any).desktopAPI = {
      isElectron: true,
      minimize,
      maximize,
      close,
      toggleFullscreen,
    }

    desktopService.minimize()
    desktopService.maximize()
    desktopService.close()
    desktopService.toggleFullscreen()

    expect(minimize).toHaveBeenCalledTimes(1)
    expect(maximize).toHaveBeenCalledTimes(1)
    expect(close).toHaveBeenCalledTimes(1)
    expect(toggleFullscreen).toHaveBeenCalledTimes(1)
  })

  it('saves and loads from offline vault via native bridge', async () => {
    const saveOfflineData = vi.fn().mockResolvedValue({ success: true, key: 'exam_state' })
    const loadOfflineData = vi.fn().mockResolvedValue({ score: 98, attemptId: 'att-1' })

    ;(window as any).desktopAPI = {
      isElectron: true,
      saveOfflineData,
      loadOfflineData,
    }

    const saved = await desktopService.saveOfflineVault('exam_state', {
      score: 98,
      attemptId: 'att-1',
    })
    expect(saved).toBe(true)
    expect(saveOfflineData).toHaveBeenCalledWith('exam_state', { score: 98, attemptId: 'att-1' })

    const loaded = await desktopService.loadOfflineVault<{ score: number }>('exam_state')
    expect(loaded?.score).toBe(98)
  })

  it('falls back to localStorage when not in desktop mode', async () => {
    const saved = await desktopService.saveOfflineVault('test_key', { data: 123 })
    expect(saved).toBe(true)

    const loaded = await desktopService.loadOfflineVault<{ data: number }>('test_key')
    expect(loaded?.data).toBe(123)

    const keys = await desktopService.listOfflineVaultKeys()
    expect(keys).toContain('test_key')
  })

  it('sends native notification via desktopAPI', async () => {
    const notify = vi.fn().mockResolvedValue({ success: true })
    ;(window as any).desktopAPI = {
      isElectron: true,
      notify,
    }

    const res = await desktopService.notify('Quiz Completed', 'You scored 100%!')
    expect(res).toBe(true)
    expect(notify).toHaveBeenCalledWith({ title: 'Quiz Completed', body: 'You scored 100%!' })
  })
  it('subscribes to native navigation events via onNavigate', () => {
    const unsubMock = vi.fn()
    const onNavigate = vi.fn().mockReturnValue(unsubMock)
    ;(window as any).desktopAPI = {
      isElectron: true,
      onNavigate,
    }

    const callback = vi.fn()
    const unsub = desktopService.onNavigate(callback)
    expect(onNavigate).toHaveBeenCalledWith(callback)
    expect(unsub).toBe(unsubMock)

    unsub?.()
    expect(unsubMock).toHaveBeenCalledTimes(1)
  })
})
