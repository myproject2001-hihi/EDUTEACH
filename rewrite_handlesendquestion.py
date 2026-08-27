import re

filepath = 'src/views/AssignmentsView.tsx'
with open(filepath, 'r', encoding='utf-8') as f:
    content = f.read()

# Replace the entire handleSendQuestion block
new_func = """
  const handleSendQuestion = async () => {
    if (!chatQuestion.trim()) return;
    setChatStatus({ type: 'sending', message: '' });

    try {
      const notifId = doc(collection(db, 'system_notifications')).id;
      const timestamp = new Date().toISOString();

      const newNotif = {
        id: notifId,
        title: `❓ Thắc mắc bài: ${user.name}`,
        content: `Học sinh *${user.name}* (Lớp ${user.className || 'Chưa rõ'}) có thắc mắc về bài tập "${selectedAssignment?.title || 'Không xác định'}":\n\n"${chatQuestion.trim()}"`,
        type: 'personal_reminder', // Ensures teachers/admins get notified
        badge: '💬 Hỏi Bài',
        badgeColor: 'rose',
        createdAt: timestamp
      };

      await setDoc(doc(db, 'system_notifications', notifId), newNotif);

      setChatStatus({ type: 'success', message: 'Đã gửi câu hỏi lên thông báo hệ thống thành công!' });
      setChatQuestion('');
      setTimeout(() => {
        setShowChatModal(false);
        setChatStatus({ type: 'idle', message: '' });
      }, 3500);

    } catch (err: any) {
      console.error("Lỗi gửi thắc mắc bài tập:", err);
      setChatStatus({ type: 'error', message: err.message || 'Gửi thắc mắc thất bại, vui lòng thử lại.' });
    }
  };
"""

content = re.sub(r'const handleSendQuestion = async \(\) => \{.*?\n  \};\n\n  const handleImportFlashcards', new_func + "\n  const handleImportFlashcards", content, flags=re.DOTALL)

with open(filepath, 'w', encoding='utf-8') as f:
    f.write(content)
