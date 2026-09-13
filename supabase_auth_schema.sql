-- =============================================================================
-- SCHEDY - AUTH, PROFILES & POLAR.SH PAYWALL DATABASE SCHEMA
-- Run this in your DEDICATED Supabase project's SQL Editor (for User Auth & Pro)
-- =============================================================================

-- 1. Create Profiles Table
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email TEXT,
    full_name TEXT,
    avatar_url TEXT,
    is_pro BOOLEAN DEFAULT false,
    plan_tier TEXT DEFAULT 'free' CHECK (plan_tier IN ('free', 'pro', 'lifetime')),
    ai_credits_remaining INT DEFAULT 1, -- 1 free trial import before paywall
    polar_customer_id TEXT,
    polar_subscription_id TEXT,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- 2. Enable Row Level Security
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- 3. RLS Policies
-- Drop existing policies if re-running
DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can insert own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update own profile display info" ON public.profiles;

-- Users can view their own profile
CREATE POLICY "Users can view own profile" 
    ON public.profiles FOR SELECT 
    USING (auth.uid() = id);

-- Users can insert their own profile
CREATE POLICY "Users can insert own profile" 
    ON public.profiles FOR INSERT 
    WITH CHECK (auth.uid() = id);

-- Users can update non-billing fields of their own profile
CREATE POLICY "Users can update own profile display info" 
    ON public.profiles FOR UPDATE 
    USING (auth.uid() = id)
    WITH CHECK (auth.uid() = id);

-- 4. Trigger: Automatically create a profile when a user signs in with Google
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger 
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
    INSERT INTO public.profiles (
        id, 
        email, 
        full_name, 
        avatar_url, 
        is_pro, 
        plan_tier, 
        ai_credits_remaining
    )
    VALUES (
        new.id,
        new.email,
        COALESCE(new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'name', 'Schedy User'),
        COALESCE(new.raw_user_meta_data->>'avatar_url', new.raw_user_meta_data->>'picture', ''),
        false,
        'free',
        1
    )
    ON CONFLICT (id) DO UPDATE SET
        email = EXCLUDED.email,
        full_name = COALESCE(EXCLUDED.full_name, public.profiles.full_name),
        avatar_url = COALESCE(EXCLUDED.avatar_url, public.profiles.avatar_url),
        updated_at = now();

    RETURN new;
END;
$$ LANGUAGE plpgsql;

-- Drop trigger if it already exists to allow re-running
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();

-- 5. Helper Function: Safely Deduct 1 AI Credit
CREATE OR REPLACE FUNCTION public.use_ai_credit(user_uuid UUID)
RETURNS JSONB 
SECURITY DEFINER SET search_path = public
AS $$
DECLARE
    current_profile RECORD;
BEGIN
    SELECT * INTO current_profile FROM public.profiles WHERE id = user_uuid;
    
    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'error', 'Profile not found');
    END IF;

    -- Pro users have unlimited access
    IF current_profile.is_pro THEN
        RETURN jsonb_build_object('success', true, 'is_pro', true, 'credits_remaining', current_profile.ai_credits_remaining);
    END IF;

    -- Check remaining credits
    IF current_profile.ai_credits_remaining <= 0 THEN
        RETURN jsonb_build_object('success', false, 'error', 'No credits remaining. Upgrade required.');
    END IF;

    -- Deduct credit
    UPDATE public.profiles 
    SET ai_credits_remaining = ai_credits_remaining - 1,
        updated_at = now()
    WHERE id = user_uuid;

    RETURN jsonb_build_object('success', true, 'is_pro', false, 'credits_remaining', current_profile.ai_credits_remaining - 1);
END;
$$ LANGUAGE plpgsql;

