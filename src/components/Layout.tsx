import React, { useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { BookOpen, Calendar, LayoutDashboard, Microscope, Users, BellRing, Menu, X, Phone, User as UserIcon, LogOut, Check, Sparkles, ShieldCheck, Edit2, Settings, Upload, RotateCcw, Camera, Library, Gamepad2, Moon, Sun, Video, Bot } from 'lucide-react';
import { Role, User, Assignment, Submission, SystemNotification, ClassSession } from '../types';
import { UserAvatar, combineName, getFirstName, getLastName } from './UserAvatar';
import { db } from '../firebase';
import { doc, setDoc } from 'firebase/firestore';

export function getAvatarInitial(name?: string): string {
  if (!name || !name.trim()) return 'U';
  let cleanName = name.trim().replace(/^(Cô|Thầy|Ths|Ts|Mr|Mrs|Ms)\s+/i, '');
  if (!cleanName) cleanName = name.trim();
  return cleanName.charAt(0).toUpperCase();
}

interface LayoutProps {
  children: React.ReactNode;
  user: User;
  currentRole?: Role;
  onRoleChange: (role: Role) => void;
  activeTab: string;
  onTabChange: (tab: string) => void;
  onUpdateUser?: (user: User) => void;
  onLogout?: () => void;
  onOpenGuide?: () => void;
  onOpenRobot?: () => void;
  assignments?: Assignment[];
  submissions?: Submission[];
  systemNotifications?: SystemNotification[];
  classes?: ClassSession[];
}

function formatRelativeTime(dateString: string): string {
  try {
    const diff = Date.now() - new Date(dateString).getTime();
    const minutes = Math.floor(diff / 60000);
    if (minutes < 1) return 'Vừa xong';
    if (minutes < 60) return `${minutes} phút trước`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours} giờ trước`;
    const days = Math.floor(hours / 24);
    return `${days} ngày trước`;
  } catch (e) {
    return 'Vừa xong';
  }
}

export function Layout({ children, user, currentRole, onRoleChange, activeTab, onTabChange, onUpdateUser, onLogout, onOpenGuide, onOpenRobot, assignments, submissions, systemNotifications = [], classes = [] }: LayoutProps) {
  const [showNotifications, setShowNotifications] = useState(false);
  const [notifFilter, setNotifFilter] = useState<'unread' | 'all'>('unread');
  const [remindedIds, setRemindedIds] = useState<string[]>([]);

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

  const handleMarkAsRead = (notifId: string) => {
    const currentRead = user.readNotifications || [];
    if (!currentRead.includes(notifId)) {
      const updatedUser = {
        ...user,
        readNotifications: [...currentRead, notifId]
      };
      if (onUpdateUser) {
        onUpdateUser(updatedUser);
      }
    }
  };

  const handleMarkAllAsRead = () => {
    const allIds = systemNotifications.map(n => n.id);
    const currentRead = user.readNotifications || [];
    const merged = Array.from(new Set([...currentRead, ...allIds]));
    if (onUpdateUser) {
      onUpdateUser({
        ...user,
        readNotifications: merged
      });
    }
  };

  const unreadNotifications = React.useMemo(() => {
    return systemNotifications.filter(n => !user.readNotifications?.includes(n.id));
  }, [systemNotifications, user.readNotifications]);

  const displayedNotifications = React.useMemo(() => {
    if (notifFilter === 'unread') {
      return unreadNotifications;
    }
    return systemNotifications;
  }, [notifFilter, unreadNotifications, systemNotifications]);

  const activeRole = currentRole || user.role;
  const isAdmin = activeRole === 'admin';
  const isTeacher = activeRole === 'teacher' || activeRole === 'admin';

  const upcomingAssignments = React.useMemo(() => {
    if (isTeacher || !assignments) return [];
    const now = new Date().getTime();
    const next24h = now + 24 * 60 * 60 * 1000;
    
    return assignments.filter(a => {
      if (!a.dueDate) return false;
      const dueTime = new Date(a.dueDate).getTime();
      if (dueTime < now || dueTime > next24h) return false;
      
      const hasSubmitted = submissions?.some(s => s.assignmentId === a.id && s.studentId === user.id);
      return !hasSubmitted;
    });
  }, [assignments, submissions, isTeacher, user.id]);

  interface PopupAlert {
    id: string;
    type: 'class' | 'assignment';
    title: string;
    subtitle: string;
    tag: string;
    timerText: string;
    link?: string;
    subject?: string;
    originalId: string;
  }

  const [activeAlert, setActiveAlert] = useState<PopupAlert | null>(null);
  const [dismissedAlerts, setDismissedAlerts] = useState<string[]>(() => {
    try {
      return JSON.parse(localStorage.getItem('dismissed_alerts') || '[]');
    } catch {
      return [];
    }
  });

  const handleDismissAlert = (alertId: string) => {
    const updated = [...dismissedAlerts, alertId];
    setDismissedAlerts(updated);
    localStorage.setItem('dismissed_alerts', JSON.stringify(updated));
    setActiveAlert(null);
  };

  const upcomingClasses = React.useMemo(() => {
    if (!classes) return [];
    const now = Date.now();
    return classes.filter(session => {
      try {
        const start = new Date(session.startTime).getTime();
        const end = new Date(session.endTime).getTime();
        
        // Starts in less than 15 minutes, or is active right now
        const isUpcoming = start > now && (start - now <= 15 * 60 * 1000);
        const isActive = now >= start && now <= end;
        
        return isUpcoming || isActive;
      } catch {
        return false;
      }
    });
  }, [classes]);

  const hasUnread = upcomingAssignments.length > 0 || upcomingClasses.length > 0 || unreadNotifications.length > 0;

  // Periodically check for triggering popup alerts on screen
  React.useEffect(() => {
    const checkAlerts = () => {
      const now = Date.now();
      
      // 1. Check classes starting in less than 15 minutes, or active
      if (classes && classes.length > 0) {
        for (const session of classes) {
          try {
            const start = new Date(session.startTime).getTime();
            const end = new Date(session.endTime).getTime();
            const alertId = `class_${session.id}`;
            
            const isUpcoming = start > now && (start - now <= 15 * 60 * 1000);
            const isActive = now >= start && now <= end;
            
            if ((isUpcoming || isActive) && !dismissedAlerts.includes(alertId)) {
              const minutesLeft = Math.ceil((start - now) / 60000);
              const timerText = isActive ? 'Đang diễn ra' : `Bắt đầu sau ${Math.max(1, minutesLeft)} phút`;
              
              setActiveAlert({
                id: alertId,
                type: 'class',
                title: session.title,
                subtitle: `Môn học: ${session.subject || 'Toán Học'}`,
                tag: 'LỊCH HỌC',
                timerText,
                link: session.link,
                subject: session.subject,
                originalId: session.id
              });
              return; // Show one at a time
            }
          } catch (e) {
            console.error(e);
          }
        }
      }

      // 2. Check assignments due in less than 24 hours that are not yet submitted
      if (assignments && assignments.length > 0) {
        for (const assignment of assignments) {
          try {
            if (!assignment.dueDate) continue;
            const due = new Date(assignment.dueDate).getTime();
            const alertId = `assign_${assignment.id}`;
            
            const isDueSoon = due > now && (due - now <= 24 * 60 * 60 * 1000);
            const hasSubmitted = submissions?.some(s => s.assignmentId === assignment.id && s.studentId === user.id);
            
            if (isDueSoon && !hasSubmitted && !dismissedAlerts.includes(alertId)) {
              const hoursLeft = Math.ceil((due - now) / (60 * 60 * 1000));
              const timerText = `Hạn nộp: Còn ${hoursLeft} giờ`;
              
              setActiveAlert({
                id: alertId,
                type: 'assignment',
                title: assignment.title,
                subtitle: `Dạng bài: ${assignment.type === 'game' ? 'Game' : assignment.type === 'online_test' ? 'Trắc nghiệm' : 'Tự luận'}`,
                tag: 'BÀI TẬP SẮP HẠN',
                timerText,
                subject: assignment.classSessionTitle || 'Chuyên đề',
                originalId: assignment.id
              });
              return; // Show one at a time
            }
          } catch (e) {
            console.error(e);
          }
        }
      }
    };

    checkAlerts();
    const interval = setInterval(checkAlerts, 10000);
    return () => clearInterval(interval);
  }, [classes, assignments, submissions, dismissedAlerts, user.id]);

  React.useEffect(() => {
    (window as any).simulateClassReminder = (className: string) => {
      setActiveAlert({
        id: 'sim_class_' + Date.now(),
        type: 'class',
        title: className || 'Chuyên đề Toán học: Hình học Oxyz',
        subtitle: 'Môn học: Toán Đại Số',
        tag: 'CHẠY THỬ',
        timerText: 'Bắt đầu sau 15 phút',
        link: 'https://meet.google.com/abc-defg-hij',
        subject: 'Toán Đại Số',
        originalId: 'sim_session_123'
      });
    };
    return () => {
      try {
        delete (window as any).simulateClassReminder;
      } catch (e) {}
    };
  }, []);

  const [academicYear, setAcademicYear] = useState(() => {
    return localStorage.getItem('academic_year') || 'Khóa 2024 - 2025';
  });
  const [isEditingYear, setIsEditingYear] = useState(false);
  const [tempYear, setTempYear] = useState(academicYear);

  const handleSaveYear = () => {
    const trimmed = tempYear.trim();
    if (trimmed) {
      setAcademicYear(trimmed);
      localStorage.setItem('academic_year', trimmed);
    }
    setIsEditingYear(false);
  };

  const [showProfileModal, setShowProfileModal] = useState(false);
  const [profileName, setProfileName] = useState(user.name);
  const [profileLastName, setProfileLastName] = useState(getLastName(user.name, user.lastName));
  const [profileFirstName, setProfileFirstName] = useState(getFirstName(user.name, user.firstName));
  const [profileDob, setProfileDob] = useState(user.dob || '');
  const [profilePhoneStudent, setProfilePhoneStudent] = useState(user.phoneStudent || '');
  const [profilePhoneParent, setProfilePhoneParent] = useState(user.phoneParent || '');
  const [profileClassName, setProfileClassName] = useState(user.className || '');
  const [profileRole, setProfileRole] = useState<Role>(user.role);
  const [selectedAvatar, setSelectedAvatar] = useState(user.avatar);
  const [isEditing, setIsEditing] = useState(false);

  const fileInputRef = React.useRef<HTMLInputElement | null>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        alert('Kích thước ảnh quá lớn! Vui lòng chọn ảnh nhỏ hơn 5MB.');
        return;
      }
      const reader = new FileReader();
      reader.onloadend = () => {
        if (typeof reader.result === 'string') {
          setSelectedAvatar(reader.result);
        }
      };
      reader.readAsDataURL(file);
    }
  };

  React.useEffect(() => {
    setProfileName(user.name);
    setProfileLastName(getLastName(user.name, user.lastName));
    setProfileFirstName(getFirstName(user.name, user.firstName));
    setProfileDob(user.dob || '');
    setProfilePhoneStudent(user.phoneStudent || '');
    setProfilePhoneParent(user.phoneParent || '');
    setProfileClassName(user.className || '');
    setProfileRole(user.role);
    setSelectedAvatar(user.avatar);
    setIsEditing(false);
  }, [user]);

  React.useEffect(() => {
    const handleStorageChange = () => {
      setAcademicYear(localStorage.getItem('academic_year') || 'Khóa 2024 - 2025');
    };
    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, []);

  const handleSaveProfile = () => {
    const finalFullName = combineName(profileLastName, profileFirstName) || profileName;
    if (onUpdateUser) {
      onUpdateUser({
        ...user,
        name: finalFullName,
        lastName: profileLastName,
        firstName: profileFirstName,
        dob: profileDob,
        phoneStudent: profilePhoneStudent,
        phoneParent: profilePhoneParent,
        className: profileClassName,
        role: profileRole,
        avatar: selectedAvatar,
      });
    }
    if (profileRole !== user.role) {
      onRoleChange(profileRole);
    }
    setIsEditing(false);
  };

  const navItems = [
    { id: 'dashboard', label: 'Trang chủ', icon: LayoutDashboard },
    ...(isAdmin ? [{ id: 'admin', label: 'Quản trị hệ thống', icon: ShieldCheck }] : []),
    ...(isTeacher ? [
      { id: 'students', label: 'Học sinh', icon: Users },
      { id: 'notifications-manager', label: 'Quản lý thông báo', icon: BellRing }
    ] : []),
    { id: 'flashcards', label: 'Flashcard', icon: Library },
    { id: 'assignments', label: 'Bài tập', icon: BookOpen },
    { id: 'games', label: 'Chơi và học', icon: Gamepad2 },
    { id: 'schedule', label: 'Lịch học', icon: Calendar },
    { id: 'simulations', label: 'Mô phỏng', icon: Microscope },
  ];

  const handleTabClick = (tabId: string) => {
    onTabChange(tabId);
  };

  return (
    <div className="flex h-screen w-full overflow-hidden font-sans text-slate-800 bg-[#f8fafc]">
      
      {/* Desktop & Tablet Sidebar Navigation */}
      <aside className="hidden md:flex group w-20 hover:w-64 bg-white text-slate-600 flex-col border-r border-slate-200 absolute z-50 transition-all duration-300 ease-in-out shadow-[4px_0_24px_rgba(0,0,0,0.02)] hover:shadow-[12px_0_32px_rgba(0,0,0,0.05)] overflow-hidden h-full left-0 top-0 print:hidden">
        <nav className="flex-1 px-3 space-y-2 overflow-y-auto mt-4 sm:mt-6 custom-scrollbar">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => handleTabClick(item.id)}
                data-tour={item.id}
                className={`w-full flex items-center gap-4 px-3 py-3 text-sm 2xl:text-base rounded-xl transition-all font-medium whitespace-nowrap overflow-hidden min-h-[44px] ${
                  isActive
                    ? 'bg-indigo-50 text-indigo-600 border border-indigo-100 font-bold'
                    : 'hover:bg-slate-50 text-slate-600 hover:text-slate-900 border border-transparent'
                }`}
              >
                <div className="shrink-0 w-8 h-8 flex items-center justify-center">
                  <Icon className={`w-5 h-5 2xl:w-6 2xl:h-6 ${isActive ? 'text-indigo-600' : 'text-slate-400'}`} />
                </div>
                <span className="opacity-0 group-hover:opacity-100 transition-opacity duration-300 truncate">
                  {item.label}
                </span>
              </button>
            );
          })}
        </nav>
        <div className="p-3 mt-auto overflow-hidden whitespace-nowrap">
          <div 
            onClick={() => setShowProfileModal(true)}
            title="Xem thông tin cá nhân"
            className="flex flex-col p-2 group-hover:p-3 bg-slate-50 hover:bg-indigo-50/50 rounded-xl border border-slate-100 hover:border-indigo-100 transition-all duration-300 cursor-pointer"
          >
             <div className="flex items-center gap-3">
               <UserAvatar name={user.name} firstName={user.firstName} avatar={user.avatar} size="md" />
               <div className="flex-1 min-w-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300 w-0 group-hover:w-auto">
                 <p className="text-sm 2xl:text-base font-bold text-slate-900 truncate">{user.name}</p>
                 <p className="text-[11px] 2xl:text-xs font-medium text-slate-500 truncate capitalize mt-0.5">
                   {activeRole === 'admin' ? 'Quản trị viên' : activeRole === 'teacher' ? 'Giáo viên' : 'Học sinh'}
                 </p>
               </div>
             </div>
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col min-w-0 overflow-hidden relative ml-0 md:ml-20 print:ml-0 transition-all duration-300 bg-[#f8fafc] pb-24 md:pb-0 print:pb-0">
        {/* Top Header */}
        <header className="h-16 sm:h-20 2xl:h-24 bg-white/90 backdrop-blur-xl border-b border-slate-200 flex items-center justify-between px-3 sm:px-6 md:px-8 shrink-0 z-40 sticky top-0 shadow-sm print:hidden">
          <div className="flex items-center gap-2 sm:gap-4 min-w-0">
            <h2 className="text-base sm:text-xl 2xl:text-2xl font-bold text-slate-900 tracking-tight truncate">
              {navItems.find(item => item.id === activeTab)?.label || 'Bảng điều khiển'}
            </h2>
            {isEditingYear ? (
              <div className="hidden sm:flex items-center gap-1.5 bg-white border border-indigo-300 rounded-full px-2.5 py-0.5 shadow-sm shrink-0 z-20">
                <input
                  type="text"
                  value={tempYear}
                  onChange={(e) => setTempYear(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleSaveYear();
                    if (e.key === 'Escape') {
                      setTempYear(academicYear);
                      setIsEditingYear(false);
                    }
                  }}
                  autoFocus
                  className="bg-transparent text-xs font-semibold text-indigo-700 px-1 py-0.5 outline-none w-28 text-center"
                />
                <button
                  type="button"
                  onClick={handleSaveYear}
                  className="p-1 text-emerald-600 hover:bg-emerald-50 rounded-full transition-colors flex items-center justify-center"
                  title="Lưu"
                >
                  <Check className="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setTempYear(academicYear);
                    setIsEditingYear(false);
                  }}
                  className="p-1 text-rose-500 hover:bg-rose-50 rounded-full transition-colors flex items-center justify-center"
                  title="Hủy"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            ) : (
              <div className="hidden md:flex items-center gap-1 bg-indigo-50 text-indigo-700 px-3 py-1 rounded-full text-xs font-semibold border border-indigo-100 shrink-0 select-none group/year">
                <span>{academicYear}</span>
                {isTeacher && (
                  <button
                    type="button"
                    onClick={() => {
                      setTempYear(academicYear);
                      setIsEditingYear(true);
                    }}
                    className="opacity-0 group-hover/year:opacity-100 transition-opacity ml-1.5 p-0.5 text-indigo-500 hover:text-indigo-800 hover:bg-indigo-100/50 rounded-md flex items-center justify-center"
                    title="Chỉnh sửa khóa học"
                  >
                    <Edit2 className="w-3 h-3" />
                  </button>
                )}
              </div>
            )}
          </div>
          
          <div className="flex items-center gap-2 sm:gap-4 md:gap-5 shrink-0">
            <div className="relative">
              <button 
                onClick={() => setShowNotifications(!showNotifications)}
                className={`p-2 hover:bg-slate-50 rounded-full transition-colors relative min-w-[40px] min-h-[40px] flex items-center justify-center ${
                  showNotifications ? 'text-indigo-600 bg-indigo-50/50' : 'text-slate-400 hover:text-slate-600'
                }`}
                title="Thông báo"
              >
                <BellRing className="w-5 h-5 2xl:w-6 2xl:h-6" />
                {hasUnread && (
                  <span className="absolute top-1.5 right-1.5 w-2.5 h-2.5 bg-rose-500 rounded-full border-2 border-white animate-pulse"></span>
                )}
              </button>

              <AnimatePresence>
                {showNotifications && (
                  <>
                    {/* Backdrop to close dropdown */}
                    <div 
                      className="fixed inset-0 z-30" 
                      onClick={() => setShowNotifications(false)}
                    />
                    
                    <motion.div
                      initial={{ opacity: 0, y: 10, scale: 0.95 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: 10, scale: 0.95 }}
                      transition={{ duration: 0.15 }}
                      className="fixed md:absolute top-16 md:top-auto left-4 right-4 md:left-auto md:right-0 mt-2 w-auto md:w-96 bg-white border border-slate-200 rounded-2xl shadow-2xl z-[60] overflow-hidden flex flex-col text-left origin-top-right"
                    >
                      <div className="p-4 border-b border-slate-100 bg-slate-50/50 space-y-3">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-black text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                            <span>🔔</span> Thông báo hệ thống
                          </span>
                          {unreadNotifications.length > 0 && (
                            <button
                              onClick={handleMarkAllAsRead}
                              className="text-[10px] text-indigo-600 hover:text-indigo-800 font-bold flex items-center gap-1 transition-all"
                            >
                              Đọc tất cả ({unreadNotifications.length})
                            </button>
                          )}
                        </div>
                        <div className="flex bg-slate-100 p-1 rounded-lg gap-1">
                          <button
                            onClick={() => setNotifFilter('unread')}
                            className={`flex-1 text-center py-1 text-xs font-bold rounded-md transition-all ${
                              notifFilter === 'unread'
                                ? 'bg-white text-slate-800 shadow-sm'
                                : 'text-slate-500 hover:text-slate-700'
                            }`}
                          >
                            Chưa đọc ({unreadNotifications.length})
                          </button>
                          <button
                            onClick={() => setNotifFilter('all')}
                            className={`flex-1 text-center py-1 text-xs font-bold rounded-md transition-all ${
                              notifFilter === 'all'
                                ? 'bg-white text-slate-800 shadow-sm'
                                : 'text-slate-500 hover:text-slate-700'
                            }`}
                          >
                            Tất cả ({systemNotifications.length})
                          </button>
                        </div>
                      </div>

                      <div className="p-4 space-y-4 max-h-[320px] overflow-y-auto custom-scrollbar">
                        {/* Simulation Section */}
                        <div className="p-3 bg-indigo-50/40 border border-indigo-100/50 rounded-xl space-y-2">
                          <p className="text-[11px] text-indigo-700 font-bold flex items-center gap-1">
                            <span>💡</span> Thử nghiệm tính năng nhắc lịch:
                          </p>
                          <p className="text-[10px] text-slate-500 font-medium leading-relaxed">
                            Nhấp nút dưới đây để tạo giả lập 1 lớp học sắp bắt đầu sau 15 phút. Bạn sẽ nhận được thông báo Toast nhắc nhở tức thì.
                          </p>
                          <button
                            type="button"
                            onClick={() => {
                              if ((window as any).simulateClassReminder) {
                                (window as any).simulateClassReminder("Chuyên đề Toán học: Hình học Oxyz");
                              } else {
                                alert("Tính năng nhắc lịch đang được khởi tạo, vui lòng thử lại sau!");
                              }
                              setShowNotifications(false);
                            }}
                            className="w-full py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold text-[11px] rounded-lg transition-colors flex items-center justify-center gap-1.5 shadow-sm shadow-indigo-600/10 uppercase tracking-wider active:scale-98"
                          >
                            🔔 Giả Lập Nhắc Lịch Học (Trước 15 Phút)
                          </button>
                        </div>

                        {/* Upcoming Classes Notices */}
                        {upcomingClasses.length > 0 && (
                          <div className="space-y-3">
                            <h6 className="text-[10px] font-black text-slate-500 uppercase tracking-wider px-1">Lịch học sắp diễn ra</h6>
                            {upcomingClasses.map(session => {
                              const start = new Date(session.startTime).getTime();
                              const now = Date.now();
                              const isOngoing = now >= start;
                              const text = isOngoing ? 'Đang diễn ra' : `Bắt đầu sau ${Math.max(1, Math.ceil((start - now) / 60000))} phút`;
                              return (
                                <div key={session.id} className="flex gap-3 items-start p-2 rounded-xl bg-indigo-50 border border-indigo-100/50 hover:bg-indigo-50 transition-colors">
                                  <div className="w-8 h-8 rounded-lg bg-indigo-100 border border-indigo-200 flex items-center justify-center text-indigo-600 shrink-0 mt-0.5 animate-pulse">
                                    📹
                                  </div>
                                  <div className="flex-1 min-w-0">
                                    <p className="text-xs font-bold text-slate-800 truncate">{session.title}</p>
                                    <p className="text-[10px] text-slate-600 font-medium truncate mt-0.5 leading-relaxed">
                                      Môn học: {session.subject || 'Toán học'}
                                    </p>
                                    <div className="flex items-center justify-between mt-1">
                                      <span className="text-[10px] text-indigo-600 font-extrabold">{text}</span>
                                      <a
                                        href={session.link}
                                        target="_blank"
                                        referrerPolicy="no-referrer"
                                        className="text-[9px] bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold px-2 py-0.5 rounded transition-all"
                                      >
                                        Vào học
                                      </a>
                                    </div>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        )}

                        {/* Upcoming Assignments Notices */}
                        {upcomingAssignments.length > 0 && (
                          <div className="space-y-3">
                            <h6 className="text-[10px] font-black text-slate-500 uppercase tracking-wider px-1">Bài Tập Sắp Hết Hạn</h6>
                            {upcomingAssignments.map(assignment => {
                              const hoursLeft = Math.max(1, Math.ceil((new Date(assignment.dueDate!).getTime() - Date.now()) / (60 * 60 * 1000)));
                              return (
                                <div key={assignment.id} className="flex gap-3 items-start p-2 rounded-xl bg-orange-50/50 border border-orange-100/50 hover:bg-orange-50 transition-colors relative group/item w-full">
                                  <div className="w-8 h-8 rounded-lg bg-orange-100 border border-orange-200 flex items-center justify-center text-orange-600 shrink-0 mt-0.5 animate-pulse">
                                    ⏰
                                  </div>
                                  <div className="flex-1 min-w-0">
                                    <p className="text-xs font-bold text-slate-800 truncate">{assignment.title}</p>
                                    <p className="text-[10px] text-slate-600 font-medium mt-0.5 leading-relaxed truncate">
                                      {assignment.classSessionTitle ? `${assignment.classSessionTitle} - ` : ''}Dạng: {assignment.type === 'game' ? 'Game' : assignment.type === 'online_test' ? 'Trắc nghiệm' : 'Tự luận'}
                                    </p>
                                    <div className="flex items-center justify-between gap-2 mt-1.5 flex-wrap">
                                      <span className="text-[10px] text-orange-600 font-extrabold">Còn {hoursLeft} giờ</span>
                                      
                                      <button
                                        onClick={() => handleRequestReminder(assignment.id, assignment.title, assignment.dueDate!)}
                                        className={`text-[9px] px-1.5 py-0.5 rounded border font-black flex items-center gap-0.5 cursor-pointer transition-colors ${
                                          remindedIds.includes(assignment.id)
                                            ? 'bg-emerald-50 border-emerald-200 text-emerald-700'
                                            : 'bg-white border-orange-200 hover:border-orange-300 text-orange-600 hover:bg-orange-50'
                                        }`}
                                      >
                                        {remindedIds.includes(assignment.id) ? (
                                          <>
                                            <Check className="w-2.5 h-2.5 stroke-[3]" /> Đã đặt nhắc
                                          </>
                                        ) : (
                                          <>
                                            <BellRing className="w-2.5 h-2.5" /> Nhắc tôi
                                          </>
                                        )}
                                      </button>
                                    </div>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        )}

                        {/* Recent Notices */}
                        <div className="space-y-3">
                          <h6 className="text-[10px] font-black text-slate-500 uppercase tracking-wider px-1">Từ Hệ Thống</h6>
                          {displayedNotifications.length === 0 ? (
                            <div className="text-center py-6 text-xs text-slate-400">
                              Chưa có thông báo nào {notifFilter === 'unread' ? 'chưa đọc' : ''}.
                            </div>
                          ) : (
                            <AnimatePresence initial={false}>
                              {displayedNotifications.map((notif) => {
                                const badgeEmoji = notif.badge?.split(' ')[0] || '📢';
                                const isUnread = !user.readNotifications?.includes(notif.id);
                                
                                let bgBadgeColor = "bg-slate-50 border-slate-100 text-slate-600";
                                if (notif.badgeColor === "emerald" || notif.type === "system_update") {
                                  bgBadgeColor = "bg-emerald-50 border-emerald-100 text-emerald-600";
                                } else if (notif.badgeColor === "indigo" || notif.type === "badge_info") {
                                  bgBadgeColor = "bg-indigo-50 border-indigo-100 text-indigo-600";
                                } else if (notif.badgeColor === "amber" || notif.type === "class_reminder") {
                                  bgBadgeColor = "bg-amber-50 border-amber-100 text-amber-600";
                                }

                                return (
                                  <motion.div
                                    key={notif.id}
                                    layout
                                    initial={{ opacity: 0, x: 20 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    exit={{ opacity: 0, x: -20 }}
                                    transition={{ duration: 0.2 }}
                                    className={`flex gap-3 items-start p-2.5 rounded-xl hover:bg-slate-50/70 transition-colors relative group ${
                                      isUnread ? 'bg-indigo-50/10 border border-indigo-100/20' : ''
                                    }`}
                                  >
                                    <div className={`w-8 h-8 rounded-lg ${bgBadgeColor} border flex items-center justify-center shrink-0 mt-0.5 font-bold text-sm relative`}>
                                      {badgeEmoji}
                                      {isUnread && (
                                        <span className="absolute -top-1 -right-1 w-2 h-2 bg-indigo-600 rounded-full border border-white"></span>
                                      )}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                      <div className="flex items-start justify-between gap-2">
                                        <p className={`text-xs text-slate-800 break-words ${isUnread ? 'font-black' : 'font-bold'}`}>
                                          {notif.title}
                                        </p>
                                        {isUnread && (
                                          <button
                                            onClick={() => handleMarkAsRead(notif.id)}
                                            className="opacity-0 group-hover:opacity-100 transition-opacity p-1 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200/50 rounded-lg text-[9px] font-extrabold flex items-center gap-0.5 whitespace-nowrap shrink-0"
                                            title="Đánh dấu đã đọc"
                                          >
                                            <Check className="w-3 h-3 stroke-[3]" />
                                            Đã đọc
                                          </button>
                                        )}
                                      </div>
                                      <p className="text-[10px] text-slate-500 font-medium mt-0.5 leading-relaxed break-words">
                                        {notif.content}
                                      </p>
                                      <div className="flex items-center justify-between mt-1.5">
                                        <span className="text-[9px] text-slate-400 font-bold">
                                          {formatRelativeTime(notif.createdAt)}
                                        </span>
                                        {isUnread && (
                                          <button
                                            onClick={() => handleMarkAsRead(notif.id)}
                                            className="md:hidden text-indigo-600 font-extrabold text-[9px] hover:underline"
                                          >
                                            Đã đọc
                                          </button>
                                        )}
                                      </div>
                                    </div>
                                  </motion.div>
                                );
                              })}
                            </AnimatePresence>
                          )}
                        </div>
                      </div>

                      <div className="p-3 border-t border-slate-100 text-center bg-slate-50/30">
                        <button 
                          onClick={() => setShowNotifications(false)}
                          className="text-[11px] text-slate-500 hover:text-indigo-600 font-bold transition-colors"
                        >
                          Đóng cửa sổ thông báo
                        </button>
                      </div>
                    </motion.div>
                  </>
                )}
              </AnimatePresence>
            </div>

            <div 
              onClick={() => setShowProfileModal(true)}
              title="Xem thông tin cá nhân"
              className="flex items-center gap-3 pl-3 sm:pl-5 border-l border-slate-200 cursor-pointer hover:opacity-80 transition-opacity"
            >
              <div className="text-right hidden sm:block">
                <p className="text-sm font-bold text-slate-900">{user.name}</p>
                <p className="text-xs font-medium text-slate-500">
                  {user.isSuperAdmin ? '👑 Admin & Giáo viên' : activeRole === 'admin' ? 'Quản trị viên & Giáo viên' : activeRole === 'teacher' ? 'Giáo viên' : 'Học sinh'}
                </p>
              </div>
              <UserAvatar name={user.name} firstName={user.firstName} avatar={user.avatar} size="md" />
            </div>
          </div>
        </header>
        
        <div className="flex-1 overflow-auto p-3 sm:p-5 md:p-6 lg:p-8 2xl:p-10 custom-scrollbar">
          <div className="w-full h-full max-w-7xl 2xl:max-w-[1750px] 3xl:max-w-[2200px] mx-auto">
            {children}
          </div>
        </div>
      </main>

      {/* Mobile & Tablet Touch Bottom Navigation Bar with Safe Area Support */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-white/95 backdrop-blur-lg border-t border-slate-200/90 z-40 px-2 pt-1 pb-safe flex items-center overflow-x-auto no-scrollbar scroll-smooth gap-1 shadow-[0_-4px_24px_rgba(0,0,0,0.06)] print:hidden">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => handleTabClick(item.id)}
              className={`flex flex-col items-center justify-center py-1.5 px-2.5 rounded-2xl transition-all shrink-0 min-w-[64px] min-h-[46px] touch-manipulation ${
                isActive ? 'text-indigo-600 font-bold bg-indigo-50/80 shadow-xs' : 'text-slate-500 hover:text-slate-900 active:scale-95'
              }`}
            >
              <div className={`p-1 rounded-xl transition-colors ${isActive ? 'bg-indigo-100/90 text-indigo-700' : ''}`}>
                <Icon className="w-5 h-5" />
              </div>
              <span className="text-[10px] sm:text-[11px] font-semibold mt-0.5 truncate max-w-[70px] tracking-tight">{item.label}</span>
            </button>
          );
        })}
      </nav>

      {/* Profile Modal */}
      {showProfileModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full border border-slate-200 shadow-2xl overflow-hidden flex flex-col max-h-[90vh] animate-in fade-in zoom-in-95 duration-200">
            {/* Modal Header */}
            <div className="p-5 border-b border-slate-100 flex items-center justify-between bg-gradient-to-r from-slate-50 to-indigo-50/20">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-indigo-50 flex items-center justify-center text-indigo-600">
                  <UserIcon className="w-4.5 h-4.5" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-900 text-base">Thông tin cá nhân</h3>
                  <p className="text-xs text-slate-500">Xem và cập nhật hồ sơ của bạn</p>
                </div>
              </div>
              <button 
                onClick={() => {
                  setShowProfileModal(false);
                  setIsEditing(false);
                }}
                className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Content */}
            <div className="p-6 overflow-y-auto space-y-6 custom-scrollbar">
              {/* Profile Card Summary */}
              <div className="flex flex-col items-center text-center space-y-3 bg-slate-50 p-5 rounded-2xl border border-slate-100">
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleFileChange}
                  accept="image/*"
                  className="hidden"
                />
                <div className="relative group">
                  <UserAvatar name={profileName} firstName={profileFirstName} avatar={selectedAvatar} size="xl" />
                  {isEditing && (
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      title="Tải ảnh avatar mới"
                      className="absolute -bottom-1 -right-1 bg-indigo-600 hover:bg-indigo-700 text-white p-2 rounded-full border-2 border-white shadow-md transition-all hover:scale-110 cursor-pointer"
                    >
                      <Camera className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
                <div>
                  <h4 className="font-bold text-slate-900 text-lg">{profileName}</h4>
                  <div className="flex items-center justify-center gap-1.5 mt-1">
                    <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold border ${
                      user.isSuperAdmin
                        ? 'bg-amber-100 text-amber-900 border-amber-300 font-black'
                        : user.role === 'admin'
                          ? 'bg-purple-50 text-purple-700 border-purple-200'
                          : user.role === 'teacher' 
                            ? 'bg-amber-50 text-amber-700 border-amber-100' 
                            : 'bg-indigo-50 text-indigo-700 border-indigo-100'
                    }`}>
                      {user.isSuperAdmin ? '👑 Quản trị viên chính & Giáo viên' : user.role === 'admin' ? 'Quản trị viên & Giáo viên' : user.role === 'teacher' ? 'Giáo viên' : 'Học sinh'}
                    </span>
                    <span className="flex items-center gap-1 text-xs font-medium text-emerald-600">
                      <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                      Đang hoạt động
                    </span>
                  </div>
                  
                  <div className="mt-4 inline-flex items-center gap-2 bg-white px-4 py-2 rounded-xl border border-indigo-100 shadow-sm">
                    <span className="text-xs text-slate-500 font-medium">Mã kết nối:</span>
                    <span className="font-mono font-bold text-indigo-600 text-sm tracking-wider">
                      {user.connectionCode || user.id.substring(0, 6).toUpperCase()}
                    </span>
                  </div>
                </div>
              </div>

              {/* Avatar Info & Controls (Only visible during edit mode) */}
              {isEditing && (
                <div className="p-3.5 bg-indigo-50/60 rounded-2xl border border-indigo-100 flex flex-col items-center gap-2.5">
                  <div className="flex items-center gap-2 flex-wrap justify-center">
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="px-3.5 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-xl shadow-sm transition-colors flex items-center gap-1.5"
                    >
                      <Upload className="w-3.5 h-3.5" />
                      Tải ảnh avatar mới
                    </button>
                    {selectedAvatar ? (
                      <button
                        type="button"
                        onClick={() => setSelectedAvatar('')}
                        className="px-3.5 py-1.5 bg-white hover:bg-slate-100 text-slate-700 font-bold text-xs rounded-xl border border-slate-200 transition-colors flex items-center gap-1.5"
                      >
                        <RotateCcw className="w-3.5 h-3.5 text-slate-500" />
                        Xóa ảnh (Dùng avatar chữ cái)
                      </button>
                    ) : null}
                  </div>
                  <p className="text-xs font-bold text-indigo-900 text-center">
                    {selectedAvatar
                      ? 'Đang sử dụng ảnh tùy chỉnh làm Avatar'
                      : `Avatar mặc định theo chữ cái đầu tiên của TÊN: "${(profileFirstName || 'Tên').charAt(0).toUpperCase()}"`}
                  </p>
                </div>
              )}

              {/* Fields */}
              <div className="space-y-4">
                {/* Họ tên chia 2 khung */}
                {isEditing ? (
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-bold text-slate-500 mb-1">Họ và tên đệm</label>
                      <input
                        type="text"
                        value={profileLastName}
                        onChange={(e) => {
                          const newLast = e.target.value;
                          setProfileLastName(newLast);
                          setProfileName(combineName(newLast, profileFirstName));
                        }}
                        placeholder="Nguyễn Văn"
                        className="w-full px-3.5 py-2.5 rounded-2xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 font-medium text-sm transition-shadow"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-500 mb-1">Tên</label>
                      <input
                        type="text"
                        value={profileFirstName}
                        onChange={(e) => {
                          const newFirst = e.target.value;
                          setProfileFirstName(newFirst);
                          setProfileName(combineName(profileLastName, newFirst));
                        }}
                        placeholder="An"
                        className="w-full px-3.5 py-2.5 rounded-2xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 font-medium text-sm transition-shadow"
                      />
                    </div>
                  </div>
                ) : (
                  <div>
                    <label className="block text-xs font-bold text-slate-500 mb-1">Họ và tên</label>
                    <div className="px-4 py-2.5 bg-slate-50 rounded-xl border border-slate-100 text-sm font-semibold text-slate-800">
                      {profileName}
                    </div>
                  </div>
                )}

                {/* Ngày sinh */}
                <div>
                  <label className="block text-xs font-bold text-slate-500 mb-1">Ngày sinh</label>
                  {isEditing ? (
                    <input
                      type="date"
                      value={profileDob}
                      onChange={(e) => setProfileDob(e.target.value)}
                      className="w-full px-4 py-2.5 rounded-2xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 font-medium text-sm transition-shadow"
                    />
                  ) : (
                    <div className="px-4 py-2.5 bg-slate-50 rounded-xl border border-slate-100 text-sm font-semibold text-slate-800 flex items-center gap-2">
                      <Calendar className="w-4 h-4 text-indigo-500" />
                      {profileDob ? profileDob.split('-').reverse().join('/') : 'Chưa cập nhật'}
                    </div>
                  )}
                </div>

                {/* Lớp / Chức vụ */}
                <div>
                  <label className="block text-xs font-bold text-slate-500 mb-1">
                    {user.role === 'teacher' ? 'Chức vụ / Nhiệm vụ' : 'Mã lớp'}
                  </label>
                  {isEditing ? (
                    <input
                      type="text"
                      value={profileClassName}
                      onChange={(e) => setProfileClassName(e.target.value)}
                      className="w-full px-4 py-2.5 rounded-2xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 font-medium text-sm transition-shadow uppercase font-mono tracking-wider"
                    />
                  ) : (
                    <div className="px-4 py-2.5 bg-slate-50 rounded-xl border border-slate-100 text-sm font-bold font-mono tracking-wider text-slate-800">
                      {profileClassName || 'Chưa cập nhật'}
                    </div>
                  )}
                </div>



                {/* SĐT Học sinh / Giáo viên */}
                <div>
                  <label className="block text-xs font-bold text-slate-500 mb-1 font-semibold">Số điện thoại liên hệ</label>
                  {isEditing ? (
                    <input
                      type="text"
                      value={profilePhoneStudent}
                      onChange={(e) => setProfilePhoneStudent(e.target.value)}
                      className="w-full px-4 py-2.5 rounded-2xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 font-medium text-sm transition-shadow"
                    />
                  ) : (
                    <div className="px-4 py-2.5 bg-slate-50 rounded-xl border border-slate-100 text-sm font-semibold text-slate-800 flex items-center gap-2">
                      <Phone className="w-4 h-4 text-slate-400" />
                      {profilePhoneStudent || 'Chưa cập nhật'}
                    </div>
                  )}
                </div>

                {/* Vai trò / Role */}
                {isEditing && (
                  <div>
                    <label className="block text-xs font-bold text-slate-500 mb-1 font-semibold">Vai trò tài khoản</label>
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        type="button"
                        onClick={() => setProfileRole('student')}
                        className={`py-2 px-2 text-xs font-bold rounded-xl border transition-all ${
                          profileRole === 'student'
                            ? 'bg-indigo-600 text-white border-indigo-600 shadow-sm'
                            : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                        }`}
                      >
                        Học sinh
                      </button>
                      <button
                        type="button"
                        onClick={() => setProfileRole('teacher')}
                        className={`py-2 px-2 text-xs font-bold rounded-xl border transition-all ${
                          profileRole === 'teacher'
                            ? 'bg-amber-600 text-white border-amber-600 shadow-sm'
                            : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                        }`}
                      >
                        Giáo viên
                      </button>
                    </div>
                  </div>
                )}

                {/* SĐT Phụ huynh (Chỉ dành cho học sinh) */}
                {user.role === 'student' && (
                  <div>
                    <label className="block text-xs font-bold text-slate-500 mb-1 font-semibold">Số điện thoại Phụ huynh</label>
                    {isEditing ? (
                      <input
                        type="text"
                        value={profilePhoneParent}
                        onChange={(e) => setProfilePhoneParent(e.target.value)}
                        className="w-full px-4 py-2.5 rounded-2xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 font-medium text-sm transition-shadow"
                      />
                    ) : (
                      <div className="px-4 py-2.5 bg-slate-50 rounded-xl border border-slate-100 text-sm font-semibold text-slate-800 flex items-center gap-2">
                        <Phone className="w-4 h-4 text-slate-400" />
                        {profilePhoneParent || 'Chưa cập nhật'}
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Upgrade / Claim Super Admin */}
              {!isEditing && user.role === 'teacher' && !user.isSuperAdmin && (
                <div className="pt-2">
                  <div className="p-4 bg-gradient-to-r from-purple-600 via-indigo-600 to-amber-500 rounded-2xl text-white shadow-md flex flex-col gap-2.5">
                    <div className="flex items-center gap-2">
                      <ShieldCheck className="w-5 h-5 text-amber-300 shrink-0" />
                      <p className="text-xs font-bold uppercase tracking-wider text-amber-200">Xác nhận Quản trị viên chính</p>
                    </div>
                    <p className="text-xs text-purple-100/90 font-medium leading-relaxed">
                      Kích hoạt vai trò Super Admin để nắm quyền quản trị tối cao, phân quyền Admin cho các giáo viên khác và quản lý toàn bộ hệ thống.
                    </p>
                    <button
                      type="button"
                      onClick={() => {
                        const updatedUser = { ...user, role: 'admin' as Role, isSuperAdmin: true };
                        if (onUpdateUser) onUpdateUser(updatedUser);
                        onRoleChange('admin');
                        onTabChange('admin');
                        setShowProfileModal(false);
                      }}
                      className="w-full py-2.5 bg-amber-400 hover:bg-amber-300 text-slate-900 font-extrabold text-xs rounded-xl transition-all shadow-sm flex items-center justify-center gap-1.5"
                    >
                      <Sparkles className="w-4 h-4 text-slate-900" />
                      KÍCH HOẠT VAI TRÒ QUẢN TRỊ VIÊN CHÍNH
                    </button>
                  </div>
                </div>
              )}

              {/* Account Switching Action (Dành cho Giáo viên & Quản trị viên để thử nghiệm) */}
              {!isEditing && (user.role === 'teacher' || user.role === 'admin') && (
                <div className="pt-2 border-t border-slate-100">
                  <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 flex flex-col gap-3">
                    <div className="flex items-center gap-2">
                      <ShieldCheck className="w-5 h-5 text-indigo-600" />
                      <p className="text-xs font-bold text-slate-900">Tính năng thử nghiệm đa vai trò</p>
                    </div>
                    <p className="text-xs text-slate-600">
                      Chuyển đổi giao diện nhanh để kiểm tra trải nghiệm học sinh, giáo viên hoặc quản trị viên.
                    </p>
                    <div className={`grid ${user.role === 'admin' ? 'grid-cols-3' : 'grid-cols-2'} gap-2`}>
                      <button
                        type="button"
                        onClick={() => {
                          onRoleChange('student');
                          if (activeTab === 'admin' || activeTab === 'students' || activeTab === 'settings') {
                            onTabChange('dashboard');
                          }
                          setShowProfileModal(false);
                        }}
                        className={`py-2 px-1.5 font-bold text-xs rounded-xl transition-colors text-center ${
                          activeRole === 'student'
                            ? 'bg-indigo-600 text-white shadow-sm'
                            : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-100'
                        }`}
                      >
                        Học sinh
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          onRoleChange('teacher');
                          if (activeTab === 'admin') {
                            onTabChange('dashboard');
                          }
                          setShowProfileModal(false);
                        }}
                        className={`py-2 px-1.5 font-bold text-xs rounded-xl transition-colors text-center ${
                          activeRole === 'teacher'
                            ? 'bg-amber-600 text-white shadow-sm'
                            : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-100'
                        }`}
                      >
                        Giáo viên
                      </button>
                      {user.role === 'admin' && (
                        <button
                          type="button"
                          onClick={() => {
                            onRoleChange('admin');
                            setShowProfileModal(false);
                          }}
                          className={`py-2 px-1.5 font-bold text-xs rounded-xl transition-colors text-center ${
                            activeRole === 'admin'
                              ? 'bg-purple-600 text-white shadow-sm'
                              : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-100'
                          }`}
                        >
                          Quản trị viên
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* Guide walkthrough button */}
              {!isEditing && onOpenGuide && (
                <div className="pt-2">
                  <button
                    type="button"
                    onClick={() => {
                      setShowProfileModal(false);
                      onOpenGuide();
                    }}
                    className="w-full py-3 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-extrabold text-xs rounded-2xl transition-colors flex items-center justify-center gap-2 border border-indigo-200 shadow-sm"
                  >
                    <BookOpen className="w-4 h-4" />
                    <span>Xem lại Hướng dẫn & Khám phá hệ thống</span>
                  </button>
                </div>
              )}

              {/* Call Robot Guide button */}
              {!isEditing && onOpenRobot && user?.createdAt && (
                <div className="pt-2">
                  <button
                    type="button"
                    onClick={() => {
                      setShowProfileModal(false);
                      onOpenRobot();
                    }}
                    className="w-full py-3 bg-gradient-to-r from-indigo-600 to-blue-600 hover:from-indigo-700 hover:to-blue-700 text-white font-extrabold text-xs rounded-2xl transition-colors flex items-center justify-center gap-2 shadow-sm"
                  >
                    <Bot className="w-4 h-4 text-white" />
                    <span>Gọi Robot Hướng Dẫn 🤖</span>
                  </button>
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="p-5 border-t border-slate-100 bg-slate-50 flex items-center justify-between">
              {isEditing ? (
                <>
                  <button
                    type="button"
                    onClick={() => {
                      setIsEditing(false);
                      // Reset states
                      setProfileName(user.name);
                      setProfileDob(user.dob || '');
                      setProfilePhoneStudent(user.phoneStudent || '');
                      setProfilePhoneParent(user.phoneParent || '');
                      setProfileClassName(user.className || '');
                      setSelectedAvatar(user.avatar);
                    }}
                    className="px-4 py-2 bg-white border border-slate-200 text-slate-600 font-bold text-xs rounded-xl hover:bg-slate-50 transition-colors"
                  >
                    Hủy bỏ
                  </button>
                  <button
                    type="button"
                    onClick={handleSaveProfile}
                    className="px-5 py-2.5 bg-indigo-600 text-white font-bold text-xs rounded-xl hover:bg-indigo-700 transition-colors shadow-sm flex items-center gap-1.5"
                  >
                    <Check className="w-4 h-4" />
                    Lưu thay đổi
                  </button>
                </>
              ) : (
                <>
                  <button
                    type="button"
                    onClick={() => {
                      if (onLogout) {
                        onLogout();
                        setShowProfileModal(false);
                      }
                    }}
                    className="flex items-center gap-1.5 px-4 py-2 text-rose-600 hover:bg-rose-50 rounded-xl font-bold text-xs transition-colors"
                  >
                    <LogOut className="w-4 h-4" />
                    Đăng xuất
                  </button>
                  <button
                    type="button"
                    onClick={() => setIsEditing(true)}
                    className="px-5 py-2.5 bg-slate-900 text-white font-bold text-xs rounded-xl hover:bg-slate-800 transition-colors shadow-sm flex items-center gap-1.5"
                  >
                    <Edit2 className="w-3.5 h-3.5" />
                    Chỉnh sửa hồ sơ
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Dynamic Popups Alert (similar to image.png) */}
      <AnimatePresence>
        {activeAlert && (
          <motion.div
            initial={{ opacity: 0, y: 50, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            className="fixed bottom-6 right-6 md:right-8 z-[100] max-w-[480px] w-[calc(100vw-32px)] bg-white border border-slate-200/80 rounded-[24px] shadow-[0_20px_50px_rgba(79,70,229,0.15)] p-5 md:p-6 flex flex-col space-y-4"
          >
            {/* Header Content */}
            <div className="flex items-start justify-between gap-4">
              <div className="flex items-start gap-4">
                {/* Rounded Bell Container */}
                <div className="w-12 h-12 rounded-[16px] bg-indigo-50 border border-indigo-100/50 flex items-center justify-center text-indigo-600 shrink-0">
                  <BellRing className="w-6 h-6 animate-pulse" />
                </div>
                
                {/* Text Content */}
                <div className="space-y-1.5">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-[10px] font-black uppercase tracking-wider bg-indigo-50 text-indigo-600 px-2.5 py-1 rounded-md">
                      {activeAlert.tag}
                    </span>
                    <span className="text-xs text-slate-400 font-bold">
                      {activeAlert.timerText}
                    </span>
                  </div>
                  <h4 className="text-base font-black text-slate-900 leading-snug break-words">
                    {activeAlert.title}
                  </h4>
                  <p className="text-xs text-slate-500 font-bold">
                    {activeAlert.subtitle}
                  </p>
                </div>
              </div>
              
              {/* Close Button X */}
              <button
                type="button"
                onClick={() => handleDismissAlert(activeAlert.id)}
                className="p-1 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-full transition-colors shrink-0"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Action Buttons */}
            <div className="flex items-center gap-3 w-full">
              {activeAlert.type === 'class' ? (
                <a
                  href={activeAlert.link}
                  target="_blank"
                  referrerPolicy="no-referrer"
                  onClick={() => handleDismissAlert(activeAlert.id)}
                  className="flex-1 py-3 px-5 bg-indigo-600 hover:bg-indigo-700 text-white font-black text-xs sm:text-sm rounded-xl transition-all shadow-md shadow-indigo-200 hover:shadow-lg flex items-center justify-center gap-1.5"
                >
                  <Video className="w-4 h-4 shrink-0" />
                  Vào học ngay
                </a>
              ) : (
                <button
                  onClick={() => {
                    handleDismissAlert(activeAlert.id);
                    onTabChange('assignments');
                  }}
                  className="flex-1 py-3 px-5 bg-indigo-600 hover:bg-indigo-700 text-white font-black text-xs sm:text-sm rounded-xl transition-all shadow-md shadow-indigo-200 hover:shadow-lg flex items-center justify-center gap-1.5"
                >
                  <BookOpen className="w-4 h-4 shrink-0" />
                  Làm bài ngay
                </button>
              )}
              
              <button
                type="button"
                onClick={() => handleDismissAlert(activeAlert.id)}
                className="py-3 px-5 border border-slate-200 hover:bg-slate-50 text-slate-700 font-black text-xs sm:text-sm rounded-xl transition-all"
              >
                Bỏ qua
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

    </div>
  );
}

