import React, { useState, useMemo } from 'react';
import { 
  DollarSign, 
  Settings, 
  Receipt, 
  Users, 
  Bell, 
  Send, 
  Check, 
  AlertCircle, 
  Clock, 
  Plus, 
  Edit2, 
  Trash2, 
  Search, 
  ImageIcon, 
  Sparkles,
  CheckCircle2,
  HelpCircle,
  QrCode,
  ShieldCheck,
  ChevronRight,
  Eye,
  School,
  Copy
} from 'lucide-react';
import { format } from 'date-fns';
import { User, ClassSession, TuitionSetting, TuitionReceipt, SystemNotification } from '../types';
import { calculateStudentTuitionStatus, StudentTuitionStatus, getTuitionSettingForClass, generateTransferContent } from '../utils/tuitionUtils';
import { isClassMatching } from '../utils/classFilter';
import { ConfirmModal } from './ConfirmModal';
import { CustomSelect } from './CustomSelect';
import { ClassTuitionPreviewModal } from './ClassTuitionPreviewModal';
import { doc, setDoc, deleteDoc } from 'firebase/firestore';
import { db } from '../firebase';

interface TeacherTuitionManagerProps {
  currentUser: User;
  allUsers: User[];
  sessions: ClassSession[];
  tuitionSettings: TuitionSetting[];
  tuitionReceipts: TuitionReceipt[];
  onUpdateSettings: (settings: TuitionSetting[]) => void;
  onUpdateReceipts: (receipts: TuitionReceipt[]) => void;
  onViewImageLightbox: (url: string) => void;
  onOpenDemo?: () => void;
  setNotification: (notif: { message: string; type: 'success' | 'error' | 'info' } | null) => void;
}

