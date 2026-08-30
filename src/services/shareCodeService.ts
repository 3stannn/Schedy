import type { ScheduleEvent } from '../types/schedule';
import type { Announcement } from '../types/announcement';

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
 * UTF-8 safe Base64 encoder
 */
function toBase64(str: string): string {
  return btoa(
    encodeURIComponent(str).replace(/%([0-9A-F]{2})/g, (_, p1) =>
      String.fromCharCode(parseInt(p1, 16))
    )
  );
}

/**
 * UTF-8 safe Base64 decoder
 */
function fromBase64(b64: string): string {
  return decodeURIComponent(
    Array.prototype.map
      .call(atob(b64), (c: string) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
      .join('')
  );
}

/**
 * Generate a self-contained, portable Sync Code from the current events
 */
export function generateShareCode(
  events: ScheduleEvent[],
  announcements?: Announcement[]
): string {
  const payload: SyncPayload = {
    version: 1,
    type: 'schedy_payload',
    createdAt: new Date().toISOString(),
    count: events.length,
    events,
    announcements: announcements || [],
  };

  const jsonStr = JSON.stringify(payload);
  const encoded = toBase64(jsonStr);
  return `SCHEDY-${encoded}`;
}

/**
 * Parse and validate a Sync Code or Share URL
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

    // Strip optional "SCHEDY-" or legacy "SYNC-" prefix
    let b64 = raw;
    if (raw.startsWith('SCHEDY-')) {
      b64 = raw.substring(7);
    } else if (raw.startsWith('SYNC-')) {
      b64 = raw.substring(5);
    }

    const decodedStr = fromBase64(b64);
    const parsed = JSON.parse(decodedStr);

    if (!parsed || !Array.isArray(parsed.events)) {
      return { success: false, error: 'Invalid sync code format. No events found.' };
    }

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
  } catch {
    return {
      success: false,
      error: 'Could not decode sync code. Please check that the code is complete and accurate.',
    };
  }
}

/**
 * Generate full shareable URL
 */
export function generateShareUrl(code: string): string {
  const base = window.location.origin + window.location.pathname;
  return `${base}?sync=${encodeURIComponent(code)}`;
}
