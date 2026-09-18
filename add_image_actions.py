import re

with open('src/components/tasks/RichTextEditor.tsx', 'r', encoding='utf-8') as f:
    code = f.read()

# 1. Add imports from lucide-react
imports_to_add = "import { Image as ImageIcon, Trash2, Maximize2, Minimize2, Columns } from 'lucide-react';\n"
if 'import { Image as ImageIcon' not in code:
    code = imports_to_add + code

# 2. Add floatingImage state
state_block = """
  // Floating Image Action Toolbar
  const [floatingImage, setFloatingImage] = useState<{
    img: HTMLImageElement;
    rect: DOMRect;
  } | null>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const dataUrl = event.target?.result;
      if (typeof dataUrl === 'string') {
        if (editorRef.current) {
          editorRef.current.focus();
          document.execCommand('insertImage', false, dataUrl);
          handleInput(true);
        }
      }
    };
    reader.readAsDataURL(file);
    e.target.value = ''; // Reset input
  };
"""
if 'const [floatingImage' not in code:
    code = code.replace(
        '  const floatingRef = useRef<HTMLDivElement | null>(null);',
        '  const floatingRef = useRef<HTMLDivElement | null>(null);\n' + state_block
    )

# 3. Add to click-outside dismissal
dismiss_logic = """
      if (floatingImage && floatingImage.img.contains(target)) return;
      setFloatingImage(null);
"""
if 'if (floatingImage && floatingImage.img' not in code:
    code = code.replace(
        '      if (floatingLink.anchor.contains(target)) return;',
        '      if (floatingLink && floatingLink.anchor.contains(target)) return;\n' + dismiss_logic
    )

code = code.replace(
    '    if (!floatingLink) return;',
    '    if (!floatingLink && !floatingImage) return;'
)

# 4. Add to handleEditorClick to detect image clicks
image_click_logic = """
    // Image handling
    if (target.tagName.toLowerCase() === 'img') {
      const img = target as HTMLImageElement;
      // Deselect previously selected
      document.querySelectorAll('.notion-editor img.selected').forEach(el => el.classList.remove('selected'));
      img.classList.add('selected');
      const rect = img.getBoundingClientRect();
      setFloatingImage({ img, rect });
      setFloatingLink(null);
      return;
    } else {
      document.querySelectorAll('.notion-editor img.selected').forEach(el => el.classList.remove('selected'));
      setFloatingImage(null);
    }
"""
if "target.tagName.toLowerCase() === 'img'" not in code:
    code = code.replace(
        '  const handleEditorClick = (e: React.MouseEvent<HTMLDivElement>) => {\n    const target = e.target as HTMLElement;',
        '  const handleEditorClick = (e: React.MouseEvent<HTMLDivElement>) => {\n    const target = e.target as HTMLElement;\n' + image_click_logic
    )

# 5. Add toolbar button for inserting image
toolbar_btn = """
          <button
            type="button"
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => imageInputRef.current?.click()}
            className={btnClass(false)}
            title="Insert Image"
          >
            <ImageIcon className="w-3.5 h-3.5" />
          </button>
          <input
            type="file"
            ref={imageInputRef}
            className="hidden"
            accept="image/*"
            onChange={handleImageUpload}
          />
"""
if '<ImageIcon className="w-3.5 h-3.5" />' not in code:
    code = code.replace(
        '          {/* Divider */}',
        toolbar_btn + '\n          {/* Divider */}'
    )

# 6. Add the floating image toolbar
floating_image_toolbar = """
      {/* Floating Image Action Toolbar */}
      {floatingImage && (
        <div
          ref={floatingRef}
          className="fixed z-[60]"
          style={{
            top: ${Math.min(window.innerHeight - 56, Math.max(10, floatingImage.rect.bottom + 6))}px,
            left: ${Math.max(12, Math.min(window.innerWidth - 320, floatingImage.rect.left + floatingImage.rect.width / 2 - 100))}px,
          }}
        >
          <div
            className="flex items-center gap-1 px-2 py-1.5 bg-white/95 dark:bg-[#1e1e22]/95 backdrop-blur-md rounded-xl border border-black/10 dark:border-white/12 shadow-xl text-xs select-none animate-fade-in text-neutral-800 dark:text-neutral-100"
          >
            <button
              type="button"
              onClick={() => { floatingImage.img.style.width = '33%'; setFloatingImage(null); handleInput(true); }}
              className="p-1.5 text-neutral-500 hover:text-neutral-800 dark:text-neutral-400 dark:hover:text-white rounded-lg hover:bg-black/5 dark:hover:bg-white/10 transition-colors cursor-pointer"
              title="Resize to 1/3 width"
            >
              <Minimize2 className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              onClick={() => { floatingImage.img.style.width = '50%'; setFloatingImage(null); handleInput(true); }}
              className="p-1.5 text-neutral-500 hover:text-neutral-800 dark:text-neutral-400 dark:hover:text-white rounded-lg hover:bg-black/5 dark:hover:bg-white/10 transition-colors cursor-pointer"
              title="Resize to 1/2 width"
            >
              <Columns className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              onClick={() => { floatingImage.img.style.width = '100%'; setFloatingImage(null); handleInput(true); }}
              className="p-1.5 text-neutral-500 hover:text-neutral-800 dark:text-neutral-400 dark:hover:text-white rounded-lg hover:bg-black/5 dark:hover:bg-white/10 transition-colors cursor-pointer"
              title="Full width"
            >
              <Maximize2 className="w-3.5 h-3.5" />
            </button>
            <div className="w-[1px] h-4 bg-neutral-200 dark:bg-neutral-800 mx-1" />
            <button
              type="button"
              onClick={() => { floatingImage.img.remove(); setFloatingImage(null); handleInput(true); }}
              className="p-1.5 text-[#ff3b30] hover:text-[#ff3b30] rounded-lg hover:bg-[#ff3b30]/10 transition-colors cursor-pointer"
              title="Delete Image"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}
"""
if '{/* Floating Image Action Toolbar */}' not in code:
    code = code.replace(
        '      {/* Link Modal */}',
        floating_image_toolbar + '\n      {/* Link Modal */}'
    )

with open('src/components/tasks/RichTextEditor.tsx', 'w', encoding='utf-8') as f:
    f.write(code)
