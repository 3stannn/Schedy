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

## ☁️ Universal Announcement Cloud Setup (Supabase)

Schedy stores your schedules locally with share code / backup exports, and connects to a free **Supabase** database for live Universal Announcement broadcasts:

1. Create a free account at [supabase.com](https://supabase.com) and create a new project.
2. In the Supabase dashboard, go to the **SQL Editor** and run the following schema:

```sql
-- 1. Create announcements table
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

-- 2. Create announcement reads / acknowledgement table
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
