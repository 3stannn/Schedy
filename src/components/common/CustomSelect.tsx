import React, { useState, useRef, useEffect, useId, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { ChevronDown, Check } from 'lucide-react';

export interface SelectOption {
  value: string;
  label: string;
  icon?: React.ReactNode;
  badge?: string;
  disabled?: boolean;
}

export interface CustomSelectProps {
  value: string;
  onChange: (value: string) => void;
  options: SelectOption[];
  placeholder?: string;
  size?: 'sm' | 'md';
  className?: string;
  menuClassName?: string;
  disabled?: boolean;
  ariaLabel?: string;
  id?: string;
}

export const CustomSelect: React.FC<CustomSelectProps> = ({
  value,
  onChange,
  options,
  placeholder = 'Select option...',
  size = 'md',
  className = '',
  menuClassName = '',
  disabled = false,
  ariaLabel,
  id,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState<number>(-1);
  const [menuCoords, setMenuCoords] = useState<{ top: number; left: number; width: number; placeAbove: boolean }>({
    top: 0,
    left: 0,
    width: 0,
    placeAbove: false,
  });

  const triggerRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const generatedId = useId();
  const selectId = id || generatedId;

  const selectedOption = options.find((opt) => opt.value === value);

  // Position calculation for floating popover menu
  const updatePosition = useCallback(() => {
    if (!triggerRef.current) return;
    const rect = triggerRef.current.getBoundingClientRect();
    const spaceBelow = window.innerHeight - rect.bottom;
    const estimatedMenuHeight = Math.min(options.length * 36 + 16, 260);
    const placeAbove = spaceBelow < estimatedMenuHeight && rect.top > estimatedMenuHeight;

    setMenuCoords({
      top: placeAbove ? rect.top - 6 : rect.bottom + 6,
      left: rect.left,
      width: Math.max(rect.width, 140),
      placeAbove,
    });
  }, [options.length]);

  const toggleOpen = () => {
    if (disabled) return;
    if (!isOpen) {
      updatePosition();
      const currentIndex = options.findIndex((opt) => opt.value === value);
      setHighlightedIndex(currentIndex >= 0 ? currentIndex : 0);
      setIsOpen(true);
    } else {
      setIsOpen(false);
    }
  };

  // Close on click outside
  useEffect(() => {
    if (!isOpen) return;

    const handlePointerDown = (e: MouseEvent | TouchEvent) => {
      const target = e.target as Node;
      if (
        triggerRef.current &&
        !triggerRef.current.contains(target) &&
        menuRef.current &&
        !menuRef.current.contains(target)
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
  }, [isOpen, updatePosition]);

  // Keyboard navigation
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (disabled) return;

    if (!isOpen) {
      if (e.key === 'ArrowDown' || e.key === 'ArrowUp' || e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        toggleOpen();
      }
      return;
    }

    if (e.key === 'Escape') {
      e.preventDefault();
      setIsOpen(false);
      triggerRef.current?.focus();
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      setHighlightedIndex((prev) => {
        let next = prev + 1;
        while (next < options.length && options[next].disabled) {
          next++;
        }
        return next < options.length ? next : prev;
      });
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setHighlightedIndex((prev) => {
        let next = prev - 1;
        while (next >= 0 && options[next].disabled) {
          next--;
        }
        return next >= 0 ? next : prev;
      });
    } else if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      if (highlightedIndex >= 0 && highlightedIndex < options.length) {
        const option = options[highlightedIndex];
        if (!option.disabled) {
          onChange(option.value);
          setIsOpen(false);
          triggerRef.current?.focus();
        }
      }
    } else if (e.key === 'Tab') {
      setIsOpen(false);
    }
  };

  const handleSelect = (val: string, optionDisabled?: boolean) => {
    if (optionDisabled) return;
    onChange(val);
    setIsOpen(false);
    triggerRef.current?.focus();
  };

  const sizeClasses =
    size === 'sm'
      ? 'h-8 px-2.5 text-xs rounded-xl gap-1.5'
      : 'h-9 sm:h-9.5 px-3 text-xs sm:text-[13px] rounded-xl gap-2';

  return (
    <>
      <button
        ref={triggerRef}
        id={selectId}
        type="button"
        role="combobox"
        aria-expanded={isOpen}
        aria-haspopup="listbox"
        aria-label={ariaLabel}
        disabled={disabled}
        onClick={toggleOpen}
        onKeyDown={handleKeyDown}
        className={`inline-flex items-center justify-between border select-none transition-all duration-150 outline-none text-left ${sizeClasses} ${
          disabled
            ? 'opacity-50 cursor-not-allowed bg-black/[0.02] dark:bg-white/[0.02] border-black/[0.05] dark:border-white/[0.06] text-neutral-400'
            : isOpen
            ? 'bg-black/[0.04] dark:bg-[#1e1e24] border-black/20 dark:border-white/30 ring-2 ring-[#007aff]/30 dark:ring-white/20 text-neutral-900 dark:text-white'
            : 'bg-black/[0.03] dark:bg-[#161619] hover:bg-black/[0.05] dark:hover:bg-[#1c1c20] border-black/[0.08] dark:border-white/[0.1] hover:border-black/[0.15] dark:hover:border-white/[0.18] text-neutral-800 dark:text-neutral-200'
        } ${className}`}
      >
        <span className="truncate flex items-center gap-1.5 flex-1 min-w-0 font-medium">
          {selectedOption?.icon && <span className="shrink-0">{selectedOption.icon}</span>}
          <span className="truncate">{selectedOption ? selectedOption.label : placeholder}</span>
        </span>
        <ChevronDown
          className={`w-3.5 h-3.5 text-neutral-400 dark:text-neutral-400 shrink-0 ml-1 transition-transform duration-200 ${
            isOpen ? 'rotate-180 text-neutral-900 dark:text-white' : ''
          }`}
        />
      </button>

      {isOpen &&
        createPortal(
          <div
            ref={menuRef}
            role="listbox"
            aria-labelledby={selectId}
            style={{
              position: 'fixed',
              top: menuCoords.placeAbove ? 'auto' : `${menuCoords.top}px`,
              bottom: menuCoords.placeAbove ? `${window.innerHeight - menuCoords.top}px` : 'auto',
              left: `${menuCoords.left}px`,
              minWidth: `${menuCoords.width}px`,
              maxWidth: 'calc(100vw - 24px)',
              zIndex: 99999,
            }}
            className={`animate-fade-in max-h-64 overflow-y-auto p-1 rounded-xl bg-white/95 dark:bg-[#18181b]/95 backdrop-blur-2xl border border-black/[0.08] dark:border-white/[0.12] shadow-xl dark:shadow-2xl text-neutral-800 dark:text-neutral-200 focus:outline-none ${menuClassName}`}
          >
            {options.map((option, idx) => {
              const isSelected = option.value === value;
              const isHighlighted = idx === highlightedIndex;

              return (
                <div
                  key={option.value}
                  role="option"
                  aria-selected={isSelected}
                  onMouseEnter={() => !option.disabled && setHighlightedIndex(idx)}
                  onClick={() => handleSelect(option.value, option.disabled)}
                  className={`flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs font-medium cursor-pointer transition-colors duration-100 select-none ${
                    option.disabled
                      ? 'opacity-40 cursor-not-allowed text-neutral-400'
                      : isSelected
                      ? 'bg-black/[0.06] dark:bg-white/[0.12] text-neutral-900 dark:text-white font-semibold'
                      : isHighlighted
                      ? 'bg-black/[0.03] dark:bg-white/[0.06] text-neutral-900 dark:text-white'
                      : 'text-neutral-700 dark:text-neutral-300 hover:bg-black/[0.03] dark:hover:bg-white/[0.06]'
                  }`}
                >
                  <div className="flex items-center gap-2 min-w-0 truncate">
                    {option.icon && <span className="shrink-0">{option.icon}</span>}
                    <span className="truncate">{option.label}</span>
                    {option.badge && (
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-black/[0.05] dark:bg-white/[0.08] text-neutral-500 shrink-0">
                        {option.badge}
                      </span>
                    )}
                  </div>
                  {isSelected && (
                    <Check className="w-3.5 h-3.5 ml-2 text-neutral-900 dark:text-white shrink-0 stroke-[2.5]" />
                  )}
                </div>
              );
            })}
          </div>,
          document.body
        )}
    </>
  );
};
