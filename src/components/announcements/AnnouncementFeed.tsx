import React, { useState, useMemo } from 'react';
import type { Announcement, AnnouncementPriority } from '../../types/announcement';
import { 
  Megaphone, 
  Pin, 
  Search, 
  CheckSquare, 
  Square, 
  Edit3, 
  Trash2, 
  Clock, 
  User, 
  Plus,
  AlertTriangle,
  Bell,
  Info
} from 'lucide-react';
import { parseISO, formatDistanceToNow } from 'date-fns';
import { ConfirmModal } from '../common/ConfirmModal';

interface AnnouncementFeedProps {
  announcements: Announcement[];
  isAdmin: boolean;
  onAcknowledge: (id: string) => void;
  onEdit: (anno: Announcement) => void;
  onDelete: (id: string) => void;
  onAddNew: () => void;
}

const priorityStyles: Record<AnnouncementPriority, { bg: string; border: string; tag: string }> = {
  urgent: {
    bg: 'bg-[#fdebec] dark:bg-[#2e1c1c]',
    border: 'border-[#f5c2c5] dark:border-[#4d2828]',
    tag: 'bg-[#fdebec] text-[#c4554d] dark:bg-[#3c1e1e] dark:text-[#e06c75]',
  },
  important: {
    bg: 'bg-[#fbf3db] dark:bg-[#2d2516]',
    border: 'border-[#f5df9e] dark:border-[#473b1f]',
    tag: 'bg-[#fbf3db] text-[#89632a] dark:bg-[#392e1e] dark:text-[#dfab01]',
  },
  notice: {
    bg: 'bg-[#e7f3f8] dark:bg-[#182632]',
    border: 'border-[#bcdbec] dark:border-[#22394c]',
    tag: 'bg-[#e7f3f8] text-[#245e82] dark:bg-[#182937] dark:text-[#78b3dc]',
  },
  general: {
    bg: 'bg-[#f7f6f3] dark:bg-[#202020]',
    border: 'border-[#e9e9e7] dark:border-[#2e2e2e]',
    tag: 'bg-[#f1f1ef] text-[#787774] dark:bg-[#2e2e2e] dark:text-[#9b9a97]',
  },
};

const getPriorityIcon = (priority?: AnnouncementPriority) => {
  switch (priority) {
    case 'urgent': return <AlertTriangle className="w-4 h-4 text-rose-600 dark:text-rose-400" />;
    case 'important': return <AlertTriangle className="w-4 h-4 text-amber-600 dark:text-amber-400" />;
    case 'notice': return <Bell className="w-4 h-4 text-blue-600 dark:text-blue-400" />;
    default: return <Info className="w-4 h-4 text-neutral-500 dark:text-neutral-400" />;
  }
};

const formatTimeAgo = (dateStr?: string) => {
  if (!dateStr) return 'Recently';
  try {
    const d = parseISO(dateStr);
    if (isNaN(d.getTime())) return 'Recently';
    return formatDistanceToNow(d, { addSuffix: true });
  } catch {
    return 'Recently';
  }
};

