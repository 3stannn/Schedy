import React, { useState } from 'react';
import { X, AlertCircle } from '../common/MovingIcon';
import { signInWithGoogle, isAuthSupabaseConfigured } from '../../services/authService';
import { useModalBehavior } from '../../hooks/useModalBehavior';
import { ModalDragHandle } from '../common/ModalDragHandle';
import { haptics } from '../../utils/haptics';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
  featureTitle?: string;
  featureDescription?: string;
}

export const AuthModal: React.FC<AuthModalProps> = ({
  isOpen,
  onClose,
  featureTitle = 'Sign In with Google',
  featureDescription = 'Sign in to access AI Schedule distribution and Schedy Pro features.',
}) => {
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const {
    modalRef,
    backdropRef,
    dragHandleProps,
    modalStyle,
    isDragging,
    handleBackdropClick,
    handleBackdropTouchMove,
  } = useModalBehavior({
    isOpen,
    onClose,
  });

  if (!isOpen) return null;

  const isConfigured = isAuthSupabaseConfigured();

  const handleGoogleSignIn = async () => {
    haptics.medium();
    setLoading(true);
    setErrorMessage(null);

    const result = await signInWithGoogle();
    if (!result.success) {
      setErrorMessage(result.error || 'Failed to initialize Google Sign-in');
      setLoading(false);
    }
  };

  return (
    <div
      ref={backdropRef}
      onClick={handleBackdropClick}
      onTouchMove={handleBackdropTouchMove}
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/50 sm:bg-black/40 backdrop-blur-xs animate-fade-in"
      role="dialog"
      aria-modal="true"
      aria-label={featureTitle}
    >
      <div
        ref={modalRef}
        style={modalStyle}
        className="bg-white dark:bg-[#1c1c1e] rounded-t-[28px] sm:rounded-[24px] max-w-md w-full max-h-[90vh] overflow-y-auto border border-black/[0.08] dark:border-white/[0.12] shadow-2xl transition-all text-neutral-900 dark:text-neutral-100 no-scrollbar"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Mobile Grab Handle */}
        <ModalDragHandle dragHandleProps={dragHandleProps} isDragging={isDragging} />

        {/* iOS Modal Header */}
        <div className="flex items-center justify-between px-4 sm:px-6 py-3 border-b border-black/[0.06] dark:border-white/[0.08] text-xs shrink-0">
          <button
            type="button"
            onClick={() => {
              haptics.light();
              onClose();
            }}
            className="text-xs font-medium text-[#007aff] dark:text-[#0a84ff] hover:opacity-80 transition-opacity cursor-pointer min-h-[32px] flex items-center"
          >
            Cancel
          </button>

          <div className="flex items-center gap-1.5 font-semibold text-xs text-neutral-900 dark:text-white">
            <span>Account</span>
          </div>

          <button
            onClick={() => {
              haptics.light();
              onClose();
            }}
            className="p-1.5 rounded-full text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200 hover:bg-black/5 dark:hover:bg-white/10 transition-colors cursor-pointer"
            aria-label="Close"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Modal Content */}
        <div className="p-5 sm:p-6 space-y-4">
          {/* Header Info */}
          <div className="text-center space-y-1.5 pt-1">
            <h3 className="text-base font-bold text-neutral-900 dark:text-white tracking-tight">
              {featureTitle}
            </h3>
            <p className="text-xs text-neutral-500 dark:text-neutral-400 leading-relaxed max-w-xs mx-auto">
              {featureDescription}
            </p>
          </div>

          {/* Config Alert if not setup */}
          {!isConfigured && (
            <div className="flex items-start gap-2.5 p-3 rounded-[14px] bg-amber-500/10 border border-amber-500/20 text-amber-700 dark:text-amber-300 text-xs">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <div className="space-y-0.5">
                <span className="font-semibold">Setup Required</span>
                <p className="text-[11px] leading-normal opacity-90">
                  Add <code className="font-mono bg-black/5 dark:bg-white/10 px-1 py-0.5 rounded">VITE_AUTH_SUPABASE_URL</code> to your environment.
                </p>
              </div>
            </div>
          )}

          {errorMessage && (
            <div className="flex items-center gap-2 p-3 rounded-[14px] bg-[#ff3b30]/10 border border-[#ff3b30]/20 text-[#ff3b30] dark:text-[#ff453a] text-xs">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* iOS Inset Card for Google Button */}
          <div className="p-3.5 rounded-[16px] bg-black/[0.03] dark:bg-white/[0.05] border border-black/[0.05] dark:border-white/[0.08] space-y-3">
            <button
              onClick={handleGoogleSignIn}
              disabled={loading}
              className="w-full flex items-center justify-center gap-2.5 py-2.5 px-4 rounded-[12px] bg-white dark:bg-[#2c2c2e] hover:bg-neutral-50 dark:hover:bg-[#343438] text-neutral-800 dark:text-neutral-100 font-semibold text-xs border border-black/[0.08] dark:border-white/[0.1] shadow-2xs transition-all active:scale-[0.98] cursor-pointer disabled:opacity-60 min-h-[38px]"
            >
              <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24">
                <path
                  fill="#4285F4"
                  d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.82-2.4 3.68v3.05h3.88c2.27-2.09 3.665-5.17 3.665-9.17z"
                />
                <path
                  fill="#34A853"
                  d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.1-6.72-4.93H1.25v3.15C3.26 21.36 7.33 24 12 24z"
                />
                <path
                  fill="#FBBC05"
                  d="M5.28 14.27c-.25-.72-.38-1.49-.38-2.27s.13-1.55.38-2.27V6.58H1.25C.45 8.18 0 9.98 0 12s.45 3.82 1.25 5.42l4.03-3.15z"
                />
                <path
                  fill="#EA4335"
                  d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.33 0 3.26 2.64 1.25 6.58l4.03 3.15c.95-2.83 3.6-4.98 6.72-4.98z"
                />
              </svg>
              <span>{loading ? 'Connecting to Google...' : 'Continue with Google'}</span>
            </button>

            <p className="text-[10px] text-center text-neutral-400 dark:text-neutral-500 leading-normal">
              Secure OAuth authentication powered by Supabase.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
