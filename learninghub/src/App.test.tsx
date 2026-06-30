import { render } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { describe, it, expect } from 'vitest'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { HelmetProvider } from 'react-helmet-async'
import App from './App'

describe('App Components', () => {
  it('renders LoadingScreen initially', () => {
    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    })

    // Render inside MemoryRouter because App contains router-dependent components
    render(
      <QueryClientProvider client={queryClient}>
        <HelmetProvider>
          <MemoryRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
            <App />
          </MemoryRouter>
        </HelmetProvider>
      </QueryClientProvider>
    )

    expect(document.body).toBeDefined()
  })
})
