import { useState, useEffect, useCallback } from 'react';
import type { ScheduleEvent, EventStatus } from './types/schedule';
import type { Announcement } from './types/announcement';
import { Navbar } from './components/layout/Navbar';
import { TopBanner } from './components/layout/TopBanner';
import { CalendarView } from './components/schedule/CalendarView';
import { EventListView } from './components/schedule/EventListView';
import { EventModal } from './components/schedule/EventModal';
import { AnnouncementFeed } from './components/announcements/AnnouncementFeed';
import { AnnouncementModal } from './components/announcements/AnnouncementModal';
import { DatabaseConfigModal } from './components/settings/DatabaseConfigModal';
import { ExportImportModal } from './components/settings/ExportImportModal';
import { ShareCodeModal } from './components/settings/ShareCodeModal';
import { OverviewDashboard } from './components/common/OverviewDashboard';
import { ToastContainer } from './components/common/Toast';
import type { ToastMessage } from './components/common/Toast';

import { 
  fetchAllEvents, 
  createEvent, 
  updateEvent, 
  deleteEvent, 
  bulkSaveEvents,
  expandRecurringEvents,
  subscribeToRealtimeUserSchedules
} from './services/scheduleService';
import { 
  fetchAllAnnouncements, 
  createAnnouncement, 
  updateAnnouncement, 
  deleteAnnouncement, 
  bulkSaveAnnouncements,
  markAnnouncementAsRead,
  subscribeToRealtimeAnnouncements
} from './services/announcementService';

import { isUserSupabaseConfigured, testUserSupabaseConnection } from './services/supabaseClient';
import { Calendar, List } from 'lucide-react';
import { startOfMonth, endOfMonth, addMonths, subMonths } from 'date-fns';

