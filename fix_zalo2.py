import re

filepath = 'src/views/AssignmentsView.tsx'
with open(filepath, 'r', encoding='utf-8') as f:
    content = f.read()

# Let's use regex to replace from "const handleSendQuestion = async () => {" to the end of the function.
# The end of the function is just before "const handleImportFlashcards = (e: React.ChangeEvent<HTMLInputElement>) => {"

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
        type: 'personal_reminder',
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

content = re.sub(r'const handleSendQuestion = async \(\) => \{.*?(?=const handleImportFlashcards = \()', new_func, content, flags=re.DOTALL)

with open(filepath, 'w', encoding='utf-8') as f:
    f.write(content)
