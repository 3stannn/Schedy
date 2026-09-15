import { createClient, SupabaseClient } from '@supabase/supabase-js';
import type { UserProfile } from '../types/auth';
import { normalizeSupabaseUrl } from './supabaseClient';

// Dedicated Supabase Auth credentials (schedy-pro-db)
const FALLBACK_AUTH_URL = 'https://bakikqtlyccvsknwazpm.supabase.co';
const FALLBACK_AUTH_KEY =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJha2lrcXRseWNjdnNrbndhenBtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODkyNjY1MDIsImV4cCI6MjEwNDg0MjUwMn0.PfLAXqRb_TzhU-E2GTWNJ4PuUbDnBSCt_lTs8BBtIjo';

const authEnvUrl = normalizeSupabaseUrl(
  (import.meta as any).env?.VITE_AUTH_SUPABASE_URL ||
  FALLBACK_AUTH_URL
);

const authEnvKey = (
  (import.meta as any).env?.VITE_AUTH_SUPABASE_ANON_KEY ||
  FALLBACK_AUTH_KEY
).trim();

const DEFAULT_POLAR_CHECKOUT_URL = 'https://buy.polar.sh/polar_cl_QWWNl0vD5Rv2CLjpGcAZBtIjcoJGxmhMUMhru4ElQ6Z';

const POLAR_CHECKOUT_BASE =
  (import.meta as any).env?.VITE_POLAR_CHECKOUT_URL ||
  DEFAULT_POLAR_CHECKOUT_URL;

const LOCAL_CREDITS_KEY_PREFIX = 'schedy_ai_credits_';

export function getLocalCredits(userId: string): number | null {
  try {
    const val = localStorage.getItem(`${LOCAL_CREDITS_KEY_PREFIX}${userId}`);
    if (val !== null) {
      const parsed = parseInt(val, 10);
      return isNaN(parsed) ? null : parsed;
    }
  } catch (e) {
    console.warn('Failed to read local AI credits:', e);
  }
  return null;
}

export function setLocalCredits(userId: string, credits: number): void {
  try {
    localStorage.setItem(`${LOCAL_CREDITS_KEY_PREFIX}${userId}`, credits.toString());
  } catch (e) {
    console.warn('Failed to save local AI credits:', e);
  }
}

let authClientInstance: SupabaseClient | null = null;

export function isAuthSupabaseConfigured(): boolean {
  return Boolean(authEnvUrl && authEnvKey);
}

export function getAuthSupabaseClient(): SupabaseClient | null {
  if (!isAuthSupabaseConfigured()) {
    return null;
  }

  if (!authClientInstance) {
    try {
      authClientInstance = createClient(authEnvUrl, authEnvKey, {
        auth: {
          persistSession: true,
          autoRefreshToken: true,
          detectSessionInUrl: true,
        },
      });
    } catch (err) {
      console.error('Failed to create Auth Supabase client:', err);
      return null;
    }
  }

  return authClientInstance;
}

/**
 * Trigger Google OAuth sign-in via Supabase
 */
export async function signInWithGoogle(): Promise<{ success: boolean; error?: string }> {
  const client = getAuthSupabaseClient();
  if (!client) {
    return {
      success: false,
      error: 'Authentication Supabase project is not configured. Please set VITE_AUTH_SUPABASE_URL in .env',
    };
  }

  try {
    const { error } = await client.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: window.location.origin + window.location.pathname,
        queryParams: {
          access_type: 'offline',
          prompt: 'consent',
        },
      },
    });

    if (error) throw error;
    return { success: true };
  } catch (err: any) {
    console.error('Google Sign-in error:', err);
    return { success: false, error: err.message || 'Failed to initialize Google Sign-in' };
  }
}

/**
 * Sign out user
 */
export async function signOutUser(): Promise<void> {
  const client = getAuthSupabaseClient();
  if (!client) return;

  try {
    await client.auth.signOut();
  } catch (err) {
    console.error('Sign out error:', err);
  }
}

/**
 * Fetch the authenticated user's profile and subscription tier
 */
