import React, { useState, useEffect } from 'react';
import type { ScheduleEvent } from '../../types/schedule';
import type { Announcement } from '../../types/announcement';
import { 
  X, 
  Share2, 
  Copy, 
  Check, 
  Calendar, 
  Layers, 
  Link as LinkIcon, 
  AlertCircle, 
  Sparkles, 
  ArrowRight 
} from '../common/MovingIcon';
import { 
  generateShareCode, 
  generateShareUrl, 
  parseShareCode,
  type SyncPayload
} from '../../services/shareCodeService';
import { format, parseISO } from 'date-fns';

interface ShareCodeModalProps {
  isOpen: boolean;
  onClose: () => void;
  events: ScheduleEvent[];
  announcements: Announcement[];
  onApplySync: (importedEvents: ScheduleEvent[], importedAnnos: Announcement[], mode: 'replace' | 'merge') => void;
  initialCode?: string;
}

export const ShareCodeModal: React.FC<ShareCodeModalProps> = ({
  isOpen,
  onClose,
  events,
  announcements,
  onApplySync,
  initialCode = '',
}) => {
  const [activeTab, setActiveTab] = useState<'generate' | 'join'>(initialCode ? 'join' : 'generate');
  const [generatedCode, setGeneratedCode] = useState('');
  const [copiedCode, setCopiedCode] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);

  // Join Tab state
  const [inputCode, setInputCode] = useState(initialCode);
  const [previewData, setPreviewData] = useState<SyncPayload | null>(null);
  const [parseError, setParseError] = useState<string | null>(null);

  // Auto-generate code when tab is active or events change
  useEffect(() => {
    if (!isOpen) return;
    if (activeTab === 'generate') {
      const code = generateShareCode(events, announcements);
      setGeneratedCode(code);
    }
  }, [isOpen, activeTab, events, announcements]);

  // Auto-parse input code if initial code provided or typed
  useEffect(() => {
    if (!isOpen) return;
    if (inputCode.trim()) {
      const res = parseShareCode(inputCode);
      if (res.success && res.data) {
        setPreviewData(res.data);
        setParseError(null);
      } else {
        setPreviewData(null);
        setParseError(res.error || 'Invalid code');
      }
    } else {
      setPreviewData(null);
      setParseError(null);
    }
  }, [isOpen, inputCode]);

  if (!isOpen) return null;

  const handleCopyCode = () => {
    navigator.clipboard.writeText(generatedCode);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2500);
  };

  const handleCopyLink = () => {
    const url = generateShareUrl(generatedCode);
    navigator.clipboard.writeText(url);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2500);
  };

  const handleApply = (mode: 'replace' | 'merge') => {
    if (!previewData) return;
    onApplySync(previewData.events, previewData.announcements || [], mode);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/50 backdrop-blur-sm animate-fade-in">
      <div className="bg-white/95 dark:bg-[#161619]/95 backdrop-blur-2xl rounded-2xl max-w-2xl w-full max-h-[92vh] overflow-y-auto border border-neutral-200/80 dark:border-neutral-800/80 shadow-2xl transition-all text-[#1c1917] dark:text-[#f4f4f5]">
        
        {/* Top Header */}
        <div className="flex items-center justify-between px-4 sm:px-6 py-3.5 sm:py-4 border-b border-neutral-100 dark:border-neutral-800/80 text-xs">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-xl bg-blue-500/10 text-[#2383e2] flex items-center justify-center">
              <Share2 className="w-4 h-4 shrink-0" />
            </div>
            <span className="font-bold text-sm text-[#1c1917] dark:text-white">
              Calendar Sync & Share Code
            </span>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Tab Switcher */}
        <div className="px-4 sm:px-6 pt-4 pb-2">
          <div className="flex items-center p-1 rounded-xl bg-neutral-100/70 dark:bg-neutral-900/70 border border-neutral-200/60 dark:border-neutral-800/60 text-xs shadow-inner">
            <button
              onClick={() => setActiveTab('generate')}
              className={`flex-1 py-1.5 font-semibold text-center rounded-lg transition-all ${
                activeTab === 'generate'
                  ? 'bg-white dark:bg-[#202024] text-[#1c1917] dark:text-white shadow-xs'
                  : 'text-neutral-500 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white'
              }`}
            >
              Share My Calendar
            </button>
            <button
              onClick={() => setActiveTab('join')}
              className={`flex-1 py-1.5 font-semibold text-center rounded-lg transition-all ${
                activeTab === 'join'
                  ? 'bg-white dark:bg-[#202024] text-[#1c1917] dark:text-white shadow-xs'
                  : 'text-neutral-500 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white'
              }`}
            >
              Join / Enter Code
            </button>
          </div>
        </div>

        <div className="p-4 sm:p-7">
          {/* TAB 1: GENERATE SHARE CODE */}
          {activeTab === 'generate' && (
            <div className="space-y-5 text-xs">
              <div>
                <h3 className="text-sm font-semibold text-[#37352f] dark:text-white">
                  Share Your Exact Calendar
                </h3>
                <p className="text-neutral-500 dark:text-neutral-400 mt-1 leading-relaxed">
                  Generate a portable Sync Code or 1-click URL. Anyone who enters this code will receive an exact mirror of your {events.length} schedule event{events.length === 1 ? '' : 's'}.
                </p>
              </div>

              {/* Stats pill */}
              <div className="flex items-center gap-2 p-3 bg-neutral-50 dark:bg-neutral-800/60 rounded-lg border border-[#e9e9e7] dark:border-[#2e2e2e]">
                <Calendar className="w-4 h-4 text-[#2383e2] shrink-0" />
                <span className="text-neutral-600 dark:text-neutral-300">
                  Ready to package <strong>{events.length} events</strong> and <strong>{announcements.length} notices</strong>.
                </span>
              </div>

              {/* Monospace Code Display */}
              <div>
                <label className="block text-[11px] font-medium text-neutral-500 mb-1.5">
                  Generated Sync Code:
                </label>
                <div className="relative">
                  <textarea
                    readOnly
                    value={generatedCode}
                    rows={3}
                    className="w-full p-3 font-mono text-[11px] bg-neutral-50 dark:bg-neutral-900 text-neutral-700 dark:text-neutral-300 rounded-lg border border-[#e9e9e7] dark:border-[#2e2e2e] outline-none select-all resize-none leading-relaxed"
                  />
                  <button
                    onClick={handleCopyCode}
                    className="absolute top-2.5 right-2.5 flex items-center gap-1 px-2.5 py-1 text-xs font-medium bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-md shadow-xs hover:bg-neutral-50 transition-all text-neutral-700 dark:text-neutral-200"
                  >
                    {copiedCode ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>{copiedCode ? 'Copied!' : 'Copy Code'}</span>
                  </button>
                </div>
              </div>

              {/* Shareable Link Box */}
              <div className="pt-2 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5 p-3 rounded-lg border border-[#e9e9e7] dark:border-[#2e2e2e] bg-neutral-50/50 dark:bg-neutral-800/30">
                <div className="flex items-center gap-2 min-w-0">
                  <LinkIcon className="w-3.5 h-3.5 text-neutral-400 shrink-0" />
                  <span className="truncate text-[11px] text-neutral-500 font-mono">
                    {generateShareUrl(generatedCode).substring(0, 50)}...
                  </span>
                </div>

                <button
                  onClick={handleCopyLink}
                  className="flex items-center justify-center gap-1 px-3 py-1.5 text-xs font-medium text-white bg-[#2383e2] hover:bg-[#1a73e8] rounded shadow-xs transition-all shrink-0"
                >
                  {copiedLink ? <Check className="w-3.5 h-3.5" /> : <Share2 className="w-3.5 h-3.5" />}
                  <span>{copiedLink ? 'Link Copied!' : 'Copy Share Link'}</span>
                </button>
              </div>
            </div>
          )}

          {/* TAB 2: ENTER / JOIN WITH CODE */}
          {activeTab === 'join' && (
            <div className="space-y-5 text-xs">
              <div>
                <h3 className="text-sm font-semibold text-[#37352f] dark:text-white">
                  Import Calendar via Sync Code
                </h3>
                <p className="text-neutral-500 dark:text-neutral-400 mt-1 leading-relaxed">
                  Paste the Sync Code or shared link below to preview and synchronize the schedule.
                </p>
              </div>

              {/* Input Box */}
              <div>
                <label className="block text-[11px] font-medium text-neutral-500 mb-1.5">
                  Paste Code or Share Link:
                </label>
                <textarea
                  value={inputCode}
                  onChange={e => setInputCode(e.target.value)}
                  placeholder="Paste SYNC-... code or full link here"
                  rows={3}
                  className="w-full p-3 font-mono text-xs bg-neutral-50 dark:bg-neutral-900 text-neutral-800 dark:text-neutral-200 rounded-lg border border-[#e9e9e7] dark:border-[#2e2e2e] outline-none focus:ring-1 focus:ring-neutral-400 resize-none leading-relaxed"
                />
              </div>

              {/* Parse Error */}
              {parseError && inputCode.trim() && (
                <div className="flex items-center gap-2 p-3 text-xs text-rose-700 bg-rose-50 dark:bg-rose-950/40 dark:text-rose-300 rounded-lg border border-rose-200 dark:border-rose-900">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{parseError}</span>
                </div>
              )}

              {/* Preview Box */}
              {previewData && (
                <div className="p-4 rounded-xl border border-emerald-200 dark:border-emerald-900/60 bg-emerald-50/50 dark:bg-emerald-950/20 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Sparkles className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                      <span className="font-semibold text-emerald-800 dark:text-emerald-300">
                        {previewData.events.length} Event{previewData.events.length === 1 ? '' : 's'} Ready to Sync
                      </span>
                    </div>
                    <span className="text-[10px] text-neutral-400 font-mono">
                      Exported: {format(parseISO(previewData.createdAt), 'MMM d, yyyy, h:mm a')}
                    </span>
                  </div>

                  {/* Sample items list */}
                  <div className="max-h-36 overflow-y-auto space-y-1.5 pr-1">
                    {previewData.events.map((evt, idx) => (
                      <div
                        key={idx}
                        className="flex items-center justify-between p-2 rounded bg-white dark:bg-neutral-800/80 border border-emerald-100 dark:border-emerald-900/40 text-[11px]"
                      >
                        <div className="flex items-center gap-2 truncate">
                          <span className="font-medium text-neutral-800 dark:text-neutral-200 truncate">
                            {evt.title}
                          </span>
                          <span className="text-[10px] text-neutral-400">
                            {format(parseISO(evt.startTime), 'MMM d, h:mm a')}
                          </span>
                        </div>
                        <span className="text-[10px] px-1.5 py-0.2 rounded bg-neutral-100 dark:bg-neutral-700 text-neutral-600 dark:text-neutral-300 capitalize shrink-0">
                          {evt.category}
                        </span>
                      </div>
                    ))}
                  </div>

                  {/* Action Choices */}
                  <div className="pt-2 border-t border-emerald-100 dark:border-emerald-900/40 flex flex-col sm:flex-row items-stretch sm:items-center justify-end gap-2">
                    <button
                      onClick={() => handleApply('merge')}
                      className="flex items-center justify-center gap-1.5 px-3.5 py-1.5 text-xs font-medium text-neutral-700 dark:text-neutral-200 bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 hover:bg-neutral-50 rounded transition-colors"
                      title="Add only new events without removing your current ones"
                    >
                      <Layers className="w-3.5 h-3.5 text-[#2383e2]" />
                      <span>Merge with My Calendar</span>
                    </button>

                    <button
                      onClick={() => handleApply('replace')}
                      className="flex items-center justify-center gap-1.5 px-4 py-1.5 text-xs font-medium text-white bg-emerald-600 hover:bg-emerald-500 rounded shadow-xs transition-colors"
                      title="Replace current calendar with exact copy"
                    >
                      <ArrowRight className="w-3.5 h-3.5" />
                      <span>Replace My Calendar (Exact Copy)</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

        </div>

      </div>
    </div>
  );
};