export function TeacherTuitionManager({
  currentUser,
  allUsers,
  sessions,
  tuitionSettings,
  tuitionReceipts,
  onUpdateSettings,
  onUpdateReceipts,
  onViewImageLightbox,
  onOpenDemo,
  setNotification
}: TeacherTuitionManagerProps) {
  const [activeTab, setActiveTab] = useState<'students' | 'settings' | 'receipts'>('students');
  const [editingSetting, setEditingSetting] = useState<Partial<TuitionSetting> | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterClass, setFilterClass] = useState<string>('all');
  const [filterStatus, setFilterStatus] = useState<'all' | 'unpaid' | 'accumulating'>('all');
  const [previewingDemoSetting, setPreviewingDemoSetting] = useState<TuitionSetting | null>(null);
  const [isCustomClassName, setIsCustomClassName] = useState<boolean>(false);

  // Formatting helpers for currency inputs (automatic dot grouping e.g. 1.500.000)
  const formatCurrencyWithDots = (val: number | string | undefined | null) => {
    if (val === undefined || val === null || val === '') return '';
    const num = typeof val === 'number' ? val : parseInt(String(val).replace(/\D/g, ''), 10);
    if (isNaN(num)) return '';
    return num.toLocaleString('vi-VN');
  };

  const parseCurrencyDigits = (str: string) => {
    const raw = str.replace(/\D/g, '');
    return raw ? parseInt(raw, 10) : 0;
  };

  // Confirmation modal states
  const [confirmModalConfig, setConfirmModalConfig] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    onConfirm: () => Promise<void> | void;
    variant?: 'danger' | 'warning' | 'info';
  }>({
    isOpen: false,
    title: '',
    message: '',
    onConfirm: () => {},
    variant: 'danger'
  });

  // Automated reminder config state
  const [autoReminderConfig, setAutoReminderConfig] = useState<{
    enabled: boolean;
    frequency: 'on_due' | 'weekly' | 'three_days' | 'monthly';
    customMessage: string;
    lastSentAt?: string;
  }>(() => {
    try {
      const saved = localStorage.getItem('educonnect_tuition_auto_reminder');
      return saved ? JSON.parse(saved) : {
        enabled: true,
        frequency: 'on_due',
        customMessage: 'Chào em, thời lượng học của em đã đạt hạn mức quy định. Vui lòng hoàn tất thanh toán học phí đợt này qua mã VietQR trong hệ thống nhé!'
      };
    } catch {
      return {
        enabled: true,
        frequency: 'on_due',
        customMessage: 'Chào em, thời lượng học của em đã đạt hạn mức quy định. Vui lòng hoàn tất thanh toán học phí đợt này qua mã VietQR trong hệ thống nhé!'
      };
    }
  });

  const saveAutoReminderConfig = (newConfig: typeof autoReminderConfig) => {
    setAutoReminderConfig(newConfig);
    try {
      localStorage.setItem('educonnect_tuition_auto_reminder', JSON.stringify(newConfig));
    } catch (e) {
      console.error('Error saving auto reminder config:', e);
    }
  };

  // Get all students
  const students = useMemo(() => {
    return allUsers.filter(u => u.role === 'student');
  }, [allUsers]);

  // Distinct classes
  const distinctClasses = useMemo(() => {
    const set = new Set<string>();
    tuitionSettings.forEach(s => s.className && set.add(s.className));
    students.forEach(s => s.className && set.add(s.className));
    return Array.from(set).filter(Boolean);
  }, [tuitionSettings, students]);

  // Classes explicitly managed/taught by this teacher (or all classes for Admin)
  const teacherManagedClasses = useMemo(() => {
    const classSet = new Set<string>();

    if (currentUser.role === 'admin') {
      allUsers.forEach(u => {
        if (u.className) {
          u.className.split(/[,;\n]+/).map(c => c.trim()).filter(Boolean).forEach(c => classSet.add(c));
        }
      });
      sessions.forEach(s => {
        if (s.className) classSet.add(s.className.trim());
      });
    } else {
      // 1. Direct class name assigned to teacher profile
      if (currentUser.className) {
        currentUser.className.split(/[,;\n]+/).map(c => c.trim()).filter(Boolean).forEach(c => classSet.add(c));
      }
      // 2. Array of assigned classes if any
      if (Array.isArray((currentUser as any).assignedClasses)) {
        (currentUser as any).assignedClasses.forEach((c: string) => c && classSet.add(c.trim()));
      }
      // 3. Sessions taught by this teacher
      sessions.forEach(s => {
        const isTaughtByMe = s.teacherId === currentUser.id || s.teacherName === currentUser.name;
        if (isTaughtByMe && s.className) {
          classSet.add(s.className.trim());
        }
      });
      // 4. Students who have this teacher assigned
      allUsers.forEach(u => {
        if (u.role === 'student') {
          const isMyStudent = (u as any).teacherId === currentUser.id || (u as any).teacherName === currentUser.name;
          if (isMyStudent && u.className) {
            u.className.split(/[,;\n]+/).map(c => c.trim()).filter(Boolean).forEach(c => classSet.add(c));
          }
        }
      });
    }

    // Include existing classes from saved tuition settings so they remain selectable
    tuitionSettings.forEach(s => {
      if (s.className) classSet.add(s.className.trim());
    });

    return Array.from(classSet).filter(Boolean);
  }, [currentUser, allUsers, sessions, tuitionSettings]);

  // Compute tuition status for all students
  const studentStatuses = useMemo<StudentTuitionStatus[]>(() => {
    return students.map(student => {
      return calculateStudentTuitionStatus(
        student,
        sessions,
        tuitionSettings,
        tuitionReceipts
      );
    });
  }, [students, sessions, tuitionSettings, tuitionReceipts]);

  // Filtered student list
  const filteredStudents = useMemo(() => {
    return studentStatuses.filter(item => {
      if (filterClass !== 'all' && !isClassMatching(item.className, filterClass)) {
        return false;
      }
      if (filterStatus !== 'all' && item.status !== filterStatus) {
        return false;
      }
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase();
        const matchName = item.student.name.toLowerCase().includes(query);
        const matchPhone = (item.student.phoneStudent || item.student.phoneParent || '').toLowerCase().includes(query);
        const matchCode = (item.student.connectionCode || item.student.id).toLowerCase().includes(query);
        const matchClass = item.className.toLowerCase().includes(query);
        if (!matchName && !matchPhone && !matchCode && !matchClass) return false;
      }
      return true;
    });
  }, [studentStatuses, filterClass, filterStatus, searchQuery]);

  // Summary Metrics
  const unpaidCount = useMemo(() => studentStatuses.filter(s => s.status === 'unpaid').length, [studentStatuses]);
  const accumulatingCount = useMemo(() => studentStatuses.filter(s => s.status === 'accumulating').length, [studentStatuses]);
  const totalDueAmount = useMemo(() => studentStatuses.reduce((acc, s) => acc + s.amountDue, 0), [studentStatuses]);

  // Send single student tuition reminder notification
  const handleSendReminderToStudent = async (status: StudentTuitionStatus) => {
    const notifId = `notif_tuition_${status.student.id}_${Date.now()}`;
    const newNotif: SystemNotification = {
      id: notifId,
      title: `🔔 Nhắc đóng học phí - Lớp ${status.className}`,
      content: `Kính gửi học sinh ${status.student.name}, em đã hoàn thành ${status.currentCycleHours.toFixed(1)}/${status.limitHours} giờ học. Đến hạn thanh toán học phí đợt này (${status.tuitionFee.toLocaleString('vi-VN')} VNĐ). Vui lòng vào mục Lịch học > Học phí để quét mã VietQR!`,
      type: 'personal_reminder',
      badge: '💳 Học phí',
      badgeColor: 'rose',
      targetStudentId: status.student.id,
      targetUserId: status.student.id,
      targetRole: 'student',
      createdAt: new Date().toISOString()
    };

    try {
      await setDoc(doc(db, 'system_notifications', notifId), newNotif);
      setNotification({
        message: `Đã gửi thông báo nhắc học phí đến học sinh ${status.student.name} qua hệ thống nội bộ!`,
        type: 'success'
      });
      setTimeout(() => setNotification(null), 3500);
    } catch (e) {
      console.error('Error sending reminder notification:', e);
      setNotification({
        message: `Đã gửi thông báo nội bộ cục bộ cho học sinh ${status.student.name}`,
        type: 'info'
      });
      setTimeout(() => setNotification(null), 3000);
    }
  };

  // Batch send reminder notifications to all unpaid students
  const handleBatchSendReminders = async () => {
    const unpaidStudents = studentStatuses.filter(s => s.status === 'unpaid');
    if (unpaidStudents.length === 0) {
      setNotification({
        message: 'Hiện không có học sinh nào đến hạn cần nhắc học phí.',
        type: 'info'
      });
      setTimeout(() => setNotification(null), 3000);
      return;
    }

    let successCount = 0;
    for (const status of unpaidStudents) {
      const notifId = `notif_tuition_${status.student.id}_${Date.now()}_${Math.random().toString(36).substring(7)}`;
      const newNotif: SystemNotification = {
        id: notifId,
        title: `🔔 Nhắc đóng học phí - Lớp ${status.className}`,
        content: `Kính gửi học sinh ${status.student.name}, em đã hoàn thành ${status.currentCycleHours.toFixed(1)}/${status.limitHours} giờ học. Đến hạn thanh toán học phí đợt này (${status.tuitionFee.toLocaleString('vi-VN')} VNĐ). Vui lòng vào mục Lịch học > Học phí để quét mã VietQR!`,
        type: 'personal_reminder',
        badge: '💳 Học phí',
        badgeColor: 'rose',
        targetStudentId: status.student.id,
        targetUserId: status.student.id,
        targetRole: 'student',
        createdAt: new Date().toISOString()
      };

      try {
        await setDoc(doc(db, 'system_notifications', notifId), newNotif);
        successCount++;
      } catch (e) {
        console.warn('Batch notification doc sync warning:', e);
      }
    }

    // Save last sent timestamp
    saveAutoReminderConfig({
      ...autoReminderConfig,
      lastSentAt: new Date().toISOString()
    });

    setNotification({
      message: `Đã gửi thông báo nhắc học phí thành công cho ${unpaidStudents.length} học sinh qua hệ thống nội bộ!`,
      type: 'success'
    });
    setTimeout(() => setNotification(null), 4000);
  };

  // Manual payment confirmation by Teacher (e.g. Cash/Direct Bank)
  const handleManualConfirmPayment = (status: StudentTuitionStatus) => {
    setConfirmModalConfig({
      isOpen: true,
      title: 'Xác nhận thu học phí trực tiếp',
      message: `Xác nhận đã thu ${status.tuitionFee.toLocaleString('vi-VN')} VNĐ của học sinh ${status.student.name} (Lớp ${status.className})? Hệ thống sẽ trừ ${status.limitHours} giờ học và chuyển số giờ vượt (${status.excessHours.toFixed(1)}h) sang tháng mới.`,
      variant: 'info',
      onConfirm: async () => {
        const receiptId = `receipt_manual_${Date.now()}`;
        const newReceipt: TuitionReceipt = {
          id: receiptId,
          studentId: status.student.id,
          studentName: status.student.name,
          className: status.className,
          amount: status.tuitionFee,
          hoursAtPayment: status.currentCycleHours,
          screenshotUrl: '',
          paidAt: new Date().toISOString(),
          status: 'approved'
        };

        // Update local receipts state
        const updated = [newReceipt, ...tuitionReceipts];
        onUpdateReceipts(updated);
        try {
          localStorage.setItem('educonnect_tuition_receipts', JSON.stringify(updated));
        } catch (e) {
          console.error(e);
        }

        try {
          await setDoc(doc(db, 'tuition_receipts', receiptId), newReceipt);
        } catch (e) {
          console.warn('Firestore sync receipt warning:', e);
        }

        setNotification({
          message: `Đã mộc và xác nhận thanh toán học phí thành công cho ${status.student.name}! Tháng mới đã bắt đầu với ${status.excessHours.toFixed(1)} giờ học.`,
          type: 'success'
        });
        setTimeout(() => setNotification(null), 4500);
      }
    });
  };

  // Delete tuition setting using non-blocking modal
  const handleDeleteSetting = (setting: TuitionSetting) => {
    setConfirmModalConfig({
      isOpen: true,
      title: 'Xóa cấu hình học phí',
      message: `Bạn có chắc chắn muốn xóa cấu hình học phí lớp "${setting.className}"? Hành động này không thể hoàn tác.`,
      variant: 'danger',
      onConfirm: async () => {
        const updated = tuitionSettings.filter(s => s.id !== setting.id);
        onUpdateSettings(updated);
        try {
          localStorage.setItem('educonnect_tuition_settings', JSON.stringify(updated));
          await deleteDoc(doc(db, 'tuition_settings', setting.id));
        } catch (e) {
          console.warn('Error deleting setting:', e);
        }
        setNotification({ message: `Đã xóa cấu hình học phí lớp ${setting.className}.`, type: 'success' });
        setTimeout(() => setNotification(null), 3000);
      }
    });
  };

  // Delete tuition receipt using non-blocking modal
  const handleDeleteReceipt = (receipt: TuitionReceipt) => {
    setConfirmModalConfig({
      isOpen: true,
      title: 'Xóa biên lai giao dịch',
      message: `Bạn có chắc chắn muốn xóa biên lai học phí của học sinh "${receipt.studentName}"? Số giờ học tương ứng sẽ được tính toán lại.`,
      variant: 'danger',
      onConfirm: async () => {
        const updated = tuitionReceipts.filter(r => r.id !== receipt.id);
        onUpdateReceipts(updated);
        try {
          localStorage.setItem('educonnect_tuition_receipts', JSON.stringify(updated));
          await deleteDoc(doc(db, 'tuition_receipts', receipt.id));
        } catch (e) {
          console.warn('Error deleting receipt:', e);
        }
        setNotification({ message: 'Đã xóa biên lai giao dịch.', type: 'success' });
        setTimeout(() => setNotification(null), 3000);
      }
    });
  };

  return (
    <div className="space-y-6">
      {/* Top Banner / Tab Selector */}
      <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h2 className="text-base font-extrabold text-slate-900 flex items-center gap-2">
              <DollarSign className="w-5 h-5 text-indigo-600" />
              QUẢN LÝ HỌC PHÍ & THEO DÕI TIẾN ĐỘ THEO GIỜ
            </h2>
            <p className="text-slate-500 text-xs mt-0.5 font-medium">
              Tự động tích lũy thời lượng học, phát hiện học sinh chưa thanh toán và chuyển tiếp số giờ vượt sang chu kỳ mới
            </p>
          </div>

          {/* Tab buttons */}
          <div className="flex p-1 bg-slate-100 rounded-2xl border border-slate-200/60 w-full sm:w-auto overflow-x-auto">
            <button
              type="button"
              onClick={() => setActiveTab('students')}
              className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-extrabold transition-all shrink-0 ${
                activeTab === 'students'
                  ? 'bg-white text-indigo-700 shadow-2xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Users className="w-4 h-4" />
              <span>Danh sách Học sinh</span>
              {unpaidCount > 0 && (
                <span className="px-1.5 py-0.2 bg-rose-500 text-white text-[10px] font-black rounded-full ml-1 animate-pulse">
                  {unpaidCount}
                </span>
              )}
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('settings')}
              className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-extrabold transition-all shrink-0 ${
                activeTab === 'settings'
                  ? 'bg-white text-indigo-700 shadow-2xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Settings className="w-4 h-4" />
              <span>Cấu hình theo Lớp ({tuitionSettings.length})</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('receipts')}
              className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-extrabold transition-all shrink-0 ${
                activeTab === 'receipts'
                  ? 'bg-white text-indigo-700 shadow-2xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Receipt className="w-4 h-4" />
              <span>Biên lai đã nộp ({tuitionReceipts.length})</span>
            </button>
          </div>
        </div>

        {/* Quick KPI Overview bar */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-3 border-t border-slate-100 text-xs font-bold">
          <div className="bg-slate-50 p-3 rounded-2xl border border-slate-200/70">
            <span className="text-[10px] text-slate-400 block font-semibold">TỔNG SỐ HỌC SINH</span>
            <span className="text-base font-black text-slate-800">{students.length} em</span>
          </div>

          <div className="bg-rose-50/70 p-3 rounded-2xl border border-rose-200/70">
            <span className="text-[10px] text-rose-600 block font-semibold">CHƯA THANH TOÁN (ĐẾN HẠN)</span>
            <span className="text-base font-black text-rose-700">{unpaidCount} học sinh</span>
          </div>

          <div className="bg-indigo-50/70 p-3 rounded-2xl border border-indigo-200/70">
            <span className="text-[10px] text-indigo-600 block font-semibold">ĐANG TÍCH LŨY TIẾN ĐỘ</span>
            <span className="text-base font-black text-indigo-700">{accumulatingCount} học sinh</span>
          </div>

          <div className="bg-emerald-50/70 p-3 rounded-2xl border border-emerald-200/70">
            <span className="text-[10px] text-emerald-600 block font-semibold">TỔNG BIÊN LAI ĐÃ MỘC</span>
            <span className="text-base font-black text-emerald-700">{tuitionReceipts.length} biên lai</span>
          </div>
        </div>
      </div>

      {/* TAB 1: STUDENT TUITION STATUS & AUTO-REMINDER MANAGEMENT */}
      {activeTab === 'students' && (
        <div className="space-y-6">
          {/* Automated periodic reminder control box */}
          <div className="bg-gradient-to-r from-indigo-50/90 via-purple-50/70 to-pink-50/50 p-5 rounded-3xl border border-indigo-100 shadow-3xs space-y-4">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
              <div className="flex items-center gap-2.5">
                <div className="p-2.5 bg-indigo-600 text-white rounded-2xl shadow-sm">
                  <Bell className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-xs font-black text-slate-900 uppercase tracking-tight">
                    TỰ ĐỘNG GỬI THÔNG BÁO NHẮC NHỞ HỌC PHÍ NỘI BỘ
                  </h3>
                  <p className="text-[11px] text-slate-600 font-medium">
                    Hệ thống sẽ định kỳ gửi thông báo chuông (Notification) cho các học sinh có trạng thái "Chưa thanh toán"
                  </p>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center gap-2 w-full sm:w-auto">
                <button
                  type="button"
                  onClick={handleBatchSendReminders}
                  disabled={unpaidCount === 0}
                  className="w-full sm:w-auto px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-40 disabled:hover:bg-indigo-600 text-white rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 shadow-2xs active:scale-98"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>Gửi thông báo ngay cho tất cả ({unpaidCount}) HS</span>
                </button>
              </div>
            </div>

            {/* Config toggles */}
            <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 pt-3 border-t border-indigo-100/80 items-center text-xs">
              <div className="sm:col-span-4 flex items-center gap-3 bg-white/80 p-3 rounded-2xl border border-indigo-100">
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={autoReminderConfig.enabled}
                    onChange={(e) => saveAutoReminderConfig({ ...autoReminderConfig, enabled: e.target.checked })}
                    className="sr-only peer"
                  />
                  <div className="w-9 h-5 bg-slate-300 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-indigo-600"></div>
                </label>
                <span className="font-extrabold text-slate-800">
                  {autoReminderConfig.enabled ? 'Đang bật tự động gửi định kỳ' : 'Đang tắt tự động'}
                </span>
              </div>

              <div className="sm:col-span-4 bg-white/80 p-2 rounded-2xl border border-indigo-100 flex items-center gap-2">
                <span className="text-slate-500 font-bold shrink-0 text-[11px] whitespace-nowrap">Tần suất:</span>
                <div className="flex-1 min-w-0">
                  <CustomSelect
                    value={autoReminderConfig.frequency}
                    onChange={(val) => saveAutoReminderConfig({ ...autoReminderConfig, frequency: val as any })}
                    options={[
                      { value: 'on_due', label: 'Ngay khi học sinh chạm/vượt 20 giờ' },
                      { value: 'weekly', label: 'Hàng tuần (Thứ 2 hàng tuần)' },
                      { value: 'three_days', label: 'Mỗi 3 ngày nhắc 1 lần' },
                      { value: 'monthly', label: 'Hàng tháng (Ngày 1 đầu tháng)' },
                    ]}
                    size="sm"
                    className="w-full text-xs font-bold"
                  />
                </div>
              </div>

              <div className="sm:col-span-4 text-slate-500 text-[11px] font-semibold flex items-center justify-end gap-1.5">
                <Clock className="w-3.5 h-3.5 text-indigo-500" />
                <span>Lần gửi gần nhất: {autoReminderConfig.lastSentAt ? format(new Date(autoReminderConfig.lastSentAt), 'HH:mm dd/MM/yyyy') : 'Chưa gửi'}</span>
              </div>
            </div>
          </div>

          {/* Filter & Search Bar */}
          <div className="bg-white p-4 rounded-3xl border border-slate-200 shadow-3xs flex flex-col sm:flex-row items-center justify-between gap-3">
            <div className="relative w-full sm:w-72">
              <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Tìm học sinh theo tên, lớp..."
                className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 placeholder-slate-400 outline-none focus:ring-2 focus:ring-indigo-500/20"
              />
            </div>

            <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
              <div className="w-44">
                <CustomSelect
                  value={filterClass}
                  onChange={(val) => setFilterClass(val)}
                  options={[
                    { value: 'all', label: 'Tất cả lớp học' },
                    ...distinctClasses.map(cls => ({
                      value: cls,
                      label: `Lớp ${cls}`
                    }))
                  ]}
                  size="sm"
                  className="w-full text-xs font-bold"
                />
              </div>

              <div className="w-48">
                <CustomSelect
                  value={filterStatus}
                  onChange={(val) => setFilterStatus(val as any)}
                  options={[
                    { value: 'all', label: 'Tất cả trạng thái' },
                    { value: 'unpaid', label: `🚨 Chưa thanh toán (${unpaidCount})` },
                    { value: 'accumulating', label: `⏳ Đang tích lũy (${accumulatingCount})` },
                  ]}
                  size="sm"
                  className="w-full text-xs font-bold"
                />
              </div>
            </div>
          </div>

          {/* Student Statuses Cards Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {filteredStudents.length === 0 ? (
              <div className="col-span-full text-center p-12 bg-slate-50 border border-dashed border-slate-200 rounded-3xl text-slate-400 text-xs font-semibold">
                Không tìm thấy học sinh nào phù hợp với bộ lọc.
              </div>
            ) : (
              filteredStudents.map((item) => {
                const isOverdue = item.isDue;
                const progressPct = Math.min(100, (item.currentCycleHours / item.limitHours) * 100);

                return (
                  <div
                    key={item.student.id}
                    className={`bg-white rounded-3xl p-5 border shadow-3xs flex flex-col justify-between gap-4 transition-all relative overflow-hidden ${
                      isOverdue ? 'border-rose-300 ring-1 ring-rose-200 bg-rose-50/10' : 'border-slate-200'
                    }`}
                  >
                    {/* Top row: Student info & Status badge */}
                    <div className="flex justify-between items-start gap-2">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="font-extrabold text-sm text-slate-900">{item.student.name}</span>
                          <span className="px-2 py-0.5 bg-indigo-50 text-indigo-700 text-[10px] font-extrabold rounded-full border border-indigo-200/50">
                            {item.className || 'Chưa gán lớp'}
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-400 font-medium truncate max-w-[200px]">
                          {item.student.phoneStudent || item.student.phoneParent ? `SĐT: ${item.student.phoneStudent || item.student.phoneParent}` : `Mã: ${item.student.connectionCode || item.student.id}`}
                        </p>
                      </div>

                      {/* Status badge */}
                      {isOverdue ? (
                        <span className="px-2.5 py-1 bg-rose-100 text-rose-800 border border-rose-300 rounded-full text-[10px] font-black tracking-tight shrink-0 flex items-center gap-1 shadow-2xs">
                          <AlertCircle className="w-3 h-3 text-rose-600 stroke-[3px]" />
                          Chưa thanh toán
                        </span>
                      ) : (
                        <span className="px-2.5 py-1 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-full text-[10px] font-black tracking-tight shrink-0 flex items-center gap-1 shadow-2xs">
                          <Clock className="w-3 h-3 text-emerald-600 stroke-[3px]" />
                          Đang tích lũy
                        </span>
                      )}
                    </div>

                    {/* Hours progress breakdown */}
                    <div className="bg-slate-50 p-3.5 rounded-2xl border border-slate-200/70 space-y-2.5">
                      <div className="flex justify-between items-end text-xs font-bold">
                        <div>
                          <span className="text-[10px] text-slate-400 block font-semibold">TIẾN ĐỘ ĐỢT HIỆN TẠI</span>
                          <span className={`text-base font-black ${isOverdue ? 'text-rose-600' : 'text-indigo-600'}`}>
                            {item.currentCycleHours.toFixed(1)}
                          </span>
                          <span className="text-slate-400 text-xs"> / {item.limitHours} giờ</span>
                        </div>

                        <div className="text-right">
                          <span className="text-[10px] text-slate-400 block font-semibold">TỔNG ĐÃ HỌC</span>
                          <span className="text-slate-700 font-extrabold">{item.totalCompletedHours.toFixed(1)} giờ</span>
                        </div>
                      </div>

                      {/* Progress Bar */}
                      <div className="w-full bg-slate-200 h-2 rounded-full overflow-hidden">
                        <div
                          className={`h-full transition-all duration-500 rounded-full ${
                            isOverdue ? 'bg-rose-500' : 'bg-indigo-600'
                          }`}
                          style={{ width: `${progressPct}%` }}
                        />
                      </div>

                      {/* Overdue details & Spillover note */}
                      {isOverdue ? (
                        <div className="bg-rose-100/70 p-2.5 rounded-xl border border-rose-200/80 text-[11px] font-bold text-rose-900 space-y-1">
                          <div className="flex justify-between items-center">
                            <span>Số đợt đến hạn:</span>
                            <span className="font-black text-rose-700">{item.pendingCyclesCount} đợt ({item.amountDue.toLocaleString('vi-VN')}đ)</span>
                          </div>
                          {item.excessHours > 0 && (
                            <div className="flex justify-between items-center text-[10px] text-rose-700">
                              <span>Số giờ vượt hạn mức:</span>
                              <span className="font-black">+{item.excessHours.toFixed(1)} giờ</span>
                            </div>
                          )}
                          <p className="text-[10px] text-slate-600 font-medium italic pt-1 border-t border-rose-200/50">
                            💡 Sau khi xác nhận đóng {item.tuitionFee.toLocaleString('vi-VN')}đ, tháng mới sẽ bắt đầu bằng <strong>{item.excessHours.toFixed(1)} giờ</strong> đã học.
                          </p>
                        </div>
                      ) : (
                        <div className="text-[10px] text-slate-500 font-semibold flex justify-between">
                          <span>Cần học thêm:</span>
                          <span className="font-bold text-slate-700">{(item.limitHours - item.currentCycleHours).toFixed(1)} giờ</span>
                        </div>
                      )}
                    </div>

                    {/* Bottom Actions */}
                    <div className="flex gap-2 pt-1 border-t border-slate-100">
                      {isOverdue && (
                        <button
                          type="button"
                          onClick={() => handleSendReminderToStudent(item)}
                          className="flex-1 py-2 px-3 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 rounded-xl text-xs font-extrabold transition-colors flex items-center justify-center gap-1 shadow-3xs"
                          title="Gửi thông báo nhắc nhở nội bộ"
                        >
                          <Send className="w-3.5 h-3.5" />
                          <span>Nhắc đóng phí</span>
                        </button>
                      )}

                      <button
                        type="button"
                        onClick={() => handleManualConfirmPayment(item)}
                        className="flex-1 py-2 px-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-extrabold transition-colors flex items-center justify-center gap-1 shadow-2xs active:scale-98"
                        title="Xác nhận thanh toán trực tiếp (tiền mặt / chuyển khoản)"
                      >
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        <span>Mộc thanh toán</span>
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}

      {/* TAB 2: TUITION SETTINGS BY CLASS */}
      {activeTab === 'settings' && (
        <div className="space-y-6">
          <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-3xs space-y-6">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="font-extrabold text-slate-900 text-sm">Cấu hình Hạn định giờ & Học phí theo Lớp</h3>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-indigo-50 text-indigo-700 border border-indigo-200">
                    {tuitionSettings.length} cấu hình
                  </span>
                </div>
                <p className="text-slate-400 text-xs font-medium mt-0.5">
                  Thiết lập số giờ học yêu cầu cho 1 đợt thanh toán (VD: 20 tiếng) và thông tin tài khoản chuyển khoản VietQR
                </p>
              </div>

              <div className="flex items-center gap-2 flex-wrap">
                {onOpenDemo && (
                  <button
                    type="button"
                    onClick={onOpenDemo}
                    className="px-3.5 py-2 bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-200/80 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 shadow-3xs hover:scale-102 active:scale-98"
                    title="Mô phỏng quy trình thu học phí 4 bước từ GV đến HS"
                  >
                    <Sparkles className="w-4 h-4 text-amber-600" />
                    <span>Mô phỏng quy trình (Demo)</span>
                  </button>
                )}

                {!editingSetting && (
                  <button
                    type="button"
                    onClick={() => {
                      const defaultClass = teacherManagedClasses[0] || '';
                      setEditingSetting({
                        id: `setting_${Date.now()}`,
                        className: defaultClass,
                        limitHours: 20,
                        tuitionFee: 1500000,
                        qrBankId: 'MBBank',
                        qrAccountNumber: '',
                        qrAccountName: '',
                        qrImageUrl: '',
                        transferContentTemplate: 'Hoc phi {studentName} lop {className}'
                      });
                      setIsCustomClassName(!defaultClass);
                    }}
                    className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 shadow-2xs hover:scale-102 active:scale-98"
                  >
                    <Plus className="w-4 h-4" />
                    <span>Thêm cấu hình lớp mới</span>
                  </button>
                )}
              </div>
            </div>

            {/* Inline Setting Editor Form */}
            {editingSetting && (
              <div className="bg-slate-50 p-5 rounded-3xl border border-slate-200/90 space-y-4 animate-fade-in shadow-2xs">
                <div className="flex justify-between items-center border-b border-slate-200/70 pb-3">
                  <h4 className="font-black text-slate-900 text-xs flex items-center gap-1.5 uppercase">
                    <Sparkles className="w-4 h-4 text-amber-500" />
                    {editingSetting.id?.startsWith('setting_') ? 'Thêm cấu hình lớp mới' : `Chỉnh sửa cấu hình: Lớp ${editingSetting.className || '...'}`}
                  </h4>
                  <button
                    type="button"
                    onClick={() => setEditingSetting(null)}
                    className="text-xs text-slate-400 hover:text-slate-600 font-bold px-2 py-1 rounded-lg hover:bg-slate-200/60"
                  >
                    Hủy bỏ
                  </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Class Name Selector */}
                  <div>
                    <div className="flex justify-between items-center mb-1">
                      <label className="text-[11px] font-bold text-slate-700 block flex items-center gap-1">
                        <School className="w-3.5 h-3.5 text-indigo-600" />
                        <span>Tên lớp học:</span>
                      </label>
                      {teacherManagedClasses.length > 0 && (
                        <button
                          type="button"
                          onClick={() => setIsCustomClassName(!isCustomClassName)}
                          className="text-[10px] font-bold text-indigo-600 hover:text-indigo-800 underline"
                        >
                          {isCustomClassName ? '← Chọn từ lớp của GV' : '+ Nhập tên lớp tùy chỉnh'}
                        </button>
                      )}
                    </div>

                    {!isCustomClassName && teacherManagedClasses.length > 0 ? (
                      <div className="space-y-1.5">
                        <CustomSelect
                          value={editingSetting.className || ''}
                          onChange={val => {
                            if (val === '__custom__') {
                              setIsCustomClassName(true);
                            } else {
                              setEditingSetting({ ...editingSetting, className: val });
                            }
                          }}
                          options={[
                            ...teacherManagedClasses.map(cls => ({
                              value: cls,
                              label: `Lớp ${cls}`,
                              badge: 'Lớp GV đảm nhận'
                            })),
                            {
                              value: '__custom__',
                              label: '+ Nhập tên lớp tùy chỉnh khác...',
                              badge: 'Tùy chỉnh'
                            }
                          ]}
                          placeholder="-- Chọn lớp học giáo viên đảm nhận --"
                          className="w-full"
                          size="sm"
                          searchable={teacherManagedClasses.length > 4}
                        />

                        {/* Quick Selection Chips */}
                        <div className="flex flex-wrap gap-1 items-center pt-0.5">
                          <span className="text-[10px] text-slate-400 font-medium mr-1">Lớp của bạn:</span>
                          {teacherManagedClasses.map(cls => (
                            <button
                              key={cls}
                              type="button"
                              onClick={() => setEditingSetting({ ...editingSetting, className: cls })}
                              className={`px-2 py-0.5 rounded-lg text-[10px] font-bold transition-all ${
                                editingSetting.className === cls
                                  ? 'bg-indigo-600 text-white shadow-3xs'
                                  : 'bg-white text-slate-700 hover:bg-indigo-50 hover:text-indigo-700 border border-slate-200'
                              }`}
                            >
                              {cls}
                            </button>
                          ))}
                        </div>
                      </div>
                    ) : (
                      <div className="space-y-1">
                        <input
                          type="text"
                          value={editingSetting.className || ''}
                          onChange={e => setEditingSetting({ ...editingSetting, className: e.target.value })}
                          placeholder="VD: 10A1, 12 Tin..."
                          className="w-full px-3.5 py-2 bg-white border border-slate-200 rounded-xl text-xs font-bold outline-none focus:ring-2 focus:ring-indigo-500/20"
                        />
                        {teacherManagedClasses.length > 0 && (
                          <p className="text-[10px] text-slate-400">
                            Hoặc nhấn "Chọn từ lớp của GV" ở trên để chọn nhanh các lớp được phân công.
                          </p>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Limit Hours */}
                  <div>
                    <label className="text-[11px] font-bold text-slate-700 block mb-1">
                      Hạn định giờ học (Số tiếng / đợt):
                    </label>
                    <input
                      type="number"
                      value={editingSetting.limitHours || 20}
                      onChange={e => setEditingSetting({ ...editingSetting, limitHours: Number(e.target.value) })}
                      className="w-full px-3.5 py-2 bg-white border border-slate-200 rounded-xl text-xs font-bold outline-none focus:ring-2 focus:ring-indigo-500/20"
                    />
                  </div>

                  {/* Tuition Fee with 3-digit dot grouping */}
                  <div>
                    <div className="flex justify-between items-center mb-1">
                      <label className="text-[11px] font-bold text-slate-700 block">
                        Mức học phí (VNĐ) <span className="text-slate-400 font-normal">(tự động ngắt 3 số)</span>:
                      </label>
                      {editingSetting.tuitionFee ? (
                        <span className="text-[10px] text-emerald-700 font-extrabold bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200">
                          {editingSetting.tuitionFee.toLocaleString('vi-VN')} đ
                        </span>
                      ) : null}
                    </div>
                    <input
                      type="text"
                      inputMode="numeric"
                      value={formatCurrencyWithDots(editingSetting.tuitionFee)}
                      onChange={e => {
                        const parsed = parseCurrencyDigits(e.target.value);
                        setEditingSetting({ ...editingSetting, tuitionFee: parsed });
                      }}
                      placeholder="VD: 1.500.000"
                      className="w-full px-3.5 py-2 bg-white border border-slate-200 rounded-xl text-xs font-mono font-bold outline-none focus:ring-2 focus:ring-indigo-500/20"
                    />

                    {/* Quick Amount Suggestion Chips */}
                    <div className="flex flex-wrap gap-1 mt-1.5 items-center">
                      <span className="text-[10px] text-slate-400 font-medium mr-0.5">Gợi ý:</span>
                      {[1000000, 1200000, 1500000, 1800000, 2000000, 2500000, 3000000].map(amount => (
                        <button
                          key={amount}
                          type="button"
                          onClick={() => setEditingSetting({ ...editingSetting, tuitionFee: amount })}
                          className={`px-2 py-0.5 rounded-md text-[10px] font-bold transition-all ${
                            editingSetting.tuitionFee === amount
                              ? 'bg-indigo-600 text-white shadow-3xs'
                              : 'bg-white text-slate-600 hover:bg-indigo-50 hover:text-indigo-700 border border-slate-200'
                          }`}
                        >
                          {amount.toLocaleString('vi-VN')}đ
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Bank Name */}
                  <div>
                    <label className="text-[11px] font-bold text-slate-700 block mb-1">Ngân hàng (Mã VietQR):</label>
                    <input
                      type="text"
                      value={editingSetting.qrBankId || 'MBBank'}
                      onChange={e => setEditingSetting({ ...editingSetting, qrBankId: e.target.value })}
                      placeholder="VD: MBBank, VCB, VPBank, Techcombank, TPBank..."
                      className="w-full px-3.5 py-2 bg-white border border-slate-200 rounded-xl text-xs font-bold outline-none focus:ring-2 focus:ring-indigo-500/20"
                    />
                  </div>

                  {/* Account Number */}
                  <div>
                    <label className="text-[11px] font-bold text-slate-700 block mb-1">Số tài khoản thụ hưởng:</label>
                    <input
                      type="text"
                      value={editingSetting.qrAccountNumber || ''}
                      onChange={e => setEditingSetting({ ...editingSetting, qrAccountNumber: e.target.value.replace(/\s+/g, '') })}
                      placeholder="0901234567"
                      className="w-full px-3.5 py-2 bg-white border border-slate-200 rounded-xl text-xs font-mono font-bold outline-none focus:ring-2 focus:ring-indigo-500/20"
                    />
                  </div>

                  {/* Account Holder */}
                  <div>
                    <label className="text-[11px] font-bold text-slate-700 block mb-1">Chủ tài khoản (Viết hoa không dấu):</label>
                    <input
                      type="text"
                      value={editingSetting.qrAccountName || ''}
                      onChange={e => setEditingSetting({ ...editingSetting, qrAccountName: e.target.value.toUpperCase() })}
                      placeholder="NGUYEN VAN A"
                      className="w-full px-3.5 py-2 bg-white border border-slate-200 rounded-xl text-xs font-bold uppercase outline-none focus:ring-2 focus:ring-indigo-500/20"
                    />
                  </div>

                  {/* Custom Transfer Content Template */}
                  <div className="md:col-span-2 space-y-2 bg-white p-3.5 rounded-2xl border border-slate-200">
                    <div className="flex justify-between items-center">
                      <label className="text-[11px] font-bold text-slate-700 block">
                        Cú pháp nội dung chuyển khoản VietQR (Tùy chỉnh):
                      </label>
                      <span className="text-[10px] text-indigo-600 font-bold bg-indigo-50 px-2 py-0.5 rounded-md border border-indigo-100">
                        Tự động sinh theo từng học sinh
                      </span>
                    </div>

                    <input
                      type="text"
                      value={editingSetting.transferContentTemplate || ''}
                      onChange={e => setEditingSetting({ ...editingSetting, transferContentTemplate: e.target.value })}
                      placeholder="Mặc định: Hoc phi {studentName} lop {className}"
                      className="w-full px-3.5 py-2 bg-slate-50/50 border border-slate-200 rounded-xl text-xs font-mono font-bold outline-none focus:ring-2 focus:ring-indigo-500/20 focus:bg-white"
                    />

                    {/* Quick Insert Tokens */}
                    <div className="space-y-1.5 pt-1">
                      <div className="flex flex-wrap items-center gap-1.5">
                        <span className="text-[10px] font-bold text-slate-500">Chèn nhanh biến số:</span>
                        {[
                          { token: '{studentName}', label: 'Tên Học Sinh' },
                          { token: '{className}', label: 'Tên Lớp' },
                          { token: '{studentPhone}', label: 'SĐT' },
                          { token: '{studentCode}', label: 'Mã HS' },
                          { token: '{month}', label: 'Tháng' },
                        ].map(item => (
                          <button
                            key={item.token}
                            type="button"
                            onClick={() => {
                              const current = editingSetting.transferContentTemplate || '';
                              setEditingSetting({
                                ...editingSetting,
                                transferContentTemplate: current ? `${current}_${item.token}` : item.token
                              });
                            }}
                            className="px-2 py-0.5 bg-slate-100 hover:bg-indigo-50 hover:text-indigo-700 hover:border-indigo-200 border border-slate-200 rounded-md text-[10px] font-bold text-slate-600 cursor-pointer transition-all active:scale-95"
                            title={`Bấm để chèn ${item.label}`}
                          >
                            + {item.token} ({item.label})
                          </button>
                        ))}
                      </div>

                      {/* Live Demo Preview */}
                      <div className="p-2 bg-slate-50 rounded-xl border border-slate-200/80 flex items-center gap-2 text-[11px]">
                        <span className="text-slate-500 font-bold shrink-0">Nội dung thực tế khi học sinh quét QR:</span>
                        <code className="text-indigo-700 font-mono font-black truncate bg-white px-2 py-0.5 rounded border border-indigo-100">
                          {generateTransferContent(
                            editingSetting.transferContentTemplate,
                            { name: 'Nguyen Minh Ngoc', phoneStudent: '0901234567', connectionCode: 'HS01' },
                            editingSetting.className || '12 Tin'
                          )}
                        </code>
                      </div>
                    </div>
                  </div>

                  {/* QR Image Upload */}
                  <div className="md:col-span-2 space-y-2 bg-white p-3.5 rounded-2xl border border-slate-200">
                    <label className="text-[11px] font-bold text-slate-700 block">Ảnh Mã QR Tùy chỉnh (Tùy chọn):</label>
                    <div className="flex flex-col sm:flex-row items-center gap-3">
                      {editingSetting.qrImageUrl ? (
                        <div className="relative w-24 h-24 bg-slate-100 rounded-xl border border-slate-200 overflow-hidden flex items-center justify-center shrink-0">
                          <img src={editingSetting.qrImageUrl} alt="QR" className="w-full h-full object-contain" />
                          <button
                            type="button"
                            onClick={() => setEditingSetting({ ...editingSetting, qrImageUrl: '' })}
                            className="absolute top-1 right-1 p-1 bg-red-600 text-white rounded-md shadow-xs hover:bg-red-700"
                            title="Xóa ảnh QR"
                          >
                            <Trash2 className="w-3 h-3" />
                          </button>
                        </div>
                      ) : (
                        <div className="w-24 h-24 bg-slate-50 border border-dashed border-slate-300 rounded-xl flex items-center justify-center text-slate-400 shrink-0">
                          <ImageIcon className="w-6 h-6" />
                        </div>
                      )}

                      <div className="flex-1 w-full space-y-2">
                        <label className="inline-flex items-center gap-2 px-3.5 py-2 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 rounded-xl text-xs font-bold cursor-pointer transition-colors border border-indigo-200/50">
                          <ImageIcon className="w-4 h-4" />
                          <span>Tải ảnh QR từ thiết bị...</span>
                          <input
                            type="file"
                            accept="image/*"
                            className="hidden"
                            onChange={e => {
                              const file = e.target.files?.[0];
                              if (file) {
                                const reader = new FileReader();
                                reader.onloadend = () => {
                                  setEditingSetting(prev => prev ? { ...prev, qrImageUrl: reader.result as string } : null);
                                };
                                reader.readAsDataURL(file);
                              }
                            }}
                          />
                        </label>
                        <p className="text-[10px] text-slate-400 font-medium">
                          Nếu để trống, hệ thống sẽ tự động sinh mã VietQR động theo STK & Ngân hàng ở trên.
                        </p>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="flex justify-end gap-2 pt-3 border-t border-slate-200">
                  <button
                    type="button"
                    onClick={() => setEditingSetting(null)}
                    className="px-4 py-2 text-slate-600 hover:bg-slate-200 rounded-xl text-xs font-bold"
                  >
                    Đóng
                  </button>
                  <button
                    type="button"
                    onClick={async () => {
                      const classNameTrimmed = (editingSetting.className || '').trim();
                      if (!classNameTrimmed) {
                        alert('Vui lòng điền tên lớp học');
                        return;
                      }
                      const targetId = editingSetting.id || `setting_${Date.now()}`;
                      const updatedSetting: TuitionSetting = {
                        id: targetId,
                        className: classNameTrimmed,
                        limitHours: Number(editingSetting.limitHours) || 20,
                        tuitionFee: Number(editingSetting.tuitionFee) || 1500000,
                        qrBankId: editingSetting.qrBankId || 'MBBank',
                        qrAccountNumber: editingSetting.qrAccountNumber || '',
                        qrAccountName: (editingSetting.qrAccountName || '').toUpperCase(),
                        qrImageUrl: editingSetting.qrImageUrl || '',
                        transferContentTemplate: editingSetting.transferContentTemplate?.trim() || ''
                      };

                      const nextList = [...tuitionSettings.filter(s => s.id !== targetId), updatedSetting];
                      onUpdateSettings(nextList);
                      try {
                        localStorage.setItem('educonnect_tuition_settings', JSON.stringify(nextList));
                        await setDoc(doc(db, 'tuition_settings', targetId), updatedSetting, { merge: true });
                      } catch (e) {
                        console.warn(e);
                      }

                      setEditingSetting(null);
                      setNotification({ message: `Đã lưu cấu hình học phí cho lớp ${updatedSetting.className}!`, type: 'success' });
                      setTimeout(() => setNotification(null), 3000);
                    }}
                    className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold shadow-2xs"
                  >
                    Lưu cấu hình
                  </button>
                </div>
              </div>
            )}

            {/* Config List */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {tuitionSettings.length === 0 ? (
                <div className="col-span-2 text-center p-12 bg-slate-50 border border-dashed border-slate-200 rounded-2xl text-slate-400 font-semibold text-xs">
                  Chưa có cấu hình học phí nào. Nhấp vào nút "Thêm cấu hình lớp mới" để bắt đầu.
                </div>
              ) : (
                tuitionSettings.map(setting => (
                  <div key={setting.id} className="bg-slate-50 p-4 rounded-2xl border border-slate-200 flex flex-col justify-between gap-3 shadow-3xs hover:border-slate-300 transition-all">
                    <div className="flex justify-between items-start gap-2">
                      <div>
                        <span className="px-2.5 py-0.5 bg-indigo-50 text-indigo-700 text-[10px] font-extrabold rounded-full border border-indigo-200">
                          Lớp {setting.className}
                        </span>
                        <div className="text-sm font-extrabold text-slate-900 mt-1.5">
                          {setting.tuitionFee.toLocaleString('vi-VN')} VNĐ / {setting.limitHours} giờ
                        </div>
                      </div>

                      <div className="flex items-center gap-1.5">
                        {/* Demo Button for Teachers (Image 3) */}
                        <button
                          type="button"
                          onClick={() => setPreviewingDemoSetting(setting)}
                          className="px-2.5 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 rounded-xl text-xs font-bold transition-all flex items-center gap-1 shadow-3xs active:scale-95"
                          title="Xem thử giao diện học sinh & mã VietQR trước khi gửi đến học sinh"
                        >
                          <Eye className="w-3.5 h-3.5 text-indigo-600" />
                          <span>Xem thử Demo</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => {
                            setEditingSetting(setting);
                            setIsCustomClassName(!teacherManagedClasses.includes(setting.className));
                          }}
                          className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-200 rounded-lg transition-colors"
                          title="Chỉnh sửa"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeleteSetting(setting)}
                          className="p-1.5 text-rose-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                          title="Xóa cấu hình"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>

                    <div className="bg-white p-3 rounded-xl border border-slate-200/70 text-xs text-slate-600 font-semibold space-y-1">
                      <div>Ngân hàng: <span className="text-slate-800 font-bold">{setting.qrBankId}</span></div>
                      <div>STK: <span className="text-slate-800 font-bold font-mono">{setting.qrAccountNumber}</span></div>
                      <div>Chủ thẻ: <span className="text-slate-800 font-bold">{setting.qrAccountName}</span></div>
                      {setting.transferContentTemplate && (
                        <div className="text-[11px] text-slate-500 pt-1 border-t border-slate-100 mt-1">
                          Cú pháp: <code className="text-indigo-700 font-mono font-bold">{setting.transferContentTemplate}</code>
                        </div>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: SUBMITTED RECEIPTS */}
      {activeTab === 'receipts' && (
        <div className="space-y-6">
          <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-3xs space-y-4">
            <h3 className="font-extrabold text-slate-900 text-sm">
              Danh sách {tuitionReceipts.length} Biên lai học phí đã nộp
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {tuitionReceipts.length === 0 ? (
                <div className="col-span-2 text-center p-12 bg-slate-50 border border-dashed border-slate-200 rounded-3xl text-slate-400 text-xs font-semibold">
                  Chưa có học sinh nào nộp biên lai học phí.
                </div>
              ) : (
                tuitionReceipts.map(receipt => (
                  <div key={receipt.id} className="bg-slate-50 p-4 rounded-2xl border border-slate-200 shadow-3xs flex gap-4 items-start justify-between">
                    <div className="flex gap-3 items-start flex-1 min-w-0">
                      {receipt.screenshotUrl ? (
                        <div
                          onClick={() => onViewImageLightbox(receipt.screenshotUrl)}
                          className="w-16 h-20 bg-white rounded-xl border border-slate-200 cursor-pointer overflow-hidden hover:opacity-80 transition-all flex items-center justify-center shrink-0 shadow-3xs relative group"
                        >
                          <img src={receipt.screenshotUrl} alt="Biên lai" className="w-full h-full object-cover" />
                          <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white">
                            <Search className="w-4 h-4" />
                          </div>
                        </div>
                      ) : (
                        <div className="w-16 h-20 bg-white rounded-xl border border-slate-200 flex items-center justify-center text-slate-400 shrink-0">
                          <ImageIcon className="w-5 h-5" />
                        </div>
                      )}

                      <div className="flex-1 min-w-0 space-y-1">
                        <div className="text-xs font-extrabold text-slate-800 truncate">{receipt.studentName}</div>
                        <div className="text-[10px] font-bold text-slate-400">Lớp: <span className="text-slate-700">{receipt.className}</span></div>
                        <div className="text-xs font-black text-indigo-600">{receipt.amount.toLocaleString('vi-VN')} VNĐ</div>
                        <div className="text-[9px] text-slate-400 font-bold">Số giờ học: <span className="text-slate-700">{receipt.hoursAtPayment?.toFixed(1) || 'N/A'} giờ</span></div>
                        <div className="text-[9px] text-slate-400 font-bold">Nộp lúc: <span className="text-slate-700">{format(new Date(receipt.paidAt), 'HH:mm dd/MM/yyyy')}</span></div>
                      </div>
                    </div>

                    <div className="text-right flex flex-col gap-2 shrink-0">
                      <span className="text-[10px] font-extrabold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full flex items-center gap-0.5 shadow-2xs">
                        <Check className="w-3 h-3 stroke-[3px]" />
                        Đã mộc
                      </span>
                      <button
                        type="button"
                        onClick={() => handleDeleteReceipt(receipt)}
                        className="text-[10px] font-bold text-rose-500 hover:text-rose-700 hover:underline inline-flex items-center gap-1 self-end mt-2"
                      >
                        <Trash2 className="w-3 h-3" />
                        Xóa
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* Reusable non-blocking Confirmation Modal */}
      <ConfirmModal
        isOpen={confirmModalConfig.isOpen}
        onClose={() => setConfirmModalConfig(prev => ({ ...prev, isOpen: false }))}
        onConfirm={async () => {
          await confirmModalConfig.onConfirm();
          setConfirmModalConfig(prev => ({ ...prev, isOpen: false }));
        }}
        title={confirmModalConfig.title}
        message={confirmModalConfig.message}
        variant={confirmModalConfig.variant}
      />

      {/* Class Live Tuition & VietQR Preview Modal for Teacher */}
      {previewingDemoSetting && (
        <ClassTuitionPreviewModal
          isOpen={!!previewingDemoSetting}
          onClose={() => setPreviewingDemoSetting(null)}
          setting={previewingDemoSetting}
          studentsInClass={students.filter(s => isClassMatching(s.className, previewingDemoSetting.className))}
          allStudents={students}
        />
      )}
    </div>
  );
}
