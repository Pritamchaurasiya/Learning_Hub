import {
  VerifiableCredentialService,
  MerkleTree,
  LEARNINGHUB_ISSUER,
} from '../../src/services/VerifiableCredentialService'
import { prisma } from '../../src/prismaClient'

jest.mock('../../src/prismaClient', () => ({
  prisma: {
    user: {
      findUnique: jest.fn(),
    },
    certificate: {
      create: jest.fn(),
      findFirst: jest.fn(),
    },
  },
}))

describe('VerifiableCredentialService — W3C DID & Verifiable Credentials', () => {
  let service: VerifiableCredentialService

  beforeEach(() => {
    jest.clearAllMocks()
    service = new VerifiableCredentialService()
    ;(prisma.user.findUnique as jest.Mock).mockResolvedValue({
      id: 'usr-w3c-test',
      username: 'shiva_coder',
      email: 'shiva@example.com',
    })
    ;(prisma.certificate.create as jest.Mock).mockResolvedValue({
      id: 'cert-1',
      code: 'LH-DID-TEST',
    })
  })

  describe('RFC 8785 Canonical JSON Serialization', () => {
    it('should serialize keys in deterministic alphabetical order', () => {
      const objA = { z: 1, a: 2, m: { y: 'bar', b: 'foo' } }
      const objB = { a: 2, m: { b: 'foo', y: 'bar' }, z: 1 }

      const canonA = service.canonicalizeJson(objA)
      const canonB = service.canonicalizeJson(objB)

      expect(canonA).toBe(canonB)
      expect(canonA).toBe('{"a":2,"m":{"b":"foo","y":"bar"},"z":1}')
    })
  })

  describe('Merkle Tree Cryptographic Invariants', () => {
    it('should construct a valid Merkle root and proof', () => {
      const items = ['cred-1', 'cred-2', 'cred-3', 'cred-4']
      const tree = new MerkleTree(items)
      const root = tree.getRoot()

      expect(root).toMatch(/^0x[a-f0-9]{64}$/)
      const proof = tree.getProof('cred-1')
      expect(Array.isArray(proof)).toBe(true)
      expect(proof.length).toBeGreaterThan(0)

      const verified = MerkleTree.verifyProof('cred-1', proof, root)
      expect(verified).toBe(true)
    })

    it('should handle odd number of elements gracefully', () => {
      const items = ['leaf-a', 'leaf-b', 'leaf-c']
      const tree = new MerkleTree(items)
      expect(tree.getRoot()).toMatch(/^0x[a-f0-9]{64}$/)
    })
  })

  describe('W3C Verifiable Credential Issuance', () => {
    it('should issue a course completion W3C Verifiable Credential', async () => {
      const vc = await service.issueCredential({
        userId: 'usr-w3c-test',
        achievementType: 'COURSE_COMPLETION',
        courseOrExamId: 'crs-dsa-mastery',
        title: 'Advanced DSA & Graph Theory Mastery',
        score: 98,
        totalQuestions: 50,
      })

      expect(vc).toBeDefined()
      expect(vc['@context']).toContain('https://www.w3.org/2018/credentials/v1')
      expect(vc.id).toMatch(/^urn:uuid:[a-f0-9-]+$/)
      expect(vc.type).toContain('VerifiableCredential')
      expect(vc.issuer.id).toBe(LEARNINGHUB_ISSUER.id)
      expect(vc.credentialSubject.studentName).toBe('shiva_coder')
      expect(vc.credentialSubject.achievementType).toBe('COURSE_COMPLETION')
      expect(vc.credentialSubject.achievementTitle).toBe('Advanced DSA & Graph Theory Mastery')
      expect(vc.credentialSubject.score).toBe(98)
      expect(vc.credentialSubject.studentEmailHash).toMatch(/^[a-f0-9]{64}$/)
      expect(vc.proof.type).toBe('HmacSha256Signature2026')
      expect(vc.proof.proofValue).toBeDefined()
      expect(vc.proof.ipfsCid).toMatch(/^bafybeih/)
      expect(vc.proof.anchor.network).toBe('Polygon PoS')
    })

    it('should issue a CAT Percentile W3C Verifiable Credential with high precision percentile', async () => {
      const vc = await service.issueCredential({
        userId: 'usr-w3c-test',
        achievementType: 'CAT_PERCENTILE',
        courseOrExamId: 'exam-cat-2026',
        title: 'CAT 2026 Quantitative Aptitude Mock All-India',
        percentileRank: 99.85,
        score: 102,
        totalQuestions: 66,
      })

      expect(vc.credentialSubject.achievementType).toBe('CAT_PERCENTILE')
      expect(vc.credentialSubject.percentileRank).toBe(99.85)
      expect(vc.credentialSubject.criteria.narrative).toContain('99.85')
    })
  })

  describe('Cryptographic Verification Engine', () => {
    it('should verify genuine issued credential as 100% valid', async () => {
      const vc = await service.issueCredential({
        userId: 'usr-w3c-test',
        achievementType: 'COURSE_COMPLETION',
        courseOrExamId: 'crs-system-design',
        title: 'Distributed Systems & Microservices Architecture',
      })

      const result = await service.verifyCredential(vc)

      expect(result.valid).toBe(true)
      expect(result.auditReport.signatureValid).toBe(true)
      expect(result.auditReport.issuerTrusted).toBe(true)
      expect(result.auditReport.revocationClean).toBe(true)
      expect(result.auditReport.notExpired).toBe(true)
      expect(result.auditReport.ipfsDigestMatches).toBe(true)
    })

    it('should detect tampering if claims are altered', async () => {
      const vc = await service.issueCredential({
        userId: 'usr-w3c-test',
        achievementType: 'CAT_PERCENTILE',
        courseOrExamId: 'exam-cat-tamper',
        title: 'CAT 2026 Exam',
        percentileRank: 85.5,
      })

      // Adversary attempts to forge 99.99 percentile
      const tamperedVc = JSON.parse(JSON.stringify(vc))
      tamperedVc.credentialSubject.percentileRank = 99.99

      const result = await service.verifyCredential(tamperedVc)

      expect(result.valid).toBe(false)
      expect(result.auditReport.signatureValid).toBe(false)
    })

    it('should detect revocation when credential has been revoked', async () => {
      const vc = await service.issueCredential({
        userId: 'usr-w3c-test',
        achievementType: 'COURSE_COMPLETION',
        courseOrExamId: 'crs-revocation-test',
        title: 'Security Testing Certification',
      })

      await service.revokeCredential(vc.id, 'Plagiarism detected during post-exam audit')

      const result = await service.verifyCredential(vc.id)

      expect(result.valid).toBe(false)
      expect(result.auditReport.revocationClean).toBe(false)
    })

    it('should return invalid for malformed or unparseable payload', async () => {
      const result = await service.verifyCredential('invalid-non-existent-id')
      expect(result.valid).toBe(false)
      expect(result.auditReport.signatureValid).toBe(false)
    })
  })
})
