import { describe, it, expect, vi, beforeEach } from 'vitest';
import { screen, waitFor, fireEvent } from '@testing-library/react';
import { render } from '../test/test-utils';
import { UpdateDetailsPage } from './UpdateDetailsPage';
import { updatesService } from '../services/updatesService';
import type { StudentUpdate } from '../types/updates';

const mockNavigate = vi.fn();
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useParams: () => ({ id: 'upd-detail-1' }),
    useNavigate: () => mockNavigate,
  };
});

vi.mock('../services/updatesService', () => ({
  updatesService: {
    getUpdateById: vi.fn(),
    saveBookmark: vi.fn(),
    removeBookmark: vi.fn(),
    createReminder: vi.fn(),
  },
  DEMO_STUDENT_UPDATES: [],
  DEMO_SOURCES: [],
}));

const SAMPLE_UPDATE: StudentUpdate = {
  id: 'upd-detail-1',
  title: 'MGKVP BCA Exam Form Deadline Extended 2026',
  summary: 'Official notification regarding BCA semester exam registration forms.',
  ai_summary: 'Key takeaway: Even semester exam deadline extended with standard late fee.',
  is_ai_summarized: true,
  source_url: 'https://mgkvp.ac.in/notice-detail.pdf',
  category: 'EXAMINATION',
  sub_category: 'EXAM_FORM',
  institution: 'Mahatma Gandhi Kashi Vidyapith',
  course: 'BCA',
  semester: '4th Semester',
  importance: 'URGENT',
  status: 'PUBLISHED',
  verification_status: 'VERIFIED',
  version: 2,
  authority_level: 1,
  source_name: 'MGKVP Exam Portal',
  source_domain: 'mgkvp.ac.in',
  deadline: new Date(Date.now() + 86400000 * 5).toISOString(),
  published_at: new Date(Date.now() - 86400000).toISOString(),
  created_at: new Date(Date.now() - 86400000).toISOString(),
  is_bookmarked: false,
  attachments: [
    {
      id: 'att-1',
      title: 'BCA_Exam_Notice_2026.pdf',
      file_url: 'https://mgkvp.ac.in/BCA_Exam_Notice_2026.pdf',
      mime_type: 'application/pdf',
      file_size_bytes: 520000,
    },
  ],
  versions: [
    {
      id: 'v-1',
      version_number: 1,
      title: 'Initial Notice',
      summary: 'Draft notification.',
      diff_summary: 'First published edition.',
      changed_fields: [],
      created_at: new Date(Date.now() - 86400000 * 2).toISOString(),
    },
    {
      id: 'v-2',
      version_number: 2,
      title: 'MGKVP BCA Exam Form Deadline Extended 2026',
      summary: 'Official notification with extension.',
      diff_summary: 'Deadline extended by 5 days.',
      changed_fields: ['deadline', 'title'],
      created_at: new Date(Date.now() - 86400000).toISOString(),
    },
  ],
  cross_links: [
    {
      id: 'cl-1',
      content_type: 'TEST',
      target_id: 'test-bca-dsa',
      title: 'Practice BCA Data Structures Mock Test',
      action_cta: 'Start Test',
      action_url: '/tests/a',
    },
  ],
};

