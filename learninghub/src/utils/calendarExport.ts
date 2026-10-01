/**
 * RFC 5545 iCalendar (.ics) and Web Calendar Link Generator for LearningHub.
 * Enables seamless 1-click export of university deadlines and exam dates.
 */

export interface CalendarEvent {
  title: string;
  description: string;
  startDate: Date | string;
  endDate?: Date | string;
  location?: string;
  url?: string;
}

function formatDateToICS(dateInput: Date | string): string {
  const d = typeof dateInput === 'string' ? new Date(dateInput) : dateInput;
  if (isNaN(d.getTime())) {
    return new Date().toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
  }
  return d.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
}

function escapeICSText(text: string): string {
  return (text || '')
    .replace(/\\/g, '\\\\')
    .replace(/;/g, '\\;')
    .replace(/,/g, '\\,')
    .replace(/\n/g, '\\n');
}

/**
 * Generates an RFC 5545 compliant .ics calendar string.
 */
export function generateICSContent(event: CalendarEvent): string {
  const startStr = formatDateToICS(event.startDate);
  // Default end date is 1 hour after start
  const endStr = event.endDate
    ? formatDateToICS(event.endDate)
    : formatDateToICS(new Date(new Date(event.startDate).getTime() + 3600000));

  const uid = `lh-${Date.now()}-${Math.random().toString(36).substring(2, 9)}@learninghub.com`;
  const nowStr = formatDateToICS(new Date());

  return [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//LearningHub//Student Updates Calendar//EN',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    'BEGIN:VEVENT',
    `UID:${uid}`,
    `DTSTAMP:${nowStr}`,
    `DTSTART:${startStr}`,
    `DTEND:${endStr}`,
    `SUMMARY:${escapeICSText(event.title)}`,
    `DESCRIPTION:${escapeICSText(event.description)}`,
    event.location ? `LOCATION:${escapeICSText(event.location)}` : '',
    event.url ? `URL:${event.url}` : '',
    'STATUS:CONFIRMED',
    'END:VEVENT',
    'END:VCALENDAR',
  ]
    .filter(Boolean)
    .join('\r\n');
}

/**
 * Triggers a browser download of the generated .ics file.
 */
export function downloadICSFile(filename: string, event: CalendarEvent): void {
  const icsContent = generateICSContent(event);
  const blob = new Blob([icsContent], { type: 'text/calendar;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.setAttribute('download', filename.endsWith('.ics') ? filename : `${filename}.ics`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * Generates a direct Google Calendar web event creation URL.
 */
export function generateGoogleCalendarUrl(event: CalendarEvent): string {
  const startStr = formatDateToICS(event.startDate);
  const endStr = event.endDate
    ? formatDateToICS(event.endDate)
    : formatDateToICS(new Date(new Date(event.startDate).getTime() + 3600000));

  const params = new URLSearchParams({
    action: 'TEMPLATE',
    text: event.title,
    dates: `${startStr}/${endStr}`,
    details: `${event.description}${event.url ? `\n\nOfficial Source: ${event.url}` : ''}`,
  });

  if (event.location) {
    params.append('location', event.location);
  }

  return `https://calendar.google.com/calendar/render?${params.toString()}`;
}
