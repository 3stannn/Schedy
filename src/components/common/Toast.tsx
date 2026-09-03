import React, { useState, useEffect, useMemo } from 'react';
import { CheckCircle2, AlertCircle, Info, AlertTriangle, X } from './MovingIcon';

export interface ToastMessage {
  id: string;
  type: 'success' | 'error' | 'info' | 'urgent';
  title: string;
  message?: string;
  customDuration?: number;
}

interface ToastContainerProps {
  toasts: ToastMessage[];
  onDismiss: (id: string) => void;
}

/**
 * HCI & UX Reading Speed Principles for Notification Duration:
 * - Average adult reading speed: ~200-250 words per min (~40-50ms per character)
 * - Base visual recognition & focus buffer: ~2,500ms
 * - Complex/Urgent/Error processing buffer: +1,500ms
 * - WCAG Guideline: Minimum 3,500ms floor to prevent flash-disappear; maximum 8,500ms ceiling.
 * - Interactive Pause-on-Hover: Timer stops when user hovers to allow reading.
 */
export function calculateToastDuration(toast: ToastMessage): number {
  if (toast.customDuration && toast.customDuration > 0) {
    return toast.customDuration;
  }

  const charCount = (toast.title?.length || 0) + (toast.message?.length || 0);
  let duration = 2500 + charCount * 45;

  if (toast.type === 'error' || toast.type === 'urgent') {
    duration += 1500;
  }

  return Math.min(Math.max(duration, 3500), 8500);
}

export const ToastContainer: React.FC<ToastContainerProps> = ({ toasts, onDismiss }) => {
  return (
    <div className="toast-container fixed top-3 sm:top-auto sm:bottom-5 right-2 sm:right-5 z-50 flex flex-col gap-2 max-w-sm w-[calc(100vw-1rem)] sm:w-full pointer-events-none px-1 sm:px-0">
      {toasts.map(toast => (
        <ToastItem key={toast.id} toast={toast} onDismiss={onDismiss} />
      ))}
    </div>
  );
};

const ToastItem: React.FC<{ toast: ToastMessage; onDismiss: (id: string) => void }> = ({ toast, onDismiss }) => {
  const totalDuration = useMemo(() => calculateToastDuration(toast), [toast]);
  const [remainingTime, setRemainingTime] = useState(totalDuration);
  const [isHovered, setIsHovered] = useState(false);

  useEffect(() => {
    if (isHovered) return;

    const startTime = Date.now();
    const initialRemaining = remainingTime;

    const interval = setInterval(() => {
      const elapsed = Date.now() - startTime;
      const nextRemaining = Math.max(0, initialRemaining - elapsed);
      setRemainingTime(nextRemaining);

      if (nextRemaining <= 0) {
        clearInterval(interval);
        onDismiss(toast.id);
      }
    }, 25);

    return () => clearInterval(interval);
  }, [isHovered, toast.id, onDismiss]);

  const typeConfig = {
    success: {
      progressColor: 'bg-emerald-500',
      icon: <CheckCircle2 className="toast-accent-icon w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />,
    },
    error: {
      progressColor: 'bg-rose-500',
      icon: <AlertCircle className="w-4 h-4 text-rose-600 dark:text-rose-400 shrink-0 mt-0.5" />,
    },
    info: {
      progressColor: 'bg-[#2383e2]',
      icon: <Info className="toast-accent-icon w-4 h-4 text-[#2383e2] shrink-0 mt-0.5" />,
    },
    urgent: {
      progressColor: 'bg-amber-500',
      icon: <AlertTriangle className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />,
    },
  };

  const config = typeConfig[toast.type] || typeConfig.info;
  const progressPercent = Math.max(0, Math.min(100, (remainingTime / totalDuration) * 100));
  const secondsRemaining = (remainingTime / 1000).toFixed(1);

  return (
    <div
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      className="toast-item pointer-events-auto flex flex-col rounded-2xl border border-neutral-200/90 dark:border-neutral-800/90 bg-white/95 dark:bg-[#161619]/95 backdrop-blur-xl shadow-xl shadow-black/5 dark:shadow-black/50 text-[#1c1917] dark:text-[#f4f4f5] transition-all animate-fade-in overflow-hidden"
    >
      <div className="flex items-start gap-3 p-3.5">
        {config.icon}
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-2">
            <p className="text-xs font-bold leading-tight text-[#1c1917] dark:text-white">
              {toast.title}
            </p>
            <span className="text-[10px] font-mono text-neutral-400 shrink-0">
              {isHovered ? 'Paused' : `${secondsRemaining}s`}
            </span>
          </div>
          {toast.message && (
            <p className="text-[11px] text-neutral-600 dark:text-neutral-300 mt-1 leading-relaxed break-words font-medium">
              {toast.message}
            </p>
          )}
        </div>
        <button
          onClick={() => onDismiss(toast.id)}
          className="p-1 -mr-1 -mt-1 rounded-lg text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors"
          title="Dismiss notification"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Visual Duration Progress Bar */}
      <div className="w-full h-1 bg-neutral-100 dark:bg-neutral-800/80 overflow-hidden">
        <div
          className={`toast-progress-bar h-full ${config.progressColor} transition-all duration-75 ease-linear`}
          style={{ width: `${progressPercent}%` }}
        />
      </div>
    </div>
  );
};
