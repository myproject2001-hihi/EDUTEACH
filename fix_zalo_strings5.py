filepath = 'src/views/AssignmentsView.tsx'
with open(filepath, 'r', encoding='utf-8') as f:
    content = f.read()

content = content.replace("u.zaloUserId", "(u as any).zaloUserId")
content = content.replace("user.zaloUserId", "(user as any).zaloUserId")
content = content.replace("teacher.zaloUserId", "(teacher as any).zaloUserId")
content = content.replace("teacher?.teacherZaloPhone", "(teacher as any)?.teacherZaloPhone")

with open(filepath, 'w', encoding='utf-8') as f:
    f.write(content)
