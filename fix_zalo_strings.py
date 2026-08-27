filepath = 'src/views/AssignmentsView.tsx'
with open(filepath, 'r', encoding='utf-8') as f:
    content = f.read()

# 1. Remove Zalo Bot Integration Section
start_idx = content.find('{/* ZALO BOT INTEGRATION SECTION */}')
if start_idx != -1:
    # Find the next </div> that closes this section.
    # The section is <div className="bg-white border border-slate-200 rounded-3xl p-5 shadow-sm space-y-4">
    # Let's just find the exact text of the Zalo Bot block and remove it.
    # It ends before "{/* Quick Stats & Action Filters */}"
    end_idx = content.find('{/* Quick Stats & Action Filters */}', start_idx)
    if end_idx != -1:
        content = content[:start_idx] + content[end_idx:]

# 2. Fix user.zaloUserId TS errors by casting (since we don't want to break the UI structure right now, just make it compile if it's referenced elsewhere)
# Actually, the buttons in the assignment cards:
btn_zalo_start = content.find('title="Gửi thông báo bài tập mới hoặc nhắc nhở những em chưa nộp bài qua Zalo Bot"')
if btn_zalo_start != -1:
    # Remove the <button> ... </button>
    b_start = content.rfind('<button', 0, btn_zalo_start)
    b_end = content.find('</button>', btn_zalo_start) + len('</button>')
    content = content[:b_start] + content[b_end:]

# 3. In handleSendQuestion, remove the Zalo options.
# Find chatType === 'zalo'
z_start = content.find('let zaloSuccess = false;')
if z_start != -1:
    z_end = content.find("let successMsg = 'Gửi câu hỏi thành công!';")
    if z_end != -1:
        content = content[:z_start] + content[z_end:]

content = content.replace("chatType === 'both'", "false")
content = content.replace("chatType === 'zalo'", "false")

with open(filepath, 'w', encoding='utf-8') as f:
    f.write(content)
