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
  expandRecurringEvents 
} from './services/scheduleService';
import { 
  fetchAllAnnouncements, 
  createAnnouncement, 
  updateAnnouncement, 
  deleteAnnouncement, 
  markAnnouncementAsRead,
  subscribeToRealtimeAnnouncements,
  subscribeToRealtimeSchedules
} from './services/announcementService';
import { isSupabaseConfigured, testSupabaseConnection } from './services/supabaseClient';
import { Calendar, List, Megaphone, BarChart3 } from 'lucide-react';
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
  const [isAdmin, setIsAdmin] = useState<boolean>(true);

  // Data State
  const [events, setEvents] = useState<ScheduleEvent[]>([]);
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [, setLoading] = useState<boolean>(true);
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
    setLoading(true);
    try {
      const [fetchedEvents, fetchedAnnos] = await Promise.all([
        fetchAllEvents(),
        fetchAllAnnouncements(),
      ]);
      setEvents(fetchedEvents);
      setAnnouncements(fetchedAnnos);

      if (isSupabaseConfigured()) {
        const check = await testSupabaseConnection();
        setIsCloudConnected(check.success);
      } else {
        setIsCloudConnected(false);
      }
    } catch (err: any) {
      console.error('Failed to load data:', err);
      addToast('error', 'Failed to load data', err.message);
    } finally {
      setLoading(false);
    }
  }, [addToast]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Realtime Subscriptions
  useEffect(() => {
    if (!isCloudConnected) return;

    const unsubAnno = subscribeToRealtimeAnnouncements((payload) => {
      loadData();
      if (payload.eventType === 'INSERT') {
        const newRecord = payload.new;
        addToast(
          newRecord.priority === 'urgent' ? 'urgent' : 'info',
          `New Announcement: ${newRecord.title}`,
          newRecord.content?.substring(0, 100)
        );
      }
    });

    const unsubSched = subscribeToRealtimeSchedules(() => {
      loadData();
    });

    return () => {
      unsubAnno();
      unsubSched();
    };
  }, [isCloudConnected, loadData, addToast]);

  // Event Handlers
  const handleSaveEvent = async (eventData: any) => {
    try {
      if (eventData.id) {
        const updated = await updateEvent(eventData);
        setEvents(prev => prev.map(e => (e.id === updated.id ? updated : e)));
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
      await deleteEvent(id);
      setEvents(prev => prev.filter(e => e.id !== id));
      addToast('info', 'Event Deleted', 'The event was removed.');
    } catch (err: any) {
      addToast('error', 'Failed to delete event', err.message);
    }
  };

  const handleStatusChange = async (event: ScheduleEvent, status: EventStatus) => {
    try {
      const updated = await updateEvent({ ...event, status });
      setEvents(prev => prev.map(e => (e.id === updated.id ? updated : e)));
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
          created.priority === 'urgent' ? 'urgent' : 'success',
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

  const handleImportSuccess = (newEvents: ScheduleEvent[], newAnnos?: Announcement[]) => {
    setEvents(newEvents);
    if (newAnnos) setAnnouncements(newAnnos);
    addToast('success', 'Import Complete', 'Your schedule backup was restored.');
    setIsExportModalOpen(false);
  };

  const handleApplySyncCode = (
    importedEvents: ScheduleEvent[],
    importedAnnos: Announcement[],
    mode: 'replace' | 'merge'
  ) => {
    if (mode === 'replace') {
      setEvents(importedEvents);
      if (importedAnnos.length > 0) {
        setAnnouncements(importedAnnos);
      }
      addToast('success', 'Calendar Synchronized', `Exact copy of ${importedEvents.length} events loaded.`);
    } else {
      // Merge mode
      setEvents(prev => {
        const existingIds = new Set(prev.map(e => e.id));
        const newEvents = importedEvents.filter(e => !existingIds.has(e.id));
        return [...prev, ...newEvents];
      });
      if (importedAnnos.length > 0) {
        setAnnouncements(prev => {
          const existingIds = new Set(prev.map(a => a.id));
          const newAnnos = importedAnnos.filter(a => !existingIds.has(a.id));
          return [...prev, ...newAnnos];
        });
      }
      addToast('success', 'Calendar Merged', `Synchronized ${importedEvents.length} events into your schedule.`);
    }
  };

  const unreadCount = announcements.filter(a => !a.isRead).length;
  const urgentAnnouncements = announcements.filter(a => a.priority === 'urgent');

  // Expanded recurring events for calendar display
  const viewRangeStart = subMonths(startOfMonth(new Date()), 1);
  const viewRangeEnd = addMonths(endOfMonth(new Date()), 2);
  const expandedEvents = expandRecurringEvents(events, viewRangeStart, viewRangeEnd);

  return (
    <div className="min-h-screen bg-transparent text-[#1c1917] dark:text-[#f4f4f5] flex flex-col font-sans transition-colors">
      
      {/* Top Banner for Urgent Notices */}
      <TopBanner
        urgentAnnouncements={urgentAnnouncements}
        onAcknowledge={handleAcknowledgeAnnouncement}
        onOpenFeed={() => setActiveTab('announcements')}
      />

      {/* App Navbar */}
      <Navbar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        isAdmin={isAdmin}
        setIsAdmin={setIsAdmin}
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

      {/* Main Container */}
      <main className="flex-1 max-w-6xl w-full mx-auto px-3 sm:px-6 lg:px-8 py-4 space-y-4">
        
        {/* TAB 1: SCHEDULE VIEW */}
        {activeTab === 'schedule' && (
          <div className="space-y-4">
            {/* View sub-switcher (Calendar vs List) */}
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-lg sm:text-xl font-bold text-[#1c1917] dark:text-white tracking-tight flex items-center gap-2">
                  <Calendar className="w-5 h-5 text-[#2383e2]" />
                  <span>Schedule</span>
                </h1>
              </div>

              <div className="flex items-center rounded-xl bg-white/80 dark:bg-[#161619]/80 backdrop-blur-md border border-neutral-200/80 dark:border-neutral-800 p-0.5 text-xs shadow-2xs">
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
                isAdmin={isAdmin}
                onSelectEvent={(evt) => {
                  if (isAdmin) {
                    setEditingEvent(evt);
                    setIsEventModalOpen(true);
                  }
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
                isAdmin={isAdmin}
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
              <h1 className="text-xl font-bold text-[#37352f] dark:text-white tracking-tight flex items-center gap-2">
                <Megaphone className="w-5 h-5 text-[#2383e2]" />
                <span>Announcements</span>
              </h1>
            </div>

            <AnnouncementFeed
              announcements={announcements}
              isAdmin={isAdmin}
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
            <h1 className="text-xl font-bold text-[#37352f] dark:text-white tracking-tight flex items-center gap-2">
              <BarChart3 className="w-5 h-5 text-[#2383e2]" />
              <span>Overview</span>
            </h1>

            <OverviewDashboard
              events={events}
              announcements={announcements}
              isAdmin={isAdmin}
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
          <p>
            Schedy • Simple Schedule & Announcements
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
