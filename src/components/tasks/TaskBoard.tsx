import React, { useState, useMemo, useRef, useEffect, useCallback } from 'react';
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
import { haptics } from '../../utils/haptics';
import { Hand } from 'lucide-react';

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
  theme?: 'light' | 'dark' | 'pink';
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

interface RadialChargingIndicatorProps {
  theme?: 'light' | 'dark' | 'pink';
  position?: { x: number; y: number } | null;
  columnType?: 'pending' | 'in_progress' | 'completed';
}

const RadialChargingIndicator: React.FC<RadialChargingIndicatorProps> = ({
  theme,
  position,
  columnType = 'pending',
}) => {
  let strokeColor = '#007aff';
  let glowColor = 'rgba(0, 122, 255, 0.6)';

  if (theme === 'pink') {
    strokeColor = '#FF8DA1';
    glowColor = 'rgba(255, 141, 161, 0.6)';
  } else if (columnType === 'in_progress') {
    strokeColor = '#f59e0b';
    glowColor = 'rgba(245, 158, 11, 0.6)';
  } else if (columnType === 'completed') {
    strokeColor = '#10b981';
    glowColor = 'rgba(16, 185, 129, 0.6)';
  }

  return (
    <div
      className="absolute z-30 flex items-center justify-center pointer-events-none -translate-x-1/2 -translate-y-1/2 animate-in fade-in zoom-in-75 duration-150 select-none"
      style={{
        left: position ? `${position.x}px` : 'calc(100% - 24px)',
        top: position ? `${position.y}px` : '24px',
      }}
    >
      <div className="relative w-9 h-9 flex items-center justify-center rounded-full bg-neutral-900/90 dark:bg-black/90 backdrop-blur-md shadow-[0_4px_20px_rgba(0,0,0,0.5)] border border-white/20">
        <svg className="absolute inset-0 w-full h-full pointer-events-none" viewBox="0 0 36 36">
          <circle
            cx="18"
            cy="18"
            r="14"
            fill="none"
            stroke="rgba(255, 255, 255, 0.18)"
            strokeWidth="2.75"
          />
          <circle
            cx="18"
            cy="18"
            r="14"
            fill="none"
            stroke={strokeColor}
            strokeWidth="2.75"
            strokeLinecap="round"
            strokeDasharray="88"
            strokeDashoffset="88"
            transform="rotate(-90 18 18)"
            className="schedy-radial-circle"
            style={{
              filter: `drop-shadow(0 0 5px ${glowColor})`,
            }}
          />
        </svg>
        <Hand className="w-3.5 h-3.5 text-white fill-white/25 select-none pointer-events-none drop-shadow-sm" />
      </div>
    </div>
  );
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
  theme = 'dark',
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState<'all' | 'task' | 'event'>('all');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [priorityFilter, setPriorityFilter] = useState<string>('all');

  // Drag and drop states
  const [draggingEventId, setDraggingEventId] = useState<string | null>(null);
  const [dragOverColumn, setDragOverColumn] = useState<EventStatus | null>(null);
  const [touchPosition, setTouchPosition] = useState<{ x: number; y: number } | null>(null);
  const [chargingPressPos, setChargingPressPos] = useState<{ x: number; y: number } | null>(null);
  const isDraggingRef = useRef(false);
  const dragEnterCounters = useRef<Record<string, number>>({
    pending: 0,
    in_progress: 0,
    completed: 0,
  });

  // Prevent page scroll and overscroll rubber-banding during active drag
  useEffect(() => {
    if (draggingEventId) {
      document.body.classList.add('dragging-active');
      document.documentElement.classList.add('dragging-active');
    } else {
      document.body.classList.remove('dragging-active');
      document.documentElement.classList.remove('dragging-active');
    }
    return () => {
      document.body.classList.remove('dragging-active');
      document.documentElement.classList.remove('dragging-active');
    };
  }, [draggingEventId]);

  // Touch tracking for mobile/tablet devices
  const touchStartRef = useRef<{ x: number; y: number; eventId: string; identifier: number } | null>(null);
  const isTouchDraggingRef = useRef(false);

  // 3-Second Long-Press to Drag & Drop
  const [longPressingId, setLongPressingId] = useState<string | null>(null);
  const longPressTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pressStartPosRef = useRef<{ x: number; y: number; eventId: string } | null>(null);

  const cancelLongPress = useCallback(() => {
    if (longPressTimerRef.current) {
      clearTimeout(longPressTimerRef.current);
      longPressTimerRef.current = null;
    }
    setLongPressingId(null);
    setChargingPressPos(null);
    pressStartPosRef.current = null;
  }, []);

  // Helper to cleanly reset all drag states
  const resetDragState = useCallback(() => {
    cancelLongPress();
    setChargingPressPos(null);
    touchStartRef.current = null;
    isTouchDraggingRef.current = false;
    setTouchPosition(null);
    setDraggingEventId(null);
    setDragOverColumn(null);
    setTimeout(() => {
      isDraggingRef.current = false;
    }, 150);
  }, [cancelLongPress]);

  // Block multi-finger pinch zoom during drag interactions
  useEffect(() => {

    const preventPinchZoom = (e: TouchEvent) => {
      if (e.touches.length > 1 && e.cancelable) {
        e.preventDefault();
      }
    };
    const preventGesture = (e: Event) => {
      e.preventDefault();
    };

    document.addEventListener('touchmove', preventPinchZoom, { passive: false });
    document.addEventListener('gesturestart', preventGesture);
    document.addEventListener('gesturechange', preventGesture);

    return () => {
      resetDragState();
      document.removeEventListener('touchmove', preventPinchZoom);
      document.removeEventListener('gesturestart', preventGesture);
      document.removeEventListener('gesturechange', preventGesture);
    };
  }, [resetDragState]);

  // Active event being dragged (for mobile floating preview)
  const activeDraggingEvent = useMemo(() => {
    if (!draggingEventId) return null;
    return events.find((e) => e.id === draggingEventId) || null;
  }, [draggingEventId, events]);

  // Immediate status change when pressing a bottom dock choice card
  const handleMoveToStatus = (status: EventStatus) => {
    const eventId = draggingEventId || touchStartRef.current?.eventId;
    const targetEvent = events.find((ev) => ev.id === eventId);
    if (targetEvent) {
      haptics.success();
      if (targetEvent.status !== status) {
        onStatusChange(targetEvent, status);
      }
    }
    resetDragState();
  };

  const handleDragEnter = (e: React.DragEvent, status: EventStatus) => {
    e.preventDefault();
    dragEnterCounters.current[status] = (dragEnterCounters.current[status] || 0) + 1;
    if (dragOverColumn !== status) {
      haptics.selection();
    }
    setDragOverColumn(status);
  };

  const handleDragOver = (e: React.DragEvent, status: EventStatus) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    if (dragOverColumn !== status) {
      haptics.selection();
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
    resetDragState();
    dragEnterCounters.current = { pending: 0, in_progress: 0, completed: 0 };

    if (!eventId) return;
    const targetEvent = events.find((ev) => ev.id === eventId);
    if (targetEvent) {
      haptics.success();
      if (targetEvent.status !== status) {
        onStatusChange(targetEvent, status);
      }
    }
  };

  // 1-Second Long-Press to Drag & Drop Handlers (Desktop mouse & Mobile touch)
  const startLongPress = useCallback((eventId: string, clientX: number, clientY: number) => {
    // If already actively dragging, ignore
    if (isDraggingRef.current || isTouchDraggingRef.current) return;
    cancelLongPress();

    pressStartPosRef.current = { x: clientX, y: clientY, eventId };
    touchStartRef.current = { x: clientX, y: clientY, eventId, identifier: 0 };
    setLongPressingId(eventId);
    haptics.selection();

    longPressTimerRef.current = setTimeout(() => {
      longPressTimerRef.current = null;
      setLongPressingId(null);
      setChargingPressPos(null);
      isTouchDraggingRef.current = true;
      isDraggingRef.current = true;
      setDraggingEventId(eventId);
      setTouchPosition({ x: clientX, y: clientY });
      haptics.medium();
    }, 1000);
  }, [cancelLongPress]);

  const handleActiveDragMove = useCallback((clientX: number, clientY: number) => {
    setTouchPosition({ x: clientX, y: clientY });

    const elem = document.elementFromPoint(clientX, clientY);
    const col = elem?.closest('[data-column-status]');
    const status = col?.getAttribute('data-column-status') as EventStatus | null;
    if (status && (status === 'pending' || status === 'in_progress' || status === 'completed')) {
      setDragOverColumn((prev) => {
        if (prev !== status) {
          haptics.selection();
        }
        return status;
      });
    } else {
      setDragOverColumn(null);
    }
  }, []);

  const handleActiveDragEnd = useCallback((clientX: number, clientY: number) => {
    cancelLongPress();

    if (isTouchDraggingRef.current) {
      const eventId = draggingEventId || touchStartRef.current?.eventId;
      const elem = document.elementFromPoint(clientX, clientY);
      const col = elem?.closest('[data-column-status]');
      const status = col?.getAttribute('data-column-status') as EventStatus | null;

      if (status && (status === 'pending' || status === 'in_progress' || status === 'completed') && eventId) {
        const targetEvent = events.find((ev) => ev.id === eventId);
        if (targetEvent) {
          haptics.success();
          if (targetEvent.status !== status) {
            onStatusChange(targetEvent, status);
          }
        }
      }
    }

    resetDragState();
  }, [cancelLongPress, draggingEventId, events, onStatusChange, resetDragState]);

  // Window listeners active during 1-second long-press charging or active dragging
  useEffect(() => {
    if (!longPressingId && !draggingEventId) return;

    const onWindowTouchMove = (e: TouchEvent) => {
      if (e.touches.length > 1 && e.cancelable) {
        e.preventDefault();
      }
      const touch = e.touches[0];
      if (!touch) return;

      if (isTouchDraggingRef.current) {
        if (e.cancelable) e.preventDefault();
        handleActiveDragMove(touch.clientX, touch.clientY);
      } else if (pressStartPosRef.current) {
        const dx = Math.abs(touch.clientX - pressStartPosRef.current.x);
        const dy = Math.abs(touch.clientY - pressStartPosRef.current.y);
        // If finger moved > 8px before 1 second elapsed, user is scrolling the task list!
        if (dx > 8 || dy > 8) {
          cancelLongPress();
        }
      }
    };

    const onWindowMouseMove = (e: MouseEvent) => {
      if (isTouchDraggingRef.current) {
        e.preventDefault();
        handleActiveDragMove(e.clientX, e.clientY);
      } else if (pressStartPosRef.current) {
        const dx = Math.abs(e.clientX - pressStartPosRef.current.x);
        const dy = Math.abs(e.clientY - pressStartPosRef.current.y);
        // If mouse moved > 8px before 1 second elapsed, cancel long press
        if (dx > 8 || dy > 8) {
          cancelLongPress();
        }
      }
    };

    const onWindowTouchEnd = (e: TouchEvent) => {
      const touch = e.changedTouches[0] || e.touches[0];
      const cx = touch ? touch.clientX : 0;
      const cy = touch ? touch.clientY : 0;
      handleActiveDragEnd(cx, cy);
    };

    const onWindowMouseUp = (e: MouseEvent) => {
      handleActiveDragEnd(e.clientX, e.clientY);
    };

    const onWindowTouchCancel = () => {
      cancelLongPress();
      resetDragState();
    };

    const onWindowBlur = () => {
      cancelLongPress();
      resetDragState();
    };

    window.addEventListener('touchmove', onWindowTouchMove, { passive: false });
    window.addEventListener('touchend', onWindowTouchEnd, { passive: false });
    window.addEventListener('touchcancel', onWindowTouchCancel, { passive: true });
    window.addEventListener('mousemove', onWindowMouseMove);
    window.addEventListener('mouseup', onWindowMouseUp);
    window.addEventListener('blur', onWindowBlur);

    return () => {
      window.removeEventListener('touchmove', onWindowTouchMove);
      window.removeEventListener('touchend', onWindowTouchEnd);
      window.removeEventListener('touchcancel', onWindowTouchCancel);
      window.removeEventListener('mousemove', onWindowMouseMove);
      window.removeEventListener('mouseup', onWindowMouseUp);
      window.removeEventListener('blur', onWindowBlur);
    };
  }, [longPressingId, draggingEventId, handleActiveDragMove, handleActiveDragEnd, cancelLongPress, resetDragState]);

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
                const isCharging = longPressingId === evt.id;
                return (
                  <div
                    key={evt.id}
                    draggable={false}
                    onMouseDown={(e) => {
                      if (e.button !== 0) return;
                      const target = e.target as HTMLElement;
                      if (target.closest('button, a, input, textarea')) return;
                      const rect = e.currentTarget.getBoundingClientRect();
                      const relX = Math.max(20, Math.min(rect.width - 20, e.clientX - rect.left));
                      const relY = Math.max(20, Math.min(rect.height - 20, e.clientY - rect.top));
                      setChargingPressPos({ x: relX, y: relY });
                      startLongPress(evt.id, e.clientX, e.clientY);
                    }}
                    onTouchStart={(e) => {
                      if (e.touches.length > 1) return;
                      const t = e.touches[0];
                      if (!t) return;
                      const target = e.target as HTMLElement;
                      if (target.closest('button, a, input, textarea')) return;
                      const rect = e.currentTarget.getBoundingClientRect();
                      const relX = Math.max(20, Math.min(rect.width - 20, t.clientX - rect.left));
                      const relY = Math.max(20, Math.min(rect.height - 20, t.clientY - rect.top));
                      setChargingPressPos({ x: relX, y: relY });
                      startLongPress(evt.id, t.clientX, t.clientY);
                    }}
                    onClick={() => {
                      if (isDraggingRef.current) return;
                      onSelectEvent(evt);
                    }}
                    className={`relative p-3.5 rounded-[14px] bg-white dark:bg-[#18181b] border transition-all cursor-grab active:cursor-grabbing group flex flex-col justify-between gap-2.5 select-none touch-manipulation ${
                      isCharging
                        ? 'ring-2 ring-blue-500/60 dark:ring-blue-400/60 scale-[0.98] shadow-lg border-blue-400'
                        : isDragging
                        ? 'opacity-40 scale-[0.98] border-dashed border-blue-400 shadow-md'
                        : isUrgent
                        ? 'border-red-300/80 dark:border-red-900/60 hover:border-red-400'
                        : 'border-neutral-200/80 dark:border-neutral-800 hover:border-blue-500/50'
                    }`}
                  >
                    {/* Radial Hold-to-Drag Charging Ring */}
                    {isCharging && (
                      <RadialChargingIndicator
                        theme={theme}
                        position={chargingPressPos}
                        columnType="pending"
                      />
                    )}
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
                    <div
                      className="flex items-center justify-between pt-2 border-t border-neutral-100 dark:border-neutral-800/60"
                      onClick={(e) => e.stopPropagation()}
                      onTouchStart={(e) => e.stopPropagation()}
                      onMouseDown={(e) => e.stopPropagation()}
                    >
                      <span className="text-[9px] font-bold uppercase tracking-wider text-neutral-400">
                        {evt.category}
                      </span>

                      <button
                        draggable={false}
                        onDragStart={(e) => e.stopPropagation()}
                        onTouchStart={(e) => e.stopPropagation()}
                        onClick={() => {
                          haptics.medium();
                          onStatusChange(evt, 'in_progress');
                        }}
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
                const isCharging = longPressingId === evt.id;
                return (
                  <div
                    key={evt.id}
                    draggable={false}
                    onMouseDown={(e) => {
                      if (e.button !== 0) return;
                      const target = e.target as HTMLElement;
                      if (target.closest('button, a, input, textarea')) return;
                      const rect = e.currentTarget.getBoundingClientRect();
                      const relX = Math.max(20, Math.min(rect.width - 20, e.clientX - rect.left));
                      const relY = Math.max(20, Math.min(rect.height - 20, e.clientY - rect.top));
                      setChargingPressPos({ x: relX, y: relY });
                      startLongPress(evt.id, e.clientX, e.clientY);
                    }}
                    onTouchStart={(e) => {
                      if (e.touches.length > 1) return;
                      const t = e.touches[0];
                      if (!t) return;
                      const target = e.target as HTMLElement;
                      if (target.closest('button, a, input, textarea')) return;
                      const rect = e.currentTarget.getBoundingClientRect();
                      const relX = Math.max(20, Math.min(rect.width - 20, t.clientX - rect.left));
                      const relY = Math.max(20, Math.min(rect.height - 20, t.clientY - rect.top));
                      setChargingPressPos({ x: relX, y: relY });
                      startLongPress(evt.id, t.clientX, t.clientY);
                    }}
                    onClick={() => {
                      if (isDraggingRef.current) return;
                      onSelectEvent(evt);
                    }}
                    className={`relative p-3.5 rounded-[14px] bg-white dark:bg-[#18181b] border border-amber-300/80 dark:border-amber-900/60 transition-all cursor-grab active:cursor-grabbing group flex flex-col justify-between gap-2.5 hover:border-amber-400 select-none touch-manipulation ${
                      isCharging
                        ? 'ring-2 ring-amber-500/60 dark:ring-amber-400/60 scale-[0.98] shadow-lg border-amber-400'
                        : isDragging
                        ? 'opacity-40 scale-[0.98] border-dashed border-amber-400 shadow-md'
                        : ''
                    }`}
                  >
                    {/* Radial Hold-to-Drag Charging Ring */}
                    {isCharging && (
                      <RadialChargingIndicator
                        theme={theme}
                        position={chargingPressPos}
                        columnType="in_progress"
                      />
                    )}
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
                    <div
                      className="flex items-center justify-between pt-2 border-t border-neutral-100 dark:border-neutral-800/60"
                      onClick={(e) => e.stopPropagation()}
                      onTouchStart={(e) => e.stopPropagation()}
                      onMouseDown={(e) => e.stopPropagation()}
                    >
                      <button
                        draggable={false}
                        onDragStart={(e) => e.stopPropagation()}
                        onTouchStart={(e) => e.stopPropagation()}
                        onClick={() => {
                          haptics.light();
                          onStatusChange(evt, 'pending');
                        }}
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
                        onClick={() => {
                          haptics.success();
                          onStatusChange(evt, 'completed');
                        }}
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
                const isCharging = longPressingId === evt.id;
                return (
                  <div
                    key={evt.id}
                    draggable={false}
                    onMouseDown={(e) => {
                      if (e.button !== 0) return;
                      const target = e.target as HTMLElement;
                      if (target.closest('button, a, input, textarea')) return;
                      const rect = e.currentTarget.getBoundingClientRect();
                      const relX = Math.max(20, Math.min(rect.width - 20, e.clientX - rect.left));
                      const relY = Math.max(20, Math.min(rect.height - 20, e.clientY - rect.top));
                      setChargingPressPos({ x: relX, y: relY });
                      startLongPress(evt.id, e.clientX, e.clientY);
                    }}
                    onTouchStart={(e) => {
                      if (e.touches.length > 1) return;
                      const t = e.touches[0];
                      if (!t) return;
                      const target = e.target as HTMLElement;
                      if (target.closest('button, a, input, textarea')) return;
                      const rect = e.currentTarget.getBoundingClientRect();
                      const relX = Math.max(20, Math.min(rect.width - 20, t.clientX - rect.left));
                      const relY = Math.max(20, Math.min(rect.height - 20, t.clientY - rect.top));
                      setChargingPressPos({ x: relX, y: relY });
                      startLongPress(evt.id, t.clientX, t.clientY);
                    }}
                    onClick={() => {
                      if (isDraggingRef.current) return;
                      onSelectEvent(evt);
                    }}
                    className={`relative p-3.5 rounded-[14px] bg-white/60 dark:bg-[#18181b]/60 border border-neutral-200/50 dark:border-neutral-800/50 transition-all cursor-grab active:cursor-grabbing group flex flex-col justify-between gap-2.5 opacity-70 hover:opacity-100 select-none touch-manipulation ${
                      isCharging
                        ? 'ring-2 ring-emerald-500/60 dark:ring-emerald-400/60 scale-[0.98] shadow-lg border-emerald-400 opacity-100'
                        : isDragging
                        ? 'opacity-40 scale-[0.98] border-dashed border-emerald-400 shadow-md'
                        : ''
                    }`}
                  >
                    {/* Radial Hold-to-Drag Charging Ring */}
                    {isCharging && (
                      <RadialChargingIndicator
                        theme={theme}
                        position={chargingPressPos}
                        columnType="completed"
                      />
                    )}
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
                    <div
                      className="flex items-center justify-between pt-2 border-t border-neutral-100 dark:border-neutral-800/40 text-[10px]"
                      onClick={(e) => e.stopPropagation()}
                      onTouchStart={(e) => e.stopPropagation()}
                      onMouseDown={(e) => e.stopPropagation()}
                    >
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
                        onClick={() => {
                          haptics.light();
                          onStatusChange(evt, 'in_progress');
                        }}
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

      {/* ========================================================================= */}
      {/* FLOATING DRAG PREVIEW (Follows cursor & touch point directly)             */}
      {/* ========================================================================= */}
      {touchPosition && activeDraggingEvent && (
        <div
          className="fixed pointer-events-none z-[9999] w-[280px] p-3.5 rounded-2xl bg-white/95 dark:bg-[#18181b]/95 backdrop-blur-2xl shadow-[0_20px_50px_rgba(0,0,0,0.35),0_0_25px_rgba(0,122,255,0.2)] border-2 border-[#007aff] dark:border-[#0a84ff] rotate-1.5 scale-[1.02] select-none -translate-x-1/2 -translate-y-1/2"
          style={{
            left: `${touchPosition.x}px`,
            top: `${touchPosition.y}px`,
          }}
        >
          <div className="flex items-start justify-between gap-1.5 mb-1.5">
            <div className="flex items-center gap-1.5 min-w-0 flex-1">
              <GripVertical className="w-3.5 h-3.5 text-[#007aff] dark:text-[#0a84ff] shrink-0" />
              <h4 className="font-bold text-xs sm:text-[13px] text-[#1c1917] dark:text-white truncate">
                {activeDraggingEvent.title}
              </h4>
            </div>
            <div className="flex items-center gap-1 shrink-0">
              {getItemTypeBadge(activeDraggingEvent)}
              {getPriorityBadge(activeDraggingEvent.priority)}
            </div>
          </div>
          <div className="flex items-center justify-between text-[10px] text-neutral-500 dark:text-neutral-400 mt-1 pt-1.5 border-t border-black/[0.06] dark:border-white/[0.08]">
            <span className="capitalize font-medium">{activeDraggingEvent.category}</span>
            <span className={`font-bold text-[9.5px] uppercase tracking-wider px-2 py-0.5 rounded-full ${
              dragOverColumn === 'pending'
                ? 'bg-blue-500/15 text-blue-600 dark:text-blue-400'
                : dragOverColumn === 'in_progress'
                ? 'bg-amber-500/15 text-amber-600 dark:text-amber-400'
                : dragOverColumn === 'completed'
                ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400'
                : 'bg-neutral-500/10 text-neutral-500'
            }`}>
              {dragOverColumn ? `Move to ${dragOverColumn.replace('_', ' ')}` : 'Dragging...'}
            </span>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MOBILE QUICK DROP DOCK: Bottom floating action shelf                      */}
      {/* ========================================================================= */}
      {draggingEventId && (
        <div className="md:hidden fixed bottom-6 inset-x-3 z-[9998] animate-in fade-in slide-in-from-bottom-5 duration-200">
          <div className="bg-white/95 dark:bg-[#18181b]/95 backdrop-blur-2xl border border-black/10 dark:border-white/10 rounded-2xl p-2 shadow-2xl flex items-stretch gap-2">
            {/* Upcoming Dock Zone */}
            <button
              type="button"
              data-column-status="pending"
              onPointerDown={(e) => {
                e.preventDefault();
                e.stopPropagation();
                handleMoveToStatus('pending');
              }}
              onTouchStart={(e) => {
                e.preventDefault();
                e.stopPropagation();
                handleMoveToStatus('pending');
              }}
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                handleMoveToStatus('pending');
              }}
              className={`flex-1 py-3 px-2 rounded-xl flex flex-col items-center justify-center gap-1 transition-all cursor-pointer active:scale-95 touch-manipulation select-none ${
                dragOverColumn === 'pending'
                  ? 'bg-blue-500 text-white shadow-md scale-[1.03] ring-2 ring-blue-300'
                  : 'bg-blue-500/10 text-blue-700 dark:text-blue-300 border border-blue-500/20 active:bg-blue-500 active:text-white'
              }`}
            >
              <span className={`w-2 h-2 rounded-full ${dragOverColumn === 'pending' ? 'bg-white' : 'bg-blue-500'}`} />
              <span className="text-[11px] font-bold">Upcoming</span>
              <span className="text-[8.5px] opacity-75 font-medium">Tap to move</span>
            </button>

            {/* In Progress Dock Zone */}
            <button
              type="button"
              data-column-status="in_progress"
              onPointerDown={(e) => {
                e.preventDefault();
                e.stopPropagation();
                handleMoveToStatus('in_progress');
              }}
              onTouchStart={(e) => {
                e.preventDefault();
                e.stopPropagation();
                handleMoveToStatus('in_progress');
              }}
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                handleMoveToStatus('in_progress');
              }}
              className={`flex-1 py-3 px-2 rounded-xl flex flex-col items-center justify-center gap-1 transition-all cursor-pointer active:scale-95 touch-manipulation select-none ${
                dragOverColumn === 'in_progress'
                  ? 'bg-amber-500 text-white shadow-md scale-[1.03] ring-2 ring-amber-300'
                  : 'bg-amber-500/10 text-amber-700 dark:text-amber-300 border border-amber-500/20 active:bg-amber-500 active:text-white'
              }`}
            >
              <span className={`w-2 h-2 rounded-full ${dragOverColumn === 'in_progress' ? 'bg-white' : 'bg-amber-500'}`} />
              <span className="text-[11px] font-bold">In Progress</span>
              <span className="text-[8.5px] opacity-75 font-medium">Tap to move</span>
            </button>

            {/* Done Dock Zone */}
            <button
              type="button"
              data-column-status="completed"
              onPointerDown={(e) => {
                e.preventDefault();
                e.stopPropagation();
                handleMoveToStatus('completed');
              }}
              onTouchStart={(e) => {
                e.preventDefault();
                e.stopPropagation();
                handleMoveToStatus('completed');
              }}
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                handleMoveToStatus('completed');
              }}
              className={`flex-1 py-3 px-2 rounded-xl flex flex-col items-center justify-center gap-1 transition-all cursor-pointer active:scale-95 touch-manipulation select-none ${
                dragOverColumn === 'completed'
                  ? 'bg-emerald-500 text-white shadow-md scale-[1.03] ring-2 ring-emerald-300'
                  : 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border border-emerald-500/20 active:bg-emerald-500 active:text-white'
              }`}
            >
              <span className={`w-2 h-2 rounded-full ${dragOverColumn === 'completed' ? 'bg-white' : 'bg-emerald-500'}`} />
              <span className="text-[11px] font-bold">Done</span>
              <span className="text-[8.5px] opacity-75 font-medium">Tap to move</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

