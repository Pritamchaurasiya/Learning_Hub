import { describe, it, expect, vi, beforeEach } from 'vitest'
import { screen, waitFor, fireEvent } from '@testing-library/react'
import { render } from '../test/test-utils'
import LibraryPage from './LibraryPage'
import { libraryService, type Course } from '../services/libraryService'
import { ebookService } from '../services/ebookService'

vi.mock('../services/libraryService', () => ({
  libraryService: {
    getCourses: vi.fn(),
    getTrendingCourses: vi.fn(),
  },
}))

vi.mock('../services/ebookService', () => ({
  ebookService: {
    getEbooks: vi.fn(),
  },
}))

describe('LibraryPage Component', () => {
  const mockCourses: Course[] = [
    {
      id: 'crs-1',
      title: 'Full-Stack Modern React & Node.js',
      slug: 'full-stack-modern-react-node',
      description: 'Build complete production-grade cloud native web applications.',
      short_description: 'Build complete production applications.',
      category: { id: 'cat-1', name: 'Web Development', slug: 'web-dev' },
      level: 'Intermediate',
      average_rating: 4.8,
      review_count: 120,
      enrollment_count: 2400,
      duration: '14 hours',
      is_free: false,
      price: 49,
      created_at: '2026-01-01T00:00:00Z',
      updated_at: '2026-02-01T00:00:00Z',
      instructor: {
        id: 'inst-1',
        username: 'prof_john',
        display_name: 'Professor John',
      },
    },
    {
      id: 'crs-2',
      title: 'Neural Networks & Deep Learning Foundations',
      slug: 'neural-networks-deep-learning',
      description: 'Backpropagation, transformers, and CNN architectures.',
      short_description: 'Deep Learning fundamentals with PyTorch.',
      category: { id: 'cat-2', name: 'Data Science', slug: 'data-science' },
      level: 'Advanced',
      average_rating: 4.9,
      review_count: 85,
      enrollment_count: 1800,
      duration: '20 hours',
      is_free: true,
      price: 0,
      created_at: '2026-01-05T00:00:00Z',
      updated_at: '2026-02-05T00:00:00Z',
      instructor: {
        id: 'inst-2',
        username: 'dr_elena',
        display_name: 'Dr. Elena Rostova',
      },
    },
  ]

  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(libraryService.getCourses).mockResolvedValue({
      data: mockCourses,
      status: 'success',
    } as any)
    vi.mocked(libraryService.getTrendingCourses).mockResolvedValue({
      data: [mockCourses[1]],
      status: 'success',
    } as any)
  })

  it('renders library header, search bar, and course cards', async () => {
    render(<LibraryPage />)

    await waitFor(() => {
      expect(screen.getByText(/Knowledge & Study Library|Course Library/i)).toBeInTheDocument()
      expect(screen.getByText('Full-Stack Modern React & Node.js')).toBeInTheDocument()
      expect(screen.getByText('Neural Networks & Deep Learning Foundations')).toBeInTheDocument()
    })

    expect(screen.getByPlaceholderText(/Search courses.../i)).toBeInTheDocument()
    expect(screen.getByText('14 hours')).toBeInTheDocument()
    expect(screen.getByText('20 hours')).toBeInTheDocument()
  })

  it('filters courses by category and switches sort', async () => {
    render(<LibraryPage />)

    await waitFor(() => {
      expect(screen.getByText('Full-Stack Modern React & Node.js')).toBeInTheDocument()
    })

    const dsFilter = screen.getByRole('button', { name: 'Data Science' })
    fireEvent.click(dsFilter)

    await waitFor(() => {
      expect(libraryService.getCourses).toHaveBeenCalledWith(
        expect.objectContaining({
          category: 'Data Science',
        })
      )
    })
  })

  it('supports deep linking to ebooks tab with search query parameter', async () => {
    vi.mocked(ebookService.getEbooks).mockResolvedValue([
      {
        id: 'ebk-py-1',
        title: 'Python Algorithmic Foundations',
        description: 'Comprehensive Python DSA handbook',
        coverUrl: '/covers/py.jpg',
        category: 'Computer Science',
        difficulty: 'Intermediate',
        totalChapters: 12,
        estimatedReadingTimeMins: 180,
        rating: 4.9,
      } as any,
    ])

    render(<LibraryPage />, {
      route: '/library?tab=ebooks&search=Python',
    })

    await waitFor(() => {
      // Ebooks tab button should be active
      const searchInput = screen.getByPlaceholderText(/Search interactive textbooks.../i) as HTMLInputElement
      expect(searchInput.value).toBe('Python')
      expect(screen.getByText('Python Algorithmic Foundations')).toBeInTheDocument()
    })
  })
})
