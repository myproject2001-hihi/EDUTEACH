import re
import os

def process_file(filepath):
    if not os.path.exists(filepath):
        print(f"File {filepath} not found")
        return
        
    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()

    original_length = len(content)

    if 'AssignmentsView.tsx' in filepath:
        # Remove state declarations
        content = re.sub(r'const \[showZaloSetup, setShowZaloSetup\] = useState\(false\);', '', content)
        content = re.sub(r'const \[zaloConfig, setZaloConfig\].*?\}\);', '', content, flags=re.DOTALL)
        content = re.sub(r'const \[zaloStudentUserId, setZaloStudentUserId\].*?;', '', content)
        content = re.sub(r'const \[isLinkingZalo, setIsLinkingZalo\].*?;', '', content)
        content = re.sub(r'const \[isSavingZalo, setIsSavingZalo\].*?;', '', content)
        content = re.sub(r'const \[zaloSendStatus, setZaloSendStatus\].*?\{\}\);', '', content, flags=re.DOTALL)

        # Remove handleSaveZaloConfig
        content = re.sub(r'const handleSaveZaloConfig = async \(\) => \{.*?\n  \};', '', content, flags=re.DOTALL)
        # Remove handleLinkZalo
        content = re.sub(r'const handleLinkZalo = async \(\) => \{.*?\n  \};', '', content, flags=re.DOTALL)
        # Remove handleSendViaZalo
        content = re.sub(r'const handleSendViaZalo = async \(assignment: Assignment\) => \{.*?\n  \};', '', content, flags=re.DOTALL)

        # Remove useEffect for zalo_oa
        content = re.sub(r'useEffect\(\(\) => \{\s*const unsub = onSnapshot\(doc\(db, .settings., .zalo_oa.\).*?\n  \}, \[\]\);', '', content, flags=re.DOTALL)

        # Remove ZALO BOT INTEGRATION SECTION
        content = re.sub(r'\{\/\*\s*ZALO BOT INTEGRATION SECTION.*?\/\* END ZALO \/\*\}', '', content, flags=re.DOTALL)
        content = re.sub(r'\{\/\*\s*ZALO BOT INTEGRATION SECTION.*?\<\/\>\s*\)}', '', content, flags=re.DOTALL)
        
        # We need a more robust removal for the Zalo section.
        # It starts around line 1887 with {/* ZALO BOT INTEGRATION SECTION */}
        # I'll just use a regex if it matches or a string search
        
    with open(filepath, 'w', encoding='utf-8') as f:
        f.write(content)
        
    print(f"Processed {filepath}: {original_length} -> {len(content)}")

process_file('src/views/AssignmentsView.tsx')