describe('UpdateDetailsPage Component', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders notice details, headers, and academic meta info', async () => {
    vi.mocked(updatesService.getUpdateById).mockResolvedValueOnce(SAMPLE_UPDATE);

    render(<UpdateDetailsPage />);

    await waitFor(() => {
      expect(screen.getByText('MGKVP BCA Exam Form Deadline Extended 2026')).toBeInTheDocument();
      expect(screen.getByText('Mahatma Gandhi Kashi Vidyapith')).toBeInTheDocument();
      expect(screen.getByText(/Course: BCA 4th Semester/i)).toBeInTheDocument();
      expect(screen.getByText(/Official Verified Source/i)).toBeInTheDocument();
      expect(screen.getByText('MGKVP Exam Portal')).toBeInTheDocument();
      expect(screen.getByText('mgkvp.ac.in')).toBeInTheDocument();
    });
  });

  it('renders AI Executive Digest and extracted circular summary', async () => {
    vi.mocked(updatesService.getUpdateById).mockResolvedValueOnce(SAMPLE_UPDATE);

    render(<UpdateDetailsPage />);

    await waitFor(() => {
      expect(screen.getByText('AI Executive Digest')).toBeInTheDocument();
      expect(
        screen.getByText(/Key takeaway: Even semester exam deadline extended with standard late fee./i)
      ).toBeInTheDocument();
      expect(screen.getByText('Extracted Circular Details')).toBeInTheDocument();
    });
  });

  it('renders official portal link and attachments download links', async () => {
    vi.mocked(updatesService.getUpdateById).mockResolvedValueOnce(SAMPLE_UPDATE);

    render(<UpdateDetailsPage />);

    await waitFor(() => {
      expect(screen.getByRole('link', { name: /Open Original Portal/i })).toHaveAttribute(
        'href',
        'https://mgkvp.ac.in/notice-detail.pdf'
      );
      expect(screen.getByText('BCA_Exam_Notice_2026.pdf')).toBeInTheDocument();
      expect(screen.getByRole('link', { name: /Download PDF/i })).toHaveAttribute(
        'href',
        'https://mgkvp.ac.in/BCA_Exam_Notice_2026.pdf'
      );
    });
  });

  it('toggles bookmark save and remove state', async () => {
    vi.mocked(updatesService.getUpdateById).mockResolvedValueOnce(SAMPLE_UPDATE);
    vi.mocked(updatesService.saveBookmark).mockResolvedValueOnce({
      id: 'bmk-new-1',
      update: SAMPLE_UPDATE,
      notes: '',
      tag: 'General',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    });
    vi.mocked(updatesService.removeBookmark).mockResolvedValueOnce(true);

    render(<UpdateDetailsPage />);

    await waitFor(() => {
      expect(screen.getByText('Save')).toBeInTheDocument();
    });

    const bookmarkBtn = screen.getByText('Save');
    fireEvent.click(bookmarkBtn);

    await waitFor(() => {
      expect(updatesService.saveBookmark).toHaveBeenCalledWith('upd-detail-1');
      expect(screen.getByText('Saved')).toBeInTheDocument();
    });

    // Toggle off
    const savedBtn = screen.getByText('Saved');
    fireEvent.click(savedBtn);

    await waitFor(() => {
      expect(updatesService.removeBookmark).toHaveBeenCalledWith('upd-detail-1');
      expect(screen.getByText('Save')).toBeInTheDocument();
    });
  });

  it('opens reminder modal when Notify Me is clicked', async () => {
    vi.mocked(updatesService.getUpdateById).mockResolvedValueOnce(SAMPLE_UPDATE);

    render(<UpdateDetailsPage />);

    await waitFor(() => {
      expect(screen.getByText('Notify Me')).toBeInTheDocument();
    });

    const notifyBtn = screen.getByText('Notify Me');
    fireEvent.click(notifyBtn);

    await waitFor(() => {
      expect(screen.getByText(/Set Deadline Reminder/i)).toBeInTheDocument();
    });
  });

  it('renders revision history timeline when multiple versions exist', async () => {
    vi.mocked(updatesService.getUpdateById).mockResolvedValueOnce(SAMPLE_UPDATE);

    render(<UpdateDetailsPage />);

    await waitFor(() => {
      expect(screen.getByText('Revision History')).toBeInTheDocument();
      expect(screen.getByText('Revision #1')).toBeInTheDocument();
      expect(screen.getByText('Revision #2')).toBeInTheDocument();
      expect(screen.getByText('Deadline extended by 5 days.')).toBeInTheDocument();
    });
  });

  it('renders cross-feature synergies with mock assessment deep link', async () => {
    vi.mocked(updatesService.getUpdateById).mockResolvedValueOnce(SAMPLE_UPDATE);

    render(<UpdateDetailsPage />);

    await waitFor(() => {
      expect(screen.getByText('Prepare for this Notice')).toBeInTheDocument();
      expect(screen.getByText('Practice BCA Data Structures Mock Test')).toBeInTheDocument();
      expect(screen.getByText('Start Test')).toBeInTheDocument();
    });
  });

  it('displays Notice Not Found empty state when item does not exist', async () => {
    vi.mocked(updatesService.getUpdateById).mockResolvedValueOnce(null);

    render(<UpdateDetailsPage />);

    await waitFor(() => {
      expect(screen.getByText('Notice Not Found')).toBeInTheDocument();
      expect(screen.getByText('Return to Updates Hub')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText('Return to Updates Hub'));
    expect(mockNavigate).toHaveBeenCalledWith('/updates');
  });
});
