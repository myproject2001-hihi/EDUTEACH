filepath = 'src/views/AssignmentsView.tsx'
with open(filepath, 'r', encoding='utf-8') as f:
    content = f.read()

content = content.replace('{/* ZALO BOT INTEGRATION SECTION */}', '{/* ZALO BOT INTEGRATION SECTION */}\n      {false && (\n')
content = content.replace('{/* Quick Stats & Action Filters */}', ')}\n      {/* Quick Stats & Action Filters */}')

with open(filepath, 'w', encoding='utf-8') as f:
    f.write(content)
