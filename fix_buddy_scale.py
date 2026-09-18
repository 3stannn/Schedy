with open('src/components/common/PixelBuddy.tsx', 'r', encoding='utf-8') as f:
    code = f.read()

code = code.replace('w-10 h-10', 'w-12 h-12')
code = code.replace('width={40}', 'width={48}')
code = code.replace('height={40}', 'height={48}')

with open('src/components/common/PixelBuddy.tsx', 'w', encoding='utf-8') as f:
    f.write(code)
