import React, { useState, useEffect } from 'react';
import {
  X,
  CheckCircle2,
  AlertTriangle,
  Copy,
  Check,
  ExternalLink,
  Key,
  Server,
  RefreshCw,
  BookOpen
} from '../common/MovingIcon';
import { ConfirmModal } from '../common/ConfirmModal';
import {
  getSupabaseConfig,
  saveSupabaseConfig,
  clearSupabaseConfig,
  testSupabaseConnection
} from '../../services/supabaseClient';

interface DatabaseConfigModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfigSaved: () => void;
}

export const DatabaseConfigModal: React.FC<DatabaseConfigModalProps> = ({
  isOpen,
  onClose,
  onConfigSaved,
}) => {
  const [url, setUrl] = useState('');
  const [anonKey, setAnonKey] = useState('');
  const [isTesting, setIsTesting] = useState(false);
  const [testResult, setTestResult] = useState<{ success: boolean; message: string; tablesFound?: string[] } | null>(null);
  const [copiedSql, setCopiedSql] = useState(false);
  const [activeTab, setActiveTab] = useState<'config' | 'guide' | 'sql'>('config');
  const [showDisconnectConfirm, setShowDisconnectConfirm] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    const cfg = getSupabaseConfig();
    setUrl(cfg.url);
    setAnonKey(cfg.anonKey);
    setTestResult(null);
  }, [isOpen]);

  if (!isOpen) return null;

  const handleTest = async () => {
    setIsTesting(true);
    setTestResult(null);
    const res = await testSupabaseConnection({ url: url.trim(), anonKey: anonKey.trim() });
    setTestResult(res);
    setIsTesting(false);
  };

  const handleSave = async () => {
    saveSupabaseConfig({ url: url.trim(), anonKey: anonKey.trim() });
    onConfigSaved();
    onClose();
  };

  const handleDisconnect = () => {
    clearSupabaseConfig();
    setUrl('');
    setAnonKey('');
    setTestResult(null);
    onConfigSaved();
  };

  const sqlCode = `-- Schedy Team Cloud Database Schema (Schedules & Announcements)
-- Run this in your Supabase SQL Editor to enable shared live syncing

-- 1. Schedules Table
CREATE TABLE IF NOT EXISTS public.schedules (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title TEXT NOT NULL,
    description TEXT DEFAULT '',
    start_time TIMESTAMPTZ NOT NULL,
    end_time TIMESTAMPTZ NOT NULL,
    is_all_day BOOLEAN DEFAULT false,
    category TEXT DEFAULT 'general',
    priority TEXT DEFAULT 'medium',
    status TEXT DEFAULT 'pending',
    location TEXT DEFAULT '',
    meeting_url TEXT DEFAULT '',
    recurrence_rule TEXT DEFAULT 'none',
    created_by TEXT DEFAULT 'User',
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- 2. Announcements Table
CREATE TABLE IF NOT EXISTS public.announcements (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title TEXT NOT NULL,
    content TEXT NOT NULL,
    priority TEXT DEFAULT 'general',
    category TEXT DEFAULT 'general',
    is_pinned BOOLEAN DEFAULT false,
    expires_at TIMESTAMPTZ,
    author_name TEXT DEFAULT 'Admin',
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- 3. Announcement Reads Table
CREATE TABLE IF NOT EXISTS public.announcement_reads (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    announcement_id UUID REFERENCES public.announcements(id) ON DELETE CASCADE,
    user_id TEXT NOT NULL,
    read_at TIMESTAMPTZ DEFAULT now(),
    UNIQUE(announcement_id, user_id)
);

-- 4. Notes & Notepad Table
CREATE TABLE IF NOT EXISTS public.notes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title TEXT NOT NULL,
    content TEXT NOT NULL DEFAULT '',
    color TEXT NOT NULL DEFAULT 'default',
    is_pinned BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- 5. Enable Row Level Security (RLS)
ALTER TABLE public.schedules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.announcements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.announcement_reads ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notes ENABLE ROW LEVEL SECURITY;

-- 6. Public Access Policies
CREATE POLICY "Allow public read schedules" ON public.schedules FOR SELECT USING (true);
CREATE POLICY "Allow public insert schedules" ON public.schedules FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow public update schedules" ON public.schedules FOR UPDATE USING (true);
CREATE POLICY "Allow public delete schedules" ON public.schedules FOR DELETE USING (true);

CREATE POLICY "Allow public read announcements" ON public.announcements FOR SELECT USING (true);
CREATE POLICY "Allow public insert announcements" ON public.announcements FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow public update announcements" ON public.announcements FOR UPDATE USING (true);
CREATE POLICY "Allow public delete announcements" ON public.announcements FOR DELETE USING (true);

CREATE POLICY "Allow public read reads" ON public.announcement_reads FOR SELECT USING (true);
CREATE POLICY "Allow public insert reads" ON public.announcement_reads FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow public update reads" ON public.announcement_reads FOR UPDATE USING (true);
CREATE POLICY "Allow public delete reads" ON public.announcement_reads FOR DELETE USING (true);

CREATE POLICY "Allow public read notes" ON public.notes FOR SELECT USING (true);
CREATE POLICY "Allow public insert notes" ON public.notes FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow public update notes" ON public.notes FOR UPDATE USING (true);
CREATE POLICY "Allow public delete notes" ON public.notes FOR DELETE USING (true);

-- 7. Enable Realtime Live Sync
ALTER PUBLICATION supabase_realtime ADD TABLE public.schedules;
ALTER PUBLICATION supabase_realtime ADD TABLE public.announcements;
ALTER PUBLICATION supabase_realtime ADD TABLE public.announcement_reads;
ALTER PUBLICATION supabase_realtime ADD TABLE public.notes;`;

  const copyToClipboard = () => {
    navigator.clipboard.writeText(sqlCode);
    setCopiedSql(true);
    setTimeout(() => setCopiedSql(false), 3000);
  };

  return (
    <>
      {showDisconnectConfirm && (
        <ConfirmModal
          isOpen={showDisconnectConfirm}
          onClose={() => setShowDisconnectConfirm(false)}
          onConfirm={() => {
            handleDisconnect();
            setShowDisconnectConfirm(false);
          }}
          title="Disconnect Calendar Database"
          message="Switch back to local storage? Your events will remain saved locally on this browser."
          confirmText="Disconnect"
          isDanger={true}
        />
      )}

      <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-black/50 backdrop-blur-sm animate-fade-in">
        <div className="bg-white dark:bg-[#1c1c1e] rounded-t-[28px] sm:rounded-[24px] max-w-2xl w-full max-h-[90vh] overflow-y-auto border border-black/[0.08] dark:border-white/[0.12] shadow-2xl transition-all text-neutral-900 dark:text-neutral-100">

          {/* iOS Sheet Grab Handle for Mobile */}
          <div className="sm:hidden pt-2.5 pb-1 flex justify-center shrink-0">
            <div className="ios-sheet-handle" />
          </div>

          {/* Header */}
          <div className="flex items-center justify-between px-4 sm:px-6 py-3 border-b border-black/[0.06] dark:border-white/[0.08] text-xs shrink-0">
            <button
              type="button"
              onClick={onClose}
              className="text-xs font-medium text-[#007aff] dark:text-[#0a84ff] hover:opacity-80 transition-opacity cursor-pointer min-h-[32px] flex items-center"
            >
              Done
            </button>

            <div className="flex items-center gap-1.5 font-semibold text-xs text-neutral-900 dark:text-white">
              <Server className="w-3.5 h-3.5 text-[#007aff] dark:text-[#0a84ff]" />
              <span>Cloud Database Sync</span>
            </div>

            <button
              onClick={onClose}
              className="p-1.5 rounded-full text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200 hover:bg-black/5 dark:hover:bg-white/10 transition-colors cursor-pointer"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* iOS Segmented Control Tabs */}
          <div className="px-4 sm:px-6 pt-3.5 pb-1">
            <div className="ios-segmented-control w-full">
              <button
                onClick={() => setActiveTab('config')}
                className={`ios-segmented-item flex-1 ${
                  activeTab === 'config' ? 'ios-segmented-item-active' : ''
                }`}
              >
                Connection
              </button>
              <button
                onClick={() => setActiveTab('guide')}
                className={`ios-segmented-item flex-1 gap-1 ${
                  activeTab === 'guide' ? 'ios-segmented-item-active' : ''
                }`}
              >
                <BookOpen className="w-3 h-3" />
                <span>Guide</span>
              </button>
              <button
                onClick={() => setActiveTab('sql')}
                className={`ios-segmented-item flex-1 gap-1 ${
                  activeTab === 'sql' ? 'ios-segmented-item-active' : ''
                }`}
              >
                <Server className="w-3 h-3" />
                <span>SQL</span>
              </button>
            </div>
          </div>

          {/* Content Body */}
          <div className="p-4 sm:p-6 space-y-5">

            {/* Tab 1: Config */}
            {activeTab === 'config' && (
              <div className="space-y-4">
                <div className="p-3.5 rounded-2xl bg-blue-50/70 dark:bg-blue-950/30 border border-blue-200/80 dark:border-blue-800/50 text-xs text-neutral-700 dark:text-neutral-300">
                  <p className="font-semibold text-neutral-900 dark:text-white mb-1">
                    Real-time Calendar Sync with Team & Devices
                  </p>
                  Connect your own free Supabase PostgreSQL database to sync your schedule in real-time with family, teammates, or other devices. If not configured, Schedy runs locally in <strong>Local Storage Mode</strong>.
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-300 mb-1.5">
                    Supabase Project URL *
                  </label>
                <div className="relative">
                  <Server className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                  <input
                    type="url"
                    value={url}
                    onChange={e => setUrl(e.target.value)}
                    placeholder="https://your-project-id.supabase.co"
                    className="w-full pl-10 pr-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-300 mb-1.5">
                    Supabase Anon Public API Key *
                  </label>
                  <div className="relative">
                    <Key className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                    <input
                      type="password"
                      value={anonKey}
                      onChange={e => setAnonKey(e.target.value)}
                      placeholder="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
                      className="w-full pl-10 pr-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white text-sm font-mono focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    />
                  </div>
                </div>

                {testResult && (
                  <div
                    className={`p-3.5 rounded-xl border text-xs font-medium flex items-start gap-2.5 ${testResult.success
                      ? 'bg-emerald-50 text-emerald-800 border-emerald-200 dark:bg-emerald-950/60 dark:text-emerald-200 dark:border-emerald-800'
                      : 'bg-rose-50 text-rose-800 border-rose-200 dark:bg-rose-950/60 dark:text-rose-200 dark:border-rose-800'
                      }`}
                  >
                    {testResult.success ? (
                      <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                    ) : (
                      <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                    )}
                    <div>
                      <p className="font-semibold">{testResult.message}</p>
                      {testResult.tablesFound && (
                        <p className="text-[11px] opacity-80 mt-1">
                          Verified tables: {testResult.tablesFound.join(', ')}
                        </p>
                      )}
                    </div>
                  </div>
                )}

                <div className="flex items-center justify-between pt-3 border-t border-black/[0.06] dark:border-white/[0.08]">
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={handleTest}
                      disabled={isTesting || !url || !anonKey}
                      className="ios-btn-tinted flex items-center gap-1.5 px-3.5 py-2 rounded-[12px] text-xs font-semibold disabled:opacity-50 transition-colors cursor-pointer min-h-[38px]"
                    >
                      <RefreshCw className={`w-3.5 h-3.5 ${isTesting ? 'animate-spin' : ''}`} />
                      <span>{isTesting ? 'Testing...' : 'Test Connection'}</span>
                    </button>

                    {(url || anonKey) && (
                      <button
                        type="button"
                        onClick={() => setShowDisconnectConfirm(true)}
                        className="px-2.5 py-1.5 text-xs font-medium text-[#ff3b30] hover:bg-[#ff3b30]/10 rounded-[10px] transition-colors cursor-pointer"
                      >
                        Use Local Mode
                      </button>
                    )}
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={onClose}
                      className="ios-btn-tinted px-4 py-2 text-xs font-semibold rounded-[12px] transition-colors cursor-pointer min-h-[38px]"
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      onClick={handleSave}
                      disabled={!url || !anonKey}
                      className="ios-btn-filled px-5 py-2 text-xs font-semibold text-white bg-[#34c759] hover:bg-[#30d158] rounded-[12px] shadow-xs disabled:opacity-50 transition-all active:scale-[0.98] cursor-pointer min-h-[38px]"
                    >
                      Save & Connect
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Tab 2: Guide */}
            {activeTab === 'guide' && (
              <div className="space-y-4 text-xs text-slate-700 dark:text-slate-300">
                <div className="space-y-3">
                  <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700">
                    <div className="flex items-center gap-2 font-bold text-slate-900 dark:text-white mb-1">
                      <span className="w-5 h-5 rounded-full bg-emerald-600 text-white flex items-center justify-center text-[10px]">1</span>
                      Create a Free Account on Supabase
                    </div>
                    <p className="text-slate-500 dark:text-slate-400 ml-7 mb-2">
                      Supabase provides free cloud PostgreSQL with no credit card required.
                    </p>
                    <a
                      href="https://supabase.com"
                      target="_blank"
                      rel="noreferrer"
                      className="ml-7 inline-flex items-center gap-1 font-semibold text-emerald-600 hover:underline"
                    >
                      <span>Go to supabase.com</span>
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  </div>

                  <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700">
                    <div className="flex items-center gap-2 font-bold text-slate-900 dark:text-white mb-1">
                      <span className="w-5 h-5 rounded-full bg-emerald-600 text-white flex items-center justify-center text-[10px]">2</span>
                      Create New Project & Run Schema Script
                    </div>
                    <p className="text-slate-500 dark:text-slate-400 ml-7">
                      Click <strong>New Project</strong>, give it a name and password. Once initialized, open the <strong>SQL Editor</strong> tab, paste the code from the <strong>SQL Schema Script</strong> tab, and click <strong>Run</strong>.
                    </p>
                  </div>

                  <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700">
                    <div className="flex items-center gap-2 font-bold text-slate-900 dark:text-white mb-1">
                      <span className="w-5 h-5 rounded-full bg-emerald-600 text-white flex items-center justify-center text-[10px]">3</span>
                      Copy API Keys & Connect
                    </div>
                    <p className="text-slate-500 dark:text-slate-400 ml-7">
                      Navigate to <strong>Project Settings -&gt; API</strong>. Copy the <strong>Project URL</strong> and <strong>anon public</strong> key, paste them in the <strong>Connection Settings</strong> tab here, and click <strong>Save & Connect</strong>!
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Tab 3: SQL Script */}
            {activeTab === 'sql' && (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-slate-600 dark:text-slate-400">
                    Copy and paste this into Supabase SQL Editor:
                  </span>
                  <button
                    onClick={copyToClipboard}
                    className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl shadow-sm transition-all"
                  >
                    {copiedSql ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>{copiedSql ? 'Copied!' : 'Copy SQL Schema'}</span>
                  </button>
                </div>

                <pre className="p-4 rounded-xl bg-slate-900 text-slate-100 font-mono text-[11px] leading-relaxed max-h-[300px] overflow-y-auto border border-slate-800 select-all">
                  {sqlCode}
                </pre>
              </div>
            )}

          </div>
        </div>
      </div>
    </>
  );
};
