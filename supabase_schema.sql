-- =========================================================
-- SCHEDY - UNIVERSAL ANNOUNCEMENT DATABASE SCHEMA
-- 100% Free PostgreSQL Database Schema with Realtime Broadcast
-- =========================================================

-- 1. Create Announcements Table
CREATE TABLE IF NOT EXISTS public.announcements (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title TEXT NOT NULL,
    content TEXT NOT NULL,
    priority TEXT DEFAULT 'general' CHECK (priority IN ('urgent', 'important', 'notice', 'general')),
    category TEXT DEFAULT 'general',
    is_pinned BOOLEAN DEFAULT false,
    expires_at TIMESTAMPTZ,
    author_name TEXT DEFAULT 'Admin',
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- 2. Create Announcement Reads / Acknowledgement Table
CREATE TABLE IF NOT EXISTS public.announcement_reads (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    announcement_id UUID REFERENCES public.announcements(id) ON DELETE CASCADE,
    user_id TEXT NOT NULL,
    read_at TIMESTAMPTZ DEFAULT now(),
    UNIQUE(announcement_id, user_id)
);

-- 3. Enable Row Level Security (RLS)
ALTER TABLE public.announcements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.announcement_reads ENABLE ROW LEVEL SECURITY;

-- 4. Create Public Access Policies
CREATE POLICY "Allow public read announcements" ON public.announcements FOR SELECT USING (true);
CREATE POLICY "Allow public insert announcements" ON public.announcements FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow public update announcements" ON public.announcements FOR UPDATE USING (true);
CREATE POLICY "Allow public delete announcements" ON public.announcements FOR DELETE USING (true);

CREATE POLICY "Allow public read announcement_reads" ON public.announcement_reads FOR SELECT USING (true);
CREATE POLICY "Allow public insert announcement_reads" ON public.announcement_reads FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow public update announcement_reads" ON public.announcement_reads FOR UPDATE USING (true);
CREATE POLICY "Allow public delete announcement_reads" ON public.announcement_reads FOR DELETE USING (true);

-- 5. Enable Realtime Publications for Live Broadcasts
ALTER PUBLICATION supabase_realtime ADD TABLE public.announcements;
ALTER PUBLICATION supabase_realtime ADD TABLE public.announcement_reads;


