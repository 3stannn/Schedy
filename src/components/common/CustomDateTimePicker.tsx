import React, { useState, useRef, useEffect, useCallback, useId } from 'react';
import { createPortal } from 'react-dom';
import {
  format,
  parseISO,
  isValid,
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
  eachDayOfInterval,
  isSameMonth,
  isSameDay,
  isToday,
  addMonths,
  subMonths,
} from 'date-fns';
import {
  Calendar as CalendarIcon,
  ChevronLeft,
  ChevronRight,
  Clock,
  Check,
  X
} from 'lucide-react';

export interface CustomDateTimePickerProps {
  value: string; // 'YYYY-MM-DD' or 'YYYY-MM-DDTHH:mm'
  onChange: (value: string) => void;
  mode?: 'datetime' | 'date';
  placeholder?: string;
  className?: string;
  disabled?: boolean;
  ariaLabel?: string;
  id?: string;
}

const MINUTES_LIST = [
  '00', '05', '10', '15', '20', '25',
  '30', '35', '40', '45', '50', '55',
  '59'
];

const HOURS_LIST = [
  '01', '02', '03', '04', '05', '06',
  '07', '08', '09', '10', '11', '12'
];

export const CustomDateTimePicker: React.FC<CustomDateTimePickerProps> = ({
  value,
  onChange,
  mode = 'datetime',
  placeholder,
  className = '',
  disabled = false,
  ariaLabel,
  id,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(() => (typeof window !== 'undefined' ? window.innerWidth < 640 : false));
  const [mobileTab, setMobileTab] = useState<'date' | 'time'>('date');
  const [coords, setCoords] = useState<{ top: number; left: number; placeAbove: boolean }>({
    top: 0,
    left: 0,
    placeAbove: false,
  });

  const triggerRef = useRef<HTMLButtonElement>(null);
  const popoverRef = useRef<HTMLDivElement>(null);
  const generatedId = useId();
  const inputId = id || generatedId;

  // Track viewport size for mobile vs desktop positioning
  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth < 640);
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Safely parse value to local Date
  const parseCurrentValue = useCallback((): Date => {
    if (!value) return new Date();
    try {
      if (/^\d{4}-\d{2}-\d{2}$/.test(value)) {
        const [y, m, d] = value.split('-').map(Number);
        return new Date(y, m - 1, d, 12, 0);
      }
      const d = parseISO(value);
      return isValid(d) ? d : new Date();
    } catch {
      return new Date();
    }
  }, [value]);

  const currentDate = parseCurrentValue();
  const [viewDate, setViewDate] = useState<Date>(currentDate);

  // Position calculation for desktop popover
  const updatePosition = useCallback(() => {
    if (!triggerRef.current) return;
    const rect = triggerRef.current.getBoundingClientRect();
    const popoverHeight = mode === 'datetime' ? 340 : 310;
    const popoverWidth = mode === 'datetime' ? 440 : 280;

    const spaceBelow = window.innerHeight - rect.bottom;
    const placeAbove = spaceBelow < popoverHeight && rect.top > popoverHeight;

    let left = rect.left;
    if (left + popoverWidth > window.innerWidth - 12) {
      left = Math.max(12, window.innerWidth - popoverWidth - 12);
    }

    setCoords({
      top: placeAbove ? rect.top - 8 : rect.bottom + 8,
      left,
      placeAbove,
    });
  }, [mode]);

  const toggleOpen = () => {
    if (disabled) return;
    if (!isOpen) {
      updatePosition();
      setViewDate(parseCurrentValue());
      setMobileTab('date');
      setIsOpen(true);
    } else {
      setIsOpen(false);
    }
  };

  // Close on outside click (desktop)
  useEffect(() => {
    if (!isOpen || isMobile) return;

    const handlePointerDown = (e: MouseEvent | TouchEvent) => {
      const target = e.target as Node;
      if (
        triggerRef.current &&
        !triggerRef.current.contains(target) &&
        popoverRef.current &&
        !popoverRef.current.contains(target)
      ) {
        setIsOpen(false);
      }
    };

    const handleWindowEvents = () => {
      updatePosition();
    };

    document.addEventListener('mousedown', handlePointerDown);
    document.addEventListener('touchstart', handlePointerDown);
    window.addEventListener('resize', handleWindowEvents);
    window.addEventListener('scroll', handleWindowEvents, true);

    return () => {
      document.removeEventListener('mousedown', handlePointerDown);
      document.removeEventListener('touchstart', handlePointerDown);
      window.removeEventListener('resize', handleWindowEvents);
      window.removeEventListener('scroll', handleWindowEvents, true);
    };
  }, [isOpen, isMobile, updatePosition]);

  // Escape key closes
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsOpen(false);
        triggerRef.current?.focus();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen]);

  // Output formatting
  const emitChange = (d: Date) => {
    if (mode === 'date') {
      onChange(format(d, 'yyyy-MM-dd'));
    } else {
      onChange(format(d, "yyyy-MM-dd'T'HH:mm"));
    }
  };

  // Date selection handler
  const handleSelectDay = (day: Date) => {
    const base = parseCurrentValue();
    const updated = new Date(
      day.getFullYear(),
      day.getMonth(),
      day.getDate(),
      base.getHours(),
      base.getMinutes()
    );
    emitChange(updated);
    if (mode === 'date') {
      setIsOpen(false);
    }
  };

  // Time component handlers
  const currentHours24 = currentDate.getHours();
  const currentMinutes = currentDate.getMinutes();
  const isPM = currentHours24 >= 12;
  const currentHours12 = currentHours24 % 12 === 0 ? 12 : currentHours24 % 12;
  const currentHoursStr = String(currentHours12).padStart(2, '0');
  const currentMinutesStr = String(currentMinutes).padStart(2, '0');

  const handleSelectHour = (h12Str: string) => {
    const h12 = parseInt(h12Str, 10);
    let h24 = h12;
    if (isPM && h12 !== 12) h24 = h12 + 12;
    if (!isPM && h12 === 12) h24 = 0;

    const updated = new Date(currentDate);
    updated.setHours(h24);
    emitChange(updated);
  };

  const handleSelectMinute = (mStr: string) => {
    const m = parseInt(mStr, 10);
    const updated = new Date(currentDate);
    updated.setMinutes(m);
    emitChange(updated);
  };

  const handleTogglePeriod = (period: 'AM' | 'PM') => {
    let h24 = currentDate.getHours();
    if (period === 'AM' && h24 >= 12) h24 -= 12;
    if (period === 'PM' && h24 < 12) h24 += 12;

    const updated = new Date(currentDate);
    updated.setHours(h24);
    emitChange(updated);
  };

  const handleSetToday = () => {
    const now = new Date();
    emitChange(now);
    setViewDate(now);
    if (mode === 'date') setIsOpen(false);
  };

  // Format trigger display string
  const displayString = value
    ? mode === 'date'
      ? format(currentDate, 'MMM d, yyyy')
      : format(currentDate, 'MMM d, yyyy · hh:mm a')
    : placeholder || (mode === 'date' ? 'Select date...' : 'Select date & time...');

  // Calendar month days calculation
  const monthStart = startOfMonth(viewDate);
  const monthEnd = endOfMonth(monthStart);
  const calStart = startOfWeek(monthStart);
  const calEnd = endOfWeek(monthEnd);
  const calendarDays = eachDayOfInterval({ start: calStart, end: calEnd });

  // Internal Calendar Component (Shared between mobile and desktop)
  const renderCalendar = (isMobileView: boolean) => (
    <div className={`${isMobileView ? 'w-full' : 'w-[245px]'} flex flex-col shrink-0`}>
      {/* Month/Year Navigation */}
      <div className="flex items-center justify-between mb-2">
        <span className="font-bold text-xs sm:text-sm text-neutral-900 dark:text-white tracking-tight">
          {format(viewDate, 'MMMM yyyy')}
        </span>
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => setViewDate(subMonths(viewDate, 1))}
            className="p-1 sm:p-1.5 rounded-lg hover:bg-black/[0.05] dark:hover:bg-white/[0.08] text-neutral-600 dark:text-neutral-300 transition-colors cursor-pointer"
            title="Previous Month"
          >
            <ChevronLeft className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            onClick={() => setViewDate(addMonths(viewDate, 1))}
            className="p-1 sm:p-1.5 rounded-lg hover:bg-black/[0.05] dark:hover:bg-white/[0.08] text-neutral-600 dark:text-neutral-300 transition-colors cursor-pointer"
            title="Next Month"
          >
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Day of Week Header */}
      <div className="grid grid-cols-7 gap-1 text-center mb-1">
        {['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'].map((d) => (
          <span
            key={d}
            className="text-[10px] font-semibold text-neutral-400 dark:text-neutral-500 uppercase tracking-wider py-0.5"
          >
            {d}
          </span>
        ))}
      </div>

      {/* Days Grid */}
      <div className="grid grid-cols-7 gap-1">
        {calendarDays.map((day) => {
          const isSelected = isSameDay(day, currentDate);
          const isCurrentMonth = isSameMonth(day, viewDate);
          const isTodayDate = isToday(day);

          return (
            <button
              key={day.toISOString()}
              type="button"
              onClick={() => handleSelectDay(day)}
              className={`${isMobileView ? 'h-9 w-full' : 'h-7 w-7'
                } rounded-lg text-xs font-medium flex items-center justify-center transition-all cursor-pointer ${isSelected
                  ? 'bg-neutral-900 text-white dark:bg-white dark:text-black font-bold shadow-xs'
                  : isTodayDate
                    ? 'border border-blue-500 text-blue-600 dark:text-blue-400 font-semibold hover:bg-blue-50 dark:hover:bg-blue-950/40'
                    : isCurrentMonth
                      ? 'text-neutral-700 dark:text-neutral-200 hover:bg-black/[0.05] dark:hover:bg-white/[0.08]'
                      : 'text-neutral-300 dark:text-neutral-600 hover:bg-black/[0.02] dark:hover:bg-white/[0.04]'
                }`}
            >
              {format(day, 'd')}
            </button>
          );
        })}
      </div>
    </div>
  );

  // Internal Time Component (Shared between mobile and desktop)
  const renderTimeColumns = (isMobileView: boolean) => (
    <div
      className={`${isMobileView
          ? 'w-full flex flex-col pt-1'
          : 'border-t sm:border-t-0 sm:border-l border-black/[0.06] dark:border-white/[0.08] pt-2 sm:pt-0 sm:pl-3 flex flex-col shrink-0'
        }`}
    >
      <div className="flex items-center gap-1 mb-2 text-neutral-400 text-[11px] font-semibold uppercase tracking-wider">
        <Clock className="w-3 h-3" />
        <span>Time ({currentHoursStr}:{currentMinutesStr} {isPM ? 'PM' : 'AM'})</span>
      </div>

      <div className={`flex ${isMobileView ? 'justify-around' : 'gap-1.5'} h-[200px]`}>
        {/* Hours Column */}
        <div className={`flex flex-col items-center ${isMobileView ? 'flex-1' : ''}`}>
          <span className="text-[10px] text-neutral-400 mb-1">Hour</span>
          <div className="flex-1 overflow-y-auto space-y-1 w-full max-h-[175px] px-0.5">
            {HOURS_LIST.map((h) => {
              const isSelected = h === currentHoursStr;
              return (
                <button
                  key={h}
                  type="button"
                  onClick={() => handleSelectHour(h)}
                  className={`w-full ${isMobileView ? 'h-8' : 'w-9 h-6.5'} rounded-lg text-xs flex items-center justify-center transition-colors cursor-pointer ${isSelected
                      ? 'bg-neutral-900 text-white dark:bg-white dark:text-black font-bold shadow-xs'
                      : 'text-neutral-700 dark:text-neutral-300 hover:bg-black/[0.04] dark:hover:bg-white/[0.06]'
                    }`}
                >
                  {h}
                </button>
              );
            })}
          </div>
        </div>

        {/* Minutes Column */}
        <div className={`flex flex-col items-center ${isMobileView ? 'flex-1' : ''}`}>
          <span className="text-[10px] text-neutral-400 mb-1">Min</span>
          <div className="flex-1 overflow-y-auto space-y-1 w-full max-h-[175px] px-0.5">
            {MINUTES_LIST.map((m) => {
              const isSelected = m === currentMinutesStr;
              return (
                <button
                  key={m}
                  type="button"
                  onClick={() => handleSelectMinute(m)}
                  className={`w-full ${isMobileView ? 'h-8' : 'w-9 h-6.5'} rounded-lg text-xs flex items-center justify-center transition-colors cursor-pointer ${isSelected
                      ? 'bg-neutral-900 text-white dark:bg-white dark:text-black font-bold shadow-xs'
                      : 'text-neutral-700 dark:text-neutral-300 hover:bg-black/[0.04] dark:hover:bg-white/[0.06]'
                    }`}
                >
                  {m}
                </button>
              );
            })}
          </div>
        </div>

        {/* Period Column (AM / PM) */}
        <div className={`flex flex-col items-center ${isMobileView ? 'flex-1' : ''}`}>
          <span className="text-[10px] text-neutral-400 mb-1">Period</span>
          <div className="flex flex-col gap-1 w-full px-0.5">
            {(['AM', 'PM'] as const).map((p) => {
              const isSelected = (p === 'PM' && isPM) || (p === 'AM' && !isPM);
              return (
                <button
                  key={p}
                  type="button"
                  onClick={() => handleTogglePeriod(p)}
                  className={`w-full ${isMobileView ? 'h-9 text-xs' : 'w-9 h-6.5 text-[11px]'} rounded-lg flex items-center justify-center transition-colors cursor-pointer ${isSelected
                      ? 'bg-neutral-900 text-white dark:bg-white dark:text-black font-bold shadow-xs'
                      : 'text-neutral-700 dark:text-neutral-300 hover:bg-black/[0.04] dark:hover:bg-white/[0.06]'
                    }`}
                >
                  {p}
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <>
      <button
        ref={triggerRef}
        id={inputId}
        type="button"
        role="button"
        aria-expanded={isOpen}
        aria-label={ariaLabel}
        disabled={disabled}
        onClick={toggleOpen}
        className={`inline-flex items-center justify-between border select-none transition-all duration-150 outline-none h-8 px-2.5 text-xs font-medium rounded-xl gap-2 cursor-pointer ${disabled
            ? 'opacity-50 cursor-not-allowed bg-black/[0.02] dark:bg-white/[0.02] border-black/[0.05] dark:border-white/[0.06] text-neutral-400'
            : isOpen
              ? 'bg-black/[0.04] dark:bg-[#1e1e24] border-black/20 dark:border-white/30 ring-2 ring-[#007aff]/30 dark:ring-white/20 text-neutral-900 dark:text-white'
              : 'bg-black/[0.03] dark:bg-[#161619] hover:bg-black/[0.05] dark:hover:bg-[#1c1c20] border-black/[0.08] dark:border-white/[0.1] hover:border-black/[0.15] dark:hover:border-white/[0.18] text-neutral-800 dark:text-neutral-200'
          } ${className}`}
      >
        <span className="truncate font-medium">{displayString}</span>
        <CalendarIcon className="w-3.5 h-3.5 text-neutral-400 shrink-0 ml-1" />
      </button>

      {isOpen &&
        createPortal(
          isMobile ? (
            /* ========================================================================= */
            /* MOBILE VIEW: Bottom Sheet Modal with Backdrop                             */
            /* ========================================================================= */
            <div className="fixed inset-0 z-[99999] flex items-end justify-center bg-black/60 backdrop-blur-xs animate-fade-in">
              {/* Tap Backdrop to Dismiss */}
              <div className="absolute inset-0" onClick={() => setIsOpen(false)} />

              {/* Mobile Card Container */}
              <div
                ref={popoverRef}
                className="relative w-full bg-white dark:bg-[#18181b] rounded-t-3xl border-t border-black/[0.08] dark:border-white/[0.12] shadow-2xl p-4 max-h-[85vh] overflow-y-auto z-10 flex flex-col select-none"
              >
                {/* Drag Handle Indicator */}
                <div className="w-10 h-1 rounded-full bg-neutral-300 dark:bg-neutral-700 mx-auto mb-3" />

                {/* Mobile Header */}
                <div className="flex items-center justify-between pb-2.5 mb-2.5 border-b border-black/[0.06] dark:border-white/[0.08]">
                  <div>
                    <span className="text-[10px] font-semibold uppercase tracking-wider text-neutral-400 block">
                      {mode === 'date' ? 'Select Date' : 'Select Date & Time'}
                    </span>
                    <span className="text-xs sm:text-sm font-bold text-neutral-900 dark:text-white">
                      {displayString}
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setIsOpen(false)}
                    className="p-1.5 rounded-lg text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200 hover:bg-black/5 dark:hover:bg-white/5 cursor-pointer"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                {/* Mobile Tab Switcher (When in datetime mode) */}
                {mode === 'datetime' && (
                  <div className="flex p-1 bg-black/[0.04] dark:bg-white/[0.06] rounded-xl mb-3">
                    <button
                      type="button"
                      onClick={() => setMobileTab('date')}
                      className={`flex-1 py-1.5 text-xs font-semibold rounded-lg flex items-center justify-center gap-1.5 transition-all cursor-pointer ${mobileTab === 'date'
                          ? 'bg-white dark:bg-[#27272a] text-neutral-900 dark:text-white shadow-xs'
                          : 'text-neutral-500 hover:text-neutral-900 dark:hover:text-white'
                        }`}
                    >
                      <CalendarIcon className="w-3.5 h-3.5" />
                      <span>Date</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setMobileTab('time')}
                      className={`flex-1 py-1.5 text-xs font-semibold rounded-lg flex items-center justify-center gap-1.5 transition-all cursor-pointer ${mobileTab === 'time'
                          ? 'bg-white dark:bg-[#27272a] text-neutral-900 dark:text-white shadow-xs'
                          : 'text-neutral-500 hover:text-neutral-900 dark:hover:text-white'
                        }`}
                    >
                      <Clock className="w-3.5 h-3.5" />
                      <span>Time</span>
                    </button>
                  </div>
                )}

                {/* Content: Date or Time */}
                {mode === 'date' || mobileTab === 'date' ? (
                  renderCalendar(true)
                ) : (
                  renderTimeColumns(true)
                )}

                {/* Mobile Footer Actions */}
                <div className="flex items-center justify-between pt-3 border-t border-black/[0.06] dark:border-white/[0.08] text-xs mt-3">
                  <button
                    type="button"
                    onClick={handleSetToday}
                    className="px-3 py-1.5 rounded-lg text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white hover:bg-black/[0.04] dark:hover:bg-white/[0.06] font-medium transition-colors cursor-pointer"
                  >
                    {mode === 'date' ? 'Today' : 'Now'}
                  </button>

                  <button
                    type="button"
                    onClick={() => setIsOpen(false)}
                    className="px-4 py-1.5 rounded-xl bg-neutral-900 text-white dark:bg-white dark:text-black font-semibold hover:opacity-90 transition-opacity flex items-center gap-1 cursor-pointer shadow-xs"
                  >
                    <Check className="w-3.5 h-3.5 stroke-[2.5]" />
                    <span>Done</span>
                  </button>
                </div>
              </div>
            </div>
          ) : (
            /* ========================================================================= */
            /* DESKTOP VIEW: Anchored Floating Popover Menu                              */
            /* ========================================================================= */
            <div
              ref={popoverRef}
              style={{
                position: 'fixed',
                top: coords.placeAbove ? 'auto' : `${coords.top}px`,
                bottom: coords.placeAbove ? `${window.innerHeight - coords.top}px` : 'auto',
                left: `${coords.left}px`,
                zIndex: 99999,
              }}
              className="animate-fade-in p-3 rounded-2xl bg-white/98 dark:bg-[#18181b]/98 backdrop-blur-2xl border border-black/[0.08] dark:border-white/[0.12] shadow-2xl text-neutral-800 dark:text-neutral-200 select-none flex flex-col gap-2.5 max-w-[calc(100vw-24px)]"
            >
              <div className="flex gap-3">
                {renderCalendar(false)}
                {mode === 'datetime' && renderTimeColumns(false)}
              </div>

              {/* Desktop Popover Footer */}
              <div className="flex items-center justify-between pt-2 border-t border-black/[0.06] dark:border-white/[0.08] text-xs mt-1">
                <button
                  type="button"
                  onClick={handleSetToday}
                  className="px-2.5 py-1 rounded-lg text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white hover:bg-black/[0.04] dark:hover:bg-white/[0.06] font-medium transition-colors cursor-pointer"
                >
                  {mode === 'date' ? 'Today' : 'Now'}
                </button>

                <button
                  type="button"
                  onClick={() => setIsOpen(false)}
                  className="px-3 py-1 rounded-lg bg-neutral-900 text-white dark:bg-white dark:text-black font-semibold hover:opacity-90 transition-opacity flex items-center gap-1 cursor-pointer shadow-xs"
                >
                  <Check className="w-3.5 h-3.5 stroke-[2.5]" />
                  <span>Done</span>
                </button>
              </div>
            </div>
          ),
          document.body
        )}
    </>
  );
};
