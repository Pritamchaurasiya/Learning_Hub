import { describe, it, expect, vi, beforeEach } from 'vitest'
import { certificateService } from './certificateService'
import { fetchApi } from '../utils/api'

vi.mock('../utils/api', () => ({
  fetchApi: vi.fn(),
}))

describe('certificateService', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('getCertificates calls /certificates/my-certificates and returns mapped certificates', async () => {
    vi.mocked(fetchApi).mockResolvedValue({
      status: 'success',
      data: {
        certificates: [
          {
            id: 'c1',
            certificate_code: 'LH-CERT-2026-DSA',
            title: 'DSA Mastery',
            course: { id: 'crs-1', title: 'DSA Mastery' },
            issued_at: '2026-08-01T00:00:00Z',
            signature: 'SHA256:abcd',
            download_url: 'https://cdn.example.com/c1.pdf',
            is_revoked: false,
          },
        ],
      },
    })

    const result = await certificateService.getCertificates()
    expect(fetchApi).toHaveBeenCalledWith('/certificates/my-certificates')
    expect(result.data).toHaveLength(1)
    expect(result.data[0].certificate_code).toBe('LH-CERT-2026-DSA')
  })

  it('generateCertificate sends POST to /certificates/generate with courseId', async () => {
    vi.mocked(fetchApi).mockResolvedValue({
      status: 'success',
      data: {
        certificateUrl: 'https://cdn.example.com/new.pdf',
      },
    })

    const result = await certificateService.generateCertificate('crs-101')
    expect(fetchApi).toHaveBeenCalledWith('/certificates/generate', {
      method: 'POST',
      body: JSON.stringify({ courseId: 'crs-101' }),
    })
    expect(result.certificateUrl).toBe('https://cdn.example.com/new.pdf')
  })

  it('verifyCertificate queries the public verification endpoint', async () => {
    vi.mocked(fetchApi).mockResolvedValue({
      status: 'success',
      data: {
        valid: true,
        certificate_code: 'LH-CERT-123',
        student_name: 'Alex',
        course_title: 'Full Stack',
        issued_at: '2026-08-10',
        signature: 'SHA256:1111',
        verified_by: 'Academic Council',
      },
    })

    const result = await certificateService.verifyCertificate('LH-CERT-123')
    expect(fetchApi).toHaveBeenCalledWith('/certificates/verify/LH-CERT-123')
    expect(result.data.valid).toBe(true)
  })

  it('getShareUrl returns a valid absolute origin URL', () => {
    const url = certificateService.getShareUrl('LH-TEST-001')
    expect(url).toContain('/verify-certificate/LH-TEST-001')
  })
})
