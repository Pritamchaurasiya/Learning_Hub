import { fetchApi } from '../utils/api'

export interface Certificate {
  id: string
  certificate_code: string
  title: string
  course: {
    id: string
    title: string
    thumbnail_url?: string
  }
  issued_at: string
  expires_at?: string
  signature: string
  download_url?: string
  is_revoked: boolean
  revoked_at?: string
}

export interface CertificateVerification {
  valid: boolean
  certificate_code: string
  student_name: string
  course_title: string
  issued_at: string
  signature: string
  verified_by: string
  error?: string
}

export const certificateService = {
  // Get all certificates for current user
  async getCertificates(): Promise<{ status: string; data: Certificate[] }> {
    return fetchApi('/courses/certificates')
  },

  // Get certificate detail
  async getCertificate(code: string): Promise<{ status: string; data: Certificate }> {
    return fetchApi(`/courses/certificates/${code}`)
  },

  // Download certificate PDF
  async downloadCertificate(code: string): Promise<Blob> {
    const response = await fetch(
      `${import.meta.env.VITE_API_URL ?? 'http://localhost:8000/api'}/courses/certificates/${code}/download`,
      {
        method: 'GET',
        credentials: 'include',
        headers: {
          Accept: 'application/pdf',
        },
      }
    )
    if (!response.ok) {
      throw new Error('Failed to download certificate')
    }
    return response.blob()
  },

  // Verify certificate (public endpoint - no auth required)
  async verifyCertificate(
    code: string
  ): Promise<{ status: string; data: CertificateVerification }> {
    return fetchApi(`/courses/public-certificates/${code}/verify`)
  },

  // Share certificate (generate public verification URL)
  getShareUrl(code: string): string {
    return `${window.location.origin}/verify-certificate/${code}`
  },
}
