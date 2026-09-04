import React, { useState, useMemo, useEffect } from 'react';
import { ActivityLog, ActivityActionCategory, Role, User } from '../types';
import { db, handleFirestoreError, OperationType } from '../firebase';
import { collection, onSnapshot, query, orderBy, limit, deleteDoc, doc, getDocs, where } from 'firebase/firestore';
import { 
  History, Search, Filter, RefreshCw, Download, Trash2, Calendar, 
  User as UserIcon, Shield, Laptop, Smartphone, CheckCircle, Clock, 
  BookOpen, Gamepad2, Library, Microscope, Heart, BellRing, Key, 
  LogIn, LogOut, FileText, Check, AlertCircle, ChevronRight, X, 
  Activity, ArrowUpDown, Eye, Users, BarChart3, Layers
} from 'lucide-react';
import { UserAvatar } from '../components/UserAvatar';
import { ConfirmModal } from '../components/ConfirmModal';

interface ActivityLogsViewProps {
  currentUser: User;
  onNavigateToTab?: (tab: string) => void;
}

const CATEGORY_CONFIG: Record<ActivityActionCategory, { label: string; icon: any; color: string; bg: string; border: string }> = {
  auth: { label: 'Đăng nhập / Đăng xuất', icon: LogIn, color: 'text-blue-600', bg: 'bg-blue-50', border: 'border-blue-200' },
  assignment: { label: 'Bài tập & Đề thi', icon: BookOpen, color: 'text-indigo-600', bg: 'bg-indigo-50', border: 'border-indigo-200' },
  submission: { label: 'Nộp bài tập', icon: FileText, color: 'text-emerald-600', bg: 'bg-emerald-50', border: 'border-emerald-200' },
  grade: { label: 'Chấm điểm & Nhận xét', icon: CheckCircle, color: 'text-amber-600', bg: 'bg-amber-50', border: 'border-amber-200' },
  game: { label: 'Trò chơi học tập', icon: Gamepad2, color: 'text-purple-600', bg: 'bg-purple-50', border: 'border-purple-200' },
  flashcard: { label: 'Bộ thẻ Flashcard', icon: Library, color: 'text-teal-600', bg: 'bg-teal-50', border: 'border-teal-200' },
  class: { label: 'Lịch học & Buổi học', icon: Calendar, color: 'text-cyan-600', bg: 'bg-cyan-50', border: 'border-cyan-200' },
  simulation: { label: 'Mô phỏng thí nghiệm', icon: Microscope, color: 'text-pink-600', bg: 'bg-pink-50', border: 'border-pink-200' },
  letter: { label: 'Thư yêu thương', icon: Heart, color: 'text-rose-600', bg: 'bg-rose-50', border: 'border-rose-200' },
  notification: { label: 'Thông báo hệ thống', icon: BellRing, color: 'text-orange-600', bg: 'bg-orange-50', border: 'border-orange-200' },
  user_management: { label: 'Quản trị & Phân quyền', icon: Shield, color: 'text-red-600', bg: 'bg-red-50', border: 'border-red-200' },
  profile: { label: 'Hồ sơ cá nhân', icon: UserIcon, color: 'text-slate-600', bg: 'bg-slate-50', border: 'border-slate-200' },
  system: { label: 'Hệ thống', icon: Activity, color: 'text-gray-600', bg: 'bg-gray-50', border: 'border-gray-200' },
};

function formatFullTime(isoStr: string): string {
  try {
    const d = new Date(isoStr);
    if (isNaN(d.getTime())) return isoStr;
    const hours = String(d.getHours()).padStart(2, '0');
    const minutes = String(d.getMinutes()).padStart(2, '0');
    const seconds = String(d.getSeconds()).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const year = d.getFullYear();
    return `${hours}:${minutes}:${seconds} - ${day}/${month}/${year}`;
  } catch {
    return isoStr;
  }
}

