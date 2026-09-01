import type { ScheduleEvent, RecurrenceRule } from '../types/schedule';
import { getUserSupabaseClient, isUserSupabaseConfigured } from './supabaseClient';
import { loadLocalEvents, saveLocalEvents } from './storageService';
import type { DatabaseScheduleRow } from '../types/database';
import { format, parseISO, addDays, addWeeks, addMonths, addYears, isBefore, isAfter } from 'date-fns';

const isUUID = (str?: string): boolean =>
  typeof str === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(str);

function mapRowToEvent(row: DatabaseScheduleRow): ScheduleEvent {
  return {
    id: row.id,
    title: row.title,
    description: row.description || '',
    startTime: row.start_time,
    endTime: row.end_time,
    isAllDay: row.is_all_day,
    category: (row.category || 'general') as any,
    priority: (row.priority || 'medium') as any,
    status: (row.status || 'pending') as any,
    location: row.location || '',
    meetingUrl: row.meeting_url || '',
    recurrenceRule: (row.recurrence_rule || 'none') as RecurrenceRule,
    createdBy: row.created_by,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function mapEventToRow(event: ScheduleEvent): Partial<DatabaseScheduleRow> {
  return {
    id: event.id,
    title: event.title,
    description: event.description,
    start_time: event.startTime,
    end_time: event.endTime,
    is_all_day: event.isAllDay,
    category: event.category,
    priority: event.priority,
    status: event.status,
    location: event.location,
    meeting_url: event.meetingUrl,
    recurrence_rule: event.recurrenceRule,
    created_by: event.createdBy || 'User',
    updated_at: new Date().toISOString(),
  };
}

export async function fetchAllEvents(): Promise<ScheduleEvent[]> {
  const supabase = getUserSupabaseClient();
  if (supabase && isUserSupabaseConfigured()) {
    try {
      const { data, error } = await supabase
        .from('schedules')
        .select('*')
        .order('start_time', { ascending: true });

      if (!error && data) {
        const events = data.map(mapRowToEvent);
        saveLocalEvents(events);
        return events;
      }
      console.warn('User Supabase fetch failed, falling back to local:', error?.message);
    } catch (err) {
      console.warn('User Supabase error:', err);
    }
  }

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

  const supabase = getUserSupabaseClient();
  if (supabase && isUserSupabaseConfigured()) {
    try {
      const targetEvents = mode === 'replace' ? finalEvents : eventsList;
      const rows = targetEvents.map(evt => {
        const row = mapEventToRow(evt);
        if (!isUUID(evt.id)) {
          delete row.id;
        }
        return row;
      });

      if (rows.length > 0) {
        await supabase.from('schedules').upsert(rows);
      }
    } catch (err) {
      console.warn('User Supabase bulk save error:', err);
    }
  }

  return finalEvents;
}

export async function createEvent(eventData: Omit<ScheduleEvent, 'id' | 'createdAt' | 'updatedAt'>): Promise<ScheduleEvent> {
  const newEvent: ScheduleEvent = {
    ...eventData,
    id: 'evt_' + Math.random().toString(36).substring(2, 11),
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  const supabase = getUserSupabaseClient();
  if (supabase && isUserSupabaseConfigured()) {
    try {
      const row = mapEventToRow(newEvent);
      const { data, error } = await supabase
        .from('schedules')
        .insert([
          {
            title: row.title,
            description: row.description,
            start_time: row.start_time,
            end_time: row.end_time,
            is_all_day: row.is_all_day,
            category: row.category,
            priority: row.priority,
            status: row.status,
            location: row.location,
            meeting_url: row.meeting_url,
            recurrence_rule: row.recurrence_rule,
            created_by: row.created_by,
          }
        ])
        .select()
        .single();

      if (!error && data) {
        const created = mapRowToEvent(data);
        const local = loadLocalEvents();
        saveLocalEvents([created, ...local]);
        return created;
      }
      console.warn('User Supabase insert failed, saving locally:', error?.message);
    } catch (err) {
      console.warn('User Supabase insert error:', err);
    }
  }

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

  const supabase = getUserSupabaseClient();
  if (supabase && isUserSupabaseConfigured() && isUUID(event.id)) {
    try {
      const row = mapEventToRow(updatedEvent);
      const { data, error } = await supabase
        .from('schedules')
        .update(row)
        .eq('id', event.id)
        .select()
        .single();

      if (!error && data) {
        const saved = mapRowToEvent(data);
        const local = loadLocalEvents();
        saveLocalEvents(local.map(e => (e.id === event.id ? saved : e)));
        return saved;
      }
    } catch (err) {
      console.warn('User Supabase update error:', err);
    }
  }

  const local = loadLocalEvents();
  const updatedList = local.map(e => (e.id === event.id ? updatedEvent : e));
  saveLocalEvents(updatedList);
  return updatedEvent;
}

export async function deleteEvent(id: string): Promise<boolean> {
  const supabase = getUserSupabaseClient();
  if (supabase && isUserSupabaseConfigured() && isUUID(id)) {
    try {
      await supabase.from('schedules').delete().eq('id', id);
    } catch (err) {
      console.warn('User Supabase delete error:', err);
    }
  }

  const local = loadLocalEvents();
  const updatedList = local.filter(e => e.id !== id);
  saveLocalEvents(updatedList);
  return true;
}

export function subscribeToRealtimeUserSchedules(onUpdate: (payload: any) => void): () => void {
  const supabase = getUserSupabaseClient();
  if (!supabase || !isUserSupabaseConfigured()) {
    return () => {};
  }

  const channel = supabase
    .channel('public:user_schedules')
    .on('postgres_changes', { event: '*', schema: 'public', table: 'schedules' }, payload => {
      onUpdate(payload);
    })
    .subscribe();

  return () => {
    supabase.removeChannel(channel);
  };
}

/**
 * Expand recurring events across a given visible date range
 */
export function expandRecurringEvents(events: ScheduleEvent[], viewStart: Date, viewEnd: Date): ScheduleEvent[] {
  const expanded: ScheduleEvent[] = [];

  for (const event of events) {
    if (!event.startTime || !event.endTime) continue;

    let origStart: Date;
    let origEnd: Date;
    try {
      origStart = parseISO(event.startTime);
      origEnd = parseISO(event.endTime);
      if (isNaN(origStart.getTime()) || isNaN(origEnd.getTime())) continue;
    } catch {
      continue;
    }

    const duration = Math.max(0, origEnd.getTime() - origStart.getTime());

    if (!event.recurrenceRule || event.recurrenceRule === 'none') {
      expanded.push(event);
      continue;
    }

    // Fast-forward start date close to viewStart to handle old recurring series correctly
    let currentStart = origStart;
    if (isBefore(origStart, viewStart)) {
      const msDiff = viewStart.getTime() - origStart.getTime();
      switch (event.recurrenceRule) {
        case 'daily': {
          const daysToJump = Math.max(0, Math.floor(msDiff / (24 * 3600 * 1000)) - 1);
          currentStart = addDays(origStart, daysToJump);
          break;
        }
        case 'weekly': {
          const weeksToJump = Math.max(0, Math.floor(msDiff / (7 * 24 * 3600 * 1000)) - 1);
          currentStart = addWeeks(origStart, weeksToJump);
          break;
        }
        case 'monthly': {
          const monthsToJump = Math.max(0, (viewStart.getFullYear() - origStart.getFullYear()) * 12 + (viewStart.getMonth() - origStart.getMonth()) - 1);
          currentStart = addMonths(origStart, monthsToJump);
          break;
        }
        case 'yearly': {
          const yearsToJump = Math.max(0, viewStart.getFullYear() - origStart.getFullYear() - 1);
          currentStart = addYears(origStart, yearsToJump);
          break;
        }
      }
    }

    // Generate visible instances in the range
    let iterations = 0;
    const maxInstances = 200; // safety ceiling per visible window

    while (isBefore(currentStart, viewEnd) && iterations < maxInstances) {
      const currentEnd = new Date(currentStart.getTime() + duration);

      // Check if instance overlaps view range
      if (!isBefore(currentEnd, viewStart) && !isAfter(currentStart, viewEnd)) {
        const isOriginal = currentStart.getTime() === origStart.getTime();
        expanded.push({
          ...event,
          id: isOriginal ? event.id : `${event.id}_rec_${currentStart.getTime()}`,
          startTime: currentStart.toISOString(),
          endTime: currentEnd.toISOString(),
        });
      }

      iterations++;
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
          iterations = maxInstances;
          break;
      }
    }
  }

  return expanded.sort((a, b) => {
    const tA = new Date(a.startTime).getTime();
    const tB = new Date(b.startTime).getTime();
    return tA - tB;
  });
}

/**
 * Export schedule to .ics (iCalendar) format
 */
export function exportToICal(events: ScheduleEvent[] = []): string {
  const safeEvents = Array.isArray(events) ? events.filter(Boolean) : [];
  const formatICSDate = (isoStr?: string) => {
    if (!isoStr) return format(new Date(), "yyyyMMdd'T'HHmmss'Z'");
    try {
      const d = parseISO(isoStr);
      if (isNaN(d.getTime())) return format(new Date(), "yyyyMMdd'T'HHmmss'Z'");
      return format(d, "yyyyMMdd'T'HHmmss'Z'");
    } catch {
      return format(new Date(), "yyyyMMdd'T'HHmmss'Z'");
    }
  };

  const lines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//ScheduleManager//Free Edition//EN',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
  ];

  safeEvents.forEach(event => {
    lines.push('BEGIN:VEVENT');
    lines.push(`UID:${event.id || ('evt_' + Math.random().toString(36).substring(2, 9))}@schedulemanager.local`);
    lines.push(`DTSTAMP:${formatICSDate(new Date().toISOString())}`);
    lines.push(`DTSTART:${formatICSDate(event.startTime)}`);
    lines.push(`DTEND:${formatICSDate(event.endTime || event.startTime)}`);
    lines.push(`SUMMARY:${(event.title || 'Untitled Event').replace(/,/g, '\\,')}`);
    if (event.description) {
      lines.push(`DESCRIPTION:${String(event.description).replace(/\n/g, '\\n').replace(/,/g, '\\,')}`);
    }
    if (event.location) {
      lines.push(`LOCATION:${String(event.location).replace(/,/g, '\\,')}`);
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
export function exportToCSV(events: ScheduleEvent[] = []): string {
  const safeEvents = Array.isArray(events) ? events.filter(Boolean) : [];
  const headers = ['ID', 'Title', 'Description', 'StartTime', 'EndTime', 'IsAllDay', 'Category', 'Priority', 'Status', 'Location', 'MeetingUrl', 'Recurrence'];
  const rows = safeEvents.map(e => [
    `"${e.id || ''}"`,
    `"${String(e.title || '').replace(/"/g, '""')}"`,
    `"${String(e.description || '').replace(/"/g, '""')}"`,
    `"${e.startTime || ''}"`,
    `"${e.endTime || ''}"`,
    `"${Boolean(e.isAllDay)}"`,
    `"${e.category || 'general'}"`,
    `"${e.priority || 'medium'}"`,
    `"${e.status || 'pending'}"`,
    `"${String(e.location || '').replace(/"/g, '""')}"`,
    `"${String(e.meetingUrl || '').replace(/"/g, '""')}"`,
    `"${e.recurrenceRule || 'none'}"`
  ].join(','));

  return [headers.join(','), ...rows].join('\n');
}

/**
 * Export all data to JSON backup
 */
export function exportToJSON(events: ScheduleEvent[] = []): string {
  return JSON.stringify(events || [], null, 2);
}

/**
 * Export schedule and announcements as clean, readable plain text
 */
export function exportToPlainText(events: ScheduleEvent[] = [], announcements: any[] = []): string {
  const safeEvents = Array.isArray(events) ? events.filter(Boolean) : [];
  const safeAnnos = Array.isArray(announcements) ? announcements.filter(Boolean) : [];
  const exportDate = format(new Date(), 'EEEE, MMMM d, yyyy h:mm a');

  const safeFormatDate = (isoStr?: string, fmt: string = 'EEE, MMM d, yyyy h:mm a') => {
    if (!isoStr) return 'N/A';
    try {
      const d = parseISO(isoStr);
      if (isNaN(d.getTime())) return isoStr;
      return format(d, fmt);
    } catch {
      return isoStr;
    }
  };

  const lines: string[] = [
    '============================================================',
    'SCHEDY — PLAIN TEXT EXPORT',
    `Export Date: ${exportDate}`,
    `Total Events: ${safeEvents.length} | Total Announcements: ${safeAnnos.length}`,
    '============================================================',
    '',
    '------------------------------------------------------------',
    'SCHEDULE & EVENTS',
    '------------------------------------------------------------',
  ];

  if (safeEvents.length === 0) {
    lines.push('No scheduled events found.');
  } else {
    // Sort chronologically
    const sorted = [...safeEvents].sort((a, b) => {
      const timeA = a.startTime ? new Date(a.startTime).getTime() : 0;
      const timeB = b.startTime ? new Date(b.startTime).getTime() : 0;
      return timeA - timeB;
    });
    sorted.forEach((event, idx) => {
      const startStr = safeFormatDate(event.startTime, 'EEE, MMM d, yyyy h:mm a');
      const endStr = safeFormatDate(event.endTime, 'h:mm a');
      const timeDisplay = event.isAllDay ? `${safeFormatDate(event.startTime, 'EEE, MMM d, yyyy')} (All Day)` : `${startStr} - ${endStr}`;
      
      lines.push('');
      lines.push(`${idx + 1}. [${String(event.status || 'pending').toUpperCase()}] ${event.title || 'Untitled'}`);
      lines.push(`   - When:       ${timeDisplay}`);
      lines.push(`   - Category:   ${event.category || 'general'} | Priority: ${event.priority || 'medium'}`);
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

  if (safeAnnos.length > 0) {
    lines.push('');
    lines.push('------------------------------------------------------------');
    lines.push('ANNOUNCEMENTS & BULLETINS');
    lines.push('------------------------------------------------------------');
    safeAnnos.forEach((anno, idx) => {
      const createdStr = safeFormatDate(anno.createdAt, 'EEE, MMM d, yyyy h:mm a');
      lines.push('');
      lines.push(`${idx + 1}. ${anno.isPinned ? '[PINNED] ' : ''}[${String(anno.priority || 'important').toUpperCase()}] ${anno.title || 'Untitled'}`);
      lines.push(`   • Author:   ${anno.authorName || 'Admin'} (${createdStr})`);
      lines.push(`   • Category: ${anno.category || 'General'}`);
      lines.push(`   • Content:  ${anno.content || ''}`);
    });
  }

  lines.push('');
  lines.push('============================================================');
  lines.push('End of Schedy Plain Text Export');
  lines.push('============================================================');

  return lines.join('\n');
}

