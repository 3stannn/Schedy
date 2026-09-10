import React from 'react';

export type StatCardVariant = 'default' | 'urgent' | 'highlight' | 'compact';

interface StatCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon?: React.ReactNode;
  trend?: string;
  colorClass?: string;
  variant?: StatCardVariant;
  className?: string;
  onClick?: () => void;
}

export const StatCard: React.FC<StatCardProps> = ({
  title,
  value,
  subtitle,
  icon,
  variant = 'default',
  className = '',
  onClick,
}) => {
  const isUrgent = variant === 'urgent';
  const isHighlight = variant === 'highlight';
  const isCompact = variant === 'compact';

  const variantStyles = isUrgent
    ? 'border-red-500/30 dark:border-red-500/30 bg-red-500/[0.02] dark:bg-red-500/[0.03]'
    : isHighlight
    ? 'border-[#007aff]/30 dark:border-[#0a84ff]/30 bg-[#007aff]/[0.02] dark:bg-[#0a84ff]/[0.03]'
    : '';

  return (
    <div
      onClick={onClick}
      className={`ios-card ${isCompact ? 'p-3 sm:p-3.5' : 'p-4'} rounded-2xl transition-all text-neutral-900 dark:text-neutral-100 ${variantStyles} ${
        onClick ? 'cursor-pointer hover:border-[#007aff]/40 active:scale-[0.98]' : ''
      } ${className}`}
    >
      <div className="flex items-center justify-between text-xs">
        <span
          className={`font-semibold uppercase tracking-wider text-[10px] ${
            isUrgent
              ? 'text-red-600 dark:text-red-400'
              : isHighlight
              ? 'text-[#007aff] dark:text-[#0a84ff]'
              : 'text-neutral-400 dark:text-neutral-500'
          }`}
        >
          {title}
        </span>
        {icon && (
          <span
            className={`opacity-70 ${
              isUrgent
                ? 'text-red-500'
                : isHighlight
                ? 'text-[#007aff]'
                : 'text-neutral-400 dark:text-neutral-400'
            }`}
          >
            {icon}
          </span>
        )}
      </div>
      <div className="mt-2 flex items-baseline gap-2">
        <span
          className={`${
            isCompact ? 'text-xl sm:text-2xl' : 'text-2xl sm:text-3xl'
          } font-bold tracking-tight font-mono ${
            isUrgent && Number(value) > 0
              ? 'text-red-600 dark:text-red-400'
              : 'text-neutral-900 dark:text-white'
          }`}
        >
          {value}
        </span>
        {subtitle && (
          <span className="text-[11px] text-neutral-400 dark:text-neutral-500 font-medium truncate">
            {subtitle}
          </span>
        )}
      </div>
    </div>
  );
};

