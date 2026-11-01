/**
 * LearningHub Desktop Native Service
 * Seamless bridge between React 18 frontend and native Windows Electron runtime.
 * Falls back gracefully to standard browser Web APIs when running in web mode.
 */

export interface DesktopInfo {
  isDesktop: boolean
  platform: string
  arch: string
  version: string
  electronVersion: string
  nodeVersion: string
}

export interface DesktopAPIBridge {
  isElectron?: boolean
  platform?: string
  getInfo?: () => Promise<DesktopInfo>
  minimize?: () => Promise<void>
  maximize?: () => Promise<void>
  close?: () => Promise<void>
  toggleFullscreen?: () => Promise<void>
  notify?: (payload: { title: string; body?: string }) => Promise<{ success: boolean }>
  saveOfflineData?: (key: string, data: unknown) => Promise<{ success: boolean; key: string }>
  loadOfflineData?: (key: string) => Promise<unknown>
  listOfflineData?: () => Promise<string[]>
}

const getBridge = (): DesktopAPIBridge | undefined => {
  if (typeof window === 'undefined') return undefined
  return (window as unknown as { desktopAPI?: DesktopAPIBridge }).desktopAPI
}

class DesktopService {
  /**
   * Returns true if running inside the native Windows desktop client.
   */
  public isDesktop(): boolean {
    const bridge = getBridge()
    return Boolean(bridge?.isElectron)
  }

  /**
   * Retrieves native system telemetry (Electron/Node versions, OS platform).
   */
  public async getInfo(): Promise<DesktopInfo | null> {
    const bridge = getBridge()
    if (this.isDesktop() && bridge?.getInfo) {
      try {
        return await bridge.getInfo()
      } catch (err) {
        console.warn('[DesktopService] Failed to get desktop info:', err)
      }
    }
    return null
  }

  /**
   * Window management controls (Minimize, Maximize, Close, Fullscreen).
   */
  public minimize(): void {
    const bridge = getBridge()
    if (this.isDesktop() && bridge?.minimize) {
      void bridge.minimize()
    }
  }

  public maximize(): void {
    const bridge = getBridge()
    if (this.isDesktop() && bridge?.maximize) {
      void bridge.maximize()
    }
  }

  public close(): void {
    const bridge = getBridge()
    if (this.isDesktop() && bridge?.close) {
      void bridge.close()
    }
  }

  public toggleFullscreen(): void {
    const bridge = getBridge()
    if (this.isDesktop() && bridge?.toggleFullscreen) {
      void bridge.toggleFullscreen()
    } else if (typeof document !== 'undefined') {
      if (document.fullscreenElement) {
        void document.exitFullscreen().catch(() => {})
      } else {
        void document.documentElement.requestFullscreen().catch(() => {})
      }
    }
  }

  /**
   * Sends a native Windows OS desktop notification with browser fallback.
   */
  public async notify(title: string, body: string = ''): Promise<boolean> {
    const bridge = getBridge()
    if (this.isDesktop() && bridge?.notify) {
      try {
        const res = await bridge.notify({ title, body })
        return Boolean(res?.success)
      } catch (err) {
        console.warn('[DesktopService] Native notification failed:', err)
      }
    }

    // Web Fallback: Standard browser Notification API
    if (typeof window !== 'undefined' && 'Notification' in window) {
      try {
        if (Notification.permission === 'granted') {
          new Notification(title, { body })
          return true
        } else if (Notification.permission !== 'denied') {
          const perm = await Notification.requestPermission()
          if (perm === 'granted') {
            new Notification(title, { body })
            return true
          }
        }
      } catch (err) {
        console.warn('[DesktopService] Web Notification fallback error:', err)
      }
    }

    return false
  }

  /**
   * Offline Storage Vault: Persists examination drafts and revision data to disk.
   */
  public async saveOfflineVault(key: string, data: unknown): Promise<boolean> {
    const bridge = getBridge()
    if (this.isDesktop() && bridge?.saveOfflineData) {
      try {
        const res = await bridge.saveOfflineData(key, data)
        return Boolean(res?.success)
      } catch (err) {
        console.warn(
          '[DesktopService] Offline vault disk save failed, using localStorage fallback:',
          err
        )
      }
    }

    // Web Fallback: localStorage
    try {
      localStorage.setItem(`lh_vault_${key}`, JSON.stringify(data))
      return true
    } catch {
      return false
    }
  }

  public async loadOfflineVault<T = unknown>(key: string): Promise<T | null> {
    const bridge = getBridge()
    if (this.isDesktop() && bridge?.loadOfflineData) {
      try {
        const data = await bridge.loadOfflineData(key)
        if (data !== null && data !== undefined) {
          return data as T
        }
      } catch (err) {
        console.warn(
          '[DesktopService] Offline vault disk load failed, trying localStorage fallback:',
          err
        )
      }
    }

    // Web Fallback: localStorage
    try {
      const raw = localStorage.getItem(`lh_vault_${key}`)
      return raw ? (JSON.parse(raw) as T) : null
    } catch {
      return null
    }
  }

  public async listOfflineVaultKeys(): Promise<string[]> {
    const bridge = getBridge()
    if (this.isDesktop() && bridge?.listOfflineData) {
      try {
        return await bridge.listOfflineData()
      } catch (err) {
        console.warn('[DesktopService] Offline vault list failed:', err)
      }
    }

    // Web Fallback: Scan localStorage keys
    const keys: string[] = []
    try {
      if (typeof localStorage !== 'undefined') {
        const len = localStorage.length ?? 0
        for (let i = 0; i < len; i++) {
          const k = localStorage.key(i)
          if (k && k.startsWith('lh_vault_')) {
            keys.push(k.replace(/^lh_vault_/, ''))
          }
        }
      }
    } catch {}
    return keys
  }
}

export const desktopService = new DesktopService()
export default desktopService
