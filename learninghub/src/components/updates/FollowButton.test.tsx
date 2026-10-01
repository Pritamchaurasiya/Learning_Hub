import { describe, it, expect, vi, beforeEach } from 'vitest';
import { screen, fireEvent, waitFor } from '@testing-library/react';
import { render } from '../../test/test-utils';
import { FollowButton } from './FollowButton';
import { updatesService } from '../../services/updatesService';

vi.mock('../../services/updatesService', () => ({
  updatesService: {
    subscribeTarget: vi.fn(),
    unsubscribeTarget: vi.fn(),
  },
}));

describe('FollowButton Component', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders default unfollowed state with "+ Follow" text', () => {
    render(<FollowButton targetType="INSTITUTION" targetValue="MGKVP" />);

    expect(screen.getByRole('button', { name: /Follow MGKVP/i })).toBeInTheDocument();
    expect(screen.getByText('Follow')).toBeInTheDocument();
  });

  it('renders initial followed state with "Following" text', () => {
    render(
      <FollowButton
        targetType="INSTITUTION"
        targetValue="AKTU"
        initialFollowed={true}
        subscriptionId="sub-123"
      />
    );

    expect(screen.getByRole('button', { name: /Unfollow AKTU/i })).toBeInTheDocument();
    expect(screen.getByText('Following')).toBeInTheDocument();
  });

  it('calls subscribeTarget on click when not followed', async () => {
    vi.mocked(updatesService.subscribeTarget).mockResolvedValueOnce({
      id: 'sub-new-1',
      target_type: 'COURSE',
      target_value: 'BCA',
      created_at: new Date().toISOString(),
    });

    const onToggleMock = vi.fn();
    render(
      <FollowButton
        targetType="COURSE"
        targetValue="BCA"
        onToggle={onToggleMock}
      />
    );

    const button = screen.getByRole('button');
    fireEvent.click(button);

    await waitFor(() => {
      expect(updatesService.subscribeTarget).toHaveBeenCalledWith('COURSE', 'BCA');
      expect(screen.getByText('Following')).toBeInTheDocument();
      expect(onToggleMock).toHaveBeenCalledWith(true);
    });
  });

  it('calls unsubscribeTarget on click when already followed', async () => {
    vi.mocked(updatesService.unsubscribeTarget).mockResolvedValueOnce(true);

    const onToggleMock = vi.fn();
    render(
      <FollowButton
        targetType="INSTITUTION"
        targetValue="MGKVP"
        initialFollowed={true}
        subscriptionId="sub-999"
        onToggle={onToggleMock}
      />
    );

    const button = screen.getByRole('button');
    fireEvent.click(button);

    await waitFor(() => {
      expect(updatesService.unsubscribeTarget).toHaveBeenCalledWith('sub-999');
      expect(screen.getByText('Follow')).toBeInTheDocument();
      expect(onToggleMock).toHaveBeenCalledWith(false);
    });
  });
});
