import React, { useState } from 'react';
import schedyLogo from '../../assets/schedy.png';
import schedyPinkLogo from '../../assets/schedypink.png';
import {
  Database,
  Download,
  Share2,
  Plus,
  Sun,
  Moon,
  Flower2,
  Menu,
  X,
  Timer,
  Trash2
} from '../common/MovingIcon';
import { LogOut } from 'lucide-react';
import { haptics } from '../../utils/haptics';

import type { PomodoroInfo } from '../tools/PomodoroTimer';
import type { UserProfile } from '../../types/auth';

interface NavbarProps {
  activeTab: 'schedule' | 'announcements' | 'overview' | 'tasks' | 'pomodoro';
  setActiveTab: (tab: 'schedule' | 'announcements' | 'overview' | 'tasks' | 'pomodoro') => void;
  unreadCount: number;
  isCloudConnected: boolean;
  theme: 'light' | 'dark' | 'pink';
  onToggleTheme: () => void;
  onTogglePinkTheme: () => void;
  onOpenConfig: () => void;
  onOpenExport: () => void;
  onOpenShare: () => void;
  onOpenClearAll: () => void;
  onNewEvent: () => void;
  onNewAnnouncement: () => void;
  onNewTask?: () => void;
  pomodoroInfo?: PomodoroInfo;
  onOpenAISchedule: () => void;
  user: UserProfile | null;
  onOpenAuth: () => void;
  onOpenUpgrade: () => void;
  onSignOut: () => void;
}


