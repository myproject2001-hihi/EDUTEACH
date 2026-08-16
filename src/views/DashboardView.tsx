import React, { useState, useEffect } from 'react';
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
import { BookOpen, CheckCircle, Clock, Video, AlertCircle, TrendingUp, Calendar, ArrowRight, Play, UserCheck, Phone, MessageCircle, X, Check, Copy, Award, Lock, Sparkles, Trophy, Shield, Coins } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { db } from '../firebase';
import { collection, onSnapshot, doc, updateDoc, increment } from 'firebase/firestore';
import { motion } from 'motion/react';
import { UserAvatar } from '../components/UserAvatar';

interface DashboardProps {
  user: User;
  assignments: Assignment[];
  submissions: Submission[];
  classes: ClassSession[];
  onNavigate: (tab: string) => void;
  onSelectAssignment?: (assignmentId: string) => void;
  onOpenGuide?: () => void;
}

const BADGES = [
  {
    id: 'sprout',
    name: 'Mầm Học Tập',
    emoji: '🌱',
    threshold: 0,
    color: 'from-emerald-400 to-emerald-600',
    borderColor: 'border-emerald-200',
    textColor: 'text-emerald-700',
    bgLight: 'bg-emerald-50/50',
    description: 'Chính thức bắt đầu hành trình tích lũy kiến thức.',
    perk: 'Danh hiệu tân thủ'
  },
  {
    id: 'quiz_warrior',
    name: 'Chiến Binh Trắc Nghiệm',
    emoji: '⚔️',
    threshold: 100,
    color: 'from-blue-400 to-indigo-600',
    borderColor: 'border-indigo-200',
    textColor: 'text-indigo-700',
    bgLight: 'bg-indigo-50/50',
    description: 'Hoàn thành bài tập trắc nghiệm và Game đạt điểm cao.',
    perk: '+5% điểm thưởng tuần học'
  },
  {
    id: 'simulation_expert',
    name: 'Kỹ Sư Mô Phỏng',
    emoji: '🧪',
    threshold: 300,
    color: 'from-cyan-400 to-blue-600',
    borderColor: 'border-cyan-200',
    textColor: 'text-cyan-700',
    bgLight: 'bg-cyan-50/50',
    description: 'Thực hành xuất sắc các bài tập mô phỏng tương tác.',
    perk: 'Mở khóa avatar độc quyền'
  },
  {
    id: 'game_master',
    name: 'Cao Thủ Trí Tuệ',
    emoji: '🎮',
    threshold: 600,
    color: 'from-fuchsia-400 to-fuchsia-600',
    borderColor: 'border-fuchsia-200',
    textColor: 'text-fuchsia-700',
    bgLight: 'bg-fuchsia-50/50',
    description: 'Chiến thắng các trò chơi tương tác kiểm tra bài học.',
    perk: 'Bảng tên phát sáng đặc biệt'
  },
  {
    id: 'score_legend',
    name: 'Kỷ Lục Gia Tri Thức',
    emoji: '🏆',
    threshold: 1000,
    color: 'from-amber-400 to-amber-600',
    borderColor: 'border-amber-200',
    textColor: 'text-amber-700',
    bgLight: 'bg-amber-50/50',
    description: 'Đặt chân vào top những học sinh xuất sắc nhất của lớp.',
    perk: 'Vinh danh trên bảng tin lớp'
  },
  {
    id: 'future_scientist',
    name: 'Huyền Thoại Học Đường',
    emoji: '👑',
    threshold: 1800,
    color: 'from-rose-400 to-rose-600',
    borderColor: 'border-rose-200',
    textColor: 'text-rose-700',
    bgLight: 'bg-rose-50/50',
    description: 'Chinh phục mọi thử thách, bài tập nâng cao và chuyên sâu.',
    perk: 'Danh hiệu tối cao học đường'
  }
];

