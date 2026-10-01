import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { MemoryRouter, Routes, Route } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { HelmetProvider } from 'react-helmet-async'
import VerifyCertificatePage from './VerifyCertificatePage'
import { certificateService } from '../services/certificateService'

vi.mock('../services/certificateService', () => ({
  certificateService: {
    verifyCertificate: vi.fn(),
    getShareUrl: vi.fn((code: string) => `http://localhost:3000/verify-certificate/${code}`),
  },
}))

function renderWithProviders(initialEntry = '/verify-certificate') {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
    },
  })

  return render(
    <QueryClientProvider client={queryClient}>
      <HelmetProvider>
        <MemoryRouter initialEntries={[initialEntry]}>
          <Routes>
            <Route path="/verify-certificate" element={<VerifyCertificatePage />} />
            <Route path="/verify-certificate/:code" element={<VerifyCertificatePage />} />
          </Routes>
        </MemoryRouter>
      </HelmetProvider>
    </QueryClientProvider>
  )
}

describe('VerifyCertificatePage Component', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders certificate search input and verification banner', () => {
    renderWithProviders()

    expect(screen.getByText(/Academic Certificate Verification/i)).toBeInTheDocument()
    expect(screen.getByPlaceholderText(/Enter Certificate Code/i)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Verify Credential/i })).toBeInTheDocument()
  })

  it('displays verified certificate details when code is found in route params', async () => {
    vi.mocked(certificateService.verifyCertificate).mockResolvedValue({
      status: 'success',
      data: {
        valid: true,
        certificate_code: 'LH-CERT-2026-DSA-001',
        student_name: 'Pritam Chaurasiya',
        course_title: 'Advanced Data Structures & Algorithms Mastery',
        issued_at: '2026-08-15T12:00:00Z',
        signature: 'SHA256:4f8a9e21b7c0d3e5f6a7b8c9d0e1f2a3',
        verified_by: 'LearningHub Academic Verification Council & Polygon Blockchain Ledger',
      },
    })

    renderWithProviders('/verify-certificate/LH-CERT-2026-DSA-001')

    expect(await screen.findByText('Pritam Chaurasiya')).toBeInTheDocument()
    expect(screen.getByText('Advanced Data Structures & Algorithms Mastery')).toBeInTheDocument()
    expect(screen.getByText(/Valid & Authentic/i)).toBeInTheDocument()
    expect(screen.getByText('SHA256:4f8a9e21b7c0d3e5f6a7b8c9d0e1f2a3')).toBeInTheDocument()
  })

  it('allows user to enter a new code and submit for verification', async () => {
    vi.mocked(certificateService.verifyCertificate).mockResolvedValue({
      status: 'success',
      data: {
        valid: true,
        certificate_code: 'LH-CERT-2026-JEE-002',
        student_name: 'Shiva Kumar',
        course_title: 'JEE Advanced Physics & Mathematics',
        issued_at: '2026-08-20T12:00:00Z',
        signature: 'SHA256:9a8b7c6d5e4f3a2b1c0d',
        verified_by: 'LearningHub Academic Verification Council',
      },
    })

    renderWithProviders()

    const input = screen.getByPlaceholderText(/Enter Certificate Code/i)
    fireEvent.change(input, { target: { value: 'LH-CERT-2026-JEE-002' } })

    const submitBtn = screen.getByRole('button', { name: /Verify Credential/i })
    fireEvent.click(submitBtn)

    expect(await screen.findByText('Shiva Kumar')).toBeInTheDocument()
    expect(screen.getByText('JEE Advanced Physics & Mathematics')).toBeInTheDocument()
  })
})