export const Navbar: React.FC<NavbarProps> = ({
  activeTab,
  setActiveTab,
  unreadCount,
  isCloudConnected,
  theme,
  onToggleTheme,
  onTogglePinkTheme,
  onOpenConfig,
  onOpenExport,
  onOpenShare,
  onOpenClearAll,
  onNewEvent,
  onNewAnnouncement,
  onNewTask,
  pomodoroInfo,
  onOpenAISchedule: _onOpenAISchedule,
  user,
  onOpenAuth,
  onOpenUpgrade: _onOpenUpgrade,
  onSignOut,
}) => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const currentLogo = theme === 'pink' ? schedyPinkLogo : schedyLogo;

  const handleSelectTab = (tab: typeof activeTab) => {
    haptics.selection();
    setActiveTab(tab);
  };

  const handleActionAndClose = (action: () => void) => {
    haptics.light();
    action();
    setMobileMenuOpen(false);
  };

  const handlePrimaryNewAction = () => {
    haptics.medium();
    if (activeTab === 'announcements') {
      onNewAnnouncement();
    } else if (activeTab === 'tasks' && onNewTask) {
      onNewTask();
    } else if (activeTab === 'pomodoro' && onNewTask) {
      onNewTask();
    } else {
      onNewEvent();
    }
  };

  const getPrimaryButtonText = () => {
    if (activeTab === 'announcements') return 'New Notice';
    if (activeTab === 'tasks') return 'New Task';
    if (activeTab === 'pomodoro') return 'New Task';
    return 'New Event';
  };

  return (
    <>
      {/* ========================================================================= */}
      {/* DESKTOP VERTICAL SIDEBAR (Visible on md and above)                       */}
      {/* ========================================================================= */}
      <aside className="hidden md:flex md:w-60 lg:w-64 md:flex-col md:fixed md:inset-y-0 md:left-0 md:z-30 border-r border-black/[0.08] dark:border-white/[0.1] bg-white/80 dark:bg-[#161618]/85 backdrop-blur-2xl p-3.5 justify-between transition-colors duration-300">

        {/* Top Section: Brand + Navigation + Action */}
        <div className="space-y-4">

          {/* Brand Header Card */}
          <div className="px-3 py-2.5 rounded-[16px] bg-black/[0.03] dark:bg-white/[0.05] border border-black/[0.05] dark:border-white/[0.08] flex items-center justify-between">
            <div className="flex items-center gap-2.5 min-w-0">
              <img
                src={currentLogo}
                alt="Schedy"
                className="w-7 h-7 object-contain rounded-[8px] shrink-0"
              />
              <div className="flex flex-col justify-center min-w-0">
                <span className="font-bold text-sm tracking-tight text-neutral-900 dark:text-white leading-tight">
                  Schedy
                </span>
                <span className="text-[10px] text-neutral-500 dark:text-neutral-400 font-medium leading-tight mt-0.5">
                  Workspace & Calendar
                </span>
              </div>
            </div>

            {/* Cloud Status Indicator Dot */}
            <button
              onClick={onOpenConfig}
              className="p-1.5 rounded-full hover:bg-black/5 dark:hover:bg-white/10 transition-colors flex items-center justify-center shrink-0 cursor-pointer"
              title={isCloudConnected ? 'Cloud Synced' : 'Offline / Local'}
            >
              <span className={`block w-2 h-2 rounded-full ${isCloudConnected ? 'bg-[#34c759] shadow-[0_0_6px_rgba(52,199,89,0.5)]' : 'bg-neutral-400'}`} />
            </button>
          </div>

          {/* Primary "+ New" Action Button - iOS Filled Button */}
          <div className="grid grid-cols-2 gap-1.5">
            <button
              onClick={handlePrimaryNewAction}
              className="w-full flex items-center justify-center gap-1.5 px-2 py-1.5 text-xs font-semibold text-white bg-[#007aff] hover:bg-[#0071e3] dark:bg-[#0a84ff] dark:hover:bg-[#0077ed] rounded-xl transition-all active:scale-[0.98] cursor-pointer min-h-[32px] h-8"
              title="Create New Item"
            >
              <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
              <span>{getPrimaryButtonText()}</span>
            </button>

            <button
              disabled
              className="w-full flex items-center justify-center px-2 py-1.5 text-xs font-semibold text-neutral-400 dark:text-neutral-500 bg-black/[0.04] dark:bg-white/[0.05] rounded-xl cursor-not-allowed opacity-60 min-h-[32px] h-8"
              title="Import (Disabled)"
            >
              <span>Import</span>
            </button>

          </div>


          {/* Vertical Segmented View Switcher */}
          <div className="space-y-1">
            <span className="px-2 text-[10px] font-bold uppercase tracking-wider text-neutral-400 dark:text-neutral-500">
              Views
            </span>

            <nav className="p-1 rounded-[14px] bg-black/[0.05] dark:bg-white/[0.07] border border-black/[0.04] dark:border-white/[0.06] flex flex-col gap-0.5">
              <button
                onClick={() => handleSelectTab('schedule')}
                className={`w-full flex items-center justify-between px-3 py-2 rounded-[10px] text-xs font-medium transition-all cursor-pointer ${activeTab === 'schedule'
                  ? 'ios-nav-item-active bg-white dark:bg-[#636366] text-black dark:text-white shadow-xs font-semibold'
                  : 'text-neutral-600 dark:text-neutral-300 hover:text-black dark:hover:text-white hover:bg-black/5 dark:hover:bg-white/5'
                  }`}
              >
                <span>Schedule</span>
              </button>

              <button
                onClick={() => handleSelectTab('tasks')}
                className={`w-full flex items-center justify-between px-3 py-2 rounded-[10px] text-xs font-medium transition-all cursor-pointer ${activeTab === 'tasks'
                  ? 'ios-nav-item-active bg-white dark:bg-[#636366] text-black dark:text-white shadow-xs font-semibold'
                  : 'text-neutral-600 dark:text-neutral-300 hover:text-black dark:hover:text-white hover:bg-black/5 dark:hover:bg-white/5'
                  }`}
              >
                <span>Tasks</span>
              </button>

              <button
                onClick={() => handleSelectTab('announcements')}
                className={`w-full relative flex items-center justify-between px-3 py-2 rounded-[10px] text-xs font-medium transition-all cursor-pointer ${activeTab === 'announcements'
                  ? 'ios-nav-item-active bg-white dark:bg-[#636366] text-black dark:text-white shadow-xs font-semibold'
                  : 'text-neutral-600 dark:text-neutral-300 hover:text-black dark:hover:text-white hover:bg-black/5 dark:hover:bg-white/5'
                  }`}
              >
                <span>Notices</span>
                {unreadCount > 0 && (
                  <span className="px-1.5 py-0.2 text-[9px] font-bold rounded-full bg-[#ff3b30] text-white shadow-xs">
                    {unreadCount}
                  </span>
                )}
              </button>

              <button
                onClick={() => handleSelectTab('overview')}
                className={`w-full flex items-center justify-between px-3 py-2 rounded-[10px] text-xs font-medium transition-all cursor-pointer ${activeTab === 'overview'
                  ? 'ios-nav-item-active bg-white dark:bg-[#636366] text-black dark:text-white shadow-xs font-semibold'
                  : 'text-neutral-600 dark:text-neutral-300 hover:text-black dark:hover:text-white hover:bg-black/5 dark:hover:bg-white/5'
                  }`}
              >
                <span>Overview</span>
              </button>
            </nav>
          </div>

          {/* 2. Tools Category */}
          <div className="space-y-1">
            <span className="px-2 text-[10px] font-bold uppercase tracking-wider text-neutral-400 dark:text-neutral-500">
              Tools
            </span>

            <nav className="p-1 rounded-[14px] bg-black/[0.05] dark:bg-white/[0.07] border border-black/[0.04] dark:border-white/[0.06] flex flex-col gap-0.5">
              <button
                onClick={() => handleSelectTab('pomodoro')}
                className={`w-full flex items-center justify-between px-3 py-2 rounded-[10px] text-xs font-medium transition-all cursor-pointer ${activeTab === 'pomodoro'
                  ? 'ios-nav-item-active bg-white dark:bg-[#636366] text-black dark:text-white shadow-xs font-semibold'
                  : 'text-neutral-600 dark:text-neutral-300 hover:text-black dark:hover:text-white hover:bg-black/5 dark:hover:bg-white/5'
                  }`}
              >
                <span className="flex items-center gap-2">
                  <Timer className={`w-3.5 h-3.5 ${pomodoroInfo?.isRunning ? 'text-[#007aff] dark:text-[#0a84ff]' : 'text-neutral-400'}`} />
                  <span>Focus Timer</span>
                </span>
                {pomodoroInfo?.isRunning ? (
                  <span className="text-[10px] font-mono font-bold px-1.5 py-0.5 rounded-full bg-[#007aff]/15 text-[#007aff] dark:text-[#0a84ff]">
                    {Math.floor(pomodoroInfo.timeLeft / 60)}:{(pomodoroInfo.timeLeft % 60).toString().padStart(2, '0')}
                  </span>
                ) : (
                  <span className="text-[9px] font-semibold px-1.5 py-0.5 rounded-full bg-black/5 dark:bg-white/10 text-neutral-500 dark:text-neutral-400">
                    25m
                  </span>
                )}
              </button>
            </nav>
          </div>

        </div>

        {/* Bottom Utility Card: iOS Inset Grouped Card */}
        <div className="space-y-2">
          {/* <iframe
            src="https://appbuildersph.com/embed/apps/schedy"
            title="Schedy votes on App Builders PH"
            className="w-full border-0"
            height="72"
            loading="lazy"
          /> */}
          <div className="p-2 rounded-[16px] bg-black/[0.03] dark:bg-white/[0.05] border border-black/[0.05] dark:border-white/[0.08] space-y-1.5">
            {/* Share Code Button - iOS Tinted Button */}
            <button
              onClick={onOpenShare}
              className="w-full flex items-center justify-center gap-2 px-2.5 py-1.5 rounded-[10px] text-xs font-semibold text-[#007aff] dark:text-[#0a84ff] bg-[#007aff]/10 hover:bg-[#007aff]/15 transition-all active:scale-[0.98] cursor-pointer min-h-[30px] h-[30px]"
              title="Share / Sync Calendar with Code"
            >
              <Share2 className="w-3.5 h-3.5 shrink-0" />
              <span>Share Code</span>
            </button>

            {/* Database & Export Row */}
            <div className="grid grid-cols-2 gap-1">
              <button
                onClick={onOpenConfig}
                className={`flex items-center justify-center gap-1.5 px-2 py-1 rounded-[10px] text-[11px] font-medium transition-all active:scale-95 cursor-pointer h-7 ${isCloudConnected
                  ? 'text-[#34c759] bg-[#34c759]/10'
                  : 'text-neutral-600 dark:text-neutral-300 hover:bg-black/5 dark:hover:bg-white/10'
                  }`}
                title="Database Settings"
              >
                <Database className="w-3.5 h-3.5 shrink-0" />
                <span>Cloud</span>
              </button>

              <button
                onClick={onOpenExport}
                className="flex items-center justify-center gap-1.5 px-2 py-1 rounded-[10px] text-[11px] font-medium text-neutral-600 dark:text-neutral-300 hover:bg-black/5 dark:hover:bg-white/10 transition-all active:scale-95 cursor-pointer h-7"
                title="Export Data"
              >
                <Download className="w-3.5 h-3.5 shrink-0" />
                <span>Export</span>
              </button>
            </div>

            {/* Theme Toggle Controls */}
            <div className="p-1 rounded-[10px] bg-black/[0.04] dark:bg-white/[0.06] flex items-center justify-between">
              <span className="text-[10px] font-medium text-neutral-500 dark:text-neutral-400 pl-1.5 leading-none select-none">
                Appearance
              </span>

              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={onTogglePinkTheme}
                  className={`w-7 h-7 flex items-center justify-center rounded-[8px] transition-all active:scale-90 cursor-pointer ${theme === 'pink'
                    ? 'bg-[#FF8DA1]/20 text-[#FF8DA1] ring-1 ring-[#FF8DA1]/50'
                    : 'text-neutral-500 dark:text-neutral-400 hover:text-[#FF8DA1] hover:bg-black/5 dark:hover:bg-white/10'
                    }`}
                  title={theme === 'pink' ? 'Pink Theme Active' : 'Switch to Pink Theme'}
                >
                  <Flower2 className="w-3.5 h-3.5 shrink-0" />
                </button>

                <button
                  type="button"
                  onClick={onToggleTheme}
                  className={`w-7 h-7 flex items-center justify-center rounded-[8px] transition-all active:scale-90 cursor-pointer ${theme === 'dark'
                    ? 'text-amber-400 bg-white/10'
                    : 'text-neutral-600 hover:bg-black/5 dark:hover:bg-white/10'
                    }`}
                  title={theme === 'dark' ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
                >
                  <span key={theme === 'dark' ? 'sun' : 'moon'} className="theme-toggle-icon flex items-center justify-center">
                    {theme === 'dark' ? <Sun className="w-3.5 h-3.5 shrink-0" /> : <Moon className="w-3.5 h-3.5 shrink-0" />}
                  </span>
                </button>
              </div>
            </div>

            {/* All Clear Destructive Button */}
            <button
              onClick={onOpenClearAll}
              className="w-full flex items-center justify-center gap-1.5 px-2 py-1.5 rounded-[10px] text-[11px] font-medium text-[#ff3b30] dark:text-[#ff453a] hover:bg-[#ff3b30]/10 transition-all active:scale-95 cursor-pointer h-7"
              title="Clear All Schedule Data"
            >
              <Trash2 className="w-3.5 h-3.5 shrink-0" />
              <span>All Clear</span>
            </button>

            {/* Google Account / Pro Subscription Section */}
            <div className="pt-1.5 border-t border-black/[0.05] dark:border-white/[0.07]">
              {!user ? (
                <button
                  onClick={() => {
                    haptics.medium();
                    onOpenAuth();
                  }}
                  className="w-full flex items-center justify-center gap-2 px-2.5 py-1.5 rounded-[10px] text-xs font-semibold border border-black/[0.08] dark:border-white/[0.1] bg-white dark:bg-white/[0.05] hover:bg-neutral-50 dark:hover:bg-white/[0.08] text-neutral-800 dark:text-neutral-200 transition-all active:scale-[0.98] cursor-pointer min-h-[30px]"
                >
                  <svg className="w-3.5 h-3.5 shrink-0" viewBox="0 0 24 24">
                    <path fill="#4285F4" d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.82-2.4 3.68v3.05h3.88c2.27-2.09 3.665-5.17 3.665-9.17z" />
                    <path fill="#34A853" d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.1-6.72-4.93H1.25v3.15C3.26 21.36 7.33 24 12 24z" />
                    <path fill="#FBBC05" d="M5.28 14.27c-.25-.72-.38-1.49-.38-2.27s.13-1.55.38-2.27V6.58H1.25C.45 8.18 0 9.98 0 12s.45 3.82 1.25 5.42l4.03-3.15z" />
                    <path fill="#EA4335" d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.33 0 3.26 2.64 1.25 6.58l4.03 3.15c.95-2.83 3.6-4.98 6.72-4.98z" />
                  </svg>
                  <span>Sign in with Google</span>
                </button>
              ) : (
                <div className="p-1.5 rounded-[10px] bg-black/[0.02] dark:bg-white/[0.04] border border-black/[0.04] dark:border-white/[0.06] flex items-center justify-between gap-1.5">
                  <div className="flex items-center gap-1.5 min-w-0">
                    {user.avatarUrl ? (
                      <img src={user.avatarUrl} alt={user.fullName} className="w-5 h-5 rounded-full shrink-0 object-cover" />
                    ) : (
                      <div className="w-5 h-5 rounded-full bg-neutral-200 dark:bg-neutral-700 flex items-center justify-center text-[9px] font-bold text-neutral-700 dark:text-neutral-200 shrink-0">
                        {user.fullName?.charAt(0) || 'U'}
                      </div>
                    )}
                    <div className="min-w-0">
                      <div className="text-[10px] font-semibold text-neutral-900 dark:text-white truncate">
                        {user.fullName}
                      </div>
                      <div className="flex items-center gap-1">
                        {user.isPro ? (
                          <span className="px-1.5 py-0.2 text-[8px] font-bold rounded-full bg-[#007aff]/15 text-[#007aff] dark:text-[#0a84ff]">
                            PRO
                          </span>
                        ) : (
                          <button
                            disabled
                            className="text-[9px] text-neutral-400 dark:text-neutral-500 font-semibold cursor-not-allowed opacity-60"
                            title="Upgrade (Disabled)"
                          >
                            Upgrade
                          </button>
                        )}
                      </div>

                    </div>
                  </div>

                  <button
                    onClick={onSignOut}
                    className="p-1 rounded-md text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200 hover:bg-black/5 dark:hover:bg-white/10 transition-colors shrink-0 cursor-pointer"
                    title="Sign Out"
                  >
                    <LogOut className="w-3.5 h-3.5" />
                  </button>
                </div>
              )}
            </div>


          </div>
        </div>

      </aside>

      {/* ========================================================================= */}
      {/* MOBILE TOP BAR (Visible on < md)                                         */}
      {/* ========================================================================= */}
      <header className="md:hidden sticky top-0 z-40 w-full ios-nav-bar pt-safe transition-colors duration-300">
        <div className="w-full max-w-[1760px] mx-auto px-3.5 py-2">

          {/* Mobile Main Row */}
          <div className="flex items-center justify-between gap-2 min-h-[40px]">

            {/* Logo & Brand */}
            <div className="flex items-center gap-2 shrink-0">
              <img
                src={currentLogo}
                alt="Schedy"
                className="w-6 h-6 object-contain rounded-[6px] shrink-0"
              />
              <span className="font-bold text-xs tracking-tight text-neutral-900 dark:text-white">
                Schedy
              </span>
            </div>

            {/* Right Mobile Actions */}
            <div className="flex items-center gap-1.5 shrink-0">
              {/* AI Schedule Button - iOS Pill */}
              <button
                disabled
                className="flex items-center justify-center px-2.5 py-1 text-xs font-semibold text-neutral-400 dark:text-neutral-500 bg-black/[0.04] dark:bg-white/[0.05] rounded-full cursor-not-allowed opacity-60 min-h-[28px] h-7"
                title="AI Schedule Importer (Disabled)"
              >
                <span>AI</span>
              </button>


              {/* "+ New" Action Button - iOS Pill */}
              <button
                onClick={handlePrimaryNewAction}
                className="flex items-center gap-1 px-2.5 py-1 text-xs font-semibold text-white bg-[#007aff] hover:bg-[#0071e3] dark:bg-[#0a84ff] rounded-full transition-all active:scale-95 cursor-pointer min-h-[28px] h-7"
                title="Create New Item"
              >
                <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
                <span>New</span>
              </button>


              {/* Mobile Menu Button - iOS Circular Button */}
              <button
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                className={`w-8 h-8 rounded-full flex items-center justify-center transition-all active:scale-90 cursor-pointer ${mobileMenuOpen
                  ? 'bg-black/10 dark:bg-white/20 text-black dark:text-white'
                  : 'bg-black/5 dark:bg-white/10 text-neutral-700 dark:text-neutral-200'
                  }`}
                title="Toggle Menu"
              >
                {mobileMenuOpen ? <X className="w-4 h-4" /> : <Menu className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {/* Mobile View Switcher (iOS Segmented Control) */}
          <div className="grid grid-cols-5 mt-2 p-[3px] rounded-[12px] bg-black/[0.06] dark:bg-white/[0.1] gap-0.5 text-center">
            <button
              onClick={() => handleSelectTab('schedule')}
              className={`flex items-center justify-center py-1.5 rounded-[9px] text-[11px] font-medium transition-all cursor-pointer ${activeTab === 'schedule'
                ? 'ios-nav-item-active bg-white dark:bg-[#636366] text-black dark:text-white shadow-xs font-semibold'
                : 'text-neutral-600 dark:text-neutral-300'
                }`}
            >
              <span>Schedule</span>
            </button>

            <button
              onClick={() => handleSelectTab('tasks')}
              className={`flex items-center justify-center py-1.5 rounded-[9px] text-[11px] font-medium transition-all cursor-pointer ${activeTab === 'tasks'
                ? 'ios-nav-item-active bg-white dark:bg-[#636366] text-black dark:text-white shadow-xs font-semibold'
                : 'text-neutral-600 dark:text-neutral-300'
                }`}
            >
              <span>Tasks</span>
            </button>

            <button
              onClick={() => handleSelectTab('announcements')}
              className={`relative flex items-center justify-center py-1.5 rounded-[9px] text-[11px] font-medium transition-all cursor-pointer ${activeTab === 'announcements'
                ? 'ios-nav-item-active bg-white dark:bg-[#636366] text-black dark:text-white shadow-xs font-semibold'
                : 'text-neutral-600 dark:text-neutral-300'
                }`}
            >
              <span>Notices</span>
              {unreadCount > 0 && (
                <span className="absolute -top-1 -right-0.5 px-1 py-0.2 text-[8px] font-bold rounded-full bg-[#ff3b30] text-white shadow-xs">
                  {unreadCount}
                </span>
              )}
            </button>

            <button
              onClick={() => handleSelectTab('overview')}
              className={`flex items-center justify-center py-1.5 rounded-[9px] text-[11px] font-medium transition-all cursor-pointer ${activeTab === 'overview'
                ? 'ios-nav-item-active bg-white dark:bg-[#636366] text-black dark:text-white shadow-xs font-semibold'
                : 'text-neutral-600 dark:text-neutral-300'
                }`}
            >
              <span>Overview</span>
            </button>

            <button
              onClick={() => handleSelectTab('pomodoro')}
              className={`flex items-center justify-center gap-1 py-1.5 rounded-[9px] text-[11px] font-medium transition-all cursor-pointer ${activeTab === 'pomodoro'
                ? 'ios-nav-item-active bg-white dark:bg-[#636366] text-black dark:text-white shadow-xs font-semibold'
                : 'text-neutral-600 dark:text-neutral-300'
                }`}
            >
              <Timer className={`w-3 h-3 ${pomodoroInfo?.isRunning ? 'text-[#007aff] dark:text-[#0a84ff]' : ''}`} />
              <span className="truncate">{pomodoroInfo?.isRunning ? `${Math.floor(pomodoroInfo.timeLeft / 60)}m` : 'Focus'}</span>
            </button>
          </div>

          {/* Mobile Dropdown Menu Drawer */}
          {mobileMenuOpen && (
            <div className="mt-2.5 p-3 rounded-[20px] ios-card space-y-2 text-xs animate-fade-in shadow-xl">
              <div className="grid grid-cols-4 gap-1.5">
                {/* Pomodoro Tool */}
                <button
                  onClick={() => handleActionAndClose(() => setActiveTab('pomodoro'))}
                  className={`flex flex-col items-center justify-center gap-1 p-2 rounded-[12px] font-semibold transition-all active:scale-95 cursor-pointer ${pomodoroInfo?.isRunning
                    ? 'bg-[#007aff]/15 text-[#007aff] dark:text-[#0a84ff]'
                    : 'bg-black/[0.04] dark:bg-white/[0.06] text-[#007aff] dark:text-[#0a84ff]'
                    }`}
                >
                  <Timer className="w-4 h-4" />
                  <span className="text-[10px] truncate max-w-full font-mono font-bold">
                    {pomodoroInfo?.isRunning
                      ? `${Math.floor(pomodoroInfo.timeLeft / 60)}:${(pomodoroInfo.timeLeft % 60).toString().padStart(2, '0')}`
                      : 'Focus'}
                  </span>
                </button>

                {/* Share Code */}
                <button
                  onClick={() => handleActionAndClose(onOpenShare)}
                  className="flex flex-col items-center justify-center gap-1 p-2 rounded-[12px] bg-black/[0.04] dark:bg-white/[0.06] text-[#007aff] dark:text-[#0a84ff] font-semibold transition-all active:scale-95 cursor-pointer"
                >
                  <Share2 className="w-4 h-4" />
                  <span className="text-[10px]">Share</span>
                </button>

                {/* Database Settings */}
                <button
                  onClick={() => handleActionAndClose(onOpenConfig)}
                  className={`flex flex-col items-center justify-center gap-1 p-2 rounded-[12px] font-medium transition-all active:scale-95 cursor-pointer ${isCloudConnected
                    ? 'bg-[#34c759]/15 text-[#34c759]'
                    : 'bg-black/[0.04] dark:bg-white/[0.06] text-neutral-600 dark:text-neutral-300'
                    }`}
                >
                  <Database className="w-4 h-4" />
                  <span className="text-[10px]">{isCloudConnected ? 'Cloud' : 'Local'}</span>
                </button>

                {/* Export Backup */}
                <button
                  onClick={() => handleActionAndClose(onOpenExport)}
                  className="flex flex-col items-center justify-center gap-1 p-2 rounded-[12px] bg-black/[0.04] dark:bg-white/[0.06] text-neutral-600 dark:text-neutral-300 font-medium transition-all active:scale-95 cursor-pointer"
                >
                  <Download className="w-4 h-4" />
                  <span className="text-[10px]">Export</span>
                </button>
              </div>

              {/* Themes Row */}
              <div className="flex items-center justify-between pt-2 border-t border-black/[0.06] dark:border-white/[0.08] text-xs">
                <span className="text-neutral-500 dark:text-neutral-400 font-medium text-[11px]">
                  Appearance
                </span>
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={onTogglePinkTheme}
                    className={`flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold transition-all cursor-pointer ${theme === 'pink'
                      ? 'bg-[#FF8DA1]/20 text-[#FF8DA1] ring-1 ring-[#FF8DA1]/40'
                      : 'bg-black/[0.04] dark:bg-white/[0.06] text-neutral-600 dark:text-neutral-400'
                      }`}
                  >
                    <Flower2 className="w-3.5 h-3.5 text-[#FF8DA1] shrink-0" />
                    <span>Pink</span>
                  </button>

                  <button
                    type="button"
                    onClick={onToggleTheme}
                    className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-black/[0.04] dark:bg-white/[0.06] text-neutral-700 dark:text-neutral-200 text-xs font-medium cursor-pointer"
                  >
                    <span key={theme === 'dark' ? 'sun' : 'moon'} className="theme-toggle-icon shrink-0">
                      {theme === 'dark' ? <Sun className="w-3.5 h-3.5 text-amber-400 shrink-0" /> : <Moon className="w-3.5 h-3.5 text-neutral-600 shrink-0" />}
                    </span>
                    <span>{theme === 'dark' ? 'Light' : 'Dark'}</span>
                  </button>
                </div>
              </div>

              {/* All Clear Destructive Row */}
              <div className="flex items-center justify-between pt-2 border-t border-black/[0.06] dark:border-white/[0.08] text-xs">
                <div className="flex items-center gap-1.5 text-[#ff3b30] dark:text-[#ff453a]">
                  <Trash2 className="w-3.5 h-3.5" />
                  <span className="font-semibold text-[11px]">
                    All Clear
                  </span>
                </div>
                <button
                  onClick={() => handleActionAndClose(onOpenClearAll)}
                  className="flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold transition-all cursor-pointer bg-[#ff3b30]/10 hover:bg-[#ff3b30]/20 text-[#ff3b30] dark:text-[#ff453a] ring-1 ring-[#ff3b30]/25 active:scale-95"
                >
                  <span>Clear Data</span>
                </button>
              </div>

              {/* Mobile Google Account / Pro Section */}
              <div className="pt-2 border-t border-black/[0.06] dark:border-white/[0.08]">
                {!user ? (
                  <button
                    onClick={() => handleActionAndClose(onOpenAuth)}
                    className="w-full flex items-center justify-center gap-2 py-2 px-3 rounded-xl text-xs font-semibold border border-black/[0.08] dark:border-white/[0.1] bg-white dark:bg-white/[0.05] text-neutral-800 dark:text-neutral-200 shadow-2xs"
                  >
                    <svg className="w-3.5 h-3.5 shrink-0" viewBox="0 0 24 24">
                      <path fill="#4285F4" d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.82-2.4 3.68v3.05h3.88c2.27-2.09 3.665-5.17 3.665-9.17z" />
                      <path fill="#34A853" d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.1-6.72-4.93H1.25v3.15C3.26 21.36 7.33 24 12 24z" />
                      <path fill="#FBBC05" d="M5.28 14.27c-.25-.72-.38-1.49-.38-2.27s.13-1.55.38-2.27V6.58H1.25C.45 8.18 0 9.98 0 12s.45 3.82 1.25 5.42l4.03-3.15z" />
                      <path fill="#EA4335" d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.33 0 3.26 2.64 1.25 6.58l4.03 3.15c.95-2.83 3.6-4.98 6.72-4.98z" />
                    </svg>
                    <span>Sign in with Google</span>
                  </button>
                ) : (
                  <div className="flex items-center justify-between p-2 rounded-xl bg-black/[0.02] dark:bg-white/[0.04]">
                    <div className="flex items-center gap-2 min-w-0">
                      {user.avatarUrl ? (
                        <img src={user.avatarUrl} alt={user.fullName} className="w-5 h-5 rounded-full shrink-0 object-cover" />
                      ) : (
                        <div className="w-5 h-5 rounded-full bg-neutral-200 dark:bg-neutral-700 flex items-center justify-center text-[9px] font-bold">
                          {user.fullName?.charAt(0) || 'U'}
                        </div>
                      )}
                      <div className="min-w-0">
                        <p className="text-[11px] font-semibold truncate">{user.fullName}</p>
                        <div className="flex items-center gap-1">
                          {user.isPro ? (
                            <span className="px-1.5 py-0.2 text-[8px] font-bold rounded-full bg-[#007aff]/15 text-[#007aff] dark:text-[#0a84ff]">
                              PRO
                            </span>
                          ) : (
                            <button
                              disabled
                              className="text-[9px] text-neutral-400 dark:text-neutral-500 font-semibold cursor-not-allowed opacity-60"
                              title="Upgrade (Disabled)"
                            >
                              Upgrade
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                    <button
                      onClick={() => handleActionAndClose(onSignOut)}
                      className="p-1 text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200"
                      title="Sign Out"
                    >
                      <LogOut className="w-3.5 h-3.5" />
                    </button>
                  </div>
                )}
              </div>

            </div>
          )}

        </div>
      </header>
    </>
  );
};
