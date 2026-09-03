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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-black/50 backdrop-blur-xs animate-fade-in">
      <div className="bg-white dark:bg-[#1c1c1e] rounded-t-[28px] sm:rounded-[24px] max-w-lg w-full max-h-[90vh] flex flex-col border border-black/[0.08] dark:border-white/[0.12] shadow-2xl transition-all text-neutral-900 dark:text-neutral-100 overflow-hidden">
        
        {/* iOS Sheet Grab Handle for Mobile */}
        <div className="sm:hidden pt-2.5 pb-1 flex justify-center shrink-0">
          <div className="ios-sheet-handle" />
        </div>

        {/* iOS Header */}
        <div className="flex items-center justify-between px-5 py-3 border-b border-black/[0.06] dark:border-white/[0.08] text-xs shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="text-xs font-medium text-[#007aff] dark:text-[#0a84ff] hover:opacity-80 transition-opacity cursor-pointer min-h-[32px] flex items-center"
          >
            Cancel
          </button>

          <div className="flex items-center gap-1.5 font-semibold text-xs text-neutral-900 dark:text-white">
            {priority === 'dev' ? (
              <Sparkles className="w-3.5 h-3.5 text-purple-600 dark:text-purple-400" />
            ) : (
              <Megaphone className="w-3.5 h-3.5 text-[#007aff] dark:text-[#0a84ff]" />
            )}
            <span>{initialAnnouncement ? 'Edit Notice' : 'New Notice'}</span>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-full text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200 hover:bg-black/5 dark:hover:bg-white/10 transition-colors cursor-pointer"
          >
            <X className="w-3.5 h-3.5" />
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

          {/* Priority Type - iOS Segmented Control */}
          <div className="space-y-1.5">
            <label className="block text-[11px] font-semibold text-neutral-500 dark:text-neutral-400 uppercase tracking-wider">
              Notice Type
            </label>
            <div className="ios-segmented-control w-full">
              <button
                type="button"
                onClick={() => setPriority('important')}
                className={`ios-segmented-item flex-1 ${
                  priority === 'important' ? 'ios-segmented-item-active' : ''
                }`}
              >
                Standard Notice
              </button>

              <button
                type="button"
                onClick={() => setPriority('dev')}
                className={`ios-segmented-item flex-1 ${
                  priority === 'dev' ? 'ios-segmented-item-active text-purple-600 dark:text-purple-400' : ''
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
          <div className="flex items-center justify-end gap-2 pt-3 border-t border-black/[0.06] dark:border-white/[0.08]">
            <button
              type="button"
              onClick={onClose}
              className="ios-btn-tinted px-4 py-2 text-xs font-semibold rounded-[12px] transition-colors cursor-pointer min-h-[38px]"
            >
              Cancel
            </button>
            <button
              type="submit"
              className={`ios-btn-filled px-5 py-2 text-xs font-semibold text-white rounded-[12px] shadow-xs transition-all active:scale-[0.98] cursor-pointer min-h-[38px] ${
                priority === 'dev'
                  ? 'bg-purple-600 hover:bg-purple-700'
                  : 'bg-[#007aff] hover:bg-[#0071e3] dark:bg-[#0a84ff]'
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
