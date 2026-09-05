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
} from '../common/MovingIcon';

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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-black/50 backdrop-blur-sm animate-fade-in">
      <div className="bg-white dark:bg-[#1c1c1e] rounded-t-[28px] sm:rounded-[24px] max-w-2xl w-full max-h-[92vh] flex flex-col border border-black/[0.08] dark:border-white/[0.12] shadow-2xl transition-all text-neutral-900 dark:text-neutral-100 overflow-hidden">
        
        {/* iOS Sheet Grab Handle for Mobile */}
        <div className="sm:hidden pt-2.5 pb-1 flex justify-center shrink-0">
          <div className="ios-sheet-handle" />
        </div>

        {/* Header */}
        <div className="flex items-center justify-between px-4 sm:px-6 py-3 border-b border-black/[0.06] dark:border-white/[0.08] text-xs shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="text-xs font-medium text-[#007aff] dark:text-[#0a84ff] hover:opacity-80 transition-opacity cursor-pointer min-h-[32px] flex items-center"
          >
            Done
          </button>

          <div className="flex items-center gap-1.5 font-semibold text-xs text-neutral-900 dark:text-white">
            <Download className="w-3.5 h-3.5 text-[#007aff] dark:text-[#0a84ff]" />
            <span>Export & Backup</span>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-full text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200 hover:bg-black/5 dark:hover:bg-white/10 transition-colors cursor-pointer"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-4 sm:p-6 space-y-4 text-xs overflow-y-auto flex-1">
          
          {/* Format Selection Buttons */}
          <div>
            <span className="font-semibold text-neutral-500 dark:text-neutral-400 mb-2 block text-[10px] uppercase tracking-wider">
              Choose Export Format
            </span>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              <button
                type="button"
                onClick={() => setSelectedFormat('txt')}
                className={`flex flex-col items-center p-2.5 sm:p-3 rounded-[14px] border transition-all text-center cursor-pointer ${
                  selectedFormat === 'txt'
                    ? 'border-[#007aff] bg-[#007aff]/10 text-[#007aff] dark:text-[#0a84ff] shadow-xs'
                    : 'border-black/[0.06] dark:border-white/[0.08] bg-black/[0.02] dark:bg-white/[0.04] text-neutral-700 dark:text-neutral-300 hover:bg-black/5 dark:hover:bg-white/5'
                }`}
              >
                <FileText className="w-4 h-4 mb-1" />
                <span className="text-xs font-bold">Text</span>
                <span className="text-[10px] opacity-70">.txt file</span>
              </button>

              <button
                type="button"
                onClick={() => setSelectedFormat('ics')}
                className={`flex flex-col items-center p-2.5 sm:p-3 rounded-[14px] border transition-all text-center cursor-pointer ${
                  selectedFormat === 'ics'
                    ? 'border-[#007aff] bg-[#007aff]/10 text-[#007aff] dark:text-[#0a84ff] shadow-xs'
                    : 'border-black/[0.06] dark:border-white/[0.08] bg-black/[0.02] dark:bg-white/[0.04] text-neutral-700 dark:text-neutral-300 hover:bg-black/5 dark:hover:bg-white/5'
                }`}
              >
                <Calendar className="w-4 h-4 mb-1" />
                <span className="text-xs font-bold">iCal</span>
                <span className="text-[10px] opacity-70">.ics file</span>
              </button>

              <button
                type="button"
                onClick={() => setSelectedFormat('csv')}
                className={`flex flex-col items-center p-2.5 sm:p-3 rounded-[14px] border transition-all text-center cursor-pointer ${
                  selectedFormat === 'csv'
                    ? 'border-[#007aff] bg-[#007aff]/10 text-[#007aff] dark:text-[#0a84ff] shadow-xs'
                    : 'border-black/[0.06] dark:border-white/[0.08] bg-black/[0.02] dark:bg-white/[0.04] text-neutral-700 dark:text-neutral-300 hover:bg-black/5 dark:hover:bg-white/5'
                }`}
              >
                <FileSpreadsheet className="w-4 h-4 mb-1" />
                <span className="text-xs font-bold">CSV</span>
                <span className="text-[10px] opacity-70">Spreadsheet</span>
              </button>

              <button
                type="button"
                onClick={() => setSelectedFormat('json')}
                className={`flex flex-col items-center p-2.5 sm:p-3 rounded-[14px] border transition-all text-center cursor-pointer ${
                  selectedFormat === 'json'
                    ? 'border-[#007aff] bg-[#007aff]/10 text-[#007aff] dark:text-[#0a84ff] shadow-xs'
                    : 'border-black/[0.06] dark:border-white/[0.08] bg-black/[0.02] dark:bg-white/[0.04] text-neutral-700 dark:text-neutral-300 hover:bg-black/5 dark:hover:bg-white/5'
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
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
              <div className="flex items-center gap-1.5 text-neutral-600 dark:text-neutral-300">
                <Eye className="w-3.5 h-3.5 text-[#007aff] dark:text-[#0a84ff]" />
                <span className="font-semibold text-xs">Preview: {previewData.label}</span>
                <span className="text-[10px] text-neutral-400 font-mono ml-1">
                  ({lineCount} {lineCount === 1 ? 'line' : 'lines'})
                </span>
              </div>
              <div className="flex items-center gap-2 w-full sm:w-auto">
                <button
                  type="button"
                  onClick={handleCopy}
                  className="ios-btn-tinted flex-1 sm:flex-initial flex items-center justify-center gap-1.5 px-3 py-1 text-xs font-semibold rounded-xl transition-colors cursor-pointer min-h-[32px] h-8"
                >
                  {copied ? <Check className="w-3.5 h-3.5 text-[#34c759]" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copied ? 'Copied' : 'Copy'}</span>
                </button>
                <button
                  type="button"
                  onClick={handleDownload}
                  className="ios-btn-filled flex-1 sm:flex-initial flex items-center justify-center gap-1.5 px-3.5 py-1 text-xs font-semibold rounded-xl bg-[#007aff] hover:bg-[#0071e3] dark:bg-[#0a84ff] text-white transition-all active:scale-[0.98] cursor-pointer min-h-[32px] h-8"
                >
                  <Download className="w-3.5 h-3.5" />
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

