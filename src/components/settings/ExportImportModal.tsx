import React, { useRef, useState, useMemo } from 'react';
import type { ScheduleEvent } from '../../types/schedule';
import type { Announcement } from '../../types/announcement';
import type { Note } from '../../types/note';
import { exportToICal, exportToCSV, exportToPlainText } from '../../services/scheduleService';
import { 
  Upload, 
  X, 
  Calendar, 
  FileSpreadsheet, 
  FileJson, 
  FileText,
  CheckCircle2, 
  AlertCircle,
  Download,
  Copy,
  Check,
  Eye
} from 'lucide-react';

interface ExportImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  events: ScheduleEvent[];
  announcements: Announcement[];
  notes?: Note[];
  onImportSuccess: (importedEvents: ScheduleEvent[], importedAnnouncements?: Announcement[], importedNotes?: Note[]) => void;
}

type ExportFormat = 'txt' | 'ics' | 'csv' | 'json';

export const ExportImportModal: React.FC<ExportImportModalProps> = ({
  isOpen,
  onClose,
  events,
  announcements,
  notes = [],
  onImportSuccess,
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [selectedFormat, setSelectedFormat] = useState<ExportFormat>('txt');
  const [copied, setCopied] = useState(false);
  const [importStatus, setImportStatus] = useState<{ success: boolean; message: string } | null>(null);

  const previewData = useMemo(() => {
    if (!isOpen) {
      return { content: '', filename: '', mimeType: 'text/plain', label: '' };
    }
    const today = new Date().toISOString().split('T')[0] || 'backup';
    const safeEvents = Array.isArray(events) ? events : [];
    const safeAnnos = Array.isArray(announcements) ? announcements : [];
    const safeNotes = Array.isArray(notes) ? notes : [];

    switch (selectedFormat) {
      case 'txt':
        return {
          content: exportToPlainText(safeEvents, safeAnnos, safeNotes),
          filename: `schedule-export-${today}.txt`,
          mimeType: 'text/plain;charset=utf-8',
          label: 'Plain Text Agenda (.txt)',
        };
      case 'ics':
        return {
          content: exportToICal(safeEvents),
          filename: `schedule-export-${today}.ics`,
          mimeType: 'text/calendar;charset=utf-8',
          label: 'iCalendar (.ics)',
        };
      case 'csv':
        return {
          content: exportToCSV(safeEvents),
          filename: `schedule-export-${today}.csv`,
          mimeType: 'text/csv;charset=utf-8',
          label: 'Spreadsheet CSV (.csv)',
        };
      case 'json':
      default: {
        const payload = {
          version: '1.0',
          exportedAt: new Date().toISOString(),
          events: safeEvents,
          announcements: safeAnnos,
          notes: safeNotes,
        };
        return {
          content: JSON.stringify(payload, null, 2),
          filename: `schedy-backup-${today}.json`,
          mimeType: 'application/json;charset=utf-8',
          label: 'Full JSON Backup (.json)',
        };
      }
    }
  }, [isOpen, selectedFormat, events, announcements, notes]);

  if (!isOpen) return null;

  const handleDownload = () => {
    try {
      const content = previewData.content || '';
      const blob = new Blob([content], { type: previewData.mimeType });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = previewData.filename;
      document.body.appendChild(link);
      link.click();
      setTimeout(() => {
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
      }, 100);
    } catch (err) {
      console.error('Download error:', err);
    }
  };

  const handleCopy = () => {
    try {
      navigator.clipboard.writeText(previewData.content || '');
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Copy error:', err);
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const text = evt.target?.result as string;
        const parsed = JSON.parse(text);

        let newEvents: ScheduleEvent[] = [];
        let newAnnouncements: Announcement[] | undefined = undefined;
        let newNotes: Note[] | undefined = undefined;

        if (Array.isArray(parsed)) {
          newEvents = parsed;
        } else if (parsed.events && Array.isArray(parsed.events)) {
          newEvents = parsed.events;
          newAnnouncements = parsed.announcements;
          newNotes = parsed.notes;
        } else {
          throw new Error('Unrecognized JSON backup structure.');
        }

        onImportSuccess(newEvents, newAnnouncements, newNotes);
        const details = [
          `${newEvents.length} events`,
          newAnnouncements ? `${newAnnouncements.length} notices` : null,
          newNotes ? `${newNotes.length} notes` : null,
        ].filter(Boolean).join(', ');

        setImportStatus({
          success: true,
          message: `Successfully imported ${details}!`,
        });
      } catch (err: any) {
        setImportStatus({
          success: false,
          message: 'Failed to import backup: ' + (err.message || 'Invalid JSON file'),
        });
      }
    };
    reader.readAsText(file);
  };

  const lineCount = previewData.content ? previewData.content.split('\n').length : 0;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/50 backdrop-blur-sm animate-fade-in">
      <div className="bg-white/95 dark:bg-[#161619]/95 backdrop-blur-2xl rounded-2xl max-w-2xl w-full max-h-[92vh] flex flex-col border border-neutral-200/80 dark:border-neutral-800/80 shadow-2xl transition-all text-[#1c1917] dark:text-[#f4f4f5]">
        
        {/* Header */}
        <div className="flex items-center justify-between px-4 sm:px-6 py-3.5 sm:py-4 border-b border-neutral-100 dark:border-neutral-800/80 text-xs shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-xl bg-blue-500/10 text-[#2383e2] flex items-center justify-center">
              <Download className="w-4 h-4 shrink-0" />
            </div>
            <span className="font-bold text-sm text-[#1c1917] dark:text-white">
              Export & Backup
            </span>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-4 sm:p-6 space-y-4 text-xs overflow-y-auto flex-1">
          
          {/* Format Selection Buttons */}
          <div>
            <span className="font-semibold text-neutral-400 mb-2 block text-[10px] uppercase tracking-wider">
              Choose Export Format
            </span>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              <button
                type="button"
                onClick={() => setSelectedFormat('txt')}
                className={`flex flex-col items-center p-2.5 sm:p-3 rounded-xl border transition-all text-center ${
                  selectedFormat === 'txt'
                    ? 'border-[#2383e2] bg-blue-50/60 dark:bg-blue-950/30 text-[#2383e2] shadow-xs'
                    : 'border-neutral-200/80 dark:border-neutral-800/80 hover:border-neutral-300 dark:hover:border-neutral-700 bg-neutral-50/50 dark:bg-neutral-900/40 text-neutral-700 dark:text-neutral-300'
                }`}
              >
                <FileText className="w-4 h-4 mb-1" />
                <span className="text-xs font-bold">Plain Text</span>
                <span className="text-[10px] opacity-70">.txt Agenda</span>
              </button>

              <button
                type="button"
                onClick={() => setSelectedFormat('ics')}
                className={`flex flex-col items-center p-2.5 sm:p-3 rounded-xl border transition-all text-center ${
                  selectedFormat === 'ics'
                    ? 'border-[#2383e2] bg-blue-50/60 dark:bg-blue-950/30 text-[#2383e2] shadow-xs'
                    : 'border-neutral-200/80 dark:border-neutral-800/80 hover:border-neutral-300 dark:hover:border-neutral-700 bg-neutral-50/50 dark:bg-neutral-900/40 text-neutral-700 dark:text-neutral-300'
                }`}
              >
                <Calendar className="w-4 h-4 mb-1" />
                <span className="text-xs font-bold">iCal</span>
                <span className="text-[10px] opacity-70">.ics file</span>
              </button>

              <button
                type="button"
                onClick={() => setSelectedFormat('csv')}
                className={`flex flex-col items-center p-2.5 sm:p-3 rounded-xl border transition-all text-center ${
                  selectedFormat === 'csv'
                    ? 'border-[#2383e2] bg-blue-50/60 dark:bg-blue-950/30 text-[#2383e2] shadow-xs'
                    : 'border-neutral-200/80 dark:border-neutral-800/80 hover:border-neutral-300 dark:hover:border-neutral-700 bg-neutral-50/50 dark:bg-neutral-900/40 text-neutral-700 dark:text-neutral-300'
                }`}
              >
                <FileSpreadsheet className="w-4 h-4 mb-1" />
                <span className="text-xs font-bold">CSV</span>
                <span className="text-[10px] opacity-70">Spreadsheet</span>
              </button>

              <button
                type="button"
                onClick={() => setSelectedFormat('json')}
                className={`flex flex-col items-center p-2.5 sm:p-3 rounded-xl border transition-all text-center ${
                  selectedFormat === 'json'
                    ? 'border-[#2383e2] bg-blue-50/60 dark:bg-blue-950/30 text-[#2383e2] shadow-xs'
                    : 'border-neutral-200/80 dark:border-neutral-800/80 hover:border-neutral-300 dark:hover:border-neutral-700 bg-neutral-50/50 dark:bg-neutral-900/40 text-neutral-700 dark:text-neutral-300'
                }`}
              >
                <FileJson className="w-4 h-4 mb-1" />
                <span className="text-xs font-bold">JSON</span>
                <span className="text-[10px] opacity-70">Full backup</span>
              </button>
            </div>
          </div>

          {/* Export Preview Area */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5 text-neutral-600 dark:text-neutral-300">
                <Eye className="w-3.5 h-3.5 text-[#2383e2]" />
                <span className="font-semibold text-xs">Preview: {previewData.label}</span>
                <span className="text-[10px] text-neutral-400 font-mono ml-1">
                  ({lineCount} {lineCount === 1 ? 'line' : 'lines'})
                </span>
              </div>
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={handleCopy}
                  className="flex items-center gap-1 px-2.5 py-1 text-xs font-medium rounded-lg border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 hover:bg-neutral-50 dark:hover:bg-neutral-700 text-neutral-700 dark:text-neutral-200 transition-colors shadow-2xs"
                >
                  {copied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copied ? 'Copied' : 'Copy'}</span>
                </button>
                <button
                  type="button"
                  onClick={handleDownload}
                  className="flex items-center gap-1 px-3 py-1 text-xs font-medium rounded-lg bg-[#2383e2] hover:bg-[#1a73e8] text-white transition-colors shadow-xs"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Download {selectedFormat.toUpperCase()}</span>
                </button>
              </div>
            </div>

            {/* Scrollable Preview Viewer */}
            <div className="relative rounded-xl border border-neutral-200/80 dark:border-neutral-800 bg-neutral-50/80 dark:bg-neutral-900/80 p-3 max-h-48 overflow-auto font-mono text-[11px] leading-relaxed text-neutral-800 dark:text-neutral-200 whitespace-pre shadow-inner select-text">
              {previewData.content || '(No data to preview)'}
            </div>
          </div>

          {/* Import / Restore Section */}
          <div className="pt-3 border-t border-neutral-100 dark:border-neutral-800">
            <span className="font-semibold text-neutral-400 mb-2 block text-[10px] uppercase tracking-wider">
              Restore From Backup
            </span>

            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileUpload}
              accept=".json"
              className="hidden"
            />

            <button
              onClick={() => fileInputRef.current?.click()}
              className="w-full flex items-center justify-center gap-2 p-3 rounded-xl border border-dashed border-neutral-300 dark:border-neutral-700 hover:border-neutral-400 hover:bg-neutral-50 dark:hover:bg-neutral-800/60 transition-colors text-neutral-600 dark:text-neutral-300 shadow-2xs"
            >
              <Upload className="w-4 h-4 text-[#2383e2]" />
              <span className="text-xs font-medium">Upload .json backup file</span>
            </button>

            {importStatus && (
              <div
                className={`mt-2.5 p-2.5 rounded-xl text-xs flex items-center gap-2 ${
                  importStatus.success
                    ? 'bg-emerald-50 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-900'
                    : 'bg-rose-50 text-rose-800 dark:bg-rose-950/40 dark:text-rose-300 border border-rose-200 dark:border-rose-900'
                }`}
              >
                {importStatus.success ? <CheckCircle2 className="w-3.5 h-3.5 shrink-0 text-emerald-600" /> : <AlertCircle className="w-3.5 h-3.5 shrink-0 text-rose-600" />}
                <span>{importStatus.message}</span>
              </div>
            )}
          </div>

        </div>
      </div>
    </div>
  );
};

