import type { EventCategory, PriorityLevel, ScheduleItemType } from '../types/schedule';

export interface ParsedEventItem {
  id: string;
  title: string;
  description: string;
  startTime: string; // ISO 8601
  endTime: string;   // ISO 8601
  isAllDay: boolean;
  category: EventCategory;
  priority: PriorityLevel;
  itemType: ScheduleItemType;
  location?: string;
  selected: boolean; // For batch review in UI
}

const GEMINI_API_KEY = (import.meta as any).env?.VITE_GEMINI_API_KEY || '';

/**
 * Parses raw unstructured text into structured calendar items using Gemini API,
 * with a resilient fallback parser for testing/prototyping.
 */
export async function parseTextWithAI(
  rawText: string,
  userTimezone: string = Intl.DateTimeFormat().resolvedOptions().timeZone
): Promise<ParsedEventItem[]> {
  const trimmed = rawText.trim();
  if (!trimmed) {
    throw new Error('Please provide text to analyze.');
  }

  const currentDate = new Date();
  const currentIso = currentDate.toISOString();

  // If Gemini API Key is provided, call Gemini API
  if (GEMINI_API_KEY && GEMINI_API_KEY !== 'your-gemini-api-key-here') {
    try {
      return await callGeminiAI(trimmed, currentIso, userTimezone);
    } catch (err: any) {
      console.warn('Gemini API call failed, falling back to heuristic parser:', err);
      // Fallback to local heuristic parser if API key is invalid/fails
      return localHeuristicParser(trimmed, currentDate);
    }
  }

  // Fallback heuristic parser for instant prototyping
  return localHeuristicParser(trimmed, currentDate);
}

/**
 * Direct Gemini API call with structured JSON formatting
 */
