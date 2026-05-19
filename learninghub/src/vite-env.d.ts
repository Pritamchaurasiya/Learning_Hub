/// <reference types="vite/client" />

interface Window {
  ethereum?: {
    request: (args: { method: string }) => Promise<string[]>
    on: (event: string, handler: (accounts: string[]) => void) => void
    removeListener: (event: string, handler: (accounts: string[]) => void) => void
  }
}
