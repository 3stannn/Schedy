import React, { useId } from 'react';
import { Check } from 'lucide-react';

export interface CustomCheckboxProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  label?: React.ReactNode;
  description?: string;
  disabled?: boolean;
  id?: string;
  className?: string;
  size?: 'sm' | 'md';
}

export const CustomCheckbox: React.FC<CustomCheckboxProps> = ({
  checked,
  onChange,
  label,
  description,
  disabled = false,
  id,
  className = '',
  size = 'md',
}) => {
  const generatedId = useId();
  const checkboxId = id || generatedId;

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (disabled) return;
    if (e.key === ' ' || e.key === 'Enter') {
      e.preventDefault();
      onChange(!checked);
    }
  };

  const boxSize = size === 'sm' ? 'w-4 h-4' : 'w-[18px] h-[18px]';
  const iconSize = size === 'sm' ? 'w-3 h-3' : 'w-3.5 h-3.5';

  return (
    <label
      htmlFor={checkboxId}
      className={`inline-flex items-start gap-2.5 select-none ${
        disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer group'
      } ${className}`}
    >
      <div className="relative flex items-center justify-center pt-0.5 shrink-0">
        <button
          id={checkboxId}
          type="button"
          role="checkbox"
          aria-checked={checked}
          disabled={disabled}
          tabIndex={disabled ? -1 : 0}
          onClick={(e) => {
            e.stopPropagation();
            if (!disabled) onChange(!checked);
          }}
          onKeyDown={handleKeyDown}
          className={`${boxSize} rounded-[4px] border flex items-center justify-center transition-all duration-150 outline-none focus-visible:ring-2 focus-visible:ring-[#007aff]/50 dark:focus-visible:ring-white/40 focus-visible:ring-offset-2 dark:focus-visible:ring-offset-neutral-900 active:scale-95 ${
            checked
              ? 'bg-neutral-900 border-neutral-900 text-white dark:bg-white dark:border-white dark:text-black shadow-xs'
              : 'border-neutral-400 dark:border-neutral-600 bg-transparent dark:bg-white/[0.04] hover:border-neutral-600 dark:hover:border-neutral-400 hover:bg-black/[0.02] dark:hover:bg-white/[0.08]'
          }`}
        >
          {checked && <Check className={`${iconSize} stroke-[3] stroke-current`} />}
        </button>
      </div>

      {(label || description) && (
        <div className="flex flex-col select-none pt-0.5">
          {label && (
            <span
              className={`text-xs font-medium leading-tight ${
                checked
                  ? 'text-neutral-900 dark:text-white'
                  : 'text-neutral-700 dark:text-neutral-300 group-hover:text-neutral-900 dark:group-hover:text-white'
              }`}
            >
              {label}
            </span>
          )}
          {description && (
            <span className="text-[11px] text-neutral-400 dark:text-neutral-400 leading-normal mt-0.5">
              {description}
            </span>
          )}
        </div>
      )}
    </label>
  );
};
