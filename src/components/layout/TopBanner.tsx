import React from 'react';
import type { Announcement } from '../../types/announcement';
import { CheckCircle2, AlertTriangle } from 'lucide-react';

interface TopBannerProps {
  urgentAnnouncements: Announcement[];
  onAcknowledge: (id: string) => void;
  onOpenFeed: () => void;
}

export const TopBanner: React.FC<TopBannerProps> = ({
  urgentAnnouncements,
  onAcknowledge,
  onOpenFeed,
}) => {
  const unreadUrgent = urgentAnnouncements.filter(a => !a.isRead);
  if (unreadUrgent.length === 0) return null;

  const current = unreadUrgent[0];

  return (
    <div className="w-full bg-amber-500/10 dark:bg-amber-500/15 border-b border-amber-500/30 dark:border-amber-500/30 text-amber-900 dark:text-amber-200 px-4 sm:px-8 py-2 transition-all shadow-xs backdrop-blur-md">
      <div className="w-full flex items-center justify-between text-xs">
        <div className="flex items-center gap-2.5 overflow-hidden mr-3">
          <div className="w-5 h-5 rounded bg-amber-500/20 flex items-center justify-center shrink-0">
            <AlertTriangle className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
          </div>
          <div className="flex items-center gap-2 truncate">
            <span
              className="font-semibold underline underline-offset-2 truncate cursor-pointer hover:opacity-80"
              onClick={onOpenFeed}
            >
              {current.title}
            </span>
            <span className="opacity-75 truncate hidden sm:inline text-neutral-600 dark:text-neutral-300">
              — {current.content}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          {unreadUrgent.length > 1 && (
            <button
              onClick={onOpenFeed}
              className="text-neutral-600 dark:text-neutral-300 hover:text-neutral-900 dark:hover:text-white font-medium px-2 py-0.5 rounded hover:bg-black/5 dark:hover:bg-white/10 transition-colors text-[11px]"
            >
              +{unreadUrgent.length - 1} more
            </button>
          )}
          <button
            onClick={() => onAcknowledge(current.id)}
            className="flex items-center gap-1 font-semibold bg-amber-500/20 hover:bg-amber-500/30 text-amber-900 dark:text-amber-100 px-3 py-1 rounded transition-all active:scale-95 text-[11px]"
            title="Acknowledge and dismiss"
          >
            <CheckCircle2 className="w-3.5 h-3.5" />
            <span>Acknowledge</span>
          </button>
        </div>
      </div>
    </div>
  );
};

