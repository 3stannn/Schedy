import React, { useState, useEffect } from 'react';
import type { Note, NoteColor } from '../../types/note';
import { X, Pin, Trash2 } from 'lucide-react';

interface NoteModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (noteData: any) => void;
  onDelete?: (id: string) => void;
  initialNote?: Note | null;
}

const COLOR_OPTIONS: { value: NoteColor; label: string; bg: string; border: string; ring: string }[] = [
  { value: 'default', label: 'Default', bg: 'bg-neutral-100 dark:bg-neutral-800', border: 'border-neutral-300 dark:border-neutral-700', ring: 'ring-neutral-400' },
  { value: 'yellow', label: 'Yellow', bg: 'bg-amber-50 dark:bg-amber-950/40', border: 'border-amber-200 dark:border-amber-800', ring: 'ring-amber-400' },
  { value: 'blue', label: 'Blue', bg: 'bg-sky-50 dark:bg-sky-950/40', border: 'border-sky-200 dark:border-sky-800', ring: 'ring-sky-400' },
  { value: 'green', label: 'Green', bg: 'bg-emerald-50 dark:bg-emerald-950/40', border: 'border-emerald-200 dark:border-emerald-800', ring: 'ring-emerald-400' },
  { value: 'purple', label: 'Purple', bg: 'bg-purple-50 dark:bg-purple-950/40', border: 'border-purple-200 dark:border-purple-800', ring: 'ring-purple-400' },
  { value: 'pink', label: 'Pink', bg: 'bg-rose-50 dark:bg-rose-950/40', border: 'border-rose-200 dark:border-rose-800', ring: 'ring-rose-400' },
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
    if (!title.trim() && !content.trim()) {
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

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/50 backdrop-blur-sm animate-fade-in">
      <div className="bg-white/95 dark:bg-[#161619]/95 backdrop-blur-2xl rounded-2xl max-w-lg w-full overflow-hidden border border-neutral-200/80 dark:border-neutral-800/80 shadow-2xl transition-all">
        
        {/* Header */}
        <div className="flex items-center justify-between px-4 sm:px-6 py-3.5 sm:py-4 border-b border-neutral-100 dark:border-neutral-800/80">
          <h3 className="font-bold text-sm sm:text-base text-[#1c1917] dark:text-white">
            {initialNote ? 'Edit Note' : 'New Note'}
          </h3>
          <div className="flex items-center gap-1">
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
            <button
              onClick={onClose}
              className="p-1.5 text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200 hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded-lg transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-4 sm:p-6 space-y-4">
          {error && (
            <div className="p-2.5 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 rounded-xl text-xs text-rose-600 dark:text-rose-400">
              {error}
            </div>
          )}

          {/* Title */}
          <div>
            <label className="block text-xs font-semibold text-neutral-700 dark:text-neutral-300 mb-1">
              Title
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Project Ideas, Grocery List..."
              className="w-full px-3 py-2 text-xs sm:text-sm bg-neutral-50 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#2383e2] text-[#1c1917] dark:text-white placeholder:text-neutral-400"
              autoFocus
            />
          </div>

          {/* Content */}
          <div>
            <label className="block text-xs font-semibold text-neutral-700 dark:text-neutral-300 mb-1">
              Note Content
            </label>
            <textarea
              rows={5}
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="Write anything you want to remember..."
              className="w-full px-3 py-2 text-xs sm:text-sm bg-neutral-50 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#2383e2] text-[#1c1917] dark:text-white placeholder:text-neutral-400 resize-none font-sans leading-relaxed"
            />
          </div>

          {/* Color Selector */}
          <div>
            <label className="block text-xs font-semibold text-neutral-700 dark:text-neutral-300 mb-1.5">
              Card Color
            </label>
            <div className="flex items-center gap-2 flex-wrap">
              {COLOR_OPTIONS.map((c) => (
                <button
                  key={c.value}
                  type="button"
                  onClick={() => setColor(c.value)}
                  className={`w-6 h-6 rounded-full border ${c.bg} ${c.border} transition-all ${
                    color === c.value ? `ring-2 ring-offset-2 ${c.ring} scale-110` : 'opacity-70 hover:opacity-100'
                  }`}
                  title={c.label}
                />
              ))}
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center justify-between pt-2 border-t border-neutral-100 dark:border-neutral-800/80">
            {initialNote && onDelete ? (
              <button
                type="button"
                onClick={() => {
                  onDelete(initialNote.id);
                  onClose();
                }}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-xl transition-colors"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Delete</span>
              </button>
            ) : <div />}

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onClose}
                className="px-3.5 py-1.5 text-xs font-semibold text-neutral-600 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded-xl transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-1.5 text-xs font-semibold text-white bg-[#2383e2] hover:bg-[#1a73e8] rounded-xl shadow-xs transition-all active:scale-95"
              >
                {initialNote ? 'Save Changes' : 'Create Note'}
              </button>
            </div>
          </div>
        </form>

      </div>
    </div>
  );
};

