import { Request, Response } from 'express'
import {
  generateResume,
  verifyResume,
  exportATSPlainText,
  exportJSONResume,
  exportLatexResume,
  importLinkedIn,
  anchorResumeToIpfs,
} from '../../controllers/resumeController'
import { resumeEngineService } from '../../services/ResumeEngineService'

describe('ResumeController (Milestone 12 Anti-Gravity Resume API)', () => {
  let mockRequest: Partial<Request>
  let mockResponse: Partial<Response>
  let responseData: any
  let responseStatus: number
  let responseHeaders: Record<string, string>

  beforeEach(() => {
    responseData = null
    responseStatus = 200
    responseHeaders = {}

    mockResponse = {
      status: jest.fn().mockImplementation((code: number) => {
        responseStatus = code
        return mockResponse
      }),
      json: jest.fn().mockImplementation((data: any) => {
        responseData = data
        return mockResponse
      }),
      send: jest.fn().mockImplementation((body: any) => {
        responseData = body
        return mockResponse
      }),
      setHeader: jest.fn().mockImplementation((key: string, value: string) => {
        responseHeaders[key] = value
        return mockResponse
      }),
    }
  })

  describe('generateResume', () => {
    it('generates an ATS-tailored resume with default role', async () => {
      mockRequest = {
        user: { userId: 'student-dev-123' } as any,
        query: {},
      }

      await generateResume(mockRequest as Request, mockResponse as Response, jest.fn())

      expect(mockResponse.status).toHaveBeenCalledWith(200)
      expect(responseData.status).toBe('success')
      expect(responseData.data.resume).toBeDefined()
      expect(responseData.data.resume.targetRole).toBe('FULL_STACK_LEAD')
      expect(responseData.data.resume.atsScoring.overallScore).toBeGreaterThanOrEqual(80)
    })

    it('generates a resume tailored for SYSTEMS_ARCHITECT with custom profile query params', async () => {
      mockRequest = {
        user: { userId: 'architect-456' } as any,
        query: {
          targetRole: 'SYSTEMS_ARCHITECT',
          fullName: 'Alice Walker',
          email: 'alice@distributed.io',
          headline: 'Principal Distributed Systems Architect',
          location: 'San Francisco, CA',
        },
      }

      await generateResume(mockRequest as Request, mockResponse as Response, jest.fn())

      expect(responseData.status).toBe('success')
      expect(responseData.data.resume.profile.fullName).toBe('Alice Walker')
      expect(responseData.data.resume.profile.email).toBe('alice@distributed.io')
      expect(responseData.data.resume.targetRole).toBe('SYSTEMS_ARCHITECT')
    })
  })

  describe('verifyResume', () => {
    it('verifies valid digest and signature', async () => {
      const generated = resumeEngineService.generateResume({
        userId: 'verified-user',
        targetRole: 'ALGORITHM_ENGINEER',
      })

      mockRequest = {
        body: {
          digest: generated.cryptographicProof.canonicalDigestSha256,
          signature: generated.cryptographicProof.signatureHmac,
        },
      }

      await verifyResume(mockRequest as Request, mockResponse as Response, jest.fn())

      expect(responseData.status).toBe('success')
      expect(responseData.data.isValid).toBe(true)
      expect(responseData.data.statusMessage).toContain('Tamper-Proof Verification Successful')
    })

    it('rejects missing digest or signature with 400 validation error', async () => {
      mockRequest = {
        body: { digest: 'some-digest' }, // missing signature
      }

      await verifyResume(mockRequest as Request, mockResponse as Response, jest.fn())

      expect(mockResponse.status).toHaveBeenCalledWith(400)
      expect(responseData.status).toBe('error')
    })
  })

  describe('exportATSPlainText', () => {
    it('returns raw text/plain stream with Content-Disposition header', async () => {
      mockRequest = {
        user: { userId: 'export-user' } as any,
        query: { targetRole: 'SYSTEMS_ARCHITECT' },
      }

      await exportATSPlainText(mockRequest as Request, mockResponse as Response, jest.fn())

      expect(mockResponse.status).toHaveBeenCalledWith(200)
      expect(responseHeaders['Content-Type']).toContain('text/plain')
      expect(responseHeaders['Content-Disposition']).toContain('systems_architect_ats.txt')
      expect(typeof responseData).toBe('string')
      expect(responseData).toContain('CORE TECHNICAL SKILLS')
    })
  })

  describe('exportJSONResume', () => {
    it('returns schema.org compliant JSON resume', async () => {
      mockRequest = {
        user: { userId: 'export-user' } as any,
        query: { targetRole: 'ML_DATA_ENGINEER' },
      }

      await exportJSONResume(mockRequest as Request, mockResponse as Response, jest.fn())

      expect(mockResponse.status).toHaveBeenCalledWith(200)
      expect(responseHeaders['Content-Type']).toContain('application/json')
      expect(responseData['$schema']).toContain('jsonresume')
      expect(responseData.basics.name).toBeDefined()
    })
  })

  describe('exportLatexResume', () => {
    it('returns compilable LaTeX source code', async () => {
      mockRequest = {
        user: { userId: 'latex-user' } as any,
        query: { targetRole: 'FULL_STACK_LEAD' },
      }

      await exportLatexResume(mockRequest as Request, mockResponse as Response, jest.fn())

      expect(mockResponse.status).toHaveBeenCalledWith(200)
      expect(responseHeaders['Content-Type']).toContain('text/x-tex')
      expect(responseData).toContain('\\documentclass')
      expect(responseData).toContain('\\begin{document}')
      expect(responseData).toContain('\\end{document}')
    })
  })

  describe('importLinkedIn', () => {
    it('parses raw text and extracts technical skills', async () => {
      mockRequest = {
        body: {
          rawText: `Jane Doe
Staff Engineer at TechCorp
jane.doe@example.com
https://linkedin.com/in/janedoe
Experienced in TypeScript, Python, Kubernetes, and Distributed Systems.`,
        },
      }

      await importLinkedIn(mockRequest as Request, mockResponse as Response, jest.fn())

      expect(responseData.status).toBe('success')
      expect(responseData.data.importedSkills.length).toBeGreaterThan(0)
      expect(responseData.data.importedSkills).toContain('Kubernetes')
    })

    it('rejects empty payload with 400 validation error', async () => {
      mockRequest = {
        body: {},
      }

      await importLinkedIn(mockRequest as Request, mockResponse as Response, jest.fn())

      expect(mockResponse.status).toHaveBeenCalledWith(400)
      expect(responseData.status).toBe('error')
    })
  })

  describe('anchorResumeToIpfs', () => {
    it('anchors resume to IPFS CIDv1 and Polygon PoS', async () => {
      mockRequest = {
        user: { userId: 'anchor-user' } as any,
        body: { targetRole: 'SYSTEMS_ARCHITECT' },
      }

      await anchorResumeToIpfs(mockRequest as Request, mockResponse as Response, jest.fn())

      expect(responseData.status).toBe('success')
      expect(responseData.data.ipfsCid).toMatch(/^bafy/)
      expect(responseData.data.polygonTxHash).toMatch(/^0x/)
      expect(responseData.data.blockNumber).toBeGreaterThan(0)
    })
  })
})
