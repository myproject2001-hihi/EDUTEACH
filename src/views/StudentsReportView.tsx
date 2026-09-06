import React, { useState, useEffect } from 'react';
import { StudentProgress, Submission, Assignment, MonthlyProgress } from '../types';
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { 
  Search, Download, Award, TrendingUp, Phone, User, CheckCircle, Mail, MessageCircle, 
  Key, ShieldCheck, Trash2, Check, X, ShieldAlert, AlertCircle, Copy, ArrowUpDown, 
  ArrowUp, ArrowDown, RotateCcw, Upload, FileSpreadsheet, Sparkles, Star, Shuffle, 
  Users, Timer, CheckCircle2, PlusCircle, Plus, FolderPlus, BookOpen
} from 'lucide-react';
import { db, handleFirestoreError, OperationType } from '../firebase';
import { collection, onSnapshot, doc, updateDoc, deleteDoc, setDoc, writeBatch } from 'firebase/firestore';
import { ConfirmModal } from '../components/ConfirmModal';
import { CustomSelect } from '../components/CustomSelect';
import { BatchActionBar } from '../components/BatchActionBar';
import { BulkStudentImportModal } from '../components/BulkStudentImportModal';
import { TeacherClassroomToolsModal, ToolTab } from '../components/TeacherClassroomToolsModal';
import { exportRosterToExcel } from '../utils/studentExcelHelper';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

// Helper function to remove Vietnamese accents for standard jsPDF fonts
function removeVietnameseTones(str: string): string {
  if (!str) return '';
  str = str.replace(/à|á|ạ|ả|ã|â|ầ|ấ|ậ|ẩ|ẫ|ă|ằ|ắ|ặ|ẳ|ẵ/g, "a");
  str = str.replace(/è|é|ẹ|ẻ|ẽ|ê|ề|ế|ệ|ể|ễ/g, "e");
  str = str.replace(/ì|í|ị|ỉ|ĩ/g, "i");
  str = str.replace(/ò|ó|ọ|ỏ|õ|ô|ồ|ố|ộ|ổ|ỗ|ơ|ờ|ớ|ợ|ở|ỡ/g, "o");
  str = str.replace(/ù|ú|ụ|ủ|ũ|ư|ừ|ứ|ự|ử|ữ/g, "u");
  str = str.replace(/ỳ|ý|ỵ|ỷ|ỹ/g, "y");
  str = str.replace(/đ/g, "d");
  str = str.replace(/À|Á|Ạ|Ả|Ã|Â|Ầ|Ấ|Ậ|Ẩ|Ẫ|Ă|Ằ|Ắ|Ặ|Ẳ|Ẵ/g, "A");
  str = str.replace(/È|É|Ẹ|Ẻ|Ẽ|Ê|Ề|Ế|Ệ|Ể|Ễ/g, "E");
  str = str.replace(/Ì|Í|Ị|Ỉ|Ĩ/g, "I");
  str = str.replace(/Ò|Ó|Ọ|Ỏ|Õ|Ô|Ồ|Ố|Ộ|Ổ|Ỗ|Ơ|Ờ|Ớ|Ợ|Ở|Ỡ/g, "O");
  str = str.replace(/Ù|Ú|Ụ|Ủ|Ũ|Ư|Ừ|Ứ|Ự|Ử|Ữ/g, "U");
  str = str.replace(/Ỳ|Ý|Ỵ|Ỷ|Ỹ/g, "Y");
  str = str.replace(/Đ/g, "D");
  return str;
}

interface StudentsReportProps {
  progressData: StudentProgress[];
  user?: any;
  submissions?: Submission[];
  assignments?: Assignment[];
}

