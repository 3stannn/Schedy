import React, { useState, useMemo } from 'react';
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
  Sparkles
} from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { FormattedNoteContent } from './FormattedNoteContent';
import { stripHtml } from './noteFormattingUtils';

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
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [priorityFilter, setPriorityFilter] = useState<string>('all');

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
      if (categoryFilter !== 'all' && e.category !== categoryFilter) return false;
      if (priorityFilter !== 'all' && e.priority !== priorityFilter) return false;
      return true;
    });
  }, [events, searchQuery, categoryFilter, priorityFilter]);

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
  const formatEventDate = (isoString: string) => {
    try {
      const d = parseISO(isoString);
      return format(d, 'MMM d, h:mm a');
    } catch {
      return '';
    }
  };

  return (
    <div className="space-y-4">
      {/* Top Filter & Search Bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5 p-2 sm:p-2.5 rounded-2xl bg-white/90 dark:bg-[#161619]/90 backdrop-blur-md border border-neutral-200/80 dark:border-neutral-800 shadow-2xs">
        {/* Search */}
        <div className="relative flex-1 min-w-[200px]">
          <Search className="w-4 h-4 text-neutral-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search tasks, events, and notes..."
            className="w-full pl-9 pr-3 py-1.5 text-xs bg-neutral-100/80 dark:bg-neutral-900/80 border border-neutral-200/60 dark:border-neutral-800/60 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#2383e2] text-[#1c1917] dark:text-white placeholder:text-neutral-400"
          />
        </div>

        {/* Filters */}
        <div className="flex items-center gap-2 flex-wrap">
          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="px-2.5 py-1.5 text-xs bg-neutral-100/80 dark:bg-neutral-900/80 border border-neutral-200/60 dark:border-neutral-800/60 rounded-xl text-neutral-700 dark:text-neutral-300 focus:outline-none focus:ring-2 focus:ring-[#2383e2]"
          >
            <option value="all">All Categories</option>
            <option value="work">Work</option>
            <option value="meeting">Meeting</option>
            <option value="deadline">Deadline</option>
            <option value="personal">Personal</option>
            <option value="education">Education</option>
            <option value="general">General</option>
          </select>

          <select
            value={priorityFilter}
            onChange={(e) => setPriorityFilter(e.target.value)}
            className="px-2.5 py-1.5 text-xs bg-neutral-100/80 dark:bg-neutral-900/80 border border-neutral-200/60 dark:border-neutral-800/60 rounded-xl text-neutral-700 dark:text-neutral-300 focus:outline-none focus:ring-2 focus:ring-[#2383e2]"
          >
            <option value="all">All Priorities</option>
            <option value="urgent">Urgent</option>
            <option value="high">High</option>
            <option value="medium">Medium</option>
            <option value="low">Low</option>
          </select>

          {(searchQuery || categoryFilter !== 'all' || priorityFilter !== 'all') && (
            <button
              onClick={() => {
                setSearchQuery('');
                setCategoryFilter('all');
                setPriorityFilter('all');
              }}
              className="px-2.5 py-1.5 text-xs font-semibold text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-xl transition-colors"
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
        <div className="p-3 rounded-2xl bg-neutral-50/70 dark:bg-[#141416]/70 border border-neutral-200/80 dark:border-neutral-800/80 flex flex-col gap-3 min-h-[480px] shadow-2xs">
          {/* Column Header */}
          <div className="flex items-center justify-between px-1">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-blue-500 shadow-2xs" />
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
              upcomingEvents.map((evt) => (
                <div
                  key={evt.id}
                  onClick={() => onSelectEvent(evt)}
                  className="p-3.5 rounded-[14px] bg-white dark:bg-[#18181b] border border-neutral-200/80 dark:border-neutral-800 shadow-2xs hover:shadow-md transition-all cursor-pointer group flex flex-col justify-between gap-2.5"
                >
                  <div className="space-y-1.5">
                    <div className="flex items-start justify-between gap-1.5">
                      <h4 className="font-bold text-xs sm:text-[13px] text-[#1c1917] dark:text-white group-hover:text-[#2383e2] transition-colors line-clamp-2">
                        {evt.title}
                      </h4>
                      {getPriorityBadge(evt.priority)}
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
                    </div>
                  </div>

                  {/* Actions Row */}
                  <div className="flex items-center justify-between pt-2 border-t border-neutral-100 dark:border-neutral-800/60" onClick={e => e.stopPropagation()}>
                    <span className="text-[9px] font-bold uppercase tracking-wider text-neutral-400">
                      {evt.category}
                    </span>

                    <button
                      onClick={() => onStatusChange(evt, 'in_progress')}
                      className="flex items-center gap-1 px-2.5 py-1 rounded-[6px] text-[10px] font-bold bg-amber-50 text-amber-700 hover:bg-amber-100 dark:bg-amber-950/40 dark:text-amber-300 dark:hover:bg-amber-900/60 transition-all active:scale-95 shadow-2xs border border-amber-200/60 dark:border-amber-800/40"
                      title="Move to In Progress"
                    >
                      <span>Start</span>
                      <ArrowRight className="w-3 h-3" />
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Bottom Add Button */}
          <button
            onClick={() => onAddNewEvent('pending')}
            className="w-full flex items-center justify-center gap-1.5 py-2 rounded-xl text-xs font-semibold text-neutral-500 hover:text-neutral-900 dark:text-neutral-400 dark:hover:text-white hover:bg-white dark:hover:bg-[#18181b] border border-dashed border-neutral-200 dark:border-neutral-800 transition-all"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Add Task</span>
          </button>
        </div>

        {/* ========================================================================= */}
        {/* COLUMN 2: IN PROGRESS (Calendar Events with 'in_progress' status)         */}
        {/* ========================================================================= */}
        <div className="p-3 rounded-2xl bg-neutral-50/70 dark:bg-[#141416]/70 border border-neutral-200/80 dark:border-neutral-800/80 flex flex-col gap-3 min-h-[480px] shadow-2xs">
          {/* Column Header */}
          <div className="flex items-center justify-between px-1">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-amber-500 shadow-2xs animate-pulse" />
              <h3 className="font-bold text-xs sm:text-sm text-[#1c1917] dark:text-white">
                In Progress
              </h3>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-neutral-200/80 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300">
                {inProgressEvents.length}
              </span>
            </div>

            <button
              onClick={() => onAddNewEvent('in_progress')}
              className="p-1 rounded-lg hover:bg-neutral-200/60 dark:hover:bg-neutral-800 text-neutral-500 hover:text-neutral-900 dark:hover:text-white transition-colors"
              title="Add In Progress Task"
            >
              <Plus className="w-4 h-4" />
            </button>
          </div>

          {/* Column Card List */}
          <div className="flex flex-col gap-2.5 flex-1">
            {inProgressEvents.length === 0 ? (
              <div className="flex flex-col items-center justify-center p-6 text-center border border-dashed border-neutral-200 dark:border-neutral-800/80 rounded-xl my-auto">
                <Sparkles className="w-6 h-6 text-neutral-300 dark:text-neutral-600 mb-1.5" />
                <p className="text-xs font-semibold text-neutral-500 dark:text-neutral-400">No tasks in progress</p>
                <p className="text-[10px] text-neutral-400 mt-0.5">Click "Start" on any upcoming task.</p>
              </div>
            ) : (
              inProgressEvents.map((evt) => (
                <div
                  key={evt.id}
                  onClick={() => onSelectEvent(evt)}
                  className="p-3.5 rounded-[14px] bg-white dark:bg-[#18181b] border border-amber-200/80 dark:border-amber-900/50 shadow-2xs hover:shadow-md transition-all cursor-pointer group flex flex-col justify-between gap-2.5 ring-1 ring-amber-400/20"
                >
                  <div className="space-y-1.5">
                    <div className="flex items-start justify-between gap-1.5">
                      <h4 className="font-bold text-xs sm:text-[13px] text-[#1c1917] dark:text-white group-hover:text-amber-600 transition-colors line-clamp-2">
                        {evt.title}
                      </h4>
                      {getPriorityBadge(evt.priority)}
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
                    </div>
                  </div>

                  {/* Actions Row */}
                  <div className="flex items-center justify-between pt-2 border-t border-neutral-100 dark:border-neutral-800/60" onClick={e => e.stopPropagation()}>
                    <button
                      onClick={() => onStatusChange(evt, 'pending')}
                      className="flex items-center gap-0.5 text-[10px] font-semibold text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200 transition-colors"
                      title="Move back to Upcoming"
                    >
                      <ArrowLeft className="w-3 h-3" />
                      <span>Back</span>
                    </button>

                    <button
                      onClick={() => onStatusChange(evt, 'completed')}
                      className="flex items-center gap-1 px-2.5 py-1 rounded-[6px] text-[10px] font-bold bg-emerald-50 text-emerald-700 hover:bg-emerald-100 dark:bg-emerald-950/40 dark:text-emerald-300 dark:hover:bg-emerald-900/60 transition-all active:scale-95 shadow-2xs border border-emerald-200/60 dark:border-emerald-800/40"
                      title="Mark as Done"
                    >
                      <CheckCircle2 className="w-3 h-3" />
                      <span>Done</span>
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Bottom Add Button */}
          <button
            onClick={() => onAddNewEvent('in_progress')}
            className="w-full flex items-center justify-center gap-1.5 py-2 rounded-xl text-xs font-semibold text-neutral-500 hover:text-neutral-900 dark:text-neutral-400 dark:hover:text-white hover:bg-white dark:hover:bg-[#18181b] border border-dashed border-neutral-200 dark:border-neutral-800 transition-all"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Add Task</span>
          </button>
        </div>

        {/* ========================================================================= */}
        {/* COLUMN 3: DONE (Calendar Events with 'completed' status)                  */}
        {/* ========================================================================= */}
        <div className="p-3 rounded-2xl bg-neutral-50/70 dark:bg-[#141416]/70 border border-neutral-200/80 dark:border-neutral-800/80 flex flex-col gap-3 min-h-[480px] shadow-2xs">
          {/* Column Header */}
          <div className="flex items-center justify-between px-1">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 shadow-2xs" />
              <h3 className="font-bold text-xs sm:text-sm text-[#1c1917] dark:text-white">
                Done
              </h3>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-neutral-200/80 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300">
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
            {doneEvents.length === 0 ? (
              <div className="flex flex-col items-center justify-center p-6 text-center border border-dashed border-neutral-200 dark:border-neutral-800/80 rounded-xl my-auto">
                <CheckCircle2 className="w-6 h-6 text-neutral-300 dark:text-neutral-600 mb-1.5" />
                <p className="text-xs font-semibold text-neutral-500 dark:text-neutral-400">No completed tasks</p>
                <p className="text-[10px] text-neutral-400 mt-0.5">Tasks marked as done will collect here.</p>
              </div>
            ) : (
              doneEvents.map((evt) => (
                <div
                  key={evt.id}
                  onClick={() => onSelectEvent(evt)}
                  className="p-3.5 rounded-[14px] bg-white/70 dark:bg-[#18181b]/70 border border-neutral-200/60 dark:border-neutral-800/60 shadow-2xs hover:shadow-md transition-all cursor-pointer group flex flex-col justify-between gap-2.5 opacity-80 hover:opacity-100"
                >
                  <div className="space-y-1.5">
                    <div className="flex items-start justify-between gap-1.5">
                      <h4 className="font-bold text-xs sm:text-[13px] text-neutral-600 dark:text-neutral-300 line-through truncate">
                        {evt.title}
                      </h4>
                      <span className="p-0.5 text-emerald-600 dark:text-emerald-400 shrink-0">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                      </span>
                    </div>

                    {evt.description && (
                      <div className="text-[11px] text-neutral-400 font-normal overflow-hidden">
                        <FormattedNoteContent content={evt.description} isCompact={true} />
                      </div>
                    )}
                  </div>

                  {/* Actions Row */}
                  <div className="flex items-center justify-between pt-2 border-t border-neutral-100 dark:border-neutral-800/40 text-[10px]" onClick={e => e.stopPropagation()}>
                    <span className="text-neutral-400 font-mono text-[9px]">
                      {formatEventDate(evt.startTime)}
                    </span>

                    <button
                      onClick={() => onStatusChange(evt, 'in_progress')}
                      className="flex items-center gap-1 text-[10px] font-semibold text-neutral-500 hover:text-neutral-900 dark:hover:text-white transition-colors"
                      title="Reopen Task"
                    >
                      <RotateCcw className="w-3 h-3" />
                      <span>Reopen</span>
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Bottom Add Button */}
          <button
            onClick={() => onAddNewEvent('completed')}
            className="w-full flex items-center justify-center gap-1.5 py-2 rounded-xl text-xs font-semibold text-neutral-500 hover:text-neutral-900 dark:text-neutral-400 dark:hover:text-white hover:bg-white dark:hover:bg-[#18181b] border border-dashed border-neutral-200 dark:border-neutral-800 transition-all"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Add Done Task</span>
          </button>
        </div>

        {/* ========================================================================= */}
        {/* COLUMN 4: NOTES (Independent Notepad / Scratchpad Database)              */}
        {/* ========================================================================= */}
        <div className="p-3 rounded-2xl bg-neutral-50/70 dark:bg-[#141416]/70 border border-neutral-200/80 dark:border-neutral-800/80 flex flex-col gap-3 min-h-[480px] shadow-2xs">
          {/* Column Header */}
          <div className="flex items-center justify-between px-1">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-purple-500 shadow-2xs" />
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
                    className={`p-3.5 rounded-[14px] ${style.bg} border ${style.border} shadow-2xs hover:shadow-md transition-all cursor-pointer group flex flex-col justify-between gap-2`}
                  >
                    <div className="space-y-1">
                      <div className="flex items-start justify-between gap-1.5">
                        <h4 className={`font-bold text-xs sm:text-[13px] ${style.header} line-clamp-1`}>
                          {note.title}
                        </h4>
                        <div className="flex items-center gap-1" onClick={e => e.stopPropagation()}>
                          <button
                            onClick={() => onTogglePinNote(note)}
                            className={`p-1 rounded-md transition-colors ${
                              note.isPinned
                                ? 'text-amber-500 bg-amber-100/60 dark:bg-amber-950/60'
                                : 'text-neutral-400 opacity-0 group-hover:opacity-100 hover:text-neutral-700 dark:hover:text-neutral-200'
                            }`}
                            title={note.isPinned ? 'Unpin note' : 'Pin note to top'}
                          >
                            <Pin className="w-3 h-3" />
                          </button>
                          <button
                            onClick={() => onDeleteNote(note.id)}
                            className="p-1 rounded-md text-neutral-400 opacity-0 group-hover:opacity-100 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors"
                            title="Delete note"
                          >
                            <Trash2 className="w-3 h-3" />
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
                      <span>{format(parseISO(note.updatedAt || note.createdAt), 'MMM d, h:mm a')}</span>
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
            className="w-full flex items-center justify-center gap-1.5 py-2 rounded-xl text-xs font-semibold text-neutral-500 hover:text-neutral-900 dark:text-neutral-400 dark:hover:text-white hover:bg-white dark:hover:bg-[#18181b] border border-dashed border-neutral-200 dark:border-neutral-800 transition-all"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Add Note</span>
          </button>
        </div>

      </div>
    </div>
  );
};

