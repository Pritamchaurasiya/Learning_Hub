import { describe, it, expect, vi } from 'vitest';
import { screen, fireEvent } from '@testing-library/react';
import { render } from '../../test/test-utils';
import { UpdateTimeline } from './UpdateTimeline';
import type { StudentUpdate } from '../../types/updates';

describe('UpdateTimeline', () => {
  it('renders empty message when no updates have deadlines', () => {
    const updatesWithoutDeadlines: StudentUpdate[] = [
      {
        id: 'upd-no-dl',
        title: 'General Circular',
        summary: 'No deadline here',
        source_url: 'https://example.com',
        category: 'ACADEMIC',
        sub_category: 'GENERAL',
        institution: 'University',
        importance: 'NORMAL',
        status: 'PUBLISHED',
        verification_status: 'VERIFIED',
        version: 1,
        published_at: new Date().toISOString(),
        created_at: new Date().toISOString(),
      },
    ];

    render(<UpdateTimeline updates={updatesWithoutDeadlines} onSelectUpdate={vi.fn()} />);

    expect(screen.getByText('No upcoming deadlines detected.')).toBeInTheDocument();
  });

  it('renders sorted deadlines and calls onSelectUpdate on button click', () => {
    const handleSelect = vi.fn();
    const futureDate1 = new Date(Date.now() + 86400000 * 2).toISOString();
    const futureDate2 = new Date(Date.now() + 86400000 * 10).toISOString();

    const mockUpdates: StudentUpdate[] = [
      {
        id: 'upd-later',
        title: 'Later Semester Exam Deadline',
        summary: 'Late deadline notice',
        source_url: 'https://example.com/2',
        category: 'EXAMINATION',
        sub_category: 'TIMETABLE',
        institution: 'AKTU',
        importance: 'NORMAL',
        status: 'PUBLISHED',
        verification_status: 'VERIFIED',
        version: 1,
        deadline: futureDate2,
        published_at: new Date().toISOString(),
        created_at: new Date().toISOString(),
      },
      {
        id: 'upd-sooner',
        title: 'Urgent Examination Registration Closes Soon',
        summary: 'Early deadline notice',
        source_url: 'https://example.com/1',
        category: 'EXAMINATION',
        sub_category: 'REGISTRATION',
        institution: 'MGKVP',
        importance: 'URGENT',
        status: 'PUBLISHED',
        verification_status: 'VERIFIED',
        version: 1,
        deadline: futureDate1,
        published_at: new Date().toISOString(),
        created_at: new Date().toISOString(),
      },
    ];

    render(<UpdateTimeline updates={mockUpdates} onSelectUpdate={handleSelect} />);

    expect(screen.getByText('Urgent Examination Registration Closes Soon')).toBeInTheDocument();
    expect(screen.getByText('Later Semester Exam Deadline')).toBeInTheDocument();

    const soonNotice = screen.getByText('Urgent Examination Registration Closes Soon');
    fireEvent.click(soonNotice);
    // Sooner deadline should be first
    expect(handleSelect).toHaveBeenCalledWith(mockUpdates[1]);
  });
});
