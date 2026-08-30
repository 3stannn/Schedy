-- =========================================================
-- SCHEDULE & ANNOUNCEMENT MANAGER - SUPABASE DATABASE SCHEMA
-- 100% Free PostgreSQL Database Schema with Realtime Support
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
    created_by TEXT DEFAULT 'Admin',
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- 2. Create Announcements Table
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

-- 3. Create Announcement Reads / Acknowledgement Table
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

-- 5. Create Public Access Policies (Allows reads and writes for authorized anon keys)
CREATE POLICY Allow public read schedules ON public.schedules FOR SELECT USING (true);
CREATE POLICY Allow public insert schedules ON public.schedules FOR INSERT WITH CHECK (true);
CREATE POLICY Allow public update schedules ON public.schedules FOR UPDATE USING (true);
CREATE POLICY Allow public delete schedules ON public.schedules FOR DELETE USING (true);

CREATE POLICY Allow public read announcements ON public.announcements FOR SELECT USING (true);
CREATE POLICY Allow public insert announcements ON public.announcements FOR INSERT WITH CHECK (true);
CREATE POLICY Allow public update announcements ON public.announcements FOR UPDATE USING (true);
CREATE POLICY Allow public delete announcements ON public.announcements FOR DELETE USING (true);

CREATE POLICY Allow public read announcement_reads ON public.announcement_reads FOR SELECT USING (true);
CREATE POLICY Allow public insert announcement_reads ON public.announcement_reads FOR INSERT WITH CHECK (true);
CREATE POLICY Allow public delete announcement_reads ON public.announcement_reads FOR DELETE USING (true);

-- 6. Enable Realtime Publications for Live Sync
ALTER PUBLICATION supabase_realtime ADD TABLE public.schedules;
ALTER PUBLICATION supabase_realtime ADD TABLE public.announcements;
ALTER PUBLICATION supabase_realtime ADD TABLE public.announcement_reads;

-- 7. Insert Initial Sample Data (Optional Seed)
INSERT INTO public.announcements (title, content, priority, category, is_pinned, author_name)
VALUES 
('System Maintenance & Schedule Update', 'Welcome to the Schedule Manager! Real-time synchronization is now active.', 'important', 'system', true, 'System Admin'),
('Urgent: Project Milestone Review', 'Please ensure all your weekly tasks and milestones are logged before Friday 5:00 PM.', 'urgent', 'operations', true, 'Management');

INSERT INTO public.schedules (title, description, start_time, end_time, is_all_day, category, priority, status, location)
VALUES 
('Weekly Team Sync & Sprint Planning', 'Review backlog, assign weekly deliverables, and address blockers.', now() + interval '1 day', now() + interval '1 day 1 hour', false, 'work', 'high', 'pending', 'Conference Room A / Google Meet'),
('Monthly Department Overview', 'Monthly all-hands briefing and performance report.', now() + interval '3 days', now() + interval '3 days 2 hours', false, 'general', 'medium', 'pending', 'Main Hall');
