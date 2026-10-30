import { Request, Response } from 'express'
import { mockDeep, DeepMockProxy } from 'jest-mock-extended'
import { examContentController } from '../../src/controllers/examContentController'
import { cacheService } from '../../src/services/CacheService'

jest.mock('../../src/services/CacheService', () => ({
  cacheService: {
    get: jest.fn(),
    set: jest.fn().mockResolvedValue(true),
    delete: jest.fn().mockResolvedValue(true),
  },
}))

describe('ExamContentController (Milestone 37 Curriculum & Taxonomy)', () => {
  let mockReq: DeepMockProxy<Request>
  let mockRes: DeepMockProxy<Response>
  let jsonMock: jest.Mock
  let statusMock: jest.Mock

  beforeEach(() => {
    jsonMock = jest.fn().mockReturnThis()
    statusMock = jest.fn().mockReturnValue({ json: jsonMock })
    mockReq = mockDeep<Request>()
    mockRes = mockDeep<Response>()
    mockRes.status = statusMock as any
    mockRes.json = jsonMock as any
    mockReq.query = {}
    mockReq.params = {}
    mockReq.body = {}
    mockReq.headers = {}
    jest.clearAllMocks()
  })

  describe('getExamCurriculum', () => {
    it('returns curriculum structure for an exam from curated service', async () => {
      mockReq.params.examId = 'jee-advanced'
      ;(cacheService.get as jest.Mock).mockResolvedValue(null)

      await examContentController.getExamCurriculum(mockReq as Request, mockRes as Response)

      expect(statusMock).toHaveBeenCalledWith(200)
      const responseData = jsonMock.mock.calls[0][0]
      expect(responseData.status).toBe('success')
      expect(Array.isArray(responseData.data)).toBe(true)
      expect(responseData.data.length).toBeGreaterThan(0)

      // Curated subjects for JEE Advanced must include Advanced Physics, Advanced Chemistry, Advanced Mathematics
      const subjectNames = responseData.data.map((s: any) => s.name)
      expect(subjectNames).toContain('Advanced Physics')
      expect(subjectNames).toContain('Advanced Mathematics')

      // Cache set should be called with 3600 TTL
      expect(cacheService.set).toHaveBeenCalledWith(
        'exam-content:curriculum:jee-advanced',
        expect.any(Array),
        3600
      )
    })

    it('returns cached curriculum when present in Redis', async () => {
      mockReq.params.examId = 'gre-general'
      const cachedCurriculum = [
        { id: 'sub-gre-quant', name: 'Quantitative Reasoning', topics: [] },
      ]
      ;(cacheService.get as jest.Mock).mockResolvedValue(cachedCurriculum)

      await examContentController.getExamCurriculum(mockReq as Request, mockRes as Response)

      expect(statusMock).toHaveBeenCalledWith(200)
      const responseData = jsonMock.mock.calls[0][0]
      expect(responseData.data).toEqual(cachedCurriculum)
      expect(cacheService.set).not.toHaveBeenCalled()
    })

    it('returns 400 when examId is missing or invalid', async () => {
      mockReq.params.examId = '' as any

      await examContentController.getExamCurriculum(mockReq as Request, mockRes as Response)

      expect(statusMock).toHaveBeenCalledWith(400)
      const responseData = jsonMock.mock.calls[0][0]
      expect(responseData.status).toBe('error')
      expect(responseData.message).toMatch(/examId is required/i)
    })
  })

  describe('getSubjects', () => {
    it('returns 200 with subjects for exam', async () => {
      mockReq.params.examId = 'usmle-step1'

      await examContentController.getSubjects(mockReq as Request, mockRes as Response)

      expect(statusMock).toHaveBeenCalledWith(200)
      const responseData = jsonMock.mock.calls[0][0]
      expect(responseData.status).toBe('success')
      const subjectNames = responseData.data.map((s: any) => s.name)
      expect(subjectNames).toContain('Foundational Biomedical Sciences')
      expect(subjectNames).toContain('Organ Systems & Clinical Pathophysiology')
    })
  })

  describe('getCountries', () => {
    it('returns countries list and caches in Redis', async () => {
      ;(cacheService.get as jest.Mock).mockResolvedValue(null)

      await examContentController.getCountries(mockReq as Request, mockRes as Response)

      expect(statusMock).toHaveBeenCalledWith(200)
      const responseData = jsonMock.mock.calls[0][0]
      expect(responseData.status).toBe('success')
      const countryCodes = responseData.data.map((c: any) => c.code)
      expect(countryCodes).toContain('IN')
      expect(countryCodes).toContain('US')
      expect(countryCodes).toContain('GLOBAL')
    })
  })

  describe('getGeoCountry', () => {
    it('detects country code from Cloudflare header when present', async () => {
      mockReq.headers['cf-ipcountry'] = 'US'

      await examContentController.getGeoCountry(mockReq as Request, mockRes as Response)

      expect(statusMock).toHaveBeenCalledWith(200)
      const responseData = jsonMock.mock.calls[0][0]
      expect(responseData.data.countryCode).toBe('US')
      expect(responseData.data.method).toBe('cloudflare')
    })

    it('falls back to default country when headers are absent', async () => {
      await examContentController.getGeoCountry(mockReq as Request, mockRes as Response)

      expect(statusMock).toHaveBeenCalledWith(200)
      const responseData = jsonMock.mock.calls[0][0]
      expect(responseData.data.countryCode).toBe('IN')
      expect(responseData.data.method).toBe('fallback')
    })
  })
})
