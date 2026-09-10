import React from 'react';
import type { DragHandleProps } from '../../hooks/useModalBehavior';

interface ModalDragHandleProps {
  dragHandleProps?: DragHandleProps;
  isDragging?: boolean;
  className?: string;
  label?: string;
}

export const ModalDragHandle: React.FC<ModalDragHandleProps> = ({
  dragHandleProps,
  isDragging = false,
  className = '',
  label,
}) => {
  return (
    <div
      {...dragHandleProps}
      className={`sm:hidden pt-2.5 pb-2 px-6 flex flex-col items-center justify-center shrink-0 cursor-grab active:cursor-grabbing touch-none select-none transition-opacity ${
        isDragging ? 'opacity-100' : 'opacity-80 hover:opacity-100'
      } ${className}`}
      role="button"
      tabIndex={-1}
      aria-label="Drag down to dismiss modal"
      title="Swipe or drag down to dismiss"
    >
      <div
        className={`ios-sheet-handle transition-transform duration-150 ${
          isDragging ? 'scale-x-125 bg-neutral-500/50 dark:bg-white/40' : ''
        }`}
      />
      {label && (
        <span className="text-[9px] text-neutral-400 font-medium mt-0.5 tracking-tight">
          {label}
        </span>
      )}
    </div>
  );
};
