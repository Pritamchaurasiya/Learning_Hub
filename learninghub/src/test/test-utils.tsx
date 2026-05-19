import React, { ReactElement } from 'react'
import { render, RenderOptions, RenderResult } from '@testing-library/react'
import { BrowserRouter } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { HelmetProvider } from 'react-helmet-async'

// Create a custom render function that wraps components with providers
interface CustomRenderOptions extends Omit<RenderOptions, 'wrapper'> {
  route?: string
  queryClient?: QueryClient
}

function AllTheProviders({ children }: { children: React.ReactNode }) {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
        staleTime: 0,
        gcTime: 0,
      },
    },
  })

  return (
    <QueryClientProvider client={queryClient}>
      <HelmetProvider>
        <BrowserRouter>{children}</BrowserRouter>
      </HelmetProvider>
    </QueryClientProvider>
  )
}

function renderWithRouter(
  ui: ReactElement,
  { route = '/', ...renderOptions }: CustomRenderOptions = {}
): RenderResult {
  window.history.pushState({}, 'Test page', route)
  return render(ui, { wrapper: AllTheProviders, ...renderOptions })
}

// Helper to wait for async operations
export const waitForAsync = () => new Promise(resolve => setTimeout(resolve, 0))

// Helper to create mock API responses
export const createMockResponse = <T,>(data: T, status = 'success') => ({
  status,
  data,
})

// Re-export everything from testing-library
export * from '@testing-library/react'

// Override render method
export { renderWithRouter as render }
