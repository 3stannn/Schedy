/**
 * Utility functions for Notion-style rich text note content and legacy markdown conversion.
 */

/**
 * Checks if a string contains HTML tags
 */
export function isHtmlContent(str: string): boolean {
  if (!str) return false;
  return /<[a-z][\s\S]*>/i.test(str);
}

/**
 * Strips HTML tags for search indexing and character counts
 */
export function stripHtml(html: string): string {
  if (!html) return '';
  return html
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Converts legacy raw markdown or plain text note content into clean, semantic Notion-style HTML
 */
export function convertMarkdownOrTextToHtml(raw: string): string {
  if (!raw) return '';

  // If already full HTML with paragraph/div/list tags, return as-is
  if (isHtmlContent(raw) && (/<(p|div|ul|ol|h[1-6]|blockquote|pre|table)/i.test(raw))) {
    return raw;
  }

  // Otherwise clean up legacy markdown / corrupted tokens (e.g., ****, *- [], etc.)
  const lines = raw.split('\n');
  const htmlBlocks: string[] = [];
  let currentListType: 'ul' | 'ol' | 'task' | null = null;
  let listItems: string[] = [];

  const flushList = () => {
    if (!currentListType || listItems.length === 0) return;
    if (currentListType === 'task') {
      htmlBlocks.push(`<ul class="notion-task-list">${listItems.join('')}</ul>`);
    } else if (currentListType === 'ul') {
      htmlBlocks.push(`<ul>${listItems.join('')}</ul>`);
    } else if (currentListType === 'ol') {
      htmlBlocks.push(`<ol>${listItems.join('')}</ol>`);
    }
    currentListType = null;
    listItems = [];
  };

  for (let line of lines) {
    let trimmed = line.trim();

    // Clean up corrupted dangling asterisks like '****' or '*- []'
    trimmed = trimmed.replace(/\*{3,}/g, '');
    trimmed = trimmed.replace(/^\*-\s*/, '- ');

    if (!trimmed) {
      flushList();
      continue;
    }

    // Checklist / Task item: - [ ] text or - [x] text or [ ] text or [x] text
    const taskMatch = /^(?:[-*•]\s*)?\[([ xX])\]\s*(.*)$/.exec(trimmed);
    if (taskMatch) {
      if (currentListType !== 'task') {
        flushList();
        currentListType = 'task';
      }
      const isChecked = taskMatch[1].toLowerCase() === 'x';
      const text = formatInlineMarkdown(taskMatch[2]);
      listItems.push(
        `<li class="notion-task-item ${isChecked ? 'is-done' : ''}"><input type="checkbox" class="notion-task-checkbox" ${isChecked ? 'checked' : ''} /><span class="notion-task-text">${text}</span></li>`
      );
      continue;
    }

    // Headings
    if (trimmed.startsWith('# ')) {
      flushList();
      htmlBlocks.push(`<h1>${formatInlineMarkdown(trimmed.slice(2))}</h1>`);
      continue;
    }
    if (trimmed.startsWith('## ')) {
      flushList();
      htmlBlocks.push(`<h2>${formatInlineMarkdown(trimmed.slice(3))}</h2>`);
      continue;
    }
    if (trimmed.startsWith('### ')) {
      flushList();
      htmlBlocks.push(`<h3>${formatInlineMarkdown(trimmed.slice(4))}</h3>`);
      continue;
    }

    // Blockquote
    if (trimmed.startsWith('> ')) {
      flushList();
      htmlBlocks.push(`<blockquote>${formatInlineMarkdown(trimmed.slice(2))}</blockquote>`);
      continue;
    }

    // Horizontal Rule
    if (/^(?:---|\*\*\*|___)$/.test(trimmed)) {
      flushList();
      htmlBlocks.push('<hr />');
      continue;
    }

    // Bullet List
    if (/^[-*•]\s+/.test(trimmed)) {
      if (currentListType !== 'ul') {
        flushList();
        currentListType = 'ul';
      }
      const text = formatInlineMarkdown(trimmed.replace(/^[-*•]\s+/, ''));
      listItems.push(`<li>${text}</li>`);
      continue;
    }

    // Numbered List
    const numMatch = /^(\d+)[.)]\s+(.*)$/.exec(trimmed);
    if (numMatch) {
      if (currentListType !== 'ol') {
        flushList();
        currentListType = 'ol';
      }
      const text = formatInlineMarkdown(numMatch[2]);
      listItems.push(`<li>${text}</li>`);
      continue;
    }

    // Regular paragraph
    flushList();
    htmlBlocks.push(`<p>${formatInlineMarkdown(trimmed)}</p>`);
  }

  flushList();
  return htmlBlocks.join('');
}

/**
 * Formats inline markdown tokens into HTML tags
 */
