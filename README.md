# Schedy 📅

> **A minimalist planner, task board, and notice workspace.**  
> Effortlessly manage your schedule, track tasks on a Kanban board, capture quick notes, and broadcast notices with offline-first storage, real-time team cloud sync, compressed share codes, and multi-format exports.

---

## 🌟 Overview

**Schedy** is a distraction-free, all-in-one personal and team productivity workspace. Whether you're planning your day, collaborating with a group, or broadcasting urgent announcements, Schedy combines intuitive scheduling with a dedicated task board and bulletin feed. It runs completely offline out of the box and seamlessly scales with real-time cloud synchronization when needed.

---

## ✨ Features

### 🗓️ Flexible Schedule & Timetable Views
- **Month, Week, and Day interactive views** with 12-hour AM/PM time representation and smart recurring event expansion (`daily`, `weekly`, `monthly`, `weekdays`).
- **Pill Event Badges**: Clean daily event counter badges on week and day headers.
- **Mobile Auto-Centering**: Smooth horizontal auto-centering to the present day in Week view on mobile screens.
- **Interactive List View**: Instant search, priority filtering (`urgent`, `high`, `medium`, `low`), and live status tracking (`pending`, `in_progress`, `completed`).
- **Comprehensive Event Details**: Color-coded categories, meeting links, physical locations, recurrence rules, and formatted descriptions.

### 📋 4-Column Kanban Task Board & Notes Scratchpad
- **Upcoming**: Automatically loaded from pending schedule events with quick one-click start actions.
- **In Progress**: Track active tasks with direct completion or rollback controls.
- **Done**: Review completed tasks with instant reopen capability.
- **Notes (Notepad & Scratchpad)**: Independent notes column for quick thoughts, links, and ideas with pin toggles and 6 pastel color palettes.

### 📢 Integrated Notice & Announcement Board
- **Edge-to-Edge Top Banner**: Full-width persistent banner for urgent broadcasts with one-click acknowledgement receipts.
- **Notice Feed**: Filter by priority (`Important`, `Dev Broadcast`), category tagging, search, and unread counters.
- **Universal Dev Broadcasts**: Password-authenticated global broadcast channel for system-wide announcements.

### 📊 Overview Dashboard
- High-level activity metrics, urgent notice highlights, upcoming agenda previews, and rapid action shortcuts.

### ☁️ Offline-First + Free Real-Time Cloud Sync (Supabase)
- **Zero-Friction Offline Mode**: Stores all events, notes, and notices in browser storage by default.
- **Live Team Collaboration**: Connect any free **Supabase** PostgreSQL database to synchronize calendar events, task statuses, notes, and announcements across all teammates in real time.

### 🔗 1-Click Share & Sync Codes
- Compress entire schedules into short, portable **Sync Codes** (`SCHEDY-...`) or shareable deep-link URL parameters (`?sync=...`).
- Teammates can enter the code or open the link to instantly import or merge schedules onto their device.

### 💾 Multi-Format Export & Backups
- Export your workspace in 4 universal formats:
  - 📄 **Plain Text (.txt)**: Clean, clutter-free agenda and notes summary.
  - 📅 **iCalendar (.ics)**: Native import for Apple Calendar, Google Calendar, and Outlook.
  - 📊 **Spreadsheet (.csv)**: Clean tabular data for Excel, Google Sheets, or Notion.
  - 🗄️ **Full JSON (.json)**: Complete backup and restore of schedules, recurrence rules, bulletins, and notes.

### 🎨 Adaptive Themes & Responsive UI
- **Light Theme**: Crisp Notion-inspired neutral gray canvas with subtle micro-borders.
- **Dark Theme**: Sleek obsidian dark mode designed for low-light focus.
- **Pink Theme**: Minimalist soft canvas with `#FF8DA1` pink accents.
- **Concentric Radius & Vertical Sidebar**: Responsive desktop vertical navigation and mobile drawer navigation.

---

## 🛠️ Tech Stack

