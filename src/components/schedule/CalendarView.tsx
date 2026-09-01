import React, { useState, useEffect, useRef } from 'react';
import type { ScheduleEvent } from '../../types/schedule';
import { 
  ChevronLeft, 
  ChevronRight, 
  Calendar as CalendarIcon, 
  Clock, 
  Plus, 
  MapPin, 
  Video,
  Trash2,
  Edit3
} from 'lucide-react';
import { ConfirmModal } from '../common/ConfirmModal';
import { 
  format, 
  addMonths, 
  subMonths, 
  startOfMonth, 
  endOfMonth, 
  startOfWeek, 
  endOfWeek, 
  isSameMonth, 
  isSameDay, 
  addDays, 
  subDays, 
  addWeeks, 
  subWeeks, 
  parseISO, 
  isToday, 
  eachDayOfInterval,
  startOfDay,
  endOfDay,
  isBefore,
  isAfter,
  getHours,
  getMinutes
} from 'date-fns';

interface CalendarViewProps {
  events: ScheduleEvent[];
  isAdmin?: boolean;
  onSelectEvent: (event: ScheduleEvent) => void;
  onAddEventForDate: (date: Date) => void;
  onDeleteEvent?: (id: string) => void;
  onStatusChange?: (event: ScheduleEvent, status: any) => void;
}

const HOUR_HEIGHT = 64; // Height per hour in pixels
const HOURS = Array.from({ length: 24 }, (_, i) => i);

const formatHourDisplay = (hour: number) => {
  const period = hour >= 12 ? 'PM' : 'AM';
  const h = hour % 12 === 0 ? 12 : hour % 12;
  return `${h} ${period}`;
};

const formatHourSlotTitle = (hour: number) => {
  const period = hour >= 12 ? 'PM' : 'AM';
  const h = hour % 12 === 0 ? 12 : hour % 12;
  return `${h}:00 ${period}`;
};

interface PositionedEvent {
  event: ScheduleEvent;
  top: number;
  height: number;
  leftPercent: number;
  widthPercent: number;
  startTimeLabel: string;
  endTimeLabel: string;
}

