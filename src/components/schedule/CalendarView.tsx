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
} from '../common/MovingIcon';
import { ConfirmModal } from '../common/ConfirmModal';
import { FormattedNoteContent } from '../tasks/FormattedNoteContent';
import { getEventAutoDeleteInfo } from '../../utils/autoDeleteUtils';
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
  getMinutes,
  differenceInCalendarDays
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

const parseEventDate = (dateStr?: string): Date | null => {
  if (!dateStr) return null;
  try {
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

const isMultiDayEvent = (event: ScheduleEvent): boolean => {
  if (!event.startTime || !event.endTime) return false;
  const s = parseEventDate(event.startTime);
  const e = parseEventDate(event.endTime);
  if (!s || !e) return false;
  return !isSameDay(s, e) && isAfter(e, s);
};

interface MultiDaySegment {
  event: ScheduleEvent;
  startIndex: number; // 0 to 6
  span: number;       // 1 to 7
  isStart: boolean;   // starts this week
  isEnd: boolean;     // ends this week
  eventStart: Date;
  eventEnd: Date;
}

interface PositionedMultiDaySegment extends MultiDaySegment {
  row: number;
}

const getMultiDaySegmentsForWeek = (weekDays: Date[], allEvents: ScheduleEvent[]): MultiDaySegment[] => {
  if (weekDays.length !== 7) return [];
  const wStart = startOfDay(weekDays[0]);
  const wEnd = endOfDay(weekDays[6]);

  const segments: MultiDaySegment[] = [];

  for (const evt of allEvents) {
    if (!evt.startTime) continue;
    const s = parseEventDate(evt.startTime);
    if (!s) continue;
    const e = parseEventDate(evt.endTime) || s;

    // Must span across multiple calendar days
    if (isSameDay(s, e) || isBefore(e, s)) continue;

    // Check intersection with this week
    if (isAfter(s, wEnd) || isBefore(e, wStart)) continue;

    const isStart = !isBefore(s, wStart);
    const isEnd = !isAfter(e, wEnd);

    const startIndex = isStart ? Math.max(0, Math.min(6, differenceInCalendarDays(s, wStart))) : 0;
    const endIndex = isEnd ? Math.max(0, Math.min(6, differenceInCalendarDays(e, wStart))) : 6;
    const span = Math.max(1, endIndex - startIndex + 1);

    segments.push({
      event: evt,
      startIndex,
      span,
      isStart,
      isEnd,
      eventStart: s,
      eventEnd: e,
    });
  }

  // Sort by startIndex, then longest span first, then title
  segments.sort((a, b) => {
    if (a.startIndex !== b.startIndex) return a.startIndex - b.startIndex;
    if (b.span !== a.span) return b.span - a.span;
    return a.event.title.localeCompare(b.event.title);
  });

  return segments;
};

const layoutMultiDaySegments = (segments: MultiDaySegment[]): PositionedMultiDaySegment[] => {
  const rowEnds: number[] = [];
  const positioned: PositionedMultiDaySegment[] = [];

  for (const seg of segments) {
    let placedRow = -1;
    for (let r = 0; r < rowEnds.length; r++) {
      if (rowEnds[r] < seg.startIndex) {
        placedRow = r;
        rowEnds[r] = seg.startIndex + seg.span - 1;
        break;
      }
    }
    if (placedRow === -1) {
      rowEnds.push(seg.startIndex + seg.span - 1);
      placedRow = rowEnds.length - 1;
    }

    positioned.push({
      ...seg,
      row: placedRow,
    });
  }

  return positioned;
};

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

  // Week grid generation
  const weekStart = startOfWeek(currentDate);
  const weekDays = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));

  // Auto-scroll time grid vertically to daytime and horizontally to center today on mobile
  useEffect(() => {
    if (viewMode === 'week' || viewMode === 'day') {
      const timer = setTimeout(() => {
        if (timeGridScrollRef.current) {
          const container = timeGridScrollRef.current;
          const now = new Date();
          
          // Vertical auto-scroll to daytime (~7:30 AM or current hour)
          const targetHour = Math.max(6, Math.min(now.getHours() - 1, 18));
          container.scrollTop = targetHour * HOUR_HEIGHT;

          // Horizontal auto-scroll to center present day in week view on mobile
          if (viewMode === 'week') {
            const todayIdx = weekDays.findIndex(day => isToday(day));
            if (todayIdx !== -1) {
              const scrollWidth = container.scrollWidth;
              const clientWidth = container.clientWidth;
              if (scrollWidth > clientWidth) {
                const timeAxisWidth = window.innerWidth < 640 ? 48 : 64;
                const daysWidth = scrollWidth - timeAxisWidth;
                const colWidth = daysWidth / 7;
                const todayCenter = timeAxisWidth + (todayIdx * colWidth) + (colWidth / 2);
                const targetScrollLeft = Math.max(0, todayCenter - (clientWidth / 2));
                container.scrollTo({ left: targetScrollLeft, behavior: 'smooth' });
              }
            }
          }
        }
      }, 60);
      return () => clearTimeout(timer);
    }
  }, [viewMode, currentDate, weekDays]);

  // Navigation handlers
  const handlePrev = () => {
    if (viewMode === 'month') {
      const d = subMonths(currentDate, 1);
      setCurrentDate(d);
      setSelectedDate(d);
    } else if (viewMode === 'week') {
      const d = subWeeks(currentDate, 1);
      setCurrentDate(d);
      setSelectedDate(d);
    } else {
      const d = subDays(currentDate, 1);
      setCurrentDate(d);
      setSelectedDate(d);
    }
  };

  const handleNext = () => {
    if (viewMode === 'month') {
      const d = addMonths(currentDate, 1);
      setCurrentDate(d);
      setSelectedDate(d);
    } else if (viewMode === 'week') {
      const d = addWeeks(currentDate, 1);
      setCurrentDate(d);
      setSelectedDate(d);
    } else {
      const d = addDays(currentDate, 1);
      setCurrentDate(d);
      setSelectedDate(d);
    }
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
        const s = parseEventDate(e.startTime);
        if (!s) return false;
        const end = e.endTime ? parseEventDate(e.endTime) || s : s;
        return !isAfter(s, dayEnd) && !isBefore(end, dayStart);
      } catch {
        return false;
      }
    });
  };

  const getSingleDayEventsForDay = (date: Date) => {
    return getEventsForDay(date).filter(e => !isMultiDayEvent(e));
  };

  const selectedDayEvents = getEventsForDay(selectedDate);

  // Month grid generation
  const monthStart = startOfMonth(currentDate);
  const monthEnd = endOfMonth(monthStart);
  const startDate = startOfWeek(monthStart);
  const endDate = endOfWeek(monthEnd);
  const monthDays = eachDayOfInterval({ start: startDate, end: endDate });

  const weeks = React.useMemo(() => {
    const result: Date[][] = [];
    for (let i = 0; i < monthDays.length; i += 7) {
      result.push(monthDays.slice(i, i + 7));
    }
    return result;
  }, [monthDays]);

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
    const timed = dayEvents.filter(e => !e.isAllDay && !isMultiDayEvent(e));
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
        <div className="ios-card flex flex-col sm:flex-row items-center justify-between gap-2.5 p-2 sm:p-2.5 rounded-2xl">
          <div className="flex items-center gap-3 w-full sm:w-auto justify-between sm:justify-start">
            <div className="ios-segmented-control">
              <button
                onClick={handlePrev}
                className="ios-segmented-item p-1"
                title="Previous"
              >
                <ChevronLeft className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={handleToday}
                className="ios-segmented-item px-2.5 font-semibold"
              >
                Today
              </button>
              <button
                onClick={handleNext}
                className="ios-segmented-item p-1"
                title="Next"
              >
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>

            <h2 className="text-xs sm:text-sm font-bold text-neutral-900 dark:text-white tracking-tight">
              {format(currentDate, viewMode === 'day' ? 'EEEE, MMMM d, yyyy' : 'MMMM yyyy')}
            </h2>
          </div>

          {/* View Mode Switcher */}
          <div className="flex items-center gap-2 w-full sm:w-auto justify-between sm:justify-end text-xs">
            <div className="ios-segmented-control">
              {(['month', 'week', 'day'] as const).map(mode => (
                <button
                  key={mode}
                  onClick={() => setViewMode(mode)}
                  className={`ios-segmented-item capitalize ${
                    viewMode === mode ? 'ios-segmented-item-active' : ''
                  }`}
                >
                  {mode}
                </button>
              ))}
            </div>

            {isAdmin && (
              <button
                onClick={() => onAddEventForDate(selectedDate)}
                className="h-9 px-3.5 text-xs font-semibold text-white bg-[#007aff] hover:bg-[#0071e3] dark:bg-[#0a84ff] rounded-xl shadow-xs active:scale-[0.98] cursor-pointer flex items-center gap-1.5 box-border"
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
            <div className="ios-card lg:col-span-3 p-3.5 rounded-2xl overflow-hidden">
              {/* Weekday headers with vertical dividers */}
              <div className="grid grid-cols-7 divide-x divide-neutral-200/80 dark:divide-neutral-800 text-center mb-2 pb-2 border-b border-neutral-200/80 dark:border-neutral-800">
                {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
                  <div key={day} className="text-[11px] font-bold uppercase tracking-wider text-neutral-400 py-0.5">
                    <span className="hidden sm:inline">{day}</span>
                    <span className="sm:hidden">{day[0]}</span>
                  </div>
                ))}
              </div>

              {/* Weeks Rows with Multi-Day Event Boxing and Continuous Vertical Dividers */}
              <div className="rounded-xl border border-neutral-200/80 dark:border-neutral-800 overflow-hidden divide-y divide-neutral-200/80 dark:divide-neutral-800 bg-black/[0.005] dark:bg-white/[0.01]">
                {weeks.map((week, wIdx) => {
                  const weekSegments = layoutMultiDaySegments(getMultiDaySegmentsForWeek(week, events));
                  const multiDayRowCount = weekSegments.length > 0 ? Math.max(...weekSegments.map(s => s.row)) + 1 : 0;
                  const multiDayRows = Array.from({ length: multiDayRowCount }, (_, r) =>
                    weekSegments.filter(s => s.row === r)
                  );

                  return (
                    <div
                      key={wIdx}
                      className="relative"
                    >
                      {/* Continuous vertical grid divider lines between all 7 date columns */}
                      <div className="absolute inset-0 grid grid-cols-7 pointer-events-none divide-x divide-neutral-200/80 dark:divide-neutral-800">
                        <div />
                        <div />
                        <div />
                        <div />
                        <div />
                        <div />
                        <div />
                      </div>

                      {/* Content sitting above vertical grid lines */}
                      <div className="relative z-10 p-1 sm:p-1.5 space-y-1">
                        {/* Day Header Row with Numbers */}
                        <div className="grid grid-cols-7 gap-1 sm:gap-1.5">
                          {week.map((day, dIdx) => {
                            const isCurrentMonth = isSameMonth(day, monthStart);
                            const isCurrentDay = isToday(day);
                            const isSelected = isSameDay(day, selectedDate);
                            const dayEvents = getEventsForDay(day);

                            return (
                              <div
                                key={dIdx}
                                onClick={() => setSelectedDate(day)}
                                onDoubleClick={() => onAddEventForDate(day)}
                                className={`py-0.5 px-1 sm:px-1.5 rounded-lg flex items-center justify-between cursor-pointer transition-colors ${
                                  isSelected
                                    ? 'bg-[#007aff]/15 text-[#007aff] font-bold'
                                    : isCurrentDay
                                    ? 'bg-[#ff3b30]/15'
                                    : isCurrentMonth
                                    ? 'hover:bg-black/5 dark:hover:bg-white/5'
                                    : 'opacity-30 hover:opacity-60'
                                }`}
                                title={format(day, 'PPPP')}
                              >
                                <span
                                  className={`text-[11px] sm:text-xs font-bold w-4 h-4 sm:w-5 sm:h-5 flex items-center justify-center rounded-full ${
                                    isCurrentDay
                                      ? 'bg-[#ff3b30] text-white shadow-xs'
                                      : isSelected
                                      ? 'text-[#007aff]'
                                      : 'text-neutral-700 dark:text-neutral-300'
                                  }`}
                                >
                                  {format(day, 'd')}
                                </span>

                                {dayEvents.length > 0 && (
                                  <span className="text-[8px] sm:text-[9px] font-mono px-1 rounded-full bg-black/5 dark:bg-white/10 text-neutral-500 hidden xs:inline">
                                    {dayEvents.length}
                                  </span>
                                )}
                              </div>
                            );
                          })}
                        </div>

                        {/* Multi-Day Spanning Event Boxes */}
                        {multiDayRows.map((rowSegments, rIdx) => (
                          <div key={rIdx} className="grid grid-cols-7 gap-x-1 sm:gap-x-1.5">
                            {rowSegments.map((seg, sIdx) => {
                              const theme = getEventCardTheme(seg.event);
                              return (
                                <div
                                  key={seg.event.id + '-' + sIdx}
                                  style={{ gridColumn: `${seg.startIndex + 1} / span ${seg.span}` }}
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    onSelectEvent(seg.event);
                                  }}
                                  className={`h-5 sm:h-6 px-1.5 sm:px-2 rounded-lg border text-[10px] sm:text-[11px] font-semibold flex items-center justify-between gap-1 shadow-2xs truncate cursor-pointer transition-all hover:scale-[1.01] active:scale-[0.99] ${
                                    seg.isStart ? 'rounded-l-lg' : 'rounded-l-none border-l-0 pl-1'
                                  } ${
                                    seg.isEnd ? 'rounded-r-lg' : 'rounded-r-none border-r-0 pr-1'
                                  } ${theme.card} ${seg.event.status === 'completed' ? 'line-through opacity-50' : ''}`}
                                  title={`${seg.event.title} (${format(seg.eventStart, 'MMM d')} → ${format(seg.eventEnd, 'MMM d')})`}
                                >
                                  <div className="flex items-center gap-1 min-w-0 truncate">
                                    {!seg.isStart && <span className="text-[9px] font-bold opacity-70">‹</span>}
                                    <span className="truncate font-bold">{seg.event.title}</span>
                                    {seg.isStart && (
                                      <span className="text-[9px] opacity-75 font-mono hidden md:inline">
                                        ({format(seg.eventStart, 'M/d')} → {format(seg.eventEnd, 'M/d')})
                                      </span>
                                    )}
                                  </div>
                                  {!seg.isEnd && <span className="text-[9px] font-bold opacity-70">›</span>}
                                </div>
                              );
                            })}
                          </div>
                        ))}

                        {/* Single-Day Events Row */}
                        <div className="grid grid-cols-7 gap-1 sm:gap-1.5 min-h-[36px] sm:min-h-[46px]">
                          {week.map((day, dIdx) => {
                            const singleEvents = getSingleDayEventsForDay(day);
                            const isCurrentMonth = isSameMonth(day, monthStart);
                            const isSelected = isSameDay(day, selectedDate);
                            return (
                              <div
                                key={dIdx}
                                onClick={() => setSelectedDate(day)}
                                onDoubleClick={() => onAddEventForDate(day)}
                                className={`p-0.5 sm:p-1 rounded-lg flex flex-col justify-start space-y-0.5 transition-colors cursor-pointer ${
                                  isSelected
                                    ? 'bg-[#007aff]/5 dark:bg-[#007aff]/10 ring-1 ring-[#007aff]/20'
                                    : 'hover:bg-black/[0.02] dark:hover:bg-white/[0.04]'
                                } ${!isCurrentMonth ? 'opacity-30' : ''}`}
                              >
                                {/* Mobile dots for singles */}
                                <div className="flex sm:hidden items-center justify-center gap-0.5 overflow-hidden">
                                  {singleEvents.slice(0, 3).map((evt, eIdx) => (
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

                                {/* Desktop single event pills */}
                                <div className="hidden sm:block space-y-0.5 overflow-hidden">
                                  {singleEvents.slice(0, 2).map(evt => (
                                    <div
                                      key={evt.id}
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        onSelectEvent(evt);
                                      }}
                                      className={`text-[10px] font-medium px-1.5 py-0.5 rounded truncate cursor-pointer ${getPriorityChipStyle(evt.priority)} ${
                                        evt.status === 'completed' ? 'line-through opacity-50' : ''
                                      }`}
                                      title={`${evt.title} (${evt.isAllDay ? 'All Day' : evt.startTime ? format(parseISO(evt.startTime), 'p') : ''})`}
                                    >
                                      {evt.title}
                                    </div>
                                  ))}
                                  {singleEvents.length > 2 && (
                                    <div className="text-[9px] text-neutral-400 font-medium px-1">
                                      +{singleEvents.length - 2} more
                                    </div>
                                  )}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Selected Date Detail Sidebar */}
            <div className="ios-card lg:col-span-1 p-4 rounded-2xl space-y-3.5 flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between border-b border-black/[0.06] dark:border-white/[0.08] pb-2.5">
                  <div>
                    <h3 className="font-bold text-sm text-neutral-900 dark:text-white">
                      {format(selectedDate, 'EEEE')}
                    </h3>
                    <p className="text-[11px] text-neutral-400 font-medium">
                      {format(selectedDate, 'MMMM d, yyyy')}
                    </p>
                  </div>
                  {isAdmin && (
                    <button
                      onClick={() => onAddEventForDate(selectedDate)}
                      className="p-1.5 text-neutral-400 hover:text-neutral-900 dark:hover:text-white hover:bg-black/5 dark:hover:bg-white/10 rounded-full transition-all active:scale-90 cursor-pointer"
                      title="Add event for this day"
                    >
                      <Plus className="w-4 h-4 stroke-[2.5]" />
                    </button>
                  )}
                </div>

                {/* List of events on this day */}
                <div className="mt-3 space-y-2 max-h-[460px] overflow-y-auto pr-0.5 text-xs">
                  {selectedDayEvents.length === 0 ? (
                    <div className="text-center py-10 text-neutral-400 text-xs">
                      <CalendarIcon className="w-6 h-6 mx-auto mb-1.5 opacity-30" />
                      No events on this day.
                    </div>
                  ) : (
                    selectedDayEvents.map(evt => (
                      <div
                        key={evt.id}
                        className="p-3 rounded-[14px] border border-black/[0.06] dark:border-white/[0.08] bg-black/[0.02] dark:bg-white/[0.03] hover:border-[#007aff]/30 transition-all group"
                      >
                        <div className="flex items-start justify-between gap-2">
                          <h4
                            onClick={() => onSelectEvent(evt)}
                            className={`text-xs font-semibold cursor-pointer hover:underline text-neutral-900 dark:text-neutral-100 leading-snug flex-1 ${
                              evt.status === 'completed' ? 'line-through text-neutral-400' : ''
                            }`}
                          >
                            {evt.title}
                          </h4>
                          
                          {isAdmin && (
                            <div className="flex items-center gap-1 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity shrink-0">
                              <button
                                onClick={() => onSelectEvent(evt)}
                                className="p-1.5 text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200 rounded-lg hover:bg-black/5 dark:hover:bg-white/10 cursor-pointer"
                                title="Edit"
                              >
                                <Edit3 className="w-3.5 h-3.5" />
                              </button>
                              {onDeleteEvent && (
                                <button
                                  onClick={() => setEventToDelete(evt)}
                                  className="p-1.5 text-neutral-400 hover:text-[#ff3b30] rounded-lg hover:bg-[#ff3b30]/10 cursor-pointer"
                                  title="Delete event"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              )}
                            </div>
                          )}
                        </div>

                        <div className="mt-2 flex items-center gap-2 text-[10px] text-neutral-400 flex-wrap font-medium">
                          <span className={`px-1.5 py-0.5 rounded-md font-semibold ${getPriorityChipStyle(evt.priority)}`}>
                            {evt.priority}
                          </span>
                          {isMultiDayEvent(evt) ? (
                            <span className="flex items-center gap-1 font-semibold text-[#007aff] dark:text-[#0a84ff]">
                              <Clock className="w-3 h-3" />
                              <span>Multi-day</span>
                            </span>
                          ) : (
                            <span className="flex items-center gap-1">
                              <Clock className="w-3 h-3" />
                              {evt.isAllDay ? 'All Day' : evt.startTime ? format(parseISO(evt.startTime), 'h:mm a') : ''}
                            </span>
                          )}
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
          </div>
        )}

        {/* ========================================================================= */}
        {/* 2. WEEK TIMETABLE VIEW (Occupying Exact Event Times)                      */}
        {/* ========================================================================= */}
        {viewMode === 'week' && (
          <div className="ios-card rounded-2xl overflow-hidden">
            
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
                      const dayEvents = getEventsForDay(day);
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
                          title={`Click to add event on this day (${dayEvents.length} event${dayEvents.length === 1 ? '' : 's'})`}
                        >
                          <span className="text-[10px] sm:text-[11px] font-medium text-neutral-500 dark:text-neutral-400 block">
                            {format(day, 'EEE')}
                          </span>
                          <div className="flex items-center justify-center gap-1 mt-0.5">
                            <span
                              className={`inline-flex items-center justify-center w-5 h-5 sm:w-6 sm:h-6 rounded-full text-[11px] sm:text-xs font-bold ${
                                isCurrentDay
                                  ? 'bg-[#2383e2] text-white shadow-xs'
                                  : 'text-neutral-800 dark:text-neutral-200'
                              }`}
                            >
                              {format(day, 'd')}
                            </span>
                            {dayEvents.length > 0 && (
                              <span
                                className="inline-flex items-center justify-center min-w-[16px] sm:min-w-[18px] h-4 sm:h-[18px] px-1 rounded-full text-[9px] sm:text-[10px] font-bold text-white bg-rose-500 shadow-xs"
                                title={`${dayEvents.length} event${dayEvents.length === 1 ? '' : 's'} on this day`}
                              >
                                {dayEvents.length}
                              </span>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Multi-Day & All-Day Spanning Strip */}
                {(() => {
                  const weekMultiDaySegments = layoutMultiDaySegments(getMultiDaySegmentsForWeek(weekDays, events));
                  const allDaySingleEvents = weekDays.map(day => ({
                    day,
                    events: getEventsForDay(day).filter(e => e.isAllDay && !isMultiDayEvent(e)),
                  }));
                  const hasMultiDay = weekMultiDaySegments.length > 0;
                  const hasAllDaySingle = allDaySingleEvents.some(d => d.events.length > 0);

                  if (!hasMultiDay && !hasAllDaySingle) return null;

                  const multiDayRowCount = weekMultiDaySegments.length > 0 ? Math.max(...weekMultiDaySegments.map(s => s.row)) + 1 : 0;
                  const multiDayRows = Array.from({ length: multiDayRowCount }, (_, r) => 
                    weekMultiDaySegments.filter(s => s.row === r)
                  );

                  return (
                    <div className="flex border-b border-neutral-200/80 dark:border-neutral-800 bg-neutral-50/70 dark:bg-neutral-900/50 text-xs">
                      <div className="sticky left-0 z-30 w-12 sm:w-16 shrink-0 border-r border-neutral-200/60 dark:border-neutral-800/60 p-1 sm:p-1.5 text-[9px] sm:text-[10px] font-bold text-neutral-400 uppercase tracking-wider flex flex-col items-center justify-center bg-neutral-100/90 dark:bg-neutral-900/90 backdrop-blur-md shadow-2xs leading-tight text-center">
                        <span>Multi-Day</span>
                        <span className="text-[8px] font-normal opacity-70">/ All-Day</span>
                      </div>

                      <div className="flex-1 p-1 sm:p-1.5 space-y-1 overflow-x-hidden">
                        {/* Multi-Day Spanning Rows */}
                        {multiDayRows.map((rowSegments, rIdx) => (
                          <div key={rIdx} className="grid grid-cols-7 gap-x-1 sm:gap-x-1.5">
                            {rowSegments.map((seg, sIdx) => {
                              const theme = getEventCardTheme(seg.event);
                              return (
                                <div
                                  key={seg.event.id + '-' + sIdx}
                                  style={{ gridColumn: `${seg.startIndex + 1} / span ${seg.span}` }}
                                  onClick={() => onSelectEvent(seg.event)}
                                  className={`h-6 sm:h-7 px-2 rounded-xl border text-[10px] sm:text-[11px] font-semibold flex items-center justify-between gap-1 shadow-2xs truncate cursor-pointer transition-all hover:scale-[1.01] active:scale-[0.99] ${
                                    seg.isStart ? 'rounded-l-xl' : 'rounded-l-none border-l-0 pl-1'
                                  } ${
                                    seg.isEnd ? 'rounded-r-xl' : 'rounded-r-none border-r-0 pr-1'
                                  } ${theme.card} ${seg.event.status === 'completed' ? 'line-through opacity-50' : ''}`}
                                  title={`${seg.event.title} (${format(seg.eventStart, 'MMM d')} → ${format(seg.eventEnd, 'MMM d')})`}
                                >
                                  <div className="flex items-center gap-1.5 min-w-0 truncate">
                                    {!seg.isStart && <span className="text-[10px] font-bold opacity-70">‹</span>}
                                    <span className="truncate font-bold">{seg.event.title}</span>
                                    <span className="text-[9px] opacity-75 font-mono hidden sm:inline">
                                      ({format(seg.eventStart, 'MMM d')} → {format(seg.eventEnd, 'MMM d')})
                                    </span>
                                  </div>
                                  {!seg.isEnd && <span className="text-[10px] font-bold opacity-70">›</span>}
                                </div>
                              );
                            })}
                          </div>
                        ))}

                        {/* Single-Day All-Day Events */}
                        {hasAllDaySingle && (
                          <div className="grid grid-cols-7 gap-x-1 sm:gap-x-1.5 gap-y-1">
                            {allDaySingleEvents.map(({ events: dayEvents }, idx) => (
                              <div key={idx} className="space-y-1" style={{ gridColumn: `${idx + 1} / span 1` }}>
                                {dayEvents.map(evt => {
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
                        )}
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
        {viewMode === 'day' && (() => {
          const dayViewEvents = getEventsForDay(currentDate);
          const dayAllDay = dayViewEvents.filter(e => e.isAllDay || isMultiDayEvent(e));
          const timedEvents = calculateTimedLayout(dayViewEvents, currentDate);

          return (
          <div className="ios-card rounded-2xl overflow-hidden w-full">
            
            {/* Scrollable timetable container */}
            <div
              ref={timeGridScrollRef}
              className="max-h-[70vh] sm:max-h-[640px] overflow-y-auto relative select-none w-full scrollbar-thin"
            >
              <div className="w-full min-w-0">
                
                {/* Sticky Header with Day Title */}
                <div className="sticky top-0 z-20 flex items-center justify-between bg-white/95 dark:bg-[#1c1c1e]/95 backdrop-blur-md border-b border-black/[0.06] dark:border-white/[0.08] p-2.5 sm:p-3 shadow-2xs">
                  <div className="flex items-center gap-2 sm:gap-2.5 min-w-0">
                    <span
                      className={`inline-flex items-center justify-center w-7 h-7 sm:w-8 sm:h-8 rounded-full text-xs sm:text-sm font-bold shrink-0 ${
                        isToday(currentDate)
                          ? 'bg-[#ff3b30] text-white shadow-xs'
                          : 'bg-black/5 dark:bg-white/10 text-neutral-800 dark:text-neutral-200'
                      }`}
                    >
                      {format(currentDate, 'd')}
                    </span>
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5">
                        <h3 className="text-xs sm:text-sm font-bold text-[#1c1917] dark:text-white truncate">
                          {format(currentDate, 'EEEE')}
                        </h3>
                        {dayViewEvents.length > 0 && (
                          <span
                            className="inline-flex items-center justify-center min-w-[18px] h-[18px] px-1.5 rounded-full text-[10px] font-bold text-white bg-rose-500 shadow-xs"
                            title={`${dayViewEvents.length} event${dayViewEvents.length === 1 ? '' : 's'} scheduled`}
                          >
                            {dayViewEvents.length}
                          </span>
                        )}
                      </div>
                      <p className="text-[10px] sm:text-[11px] text-neutral-400 font-medium truncate">
                        {dayViewEvents.length} event{dayViewEvents.length === 1 ? '' : 's'}
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

                {/* All-Day & Multi-Day Events Strip for Day View */}
                {dayAllDay.length > 0 && (
                  <div className="flex border-b border-neutral-200/80 dark:border-neutral-800 bg-neutral-50/60 dark:bg-neutral-900/40 text-xs">
                    <div className="w-12 sm:w-16 shrink-0 border-r border-neutral-200/60 dark:border-neutral-800/60 p-1.5 sm:p-2 text-[9px] sm:text-[10px] font-bold text-neutral-400 uppercase tracking-wider flex items-center justify-center text-center">
                      Multi-Day
                    </div>
                    <div className="flex-1 p-1.5 sm:p-2 flex flex-wrap gap-1.5 sm:gap-2">
                      {dayAllDay.map(evt => {
                        const theme = getEventCardTheme(evt);
                        const isMulti = isMultiDayEvent(evt);
                        const s = parseEventDate(evt.startTime);
                        const e = parseEventDate(evt.endTime);
                        return (
                          <div
                            key={evt.id}
                            onClick={() => onSelectEvent(evt)}
                            className={`px-2.5 py-1 sm:px-3 sm:py-1.5 rounded-lg sm:rounded-xl border text-[11px] sm:text-xs font-semibold cursor-pointer transition-all hover:scale-[1.02] shadow-2xs flex items-center gap-2 ${theme.card} ${
                              evt.status === 'completed' ? 'line-through opacity-50' : ''
                            }`}
                            title={evt.title}
                          >
                            <span className="truncate">{evt.title}</span>
                            {isMulti && s && e && (
                              <span className="text-[10px] opacity-75 font-mono">
                                ({format(s, 'MMM d')} → {format(e, 'MMM d')})
                              </span>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

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
                    {timedEvents.map((pos) => {
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
                              <div className="text-[10px] sm:text-[11px] opacity-80 mt-0.5 font-normal leading-relaxed overflow-hidden">
                                <FormattedNoteContent content={evt.description} isCompact={true} />
                              </div>
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
                            {(() => {
                              const autoInfo = getEventAutoDeleteInfo(evt);
                              if (!autoInfo.isExpiringSoon || !autoInfo.badgeText) return null;
                              return (
                                <span
                                  className={`text-[9px] sm:text-[10px] font-semibold px-1.5 sm:px-2 py-0.2 sm:py-0.5 rounded-[5px] sm:rounded-[6px] border ${autoInfo.badgeClass}`}
                                  title={autoInfo.noticeMessage || undefined}
                                >
                                  {autoInfo.badgeText}
                                </span>
                              );
                            })()}
                          </div>
                        </div>
                      );
                    })}

                  </div>
                </div>

              </div>
            </div>
          </div>
          );
        })()}

      </div>
    </>
  );
};
