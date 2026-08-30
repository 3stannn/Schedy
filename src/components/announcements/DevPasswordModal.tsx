import React, { useState } from 'react';
import { Lock, X, Eye, EyeOff, AlertTriangle, Sparkles } from 'lucide-react';
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
  actionDescription = 'Enter the Developer Password to publish or manage Universal Dev Announcements broadcasted to all users.',
}) => {
  if (!isOpen) return null;

  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);

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
    <div className="fixed inset-0 z-[70] flex items-center justify-center p-3 sm:p-4 bg-black/70 backdrop-blur-md animate-fade-in">
      <div className="bg-white/95 dark:bg-[#161619]/95 backdrop-blur-2xl rounded-2xl max-w-md w-full border border-purple-500/30 dark:border-purple-500/30 shadow-2xl transition-all text-[#1c1917] dark:text-[#f4f4f5]">
        
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-neutral-100 dark:border-neutral-800/80">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-purple-500/10 text-purple-600 dark:text-purple-400 flex items-center justify-center">
              <Sparkles className="w-4 h-4 shrink-0" />
            </div>
            <div>
              <h3 className="font-bold text-sm text-[#1c1917] dark:text-white">
                {actionTitle}
              </h3>
              <p className="text-[11px] text-neutral-400">
                Universal Broadcast Authorization
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body */}
        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          <div className="p-3 rounded-xl bg-purple-50/70 dark:bg-purple-950/30 border border-purple-200/80 dark:border-purple-800/50 text-xs text-purple-900 dark:text-purple-200 leading-relaxed">
            <div className="flex items-start gap-2">
              <Lock className="w-3.5 h-3.5 mt-0.5 text-purple-600 dark:text-purple-400 shrink-0" />
              <span>{actionDescription}</span>
            </div>
          </div>

          {error && (
            <div className="flex items-center gap-2 p-2.5 text-xs text-rose-700 bg-rose-50 dark:bg-rose-950/40 dark:text-rose-300 rounded-xl border border-rose-200 dark:border-rose-900">
              <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold text-neutral-700 dark:text-neutral-300 mb-1.5">
              Developer Password
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
                className="w-full pl-3 pr-10 py-2 rounded-xl text-xs bg-neutral-100/80 dark:bg-neutral-900/80 border border-neutral-200 dark:border-neutral-800 text-neutral-900 dark:text-white outline-none focus:ring-1 focus:ring-purple-500 font-mono"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200 p-1"
                tabIndex={-1}
              >
                {showPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
              </button>
            </div>
          </div>

          <div className="flex items-center justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-3.5 py-1.5 text-xs text-neutral-500 hover:text-neutral-800 dark:hover:text-neutral-200 hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded-xl transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-1.5 text-xs font-semibold text-white bg-purple-600 hover:bg-purple-700 rounded-xl shadow-xs transition-all active:scale-95 flex items-center gap-1.5"
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

