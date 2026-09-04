export interface DatabaseScheduleRow {
  id: string;
  title: string;
  description: string;
  start_time: string;
  end_time: string;
  is_all_day: boolean;
  category: string;
  priority: string;
  status: string;
  item_type?: string;
  location: string;
  meeting_url: string;
  recurrence_rule: string;
  created_by: string;
  created_at: string;
  updated_at: string;
}

export interface DatabaseAnnouncementRow {
  id: string;
  title: string;
  content: string;
  priority: string;
  category: string;
  is_pinned: boolean;
  expires_at: string | null;
  author_name: string;
  created_at: string;
  updated_at: string;
}

export interface DatabaseAnnouncementReadRow {
  id: string;
  announcement_id: string;
  user_id: string;
  read_at: string;
}

export interface DatabaseNoteRow {
  id: string;
  title: string;
  content: string;
  color: string;
  is_pinned: boolean;
  created_at: string;
  updated_at: string;
}

