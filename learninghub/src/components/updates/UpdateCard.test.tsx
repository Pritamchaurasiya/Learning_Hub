import { describe, it, expect, vi, beforeEach } from 'vitest';
import { screen, fireEvent, waitFor } from '@testing-library/react';
import { render } from '../../test/test-utils';
import { UpdateCard } from './UpdateCard';
import { updatesService } from '../../services/updatesService';
import type { StudentUpdate } from '../../types/updates';

vi.mock('../../services/updatesService', () => ({
  updatesService: {
    saveBookmark: vi.fn(),
    removeBookmark: vi.fn(),
    logEngagement: vi.fn(),
  },
}));

const mockUpdate: StudentUpdate = {
  id: 'upd-card-1',
  title: 'BCA Semester Exam Registration Form Open',
  summary: 'Eligible students should submit forms before the official date.',
  source_url: 'https://mgkvp.ac.in/notice-card.pdf',
  category: 'EXAMINATION',
  sub_category: 'EXAM_FORM',
  institution: 'Mahatma Gandhi Kashi Vidyapith',
  course: 'BCA',
  semester: '4th Sem',
  importance: 'URGENT',
  status: 'PUBLISHED',
  verification_status: 'VERIFIED',
  authority_level: 1,
  version: 1,
  deadline: '2026-10-25T00:00:00Z',
  published_at: '2026-10-01T00:00:00Z',
  created_at: '2026-10-01T00:00:00Z',
  attachments_count: 1,
};

describe('UpdateCard Component', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders update title, institution, course badge, and urgency', () => {
    render(<UpdateCard update={mockUpdate} />);

    expect(screen.getByText('BCA Semester Exam Registration Form Open')).toBeInTheDocument();
    expect(screen.getByText('Mahatma Gandhi Kashi Vidyapith')).toBeInTheDocument();
    expect(screen.getByText(/BCA \(4th Sem\)/i)).toBeInTheDocument();
    expect(screen.getByText('Urgent')).toBeInTheDocument();
    expect(screen.getByText(/Official Level 1/i)).toBeInTheDocument();
  });

  it('renders official notice link targeting source URL', () => {
    render(<UpdateCard update={mockUpdate} />);

    const officialNoticeLink = screen.getByRole('link', { name: /Official Notice/i });
    expect(officialNoticeLink).toHaveAttribute('href', 'https://mgkvp.ac.in/notice-card.pdf');
    expect(officialNoticeLink).toHaveAttribute('target', '_blank');
  });

  it('handles bookmark toggle clicks and notifies callbacks', async () => {
    vi.mocked(updatesService.saveBookmark).mockResolvedValueOnce({
      id: 'bmk-card-1',
      update: mockUpdate,
      notes: '',
      tag: 'General',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    });

    const handleToggled = vi.fn();
    render(<UpdateCard update={mockUpdate} onBookmarkToggled={handleToggled} />);

    const bookmarkBtn = screen.getByLabelText('Save Bookmark');
    fireEvent.click(bookmarkBtn);

    await waitFor(() => {
      expect(updatesService.saveBookmark).toHaveBeenCalledWith('upd-card-1');
      expect(handleToggled).toHaveBeenCalledWith('upd-card-1', true);
    });
  });

  it('triggers onOpenReminder when Remind button is clicked', () => {
    const handleOpenReminder = vi.fn();
    render(<UpdateCard update={mockUpdate} onOpenReminder={handleOpenReminder} />);

    const remindBtn = screen.getByTitle('Set Deadline Reminder');
    fireEvent.click(remindBtn);

    expect(handleOpenReminder).toHaveBeenCalledWith(mockUpdate);
  });

  it('handles share button click and copies URL to clipboard', async () => {
    const writeTextSpy = vi.fn().mockResolvedValue(undefined);
    Object.assign(navigator, {
      clipboard: {
        writeText: writeTextSpy,
      },
    });

    render(<UpdateCard update={mockUpdate} />);

    const shareBtn = screen.getByLabelText('Share Notice');
    fireEvent.click(shareBtn);

    await waitFor(() => {
      expect(writeTextSpy).toHaveBeenCalledWith(expect.stringContaining('/updates/upd-card-1'));
    });
  });

  it('triggers onFollowUniversity when follow button is clicked', () => {
    const handleFollow = vi.fn();
    render(
      <UpdateCard
        update={mockUpdate}
        onFollowUniversity={handleFollow}
        isFollowingUniversity={false}
      />
    );

    const followBtn = screen.getByTitle('Follow Mahatma Gandhi Kashi Vidyapith');
    expect(followBtn).toHaveTextContent('+ Follow');
    fireEvent.click(followBtn);

    expect(handleFollow).toHaveBeenCalledWith('Mahatma Gandhi Kashi Vidyapith');
  });

  it('triggers onOpenResultWatcher when Result Watch button is clicked', () => {
    const handleResultWatch = vi.fn();
    render(
      <UpdateCard
        update={mockUpdate}
        onOpenResultWatcher={handleResultWatch}
      />
    );

    const watchBtn = screen.getByTitle('Track Official Results');
    fireEvent.click(watchBtn);

    expect(handleResultWatch).toHaveBeenCalledWith('Mahatma Gandhi Kashi Vidyapith', 'BCA');
  });
});

