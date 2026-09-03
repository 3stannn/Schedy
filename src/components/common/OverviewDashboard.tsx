import React from 'react';
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
import { isToday, parseISO, format } from 'date-fns';

interface OverviewDashboardProps {
  events: ScheduleEvent[];
  announcements: Announcement[];
  isAdmin?: boolean;
  onNavigateTab: (tab: 'schedule' | 'announcements' | 'overview' | 'tasks' | 'pomodoro') => void;
  onNewEvent: () => void;
  onNewAnnouncement?: () => void;
  onStatusChange: (event: ScheduleEvent, status: EventStatus) => void;
  onAcknowledgeAnnouncement: (id: string) => void;
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

export const OverviewDashboard: React.FC<OverviewDashboardProps> = ({
  events = [],
  announcements = [],
  isAdmin = true,
  onNavigateTab,
  onNewEvent,
  onStatusChange,
  onAcknowledgeAnnouncement,
}) => {
  const safeEvents = Array.isArray(events) ? events : [];
  const safeAnnos = Array.isArray(announcements) ? announcements : [];

  const todayEvents = safeEvents.filter(e => {
    if (!e || !e.startTime) return false;
    try {
      const d = parseISO(e.startTime);
      return !isNaN(d.getTime()) && isToday(d);
    } catch {
      return false;
    }
  });

  const completedEvents = safeEvents.filter(e => e && e.status === 'completed');
  const urgentTasks = safeEvents.filter(e => e && e.priority === 'urgent' && e.status !== 'completed');
  const unreadAnnouncements = safeAnnos.filter(a => a && !a.isRead);
  const pinnedAnnouncements = safeAnnos.filter(a => a && a.isPinned);

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
          subtitle={`${todayEvents.filter(e => e.status === 'completed').length} completed`}
          icon={<Calendar className="w-4 h-4" />}
          onClick={() => onNavigateTab('schedule')}
        />

        <StatCard
          title="Urgent"
          value={urgentTasks.length}
          subtitle="Priority items pending"
          icon={<AlertTriangle className="w-4 h-4 text-amber-500" />}
          onClick={() => onNavigateTab('schedule')}
        />

        <StatCard
          title="Completion"
          value={`${completionRate}%`}
          subtitle={`${completedEvents.length}/${safeEvents.length} done`}
          icon={<CheckSquare className="w-4 h-4 text-emerald-500" />}
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
        
        {/* Left: Today's Schedule Timeline */}
        <div className="ios-card rounded-[22px] p-4 sm:p-5 space-y-3.5">
          <div className="flex items-center justify-between border-b border-black/[0.06] dark:border-white/[0.08] pb-3">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-[12px] bg-[#007aff]/10 text-[#007aff] dark:text-[#0a84ff] flex items-center justify-center">
                <Calendar className="w-4 h-4 shrink-0" />
              </div>
              <div>
                <h3 className="text-xs font-bold text-neutral-900 dark:text-white">
                  Today's Schedule
                </h3>
                <p className="text-[11px] text-neutral-400 font-medium">
                  {format(new Date(), 'EEEE, MMMM d, yyyy')}
                </p>
              </div>
            </div>

            <button
              onClick={() => onNavigateTab('schedule')}
              className="text-xs font-semibold text-neutral-500 hover:text-neutral-900 dark:text-neutral-400 dark:hover:text-white flex items-center gap-1 px-2.5 py-1 rounded-[10px] hover:bg-black/5 dark:hover:bg-white/10 transition-colors cursor-pointer"
            >
              <span>Calendar</span>
              <ArrowRight className="w-3 h-3" />
            </button>
          </div>

          <div className="space-y-2 max-h-[360px] overflow-y-auto pr-0.5">
            {todayEvents.length === 0 ? (
              <div className="text-center py-12 text-neutral-400 text-xs">
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
              todayEvents.map(evt => {
                const isCompleted = evt.status === 'completed';
                return (
                  <div
                    key={evt.id}
                    className={`p-3 rounded-[14px] border border-black/[0.06] dark:border-white/[0.08] transition-all flex items-start justify-between gap-3 ${
                      isCompleted
                        ? 'bg-black/[0.02] dark:bg-white/[0.02] opacity-60'
                        : 'bg-black/[0.02] dark:bg-white/[0.03] hover:border-[#007aff]/30 shadow-2xs'
                    }`}
                  >
                    <div className="flex items-start gap-2.5 flex-1 min-w-0">
                      <button
                        onClick={() => onStatusChange(evt, isCompleted ? 'pending' : 'completed')}
                        className="mt-0.5 text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200 transition-colors active:scale-90 cursor-pointer"
                      >
                        {isCompleted ? (
                          <CheckSquare className="w-4 h-4 text-[#007aff] dark:text-[#0a84ff]" />
                        ) : (
                          <Square className="w-4 h-4" />
                        )}
                      </button>

                      <div className="flex-1 min-w-0">
                        <h4 className={`text-xs font-semibold leading-snug truncate ${isCompleted ? 'line-through text-neutral-400' : 'text-neutral-900 dark:text-neutral-100'}`}>
                          {evt.title}
                        </h4>
                        <div className="flex items-center gap-2 text-[11px] text-neutral-400 mt-1">
                          <span className="font-medium">{formatEventTime(evt.startTime, evt.isAllDay)}</span>
                          {evt.location && <span className="truncate">• {evt.location}</span>}
                        </div>
                      </div>
                    </div>

                    {evt.meetingUrl && (
                      <a
                        href={evt.meetingUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="p-1.5 rounded-[8px] text-[#007aff] dark:text-[#0a84ff] hover:bg-[#007aff]/10 text-xs shrink-0 transition-colors"
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
        <div className="ios-card rounded-[22px] p-4 sm:p-5 space-y-3.5">
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
