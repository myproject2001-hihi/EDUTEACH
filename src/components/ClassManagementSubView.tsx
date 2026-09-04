import React, { useState, useMemo } from 'react';
import { User, ClassSession, Assignment } from '../types';
import { db } from '../firebase';
import { doc, updateDoc, writeBatch } from 'firebase/firestore';
import { ConfirmModal } from './ConfirmModal';
import { 
  School, 
  Users, 
  GraduationCap, 
  Plus, 
  Search, 
  Edit2, 
  Trash2, 
  UserPlus, 
  UserMinus, 
  ArrowRightLeft, 
  BookOpen, 
  Phone, 
  Check, 
  X, 
  ChevronDown, 
  ChevronRight,
  ShieldCheck,
  Sparkles,
  Calendar
} from 'lucide-react';

interface ClassManagementSubViewProps {
  usersList: User[];
  classes: ClassSession[];
  assignments: Assignment[];
  currentUser: User;
  showNotify: (type: 'success' | 'error', message: string) => void;
}

export function ClassManagementSubView({
  usersList,
  classes,
  assignments,
  currentUser,
  showNotify
}: ClassManagementSubViewProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [expandedClasses, setExpandedClasses] = useState<Record<string, boolean>>({});

  // Modals state
  const [showCreateClassModal, setShowCreateClassModal] = useState(false);
  const [newClassName, setNewClassName] = useState('');
  const [selectedTeachersForNewClass, setSelectedTeachersForNewClass] = useState<string[]>([]);
  const [selectedStudentsForNewClass, setSelectedStudentsForNewClass] = useState<string[]>([]);

  const [renamingClass, setRenamingClass] = useState<string | null>(null);
  const [updatedClassName, setUpdatedClassName] = useState('');

  const [addingStudentsToClass, setAddingStudentsToClass] = useState<string | null>(null);
  const [selectedStudentIdsToAdd, setSelectedStudentIdsToAdd] = useState<string[]>([]);

  const [addingTeacherToClass, setAddingTeacherToClass] = useState<string | null>(null);
  const [selectedTeacherIdToAdd, setSelectedTeacherIdToAdd] = useState<string>('');

  const [movingStudent, setMovingStudent] = useState<User | null>(null);
  const [targetClassForMove, setTargetClassForMove] = useState<string>('');

  const [isProcessing, setIsProcessing] = useState(false);
  const [confirmModalConfig, setConfirmModalConfig] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    confirmText?: string;
    variant?: 'danger' | 'warning' | 'info';
    onConfirm: () => void | Promise<void>;
  }>({
    isOpen: false,
    title: '',
    message: '',
    onConfirm: () => {},
  });

  // Group and extract all distinct classes
  const classesData = useMemo(() => {
    const classMap = new Map<string, {
      className: string;
      teachers: User[];
      students: User[];
      sessionsCount: number;
      assignmentsCount: number;
    }>();

    const getOrCreate = (name: string) => {
      const normalized = name.trim();
      if (!normalized) return null;
      if (!classMap.has(normalized)) {
        classMap.set(normalized, {
          className: normalized,
          teachers: [],
          students: [],
          sessionsCount: 0,
          assignmentsCount: 0
        });
      }
      return classMap.get(normalized)!;
    };

    // 1. From Users (Students and Teachers)
    usersList.forEach(u => {
      if (u.className && u.className.trim()) {
        const entry = getOrCreate(u.className);
        if (entry) {
          if (u.role === 'student') {
            if (!entry.students.some(s => s.id === u.id)) {
              entry.students.push(u);
            }
          } else if (u.role === 'teacher') {
            if (!entry.teachers.some(t => t.id === u.id)) {
              entry.teachers.push(u);
            }
          }
        }
      }
    });

    // 2. From ClassSessions (Teachers creating sessions for classes)
    classes.forEach(c => {
      const name = (c.className || c.title || '').trim();
      if (name) {
        const entry = getOrCreate(name);
        if (entry) {
          entry.sessionsCount += 1;
          if (c.teacherId) {
            const t = usersList.find(u => u.id === c.teacherId && u.role === 'teacher');
            if (t && !entry.teachers.some(existing => existing.id === t.id)) {
              entry.teachers.push(t);
            }
          }
        }
      }
    });

    // 3. From Assignments (Teachers assigning to classes)
    assignments.forEach(a => {
      if (a.className && a.className.trim()) {
        const entry = getOrCreate(a.className);
        if (entry) {
          entry.assignmentsCount += 1;
          if (a.teacherId) {
            const t = usersList.find(u => u.id === a.teacherId && u.role === 'teacher');
            if (t && !entry.teachers.some(existing => existing.id === t.id)) {
              entry.teachers.push(t);
            }
          }
        }
      }
    });

    return Array.from(classMap.values()).sort((a, b) => a.className.localeCompare(b.className, 'vi'));
  }, [usersList, classes, assignments]);

  // Filtered classes by search term
  const filteredClasses = useMemo(() => {
    if (!searchTerm.trim()) return classesData;
    const q = searchTerm.toLowerCase().trim();
    return classesData.filter(c => 
      c.className.toLowerCase().includes(q) ||
      c.teachers.some(t => t.name.toLowerCase().includes(q) || (t.phoneStudent && t.phoneStudent.includes(q)) || (t.className && t.className.toLowerCase().includes(q))) ||
      c.students.some(s => s.name.toLowerCase().includes(q) || (s.phoneStudent && s.phoneStudent.includes(q)) || (s.phoneParent && s.phoneParent.includes(q)))
    );
  }, [classesData, searchTerm]);

  // Unassigned students list
  const unassignedStudents = useMemo(() => {
    return usersList.filter(u => u.role === 'student' && (!u.className || !u.className.trim()));
  }, [usersList]);

  // All teachers
  const allTeachers = useMemo(() => {
    return usersList.filter(u => u.role === 'teacher' || (u as any).isTeacher);
  }, [usersList]);

  // All students
  const allStudents = useMemo(() => {
    return usersList.filter(u => u.role === 'student');
  }, [usersList]);

  const toggleExpand = (className: string) => {
    setExpandedClasses(prev => ({
      ...prev,
      [className]: !prev[className]
    }));
  };

  // Expand all / Collapse all
  const handleExpandAll = (expand: boolean) => {
    const next: Record<string, boolean> = {};
    classesData.forEach(c => {
      next[c.className] = expand;
    });
    setExpandedClasses(next);
  };

  // 1. Create New Class
  const handleCreateClass = async () => {
    const trimmed = newClassName.trim();
    if (!trimmed) {
      showNotify('error', 'Vui lòng nhập tên lớp học!');
      return;
    }

    if (classesData.some(c => c.className.toLowerCase() === trimmed.toLowerCase())) {
      showNotify('error', `Lớp "${trimmed}" đã tồn tại trên hệ thống.`);
      return;
    }

    setIsProcessing(true);
    try {
      const batch = writeBatch(db);

      // Assign selected teachers
      for (const tId of selectedTeachersForNewClass) {
        batch.update(doc(db, 'users', tId), { className: trimmed });
      }

      // Assign selected students
      for (const sId of selectedStudentsForNewClass) {
        batch.update(doc(db, 'users', sId), { className: trimmed });
      }

      await batch.commit();
      showNotify('success', `Đã tạo thành công lớp "${trimmed}" và điều phối thành viên!`);
      setShowCreateClassModal(false);
      setNewClassName('');
      setSelectedTeachersForNewClass([]);
      setSelectedStudentsForNewClass([]);
      setExpandedClasses(prev => ({ ...prev, [trimmed]: true }));
    } catch (err: any) {
      console.error(err);
      showNotify('error', 'Có lỗi khi tạo lớp học.');
    } finally {
      setIsProcessing(false);
    }
  };

  // 2. Rename Class across users
  const handleRenameClass = async (oldName: string) => {
    const nextName = updatedClassName.trim();
    if (!nextName || nextName === oldName) {
      setRenamingClass(null);
      return;
    }

    setIsProcessing(true);
    try {
      const batch = writeBatch(db);

      // Update all users in old class
      const matchingUsers = usersList.filter(u => u.className === oldName);
      for (const u of matchingUsers) {
        batch.update(doc(db, 'users', u.id), { className: nextName });
      }

      await batch.commit();
      showNotify('success', `Đã đổi tên lớp "${oldName}" thành "${nextName}" thành công!`);
      setRenamingClass(null);
      setUpdatedClassName('');
    } catch (err: any) {
      console.error(err);
      showNotify('error', 'Lỗi khi đổi tên lớp.');
    } finally {
      setIsProcessing(false);
    }
  };

  // 3. Remove Student from Class
  const handleRemoveStudentFromClass = (student: User, className: string) => {
    setConfirmModalConfig({
      isOpen: true,
      title: 'Xóa học sinh khỏi lớp',
      message: `Bạn có chắc muốn xóa học sinh "${student.name}" khỏi lớp "${className}"?`,
      confirmText: 'Xóa khỏi lớp',
      variant: 'danger',
      onConfirm: async () => {
        try {
          await updateDoc(doc(db, 'users', student.id), { className: '' });
          showNotify('success', `Đã xóa học sinh "${student.name}" khỏi lớp "${className}".`);
        } catch (err) {
          showNotify('error', 'Lỗi khi cập nhật học sinh.');
        } finally {
          setConfirmModalConfig(prev => ({ ...prev, isOpen: false }));
        }
      }
    });
  };

  // 4. Move Student to another Class
  const handleMoveStudent = async () => {
    if (!movingStudent || !targetClassForMove) return;

    setIsProcessing(true);
    try {
      await updateDoc(doc(db, 'users', movingStudent.id), { className: targetClassForMove });
      showNotify('success', `Đã chuyển học sinh "${movingStudent.name}" sang lớp "${targetClassForMove}".`);
      setMovingStudent(null);
      setTargetClassForMove('');
    } catch (err) {
      showNotify('error', 'Lỗi khi chuyển lớp học sinh.');
    } finally {
      setIsProcessing(false);
    }
  };

  // 5. Add Students to Class
  const handleAddStudentsToClass = async (className: string) => {
    if (selectedStudentIdsToAdd.length === 0) return;

    setIsProcessing(true);
    try {
      const batch = writeBatch(db);
      for (const sId of selectedStudentIdsToAdd) {
        batch.update(doc(db, 'users', sId), { className: className });
      }
      await batch.commit();
      showNotify('success', `Đã thêm ${selectedStudentIdsToAdd.length} học sinh vào lớp "${className}".`);
      setAddingStudentsToClass(null);
      setSelectedStudentIdsToAdd([]);
    } catch (err) {
      showNotify('error', 'Lỗi khi thêm học sinh vào lớp.');
    } finally {
      setIsProcessing(false);
    }
  };

  // 6. Assign Teacher to Class
  const handleAssignTeacherToClass = async (className: string) => {
    if (!selectedTeacherIdToAdd) return;

    setIsProcessing(true);
    try {
      await updateDoc(doc(db, 'users', selectedTeacherIdToAdd), { className: className });
      showNotify('success', `Đã phân công giáo viên vào lớp "${className}".`);
      setAddingTeacherToClass(null);
      setSelectedTeacherIdToAdd('');
    } catch (err) {
      showNotify('error', 'Lỗi khi phân công giáo viên.');
    } finally {
      setIsProcessing(false);
    }
  };

  // 7. Remove Teacher from Class
  const handleRemoveTeacherFromClass = (teacher: User, className: string) => {
    setConfirmModalConfig({
      isOpen: true,
      title: 'Hủy phân công giáo viên',
      message: `Bạn có chắc muốn hủy phân công giáo viên "${teacher.name}" khỏi lớp "${className}"?`,
      confirmText: 'Hủy phân công',
      variant: 'danger',
      onConfirm: async () => {
        try {
          if (teacher.className === className) {
            await updateDoc(doc(db, 'users', teacher.id), { className: '' });
          }
          showNotify('success', `Đã gỡ giáo viên "${teacher.name}" khỏi lớp "${className}".`);
        } catch (err) {
          showNotify('error', 'Lỗi khi gỡ giáo viên.');
        } finally {
          setConfirmModalConfig(prev => ({ ...prev, isOpen: false }));
        }
      }
    });
  };

  // 8. Delete / Dissolve Class
  const handleDissolveClass = (className: string) => {
    setConfirmModalConfig({
      isOpen: true,
      title: 'Giải tán lớp học',
      message: `CẢNH BÁO: Bạn có chắc chắn muốn giải tán lớp "${className}"? Tất cả học sinh và giáo viên trong lớp này sẽ được chuyển về trạng thái Chưa phân lớp.`,
      confirmText: 'Giải tán lớp',
      variant: 'danger',
      onConfirm: async () => {
        setIsProcessing(true);
        try {
          const batch = writeBatch(db);
          const members = usersList.filter(u => u.className === className);
          for (const u of members) {
            batch.update(doc(db, 'users', u.id), { className: '' });
          }
          await batch.commit();
          showNotify('success', `Đã giải tán lớp "${className}" thành công!`);
        } catch (err) {
          showNotify('error', 'Lỗi khi giải tán lớp.');
        } finally {
          setIsProcessing(false);
          setConfirmModalConfig(prev => ({ ...prev, isOpen: false }));
        }
      }
    });
  };

  return (
    <div className="space-y-6">
      {/* STATS OVERVIEW CARDS */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-xs flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600">
            <School className="w-6 h-6" />
          </div>
          <div>
            <div className="text-2xl font-black text-slate-900">{classesData.length}</div>
            <div className="text-xs font-bold text-slate-500">Tổng Số Lớp Học</div>
          </div>
        </div>

        <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-xs flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-emerald-50 border border-emerald-100 flex items-center justify-center text-emerald-600">
            <GraduationCap className="w-6 h-6" />
          </div>
          <div>
            <div className="text-2xl font-black text-slate-900">
              {classesData.reduce((acc, c) => acc + c.students.length, 0)}
            </div>
            <div className="text-xs font-bold text-slate-500">Học Sinh Đã Gán Lớp</div>
          </div>
        </div>

        <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-xs flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-amber-50 border border-amber-100 flex items-center justify-center text-amber-600">
            <Users className="w-6 h-6" />
          </div>
          <div>
            <div className="text-2xl font-black text-slate-900">{unassignedStudents.length}</div>
            <div className="text-xs font-bold text-slate-500">Học Sinh Chưa Có Lớp</div>
          </div>
        </div>

        <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-xs flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-purple-50 border border-purple-100 flex items-center justify-center text-purple-600">
            <ShieldCheck className="w-6 h-6" />
          </div>
          <div>
            <div className="text-2xl font-black text-slate-900">{allTeachers.length}</div>
            <div className="text-xs font-bold text-slate-500">Giáo Viên Phụ Trách</div>
          </div>
        </div>
      </div>

      {/* ACTION & SEARCH TOOLBAR */}
      <div className="bg-white p-4 rounded-3xl border border-slate-200 shadow-xs flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2 flex-1 min-w-[260px]">
          <div className="relative flex-1">
            <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Tìm theo tên lớp, tên giáo viên hoặc học sinh..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500 font-medium text-slate-800"
            />
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <button
            type="button"
            onClick={() => handleExpandAll(true)}
            className="px-3 py-2 text-xs bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl transition-colors"
          >
            Mở rộng tất cả
          </button>
          <button
            type="button"
            onClick={() => handleExpandAll(false)}
            className="px-3 py-2 text-xs bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl transition-colors"
          >
            Thu gọn tất cả
          </button>
          <button
            type="button"
            onClick={() => {
              setNewClassName('');
              setSelectedTeachersForNewClass([]);
              setSelectedStudentsForNewClass([]);
              setShowCreateClassModal(true);
            }}
            className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold text-xs rounded-xl transition-all shadow-sm flex items-center gap-1.5 active:scale-95 cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Tạo Lớp Học Mới</span>
          </button>
        </div>
      </div>

      {/* UNASSIGNED STUDENTS QUICK ALERT BANNER */}
      {unassignedStudents.length > 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-amber-100 text-amber-700 flex items-center justify-center shrink-0">
              <Users className="w-5 h-5" />
            </div>
            <div>
              <div className="text-xs font-black text-amber-900">
                Có {unassignedStudents.length} học sinh chưa được phân vào lớp học nào
              </div>
              <div className="text-[11px] text-amber-700 font-medium">
                Hãy tạo lớp mới hoặc chọn các lớp bên dưới để thêm các học sinh này vào danh sách lớp.
              </div>
            </div>
          </div>
          <button
            type="button"
            onClick={() => {
              setSelectedStudentsForNewClass(unassignedStudents.map(s => s.id));
              setShowCreateClassModal(true);
            }}
            className="px-3 py-1.5 bg-amber-600 hover:bg-amber-700 text-white font-extrabold text-xs rounded-xl shadow-xs transition-all shrink-0 active:scale-95"
          >
            Gán vào lớp mới ({unassignedStudents.length})
          </button>
        </div>
      )}

      {/* CLASS CARDS LIST */}
      <div className="space-y-4">
        {filteredClasses.map((item) => {
          const isExpanded = expandedClasses[item.className] ?? false;

          return (
            <div
              key={item.className}
              className="bg-white rounded-3xl border border-slate-200 shadow-xs overflow-hidden transition-all hover:border-indigo-200"
            >
              {/* CLASS HEADER ROW */}
              <div className="p-4 sm:p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-white border-b border-slate-100">
                <div 
                  onClick={() => toggleExpand(item.className)}
                  className="flex items-center gap-3 cursor-pointer select-none flex-1"
                >
                  <div className="w-10 h-10 rounded-2xl bg-indigo-50 border border-indigo-100 text-indigo-600 flex items-center justify-center shrink-0">
                    <School className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      {renamingClass === item.className ? (
                        <div className="flex items-center gap-1.5" onClick={(e) => e.stopPropagation()}>
                          <input
                            type="text"
                            value={updatedClassName}
                            onChange={(e) => setUpdatedClassName(e.target.value)}
                            className="px-2 py-1 text-sm font-bold text-slate-800 bg-slate-50 border border-indigo-300 rounded-lg outline-none"
                            autoFocus
                          />
                          <button
                            type="button"
                            onClick={() => handleRenameClass(item.className)}
                            className="p-1 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700"
                            title="Lưu tên"
                          >
                            <Check className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => setRenamingClass(null)}
                            className="p-1 bg-slate-200 text-slate-700 rounded-lg hover:bg-slate-300"
                            title="Hủy"
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      ) : (
                        <h3 className="text-base font-black text-slate-900 flex items-center gap-2">
                          <span>{item.className}</span>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setRenamingClass(item.className);
                              setUpdatedClassName(item.className);
                            }}
                            className="p-1 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                            title="Đổi tên lớp"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                        </h3>
                      )}
                    </div>

                    <div className="flex items-center gap-3 mt-1 text-xs text-slate-500 font-semibold flex-wrap">
                      <span className="flex items-center gap-1 text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-md font-bold">
                        <Users className="w-3.5 h-3.5" /> {item.students.length} học sinh
                      </span>
                      <span className="flex items-center gap-1 text-purple-600 bg-purple-50 px-2 py-0.5 rounded-md font-bold">
                        <GraduationCap className="w-3.5 h-3.5" /> {item.teachers.length} giáo viên
                      </span>
                    </div>
                  </div>
                </div>

                {/* HEADER ACTIONS */}
                <div className="flex items-center gap-2 flex-wrap w-full sm:w-auto justify-end">
                  <button
                    type="button"
                    onClick={() => {
                      setAddingStudentsToClass(item.className);
                      setSelectedStudentIdsToAdd([]);
                    }}
                    className="px-3 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 text-xs font-bold rounded-xl transition-colors flex items-center gap-1.5"
                  >
                    <UserPlus className="w-3.5 h-3.5" />
                    <span>+ Thêm học sinh</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setAddingTeacherToClass(item.className);
                      setSelectedTeacherIdToAdd('');
                    }}
                    className="px-3 py-1.5 bg-purple-50 hover:bg-purple-100 text-purple-700 border border-purple-200 text-xs font-bold rounded-xl transition-colors flex items-center gap-1.5"
                  >
                    <ShieldCheck className="w-3.5 h-3.5" />
                    <span>+ Phân công GV</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleDissolveClass(item.className)}
                    className="p-2 text-rose-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-colors"
                    title="Giải tán lớp"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>

                  <button
                    type="button"
                    onClick={() => toggleExpand(item.className)}
                    className="p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-xl transition-colors ml-1"
                  >
                    {isExpanded ? <ChevronDown className="w-5 h-5" /> : <ChevronRight className="w-5 h-5" />}
                  </button>
                </div>
              </div>

              {/* CLASS BODY: TEACHERS & STUDENTS LIST (EXPANDABLE) */}
              {isExpanded && (
                <div className="p-4 sm:p-5 space-y-6 bg-slate-50/50">
                  {/* 1. TEACHERS ASSIGNED */}
                  <div>
                    <div className="text-xs font-black text-slate-800 uppercase tracking-wider mb-2.5 flex items-center gap-2">
                      <GraduationCap className="w-4 h-4 text-purple-600" />
                      <span>Giáo viên phụ trách & giảng dạy ({item.teachers.length})</span>
                    </div>

                    {item.teachers.length === 0 ? (
                      <div className="p-3 bg-white rounded-2xl border border-dashed border-slate-200 text-xs text-slate-400 italic">
                        Chưa có giáo viên nào được phân công phụ trách lớp này. Nhấn "+ Phân công GV" ở trên để gán.
                      </div>
                    ) : (
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
                        {item.teachers.map(t => (
                          <div
                            key={t.id}
                            className="bg-white p-3 rounded-2xl border border-slate-200 shadow-2xs flex items-center justify-between gap-3"
                          >
                            <div className="flex items-center gap-2.5 overflow-hidden">
                              <img
                                src={t.avatar || `https://api.dicebear.com/7.x/bottts/svg?seed=${t.id}`}
                                alt={t.name}
                                className="w-8 h-8 rounded-full border border-slate-100 shrink-0 object-cover"
                              />
                              <div className="overflow-hidden">
                                <div className="text-xs font-bold text-slate-900 truncate">{t.name}</div>
                                <div className="text-[10px] text-slate-500 truncate">{t.phoneStudent || t.phoneParent || (t.className ? `Lớp ${t.className}` : 'Giáo viên')}</div>
                              </div>
                            </div>
                            <button
                              type="button"
                              onClick={() => handleRemoveTeacherFromClass(t, item.className)}
                              className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors shrink-0"
                              title="Gỡ khỏi lớp"
                            >
                              <UserMinus className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* 2. STUDENTS IN CLASS */}
                  <div>
                    <div className="text-xs font-black text-slate-800 uppercase tracking-wider mb-2.5 flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Users className="w-4 h-4 text-indigo-600" />
                        <span>Danh sách học sinh trong lớp ({item.students.length})</span>
                      </div>
                      <span className="text-[11px] text-slate-500 font-medium lowercase">
                        {item.students.length} học sinh
                      </span>
                    </div>

                    {item.students.length === 0 ? (
                      <div className="p-4 bg-white rounded-2xl border border-dashed border-slate-200 text-xs text-slate-400 italic text-center">
                        Lớp học chưa có học sinh nào. Nhấn "+ Thêm học sinh" để đưa học sinh vào lớp.
                      </div>
                    ) : (
                      <div className="bg-white rounded-2xl border border-slate-200 shadow-2xs overflow-x-auto scrolling-touch">
                        <table className="w-full block sm:table text-left border-collapse text-xs">
                          <thead className="hidden sm:table-header-group">
                            <tr className="bg-slate-50 border-b border-slate-200 text-slate-700 font-bold">
                              <th className="py-2.5 px-3 w-10 text-center block sm:table-cell">#</th>
                              <th className="py-2.5 px-3 block sm:table-cell">Học sinh</th>
                              <th className="py-2.5 px-3 block sm:table-cell">SĐT HS / Mã kết nối</th>
                              <th className="py-2.5 px-3 block sm:table-cell">SĐT Phụ huynh</th>
                              <th className="py-2.5 px-3 text-right block sm:table-cell">Thao tác</th>
                            </tr>
                          </thead>
                          <tbody className="block sm:table-row-group divide-y divide-slate-100 sm:divide-y">
                            {item.students.map((student, idx) => (
                              <tr key={student.id} className="block sm:table-row hover:bg-slate-50/80 transition-colors bg-white sm:bg-transparent rounded-xl p-3 sm:p-0 mb-3 sm:mb-0 border border-slate-100 sm:border-none space-y-2 sm:space-y-0">
                                <td className="hidden sm:table-cell py-2 px-3 text-center text-slate-400 font-bold text-[11px]">{idx + 1}</td>
                                <td className="block sm:table-cell py-2 px-3">
                                  <div className="flex items-center gap-2.5">
                                    <img
                                      src={student.avatar || `https://api.dicebear.com/7.x/bottts/svg?seed=${student.id}`}
                                      alt={student.name}
                                      className="w-7 h-7 rounded-full border border-slate-100 object-cover shrink-0"
                                    />
                                    <div>
                                      <div className="font-bold text-slate-900">{student.name}</div>
                                      <div className="text-[10px] text-slate-400 font-mono">ID: {student.id.slice(0, 8)}</div>
                                    </div>
                                  </div>
                                </td>
                                <td className="block sm:table-cell py-2 px-3 font-mono text-[11px] text-slate-600">
                                  <span className="text-[10px] font-bold text-slate-400 block sm:hidden uppercase tracking-wider mb-0.5">SĐT HS / Mã kết nối:</span>
                                  {student.phoneStudent || student.connectionCode || '—'}
                                </td>
                                <td className="block sm:table-cell py-2 px-3 font-mono text-[11px] text-slate-600">
                                  <span className="text-[10px] font-bold text-slate-400 block sm:hidden uppercase tracking-wider mb-0.5">SĐT Phụ huynh:</span>
                                  {student.phoneParent || '—'}
                                </td>
                                <td className="block sm:table-cell py-2 px-3 text-right">
                                  <div className="flex items-center justify-end gap-1.5 flex-wrap sm:flex-nowrap">
                                    <button
                                      type="button"
                                      onClick={() => {
                                        setMovingStudent(student);
                                        setTargetClassForMove('');
                                      }}
                                      className="px-2 py-1 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 text-[11px] font-bold rounded-lg transition-colors flex items-center gap-1"
                                      title="Chuyển sang lớp khác"
                                    >
                                      <ArrowRightLeft className="w-3 h-3" />
                                      <span>Chuyển lớp</span>
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => handleRemoveStudentFromClass(student, item.className)}
                                      className="p-1 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                                      title="Xóa khỏi lớp này"
                                    >
                                      <UserMinus className="w-3.5 h-3.5" />
                                    </button>
                                  </div>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          );
        })}

        {filteredClasses.length === 0 && (
          <div className="bg-white p-12 rounded-3xl border border-slate-200 text-center">
            <School className="w-12 h-12 text-slate-300 mx-auto mb-3" />
            <div className="text-base font-bold text-slate-700">Không tìm thấy lớp học nào</div>
            <div className="text-xs text-slate-400 mt-1">Hãy tạo lớp học mới để bắt đầu điều phối giáo viên và học sinh.</div>
          </div>
        )}
      </div>

      {/* MODAL 1: CREATE NEW CLASS */}
      {showCreateClassModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl border border-slate-200 shadow-2xl w-full max-w-xl max-h-[90vh] flex flex-col overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-200 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-indigo-50 border border-indigo-100 text-indigo-600 flex items-center justify-center">
                  <Plus className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900">Tạo Lớp Học Mới</h3>
                  <p className="text-xs text-slate-500">Thiết lập tên lớp, phân công giáo viên và gán học sinh</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowCreateClassModal(false)}
                className="p-2 text-slate-400 hover:text-slate-700 rounded-xl"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-5 space-y-4 overflow-y-auto flex-1">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5 uppercase">
                  Tên lớp học <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  placeholder="Ví dụ: Lớp 10A1, Ôn thi THPT Quốc Gia, Toán Thầy Hùng..."
                  value={newClassName}
                  onChange={(e) => setNewClassName(e.target.value)}
                  className="w-full px-3.5 py-2.5 text-xs bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500 font-bold text-slate-800 placeholder:font-normal"
                />
              </div>

              {/* Select Teachers */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5 uppercase">
                  Phân công giáo viên phụ trách (tùy chọn)
                </label>
                <div className="max-h-36 overflow-y-auto bg-slate-50 p-2 rounded-xl border border-slate-200 space-y-1">
                  {allTeachers.map(t => (
                    <label
                      key={t.id}
                      className="flex items-center gap-2.5 p-1.5 hover:bg-white rounded-lg cursor-pointer transition-colors text-xs font-medium text-slate-800"
                    >
                      <input
                        type="checkbox"
                        checked={selectedTeachersForNewClass.includes(t.id)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setSelectedTeachersForNewClass(prev => [...prev, t.id]);
                          } else {
                            setSelectedTeachersForNewClass(prev => prev.filter(id => id !== t.id));
                          }
                        }}
                        className="rounded text-indigo-600 focus:ring-indigo-500 w-4 h-4 cursor-pointer"
                      />
                      <img
                        src={t.avatar || `https://api.dicebear.com/7.x/bottts/svg?seed=${t.id}`}
                        alt={t.name}
                        className="w-5 h-5 rounded-full object-cover shrink-0"
                      />
                      <span>{t.name}</span>
                      <span className="text-[10px] text-slate-400 ml-auto">{t.phoneStudent || t.phoneParent || (t.className ? `Lớp ${t.className}` : 'Giáo viên')}</span>
                    </label>
                  ))}
                  {allTeachers.length === 0 && (
                    <div className="text-xs text-slate-400 italic p-2">Chưa có tài khoản giáo viên nào.</div>
                  )}
                </div>
              </div>

              {/* Select Initial Students */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5 uppercase flex justify-between items-center">
                  <span>Thêm học sinh vào lớp ({selectedStudentsForNewClass.length} đã chọn)</span>
                  <span className="text-indigo-600 lowercase cursor-pointer hover:underline" onClick={() => setSelectedStudentsForNewClass(unassignedStudents.map(s => s.id))}>
                    Chọn tất cả chưa có lớp ({unassignedStudents.length})
                  </span>
                </label>
                <div className="max-h-48 overflow-y-auto bg-slate-50 p-2 rounded-xl border border-slate-200 space-y-1">
                  {allStudents.map(s => (
                    <label
                      key={s.id}
                      className="flex items-center gap-2.5 p-1.5 hover:bg-white rounded-lg cursor-pointer transition-colors text-xs font-medium text-slate-800"
                    >
                      <input
                        type="checkbox"
                        checked={selectedStudentsForNewClass.includes(s.id)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setSelectedStudentsForNewClass(prev => [...prev, s.id]);
                          } else {
                            setSelectedStudentsForNewClass(prev => prev.filter(id => id !== s.id));
                          }
                        }}
                        className="rounded text-indigo-600 focus:ring-indigo-500 w-4 h-4 cursor-pointer"
                      />
                      <img
                        src={s.avatar || `https://api.dicebear.com/7.x/bottts/svg?seed=${s.id}`}
                        alt={s.name}
                        className="w-5 h-5 rounded-full object-cover shrink-0"
                      />
                      <span className="font-bold">{s.name}</span>
                      <span className="text-[10px] text-slate-400 ml-auto">
                        {s.className ? `Hiện ở: ${s.className}` : '🔴 Chưa có lớp'}
                      </span>
                    </label>
                  ))}
                </div>
              </div>
            </div>

            <div className="px-5 py-4 border-t border-slate-200 bg-slate-50 flex items-center justify-end gap-2.5">
              <button
                type="button"
                onClick={() => setShowCreateClassModal(false)}
                className="px-4 py-2 bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 text-xs font-bold rounded-xl"
              >
                Hủy
              </button>
              <button
                type="button"
                disabled={!newClassName.trim() || isProcessing}
                onClick={handleCreateClass}
                className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-40 text-white text-xs font-extrabold rounded-xl shadow-sm transition-all active:scale-95"
              >
                {isProcessing ? 'Đang tạo...' : 'Tạo lớp học'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 2: ADD STUDENTS TO EXISTING CLASS */}
      {addingStudentsToClass && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl border border-slate-200 shadow-2xl w-full max-w-lg max-h-[85vh] flex flex-col overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-200 flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold text-slate-900">
                  Thêm học sinh vào lớp: <span className="text-indigo-600">{addingStudentsToClass}</span>
                </h3>
                <p className="text-xs text-slate-500">Tick chọn những học sinh bạn muốn thêm vào lớp này</p>
              </div>
              <button
                type="button"
                onClick={() => setAddingStudentsToClass(null)}
                className="p-2 text-slate-400 hover:text-slate-700 rounded-xl"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-5 overflow-y-auto flex-1 space-y-2">
              <div className="flex items-center justify-between text-xs font-bold text-slate-600 pb-2 border-b border-slate-100">
                <span>Danh sách học sinh ({allStudents.length})</span>
                <button
                  type="button"
                  onClick={() => {
                    const available = allStudents.filter(s => s.className !== addingStudentsToClass).map(s => s.id);
                    setSelectedStudentIdsToAdd(available);
                  }}
                  className="text-indigo-600 hover:underline"
                >
                  Chọn tất cả
                </button>
              </div>

              <div className="max-h-64 overflow-y-auto space-y-1">
                {allStudents.map(s => {
                  const isInThisClass = s.className === addingStudentsToClass;
                  return (
                    <label
                      key={s.id}
                      className={`flex items-center gap-2.5 p-2 rounded-xl border transition-colors cursor-pointer text-xs ${
                        isInThisClass ? 'bg-slate-100/70 border-slate-200 opacity-60 cursor-not-allowed' : 'bg-white hover:bg-indigo-50/50 border-slate-200'
                      }`}
                    >
                      <input
                        type="checkbox"
                        disabled={isInThisClass}
                        checked={isInThisClass || selectedStudentIdsToAdd.includes(s.id)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setSelectedStudentIdsToAdd(prev => [...prev, s.id]);
                          } else {
                            setSelectedStudentIdsToAdd(prev => prev.filter(id => id !== s.id));
                          }
                        }}
                        className="rounded text-indigo-600 focus:ring-indigo-500 w-4 h-4 cursor-pointer"
                      />
                      <img
                        src={s.avatar || `https://api.dicebear.com/7.x/bottts/svg?seed=${s.id}`}
                        alt={s.name}
                        className="w-6 h-6 rounded-full object-cover shrink-0"
                      />
                      <span className="font-bold text-slate-800">{s.name}</span>
                      <span className="text-[10px] text-slate-400 ml-auto">
                        {isInThisClass ? '✓ Đã ở trong lớp' : (s.className ? `Đang ở: ${s.className}` : '🔴 Chưa có lớp')}
                      </span>
                    </label>
                  );
                })}
              </div>
            </div>

            <div className="px-5 py-4 border-t border-slate-200 bg-slate-50 flex items-center justify-end gap-2.5">
              <button
                type="button"
                onClick={() => setAddingStudentsToClass(null)}
                className="px-4 py-2 bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 text-xs font-bold rounded-xl"
              >
                Hủy
              </button>
              <button
                type="button"
                disabled={selectedStudentIdsToAdd.length === 0 || isProcessing}
                onClick={() => handleAddStudentsToClass(addingStudentsToClass)}
                className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-40 text-white text-xs font-extrabold rounded-xl shadow-sm transition-all active:scale-95"
              >
                {isProcessing ? 'Đang thêm...' : `Thêm ${selectedStudentIdsToAdd.length} học sinh`}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 3: ASSIGN TEACHER TO CLASS */}
      {addingTeacherToClass && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl border border-slate-200 shadow-2xl w-full max-w-md overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-200 flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold text-slate-900">
                  Phân công Giáo viên vào lớp: <span className="text-indigo-600">{addingTeacherToClass}</span>
                </h3>
                <p className="text-xs text-slate-500">Chọn giáo viên sẽ phụ trách và giảng dạy lớp này</p>
              </div>
              <button
                type="button"
                onClick={() => setAddingTeacherToClass(null)}
                className="p-2 text-slate-400 hover:text-slate-700 rounded-xl"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-5 space-y-3">
              <div className="text-xs font-bold text-slate-700 uppercase">Chọn giáo viên:</div>
              <div className="max-h-60 overflow-y-auto space-y-1.5">
                {allTeachers.map(t => (
                  <label
                    key={t.id}
                    onClick={() => setSelectedTeacherIdToAdd(t.id)}
                    className={`flex items-center gap-3 p-2.5 rounded-xl border transition-all cursor-pointer ${
                      selectedTeacherIdToAdd === t.id
                        ? 'bg-indigo-50 border-indigo-400 text-indigo-900'
                        : 'bg-white hover:bg-slate-50 border-slate-200 text-slate-800'
                    }`}
                  >
                    <input
                      type="radio"
                      name="teacher_select"
                      checked={selectedTeacherIdToAdd === t.id}
                      onChange={() => setSelectedTeacherIdToAdd(t.id)}
                      className="text-indigo-600 focus:ring-indigo-500"
                    />
                    <img
                      src={t.avatar || `https://api.dicebear.com/7.x/bottts/svg?seed=${t.id}`}
                      alt={t.name}
                      className="w-8 h-8 rounded-full object-cover shrink-0"
                    />
                    <div>
                      <div className="text-xs font-bold">{t.name}</div>
                      <div className="text-[10px] text-slate-500">{t.phoneStudent || t.phoneParent || (t.className ? `Lớp ${t.className}` : 'Giáo viên')}</div>
                    </div>
                  </label>
                ))}
              </div>
            </div>

            <div className="px-5 py-4 border-t border-slate-200 bg-slate-50 flex items-center justify-end gap-2.5">
              <button
                type="button"
                onClick={() => setAddingTeacherToClass(null)}
                className="px-4 py-2 bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 text-xs font-bold rounded-xl"
              >
                Hủy
              </button>
              <button
                type="button"
                disabled={!selectedTeacherIdToAdd || isProcessing}
                onClick={() => handleAssignTeacherToClass(addingTeacherToClass)}
                className="px-5 py-2 bg-purple-600 hover:bg-purple-700 disabled:opacity-40 text-white text-xs font-extrabold rounded-xl shadow-sm transition-all active:scale-95"
              >
                {isProcessing ? 'Đang phân công...' : 'Xác nhận phân công'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 4: MOVE STUDENT TO ANOTHER CLASS */}
      {movingStudent && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl border border-slate-200 shadow-2xl w-full max-w-md overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-200 flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold text-slate-900">Chuyển Lớp Học Sinh</h3>
                <p className="text-xs text-slate-500">Chuyển học sinh <strong>{movingStudent.name}</strong> sang lớp khác</p>
              </div>
              <button
                type="button"
                onClick={() => setMovingStudent(null)}
                className="p-2 text-slate-400 hover:text-slate-700 rounded-xl"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-5 space-y-3">
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 flex items-center gap-3">
                <img
                  src={movingStudent.avatar || `https://api.dicebear.com/7.x/bottts/svg?seed=${movingStudent.id}`}
                  alt={movingStudent.name}
                  className="w-10 h-10 rounded-full object-cover shrink-0"
                />
                <div>
                  <div className="text-xs font-bold text-slate-900">{movingStudent.name}</div>
                  <div className="text-[11px] text-slate-500">
                    Lớp hiện tại: <strong className="text-indigo-600">{movingStudent.className || 'Chưa có lớp'}</strong>
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5 uppercase">
                  Chọn lớp học đích:
                </label>
                <select
                  value={targetClassForMove}
                  onChange={(e) => setTargetClassForMove(e.target.value)}
                  className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-800 outline-none focus:ring-2 focus:ring-indigo-500"
                >
                  <option value="">-- Chọn lớp học --</option>
                  {classesData.map(c => (
                    <option key={c.className} value={c.className}>
                      {c.className} ({c.students.length} HS)
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="px-5 py-4 border-t border-slate-200 bg-slate-50 flex items-center justify-end gap-2.5">
              <button
                type="button"
                onClick={() => setMovingStudent(null)}
                className="px-4 py-2 bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 text-xs font-bold rounded-xl"
              >
                Hủy
              </button>
              <button
                type="button"
                disabled={!targetClassForMove || targetClassForMove === movingStudent.className || isProcessing}
                onClick={handleMoveStudent}
                className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-40 text-white text-xs font-extrabold rounded-xl shadow-sm transition-all active:scale-95"
              >
                {isProcessing ? 'Đang chuyển...' : 'Xác nhận chuyển'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Generic Confirm Modal for Deletions */}
      {confirmModalConfig.isOpen && (
        <ConfirmModal
          isOpen={confirmModalConfig.isOpen}
          onClose={() => setConfirmModalConfig(prev => ({ ...prev, isOpen: false }))}
          onConfirm={confirmModalConfig.onConfirm}
          title={confirmModalConfig.title}
          message={confirmModalConfig.message}
          confirmText={confirmModalConfig.confirmText}
          cancelText="Hủy bỏ"
          variant={confirmModalConfig.variant || 'danger'}
          loading={isProcessing}
        />
      )}
    </div>
  );
}
