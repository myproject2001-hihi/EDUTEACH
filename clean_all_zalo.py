import re

filepath = 'src/views/AssignmentsView.tsx'
with open(filepath, 'r', encoding='utf-8') as f:
    content = f.read()

# 1. Replace handleSendViaZalo entirely. Since we are removing Zalo, we shouldn't even have this function. But let's just make it empty if we want to preserve UI, or remove it and its calls. Let's make it empty first to avoid breaking UI dependencies.
content = re.sub(r'const handleSendViaZalo = async \(assignment: Assignment, targetStudentId\?: string\) => \{.*?(?=const handleSendChatQuestion = )', 'const handleSendViaZalo = async (assignment: Assignment, targetStudentId?: string) => {};\n  ', content, flags=re.DOTALL)

# 2. handleSendChatQuestion -> remove Zalo logic
new_func = """const handleSendChatQuestion = async () => {
    if (!chatQuestion.trim()) return;
    setChatStatus({ type: 'sending', message: '' });

    try {
      const timestamp = new Date().toISOString();
      const notifId = 'chat_notif_' + Date.now();

      const newNotif = {
        id: notifId,
        title: `❓ Thắc mắc bài: ${user.name}`,
        content: `Học sinh *${user.name}* (Lớp ${user.className || 'Chưa rõ'}) có thắc mắc về bài tập "${selectedAssignment?.title || 'Không xác định'}":\\n\\n"${chatQuestion.trim()}"`,
        type: 'personal_reminder', // Ensures teachers/admins get notified
        badge: '💬 Hỏi Bài',
        badgeColor: 'rose',
        createdAt: timestamp
      };

      await setDoc(doc(db, 'system_notifications', notifId), newNotif);

      setChatStatus({ type: 'success', message: 'Gửi câu hỏi thành công!' });
      setChatQuestion('');
      setTimeout(() => {
        setShowChatModal(false);
        setChatStatus({ type: 'idle', message: '' });
      }, 3500);
    } catch (err: any) {
      console.error("Lỗi gửi thắc mắc bài tập:", err);
      setChatStatus({ type: 'error', message: err.message || 'Gửi thắc mắc thất bại, vui lòng thử lại.' });
    }
  };"""

content = re.sub(r'const handleSendChatQuestion = async \(\) => \{.*?(?=const handleImportFlashcards = )', new_func + '\n\n  ', content, flags=re.DOTALL)

# 3. Fix TS errors
content = content.replace("teacher?.teacherZaloPhone", "(teacher as any)?.teacherZaloPhone")
content = content.replace("u.zaloUserId", "(u as any).zaloUserId")
content = content.replace("user.zaloUserId", "(user as any).zaloUserId")
content = content.replace("teacher.zaloUserId", "(teacher as any).zaloUserId")

# 4. Remove Zalo buttons from Chat modal
zalo_btn_regex = r'<button[^>]*onClick=\{\(\) => setChatType\(\'zalo\'\)\}[^>]*>.*?</button>'
content = re.sub(zalo_btn_regex, '', content, flags=re.DOTALL)

both_btn_regex = r'<button[^>]*onClick=\{\(\) => setChatType\(\'both\'\)\}[^>]*>.*?</button>'
content = re.sub(both_btn_regex, '', content, flags=re.DOTALL)

# 5. Remove Zalo integration section completely from the view
start_idx = content.find('{/* ZALO BOT INTEGRATION SECTION */}')
if start_idx != -1:
    end_idx = content.find('{/* Quick Stats & Action Filters */}', start_idx)
    if end_idx != -1:
        content = content[:start_idx] + content[end_idx:]

with open(filepath, 'w', encoding='utf-8') as f:
    f.write(content)
