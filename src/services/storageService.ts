import type { ScheduleEvent } from '../types/schedule';
import type { Announcement, AnnouncementRead } from '../types/announcement';

const LOCAL_EVENTS_KEY = 'schedule_manager_events_v1';
const LOCAL_ANNOUNCEMENTS_KEY = 'schedule_manager_announcements_v1';
const LOCAL_READS_KEY = 'schedule_manager_reads_v1';
const USER_ID_KEY = 'schedule_manager_user_id';

export function getOrCreateUserId(): string {
  let userId = localStorage.getItem(USER_ID_KEY);
  if (!userId) {
    userId = 'user_' + Math.random().toString(36).substring(2, 9);
    localStorage.setItem(USER_ID_KEY, userId);
  }
  return userId;
}

export function getInitialEvents(): ScheduleEvent[] {
  return [];
}

export function getInitialAnnouncements(): Announcement[] {
  return [];
}

export function loadLocalEvents(): ScheduleEvent[] {
  try {
    const raw = localStorage.getItem(LOCAL_EVENTS_KEY);
    if (!raw) {
      const initial = getInitialEvents();
      saveLocalEvents(initial);
      return initial;
    }
    const parsed: ScheduleEvent[] = JSON.parse(raw);
    // Filter out old placeholder demo events
    const filtered = parsed.filter(e => !e.id.startsWith('event-demo-'));
    if (filtered.length !== parsed.length) {
      saveLocalEvents(filtered);
    }
    return filtered;
  } catch (e) {
    console.error('Failed to load local events:', e);
    return getInitialEvents();
  }
}

export function saveLocalEvents(events: ScheduleEvent[]): void {
  try {
    localStorage.setItem(LOCAL_EVENTS_KEY, JSON.stringify(events));
  } catch (e) {
    console.error('Failed to save local events:', e);
  }
}

export function loadLocalAnnouncements(): Announcement[] {
  try {
    const raw = localStorage.getItem(LOCAL_ANNOUNCEMENTS_KEY);
    if (!raw) {
      const initial = getInitialAnnouncements();
      saveLocalAnnouncements(initial);
      return initial;
    }
    const parsed: Announcement[] = JSON.parse(raw);
    // Remove all old demo & welcome notices, keep only user-created custom announcements
    const filtered = parsed.filter(
      a =>
        a.id !== 'anno-demo-1' &&
        a.id !== 'anno-demo-2' &&
        a.id !== 'anno-demo-3' &&
        a.id !== 'anno-welcome'
    );

    if (filtered.length !== parsed.length) {
      saveLocalAnnouncements(filtered);
    }
    return filtered;
  } catch (e) {
    console.error('Failed to load local announcements:', e);
    return getInitialAnnouncements();
  }
}

export function saveLocalAnnouncements(announcements: Announcement[]): void {
  try {
    localStorage.setItem(LOCAL_ANNOUNCEMENTS_KEY, JSON.stringify(announcements));
  } catch (e) {
    console.error('Failed to save local announcements:', e);
  }
}


export function loadLocalReads(): AnnouncementRead[] {
  try {
    const raw = localStorage.getItem(LOCAL_READS_KEY);
    if (!raw) return [];
    return JSON.parse(raw);
  } catch (e) {
    return [];
  }
}

export function saveLocalReads(reads: AnnouncementRead[]): void {
  try {
    localStorage.setItem(LOCAL_READS_KEY, JSON.stringify(reads));
  } catch (e) {
    console.error('Failed to save reads:', e);
  }
}
