import type { Announcement, AnnouncementPriority } from '../types/announcement';
import { getUniversalSupabaseClient, isUniversalSupabaseConfigured } from './supabaseClient';
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

export function verifyDevPassword(input: string): boolean {
  if (!input) return false;
  const configuredPass = (import.meta as any).env?.VITE_DEV_PASSWORD;
  if (!configuredPass) {
    console.warn('VITE_DEV_PASSWORD is not configured in .env');
    return false;
  }
  return input.trim() === configuredPass.trim();
}

const isUUID = (str?: string): boolean =>
  typeof str === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(str);

export async function fetchAllAnnouncements(): Promise<Announcement[]> {
  const userId = getOrCreateUserId();
  const supabase = getUniversalSupabaseClient();
  let universalAnnos: Announcement[] = [];

  if (supabase && isUniversalSupabaseConfigured()) {
    try {
      const [annosRes, readsRes] = await Promise.all([
        supabase.from('announcements').select('*').order('created_at', { ascending: false }),
        supabase.from('announcement_reads').select('announcement_id').eq('user_id', userId)
      ]);

      if (!annosRes.error && annosRes.data) {
        const readSet = new Set((readsRes.data || []).map((r: any) => r.announcement_id));
        universalAnnos = annosRes.data.map((row: any) => mapRowToAnnouncement(row as DatabaseAnnouncementRow, readSet.has(row.id)));
      } else if (annosRes.error) {
        console.warn('Universal announcements fetch failed:', annosRes.error.message);
      }
    } catch (err) {
      console.warn('Universal announcements fetch error:', err);
    }
  }

  // Load local announcements
  const local = loadLocalAnnouncements();
  const reads = loadLocalReads();
  const readSet = new Set(reads.filter(r => r.userId === userId).map(r => r.announcementId));
  const localWithReads = local.map(a => ({
    ...a,
    isRead: readSet.has(a.id),
  }));

  // Merge universal and local announcements by ID
  const map = new Map<string, Announcement>();
  for (const a of universalAnnos) {
    map.set(a.id, a);
  }
  for (const a of localWithReads) {
    if (!map.has(a.id)) {
      map.set(a.id, a);
    }
  }

  const all = Array.from(map.values());

  return all.sort((a, b) => {
    // 1. Pinned first
    if (a.isPinned !== b.isPinned) return a.isPinned ? -1 : 1;
    // 2. Dev announcements next
    const isADev = a.priority === 'dev';
    const isBDev = b.priority === 'dev';
    if (isADev !== isBDev) return isADev ? -1 : 1;
    // 3. Urgent announcements next
    const isAUrgent = a.priority === 'urgent';
    const isBUrgent = b.priority === 'urgent';
    if (isAUrgent !== isBUrgent) return isAUrgent ? -1 : 1;
    // 4. Newest created at
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

  const supabase = getUniversalSupabaseClient();
  if (supabase && isUniversalSupabaseConfigured()) {
    try {
      const targetAnnos = mode === 'replace' ? finalAnnos : annosList;
      // Only upsert dev priority announcements to Universal database
      const devAnnos = targetAnnos.filter(a => a.priority === 'dev');
      const rows = devAnnos.map(anno => {
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
      console.warn('Universal announcements bulk save error:', err);
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

  const supabase = getUniversalSupabaseClient();
  // ONLY broadcast to universal Supabase database if priority is 'dev'
  if (data.priority === 'dev' && supabase && isUniversalSupabaseConfigured()) {
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
      console.warn('Universal announcement broadcast insert failed, saving locally:', error?.message);
    } catch (err) {
      console.warn('Universal announcement broadcast error:', err);
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

  const supabase = getUniversalSupabaseClient();
  
  // If converted to or staying as 'dev' priority
  if (anno.priority === 'dev' && supabase && isUniversalSupabaseConfigured()) {
    try {
      if (isUUID(anno.id)) {
        // Already on Supabase, update row
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
      } else {
        // Promoted from local to Supabase Dev broadcast
        const row = mapAnnouncementToRow(updatedAnno);
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
          const created = mapRowToAnnouncement(inserted, anno.isRead);
          // Remove old local announcement with non-UUID id
          const local = loadLocalAnnouncements();
          saveLocalAnnouncements([created, ...local.filter(a => a.id !== anno.id)]);
          return created;
        }
      }
    } catch (err) {
      console.warn('Universal announcement update error:', err);
    }
  } else if (anno.priority !== 'dev' && supabase && isUniversalSupabaseConfigured() && isUUID(anno.id)) {
    // Demoted from Universal Supabase broadcast to local announcement
    try {
      await supabase.from('announcements').delete().eq('id', anno.id);
    } catch (err) {
      console.warn('Supabase delete on demote error:', err);
    }
  }

  const local = loadLocalAnnouncements();
  const updatedList = local.map(a => (a.id === anno.id ? updatedAnno : a));
  saveLocalAnnouncements(updatedList);
  return updatedAnno;
}

export async function deleteAnnouncement(id: string): Promise<boolean> {
  const supabase = getUniversalSupabaseClient();
  if (supabase && isUniversalSupabaseConfigured() && isUUID(id)) {
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
  const supabase = getUniversalSupabaseClient();

  if (supabase && isUniversalSupabaseConfigured() && isUUID(announcementId)) {
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
  const supabase = getUniversalSupabaseClient();
  if (!supabase || !isUniversalSupabaseConfigured()) {
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

