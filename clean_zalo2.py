import re

filepath = 'src/views/AssignmentsView.tsx'
with open(filepath, 'r', encoding='utf-8') as f:
    content = f.read()

# Remove anything related to Zalo in handleSendViaZalo if it still exists
content = re.sub(r'const handleSendViaZalo = async \(assignment: Assignment\) => \{.*?\n  \};', '', content, flags=re.DOTALL)

# Remove zaloUserId usages in handleSendQuestion
content = re.sub(r'\} else if \(chatType === \'zalo\'\) \{.*?successMsg =.*?\}', '', content, flags=re.DOTALL)

# Remove chatType 'zalo' state and toggles
content = re.sub(r'const \[chatType, setChatType\] = useState<\'system\' \| \'zalo\'\>\(\'system\'\);', 'const [chatType, setChatType] = useState<\'system\'\>(\'system\');', content)
content = re.sub(r'<button\s+type="button"\s+onClick=\{.*setChatType\(\'zalo\'\).*?Zalo Bot.*?<\/button>', '', content, flags=re.DOTALL)

# The TS errors showed specific lines. Let's fix them:
# 5247,42: error TS2339: Property 'teacherZaloPhone' does not exist on type 'User'.
# Replace teacherZaloPhone usage with phoneStudent
content = content.replace('const phone = teacher?.teacherZaloPhone || teacher?.phoneStudent || teacher?.phoneParent || \'\';', 'const phone = teacher?.phoneStudent || teacher?.phoneParent || \'\';')

with open(filepath, 'w', encoding='utf-8') as f:
    f.write(content)

