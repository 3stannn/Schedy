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
  Clock,
  Plus
} from './MovingIcon';
import { isToday, parseISO, format, startOfDay, endOfDay } from 'date-fns';

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

export const OverviewDashboard: React.FC<OverviewDashboardProps> = ({
  events = [],
  announcements = [],
  isAdmin = true,
  onNavigateTab,
  onNewEvent,
  onNewTask,
  onNewAnnouncement,
  onStatusChange,
  onAcknowledgeAnnouncement,
  onSelectEvent,
}) => {
  const safeEvents = Array.isArray(events) ? events : [];
  const safeAnnos = Array.isArray(announcements) ? announcements : [];

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

  const inProgressTasks = useMemo(() => {
    return safeEvents.filter(e => e && e.status === 'in_progress');
  }, [safeEvents]);

  const urgentTasks = useMemo(() => safeEvents.filter(e => e && e.priority === 'urgent' && e.status !== 'completed'), [safeEvents]);
  const unreadAnnouncements = useMemo(() => safeAnnos.filter(a => a && !a.isRead), [safeAnnos]);
  const pinnedAnnouncements = useMemo(() => safeAnnos.filter(a => a && a.isPinned), [safeAnnos]);

  const handleCreateTask = () => {
    if (onNewTask) {
      onNewTask();
    } else {
      onNewEvent();
    }
  };

  return (
    <div className="space-y-4 text-[#1c1917] dark:text-[#f4f4f5]">
      
      {/* Metrics Row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <StatCard
          title="Events Today"
          value={todayEventsList.length}
          subtitle={
            todayEventsList.length > 0
              ? `${todayEventsList.filter(e => !e.isAllDay).length} timed • ${todayEventsList.filter(e => e.isAllDay).length} all-day`
              : 'No events scheduled'
          }
          icon={<Calendar className="w-4 h-4 text-[#007aff]" />}
          onClick={() => onNavigateTab('schedule')}
        />

        <StatCard
          title="Tasks Today"
          value={todayTasksList.length}
          subtitle={
            todayTasksList.length > 0
              ? `${todayTasksCompletedCount} of ${todayTasksList.length} completed`
              : 'No tasks due'
          }
          icon={<CheckSquare className="w-4 h-4 text-emerald-500" />}
          onClick={() => onNavigateTab('tasks')}
        />

        <StatCard
          title="Urgent"
          value={urgentTasks.length}
          subtitle={inProgressTasks.length > 0 ? `${inProgressTasks.length} in progress on board` : 'Priority items pending'}
          icon={<AlertTriangle className="w-4 h-4 text-amber-500" />}
          onClick={() => onNavigateTab('tasks')}
        />

        <StatCard
          title="Notices"
          value={unreadAnnouncements.length}
          subtitle={`${pinnedAnnouncements.length} pinned`}
          icon={<Megaphone className="w-4 h-4 text-indigo-500" />}
          onClick={() => onNavigateTab('announcements')}
        />
      </div>

      {/* Main Dual Columns: Today's Events (Left) & Today's Tasks (Right) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        
        {/* COLUMN 1: Today's Events */}
        <div className="ios-card rounded-2xl p-4 sm:p-5 space-y-3.5 flex flex-col">
          <div className="flex items-center justify-between border-b border-black/[0.06] dark:border-white/[0.08] pb-3 shrink-0">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-[12px] bg-[#007aff]/10 text-[#007aff] dark:text-[#0a84ff] flex items-center justify-center shrink-0">
                <Calendar className="w-4 h-4" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-xs font-bold text-neutral-900 dark:text-white">
                    Today's Events
                  </h3>
                  <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-700 dark:text-blue-300">
                    {todayEventsList.length}
                  </span>
                </div>
                <p className="text-[11px] text-neutral-400 font-medium">
                  {format(new Date(), 'EEEE, MMMM d, yyyy')}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-1">
              {isAdmin && (
                <button
                  onClick={onNewEvent}
                  className="text-xs font-semibold text-[#007aff] dark:text-[#0a84ff] hover:bg-[#007aff]/10 flex items-center gap-1 px-2 py-1 rounded-[10px] transition-colors cursor-pointer"
                  title="Add Event for Today"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Add Event</span>
                </button>
              )}
              <button
                onClick={() => onNavigateTab('schedule')}
                className="text-xs font-semibold text-neutral-500 hover:text-neutral-900 dark:text-neutral-400 dark:hover:text-white flex items-center gap-1 px-2.5 py-1 rounded-[10px] hover:bg-black/5 dark:hover:bg-white/10 transition-colors cursor-pointer"
                title="View Calendar"
              >
                <span>Calendar</span>
                <ArrowRight className="w-3 h-3" />
              </button>
            </div>
          </div>

          <div className="space-y-2 max-h-[360px] overflow-y-auto pr-0.5 flex-1">
            {todayEventsList.length === 0 ? (
              <div className="text-center py-10 text-neutral-400 text-xs">
                <div className="w-10 h-10 rounded-[14px] bg-black/5 dark:bg-white/5 flex items-center justify-center mx-auto mb-2 opacity-50">
                  <Calendar className="w-5 h-5" />
                </div>
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
                return (
                  <div
                    key={evt.id}
                    onClick={() => onSelectEvent?.(evt)}
                    className={`p-3 rounded-[14px] border border-black/[0.06] dark:border-white/[0.08] transition-all flex items-start justify-between gap-3 cursor-pointer active:scale-[0.99] ${
                      isCompleted
                        ? 'bg-black/[0.02] dark:bg-white/[0.02] opacity-60 hover:opacity-100 hover:border-black/20 dark:hover:border-white/20'
                        : 'bg-black/[0.02] dark:bg-white/[0.03] hover:border-[#007aff]/40 shadow-2xs'
                    }`}
                  >
                    <div className="flex items-start gap-2.5 flex-1 min-w-0">
                      <div className="w-7 h-7 rounded-[10px] bg-blue-500/10 text-[#007aff] dark:text-[#0a84ff] flex items-center justify-center shrink-0 mt-0.5">
                        <Clock className="w-3.5 h-3.5" />
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <h4 className={`text-xs font-semibold leading-snug truncate ${isCompleted ? 'line-through text-neutral-400' : 'text-neutral-900 dark:text-neutral-100'}`}>
                            {evt.title}
                          </h4>
                          {evt.priority === 'urgent' && (
                            <span className="text-[9px] font-bold px-1.5 py-0.2 rounded bg-red-500/15 text-red-600 dark:text-red-400 border border-red-500/20">
                              Urgent
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-2 text-[11px] text-neutral-400 mt-1 flex-wrap">
                          <span className="font-semibold text-neutral-600 dark:text-neutral-300">
                            {formatEventTime(evt.startTime, evt.isAllDay)}
                          </span>
                          {evt.category && <span className="capitalize">• {evt.category}</span>}
                          {evt.location && <span className="truncate">• {evt.location}</span>}
                        </div>
                      </div>
                    </div>

                    {evt.meetingUrl && (
                      <a
                        href={evt.meetingUrl}
                        target="_blank"
                        rel="noreferrer"
                        onClick={e => e.stopPropagation()}
                        className="p-1.5 rounded-[8px] text-[#007aff] dark:text-[#0a84ff] hover:bg-[#007aff]/10 text-xs shrink-0 transition-colors"
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

        {/* COLUMN 2: Today's Tasks */}
        <div className="ios-card rounded-2xl p-4 sm:p-5 space-y-3.5 flex flex-col">
          <div className="flex items-center justify-between border-b border-black/[0.06] dark:border-white/[0.08] pb-3 shrink-0">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-[12px] bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
                <CheckSquare className="w-4 h-4" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-xs font-bold text-neutral-900 dark:text-white">
                    Today's Tasks
                  </h3>
                  <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-700 dark:text-emerald-300">
                    {todayTasksCompletedCount}/{todayTasksList.length}
                  </span>
                </div>
                <p className="text-[11px] text-neutral-400 font-medium">
                  {todayTasksList.length > 0 
                    ? `${Math.round((todayTasksCompletedCount / todayTasksList.length) * 100)}% completed today`
                    : 'To-dos and action items'}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-1">
              {isAdmin && (
                <button
                  onClick={handleCreateTask}
                  className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/10 flex items-center gap-1 px-2 py-1 rounded-[10px] transition-colors cursor-pointer"
                  title="Add Task for Today"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Add Task</span>
                </button>
              )}
              <button
                onClick={() => onNavigateTab('tasks')}
                className="text-xs font-semibold text-neutral-500 hover:text-neutral-900 dark:text-neutral-400 dark:hover:text-white flex items-center gap-1 px-2.5 py-1 rounded-[10px] hover:bg-black/5 dark:hover:bg-white/10 transition-colors cursor-pointer"
                title="View Task Board"
              >
                <span>Task Board</span>
                <ArrowRight className="w-3 h-3" />
              </button>
            </div>
          </div>

          <div className="space-y-2 max-h-[360px] overflow-y-auto pr-0.5 flex-1">
            {todayTasksList.length === 0 ? (
              <div className="text-center py-10 text-neutral-400 text-xs">
                <div className="w-10 h-10 rounded-[14px] bg-black/5 dark:bg-white/5 flex items-center justify-center mx-auto mb-2 opacity-50">
                  <CheckSquare className="w-5 h-5" />
                </div>
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
                return (
                  <div
                    key={task.id}
                    onClick={() => onSelectEvent?.(task)}
                    className={`p-3 rounded-[14px] border border-black/[0.06] dark:border-white/[0.08] transition-all flex items-start justify-between gap-3 cursor-pointer active:scale-[0.99] ${
                      isCompleted
                        ? 'bg-black/[0.02] dark:bg-white/[0.02] opacity-60 hover:opacity-100 hover:border-black/20 dark:hover:border-white/20'
                        : isInProgress
                        ? 'bg-amber-500/[0.04] border-amber-500/30 hover:border-amber-500/60 shadow-2xs'
                        : 'bg-black/[0.02] dark:bg-white/[0.03] hover:border-emerald-500/40 shadow-2xs'
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
                            <span className="text-[9px] font-bold px-1.5 py-0.2 rounded bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/20">
                              In Progress
                            </span>
                          )}
                          {task.priority === 'urgent' && !isCompleted && (
                            <span className="text-[9px] font-bold px-1.5 py-0.2 rounded bg-red-500/15 text-red-600 dark:text-red-400 border border-red-500/20">
                              Urgent
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-2 text-[11px] text-neutral-400 mt-1 flex-wrap">
                          <span>Due: {formatEventTime(task.startTime, task.isAllDay)}</span>
                          {task.category && <span className="capitalize">• {task.category}</span>}
                          {task.priority && <span className="capitalize">• {task.priority}</span>}
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

      {/* Row Below: Broadcast & Announcements Bulletin */}
      <div className="ios-card rounded-2xl p-4 sm:p-5 space-y-3.5">
        <div className="flex items-center justify-between border-b border-black/[0.06] dark:border-white/[0.08] pb-3">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-[12px] bg-amber-500/10 text-amber-500 flex items-center justify-center shrink-0">
              <Megaphone className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-xs font-bold text-neutral-900 dark:text-white">
                Notice Bulletin
              </h3>
              <p className="text-[11px] text-neutral-400 font-medium">
                Recent company updates & alerts
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1.5">
            {isAdmin && onNewAnnouncement && (
              <button
                onClick={onNewAnnouncement}
                className="text-xs font-semibold text-amber-600 dark:text-amber-400 hover:bg-amber-500/10 flex items-center gap-1 px-2.5 py-1 rounded-[10px] transition-colors cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Post Notice</span>
              </button>
            )}
            <button
              onClick={() => onNavigateTab('announcements')}
              className="text-xs font-semibold text-neutral-500 hover:text-neutral-900 dark:text-neutral-400 dark:hover:text-white flex items-center gap-1 px-2.5 py-1 rounded-[10px] hover:bg-black/5 dark:hover:bg-white/10 transition-colors cursor-pointer"
            >
              <span>View All</span>
              <ArrowRight className="w-3 h-3" />
            </button>
          </div>
        </div>

        <div className="space-y-2.5">
          {safeAnnos.length === 0 ? (
            <div className="text-center py-8 text-neutral-400 text-xs">
              <p className="font-medium">No announcements posted yet.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
              {safeAnnos.slice(0, 3).map(anno => (
                <div
                  key={anno.id}
                  className={`p-3.5 rounded-[16px] border transition-all flex flex-col justify-between ${
                    anno.isRead
                      ? 'bg-black/[0.02] dark:bg-white/[0.02] border-black/[0.04] dark:border-white/[0.06]'
                      : 'bg-black/[0.02] dark:bg-white/[0.03] border-amber-500/30 shadow-xs'
                  }`}
                >
                  <div>
                    <div className="flex items-center justify-between gap-2 mb-1.5">
                      <div className="flex items-center gap-1.5">
                        {anno.isPinned && <Pin className="w-3 h-3 text-amber-600 dark:text-amber-400" />}
                        <span className="text-[10px] font-semibold px-2 py-0.5 rounded-[8px] bg-black/5 dark:bg-white/10 text-neutral-600 dark:text-neutral-300 capitalize tracking-tight">
                          {anno.priority || 'General'}
                        </span>
                      </div>
                      <button
                        onClick={() => onAcknowledgeAnnouncement(anno.id)}
                        className={`text-[11px] font-semibold px-2.5 py-0.5 rounded-[8px] transition-all active:scale-95 cursor-pointer ${
                          anno.isRead 
                            ? 'text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-300' 
                            : 'bg-[#007aff] text-white hover:bg-[#0071e3] shadow-xs'
                        }`}
                      >
                        {anno.isRead ? 'Read' : 'Acknowledge'}
                      </button>
                    </div>

                    <h4 className="text-xs font-bold leading-snug text-neutral-900 dark:text-neutral-100 line-clamp-1">
                      {anno.title}
                    </h4>
                    <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-0.5 line-clamp-2 leading-relaxed">
                      {anno.content}
                    </p>
                  </div>

                  <div className="text-[10px] text-neutral-400 mt-2 flex items-center justify-between">
                    <span>{anno?.authorName || 'Admin'}</span>
                    <span>{formatAnnouncementDate(anno?.createdAt)}</span>
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
