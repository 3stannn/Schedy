import React, { useState, useEffect } from 'react';
import type { Note, NoteColor } from '../../types/note';
import { X, Pin, Trash2, FileText } from '../common/MovingIcon';
import { RichTextEditor } from './RichTextEditor';
import { stripHtml } from './noteFormattingUtils';

interface NoteModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (noteData: any) => void;
  onDelete?: (id: string) => void;
  initialNote?: Note | null;
}

const COLOR_OPTIONS: { value: NoteColor; label: string; bg: string; border: string; ring: string }[] = [
  { value: 'default', label: 'Default', bg: 'bg-neutral-100 dark:bg-neutral-800', border: 'border-neutral-300 dark:border-neutral-700', ring: 'ring-neutral-400' },
  { value: 'yellow', label: 'Yellow', bg: 'bg-amber-100 dark:bg-amber-950/60', border: 'border-amber-300 dark:border-amber-800', ring: 'ring-amber-400' },
  { value: 'blue', label: 'Blue', bg: 'bg-sky-100 dark:bg-sky-950/60', border: 'border-sky-300 dark:border-sky-800', ring: 'ring-sky-400' },
  { value: 'green', label: 'Green', bg: 'bg-emerald-100 dark:bg-emerald-950/60', border: 'border-emerald-300 dark:border-emerald-800', ring: 'ring-emerald-400' },
  { value: 'purple', label: 'Purple', bg: 'bg-purple-100 dark:bg-purple-950/60', border: 'border-purple-300 dark:border-purple-800', ring: 'ring-purple-400' },
  { value: 'pink', label: 'Pink', bg: 'bg-rose-100 dark:bg-rose-950/60', border: 'border-rose-300 dark:border-rose-800', ring: 'ring-rose-400' },
];