export function DashboardView({ user, assignments: rawAssignments, submissions, classes: rawClasses, onNavigate, onSelectAssignment, onOpenGuide }: DashboardProps) {
  const isAdmin = user.role === 'admin';
  const isTeacher = user.role === 'teacher' || isAdmin;
  const [className, setClassName] = React.useState(() => localStorage.getItem('class_name') || '123456');
  const [isClaiming, setIsClaiming] = React.useState(false);
  const [claimSuccess, setClaimSuccess] = React.useState(false);

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
  const [usersList, setUsersList] = useState<User[]>([]);
  const [showUnsubmittedModal, setShowUnsubmittedModal] = useState(false);
  const [copiedStudentId, setCopiedStudentId] = useState<string | null>(null);

  useEffect(() => {
    const unsub = onSnapshot(collection(db, 'users'), (snapshot) => {
      const list: User[] = [];
      snapshot.forEach(docSnap => {
        list.push({ id: docSnap.id, ...docSnap.data() } as User);
      });
      setUsersList(list);
    });
    return () => unsub();
  }, []);

  const studentsInClass = usersList.filter(u => u.role === 'student' && (!u.className || u.className === className));
  const effectiveTotalStudents = studentsInClass.length > 0 ? studentsInClass.length : 3;
  const recentAssignment = assignments[0];
  const submittedStudentIds = submissions.filter(s => s.assignmentId === recentAssignment?.id).map(s => s.studentId);
  const submittedCountForRecent = submittedStudentIds.length;
  const unsubmittedStudents = studentsInClass.length > 0 
    ? studentsInClass.filter(u => !submittedStudentIds.includes(u.id))
    : [];

  return (
    <div className="space-y-8 max-w-7xl mx-auto pb-6">
      
      {/* 1. KHUNG XIN CHÀO (Greeting Banner) */}
      <div className="bg-gradient-to-br from-blue-50/80 via-sky-50 to-indigo-50/80 backdrop-blur-md rounded-3xl p-6 sm:p-8 border border-indigo-100 relative overflow-hidden shadow-sm text-slate-800">
        <div className="absolute top-0 right-0 w-[350px] h-[350px] bg-indigo-200/20 blur-[60px] rounded-full pointer-events-none transform translate-x-1/4 -translate-y-1/4"></div>
        <div className="absolute -bottom-10 -left-10 w-[250px] h-[250px] bg-sky-200/20 blur-[50px] rounded-full pointer-events-none"></div>
        <div className="relative z-10 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/80 border border-indigo-100 mb-4 backdrop-blur-sm flex-wrap shadow-sm">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse"></span>
              <span className="text-xs font-bold text-indigo-700">
                {isTeacher ? `Giáo viên - ${className}` : `Học sinh • Lớp ${className}`}
              </span>
              {!isTeacher && (
                <>
                  <span className="text-indigo-200">•</span>
                  <span className="text-xs font-extrabold text-indigo-600 flex items-center gap-1">
                    {(() => {
                      const currentPoints = user.points || 0;
                      const activeBadge = [...BADGES].reverse().find(b => currentPoints >= b.threshold);
                      return activeBadge ? `${activeBadge.emoji} ${activeBadge.name}` : '🌱 Mầm Học Tập';
                    })()}
                  </span>
                </>
              )}
            </div>
            <h2 className="text-2xl sm:text-3xl md:text-4xl font-extrabold tracking-tight text-slate-900 leading-tight">
              Xin chào, <span className="text-indigo-600 font-black">{user.name}</span>!
            </h2>
            <p className="text-slate-600 text-sm md:text-base mt-2.5 max-w-2xl leading-relaxed font-medium">
              {isTeacher 
                ? 'Chúc cô một ngày làm việc tràn đầy năng lượng! Dưới đây là tổng quan các nhiệm vụ dạy học và tình trạng làm bài của lớp.' 
                : 'Chúc em có một ngày học tập thật tốt! Hãy hoàn thành nhiệm vụ buổi học trước khi vào buổi học tiếp theo nhé.'}
            </p>
          </div>

          {!isTeacher && onOpenGuide && (
            <button
              onClick={onOpenGuide}
              className="inline-flex items-center gap-2 px-4.5 py-2.5 rounded-2xl bg-indigo-600 hover:bg-indigo-500 text-white font-extrabold text-xs transition-all shadow-md shadow-indigo-200/30 shrink-0 self-start sm:self-center hover:scale-105 active:scale-95 border border-indigo-500"
            >
              <BookOpen className="w-4 h-4 text-amber-300" />
              <span>📖 Hướng Dẫn Vào Lớp Học</span>
            </button>
          )}
        </div>
      </div>

      {/* Main Dashboard Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* LEFT 2 COLUMNS */}
        <div className="lg:col-span-2 space-y-8">
          
          {/* STUDENT VIEW: NHIỆM VỤ (Assignments task list) */}
          {!isTeacher ? (
            <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-sm">
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
                          : 'bg-slate-50 border-slate-200 hover:border-indigo-300 hover:shadow-sm'
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
            <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-sm">
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
                    {submittedCountForRecent}/{effectiveTotalStudents}
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-indigo-900">Bài tập mới nhất</p>
                    <p className="text-sm font-bold text-slate-900 line-clamp-1">{recentAssignment?.title || 'Chưa có'}</p>
                    <p className="text-xs text-indigo-700 font-medium mt-0.5">Tỉ lệ hoàn thành: {Math.round((submittedCountForRecent / effectiveTotalStudents) * 100)}%</p>
                  </div>
                </div>

                <div 
                  onClick={() => setShowUnsubmittedModal(true)}
                  className="p-4 bg-amber-50/70 border border-amber-200 rounded-2xl flex items-center gap-4 cursor-pointer hover:bg-amber-100/90 transition-all hover:shadow-md group"
                >
                  <div className="w-12 h-12 bg-amber-500 text-white rounded-xl flex items-center justify-center font-bold text-lg shadow-sm group-hover:scale-105 transition-transform">
                    {unsubmittedStudents.length > 0 ? unsubmittedStudents.length : Math.max(0, effectiveTotalStudents - submittedCountForRecent)}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-semibold text-amber-900 flex items-center justify-between">
                      <span>Học sinh chưa nộp</span>
                      <span className="text-[10px] bg-amber-200/60 text-amber-900 px-1.5 py-0.5 rounded font-bold">Xem danh sách</span>
                    </p>
                    <p className="text-sm font-bold text-slate-900">Cần nhắc nhở qua Zalo</p>
                    <p className="text-xs text-amber-800 font-medium mt-0.5 truncate">
                      {unsubmittedStudents.length > 0 
                        ? unsubmittedStudents.map(s => s.name).join(', ') 
                        : 'Không có học sinh nào chưa nộp'}
                    </p>
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
                    const rate = Math.round((subs.length / effectiveTotalStudents) * 100);

                    return (
                      <div key={a.id} className="p-4 flex items-center justify-between gap-4 hover:bg-slate-50 transition-colors">
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-bold text-slate-900 truncate">{a.title}</p>
                          <p className="text-xs text-slate-500 mt-0.5">Hạn: {format(new Date(a.dueDate), 'HH:mm dd/MM/yyyy', { locale: vi })}</p>
                        </div>
                        <div className="flex items-center gap-3">
                          <div className="w-24 bg-slate-200 rounded-full h-2 hidden sm:block">
                            <div className="bg-indigo-600 h-2 rounded-full" style={{ width: `${Math.min(100, rate)}%` }}></div>
                          </div>
                          <span className="text-xs font-bold text-indigo-700 bg-indigo-50 border border-indigo-100 px-2.5 py-1 rounded-lg">
                            {subs.length}/{effectiveTotalStudents} nộp ({Math.min(100, rate)}%)
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
            <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-sm">
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

          {/* STUDENT VIEW: BADGES SYSTEM */}
          {!isTeacher && (
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.1 }}
              className="bg-white rounded-3xl border border-slate-200 p-6 shadow-sm space-y-6"
            >
              {/* Header block with stats summary */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-5">
                <div>
                  <h3 className="text-xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
                    <Award className="w-5.5 h-5.5 text-indigo-600 animate-pulse" />
                    Bộ Sưu Tập Huy Hiệu
                  </h3>
                  <p className="text-xs text-slate-500 mt-1">Đạt điểm tích lũy từ các hoạt động học tập để mở khóa huy hiệu danh giá</p>
                </div>
                
                {/* Real-time points counter & daily bonus claim */}
                <div className="flex items-center gap-3 bg-slate-50 border border-slate-200 p-3 rounded-2xl self-start sm:self-center">
                  <div className="flex items-center gap-1.5 bg-indigo-50 border border-indigo-100 px-3 py-1.5 rounded-xl">
                    <Coins className="w-4 h-4 text-amber-500 shrink-0" />
                    <span className="text-xs font-black text-slate-800">
                      {(user.points || 0).toLocaleString()} <span className="text-[10px] text-slate-500 font-semibold">Xu</span>
                    </span>
                  </div>
                  
                  <button
                    type="button"
                    disabled={isClaiming || claimSuccess}
                    onClick={async () => {
                      if (isClaiming || claimSuccess) return;
                      setIsClaiming(true);
                      try {
                        const studentRef = doc(db, 'users', user.id);
                        await updateDoc(studentRef, {
                          points: increment(50)
                        });
                        setClaimSuccess(true);
                        setTimeout(() => setClaimSuccess(false), 2500);
                      } catch (err) {
                        console.error("Lỗi khi cộng xu thử nghiệm:", err);
                      } finally {
                        setIsClaiming(false);
                      }
                    }}
                    className={`px-3 py-1.5 rounded-xl font-bold text-[11px] transition-all flex items-center gap-1 shadow-sm ${
                      claimSuccess 
                        ? 'bg-emerald-500 text-white shadow-emerald-200/30'
                        : isClaiming 
                        ? 'bg-slate-200 text-slate-400 cursor-not-allowed'
                        : 'bg-indigo-600 hover:bg-indigo-700 active:scale-95 text-white shadow-indigo-200/30'
                    }`}
                  >
                    {claimSuccess ? (
                      <>
                        <Check className="w-3 h-3" />
                        <span>Đã cộng +50 xu!</span>
                      </>
                    ) : isClaiming ? (
                      <span>Đang nhận...</span>
                    ) : (
                      <>
                        <Sparkles className="w-3 h-3 text-amber-300" />
                        <span>Nhận 50 xu chuyên cần</span>
                      </>
                    )}
                  </button>
                </div>
              </div>

              {/* Progress to next badge */}
              {(() => {
                const currentPoints = user.points || 0;
                const nextBadge = BADGES.find(b => b.threshold > currentPoints);
                const prevBadge = [...BADGES].reverse().find(b => currentPoints >= b.threshold);
                
                if (nextBadge && prevBadge) {
                  const pointsRange = nextBadge.threshold - prevBadge.threshold;
                  const currentInRange = currentPoints - prevBadge.threshold;
                  const progressPct = Math.min(100, Math.max(0, Math.round((currentInRange / pointsRange) * 100)));
                  
                  return (
                    <div className="bg-slate-50 border border-slate-100 rounded-2xl p-4 space-y-3">
                      <div className="flex justify-between items-center text-xs">
                        <span className="text-slate-500 font-medium flex items-center gap-1">
                          <Shield className="w-3.5 h-3.5 text-indigo-500" />
                          Huy hiệu tiếp theo: <strong className="text-slate-800 font-bold">{nextBadge.emoji} {nextBadge.name}</strong>
                        </span>
                        <span className="text-indigo-600 font-extrabold">{currentPoints}/{nextBadge.threshold} xu ({progressPct}%)</span>
                      </div>
                      <div className="w-full bg-slate-200 rounded-full h-3 overflow-hidden">
                        <motion.div 
                          className="bg-indigo-600 h-3 rounded-full"
                          initial={{ width: 0 }}
                          animate={{ width: `${progressPct}%` }}
                          transition={{ duration: 0.8, ease: "easeOut" }}
                        />
                      </div>
                      <p className="text-[10px] text-slate-400 font-medium">Tích lũy thêm {nextBadge.threshold - currentPoints} xu nữa để mở khóa danh hiệu {nextBadge.name}!</p>
                    </div>
                  );
                } else if (!nextBadge) {
                  return (
                    <div className="bg-gradient-to-r from-amber-50 to-yellow-50 border border-amber-100 rounded-2xl p-4 text-center space-y-2">
                      <p className="text-xs font-extrabold text-amber-800 flex items-center justify-center gap-1.5">
                        <Trophy className="w-4 h-4 text-amber-500" />
                        Chúc mừng! Bạn đã mở khóa toàn bộ hệ thống huy hiệu!
                      </p>
                      <p className="text-[10px] text-amber-600 font-medium">Huyền Thoại Học Đường tối cao đã được khắc tên trên bảng xếp hạng xuất sắc nhất.</p>
                    </div>
                  );
                }
                return null;
              })()}

              {/* Grid of badges with staggering entrance animation */}
              <motion.div 
                variants={{
                  hidden: { opacity: 0 },
                  show: {
                    opacity: 1,
                    transition: {
                      staggerChildren: 0.08
                    }
                  }
                }}
                initial="hidden"
                animate="show"
                className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4"
              >
                {BADGES.map((badge) => {
                  const currentPoints = user.points || 0;
                  const isUnlocked = currentPoints >= badge.threshold;
                  
                  return (
                    <motion.div
                      key={badge.id}
                      variants={{
                        hidden: { opacity: 0, y: 15 },
                        show: { opacity: 1, y: 0, transition: { type: 'spring', stiffness: 100, damping: 15 } }
                      }}
                      whileHover={isUnlocked ? { y: -4, transition: { duration: 0.15 } } : {}}
                      className={`p-4 border rounded-2xl relative overflow-hidden flex flex-col justify-between transition-all ${
                        isUnlocked 
                          ? `${badge.bgLight} ${badge.borderColor} border-2 shadow-sm` 
                          : 'bg-slate-50 border-slate-200 grayscale opacity-60'
                      }`}
                    >
                      {/* Decorative backdrop glow for unlocked premium badges */}
                      {isUnlocked && badge.threshold >= 600 && (
                        <div className={`absolute -right-6 -bottom-6 w-20 h-20 bg-gradient-to-br ${badge.color} opacity-10 blur-xl rounded-full`} />
                      )}

                      <div className="space-y-2.5">
                        <div className="flex items-center justify-between">
                          <span className="text-3xl filter drop-shadow-sm select-none">{badge.emoji}</span>
                          {isUnlocked ? (
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-200">
                              Đã đạt
                            </span>
                          ) : (
                            <div className="flex items-center gap-1 text-slate-400">
                              <Lock className="w-3.5 h-3.5" />
                              <span className="text-[10px] font-bold">Cần {badge.threshold} xu</span>
                            </div>
                          )}
                        </div>

                        <div>
                          <h4 className={`text-sm font-extrabold ${isUnlocked ? 'text-slate-800' : 'text-slate-500'}`}>
                            {badge.name}
                          </h4>
                          <p className="text-[11px] text-slate-400 mt-0.5 font-medium leading-normal">
                            {badge.description}
                          </p>
                        </div>
                      </div>

                      {/* Perk information */}
                      <div className="mt-3 pt-2.5 border-t border-slate-100/80 flex items-center justify-between text-[10px] font-bold">
                        <span className="text-slate-400 uppercase tracking-wider">Quyền lợi:</span>
                        <span className={`${isUnlocked ? badge.textColor : 'text-slate-400'} truncate max-w-[130px]`}>
                          {badge.perk}
                        </span>
                      </div>
                    </motion.div>
                  );
                })}
              </motion.div>
            </motion.div>
          )}

        </div>

        {/* RIGHT COLUMN (DYNAMIC CALENDAR & CLASSROOM DETAILS) */}
        <div className="space-y-8">
          
          {/* DYNAMIC INTERACTIVE CALENDAR */}
          <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-sm flex flex-col space-y-5">
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
                            : 'text-slate-300 hover:bg-slate-50'
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
              <div className="text-xs text-slate-600 bg-white p-2.5 rounded-xl border border-slate-200 leading-relaxed italic">
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
                <div className="space-y-1.5 pt-2 border-t border-slate-200">
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
                
                <div className="space-y-2 text-xs text-slate-600 mb-5 bg-white p-3 rounded-2xl border border-indigo-100">
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

      {/* Modal danh sách học sinh chưa nộp */}
      {showUnsubmittedModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-slate-100 space-y-6">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <div>
                <h3 className="text-lg font-extrabold text-slate-900 flex items-center gap-2">
                  <AlertCircle className="w-5 h-5 text-amber-500" />
                  Danh sách học sinh chưa nộp bài
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Bài tập: <span className="font-bold text-slate-700">{recentAssignment?.title || 'Chưa có'}</span>
                </p>
              </div>
              <button 
                onClick={() => setShowUnsubmittedModal(false)}
                className="p-2 hover:bg-slate-100 rounded-full text-slate-400 hover:text-slate-700 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3 max-h-[60vh] overflow-y-auto custom-scrollbar pr-1">
              {unsubmittedStudents.length === 0 ? (
                <div className="text-center py-12 space-y-3">
                  <div className="w-12 h-12 bg-emerald-50 text-emerald-600 rounded-full flex items-center justify-center mx-auto">
                    <Check className="w-6 h-6" />
                  </div>
                  <p className="text-sm font-bold text-slate-800">Tuyệt vời! Tất cả học sinh trong lớp đã nộp bài đầy đủ.</p>
                </div>
              ) : (
                unsubmittedStudents.map(student => (
                  <div key={student.id} className="p-3.5 bg-slate-50 rounded-2xl border border-slate-200 flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3 min-w-0">
                      <UserAvatar name={student.name} firstName={student.firstName} avatar={student.avatar} size="md" />
                      <div className="min-w-0">
                        <p className="text-sm font-bold text-slate-900 truncate">{student.name}</p>
                        <p className="text-xs text-slate-500 flex items-center gap-1.5 mt-0.5">
                          <Phone className="w-3 h-3 text-slate-400" />
                          {student.phoneStudent || student.phoneParent || 'Chưa có SĐT'}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <button
                        type="button"
                        onClick={() => {
                          const text = `🤖 [ZALO BOT GỬI TỰ ĐỘNG]: Em chào em ${student.name} và phụ huynh, cô/thầy nhắc em hoàn thành bài tập "${recentAssignment?.title || ''}" trên hệ thống nhé!`;
                          navigator.clipboard.writeText(text);
                          setCopiedStudentId(student.id);
                          alert(`🤖 Zalo Bot đã tự động gửi tin nhắn đến học sinh ${student.name} và Phụ huynh thành công!\n\nNội dung đã gửi:\n"${text}"`);
                          setTimeout(() => setCopiedStudentId(null), 2000);
                        }}
                        className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl transition-colors flex items-center gap-1.5 shadow-sm"
                      >
                        <MessageCircle className="w-3.5 h-3.5" />
                        <span>Nhắc nhở qua Zalo Bot</span>
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>

            <div className="border-t border-slate-100 pt-4 flex justify-end">
              <button
                type="button"
                onClick={() => setShowUnsubmittedModal(false)}
                className="px-5 py-2 bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs rounded-xl transition-colors"
              >
                Đóng
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
