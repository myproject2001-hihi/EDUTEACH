import React, { useState } from 'react';
import { Layers, X, Check, FileText } from 'lucide-react';
import { QuestionSetItem, QuizQuestion, User } from '../types';
import { db } from '../firebase';
import { doc, setDoc } from 'firebase/firestore';

interface SaveToQuestionBankModalProps {
  isOpen: boolean;
  onClose: () => void;
  rawCode?: string;
  questions?: QuizQuestion[];
  user: User;
  defaultTitle?: string;
  onSavedSuccess?: (newSet: QuestionSetItem) => void;
}

export const SaveToQuestionBankModal: React.FC<SaveToQuestionBankModalProps> = ({
  isOpen,
  onClose,
  rawCode,
  questions = [],
  user,
  defaultTitle = '',
  onSavedSuccess
}) => {
  const [title, setTitle] = useState(defaultTitle || 'Bộ đề kiểm tra mới');
  const [subject, setSubject] = useState('Toán');
  const [grade, setGrade] = useState('Lớp 12');
  const [description, setDescription] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  if (!isOpen) return null;

  const handleSave = async () => {
    if (!title.trim()) {
      alert('Vui lòng nhập tên bộ đề!');
      return;
    }

    setIsSaving(true);
    try {
      const setId = `qset_${Date.now()}`;
      const newSet: QuestionSetItem = {
        id: setId,
        title: title.trim(),
        subject: subject.trim(),
        grade: grade.trim(),
        description: description.trim(),
        rawCode: rawCode || '',
        questions: questions || [],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        teacherId: user.id,
        teacherName: user.name,
        usageCount: 0
      };

      await setDoc(doc(db, 'question_sets', setId), newSet);
      setIsSaving(false);
      if (onSavedSuccess) {
        onSavedSuccess(newSet);
      }
      onClose();
    } catch (error) {
      console.error("Lỗi khi lưu vào Ngân hàng bộ đề:", error);
      alert('Không thể lưu bộ đề vào Ngân hàng. Vui lòng thử lại!');
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[9999] flex items-center justify-center p-3 sm:p-6 animate-in fade-in">
      <div className="bg-white border border-slate-200 rounded-3xl w-full max-w-lg shadow-2xl overflow-hidden flex flex-col">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-200 bg-slate-50 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-indigo-100 flex items-center justify-center text-indigo-700 font-extrabold">
              <Layers className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-extrabold text-slate-900 text-base">Lưu Vào Ngân Hàng Bộ Đề</h3>
              <p className="text-xs text-slate-500">Lưu trữ bộ câu hỏi để tái sử dụng cho các bài tập & game khác</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-200 rounded-xl transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <div className="p-6 space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
              Tên Bộ Đề / Tập Câu Hỏi <span className="text-rose-500">*</span>:
            </label>
            <input
              type="text"
              value={title}
              onChange={e => setTitle(e.target.value)}
              placeholder="VD: Đề thi thử giữa kỳ 1 - Toán 12, Bộ từ vựng Tiếng Anh Unit 3..."
              className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold outline-none focus:ring-2 focus:ring-indigo-600 text-slate-800"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                Môn Học / Chủ Đề:
              </label>
              <select
                value={subject}
                onChange={e => setSubject(e.target.value)}
                className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold outline-none focus:ring-2 focus:ring-indigo-600 text-slate-800"
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
                <option value="GDCD">GDCD / GDKT-PL</option>
                <option value="Khác">Khác</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                Khối Lớp:
              </label>
              <select
                value={grade}
                onChange={e => setGrade(e.target.value)}
                className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold outline-none focus:ring-2 focus:ring-indigo-600 text-slate-800"
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
              Ghi Chú / Mô Tả Ngắn (Không bắt buộc):
            </label>
            <textarea
              rows={2}
              value={description}
              onChange={e => setDescription(e.target.value)}
              placeholder="VD: Đề gồm 20 câu trắc nghiệm phân hóa rèn luyện cho kỳ thi sắp tới..."
              className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs outline-none focus:ring-2 focus:ring-indigo-600 text-slate-800"
            />
          </div>

          <div className="bg-indigo-50/70 border border-indigo-100 rounded-2xl p-3 flex items-center gap-3">
            <FileText className="w-5 h-5 text-indigo-600 shrink-0" />
            <div className="text-xs">
              <span className="font-extrabold text-indigo-950">Dữ liệu chuẩn bị lưu:</span>
              <p className="text-indigo-700">
                {questions.length > 0 ? `${questions.length} câu hỏi trắc nghiệm` : 'Nội dung mã đề chuẩn Azota'}
              </p>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-slate-200 bg-slate-50 flex items-center justify-between">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-slate-600 hover:bg-slate-200 font-bold text-xs rounded-xl transition-colors"
          >
            Hủy
          </button>
          <button
            type="button"
            disabled={isSaving}
            onClick={handleSave}
            className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-xs rounded-xl shadow-md transition-all flex items-center gap-1.5 active:scale-95 disabled:opacity-50"
          >
            {isSaving ? 'Đang lưu...' : '✓ Lưu Vào Ngân Hàng'}
          </button>
        </div>
      </div>
    </div>
  );
};
