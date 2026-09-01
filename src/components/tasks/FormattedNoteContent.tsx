import React, { useMemo } from 'react';
import { convertMarkdownOrTextToHtml } from './noteFormattingUtils';

interface FormattedNoteContentProps {
  content: string;
  isCompact?: boolean;
  className?: string;
  onToggleTask?: (taskIndex: number, isChecked: boolean) => void;
}

export const FormattedNoteContent: React.FC<FormattedNoteContentProps> = ({
  content,
  isCompact = false,
  className = '',
}) => {
  const htmlContent = useMemo(() => {
    if (!content) return '';
    return convertMarkdownOrTextToHtml(content);
  }, [content]);

  if (!htmlContent) return null;

  if (isCompact) {
    return (
      <div
        className={`notion-rendered-content text-[11px] leading-relaxed line-clamp-3 overflow-hidden ${className}`}
        dangerouslySetInnerHTML={{ __html: htmlContent }}
      />
    );
  }

  return (
    <div
      className={`notion-rendered-content text-xs sm:text-sm leading-relaxed ${className}`}
      dangerouslySetInnerHTML={{ __html: htmlContent }}
    />
  );
};
