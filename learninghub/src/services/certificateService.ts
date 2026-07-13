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
    const res = await fetchApi('/certificates/my-certificates')
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const mapped = (res.data?.certificates ?? []).map((c: any) => ({
      id: c.id,
      certificate_code: c.certificateUrl, // using URL as code for download/share
      title: c.course.title,
      course: {
        id: c.courseId,
        title: c.course.title,
      },
      issued_at: c.issuedAt,
      signature: 'auto-generated',
      download_url: c.certificateUrl,
      is_revoked: false,
    }))
    return { status: 'success', data: mapped }
  },

  // Generate certificate
  async generateCertificate(courseId: string): Promise<{ certificateUrl: string }> {
    const res = await fetchApi('/certificates/generate', {
      method: 'POST',
      body: JSON.stringify({ courseId }),
    })
    return res.data
  },

  // Get certificate detail (Mock for now or use my-certificates filtering)
  async getCertificate(code: string): Promise<{ status: string; data: Certificate }> {
    return fetchApi(`/courses/certificates/${code}`)
  },

  // Download certificate PDF
  async downloadCertificate(code: string): Promise<Blob> {
    const url = code.startsWith('/') ? code : `/${code}`
    return fetchApi(url, {
      method: 'GET',
      responseType: 'blob',
      headers: { Accept: 'application/pdf' },
    }) as Promise<Blob>
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
