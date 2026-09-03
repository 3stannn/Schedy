import { useState, useEffect, useCallback } from 'react';
import type { ScheduleEvent, EventStatus } from './types/schedule';
import type { Announcement } from './types/announcement';
import type { Note } from './types/note';
import { Navbar } from './components/layout/Navbar';
import { TopBanner } from './components/layout/TopBanner';
import { CalendarView } from './components/schedule/CalendarView';
import { EventListView } from './components/schedule/EventListView';
import { EventModal } from './components/schedule/EventModal';
import { AnnouncementFeed } from './components/announcements/AnnouncementFeed';
import { AnnouncementModal } from './components/announcements/AnnouncementModal';
import { TaskBoard } from './components/tasks/TaskBoard';
import { NoteModal } from './components/tasks/NoteModal';
import { DatabaseConfigModal } from './components/settings/DatabaseConfigModal';
import { ExportImportModal } from './components/settings/ExportImportModal';
import { ShareCodeModal } from './components/settings/ShareCodeModal';
import { OverviewDashboard } from './components/common/OverviewDashboard';
import { PomodoroTimer, type PomodoroInfo } from './components/tools/PomodoroTimer';
import { ToastContainer } from './components/common/Toast';
import type { ToastMessage } from './components/common/Toast';

import { 
  fetchAllEvents, 
  createEvent, 
  updateEvent, 
  deleteEvent, 
  bulkSaveEvents,
  expandRecurringEvents,
  subscribeToRealtimeUserSchedules,
  cleanupExpiredEvents
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
import {
  fetchAllNotes,
  createNote,
  updateNote,
  deleteNote,
  bulkSaveNotes,
  subscribeToRealtimeNotes
} from './services/noteService';

import { isUserSupabaseConfigured, testUserSupabaseConnection } from './services/supabaseClient';
import { Calendar, List } from './components/common/MovingIcon';
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
  const [activeTab, setActiveTab] = useState<'schedule' | 'announcements' | 'overview' | 'tasks' | 'pomodoro'>('schedule');
  const [scheduleViewType, setScheduleViewType] = useState<'calendar' | 'list'>('calendar');
  const [pomodoroInfo, setPomodoroInfo] = useState<PomodoroInfo | undefined>();

  // Data State
  const [events, setEvents] = useState<ScheduleEvent[]>([]);
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [notes, setNotes] = useState<Note[]>([]);
  const [isCloudConnected, setIsCloudConnected] = useState<boolean>(false);

  // Modals
  const [isEventModalOpen, setIsEventModalOpen] = useState(false);
  const [editingEvent, setEditingEvent] = useState<ScheduleEvent | null>(null);
  const [selectedDateForNewEvent, setSelectedDateForNewEvent] = useState<Date | null>(null);
  const [initialTaskStatusForModal, setInitialTaskStatusForModal] = useState<EventStatus>('pending');

  const [isAnnouncementModalOpen, setIsAnnouncementModalOpen] = useState(false);
  const [editingAnnouncement, setEditingAnnouncement] = useState<Announcement | null>(null);

  const [isNoteModalOpen, setIsNoteModalOpen] = useState(false);
  const [editingNote, setEditingNote] = useState<Note | null>(null);

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
      const [fetchedEvents, fetchedAnnos, fetchedNotes] = await Promise.all([
        fetchAllEvents(),
        fetchAllAnnouncements(),
        fetchAllNotes(),
      ]);
      setEvents(fetchedEvents);
      setAnnouncements(fetchedAnnos);
      setNotes(fetchedNotes);

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

  // Periodic Auto-Cleanup for Expired Events (5 days uncompleted, 2 days completed)
  useEffect(() => {
    const runAutoCleanup = async () => {
      const { activeEvents, deletedCount } = await cleanupExpiredEvents();
      if (deletedCount > 0) {
        setEvents(activeEvents);
        addToast(
          'info',
          'Auto-Cleanup Completed',
          `Removed ${deletedCount} expired event${deletedCount > 1 ? 's' : ''} (5d uncompleted / 2d completed rule).`
        );
      }
    };

    const interval = setInterval(runAutoCleanup, 15 * 60 * 1000);
    const handleVisibility = () => {
      if (document.visibilityState === 'visible') {
        runAutoCleanup();
      }
    };
    document.addEventListener('visibilitychange', handleVisibility);

    return () => {
      clearInterval(interval);
      document.removeEventListener('visibilitychange', handleVisibility);
    };
  }, [addToast]);

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

    const unsubNotes = subscribeToRealtimeNotes(() => {
      fetchAllNotes().then(setNotes);
    });

    return () => {
      unsubSched();
      unsubNotes();
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

  // Note Handlers
  const handleSaveNote = async (noteData: any) => {
    try {
      if (noteData.id) {
        const updated = await updateNote(noteData);
        setNotes(prev => prev.map(n => (n.id === updated.id ? updated : n)));
        addToast('success', 'Note Updated', `"${updated.title}" updated.`);
      } else {
        const created = await createNote(noteData);
        setNotes(prev => [created, ...prev]);
        addToast('success', 'Note Created', `"${created.title}" saved.`);
      }
    } catch (err: any) {
      addToast('error', 'Error saving note', err.message);
    }
  };

  const handleDeleteNote = async (id: string) => {
    try {
      await deleteNote(id);
      setNotes(prev => prev.filter(n => n.id !== id));
      addToast('info', 'Note Deleted', 'The note was removed.');
    } catch (err: any) {
      addToast('error', 'Failed to delete note', err.message);
    }
  };

  const handleTogglePinNote = async (note: Note) => {
    try {
      const updated = await updateNote({ ...note, isPinned: !note.isPinned });
      setNotes(prev => prev.map(n => (n.id === updated.id ? updated : n)));
    } catch (err: any) {
      console.error(err);
    }
  };

  const handleAddNewTaskFromBoard = (status: EventStatus) => {
    setEditingEvent(null);
    setSelectedDateForNewEvent(new Date());
    setInitialTaskStatusForModal(status);
    setIsEventModalOpen(true);
  };

  const handleImportSuccess = async (newEvents: ScheduleEvent[], newAnnos?: Announcement[], newNotes?: Note[]) => {
    try {
      const finalEvents = await bulkSaveEvents(newEvents, 'replace');
      setEvents(finalEvents);
      if (newAnnos && newAnnos.length > 0) {
        const finalAnnos = await bulkSaveAnnouncements(newAnnos, 'replace');
        setAnnouncements(finalAnnos);
      }
      if (newNotes && newNotes.length > 0) {
        const finalNotes = await bulkSaveNotes(newNotes, 'replace');
        setNotes(finalNotes);
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
    <div className="min-h-screen bg-[#f2f2f7] dark:bg-[#000000] text-black dark:text-white flex flex-col font-sans transition-colors">
      
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
          setInitialTaskStatusForModal('pending');
          setIsEventModalOpen(true);
        }}
        onNewAnnouncement={() => {
          setEditingAnnouncement(null);
          setIsAnnouncementModalOpen(true);
        }}
        onNewTask={() => {
          setEditingEvent(null);
          setSelectedDateForNewEvent(new Date());
          setInitialTaskStatusForModal('pending');
          setIsEventModalOpen(true);
        }}
        pomodoroInfo={pomodoroInfo}
      />

      {/* Main Content Area (Offset for desktop fixed sidebar) */}
      <div className="flex-1 flex flex-col min-w-0 md:pl-60 lg:pl-64 transition-all">
        {/* Top Banner for Urgent Notices */}
        <TopBanner
          urgentAnnouncements={urgentAnnouncements}
          onAcknowledge={handleAcknowledgeAnnouncement}
          onOpenFeed={() => setActiveTab('announcements')}
        />

        {/* Main Container with generous responsive padding */}
        <main className="flex-1 w-full max-w-[1560px] mx-auto px-3.5 sm:px-6 md:px-10 lg:px-12 xl:px-16 2xl:px-20 py-4 sm:py-6 space-y-4 sm:space-y-6">
        
        {/* TAB 1: SCHEDULE VIEW */}
        {activeTab === 'schedule' && (
          <div className="space-y-4">
            {/* View sub-switcher (Calendar vs List) - iOS Large Title & Segmented Control */}
            <div className="flex items-center justify-between gap-3">
              <div>
                <h1 className="text-2xl sm:text-3xl font-bold text-neutral-900 dark:text-white tracking-tight">
                  Schedule
                </h1>
              </div>

              <div className="ios-segmented-control">
                <button
                  onClick={() => setScheduleViewType('calendar')}
                  className={`ios-segmented-item gap-1.5 ${
                    scheduleViewType === 'calendar' ? 'ios-segmented-item-active' : ''
                  }`}
                >
                  <Calendar className="w-3.5 h-3.5" />
                  <span>Calendar</span>
                </button>

                <button
                  onClick={() => setScheduleViewType('list')}
                  className={`ios-segmented-item gap-1.5 ${
                    scheduleViewType === 'list' ? 'ios-segmented-item-active' : ''
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
              <h1 className="text-2xl sm:text-3xl font-bold text-neutral-900 dark:text-white tracking-tight">
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
            <h1 className="text-2xl sm:text-3xl font-bold text-neutral-900 dark:text-white tracking-tight">
              Overview
            </h1>

            <OverviewDashboard
              events={events}
              announcements={announcements}
              onNavigateTab={setActiveTab}
              onNewEvent={() => {
                setEditingEvent(null);
                setSelectedDateForNewEvent(new Date());
                setInitialTaskStatusForModal('pending');
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

        {/* TAB 4: TASKS (KANBAN & NOTES) VIEW */}
        {activeTab === 'tasks' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h1 className="text-2xl sm:text-3xl font-bold text-neutral-900 dark:text-white tracking-tight">
                Task Board
              </h1>
            </div>

            <TaskBoard
              events={events}
              notes={notes}
              onSelectEvent={(evt) => {
                setEditingEvent(evt);
                setIsEventModalOpen(true);
              }}
              onStatusChange={handleStatusChange}
              onAddNewEvent={handleAddNewTaskFromBoard}
              onSelectNote={(note) => {
                setEditingNote(note);
                setIsNoteModalOpen(true);
              }}
              onAddNewNote={() => {
                setEditingNote(null);
                setIsNoteModalOpen(true);
              }}
              onDeleteNote={handleDeleteNote}
              onTogglePinNote={handleTogglePinNote}
            />
          </div>
        )}

        {/* TAB 5: POMODORO TIMER VIEW (Persistent across all tabs) */}
        <PomodoroTimer
          events={events}
          onStatusChange={handleStatusChange}
          isActiveView={activeTab === 'pomodoro'}
          onNavigateToPomodoro={() => setActiveTab('pomodoro')}
          onTimerTick={setPomodoroInfo}
        />

      </main>

      {/* Minimal Footer */}
      <footer className="mt-auto border-t border-[#e9e9e7] dark:border-[#2e2e2e] bg-white dark:bg-[#191919] py-3.5 text-xs text-neutral-400">
        <div className="w-full max-w-[1560px] mx-auto px-6 sm:px-10 md:px-12 lg:px-16 xl:px-20 2xl:px-24 flex flex-col items-center justify-center text-center gap-2">
          <p className="flex items-center justify-center gap-1.5 flex-wrap">
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
          <div className="flex items-center justify-center gap-3">
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
        initialStatus={initialTaskStatusForModal}
      />

      <AnnouncementModal
        isOpen={isAnnouncementModalOpen}
        onClose={() => setIsAnnouncementModalOpen(false)}
        onSave={handleSaveAnnouncement}
        initialAnnouncement={editingAnnouncement}
      />

      <NoteModal
        isOpen={isNoteModalOpen}
        onClose={() => setIsNoteModalOpen(false)}
        onSave={handleSaveNote}
        onDelete={handleDeleteNote}
        initialNote={editingNote}
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
        notes={notes}
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
