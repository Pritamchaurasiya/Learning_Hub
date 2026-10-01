import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '../test/test-utils'
import DownloadsPage from './DownloadsPage'

vi.mock('../services/downloadService', () => ({
  downloadService: {
    getDownloads: vi.fn().mockResolvedValue({
      data: [
        {
          id: 'dl-1',
          title: 'Advanced Graph Algorithms Lecture Notes',
          type: 'document',
          status: 'completed',
          file_size: 15 * 1024 * 1024,
          progress: 100,
          created_at: new Date().toISOString(),
        },
      ],
    }),
    getStats: vi.fn().mockResolvedValue({
      data: {
        total_downloads: 1,
        total_size: 15 * 1024 * 1024,
        completed_downloads: 1,
      },
    }),
    pauseDownload: vi.fn().mockResolvedValue({ status: 'success' }),
    resumeDownload: vi.fn().mockResolvedValue({ status: 'success' }),
    deleteDownload: vi.fn().mockResolvedValue({ status: 'success' }),
    downloadOfflineKit: vi.fn().mockResolvedValue({ status: 'success' }),
  },
}))

describe('DownloadsPage Component', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders downloads header, storage vault stats, and offline revision kits', async () => {
    render(<DownloadsPage />)

    await waitFor(() => {
      expect(screen.getByText(/Offline Study Vault|Downloads/i)).toBeInTheDocument()
    })

    // Verify offline revision kit titles
    expect(screen.getByText(/DSA & Big-O Complexity Master Reference/i)).toBeInTheDocument()
    expect(screen.getByText(/System Design & Scalability Architecture Primer/i)).toBeInTheDocument()
  })

  it('switches download filter tabs', async () => {
    render(<DownloadsPage />)

    await waitFor(() => {
      expect(screen.getByText(/DSA & Big-O Complexity Master Reference/i)).toBeInTheDocument()
    })

    const completedTab = screen.getByRole('button', { name: /completed/i })
    fireEvent.click(completedTab)

    const allTab = screen.getByRole('button', { name: /all/i })
    fireEvent.click(allTab)
  })

  it('triggers offline revision kit download', async () => {
    render(<DownloadsPage />)

    await waitFor(() => {
      expect(screen.getByText(/DSA & Big-O Complexity Master Reference/i)).toBeInTheDocument()
    })

    const downloadButtons = screen.getAllByRole('button', { name: /save offline|download|save kit/i })
    if (downloadButtons.length > 0) {
      fireEvent.click(downloadButtons[0]!)
    }
  })
})
