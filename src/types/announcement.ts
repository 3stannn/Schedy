export type AnnouncementPriority = 'dev' | 'urgent' | 'important' | 'notice' | 'general';

export interface Announcement {
  id: string;
  title: string;
  content: string;
  priority: AnnouncementPriority;
  category: string;
  isPinned: boolean;
  expiresAt?: string;
  authorName: string;
  createdAt: string;
  updatedAt: string;
  isRead?: boolean;
}

export interface AnnouncementRead {
  id: string;
  announcementId: string;
  userId: string;
  readAt: string;
}
