import React, { useState } from 'react';

import type { ScheduleEvent, EventCategory, PriorityLevel, ScheduleItemType } from '../../types/schedule';
import type { UserProfile } from '../../types/auth';
import { parseTextWithAI, type ParsedEventItem } from '../../services/aiScheduleService';
import { deductAiCredit } from '../../services/authService';
import { useModalBehavior } from '../../hooks/useModalBehavior';
import { ModalDragHandle } from '../common/ModalDragHandle';
import { CustomDateTimePicker } from '../common/CustomDateTimePicker';
import { CustomSelect } from '../common/CustomSelect';
import { haptics } from '../../utils/haptics';

const ITEM_TYPE_OPTIONS = [
  { value: 'event', label: 'Event' },
  { value: 'task', label: 'Task' },
];

const CATEGORY_OPTIONS = [
  { value: 'work', label: 'Work' },
  { value: 'meeting', label: 'Meeting' },
  { value: 'deadline', label: 'Deadline' },
  { value: 'personal', label: 'Personal' },
  { value: 'education', label: 'Education' },
  { value: 'general', label: 'General' },
];

const PRIORITY_OPTIONS = [
  { value: 'low', label: 'Low' },
  { value: 'medium', label: 'Medium' },
  { value: 'high', label: 'High' },
  { value: 'urgent', label: 'Urgent' },
];

interface AIScheduleModalProps {
  isOpen: boolean;
  onClose: () => void;
  onImportEvents: (newEvents: ScheduleEvent[]) => Promise<void>;
  user: UserProfile | null;
  onRequireUpgrade: () => void;
  onRequireAuth: () => void;
  onUserUpdated?: (user: UserProfile) => void;
}

const SAMPLE_TEXT = `Event: DS2 - Online Quiz
Date: September 18, 2026
Time: 09:00 AM - 10:30 AM
Category: Education
Priority: High
Notes: Coverage Chapter 3-4. Scientific calculators are allowed.

Event: WEBPROG - Lab Exam
Date: September 15, 2026
Time: 11:00 AM - 01:00 PM
Location: Online (MS Teams)
Category: Education
Priority: Urgent
Notes: Coverage: HTML, CSS, JavaScript. Web camera is required to be turned on.`;

