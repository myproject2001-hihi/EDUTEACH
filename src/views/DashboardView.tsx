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

    </div>
  );
}
