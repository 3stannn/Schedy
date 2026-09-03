import React, { useState, useEffect } from 'react';
import type { Announcement, AnnouncementPriority } from '../../types/announcement';
import {
  X,
  AlertTriangle,
  Pin,
  Megaphone,
  Sparkles,
  Lock,
  Eye,
  EyeOff,
} from '../common/MovingIcon';
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
    setError(null);
  }, [isOpen, initialAnnouncement]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      setError('Title is required.');
      return;
    }
    if (!content.trim()) {
      setError('Content body is required.');
      return;
    }

    if (priority === 'dev') {
      if (!devPassword) {
        setError('Developer password is required for universal dev announcements.');
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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/50 backdrop-blur-xs animate-fade-in">
      <div className="bg-white dark:bg-[#18181b] rounded-2xl max-w-lg w-full max-h-[90vh] flex flex-col border border-neutral-200 dark:border-neutral-800 shadow-xl transition-all text-neutral-900 dark:text-neutral-100 overflow-hidden">
        
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-neutral-100 dark:border-neutral-800 text-xs shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl flex items-center justify-center bg-neutral-100 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300">
              {priority === 'dev' ? (
                <Sparkles className="w-4 h-4 text-purple-600 dark:text-purple-400" />
              ) : (
                <Megaphone className="w-4 h-4 text-neutral-700 dark:text-neutral-300" />
              )}
            </div>
            <div>
              <h3 className="font-bold text-sm text-neutral-900 dark:text-white">
                {initialAnnouncement ? 'Edit Announcement' : 'New Announcement'}
              </h3>
              <p className="text-[11px] text-neutral-500 dark:text-neutral-400">
                {priority === 'dev' ? 'Global universal announcement' : 'Workspace announcement'}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-5 space-y-4 text-xs">
          {error && (
            <div className="flex items-center gap-2 p-3 text-xs text-rose-700 bg-rose-50 dark:bg-rose-950/40 dark:text-rose-300 rounded-xl border border-rose-200 dark:border-rose-900">
              <AlertTriangle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Priority Type */}
          <div className="space-y-1.5">
            <label className="block text-[11px] font-semibold text-neutral-600 dark:text-neutral-400 uppercase tracking-wider">
              Type
            </label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setPriority('important')}
                className={`py-2 px-3 rounded-xl border text-xs font-semibold text-center transition-all cursor-pointer ${
                  priority === 'important'
                    ? 'border-neutral-900 dark:border-white bg-neutral-900 text-white dark:bg-white dark:text-neutral-950'
                    : 'border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-900/60 text-neutral-600 dark:text-neutral-400 hover:border-neutral-300 dark:hover:border-neutral-700'
                }`}
              >
                Standard Notice
              </button>

              <button
                type="button"
                onClick={() => setPriority('dev')}
                className={`py-2 px-3 rounded-xl border text-xs font-semibold text-center transition-all cursor-pointer ${
                  priority === 'dev'
                    ? 'border-purple-600 bg-purple-600 text-white dark:border-purple-500 dark:bg-purple-600'
                    : 'border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-900/60 text-neutral-600 dark:text-neutral-400 hover:border-neutral-300 dark:hover:border-neutral-700'
                }`}
              >
                Dev Announcement
              </button>
            </div>
          </div>

          {/* Dev Password Auth (Shown only for Dev Announcements) */}
          {priority === 'dev' && (
            <div className="p-3.5 rounded-xl bg-neutral-50 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 space-y-2">
              <div className="flex items-center gap-2 text-neutral-800 dark:text-neutral-200 font-semibold">
                <Lock className="w-3.5 h-3.5 text-purple-600 dark:text-purple-400" />
                <span>Developer Authorization</span>
              </div>
              <p className="text-[11px] text-neutral-500 dark:text-neutral-400">
                Universal announcements broadcast to all users. Enter the developer password to authorize:
              </p>
              <div className="relative">
                <input
                  type={showDevPassword ? 'text' : 'password'}
                  value={devPassword}
                  onChange={e => {
                    setDevPassword(e.target.value);
                    if (error) setError(null);
                  }}
                  placeholder="Enter developer password..."
                  className="w-full pl-3 pr-10 py-2 rounded-lg text-xs bg-white dark:bg-neutral-800 border border-neutral-300 dark:border-neutral-700 text-neutral-900 dark:text-white outline-none focus:border-neutral-500 font-mono"
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
          )}

          {/* Title */}
          <div className="space-y-1.5">
            <label className="block text-[11px] font-semibold text-neutral-600 dark:text-neutral-400 uppercase tracking-wider">
              Title *
            </label>
            <input
              type="text"
              required
              value={title}
              onChange={e => setTitle(e.target.value)}
              placeholder="Announcement title"
              className="w-full px-3 py-2 rounded-xl bg-neutral-50 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 text-neutral-900 dark:text-white text-xs outline-none focus:border-neutral-400 dark:focus:border-neutral-600"
            />
          </div>

          {/* Category & Author Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="block text-[11px] font-semibold text-neutral-600 dark:text-neutral-400 uppercase tracking-wider">
                Category
              </label>
              <input
                type="text"
                value={category}
                onChange={e => setCategory(e.target.value)}
                placeholder="general"
                className="w-full px-3 py-2 rounded-xl bg-neutral-50 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 text-neutral-900 dark:text-white text-xs outline-none focus:border-neutral-400 dark:focus:border-neutral-600"
              />
            </div>

            <div className="space-y-1.5">
              <label className="block text-[11px] font-semibold text-neutral-600 dark:text-neutral-400 uppercase tracking-wider">
                Author
              </label>
              <input
                type="text"
                value={authorName}
                onChange={e => setAuthorName(e.target.value)}
                placeholder={priority === 'dev' ? 'Developer' : 'Admin'}
                className="w-full px-3 py-2 rounded-xl bg-neutral-50 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 text-neutral-900 dark:text-white text-xs outline-none focus:border-neutral-400 dark:focus:border-neutral-600"
              />
            </div>
          </div>

          {/* Expiration Date & Pin Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="block text-[11px] font-semibold text-neutral-600 dark:text-neutral-400 uppercase tracking-wider">
                Expires On
              </label>
              <input
                type="date"
                value={expiresAt}
                onChange={e => setExpiresAt(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-neutral-50 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 text-neutral-900 dark:text-white text-xs outline-none focus:border-neutral-400 dark:focus:border-neutral-600 font-mono"
              />
            </div>

            <div className="space-y-1.5">
              <label className="block text-[11px] font-semibold text-neutral-600 dark:text-neutral-400 uppercase tracking-wider">
                Pin to Top
              </label>
              <label className="flex items-center gap-2 px-3 py-2 rounded-xl bg-neutral-50 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 cursor-pointer text-xs text-neutral-700 dark:text-neutral-300">
                <input
                  type="checkbox"
                  checked={isPinned}
                  onChange={e => setIsPinned(e.target.checked)}
                  className="rounded border-neutral-300 text-neutral-900 focus:ring-0"
                />
                <Pin className="w-3.5 h-3.5 text-neutral-500" />
                <span>Pin notice</span>
              </label>
            </div>
          </div>

          {/* Content */}
          <div className="space-y-1.5">
            <label className="block text-[11px] font-semibold text-neutral-600 dark:text-neutral-400 uppercase tracking-wider">
              Content *
            </label>
            <textarea
              required
              rows={4}
              value={content}
              onChange={e => setContent(e.target.value)}
              placeholder="Announcement text..."
              className="w-full px-3 py-2.5 rounded-xl bg-neutral-50 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 text-neutral-900 dark:text-white text-xs outline-none focus:border-neutral-400 dark:focus:border-neutral-600 resize-y leading-relaxed"
            />
          </div>

          {/* Footer Actions */}
          <div className="flex items-center justify-end gap-2 pt-3 border-t border-neutral-100 dark:border-neutral-800">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded-xl transition-colors cursor-pointer min-h-[38px]"
            >
              Cancel
            </button>
            <button
              type="submit"
              className={`px-5 py-2 text-xs font-semibold text-white rounded-xl transition-colors cursor-pointer min-h-[38px] active:scale-95 ${
                priority === 'dev'
                  ? 'bg-purple-600 hover:bg-purple-700'
                  : 'bg-neutral-900 hover:bg-neutral-800 dark:bg-white dark:text-neutral-950 dark:hover:bg-neutral-200'
              }`}
            >
              {initialAnnouncement ? 'Save Changes' : (priority === 'dev' ? 'Broadcast' : 'Publish')}
            </button>
          </div>
        </form>

      </div>
    </div>
  );
};
