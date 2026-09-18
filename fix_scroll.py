import re

with open('src/components/tasks/TaskBoard.tsx', 'r', encoding='utf-8') as f:
    code = f.read()

# Replace min-h-[480px] with min-h-[300px] max-h-[calc(100vh-180px)]
code = code.replace('min-h-[480px]', 'min-h-[300px] max-h-[calc(100vh-180px)]')

# Update Column Card List divs
# They are literally: <div className="flex flex-col gap-2.5 flex-1">
# Let's change them to <div className="flex flex-col gap-2.5 flex-1 overflow-y-auto">
code = code.replace(
    '<div className="flex flex-col gap-2.5 flex-1">',
    '<div className="flex flex-col gap-2.5 flex-1 overflow-y-auto min-h-0 pr-1 -mr-1">'
)

with open('src/components/tasks/TaskBoard.tsx', 'w', encoding='utf-8') as f:
    f.write(code)
