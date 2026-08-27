import re

filepath = 'src/views/AssignmentsView.tsx'
with open(filepath, 'r', encoding='utf-8') as f:
    content = f.read()

# Replace handleSendViaZalo with regex that works: from "const handleSendViaZalo" up to "const handleSendQuestion = "
content = re.sub(r'const handleSendViaZalo = async \(.*?(?=const handleSendChatQuestion = )', '', content, flags=re.DOTALL)

# Also there's "const handleLinkZalo = async () => {" 
content = re.sub(r'const handleLinkZalo = async \(\) => \{.*?(?=const handleUnlinkZalo = )', '', content, flags=re.DOTALL)

# Also handleUnlinkZalo
content = re.sub(r'const handleUnlinkZalo = async \(\) => \{.*?(?=const handleSaveZaloConfig = )', '', content, flags=re.DOTALL)

# And handleSaveZaloConfig
content = re.sub(r'const handleSaveZaloConfig = async \(\) => \{.*?(?=const handleSendViaZalo = |const handleSendChatQuestion = |const handleImportFlashcards =)', '', content, flags=re.DOTALL)

content = content.replace('const phone = teacher?.teacherZaloPhone || teacher?.phoneStudent || teacher?.phoneParent || \'\';', 'const phone = teacher?.phoneStudent || teacher?.phoneParent || \'\';')

with open(filepath, 'w', encoding='utf-8') as f:
    f.write(content)
