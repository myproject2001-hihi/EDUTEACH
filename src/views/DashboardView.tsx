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
  Gift, 
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
  MessageSquare,
  ChevronRight,
  Search
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

  const isClassMatching = (assignClass: string | undefined | null, userClass: string | undefined | null): boolean => {
    if (!assignClass || assignClass.trim() === '') return true;
    const cleanAssign = assignClass.trim().toLowerCase();
    if (
      cleanAssign === 'all' || 
      cleanAssign === 'tất cả' || 
      cleanAssign === 'tat ca' || 
      cleanAssign === 'toàn hệ thống' || 
      cleanAssign === 'toan he thong'
    ) {
      return true;
    }
    if (!userClass || userClass.trim() === '') return false;
    const clean = (s: string) => {
      return s.trim()
        .toLowerCase()
        .replace(/^(lớp|lop|class)\s+/gi, '')
        .replace(/\s+/g, '');
    };
    return clean(assignClass) === clean(userClass);
  };

  const assignments = React.useMemo(() => {
    if (isAdmin) return rawAssignments;
    if (user.role === 'teacher') return rawAssignments.filter(a => !a.teacherId || a.teacherId === user.id);
    // Student: Filter out unpublished (isPublished === false) and filter by className
    return rawAssignments.filter(a => {
      if (a.isPublished === false) return false;
      return isClassMatching(a.className, user.className);
    });
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

  const mySubmissions = submissions.filter(s => s.studentId === user.id);

  // Categorize assignments by domain type
  const actualAssignments = React.useMemo(() => {
    return assignments.filter(a => a.type !== 'flashcard' && a.type !== 'game');
  }, [assignments]);

  const unfinishedAssignments = React.useMemo(() => {
    return assignments.filter(a => !mySubmissions.some(s => s.assignmentId === a.id));
  }, [assignments, mySubmissions]);

  const handleStartAssignment = (assignment: Assignment) => {
    if (onSelectAssignment) {
      onSelectAssignment(assignment.id);
    }
    if (assignment.type === 'game') {
      onNavigate('games');
    } else if (assignment.type === 'flashcard') {
      onNavigate('flashcards');
    } else {
      onNavigate('assignments');
    }
  };

  const [showUnfinishedOnlyModal, setShowUnfinishedOnlyModal] = useState(false);
  const [unfinishedFilterType, setUnfinishedFilterType] = useState<'all' | 'online_test' | 'flashcard' | 'game' | 'simulation'>('all');
  const [unfinishedSearchQuery, setUnfinishedSearchQuery] = useState('');

  const modalFilteredUnfinished = React.useMemo(() => {
    return unfinishedAssignments.filter(a => {
      const matchType = unfinishedFilterType === 'all' || a.type === unfinishedFilterType || (unfinishedFilterType === 'online_test' && (a.type === 'lesson_check' || a.type === 'file_upload' || (a.type as string) === 'standard'));
      const matchSearch = unfinishedSearchQuery.trim() === '' || a.title.toLowerCase().includes(unfinishedSearchQuery.toLowerCase());
      return matchType && matchSearch;
    });
  }, [unfinishedAssignments, unfinishedFilterType, unfinishedSearchQuery]);

  const flashcardAssignments = React.useMemo(() => {
    return assignments.filter(a => a.type === 'flashcard');
  }, [assignments]);

  const gameAssignments = React.useMemo(() => {
    return assignments.filter(a => a.type === 'game');
  }, [assignments]);

  const simulationAssignments = React.useMemo(() => {
    return assignments.filter(a => a.type === 'simulation');
  }, [assignments]);

  // Quick Filter for On Air/Draft in Teacher Dashboard
  const [onAirFilter, setOnAirFilter] = React.useState<'all' | 'on-air' | 'draft'>('all');

  // Auto scroll to top when filters change
  React.useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
    document.documentElement.scrollTop = 0;
    document.body.scrollTop = 0;
  }, [unfinishedFilterType, onAirFilter]);

  const filteredOnAirAssignments = React.useMemo(() => {
    return assignments.filter(a => {
      if (onAirFilter === 'on-air') return a.isPublished === true;
      if (onAirFilter === 'draft') return a.isPublished !== true;
      return true;
    });
  }, [assignments, onAirFilter]);

  const handleTogglePublish = async (assignmentId: string, currentStatus: boolean) => {
    try {
      const assignmentRef = doc(db, 'assignments', assignmentId);
      await updateDoc(assignmentRef, {
        isPublished: !currentStatus
      });
    } catch (err) {
      console.error('Error toggling publish status:', err);
      alert('Không thể cập nhật trạng thái On Air!');
    }
  };

  // Stats calculation
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

  // Generate 2 Daily Suggestions for Student based on Assignments and Class Schedule
  const todaySuggestions = React.useMemo(() => {
    const suggestions: Array<{
      id: string;
      type: 'assignment' | 'schedule' | 'reward' | 'practice';
      badgeText: string;
      badgeColor: string;
      icon: React.ReactNode;
      title: string;
      description: string;
      actionLabel: string;
      onClick: () => void;
    }> = [];

    const now = new Date();

    // --- SUGGESTION 1: ASSIGNMENTS / SUBMISSIONS FOCUS ---
    const overdueUnfinished = unfinishedAssignments.filter(a => a.dueDate && new Date(a.dueDate).getTime() < now.getTime());
    const upcomingDueUnfinished = unfinishedAssignments
      .filter(a => a.dueDate && new Date(a.dueDate).getTime() >= now.getTime())
      .sort((a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime());

    if (overdueUnfinished.length > 0) {
      const target = overdueUnfinished[0];
      suggestions.push({
        id: 'sug_overdue',
        type: 'assignment',
        badgeText: '⚠️ Cần xử lý gấp',
        badgeColor: 'bg-rose-50 text-rose-700 border-rose-200',
        icon: <AlertCircle className="w-5 h-5 text-rose-600" />,
        title: `Còn ${overdueUnfinished.length} bài tập quá hạn nộp!`,
        description: `Bài tập "${target.title}" đã quá hạn. Tranh thủ hoàn thành ngay để không bị đọng bài!`,
        actionLabel: 'Làm bài ngay',
        onClick: () => handleStartAssignment(target)
      });
    } else if (upcomingDueUnfinished.length > 0) {
      const target = upcomingDueUnfinished[0];
      const dueDateObj = new Date(target.dueDate);
      const isDueToday = isToday(dueDateObj);
      const formattedTime = format(dueDateObj, 'HH:mm dd/MM', { locale: vi });
      
      suggestions.push({
        id: 'sug_due_soon',
        type: 'assignment',
        badgeText: isDueToday ? '🔥 Sắp hết hạn hôm nay' : '⏰ Nhiệm vụ sắp tới hạn',
        badgeColor: isDueToday ? 'bg-amber-50 text-amber-800 border-amber-200' : 'bg-indigo-50 text-indigo-700 border-indigo-200',
        icon: <Clock className="w-5 h-5 text-amber-600" />,
        title: `Còn 1 bài tập sắp hết hạn (${target.title})`,
        description: `Hạn nộp vào lúc ${formattedTime}. Đừng quên làm bài trước giờ quy định nhé!`,
        actionLabel: 'Hoàn thành ngay',
        onClick: () => handleStartAssignment(target)
      });
    } else if (unfinishedAssignments.length > 0) {
      const target = unfinishedAssignments[0];
      suggestions.push({
        id: 'sug_unfinished',
        type: 'assignment',
        badgeText: '📚 Nhiệm vụ bài học',
        badgeColor: 'bg-indigo-50 text-indigo-700 border-indigo-200',
        icon: <BookOpen className="w-5 h-5 text-indigo-600" />,
        title: `Bạn có ${unfinishedAssignments.length} bài tập chưa hoàn thành`,
        description: `Bắt đầu với bài tập "${target.title}" để củng cố kiến thức và tích lũy điểm thưởng!`,
        actionLabel: 'Bắt đầu làm bài',
        onClick: () => handleStartAssignment(target)
      });
    } else {
      // 100% assignments finished
      suggestions.push({
        id: 'sug_all_completed',
        type: 'reward',
        badgeText: '🌟 Xuất sắc',
        badgeColor: 'bg-emerald-50 text-emerald-700 border-emerald-200',
        icon: <CheckCircle className="w-5 h-5 text-emerald-600" />,
        title: 'Đã hoàn thành 100% bài tập được giao!',
        description: 'Tất cả nhiệm vụ học tập đã hoàn tất. Ghé Cửa hàng quà tặng để đổi thẻ đặc quyền nhé!',
        actionLabel: 'Ghé Cửa hàng quà',
        onClick: () => onNavigate('rewards-store')
      });
    }

    // --- SUGGESTION 2: CLASS SCHEDULE / CLASSROOM FOCUS ---
    const todayClasses = classes.filter(c => c.startTime && isToday(new Date(c.startTime)));
    const upcomingClasses = classes
      .filter(c => c.startTime && new Date(c.startTime).getTime() >= now.getTime())
      .sort((a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime());

    if (todayClasses.length > 0) {
      const targetClass = todayClasses[0];
      const timeStr = format(new Date(targetClass.startTime), 'HH:mm');
      suggestions.push({
        id: 'sug_class_today',
        type: 'schedule',
        badgeText: '🎥 Lịch học trực tuyến',
        badgeColor: 'bg-[#0068ff]/10 text-[#0068ff] border-[#0068ff]/20',
        icon: <Video className="w-5 h-5 text-[#0068ff]" />,
        title: `Đừng quên lịch học lúc ${timeStr} hôm nay`,
        description: `Buổi học trực tuyến "${targetClass.title || 'Lớp học trực tuyến'}" sẽ diễn ra lúc ${timeStr}. Chuẩn bị bài tốt nhé!`,
        actionLabel: 'Vào phòng học',
        onClick: () => onNavigate('schedule')
      });
    } else if (upcomingClasses.length > 0) {
      const targetClass = upcomingClasses[0];
      const timeStr = format(new Date(targetClass.startTime), 'HH:mm - dd/MM');
      suggestions.push({
        id: 'sug_class_upcoming',
        type: 'schedule',
        badgeText: '📅 Buổi học tiếp theo',
        badgeColor: 'bg-sky-50 text-sky-700 border-sky-200',
        icon: <Calendar className="w-5 h-5 text-sky-600" />,
        title: `Lịch học trực tuyến tiếp theo: ${timeStr}`,
        description: `Lớp "${targetClass.title || 'Buổi học'}" dự kiến diễn ra lúc ${timeStr}. Theo dõi thời khóa biểu để chủ động thời gian!`,
        actionLabel: 'Xem thời khóa biểu',
        onClick: () => onNavigate('schedule')
      });
    } else {
      // No upcoming live classes - suggest practice / revision / flashcards
      if (flashcardAssignments.length > 0 || gameAssignments.length > 0) {
        suggestions.push({
          id: 'sug_practice',
          type: 'practice',
          badgeText: '🎮 Ôn tập & Trí tuệ',
          badgeColor: 'bg-fuchsia-50 text-fuchsia-700 border-fuchsia-200',
          icon: <Gamepad2 className="w-5 h-5 text-fuchsia-600" />,
          title: 'Hôm nay không có lịch học: Thử thách Flashcard & Trò chơi',
          description: 'Luyện tập các bộ thẻ ghi nhớ và game trắc nghiệm để ghi nhớ sâu bài học và tích lũy điểm thưởng.',
          actionLabel: 'Luyện tập ngay',
          onClick: () => onNavigate(flashcardAssignments.length > 0 ? 'flashcards' : 'games')
        });
      } else {
        suggestions.push({
          id: 'sug_schedule_empty',
          type: 'schedule',
          badgeText: '☀️ Tự học hôm nay',
          badgeColor: 'bg-amber-50 text-amber-800 border-amber-200',
          icon: <Sparkles className="w-5 h-5 text-amber-600" />,
          title: 'Hôm nay không có lịch học trực tuyến',
          description: 'Tranh thủ ôn lại lý thuyết bài học cũ và chuẩn bị tinh thần cho các buổi học tiếp theo.',
          actionLabel: 'Mở Thời khóa biểu',
          onClick: () => onNavigate('schedule')
        });
      }
    }

    return suggestions.slice(0, 2);
  }, [unfinishedAssignments, classes, flashcardAssignments, gameAssignments, onNavigate]);

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
                      Nhắc nhở nộp bài ({unsubmittedStudents.length} HS)
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

            {/* 📋 QUẢN LÝ TRẠNG THÁI PHÁT SÓNG (ON AIR) TÀI NGUYÊN */}
            <div className="bg-white rounded-3xl border border-slate-200 p-6 space-y-5 shadow-sm">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-4">
                <div>
                  <h3 className="font-extrabold text-slate-900 text-base flex items-center gap-1.5">
                    <Sliders className="w-5 h-5 text-indigo-600" />
                    Trạng thái Phát sóng (On Air)
                  </h3>
                  <p className="text-xs text-slate-500 mt-0.5">Bộ lọc nhanh trạng thái bài tập, game, mô phỏng và flashcard đang phát sóng.</p>
                </div>
                
                {/* Quick Filter Pills */}
                <div className="flex bg-slate-100 p-1 rounded-xl shrink-0 gap-1">
                  <button
                    onClick={() => setOnAirFilter('all')}
                    className={`px-3 py-1.5 rounded-lg text-xs font-black transition-all ${
                      onAirFilter === 'all'
                        ? 'bg-white text-slate-900 shadow-sm'
                        : 'text-slate-500 hover:text-slate-800'
                    }`}
                  >
                    Tất cả ({assignments.length})
                  </button>
                  <button
                    onClick={() => setOnAirFilter('on-air')}
                    className={`px-3 py-1.5 rounded-lg text-xs font-black transition-all flex items-center gap-1 ${
                      onAirFilter === 'on-air'
                        ? 'bg-emerald-500 text-white shadow-sm'
                        : 'text-slate-500 hover:text-emerald-700'
                    }`}
                  >
                    <span className={`w-1.5 h-1.5 rounded-full ${onAirFilter === 'on-air' ? 'bg-white' : 'bg-emerald-500'}`}></span>
                    Đã On Air ({assignments.filter(a => a.isPublished === true).length})
                  </button>
                  <button
                    onClick={() => setOnAirFilter('draft')}
                    className={`px-3 py-1.5 rounded-lg text-xs font-black transition-all flex items-center gap-1 ${
                      onAirFilter === 'draft'
                        ? 'bg-amber-500 text-white shadow-sm'
                        : 'text-slate-500 hover:text-amber-700'
                    }`}
                  >
                    <span className={`w-1.5 h-1.5 rounded-full ${onAirFilter === 'draft' ? 'bg-white' : 'bg-amber-500'}`}>
                    </span>
                    Chưa On Air ({assignments.filter(a => a.isPublished !== true).length})
                  </button>
                </div>
              </div>

              {filteredOnAirAssignments.length === 0 ? (
                <div className="py-10 text-center text-slate-400 text-xs font-extrabold flex flex-col items-center justify-center gap-2 bg-slate-50 rounded-2xl border border-dashed border-slate-200">
                  <Sliders className="w-8 h-8 text-slate-300" />
                  <span>Không tìm thấy tài nguyên nào ở trạng thái này.</span>
                </div>
              ) : (
                <div className="divide-y divide-slate-100 max-h-[350px] overflow-y-auto pr-2 custom-scrollbar">
                  {filteredOnAirAssignments.map((assignment) => {
                    const isOnAir = assignment.isPublished === true;
                    return (
                      <div key={assignment.id} className="py-3.5 first:pt-0 last:pb-0 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
                        <div className="space-y-1 flex-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className={`text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded-md ${
                              assignment.type === 'game' ? 'bg-fuchsia-50 text-fuchsia-700 border border-fuchsia-100' :
                              assignment.type === 'flashcard' ? 'bg-rose-50 text-rose-700 border border-rose-100' :
                              assignment.type === 'simulation' ? 'bg-emerald-50 text-emerald-700 border border-emerald-100' :
                              'bg-indigo-50 text-indigo-700 border border-indigo-100'
                            }`}>
                              {assignment.type === 'game' ? '🎮 Game' :
                               assignment.type === 'flashcard' ? '🗂️ Flashcard' :
                               assignment.type === 'simulation' ? '🧪 Mô phỏng' : '📚 Trắc nghiệm'}
                            </span>
                            {assignment.grade && (
                              <span className="text-[9px] bg-emerald-50 text-emerald-700 font-bold px-1.5 py-0.2 rounded border border-emerald-100">
                                {assignment.grade}
                              </span>
                            )}
                            {assignment.className && (
                              <span className="text-[9px] bg-purple-50 text-purple-700 font-bold px-1.5 py-0.2 rounded border border-purple-100">
                                Lớp: {assignment.className}
                              </span>
                            )}
                          </div>
                          
                          <h5 
                            onClick={() => {
                              if (onSelectAssignment) {
                                onSelectAssignment(assignment.id);
                              }
                              onNavigate(assignment.type === 'game' ? 'games' : 'assignments');
                            }}
                            className="font-extrabold text-slate-800 hover:text-indigo-600 cursor-pointer text-sm leading-snug transition-colors"
                          >
                            {assignment.title}
                          </h5>
                          <p className="text-[10px] text-slate-400 font-semibold">Ngày tạo: {new Date(assignment.createdAt).toLocaleDateString('vi-VN')}</p>
                        </div>
                        
                        {/* Switch Status Action */}
                        <div className="flex items-center gap-3 shrink-0 self-stretch sm:self-auto justify-between border-t sm:border-t-0 pt-2 sm:pt-0 border-slate-50">
                          <span className={`text-[11px] font-black uppercase tracking-wider ${isOnAir ? 'text-emerald-600' : 'text-amber-500'}`}>
                            {isOnAir ? '🟢 Đã On Air' : '🟡 Bản Nháp'}
                          </span>
                          
                          {/* Interactive Toggle Switch */}
                          <button
                            onClick={() => handleTogglePublish(assignment.id, isOnAir)}
                            className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                              isOnAir ? 'bg-emerald-500' : 'bg-slate-200'
                            }`}
                          >
                            <span
                              className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                                isOnAir ? 'translate-x-4' : 'translate-x-0'
                              }`}
                            />
                          </button>
                        </div>
                      </div>
                    );
                  })}
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
              <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-sm flex flex-col justify-between min-h-[140px] relative overflow-hidden group">
                <div className="space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] uppercase font-black text-slate-400 tracking-wider block">Điểm Tích Lũy</span>
                    <button
                      type="button"
                      onClick={() => onNavigate('rewards-store')}
                      className="px-2 py-1 bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-200 rounded-lg text-[10px] font-black flex items-center gap-1 transition-all"
                    >
                      <Gift className="w-3 h-3 text-amber-600" />
                      <span>Đổi quà</span>
                    </button>
                  </div>
                  <div className="flex items-baseline gap-1.5">
                    <span className="text-3xl font-black text-indigo-600 font-mono">{currentPoints}</span>
                    <span className="text-xs text-slate-400 font-bold">điểm</span>
                  </div>
                </div>
                
                <div className="pt-2 flex items-center justify-between gap-2 border-t border-slate-100">
                  <p className="text-[10px] text-slate-500 font-bold leading-tight">Làm bài tập & tham gia trò chơi để gia tăng điểm.</p>
                  <button
                    type="button"
                    onClick={() => onNavigate('rewards-store')}
                    className="px-2.5 py-1 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-[10px] font-extrabold transition-all shrink-0 flex items-center gap-1 shadow-xs"
                  >
                    <span>Cửa hàng 🎁</span>
                  </button>
                </div>
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

            {/* GỢI Ý HÔM NAY (Daily Suggestions Component) */}
            {todaySuggestions.length > 0 && (
              <div className="bg-white rounded-3xl border border-indigo-100 p-5 sm:p-6 shadow-sm space-y-4">
                <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                  <div className="flex items-center gap-2.5">
                    <div className="p-2 rounded-xl bg-amber-50 text-amber-600 border border-amber-200 shadow-xs">
                      <Sparkles className="w-4 h-4" />
                    </div>
                    <div>
                      <h3 className="font-extrabold text-slate-900 text-base leading-tight">Gợi ý hôm nay</h3>
                      <p className="text-xs text-slate-500 font-medium">Gợi ý hành động cụ thể dựa trên lịch học & bài tập của bạn</p>
                    </div>
                  </div>
                  <span className="text-[10px] font-black uppercase tracking-wider px-2.5 py-1 bg-indigo-50 text-indigo-700 rounded-full border border-indigo-100 shrink-0">
                    {todaySuggestions.length} Gợi ý
                  </span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                  {todaySuggestions.map((sug) => (
                    <div
                      key={sug.id}
                      className="p-4 rounded-2xl bg-slate-50/80 hover:bg-indigo-50/40 border border-slate-200/80 hover:border-indigo-200 transition-all flex flex-col justify-between space-y-3 group"
                    >
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <span className={`text-[10px] font-black px-2 py-0.5 rounded-md border ${sug.badgeColor}`}>
                            {sug.badgeText}
                          </span>
                        </div>
                        <div className="flex items-start gap-2.5">
                          <div className="shrink-0 mt-0.5">{sug.icon}</div>
                          <div>
                            <h4 className="font-bold text-slate-800 text-sm group-hover:text-indigo-700 transition-colors leading-snug">
                              {sug.title}
                            </h4>
                            <p className="text-xs text-slate-500 font-medium mt-1 leading-relaxed">
                              {sug.description}
                            </p>
                          </div>
                        </div>
                      </div>

                      <button
                        onClick={sug.onClick}
                        className="w-full py-2 px-3 bg-white hover:bg-indigo-600 text-indigo-700 hover:text-white border border-indigo-200 hover:border-indigo-600 text-xs font-bold rounded-xl transition-all shadow-2xs flex items-center justify-center gap-1.5"
                      >
                        <span>{sug.actionLabel}</span>
                        <ArrowRight className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

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

            {/* All Assignments Card (Hiển thị tất cả nhiệm vụ đã và chưa làm) */}
            <div className="bg-white rounded-3xl border border-slate-200 p-5 sm:p-6 space-y-4 shadow-sm">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <h3 className="font-black text-slate-900 text-base sm:text-lg flex items-center gap-2">
                    <BookOpen className="w-5 h-5 text-indigo-600" />
                    Nhiệm vụ học tập cần hoàn thành
                  </h3>
                  <p className="text-[11px] text-slate-500 font-semibold">
                    Tổng cộng {assignments.length} nhiệm vụ ({assignments.length - unfinishedAssignments.length} đã nộp, {unfinishedAssignments.length} chưa làm)
                  </p>
                </div>
                <button 
                  onClick={() => setShowUnfinishedOnlyModal(true)}
                  className="text-xs text-indigo-600 font-black hover:text-indigo-700 hover:underline cursor-pointer flex items-center gap-1 shrink-0 bg-indigo-50/80 px-3 py-1.5 rounded-xl border border-indigo-100 transition-all hover:bg-indigo-100"
                >
                  <span>Xem tất cả ({unfinishedAssignments.length})</span>
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>

              {assignments.length === 0 ? (
                <div className="py-12 text-center text-slate-400 text-xs font-extrabold flex flex-col items-center justify-center gap-2 bg-slate-50 rounded-2xl border border-dashed border-slate-200">
                  <BookOpen className="w-8 h-8 text-slate-300" />
                  <span>Chưa có bài tập nào được giao.</span>
                </div>
              ) : (
                <div className="space-y-4 max-h-[500px] overflow-y-auto pr-1 custom-scrollbar">
                  {assignments
                    .map(assignment => {
                      const isGame = assignment.type === 'game';
                      const isFlashcard = assignment.type === 'flashcard';
                      const isSimulation = assignment.type === 'simulation';
                      const submission = mySubmissions.find(s => s.assignmentId === assignment.id);
                      const isCompleted = !!submission;
                      const isPastDue = assignment.dueDate ? new Date(assignment.dueDate).getTime() < Date.now() : false;
                      
                      return (
                        <div 
                          key={assignment.id} 
                          className={`p-4 sm:p-5 rounded-2xl border transition-all space-y-3.5 ${
                            isCompleted 
                              ? 'border-emerald-200/80 bg-emerald-50/30' 
                              : 'border-slate-200 bg-white hover:border-indigo-300 hover:shadow-md'
                          }`}
                        >
                          {/* Tag & Status Row */}
                          <div className="flex items-center justify-between gap-2 flex-wrap">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className={`text-[10px] font-black uppercase tracking-wider px-2.5 py-1 rounded-lg border ${
                                isGame ? 'bg-fuchsia-50 text-fuchsia-700 border-fuchsia-200' :
                                isFlashcard ? 'bg-rose-50 text-rose-700 border-rose-200' :
                                isSimulation ? 'bg-emerald-50 text-emerald-700 border-emerald-200' :
                                'bg-indigo-50 text-indigo-700 border-indigo-200'
                              }`}>
                                {isGame ? '🎮 TRÒ CHƠI' : 
                                 isFlashcard ? '🗂️ FLASHCARD' :
                                 isSimulation ? '🧪 MÔ PHỎNG' : '📚 BÀI KIỂM TRA'}
                              </span>

                              {shouldShowNewBadge(user.id, assignment) && !isCompleted && (
                                <span className="bg-rose-500 text-white text-[9px] font-black px-2 py-0.5 rounded-full uppercase tracking-wider animate-pulse">
                                  MỚI
                                </span>
                              )}

                              {isPastDue && !isCompleted && (
                                <span className="bg-amber-100 text-amber-800 border border-amber-200 text-[9px] font-black px-2 py-0.5 rounded-full uppercase tracking-wider">
                                  QUÁ HẠN
                                </span>
                              )}
                            </div>

                            {isCompleted ? (
                              <div className="flex items-center gap-1.5">
                                <span className="flex items-center gap-1 text-[10px] font-black text-emerald-700 bg-emerald-100/80 px-2.5 py-1 rounded-lg border border-emerald-200">
                                  <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                                  ĐÃ HOÀN THÀNH
                                </span>
                                {submission.grade !== undefined && (
                                  <span className="text-[10px] font-black text-indigo-700 bg-indigo-50 px-2 py-1 rounded-lg border border-indigo-200">
                                    {submission.grade}/10 điểm
                                  </span>
                                )}
                              </div>
                            ) : (
                              <span className="text-[10px] font-black text-slate-500 bg-slate-100 px-2 py-0.5 rounded-md">
                                CHƯA NỘP
                              </span>
                            )}
                          </div>

                          {/* Assignment Title */}
                          <div className="space-y-1">
                            <h4 
                              onClick={() => handleStartAssignment(assignment)}
                              className="font-extrabold text-slate-900 text-sm sm:text-base leading-snug tracking-tight hover:text-indigo-600 cursor-pointer transition-colors"
                            >
                              {assignment.title}
                            </h4>
                            
                            <p className="text-xs text-slate-500 font-medium flex items-center gap-1.5">
                              <Clock className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                              <span>Hạn nộp:</span>
                              <strong className="text-slate-700 font-bold">
                                {assignment.dueDate ? new Date(assignment.dueDate).toLocaleString('vi-VN', {
                                  hour: '2-digit',
                                  minute: '2-digit',
                                  second: '2-digit',
                                  day: '2-digit',
                                  month: '2-digit',
                                  year: 'numeric'
                                }) : 'Không có hạn'}
                              </strong>
                            </p>
                          </div>

                          {/* Action Button: Bắt đầu làm bài / Xem bài làm */}
                          <button
                            type="button"
                            onClick={() => handleStartAssignment(assignment)}
                            className={`w-full py-3 px-4 font-black text-xs sm:text-sm rounded-xl transition-all shadow-sm flex items-center justify-center gap-2 active:scale-[0.99] cursor-pointer ${
                              isCompleted 
                                ? 'bg-slate-50 hover:bg-slate-100 text-slate-700 border border-slate-200 shadow-none' 
                                : 'bg-indigo-600 hover:bg-indigo-700 text-white shadow-indigo-200 shadow-md'
                            }`}
                          >
                            <span>{isCompleted ? 'Xem lại bài làm' : 'Bắt đầu làm bài'}</span>
                            <ArrowRight className="w-4 h-4" />
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

      {/* Unfinished Only Modal - Bùng bảng các nhiệm vụ chưa làm */}
      <AnimatePresence>
        {showUnfinishedOnlyModal && (
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md z-[100] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="bg-white rounded-[32px] border border-slate-200 shadow-2xl w-full max-w-3xl max-h-[88vh] flex flex-col relative overflow-hidden"
            >
              {/* Header */}
              <div className="p-5 sm:p-6 border-b border-slate-100 flex items-center justify-between bg-indigo-50/60">
                <div className="flex items-center gap-3">
                  <div className="w-11 h-11 rounded-2xl bg-indigo-600 flex items-center justify-center shadow-lg shadow-indigo-200 shrink-0">
                    <BookOpen className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="font-black text-slate-900 text-lg sm:text-xl">Nhiệm vụ học tập chưa hoàn thành</h3>
                      <span className="bg-rose-500 text-white text-[10px] font-black px-2 py-0.5 rounded-full">
                        {unfinishedAssignments.length} bài chưa làm
                      </span>
                    </div>
                    <p className="text-xs text-slate-500 font-semibold mt-0.5">
                      Danh sách tất cả các bài tập, flashcard và trò chơi em chưa nộp. Hãy hoàn thành ngay nhé!
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setShowUnfinishedOnlyModal(false)}
                  className="p-2 hover:bg-white rounded-full transition-colors text-slate-400 hover:text-slate-600 border border-transparent hover:border-slate-100 shadow-sm shrink-0"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Filters & Search */}
              <div className="p-4 sm:px-6 border-b border-slate-100 bg-white flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between">
                {/* Search */}
                <div className="relative flex-1">
                  <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={unfinishedSearchQuery}
                    onChange={(e) => setUnfinishedSearchQuery(e.target.value)}
                    placeholder="Tìm kiếm nhiệm vụ chưa làm..."
                    className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs outline-none focus:border-indigo-500 focus:bg-white font-medium transition-all"
                  />
                  {unfinishedSearchQuery && (
                    <button
                      type="button"
                      onClick={() => setUnfinishedSearchQuery('')}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>

                {/* Filter Chips */}
                <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0 custom-scrollbar">
                  {[
                    { id: 'all', label: `Tất cả (${unfinishedAssignments.length})` },
                    { id: 'online_test', label: 'Bài kiểm tra' },
                    { id: 'flashcard', label: 'Flashcard' },
                    { id: 'game', label: 'Trò chơi' },
                    { id: 'simulation', label: 'Mô phỏng' },
                  ].map(tab => (
                    <button
                      key={tab.id}
                      type="button"
                      onClick={() => setUnfinishedFilterType(tab.id as any)}
                      className={`px-3 py-1.5 rounded-xl text-xs font-black transition-all whitespace-nowrap shrink-0 ${
                        unfinishedFilterType === tab.id
                          ? 'bg-indigo-600 text-white shadow-sm shadow-indigo-100'
                          : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                      }`}
                    >
                      {tab.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Assignment List Body */}
              <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-3 custom-scrollbar bg-slate-50/50">
                {unfinishedAssignments.length === 0 ? (
                  <div className="py-16 text-center space-y-4">
                    <div className="w-20 h-20 bg-emerald-100 rounded-full flex items-center justify-center mx-auto shadow-inner">
                      <CheckCircle2 className="w-10 h-10 text-emerald-600" />
                    </div>
                    <div className="space-y-1">
                      <h4 className="font-black text-slate-900 text-lg">Tuyệt vời! Không còn bài tập nào chưa làm</h4>
                      <p className="text-sm text-slate-500 font-medium max-w-md mx-auto">
                        Em đã hoàn thành xuất sắc mọi nhiệm vụ học tập được giao. Chúc mừng em! 🎉
                      </p>
                    </div>
                  </div>
                ) : modalFilteredUnfinished.length === 0 ? (
                  <div className="py-12 text-center text-slate-400 text-xs font-bold">
                    Không tìm thấy bài tập chưa làm phù hợp với bộ lọc.
                  </div>
                ) : (
                  <div className="grid grid-cols-1 gap-3">
                    {modalFilteredUnfinished.map((assignment) => {
                      const isGame = assignment.type === 'game';
                      const isFlashcard = assignment.type === 'flashcard';
                      const isSimulation = assignment.type === 'simulation';
                      const isPastDue = assignment.dueDate ? new Date(assignment.dueDate).getTime() < Date.now() : false;

                      return (
                        <div 
                          key={assignment.id} 
                          className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-sm hover:border-indigo-300 hover:shadow-md transition-all flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 group"
                        >
                          <div className="space-y-2 flex-1">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className={`text-[10px] font-black uppercase tracking-wider px-2.5 py-0.5 rounded-md border ${
                                isGame ? 'bg-fuchsia-50 text-fuchsia-700 border-fuchsia-100' :
                                isFlashcard ? 'bg-rose-50 text-rose-700 border-rose-100' :
                                isSimulation ? 'bg-emerald-50 text-emerald-700 border-emerald-100' :
                                'bg-indigo-50 text-indigo-700 border-indigo-100'
                              }`}>
                                {isGame ? '🎮 Trò chơi trí tuệ' : 
                                 isFlashcard ? '🗂️ Flashcard' :
                                 isSimulation ? '🧪 Mô phỏng' : '📚 Bài kiểm tra'}
                              </span>

                              {shouldShowNewBadge(user.id, assignment) && (
                                <span className="bg-rose-500 text-white text-[9px] font-black px-2 py-0.5 rounded-full uppercase tracking-wider animate-pulse">
                                  MỚI
                                </span>
                              )}

                              {isPastDue && (
                                <span className="bg-amber-100 text-amber-800 border border-amber-200 text-[9px] font-black px-2 py-0.5 rounded-full uppercase tracking-wider">
                                  QUÁ HẠN
                                </span>
                              )}
                            </div>

                            <h4 
                              onClick={() => {
                                setShowUnfinishedOnlyModal(false);
                                handleStartAssignment(assignment);
                              }}
                              className="font-black text-slate-900 text-sm sm:text-base group-hover:text-indigo-600 transition-colors cursor-pointer"
                            >
                              {assignment.title}
                            </h4>

                            <div className="flex flex-wrap items-center gap-3 text-[11px] font-bold text-slate-500">
                              <span className="flex items-center gap-1">
                                <Clock className="w-3.5 h-3.5 text-slate-400" /> 
                                Hạn nộp: <strong className="text-slate-700">{assignment.dueDate ? new Date(assignment.dueDate).toLocaleString('vi-VN') : 'Không giới hạn'}</strong>
                              </span>
                              {assignment.classSessionTitle && (
                                <span className="flex items-center gap-1 text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-md">
                                  <Layers className="w-3 h-3" /> {assignment.classSessionTitle}
                                </span>
                              )}
                            </div>
                          </div>

                          <button
                            type="button"
                            onClick={() => {
                              setShowUnfinishedOnlyModal(false);
                              handleStartAssignment(assignment);
                            }}
                            className="w-full sm:w-auto px-6 py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-black text-xs sm:text-sm rounded-xl shadow-lg shadow-indigo-100 transition-all active:scale-95 flex items-center justify-center gap-2 shrink-0 cursor-pointer"
                          >
                            <span>Bắt đầu làm bài</span>
                            <ArrowRight className="w-4 h-4" />
                          </button>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Modal Footer */}
              <div className="p-4 sm:p-5 border-t border-slate-100 bg-white flex items-center justify-between">
                <p className="text-xs text-slate-400 font-semibold">
                  Hiển thị {modalFilteredUnfinished.length} / {unfinishedAssignments.length} nhiệm vụ chưa nộp
                </p>
                <button
                  type="button"
                  onClick={() => setShowUnfinishedOnlyModal(false)}
                  className="px-6 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-black text-xs rounded-xl transition-all cursor-pointer"
                >
                  Đóng
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Unsubmitted reminder detail modal overlay */}
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
              <p className="text-xs text-slate-500">Giáo viên có thể sao chép tin nhắn cá nhân hóa bên dưới để gửi nhắc nhở cho Phụ huynh / Học sinh.</p>
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
