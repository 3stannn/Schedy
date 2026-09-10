import React from 'react';
import { Maximize2, Minimize2 } from './MovingIcon';

interface ModalFocusButtonProps {
  isFocusMode: boolean;
  onToggle: () => void;
  className?: string;
}

export const ModalFocusButton: React.FC<ModalFocusButtonProps> = ({
  isFocusMode,
  onToggle,
  className = '',
}) => {
  return (
    <button
      type="button"
      onClick={onToggle}
      className={`inline-flex items-center gap-1 px-2 py-1 rounded-lg text-[11px] font-medium transition-all active:scale-95 cursor-pointer ${
        isFocusMode
          ? 'bg-blue-500/15 text-blue-600 dark:text-blue-400 border border-blue-500/25 shadow-xs'
          : 'text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200 hover:bg-black/5 dark:hover:bg-white/10'
      } ${className}`}
      title={isFocusMode ? 'Exit Focus Mode (Esc)' : 'Enter Focus Mode'}
      aria-label={isFocusMode ? 'Exit Focus Mode' : 'Enter Focus Mode'}
    >
      {isFocusMode ? (
        <>
          <Minimize2 className="w-3.5 h-3.5" />
          <span className="hidden xs:inline">Exit Focus</span>
        </>
      ) : (
        <>
          <Maximize2 className="w-3.5 h-3.5" />
          <span className="hidden xs:inline">Focus</span>
        </>
      )}
    </button>
  );
};
