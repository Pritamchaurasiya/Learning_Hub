import { describe, it, expect, vi, beforeEach } from 'vitest'
import { courseService } from './courseService'
import { fetchApi } from '../utils/api'

// Mock the api util
vi.mock('../utils/api', () => ({
  fetchApi: vi.fn(),
}))

describe('courseService', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('getCourses calls fetchApi with correct endpoint', async () => {
    const mockData = { status: 'success', data: [{ id: '1', title: 'Test Course' }] }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    ;(fetchApi as any).mockResolvedValue(mockData)

    const result = await courseService.getCourses({ search: 'react' })

    expect(fetchApi).toHaveBeenCalledWith('/courses?search=react')
    expect(result).toEqual(mockData)
  })

  it('getCourse calls fetchApi with correct ID', async () => {
    const mockData = { status: 'success', data: { id: '1', title: 'Test Course' } }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    ;(fetchApi as any).mockResolvedValue(mockData)

    const result = await courseService.getCourse('1')

    expect(fetchApi).toHaveBeenCalledWith('/courses/1')
    expect(result).toEqual(mockData)
  })

  it('enroll calls fetchApi with correct endpoint and method', async () => {
    const mockData = { status: 'success', message: 'Enrolled' }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    ;(fetchApi as any).mockResolvedValue(mockData)

    const result = await courseService.enroll('1')

    expect(fetchApi).toHaveBeenCalledWith('/courses/enroll', {
      method: 'POST',
      body: JSON.stringify({ courseId: '1' }),
    })
    expect(result).toEqual(mockData)
  })
})
