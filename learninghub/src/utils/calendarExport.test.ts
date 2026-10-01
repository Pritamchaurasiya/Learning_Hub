import { describe, it, expect, vi } from 'vitest';
import {
  generateICSContent,
  generateGoogleCalendarUrl,
  downloadICSFile,
  type CalendarEvent,
} from './calendarExport';

describe('calendarExport Utility', () => {
  const mockEvent: CalendarEvent = {
    title: 'MGKVP BCA Exam Form Deadline',
    description: 'Last date to submit online exam forms.',
    startDate: '2026-10-15T18:30:00.000Z',
    location: 'MGKVP Varanasi',
    url: 'https://mgkvp.ac.in/notice',
  };

  it('generates valid RFC 5545 iCalendar content', () => {
    const ics = generateICSContent(mockEvent);

    expect(ics).toContain('BEGIN:VCALENDAR');
    expect(ics).toContain('VERSION:2.0');
    expect(ics).toContain('BEGIN:VEVENT');
    expect(ics).toContain('SUMMARY:MGKVP BCA Exam Form Deadline');
    expect(ics).toContain('DESCRIPTION:Last date to submit online exam forms.');
    expect(ics).toContain('LOCATION:MGKVP Varanasi');
    expect(ics).toContain('URL:https://mgkvp.ac.in/notice');
    expect(ics).toContain('END:VEVENT');
    expect(ics).toContain('END:VCALENDAR');
  });

  it('escapes special characters in ICS summary and description', () => {
    const eventWithSpecials: CalendarEvent = {
      title: 'Exam Notice; Part 1, Section 2',
      description: 'Line 1\nLine 2, with comma and semicolon;',
      startDate: new Date('2026-10-20T10:00:00Z'),
    };

    const ics = generateICSContent(eventWithSpecials);
    expect(ics).toContain('SUMMARY:Exam Notice\\; Part 1\\, Section 2');
    expect(ics).toContain('DESCRIPTION:Line 1\\nLine 2\\, with comma and semicolon\\;');
  });

  it('generates correct Google Calendar template URL', () => {
    const url = generateGoogleCalendarUrl(mockEvent);

    expect(url).toContain('https://calendar.google.com/calendar/render');
    expect(url).toContain('action=TEMPLATE');
    expect(url).toContain('MGKVP+BCA+Exam+Form+Deadline');
    expect(url).toContain('location=MGKVP+Varanasi');
  });

  it('creates DOM link and triggers download in downloadICSFile', () => {
    const appendChildSpy = vi.spyOn(document.body, 'appendChild');
    const removeChildSpy = vi.spyOn(document.body, 'removeChild');

    // Mock URL.createObjectURL and revokeObjectURL
    const originalCreate = URL.createObjectURL;
    const originalRevoke = URL.revokeObjectURL;
    URL.createObjectURL = vi.fn().mockReturnValue('blob:mock-url');
    URL.revokeObjectURL = vi.fn();

    downloadICSFile('test-event.ics', mockEvent);

    expect(appendChildSpy).toHaveBeenCalled();
    expect(removeChildSpy).toHaveBeenCalled();
    expect(URL.revokeObjectURL).toHaveBeenCalledWith('blob:mock-url');

    URL.createObjectURL = originalCreate;
    URL.revokeObjectURL = originalRevoke;
  });
});
