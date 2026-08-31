# Schedy 📅

> **Schedules simplified. Bulletins amplified.**  
> A lightweight, Notion-inspired schedule planner and real-time announcement board with offline-first storage, team cloud sync, compressed calendar share codes, and multi-format exports.

---

## 🌟 Overview

**Schedy** brings clarity to your timeline and team communications. Built for students, creators, and teams, Schedy combines a distraction-free calendar with an integrated announcement board. It runs completely offline out of the box and seamlessly scales with real-time cloud synchronization when needed.

---

## ✨ Features

### 🗓️ Flexible Calendar & Agenda Views
- **Month, Week, and Day interactive views** with smart recurring event expansion (`daily`, `weekly`, `monthly`, `weekdays`).
- **Interactive List View**: Instant search, filter by priority (`urgent`, `high`, `medium`, `low`), and live status tracking (`pending`, `in-progress`, `completed`).
- **Notion-Style Properties Modal**: Add color-coded tags, meeting URLs, physical locations, recurrence rules, and formatted notes.

### 📢 Integrated Announcement & Bulletin Board
- **Edge-to-Edge Top Banner**: Full-width persistent banner for high-priority notices with one-click acknowledgement tracking.
- **Priority Bulletins**:
  - **Important (Client-Side / Team Sync)**: Shared across teammates connected to the same database.
  - **Dev Announcement (Universal Broadcast)**: Password-authenticated global broadcast channel for system-wide updates.
- **Notice Feed**: Category filtering, pinned notices, search, unread badge counters, and acknowledgement receipts.

### ☁️ Offline-First + Free Real-Time Cloud Sync (Supabase)
- **Zero-Friction Offline Mode**: Stores events and bulletins locally in browser storage by default.
- **Live Team Collaboration**: Connect any free **Supabase** PostgreSQL database to synchronize calendar events and announcements across all team members in real time.

### 🔗 1-Click Share & Sync Codes
- Compress entire schedules into short, portable **Sync Codes** (`SCHEDY-...`) or shareable URL parameters.
- Teammates can enter the code or open the link to instantly import or merge schedules onto their device.

### 💾 Multi-Format Export & Backups
- Export your agenda in 4 universal formats:
  - 📄 **Plain Text (.txt)**: Clean, formatted agenda summary.
  - 📅 **iCalendar (.ics)**: Native import for Apple Calendar, Google Calendar, and Outlook.
  - 📊 **Spreadsheet (.csv)**: Clean tabular data for Excel, Google Sheets, or Notion.
  - 🗄️ **Full JSON (.json)**: Complete backup of schedules, recurrence rules, and bulletins.

### 🎨 Adaptive Themes & Responsive UI
- **Light Theme**: Crisp Notion-inspired neutral gray canvas with subtle micro-borders.
- **Dark Theme**: Sleek obsidian dark mode designed for low-light focus.
- **Pink Theme**: Minimalist soft white canvas with `#FF8DA1` pink accents.
- **Mobile-First Responsive Layout**: Slide-down menu drawers, segmented tab navigation, and responsive calendar grids.

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

## ☁️ Cloud Sync Setup (Supabase)

Schedy works completely offline, but you can enable real-time multi-device and team sync with a free Supabase database:

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
    priority TEXT NOT NULL DEFAULT 'important',
    category TEXT NOT NULL DEFAULT 'general',
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

-- 4. Enable Row Level Security (RLS)
ALTER TABLE public.schedules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.announcements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.announcement_reads ENABLE ROW LEVEL SECURITY;

-- 5. Create Public Policies
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

-- 6. Enable Realtime Replication
ALTER PUBLICATION supabase_realtime ADD TABLE public.schedules;
ALTER PUBLICATION supabase_realtime ADD TABLE public.announcements;
ALTER PUBLICATION supabase_realtime ADD TABLE public.announcement_reads;
```

3. In your Supabase Dashboard, copy your **Project URL** and **Anon API Key** from **Project Settings $\rightarrow$ API**.
4. In Schedy, click the **Database** icon in the navbar, paste your credentials, and click **Save & Connect**.

---

## 🚢 Deployment

Deploy Schedy in seconds on any static web host:

- **Vercel**: Import repository $\rightarrow$ Framework: `Vite` $\rightarrow$ Deploy.
- **Netlify**: Drag & drop `dist/` or connect repository with build command `npm run build`.
- **Cloudflare Pages**: Connect repository $\rightarrow$ Build command `npm run build` $\rightarrow$ Output `dist`.

---

## 📄 License

MIT License — free for personal and commercial use.
