-- =========================================================
-- SCHEDY - TEAM & PERSONAL CALENDAR DATABASE SCHEMA
-- 100% Free PostgreSQL Database Schema with Realtime Live Sync
-- =========================================================

-- 1. Create Schedules Table
CREATE TABLE IF NOT EXISTS public.schedules (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title TEXT NOT NULL,
    description TEXT DEFAULT '',
    start_time TIMESTAMPTZ NOT NULL,
    end_time TIMESTAMPTZ NOT NULL,
    is_all_day BOOLEAN DEFAULT false,
    category TEXT DEFAULT 'general',
    priority TEXT DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'urgent')),
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'completed', 'cancelled')),
    location TEXT DEFAULT '',
    meeting_url TEXT DEFAULT '',
    recurrence_rule TEXT DEFAULT 'none' CHECK (recurrence_rule IN ('none', 'daily', 'weekly', 'monthly', 'yearly')),
    created_by TEXT DEFAULT 'User',
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- 2. Enable Row Level Security (RLS)
ALTER TABLE public.schedules ENABLE ROW LEVEL SECURITY;

-- 3. Create Public Access Policies (Allow read/write with Anon Key)
CREATE POLICY "Allow public read schedules" ON public.schedules FOR SELECT USING (true);
CREATE POLICY "Allow public insert schedules" ON public.schedules FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow public update schedules" ON public.schedules FOR UPDATE USING (true);
CREATE POLICY "Allow public delete schedules" ON public.schedules FOR DELETE USING (true);

-- 4. Enable Realtime Publications for Live Sync Across Devices & Team
ALTER PUBLICATION supabase_realtime ADD TABLE public.schedules;



