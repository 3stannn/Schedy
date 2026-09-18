with open('src/components/tasks/RichTextEditor.tsx', 'r', encoding='utf-8') as f:
    code = f.read()

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
            onClick={(e) => e.stopPropagation()}
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
        '      {/* Insert / Edit Link Modal */}',
        floating_image_toolbar + '\n      {/* Insert / Edit Link Modal */}'
    )

with open('src/components/tasks/RichTextEditor.tsx', 'w', encoding='utf-8') as f:
    f.write(code)
