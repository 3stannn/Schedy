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
    <header className="sticky top-0 z-40 w-full bg-white/95 dark:bg-[#141416]/95 backdrop-blur-xl border-b border-neutral-200/80 dark:border-neutral-800/80 transition-all">
      <div className="max-w-6xl w-full mx-auto px-3 sm:px-6 py-2">
        
        {/* Main Row */}
        <div className="flex items-center justify-between gap-2 min-h-[38px]">
          
          {/* Logo & Brand */}
          <div className="flex items-center gap-2 shrink-0">
            <img 
              src={schedyLogo} 
              alt="Schedy" 
              className="w-6 h-6 sm:w-7 sm:h-7 object-contain rounded-md shrink-0" 
            />
            <span className="font-bold text-xs sm:text-sm tracking-tight text-[#1c1917] dark:text-neutral-100">
              Schedy
            </span>
          </div>

          {/* Desktop Center Segmented View Switcher Pill */}
          <nav className="hidden md:flex items-center p-1 rounded-xl bg-neutral-100/90 dark:bg-neutral-900/90 border border-neutral-200/60 dark:border-neutral-800/60 shrink min-w-0 shadow-inner">
            <button
              onClick={() => setActiveTab('schedule')}
              className={`flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-medium transition-all whitespace-nowrap ${
                activeTab === 'schedule'
                  ? 'bg-white dark:bg-[#202024] text-[#1c1917] dark:text-white shadow-xs font-semibold'
                  : 'text-neutral-500 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white'
              }`}
            >
              <span>Schedule</span>
            </button>

            <button
              onClick={() => setActiveTab('announcements')}
              className={`relative flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-medium transition-all whitespace-nowrap ${
                activeTab === 'announcements'
                  ? 'bg-white dark:bg-[#202024] text-[#1c1917] dark:text-white shadow-xs font-semibold'
                  : 'text-neutral-500 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white'
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
              className={`flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-medium transition-all whitespace-nowrap ${
                activeTab === 'overview'
                  ? 'bg-white dark:bg-[#202024] text-[#1c1917] dark:text-white shadow-xs font-semibold'
                  : 'text-neutral-500 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white'
              }`}
            >
              <span>Overview</span>
            </button>
          </nav>

          {/* Right Toolbar Actions */}
          <div className="flex items-center gap-1 shrink-0">
            
            {/* Desktop Actions */}
            <div className="hidden md:flex items-center gap-1">
              {/* Share / Sync Code Button */}
              <button
                onClick={onOpenShare}
                className="flex items-center gap-1 px-2.5 py-1 rounded-xl text-xs font-medium text-[#2383e2] hover:bg-blue-50 dark:hover:bg-blue-950/30 transition-all active:scale-95"
                title="Share / Sync Calendar with Code"
              >
                <Share2 className="w-3.5 h-3.5 shrink-0" />
                <span className="text-[11px] font-semibold">Share Code</span>
              </button>

              {/* Pink Theme Button */}
              <button
                onClick={onTogglePinkTheme}
                className={`p-1.5 rounded-xl transition-all active:scale-90 ${
                  theme === 'pink'
                    ? 'bg-[#FF8DA1]/15 text-[#FF8DA1] ring-1 ring-[#FF8DA1]/50 shadow-xs'
                    : 'text-neutral-500 dark:text-neutral-400 hover:bg-neutral-100 dark:hover:bg-neutral-800 hover:text-[#FF8DA1]'
                }`}
                title={theme === 'pink' ? 'Pink Theme Active (#FF8DA1)' : 'Switch to Pink Theme (#FF8DA1)'}
              >
                <Flower2 className={`w-3.5 h-3.5 transition-transform ${theme === 'pink' ? 'text-[#FF8DA1]' : ''}`} />
              </button>

              {/* Theme Toggle (Light / Dark) */}
              <button
                onClick={onToggleTheme}
                className={`p-1.5 rounded-xl transition-all active:scale-90 ${
                  theme === 'pink' 
                    ? 'text-neutral-400 hover:bg-neutral-100' 
                    : 'text-neutral-500 dark:text-neutral-400 hover:bg-neutral-100 dark:hover:bg-neutral-800'
                }`}
                title={theme === 'dark' ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
              >
                {theme === 'dark' ? (
                  <Sun className="w-3.5 h-3.5 text-amber-400" />
                ) : (
                  <Moon className="w-3.5 h-3.5 text-neutral-600" />
                )}
              </button>

              {/* Database Sync Status */}
              <button
                onClick={onOpenConfig}
                className={`flex items-center gap-1.5 px-2 py-1 rounded-xl text-xs transition-all active:scale-95 ${
                  isCloudConnected
                    ? 'text-emerald-700 dark:text-emerald-400 bg-emerald-50/80 dark:bg-emerald-950/40 border border-emerald-200/60 dark:border-emerald-900/60'
                    : 'text-neutral-500 dark:text-neutral-400 hover:bg-neutral-100 dark:hover:bg-neutral-800'
                }`}
                title="Database Settings"
              >
                <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${isCloudConnected ? 'bg-emerald-500 animate-pulse' : 'bg-neutral-400'}`} />
                <Database className="w-3.5 h-3.5 shrink-0" />
              </button>

              {/* Export */}
              <button
                onClick={onOpenExport}
                className="p-1.5 rounded-xl text-neutral-500 dark:text-neutral-400 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-all active:scale-90"
                title="Export Data"
              >
                <Download className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* "+ New" Action Button (Both mobile & desktop) */}
            <button
              onClick={activeTab === 'announcements' ? onNewAnnouncement : onNewEvent}
              className="flex items-center gap-1 px-2.5 sm:px-3 py-1.5 text-xs font-semibold text-white bg-[#2383e2] hover:bg-[#1a73e8] rounded-xl shadow-xs hover:shadow-md transition-all active:scale-95"
              title="Create New Item"
            >
              <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
              <span className="hidden xs:inline">New</span>
            </button>

            {/* Mobile Menu Button (< md) */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className={`md:hidden p-1.5 rounded-xl border transition-all active:scale-90 ${
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
        <div className="flex md:hidden mt-2 p-1 rounded-xl bg-neutral-100/90 dark:bg-neutral-900/90 border border-neutral-200/60 dark:border-neutral-800/60 shadow-inner">
          <button
            onClick={() => setActiveTab('schedule')}
            className={`flex-1 flex items-center justify-center gap-1.5 py-1 rounded-lg text-xs font-medium transition-all ${
              activeTab === 'schedule'
                ? 'bg-white dark:bg-[#202024] text-[#1c1917] dark:text-white shadow-xs font-semibold'
                : 'text-neutral-500 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white'
            }`}
          >
            <span>Schedule</span>
          </button>

          <button
            onClick={() => setActiveTab('announcements')}
            className={`flex-1 relative flex items-center justify-center gap-1.5 py-1 rounded-lg text-xs font-medium transition-all ${
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
            className={`flex-1 flex items-center justify-center gap-1.5 py-1 rounded-lg text-xs font-medium transition-all ${
              activeTab === 'overview'
                ? 'bg-white dark:bg-[#202024] text-[#1c1917] dark:text-white shadow-xs font-semibold'
                : 'text-neutral-500 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white'
            }`}
          >
            <span>Overview</span>
          </button>
        </div>

        {/* Mobile Dropdown Menu Drawer */}
        {mobileMenuOpen && (
          <div className="md:hidden mt-2 p-3 rounded-2xl bg-white dark:bg-[#18181b] border border-neutral-200/90 dark:border-neutral-800/90 shadow-xl space-y-2 text-xs animate-fade-in">
            <div className="grid grid-cols-3 gap-2">
              {/* Share Code */}
              <button
                onClick={() => handleActionAndClose(onOpenShare)}
                className="flex items-center justify-center gap-1.5 p-2.5 rounded-xl border border-neutral-200 dark:border-neutral-800 text-[#2383e2] hover:bg-blue-50 dark:hover:bg-blue-950/30 font-semibold transition-all"
              >
                <Share2 className="w-4 h-4" />
                <span>Share Code</span>
              </button>

              {/* Database Settings */}
              <button
                onClick={() => handleActionAndClose(onOpenConfig)}
                className={`flex items-center justify-center gap-1.5 p-2.5 rounded-xl border font-medium transition-all ${
                  isCloudConnected
                    ? 'bg-emerald-50/80 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-300'
                    : 'border-neutral-200 dark:border-neutral-800 text-neutral-600 dark:text-neutral-400'
                }`}
              >
                <Database className="w-4 h-4" />
                <span>{isCloudConnected ? 'Cloud Active' : 'Offline Mode'}</span>
              </button>

              {/* Export Backup */}
              <button
                onClick={() => handleActionAndClose(onOpenExport)}
                className="flex items-center justify-center gap-1.5 p-2.5 rounded-xl border border-neutral-200 dark:border-neutral-800 text-neutral-600 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-800 font-medium transition-all"
              >
                <Download className="w-4 h-4" />
                <span>Export / Backup</span>
              </button>
            </div>

            {/* Themes Row */}
            <div className="flex items-center justify-between pt-2 border-t border-neutral-100 dark:border-neutral-800 text-xs">
              <span className="text-neutral-500 dark:text-neutral-400 font-medium text-[11px]">
                Theme Appearance
              </span>
              <div className="flex items-center gap-1.5">
                <button
                  onClick={onTogglePinkTheme}
                  className={`flex items-center gap-1 px-2.5 py-1 rounded-lg border text-xs font-semibold transition-all ${
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
                  className="flex items-center gap-1 px-2.5 py-1 rounded-lg border border-neutral-200 dark:border-neutral-800 text-neutral-600 dark:text-neutral-300 text-xs font-medium"
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
  );
};
