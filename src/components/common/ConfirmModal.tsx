import React from 'react';
import { AlertTriangle } from './MovingIcon';

export interface ConfirmModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  isDanger?: boolean;
}

export const ConfirmModal: React.FC<ConfirmModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  isDanger = true,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs animate-fade-in">
      <div 
        className="bg-white/95 dark:bg-[#1c1c1e]/95 backdrop-blur-2xl rounded-[20px] max-w-[320px] w-full border border-black/[0.08] dark:border-white/[0.12] shadow-2xl text-neutral-900 dark:text-neutral-100 overflow-hidden text-center"
        onClick={e => e.stopPropagation()}
      >
        {/* Alert Content */}
        <div className="p-5 pb-4 space-y-2">
          {isDanger && (
            <div className="w-10 h-10 mx-auto rounded-full bg-[#ff3b30]/10 text-[#ff3b30] flex items-center justify-center">
              <AlertTriangle className="w-5 h-5" />
            </div>
          )}
          <h3 className="font-bold text-base text-neutral-900 dark:text-white tracking-tight">
            {title}
          </h3>
          <p className="text-xs text-neutral-600 dark:text-neutral-400 leading-relaxed">
            {message}
          </p>
        </div>

        {/* iOS Alert Hairline Divided Action Buttons */}
        <div className="grid grid-cols-2 border-t border-black/[0.08] dark:border-white/[0.1] divide-x divide-black/[0.08] dark:divide-white/[0.1]">
          <button
            type="button"
            onClick={onClose}
            className="py-2.5 px-4 text-xs font-medium text-[#007aff] dark:text-[#0a84ff] hover:bg-black/5 dark:hover:bg-white/5 active:bg-black/10 dark:active:bg-white/10 transition-colors cursor-pointer"
          >
            {cancelText}
          </button>
          <button
            type="button"
            onClick={() => {
              onConfirm();
              onClose();
            }}
            className={`py-2.5 px-4 text-xs font-semibold hover:bg-black/5 dark:hover:bg-white/5 active:bg-black/10 dark:active:bg-white/10 transition-colors cursor-pointer ${
              isDanger
                ? 'text-[#ff3b30] dark:text-[#ff453a]'
                : 'text-[#007aff] dark:text-[#0a84ff]'
            }`}
          >
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  );
};

