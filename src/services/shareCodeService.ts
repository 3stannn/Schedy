import type { ScheduleEvent, RecurrenceRule, EventCategory, PriorityLevel, EventStatus } from '../types/schedule';
import type { Announcement, AnnouncementPriority } from '../types/announcement';

export interface SyncPayload {
  version: number;
  type: 'schedy_payload' | 'schedulesync_payload';
  createdAt: string;
  count: number;
  events: ScheduleEvent[];
  announcements?: Announcement[];
}

export interface ParseResult {
  success: boolean;
  data?: SyncPayload;
  error?: string;
}

/**
 * URL-safe Base64 encoder (removes padding, uses - and _)
 */
function toBase64Url(str: string): string {
  const b64 = btoa(
    encodeURIComponent(str).replace(/%([0-9A-F]{2})/g, (_, p1) =>
      String.fromCharCode(parseInt(p1, 16))
    )
  );
  return b64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

/**
 * URL-safe Base64 decoder
 */
function fromBase64Url(b64url: string): string {
  let b64 = b64url.replace(/-/g, '+').replace(/_/g, '/');
  while (b64.length % 4) {
    b64 += '=';
  }
  return decodeURIComponent(
    Array.prototype.map
      .call(atob(b64), (c: string) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
      .join('')
  );
}

/**
 * Compact event into an array tuple:
 * [id, title, description, startTime, endTime, isAllDay(0/1), category, priority, status, location, meetingUrl, recurrenceRule]
 */
function compactEvent(e: ScheduleEvent): any[] {
  const tuple = [
    e.id || '',
    e.title || '',
    e.description || '',
    e.startTime || '',
    e.endTime || '',
    e.isAllDay ? 1 : 0,
    e.category || 'general',
    e.priority || 'medium',
    e.status || 'pending',
    e.location || '',
    e.meetingUrl || '',
    e.recurrenceRule || 'none',
  ];
  // Trim trailing empty/default values to minimize code size
  while (tuple.length > 5 && (tuple[tuple.length - 1] === '' || tuple[tuple.length - 1] === 'none' || tuple[tuple.length - 1] === 'pending' || tuple[tuple.length - 1] === 'medium' || tuple[tuple.length - 1] === 'general')) {
    tuple.pop();
  }
  return tuple;
}

/**
 * Expand compact array tuple back to full ScheduleEvent
 */
function expandEvent(t: any[]): ScheduleEvent {
  return {
    id: t[0] || ('evt_' + Math.random().toString(36).substring(2, 9)),
    title: t[1] || 'Untitled Event',
    description: t[2] || '',
    startTime: t[3] || new Date().toISOString(),
    endTime: t[4] || new Date().toISOString(),
    isAllDay: Boolean(t[5]),
    category: (t[6] || 'general') as EventCategory,
    priority: (t[7] || 'medium') as PriorityLevel,
    status: (t[8] || 'pending') as EventStatus,
    location: t[9] || '',
    meetingUrl: t[10] || '',
    recurrenceRule: (t[11] || 'none') as RecurrenceRule,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
}

/**
 * Compact announcement into array tuple:
 * [id, title, content, priority, category, isPinned(0/1), expiresAt, authorName]
 */
function compactAnnouncement(a: Announcement): any[] {
  return [
    a.id || '',
    a.title || '',
    a.content || '',
    a.priority || 'general',
    a.category || 'general',
    a.isPinned ? 1 : 0,
    a.expiresAt || '',
    a.authorName || 'Admin',
  ];
}

/**
 * Expand compact array tuple back to full Announcement
 */
function expandAnnouncement(t: any[]): Announcement {
  return {
    id: t[0] || ('anno_' + Math.random().toString(36).substring(2, 9)),
    title: t[1] || 'Announcement',
    content: t[2] || '',
    priority: (t[3] || 'general') as AnnouncementPriority,
    category: t[4] || 'general',
    isPinned: Boolean(t[5]),
    expiresAt: t[6] || undefined,
    authorName: t[7] || 'Admin',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    isRead: false,
  };
}

/**
 * Generate a concise, highly-compressed Sync Code from current events
 */
export function generateShareCode(
  events: ScheduleEvent[],
  announcements?: Announcement[]
): string {
  const compactPayload = {
    v: 2,
    e: events.map(compactEvent),
    ...(announcements && announcements.length > 0
      ? { a: announcements.map(compactAnnouncement) }
      : {}),
  };

  const jsonStr = JSON.stringify(compactPayload);
  const encoded = toBase64Url(jsonStr);
  return `SCHEDY-${encoded}`;
}

/**
 * Parse and validate a Sync Code or Share URL (supports v2 compact & v1 legacy formats)
 */
export function parseShareCode(input: string): ParseResult {
  try {
    let raw = input.trim();
    if (!raw) {
      return { success: false, error: 'Please enter a sync code or link.' };
    }

    // If a full URL was pasted, extract the ?sync= parameter
    if (raw.includes('?sync=') || raw.includes('&sync=')) {
      try {
        const url = new URL(raw.startsWith('http') ? raw : `http://${raw}`);
        const syncParam = url.searchParams.get('sync');
        if (syncParam) {
          raw = decodeURIComponent(syncParam);
        }
      } catch {
        const match = raw.match(/[?&]sync=([^&#]+)/);
        if (match && match[1]) {
          raw = decodeURIComponent(match[1]);
        }
      }
    }

    // Strip optional "SCHEDY-", "S2-", or legacy "SYNC-" prefix
    let b64 = raw;
    if (raw.startsWith('SCHEDY-')) {
      b64 = raw.substring(7);
    } else if (raw.startsWith('S2-')) {
      b64 = raw.substring(3);
    } else if (raw.startsWith('SYNC-')) {
      b64 = raw.substring(5);
    }

    const decodedStr = fromBase64Url(b64);
    const parsed = JSON.parse(decodedStr);

    // Check for compact v2 schema
    if (parsed && parsed.v === 2 && Array.isArray(parsed.e)) {
      const restoredEvents: ScheduleEvent[] = parsed.e.map(expandEvent);
      const restoredAnnos: Announcement[] = Array.isArray(parsed.a)
        ? parsed.a.map(expandAnnouncement)
        : [];

      return {
        success: true,
        data: {
          version: 2,
          type: 'schedy_payload',
          createdAt: new Date().toISOString(),
          count: restoredEvents.length,
          events: restoredEvents,
          announcements: restoredAnnos,
        },
      };
    }

    // Legacy v1 schema
    if (parsed && Array.isArray(parsed.events)) {
      return {
        success: true,
        data: {
          version: parsed.version || 1,
          type: 'schedy_payload',
          createdAt: parsed.createdAt || new Date().toISOString(),
          count: parsed.events.length,
          events: parsed.events,
          announcements: parsed.announcements || [],
        },
      };
    }

    return { success: false, error: 'Invalid sync code format. No events found.' };
  } catch {
    return {
      success: false,
      error: 'Could not decode sync code. Please check that the code is complete and accurate.',
    };
  }
}

/**
 * Generate full shareable URL with clean short sync code
 */
export function generateShareUrl(code: string): string {
  const base = window.location.origin + window.location.pathname;
  return `${base}?sync=${encodeURIComponent(code)}`;
}

