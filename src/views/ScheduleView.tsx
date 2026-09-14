import React, { useState, useRef } from 'react';
import { ClassSession, User, TuitionSetting, TuitionReceipt } from '../types';
import * as XLSX from 'xlsx';
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
  isSameMonth,
  subDays,
  startOfQuarter,
  endOfQuarter
} from 'date-fns';
import { vi } from 'date-fns/locale';
import { Video, Calendar as CalendarIcon, Clock, Bell, Plus, Edit2, X, Check, Copy, Share2, CheckCircle, FileText, Users, Undo, Trash2, BarChart3, ArrowRight, FileSpreadsheet, Download, AlertCircle, Search, ChevronDown, Award, Sparkles, Filter, Image as ImageIcon } from 'lucide-react';
import { DateTimePicker24h } from '../components/DateTimePicker24h';
import { ConfirmModal } from '../components/ConfirmModal';
import { ScheduleAnalyticsReport } from '../components/ScheduleAnalyticsReport';
import { TuitionPaymentDemoModal } from '../components/TuitionPaymentDemoModal';
import { TeacherTuitionManager } from '../components/TeacherTuitionManager';
import { CustomSelect } from '../components/CustomSelect';
import { calculateStudentTuitionStatus, StudentTuitionStatus, generateTransferContent } from '../utils/tuitionUtils';
import { filterValidSessions } from '../utils/classFilter';
import { db, handleFirestoreError, OperationType } from '../firebase';
import { collection, doc, onSnapshot, setDoc, updateDoc, deleteDoc } from 'firebase/firestore';

interface ScheduleProps {
  user: User;
  classes: ClassSession[];
  allUsers?: User[];
  onAddClass?: (session: ClassSession) => void;
  onUpdateClass?: (session: ClassSession) => void;
  onDeleteClass?: (classId: string) => void;
}

