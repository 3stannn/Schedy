# Schedy 📅

[![Live Demo](https://img.shields.io/badge/demo-live_app-007aff?style=flat-square&logo=vercel)](https://schedy-sepia.vercel.app)
[![React](https://img.shields.io/badge/React-19.2-61dafb?style=flat-square&logo=react)](https://react.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-6.0-3178c6?style=flat-square&logo=typescript)](https://www.typescriptlang.org/)
[![Vite](https://img.shields.io/badge/Vite-8.2-646cff?style=flat-square&logo=vite)](https://vite.dev/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-v4.3-38bdf8?style=flat-square&logo=tailwindcss)](https://tailwindcss.com/)
[![Supabase](https://img.shields.io/badge/Supabase-Realtime_Postgres-3ecf8e?style=flat-square&logo=supabase)](https://supabase.com/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg?style=flat-square)](LICENSE)

> **A distraction-free, minimalist schedule planner, Kanban task board, and notice workspace.**  
> Effortlessly manage your schedule, track tasks on a Kanban board, capture rich Notion-style notes, stay focused with an ambient Pomodoro timer, broadcast team notices, and enjoy offline-first local storage, real-time Supabase cloud sync, compressed share codes, and multi-format exports.

**[🌐 Experience the Live Demo](https://schedy-sepia.vercel.app)**

---

## 🌟 Overview

**Schedy** is an all-in-one personal and team productivity workspace designed around Apple's Human Interface Guidelines (HIG). It eliminates productivity clutter by seamlessly unifying your calendar, to-do list, notepad, focus timer, and team bulletin into a single fast, responsive web application.

Schedy runs **100% offline out of the box** using browser storage, and effortlessly upgrades to **real-time multi-device and team collaboration** with any free Supabase PostgreSQL database.

---

## ✨ Features

### 🗓️ Flexible Schedule & Timetable
- **Month, Week, Day, and List Views**: Full calendar navigation with 12-hour AM/PM time formatting and responsive layouts.
- **Multi-Day Event Boxing**: Continuous horizontal multi-day bars and pills spanning calendar days in Month view for clear timeline visibility.
- **Smart Recurring Events**: Flexible recurrence engine supporting `daily`, `weekly`, `monthly`, and `yearly` events with intelligent date expansion.
- **Event vs. Task Separation**: Dedicated item types tailored for time-based calendar events (with meeting links, physical locations) or actionable to-do items.
- **Pill Event Badges & Auto-Centering**: Daily event counter badges on week/day headers, plus smooth horizontal auto-centering to the current day on mobile screens.
- **Instant Search & Filter**: Filter events by priority (`urgent`, `high`, `medium`, `low`), status (`pending`, `in_progress`, `completed`), category, or date range.

### 🔍 Interactive Event & Task Preview
- **Quick Inspector Modal**: Click any item to inspect its details without opening full edit mode.
- **Direct Action Shortcuts**: Change status (`Pending` $\leftrightarrow$ `In Progress` $\leftrightarrow$ `Completed`), launch meeting URLs, open map locations, or trigger edits/deletions.
- **Data Retention Warnings**: Real-time auto-delete countdown indicator showing expiration timelines.

### 📋 4-Column Kanban Task Board
- **Upcoming**: Automatically syncs pending tasks and schedule events with one-click "Start" controls.
- **In Progress**: Real-time active task tracking with rapid completion or rollback controls.
- **Done**: Review completed deliverables with instant reopen capability.
- **Notepad & Scratchpad Column**: Embedded personal notes column for fast thoughts, references, and scratchpad memos.

### 📝 Notion-Style Rich Text Notes
- **Rich Text Formatting Toolbar**: Headings (`H1`, `H2`, `H3`), **bold**, *italic*, <u>underline</u>, ~~strikethrough~~, inline code, code blocks, quote blocks, and dividers.
- **Interactive Checklists**: Clickable to-do check items inside note content for structured checklists and sub-tasks.
- **6 Pastel Color Palettes**: Categorize notes visually (`Default`, `Amber`, `Emerald`, `Sky`, `Purple`, `Rose`).
- **Pinning & Ordering**: Keep priority notes pinned to the top of your scratchpad.

### ⏱️ Ambient Focus Timer (Pomodoro)
- **3 Focused Modes**: Focus Sessions (25m default), Short Breaks (5m default), and Long Breaks (15m default).
- **Customizable Intervals**: Configurable timers, long break intervals, and auto-start toggles for seamless work-rest flows.
- **Web Audio Soundscapes**:
  - Soft procedural bell chimes and completion fanfares.
  - Procedural ambient audio generator (gentle rain or mechanical clock ticking) for deep focus.
- **Task Targeting**: Link and bind any task directly from your schedule to your focus timer.
- **Interactive Controls**: Jump rounds, reset sessions, toggle volume, or enter distraction-free **Fullscreen Mode**.
- **Background Persistence**: Timer continues running seamlessly across view switches with a persistent live indicator in the navigation sidebar.

### 🧹 Smart Data Retention & Auto-Cleanup
- **Automated Workspace Hygiene**: Eliminates manual database maintenance by automatically pruning stale records.
- **Retention Rules**:
  - **Completed items**: Automatically deleted 2 days after completion.
  - **Uncompleted past-due items**: Automatically deleted 5 days after event end date.
- **Proactive Badges**: Visual countdown badges warn you before any item expires.

### 📢 Notice & Team Announcement Bulletin
- **Edge-to-Edge Urgent Top Banner**: High-priority broadcasts pinned across all views with one-click acknowledgement receipts.
- **Notice Feed**: Filter bulletins by category and priority (`Important`, `Dev Broadcast`), track unread counts, and pin key messages.
- **Developer Broadcasts**: Password-protected channel (`VITE_DEV_PASSWORD`) for global team and system announcements.

### 📊 Overview Dashboard
- **Today's Command Center**: Live metrics for total events, pending tasks, in-progress tasks, and completed items.
- **Today's Agenda & Deliverables**: Strictly filtered to the present day for immediate morning triage.
- **Urgent Notice Highlights**: Instant preview of active broadcasts and fast action shortcuts.

### ☁️ Offline-First + Free Real-Time Cloud Sync (Supabase)
- **Local-First Architecture**: Runs entirely offline in browser `localStorage` without requiring an account.
- **Real-Time Team Sync**: Connect any free **Supabase** PostgreSQL database to synchronize calendar events, Kanban task statuses, rich notes, and bulletins across all devices with instant WebSocket subscriptions.

### 🔗 1-Click Portable Share & Sync Codes
- **Compressed Sync Codes**: Export and import your entire workspace using portable alphanumeric codes (`SCHEDY-...`).
- **Deep-Link URLs**: Generate 1-click shareable URLs (`?sync=...`) to distribute templates and agendas instantly.

### 💾 Multi-Format Export & Backups
- 📄 **Plain Text (.txt)**: Formatted, human-readable agenda and note summary.
- 📅 **iCalendar (.ics)**: Native calendar import for Apple Calendar, Google Calendar, and Microsoft Outlook.
- 📊 **Spreadsheet (.csv)**: Clean tabular data for Excel, Google Sheets, or Notion databases.
- 🗄️ **Full JSON (.json)**: Complete workspace backup with 1-click restore.

### 🎨 Apple HIG-Inspired Design & Adaptive Themes
- **Standardized Apple HIG Controls**: Consistent 44px touch targets, concentric border radii, and subtle glassmorphism.
- **Motion Icons**: Fluid animated icons powered by `motion-icons-react`.
- **Three Curated Themes**:
  - **Light Theme**: Clean, crisp neutral canvas with subtle micro-borders.
  - **Dark Theme**: Obsidian dark mode engineered for low-light focus.
  - **Pink Theme**: Soft aesthetic canvas with `#FF8DA1` accents.
- **Responsive Layout**: Desktop vertical sidebar navigation and mobile bottom drawer.

---

## 🛠️ Tech Stack

| Layer | Technologies |
| :--- | :--- |
| **Frontend Framework** | [React 19](https://react.dev/) + [TypeScript](https://www.typescriptlang.org/) |
| **Build & Tooling** | [Vite 8](https://vite.dev/) + [oxlint](https://oxc.rs/) |
| **Styling & Design** | [Tailwind CSS v4](https://tailwindcss.com/) + Apple HIG Design Tokens |
| **Icons & Animation** | [Lucide React](https://lucide.dev/) + [motion-icons-react](https://github.com/) |
| **Date Utilities** | [date-fns v4](https://date-fns.org/) |
| **Backend / Database** | [Supabase](https://supabase.com/) (PostgreSQL + Realtime WebSockets) |
| **Audio Synthesis** | HTML5 Web Audio API (Chimes & Ambient Soundscapes) |
| **Deployment** | [Vercel](https://vercel.com/) |

---

## 📁 Project Structure

```
Schedy/
├── public/
│   ├── favicon.png
│   └── assets/
├── src/
│   ├── assets/              # Static branding and logos
│   ├── components/
│   │   ├── announcements/   # Bulletin feed, announcement modals
│   │   ├── common/          # Overview dashboard, toast alerts, confirm dialogs, icons
│   │   ├── layout/          # Vertical sidebar, mobile navbar, top banner
│   │   ├── schedule/        # Month, week, day, list calendar, event modal, preview modal
│   │   ├── settings/        # Database config, share codes, export/import modal
│   │   ├── tasks/           # Kanban board, rich text editor, note formatting
│   │   └── tools/           # Pomodoro timer, audio synthesizer
│   ├── services/            # Supabase clients, localStorage, share codes, sync
│   ├── types/               # TypeScript interfaces (schedule, note, announcement, database)
│   ├── utils/               # Auto-delete retention policies, formatting helpers
│   ├── App.tsx              # Main application router and state coordinator
│   ├── index.css            # Tailwind CSS v4 design system and theme tokens
│   └── main.tsx             # React DOM entrypoint
├── supabase_schema.sql      # Supabase database DDL, RLS policies, and realtime setup
├── env.example              # Environment variables template
├── package.json
└── vite.config.ts
```

---

## 🚀 Quick Start

### Prerequisites
- **Node.js**: v18.0.0 or higher
- **Package Manager**: npm, yarn, or pnpm

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

3. **Configure environment variables (Optional)**:
   ```bash
   cp env.example .env
   ```
   *See [Environment Variables](#-environment-variables) for details.*

4. **Start the development server**:
   ```bash
   npm run dev
   ```
   Open your browser at `http://localhost:5173`.

### Scripts

- `npm run dev` — Start local development server
- `npm run build` — Type-check with TypeScript and build for production
- `npm run preview` — Locally preview the production build
- `npm run lint` — Fast linting with oxlint

---

## 🔐 Environment Variables

You can supply Supabase credentials via environment variables for automatic connection, or enter them directly inside the app's **Database** settings modal:

```env
# Supabase Cloud Database & Universal Realtime Sync
VITE_UNIVERSAL_SUPABASE_URL=https://your-project.supabase.co
VITE_UNIVERSAL_SUPABASE_ANON_KEY=your-supabase-anon-key-here

# Optional Fallback Supabase Database
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-supabase-anon-key-here

# Developer Password for Universal Announcements
VITE_DEV_PASSWORD=your-developer-password-here
```

---

## ☁️ Cloud Database Setup (Supabase)

Schedy is **offline-first**, but enabling team sync takes less than two minutes with a free Supabase account:

1. Create a free project at [supabase.com](https://supabase.com).
2. Open the **SQL Editor** in your Supabase dashboard and run the following script:

```sql
-- 1. Schedules & Tasks Table
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

-- Ensure item_type column exists on existing databases
ALTER TABLE public.schedules ADD COLUMN IF NOT EXISTS item_type TEXT DEFAULT 'event';

-- 2. Announcements & Bulletins Table
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

-- 4. Notes & Notepad Table
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

-- 6. Create Public Access Policies
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

3. Copy your **Project URL** and **Anon Key** from **Project Settings $\rightarrow$ API** in Supabase.
4. Click the **Database** button in the Schedy sidebar, paste your credentials, and click **Save & Connect**.

---

## 🚢 Deployment

Deploy Schedy in seconds on any modern static hosting platform:

### Deploy to Vercel
1. Push your repository to GitHub.
2. Import the repository in [Vercel](https://vercel.com/).
3. Framework Preset: **Vite**.
4. (Optional) Add your environment variables in Vercel project settings (`VITE_UNIVERSAL_SUPABASE_URL`, `VITE_UNIVERSAL_SUPABASE_ANON_KEY`, `VITE_DEV_PASSWORD`).
5. Click **Deploy**.

### Deploy to Netlify / Cloudflare Pages
- **Build Command**: `npm run build`
- **Publish Directory**: `dist`

---

## 📄 License

Distributed under the **MIT License**. See [LICENSE](LICENSE) for more information.

Created with ❤️ by [3stannn](https://github.com/3stannn).