function formatRelativeTime(isoStr: string): string {
  try {
    const diff = Date.now() - new Date(isoStr).getTime();
    const minutes = Math.floor(diff / 60000);
    if (minutes < 1) return 'Vừa xong';
    if (minutes < 60) return `${minutes} phút trước`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours} giờ trước`;
    const days = Math.floor(hours / 24);
    if (days < 30) return `${days} ngày trước`;
    return new Date(isoStr).toLocaleDateString('vi-VN');
  } catch {
    return 'Vừa xong';
  }
}

export function ActivityLogsView({ currentUser }: ActivityLogsViewProps) {
  const [logs, setLogs] = useState<ActivityLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedRole, setSelectedRole] = useState<string>('all');
  const [selectedTimeRange, setSelectedTimeRange] = useState<'all' | 'today' | '24h' | '7days' | '30days'>('all');
  const [viewMode, setViewMode] = useState<'timeline' | 'table'>('timeline');
  const [inspectedLog, setInspectedLog] = useState<ActivityLog | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [showPurgeModal, setShowPurgeModal] = useState(false);
  const [purging, setPurging] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [selectedLogIds, setSelectedLogIds] = useState<string[]>([]);
  const [deletingSelected, setDeletingSelected] = useState(false);
  const [confirmModalConfig, setConfirmModalConfig] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    confirmText?: string;
    onConfirm: () => void | Promise<void>;
  }>({
    isOpen: false,
    title: '',
    message: '',
    onConfirm: () => {},
  });

  const isSuperAdmin = currentUser.isSuperAdmin || currentUser.role === 'admin';

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  const handleDeleteLog = (logId: string) => {
    setConfirmModalConfig({
      isOpen: true,
      title: 'Xác nhận xóa nhật ký',
      message: 'Bạn có chắc chắn muốn xóa nhật ký thao tác này không?',
      confirmText: 'Xóa nhật ký',
      onConfirm: async () => {
        try {
          await deleteDoc(doc(db, 'activity_logs', logId));
          setSelectedLogIds(prev => prev.filter(id => id !== logId));
          showToast('Đã xóa nhật ký thao tác thành công!');
        } catch (err: any) {
          console.error(err);
          showToast(`Lỗi khi xóa nhật ký: ${err.message}`);
        } finally {
          setConfirmModalConfig(prev => ({ ...prev, isOpen: false }));
        }
      }
    });
  };

  const handleDeleteSelectedLogs = () => {
    if (selectedLogIds.length === 0) return;
    setConfirmModalConfig({
      isOpen: true,
      title: 'Xác nhận xóa các mục đã chọn',
      message: `Bạn có chắc chắn muốn xóa ${selectedLogIds.length} nhật ký thao tác đã chọn không?`,
      confirmText: `Xóa ${selectedLogIds.length} mục`,
      onConfirm: async () => {
        setDeletingSelected(true);
        try {
          const deletePromises = selectedLogIds.map(id => deleteDoc(doc(db, 'activity_logs', id)));
          await Promise.all(deletePromises);
          setSelectedLogIds([]);
          showToast(`Đã xóa thành công ${selectedLogIds.length} nhật ký thao tác!`);
        } catch (err: any) {
          console.error(err);
          showToast(`Lỗi khi xóa các nhật ký đã chọn: ${err.message}`);
        } finally {
          setDeletingSelected(false);
          setConfirmModalConfig(prev => ({ ...prev, isOpen: false }));
        }
      }
    });
  };

  const toggleSelectLog = (logId: string) => {
    setSelectedLogIds(prev => 
      prev.includes(logId) ? prev.filter(id => id !== logId) : [...prev, logId]
    );
  };

  const toggleSelectAll = () => {
    const currentFilteredIds = filteredLogs.map(l => l.id);
    const allSelected = currentFilteredIds.length > 0 && currentFilteredIds.every(id => selectedLogIds.includes(id));
    
    if (allSelected) {
      setSelectedLogIds(prev => prev.filter(id => !currentFilteredIds.includes(id)));
    } else {
      setSelectedLogIds(prev => {
        const otherSelected = prev.filter(id => !currentFilteredIds.includes(id));
        return [...otherSelected, ...currentFilteredIds];
      });
    }
  };

  // Real-time listener for activity logs
  useEffect(() => {
    setLoading(true);
    const logsRef = collection(db, 'activity_logs');
    
    // We listen to the most recent 1000 activity logs
    const unsubscribe = onSnapshot(logsRef, (snapshot) => {
      const list: ActivityLog[] = [];
      snapshot.forEach((docSnap) => {
        list.push({ id: docSnap.id, ...docSnap.data() } as ActivityLog);
      });

      // Sort descending by timestamp / createdAtMs
      list.sort((a, b) => {
        const timeA = a.createdAtMs || new Date(a.timestamp).getTime() || 0;
        const timeB = b.createdAtMs || new Date(b.timestamp).getTime() || 0;
        return timeB - timeA;
      });

      setLogs(list);
      setLoading(false);
      setIsRefreshing(false);
    }, (error) => {
      console.error('Error loading activity logs:', error);
      handleFirestoreError(error, OperationType.LIST, 'activity_logs');
      setLoading(false);
      setIsRefreshing(false);
    });

    return () => unsubscribe();
  }, []);

  const handleRefresh = () => {
    setIsRefreshing(true);
    setTimeout(() => setIsRefreshing(false), 800);
  };

  // Reset selectedLogIds when filters change to prevent ghost selections
  useEffect(() => {
    setSelectedLogIds([]);
  }, [searchTerm, selectedCategory, selectedRole, selectedTimeRange]);

  // Filter logs by search, role, and time range (but NOT category)
  const logsMatchingFilters = useMemo(() => {
    const now = Date.now();
    const normalizedSearch = searchTerm.trim().toLowerCase();

    return logs.filter((log) => {
      // 1. Search filter
      if (normalizedSearch) {
        const matchUser = (log.userName || '').toLowerCase().includes(normalizedSearch);
        const matchTitle = (log.title || '').toLowerCase().includes(normalizedSearch);
        const matchDesc = (log.description || '').toLowerCase().includes(normalizedSearch);
        const matchTarget = (log.targetName || '').toLowerCase().includes(normalizedSearch);
        const matchDevice = (log.device || '').toLowerCase().includes(normalizedSearch);
        const matchClass = (log.userClass || '').toLowerCase().includes(normalizedSearch);
        if (!matchUser && !matchTitle && !matchDesc && !matchTarget && !matchDevice && !matchClass) {
          return false;
        }
      }

      // 2. Role filter
      if (selectedRole !== 'all') {
        if (log.userRole !== selectedRole) return false;
      }

      // 3. Time range filter
      if (selectedTimeRange !== 'all') {
        const logTime = log.createdAtMs || new Date(log.timestamp).getTime();
        if (selectedTimeRange === 'today') {
          const startOfToday = new Date();
          startOfToday.setHours(0, 0, 0, 0);
          if (logTime < startOfToday.getTime()) return false;
        } else if (selectedTimeRange === '24h') {
          if (now - logTime > 24 * 60 * 60 * 1000) return false;
        } else if (selectedTimeRange === '7days') {
          if (now - logTime > 7 * 24 * 60 * 60 * 1000) return false;
        } else if (selectedTimeRange === '30days') {
          if (now - logTime > 30 * 24 * 60 * 60 * 1000) return false;
        }
      }

      return true;
    });
  }, [logs, searchTerm, selectedRole, selectedTimeRange]);

  // Filtered logs
  const filteredLogs = useMemo(() => {
    return logsMatchingFilters.filter((log) => {
      if (selectedCategory !== 'all') {
        if (selectedCategory === 'exam_all') {
          if (log.category !== 'assignment' && log.category !== 'submission' && log.category !== 'grade') return false;
        } else if (selectedCategory === 'games_all') {
          if (log.category !== 'game' && log.category !== 'flashcard') return false;
        } else if (log.category !== selectedCategory) {
          return false;
        }
      }
      return true;
    });
  }, [logsMatchingFilters, selectedCategory]);

  // Compute category counts based on currently selected role, search, and time filters
  const categoryCounts = useMemo(() => {
    const counts = {
      all: logsMatchingFilters.length,
      auth: 0,
      exam_all: 0,
      games_all: 0,
      class: 0,
      simulation: 0,
      letter: 0,
      user_management: 0,
    };

    logsMatchingFilters.forEach((log) => {
      if (log.category === 'auth') counts.auth++;
      else if (log.category === 'assignment' || log.category === 'submission' || log.category === 'grade') counts.exam_all++;
      else if (log.category === 'game' || log.category === 'flashcard') counts.games_all++;
      else if (log.category === 'class') counts.class++;
      else if (log.category === 'simulation') counts.simulation++;
      else if (log.category === 'letter') counts.letter++;
      else if (log.category === 'user_management') counts.user_management++;
    });

    return counts;
  }, [logsMatchingFilters]);

  // Key metrics
  const stats = useMemo(() => {
    const total = logs.length;
    const now = Date.now();
    const last24hThreshold = now - 24 * 60 * 60 * 1000;
    
    const activeUsersSet = new Set<string>();
    let submissionsCount = 0;
    let gamesAndFlashcardsCount = 0;
    let authCount = 0;

    logs.forEach(log => {
      const logTime = log.createdAtMs || new Date(log.timestamp).getTime();
      if (logTime >= last24hThreshold && log.userId) {
        activeUsersSet.add(log.userId);
      }
      if (log.category === 'submission' || log.category === 'grade') {
        submissionsCount++;
      }
      if (log.category === 'game' || log.category === 'flashcard') {
        gamesAndFlashcardsCount++;
      }
      if (log.category === 'auth') {
        authCount++;
      }
    });

    return {
      total,
      activeToday: activeUsersSet.size,
      submissionsCount,
      gamesAndFlashcardsCount,
      authCount
    };
  }, [logs]);

  // Export to CSV
  const handleExportCSV = () => {
    if (filteredLogs.length === 0) {
      showToast('Không có dữ liệu nhật ký để xuất!');
      return;
    }

    try {
      const headers = ['Mã Log', 'Thời gian', 'Người thực hiện', 'Vai trò', 'Lớp', 'Danh mục', 'Loại thao tác', 'Tiêu đề hành động', 'Chi tiết mô tả', 'Đối tượng liên quan', 'Thiết bị & Trình duyệt'];
      
      const rows = filteredLogs.map(l => [
        `"${l.id}"`,
        `"${formatFullTime(l.timestamp)}"`,
        `"${l.userName || ''}"`,
        `"${l.userRole === 'admin' ? 'Quản trị viên' : l.userRole === 'teacher' ? 'Giáo viên' : 'Học sinh'}"`,
        `"${l.userClass || ''}"`,
        `"${CATEGORY_CONFIG[l.category]?.label || l.category}"`,
        `"${l.actionType || ''}"`,
        `"${(l.title || '').replace(/"/g, '""')}"`,
        `"${(l.description || '').replace(/"/g, '""')}"`,
        `"${(l.targetName || '').replace(/"/g, '""')}"`,
        `"${(l.device || '').replace(/"/g, '""')}"`
      ]);

      const csvContent = '\uFEFF' + [headers.join(','), ...rows.map(r => r.join(','))].join('\r\n');
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.setAttribute('href', url);
      link.setAttribute('download', `Lich_su_thao_tac_${new Date().toISOString().slice(0, 10)}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      showToast('Đã xuất file lịch sử thao tác Excel/CSV thành công!');
    } catch (e) {
      console.error(e);
      showToast('Lỗi khi xuất file!');
    }
  };

  // Clear / purge old logs
  const handlePurgeLogs = async () => {
    setPurging(true);
    try {
      const snap = await getDocs(collection(db, 'activity_logs'));
      const deletePromises = snap.docs.map(d => deleteDoc(doc(db, 'activity_logs', d.id)));
      await Promise.all(deletePromises);
      setShowPurgeModal(false);
      showToast('Đã dọn dẹp sạch toàn bộ lịch sử thao tác!');
    } catch (err: any) {
      console.error(err);
      showToast(`Lỗi khi dọn nhật ký: ${err.message}`);
    } finally {
      setPurging(false);
    }
  };

  return (
    <div className="p-3 sm:p-6 2xl:p-8 space-y-6 max-w-7xl mx-auto">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 bg-slate-900 text-white px-5 py-3 rounded-2xl shadow-xl border border-slate-700 flex items-center gap-3 animate-in fade-in slide-in-from-bottom duration-300">
          <CheckCircle className="w-5 h-5 text-emerald-400 shrink-0" />
          <span className="text-sm font-semibold">{toastMessage}</span>
        </div>
      )}

      {/* Top Banner & Header */}
      <div className="bg-gradient-to-br from-indigo-900 via-slate-900 to-slate-950 text-white rounded-3xl p-6 sm:p-8 shadow-xl border border-indigo-950/50 relative overflow-hidden">
        {/* Background decorative glows */}
        <div className="absolute top-0 right-0 w-96 h-96 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none -mr-20 -mt-20"></div>
        <div className="absolute bottom-0 left-1/3 w-64 h-64 bg-cyan-500/10 rounded-full blur-2xl pointer-events-none"></div>

        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2.5 max-w-2xl">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/20 border border-indigo-400/30 text-indigo-300 text-xs font-bold uppercase tracking-wider backdrop-blur-md">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
              Lịch sử thao tác trực tuyến (Audit Trail)
            </div>
            <h1 className="text-2xl sm:text-3xl 2xl:text-4xl font-black tracking-tight text-white flex items-center gap-3">
              <History className="w-8 h-8 text-indigo-400 shrink-0" />
              Nhật Ký Thao Tác Hệ Thống
            </h1>
            <p className="text-sm sm:text-base text-slate-300 leading-relaxed">
              Theo dõi và ghi nhận chi tiết mọi hoạt động của tất cả người dùng trong hệ thống (Đăng nhập, làm bài tập, chấm điểm, chơi game, xem mô phỏng, phân quyền).
            </p>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-wrap items-center gap-2.5 shrink-0">
            <button
              type="button"
              onClick={handleRefresh}
              className={`p-2.5 sm:px-4 sm:py-2.5 bg-white/10 hover:bg-white/20 text-white rounded-2xl font-bold text-xs sm:text-sm backdrop-blur-md border border-white/15 transition-all flex items-center gap-2 active:scale-95 shadow-sm ${
                isRefreshing ? 'opacity-70' : ''
              }`}
              title="Làm mới dữ liệu"
            >
              <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`} />
              <span className="hidden sm:inline">Làm mới</span>
            </button>

            <button
              type="button"
              onClick={handleExportCSV}
              className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-2xl font-bold text-xs sm:text-sm transition-all flex items-center gap-2 active:scale-95 shadow-lg shadow-emerald-900/30 border border-emerald-400/30"
              title="Xuất file báo cáo Excel/CSV"
            >
              <Download className="w-4 h-4" />
              <span>Xuất Excel / CSV</span>
            </button>

            {isSuperAdmin && logs.length > 0 && (
              <button
                type="button"
                onClick={() => setShowPurgeModal(true)}
                className="px-3.5 py-2.5 bg-rose-600/80 hover:bg-rose-600 text-white rounded-2xl font-bold text-xs sm:text-sm transition-all flex items-center gap-1.5 active:scale-95 border border-rose-400/30"
                title="Xóa nhật ký (Dành cho Quản trị viên cấp cao)"
              >
                <Trash2 className="w-4 h-4" />
                <span className="hidden md:inline">Dọn sạch</span>
              </button>
            )}
          </div>
        </div>

        {/* 4 Quick Stat Metric Tiles */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 mt-8 pt-6 border-t border-white/10">
          <div className="bg-white/5 border border-white/10 rounded-2xl p-3.5 sm:p-4 backdrop-blur-md">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-300">Tổng lượt thao tác</span>
              <Activity className="w-4 h-4 text-indigo-400" />
            </div>
            <p className="text-xl sm:text-2xl font-black text-white mt-1.5">{stats.total.toLocaleString('vi-VN')}</p>
            <span className="text-[11px] text-indigo-300 font-medium">Toàn thời gian</span>
          </div>

          <div className="bg-white/5 border border-white/10 rounded-2xl p-3.5 sm:p-4 backdrop-blur-md">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-300">Thành viên 24h qua</span>
              <Users className="w-4 h-4 text-emerald-400" />
            </div>
            <p className="text-xl sm:text-2xl font-black text-white mt-1.5">{stats.activeToday}</p>
            <span className="text-[11px] text-emerald-300 font-medium">Người dùng hoạt động</span>
          </div>

          <div className="bg-white/5 border border-white/10 rounded-2xl p-3.5 sm:p-4 backdrop-blur-md">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-300">Nộp bài & Chấm điểm</span>
              <FileText className="w-4 h-4 text-amber-400" />
            </div>
            <p className="text-xl sm:text-2xl font-black text-white mt-1.5">{stats.submissionsCount}</p>
            <span className="text-[11px] text-amber-300 font-medium">Lượt tương tác học tập</span>
          </div>

          <div className="bg-white/5 border border-white/10 rounded-2xl p-3.5 sm:p-4 backdrop-blur-md">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-300">Game & Flashcard</span>
              <Gamepad2 className="w-4 h-4 text-purple-400" />
            </div>
            <p className="text-xl sm:text-2xl font-black text-white mt-1.5">{stats.gamesAndFlashcardsCount}</p>
            <span className="text-[11px] text-purple-300 font-medium">Lượt ôn luyện trực quan</span>
          </div>
        </div>
      </div>

      {/* Filters, Search & View Switcher */}
      <div className="bg-white rounded-3xl p-4 sm:p-6 border border-slate-200 shadow-sm space-y-4">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          {/* Search Input */}
          <div className="relative flex-1 min-w-[260px]">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Tìm theo tên học sinh, giáo viên, nội dung thao tác, bài tập, thiết bị..."
              className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-2xl text-xs sm:text-sm text-slate-800 placeholder-slate-400 outline-none focus:border-indigo-500 focus:bg-white transition-all font-medium"
            />
            {searchTerm && (
              <button 
                type="button" 
                onClick={() => setSearchTerm('')} 
                className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-slate-600 rounded-full"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Controls: Role, Time, View Mode */}
          <div className="flex flex-wrap items-center gap-2.5">
            {/* Role Filter */}
            <select
              value={selectedRole}
              onChange={(e) => setSelectedRole(e.target.value)}
              className="px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-2xl text-xs sm:text-sm font-semibold text-slate-700 outline-none focus:border-indigo-500 cursor-pointer"
            >
              <option value="all">👥 Tất cả vai trò</option>
              <option value="admin">👑 Quản trị viên</option>
              <option value="teacher">👨‍🏫 Giáo viên</option>
              <option value="student">🎓 Học sinh</option>
            </select>

            {/* Time Range Filter */}
            <select
              value={selectedTimeRange}
              onChange={(e) => setSelectedTimeRange(e.target.value as any)}
              className="px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-2xl text-xs sm:text-sm font-semibold text-slate-700 outline-none focus:border-indigo-500 cursor-pointer"
            >
              <option value="all">⏳ Mọi thời gian</option>
              <option value="today">☀️ Hôm nay</option>
              <option value="24h">⏱️ 24 giờ qua</option>
              <option value="7days">📅 7 ngày qua</option>
              <option value="30days">🗓️ 30 ngày qua</option>
            </select>

            {/* View Mode Toggle */}
            <div className="flex items-center bg-slate-100 p-1 rounded-2xl border border-slate-200">
              <button
                type="button"
                onClick={() => setViewMode('timeline')}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
                  viewMode === 'timeline'
                    ? 'bg-white text-indigo-600 shadow-sm'
                    : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                <Activity className="w-3.5 h-3.5" />
                <span className="hidden xs:inline">Dòng thời gian</span>
              </button>
              <button
                type="button"
                onClick={() => setViewMode('table')}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
                  viewMode === 'table'
                    ? 'bg-white text-indigo-600 shadow-sm'
                    : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                <Layers className="w-3.5 h-3.5" />
                <span className="hidden xs:inline">Bảng chi tiết</span>
              </button>
            </div>
          </div>
        </div>

        {/* Category Pill Filters */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 pt-1 custom-scrollbar">
          <button
            type="button"
            onClick={() => setSelectedCategory('all')}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all flex items-center gap-1.5 shrink-0 ${
              selectedCategory === 'all'
                ? 'bg-indigo-600 text-white shadow-sm shadow-indigo-200'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            Tất cả ({categoryCounts.all})
          </button>
          <button
            type="button"
            onClick={() => setSelectedCategory('auth')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all flex items-center gap-1.5 shrink-0 ${
              selectedCategory === 'auth'
                ? 'bg-blue-600 text-white shadow-sm'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            <LogIn className="w-3.5 h-3.5" /> Đăng nhập & Đăng xuất ({categoryCounts.auth})
          </button>
          <button
            type="button"
            onClick={() => setSelectedCategory('exam_all')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all flex items-center gap-1.5 shrink-0 ${
              selectedCategory === 'exam_all'
                ? 'bg-emerald-600 text-white shadow-sm'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            <BookOpen className="w-3.5 h-3.5" /> Bài tập & Chấm điểm ({categoryCounts.exam_all})
          </button>
          <button
            type="button"
            onClick={() => setSelectedCategory('games_all')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all flex items-center gap-1.5 shrink-0 ${
              selectedCategory === 'games_all'
                ? 'bg-purple-600 text-white shadow-sm'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            <Gamepad2 className="w-3.5 h-3.5" /> Game & Flashcard ({categoryCounts.games_all})
          </button>
          <button
            type="button"
            onClick={() => setSelectedCategory('class')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all flex items-center gap-1.5 shrink-0 ${
              selectedCategory === 'class'
                ? 'bg-cyan-600 text-white shadow-sm'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            <Calendar className="w-3.5 h-3.5" /> Lịch học ({categoryCounts.class})
          </button>
          <button
            type="button"
            onClick={() => setSelectedCategory('simulation')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all flex items-center gap-1.5 shrink-0 ${
              selectedCategory === 'simulation'
                ? 'bg-pink-600 text-white shadow-sm'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            <Microscope className="w-3.5 h-3.5" /> Mô phỏng ({categoryCounts.simulation})
          </button>
          <button
            type="button"
            onClick={() => setSelectedCategory('letter')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all flex items-center gap-1.5 shrink-0 ${
              selectedCategory === 'letter'
                ? 'bg-rose-600 text-white shadow-sm'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            <Heart className="w-3.5 h-3.5" /> Thư yêu thương ({categoryCounts.letter})
          </button>
          <button
            type="button"
            onClick={() => setSelectedCategory('user_management')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all flex items-center gap-1.5 shrink-0 ${
              selectedCategory === 'user_management'
                ? 'bg-red-600 text-white shadow-sm'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            <Shield className="w-3.5 h-3.5" /> Quản trị & Phân quyền ({categoryCounts.user_management})
          </button>
        </div>
      </div>

      {/* Content Area */}
      {loading ? (
        <div className="bg-white rounded-3xl p-12 border border-slate-200 text-center space-y-4">
          <RefreshCw className="w-8 h-8 text-indigo-500 animate-spin mx-auto" />
          <p className="text-sm font-bold text-slate-600">Đang tải nhật ký thao tác trực tuyến...</p>
        </div>
      ) : filteredLogs.length === 0 ? (
        <div className="bg-white rounded-3xl p-12 border border-slate-200 text-center space-y-3">
          <div className="w-14 h-14 bg-slate-100 rounded-2xl flex items-center justify-center mx-auto text-slate-400">
            <History className="w-7 h-7" />
          </div>
          <h3 className="text-base font-bold text-slate-800">Không tìm thấy thao tác nào phù hợp</h3>
          <p className="text-xs text-slate-500 max-w-md mx-auto">
            Hãy thử thay đổi từ khóa tìm kiếm hoặc điều chỉnh các bộ lọc vai trò, danh mục thao tác và khoảng thời gian.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {/* Batch Actions Bar */}
          {selectedLogIds.length > 0 && (
            <div className="bg-indigo-50/80 border border-indigo-100 rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 animate-in slide-in-from-top-3 duration-200">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-indigo-100/60 rounded-xl flex items-center justify-center text-indigo-750">
                  <Check className="w-5 h-5 stroke-[2.5]" />
                </div>
                <div>
                  <p className="text-sm font-black text-slate-900">Đang chọn {selectedLogIds.length} nhật ký thao tác</p>
                  <p className="text-xs font-semibold text-slate-500">Bạn có thể thực hiện xóa hàng loạt các mục đã chọn này cùng lúc.</p>
                </div>
              </div>
              
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setSelectedLogIds([])}
                  className="px-3.5 py-2 bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 rounded-xl text-xs font-bold transition-all"
                >
                  Bỏ chọn tất cả
                </button>
                <button
                  type="button"
                  disabled={deletingSelected}
                  onClick={handleDeleteSelectedLogs}
                  className="px-4 py-2 bg-rose-600 hover:bg-rose-700 disabled:bg-rose-400 text-white rounded-xl text-xs font-bold transition-all flex items-center gap-2 shadow-sm"
                >
                  {deletingSelected ? (
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  ) : (
                    <Trash2 className="w-4 h-4" />
                  )}
                  <span>Xóa các mục đã chọn ({selectedLogIds.length})</span>
                </button>
              </div>
            </div>
          )}

          {viewMode === 'timeline' ? (
            /* Timeline View */
            <div className="space-y-3 sm:space-y-4">
              <div className="flex items-center justify-between px-2 text-xs font-bold text-slate-500">
                <div className="flex items-center gap-3">
                  <span>Hiển thị {filteredLogs.length} thao tác gần nhất</span>
                  <button
                    type="button"
                    onClick={toggleSelectAll}
                    className="text-indigo-600 hover:text-indigo-800 font-extrabold hover:underline"
                  >
                    {filteredLogs.every(l => selectedLogIds.includes(l.id)) ? '✓ Bỏ chọn tất cả' : '☐ Chọn tất cả trang này'}
                  </button>
                </div>
                <span className="flex items-center gap-1 text-emerald-600 font-extrabold">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                  Live Sync
                </span>
              </div>

              <div className="relative pl-6 sm:pl-8 space-y-4 before:content-[''] before:absolute before:left-3 sm:before:left-4 before:top-3 before:bottom-3 before:w-0.5 before:bg-slate-200">
                {filteredLogs.map((log) => {
                  const cfg = CATEGORY_CONFIG[log.category] || CATEGORY_CONFIG.system;
                  const IconComp = cfg.icon;
                  const isSelected = selectedLogIds.includes(log.id);

                  return (
                    <div 
                      key={log.id} 
                      className={`relative group bg-white hover:bg-slate-50/80 rounded-2xl sm:rounded-3xl p-4 sm:p-5 border transition-all duration-200 ${
                        isSelected 
                          ? 'border-indigo-400 bg-indigo-50/20 shadow-md ring-1 ring-indigo-400' 
                          : 'border-slate-200 hover:border-indigo-200 shadow-sm hover:shadow-md'
                      }`}
                    >
                      {/* Timeline Bullet Node */}
                      <div className={`absolute -left-6 sm:-left-8 top-5 w-6 h-6 sm:w-8 sm:h-8 rounded-xl ${cfg.bg} ${cfg.border} border flex items-center justify-center shadow-sm z-10 transition-transform group-hover:scale-110`}>
                        <IconComp className={`w-3 h-3 sm:w-4 sm:h-4 ${cfg.color}`} />
                      </div>

                      <div className="flex flex-col md:flex-row md:items-start justify-between gap-3">
                        {/* User & Action Details */}
                        <div className="space-y-2 flex-1 min-w-0">
                          <div className="flex flex-wrap items-center gap-2">
                            {/* Checkbox for batch delete */}
                            <input
                              type="checkbox"
                              checked={isSelected}
                              onChange={() => toggleSelectLog(log.id)}
                              className="w-4 h-4 rounded text-indigo-600 border-slate-300 focus:ring-indigo-500 cursor-pointer transition-all shrink-0"
                            />

                            {/* User Avatar + Name */}
                            <div className="flex items-center gap-2 shrink-0">
                              <UserAvatar name={log.userName} avatar={log.userAvatar} size="sm" />
                              <span className="text-xs sm:text-sm font-extrabold text-slate-900">{log.userName}</span>
                            </div>

                            {/* Role Badge */}
                            <span className={`px-2 py-0.5 rounded-md text-[10px] font-extrabold uppercase tracking-wider ${
                              log.userRole === 'admin'
                                ? 'bg-red-50 text-red-700 border border-red-200'
                                : log.userRole === 'teacher'
                                ? 'bg-blue-50 text-blue-700 border border-blue-200'
                                : 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                            }`}>
                              {log.userRole === 'admin' ? 'Admin' : log.userRole === 'teacher' ? 'Giáo viên' : 'Học sinh'}
                            </span>

                            {/* Class if student */}
                            {log.userClass && (
                              <span className="px-2 py-0.5 rounded-md bg-slate-100 text-slate-600 text-[10px] font-bold border border-slate-200">
                                Lớp {log.userClass}
                              </span>
                            )}

                            {/* Category tag */}
                            <span className={`px-2.5 py-0.5 rounded-full text-[11px] font-bold flex items-center gap-1 ${cfg.bg} ${cfg.color} ${cfg.border} border`}>
                              <IconComp className="w-3 h-3" />
                              {cfg.label}
                            </span>
                          </div>

                          {/* Main Action Title */}
                          <h4 className="text-sm sm:text-base font-bold text-slate-800 leading-snug">
                            {log.title}
                          </h4>

                          {/* Description / snippet if available */}
                          {log.description && (
                            <p className="text-xs sm:text-sm text-slate-600 bg-slate-50 p-2.5 rounded-xl border border-slate-100 font-medium">
                              {log.description}
                            </p>
                          )}

                          {/* Metadata row: Device info & Target */}
                          <div className="flex flex-wrap items-center gap-3 text-[11px] text-slate-500 pt-1 font-medium">
                            {log.targetName && (
                              <span className="flex items-center gap-1 bg-indigo-50/50 text-indigo-700 px-2 py-0.5 rounded-md border border-indigo-100">
                                🎯 Đối tượng: <strong>{log.targetName}</strong>
                              </span>
                            )}

                            {log.device && (
                              <span className="flex items-center gap-1">
                                {log.device.includes('Điện thoại') ? (
                                  <Smartphone className="w-3.5 h-3.5 text-slate-400" />
                                ) : (
                                  <Laptop className="w-3.5 h-3.5 text-slate-400" />
                                )}
                                {log.device}
                              </span>
                            )}
                          </div>
                        </div>

                        {/* Timestamp & Inspect Button */}
                        <div className="flex md:flex-col items-center md:items-end justify-between md:justify-start gap-2 shrink-0 border-t md:border-t-0 pt-2 md:pt-0 border-slate-100">
                          <div className="text-right">
                            <span className="text-xs font-bold text-slate-700 block">
                              {formatRelativeTime(log.timestamp)}
                            </span>
                            <span className="text-[10px] text-slate-400 font-medium block">
                              {formatFullTime(log.timestamp)}
                            </span>
                          </div>

                          <div className="flex items-center gap-1.5">
                            <button
                              type="button"
                              onClick={() => setInspectedLog(log)}
                              className="px-3 py-1.5 bg-slate-100 hover:bg-indigo-50 hover:text-indigo-600 text-slate-600 rounded-xl text-xs font-bold transition-all flex items-center gap-1 active:scale-95"
                              title="Xem chi tiết thông tin sự kiện"
                            >
                              <Eye className="w-3.5 h-3.5" />
                              <span>Chi tiết</span>
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDeleteLog(log.id)}
                              className="p-1.5 bg-rose-50 hover:bg-rose-100 text-rose-600 border border-rose-100 rounded-xl transition-all flex items-center justify-center active:scale-95"
                              title="Xóa nhật ký này"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ) : (
            /* Detailed Table View */
            <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
              <div className="overflow-x-auto scrolling-touch">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-200 text-[11px] font-extrabold text-slate-500 uppercase tracking-wider">
                      <th className="py-3.5 px-4 w-12 text-center">
                        <input
                          type="checkbox"
                          checked={filteredLogs.length > 0 && filteredLogs.every(l => selectedLogIds.includes(l.id))}
                          onChange={toggleSelectAll}
                          className="w-4 h-4 rounded text-indigo-600 border-slate-300 focus:ring-indigo-500 cursor-pointer transition-all"
                        />
                      </th>
                      <th className="py-3.5 px-4">Thời gian</th>
                      <th className="py-3.5 px-4">Người thực hiện</th>
                      <th className="py-3.5 px-4">Vai trò</th>
                      <th className="py-3.5 px-4">Danh mục</th>
                      <th className="py-3.5 px-4">Nội dung thao tác</th>
                      <th className="py-3.5 px-4">Thiết bị</th>
                      <th className="py-3.5 px-4 text-center">Thao tác</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-xs font-medium text-slate-700">
                    {filteredLogs.map((log) => {
                      const cfg = CATEGORY_CONFIG[log.category] || CATEGORY_CONFIG.system;
                      const IconComp = cfg.icon;
                      const isSelected = selectedLogIds.includes(log.id);

                      return (
                        <tr key={log.id} className={`hover:bg-slate-50/80 transition-colors ${isSelected ? 'bg-indigo-50/30' : ''}`}>
                          <td className="py-3 px-4 text-center">
                            <input
                              type="checkbox"
                              checked={isSelected}
                              onChange={() => toggleSelectLog(log.id)}
                              className="w-4 h-4 rounded text-indigo-600 border-slate-300 focus:ring-indigo-500 cursor-pointer transition-all"
                            />
                          </td>
                          <td className="py-3 px-4 whitespace-nowrap">
                            <div className="font-bold text-slate-800">{formatRelativeTime(log.timestamp)}</div>
                            <div className="text-[10px] text-slate-400">{formatFullTime(log.timestamp)}</div>
                          </td>
                          <td className="py-3 px-4 whitespace-nowrap">
                            <div className="flex items-center gap-2">
                              <UserAvatar name={log.userName} avatar={log.userAvatar} size="sm" />
                              <div>
                                <p className="font-bold text-slate-900">{log.userName}</p>
                                {log.userClass && <span className="text-[10px] text-slate-400">Lớp {log.userClass}</span>}
                              </div>
                            </div>
                          </td>
                          <td className="py-3 px-4 whitespace-nowrap">
                            <span className={`px-2 py-0.5 rounded-md text-[10px] font-extrabold uppercase ${
                              log.userRole === 'admin'
                                ? 'bg-red-50 text-red-700'
                                : log.userRole === 'teacher'
                                ? 'bg-blue-50 text-blue-700'
                                : 'bg-emerald-50 text-emerald-700'
                            }`}>
                              {log.userRole}
                            </span>
                          </td>
                          <td className="py-3 px-4 whitespace-nowrap">
                            <span className={`px-2.5 py-1 rounded-lg text-xs font-bold inline-flex items-center gap-1 ${cfg.bg} ${cfg.color} ${cfg.border} border`}>
                              <IconComp className="w-3 h-3" />
                              {cfg.label}
                            </span>
                          </td>
                          <td className="py-3 px-4">
                            <p className="font-bold text-slate-800">{log.title}</p>
                            {log.description && (
                              <p className="text-[11px] text-slate-500 truncate max-w-xs">{log.description}</p>
                            )}
                          </td>
                          <td className="py-3 px-4 whitespace-nowrap text-[11px] text-slate-500">
                            {log.device || 'Web'}
                          </td>
                          <td className="py-3 px-4 text-center whitespace-nowrap">
                            <div className="flex items-center justify-center gap-1.5">
                              <button
                                type="button"
                                onClick={() => setInspectedLog(log)}
                                className="p-1.5 hover:bg-indigo-50 text-slate-500 hover:text-indigo-600 rounded-lg transition-colors inline-flex items-center gap-1 font-bold text-xs"
                                title="Xem chi tiết"
                              >
                                <Eye className="w-4 h-4" />
                              </button>
                              <button
                                type="button"
                                onClick={() => handleDeleteLog(log.id)}
                                className="p-1.5 hover:bg-rose-50 text-rose-500 hover:text-rose-600 rounded-lg transition-colors inline-flex items-center gap-1"
                                title="Xóa nhật ký này"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Log Detail Modal */}
      {inspectedLog && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-2xl rounded-3xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[90vh] animate-in fade-in zoom-in-95 duration-200">
            {/* Modal Header */}
            <div className="px-6 py-4 bg-slate-900 text-white flex items-center justify-between shrink-0">
              <div className="flex items-center gap-2.5">
                <History className="w-5 h-5 text-indigo-400" />
                <h3 className="font-extrabold text-base">Chi Tiết Nhật Ký Thao Tác</h3>
              </div>
              <button
                type="button"
                onClick={() => setInspectedLog(null)}
                className="p-1 text-slate-400 hover:text-white rounded-lg transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 overflow-y-auto space-y-5 custom-scrollbar">
              {/* User and Category Banner */}
              <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <UserAvatar name={inspectedLog.userName} avatar={inspectedLog.userAvatar} size="lg" />
                  <div>
                    <h4 className="font-black text-slate-900 text-base">{inspectedLog.userName}</h4>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="text-xs font-bold text-indigo-600 uppercase tracking-wide">
                        {inspectedLog.userRole === 'admin' ? 'Quản trị viên' : inspectedLog.userRole === 'teacher' ? 'Giáo viên' : 'Học sinh'}
                      </span>
                      {inspectedLog.userClass && (
                        <span className="text-xs text-slate-500">• Lớp {inspectedLog.userClass}</span>
                      )}
                    </div>
                  </div>
                </div>

                <div className="text-left sm:text-right">
                  <span className="text-xs text-slate-400 font-medium block">Thời điểm thực hiện:</span>
                  <span className="text-sm font-extrabold text-slate-800 block">{formatFullTime(inspectedLog.timestamp)}</span>
                  <span className="text-xs text-indigo-600 font-bold">({formatRelativeTime(inspectedLog.timestamp)})</span>
                </div>
              </div>

              {/* Action Title & Description */}
              <div className="space-y-2">
                <label className="text-xs font-extrabold text-slate-500 uppercase tracking-wider">Hành động ghi nhận:</label>
                <div className="p-3.5 bg-indigo-50/60 border border-indigo-100 rounded-2xl">
                  <p className="font-extrabold text-slate-900 text-sm sm:text-base">{inspectedLog.title}</p>
                  {inspectedLog.description && (
                    <p className="text-xs sm:text-sm text-slate-600 mt-2 font-medium leading-relaxed">{inspectedLog.description}</p>
                  )}
                </div>
              </div>

              {/* Grid Metadata */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-1">
                  <span className="text-[11px] font-bold text-slate-500">Mã định danh Log:</span>
                  <p className="text-xs font-mono font-bold text-slate-800 break-all">{inspectedLog.id}</p>
                </div>
                <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-1">
                  <span className="text-[11px] font-bold text-slate-500">Mã Người dùng (User ID):</span>
                  <p className="text-xs font-mono font-bold text-slate-800 break-all">{inspectedLog.userId}</p>
                </div>
                <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-1">
                  <span className="text-[11px] font-bold text-slate-500">Loại Thao tác (Action Type):</span>
                  <p className="text-xs font-bold text-indigo-700">{inspectedLog.actionType}</p>
                </div>
                <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-1">
                  <span className="text-[11px] font-bold text-slate-500">Thiết bị & Trình duyệt:</span>
                  <p className="text-xs font-bold text-slate-800">{inspectedLog.device || 'Web'}</p>
                </div>
                {inspectedLog.targetName && (
                  <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-1 sm:col-span-2">
                    <span className="text-[11px] font-bold text-slate-500">Đối tượng tác động (Target):</span>
                    <p className="text-xs font-bold text-slate-800">{inspectedLog.targetName} {inspectedLog.targetId ? `(ID: ${inspectedLog.targetId})` : ''}</p>
                  </div>
                )}
              </div>

              {/* Raw JSON Meta if any */}
              {inspectedLog.meta && Object.keys(inspectedLog.meta).length > 0 && (
                <div className="space-y-1.5">
                  <label className="text-xs font-extrabold text-slate-500 uppercase tracking-wider">Dữ liệu chi tiết bổ sung (Payload Meta):</label>
                  <pre className="p-3.5 bg-slate-900 text-emerald-400 font-mono text-xs rounded-2xl overflow-x-auto">
                    {JSON.stringify(inspectedLog.meta, null, 2)}
                  </pre>
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="px-6 py-3.5 bg-slate-50 border-t border-slate-200 flex justify-end shrink-0">
              <button
                type="button"
                onClick={() => setInspectedLog(null)}
                className="px-5 py-2 bg-slate-800 hover:bg-slate-900 text-white font-bold text-xs sm:text-sm rounded-xl transition-all"
              >
                Đóng
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Purge Confirm Modal */}
      {showPurgeModal && (
        <ConfirmModal
          isOpen={showPurgeModal}
          onClose={() => setShowPurgeModal(false)}
          onConfirm={handlePurgeLogs}
          title="Xác nhận dọn sạch toàn bộ nhật ký"
          message="Bạn có chắc chắn muốn xóa vĩnh viễn toàn bộ lịch sử thao tác hệ thống? Thao tác này không thể hoàn tác."
          confirmText={purging ? 'Đang xóa...' : 'Xóa toàn bộ'}
          cancelText="Hủy bỏ"
          variant="danger"
          loading={purging}
        />
      )}

      {/* Generic Confirm Modal */}
      {confirmModalConfig.isOpen && (
        <ConfirmModal
          isOpen={confirmModalConfig.isOpen}
          onClose={() => setConfirmModalConfig(prev => ({ ...prev, isOpen: false }))}
          onConfirm={confirmModalConfig.onConfirm}
          title={confirmModalConfig.title}
          message={confirmModalConfig.message}
          confirmText={confirmModalConfig.confirmText}
          cancelText="Hủy bỏ"
          variant="danger"
          loading={deletingSelected}
        />
      )}
    </div>
  );
}