export function ScheduleView({ user, classes: initialClasses, allUsers = [], onAddClass, onUpdateClass, onDeleteClass }: ScheduleProps) {
  const isTeacher = user.role === 'teacher' || user.role === 'admin';
  const isAdmin = user.role === 'admin';

  const isClassMatching = (assignClass: string | undefined | null, userClass: string | undefined | null): boolean => {
        if (!assignClass || assignClass.trim() === '') return true;
    const cleanAssign = assignClass.trim().toLowerCase();
    if (
      cleanAssign === 'all' || 
      cleanAssign === 'tất cả' || 
      cleanAssign === 'tat ca' || 
      cleanAssign === 'toàn hệ thống' || 
      cleanAssign === 'toan he thong' ||
      cleanAssign === 'tất cả các lớp (toàn trường)' ||
      cleanAssign === 'tat ca cac lop (toan truong)'
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

  // Filter sessions: Teacher only manages their created sessions, Admin sees all, Student sees their class sessions
  // Filter out any ghost/dummy/non-existent classes
  const filteredInitialClasses = React.useMemo(() => {
    const validSessions = filterValidSessions(initialClasses, allUsers);
    if (isAdmin) return validSessions;
    if (user.role === 'teacher') {
      return validSessions.filter(c => c.teacherId === user.id || c.teacherName === user.name);
    }
    // Student: filter classes matching their class name
    return validSessions.filter(c => isClassMatching(c.className || c.title, user.className));
  }, [initialClasses, user, isAdmin, allUsers]);

  const [sessions, setSessions] = useState<ClassSession[]>(filteredInitialClasses);
  const upcomingSessions = React.useMemo(() => sessions.filter(s => !s.isCompleted), [sessions]);
  const [selectedSessionIds, setSelectedSessionIds] = useState<Set<string>>(new Set());
  const [scheduleTab, setScheduleTab] = useState<'upcoming' | 'completed' | 'report' | 'tuition'>('upcoming');
  const [showTuitionDemoModal, setShowTuitionDemoModal] = useState(false);

  // Notification Toast State
  const [notification, setNotification] = useState<{ message: string; type: 'success' | 'error' | 'info' } | null>(null);

  // Auto scroll to top when switching schedule tabs
  React.useEffect(() => {
    setSelectedSessionIds(new Set());
    window.scrollTo({ top: 0, behavior: 'smooth' });
    document.documentElement.scrollTop = 0;
    document.body.scrollTop = 0;
  }, [scheduleTab]);

  React.useEffect(() => {
    setSessions(filteredInitialClasses);
  }, [filteredInitialClasses]);

  // Complete session modal state
  const [completingSession, setCompletingSession] = useState<ClassSession | null>(null);
  const [showCompleteModal, setShowCompleteModal] = useState(false);
  const [completedNoteInput, setCompletedNoteInput] = useState('');

  // View details and attendance modal state
  const [viewingSessionDetails, setViewingSessionDetails] = useState<ClassSession | null>(null);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [editingCompletedNote, setEditingCompletedNote] = useState(false);
  const [editCompletedNoteInput, setEditCompletedNoteInput] = useState('');
  const [modalAttendedStudents, setModalAttendedStudents] = useState<{ studentId: string; studentName: string; clickedAt: string }[]>([]);
  const [attendanceSearchQuery, setAttendanceSearchQuery] = useState('');
  const [isSavingAttendance, setIsSavingAttendance] = useState(false);

  React.useEffect(() => {
    if (viewingSessionDetails) {
      setModalAttendedStudents(viewingSessionDetails.attendedByStudents || []);
      setAttendanceSearchQuery('');
    } else {
      setModalAttendedStudents([]);
      setAttendanceSearchQuery('');
    }
  }, [viewingSessionDetails]);

  // Modal State for Teacher (Create or Edit session)
  const [showModal, setShowModal] = useState(false);
  const [editingSession, setEditingSession] = useState<ClassSession | null>(null);

  // Deletion confirmation state
  const [sessionToDelete, setSessionToDelete] = useState<ClassSession | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [isDeletingSession, setIsDeletingSession] = useState(false);
  
  const [showBulkDeleteConfirm, setShowBulkDeleteConfirm] = useState(false);
  const [isBulkDeleting, setIsBulkDeleting] = useState(false);

  const handleDeleteClick = (session: ClassSession) => {
    setSessionToDelete(session);
    setShowDeleteConfirm(true);
  };

  const handleConfirmDelete = async () => {
    if (!sessionToDelete || !onDeleteClass) return;
    setIsDeletingSession(true);
    try {
      await onDeleteClass(sessionToDelete.id);
      setShowDeleteConfirm(false);
      setSessionToDelete(null);
    } catch (error) {
      console.error('Error deleting session:', error);
    } finally {
      setIsDeletingSession(false);
    }
  };

  const handleBulkDeleteClick = () => {
    setShowBulkDeleteConfirm(true);
  };

  const handleConfirmBulkDelete = async () => {
    if (!onDeleteClass || selectedSessionIds.size === 0) return;
    setIsBulkDeleting(true);
    try {
      // Create an array of promises for deletion
      const deletePromises = Array.from(selectedSessionIds).map(id => onDeleteClass(id));
      await Promise.all(deletePromises);
      
      setSelectedSessionIds(new Set());
      setShowBulkDeleteConfirm(false);
      setNotification({ message: `Đã xóa thành công ${deletePromises.length} lịch học!`, type: 'success' });
      setTimeout(() => setNotification(null), 4000);
    } catch (error) {
      console.error('Error deleting sessions:', error);
      setNotification({ message: 'Đã xảy ra lỗi khi xóa lịch học.', type: 'error' });
      setTimeout(() => setNotification(null), 4000);
    } finally {
      setIsBulkDeleting(false);
    }
  };

  const handleToggleSelectSession = (id: string) => {
    const newSet = new Set(selectedSessionIds);
    if (newSet.has(id)) {
      newSet.delete(id);
    } else {
      newSet.add(id);
    }
    setSelectedSessionIds(newSet);
  };

  const handleSelectAllUpcoming = (upcomingSessions: ClassSession[]) => {
    if (selectedSessionIds.size === upcomingSessions.length) {
      setSelectedSessionIds(new Set());
    } else {
      setSelectedSessionIds(new Set(upcomingSessions.map(s => s.id)));
    }
  };

  // Form state
  const [title, setTitle] = useState('');
  const [subject, setSubject] = useState('Toán Học');
  const [startTime, setStartTime] = useState('');
  const [endTime, setEndTime] = useState('');
  const [link, setLink] = useState('');
  const [isOnline, setIsOnline] = useState(true);
  const [note, setNote] = useState('');
  const [formIsCompleted, setFormIsCompleted] = useState(false);
  const [formCompletedNote, setFormCompletedNote] = useState('');

  // Monthly stats filtering state
  const [timeMode, setTimeMode] = useState<'month' | 'custom_range'>('month');
  const [statsMonth, setStatsMonth] = useState<number>(new Date().getMonth() + 1); // 1-12
  const [statsYear, setStatsYear] = useState<number>(new Date().getFullYear());
  const [startDateStr, setStartDateStr] = useState<string>(format(startOfMonth(new Date()), 'yyyy-MM-dd'));
  const [endDateStr, setEndDateStr] = useState<string>(format(endOfMonth(new Date()), 'yyyy-MM-dd'));
  const [statsClass, setStatsClass] = useState<string>('all');
  const [statsSubject, setStatsSubject] = useState<string>('all');

  // Quick Preset Handlers for Custom Range in Schedule Tab
  const handleApplySchedulePreset = (preset: 'today' | 'last7' | 'last30' | 'this_month' | 'last_month' | 'this_quarter' | 'all_time') => {
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

  // Tuition settings & receipts state with immediate local persistence
  const [tuitionSettings, setTuitionSettings] = useState<TuitionSetting[]>(() => {
    try {
      const saved = localStorage.getItem('educonnect_tuition_settings');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });
  const [tuitionReceipts, setTuitionReceipts] = useState<TuitionReceipt[]>(() => {
    try {
      const saved = localStorage.getItem('educonnect_tuition_receipts');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });
  const [showTuitionManager, setShowTuitionManager] = useState(false);
  const [tuitionManagerTab, setTuitionManagerTab] = useState<'settings' | 'receipts'>('settings');
  const [editingTuitionSetting, setEditingTuitionSetting] = useState<Partial<TuitionSetting> | null>(null);
  const [receiptLightboxUrl, setReceiptLightboxUrl] = useState<string | null>(null);
  const [isUploadingTuition, setIsUploadingTuition] = useState(false);
  const [tuitionUploadSuccess, setTuitionUploadSuccess] = useState(false);

  const handleTuitionScreenshotUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploadingTuition(true);
    setTuitionUploadSuccess(false);

    try {
      const reader = new FileReader();
      reader.onloadend = async () => {
        const base64String = reader.result as string;
        const receiptId = `receipt_${Date.now()}`;
        
        const newReceipt: TuitionReceipt = {
          id: receiptId,
          studentId: user.id,
          studentName: user.name,
          className: user.className || '',
          amount: studentTuitionSetting?.tuitionFee || 1500000,
          hoursAtPayment: studentHours,
          screenshotUrl: base64String,
          paidAt: new Date().toISOString(),
          status: 'approved'
        };

        // Update local receipts immediately
        setTuitionReceipts(prev => {
          const next = [newReceipt, ...prev];
          try {
            localStorage.setItem('educonnect_tuition_receipts', JSON.stringify(next));
          } catch (e) {
            console.error('LocalStorage write error:', e);
          }
          return next;
        });

        const limit = studentTuitionStatus?.limitHours || 20;
        const excess = Math.max(0, studentHours - limit);

        setIsUploadingTuition(false);
        setTuitionUploadSuccess(true);
        setNotification({ 
          message: excess > 0 
            ? `Thanh toán học phí thành công! Đã chốt đợt học ${limit}h. Tháng mới của em đã bắt đầu với ${excess.toFixed(1)}h tích lũy.` 
            : `Thanh toán học phí thành công! Đã chốt đợt học ${limit}h.`, 
          type: 'success' 
        });
        setTimeout(() => setNotification(null), 5000);

        try {
          // Save to tuition_receipts in Firestore
          await setDoc(doc(db, 'tuition_receipts', receiptId), newReceipt);
        } catch (error) {
          console.warn("Firestore save receipt warning:", error);
        }

        try {
          // Update user profile tuitionResetAt to reset hours
          await updateDoc(doc(db, 'users', user.id), {
            tuitionResetAt: new Date().toISOString()
          });
        } catch (error) {
          console.warn("Firestore update user tuitionResetAt warning:", error);
        }

        try {
          // Log this activity
          const logId = `log_${Date.now()}`;
          await setDoc(doc(db, 'activity_logs', logId), {
            id: logId,
            userId: user.id,
            userName: user.name,
            userRole: user.role,
            category: 'profile',
            actionType: 'tuition_payment',
            title: 'Thanh toán học phí thành công',
            description: `Học sinh ${user.name} đã thanh toán học phí đợt học ${studentHours.toFixed(1)} giờ lớp ${user.className || ''}`,
            timestamp: new Date().toISOString()
          });
        } catch (error) {
          console.error("Error logging tuition payment:", error);
        }
      };
      reader.readAsDataURL(file);
    } catch (error) {
      console.error('Error uploading tuition screenshot:', error);
      setIsUploadingTuition(false);
      setNotification({ message: 'Đã xảy ra lỗi khi tải lên biên lai giao dịch.', type: 'error' });
      setTimeout(() => setNotification(null), 4000);
    }
  };

  React.useEffect(() => {
    // Realtime load tuition settings
    const qSettings = collection(db, 'tuition_settings');
    const unsubSettings = onSnapshot(qSettings, (snapshot) => {
      const items: TuitionSetting[] = [];
      snapshot.forEach(doc => {
        items.push({ id: doc.id, ...doc.data() } as TuitionSetting);
      });
      if (items.length > 0) {
        setTuitionSettings(items);
        try {
          localStorage.setItem('educonnect_tuition_settings', JSON.stringify(items));
        } catch (e) {
          console.error(e);
        }
      }
    }, (error) => {
      console.warn('Realtime tuition_settings notice (using local storage):', error);
    });

    // Realtime load tuition receipts
    const qReceipts = collection(db, 'tuition_receipts');
    const unsubReceipts = onSnapshot(qReceipts, (snapshot) => {
      const items: TuitionReceipt[] = [];
      snapshot.forEach(doc => {
        items.push({ id: doc.id, ...doc.data() } as TuitionReceipt);
      });
      if (items.length > 0) {
        setTuitionReceipts(items);
        try {
          localStorage.setItem('educonnect_tuition_receipts', JSON.stringify(items));
        } catch (e) {
          console.error(e);
        }
      }
    }, (error) => {
      console.warn('Realtime tuition_receipts notice (using local storage):', error);
    });

    return () => {
      unsubSettings();
      unsubReceipts();
    };
  }, []);

  // Calculate Student Tuition Status using centralized tuition logic
  const studentTuitionStatus = React.useMemo(() => {
    if (user.role !== 'student') return null;
    return calculateStudentTuitionStatus(
      user,
      sessions,
      tuitionSettings,
      tuitionReceipts
    );
  }, [user, sessions, tuitionSettings, tuitionReceipts]);

  // Student Accumulated Hours for current cycle (accounts for rollover & excess hours)
  const studentHours = studentTuitionStatus?.currentCycleHours || 0;

  // Student Class Tuition Settings
  const studentTuitionSetting = studentTuitionStatus?.setting || null;

  // Top-level displayedSessions for current active tab (Filtered by Class, Subject, Month, Year for BOTH tabs)
  const displayedSessions = React.useMemo(() => {
    const filtered = sessions.filter(s => {
      // 1. Completed status matching
      if (scheduleTab === 'upcoming') {
        if (s.isCompleted) return false;
      } else if (scheduleTab === 'completed') {
        if (!s.isCompleted) return false;
      }

      // 2. Class match
      if (statsClass !== 'all') {
        if (!isClassMatching(s.className || s.title, statsClass)) return false;
      }

      // 3. Subject match
      if (statsSubject !== 'all') {
        if (s.subject !== statsSubject) return false;
      }

      // 4. Time matching (Month/Year or Custom Range)
      const sessionDate = new Date(s.startTime);
      if (timeMode === 'month') {
        if ((sessionDate.getMonth() + 1) !== statsMonth || sessionDate.getFullYear() !== statsYear) return false;
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

      return true;
    });

    // Sắp xếp "từ xa đến gần nhất" (Từ trái sang phải, từ trên xuống dưới)
    // - Với lịch học sắp tới (upcoming): Ngày xa hơn ở tương lai đứng trước, ngày gần hôm nay đứng sau -> Thứ tự GIẢM DẦN (descending) theo thời gian.
    // - Với nhật ký buổi học đã qua (completed): Ngày xa hơn ở quá khứ đứng trước, ngày gần hôm nay nhất đứng sau -> Thứ tự TĂNG DẦN (ascending) theo thời gian.
    return filtered.sort((a, b) => {
      const timeA = new Date(a.startTime).getTime();
      const timeB = new Date(b.startTime).getTime();
      if (scheduleTab === 'upcoming') {
        return timeB - timeA; // xa ở tương lai lên trước
      } else {
        return timeA - timeB; // xa ở quá khứ lên trước
      }
    });
  }, [sessions, scheduleTab, statsClass, statsSubject, timeMode, statsMonth, statsYear, startDateStr, endDateStr]);

  // Bulk sync state
  const [bulkIsOnline, setBulkIsOnline] = useState<'keep' | 'online' | 'offline'>('keep');
  const [bulkIsCompleted, setBulkIsCompleted] = useState<'keep' | 'completed' | 'upcoming'>('keep');
  const [bulkClass, setBulkClass] = useState<string>('keep');
  const [bulkClassInput, setBulkClassInput] = useState('');
  const [bulkSubject, setBulkSubject] = useState<string>('keep');
  const [bulkSubjectInput, setBulkSubjectInput] = useState('');
  const [bulkAttendanceMode, setBulkAttendanceMode] = useState<'keep' | 'replace' | 'add' | 'clear'>('keep');
  const [bulkAttendedStudentIds, setBulkAttendedStudentIds] = useState<Set<string>>(new Set());
  const [bulkAttendanceSearch, setBulkAttendanceSearch] = useState('');
  const [isBulkUpdating, setIsBulkUpdating] = useState(false);

  const selectedClasses = React.useMemo(() => {
    const list = sessions.filter(s => selectedSessionIds.has(s.id));
    const classes = list.map(s => (s.className || '').trim()).filter(Boolean);
    return Array.from(new Set(classes));
  }, [sessions, selectedSessionIds]);

  const bulkAttendanceEligibleStudents = React.useMemo(() => {
    const students = allUsers.filter(u => u.role === 'student');
    if (selectedClasses.length === 0) return students;
    return students.filter(student => 
      selectedClasses.some(cls => isClassMatching(cls, student.className))
    );
  }, [allUsers, selectedClasses]);

  const allUniqueClasses = React.useMemo(() => {
    const set = new Set<string>();
    sessions.forEach(s => {
      if (s.className && s.className.trim()) set.add(s.className.trim());
    });
    return Array.from(set).sort();
  }, [sessions]);

  const teacherClasses = React.useMemo(() => {
    const set = new Set<string>();
    // Real sessions
    sessions.forEach(s => {
      if (s.className && s.className.trim()) set.add(s.className.trim());
    });
    // Real students
    allUsers.forEach(u => {
      if (u.role === 'student' && u.className && u.className.trim()) set.add(u.className.trim());
    });
    // Teacher's assigned class if any
    if (user.className && user.className.trim()) {
      set.add(user.className.trim());
    }
    // Existing real tuition configurations
    tuitionSettings.forEach(t => {
      if (t.className && t.className.trim()) set.add(t.className.trim());
    });
    return Array.from(set).filter(Boolean).sort();
  }, [sessions, allUsers, user.className, tuitionSettings]);

  const allUniqueSubjects = React.useMemo(() => {
    const set = new Set<string>();
    sessions.forEach(s => {
      if (s.subject && s.subject.trim()) set.add(s.subject.trim());
    });
    return Array.from(set).sort();
  }, [sessions]);

  React.useEffect(() => {
    setBulkIsOnline('keep');
    setBulkIsCompleted('keep');
    setBulkClass('keep');
    setBulkClassInput('');
    setBulkSubject('keep');
    setBulkSubjectInput('');
    setBulkAttendanceMode('keep');
    setBulkAttendedStudentIds(new Set());
    setBulkAttendanceSearch('');
  }, [scheduleTab, selectedSessionIds.size === 0]);

  const handleApplyBulkUpdate = async () => {
    if (!onUpdateClass || selectedSessionIds.size === 0) return;
    setIsBulkUpdating(true);
    try {
      const finalClass = bulkClass === 'custom' ? bulkClassInput.trim() : bulkClass;
      const finalSubject = bulkSubject === 'custom' ? bulkSubjectInput.trim() : bulkSubject;

      const updatePromises = Array.from(selectedSessionIds).map(async id => {
        const session = sessions.find(s => s.id === id);
        if (!session) return;

        const updated: ClassSession = { ...session };

        if (bulkIsOnline === 'online') {
          updated.isOnline = true;
        } else if (bulkIsOnline === 'offline') {
          updated.isOnline = false;
        }

        if (bulkIsCompleted === 'completed') {
          updated.isCompleted = true;
          if (!updated.completedNote) {
            updated.completedNote = 'Đã hoàn thành qua cập nhật hàng loạt';
          }
        } else if (bulkIsCompleted === 'upcoming') {
          updated.isCompleted = false;
          updated.completedNote = '';
        }

        if (bulkClass !== 'keep') {
          updated.className = finalClass;
        }

        if (bulkSubject !== 'keep') {
          updated.subject = finalSubject;
        }

        // Apply bulk attendance updates
        if (bulkAttendanceMode !== 'keep') {
          if (bulkAttendanceMode === 'clear') {
            updated.attendedByStudents = [];
          } else {
            const selectedStudentsInfo = bulkAttendanceEligibleStudents
              .filter(student => bulkAttendedStudentIds.has(student.id))
              .map(student => ({
                studentId: student.id,
                studentName: student.name || 'Học sinh',
                clickedAt: "" // No recorded timestamp as requested
              }));

            if (bulkAttendanceMode === 'replace') {
              updated.attendedByStudents = selectedStudentsInfo;
            } else if (bulkAttendanceMode === 'add') {
              const currentAttended = updated.attendedByStudents || [];
              const merged = [...currentAttended];
              selectedStudentsInfo.forEach(newStu => {
                if (!merged.some(m => m.studentId === newStu.studentId)) {
                  merged.push(newStu);
                }
              });
              updated.attendedByStudents = merged;
            }
          }
        }

        await onUpdateClass(updated);
      });

      await Promise.all(updatePromises);
      setSelectedSessionIds(new Set());
      setNotification({ message: `Đã cập nhật hàng loạt thành công ${updatePromises.length} buổi học!`, type: 'success' });
      setTimeout(() => setNotification(null), 4000);
    } catch (error) {
      console.error('Error batch updating sessions:', error);
      setNotification({ message: 'Đã xảy ra lỗi khi cập nhật hàng loạt.', type: 'error' });
      setTimeout(() => setNotification(null), 4000);
    } finally {
      setIsBulkUpdating(false);
    }
  };

  // Extract unique classes & subjects for monthly filter dropdowns
  const availableClassesForMonthly = React.useMemo(() => {
    const set = new Set<string>();
    sessions.forEach(s => {
      if (s.className && s.className.trim()) set.add(s.className.trim());
    });
    return Array.from(set).sort();
  }, [sessions]);

  const availableSubjectsForMonthly = React.useMemo(() => {
    const set = new Set<string>();
    sessions.forEach(s => {
      if (s.subject && s.subject.trim()) set.add(s.subject.trim());
    });
    return Array.from(set).sort();
  }, [sessions]);

  // Filter sessions that are completed and matching statsMonth, statsYear, statsClass, statsSubject
  const completedSessionsInMonth = React.useMemo(() => {
    return sessions.filter(s => {
      if (!s.isCompleted) return false;
      const date = new Date(s.startTime);
      if ((date.getMonth() + 1) !== statsMonth || date.getFullYear() !== statsYear) return false;
      if (statsClass !== 'all' && (s.className || '').trim() !== statsClass) return false;
      if (statsSubject !== 'all' && (s.subject || 'Toán Học').trim() !== statsSubject) return false;
      return true;
    });
  }, [sessions, statsMonth, statsYear, statsClass, statsSubject]);

  // Calculate unique teaching days (unique calendar dates)
  const uniqueTeachingDays = React.useMemo(() => {
    return Array.from(new Set(completedSessionsInMonth.map(s => {
      return format(new Date(s.startTime), 'yyyy-MM-dd');
    }))).length;
  }, [completedSessionsInMonth]);

  // Calculate total duration (hours)
  const totalTeachingHours = React.useMemo(() => {
    return completedSessionsInMonth.reduce((acc, s) => {
      const start = new Date(s.startTime).getTime();
      const end = new Date(s.endTime).getTime();
      const hours = (end - start) / (1000 * 60 * 60);
      return acc + (isNaN(hours) ? 0 : hours);
    }, 0);
  }, [completedSessionsInMonth]);

  const studentAttendedSessions = React.useMemo(() => {
    return completedSessionsInMonth.filter(s => 
      s.attendedByStudents?.some(sa => sa.studentId === user.id)
    );
  }, [completedSessionsInMonth, user.id]);

  const studentAttendanceRate = React.useMemo(() => {
    return completedSessionsInMonth.length > 0
      ? Math.round((studentAttendedSessions.length / completedSessionsInMonth.length) * 100)
      : 0;
  }, [completedSessionsInMonth, studentAttendedSessions]);

  // Notification Modal State
  const [notifyModal, setNotifyModal] = useState(false);
  const [notifyMsg, setNotifyMsg] = useState('');
  const [copied, setCopied] = useState(false);

  // Calendar Note state for Student / Teacher
  const [selectedDate, setSelectedDate] = useState<string>(format(new Date(), 'yyyy-MM-dd'));
  const [currentMonth, setCurrentMonth] = useState<Date>(new Date());
  const [userNotes, setUserNotes] = useState<Record<string, string>>({
    [format(new Date(), 'yyyy-MM-dd')]: 'Ôn tập công thức Toán & chuẩn bị vào phòng học đúng giờ.',
  });
  const [currentNote, setCurrentNote] = useState('');

  React.useEffect(() => {
    setCurrentNote(userNotes[selectedDate] || '');
  }, [selectedDate, userNotes]);

  // Aggregated table for centralized monthly notes
  const notesInMonth = React.useMemo(() => {
    const map = new Map<string, {
      date: string;
      sessions: ClassSession[];
      personalNote: string;
    }>();

    completedSessionsInMonth.forEach(s => {
      const d = format(new Date(s.startTime), 'yyyy-MM-dd');
      if (!map.has(d)) {
        map.set(d, { date: d, sessions: [], personalNote: '' });
      }
      map.get(d)!.sessions.push(s);
    });

    Object.keys(userNotes).forEach(dateStr => {
      const d = new Date(dateStr);
      if (d.getMonth() + 1 === statsMonth && d.getFullYear() === statsYear) {
        if (!map.has(dateStr)) {
          map.set(dateStr, { date: dateStr, sessions: [], personalNote: '' });
        }
        map.get(dateStr)!.personalNote = userNotes[dateStr];
      }
    });

    return Array.from(map.values())
      .filter(item => item.personalNote || item.sessions.some(s => s.completedNote))
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [completedSessionsInMonth, userNotes, statsMonth, statsYear]);

  // Excel Import Logic
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleDownloadTemplate = () => {
    const wsData = [
      ['Tên bài học', 'Môn học', 'Lớp', 'Ngày', 'Thời gian bắt đầu', 'Thời gian kết thúc', 'Link phòng học', 'Ghi chú'],
      ['Đại số 10 - Tiết 24: Ôn tập', 'Toán Học', '10A1', '24.10.2026', '19:00', '20:30', 'https://meet.google.com/xxx-xxxx-xxx', 'Yêu cầu làm bài tập trước khi lên lớp'],
      ['Vật lý 11 - Bài 5', 'Vật Lý', '11B2', '25.10.2026', '08:00', '09:30', '', 'Học offline tại trung tâm'],
    ];
    
    const ws = XLSX.utils.aoa_to_sheet(wsData);
    
    // Set column widths for better visibility
    ws['!cols'] = [
      { wch: 30 }, // Tên bài học
      { wch: 15 }, // Môn học
      { wch: 10 }, // Lớp
      { wch: 15 }, // Ngày
      { wch: 20 }, // Thời gian bắt đầu
      { wch: 20 }, // Thời gian kết thúc
      { wch: 35 }, // Link phòng học
      { wch: 40 }, // Ghi chú
    ];
    
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "LichHoc_Template");
    
    XLSX.writeFile(wb, "Mau_Nhap_Lich_Hoc.xlsx");
  };

  const handleExcelImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const bstr = evt.target?.result;
        const wb = XLSX.read(bstr, { type: 'binary' });
        const wsname = wb.SheetNames[0];
        const ws = wb.Sheets[wsname];
        // Ensure we parse dates as raw strings to handle formats like DD.MM.YYYY accurately without auto-converting
        const data = XLSX.utils.sheet_to_json(ws, { raw: false, dateNF: 'dd.mm.yyyy' });
        
        let importedCount = 0;
        const newSessions = [...sessions];

        data.forEach((row: any) => {
          if (!row.Title && !row['Tên bài học']) return;

          // Process title, subject, link, etc.
          const newTitle = row.Title || row['Tên bài học'] || 'Bài học mới';
          const newSubject = row.Subject || row['Môn học'] || 'Toán Học';
          const newClass = row.Class || row['Lớp'] || '';
          const newLink = row.Link || row['Link phòng học'] || '';
          const newNote = row.Note || row['Ghi chú'] || '';
          
          let parsedStart = new Date();
          let parsedEnd = new Date(parsedStart.getTime() + 90 * 60000); // 1.5 hours later

          const rawDate = row['Ngày'] || row.Date || '';
          const rawStartTime = row['Thời gian bắt đầu'] || row.StartTime || '';
          const rawEndTime = row['Thời gian kết thúc'] || row.EndTime || '';

          // Parse date strings like 24.10.2026, 24/10/2026, 24-10-2026
          let yyyy = '', mm = '', dd = '';
          if (typeof rawDate === 'string' && rawDate.length >= 8) {
            const parts = rawDate.split(/[./-]/);
            if (parts.length === 3) {
              if (parts[2].length === 4) {
                // DD.MM.YYYY
                dd = parts[0].padStart(2, '0');
                mm = parts[1].padStart(2, '0');
                yyyy = parts[2];
              } else if (parts[0].length === 4) {
                // YYYY-MM-DD
                yyyy = parts[0];
                mm = parts[1].padStart(2, '0');
                dd = parts[2].padStart(2, '0');
              } else if (parts[2].length === 2) {
                 // DD/MM/YY (assuming 20xx)
                 dd = parts[0].padStart(2, '0');
                 mm = parts[1].padStart(2, '0');
                 yyyy = '20' + parts[2];
              }
            }
          }

          if (yyyy && mm && dd) {
            // Extract HH:mm from rawStartTime
            const timeStartMatch = String(rawStartTime).match(/(\d{1,2}):(\d{2})/);
            if (timeStartMatch) {
              const hh = timeStartMatch[1].padStart(2, '0');
              const min = timeStartMatch[2];
              const isoStart = `${yyyy}-${mm}-${dd}T${hh}:${min}:00`;
              const d = new Date(isoStart);
              if (!isNaN(d.getTime())) parsedStart = d;
            }

            // Extract HH:mm from rawEndTime
            const timeEndMatch = String(rawEndTime).match(/(\d{1,2}):(\d{2})/);
            if (timeEndMatch) {
              const hh = timeEndMatch[1].padStart(2, '0');
              const min = timeEndMatch[2];
              const isoEnd = `${yyyy}-${mm}-${dd}T${hh}:${min}:00`;
              const d = new Date(isoEnd);
              if (!isNaN(d.getTime())) parsedEnd = d;
            } else {
              // Default end time to 1.5h after start if not provided
              parsedEnd = new Date(parsedStart.getTime() + 90 * 60000);
            }
          } else {
             // Fallback for older format if someone still uses one combined column
             const fallbackStart = new Date(rawStartTime || row.StartTime || '');
             if (!isNaN(fallbackStart.getTime())) {
               parsedStart = fallbackStart;
             }
             const fallbackEnd = new Date(rawEndTime || row.EndTime || '');
             if (!isNaN(fallbackEnd.getTime())) {
               parsedEnd = fallbackEnd;
             } else {
               parsedEnd = new Date(parsedStart.getTime() + 90 * 60000);
             }
          }

          // Find students matching this class and automatically tick them as attended
          const matchingStudents = allUsers.filter(u => u.role === 'student' && isClassMatching(newClass, u.className));
          const autoAttended = matchingStudents.map(student => ({
            studentId: student.id,
            studentName: student.name || 'Học sinh',
            clickedAt: parsedStart.toISOString()
          }));

          const newS: ClassSession = {
            id: `session_import_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
            title: newTitle,
            subject: newSubject,
            className: newClass,
            startTime: parsedStart.toISOString(),
            endTime: parsedEnd.toISOString(),
            link: newLink,
            isOnline: newLink && newLink.trim() ? true : false,
            note: newNote,
            teacherId: user.id,
            teacherName: user.name,
            isCompleted: true,
            completedNote: newNote,
            attendedByStudents: autoAttended
          };

          if (onAddClass) {
            onAddClass(newS);
          }
          newSessions.push(newS);
          importedCount++;
        });

        if (importedCount > 0) {
          setSessions(newSessions);
          setScheduleTab('completed');
          setNotification({ message: `Đã nhập thành công ${importedCount} buổi học từ file Excel vào Nhật ký dạy & học!`, type: 'success' });
          setTimeout(() => setNotification(null), 4000);
        } else {
          setNotification({ message: 'Không tìm thấy dữ liệu hợp lệ trong file Excel. Vui lòng kiểm tra lại định dạng cột.', type: 'error' });
          setTimeout(() => setNotification(null), 4000);
        }
      } catch (error) {
        console.error('Error importing Excel:', error);
        setNotification({ message: 'Đã xảy ra lỗi khi đọc file Excel.', type: 'error' });
        setTimeout(() => setNotification(null), 4000);
      }
      
      // Reset input so user can re-select the same file if needed
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    };
    reader.readAsBinaryString(file);
  };

  const handleOpenCreate = () => {
    setEditingSession(null);
    setTitle('');
    setSubject('Toán Học');
    setStartTime('');
    setEndTime('');
    setLink('');
    setIsOnline(true);
    setNote('');
    setFormIsCompleted(false);
    setFormCompletedNote('');
    setShowModal(true);
  };

  const handleOpenQuickLog = () => {
    setEditingSession(null);
    setTitle('Dạy Offline / Trợ giảng (Bổ trợ)');
    setSubject('Toán Học');
    setStartTime('');
    setEndTime('');
    setLink('');
    setIsOnline(false);
    setNote('');
    setFormIsCompleted(true);
    setFormCompletedNote('Đã hoàn thành buổi dạy offline/bổ trợ');
    setShowModal(true);
  };

  const handleOpenEdit = (session: ClassSession) => {
    setEditingSession(session);
    setTitle(session.title);
    setSubject(session.subject || 'Toán Học');
    setStartTime(session.startTime.slice(0, 16));
    setEndTime(session.endTime.slice(0, 16));
    setLink(session.link);
    setIsOnline(session.isOnline !== undefined ? session.isOnline : (session.link && session.link.trim() ? true : false));
    setNote(session.note || '');
    setFormIsCompleted(session.isCompleted || false);
    setFormCompletedNote(session.completedNote || '');
    setShowModal(true);
  };

  const handleSaveSession = (e: React.FormEvent) => {
    e.preventDefault();
    if (editingSession) {
      const updated: ClassSession = {
        ...editingSession,
        title,
        subject,
        startTime: startTime || editingSession.startTime,
        endTime: endTime || editingSession.endTime,
        isOnline,
        link: isOnline ? link : '',
        note,
        isCompleted: formIsCompleted,
        completedNote: formIsCompleted ? formCompletedNote.trim() : ''
      };
      if (onUpdateClass) {
        onUpdateClass(updated);
      }
      setSessions(sessions.map(s => s.id === editingSession.id ? updated : s));
    } else {
      const newS: ClassSession = {
        id: `session_${Date.now()}`,
        title,
        subject,
        startTime: startTime || new Date().toISOString(),
        endTime: endTime || new Date(Date.now() + 5400000).toISOString(),
        isOnline,
        link: isOnline ? link : '',
        note,
        teacherId: user.id,
        teacherName: user.name,
        isCompleted: formIsCompleted,
        completedNote: formIsCompleted ? formCompletedNote.trim() : ''
      };
      if (onAddClass) {
        onAddClass(newS);
      }
      setSessions([...sessions, newS]);
    }
    setShowModal(false);
  };

  const handleOpenComplete = (session: ClassSession) => {
    setCompletingSession(session);
    setCompletedNoteInput('');
    setShowCompleteModal(true);
  };

  const handleConfirmComplete = () => {
    if (!completingSession) return;
    const updated: ClassSession = {
      ...completingSession,
      isCompleted: true,
      completedNote: completedNoteInput.trim()
    };
    if (onUpdateClass) {
      onUpdateClass(updated);
    }
    setSessions(sessions.map(s => s.id === completingSession.id ? updated : s));
    setShowCompleteModal(false);
    setCompletingSession(null);
  };

  const handleOpenDetails = (session: ClassSession) => {
    setViewingSessionDetails(session);
    setEditCompletedNoteInput(session.completedNote || '');
    setEditingCompletedNote(false);
    setShowDetailsModal(true);
  };

  const handleSaveCompletedNote = () => {
    if (!viewingSessionDetails) return;
    const updated: ClassSession = {
      ...viewingSessionDetails,
      completedNote: editCompletedNoteInput.trim()
    };
    if (onUpdateClass) {
      onUpdateClass(updated);
    }
    setSessions(sessions.map(s => s.id === viewingSessionDetails.id ? updated : s));
    setViewingSessionDetails(updated);
    setEditingCompletedNote(false);
  };

  const handleSaveAttendance = async () => {
    if (!viewingSessionDetails) return;
    setIsSavingAttendance(true);
    const updated: ClassSession = {
      ...viewingSessionDetails,
      attendedByStudents: modalAttendedStudents
    };
    try {
      if (onUpdateClass) {
        await onUpdateClass(updated);
      }
      setSessions(sessions.map(s => s.id === viewingSessionDetails.id ? updated : s));
      setViewingSessionDetails(updated);
      setNotification({ message: 'Cập nhật danh sách điểm danh thành công!', type: 'success' });
      setTimeout(() => setNotification(null), 3000);
    } catch (err) {
      console.error('Error saving attendance:', err);
      setNotification({ message: 'Lỗi xảy ra khi lưu danh sách điểm danh.', type: 'error' });
      setTimeout(() => setNotification(null), 3000);
    } finally {
      setIsSavingAttendance(false);
    }
  };

  const handleToggleStudentAttendance = (studentId: string, studentName: string) => {
    const isAttended = modalAttendedStudents.some(s => s.studentId === studentId);
    if (isAttended) {
      setModalAttendedStudents(modalAttendedStudents.filter(s => s.studentId !== studentId));
    } else {
      setModalAttendedStudents([
        ...modalAttendedStudents,
        {
          studentId,
          studentName,
          clickedAt: new Date().toISOString()
        }
      ]);
    }
  };

  const handleSelectAllClassStudents = (classStudents: User[]) => {
    const allSelected = classStudents.every(student => modalAttendedStudents.some(s => s.studentId === student.id));
    if (allSelected) {
      const classStudentIds = new Set(classStudents.map(s => s.id));
      setModalAttendedStudents(modalAttendedStudents.filter(s => !classStudentIds.has(s.studentId)));
    } else {
      const updated = [...modalAttendedStudents];
      classStudents.forEach(student => {
        if (!updated.some(s => s.studentId === student.id)) {
          updated.push({
            studentId: student.id,
            studentName: student.name || 'Học sinh',
            clickedAt: new Date().toISOString()
          });
        }
      });
      setModalAttendedStudents(updated);
    }
  };

  const handleRevertToUpcoming = (session: ClassSession) => {
    const updated: ClassSession = {
      ...session,
      isCompleted: false,
      completedNote: ''
    };
    if (onUpdateClass) {
      onUpdateClass(updated);
    }
    setSessions(sessions.map(s => s.id === session.id ? updated : s));
    if (viewingSessionDetails?.id === session.id) {
      setShowDetailsModal(false);
      setViewingSessionDetails(null);
    }
  };

  const handleJoinLinkClick = (session: ClassSession) => {
    if (user.role === 'student') {
      const hasJoined = session.attendedByStudents?.some(s => s.studentId === user.id);
      if (!hasJoined) {
        const updated: ClassSession = {
          ...session,
          attendedByStudents: [
            ...(session.attendedByStudents || []),
            {
              studentId: user.id,
              studentName: user.name || 'Học sinh',
              clickedAt: new Date().toISOString()
            }
          ]
        };
        if (onUpdateClass) {
          onUpdateClass(updated);
        }
        setSessions(sessions.map(s => s.id === session.id ? updated : s));
      }
    }
  };

  const handleOpenNotice = (session: ClassSession) => {
    const msg = `[THÔNG BÁO LỊCH HỌC TRỰC TUYẾN]\nXin chào các em học sinh và Quý Phụ huynh,\nChuẩn bị diễn ra buổi học: "${session.title}".\nThời gian: ${format(new Date(session.startTime), 'HH:mm dd/MM/yyyy', { locale: vi })}\nLink phòng học Google Meet / Zoom: ${session.link}\nLưu ý: ${session.note || 'Vào phòng học đúng giờ trước 5 phút!'}`;
    setNotifyMsg(msg);
    setNotifyModal(true);
    setCopied(false);
  };

  const handleSaveNote = () => {
    if (currentNote.trim()) {
      setUserNotes({
        ...userNotes,
        [selectedDate]: currentNote.trim()
      });
    } else {
      const updated = { ...userNotes };
      delete updated[selectedDate];
      setUserNotes(updated);
    }
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-10">
      
      {/* Notification Toast */}
      {notification && (
        <div className={`p-4 rounded-2xl border flex items-start justify-between gap-3 ${
          notification.type === 'success' 
            ? 'bg-emerald-50 border-emerald-200 text-emerald-800' 
            : 'bg-rose-50 border-rose-200 text-rose-800'
        }`}>
          <div className="flex items-start gap-2.5">
            {notification.type === 'success' ? (
              <CheckCircle className="w-5 h-5 shrink-0 mt-0.5 text-emerald-600" />
            ) : (
              <AlertCircle className="w-5 h-5 shrink-0 mt-0.5 text-rose-600" />
            )}
            <div className="text-sm font-semibold leading-relaxed mt-0.5">
              {notification.message}
            </div>
          </div>
          <button onClick={() => setNotification(null)} className="opacity-70 hover:opacity-100 transition-opacity">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Header Container */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white p-6 rounded-3xl border border-slate-200 shadow-sm">
        <div>
          <h2 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">Lịch học & Phòng học trực tuyến</h2>
          <p className="text-slate-500 text-xs sm:text-sm mt-0.5">
            {isTeacher 
              ? 'Tạo lịch học, link Meet/Zoom, ghi nhận giờ dạy thực tế và báo cáo thống kê thời lượng học.' 
              : 'Theo dõi lịch học, ghi chú nhắc nhở ngày giờ và truy cập link phòng học'}
          </p>
        </div>

        {/* Action Buttons */}
        {isTeacher && scheduleTab !== 'report' && (
          <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
            <button
              type="button"
              onClick={handleDownloadTemplate}
              className="flex items-center px-3.5 py-2.5 bg-white text-emerald-700 font-bold text-xs rounded-xl hover:bg-emerald-50 border border-emerald-200 transition-colors shadow-sm shrink-0"
              title="Tải file Excel mẫu để điền lịch học"
            >
              <Download className="w-4 h-4 mr-1.5" />
              <span>Mẫu Excel</span>
            </button>
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleExcelImport}
              accept=".xlsx, .xls"
              className="hidden"
            />
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="flex items-center px-4 py-2.5 bg-emerald-600 text-white font-bold text-xs rounded-xl hover:bg-emerald-700 transition-colors shadow-sm shrink-0"
              title="Tải lên danh sách lịch học từ file Excel"
            >
              <FileSpreadsheet className="w-4 h-4 mr-1.5" />
              <span>Nhập Excel</span>
            </button>
            <button 
              onClick={handleOpenCreate}
              className="flex items-center px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 active:scale-95 text-white font-bold text-xs rounded-xl transition-all shadow-sm shrink-0"
            >
              <Plus className="w-4 h-4 mr-1.5" />
              <span>Tạo buổi học</span>
            </button>
          </div>
        )}
      </div>

      {/* Overdue Payment Warning Banner for Students */}
      {user.role === 'student' && studentHours >= (studentTuitionSetting?.limitHours || 20) && (
        <div className="bg-gradient-to-r from-rose-50 to-red-100 border border-rose-200/80 rounded-3xl p-5 shadow-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 animate-pulse">
          <div className="flex items-start gap-3">
            <div className="p-3 bg-rose-500 text-white rounded-2xl shrink-0">
              <AlertCircle className="w-6 h-6 animate-bounce" />
            </div>
            <div>
              <h3 className="font-black text-rose-950 text-sm tracking-tight">CẢNH BÁO QUAN TRỌNG: YÊU CẦU THANH TOÁN HỌC PHÍ</h3>
              <p className="text-rose-800 text-xs font-semibold mt-1 max-w-2xl leading-relaxed">
                Lớp học của em hiện đã tích lũy <span className="font-extrabold text-rose-600 bg-white/70 px-1.5 py-0.5 rounded-md border border-rose-200">{studentHours.toFixed(1)} / {studentTuitionSetting?.limitHours || 20}</span> giờ học hoàn thành. Vui lòng hoàn thành học phí đợt này để tránh gián đoạn tiến độ và được tiếp tục học tập.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setScheduleTab('tuition')}
            className="w-full sm:w-auto px-5 py-3 bg-rose-600 hover:bg-rose-700 text-white text-xs font-extrabold rounded-2xl shadow-sm hover:shadow transition-all whitespace-nowrap"
          >
            Thanh toán ngay &rarr;
          </button>
        </div>
      )}

      {/* Main Navigation Tabs (Subtabs) */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-1.5 p-1 bg-slate-200/60 rounded-2xl border border-slate-200/80 shadow-2xs max-w-full overflow-x-auto scrolling-touch w-max">
          <button
            type="button"
            onClick={() => setScheduleTab('upcoming')}
            className={`px-4 py-2.5 text-xs font-bold rounded-xl transition-all flex items-center gap-2 whitespace-nowrap shrink-0 active:scale-95 ${
              scheduleTab === 'upcoming'
                ? 'bg-white text-indigo-700 shadow-sm border border-slate-200/80 font-extrabold'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100/50'
            }`}
          >
            <CalendarIcon className="w-3.5 h-3.5 shrink-0" />
            <span>Lịch học</span>
          </button>
          <button
            type="button"
            onClick={() => setScheduleTab('completed')}
            className={`px-4 py-2.5 text-xs font-bold rounded-xl transition-all flex items-center gap-2 whitespace-nowrap shrink-0 active:scale-95 ${
              scheduleTab === 'completed'
                ? 'bg-white text-indigo-700 shadow-sm border border-slate-200/80 font-extrabold'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100/50'
            }`}
          >
            <CheckCircle className="w-3.5 h-3.5 shrink-0" />
            <span>Nhật ký dạy & học</span>
            <span className={`px-1.5 py-0.5 rounded-full text-[10px] font-extrabold border ${
              scheduleTab === 'completed' ? 'bg-indigo-50 text-indigo-700 border-indigo-200/60' : 'bg-slate-200/70 text-slate-500 border-transparent'
            }`}>
              {sessions.filter(s => s.isCompleted).length}
            </span>
          </button>
          
          {/* Show Schedule Analytics Report for teachers/admins */}
          {(isTeacher || isAdmin) && (
            <button
              type="button"
              onClick={() => setScheduleTab('report')}
              className={`px-4 py-2.5 text-xs font-bold rounded-xl transition-all flex items-center gap-2 whitespace-nowrap shrink-0 active:scale-95 ${
                scheduleTab === 'report'
                  ? 'bg-white text-indigo-700 shadow-sm border border-slate-200/80 font-extrabold'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100/50'
              }`}
            >
              <BarChart3 className="w-3.5 h-3.5 shrink-0" />
              <span>Thống kê giờ học</span>
            </button>
          )}

          {/* Show Tuition Tab (Quản lý Học phí for Teachers/Admins, Thanh toán học phí for Students) */}
          <button
            type="button"
            onClick={() => setScheduleTab('tuition')}
            className={`px-4 py-2.5 text-xs font-bold rounded-xl transition-all flex items-center gap-2 whitespace-nowrap shrink-0 active:scale-95 ${
              scheduleTab === 'tuition'
                ? 'bg-white text-indigo-700 shadow-sm border border-slate-200/80 font-extrabold'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100/50'
            }`}
          >
            {(isTeacher || isAdmin) ? (
              <>
                <Award className="w-3.5 h-3.5 shrink-0 text-amber-500" />
                <span>Quản lý Học phí</span>
                {tuitionReceipts.length > 0 && (
                  <span className="px-1.5 py-0.5 rounded-full text-[9px] font-extrabold bg-indigo-100 text-indigo-700 shrink-0">
                    {tuitionReceipts.length}
                  </span>
                )}
              </>
            ) : (
              <>
                <Clock className="w-3.5 h-3.5 shrink-0" />
                <span>Thanh toán học phí</span>
                {studentHours >= (studentTuitionSetting?.limitHours || 20) && (
                  <span className="w-2 h-2 rounded-full bg-rose-500 animate-pulse shrink-0" />
                )}
              </>
            )}
          </button>
        </div>
      </div>

      {/* Dynamic Unified Filter Bar for Upcoming and Completed tabs */}
      {(scheduleTab === 'upcoming' || scheduleTab === 'completed') && (
        <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-sm space-y-4">
          {/* Top Row: Criteria and Mode Switcher */}
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-slate-100 pb-4">
            <div className="flex flex-wrap items-center gap-3">
              <span className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                <Filter className="w-4 h-4 text-indigo-500" />
                Tiêu chí lọc:
              </span>
              
              {/* Lớp học */}
              <div className="w-[150px]">
                <CustomSelect
                  value={statsClass}
                  onChange={val => setStatsClass(val)}
                  options={[
                    { value: 'all', label: 'Tất cả lớp' },
                    ...availableClassesForMonthly.map(cls => ({
                      value: cls,
                      label: cls.startsWith('Lớp') || cls.startsWith('lop') ? cls : `Lớp ${cls}`
                    }))
                  ]}
                  size="sm"
                />
              </div>

              {/* Môn học */}
              <div className="w-[150px]">
                <CustomSelect
                  value={statsSubject}
                  onChange={val => setStatsSubject(val)}
                  options={[
                    { value: 'all', label: 'Tất cả môn' },
                    ...availableSubjectsForMonthly.map(sub => ({
                      value: sub,
                      label: sub
                    }))
                  ]}
                  size="sm"
                />
              </div>
            </div>

            {/* Mode Switcher Tabs */}
            <div className="flex bg-slate-100 p-1 rounded-xl self-start lg:self-auto">
              <button
                type="button"
                onClick={() => setTimeMode('month')}
                className={`px-3 py-1.5 text-[11px] font-extrabold rounded-lg transition-all flex items-center gap-1 ${
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
                className={`px-3 py-1.5 text-[11px] font-extrabold rounded-lg transition-all flex items-center gap-1 ${
                  timeMode === 'custom_range'
                    ? 'bg-white text-indigo-700 shadow-sm'
                    : 'text-slate-600 hover:text-indigo-600'
                }`}
              >
                <Clock className="w-3.5 h-3.5" />
                Khoảng ngày tùy chọn
              </button>
            </div>
          </div>

          {/* Dynamic Time Selectors */}
          {timeMode === 'month' ? (
            <div className="flex flex-wrap items-center gap-3">
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-slate-700 shrink-0">Chọn Tháng:</span>
                <div className="w-[130px]">
                  <CustomSelect
                    value={String(statsMonth)}
                    onChange={val => setStatsMonth(Number(val))}
                    options={Array.from({ length: 12 }, (_, i) => i + 1).map(m => ({
                      value: String(m),
                      label: `Tháng ${m}`
                    }))}
                    size="sm"
                  />
                </div>
              </div>

              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-slate-700 shrink-0">Năm:</span>
                <div className="w-[120px]">
                  <CustomSelect
                    value={String(statsYear)}
                    onChange={val => setStatsYear(Number(val))}
                    options={[2024, 2025, 2026, 2027].map(y => ({
                      value: String(y),
                      label: `Năm ${y}`
                    }))}
                    size="sm"
                  />
                </div>
              </div>

              {/* Quick Month Jumps */}
              <div className="flex items-center gap-1.5 sm:ml-auto">
                <button
                  type="button"
                  onClick={() => {
                    const now = new Date();
                    setStatsMonth(now.getMonth() + 1);
                    setStatsYear(now.getFullYear());
                  }}
                  className="px-2.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-[11px] rounded-lg transition-colors"
                >
                  Tháng này
                </button>
                <button
                  type="button"
                  onClick={() => {
                    const now = new Date();
                    const prev = subMonths(now, 1);
                    setStatsMonth(prev.getMonth() + 1);
                    setStatsYear(prev.getFullYear());
                  }}
                  className="px-2.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-[11px] rounded-lg transition-colors"
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
                    className="px-4 py-1.5 bg-slate-50 border border-slate-200 rounded-full text-xs font-bold text-slate-800 focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 shadow-2xs transition-all outline-none"
                  />
                </div>

                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-slate-700">Đến ngày:</span>
                  <input
                    type="date"
                    value={endDateStr}
                    onChange={e => setEndDateStr(e.target.value)}
                    className="px-4 py-1.5 bg-slate-50 border border-slate-200 rounded-full text-xs font-bold text-slate-800 focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 shadow-2xs transition-all outline-none"
                  />
                </div>

                {/* Quick Range Presets */}
                <div className="flex flex-wrap items-center gap-1.5 sm:ml-auto">
                  <span className="text-[11px] font-bold text-slate-400 mr-1">Chọn nhanh:</span>
                  <button
                    type="button"
                    onClick={() => handleApplySchedulePreset('today')}
                    className="px-2 py-1 bg-slate-100 hover:bg-indigo-50 hover:text-indigo-700 text-slate-600 font-bold text-[10px] rounded-md border border-slate-200/80 transition-colors"
                  >
                    Hôm nay
                  </button>
                  <button
                    type="button"
                    onClick={() => handleApplySchedulePreset('last7')}
                    className="px-2 py-1 bg-slate-100 hover:bg-indigo-50 hover:text-indigo-700 text-slate-600 font-bold text-[10px] rounded-md border border-slate-200/80 transition-colors"
                  >
                    7 ngày
                  </button>
                  <button
                    type="button"
                    onClick={() => handleApplySchedulePreset('this_month')}
                    className="px-2 py-1 bg-slate-100 hover:bg-indigo-50 hover:text-indigo-700 text-slate-600 font-bold text-[10px] rounded-md border border-slate-200/80 transition-colors"
                  >
                    Tháng này
                  </button>
                  <button
                    type="button"
                    onClick={() => handleApplySchedulePreset('last30')}
                    className="px-2 py-1 bg-slate-100 hover:bg-indigo-50 hover:text-indigo-700 text-slate-600 font-bold text-[10px] rounded-md border border-slate-200/80 transition-colors"
                  >
                    30 ngày
                  </button>
                  <button
                    type="button"
                    onClick={() => handleApplySchedulePreset('this_quarter')}
                    className="px-2 py-1 bg-slate-100 hover:bg-indigo-50 hover:text-indigo-700 text-slate-600 font-bold text-[10px] rounded-md border border-slate-200/80 transition-colors"
                  >
                    Quý này
                  </button>
                  <button
                    type="button"
                    onClick={() => handleApplySchedulePreset('all_time')}
                    className="px-2 py-1 bg-slate-100 hover:bg-indigo-50 hover:text-indigo-700 text-slate-600 font-bold text-[10px] rounded-md border border-slate-200/80 transition-colors"
                  >
                    Tất cả
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {scheduleTab === 'report' ? (
        <ScheduleAnalyticsReport
          user={user}
          sessions={sessions}
          isTeacher={isTeacher}
          isAdmin={isAdmin}
          onOpenQuickLog={handleOpenQuickLog}
          onViewDetails={session => {
            setViewingSessionDetails(session);
            setShowDetailsModal(true);
          }}
          onOpenEdit={session => handleOpenEdit(session)}
        />
      ) : scheduleTab === 'tuition' ? (
        (isTeacher || isAdmin) ? (
          <TeacherTuitionManager
            currentUser={user}
            allUsers={allUsers}
            sessions={sessions}
            tuitionSettings={tuitionSettings}
            tuitionReceipts={tuitionReceipts}
            onUpdateSettings={setTuitionSettings}
            onUpdateReceipts={setTuitionReceipts}
            onViewImageLightbox={url => setReceiptLightboxUrl(url)}
            onOpenDemo={() => setShowTuitionDemoModal(true)}
            setNotification={setNotification}
          />
        ) : (
          <StudentTuitionTabContent 
            user={user}
            studentHours={studentHours}
            studentTuitionSetting={studentTuitionSetting}
            studentTuitionStatus={studentTuitionStatus}
            tuitionReceipts={tuitionReceipts}
            onUploadScreenshot={handleTuitionScreenshotUpload}
            isUploadingTuition={isUploadingTuition}
            tuitionUploadSuccess={tuitionUploadSuccess}
            onResetUploadSuccess={() => setTuitionUploadSuccess(false)}
            onViewImageLightbox={url => setReceiptLightboxUrl(url)}
          />
        )
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          {/* Left 2 cols: Class Sessions List */}
          <div className="lg:col-span-2 space-y-4">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
              <div className="flex items-center gap-3">
                <h3 className="font-bold text-slate-900 text-base">
                  {scheduleTab === 'upcoming' ? 'Danh sách Buổi học' : 'Nhật ký các Buổi học đã diễn ra'}
                </h3>
                {isTeacher && (scheduleTab === 'upcoming' || scheduleTab === 'completed') && displayedSessions.length > 0 && (
                  <label className="flex items-center gap-2 text-xs font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 px-3 py-1.5 rounded-full cursor-pointer transition-colors border border-slate-200 shadow-3xs">
                    <input 
                      type="checkbox" 
                      className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 cursor-pointer w-4 h-4"
                      checked={selectedSessionIds.size === displayedSessions.length && displayedSessions.length > 0}
                      onChange={() => {
                        if (selectedSessionIds.size === displayedSessions.length) {
                          setSelectedSessionIds(new Set());
                        } else {
                          setSelectedSessionIds(new Set(displayedSessions.map(s => s.id)));
                        }
                      }}
                    />
                    <span>Chọn tất cả ({displayedSessions.length})</span>
                  </label>
                )}
              </div>
            </div>

            {/* Bulk actions & Sync bar */}
            {isTeacher && (scheduleTab === 'upcoming' || scheduleTab === 'completed') && selectedSessionIds.size > 0 && (
              <div className="bg-white border border-slate-200/80 rounded-2xl p-4.5 shadow-sm space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-3">
                  <div className="flex items-center gap-2.5">
                    <div className="p-2 bg-indigo-50 text-indigo-700 rounded-xl">
                      <CheckCircle className="w-5 h-5" />
                    </div>
                    <div>
                      <p className="font-extrabold text-slate-900 text-xs sm:text-sm">
                        Đồng bộ hàng loạt cho {selectedSessionIds.size} buổi học đã chọn
                      </p>
                      <p className="text-[10px] text-slate-500 font-semibold">
                        Thiết lập các thuộc tính chung cho tất cả các buổi học được tích chọn
                      </p>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-2 self-end sm:self-auto">
                    <button
                      onClick={() => setSelectedSessionIds(new Set())}
                      className="px-3 py-1.5 bg-slate-50 border border-slate-200 text-slate-600 hover:bg-slate-100 font-bold text-xs rounded-xl transition-all"
                    >
                      Bỏ chọn
                    </button>
                    <button
                      onClick={handleBulkDeleteClick}
                      className="flex items-center px-3 py-1.5 bg-rose-50 text-rose-600 hover:bg-rose-100 font-bold text-xs rounded-xl transition-colors border border-rose-200"
                    >
                      <Trash2 className="w-3.5 h-3.5 mr-1" />
                      Xóa hàng loạt
                    </button>
                  </div>
                </div>

                {/* Bulk Controls Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                  {/* isOnline */}
                  <div className="flex flex-col gap-1.5">
                    <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Hình thức học:</span>
                    <CustomSelect
                      value={bulkIsOnline}
                      onChange={val => setBulkIsOnline(val as any)}
                      options={[
                        { value: 'keep', label: '-- Giữ nguyên --' },
                        { value: 'online', label: 'Trực tuyến (Online)' },
                        { value: 'offline', label: 'Trực tiếp (Offline)' },
                      ]}
                      size="sm"
                    />
                  </div>

                  {/* isCompleted */}
                  <div className="flex flex-col gap-1.5">
                    <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Trạng thái dạy/học:</span>
                    <CustomSelect
                      value={bulkIsCompleted}
                      onChange={val => setBulkIsCompleted(val as any)}
                      options={[
                        { value: 'keep', label: '-- Giữ nguyên --' },
                        { value: 'completed', label: 'Đánh dấu Đã học xong' },
                        { value: 'upcoming', label: 'Chuyển thành Lịch sắp tới' },
                      ]}
                      size="sm"
                    />
                  </div>

                  {/* Class */}
                  <div className="flex flex-col gap-1.5">
                    <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Đổi lớp học:</span>
                    <CustomSelect
                      value={bulkClass}
                      onChange={val => {
                        setBulkClass(val);
                        if (val !== 'custom') {
                          setBulkClassInput('');
                        }
                      }}
                      options={[
                        { value: 'keep', label: '-- Giữ nguyên --' },
                        { value: 'custom', label: 'Nhập lớp mới...' },
                        ...allUniqueClasses.map(cls => ({
                          value: cls,
                          label: cls.startsWith('Lớp') || cls.startsWith('lop') ? cls : `Lớp ${cls}`
                        }))
                      ]}
                      size="sm"
                    />
                    {bulkClass === 'custom' && (
                      <input 
                        type="text"
                        value={bulkClassInput}
                        onChange={e => setBulkClassInput(e.target.value)}
                        placeholder="VD: Lớp 10A1..."
                        className="mt-1.5 px-3 py-1.5 bg-white border border-slate-300 rounded-xl text-xs font-semibold text-slate-800 focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all"
                      />
                    )}
                  </div>

                  {/* Subject */}
                  <div className="flex flex-col gap-1.5">
                    <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Đổi môn học:</span>
                    <CustomSelect
                      value={bulkSubject}
                      onChange={val => {
                        setBulkSubject(val);
                        if (val !== 'custom') {
                          setBulkSubjectInput('');
                        }
                      }}
                      options={[
                        { value: 'keep', label: '-- Giữ nguyên --' },
                        { value: 'custom', label: 'Nhập môn mới...' },
                        ...allUniqueSubjects.map(sub => ({
                          value: sub,
                          label: sub
                        }))
                      ]}
                      size="sm"
                    />
                    {bulkSubject === 'custom' && (
                      <input 
                        type="text"
                        value={bulkSubjectInput}
                        onChange={e => setBulkSubjectInput(e.target.value)}
                        placeholder="VD: Tiếng Anh..."
                        className="mt-1.5 px-3 py-1.5 bg-white border border-slate-300 rounded-xl text-xs font-semibold text-slate-800 focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all"
                      />
                    )}
                  </div>
                </div>

                {/* Bulk Attendance Row */}
                <div className="border-t border-slate-100 pt-3.5 space-y-3">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <span className="text-[11px] font-extrabold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                      <Users className="w-4 h-4 text-indigo-600" />
                      Điểm danh hàng loạt học sinh ({bulkAttendedStudentIds.size} học sinh đã chọn)
                    </span>
                    <div className="w-full sm:w-[280px]">
                      <CustomSelect
                        value={bulkAttendanceMode}
                        onChange={val => {
                          setBulkAttendanceMode(val as any);
                          if (val === 'keep' || val === 'clear') {
                            setBulkAttendedStudentIds(new Set());
                          }
                        }}
                        options={[
                          { value: 'keep', label: '-- Không thay đổi điểm danh --' },
                          { value: 'replace', label: 'Thay thế bằng học sinh chọn dưới đây' },
                          { value: 'add', label: 'Thêm học sinh chọn dưới đây vào buổi học' },
                          { value: 'clear', label: 'Xóa sạch toàn bộ điểm danh' },
                        ]}
                        size="sm"
                      />
                    </div>
                  </div>

                  {(bulkAttendanceMode === 'replace' || bulkAttendanceMode === 'add') && (
                    <div className="bg-slate-50 border border-slate-200/60 rounded-2xl p-3.5 space-y-2">
                      <div className="flex flex-col sm:flex-row sm:items-center gap-2 justify-between">
                        {/* Search student */}
                        <div className="relative w-full sm:max-w-xs">
                          <input
                            type="text"
                            placeholder="Tìm nhanh học sinh..."
                            value={bulkAttendanceSearch}
                            onChange={e => setBulkAttendanceSearch(e.target.value)}
                            className="w-full pl-8 pr-3 py-1.5 bg-white border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500 text-xs font-semibold"
                          />
                          <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5" />
                        </div>
                        {/* Select/unselect all quick buttons */}
                        {bulkAttendanceEligibleStudents.length > 0 && (
                          <div className="flex gap-2">
                            <button
                              type="button"
                              onClick={() => {
                                setBulkAttendedStudentIds(new Set(bulkAttendanceEligibleStudents.map(s => s.id)));
                              }}
                              className="text-[10px] text-indigo-600 hover:text-indigo-850 font-extrabold bg-white hover:bg-slate-100 px-2.5 py-1 rounded-lg border border-slate-200 shadow-3xs transition-all"
                            >
                              Chọn tất cả lớp ({bulkAttendanceEligibleStudents.length})
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                setBulkAttendedStudentIds(new Set());
                              }}
                              className="text-[10px] text-slate-500 hover:text-slate-755 font-extrabold bg-white hover:bg-slate-100 px-2.5 py-1 rounded-lg border border-slate-200 shadow-3xs transition-all"
                            >
                              Bỏ chọn hết
                            </button>
                          </div>
                        )}
                      </div>

                      {/* Scrollable list of students */}
                      <div className="max-h-[140px] overflow-y-auto border border-slate-200/80 rounded-xl divide-y divide-slate-100 bg-white shadow-3xs">
                        {bulkAttendanceEligibleStudents.length > 0 ? (
                          (() => {
                            const filtered = bulkAttendanceEligibleStudents.filter(student =>
                              (student.name || '').toLowerCase().includes(bulkAttendanceSearch.toLowerCase()) ||
                              (student.className || '').toLowerCase().includes(bulkAttendanceSearch.toLowerCase())
                            );
                            if (filtered.length === 0) {
                              return <p className="p-3 text-slate-400 text-[11px] font-medium text-center">Không tìm thấy học sinh phù hợp.</p>;
                            }
                            return filtered.map(student => {
                              const isChecked = bulkAttendedStudentIds.has(student.id);
                              return (
                                <label
                                  key={student.id}
                                  className="p-2.5 hover:bg-slate-50/80 flex items-center gap-2.5 font-medium cursor-pointer transition-colors"
                                >
                                  <input
                                    type="checkbox"
                                    checked={isChecked}
                                    onChange={() => {
                                      const next = new Set(bulkAttendedStudentIds);
                                      if (isChecked) {
                                        next.delete(student.id);
                                      } else {
                                        next.add(student.id);
                                      }
                                      setBulkAttendedStudentIds(next);
                                    }}
                                    className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 cursor-pointer w-4 h-4"
                                  />
                                  <div className="flex flex-col">
                                    <span className="text-slate-800 font-bold text-xs">{student.name}</span>
                                    {student.className && (
                                      <span className="text-[10px] text-slate-400 font-semibold">Lớp: {student.className}</span>
                                    )}
                                  </div>
                                </label>
                              );
                            });
                          })()
                        ) : (
                          <p className="p-3 text-slate-400 text-[11px] font-medium text-center">Không có học sinh nào khớp với lớp của các buổi học đã chọn.</p>
                        )}
                      </div>
                    </div>
                  )}
                </div>

                <div className="flex justify-end pt-3 border-t border-slate-100">
                  <button
                    onClick={handleApplyBulkUpdate}
                    disabled={isBulkUpdating || (bulkIsOnline === 'keep' && bulkIsCompleted === 'keep' && bulkClass === 'keep' && bulkSubject === 'keep' && bulkAttendanceMode === 'keep')}
                    className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-200 disabled:text-slate-400 text-white font-extrabold text-xs rounded-xl shadow-md disabled:shadow-none hover:shadow-lg active:scale-95 transition-all flex items-center gap-2"
                  >
                    {isBulkUpdating ? (
                      <span className="animate-spin border-2 border-white border-t-transparent rounded-full w-3.5 h-3.5" />
                    ) : (
                      <CheckCircle className="w-4 h-4" />
                    )}
                    <span>Đồng bộ ngay</span>
                  </button>
                </div>
              </div>
            )}
            
            {/* Quick Banner linking to Custom Range Analytics Dashboard on Completed Tab (Teachers/Admins only) */}
            {scheduleTab === 'completed' && isTeacher && (
              <div className="bg-gradient-to-r from-indigo-50 to-purple-50 border border-indigo-100 rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-xs">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 bg-indigo-600 text-white rounded-xl shadow-xs shrink-0">
                    <BarChart3 className="w-5 h-5" />
                  </div>
                  <div>
                    <p className="font-extrabold text-slate-900 text-xs sm:text-sm">Cần thống kê theo khoảng thời gian tùy chọn?</p>
                    <p className="text-[11px] text-slate-500 font-medium">Lọc theo ngày bất kỳ, phân bổ số giờ theo môn học, lớp học và xuất báo cáo chi tiết.</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setScheduleTab('report')}
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-xl transition-all shadow-xs flex items-center gap-1.5 self-start sm:self-auto shrink-0 active:scale-95"
                >
                  Mở Dashboard Thống kê
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            )}
          
          {/* Monthly Work Summary & Report Widget (shown on completed tab) */}
          {scheduleTab === 'completed' && (
            <>
            <div className="bg-slate-50 border border-slate-200 rounded-3xl p-5 mb-1.5 space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-200/60 pb-3">
                <div className="flex items-center gap-2">
                  <div className="p-2 bg-indigo-100 text-indigo-700 rounded-xl">
                    <FileText className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="font-extrabold text-slate-900 text-sm">Thống kê dạy & học theo tháng</h4>
                    <p className="text-slate-500 text-[11px] font-medium">Báo cáo chấm công, số ngày dạy thực tế và dọn dẹp ghi chú</p>
                  </div>
                </div>

                {/* Selectors replaced by unified top bar, only action button left */}
                <div className="flex flex-wrap items-center gap-2 self-end sm:self-auto">
                  {isTeacher && (
                    <button
                      type="button"
                      onClick={handleOpenQuickLog}
                      className="px-4 py-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 font-extrabold text-xs rounded-full border border-emerald-200 transition-colors flex items-center gap-1.5 shadow-xs"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      Ghi nhận giờ dạy ngoài
                    </button>
                  )}
                </div>
              </div>

              {/* Stats Metrics Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                <div className="bg-white p-3.5 rounded-2xl border border-slate-200/70 shadow-sm text-center">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wide block mb-0.5">Số ngày dạy thực tế</span>
                  <span className="text-xl font-black text-indigo-600 block">{uniqueTeachingDays}</span>
                  <span className="text-[10px] text-slate-500 font-semibold block">ngày có lịch dạy</span>
                </div>

                <div className="bg-white p-3.5 rounded-2xl border border-slate-200/70 shadow-sm text-center">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wide block mb-0.5">Tổng số buổi dạy</span>
                  <span className="text-xl font-black text-indigo-600 block">{completedSessionsInMonth.length}</span>
                  <span className="text-[10px] text-slate-500 font-semibold block">buổi học đã xong</span>
                </div>

                <div className="bg-white p-3.5 rounded-2xl border border-slate-200/70 shadow-sm text-center">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wide block mb-0.5">Tổng số giờ dạy</span>
                  <span className="text-xl font-black text-indigo-600 block">{totalTeachingHours.toFixed(1)}</span>
                  <span className="text-[10px] text-slate-500 font-semibold block">giờ lên lớp online</span>
                </div>

                {isTeacher ? (
                  <div className="bg-white p-3.5 rounded-2xl border border-slate-200/70 shadow-sm text-center">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wide block mb-0.5">Sĩ số trung bình</span>
                    <span className="text-xl font-black text-indigo-600 block">
                      {completedSessionsInMonth.length > 0
                        ? (completedSessionsInMonth.reduce((acc, s) => acc + (s.attendedByStudents?.length || 0), 0) / completedSessionsInMonth.length).toFixed(1)
                        : "0.0"
                      }
                    </span>
                    <span className="text-[10px] text-slate-500 font-semibold block">học sinh / buổi</span>
                  </div>
                ) : (
                  <div className="bg-white p-3.5 rounded-2xl border border-slate-200/70 shadow-sm text-center">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wide block mb-0.5">Tỉ lệ tham gia học</span>
                    <span className="text-xl font-black text-emerald-600 block">{studentAttendanceRate}%</span>
                    <span className="text-[10px] text-slate-500 font-semibold block">đã click ({studentAttendedSessions.length}/{completedSessionsInMonth.length})</span>
                  </div>
                )}
              </div>

            </div>

            </>
          )}

          {(() => {
            if (displayedSessions.length === 0) {
              return (
                <div className="text-center py-12 bg-white rounded-3xl border border-slate-200 shadow-sm flex flex-col items-center justify-center p-6 text-slate-400">
                  <CalendarIcon className="w-10 h-10 text-slate-300 mb-3" />
                  <p className="font-extrabold text-xs">
                    {scheduleTab === 'upcoming' 
                      ? 'Không có lịch học nào.' 
                      : `Không có buổi học hoàn thành nào được ghi nhận trong Tháng ${statsMonth}/${statsYear}.`}
                  </p>
                </div>
              );
            }

            return (
              <div className="grid grid-cols-1 sm:grid-cols-2 2xl:grid-cols-3 3xl:grid-cols-4 gap-4 sm:gap-5">
                {displayedSessions.map(session => {
                  const isHappening = !session.isCompleted && new Date() >= new Date(session.startTime) && new Date() <= new Date(session.endTime);
                  const isUserStudent = user.role === 'student';
                  const studentAttendance = session.attendedByStudents?.find(s => s.studentId === user.id);

                  return (
                    <div 
                      key={session.id} 
                      className={`bg-white rounded-3xl border shadow-sm overflow-hidden flex flex-col justify-between transition-all hover:shadow-md relative ${
                        isHappening ? 'border-indigo-500 ring-2 ring-indigo-500/20' : 'border-slate-200'
                      }`}
                    >
                      {isTeacher && (scheduleTab === 'upcoming' || scheduleTab === 'completed') && (
                        <div className="absolute top-4 left-4 z-10">
                          <input 
                            type="checkbox"
                            className="w-5 h-5 rounded-md border-slate-300 text-indigo-600 focus:ring-indigo-500 cursor-pointer shadow-xs transition-all"
                            checked={selectedSessionIds.has(session.id)}
                            onChange={() => handleToggleSelectSession(session.id)}
                          />
                        </div>
                      )}
                      <div>
                        <div className={`p-4 border-b flex justify-between items-start ${isHappening ? 'bg-indigo-50' : 'bg-slate-50/70'} ${isTeacher && (scheduleTab === 'upcoming' || scheduleTab === 'completed') ? 'pl-11' : ''}`}>
                          <div>
                            <div className="flex flex-wrap items-center gap-1.5">
                              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-indigo-100 text-indigo-700 uppercase">
                                {session.subject || 'Lớp trực tuyến'}
                              </span>
                              {session.isCompleted && (
                                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700 uppercase flex items-center gap-1">
                                  <Check className="w-3 h-3" />
                                  Đã học xong
                                </span>
                              )}
                              {!session.isCompleted && isUserStudent && studentAttendance && (
                                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-100 text-blue-700 uppercase flex items-center gap-1">
                                  <Check className="w-3 h-3" />
                                  Đã tham gia
                                </span>
                              )}
                            </div>
                            <h4 className="font-bold text-slate-900 text-base mt-1.5">{session.title}</h4>
                          </div>

                          {isTeacher && (
                            <div className="flex items-center gap-1">
                              <button 
                                onClick={() => handleDeleteClick(session)}
                                className="p-2 text-slate-400 hover:text-rose-600 hover:bg-white rounded-xl transition-colors border border-transparent hover:border-slate-200"
                                title="Xóa buổi học"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          )}
                        </div>

                        <div className="p-5 space-y-3 text-xs text-slate-600">
                          <div className="flex items-center gap-2 font-semibold text-slate-800">
                            <CalendarIcon className="w-4 h-4 text-indigo-600 shrink-0" />
                            <span>{format(new Date(session.startTime), 'EEEE, dd/MM/yyyy', { locale: vi })}</span>
                          </div>

                          <div className="flex items-center gap-2 font-semibold text-slate-800">
                            <Clock className="w-4 h-4 text-indigo-600 shrink-0" />
                            <span>{format(new Date(session.startTime), 'HH:mm')} - {format(new Date(session.endTime), 'HH:mm')}</span>
                          </div>

                          {session.note && !session.isCompleted && (
                            <p className="p-2.5 bg-slate-50 rounded-xl text-slate-500 italic text-[11px] border border-slate-100">
                              Dặn dò chuẩn bị: {session.note}
                            </p>
                          )}

                          {session.isCompleted && session.completedNote && (
                            <div className="p-2.5 bg-emerald-50/50 rounded-xl border border-emerald-100 text-emerald-950">
                              <p className="font-bold text-[10px] uppercase text-emerald-800 mb-0.5 flex items-center gap-1">
                                <FileText className="w-3.5 h-3.5" />
                                Nhật ký & Ghi chú của Giáo viên:
                              </p>
                              <p className="text-xs italic font-medium">"{session.completedNote}"</p>
                            </div>
                          )}

                          {session.isCompleted && isTeacher && (
                            <div className="flex items-center gap-1.5 text-[11px] font-bold text-indigo-600 bg-indigo-50/30 p-2 rounded-xl border border-indigo-100">
                              <Users className="w-3.5 h-3.5" />
                              <span>Sĩ số tham gia: {session.attendedByStudents?.length || 0} học sinh</span>
                            </div>
                          )}

                          {session.isCompleted && isUserStudent && (
                            <div className="flex items-center gap-1.5 text-[11px] font-bold">
                              {studentAttendance ? (
                                <span className="text-emerald-600 bg-emerald-50 px-2.5 py-1 rounded-lg border border-emerald-200 flex items-center gap-1">
                                  <CheckCircle className="w-3.5 h-3.5" />
                                  Em đã tham gia lúc {format(new Date(studentAttendance.clickedAt), 'HH:mm')}
                                </span>
                              ) : (
                                <span className="text-rose-500 bg-rose-50 px-2.5 py-1 rounded-lg border border-rose-100 flex items-center gap-1">
                                  <X className="w-3.5 h-3.5" />
                                  Em chưa tham gia buổi học này
                                </span>
                              )}
                            </div>
                          )}
                        </div>
                      </div>

                      <div className="p-5 pt-0 space-y-2">
                        {!session.isCompleted ? (
                          <>
                            {session.isOnline === false ? (
                              <div className="w-full py-2.5 bg-slate-50 text-slate-700 font-extrabold text-xs rounded-xl flex items-center justify-center gap-2 border border-slate-200 shadow-xs">
                                📍 Học trực tiếp: {session.link || 'Tại trung tâm'}
                              </div>
                            ) : (
                              // Ở đây hình thức là Trực tuyến (online)
                              session.link && (session.link.startsWith('http') || session.link.startsWith('www')) ? (
                                <a 
                                  href={session.link}
                                  target="_blank"
                                  rel="noreferrer"
                                  onClick={() => handleJoinLinkClick(session)}
                                  className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-xl flex items-center justify-center gap-2 shadow-sm transition-colors"
                                >
                                  <Video className="w-4 h-4" />
                                  Vào phòng học trực tuyến
                                </a>
                              ) : (
                                <div className="w-full py-2.5 bg-indigo-50 text-indigo-700 font-bold text-xs rounded-xl flex items-center justify-center gap-2 border border-indigo-200">
                                  💻 Học trực tuyến (Chưa cập nhật link)
                                </div>
                              )
                            )}

                            {isTeacher && (
                              <div className="space-y-2">
                                <div className="grid grid-cols-2 gap-2">
                                  <button 
                                    onClick={() => handleOpenNotice(session)}
                                    className="py-2 text-emerald-700 bg-emerald-50 hover:bg-emerald-100 font-bold text-xs rounded-xl flex items-center justify-center gap-1.5 border border-emerald-200 transition-colors"
                                  >
                                    <Bell className="w-3.5 h-3.5 text-emerald-600" />
                                    Nhắc lịch
                                  </button>
                                  <button 
                                    onClick={() => handleOpenComplete(session)}
                                    className="py-2 text-indigo-700 bg-indigo-50 hover:bg-indigo-100 font-bold text-xs rounded-xl flex items-center justify-center gap-1.5 border border-indigo-200 transition-colors"
                                  >
                                    <Check className="w-3.5 h-3.5 text-indigo-600" />
                                    Đã học xong
                                  </button>
                                </div>
                                <button
                                  onClick={() => handleOpenEdit(session)}
                                  className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold text-xs rounded-xl flex items-center justify-center gap-1.5 shadow-xs hover:shadow-sm transition-all"
                                  title="Chỉnh sửa buổi học"
                                >
                                  <Edit2 className="w-3.5 h-3.5" />
                                  Chỉnh sửa buổi học
                                </button>
                              </div>
                            )}
                          </>
                        ) : (
                          <div className="flex gap-2">
                            <button
                              onClick={() => handleOpenDetails(session)}
                              className="flex-1 py-2 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 font-bold text-xs rounded-xl flex items-center justify-center gap-1.5 transition-colors"
                            >
                              <FileText className="w-3.5 h-3.5" />
                              Xem nhật ký & Sĩ số
                            </button>
                            {isTeacher && (
                              <>
                                <button
                                  onClick={() => handleOpenEdit(session)}
                                  className="px-3 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-xl flex items-center justify-center gap-1 transition-colors"
                                  title="Chỉnh sửa buổi học"
                                >
                                  <Edit2 className="w-3.5 h-3.5" />
                                  Sửa
                                </button>
                                <button
                                  onClick={() => handleRevertToUpcoming(session)}
                                  className="px-3 py-2 bg-slate-50 hover:bg-slate-100 text-slate-500 border border-slate-200 font-bold text-xs rounded-xl flex items-center justify-center transition-colors"
                                  title="Đưa về lịch học sắp tới"
                                >
                                  <Undo className="w-4 h-4" />
                                </button>
                              </>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            );
          })()}
        </div>

        {/* Right 1 col: Interactive Calendar & Reminders Note Box */}
        <div className="space-y-6">
          <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-sm space-y-5">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-slate-900 text-base flex items-center gap-2">
                <CalendarIcon className="w-5 h-5 text-indigo-600" />
                Lịch & Ghi chú nhắc học
              </h3>
            </div>

            {/* Calendar Controller Header */}
            <div className="flex items-center justify-between bg-slate-50 px-3 py-2 rounded-xl border border-slate-100">
              <button 
                type="button"
                onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}
                className="text-slate-600 hover:text-indigo-600 hover:bg-white px-2 py-1 rounded-lg transition-all font-bold text-sm"
              >
                &larr;
              </button>
              <span className="text-xs font-extrabold text-slate-800 uppercase tracking-wider">
                {format(currentMonth, 'MMMM yyyy', { locale: vi })}
              </span>
              <button 
                type="button"
                onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}
                className="text-slate-600 hover:text-indigo-600 hover:bg-white px-2 py-1 rounded-lg transition-all font-bold text-sm"
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
                    const hasNote = !!userNotes[formattedDayStr];
                    const hasSession = sessions.some(s => isSameDay(new Date(s.startTime), day));
                    const isSelected = selectedDate === formattedDayStr;
                    const isCurrentMonth = isSameMonth(day, currentMonth);

                    return (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => setSelectedDate(formattedDayStr)}
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
              <div className="flex justify-between items-center pb-1 border-b border-slate-200">
                <p className="text-xs font-bold text-slate-800">
                  Ngày {format(new Date(selectedDate), 'dd/MM/yyyy')}
                </p>
                {userNotes[selectedDate] && (
                  <button 
                    type="button"
                    onClick={() => {
                      const updated = { ...userNotes };
                      delete updated[selectedDate];
                      setUserNotes(updated);
                    }}
                    className="text-[10px] text-rose-500 hover:text-rose-700 font-bold"
                  >
                    Xóa ghi chú
                  </button>
                )}
              </div>

              {/* Sessions scheduled for selected date */}
              {(() => {
                const daySessions = sessions.filter(s => isSameDay(new Date(s.startTime), new Date(selectedDate)));
                if (daySessions.length > 0) {
                  return (
                    <div className="space-y-1.5">
                      <p className="text-[10px] font-bold text-indigo-800 uppercase tracking-wider">Buổi học trực tuyến:</p>
                      {daySessions.map(s => (
                        <div key={s.id} className="bg-white p-2 py-1.5 rounded-xl border border-indigo-100 text-xs flex justify-between items-center">
                          <div className="min-w-0 flex-1 pr-1.5">
                            <p className="font-extrabold text-slate-800 text-[11px] truncate">{s.title}</p>
                            <p className="text-[9px] text-slate-500 font-medium">{format(new Date(s.startTime), 'HH:mm')}</p>
                          </div>
                          {s.link ? (
                            <a 
                              href={s.link} 
                              target="_blank" 
                              rel="noreferrer" 
                              onClick={() => handleJoinLinkClick(s)}
                              className="text-[9px] bg-indigo-600 hover:bg-indigo-700 text-white font-bold px-2 py-0.5 rounded-lg shrink-0"
                            >
                              Vào học
                            </a>
                          ) : (
                            <span className="text-[9px] bg-slate-100 text-slate-500 font-bold px-2 py-0.5 rounded-lg shrink-0 border border-slate-200">
                              Offline
                            </span>
                          )}
                        </div>
                      ))}
                    </div>
                  );
                }
                return null;
              })()}

              <div className="space-y-1">
                <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Ghi chú nhắc nhở:</p>
                <div className="text-xs text-slate-600 bg-white p-2.5 rounded-xl border border-slate-200 leading-relaxed italic">
                  {userNotes[selectedDate] ? (
                    <p className="font-medium text-slate-700 not-italic">
                      📌 {userNotes[selectedDate]}
                    </p>
                  ) : (
                    <p className="text-slate-400">Không có ghi chú nhắc nhở học tập nào cho ngày này.</p>
                  )}
                </div>
              </div>

              <div className="space-y-2 pt-2 border-t border-slate-200">
                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                  {userNotes[selectedDate] ? 'Sửa ghi chú nhắc nhở:' : 'Thêm ghi chú/nhắc nhở mới:'}
                </label>
                <textarea 
                  rows={2}
                  value={currentNote}
                  onChange={e => setCurrentNote(e.target.value)}
                  placeholder="VD: Nhắc học sinh mở máy chuẩn bị vào học lúc 19h..."
                  className="w-full p-2.5 bg-white border border-slate-300 text-xs rounded-xl outline-none focus:ring-2 focus:ring-indigo-500 resize-none font-medium"
                />
                <button 
                  onClick={handleSaveNote}
                  className="w-full py-2 bg-indigo-600 text-white font-bold text-xs rounded-xl hover:bg-indigo-700 shadow-sm transition-all uppercase tracking-wider text-[10px]"
                >
                  {userNotes[selectedDate] ? 'Cập nhật ghi chú' : 'Lưu ghi chú lịch học'}
                </button>
              </div>
            </div>
          </div>
        </div>

      </div>
      )}

      {/* TEACHER CREATE/EDIT MODAL */}
      {showModal && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <form onSubmit={handleSaveSession} className="bg-white border border-slate-200 rounded-3xl w-full max-w-lg shadow-2xl flex flex-col max-h-[95vh] sm:max-h-[90vh]">
            {/* Header */}
            <div className="flex justify-between items-center border-b border-slate-100 p-4 sm:p-5 shrink-0">
              <h3 className="font-bold text-slate-900 text-sm sm:text-base">
                {editingSession ? 'Chỉnh sửa Buổi học & Link phòng' : 'Tạo Buổi học mới'}
              </h3>
              <button type="button" onClick={() => setShowModal(false)} className="text-slate-400 hover:text-slate-700 p-1 rounded-full bg-slate-50 hover:bg-slate-100 transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Scrollable Body */}
            <div className="overflow-y-auto custom-scrollbar p-4 sm:p-5 space-y-4 text-xs sm:text-sm">
              <div>
                <label className="block font-bold text-slate-700 mb-1.5">Tên buổi học:</label>
                <input 
                  required type="text"
                  value={title} onChange={e => setTitle(e.target.value)}
                  className="w-full p-2.5 sm:p-3 bg-slate-50/50 border border-slate-300 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white transition-all font-medium"
                  placeholder="VD: Đại số 10 - Tiết 24: Bài tập Ôn tập"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1.5">Môn học:</label>
                <CustomSelect
                  value={subject}
                  onChange={val => setSubject(val)}
                  options={[
                    { value: 'Toán Học', label: 'Toán Học' },
                    { value: 'Vật Lý', label: 'Vật Lý' },
                    { value: 'Hóa Học', label: 'Hóa Học' },
                    { value: 'Tiếng Anh', label: 'Tiếng Anh' },
                  ]}
                  size="md"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <DateTimePicker24h
                  label="Thời gian bắt đầu 24H:"
                  value={startTime}
                  onChange={setStartTime}
                  required
                />
                <DateTimePicker24h
                  label="Thời gian kết thúc 24H:"
                  value={endTime}
                  onChange={setEndTime}
                  required
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1.5">Hình thức học:</label>
                <div className="grid grid-cols-2 gap-3 p-1 bg-slate-100 rounded-xl mb-3">
                  <button
                    type="button"
                    onClick={() => setIsOnline(true)}
                    className={`py-2 text-xs font-extrabold rounded-lg transition-all flex items-center justify-center gap-2 ${
                      isOnline
                        ? 'bg-white text-indigo-700 shadow-sm border border-slate-200/50'
                        : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50/50'
                    }`}
                  >
                    <Video className="w-3.5 h-3.5" />
                    Trực tuyến (Online)
                  </button>
                  <button
                    type="button"
                    onClick={() => setIsOnline(false)}
                    className={`py-2 text-xs font-extrabold rounded-lg transition-all flex items-center justify-center gap-2 ${
                      !isOnline
                        ? 'bg-white text-indigo-700 shadow-sm border border-slate-200/50'
                        : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50/50'
                    }`}
                  >
                    <Users className="w-3.5 h-3.5" />
                    Trực tiếp (Offline)
                  </button>
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1.5">
                  {isOnline ? 'Link Phòng học trực tuyến (Tùy chọn):' : 'Địa điểm / Địa chỉ học trực tiếp (Tùy chọn):'}
                </label>
                <input 
                  type="text"
                  value={link} onChange={e => setLink(e.target.value)}
                  className="w-full p-2.5 sm:p-3 bg-slate-50/50 border border-slate-300 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white transition-all font-medium"
                  placeholder={isOnline ? 'https://meet.google.com/... (Hoặc để trống)' : 'VD: Phòng 302, Tòa nhà A (Hoặc để trống)'}
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1.5">Ghi chú dặn dò học sinh trước buổi học:</label>
                <textarea 
                  rows={2}
                  value={note} onChange={e => setNote(e.target.value)}
                  className="w-full p-2.5 sm:p-3 bg-slate-50/50 border border-slate-300 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white transition-all font-medium resize-none"
                  placeholder="Yêu cầu chuẩn bị tài liệu..."
                />
              </div>

              {/* Mark Completed Switch & Ghi chú nhật ký */}
              <div className="border-t border-slate-100 pt-4 space-y-3">
                <label className="flex items-center gap-3 font-bold text-slate-700 cursor-pointer select-none p-3 bg-slate-50 rounded-xl border border-slate-100 hover:bg-indigo-50 hover:border-indigo-100 transition-colors">
                  <input 
                    type="checkbox"
                    checked={formIsCompleted}
                    onChange={e => setFormIsCompleted(e.target.checked)}
                    className="w-4.5 h-4.5 sm:w-5 sm:h-5 text-indigo-600 border-slate-300 rounded focus:ring-indigo-500 cursor-pointer"
                  />
                  <span className="text-indigo-950 font-extrabold text-xs sm:text-sm">Đánh dấu buổi học này đã học xong (Đã hoàn thành)</span>
                </label>

                {formIsCompleted && (
                  <div className="space-y-2 p-4 bg-indigo-50/40 rounded-2xl border border-indigo-100/70">
                    <label className="block font-bold text-indigo-900 text-xs sm:text-sm flex items-center gap-1.5">
                      <FileText className="w-4 h-4 text-indigo-600" />
                      Nhật ký & Ghi chú dạy học của Giáo viên:
                    </label>
                    <textarea 
                      rows={2}
                      value={formCompletedNote}
                      onChange={e => setFormCompletedNote(e.target.value)}
                      className="w-full p-2.5 sm:p-3 bg-white border border-slate-300 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500 font-medium text-xs sm:text-sm resize-none transition-all"
                      placeholder="Ghi nhận nội dung đã học, dặn dò bài tập về nhà..."
                    />
                    <p className="text-[10px] sm:text-[11px] text-slate-500 font-medium italic leading-relaxed">
                      Khi đánh dấu hoàn thành, buổi học sẽ xuất hiện trực tiếp trong mục Thống kê & Nhật ký học tập của tháng.
                    </p>
                  </div>
                )}
              </div>
            </div>

            {/* Footer Actions */}
            <div className="p-4 sm:p-5 border-t border-slate-100 flex justify-end gap-3 shrink-0 bg-slate-50/50 rounded-b-3xl">
              <button type="button" onClick={() => setShowModal(false)} className="px-5 py-2.5 font-bold text-slate-600 bg-white border border-slate-200 hover:bg-slate-50 hover:text-slate-800 rounded-xl transition-colors text-xs sm:text-sm">
                Hủy bỏ
              </button>
              <button type="submit" className="px-6 py-2.5 bg-indigo-600 text-white font-bold rounded-xl hover:bg-indigo-700 shadow-sm transition-all active:scale-95 text-xs sm:text-sm">
                Lưu buổi học
              </button>
            </div>
          </form>
        </div>
      )}

      {/* NOTIFICATION MODAL */}
      {notifyModal && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-3xl w-full max-w-lg shadow-2xl p-6 space-y-4">
            <div className="flex justify-between items-center border-b border-slate-100 pb-3">
              <h3 className="font-bold text-slate-900 text-base flex items-center gap-2">
                <Bell className="w-5 h-5 text-emerald-600" />
                Thông báo Lịch học trực tuyến
              </h3>
              <button onClick={() => setNotifyModal(false)} className="text-slate-400 hover:text-slate-700 p-1 rounded-full">
                <X className="w-5 h-5" />
              </button>
            </div>

            <textarea 
              rows={7} 
              readOnly
              value={notifyMsg}
              className="w-full p-3 bg-emerald-50/50 border border-emerald-200 rounded-xl text-xs font-mono text-emerald-950 outline-none"
            />

            <div className="flex justify-end gap-3 pt-2">
              <button 
                onClick={() => {
                  navigator.clipboard.writeText(notifyMsg);
                  setCopied(true);
                  setTimeout(() => setCopied(false), 2000);
                }}
                className="px-4 py-2 bg-emerald-600 text-white font-bold text-xs rounded-xl hover:bg-emerald-700 shadow-sm flex items-center gap-1.5"
              >
                <Copy className="w-4 h-4" />
                {copied ? 'Đã sao chép!' : 'Sao chép tin nhắn thông báo'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* COMPLETE SESSION MODAL */}
      {showCompleteModal && completingSession && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-white border border-slate-200 rounded-3xl w-full max-w-md shadow-2xl p-6 space-y-4">
            <div className="flex justify-between items-center border-b border-slate-100 pb-3">
              <h3 className="font-bold text-slate-900 text-base flex items-center gap-1.5">
                <CheckCircle className="w-5 h-5 text-indigo-600" />
                Hoàn thành buổi học
              </h3>
              <button 
                onClick={() => setShowCompleteModal(false)} 
                className="text-slate-400 hover:text-slate-700 p-1 rounded-full transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3">
              <div>
                <p className="text-[10px] uppercase font-bold text-slate-400">Buổi học:</p>
                <p className="font-extrabold text-slate-800 text-sm">{completingSession.title}</p>
                <p className="text-xs text-slate-500 font-semibold">{completingSession.subject} • {format(new Date(completingSession.startTime), 'HH:mm dd/MM/yyyy')}</p>
              </div>

              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-slate-700">Ghi chú dạy học / Nhật ký buổi học:</label>
                <textarea
                  rows={4}
                  value={completedNoteInput}
                  onChange={e => setCompletedNoteInput(e.target.value)}
                  placeholder="Ghi nhận nội dung đã học, dặn dò bài tập về nhà cho học sinh sau buổi học..."
                  className="w-full p-3 bg-slate-50 border border-slate-300 rounded-2xl text-xs outline-none focus:ring-2 focus:ring-indigo-500 font-medium resize-none"
                />
                <p className="text-[10px] text-slate-400 italic">Nhập ghi chú này để học sinh và phụ huynh có thể xem lại nội dung buổi học trực tuyến bất cứ lúc nào.</p>
              </div>
            </div>

            <div className="pt-3 flex justify-end gap-2 border-t border-slate-100">
              <button 
                type="button" 
                onClick={() => setShowCompleteModal(false)} 
                className="px-4 py-2 font-bold text-slate-600 hover:bg-slate-100 rounded-xl text-xs"
              >
                Hủy bỏ
              </button>
              <button 
                type="button"
                onClick={handleConfirmComplete}
                className="px-5 py-2 bg-indigo-600 text-white font-bold rounded-xl hover:bg-indigo-700 shadow-sm text-xs flex items-center gap-1"
              >
                <Check className="w-4 h-4" />
                Xác nhận đã học xong
              </button>
            </div>
          </div>
        </div>
      )}

      {/* VIEW DETAILS & ATTENDANCE MODAL */}
      {showDetailsModal && viewingSessionDetails && (() => {
        const sessionStudents = allUsers.filter(u => u.role === 'student');
        const classStudents = sessionStudents.filter(u => isClassMatching(viewingSessionDetails.className, u.className));
        const searchedStudents = sessionStudents.filter(student => {
          const nameMatch = (student.name || '').toLowerCase().includes(attendanceSearchQuery.toLowerCase());
          const classMatch = (student.className || '').toLowerCase().includes(attendanceSearchQuery.toLowerCase());
          return nameMatch || classMatch;
        });

        return (
          <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-fade-in">
            <div className="bg-white border border-slate-200 rounded-3xl w-full max-w-lg shadow-2xl p-6 space-y-4 max-h-[90vh] overflow-y-auto scrolling-touch">
              <div className="flex justify-between items-center border-b border-slate-100 pb-3">
                <h3 className="font-bold text-slate-900 text-base flex items-center gap-1.5">
                  <FileText className="w-5 h-5 text-indigo-600" />
                  Nhật ký buổi học trực tuyến
                </h3>
                <button 
                  onClick={() => setShowDetailsModal(false)} 
                  className="text-slate-400 hover:text-slate-700 p-1 rounded-full transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="space-y-4 text-xs text-slate-700">
                <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100 space-y-1">
                  <span className="text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded-md bg-indigo-100 text-indigo-700">
                    {viewingSessionDetails.subject}
                  </span>
                  <h4 className="font-extrabold text-slate-900 text-base mt-1.5">{viewingSessionDetails.title}</h4>
                  <div className="flex flex-wrap gap-x-4 gap-y-1 text-slate-500 font-medium pt-1">
                    <p>📅 Ngày học: <strong>{format(new Date(viewingSessionDetails.startTime), 'dd/MM/yyyy')}</strong></p>
                    <p>⏰ Thời gian: <strong>{format(new Date(viewingSessionDetails.startTime), 'HH:mm')} - {format(new Date(viewingSessionDetails.endTime), 'HH:mm')}</strong></p>
                  </div>
                </div>

                {/* Teaching logs and Notes */}
                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <h5 className="font-bold text-slate-900 text-sm flex items-center gap-1">
                      <FileText className="w-4 h-4 text-indigo-600" />
                      Nội dung bài học & Ghi chú dặn dò
                    </h5>
                    {isTeacher && !editingCompletedNote && (
                      <button
                        onClick={() => setEditingCompletedNote(true)}
                        className="text-indigo-600 hover:text-indigo-800 font-bold hover:underline"
                      >
                        Sửa ghi chú
                      </button>
                    )}
                  </div>

                  {editingCompletedNote ? (
                    <div className="space-y-2 bg-indigo-50/20 p-3 rounded-2xl border border-indigo-100">
                      <textarea
                        rows={3}
                        value={editCompletedNoteInput}
                        onChange={e => setEditCompletedNoteInput(e.target.value)}
                        placeholder="Nội dung đã học, dặn dò bài tập về nhà..."
                        className="w-full p-2.5 bg-white border border-slate-300 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500 font-medium text-xs resize-none"
                      />
                      <div className="flex justify-end gap-1.5">
                        <button
                          onClick={() => {
                            setEditingCompletedNote(false);
                            setEditCompletedNoteInput(viewingSessionDetails.completedNote || '');
                          }}
                          className="px-3 py-1 bg-slate-100 hover:bg-slate-200 text-slate-600 font-bold rounded-lg"
                        >
                          Hủy
                        </button>
                        <button
                          onClick={handleSaveCompletedNote}
                          className="px-3 py-1 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-lg"
                        >
                          Lưu ghi chú
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="p-3.5 bg-emerald-50/50 rounded-2xl border border-emerald-100 leading-relaxed text-slate-700 italic">
                      {viewingSessionDetails.completedNote ? (
                        <p className="not-italic font-medium">"{viewingSessionDetails.completedNote}"</p>
                      ) : (
                        <p className="text-slate-400 text-center py-2 font-medium">Giáo viên không để lại ghi chú nào cho buổi học này.</p>
                      )}
                    </div>
                  )}
                </div>

                {/* Attendance Checklist list */}
                <div className="space-y-3 pt-3 border-t border-slate-100">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <h5 className="font-bold text-slate-900 text-sm flex items-center gap-1">
                      <Users className="w-4 h-4 text-indigo-600" />
                      Sĩ số tham gia học trực tuyến ({isTeacher ? modalAttendedStudents.length : (viewingSessionDetails.attendedByStudents?.length || 0)} học sinh)
                    </h5>
                    {isTeacher && classStudents.length > 0 && (
                      <button
                        type="button"
                        onClick={() => handleSelectAllClassStudents(classStudents)}
                        className="text-[10px] text-indigo-600 hover:text-indigo-850 font-black bg-indigo-50 hover:bg-indigo-100/80 px-2.5 py-1 rounded-lg transition-colors border border-indigo-100 self-start sm:self-auto"
                      >
                        {classStudents.every(student => modalAttendedStudents.some(s => s.studentId === student.id))
                          ? "Hủy chọn nhanh lớp"
                          : `Chọn nhanh lớp ${viewingSessionDetails.className}`}
                      </button>
                    )}
                  </div>

                  {isTeacher ? (
                    <div className="space-y-2">
                      {/* Search */}
                      <div className="relative">
                        <input
                          type="text"
                          placeholder="Tìm kiếm tên học sinh hoặc lớp..."
                          value={attendanceSearchQuery}
                          onChange={e => setAttendanceSearchQuery(e.target.value)}
                          className="w-full pl-8 pr-4 py-2 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500 font-medium text-xs bg-slate-50"
                        />
                        <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5" />
                      </div>

                      <div className="max-h-[220px] overflow-y-auto scrolling-touch border border-slate-200 rounded-2xl divide-y divide-slate-100 bg-white">
                        {searchedStudents.length > 0 ? (
                          searchedStudents.map((student) => {
                            const isAttended = modalAttendedStudents.some(s => s.studentId === student.id);
                            const attendedObj = modalAttendedStudents.find(s => s.studentId === student.id);
                            return (
                              <label 
                                key={student.id} 
                                className="p-3 hover:bg-slate-50/80 flex items-center justify-between font-medium cursor-pointer transition-colors"
                              >
                                <div className="flex items-center gap-2.5">
                                  <input
                                    type="checkbox"
                                    checked={isAttended}
                                    onChange={() => handleToggleStudentAttendance(student.id, student.name || 'Học sinh')}
                                    className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-600 cursor-pointer h-4 w-4"
                                  />
                                  <div className="flex flex-col">
                                    <span className="text-slate-800 font-extrabold text-xs">{student.name}</span>
                                    {student.className && (
                                      <span className="text-[10px] text-slate-400 font-bold">Lớp: {student.className}</span>
                                    )}
                                  </div>
                                </div>
                                {isAttended && (
                                  <span className="text-[9px] text-emerald-600 bg-emerald-50 border border-emerald-100 px-2 py-0.5 rounded-lg font-bold">
                                    {attendedObj?.clickedAt && attendedObj.clickedAt !== student.id && !attendedObj.clickedAt.includes('session_import')
                                      ? `Có mặt (${format(new Date(attendedObj.clickedAt), 'HH:mm')})` 
                                      : 'Có mặt'}
                                  </span>
                                )}
                              </label>
                            );
                          })
                        ) : (
                          <div className="py-8 text-center text-slate-400 font-medium">
                            Không tìm thấy học sinh nào phù hợp.
                          </div>
                        )}
                      </div>

                      <button
                        type="button"
                        onClick={handleSaveAttendance}
                        disabled={isSavingAttendance}
                        className="w-full py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-xl transition-all shadow-sm active:scale-[0.98] disabled:opacity-50"
                      >
                        {isSavingAttendance ? 'Đang cập nhật...' : 'Lưu kết quả điểm danh'}
                      </button>
                    </div>
                  ) : (
                    <div className="max-h-[220px] overflow-y-auto scrolling-touch border border-slate-100 rounded-2xl divide-y divide-slate-100">
                      {viewingSessionDetails.attendedByStudents && viewingSessionDetails.attendedByStudents.length > 0 ? (
                        viewingSessionDetails.attendedByStudents.map((student, index) => (
                          <div key={index} className="p-3 bg-white hover:bg-slate-50 flex justify-between items-center font-medium">
                            <div className="flex items-center gap-2">
                              <div className="w-6 h-6 rounded-full bg-indigo-50 text-indigo-700 flex items-center justify-center font-bold text-[10px]">
                                {index + 1}
                              </div>
                              <span className="text-slate-800 font-extrabold">{student.studentName}</span>
                            </div>
                            <span className="text-[10px] text-slate-400 bg-slate-100 px-2 py-0.5 rounded-lg font-bold">
                              Đã tham gia: {student.clickedAt && !student.clickedAt.includes('session_import') ? format(new Date(student.clickedAt), 'HH:mm, dd/MM') : 'Có mặt'}
                            </span>
                          </div>
                        ))
                      ) : (
                        <div className="py-8 text-center text-slate-400 font-medium">
                          Chưa ghi nhận học sinh nào tham gia phòng học trực tuyến này.
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>

              <div className="pt-3 flex justify-end gap-2 border-t border-slate-100">
                {isTeacher && (
                  <button
                    type="button"
                    onClick={() => {
                      handleRevertToUpcoming(viewingSessionDetails);
                    }}
                    className="px-4 py-2 font-bold text-rose-600 hover:bg-rose-50 border border-transparent hover:border-rose-100 rounded-xl text-xs mr-auto flex items-center gap-1 transition-colors"
                  >
                    <Undo className="w-3.5 h-3.5" />
                    Khôi phục lịch học
                  </button>
                )}
                <button 
                  type="button" 
                  onClick={() => setShowDetailsModal(false)} 
                  className="px-5 py-2.5 bg-slate-900 hover:bg-slate-800 text-white font-bold rounded-xl text-xs transition-colors shadow-sm"
                >
                  Đóng lại
                </button>
              </div>
            </div>
          </div>
        );
      })()}
      {/* Session Deletion Confirm Modal */}
      <ConfirmModal
        isOpen={showDeleteConfirm}
        onClose={() => setShowDeleteConfirm(false)}
        onConfirm={handleConfirmDelete}
        title="Xóa buổi học trực tuyến"
        message={`Bạn có chắc chắn muốn xóa buổi học "${sessionToDelete?.title}"? Hành động này không thể hoàn tác.`}
        confirmText="Xóa buổi học"
        cancelText="Hủy bỏ"
        variant="danger"
        loading={isDeletingSession}
      />

      <ConfirmModal
        isOpen={showBulkDeleteConfirm}
        onClose={() => setShowBulkDeleteConfirm(false)}
        onConfirm={handleConfirmBulkDelete}
        title="Xóa hàng loạt lịch học"
        message={`Bạn có chắc chắn muốn xóa ${selectedSessionIds.size} lịch học đã chọn? Hành động này không thể hoàn tác.`}
        confirmText={`Xóa ${selectedSessionIds.size} mục`}
        cancelText="Hủy bỏ"
        variant="danger"
        loading={isBulkDeleting}
      />



      {/* Screen-Wide Image Lightbox for Student Uploaded Receipts */}
      {receiptLightboxUrl && (
        <div className="fixed inset-0 bg-slate-950/90 flex items-center justify-center p-4 z-55 animate-fade-in">
          <div className="relative max-w-3xl max-h-[90vh] bg-slate-900 rounded-3xl overflow-hidden border border-slate-800 shadow-2xl flex flex-col">
            <button
              type="button"
              onClick={() => setReceiptLightboxUrl(null)}
              className="absolute right-4 top-4 bg-slate-950/80 hover:bg-slate-950 p-2 text-white hover:text-slate-300 rounded-full transition-colors z-20"
            >
              <X className="w-5 h-5" />
            </button>
            <div className="flex-1 overflow-auto p-4 flex items-center justify-center min-h-0">
              <img 
                src={receiptLightboxUrl} 
                alt="Chi tiết ảnh chụp màn hình giao dịch" 
                referrerPolicy="no-referrer"
                className="max-w-full max-h-[80vh] object-contain rounded-2xl" 
              />
            </div>
          </div>
        </div>
      )}

      {/* Interactive Tuition Payment Workflow Demo Modal */}
      {showTuitionDemoModal && (
        <TuitionPaymentDemoModal
          isOpen={showTuitionDemoModal}
          onClose={() => setShowTuitionDemoModal(false)}
          onApplySampleData={async (sampleSetting, sampleReceipt) => {
            // Apply sample setting to local state & storage
            setTuitionSettings(prev => {
              const next = [sampleSetting, ...prev.filter(s => s.id !== sampleSetting.id && s.className !== sampleSetting.className)];
              try {
                localStorage.setItem('educonnect_tuition_settings', JSON.stringify(next));
              } catch (e) {
                console.error(e);
              }
              return next;
            });

            // Apply sample receipt to local state & storage
            setTuitionReceipts(prev => {
              const next = [sampleReceipt, ...prev.filter(r => r.id !== sampleReceipt.id)];
              try {
                localStorage.setItem('educonnect_tuition_receipts', JSON.stringify(next));
              } catch (e) {
                console.error(e);
              }
              return next;
            });

            setNotification({
              message: `Đã nạp thành công dữ liệu mẫu học phí cho lớp ${sampleSetting.className}!`,
              type: 'success'
            });
            setTimeout(() => setNotification(null), 4000);

            try {
              await setDoc(doc(db, 'tuition_settings', sampleSetting.id), sampleSetting, { merge: true });
            } catch (err) {
              console.warn("Save sample setting warning:", err);
            }

            try {
              await setDoc(doc(db, 'tuition_receipts', sampleReceipt.id), sampleReceipt, { merge: true });
            } catch (err) {
              console.warn("Save sample receipt warning:", err);
            }
          }}
        />
      )}

    </div>
  );
}

interface StudentTuitionTabContentProps {
  user: User;
  studentHours: number;
  studentTuitionSetting: TuitionSetting | null;
  studentTuitionStatus?: any;
  tuitionReceipts: TuitionReceipt[];
  onUploadScreenshot: (e: React.ChangeEvent<HTMLInputElement>) => void;
  isUploadingTuition: boolean;
  tuitionUploadSuccess: boolean;
  onResetUploadSuccess: () => void;
  onViewImageLightbox?: (url: string) => void;
}

const StudentTuitionTabContent: React.FC<StudentTuitionTabContentProps> = ({
  user,
  studentHours,
  studentTuitionSetting,
  studentTuitionStatus,
  tuitionReceipts,
  onUploadScreenshot,
  isUploadingTuition,
  tuitionUploadSuccess,
  onResetUploadSuccess,
  onViewImageLightbox
}) => {
  const [copiedField, setCopiedField] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const limitHours = studentTuitionSetting?.limitHours || 20;
  const tuitionFee = studentTuitionSetting?.tuitionFee || 1500000;
  const isUnlocked = studentHours >= limitHours;
  const progressPercent = Math.min((studentHours / limitHours) * 100, 100);
  const excessHours = Math.max(0, studentHours - limitHours);

  // Filter student receipts
  const studentReceipts = tuitionReceipts.filter(r => r.studentId === user.id).sort((a,b) => b.paidAt.localeCompare(a.paidAt));

  const handleCopy = (text: string, field: string) => {
    navigator.clipboard.writeText(text);
    setCopiedField(field);
    setTimeout(() => setCopiedField(null), 2000);
  };

  const qrBankId = studentTuitionSetting?.qrBankId || 'MBBank';
  const qrAccountNumber = studentTuitionSetting?.qrAccountNumber || '0901234567';
  const qrAccountName = studentTuitionSetting?.qrAccountName || 'NGUYEN VAN A';
  const transferMsg = generateTransferContent(
    studentTuitionSetting?.transferContentTemplate,
    user,
    studentTuitionSetting?.className || user.className || ''
  );

  const qrUrl = `https://img.vietqr.io/image/${qrBankId}-${qrAccountNumber}-compact2.png?amount=${tuitionFee}&addInfo=${encodeURIComponent(transferMsg)}&accountName=${encodeURIComponent(qrAccountName)}`;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 pb-10">
      {/* Left panel: Hours Progress circular widget & Receipts list */}
      <div className="lg:col-span-5 space-y-6">
        <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm text-center space-y-6">
          <div>
            <h3 className="font-extrabold text-slate-900 text-sm">Tiến độ đợt học hiện tại</h3>
            <p className="text-slate-400 text-[11px] font-medium mt-0.5">Thời lượng đã học tích lũy từ lần đóng học phí gần nhất</p>
          </div>

          {/* Circular progress container */}
          <div className="relative w-44 h-44 mx-auto flex items-center justify-center">
            {/* Background Circle */}
            <svg className="w-full h-full transform -rotate-90">
              <circle
                cx="88"
                cy="88"
                r="74"
                className="stroke-slate-100"
                strokeWidth="12"
                fill="transparent"
              />
              {/* Foreground Circle */}
              <circle
                cx="88"
                cy="88"
                r="74"
                className={`transition-all duration-500 ease-out ${
                  isUnlocked ? 'stroke-rose-500' : 'stroke-indigo-600'
                }`}
                strokeWidth="12"
                fill="transparent"
                strokeDasharray={String(2 * Math.PI * 74)}
                strokeDashoffset={String(2 * Math.PI * 74 * (1 - progressPercent / 100))}
                strokeLinecap="round"
              />
            </svg>

            {/* Central hours reading */}
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className={`text-4xl font-black ${isUnlocked ? 'text-rose-600' : 'text-slate-900'}`}>
                {studentHours.toFixed(1)}
              </span>
              <span className="text-slate-400 text-[10px] font-bold uppercase tracking-wider mt-1">
                / {limitHours} Giờ học
              </span>
            </div>
          </div>

          {/* Progress Summary Info */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs font-bold px-1 text-slate-600">
              <span>Đạt tiêu chuẩn đóng học phí</span>
              <span className={isUnlocked ? 'text-rose-600' : 'text-indigo-600'}>
                {progressPercent.toFixed(0)}%
              </span>
            </div>
            
            {/* Helper status text */}
            <div className={`p-3.5 rounded-2xl text-xs font-bold leading-relaxed border ${
              isUnlocked 
                ? 'bg-rose-50/50 border-rose-200 text-rose-800' 
                : 'bg-slate-50 border-slate-200 text-slate-500'
            }`}>
              {isUnlocked ? (
                <div className="flex gap-2 items-start text-left">
                  <AlertCircle className="w-4 h-4 shrink-0 text-rose-600 mt-0.5" />
                  <span>Em đã học đủ {limitHours} giờ. Hãy tiến hành thanh toán học phí đợt này bên tay phải nhé!</span>
                </div>
              ) : (
                <div className="flex gap-2 items-start text-left">
                  <Clock className="w-4 h-4 shrink-0 text-slate-400 mt-0.5" />
                  <span>Cần học thêm {(limitHours - studentHours).toFixed(1)} giờ nữa để đủ tiến độ đóng học phí đợt tiếp theo.</span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Lịch sử biên lai học phí */}
        <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm space-y-4">
          <div>
            <h3 className="font-extrabold text-slate-900 text-sm">Lịch sử Biên lai</h3>
            <p className="text-slate-400 text-[11px] font-medium mt-0.5">Biên lai và ảnh chụp màn hình chuyển khoản đã được mộc</p>
          </div>

          <div className="space-y-2 max-h-[220px] overflow-y-auto pr-1">
            {studentReceipts.length === 0 ? (
              <div className="p-8 text-center text-slate-400 font-medium text-xs border border-dashed border-slate-200 rounded-2xl">
                Chưa có dữ liệu biên lai giao dịch nào.
              </div>
            ) : (
              studentReceipts.map(receipt => (
                <div key={receipt.id} className="p-3 bg-slate-50 hover:bg-slate-100 rounded-2xl border border-slate-200/60 transition-colors flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2.5">
                    <div className="p-2.5 bg-emerald-100 text-emerald-800 rounded-xl">
                      <Award className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="text-xs font-extrabold text-slate-800">
                        {receipt.amount.toLocaleString('vi-VN')} VNĐ
                      </div>
                      <div className="text-[10px] text-slate-400 font-bold">
                        Đã nộp: {format(new Date(receipt.paidAt), 'HH:mm dd/MM/yyyy')}
                      </div>
                    </div>
                  </div>
                  {/* Status Stamped */}
                  <span className="text-[10px] font-extrabold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full flex items-center gap-0.5 shadow-2xs">
                    <Check className="w-3 h-3 stroke-[3px]" />
                    Đã mộc
                  </span>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Right panel: Payment screen or lock screen */}
      <div className="lg:col-span-7">
        {!isUnlocked ? (
          /* Lock screen if hours not enough */
          <div className="bg-white p-8 rounded-3xl border border-slate-200 shadow-sm text-center py-16 space-y-6 flex flex-col items-center justify-center h-full min-h-[450px]">
            <div className="w-16 h-16 bg-slate-100 rounded-3xl flex items-center justify-center text-slate-400 shadow-3xs border border-slate-200/60">
              <Clock className="w-8 h-8" />
            </div>
            <div className="space-y-2 max-w-md">
              <h3 className="font-extrabold text-slate-800 text-base">Cổng thanh toán chưa mở</h3>
              <p className="text-slate-500 text-xs font-semibold leading-relaxed">
                Để tránh đóng học phí sớm không đúng tiến độ, cổng thanh toán học phí sẽ chỉ kích hoạt sau khi em tích lũy đủ <span className="text-indigo-600 font-extrabold">{limitHours}</span> giờ học thực tế.
              </p>
            </div>
            <div className="w-full max-w-sm bg-slate-50/60 p-4 rounded-2xl border border-slate-200/50 space-y-2 text-left">
              <div className="flex justify-between text-xs font-bold text-slate-600">
                <span>Số giờ hiện tại:</span>
                <span>{studentHours.toFixed(1)} / {limitHours} giờ</span>
              </div>
              <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                <div 
                  className="bg-indigo-600 h-full transition-all duration-500" 
                  style={{ width: `${progressPercent}%` }}
                />
              </div>
            </div>
          </div>
        ) : (
          /* Unlocked standard billing interface with VietQR */
          <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm space-y-6">
            <div className="border-b border-slate-100 pb-3">
              <h3 className="font-black text-slate-900 text-sm tracking-tight flex items-center gap-1.5">
                <Sparkles className="w-4 h-4 text-amber-500 animate-pulse" />
                CỔNG THANH TOÁN HỌC PHÍ TRỰC TUYẾN
              </h3>
              <p className="text-slate-500 text-[11px] font-medium mt-0.5">Sử dụng ứng dụng ngân hàng bất kỳ để quét mã VietQR chuyển khoản nhanh</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-center">
              {/* Credit card credentials panel */}
              <div className="space-y-4">
                {/* Credit Card layout */}
                <div className="bg-gradient-to-br from-indigo-900 via-indigo-950 to-slate-900 text-white rounded-2xl p-5 shadow-md border border-indigo-950 relative overflow-hidden space-y-6">
                  {/* Backdrop elements */}
                  <div className="absolute right-0 top-0 w-24 h-24 bg-white/5 rounded-full blur-xl pointer-events-none" />
                  
                  <div className="flex justify-between items-center">
                    <span className="text-[10px] font-extrabold uppercase tracking-widest text-indigo-200">VIETQR TRANSFER CARD</span>
                    <span className="text-xs font-black italic tracking-wide text-white bg-indigo-600/60 border border-indigo-500/30 px-2 py-0.5 rounded-md">{qrBankId}</span>
                  </div>

                  <div className="space-y-1">
                    <span className="text-[9px] font-semibold text-indigo-300 block">SỐ TÀI KHOẢN</span>
                    <span className="text-lg font-black tracking-wider block font-mono">{qrAccountNumber}</span>
                  </div>

                  <div className="flex justify-between items-end">
                    <div className="space-y-1">
                      <span className="text-[9px] font-semibold text-indigo-300 block">CHỦ TÀI KHOẢN</span>
                      <span className="text-xs font-extrabold tracking-wide uppercase block">{qrAccountName}</span>
                    </div>
                    <div className="text-right space-y-1">
                      <span className="text-[9px] font-semibold text-indigo-300 block">SỐ TIỀN</span>
                      <span className="text-sm font-black text-amber-400 block">{tuitionFee.toLocaleString('vi-VN')}đ</span>
                    </div>
                  </div>
                </div>

                {/* Copyable credentials list */}
                <div className="space-y-2 text-xs font-bold text-slate-700">
                  <div className="p-3 bg-slate-50 border border-slate-200 rounded-2xl flex justify-between items-center gap-2">
                    <div className="truncate">
                      <span className="text-slate-400 font-semibold block text-[10px]">TÊN NGÂN HÀNG</span>
                      <span className="font-extrabold">{qrBankId}</span>
                    </div>
                    <button 
                      type="button" 
                      onClick={() => handleCopy(qrBankId, 'bank')}
                      className="text-[10px] px-2 py-1 hover:bg-slate-200 rounded-lg text-indigo-600 font-bold transition-all shrink-0 border border-slate-200 bg-white"
                    >
                      {copiedField === 'bank' ? 'Đã sao chép' : 'Sao chép'}
                    </button>
                  </div>

                  <div className="p-3 bg-slate-50 border border-slate-200 rounded-2xl flex justify-between items-center gap-2">
                    <div className="truncate font-mono">
                      <span className="text-slate-400 font-semibold block text-[10px]">SỐ TÀI KHOẢN</span>
                      <span className="font-black">{qrAccountNumber}</span>
                    </div>
                    <button 
                      type="button" 
                      onClick={() => handleCopy(qrAccountNumber, 'account')}
                      className="text-[10px] px-2 py-1 hover:bg-slate-200 rounded-lg text-indigo-600 font-bold transition-all shrink-0 border border-slate-200 bg-white"
                    >
                      {copiedField === 'account' ? 'Đã sao chép' : 'Sao chép'}
                    </button>
                  </div>

                  <div className="p-3 bg-slate-50 border border-slate-200 rounded-2xl flex justify-between items-center gap-2">
                    <div className="truncate">
                      <span className="text-slate-400 font-semibold block text-[10px]">NỘI DUNG CHUYỂN KHOẢN</span>
                      <span className="font-extrabold block truncate text-slate-800">{transferMsg}</span>
                    </div>
                    <button 
                      type="button" 
                      onClick={() => handleCopy(transferMsg, 'msg')}
                      className="text-[10px] px-2 py-1 hover:bg-slate-200 rounded-lg text-indigo-600 font-bold transition-all shrink-0 border border-slate-200 bg-white"
                    >
                      {copiedField === 'msg' ? 'Đã sao chép' : 'Sao chép'}
                    </button>
                  </div>
                </div>
              </div>

              {/* QR Image Sync Display with Stamp Success overlay */}
              <div className="bg-slate-50 p-4 rounded-3xl border border-slate-200/80 flex flex-col items-center justify-center text-center relative overflow-hidden min-h-[290px] shadow-3xs">
                {/* Real VietQR image fetched dynamically or teacher custom uploaded image */}
                <div 
                  onClick={() => onViewImageLightbox?.(studentTuitionSetting?.qrImageUrl || qrUrl)}
                  className="relative group cursor-pointer"
                >
                  <img 
                    src={studentTuitionSetting?.qrImageUrl || qrUrl}
                    alt="Mã QR Chuyển khoản học phí"
                    referrerPolicy="no-referrer"
                    className="w-48 h-48 object-contain rounded-xl shadow-2xs border border-white hover:scale-[1.02] transition-transform"
                  />
                  <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white rounded-xl">
                    <Search className="w-6 h-6" />
                  </div>
                </div>
                <span className="text-[10px] font-extrabold text-slate-400 mt-3 uppercase tracking-wider">
                  {studentTuitionSetting?.qrImageUrl ? 'MÃ QR DO GIÁO VIÊN CUNG CẤP (NHẤP ĐỂ PHÓNG TO)' : 'QUÉT MÃ ĐỂ CHUYỂN KHOẢN NHANH'}
                </span>

                {/* Stamped SUCCESS effect (Large Circular stamp overlay) */}
                {tuitionUploadSuccess && (
                  <div className="absolute inset-0 bg-white/95 flex flex-col items-center justify-center p-6 space-y-4 animate-fade-in z-10">
                    {/* Retro green circular stamp */}
                    <div className="w-28 h-28 rounded-full border-4 border-dashed border-emerald-600 flex flex-col items-center justify-center transform -rotate-12 animate-scale-up shadow-sm">
                      <Check className="w-10 h-10 text-emerald-600 stroke-[4px]" />
                      <span className="text-[10px] font-black text-emerald-600 tracking-wider">ĐÃ MỘC BIÊN LAI</span>
                    </div>
                    <div className="space-y-1">
                      <h4 className="font-black text-slate-900 text-xs">Giao dịch thành công!</h4>
                      <p className="text-slate-500 text-[10px] font-semibold max-w-[180px]">Hệ thống đã nhận biên lai của em và tự động cấp mọc số giờ.</p>
                    </div>
                    <button 
                      type="button" 
                      onClick={onResetUploadSuccess}
                      className="px-4 py-1.5 bg-slate-900 hover:bg-slate-800 text-white font-bold text-[10px] rounded-lg shadow-sm"
                    >
                      Xác nhận
                    </button>
                  </div>
                )}
              </div>
            </div>

            {/* Drag and Drop transaction screenshot uploader */}
            {!tuitionUploadSuccess && (
              <div className="border-t border-slate-100 pt-5 space-y-3">
                <span className="text-xs font-bold text-slate-800 block">Tải lên ảnh chụp màn hình giao dịch (Chứng minh thanh toán):</span>
                
                <div 
                  onClick={() => fileInputRef.current?.click()}
                  className="border-2 border-dashed border-slate-300 hover:border-indigo-500 bg-slate-50 hover:bg-indigo-50/30 p-6 rounded-2xl cursor-pointer transition-all text-center space-y-2 relative"
                >
                  <input 
                    type="file" 
                    ref={fileInputRef}
                    onChange={onUploadScreenshot}
                    accept="image/*"
                    className="hidden" 
                  />
                  
                  {isUploadingTuition ? (
                    /* Scanning loading effect */
                    <div className="py-2.5 space-y-2">
                      <div className="w-10 h-10 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto" />
                      <p className="text-indigo-600 font-black text-xs animate-pulse">Đang quét biên lai và tự động đối chiếu...</p>
                    </div>
                  ) : (
                    <>
                      <div className="w-10 h-10 bg-indigo-50 text-indigo-700 rounded-xl flex items-center justify-center mx-auto shadow-3xs">
                        <ImageIcon className="w-5 h-5" />
                      </div>
                      <div>
                        <p className="text-slate-700 font-extrabold text-xs">Kéo thả hoặc Nhấp chuột để tải ảnh giao dịch lên</p>
                        <p className="text-slate-400 text-[10px] font-bold uppercase tracking-wider mt-0.5">Hỗ trợ PNG, JPG, HEIC tối đa 10MB</p>
                      </div>
                    </>
                  )}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
