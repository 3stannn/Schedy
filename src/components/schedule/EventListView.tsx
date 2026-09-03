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
      <div className="ios-card p-2 sm:p-2.5 rounded-2xl space-y-2">
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">

          {/* Search Input */}
          <div className="relative flex-1">
            <Search className="w-3.5 h-3.5 text-neutral-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Filter by keyword, title, notes..."
              className="w-full h-9 pl-9 pr-3 text-xs rounded-xl bg-black/[0.04] dark:bg-white/[0.06] border border-black/[0.06] dark:border-white/[0.08] text-neutral-900 dark:text-neutral-100 placeholder-neutral-400 outline-none focus:ring-2 focus:ring-[#007aff] transition-all box-border"
            />
          </div>

          {/* Time Filter Tabs */}
          <div className="ios-segmented-control shrink-0">
            {(['all', 'today', 'upcoming', 'past'] as const).map(tf => (
              <button
                key={tf}
                onClick={() => setTimeFilter(tf)}
                className={`ios-segmented-item capitalize whitespace-nowrap ${
                  timeFilter === tf ? 'ios-segmented-item-active' : ''
                }`}
              >
                {tf}
              </button>
            ))}
          </div>

          {isAdmin && (
            <button
              onClick={onAddNew}
              className="h-9 px-3.5 text-xs font-semibold text-white bg-[#007aff] hover:bg-[#0071e3] rounded-xl shadow-xs active:scale-[0.98] shrink-0 cursor-pointer flex items-center justify-center gap-1.5 box-border"
            >
              <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
              <span>New</span>
            </button>
          )}
        </div>

        {/* Dropdown Filters */}
        <div className="flex items-center gap-2 flex-wrap pt-2 border-t border-black/[0.06] dark:border-white/[0.08] text-xs">
          <span className="text-neutral-400 flex items-center gap-1 font-semibold mr-1 text-[10px] uppercase tracking-wider">
            <SlidersHorizontal className="w-3 h-3" /> Filter:
          </span>

          <select
            value={categoryFilter}
            onChange={e => setCategoryFilter(e.target.value)}
            className="h-9 px-3 rounded-xl bg-black/[0.04] dark:bg-white/[0.06] text-neutral-700 dark:text-neutral-300 text-xs border border-black/[0.06] dark:border-white/[0.08] outline-none focus:ring-2 focus:ring-[#007aff] cursor-pointer font-medium box-border"
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
            className="h-9 px-3 rounded-xl bg-black/[0.04] dark:bg-white/[0.06] text-neutral-700 dark:text-neutral-300 text-xs border border-black/[0.06] dark:border-white/[0.08] outline-none focus:ring-2 focus:ring-[#007aff] cursor-pointer font-medium box-border"
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
            className="h-9 px-3 rounded-xl bg-black/[0.04] dark:bg-white/[0.06] text-neutral-700 dark:text-neutral-300 text-xs border border-black/[0.06] dark:border-white/[0.08] outline-none focus:ring-2 focus:ring-[#007aff] cursor-pointer font-medium box-border"
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
              className="h-9 px-3 rounded-xl text-xs font-semibold text-[#ff3b30] hover:bg-[#ff3b30]/10 flex items-center justify-center cursor-pointer ml-auto box-border"
            >
              Reset Filters
            </button>
          )}
        </div>
      </div>

      {/* Counter */}
      <div className="flex items-center justify-between text-xs text-neutral-400 px-1">
        <span>
          Showing {filteredEvents.length} {filteredEvents.length === 1 ? 'event' : 'events'}
        </span>
      </div>

      {/* Events List Cards */}
      {filteredEvents.length === 0 ? (
        <div className="ios-card rounded-2xl p-12 text-center">
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
              <div className="flex items-center gap-1.5 pb-1 border-b border-black/[0.06] dark:border-white/[0.08]">
                <span className="text-xs font-bold text-neutral-800 dark:text-neutral-200">
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
