import React, { useState, useEffect } from 'react';
import type { Announcement, AnnouncementPriority } from '../../types/announcement';
import { X, AlertTriangle, Pin, Layers, Tag, User, Calendar, Megaphone } from 'lucide-react';

interface AnnouncementModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: any) => void;
  initialAnnouncement?: Announcement | null;
}

export const AnnouncementModal: React.FC<AnnouncementModalProps> = ({
  isOpen,
  onClose,
  onSave,
  initialAnnouncement,
}) => {
  if (!isOpen) return null;

  const [title, setTitle] = useState(initialAnnouncement?.title || '');
  const [content, setContent] = useState(initialAnnouncement?.content || '');
  const [priority, setPriority] = useState<AnnouncementPriority>(initialAnnouncement?.priority || 'important');
  const [category, setCategory] = useState(initialAnnouncement?.category || 'general');
  const [isPinned, setIsPinned] = useState(initialAnnouncement?.isPinned ?? false);
  const [expiresAt, setExpiresAt] = useState(
    initialAnnouncement?.expiresAt ? initialAnnouncement.expiresAt.slice(0, 16) : ''
  );
  const [authorName, setAuthorName] = useState(initialAnnouncement?.authorName || 'Admin');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (initialAnnouncement) {
      setTitle(initialAnnouncement.title);
      setContent(initialAnnouncement.content);
      setPriority(initialAnnouncement.priority);
      setCategory(initialAnnouncement.category);
      setIsPinned(initialAnnouncement.isPinned);
      setExpiresAt(initialAnnouncement.expiresAt ? initialAnnouncement.expiresAt.slice(0, 16) : '');
      setAuthorName(initialAnnouncement.authorName);
    } else {
      setTitle('');
      setContent('');
      setPriority('important');
      setCategory('general');
      setIsPinned(false);
      setExpiresAt('');
      setAuthorName('Admin');
    }
  }, [initialAnnouncement]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      setError('Announcement title is required.');
      return;
    }
    if (!content.trim()) {
      setError('Content body is required.');
      return;
    }

    onSave({
      ...(initialAnnouncement ? { id: initialAnnouncement.id } : {}),
      title: title.trim(),
      content: content.trim(),
      priority,
      category: category.trim() || 'general',
      isPinned,
      expiresAt: expiresAt ? new Date(expiresAt).toISOString() : null,
      authorName: authorName.trim() || 'Admin',
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/50 backdrop-blur-sm animate-fade-in">
      <div className="bg-white/95 dark:bg-[#161619]/95 backdrop-blur-2xl rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto border border-neutral-200/80 dark:border-neutral-800/80 shadow-2xl transition-all text-[#1c1917] dark:text-[#f4f4f5]">
        
        {/* Header */}
        <div className="flex items-center justify-between px-4 sm:px-6 py-3.5 sm:py-4 border-b border-neutral-100 dark:border-neutral-800/80 text-xs">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-xl bg-amber-500/10 text-amber-500 flex items-center justify-center">
              <Megaphone className="w-4 h-4 shrink-0" />
            </div>
            <span className="font-bold text-sm text-[#1c1917] dark:text-white">
              {initialAnnouncement ? 'Edit Announcement' : 'Broadcast Announcement'}
            </span>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-4 sm:p-7 space-y-5">
          {error && (
            <div className="flex items-center gap-2 p-3 text-xs text-rose-700 bg-rose-50 dark:bg-rose-950/40 dark:text-rose-300 rounded-lg border border-rose-200 dark:border-rose-900">
              <AlertTriangle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Title */}
          <div>
            <input
              type="text"
              required
              autoFocus
              value={title}
              onChange={e => setTitle(e.target.value)}
              placeholder="Announcement Title"
              className="w-full text-2xl font-bold text-[#37352f] dark:text-[#e6e6e6] placeholder-neutral-300 dark:placeholder-neutral-600 bg-transparent border-none outline-none focus:ring-0 p-0"
            />
          </div>

          {/* Properties */}
          <div className="space-y-2.5 pt-3 border-t border-neutral-100 dark:border-neutral-800 text-xs">
            
            {/* Priority */}
            <div className="flex items-center gap-3 py-1">
              <div className="w-32 flex items-center gap-2 text-neutral-400 shrink-0">
                <Layers className="w-3.5 h-3.5" />
                <span>Priority</span>
              </div>
              <select
                value={priority}
                onChange={e => setPriority(e.target.value as AnnouncementPriority)}
                className="px-2.5 py-1 rounded bg-neutral-100 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300 text-xs border-none outline-none focus:ring-1 focus:ring-neutral-400 cursor-pointer font-medium"
              >
                <option value="urgent">Urgent Notice</option>
                <option value="important">Important</option>
                <option value="notice">General Notice</option>
                <option value="general">Info / Update</option>
              </select>
            </div>

            {/* Category */}
            <div className="flex items-center gap-3 py-1">
              <div className="w-32 flex items-center gap-2 text-neutral-400 shrink-0">
                <Tag className="w-3.5 h-3.5" />
                <span>Category</span>
              </div>
              <input
                type="text"
                value={category}
                onChange={e => setCategory(e.target.value)}
                placeholder="general"
                className="flex-1 px-2 py-1 rounded bg-transparent hover:bg-neutral-50 dark:hover:bg-neutral-800/50 text-neutral-800 dark:text-neutral-200 text-xs border-none outline-none focus:bg-neutral-100 dark:focus:bg-neutral-800"
              />
            </div>

            {/* Author */}
            <div className="flex items-center gap-3 py-1">
              <div className="w-28 flex items-center gap-1.5 text-neutral-400 shrink-0">
                <User className="w-3.5 h-3.5" />
                <span>Author</span>
              </div>
              <input
                type="text"
                value={authorName}
                onChange={e => setAuthorName(e.target.value)}
                placeholder="Admin"
                className="flex-1 px-2 py-1 rounded bg-transparent hover:bg-neutral-50 dark:hover:bg-neutral-800/50 text-neutral-800 dark:text-neutral-200 text-xs border-none outline-none focus:bg-neutral-100 dark:focus:bg-neutral-800"
              />
            </div>

            {/* Expiration Date */}
            <div className="flex items-center gap-3 py-1">
              <div className="w-28 flex items-center gap-1.5 text-neutral-400 shrink-0">
                <Calendar className="w-3.5 h-3.5" />
                <span>Expires On</span>
              </div>
              <input
                type="date"
                value={expiresAt}
                onChange={e => setExpiresAt(e.target.value)}
                className="px-2 py-1 rounded bg-neutral-100 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300 text-xs border-none outline-none focus:ring-1 focus:ring-neutral-400"
              />
            </div>

            {/* Pin Toggle */}
            <div className="flex items-center gap-3 py-1">
              <div className="w-28 flex items-center gap-1.5 text-neutral-400 shrink-0">
                <Pin className="w-3.5 h-3.5" />
                <span>Pinned</span>
              </div>
              <label className="flex items-center gap-1.5 text-xs text-neutral-600 dark:text-neutral-300 cursor-pointer">
                <input
                  type="checkbox"
                  checked={isPinned}
                  onChange={e => setIsPinned(e.target.checked)}
                  className="rounded border-neutral-300 text-[#2383e2] focus:ring-0"
                />
                <span>Pin notice to top</span>
              </label>
            </div>

          </div>

          {/* Announcement Content */}
          <div className="pt-3 border-t border-neutral-100 dark:border-neutral-800">
            <textarea
              required
              rows={4}
              value={content}
              onChange={e => setContent(e.target.value)}
              placeholder="Write announcement body, instructions, or details..."
              className="w-full text-xs text-neutral-700 dark:text-neutral-300 placeholder-neutral-400 dark:placeholder-neutral-500 bg-transparent border-none outline-none p-0 resize-y"
            />
          </div>

          {/* Footer Actions */}
          <div className="flex items-center justify-end gap-2 pt-3 border-t border-neutral-100 dark:border-neutral-800">
            <button
              type="button"
              onClick={onClose}
              className="px-2.5 py-1 text-xs text-neutral-500 hover:text-neutral-800 dark:hover:text-neutral-200 hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-3 py-1 text-xs font-medium text-white bg-[#2383e2] hover:bg-[#1a73e8] rounded shadow-xs transition-colors"
            >
              {initialAnnouncement ? 'Save' : 'Publish'}
            </button>
          </div>

        </form>
      </div>
    </div>
  );
};
