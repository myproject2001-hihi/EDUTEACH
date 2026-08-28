import re

filepath = 'src/views/StudentsReportView.tsx'
with open(filepath, 'r', encoding='utf-8') as f:
    content = f.read()

# Make sure setDoc is imported
if "setDoc" not in content[:1000]:
    content = content.replace("doc, updateDoc, deleteDoc", "doc, updateDoc, deleteDoc, setDoc")

with open(filepath, 'w', encoding='utf-8') as f:
    f.write(content)