export const NoteModal: React.FC<NoteModalProps> = ({
  isOpen,
  onClose,
  onSave,
  onDelete,
  initialNote,
}) => {
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [color, setColor] = useState<NoteColor>('default');
  const [isPinned, setIsPinned] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen) return;

    if (initialNote) {
      setTitle(initialNote.title || '');
      setContent(initialNote.content || '');
      setColor(initialNote.color || 'default');
      setIsPinned(!!initialNote.isPinned);
    } else {
      setTitle('');
      setContent('');
      setColor('default');
      setIsPinned(false);
    }
    setError(null);
  }, [initialNote, isOpen]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const plainText = stripHtml(content);
    if (!title.trim() && !plainText.trim()) {
      setError('Please provide at least a title or some content.');
      return;
    }

    onSave({
      ...(initialNote ? { id: initialNote.id, createdAt: initialNote.createdAt } : {}),
      title: title.trim() || 'Untitled Note',
      content: content.trim(),
      color,
      isPinned,
    });
    onClose();
  };

  const plainText = stripHtml(content);
  const wordCount = plainText.trim() ? plainText.trim().split(/\s+/).length : 0;
  const charCount = plainText.length;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 md:p-6 bg-black/60 backdrop-blur-sm animate-fade-in">
      <div 
        className="bg-white dark:bg-[#1c1c1e] rounded-t-[28px] sm:rounded-[24px] w-full max-w-3xl lg:max-w-4xl h-[88vh] max-h-[820px] min-h-[520px] flex flex-col overflow-hidden border border-black/[0.08] dark:border-white/[0.12] shadow-2xl transition-all text-neutral-900 dark:text-neutral-100"
        onClick={(e) => e.stopPropagation()}
      >
        {/* iOS Sheet Grab Handle for Mobile */}
        <div className="sm:hidden pt-2.5 pb-1 flex justify-center shrink-0">
          <div className="ios-sheet-handle" />
        </div>

        {/* Header */}
        <div className="flex items-center justify-between px-4 sm:px-6 py-3 border-b border-black/[0.06] dark:border-white/[0.08] shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="text-xs font-medium text-[#007aff] dark:text-[#0a84ff] hover:opacity-80 transition-opacity cursor-pointer min-h-[32px] flex items-center"
          >
            Cancel
          </button>

          <div className="flex items-center gap-1.5 font-semibold text-xs text-neutral-900 dark:text-white">
            <FileText className="w-3.5 h-3.5 text-[#007aff] dark:text-[#0a84ff]" />
            <span>{initialNote ? 'Edit Note' : 'New Note'}</span>
          </div>

          <div className="flex items-center gap-1.5">
            {/* Pin Toggle */}
            <button
              type="button"
              onClick={() => setIsPinned(!isPinned)}
              className={`p-1.5 rounded-full transition-all cursor-pointer ${
                isPinned
                  ? 'bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300'
                  : 'text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200 hover:bg-black/5 dark:hover:bg-white/10'
              }`}
              title={isPinned ? 'Unpin note' : 'Pin note to top'}
            >
              <Pin className="w-3.5 h-3.5" />
            </button>

            {/* Close */}
            <button
              onClick={onClose}
              className="p-1.5 rounded-full text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200 hover:bg-black/5 dark:hover:bg-white/10 transition-colors cursor-pointer"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="flex-1 flex flex-col min-h-0 overflow-hidden">
          {/* Error Alert */}
          {error && (
            <div className="mx-4 sm:mx-6 mt-3 p-2.5 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 rounded-xl text-xs text-rose-600 dark:text-rose-400 shrink-0">
              {error}
            </div>
          )}

          {/* Title Input */}
          <div className="px-4 sm:px-6 pt-3.5 pb-2 shrink-0">
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Note Title..."
              className="w-full px-3.5 py-2 text-base sm:text-lg font-bold bg-black/[0.03] dark:bg-white/[0.05] border border-black/[0.08] dark:border-white/[0.1] rounded-[14px] focus:outline-none focus:ring-2 focus:ring-[#007aff] text-neutral-900 dark:text-white placeholder:text-neutral-400 transition-all"
              autoFocus
            />
          </div>

          {/* Notion WYSIWYG Rich Text Editor */}
          <div className="flex-1 min-h-[260px] sm:min-h-[320px] px-4 sm:px-6 pb-3 flex flex-col">
            <RichTextEditor
              key={initialNote?.id || 'new-note'}
              initialHtml={content}
              onChange={setContent}
              placeholder="Write your note here... Use formatting tools above or keyboard shortcuts like Ctrl+B, Ctrl+I, Ctrl+U..."
              className="flex-1 min-h-[260px] sm:min-h-[320px]"
            />
          </div>

          {/* Footer Bar: Color Selector + Stats + Action Buttons */}
          <div className="px-4 sm:px-6 py-3 border-t border-neutral-200/80 dark:border-neutral-800/80 bg-neutral-50/60 dark:bg-neutral-900/60 flex flex-col sm:flex-row items-center justify-between gap-3 shrink-0">
            {/* Left: Card Color Palette */}
            <div className="flex items-center gap-3 w-full sm:w-auto justify-between sm:justify-start">
              <div className="flex items-center gap-2">
                <span className="text-[11px] font-semibold text-neutral-500 dark:text-neutral-400">
                  Card Color:
                </span>
                <div className="flex items-center gap-1.5">
                  {COLOR_OPTIONS.map((c) => (
                    <button
                      key={c.value}
                      type="button"
                      onClick={() => setColor(c.value)}
                      className={`w-5 h-5 rounded-full border ${c.bg} ${c.border} transition-all ${
                        color === c.value
                          ? `ring-2 ring-offset-2 ${c.ring} scale-115 shadow-2xs`
                          : 'opacity-70 hover:opacity-100 hover:scale-105'
                      }`}
                      title={c.label}
                    />
                  ))}
                </div>
              </div>

              {/* Character & Word count badge */}
              <div className="text-[10px] text-neutral-400 font-mono hidden sm:inline">
                {wordCount} {wordCount === 1 ? 'word' : 'words'} • {charCount} chars
              </div>
            </div>

            {/* Right: Actions */}
            <div className="flex items-center justify-between sm:justify-end gap-2 w-full sm:w-auto">
              {initialNote && onDelete ? (
                <button
                  type="button"
                  onClick={() => {
                    onDelete(initialNote.id);
                    onClose();
                  }}
                  className="flex items-center gap-1.5 px-3 py-1 text-xs font-semibold text-[#ff3b30] hover:bg-[#ff3b30]/10 rounded-[10px] transition-colors active:scale-95 cursor-pointer h-8"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Delete</span>
                </button>
              ) : <div />}

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={onClose}
                  className="ios-btn-tinted px-3.5 py-1 text-xs font-semibold rounded-xl transition-colors active:scale-95 cursor-pointer min-h-[32px] h-8"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="ios-btn-filled px-4 py-1 text-xs font-semibold text-white bg-[#007aff] hover:bg-[#0071e3] dark:bg-[#0a84ff] rounded-xl shadow-xs transition-all active:scale-[0.98] cursor-pointer min-h-[32px] h-8"
                >
                  {initialNote ? 'Save Changes' : 'Create Note'}
                </button>
              </div>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};
