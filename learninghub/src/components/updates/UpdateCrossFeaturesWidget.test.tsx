import { describe, it, expect, vi, beforeEach } from 'vitest';
import { screen, fireEvent, waitFor } from '@testing-library/react';
import { render } from '../../test/test-utils';
import { UpdateCrossFeaturesWidget } from './UpdateCrossFeaturesWidget';
import { updatesService } from '../../services/updatesService';
import * as calendarModule from '../../utils/calendarExport';
import type { UpdateCrossLink, StudentUpdate } from '../../types/updates';

vi.mock('../../services/updatesService', () => ({
  updatesService: {
    generateSynergyCrossLinks: vi.fn(),
    syncToStudyPlanner: vi.fn(),
  },
}));

vi.mock('../../utils/calendarExport', () => ({
  downloadICSFile: vi.fn(),
  generateGoogleCalendarUrl: vi.fn().mockReturnValue('https://calendar.google.com/render?mock=1'),
}));

describe('UpdateCrossFeaturesWidget', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders nothing when crossLinks and update are both empty or null', () => {
    const { container: container1 } = render(<UpdateCrossFeaturesWidget crossLinks={[]} />);
    expect(container1.firstChild).toBeNull();

    const { container: container2 } = render(<UpdateCrossFeaturesWidget crossLinks={undefined} />);
    expect(container2.firstChild).toBeNull();
  });

  it('renders provided cross links with correct attributes', () => {
    const mockLinks: UpdateCrossLink[] = [
      {
        id: 'link-1',
        content_type: 'TEST',
        target_id: 'test-dsa-1',
        title: 'Take BCA DSA Practice Test',
        action_cta: 'Start Test',
        action_url: '/tests/a',
      },
      {
        id: 'link-2',
        content_type: 'EBOOK',
        target_id: 'ebook-sql-1',
        title: 'Read Database Systems Notes',
        action_cta: 'Read Ebook',
        action_url: '/ebooks',
      },
    ];

    render(<UpdateCrossFeaturesWidget crossLinks={mockLinks} />);

    expect(screen.getByText('Exam Preparation & Calendar Synergy')).toBeInTheDocument();
    expect(screen.getByText('Take BCA DSA Practice Test')).toBeInTheDocument();
    expect(screen.getByText('Start Test')).toBeInTheDocument();
    expect(screen.getByText('Read Database Systems Notes')).toBeInTheDocument();

    const testLink = screen.getByText('Take BCA DSA Practice Test').closest('a');
    expect(testLink).toHaveAttribute('href', '/tests/a');
  });

  it('dynamically generates synergy links when update is provided without explicit crossLinks', () => {
    const mockUpdate: StudentUpdate = {
      id: 'upd-dynamic-1',
      title: 'AKTU B.Tech Even Semester Exam Notice',
      summary: 'Exam dates released for B.Tech CSE students.',
      source_url: 'https://aktu.ac.in',
      category: 'EXAMINATION',
      sub_category: 'EXAM_FORM',
      institution: 'AKTU Lucknow',
      course: 'B.Tech CSE',
      importance: 'URGENT',
      status: 'PUBLISHED',
      verification_status: 'VERIFIED',
      version: 1,
      created_at: new Date().toISOString(),
    };

    vi.mocked(updatesService.generateSynergyCrossLinks).mockReturnValueOnce([
      {
        id: 'syn-1',
        content_type: 'TEST',
        target_id: 'test-aktu-cse',
        title: 'Take B.Tech CSE Mock Assessment (Test A+)',
        action_cta: 'Start Assessment',
        action_url: '/tests/a?search=B.Tech%20CSE',
      },
    ]);

    render(<UpdateCrossFeaturesWidget update={mockUpdate} />);

    expect(updatesService.generateSynergyCrossLinks).toHaveBeenCalledWith(mockUpdate);
    expect(screen.getByText('Take B.Tech CSE Mock Assessment (Test A+)')).toBeInTheDocument();
  });

  it('handles Study Planner sync and Calendar exports when deadline is present', async () => {
    const mockUpdateWithDeadline: StudentUpdate = {
      id: 'upd-deadline-1',
      title: 'MGKVP Exam Form Deadline',
      summary: 'Last date for forms.',
      source_url: 'https://mgkvp.ac.in',
      category: 'EXAMINATION',
      sub_category: 'EXAM_FORM',
      institution: 'MGKVP',
      course: 'BCA',
      importance: 'URGENT',
      status: 'PUBLISHED',
      verification_status: 'VERIFIED',
      version: 1,
      deadline: '2026-10-25T18:30:00Z',
      created_at: new Date().toISOString(),
    };

    vi.mocked(updatesService.syncToStudyPlanner).mockResolvedValueOnce(true);

    render(<UpdateCrossFeaturesWidget update={mockUpdateWithDeadline} />);

    expect(screen.getByText(/Deadline Date:/i)).toBeInTheDocument();

    const plannerBtn = screen.getByRole('button', { name: /Add to Study Planner/i });
    expect(plannerBtn).toBeInTheDocument();
    fireEvent.click(plannerBtn);

    await waitFor(() => {
      expect(updatesService.syncToStudyPlanner).toHaveBeenCalledWith(mockUpdateWithDeadline);
      expect(screen.getByText('Synced to Planner')).toBeInTheDocument();
    });

    const exportIcsBtn = screen.getByRole('button', { name: /Export \.ics/i });
    fireEvent.click(exportIcsBtn);
    expect(calendarModule.downloadICSFile).toHaveBeenCalled();
  });
});
