import React, { useState, useEffect, useRef } from 'react';
import { 
  CheckCircle2, Award, Shuffle, Users, Timer, X, Sparkles, 
  Calendar, Check, AlertTriangle, Clock, Star, ThumbsUp, 
  Flame, RotateCcw, Play, Pause, BellRing, Trophy, 
  ArrowRight, ShieldCheck, ChevronRight, Copy, Download
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import confetti from 'canvas-confetti';
import { db } from '../firebase';
import { doc, setDoc, updateDoc, increment, collection, onSnapshot, getDocs, query, where } from 'firebase/firestore';
import { CustomSelect } from './CustomSelect';

export type ToolTab = 'attendance' | 'merits' | 'random_picker' | 'group_maker' | 'timer';

interface TeacherClassroomToolsModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialTab?: ToolTab;
  studentsList: any[];
  className: string;
  availableClasses: string[];
  currentUser: any;
  onAwardPoints?: (studentId: string, points: number, reason: string) => void;
  showToast?: (message: string) => void;
}

export function TeacherClassroomToolsModal({
  isOpen,
  onClose,
  initialTab = 'attendance',
  studentsList,
  className,
  availableClasses,
  currentUser,
  onAwardPoints,
  showToast = () => {}
}: TeacherClassroomToolsModalProps) {
  const [activeTab, setActiveTab] = useState<ToolTab>(initialTab);
  const [selectedClass, setSelectedClass] = useState(className || '123456');

  useEffect(() => {
    if (initialTab) setActiveTab(initialTab);
  }, [initialTab]);

  useEffect(() => {
    if (className) setSelectedClass(className);
  }, [className]);

  // Filter students by selected class
  const classStudents = React.useMemo(() => {
    const filter = selectedClass.trim().toLowerCase();
    if (!filter || filter === 'tất cả') return studentsList;
    return studentsList.filter(s => (s.className || '').trim().toLowerCase() === filter);
  }, [studentsList, selectedClass]);

  // ==================== TOOL 1: ATTENDANCE ====================
  const [attendanceDate, setAttendanceDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [attendanceRecords, setAttendanceRecords] = useState<Record<string, 'present' | 'excused' | 'unexcused' | 'late'>>({});
  const [isSavingAttendance, setIsSavingAttendance] = useState(false);

  // Initialize attendance records when students list or date changes
  useEffect(() => {
    const initial: Record<string, 'present' | 'excused' | 'unexcused' | 'late'> = {};
    classStudents.forEach(s => {
      initial[s.id] = 'present';
    });
    setAttendanceRecords(initial);
  }, [classStudents, attendanceDate]);

  const handleSetAllAttendance = (status: 'present' | 'excused' | 'unexcused' | 'late') => {
    const updated: Record<string, 'present' | 'excused' | 'unexcused' | 'late'> = {};
    classStudents.forEach(s => {
      updated[s.id] = status;
    });
    setAttendanceRecords(updated);
  };

  const handleSaveAttendance = async () => {
    setIsSavingAttendance(true);
    try {
      const recordId = `att_${selectedClass.replace(/\s+/g, '_')}_${attendanceDate}`;
      await setDoc(doc(db, 'student_attendances', recordId), {
        id: recordId,
        className: selectedClass,
        date: attendanceDate,
        records: attendanceRecords,
        teacherId: currentUser?.id || '',
        updatedAt: new Date().toISOString()
      });

      // Update user attendance rates in users collection
      const updatePromises = Object.entries(attendanceRecords).map(async ([studentId, status]) => {
        try {
          const userRef = doc(db, 'users', studentId);
          // If status is present or late, award slight attendance points
          if (status === 'present') {
            await updateDoc(userRef, {
              lastAttendedDate: attendanceDate,
              attendanceRate: 100
            });
          }
        } catch (e) {
          // ignore individual update errors
        }
      });
      await Promise.all(updatePromises);

      showToast(`Đã lưu điểm danh lớp ${selectedClass} ngày ${attendanceDate} thành công!`);
    } catch (err: any) {
      console.error(err);
      showToast(`Lỗi khi lưu điểm danh: ${err.message}`);
    } finally {
      setIsSavingAttendanceAttendanceCount(false);
    }
  };

  const setIsSavingAttendanceAttendanceCount = (val: boolean) => setIsSavingAttendance(val);

  // ==================== TOOL 2: MERITS & PARTICIPATION ====================
  const [selectedMeritStudents, setSelectedMeritStudents] = useState<string[]>([]);
  const [customReason, setCustomReason] = useState('');
  const [customPoints, setCustomPoints] = useState(2);
  const [isAwarding, setIsAwarding] = useState(false);

  const PRESET_MERITS = [
    { label: 'Phát biểu hăng hái', points: 2, icon: Star, color: 'text-amber-500 bg-amber-50 border-amber-200' },
    { label: 'Bài làm xuất sắc', points: 5, icon: Award, color: 'text-emerald-500 bg-emerald-50 border-emerald-200' },
    { label: 'Giúp đỡ bạn bè', points: 3, icon: ThumbsUp, color: 'text-blue-500 bg-blue-50 border-blue-200' },
    { label: 'Ý tưởng sáng tạo', points: 5, icon: Sparkles, color: 'text-purple-500 bg-purple-50 border-purple-200' },
    { label: 'Hoàn thành đúng giờ', points: 2, icon: CheckCircle2, color: 'text-teal-500 bg-teal-50 border-teal-200' },
    { label: 'Nhắc nhở tập trung', points: -1, icon: AlertTriangle, color: 'text-rose-500 bg-rose-50 border-rose-200' }
  ];

  const handleAwardPresetMerit = async (preset: { label: string; points: number }) => {
    if (selectedMeritStudents.length === 0) {
      showToast('Vui lòng chọn ít nhất một học sinh để ghi điểm.');
      return;
    }
    setIsAwarding(true);
    try {
      const promises = selectedMeritStudents.map(async (studentId) => {
        const student = classStudents.find(s => s.id === studentId);
        const evalId = `eval_${studentId}_${Date.now()}`;

        await setDoc(doc(db, 'student_evaluations', evalId), {
          id: evalId,
          studentId,
          studentName: student?.name || (student as any)?.studentName || '',
          className: selectedClass,
          teacherId: currentUser?.id || '',
          points: preset.points,
          reason: preset.label,
          createdAt: new Date().toISOString()
        });

        // Update user points
        try {
          await updateDoc(doc(db, 'users', studentId), {
            meritPoints: increment(preset.points),
            points: increment(preset.points > 0 ? preset.points * 5 : 0)
          });
        } catch (e) {
          // ignore
        }

        // Trigger parent callback if provided
        if (onAwardPoints) {
          onAwardPoints(studentId, preset.points, preset.label);
        }
      });

      await Promise.all(promises);

      // Trigger confetti celebration for positive points
      if (preset.points > 0) {
        confetti({ particleCount: 60, spread: 70, origin: { y: 0.6 } });
      }

      showToast(`Đã ghi nhận "${preset.label}" (${preset.points > 0 ? '+' : ''}${preset.points} điểm) cho ${selectedMeritStudents.length} học sinh.`);
      setSelectedMeritStudents([]);
    } catch (err: any) {
      console.error(err);
      showToast(`Lỗi khi ghi điểm: ${err.message}`);
    } finally {
      setIsAwarding(false);
    }
  };

  // ==================== TOOL 3: RANDOM STUDENT PICKER ====================
  const [isSpinning, setIsSpinning] = useState(false);
  const [pickedStudent, setPickedStudent] = useState<any | null>(null);
  const [pickerHistory, setPickerHistory] = useState<any[]>([]);

  const handlePickRandomStudent = () => {
    if (classStudents.length === 0) {
      showToast('Danh sách lớp hiện tại chưa có học sinh nào.');
      return;
    }

    setIsSpinning(true);
    setPickedStudent(null);

    let counter = 0;
    const interval = setInterval(() => {
      const randIdx = Math.floor(Math.random() * classStudents.length);
      setPickedStudent(classStudents[randIdx]);
      counter++;

      if (counter > 18) {
        clearInterval(interval);
        const finalStudent = classStudents[Math.floor(Math.random() * classStudents.length)];
        setPickedStudent(finalStudent);
        setIsSpinning(false);
        setPickerHistory(prev => [finalStudent, ...prev.slice(0, 7)]);
        confetti({ particleCount: 80, spread: 80, origin: { y: 0.5 } });
      }
    }, 90);
  };

  // ==================== TOOL 4: GROUP MAKER ====================
  const [groupCount, setGroupCount] = useState(4);
  const [generatedGroups, setGeneratedGroups] = useState<{ name: string; members: any[] }[]>([]);

  const handleGenerateGroups = () => {
    if (classStudents.length === 0) return;
    const shuffled = [...classStudents].sort(() => 0.5 - Math.random());
    const count = Math.max(2, Math.min(groupCount, classStudents.length));
    const groups: { name: string; members: any[] }[] = Array.from({ length: count }, (_, i) => ({
      name: `Nhóm ${i + 1}`,
      members: []
    }));

    shuffled.forEach((student, idx) => {
      groups[idx % count].members.push(student);
    });

    setGeneratedGroups(groups);
    confetti({ particleCount: 50, spread: 60, origin: { y: 0.6 } });
  };

  const handleCopyGroups = () => {
    if (generatedGroups.length === 0) return;
    const text = generatedGroups.map(g => {
      const memberNames = g.members.map((m: any, idx) => `  ${idx + 1}. ${m.name || m.studentName || 'Học sinh'}`).join('\n');
      return `📌 ${g.name} (${g.members.length} thành viên):\n${memberNames}`;
    }).join('\n\n');

    navigator.clipboard.writeText(text);
    showToast('Đã sao chép danh sách các nhóm vào Clipboard!');
  };

  // ==================== TOOL 5: TIMER & STOPWATCH ====================
  const [timerSeconds, setTimerSeconds] = useState(300); // 5 mins
  const [isTimerRunning, setIsTimerRunning] = useState(false);
  const timerRef = useRef<any>(null);

  useEffect(() => {
    if (isTimerRunning && timerSeconds > 0) {
      timerRef.current = setInterval(() => {
        setTimerSeconds(prev => {
          if (prev <= 1) {
            clearInterval(timerRef.current);
            setIsTimerRunning(false);
            confetti({ particleCount: 100, spread: 90 });
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    } else {
      if (timerRef.current) clearInterval(timerRef.current);
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [isTimerRunning, timerSeconds]);

  const formatTimer = (sec: number) => {
    const mins = Math.floor(sec / 60);
    const s = sec % 60;
    return `${mins.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  if (!isOpen) return null;

  const classOptions = [
    { value: className || '123456', label: `Lớp hiện tại (${className || '123456'})` },
    ...availableClasses.filter(c => c && c !== className).map(c => ({ value: c, label: `Lớp ${c}` }))
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
      <motion.div
        initial={{ opacity: 0, scale: 0.96, y: 8 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.96, y: 8 }}
        className="bg-white w-full max-w-4xl rounded-3xl shadow-2xl border border-slate-100 overflow-hidden flex flex-col max-h-[92vh]"
      >
        {/* Modal Top Header */}
        <div className="px-6 py-4.5 bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white flex items-center justify-between shrink-0 border-b border-indigo-900/40">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-indigo-500/20 border border-indigo-400/30 rounded-2xl flex items-center justify-center text-indigo-300 shadow-inner">
              <Sparkles className="w-5 h-5 text-indigo-300" />
            </div>
            <div>
              <h3 className="text-base sm:text-lg font-black tracking-tight text-white flex items-center gap-2">
                Bộ Công Cụ Lớp Học Dành Cho Giáo Viên
              </h3>
              <p className="text-xs text-indigo-200/80 font-medium">
                Điểm danh, ghi điểm tích cực, quay số gọi tên & tổ chức hoạt động lớp
              </p>
            </div>
          </div>
          <button 
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Sub-Header & Navigation Bar */}
        <div className="px-6 py-3 bg-slate-50 border-b border-slate-200 flex flex-col md:flex-row md:items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 md:pb-0 custom-scrollbar">
            <button
              type="button"
              onClick={() => setActiveTab('attendance')}
              className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 whitespace-nowrap ${
                activeTab === 'attendance'
                  ? 'bg-indigo-600 text-white shadow-xs'
                  : 'bg-white hover:bg-slate-100 text-slate-700 border border-slate-200'
              }`}
            >
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>Điểm danh & Chuyên cần</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('merits')}
              className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 whitespace-nowrap ${
                activeTab === 'merits'
                  ? 'bg-indigo-600 text-white shadow-xs'
                  : 'bg-white hover:bg-slate-100 text-slate-700 border border-slate-200'
              }`}
            >
              <Award className="w-3.5 h-3.5" />
              <span>Điểm Tích Cực / Rèn Luyện</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('random_picker')}
              className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 whitespace-nowrap ${
                activeTab === 'random_picker'
                  ? 'bg-indigo-600 text-white shadow-xs'
                  : 'bg-white hover:bg-slate-100 text-slate-700 border border-slate-200'
              }`}
            >
              <Shuffle className="w-3.5 h-3.5" />
              <span>Gọi Tên Ngẫu Nhiên</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('group_maker')}
              className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 whitespace-nowrap ${
                activeTab === 'group_maker'
                  ? 'bg-indigo-600 text-white shadow-xs'
                  : 'bg-white hover:bg-slate-100 text-slate-700 border border-slate-200'
              }`}
            >
              <Users className="w-3.5 h-3.5" />
              <span>Chia Nhóm Học Tập</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('timer')}
              className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 whitespace-nowrap ${
                activeTab === 'timer'
                  ? 'bg-indigo-600 text-white shadow-xs'
                  : 'bg-white hover:bg-slate-100 text-slate-700 border border-slate-200'
              }`}
            >
              <Timer className="w-3.5 h-3.5" />
              <span>Đồng Hồ Bấm Giờ</span>
            </button>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <span className="text-xs font-bold text-slate-500">Lớp:</span>
            <div className="min-w-[170px] w-48">
              <CustomSelect
                value={selectedClass}
                onChange={setSelectedClass}
                options={classOptions}
                className="w-full"
              />
            </div>
          </div>
        </div>

        {/* Modal Main Content */}
        <div className="p-6 overflow-y-auto custom-scrollbar flex-1 bg-slate-50/50">
          {/* TAB 1: ATTENDANCE */}
          {activeTab === 'attendance' && (
            <div className="space-y-4">
              {/* Date bar & Quick Actions */}
              <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-center gap-2.5">
                  <Calendar className="w-4 h-4 text-indigo-600" />
                  <span className="text-xs font-bold text-slate-700">Ngày điểm danh:</span>
                  <input
                    type="date"
                    value={attendanceDate}
                    onChange={e => setAttendanceDate(e.target.value)}
                    className="px-3 py-1.5 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-800 focus:outline-hidden focus:border-indigo-500 shadow-2xs"
                  />
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => handleSetAllAttendance('present')}
                    className="px-3.5 py-2 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 text-emerald-700 rounded-xl text-xs font-extrabold transition-all flex items-center gap-1.5 active:scale-95 shadow-2xs"
                  >
                    <Check className="w-3.5 h-3.5" />
                    <span>Có mặt tất cả</span>
                  </button>
                  <button
                    type="button"
                    onClick={handleSaveAttendance}
                    disabled={isSavingAttendance}
                    className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-black shadow-sm shadow-indigo-100 transition-all flex items-center gap-1.5 active:scale-95"
                  >
                    {isSavingAttendance ? 'Đang lưu...' : 'Lưu Điểm Danh'}
                  </button>
                </div>
              </div>

              {/* Attendance Table */}
              <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-xs">
                <div className="p-3 bg-slate-50 border-b border-slate-200 flex items-center justify-between text-xs font-extrabold text-slate-700">
                  <span>Danh sách học sinh lớp {selectedClass} ({classStudents.length})</span>
                  <div className="flex items-center gap-3 text-[11px] font-semibold">
                    <span className="flex items-center gap-1 text-emerald-700">
                      <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" /> Có mặt
                    </span>
                    <span className="flex items-center gap-1 text-amber-700">
                      <span className="w-2.5 h-2.5 rounded-full bg-amber-500" /> Có phép
                    </span>
                    <span className="flex items-center gap-1 text-rose-700">
                      <span className="w-2.5 h-2.5 rounded-full bg-rose-500" /> Không phép
                    </span>
                    <span className="flex items-center gap-1 text-purple-700">
                      <span className="w-2.5 h-2.5 rounded-full bg-purple-500" /> Đi muộn
                    </span>
                  </div>
                </div>

                <div className="divide-y divide-slate-100 max-h-96 overflow-y-auto custom-scrollbar">
                  {classStudents.map((st, idx) => {
                    const currentStatus = attendanceRecords[st.id] || 'present';
                    return (
                      <div key={st.id} className="p-3 flex items-center justify-between gap-3 hover:bg-slate-50/80 transition-colors">
                        <div className="flex items-center gap-3 min-w-0">
                          <span className="w-6 text-center text-xs font-bold text-slate-400">{idx + 1}</span>
                          <div className="min-w-0">
                            <p className="text-xs font-black text-slate-900 truncate">{st.name || (st as any).studentName || 'Học sinh'}</p>
                          </div>
                        </div>

                        {/* Status Toggle Buttons */}
                        <div className="flex items-center gap-1.5 shrink-0">
                          <button
                            type="button"
                            onClick={() => setAttendanceRecords(prev => ({ ...prev, [st.id]: 'present' }))}
                            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all active:scale-95 ${
                              currentStatus === 'present'
                                ? 'bg-emerald-600 text-white shadow-sm shadow-emerald-200/60 border border-emerald-600'
                                : 'bg-slate-100/90 text-slate-600 hover:bg-emerald-50 hover:text-emerald-700 border border-slate-200/80'
                            }`}
                          >
                            Có mặt
                          </button>
                          <button
                            type="button"
                            onClick={() => setAttendanceRecords(prev => ({ ...prev, [st.id]: 'excused' }))}
                            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all active:scale-95 ${
                              currentStatus === 'excused'
                                ? 'bg-amber-500 text-white shadow-sm shadow-amber-200/60 border border-amber-500'
                                : 'bg-slate-100/90 text-slate-600 hover:bg-amber-50 hover:text-amber-700 border border-slate-200/80'
                            }`}
                          >
                            Có phép
                          </button>
                          <button
                            type="button"
                            onClick={() => setAttendanceRecords(prev => ({ ...prev, [st.id]: 'unexcused' }))}
                            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all active:scale-95 ${
                              currentStatus === 'unexcused'
                                ? 'bg-rose-600 text-white shadow-sm shadow-rose-200/60 border border-rose-600'
                                : 'bg-slate-100/90 text-slate-600 hover:bg-rose-50 hover:text-rose-700 border border-slate-200/80'
                            }`}
                          >
                            Vắng
                          </button>
                          <button
                            type="button"
                            onClick={() => setAttendanceRecords(prev => ({ ...prev, [st.id]: 'late' }))}
                            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all active:scale-95 ${
                              currentStatus === 'late'
                                ? 'bg-purple-600 text-white shadow-sm shadow-purple-200/60 border border-purple-600'
                                : 'bg-slate-100/90 text-slate-600 hover:bg-purple-50 hover:text-purple-700 border border-slate-200/80'
                            }`}
                          >
                            Muộn
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: MERITS & PARTICIPATION */}
          {activeTab === 'merits' && (
            <div className="space-y-4">
              {/* Presets Action Bar */}
              <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-black text-slate-800 flex items-center gap-1.5">
                    <Star className="w-4 h-4 text-amber-500" />
                    Cộng/Trừ Điểm Tích Cực Nhanh (Đang chọn {selectedMeritStudents.length} học sinh):
                  </span>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setSelectedMeritStudents(classStudents.map(s => s.id))}
                      className="text-xs font-bold text-indigo-600 hover:underline"
                    >
                      Chọn tất cả
                    </button>
                    <span className="text-slate-300">•</span>
                    <button
                      type="button"
                      onClick={() => setSelectedMeritStudents([])}
                      className="text-xs font-bold text-slate-500 hover:underline"
                    >
                      Bỏ chọn
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-2">
                  {PRESET_MERITS.map((preset, idx) => {
                    const Icon = preset.icon;
                    return (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => handleAwardPresetMerit(preset)}
                        disabled={isAwarding || selectedMeritStudents.length === 0}
                        className={`p-2.5 rounded-xl border text-xs font-extrabold flex flex-col items-center justify-center gap-1.5 transition-all active:scale-95 disabled:opacity-40 shadow-xs hover:shadow-sm ${preset.color}`}
                      >
                        <Icon className="w-4 h-4" />
                        <span className="text-center text-[11px] leading-tight">{preset.label}</span>
                        <span className="text-[10px] font-black px-1.5 py-0.5 rounded-md bg-white/80">
                          {preset.points > 0 ? `+${preset.points}` : preset.points} ⭐
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Student List for Merit Selection */}
              <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-xs">
                <div className="p-3 bg-slate-50 border-b border-slate-200 text-xs font-extrabold text-slate-700">
                  Chọn học sinh để ghi nhận điểm rèn luyện ({classStudents.length} học sinh)
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2 p-3 max-h-80 overflow-y-auto custom-scrollbar">
                  {classStudents.map((st, idx) => {
                    const isSelected = selectedMeritStudents.includes(st.id);
                    return (
                      <div
                        key={st.id}
                        onClick={() => {
                          setSelectedMeritStudents(prev =>
                            isSelected ? prev.filter(id => id !== st.id) : [...prev, st.id]
                          );
                        }}
                        className={`p-2.5 rounded-xl border cursor-pointer transition-all flex items-center justify-between gap-2 active:scale-98 ${
                          isSelected
                            ? 'bg-indigo-50 border-indigo-300 ring-2 ring-indigo-500/20 shadow-xs'
                            : 'bg-white border-slate-200 hover:bg-slate-50'
                        }`}
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          <span className="w-5 text-center text-xs font-bold text-slate-400">{idx + 1}</span>
                          <p className="text-xs font-black text-slate-900 truncate">{st.name || (st as any).studentName || 'Học sinh'}</p>
                        </div>
                        <div className="flex items-center gap-1.5 shrink-0">
                          <span className="text-xs font-black text-amber-600 bg-amber-50 px-1.5 py-0.5 rounded-md border border-amber-200">
                            {st.meritPoints || st.points || 0} ⭐
                          </span>
                          <div className={`w-4 h-4 rounded-md flex items-center justify-center ${
                            isSelected ? 'bg-indigo-600 text-white' : 'border border-slate-300'
                          }`}>
                            {isSelected && <Check className="w-3 h-3 stroke-[3]" />}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: RANDOM STUDENT PICKER */}
          {activeTab === 'random_picker' && (
            <div className="space-y-6 flex flex-col items-center text-center py-4">
              <div className="w-full max-w-md bg-white p-6 rounded-3xl border border-slate-200 shadow-md flex flex-col items-center">
                <div className="w-20 h-20 rounded-3xl bg-gradient-to-tr from-indigo-500 to-violet-600 text-white flex items-center justify-center shadow-lg shadow-indigo-500/30 mb-4 animate-bounce">
                  <Shuffle className="w-10 h-10" />
                </div>

                <h4 className="text-lg font-black text-slate-900 mb-1">
                  Vòng Quay Gọi Tên Ngẫu Nhiên
                </h4>
                <p className="text-xs text-slate-500 mb-6">
                  Gọi học sinh trả lời câu hỏi hoặc làm bài tập một cách bất ngờ & công bằng!
                </p>

                {pickedStudent ? (
                  <motion.div
                    initial={{ scale: 0.8, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    className="w-full p-4 bg-indigo-50 border border-indigo-200 rounded-2xl mb-5"
                  >
                    <span className="text-[11px] font-extrabold text-indigo-600 uppercase tracking-wider">
                      🎉 Học sinh được chọn:
                    </span>
                    <p className="text-2xl font-black text-slate-900 mt-1">
                      {pickedStudent.name || (pickedStudent as any).studentName || 'Học sinh'}
                    </p>
                    <p className="text-xs font-bold text-slate-500 mt-0.5">
                      Lớp: {selectedClass}
                    </p>

                    <div className="mt-3 flex items-center justify-center gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedMeritStudents([pickedStudent.id]);
                          setActiveTab('merits');
                        }}
                        className="px-3.5 py-1.5 bg-amber-500 hover:bg-amber-600 text-white rounded-xl text-xs font-bold shadow-xs transition-all flex items-center gap-1.5"
                      >
                        <Star className="w-3.5 h-3.5" />
                        <span>Thưởng Điểm Tích Cực (+2⭐)</span>
                      </button>
                    </div>
                  </motion.div>
                ) : (
                  <div className="w-full h-24 border-2 border-dashed border-slate-200 rounded-2xl flex items-center justify-center text-xs font-bold text-slate-400 mb-5">
                    Bấm nút bên dưới để quay tên học sinh
                  </div>
                )}

                <button
                  type="button"
                  disabled={isSpinning || classStudents.length === 0}
                  onClick={handlePickRandomStudent}
                  className="w-full py-3.5 bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-700 hover:to-violet-700 disabled:opacity-50 text-white font-black text-sm rounded-2xl shadow-lg shadow-indigo-600/25 transition-all flex items-center justify-center gap-2 active:scale-95"
                >
                  <Shuffle className={`w-4 h-4 ${isSpinning ? 'animate-spin' : ''}`} />
                  <span>{isSpinning ? 'Đang quay ngẫu nhiên...' : 'Quay Chọn Học Sinh'}</span>
                </button>
              </div>

              {/* History */}
              {pickerHistory.length > 0 && (
                <div className="w-full max-w-md bg-white p-4 rounded-2xl border border-slate-200 shadow-xs text-left">
                  <span className="text-xs font-extrabold text-slate-600">Lịch sử lượt gọi gần đây:</span>
                  <div className="flex flex-wrap gap-1.5 mt-2">
                    {pickerHistory.map((h: any, i) => (
                      <span key={i} className="px-2.5 py-1 bg-slate-100 rounded-lg text-xs font-bold text-slate-800">
                        {h.name || h.studentName || 'Học sinh'}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* TAB 4: GROUP MAKER */}
          {activeTab === 'group_maker' && (
            <div className="space-y-4">
              <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <span className="text-xs font-bold text-slate-700 shrink-0">Số lượng nhóm cần chia:</span>
                  <div className="w-36">
                    <CustomSelect
                      value={String(groupCount)}
                      onChange={(val) => setGroupCount(parseInt(val))}
                      options={[2, 3, 4, 5, 6, 7, 8].map(num => ({
                        value: String(num),
                        label: `${num} Nhóm`
                      }))}
                      size="sm"
                      searchable={false}
                    />
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={handleGenerateGroups}
                    className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-black shadow-sm shadow-indigo-100 transition-all flex items-center gap-1.5 active:scale-95"
                  >
                    <Shuffle className="w-3.5 h-3.5" />
                    <span>Chia Nhóm Tự Động</span>
                  </button>
                  {generatedGroups.length > 0 && (
                    <button
                      type="button"
                      onClick={handleCopyGroups}
                      className="px-3.5 py-2 bg-slate-100/90 hover:bg-slate-200/80 border border-slate-200/60 text-slate-700 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 active:scale-95 shadow-2xs"
                    >
                      <Copy className="w-3.5 h-3.5" />
                      <span>Sao chép</span>
                    </button>
                  )}
                </div>
              </div>

              {/* Group Cards */}
              {generatedGroups.length > 0 ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                  {generatedGroups.map((grp, idx) => (
                    <div key={idx} className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm flex flex-col">
                      <div className="flex items-center justify-between pb-2 border-b border-slate-100 mb-2">
                        <span className="text-xs font-black text-indigo-700 flex items-center gap-1.5">
                          <Users className="w-3.5 h-3.5" />
                          {grp.name}
                        </span>
                        <span className="text-[11px] font-bold text-slate-400 bg-slate-100 px-2 py-0.5 rounded-md">
                          {grp.members.length} bạn
                        </span>
                      </div>
                      <div className="space-y-1.5 flex-1">
                        {grp.members.map((m: any, mIdx) => (
                          <div key={m.id || mIdx} className="text-xs font-bold text-slate-800 flex items-center gap-2 p-1.5 bg-slate-50 border border-slate-100 rounded-xl">
                            <span className="w-4 text-[10px] font-bold text-slate-400 text-center">{mIdx + 1}.</span>
                            <span className="truncate">{m.name || m.studentName || 'Học sinh'}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="p-8 bg-white border border-slate-200 rounded-2xl text-center text-xs text-slate-500">
                  Bấm "Chia Nhóm Tự Động" để phân chia danh sách lớp {selectedClass} thành các nhóm ngẫu nhiên.
                </div>
              )}
            </div>
          )}

          {/* TAB 5: TIMER & STOPWATCH */}
          {activeTab === 'timer' && (
            <div className="flex flex-col items-center justify-center py-6 space-y-6">
              <div className="bg-white p-8 rounded-3xl border border-slate-200 shadow-sm w-full max-w-sm flex flex-col items-center">
                <span className="text-xs font-extrabold text-slate-400 uppercase tracking-widest mb-2">
                  Đồng hồ đếm ngược hoạt động
                </span>
                <div className="text-6xl font-black font-mono tracking-tight text-slate-900 mb-6">
                  {formatTimer(timerSeconds)}
                </div>

                {/* Preset timer buttons */}
                <div className="flex flex-wrap justify-center gap-2 mb-6">
                  {[60, 120, 180, 300, 600, 900].map((sec) => (
                    <button
                      key={sec}
                      type="button"
                      onClick={() => {
                        setIsTimerRunning(false);
                        setTimerSeconds(sec);
                      }}
                      className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all active:scale-95 shadow-2xs border ${
                        timerSeconds === sec
                          ? 'bg-indigo-600 text-white border-indigo-600 shadow-sm shadow-indigo-100'
                          : 'bg-slate-50 text-slate-600 border-slate-200 hover:border-indigo-300'
                      }`}
                    >
                      {sec / 60} phút
                    </button>
                  ))}
                </div>

                <div className="flex items-center gap-3 w-full">
                  <button
                    type="button"
                    onClick={() => setIsTimerRunning(prev => !prev)}
                    className={`flex-1 py-3 rounded-xl text-xs font-black text-white shadow-sm transition-all flex items-center justify-center gap-2 active:scale-95 ${
                      isTimerRunning
                        ? 'bg-amber-500 hover:bg-amber-600 shadow-amber-200'
                        : 'bg-indigo-600 hover:bg-indigo-700 shadow-indigo-200'
                    }`}
                  >
                    {isTimerRunning ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
                    <span>{isTimerRunning ? 'Tạm Dừng' : 'Bắt Đầu'}</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setIsTimerRunning(false);
                      setTimerSeconds(300);
                    }}
                    className="p-3 bg-slate-100/90 hover:bg-slate-200/80 border border-slate-200/60 text-slate-700 rounded-xl transition-all active:scale-95 shadow-2xs"
                  >
                    <RotateCcw className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="px-6 py-3.5 bg-white border-t border-slate-200 flex items-center justify-between shrink-0">
          <span className="text-xs text-slate-500 font-medium">
            Công cụ hỗ trợ lớp học trực quan • Tích hợp tự động với cơ sở dữ liệu
          </span>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl transition-all"
          >
            Đóng
          </button>
        </div>
      </motion.div>
    </div>
  );
}
