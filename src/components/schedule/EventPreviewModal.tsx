import React, { useState, useEffect } from 'react';
import type { ScheduleEvent, PriorityLevel, EventCategory, EventStatus } from '../../types/schedule';
import {
  X,
  Trash2,
  MapPin,
  Video,
  AlertTriangle,
  Clock,
  Repeat,
  CheckSquare,
  Edit3,
  Calendar,
  ExternalLink
} from '../common/MovingIcon';
import { format, parseISO, isSameDay } from 'date-fns';
import { ConfirmModal } from '../common/ConfirmModal';
import { FormattedNoteContent } from '../tasks/FormattedNoteContent';
import { getEventAutoDeleteInfo } from '../../utils/autoDeleteUtils';

interface EventPreviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  event: ScheduleEvent | null;
  onEdit: (event: ScheduleEvent) => void;
  onDelete: (id: string) => void;
  onStatusChange: (event: ScheduleEvent, status: EventStatus) => void;
}

const priorityConfig: Record<PriorityLevel, { label: string; badge: string; dot: string }> = {
  low: {
    label: 'Low',
    badge: 'bg-neutral-100 text-neutral-600 dark:bg-neutral-800 dark:text-neutral-400 border-neutral-200/80 dark:border-neutral-700/80',
    dot: 'bg-neutral-400'
  },
  medium: {
    label: 'Medium',
    badge: 'bg-sky-50 text-sky-700 dark:bg-sky-950/40 dark:text-sky-300 border-sky-200/80 dark:border-sky-800/60',
    dot: 'bg-sky-500'
  },
  high: {
    label: 'High',
    badge: 'bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300 border-amber-200/80 dark:border-amber-800/60',
    dot: 'bg-amber-500'
  },
  urgent: {
    label: 'Urgent',
    badge: 'bg-rose-50 text-rose-700 dark:bg-rose-950/40 dark:text-rose-300 border-rose-200/80 dark:border-rose-800/60',
    dot: 'bg-rose-500'
  },
};

