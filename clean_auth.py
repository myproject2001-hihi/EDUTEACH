import re

filepath = 'src/views/AuthView.tsx'
with open(filepath, 'r', encoding='utf-8') as f:
    content = f.read()

# Zalo Bot instruction starts around <h5 className="font-bold text-slate-900 text-xs">Kích hoạt Zalo Bot
start_idx = content.find('<h5 className="font-bold text-slate-900 text-xs">Kích hoạt Zalo Bot')
if start_idx != -1:
    div_start = content.rfind('<div', 0, start_idx)
    div_end = content.find('</div>', start_idx)
    if div_start != -1 and div_end != -1:
        content = content[:div_start] + content[div_end+6:]

with open(filepath, 'w', encoding='utf-8') as f:
    f.write(content)
