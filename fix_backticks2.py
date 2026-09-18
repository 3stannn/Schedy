with open('src/components/tasks/RichTextEditor.tsx', 'r', encoding='utf-8') as f:
    code = f.read()

import re
code = re.sub(r'top:\s*px,', 'top: `${Math.min(window.innerHeight - 56, Math.max(10, floatingImage.rect.bottom + 6))}px`,', code)
code = re.sub(r'left:\s*px,', 'left: `${Math.max(12, Math.min(window.innerWidth - 320, floatingImage.rect.left + floatingImage.rect.width / 2 - 100))}px`,', code)

with open('src/components/tasks/RichTextEditor.tsx', 'w', encoding='utf-8') as f:
    f.write(code)
