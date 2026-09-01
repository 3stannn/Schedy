import type { Note, NoteColor } from '../types/note';
import type { DatabaseNoteRow } from '../types/database';
import { getUserSupabaseClient, isUserSupabaseConfigured } from './supabaseClient';
import { loadLocalNotes, saveLocalNotes } from './storageService';

const isUUID = (str?: string): boolean =>
  typeof str === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(str);

function mapRowToNote(row: DatabaseNoteRow): Note {
  return {
    id: row.id,
    title: row.title,
    content: row.content || '',
    color: (row.color || 'default') as NoteColor,
    isPinned: !!row.is_pinned,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function mapNoteToRow(note: Note): Partial<DatabaseNoteRow> {
  return {
    id: note.id,
    title: note.title,
    content: note.content,
    color: note.color,
    is_pinned: note.isPinned,
    updated_at: new Date().toISOString(),
  };
}

export async function fetchAllNotes(): Promise<Note[]> {
  const supabase = getUserSupabaseClient();
  if (supabase && isUserSupabaseConfigured()) {
    try {
      const { data, error } = await supabase
        .from('notes')
        .select('*')
        .order('is_pinned', { ascending: false })
        .order('updated_at', { ascending: false });

      if (!error && data) {
        const notes = data.map(mapRowToNote);
        saveLocalNotes(notes);
        return notes;
      }
      console.warn('Supabase notes fetch failed, falling back to local:', error?.message);
    } catch (err) {
      console.warn('Supabase notes error:', err);
    }
  }

  return loadLocalNotes();
}

export async function createNote(noteData: Omit<Note, 'id' | 'createdAt' | 'updatedAt'>): Promise<Note> {
  const now = new Date().toISOString();
  const newNote: Note = {
    ...noteData,
    id: 'note_' + Math.random().toString(36).substring(2, 9) + '_' + Date.now(),
    createdAt: now,
    updatedAt: now,
  };

  const supabase = getUserSupabaseClient();
  if (supabase && isUserSupabaseConfigured()) {
    try {
      const { id: _, ...rowWithoutId } = mapNoteToRow(newNote);
      const { data, error } = await supabase
        .from('notes')
        .insert([{ ...rowWithoutId, created_at: now }])
        .select()
        .single();

      if (!error && data) {
        const savedNote = mapRowToNote(data);
        const current = loadLocalNotes();
        saveLocalNotes([savedNote, ...current.filter(n => n.id !== savedNote.id)]);
        return savedNote;
      }
      console.warn('Failed to insert note to Supabase, saving locally:', error?.message);
    } catch (err) {
      console.warn('Supabase insert note error:', err);
    }
  }

  const current = loadLocalNotes();
  const updated = [newNote, ...current];
  saveLocalNotes(updated);
  return newNote;
}

export async function updateNote(noteData: Note): Promise<Note> {
  const now = new Date().toISOString();
  const updatedNote: Note = {
    ...noteData,
    updatedAt: now,
  };

  const supabase = getUserSupabaseClient();
  if (supabase && isUserSupabaseConfigured() && isUUID(updatedNote.id)) {
    try {
      const row = mapNoteToRow(updatedNote);
      const { data, error } = await supabase
        .from('notes')
        .update(row)
        .eq('id', updatedNote.id)
        .select()
        .single();

      if (!error && data) {
        const savedNote = mapRowToNote(data);
        const current = loadLocalNotes();
        saveLocalNotes(current.map(n => (n.id === savedNote.id ? savedNote : n)));
        return savedNote;
      }
      console.warn('Failed to update note in Supabase, updating locally:', error?.message);
    } catch (err) {
      console.warn('Supabase update note error:', err);
    }
  }

  const current = loadLocalNotes();
  const updated = current.map(n => (n.id === updatedNote.id ? updatedNote : n));
  saveLocalNotes(updated);
  return updatedNote;
}

export async function deleteNote(id: string): Promise<void> {
  const supabase = getUserSupabaseClient();
  if (supabase && isUserSupabaseConfigured() && isUUID(id)) {
    try {
      const { error } = await supabase.from('notes').delete().eq('id', id);
      if (error) {
        console.warn('Failed to delete note from Supabase:', error.message);
      }
    } catch (err) {
      console.warn('Supabase delete note error:', err);
    }
  }

  const current = loadLocalNotes();
  saveLocalNotes(current.filter(n => n.id !== id));
}

export async function bulkSaveNotes(notes: Note[], mode: 'replace' | 'merge'): Promise<Note[]> {
  const supabase = getUserSupabaseClient();
  if (supabase && isUserSupabaseConfigured()) {
    try {
      if (mode === 'replace') {
        await supabase.from('notes').delete().neq('id', '00000000-0000-0000-0000-000000000000');
      }

      const rows = notes.map(n => {
        const row = mapNoteToRow(n);
        if (!isUUID(n.id)) {
          delete row.id;
        }
        return { ...row, created_at: n.createdAt };
      });

      if (rows.length > 0) {
        await supabase.from('notes').upsert(rows);
      }
      return fetchAllNotes();
    } catch (err) {
      console.warn('Supabase bulk save notes error:', err);
    }
  }

  let finalNotes: Note[];
  if (mode === 'replace') {
    finalNotes = notes;
  } else {
    const current = loadLocalNotes();
    const existingIds = new Set(current.map(n => n.id));
    const newItems = notes.filter(n => !existingIds.has(n.id));
    finalNotes = [...current, ...newItems];
  }

  saveLocalNotes(finalNotes);
  return finalNotes;
}

export function subscribeToRealtimeNotes(onSync: (payload: any) => void): () => void {
  const supabase = getUserSupabaseClient();
  if (!supabase || !isUserSupabaseConfigured()) {
    return () => {};
  }

  const channel = supabase
    .channel('public:notes')
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'notes' },
      (payload) => {
        onSync(payload);
      }
    )
    .subscribe();

  return () => {
    supabase.removeChannel(channel);
  };
}