export const AIScheduleModal: React.FC<AIScheduleModalProps> = ({
  isOpen,
  onClose,
  onImportEvents,
  user,
  onRequireUpgrade,
  onRequireAuth,
  onUserUpdated,
}) => {
  const [inputText, setInputText] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [extractedItems, setExtractedItems] = useState<ParsedEventItem[]>([]);
  const [step, setStep] = useState<'input' | 'preview'>('input');
  const [creditsRemaining, setCreditsRemaining] = useState<number>(user?.aiCreditsRemaining ?? 1);
  const [prevUserCredits, setPrevUserCredits] = useState(user?.aiCreditsRemaining);

  if (user && user.aiCreditsRemaining !== prevUserCredits) {
    setPrevUserCredits(user.aiCreditsRemaining);
    setCreditsRemaining(user.aiCreditsRemaining);
  }

  const {
    modalRef,
    backdropRef,
    dragHandleProps,
    modalStyle,
    isDragging,
    handleBackdropClick,
    handleBackdropTouchMove,
  } = useModalBehavior({
    isOpen,
    onClose,
  });

  if (!isOpen) return null;

  const handleLoadSample = () => {
    haptics.light();
    setInputText(SAMPLE_TEXT);
  };

  const handleParseText = async () => {
    haptics.medium();

    if (!user) {
      setErrorMessage('You must be signed in with Google to use the AI Schedule Importer.');
      onRequireAuth();
      return;
    }

    if (!inputText.trim()) {
      setErrorMessage('Please paste or enter some text first.');
      return;
    }

    if (!user.isPro && creditsRemaining <= 0) {
      onRequireUpgrade();
      return;
    }

    setIsLoading(true);
    setErrorMessage(null);

    try {
      const items = await parseTextWithAI(inputText);
      setExtractedItems(items);
      setStep('preview');

      if (user && !user.isPro) {
        const deductResult = await deductAiCredit(user.id);
        const updatedCount = deductResult.creditsRemaining;
        setCreditsRemaining(updatedCount);
        if (onUserUpdated) {
          onUserUpdated({
            ...user,
            aiCreditsRemaining: updatedCount,
          });
        }
      }
    } catch (err: any) {
      console.error('Error parsing text with AI:', err);
      setErrorMessage(err.message || 'Failed to analyze text. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const toggleItemSelection = (index: number) => {
    haptics.selection();
    setExtractedItems(prev =>
      prev.map((item, i) => (i === index ? { ...item, selected: !item.selected } : item))
    );
  };

  const updateItemField = (index: number, field: keyof ParsedEventItem, val: any) => {
    setExtractedItems(prev =>
      prev.map((item, i) => (i === index ? { ...item, [field]: val } : item))
    );
  };

  const handleStartDateChange = (index: number, newDateVal: string) => {
    setExtractedItems(prev =>
      prev.map((item, i) => {
        if (i !== index) return item;

        let endIso = item.endTime;
        try {
          const newStartObj = new Date(newDateVal);
          if (!isNaN(newStartObj.getTime())) {
            const oldStart = new Date(item.startTime).getTime();
            const oldEnd = new Date(item.endTime || item.startTime).getTime();
            const duration = !isNaN(oldStart) && !isNaN(oldEnd) && oldEnd > oldStart
              ? oldEnd - oldStart
              : 60 * 60 * 1000;
            endIso = new Date(newStartObj.getTime() + duration).toISOString();
          }
        } catch {
          // Keep existing end
        }

        return {
          ...item,
          startTime: newDateVal,
          endTime: endIso,
        };
      })
    );
  };

  const handleEndDateChange = (index: number, newDateVal: string) => {
    setExtractedItems(prev =>
      prev.map((item, i) => {
        if (i !== index) return item;
        return {
          ...item,
          endTime: newDateVal,
        };
      })
    );
  };

  const handleRemoveItem = (index: number) => {
    haptics.light();
    setExtractedItems(prev => prev.filter((_, i) => i !== index));
  };

  const handleAddNewItem = () => {
    haptics.light();
    const now = new Date();
    const defaultStart = new Date(now);
    defaultStart.setHours(9, 0, 0, 0);
    const defaultEnd = new Date(now);
    defaultEnd.setHours(10, 0, 0, 0);

    const newItem: ParsedEventItem = {
      id: `evt_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      title: 'New Event',
      description: '',
      startTime: defaultStart.toISOString(),
      endTime: defaultEnd.toISOString(),
      isAllDay: false,
      category: 'general',
      priority: 'medium',
      itemType: 'event',
      selected: true,
    };

    setExtractedItems(prev => [...prev, newItem]);
  };

  const handleSaveToCalendar = async () => {
    haptics.medium();

    if (!user) {
      setErrorMessage('Please sign in with Google before importing events.');
      onRequireAuth();
      return;
    }

    const selected = extractedItems.filter(i => i.selected);
    if (selected.length === 0) {
      setErrorMessage('Please select at least one event to import.');
      return;
    }

    const now = new Date().toISOString();
    const formattedEvents: ScheduleEvent[] = selected.map(item => {
      let startIso: string;
      let endIso: string;

      if (item.isAllDay) {
        const datePart = item.startTime.includes('T') ? item.startTime.split('T')[0] : item.startTime;
        const endDatePart = item.endTime?.includes('T') ? item.endTime.split('T')[0] : (item.endTime || datePart);
        const s = new Date(`${datePart}T00:00:00`);
        const e = new Date(`${endDatePart}T23:59:59`);
        startIso = s.toISOString();
        endIso = e.toISOString();
      } else {
        const s = new Date(item.startTime);
        const e = new Date(item.endTime || item.startTime);
        startIso = !isNaN(s.getTime()) ? s.toISOString() : now;
        endIso = !isNaN(e.getTime()) ? e.toISOString() : new Date(Date.now() + 3600000).toISOString();
      }

      return {
        id: item.id || `evt_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
        title: item.title?.trim() || 'Untitled Event',
        description: item.description?.trim() || '',
        startTime: startIso,
        endTime: endIso,
        isAllDay: Boolean(item.isAllDay),
        category: item.category || 'general',
        priority: item.priority || 'medium',
        status: 'pending',
        itemType: item.itemType || 'event',
        recurrenceRule: 'none',
        location: item.location?.trim() || '',
        createdAt: now,
        updatedAt: now,
      };
    });

    await onImportEvents(formattedEvents);
    onClose();
    setStep('input');
    setInputText('');
    setExtractedItems([]);
  };

  const selectedCount = extractedItems.filter(i => i.selected).length;

  return (
    <div
      ref={backdropRef}
      onClick={handleBackdropClick}
      onTouchMove={handleBackdropTouchMove}
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/50 sm:bg-black/40 backdrop-blur-xs animate-fade-in"
      role="dialog"
      aria-modal="true"
      aria-label="AI Schedule Importer"
    >
      <div
        ref={modalRef}
        style={modalStyle}
        className="bg-white dark:bg-[#1c1c1e] rounded-t-[28px] sm:rounded-[24px] max-w-3xl w-full max-h-[92vh] overflow-y-auto border border-black/[0.08] dark:border-white/[0.12] shadow-2xl transition-all text-neutral-900 dark:text-neutral-100 no-scrollbar flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Mobile Grab Handle */}
        <ModalDragHandle dragHandleProps={dragHandleProps} isDragging={isDragging} />

        {/* iOS Modal Header */}
        <div className="flex items-center justify-between px-4 sm:px-6 py-3 border-b border-black/[0.06] dark:border-white/[0.08] text-xs shrink-0">
          {step === 'preview' ? (
            <button
              type="button"
              onClick={() => {
                haptics.light();
                setStep('input');
              }}
              className="text-xs font-medium text-[#007aff] dark:text-[#0a84ff] hover:opacity-80 transition-opacity cursor-pointer min-h-[32px] flex items-center"
            >
              Edit Text
            </button>
          ) : (
            <button
              type="button"
              onClick={() => {
                haptics.light();
                onClose();
              }}
              className="text-xs font-medium text-[#007aff] dark:text-[#0a84ff] hover:opacity-80 transition-opacity cursor-pointer min-h-[32px] flex items-center"
            >
              Cancel
            </button>
          )}

          <div className="flex items-center gap-1.5 font-semibold text-xs text-neutral-900 dark:text-white">
            <span>AI Schedule Importer</span>
            {user?.isPro ? (
              <span className="ml-1 px-1.5 py-0.2 rounded-full text-[8px] font-bold bg-[#007aff]/15 text-[#007aff] dark:text-[#0a84ff]">
                PRO
              </span>
            ) : user ? (
              <span className="ml-1 px-1.5 py-0.2 rounded-full text-[9px] font-medium bg-black/5 dark:bg-white/10 text-neutral-500">
                {creditsRemaining} left
              </span>
            ) : (
              <span className="ml-1 px-1.5 py-0.2 rounded-full text-[9px] font-medium bg-amber-500/10 text-amber-700 dark:text-amber-400">
                Sign In Required
              </span>
            )}
          </div>

          <button
            type="button"
            onClick={() => {
              haptics.light();
              onClose();
            }}
            className="text-xs font-medium text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200 transition-colors cursor-pointer min-h-[32px] flex items-center"
          >
            Done
          </button>
        </div>

        {/* Modal Content */}
        <div className="flex-1 p-4 sm:p-6 space-y-4 overflow-y-auto">
          {/* Sign In Required Notice Banner */}
          {!user && (
            <div className="p-3.5 rounded-[16px] bg-black/[0.03] dark:bg-white/[0.05] border border-black/[0.06] dark:border-white/[0.08] flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="space-y-0.5 min-w-0">
                <p className="text-xs font-semibold text-neutral-900 dark:text-white">
                  Sign in required
                </p>
                <p className="text-[11px] text-neutral-500 dark:text-neutral-400">
                  You need to be signed in with Google to use the AI Schedule Importer (1 free try included).
                </p>
              </div>
              <button
                type="button"
                onClick={onRequireAuth}
                className="px-3.5 py-1.5 text-xs font-semibold text-white bg-[#007aff] hover:bg-[#0071e3] dark:bg-[#0a84ff] dark:hover:bg-[#0077ed] rounded-xl transition-all active:scale-[0.98] cursor-pointer shadow-xs shrink-0 text-center"
              >
                Sign In with Google
              </button>
            </div>
          )}

          {errorMessage && (
            <div className="p-3 rounded-[14px] bg-[#ff3b30]/10 border border-[#ff3b30]/20 text-[#ff3b30] dark:text-[#ff453a] text-xs">
              <span>{errorMessage}</span>
            </div>
          )}

          {step === 'input' ? (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-medium text-neutral-500 dark:text-neutral-400">
                  Paste syllabus, exam dates, or task notes
                </span>
                <button
                  type="button"
                  onClick={handleLoadSample}
                  className="text-[11px] font-medium text-[#007aff] dark:text-[#0a84ff] hover:opacity-80 transition-opacity cursor-pointer"
                >
                  Load Sample
                </button>
              </div>

              <div className="p-2.5 rounded-[12px] bg-[#007aff]/[0.06] dark:bg-[#0a84ff]/[0.08] border border-[#007aff]/15 dark:border-[#0a84ff]/20 text-[11px] text-neutral-600 dark:text-neutral-300 leading-relaxed">
                <span className="font-semibold text-[#007aff] dark:text-[#0a84ff]">Tip: </span>
                For the best results, use structured key-value labels such as <span className="font-mono text-neutral-800 dark:text-neutral-200 font-medium">Event:</span> or <span className="font-mono text-neutral-800 dark:text-neutral-200 font-medium">Task:</span>, <span className="font-mono text-neutral-800 dark:text-neutral-200 font-medium">Date:</span>, and <span className="font-mono text-neutral-800 dark:text-neutral-200 font-medium">Time:</span> (Start - Until). Click{' '}
                <button
                  type="button"
                  onClick={handleLoadSample}
                  className="text-[#007aff] dark:text-[#0a84ff] font-medium underline hover:opacity-80 cursor-pointer"
                >
                  Load Sample
                </button>{' '}
                to see the format.
              </div>

              <div className="rounded-[16px] bg-black/[0.03] dark:bg-white/[0.05] border border-black/[0.06] dark:border-white/[0.08] p-2.5">
                <textarea
                  value={inputText}
                  onChange={(e) => setInputText(e.target.value)}
                  placeholder={`Paste notes, syllabus, or reminders here...

Clean Format (Recommended):
Event: DS2 - Online Quiz
Date: September 18, 2026
Time: 09:00 AM - 10:30 AM
Category: Education
Priority: High
Notes: Coverage Chapter 3-4

Task: CC6 - Case Study Submission
Due Date: September 20, 2026
Time: 11:59 PM
Notes: Submit documentation`}
                  rows={10}
                  className="w-full bg-transparent border-0 text-neutral-900 dark:text-white text-xs placeholder:text-neutral-400 dark:placeholder:text-neutral-500 focus:outline-none resize-none leading-relaxed font-mono"
                />
              </div>

              <div className="flex justify-end pt-1">
                {!user ? (
                  <button
                    type="button"
                    onClick={onRequireAuth}
                    className="px-4 py-2 text-xs font-semibold text-white bg-[#007aff] hover:bg-[#0071e3] dark:bg-[#0a84ff] dark:hover:bg-[#0077ed] rounded-xl transition-all active:scale-[0.98] cursor-pointer shadow-xs min-h-[34px]"
                  >
                    <span>Sign In to Use AI</span>
                  </button>
                ) : !user.isPro && creditsRemaining <= 0 ? (
                  <button
                    type="button"
                    onClick={onRequireUpgrade}
                    className="px-4 py-2 text-xs font-semibold text-white bg-[#007aff] hover:bg-[#0071e3] dark:bg-[#0a84ff] dark:hover:bg-[#0077ed] rounded-xl transition-all active:scale-[0.98] cursor-pointer shadow-xs min-h-[34px]"
                  >
                    <span>Upgrade to Pro (0 Free Tries Left)</span>
                  </button>
                ) : (
                  <button
                    type="button"
                    disabled={isLoading || !inputText.trim()}
                    onClick={handleParseText}
                    className="px-4 py-2 text-xs font-semibold text-white bg-[#007aff] hover:bg-[#0071e3] dark:bg-[#0a84ff] dark:hover:bg-[#0077ed] rounded-xl transition-all active:scale-[0.98] cursor-pointer shadow-xs disabled:opacity-50 min-h-[34px]"
                  >
                    <span>{isLoading ? 'Extracting...' : 'Extract & Distribute'}</span>
                  </button>
                )}
              </div>
            </div>
          ) : (
            /* PREVIEW STEP: Modify Generated Schedule */
            <div className="space-y-3.5">
              <div className="flex items-center justify-between text-xs text-neutral-500 dark:text-neutral-400 px-0.5">
                <span>{selectedCount} of {extractedItems.length} selected for calendar</span>
                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={() => {
                      const allSelected = extractedItems.every(i => i.selected);
                      setExtractedItems(prev => prev.map(i => ({ ...i, selected: !allSelected })));
                    }}
                    className="text-[#007aff] dark:text-[#0a84ff] font-medium hover:underline cursor-pointer"
                  >
                    {extractedItems.every(i => i.selected) ? 'Deselect All' : 'Select All'}
                  </button>
                </div>
              </div>

              {/* Editable Cards List */}
              <div className="space-y-3 max-h-[58vh] overflow-y-auto pr-1 no-scrollbar">
                {extractedItems.map((item, idx) => (
                  <div
                    key={item.id || idx}
                    className={`p-3.5 rounded-[18px] border transition-all ${item.selected
                        ? 'bg-black/[0.02] dark:bg-white/[0.04] border-black/[0.08] dark:border-white/[0.1] shadow-2xs'
                        : 'bg-black/[0.01] dark:bg-white/[0.02] border-black/[0.04] dark:border-white/[0.06] opacity-50'
                      }`}
                  >
                    {/* Card Header: Checkbox, Title Input, Remove Button */}
                    <div className="flex items-center gap-2.5 mb-2.5">
                      <input
                        type="checkbox"
                        checked={item.selected}
                        onChange={() => toggleItemSelection(idx)}
                        className="w-4 h-4 rounded accent-[#007aff] cursor-pointer shrink-0"
                        title={item.selected ? 'Selected for import' : 'Excluded from import'}
                      />

                      <input
                        type="text"
                        value={item.title}
                        onChange={(e) => updateItemField(idx, 'title', e.target.value)}
                        placeholder="Event or task title..."
                        className="flex-1 font-semibold text-xs text-neutral-900 dark:text-white bg-transparent border-0 border-b border-black/[0.08] dark:border-white/[0.12] focus:border-[#007aff] dark:focus:border-[#0a84ff] focus:ring-0 px-1 py-1 transition-colors"
                      />

                      <button
                        type="button"
                        onClick={() => handleRemoveItem(idx)}
                        className="text-[11px] font-medium text-[#ff3b30] dark:text-[#ff453a] hover:underline px-1.5 py-1 shrink-0 cursor-pointer"
                        title="Remove item"
                      >
                        Remove
                      </button>
                    </div>

                    {/* Properties: Date Dropdowns (Start → Until), Type, Category, Priority */}
                    <div className="space-y-2.5 pt-1 border-t border-black/[0.04] dark:border-white/[0.06]">
                      {/* Date & Time Row: Start → Until */}
                      <div className="space-y-1">
                        <div className="flex items-center justify-between">
                          <label className="text-[10px] font-semibold text-neutral-400 dark:text-neutral-500 uppercase tracking-wider block">
                            {item.isAllDay ? 'Date Range' : 'Date & Time'}
                          </label>
                          <span className="text-[10px] text-neutral-400 dark:text-neutral-500 font-medium">
                            {item.isAllDay ? 'Start to End' : 'Start → Until'}
                          </span>
                        </div>
                        <div className="flex items-center gap-1.5 sm:gap-2 w-full">
                          <div className="flex-1 min-w-0">
                            <CustomDateTimePicker
                              value={item.startTime}
                              onChange={(val) => handleStartDateChange(idx, val)}
                              mode={item.isAllDay ? 'date' : 'datetime'}
                              className="w-full"
                            />
                          </div>
                          <span className="text-neutral-400 text-xs shrink-0 select-none">→</span>
                          <div className="flex-1 min-w-0">
                            <CustomDateTimePicker
                              value={item.endTime || item.startTime}
                              onChange={(val) => handleEndDateChange(idx, val)}
                              mode={item.isAllDay ? 'date' : 'datetime'}
                              className="w-full"
                            />
                          </div>
                        </div>
                      </div>

                      {/* Dropdowns Row: Type, Category, Priority */}
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                        {/* Item Type Dropdown */}
                        <div className="space-y-1">
                          <label className="text-[10px] font-semibold text-neutral-400 dark:text-neutral-500 uppercase tracking-wider block">
                            Type
                          </label>
                          <CustomSelect
                            value={item.itemType || 'event'}
                            onChange={(val) => updateItemField(idx, 'itemType', val as ScheduleItemType)}
                            options={ITEM_TYPE_OPTIONS}
                            size="sm"
                            className="w-full"
                          />
                        </div>

                        {/* Category Dropdown */}
                        <div className="space-y-1">
                          <label className="text-[10px] font-semibold text-neutral-400 dark:text-neutral-500 uppercase tracking-wider block">
                            Category
                          </label>
                          <CustomSelect
                            value={item.category || 'general'}
                            onChange={(val) => updateItemField(idx, 'category', val as EventCategory)}
                            options={CATEGORY_OPTIONS}
                            size="sm"
                            className="w-full"
                          />
                        </div>

                        {/* Priority Dropdown */}
                        <div className="space-y-1">
                          <label className="text-[10px] font-semibold text-neutral-400 dark:text-neutral-500 uppercase tracking-wider block">
                            Priority
                          </label>
                          <CustomSelect
                            value={item.priority || 'medium'}
                            onChange={(val) => updateItemField(idx, 'priority', val as PriorityLevel)}
                            options={PRIORITY_OPTIONS}
                            size="sm"
                            className="w-full"
                          />
                        </div>
                      </div>

                      {/* All-Day toggle & Location */}
                      <div className="flex flex-wrap items-center justify-between gap-2 pt-0.5">
                        <label className="inline-flex items-center gap-1.5 text-[11px] font-medium text-neutral-600 dark:text-neutral-300 cursor-pointer select-none">
                          <input
                            type="checkbox"
                            checked={Boolean(item.isAllDay)}
                            onChange={(e) => updateItemField(idx, 'isAllDay', e.target.checked)}
                            className="rounded accent-[#007aff] cursor-pointer w-3.5 h-3.5"
                          />
                          <span>All-day item</span>
                        </label>

                        <input
                          type="text"
                          value={item.location || ''}
                          onChange={(e) => updateItemField(idx, 'location', e.target.value)}
                          placeholder="Optional location / link"
                          className="text-[11px] bg-transparent border-0 border-b border-black/[0.06] dark:border-white/[0.08] focus:border-[#007aff] focus:ring-0 px-1 py-0.5 text-neutral-700 dark:text-neutral-300 placeholder:text-neutral-400 max-w-xs"
                        />
                      </div>

                      {/* Description & Notes */}
                      <div className="space-y-1 pt-0.5">
                        <label className="text-[10px] font-semibold text-neutral-400 dark:text-neutral-500 uppercase tracking-wider block">
                          Notes & Details
                        </label>
                        <textarea
                          value={item.description || ''}
                          onChange={(e) => updateItemField(idx, 'description', e.target.value)}
                          placeholder="Coverage, instructions, or task notes..."
                          rows={2}
                          className="w-full p-2 text-xs rounded-xl bg-white dark:bg-[#1f1f22] border border-black/[0.06] dark:border-white/[0.08] text-neutral-900 dark:text-white placeholder:text-neutral-400 focus:outline-none focus:ring-1 focus:ring-[#007aff] resize-none leading-relaxed"
                        />
                      </div>
                    </div>
                  </div>
                ))}

                {/* Add Item Manually Button */}
                <button
                  type="button"
                  onClick={handleAddNewItem}
                  className="w-full py-2.5 px-3 rounded-[16px] border border-dashed border-black/[0.15] dark:border-white/[0.2] hover:border-[#007aff] dark:hover:border-[#0a84ff] text-neutral-600 dark:text-neutral-400 hover:text-[#007aff] dark:hover:text-[#0a84ff] text-xs font-semibold transition-colors cursor-pointer text-center"
                >
                  + Add Another Event or Task
                </button>
              </div>

              {/* Bottom Action Footer */}
              <div className="flex items-center justify-between gap-2 pt-2 border-t border-black/[0.06] dark:border-white/[0.08]">
                <button
                  type="button"
                  onClick={() => setStep('input')}
                  className="text-xs font-medium text-neutral-500 hover:text-neutral-800 dark:hover:text-neutral-200 transition-colors cursor-pointer py-1 px-1.5"
                >
                  Edit Input Text
                </button>

                <button
                  type="button"
                  disabled={selectedCount === 0}
                  onClick={handleSaveToCalendar}
                  className="px-5 py-2 text-xs font-semibold text-white bg-[#007aff] hover:bg-[#0071e3] dark:bg-[#0a84ff] dark:hover:bg-[#0077ed] rounded-xl transition-all active:scale-[0.98] cursor-pointer shadow-xs disabled:opacity-50 min-h-[36px]"
                >
                  <span>Add {selectedCount} Event{selectedCount === 1 ? '' : 's'} to Calendar</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
