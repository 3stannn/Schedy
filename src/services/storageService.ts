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
  const now = new Date().toISOString();
  return [
    {
      id: 'anno-welcome',
      title: 'Welcome to Schedy',
      content: 'Welcome to Schedy! Use this dashboard to plan your schedule, track events, and stay updated with announcements.',
      priority: 'general',
      category: 'general',
      isPinned: true,
      authorName: 'Developer: Kodekz',
      createdAt: now,
      updatedAt: now,
    }
  ];
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
    // Filter out old demo notices and ensure general pinned welcome announcement exists
    let hasChanges = false;
    let welcomeFound = false;
    const filtered = parsed
      .filter(a => a.id !== 'anno-demo-1' && a.id !== 'anno-demo-2' && a.id !== 'anno-demo-3')
      .map(a => {
        if (a.id === 'anno-welcome') {
          welcomeFound = true;
          const [initialWelcome] = getInitialAnnouncements();
          if (a.priority !== 'general' || !a.isPinned || a.authorName !== initialWelcome.authorName) {
            hasChanges = true;
            return {
              ...a,
              authorName: initialWelcome.authorName,
              priority: 'general' as const,
              isPinned: true,
            };
          }
        }
        return a;
      });


    if (!welcomeFound) {
      const [welcome] = getInitialAnnouncements();
      filtered.unshift(welcome);
      hasChanges = true;
    }

    if (hasChanges || filtered.length !== parsed.length) {
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
