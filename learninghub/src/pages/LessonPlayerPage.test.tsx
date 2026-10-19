import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor, fireEvent } from '../test/test-utils'
import LessonPlayerPage from './LessonPlayerPage'
import { courseService } from '../services/courseService'
import { Routes, Route } from 'react-router-dom'

vi.mock('../services/courseService', () => ({
  courseService: {
    getCourse: vi.fn(),
    updateProgress: vi.fn().mockResolvedValue({ status: 'success' }),
  },
  getFallbackCourse: vi.fn((id: string) => ({
    id,
    title: 'Distributed Systems & Cloud Architecture',
    description: 'Learn modern scalable system design and high-throughput microservices.',
    short_description: 'Cloud architecture masterclass.',
    thumbnail: null,
    trailer_video: null,
    instructor: {
      id: 'inst-1',
      display_name: 'Dr. Sarah Lin',
      avatar: null,
      bio: 'Principal Distributed Systems Engineer',
      total_students: 12000,
      total_courses: 4,
    },
    price: 49,
    original_price: 99,
    rating: 4.9,
    review_count: 850,
    student_count: 12000,
    duration: '18 hours',
    level: 'advanced',
    language: 'English',
    last_updated: '2026',
    certificate: true,
    sections: [
      {
        id: 'sec-1',
        title: 'Core Fundamentals',
        order: 1,
        lessons: [
          {
            id: 'les-1',
            title: 'Distributed Consensus & Raft Protocol',
            duration: '14:20',
            video_url: 'https://example.com/raft.mp4',
            order: 1,
            is_free: true,
            completed: false,
          },
          {
            id: 'les-2',
            title: 'Event Sourcing & CQRS in Practice',
            duration: '22:10',
            video_url: 'https://example.com/cqrs.mp4',
            order: 2,
            is_free: false,
            completed: false,
          },
        ],
      },
    ],
    learning_outcomes: ['Understand Raft protocol', 'Implement event sourcing'],
    prerequisites: ['Basic distributed systems knowledge'],
    tags: ['System Design', 'Cloud', 'Architecture'],
    is_enrolled: true,
    progress_percent: 0,
  })),
}))

const mockCourse = {
  id: 'course-sys-101',
  title: 'Distributed Systems & Cloud Architecture',
  description: 'Learn modern scalable system design and high-throughput microservices.',
  sections: [
    {
      id: 'sec-1',
      title: 'Core Fundamentals',
      order: 1,
      lessons: [
        {
          id: 'les-1',
          title: 'Distributed Consensus & Raft Protocol',
          duration: '14:20',
          video_url: 'https://example.com/raft.mp4',
          order: 1,
          is_free: true,
          completed: false,
        },
        {
          id: 'les-2',
          title: 'Event Sourcing & CQRS in Practice',
          duration: '22:10',
          video_url: 'https://example.com/cqrs.mp4',
          order: 2,
          is_free: false,
          completed: false,
        },
      ],
    },
  ],
}

