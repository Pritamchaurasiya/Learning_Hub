import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor, fireEvent } from '../test/test-utils'
import CourseDetailsPage from './CourseDetailsPage'
import { courseService } from '../services/courseService'
import { Routes, Route } from 'react-router-dom'

vi.mock('../services/courseService', () => ({
  courseService: {
    getCourse: vi.fn(),
  },
  getFallbackCourse: vi.fn((id: string) => ({
    id,
    title: 'Fallback Course',
    description: 'Fallback Description',
    short_description: 'Short Description',
    instructor: 'Instructor Name',
    price: 0,
    original_price: 0,
    rating: 4.8,
    review_count: 50,
    student_count: 500,
    duration: '10 hours',
    level: 'intermediate',
    language: 'English',
    last_updated: '2026',
    certificate: true,
    sections: [{ id: 'sec-fb', title: 'Fallback Section', lessons: [] }],
    learning_outcomes: [],
    prerequisites: [],
    tags: [],
    is_enrolled: false,
    progress_percent: 0,
  })),
}))

const mockCourse = {
  id: 'course-123',
  title: 'Full-Stack TypeScript & React Mastery',
  description: 'Master modern frontend and backend development with production best practices.',
  instructor: 'Alex Mercer',
  level: 'Intermediate',
  duration: '24 hours',
  rating: 4.9,
  studentsCount: 1420,
  tags: ['React', 'TypeScript', 'Node.js'],
  isEnrolled: false,
  sections: [
    {
      id: 'sec-1',
      title: 'Module 1: Foundations',
      lessons: [
        { id: 'les-1', title: 'Course Overview & Roadmap', duration: '12m', isFree: true },
        { id: 'les-2', title: 'TypeScript Deep Dive', duration: '28m', isFree: false },
      ],
    },
  ],
}

describe('CourseDetailsPage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders loading skeleton initially', () => {
    vi.mocked(courseService.getCourse).mockReturnValue(new Promise(() => {}))
    render(
      <Routes>
        <Route path="/courses/:courseId" element={<CourseDetailsPage />} />
      </Routes>,
      { route: '/courses/course-123' }
    )
    expect(document.querySelector('.animate-pulse')).toBeInTheDocument()
  })

  it('renders course information and syllabus after loading', async () => {
    vi.mocked(courseService.getCourse).mockResolvedValue({
      status: 'success',
      data: mockCourse as any,
    })

    render(
      <Routes>
        <Route path="/courses/:courseId" element={<CourseDetailsPage />} />
      </Routes>,
      { route: '/courses/course-123' }
    )

    await waitFor(() => {
      expect(screen.getByText('Full-Stack TypeScript & React Mastery')).toBeInTheDocument()
      expect(screen.getByText(/Alex Mercer/i)).toBeInTheDocument()
      expect(screen.getByText(/Module 1: Foundations/i)).toBeInTheDocument()
      expect(screen.getByText('Enroll Now')).toBeInTheDocument()
    })
  })

  it('toggles bookmark save button state', async () => {
    vi.mocked(courseService.getCourse).mockResolvedValue({
      status: 'success',
      data: mockCourse as any,
    })

    render(
      <Routes>
        <Route path="/courses/:courseId" element={<CourseDetailsPage />} />
      </Routes>,
      { route: '/courses/course-123' }
    )

    await waitFor(() => {
      expect(screen.getByText('Full-Stack TypeScript & React Mastery')).toBeInTheDocument()
    })

    const saveBtn = screen.getByRole('button', { name: /Save/i })
    expect(saveBtn).toBeInTheDocument()
    fireEvent.click(saveBtn)
    expect(screen.getByRole('button', { name: /Saved/i })).toBeInTheDocument()
  })
})
