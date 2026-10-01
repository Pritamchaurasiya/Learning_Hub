import { describe, it, expect, vi, beforeEach } from 'vitest';
import { screen, fireEvent, waitFor } from '@testing-library/react';
import { render } from '../../test/test-utils';
import { UpdateReminderModal } from './UpdateReminderModal';
import { updatesService } from '../../services/updatesService';
import type { StudentUpdate } from '../../types/updates';

vi.mock('../../services/updatesService', () => ({
  updatesService: {
    createReminder: vi.fn(),
  },
}));

const mockUpdate: StudentUpdate = {
  id: 'upd-rem-1',
  title: 'MGKVP Exam Application Form Window 2026',
  summary: 'Students must submit application forms before official closure.',
  source_url: 'https://mgkvp.ac.in',
  category: 'EXAMINATION',
  sub_category: 'EXAM_FORM',
  institution: 'MGKVP',
  importance: 'URGENT',
  status: 'PUBLISHED',
  verification_status: 'VERIFIED',
  authority_level: 1,
  version: 1,
  deadline: new Date(Date.now() + 86400000 * 5).toISOString(),
  published_at: new Date().toISOString(),
  created_at: new Date().toISOString(),
};

describe('UpdateReminderModal', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders nothing when isOpen is false or update is null', () => {
    const { container: c1 } = render(
      <UpdateReminderModal isOpen={false} update={mockUpdate} onClose={vi.fn()} />
    );
    expect(c1.firstChild).toBeNull();

    const { container: c2 } = render(
      <UpdateReminderModal isOpen={true} update={null} onClose={vi.fn()} />
    );
    expect(c2.firstChild).toBeNull();
  });

  it('renders modal details, title, and deadline date', () => {
    render(
      <UpdateReminderModal isOpen={true} update={mockUpdate} onClose={vi.fn()} />
    );

    expect(screen.getByText('Set Deadline Reminder')).toBeInTheDocument();
    expect(screen.getByText('MGKVP Exam Application Form Window 2026')).toBeInTheDocument();
    expect(screen.getByText(/Official Deadline:/i)).toBeInTheDocument();
    expect(screen.getByText(/3 days before deadline/i)).toBeInTheDocument();
    expect(screen.getByText(/1 day before deadline/i)).toBeInTheDocument();
    expect(screen.getByText(/Morning of deadline day/i)).toBeInTheDocument();
  });

  it('calls onClose when close button or Cancel is clicked', () => {
    const handleClose = vi.fn();
    render(
      <UpdateReminderModal isOpen={true} update={mockUpdate} onClose={handleClose} />
    );

    const closeBtn = screen.getByLabelText('Close modal');
    fireEvent.click(closeBtn);
    expect(handleClose).toHaveBeenCalledTimes(1);

    const cancelBtn = screen.getByRole('button', { name: 'Cancel' });
    fireEvent.click(cancelBtn);
    expect(handleClose).toHaveBeenCalledTimes(2);
  });

  it('submits reminders via updatesService when form is submitted', async () => {
    vi.mocked(updatesService.createReminder).mockResolvedValue({
      id: 'rem-success-1',
      update: mockUpdate,
      reminder_type: '3_DAYS_BEFORE',
      trigger_at: new Date().toISOString(),
      is_dispatched: false,
      created_at: new Date().toISOString(),
    });

    render(
      <UpdateReminderModal isOpen={true} update={mockUpdate} onClose={vi.fn()} />
    );

    const submitBtn = screen.getByRole('button', { name: 'Set Reminder' });
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(updatesService.createReminder).toHaveBeenCalledWith('upd-rem-1', '3_DAYS_BEFORE');
      expect(screen.getByText('Deadline reminders scheduled successfully!')).toBeInTheDocument();
    });
  });

  it('delegates to onConfirm when custom confirmation handler is provided', async () => {
    const handleConfirm = vi.fn().mockResolvedValue(undefined);

    render(
      <UpdateReminderModal
        isOpen={true}
        update={mockUpdate}
        onClose={vi.fn()}
        onConfirm={handleConfirm}
      />
    );

    const submitBtn = screen.getByRole('button', { name: 'Set Reminder' });
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(handleConfirm).toHaveBeenCalledWith('upd-rem-1', '3_DAYS_BEFORE');
    });
  });
});
