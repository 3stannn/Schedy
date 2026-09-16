import React, { useMemo } from 'react';
import type { ScheduleEvent, EventStatus } from '../../types/schedule';
import type { Announcement } from '../../types/announcement';
import { StatCard } from './StatCard';
import { 
  Calendar, 
  Megaphone, 
  CheckSquare, 
  AlertTriangle, 
  ArrowRight, 
  Video, 
  Pin, 
  Square,
  Plus
} from './MovingIcon';
import { isToday, parseISO, format, startOfDay, endOfDay, isAfter } from 'date-fns';

interface OverviewDashboardProps {
  events: ScheduleEvent[];
  announcements: Announcement[];
  isAdmin?: boolean;
  onNavigateTab: (tab: 'schedule' | 'announcements' | 'overview' | 'tasks' | 'pomodoro') => void;
  onNewEvent: () => void;
  onNewTask?: () => void;
  onNewAnnouncement?: () => void;
  onStatusChange: (event: ScheduleEvent, status: EventStatus) => void;
  onAcknowledgeAnnouncement: (id: string) => void;
  onSelectEvent?: (event: ScheduleEvent) => void;
}

const formatEventTime = (isoString?: string, isAllDay?: boolean) => {
  if (isAllDay) return 'All Day';
  if (!isoString || typeof isoString !== 'string') return '';
  try {
    const d = parseISO(isoString);
    if (isNaN(d.getTime())) return '';
    return format(d, 'h:mm a');
  } catch {
    return '';
  }
};

const formatAnnouncementDate = (dateStr?: string) => {
  if (!dateStr || typeof dateStr !== 'string') return 'Recently';
  try {
    const d = parseISO(dateStr);
    if (isNaN(d.getTime())) return 'Recently';
    return format(d, 'MMM d, yyyy');
  } catch {
    return 'Recently';
  }
};

const parseEventDate = (dateStr?: string): Date | null => {
  if (!dateStr || typeof dateStr !== 'string') return null;
  try {
    // If date-only string YYYY-MM-DD
    if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
      const [y, m, d] = dateStr.split('-').map(Number);
      return new Date(y, m - 1, d, 12, 0, 0);
    }
    const parsed = parseISO(dateStr);
    if (!isNaN(parsed.getTime())) return parsed;
    const fallback = new Date(dateStr);
    if (!isNaN(fallback.getTime())) return fallback;
  } catch {
    return null;
  }
  return null;
};

const isEventToday = (event?: ScheduleEvent): boolean => {
  if (!event || !event.startTime || typeof event.startTime !== 'string') return false;
  const start = parseEventDate(event.startTime);
  if (!start) return false;

  // 1. Starts today (in local timezone)
  if (isToday(start)) return true;

  // 2. Ends today (in local timezone)
  if (event.endTime && typeof event.endTime === 'string') {
    const end = parseEventDate(event.endTime);
    if (end) {
      if (isToday(end)) return true;

      // 3. Multi-day event spanning across today
      const now = new Date();
      const todayStart = startOfDay(now);
      const todayEnd = endOfDay(now);
      if (start <= todayEnd && end >= todayStart) {
        return true;
      }
    }
  }

  return false;
};

const EMPTY_EVENTS: ScheduleEvent[] = [];
const EMPTY_ANNOS: Announcement[] = [];

