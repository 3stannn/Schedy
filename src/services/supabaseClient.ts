import { createClient, SupabaseClient } from '@supabase/supabase-js';

export interface SupabaseConfig {
  url: string;
  anonKey: string;
}

export function normalizeSupabaseUrl(rawUrl: string): string {
  if (!rawUrl) return '';
  let url = rawUrl.trim();
  url = url.replace(/\/rest\/v1\/?$/, '');
  url = url.replace(/\/+$/, '');
  return url;
}

/* =========================================================================
   1. UNIVERSAL ANNOUNCEMENTS CLIENT (App Owner / Developer System Broadcasts)
   Hidden & internal. Configured via environment variables (.env).
   ========================================================================= */

const FALLBACK_UNIVERSAL_URL = 'https://llmovvlrbdemeqesjpws.supabase.co';
const FALLBACK_UNIVERSAL_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxsbW92dmxyYmRlbWVxZXNqcHdzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODgxMDEwMDYsImV4cCI6MjEwMzY3NzAwNn0.m6_sKwdbplEUiPiBzjmY6FfCNoL41x2c2ZkFV6CpDAQ';

const universalEnvUrl = normalizeSupabaseUrl((import.meta as any).env?.VITE_SUPABASE_URL || FALLBACK_UNIVERSAL_URL);
const universalEnvKey = typeof (import.meta as any).env?.VITE_SUPABASE_ANON_KEY === 'string' && (import.meta as any).env.VITE_SUPABASE_ANON_KEY.trim()
  ? (import.meta as any).env.VITE_SUPABASE_ANON_KEY.trim()
  : FALLBACK_UNIVERSAL_KEY;

let universalClientInstance: SupabaseClient | null = null;

export function isUniversalSupabaseConfigured(): boolean {
  return Boolean(universalEnvUrl && universalEnvKey);
}

export function getUniversalSupabaseClient(): SupabaseClient | null {
  if (!isUniversalSupabaseConfigured()) {
    return null;
  }

  if (!universalClientInstance) {
    try {
      universalClientInstance = createClient(universalEnvUrl, universalEnvKey, {
        realtime: {
          params: {
            eventsPerSecond: 10,
          },
        },
      });
    } catch (err) {
      console.error('Error creating Universal Supabase client:', err);
      return null;
    }
  }

  return universalClientInstance;
}

/* =========================================================================
   2. USER CALENDAR SYNC CLIENT (User / Team Connected Database)
   Configured in DatabaseConfigModal by users who want synced calendars with others.
   ========================================================================= */

const USER_DB_STORAGE_KEY = 'schedy_user_database_config';

let userClientInstance: SupabaseClient | null = null;
let currentUserConfig: SupabaseConfig = loadUserConfig();

function loadUserConfig(): SupabaseConfig {
  try {
    const saved = localStorage.getItem(USER_DB_STORAGE_KEY) || localStorage.getItem('schedule_manager_supabase_config');
    if (saved) {
      const parsed = JSON.parse(saved);
      // Only return if user explicitly saved their own URL & key
      if (parsed.url && parsed.anonKey) {
        return {
          url: normalizeSupabaseUrl(parsed.url),
          anonKey: parsed.anonKey.trim(),
        };
      }
    }
  } catch (e) {
    console.error('Failed to parse user supabase config from localStorage', e);
  }

  return { url: '', anonKey: '' };
}

export function getUserSupabaseConfig(): SupabaseConfig {
  return currentUserConfig;
}

export function isUserSupabaseConfigured(): boolean {
  return Boolean(currentUserConfig.url && currentUserConfig.anonKey);
}

export function getUserSupabaseClient(): SupabaseClient | null {
  if (!isUserSupabaseConfigured()) {
    return null;
  }

  if (!userClientInstance) {
    try {
      userClientInstance = createClient(currentUserConfig.url, currentUserConfig.anonKey, {
        realtime: {
          params: {
            eventsPerSecond: 10,
          },
        },
      });
    } catch (err) {
      console.error('Error creating User Calendar Supabase client:', err);
      return null;
    }
  }

  return userClientInstance;
}

export function saveUserSupabaseConfig(config: SupabaseConfig): void {
  const sanitized: SupabaseConfig = {
    url: normalizeSupabaseUrl(config.url),
    anonKey: config.anonKey.trim(),
  };
  currentUserConfig = sanitized;
  localStorage.setItem(USER_DB_STORAGE_KEY, JSON.stringify(sanitized));
  userClientInstance = null;
}

export function clearUserSupabaseConfig(): void {
  currentUserConfig = { url: '', anonKey: '' };
  localStorage.removeItem(USER_DB_STORAGE_KEY);
  localStorage.removeItem('schedule_manager_supabase_config');
  userClientInstance = null;
}

export async function testUserSupabaseConnection(config?: SupabaseConfig): Promise<{ success: boolean; message: string; tablesFound?: string[] }> {
  const testCfg = config 
    ? { url: normalizeSupabaseUrl(config.url), anonKey: config.anonKey.trim() }
    : currentUserConfig;

  if (!testCfg.url || !testCfg.anonKey) {
    return { success: false, message: 'Please provide both your Supabase Project URL and Anon Public Key.' };
  }

  try {
    const client = createClient(testCfg.url, testCfg.anonKey);
    // Test querying schedules table
    const { error: scheduleError } = await client
      .from('schedules')
      .select('id')
      .limit(1);

    if (scheduleError) {
      if (scheduleError.code === 'PGRST116' || scheduleError.message.includes('relation "public.schedules" does not exist')) {
        return {
          success: false,
          message: 'Connected to Supabase project, but "schedules" table was not found! Please run the SQL schema script in Supabase SQL Editor.',
        };
      }
      return { success: false, message: `Database error: ${scheduleError.message}` };
    }

    return {
      success: true,
      message: 'Successfully connected to your Team Calendar database with Realtime Sync enabled!',
      tablesFound: ['schedules'],
    };
  } catch (err: any) {
    return {
      success: false,
      message: `Failed to connect: ${err.message || 'Unknown network error'}. Check your URL and Key.`,
    };
  }
}

// Backward compatibility aliases
export const getSupabaseConfig = getUserSupabaseConfig;
export const isSupabaseConfigured = isUserSupabaseConfigured;
export const getSupabaseClient = getUserSupabaseClient;
export const saveSupabaseConfig = saveUserSupabaseConfig;
export const clearSupabaseConfig = clearUserSupabaseConfig;
export const testSupabaseConnection = testUserSupabaseConnection;

