/// <reference types="vite/client" />
/// <reference types="vite-plugin-pwa/client" />

interface DesktopInfo {
  isDesktop: boolean
  platform: string
  arch: string
  version: string
  electronVersion: string
  nodeVersion: string
}

interface DesktopAPIBridge {
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

interface Window {
  ethereum?: {
    request: (args: { method: string }) => Promise<string[]>
    on: (event: string, handler: (accounts: string[]) => void) => void
    removeListener: (event: string, handler: (accounts: string[]) => void) => void
  }
  desktopAPI?: DesktopAPIBridge
}
