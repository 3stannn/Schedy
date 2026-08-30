import type { Announcement, AnnouncementPriority } from '../types/announcement';
import { getSupabaseClient, isSupabaseConfigured } from './supabaseClient';
import { loadLocalAnnouncements, saveLocalAnnouncements, loadLocalReads, saveLocalReads, getOrCreateUserId } from './storageService';
import type { DatabaseAnnouncementRow } from '../types/database';

function mapRowToAnnouncement(row: DatabaseAnnouncementRow, isRead = false): Announcement {
  return {
    id: row.id,
    title: row.title,
    content: row.content,
    priority: (row.priority || 'general') as AnnouncementPriority,
    category: row.category || 'general',
    isPinned: row.is_pinned ?? false,
    expiresAt: row.expires_at || undefined,
    authorName: row.author_name || 'Admin',
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    isRead,
  };
}

function mapAnnouncementToRow(anno: Announcement): Partial<DatabaseAnnouncementRow> {
  return {
    id: anno.id,
    title: anno.title,
    content: anno.content,
    priority: anno.priority,
    category: anno.category,
    is_pinned: anno.isPinned,
    expires_at: anno.expiresAt || null,
    author_name: anno.authorName,
    updated_at: new Date().toISOString(),
  };
}

const isUUID = (str?: string): boolean =>
  typeof str === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(str);

export async function fetchAllAnnouncements(): Promise<Announcement[]> {
  const userId = getOrCreateUserId();
  const supabase = getSupabaseClient();

  if (supabase && isSupabaseConfigured()) {
    try {
      const [annosRes, readsRes] = await Promise.all([
        supabase.from('announcements').select('*').order('created_at', { ascending: false }),
        supabase.from('announcement_reads').select('announcement_id').eq('user_id', userId)
      ]);

      if (!annosRes.error && annosRes.data) {
        const readSet = new Set((readsRes.data || []).map(r => r.announcement_id));
        const fetched = annosRes.data.map(row => mapRowToAnnouncement(row, readSet.has(row.id)));
        return fetched.sort((a, b) => {
          if (a.isPinned !== b.isPinned) return a.isPinned ? -1 : 1;
          return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
        });
      }
      console.warn('Supabase announcement fetch failed, falling back:', annosRes.error?.message);
    } catch (err) {
      console.warn('Supabase error:', err);
    }
  }

  // Local fallback
  const local = loadLocalAnnouncements();
  const reads = loadLocalReads();
  const readSet = new Set(reads.filter(r => r.userId === userId).map(r => r.announcementId));

  return local.map(a => ({
    ...a,
    isRead: readSet.has(a.id),
  })).sort((a, b) => {
    // Pinned first, then urgent, then newest
    if (a.isPinned !== b.isPinned) return a.isPinned ? -1 : 1;
    return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
  });
}

export async function bulkSaveAnnouncements(
  annosList: Announcement[],
  mode: 'replace' | 'merge'
): Promise<Announcement[]> {
  const current = loadLocalAnnouncements();
  let finalAnnos: Announcement[];

  if (mode === 'replace') {
    finalAnnos = annosList;
  } else {
    const existingIds = new Set(current.map(a => a.id));
    const newAnnos = annosList.filter(a => !existingIds.has(a.id));
    finalAnnos = [...current, ...newAnnos];
  }

  saveLocalAnnouncements(finalAnnos);

  const supabase = getSupabaseClient();
  if (supabase && isSupabaseConfigured()) {
    try {
      const targetAnnos = mode === 'replace' ? finalAnnos : annosList;
      const rows = targetAnnos.map(anno => {
        const row = mapAnnouncementToRow(anno);
        if (!isUUID(anno.id)) {
          delete row.id;
        }
        return row;
      });

      if (rows.length > 0) {
        await supabase.from('announcements').upsert(rows);
      }
    } catch (err) {
      console.warn('Supabase bulk save announcements error:', err);
    }
  }

  return finalAnnos;
}


