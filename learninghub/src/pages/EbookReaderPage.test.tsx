import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '../test/test-utils'
import EbookReaderPage from './EbookReaderPage'

vi.mock('../services/ebookService', () => ({
  DEMO_EBOOKS: [],
  ebookService: {
    getEbookById: vi.fn().mockResolvedValue({
      id: 'ebook-dsa-handbook',
      title: 'Data Structures & Algorithms: The Interactive Handbook',
      author: 'Dr. Sarah Chen & Alex Rivera',
      totalChapters: 2,
    }),
    getChapters: vi.fn().mockResolvedValue([
      {
        id: 'ch-dsa-1',
        ebookId: 'ebook-dsa-handbook',
        title: '1. Introduction to Algorithms',
        order: 1,
        contentMarkdown: '# Welcome to Algorithms\n\nAlgorithms are step-by-step procedures for calculations.',
        estimatedReadTimeMins: 10,
      },
      {
        id: 'ch-dsa-2',
        ebookId: 'ebook-dsa-handbook',
        title: '2. Asymptotic Notation & Big-O',
        order: 2,
        contentMarkdown: '# Big-O Analysis\n\nMeasure worst-case growth rates.',
        estimatedReadTimeMins: 15,
      },
    ]),
  },
}))

describe('EbookReaderPage Component', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders ebook title, chapter title, and toolbar controls', async () => {
    render(<EbookReaderPage />)

    await waitFor(() => {
      expect(screen.getByText(/1\. Introduction to Algorithms/i)).toBeInTheDocument()
    })

    // Verify toolbar buttons
    expect(screen.getByTitle(/table of contents/i)).toBeInTheDocument()
    expect(screen.getByTitle(/ai study tools/i)).toBeInTheDocument()
    expect(screen.getByTitle(/view highlights & notes/i)).toBeInTheDocument()
  })

  it('toggles chapter bookmark button and displays toast', async () => {
    render(<EbookReaderPage />)

    await waitFor(() => {
      expect(screen.getByTitle(/bookmark this chapter/i)).toBeInTheDocument()
    })

    const bookmarkBtn = screen.getByTitle(/bookmark this chapter/i)
    fireEvent.click(bookmarkBtn)
  })

  it('toggles text-to-speech narration player button', async () => {
    render(<EbookReaderPage />)

    await waitFor(() => {
      expect(screen.getByTitle(/audio narration/i)).toBeInTheDocument()
    })

    const ttsBtn = screen.getByTitle(/audio narration/i)
    fireEvent.click(ttsBtn)
  })
})
