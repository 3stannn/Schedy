import React, { useState, useEffect } from 'react';
import type { Announcement, AnnouncementPriority } from '../../types/announcement';
import { X, AlertTriangle, Pin, Layers, Tag, User, Calendar, Megaphone, Sparkles, Lock, Eye, EyeOff } from 'lucide-react';
import { verifyDevPassword } from '../../services/announcementService';

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
  const [title, setTitle] = useState(initialAnnouncement?.title || '');
  const [content, setContent] = useState(initialAnnouncement?.content || '');
  const [priority, setPriority] = useState<AnnouncementPriority>(initialAnnouncement?.priority || 'important');
  const [category, setCategory] = useState(initialAnnouncement?.category || 'general');
  const [isPinned, setIsPinned] = useState(initialAnnouncement?.isPinned ?? false);
  const [expiresAt, setExpiresAt] = useState(
    initialAnnouncement?.expiresAt ? initialAnnouncement.expiresAt.slice(0, 16) : ''
  );
  const [authorName, setAuthorName] = useState(initialAnnouncement?.authorName || 'Admin');
  const [devPassword, setDevPassword] = useState('');
  const [showDevPassword, setShowDevPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen) return;
    if (initialAnnouncement) {
      setTitle(initialAnnouncement.title);
      setContent(initialAnnouncement.content);
      setPriority(initialAnnouncement.priority);
      setCategory(initialAnnouncement.category);
      setIsPinned(initialAnnouncement.isPinned);
      setExpiresAt(initialAnnouncement.expiresAt ? initialAnnouncement.expiresAt.slice(0, 16) : '');
      setAuthorName(initialAnnouncement.authorName);
      setDevPassword('');
    } else {
      setTitle('');
      setContent('');
      setPriority('important');
      setCategory('general');
      setIsPinned(false);
      setExpiresAt('');
      setAuthorName('Admin');
      setDevPassword('');
    }
  }, [isOpen, initialAnnouncement]);

  if (!isOpen) return null;

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

    if (priority === 'dev') {
      if (!devPassword) {
        setError('Developer password is required to broadcast globally.');
        return;
      }
      if (!verifyDevPassword(devPassword)) {
        setError('Incorrect Developer Password. Access denied.');
        return;
      }
    }

    const payload = {
      ...(initialAnnouncement ? { id: initialAnnouncement.id } : {}),
      title: title.trim(),
      content: content.trim(),
      priority,
      category: category.trim() || (priority === 'dev' ? 'developer' : 'general'),
      isPinned: priority === 'dev' ? true : isPinned,
      expiresAt: expiresAt ? new Date(expiresAt).toISOString() : null,
      authorName: authorName.trim() || (priority === 'dev' ? 'Developer' : 'Admin'),
    };

    onSave(payload);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/50 backdrop-blur-sm animate-fade-in">
      <div className="bg-white/95 dark:bg-[#161619]/95 backdrop-blur-2xl rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto border border-neutral-200/80 dark:border-neutral-800/80 shadow-2xl transition-all text-[#1c1917] dark:text-[#f4f4f5]">

        {/* Header */}
        <div className="flex items-center justify-between px-4 sm:px-6 py-3.5 sm:py-4 border-b border-neutral-100 dark:border-neutral-800/80 text-xs">
          <div className="flex items-center gap-2.5">
            <div className={`w-7 h-7 rounded-xl flex items-center justify-center ${priority === 'dev'
                ? 'bg-purple-500/10 text-purple-600 dark:text-purple-400'
                : 'bg-amber-500/10 text-amber-500'
              }`}>
              {priority === 'dev' ? <Sparkles className="w-4 h-4 shrink-0" /> : <Megaphone className="w-4 h-4 shrink-0" />}
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

          {priority === 'dev' && (
            <div className="p-3.5 space-y-2.5 bg-purple-50/80 dark:bg-purple-950/40 rounded-xl border border-purple-200 dark:border-purple-800 text-xs">
              <div className="flex items-center gap-2 text-purple-900 dark:text-purple-200 font-semibold">
                <Lock className="w-4 h-4 text-purple-600 dark:text-purple-400 shrink-0" />
                <span>Universal Dev Broadcast Authorization</span>
              </div>
              <p className="text-[11px] text-purple-800/80 dark:text-purple-300/80">
                This announcement will be transmitted globally to all users worldwide in real-time. Please enter your developer password to authorize.
              </p>
              <div>
                <label className="block text-[11px] font-bold text-purple-900 dark:text-purple-200 uppercase tracking-wider mb-1">
                  Developer Password *
                </label>
                <div className="relative">
                  <input
                    type={showDevPassword ? 'text' : 'password'}
                    value={devPassword}
                    onChange={e => {
                      setDevPassword(e.target.value);
                      if (error) setError(null);
                    }}
                    placeholder="Enter Developer Password..."
                    className="w-full pl-3 pr-10 py-2 rounded-xl text-xs bg-white dark:bg-neutral-900 border border-purple-300 dark:border-purple-700 text-neutral-900 dark:text-white outline-none focus:ring-2 focus:ring-purple-500 font-mono shadow-2xs"
                  />
                  <button
                    type="button"
                    onClick={() => setShowDevPassword(!showDevPassword)}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200 p-1"
                    tabIndex={-1}
                  >
                    {showDevPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                  </button>
                </div>
              </div>
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
                className={`px-2.5 py-1 rounded text-xs border-none outline-none focus:ring-1 cursor-pointer font-semibold ${priority === 'dev'
                    ? 'bg-purple-100 dark:bg-purple-950/70 text-purple-700 dark:text-purple-300 focus:ring-purple-500'
                    : 'bg-neutral-100 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300 focus:ring-neutral-400'
                  }`}
              >
                <option value="important">Important (Client-Side)</option>
                <option value="dev">Dev Announcement (Universal Broadcast)</option>
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
                placeholder={priority === 'dev' ? 'developer' : 'general'}
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
                placeholder={priority === 'dev' ? 'Developer' : 'Admin'}
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
              className={`px-3.5 py-1 text-xs font-semibold text-white rounded-lg shadow-xs transition-all active:scale-95 flex items-center gap-1.5 ${priority === 'dev'
                  ? 'bg-purple-600 hover:bg-purple-700'
                  : 'bg-[#2383e2] hover:bg-[#1a73e8]'
                }`}
            >
              {priority === 'dev' && <Sparkles className="w-3.5 h-3.5" />}
              <span>{initialAnnouncement ? 'Save' : (priority === 'dev' ? 'Broadcast Universally' : 'Publish')}</span>
            </button>
          </div>

        </form>
      </div>
    </div>
  );
};