export const OverviewDashboard: React.FC<OverviewDashboardProps> = ({
  events,
  announcements,
  isAdmin = true,
  onNavigateTab,
  onNewEvent,
  onNewTask,
  onNewAnnouncement,
  onStatusChange,
  onAcknowledgeAnnouncement,
  onSelectEvent,
}) => {
  const safeEvents = useMemo(() => (Array.isArray(events) ? events : EMPTY_EVENTS), [events]);
  const safeAnnos = useMemo(() => (Array.isArray(announcements) ? announcements : EMPTY_ANNOS), [announcements]);

  const sortedAnnos = useMemo(() => {
    return [...safeAnnos].sort((a, b) => {
      // 1. Pinned notices ALWAYS on top
      if (!!a.isPinned !== !!b.isPinned) return a.isPinned ? -1 : 1;
      // 2. Dev broadcast next
      if ((a.priority === 'dev') !== (b.priority === 'dev')) return a.priority === 'dev' ? -1 : 1;
      // 3. Newest first
      const timeA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
      const timeB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
      return timeB - timeA;
    });
  }, [safeAnnos]);

  // Strictly events scheduled for today (itemType === 'event' or default)
  const todayEventsList = useMemo(() => {
    return safeEvents
      .filter(e => isEventToday(e) && (e.itemType || 'event') === 'event')
      .sort((a, b) => {
        const tA = a.startTime ? new Date(a.startTime).getTime() : 0;
        const tB = b.startTime ? new Date(b.startTime).getTime() : 0;
        return tA - tB;
      });
  }, [safeEvents]);

  // Strictly tasks scheduled or due today (itemType === 'task')
  const todayTasksList = useMemo(() => {
    return safeEvents
      .filter(e => isEventToday(e) && e.itemType === 'task')
      .sort((a, b) => {
        // Pending/In Progress at top, completed at bottom
        if (a.status === 'completed' && b.status !== 'completed') return 1;
        if (a.status !== 'completed' && b.status === 'completed') return -1;
        if (a.status === 'in_progress' && b.status !== 'in_progress') return -1;
        if (a.status !== 'in_progress' && b.status === 'in_progress') return 1;
        if (a.priority === 'urgent' && b.priority !== 'urgent') return -1;
        if (a.priority !== 'urgent' && b.priority === 'urgent') return 1;
        const tA = a.startTime ? new Date(a.startTime).getTime() : 0;
        const tB = b.startTime ? new Date(b.startTime).getTime() : 0;
        return tA - tB;
      });
  }, [safeEvents]);

  const todayTasksCompletedCount = useMemo(() => {
    return todayTasksList.filter(t => t.status === 'completed').length;
  }, [todayTasksList]);

  const urgentTasks = useMemo(() => safeEvents.filter(e => e && e.priority === 'urgent' && e.status !== 'completed'), [safeEvents]);
  const unreadAnnouncements = useMemo(() => safeAnnos.filter(a => a && !a.isRead), [safeAnnos]);

  const handleCreateTask = () => {
    if (onNewTask) {
      onNewTask();
    } else {
      onNewEvent();
    }
  };

  const nextUpcomingEvent = useMemo(() => {
    const now = new Date();
    return todayEventsList.find(e => {
      if (e.status === 'completed') return false;
      if (e.endTime) {
        const end = parseEventDate(e.endTime);
        if (end && isAfter(end, now)) return true;
      }
      if (e.startTime) {
        const start = parseEventDate(e.startTime);
        if (start && isAfter(start, now)) return true;
      }
      return true;
    });
  }, [todayEventsList]);

  const taskCompletionPercent = todayTasksList.length > 0
    ? Math.round((todayTasksCompletedCount / todayTasksList.length) * 100)
    : 0;

  return (
    <div className="space-y-5 text-[#1c1917] dark:text-[#f4f4f5]">
      
      {/* ========================================================================= */}
      {/* 1. HIERARCHICAL METRICS & FOCUS HERO (Broken uniform size and weights)    */}
      {/* ========================================================================= */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-12 gap-3.5 items-stretch">
        
        {/* LEVEL 1: Dominant Focus & Today's Agenda Hero Card (Spans 6 cols on desktop) */}
        <div className="lg:col-span-6 ios-card p-4 sm:p-5 rounded-2xl flex flex-col justify-between border-black/[0.08] dark:border-white/[0.1] bg-white dark:bg-[#1c1c1e] transition-all">
          <div>
            <div className="flex items-center justify-between gap-2 pb-2">
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-bold uppercase tracking-widest px-2 py-0.5 rounded-full bg-[#007aff]/10 text-[#007aff] dark:text-[#0a84ff]">
                  Today's Focus
                </span>
                <span className="text-xs text-neutral-400 font-medium">
                  {format(new Date(), 'EEEE, MMMM d')}
                </span>
              </div>

              <div className="flex items-center gap-1">
                {isAdmin && (
                  <button
                    onClick={onNewEvent}
                    className="text-xs font-semibold text-[#007aff] dark:text-[#0a84ff] hover:bg-[#007aff]/10 px-2 py-1 rounded-lg transition-colors cursor-pointer flex items-center gap-1"
                    title="Quick add event"
                  >
                    <Plus className="w-3 h-3" />
                    <span>Event</span>
                  </button>
                )}
                {isAdmin && (
                  <button
                    onClick={handleCreateTask}
                    className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/10 px-2 py-1 rounded-lg transition-colors cursor-pointer flex items-center gap-1"
                    title="Quick add task"
                  >
                    <Plus className="w-3 h-3" />
                    <span>Task</span>
                  </button>
                )}
              </div>
            </div>

            {/* Next Up Scheduled Item Highlight (Flat, unboxed row) */}
            {nextUpcomingEvent ? (
              <div
                onClick={() => onSelectEvent?.(nextUpcomingEvent)}
                className="mt-3 flex items-center justify-between gap-3 py-2 px-2.5 rounded-xl hover:bg-black/[0.03] dark:hover:bg-white/[0.04] transition-colors cursor-pointer group"
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <span className="shrink-0 text-[10px] font-bold px-2 py-0.5 rounded-md bg-[#007aff]/10 text-[#007aff] dark:text-[#0a84ff] uppercase tracking-wider">
                    Next Up
                  </span>
                  <h4 className="text-sm font-semibold text-neutral-900 dark:text-white truncate group-hover:text-[#007aff] dark:group-hover:text-[#0a84ff] transition-colors">
                    {nextUpcomingEvent.title}
                  </h4>
                  {nextUpcomingEvent.location && (
                    <span className="text-xs text-neutral-400 truncate hidden sm:inline">
                      • {nextUpcomingEvent.location}
                    </span>
                  )}
                </div>
                <span className="text-xs font-mono font-medium text-neutral-500 dark:text-neutral-400 shrink-0">
                  {formatEventTime(nextUpcomingEvent.startTime, nextUpcomingEvent.isAllDay)}
                </span>
              </div>
            ) : (
              <div className="mt-3 py-2 px-2.5 text-neutral-400 text-xs font-medium">
                {todayEventsList.length === 0 ? 'No events on your calendar today.' : 'All scheduled events for today are finished!'}
              </div>
            )}
          </div>

          {/* Daily Task Completion Progress Bar */}
          <div className="mt-4 pt-3 border-t border-black/[0.06] dark:border-white/[0.08]">
            <div className="flex items-center justify-between text-xs mb-1.5">
              <span className="font-semibold text-neutral-600 dark:text-neutral-300">
                Daily Task Progress
              </span>
              <span className="font-mono text-[11px] font-bold text-neutral-700 dark:text-neutral-300">
                {todayTasksCompletedCount} of {todayTasksList.length} completed ({taskCompletionPercent}%)
              </span>
            </div>
            <div className="w-full h-2 rounded-full bg-black/[0.06] dark:bg-white/[0.08] overflow-hidden">
              <div
                className="h-full rounded-full bg-emerald-500 transition-all duration-500 ease-out"
                style={{ width: `${taskCompletionPercent}%` }}
              />
            </div>
          </div>
        </div>

        {/* LEVEL 2: Urgent / Attention Card (Spans 3 cols on desktop - distinct weight) */}
        <div className="lg:col-span-3 flex flex-col">
          <StatCard
            variant={urgentTasks.length > 0 ? 'urgent' : 'default'}
            title="Urgent Attention"
            value={urgentTasks.length}
            subtitle={
              urgentTasks.length > 0
                ? `${urgentTasks.length} critical ${urgentTasks.length === 1 ? 'item' : 'items'} pending`
                : 'All clear • No urgent items'
            }
            icon={<AlertTriangle className="w-4 h-4" />}
            className="flex-1 flex flex-col justify-between"
            onClick={() => onNavigateTab('tasks')}
          />
        </div>

        {/* LEVEL 3: Supporting Compact Metrics (Spans 3 cols on desktop - stacked) */}
        <div className="lg:col-span-3 grid grid-cols-2 lg:grid-cols-1 gap-3.5">
          <StatCard
            variant="compact"
            title="Events Today"
            value={todayEventsList.length}
            subtitle={`${todayEventsList.filter(e => !e.isAllDay).length} timed • ${todayEventsList.filter(e => e.isAllDay).length} all-day`}
            icon={<Calendar className="w-3.5 h-3.5" />}
            onClick={() => onNavigateTab('schedule')}
          />

          <StatCard
            variant="compact"
            title="Notices & Alerts"
            value={unreadAnnouncements.length}
            subtitle={unreadAnnouncements.length > 0 ? `${unreadAnnouncements.length} unread bulletin${unreadAnnouncements.length > 1 ? 's' : ''}` : 'All bulletins read'}
            icon={<Megaphone className="w-3.5 h-3.5" />}
            onClick={() => onNavigateTab('announcements')}
          />
        </div>

      </div>

      {/* ========================================================================= */}
      {/* 2. MAIN DUAL SECTION: SCHEDULE (7 COLS) & ACTION TASKS (5 COLS)           */}
      {/* ========================================================================= */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-start">
        
        {/* COLUMN 1: Today's Schedule Agenda (Dominant 7 columns) */}
        <div className="lg:col-span-7 ios-card rounded-2xl p-4 sm:p-5 space-y-3.5 flex flex-col">
          <div className="flex items-center justify-between border-b border-black/[0.06] dark:border-white/[0.08] pb-3 shrink-0">
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-bold text-neutral-900 dark:text-white">
                  Today's Schedule
                </h3>
                <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-700 dark:text-blue-300">
                  {todayEventsList.length}
                </span>
              </div>
              <p className="text-[11px] text-neutral-400 font-medium mt-0.5">
                Timeline and scheduled appointments
              </p>
            </div>

            <div className="flex items-center gap-1">
              {isAdmin && (
                <button
                  onClick={onNewEvent}
                  className="h-8 min-h-[32px] text-xs font-semibold text-[#007aff] dark:text-[#0a84ff] hover:bg-[#007aff]/10 flex items-center gap-1 px-2.5 rounded-[10px] transition-colors cursor-pointer box-border"
                  title="Add Event for Today"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Add Event</span>
                </button>
              )}
              <button
                onClick={() => onNavigateTab('schedule')}
                className="h-8 min-h-[32px] text-xs font-semibold text-neutral-500 hover:text-neutral-900 dark:text-neutral-400 dark:hover:text-white flex items-center gap-1 px-2.5 rounded-[10px] hover:bg-black/5 dark:hover:bg-white/10 transition-colors cursor-pointer box-border"
                title="View Calendar"
              >
                <span>Calendar</span>
                <ArrowRight className="w-3 h-3" />
              </button>
            </div>
          </div>

          <div className="divide-y divide-black/[0.06] dark:divide-white/[0.08] max-h-[380px] overflow-y-auto pr-0.5 flex-1">
            {todayEventsList.length === 0 ? (
              <div className="text-center py-12 text-neutral-400 text-xs">
                <Calendar className="w-7 h-7 mx-auto mb-2 opacity-30 text-neutral-500" />
                <p className="font-medium">No events scheduled for today.</p>
                {isAdmin && (
                  <button
                    onClick={onNewEvent}
                    className="mt-2 text-xs font-semibold text-[#007aff] dark:text-[#0a84ff] hover:underline cursor-pointer"
                  >
                    + Add an event
                  </button>
                )}
              </div>
            ) : (
              todayEventsList.map(evt => {
                const isCompleted = evt.status === 'completed';
                const isNextUp = nextUpcomingEvent?.id === evt.id;

                return (
                  <div
                    key={evt.id}
                    onClick={() => onSelectEvent?.(evt)}
                    className={`py-3 px-2 rounded-xl transition-all flex items-start justify-between gap-3 cursor-pointer hover:bg-black/[0.025] dark:hover:bg-white/[0.035] active:scale-[0.99] ${
                      isCompleted ? 'opacity-50 hover:opacity-90' : ''
                    }`}
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        {isNextUp && (
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-blue-500/15 text-blue-700 dark:text-blue-300 uppercase tracking-wider">
                            Next Up
                          </span>
                        )}
                        <h4 className={`text-xs font-semibold leading-snug truncate ${isCompleted ? 'line-through text-neutral-400' : 'text-neutral-900 dark:text-neutral-100'}`}>
                          {evt.title}
                        </h4>
                        {evt.priority === 'urgent' && (
                          <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-md bg-red-500/15 text-red-600 dark:text-red-400 border border-red-500/20">
                            Urgent
                          </span>
                        )}
                      </div>

                      <div className="flex items-center gap-2 text-[11px] text-neutral-400 mt-1 flex-wrap">
                        <span className="font-semibold font-mono text-neutral-700 dark:text-neutral-300">
                          {formatEventTime(evt.startTime, evt.isAllDay)}
                        </span>
                        {evt.category && <span className="capitalize">• {evt.category}</span>}
                        {evt.location && <span className="truncate">• {evt.location}</span>}
                      </div>
                    </div>

                    {evt.meetingUrl && (
                      <a
                        href={evt.meetingUrl}
                        target="_blank"
                        rel="noreferrer"
                        onClick={e => e.stopPropagation()}
                        className="p-1.5 rounded-lg text-[#007aff] dark:text-[#0a84ff] hover:bg-[#007aff]/10 text-xs shrink-0 transition-colors"
                        title="Join Meeting"
                      >
                        <Video className="w-3.5 h-3.5" />
                      </a>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* COLUMN 2: Today's Tasks (Focused 5 columns checklist) */}
        <div className="lg:col-span-5 ios-card rounded-2xl p-4 sm:p-5 space-y-3.5 flex flex-col">
          <div className="flex items-center justify-between border-b border-black/[0.06] dark:border-white/[0.08] pb-3 shrink-0">
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-bold text-neutral-900 dark:text-white">
                  Today's Tasks
                </h3>
                <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-700 dark:text-emerald-300">
                  {todayTasksCompletedCount}/{todayTasksList.length}
                </span>
              </div>
              <p className="text-[11px] text-neutral-400 font-medium mt-0.5">
                Action items and to-dos
              </p>
            </div>

            <div className="flex items-center gap-1">
              {isAdmin && (
                <button
                  onClick={handleCreateTask}
                  className="h-8 min-h-[32px] text-xs font-semibold text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/10 flex items-center gap-1 px-2.5 rounded-[10px] transition-colors cursor-pointer box-border"
                  title="Add Task for Today"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Add Task</span>
                </button>
              )}
              <button
                onClick={() => onNavigateTab('tasks')}
                className="h-8 min-h-[32px] text-xs font-semibold text-neutral-500 hover:text-neutral-900 dark:text-neutral-400 dark:hover:text-white flex items-center gap-1 px-2.5 rounded-[10px] hover:bg-black/5 dark:hover:bg-white/10 transition-colors cursor-pointer box-border"
                title="View Task Board"
              >
                <span>Board</span>
                <ArrowRight className="w-3 h-3" />
              </button>
            </div>
          </div>

          <div className="divide-y divide-black/[0.06] dark:divide-white/[0.08] max-h-[380px] overflow-y-auto pr-0.5 flex-1">
            {todayTasksList.length === 0 ? (
              <div className="text-center py-12 text-neutral-400 text-xs">
                <CheckSquare className="w-7 h-7 mx-auto mb-2 opacity-30 text-neutral-500" />
                <p className="font-medium">No tasks due today.</p>
                {isAdmin && (
                  <button
                    onClick={handleCreateTask}
                    className="mt-2 text-xs font-semibold text-emerald-600 dark:text-emerald-400 hover:underline cursor-pointer"
                  >
                    + Add a task
                  </button>
                )}
              </div>
            ) : (
              todayTasksList.map(task => {
                const isCompleted = task.status === 'completed';
                const isInProgress = task.status === 'in_progress';
                const isUrgent = task.priority === 'urgent' && !isCompleted;

                return (
                  <div
                    key={task.id}
                    onClick={() => onSelectEvent?.(task)}
                    className={`py-2.5 px-2 rounded-xl transition-all flex items-start justify-between gap-2.5 cursor-pointer hover:bg-black/[0.025] dark:hover:bg-white/[0.035] active:scale-[0.99] ${
                      isCompleted ? 'opacity-50 hover:opacity-90' : ''
                    }`}
                  >
                    <div className="flex items-start gap-2.5 flex-1 min-w-0">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          onStatusChange(task, isCompleted ? 'pending' : 'completed');
                        }}
                        className="mt-0.5 text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200 transition-colors active:scale-90 cursor-pointer shrink-0"
                        title={isCompleted ? 'Mark as Pending' : 'Mark as Completed'}
                      >
                        {isCompleted ? (
                          <CheckSquare className="w-4 h-4 text-[#007aff] dark:text-[#0a84ff]" />
                        ) : (
                          <Square className="w-4 h-4" />
                        )}
                      </button>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <h4 className={`text-xs font-semibold leading-snug truncate ${isCompleted ? 'line-through text-neutral-400' : 'text-neutral-900 dark:text-neutral-100'}`}>
                            {task.title}
                          </h4>
                          {isInProgress && (
                            <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-md bg-amber-500/15 text-amber-600 dark:text-amber-400">
                              In Progress
                            </span>
                          )}
                          {isUrgent && (
                            <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-md bg-red-500/15 text-red-600 dark:text-red-400 border border-red-500/20">
                              Urgent
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-2 text-[11px] text-neutral-400 mt-1 flex-wrap">
                          <span>Due: {formatEventTime(task.startTime, task.isAllDay)}</span>
                          {task.category && <span className="capitalize">• {task.category}</span>}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

      </div>

      {/* ========================================================================= */}
      {/* 3. ROW BELOW: NOTICE BULLETIN (Secondary utility weight)                  */}
      {/* ========================================================================= */}
      <div className="ios-card rounded-2xl p-4 sm:p-5 space-y-3">
        <div className="flex items-center justify-between border-b border-black/[0.06] dark:border-white/[0.08] pb-3">
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-xs font-bold text-neutral-900 dark:text-white uppercase tracking-wider">
                Notice Bulletin
              </h3>
              {unreadAnnouncements.length > 0 && (
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-700 dark:text-amber-300">
                  {unreadAnnouncements.length} new
                </span>
              )}
            </div>
            <p className="text-[11px] text-neutral-400 font-medium">
              Company announcements and status alerts
            </p>
          </div>

          <div className="flex items-center gap-1.5">
            {isAdmin && onNewAnnouncement && (
              <button
                onClick={onNewAnnouncement}
                className="h-8 min-h-[32px] text-xs font-semibold text-amber-600 dark:text-amber-400 hover:bg-amber-500/10 flex items-center gap-1 px-2.5 rounded-[10px] transition-colors cursor-pointer box-border"
              >
                <Plus className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Post Notice</span>
              </button>
            )}
            <button
              onClick={() => onNavigateTab('announcements')}
              className="h-8 min-h-[32px] text-xs font-semibold text-neutral-500 hover:text-neutral-900 dark:text-neutral-400 dark:hover:text-white flex items-center gap-1 px-2.5 rounded-[10px] hover:bg-black/5 dark:hover:bg-white/10 transition-colors cursor-pointer box-border"
            >
              <span>View All</span>
              <ArrowRight className="w-3 h-3" />
            </button>
          </div>
        </div>

        <div className="space-y-2.5">
          {safeAnnos.length === 0 ? (
            <div className="text-center py-6 text-neutral-400 text-xs font-medium">
              No announcements posted yet.
            </div>
          ) : (
            <div className="divide-y divide-black/[0.06] dark:divide-white/[0.08]">
              {sortedAnnos.slice(0, 3).map(anno => (
                <div
                  key={anno.id}
                  className={`py-3 px-2 rounded-xl transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 hover:bg-black/[0.02] dark:hover:bg-white/[0.03] ${
                    anno.isRead ? 'opacity-70' : ''
                  }`}
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                      {anno.isPinned && <Pin className="w-3 h-3 text-amber-600 dark:text-amber-400 shrink-0" />}
                      <span className="text-[10px] font-semibold px-2 py-0.5 rounded-md bg-black/5 dark:bg-white/10 text-neutral-600 dark:text-neutral-300 capitalize tracking-tight">
                        {anno.priority || 'General'}
                      </span>
                      <h4 className="text-xs font-bold leading-snug text-neutral-900 dark:text-neutral-100 truncate">
                        {anno.title}
                      </h4>
                    </div>
                    <p className="text-xs text-neutral-500 dark:text-neutral-400 line-clamp-1 leading-relaxed">
                      {anno.content}
                    </p>
                  </div>

                  <div className="flex items-center gap-3 shrink-0 self-end sm:self-center">
                    <span className="text-[10px] text-neutral-400">
                      {formatAnnouncementDate(anno?.createdAt)}
                    </span>
                    <button
                      onClick={() => onAcknowledgeAnnouncement(anno.id)}
                      className={`text-[11px] font-semibold px-2.5 h-7 min-h-[28px] flex items-center justify-center rounded-lg transition-all active:scale-95 cursor-pointer box-border ${
                        anno.isRead 
                          ? 'text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-300' 
                          : 'bg-[#007aff] text-white hover:bg-[#0071e3]'
                      }`}
                    >
                      {anno.isRead ? 'Read' : 'Acknowledge'}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

    </div>
  );
};
