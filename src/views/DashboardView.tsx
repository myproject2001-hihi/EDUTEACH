import React from 'react';
import { User, Assignment, Submission, ClassSession } from '../types';
import { 
  format, 
  startOfMonth, 
  endOfMonth, 
  startOfWeek, 
  endOfWeek, 
  eachDayOfInterval, 
  isSameDay, 
  isToday, 
  addMonths, 
  subMonths,
  isSameMonth
} from 'date-fns';
import { vi } from 'date-fns/locale';
import { BookOpen, CheckCircle, Clock, Video, AlertCircle, TrendingUp, Calendar, ArrowRight, Play, UserCheck } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';

interface DashboardProps {
  user: User;
  assignments: Assignment[];
  submissions: Submission[];
  classes: ClassSession[];
  onNavigate: (tab: string) => void;
  onSelectAssignment?: (assignmentId: string) => void;
}

export function DashboardView({ user, assignments: rawAssignments, submissions, classes: rawClasses, onNavigate, onSelectAssignment }: DashboardProps) {
  const isAdmin = user.role === 'admin';
  const isTeacher = user.role === 'teacher' || isAdmin;
  const [className, setClassName] = React.useState(() => localStorage.getItem('class_name') || '123456');

  const assignments = React.useMemo(() => {
    if (isAdmin) return rawAssignments;
    if (user.role === 'teacher') return rawAssignments.filter(a => !a.teacherId || a.teacherId === user.id);
    return rawAssignments;
  }, [rawAssignments, user, isAdmin]);

  const classes = React.useMemo(() => {
    if (isAdmin) return rawClasses;
    if (user.role === 'teacher') return rawClasses.filter(c => !c.teacherId || c.teacherId === user.id);
    return rawClasses;
  }, [rawClasses, user, isAdmin]);

  React.useEffect(() => {
    const handleStorageChange = () => {
      setClassName(localStorage.getItem('class_name') || '123456');
    };
    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, []);

  // Interactive Mini Calendar States
  const [currentMonth, setCurrentMonth] = React.useState<Date>(new Date());
  const [selectedDate, setSelectedDate] = React.useState<Date>(new Date());
  const [dashboardNotes, setDashboardNotes] = React.useState<Record<string, string>>({
    [format(new Date(), 'yyyy-MM-dd')]: 'Ôn tập công thức Toán & chuẩn bị vào phòng học trực tuyến đúng giờ.',
    '2026-08-06': 'Giao bài tập Đại số - Tiết 24 trước buổi học tiếp theo.',
    '2026-08-10': 'Kiểm tra trắc nghiệm Online: Phương trình lượng giác.',
  });
  const [newNoteText, setNewNoteText] = React.useState('');

  // Stats calculation
  const mySubmissions = submissions.filter(s => s.studentId === user.id);
  const nextClass = classes.find(c => new Date(c.endTime) >= new Date()) || classes[0];

  // Monthly progress mock data for student progress graph
  const monthlyProgressData = [
    { month: 'Tháng 8', diemKiemTra: 8.0, diemMoPhong: 8.5, trungBinh: 8.2 },
    { month: 'Tháng 9', diemKiemTra: 8.8, diemMoPhong: 9.0, trungBinh: 8.9 },
    { month: 'Tháng 10', diemKiemTra: 9.2, diemMoPhong: 9.5, trungBinh: 9.3 },
  ];

  // Teacher status logic
  const recentAssignment = assignments[0];
  const submittedCountForRecent = submissions.filter(s => s.assignmentId === recentAssignment?.id).length;
  const totalStudents = 3; // mock 3 students

  return (
    <div className="space-y-8 max-w-7xl mx-auto pb-6">
      
      {/* 1. KHUNG XIN CHÀO (Greeting Banner) */}
      <div className="bg-gradient-to-r from-indigo-600 via-indigo-700 to-blue-600 rounded-3xl p-6 sm:p-8 border border-indigo-500/30 relative overflow-hidden shadow-lg shadow-indigo-200 text-white">
        <div className="absolute top-0 right-0 w-[400px] h-[400px] bg-white/10 blur-[80px] rounded-full pointer-events-none transform translate-x-1/3 -translate-y-1/3"></div>
        <div className="relative z-10">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/15 border border-white/20 mb-3 backdrop-blur-md">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
              <span className="text-xs font-semibold text-white">
                {isTeacher ? `Giáo viên - ${className}` : className}
              </span>
            </div>
            <h2 className="text-2xl sm:text-3xl md:text-4xl font-extrabold tracking-tight">
              Xin chào, <span className="text-indigo-200">{user.name}</span>!
            </h2>
            <p className="text-indigo-100 text-sm md:text-base mt-2 max-w-2xl leading-relaxed">
              {isTeacher 
                ? 'Chúc cô một ngày làm việc tràn đầy năng lượng! Dưới đây là tổng quan các nhiệm vụ dạy học và tình trạng làm bài của lớp.' 
                : 'Chúc em có một ngày học tập thật tốt! Hãy hoàn thành nhiệm vụ buổi học trước khi vào buổi học tiếp theo nhé.'}
            </p>
          </div>
        </div>
      </div>

      {/* Main Dashboard Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* LEFT 2 COLUMNS */}
        <div className="lg:col-span-2 space-y-8">
          
          {/* STUDENT VIEW: NHIỆM VỤ (Assignments task list) */}
          {!isTeacher ? (
            <div className="bg-white rounded-3xl border border-slate-200/80 p-6 shadow-sm">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h3 className="text-xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
                    <BookOpen className="w-5 h-5 text-indigo-600" />
                    Nhiệm Vụ Buổi Học
                  </h3>
                  <p className="text-xs text-slate-500 mt-1">Nơi học sinh làm bài tập từ giáo viên, bắt buộc phải hoàn thành trước buổi học tiếp theo</p>
                </div>
                <button 
                  onClick={() => onNavigate('assignments')}
                  className="text-xs font-bold text-indigo-600 hover:text-indigo-800 flex items-center gap-1 hover:underline"
                >
                  Xem tất cả <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>

              <div className="space-y-4">
                {assignments.map(assignment => {
                  const isSubmitted = mySubmissions.some(s => s.assignmentId === assignment.id);
                  const isPastDue = new Date(assignment.dueDate) < new Date();

                  return (
                    <div 
                      key={assignment.id}
                      onClick={() => {
                        if (onSelectAssignment) {
                          onSelectAssignment(assignment.id);
                        }
                        onNavigate('assignments');
                      }}
                      className={`p-4 sm:p-5 rounded-2xl border transition-all cursor-pointer flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 ${
                        isSubmitted 
                          ? 'bg-emerald-50/50 border-emerald-200 hover:border-emerald-300' 
                          : isPastDue
                          ? 'bg-rose-50/50 border-rose-200 hover:border-rose-300'
                          : 'bg-slate-50/70 border-slate-200 hover:border-indigo-300 hover:shadow-sm'
                      }`}
                    >
                      <div className="flex items-start gap-3.5 flex-1 min-w-0">
                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 font-bold ${
                          isSubmitted ? 'bg-emerald-100 text-emerald-700' : isPastDue ? 'bg-rose-100 text-rose-700' : 'bg-indigo-100 text-indigo-700'
                        }`}>
                          {isSubmitted ? <CheckCircle className="w-5 h-5" /> : assignment.type === 'simulation' ? <Play className="w-5 h-5" /> : <BookOpen className="w-5 h-5" />}
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <h4 className="font-bold text-slate-900 text-sm sm:text-base line-clamp-1">{assignment.title}</h4>
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-200/80 text-slate-700">
                              {assignment.type === 'online_test' ? 'Kiểm tra Online' : assignment.type === 'simulation' ? 'Mô phỏng' : 'Nộp bài'}
                            </span>
                          </div>
                          <p className="text-xs text-slate-500 mt-1 flex items-center gap-1.5 font-medium">
                            <Clock className="w-3.5 h-3.5 text-slate-400" />
                            Hạn nộp: <strong className="text-slate-700">{format(new Date(assignment.dueDate), 'HH:mm dd/MM', { locale: vi })}</strong>
                            {assignment.classSessionTitle && (
                              <span className="text-indigo-600 font-semibold">• {assignment.classSessionTitle}</span>
                            )}
                          </p>
                        </div>
                      </div>

                      <div className="shrink-0 flex items-center gap-3 w-full sm:w-auto justify-between sm:justify-end border-t sm:border-t-0 pt-2 sm:pt-0 border-slate-200">
                        {isSubmitted ? (
                          <span className="bg-emerald-100 text-emerald-800 text-xs font-bold px-3 py-1.5 rounded-xl border border-emerald-200 flex items-center gap-1">
                            <CheckCircle className="w-3.5 h-3.5" /> Đã hoàn thành
                          </span>
                        ) : isPastDue ? (
                          <span className="bg-rose-100 text-rose-800 text-xs font-bold px-3 py-1.5 rounded-xl border border-rose-200 flex items-center gap-1">
                            <AlertCircle className="w-3.5 h-3.5" /> Quá hạn (Trừ điểm)
                          </span>
                        ) : (
                          <button className="w-full sm:w-auto px-4 py-2 bg-indigo-600 text-white font-bold text-xs rounded-xl hover:bg-indigo-700 transition-colors shadow-sm">
                            Làm ngay
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ) : (
            /* TEACHER VIEW: KHUNG TÌNH TRẠNG HỌC SINH HOÀN THÀNH BÀI TẬP */
            <div className="bg-white rounded-3xl border border-slate-200/80 p-6 shadow-sm">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h3 className="text-xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
                    <UserCheck className="w-5 h-5 text-indigo-600" />
                    Tình Trạng Hoàn Thành Bài Tập Của Học Sinh
                  </h3>
                  <p className="text-xs text-slate-500 mt-1">Thống kê chi tiết tỉ lệ làm bài theo từng buổi học</p>
                </div>
                <button 
                  onClick={() => onNavigate('assignments')}
                  className="text-xs font-bold text-indigo-600 hover:text-indigo-800 hover:underline flex items-center gap-1"
                >
                  Quản lý bài tập <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
                <div className="p-4 bg-indigo-50/70 border border-indigo-100 rounded-2xl flex items-center gap-4">
                  <div className="w-12 h-12 bg-indigo-600 text-white rounded-xl flex items-center justify-center font-bold text-lg shadow-sm">
                    {submittedCountForRecent}/{totalStudents}
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-indigo-900">Bài tập mới nhất</p>
                    <p className="text-sm font-bold text-slate-900 line-clamp-1">{recentAssignment?.title || 'Chưa có'}</p>
                    <p className="text-xs text-indigo-700 font-medium mt-0.5">Tỉ lệ hoàn thành: {Math.round((submittedCountForRecent / totalStudents) * 100)}%</p>
                  </div>
                </div>

                <div className="p-4 bg-amber-50/70 border border-amber-200 rounded-2xl flex items-center gap-4">
                  <div className="w-12 h-12 bg-amber-500 text-white rounded-xl flex items-center justify-center font-bold text-lg shadow-sm">
                    {totalStudents - submittedCountForRecent}
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-amber-900">Học sinh chưa nộp</p>
                    <p className="text-sm font-bold text-slate-900">Cần nhắc nhở qua Zalo</p>
                    <p className="text-xs text-amber-800 font-medium mt-0.5">Phạm Quang Sáng (0966554433)...</p>
                  </div>
                </div>
              </div>

              <div className="border border-slate-200 rounded-2xl overflow-hidden">
                <div className="bg-slate-50 px-4 py-3 font-bold text-xs text-slate-700 border-b border-slate-200 flex justify-between">
                  <span>Tên bài tập do cô giao</span>
                  <span>Tình trạng lớp</span>
                </div>
                <div className="divide-y divide-slate-100">
                  {assignments.map(a => {
                    const subs = submissions.filter(s => s.assignmentId === a.id);
                    const rate = Math.round((subs.length / totalStudents) * 100);

                    return (
                      <div key={a.id} className="p-4 flex items-center justify-between gap-4 hover:bg-slate-50/50 transition-colors">
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-bold text-slate-900 truncate">{a.title}</p>
                          <p className="text-xs text-slate-500 mt-0.5">Hạn: {format(new Date(a.dueDate), 'HH:mm dd/MM/yyyy', { locale: vi })}</p>
                        </div>
                        <div className="flex items-center gap-3">
                          <div className="w-24 bg-slate-200 rounded-full h-2 hidden sm:block">
                            <div className="bg-indigo-600 h-2 rounded-full" style={{ width: `${rate}%` }}></div>
                          </div>
                          <span className="text-xs font-bold text-indigo-700 bg-indigo-50 border border-indigo-100 px-2.5 py-1 rounded-lg">
                            {subs.length}/{totalStudents} nộp ({rate}%)
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {/* STUDENT VIEW: TIẾN ĐỘ HỌC TẬP (Quiz + Simulation Monthly Progress Chart) */}
          {!isTeacher && (
            <div className="bg-white rounded-3xl border border-slate-200/80 p-6 shadow-sm">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h3 className="text-xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
                    <TrendingUp className="w-5 h-5 text-indigo-600" />
                    Tiến Độ Học Tập Chi Tiết
                  </h3>
                  <p className="text-xs text-slate-500 mt-1">Kết quả kiểm tra trắc nghiệm & điểm mô phỏng tương tác theo từng tháng</p>
                </div>
              </div>

              <div className="h-72 w-full mt-2">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={monthlyProgressData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                    <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 12, fontWeight: 600 }} dy={8} />
                    <YAxis axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 12 }} domain={[0, 10]} />
                    <Tooltip contentStyle={{ borderRadius: '16px', border: '1px solid #e2e8f0', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)' }} />
                    <Legend wrapperStyle={{ paddingTop: '10px', fontSize: '12px', fontWeight: 'bold' }} />
                    <Bar dataKey="diemKiemTra" name="Bài kiểm tra trắc nghiệm" fill="#4f46e5" radius={[4, 4, 0, 0]} barSize={24} />
                    <Bar dataKey="diemMoPhong" name="Thực hành Mô phỏng" fill="#10b981" radius={[4, 4, 0, 0]} barSize={24} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}

        </div>

        {/* RIGHT COLUMN (DYNAMIC CALENDAR & CLASSROOM DETAILS) */}
        <div className="space-y-8">
          
          {/* DYNAMIC INTERACTIVE CALENDAR */}
          <div className="bg-white rounded-3xl border border-slate-200/80 p-6 shadow-sm flex flex-col space-y-5">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-bold text-slate-900 tracking-tight flex items-center gap-2">
                <Calendar className="w-5 h-5 text-indigo-600" />
                Lịch Học & Ghi Chú
              </h3>
              <button 
                onClick={() => onNavigate('schedule')}
                className="text-xs font-bold text-indigo-600 hover:text-indigo-800 hover:underline"
              >
                Mở phòng học
              </button>
            </div>

            {/* Calendar Controller Header */}
            <div className="flex items-center justify-between bg-slate-50 px-3 py-2 rounded-xl border border-slate-100">
              <button 
                type="button"
                onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}
                className="text-slate-600 hover:text-indigo-600 hover:bg-white p-1 rounded-lg transition-all font-bold"
              >
                &larr;
              </button>
              <span className="text-xs font-extrabold text-slate-800 uppercase tracking-wider">
                {format(currentMonth, 'MMMM yyyy', { locale: vi })}
              </span>
              <button 
                type="button"
                onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}
                className="text-slate-600 hover:text-indigo-600 hover:bg-white p-1 rounded-lg transition-all font-bold"
              >
                &rarr;
              </button>
            </div>

            {/* Month Day Grid */}
            <div>
              {/* Day names */}
              <div className="grid grid-cols-7 gap-1 text-center text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">
                <span>T2</span>
                <span>T3</span>
                <span>T4</span>
                <span>T5</span>
                <span>T6</span>
                <span>T7</span>
                <span>CN</span>
              </div>

              {/* Day cells */}
              <div className="grid grid-cols-7 gap-1 text-center">
                {(() => {
                  const mStart = startOfMonth(currentMonth);
                  const mEnd = endOfMonth(mStart);
                  const sDate = startOfWeek(mStart, { weekStartsOn: 1 });
                  const eDate = endOfWeek(mEnd, { weekStartsOn: 1 });
                  const days = eachDayOfInterval({ start: sDate, end: eDate });

                  return days.map((day, idx) => {
                    const formattedDayStr = format(day, 'yyyy-MM-dd');
                    const hasNote = !!dashboardNotes[formattedDayStr];
                    const hasSession = classes.some(c => isSameDay(new Date(c.startTime), day));
                    const isSelected = isSameDay(day, selectedDate);
                    const isCurrentMonth = isSameMonth(day, currentMonth);

                    return (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => setSelectedDate(day)}
                        className={`aspect-square w-full rounded-lg text-xs font-bold transition-all relative flex flex-col items-center justify-center ${
                          isSelected 
                            ? 'bg-indigo-600 text-white shadow-md shadow-indigo-100 scale-105 z-10' 
                            : isToday(day)
                            ? 'bg-indigo-50 text-indigo-700 border border-indigo-200'
                            : isCurrentMonth
                            ? 'text-slate-700 hover:bg-slate-50'
                            : 'text-slate-300 hover:bg-slate-50/50'
                        }`}
                      >
                        <span>{format(day, 'd')}</span>
                        {/* Dot Indicators */}
                        <div className="flex gap-0.5 absolute bottom-1">
                          {hasSession && (
                            <span className={`w-1 h-1 rounded-full ${isSelected ? 'bg-white' : 'bg-indigo-500'}`}></span>
                          )}
                          {hasNote && (
                            <span className={`w-1 h-1 rounded-full ${isSelected ? 'bg-white' : 'bg-emerald-500'}`}></span>
                          )}
                        </div>
                      </button>
                    );
                  });
                })()}
              </div>
            </div>

            {/* Note Display for Selected Day */}
            <div className="bg-slate-50 border border-slate-100 rounded-2xl p-4 space-y-3">
              <p className="text-xs font-bold text-slate-800">
                Ngày {format(selectedDate, 'dd/MM/yyyy')} có gì?
              </p>

              {/* Class scheduled for selected date */}
              {(() => {
                const daySessions = classes.filter(c => isSameDay(new Date(c.startTime), selectedDate));
                if (daySessions.length > 0) {
                  return daySessions.map(c => (
                    <div key={c.id} className="bg-white p-2.5 rounded-xl border border-indigo-100 text-xs flex justify-between items-center">
                      <div>
                        <p className="font-extrabold text-indigo-900">{c.title}</p>
                        <p className="text-[10px] text-slate-500 font-medium mt-0.5">{format(new Date(c.startTime), 'HH:mm')} - Trực tuyến</p>
                      </div>
                      <a 
                        href={c.link} 
                        target="_blank" 
                        rel="noreferrer" 
                        className="text-[10px] bg-indigo-600 text-white font-bold px-2 py-1 rounded-lg hover:bg-indigo-700"
                      >
                        Vào Meet
                      </a>
                    </div>
                  ));
                }
                return null;
              })()}

              {/* Study Note scheduled for selected date */}
              <div className="text-xs text-slate-600 bg-white p-2.5 rounded-xl border border-slate-200/60 leading-relaxed italic">
                {dashboardNotes[format(selectedDate, 'yyyy-MM-dd')] ? (
                  <p className="font-medium text-slate-700 not-italic">
                    📌 {dashboardNotes[format(selectedDate, 'yyyy-MM-dd')]}
                  </p>
                ) : (
                  <p>Không có ghi chú nhắc nhở học tập nào.</p>
                )}
              </div>

              {/* Add Note inline form for Teacher */}
              {isTeacher && (
                <div className="space-y-1.5 pt-2 border-t border-slate-200/50">
                  <input 
                    type="text" 
                    value={newNoteText}
                    onChange={e => setNewNoteText(e.target.value)}
                    placeholder="Thêm ghi chú cho ngày này..."
                    className="w-full px-2.5 py-1.5 text-xs bg-white text-slate-900 border border-slate-300 rounded-xl outline-none focus:ring-1 focus:ring-indigo-500 font-medium"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      if (newNoteText.trim()) {
                        setDashboardNotes({
                          ...dashboardNotes,
                          [format(selectedDate, 'yyyy-MM-dd')]: newNoteText.trim()
                        });
                        setNewNoteText('');
                      }
                    }}
                    className="w-full py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-[10px] rounded-xl shadow-sm transition-all uppercase"
                  >
                    Lưu ghi chú nhắc học
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* NEXT CLASSROOM (BẮT BUỘC) */}
          {nextClass && (
            <div className="bg-gradient-to-br from-indigo-50 to-blue-50 border border-indigo-100 rounded-3xl p-6 shadow-sm relative overflow-hidden flex flex-col justify-between">
              <div className="relative z-10">
                <span className="bg-indigo-600 text-white text-[10px] font-bold px-2.5 py-1 rounded-full uppercase tracking-wider mb-3 inline-block">
                  Phòng học trực tuyến tiếp theo
                </span>
                <h4 className="font-extrabold text-slate-900 text-base mb-1">{nextClass.title}</h4>
                <p className="text-xs text-indigo-900 font-semibold mb-4">{nextClass.subject || 'Môn Toán'}</p>
                
                <div className="space-y-2 text-xs text-slate-600 mb-5 bg-white/95 p-3 rounded-2xl border border-indigo-100">
                  <div className="flex items-center gap-2 font-bold text-slate-800">
                    <Clock className="w-4 h-4 text-indigo-600 shrink-0" />
                    <span>{format(new Date(nextClass.startTime), 'EEEE, dd/MM - HH:mm', { locale: vi })}</span>
                  </div>
                  {nextClass.note && (
                    <p className="text-[11px] text-slate-500 italic mt-1 leading-normal border-t border-slate-100 pt-1">
                      💡 {nextClass.note}
                    </p>
                  )}
                </div>
              </div>

              <a 
                href={nextClass.link}
                target="_blank"
                rel="noreferrer"
                className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-xl flex items-center justify-center gap-2 shadow-md transition-all uppercase tracking-wider font-semibold"
              >
                <Video className="w-4 h-4" />
                Vào học ngay
              </a>
            </div>
          )}

        </div>

      </div>

    </div>
  );
}