export async function createAnnouncement(data: Omit<Announcement, 'id' | 'createdAt' | 'updatedAt' | 'isRead'>): Promise<Announcement> {
  const newAnno: Announcement = {
    ...data,
    id: 'anno_' + Math.random().toString(36).substring(2, 11),
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    isRead: false,
  };

  const supabase = getSupabaseClient();
  if (supabase && isSupabaseConfigured()) {
    try {
      const row = mapAnnouncementToRow(newAnno);
      const { data: inserted, error } = await supabase
        .from('announcements')
        .insert([
          {
            title: row.title,
            content: row.content,
            priority: row.priority,
            category: row.category,
            is_pinned: row.is_pinned,
            expires_at: row.expires_at,
            author_name: row.author_name,
          }
        ])
        .select()
        .single();

      if (!error && inserted) {
        const created = mapRowToAnnouncement(inserted, false);
        const local = loadLocalAnnouncements();
        saveLocalAnnouncements([created, ...local]);
        return created;
      }
      console.warn('Supabase announcement insert failed, using local:', error?.message);
    } catch (err) {
      console.warn('Supabase error:', err);
    }
  }

  const local = loadLocalAnnouncements();
  const updated = [newAnno, ...local];
  saveLocalAnnouncements(updated);
  return newAnno;
}

export async function updateAnnouncement(anno: Announcement): Promise<Announcement> {
  const updatedAnno: Announcement = {
    ...anno,
    updatedAt: new Date().toISOString(),
  };

  const supabase = getSupabaseClient();
  if (supabase && isSupabaseConfigured() && isUUID(anno.id)) {
    try {
      const row = mapAnnouncementToRow(updatedAnno);
      const { data: updatedRow, error } = await supabase
        .from('announcements')
        .update(row)
        .eq('id', anno.id)
        .select()
        .single();

      if (!error && updatedRow) {
        const saved = mapRowToAnnouncement(updatedRow, anno.isRead);
        const local = loadLocalAnnouncements();
        saveLocalAnnouncements(local.map(a => (a.id === anno.id ? saved : a)));
        return saved;
      }
    } catch (err) {
      console.warn('Supabase announcement update error:', err);
    }
  }

  const local = loadLocalAnnouncements();
  const updatedList = local.map(a => (a.id === anno.id ? updatedAnno : a));
  saveLocalAnnouncements(updatedList);
  return updatedAnno;
}

export async function deleteAnnouncement(id: string): Promise<boolean> {
  const supabase = getSupabaseClient();
  if (supabase && isSupabaseConfigured() && isUUID(id)) {
    try {
      await supabase.from('announcements').delete().eq('id', id);
    } catch (err) {
      console.warn('Supabase announcement delete error:', err);
    }
  }

  const local = loadLocalAnnouncements();
  saveLocalAnnouncements(local.filter(a => a.id !== id));
  return true;
}

export async function markAnnouncementAsRead(announcementId: string): Promise<void> {
  const userId = getOrCreateUserId();
  const supabase = getSupabaseClient();

  if (supabase && isSupabaseConfigured() && isUUID(announcementId)) {
    try {
      await supabase.from('announcement_reads').upsert({
        announcement_id: announcementId,
        user_id: userId,
        read_at: new Date().toISOString(),
      }, { onConflict: 'announcement_id, user_id' });
    } catch (err) {
      console.warn('Supabase read mark error:', err);
    }
  }

  const localReads = loadLocalReads();
  if (!localReads.some(r => r.announcementId === announcementId && r.userId === userId)) {
    const updated = [
      ...localReads,
      {
        id: 'read_' + Math.random().toString(36).substring(2, 9),
        announcementId,
        userId,
        readAt: new Date().toISOString(),
      }
    ];
    saveLocalReads(updated);
  }
}

/**
 * Subscribe to realtime announcement updates if Supabase is connected
 */
export function subscribeToRealtimeAnnouncements(onUpdate: (payload: any) => void): () => void {
  const supabase = getSupabaseClient();
  if (!supabase || !isSupabaseConfigured()) {
    return () => {};
  }

  const channel = supabase
    .channel('public:announcements')
    .on('postgres_changes', { event: '*', schema: 'public', table: 'announcements' }, payload => {
      onUpdate(payload);
    })
    .subscribe();

  return () => {
    supabase.removeChannel(channel);
  };
}

export function subscribeToRealtimeSchedules(onUpdate: (payload: any) => void): () => void {
  const supabase = getSupabaseClient();
  if (!supabase || !isSupabaseConfigured()) {
    return () => {};
  }

  const channel = supabase
    .channel('public:schedules')
    .on('postgres_changes', { event: '*', schema: 'public', table: 'schedules' }, payload => {
      onUpdate(payload);
    })
    .subscribe();

  return () => {
    supabase.removeChannel(channel);
  };
}
