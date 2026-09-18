import re

with open('src/index.css', 'r', encoding='utf-8') as f:
    css = f.read()

# Replace hop keyframes
new_hop = '''@keyframes pixelBuddyHop {
  0% {
    transform: translateY(0);
    animation-timing-function: cubic-bezier(0.23, 1, 0.32, 1);
  }
  50% {
    transform: translateY(-16px);
    animation-timing-function: cubic-bezier(0.6, 0.04, 0.98, 0.33);
  }
  100% {
    transform: translateY(0);
  }
}'''
css = re.sub(r'@keyframes pixelBuddyHop \{[^\}]+\}\s*\}\s*\}', '', css) # remove old if we can, wait regex is hard

# Let's just use string replace
old_hop = '''@keyframes pixelBuddyHop {
  0%, 100% {
    transform: translateY(0);
  }
  25% {
    transform: translateY(-6px);
  }
  50% {
    transform: translateY(-14px);
  }
  75% {
    transform: translateY(-6px);
  }
}'''
css = css.replace(old_hop, new_hop)

css = css.replace(
    '.pixel-buddy-hopping {\n  animation: pixelBuddyHop 0.72s cubic-bezier(0.25, 1, 0.5, 1);\n}',
    '.pixel-buddy-hopping {\n  animation: pixelBuddyHop 0.72s;\n}'
)

css = css.replace(
    '''@media (prefers-reduced-motion: reduce) {
  .pixel-buddy-hopping {
    animation: none !important;
    transform: none !important;
  }
}''',
    '''@media (prefers-reduced-motion: reduce) {
  .pixel-buddy-hopping,
  .pixel-buddy-shadow-hopping {
    animation: none !important;
    transform: none !important;
  }
}'''
)

shadow_css = '''
@keyframes pixelBuddyShadow {
  0% {
    transform: scale(1);
    opacity: 1;
    animation-timing-function: cubic-bezier(0.23, 1, 0.32, 1);
  }
  50% {
    transform: scale(0.65);
    opacity: 0.2;
    animation-timing-function: cubic-bezier(0.6, 0.04, 0.98, 0.33);
  }
  100% {
    transform: scale(1);
    opacity: 1;
  }
}

.pixel-buddy-shadow-hopping {
  animation: pixelBuddyShadow 0.72s;
}
'''
css += shadow_css

with open('src/index.css', 'w', encoding='utf-8') as f:
    f.write(css)