async function callGeminiAI(
  rawText: string,
  currentDateIso: string,
  userTimezone: string
): Promise<ParsedEventItem[]> {
  const systemPrompt = `You are a calendar extraction assistant.
Current Date: ${currentDateIso}
User Timezone: ${userTimezone}

Analyze the user's text (which may be a syllabus, exam list, reminders, or itinerary).
Extract all distinct events, deadlines, exams, and tasks.
Distribute them logically onto calendar slots.

Rules:
1. If explicit Start and Until / End times are provided (e.g. "Time: 09:00 AM - 10:30 AM" or "Due: 11:59 PM"), accurately construct the exact ISO 8601 startTime and endTime matching the user's timezone.
2. If an item is labeled as "Task" or "Due", set itemType to "task". If labeled as "Event", set itemType to "event".
3. For items sharing the same day without explicit times, stagger their times (e.g. 09:00, 13:00, 15:00) so they don't overlap.
4. If an item has ambiguous dates (e.g. "Sept 15/17"), choose the first date and note the alternative in title or description.
5. If an item is a multi-day range (e.g. "Sept 21-26"), mark isAllDay: true spanning that range.
6. If an item has no specific date (e.g. "next F2F meeting"), mark itemType: "task" and schedule for tomorrow.
7. Categories must be one of: 'work', 'meeting', 'deadline', 'personal', 'education', 'general'.
8. Priorities must be one of: 'low', 'medium', 'high', 'urgent'.
9. Output MUST be a valid JSON array of objects with the following schema:
[
  {
    "title": "string",
    "description": "string",
    "startTime": "ISO 8601 string",
    "endTime": "ISO 8601 string",
    "isAllDay": boolean,
    "category": "work" | "meeting" | "deadline" | "personal" | "education" | "general",
    "priority": "low" | "medium" | "high" | "urgent",
    "itemType": "event" | "task"
  }
]`;

  const requestBody = {
    contents: [
      {
        parts: [
          { text: systemPrompt },
          { text: `Here is the user's text to extract:\n"""\n${rawText}\n"""\n\nReturn ONLY the JSON array.` }
        ]
      }
    ],
    generationConfig: {
      temperature: 0.1,
      responseMimeType: 'application/json',
    }
  };

  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${GEMINI_API_KEY}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(requestBody),
    }
  );

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Gemini API error (${response.status}): ${errorText}`);
  }

  const jsonResponse = await response.json();
  const rawContent = jsonResponse.candidates?.[0]?.content?.parts?.[0]?.text;

  if (!rawContent) {
    throw new Error('No content returned from Gemini.');
  }

  const parsed = JSON.parse(rawContent);
  if (!Array.isArray(parsed)) {
    throw new Error('AI response is not an array.');
  }

  return parsed.map((item, index) => ({
    id: `ai_evt_${Date.now()}_${index}`,
    title: item.title || 'Untitled Event',
    description: item.description || '',
    startTime: item.startTime,
    endTime: item.endTime || item.startTime,
    isAllDay: Boolean(item.isAllDay),
    category: sanitizeCategory(item.category),
    priority: sanitizePriority(item.priority),
    itemType: item.itemType === 'task' ? 'task' : 'event',
    selected: true,
  }));
}

function sanitizeCategory(cat?: string): EventCategory {
  const valid: EventCategory[] = ['work', 'meeting', 'deadline', 'personal', 'education', 'general'];
  if (valid.includes(cat as EventCategory)) return cat as EventCategory;
  return 'general';
}

function sanitizePriority(p?: string): PriorityLevel {
  const valid: PriorityLevel[] = ['low', 'medium', 'high', 'urgent'];
  if (valid.includes(p as PriorityLevel)) return p as PriorityLevel;
  return 'medium';
}

/**
 * Intelligent local regex fallback parser
 * Perfect for quick offline demos and fallback when no API key is specified yet.
 */
function localHeuristicParser(rawText: string, currentDate: Date): ParsedEventItem[] {
  const currentYear = currentDate.getFullYear();
  const items: ParsedEventItem[] = [];

  // Split text by section dividers or double blank lines
  const sections = rawText.split(/(?:—+|-{3,}|\n\s*\n+)/).map(s => s.trim()).filter(Boolean);

  let fallbackDayOffset = 1;

  for (let i = 0; i < sections.length; i++) {
    const block = sections[i];
    if (!block) continue;

    const lines = block.split('\n').map(l => l.trim()).filter(Boolean);
    if (lines.length === 0) continue;

    let itemType: ScheduleItemType = 'event';
    let title = '';
    let description = '';
    let location = '';
    let category: EventCategory = 'education';
    let priority: PriorityLevel = 'medium';
    let foundDate: Date | null = null;
    let explicitStartHour: number | null = null;
    let explicitStartMin: number | null = null;
    let explicitEndHour: number | null = null;
    let explicitEndMin: number | null = null;
    let isAllDay = false;
    const extraNotes: string[] = [];

    for (const line of lines) {
      // Check Event: or Task: prefix
      const typeMatch = line.match(/^(?:(Event|Task|Title)):\s*(.*)$/i);
      if (typeMatch) {
        if (typeMatch[1].toLowerCase() === 'task') itemType = 'task';
        else if (typeMatch[1].toLowerCase() === 'event') itemType = 'event';
        title = typeMatch[2].trim();
        continue;
      }

      // Check Date: or Due Date:
      const dateHeaderMatch = line.match(/^(?:(?:Due\s*)?Date|Submission):\s*(.*)$/i);
      const dateLineContent = dateHeaderMatch ? dateHeaderMatch[1] : line;
      const dateMatch = dateLineContent.match(/(?:(jan|feb|mar|apr|may|jun|jul|aug|sep|sept|oct|nov|dec)[a-z]*)\s+(\d{1,2})(?:[,\s]+(\d{4}))?/i);
      if (dateMatch) {
        const monthMap: Record<string, number> = {
          jan: 0, feb: 1, mar: 2, apr: 3, may: 4, jun: 5, jul: 6, aug: 7, sep: 8, sept: 8, oct: 9, nov: 10, dec: 11
        };
        const month = monthMap[dateMatch[1].toLowerCase()] ?? 8;
        const day = parseInt(dateMatch[2], 10);
        const year = dateMatch[3] ? parseInt(dateMatch[3], 10) : currentYear;
        foundDate = new Date(year, month, day);
      }

      // Check Time: (e.g. "09:00 AM - 10:30 AM" or "11:59 PM")
      const timeHeaderMatch = line.match(/^(?:Time|Due(?:\s*Time)?):\s*(.*)$/i);
      if (timeHeaderMatch) {
        const timeStr = timeHeaderMatch[1];
        const timeRangeMatch = timeStr.match(/(\d{1,2}):(\d{2})\s*(AM|PM)?\s*(?:-|–|to)\s*(\d{1,2}):(\d{2})\s*(AM|PM)?/i);
        if (timeRangeMatch) {
          let h1 = parseInt(timeRangeMatch[1], 10);
          const m1 = parseInt(timeRangeMatch[2], 10);
          const p1 = (timeRangeMatch[3] || 'AM').toUpperCase();
          if (p1 === 'PM' && h1 < 12) h1 += 12;
          if (p1 === 'AM' && h1 === 12) h1 = 0;
          explicitStartHour = h1;
          explicitStartMin = m1;

          let h2 = parseInt(timeRangeMatch[4], 10);
          const m2 = parseInt(timeRangeMatch[5], 10);
          const p2 = (timeRangeMatch[6] || p1).toUpperCase();
          if (p2 === 'PM' && h2 < 12) h2 += 12;
          if (p2 === 'AM' && h2 === 12) h2 = 0;
          explicitEndHour = h2;
          explicitEndMin = m2;
        } else {
          const singleTimeMatch = timeStr.match(/(\d{1,2}):(\d{2})\s*(AM|PM)?/i);
          if (singleTimeMatch) {
            let h = parseInt(singleTimeMatch[1], 10);
            const m = parseInt(singleTimeMatch[2], 10);
            const p = (singleTimeMatch[3] || 'AM').toUpperCase();
            if (p === 'PM' && h < 12) h += 12;
            if (p === 'AM' && h === 12) h = 0;
            explicitStartHour = h;
            explicitStartMin = m;
          }
        }
        continue;
      }

      // Check Category:
      const catMatch = line.match(/^Category:\s*(.*)$/i);
      if (catMatch) {
        category = sanitizeCategory(catMatch[1].toLowerCase());
        continue;
      }

      // Check Priority:
      const priMatch = line.match(/^Priority:\s*(.*)$/i);
      if (priMatch) {
        priority = sanitizePriority(priMatch[1].toLowerCase());
        continue;
      }

      // Check Location:
      const locMatch = line.match(/^Location:\s*(.*)$/i);
      if (locMatch) {
        location = locMatch[1].trim();
        continue;
      }

      // Check Notes: or Coverage:
      const notesMatch = line.match(/^(?:Notes|Coverage|Description):\s*(.*)$/i);
      if (notesMatch) {
        extraNotes.push(notesMatch[1].trim());
        continue;
      }

      // Check legacy bullet styles
      if (line.includes('📌') || line.toLowerCase().includes('quiz') || line.toLowerCase().includes('exam') || line.toLowerCase().includes('assignment')) {
        const cleaned = line.replace(/^[📌*•\s]+/, '').trim();
        if (cleaned && !title) title = cleaned;
      } else if (!line.includes(':') && !title) {
        title = line.replace(/^[📌*•\s]+/, '').trim();
      } else if (!line.includes(':')) {
        extraNotes.push(line.replace(/^[📌*•🌟\s]+/, '').trim());
      }
    }

    if (!title) {
      title = lines[0].replace(/^[📌*•\s]+/, '').trim() || 'Untitled Schedule Item';
    }

    if (!foundDate) {
      foundDate = new Date(currentDate);
      foundDate.setDate(foundDate.getDate() + fallbackDayOffset);
      fallbackDayOffset += 1;
    }

    const startDate = new Date(foundDate);
    if (explicitStartHour !== null) {
      startDate.setHours(explicitStartHour, explicitStartMin ?? 0, 0, 0);
    } else {
      startDate.setHours(9 + (items.length % 5) * 2, 0, 0, 0);
    }

    const endDate = new Date(foundDate);
    if (explicitEndHour !== null) {
      endDate.setHours(explicitEndHour, explicitEndMin ?? 0, 0, 0);
    } else {
      endDate.setTime(startDate.getTime() + (itemType === 'task' ? 0 : 3600000));
    }

    if (extraNotes.length > 0) {
      description = extraNotes.join('\n');
    }

    if (title.toLowerCase().includes('assignment') || title.toLowerCase().includes('due')) {
      itemType = 'task';
    }
    if (title.toLowerCase().includes('midterm') || title.toLowerCase().includes('exam')) {
      priority = priority === 'medium' ? 'urgent' : priority;
    }

    items.push({
      id: `ai_evt_${Date.now()}_${i}`,
      title,
      description,
      startTime: startDate.toISOString(),
      endTime: endDate.toISOString(),
      isAllDay,
      category,
      priority,
      itemType,
      location,
      selected: true,
    });
  }

  return items.length > 0 ? items : [
    {
      id: `ai_evt_${Date.now()}_0`,
      title: 'Imported Schedule Item',
      description: rawText,
      startTime: new Date(Date.now() + 86400000).toISOString(),
      endTime: new Date(Date.now() + 90000000).toISOString(),
      isAllDay: false,
      category: 'general',
      priority: 'medium',
      itemType: 'event',
      selected: true,
    }
  ];
}