describe('LessonPlayerPage Component', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    localStorage.clear()
    vi.mocked(courseService.getCourse).mockResolvedValue({
      status: 'success',
      data: mockCourse as any,
    })
  })

  const renderWithRoute = (initialPath = '/lesson-player/course-sys-101/les-1') => {
    return render(
      <Routes>
        <Route path="/lesson-player/:courseId/:lessonId?" element={<LessonPlayerPage />} />
      </Routes>,
      { route: initialPath }
    )
  }

  it('renders video player, lesson title, and curriculum module list', async () => {
    renderWithRoute()

    await waitFor(() => {
      expect(screen.getByText('Distributed Systems & Cloud Architecture')).toBeInTheDocument()
      expect(
        screen.getAllByText('Distributed Consensus & Raft Protocol').length
      ).toBeGreaterThanOrEqual(1)
    })

    // Curriculum section
    expect(screen.getByText('Curriculum')).toBeInTheDocument()
    expect(screen.getByText(/Module 1: Core Fundamentals/i)).toBeInTheDocument()
  })

  it('navigates to next lesson when Next button is clicked', async () => {
    renderWithRoute('/lesson-player/course-sys-101/les-1')

    await waitFor(() => {
      expect(screen.getByText('Next')).toBeInTheDocument()
    })

    const nextBtn = screen.getByText('Next')
    fireEvent.click(nextBtn)

    await waitFor(() => {
      expect(
        screen.getAllByText('Event Sourcing & CQRS in Practice').length
      ).toBeGreaterThanOrEqual(1)
    })
  })

  it('disables previous button on first lesson', async () => {
    renderWithRoute('/lesson-player/course-sys-101/les-1')

    await waitFor(() => {
      const prevBtn = screen.getByText('Previous').closest('button')
      expect(prevBtn).toBeDisabled()
    })
  })

  it('toggles lesson completion and marks completion status', async () => {
    renderWithRoute('/lesson-player/course-sys-101/les-1')

    await waitFor(() => {
      expect(screen.getByText('Mark as Complete')).toBeInTheDocument()
    })

    const completeBtn = screen.getByText('Mark as Complete')
    fireEvent.click(completeBtn)

    await waitFor(() => {
      expect(screen.getByText('Completed')).toBeInTheDocument()
      expect(courseService.updateProgress).toHaveBeenCalledWith('course-sys-101', 50)
    })
  })

  it('switches between Overview, Code Sandbox, Notes, and Q&A tabs', async () => {
    renderWithRoute()

    await waitFor(() => {
      expect(screen.getByText('Overview')).toBeInTheDocument()
    })

    // Switch to Notes
    fireEvent.click(screen.getByText('Notes'))
    expect(screen.getByPlaceholderText(/Type your notes for this lesson.../i)).toBeInTheDocument()

    // Switch to Code
    fireEvent.click(screen.getByText('Code Sandbox'))
    expect(screen.getByText('Run Code')).toBeInTheDocument()

    // Switch to Q&A
    fireEvent.click(screen.getByText('Q&A'))
    expect(screen.getByText(/Community Discussion/i)).toBeInTheDocument()
  })

  it('auto-saves notes to localStorage on input change', async () => {
    renderWithRoute()

    await waitFor(() => {
      expect(screen.getByText('Notes')).toBeInTheDocument()
    })

    fireEvent.click(screen.getByText('Notes'))
    const notesInput = screen.getByPlaceholderText(/Type your notes for this lesson.../i)

    fireEvent.change(notesInput, {
      target: { value: 'Raft uses leader election with randomized timeouts.' },
    })

    await waitFor(
      () => {
        expect(localStorage.getItem('notes_course-sys-101_les-1')).toBe(
          'Raft uses leader election with randomized timeouts.'
        )
      },
      { timeout: 1000 }
    )
  })

  it('executes JavaScript scratchpad code and renders output', async () => {
    renderWithRoute()

    await waitFor(() => {
      expect(screen.getByText('Code Sandbox')).toBeInTheDocument()
    })

    fireEvent.click(screen.getByText('Code Sandbox'))
    const runBtn = screen.getByText('Run Code')
    fireEvent.click(runBtn)

    await waitFor(() => {
      expect(screen.getByText('Output')).toBeInTheDocument()
      expect(screen.getByText(/Hello from Lesson Player!/i)).toBeInTheDocument()
    })
  })

  it('toggles curriculum sidebar open and closed', async () => {
    renderWithRoute()

    await waitFor(() => {
      expect(screen.getByLabelText('Toggle Curriculum')).toBeInTheDocument()
    })

    const toggleBtn = screen.getByLabelText('Toggle Curriculum')
    expect(screen.getByText('Curriculum')).toBeInTheDocument()

    fireEvent.click(toggleBtn)
    await waitFor(() => {
      expect(toggleBtn.querySelector('.lucide-menu')).toBeInTheDocument()
    })

    fireEvent.click(toggleBtn)
    await waitFor(() => {
      expect(toggleBtn.querySelector('.lucide-x')).toBeInTheDocument()
    })
  })
})
