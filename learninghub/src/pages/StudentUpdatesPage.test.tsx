import { describe, it, expect, vi, beforeEach } from 'vitest';
import { screen, waitFor, fireEvent } from '@testing-library/react';
import { render } from '../test/test-utils';
import { StudentUpdatesPage } from './StudentUpdatesPage';
import { updatesService } from '../services/updatesService';
import type { StudentUpdate, UpdateSource, ResultWatcher } from '../types/updates';

const MOCK_UPDATES: StudentUpdate[] = [
  {
    id: 'upd-1',
    title: 'MGKVP BCA / B.Sc / B.Com Even Semester Examination Form Submission Extended',
    summary: 'The last date for submitting online examination forms has been extended.',
    source_url: 'https://mgkvp.ac.in/notice1',
    category: 'EXAMINATION',
    sub_category: 'EXAM_FORM',
    institution: 'Mahatma Gandhi Kashi Vidyapith (MGKVP)',
    course: 'BCA',
    importance: 'URGENT',
    status: 'PUBLISHED',
    verification_status: 'VERIFIED',
    version: 1,
    deadline: new Date(Date.now() + 86400000 * 5).toISOString(),
    published_at: new Date().toISOString(),
    created_at: new Date().toISOString(),
  },
  {
    id: 'upd-2',
    title: 'Dr. APJ Abdul Kalam Technical University Carry Over Exam Registration Window',
    summary: 'COP exam registration open for B.Tech students.',
    source_url: 'https://aktu.ac.in/notice2',
    category: 'EXAMINATION',
    sub_category: 'EXAM_FORM',
    institution: 'AKTU Lucknow',
    course: 'B.Tech',
    importance: 'IMPORTANT',
    status: 'PUBLISHED',
    verification_status: 'VERIFIED',
    version: 1,
    deadline: new Date(Date.now() + 86400000 * 10).toISOString(),
    published_at: new Date().toISOString(),
    created_at: new Date().toISOString(),
  },
];

const MOCK_SOURCES: UpdateSource[] = [
  {
    source_id: 'src-mgkvp',
    name: 'Mahatma Gandhi Kashi Vidyapith Main Portal',
    domain: 'mgkvp.ac.in',
    source_type: 'UNIVERSITY',
    authority_level: 1,
    category: 'ACADEMIC',
    country: 'India',
    state: 'Uttar Pradesh',
    institution: 'MGKVP',
    base_url: 'https://mgkvp.ac.in',
    polling_interval_minutes: 30,
    is_enabled: true,
    endpoints: [],
  },
];

const MOCK_WATCHERS: ResultWatcher[] = [
  {
    id: 'watch-1',
    institution: 'Mahatma Gandhi Kashi Vidyapith (MGKVP)',
    course: 'BCA',
    semester: '4th Semester',
    roll_number: '2300582910',
    status: 'ACTIVE',
    created_at: new Date().toISOString(),
  },
];

vi.mock('../services/updatesService', () => ({
  updatesService: {
    getUpdates: vi.fn(),
    getPersonalizedFeed: vi.fn(),
    getUpcomingDeadlines: vi.fn(),
    getUpdateById: vi.fn(),
    getBookmarks: vi.fn(),
    saveBookmark: vi.fn(),
    removeBookmark: vi.fn(),
    getReminders: vi.fn(),
    createReminder: vi.fn(),
    cancelReminder: vi.fn(),
    getSubscriptions: vi.fn(),
    subscribeTarget: vi.fn(),
    unsubscribeTarget: vi.fn(),
    getResultWatchers: vi.fn(),
    createResultWatcher: vi.fn(),
    cancelResultWatcher: vi.fn(),
    getSources: vi.fn(),
    getStats: vi.fn(),
    seedInitialData: vi.fn(),
    getCollegeCirculars: vi.fn(),
    logEngagement: vi.fn(),
  },
  DEMO_STUDENT_UPDATES: [],
  DEMO_SOURCES: [],
}));

