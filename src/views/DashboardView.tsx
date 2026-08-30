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
import { 
  BookOpen, 
  CheckCircle, 
  Clock, 
  Video, 
  AlertCircle, 
  TrendingUp, 
  Calendar, 
  ArrowRight, 
  Play, 
  UserCheck, 
  Phone, 
  MessageCircle, 
  X, 
  Check, 
  Copy, 
  Award, 
  Lock, 
  Sparkles, 
  Trophy, 
  Shield, 
  Coins, 
  Bell, 
  BellRing, 
  Layers, 
  Gamepad2,
  ExternalLink,
  QrCode,
  Wifi,
  WifiOff,
  CheckCircle2,
  Settings2,
  Send,
  Smartphone,
  HelpCircle,
  RefreshCw,
  Sliders,
  MessageSquare
} from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { db } from '../firebase';
import { collection, onSnapshot, doc, updateDoc, increment, setDoc } from 'firebase/firestore';
import { motion, AnimatePresence } from 'motion/react';
import { UserAvatar } from '../components/UserAvatar';
import { AssignmentListSkeleton } from '../components/Skeletons';
import { StudentLoveLetterForm } from '../components/StudentLoveLetterForm';
import { shouldShowNewBadge } from '../utils/resourceVisits';

interface DashboardProps {
  user: User;
  assignments: Assignment[];
  submissions: Submission[];
  classes: ClassSession[];
  isLoadingAssignments?: boolean;
  isLoadingSubmissions?: boolean;
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

export function DashboardView({ user, assignments: rawAssignments, submissions, classes: rawClasses, isLoadingAssignments = false, isLoadingSubmissions = false, onNavigate, onSelectAssignment, onOpenGuide }: DashboardProps) {
  const isAdmin = user.role === 'admin';
  const isTeacher = user.role === 'teacher' || isAdmin;
  const [className, setClassName] = React.useState(() => localStorage.getItem('class_name') || '123456');
  const [remindedIds, setRemindedIds] = React.useState<string[]>([]);

  const handleRequestReminder = async (assignmentId: string, title: string, dueDate: string) => {
    try {
      const id = `personal_remind_${user.id}_${assignmentId}`;
      const dueDateStr = new Date(dueDate).toLocaleString('vi-VN', {
        hour: '2-digit',
        minute: '2-digit',
        day: '2-digit',
        month: '2-digit',
        year: 'numeric'
      });
      
      const newNotif = {
        id,
        title: `⏰ Nhắc nhở: Sắp tới hạn bài tập "${title}"`,
        content: `Chào em ${user.name}, bài tập này sắp hết hạn nộp vào lúc ${dueDateStr}. Em nhớ tranh thủ làm bài để đảm bảo đúng hạn nhé!`,
        type: 'personal_reminder',
        badge: '⏰ Nhắc Nhở',
        badgeColor: 'amber',
        createdAt: new Date().toISOString(),
        targetStudentId: user.id
      };
      
      await setDoc(doc(db, 'system_notifications', id), newNotif);
      setRemindedIds(prev => [...prev, assignmentId]);
    } catch (error) {
      console.error("Lỗi khi tạo nhắc nhở:", error);
    }
  };

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
  });
  const [newNoteText, setNewNoteText] = React.useState('');

  // Categorize assignments by domain type
  const actualAssignments = React.useMemo(() => {
    return assignments.filter(a => a.type !== 'flashcard' && a.type !== 'game');
  }, [assignments]);

  const flashcardAssignments = React.useMemo(() => {
    return assignments.filter(a => a.type === 'flashcard');
  }, [assignments]);

  const gameAssignments = React.useMemo(() => {
    return assignments.filter(a => a.type === 'game');
  }, [assignments]);

  const simulationAssignments = React.useMemo(() => {
    return assignments.filter(a => a.type === 'simulation');
  }, [assignments]);

  // Stats calculation
  const mySubmissions = submissions.filter(s => s.studentId === user.id);
  const nextClass = classes.find(c => new Date(c.endTime) >= new Date()) || classes[0];

  // Monthly progress calculated dynamically from actual student submissions
  const monthlyProgressData = React.useMemo(() => {
    const gradedSubs = mySubmissions.filter(s => s.grade !== undefined && s.grade !== null);
    if (gradedSubs.length === 0) return [];

    const groups: Record<string, { quizScores: number[]; simScores: number[] }> = {};

    gradedSubs.forEach(sub => {
      const d = new Date(sub.submittedAt || Date.now());
      const monthKey = `Tháng ${d.getMonth() + 1}`;
      if (!groups[monthKey]) {
        groups[monthKey] = { quizScores: [], simScores: [] };
      }
      const assign = assignments.find(a => a.id === sub.assignmentId);
      const isSim = assign?.type === 'simulation';
      if (isSim) {
        groups[monthKey].simScores.push(sub.grade!);
      } else {
        groups[monthKey].quizScores.push(sub.grade!);
      }
    });

    return Object.keys(groups).map(m => {
      const g = groups[m];
      const avgQuiz = g.quizScores.length > 0 ? Number((g.quizScores.reduce((a, b) => a + b, 0) / g.quizScores.length).toFixed(1)) : 0;
      const avgSim = g.simScores.length > 0 ? Number((g.simScores.reduce((a, b) => a + b, 0) / g.simScores.length).toFixed(1)) : 0;
      return {
        month: m,
        diemKiemTra: avgQuiz,
        diemMoPhong: avgSim,
      };
    });
  }, [mySubmissions, assignments]);

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
  const effectiveTotalStudents = studentsInClass.length;
  const recentAssignment = actualAssignments[0] || assignments[0];
  const submittedStudentIds = submissions.filter(s => s.assignmentId === recentAssignment?.id).map(s => s.studentId);
  const submittedCountForRecent = submittedStudentIds.length;
  const unsubmittedStudents = studentsInClass.length > 0 
    ? studentsInClass.filter(u => !submittedStudentIds.includes(u.id))
    : [];

  // Math for student badge progress bar
  const currentPoints = user.points || 0;
  const currentBadgeIndex = BADGES.findIndex((b, idx) => {
    const next = BADGES[idx + 1];
    return currentPoints >= b.threshold && (!next || currentPoints < next.threshold);
  });
  const currentBadge = currentBadgeIndex !== -1 ? BADGES[currentBadgeIndex] : BADGES[0];
  const nextBadge = currentBadgeIndex !== -1 && currentBadgeIndex < BADGES.length - 1 ? BADGES[currentBadgeIndex + 1] : null;
  const progressToNext = nextBadge 
    ? Math.min(100, Math.round(((currentPoints - currentBadge.threshold) / (nextBadge.threshold - currentBadge.threshold)) * 100)) 
    : 100;

  // Calendar dates generation
  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(monthStart);
  const startDate = startOfWeek(monthStart, { weekStartsOn: 1 });
  const endDate = endOfWeek(monthEnd, { weekStartsOn: 1 });
  const days = eachDayOfInterval({ start: startDate, end: endDate });

  const handleSaveNote = () => {
    const dateStr = format(selectedDate, 'yyyy-MM-dd');
    if (!newNoteText.trim()) return;
    setDashboardNotes(prev => ({
      ...prev,
      [dateStr]: newNoteText.trim()
    }));
    setNewNoteText('');
  };

  const handleCopyPhoneNumber = (phone: string, studentId: string) => {
    navigator.clipboard.writeText(phone);
    setCopiedStudentId(studentId);
    setTimeout(() => setCopiedStudentId(null), 2000);
  };

  const selectedDateStr = format(selectedDate, 'yyyy-MM-dd');
  const selectedDateNote = dashboardNotes[selectedDateStr];

  return (
    <div className="space-y-8 max-w-7xl mx-auto pb-12 px-2 sm:px-4">
      
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
                    {currentBadge.emoji} {currentBadge.name}
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

      {/* 2. MAIN BENTO GRID VIEW */}
      {isTeacher ? (
        // ==========================================
        // TEACHER DASHBOARD VIEW
        // ==========================================
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left / Middle: Classroom Stats and Reports */}
          <div className="lg:col-span-2 space-y-6">
            {/* Stats Cards Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3.5">
              <div className="bg-white p-4.5 rounded-3xl border border-slate-200 shadow-sm space-y-1.5">
                <span className="text-[10px] uppercase font-black text-slate-400 tracking-wider">Sĩ số lớp</span>
                <p className="text-2xl font-black text-slate-900">{effectiveTotalStudents} HS</p>
                <div className="text-[10px] text-slate-500 font-bold">Mã lớp: {className}</div>
              </div>

              <div className="bg-white p-4.5 rounded-3xl border border-slate-200 shadow-sm space-y-1.5">
                <span className="text-[10px] uppercase font-black text-slate-400 tracking-wider">Số bài tập</span>
                <p className="text-2xl font-black text-slate-900">{actualAssignments.length} bài</p>
                <div className="text-[10px] text-indigo-600 font-black cursor-pointer hover:underline" onClick={() => onNavigate('assignments')}>Quản lý bài tập &gt;</div>
              </div>

              <div className="bg-white p-4.5 rounded-3xl border border-slate-200 shadow-sm space-y-1.5">
                <span className="text-[10px] uppercase font-black text-slate-400 tracking-wider">Bộ Flashcard</span>
                <p className="text-2xl font-black text-slate-900">{flashcardAssignments.length} bộ</p>
                <div className="text-[10px] text-indigo-600 font-black cursor-pointer hover:underline" onClick={() => onNavigate('flashcards')}>Quản lý flashcard &gt;</div>
              </div>

              <div className="bg-white p-4.5 rounded-3xl border border-slate-200 shadow-sm space-y-1.5">
                <span className="text-[10px] uppercase font-black text-slate-400 tracking-wider">Trò chơi</span>
                <p className="text-2xl font-black text-slate-900">{gameAssignments.length} game</p>
                <div className="text-[10px] text-indigo-600 font-black cursor-pointer hover:underline" onClick={() => onNavigate('games')}>Kho trò chơi &gt;</div>
              </div>

              <div className="bg-white p-4.5 rounded-3xl border border-slate-200 shadow-sm space-y-1.5">
                <span className="text-[10px] uppercase font-black text-slate-400 tracking-wider">Buổi học live</span>
                <p className="text-2xl font-black text-slate-900">{classes.length} buổi</p>
                <div className="text-[10px] text-indigo-600 font-black cursor-pointer hover:underline" onClick={() => onNavigate('schedule')}>Quản lý lịch học &gt;</div>
              </div>
            </div>

            {/* Quick unsubmitted list */}
            {recentAssignment && (
              <div className="bg-white rounded-3xl border border-slate-200 p-6 space-y-4 shadow-sm">
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <div>
                    <h3 className="font-extrabold text-slate-900 text-base flex items-center gap-1.5">
                      <AlertCircle className="w-5 h-5 text-amber-500" />
                      Chưa nộp bài tập mới nhất
                    </h3>
                    <p className="text-xs text-slate-500 mt-0.5">Bài tập: <strong>{recentAssignment.title}</strong> (Sĩ số: {effectiveTotalStudents} học sinh)</p>
                  </div>
                  {unsubmittedStudents.length > 0 && (
                    <button
                      onClick={() => setShowUnsubmittedModal(true)}
                      className="px-3.5 py-1.5 bg-amber-50 hover:bg-amber-100 text-amber-800 rounded-xl border border-amber-200 text-xs font-bold transition-all flex items-center gap-1"
                    >
                      <BellRing className="w-3.5 h-3.5" />
                      Nhắc nhở qua Zalo ({unsubmittedStudents.length} HS)
                    </button>
                  )}
                </div>

                {unsubmittedStudents.length === 0 ? (
                  <div className="py-6 text-center text-slate-400 text-xs font-bold flex items-center justify-center gap-1.5 bg-emerald-50/50 rounded-2xl border border-dashed border-emerald-100 text-emerald-800">
                    <CheckCircle className="w-5 h-5 text-emerald-500" />
                    Tất cả học sinh đã hoàn thành và nộp bài đầy đủ! 🌟
                  </div>
                ) : (
                  <div className="divide-y divide-slate-100 max-h-[220px] overflow-y-auto pr-2 custom-scrollbar">
                    {unsubmittedStudents.map(student => (
                      <div key={student.id} className="py-2.5 flex items-center justify-between text-xs gap-3">
                        <div>
                          <p className="font-extrabold text-slate-800">{student.name}</p>
                          <p className="text-[10px] text-slate-400 font-medium">PH: {student.phoneParent || 'Chưa cập nhật'}</p>
                        </div>
                        <div className="flex items-center gap-2">
                          {student.phoneParent ? (
                            <button
                              onClick={() => handleCopyPhoneNumber(student.phoneParent || '', student.id)}
                              className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-lg transition-colors flex items-center gap-1"
                            >
                              <Copy className="w-3 h-3 text-slate-500" />
                              {copiedStudentId === student.id ? 'Đã sao chép!' : 'Copy SĐT'}
                            </button>
                          ) : (
                            <span className="text-[10px] text-slate-400">Không có SĐT</span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Teaching Activity Overview Chart */}
            <div className="bg-white rounded-3xl border border-slate-200 p-6 space-y-4 shadow-sm">
              <div>
                <h3 className="font-extrabold text-slate-900 text-base flex items-center gap-1.5">
                  <TrendingUp className="w-5 h-5 text-indigo-600" />
                  Kết quả học tập toàn khóa
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">Biểu đồ phổ điểm trung bình của toàn bộ học sinh trong lớp {className}</p>
              </div>

              {studentsInClass.length === 0 ? (
                <div className="py-12 text-center text-slate-400 text-xs italic">
                  Chưa có dữ liệu học sinh trong lớp để thống kê biểu đồ phổ điểm.
                </div>
              ) : (
                <div className="h-64 w-full pt-4">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={studentsInClass.map(s => {
                        // Estimate score from student submissions in progressData or default mock
                        const subs = submissions.filter(sub => sub.studentId === s.id && sub.grade !== undefined);
                        const avg = subs.length > 0 ? (subs.reduce((acc, curr) => acc + (curr.grade || 0), 0) / subs.length) : 7.5;
                        return {
                          name: s.name.split(' ').pop() || s.name,
                          diemTB: Number(avg.toFixed(1))
                        };
                      })}
                      margin={{ top: 10, right: 10, bottom: 10, left: -20 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                      <XAxis dataKey="name" tick={{ fontSize: 9, fill: '#64748b', fontWeight: 'bold' }} axisLine={false} tickLine={false} />
                      <YAxis domain={[0, 10]} tick={{ fontSize: 10, fill: '#64748b', fontWeight: 'bold' }} axisLine={false} tickLine={false} />
                      <Tooltip contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)', fontSize: '11px', fontWeight: 'bold' }} />
                      <Bar dataKey="diemTB" fill="#4f46e5" radius={[6, 6, 0, 0]} barSize={32} name="Điểm trung bình học tập" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              )}
            </div>
          </div>

          {/* Right Column: Mini Calendar & Teaching Notes */}
          <div className="space-y-6">
            {/* Interactive Mini Calendar Card */}
            <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-sm space-y-4">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <h4 className="font-extrabold text-slate-900 text-sm flex items-center gap-1.5">
                  <Calendar className="w-4 h-4 text-indigo-600" />
                  Lịch giảng dạy & Ghi chú
                </h4>
                <div className="flex items-center gap-1.5 text-xs">
                  <button 
                    onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}
                    className="p-1 hover:bg-slate-100 rounded-lg transition-colors text-slate-500"
                  >
                    &lt;
                  </button>
                  <span className="font-extrabold text-slate-800 capitalize">
                    {format(currentMonth, 'MMMM yyyy', { locale: vi })}
                  </span>
                  <button 
                    onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}
                    className="p-1 hover:bg-slate-100 rounded-lg transition-colors text-slate-500"
                  >
                    &gt;
                  </button>
                </div>
              </div>

              {/* Day names */}
              <div className="grid grid-cols-7 text-center text-[10px] font-black text-slate-400 uppercase tracking-wider">
                <span>T2</span><span>T3</span><span>T4</span><span>T5</span><span>T6</span><span>T7</span><span>CN</span>
              </div>

              {/* Calendar Grid */}
              <div className="grid grid-cols-7 gap-1">
                {days.map((day, idx) => {
                  const isSel = isSameDay(day, selectedDate);
                  const isTodayDate = isToday(day);
                  const isCurrentMonth = isSameMonth(day, currentMonth);
                  const hasNote = !!dashboardNotes[format(day, 'yyyy-MM-dd')];

                  return (
                    <button
                      key={idx}
                      onClick={() => setSelectedDate(day)}
                      className={`h-8 rounded-lg text-xs font-bold transition-all relative flex items-center justify-center ${
                        !isCurrentMonth ? 'text-slate-300' : 'text-slate-700'
                      } ${
                        isTodayDate ? 'border border-indigo-600 text-indigo-700' : ''
                      } ${
                        isSel ? 'bg-indigo-600 text-white font-extrabold shadow-sm shadow-indigo-100' : 'hover:bg-slate-50'
                      }`}
                    >
                      <span>{format(day, 'd')}</span>
                      {hasNote && (
                        <span className={`w-1 h-1 rounded-full absolute bottom-1 ${isSel ? 'bg-white' : 'bg-indigo-600 animate-pulse'}`} />
                      )}
                    </button>
                  );
                })}
              </div>

              {/* Note Details Block */}
              <div className="bg-slate-50 border border-slate-100 rounded-2xl p-4 space-y-3">
                <div className="flex items-center justify-between text-xs border-b border-slate-200/50 pb-2">
                  <span className="font-extrabold text-slate-700">Ghi chú {format(selectedDate, 'dd/MM/yyyy')}</span>
                  {selectedDateNote && (
                    <button
                      onClick={() => setDashboardNotes(prev => {
                        const copy = { ...prev };
                        delete copy[selectedDateStr];
                        return copy;
                      })}
                      className="text-rose-600 hover:text-rose-800 font-bold"
                    >
                      Xóa
                    </button>
                  )}
                </div>

                {selectedDateNote ? (
                  <p className="text-xs text-slate-600 leading-relaxed font-semibold italic">
                    "{selectedDateNote}"
                  </p>
                ) : (
                  <p className="text-xs text-slate-400 italic">Không có lịch trình hay ghi chú giảng dạy nào cho ngày này.</p>
                )}

                {/* Add new note input */}
                <div className="space-y-1.5 pt-1 border-t border-slate-200/50">
                  <input
                    type="text"
                    placeholder="Thêm ghi chú bài giảng mới..."
                    value={newNoteText}
                    onChange={(e) => setNewNoteText(e.target.value)}
                    onKeyDown={(e) => { if (e.key === 'Enter') handleSaveNote(); }}
                    className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs outline-none focus:border-indigo-500 font-medium"
                  />
                  <button
                    onClick={handleSaveNote}
                    className="w-full py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold text-[10px] rounded-xl shadow-sm shadow-indigo-100 transition-colors"
                  >
                    Thêm lịch trình giảng dạy
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      ) : (
        // ==========================================
        // STUDENT DASHBOARD VIEW
        // ==========================================
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column: Student stats and dynamic chart */}
          <div className="lg:col-span-2 space-y-6">
            
            {/* Bento Stats Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {/* Badge level indicator */}
              <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-sm flex flex-col justify-between min-h-[140px]">
                <div className="space-y-1">
                  <span className="text-[10px] uppercase font-black text-slate-400 tracking-wider block">Hạng Học Tập</span>
                  <div className="flex items-center gap-2">
                    <span className="text-2xl">{currentBadge.emoji}</span>
                    <h4 className="text-base font-black text-slate-900 leading-tight">{currentBadge.name}</h4>
                  </div>
                </div>
                {nextBadge ? (
                  <div className="space-y-1.5">
                    <div className="flex justify-between text-[10px] font-bold text-slate-500">
                      <span>Tiến trình lên {nextBadge.emoji}</span>
                      <span>{currentPoints}/{nextBadge.threshold} đ</span>
                    </div>
                    <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden border border-slate-100">
                      <div className="bg-indigo-600 h-full rounded-full transition-all duration-500" style={{ width: `${progressToNext}%` }}></div>
                    </div>
                  </div>
                ) : (
                  <p className="text-[10px] text-emerald-600 font-extrabold">🏆 Đạt hạng tối cao học đường!</p>
                )}
              </div>

              {/* Point Card */}
              <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-sm flex flex-col justify-between min-h-[140px]">
                <div className="space-y-1">
                  <span className="text-[10px] uppercase font-black text-slate-400 tracking-wider block">Điểm Tích Lũy</span>
                  <div className="flex items-baseline gap-1.5">
                    <span className="text-3xl font-black text-indigo-600">{currentPoints}</span>
                    <span className="text-xs text-slate-400 font-bold">điểm</span>
                  </div>
                </div>
                <p className="text-[10px] text-slate-500 font-bold leading-relaxed">Gửi bài tập trắc nghiệm và hoàn thành trò chơi để gia tăng thứ hạng cá nhân.</p>
              </div>

              {/* Completion Card */}
              <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-sm flex flex-col justify-between min-h-[140px]">
                <div className="space-y-1">
                  <span className="text-[10px] uppercase font-black text-slate-400 tracking-wider block">Tỷ Lệ Hoàn Thành</span>
                  <div className="flex items-baseline gap-1.5">
                    <span className="text-3xl font-black text-slate-900">
                      {actualAssignments.length > 0 
                        ? `${Math.round((mySubmissions.filter(s => actualAssignments.some(a => a.id === s.assignmentId)).length / actualAssignments.length) * 100)}%` 
                        : '100%'}
                    </span>
                    <span className="text-xs text-slate-400 font-bold">({mySubmissions.filter(s => actualAssignments.some(a => a.id === s.assignmentId)).length}/{actualAssignments.length} bài)</span>
                  </div>
                </div>
                <div className="text-[10px] text-slate-500 font-bold">
                  {actualAssignments.length > mySubmissions.filter(s => actualAssignments.some(a => a.id === s.assignmentId)).length 
                    ? `Cần làm thêm ${actualAssignments.length - mySubmissions.filter(s => actualAssignments.some(a => a.id === s.assignmentId)).length} bài nữa` 
                    : 'Xuất sắc! Đã hoàn thành mọi bài tập!'}
                </div>
              </div>
            </div>

            {/* Next class section block */}
            {nextClass && (
              <div className="bg-gradient-to-br from-[#0068ff]/10 via-[#0068ff]/5 to-white rounded-3xl p-6 border border-[#0068ff]/20 shadow-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div className="space-y-2">
                  <div className="inline-flex items-center gap-1 bg-[#0068ff]/10 text-[#0068ff] px-2.5 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider border border-[#0068ff]/20">
                    <Video className="w-3.5 h-3.5" />
                    Buổi học trực tuyến sắp diễn ra
                  </div>
                  <h4 className="text-base font-black text-slate-900">{nextClass.title || 'Phòng học trực tuyến chuẩn bị mở'}</h4>
                  <p className="text-xs text-slate-500 font-medium">Thời gian: <strong>{new Date(nextClass.startTime).toLocaleString('vi-VN')}</strong> ({nextClass.subject || 'Chung'})</p>
                </div>
                <button
                  onClick={() => onNavigate('schedule')}
                  className="px-4.5 py-2.5 bg-[#0068ff] hover:bg-[#005cd4] text-white font-extrabold text-xs rounded-xl shadow-md shadow-[#0068ff]/20 transition-all hover:scale-105 active:scale-95 shrink-0 flex items-center gap-1 border border-[#0068ff]"
                >
                  <Play className="w-3.5 h-3.5 fill-white" />
                  <span>Vào phòng học ngay</span>
                </button>
              </div>
            )}

            {/* Unfinished Assignments */}
            <div className="bg-white rounded-3xl border border-slate-200 p-6 space-y-4 shadow-sm">
              <div className="flex items-center justify-between">
                <h3 className="font-extrabold text-slate-900 text-base flex items-center gap-1.5">
                  <BookOpen className="w-5 h-5 text-indigo-600" />
                  Nhiệm vụ học tập cần hoàn thành
                </h3>
                <span className="text-xs text-indigo-600 font-extrabold hover:underline cursor-pointer" onClick={() => onNavigate('assignments')}>Xem tất cả &gt;</span>
              </div>

              {assignments.length === mySubmissions.length ? (
                <div className="py-8 text-center text-slate-400 text-xs font-extrabold flex items-center justify-center gap-1.5 bg-emerald-50/50 rounded-2xl border border-dashed border-emerald-100 text-emerald-800">
                  <CheckCircle className="w-5 h-5 text-emerald-500" />
                  Tuyệt vời! Em đã làm hết toàn bộ bài tập và trò chơi rồi! 🎉
                </div>
              ) : (
                <div className="space-y-3 max-h-[300px] overflow-y-auto pr-2 custom-scrollbar">
                  {assignments
                    .filter(a => !mySubmissions.some(s => s.assignmentId === a.id))
                    .map(assignment => {
                      const isGame = assignment.type === 'game';
                      return (
                        <div key={assignment.id} className="p-4 rounded-2xl border border-slate-100 bg-slate-50 hover:bg-slate-100/50 transition-all flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
                          <div className="space-y-1">
                            <div className="flex items-center gap-2">
                              <span className={`text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded-md ${
                                isGame 
                                  ? 'bg-fuchsia-50 text-fuchsia-700 border border-fuchsia-100' 
                                  : 'bg-indigo-50 text-indigo-700 border border-indigo-100'
                              }`}>
                                {isGame ? '🎮 Trò chơi trí tuệ' : '📚 Bài kiểm tra'}
                              </span>
                              {shouldShowNewBadge(user.id, assignment) && (
                                <span className="bg-rose-500 text-white text-[8px] font-black px-1.5 py-0.5 rounded animate-bounce">MỚI</span>
                              )}
                            </div>
                            <h5 className="font-bold text-slate-900 text-sm leading-snug">{assignment.title}</h5>
                            <p className="text-[10px] text-slate-500">Hạn nộp: {assignment.dueDate ? new Date(assignment.dueDate).toLocaleString('vi-VN') : 'Không có hạn'}</p>
                          </div>
                          <button
                            onClick={() => {
                              if (onSelectAssignment) {
                                onSelectAssignment(assignment.id);
                              }
                              onNavigate(isGame ? 'games' : 'assignments');
                            }}
                            className="w-full sm:w-auto px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold text-xs rounded-xl transition-all shadow-sm shadow-indigo-100 shrink-0 text-center"
                          >
                            Bắt đầu làm bài
                          </button>
                        </div>
                      );
                    })}
                </div>
              )}
            </div>

            {/* Academic Growth Progress Chart */}
            <div className="bg-white rounded-3xl border border-slate-200 p-6 space-y-4 shadow-sm">
              <div>
                <h3 className="font-extrabold text-slate-900 text-base flex items-center gap-1.5">
                  <TrendingUp className="w-5 h-5 text-indigo-600" />
                  Tiến độ học tập hàng tháng
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">Thống kê điểm số trung bình qua các bài làm thực tế của em</p>
              </div>

              {monthlyProgressData.length === 0 ? (
                <div className="py-12 text-center text-slate-400 text-xs italic bg-slate-50 rounded-2xl border border-slate-100">
                  Hãy hoàn thành bài nộp đầu tiên và chờ thầy cô chấm điểm để kích hoạt biểu đồ tiến độ! 🚀
                </div>
              ) : (
                <div className="h-64 w-full pt-4">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={monthlyProgressData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                      <XAxis dataKey="month" tick={{ fontSize: 11, fill: '#64748b', fontWeight: 'bold' }} axisLine={false} tickLine={false} />
                      <YAxis domain={[0, 10]} tick={{ fontSize: 10, fill: '#64748b', fontWeight: 'bold' }} axisLine={false} tickLine={false} />
                      <Tooltip contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)', fontSize: '11px', fontWeight: 'bold' }} />
                      <Legend wrapperStyle={{ fontSize: '10px', fontWeight: 'bold', paddingTop: '10px' }} />
                      <Bar name="Lý thuyết & Trắc nghiệm" dataKey="diemKiemTra" fill="#4f46e5" radius={[6, 6, 0, 0]} />
                      <Bar name="Thực hành Mô phỏng" dataKey="diemMoPhong" fill="#06b6d4" radius={[6, 6, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              )}
            </div>

            {/* Love letter tri an thay co */}
            <StudentLoveLetterForm 
              currentUser={user} 
              classes={classes} 
              usersList={usersList} 
            />
          </div>

          {/* Right Column: Mini Calendar & Notes */}
          <div className="space-y-6">
            {/* Student Mini Calendar */}
            <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-sm space-y-4">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <h4 className="font-extrabold text-slate-900 text-sm flex items-center gap-1.5">
                  <Calendar className="w-4 h-4 text-indigo-600" />
                  Lịch học & Ghi chú cá nhân
                </h4>
                <div className="flex items-center gap-1.5 text-xs">
                  <button 
                    onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}
                    className="p-1 hover:bg-slate-100 rounded-lg transition-colors text-slate-500"
                  >
                    &lt;
                  </button>
                  <span className="font-extrabold text-slate-800 capitalize">
                    {format(currentMonth, 'MMMM yyyy', { locale: vi })}
                  </span>
                  <button 
                    onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}
                    className="p-1 hover:bg-slate-100 rounded-lg transition-colors text-slate-500"
                  >
                    &gt;
                  </button>
                </div>
              </div>

              {/* Day names */}
              <div className="grid grid-cols-7 text-center text-[10px] font-black text-slate-400 uppercase tracking-wider">
                <span>T2</span><span>T3</span><span>T4</span><span>T5</span><span>T6</span><span>T7</span><span>CN</span>
              </div>

              {/* Calendar Grid */}
              <div className="grid grid-cols-7 gap-1">
                {days.map((day, idx) => {
                  const isSel = isSameDay(day, selectedDate);
                  const isTodayDate = isToday(day);
                  const isCurrentMonth = isSameMonth(day, currentMonth);
                  const hasNote = !!dashboardNotes[format(day, 'yyyy-MM-dd')];

                  return (
                    <button
                      key={idx}
                      onClick={() => setSelectedDate(day)}
                      className={`h-8 rounded-lg text-xs font-bold transition-all relative flex items-center justify-center ${
                        !isCurrentMonth ? 'text-slate-300' : 'text-slate-700'
                      } ${
                        isTodayDate ? 'border border-indigo-600 text-indigo-700' : ''
                      } ${
                        isSel ? 'bg-indigo-600 text-white font-extrabold shadow-sm shadow-indigo-100' : 'hover:bg-slate-50'
                      }`}
                    >
                      <span>{format(day, 'd')}</span>
                      {hasNote && (
                        <span className={`w-1 h-1 rounded-full absolute bottom-1 ${isSel ? 'bg-white' : 'bg-indigo-600 animate-pulse'}`} />
                      )}
                    </button>
                  );
                })}
              </div>

              {/* Note Details Block */}
              <div className="bg-slate-50 border border-slate-100 rounded-2xl p-4 space-y-3">
                <div className="flex items-center justify-between text-xs border-b border-slate-200/50 pb-2">
                  <span className="font-extrabold text-slate-700">Ghi chú {format(selectedDate, 'dd/MM/yyyy')}</span>
                  {selectedDateNote && (
                    <button
                      onClick={() => setDashboardNotes(prev => {
                        const copy = { ...prev };
                        delete copy[selectedDateStr];
                        return copy;
                      })}
                      className="text-rose-600 hover:text-rose-800 font-bold"
                    >
                      Xóa
                    </button>
                  )}
                </div>

                {selectedDateNote ? (
                  <p className="text-xs text-slate-600 leading-relaxed font-semibold italic">
                    "{selectedDateNote}"
                  </p>
                ) : (
                  <p className="text-xs text-slate-400 italic">Không có lịch trình hay nhắc nhở cá nhân cho ngày này.</p>
                )}

                {/* Add new note input */}
                <div className="space-y-1.5 pt-1 border-t border-slate-200/50">
                  <input
                    type="text"
                    placeholder="Viết ghi chú hay lịch học riêng..."
                    value={newNoteText}
                    onChange={(e) => setNewNoteText(e.target.value)}
                    onKeyDown={(e) => { if (e.key === 'Enter') handleSaveNote(); }}
                    className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs outline-none focus:border-indigo-500 font-medium"
                  />
                  <button
                    onClick={handleSaveNote}
                    className="w-full py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold text-[10px] rounded-xl shadow-sm shadow-indigo-100 transition-colors"
                  >
                    Thêm ghi chú cá nhân
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Unsubmitted Zalo reminder detail modal overlay */}
      {showUnsubmittedModal && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl border border-slate-200 shadow-2xl p-6 w-full max-w-lg max-h-[85vh] overflow-y-auto space-y-4 relative">
            <button
              onClick={() => setShowUnsubmittedModal(false)}
              className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 p-1.5 bg-slate-100 hover:bg-slate-200 rounded-full transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
            
            <div className="space-y-1">
              <h4 className="font-extrabold text-slate-900 text-lg flex items-center gap-2">
                <BellRing className="w-5 h-5 text-indigo-600" />
                Mẫu tin nhắn nhắc nhở nộp bài
              </h4>
              <p className="text-xs text-slate-500">Giáo viên có thể sao chép tin nhắn cá nhân hóa bên dưới để gửi nhắc nhở cho Phụ huynh qua Zalo / SĐT.</p>
            </div>

            <div className="space-y-3.5 pt-2">
              {unsubmittedStudents.map((student, idx) => {
                const messageText = `Kính gửi Phụ huynh em ${student.name},\n\nNhà trường và Giáo viên chủ nhiệm lớp ${className} xin thông báo em hiện chưa nộp bài tập mới nhất: "${recentAssignment?.title || 'Bài tập mới'}" (Hạn chót nộp: ${recentAssignment?.dueDate ? new Date(recentAssignment.dueDate).toLocaleString('vi-VN') : 'Không giới hạn'}).\n\nRất mong Quý phụ huynh nhắc nhở em tranh thủ làm bài đầy đủ và đúng hạn để củng cố kiến thức tốt nhất.\n\nTrân trọng cảm ơn Phụ huynh!`;
                return (
                  <div key={student.id} className="p-4 bg-slate-50 border border-slate-200 rounded-2xl space-y-2.5">
                    <div className="flex justify-between items-center text-xs">
                      <span className="font-black text-slate-800">Học sinh: {student.name}</span>
                      <span className="text-slate-400 font-bold">PH: {student.phoneParent || 'Chưa cập nhật'}</span>
                    </div>
                    <blockquote className="text-[11px] text-slate-600 bg-white border border-slate-100 p-2.5 rounded-xl font-medium leading-relaxed italic select-all">
                      {messageText.replace(/\\n/g, '\n')}
                    </blockquote>
                    <div className="flex justify-end gap-2">
                      <button
                        onClick={() => {
                          navigator.clipboard.writeText(messageText.replace(/\\n/g, '\n'));
                          setCopiedStudentId(student.id);
                          setTimeout(() => setCopiedStudentId(null), 2000);
                        }}
                        className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold text-[10px] rounded-xl transition-all shadow-sm"
                      >
                        {copiedStudentId === student.id ? 'Đã sao chép!' : 'Copy Mẫu Nhắc Nhở'}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