function formatInlineMarkdown(text: string): string {
  if (!text) return '';
  return text
    .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
    .replace(/__([^_]+)__/g, '<strong>$1</strong>')
    .replace(/~~([^~]+)~~/g, '<del>$1</del>')
    .replace(/==([^=]+)==/g, '<mark>$1</mark>')
    .replace(/`([^`]+)`/g, '<code>$1</code>')
    .replace(/\*([^*]+)\*/g, '<em>$1</em>')
    .replace(/_([^_]+)_/g, '<em>$1</em>')
    .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank" rel="noopener noreferrer">$1</a>');
}

/**
 * Converts rich HTML content (with Notion checklists, bullet lists, entities, and blocks) into clean, human-readable plain text
 */
export function htmlToPlainText(html: string): string {
  if (!html) return '';

  // If in browser environment, use DOMParser for 100% accurate conversion
  if (typeof DOMParser !== 'undefined') {
    try {
      const parser = new DOMParser();
      const doc = parser.parseFromString(html, 'text/html');

      const processNode = (node: Node): string => {
        if (node.nodeType === Node.TEXT_NODE) {
          return node.textContent || '';
        }

        if (node.nodeType !== Node.ELEMENT_NODE) {
          return '';
        }

        const el = node as HTMLElement;
        const tagName = el.tagName.toLowerCase();

        // 1. Task checklist item
        if (el.classList.contains('notion-task-item') || (el.closest('.notion-task-list') && tagName === 'li')) {
          const checkbox = el.querySelector('input[type="checkbox"]') as HTMLInputElement | null;
          const isChecked =
            el.classList.contains('is-done') ||
            el.getAttribute('data-checked') === 'true' ||
            Boolean(checkbox && (checkbox.checked || checkbox.hasAttribute('checked')));

          const textSpan = el.querySelector('.notion-task-text');
          const innerText = textSpan
            ? textSpan.textContent?.trim()
            : Array.from(el.childNodes)
                .filter(c => (c as HTMLElement).tagName?.toLowerCase() !== 'input')
                .map(c => c.textContent)
                .join('')
                .trim();

          return `[${isChecked ? 'x' : ' '}] ${innerText || ''}\n`;
        }

        // 2. Regular list item inside UL or OL
        if (tagName === 'li') {
          const parentTag = el.parentElement?.tagName.toLowerCase();
          const prefix =
            parentTag === 'ol'
              ? `${Array.from(el.parentElement?.children || []).indexOf(el) + 1}. `
              : '• ';

          const innerContent = Array.from(el.childNodes)
            .map(c => processNode(c))
            .join('')
            .trim();
          return `${prefix}${innerContent}\n`;
        }

        // 3. Line break
        if (tagName === 'br') {
          return '\n';
        }

        // 4. Horizontal rule
        if (tagName === 'hr') {
          return '\n---\n';
        }

        // 5. Blockquote
        if (tagName === 'blockquote') {
          const inner = Array.from(el.childNodes)
            .map(c => processNode(c))
            .join('')
            .trim();
          return inner ? `> ${inner.split('\n').join('\n> ')}\n` : '';
        }

        // 6. Headers
        if (/^h[1-6]$/.test(tagName)) {
          const inner = Array.from(el.childNodes)
            .map(c => processNode(c))
            .join('')
            .trim();
          return inner ? `${inner}\n` : '';
        }

        // 7. Paragraphs & Divs
        if (tagName === 'p' || tagName === 'div') {
          const inner = Array.from(el.childNodes)
            .map(c => processNode(c))
            .join('')
            .trim();
          return inner ? `${inner}\n` : '\n';
        }

        // 8. Lists container (ul, ol)
        if (tagName === 'ul' || tagName === 'ol') {
          const inner = Array.from(el.childNodes)
            .map(c => processNode(c))
            .join('');
          return inner ? `${inner}\n` : '';
        }

        // Default: process all children
        return Array.from(el.childNodes)
          .map(c => processNode(c))
          .join('');
      };

      const result = Array.from(doc.body.childNodes)
        .map(node => processNode(node))
        .join('');

      return result
        .split('\n')
        .map(l => l.trimEnd())
        .join('\n')
        .replace(/\n{3,}/g, '\n\n')
        .trim();
    } catch {
      // fallback to regex
    }
  }

  // Fallback regex converter for non-DOM environments
  let text = html;

  // Replace task items
  text = text.replace(
    /<li[^>]*class="[^"]*notion-task-item[^"]*is-done[^"]*"[^>]*>[\s\S]*?<input[^>]*>[\s\S]*?<span[^>]*class="notion-task-text"[^>]*>([\s\S]*?)<\/span>[\s\S]*?<\/li>/gi,
    '[x] $1\n'
  );
  text = text.replace(
    /<li[^>]*class="[^"]*notion-task-item[^"]*"[^>]*>[\s\S]*?<input[^>]*checked[^>]*>[\s\S]*?<span[^>]*class="notion-task-text"[^>]*>([\s\S]*?)<\/span>[\s\S]*?<\/li>/gi,
    '[x] $1\n'
  );
  text = text.replace(
    /<li[^>]*class="[^"]*notion-task-item[^"]*"[^>]*>[\s\S]*?<input[^>]*>[\s\S]*?<span[^>]*class="notion-task-text"[^>]*>([\s\S]*?)<\/span>[\s\S]*?<\/li>/gi,
    '[ ] $1\n'
  );

  // Replace standard list items
  text = text.replace(/<li[^>]*>([\s\S]*?)<\/li>/gi, '• $1\n');

  // Replace headers, paragraphs, divs, brs
  text = text.replace(/<br\s*\/?>/gi, '\n');
  text = text.replace(/<\/p>/gi, '\n');
  text = text.replace(/<\/div>/gi, '\n');
  text = text.replace(/<\/h[1-6]>/gi, '\n');
  text = text.replace(/<blockquote[^>]*>([\s\S]*?)<\/blockquote>/gi, '> $1\n');

  // Strip all remaining HTML tags
  text = text.replace(/<[^>]+>/g, '');

  // Decode HTML entities
  text = text
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/&quot;/gi, '"')
    .replace(/&#39;|&apos;/gi, "'")
    .replace(/&ndash;/gi, '–')
    .replace(/&mdash;/gi, '—');

  return text
    .split('\n')
    .map(line => line.trimEnd())
    .join('\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}
