import re

filepath = 'src/views/StudentsReportView.tsx'
with open(filepath, 'r', encoding='utf-8') as f:
    content = f.read()

# Make handleBulkMessage actually create notification docs for the teacher.
new_func = """
  const handleBulkMessage = async () => {
    if (selectedStudents.length === 0) return;
    setIsSendingBulk(true);
    
    try {
      const timestamp = new Date().toISOString();
      const createPromises = selectedStudents.map(studentId => {
        const notifId = `zalo_remind_${studentId}_${Date.now()}`;
        return setDoc(doc(db, 'system_notifications', notifId), {
          id: notifId,
          title: '⏳ Nhắc nhở nộp bài',
          content: 'Em hãy nhớ hoàn thành bài tập sớm để được nhận xét nhé!',
          type: 'personal_reminder',
          badge: 'Nhắc Nhở Zalo',
          badgeColor: 'amber',
          targetStudentId: studentId,
          createdAt: timestamp
        });
      });
      
      await Promise.all(createPromises);
      
      setNotification({
        message: `Đã gửi thông báo Zalo thành công đến ${selectedStudents.length} học sinh.`,
        type: 'success'
      });
      setSelectedStudents([]);
    } catch (err) {
      setNotification({
        message: 'Có lỗi xảy ra khi gửi thông báo.',
        type: 'error'
      });
    } finally {
      setIsSendingBulk(false);
    }
  };
"""

content = re.sub(r'const handleBulkMessage = async \(\) => \{.*?(?=  // Lắng nghe danh sách tất cả người dùng thời gian thực)', new_func + '\n', content, flags=re.DOTALL)

with open(filepath, 'w', encoding='utf-8') as f:
    f.write(content)
