import React, { useState, useEffect, useMemo } from 'react';
import { User, QuestionSetItem, QuizQuestion, Assignment } from '../types';
import { Search, Plus, Layers, Pencil, Trash2, Eye, Copy, Play, BookOpen, Check, X, Sparkles, Filter, FileText, CheckCircle2, ChevronRight, HelpCircle, Gamepad2, ArrowRight } from 'lucide-react';
import { db } from '../firebase';
import { collection, onSnapshot, doc, setDoc, deleteDoc } from 'firebase/firestore';
import { SAMPLE_TEMPLATES, parseRawCodeToQuestions } from './AssignmentsView';
import { GamePreview } from '../components/GamePreview';
import { ConfirmModal } from '../components/ConfirmModal';

interface QuestionBankViewProps {
  user: User;
  onNavigateToTab?: (tab: string) => void;
  onAddAssignment?: (assignment: Omit<Assignment, 'id' | 'createdAt'>) => Promise<void>;
}

export const QuestionBankView: React.FC<QuestionBankViewProps> = ({
  user,
  onNavigateToTab,
  onAddAssignment
}) => {
  const [sets, setSets] = useState<QuestionSetItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterSubject, setFilterSubject] = useState('all');
  const [filterGrade, setFilterGrade] = useState('all');

  // Modals & Active items
  const [showAddEditModal, setShowAddEditModal] = useState(false);
  const [editingSet, setEditingSet] = useState<QuestionSetItem | null>(null);
  
  // Form Inputs
  const [inputTitle, setInputTitle] = useState('');
  const [inputSubject, setInputSubject] = useState('Toán');
  const [inputGrade, setInputGrade] = useState('Khối 12');
  const [inputDescription, setInputDescription] = useState('');
  const [inputRawCode, setInputRawCode] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  // Preview / Detail Modal
  const [previewingSet, setPreviewingSet] = useState<QuestionSetItem | null>(null);

  // Direct Game Play Modal
  const [gamePlaySet, setGamePlaySet] = useState<QuestionSetItem | null>(null);
  const [selectedGameType, setSelectedGameType] = useState('super_race');

  // Delete Confirm Modal
  const [deleteTargetSet, setDeleteTargetSet] = useState<QuestionSetItem | null>(null);

  // Assign modal
  const [assigningSet, setAssigningSet] = useState<QuestionSetItem | null>(null);
  const [assignDueDate, setAssignDueDate] = useState('');
  const [assignClassName, setAssignClassName] = useState('123456');
  const [isAssigning, setIsAssigning] = useState(false);

  // 1. Real-time sync with Firestore question_sets collection
  useEffect(() => {
    setIsLoading(true);
    const unsubscribe = onSnapshot(
      collection(db, 'question_sets'),
      (snapshot) => {
        const loaded: QuestionSetItem[] = snapshot.docs.map(docSnap => ({
          id: docSnap.id,
          ...docSnap.data()
        } as QuestionSetItem));

        loaded.sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime());
        setSets(loaded);
        setIsLoading(false);
      },
      (error) => {
        console.error("Lỗi khi tải ngân hàng bộ đề:", error);
        setIsLoading(false);
      }
    );

    return () => unsubscribe();
  }, []);

  // Filtered sets list
  const filteredSets = useMemo(() => {
    return sets.filter(s => {
      const matchSearch = !searchQuery.trim() ||
        s.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (s.description && s.description.toLowerCase().includes(searchQuery.toLowerCase())) ||
        (s.subject && s.subject.toLowerCase().includes(searchQuery.toLowerCase()));

      const matchSubject = filterSubject === 'all' || s.subject === filterSubject;
      const matchGrade = filterGrade === 'all' || s.grade === filterGrade;

      return matchSearch && matchSubject && matchGrade;
    });
  }, [sets, searchQuery, filterSubject, filterGrade]);

  // Overall Stats
  const stats = useMemo(() => {
    const totalSets = sets.length;
    const totalQuestions = sets.reduce((acc, s) => {
      if (s.questions && s.questions.length > 0) return acc + s.questions.length;
      if (s.rawCode) {
        const { parsedQuestions } = parseRawCodeToQuestions(s.rawCode);
        return acc + parsedQuestions.length;
      }
      return acc;
    }, 0);
    const uniqueSubjects = Array.from(new Set(sets.map(s => s.subject).filter(Boolean))).length;

    return { totalSets, totalQuestions, uniqueSubjects };
  }, [sets]);

  const handleOpenAddModal = () => {
    setEditingSet(null);
    setInputTitle('');
    setInputSubject('Toán');
    setInputGrade('Khối 12');
    setInputDescription('');
    setInputRawCode(SAMPLE_TEMPLATES.mau1);
    setShowAddEditModal(true);
  };

  const handleOpenEditModal = (setItem: QuestionSetItem) => {
    setEditingSet(setItem);
    setInputTitle(setItem.title);
    setInputSubject(setItem.subject || 'Toán');
    setInputGrade(setItem.grade || 'Khối 12');
    setInputDescription(setItem.description || '');
    setInputRawCode(setItem.rawCode || (setItem.questions && setItem.questions.length > 0 ? '' : SAMPLE_TEMPLATES.mau1));
    setShowAddEditModal(true);
  };

  const handleSaveSet = async () => {
    if (!inputTitle.trim()) {
      alert('Vui lòng nhập Tên Bộ Đề!');
      return;
    }

    setIsSaving(true);
    try {
      const parsed = parseRawCodeToQuestions(inputRawCode);
      const setId = editingSet ? editingSet.id : `qset_${Date.now()}`;

      const setPayload: QuestionSetItem = {
        id: setId,
        title: inputTitle.trim(),
        subject: inputSubject.trim(),
        grade: inputGrade.trim(),
        description: inputDescription.trim(),
        rawCode: inputRawCode,
        questions: parsed.parsedQuestions.map((q, idx) => ({
          id: q.id || `${idx + 1}`,
          numStr: q.numStr,
          question: q.question,
          type: q.type,
          options: q.options,
          correctAnswer: q.correctAnswer,
          points: q.points || 1,
          solutionText: q.solutionText
        })),
        createdAt: editingSet ? editingSet.createdAt : new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        teacherId: user.id,
        teacherName: user.name,
        usageCount: editingSet ? (editingSet.usageCount || 0) : 0
      };

      await setDoc(doc(db, 'question_sets', setId), setPayload);
      setIsSaving(false);
      setShowAddEditModal(false);
    } catch (err) {
      console.error("Lỗi khi lưu bộ đề:", err);
      alert('Có lỗi xảy ra khi lưu bộ đề!');
      setIsSaving(false);
    }
  };

  const handleDuplicateSet = async (setItem: QuestionSetItem) => {
    try {
      const newId = `qset_${Date.now()}`;
      const duplicatePayload: QuestionSetItem = {
        ...setItem,
        id: newId,
        title: `${setItem.title} (Bản sao)`,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        usageCount: 0
      };

      await setDoc(doc(db, 'question_sets', newId), duplicatePayload);
    } catch (err) {
      console.error("Lỗi khi sao chép bộ đề:", err);
      alert('Không thể sao chép bộ đề!');
    }
  };

  const handleDeleteSet = async () => {
    if (!deleteTargetSet) return;
    try {
      await deleteDoc(doc(db, 'question_sets', deleteTargetSet.id));
      setDeleteTargetSet(null);
    } catch (err) {
      console.error("Lỗi khi xóa bộ đề:", err);
      alert('Không thể xóa bộ đề này!');
    }
  };

  const handleAssignToStudents = async () => {
    if (!assigningSet || !onAddAssignment) return;
    if (!assignDueDate) {
      alert('Vui lòng chọn Hạn nộp bài!');
      return;
    }

    setIsAssigning(true);
    try {
      const parsed = parseRawCodeToQuestions(assigningSet.rawCode || '');
      const questionsList = assigningSet.questions && assigningSet.questions.length > 0 
        ? assigningSet.questions 
        : parsed.parsedQuestions.map((q, idx) => ({
            id: q.id || `${idx + 1}`,
            numStr: q.numStr,
            question: q.question,
            type: q.type,
            options: q.options,
            correctAnswer: q.correctAnswer,
            points: q.points || 1,
            solutionText: q.solutionText
          }));

      await onAddAssignment({
        title: assigningSet.title,
        description: assigningSet.description || `Bài tập từ Ngân hàng bộ đề (${assigningSet.subject || ''})`,
        dueDate: new Date(assignDueDate).toISOString(),
        type: 'online_test',
        questions: questionsList,
        rawCode: assigningSet.rawCode,
        isPublished: true,
        className: assignClassName,
        teacherId: user.id,
        teacherName: user.name
      });

      setIsAssigning(false);
      setAssigningSet(null);
      alert(`Đã giao bài tập "${assigningSet.title}" thành công cho học sinh!`);
      if (onNavigateToTab) {
        onNavigateToTab('assignments');
      }
    } catch (err) {
      console.error("Lỗi khi giao bài tập:", err);
      alert('Có lỗi khi tạo bài tập!');
      setIsAssigning(false);
    }
  };

  // Parsed preview questions helper
  const parsedModalQuestions = useMemo(() => {
    if (!inputRawCode) return [];
    return parseRawCodeToQuestions(inputRawCode).parsedQuestions;
  }, [inputRawCode]);

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      
      {/* BANNER HEADER */}
      <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-indigo-900 rounded-3xl p-6 sm:p-8 text-white relative overflow-hidden shadow-xl border border-indigo-800/30">
        <div className="relative z-10 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <span className="bg-indigo-500/30 text-indigo-200 text-[10px] font-extrabold px-3 py-1 rounded-full uppercase tracking-wider mb-2.5 inline-flex items-center gap-1.5 border border-indigo-400/20">
              <Layers className="w-3.5 h-3.5 text-indigo-300" />
              Kho Lưu Trữ & Quản Lý Đề Thi
            </span>
            <h2 className="text-2xl sm:text-3xl font-black tracking-tight text-white">
              Ngân Hàng Bộ Đề Trắc Nghiệm & Game
            </h2>
            <p className="text-indigo-200/90 text-xs sm:text-sm mt-1 max-w-2xl leading-relaxed">
              Lưu trữ, phân loại và quản lý nhiều tập câu hỏi riêng biệt. Tái sử dụng linh hoạt để giao bài tập trắc nghiệm hoặc kết nối vào các Trò chơi tương tác học tập.
            </p>
          </div>

          <button
            type="button"
            onClick={handleOpenAddModal}
            className="px-5 py-3 bg-emerald-500 hover:bg-emerald-600 text-white font-extrabold text-xs sm:text-sm rounded-2xl transition-all shadow-lg shadow-emerald-900/30 shrink-0 flex items-center gap-2 active:scale-95"
          >
            <Plus className="w-4 h-4" />
            <span>+ Thêm bộ đề mới</span>
          </button>
        </div>

        {/* BACKGROUND DECORATIVE GLOW */}
        <div className="absolute -right-10 -bottom-10 w-64 h-64 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />
      </div>

      {/* STATS OVERVIEW METRICS */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white border border-slate-200 rounded-3xl p-5 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center font-black border border-indigo-100 shrink-0">
            <Layers className="w-6 h-6" />
          </div>
          <div>
            <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Tổng số bộ đề</p>
            <p className="text-2xl font-black text-slate-900">{stats.totalSets}</p>
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-3xl p-5 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center font-black border border-emerald-100 shrink-0">
            <HelpCircle className="w-6 h-6" />
          </div>
          <div>
            <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Tổng số câu trắc nghiệm</p>
            <p className="text-2xl font-black text-slate-900">{stats.totalQuestions}</p>
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-3xl p-5 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center font-black border border-amber-100 shrink-0">
            <BookOpen className="w-6 h-6" />
          </div>
          <div>
            <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Môn học đã phân loại</p>
            <p className="text-2xl font-black text-slate-900">{stats.uniqueSubjects}</p>
          </div>
        </div>
      </div>

      {/* FILTER & SEARCH BAR */}
      <div className="bg-white rounded-3xl border border-slate-200 p-4 shadow-sm flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <input
            type="text"
            placeholder="Tìm theo tên bộ đề, nội dung câu hỏi, môn học..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-8 py-2.5 text-xs bg-slate-50 border border-slate-200 focus:border-indigo-500 focus:bg-white focus:ring-1 focus:ring-indigo-500 rounded-xl font-bold text-slate-800 transition-all"
          />
          <Search className="absolute left-3 top-3 w-4 h-4 text-slate-400" />
          {searchQuery && (
            <button onClick={() => setSearchQuery('')} className="absolute right-2.5 top-2.5 text-slate-400 hover:text-slate-600">
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        <div className="flex items-center gap-2">
          <select
            value={filterSubject}
            onChange={e => setFilterSubject(e.target.value)}
            className="px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-extrabold text-slate-700 outline-none focus:ring-2 focus:ring-indigo-500"
          >
            <option value="all">Tất cả môn học ({sets.length})</option>
            <option value="Toán">Toán</option>
            <option value="Ngữ Văn">Ngữ Văn</option>
            <option value="Tiếng Anh">Tiếng Anh</option>
            <option value="Vật Lý">Vật Lý</option>
            <option value="Hóa Học">Hóa Học</option>
            <option value="Sinh Học">Sinh Học</option>
            <option value="Lịch Sử">Lịch Sử</option>
            <option value="Địa Lý">Địa Lý</option>
            <option value="Tin Học">Tin Học</option>
            <option value="GDCD">GDCD</option>
            <option value="Khác">Khác</option>
          </select>

          <select
            value={filterGrade}
            onChange={e => setFilterGrade(e.target.value)}
            className="px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-extrabold text-slate-700 outline-none focus:ring-2 focus:ring-indigo-500"
          >
            <option value="all">Tất cả khối lớp</option>
            <option value="Khối 12">Khối 12</option>
            <option value="Khối 11">Khối 11</option>
            <option value="Khối 10">Khối 10</option>
            <option value="THCS">THCS</option>
            <option value="Tiểu học">Tiểu học</option>
          </select>
        </div>
      </div>

      {/* QUESTION SETS GRID */}
      {isLoading ? (
        <div className="py-20 text-center space-y-3">
          <div className="w-10 h-10 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-xs font-bold text-slate-500">Đang đồng bộ Ngân hàng bộ đề từ hệ thống...</p>
        </div>
      ) : filteredSets.length === 0 ? (
        <div className="bg-white border-2 border-dashed border-slate-300 rounded-3xl p-12 text-center space-y-4">
          <div className="w-16 h-16 bg-indigo-50 text-indigo-600 rounded-3xl flex items-center justify-center mx-auto border border-indigo-100 shadow-sm">
            <Layers className="w-8 h-8" />
          </div>
          <div>
            <h3 className="text-base font-extrabold text-slate-900">
              {sets.length === 0 ? 'Ngân hàng bộ đề chưa có câu hỏi nào' : 'Không tìm thấy bộ đề phù hợp'}
            </h3>
            <p className="text-xs text-slate-500 max-w-md mx-auto mt-1">
              {sets.length === 0 
                ? 'Thầy/cô hãy bấm nút "+ Thêm bộ đề mới" ở góc trên để soạn thảo hoặc dán mã đề Azota mẫu đầu tiên.' 
                : 'Thử kiểm tra lại từ khóa tìm kiếm hoặc bỏ lọc theo môn học.'}
            </p>
          </div>
          {sets.length === 0 && (
            <button
              type="button"
              onClick={handleOpenAddModal}
              className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold text-xs rounded-xl shadow-md transition-all inline-flex items-center gap-1.5"
            >
              <Plus className="w-4 h-4" /> Thêm bộ đề đầu tiên
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredSets.map((setItem) => {
            const qCount = setItem.questions && setItem.questions.length > 0 
              ? setItem.questions.length 
              : (setItem.rawCode ? parseRawCodeToQuestions(setItem.rawCode).parsedQuestions.length : 0);

            return (
              <div
                key={setItem.id}
                className="bg-white border border-slate-200 hover:border-indigo-300 rounded-3xl p-5 shadow-sm hover:shadow-md transition-all flex flex-col justify-between space-y-4 group relative overflow-hidden"
              >
                <div>
                  {/* Top badges */}
                  <div className="flex items-center justify-between gap-2 mb-2">
                    <span className="bg-indigo-50 text-indigo-700 border border-indigo-100 text-[10px] font-black px-2.5 py-1 rounded-full uppercase tracking-wider">
                      {setItem.subject || 'Toán'}
                    </span>
                    {setItem.grade && (
                      <span className="bg-slate-100 text-slate-700 text-[10px] font-bold px-2 py-0.5 rounded-full">
                        🎓 {setItem.grade}
                      </span>
                    )}
                  </div>

                  {/* Title */}
                  <h3 className="font-black text-slate-900 text-base group-hover:text-indigo-600 transition-colors leading-snug line-clamp-2">
                    {setItem.title}
                  </h3>

                  {setItem.description && (
                    <p className="text-xs text-slate-500 mt-1 line-clamp-2 leading-relaxed">
                      {setItem.description}
                    </p>
                  )}

                  <div className="mt-3 pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
                    <span className="font-extrabold text-emerald-600 bg-emerald-50 px-2.5 py-1 rounded-lg border border-emerald-100 flex items-center gap-1">
                      📝 {qCount} câu trắc nghiệm
                    </span>
                    <span className="text-[11px] text-slate-400 font-medium">
                      {setItem.teacherName || 'Giáo viên'}
                    </span>
                  </div>
                </div>

                {/* Actions Footer */}
                <div className="pt-2 border-t border-slate-100 space-y-2">
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => setPreviewingSet(setItem)}
                      className="py-2 bg-slate-50 hover:bg-slate-100 text-slate-700 font-bold text-xs rounded-xl border border-slate-200 transition-colors flex items-center justify-center gap-1.5"
                    >
                      <Eye className="w-3.5 h-3.5 text-slate-500" /> Xem đề
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        setGamePlaySet(setItem);
                      }}
                      className="py-2 bg-amber-50 hover:bg-amber-100 text-amber-800 font-bold text-xs rounded-xl border border-amber-200 transition-colors flex items-center justify-center gap-1.5"
                    >
                      <Gamepad2 className="w-3.5 h-3.5 text-amber-600" /> Chơi Game
                    </button>
                  </div>

                  <div className="flex items-center justify-between gap-1">
                    <button
                      type="button"
                      onClick={() => setAssigningSet(setItem)}
                      className="flex-1 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-bold text-[11px] rounded-xl border border-indigo-200 transition-colors flex items-center justify-center gap-1"
                    >
                      <FileText className="w-3 h-3" /> Giao bài tập
                    </button>

                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => handleOpenEditModal(setItem)}
                        title="Chỉnh sửa bộ đề"
                        className="p-1.5 text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                      >
                        <Pencil className="w-3.5 h-3.5" />
                      </button>

                      <button
                        type="button"
                        onClick={() => handleDuplicateSet(setItem)}
                        title="Nhân bản bộ đề"
                        className="p-1.5 text-slate-500 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors"
                      >
                        <Copy className="w-3.5 h-3.5" />
                      </button>

                      <button
                        type="button"
                        onClick={() => setDeleteTargetSet(setItem)}
                        title="Xóa bộ đề"
                        className="p-1.5 text-slate-500 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
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
      )}

      {/* ADD / EDIT MODAL */}
      {showAddEditModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[9999] flex items-center justify-center p-3 sm:p-6 animate-in fade-in">
          <div className="bg-white border border-slate-200 rounded-3xl w-full max-w-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
            
            {/* Header */}
            <div className="px-6 py-4 border-b border-slate-200 bg-slate-50 flex items-center justify-between shrink-0">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-indigo-100 flex items-center justify-center text-indigo-700 font-extrabold">
                  <Layers className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-extrabold text-slate-900 text-base">
                    {editingSet ? 'Chỉnh Sửa Bộ Đề Trong Ngân Hàng' : 'Tạo Bộ Đề Mới Vào Ngân Hàng'}
                  </h3>
                  <p className="text-xs text-slate-500">Soạn thảo tên, thông tin môn học và mã nguồn câu hỏi Azota</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowAddEditModal(false)}
                className="p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-200 rounded-xl transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 overflow-y-auto space-y-4 custom-scrollbar flex-1">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  1. Tên Bộ Đề / Đề Kiểm Tra <span className="text-rose-500">*</span>:
                </label>
                <input
                  type="text"
                  value={inputTitle}
                  onChange={e => setInputTitle(e.target.value)}
                  placeholder="VD: Đề thi thử giữa kỳ 1 - Toán 12, Bộ từ vựng Tiếng Anh Unit 3..."
                  className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-extrabold outline-none focus:ring-2 focus:ring-indigo-600 text-slate-800"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                    Môn Học / Chủ Đề:
                  </label>
                  <select
                    value={inputSubject}
                    onChange={e => setInputSubject(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold outline-none focus:ring-2 focus:ring-indigo-600 text-slate-800"
                  >
                    <option value="Toán">Toán</option>
                    <option value="Ngữ Văn">Ngữ Văn</option>
                    <option value="Tiếng Anh">Tiếng Anh</option>
                    <option value="Vật Lý">Vật Lý</option>
                    <option value="Hóa Học">Hóa Học</option>
                    <option value="Sinh Học">Sinh Học</option>
                    <option value="Lịch Sử">Lịch Sử</option>
                    <option value="Địa Lý">Địa Lý</option>
                    <option value="Tin Học">Tin Học</option>
                    <option value="GDCD">GDCD</option>
                    <option value="Khác">Khác</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                    Khối Lớp:
                  </label>
                  <select
                    value={inputGrade}
                    onChange={e => setInputGrade(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold outline-none focus:ring-2 focus:ring-indigo-600 text-slate-800"
                  >
                    <option value="Khối 12">Khối 12</option>
                    <option value="Khối 11">Khối 11</option>
                    <option value="Khối 10">Khối 10</option>
                    <option value="THCS">Khối THCS</option>
                    <option value="Tiểu học">Khối Tiểu học</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Ghi Chú / Mô Tả (Không bắt buộc):
                </label>
                <input
                  type="text"
                  value={inputDescription}
                  onChange={e => setInputDescription(e.target.value)}
                  placeholder="Mô tả ngắn về mức độ hoặc phạm vi kiến thức..."
                  className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs outline-none focus:ring-2 focus:ring-indigo-600 text-slate-800"
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
                    2. Nhập Nội Dung / Mã Đề Trắc Nghiệm (Azota):
                  </label>
                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => setInputRawCode(SAMPLE_TEMPLATES.mau1)}
                      className="px-2.5 py-1 text-[11px] font-bold bg-indigo-50 text-indigo-700 hover:bg-indigo-100 rounded-lg border border-indigo-200 transition-colors"
                    >
                      Mẫu 1
                    </button>
                    <button
                      type="button"
                      onClick={() => setInputRawCode(SAMPLE_TEMPLATES.mau2)}
                      className="px-2.5 py-1 text-[11px] font-bold bg-indigo-50 text-indigo-700 hover:bg-indigo-100 rounded-lg border border-indigo-200 transition-colors"
                    >
                      Mẫu 2
                    </button>
                  </div>
                </div>

                <textarea
                  rows={10}
                  value={inputRawCode}
                  onChange={e => setInputRawCode(e.target.value)}
                  placeholder="Dán nội dung mã đề trắc nghiệm vào đây (VD: Câu 1: ... A. ... B. ... C. ... D. ... Lời giải: ... Chọn C)..."
                  className="w-full p-3.5 bg-slate-900 text-slate-100 font-mono text-xs rounded-2xl border border-slate-700 outline-none focus:ring-2 focus:ring-indigo-500 leading-relaxed custom-scrollbar"
                />

                <div className="mt-2 bg-slate-50 border border-slate-200 p-3 rounded-2xl flex items-center justify-between">
                  <span className="text-xs font-extrabold text-emerald-700 flex items-center gap-1.5">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                    Phân tích tự động: <strong>{parsedModalQuestions.length}</strong> câu hỏi trắc nghiệm
                  </span>
                  <span className="text-[11px] text-slate-400 italic">
                    Hệ thống tự nhận diện đáp án A-B-C-D và lời giải
                  </span>
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="px-6 py-4 border-t border-slate-200 bg-slate-50 flex items-center justify-between shrink-0">
              <button
                type="button"
                onClick={() => setShowAddEditModal(false)}
                className="px-4 py-2 text-slate-600 hover:bg-slate-200 font-bold text-xs rounded-xl transition-colors"
              >
                Hủy bỏ
              </button>
              <button
                type="button"
                disabled={isSaving}
                onClick={handleSaveSet}
                className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-xs rounded-xl shadow-md transition-all flex items-center gap-1.5 active:scale-95 disabled:opacity-50"
              >
                {isSaving ? 'Đang lưu...' : '✓ Lưu Bộ Đề Vô Ngân Hàng'}
              </button>
            </div>

          </div>
        </div>
      )}

      {/* PREVIEW SET DETAILS MODAL */}
      {previewingSet && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[9999] flex items-center justify-center p-3 sm:p-6 animate-in fade-in">
          <div className="bg-white border border-slate-200 rounded-3xl w-full max-w-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
            {/* Header */}
            <div className="px-6 py-4 border-b border-slate-200 bg-slate-50 flex items-center justify-between shrink-0">
              <div>
                <span className="bg-indigo-50 text-indigo-700 text-[10px] font-black px-2.5 py-0.5 rounded-full uppercase">
                  {previewingSet.subject || 'Toán'}
                </span>
                <h3 className="font-extrabold text-slate-900 text-base mt-1">
                  {previewingSet.title}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setPreviewingSet(null)}
                className="p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-200 rounded-xl transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Questions List */}
            <div className="p-6 overflow-y-auto space-y-4 custom-scrollbar flex-1 bg-slate-50/50">
              {(() => {
                const qs = previewingSet.questions && previewingSet.questions.length > 0 
                  ? previewingSet.questions 
                  : (previewingSet.rawCode ? parseRawCodeToQuestions(previewingSet.rawCode).parsedQuestions : []);

                if (qs.length === 0) {
                  return (
                    <div className="text-center py-10 text-slate-400 text-xs font-bold">
                      Không có danh sách câu hỏi chi tiết.
                    </div>
                  );
                }

                return qs.map((q, idx) => (
                  <div key={q.id || idx} className="bg-white border border-slate-200 rounded-2xl p-4 shadow-xs space-y-3">
                    <p className="text-xs font-extrabold text-slate-900 leading-relaxed">
                      <span className="text-indigo-600">Câu {idx + 1}:</span> {q.question}
                    </p>

                    {q.options && q.options.length > 0 && (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
                        {q.options.map((opt, optIdx) => {
                          const isCorrect = q.correctAnswer === optIdx;
                          return (
                            <div
                              key={optIdx}
                              className={`p-2.5 rounded-xl border text-xs font-medium flex items-center gap-2 ${
                                isCorrect
                                  ? 'bg-emerald-50 border-emerald-300 text-emerald-900 font-bold'
                                  : 'bg-slate-50 border-slate-200 text-slate-700'
                              }`}
                            >
                              <span className={`w-5 h-5 rounded-full text-[10px] font-black flex items-center justify-center shrink-0 ${
                                isCorrect ? 'bg-emerald-600 text-white' : 'bg-slate-200 text-slate-600'
                              }`}>
                                {['A', 'B', 'C', 'D'][optIdx]}
                              </span>
                              <span className="flex-1">{opt}</span>
                              {isCorrect && <Check className="w-4 h-4 text-emerald-600 shrink-0" />}
                            </div>
                          );
                        })}
                      </div>
                    )}

                    {q.solutionText && (
                      <div className="bg-amber-50 border border-amber-200/80 rounded-xl p-3 text-[11px] text-amber-900">
                        <strong>💡 Lời giải / Hướng dẫn:</strong> {q.solutionText}
                      </div>
                    )}
                  </div>
                ));
              })()}
            </div>

            {/* Footer */}
            <div className="px-6 py-4 border-t border-slate-200 bg-slate-50 flex items-center justify-between shrink-0">
              <button
                type="button"
                onClick={() => setPreviewingSet(null)}
                className="px-4 py-2 text-slate-600 hover:bg-slate-200 font-bold text-xs rounded-xl transition-colors"
              >
                Đóng
              </button>
              <button
                type="button"
                onClick={() => {
                  const setItem = previewingSet;
                  setPreviewingSet(null);
                  setGamePlaySet(setItem);
                }}
                className="px-5 py-2.5 bg-amber-500 hover:bg-amber-600 text-white font-extrabold text-xs rounded-xl shadow-md transition-all flex items-center gap-1.5"
              >
                <Gamepad2 className="w-4 h-4" /> Chơi Game ngay với bộ đề này
              </button>
            </div>
          </div>
        </div>
      )}

      {/* GAME SELECTOR MODAL WHEN PLAYING GAME FROM BANK */}
      {gamePlaySet && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[9999] flex items-center justify-center p-3 sm:p-6 animate-in fade-in">
          <div className="bg-white border border-slate-200 rounded-3xl w-full max-w-xl shadow-2xl overflow-hidden flex flex-col">
            <div className="px-6 py-4 border-b border-slate-200 bg-gradient-to-r from-amber-500 to-orange-600 text-white flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-white/20 flex items-center justify-center text-white font-extrabold">
                  <Gamepad2 className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-extrabold text-white text-base">Chọn Game Trải Nghiệm</h3>
                  <p className="text-xs text-amber-100">Bộ đề: <strong className="text-white">{gamePlaySet.title}</strong></p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setGamePlaySet(null)}
                className="p-2 text-amber-100 hover:text-white hover:bg-white/10 rounded-xl transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-4">
              <label className="block text-xs font-extrabold text-slate-700 uppercase tracking-wider">
                Chọn hình thức Game tương tác:
              </label>

              <div className="grid grid-cols-2 gap-3">
                {[
                  { id: 'super_race', name: '🏎️ Đua Xe Siêu Tốc', desc: 'Sử dụng tay hoặc phím bấm trả lời câu hỏi tăng tốc' },
                  { id: 'tug_of_war', name: '🪢 Kéo Co Tri Thức', desc: 'Đấu máy hoặc đối kháng học tập kịch tính' },
                  { id: 'knowledge_train', name: '🚂 Đoàn Tàu Tri Thức', desc: 'Ghép nối toa xe tri thức đúng đáp án' },
                  { id: 'whack_a_mole', name: '🔨 Đập Chuột Ôn Tập', desc: 'Đập đúng chuột mang đáp án chính xác' },
                  { id: 'flying_words', name: '🎈 Từ Ngữ Biết Bay', desc: 'Trò chơi sắp xếp và tìm từ thông minh' },
                  { id: 'memory_flip', name: '🃏 Lật Thẻ Ghi Nhớ', desc: 'Ghép cặp khái niệm và thuật ngữ' },
                ].map(game => (
                  <button
                    key={game.id}
                    type="button"
                    onClick={() => setSelectedGameType(game.id)}
                    className={`p-3.5 rounded-2xl border text-left transition-all flex flex-col justify-between space-y-1.5 ${
                      selectedGameType === game.id
                        ? 'bg-amber-50 border-amber-400 ring-2 ring-amber-400/30'
                        : 'bg-slate-50 border-slate-200 hover:bg-slate-100'
                    }`}
                  >
                    <span className="font-black text-slate-900 text-xs">{game.name}</span>
                    <span className="text-[10px] text-slate-500 leading-tight">{game.desc}</span>
                  </button>
                ))}
              </div>
            </div>

            <div className="px-6 py-4 border-t border-slate-200 bg-slate-50 flex items-center justify-between">
              <button
                type="button"
                onClick={() => setGamePlaySet(null)}
                className="px-4 py-2 text-slate-600 hover:bg-slate-200 font-bold text-xs rounded-xl transition-colors"
              >
                Hủy
              </button>
              <button
                type="button"
                onClick={() => {
                  // Launch game preview directly
                }}
                className="px-6 py-2.5 bg-amber-500 hover:bg-amber-600 text-white font-extrabold text-xs rounded-xl shadow-md transition-all flex items-center gap-1.5 active:scale-95"
              >
                <Play className="w-4 h-4 fill-white" /> Bắt đầu chơi Game
              </button>
            </div>
          </div>
        </div>
      )}

      {/* GAME PREVIEW FULLSCREEN COMPONENT WHEN PLAYING */}
      {gamePlaySet && selectedGameType && (
        <GamePreview
          gameType={selectedGameType}
          questions={
            gamePlaySet.questions && gamePlaySet.questions.length > 0
              ? gamePlaySet.questions
              : parseRawCodeToQuestions(gamePlaySet.rawCode || '').parsedQuestions
          }
          onClose={() => {
            setGamePlaySet(null);
          }}
          isStudentMode={false}
        />
      )}

      {/* ASSIGN TO STUDENTS MODAL */}
      {assigningSet && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[9999] flex items-center justify-center p-3 sm:p-6 animate-in fade-in">
          <div className="bg-white border border-slate-200 rounded-3xl w-full max-w-md shadow-2xl overflow-hidden flex flex-col">
            <div className="px-6 py-4 border-b border-slate-200 bg-slate-50 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-indigo-100 flex items-center justify-center text-indigo-700 font-black">
                  <FileText className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-extrabold text-slate-900 text-sm">Giao Bài Tập Cho Học Sinh</h3>
                  <p className="text-xs text-slate-500">Bộ đề: <strong className="text-slate-800">{assigningSet.title}</strong></p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setAssigningSet(null)}
                className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-200 rounded-xl transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Chọn Lớp Nhận Bài Tập:
                </label>
                <select
                  value={assignClassName}
                  onChange={e => setAssignClassName(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 outline-none focus:ring-2 focus:ring-indigo-600"
                >
                  <option value="123456">Lớp 12A1 (Mã: 123456)</option>
                  <option value="12A2">Lớp 12A2</option>
                  <option value="11A1">Lớp 11A1</option>
                  <option value="10A1">Lớp 10A1</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Hạn Nộp Bài Bài Tập <span className="text-rose-500">*</span>:
                </label>
                <input
                  type="datetime-local"
                  value={assignDueDate}
                  onChange={e => setAssignDueDate(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 outline-none focus:ring-2 focus:ring-indigo-600"
                />
              </div>
            </div>

            <div className="px-6 py-4 border-t border-slate-200 bg-slate-50 flex items-center justify-between">
              <button
                type="button"
                onClick={() => setAssigningSet(null)}
                className="px-4 py-2 text-slate-600 hover:bg-slate-200 font-bold text-xs rounded-xl transition-colors"
              >
                Hủy
              </button>
              <button
                type="button"
                disabled={isAssigning}
                onClick={handleAssignToStudents}
                className="px-6 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold text-xs rounded-xl shadow-md transition-all flex items-center gap-1.5 disabled:opacity-50"
              >
                {isAssigning ? 'Đang giao...' : '✓ Xác Nhận Giao Bài'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* DELETE CONFIRMATION MODAL */}
      <ConfirmModal
        isOpen={!!deleteTargetSet}
        onClose={() => setDeleteTargetSet(null)}
        onConfirm={handleDeleteSet}
        title="Xóa Bộ Đề Ngân Hàng"
        message={`Bạn có chắc chắn muốn xóa bộ đề "${deleteTargetSet?.title}" khỏi Ngân hàng bộ đề không? Thao tác này không thể hoàn tác.`}
        confirmText="Đồng ý xóa"
        cancelText="Hủy bỏ"
        variant="danger"
      />

    </div>
  );
};