-- 5b. Helper Function: Activate Pro Membership
CREATE OR REPLACE FUNCTION public.upgrade_to_pro(user_uuid UUID, customer_id TEXT DEFAULT NULL, subscription_id TEXT DEFAULT NULL)
RETURNS JSONB 
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
    UPDATE public.profiles 
    SET is_pro = true,
        plan_tier = 'pro',
        polar_customer_id = COALESCE(customer_id, polar_customer_id),
        polar_subscription_id = COALESCE(subscription_id, polar_subscription_id),
        updated_at = now()
    WHERE id = user_uuid;

    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'error', 'Profile not found');
    END IF;

    RETURN jsonb_build_object('success', true, 'is_pro', true, 'plan_tier', 'pro');
END;
$$ LANGUAGE plpgsql;

-- 5c. Helper Function: Downgrade from Pro (Subscription canceled / revoked)
CREATE OR REPLACE FUNCTION public.downgrade_from_pro(
    user_uuid UUID DEFAULT NULL, 
    user_email TEXT DEFAULT NULL, 
    sub_id TEXT DEFAULT NULL
)
RETURNS JSONB 
SECURITY DEFINER SET search_path = public
AS $$
DECLARE
    affected_rows INT;
BEGIN
    UPDATE public.profiles 
    SET is_pro = false,
        plan_tier = 'free',
        updated_at = now()
    WHERE (user_uuid IS NOT NULL AND id = user_uuid)
       OR (sub_id IS NOT NULL AND polar_subscription_id = sub_id)
       OR (user_email IS NOT NULL AND LOWER(email) = LOWER(user_email));

    GET DIAGNOSTICS affected_rows = ROW_COUNT;

    IF affected_rows = 0 THEN
        RETURN jsonb_build_object('success', false, 'error', 'No matching profile found to downgrade');
    END IF;

    RETURN jsonb_build_object('success', true, 'is_pro', false, 'plan_tier', 'free', 'affected_rows', affected_rows);
END;
$$ LANGUAGE plpgsql;

-- 5d. Helper Function: Upgrade to Pro by Email or UUID
CREATE OR REPLACE FUNCTION public.upgrade_to_pro_by_identifier(
    user_uuid UUID DEFAULT NULL,
    user_email TEXT DEFAULT NULL,
    customer_id TEXT DEFAULT NULL, 
    subscription_id TEXT DEFAULT NULL
)
RETURNS JSONB 
SECURITY DEFINER SET search_path = public
AS $$
DECLARE
    affected_rows INT;
BEGIN
    UPDATE public.profiles 
    SET is_pro = true,
        plan_tier = 'pro',
        polar_customer_id = COALESCE(customer_id, polar_customer_id),
        polar_subscription_id = COALESCE(subscription_id, polar_subscription_id),
        updated_at = now()
    WHERE (user_uuid IS NOT NULL AND id = user_uuid)
       OR (user_email IS NOT NULL AND LOWER(email) = LOWER(user_email));

    GET DIAGNOSTICS affected_rows = ROW_COUNT;

    IF affected_rows = 0 THEN
        RETURN jsonb_build_object('success', false, 'error', 'No matching profile found to upgrade');
    END IF;

    RETURN jsonb_build_object('success', true, 'is_pro', true, 'plan_tier', 'pro', 'affected_rows', affected_rows);
END;
$$ LANGUAGE plpgsql;

-- =============================================================================
-- 6. BACKFILL EXISTING USERS (Crucial for existing Google logins)
-- Run this to immediately insert any accounts already created in auth.users!
-- =============================================================================
INSERT INTO public.profiles (
    id, 
    email, 
    full_name, 
    avatar_url, 
    is_pro, 
    plan_tier, 
    ai_credits_remaining
)
SELECT 
    id, 
    email, 
    COALESCE(raw_user_meta_data->>'full_name', raw_user_meta_data->>'name', 'Schedy User'),
    COALESCE(raw_user_meta_data->>'avatar_url', raw_user_meta_data->>'picture', ''),
    false, 
    'free', 
    1
FROM auth.users
ON CONFLICT (id) DO UPDATE SET
    email = EXCLUDED.email,
    full_name = COALESCE(EXCLUDED.full_name, public.profiles.full_name),
    avatar_url = COALESCE(EXCLUDED.avatar_url, public.profiles.avatar_url);
