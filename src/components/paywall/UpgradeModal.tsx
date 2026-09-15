import React, { useState } from 'react';
import { X, ExternalLink } from '../common/MovingIcon';
import type { UserProfile } from '../../types/auth';
import { getPolarCheckoutUrl, syncSubscriptionWithPolar } from '../../services/authService';
import { useModalBehavior } from '../../hooks/useModalBehavior';
import { ModalDragHandle } from '../common/ModalDragHandle';
import { haptics } from '../../utils/haptics';

interface UpgradeModalProps {
  isOpen: boolean;
  onClose: () => void;
  user: UserProfile | null;
  onSuccess?: (updatedProfile: UserProfile) => void;
}

export const UpgradeModal: React.FC<UpgradeModalProps> = ({
  isOpen,
  onClose,
  user,
  onSuccess,
}) => {
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

  const [isVerifying, setIsVerifying] = useState(false);
  const [verifyNotice, setVerifyNotice] = useState<string | null>(null);

  if (!isOpen) return null;

  const checkoutUrl = getPolarCheckoutUrl(user);

  const handleUpgradeClick = () => {
    haptics.medium();
  };

  const handleVerifyUpgrade = async () => {
    if (!user) return;
    setIsVerifying(true);
    setVerifyNotice(null);
    haptics.medium();
    try {
      // Trigger active server sync with Polar / Supabase
      const { isPro, profile } = await syncSubscriptionWithPolar(user.email, user.id);
      if (isPro && profile) {
        onSuccess?.(profile);
        onClose();
      } else {
        setVerifyNotice('No confirmed active subscription found yet. If you just completed payment, please wait a moment and try again.');
      }
    } catch (e) {
      console.error('Failed to verify pro upgrade:', e);
      setVerifyNotice('Could not verify status. Please try again.');
    } finally {
      setIsVerifying(false);
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
      aria-label="Upgrade to Schedy Pro"
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
            Done
          </button>

          <div className="flex items-center gap-1.5 font-semibold text-xs text-neutral-900 dark:text-white">
            <span>Schedy Pro</span>
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
          <div className="text-center space-y-1">
            <h3 className="text-lg font-bold text-neutral-900 dark:text-white tracking-tight">
              Unlock Schedy Pro
            </h3>
            <p className="text-xs text-neutral-500 dark:text-neutral-400 leading-relaxed max-w-xs mx-auto">
              {user?.email ? (
                <>For account <strong className="text-neutral-700 dark:text-neutral-200">{user.email}</strong></>
              ) : (
                'Upgrade your workspace for powerful automated scheduling.'
              )}
            </p>
          </div>

          {/* Action Section */}
          <div className="space-y-2 pt-1">
            <a
              href={checkoutUrl}
              target="_blank"
              rel="noopener noreferrer"
              onClick={handleUpgradeClick}
              className="w-full flex items-center justify-center gap-2 py-2.5 px-4 text-xs font-semibold text-white bg-[#007aff] hover:bg-[#0071e3] dark:bg-[#0a84ff] dark:hover:bg-[#0077ed] rounded-[12px] shadow-xs transition-all active:scale-[0.98] cursor-pointer min-h-[38px] text-center no-underline"
            >
              <span>Upgrade with Polar.sh</span>
              <ExternalLink className="w-3.5 h-3.5" />
            </a>

            <p className="text-[10px] text-center text-neutral-400 dark:text-neutral-500">
              Secure merchant of record checkout via Polar.sh. Cancel anytime.
            </p>

            <div className="pt-2.5 mt-2 border-t border-black/[0.06] dark:border-white/[0.08] flex items-center justify-between text-xs">
              <span className="text-[11px] text-neutral-500 dark:text-neutral-400">Already paid?</span>
              <button
                type="button"
                onClick={handleVerifyUpgrade}
                disabled={isVerifying}
                className="text-[11px] font-semibold text-[#007aff] dark:text-[#0a84ff] hover:underline cursor-pointer disabled:opacity-50"
              >
                {isVerifying ? 'Checking...' : 'Refresh Pro Status'}
              </button>
            </div>

            {verifyNotice && (
              <p className="text-[11px] text-[#ff3b30] dark:text-[#ff453a] text-center pt-1 font-medium leading-tight">
                {verifyNotice}
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
