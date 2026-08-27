filepath = 'src/views/AssignmentsView.tsx'
with open(filepath, 'r', encoding='utf-8') as f:
    content = f.read()

# Add let variables that I removed earlier
content = content.replace("let successMsg = 'Gửi câu hỏi thành công!';", "let successMsg = 'Gửi câu hỏi thành công!';\n      let zaloAttempted = false;\n      let zaloSuccess = false;")

with open(filepath, 'w', encoding='utf-8') as f:
    f.write(content)
