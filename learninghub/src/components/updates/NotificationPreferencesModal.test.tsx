import { describe, it, expect, vi, beforeEach } from 'vitest';
import { screen, fireEvent, waitFor } from '@testing-library/react';
import { render } from '../../test/test-utils';
import { NotificationPreferencesModal } from './NotificationPreferencesModal';
import { updatesService } from '../../services/updatesService';

vi.mock('../../services/updatesService', () => ({
  updatesService: {
    getNotificationPreferences: vi.fn(),
    updateNotificationPreferences: vi.fn(),
  },
}));

describe('NotificationPreferencesModal Component', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders nothing when isOpen is false', () => {
    render(<NotificationPreferencesModal isOpen={false} onClose={vi.fn()} />);
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('loads preferences and displays quiet hours and frequency options when open', async () => {
    vi.mocked(updatesService.getNotificationPreferences).mockResolvedValueOnce({
      quiet_hours_enabled: true,
      quiet_hours_start: '23:00:00',
      quiet_hours_end: '06:00:00',
      max_daily_push: 5,
      digest_mode: true,
      allow_results: true,
      allow_exam_forms: true,
      allow_timetables: false,
      allow_scholarships: true,
      allow_admit_cards: true,
      allow_academic: false,
    });

    render(<NotificationPreferencesModal isOpen={true} onClose={vi.fn()} />);

    expect(screen.getByRole('dialog')).toBeInTheDocument();
    expect(screen.getByText(/Notification Delivery Settings/i)).toBeInTheDocument();

    await waitFor(() => {
      expect(screen.getByText('Quiet Hours Mode')).toBeInTheDocument();
      expect(screen.getByText('Anti-Noise Frequency Capping')).toBeInTheDocument();
      expect(screen.getByLabelText('Max daily push notifications')).toHaveValue('5');
    });
  });

  it('saves updated preferences when user submits the form', async () => {
    vi.mocked(updatesService.getNotificationPreferences).mockResolvedValueOnce({
      quiet_hours_enabled: true,
      quiet_hours_start: '22:00:00',
      quiet_hours_end: '07:00:00',
      max_daily_push: 3,
      digest_mode: false,
      allow_results: true,
      allow_exam_forms: true,
      allow_timetables: true,
      allow_scholarships: true,
      allow_admit_cards: true,
      allow_academic: true,
    });

    vi.mocked(updatesService.updateNotificationPreferences).mockResolvedValueOnce({
      quiet_hours_enabled: true,
      quiet_hours_start: '22:00:00',
      quiet_hours_end: '07:00:00',
      max_daily_push: 5,
      digest_mode: false,
      allow_results: true,
      allow_exam_forms: true,
      allow_timetables: true,
      allow_scholarships: true,
      allow_admit_cards: true,
      allow_academic: true,
    });

    const onSavedMock = vi.fn();
    render(<NotificationPreferencesModal isOpen={true} onClose={vi.fn()} onSaved={onSavedMock} />);

    await waitFor(() => {
      expect(screen.getByLabelText('Max daily push notifications')).toBeInTheDocument();
    });

    fireEvent.change(screen.getByLabelText('Max daily push notifications'), {
      target: { value: '5' },
    });

    fireEvent.click(screen.getByRole('button', { name: /Save Preferences/i }));

    await waitFor(() => {
      expect(updatesService.updateNotificationPreferences).toHaveBeenCalledWith(
        expect.objectContaining({
          max_daily_push: 5,
        })
      );
      expect(onSavedMock).toHaveBeenCalled();
    });
  });
});
