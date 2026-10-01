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
      certificate_code: c.certificate_code || c.certificateUrl || c.id,
      title: c.title || c.course?.title || 'Academic Certification',
      course: {
        id: c.course?.id || c.courseId || 'crs-default',
        title: c.course?.title || c.title || 'Course Mastery',
        thumbnail_url: c.course?.thumbnail_url,
      },
      issued_at: c.issued_at || c.issuedAt || new Date().toISOString(),
      signature: c.signature || 'SHA256:verified',
      download_url: c.download_url || c.certificateUrl || '#',
      is_revoked: Boolean(c.is_revoked),
    }))
    return { status: 'success', data: mapped }
  },

  // Generate certificate
  async generateCertificate(
    courseId: string
  ): Promise<{ certificateUrl: string; certificate?: Certificate }> {
    const res = await fetchApi('/certificates/generate', {
      method: 'POST',
      body: JSON.stringify({ courseId }),
    })
    return res.data
  },

  // Verify certificate (public endpoint - no auth required)
  async verifyCertificate(
    code: string
  ): Promise<{ status: string; data: CertificateVerification }> {
    const res = await fetchApi(`/certificates/verify/${encodeURIComponent(code)}`)
    return res
  },

  // Share certificate (generate public verification URL)
  getShareUrl(code: string): string {
    return `${window.location.origin}/verify-certificate/${encodeURIComponent(code)}`
  },
}
