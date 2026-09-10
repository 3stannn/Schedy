import React, { useState, useEffect, useRef } from 'react';
import type { ScheduleEvent, PriorityLevel, EventCategory, EventStatus, RecurrenceRule, ScheduleItemType } from '../../types/schedule';
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
} from '../common/MovingIcon';
import { format, addHours, parseISO } from 'date-fns';
import { ConfirmModal } from '../common/ConfirmModal';
import { RichTextEditor } from '../tasks/RichTextEditor';
import { getEventAutoDeleteInfo } from '../../utils/autoDeleteUtils';
import { CustomSelect } from '../common/CustomSelect';
import { CustomCheckbox } from '../common/CustomCheckbox';
import { CustomDateTimePicker } from '../common/CustomDateTimePicker';
import { useModalBehavior } from '../../hooks/useModalBehavior';
import { ModalDragHandle } from '../common/ModalDragHandle';
import { ModalFocusButton } from '../common/ModalFocusButton';


const ITEM_TYPE_OPTIONS = [
  { value: 'event', label: 'Event (Schedule)' },
  { value: 'task', label: 'Task (To-Do)' },
];

const CATEGORY_OPTIONS = [
  { value: 'work', label: 'Work' },
  { value: 'meeting', label: 'Meeting' },
  { value: 'deadline', label: 'Deadline' },
  { value: 'personal', label: 'Personal' },
  { value: 'education', label: 'Education' },
  { value: 'general', label: 'General' },
];

const PRIORITY_OPTIONS = [
  { value: 'low', label: 'Low' },
  { value: 'medium', label: 'Medium' },
  { value: 'high', label: 'High' },
  { value: 'urgent', label: 'Urgent' },
];

const STATUS_OPTIONS = [
  { value: 'pending', label: 'Pending' },
  { value: 'in_progress', label: 'In Progress' },
  { value: 'completed', label: 'Completed' },
  { value: 'cancelled', label: 'Cancelled' },
];

const RECURRENCE_OPTIONS = [
  { value: 'none', label: 'Does not repeat' },
  { value: 'daily', label: 'Daily' },
  { value: 'weekly', label: 'Weekly' },
  { value: 'monthly', label: 'Monthly' },
  { value: 'yearly', label: 'Yearly' },
];


interface EventModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (eventData: any) => void;
  onDelete?: (id: string) => void;
  initialEvent?: ScheduleEvent | null;
  selectedDate?: Date | null;
  initialStatus?: EventStatus;
  initialItemType?: ScheduleItemType;
}

