import { fetchApi } from '../utils/api'
import type {
  W3CVerifiableCredential,
  CredentialVerificationResult,
  IssueCredentialPayload,
} from '../types/credentials'

export const verifiableCredentialService = {
  /**
   * Public verification endpoint (zero authentication required).
   * Validates cryptographic signatures, Merkle inclusion proof, and revocation registry.
   */
  async verifyCredential(
    credentialOrId: string | W3CVerifiableCredential
  ): Promise<{ status: string; data: CredentialVerificationResult }> {
    const payload =
      typeof credentialOrId === 'string'
        ? { credentialId: credentialOrId.trim() }
        : { credential: credentialOrId }

    const res = await fetchApi('/credentials/verify', {
      method: 'POST',
      body: JSON.stringify(payload),
    })
    return res
  },

  /**
   * Issues a new W3C Verifiable Credential for course completion or CAT percentile
   */
  async issueCredential(
    payload: IssueCredentialPayload
  ): Promise<{ status: string; data: W3CVerifiableCredential }> {
    const res = await fetchApi('/credentials/issue', {
      method: 'POST',
      body: JSON.stringify(payload),
    })
    return res
  },

  /**
   * Retrieves all W3C Verifiable Credentials owned by the current student
   */
  async getMyCredentials(): Promise<{
    status: string
    data: { credentials: W3CVerifiableCredential[] }
  }> {
    const res = await fetchApi('/credentials/my-credentials')
    return res
  },

  /**
   * Fetch single W3C JSON-LD credential by UUID
   */
  async getCredentialById(
    id: string
  ): Promise<{ status: string; data: W3CVerifiableCredential }> {
    const res = await fetchApi(`/credentials/${encodeURIComponent(id)}`)
    return res
  },

  /**
   * Downloads W3C JSON-LD credential to user's disk
   */
  downloadJson(vc: W3CVerifiableCredential, filename?: string): void {
    const jsonStr = JSON.stringify(vc, null, 2)
    const blob = new Blob([jsonStr], { type: 'application/ld+json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = filename || `learninghub-credential-${vc.id.replace(/[^a-zA-Z0-9-]/g, '_')}.json`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  },

  /**
   * Generates a tamper-proof SVG certificate graphic for instant download & printing
   */
  generateCertificateSvg(vc: W3CVerifiableCredential): string {
    const student = vc.credentialSubject.studentName
    const title = vc.credentialSubject.achievementTitle
    const date = new Date(vc.issuanceDate).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    })
    const root = vc.proof.merkleRoot.slice(0, 18) + '...'
    const cid = vc.proof.ipfsCid.slice(0, 20) + '...'
    const did = vc.credentialSubject.id.slice(0, 24) + '...'

    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 900 620" width="100%" height="100%">
  <defs>
    <linearGradient id="gold-grad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#f59e0b" />
      <stop offset="50%" stop-color="#fbbf24" />
      <stop offset="100%" stop-color="#d97706" />
    </linearGradient>
    <linearGradient id="bg-grad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#0f172a" />
      <stop offset="100%" stop-color="#1e293b" />
    </linearGradient>
  </defs>
  <!-- Background -->
  <rect width="900" height="620" fill="url(#bg-grad)" rx="16" />
  <rect x="20" y="20" width="860" height="580" fill="none" stroke="url(#gold-grad)" stroke-width="2" rx="12" opacity="0.8" />
  <rect x="30" y="30" width="840" height="560" fill="none" stroke="#334155" stroke-width="1" rx="8" />

  <!-- Seal / Emblem -->
  <circle cx="450" cy="95" r="38" fill="url(#gold-grad)" opacity="0.15" />
  <circle cx="450" cy="95" r="30" fill="none" stroke="url(#gold-grad)" stroke-width="2" />
  <text x="450" y="103" font-family="system-ui, sans-serif" font-size="24" font-weight="bold" fill="#f59e0b" text-anchor="middle">LH</text>

  <!-- Typography -->
  <text x="450" y="165" font-family="system-ui, sans-serif" font-size="14" font-weight="600" fill="#94a3b8" letter-spacing="4" text-anchor="middle">W3C VERIFIABLE CREDENTIAL</text>
  <text x="450" y="200" font-family="Georgia, serif" font-size="30" font-weight="bold" fill="#f8fafc" text-anchor="middle">Certificate of Academic Mastery</text>
  <text x="450" y="235" font-family="system-ui, sans-serif" font-size="13" fill="#cbd5e1" text-anchor="middle">This decentralized credential certifies that</text>

  <!-- Student Name -->
  <text x="450" y="285" font-family="Georgia, serif" font-size="32" font-weight="bold" fill="url(#gold-grad)" text-anchor="middle">${student}</text>
  <line x1="280" y1="300" x2="620" y2="300" stroke="#475569" stroke-width="1" />

  <!-- Course Title -->
  <text x="450" y="335" font-family="system-ui, sans-serif" font-size="14" fill="#94a3b8" text-anchor="middle">has successfully mastered and demonstrated excellence in</text>
  <text x="450" y="370" font-family="system-ui, sans-serif" font-size="20" font-weight="bold" fill="#f1f5f9" text-anchor="middle">${title}</text>

  <!-- Cryptographic Proof Footer -->
  <rect x="50" y="440" width="800" height="95" fill="#090d16" rx="8" stroke="#334155" />
  <text x="75" y="468" font-family="monospace" font-size="11" fill="#10b981">● W3C DID: ${did}</text>
  <text x="75" y="492" font-family="monospace" font-size="11" fill="#64748b">Merkle Root: ${root} | IPFS CID: ${cid}</text>
  <text x="75" y="516" font-family="monospace" font-size="11" fill="#64748b">Polygon Anchor: ${vc.proof.anchor.contractAddress} | Block: #${vc.proof.anchor.blockNumber}</text>

  <!-- Signatures -->
  <text x="120" y="575" font-family="system-ui, sans-serif" font-size="11" fill="#64748b">Date of Issuance: ${date}</text>
  <text x="780" y="575" font-family="system-ui, sans-serif" font-size="11" fill="#f59e0b" text-anchor="end">LearningHub Academic Council</text>
</svg>`
  },
}
