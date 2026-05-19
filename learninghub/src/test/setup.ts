import '@testing-library/jest-dom'
import { expect, afterEach, vi } from 'vitest'
import { cleanup } from '@testing-library/react'
import * as matchers from '@testing-library/jest-dom/matchers'

// Extend Vitest's expect with Testing Library matchers
expect.extend(matchers)

// Cleanup after each test
afterEach(() => {
  cleanup()
})

// Mock window.matchMedia
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: vi.fn().mockImplementation(query => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })),
})

// Mock IntersectionObserver
class MockIntersectionObserver {
  observe = vi.fn()
  disconnect = vi.fn()
  unobserve = vi.fn()
}

Object.defineProperty(window, 'IntersectionObserver', {
  writable: true,
  value: MockIntersectionObserver,
})

// Mock scrollTo
Object.defineProperty(window, 'scrollTo', {
  writable: true,
  value: vi.fn(),
})

// Mock localStorage with in-memory persistence
const storageState: Record<string, string> = {}
const localStorageMock = {
  // eslint-disable-next-line security/detect-object-injection
  getItem: vi.fn((key: string) => (key in storageState ? storageState[key] : null)),
  setItem: vi.fn((key: string, value: string) => {
    // eslint-disable-next-line security/detect-object-injection
    storageState[key] = String(value)
  }),
  removeItem: vi.fn((key: string) => {
    // eslint-disable-next-line security/detect-object-injection
    delete storageState[key]
  }),
  clear: vi.fn(() => {
    // eslint-disable-next-line security/detect-object-injection
    Object.keys(storageState).forEach(key => delete storageState[key])
  }),
}

Object.defineProperty(window, 'localStorage', {
  value: localStorageMock,
})

// Mock import.meta.env
vi.mock('import.meta.env', () => ({
  DEV: true,
  PROD: false,
  VITE_API_URL: 'http://localhost:8000/api/v1',
  VITE_APP_URL: 'http://localhost:5173',
}))

// Suppress console errors in tests unless explicitly testing errors
const originalConsoleError = console.error
console.error = (...args: unknown[]) => {
  // Filter out specific React warnings that are expected in tests
  const message = String(args[0])
  if (
    message.includes('ReactDOM.render is no longer supported') ||
    (message.includes('Warning:') && message.includes('act'))
  ) {
    return
  }
  originalConsoleError(...args)
}
