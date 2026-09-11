import React, { useState, useEffect } from 'react';
import { AlertTriangle, Trash2 } from '../common/MovingIcon';
import { useModalBehavior } from '../../hooks/useModalBehavior';
import { haptics } from '../../utils/haptics';

export interface ClearAllDataModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  eventsCount: number;
  notesCount: number;
}

export const ClearAllDataModal: React.FC<ClearAllDataModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  eventsCount,
  notesCount,
}) => {
  const [stage, setStage] = useState<1 | 2>(1);
  const [confirmPhrase, setConfirmPhrase] = useState('');

  // Reset state when modal opens or closes
  useEffect(() => {
    if (isOpen) {
      setStage(1);
      setConfirmPhrase('');
    }
  }, [isOpen]);

  const {
    modalRef,
    backdropRef,
    modalStyle,
    handleBackdropClick,
    handleBackdropTouchMove,
  } = useModalBehavior({
    isOpen,
    onClose,
    enableDrag: false,
  });

  if (!isOpen) return null;

  const isConfirmedPhrase = confirmPhrase.trim().toUpperCase() === 'CLEAR';

  const handleProceedToStage2 = () => {
    haptics.warning();
    setStage(2);
  };

  const handleFinalConfirm = () => {
    if (!isConfirmedPhrase) return;
    haptics.error();
    onConfirm();
    onClose();
  };

  return (
    <div
      ref={backdropRef}
      onClick={handleBackdropClick}
      onTouchMove={handleBackdropTouchMove}
      className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs animate-fade-in"
      role="alertdialog"
      aria-modal="true"
      aria-label="Clear All Data Confirmation"
    >
      <div
        ref={modalRef}
        style={modalStyle}
        className="bg-white/95 dark:bg-[#1c1c1e]/95 backdrop-blur-2xl rounded-[22px] max-w-[340px] sm:max-w-[360px] w-full border border-black/[0.08] dark:border-white/[0.12] shadow-2xl text-neutral-900 dark:text-neutral-100 overflow-hidden text-center"
        onClick={e => e.stopPropagation()}
      >
        {stage === 1 ? (
          /* ================= STAGE 1: OVERVIEW WARNING ================= */
          <>
            <div className="p-5 pb-4 space-y-3">
              <div className="w-12 h-12 mx-auto rounded-full bg-[#ff3b30]/10 text-[#ff3b30] flex items-center justify-center">
                <Trash2 className="w-6 h-6" />
              </div>

              <div className="space-y-1">
                <h3 className="font-bold text-base text-neutral-900 dark:text-white tracking-tight">
                  Clear All Data?
                </h3>
                <p className="text-xs text-neutral-600 dark:text-neutral-400 leading-relaxed">
                  This will erase all your schedule entries, tasks, scratchpad notes, and timer sessions.
                </p>
              </div>

              {/* Data Summary Pill */}
              <div className="rounded-[14px] bg-black/[0.03] dark:bg-white/[0.05] border border-black/[0.05] dark:border-white/[0.08] p-2.5 text-[11px] text-neutral-600 dark:text-neutral-300 grid grid-cols-2 gap-2 text-center">
                <div className="p-1.5 rounded-[10px] bg-white/70 dark:bg-white/[0.06]">
                  <span className="block font-bold text-neutral-900 dark:text-white text-sm">
                    {eventsCount}
                  </span>
                  <span className="text-[10px] text-neutral-500 dark:text-neutral-400">
                    Events & Tasks
                  </span>
                </div>
                <div className="p-1.5 rounded-[10px] bg-white/70 dark:bg-white/[0.06]">
                  <span className="block font-bold text-neutral-900 dark:text-white text-sm">
                    {notesCount}
                  </span>
                  <span className="text-[10px] text-neutral-500 dark:text-neutral-400">
                    Notes
                  </span>
                </div>
              </div>
            </div>

            {/* iOS Alert Hairline Divided Action Buttons */}
            <div className="grid grid-cols-2 border-t border-black/[0.08] dark:border-white/[0.1] divide-x divide-black/[0.08] dark:divide-white/[0.1]">
              <button
                type="button"
                onClick={onClose}
                className="py-3 px-4 text-xs font-medium text-[#007aff] dark:text-[#0a84ff] hover:bg-black/5 dark:hover:bg-white/5 active:bg-black/10 dark:active:bg-white/10 transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleProceedToStage2}
                className="py-3 px-4 text-xs font-semibold text-[#ff3b30] dark:text-[#ff453a] hover:bg-[#ff3b30]/10 active:bg-[#ff3b30]/20 transition-colors cursor-pointer"
              >
                Proceed...
              </button>
            </div>
          </>
        ) : (
          /* ================= STAGE 2: FINAL KEYWORD VERIFICATION ================= */
          <>
            <div className="p-5 pb-4 space-y-3">
              <div className="w-12 h-12 mx-auto rounded-full bg-[#ff3b30]/15 text-[#ff3b30] flex items-center justify-center">
                <AlertTriangle className="w-6 h-6" />
              </div>

              <div className="space-y-1">
                <h3 className="font-bold text-base text-[#ff3b30] dark:text-[#ff453a] tracking-tight">
                  Final Confirmation
                </h3>
                <p className="text-xs text-neutral-600 dark:text-neutral-400 leading-relaxed">
                  This action is permanent and <strong>cannot be undone</strong>. To confirm deletion, type <span className="font-mono font-bold text-neutral-900 dark:text-white">CLEAR</span> below:
                </p>
              </div>

              {/* Typed safeguard input */}
              <div className="pt-1">
                <input
                  type="text"
                  autoFocus
                  value={confirmPhrase}
                  onChange={e => setConfirmPhrase(e.target.value)}
                  placeholder="Type CLEAR"
                  className="w-full px-3 py-2 text-center text-xs font-mono font-bold tracking-widest uppercase rounded-[12px] bg-black/[0.04] dark:bg-white/[0.06] border border-black/[0.1] dark:border-white/[0.15] focus:border-[#ff3b30] focus:ring-2 focus:ring-[#ff3b30]/20 outline-none text-neutral-900 dark:text-white placeholder:text-neutral-400 dark:placeholder:text-neutral-500 placeholder:tracking-normal placeholder:font-sans placeholder:font-normal"
                  onKeyDown={e => {
                    if (e.key === 'Enter' && isConfirmedPhrase) {
                      handleFinalConfirm();
                    }
                  }}
                />
              </div>
            </div>

            {/* iOS Alert Hairline Divided Action Buttons */}
            <div className="grid grid-cols-2 border-t border-black/[0.08] dark:border-white/[0.1] divide-x divide-black/[0.08] dark:divide-white/[0.1]">
              <button
                type="button"
                onClick={() => setStage(1)}
                className="py-3 px-4 text-xs font-medium text-neutral-600 dark:text-neutral-300 hover:bg-black/5 dark:hover:bg-white/5 active:bg-black/10 dark:active:bg-white/10 transition-colors cursor-pointer"
              >
                Back
              </button>
              <button
                type="button"
                disabled={!isConfirmedPhrase}
                onClick={handleFinalConfirm}
                className={`py-3 px-4 text-xs font-bold transition-all ${
                  isConfirmedPhrase
                    ? 'text-white bg-[#ff3b30] hover:bg-[#d70015] active:bg-[#b30010] cursor-pointer'
                    : 'text-neutral-400 dark:text-neutral-600 bg-black/[0.02] dark:bg-white/[0.02] cursor-not-allowed opacity-50'
                }`}
              >
                Clear All Data
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
};
