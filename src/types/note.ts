export type NoteColor = 'default' | 'yellow' | 'blue' | 'green' | 'purple' | 'pink';

export interface Note {
  id: string;
  title: string;
  content: string;
  color: NoteColor;
  isPinned: boolean;
  createdAt: string; // ISO string
  updatedAt: string; // ISO string
}

