import type { ScheduleEvent } from '../types/schedule';

export interface AutoDeleteInfo {
  shouldDelete: boolean;
  isExpiringSoon: boolean;
  reason: 'completed' | 'uncompleted_past_due' | 'none';
  remainingMs: number;
  remainingDays: number;
  remainingHours: number;
  deletionDate: Date | null;
  badgeText: string | null;
  badgeClass: string;
  noticeMessage: string | null;
}

const COMPLETED_RETENTION_MS = 2 * 24 * 60 * 60 * 1000; // 2 days
const UNCOMPLETED_RETENTION_MS = 5 * 24 * 60 * 60 * 1000; // 5 days

/**
 * Calculates auto-deletion status, remaining countdown, and visual indicator badge for an event
 */
export function getEventAutoDeleteInfo(event: ScheduleEvent, now: Date = new Date()): AutoDeleteInfo {
  const isCompleted = event.status === 'completed';

  let endTimeMs = 0;
  try {
    endTimeMs = new Date(event.endTime).getTime();
  } catch {
    endTimeMs = 0;
  }

  if (isNaN(endTimeMs) || endTimeMs === 0) {
    return {
      shouldDelete: false,
      isExpiringSoon: false,
      reason: 'none',
      remainingMs: Infinity,
      remainingDays: Infinity,
      remainingHours: Infinity,
      deletionDate: null,
      badgeText: null,
      badgeClass: '',
      noticeMessage: null,
    };
  }

  const nowMs = now.getTime();

  // Case 1: Completed Event (Auto-delete 2 days after completion or event end)
  if (isCompleted) {
    let completedAtMs = endTimeMs;
    if (event.updatedAt) {
      try {
        const u = new Date(event.updatedAt).getTime();
        if (!isNaN(u) && u > 0) {
          completedAtMs = u;
        }
      } catch {
        // use endTimeMs
      }
    }

    const deletionMs = completedAtMs + COMPLETED_RETENTION_MS;
    const remainingMs = deletionMs - nowMs;
    const shouldDelete = remainingMs <= 0;
    const remainingHours = Math.max(0, Math.ceil(remainingMs / (1000 * 60 * 60)));
    const remainingDays = Math.max(0, Math.ceil(remainingMs / (1000 * 60 * 60 * 24)));
    const deletionDate = new Date(deletionMs);

    let badgeText = '';
    if (shouldDelete) {
      badgeText = 'Expiring now';
    } else if (remainingDays > 1) {
      badgeText = `Auto-deletes in ${remainingDays}d`;
    } else if (remainingHours > 12) {
      badgeText = 'Auto-deletes tomorrow';
    } else {
      badgeText = `Auto-deletes in ${remainingHours}h`;
    }

    const noticeMessage = `This completed event is scheduled for auto-deletion on ${deletionDate.toLocaleDateString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })} (2-day retention policy).`;

    return {
      shouldDelete,
      isExpiringSoon: true,
      reason: 'completed',
      remainingMs,
      remainingDays,
      remainingHours,
      deletionDate,
      badgeText,
      badgeClass: 'bg-neutral-100 text-neutral-600 dark:bg-neutral-800 dark:text-neutral-300 border-neutral-200 dark:border-neutral-700',
      noticeMessage,
    };
  }

  // Case 2: Uncompleted Event (Auto-delete 5 days after event date has passed)
  const isPastDue = nowMs > endTimeMs;
  if (!isPastDue) {
    // Event is upcoming / in the future -> not expiring
    return {
      shouldDelete: false,
      isExpiringSoon: false,
      reason: 'none',
      remainingMs: Infinity,
      remainingDays: Infinity,
      remainingHours: Infinity,
      deletionDate: null,
      badgeText: null,
      badgeClass: '',
      noticeMessage: null,
    };
  }

  const deletionMs = endTimeMs + UNCOMPLETED_RETENTION_MS;
  const remainingMs = deletionMs - nowMs;
  const shouldDelete = remainingMs <= 0;
  const remainingHours = Math.max(0, Math.ceil(remainingMs / (1000 * 60 * 60)));
  const remainingDays = Math.max(0, Math.ceil(remainingMs / (1000 * 60 * 60 * 24)));
  const deletionDate = new Date(deletionMs);

  let badgeText = '';
  if (shouldDelete) {
    badgeText = 'Expired • Deleting';
  } else if (remainingDays > 1) {
    badgeText = `Past due • Deletes in ${remainingDays}d`;
  } else if (remainingHours > 12) {
    badgeText = 'Past due • Deletes tomorrow';
  } else {
    badgeText = `Past due • Deletes in ${remainingHours}h`;
  }

  const badgeClass =
    remainingDays <= 2
      ? 'bg-rose-50 text-rose-700 dark:bg-rose-950/50 dark:text-rose-300 border-rose-200 dark:border-rose-800'
      : 'bg-amber-50 text-amber-700 dark:bg-amber-950/50 dark:text-amber-300 border-amber-200 dark:border-amber-800';

  const noticeMessage = `This event passed on ${new Date(endTimeMs).toLocaleDateString()} without completion and will be automatically deleted on ${deletionDate.toLocaleDateString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })} (5-day retention policy).`;

  return {
    shouldDelete,
    isExpiringSoon: true,
    reason: 'uncompleted_past_due',
    remainingMs,
    remainingDays,
    remainingHours,
    deletionDate,
    badgeText,
    badgeClass,
    noticeMessage,
  };
}

/**
 * Filter out events that have exceeded their retention period
 */
export function purgeExpiredEvents(events: ScheduleEvent[], now: Date = new Date()): {
  activeEvents: ScheduleEvent[];
  expiredEventIds: string[];
  deletedCount: number;
} {
  const activeEvents: ScheduleEvent[] = [];
  const expiredEventIds: string[] = [];

  for (const evt of events) {
    const info = getEventAutoDeleteInfo(evt, now);
    if (info.shouldDelete) {
      expiredEventIds.push(evt.id);
    } else {
      activeEvents.push(evt);
    }
  }

  return {
    activeEvents,
    expiredEventIds,
    deletedCount: expiredEventIds.length,
  };
}
