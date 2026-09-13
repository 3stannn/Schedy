import { createClient, SupabaseClient } from '@supabase/supabase-js';
import type { UserProfile } from '../types/auth';
import { normalizeSupabaseUrl } from './supabaseClient';

// Dedicated Supabase Auth credentials
const authEnvUrl = normalizeSupabaseUrl(
  (import.meta as any).env?.VITE_AUTH_SUPABASE_URL ||
  (import.meta as any).env?.VITE_UNIVERSAL_SUPABASE_URL ||
  (import.meta as any).env?.VITE_SUPABASE_URL ||
  ''
);

const authEnvKey = (
  (import.meta as any).env?.VITE_AUTH_SUPABASE_ANON_KEY ||
  (import.meta as any).env?.VITE_UNIVERSAL_SUPABASE_ANON_KEY ||
  (import.meta as any).env?.VITE_SUPABASE_ANON_KEY ||
  ''
).trim();

const POLAR_CHECKOUT_BASE = (import.meta as any).env?.VITE_POLAR_CHECKOUT_URL || '';

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

    if (!activeProfile) {
      // Return basic user info with default free tier if profile row is still syncing
      return {
        id: user.id,
        email: user.email || '',
        fullName: user.user_metadata?.full_name || user.user_metadata?.name || 'User',
        avatarUrl: user.user_metadata?.avatar_url || user.user_metadata?.picture || '',
        isPro: false,
        planTier: 'free',
        aiCreditsRemaining: resolvedCredits,
      };
    }

    return {
      id: activeProfile.id,
      email: activeProfile.email || user.email || '',
      fullName: activeProfile.full_name || user.user_metadata?.full_name || 'User',
      avatarUrl: activeProfile.avatar_url || user.user_metadata?.avatar_url || '',
      isPro: Boolean(activeProfile.is_pro),
      planTier: activeProfile.plan_tier || 'free',
      aiCreditsRemaining: resolvedCredits,
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
      // Fallback: direct update if RPC doesn't exist
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
  if (!POLAR_CHECKOUT_BASE) {
    // Default fallback placeholder link for Polar
    return 'https://polar.sh';
  }

  try {
    const url = new URL(POLAR_CHECKOUT_BASE);
    if (profile?.email) {
      url.searchParams.set('customer_email', profile.email);
    }
    if (profile?.id) {
      url.searchParams.set('metadata[user_id]', profile.id);
    }
    return url.toString();
  } catch {
    return POLAR_CHECKOUT_BASE;
  }
}
