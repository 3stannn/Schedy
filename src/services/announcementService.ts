import type { Announcement, AnnouncementPriority } from '../types/announcement';
import { 
  getUniversalSupabaseClient, 
  isUniversalSupabaseConfigured,
  getUserSupabaseClient,
  isUserSupabaseConfigured
} from './supabaseClient';
import type { SupabaseClient } from '@supabase/supabase-js';
import { loadLocalAnnouncements, saveLocalAnnouncements, loadLocalReads, saveLocalReads, getOrCreateUserId } from './storageService';
import type { DatabaseAnnouncementRow } from '../types/database';

function mapRowToAnnouncement(row: DatabaseAnnouncementRow, isRead = false): Announcement {
  return {
    id: row.id,
    title: row.title,
    content: row.content,
    priority: (row.priority === 'dev' ? 'dev' : 'important') as AnnouncementPriority,
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

const FALLBACK_DEV_PASS = 's8JUzc5rMsmPp3ombM21RQ@Dev2026!';

export function verifyDevPassword(input: string): boolean {
  if (!input) return false;
  const configuredPass = (import.meta as any).env?.VITE_DEV_PASSWORD || FALLBACK_DEV_PASS;
  return input.trim() === configuredPass.trim();
}

const isUUID = (str?: string): boolean =>
  typeof str === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(str);

export async function fetchAllAnnouncements(): Promise<Announcement[]> {
  const userId = getOrCreateUserId();
  let universalAnnos: Announcement[] = [];
  let userDbAnnos: Announcement[] = [];

  // 1. Fetch Universal Dev Announcements ONLY
  const universalClient = getUniversalSupabaseClient();
  if (universalClient && isUniversalSupabaseConfigured()) {
    try {
      const [annosRes, readsRes] = await Promise.all([
        universalClient.from('announcements').select('*').eq('priority', 'dev').order('created_at', { ascending: false }),
        universalClient.from('announcement_reads').select('announcement_id').eq('user_id', userId)
      ]);

      if (!annosRes.error && annosRes.data) {
        const readSet = new Set((readsRes.data || []).map((r: any) => r.announcement_id));
        universalAnnos = annosRes.data.map((row: any) => mapRowToAnnouncement(row as DatabaseAnnouncementRow, readSet.has(row.id)));
      }
    } catch (err) {
      console.warn('Universal announcements fetch error:', err);
    }
  }

  // 2. Fetch User Connected Database Announcements (if team Cloud Sync is connected)
  const userClient = getUserSupabaseClient();
  if (userClient && isUserSupabaseConfigured()) {
    try {
      const [annosRes, readsRes] = await Promise.all([
        userClient.from('announcements').select('*').order('created_at', { ascending: false }),
        userClient.from('announcement_reads').select('announcement_id').eq('user_id', userId)
      ]);

      if (!annosRes.error && annosRes.data) {
        const readSet = new Set((readsRes.data || []).map((r: any) => r.announcement_id));
        userDbAnnos = annosRes.data.map((row: any) => mapRowToAnnouncement(row as DatabaseAnnouncementRow, readSet.has(row.id)));
      }
    } catch (err) {
      console.warn('User DB announcements fetch error:', err);
    }
  }

  // 3. Load local client-side announcements
  const local = loadLocalAnnouncements();
  const reads = loadLocalReads();
  const readSet = new Set(reads.filter(r => r.userId === userId).map(r => r.announcementId));
  const localWithReads = local.map(a => ({
    ...a,
    priority: (a.priority === 'dev' ? 'dev' : 'important') as AnnouncementPriority,
    isRead: readSet.has(a.id),
  }));

  // Merge: Universal Announcements take precedence, then User DB, then Local
  const map = new Map<string, Announcement>();
  for (const a of universalAnnos) {
    map.set(a.id, a);
  }
  for (const a of userDbAnnos) {
    if (!map.has(a.id)) {
      map.set(a.id, a);
    }
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
    // 3. Important announcements next
    const isAImp = a.priority === 'important';
    const isBImp = b.priority === 'important';
    if (isAImp !== isBImp) return isAImp ? -1 : 1;
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

  // 1. Universal Supabase DB - ONLY upsert dev priority announcements
  const universalClient = getUniversalSupabaseClient();
  if (universalClient && isUniversalSupabaseConfigured()) {
    try {
      const targetAnnos = mode === 'replace' ? finalAnnos : annosList;
      const devAnnos = targetAnnos.filter(a => a.priority === 'dev');
      const rows = devAnnos.map(anno => {
        const row = mapAnnouncementToRow(anno);
        if (!isUUID(anno.id)) {
          delete row.id;
        }
        return row;
      });

      if (rows.length > 0) {
        await universalClient.from('announcements').upsert(rows);
      }
    } catch (err) {
      console.warn('Universal announcements bulk save error:', err);
    }
  }

  // 2. User Connected DB - upsert all announcements if configured
  const userClient = getUserSupabaseClient();
  if (userClient && isUserSupabaseConfigured()) {
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
        await userClient.from('announcements').upsert(rows);
      }
    } catch (err) {
      console.warn('User DB announcements bulk save error:', err);
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

  const universalClient = getUniversalSupabaseClient();
  const userClient = getUserSupabaseClient();

  // 1. If priority is 'dev', broadcast to Universal Supabase DB
  if (data.priority === 'dev' && universalClient && isUniversalSupabaseConfigured()) {
    try {
      const row = mapAnnouncementToRow(newAnno);
      const { data: inserted, error } = await universalClient
        .from('announcements')
        .insert([
          {
            title: row.title,
            content: row.content,
            priority: 'dev',
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
    } catch (err) {
      console.warn('Universal dev announcement broadcast error:', err);
    }
  }

  // 2. If user has connected their own Team Cloud Sync DB, push to user DB
  if (userClient && isUserSupabaseConfigured()) {
    try {
      const row = mapAnnouncementToRow(newAnno);
      const { data: inserted, error } = await userClient
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
    } catch (err) {
      console.warn('User DB announcement insert error:', err);
    }
  }

  // 3. Save to local storage cache
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

  const universalClient = getUniversalSupabaseClient();
  const userClient = getUserSupabaseClient();

  // 1. Handle Universal Dev Broadcast Database
  if (universalClient && isUniversalSupabaseConfigured()) {
    try {
      if (anno.priority === 'dev') {
        const row = mapAnnouncementToRow(updatedAnno);
        if (isUUID(anno.id)) {
          const { data: updatedRow, error } = await universalClient
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
          // Promoted to Dev announcement
          const { data: inserted, error } = await universalClient
            .from('announcements')
            .insert([
              {
                title: row.title,
                content: row.content,
                priority: 'dev',
                category: row.category,
                is_pinned: row.is_pinned,
                expires_at: row.expires_at,
                author_name: row.author_name,
              }
            ])
            .select()
            .single();

          if (!error && inserted) {
            const saved = mapRowToAnnouncement(inserted, anno.isRead);
            const local = loadLocalAnnouncements();
            saveLocalAnnouncements([saved, ...local.filter(a => a.id !== anno.id)]);
            return saved;
          }
        }
      } else if (isUUID(anno.id)) {
        // Demoted from Dev announcement - delete from Universal DB
        await universalClient.from('announcements').delete().eq('id', anno.id);
      }
    } catch (err) {
      console.warn('Universal announcement update error:', err);
    }
  }

  // 2. Handle User Connected Database
  if (userClient && isUserSupabaseConfigured()) {
    try {
      const row = mapAnnouncementToRow(updatedAnno);
      if (isUUID(anno.id)) {
        const { data: updatedRow, error } = await userClient
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
        const { data: inserted, error } = await userClient
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
          const saved = mapRowToAnnouncement(inserted, anno.isRead);
          const local = loadLocalAnnouncements();
          saveLocalAnnouncements([saved, ...local.filter(a => a.id !== anno.id)]);
          return saved;
        }
      }
    } catch (err) {
      console.warn('User DB announcement update error:', err);
    }
  }

  // 3. Save to local storage
  const local = loadLocalAnnouncements();
  const updatedList = local.map(a => (a.id === anno.id ? updatedAnno : a));
  saveLocalAnnouncements(updatedList);
  return updatedAnno;
}

export async function deleteAnnouncement(id: string): Promise<boolean> {
  const universalClient = getUniversalSupabaseClient();
  const userClient = getUserSupabaseClient();

  if (universalClient && isUniversalSupabaseConfigured() && isUUID(id)) {
    try {
      await universalClient.from('announcements').delete().eq('id', id);
    } catch (err) {
      console.warn('Universal announcement delete error:', err);
    }
  }

  if (userClient && isUserSupabaseConfigured() && isUUID(id)) {
    try {
      await userClient.from('announcements').delete().eq('id', id);
    } catch (err) {
      console.warn('User DB announcement delete error:', err);
    }
  }

  const local = loadLocalAnnouncements();
  saveLocalAnnouncements(local.filter(a => a.id !== id));
  return true;
}

export async function markAnnouncementAsRead(announcementId: string): Promise<void> {
  const userId = getOrCreateUserId();
  const universalClient = getUniversalSupabaseClient();
  const userClient = getUserSupabaseClient();

  if (universalClient && isUniversalSupabaseConfigured() && isUUID(announcementId)) {
    try {
      await universalClient.from('announcement_reads').upsert({
        announcement_id: announcementId,
        user_id: userId,
        read_at: new Date().toISOString(),
      }, { onConflict: 'announcement_id, user_id' });
    } catch (err) {
      console.warn('Universal read mark error:', err);
    }
  }

  if (userClient && isUserSupabaseConfigured() && isUUID(announcementId)) {
    try {
      await userClient.from('announcement_reads').upsert({
        announcement_id: announcementId,
        user_id: userId,
        read_at: new Date().toISOString(),
      }, { onConflict: 'announcement_id, user_id' });
    } catch (err) {
      console.warn('User DB read mark error:', err);
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
 * Subscribe to realtime announcement updates on active Supabase clients
 */
export function subscribeToRealtimeAnnouncements(onUpdate: (payload: any) => void): () => void {
  const clients: SupabaseClient[] = [];
  const universal = getUniversalSupabaseClient();
  if (universal && isUniversalSupabaseConfigured()) {
    clients.push(universal);
  }
  const user = getUserSupabaseClient();
  if (user && isUserSupabaseConfigured()) {
    clients.push(user);
  }

  if (clients.length === 0) {
    return () => {};
  }

  const channels = clients.map((client, idx) => {
    return client
      .channel(`public:announcements_${idx}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'announcements' }, payload => {
        onUpdate(payload);
      })
      .subscribe();
  });

  return () => {
    channels.forEach((channel, idx) => {
      clients[idx].removeChannel(channel);
    });
  };
}



