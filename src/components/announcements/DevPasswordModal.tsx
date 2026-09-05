import React, { useState } from 'react';
import { Lock, X, Eye, EyeOff, AlertTriangle } from '../common/MovingIcon';
import { verifyDevPassword } from '../../services/announcementService';

interface DevPasswordModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  actionTitle?: string;
  actionDescription?: string;
}

export const DevPasswordModal: React.FC<DevPasswordModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  actionTitle = 'Developer Verification',
  actionDescription = 'Enter the developer password to authorize global broadcast announcements.',
}) => {
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!password) {
      setError('Please enter the developer password.');
      return;
    }

    if (verifyDevPassword(password)) {
      setError(null);
      setPassword('');
      onSuccess();
    } else {
      setError('Incorrect Developer Password. Access denied.');
    }
  };

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center p-3 sm:p-4 bg-black/50 backdrop-blur-xs animate-fade-in">
      <div className="bg-white dark:bg-[#18181b] rounded-2xl max-w-md w-full border border-neutral-200 dark:border-neutral-800 shadow-xl transition-all text-neutral-900 dark:text-neutral-100 overflow-hidden">
        
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-neutral-100 dark:border-neutral-800 text-xs shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-neutral-100 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300 flex items-center justify-center">
              <Lock className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-bold text-sm text-neutral-900 dark:text-white">
                {actionTitle}
              </h3>
              <p className="text-[11px] text-neutral-500 dark:text-neutral-400">
                Authentication required
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body */}
        <form onSubmit={handleSubmit} className="p-5 space-y-4 text-xs">
          <div className="p-3 rounded-xl bg-neutral-50 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 text-neutral-600 dark:text-neutral-400 leading-relaxed">
            <span>{actionDescription}</span>
          </div>

          {error && (
            <div className="flex items-center gap-2 p-2.5 text-xs text-rose-700 bg-rose-50 dark:bg-rose-950/40 dark:text-rose-300 rounded-xl border border-rose-200 dark:border-rose-900">
              <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <div className="space-y-1.5">
            <label className="block text-[11px] font-semibold text-neutral-600 dark:text-neutral-400 uppercase tracking-wider">
              Developer Password *
            </label>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                autoFocus
                value={password}
                onChange={e => {
                  setPassword(e.target.value);
                  if (error) setError(null);
                }}
                placeholder="Enter password..."
                className="w-full pl-3 pr-10 py-2 rounded-xl text-xs bg-neutral-50 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 text-neutral-900 dark:text-white outline-none focus:border-neutral-400 dark:focus:border-neutral-600 font-mono"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200 p-1 cursor-pointer"
                tabIndex={-1}
              >
                {showPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
              </button>
            </div>
          </div>

          <div className="flex items-center justify-end gap-2 pt-2 border-t border-neutral-100 dark:border-neutral-800">
            <button
              type="button"
              onClick={onClose}
              className="px-3.5 py-1 text-xs font-semibold text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded-xl transition-colors cursor-pointer min-h-[32px] h-8"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-1 text-xs font-semibold text-white bg-neutral-900 hover:bg-neutral-800 dark:bg-white dark:text-neutral-950 dark:hover:bg-neutral-200 rounded-xl transition-colors cursor-pointer min-h-[32px] h-8 active:scale-95 flex items-center gap-1.5"
            >
              <Lock className="w-3.5 h-3.5" />
              <span>Verify & Continue</span>
            </button>
          </div>
        </form>

      </div>
    </div>
  );
};
