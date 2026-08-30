import type { ScheduleEvent } from '../types/schedule';
import { loadLocalEvents, saveLocalEvents } from './storageService';
import { format, parseISO, addDays, addWeeks, addMonths, addYears, isBefore, isAfter } from 'date-fns';



export async function fetchAllEvents(): Promise<ScheduleEvent[]> {
  return loadLocalEvents();
}

export async function bulkSaveEvents(
  eventsList: ScheduleEvent[],
  mode: 'replace' | 'merge'
): Promise<ScheduleEvent[]> {
  const current = loadLocalEvents();
  let finalEvents: ScheduleEvent[];

  if (mode === 'replace') {
    finalEvents = eventsList;
  } else {
    const existingIds = new Set(current.map(e => e.id));
    const newEvents = eventsList.filter(e => !existingIds.has(e.id));
    finalEvents = [...current, ...newEvents];
  }

  saveLocalEvents(finalEvents);
  return finalEvents;
}

export async function createEvent(eventData: Omit<ScheduleEvent, 'id' | 'createdAt' | 'updatedAt'>): Promise<ScheduleEvent> {
  const newEvent: ScheduleEvent = {
    ...eventData,
    id: 'evt_' + Math.random().toString(36).substring(2, 11),
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  const local = loadLocalEvents();
  const updated = [newEvent, ...local];
  saveLocalEvents(updated);
  return newEvent;
}

export async function updateEvent(event: ScheduleEvent): Promise<ScheduleEvent> {
  const updatedEvent: ScheduleEvent = {
    ...event,
    updatedAt: new Date().toISOString(),
  };

  const local = loadLocalEvents();
  const updatedList = local.map(e => (e.id === event.id ? updatedEvent : e));
  saveLocalEvents(updatedList);
  return updatedEvent;
}

export async function deleteEvent(id: string): Promise<boolean> {
  const local = loadLocalEvents();
  const updatedList = local.filter(e => e.id !== id);
  saveLocalEvents(updatedList);
  return true;
}

/**
 * Expand recurring events across a given visible date range
 */
export function expandRecurringEvents(events: ScheduleEvent[], viewStart: Date, viewEnd: Date): ScheduleEvent[] {
  const expanded: ScheduleEvent[] = [];

  for (const event of events) {
    const origStart = parseISO(event.startTime);
    const origEnd = parseISO(event.endTime);
    const duration = origEnd.getTime() - origStart.getTime();

    if (event.recurrenceRule === 'none') {
      expanded.push(event);
      continue;
    }

    // Generate instances
    let currentStart = origStart;
    let index = 0;
    const maxInstances = 60; // safety limit

    while (isBefore(currentStart, viewEnd) && index < maxInstances) {
      const currentEnd = new Date(currentStart.getTime() + duration);

      if (isAfter(currentEnd, viewStart) || isBefore(currentStart, viewEnd)) {
        expanded.push({
          ...event,
          id: index === 0 ? event.id : `${event.id}_rec_${index}`,
          startTime: currentStart.toISOString(),
          endTime: currentEnd.toISOString(),
        });
      }

      index++;
      switch (event.recurrenceRule) {
        case 'daily':
          currentStart = addDays(currentStart, 1);
          break;
        case 'weekly':
          currentStart = addWeeks(currentStart, 1);
          break;
        case 'monthly':
          currentStart = addMonths(currentStart, 1);
          break;
        case 'yearly':
          currentStart = addYears(currentStart, 1);
          break;
        default:
          break;
      }
    }
  }

  return expanded.sort((a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime());
}

/**
 * Export schedule to .ics (iCalendar) format
 */
export function exportToICal(events: ScheduleEvent[]): string {
  const formatICSDate = (isoStr: string) => {
    return format(parseISO(isoStr), "yyyyMMdd'T'HHmmss'Z'");
  };

  const lines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//ScheduleManager//Free Edition//EN',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
  ];

  events.forEach(event => {
    lines.push('BEGIN:VEVENT');
    lines.push(`UID:${event.id}@schedulemanager.local`);
    lines.push(`DTSTAMP:${formatICSDate(new Date().toISOString())}`);
    lines.push(`DTSTART:${formatICSDate(event.startTime)}`);
    lines.push(`DTEND:${formatICSDate(event.endTime)}`);
    lines.push(`SUMMARY:${event.title.replace(/,/g, '\\,')}`);
    if (event.description) {
      lines.push(`DESCRIPTION:${event.description.replace(/\n/g, '\\n').replace(/,/g, '\\,')}`);
    }
    if (event.location) {
      lines.push(`LOCATION:${event.location.replace(/,/g, '\\,')}`);
    }
    if (event.recurrenceRule && event.recurrenceRule !== 'none') {
      const freqMap: Record<string, string> = {
        daily: 'DAILY',
        weekly: 'WEEKLY',
        monthly: 'MONTHLY',
        yearly: 'YEARLY',
      };
      lines.push(`RRULE:FREQ=${freqMap[event.recurrenceRule] || 'DAILY'}`);
    }
    lines.push('STATUS:CONFIRMED');
    lines.push('END:VEVENT');
  });

  lines.push('END:VCALENDAR');
  return lines.join('\r\n');
}

/**
 * Export schedule to CSV format
 */
export function exportToCSV(events: ScheduleEvent[]): string {
  const headers = ['ID', 'Title', 'Description', 'StartTime', 'EndTime', 'IsAllDay', 'Category', 'Priority', 'Status', 'Location', 'MeetingUrl', 'Recurrence'];
  const rows = events.map(e => [
    `"${e.id}"`,
    `"${e.title.replace(/"/g, '""')}"`,
    `"${(e.description || '').replace(/"/g, '""')}"`,
    `"${e.startTime}"`,
    `"${e.endTime}"`,
    `"${e.isAllDay}"`,
    `"${e.category}"`,
    `"${e.priority}"`,
    `"${e.status}"`,
    `"${(e.location || '').replace(/"/g, '""')}"`,
    `"${(e.meetingUrl || '').replace(/"/g, '""')}"`,
    `"${e.recurrenceRule}"`
  ].join(','));

  return [headers.join(','), ...rows].join('\n');
}

/**
 * Export all data to JSON backup
 */
export function exportToJSON(events: ScheduleEvent[]): string {
  return JSON.stringify(events, null, 2);
}

/**
 * Export schedule and announcements as clean, readable plain text
 */
export function exportToPlainText(events: ScheduleEvent[], announcements: any[] = []): string {
  const exportDate = format(new Date(), 'EEEE, MMMM d, yyyy h:mm a');
  const lines: string[] = [
    '============================================================',
    'SCHEDY — PLAIN TEXT EXPORT',
    `Export Date: ${exportDate}`,
    `Total Events: ${events.length} | Total Announcements: ${announcements.length}`,
    '============================================================',
    '',
    '------------------------------------------------------------',
    'SCHEDULE & EVENTS',
    '------------------------------------------------------------',
  ];

  if (events.length === 0) {
    lines.push('No scheduled events found.');
  } else {
    // Sort chronologically
    const sorted = [...events].sort((a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime());
    sorted.forEach((event, idx) => {
      const startStr = format(parseISO(event.startTime), 'EEE, MMM d, yyyy h:mm a');
      const endStr = format(parseISO(event.endTime), 'h:mm a');
      const timeDisplay = event.isAllDay ? `${format(parseISO(event.startTime), 'EEE, MMM d, yyyy')} (All Day)` : `${startStr} - ${endStr}`;
      
      lines.push('');
      lines.push(`${idx + 1}. [${event.status.toUpperCase()}] ${event.title}`);
      lines.push(`   - When:       ${timeDisplay}`);
      lines.push(`   - Category:   ${event.category} | Priority: ${event.priority}`);
      if (event.recurrenceRule && event.recurrenceRule !== 'none') {
        lines.push(`   - Recurrence: ${event.recurrenceRule}`);
      }
      if (event.location) {
        lines.push(`   - Location:   ${event.location}`);
      }
      if (event.meetingUrl) {
        lines.push(`   - Link:       ${event.meetingUrl}`);
      }
      if (event.description) {
        lines.push(`   - Notes:      ${event.description}`);
      }
    });
  }

  if (announcements.length > 0) {
    lines.push('');
    lines.push('------------------------------------------------------------');
    lines.push('ANNOUNCEMENTS & BULLETINS');
    lines.push('------------------------------------------------------------');
    announcements.forEach((anno, idx) => {
      const createdStr = format(parseISO(anno.createdAt), 'EEE, MMM d, yyyy h:mm a');
      lines.push('');
      lines.push(`${idx + 1}. ${anno.isPinned ? '[PINNED] ' : ''}[${anno.priority.toUpperCase()}] ${anno.title}`);
      lines.push(`   • Author:   ${anno.authorName} (${createdStr})`);
      lines.push(`   • Category: ${anno.category || 'General'}`);
      lines.push(`   • Content:  ${anno.content}`);
    });
  }

  lines.push('');
  lines.push('============================================================');
  lines.push('End of Schedy Plain Text Export');
  lines.push('============================================================');

  return lines.join('\n');
}

