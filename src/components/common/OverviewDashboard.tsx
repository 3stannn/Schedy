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
  Square
} from './MovingIcon';
import { isToday, parseISO, format, startOfDay, endOfDay } from 'date-fns';

interface OverviewDashboardProps {
  events: ScheduleEvent[];
  announcements: Announcement[];
  isAdmin?: boolean;
  onNavigateTab: (tab: 'schedule' | 'announcements' | 'overview' | 'tasks' | 'pomodoro') => void;
  onNewEvent: () => void;
  onNewAnnouncement?: () => void;
  onStatusChange: (event: ScheduleEvent, status: EventStatus) => void;
  onAcknowledgeAnnouncement: (id: string) => void;
  onSelectEvent?: (event: ScheduleEvent) => void;
}

const formatEventTime = (isoString?: string, isAllDay?: boolean) => {
  if (isAllDay) return 'All Day';
  if (!isoString) return '';
  try {
    const d = parseISO(isoString);
    if (isNaN(d.getTime())) return '';
    return format(d, 'h:mm a');
  } catch {
    return '';
  }
};

const parseEventDate = (dateStr?: string): Date | null => {
  if (!dateStr) return null;
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

const isEventToday = (event: ScheduleEvent): boolean => {
  if (!event || !event.startTime) return false;
  const start = parseEventDate(event.startTime);
  if (!start) return false;

  // 1. Starts today (in local timezone)
  if (isToday(start)) return true;

  // 2. Ends today (in local timezone)
  if (event.endTime) {
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
  onStatusChange,
  onAcknowledgeAnnouncement,
  onSelectEvent,
}) => {
  const safeEvents = Array.isArray(events) ? events : [];
  const safeAnnos = Array.isArray(announcements) ? announcements : [];

  // Strictly events and tasks scheduled for today (starts today, ends today, or spans today)
  const todayEvents = useMemo(() => {
    return safeEvents
      .filter(e => isEventToday(e))
      .sort((a, b) => {
        // In progress at top, then pending by time, completed at bottom
        if (a.status === 'completed' && b.status !== 'completed') return 1;
        if (a.status !== 'completed' && b.status === 'completed') return -1;
        if (a.status === 'in_progress' && b.status !== 'in_progress') return -1;
        if (a.status !== 'in_progress' && b.status === 'in_progress') return 1;
        const tA = a.startTime ? new Date(a.startTime).getTime() : 0;
        const tB = b.startTime ? new Date(b.startTime).getTime() : 0;
        return tA - tB;
      });
  }, [safeEvents]);

  const todayCompletedCount = useMemo(() => {
    return todayEvents.filter(e => e.status === 'completed').length;
  }, [todayEvents]);

  const inProgressTasks = useMemo(() => {
    return safeEvents.filter(e => e && e.status === 'in_progress');
  }, [safeEvents]);

  const completedEvents = useMemo(() => safeEvents.filter(e => e && e.status === 'completed'), [safeEvents]);
  const urgentTasks = useMemo(() => safeEvents.filter(e => e && e.priority === 'urgent' && e.status !== 'completed'), [safeEvents]);
  const unreadAnnouncements = useMemo(() => safeAnnos.filter(a => a && !a.isRead), [safeAnnos]);
  const pinnedAnnouncements = useMemo(() => safeAnnos.filter(a => a && a.isPinned), [safeAnnos]);

  const completionRate = safeEvents.length > 0
    ? Math.round((completedEvents.length / safeEvents.length) * 100)
    : 0;

  return (
    <div className="space-y-4 text-[#1c1917] dark:text-[#f4f4f5]">
      
      {/* Metrics Row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <StatCard
          title="Today"
          value={todayEvents.length}
          subtitle={`${todayCompletedCount} completed`}
          icon={<Calendar className="w-4 h-4" />}
          onClick={() => onNavigateTab('schedule')}
        />

        <StatCard
          title="Urgent"
          value={urgentTasks.length}
          subtitle={inProgressTasks.length > 0 ? `${inProgressTasks.length} in progress on board` : 'Priority items pending'}
          icon={<AlertTriangle className="w-4 h-4 text-amber-500" />}
          onClick={() => onNavigateTab('tasks')}
        />

        <StatCard
          title="Completion"
          value={`${completionRate}%`}
          subtitle={`${completedEvents.length}/${safeEvents.length} tasks done`}
          icon={<CheckSquare className="w-4 h-4 text-emerald-500" />}
          onClick={() => onNavigateTab('tasks')}
        />

        <StatCard
          title="Notices"
          value={unreadAnnouncements.length}
          subtitle={`${pinnedAnnouncements.length} pinned`}
          icon={<Megaphone className="w-4 h-4" />}
          onClick={() => onNavigateTab('announcements')}
        />
      </div>

      {/* Main Dual Columns */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        
        {/* Left: Today's Schedule & Active Tasks */}
        <div className="ios-card rounded-2xl p-4 sm:p-5 space-y-3.5">
          <div className="flex items-center justify-between border-b border-black/[0.06] dark:border-white/[0.08] pb-3">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-[12px] bg-[#007aff]/10 text-[#007aff] dark:text-[#0a84ff] flex items-center justify-center">
                <Calendar className="w-4 h-4 shrink-0" />
              </div>
              <div>
                <h3 className="text-xs font-bold text-neutral-900 dark:text-white">
                  Today's Schedule & Tasks
                </h3>
                <p className="text-[11px] text-neutral-400 font-medium">
                  {format(new Date(), 'EEEE, MMMM d, yyyy')}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-1">
              <button
                onClick={() => onNavigateTab('tasks')}
                className="text-xs font-semibold text-neutral-500 hover:text-neutral-900 dark:text-neutral-400 dark:hover:text-white flex items-center gap-1 px-2.5 py-1 rounded-[10px] hover:bg-black/5 dark:hover:bg-white/10 transition-colors cursor-pointer"
                title="View Task Board"
              >
                <span>Task Board</span>
                <ArrowRight className="w-3 h-3" />
              </button>
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

          <div className="space-y-2 max-h-[360px] overflow-y-auto pr-0.5">
            {todayEvents.length === 0 ? (
              <div className="text-center py-12 text-neutral-400 text-xs">
                <div className="w-10 h-10 rounded-[14px] bg-black/5 dark:bg-white/5 flex items-center justify-center mx-auto mb-2 opacity-50">
                  <Calendar className="w-5 h-5" />
                </div>
                <p className="font-medium">No events or active tasks for today.</p>
                {isAdmin && (
                  <div className="flex items-center justify-center gap-3 mt-2">
                    <button
                      onClick={onNewEvent}
                      className="text-xs font-semibold text-[#007aff] dark:text-[#0a84ff] hover:underline cursor-pointer"
                    >
                      + Add an event
                    </button>
                    <span className="text-neutral-300 dark:text-neutral-700">•</span>
                    <button
                      onClick={() => onNavigateTab('tasks')}
                      className="text-xs font-semibold text-[#007aff] dark:text-[#0a84ff] hover:underline cursor-pointer"
                    >
                      Open Task Board
                    </button>
                  </div>
                )}
              </div>
            ) : (
              todayEvents.map(evt => {
                const isCompleted = evt.status === 'completed';
                const isInProgress = evt.status === 'in_progress';
                return (
                  <div
                    key={evt.id}
                    onClick={() => onSelectEvent?.(evt)}
                    className={`p-3 rounded-[14px] border border-black/[0.06] dark:border-white/[0.08] transition-all flex items-start justify-between gap-3 cursor-pointer active:scale-[0.99] ${
                      isCompleted
                        ? 'bg-black/[0.02] dark:bg-white/[0.02] opacity-60 hover:opacity-100 hover:border-black/20 dark:hover:border-white/20'
                        : isInProgress
                        ? 'bg-amber-500/[0.04] border-amber-500/30 hover:border-amber-500/60 shadow-2xs'
                        : 'bg-black/[0.02] dark:bg-white/[0.03] hover:border-[#007aff]/40 shadow-2xs'
                    }`}
                  >
                    <div className="flex items-start gap-2.5 flex-1 min-w-0">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          onStatusChange(evt, isCompleted ? 'pending' : 'completed');
                        }}
                        className="mt-0.5 text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200 transition-colors active:scale-90 cursor-pointer"
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
                            {evt.title}
                          </h4>
                          {isInProgress && (
                            <span className="text-[9px] font-bold px-1.5 py-0.2 rounded bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/20">
                              In Progress
                            </span>
                          )}
                          {evt.priority === 'urgent' && !isCompleted && (
                            <span className="text-[9px] font-bold px-1.5 py-0.2 rounded bg-red-500/15 text-red-600 dark:text-red-400 border border-red-500/20">
                              Urgent
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-2 text-[11px] text-neutral-400 mt-1 flex-wrap">
                          <span className="font-medium">{formatEventTime(evt.startTime, evt.isAllDay)}</span>
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

        {/* Right: Broadcast & Announcements Bulletin */}
        <div className="ios-card rounded-2xl p-4 sm:p-5 space-y-3.5">
          <div className="flex items-center justify-between border-b border-black/[0.06] dark:border-white/[0.08] pb-3">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-[12px] bg-amber-500/10 text-amber-500 flex items-center justify-center">
                <Megaphone className="w-4 h-4 shrink-0" />
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

            <button
              onClick={() => onNavigateTab('announcements')}
              className="text-xs font-semibold text-neutral-500 hover:text-neutral-900 dark:text-neutral-400 dark:hover:text-white flex items-center gap-1 px-2.5 py-1 rounded-[10px] hover:bg-black/5 dark:hover:bg-white/10 transition-colors cursor-pointer"
            >
              <span>View All</span>
              <ArrowRight className="w-3 h-3" />
            </button>
          </div>

          <div className="space-y-2.5 max-h-[360px] overflow-y-auto pr-0.5">
            {safeAnnos.slice(0, 3).map(anno => (
              <div
                key={anno.id}
                className={`p-3.5 rounded-[16px] border transition-all ${
                  anno.isRead
                    ? 'bg-black/[0.02] dark:bg-white/[0.02] border-black/[0.04] dark:border-white/[0.06]'
                    : 'bg-black/[0.02] dark:bg-white/[0.03] border-amber-500/30 shadow-xs'
                }`}
              >
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

                <h4 className="text-xs font-bold leading-snug text-neutral-900 dark:text-neutral-100">
                  {anno.title}
                </h4>
                <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-0.5 line-clamp-2 leading-relaxed">
                  {anno.content}
                </p>
              </div>
            ))}
          </div>
        </div>

      </div>

    </div>
  );
};
