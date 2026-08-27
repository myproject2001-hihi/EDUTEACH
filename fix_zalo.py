import re

filepath = 'src/views/AssignmentsView.tsx'
with open(filepath, 'r', encoding='utf-8') as f:
    content = f.read()

# We need to find the definition of handleSendQuestion and replace the whole function
# It starts with "const handleSendQuestion = "
start_idx = content.find('const handleSendQuestion =')
if start_idx != -1:
    # Find the next function "const handleImportFlashcards ="
    end_idx = content.find('const handleImportFlashcards =', start_idx)
    if end_idx != -1:
        new_func = """const handleSendQuestion = async () => {
    if (!chatQuestion.trim()) return;
    setChatStatus({ type: 'sending', message: '' });

    try {
      const timestamp = new Date().toISOString();
      const notifId = 'chat_notif_' + Date.now();

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
  };

  """
        content = content[:start_idx] + new_func + content[end_idx:]

with open(filepath, 'w', encoding='utf-8') as f:
    f.write(content)