export async function getCurrentUserProfile(): Promise<UserProfile | null> {
  const client = getAuthSupabaseClient();
  if (!client) return null;

  try {
    const { data: { session }, error: sessionError } = await client.auth.getSession();
    if (sessionError || !session?.user) {
      return null;
    }

    const user = session.user;

    // Fetch from profiles table
    const { data: profile } = await client
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .maybeSingle();

    let activeProfile = profile;

    // Self-healing: If user is authenticated in auth.users but has no row in public.profiles,
    // automatically insert/upsert the row into public.profiles
    if (!activeProfile && user) {
      const initialProfile = {
        id: user.id,
        email: user.email || '',
        full_name: user.user_metadata?.full_name || user.user_metadata?.name || 'User',
        avatar_url: user.user_metadata?.avatar_url || user.user_metadata?.picture || '',
        is_pro: false,
        plan_tier: 'free',
        ai_credits_remaining: 1,
      };

      try {
        const { data: inserted, error: insertError } = await client
          .from('profiles')
          .upsert(initialProfile, { onConflict: 'id' })
          .select()
          .maybeSingle();

        if (insertError) {
          console.warn('Auto-upsert profile row warning:', insertError.message);
        } else if (inserted) {
          activeProfile = inserted;
        }
      } catch (err) {
        console.warn('Auto-upsert profile row exception:', err);
      }
    }

    const localCredits = getLocalCredits(user.id);
    let resolvedCredits = typeof activeProfile?.ai_credits_remaining === 'number'
      ? activeProfile.ai_credits_remaining
      : (localCredits ?? 1);

    if (localCredits !== null) {
      resolvedCredits = Math.min(resolvedCredits, localCredits);
    }

    // Clean up any stale test flags from localStorage
    try {
      localStorage.removeItem('schedy_pending_pro_upgrade');
      localStorage.removeItem('schedy_is_pro_global');
      if (user?.id) {
        localStorage.removeItem(`schedy_is_pro_${user.id}`);
      }
    } catch {}

    // Strict single source of truth: Supabase profiles.is_pro column
    const resolvedIsPro = Boolean(activeProfile?.is_pro);

    if (!activeProfile) {
      // Return basic user info with default free tier if profile row is still syncing
      return {
        id: user.id,
        email: user.email || '',
        fullName: user.user_metadata?.full_name || user.user_metadata?.name || 'User',
        avatarUrl: user.user_metadata?.avatar_url || user.user_metadata?.picture || '',
        isPro: resolvedIsPro,
        planTier: resolvedIsPro ? 'pro' : 'free',
        aiCreditsRemaining: resolvedIsPro ? 999 : resolvedCredits,
      };
    }

    return {
      id: activeProfile.id,
      email: activeProfile.email || user.email || '',
      fullName: activeProfile.full_name || user.user_metadata?.full_name || 'User',
      avatarUrl: activeProfile.avatar_url || user.user_metadata?.avatar_url || '',
      isPro: resolvedIsPro,
      planTier: resolvedIsPro ? 'pro' : (activeProfile.plan_tier || 'free'),
      aiCreditsRemaining: resolvedIsPro ? 999 : resolvedCredits,
      polarCustomerId: activeProfile.polar_customer_id,
      polarSubscriptionId: activeProfile.polar_subscription_id,
      createdAt: activeProfile.created_at,
      updatedAt: activeProfile.updated_at,
    };

  } catch (err) {
    console.error('Failed to get current user profile:', err);
    return null;
  }
}

/**
 * Listen for Auth state changes (Login, Logout, Token Refresh)
 */
export function subscribeToAuthChanges(
  onStateChange: (profile: UserProfile | null) => void
): () => void {
  const client = getAuthSupabaseClient();
  if (!client) return () => {};

  const { data: { subscription } } = client.auth.onAuthStateChange(async (event, session) => {
    if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED' || event === 'USER_UPDATED') {
      if (session?.user) {
        const profile = await getCurrentUserProfile();
        onStateChange(profile);
      }
    } else if (event === 'SIGNED_OUT') {
      onStateChange(null);
    }
  });

  return () => {
    subscription.unsubscribe();
  };
}

/**
 * Request server-side sync of subscription state between Polar and Supabase
 */
export async function syncSubscriptionWithPolar(email?: string, userId?: string): Promise<{
  success: boolean;
  isPro: boolean;
  profile: UserProfile | null;
}> {
  try {
    const client = getAuthSupabaseClient();
    let effectiveEmail = email;
    let effectiveUserId = userId;

    if ((!effectiveEmail || !effectiveUserId) && client) {
      const { data: { session } } = await client.auth.getSession();
      if (session?.user) {
        effectiveEmail = effectiveEmail || session.user.email || undefined;
        effectiveUserId = effectiveUserId || session.user.id;
      }
    }

    if (effectiveEmail || effectiveUserId) {
      try {
        const sessionRes = await client?.auth.getSession();
        const token = sessionRes?.data?.session?.access_token;
        const headers: Record<string, string> = { 'Content-Type': 'application/json' };
        if (token) {
          headers['Authorization'] = `Bearer ${token}`;
        }

        const res = await fetch('/api/sync-subscription', {
          method: 'POST',
          headers,
          body: JSON.stringify({
            email: effectiveEmail,
            userId: effectiveUserId,
          }),
        });

        if (res.ok) {
          const syncData = await res.json();
          console.log('[Auth Service] Subscription sync result:', syncData);
        }
      } catch (netErr) {
        console.warn('[Auth Service] Server-side subscription sync error:', netErr);
      }
    }

    const updatedProfile = await getCurrentUserProfile();
    return {
      success: true,
      isPro: Boolean(updatedProfile?.isPro),
      profile: updatedProfile,
    };
  } catch (err) {
    console.error('[Auth Service] Failed to sync subscription:', err);
    const profile = await getCurrentUserProfile();
    return {
      success: false,
      isPro: Boolean(profile?.isPro),
      profile,
    };
  }
}

/**
 * Activate Pro tier in database for a user (called upon verified payment return)
 */
