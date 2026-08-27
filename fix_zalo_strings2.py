import re

filepath = 'src/views/AssignmentsView.tsx'
with open(filepath, 'r', encoding='utf-8') as f:
    content = f.read()

# Fix remaining TS errors
content = content.replace("u.zaloUserId", "(u as any).zaloUserId")
content = content.replace("teacher?.teacherZaloPhone", "(teacher as any)?.teacherZaloPhone")

# Remove Zalo Option Buttons in the Chat Modal
zalo_btn_regex = r'<button[^>]*onClick=\{\(\) => setChatType\(\'zalo\'\)\}[^>]*>.*?</button>'
content = re.sub(zalo_btn_regex, '', content, flags=re.DOTALL)

both_btn_regex = r'<button[^>]*onClick=\{\(\) => setChatType\(\'both\'\)\}[^>]*>.*?</button>'
content = re.sub(both_btn_regex, '', content, flags=re.DOTALL)

with open(filepath, 'w', encoding='utf-8') as f:
    f.write(content)