export function App() {
  // Theme state
  const [theme, setTheme] = useState<'light' | 'dark' | 'pink'>(() => {
    const saved = localStorage.getItem('schedy_theme') || localStorage.getItem('schedulesync_theme');
    if (saved === 'dark' || saved === 'light' || saved === 'pink') return saved;
    return 'light';
  });

  useEffect(() => {
    localStorage.setItem('schedy_theme', theme);
    const root = document.documentElement;
    root.classList.remove('light', 'dark', 'pink');
    root.classList.add(theme);
    localStorage.setItem('schedulesync_theme', theme);
  }, [theme]);

  const handleToggleTheme = () => {
    setTheme(prev => (prev === 'dark' ? 'light' : 'dark'));
  };

  const handleTogglePinkTheme = () => {
    setTheme(prev => (prev === 'pink' ? 'light' : 'pink'));
  };

  // Navigation & Role State
  const [activeTab, setActiveTab] = useState<'schedule' | 'announcements' | 'overview'>('schedule');
  const [scheduleViewType, setScheduleViewType] = useState<'calendar' | 'list'>('calendar');

  // Data State
  const [events, setEvents] = useState<ScheduleEvent[]>([]);
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [isCloudConnected, setIsCloudConnected] = useState<boolean>(false);

  // Modals
  const [isEventModalOpen, setIsEventModalOpen] = useState(false);
  const [editingEvent, setEditingEvent] = useState<ScheduleEvent | null>(null);
  const [selectedDateForNewEvent, setSelectedDateForNewEvent] = useState<Date | null>(null);

  const [isAnnouncementModalOpen, setIsAnnouncementModalOpen] = useState(false);
  const [editingAnnouncement, setEditingAnnouncement] = useState<Announcement | null>(null);

  const [isDbConfigModalOpen, setIsDbConfigModalOpen] = useState(false);
  const [isExportModalOpen, setIsExportModalOpen] = useState(false);
  const [isShareModalOpen, setIsShareModalOpen] = useState(false);
  const [initialSyncCode, setInitialSyncCode] = useState('');

  // Detect ?sync= URL parameter on launch
  useEffect(() => {
    try {
      const params = new URLSearchParams(window.location.search);
      const syncParam = params.get('sync');
      if (syncParam) {
        setInitialSyncCode(syncParam);
        setIsShareModalOpen(true);
      }
    } catch (e) {
      console.error(e);
    }
  }, []);

  // Toasts
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  const addToast = useCallback((type: 'success' | 'error' | 'info' | 'urgent', title: string, message?: string) => {
    const id = 'toast_' + Math.random().toString(36).substring(2, 9);
    setToasts(prev => [...prev, { id, type, title, message }]);
  }, []);

  const dismissToast = (id: string) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  };

  // Load Data
  const loadData = useCallback(async () => {
    try {
      const [fetchedEvents, fetchedAnnos] = await Promise.all([
        fetchAllEvents(),
        fetchAllAnnouncements(),
      ]);
      setEvents(fetchedEvents);
      setAnnouncements(fetchedAnnos);

      if (isUserSupabaseConfigured()) {
        const check = await testUserSupabaseConnection();
        setIsCloudConnected(check.success);
      } else {
        setIsCloudConnected(false);
      }
    } catch (err: any) {
      console.error('Failed to load data:', err);
      addToast('error', 'Failed to load data', err.message);
    }
  }, [addToast]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Realtime Subscriptions for Universal Announcements (App Owner Broadcasts)
  useEffect(() => {
    const unsubAnno = subscribeToRealtimeAnnouncements((payload) => {
      fetchAllAnnouncements().then(setAnnouncements);
      if (payload.eventType === 'INSERT') {
        const newRecord = payload.new;
        addToast(
          newRecord.priority === 'dev' ? 'urgent' : 'info',
          `New Announcement: ${newRecord.title}`,
          newRecord.content?.substring(0, 100)
        );
      }
    });

    return () => {
      unsubAnno();
    };
  }, [isCloudConnected, addToast]);

  // Realtime Subscriptions for User Team Calendar Database (if connected by user)
  useEffect(() => {
    if (!isCloudConnected) return;

    const unsubSched = subscribeToRealtimeUserSchedules(() => {
      fetchAllEvents().then(setEvents);
    });

    return () => {
      unsubSched();
    };
  }, [isCloudConnected]);

  // Event Handlers
  const handleSaveEvent = async (eventData: any) => {
    try {
      if (eventData.id) {
        const realId = eventData.id.includes('_rec_') ? eventData.id.split('_rec_')[0] : eventData.id;
        const payload = { ...eventData, id: realId };
        const updated = await updateEvent(payload);
        setEvents(prev => prev.map(e => (e.id === realId ? updated : e)));
        addToast('success', 'Event Updated', `"${updated.title}" was updated.`);
      } else {
        const created = await createEvent(eventData);
        setEvents(prev => [created, ...prev]);
        addToast('success', 'Event Created', `"${created.title}" scheduled successfully.`);
      }
    } catch (err: any) {
      addToast('error', 'Error saving event', err.message);
    }
  };

  const handleDeleteEvent = async (id: string) => {
    try {
      const realId = id.includes('_rec_') ? id.split('_rec_')[0] : id;
      await deleteEvent(realId);
      setEvents(prev => prev.filter(e => e.id !== realId));
      addToast('info', 'Event Deleted', 'The event was removed.');
    } catch (err: any) {
      addToast('error', 'Failed to delete event', err.message);
    }
  };

  const handleStatusChange = async (event: ScheduleEvent, status: EventStatus) => {
    try {
      const realId = event.id.includes('_rec_') ? event.id.split('_rec_')[0] : event.id;
      const baseEvent = events.find(e => e.id === realId) || event;
      const updated = await updateEvent({ ...baseEvent, status });
      setEvents(prev => prev.map(e => (e.id === realId ? updated : e)));
      addToast('success', status === 'completed' ? 'Event Completed' : 'Status Updated');
    } catch (err: any) {
      addToast('error', 'Failed to update status', err.message);
    }
  };

  // Announcement Handlers
  const handleSaveAnnouncement = async (annoData: any) => {
    try {
      if (annoData.id) {
        const updated = await updateAnnouncement(annoData);
        setAnnouncements(prev => prev.map(a => (a.id === updated.id ? updated : a)));
        addToast('success', 'Announcement Updated');
      } else {
        const created = await createAnnouncement(annoData);
        setAnnouncements(prev => [created, ...prev]);
        addToast(
          created.priority === 'dev' ? 'urgent' : 'success',
          'Broadcast Published',
          `"${created.title}" is now active.`
        );
      }
    } catch (err: any) {
      addToast('error', 'Error saving announcement', err.message);
    }
  };

  const handleDeleteAnnouncement = async (id: string) => {
    try {
      await deleteAnnouncement(id);
      setAnnouncements(prev => prev.filter(a => a.id !== id));
      addToast('info', 'Announcement Deleted');
    } catch (err: any) {
      addToast('error', 'Failed to delete announcement', err.message);
    }
  };

  const handleAcknowledgeAnnouncement = async (id: string) => {
    try {
      await markAnnouncementAsRead(id);
      setAnnouncements(prev => prev.map(a => (a.id === id ? { ...a, isRead: true } : a)));
      addToast('success', 'Acknowledged', 'Announcement marked as read.');
    } catch (err: any) {
      console.error(err);
    }
  };

  const handleImportSuccess = async (newEvents: ScheduleEvent[], newAnnos?: Announcement[]) => {
    try {
      const finalEvents = await bulkSaveEvents(newEvents, 'replace');
      setEvents(finalEvents);
      if (newAnnos && newAnnos.length > 0) {
        const finalAnnos = await bulkSaveAnnouncements(newAnnos, 'replace');
        setAnnouncements(finalAnnos);
      }
      addToast('success', 'Import Complete', 'Your schedule backup was restored.');
      setIsExportModalOpen(false);
    } catch (err: any) {
      console.error('Import error:', err);
      addToast('error', 'Import Failed', err.message || 'Could not save imported data.');
    }
  };

  const handleApplySyncCode = async (
    importedEvents: ScheduleEvent[],
    importedAnnos: Announcement[],
    mode: 'replace' | 'merge'
  ) => {
    try {
      const finalEvents = await bulkSaveEvents(importedEvents, mode);
      setEvents(finalEvents);

      if (importedAnnos.length > 0 || mode === 'replace') {
        const finalAnnos = await bulkSaveAnnouncements(importedAnnos, mode);
        setAnnouncements(finalAnnos);
      }

      if (window.location.search.includes('sync=')) {
        try {
          const url = new URL(window.location.href);
          url.searchParams.delete('sync');
          const cleanUrl = url.pathname + (url.search ? url.search : '') + url.hash;
          window.history.replaceState({}, document.title, cleanUrl);
        } catch (e) {
          console.error('Failed to clean sync param from URL:', e);
        }
      }

      addToast(
        'success',
        mode === 'replace' ? 'Calendar Synchronized' : 'Calendar Merged',
        mode === 'replace'
          ? `Exact copy of ${importedEvents.length} events loaded and saved.`
          : `Synchronized ${importedEvents.length} events into your schedule.`
      );
    } catch (err: any) {
      console.error('Sync code error:', err);
      addToast('error', 'Sync Failed', err.message || 'Could not save synchronized events.');
    }
  };

  const unreadCount = announcements.filter(a => !a.isRead).length;
  const urgentAnnouncements = announcements.filter(a => a.priority === 'dev' || a.priority === 'important');

  // Expanded recurring events for calendar display
  const viewRangeStart = subMonths(startOfMonth(new Date()), 1);
  const viewRangeEnd = addMonths(endOfMonth(new Date()), 2);
  const expandedEvents = expandRecurringEvents(events, viewRangeStart, viewRangeEnd);

  return (
    <div className="min-h-screen bg-transparent text-[#1c1917] dark:text-[#f4f4f5] flex flex-col font-sans transition-colors">
      
      {/* App Navbar / Desktop Left Sidebar */}
      <Navbar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        unreadCount={unreadCount}
        isCloudConnected={isCloudConnected}
        theme={theme}
        onToggleTheme={handleToggleTheme}
        onTogglePinkTheme={handleTogglePinkTheme}
        onOpenConfig={() => setIsDbConfigModalOpen(true)}
        onOpenExport={() => setIsExportModalOpen(true)}
        onOpenShare={() => {
          setInitialSyncCode('');
          setIsShareModalOpen(true);
        }}
        onNewEvent={() => {
          setEditingEvent(null);
          setSelectedDateForNewEvent(new Date());
          setIsEventModalOpen(true);
        }}
        onNewAnnouncement={() => {
          setEditingAnnouncement(null);
          setIsAnnouncementModalOpen(true);
        }}
      />

      {/* Main Content Area (Offset for desktop fixed sidebar) */}
      <div className="flex-1 flex flex-col min-w-0 md:pl-60 lg:pl-64 transition-all">
        {/* Top Banner for Urgent Notices */}
        <TopBanner
          urgentAnnouncements={urgentAnnouncements}
          onAcknowledge={handleAcknowledgeAnnouncement}
          onOpenFeed={() => setActiveTab('announcements')}
        />

        {/* Main Container */}
        <main className="flex-1 max-w-6xl w-full mx-auto px-3 sm:px-6 lg:px-8 py-4 sm:py-6 space-y-4">
        
        {/* TAB 1: SCHEDULE VIEW */}
        {activeTab === 'schedule' && (
          <div className="space-y-4">
            {/* View sub-switcher (Calendar vs List) */}
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-lg sm:text-xl font-bold text-[#1c1917] dark:text-white tracking-tight">
                  Schedule
                </h1>
              </div>

              <div className="flex items-center rounded-xl bg-white/80 dark:bg-[#161619]/80 backdrop-blur-md border border-neutral-200/80 dark:border-neutral-800 p-1 text-xs shadow-2xs">
                <button
                  onClick={() => setScheduleViewType('calendar')}
                  className={`flex items-center gap-1.5 px-3 py-1 font-semibold rounded-lg transition-all ${
                    scheduleViewType === 'calendar'
                      ? 'bg-neutral-100 dark:bg-neutral-800 text-[#1c1917] dark:text-white shadow-xs'
                      : 'text-neutral-500 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white'
                  }`}
                >
                  <Calendar className="w-3.5 h-3.5" />
                  <span>Calendar</span>
                </button>

                <button
                  onClick={() => setScheduleViewType('list')}
                  className={`flex items-center gap-1.5 px-3 py-1 font-semibold rounded-lg transition-all ${
                    scheduleViewType === 'list'
                      ? 'bg-neutral-100 dark:bg-neutral-800 text-[#1c1917] dark:text-white shadow-xs'
                      : 'text-neutral-500 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white'
                  }`}
                >
                  <List className="w-3.5 h-3.5" />
                  <span>List</span>
                </button>
              </div>
            </div>

            {scheduleViewType === 'calendar' ? (
              <CalendarView
                events={expandedEvents}
                onSelectEvent={(evt) => {
                  setEditingEvent(evt);
                  setIsEventModalOpen(true);
                }}
                onAddEventForDate={(date) => {
                  setEditingEvent(null);
                  setSelectedDateForNewEvent(date);
                  setIsEventModalOpen(true);
                }}
                onDeleteEvent={handleDeleteEvent}
                onStatusChange={handleStatusChange}
              />
            ) : (
              <EventListView
                events={events}
                onEditEvent={(evt) => {
                  setEditingEvent(evt);
                  setIsEventModalOpen(true);
                }}
                onDeleteEvent={handleDeleteEvent}
                onStatusChange={handleStatusChange}
                onAddNew={() => {
                  setEditingEvent(null);
                  setSelectedDateForNewEvent(new Date());
                  setIsEventModalOpen(true);
                }}
              />
            )}
          </div>
        )}

        {/* TAB 2: ANNOUNCEMENTS VIEW */}
        {activeTab === 'announcements' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h1 className="text-xl font-bold text-[#37352f] dark:text-white tracking-tight">
                Announcements
              </h1>
            </div>

            <AnnouncementFeed
              announcements={announcements}
              onAcknowledge={handleAcknowledgeAnnouncement}
              onEdit={(anno) => {
                setEditingAnnouncement(anno);
                setIsAnnouncementModalOpen(true);
              }}
              onDelete={handleDeleteAnnouncement}
              onAddNew={() => {
                setEditingAnnouncement(null);
                setIsAnnouncementModalOpen(true);
              }}
            />
          </div>
        )}

        {/* TAB 3: OVERVIEW DASHBOARD */}
        {activeTab === 'overview' && (
          <div className="space-y-4">
            <h1 className="text-xl font-bold text-[#37352f] dark:text-white tracking-tight">
              Overview
            </h1>

            <OverviewDashboard
              events={events}
              announcements={announcements}
              onNavigateTab={setActiveTab}
              onNewEvent={() => {
                setEditingEvent(null);
                setSelectedDateForNewEvent(new Date());
                setIsEventModalOpen(true);
              }}
              onNewAnnouncement={() => {
                setEditingAnnouncement(null);
                setIsAnnouncementModalOpen(true);
              }}
              onStatusChange={handleStatusChange}
              onAcknowledgeAnnouncement={handleAcknowledgeAnnouncement}
            />
          </div>
        )}

      </main>

      {/* Minimal Footer */}
      <footer className="mt-auto border-t border-[#e9e9e7] dark:border-[#2e2e2e] bg-white dark:bg-[#191919] py-3 text-xs text-neutral-400">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-2">
          <p className="flex items-center gap-1.5 flex-wrap">
            <span>Schedy • Simple Schedule & Announcements</span>
            <span>•</span>
            <span>Developer:</span>
            <a
              href="https://github.com/3stannn"
              target="_blank"
              rel="noopener noreferrer"
              className="text-[#2383e2] hover:underline font-medium"
            >
              3stannn
            </a>
          </p>
          <div className="flex items-center gap-3">
            <button
              onClick={() => setIsDbConfigModalOpen(true)}
              className="hover:text-neutral-800 dark:hover:text-neutral-200 transition-colors"
            >
              Database
            </button>
            <span>•</span>
            <button
              onClick={() => setIsExportModalOpen(true)}
              className="hover:text-neutral-800 dark:hover:text-neutral-200 transition-colors"
            >
              Export
            </button>
          </div>
        </div>
      </footer>
      </div>

      {/* Modals */}
      <EventModal
        isOpen={isEventModalOpen}
        onClose={() => setIsEventModalOpen(false)}
        onSave={handleSaveEvent}
        onDelete={handleDeleteEvent}
        initialEvent={editingEvent}
        selectedDate={selectedDateForNewEvent}
      />

      <AnnouncementModal
        isOpen={isAnnouncementModalOpen}
        onClose={() => setIsAnnouncementModalOpen(false)}
        onSave={handleSaveAnnouncement}
        initialAnnouncement={editingAnnouncement}
      />

      <DatabaseConfigModal
        isOpen={isDbConfigModalOpen}
        onClose={() => setIsDbConfigModalOpen(false)}
        onConfigSaved={() => {
          loadData();
          addToast('success', 'Database Config Saved', 'Reconnecting with updated credentials...');
        }}
      />

      <ExportImportModal
        isOpen={isExportModalOpen}
        onClose={() => setIsExportModalOpen(false)}
        events={events}
        announcements={announcements}
        onImportSuccess={handleImportSuccess}
      />

      <ShareCodeModal
        isOpen={isShareModalOpen}
        onClose={() => {
          setIsShareModalOpen(false);
          setInitialSyncCode('');
        }}
        events={events}
        announcements={announcements}
        onApplySync={handleApplySyncCode}
        initialCode={initialSyncCode}
      />

      {/* Toast Notification Container */}
      <ToastContainer toasts={toasts} onDismiss={dismissToast} />

    </div>
  );
}
export default App;
