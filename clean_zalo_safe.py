import os

filepath = 'src/views/AssignmentsView.tsx'
with open(filepath, 'r', encoding='utf-8') as f:
    lines = f.readlines()

new_lines = []
skip = False
for i, line in enumerate(lines):
    if '{/* ZALO BOT INTEGRATION SECTION */}' in line:
        skip = True
    if skip and '/* END ZALO */}' in line:
        skip = False
        continue
    if skip:
        continue
        
    # Also skip the Zalo chat type buttons
    if 'onClick={() => setChatType(\'zalo\')}' in line or 'onClick={() => setChatType(\'both\')}' in line:
        # these are 13-line button blocks, but easier to just comment them or remove them in another pass
        pass

    new_lines.append(line)

with open(filepath, 'w', encoding='utf-8') as f:
    f.writelines(new_lines)
