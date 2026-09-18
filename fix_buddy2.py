with open('src/components/common/PixelBuddy.tsx', 'r', encoding='utf-8') as f:
    code = f.read()

code = code.replace(
    'imgRef.current.src.indexOf(src) === -1',
    "imgRef.current.getAttribute('src') !== src"
)

with open('src/components/common/PixelBuddy.tsx', 'w', encoding='utf-8') as f:
    f.write(code)