export const EventModal: React.FC<EventModalProps> = ({
  isOpen,
  onClose,
  onSave,
  onDelete,
  initialEvent,
  selectedDate,
  initialStatus,
  initialItemType = 'event',
}) => {
  const [itemType, setItemType] = useState<ScheduleItemType>('event');
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

  const titleInputRef = useRef<HTMLInputElement>(null);
  const {
    modalRef,
    backdropRef,
    dragHandleProps,
    modalStyle,
    isDragging,
    isFocusMode,
    toggleFocusMode,
    handleBackdropClick,
    handleBackdropTouchMove,
  } = useModalBehavior({
    isOpen,
    onClose,
    initialFocusRef: titleInputRef,
  });

  useEffect(() => {
    if (!isOpen) return;

    if (initialEvent) {
      setItemType(initialEvent.itemType || 'event');
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
      setItemType(initialItemType || 'event');
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
  }, [initialEvent, selectedDate, initialStatus, initialItemType, isOpen]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      setError(itemType === 'task' ? 'Task title is required.' : 'Event title is required.');
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
      itemType,
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
    <div
      ref={backdropRef}
      onClick={handleBackdropClick}
      onTouchMove={handleBackdropTouchMove}
      className={`fixed inset-0 z-50 flex items-end sm:items-center justify-center transition-all ${
        isFocusMode
          ? 'bg-black/85 backdrop-blur-md p-0 sm:p-4 md:p-6'
          : 'bg-black/50 sm:bg-black/40 backdrop-blur-xs p-0 sm:p-4'
      } animate-fade-in`}
      role="dialog"
      aria-modal="true"
      aria-label={itemType === 'task' ? 'Task Details' : 'Event Details'}
    >
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
      <div
        ref={modalRef}
        style={modalStyle}
        onClick={e => e.stopPropagation()}
        className={`bg-white dark:bg-[#1c1c1e] flex flex-col border border-black/[0.08] dark:border-white/[0.12] shadow-2xl transition-all text-neutral-900 dark:text-neutral-100 overflow-hidden ${
          isFocusMode
            ? 'w-full h-full max-w-5xl rounded-none sm:rounded-[28px] max-h-none'
            : 'rounded-t-[28px] sm:rounded-[24px] max-w-3xl w-full max-h-[92vh]'
        }`}
      >

        {/* iOS Sheet Grab Handle for Mobile */}
        <ModalDragHandle dragHandleProps={dragHandleProps} isDragging={isDragging} />

        {/* iOS Modal Navigation Bar */}
        <div className="flex items-center justify-between px-4 sm:px-6 py-3 border-b border-black/[0.06] dark:border-white/[0.08] text-xs shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="text-xs font-medium text-[#007aff] dark:text-[#0a84ff] hover:opacity-80 transition-opacity cursor-pointer min-h-[32px] flex items-center"
          >
            Cancel
          </button>

          <div className="flex items-center gap-1.5 font-semibold text-xs text-neutral-900 dark:text-white">
            {itemType === 'task' ? (
              <CheckSquare className="w-3.5 h-3.5 text-[#007aff] dark:text-[#0a84ff]" />
            ) : (
              <Calendar className="w-3.5 h-3.5 text-[#007aff] dark:text-[#0a84ff]" />
            )}
            <span>
              {initialEvent
                ? (itemType === 'task' ? 'Edit Task' : 'Edit Event')
                : (itemType === 'task' ? 'New Task' : 'New Event')}
            </span>
          </div>

          <div className="flex items-center gap-1.5 sm:gap-2">
            <ModalFocusButton isFocusMode={isFocusMode} onToggle={toggleFocusMode} />
            {initialEvent && onDelete && (
              <button
                type="button"
                onClick={() => setShowDeleteConfirm(true)}
                className="p-1.5 rounded-full text-neutral-400 hover:text-[#ff3b30] hover:bg-black/5 dark:hover:bg-white/10 transition-colors cursor-pointer"
                title={itemType === 'task' ? 'Delete task' : 'Delete event'}
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            )}
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 rounded-full text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200 hover:bg-black/5 dark:hover:bg-white/10 transition-colors cursor-pointer"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4 sm:space-y-5 no-scrollbar">
          {error && (
            <div className="flex items-center gap-2 p-3 text-xs text-rose-700 bg-rose-50 dark:bg-rose-950/40 dark:text-rose-300 rounded-lg border border-rose-200 dark:border-rose-900">
              <AlertTriangle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Item Type Segmented Selector */}
          <div className="flex items-center justify-between gap-3">
            <div className="inline-flex p-1 rounded-2xl bg-black/[0.04] dark:bg-white/[0.06] border border-black/[0.06] dark:border-white/[0.08]">
              <button
                type="button"
                onClick={() => setItemType('event')}
                className={`flex items-center gap-2 px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                  itemType === 'event'
                    ? 'bg-white dark:bg-[#2c2c2e] text-[#007aff] dark:text-[#0a84ff] shadow-sm'
                    : 'text-neutral-500 hover:text-neutral-800 dark:hover:text-neutral-200'
                }`}
              >
                <Calendar className="w-3.5 h-3.5" />
                <span>Event</span>
              </button>
              <button
                type="button"
                onClick={() => setItemType('task')}
                className={`flex items-center gap-2 px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                  itemType === 'task'
                    ? 'bg-white dark:bg-[#2c2c2e] text-[#007aff] dark:text-[#0a84ff] shadow-sm'
                    : 'text-neutral-500 hover:text-neutral-800 dark:hover:text-neutral-200'
                }`}
              >
                <CheckSquare className="w-3.5 h-3.5" />
                <span>Task</span>
              </button>
            </div>

            <span className="text-[11px] text-neutral-400 font-medium hidden sm:inline">
              {itemType === 'task' ? 'Actionable item or deadline' : 'Scheduled calendar event'}
            </span>
          </div>

          {/* Large Clean Notion Title */}
          <div>
            <input
              ref={titleInputRef}
              type="text"
              required
              autoFocus
              value={title}
              onChange={e => setTitle(e.target.value)}
              placeholder={itemType === 'task' ? 'Untitled Task' : 'Untitled Event'}
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

            {/* Type Property */}
            <div className="flex items-center gap-3 py-1">
              <div className="w-32 flex items-center gap-2 text-neutral-400 shrink-0">
                {itemType === 'task' ? <CheckSquare className="w-3.5 h-3.5" /> : <Calendar className="w-3.5 h-3.5" />}
                <span>Type</span>
              </div>
              <CustomSelect
                value={itemType}
                onChange={val => setItemType(val as ScheduleItemType)}
                options={ITEM_TYPE_OPTIONS}
                size="sm"
              />
            </div>

            {/* Category Property */}
            <div className="flex items-center gap-3 py-1">
              <div className="w-32 flex items-center gap-2 text-neutral-400 shrink-0">
                <Tag className="w-3.5 h-3.5" />
                <span>Category</span>
              </div>
              <CustomSelect
                value={category}
                onChange={val => setCategory(val as EventCategory)}
                options={CATEGORY_OPTIONS}
                size="sm"
              />
            </div>

            {/* Priority Property */}
            <div className="flex items-center gap-3 py-1">
              <div className="w-32 flex items-center gap-2 text-neutral-400 shrink-0">
                <Layers className="w-3.5 h-3.5" />
                <span>Priority</span>
              </div>
              <CustomSelect
                value={priority}
                onChange={val => setPriority(val as PriorityLevel)}
                options={PRIORITY_OPTIONS}
                size="sm"
              />
            </div>

            {/* Status Property */}
            <div className="flex items-center gap-3 py-1">
              <div className="w-32 flex items-center gap-2 text-neutral-400 shrink-0">
                <CheckSquare className="w-3.5 h-3.5" />
                <span>Status</span>
              </div>
              <CustomSelect
                value={status}
                onChange={val => setStatus(val as EventStatus)}
                options={STATUS_OPTIONS}
                size="sm"
              />
            </div>

            {/* Time / Date Property */}
            <div className="flex flex-col sm:flex-row sm:items-start gap-1.5 sm:gap-3 py-1">
              <div className="w-32 flex items-center gap-2 text-neutral-400 shrink-0 sm:pt-1.5">
                <Clock className="w-3.5 h-3.5" />
                <span>{itemType === 'task' ? 'Due / Schedule' : 'Date & Time'}</span>
              </div>
              <div className="flex-1 space-y-1.5 min-w-0">
                <div className="flex items-center gap-1.5 sm:gap-2 w-full">
                  <CustomDateTimePicker
                    className="flex-1 min-w-0"
                    value={startTime}
                    mode={isAllDay ? 'date' : 'datetime'}
                    onChange={val => {
                      setStartTime(isAllDay ? `${val}T00:00` : val);
                      if (itemType === 'task') {
                        setEndTime(isAllDay ? `${val}T23:59` : addHours(parseISO(val), 1).toISOString().slice(0, 16));
                      }
                    }}
                  />
                  <span className="text-neutral-400 text-xs shrink-0">→</span>
                  <CustomDateTimePicker
                    className="flex-1 min-w-0"
                    value={endTime}
                    mode={isAllDay ? 'date' : 'datetime'}
                    onChange={val => {
                      setEndTime(isAllDay ? `${val}T23:59` : val);
                    }}
                  />
                </div>

                <CustomCheckbox
                  checked={isAllDay}
                  onChange={setIsAllDay}
                  label="All-day event"
                  size="sm"
                  className="pt-1"
                />
              </div>
            </div>

            {/* Recurrence Property */}
            <div className="flex items-center gap-3 py-1">
              <div className="w-32 flex items-center gap-2 text-neutral-400 shrink-0">
                <Repeat className="w-3.5 h-3.5" />
                <span>Repeat</span>
              </div>
              <CustomSelect
                value={recurrenceRule}
                onChange={val => setRecurrenceRule(val as RecurrenceRule)}
                options={RECURRENCE_OPTIONS}
                size="sm"
              />
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
          <div className="pt-4 border-t border-neutral-100 dark:border-neutral-800 flex flex-col min-h-[300px] sm:min-h-[360px]">
            <label className="block text-xs font-semibold text-neutral-600 dark:text-neutral-300 mb-2">
              Notes & Description
            </label>
            <RichTextEditor
              key={initialEvent?.id || 'new-event'}
              initialHtml={description}
              onChange={setDescription}
              placeholder="Add rich notes, agenda, checklist, or event details..."
              className="min-h-[260px] sm:min-h-[320px]"
            />
          </div>

          {/* Footer Actions */}
          <div className="flex items-center justify-end gap-3 pt-4 border-t border-black/[0.06] dark:border-white/[0.08]">
            <button
              type="button"
              onClick={onClose}
              className="ios-btn-tinted px-3.5 py-1 text-xs font-semibold rounded-xl transition-all cursor-pointer min-h-[32px] h-8"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="ios-btn-filled px-4.5 py-1 text-xs font-semibold text-white bg-[#007aff] hover:bg-[#0071e3] dark:bg-[#0a84ff] rounded-xl shadow-xs transition-all active:scale-[0.98] cursor-pointer min-h-[32px] h-8"
            >
              {initialEvent
                ? 'Save Changes'
                : itemType === 'task'
                ? 'Create Task'
                : 'Create Event'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
