import { web3Service } from '../../src/services/Web3Service'
import { certificateService } from '../../src/services/CertificateService'
import { prisma } from '../../src/prismaClient'

describe('Web3Service & CertificateService', () => {
  describe('Web3Service', () => {
    it('should generate default profile for new user', async () => {
      const profile = await web3Service.getProfile('user-test-1')
      expect(profile).toBeDefined()
      expect(profile.id).toBe('web3-user-test-1')
      expect(profile.did).toBe('did:polygon:user-test-1')
    })

    it('should update wallet address for user', async () => {
      const updated = await web3Service.updateWallet('user-test-1', '0x1234567890abcdef')
      expect(updated.wallet_address).toBe('0x1234567890abcdef')
    })

    it('should retrieve NFT certificates for user', async () => {
      const nfts = await web3Service.getNFTCertificates('user-test-1')
      expect(Array.isArray(nfts)).toBe(true)
      expect(nfts.length).toBeGreaterThan(0)
      expect(nfts[0].token_id).toBeDefined()
    })

    it('should mint new NFT certificate for user', async () => {
      const newNft = await web3Service.mintNFT('user-test-1', 'crs-algo-301')
      expect(newNft).toBeDefined()
      expect(newNft.course.id).toBe('crs-algo-301')
      expect(newNft.is_revoked).toBe(false)
      expect(newNft.transaction_hash).toMatch(/^0x/)
    })
  })

  describe('CertificateService', () => {
    beforeEach(() => {
      const mockCerts = [
        {
          id: 'cert-1',
          userId: 'user-cert-1',
          courseId: 'crs-algo-301',
          code: 'LH-CERT-2026-ALGO',
          title: 'Advanced Algorithms',
          recipientName: 'Cert Student',
          issuedAt: new Date(),
          expiresAt: null,
          signature: 'sig-1',
          pdfUrl: 'https://cdn.learninghub.app/certs/algo.pdf',
          isRevoked: false,
          revokedAt: null,
          revokedReason: null,
          user: { username: 'Cert Student', email: 'cert@test.com' },
        },
        {
          id: 'cert-2',
          userId: 'user-cert-1',
          courseId: 'crs-system-design',
          code: 'LH-CERT-2026-SD',
          title: 'System Design Architecture',
          recipientName: 'Cert Student',
          issuedAt: new Date(),
          expiresAt: null,
          signature: 'sig-2',
          pdfUrl: 'https://cdn.learninghub.app/certs/sd.pdf',
          isRevoked: false,
          revokedAt: null,
          revokedReason: null,
          user: { username: 'Cert Student', email: 'cert@test.com' },
        },
      ]

      ;(prisma.certificate.findMany as jest.Mock).mockResolvedValue(mockCerts)
      ;(prisma.user.findUnique as jest.Mock).mockResolvedValue({
        id: 'user-cert-1',
        username: 'Cert Student',
        email: 'cert@learninghub.test',
        deletedAt: null,
      })
      ;(prisma.certificate.findFirst as jest.Mock).mockResolvedValue(null)
      ;(prisma.testResult.findFirst as jest.Mock).mockResolvedValue({
        id: 'tr-1',
        percentage: 92,
        test: { title: 'System Design Architecture' },
      })
      ;(prisma.certificate.create as jest.Mock).mockImplementation(async ({ data }: any) => ({
        id: 'new-cert-id',
        ...data,
        issuedAt: new Date(),
        expiresAt: null,
        isRevoked: false,
      }))
    })
    it('should return initial certificates for user', async () => {
      const certs = await certificateService.getUserCertificates('user-cert-1')
      expect(Array.isArray(certs)).toBe(true)
      expect(certs.length).toBe(2)
      expect(certs[0].certificate_code).toContain('LH-CERT-2026')
    })

    it('should generate new certificate for completed course', async () => {
      const newCert = await certificateService.generateCertificate(
        'user-cert-1',
        'crs-system-design'
      )
      expect(newCert).toBeDefined()
      expect(newCert.course.id).toBe('crs-system-design')
      expect(newCert.certificate_code).toMatch(/^LH-CERT-/)
      expect(newCert.is_revoked).toBe(false)
    })

    it('should verify certificate signature and validity', async () => {
      const verification = await certificateService.verifyCertificate('LH-CERT-2026-TEST')
      expect(verification.valid).toBe(true)
      expect(verification.certificate_code).toBe('LH-CERT-2026-TEST')
      expect(verification.verified_by).toContain('LearningHub')
    })
  })
})
