import React, { useState, useMemo, useRef } from 'react';
import type { ScheduleEvent, EventStatus } from '../../types/schedule';
import type { Note, NoteColor } from '../../types/note';
import {
  Plus,
  Search,
  Clock,
  Calendar as CalendarIcon,
  CheckCircle2,
  ArrowRight,
  ArrowLeft,
  RotateCcw,
  Pin,
  Trash2,
  Edit3,
  FileText,
  Video,
  MapPin,
  Sparkles,
  GripVertical
} from '../common/MovingIcon';
import { format, parseISO } from 'date-fns';
import { FormattedNoteContent } from './FormattedNoteContent';
import { stripHtml } from './noteFormattingUtils';
import { getEventAutoDeleteInfo } from '../../utils/autoDeleteUtils';
import { CustomSelect } from '../common/CustomSelect';

const TYPE_FILTER_OPTIONS = [
  { value: 'all', label: 'All Types' },
  { value: 'task', label: 'Tasks Only' },
  { value: 'event', label: 'Events Only' },
];

const CATEGORY_FILTER_OPTIONS = [
  { value: 'all', label: 'All Categories' },
  { value: 'work', label: 'Work' },
  { value: 'meeting', label: 'Meeting' },
  { value: 'deadline', label: 'Deadline' },
  { value: 'personal', label: 'Personal' },
  { value: 'education', label: 'Education' },
  { value: 'general', label: 'General' },
];

const PRIORITY_FILTER_OPTIONS = [
  { value: 'all', label: 'All Priorities' },
  { value: 'urgent', label: 'Urgent' },
  { value: 'high', label: 'High' },
  { value: 'medium', label: 'Medium' },
  { value: 'low', label: 'Low' },
];


interface TaskBoardProps {
  events: ScheduleEvent[];
  notes: Note[];
  onSelectEvent: (event: ScheduleEvent) => void;
  onStatusChange: (event: ScheduleEvent, status: EventStatus) => void;
  onAddNewEvent: (initialStatus: EventStatus) => void;
  onSelectNote: (note: Note) => void;
  onAddNewNote: () => void;
  onDeleteNote: (id: string) => void;
  onTogglePinNote: (note: Note) => void;
}

const NOTE_COLOR_STYLES: Record<NoteColor, { bg: string; border: string; text: string; header: string }> = {
  default: {
    bg: 'bg-white dark:bg-[#18181b]',
    border: 'border-neutral-200/90 dark:border-neutral-800/90',
    text: 'text-neutral-700 dark:text-neutral-300',
    header: 'text-[#1c1917] dark:text-white',
  },
  yellow: {
    bg: 'bg-amber-50/90 dark:bg-amber-950/30',
    border: 'border-amber-200/80 dark:border-amber-900/60',
    text: 'text-amber-900/90 dark:text-amber-200/90',
    header: 'text-amber-950 dark:text-amber-100',
  },
  blue: {
    bg: 'bg-sky-50/90 dark:bg-sky-950/30',
    border: 'border-sky-200/80 dark:border-sky-900/60',
    text: 'text-sky-900/90 dark:text-sky-200/90',
    header: 'text-sky-950 dark:text-sky-100',
  },
  green: {
    bg: 'bg-emerald-50/90 dark:bg-emerald-950/30',
    border: 'border-emerald-200/80 dark:border-emerald-900/60',
    text: 'text-emerald-900/90 dark:text-emerald-200/90',
    header: 'text-emerald-950 dark:text-emerald-100',
  },
  purple: {
    bg: 'bg-purple-50/90 dark:bg-purple-950/30',
    border: 'border-purple-200/80 dark:border-purple-900/60',
    text: 'text-purple-900/90 dark:text-purple-200/90',
    header: 'text-purple-950 dark:text-purple-100',
  },
  pink: {
    bg: 'bg-rose-50/90 dark:bg-rose-950/30',
    border: 'border-rose-200/80 dark:border-rose-900/60',
    text: 'text-rose-900/90 dark:text-rose-200/90',
    header: 'text-rose-950 dark:text-rose-100',
  },
};

