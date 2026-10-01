import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '../test/test-utils'
import SearchPage from './SearchPage'
import { courseService } from '../services/courseService'

vi.mock('../services/courseService', () => ({
  courseService: {
    getCourses: vi.fn(),
  },
}))

vi.mock('../services/aiTutorService', () => ({
  aiTutorService: {
    explainConcept: vi.fn(),
  },
}))

const mockCoursesList = [
  {
    id: 'course-1',
    title: 'Data Structures in Python',
    description: 'Learn arrays, trees, heaps, graphs.',
    level: 'Beginner',
    duration: '10h',
    studentsCount: 250,
    tags: ['Python', 'DSA'],
  },
]

describe('SearchPage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(courseService.getCourses).mockResolvedValue({
      status: 'success',
      data: mockCoursesList as any,
    })
  })

  it('renders global search header and input', () => {
    render(<SearchPage />)
    expect(screen.getByText('Global Search')).toBeInTheDocument()
    const searchInput = screen.getByLabelText(/search courses/i)
    expect(searchInput).toBeInTheDocument()
  })

  it('updates query input when user types', () => {
    render(<SearchPage />)
    const searchInput = screen.getByLabelText(/search courses/i)
    fireEvent.change(searchInput, { target: { value: 'Python' } })
    expect(searchInput).toHaveValue('Python')
  })

  it('toggles filters section', () => {
    render(<SearchPage />)
    const filterBtn = screen.getByRole('button', { name: /filters/i })
    expect(filterBtn).toBeInTheDocument()

    fireEvent.click(filterBtn)
    expect(screen.getByText(/Difficulty/i)).toBeInTheDocument()
    expect(screen.getByText(/Phase/i)).toBeInTheDocument()
  })
})
