import React, { useState } from 'react';
import schedyLogo from '../../assets/schedy.png';
import { 
  Database, 
  Download, 
  Share2, 
  Plus, 
  Sun, 
  Moon, 
  Flower2,
  Menu,
  X
} from 'lucide-react';

interface NavbarProps {
  activeTab: 'schedule' | 'announcements' | 'overview';
  setActiveTab: (tab: 'schedule' | 'announcements' | 'overview') => void;
  unreadCount: number;
  isCloudConnected: boolean;
  theme: 'light' | 'dark' | 'pink';
  onToggleTheme: () => void;
  onTogglePinkTheme: () => void;
  onOpenConfig: () => void;
  onOpenExport: () => void;
  onOpenShare: () => void;
  onNewEvent: () => void;
  onNewAnnouncement: () => void;
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
  onNewEvent,
  onNewAnnouncement,
}) => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const handleActionAndClose = (action: () => void) => {
    action();
    setMobileMenuOpen(false);
  };

  return (
    <>
      {/* ========================================================================= */}
      {/* DESKTOP VERTICAL SIDEBAR (Visible on md and above)                       */}
      {/* ========================================================================= */}
      <aside className="hidden md:flex md:w-60 lg:w-64 md:flex-col md:fixed md:inset-y-0 md:left-0 md:z-30 border-r border-neutral-200/80 dark:border-neutral-800/80 bg-white/95 dark:bg-[#141416]/95 backdrop-blur-xl p-3.5 justify-between transition-colors">
        
        {/* Top Section: Brand + Navigation + Action */}
        <div className="space-y-4">
          
          {/* Brand Header Card: Outer R (18px) = Inner R (8px) + Padding (10px / p-2.5) */}
          <div className="p-2.5 rounded-[18px] bg-neutral-50/80 dark:bg-neutral-900/60 border border-neutral-200/60 dark:border-neutral-800/60 flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <img 
                src={schedyLogo} 
                alt="Schedy" 
                className="w-7 h-7 object-contain rounded-[8px] shrink-0 shadow-xs" 
              />
              <div>
                <span className="font-bold text-sm tracking-tight text-[#1c1917] dark:text-neutral-100 block leading-none">
                  Schedy
                </span>
                <span className="text-[10px] text-neutral-400 dark:text-neutral-500 font-medium">
                  Planner & Notices
                </span>
              </div>
            </div>

            {/* Cloud Status Indicator Dot */}
            <button
              onClick={onOpenConfig}
              className="p-1 rounded-[6px] hover:bg-neutral-200/50 dark:hover:bg-neutral-800 transition-colors"
              title={isCloudConnected ? 'Cloud Synced' : 'Offline / Local'}
            >
              <span className={`block w-2 h-2 rounded-full ${isCloudConnected ? 'bg-emerald-500 animate-pulse' : 'bg-neutral-400'}`} />
            </button>
          </div>

          {/* Primary "+ New" Action Button */}
          <button
            onClick={activeTab === 'announcements' ? onNewAnnouncement : onNewEvent}
            className="w-full flex items-center justify-center gap-2 px-3 py-2.5 text-xs font-semibold text-white bg-[#2383e2] hover:bg-[#1a73e8] rounded-[14px] shadow-xs hover:shadow-md transition-all active:scale-[0.98]"
            title="Create New Item"
          >
            <Plus className="w-4 h-4 stroke-[2.5]" />
            <span>{activeTab === 'announcements' ? 'New Notice' : 'New Event'}</span>
          </button>

          {/* Vertical Segmented View Switcher */}
          {/* Outer R (16px) = Inner R (10px) + Padding (6px / p-1.5) */}
          <div className="space-y-1">
            <span className="px-2 text-[10px] font-bold uppercase tracking-wider text-neutral-400 dark:text-neutral-500">
              Views
            </span>

            <nav className="p-1.5 rounded-[16px] bg-neutral-100/90 dark:bg-neutral-900/90 border border-neutral-200/60 dark:border-neutral-800/60 flex flex-col gap-1 shadow-inner">
              <button
                onClick={() => setActiveTab('schedule')}
                className={`w-full flex items-center justify-between px-3 py-2 rounded-[10px] text-xs font-medium transition-all ${
                  activeTab === 'schedule'
                    ? 'bg-white dark:bg-[#202024] text-[#1c1917] dark:text-white shadow-xs font-semibold'
                    : 'text-neutral-500 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white hover:bg-white/40 dark:hover:bg-white/5'
                }`}
              >
                <span>Schedule</span>
              </button>

              <button
                onClick={() => setActiveTab('announcements')}
                className={`w-full relative flex items-center justify-between px-3 py-2 rounded-[10px] text-xs font-medium transition-all ${
                  activeTab === 'announcements'
                    ? 'bg-white dark:bg-[#202024] text-[#1c1917] dark:text-white shadow-xs font-semibold'
                    : 'text-neutral-500 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white hover:bg-white/40 dark:hover:bg-white/5'
                }`}
              >
                <span>Notices</span>
                {unreadCount > 0 && (
                  <span className="px-1.5 py-0.2 text-[9px] font-bold rounded-full bg-rose-500 text-white shadow-xs animate-pulse">
                    {unreadCount}
                  </span>
                )}
              </button>

              <button
                onClick={() => setActiveTab('overview')}
                className={`w-full flex items-center justify-between px-3 py-2 rounded-[10px] text-xs font-medium transition-all ${
                  activeTab === 'overview'
                    ? 'bg-white dark:bg-[#202024] text-[#1c1917] dark:text-white shadow-xs font-semibold'
                    : 'text-neutral-500 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white hover:bg-white/40 dark:hover:bg-white/5'
                }`}
              >
                <span>Overview</span>
              </button>
            </nav>
          </div>

        </div>

        {/* Bottom Utility Card: Outer R (18px) = Inner R (10px) + Padding (8px / p-2) */}
        <div className="space-y-2">
          <div className="p-2 rounded-[18px] bg-neutral-50/80 dark:bg-neutral-900/60 border border-neutral-200/60 dark:border-neutral-800/60 space-y-1.5">
            
            {/* Share Code Button */}
            <button
              onClick={onOpenShare}
              className="w-full flex items-center gap-2 px-2.5 py-2 rounded-[10px] text-xs font-semibold text-[#2383e2] hover:bg-blue-50 dark:hover:bg-blue-950/40 transition-all active:scale-95"
              title="Share / Sync Calendar with Code"
            >
              <Share2 className="w-3.5 h-3.5 shrink-0" />
              <span>Share Code</span>
            </button>

            {/* Database & Export Row */}
            <div className="grid grid-cols-2 gap-1">
              <button
                onClick={onOpenConfig}
                className={`flex items-center justify-center gap-1.5 px-2 py-1.5 rounded-[10px] text-[11px] font-medium transition-all active:scale-95 ${
                  isCloudConnected
                    ? 'text-emerald-700 dark:text-emerald-400 bg-emerald-50/80 dark:bg-emerald-950/40 border border-emerald-200/60 dark:border-emerald-900/60'
                    : 'text-neutral-600 dark:text-neutral-400 hover:bg-neutral-200/50 dark:hover:bg-neutral-800'
                }`}
                title="Database Settings"
              >
                <Database className="w-3.5 h-3.5 shrink-0" />
                <span>Cloud</span>
              </button>

              <button
                onClick={onOpenExport}
                className="flex items-center justify-center gap-1.5 px-2 py-1.5 rounded-[10px] text-[11px] font-medium text-neutral-600 dark:text-neutral-400 hover:bg-neutral-200/50 dark:hover:bg-neutral-800 transition-all active:scale-95"
                title="Export Data"
              >
                <Download className="w-3.5 h-3.5 shrink-0" />
                <span>Export</span>
              </button>
            </div>

            {/* Theme Toggle Controls */}
            {/* Outer R (12px) = Inner R (8px) + Padding (4px / p-1) */}
            <div className="p-1 rounded-[12px] bg-neutral-200/50 dark:bg-neutral-800/60 flex items-center justify-between">
              <span className="text-[10px] font-medium text-neutral-500 dark:text-neutral-400 pl-1.5">
                Theme
              </span>

              <div className="flex items-center gap-1">
                <button
                  onClick={onTogglePinkTheme}
                  className={`p-1.5 rounded-[8px] transition-all active:scale-90 ${
                    theme === 'pink'
                      ? 'bg-[#FF8DA1]/20 text-[#FF8DA1] ring-1 ring-[#FF8DA1]/50 shadow-xs'
                      : 'text-neutral-500 dark:text-neutral-400 hover:text-[#FF8DA1] hover:bg-white/60 dark:hover:bg-white/10'
                  }`}
                  title={theme === 'pink' ? 'Pink Theme Active' : 'Switch to Pink Theme'}
                >
                  <Flower2 className="w-3.5 h-3.5" />
                </button>

                <button
                  onClick={onToggleTheme}
                  className={`p-1.5 rounded-[8px] transition-all active:scale-90 ${
                    theme === 'dark'
                      ? 'text-amber-400 bg-white/10'
                      : 'text-neutral-600 hover:bg-white/60 dark:hover:bg-white/10'
                  }`}
                  title={theme === 'dark' ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
                >
                  {theme === 'dark' ? <Sun className="w-3.5 h-3.5" /> : <Moon className="w-3.5 h-3.5" />}
                </button>
              </div>
            </div>

          </div>
        </div>

      </aside>

      {/* ========================================================================= */}
      {/* MOBILE TOP BAR (Visible on < md)                                         */}
      {/* ========================================================================= */}
      <header className="md:hidden sticky top-0 z-40 w-full bg-white/95 dark:bg-[#141416]/95 backdrop-blur-xl border-b border-neutral-200/80 dark:border-neutral-800/80 transition-all">
        <div className="max-w-6xl w-full mx-auto px-3 sm:px-6 py-2">
          
          {/* Mobile Main Row */}
          <div className="flex items-center justify-between gap-2 min-h-[38px]">
            
            {/* Logo & Brand */}
            <div className="flex items-center gap-2 shrink-0">
              <img 
                src={schedyLogo} 
                alt="Schedy" 
                className="w-6 h-6 object-contain rounded-[6px] shrink-0" 
              />
              <span className="font-bold text-xs tracking-tight text-[#1c1917] dark:text-neutral-100">
                Schedy
              </span>
            </div>

            {/* Right Mobile Actions */}
            <div className="flex items-center gap-1.5 shrink-0">
              {/* "+ New" Action Button */}
              <button
                onClick={activeTab === 'announcements' ? onNewAnnouncement : onNewEvent}
                className="flex items-center gap-1 px-2.5 py-1.5 text-xs font-semibold text-white bg-[#2383e2] hover:bg-[#1a73e8] rounded-[10px] shadow-xs transition-all active:scale-95"
                title="Create New Item"
              >
                <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
                <span>New</span>
              </button>

              {/* Mobile Menu Button */}
              <button
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                className={`p-1.5 rounded-[10px] border transition-all active:scale-90 ${
                  mobileMenuOpen
                    ? 'bg-neutral-100 dark:bg-neutral-800 border-neutral-300 dark:border-neutral-700 text-[#1c1917] dark:text-white'
                    : 'border-neutral-200/80 dark:border-neutral-800 text-neutral-600 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-800'
                }`}
                title="Toggle Menu"
              >
                {mobileMenuOpen ? <X className="w-4 h-4" /> : <Menu className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {/* Mobile View Switcher Tabs Bar */}
          {/* Outer R (14px) = Inner R (10px) + Padding (4px / p-1) */}
          <div className="flex mt-2 p-1 rounded-[14px] bg-neutral-100/90 dark:bg-neutral-900/90 border border-neutral-200/60 dark:border-neutral-800/60 shadow-inner">
            <button
              onClick={() => setActiveTab('schedule')}
              className={`flex-1 flex items-center justify-center py-1 rounded-[10px] text-xs font-medium transition-all ${
                activeTab === 'schedule'
                  ? 'bg-white dark:bg-[#202024] text-[#1c1917] dark:text-white shadow-xs font-semibold'
                  : 'text-neutral-500 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white'
              }`}
            >
              <span>Schedule</span>
            </button>

            <button
              onClick={() => setActiveTab('announcements')}
              className={`flex-1 relative flex items-center justify-center py-1 rounded-[10px] text-xs font-medium transition-all ${
                activeTab === 'announcements'
                  ? 'bg-white dark:bg-[#202024] text-[#1c1917] dark:text-white shadow-xs font-semibold'
                  : 'text-neutral-500 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white'
              }`}
            >
              <span>Notices</span>
              {unreadCount > 0 && (
                <span className="px-1.5 py-0.2 text-[9px] font-bold rounded-full bg-rose-500 text-white shadow-xs">
                  {unreadCount}
                </span>
              )}
            </button>

            <button
              onClick={() => setActiveTab('overview')}
              className={`flex-1 flex items-center justify-center py-1 rounded-[10px] text-xs font-medium transition-all ${
                activeTab === 'overview'
                  ? 'bg-white dark:bg-[#202024] text-[#1c1917] dark:text-white shadow-xs font-semibold'
                  : 'text-neutral-500 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white'
              }`}
            >
              <span>Overview</span>
            </button>
          </div>

          {/* Mobile Dropdown Menu Drawer */}
          {/* Outer R (24px) = Inner R (12px) + Padding (12px / p-3) */}
          {mobileMenuOpen && (
            <div className="mt-2 p-3 rounded-[24px] bg-white dark:bg-[#18181b] border border-neutral-200/90 dark:border-neutral-800/90 shadow-xl space-y-2 text-xs animate-fade-in">
              <div className="grid grid-cols-3 gap-2">
                {/* Share Code */}
                <button
                  onClick={() => handleActionAndClose(onOpenShare)}
                  className="flex items-center justify-center gap-1.5 p-2.5 rounded-[12px] border border-neutral-200 dark:border-neutral-800 text-[#2383e2] hover:bg-blue-50 dark:hover:bg-blue-950/30 font-semibold transition-all"
                >
                  <Share2 className="w-4 h-4" />
                  <span>Share</span>
                </button>

                {/* Database Settings */}
                <button
                  onClick={() => handleActionAndClose(onOpenConfig)}
                  className={`flex items-center justify-center gap-1.5 p-2.5 rounded-[12px] border font-medium transition-all ${
                    isCloudConnected
                      ? 'bg-emerald-50/80 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-300'
                      : 'border-neutral-200 dark:border-neutral-800 text-neutral-600 dark:text-neutral-400'
                  }`}
                >
                  <Database className="w-4 h-4" />
                  <span>{isCloudConnected ? 'Cloud' : 'Local'}</span>
                </button>

                {/* Export Backup */}
                <button
                  onClick={() => handleActionAndClose(onOpenExport)}
                  className="flex items-center justify-center gap-1.5 p-2.5 rounded-[12px] border border-neutral-200 dark:border-neutral-800 text-neutral-600 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-800 font-medium transition-all"
                >
                  <Download className="w-4 h-4" />
                  <span>Export</span>
                </button>
              </div>

              {/* Themes Row */}
              <div className="flex items-center justify-between pt-2 border-t border-neutral-100 dark:border-neutral-800 text-xs">
                <span className="text-neutral-500 dark:text-neutral-400 font-medium text-[11px]">
                  Appearance
                </span>
                <div className="flex items-center gap-1.5">
                  <button
                    onClick={onTogglePinkTheme}
                    className={`flex items-center gap-1 px-2.5 py-1 rounded-[8px] border text-xs font-semibold transition-all ${
                      theme === 'pink'
                        ? 'bg-[#FF8DA1]/15 text-[#FF8DA1] border-[#FF8DA1]/40'
                        : 'border-neutral-200 dark:border-neutral-800 text-neutral-600 dark:text-neutral-400'
                    }`}
                  >
                    <Flower2 className="w-3.5 h-3.5 text-[#FF8DA1]" />
                    <span>Pink</span>
                  </button>

                  <button
                    onClick={onToggleTheme}
                    className="flex items-center gap-1 px-2.5 py-1 rounded-[8px] border border-neutral-200 dark:border-neutral-800 text-neutral-600 dark:text-neutral-300 text-xs font-medium"
                  >
                    {theme === 'dark' ? <Sun className="w-3.5 h-3.5 text-amber-400" /> : <Moon className="w-3.5 h-3.5 text-neutral-600" />}
                    <span>{theme === 'dark' ? 'Light' : 'Dark'}</span>
                  </button>
                </div>
              </div>
            </div>
          )}

        </div>
      </header>
    </>
  );
};
