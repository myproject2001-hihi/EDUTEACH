import re

filepath = 'src/views/StudentsReportView.tsx'
with open(filepath, 'r', encoding='utf-8') as f:
    content = f.read()

# Add state variables
state_vars = """  const [selectedStudents, setSelectedStudents] = useState<string[]>([]);
  const [isSendingBulk, setIsSendingBulk] = useState(false);"""
content = re.sub(r'const \[selectedStudent, setSelectedStudent\] = useState<StudentProgress \| null>\(null\);', 
                 r'const [selectedStudent, setSelectedStudent] = useState<StudentProgress | null>(null);\n' + state_vars, content)

# Add handleBulkMessage function before useEffect
bulk_func = """
  const handleBulkMessage = async () => {
    if (selectedStudents.length === 0) return;
    setIsSendingBulk(true);
    
    try {
      // Giả lập gửi thông báo Zalo hàng loạt
      await new Promise(resolve => setTimeout(resolve, 1500));
      
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
content = content.replace('// Lắng nghe danh sách tất cả người dùng thời gian thực', bulk_func + '\n  // Lắng nghe danh sách tất cả người dùng thời gian thực')


# Add bulk button
bulk_btn = """{selectedStudents.length > 0 && (
                  <button
                    onClick={handleBulkMessage}
                    disabled={isSendingBulk}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-[#0068ff] hover:bg-[#0051d4] active:scale-95 text-white text-xs font-bold rounded-xl transition-all shadow-sm shadow-blue-100 disabled:opacity-50"
                  >
                    <MessageCircle className="w-3.5 h-3.5" />
                    {isSendingBulk ? 'Đang gửi...' : `Nhắc Zalo (${selectedStudents.length})`}
                  </button>
                )}"""
content = content.replace('{/* Sắp xếp */}', bulk_btn + '\n                {/* Sắp xếp */}')

# Add table header checkbox
th_checkbox = """<th className="px-5 py-3.5 font-bold w-12 text-center">
                      <input 
                        type="checkbox"
                        checked={sortedAndFilteredData.length > 0 && selectedStudents.length === sortedAndFilteredData.length}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setSelectedStudents(sortedAndFilteredData.map(s => s.studentId));
                          } else {
                            setSelectedStudents([]);
                          }
                        }}
                        className="w-4 h-4 text-[#0068ff] border-slate-300 rounded focus:ring-[#0068ff] cursor-pointer"
                      />
                    </th>"""
content = content.replace('<th className="px-5 py-3.5 font-bold">Học sinh</th>', th_checkbox + '\n                    <th className="px-5 py-3.5 font-bold">Học sinh</th>')

# Adjust colSpan when no students
content = content.replace('colSpan={5}', 'colSpan={6}')

# Add table row checkbox
td_checkbox = """<td className="px-5 py-4 w-12 text-center" onClick={(e) => e.stopPropagation()}>
                        <input
                          type="checkbox"
                          checked={selectedStudents.includes(student.studentId)}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setSelectedStudents(prev => [...prev, student.studentId]);
                            } else {
                              setSelectedStudents(prev => prev.filter(id => id !== student.studentId));
                            }
                          }}
                          className="w-4 h-4 text-[#0068ff] border-slate-300 rounded focus:ring-[#0068ff] cursor-pointer"
                        />
                      </td>"""
content = content.replace('<td className="px-5 py-4 font-bold text-slate-900">', td_checkbox + '\n                      <td className="px-5 py-4 font-bold text-slate-900">')

with open(filepath, 'w', encoding='utf-8') as f:
    f.write(content)