export const TaskBoard: React.FC<TaskBoardProps> = ({
  events,
  notes,
  onSelectEvent,
  onStatusChange,
  onAddNewEvent,
  onSelectNote,
  onAddNewNote,
  onDeleteNote,
  onTogglePinNote,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState<'all' | 'task' | 'event'>('all');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [priorityFilter, setPriorityFilter] = useState<string>('all');

  // Drag and drop states
  const [draggingEventId, setDraggingEventId] = useState<string | null>(null);
  const [dragOverColumn, setDragOverColumn] = useState<EventStatus | null>(null);
  const isDraggingRef = useRef(false);
  const dragEnterCounters = useRef<Record<string, number>>({
    pending: 0,
    in_progress: 0,
    completed: 0,
  });

  // Touch tracking for mobile/tablet devices
  const touchStartRef = useRef<{ x: number; y: number; eventId: string } | null>(null);
  const isTouchDraggingRef = useRef(false);

  const handleDragStart = (e: React.DragEvent, eventId: string) => {
    e.dataTransfer.setData('text/plain', eventId);
    e.dataTransfer.effectAllowed = 'move';
    isDraggingRef.current = true;
    // Defer state update so browser drag session initializes before React alters DOM
    setTimeout(() => {
      setDraggingEventId(eventId);
    }, 0);
  };

  const handleDragEnd = () => {
    setDraggingEventId(null);
    setDragOverColumn(null);
    dragEnterCounters.current = { pending: 0, in_progress: 0, completed: 0 };
    setTimeout(() => {
      isDraggingRef.current = false;
    }, 100);
  };

  const handleDragEnter = (e: React.DragEvent, status: EventStatus) => {
    e.preventDefault();
    dragEnterCounters.current[status] = (dragEnterCounters.current[status] || 0) + 1;
    setDragOverColumn(status);
  };

  const handleDragOver = (e: React.DragEvent, status: EventStatus) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    if (dragOverColumn !== status) {
      setDragOverColumn(status);
    }
  };

  const handleDragLeave = (e: React.DragEvent, status: EventStatus) => {
    e.preventDefault();
    dragEnterCounters.current[status] = Math.max(0, (dragEnterCounters.current[status] || 0) - 1);
    if (dragEnterCounters.current[status] === 0) {
      setDragOverColumn((prev) => (prev === status ? null : prev));
    }
  };

  const handleDrop = (e: React.DragEvent, status: EventStatus) => {
    e.preventDefault();
    const eventId = e.dataTransfer.getData('text/plain') || draggingEventId;
    setDragOverColumn(null);
    setDraggingEventId(null);
    dragEnterCounters.current = { pending: 0, in_progress: 0, completed: 0 };
    setTimeout(() => {
      isDraggingRef.current = false;
    }, 100);

    if (!eventId) return;
    const targetEvent = events.find(ev => ev.id === eventId);
    if (targetEvent && targetEvent.status !== status) {
      onStatusChange(targetEvent, status);
    }
  };

  // Touch drag handlers
  const handleTouchStart = (e: React.TouchEvent, eventId: string) => {
    const touch = e.touches[0];
    touchStartRef.current = { x: touch.clientX, y: touch.clientY, eventId };
    isTouchDraggingRef.current = false;
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!touchStartRef.current) return;
    const touch = e.touches[0];
    const dx = Math.abs(touch.clientX - touchStartRef.current.x);
    const dy = Math.abs(touch.clientY - touchStartRef.current.y);

    if (dx > 12 || dy > 12) {
      isTouchDraggingRef.current = true;
      isDraggingRef.current = true;
      setDraggingEventId(touchStartRef.current.eventId);

      const elem = document.elementFromPoint(touch.clientX, touch.clientY);
      const col = elem?.closest('[data-column-status]');
      const status = col?.getAttribute('data-column-status') as EventStatus | null;
      if (status && (status === 'pending' || status === 'in_progress' || status === 'completed')) {
        setDragOverColumn(status);
      } else {
        setDragOverColumn(null);
      }
    }
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (isTouchDraggingRef.current && touchStartRef.current) {
      const touch = e.changedTouches[0];
      const elem = document.elementFromPoint(touch.clientX, touch.clientY);
      const col = elem?.closest('[data-column-status]');
      const status = col?.getAttribute('data-column-status') as EventStatus | null;
      const eventId = touchStartRef.current.eventId;

      if (status && (status === 'pending' || status === 'in_progress' || status === 'completed')) {
        const targetEvent = events.find(ev => ev.id === eventId);
        if (targetEvent && targetEvent.status !== status) {
          onStatusChange(targetEvent, status);
        }
      }
    }

    touchStartRef.current = null;
    isTouchDraggingRef.current = false;
    setDraggingEventId(null);
    setDragOverColumn(null);
    setTimeout(() => {
      isDraggingRef.current = false;
    }, 100);
  };

  // Filter events
  const filteredEvents = useMemo(() => {
    return events.filter(e => {
      if (searchQuery) {
        const q = searchQuery.toLowerCase();
        const matchTitle = e.title.toLowerCase().includes(q);
        const matchDesc = e.description?.toLowerCase().includes(q);
        const matchLoc = e.location?.toLowerCase().includes(q);
        if (!matchTitle && !matchDesc && !matchLoc) return false;
      }
      if (typeFilter !== 'all') {
        const itemType = e.itemType || 'event';
        if (itemType !== typeFilter) return false;
      }
      if (categoryFilter !== 'all' && e.category !== categoryFilter) return false;
      if (priorityFilter !== 'all' && e.priority !== priorityFilter) return false;
      return true;
    });
  }, [events, searchQuery, typeFilter, categoryFilter, priorityFilter]);

  // Group events by status
  const upcomingEvents = useMemo(() => {
    return filteredEvents
      .filter(e => e.status === 'pending')
      .sort((a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime());
  }, [filteredEvents]);

  const inProgressEvents = useMemo(() => {
    return filteredEvents
      .filter(e => e.status === 'in_progress')
      .sort((a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime());
  }, [filteredEvents]);

  const doneEvents = useMemo(() => {
    return filteredEvents
      .filter(e => e.status === 'completed')
      .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
  }, [filteredEvents]);

  // Filter and sort notes (pinned first, then recent)
  const filteredNotes = useMemo(() => {
    let result = notes;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      result = result.filter(
        n => n.title.toLowerCase().includes(q) || stripHtml(n.content).toLowerCase().includes(q)
      );
    }
    return [...result].sort((a, b) => {
      if (a.isPinned && !b.isPinned) return -1;
      if (!a.isPinned && b.isPinned) return 1;
      return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
    });
  }, [notes, searchQuery]);

  // Type Styles
  const getItemTypeBadge = (evt: ScheduleEvent) => {
    const isTask = evt.itemType === 'task';
    return (
      <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded-[5px] text-[9px] font-semibold border ${
        isTask 
          ? 'bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/20' 
          : 'bg-blue-500/10 text-[#007aff] dark:text-[#0a84ff] border-blue-500/20'
      }`}>
        {isTask ? 'Task' : 'Event'}
      </span>
    );
  };

  // Priority Styles
  const getPriorityBadge = (priority: string) => {
    switch (priority) {
      case 'urgent':
        return <span className="px-2 py-0.5 rounded-[6px] text-[10px] font-bold bg-rose-100 text-rose-700 dark:bg-rose-950/60 dark:text-rose-300">Urgent</span>;
      case 'high':
        return <span className="px-2 py-0.5 rounded-[6px] text-[10px] font-bold bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300">High</span>;
      case 'medium':
        return <span className="px-2 py-0.5 rounded-[6px] text-[10px] font-medium bg-sky-100 text-sky-800 dark:bg-sky-950/60 dark:text-sky-300">Medium</span>;
      default:
        return <span className="px-2 py-0.5 rounded-[6px] text-[10px] font-medium bg-neutral-100 text-neutral-600 dark:bg-neutral-800 dark:text-neutral-400">Low</span>;
    }
  };

  // Format Event DateTime nicely
  const formatEventDate = (isoString?: string) => {
    if (!isoString) return '';
    try {
      const d = parseISO(isoString);
      if (isNaN(d.getTime())) return '';
      return format(d, 'MMM d, h:mm a');
    } catch {
      return '';
    }
  };

  const formatNoteDate = (isoString?: string) => {
    if (!isoString) return '';
    try {
      const d = parseISO(isoString);
      if (isNaN(d.getTime())) return '';
      return format(d, 'MMM d, h:mm a');
    } catch {
      return '';
    }
  };

  return (
    <div className="space-y-4">
      {/* Top Filter & Search Bar */}
      <div className="ios-card flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5 p-2 sm:p-2.5 rounded-2xl">
        {/* Search */}
        <div className="relative flex-1 min-w-[200px]">
          <Search className="w-4 h-4 text-neutral-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search tasks, events, and notes..."
            className="w-full h-9 sm:h-8 pl-9 pr-3 text-base sm:text-xs bg-black/[0.04] dark:bg-white/[0.06] border border-black/[0.06] dark:border-white/[0.08] rounded-xl focus:outline-none focus:ring-2 focus:ring-[#007aff] text-neutral-900 dark:text-white placeholder:text-neutral-400 transition-all box-border"
          />
        </div>

        {/* Filters */}
        <div className="flex items-center gap-2 flex-wrap">
          <CustomSelect
            value={typeFilter}
            onChange={(val) => setTypeFilter(val as 'all' | 'task' | 'event')}
            options={TYPE_FILTER_OPTIONS}
            size="sm"
          />

          <CustomSelect
            value={categoryFilter}
            onChange={setCategoryFilter}
            options={CATEGORY_FILTER_OPTIONS}
            size="sm"
          />

          <CustomSelect
            value={priorityFilter}
            onChange={setPriorityFilter}
            options={PRIORITY_FILTER_OPTIONS}
            size="sm"
          />


          {(searchQuery || typeFilter !== 'all' || categoryFilter !== 'all' || priorityFilter !== 'all') && (
            <button
              onClick={() => {
                setSearchQuery('');
                setTypeFilter('all');
                setCategoryFilter('all');
                setPriorityFilter('all');
              }}
              className="h-8 min-h-[32px] px-3 text-xs font-semibold text-[#ff3b30] hover:bg-[#ff3b30]/10 rounded-xl transition-colors cursor-pointer flex items-center justify-center box-border"
            >
              Reset
            </button>
          )}
        </div>
      </div>

      {/* 4-COLUMN KANBAN BOARD */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4 items-start">

        {/* ========================================================================= */}
        {/* COLUMN 1: UPCOMING (Calendar Events with 'pending' status)                */}
        {/* ========================================================================= */}
        <div
          data-column-status="pending"
          onDragEnter={(e) => handleDragEnter(e, 'pending')}
          onDragOver={(e) => handleDragOver(e, 'pending')}
          onDragLeave={(e) => handleDragLeave(e, 'pending')}
          onDrop={(e) => handleDrop(e, 'pending')}
          className={`ios-card p-3.5 rounded-2xl flex flex-col gap-3 min-h-[480px] transition-all ${
            dragOverColumn === 'pending'
              ? 'bg-blue-500/10 dark:bg-blue-500/15 border-2 border-dashed border-blue-500 ring-2 ring-blue-500/20'
              : 'bg-white/70 dark:bg-[#1c1c1e]/70 border border-neutral-200/80 dark:border-neutral-800'
          }`}
        >
          {/* Column Header */}
          <div className="flex items-center justify-between px-1">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-blue-500" />
              <h3 className="font-bold text-xs sm:text-sm text-[#1c1917] dark:text-white">
                Upcoming
              </h3>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-neutral-200/80 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300">
                {upcomingEvents.length}
              </span>
            </div>

            <button
              onClick={() => onAddNewEvent('pending')}
              className="p-1 rounded-lg hover:bg-neutral-200/60 dark:hover:bg-neutral-800 text-neutral-500 hover:text-neutral-900 dark:hover:text-white transition-colors"
              title="Add Upcoming Task"
            >
              <Plus className="w-4 h-4" />
            </button>
          </div>

          {/* Column Card List */}
          <div className="flex flex-col gap-2.5 flex-1">
            {/* Drop Placeholder */}
            {dragOverColumn === 'pending' && draggingEventId && events.find(ev => ev.id === draggingEventId)?.status !== 'pending' && (
              <div className="p-3.5 rounded-[14px] border-2 border-dashed border-blue-500/70 bg-blue-500/10 dark:bg-blue-500/15 text-blue-600 dark:text-blue-400 flex items-center justify-center text-xs font-semibold animate-pulse shadow-xs">
                <span>Drop here to move to Upcoming</span>
              </div>
            )}

            {upcomingEvents.length === 0 ? (
              <div className="flex flex-col items-center justify-center p-6 text-center border border-dashed border-neutral-200 dark:border-neutral-800/80 rounded-xl my-auto">
                <CalendarIcon className="w-6 h-6 text-neutral-300 dark:text-neutral-600 mb-1.5" />
                <p className="text-xs font-semibold text-neutral-500 dark:text-neutral-400">No upcoming tasks</p>
                <p className="text-[10px] text-neutral-400 mt-0.5">Events from your calendar will appear here.</p>
                <button
                  onClick={() => onAddNewEvent('pending')}
                  className="mt-3 inline-flex items-center gap-1 text-[11px] font-semibold text-[#2383e2] hover:underline"
                >
                  <Plus className="w-3 h-3" />
                  <span>Create Task</span>
                </button>
              </div>
            ) : (
              upcomingEvents.map((evt) => {
                const isUrgent = evt.priority === 'urgent';
                const isDragging = draggingEventId === evt.id;
                return (
                  <div
                    key={evt.id}
                    draggable
                    onDragStart={(e) => handleDragStart(e, evt.id)}
                    onDragEnd={handleDragEnd}
                    onTouchStart={(e) => handleTouchStart(e, evt.id)}
                    onTouchMove={handleTouchMove}
                    onTouchEnd={handleTouchEnd}
                    onClick={() => {
                      if (isDraggingRef.current) return;
                      onSelectEvent(evt);
                    }}
                    className={`p-3.5 rounded-[14px] bg-white dark:bg-[#18181b] border transition-all cursor-grab active:cursor-grabbing group flex flex-col justify-between gap-2.5 select-none touch-manipulation ${
                      isDragging
                        ? 'opacity-40 scale-[0.98] border-dashed border-blue-400 shadow-md'
                        : isUrgent
                        ? 'border-red-300/80 dark:border-red-900/60 hover:border-red-400'
                        : 'border-neutral-200/80 dark:border-neutral-800 hover:border-blue-500/50'
                    }`}
                  >
                    <div className="space-y-1.5">
                      <div className="flex items-start justify-between gap-1.5">
                        <div className="flex items-start gap-1 min-w-0 flex-1">
                          <GripVertical className="w-3.5 h-3.5 mt-0.5 text-neutral-300 dark:text-neutral-600 opacity-60 sm:opacity-0 sm:group-hover:opacity-100 hover:text-neutral-600 dark:hover:text-neutral-300 shrink-0 transition-opacity pointer-events-none" />
                          <h4 className="font-bold text-xs sm:text-[13px] text-[#1c1917] dark:text-white group-hover:text-[#2383e2] transition-colors line-clamp-2">
                            {evt.title}
                          </h4>
                        </div>
                        <div className="flex items-center gap-1 shrink-0">
                          {getItemTypeBadge(evt)}
                          {getPriorityBadge(evt.priority)}
                        </div>
                      </div>

                      {evt.description && (
                        <div className="text-[11px] text-neutral-500 dark:text-neutral-400 font-normal overflow-hidden">
                          <FormattedNoteContent content={evt.description} isCompact={true} />
                        </div>
                      )}

                      <div className="flex items-center gap-2 pt-1 text-[10px] text-neutral-400 font-medium flex-wrap">
                        <span className="inline-flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          <span>{formatEventDate(evt.startTime)}</span>
                        </span>
                        {evt.location && (
                          <span className="inline-flex items-center gap-0.5 truncate max-w-[120px]">
                            <MapPin className="w-3 h-3 shrink-0" />
                            <span>{evt.location}</span>
                          </span>
                        )}
                        {evt.meetingUrl && (
                          <span className="inline-flex items-center gap-0.5 text-blue-500">
                            <Video className="w-3 h-3 shrink-0" />
                          </span>
                        )}
                        {(() => {
                          const autoInfo = getEventAutoDeleteInfo(evt);
                          if (!autoInfo.isExpiringSoon || !autoInfo.badgeText) return null;
                          return (
                            <span
                              className={`inline-flex items-center gap-1 text-[9px] font-semibold px-1.5 py-0.5 rounded-[5px] border ${autoInfo.badgeClass}`}
                              title={autoInfo.noticeMessage || undefined}
                            >
                              <Clock className="w-2.5 h-2.5 shrink-0" />
                              <span>{autoInfo.badgeText}</span>
                            </span>
                          );
                        })()}
                      </div>
                    </div>

                    {/* Actions Row */}
                    <div className="flex items-center justify-between pt-2 border-t border-neutral-100 dark:border-neutral-800/60" onClick={e => e.stopPropagation()}>
                      <span className="text-[9px] font-bold uppercase tracking-wider text-neutral-400">
                        {evt.category}
                      </span>

                      <button
                        draggable={false}
                        onDragStart={(e) => e.stopPropagation()}
                        onTouchStart={(e) => e.stopPropagation()}
                        onClick={() => onStatusChange(evt, 'in_progress')}
                        className="flex items-center gap-1 px-2.5 py-1 rounded-[6px] text-[10px] font-bold bg-amber-50 text-amber-700 hover:bg-amber-100 dark:bg-amber-950/40 dark:text-amber-300 dark:hover:bg-amber-900/60 transition-all active:scale-95 border border-amber-200/60 dark:border-amber-800/40 cursor-pointer"
                        title="Move to In Progress"
                      >
                        <span>Start</span>
                        <ArrowRight className="w-3 h-3" />
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* Bottom Add Button */}
          <button
            onClick={() => onAddNewEvent('pending')}
            className="w-full flex items-center justify-center gap-1.5 h-8 min-h-[32px] rounded-xl text-xs font-semibold text-neutral-500 hover:text-neutral-900 dark:text-neutral-400 dark:hover:text-white hover:bg-white dark:hover:bg-[#18181b] border border-dashed border-neutral-200 dark:border-neutral-800 transition-all"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Add Task</span>
          </button>
        </div>

        {/* ========================================================================= */}
        {/* COLUMN 2: IN PROGRESS (Primary Active Column - Prominent Weight)          */}
        {/* ========================================================================= */}
        <div
          data-column-status="in_progress"
          onDragEnter={(e) => handleDragEnter(e, 'in_progress')}
          onDragOver={(e) => handleDragOver(e, 'in_progress')}
          onDragLeave={(e) => handleDragLeave(e, 'in_progress')}
          onDrop={(e) => handleDrop(e, 'in_progress')}
          className={`ios-card p-3.5 rounded-2xl flex flex-col gap-3 min-h-[480px] transition-all ${
            dragOverColumn === 'in_progress'
              ? 'bg-amber-500/15 dark:bg-amber-500/20 border-2 border-dashed border-amber-500 ring-2 ring-amber-500/20'
              : 'border border-amber-500/35 dark:border-amber-500/25 bg-amber-500/[0.015] dark:bg-amber-500/[0.02]'
          }`}
        >
          {/* Column Header */}
          <div className="flex items-center justify-between px-1">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-amber-500 animate-pulse" />
              <h3 className="font-bold text-xs sm:text-sm text-amber-900 dark:text-amber-300">
                In Progress
              </h3>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/15 text-amber-800 dark:text-amber-300">
                {inProgressEvents.length}
              </span>
            </div>

            <button
              onClick={() => onAddNewEvent('in_progress')}
              className="p-1 rounded-lg hover:bg-amber-500/10 text-amber-600 dark:text-amber-400 transition-colors"
              title="Add In Progress Task"
            >
              <Plus className="w-4 h-4" />
            </button>
          </div>

          {/* Column Card List */}
          <div className="flex flex-col gap-2.5 flex-1">
            {/* Drop Placeholder */}
            {dragOverColumn === 'in_progress' && draggingEventId && events.find(ev => ev.id === draggingEventId)?.status !== 'in_progress' && (
              <div className="p-3.5 rounded-[14px] border-2 border-dashed border-amber-500/70 bg-amber-500/10 dark:bg-amber-500/15 text-amber-600 dark:text-amber-400 flex items-center justify-center text-xs font-semibold animate-pulse shadow-xs">
                <span>Drop here to move to In Progress</span>
              </div>
            )}

            {inProgressEvents.length === 0 ? (
              <div className="flex flex-col items-center justify-center p-6 text-center border border-dashed border-amber-500/20 rounded-xl my-auto">
                <Sparkles className="w-6 h-6 text-amber-400/50 mb-1.5" />
                <p className="text-xs font-semibold text-neutral-500 dark:text-neutral-400">No tasks in progress</p>
                <p className="text-[10px] text-neutral-400 mt-0.5">Click "Start" on any upcoming task.</p>
              </div>
            ) : (
              inProgressEvents.map((evt) => {
                const isDragging = draggingEventId === evt.id;
                return (
                  <div
                    key={evt.id}
                    draggable
                    onDragStart={(e) => handleDragStart(e, evt.id)}
                    onDragEnd={handleDragEnd}
                    onTouchStart={(e) => handleTouchStart(e, evt.id)}
                    onTouchMove={handleTouchMove}
                    onTouchEnd={handleTouchEnd}
                    onClick={() => {
                      if (isDraggingRef.current) return;
                      onSelectEvent(evt);
                    }}
                    className={`p-3.5 rounded-[14px] bg-white dark:bg-[#18181b] border border-amber-300/80 dark:border-amber-900/60 transition-all cursor-grab active:cursor-grabbing group flex flex-col justify-between gap-2.5 hover:border-amber-400 select-none touch-manipulation ${
                      isDragging ? 'opacity-40 scale-[0.98] border-dashed border-amber-400 shadow-md' : ''
                    }`}
                  >
                    <div className="space-y-1.5">
                      <div className="flex items-start justify-between gap-1.5">
                        <div className="flex items-start gap-1 min-w-0 flex-1">
                          <GripVertical className="w-3.5 h-3.5 mt-0.5 text-amber-400/60 dark:text-amber-600 opacity-60 sm:opacity-0 sm:group-hover:opacity-100 hover:text-amber-600 dark:hover:text-amber-300 shrink-0 transition-opacity pointer-events-none" />
                          <h4 className="font-bold text-xs sm:text-[13px] text-[#1c1917] dark:text-white group-hover:text-amber-600 transition-colors line-clamp-2">
                            {evt.title}
                          </h4>
                        </div>
                        <div className="flex items-center gap-1 shrink-0">
                          {getItemTypeBadge(evt)}
                          {getPriorityBadge(evt.priority)}
                        </div>
                      </div>

                      {evt.description && (
                        <div className="text-[11px] text-neutral-500 dark:text-neutral-400 font-normal overflow-hidden">
                          <FormattedNoteContent content={evt.description} isCompact={true} />
                        </div>
                      )}

                      <div className="flex items-center gap-2 pt-1 text-[10px] text-neutral-400 font-medium flex-wrap">
                        <span className="inline-flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          <span>{formatEventDate(evt.startTime)}</span>
                        </span>
                        {(() => {
                          const autoInfo = getEventAutoDeleteInfo(evt);
                          if (!autoInfo.isExpiringSoon || !autoInfo.badgeText) return null;
                          return (
                            <span
                              className={`inline-flex items-center gap-1 text-[9px] font-semibold px-1.5 py-0.5 rounded-[5px] border ${autoInfo.badgeClass}`}
                              title={autoInfo.noticeMessage || undefined}
                            >
                              <Clock className="w-2.5 h-2.5 shrink-0" />
                              <span>{autoInfo.badgeText}</span>
                            </span>
                          );
                        })()}
                      </div>
                    </div>

                    {/* Actions Row */}
                    <div className="flex items-center justify-between pt-2 border-t border-neutral-100 dark:border-neutral-800/60" onClick={e => e.stopPropagation()}>
                      <button
                        draggable={false}
                        onDragStart={(e) => e.stopPropagation()}
                        onTouchStart={(e) => e.stopPropagation()}
                        onClick={() => onStatusChange(evt, 'pending')}
                        className="flex items-center gap-0.5 text-[10px] font-semibold text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200 transition-colors cursor-pointer"
                        title="Move back to Upcoming"
                      >
                        <ArrowLeft className="w-3 h-3" />
                        <span>Back</span>
                      </button>

                      <button
                        draggable={false}
                        onDragStart={(e) => e.stopPropagation()}
                        onTouchStart={(e) => e.stopPropagation()}
                        onClick={() => onStatusChange(evt, 'completed')}
                        className="flex items-center gap-1 px-2.5 py-1 rounded-[6px] text-[10px] font-bold bg-emerald-50 text-emerald-700 hover:bg-emerald-100 dark:bg-emerald-950/40 dark:text-emerald-300 dark:hover:bg-emerald-900/60 transition-all active:scale-95 border border-emerald-200/60 dark:border-emerald-800/40 cursor-pointer"
                        title="Mark as Done"
                      >
                        <CheckCircle2 className="w-3 h-3" />
                        <span>Done</span>
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* Bottom Add Button */}
          <button
            onClick={() => onAddNewEvent('in_progress')}
            className="w-full flex items-center justify-center gap-1.5 h-8 min-h-[32px] rounded-xl text-xs font-semibold text-neutral-500 hover:text-neutral-900 dark:text-neutral-400 dark:hover:text-white hover:bg-white dark:hover:bg-[#18181b] border border-dashed border-neutral-200 dark:border-neutral-800 transition-all"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Add Task</span>
          </button>
        </div>

        {/* ========================================================================= */}
        {/* COLUMN 3: DONE (Archive - Lighter Weight & Receded Visuals)               */}
        {/* ========================================================================= */}
        <div
          data-column-status="completed"
          onDragEnter={(e) => handleDragEnter(e, 'completed')}
          onDragOver={(e) => handleDragOver(e, 'completed')}
          onDragLeave={(e) => handleDragLeave(e, 'completed')}
          onDrop={(e) => handleDrop(e, 'completed')}
          className={`ios-card p-3.5 rounded-2xl flex flex-col gap-3 min-h-[480px] transition-all ${
            dragOverColumn === 'completed'
              ? 'bg-emerald-500/10 dark:bg-emerald-500/15 border-2 border-dashed border-emerald-500 ring-2 ring-emerald-500/20'
              : 'bg-black/[0.015] dark:bg-white/[0.015] border border-neutral-200/50 dark:border-neutral-800/50 opacity-90'
          }`}
        >
          {/* Column Header */}
          <div className="flex items-center justify-between px-1">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-emerald-500" />
              <h3 className="font-bold text-xs sm:text-sm text-neutral-600 dark:text-neutral-300">
                Done
              </h3>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-neutral-200/60 dark:bg-neutral-800/60 text-neutral-600 dark:text-neutral-400">
                {doneEvents.length}
              </span>
            </div>

            <button
              onClick={() => onAddNewEvent('completed')}
              className="p-1 rounded-lg hover:bg-neutral-200/60 dark:hover:bg-neutral-800 text-neutral-500 hover:text-neutral-900 dark:hover:text-white transition-colors"
              title="Add Completed Task"
            >
              <Plus className="w-4 h-4" />
            </button>
          </div>

          {/* Column Card List */}
          <div className="flex flex-col gap-2.5 flex-1">
            {/* Drop Placeholder */}
            {dragOverColumn === 'completed' && draggingEventId && events.find(ev => ev.id === draggingEventId)?.status !== 'completed' && (
              <div className="p-3.5 rounded-[14px] border-2 border-dashed border-emerald-500/70 bg-emerald-500/10 dark:bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 flex items-center justify-center text-xs font-semibold animate-pulse shadow-xs">
                <span>Drop here to mark as Done</span>
              </div>
            )}

            {doneEvents.length === 0 ? (
              <div className="flex flex-col items-center justify-center p-6 text-center border border-dashed border-neutral-200/60 dark:border-neutral-800/60 rounded-xl my-auto">
                <CheckCircle2 className="w-6 h-6 text-neutral-300 dark:text-neutral-600 mb-1.5 opacity-40" />
                <p className="text-xs font-semibold text-neutral-400 dark:text-neutral-500">No completed tasks</p>
                <p className="text-[10px] text-neutral-400/80 mt-0.5">Tasks marked as done will collect here.</p>
              </div>
            ) : (
              doneEvents.map((evt) => {
                const isDragging = draggingEventId === evt.id;
                return (
                  <div
                    key={evt.id}
                    draggable
                    onDragStart={(e) => handleDragStart(e, evt.id)}
                    onDragEnd={handleDragEnd}
                    onTouchStart={(e) => handleTouchStart(e, evt.id)}
                    onTouchMove={handleTouchMove}
                    onTouchEnd={handleTouchEnd}
                    onClick={() => {
                      if (isDraggingRef.current) return;
                      onSelectEvent(evt);
                    }}
                    className={`p-3.5 rounded-[14px] bg-white/60 dark:bg-[#18181b]/60 border border-neutral-200/50 dark:border-neutral-800/50 transition-all cursor-grab active:cursor-grabbing group flex flex-col justify-between gap-2.5 opacity-70 hover:opacity-100 select-none touch-manipulation ${
                      isDragging ? 'opacity-40 scale-[0.98] border-dashed border-emerald-400 shadow-md' : ''
                    }`}
                  >
                    <div className="space-y-1.5">
                      <div className="flex items-start justify-between gap-1.5">
                        <div className="flex items-start gap-1 min-w-0 flex-1">
                          <GripVertical className="w-3.5 h-3.5 mt-0.5 text-neutral-300 dark:text-neutral-600 opacity-60 sm:opacity-0 sm:group-hover:opacity-100 hover:text-neutral-600 dark:hover:text-neutral-300 shrink-0 transition-opacity pointer-events-none" />
                          <h4 className="font-bold text-xs sm:text-[13px] text-neutral-500 dark:text-neutral-400 line-through truncate">
                            {evt.title}
                          </h4>
                        </div>
                        <div className="flex items-center gap-1 shrink-0">
                          {getItemTypeBadge(evt)}
                          <span className="p-0.5 text-emerald-600 dark:text-emerald-400 shrink-0">
                            <CheckCircle2 className="w-3.5 h-3.5" />
                          </span>
                        </div>
                      </div>

                      {evt.description && (
                        <div className="text-[11px] text-neutral-400 font-normal overflow-hidden">
                          <FormattedNoteContent content={evt.description} isCompact={true} />
                        </div>
                      )}
                    </div>

                    {/* Actions Row */}
                    <div className="flex items-center justify-between pt-2 border-t border-neutral-100 dark:border-neutral-800/40 text-[10px]" onClick={e => e.stopPropagation()}>
                      <div className="flex items-center gap-2">
                        <span className="text-neutral-400 font-mono text-[9px]">
                          {formatEventDate(evt.startTime)}
                        </span>
                        {(() => {
                          const autoInfo = getEventAutoDeleteInfo(evt);
                          if (!autoInfo.isExpiringSoon || !autoInfo.badgeText) return null;
                          return (
                            <span
                              className={`inline-flex items-center gap-1 text-[9px] font-semibold px-1.5 py-0.5 rounded-[5px] border ${autoInfo.badgeClass}`}
                              title={autoInfo.noticeMessage || undefined}
                            >
                              <Clock className="w-2.5 h-2.5 shrink-0" />
                              <span>{autoInfo.badgeText}</span>
                            </span>
                          );
                        })()}
                      </div>

                      <button
                        draggable={false}
                        onDragStart={(e) => e.stopPropagation()}
                        onTouchStart={(e) => e.stopPropagation()}
                        onClick={() => onStatusChange(evt, 'in_progress')}
                        className="flex items-center gap-1 text-[10px] font-semibold text-neutral-500 hover:text-neutral-900 dark:hover:text-white transition-colors cursor-pointer"
                        title="Reopen Task"
                      >
                        <RotateCcw className="w-3 h-3" />
                        <span>Reopen</span>
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* Bottom Add Button */}
          <button
            onClick={() => onAddNewEvent('completed')}
            className="w-full flex items-center justify-center gap-1.5 h-8 min-h-[32px] rounded-xl text-xs font-semibold text-neutral-400 hover:text-neutral-800 dark:text-neutral-500 dark:hover:text-white hover:bg-black/5 dark:hover:bg-white/5 border border-dashed border-neutral-200/60 dark:border-neutral-800/60 transition-all cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Add Done Task</span>
          </button>
        </div>

        {/* ========================================================================= */}
        {/* COLUMN 4: NOTES (Independent Notepad / Scratchpad Database)              */}
        {/* ========================================================================= */}
        <div className="ios-card p-3.5 rounded-2xl flex flex-col gap-3 min-h-[480px] bg-white/70 dark:bg-[#1c1c1e]/70 border border-neutral-200/80 dark:border-neutral-800">
          {/* Column Header */}
          <div className="flex items-center justify-between px-1">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-purple-500" />
              <h3 className="font-bold text-xs sm:text-sm text-[#1c1917] dark:text-white">
                Notes
              </h3>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-neutral-200/80 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300">
                {filteredNotes.length}
              </span>
            </div>

            <button
              onClick={onAddNewNote}
              className="p-1 rounded-lg hover:bg-neutral-200/60 dark:hover:bg-neutral-800 text-neutral-500 hover:text-neutral-900 dark:hover:text-white transition-colors"
              title="Add New Note"
            >
              <Plus className="w-4 h-4" />
            </button>
          </div>

          {/* Column Card List */}
          <div className="flex flex-col gap-2.5 flex-1">
            {filteredNotes.length === 0 ? (
              <div className="flex flex-col items-center justify-center p-6 text-center border border-dashed border-neutral-200 dark:border-neutral-800/80 rounded-xl my-auto">
                <FileText className="w-6 h-6 text-neutral-300 dark:text-neutral-600 mb-1.5" />
                <p className="text-xs font-semibold text-neutral-500 dark:text-neutral-400">No notes saved</p>
                <p className="text-[10px] text-neutral-400 mt-0.5">Jot down temporary thoughts, ideas, or links.</p>
                <button
                  onClick={onAddNewNote}
                  className="mt-3 inline-flex items-center gap-1 text-[11px] font-semibold text-[#2383e2] hover:underline"
                >
                  <Plus className="w-3 h-3" />
                  <span>Create Note</span>
                </button>
              </div>
            ) : (
              filteredNotes.map((note) => {
                const style = NOTE_COLOR_STYLES[note.color || 'default'];
                return (
                  <div
                    key={note.id}
                    onClick={() => onSelectNote(note)}
                    className={`p-3.5 rounded-[14px] ${style.bg} border ${style.border} transition-all cursor-pointer group flex flex-col justify-between gap-2`}
                  >
                    <div className="space-y-1">
                      <div className="flex items-start justify-between gap-1.5">
                        <h4 className={`font-bold text-xs sm:text-[13px] ${style.header} line-clamp-1`}>
                          {note.title}
                        </h4>
                        <div className="flex items-center gap-1" onClick={e => e.stopPropagation()}>
                          <button
                            onClick={() => onTogglePinNote(note)}
                            className={`p-1.5 rounded-md transition-colors ${note.isPinned
                                ? 'text-amber-500 bg-amber-100/60 dark:bg-amber-950/60'
                                : 'text-neutral-400 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 hover:text-neutral-700 dark:hover:text-neutral-200'
                              }`}
                            title={note.isPinned ? 'Unpin note' : 'Pin note to top'}
                          >
                            <Pin className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => onDeleteNote(note.id)}
                            className="p-1.5 rounded-md text-neutral-400 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors"
                            title="Delete note"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>

                      {note.content && (
                        <div className={`text-[11px] ${style.text} overflow-hidden font-normal`}>
                          <FormattedNoteContent content={note.content} isCompact={true} />
                        </div>
                      )}
                    </div>

                    <div className="flex items-center justify-between pt-1 text-[9px] text-neutral-400 font-mono">
                      <span>{formatNoteDate(note.updatedAt || note.createdAt)}</span>
                      <span className="flex items-center gap-0.5 text-neutral-400 group-hover:text-neutral-700 dark:group-hover:text-neutral-200">
                        <Edit3 className="w-2.5 h-2.5" />
                        <span>Edit</span>
                      </span>
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* Bottom Add Button */}
          <button
            onClick={onAddNewNote}
            className="w-full flex items-center justify-center gap-1.5 h-8 min-h-[32px] rounded-xl text-xs font-semibold text-neutral-500 hover:text-neutral-900 dark:text-neutral-400 dark:hover:text-white hover:bg-white dark:hover:bg-[#18181b] border border-dashed border-neutral-200 dark:border-neutral-800 transition-all cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Add Note</span>
          </button>
        </div>

      </div>
    </div>
  );
};