export async function activateProMembership(explicitUserId?: string): Promise<{
  success: boolean;
  profile: UserProfile | null;
}> {
  const client = getAuthSupabaseClient();
  let userId = explicitUserId;

  if (!userId && client) {
    try {
      const { data: { session } } = await client.auth.getSession();
      if (session?.user) {
        userId = session.user.id;
      }
    } catch (e) {
      console.warn('Could not get session user for pro activation:', e);
    }
  }

  if (!client || !userId) {
    const fallbackProfile = await getCurrentUserProfile();
    return { success: false, profile: fallbackProfile };
  }

  try {
    // 1. Try RPC function if configured in schema
    const { data: rpcData, error: rpcError } = await client.rpc('upgrade_to_pro', {
      user_uuid: userId,
    });

    if (rpcError || !rpcData?.success) {
      // 2. Fallback direct update on public.profiles
      await client
        .from('profiles')
        .update({
          is_pro: true,
          plan_tier: 'pro',
          updated_at: new Date().toISOString(),
        })
        .eq('id', userId);
    }

    // Trigger server-side background sync as well
    syncSubscriptionWithPolar(undefined, userId).catch(console.warn);

    const refreshed = await getCurrentUserProfile();
    return { success: true, profile: refreshed };
  } catch (err) {
    console.error('Failed to activate Pro membership in Supabase:', err);
    const refreshed = await getCurrentUserProfile();
    return { success: false, profile: refreshed };
  }
}

/**
 * Reset Pro status back to Free tier (useful for testing checkout flows)
 */
export async function resetProStatus(explicitUserId?: string): Promise<UserProfile | null> {
  const client = getAuthSupabaseClient();
  let userId = explicitUserId;

  if (!userId && client) {
    try {
      const { data: { session } } = await client.auth.getSession();
      if (session?.user) {
        userId = session.user.id;
      }
    } catch (e) {
      console.warn('Could not get session user for pro reset:', e);
    }
  }

  try {
    localStorage.removeItem('schedy_pending_pro_upgrade');
    localStorage.removeItem('schedy_is_pro_global');
    if (userId) {
      localStorage.removeItem(`schedy_is_pro_${userId}`);
      localStorage.setItem(`schedy_ai_credits_${userId}`, '0');
    }
  } catch {}

  if (client && userId) {
    try {
      await client
        .from('profiles')
        .update({
          is_pro: false,
          plan_tier: 'free',
          ai_credits_remaining: 0,
          updated_at: new Date().toISOString(),
        })
        .eq('id', userId);
    } catch (e) {
      console.error('Failed to reset pro status in Supabase:', e);
    }
  }

  return getCurrentUserProfile();
}

/**
 * Deduct 1 AI credit for a non-pro user
 */
export async function deductAiCredit(userId: string): Promise<{
  success: boolean;
  isPro: boolean;
  creditsRemaining: number;
  error?: string;
}> {
  // Always immediately record deduction in persistent localStorage
  const currentLocal = getLocalCredits(userId) ?? 1;
  const newRemaining = Math.max(0, currentLocal - 1);
  setLocalCredits(userId, newRemaining);

  const client = getAuthSupabaseClient();
  if (!client) {
    return { success: true, isPro: false, creditsRemaining: newRemaining };
  }

  try {
    // Attempt to call RPC function use_ai_credit
    const { data, error } = await client.rpc('use_ai_credit', { user_uuid: userId });

    if (error) {
      // Fallback: direct query to check if user is already Pro in Supabase
      const { data: profile } = await client
        .from('profiles')
        .select('is_pro, ai_credits_remaining')
        .eq('id', userId)
        .maybeSingle();

      if (profile?.is_pro) {
        return { success: true, isPro: true, creditsRemaining: 999 };
      }

      const dbRemaining = Math.max(0, (profile?.ai_credits_remaining ?? 1) - 1);
      const finalRemaining = Math.min(newRemaining, dbRemaining);
      setLocalCredits(userId, finalRemaining);

      try {
        await client
          .from('profiles')
          .upsert({
            id: userId,
            ai_credits_remaining: finalRemaining,
            updated_at: new Date().toISOString(),
          }, { onConflict: 'id' });
      } catch (e) {
        console.warn('Direct profile credit update error:', e);
      }

      return { success: true, isPro: false, creditsRemaining: finalRemaining };
    }

    const rpcRemaining = data?.credits_remaining ?? newRemaining;
    setLocalCredits(userId, rpcRemaining);

    return {
      success: data?.success ?? true,
      isPro: data?.is_pro ?? false,
      creditsRemaining: rpcRemaining,
      error: data?.error,
    };
  } catch (err: any) {
    console.error('Error deducting AI credit:', err);
    return { success: true, isPro: false, creditsRemaining: newRemaining };
  }
}

/**
 * Generate Polar.sh Checkout URL with customer pre-fill
 */
export function getPolarCheckoutUrl(profile?: UserProfile | null): string {
  const base = POLAR_CHECKOUT_BASE || DEFAULT_POLAR_CHECKOUT_URL;

  try {
    const url = new URL(base);
    if (profile?.email) {
      url.searchParams.set('customer_email', profile.email);
    }
    if (profile?.id) {
      url.searchParams.set('metadata[user_id]', profile.id);
    }
    return url.toString();
  } catch {
    return base;
  }
}
