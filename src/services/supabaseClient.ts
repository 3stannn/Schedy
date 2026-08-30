import { createClient, SupabaseClient } from '@supabase/supabase-js';

const STORAGE_KEY = 'schedule_manager_supabase_config';

export interface SupabaseConfig {
  url: string;
  anonKey: string;
}

export function normalizeSupabaseUrl(rawUrl: string): string {
  if (!rawUrl) return '';
  let url = rawUrl.trim();
  // Strip REST endpoint path if user copied REST URL from Supabase dashboard
  url = url.replace(/\/rest\/v1\/?$/, '');
  // Strip trailing slashes
  url = url.replace(/\/+$/, '');
  return url;
}

let supabaseInstance: SupabaseClient | null = null;
let currentConfig: SupabaseConfig = loadConfig();

function loadConfig(): SupabaseConfig {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      const parsed = JSON.parse(saved);
      if (parsed.url && parsed.anonKey) {
        return {
          url: normalizeSupabaseUrl(parsed.url),
          anonKey: parsed.anonKey.trim(),
        };
      }
    }
  } catch (e) {
    console.error('Failed to parse supabase config from localStorage', e);
  }

  // Fallback to Vite environment variables if defined
  const envUrl = (import.meta as any).env?.VITE_SUPABASE_URL || '';
  const envKey = (import.meta as any).env?.VITE_SUPABASE_ANON_KEY || '';

  return {
    url: normalizeSupabaseUrl(envUrl),
    anonKey: typeof envKey === 'string' ? envKey.trim() : '',
  };
}

export function getSupabaseConfig(): SupabaseConfig {
  return currentConfig;
}

export function isSupabaseConfigured(): boolean {
  return Boolean(currentConfig.url && currentConfig.anonKey);
}

export function getSupabaseClient(): SupabaseClient | null {
  if (!isSupabaseConfigured()) {
    return null;
  }

  if (!supabaseInstance) {
    try {
      supabaseInstance = createClient(currentConfig.url, currentConfig.anonKey, {
        realtime: {
          params: {
            eventsPerSecond: 10,
          },
        },
      });
    } catch (err) {
      console.error('Error creating Supabase client:', err);
      return null;
    }
  }

  return supabaseInstance;
}

export function saveSupabaseConfig(config: SupabaseConfig): void {
  const sanitized: SupabaseConfig = {
    url: normalizeSupabaseUrl(config.url),
    anonKey: config.anonKey.trim(),
  };
  currentConfig = sanitized;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(sanitized));
  supabaseInstance = null; // Reset instance to recreate with new credentials
}

export function clearSupabaseConfig(): void {
  currentConfig = { url: '', anonKey: '' };
  localStorage.removeItem(STORAGE_KEY);
  supabaseInstance = null;
}

export async function testSupabaseConnection(config?: SupabaseConfig): Promise<{ success: boolean; message: string; tablesFound?: string[] }> {
  const testCfg = config 
    ? { url: normalizeSupabaseUrl(config.url), anonKey: config.anonKey.trim() }
    : currentConfig;
  if (!testCfg.url || !testCfg.anonKey) {
    return { success: false, message: 'Please provide both Supabase Project URL and Anon Public Key.' };
  }

  try {
    const client = createClient(testCfg.url, testCfg.anonKey);
    // Test querying announcements table
    const { error: announcementError } = await client
      .from('announcements')
      .select('id')
      .limit(1);

    if (announcementError) {
      if (announcementError.code === 'PGRST116' || announcementError.message.includes('relation "public.announcements" does not exist')) {
        return {
          success: false,
          message: 'Connected to Supabase project, but "announcements" table was not found! Please run the SQL schema script in Supabase SQL Editor.',
        };
      }
      return { success: false, message: `Database error: ${announcementError.message}` };
    }

    // Test querying announcement_reads table
    const { error: readsError } = await client
      .from('announcement_reads')
      .select('announcement_id')
      .limit(1);

    if (readsError) {
      return {
        success: false,
        message: 'Connected to announcements, but "announcement_reads" table was not found. Please run the full SQL schema script.',
      };
    }

    return {
      success: true,
      message: 'Successfully connected to Universal Announcements database with Realtime enabled!',
      tablesFound: ['announcements', 'announcement_reads'],
    };
  } catch (err: any) {
    return {
      success: false,
      message: `Failed to connect: ${err.message || 'Unknown network error'}. Check your URL and Key.`,
    };
  }
}
