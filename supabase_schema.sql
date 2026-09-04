-- =========================================================
-- SCHEDY - TEAM CLOUD DATABASE SCHEMA (SCHEDULES & ANNOUNCEMENTS)
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
    item_type TEXT DEFAULT 'event' CHECK (item_type IN ('event', 'task')),
    location TEXT DEFAULT '',
    meeting_url TEXT DEFAULT '',
    recurrence_rule TEXT DEFAULT 'none' CHECK (recurrence_rule IN ('none', 'daily', 'weekly', 'monthly', 'yearly')),
    created_by TEXT DEFAULT 'User',
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- Ensure item_type column exists on existing installations
ALTER TABLE public.schedules ADD COLUMN IF NOT EXISTS item_type TEXT DEFAULT 'event';

-- 2. Create Announcements Table
CREATE TABLE IF NOT EXISTS public.announcements (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title TEXT NOT NULL,
    content TEXT NOT NULL,
    priority TEXT DEFAULT 'general',
    category TEXT DEFAULT 'general',
    is_pinned BOOLEAN DEFAULT false,
    expires_at TIMESTAMPTZ,
    author_name TEXT DEFAULT 'Admin',
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- 3. Create Announcement Reads Table
CREATE TABLE IF NOT EXISTS public.announcement_reads (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    announcement_id UUID REFERENCES public.announcements(id) ON DELETE CASCADE,
    user_id TEXT NOT NULL,
    read_at TIMESTAMPTZ DEFAULT now(),
    UNIQUE(announcement_id, user_id)
);

-- 4. Enable Row Level Security (RLS)
ALTER TABLE public.schedules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.announcements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.announcement_reads ENABLE ROW LEVEL SECURITY;

-- 5. Create Public Access Policies
CREATE POLICY "Allow public read schedules" ON public.schedules FOR SELECT USING (true);
CREATE POLICY "Allow public insert schedules" ON public.schedules FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow public update schedules" ON public.schedules FOR UPDATE USING (true);
CREATE POLICY "Allow public delete schedules" ON public.schedules FOR DELETE USING (true);

CREATE POLICY "Allow public read announcements" ON public.announcements FOR SELECT USING (true);
CREATE POLICY "Allow public insert announcements" ON public.announcements FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow public update announcements" ON public.announcements FOR UPDATE USING (true);
CREATE POLICY "Allow public delete announcements" ON public.announcements FOR DELETE USING (true);

CREATE POLICY "Allow public read reads" ON public.announcement_reads FOR SELECT USING (true);
CREATE POLICY "Allow public insert reads" ON public.announcement_reads FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow public update reads" ON public.announcement_reads FOR UPDATE USING (true);
CREATE POLICY "Allow public delete reads" ON public.announcement_reads FOR DELETE USING (true);

-- 6. Enable Realtime Publications for Live Sync
ALTER PUBLICATION supabase_realtime ADD TABLE public.schedules;
ALTER PUBLICATION supabase_realtime ADD TABLE public.announcements;
ALTER PUBLICATION supabase_realtime ADD TABLE public.announcement_reads;




