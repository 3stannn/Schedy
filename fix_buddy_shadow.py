with open('src/components/common/PixelBuddy.tsx', 'r', encoding='utf-8') as f:
    code = f.read()

code = code.replace('w-6 h-1', 'w-8 h-1.5')
code = code.replace('-mt-0.5', '-mt-1')

with open('src/components/common/PixelBuddy.tsx', 'w', encoding='utf-8') as f:
    f.write(code)