export const CalendarView: React.FC<CalendarViewProps> = ({
  events,
  isAdmin = true,
  onSelectEvent,
  onAddEventForDate,
  onDeleteEvent,
}) => {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [viewMode, setViewMode] = useState<'month' | 'week' | 'day'>('month');
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [eventToDelete, setEventToDelete] = useState<ScheduleEvent | null>(null);
  const timeGridScrollRef = useRef<HTMLDivElement>(null);

  // Auto-scroll time grid to daytime hours (~7:30 AM) on view change
  useEffect(() => {
    if (viewMode === 'week' || viewMode === 'day') {
      const timer = setTimeout(() => {
        if (timeGridScrollRef.current) {
          const now = new Date();
          const targetHour = Math.max(6, Math.min(now.getHours() - 1, 18));
          timeGridScrollRef.current.scrollTop = targetHour * HOUR_HEIGHT;
        }
      }, 50);
      return () => clearTimeout(timer);
    }
  }, [viewMode, currentDate]);

  // Navigation handlers
  const handlePrev = () => {
    if (viewMode === 'month') setCurrentDate(subMonths(currentDate, 1));
    else if (viewMode === 'week') setCurrentDate(subWeeks(currentDate, 1));
    else setCurrentDate(subDays(currentDate, 1));
  };

  const handleNext = () => {
    if (viewMode === 'month') setCurrentDate(addMonths(currentDate, 1));
    else if (viewMode === 'week') setCurrentDate(addWeeks(currentDate, 1));
    else setCurrentDate(addDays(currentDate, 1));
  };

  const handleToday = () => {
    const now = new Date();
    setCurrentDate(now);
    setSelectedDate(now);
  };

  // Helper to get events on a specific day (supporting multi-day events)
  const getEventsForDay = (date: Date) => {
    const dayStart = startOfDay(date);
    const dayEnd = endOfDay(date);
    return events.filter(e => {
      if (!e.startTime) return false;
      try {
        const s = parseISO(e.startTime);
        const end = e.endTime ? parseISO(e.endTime) : s;
        if (isNaN(s.getTime())) return false;
        return !isAfter(s, dayEnd) && !isBefore(end, dayStart);
      } catch {
        return false;
      }
    });
  };

  const selectedDayEvents = getEventsForDay(selectedDate);

  // Month grid generation
  const monthStart = startOfMonth(currentDate);
  const monthEnd = endOfMonth(monthStart);
  const startDate = startOfWeek(monthStart);
  const endDate = endOfWeek(monthEnd);
  const monthDays = eachDayOfInterval({ start: startDate, end: endDate });

  // Week grid generation
  const weekStart = startOfWeek(currentDate);
  const weekDays = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));

  // Notion-style pastel chip tags for Month list
  const getPriorityChipStyle = (priority: string) => {
    switch (priority) {
      case 'urgent': return 'bg-[#fdebec] text-[#c4554d] dark:bg-[#3c1e1e] dark:text-[#e06c75]';
      case 'high': return 'bg-[#fbf3db] text-[#89632a] dark:bg-[#392e1e] dark:text-[#dfab01]';
      case 'medium': return 'bg-[#e7f3f8] text-[#245e82] dark:bg-[#182937] dark:text-[#78b3dc]';
      default: return 'bg-[#f1f1ef] text-[#787774] dark:bg-[#2e2e2e] dark:text-[#9b9a97]';
    }
  };

  // Timetable Card Color Themes (Matching Screenshot Style)
  const getEventCardTheme = (event: ScheduleEvent) => {
    switch (event.category) {
      case 'meeting':
      case 'work':
        return {
          card: 'bg-[#e8f3fc] dark:bg-[#152a3d] border-[#bedcf7] dark:border-[#1d4263] text-[#1c4d79] dark:text-[#9bc2e6]',
          title: 'text-[#143c60] dark:text-[#b8d8f8]',
          pill: 'bg-[#cfe5f9] dark:bg-[#1e3f5d] text-[#143c60] dark:text-[#b8d8f8]',
        };
      case 'deadline':
        return {
          card: 'bg-[#fdeef1] dark:bg-[#381a22] border-[#f8c2cb] dark:border-[#5a2432] text-[#972b42] dark:text-[#f395a9]',
          title: 'text-[#801e33] dark:text-[#f8a8b9]',
          pill: 'bg-[#fad6dd] dark:bg-[#4d1f2b] text-[#801e33] dark:text-[#f8a8b9]',
        };
      case 'personal':
        return {
          card: 'bg-[#ebf8f0] dark:bg-[#163022] border-[#bfe8cd] dark:border-[#1e4a32] text-[#1d5c34] dark:text-[#88d9a2]',
          title: 'text-[#154627] dark:text-[#a0e4b7]',
          pill: 'bg-[#d2f1dc] dark:bg-[#20452f] text-[#154627] dark:text-[#a0e4b7]',
        };
      case 'education':
        return {
          card: 'bg-[#fdf6e7] dark:bg-[#342914] border-[#f8dfad] dark:border-[#56411a] text-[#8c5f11] dark:text-[#f5cb74]',
          title: 'text-[#734c09] dark:text-[#fad88f]',
          pill: 'bg-[#faebd0] dark:bg-[#493717] text-[#734c09] dark:text-[#fad88f]',
        };
      default:
        if (event.priority === 'urgent') {
          return {
            card: 'bg-[#fdeef1] dark:bg-[#381a22] border-[#f8c2cb] dark:border-[#5a2432] text-[#972b42] dark:text-[#f395a9]',
            title: 'text-[#801e33] dark:text-[#f8a8b9]',
            pill: 'bg-[#fad6dd] dark:bg-[#4d1f2b] text-[#801e33] dark:text-[#f8a8b9]',
          };
        }
        return {
          card: 'bg-[#f3f0fa] dark:bg-[#251e36] border-[#dcd2f3] dark:border-[#3e315b] text-[#4d3385] dark:text-[#c4b3ea]',
          title: 'text-[#3d276c] dark:text-[#d3c5f1]',
          pill: 'bg-[#e4dbf7] dark:bg-[#34284d] text-[#3d276c] dark:text-[#d3c5f1]',
        };
    }
  };

  /**
   * Layout algorithm: Calculate exact top, height, and side-by-side columns for timed events on a day
   */
  const calculateTimedLayout = (dayEvents: ScheduleEvent[], dayDate: Date): PositionedEvent[] => {
    const timed = dayEvents.filter(e => !e.isAllDay);
    if (timed.length === 0) return [];

    interface EventWithInterval {
      event: ScheduleEvent;
      startMin: number;
      endMin: number;
      startLabel: string;
      endLabel: string;
    }

    const intervals: EventWithInterval[] = timed.map(e => {
      const s = parseISO(e.startTime);
      const end = e.endTime ? parseISO(e.endTime) : s;

      let startMin = isSameDay(s, dayDate) ? getHours(s) * 60 + getMinutes(s) : 0;
      let endMin = isSameDay(end, dayDate) ? getHours(end) * 60 + getMinutes(end) : 24 * 60;

      // Minimum visual block of 25 minutes
      if (endMin <= startMin) endMin = startMin + 30;
      if (endMin - startMin < 25) endMin = startMin + 25;

      return {
        event: e,
        startMin,
        endMin,
        startLabel: format(s, 'h:mm a'),
        endLabel: format(end, 'h:mm a'),
      };
    });

    // Sort by start time, then longer duration first
    intervals.sort((a, b) => {
      if (a.startMin !== b.startMin) return a.startMin - b.startMin;
      return (b.endMin - b.startMin) - (a.endMin - a.startMin);
    });

    // Cluster overlapping events together
    const clusters: EventWithInterval[][] = [];
    let currentCluster: EventWithInterval[] = [];
    let clusterMaxEnd = -1;

    for (const item of intervals) {
      if (currentCluster.length === 0) {
        currentCluster.push(item);
        clusterMaxEnd = item.endMin;
      } else if (item.startMin < clusterMaxEnd) {
        currentCluster.push(item);
        clusterMaxEnd = Math.max(clusterMaxEnd, item.endMin);
      } else {
        clusters.push(currentCluster);
        currentCluster = [item];
        clusterMaxEnd = item.endMin;
      }
    }
    if (currentCluster.length > 0) {
      clusters.push(currentCluster);
    }

    const result: PositionedEvent[] = [];

    // Assign column positions inside each overlapping cluster
    for (const cluster of clusters) {
      const columns: number[] = []; // tracks endMin for each column index
      const placements: { item: EventWithInterval; col: number }[] = [];

      for (const item of cluster) {
        let placedCol = -1;
        for (let c = 0; c < columns.length; c++) {
          if (columns[c] <= item.startMin) {
            columns[c] = item.endMin;
            placedCol = c;
            break;
          }
        }
        if (placedCol === -1) {
          columns.push(item.endMin);
          placedCol = columns.length - 1;
        }
        placements.push({ item, col: placedCol });
      }

      const totalCols = columns.length;
      for (const p of placements) {
        const top = (p.item.startMin / 60) * HOUR_HEIGHT;
        const height = ((p.item.endMin - p.item.startMin) / 60) * HOUR_HEIGHT;
        const widthPercent = 100 / totalCols;
        const leftPercent = p.col * widthPercent;

        result.push({
          event: p.item.event,
          top,
          height: Math.max(26, height - 3), // slight gap between blocks
          leftPercent,
          widthPercent,
          startTimeLabel: p.item.startLabel,
          endTimeLabel: p.item.endLabel,
        });
      }
    }

    return result;
  };

  // Current time marker position in minutes
  const now = new Date();
  const currentMinutes = now.getHours() * 60 + now.getMinutes();
  const currentTimeTop = (currentMinutes / 60) * HOUR_HEIGHT;

  return (
    <>
      {eventToDelete && (
        <ConfirmModal
          isOpen={!!eventToDelete}
          onClose={() => setEventToDelete(null)}
          onConfirm={() => {
            if (onDeleteEvent) onDeleteEvent(eventToDelete.id);
            setEventToDelete(null);
          }}
          title="Delete Event"
          message={`Delete "${eventToDelete.title}"? This action cannot be undone.`}
        />
      )}

      <div className="space-y-4 text-[#37352f] dark:text-[#e6e6e6]">
        
        {/* Top Header & Navigation Bar */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 p-3.5 bg-white/85 dark:bg-[#161619]/85 backdrop-blur-md rounded-2xl border border-neutral-200/80 dark:border-neutral-800/80 shadow-xs">
          <div className="flex items-center gap-3 w-full sm:w-auto justify-between sm:justify-start">
            <div className="flex items-center rounded-xl border border-neutral-200/80 dark:border-neutral-800 bg-neutral-100/60 dark:bg-neutral-900/60 p-1 text-xs overflow-hidden shadow-2xs">
              <button
                onClick={handlePrev}
                className="p-1.5 rounded-lg text-neutral-500 hover:text-neutral-900 dark:hover:text-white hover:bg-white dark:hover:bg-neutral-800 transition-all"
                title="Previous"
              >
                <ChevronLeft className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={handleToday}
                className="px-2.5 py-1 font-semibold text-neutral-700 dark:text-neutral-200 hover:bg-white dark:hover:bg-neutral-800 rounded-lg transition-all"
              >
                Today
              </button>
              <button
                onClick={handleNext}
                className="p-1.5 rounded-lg text-neutral-500 hover:text-neutral-900 dark:hover:text-white hover:bg-white dark:hover:bg-neutral-800 transition-all"
                title="Next"
              >
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>

            <h2 className="text-sm font-bold text-[#1c1917] dark:text-white tracking-tight">
              {format(currentDate, viewMode === 'day' ? 'EEEE, MMMM d, yyyy' : 'MMMM yyyy')}
            </h2>
          </div>

          {/* View Mode Switcher */}
          <div className="flex items-center gap-2 w-full sm:w-auto justify-between sm:justify-end text-xs">
            <div className="flex items-center rounded-xl border border-neutral-200/80 dark:border-neutral-800 bg-neutral-100/60 dark:bg-neutral-900/60 p-1 shadow-2xs">
              {(['month', 'week', 'day'] as const).map(mode => (
                <button
                  key={mode}
                  onClick={() => setViewMode(mode)}
                  className={`px-3 py-1 font-semibold capitalize rounded-lg transition-all ${
                    viewMode === mode
                      ? 'bg-white dark:bg-[#202024] text-[#1c1917] dark:text-white shadow-xs'
                      : 'text-neutral-500 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white'
                  }`}
                >
                  {mode}
                </button>
              ))}
            </div>

            {isAdmin && (
              <button
                onClick={() => onAddEventForDate(selectedDate)}
                className="flex items-center gap-1 px-3 py-1.5 text-xs font-semibold text-white bg-[#2383e2] hover:bg-[#1a73e8] rounded-xl shadow-xs hover:shadow-md transition-all active:scale-95"
              >
                <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
                <span>New</span>
              </button>
            )}
          </div>
        </div>

        {/* ========================================================================= */}
        {/* 1. MONTH GRID VIEW                                                        */}
        {/* ========================================================================= */}
        {viewMode === 'month' && (
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
            {/* Month Calendar Grid */}
            <div className="lg:col-span-3 bg-white/85 dark:bg-[#161619]/85 backdrop-blur-md rounded-2xl border border-neutral-200/80 dark:border-neutral-800/80 p-3.5 overflow-hidden shadow-xs">
              {/* Weekday headers */}
              <div className="grid grid-cols-7 gap-px text-center mb-2 pb-2 border-b border-neutral-100 dark:border-neutral-800">
                {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
                  <div key={day} className="text-[11px] font-bold uppercase tracking-wider text-neutral-400 py-0.5">
                    <span className="hidden sm:inline">{day}</span>
                    <span className="sm:hidden">{day[0]}</span>
                  </div>
                ))}
              </div>

              {/* Days grid */}
              <div className="grid grid-cols-7 gap-1.5">
                {monthDays.map((day, idx) => {
                  const dayEvents = getEventsForDay(day);
                  const isSelected = isSameDay(day, selectedDate);
                  const isCurrentMonth = isSameMonth(day, monthStart);
                  const isCurrentDay = isToday(day);

                  return (
                    <div
                      key={idx}
                      onClick={() => setSelectedDate(day)}
                      className={`min-h-[58px] xs:min-h-[70px] sm:min-h-[96px] p-1 sm:p-2 rounded-xl border transition-all cursor-pointer flex flex-col justify-between ${
                        isSelected
                          ? 'border-[#2383e2] bg-[#e7f3f8]/40 dark:bg-[#182937]/40 ring-1 ring-[#2383e2]/40 shadow-xs'
                          : 'border-neutral-200/60 dark:border-neutral-800/60 bg-white/60 dark:bg-neutral-900/30 hover:border-neutral-300 dark:hover:border-neutral-700'
                      } ${!isCurrentMonth ? 'opacity-35' : ''}`}
                    >
                      <div className="flex items-center justify-between">
                        <span
                          className={`text-[11px] sm:text-xs font-bold w-4 h-4 sm:w-5 sm:h-5 flex items-center justify-center rounded-md sm:rounded-lg ${
                            isCurrentDay
                              ? 'bg-rose-500 text-white shadow-xs'
                              : 'text-neutral-700 dark:text-neutral-300'
                          }`}
                        >
                          {format(day, 'd')}
                        </span>
                        {dayEvents.length > 0 && (
                          <span className="text-[8px] sm:text-[9px] font-mono px-1 rounded bg-neutral-100 dark:bg-neutral-800 text-neutral-500 hidden xs:inline">
                            {dayEvents.length}
                          </span>
                        )}
                      </div>

                      {/* Mobile indicator dots */}
                      <div className="flex sm:hidden items-center justify-center gap-0.5 mt-1 overflow-hidden">
                        {dayEvents.slice(0, 3).map((evt, eIdx) => (
                          <span
                            key={eIdx}
                            className={`w-1.5 h-1.5 rounded-full shrink-0 ${
                              evt.priority === 'urgent'
                                ? 'bg-rose-500'
                                : evt.priority === 'high'
                                ? 'bg-amber-500'
                                : 'bg-blue-500'
                            }`}
                          />
                        ))}
                      </div>

                      {/* Desktop Events pills in cell */}
                      <div className="hidden sm:block space-y-0.5 mt-1 overflow-hidden">
                        {dayEvents.slice(0, 2).map(evt => (
                          <div
                            key={evt.id}
                            onClick={(e) => {
                              e.stopPropagation();
                              onSelectEvent(evt);
                            }}
                            className={`text-[10px] font-medium px-1.5 py-0.5 rounded truncate cursor-pointer ${getPriorityChipStyle(evt.priority)} ${
                              evt.status === 'completed' ? 'line-through opacity-50' : ''
                            }`}
                            title={`${evt.title} (${evt.isAllDay ? 'All Day' : format(parseISO(evt.startTime), 'p')})`}
                          >
                            {evt.title}
                          </div>
                        ))}
                        {dayEvents.length > 2 && (
                          <div className="text-[9px] text-neutral-400 font-medium px-1">
                            +{dayEvents.length - 2} more
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Selected Date Detail Sidebar */}
            <div className="bg-white/85 dark:bg-[#161619]/85 backdrop-blur-md rounded-2xl border border-neutral-200/80 dark:border-neutral-800/80 p-4 shadow-xs space-y-3.5">
              <div className="flex items-center justify-between border-b border-neutral-100 dark:border-neutral-800 pb-2.5">
                <div>
                  <h3 className="font-bold text-sm text-[#1c1917] dark:text-white">
                    {format(selectedDate, 'EEEE')}
                  </h3>
                  <p className="text-[11px] text-neutral-400 font-medium">
                    {format(selectedDate, 'MMMM d, yyyy')}
                  </p>
                </div>
                {isAdmin && (
                  <button
                    onClick={() => onAddEventForDate(selectedDate)}
                    className="p-1.5 text-neutral-400 hover:text-neutral-900 dark:hover:text-white hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded-xl transition-all active:scale-90"
                    title="Add event for this day"
                  >
                    <Plus className="w-4 h-4 stroke-[2.5]" />
                  </button>
                )}
              </div>

              {/* List of events on this day */}
              <div className="space-y-2 max-h-[460px] overflow-y-auto pr-0.5 text-xs">
                {selectedDayEvents.length === 0 ? (
                  <div className="text-center py-10 text-neutral-400 text-xs">
                    <CalendarIcon className="w-6 h-6 mx-auto mb-1.5 opacity-30" />
                    No events on this day.
                  </div>
                ) : (
                  selectedDayEvents.map(evt => (
                    <div
                      key={evt.id}
                      className="p-3 rounded-xl border border-neutral-200/60 dark:border-neutral-800/60 bg-white/70 dark:bg-neutral-900/40 hover:border-neutral-300 dark:hover:border-neutral-700 transition-all group shadow-2xs hover:shadow-xs"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <h4
                          onClick={() => onSelectEvent(evt)}
                          className={`text-xs font-semibold cursor-pointer hover:underline text-[#1c1917] dark:text-[#f4f4f5] leading-snug flex-1 ${
                            evt.status === 'completed' ? 'line-through text-neutral-400' : ''
                          }`}
                        >
                          {evt.title}
                        </h4>
                        
                        {isAdmin && (
                          <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                            <button
                              onClick={() => onSelectEvent(evt)}
                              className="p-1 text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200 rounded-lg hover:bg-neutral-100 dark:hover:bg-neutral-800"
                              title="Edit"
                            >
                              <Edit3 className="w-3 h-3" />
                            </button>
                            {onDeleteEvent && (
                              <button
                                onClick={() => setEventToDelete(evt)}
                                className="p-1 text-neutral-400 hover:text-rose-600 rounded-lg hover:bg-rose-50 dark:hover:bg-rose-950/40"
                                title="Delete event"
                              >
                                <Trash2 className="w-3 h-3" />
                              </button>
                            )}
                          </div>
                        )}
                      </div>

                      <div className="mt-2 flex items-center gap-2 text-[10px] text-neutral-400 flex-wrap font-medium">
                        <span className={`px-1.5 py-0.5 rounded-md font-semibold ${getPriorityChipStyle(evt.priority)}`}>
                          {evt.priority}
                        </span>
                        <span className="flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          {evt.isAllDay ? 'All Day' : format(parseISO(evt.startTime), 'h:mm a')}
                        </span>
                        {evt.location && (
                          <span className="flex items-center gap-1 truncate max-w-[100px]">
                            <MapPin className="w-3 h-3" />
                            <span className="truncate">{evt.location}</span>
                          </span>
                        )}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* 2. WEEK TIMETABLE VIEW (Occupying Exact Event Times)                      */}
        {/* ========================================================================= */}
        {viewMode === 'week' && (
          <div className="bg-white/90 dark:bg-[#161619]/90 backdrop-blur-md rounded-2xl border border-neutral-200/80 dark:border-neutral-800/80 overflow-hidden shadow-sm">
            
            {/* Scrollable timetable container with touch-friendly scrolling */}
            <div
              ref={timeGridScrollRef}
              className="max-h-[70vh] sm:max-h-[640px] overflow-y-auto overflow-x-auto relative select-none scrollbar-thin"
            >
              <div className="min-w-[770px] sm:min-w-full">
                
                {/* Sticky Header Row with Day Names */}
                <div className="sticky top-0 z-30 flex bg-white/95 dark:bg-[#161619]/95 backdrop-blur-md border-b border-neutral-200/80 dark:border-neutral-800 shadow-2xs">
                  {/* Sticky top-left corner over time column */}
                  <div className="sticky left-0 z-40 w-12 sm:w-16 shrink-0 border-r border-neutral-200/60 dark:border-neutral-800/60 py-2 sm:py-2.5 px-1 text-center text-[9px] sm:text-[10px] font-bold text-neutral-400 uppercase tracking-wider bg-white/95 dark:bg-[#161619]/95 backdrop-blur-md shadow-2xs">
                    Time
                  </div>

                  {/* 7 Days Header Columns */}
                  <div className="flex-1 grid grid-cols-7 divide-x divide-neutral-200/60 dark:divide-neutral-800/60">
                    {weekDays.map((day, idx) => {
                      const isCurrentDay = isToday(day);
                      return (
                        <div
                          key={idx}
                          onClick={() => {
                            setSelectedDate(day);
                            onAddEventForDate(day);
                          }}
                          className={`py-1.5 sm:py-2 px-1 text-center cursor-pointer transition-colors hover:bg-neutral-50 dark:hover:bg-white/5 active:bg-blue-500/10 ${
                            isCurrentDay ? 'bg-blue-50/40 dark:bg-blue-950/20' : ''
                          }`}
                          title="Click to add event on this day"
                        >
                          <span className="text-[10px] sm:text-[11px] font-medium text-neutral-500 dark:text-neutral-400 block">
                            {format(day, 'EEE')}
                          </span>
                          <span
                            className={`inline-flex items-center justify-center w-5 h-5 sm:w-6 sm:h-6 rounded-full text-[11px] sm:text-xs font-bold mt-0.5 ${
                              isCurrentDay
                                ? 'bg-[#2383e2] text-white shadow-xs'
                                : 'text-neutral-800 dark:text-neutral-200'
                            }`}
                          >
                            {format(day, 'd')}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* All-Day Events Strip (if any) */}
                {(() => {
                  const allDayEventsInWeek = weekDays.map(day => ({
                    day,
                    events: getEventsForDay(day).filter(e => e.isAllDay),
                  }));
                  const hasAllDay = allDayEventsInWeek.some(d => d.events.length > 0);
                  if (!hasAllDay) return null;

                  return (
                    <div className="flex border-b border-neutral-200/80 dark:border-neutral-800 bg-neutral-50/70 dark:bg-neutral-900/50 text-xs">
                      <div className="sticky left-0 z-30 w-12 sm:w-16 shrink-0 border-r border-neutral-200/60 dark:border-neutral-800/60 p-1.5 sm:p-2 text-[9px] sm:text-[10px] font-bold text-neutral-400 uppercase tracking-wider flex items-center justify-center bg-neutral-100/90 dark:bg-neutral-900/90 backdrop-blur-md shadow-2xs">
                        All Day
                      </div>
                      <div className="flex-1 grid grid-cols-7 divide-x divide-neutral-200/60 dark:divide-neutral-800/60 p-1">
                        {allDayEventsInWeek.map(({ events: dayAllDayEvents }, idx) => (
                          <div key={idx} className="space-y-1 px-0.5 sm:px-1">
                            {dayAllDayEvents.map(evt => {
                              const theme = getEventCardTheme(evt);
                              return (
                                <div
                                  key={evt.id}
                                  onClick={() => onSelectEvent(evt)}
                                  className={`p-1 sm:p-1.5 rounded-lg border text-[10px] sm:text-[11px] font-semibold truncate cursor-pointer transition-all hover:scale-[1.02] shadow-2xs ${theme.card} ${
                                    evt.status === 'completed' ? 'line-through opacity-50' : ''
                                  }`}
                                  title={evt.title}
                                >
                                  {evt.title}
                                </div>
                              );
                            })}
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })()}

                {/* Timetable Body (24 Hours Grid) */}
                <div className="relative flex" style={{ height: `${24 * HOUR_HEIGHT}px` }}>
                  
                  {/* Left Time Axis Labels (Sticky on X-axis so it stays visible while scrolling horizontally on mobile) */}
                  <div className="sticky left-0 z-20 w-12 sm:w-16 shrink-0 border-r border-neutral-200/60 dark:border-neutral-800/60 relative bg-white/95 dark:bg-[#161619]/95 backdrop-blur-md select-none shadow-2xs">
                    {HOURS.map(hour => (
                      <div
                        key={hour}
                        className="absolute right-1.5 sm:right-2 -translate-y-1/2 text-[9px] sm:text-[10px] font-semibold text-neutral-400 dark:text-neutral-500 whitespace-nowrap"
                        style={{ top: `${hour * HOUR_HEIGHT}px` }}
                      >
                        {formatHourDisplay(hour)}
                      </div>
                    ))}
                  </div>

                  {/* 7 Columns Container */}
                  <div className="flex-1 grid grid-cols-7 divide-x divide-neutral-200/50 dark:divide-neutral-800/50 relative">
                    
                    {/* Background Horizontal Hour Guidelines */}
                    <div className="absolute inset-0 pointer-events-none">
                      {HOURS.map(hour => (
                        <div
                          key={hour}
                          className="absolute inset-x-0 border-t border-neutral-200/50 dark:border-neutral-800/50"
                          style={{ top: `${hour * HOUR_HEIGHT}px` }}
                        />
                      ))}
                    </div>

                    {/* Day Columns */}
                    {weekDays.map((day, dIdx) => {
                      const dayEvents = getEventsForDay(day);
                      const positionedEvents = calculateTimedLayout(dayEvents, day);
                      const isCurrentDay = isToday(day);

                      return (
                        <div
                          key={dIdx}
                          className="relative h-full transition-colors hover:bg-neutral-50/30 dark:hover:bg-white/[0.02]"
                          onDoubleClick={(e) => {
                            const rect = e.currentTarget.getBoundingClientRect();
                            const clickY = e.clientY - rect.top;
                            const clickedHour = Math.max(0, Math.min(23, Math.floor(clickY / HOUR_HEIGHT)));
                            const newDate = new Date(day);
                            newDate.setHours(clickedHour, 0, 0, 0);
                            onAddEventForDate(newDate);
                          }}
                        >
                          {/* Current time horizontal indicator line */}
                          {isCurrentDay && (
                            <div
                              className="absolute inset-x-0 z-10 pointer-events-none flex items-center"
                              style={{ top: `${currentTimeTop}px` }}
                            >
                              <div className="w-2 sm:w-2.5 h-2 sm:h-2.5 -ml-1 rounded-full bg-rose-500 shadow-xs" />
                              <div className="flex-1 h-[2px] bg-rose-500" />
                            </div>
                          )}

                          {/* Interactive Hour Slot Click Targets */}
                          {HOURS.map(hour => (
                            <div
                              key={hour}
                              onClick={() => {
                                const newDate = new Date(day);
                                newDate.setHours(hour, 0, 0, 0);
                                setSelectedDate(newDate);
                              }}
                              className="absolute inset-x-0 cursor-pointer hover:bg-blue-500/5 transition-colors"
                              style={{
                                top: `${hour * HOUR_HEIGHT}px`,
                                height: `${HOUR_HEIGHT}px`,
                              }}
                              title={`Click or double click to add event at ${formatHourSlotTitle(hour)}`}
                            />
                          ))}

                          {/* Time-Occupying Event Cards */}
                          {positionedEvents.map((pos) => {
                            const { event: evt, top, height, leftPercent, widthPercent, startTimeLabel, endTimeLabel } = pos;
                            const theme = getEventCardTheme(evt);

                            return (
                              <div
                                key={evt.id}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  onSelectEvent(evt);
                                }}
                                style={{
                                  top: `${top}px`,
                                  height: `${height}px`,
                                  left: `${leftPercent}%`,
                                  width: `${widthPercent}%`,
                                }}
                                className={`absolute z-10 p-1.5 sm:p-2 rounded-[10px] sm:rounded-[14px] border shadow-2xs hover:shadow-md hover:z-20 transition-all cursor-pointer flex flex-col justify-between overflow-hidden group ${
                                  theme.card
                                } ${evt.status === 'completed' ? 'opacity-50' : ''}`}
                                title={`${evt.title}\n${startTimeLabel} - ${endTimeLabel}`}
                              >
                                {/* Top: Event Title */}
                                <div className="min-w-0">
                                  <h4 className={`text-[11px] sm:text-xs font-bold leading-tight line-clamp-2 ${theme.title}`}>
                                    {evt.title}
                                  </h4>
                                  {evt.location && (
                                    <p className="text-[9px] sm:text-[10px] opacity-75 truncate mt-0.5 hidden sm:flex items-center gap-1">
                                      <MapPin className="w-2.5 h-2.5 shrink-0" />
                                      <span>{evt.location}</span>
                                    </p>
                                  )}
                                </div>

                                {/* Bottom: Start & End Time Pills (Responsive sizing) */}
                                <div className="flex items-center gap-0.5 sm:gap-1 mt-0.5 sm:mt-1 pt-0.5 sm:pt-1 flex-wrap">
                                  <span className={`text-[8px] sm:text-[10px] font-bold px-1 sm:px-1.5 py-0.2 sm:py-0.5 rounded-[4px] sm:rounded-[6px] ${theme.pill} font-mono tracking-tight`}>
                                    {startTimeLabel}
                                  </span>
                                  <span className={`text-[8px] sm:text-[10px] font-bold px-1 sm:px-1.5 py-0.2 sm:py-0.5 rounded-[4px] sm:rounded-[6px] ${theme.pill} font-mono tracking-tight`}>
                                    {endTimeLabel}
                                  </span>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      );
                    })}
                  </div>
                </div>

              </div>
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* 3. DAY TIMETABLE VIEW (Occupying Exact Event Times)                        */}
        {/* ========================================================================= */}
        {viewMode === 'day' && (
          <div className="bg-white/90 dark:bg-[#161619]/90 backdrop-blur-md rounded-2xl border border-neutral-200/80 dark:border-neutral-800/80 overflow-hidden shadow-sm w-full">
            
            {/* Scrollable timetable container */}
            <div
              ref={timeGridScrollRef}
              className="max-h-[70vh] sm:max-h-[640px] overflow-y-auto relative select-none w-full scrollbar-thin"
            >
              <div className="w-full min-w-0">
                
                {/* Sticky Header with Day Title */}
                <div className="sticky top-0 z-20 flex items-center justify-between bg-white/95 dark:bg-[#161619]/95 backdrop-blur-md border-b border-neutral-200/80 dark:border-neutral-800 p-2.5 sm:p-3 shadow-2xs">
                  <div className="flex items-center gap-2 sm:gap-2.5 min-w-0">
                    <span
                      className={`inline-flex items-center justify-center w-7 h-7 sm:w-8 sm:h-8 rounded-xl text-xs sm:text-sm font-bold shrink-0 ${
                        isToday(currentDate)
                          ? 'bg-[#2383e2] text-white shadow-xs'
                          : 'bg-neutral-100 dark:bg-neutral-800 text-neutral-800 dark:text-neutral-200'
                      }`}
                    >
                      {format(currentDate, 'd')}
                    </span>
                    <div className="min-w-0">
                      <h3 className="text-xs sm:text-sm font-bold text-[#1c1917] dark:text-white truncate">
                        {format(currentDate, 'EEEE')}
                      </h3>
                      <p className="text-[10px] sm:text-[11px] text-neutral-400 font-medium truncate">
                        {selectedDayEvents.length} event{selectedDayEvents.length === 1 ? '' : 's'}
                      </p>
                    </div>
                  </div>

                  {isAdmin && (
                    <button
                      onClick={() => onAddEventForDate(currentDate)}
                      className="flex items-center gap-1 px-2.5 sm:px-3 py-1 sm:py-1.5 text-[11px] sm:text-xs font-semibold text-white bg-[#2383e2] hover:bg-[#1a73e8] rounded-xl shadow-xs transition-all active:scale-95 shrink-0"
                    >
                      <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
                      <span>Add Event</span>
                    </button>
                  )}
                </div>

                {/* All-Day Events Strip for Day View */}
                {(() => {
                  const dayAllDay = selectedDayEvents.filter(e => e.isAllDay);
                  if (dayAllDay.length === 0) return null;

                  return (
                    <div className="flex border-b border-neutral-200/80 dark:border-neutral-800 bg-neutral-50/60 dark:bg-neutral-900/40 text-xs">
                      <div className="w-12 sm:w-16 shrink-0 border-r border-neutral-200/60 dark:border-neutral-800/60 p-1.5 sm:p-2 text-[9px] sm:text-[10px] font-bold text-neutral-400 uppercase tracking-wider flex items-center justify-center">
                        All Day
                      </div>
                      <div className="flex-1 p-1.5 sm:p-2 flex flex-wrap gap-1.5 sm:gap-2">
                        {dayAllDay.map(evt => {
                          const theme = getEventCardTheme(evt);
                          return (
                            <div
                              key={evt.id}
                              onClick={() => onSelectEvent(evt)}
                              className={`px-2.5 py-1 sm:px-3 sm:py-1.5 rounded-lg sm:rounded-xl border text-[11px] sm:text-xs font-semibold cursor-pointer transition-all hover:scale-[1.02] shadow-2xs ${theme.card} ${
                                evt.status === 'completed' ? 'line-through opacity-50' : ''
                              }`}
                              title={evt.title}
                            >
                              {evt.title}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                })()}

                {/* Day Timetable Body */}
                <div className="relative flex w-full" style={{ height: `${24 * HOUR_HEIGHT}px` }}>
                  
                  {/* Left Time Axis Labels */}
                  <div className="w-12 sm:w-16 shrink-0 border-r border-neutral-200/60 dark:border-neutral-800/60 relative bg-white/40 dark:bg-[#161619]/40 select-none">
                    {HOURS.map(hour => (
                      <div
                        key={hour}
                        className="absolute right-1.5 sm:right-2 -translate-y-1/2 text-[9px] sm:text-[10px] font-semibold text-neutral-400 dark:text-neutral-500 whitespace-nowrap"
                        style={{ top: `${hour * HOUR_HEIGHT}px` }}
                      >
                        {formatHourDisplay(hour)}
                      </div>
                    ))}
                  </div>

                  {/* Single Column for Day View */}
                  <div className="flex-1 relative h-full min-w-0">
                    
                    {/* Background Horizontal Hour Guidelines */}
                    <div className="absolute inset-0 pointer-events-none">
                      {HOURS.map(hour => (
                        <div
                          key={hour}
                          className="absolute inset-x-0 border-t border-neutral-200/50 dark:border-neutral-800/50"
                          style={{ top: `${hour * HOUR_HEIGHT}px` }}
                        />
                      ))}
                    </div>

                    {/* Current time horizontal indicator line */}
                    {isToday(currentDate) && (
                      <div
                        className="absolute inset-x-0 z-10 pointer-events-none flex items-center"
                        style={{ top: `${currentTimeTop}px` }}
                      >
                        <div className="w-2 sm:w-2.5 h-2 sm:h-2.5 -ml-1 rounded-full bg-rose-500 shadow-xs" />
                        <div className="flex-1 h-[2px] bg-rose-500" />
                      </div>
                    )}

                    {/* Interactive Hour Slot Click Targets */}
                    {HOURS.map(hour => (
                      <div
                        key={hour}
                        onClick={() => {
                          const newDate = new Date(currentDate);
                          newDate.setHours(hour, 0, 0, 0);
                          onAddEventForDate(newDate);
                        }}
                        className="absolute inset-x-0 cursor-pointer hover:bg-blue-500/5 transition-colors"
                        style={{
                          top: `${hour * HOUR_HEIGHT}px`,
                          height: `${HOUR_HEIGHT}px`,
                        }}
                        title={`Click to add event at ${formatHourSlotTitle(hour)}`}
                      />
                    ))}

                    {/* Time-Occupying Event Cards */}
                    {calculateTimedLayout(selectedDayEvents, currentDate).map((pos) => {
                      const { event: evt, top, height, leftPercent, widthPercent, startTimeLabel, endTimeLabel } = pos;
                      const theme = getEventCardTheme(evt);

                      return (
                        <div
                          key={evt.id}
                          onClick={(e) => {
                            e.stopPropagation();
                            onSelectEvent(evt);
                          }}
                          style={{
                            top: `${top}px`,
                            height: `${height}px`,
                            left: `${leftPercent}%`,
                            width: `${widthPercent}%`,
                          }}
                          className={`absolute z-10 p-2 sm:p-2.5 rounded-[12px] sm:rounded-[14px] border shadow-2xs hover:shadow-md hover:z-20 transition-all cursor-pointer flex flex-col justify-between overflow-hidden group ${
                            theme.card
                          } ${evt.status === 'completed' ? 'opacity-50' : ''}`}
                          title={`${evt.title}\n${startTimeLabel} - ${endTimeLabel}`}
                        >
                          {/* Top: Event Title & Meta */}
                          <div className="min-w-0">
                            <div className="flex items-start justify-between gap-1">
                              <h4 className={`text-[11px] sm:text-xs font-bold leading-tight line-clamp-2 ${theme.title}`}>
                                {evt.title}
                              </h4>
                              {evt.meetingUrl && (
                                <a
                                  href={evt.meetingUrl}
                                  target="_blank"
                                  rel="noreferrer"
                                  onClick={(e) => e.stopPropagation()}
                                  className="text-blue-600 dark:text-blue-400 p-0.5 hover:underline shrink-0"
                                  title="Join meeting"
                                >
                                  <Video className="w-3.5 h-3.5" />
                                </a>
                              )}
                            </div>
                            {evt.description && (
                              <p className="text-[10px] sm:text-[11px] opacity-80 line-clamp-2 mt-0.5 font-normal leading-relaxed">
                                {evt.description}
                              </p>
                            )}
                            {evt.location && (
                              <p className="text-[9px] sm:text-[10px] opacity-75 truncate mt-0.5 sm:mt-1 flex items-center gap-1 font-medium">
                                <MapPin className="w-2.5 h-2.5 shrink-0" />
                                <span>{evt.location}</span>
                              </p>
                            )}
                          </div>

                          {/* Bottom: Start & End Time Pills */}
                          <div className="flex items-center gap-1 sm:gap-1.5 mt-0.5 sm:mt-1 pt-0.5 sm:pt-1 flex-wrap">
                            <span className={`text-[9px] sm:text-[10px] font-bold px-1.5 sm:px-2 py-0.2 sm:py-0.5 rounded-[5px] sm:rounded-[6px] ${theme.pill} font-mono tracking-tight`}>
                              {startTimeLabel}
                            </span>
                            <span className={`text-[9px] sm:text-[10px] font-bold px-1.5 sm:px-2 py-0.2 sm:py-0.5 rounded-[5px] sm:rounded-[6px] ${theme.pill} font-mono tracking-tight`}>
                              {endTimeLabel}
                            </span>
                          </div>
                        </div>
                      );
                    })}

                  </div>
                </div>

              </div>
            </div>
          </div>
        )}

      </div>
    </>
  );
};