const categoryConfig: Record<EventCategory, { label: string; badge: string }> = {
  work: { label: 'Work', badge: 'bg-purple-50 text-purple-700 dark:bg-purple-950/40 dark:text-purple-300 border-purple-200/80 dark:border-purple-800/60' },
  meeting: { label: 'Meeting', badge: 'bg-blue-50 text-blue-700 dark:bg-blue-950/40 dark:text-blue-300 border-blue-200/80 dark:border-blue-800/60' },
  deadline: { label: 'Deadline', badge: 'bg-rose-50 text-rose-700 dark:bg-rose-950/40 dark:text-rose-300 border-rose-200/80 dark:border-rose-800/60' },
  personal: { label: 'Personal', badge: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300 border-emerald-200/80 dark:border-emerald-800/60' },
  education: { label: 'Education', badge: 'bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300 border-amber-200/80 dark:border-amber-800/60' },
  general: { label: 'General', badge: 'bg-neutral-100 text-neutral-600 dark:bg-neutral-800 dark:text-neutral-400 border-neutral-200/80 dark:border-neutral-700/80' },
};

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

export const EventPreviewModal: React.FC<EventPreviewModalProps> = ({
  isOpen,
  onClose,
  event,
  onEdit,
  onDelete,
  onStatusChange,
}) => {
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  // Close on Escape key or trigger Edit on 'e'
  useEffect(() => {
    if (!isOpen || !event) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      } else if ((e.key === 'e' || e.key === 'E') && !['INPUT', 'TEXTAREA'].includes((e.target as HTMLElement).tagName)) {
        onEdit(event);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, event, onClose, onEdit]);

  if (!isOpen || !event) return null;

  const isCompleted = event.status === 'completed';
  const category = categoryConfig[event.category] || categoryConfig.general;
  const priority = priorityConfig[event.priority] || priorityConfig.medium;
  const autoDeleteInfo = getEventAutoDeleteInfo(event);

  // Date & Time formatting
  const startDate = parseEventDate(event.startTime);
  const endDate = parseEventDate(event.endTime);

  let formattedDateRange = 'Not scheduled';
  if (startDate) {
    if (event.isAllDay) {
      if (endDate && !isSameDay(startDate, endDate)) {
        formattedDateRange = `${format(startDate, 'EEE, MMM d, yyyy')} – ${format(endDate, 'EEE, MMM d, yyyy')} (All Day)`;
      } else {
        formattedDateRange = `${format(startDate, 'EEEE, MMMM d, yyyy')} (All Day)`;
      }
    } else {
      if (endDate && isSameDay(startDate, endDate)) {
        formattedDateRange = `${format(startDate, 'EEEE, MMMM d, yyyy')} • ${format(startDate, 'h:mm a')} – ${format(endDate, 'h:mm a')}`;
      } else if (endDate) {
        formattedDateRange = `${format(startDate, 'MMM d, yyyy, h:mm a')} – ${format(endDate, 'MMM d, yyyy, h:mm a')}`;
      } else {
        formattedDateRange = `${format(startDate, 'EEEE, MMMM d, yyyy, h:mm a')}`;
      }
    }
  }

  const handleDelete = () => {
    onDelete(event.id);
    setShowDeleteConfirm(false);
    onClose();
  };

  return (
    <>
      <div 
        className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/40 backdrop-blur-md animate-fade-in"
        onClick={onClose}
      >
        <div
          className="ios-card rounded-3xl max-w-lg w-full max-h-[90vh] overflow-hidden border border-black/[0.08] dark:border-white/[0.1] shadow-2xl flex flex-col text-neutral-800 dark:text-neutral-100 bg-white/95 dark:bg-[#1c1c1e]/95 backdrop-blur-2xl"
          onClick={e => e.stopPropagation()}
        >
          {/* Header Row: Badges & Close Button */}
          <div className="flex items-center justify-between px-6 pt-5 pb-3 border-b border-black/[0.06] dark:border-white/[0.08] sticky top-0 bg-white/95 dark:bg-[#1c1c1e]/95 backdrop-blur-md z-10">
            <div className="flex items-center gap-1.5 flex-wrap">
              {/* Type Badge: Event or Task */}
              <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold border ${
                event.itemType === 'task'
                  ? 'bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300 border-amber-200/80 dark:border-amber-800/60'
                  : 'bg-blue-50 text-blue-700 dark:bg-blue-950/40 dark:text-blue-300 border-blue-200/80 dark:border-blue-800/60'
              }`}>
                {event.itemType === 'task' ? <CheckSquare className="w-3 h-3" /> : <Calendar className="w-3 h-3" />}
                <span>{event.itemType === 'task' ? 'Task' : 'Event'}</span>
              </span>

              {/* Category Badge */}
              <span className={`px-2.5 py-0.5 rounded-full text-[11px] font-semibold border ${category.badge}`}>
                {category.label}
              </span>

              {/* Priority Badge */}
              <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold border ${priority.badge}`}>
                <span className={`w-1.5 h-1.5 rounded-full ${priority.dot}`} />
                <span>{priority.label}</span>
              </span>

              {/* Recurrence Badge */}
              {event.recurrenceRule && event.recurrenceRule !== 'none' && (
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-300 border border-neutral-200/80 dark:border-neutral-700/80 capitalize">
                  <Repeat className="w-3 h-3" />
                  <span>{event.recurrenceRule}</span>
                </span>
              )}

              {/* Retention Policy Badge */}
              {autoDeleteInfo.badgeText && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-amber-500/10 text-amber-700 dark:text-amber-400 border border-amber-500/20">
                  <Clock className="w-2.5 h-2.5" />
                  <span>{autoDeleteInfo.badgeText}</span>
                </span>
              )}
            </div>

            <button
              onClick={onClose}
              className="p-1.5 rounded-xl text-neutral-400 hover:text-neutral-700 dark:hover:text-white hover:bg-black/5 dark:hover:bg-white/10 transition-colors cursor-pointer"
              title="Close (Esc)"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Scrollable Modal Body */}
          <div className="p-6 space-y-5 overflow-y-auto flex-1 text-xs">
            
            {/* Title (Checkbox removed) */}
            <div>
              <h2 className={`text-lg sm:text-xl font-bold tracking-tight leading-snug break-words ${isCompleted ? 'line-through text-neutral-400 dark:text-neutral-500' : 'text-neutral-900 dark:text-white'}`}>
                {event.title}
              </h2>
            </div>

            {/* Quick Status Segmented Switcher */}
            <div className="p-2.5 rounded-2xl bg-black/[0.03] dark:bg-white/[0.04] border border-black/[0.06] dark:border-white/[0.08] flex items-center justify-between gap-2">
              <span className="text-[11px] font-bold uppercase tracking-wider text-neutral-400 pl-1 shrink-0">
                Status
              </span>

              <div className="ios-segmented-control flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => onStatusChange(event, 'pending')}
                  className={`ios-segmented-item px-3 text-xs font-semibold ${
                    event.status === 'pending' ? 'ios-segmented-item-active text-[#007aff]' : ''
                  }`}
                >
                  Upcoming
                </button>
                <button
                  type="button"
                  onClick={() => onStatusChange(event, 'in_progress')}
                  className={`ios-segmented-item px-3 text-xs font-semibold ${
                    event.status === 'in_progress' ? 'ios-segmented-item-active text-amber-600 dark:text-amber-400' : ''
                  }`}
                >
                  In Progress
                </button>
                <button
                  type="button"
                  onClick={() => onStatusChange(event, 'completed')}
                  className={`ios-segmented-item px-3 text-xs font-semibold ${
                    event.status === 'completed' ? 'ios-segmented-item-active text-emerald-600 dark:text-emerald-400' : ''
                  }`}
                >
                  Done
                </button>
              </div>
            </div>

            {/* Info Grid (Date, Location, Video) */}
            <div className="rounded-2xl border border-black/[0.06] dark:border-white/[0.08] bg-black/[0.015] dark:bg-white/[0.02] p-3.5 space-y-2.5">
              
              {/* Date & Time */}
              <div className="flex items-start gap-2.5">
                <div className="w-6 h-6 rounded-[8px] bg-[#007aff]/10 text-[#007aff] dark:text-[#0a84ff] flex items-center justify-center shrink-0 mt-0.5">
                  <Calendar className="w-3.5 h-3.5" />
                </div>
                <div className="flex-1 min-w-0">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-neutral-400 block">
                    Schedule
                  </span>
                  <span className="text-xs font-semibold text-neutral-800 dark:text-neutral-200">
                    {formattedDateRange}
                  </span>
                </div>
              </div>

              {/* Location (if present) */}
              {event.location && (
                <div className="flex items-start gap-2.5 pt-2 border-t border-black/[0.04] dark:border-white/[0.04]">
                  <div className="w-6 h-6 rounded-[8px] bg-rose-500/10 text-rose-500 flex items-center justify-center shrink-0 mt-0.5">
                    <MapPin className="w-3.5 h-3.5" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-neutral-400 block">
                      Location
                    </span>
                    <span className="text-xs font-medium text-neutral-700 dark:text-neutral-300 break-words">
                      {event.location}
                    </span>
                  </div>
                </div>
              )}

              {/* Meeting Link (if present) */}
              {event.meetingUrl && (
                <div className="flex items-center justify-between gap-2.5 pt-2 border-t border-black/[0.04] dark:border-white/[0.04]">
                  <div className="flex items-center gap-2.5 flex-1 min-w-0">
                    <div className="w-6 h-6 rounded-[8px] bg-indigo-500/10 text-indigo-500 flex items-center justify-center shrink-0">
                      <Video className="w-3.5 h-3.5" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-neutral-400 block">
                        Meeting
                      </span>
                      <span className="text-xs text-indigo-600 dark:text-indigo-400 truncate block font-medium">
                        {event.meetingUrl}
                      </span>
                    </div>
                  </div>

                  <a
                    href={event.meetingUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="h-8 px-3 rounded-xl bg-indigo-500 text-white hover:bg-indigo-600 text-xs font-semibold flex items-center gap-1.5 transition-all active:scale-95 shadow-2xs shrink-0"
                  >
                    <span>Join</span>
                    <ExternalLink className="w-3 h-3" />
                  </a>
                </div>
              )}

            </div>

            {/* Retention Notice (if expiring soon) */}
            {autoDeleteInfo.noticeMessage && (
              <div className="p-3 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-start gap-2.5 text-amber-800 dark:text-amber-300">
                <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
                <p className="text-[11px] leading-relaxed">
                  {autoDeleteInfo.noticeMessage}
                </p>
              </div>
            )}

            {/* Description & Rich Notes */}
            <div className="space-y-1.5">
              <span className="text-[11px] font-bold uppercase tracking-wider text-neutral-400 block pl-1">
                Notes & Description
              </span>

              {event.description && event.description.trim() ? (
                <div className="p-4 rounded-2xl bg-black/[0.02] dark:bg-white/[0.03] border border-black/[0.05] dark:border-white/[0.06] max-h-[220px] overflow-y-auto">
                  <FormattedNoteContent content={event.description} />
                </div>
              ) : (
                <div className="p-4 rounded-2xl bg-black/[0.015] dark:bg-white/[0.02] border border-dashed border-black/[0.06] dark:border-white/[0.08] text-center text-neutral-400 italic text-xs">
                  No notes or description provided.
                </div>
              )}
            </div>

            {/* Metadata Timestamps */}
            {(event.createdAt || event.updatedAt) && (
              <div className="pt-2 border-t border-black/[0.04] dark:border-white/[0.04] flex items-center justify-between text-[10px] text-neutral-400">
                {event.createdAt && (
                  <span>Created {format(parseISO(event.createdAt), 'MMM d, yyyy')}</span>
                )}
                {event.updatedAt && (
                  <span>Updated {format(parseISO(event.updatedAt), 'MMM d, h:mm a')}</span>
                )}
              </div>
            )}

          </div>

          {/* Footer Actions */}
          <div className="flex items-center justify-between px-6 py-3.5 border-t border-black/[0.06] dark:border-white/[0.08] bg-black/[0.015] dark:bg-white/[0.02]">
            {/* Delete Button */}
            <button
              type="button"
              onClick={() => setShowDeleteConfirm(true)}
              className="h-8 px-3 rounded-xl text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/30 text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Delete</span>
            </button>

            {/* Right Buttons: Close & Edit */}
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onClose}
                className="ios-btn-tinted h-8 px-3.5 text-xs font-semibold rounded-xl transition-all cursor-pointer min-h-[32px]"
              >
                Close
              </button>

              <button
                type="button"
                onClick={() => {
                  onClose();
                  onEdit(event);
                }}
                className="ios-btn-filled h-8 px-4 text-xs font-semibold text-white bg-[#007aff] hover:bg-[#0071e3] dark:bg-[#0a84ff] rounded-xl shadow-xs transition-all active:scale-[0.98] cursor-pointer flex items-center gap-1.5 min-h-[32px]"
              >
                <Edit3 className="w-3.5 h-3.5" />
                <span>Edit</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && (
        <ConfirmModal
          isOpen={showDeleteConfirm}
          title="Delete Event"
          message={`Are you sure you want to delete "${event.title}"? This cannot be undone.`}
          confirmText="Delete"
          cancelText="Keep"
          isDanger={true}
          onConfirm={handleDelete}
          onClose={() => setShowDeleteConfirm(false)}
        />
      )}
    </>
  );
};
