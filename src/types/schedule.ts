export type PriorityLevel = 'low' | 'medium' | 'high' | 'urgent';

export type EventStatus = 'pending' | 'in_progress' | 'completed' | 'cancelled';

export type RecurrenceRule = 'none' | 'daily' | 'weekly' | 'monthly' | 'yearly';

export type EventCategory = 
  | 'work' 
  | 'meeting' 
  | 'deadline' 
  | 'personal' 
  | 'education' 
  | 'general';

export interface ScheduleEvent {
  id: string;
  title: string;
  description: string;
  startTime: string; // ISO 8601 string
  endTime: string;   // ISO 8601 string
  isAllDay: boolean;
  category: EventCategory;
  priority: PriorityLevel;
  status: EventStatus;
  location?: string;
  meetingUrl?: string;
  recurrenceRule: RecurrenceRule;
  createdBy?: string;
  createdAt: string;
  updatedAt: string;
}

export interface ScheduleFilterState {
  searchQuery: string;
  category: string;
  priority: string;
  status: string;
  dateRange: 'all' | 'today' | 'this_week' | 'this_month' | 'custom';
  startDate?: string;
  endDate?: string;
}
