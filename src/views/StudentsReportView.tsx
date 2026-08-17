import React, { useState, useEffect } from 'react';
import { StudentProgress } from '../types';
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { Search, Download, Award, TrendingUp, Phone, User, CheckCircle, Mail, MessageCircle, Key, ShieldCheck, Trash2, Check, X, ShieldAlert, AlertCircle, Copy } from 'lucide-react';
import { db, handleFirestoreError, OperationType } from '../firebase';
import { collection, onSnapshot, doc, updateDoc, deleteDoc } from 'firebase/firestore';
import { ConfirmModal } from '../components/ConfirmModal';

interface StudentsReportProps {
  progressData: StudentProgress[];
}

export function StudentsReportView({ progressData }: StudentsReportProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedStudent, setSelectedStudent] = useState<StudentProgress | null>(null);

  const [className, setClassName] = useState(() => localStorage.getItem('class_name') || '123456');
  const [academicYear, setAcademicYear] = useState(() => localStorage.getItem('academic_year') || 'Khóa 2026 - 2027');

  const [allUsers, setAllUsers] = useState<any[]>([]);
  const [resetRequests, setResetRequests] = useState<any[]>([]);
  const [activeSubTab, setActiveSubTab] = useState<'roster' | 'requests'>('roster');
  const [notification, setNotification] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
  const [rejectConfirmId, setRejectConfirmId] = useState<string | null>(null);
  const [rejecting, setRejecting] = useState(false);

  // Lắng nghe danh sách tất cả người dùng thời gian thực
  useEffect(() => {
    const unsub = onSnapshot(collection(db, 'users'), (snapshot) => {
      const list: any[] = [];
      snapshot.forEach((docSnap) => {
        list.push({ id: docSnap.id, ...docSnap.data() });
      });
      setAllUsers(list);
    }, (error) => {
      console.error("Lỗi tải danh sách người dùng:", error);
    });
    return () => unsub();
  }, []);

  useEffect(() => {
    const unsubscribe = onSnapshot(collection(db, 'reset_requests'), (snapshot) => {
      const list: any[] = [];
      snapshot.forEach((docSnap) => {
        list.push({ id: docSnap.id, ...docSnap.data() });
      });
      // Sắp xếp yêu cầu mới nhất lên đầu
      list.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      setResetRequests(list);
    }, (error) => {
      console.error("Lỗi tải yêu cầu khôi phục mật khẩu:", error);
    });
    return () => unsubscribe();
  }, []);

  // Lọc danh sách học sinh từ bộ sưu tập users
  const studentUsers = React.useMemo(() => {
    return allUsers.filter(u => u.role === 'student');
  }, [allUsers]);

  // Tổng hợp danh sách học sinh theo mã lớp học đang chọn
  const combinedRoster = React.useMemo(() => {
    const filterClass = className.trim().toLowerCase();

    // Lọc học sinh có mã lớp khớp với bộ lọc (hoặc nếu để trống/Tất cả thì hiện hết)
    const matchedUsers = studentUsers.filter(u => {
      if (!filterClass || filterClass === 'tất cả') return true;
      const uClass = (u.className || u.connectionCode || '').trim().toLowerCase();
      return uClass === filterClass;
    });

    return matchedUsers.map(u => {
      const existingProgress = progressData.find(p => p.studentId === u.id || (p.studentName && u.name && p.studentName.trim().toLowerCase() === u.name.trim().toLowerCase()));
      if (existingProgress) {
        return {
          ...existingProgress,
          studentId: u.id,
          studentName: u.name || existingProgress.studentName,
          phoneStudent: u.phoneStudent || existingProgress.phoneStudent || '',
          phoneParent: u.phoneParent || existingProgress.phoneParent || '',
          className: u.className || existingProgress.className || className,
        };
      }
      return {
        studentId: u.id,
        studentName: u.name || 'Học sinh',
        phoneStudent: u.phoneStudent || '',
        phoneParent: u.phoneParent || '',
        className: u.className || className,
        completionRate: 0,
        averageGrade: 0,
        attendanceRate: 100,
        recentGrades: [],
      };
    });
  }, [studentUsers, progressData, className]);

  useEffect(() => {
    if (combinedRoster.length > 0) {
      if (!selectedStudent) {
        setSelectedStudent(combinedRoster[0]);
      } else {
        const updated = combinedRoster.find(s => s.studentId === selectedStudent.studentId);
        if (updated) setSelectedStudent(updated);
      }
    } else {
      setSelectedStudent(null);
    }
  }, [combinedRoster]);

  const handleApproveRequest = async (requestId: string, username: string) => {
    // Tạo mật khẩu tạm ngẫu nhiên: ví dụ Edu@2026_ + số ngẫu nhiên 4 chữ số
    const randomNum = Math.floor(1000 + Math.random() * 9000);
    const tempPass = `Edu@2026_${randomNum}`;

    try {
      const requestRef = doc(db, 'reset_requests', requestId);
      await updateDoc(requestRef, {
        status: 'approved',
        tempPassword: tempPass,
        approvedAt: new Date().toISOString()
      });
      setNotification({
        message: `Đã duyệt yêu cầu của học sinh ${username}! Mật khẩu tạm của học sinh là: ${tempPass}`,
        type: 'success'
      });
    } catch (err) {
      console.error(err);
      setNotification({
        message: 'Có lỗi xảy ra khi phê duyệt yêu cầu.',
        type: 'error'
      });
    }
  };

  const confirmRejectRequest = async () => {
    if (!rejectConfirmId) return;
    setRejecting(true);
    try {
      await deleteDoc(doc(db, 'reset_requests', rejectConfirmId));
      setResetRequests(prev => prev.filter(r => r.id !== rejectConfirmId));
      setNotification({
        message: 'Đã bác bỏ và xóa thành công yêu cầu khôi phục mật khẩu.',
        type: 'success'
      });
      setRejectConfirmId(null);
    } catch (err: any) {
      console.error(err);
      handleFirestoreError(err, OperationType.DELETE, `reset_requests/${rejectConfirmId}`);
      setNotification({
        message: `Có lỗi xảy ra khi từ chối yêu cầu: ${err.message || 'Lỗi hệ thống'}`,
        type: 'error'
      });
    } finally {
      setRejecting(false);
    }
  };

  const filteredData = combinedRoster.filter(s => 
    s.studentName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (s.phoneStudent && s.phoneStudent.includes(searchTerm)) ||
    (s.phoneParent && s.phoneParent.includes(searchTerm))
  );

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-10">
      
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white p-6 rounded-3xl border border-slate-200 shadow-sm">
        <div>
          <h2 className="text-2xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
            Quản lý Học sinh & Tiến độ
          </h2>
          <p className="text-slate-500 text-sm mt-0.5">Quản lý thông tin học sinh, khóa học, SĐT và tiến trình làm bài</p>
        </div>
        
        {/* Class Details Inline Editor */}
        <div className="flex flex-wrap gap-4 items-center bg-slate-50 border border-slate-100 p-3.5 rounded-2xl w-full md:w-auto">
          <div className="space-y-1">
            <span className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider">Tên lớp học</span>
            <input 
              type="text"
              value={className}
              onChange={(e) => {
                const val = e.target.value;
                setClassName(val);
                localStorage.setItem('class_name', val);
                window.dispatchEvent(new Event('storage'));
              }}
              className="px-3 py-1.5 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-800 focus:ring-1 focus:ring-indigo-500 outline-none w-28 text-center"
              placeholder="123456"
            />
          </div>

          <div className="space-y-1">
            <span className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider">Khóa học</span>
            <input 
              type="text"
              value={academicYear}
              onChange={(e) => {
                const val = e.target.value;
                setAcademicYear(val);
                localStorage.setItem('academic_year', val);
                window.dispatchEvent(new Event('storage'));
              }}
              className="px-3 py-1.5 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-800 focus:ring-1 focus:ring-indigo-500 outline-none w-36 text-center"
              placeholder="Khóa 2024 - 2025"
            />
          </div>
          
          <button
            onClick={() => window.print()}
            className="ml-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-xl transition-colors flex items-center gap-2 print:hidden shadow-sm"
          >
            <Download className="w-4 h-4" /> Xuất PDF
          </button>
        </div>
      </div>

      {/* Progress Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-3xl border border-slate-200 shadow-sm p-6">
          <div className="flex items-center mb-4">
            <div className="w-10 h-10 rounded-2xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600 mr-3">
              <Award className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900">Điểm Trung Bình Quá Trình</h3>
              <p className="text-xs text-slate-500">So sánh điểm số trung bình giữa các học sinh</p>
            </div>
          </div>
          <div className="h-60 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={combinedRoster} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="studentName" axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 12, fontWeight: 600 }} dy={8} />
                <YAxis axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 12 }} domain={[0, 10]} />
                <Tooltip cursor={{ fill: '#f8fafc' }} contentStyle={{ borderRadius: '16px', border: '1px solid #e2e8f0' }} />
                <Bar dataKey="averageGrade" name="Điểm TB" fill="#4f46e5" radius={[4, 4, 0, 0]} barSize={28} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-white rounded-3xl border border-slate-200 shadow-sm p-6">
          <div className="flex items-center mb-4">
            <div className="w-10 h-10 rounded-2xl bg-emerald-50 border border-emerald-100 flex items-center justify-center text-emerald-600 mr-3">
              <TrendingUp className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900">Tỷ Lệ Nộp Bài Đúng Hạn (%)</h3>
              <p className="text-xs text-slate-500">Thống kê việc hoàn thành bài tập trước giờ học</p>
            </div>
          </div>
          <div className="h-60 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={combinedRoster} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="studentName" axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 12, fontWeight: 600 }} dy={8} />
                <YAxis axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 12 }} domain={[0, 100]} />
                <Tooltip cursor={{ fill: '#f8fafc' }} contentStyle={{ borderRadius: '16px', border: '1px solid #e2e8f0' }} />
                <Bar dataKey="completionRate" name="Tỷ lệ hoàn thành" fill="#10b981" radius={[4, 4, 0, 0]} barSize={28} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Notification Toast */}
      {notification && (
        <div className={`p-4 rounded-2xl border flex items-start justify-between gap-3 ${
          notification.type === 'success' 
            ? 'bg-emerald-50 border-emerald-200 text-emerald-800' 
            : 'bg-rose-50 border-rose-200 text-rose-800'
        }`}>
          <div className="flex items-start gap-2.5">
            <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
            <div className="text-xs font-semibold leading-relaxed">
              {notification.message}
            </div>
          </div>
          <button 
            onClick={() => setNotification(null)}
            className="text-slate-400 hover:text-slate-600 font-bold text-xs p-1"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Roster & Detail View */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Roster Table / Requests Container */}
        <div className="lg:col-span-2 bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden flex flex-col">
          {/* Sub tabs header */}
          <div className="border-b border-slate-100 bg-slate-50/50 p-2 flex flex-col sm:flex-row sm:items-center justify-between gap-2 print:hidden">
            <div className="flex items-center gap-1.5 p-1 bg-slate-100 rounded-2xl">
              <button
                type="button"
                onClick={() => setActiveSubTab('roster')}
                className={`px-4 py-2 text-xs font-bold rounded-xl transition-all flex items-center gap-2 ${
                  activeSubTab === 'roster' 
                    ? 'bg-white text-indigo-600 shadow-sm' 
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <User className="w-3.5 h-3.5" />
                Danh sách Học sinh
              </button>
              <button
                type="button"
                onClick={() => setActiveSubTab('requests')}
                className={`px-4 py-2 text-xs font-bold rounded-xl transition-all flex items-center gap-2 relative ${
                  activeSubTab === 'requests' 
                    ? 'bg-white text-indigo-600 shadow-sm' 
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <Key className="w-3.5 h-3.5" />
                Yêu cầu khôi phục mật khẩu
                {resetRequests.filter(r => r.status === 'pending').length > 0 && (
                  <span className="absolute -top-1 -right-1 px-1.5 py-0.5 bg-rose-500 text-white rounded-full text-[9px] font-black animate-pulse">
                    {resetRequests.filter(r => r.status === 'pending').length}
                  </span>
                )}
              </button>
            </div>

            {activeSubTab === 'roster' && (
              <div className="relative w-full sm:w-60">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
                <input 
                  type="text" 
                  value={searchTerm}
                  onChange={e => setSearchTerm(e.target.value)}
                  placeholder="Tìm học sinh..." 
                  className="w-full pl-9 pr-4 py-1.5 bg-white border border-slate-200 rounded-xl text-xs focus:ring-1 focus:ring-indigo-500 outline-none placeholder:text-slate-400"
                />
              </div>
            )}
          </div>

          {activeSubTab === 'roster' ? (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-slate-600">
                <thead className="bg-slate-50 text-slate-700 uppercase text-[10px] tracking-wider border-b border-slate-200">
                  <tr>
                    <th className="px-5 py-3.5 font-bold">Học sinh</th>
                    <th className="px-5 py-3.5 font-bold text-center">Nộp bài</th>
                    <th className="px-5 py-3.5 font-bold text-center">Điểm TB</th>
                    <th className="px-5 py-3.5 font-bold text-center">Chuyên cần</th>
                    <th className="px-5 py-3.5 font-bold text-right">Thao tác</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredData.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="py-12 text-center text-slate-400">
                        <User className="w-10 h-10 mx-auto text-slate-300 mb-2" />
                        <p className="font-bold text-slate-700 text-sm">Chưa có học sinh nào trong lớp "{className}"</p>
                        <p className="text-xs text-slate-400 mt-1 max-w-md mx-auto">
                          Gán mã lớp <strong className="text-indigo-600">{className}</strong> cho học sinh tại mục <i>Console Quản trị &gt; Đổi vai trò / Đổi mã lớp</i> hoặc nhập mã lớp khác ở ô phía trên.
                        </p>
                      </td>
                    </tr>
                  ) : (
                    filteredData.map((student) => (
                      <tr 
                        key={student.studentId} 
                        onClick={() => setSelectedStudent(student)}
                        className={`hover:bg-indigo-50/50 cursor-pointer transition-colors ${
                          selectedStudent?.studentId === student.studentId ? 'bg-indigo-50/80 font-semibold' : ''
                        }`}
                      >
                      <td className="px-5 py-4 font-bold text-slate-900">
                        <div>
                          <p className="text-sm">{student.studentName}</p>
                          <p className="text-[11px] text-slate-400 font-normal">PH: {student.phoneParent || '0912345678'}</p>
                        </div>
                      </td>
                      <td className="px-5 py-4 text-center">
                        <div className="inline-flex items-center gap-1.5 bg-emerald-50 text-emerald-700 px-2.5 py-1 rounded-lg border border-emerald-100 font-bold">
                          <CheckCircle className="w-3.5 h-3.5" />
                          {student.completionRate}%
                        </div>
                      </td>
                      <td className="px-5 py-4 text-center font-extrabold text-indigo-600 text-sm">
                        {student.averageGrade.toFixed(1)}
                      </td>
                      <td className="px-5 py-4 text-center font-semibold">{student.attendanceRate}%</td>
                      <td className="px-5 py-4 text-right">
                        <button className="text-indigo-600 hover:text-indigo-800 font-bold hover:underline">Xem tiến độ</button>
                      </td>
                    </tr>
                  ))
                )}
                </tbody>
              </table>
            </div>
          ) : (
            /* RESET PASSWORD REQUESTS PANEL */
            <div className="p-4 space-y-4">
              {resetRequests.length === 0 ? (
                <div className="p-10 text-center text-slate-400 text-xs italic bg-slate-50/40 rounded-2xl border border-dashed border-slate-200">
                  <ShieldCheck className="w-10 h-10 mx-auto text-slate-300 mb-2.5" />
                  Hiện không có yêu cầu khôi phục mật khẩu nào cần xử lý.
                </div>
              ) : (
                <div className="space-y-3.5">
                  <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 text-xs text-slate-600 leading-relaxed">
                    <p className="font-bold text-slate-800 mb-1 flex items-center gap-1.5">
                      <ShieldAlert className="w-4 h-4 text-indigo-600" />
                      Quy trình phê duyệt an toàn
                    </p>
                    Khi học sinh gửi yêu cầu khôi phục, thông tin lớp học, họ tên và số điện thoại liên hệ sẽ được hiển thị tại đây.
                    Thầy cô vui lòng kiểm tra và xác nhận đúng thông tin học sinh lớp mình, sau đó bấm <strong>"Phê duyệt & Cấp mật khẩu"</strong> để tạo mật khẩu tạm thời. 
                    Bạn có thể gửi trực tiếp mật khẩu này cho phụ huynh hoặc học sinh thông qua ứng dụng nhắn tin cá nhân.
                  </div>

                  <div className="divide-y divide-slate-100 border border-slate-200 rounded-2xl overflow-hidden">
                    {resetRequests.map((req) => (
                      <div 
                        key={req.id} 
                        className={`p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 transition-all ${
                          req.status === 'pending' ? 'bg-indigo-50/20' : 'bg-white'
                        }`}
                      >
                        <div className="space-y-1.5 min-w-0 flex-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-bold text-slate-900 text-sm">{req.name}</span>
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-100 text-slate-600">
                              Lớp {req.className}
                            </span>
                            {req.status === 'pending' ? (
                              <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 animate-pulse border border-amber-200">
                                Chờ duyệt
                              </span>
                            ) : (
                              <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-200 flex items-center gap-1">
                                <Check className="w-3 h-3" /> Đã duyệt
                              </span>
                            )}
                          </div>

                          <div className="text-[11px] text-slate-500 space-y-0.5 font-medium">
                            <p className="flex items-center gap-1">
                              <User className="w-3 h-3 text-slate-400" /> Tên đăng nhập: <code className="bg-slate-100 px-1 py-0.2 rounded font-mono text-indigo-600 text-[10px]">{req.username}</code>
                            </p>
                            <p className="flex items-center gap-1">
                              <Phone className="w-3 h-3 text-slate-400" /> SĐT liên hệ nhận mật khẩu: <strong className="text-slate-700">{req.phone}</strong>
                            </p>
                            {req.message && (
                              <p className="flex items-center gap-1">
                                <MessageCircle className="w-3 h-3 text-slate-400" /> Lời nhắn: <span className="text-slate-700 italic">"{req.message}"</span>
                              </p>
                            )}
                            {req.approvedAt && (
                              <p className="text-slate-400">
                                Đã duyệt lúc: {new Date(req.approvedAt).toLocaleTimeString('vi-VN')} {new Date(req.approvedAt).toLocaleDateString('vi-VN')}
                              </p>
                            )}
                          </div>
                        </div>

                        <div className="flex flex-wrap items-center gap-2 shrink-0">
                          {req.status === 'pending' ? (
                            <>
                              <button
                                type="button"
                                onClick={() => handleApproveRequest(req.id, req.username)}
                                className="bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold py-2 px-3 rounded-xl transition-all shadow-sm flex items-center gap-1"
                              >
                                <Check className="w-3.5 h-3.5" /> Phê duyệt & Cấp mật khẩu
                              </button>
                              <button
                                type="button"
                                onClick={() => setRejectConfirmId(req.id)}
                                className="bg-rose-50 hover:bg-rose-100 text-rose-600 text-xs font-bold py-2 px-3 rounded-xl transition-all flex items-center gap-1"
                              >
                                <Trash2 className="w-3.5 h-3.5" /> Bác bỏ
                              </button>
                            </>
                          ) : (
                            <div className="bg-emerald-50 border border-emerald-100 p-2.5 rounded-xl text-left space-y-1 w-full sm:w-auto">
                              <p className="text-[10px] text-emerald-800 font-bold uppercase tracking-wide">Mật khẩu tạm đã cấp:</p>
                              <div className="flex items-center gap-2">
                                <code className="bg-white border border-emerald-200 px-2 py-1 rounded font-mono text-xs font-black text-emerald-700 select-all">
                                  {req.tempPassword}
                                </code>
                                <button
                                  onClick={() => {
                                    navigator.clipboard.writeText(req.tempPassword);
                                    setNotification({ message: 'Đã sao chép mật khẩu tạm vào bộ nhớ tạm!', type: 'success' });
                                  }}
                                  className="text-[10px] font-bold text-indigo-600 hover:underline"
                                >
                                  Sao chép
                                </button>
                              </div>
                              <button 
                                onClick={() => {
                                  navigator.clipboard.writeText(`Chào em/anh/chị, mật khẩu tạm thời mới của em trên hệ thống là: ${req.tempPassword}`);
                                  setNotification({ message: 'Đã sao chép tin nhắn thông báo mật khẩu!', type: 'success' });
                                }}
                                className="mt-1 text-[10px] font-bold text-emerald-700 hover:underline flex items-center gap-1"
                              >
                                <Copy className="w-3 h-3" /> Sao chép thông tin thông báo
                              </button>
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Selected Student Detail Card */}
        <div className="lg:col-span-1">
          {selectedStudent ? (
            <div className="bg-white rounded-3xl border border-slate-200 shadow-sm p-6 space-y-5">
              <div className="flex items-center gap-3 border-b border-slate-100 pb-4">
                <div className="w-12 h-12 bg-indigo-100 rounded-2xl flex items-center justify-center font-bold text-indigo-700 text-lg">
                  {selectedStudent.studentName.charAt(0)}
                </div>
                <div>
                  <h4 className="font-bold text-slate-900 text-base">{selectedStudent.studentName}</h4>
                  <p className="text-xs text-indigo-600 font-semibold">{selectedStudent.className || '123456'}</p>
                </div>
              </div>

              <div className="space-y-3 text-xs">
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-100 space-y-1.5">
                  <p className="font-bold text-slate-800 flex items-center gap-1.5">
                    <Phone className="w-3.5 h-3.5 text-indigo-600" /> SĐT Học sinh: <span className="text-indigo-700">{selectedStudent.phoneStudent || '0987654321'}</span>
                  </p>
                  <p className="font-bold text-slate-800 flex items-center gap-1.5">
                    <User className="w-3.5 h-3.5 text-indigo-600" /> SĐT Phụ huynh: <span className="text-indigo-700">{selectedStudent.phoneParent || '0912345678'}</span>
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-3 pt-2">
                  <div className="p-3 bg-indigo-50 border border-indigo-100 rounded-xl text-center">
                    <p className="text-[10px] text-indigo-700 font-bold uppercase">Điểm TB học tập</p>
                    <p className="text-xl font-black text-indigo-900 mt-1">{selectedStudent.averageGrade.toFixed(1)}</p>
                  </div>
                  <div className="p-3 bg-emerald-50 border border-emerald-100 rounded-xl text-center">
                    <p className="text-[10px] text-emerald-700 font-bold uppercase">Tỉ lệ hoàn thành</p>
                    <p className="text-xl font-black text-emerald-900 mt-1">{selectedStudent.completionRate}%</p>
                  </div>
                </div>

                {selectedStudent.monthlyProgress && (
                  <div className="pt-2 space-y-3">
                    <p className="font-bold text-slate-800">Biểu đồ tiến độ học tập:</p>
                    <div className="h-60 w-full bg-slate-50 border border-slate-100 rounded-xl p-3">
                      <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={selectedStudent.monthlyProgress} margin={{ top: 10, right: 10, bottom: 0, left: -20 }}>
                          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                          <XAxis 
                            dataKey="month" 
                            tick={{fontSize: 10, fill: '#64748b', fontWeight: 'bold'}} 
                            axisLine={false} 
                            tickLine={false} 
                            dy={10}
                          />
                          <YAxis 
                            domain={[0, 10]} 
                            tick={{fontSize: 10, fill: '#64748b', fontWeight: 'bold'}} 
                            axisLine={false} 
                            tickLine={false} 
                            dx={-10}
                          />
                          <Tooltip 
                            contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)', fontSize: '11px', fontWeight: 'bold' }}
                          />
                          <Legend wrapperStyle={{ fontSize: '10px', fontWeight: 'bold', paddingTop: '10px' }} iconType="circle" />
                          <Line type="monotone" name="Trung bình" dataKey="average" stroke="#4f46e5" strokeWidth={3} dot={{ r: 4, strokeWidth: 2 }} activeDot={{ r: 6 }} />
                          <Line type="monotone" name="Trắc nghiệm" dataKey="quizScore" stroke="#10b981" strokeWidth={2} dot={{ r: 3 }} />
                          <Line type="monotone" name="Mô phỏng" dataKey="simScore" stroke="#f59e0b" strokeWidth={2} dot={{ r: 3 }} />
                        </LineChart>
                      </ResponsiveContainer>
                    </div>
                    
                    <div className="space-y-2 mt-4">
                      {selectedStudent.monthlyProgress.map((m, idx) => (
                        <div key={idx} className="p-2.5 bg-slate-50 rounded-xl border border-slate-100 flex justify-between items-center text-[11px]">
                          <span className="font-bold text-slate-800">{m.month}</span>
                          <span className="text-indigo-700 font-bold">Trắc nghiệm: {m.quizScore} | Mô phỏng: {m.simScore}</span>
                          <span className="bg-indigo-100 text-indigo-800 px-2 py-0.5 rounded font-extrabold">{m.average} đ</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <a 
                  href={`tel:${selectedStudent.phoneParent || '0912345678'}`}
                  className="w-full mt-3 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl flex items-center justify-center gap-2 shadow-sm transition-colors"
                >
                  <Phone className="w-4 h-4" />
                  Gọi điện trực tiếp Phụ huynh
                </a>
              </div>
            </div>
          ) : (
            <div className="p-6 bg-white rounded-3xl border border-slate-200 text-center text-slate-400 text-xs italic">
              Chọn học sinh từ danh sách để xem chi tiết.
            </div>
          )}
        </div>

      </div>

      {/* Center-Zoom Confirm Modal for Reset Request Rejection */}
      <ConfirmModal
        isOpen={!!rejectConfirmId}
        onClose={() => setRejectConfirmId(null)}
        onConfirm={confirmRejectRequest}
        title="Xác nhận từ chối yêu cầu"
        message="Bạn có chắc chắn muốn từ chối và xóa yêu cầu cấp lại mật khẩu này không?"
        confirmText="Xóa yêu cầu"
        cancelText="Hủy bỏ"
        variant="danger"
        loading={rejecting}
      />

    </div>
  );
}
