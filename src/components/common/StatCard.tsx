import React from 'react';

interface StatCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: React.ReactNode;
  trend?: string;
  colorClass?: string;
  onClick?: () => void;
}

export const StatCard: React.FC<StatCardProps> = ({
  title,
  value,
  subtitle,
  icon,
  onClick,
}) => {
  return (
    <div
      onClick={onClick}
      className={`ios-card p-4 rounded-[20px] transition-all text-neutral-900 dark:text-neutral-100 ${
        onClick ? 'cursor-pointer hover:border-[#007aff]/30 active:scale-[0.98]' : ''
      }`}
    >
      <div className="flex items-center justify-between text-xs text-neutral-400">
        <span className="font-semibold uppercase tracking-wider text-[10px] text-neutral-400 dark:text-neutral-500">
          {title}
        </span>
        <div className="w-8 h-8 rounded-[12px] bg-black/[0.04] dark:bg-white/[0.08] flex items-center justify-center text-neutral-600 dark:text-neutral-300">
          {icon}
        </div>
      </div>
      <div className="mt-2 flex items-baseline gap-2">
        <span className="text-2xl sm:text-3xl font-bold tracking-tight text-neutral-900 dark:text-white font-mono">
          {value}
        </span>
        {subtitle && (
          <span className="text-[11px] text-neutral-400 font-medium truncate">
            {subtitle}
          </span>
        )}
      </div>
    </div>
  );
};
