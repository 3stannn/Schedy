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
      className={`p-4 rounded-2xl border border-neutral-200/80 dark:border-neutral-800/80 bg-white/80 dark:bg-[#161619]/80 backdrop-blur-md shadow-[0_2px_10px_-4px_rgba(0,0,0,0.04)] dark:shadow-[0_4px_20px_-4px_rgba(0,0,0,0.4)] hover:border-neutral-300 dark:hover:border-neutral-700 hover:-translate-y-0.5 transition-all text-[#1c1917] dark:text-[#f4f4f5] ${
        onClick ? 'cursor-pointer active:scale-[0.98]' : ''
      }`}
    >
      <div className="flex items-center justify-between text-xs text-neutral-400">
        <span className="font-semibold uppercase tracking-wider text-[10px] text-neutral-400 dark:text-neutral-500">
          {title}
        </span>
        <div className="w-7 h-7 rounded-xl bg-neutral-100 dark:bg-neutral-800/80 border border-neutral-200/50 dark:border-neutral-700/50 flex items-center justify-center text-neutral-600 dark:text-neutral-300 shadow-xs">
          {icon}
        </div>
      </div>
      <div className="mt-2 flex items-baseline gap-2">
        <span className="text-2xl font-bold tracking-tight text-[#1c1917] dark:text-white font-mono">
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