export const AnnouncementFeed: React.FC<AnnouncementFeedProps> = ({
  announcements = [],
  isAdmin,
  onAcknowledge,
  onEdit,
  onDelete,
  onAddNew,
}) => {
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<'all' | 'unread' | 'pinned' | 'urgent'>('all');
  const [annoToDelete, setAnnoToDelete] = useState<Announcement | null>(null);

  const safeList = Array.isArray(announcements) ? announcements : [];

  const filteredAnnouncements = useMemo(() => {
    return safeList.filter(a => {
      if (!a) return false;
      const q = (search || '').toLowerCase();
      const title = (a.title || '').toLowerCase();
      const content = (a.content || '').toLowerCase();
      const author = (a.authorName || '').toLowerCase();
      const category = (a.category || '').toLowerCase();

      const matchSearch = !q ||
        title.includes(q) ||
        content.includes(q) ||
        author.includes(q) ||
        category.includes(q);

      let matchFilter = true;
      if (filter === 'unread') matchFilter = !a.isRead;
      else if (filter === 'pinned') matchFilter = !!a.isPinned;
      else if (filter === 'urgent') matchFilter = a.priority === 'urgent';

      return matchSearch && matchFilter;
    }).sort((a, b) => {
      if (!!a.isPinned !== !!b.isPinned) return a.isPinned ? -1 : 1;
      const timeA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
      const timeB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
      return timeB - timeA;
    });
  }, [safeList, search, filter]);

  const unreadCount = safeList.filter(a => a && !a.isRead).length;

  return (
    <>
      {annoToDelete && (
        <ConfirmModal
          isOpen={!!annoToDelete}
          onClose={() => setAnnoToDelete(null)}
          onConfirm={() => {
            onDelete(annoToDelete.id);
            setAnnoToDelete(null);
          }}
          title="Delete Announcement"
          message={`Delete announcement "${annoToDelete.title || 'Untitled'}"? This action cannot be undone.`}
        />
      )}

      <div className="space-y-4 text-[#1c1917] dark:text-[#f4f4f5]">
        
        {/* Controls Bar */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 p-3.5 bg-white/85 dark:bg-[#161619]/85 backdrop-blur-md rounded-2xl border border-neutral-200/80 dark:border-neutral-800/80 shadow-xs">
          {/* Search */}
          <div className="relative flex-1 max-w-sm">
            <Search className="w-3.5 h-3.5 text-neutral-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search bulletins..."
              className="w-full pl-9 pr-3 py-1.5 text-xs rounded-xl bg-neutral-100/70 dark:bg-neutral-900/70 border border-neutral-200/60 dark:border-neutral-800/60 text-[#1c1917] dark:text-[#f4f4f5] placeholder-neutral-400 outline-none focus:ring-1 focus:ring-[#2383e2] transition-all"
            />
          </div>

          {/* Filter Pills & Actions */}
          <div className="flex items-center gap-2 overflow-x-auto no-scrollbar">
            {/* Filter Pills */}
            <div className="flex items-center rounded-xl border border-neutral-200/60 dark:border-neutral-800 bg-neutral-100/60 dark:bg-neutral-900/60 p-0.5 text-xs overflow-x-auto shrink-0 shadow-2xs">
              <button
                onClick={() => setFilter('all')}
                className={`px-3 py-1 font-semibold rounded-lg transition-all whitespace-nowrap ${
                  filter === 'all'
                    ? 'bg-white dark:bg-[#202024] text-[#1c1917] dark:text-white shadow-xs'
                    : 'text-neutral-500 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white'
                }`}
              >
                All ({safeList.length})
              </button>

              <button
                onClick={() => setFilter('unread')}
                className={`px-3 py-1 font-semibold rounded-lg transition-all whitespace-nowrap ${
                  filter === 'unread'
                    ? 'bg-white dark:bg-[#202024] text-[#1c1917] dark:text-white shadow-xs'
                    : 'text-neutral-500 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white'
                }`}
              >
                Unread {unreadCount > 0 && `(${unreadCount})`}
              </button>

              <button
                onClick={() => setFilter('pinned')}
                className={`px-3 py-1 font-semibold rounded-lg transition-all whitespace-nowrap ${
                  filter === 'pinned'
                    ? 'bg-white dark:bg-[#202024] text-[#1c1917] dark:text-white shadow-xs'
                    : 'text-neutral-500 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white'
                }`}
              >
                Pinned
              </button>

              <button
                onClick={() => setFilter('urgent')}
                className={`px-3 py-1 font-semibold rounded-lg transition-all whitespace-nowrap ${
                  filter === 'urgent'
                    ? 'bg-white dark:bg-[#202024] text-[#1c1917] dark:text-white shadow-xs'
                    : 'text-neutral-500 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white'
                }`}
              >
                Urgent
              </button>
            </div>

            {isAdmin && (
              <button
                onClick={onAddNew}
                className="flex items-center justify-center gap-1 px-3 py-1.5 text-xs font-semibold text-white bg-[#2383e2] hover:bg-[#1a73e8] rounded-xl shadow-xs hover:shadow-md transition-all active:scale-95 shrink-0"
              >
                <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
                <span>Broadcast</span>
              </button>
            )}
          </div>
        </div>

        {/* Feed List */}
        {filteredAnnouncements.length === 0 ? (
          <div className="bg-white/85 dark:bg-[#161619]/85 backdrop-blur-md rounded-2xl border border-neutral-200/80 dark:border-neutral-800/80 p-12 text-center shadow-xs">
            <Megaphone className="w-8 h-8 text-neutral-300 dark:text-neutral-600 mx-auto mb-2 opacity-50" />
            <h4 className="text-xs font-bold text-neutral-700 dark:text-neutral-300">
              No announcements found
            </h4>
            <p className="text-[11px] text-neutral-400 mt-1 max-w-sm mx-auto font-medium">
              There are no announcements matching your current filters.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {filteredAnnouncements.map(anno => {
              const priorityKey = anno.priority || 'general';
              const style = priorityStyles[priorityKey] || priorityStyles.general;
              const timeAgo = formatTimeAgo(anno.createdAt);

              return (
                <div
                  key={anno.id}
                  className={`rounded-2xl border p-4.5 transition-all hover:-translate-y-0.5 shadow-2xs hover:shadow-xs relative group text-[#1c1917] dark:text-[#f4f4f5] ${
                    style.border
                  } ${style.bg} ${anno.isRead ? 'opacity-85' : ''}`}
                >
                  <div className="flex items-start gap-3">
                    {/* Priority Icon */}
                    <div className="shrink-0 mt-0.5">
                      {getPriorityIcon(anno.priority)}
                    </div>

                    <div className="flex-1 min-w-0">
                      {/* Top Row */}
                      <div className="flex items-center justify-between gap-2 mb-1 flex-wrap">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-md capitalize tracking-tight ${style.tag}`}>
                            {anno.priority || 'General'}
                          </span>

                          {anno.isPinned && (
                            <span className="flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-md bg-[#fbf3db] text-[#89632a] dark:bg-[#392e1e] dark:text-[#dfab01]">
                              <Pin className="w-2.5 h-2.5" />
                              <span>Pinned</span>
                            </span>
                          )}

                          {anno.category && (
                            <span className="text-[10px] font-medium text-neutral-500 dark:text-neutral-400 bg-neutral-100 dark:bg-neutral-800 px-2 py-0.5 rounded-md capitalize">
                              {anno.category}
                            </span>
                          )}

                          {!anno.isRead && (
                            <span className="w-2 h-2 rounded-full bg-rose-500 animate-pulse" title="Unread notice" />
                          )}
                        </div>

                        <div className="flex items-center gap-2">
                          <span className="text-[11px] text-neutral-400 flex items-center gap-1 font-medium">
                            <Clock className="w-3 h-3" />
                            <span>{timeAgo}</span>
                          </span>

                          {isAdmin && (
                            <div className="flex items-center gap-0.5 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity">
                              <button
                                onClick={() => onEdit(anno)}
                                className="p-1 rounded-lg text-neutral-400 hover:text-neutral-800 dark:hover:text-neutral-100 hover:bg-neutral-100 dark:hover:bg-neutral-800"
                                title="Edit"
                              >
                                <Edit3 className="w-3.5 h-3.5" />
                              </button>
                              <button
                                onClick={() => setAnnoToDelete(anno)}
                                className="p-1 rounded-lg text-neutral-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40"
                                title="Delete"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Title */}
                      <h3 className="text-sm font-bold leading-snug mb-1 text-[#1c1917] dark:text-white">
                        {anno.title}
                      </h3>

                      {/* Content */}
                      <p className="text-xs text-neutral-700 dark:text-neutral-300 leading-relaxed whitespace-pre-line font-normal">
                        {anno.content}
                      </p>

                      {/* Footer Row */}
                      <div className="mt-3 pt-2.5 border-t border-black/5 dark:border-white/5 flex items-center justify-between gap-2 text-xs">
                        <div className="flex items-center gap-1.5 text-neutral-400 text-[11px] font-medium">
                          <User className="w-3.5 h-3.5" />
                          <span>Posted by <strong className="text-neutral-700 dark:text-neutral-200">{anno.authorName || 'Admin'}</strong></span>
                        </div>

                        <button
                          onClick={() => onAcknowledge(anno.id)}
                          className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-semibold transition-all active:scale-95 ${
                            anno.isRead
                              ? 'text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-300'
                              : 'bg-[#2383e2] text-white hover:bg-[#1a73e8] shadow-xs'
                          }`}
                        >
                          {anno.isRead ? (
                            <>
                              <CheckSquare className="w-3.5 h-3.5 text-[#2383e2]" />
                              <span>Acknowledged</span>
                            </>
                          ) : (
                            <>
                              <Square className="w-3.5 h-3.5" />
                              <span>Mark as read</span>
                            </>
                          )}
                        </button>
                      </div>

                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

      </div>
    </>
  );
};
