filepath = 'src/views/AssignmentsView.tsx'
with open(filepath, 'r', encoding='utf-8') as f:
    content = f.read()

content = content.replace('{/* Main Content Layout */}', ')}\n      {/* Main Content Layout */}')

with open(filepath, 'w', encoding='utf-8') as f:
    f.write(content)
