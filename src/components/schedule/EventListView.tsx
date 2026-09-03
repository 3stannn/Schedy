import React, { useState, useMemo } from 'react';
import type { ScheduleEvent, EventStatus } from '../../types/schedule';
import { EventCard } from './EventCard';
import {
  Search,
  Calendar,
  SlidersHorizontal,
  Plus
} from '../common/MovingIcon';
import {
  isToday,
  isTomorrow,
  isThisWeek,
  isPast,
  parseISO,
  compareAsc
} from 'date-fns';
import { stripHtml } from '../tasks/noteFormattingUtils';

interface EventListViewProps {
  events: ScheduleEvent[];
  isAdmin?: boolean;
  onEditEvent: (event: ScheduleEvent) => void;
  onDeleteEvent: (id: string) => void;
  onStatusChange: (event: ScheduleEvent, status: EventStatus) => void;
  onAddNew: () => void;
}

export const EventListView: React.FC<EventListViewProps> = ({
  events,
  isAdmin = true,
  onEditEvent,
  onDeleteEvent,
  onStatusChange,
  onAddNew,
}) => {
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [priorityFilter, setPriorityFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [timeFilter, setTimeFilter] = useState<'all' | 'today' | 'upcoming' | 'past'>('all');

  // Filtered and sorted events
  const filteredEvents = useMemo(() => {
    return events.filter(e => {
      // Search match
      const q = search.toLowerCase();
      const matchSearch = !search ||
        e.title.toLowerCase().includes(q) ||
        (e.description && stripHtml(e.description).toLowerCase().includes(q)) ||
        (e.location && e.location.toLowerCase().includes(q));

      // Category match
      const matchCategory = categoryFilter === 'all' || e.category === categoryFilter;

      // Priority match
      const matchPriority = priorityFilter === 'all' || e.priority === priorityFilter;

      // Status match
      const matchStatus = statusFilter === 'all' || e.status === statusFilter;

      // Time match
      const start = parseISO(e.startTime);
      let matchTime = true;
      if (timeFilter === 'today') matchTime = isToday(start);
      else if (timeFilter === 'upcoming') matchTime = !isPast(start) || isToday(start);
      else if (timeFilter === 'past') matchTime = isPast(start) && !isToday(start);

      return matchSearch && matchCategory && matchPriority && matchStatus && matchTime;
    }).sort((a, b) => compareAsc(parseISO(a.startTime), parseISO(b.startTime)));
  }, [events, search, categoryFilter, priorityFilter, statusFilter, timeFilter]);

  // Group events by period
  const groups = useMemo(() => {
    const todayList: ScheduleEvent[] = [];
    const tomorrowList: ScheduleEvent[] = [];
    const thisWeekList: ScheduleEvent[] = [];
    const laterList: ScheduleEvent[] = [];
    const pastList: ScheduleEvent[] = [];

    filteredEvents.forEach(e => {
      const start = parseISO(e.startTime);
      if (isToday(start)) {
        todayList.push(e);
      } else if (isTomorrow(start)) {
        tomorrowList.push(e);
      } else if (isPast(start)) {
        pastList.push(e);
      } else if (isThisWeek(start)) {
        thisWeekList.push(e);
      } else {
        laterList.push(e);
      }
    });

    return [
      { title: 'Today', items: todayList, count: todayList.length },
      { title: 'Tomorrow', items: tomorrowList, count: tomorrowList.length },
      { title: 'This Week', items: thisWeekList, count: thisWeekList.length },
      { title: 'Upcoming Later', items: laterList, count: laterList.length },
      { title: 'Past Events', items: pastList, count: pastList.length },
    ].filter(g => g.items.length > 0);
  }, [filteredEvents]);

  return (
    <div className="space-y-4 text-[#1c1917] dark:text-[#f4f4f5]">

      {/* Search & Filter Toolbar */}
      <div className="bg-white/85 dark:bg-[#161619]/85 backdrop-blur-md p-4 rounded-2xl border border-neutral-200/80 dark:border-neutral-800/80 shadow-xs space-y-3">
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">

          {/* Search Input */}
          <div className="relative flex-1">
            <Search className="w-3.5 h-3.5 text-neutral-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Filter by keyword, title, notes..."
              className="w-full pl-9 pr-3 py-1.5 text-xs rounded-xl bg-neutral-100/70 dark:bg-neutral-900/70 border border-neutral-200/60 dark:border-neutral-800/60 text-[#1c1917] dark:text-[#f4f4f5] placeholder-neutral-400 outline-none focus:ring-1 focus:ring-[#2383e2] transition-all"
            />
          </div>

          {/* Time Filter Tabs */}
          <div className="flex items-center rounded-xl border border-neutral-200/60 dark:border-neutral-800 bg-neutral-100/60 dark:bg-neutral-900/60 p-0.5 text-xs overflow-x-auto shrink-0 shadow-2xs">
            {(['all', 'today', 'upcoming', 'past'] as const).map(tf => (
              <button
                key={tf}
                onClick={() => setTimeFilter(tf)}
                className={`px-3 py-1 font-semibold capitalize rounded-lg transition-all whitespace-nowrap ${timeFilter === tf
                    ? 'bg-white dark:bg-[#202024] text-[#1c1917] dark:text-white shadow-xs'
                    : 'text-neutral-500 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white'
                  }`}
              >
                {tf}
              </button>
            ))}
          </div>

          {isAdmin && (
            <button
              onClick={onAddNew}
              className="flex items-center justify-center gap-1 px-3 py-1.5 text-xs font-semibold text-white bg-[#2383e2] hover:bg-[#1a73e8] rounded-xl shadow-xs hover:shadow-md transition-all active:scale-95 shrink-0"
            >
              <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
              <span>New</span>
            </button>
          )}
        </div>

        {/* Dropdown Filters */}
        <div className="flex items-center gap-2 flex-wrap pt-2.5 border-t border-neutral-100 dark:border-neutral-800/80 text-xs">
          <span className="text-neutral-400 flex items-center gap-1 font-semibold mr-1 text-[10px] uppercase tracking-wider">
            <SlidersHorizontal className="w-3 h-3" /> Filter:
          </span>

          <select
            value={categoryFilter}
            onChange={e => setCategoryFilter(e.target.value)}
            className="px-2.5 py-1 rounded-lg bg-neutral-100/80 dark:bg-neutral-800/80 text-neutral-700 dark:text-neutral-300 text-xs border border-neutral-200/50 dark:border-neutral-700/50 outline-none focus:ring-1 focus:ring-[#2383e2] cursor-pointer font-medium"
          >
            <option value="all">Category: All</option>
            <option value="work">Work</option>
            <option value="meeting">Meeting</option>
            <option value="deadline">Deadline</option>
            <option value="personal">Personal</option>
            <option value="education">Education</option>
            <option value="general">General</option>
          </select>

          <select
            value={priorityFilter}
            onChange={e => setPriorityFilter(e.target.value)}
            className="px-2.5 py-1 rounded-lg bg-neutral-100/80 dark:bg-neutral-800/80 text-neutral-700 dark:text-neutral-300 text-xs border border-neutral-200/50 dark:border-neutral-700/50 outline-none focus:ring-1 focus:ring-[#2383e2] cursor-pointer font-medium"
          >
            <option value="all">Priority: All</option>
            <option value="urgent">Urgent</option>
            <option value="high">High</option>
            <option value="medium">Medium</option>
            <option value="low">Low</option>
          </select>

          <select
            value={statusFilter}
            onChange={e => setStatusFilter(e.target.value)}
            className="px-2.5 py-1 rounded-lg bg-neutral-100/80 dark:bg-neutral-800/80 text-neutral-700 dark:text-neutral-300 text-xs border border-neutral-200/50 dark:border-neutral-700/50 outline-none focus:ring-1 focus:ring-[#2383e2] cursor-pointer font-medium"
          >
            <option value="all">Status: All</option>
            <option value="pending">Pending</option>
            <option value="in_progress">In Progress</option>
            <option value="completed">Completed</option>
            <option value="cancelled">Cancelled</option>
          </select>

          {(search || categoryFilter !== 'all' || priorityFilter !== 'all' || statusFilter !== 'all' || timeFilter !== 'all') && (
            <button
              onClick={() => {
                setSearch('');
                setCategoryFilter('all');
                setPriorityFilter('all');
                setStatusFilter('all');
                setTimeFilter('all');
              }}
              className="text-[11px] font-semibold text-rose-600 dark:text-rose-400 hover:underline px-2 py-0.5"
            >
              Reset Filters
            </button>
          )}
        </div>
      </div>

      {/* Results Count / Grouping Status */}
      <div className="flex items-center justify-between text-xs text-neutral-400 font-medium px-1">
        <span>
          Showing {filteredEvents.length} {filteredEvents.length === 1 ? 'event' : 'events'}
        </span>
      </div>

      {/* Events List Cards */}
      {filteredEvents.length === 0 ? (
        <div className="bg-white/85 dark:bg-[#161619]/85 backdrop-blur-md rounded-2xl border border-neutral-200/80 dark:border-neutral-800/80 p-12 text-center shadow-xs">
          <Calendar className="w-8 h-8 text-neutral-300 dark:text-neutral-600 mx-auto mb-2 opacity-50" />
          <h4 className="text-xs font-bold text-neutral-700 dark:text-neutral-300">
            No events found
          </h4>
          <p className="text-[11px] text-neutral-400 mt-1 max-w-sm mx-auto font-medium">
            Try adjusting your search query or reset the active filter tags.
          </p>
        </div>
      ) : (
        <div className="space-y-6">
          {groups.map(group => (
            <div key={group.title} className="space-y-2">
              <div className="flex items-center gap-1.5 pb-1 border-b border-neutral-100 dark:border-neutral-800">
                <span className="text-xs font-semibold text-[#37352f] dark:text-[#e6e6e6]">
                  {group.title}
                </span>
                <span className="text-[10px] font-mono text-neutral-400">
                  {group.count}
                </span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                {group.items.map(event => (
                  <EventCard
                    key={event.id}
                    event={event}
                    isAdmin={isAdmin}
                    onEdit={onEditEvent}
                    onDelete={onDeleteEvent}
                    onStatusChange={onStatusChange}
                  />
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

    </div>
  );
};
