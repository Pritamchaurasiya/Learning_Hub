import { describe, it, expect, vi, beforeEach } from 'vitest';
import { screen, fireEvent, waitFor } from '@testing-library/react';
import { render } from '../../test/test-utils';
import { CollegeCircularModal } from './CollegeCircularModal';
import { updatesService } from '../../services/updatesService';

vi.mock('../../services/updatesService', () => ({
  updatesService: {
    publishCollegeCircular: vi.fn(),
  },
}));

describe('CollegeCircularModal Component', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('does not render when isOpen is false', () => {
    const { container } = render(
      <CollegeCircularModal isOpen={false} onClose={vi.fn()} />
    );
    expect(container.firstChild).toBeNull();
  });

  it('renders modal elements properly when open', () => {
    render(
      <CollegeCircularModal isOpen={true} onClose={vi.fn()} />
    );

    expect(screen.getByText('College Notice Desk')).toBeInTheDocument();
    expect(screen.getByText('Verified Portal')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Publish Official Circular/i })).toBeInTheDocument();
  });

  it('submits form with user inputs and invokes onCircularPublished', async () => {
    const mockPublishedCircular = {
      id: 'upd-dept-123',
      title: 'Lab Examination Practical Dates',
      summary: 'All BCA students must assemble in Lab 3 at 9:00 AM.',
      category: 'ACADEMIC',
      sub_category: 'DEPARTMENTAL_CIRCULAR',
      institution: 'Kashi Institute of Technology',
      department: 'Computer Science & Engineering',
      issuer_name: 'Prof. Rajesh Sharma',
      issuer_role: 'HEAD_OF_DEPARTMENT',
      circular_number: 'KIT/CSE/2026/089',
      importance: 'NORMAL',
      status: 'PUBLISHED',
      verification_status: 'VERIFIED',
      version: 1,
      created_at: new Date().toISOString(),
    };

    vi.mocked(updatesService.publishCollegeCircular).mockResolvedValueOnce(mockPublishedCircular as any);

    const onPublishedMock = vi.fn();
    const onCloseMock = vi.fn();

    render(
      <CollegeCircularModal
        isOpen={true}
        onClose={onCloseMock}
        onCircularPublished={onPublishedMock}
      />
    );

    // Fill form
    fireEvent.change(screen.getByPlaceholderText(/e\.g\., Computer Science Practical Lab/i), {
      target: { value: 'Lab Examination Practical Dates' },
    });
    fireEvent.change(screen.getByPlaceholderText(/e\.g\., Kashi Institute of Technology/i), {
      target: { value: 'Kashi Institute of Technology' },
    });
    fireEvent.change(screen.getByPlaceholderText(/e\.g\., Prof\. Rajesh Sharma/i), {
      target: { value: 'Prof. Rajesh Sharma' },
    });
    fireEvent.change(screen.getByPlaceholderText(/Paste official notification text/i), {
      target: { value: 'All BCA students must assemble in Lab 3 at 9:00 AM.' },
    });

    fireEvent.click(screen.getByRole('button', { name: /Publish Official Circular/i }));

    await waitFor(() => {
      expect(updatesService.publishCollegeCircular).toHaveBeenCalledTimes(1);
      expect(screen.getByText(/Authenticated departmental circular published successfully!/i)).toBeInTheDocument();
    });
  });
});
