import { describe, it, expect, vi, beforeEach } from 'vitest';
import { screen, fireEvent, waitFor } from '@testing-library/react';
import { render } from '../../test/test-utils';
import { ResultWatcherModal } from './ResultWatcherModal';
import { updatesService } from '../../services/updatesService';

vi.mock('../../services/updatesService', () => ({
  updatesService: {
    createResultWatcher: vi.fn(),
  },
}));

describe('ResultWatcherModal Component', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders correctly when open', () => {
    render(<ResultWatcherModal isOpen={true} onClose={vi.fn()} />);

    expect(screen.getByText('Automated Result Watcher')).toBeInTheDocument();
    expect(screen.getByLabelText(/Select University \/ Exam Body/i)).toBeInTheDocument();
    expect(screen.getByPlaceholderText(/e.g. BCA, B.Tech, MCA/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Activate Result Watcher/i })).toBeInTheDocument();
  });

  it('does not render when closed', () => {
    render(<ResultWatcherModal isOpen={false} onClose={vi.fn()} />);
    expect(screen.queryByText('Automated Result Watcher')).not.toBeInTheDocument();
  });

  it('submits valid form data and triggers onCreated', async () => {
    const mockCreated = {
      id: 'watch-test-1',
      institution: 'Mahatma Gandhi Kashi Vidyapith (MGKVP)',
      course: 'BCA',
      semester: '4th Semester',
      roll_number: '2300582910',
      status: 'ACTIVE' as const,
      created_at: new Date().toISOString(),
    };

    vi.mocked(updatesService.createResultWatcher).mockResolvedValueOnce(mockCreated);
    const onCreated = vi.fn();
    const onClose = vi.fn();

    render(
      <ResultWatcherModal
        isOpen={true}
        onClose={onClose}
        onCreated={onCreated}
        defaultCourse="BCA"
      />
    );

    const semesterInput = screen.getByPlaceholderText(/e.g. 4th Semester/i);
    fireEvent.change(semesterInput, { target: { value: '4th Semester' } });

    const rollInput = screen.getByPlaceholderText(/e.g. 2300582910/i);
    fireEvent.change(rollInput, { target: { value: '2300582910' } });

    const submitBtn = screen.getByRole('button', { name: /Activate Result Watcher/i });
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(updatesService.createResultWatcher).toHaveBeenCalledWith({
        institution: expect.stringContaining('MGKVP'),
        course: 'BCA',
        semester: '4th Semester',
        roll_number: '2300582910',
      });
      expect(onCreated).toHaveBeenCalledWith(mockCreated);
    });
  });
});
