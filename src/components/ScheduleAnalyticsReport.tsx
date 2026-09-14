import React, { useState, useMemo } from 'react';
import { ClassSession, User } from '../types';
import { 
  format, 
  startOfMonth, 
  endOfMonth, 
  subMonths,
  subDays,
  startOfQuarter,
  endOfQuarter,
} from 'date-fns';
import { 
  BarChart3, 
  Clock, 
  Calendar as CalendarIcon, 
  CalendarRange, 
  Filter, 
  Copy, 
  Check, 
  Users, 
  BookOpen, 
  Plus, 
  Search, 
  Sparkles, 
  Layers, 
  TrendingUp, 
  Printer, 
  Video, 
  Eye, 
  FileText,
  X,
  School,
  CheckCircle2,
  GraduationCap,
  ChevronDown
} from 'lucide-react';

interface ScheduleAnalyticsReportProps {
  user: User;
  sessions: ClassSession[];
  isTeacher: boolean;
  isAdmin: boolean;
  onOpenQuickLog?: () => void;
  onViewDetails?: (session: ClassSession) => void;
  onOpenEdit?: (session: ClassSession) => void;
}

type TimeFilterMode = 'month' | 'custom_range';

export function ScheduleAnalyticsReport({
  user,
  sessions,
  isTeacher,
  isAdmin,
  onOpenQuickLog,
  onViewDetails,
}: ScheduleAnalyticsReportProps) {
  const now = new Date();
  
  // Time filter state
  const [timeMode, setTimeMode] = useState<TimeFilterMode>('month');
  const [selectedMonth, setSelectedMonth] = useState<number>(now.getMonth() + 1);
  const [selectedYear, setSelectedYear] = useState<number>(now.getFullYear());
  
  // Custom range state
  const [startDateStr, setStartDateStr] = useState<string>(format(startOfMonth(now), 'yyyy-MM-dd'));
  const [endDateStr, setEndDateStr] = useState<string>(format(endOfMonth(now), 'yyyy-MM-dd'));

  // Group & Subject Filters
  const [selectedClass, setSelectedClass] = useState<string>('all');
  const [selectedSubject, setSelectedSubject] = useState<string>('all');
  const [selectedStatus, setSelectedStatus] = useState<'completed_only' | 'all' | 'upcoming_only'>('completed_only');
  const [selectedFormat, setSelectedFormat] = useState<'all' | 'online' | 'offline'>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // UI state
  const [copiedReport, setCopiedReport] = useState(false);
  const [sortBy, setSortBy] = useState<'date_desc' | 'date_asc' | 'duration_desc'>('date_desc');

  // 1. Time-only filtered sessions (to compute class & subject totals in the active time window)
  const timeAndStatusFilteredSessions = useMemo(() => {
    return sessions.filter(session => {
      const sessionDate = new Date(session.startTime);

      // Time filter
      if (timeMode === 'month') {
        const m = sessionDate.getMonth() + 1;
        const y = sessionDate.getFullYear();
        if (m !== selectedMonth || y !== selectedYear) return false;
      } else {
        if (startDateStr) {
          const start = new Date(startDateStr);
          start.setHours(0, 0, 0, 0);
          if (sessionDate < start) return false;
        }
        if (endDateStr) {
          const end = new Date(endDateStr);
          end.setHours(23, 59, 59, 999);
          if (sessionDate > end) return false;
        }
      }

      // Status filter
      if (selectedStatus === 'completed_only' && !session.isCompleted) return false;
      if (selectedStatus === 'upcoming_only' && session.isCompleted) return false;

      return true;
    });
  }, [sessions, timeMode, selectedMonth, selectedYear, startDateStr, endDateStr, selectedStatus]);

  // Extract available unique classes with their stats in the current time period
  const classSummaryList = useMemo(() => {
    const map = new Map<string, { count: number; ms: number; online: number; offline: number; attendees: number }>();
    
    timeAndStatusFilteredSessions.forEach(s => {
      const cls = (s.className && s.className.trim()) ? s.className.trim() : 'Toàn trường / Chung';
      const cur = map.get(cls) || { count: 0, ms: 0, online: 0, offline: 0, attendees: 0 };
      const start = new Date(s.startTime).getTime();
      const end = new Date(s.endTime).getTime();
      const dur = Math.max(0, end - start);
      
      cur.count += 1;
      cur.ms += isNaN(dur) ? 0 : dur;
      const isSessionOnline = s.isOnline !== undefined ? s.isOnline : (s.link && (s.link.startsWith('http') || s.link.startsWith('www')) ? true : false);
      if (isSessionOnline) cur.online += 1;
      else cur.offline += 1;
      cur.attendees += (s.attendedByStudents?.length || 0);

      map.set(cls, cur);
    });

    const totalPeriodMs = Array.from(map.values()).reduce((acc, v) => acc + v.ms, 0);

    return Array.from(map.entries())
      .map(([className, data]) => {
        const hours = data.ms / (1000 * 60 * 60);
        const percentage = totalPeriodMs > 0 ? Math.round((data.ms / totalPeriodMs) * 100) : 0;
        const avgAttendees = data.count > 0 ? (data.attendees / data.count).toFixed(1) : '0.0';
        return {
          className,
          count: data.count,
          hours,
          percentage,
          online: data.online,
          offline: data.offline,
          attendees: data.attendees,
          avgAttendees
        };
      })
      .sort((a, b) => b.hours - a.hours);
  }, [timeAndStatusFilteredSessions]);

  // Extract available unique subjects with their stats in the current time period
  const subjectSummaryList = useMemo(() => {
    const map = new Map<string, { count: number; ms: number; attendees: number }>();
    
    timeAndStatusFilteredSessions.forEach(s => {
      const sub = (s.subject && s.subject.trim()) ? s.subject.trim() : 'Toán Học';
      const cur = map.get(sub) || { count: 0, ms: 0, attendees: 0 };
      const start = new Date(s.startTime).getTime();
      const end = new Date(s.endTime).getTime();
      const dur = Math.max(0, end - start);
      
      cur.count += 1;
      cur.ms += isNaN(dur) ? 0 : dur;
      cur.attendees += (s.attendedByStudents?.length || 0);

      map.set(sub, cur);
    });

    const totalPeriodMs = Array.from(map.values()).reduce((acc, v) => acc + v.ms, 0);

    const colors = [
      'bg-indigo-600 text-indigo-700 bg-indigo-50 border-indigo-200',
      'bg-emerald-600 text-emerald-700 bg-emerald-50 border-emerald-200',
      'bg-purple-600 text-purple-700 bg-purple-50 border-purple-200',
      'bg-amber-600 text-amber-700 bg-amber-50 border-amber-200',
      'bg-rose-600 text-rose-700 bg-rose-50 border-rose-200',
      'bg-cyan-600 text-cyan-700 bg-cyan-50 border-cyan-200',
      'bg-teal-600 text-teal-700 bg-teal-50 border-teal-200'
    ];

    return Array.from(map.entries())
      .map(([subject, data], index) => {
        const hours = data.ms / (1000 * 60 * 60);
        const percentage = totalPeriodMs > 0 ? Math.round((data.ms / totalPeriodMs) * 100) : 0;
        return {
          subject,
          count: data.count,
          hours,
          percentage,
          colorClass: colors[index % colors.length]
        };
      })
      .sort((a, b) => b.hours - a.hours);
  }, [timeAndStatusFilteredSessions]);

  // All unique classes across whole session dataset for dropdown
  const allAvailableClasses = useMemo(() => {
    const set = new Set<string>();
    sessions.forEach(s => {
      if (s.className && s.className.trim()) set.add(s.className.trim());
    });
    return Array.from(set).sort();
  }, [sessions]);

  // All unique subjects across whole session dataset for dropdown
  const allAvailableSubjects = useMemo(() => {
    const set = new Set<string>();
    sessions.forEach(s => {
      if (s.subject && s.subject.trim()) set.add(s.subject.trim());
    });
    return Array.from(set).sort();
  }, [sessions]);

  // Quick Preset Handlers for Custom Range
  const handleApplyPreset = (preset: 'today' | 'last7' | 'last30' | 'this_month' | 'last_month' | 'this_quarter' | 'all_time') => {
    const today = new Date();
    switch (preset) {
      case 'today':
        setStartDateStr(format(today, 'yyyy-MM-dd'));
        setEndDateStr(format(today, 'yyyy-MM-dd'));
        break;
      case 'last7':
        setStartDateStr(format(subDays(today, 6), 'yyyy-MM-dd'));
        setEndDateStr(format(today, 'yyyy-MM-dd'));
        break;
      case 'last30':
        setStartDateStr(format(subDays(today, 29), 'yyyy-MM-dd'));
        setEndDateStr(format(today, 'yyyy-MM-dd'));
        break;
      case 'this_month':
        setStartDateStr(format(startOfMonth(today), 'yyyy-MM-dd'));
        setEndDateStr(format(endOfMonth(today), 'yyyy-MM-dd'));
        break;
      case 'last_month': {
        const prevM = subMonths(today, 1);
        setStartDateStr(format(startOfMonth(prevM), 'yyyy-MM-dd'));
        setEndDateStr(format(endOfMonth(prevM), 'yyyy-MM-dd'));
        break;
      }
      case 'this_quarter':
        setStartDateStr(format(startOfQuarter(today), 'yyyy-MM-dd'));
        setEndDateStr(format(endOfQuarter(today), 'yyyy-MM-dd'));
        break;
      case 'all_time':
        setStartDateStr('2024-01-01');
        setEndDateStr(format(endOfMonth(today), 'yyyy-MM-dd'));
        break;
    }
  };

  // Final Filtered Sessions
  const filteredSessions = useMemo(() => {
    return timeAndStatusFilteredSessions.filter(session => {
      // Class filter
      if (selectedClass !== 'all') {
        const sessionClass = (session.className && session.className.trim()) ? session.className.trim() : 'Toàn trường / Chung';
        if (sessionClass !== selectedClass && session.className !== selectedClass) return false;
      }

      // Subject filter
      if (selectedSubject !== 'all') {
        const sessionSub = (session.subject || 'Toán Học').trim();
        if (sessionSub !== selectedSubject) return false;
      }

      // Format filter (Online / Offline)
      const isSessionOnline = session.isOnline !== undefined ? session.isOnline : (session.link && (session.link.startsWith('http') || session.link.startsWith('www')) ? true : false);
      if (selectedFormat === 'online' && !isSessionOnline) return false;
      if (selectedFormat === 'offline' && isSessionOnline) return false;

      // Search query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchTitle = session.title.toLowerCase().includes(q);
        const matchNote = (session.note || '').toLowerCase().includes(q);
        const matchCompNote = (session.completedNote || '').toLowerCase().includes(q);
        const matchClass = (session.className || '').toLowerCase().includes(q);
        const matchSub = (session.subject || '').toLowerCase().includes(q);
        if (!matchTitle && !matchNote && !matchCompNote && !matchClass && !matchSub) {
          return false;
        }
      }

      return true;
    });
  }, [
    timeAndStatusFilteredSessions,
    selectedClass,
    selectedSubject,
    selectedFormat,
    searchQuery
  ]);

  // Sort sessions
  const sortedSessions = useMemo(() => {
    const list = [...filteredSessions];
    list.sort((a, b) => {
      const timeA = new Date(a.startTime).getTime();
      const timeB = new Date(b.startTime).getTime();
      if (sortBy === 'date_asc') return timeA - timeB;
      if (sortBy === 'duration_desc') {
        const durA = (new Date(a.endTime).getTime() - timeA);
        const durB = (new Date(b.endTime).getTime() - timeB);
        return durB - durA;
      }
      return timeB - timeA;
    });
    return list;
  }, [filteredSessions, sortBy]);

  // Key Metric Calculations for Current Filter
  const metrics = useMemo(() => {
    let totalMs = 0;
    const uniqueDaysSet = new Set<string>();
    let totalAttendees = 0;
    let onlineCount = 0;
    let offlineCount = 0;
    let completedCount = 0;
    let upcomingCount = 0;
    let withNotesCount = 0;

    filteredSessions.forEach(s => {
      const start = new Date(s.startTime).getTime();
      const end = new Date(s.endTime).getTime();
      const dur = Math.max(0, end - start);
      totalMs += isNaN(dur) ? 0 : dur;

      uniqueDaysSet.add(format(new Date(s.startTime), 'yyyy-MM-dd'));

      const isSessionOnline = s.isOnline !== undefined ? s.isOnline : (s.link && (s.link.startsWith('http') || s.link.startsWith('www')) ? true : false);
      if (isSessionOnline) onlineCount++;
      else offlineCount++;

      if (s.isCompleted) completedCount++;
      else upcomingCount++;

      if (s.completedNote && s.completedNote.trim()) withNotesCount++;

      totalAttendees += (s.attendedByStudents?.length || 0);
    });

    const totalHours = totalMs / (1000 * 60 * 60);
    const totalMinutes = Math.round(totalMs / (1000 * 60));
    const hoursPart = Math.floor(totalHours);
    const minutesPart = Math.round((totalHours - hoursPart) * 60);

    const avgMinutesPerSession = filteredSessions.length > 0 
      ? Math.round(totalMinutes / filteredSessions.length) 
      : 0;

    const avgAttendancePerSession = filteredSessions.length > 0
      ? (totalAttendees / filteredSessions.length).toFixed(1)
      : '0.0';

    return {
      totalHours,
      hoursPart,
      minutesPart,
      totalMinutes,
      uniqueDays: uniqueDaysSet.size,
      totalSessions: filteredSessions.length,
      onlineCount,
      offlineCount,
      completedCount,
      upcomingCount,
      withNotesCount,
      totalAttendees,
      avgMinutesPerSession,
      avgAttendancePerSession
    };
  }, [filteredSessions]);

  // Reset all filters
  const handleResetFilters = () => {
    setSelectedClass('all');
    setSelectedSubject('all');
    setSelectedFormat('all');
    setSearchQuery('');
  };

  const isAnySecondaryFilterActive = selectedClass !== 'all' || selectedSubject !== 'all' || selectedFormat !== 'all' || searchQuery.trim() !== '';

  // Generate Formal Text Report
  const generateReportText = () => {
    const timeTitle = timeMode === 'month' 
      ? `THÁNG ${String(selectedMonth).padStart(2, '0')}/${selectedYear}`
      : `TỪ NGÀY ${format(new Date(startDateStr), 'dd/MM/yyyy')} ĐẾN ${format(new Date(endDateStr), 'dd/MM/yyyy')}`;

    let text = `====================================================\n`;
    text += `[BÁO CÁO THỐNG KÊ THỜI GIAN DẠY & HỌC CHI TIẾT]\n`;
    text += `====================================================\n`;
    text += `• Người lập báo cáo: ${user.name} (${user.role === 'admin' ? 'Quản trị viên' : 'Giáo viên'})\n`;
    text += `• Kỳ báo cáo: ${timeTitle}\n`;
    text += `• Nhóm Lớp lọc: ${selectedClass === 'all' ? 'Tất cả các lớp' : selectedClass}\n`;
    text += `• Môn học lọc: ${selectedSubject === 'all' ? 'Tất cả môn học' : selectedSubject}\n`;
    text += `• Trạng thái: ${selectedStatus === 'completed_only' ? 'Chỉ tính buổi đã hoàn thành (thực dạy)' : selectedStatus === 'upcoming_only' ? 'Chỉ tính lịch sắp tới' : 'Tất cả các buổi'}\n`;
    text += `----------------------------------------------------\n`;
    text += `TỔNG HỢP CHỈ SỐ THỜI GIAN:\n`;
    text += `★ TỔNG SỐ GIỜ HỌC ĐÃ DIỄN RA: ${metrics.totalHours.toFixed(1)} giờ (${metrics.hoursPart} giờ ${metrics.minutesPart} phút)\n`;
    text += `★ Tổng số buổi học: ${metrics.totalSessions} buổi (${metrics.onlineCount} Trực tuyến, ${metrics.offlineCount} Dạy trực tiếp/Bổ trợ)\n`;
    text += `★ Số ngày có lịch học thực tế: ${metrics.uniqueDays} ngày\n`;
    text += `★ Thời lượng trung bình: ${metrics.avgMinutesPerSession} phút/buổi\n`;
    text += `★ Sĩ số tham gia trung bình: ${metrics.avgAttendancePerSession} học sinh/buổi (Tổng ${metrics.totalAttendees} lượt điểm danh)\n`;
    text += `----------------------------------------------------\n`;
    
    if (classSummaryList.length > 0) {
      text += `THỐNG KÊ CHI TIẾT THEO TỪNG NHÓM LỚP:\n`;
      classSummaryList.forEach(cls => {
        text += `  + ${cls.className}: ${cls.hours.toFixed(1)} giờ (${cls.count} buổi | Sĩ số TB: ${cls.avgAttendees} hs) - chiếm ${cls.percentage}%\n`;
      });
      text += `----------------------------------------------------\n`;
    }

    if (subjectSummaryList.length > 0) {
      text += `THỐNG KÊ CHI TIẾT THEO MÔN HỌC:\n`;
      subjectSummaryList.forEach(sb => {
        text += `  + ${sb.subject}: ${sb.hours.toFixed(1)} giờ (${sb.count} buổi) - chiếm ${sb.percentage}%\n`;
      });
      text += `----------------------------------------------------\n`;
    }

    text += `DANH SÁCH CHI TIẾT CÁC BUỔI HỌC (${sortedSessions.length} buổi):\n`;
    sortedSessions.forEach((s, idx) => {
      const dateStr = format(new Date(s.startTime), 'dd/MM/yyyy');
      const startH = format(new Date(s.startTime), 'HH:mm');
      const endH = format(new Date(s.endTime), 'HH:mm');
      const start = new Date(s.startTime).getTime();
      const end = new Date(s.endTime).getTime();
      const durHours = ((end - start) / (1000 * 60 * 60)).toFixed(1);
      const isOnline = s.isOnline !== undefined ? s.isOnline : (s.link && (s.link.startsWith('http') || s.link.startsWith('www')) ? true : false);
      
      text += `${idx + 1}. [${dateStr} | ${startH} - ${endH}] (${durHours}h) ${s.className ? `[${s.className}] ` : ''}${s.subject || 'Toán'} - "${s.title}"\n`;
      text += `   - Hình thức: ${isOnline ? 'Trực tuyến' : 'Trực tiếp (Offline)'} | Trạng thái: ${s.isCompleted ? 'Đã hoàn thành' : 'Sắp tới'}\n`;
      if (s.attendedByStudents && s.attendedByStudents.length > 0) {
        text += `   - Sĩ số: ${s.attendedByStudents.length} học sinh\n`;
      }
      if (s.completedNote) {
        text += `   - Nhật ký: "${s.completedNote}"\n`;
      }
    });

    text += `\nTrích xuất tự động từ Hệ thống Quản trị & Học tập thông minh.\nThời gian xuất báo cáo: ${format(new Date(), 'HH:mm:ss dd/MM/yyyy')}\n`;
    return text;
  };

  const handleCopyReport = () => {
    const text = generateReportText();
    navigator.clipboard.writeText(text);
    setCopiedReport(true);
    setTimeout(() => setCopiedReport(false), 2200);
  };

  const handlePrintReport = () => {
    window.print();
  };

  return (
    <div className="space-y-6">
      
      {/* Header Banner */}
      <div className="bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900 rounded-3xl p-6 sm:p-7 text-white shadow-xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-96 h-96 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none -mr-20 -mt-20"></div>
        <div className="absolute bottom-0 left-1/3 w-64 h-64 bg-emerald-500/10 rounded-full blur-2xl pointer-events-none"></div>

        <div className="relative z-10 flex flex-col lg:flex-row justify-between items-start lg:items-center gap-5">
          <div className="space-y-1.5 max-w-2xl">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-indigo-500/20 border border-indigo-400/30 rounded-full text-indigo-200 text-xs font-bold tracking-wide">
              <Sparkles className="w-3.5 h-3.5 text-amber-300" />
              Báo Cáo & Thống Kê Giờ Học Chuyên Sâu
            </div>
            <h3 className="text-xl sm:text-2xl font-black tracking-tight text-white flex items-center gap-2.5">
              <BarChart3 className="w-6 h-6 text-indigo-400" />
              Dashboard Thống Kê Thời Gian Theo Lớp & Môn Học
            </h3>
            <p className="text-slate-300 text-xs sm:text-sm leading-relaxed">
              Phân tích chi tiết tổng số giờ dạy cho từng nhóm lớp và từng bộ môn, theo dõi tiến độ lên lớp và kiểm soát chuyên cần của học sinh.
            </p>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-wrap items-center gap-2.5 w-full sm:w-auto">
            {isTeacher && onOpenQuickLog && (
              <button
                type="button"
                onClick={onOpenQuickLog}
                className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-xl transition-all shadow-md flex items-center gap-1.5 active:scale-95"
              >
                <Plus className="w-4 h-4" />
                Ghi nhận giờ dạy ngoài
              </button>
            )}

            <button
              type="button"
              onClick={handleCopyReport}
              className={`px-4 py-2.5 font-bold text-xs rounded-xl transition-all shadow-md flex items-center gap-1.5 active:scale-95 ${
                copiedReport 
                  ? 'bg-emerald-500 text-white animate-pulse'
                  : 'bg-white/10 hover:bg-white/20 text-white border border-white/20'
              }`}
            >
              {copiedReport ? (
                <>
                  <Check className="w-4 h-4 text-emerald-200" />
                  Đã sao chép báo cáo!
                </>
              ) : (
                <>
                  <Copy className="w-4 h-4 text-slate-300" />
                  Sao chép báo cáo
                </>
              )}
            </button>

            <button
              type="button"
              onClick={handlePrintReport}
              className="px-4 py-2.5 bg-white/10 hover:bg-white/20 text-white border border-white/20 font-bold text-xs rounded-xl transition-all shadow-md flex items-center gap-1.5 active:scale-95"
              title="In hoặc lưu file PDF"
            >
              <Printer className="w-4 h-4 text-slate-300" />
              In / Xuất PDF
            </button>
          </div>
        </div>
      </div>

      {/* FILTER CONTROL CARD */}
      <div className="bg-white border border-slate-200 rounded-3xl p-5 sm:p-6 shadow-sm space-y-5">
        
        {/* Top: Time Mode switch */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-4">
          <div className="flex items-center gap-2">
            <div className="p-2 bg-indigo-50 text-indigo-600 rounded-xl">
              <Filter className="w-4 h-4" />
            </div>
            <div>
              <h4 className="font-extrabold text-slate-900 text-sm">Khoảng Thời Gian & Tiêu Chí Lọc</h4>
              <p className="text-slate-500 text-xs">Lựa chọn chế độ theo Tháng hoặc chọn Khoảng ngày tùy ý</p>
            </div>
          </div>

          {/* Mode Switcher Tabs */}
          <div className="flex bg-slate-100 p-1 rounded-xl self-start sm:self-auto">
            <button
              type="button"
              onClick={() => setTimeMode('month')}
              className={`px-3.5 py-1.5 text-xs font-extrabold rounded-lg transition-all flex items-center gap-1.5 ${
                timeMode === 'month'
                  ? 'bg-white text-indigo-700 shadow-sm'
                  : 'text-slate-600 hover:text-indigo-600'
              }`}
            >
              <CalendarIcon className="w-3.5 h-3.5" />
              Lọc theo Tháng
            </button>
            <button
              type="button"
              onClick={() => setTimeMode('custom_range')}
              className={`px-3.5 py-1.5 text-xs font-extrabold rounded-lg transition-all flex items-center gap-1.5 ${
                timeMode === 'custom_range'
                  ? 'bg-white text-indigo-700 shadow-sm'
                  : 'text-slate-600 hover:text-indigo-600'
              }`}
            >
              <CalendarRange className="w-3.5 h-3.5" />
              Khoảng ngày tùy chọn
            </button>
          </div>
        </div>

        {/* Dynamic Time Selectors */}
        {timeMode === 'month' ? (
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-slate-700">Chọn Tháng:</span>
              <div className="relative inline-block">
                <select
                  value={selectedMonth}
                  onChange={e => setSelectedMonth(Number(e.target.value))}
                  className="appearance-none pl-4 pr-9 py-1.5 bg-white border border-slate-300 hover:border-slate-400 rounded-full text-xs font-bold text-slate-800 focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 cursor-pointer transition-all shadow-sm"
                >
                  {Array.from({ length: 12 }, (_, i) => i + 1).map(m => (
                    <option key={m} value={m}>Tháng {m}</option>
                  ))}
                </select>
                <ChevronDown className="w-3.5 h-3.5 text-slate-500 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              </div>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-slate-700">Năm:</span>
              <div className="relative inline-block">
                <select
                  value={selectedYear}
                  onChange={e => setSelectedYear(Number(e.target.value))}
                  className="appearance-none pl-4 pr-9 py-1.5 bg-white border border-slate-300 hover:border-slate-400 rounded-full text-xs font-bold text-slate-800 focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 cursor-pointer transition-all shadow-sm"
                >
                  {[2024, 2025, 2026, 2027].map(y => (
                    <option key={y} value={y}>Năm {y}</option>
                  ))}
                </select>
                <ChevronDown className="w-3.5 h-3.5 text-slate-500 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              </div>
            </div>

            {/* Quick Month Jumps */}
            <div className="flex items-center gap-1.5 sm:ml-auto">
              <button
                type="button"
                onClick={() => {
                  setSelectedMonth(now.getMonth() + 1);
                  setSelectedYear(now.getFullYear());
                }}
                className="px-2.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-lg transition-colors"
              >
                Tháng này
              </button>
              <button
                type="button"
                onClick={() => {
                  const prev = subMonths(now, 1);
                  setSelectedMonth(prev.getMonth() + 1);
                  setSelectedYear(prev.getFullYear());
                }}
                className="px-2.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-lg transition-colors"
              >
                Tháng trước
              </button>
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            <div className="flex flex-wrap items-center gap-3">
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-slate-700">Từ ngày:</span>
                <input
                  type="date"
                  value={startDateStr}
                  onChange={e => setStartDateStr(e.target.value)}
                  className="px-4 py-1.5 bg-white border border-slate-300 rounded-full text-xs font-bold text-slate-800 focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 shadow-sm transition-all outline-none"
                />
              </div>

              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-slate-700">Đến ngày:</span>
                <input
                  type="date"
                  value={endDateStr}
                  onChange={e => setEndDateStr(e.target.value)}
                  className="px-4 py-1.5 bg-white border border-slate-300 rounded-full text-xs font-bold text-slate-800 focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 shadow-sm transition-all outline-none"
                />
              </div>

              {/* Quick Range Presets */}
              <div className="flex flex-wrap items-center gap-1.5 sm:ml-auto">
                <span className="text-[11px] font-bold text-slate-400 mr-1">Chọn nhanh:</span>
                <button
                  type="button"
                  onClick={() => handleApplyPreset('today')}
                  className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-lg transition-colors"
                >
                  Hôm nay
                </button>
                <button
                  type="button"
                  onClick={() => handleApplyPreset('last7')}
                  className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-lg transition-colors"
                >
                  7 ngày qua
                </button>
                <button
                  type="button"
                  onClick={() => handleApplyPreset('this_month')}
                  className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-lg transition-colors"
                >
                  Tháng này
                </button>
                <button
                  type="button"
                  onClick={() => handleApplyPreset('last30')}
                  className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-lg transition-colors"
                >
                  30 ngày qua
                </button>
                <button
                  type="button"
                  onClick={() => handleApplyPreset('this_quarter')}
                  className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-lg transition-colors"
                >
                  Quý này
                </button>
                <button
                  type="button"
                  onClick={() => handleApplyPreset('all_time')}
                  className="px-2.5 py-1 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-bold text-xs rounded-lg transition-colors"
                >
                  Tất cả
                </button>
              </div>
            </div>
          </div>
        )}

        {/* PROMINENT QUICK-FILTER PILLS FOR LỚP HỌC (CLASS GROUPS) */}
        <div className="pt-3 border-t border-slate-100 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-extrabold text-slate-900 flex items-center gap-1.5">
              <School className="w-3.5 h-3.5 text-indigo-600" />
              Lọc theo Nhóm Lớp Học:
            </span>
            <span className="text-[11px] text-slate-400 font-medium">Bấm vào tên lớp để xem riêng</span>
          </div>

          <div className="flex flex-wrap items-center gap-1.5">
            <button
              type="button"
              onClick={() => setSelectedClass('all')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
                selectedClass === 'all'
                  ? 'bg-indigo-600 text-white shadow-sm ring-2 ring-indigo-600/30'
                  : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
              }`}
            >
              <span>Tất cả các lớp</span>
              <span className={`text-[10px] px-1.5 py-0.2 rounded-md font-extrabold ${selectedClass === 'all' ? 'bg-indigo-700 text-white' : 'bg-slate-200 text-slate-600'}`}>
                {timeAndStatusFilteredSessions.length}
              </span>
            </button>

            {classSummaryList.map(item => {
              const isSelected = selectedClass === item.className;
              return (
                <button
                  key={item.className}
                  type="button"
                  onClick={() => setSelectedClass(isSelected ? 'all' : item.className)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
                    isSelected
                      ? 'bg-indigo-600 text-white shadow-sm ring-2 ring-indigo-600/30'
                      : 'bg-white border border-slate-200 hover:border-indigo-300 hover:bg-indigo-50/50 text-slate-800'
                  }`}
                >
                  <span>{item.className}</span>
                  <span className={`text-[10px] px-1.5 py-0.2 rounded-md font-black ${isSelected ? 'bg-indigo-700 text-white' : 'bg-indigo-50 text-indigo-700 border border-indigo-100'}`}>
                    {item.hours.toFixed(1)}h
                  </span>
                  <span className={`text-[10px] ${isSelected ? 'text-indigo-200' : 'text-slate-400'}`}>
                    ({item.count}b)
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* PROMINENT QUICK-FILTER PILLS FOR MÔN HỌC (SUBJECTS) */}
        <div className="pt-2 border-t border-slate-100 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-extrabold text-slate-900 flex items-center gap-1.5">
              <GraduationCap className="w-3.5 h-3.5 text-emerald-600" />
              Lọc theo Môn Học:
            </span>
            <span className="text-[11px] text-slate-400 font-medium">Bấm vào môn để xem riêng</span>
          </div>

          <div className="flex flex-wrap items-center gap-1.5">
            <button
              type="button"
              onClick={() => setSelectedSubject('all')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
                selectedSubject === 'all'
                  ? 'bg-emerald-600 text-white shadow-sm ring-2 ring-emerald-600/30'
                  : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
              }`}
            >
              <span>Tất cả môn</span>
              <span className={`text-[10px] px-1.5 py-0.2 rounded-md font-extrabold ${selectedSubject === 'all' ? 'bg-emerald-700 text-white' : 'bg-slate-200 text-slate-600'}`}>
                {subjectSummaryList.length} môn
              </span>
            </button>

            {subjectSummaryList.map(item => {
              const isSelected = selectedSubject === item.subject;
              return (
                <button
                  key={item.subject}
                  type="button"
                  onClick={() => setSelectedSubject(isSelected ? 'all' : item.subject)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
                    isSelected
                      ? 'bg-emerald-600 text-white shadow-sm ring-2 ring-emerald-600/30'
                      : 'bg-white border border-slate-200 hover:border-emerald-300 hover:bg-emerald-50/50 text-slate-800'
                  }`}
                >
                  <span>{item.subject}</span>
                  <span className={`text-[10px] px-1.5 py-0.2 rounded-md font-black ${isSelected ? 'bg-emerald-700 text-white' : 'bg-emerald-50 text-emerald-700 border border-emerald-100'}`}>
                    {item.hours.toFixed(1)}h
                  </span>
                  <span className={`text-[10px] ${isSelected ? 'text-emerald-200' : 'text-slate-400'}`}>
                    ({item.count}b)
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Secondary Dropdown Filter Bar */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 pt-3 border-t border-slate-100">
          
          {/* Class Dropdown */}
          <div>
            <label className="block text-[11px] font-bold text-slate-500 mb-1">Chọn Lớp học chi tiết:</label>
            <select
              value={selectedClass}
              onChange={e => setSelectedClass(e.target.value)}
              className="w-full p-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 focus:ring-2 focus:ring-indigo-500 cursor-pointer"
            >
              <option value="all">Tất cả các lớp ({allAvailableClasses.length})</option>
              {allAvailableClasses.map(cls => (
                <option key={cls} value={cls}>{cls}</option>
              ))}
            </select>
          </div>

          {/* Subject Dropdown */}
          <div>
            <label className="block text-[11px] font-bold text-slate-500 mb-1">Chọn Môn học chi tiết:</label>
            <select
              value={selectedSubject}
              onChange={e => setSelectedSubject(e.target.value)}
              className="w-full p-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 focus:ring-2 focus:ring-indigo-500 cursor-pointer"
            >
              <option value="all">Tất cả môn học ({allAvailableSubjects.length})</option>
              {allAvailableSubjects.map(sub => (
                <option key={sub} value={sub}>{sub}</option>
              ))}
            </select>
          </div>

          {/* Status Filter */}
          <div>
            <label className="block text-[11px] font-bold text-slate-500 mb-1">Trạng thái:</label>
            <select
              value={selectedStatus}
              onChange={e => setSelectedStatus(e.target.value as any)}
              className="w-full p-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 focus:ring-2 focus:ring-indigo-500 cursor-pointer"
            >
              <option value="completed_only">Chỉ buổi Đã hoàn thành (Thực dạy)</option>
              <option value="all">Tất cả các buổi (Bao gồm sắp tới)</option>
              <option value="upcoming_only">Chỉ lịch học sắp tới</option>
            </select>
          </div>

          {/* Format Filter */}
          <div>
            <label className="block text-[11px] font-bold text-slate-500 mb-1">Hình thức:</label>
            <select
              value={selectedFormat}
              onChange={e => setSelectedFormat(e.target.value as any)}
              className="w-full p-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 focus:ring-2 focus:ring-indigo-500 cursor-pointer"
            >
              <option value="all">Tất cả hình thức</option>
              <option value="online">Trực tuyến (Meet/Zoom)</option>
              <option value="offline">Trực tiếp / Dạy bổ trợ</option>
            </select>
          </div>

          {/* Search Query */}
          <div>
            <label className="block text-[11px] font-bold text-slate-500 mb-1">Tìm kiếm từ khóa:</label>
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                placeholder="Tên bài học, ghi chú..."
                className="w-full pl-8 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-800 focus:ring-2 focus:ring-indigo-500 outline-none"
              />
            </div>
          </div>

        </div>

        {/* ACTIVE FILTER STATUS BANNER */}
        {isAnySecondaryFilterActive && (
          <div className="p-3 bg-indigo-50/80 border border-indigo-200/80 rounded-2xl flex flex-wrap items-center justify-between gap-2.5 text-xs text-indigo-950">
            <div className="flex flex-wrap items-center gap-2">
              <span className="font-bold flex items-center gap-1 text-indigo-900">
                <Filter className="w-3.5 h-3.5 text-indigo-600" />
                Đang lọc chi tiết:
              </span>

              {selectedClass !== 'all' && (
                <span className="inline-flex items-center gap-1 bg-white px-2.5 py-1 rounded-lg border border-indigo-200 font-extrabold text-indigo-700 shadow-xs">
                  <School className="w-3 h-3" />
                  Lớp: {selectedClass}
                  <button onClick={() => setSelectedClass('all')} className="hover:text-rose-600 ml-0.5">
                    <X className="w-3 h-3" />
                  </button>
                </span>
              )}

              {selectedSubject !== 'all' && (
                <span className="inline-flex items-center gap-1 bg-white px-2.5 py-1 rounded-lg border border-emerald-200 font-extrabold text-emerald-700 shadow-xs">
                  <GraduationCap className="w-3 h-3" />
                  Môn: {selectedSubject}
                  <button onClick={() => setSelectedSubject('all')} className="hover:text-rose-600 ml-0.5">
                    <X className="w-3 h-3" />
                  </button>
                </span>
              )}

              {selectedFormat !== 'all' && (
                <span className="inline-flex items-center gap-1 bg-white px-2.5 py-1 rounded-lg border border-slate-200 font-extrabold text-slate-700 shadow-xs">
                  Hình thức: {selectedFormat === 'online' ? 'Trực tuyến' : 'Trực tiếp'}
                  <button onClick={() => setSelectedFormat('all')} className="hover:text-rose-600 ml-0.5">
                    <X className="w-3 h-3" />
                  </button>
                </span>
              )}

              {searchQuery.trim() !== '' && (
                <span className="inline-flex items-center gap-1 bg-white px-2.5 py-1 rounded-lg border border-slate-200 font-extrabold text-slate-700 shadow-xs">
                  Từ khóa: "{searchQuery}"
                  <button onClick={() => setSearchQuery('')} className="hover:text-rose-600 ml-0.5">
                    <X className="w-3 h-3" />
                  </button>
                </span>
              )}

              <span className="text-slate-500 font-medium">
                (Hiển thị: <strong>{filteredSessions.length}</strong> buổi • Tổng: <strong className="text-indigo-700">{metrics.totalHours.toFixed(1)} giờ</strong>)
              </span>
            </div>

            <button
              type="button"
              onClick={handleResetFilters}
              className="px-3 py-1 bg-white hover:bg-rose-50 hover:text-rose-700 text-slate-700 font-extrabold text-xs rounded-lg border border-slate-200 transition-colors flex items-center gap-1 shadow-xs"
            >
              <X className="w-3 h-3 text-rose-500" />
              Xóa tất cả bộ lọc
            </button>
          </div>
        )}

      </div>

      {/* KPI METRIC CARDS */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        
        {/* Card 1: Total Hours (HIGHLIGHT) */}
        <div className="bg-gradient-to-br from-indigo-500 via-indigo-600 to-indigo-700 text-white p-5 rounded-3xl shadow-lg relative overflow-hidden">
          <div className="absolute top-0 right-0 w-24 h-24 bg-white/10 rounded-full blur-xl pointer-events-none -mr-6 -mt-6"></div>
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] font-bold tracking-wider uppercase text-indigo-100">Tổng số giờ học đã diễn ra</span>
            <div className="p-2 bg-white/15 rounded-xl">
              <Clock className="w-5 h-5 text-white" />
            </div>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-3xl sm:text-4xl font-black">{metrics.totalHours.toFixed(1)}</span>
            <span className="text-base sm:text-lg font-bold text-indigo-100">giờ</span>
          </div>
          <div className="mt-2 text-xs font-semibold text-indigo-100/90 flex items-center gap-1">
            <span>≈ {metrics.hoursPart} giờ {metrics.minutesPart} phút ({metrics.totalMinutes} phút)</span>
          </div>
        </div>

        {/* Card 2: Total Sessions */}
        <div className="bg-white p-5 rounded-3xl border border-slate-200/80 shadow-sm">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] font-bold tracking-wider uppercase text-slate-400">Tổng số buổi học</span>
            <div className="p-2 bg-purple-50 text-purple-600 rounded-xl">
              <BookOpen className="w-5 h-5" />
            </div>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-3xl sm:text-4xl font-black text-slate-900">{metrics.totalSessions}</span>
            <span className="text-sm font-bold text-slate-500">buổi</span>
          </div>
          <div className="mt-2 text-xs font-medium text-slate-500 flex items-center gap-2">
            <span className="inline-flex items-center gap-1 font-bold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-md text-[10px]">
              {metrics.onlineCount} Online
            </span>
            <span className="inline-flex items-center gap-1 font-bold text-slate-600 bg-slate-100 px-2 py-0.5 rounded-md text-[10px]">
              {metrics.offlineCount} Offline
            </span>
          </div>
        </div>

        {/* Card 3: Unique Teaching Days */}
        <div className="bg-white p-5 rounded-3xl border border-slate-200/80 shadow-sm">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] font-bold tracking-wider uppercase text-slate-400">Số ngày có lịch học</span>
            <div className="p-2 bg-emerald-50 text-emerald-600 rounded-xl">
              <CalendarIcon className="w-5 h-5" />
            </div>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-3xl sm:text-4xl font-black text-slate-900">{metrics.uniqueDays}</span>
            <span className="text-sm font-bold text-slate-500">ngày thực tế</span>
          </div>
          <div className="mt-2 text-xs font-medium text-slate-500">
            Thời lượng trung bình: <strong className="text-slate-800 font-bold">{metrics.avgMinutesPerSession} phút/buổi</strong>
          </div>
        </div>

        {/* Card 4: Attendance & Engagement */}
        <div className="bg-white p-5 rounded-3xl border border-slate-200/80 shadow-sm">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] font-bold tracking-wider uppercase text-slate-400">
              {isTeacher ? 'Sĩ số trung bình' : 'Lượt tham gia học'}
            </span>
            <div className="p-2 bg-amber-50 text-amber-600 rounded-xl">
              <Users className="w-5 h-5" />
            </div>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-3xl sm:text-4xl font-black text-slate-900">
              {isTeacher ? metrics.avgAttendancePerSession : metrics.totalAttendees}
            </span>
            <span className="text-sm font-bold text-slate-500">
              {isTeacher ? 'học sinh/buổi' : 'lượt click'}
            </span>
          </div>
          <div className="mt-2 text-xs font-medium text-slate-500">
            {isTeacher 
              ? `Tổng ${metrics.totalAttendees} lượt học sinh tham gia` 
              : `${metrics.completedCount} buổi đã kết thúc`
            }
          </div>
        </div>

      </div>

      {/* DEDICATED CLASS GROUPS DEEP-DIVE COMPARISON SECTION */}
      <div className="bg-white border border-slate-200 rounded-3xl p-5 sm:p-6 shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-3">
          <div className="flex items-center gap-2.5">
            <div className="p-2.5 bg-indigo-50 text-indigo-600 rounded-2xl">
              <School className="w-5 h-5" />
            </div>
            <div>
              <h4 className="font-extrabold text-slate-900 text-sm sm:text-base">Bảng Thống Kê & So Sánh Thời Gian Dạy Theo Từng Nhóm Lớp</h4>
              <p className="text-slate-500 text-xs">Chi tiết số giờ, tỉ trọng % và sĩ số trung bình cho từng nhóm lớp trong kỳ báo cáo</p>
            </div>
          </div>

          {selectedClass !== 'all' && (
            <button
              type="button"
              onClick={() => setSelectedClass('all')}
              className="px-3 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-extrabold text-xs rounded-xl transition-colors flex items-center gap-1 self-start sm:self-auto"
            >
              <X className="w-3.5 h-3.5" />
              Xem tất cả các lớp
            </button>
          )}
        </div>

        {classSummaryList.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 pt-1">
            {classSummaryList.map(item => {
              const isSelected = selectedClass === item.className;
              return (
                <div 
                  key={item.className}
                  onClick={() => setSelectedClass(isSelected ? 'all' : item.className)}
                  className={`p-4 rounded-2xl border transition-all cursor-pointer relative overflow-hidden flex flex-col justify-between space-y-3 ${
                    isSelected 
                      ? 'bg-indigo-50/70 border-indigo-400 ring-2 ring-indigo-500/20 shadow-md' 
                      : 'bg-slate-50/70 hover:bg-white border-slate-200 hover:border-indigo-300 hover:shadow-sm'
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <div className={`p-2 rounded-xl font-black text-xs ${isSelected ? 'bg-indigo-600 text-white' : 'bg-slate-200 text-slate-700'}`}>
                        <School className="w-4 h-4" />
                      </div>
                      <div>
                        <h5 className="font-black text-slate-900 text-sm leading-tight">{item.className}</h5>
                        <span className="text-[11px] text-slate-500 font-semibold">{item.count} buổi học ({item.online} Online • {item.offline} Offline)</span>
                      </div>
                    </div>

                    <div className="text-right">
                      <span className="text-lg font-black text-indigo-600 block">{item.hours.toFixed(1)} h</span>
                      <span className="text-[10px] font-bold text-slate-400 block">{item.percentage}% tổng kỳ</span>
                    </div>
                  </div>

                  {/* Progress bar */}
                  <div className="w-full h-2 bg-slate-200 rounded-full overflow-hidden">
                    <div 
                      className={`h-full rounded-full transition-all duration-500 ${isSelected ? 'bg-indigo-600' : 'bg-indigo-500'}`}
                      style={{ width: `${Math.max(item.percentage, 4)}%` }}
                    ></div>
                  </div>

                  {/* Sĩ số & Action footer */}
                  <div className="flex items-center justify-between pt-1 border-t border-slate-200/60 text-xs">
                    <span className="text-slate-600 font-medium text-[11px] flex items-center gap-1">
                      <Users className="w-3.5 h-3.5 text-slate-400" />
                      Sĩ số TB: <strong className="text-slate-900">{item.avgAttendees} hs</strong>
                    </span>

                    <span className={`text-[11px] font-bold px-2 py-0.5 rounded-lg transition-colors flex items-center gap-1 ${
                      isSelected 
                        ? 'bg-indigo-600 text-white font-extrabold' 
                        : 'bg-white text-indigo-600 border border-indigo-200 hover:bg-indigo-50'
                    }`}>
                      {isSelected ? (
                        <>
                          <CheckCircle2 className="w-3 h-3" />
                          Đang xem lớp này
                        </>
                      ) : (
                        'Lọc riêng lớp này →'
                      )}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="py-8 text-center text-slate-400 text-xs font-medium">
            Chưa có dữ liệu nhóm lớp nào trong khoảng thời gian đã chọn.
          </div>
        )}
      </div>



      {/* DETAILED SESSIONS TABLE */}
      <div className="bg-white border border-slate-200 rounded-3xl p-5 sm:p-6 shadow-sm space-y-4">
        
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-4">
          <div className="flex items-center gap-2">
            <div className="p-2 bg-indigo-50 text-indigo-600 rounded-xl">
              <BookOpen className="w-4 h-4" />
            </div>
            <div>
              <h4 className="font-extrabold text-slate-900 text-sm">Danh Sách Chi Tiết Các Buổi Học Trong Kỳ</h4>
              <p className="text-slate-500 text-xs">
                Hiển thị {sortedSessions.length} buổi học 
                {selectedClass !== 'all' ? ` • Lớp ${selectedClass}` : ''}
                {selectedSubject !== 'all' ? ` • Môn ${selectedSubject}` : ''}
              </p>
            </div>
          </div>

          {/* Sort Control */}
          <div className="flex items-center gap-2">
            <span className="text-[11px] font-bold text-slate-400">Sắp xếp:</span>
            <select
              value={sortBy}
              onChange={e => setSortBy(e.target.value as any)}
              className="p-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 focus:ring-2 focus:ring-indigo-500 cursor-pointer"
            >
              <option value="date_desc">Mới nhất trước</option>
              <option value="date_asc">Cũ nhất trước</option>
              <option value="duration_desc">Thời lượng dài nhất</option>
            </select>
          </div>
        </div>

        {/* Table Container */}
        <div className="overflow-x-auto custom-scrollbar pb-2">
          <table className="w-full text-left text-xs text-slate-700">
            <thead className="bg-slate-50 text-slate-500 font-bold uppercase text-[10px] tracking-wider border-y border-slate-200">
              <tr>
                <th className="p-3 w-10 text-center">STT</th>
                <th className="p-3 w-32">Ngày & Giờ</th>
                <th className="p-3 w-28">Lớp / Môn</th>
                <th className="p-3 min-w-[200px]">Tên Buổi Học & Hình Thức</th>
                <th className="p-3 w-24 text-center">Thời Lượng</th>
                <th className="p-3 w-24 text-center">Trạng Thái</th>
                <th className="p-3 w-28 text-center">Sĩ Số</th>
                <th className="p-3 min-w-[180px]">Nhật Ký Giáo Viên</th>
                <th className="p-3 w-20 text-center">Thao Tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {sortedSessions.length > 0 ? (
                sortedSessions.map((session, index) => {
                  const start = new Date(session.startTime).getTime();
                  const end = new Date(session.endTime).getTime();
                  const durHours = ((end - start) / (1000 * 60 * 60));
                  const durMinutes = Math.round((end - start) / (1000 * 60));
                  const isOnline = session.isOnline !== undefined ? session.isOnline : (session.link && (session.link.startsWith('http') || session.link.startsWith('www')) ? true : false);

                  return (
                    <tr key={session.id || index} className="hover:bg-slate-50/60 transition-colors">
                      <td className="p-3 text-center font-bold text-slate-400">
                        {index + 1}
                      </td>

                      <td className="p-3 align-middle">
                        <span className="font-extrabold text-slate-900 block">
                          {format(new Date(session.startTime), 'dd/MM/yyyy')}
                        </span>
                        <span className="text-[11px] text-slate-500 font-medium block">
                          {format(new Date(session.startTime), 'HH:mm')} - {format(new Date(session.endTime), 'HH:mm')}
                        </span>
                      </td>

                      <td className="p-3 align-middle space-y-1">
                        {session.className && (
                          <button
                            type="button"
                            onClick={() => setSelectedClass(session.className?.trim() || 'all')}
                            className="inline-block px-2 py-0.5 bg-slate-100 hover:bg-indigo-100 text-slate-800 hover:text-indigo-800 font-extrabold rounded-md text-[10px] transition-colors"
                            title="Bấm để lọc riêng lớp này"
                          >
                            {session.className}
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={() => setSelectedSubject(session.subject?.trim() || 'all')}
                          className="inline-block px-2 py-0.5 bg-indigo-50 hover:bg-emerald-100 text-indigo-700 hover:text-emerald-800 font-bold rounded-md text-[10px] block w-fit transition-colors"
                          title="Bấm để lọc riêng môn này"
                        >
                          {session.subject || 'Toán'}
                        </button>
                      </td>

                      <td className="p-3 align-middle space-y-1">
                        <span className="font-extrabold text-slate-900 text-xs block">
                          {session.title}
                        </span>
                        <div className="flex items-center gap-1.5">
                          {isOnline ? (
                            <span className="inline-flex items-center gap-1 text-[10px] font-bold text-indigo-600 bg-indigo-50/80 px-1.5 py-0.5 rounded">
                              <Video className="w-3 h-3" />
                              Trực tuyến
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded">
                              Trực tiếp / Offline
                            </span>
                          )}
                        </div>
                      </td>

                      <td className="p-3 align-middle text-center">
                        <span className="font-black text-indigo-600 text-xs block">
                          {durHours.toFixed(1)} h
                        </span>
                        <span className="text-[10px] text-slate-400 font-medium block">
                          {durMinutes} phút
                        </span>
                      </td>

                      <td className="p-3 align-middle text-center">
                        {session.isCompleted ? (
                          <span className="inline-block px-2 py-0.5 bg-emerald-100 text-emerald-800 font-extrabold text-[10px] rounded-full">
                            Đã dạy xong
                          </span>
                        ) : (
                          <span className="inline-block px-2 py-0.5 bg-amber-100 text-amber-800 font-extrabold text-[10px] rounded-full">
                            Lịch sắp tới
                          </span>
                        )}
                      </td>

                      <td className="p-3 align-middle text-center">
                        <span className="font-bold text-slate-800 text-xs block">
                          {session.attendedByStudents?.length || 0} hs
                        </span>
                      </td>

                      <td className="p-3 align-middle">
                        {session.completedNote ? (
                          <div className="p-2 bg-emerald-50/60 border border-emerald-100 rounded-xl text-emerald-950 font-medium text-[11px] italic max-w-xs line-clamp-2">
                            "{session.completedNote}"
                          </div>
                        ) : (
                          <span className="text-slate-400 italic text-[11px]">— Không có ghi chú —</span>
                        )}
                      </td>

                      <td className="p-3 align-middle text-center">
                        <div className="flex items-center justify-center gap-1">
                          {onViewDetails && (
                            <button
                              type="button"
                              onClick={() => onViewDetails(session)}
                              className="p-1.5 hover:bg-indigo-50 text-indigo-600 rounded-lg transition-colors"
                              title="Xem chi tiết & điểm danh"
                            >
                              <Eye className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={9} className="py-12 text-center text-slate-400 font-medium">
                    Không tìm thấy buổi học nào phù hợp với bộ lọc {selectedClass !== 'all' ? `Lớp "${selectedClass}"` : ''} {selectedSubject !== 'all' ? `Môn "${selectedSubject}"` : ''}.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

      </div>

    </div>
  );
}
