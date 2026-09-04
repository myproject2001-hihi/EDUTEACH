import React, { useState, useEffect } from 'react';
import { Search, X, Check, BookOpen, Layers, Sparkles, Filter, Plus, FileText, ArrowRight } from 'lucide-react';
import { QuestionSetItem } from '../types';
import { db } from '../firebase';
import { collection, onSnapshot } from 'firebase/firestore';

interface QuestionSetPickerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectSet: (set: QuestionSetItem) => void;
  title?: string;
  subtitle?: string;
}

export const QuestionSetPickerModal: React.FC<QuestionSetPickerModalProps> = ({
  isOpen,
  onClose,
  onSelectSet,
  title = "Ngân Hàng Bộ Đề - Chọn Bộ Câu Hỏi",
  subtitle = "Lựa chọn 1 bộ đề trắc nghiệm có sẵn trong kho lưu trữ để sử dụng ngay"
}) => {
  const [sets, setSets] = useState<QuestionSetItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedSubject, setSelectedSubject] = useState('all');
  const [selectedGrade, setSelectedGrade] = useState('all');

  useEffect(() => {
    if (!isOpen) return;
    setIsLoading(true);
    const unsubscribe = onSnapshot(
      collection(db, 'question_sets'),
      (snapshot) => {
        const loadedSets: QuestionSetItem[] = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        } as QuestionSetItem));
        
        // Sort by creation date descending
        loadedSets.sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime());
        setSets(loadedSets);
        setIsLoading(false);
      },
      (error) => {
        console.error("Error loading question sets:", error);
        setIsLoading(false);
      }
    );

    return () => unsubscribe();
  }, [isOpen]);

  if (!isOpen) return null;

  // Extract unique subjects & grades
  const subjects = Array.from(new Set(sets.map(s => s.subject).filter(Boolean)));
  const grades = Array.from(new Set(sets.map(s => s.grade).filter(Boolean)));

  const filteredSets = sets.filter(s => {
    const matchSearch = !searchQuery.trim() || 
      s.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (s.description && s.description.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (s.subject && s.subject.toLowerCase().includes(searchQuery.toLowerCase()));
    
    const matchSubject = selectedSubject === 'all' || s.subject === selectedSubject;
    const matchGrade = selectedGrade === 'all' || s.grade === selectedGrade;

    return matchSearch && matchSubject && matchGrade;
  });

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[9999] flex items-center justify-center p-3 sm:p-6 animate-in fade-in">
      <div className="bg-white border border-slate-200 rounded-3xl w-full max-w-4xl shadow-2xl overflow-hidden flex flex-col max-h-[88vh]">
        
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-200 bg-gradient-to-r from-indigo-900 via-indigo-800 to-slate-900 text-white flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-white/10 backdrop-blur-md flex items-center justify-center border border-white/20 text-indigo-300 shrink-0">
              <Layers className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-extrabold text-white text-base leading-tight">
                {title}
              </h3>
              <p className="text-xs text-indigo-200/90 mt-0.5">
                {subtitle}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 text-indigo-200 hover:text-white hover:bg-white/10 rounded-xl transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Filter Bar */}
        <div className="p-4 bg-slate-50 border-b border-slate-200 flex flex-col sm:flex-row gap-2.5 shrink-0">
          <div className="relative flex-1">
            <input
              type="text"
              placeholder="Tìm theo tên bộ đề, nội dung, từ khóa..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-8 py-2 bg-white border border-slate-200 text-xs font-bold rounded-xl outline-none focus:ring-2 focus:ring-indigo-500 text-slate-800"
            />
            <Search className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />
            {searchQuery && (
              <button onClick={() => setSearchQuery('')} className="absolute right-2.5 top-2.5 text-slate-400 hover:text-slate-600">
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          <div className="flex items-center gap-2">
            <select
              value={selectedSubject}
              onChange={e => setSelectedSubject(e.target.value)}
              className="px-3 py-2 bg-white border border-slate-200 text-xs font-bold rounded-xl text-slate-700 outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <option value="all">Tất cả môn học ({sets.length})</option>
              {subjects.map(subj => (
                <option key={subj} value={subj}>{subj}</option>
              ))}
            </select>

            {grades.length > 0 && (
              <select
                value={selectedGrade}
                onChange={e => setSelectedGrade(e.target.value)}
                className="px-3 py-2 bg-white border border-slate-200 text-xs font-bold rounded-xl text-slate-700 outline-none focus:ring-2 focus:ring-indigo-500"
              >
                <option value="all">Tất cả khối lớp</option>
                {grades.map(grd => (
                  <option key={grd} value={grd}>{grd}</option>
                ))}
              </select>
            )}
          </div>
        </div>

        {/* List Content */}
        <div className="p-4 sm:p-6 overflow-y-auto space-y-3 custom-scrollbar flex-1 bg-slate-100/60">
          {isLoading ? (
            <div className="py-16 text-center space-y-3">
              <div className="w-8 h-8 border-3 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto" />
              <p className="text-xs font-bold text-slate-500">Đang tải Ngân hàng bộ đề...</p>
            </div>
          ) : filteredSets.length === 0 ? (
            <div className="py-16 text-center bg-white rounded-2xl border border-dashed border-slate-300 p-6 space-y-3">
              <div className="w-12 h-12 bg-indigo-50 text-indigo-600 rounded-2xl flex items-center justify-center mx-auto border border-indigo-100">
                <FileText className="w-6 h-6" />
              </div>
              <p className="text-sm font-extrabold text-slate-800">Chưa tìm thấy bộ đề nào phù hợp</p>
              <p className="text-xs text-slate-500 max-w-sm mx-auto">
                {sets.length === 0 
                  ? 'Hiện tại chưa có bộ đề nào trong Ngân hàng bộ đề. Thầy/cô có thể tạo mới trong tab "Ngân hàng bộ đề".' 
                  : 'Hãy thử tìm kiếm với từ khóa khác hoặc thay đổi bộ lọc môn học.'}
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {filteredSets.map((setItem) => {
                const qCount = setItem.questions ? setItem.questions.length : 0;
                return (
                  <div
                    key={setItem.id}
                    className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm hover:border-indigo-300 hover:shadow-md transition-all flex flex-col justify-between gap-3 group"
                  >
                    <div>
                      <div className="flex items-start justify-between gap-2 mb-1.5">
                        <span className="text-sm font-black text-slate-900 group-hover:text-indigo-600 transition-colors leading-snug">
                          {setItem.title}
                        </span>
                        {setItem.subject && (
                          <span className="bg-indigo-50 text-indigo-700 text-[10px] font-black px-2.5 py-0.5 rounded-full border border-indigo-100 shrink-0">
                            {setItem.subject}
                          </span>
                        )}
                      </div>

                      {setItem.description && (
                        <p className="text-xs text-slate-500 line-clamp-2 mb-2">
                          {setItem.description}
                        </p>
                      )}

                      <div className="flex items-center gap-3 text-xs text-slate-500 pt-1 border-t border-slate-100">
                        <span className="font-bold text-emerald-600 flex items-center gap-1">
                          📝 {qCount} câu trắc nghiệm
                        </span>
                        {setItem.grade && (
                          <span className="font-bold text-slate-600">
                            🎓 {setItem.grade}
                          </span>
                        )}
                        {setItem.teacherName && (
                          <span className="text-slate-400">
                            👤 {setItem.teacherName}
                          </span>
                        )}
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => {
                        onSelectSet(setItem);
                        onClose();
                      }}
                      className="w-full py-2 bg-indigo-600 hover:bg-indigo-700 active:scale-98 text-white font-extrabold text-xs rounded-xl shadow-sm transition-all flex items-center justify-center gap-1.5"
                    >
                      <Check className="w-4 h-4" />
                      <span>Chọn bộ đề này</span>
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-3 border-t border-slate-200 bg-slate-50 flex items-center justify-between shrink-0">
          <span className="text-xs text-slate-500 font-medium">
            Tổng số: <strong className="text-slate-800">{filteredSets.length}</strong> bộ đề tìm thấy
          </span>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-slate-600 hover:bg-slate-200 font-bold text-xs rounded-xl transition-colors"
          >
            Đóng cửa sổ
          </button>
        </div>

      </div>
    </div>
  );
};
