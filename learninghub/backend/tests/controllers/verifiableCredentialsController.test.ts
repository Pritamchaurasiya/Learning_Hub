import { Request, Response } from 'express'
import {
  issueCredential,
  verifyCredential,
  getMyCredentials,
  getCredentialById,
  getRevocationRegistry,
  revokeCredential,
} from '../../src/controllers/verifiableCredentialsController'
import { verifiableCredentialService } from '../../src/services/VerifiableCredentialService'

jest.mock('../../src/services/VerifiableCredentialService')

describe('VerifiableCredentialsController', () => {
  let mockReq: Partial<Request>
  let mockRes: Partial<Response>
  let jsonMock: jest.Mock
  let statusMock: jest.Mock

  beforeEach(() => {
    jsonMock = jest.fn()
    statusMock = jest.fn().mockReturnValue({ json: jsonMock })
    mockRes = {
      json: jsonMock,
      status: statusMock,
    }
    jest.clearAllMocks()
  })

  describe('issueCredential', () => {
    it('should return 401 if user is not authenticated', async () => {
      mockReq = { user: undefined, body: {} }

      await issueCredential(mockReq as Request, mockRes as Response, jest.fn())

      expect(statusMock).toHaveBeenCalledWith(401)
    })

    it('should return 400 if title is missing', async () => {
      mockReq = {
        user: { userId: 'usr-1', email: 'test@example.com', role: 'STUDENT' },
        body: { courseOrExamId: 'crs-1' },
      }

      await issueCredential(mockReq as Request, mockRes as Response, jest.fn())

      expect(statusMock).toHaveBeenCalledWith(400)
    })

    it('should issue credential successfully and return 201', async () => {
      mockReq = {
        user: { userId: 'usr-1', email: 'test@example.com', role: 'STUDENT' },
        body: {
          achievementType: 'COURSE_COMPLETION',
          courseOrExamId: 'crs-101',
          title: 'Full Stack React & Node',
        },
      }

      const mockVc = {
        id: 'urn:uuid:test-123',
        credentialSubject: { studentName: 'Student' },
      }
      ;(verifiableCredentialService.issueCredential as jest.Mock).mockResolvedValue(mockVc)

      await issueCredential(mockReq as Request, mockRes as Response, jest.fn())

      expect(statusMock).toHaveBeenCalledWith(201)
      expect(jsonMock).toHaveBeenCalledWith(
        expect.objectContaining({
          status: 'success',
          data: mockVc,
        })
      )
    })
  })

  describe('verifyCredential', () => {
    it('should verify credential and return 200', async () => {
      mockReq = {
        params: { id: 'urn:uuid:test-123' },
        body: {},
      }

      const mockResult = {
        valid: true,
        credentialId: 'urn:uuid:test-123',
        auditReport: { signatureValid: true },
      }
      ;(verifiableCredentialService.verifyCredential as jest.Mock).mockResolvedValue(mockResult)

      await verifyCredential(mockReq as Request, mockRes as Response, jest.fn())

      expect(statusMock).toHaveBeenCalledWith(200)
      expect(jsonMock).toHaveBeenCalledWith(
        expect.objectContaining({
          status: 'success',
          data: mockResult,
        })
      )
    })
  })

  describe('getMyCredentials', () => {
    it('should return user credentials', async () => {
      mockReq = {
        user: { userId: 'usr-1', email: 'test@example.com', role: 'STUDENT' },
      }

      const mockList = [{ id: 'urn:uuid:1' }]
      ;(verifiableCredentialService.getUserCredentials as jest.Mock).mockResolvedValue(mockList)

      await getMyCredentials(mockReq as Request, mockRes as Response, jest.fn())

      expect(statusMock).toHaveBeenCalledWith(200)
      expect(jsonMock).toHaveBeenCalledWith(
        expect.objectContaining({
          status: 'success',
          data: { credentials: mockList },
        })
      )
    })
  })

  describe('getRevocationRegistry', () => {
    it('should return revocation registry summary', async () => {
      mockReq = {}

      const mockRegistry = [{ id: 'urn:uuid:1', reason: 'Plagiarism', at: '2026-09-01' }]
      ;(verifiableCredentialService.getRevocationRegistry as jest.Mock).mockResolvedValue(mockRegistry)

      await getRevocationRegistry(mockReq as Request, mockRes as Response, jest.fn())

      expect(statusMock).toHaveBeenCalledWith(200)
      expect(jsonMock).toHaveBeenCalledWith(
        expect.objectContaining({
          status: 'success',
          data: { registry: mockRegistry },
        })
      )
    })
  })

  describe('revokeCredential', () => {
    it('should revoke credential and return 200', async () => {
      mockReq = {
        user: { userId: 'usr-admin', email: 'admin@example.com', role: 'ADMIN' },
        params: { id: 'urn:uuid:revoked-1' },
        body: { reason: 'Academic integrity violation' },
      }

      await revokeCredential(mockReq as Request, mockRes as Response, jest.fn())

      expect(verifiableCredentialService.revokeCredential).toHaveBeenCalledWith(
        'urn:uuid:revoked-1',
        'Academic integrity violation'
      )
      expect(statusMock).toHaveBeenCalledWith(200)
    })
  })
})
