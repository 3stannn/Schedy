import React, { useRef, useEffect, useState, useCallback } from 'react';
import {
  Bold,
  Italic,
  Underline,
  Strikethrough,
  Highlighter,
  Heading1,
  Heading2,
  Heading3,
  List,
  ListOrdered,
  CheckSquare,
  Quote,
  Code,
  Link as LinkIcon,
  Minus,
  Sparkles,
  HelpCircle,
  X,
  Check
} from 'lucide-react';
import { convertMarkdownOrTextToHtml } from './noteFormattingUtils';

interface RichTextEditorProps {
  initialHtml: string;
  onChange: (html: string) => void;
  placeholder?: string;
  className?: string;
}

export const RichTextEditor: React.FC<RichTextEditorProps> = ({
  initialHtml,
  onChange,
  placeholder = 'Type something, or use the formatting tools above...',
  className = '',
}) => {
  const editorRef = useRef<HTMLDivElement | null>(null);

  // Active toolbar formatting states
  const [isBold, setIsBold] = useState(false);
  const [isItalic, setIsItalic] = useState(false);
  const [isUnderline, setIsUnderline] = useState(false);
  const [isStrike, setIsStrike] = useState(false);
  const [isHighlight, setIsHighlight] = useState(false);
  const [activeBlock, setActiveBlock] = useState<string>('p');

  // Popups & Dropdowns
  const [showTemplates, setShowTemplates] = useState(false);
  const [showCheatsheet, setShowCheatsheet] = useState(false);
  const [showLinkModal, setShowLinkModal] = useState(false);
  const [linkUrl, setLinkUrl] = useState('');
  const [linkText, setLinkText] = useState('');
  const savedSelectionRef = useRef<Range | null>(null);

  const lastHtmlRef = useRef<string>('');
  const isInitializedRef = useRef<boolean>(false);

  // Initialize editor HTML only once on mount or when external initialHtml changes (not from user typing)
  useEffect(() => {
    if (!editorRef.current) return;

    // Only set innerHTML if not initialized yet or if changed from outside while not actively focused/typing
    if (!isInitializedRef.current || (initialHtml !== lastHtmlRef.current && document.activeElement !== editorRef.current)) {
      const formattedHtml = convertMarkdownOrTextToHtml(initialHtml);
      editorRef.current.innerHTML = formattedHtml;
      lastHtmlRef.current = initialHtml;
      isInitializedRef.current = true;
    }
  }, [initialHtml]);

  // Update active state of toolbar based on caret position / selection
  const updateToolbarState = useCallback(() => {
    try {
      setIsBold(document.queryCommandState('bold'));
      setIsItalic(document.queryCommandState('italic'));
      setIsUnderline(document.queryCommandState('underline'));
      setIsStrike(document.queryCommandState('strikeThrough'));

      const selection = window.getSelection();
      if (!selection || selection.rangeCount === 0) return;

      const node = selection.anchorNode;
      if (!node) return;

      const parentEl = node.nodeType === Node.ELEMENT_NODE ? (node as HTMLElement) : node.parentElement;
      if (parentEl) {
        // Highlight check
        const inMark = !!parentEl.closest('mark');
        setIsHighlight(inMark);

        // Block type check
        if (parentEl.closest('.notion-task-list')) {
          setActiveBlock('task');
        } else if (parentEl.closest('h1')) {
          setActiveBlock('h1');
        } else if (parentEl.closest('h2')) {
          setActiveBlock('h2');
        } else if (parentEl.closest('h3')) {
          setActiveBlock('h3');
        } else if (parentEl.closest('blockquote')) {
          setActiveBlock('quote');
        } else if (parentEl.closest('ul')) {
          setActiveBlock('ul');
        } else if (parentEl.closest('ol')) {
          setActiveBlock('ol');
        } else if (parentEl.closest('pre') || parentEl.closest('code')) {
          setActiveBlock('code');
        } else {
          setActiveBlock('p');
        }
      }
    } catch {
      // Ignored
    }
  }, []);

  const handleInput = () => {
    if (!editorRef.current) return;
    const html = editorRef.current.innerHTML;
    lastHtmlRef.current = html;
    onChange(html);
    updateToolbarState();
  };

  // Execute standard formatting commands
  const execCmd = (command: string, value: string | undefined = undefined) => {
    if (!editorRef.current) return;
    editorRef.current.focus();
    document.execCommand(command, false, value);
    handleInput();
  };

  // Toggle Highlight (<mark>)
  const toggleHighlight = () => {
    if (!editorRef.current) return;
    editorRef.current.focus();
    const selection = window.getSelection();
    if (!selection || selection.rangeCount === 0) return;

    const range = selection.getRangeAt(0);
    const selectedContent = range.extractContents();

    const parentMark = selection.anchorNode?.parentElement?.closest('mark');
    if (parentMark) {
      // Remove mark
      const text = parentMark.textContent || '';
      const textNode = document.createTextNode(text);
      parentMark.parentNode?.replaceChild(textNode, parentMark);
    } else {
      // Add mark
      const mark = document.createElement('mark');
      mark.appendChild(selectedContent);
      range.insertNode(mark);
      selection.selectAllChildren(mark);
    }
    handleInput();
  };

  // Toggle Block Format (H1, H2, H3, Quote, Paragraph)
  const setBlockType = (type: 'h1' | 'h2' | 'h3' | 'blockquote' | 'p' | 'pre') => {
    if (!editorRef.current) return;
    editorRef.current.focus();

    if (activeBlock === type) {
      document.execCommand('formatBlock', false, '<p>');
    } else {
      document.execCommand('formatBlock', false, `<${type}>`);
    }
    handleInput();
  };

  // Toggle or Insert Notion-style Checklist
  const toggleChecklist = () => {
    if (!editorRef.current) return;
    editorRef.current.focus();

    const selection = window.getSelection();
    if (!selection || selection.rangeCount === 0) return;

    const range = selection.getRangeAt(0);
    const selectedText = range.toString().trim() || 'New task item';

    const taskHtml = `<ul class="notion-task-list"><li class="notion-task-item"><input type="checkbox" class="notion-task-checkbox" /><span class="notion-task-text">${selectedText}</span></li></ul>`;
    document.execCommand('insertHTML', false, taskHtml);
    handleInput();
  };

  // Toggle Inline Code
  const toggleInlineCode = () => {
    if (!editorRef.current) return;
    editorRef.current.focus();
    const selection = window.getSelection();
    if (!selection || selection.rangeCount === 0) return;

    const range = selection.getRangeAt(0);
    const selectedText = range.toString() || 'code';
    const codeHtml = `<code>${selectedText}</code>`;
    document.execCommand('insertHTML', false, codeHtml);
    handleInput();
  };

  // Insert Quick Template
  const insertTemplate = (type: 'checklist' | 'meeting' | 'project') => {
    if (!editorRef.current) return;
    editorRef.current.focus();

    let templateHtml = '';
    if (type === 'checklist') {
      templateHtml = `<h3>📋 To-Do Checklist</h3><ul class="notion-task-list"><li class="notion-task-item"><input type="checkbox" class="notion-task-checkbox" /><span class="notion-task-text">First action item</span></li><li class="notion-task-item"><input type="checkbox" class="notion-task-checkbox" /><span class="notion-task-text">Second action item</span></li><li class="notion-task-item"><input type="checkbox" class="notion-task-checkbox" /><span class="notion-task-text">Third action item</span></li></ul><p></p>`;
    } else if (type === 'meeting') {
      templateHtml = `<h2>📝 Meeting Notes</h2><p><strong>Date:</strong> ${new Date().toLocaleDateString()}</p><p><strong>Attendees:</strong> </p><h3>Key Discussion Points</h3><ul><li>Topic 1</li><li>Topic 2</li></ul><h3>Action Items</h3><ul class="notion-task-list"><li class="notion-task-item"><input type="checkbox" class="notion-task-checkbox" /><span class="notion-task-text">Follow up task</span></li></ul><p></p>`;
    } else if (type === 'project') {
      templateHtml = `<h2>🚀 Project Scratchpad</h2><blockquote><strong>Goal:</strong> High impact outcome</blockquote><h3>Milestones</h3><ul class="notion-task-list"><li class="notion-task-item"><input type="checkbox" class="notion-task-checkbox" /><span class="notion-task-text">Phase 1: Planning</span></li><li class="notion-task-item"><input type="checkbox" class="notion-task-checkbox" /><span class="notion-task-text">Phase 2: Execution</span></li><li class="notion-task-item"><input type="checkbox" class="notion-task-checkbox" /><span class="notion-task-text">Phase 3: Launch</span></li></ul><p></p>`;
    }

    document.execCommand('insertHTML', false, templateHtml);
    handleInput();
  };

  // Open Link Modal
  const openLinkModal = () => {
    const selection = window.getSelection();
    if (selection && selection.rangeCount > 0) {
      savedSelectionRef.current = selection.getRangeAt(0).cloneRange();
      const text = selection.toString();
      setLinkText(text || '');
    }
    setLinkUrl('');
    setShowLinkModal(true);
  };

  // Save Link
  const handleSaveLink = () => {
    if (!linkUrl.trim()) {
      setShowLinkModal(false);
      return;
    }
    if (!editorRef.current) return;
    editorRef.current.focus();

    if (savedSelectionRef.current) {
      const sel = window.getSelection();
      sel?.removeAllRanges();
      sel?.addRange(savedSelectionRef.current);
    }

    const title = linkText.trim() || linkUrl.trim();
    const url = /^https?:\/\//i.test(linkUrl.trim()) ? linkUrl.trim() : `https://${linkUrl.trim()}`;
    const linkHtml = `<a href="${url}" target="_blank" rel="noopener noreferrer">${title}</a>`;
    document.execCommand('insertHTML', false, linkHtml);
    setShowLinkModal(false);
    handleInput();
  };

  // Handle Checklist click directly inside editor
  const handleEditorClick = (e: React.MouseEvent<HTMLDivElement>) => {
    const target = e.target as HTMLElement;
    if (target && target.matches('input[type="checkbox"].notion-task-checkbox')) {
      const checkbox = target as HTMLInputElement;
      const taskItem = checkbox.closest('.notion-task-item');
      if (taskItem) {
        if (checkbox.checked) {
          taskItem.classList.add('is-done');
          checkbox.setAttribute('checked', 'checked');
        } else {
          taskItem.classList.remove('is-done');
          checkbox.removeAttribute('checked');
        }
        handleInput();
      }
    }
    updateToolbarState();
  };

  // Keyboard Shortcuts & Smart Enter handling
  const handleKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    // Ctrl+B, Ctrl+I, Ctrl+U, Ctrl+K
    if ((e.ctrlKey || e.metaKey) && !e.altKey) {
      const key = e.key.toLowerCase();
      if (key === 'b') {
        e.preventDefault();
        execCmd('bold');
        return;
      }
      if (key === 'i') {
        e.preventDefault();
        execCmd('italic');
        return;
      }
      if (key === 'u') {
        e.preventDefault();
        execCmd('underline');
        return;
      }
      if (key === 'k') {
        e.preventDefault();
        openLinkModal();
        return;
      }
    }

    // Tab key handling
    if (e.key === 'Tab') {
      e.preventDefault();
      document.execCommand('insertHTML', false, '&nbsp;&nbsp;&nbsp;&nbsp;');
      handleInput();
      return;
    }

    // Enter key in a task item
    if (e.key === 'Enter') {
      const selection = window.getSelection();
      if (!selection || selection.rangeCount === 0) return;

      const node = selection.anchorNode;
      const currentTaskItem = node?.parentElement?.closest('.notion-task-item');

      if (currentTaskItem) {
        const textSpan = currentTaskItem.querySelector('.notion-task-text');
        const text = textSpan?.textContent?.trim() || '';

        // If user pressed enter on an empty task item, convert it to a regular paragraph
        if (!text) {
          e.preventDefault();
          const taskList = currentTaskItem.closest('.notion-task-list');
          currentTaskItem.remove();
          if (taskList && taskList.children.length === 0) {
            taskList.remove();
          }
          document.execCommand('insertHTML', false, '<p><br></p>');
          handleInput();
          return;
        }

        // Create new task item on next line
        e.preventDefault();
        const newTaskHtml = `<li class="notion-task-item"><input type="checkbox" class="notion-task-checkbox" /><span class="notion-task-text">&nbsp;</span></li>`;
        currentTaskItem.insertAdjacentHTML('afterend', newTaskHtml);

        // Move focus/caret to new task item text
        const nextItem = currentTaskItem.nextElementSibling;
        if (nextItem) {
          const nextTextSpan = nextItem.querySelector('.notion-task-text');
          if (nextTextSpan) {
            const range = document.createRange();
            range.selectNodeContents(nextTextSpan);
            range.collapse(false);
            selection.removeAllRanges();
            selection.addRange(range);
          }
        }
        handleInput();
        return;
      }
    }
  };

  const btnClass = (isActive: boolean) =>
    `p-1.5 rounded-lg transition-all text-xs font-medium flex items-center justify-center ${isActive
      ? 'bg-[#2383e2]/15 text-[#2383e2] dark:bg-[#2383e2]/25 dark:text-sky-300 font-bold shadow-2xs'
      : 'text-neutral-600 dark:text-neutral-300 hover:text-neutral-900 dark:hover:text-white hover:bg-neutral-200/60 dark:hover:bg-neutral-800'
    }`;

  return (
    <div className={`flex flex-col h-full ${className}`}>
      {/* Notion Style Top Toolbar */}
      <div className="border border-neutral-200/80 dark:border-neutral-800/80 bg-neutral-50/90 dark:bg-neutral-900/80 rounded-xl p-1 mb-2.5 flex items-center justify-between gap-1 flex-wrap text-xs select-none shrink-0 shadow-2xs">
        <div className="flex items-center gap-0.5 flex-wrap">
          {/* Bold */}
          <button
            type="button"
            onClick={() => execCmd('bold')}
            className={btnClass(isBold)}
            title="Bold (Ctrl+B)"
          >
            <Bold className="w-3.5 h-3.5" />
          </button>

          {/* Italic */}
          <button
            type="button"
            onClick={() => execCmd('italic')}
            className={btnClass(isItalic)}
            title="Italic (Ctrl+I)"
          >
            <Italic className="w-3.5 h-3.5" />
          </button>

          {/* Underline */}
          <button
            type="button"
            onClick={() => execCmd('underline')}
            className={btnClass(isUnderline)}
            title="Underline (Ctrl+U)"
          >
            <Underline className="w-3.5 h-3.5" />
          </button>

          {/* Strikethrough */}
          <button
            type="button"
            onClick={() => execCmd('strikeThrough')}
            className={btnClass(isStrike)}
            title="Strikethrough"
          >
            <Strikethrough className="w-3.5 h-3.5" />
          </button>

          {/* Highlight */}
          <button
            type="button"
            onClick={toggleHighlight}
            className={btnClass(isHighlight)}
            title="Highlight Text"
          >
            <Highlighter className="w-3.5 h-3.5 text-amber-500 dark:text-amber-400" />
          </button>

          <div className="h-4 w-px bg-neutral-200 dark:bg-neutral-800 mx-1" />

          {/* Headings */}
          <button
            type="button"
            onClick={() => setBlockType('h1')}
            className={btnClass(activeBlock === 'h1')}
            title="Heading 1"
          >
            <Heading1 className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            onClick={() => setBlockType('h2')}
            className={btnClass(activeBlock === 'h2')}
            title="Heading 2"
          >
            <Heading2 className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            onClick={() => setBlockType('h3')}
            className={btnClass(activeBlock === 'h3')}
            title="Heading 3"
          >
            <Heading3 className="w-3.5 h-3.5" />
          </button>

          <div className="h-4 w-px bg-neutral-200 dark:bg-neutral-800 mx-1" />

          {/* Checklist / Tasks */}
          <button
            type="button"
            onClick={toggleChecklist}
            className={btnClass(activeBlock === 'task')}
            title="To-Do Checklist Item"
          >
            <CheckSquare className="w-3.5 h-3.5 text-[#2383e2]" />
          </button>

          {/* Bullet List */}
          <button
            type="button"
            onClick={() => execCmd('insertUnorderedList')}
            className={btnClass(activeBlock === 'ul')}
            title="Bulleted List"
          >
            <List className="w-3.5 h-3.5" />
          </button>

          {/* Numbered List */}
          <button
            type="button"
            onClick={() => execCmd('insertOrderedList')}
            className={btnClass(activeBlock === 'ol')}
            title="Numbered List"
          >
            <ListOrdered className="w-3.5 h-3.5" />
          </button>

          <div className="h-4 w-px bg-neutral-200 dark:bg-neutral-800 mx-1" />

          {/* Quote */}
          <button
            type="button"
            onClick={() => setBlockType('blockquote')}
            className={btnClass(activeBlock === 'quote')}
            title="Quote Block"
          >
            <Quote className="w-3.5 h-3.5" />
          </button>

          {/* Inline Code */}
          <button
            type="button"
            onClick={toggleInlineCode}
            className={btnClass(activeBlock === 'code')}
            title="Inline Code"
          >
            <Code className="w-3.5 h-3.5" />
          </button>

          {/* Link */}
          <button
            type="button"
            onClick={openLinkModal}
            className={btnClass(false)}
            title="Insert Link (Ctrl+K)"
          >
            <LinkIcon className="w-3.5 h-3.5" />
          </button>

          {/* Divider */}
          <button
            type="button"
            onClick={() => execCmd('insertHorizontalRule')}
            className={btnClass(false)}
            title="Divider Line"
          >
            <Minus className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Templates & Shortcuts */}
        <div className="flex items-center gap-1">
          {/* Templates */}
          <div className="relative">
            <button
              type="button"
              onClick={() => {
                setShowTemplates(!showTemplates);
                setShowCheatsheet(false);
              }}
              className="flex items-center gap-1 px-2 py-1 rounded-lg text-neutral-600 dark:text-neutral-300 hover:text-neutral-900 dark:hover:text-white hover:bg-neutral-200/60 dark:hover:bg-neutral-800 transition-colors text-[11px] font-semibold"
            >
              <Sparkles className="w-3 h-3 text-[#2383e2]" />
              <span className="hidden sm:inline">Templates</span>
            </button>

            {showTemplates && (
              <div className="absolute right-0 top-full mt-1.5 w-48 bg-white dark:bg-[#1c1c1f] rounded-xl shadow-xl border border-neutral-200 dark:border-neutral-800 py-1.5 z-30 animate-fade-in text-xs">
                <div className="px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-neutral-400">
                  Insert Template
                </div>
                <button
                  type="button"
                  onClick={() => {
                    insertTemplate('checklist');
                    setShowTemplates(false);
                  }}
                  className="w-full text-left px-3 py-1.5 hover:bg-neutral-100 dark:hover:bg-neutral-800/80 text-neutral-700 dark:text-neutral-200 flex items-center gap-2"
                >
                  <CheckSquare className="w-3.5 h-3.5 text-[#2383e2]" />
                  <span>To-Do Checklist</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    insertTemplate('meeting');
                    setShowTemplates(false);
                  }}
                  className="w-full text-left px-3 py-1.5 hover:bg-neutral-100 dark:hover:bg-neutral-800/80 text-neutral-700 dark:text-neutral-200 flex items-center gap-2"
                >
                  <List className="w-3.5 h-3.5 text-amber-500" />
                  <span>Meeting Notes</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    insertTemplate('project');
                    setShowTemplates(false);
                  }}
                  className="w-full text-left px-3 py-1.5 hover:bg-neutral-100 dark:hover:bg-neutral-800/80 text-neutral-700 dark:text-neutral-200 flex items-center gap-2"
                >
                  <Sparkles className="w-3.5 h-3.5 text-purple-500" />
                  <span>Project Scratchpad</span>
                </button>
              </div>
            )}
          </div>

          {/* Shortcuts Guide */}
          <div className="relative">
            <button
              type="button"
              onClick={() => {
                setShowCheatsheet(!showCheatsheet);
                setShowTemplates(false);
              }}
              className="p-1 rounded-lg text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200 hover:bg-neutral-200/60 dark:hover:bg-neutral-800 transition-colors"
              title="Editor Shortcuts"
            >
              <HelpCircle className="w-3.5 h-3.5" />
            </button>

            {showCheatsheet && (
              <div className="absolute right-0 top-full mt-1.5 w-60 bg-white dark:bg-[#1c1c1f] rounded-xl shadow-xl border border-neutral-200 dark:border-neutral-800 p-3 z-30 animate-fade-in text-[11px] space-y-2 text-neutral-700 dark:text-neutral-300">
                <div className="font-bold text-xs text-neutral-900 dark:text-white border-b border-neutral-100 dark:border-neutral-800 pb-1 flex items-center justify-between">
                  <span>Editor Shortcuts</span>
                  <button
                    type="button"
                    onClick={() => setShowCheatsheet(false)}
                    className="text-neutral-400 hover:text-neutral-700 text-xs"
                  >
                    ✕
                  </button>
                </div>
                <div className="space-y-1 font-mono text-[10px]">
                  <div className="flex justify-between">
                    <span className="text-neutral-500 font-sans">Ctrl + B</span>
                    <span className="font-bold font-sans">Toggle Bold</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-neutral-500 font-sans">Ctrl + I</span>
                    <span className="italic font-sans">Toggle Italic</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-neutral-500 font-sans">Ctrl + U</span>
                    <span className="underline font-sans">Toggle Underline</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-neutral-500 font-sans">Ctrl + K</span>
                    <span className="text-blue-500 font-sans">Insert Link</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-neutral-500 font-sans">Tab</span>
                    <span className="font-sans">Indent</span>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* WYSIWYG ContentEditable Container */}
      <div className="flex-1 min-h-0 bg-neutral-50/70 dark:bg-neutral-900/60 border border-neutral-200/80 dark:border-neutral-800/80 rounded-xl p-4 sm:p-5 overflow-y-auto shadow-2xs">
        <div
          ref={editorRef}
          contentEditable={true}
          suppressContentEditableWarning={true}
          onInput={handleInput}
          onClick={handleEditorClick}
          onKeyUp={updateToolbarState}
          onMouseUp={updateToolbarState}
          onKeyDown={handleKeyDown}
          data-placeholder={placeholder}
          className="notion-editor outline-none min-h-full font-sans text-xs sm:text-sm text-[#1c1917] dark:text-neutral-100 leading-relaxed"
        />
      </div>

      {/* Insert Link Modal */}
      {showLinkModal && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center p-3 bg-black/40 backdrop-blur-xs animate-fade-in">
          <div className="bg-white dark:bg-[#1c1c1f] rounded-2xl max-w-sm w-full p-4 border border-neutral-200 dark:border-neutral-800 shadow-2xl space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="font-bold text-xs sm:text-sm text-neutral-900 dark:text-white">
                Insert Link
              </h4>
              <button
                type="button"
                onClick={() => setShowLinkModal(false)}
                className="p-1 text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="space-y-2">
              <div>
                <label className="block text-[11px] font-semibold text-neutral-500 mb-1">
                  Link Text
                </label>
                <input
                  type="text"
                  value={linkText}
                  onChange={(e) => setLinkText(e.target.value)}
                  placeholder="e.g. MS Teams Portal"
                  className="w-full px-3 py-1.5 text-xs bg-neutral-50 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#2383e2] text-neutral-900 dark:text-white"
                />
              </div>
              <div>
                <label className="block text-[11px] font-semibold text-neutral-500 mb-1">
                  URL
                </label>
                <input
                  type="text"
                  value={linkUrl}
                  onChange={(e) => setLinkUrl(e.target.value)}
                  placeholder="https://..."
                  className="w-full px-3 py-1.5 text-xs bg-neutral-50 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#2383e2] text-neutral-900 dark:text-white"
                  autoFocus
                />
              </div>
            </div>
            <div className="flex items-center justify-end gap-2 pt-1">
              <button
                type="button"
                onClick={() => setShowLinkModal(false)}
                className="px-3 py-1.5 text-xs font-semibold text-neutral-600 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded-xl"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSaveLink}
                className="flex items-center gap-1 px-4 py-1.5 text-xs font-semibold text-white bg-[#2383e2] hover:bg-[#1a73e8] rounded-xl shadow-xs"
              >
                <Check className="w-3.5 h-3.5" />
                <span>Add Link</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
