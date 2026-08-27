import re

filepath = 'src/views/AssignmentsView.tsx'
with open(filepath, 'r', encoding='utf-8') as f:
    content = f.read()

# Remove handleSendViaZalo entirely
content = re.sub(r'const handleSendViaZalo = async \(assignment: Assignment, targetStudentId\?: string\) => \{.*?(?=const handleSendChatQuestion = )', '', content, flags=re.DOTALL)

with open(filepath, 'w', encoding='utf-8') as f:
    f.write(content)