export function StudentsReportView({ progressData, user, submissions = [], assignments = [] }: StudentsReportProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState<'name-asc' | 'name-desc' | 'grade-desc' | 'grade-asc' | 'completion-desc' | 'completion-asc' | 'attendance-desc' | 'attendance-asc'>('name-asc');
  const [selectedStudent, setSelectedStudent] = useState<StudentProgress | null>(null);
  const [selectedStudents, setSelectedStudents] = useState<string[]>([]);
  const [isSendingBulk, setIsSendingBulk] = useState(false);
  const [subToResetInReport, setSubToResetInReport] = useState<Submission | null>(null);
  const [isResettingReportSub, setIsResettingReportSub] = useState(false);

  // New Modals for Teacher Tools & Bulk Import
  const [showImportModal, setShowImportModal] = useState(false);
  const [showClassroomToolsModal, setShowClassroomToolsModal] = useState(false);
  const [classroomToolsTab, setClassroomToolsTab] = useState<ToolTab>('attendance');

  // Student deletion state
  const [showBulkDeleteConfirm, setShowBulkDeleteConfirm] = useState(false);
  const [isDeletingBulk, setIsDeletingBulk] = useState(false);
  const [studentToDelete, setStudentToDelete] = useState<StudentProgress | null>(null);
  const [isDeletingSingle, setIsDeletingSingle] = useState(false);

  const handleBulkDeleteStudents = async () => {
    if (selectedStudents.length === 0) return;
    setIsDeletingBulk(true);
    try {
      const deletePromises = selectedStudents.map(studentId => deleteDoc(doc(db, 'users', studentId)));
      await Promise.all(deletePromises);
      setNotification({
        message: `Đã xóa thành công ${selectedStudents.length} học sinh khỏi hệ thống.`,
        type: 'success'
      });
      setSelectedStudents([]);
      setShowBulkDeleteConfirm(false);
    } catch (err) {
      console.error('Lỗi khi xóa học sinh:', err);
      setNotification({
        message: 'Có lỗi xảy ra khi xóa học sinh.',
        type: 'error'
      });
    } finally {
      setIsDeletingBulk(false);
    }
  };

  const handleSingleDeleteStudent = async () => {
    if (!studentToDelete) return;
    setIsDeletingSingle(true);
    try {
      await deleteDoc(doc(db, 'users', studentToDelete.studentId));
      setNotification({
        message: `Đã xóa học sinh "${studentToDelete.studentName}" thành công.`,
        type: 'success'
      });
      if (selectedStudent?.studentId === studentToDelete.studentId) {
        setSelectedStudent(null);
      }
      setSelectedStudents(prev => prev.filter(id => id !== studentToDelete.studentId));
      setStudentToDelete(null);
    } catch (err) {
      console.error('Lỗi khi xóa học sinh:', err);
      setNotification({
        message: 'Có lỗi xảy ra khi xóa học sinh.',
        type: 'error'
      });
    } finally {
      setIsDeletingSingle(false);
    }
  };

  const openClassroomTool = (tab: ToolTab) => {
    setClassroomToolsTab(tab);
    setShowClassroomToolsModal(true);
  };

  const handleConfirmResetReportSub = async () => {
    if (!subToResetInReport) return;
    setIsResettingReportSub(true);
    try {
      await deleteDoc(doc(db, 'submissions', subToResetInReport.id));
      setNotification({
        message: 'Đã kích hoạt cho học sinh làm lại bài tập thành công!',
        type: 'success'
      });
      setSubToResetInReport(null);
    } catch (err: any) {
      console.error('Failed to reset submission in report:', err);
      setNotification({
        message: 'Có lỗi xảy ra khi kích hoạt làm lại.',
        type: 'error'
      });
    } finally {
      setIsResettingReportSub(false);
    }
  };

  const [className, setClassName] = useState(() => {
    if (user?.className) return user.className;
    return localStorage.getItem('class_name') || '123456';
  });
  const [academicYear, setAcademicYear] = useState(() => localStorage.getItem('academic_year') || 'Khóa 2026 - 2027');

  useEffect(() => {
    if (user?.className) {
      setClassName(user.className);
    }
  }, [user?.className]);

  const [allUsers, setAllUsers] = useState<any[]>([]);
  const [resetRequests, setResetRequests] = useState<any[]>([]);
  const [activeSubTab, setActiveSubTab] = useState<'roster' | 'requests'>('roster');

  // Modal tạo lớp mới cho giáo viên
  const [showCreateClassModal, setShowCreateClassModal] = useState(false);
  const [newClassNameInput, setNewClassNameInput] = useState('');
  const [newClassSubjectInput, setNewClassSubjectInput] = useState('');
  const [selectedStudentsForNewClass, setSelectedStudentsForNewClass] = useState<string[]>([]);
  const [isCreatingClass, setIsCreatingClass] = useState(false);

  // Xử lý Tạo & Lưu lớp mới cho Giáo viên
  const handleCreateNewClassSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const nameTrimmed = newClassNameInput.trim();
    if (!nameTrimmed) {
      setNotification({ message: 'Vui lòng nhập tên lớp học!', type: 'error' });
      return;
    }

    setIsCreatingClass(true);
    try {
      const classId = `class_${Date.now()}`;
      const newClassData = {
        id: classId,
        className: nameTrimmed,
        title: nameTrimmed,
        teacherId: user?.id || 'teacher',
        teacherName: user?.name || 'Giáo viên',
        subject: newClassSubjectInput.trim() || 'Chung',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      // 1. Lưu lớp mới vào bộ sưu tập class_sessions
      await setDoc(doc(db, 'class_sessions', classId), newClassData);

      // 2. Cập nhật mã lớp cho học sinh được chọn (nếu có)
      if (selectedStudentsForNewClass.length > 0) {
        const batch = writeBatch(db);
        selectedStudentsForNewClass.forEach(sId => {
          batch.update(doc(db, 'users', sId), { className: nameTrimmed });
        });
        await batch.commit();
      }

      // 3. Cập nhật mã lớp hiện tại của giáo viên
      if (user?.id && (user.role === 'teacher' || user.role === 'admin' || user.isTeacher)) {
        try {
          await updateDoc(doc(db, 'users', user.id), {
            className: nameTrimmed
          });
        } catch (err) {
          console.error('Failed to update teacher user doc className:', err);
        }
      }

      // 4. Chuyển bộ chọn lớp sang lớp mới tạo
      setClassName(nameTrimmed);
      localStorage.setItem('class_name', nameTrimmed);
      window.dispatchEvent(new Event('storage'));

      // 5. Đóng modal và reset form
      setShowCreateClassModal(false);
      setNewClassNameInput('');
      setNewClassSubjectInput('');
      setSelectedStudentsForNewClass([]);
      setNotification({
        message: `Đã tạo thành công lớp "${nameTrimmed}" và lưu vào hệ thống!`,
        type: 'success'
      });
    } catch (err) {
      console.error("Lỗi khi tạo lớp học mới:", err);
      setNotification({
        message: 'Có lỗi xảy ra khi tạo lớp học. Vui lòng thử lại.',
        type: 'error'
      });
    } finally {
      setIsCreatingClass(false);
    }
  };

  // Auto scroll to top when selecting a student or switching sub-tabs
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
    document.documentElement.scrollTop = 0;
    document.body.scrollTop = 0;
  }, [selectedStudent, activeSubTab]);
  const [notification, setNotification] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
  const [rejectConfirmId, setRejectConfirmId] = useState<string | null>(null);
  const [rejecting, setRejecting] = useState(false);

  const toggleSort = (field: 'name' | 'grade' | 'completion' | 'attendance') => {
    if (field === 'name') {
      setSortBy(prev => prev === 'name-asc' ? 'name-desc' : 'name-asc');
    } else if (field === 'grade') {
      setSortBy(prev => prev === 'grade-desc' ? 'grade-asc' : 'grade-desc');
    } else if (field === 'completion') {
      setSortBy(prev => prev === 'completion-desc' ? 'completion-asc' : 'completion-desc');
    } else if (field === 'attendance') {
      setSortBy(prev => prev === 'attendance-desc' ? 'attendance-asc' : 'attendance-desc');
    }
  };

  
  
  const handleBulkMessage = async () => {
    if (selectedStudents.length === 0) return;
    setIsSendingBulk(true);
    
    try {
      const timestamp = new Date().toISOString();
      const createPromises = selectedStudents.map(studentId => {
        const notifId = `remind_${studentId}_${Date.now()}`;
        return setDoc(doc(db, 'system_notifications', notifId), {
          id: notifId,
          title: '⏳ Nhắc nhở nộp bài',
          content: 'Em hãy nhớ hoàn thành bài tập sớm để được nhận xét nhé!',
          type: 'personal_reminder',
          badge: 'Nhắc Nhở Hạn Nộp',
          badgeColor: 'amber',
          targetStudentId: studentId,
          createdAt: timestamp
        });
      });
      
      await Promise.all(createPromises);
      
      setNotification({
        message: `Đã gửi thông báo nhắc nhở thành công đến ${selectedStudents.length} học sinh.`,
        type: 'success'
      });
      setSelectedStudents([]);
    } catch (err) {
      setNotification({
        message: 'Có lỗi xảy ra khi gửi thông báo.',
        type: 'error'
      });
    } finally {
      setIsSendingBulk(false);
    }
  };

  // Lắng nghe danh sách tất cả người dùng thời gian thực
  useEffect(() => {
    const unsub = onSnapshot(collection(db, 'users'), (snapshot) => {
      const list: any[] = [];
      snapshot.forEach((docSnap) => {
        list.push({ id: docSnap.id, ...docSnap.data() });
      });
      setAllUsers(list);
    }, (error) => {
      console.error("Lỗi tải danh sách người dùng:", error);
    });
    return () => unsub();
  }, []);

  useEffect(() => {
    const unsubscribe = onSnapshot(collection(db, 'reset_requests'), (snapshot) => {
      const list: any[] = [];
      snapshot.forEach((docSnap) => {
        list.push({ id: docSnap.id, ...docSnap.data() });
      });
      // Sắp xếp yêu cầu mới nhất lên đầu
      list.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      setResetRequests(list);
    }, (error) => {
      console.error("Lỗi tải yêu cầu khôi phục mật khẩu:", error);
    });
    return () => unsubscribe();
  }, []);

  const [teacherClasses, setTeacherClasses] = useState<any[]>([]);

  // Lắng nghe danh sách lớp học của giáo viên này thời gian thực
  useEffect(() => {
    const unsub = onSnapshot(collection(db, 'class_sessions'), (snapshot) => {
      const list: any[] = [];
      snapshot.forEach((docSnap) => {
        const data = docSnap.data();
        if (data.teacherId === user?.id) {
          list.push(data);
        }
      });
      setTeacherClasses(list);
    }, (error) => {
      console.error("Lỗi tải danh sách lớp học của giáo viên:", error);
    });
    return () => unsub();
  }, [user?.id]);

  const teacherClassNames = React.useMemo(() => {
    return teacherClasses.map(c => (c.className || c.title || '').trim().toLowerCase());
  }, [teacherClasses]);

  // Lọc danh sách học sinh từ bộ sưu tập users
  const studentUsers = React.useMemo(() => {
    return allUsers.filter(u => u.role === 'student');
  }, [allUsers]);

  // Đổi lớp học đang chọn
  const handleClassChange = async (newClass: string) => {
    setClassName(newClass);
    localStorage.setItem('class_name', newClass);
    window.dispatchEvent(new Event('storage'));

    if (user?.id && (user.role === 'teacher' || user.role === 'admin')) {
      try {
        await updateDoc(doc(db, 'users', user.id), {
          className: newClass
        });
      } catch (err) {
        console.error('Failed to update user className on Firestore:', err);
      }
    }
  };

  // Danh sách các lớp khả dụng cho bộ chọn
  const classOptions = React.useMemo(() => {
    const set = new Set<string>();

    if (className && className.trim() && className.trim().toLowerCase() !== 'tất cả') {
      set.add(className.trim());
    }

    teacherClasses.forEach(c => {
      const name = (c.className || c.title || '').trim();
      if (name) set.add(name);
    });

    studentUsers.forEach(u => {
      const name = (u.className || u.connectionCode || '').trim();
      if (name) set.add(name);
    });

    const sorted = Array.from(set).sort((a, b) => a.localeCompare(b, 'vi', { sensitivity: 'base' }));

    return [
      { value: 'Tất cả', label: 'Tất cả các lớp' },
      ...sorted.map(cls => {
        const count = studentUsers.filter(u => {
          const uClass = (u.className || u.connectionCode || '').trim().toLowerCase();
          return uClass === cls.toLowerCase();
        }).length;

        return {
          value: cls,
          label: `Lớp ${cls}`,
          badge: count > 0 ? `${count} HS` : undefined,
        };
      })
    ];
  }, [className, teacherClasses, studentUsers]);

  // Tổng hợp danh sách học sinh theo mã lớp học đang chọn
  const combinedRoster = React.useMemo(() => {
    const filterClass = className.trim().toLowerCase();

    // Lọc học sinh có mã lớp khớp với bộ lọc (hoặc nếu để trống/Tất cả thì hiện hết)
    const matchedUsers = studentUsers.filter(u => {
      const uClass = (u.className || u.connectionCode || '').trim().toLowerCase();

      // Nếu người dùng là Giáo viên, chỉ hiện học sinh thuộc các lớp do giáo viên này quản lý
      if (user?.role === 'teacher') {
        if (!teacherClassNames.includes(uClass)) {
          return false;
        }
      }

      if (!filterClass || filterClass === 'tất cả') return true;
      return uClass === filterClass;
    });

    return matchedUsers.map(u => {
      const existingProgress = progressData.find(p => p.studentId === u.id || (p.studentName && u.name && p.studentName.trim().toLowerCase() === u.name.trim().toLowerCase()));

      // Calculate dynamic stats from actual submissions in real-time
      const studentSubs = (submissions || []).filter(s =>
        s.studentId === u.id ||
        (s.studentName && u.name && s.studentName.trim().toLowerCase() === u.name.trim().toLowerCase())
      );

      // Published assignments relevant
      const publishedAssigns = (assignments || []).filter(a => a.isPublished !== false);
      const submittedAssignIds = new Set(studentSubs.map(s => s.assignmentId));

      let calcCompletion = 0;
      if (publishedAssigns.length > 0) {
        calcCompletion = Math.min(100, Math.round((submittedAssignIds.size / publishedAssigns.length) * 100));
      } else if (studentSubs.length > 0) {
        calcCompletion = 100;
      }

      const validGrades = studentSubs
        .map(s => typeof s.grade === 'number' ? s.grade : (s.grade !== undefined && s.grade !== null ? parseFloat(String(s.grade)) : NaN))
        .filter(g => !isNaN(g));

      let calcAvgGrade = 0;
      if (validGrades.length > 0) {
        const sum = validGrades.reduce((a, b) => a + b, 0);
        calcAvgGrade = Math.round((sum / validGrades.length) * 10) / 10;
      }

      // Generate monthly progress if not present
      let monthlyProgress: MonthlyProgress[] | undefined = existingProgress?.monthlyProgress;
      if ((!monthlyProgress || monthlyProgress.length === 0) && studentSubs.length > 0) {
        const monthMap: Record<string, { all: number[], quiz: number[], sim: number[] }> = {};
        
        studentSubs.forEach(s => {
          const d = s.submittedAt ? new Date(s.submittedAt) : new Date();
          const mKey = `Tháng ${d.getMonth() + 1}`;
          if (!monthMap[mKey]) monthMap[mKey] = { all: [], quiz: [], sim: [] };
          
          if (typeof s.grade === 'number' && !isNaN(s.grade)) {
            monthMap[mKey].all.push(s.grade);
            
            // Determine type
            const assignment = assignments?.find(a => a.id === s.assignmentId);
            if (assignment?.type === 'simulation') {
              monthMap[mKey].sim.push(s.grade);
            } else {
              monthMap[mKey].quiz.push(s.grade);
            }
          }
        });
        
        const mList = Object.keys(monthMap).map(mKey => {
          const data = monthMap[mKey];
          const avgAll = data.all.length > 0 ? Math.round((data.all.reduce((a, b) => a + b, 0) / data.all.length) * 10) / 10 : calcAvgGrade;
          const avgQuiz = data.quiz.length > 0 ? Math.round((data.quiz.reduce((a, b) => a + b, 0) / data.quiz.length) * 10) / 10 : null;
          const avgSim = data.sim.length > 0 ? Math.round((data.sim.reduce((a, b) => a + b, 0) / data.sim.length) * 10) / 10 : null;
          
          return {
            month: mKey,
            quizScore: avgQuiz !== null ? avgQuiz : avgAll, // fallback just in case chart needs a number
            simScore: avgSim, // null means they didn't do simulation
            average: avgAll
          };
        });
        if (mList.length > 0) monthlyProgress = mList;
      }

      const finalCompletion = Math.max(existingProgress?.completionRate || 0, calcCompletion);
      const finalAvgGrade = validGrades.length > 0 ? calcAvgGrade : (existingProgress?.averageGrade || 0);

      const displayName = u.name || (u as any).displayName || (u as any).fullName || (u as any).studentName || existingProgress?.studentName || 'Học sinh';

      if (existingProgress) {
        return {
          ...existingProgress,
          id: u.id,
          name: displayName,
          studentId: u.id,
          studentName: displayName,
          phoneStudent: u.phoneStudent || existingProgress.phoneStudent || '',
          phoneParent: u.phoneParent || existingProgress.phoneParent || '',
          className: u.className || existingProgress.className || className,
          isOffline: u.isOffline || false,
          studentCode: u.studentCode || u.connectionCode || '',
          meritPoints: u.meritPoints || 0,
          points: u.points || 0,
          completionRate: finalCompletion,
          averageGrade: finalAvgGrade,
          monthlyProgress: monthlyProgress || existingProgress.monthlyProgress
        };
      }
      return {
        id: u.id,
        name: displayName,
        studentId: u.id,
        studentName: displayName,
        phoneStudent: u.phoneStudent || '',
        phoneParent: u.phoneParent || '',
        className: u.className || className,
        isOffline: u.isOffline || false,
        studentCode: u.studentCode || u.connectionCode || '',
        meritPoints: u.meritPoints || 0,
        points: u.points || 0,
        completionRate: finalCompletion,
        averageGrade: finalAvgGrade,
        attendanceRate: 100,
        recentGrades: validGrades,
        monthlyProgress
      };
    });
  }, [studentUsers, progressData, className, submissions, assignments]);

  useEffect(() => {
    if (selectedStudent && combinedRoster.length > 0) {
      const updated = combinedRoster.find(s => s.studentId === selectedStudent.studentId);
      if (updated) {
        setSelectedStudent(updated);
      } else {
        setSelectedStudent(null);
      }
    }
  }, [combinedRoster]);

  const handleApproveRequest = async (requestId: string, username: string) => {
    // Tạo mật khẩu tạm ngẫu nhiên: ví dụ Edu@2026_ + số ngẫu nhiên 4 chữ số
    const randomNum = Math.floor(1000 + Math.random() * 9000);
    const tempPass = `Edu@2026_${randomNum}`;

    try {
      const requestRef = doc(db, 'reset_requests', requestId);
      await updateDoc(requestRef, {
        status: 'approved',
        tempPassword: tempPass,
        approvedAt: new Date().toISOString()
      });
      setNotification({
        message: `Đã duyệt yêu cầu của học sinh ${username}! Mật khẩu tạm của học sinh là: ${tempPass}`,
        type: 'success'
      });
    } catch (err) {
      console.error(err);
      setNotification({
        message: 'Có lỗi xảy ra khi phê duyệt yêu cầu.',
        type: 'error'
      });
    }
  };

  const confirmRejectRequest = async () => {
    if (!rejectConfirmId) return;
    setRejecting(true);
    try {
      await deleteDoc(doc(db, 'reset_requests', rejectConfirmId));
      setResetRequests(prev => prev.filter(r => r.id !== rejectConfirmId));
      setNotification({
        message: 'Đã bác bỏ và xóa thành công yêu cầu khôi phục mật khẩu.',
        type: 'success'
      });
      setRejectConfirmId(null);
    } catch (err: any) {
      console.error(err);
      handleFirestoreError(err, OperationType.DELETE, `reset_requests/${rejectConfirmId}`);
      setNotification({
        message: `Có lỗi xảy ra khi từ chối yêu cầu: ${err.message || 'Lỗi hệ thống'}`,
        type: 'error'
      });
    } finally {
      setRejecting(false);
    }
  };

  const sortedAndFilteredData = React.useMemo(() => {
    let result = combinedRoster.filter(s => 
      s.studentName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (s.phoneStudent && s.phoneStudent.includes(searchTerm)) ||
      (s.phoneParent && s.phoneParent.includes(searchTerm))
    );

    result.sort((a, b) => {
      if (sortBy === 'name-asc') {
        return a.studentName.localeCompare(b.studentName, 'vi');
      } else if (sortBy === 'name-desc') {
        return b.studentName.localeCompare(a.studentName, 'vi');
      } else if (sortBy === 'grade-desc') {
        return b.averageGrade - a.averageGrade;
      } else if (sortBy === 'grade-asc') {
        return a.averageGrade - b.averageGrade;
      } else if (sortBy === 'completion-desc') {
        return b.completionRate - a.completionRate;
      } else if (sortBy === 'completion-asc') {
        return a.completionRate - b.completionRate;
      } else if (sortBy === 'attendance-desc') {
        return b.attendanceRate - a.attendanceRate;
      } else if (sortBy === 'attendance-asc') {
        return a.attendanceRate - b.attendanceRate;
      }
      return 0;
    });

    return result;
  }, [combinedRoster, searchTerm, sortBy]);

    const renderStudentDetailsContent = (student: StudentProgress) => {
    return (
      <div className="space-y-5">
        <div className="flex items-center gap-3 border-b border-slate-100 pb-4">
          <div className="w-12 h-12 bg-indigo-100 rounded-2xl flex items-center justify-center font-bold text-indigo-700 text-lg shadow-inner">
            {student.studentName.charAt(0)}
          </div>
          <div>
            <h4 className="font-extrabold text-slate-900 text-base">{student.studentName}</h4>
            <p className="text-xs text-indigo-600 font-bold">Lớp {student.className || '123456'}</p>
          </div>
        </div>

        <div className="space-y-4 text-xs">
          <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-100 space-y-2">
            <p className="font-semibold text-slate-700 flex items-center gap-2">
              <Phone className="w-4 h-4 text-indigo-500" /> SĐT Học sinh: <span className="font-bold text-slate-900 select-all">{student.phoneStudent || 'Chưa cập nhật'}</span>
            </p>
            <p className="font-semibold text-slate-700 flex items-center gap-2">
              <User className="w-4 h-4 text-indigo-500" /> SĐT Phụ huynh: <span className="font-bold text-slate-900 select-all">{student.phoneParent || 'Chưa cập nhật'}</span>
            </p>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="p-3 bg-indigo-50/60 border border-indigo-100/60 rounded-2xl text-center shadow-sm">
              <p className="text-[9px] text-indigo-600 font-extrabold uppercase tracking-wider">Điểm TB học tập</p>
              <p className="text-2xl font-black text-indigo-700 mt-1">{student.averageGrade.toFixed(1)}</p>
            </div>
            <div className="p-3 bg-emerald-50/60 border border-emerald-100/60 rounded-2xl text-center shadow-sm">
              <p className="text-[9px] text-emerald-600 font-extrabold uppercase tracking-wider">Tỉ lệ hoàn thành</p>
              <p className="text-2xl font-black text-emerald-700 mt-1">{student.completionRate}%</p>
            </div>
          </div>

          {student.monthlyProgress && student.monthlyProgress.length > 0 && (
            <div className="space-y-3">
              <p className="font-bold text-slate-800 text-sm">Biểu đồ tiến độ học tập:</p>
              <div className="h-56 w-full bg-slate-50 border border-slate-100 rounded-2xl p-3">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={student.monthlyProgress} margin={{ top: 10, right: 10, bottom: 0, left: -25 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                    <XAxis 
                      dataKey="month" 
                      tick={{fontSize: 9, fill: '#64748b', fontWeight: 'bold'}} 
                      axisLine={false} 
                      tickLine={false} 
                      dy={10}
                    />
                    <YAxis 
                      domain={[0, 10]} 
                      tick={{fontSize: 9, fill: '#64748b', fontWeight: 'bold'}} 
                      axisLine={false} 
                      tickLine={false} 
                    />
                    <Tooltip 
                      contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 12px -1px rgb(0 0 0 / 0.1)', fontSize: '11px', fontWeight: 'bold' }}
                    />
                    <Legend wrapperStyle={{ fontSize: '9px', fontWeight: 'bold', paddingTop: '10px' }} iconType="circle" />
                    <Line type="monotone" name="Trung bình" dataKey="average" stroke="#4f46e5" strokeWidth={3} dot={{ r: 4, strokeWidth: 2 }} activeDot={{ r: 6 }} />
                    <Line type="monotone" name="Trắc nghiệm" dataKey="quizScore" stroke="#10b981" strokeWidth={2} dot={{ r: 3 }} />
                    <Line type="monotone" name="Mô phỏng" dataKey="simScore" stroke="#f59e0b" strokeWidth={2} dot={{ r: 3 }} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
              
              <div className="grid grid-cols-1 gap-1.5 max-h-36 overflow-y-auto pr-1">
                {student.monthlyProgress.map((m, idx) => (
                  <div key={idx} className="p-2 bg-slate-50 rounded-xl border border-slate-100 flex justify-between items-center text-[10px]">
                    <span className="font-bold text-slate-800">{m.month}</span>
                    <span className="text-slate-500">
                      Trắc nghiệm: <strong className="text-emerald-600">{m.quizScore}</strong> 
                      {m.simScore !== null && m.simScore !== undefined && (
                        <> | Mô phỏng: <strong className="text-amber-600">{m.simScore}</strong></>
                      )}
                    </span>
                    <span className="bg-indigo-100 text-indigo-800 px-2 py-0.5 rounded-md font-extrabold">{m.average} đ</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Submissions & Redo Action List */}
          {(() => {
            const studentSubs = submissions.filter(
              s => s.studentId === student.studentId || 
              (s.studentName && student.studentName && s.studentName.trim().toLowerCase() === student.studentName.trim().toLowerCase())
            );
            if (studentSubs.length === 0) return null;

            return (
              <div className="space-y-2.5 pt-3 border-t border-slate-150">
                <p className="font-extrabold text-slate-800 text-xs flex items-center justify-between">
                  <span>Lịch sử bài tập ({studentSubs.length}):</span>
                </p>
                <div className="space-y-1.5 max-h-52 overflow-y-auto pr-1">
                  {studentSubs.map(sub => {
                    const ass = assignments.find(a => a.id === sub.assignmentId);
                    const assTitle = ass?.title || 'Bài tập';
                    let typeBadge = null;
                    if (ass?.type === 'flashcard') typeBadge = <span className="bg-purple-100 text-purple-700 px-1.5 py-0.5 rounded text-[9px] uppercase tracking-wider font-bold shrink-0">Flashcard</span>;
                    else if (ass?.type === 'simulation') typeBadge = <span className="bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded text-[9px] uppercase tracking-wider font-bold shrink-0">Mô phỏng</span>;
                    else if (ass?.type === 'online_test' || (ass?.type as any) === 'quiz') typeBadge = <span className="bg-emerald-100 text-emerald-700 px-1.5 py-0.5 rounded text-[9px] uppercase tracking-wider font-bold shrink-0">Trắc nghiệm</span>;
                    else typeBadge = <span className="bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded text-[9px] uppercase tracking-wider font-bold shrink-0">Bài tập</span>;
                    
                    return (
                      <div key={sub.id} className="p-2.5 bg-slate-50 hover:bg-slate-100 rounded-2xl border border-slate-200/80 flex items-center justify-between gap-2 text-xs transition-colors">
                        <div className="min-w-0 flex-1">
                          <div className="flex items-start gap-1.5">
                            <p className="font-bold text-slate-900 truncate">{assTitle}</p>
                            {typeBadge}
                          </div>
                          <div className="flex items-center gap-2 text-[10px] text-slate-500 font-medium mt-0.5">
                            <span>Điểm: <strong className="text-indigo-600 font-bold">{sub.grade !== undefined ? `${sub.grade}/10` : 'Đã nộp'}</strong></span>
                            <span>•</span>
                            <span>{sub.submittedAt ? new Date(sub.submittedAt).toLocaleDateString('vi-VN') : 'Đã nộp'}</span>
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={() => setSubToResetInReport(sub)}
                          className="px-2.5 py-1.5 bg-amber-50 hover:bg-amber-100 text-amber-800 font-bold text-[11px] rounded-xl border border-amber-200 transition-colors flex items-center gap-1 shrink-0 active:scale-95"
                          title="Cho phép học sinh làm lại bài tập này để cải thiện điểm số"
                        >
                          <RotateCcw className="w-3.5 h-3.5 text-amber-600" />
                          <span>Làm lại</span>
                        </button>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })()}

          <a 
            href={`tel:${student.phoneParent || '0912345678'}`}
            className="w-full mt-3 py-2.5 bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white font-bold text-xs rounded-xl flex items-center justify-center gap-2 shadow-sm transition-all"
          >
            <Phone className="w-4 h-4" />
            Gọi điện trực tiếp Phụ huynh
          </a>
        </div>
      </div>
    );
  };

  const handleExportPDF = () => {
    const doc = new jsPDF();
    
    // Add title
    doc.setFontSize(18);
    doc.text(removeVietnameseTones('Bao cao tien do hoc sinh'), 14, 22);
    
    // Add metadata
    doc.setFontSize(11);
    doc.text(`${removeVietnameseTones('Lop')}: ${removeVietnameseTones(className)}`, 14, 32);
    doc.text(`${removeVietnameseTones('Khoa hoc')}: ${removeVietnameseTones(academicYear)}`, 14, 38);
    doc.text(`${removeVietnameseTones('Ngay xuat')}: ${new Date().toLocaleDateString('vi-VN')}`, 14, 44);

    // Prepare table data
    const tableColumn = [
      removeVietnameseTones("STT"),
      removeVietnameseTones("Ho ten"),
      removeVietnameseTones("SDT PH"),
      removeVietnameseTones("Ty le nop bai"),
      removeVietnameseTones("Diem TB"),
      removeVietnameseTones("Chuyen can")
    ];
    
    const tableRows: any[] = [];
    
    sortedAndFilteredData.forEach((student, index) => {
      const rowData = [
        index + 1,
        removeVietnameseTones(student.studentName),
        student.phoneParent || 'N/A',
        `${student.completionRate}%`,
        student.averageGrade.toFixed(1),
        `${student.attendanceRate}%`
      ];
      tableRows.push(rowData);
    });

    // Generate table
    autoTable(doc, {
      head: [tableColumn],
      body: tableRows,
      startY: 50,
      styles: { fontSize: 10 },
      headStyles: { fillColor: [79, 70, 229] }, // indigo-600
    });

    // Save PDF
    const filename = `bao_cao_tien_do_${removeVietnameseTones(className).replace(/\s+/g, '_')}.pdf`;
    doc.save(filename);
    
    setNotification({
      message: 'Đã xuất file báo cáo PDF thành công!',
      type: 'success'
    });
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-10">
      
      {/* Header */}
      <div className="flex flex-col xl:flex-row justify-between items-start xl:items-center gap-4 bg-white p-6 rounded-3xl border border-slate-200 shadow-sm">
        <div>
          <h2 className="text-2xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
            Quản lý Học sinh & Lớp học
          </h2>
          <p className="text-slate-500 text-sm mt-0.5">Quản lý sĩ số lớp, điểm danh, ghi điểm tích cực và theo dõi tiến trình làm bài</p>
        </div>
        
        {/* Class Details & Action Toolbar */}
        <div className="flex flex-wrap items-center gap-2.5 w-full xl:w-auto">
          {/* Class selector */}
          <div className="flex items-center gap-2 bg-slate-50 border border-slate-200/80 p-1.5 rounded-2xl min-w-[180px] sm:min-w-[220px]">
            <span className="text-[11px] font-bold text-slate-500 pl-2 shrink-0">Lớp:</span>
            <div className="w-full">
              <CustomSelect
                value={className || 'Tất cả'}
                onChange={handleClassChange}
                options={classOptions}
                size="sm"
                searchable={classOptions.length > 5}
                searchPlaceholder="Tìm lớp..."
              />
            </div>
          </div>

          {/* Create Class Button for Teachers */}
          {(user?.role === 'teacher' || user?.role === 'admin' || user?.isTeacher) && (
            <button
              type="button"
              onClick={() => setShowCreateClassModal(true)}
              className="px-3.5 py-2 bg-indigo-600 hover:bg-indigo-700 active:scale-95 text-white font-bold text-xs rounded-xl transition-all flex items-center gap-1.5 shadow-sm shrink-0"
            >
              <PlusCircle className="w-3.5 h-3.5" />
              <span>Tạo lớp mới</span>
            </button>
          )}

          {/* Import Excel Modal Button */}
          <button
            type="button"
            onClick={() => setShowImportModal(true)}
            className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white font-bold text-xs rounded-xl transition-all flex items-center gap-1.5 shadow-sm"
          >
            <Upload className="w-3.5 h-3.5" />
            <span>Nhập DS (Excel/CSV)</span>
          </button>

          {/* Export Excel */}
          <button
            type="button"
            onClick={() => {
              exportRosterToExcel(combinedRoster, className);
              setNotification({ message: 'Đã xuất danh sách lớp ra file Excel (.xlsx) thành công!', type: 'success' });
            }}
            className="px-3 py-2 bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 font-bold text-xs rounded-xl transition-all active:scale-95 flex items-center gap-1.5 shadow-xs"
            title="Xuất file Excel đầy đủ danh sách học sinh"
          >
            <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600" />
            <span>Xuất Excel</span>
          </button>

          {/* Export PDF */}
          <button
            type="button"
            onClick={handleExportPDF}
            className="px-3 py-2 bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 font-bold text-xs rounded-xl transition-all active:scale-95 flex items-center gap-1.5 shadow-xs"
          >
            <Download className="w-3.5 h-3.5 text-indigo-600" />
            <span>Xuất PDF</span>
          </button>
        </div>
      </div>

      {/* Teacher Quick Tools Banner */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5">
        <button
          type="button"
          onClick={() => openClassroomTool('attendance')}
          className="p-3 bg-white hover:bg-emerald-50/50 border border-slate-200 hover:border-emerald-300 rounded-2xl shadow-xs transition-all flex items-center gap-2.5 text-left group"
        >
          <div className="w-8 h-8 rounded-xl bg-emerald-100/70 text-emerald-700 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
            <CheckCircle2 className="w-4 h-4" />
          </div>
          <div className="min-w-0">
            <p className="text-xs font-black text-slate-800">Điểm danh</p>
            <p className="text-[10px] text-slate-500 font-medium truncate">Ghi nhận chuyên cần</p>
          </div>
        </button>

        <button
          type="button"
          onClick={() => openClassroomTool('merits')}
          className="p-3 bg-white hover:bg-amber-50/50 border border-slate-200 hover:border-amber-300 rounded-2xl shadow-xs transition-all flex items-center gap-2.5 text-left group"
        >
          <div className="w-8 h-8 rounded-xl bg-amber-100/70 text-amber-700 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
            <Star className="w-4 h-4" />
          </div>
          <div className="min-w-0">
            <p className="text-xs font-black text-slate-800">Điểm tích cực</p>
            <p className="text-[10px] text-slate-500 font-medium truncate">Thưởng sao rèn luyện</p>
          </div>
        </button>

        <button
          type="button"
          onClick={() => openClassroomTool('random_picker')}
          className="p-3 bg-white hover:bg-indigo-50/50 border border-slate-200 hover:border-indigo-300 rounded-2xl shadow-xs transition-all flex items-center gap-2.5 text-left group"
        >
          <div className="w-8 h-8 rounded-xl bg-indigo-100/70 text-indigo-700 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
            <Shuffle className="w-4 h-4" />
          </div>
          <div className="min-w-0">
            <p className="text-xs font-black text-slate-800">Gọi ngẫu nhiên</p>
            <p className="text-[10px] text-slate-500 font-medium truncate">Quay số gọi tên</p>
          </div>
        </button>

        <button
          type="button"
          onClick={() => openClassroomTool('group_maker')}
          className="p-3 bg-white hover:bg-purple-50/50 border border-slate-200 hover:border-purple-300 rounded-2xl shadow-xs transition-all flex items-center gap-2.5 text-left group"
        >
          <div className="w-8 h-8 rounded-xl bg-purple-100/70 text-purple-700 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
            <Users className="w-4 h-4" />
          </div>
          <div className="min-w-0">
            <p className="text-xs font-black text-slate-800">Chia nhóm</p>
            <p className="text-[10px] text-slate-500 font-medium truncate">Tổ chức hoạt động</p>
          </div>
        </button>

        <button
          type="button"
          onClick={() => openClassroomTool('timer')}
          className="p-3 bg-white hover:bg-rose-50/50 border border-slate-200 hover:border-rose-300 rounded-2xl shadow-xs transition-all flex items-center gap-2.5 text-left group col-span-2 sm:col-span-1"
        >
          <div className="w-8 h-8 rounded-xl bg-rose-100/70 text-rose-700 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
            <Timer className="w-4 h-4" />
          </div>
          <div className="min-w-0">
            <p className="text-xs font-black text-slate-800">Bấm giờ</p>
            <p className="text-[10px] text-slate-500 font-medium truncate">Đếm ngược làm bài</p>
          </div>
        </button>
      </div>

      {/* Progress Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-3xl border border-slate-200 shadow-sm p-6">
          <div className="flex items-center mb-4">
            <div className="w-10 h-10 rounded-2xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600 mr-3">
              <Award className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900">Điểm Trung Bình Quá Trình</h3>
              <p className="text-xs text-slate-500">So sánh điểm số trung bình giữa các học sinh</p>
            </div>
          </div>
          <div className="h-60 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={combinedRoster} margin={{ top: 10, right: 10, left: -20, bottom: 20 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis 
                  dataKey="studentName" 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{ fill: '#64748b', fontSize: 10, fontWeight: 600 }} 
                  dy={12} 
                  tickFormatter={(val) => {
                    if (!val) return '';
                    const parts = val.trim().split(' ');
                    return parts[parts.length - 1];
                  }}
                />
                <YAxis axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 12 }} domain={[0, 10]} />
                <Tooltip cursor={{ fill: '#f8fafc' }} contentStyle={{ borderRadius: '16px', border: '1px solid #e2e8f0' }} />
                <Bar dataKey="averageGrade" name="Điểm TB" fill="#4f46e5" radius={[4, 4, 0, 0]} barSize={28} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-white rounded-3xl border border-slate-200 shadow-sm p-6">
          <div className="flex items-center mb-4">
            <div className="w-10 h-10 rounded-2xl bg-emerald-50 border border-emerald-100 flex items-center justify-center text-emerald-600 mr-3">
              <TrendingUp className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900">Tỷ Lệ Nộp Bài Đúng Hạn (%)</h3>
              <p className="text-xs text-slate-500">Thống kê việc hoàn thành bài tập trước giờ học</p>
            </div>
          </div>
          <div className="h-60 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={combinedRoster} margin={{ top: 10, right: 10, left: -20, bottom: 20 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis 
                  dataKey="studentName" 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{ fill: '#64748b', fontSize: 10, fontWeight: 600 }} 
                  dy={12} 
                  tickFormatter={(val) => {
                    if (!val) return '';
                    const parts = val.trim().split(' ');
                    return parts[parts.length - 1];
                  }}
                />
                <YAxis axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 12 }} domain={[0, 100]} />
                <Tooltip cursor={{ fill: '#f8fafc' }} contentStyle={{ borderRadius: '16px', border: '1px solid #e2e8f0' }} />
                <Bar dataKey="completionRate" name="Tỷ lệ hoàn thành" fill="#10b981" radius={[4, 4, 0, 0]} barSize={28} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Notification Toast */}
      {notification && (
        <div className={`p-4 rounded-2xl border flex items-start justify-between gap-3 ${
          notification.type === 'success' 
            ? 'bg-emerald-50 border-emerald-200 text-emerald-800' 
            : 'bg-rose-50 border-rose-200 text-rose-800'
        }`}>
          <div className="flex items-start gap-2.5">
            <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
            <div className="text-xs font-semibold leading-relaxed">
              {notification.message}
            </div>
          </div>
          <button 
            onClick={() => setNotification(null)}
            className="text-slate-400 hover:text-slate-600 font-bold text-xs p-1"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Roster & Detail View */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Roster Table / Requests Container */}
        <div className="lg:col-span-2 bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden flex flex-col">
          {/* Sub tabs & Filter controls header */}
          <div className="border-b border-slate-200/80 bg-slate-50/70 p-3 flex flex-col gap-3 print:hidden">
            {/* Subtab Navigation Row */}
            <div className="flex items-center justify-between flex-wrap gap-2">
              <div className="flex items-center gap-1.5 p-1 bg-slate-200/60 rounded-2xl border border-slate-200/80 shadow-2xs max-w-full overflow-x-auto scrolling-touch">
                <button
                  type="button"
                  onClick={() => setActiveSubTab('roster')}
                  className={`px-4 py-2 text-xs font-bold rounded-xl transition-all flex items-center gap-2 whitespace-nowrap shrink-0 active:scale-95 ${
                    activeSubTab === 'roster' 
                      ? 'bg-white text-indigo-700 shadow-sm border border-slate-200/80 font-extrabold' 
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100/50'
                  }`}
                >
                  <User className="w-3.5 h-3.5 text-indigo-600 shrink-0" />
                  <span>Danh sách Học sinh</span>
                  <span className="px-1.5 py-0.5 rounded-full bg-indigo-50 text-indigo-700 text-[10px] font-extrabold border border-indigo-200/60">
                    {combinedRoster.length}
                  </span>
                </button>
                <button
                  type="button"
                  onClick={() => setActiveSubTab('requests')}
                  className={`px-4 py-2 text-xs font-bold rounded-xl transition-all flex items-center gap-2 relative whitespace-nowrap shrink-0 active:scale-95 ${
                    activeSubTab === 'requests' 
                      ? 'bg-white text-indigo-700 shadow-sm border border-slate-200/80 font-extrabold' 
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100/50'
                  }`}
                >
                  <Key className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                  <span>Yêu cầu khôi phục mật khẩu</span>
                  {resetRequests.filter(r => r.status === 'pending').length > 0 && (
                    <span className="px-2 py-0.5 bg-rose-500 text-white rounded-full text-[10px] font-black animate-pulse">
                      {resetRequests.filter(r => r.status === 'pending').length}
                    </span>
                  )}
                </button>
              </div>
            </div>

            {/* Filter controls row for Roster tab */}
            {activeSubTab === 'roster' && (
              <div className="flex flex-wrap items-center gap-2.5 pt-1 border-t border-slate-200/60">
                {/* Lọc Lớp học */}
                <div className="w-full sm:w-48 shrink-0">
                  <CustomSelect
                    value={className || 'Tất cả'}
                    onChange={handleClassChange}
                    options={classOptions}
                    size="sm"
                    searchable={classOptions.length > 5}
                    searchPlaceholder="Tìm lớp..."
                  />
                </div>

                {/* Sắp xếp */}
                <div className="w-full sm:w-52 shrink-0">
                  <CustomSelect
                    value={sortBy}
                    onChange={(val) => setSortBy(val as any)}
                    options={[
                      { value: 'name-asc', label: 'Họ tên (A-Z)' },
                      { value: 'name-desc', label: 'Họ tên (Z-A)' },
                      { value: 'grade-desc', label: 'Điểm TB (Cao nhất)' },
                      { value: 'grade-asc', label: 'Điểm TB (Thấp nhất)' },
                      { value: 'completion-desc', label: 'Nộp bài (Cao nhất)' },
                      { value: 'completion-asc', label: 'Nộp bài (Thấp nhất)' },
                      { value: 'attendance-desc', label: 'Chuyên cần (Cao nhất)' },
                      { value: 'attendance-asc', label: 'Chuyên cần (Thấp nhất)' },
                    ]}
                    size="sm"
                    searchable={false}
                  />
                </div>

                {/* Tìm kiếm */}
                <div className="relative flex-1 min-w-[200px]">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400 pointer-events-none" />
                  <input 
                    type="text" 
                    value={searchTerm}
                    onChange={e => setSearchTerm(e.target.value)}
                    placeholder="Tìm học sinh..." 
                    className="w-full pl-9 pr-4 py-2 bg-white border border-slate-200/90 rounded-xl text-xs focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 outline-none placeholder:text-slate-400 font-medium transition-all shadow-2xs"
                  />
                </div>
              </div>
            )}
          </div>

          {/* Batch Action Bar for Selected Students */}
          {selectedStudents.length > 0 && activeSubTab === 'roster' && (
            <div className="p-3 bg-indigo-50/70 border-b border-indigo-100">
              <BatchActionBar
                count={selectedStudents.length}
                itemLabel="học sinh"
                description="Bạn có thể gửi tin nhắn nhắc nhở hoặc chấm điểm rèn luyện hàng loạt cho các em."
                onDeselectAll={() => setSelectedStudents([])}
                actionLabel={isSendingBulk ? 'Đang gửi...' : 'Nhắc nộp bài'}
                actionIcon={MessageCircle}
                actionVariant="primary"
                isActionLoading={isSendingBulk}
                onAction={handleBulkMessage}
                customActions={
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <button
                      type="button"
                      onClick={() => openClassroomTool('merits')}
                      className="px-3.5 py-2 bg-amber-500 hover:bg-amber-600 text-white rounded-xl text-xs font-bold transition-all shadow-xs flex items-center gap-1.5 active:scale-95"
                    >
                      <Star className="w-3.5 h-3.5 fill-white" />
                      <span>Ghi điểm tích cực ⭐</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => openClassroomTool('attendance')}
                      className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition-all shadow-xs flex items-center gap-1.5 active:scale-95"
                    >
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span>Điểm danh nhanh</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setShowBulkDeleteConfirm(true)}
                      className="px-3.5 py-2 bg-white hover:bg-rose-50 text-rose-600 hover:text-rose-700 border border-rose-200 hover:border-rose-300 rounded-xl text-xs font-bold transition-all shadow-xs flex items-center gap-1.5 active:scale-95 cursor-pointer"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>Xóa đã chọn ({selectedStudents.length})</span>
                    </button>
                  </div>
                }
              />
            </div>
          )}

          {activeSubTab === 'roster' ? (
            <>
              {/* DESKTOP TABLE VIEW (MD+) */}
              <div className="hidden md:block overflow-x-auto">
                <table className="w-full text-left text-xs text-slate-600">
                  <thead className="bg-slate-50 text-slate-700 uppercase text-[10px] tracking-wider border-b border-slate-200">
                    <tr>
                      <th className="px-5 py-3.5 font-bold w-12 text-center">
                        <input 
                          type="checkbox"
                          checked={sortedAndFilteredData.length > 0 && selectedStudents.length === sortedAndFilteredData.length}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setSelectedStudents(sortedAndFilteredData.map(s => s.studentId));
                            } else {
                              setSelectedStudents([]);
                            }
                          }}
                          className="w-4 h-4 text-[#0068ff] border-slate-300 rounded focus:ring-[#0068ff] cursor-pointer"
                        />
                      </th>
                      <th className="px-3 py-3.5 font-bold w-12 text-center text-slate-500">STT</th>
                      <th 
                        onClick={() => toggleSort('name')}
                        className="px-5 py-3.5 font-bold cursor-pointer hover:bg-slate-100 select-none transition-colors group"
                      >
                        <div className="flex items-center gap-1">
                          Học sinh
                          {sortBy === 'name-asc' && <ArrowUp className="w-3.5 h-3.5 text-indigo-600 shrink-0" />}
                          {sortBy === 'name-desc' && <ArrowDown className="w-3.5 h-3.5 text-indigo-600 shrink-0" />}
                          {!sortBy.startsWith('name') && <ArrowUpDown className="w-3.5 h-3.5 text-slate-400 group-hover:text-slate-600 shrink-0 transition-colors opacity-50 hover:opacity-100" />}
                        </div>
                      </th>
                      <th 
                        onClick={() => toggleSort('completion')}
                        className="px-5 py-3.5 font-bold cursor-pointer hover:bg-slate-100 select-none transition-colors group text-center"
                      >
                        <div className="flex items-center justify-center gap-1">
                          Nộp bài
                          {sortBy === 'completion-desc' && <ArrowDown className="w-3.5 h-3.5 text-indigo-600 shrink-0" />}
                          {sortBy === 'completion-asc' && <ArrowUp className="w-3.5 h-3.5 text-indigo-600 shrink-0" />}
                          {!sortBy.startsWith('completion') && <ArrowUpDown className="w-3.5 h-3.5 text-slate-400 group-hover:text-slate-600 shrink-0 transition-colors opacity-50 hover:opacity-100" />}
                        </div>
                      </th>
                      <th 
                        onClick={() => toggleSort('grade')}
                        className="px-5 py-3.5 font-bold cursor-pointer hover:bg-slate-100 select-none transition-colors group text-center"
                      >
                        <div className="flex items-center justify-center gap-1">
                          Điểm TB
                          {sortBy === 'grade-desc' && <ArrowDown className="w-3.5 h-3.5 text-indigo-600 shrink-0" />}
                          {sortBy === 'grade-asc' && <ArrowUp className="w-3.5 h-3.5 text-indigo-600 shrink-0" />}
                          {!sortBy.startsWith('grade') && <ArrowUpDown className="w-3.5 h-3.5 text-slate-400 group-hover:text-slate-600 shrink-0 transition-colors opacity-50 hover:opacity-100" />}
                        </div>
                      </th>
                      <th 
                        onClick={() => toggleSort('attendance')}
                        className="px-5 py-3.5 font-bold cursor-pointer hover:bg-slate-100 select-none transition-colors group text-center"
                      >
                        <div className="flex items-center justify-center gap-1">
                          Chuyên cần
                          {sortBy === 'attendance-desc' && <ArrowDown className="w-3.5 h-3.5 text-indigo-600 shrink-0" />}
                          {sortBy === 'attendance-asc' && <ArrowUp className="w-3.5 h-3.5 text-indigo-600 shrink-0" />}
                          {!sortBy.startsWith('attendance') && <ArrowUpDown className="w-3.5 h-3.5 text-slate-400 group-hover:text-slate-600 shrink-0 transition-colors opacity-50 hover:opacity-100" />}
                        </div>
                      </th>
                      <th className="px-5 py-3.5 font-bold text-right">Thao tác</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {sortedAndFilteredData.length === 0 ? (
                      <tr>
                        <td colSpan={7} className="py-12 text-center text-slate-400">
                          <User className="w-10 h-10 mx-auto text-slate-300 mb-2" />
                          <p className="font-bold text-slate-700 text-sm">Chưa có học sinh nào trong lớp "{className}"</p>
                          <p className="text-xs text-slate-400 mt-1 max-w-md mx-auto">
                            Gán mã lớp <strong className="text-indigo-600">{className}</strong> cho học sinh tại mục <i>Console Quản trị &gt; Đổi vai trò / Đổi mã lớp</i> hoặc nhập mã lớp khác ở ô phía trên.
                          </p>
                        </td>
                      </tr>
                    ) : (
                      sortedAndFilteredData.map((student, idx) => (
                        <tr 
                          key={student.studentId} 
                          onClick={() => setSelectedStudent(student)}
                          className={`hover:bg-indigo-50/50 cursor-pointer transition-colors ${
                            selectedStudent?.studentId === student.studentId ? 'bg-indigo-50/80 font-semibold' : ''
                          }`}
                        >
                          <td className="px-5 py-4 w-12 text-center" onClick={(e) => e.stopPropagation()}>
                            <input
                              type="checkbox"
                              checked={selectedStudents.includes(student.studentId)}
                              onChange={(e) => {
                                if (e.target.checked) {
                                  setSelectedStudents(prev => [...prev, student.studentId]);
                                } else {
                                  setSelectedStudents(prev => prev.filter(id => id !== student.studentId));
                                }
                              }}
                              className="w-4 h-4 text-[#0068ff] border-slate-300 rounded focus:ring-[#0068ff] cursor-pointer"
                            />
                          </td>
                          <td className="px-3 py-4 w-12 text-center font-bold text-xs text-slate-400">
                            {idx + 1}
                          </td>
                          <td className="px-5 py-4 font-bold text-slate-900">
                            <div className="space-y-0.5">
                              <div className="flex items-center gap-1.5 flex-wrap">
                                <p className="text-sm font-black text-slate-900">{student.studentName}</p>
                                {(student as any).isOffline && (
                                  <span className="px-1.5 py-0.5 bg-slate-100 text-slate-600 border border-slate-200 rounded text-[9px] font-bold">
                                    Ngoại tuyến
                                  </span>
                                )}
                                {typeof (student as any).meritPoints === 'number' && (student as any).meritPoints > 0 && (
                                  <span className="px-1.5 py-0.5 bg-amber-50 text-amber-700 border border-amber-200 rounded text-[10px] font-black flex items-center gap-0.5">
                                    <Star className="w-2.5 h-2.5 fill-amber-400 text-amber-500" />
                                    +{(student as any).meritPoints}
                                  </span>
                                )}
                              </div>
                              <p className="text-[11px] text-slate-400 font-normal">
                                PH: {student.phoneParent || 'Chưa cập nhật'}
                              </p>
                            </div>
                          </td>
                          <td className="px-5 py-4 text-center">
                            <div className="inline-flex items-center gap-1.5 bg-emerald-50 text-emerald-700 px-2.5 py-1 rounded-lg border border-emerald-100 font-bold">
                              <CheckCircle className="w-3.5 h-3.5" />
                              {student.completionRate}%
                            </div>
                          </td>
                          <td className="px-5 py-4 text-center font-extrabold text-indigo-600 text-sm">
                            {student.averageGrade.toFixed(1)}
                          </td>
                          <td className="px-5 py-4 text-center font-semibold">{student.attendanceRate}%</td>
                          <td className="px-5 py-4 text-right">
                            <div className="flex items-center justify-end gap-2">
                              <button 
                                type="button"
                                onClick={() => setSelectedStudent(student)}
                                className="text-indigo-600 hover:text-indigo-800 font-bold hover:underline text-xs"
                              >
                                Xem tiến độ
                              </button>
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setStudentToDelete(student);
                                }}
                                title="Xóa học sinh này"
                                className="p-1.5 text-rose-500 hover:text-rose-700 hover:bg-rose-50 border border-transparent hover:border-rose-200 rounded-lg transition-all"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>

              {/* MOBILE CARD VIEW (X-SMALL TO MD) */}
              <div className="block md:hidden divide-y divide-slate-100 max-h-[600px] overflow-y-auto scrolling-touch">
                {sortedAndFilteredData.length === 0 ? (
                  <div className="py-12 px-4 text-center text-slate-400">
                    <User className="w-10 h-10 mx-auto text-slate-300 mb-2" />
                    <p className="font-bold text-slate-700 text-sm">Chưa có học sinh nào</p>
                  </div>
                ) : (
                  sortedAndFilteredData.map((student, idx) => (
                    <div 
                      key={student.studentId}
                      onClick={() => setSelectedStudent(student)}
                      className={`p-4 hover:bg-indigo-50/30 cursor-pointer transition-all flex flex-col gap-3 ${
                        selectedStudent?.studentId === student.studentId ? 'bg-indigo-50/50' : ''
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-center gap-3">
                          <div className="shrink-0" onClick={(e) => e.stopPropagation()}>
                            <input
                              type="checkbox"
                              checked={selectedStudents.includes(student.studentId)}
                              onChange={(e) => {
                                if (e.target.checked) {
                                  setSelectedStudents(prev => [...prev, student.studentId]);
                                } else {
                                  setSelectedStudents(prev => prev.filter(id => id !== student.studentId));
                                }
                              }}
                              className="w-4.5 h-4.5 text-[#0068ff] border-slate-300 rounded focus:ring-[#0068ff] cursor-pointer"
                            />
                          </div>
                          <div>
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <span className="w-5 text-center text-xs font-bold text-slate-400">#{idx + 1}</span>
                              <p className="font-bold text-slate-900 text-sm">{student.studentName}</p>
                              {(student as any).isOffline && (
                                <span className="px-1.5 py-0.5 bg-slate-100 text-slate-600 border border-slate-200 rounded text-[9px] font-bold">
                                  Ngoại tuyến
                                </span>
                              )}
                              {typeof (student as any).meritPoints === 'number' && (student as any).meritPoints > 0 && (
                                <span className="px-1.5 py-0.5 bg-amber-50 text-amber-700 border border-amber-200 rounded text-[10px] font-black flex items-center gap-0.5">
                                  <Star className="w-2.5 h-2.5 fill-amber-400 text-amber-500" />
                                  +{(student as any).meritPoints}
                                </span>
                              )}
                            </div>
                            <p className="text-[11px] text-slate-400 font-medium">PH: {student.phoneParent || 'Chưa cập nhật'}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <button 
                            type="button"
                            onClick={() => setSelectedStudent(student)}
                            className="text-indigo-600 hover:text-indigo-800 font-bold text-xs hover:underline shrink-0 flex items-center gap-0.5"
                          >
                            Chi tiết <TrendingUp className="w-3 h-3" />
                          </button>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setStudentToDelete(student);
                            }}
                            title="Xóa học sinh"
                            className="p-1 text-rose-500 hover:text-rose-700 rounded"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                      
                      <div className="grid grid-cols-3 gap-2 text-center text-[10px]">
                        <div className="bg-emerald-50 text-emerald-700 px-2 py-1.5 rounded-xl border border-emerald-100 font-bold flex flex-col items-center justify-center">
                          <span className="text-[8px] text-emerald-500 uppercase font-black">Nộp bài</span>
                          <span className="mt-0.5">{student.completionRate}%</span>
                        </div>
                        <div className="bg-indigo-50 text-indigo-700 px-2 py-1.5 rounded-xl border border-indigo-100 font-bold flex flex-col items-center justify-center">
                          <span className="text-[8px] text-indigo-500 uppercase font-black">Điểm TB</span>
                          <span className="mt-0.5 text-xs font-black">{student.averageGrade.toFixed(1)}</span>
                        </div>
                        <div className="bg-slate-50 text-slate-700 px-2 py-1.5 rounded-xl border border-slate-200 font-bold flex flex-col items-center justify-center">
                          <span className="text-[8px] text-slate-400 uppercase font-black">C.Cần</span>
                          <span className="mt-0.5">{student.attendanceRate}%</span>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </>
          ) : (
            /* RESET PASSWORD REQUESTS PANEL */
            <div className="p-4 space-y-4">
              {resetRequests.length === 0 ? (
                <div className="p-10 text-center text-slate-400 text-xs italic bg-slate-50/40 rounded-2xl border border-dashed border-slate-200">
                  <ShieldCheck className="w-10 h-10 mx-auto text-slate-300 mb-2.5" />
                  Hiện không có yêu cầu khôi phục mật khẩu nào cần xử lý.
                </div>
              ) : (
                <div className="space-y-3.5">
                  <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 text-xs text-slate-600 leading-relaxed">
                    <p className="font-bold text-slate-800 mb-1 flex items-center gap-1.5">
                      <ShieldAlert className="w-4 h-4 text-indigo-600" />
                      Quy trình phê duyệt an toàn
                    </p>
                    Khi học sinh gửi yêu cầu khôi phục, thông tin lớp học, họ tên và số điện thoại liên hệ sẽ được hiển thị tại đây.
                    Thầy cô vui lòng kiểm tra và xác nhận đúng thông tin học sinh lớp mình, sau đó bấm <strong>"Phê duyệt & Cấp mật khẩu"</strong> để tạo mật khẩu tạm thời. 
                    Bạn có thể gửi trực tiếp mật khẩu này cho phụ huynh hoặc học sinh thông qua ứng dụng nhắn tin cá nhân.
                  </div>

                  <div className="divide-y divide-slate-100 border border-slate-200 rounded-2xl overflow-hidden">
                    {resetRequests.map((req) => (
                      <div 
                        key={req.id} 
                        className={`p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 transition-all ${
                          req.status === 'pending' ? 'bg-indigo-50/20' : 'bg-white'
                        }`}
                      >
                        <div className="space-y-1.5 min-w-0 flex-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-bold text-slate-900 text-sm">{req.name}</span>
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-100 text-slate-600">
                              Lớp {req.className}
                            </span>
                            {req.status === 'pending' ? (
                              <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 animate-pulse border border-amber-200">
                                Chờ duyệt
                              </span>
                            ) : (
                              <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-200 flex items-center gap-1">
                                <Check className="w-3 h-3" /> Đã duyệt
                              </span>
                            )}
                          </div>

                          <div className="text-[11px] text-slate-500 space-y-0.5 font-medium">
                            <p className="flex items-center gap-1">
                              <User className="w-3 h-3 text-slate-400" /> Tên đăng nhập: <code className="bg-slate-100 px-1 py-0.2 rounded font-mono text-indigo-600 text-[10px]">{req.username}</code>
                            </p>
                            <p className="flex items-center gap-1">
                              <Phone className="w-3 h-3 text-slate-400" /> SĐT liên hệ nhận mật khẩu: <strong className="text-slate-700">{req.phone}</strong>
                            </p>
                            {req.message && (
                              <p className="flex items-center gap-1">
                                <MessageCircle className="w-3 h-3 text-slate-400" /> Lời nhắn: <span className="text-slate-700 italic">"{req.message}"</span>
                              </p>
                            )}
                            {req.approvedAt && (
                              <p className="text-slate-400">
                                Đã duyệt lúc: {new Date(req.approvedAt).toLocaleTimeString('vi-VN')} {new Date(req.approvedAt).toLocaleDateString('vi-VN')}
                              </p>
                            )}
                          </div>
                        </div>

                        <div className="flex flex-wrap items-center gap-2 shrink-0">
                          {req.status === 'pending' ? (
                            <>
                              <button
                                type="button"
                                onClick={() => handleApproveRequest(req.id, req.username)}
                                className="bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold py-2 px-3 rounded-xl transition-all shadow-sm flex items-center gap-1"
                              >
                                <Check className="w-3.5 h-3.5" /> Phê duyệt & Cấp mật khẩu
                              </button>
                              <button
                                type="button"
                                onClick={() => setRejectConfirmId(req.id)}
                                className="bg-rose-50 hover:bg-rose-100 text-rose-600 text-xs font-bold py-2 px-3 rounded-xl transition-all flex items-center gap-1"
                              >
                                <Trash2 className="w-3.5 h-3.5" /> Bác bỏ
                              </button>
                            </>
                          ) : (
                            <div className="bg-emerald-50 border border-emerald-100 p-2.5 rounded-xl text-left space-y-1 w-full sm:w-auto">
                              <p className="text-[10px] text-emerald-800 font-bold uppercase tracking-wide">Mật khẩu tạm đã cấp:</p>
                              <div className="flex items-center gap-2">
                                <code className="bg-white border border-emerald-200 px-2 py-1 rounded font-mono text-xs font-black text-emerald-700 select-all">
                                  {req.tempPassword}
                                </code>
                                <button
                                  onClick={() => {
                                    navigator.clipboard.writeText(req.tempPassword);
                                    setNotification({ message: 'Đã sao chép mật khẩu tạm vào bộ nhớ tạm!', type: 'success' });
                                  }}
                                  className="text-[10px] font-bold text-indigo-600 hover:underline"
                                >
                                  Sao chép
                                </button>
                              </div>
                              <button 
                                onClick={() => {
                                  navigator.clipboard.writeText(`Chào em/anh/chị, mật khẩu tạm thời mới của em trên hệ thống là: ${req.tempPassword}`);
                                  setNotification({ message: 'Đã sao chép tin nhắn thông báo mật khẩu!', type: 'success' });
                                }}
                                className="mt-1 text-[10px] font-bold text-emerald-700 hover:underline flex items-center gap-1"
                              >
                                <Copy className="w-3 h-3" /> Sao chép thông tin thông báo
                              </button>
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Selected Student Detail Card - Desktop Only (LG+) */}
        <div className="hidden lg:block lg:col-span-1">
          {selectedStudent ? (
            <div className="bg-white rounded-3xl border border-slate-200 shadow-sm p-6">
              {renderStudentDetailsContent(selectedStudent)}
            </div>
          ) : (
            <div className="p-6 bg-white rounded-3xl border border-slate-200 text-center text-slate-400 text-xs italic">
              Chọn học sinh từ danh sách để xem chi tiết.
            </div>
          )}
        </div>

      </div>

      {/* MOBILE/TABLET SLIDE-OVER DRAWER MODAL */}
      {selectedStudent && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-end sm:items-center justify-center p-4 lg:hidden">
          <div className="bg-white rounded-t-3xl sm:rounded-3xl border border-slate-200 shadow-2xl p-6 w-full max-w-lg max-h-[85vh] overflow-y-auto space-y-5 relative">
            <button
              onClick={() => setSelectedStudent(null)}
              className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 p-1.5 bg-slate-100 hover:bg-slate-200 rounded-full transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
            {renderStudentDetailsContent(selectedStudent)}
          </div>
        </div>
      )}

      {/* Center-Zoom Confirm Modal for Reset Request Rejection */}
      <ConfirmModal
        isOpen={!!rejectConfirmId}
        onClose={() => setRejectConfirmId(null)}
        onConfirm={confirmRejectRequest}
        title="Xác nhận từ chối yêu cầu"
        message="Bạn có chắc chắn muốn từ chối và xóa yêu cầu cấp lại mật khẩu này không?"
        confirmText="Xóa yêu cầu"
        cancelText="Hủy bỏ"
        variant="danger"
        loading={rejecting}
      />

      {/* Confirm Modal for Resetting Student Submission in Report */}
      <ConfirmModal
        isOpen={!!subToResetInReport}
        onClose={() => setSubToResetInReport(null)}
        onConfirm={handleConfirmResetReportSub}
        title="Xác nhận cho học sinh làm lại"
        message={`Bạn có chắc chắn muốn cho học sinh "${subToResetInReport?.studentName || 'Học sinh'}" làm lại bài tập này không? Bài làm cũ sẽ được đặt lại để học sinh có thể thực hiện lại từ đầu.`}
        confirmText="Kích hoạt làm lại"
        cancelText="Hủy bỏ"
        variant="warning"
        loading={isResettingReportSub}
      />

      {/* Bulk Student Import Modal (Excel/CSV with offline support) */}
      <BulkStudentImportModal
        isOpen={showImportModal}
        onClose={() => setShowImportModal(false)}
        defaultClassName={className}
        currentUser={user}
        onImportSuccess={() => {
          setNotification({
            message: 'Đã nhập thành công danh sách học sinh vào hệ thống!',
            type: 'success'
          });
        }}
      />

      {/* Teacher Classroom Interactive Tools Modal */}
      <TeacherClassroomToolsModal
        isOpen={showClassroomToolsModal}
        onClose={() => setShowClassroomToolsModal(false)}
        initialTab={classroomToolsTab}
        studentsList={combinedRoster}
        className={className}
        availableClasses={[className, ...teacherClasses.map(c => c.className || c.title || '')].filter(Boolean)}
        currentUser={user}
        showToast={(msg) => setNotification({ message: msg, type: 'success' })}
      />

      {/* Bulk Delete Confirm Modal */}
      <ConfirmModal
        isOpen={showBulkDeleteConfirm}
        onClose={() => setShowBulkDeleteConfirm(false)}
        onConfirm={handleBulkDeleteStudents}
        loading={isDeletingBulk}
        title="Xác nhận xóa nhiều học sinh"
        message={`Bạn có chắc chắn muốn xóa ${selectedStudents.length} học sinh đã chọn khỏi hệ thống? Hành động này không thể hoàn tác.`}
        confirmText="Xóa học sinh"
        variant="danger"
      />

      {/* Single Delete Confirm Modal */}
      <ConfirmModal
        isOpen={Boolean(studentToDelete)}
        onClose={() => setStudentToDelete(null)}
        onConfirm={handleSingleDeleteStudent}
        loading={isDeletingSingle}
        title="Xác nhận xóa học sinh"
        message={`Bạn có chắc chắn muốn xóa học sinh "${studentToDelete?.studentName}" khỏi hệ thống?`}
        confirmText="Xóa học sinh"
        variant="danger"
      />

      {/* Teacher Create Class Modal */}
      {showCreateClassModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl border border-slate-200 shadow-2xl w-full max-w-lg max-h-[90vh] flex flex-col overflow-hidden">
            {/* Header */}
            <div className="px-6 py-5 border-b border-slate-100 flex items-center justify-between bg-slate-50/80">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-indigo-100 border border-indigo-200/80 flex items-center justify-center text-indigo-600 shadow-2xs">
                  <FolderPlus className="w-5 h-5 stroke-[2.2]" />
                </div>
                <div>
                  <h3 className="text-base font-extrabold text-slate-900">Tạo lớp học mới</h3>
                  <p className="text-xs font-medium text-slate-500">Lưu thông tin lớp học vào danh sách của bạn</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowCreateClassModal(false)}
                className="w-8 h-8 rounded-xl bg-white border border-slate-200 hover:bg-slate-100 flex items-center justify-center text-slate-500 transition-all active:scale-95"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Form Body */}
            <form onSubmit={handleCreateNewClassSubmit} className="p-6 space-y-4 overflow-y-auto flex-1">
              {/* Tên lớp */}
              <div>
                <label className="block text-xs font-extrabold text-slate-700 mb-1.5">
                  Tên lớp học <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={newClassNameInput}
                  onChange={(e) => setNewClassNameInput(e.target.value)}
                  placeholder="Ví dụ: Lớp 12A1, Lớp Ôn Thi Cấp Tốc..."
                  className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-2xl text-xs font-bold text-slate-800 placeholder:text-slate-400 focus:bg-white focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 outline-none transition-all shadow-2xs"
                />
              </div>

              {/* Môn học */}
              <div>
                <label className="block text-xs font-extrabold text-slate-700 mb-1.5">
                  Môn học / Mô tả (Không bắt buộc)
                </label>
                <input
                  type="text"
                  value={newClassSubjectInput}
                  onChange={(e) => setNewClassSubjectInput(e.target.value)}
                  placeholder="Ví dụ: Toán Học, Ngữ Văn, Tiếng Anh..."
                  className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-2xl text-xs font-bold text-slate-800 placeholder:text-slate-400 focus:bg-white focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 outline-none transition-all shadow-2xs"
                />
              </div>

              {/* Chọn học sinh gán vào lớp */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="block text-xs font-extrabold text-slate-700">
                    Gán học sinh vào lớp ({selectedStudentsForNewClass.length} đã chọn)
                  </label>
                  {allUsers.filter(u => u.role === 'student').length > 0 && (
                    <button
                      type="button"
                      onClick={() => {
                        const allStIds = allUsers.filter(u => u.role === 'student').map(u => u.id);
                        if (selectedStudentsForNewClass.length === allStIds.length) {
                          setSelectedStudentsForNewClass([]);
                        } else {
                          setSelectedStudentsForNewClass(allStIds);
                        }
                      }}
                      className="text-[11px] font-extrabold text-indigo-600 hover:text-indigo-800"
                    >
                      {selectedStudentsForNewClass.length === allUsers.filter(u => u.role === 'student').length ? 'Bỏ chọn tất cả' : 'Chọn tất cả'}
                    </button>
                  )}
                </div>

                <div className="max-h-48 overflow-y-auto border border-slate-200 rounded-2xl p-2 bg-slate-50/50 space-y-1">
                  {allUsers.filter(u => u.role === 'student').length === 0 ? (
                    <p className="text-xs text-slate-400 italic text-center py-4">Chưa có học sinh nào trong hệ thống</p>
                  ) : (
                    allUsers.filter(u => u.role === 'student').map(st => {
                      const isChecked = selectedStudentsForNewClass.includes(st.id);
                      return (
                        <label
                          key={st.id}
                          className={`flex items-center justify-between p-2 rounded-xl text-xs cursor-pointer transition-all ${
                            isChecked ? 'bg-indigo-50/80 border border-indigo-200 text-indigo-900 font-bold' : 'hover:bg-white text-slate-700'
                          }`}
                        >
                          <div className="flex items-center gap-2.5 min-w-0">
                            <input
                              type="checkbox"
                              checked={isChecked}
                              onChange={(e) => {
                                if (e.target.checked) {
                                  setSelectedStudentsForNewClass(prev => [...prev, st.id]);
                                } else {
                                  setSelectedStudentsForNewClass(prev => prev.filter(id => id !== st.id));
                                }
                              }}
                              className="w-4 h-4 text-indigo-600 border-slate-300 rounded focus:ring-indigo-500 cursor-pointer"
                            />
                            <span className="truncate">{st.name}</span>
                          </div>
                          <span className="text-[10px] font-bold text-slate-400 shrink-0">
                            {st.className ? `Lớp ${st.className}` : 'Chưa có lớp'}
                          </span>
                        </label>
                      );
                    })
                  )}
                </div>
              </div>

              {/* Actions Footer */}
              <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setShowCreateClassModal(false)}
                  className="px-4 py-2.5 bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 text-xs font-bold rounded-xl transition-all active:scale-95"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  disabled={!newClassNameInput.trim() || isCreatingClass}
                  className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-300 text-white text-xs font-extrabold rounded-xl shadow-sm transition-all active:scale-95 flex items-center gap-2"
                >
                  {isCreatingClass ? (
                    <>
                      <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      <span>Đang lưu...</span>
                    </>
                  ) : (
                    <>
                      <PlusCircle className="w-4 h-4" />
                      <span>Tạo & Lưu lớp</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
