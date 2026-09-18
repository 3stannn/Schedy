import re

with open('src/components/common/PixelBuddy.tsx', 'r', encoding='utf-8') as f:
    code = f.read()

# Add imgRef and setSprite right after useStates
code = re.sub(
    r"const \[currentImg, setCurrentImg\] = useState\(\(\) => \(FRAME_SETS\[propTheme \|\| domTheme\] \|\| FRAME_SETS\.light\)\.walkLeft\[0\]\);",
    r'''const imgRef = useRef<HTMLImageElement>(null);
  const setSprite = (src: string) => {
    if (imgRef.current && imgRef.current.src.indexOf(src) === -1) {
      imgRef.current.src = src;
    }
  };
  const initialImg = (FRAME_SETS[propTheme || domTheme] || FRAME_SETS.light).walkLeft[0];''',
    code
)

# Replace all setCurrentImg with setSprite
code = code.replace('setCurrentImg', 'setSprite')

# Add ref to img tag, use initialImg for src
code = re.sub(
    r"<img\s+src=\{currentImg\}",
    r"<img\n              ref={imgRef}\n              src={initialImg}",
    code
)

with open('src/components/common/PixelBuddy.tsx', 'w', encoding='utf-8') as f:
    f.write(code)
