import React, { useRef, useState } from 'react';
import type { ScheduleEvent } from '../../types/schedule';
import type { Announcement } from '../../types/announcement';
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
  Download 
} from 'lucide-react';

interface ExportImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  events: ScheduleEvent[];
  announcements: Announcement[];
  onImportSuccess: (importedEvents: ScheduleEvent[], importedAnnouncements?: Announcement[]) => void;
}

export const ExportImportModal: React.FC<ExportImportModalProps> = ({
  isOpen,
  onClose,
  events,
  announcements,
  onImportSuccess,
}) => {
  if (!isOpen) return null;

  const fileInputRef = useRef<HTMLInputElement>(null);
  const [importStatus, setImportStatus] = useState<{ success: boolean; message: string } | null>(null);

  const downloadFile = (content: string, filename: string, type: string) => {
    const blob = new Blob([content], { type });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const handleExportICal = () => {
    const icsData = exportToICal(events);
    downloadFile(icsData, 'schedule-export-' + new Date().toISOString().split('T')[0] + '.ics', 'text/calendar;charset=utf-8');
  };

  const handleExportCSV = () => {
    const csvData = exportToCSV(events);
    downloadFile(csvData, 'schedule-export-' + new Date().toISOString().split('T')[0] + '.csv', 'text/csv;charset=utf-8');
  };

  const handleExportJSON = () => {
    const payload = {
      version: '1.0',
      exportedAt: new Date().toISOString(),
      events,
      announcements,
    };
    downloadFile(JSON.stringify(payload, null, 2), 'schedy-backup-' + new Date().toISOString().split('T')[0] + '.json', 'application/json');
  };

  const handleExportPlainText = () => {
    const txtData = exportToPlainText(events, announcements);
    downloadFile(txtData, 'schedule-export-' + new Date().toISOString().split('T')[0] + '.txt', 'text/plain;charset=utf-8');
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

        if (Array.isArray(parsed)) {
          newEvents = parsed;
        } else if (parsed.events && Array.isArray(parsed.events)) {
          newEvents = parsed.events;
          newAnnouncements = parsed.announcements;
        } else {
          throw new Error('Unrecognized JSON backup structure.');
        }

        onImportSuccess(newEvents, newAnnouncements);
        setImportStatus({
          success: true,
          message: 'Successfully imported ' + newEvents.length + ' events' + (newAnnouncements ? ' and ' + newAnnouncements.length + ' announcements' : '') + '!',
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

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/50 backdrop-blur-sm animate-fade-in">
      <div className="bg-white/95 dark:bg-[#161619]/95 backdrop-blur-2xl rounded-2xl max-w-md w-full max-h-[90vh] overflow-y-auto border border-neutral-200/80 dark:border-neutral-800/80 shadow-2xl transition-all text-[#1c1917] dark:text-[#f4f4f5]">
        
        {/* Header */}
        <div className="flex items-center justify-between px-4 sm:px-6 py-3.5 sm:py-4 border-b border-neutral-100 dark:border-neutral-800/80 text-xs">
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

        {/* Content */}
        <div className="p-4 sm:p-6 space-y-4 text-xs">
          
          {/* Export Options */}
          <div>
            <span className="font-semibold text-neutral-400 mb-2.5 block text-[10px] uppercase tracking-wider">
              Export Formats
            </span>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              <button
                onClick={handleExportPlainText}
                className="flex flex-col items-center p-3 rounded-xl border border-neutral-200/80 dark:border-neutral-800/80 hover:border-neutral-300 dark:hover:border-neutral-700 bg-neutral-50/50 dark:bg-neutral-900/40 hover:-translate-y-0.5 transition-all text-center"
              >
                <FileText className="w-4 h-4 text-neutral-600 dark:text-neutral-300 mb-1.5" />
                <span className="text-xs font-bold">Plain Text</span>
                <span className="text-[10px] text-neutral-400">.txt Agenda</span>
              </button>

              <button
                onClick={handleExportICal}
                className="flex flex-col items-center p-3 rounded-xl border border-neutral-200/80 dark:border-neutral-800/80 hover:border-neutral-300 dark:hover:border-neutral-700 bg-neutral-50/50 dark:bg-neutral-900/40 hover:-translate-y-0.5 transition-all text-center"
              >
                <Calendar className="w-4 h-4 text-neutral-600 dark:text-neutral-300 mb-1.5" />
                <span className="text-xs font-bold">iCal</span>
                <span className="text-[10px] text-neutral-400">.ics file</span>
              </button>

              <button
                onClick={handleExportCSV}
                className="flex flex-col items-center p-3 rounded-xl border border-neutral-200/80 dark:border-neutral-800/80 hover:border-neutral-300 dark:hover:border-neutral-700 bg-neutral-50/50 dark:bg-neutral-900/40 hover:-translate-y-0.5 transition-all text-center"
              >
                <FileSpreadsheet className="w-4 h-4 text-neutral-600 dark:text-neutral-300 mb-1.5" />
                <span className="text-xs font-bold">CSV</span>
                <span className="text-[10px] text-neutral-400">Spreadsheet</span>
              </button>

              <button
                onClick={handleExportJSON}
                className="flex flex-col items-center p-2.5 rounded-lg border border-[#e9e9e7] dark:border-[#2e2e2e] hover:bg-neutral-50 dark:hover:bg-neutral-800 transition-colors text-center"
              >
                <FileJson className="w-4 h-4 text-neutral-600 dark:text-neutral-300 mb-1" />
                <span className="text-xs font-semibold">JSON</span>
                <span className="text-[10px] text-neutral-400">Full backup</span>
              </button>
            </div>
          </div>

          {/* Import / Restore Section */}
          <div className="pt-3 border-t border-neutral-100 dark:border-neutral-800">
            <span className="font-semibold text-neutral-500 mb-2 block text-[11px] uppercase tracking-wider">
              Restore Backup
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
              className="w-full flex items-center justify-center gap-2 p-3 rounded-lg border border-dashed border-neutral-300 dark:border-neutral-700 hover:border-neutral-400 hover:bg-neutral-50 dark:hover:bg-neutral-800 transition-colors text-neutral-600 dark:text-neutral-300"
            >
              <Upload className="w-4 h-4 text-neutral-500" />
              <span className="text-xs">Upload .json backup file</span>
            </button>

            {importStatus && (
              <div
                className={`mt-2.5 p-2.5 rounded text-xs flex items-center gap-2 ${
                  importStatus.success
                    ? 'bg-emerald-50 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-900'
                    : 'bg-rose-50 text-rose-800 dark:bg-rose-950/40 dark:text-rose-300 border border-rose-200 dark:border-rose-900'
                }`}
              >
                {importStatus.success ? <CheckCircle2 className="w-3.5 h-3.5 shrink-0" /> : <AlertCircle className="w-3.5 h-3.5 shrink-0" />}
                <span>{importStatus.message}</span>
              </div>
            )}
          </div>

        </div>
      </div>
    </div>
  );
};
