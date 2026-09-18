import re
with open('src/components/tasks/RichTextEditor.tsx', 'r', encoding='utf-8') as f:
    code = f.read()

code = code.replace(
    'top: ${Math.min(window.innerHeight - 56, Math.max(10, floatingImage.rect.bottom + 6))}px,',
    'top: `${Math.min(window.innerHeight - 56, Math.max(10, floatingImage.rect.bottom + 6))}px`,'
)

code = code.replace(
    'left: ${Math.max(12, Math.min(window.innerWidth - 320, floatingImage.rect.left + floatingImage.rect.width / 2 - 100))}px,',
    'left: `${Math.max(12, Math.min(window.innerWidth - 320, floatingImage.rect.left + floatingImage.rect.width / 2 - 100))}px`,'
)

with open('src/components/tasks/RichTextEditor.tsx', 'w', encoding='utf-8') as f:
    f.write(code)
