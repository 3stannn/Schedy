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

  const handleClick = (e: React.MouseEvent<HTMLDivElement>) => {
    const target = e.target as HTMLElement;
    const anchor = target.closest('a');
    if (anchor) {
      // Prevent bubbling to parent note cards or event containers
      e.stopPropagation();
      if (!anchor.getAttribute('target')) {
        anchor.setAttribute('target', '_blank');
      }
      if (!anchor.getAttribute('rel')) {
        anchor.setAttribute('rel', 'noopener noreferrer');
      }
    }
  };

  if (!htmlContent) return null;

  if (isCompact) {
    return (
      <div
        onClick={handleClick}
        className={`notion-rendered-content text-[11px] leading-relaxed line-clamp-3 overflow-hidden ${className}`}
        dangerouslySetInnerHTML={{ __html: htmlContent }}
      />
    );
  }

  return (
    <div
      onClick={handleClick}
      className={`notion-rendered-content text-xs sm:text-sm leading-relaxed ${className}`}
      dangerouslySetInnerHTML={{ __html: htmlContent }}
    />
  );
};
