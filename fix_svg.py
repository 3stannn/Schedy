import os
import re
import glob

directory = r'src/assets/pixel buddy'
svg_files = glob.glob(os.path.join(directory, '*.svg'))

scale_factor = 135.0 / 16.0

def replace_coord(match):
    attr = match.group(1)
    val = float(match.group(2))
    new_val = int(round(val / scale_factor))
    return f'{attr}="{new_val}"'

for filepath in svg_files:
    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()
    
    # Replace viewBox and dimensions
    content = re.sub(r'viewBox="0 0 135 135"', 'viewBox="0 0 16 16"', content)
    content = re.sub(r'width="135"', 'width="16"', content)
    content = re.sub(r'height="135"', 'height="16"', content)
    
    # We only want to replace x, y, width, height inside <rect>
    # Using a regex to find all <rect ... /> and replace their coords
    
    def process_rect(rect_match):
        rect_str = rect_match.group(0)
        rect_str = re.sub(r'\b(x|y|width|height)="([\d\.]+)"', replace_coord, rect_str)
        return rect_str
        
    content = re.sub(r'<rect[^>]+>', process_rect, content)
    
    with open(filepath, 'w', encoding='utf-8') as f:
        f.write(content)
        
print(f"Processed {len(svg_files)} files.")
