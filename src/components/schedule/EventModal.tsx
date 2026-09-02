import React, { useState, useEffect } from 'react';
import type { ScheduleEvent, PriorityLevel, EventCategory, EventStatus, RecurrenceRule } from '../../types/schedule';
import {
  X,
  Trash2,
  MapPin,
  Video,
  AlertTriangle,
  Tag,
  Clock,
  Repeat,
  CheckSquare,
  Layers,
  Calendar
} from 'lucide-react';
import { format, addHours, parseISO } from 'date-fns';
import { ConfirmModal } from '../common/ConfirmModal';
import { RichTextEditor } from '../tasks/RichTextEditor';
import { getEventAutoDeleteInfo } from '../../utils/autoDeleteUtils';

interface EventModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (eventData: any) => void;
  onDelete?: (id: string) => void;
  initialEvent?: ScheduleEvent | null;
  selectedDate?: Date | null;
  initialStatus?: EventStatus;
}

export const EventModal: React.FC<EventModalProps> = ({
  isOpen,
  onClose,
  onSave,
  onDelete,
  initialEvent,
  selectedDate,
  initialStatus,
}) => {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [startTime, setStartTime] = useState('');
  const [endTime, setEndTime] = useState('');
  const [isAllDay, setIsAllDay] = useState(false);
  const [category, setCategory] = useState<EventCategory>('general');
  const [priority, setPriority] = useState<PriorityLevel>('medium');
  const [status, setStatus] = useState<EventStatus>('pending');
  const [location, setLocation] = useState('');
  const [meetingUrl, setMeetingUrl] = useState('');
  const [recurrenceRule, setRecurrenceRule] = useState<RecurrenceRule>('none');
  const [error, setError] = useState<string | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  useEffect(() => {
    if (!isOpen) return;

    if (initialEvent) {
      setTitle(initialEvent.title || '');
      setDescription(initialEvent.description || '');
      try {
        const parsedStart = parseISO(initialEvent.startTime);
        const parsedEnd = parseISO(initialEvent.endTime);
        setStartTime(format(parsedStart, "yyyy-MM-dd'T'HH:mm"));
        setEndTime(format(parsedEnd, "yyyy-MM-dd'T'HH:mm"));
      } catch {
        const start = new Date();
        setStartTime(format(start, "yyyy-MM-dd'T'HH:mm"));
        setEndTime(format(addHours(start, 1), "yyyy-MM-dd'T'HH:mm"));
      }
      setIsAllDay(!!initialEvent.isAllDay);
      setCategory(initialEvent.category || 'general');
      setPriority(initialEvent.priority || 'medium');
      setStatus(initialEvent.status || 'pending');
      setLocation(initialEvent.location || '');
      setMeetingUrl(initialEvent.meetingUrl || '');
      setRecurrenceRule(initialEvent.recurrenceRule || 'none');
    } else {
      const start = selectedDate || new Date();
      const end = addHours(start, 1);
      setTitle('');
      setDescription('');
      setStartTime(format(start, "yyyy-MM-dd'T'HH:mm"));
      setEndTime(format(end, "yyyy-MM-dd'T'HH:mm"));
      setIsAllDay(false);
      setCategory('general');
      setPriority('medium');
      setStatus(initialStatus || 'pending');
      setLocation('');
      setMeetingUrl('');
      setRecurrenceRule('none');
    }
    setError(null);
  }, [initialEvent, selectedDate, initialStatus, isOpen]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      setError('Event title is required.');
      return;
    }

    let startIso: string;
    let endIso: string;

    if (isAllDay) {
      const datePart = startTime.includes('T') ? startTime.split('T')[0] : startTime;
      const endDatePart = endTime.includes('T') ? endTime.split('T')[0] : (endTime || datePart);
      const s = new Date(`${datePart}T00:00:00`);
      const e = new Date(`${endDatePart}T23:59:59`);
      if (e < s) {
        setError('End date cannot be earlier than start date.');
        return;
      }
      startIso = s.toISOString();
      endIso = e.toISOString();
    } else {
      const s = new Date(startTime);
      const e = new Date(endTime);
      if (isNaN(s.getTime()) || isNaN(e.getTime())) {
        setError('Please provide valid start and end dates.');
        return;
      }
      if (e < s) {
        setError('End time cannot be earlier than start time.');
        return;
      }
      startIso = s.toISOString();
      endIso = e.toISOString();
    }

    onSave({
      ...(initialEvent ? { id: initialEvent.id } : {}),
      title: title.trim(),
      description: description.trim(),
      startTime: startIso,
      endTime: endIso,
      isAllDay,
      category,
      priority,
      status,
      location: location.trim(),
      meetingUrl: meetingUrl.trim(),
      recurrenceRule,
    });
    onClose();
  };

  const handleDelete = () => {
    if (!initialEvent || !onDelete) return;
    onDelete(initialEvent.id);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/50 backdrop-blur-sm animate-fade-in">
      {showDeleteConfirm && (
        <ConfirmModal
          isOpen={showDeleteConfirm}
          onClose={() => setShowDeleteConfirm(false)}
          onConfirm={() => {
            handleDelete();
            setShowDeleteConfirm(false);
          }}
          title="Delete Event"
          message={`Are you sure you want to delete "${initialEvent?.title}"? This action cannot be undone.`}
        />
      )}
      <div className="bg-white/95 dark:bg-[#161619]/95 backdrop-blur-2xl rounded-2xl max-w-3xl w-full max-h-[92vh] overflow-y-auto border border-neutral-200/80 dark:border-neutral-800/80 shadow-2xl transition-all text-[#1c1917] dark:text-[#f4f4f5]">

        {/* Notion-style Top Action Bar */}
        <div className="flex items-center justify-between px-4 sm:px-6 py-3.5 border-b border-neutral-100 dark:border-neutral-800 text-xs text-neutral-400">
          <div className="flex items-center gap-2 font-medium">
            <Calendar className="w-4 h-4 text-[#2383e2]" />
            <span className="font-semibold text-neutral-700 dark:text-neutral-300">
              {initialEvent ? 'Edit Event' : 'New Event'}
            </span>
          </div>

          <div className="flex items-center gap-1.5">
            {initialEvent && onDelete && (
              <button
                type="button"
                onClick={() => setShowDeleteConfirm(true)}
                className="p-1.5 rounded text-neutral-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors"
                title="Delete event"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            )}
            <button
              onClick={onClose}
              className="p-1.5 rounded text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Notion Page Body */}
        <form onSubmit={handleSubmit} className="p-4 sm:p-8 space-y-5">
          {error && (
            <div className="flex items-center gap-2 p-3 text-xs text-rose-700 bg-rose-50 dark:bg-rose-950/40 dark:text-rose-300 rounded-lg border border-rose-200 dark:border-rose-900">
              <AlertTriangle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Large Clean Notion Title */}
          <div>
            <input
              type="text"
              required
              autoFocus
              value={title}
              onChange={e => setTitle(e.target.value)}
              placeholder="Untitled Event"
              className="w-full text-2xl sm:text-3xl font-bold text-[#37352f] dark:text-[#e6e6e6] placeholder-neutral-300 dark:placeholder-neutral-600 bg-transparent border-none outline-none focus:ring-0 p-0 tracking-tight"
            />
          </div>

          {/* Auto-Deletion Notice Banner */}
          {initialEvent && (() => {
            const autoInfo = getEventAutoDeleteInfo(initialEvent);
            if (!autoInfo.isExpiringSoon || !autoInfo.noticeMessage) return null;
            return (
              <div className={`flex items-start gap-2.5 p-3 text-xs rounded-xl border ${autoInfo.badgeClass} animate-fade-in`}>
                <Clock className="w-4 h-4 shrink-0 mt-0.5" />
                <div className="flex-1 leading-relaxed">
                  <p className="font-semibold text-xs">{autoInfo.badgeText}</p>
                  <p className="text-[11px] opacity-90 mt-0.5">{autoInfo.noticeMessage}</p>
                </div>
              </div>
            );
          })()}

          {/* Notion Properties List */}
          <div className="space-y-2.5 pt-3 border-t border-neutral-100 dark:border-neutral-800 text-xs">

            {/* Category Property */}
            <div className="flex items-center gap-3 py-1">
              <div className="w-32 flex items-center gap-2 text-neutral-400 shrink-0">
                <Tag className="w-3.5 h-3.5" />
                <span>Category</span>
              </div>
              <select
                value={category}
                onChange={e => setCategory(e.target.value as EventCategory)}
                className="px-2.5 py-1 rounded bg-neutral-100 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300 text-xs border-none outline-none focus:ring-1 focus:ring-neutral-400 cursor-pointer font-medium"
              >
                <option value="work">Work</option>
                <option value="meeting">Meeting</option>
                <option value="deadline">Deadline</option>
                <option value="personal">Personal</option>
                <option value="education">Education</option>
                <option value="general">General</option>
              </select>
            </div>

            {/* Priority Property */}
            <div className="flex items-center gap-3 py-1">
              <div className="w-32 flex items-center gap-2 text-neutral-400 shrink-0">
                <Layers className="w-3.5 h-3.5" />
                <span>Priority</span>
              </div>
              <select
                value={priority}
                onChange={e => setPriority(e.target.value as PriorityLevel)}
                className="px-2.5 py-1 rounded bg-neutral-100 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300 text-xs border-none outline-none focus:ring-1 focus:ring-neutral-400 cursor-pointer font-medium"
              >
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
                <option value="urgent">Urgent</option>
              </select>
            </div>

            {/* Status Property */}
            <div className="flex items-center gap-3 py-1">
              <div className="w-32 flex items-center gap-2 text-neutral-400 shrink-0">
                <CheckSquare className="w-3.5 h-3.5" />
                <span>Status</span>
              </div>
              <select
                value={status}
                onChange={e => setStatus(e.target.value as EventStatus)}
                className="px-2.5 py-1 rounded bg-neutral-100 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300 text-xs border-none outline-none focus:ring-1 focus:ring-neutral-400 cursor-pointer font-medium"
              >
                <option value="pending">Pending</option>
                <option value="in_progress">In Progress</option>
                <option value="completed">Completed</option>
                <option value="cancelled">Cancelled</option>
              </select>
            </div>

            {/* Time / Date Property */}
            <div className="flex flex-col sm:flex-row sm:items-start gap-1.5 sm:gap-3 py-1">
              <div className="w-32 flex items-center gap-2 text-neutral-400 shrink-0 sm:pt-1.5">
                <Clock className="w-3.5 h-3.5" />
                <span>Date & Time</span>
              </div>
              <div className="flex-1 space-y-2">
                <div className="flex items-center gap-2 flex-wrap">
                  <input
                    type={isAllDay ? 'date' : 'datetime-local'}
                    value={isAllDay ? (startTime ? startTime.split('T')[0] : '') : (startTime || '')}
                    onChange={e => {
                      const val = e.target.value;
                      setStartTime(isAllDay ? `${val}T00:00` : val);
                    }}
                    className="px-2.5 py-1.5 rounded bg-neutral-100 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300 text-xs border-none outline-none focus:ring-1 focus:ring-neutral-400 font-mono"
                  />
                  <span className="text-neutral-400 text-xs">→</span>
                  <input
                    type={isAllDay ? 'date' : 'datetime-local'}
                    value={isAllDay ? (endTime ? endTime.split('T')[0] : '') : (endTime || '')}
                    onChange={e => {
                      const val = e.target.value;
                      setEndTime(isAllDay ? `${val}T23:59` : val);
                    }}
                    className="px-2.5 py-1.5 rounded bg-neutral-100 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300 text-xs border-none outline-none focus:ring-1 focus:ring-neutral-400 font-mono"
                  />
                </div>

                <label className="flex items-center gap-1.5 text-[11px] text-neutral-500 cursor-pointer pt-0.5">
                  <input
                    type="checkbox"
                    checked={isAllDay}
                    onChange={e => setIsAllDay(e.target.checked)}
                    className="rounded border-neutral-300 text-[#2383e2] focus:ring-0"
                  />
                  <span>All-day event</span>
                </label>
              </div>
            </div>

            {/* Recurrence Property */}
            <div className="flex items-center gap-3 py-1">
              <div className="w-32 flex items-center gap-2 text-neutral-400 shrink-0">
                <Repeat className="w-3.5 h-3.5" />
                <span>Repeat</span>
              </div>
              <select
                value={recurrenceRule}
                onChange={e => setRecurrenceRule(e.target.value as RecurrenceRule)}
                className="px-2.5 py-1 rounded bg-neutral-100 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300 text-xs border-none outline-none focus:ring-1 focus:ring-neutral-400 cursor-pointer font-medium"
              >
                <option value="none">Does not repeat</option>
                <option value="daily">Daily</option>
                <option value="weekly">Weekly</option>
                <option value="monthly">Monthly</option>
                <option value="yearly">Yearly</option>
              </select>
            </div>

            {/* Location */}
            <div className="flex items-center gap-3 py-1">
              <div className="w-32 flex items-center gap-2 text-neutral-400 shrink-0">
                <MapPin className="w-3.5 h-3.5" />
                <span>Location</span>
              </div>
              <input
                type="text"
                value={location}
                onChange={e => setLocation(e.target.value)}
                placeholder="Empty"
                className="flex-1 px-2.5 py-1.5 rounded bg-transparent hover:bg-neutral-50 dark:hover:bg-neutral-800/50 text-neutral-800 dark:text-neutral-200 text-xs border-none outline-none focus:bg-neutral-100 dark:focus:bg-neutral-800 transition-colors"
              />
            </div>

            {/* Meeting Link */}
            <div className="flex items-center gap-3 py-1">
              <div className="w-32 flex items-center gap-2 text-neutral-400 shrink-0">
                <Video className="w-3.5 h-3.5" />
                <span>Meeting Link</span>
              </div>
              <input
                type="url"
                value={meetingUrl}
                onChange={e => setMeetingUrl(e.target.value)}
                placeholder="https://..."
                className="flex-1 px-2.5 py-1.5 rounded bg-transparent hover:bg-neutral-50 dark:hover:bg-neutral-800/50 text-neutral-800 dark:text-neutral-200 text-xs border-none outline-none focus:bg-neutral-100 dark:focus:bg-neutral-800 text-blue-600 dark:text-blue-400 transition-colors"
              />
            </div>

          </div>

          {/* Notion Page Description / Rich Content */}
          <div className="pt-4 border-t border-neutral-100 dark:border-neutral-800 flex flex-col min-h-[220px]">
            <label className="block text-xs font-semibold text-neutral-600 dark:text-neutral-300 mb-2">
              Notes & Description
            </label>
            <RichTextEditor
              key={initialEvent?.id || 'new-event'}
              initialHtml={description}
              onChange={setDescription}
              placeholder="Add rich notes, agenda, checklist, or event details..."
              className="min-h-[180px]"
            />
          </div>

          {/* Footer Actions */}
          <div className="flex items-center justify-end gap-2.5 pt-4 border-t border-neutral-100 dark:border-neutral-800">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-1.5 text-xs font-medium text-neutral-600 dark:text-neutral-400 hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-5 py-1.5 text-xs font-medium text-white bg-[#2383e2] hover:bg-[#1a73e8] rounded shadow-xs transition-colors"
            >
              {initialEvent ? 'Save Changes' : 'Create Event'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