- **Frontend**: [React 19](https://react.dev/) + [TypeScript](https://www.typescriptlang.org/)
- **Build Tool**: [Vite](https://vite.dev/)
- **Styling**: [Tailwind CSS](https://tailwindcss.com/)
- **Icons**: [Lucide React](https://lucide.dev/)
- **Date Utilities**: [date-fns](https://date-fns.org/)
- **Backend / Database**: [Supabase](https://supabase.com/) (PostgreSQL + Realtime WebSocket subscriptions)

---

## 🚀 Quick Start

### Prerequisites
- Node.js (v18 or higher)
- npm, yarn, or pnpm

### Installation

1. **Clone the repository**:
   ```bash
   git clone https://github.com/3stannn/Schedy.git
   cd Schedy
   ```

2. **Install dependencies**:
   ```bash
   npm install
   ```

3. **Start the local development server**:
   ```bash
   npm run dev
   ```
   Open your browser at `http://localhost:5173`.

4. **Build for production**:
   ```bash
   npm run build
   ```
   Compiled production assets will be output to the `dist/` directory.

---

## ☁️ Cloud Database Setup (Supabase)

Schedy works completely offline by default, but you can enable real-time multi-device and team sync with a free Supabase database:

1. Create a free project at [supabase.com](https://supabase.com).
2. Open the **SQL Editor** in your Supabase dashboard and run:

```sql
-- 1. Schedules Table
CREATE TABLE IF NOT EXISTS public.schedules (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title TEXT NOT NULL,
    description TEXT DEFAULT '',
    start_time TIMESTAMPTZ NOT NULL,
    end_time TIMESTAMPTZ NOT NULL,
    is_all_day BOOLEAN DEFAULT false,
    category TEXT DEFAULT 'general',
    priority TEXT DEFAULT 'medium',
    status TEXT DEFAULT 'pending',
    location TEXT DEFAULT '',
    meeting_url TEXT DEFAULT '',
    recurrence_rule TEXT DEFAULT 'none',
    created_by TEXT DEFAULT 'User',
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- 2. Announcements Table
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

-- 3. Announcement Read Receipts
CREATE TABLE IF NOT EXISTS public.announcement_reads (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    announcement_id UUID REFERENCES public.announcements(id) ON DELETE CASCADE,
    user_id TEXT NOT NULL,
    read_at TIMESTAMPTZ DEFAULT now(),
    UNIQUE(announcement_id, user_id)
);

-- 4. Notes & Scratchpad Table
CREATE TABLE IF NOT EXISTS public.notes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title TEXT NOT NULL,
    content TEXT NOT NULL DEFAULT '',
    color TEXT NOT NULL DEFAULT 'default',
    is_pinned BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- 5. Enable Row Level Security (RLS)
ALTER TABLE public.schedules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.announcements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.announcement_reads ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notes ENABLE ROW LEVEL SECURITY;

-- 6. Public Access Policies
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

CREATE POLICY "Allow public read notes" ON public.notes FOR SELECT USING (true);
CREATE POLICY "Allow public insert notes" ON public.notes FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow public update notes" ON public.notes FOR UPDATE USING (true);
CREATE POLICY "Allow public delete notes" ON public.notes FOR DELETE USING (true);

-- 7. Enable Realtime Replication
ALTER PUBLICATION supabase_realtime ADD TABLE public.schedules;
ALTER PUBLICATION supabase_realtime ADD TABLE public.announcements;
ALTER PUBLICATION supabase_realtime ADD TABLE public.announcement_reads;
ALTER PUBLICATION supabase_realtime ADD TABLE public.notes;
```

3. In your Supabase Dashboard, copy your **Project URL** and **Anon API Key** from **Project Settings $\rightarrow$ API**.
4. In Schedy, click the **Database** button in the footer, paste your credentials, and click **Save & Connect**.

---

## 🚢 Deployment

Deploy Schedy in seconds to any static hosting provider:

- **Vercel**: Import repository $\rightarrow$ Framework: `Vite` $\rightarrow$ Add environment variables (`VITE_UNIVERSAL_SUPABASE_URL`, `VITE_UNIVERSAL_SUPABASE_ANON_KEY`, `VITE_DEV_PASSWORD`) $\rightarrow$ Deploy.
- **Netlify**: Drag & drop `dist/` or connect repository with build command `npm run build`.
- **Cloudflare Pages**: Connect repository $\rightarrow$ Build command `npm run build` $\rightarrow$ Output `dist`.

---

## 📄 License

MIT License — Created with ❤️ by [3stannn](https://github.com/3stannn).
