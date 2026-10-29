/// <reference types="vite/client" />
/// <reference types="vite-plugin-pwa/client" />

interface Window {
  ethereum?: {
    request: (args: { method: string }) => Promise<string[]>
    on: (event: string, handler: (accounts: string[]) => void) => void
    removeListener: (event: string, handler: (accounts: string[]) => void) => void
  }
  desktopAPI?: {
    isElectron: boolean
    platform: string
    getInfo: () => Promise<{
      isDesktop: boolean
      platform: string
      arch: string
      version: string
      electronVersion: string
      nodeVersion: string
    }>
    minimize: () => Promise<void>
    maximize: () => Promise<void>
    close: () => Promise<void>
  }
}
