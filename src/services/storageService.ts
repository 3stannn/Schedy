import type { ScheduleEvent } from '../types/schedule';
import type { Announcement, AnnouncementRead } from '../types/announcement';
import { addDays, subDays, setHours, setMinutes, formatISO } from 'date-fns';

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
  const now = new Date();
  
  const today10am = setMinutes(setHours(now, 10), 0);
  const today11am = setMinutes(setHours(now, 11), 0);

  const today2pm = setMinutes(setHours(now, 14), 0);
  const today330pm = setMinutes(setHours(now, 15), 30);

  const tomorrow9am = setMinutes(setHours(addDays(now, 1), 9), 0);
  const tomorrow10am = setMinutes(setHours(addDays(now, 1), 10), 0);

  const dayAfter3pm = setMinutes(setHours(addDays(now, 2), 15), 0);
  const dayAfter4pm = setMinutes(setHours(addDays(now, 2), 16), 0);

  const nextWeek = addDays(now, 5);

  return [
    {
      id: 'event-demo-1',
      title: 'Weekly Standup & Project Sync',
      description: 'Review project milestones, unblock team members, and review upcoming sprints.',
      startTime: formatISO(today10am),
      endTime: formatISO(today11am),
      isAllDay: false,
      category: 'work',
      priority: 'high',
      status: 'pending',
      location: 'Conference Room B / Google Meet',
      meetingUrl: 'https://meet.google.com/abc-defg-hij',
      recurrenceRule: 'weekly',
      createdBy: 'Team Lead',
      createdAt: formatISO(subDays(now, 2)),
      updatedAt: formatISO(subDays(now, 2)),
    },
    {
      id: 'event-demo-2',
      title: 'Product Design & UX Review',
      description: 'Walkthrough new UI flows, dashboard mockups, and mobile responsive tests.',
      startTime: formatISO(today2pm),
      endTime: formatISO(today330pm),
      isAllDay: false,
      category: 'meeting',
      priority: 'medium',
      status: 'in_progress',
      location: 'Design Studio 3',
      meetingUrl: '',
      recurrenceRule: 'none',
      createdBy: 'Sarah Designer',
      createdAt: formatISO(subDays(now, 1)),
      updatedAt: formatISO(now),
    },
    {
      id: 'event-demo-3',
      title: 'Quarterly Infrastructure Upgrade',
      description: 'Scheduled backend deployment, database indexing, and performance tuning.',
      startTime: formatISO(tomorrow9am),
      endTime: formatISO(tomorrow10am),
      isAllDay: false,
      category: 'deadline',
      priority: 'urgent',
      status: 'pending',
      location: 'Cloud Server Environment',
      meetingUrl: 'https://zoom.us/j/123456789',
      recurrenceRule: 'none',
      createdBy: 'DevOps Lead',
      createdAt: formatISO(now),
      updatedAt: formatISO(now),
    },
    {
      id: 'event-demo-4',
      title: 'Security Audit & Compliance Check',
      description: 'Quarterly review of role-based permissions and access policies.',
      startTime: formatISO(dayAfter3pm),
      endTime: formatISO(dayAfter4pm),
      isAllDay: false,
      category: 'work',
      priority: 'medium',
      status: 'pending',
      location: 'Main Office',
      meetingUrl: '',
      recurrenceRule: 'monthly',
      createdBy: 'Admin',
      createdAt: formatISO(now),
      updatedAt: formatISO(now),
    },
    {
      id: 'event-demo-5',
      title: 'Company Hackathon & Showcase',
      description: 'Annual full-day company hackathon and innovation awards.',
      startTime: formatISO(setHours(nextWeek, 9)),
      endTime: formatISO(setHours(nextWeek, 18)),
      isAllDay: true,
      category: 'general',
      priority: 'low',
      status: 'pending',
      location: 'Auditorium & Virtual Stage',
      meetingUrl: '',
      recurrenceRule: 'yearly',
      createdBy: 'Event Committee',
      createdAt: formatISO(now),
      updatedAt: formatISO(now),
    }
  ];
}

export function getInitialAnnouncements(): Announcement[] {
  const now = new Date();
  return [
    {
      id: 'anno-demo-1',
      title: 'Urgent: Scheduled System Maintenance Window',
      content: 'Database optimization and server upgrades are scheduled for this Sunday from 02:00 AM to 04:00 AM UTC. Please save all work in advance. Real-time services will resume immediately after.',
      priority: 'urgent',
      category: 'maintenance',
      isPinned: true,
      expiresAt: formatISO(addDays(now, 7)),
      authorName: 'System Administration',
      createdAt: formatISO(subDays(now, 1)),
      updatedAt: formatISO(subDays(now, 1)),
    },
    {
      id: 'anno-demo-2',
      title: 'New Cloud Database Sync & Calendar Export Available',
      content: 'You can now link your free Supabase database in Settings -> Database Configuration to enable real-time multi-device sync, or export your schedule directly to iCal (.ics) for Google Calendar and Apple Calendar!',
      priority: 'important',
      category: 'feature',
      isPinned: true,
      authorName: 'Product Team',
      createdAt: formatISO(now),
      updatedAt: formatISO(now),
    },
    {
      id: 'anno-demo-3',
      title: 'Welcome to the Schedule Manager & Announcement System',
      content: 'Use this dashboard to track events, organize meetings, monitor deadlines, and stay updated with urgent announcements. Switch between Month, Week, Day, and Agenda List views from the top controls.',
      priority: 'general',
      category: 'general',
      isPinned: false,
      authorName: 'HR & Operations',
      createdAt: formatISO(subDays(now, 3)),
      updatedAt: formatISO(subDays(now, 3)),
    },
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
    return JSON.parse(raw);
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
    return JSON.parse(raw);
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
