import React, { useState } from 'react';
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
  eachDayOfInterval
} from 'date-fns';

interface CalendarViewProps {
  events: ScheduleEvent[];
  isAdmin: boolean;
  onSelectEvent: (event: ScheduleEvent) => void;
  onAddEventForDate: (date: Date) => void;
  onDeleteEvent?: (id: string) => void;
  onStatusChange?: (event: ScheduleEvent, status: any) => void;
}

export const CalendarView: React.FC<CalendarViewProps> = ({
  events,
  isAdmin,
  onSelectEvent,
  onAddEventForDate,
  onDeleteEvent,
}) => {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [viewMode, setViewMode] = useState<'month' | 'week' | 'day'>('month');
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [eventToDelete, setEventToDelete] = useState<ScheduleEvent | null>(null);

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

  // Helper to get events on a specific day
  const getEventsForDay = (date: Date) => {
    return events.filter(e => isSameDay(parseISO(e.startTime), date));
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

  // Notion-style pastel chip tags
  const getPriorityChipStyle = (priority: string) => {
    switch (priority) {
      case 'urgent': return 'bg-[#fdebec] text-[#c4554d] dark:bg-[#3c1e1e] dark:text-[#e06c75]';
      case 'high': return 'bg-[#fbf3db] text-[#89632a] dark:bg-[#392e1e] dark:text-[#dfab01]';
      case 'medium': return 'bg-[#e7f3f8] text-[#245e82] dark:bg-[#182937] dark:text-[#78b3dc]';
      default: return 'bg-[#f1f1ef] text-[#787774] dark:bg-[#2e2e2e] dark:text-[#9b9a97]';
    }
  };

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
          <div className="flex items-center rounded-xl border border-neutral-200/80 dark:border-neutral-800 bg-neutral-100/60 dark:bg-neutral-900/60 p-0.5 text-xs overflow-hidden shadow-2xs">
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
            {format(currentDate, viewMode === 'day' ? 'MMMM d, yyyy' : 'MMMM yyyy')}
          </h2>
        </div>

        {/* View Mode Switcher */}
        <div className="flex items-center gap-2 w-full sm:w-auto justify-between sm:justify-end text-xs">
          <div className="flex items-center rounded-xl border border-neutral-200/80 dark:border-neutral-800 bg-neutral-100/60 dark:bg-neutral-900/60 p-0.5 shadow-2xs">
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

      {/* Main Grid Views */}
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
                      
                      {/* Notion action triggers */}
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

      {/* Week Grid View */}
      {viewMode === 'week' && (
        <div className="bg-white/85 dark:bg-[#161619]/85 backdrop-blur-md rounded-2xl border border-neutral-200/80 dark:border-neutral-800/80 p-3.5 shadow-xs overflow-x-auto">
          <div className="min-w-[700px] grid grid-cols-7 gap-2">
            {weekDays.map((day, idx) => {
              const dayEvents = getEventsForDay(day);
              const isCurrentDay = isToday(day);
              return (
                <div
                  key={idx}
                  className={`p-2.5 rounded-xl border flex flex-col min-h-[360px] transition-all ${
                    isCurrentDay
                      ? 'border-[#2383e2] bg-[#e7f3f8]/30 dark:bg-[#182937]/30 ring-1 ring-[#2383e2]/40 shadow-xs'
                      : 'border-neutral-200/60 dark:border-neutral-800/60 bg-white/60 dark:bg-[#1f1f23]'
                  }`}
                >
                  <div className="text-center pb-1.5 border-b border-neutral-100 dark:border-neutral-800 mb-2">
                    <p className="text-[10px] font-medium text-neutral-400 uppercase">
                      {format(day, 'EEE')}
                    </p>
                    <p className={`text-xs font-semibold mt-0.5 inline-block w-5 h-5 leading-5 rounded ${
                      isCurrentDay ? 'bg-[#eb5757] text-white' : 'text-neutral-700 dark:text-neutral-300'
                    }`}>
                      {format(day, 'd')}
                    </p>
                  </div>

                  <div className="flex-1 space-y-1.5 overflow-y-auto">
                    {dayEvents.map(evt => (
                      <div
                        key={evt.id}
                        onClick={() => onSelectEvent(evt)}
                        className={`p-2 rounded border border-[#e9e9e7] dark:border-[#2e2e2e] bg-white dark:bg-[#252525] hover:bg-neutral-50 dark:hover:bg-neutral-800 cursor-pointer transition-colors text-xs group ${
                          evt.status === 'completed' ? 'opacity-50' : ''
                        }`}
                      >
                        <div className="flex items-center justify-between gap-1 mb-1">
                          <span className={`text-[9px] font-medium px-1 rounded ${getPriorityChipStyle(evt.priority)}`}>
                            {evt.priority}
                          </span>
                          <span className="text-[10px] text-neutral-400">
                            {evt.isAllDay ? 'All Day' : format(parseISO(evt.startTime), 'h:mm a')}
                          </span>
                        </div>
                        <p className={`font-medium text-xs text-[#37352f] dark:text-[#e6e6e6] truncate ${evt.status === 'completed' ? 'line-through text-neutral-400' : ''}`}>
                          {evt.title}
                        </p>
                      </div>
                    ))}
                  </div>

                  {isAdmin && (
                    <button
                      onClick={() => onAddEventForDate(day)}
                      className="mt-2 w-full py-0.5 text-center text-[11px] text-neutral-400 hover:text-neutral-800 dark:hover:text-neutral-200 rounded border border-dashed border-neutral-200 dark:border-neutral-700 transition-colors"
                    >
                      + Add
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Day Timeline View */}
      {viewMode === 'day' && (
        <div className="bg-white dark:bg-[#202020] rounded-lg border border-[#e9e9e7] dark:border-[#2e2e2e] p-5 shadow-xs">
          <div className="flex items-center justify-between mb-4 pb-3 border-b border-neutral-100 dark:border-neutral-800">
            <div>
              <h3 className="text-base font-semibold text-[#37352f] dark:text-white">
                {format(currentDate, 'EEEE, MMMM d, yyyy')}
              </h3>
              <p className="text-xs text-neutral-400 mt-0.5">
                {selectedDayEvents.length} events scheduled
              </p>
            </div>
            {isAdmin && (
              <button
                onClick={() => onAddEventForDate(currentDate)}
                className="flex items-center gap-1 px-2.5 py-1 text-xs font-medium text-white bg-[#2383e2] hover:bg-[#1a73e8] rounded shadow-xs transition-all"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>New Event</span>
              </button>
            )}
          </div>

          <div className="space-y-2">
            {selectedDayEvents.length === 0 ? (
              <div className="text-center py-12 text-neutral-400 text-xs">
                <CalendarIcon className="w-8 h-8 mx-auto mb-2 opacity-30" />
                No events scheduled for this day.
              </div>
            ) : (
              selectedDayEvents.map(evt => (
                <div
                  key={evt.id}
                  className="p-3 rounded border border-[#e9e9e7] dark:border-[#2e2e2e] bg-white dark:bg-[#252525] hover:bg-neutral-50 dark:hover:bg-neutral-800/50 transition-colors flex flex-col sm:flex-row sm:items-center justify-between gap-3 group"
                >
                  <div className="flex items-start gap-2.5 flex-1 min-w-0">
                    <div className="p-1.5 rounded bg-neutral-100 dark:bg-neutral-800 text-neutral-500 shrink-0 mt-0.5">
                      <Clock className="w-3.5 h-3.5" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-0.5">
                        <span className={`text-[10px] font-medium px-1.5 py-0.2 rounded ${getPriorityChipStyle(evt.priority)}`}>
                          {evt.priority}
                        </span>
                        <span className="text-xs text-neutral-400 font-mono">
                          {evt.isAllDay ? 'All Day' : `${format(parseISO(evt.startTime), 'p')} - ${format(parseISO(evt.endTime), 'p')}`}
                        </span>
                      </div>
                      <h4 
                        onClick={() => onSelectEvent(evt)}
                        className="text-sm font-medium text-[#37352f] dark:text-white cursor-pointer hover:underline truncate"
                      >
                        {evt.title}
                      </h4>
                      {evt.description && (
                        <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-0.5 line-clamp-1">
                          {evt.description}
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    {evt.meetingUrl && (
                      <a
                        href={evt.meetingUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="flex items-center gap-1 px-2 py-1 rounded text-xs text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-950/30"
                      >
                        <Video className="w-3 h-3" />
                        <span>Join</span>
                      </a>
                    )}
                    {isAdmin && (
                      <div className="flex items-center gap-0.5">
                        <button
                          onClick={() => onSelectEvent(evt)}
                          className="p-1 text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200 rounded"
                          title="Edit"
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                        </button>
                        {onDeleteEvent && (
                          <button
                            onClick={() => setEventToDelete(evt)}
                            className="p-1 text-neutral-400 hover:text-rose-600 rounded"
                            title="Delete event"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
    </>
  );
};