describe('StudentUpdatesPage Component', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(updatesService.getUpdates).mockResolvedValue(MOCK_UPDATES);
    vi.mocked(updatesService.getPersonalizedFeed).mockResolvedValue([MOCK_UPDATES[0]]);
    vi.mocked(updatesService.getCollegeCirculars).mockResolvedValue({ results: [], total_count: 0 });
    vi.mocked(updatesService.logEngagement).mockResolvedValue(true);
    vi.mocked(updatesService.getBookmarks).mockResolvedValue([]);
    vi.mocked(updatesService.getSources).mockResolvedValue(MOCK_SOURCES);
    vi.mocked(updatesService.getResultWatchers).mockResolvedValue(MOCK_WATCHERS);
    vi.mocked(updatesService.getSubscriptions).mockResolvedValue([
      {
        id: 'sub-1',
        target_type: 'INSTITUTION',
        target_value: 'Mahatma Gandhi Kashi Vidyapith (MGKVP)',
        created_at: new Date().toISOString(),
      },
    ]);
    vi.mocked(updatesService.getStats).mockResolvedValue({
      total_updates: 2,
      urgent_updates: 1,
      active_deadlines: 2,
      tracked_sources: 1,
    });
  });

  it('renders header, titles, and metrics overview', async () => {
    render(<StudentUpdatesPage />);

    expect(screen.getByText('Student Updates Hub')).toBeInTheDocument();

    await waitFor(() => {
      expect(screen.getByText('Total Notices')).toBeInTheDocument();
      expect(screen.getByText('Urgent Notices')).toBeInTheDocument();
      expect(screen.getByText('Active Deadlines')).toBeInTheDocument();
      expect(screen.getAllByText('Official Sources').length).toBeGreaterThanOrEqual(1);
    });
  });

  it('renders student notices cards', async () => {
    render(<StudentUpdatesPage />);

    await waitFor(() => {
      expect(
        screen.getByText(/MGKVP BCA \/ B.Sc \/ B.Com Even Semester/i)
      ).toBeInTheDocument();
      expect(
        screen.getByText(/Dr. APJ Abdul Kalam Technical University Carry Over/i)
      ).toBeInTheDocument();
    });
  });

  it('switches between tabs cleanly including Result Watchers', async () => {
    render(<StudentUpdatesPage />);

    await waitFor(() => {
      expect(screen.getAllByText('All Updates').length).toBeGreaterThanOrEqual(1);
    }, { timeout: 4000 });

    // Switch to Result Watchers tab
    const watchersTab = screen.getByRole('button', { name: /Result Watchers/i });
    fireEvent.click(watchersTab);

    await waitFor(() => {
      expect(screen.getByText('Continuous Result Radar Tracking')).toBeInTheDocument();
      expect(screen.getByText('Radar Scanning')).toBeInTheDocument();
      expect(screen.getByText('2300582910')).toBeInTheDocument();
    }, { timeout: 4000 });

    // Switch to Deadlines Timeline tab
    const deadlinesTab = screen.getByRole('button', { name: /Deadlines Timeline/i });
    fireEvent.click(deadlinesTab);

    await waitFor(() => {
      expect(screen.getByText('Upcoming Academic Deadlines')).toBeInTheDocument();
    }, { timeout: 4000 });

    // Switch to Official Sources tab
    const sourcesTab = screen.getByRole('button', { name: /Official Sources/i });
    fireEvent.click(sourcesTab);

    await waitFor(() => {
      expect(screen.getByText('Accredited Source Registry')).toBeInTheDocument();
      expect(screen.getByText('Mahatma Gandhi Kashi Vidyapith Main Portal')).toBeInTheDocument();
    }, { timeout: 4000 });
  });

  it('opens and closes Result Watcher modal', async () => {
    render(<StudentUpdatesPage />);

    const watchMyResultBtn = await screen.findByRole('button', { name: /Watch My Result/i });
    fireEvent.click(watchMyResultBtn);

    await waitFor(() => {
      expect(screen.getByText('Automated Result Watcher')).toBeInTheDocument();
    });

    const cancelBtn = screen.getByRole('button', { name: /Cancel/i });
    fireEvent.click(cancelBtn);

    await waitFor(() => {
      expect(screen.queryByText('Automated Result Watcher')).not.toBeInTheDocument();
    });
  });

  it('supports search input query changes', async () => {
    render(<StudentUpdatesPage />);

    const searchInput = await screen.findByPlaceholderText(/Search notices/i, {}, { timeout: 4000 });
    fireEvent.change(searchInput, { target: { value: 'BCA' } });

    await waitFor(() => {
      expect(updatesService.getUpdates).toHaveBeenCalledWith(
        expect.objectContaining({
          search: 'BCA',
        })
      );
    }, { timeout: 4000 });
  });
});
