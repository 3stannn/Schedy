# Schedy 📅

> A lightweight, Notion-inspired schedule planner and bulletin announcement manager with real-time cloud database sync, instant calendar share codes, and full mobile responsiveness.

---

## ✨ Features

- **🗓️ Dynamic Calendar & Schedule Views**:
  - **Month, Week, and Day** interactive views with recurring event expansion (`daily`, `weekly`, `monthly`, `weekdays`).
  - **List View**: Search, filter by priority (`urgent`, `high`, `normal`, `low`), and toggle status (`completed`, `in-progress`, `pending`).
  - **Notion-Style Modal**: Clean properties grid with color tags, location, meeting links, recurrence rules, and rich description fields.

- **📢 Announcement & Bulletin Board**:
  - **Edge-to-Edge Top Banner**: Prominent full-width alert for active urgent announcements with acknowledge tracking.
  - **Notice Feed**: Category filtering, pinned notices, search, unread badge counters, and acknowledgement receipts.

- **🔗 1-Click Share & Sync Codes**:
  - Package your exact schedule and announcements into a portable **Sync Code** (`SCHEDY-...`) or shareable URL.
  - Teammates can enter the code or open the link to instantly mirror your exact calendar on their device.

- **☁️ 100% Free Cloud Database Sync (Supabase)**:
  - Works completely offline out-of-the-box with browser `localStorage`.
  - Connect a free **Supabase** PostgreSQL database with 1 click to sync changes in real-time across all team members.

- **🎨 Multi-Theme System**:
  - **Light Mode**: Crisp Notion-inspired neutral gray tones with subtle glassmorphic styling.
  - **Dark Mode**: Sleek obsidian dark theme with micro-borders.
  - **Pink Theme**: Minimalist white canvas with soft black typography and `#FF8DA1` pink accents.

- **📱 Fully Responsive Mobile Navigation**:
  - Adaptive mobile header with segmented tab track and slide-down settings drawer.
  - Compact month view day cells with priority dots on mobile screens.

- **⏱️ Principle-Based Toast Notifications**:
  - Real-time countdown progress indicator calculated using HCI reading speed principles.
  - **WCAG 2.2.1 Interactive Pause-on-Hover** (pauses timer on hover/touch).

- **💾 Data Portability & Backup**:
  - Export your entire agenda as **Plain Text (.txt)** formatted summary, **JSON Backup**, or **CSV Spreadsheet**.
  - 1-click JSON import to restore schedules anytime.

---

## 🛠️ Tech Stack

- **Frontend**: [React 19](https://react.dev/) + [TypeScript](https://www.typescriptlang.org/)
- **Build Tool**: [Vite](https://vite.dev/)
- **Styling**: [Tailwind CSS](https://tailwindcss.com/)
- **Icons**: [Lucide React](https://lucide.dev/)
- **Date Utilities**: [date-fns](https://date-fns.org/)
- **Database (Optional)**: [Supabase](https://supabase.com/) (PostgreSQL with Row Level Security)

---

## 🚀 Quick Start

### Prerequisites
- Node.js (v18 or higher)
- npm or yarn / pnpm

### Installation

1. **Clone or navigate to the project directory**:
   ```bash
   cd schedy
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
   The compiled assets will be in the `dist/` directory.

---

## ☁️ Free Cloud Database Setup (Supabase)

Schedy can run standalone offline or connect to a free **Supabase** PostgreSQL database:

1. Create a free account at [supabase.com](https://supabase.com) and create a new project.
2. In the Supabase dashboard, go to the **SQL Editor** and run the following schema:

```sql
-- 1. Create schedule_events table
create table public.schedule_events (
  id text primary key,
  title text not null,
  description text default '',
  start_time timestamptz not null,
  end_time timestamptz not null,
  is_all_day boolean default false,
  category text default 'general',
  priority text default 'normal',
  status text default 'pending',
  location text default '',
  meeting_url text default '',
  recurrence_rule text default 'none',
  created_at timestamptz default timezone('utc'::text, now()) not null,
  updated_at timestamptz default timezone('utc'::text, now()) not null
);

-- 2. Create announcements table
create table public.announcements (
  id text primary key,
  title text not null,
  content text not null,
  author_name text default 'Admin',
  priority text default 'general',
  category text default 'general',
  is_pinned boolean default false,
  created_at timestamptz default timezone('utc'::text, now()) not null,
  updated_at timestamptz default timezone('utc'::text, now()) not null
);

-- 3. Enable public access for demo / team sharing
alter table public.schedule_events enable row level security;
alter table public.announcements enable row level security;

create policy "Public Schedule Events Access" 
  on public.schedule_events for all using (true) with check (true);

create policy "Public Announcements Access" 
  on public.announcements for all using (true) with check (true);
```

3. Copy your **Project URL** and **Anon Public API Key** from **Project Settings $\rightarrow$ API**.
4. Open **Schedy**, click the **Database** icon in the navbar, paste your credentials, and click **Save & Connect**.

---

## 🚢 Deployment

You can deploy Schedy for free to any static hosting provider:

### Vercel
1. Import your repository into [Vercel](https://vercel.com).
2. Framework Preset: `Vite`
3. Output Directory: `dist`
4. Click **Deploy**.

### Netlify
1. Run `npm run build`.
2. Drag and drop the `dist/` folder to [app.netlify.com/drop](https://app.netlify.com/drop) or connect your Git repository.

### Cloudflare Pages
1. In the Cloudflare dashboard, select **Workers & Pages** $\rightarrow$ **Create Application** $\rightarrow$ **Pages**.
2. Connect your repo and set build command: `npm run build`, output directory: `dist`.

---

## 📄 License

MIT License — free for personal and commercial use.
