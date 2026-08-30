import React, { useState } from 'react';
import type { ScheduleEvent, PriorityLevel, EventCategory, EventStatus } from '../../types/schedule';
import { 
  Clock, 
  MapPin, 
  Video, 
  Repeat, 
  Edit3, 
  Trash2, 
  CheckSquare, 
  Square
} from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { ConfirmModal } from '../common/ConfirmModal';

interface EventCardProps {
  event: ScheduleEvent;
  isAdmin: boolean;
  onEdit: (event: ScheduleEvent) => void;
  onDelete: (id: string) => void;
  onStatusChange: (event: ScheduleEvent, status: EventStatus) => void;
}

const priorityColors: Record<PriorityLevel, { tag: string }> = {
  low: { tag: 'bg-[#f1f1ef] text-[#787774] dark:bg-[#2e2e2e] dark:text-[#9b9a97]' },
  medium: { tag: 'bg-[#e7f3f8] text-[#245e82] dark:bg-[#182937] dark:text-[#78b3dc]' },
  high: { tag: 'bg-[#fbf3db] text-[#89632a] dark:bg-[#392e1e] dark:text-[#dfab01]' },
  urgent: { tag: 'bg-[#fdebec] text-[#c4554d] dark:bg-[#3c1e1e] dark:text-[#e06c75]' },
};

const categoryLabels: Record<EventCategory, { label: string; tag: string }> = {
  work: { label: 'Work', tag: 'bg-[#e8deee] text-[#6940a5] dark:bg-[#2b1e3a] dark:text-[#b89bdb]' },
  meeting: { label: 'Meeting', tag: 'bg-[#e7f3f8] text-[#245e82] dark:bg-[#182937] dark:text-[#78b3dc]' },
  deadline: { label: 'Deadline', tag: 'bg-[#fdebec] text-[#c4554d] dark:bg-[#3c1e1e] dark:text-[#e06c75]' },
  personal: { label: 'Personal', tag: 'bg-[#edf3ec] text-[#3b6e4c] dark:bg-[#1e2b20] dark:text-[#7ab089]' },
  education: { label: 'Education', tag: 'bg-[#fbf3db] text-[#89632a] dark:bg-[#392e1e] dark:text-[#dfab01]' },
  general: { label: 'General', tag: 'bg-[#f1f1ef] text-[#787774] dark:bg-[#2e2e2e] dark:text-[#9b9a97]' },
};

export const EventCard: React.FC<EventCardProps> = ({
  event,
  isAdmin,
  onEdit,
  onDelete,
  onStatusChange,
}) => {
  const [showConfirmDelete, setShowConfirmDelete] = useState(false);
  const isCompleted = event.status === 'completed';
  const start = parseISO(event.startTime);
  const end = parseISO(event.endTime);

  const formattedTime = event.isAllDay
    ? 'All Day'
    : `${format(start, 'h:mm a')} - ${format(end, 'h:mm a')}`;

  const category = categoryLabels[event.category] || categoryLabels.general;
  const priority = priorityColors[event.priority] || priorityColors.medium;

  return (
    <>
      {showConfirmDelete && (
        <ConfirmModal
          isOpen={showConfirmDelete}
          onClose={() => setShowConfirmDelete(false)}
          onConfirm={() => onDelete(event.id)}
          title="Delete Event"
          message={`Delete "${event.title}"? This action cannot be undone.`}
        />
      )}

      <div
        className={`group relative rounded-2xl border border-neutral-200/80 dark:border-neutral-800/80 bg-white/80 dark:bg-[#161619]/80 backdrop-blur-sm hover:border-neutral-300 dark:hover:border-neutral-700 hover:-translate-y-0.5 shadow-2xs hover:shadow-xs transition-all p-4 text-[#1c1917] dark:text-[#f4f4f5] ${
          isCompleted ? 'opacity-60 bg-neutral-50/50 dark:bg-neutral-900/30' : ''
        }`}
      >
        <div className="flex items-start justify-between gap-3">
          {/* Left Checkbox & Content */}
          <div className="flex items-start gap-3 flex-1 min-w-0">
            <button
              onClick={() => onStatusChange(event, isCompleted ? 'pending' : 'completed')}
              className="mt-0.5 text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200 transition-colors shrink-0 active:scale-90"
              title={isCompleted ? 'Mark incomplete' : 'Mark complete'}
            >
              {isCompleted ? (
                <CheckSquare className="w-4 h-4 text-[#2383e2]" />
              ) : (
                <Square className="w-4 h-4" />
              )}
            </button>

            <div className="flex-1 min-w-0">
              {/* Title & Tags */}
              <div className="flex items-center gap-1.5 flex-wrap mb-1.5">
                <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-md tracking-tight ${category.tag}`}>
                  {category.label}
                </span>
                <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-md capitalize tracking-tight ${priority.tag}`}>
                  {event.priority}
                </span>
                {event.recurrenceRule !== 'none' && (
                  <span className="flex items-center gap-1 text-[10px] font-medium text-neutral-500 dark:text-neutral-400 bg-neutral-100 dark:bg-neutral-800 px-2 py-0.5 rounded-md">
                    <Repeat className="w-2.5 h-2.5" />
                    <span className="capitalize">{event.recurrenceRule}</span>
                  </span>
                )}
              </div>

              <h4 className={`text-sm font-bold leading-snug break-words ${isCompleted ? 'line-through text-neutral-400 dark:text-neutral-500' : 'text-[#1c1917] dark:text-white'}`}>
                {event.title}
              </h4>

              {event.description && (
                <p className="mt-1 text-xs text-neutral-500 dark:text-neutral-400 leading-relaxed line-clamp-2 font-normal">
                  {event.description}
                </p>
              )}

              {/* Time & metadata */}
              <div className="mt-2.5 flex items-center gap-3 text-xs text-neutral-400 dark:text-neutral-500 flex-wrap font-medium">
                <span className="flex items-center gap-1">
                  <Clock className="w-3.5 h-3.5" />
                  <span>{format(start, 'MMM d, yyyy')} • {formattedTime}</span>
                </span>

                {event.location && (
                  <span className="flex items-center gap-1 truncate max-w-[180px]" title={event.location}>
                    <MapPin className="w-3.5 h-3.5 shrink-0" />
                    <span className="truncate">{event.location}</span>
                  </span>
                )}

                {event.meetingUrl && (
                  <a
                    href={event.meetingUrl.startsWith('http') ? event.meetingUrl : `https://${event.meetingUrl}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1 text-blue-600 dark:text-blue-400 hover:underline shrink-0 font-semibold"
                  >
                    <Video className="w-3.5 h-3.5" />
                    <span>Join</span>
                  </a>
                )}
              </div>
            </div>
          </div>

          {/* Right Action Menu for Admins */}
          {isAdmin && (
            <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
              <button
                onClick={() => onEdit(event)}
                className="p-1.5 text-neutral-400 hover:text-neutral-800 dark:hover:text-neutral-100 hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded-lg transition-colors"
                title="Edit event"
              >
                <Edit3 className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={() => setShowConfirmDelete(true)}
                className="p-1.5 text-neutral-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/30 rounded-lg transition-colors"
                title="Delete event"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          )}
        </div>
      </div>
    </>
  );
};
