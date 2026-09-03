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
        className="bg-white/95 dark:bg-[#161619]/95 backdrop-blur-2xl rounded-2xl w-full max-w-3xl lg:max-w-4xl h-[88vh] max-h-[820px] min-h-[520px] flex flex-col overflow-hidden border border-neutral-200/90 dark:border-neutral-800/90 shadow-2xl transition-all"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 sm:px-6 py-3 border-b border-neutral-200/80 dark:border-neutral-800/80 shrink-0">
          <div className="flex items-center gap-2">
            <FileText className="w-4 h-4 text-[#2383e2]" />
            <h3 className="font-bold text-sm sm:text-base text-[#1c1917] dark:text-white">
              {initialNote ? 'Edit Note' : 'New Note'}
            </h3>
          </div>

          <div className="flex items-center gap-1.5">
            {/* Pin Toggle */}
            <button
              type="button"
              onClick={() => setIsPinned(!isPinned)}
              className={`p-1.5 rounded-lg border transition-all ${
                isPinned
                  ? 'bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300 border-amber-300 dark:border-amber-700'
                  : 'text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200 border-transparent hover:bg-neutral-100 dark:hover:bg-neutral-800'
              }`}
              title={isPinned ? 'Unpin note' : 'Pin note to top'}
            >
              <Pin className="w-4 h-4" />
            </button>

            {/* Close */}
            <button
              onClick={onClose}
              className="p-1.5 text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200 hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded-lg transition-colors"
            >
              <X className="w-4 h-4" />
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
              className="w-full px-3.5 py-2 text-base sm:text-lg font-bold bg-neutral-50/70 dark:bg-neutral-900/60 border border-neutral-200/80 dark:border-neutral-800/80 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#2383e2] text-[#1c1917] dark:text-white placeholder:text-neutral-400 shadow-2xs transition-all"
              autoFocus
            />
          </div>

          {/* Notion WYSIWYG Rich Text Editor */}
          <div className="flex-1 min-h-0 px-4 sm:px-6 pb-3 flex flex-col">
            <RichTextEditor
              key={initialNote?.id || 'new-note'}
              initialHtml={content}
              onChange={setContent}
              placeholder="Write your note here... Use formatting tools above or keyboard shortcuts like Ctrl+B, Ctrl+I, Ctrl+U..."
              className="flex-1 min-h-0"
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
                  className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-xl transition-colors active:scale-95 cursor-pointer"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Delete</span>
                </button>
              ) : <div />}

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-1.5 text-xs font-semibold text-neutral-600 dark:text-neutral-300 hover:bg-neutral-200/60 dark:hover:bg-neutral-800 rounded-xl transition-colors active:scale-95 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4.5 py-1.5 text-xs font-semibold text-white bg-[#2383e2] hover:bg-[#1a73e8] rounded-xl shadow-xs hover:shadow-md transition-all active:scale-95 cursor-pointer"
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
