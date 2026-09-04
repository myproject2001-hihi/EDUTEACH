import React, { useState, useMemo } from 'react';
import { Assignment, User } from '../types';
import { X, Search, Check, Filter, SlidersHorizontal, CheckSquare, Square, Radio, Calendar, Clock, BookOpen, Layers, Sparkles, CheckCircle2, AlertCircle } from 'lucide-react';
import { db } from '../firebase';
import { doc, updateDoc, setDoc } from 'firebase/firestore';
import { format } from 'date-fns';
import { vi } from 'date-fns/locale';

interface BatchEditAssignmentsModalProps {
  isOpen: boolean;
  onClose: () => void;
  assignments: Assignment[];
  availableClasses: string[];
  user: User;
}

const COMMON_SUBJECTS = [
  'Toán học',
  'Vật lý',
  'Hóa học',
  'Sinh học',
  'Tiếng Anh',
  'Ngữ văn',
  'Lịch sử',
  'Địa lý',
  'Tin học',
  'Khoa học tự nhiên',
  'Lịch sử & Địa lý',
  'Công nghệ',
  'Giáo dục công dân'
];

export function BatchEditAssignmentsModal({
  isOpen,
  onClose,
  assignments,
  availableClasses,
  user
}: BatchEditAssignmentsModalProps) {
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [searchFilter, setSearchFilter] = useState('');
  const [classFilter, setClassFilter] = useState<string>('all');
  const [onAirFilter, setOnAirFilter] = useState<string>('all');

  // Bulk action values
  const [bulkClass, setBulkClass] = useState('');
  const [bulkSubject, setBulkSubject] = useState('');
  const [bulkDueDate, setBulkDueDate] = useState('');
  const [bulkTimeLimit, setBulkTimeLimit] = useState<string>('');
  const [isUpdating, setIsUpdating] = useState(false);
  const [statusMessage, setStatusMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  // Local editable state map for instant responsiveness
  const [rowSavingId, setRowSavingId] = useState<string | null>(null);

  // Filtered list of assignments
  const filteredList = useMemo(() => {
    return assignments.filter(a => {
      // Teacher ownership check (unless admin)
      const isAdmin = user.role === 'admin' || (user as any).isSuperAdmin;
      if (!isAdmin && a.teacherId && a.teacherId !== user.id && a.teacherName !== user.name) {
        return false;
      }

      if (searchFilter.trim()) {
        const q = searchFilter.toLowerCase().trim();
        const matchesTitle = a.title.toLowerCase().includes(q);
        const matchesCategory = a.category?.toLowerCase().includes(q);
        const matchesClass = a.className?.toLowerCase().includes(q);
        if (!matchesTitle && !matchesCategory && !matchesClass) return false;
      }

      if (classFilter !== 'all') {
        if (classFilter === 'none' && a.className) return false;
        if (classFilter !== 'none' && a.className !== classFilter) return false;
      }

      if (onAirFilter !== 'all') {
        if (onAirFilter === 'on_air' && a.isPublished === false) return false;
        if (onAirFilter === 'draft' && a.isPublished !== false) return false;
      }

      return true;
    });
  }, [assignments, user, searchFilter, classFilter, onAirFilter]);

  if (!isOpen) return null;

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedIds(filteredList.map(a => a.id));
    } else {
      setSelectedIds([]);
    }
  };

  const handleToggleSelect = (id: string) => {
    setSelectedIds(prev => 
      prev.includes(id) ? prev.filter(item => item !== id) : [...prev, id]
    );
  };

  const showNotification = (text: string, type: 'success' | 'error' = 'success') => {
    setStatusMessage({ text, type });
    setTimeout(() => {
      setStatusMessage(null);
    }, 3500);
  };

  // Direct single assignment update
  const handleUpdateSingleField = async (assignmentId: string, updates: Partial<Assignment>) => {
    setRowSavingId(assignmentId);
    try {
      await setDoc(doc(db, 'assignments', assignmentId), updates, { merge: true });
      showNotification('Đã lưu thay đổi bài tập thành công!', 'success');
    } catch (err: any) {
      console.error('Error updating assignment:', err);
      showNotification('Lỗi khi cập nhật bài tập.', 'error');
    } finally {
      setRowSavingId(null);
    }
  };

  // Bulk Apply Updates
  const handleApplyBulkUpdates = async (updates: Partial<Assignment>, label: string) => {
    if (selectedIds.length === 0) {
      showNotification('Vui lòng chọn ít nhất 1 bài tập để áp dụng.', 'error');
      return;
    }

    setIsUpdating(true);
    try {
      const promises = selectedIds.map(id =>
        setDoc(doc(db, 'assignments', id), updates, { merge: true })
      );
      await Promise.all(promises);
      showNotification(`Đã cập nhật ${label} cho ${selectedIds.length} bài tập thành công!`, 'success');
    } catch (err: any) {
      console.error('Error batch updating assignments:', err);
      showNotification('Có lỗi xảy ra khi cập nhật đồng loạt.', 'error');
    } finally {
      setIsUpdating(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-2 sm:p-4 animate-in fade-in duration-200">
      <div className="bg-white rounded-3xl border border-slate-200 shadow-2xl w-full max-w-6xl max-h-[92vh] flex flex-col overflow-hidden">
        
        {/* REFINED LIGHT MODAL HEADER */}
        <div className="px-5 py-4 bg-white border-b border-slate-200 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600 shadow-xs">
              <SlidersHorizontal className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base sm:text-lg font-bold text-slate-900 tracking-tight">
                  Bảng Đổi & Cập Nhật Đồng Loạt Bài Tập
                </h2>
                <span className="bg-indigo-50 text-indigo-700 text-xs font-bold px-2.5 py-0.5 rounded-full border border-indigo-100">
                  {filteredList.length} bài tập
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                Cập nhật nhanh trạng thái On Air, lớp học, môn học và hạn nộp cho danh sách bài tập
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
            title="Đóng bảng"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* NOTIFICATION TOAST */}
        {statusMessage && (
          <div className={`px-4 py-2.5 text-xs font-bold flex items-center gap-2 transition-all ${
            statusMessage.type === 'success' ? 'bg-emerald-50 text-emerald-800 border-b border-emerald-200' : 'bg-rose-50 text-rose-800 border-b border-rose-200'
          }`}>
            {statusMessage.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            ) : (
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
            )}
            <span>{statusMessage.text}</span>
          </div>
        )}

        {/* BULK ACTION CONTROLS PANEL */}
        <div className="p-3.5 sm:p-4 bg-slate-50 border-b border-slate-200 space-y-3 shrink-0">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <label className="flex items-center gap-2 cursor-pointer font-bold text-xs text-slate-700 bg-white px-3 py-1.5 rounded-xl border border-slate-200 shadow-sm hover:bg-slate-50 select-none">
                <input
                  type="checkbox"
                  checked={filteredList.length > 0 && selectedIds.length === filteredList.length}
                  onChange={(e) => handleSelectAll(e.target.checked)}
                  className="rounded text-indigo-600 focus:ring-indigo-500 w-4 h-4 cursor-pointer"
                />
                <span>Chọn tất cả ({selectedIds.length}/{filteredList.length})</span>
              </label>

              {selectedIds.length > 0 && (
                <button
                  type="button"
                  onClick={() => setSelectedIds([])}
                  className="text-xs font-bold text-slate-500 hover:text-slate-700 underline"
                >
                  Bỏ chọn
                </button>
              )}
            </div>

            {/* QUICK ON AIR TOGGLE BUTTONS */}
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Đổi nhanh On Air:</span>
              <button
                type="button"
                disabled={selectedIds.length === 0 || isUpdating}
                onClick={() => handleApplyBulkUpdates({ isPublished: true }, '🟢 BẬT ON AIR')}
                className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-40 text-white font-extrabold text-xs rounded-xl shadow-sm transition-all flex items-center gap-1.5 active:scale-95"
              >
                <Radio className="w-3.5 h-3.5" />
                <span>Bật On Air ({selectedIds.length})</span>
              </button>
              <button
                type="button"
                disabled={selectedIds.length === 0 || isUpdating}
                onClick={() => handleApplyBulkUpdates({ isPublished: false }, '🟡 BẢN NHÁP (Tắt On Air)')}
                className="px-3 py-1.5 bg-amber-600 hover:bg-amber-700 disabled:opacity-40 text-white font-extrabold text-xs rounded-xl shadow-sm transition-all flex items-center gap-1.5 active:scale-95"
              >
                <Clock className="w-3.5 h-3.5" />
                <span>Tắt On Air ({selectedIds.length})</span>
              </button>
            </div>
          </div>

          {/* BULK FIELD ASSIGNMENT ROW */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5 pt-2 border-t border-slate-200">
            {/* 1. Bulk Class Change */}
            <div className="flex items-center gap-1.5 bg-white p-1.5 rounded-xl border border-slate-200 shadow-sm">
              <select
                value={bulkClass}
                onChange={(e) => setBulkClass(e.target.value)}
                className="flex-1 text-xs bg-transparent font-medium text-slate-700 outline-none px-1"
              >
                <option value="">Chọn lớp học...</option>
                <option value="__ALL__">Tất cả các lớp (Toàn trường)</option>
                {availableClasses.map(c => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
              <button
                type="button"
                disabled={selectedIds.length === 0 || !bulkClass || isUpdating}
                onClick={() => handleApplyBulkUpdates({ className: bulkClass === '__ALL__' ? '' : bulkClass }, `Lớp "${bulkClass === '__ALL__' ? 'Tất cả lớp' : bulkClass}"`)}
                className="px-2.5 py-1 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-40 text-white font-bold text-[11px] rounded-lg shadow-sm shrink-0 active:scale-95"
              >
                Áp dụng
              </button>
            </div>

            {/* 2. Bulk Subject/Category Change */}
            <div className="flex items-center gap-1.5 bg-white p-1.5 rounded-xl border border-slate-200 shadow-sm">
              <select
                value={bulkSubject}
                onChange={(e) => setBulkSubject(e.target.value)}
                className="flex-1 text-xs bg-transparent font-medium text-slate-700 outline-none px-1"
              >
                <option value="">Chọn môn học / chủ đề...</option>
                {COMMON_SUBJECTS.map(s => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
              <button
                type="button"
                disabled={selectedIds.length === 0 || !bulkSubject || isUpdating}
                onClick={() => handleApplyBulkUpdates({ category: bulkSubject }, `Môn học "${bulkSubject}"`)}
                className="px-2.5 py-1 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-40 text-white font-bold text-[11px] rounded-lg shadow-sm shrink-0 active:scale-95"
              >
                Áp dụng
              </button>
            </div>

            {/* 3. Bulk Due Date Change */}
            <div className="flex items-center gap-1.5 bg-white p-1.5 rounded-xl border border-slate-200 shadow-sm">
              <input
                type="datetime-local"
                value={bulkDueDate}
                onChange={(e) => setBulkDueDate(e.target.value)}
                className="flex-1 text-[11px] bg-transparent font-medium text-slate-700 outline-none px-1"
              />
              <button
                type="button"
                disabled={selectedIds.length === 0 || !bulkDueDate || isUpdating}
                onClick={() => handleApplyBulkUpdates({ dueDate: new Date(bulkDueDate).toISOString() }, 'Hạn nộp mới')}
                className="px-2.5 py-1 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-40 text-white font-bold text-[11px] rounded-lg shadow-sm shrink-0 active:scale-95"
              >
                Áp dụng
              </button>
            </div>

            {/* 4. Bulk Time Limit Change */}
            <div className="flex items-center gap-1.5 bg-white p-1.5 rounded-xl border border-slate-200 shadow-sm">
              <select
                value={bulkTimeLimit}
                onChange={(e) => setBulkTimeLimit(e.target.value)}
                className="flex-1 text-xs bg-transparent font-medium text-slate-700 outline-none px-1"
              >
                <option value="">Thời gian làm...</option>
                <option value="0">Không giới hạn</option>
                <option value="15">15 phút</option>
                <option value="30">30 phút</option>
                <option value="45">45 phút</option>
                <option value="60">60 phút</option>
                <option value="90">90 phút</option>
              </select>
              <button
                type="button"
                disabled={selectedIds.length === 0 || bulkTimeLimit === '' || isUpdating}
                onClick={() => handleApplyBulkUpdates({ timeLimit: Number(bulkTimeLimit) || 0 }, `Thời gian ${bulkTimeLimit === '0' ? 'Không giới hạn' : `${bulkTimeLimit} phút`}`)}
                className="px-2.5 py-1 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-40 text-white font-bold text-[11px] rounded-lg shadow-sm shrink-0 active:scale-95"
              >
                Áp dụng
              </button>
            </div>
          </div>
        </div>

        {/* SEARCH & FILTER BAR FOR MODAL */}
        <div className="p-3 bg-slate-50 border-b border-slate-200 flex flex-wrap items-center justify-between gap-2 shrink-0">
          <div className="relative flex-1 min-w-[220px]">
            <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Tìm theo tên bài tập, môn học, lớp..."
              value={searchFilter}
              onChange={(e) => setSearchFilter(e.target.value)}
              className="w-full pl-8 pr-3 py-1.5 text-xs bg-white border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500 font-medium text-slate-700 placeholder:text-slate-400"
            />
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <select
              value={onAirFilter}
              onChange={(e) => setOnAirFilter(e.target.value)}
              className="px-3 py-1.5 text-xs bg-white border border-slate-200 rounded-xl font-bold text-slate-700 outline-none focus:ring-1 focus:ring-indigo-500"
            >
              <option value="all">📻 Trạng thái On Air (Tất cả)</option>
              <option value="on_air">🟢 Đang On Air</option>
              <option value="draft">🟡 Bản Nháp</option>
            </select>

            <select
              value={classFilter}
              onChange={(e) => setClassFilter(e.target.value)}
              className="px-3 py-1.5 text-xs bg-white border border-slate-200 rounded-xl font-bold text-slate-700 outline-none focus:ring-1 focus:ring-indigo-500"
            >
              <option value="all">🏫 Lớp học (Tất cả)</option>
              <option value="none">Chưa gán lớp</option>
              {availableClasses.map(c => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </div>
        </div>

        {/* TABLE CONTENT CONTAINER */}
        <div className="flex-1 overflow-y-auto overflow-x-auto p-2 sm:p-4">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-slate-200 text-xs font-bold text-slate-700 bg-slate-50 sticky top-0 z-10">
                <th className="p-3 w-10 text-center">
                  <input
                    type="checkbox"
                    checked={filteredList.length > 0 && selectedIds.length === filteredList.length}
                    onChange={(e) => handleSelectAll(e.target.checked)}
                    className="rounded text-indigo-600 focus:ring-indigo-500 w-4 h-4 cursor-pointer"
                  />
                </th>
                <th className="p-3 min-w-[220px]">Tên bài tập & Thể loại</th>
                <th className="p-3 min-w-[130px]">Trạng thái On Air</th>
                <th className="p-3 min-w-[130px]">Phân lớp học</th>
                <th className="p-3 min-w-[130px]">Môn học / Chủ đề</th>
                <th className="p-3 min-w-[170px]">Hạn chót nộp</th>
                <th className="p-3 min-w-[110px]">Thời gian làm</th>
                <th className="p-3 min-w-[90px] text-center">Bắt buộc</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredList.map((assignment) => {
                const isSelected = selectedIds.includes(assignment.id);
                const isOnAir = assignment.isPublished !== false;
                const isSaving = rowSavingId === assignment.id;

                let typeBadge = { label: 'Trắc nghiệm', bg: 'bg-indigo-50 text-indigo-700 border-indigo-200' };
                if (assignment.type === 'flashcard') typeBadge = { label: 'Flashcard', bg: 'bg-rose-50 text-rose-700 border-rose-200' };
                else if (assignment.type === 'game') typeBadge = { label: 'Game', bg: 'bg-purple-50 text-purple-700 border-purple-200' };
                else if (assignment.type === 'simulation') typeBadge = { label: 'Mô phỏng', bg: 'bg-amber-50 text-amber-700 border-amber-200' };
                else if (assignment.type === 'file_upload') typeBadge = { label: 'Nộp tệp', bg: 'bg-blue-50 text-blue-700 border-blue-200' };

                let formattedDate = '';
                try {
                  if (assignment.dueDate) {
                    const d = new Date(assignment.dueDate);
                    if (!isNaN(d.getTime())) {
                      formattedDate = d.toISOString().slice(0, 16);
                    }
                  }
                } catch (e) {}

                return (
                  <tr
                    key={assignment.id}
                    className={`hover:bg-indigo-50/30 transition-colors ${
                      isSelected ? 'bg-indigo-50/60' : 'bg-white'
                    }`}
                  >
                    {/* Checkbox */}
                    <td className="p-3 text-center">
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => handleToggleSelect(assignment.id)}
                        className="rounded text-indigo-600 focus:ring-indigo-500 w-4 h-4 cursor-pointer"
                      />
                    </td>

                    {/* Title & Type */}
                    <td className="p-3">
                      <div className="font-bold text-slate-900 line-clamp-1 flex items-center gap-1.5" title={assignment.title}>
                        <span>{assignment.title}</span>
                        {isSaving && (
                          <span className="w-2 h-2 rounded-full bg-indigo-600 animate-ping"></span>
                        )}
                      </div>
                      <div className="flex items-center gap-1.5 mt-0.5">
                        <span className={`text-[10px] font-bold px-1.5 py-0.2 rounded border ${typeBadge.bg}`}>
                          {typeBadge.label}
                        </span>
                        {assignment.createdAt && (
                          <span className="text-[10px] text-slate-400">
                            {format(new Date(assignment.createdAt), 'dd/MM/yyyy')}
                          </span>
                        )}
                      </div>
                    </td>

                    {/* On Air Toggle */}
                    <td className="p-3">
                      <button
                        type="button"
                        onClick={() => handleUpdateSingleField(assignment.id, { isPublished: !isOnAir })}
                        className={`px-2.5 py-1 rounded-xl text-xs font-extrabold border transition-all flex items-center gap-1.5 active:scale-95 ${
                          isOnAir
                            ? 'bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border-emerald-200'
                            : 'bg-amber-50 hover:bg-amber-100 text-amber-800 border-amber-200'
                        }`}
                        title={isOnAir ? "Đang On Air (Nhấn để chuyển sang Nháp)" : "Đang Bản Nháp (Nhấn để bật On Air)"}
                      >
                        <Radio className={`w-3.5 h-3.5 ${isOnAir ? 'text-emerald-600' : 'text-amber-500'}`} />
                        <span>{isOnAir ? '🟢 On Air' : '🟡 Bản Nháp'}</span>
                      </button>
                    </td>

                    {/* Class Name */}
                    <td className="p-3">
                      <select
                        value={assignment.className || ''}
                        onChange={(e) => handleUpdateSingleField(assignment.id, { className: e.target.value })}
                        className="w-full text-xs bg-slate-50 hover:bg-white focus:bg-white border border-slate-200 rounded-lg px-2 py-1 font-bold text-slate-700 outline-none focus:ring-1 focus:ring-indigo-500"
                      >
                        <option value="">Tất cả các lớp</option>
                        {availableClasses.map(c => (
                          <option key={c} value={c}>{c}</option>
                        ))}
                      </select>
                    </td>

                    {/* Subject / Category */}
                    <td className="p-3">
                      <select
                        value={assignment.category || ''}
                        onChange={(e) => handleUpdateSingleField(assignment.id, { category: e.target.value })}
                        className="w-full text-xs bg-slate-50 hover:bg-white focus:bg-white border border-slate-200 rounded-lg px-2 py-1 font-bold text-slate-700 outline-none focus:ring-1 focus:ring-indigo-500"
                      >
                        <option value="">Chưa chọn môn</option>
                        {COMMON_SUBJECTS.map(s => (
                          <option key={s} value={s}>{s}</option>
                        ))}
                      </select>
                    </td>

                    {/* Due Date */}
                    <td className="p-3">
                      <input
                        type="datetime-local"
                        value={formattedDate}
                        onChange={(e) => {
                          if (e.target.value) {
                            handleUpdateSingleField(assignment.id, { dueDate: new Date(e.target.value).toISOString() });
                          }
                        }}
                        className="w-full text-[11px] bg-slate-50 hover:bg-white focus:bg-white border border-slate-200 rounded-lg px-2 py-1 font-medium text-slate-700 outline-none focus:ring-1 focus:ring-indigo-500"
                      />
                    </td>

                    {/* Time Limit */}
                    <td className="p-3">
                      <select
                        value={assignment.timeLimit || 0}
                        onChange={(e) => handleUpdateSingleField(assignment.id, { timeLimit: Number(e.target.value) })}
                        className="w-full text-xs bg-slate-50 hover:bg-white focus:bg-white border border-slate-200 rounded-lg px-2 py-1 font-bold text-slate-700 outline-none focus:ring-1 focus:ring-indigo-500"
                      >
                        <option value={0}>Không giới hạn</option>
                        <option value={15}>15 phút</option>
                        <option value={30}>30 phút</option>
                        <option value={45}>45 phút</option>
                        <option value={60}>60 phút</option>
                        <option value={90}>90 phút</option>
                      </select>
                    </td>

                    {/* Mandatory Toggle */}
                    <td className="p-3 text-center">
                      <button
                        type="button"
                        onClick={() => handleUpdateSingleField(assignment.id, { isMandatory: !assignment.isMandatory })}
                        className={`p-1.5 rounded-lg border transition-all ${
                          assignment.isMandatory
                            ? 'bg-rose-50 text-rose-700 border-rose-200'
                            : 'bg-slate-50 text-slate-400 border-slate-200'
                        }`}
                        title={assignment.isMandatory ? "Bắt buộc hoàn thành" : "Tùy chọn"}
                      >
                        {assignment.isMandatory ? (
                          <Check className="w-3.5 h-3.5 text-rose-600 stroke-[3]" />
                        ) : (
                          <span className="text-[10px] font-bold text-slate-400">Không</span>
                        )}
                      </button>
                    </td>
                  </tr>
                );
              })}

              {filteredList.length === 0 && (
                <tr>
                  <td colSpan={8} className="p-8 text-center text-slate-400 text-xs italic">
                    Không tìm thấy bài tập nào phù hợp với bộ lọc.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* MODAL FOOTER */}
        <div className="p-3.5 sm:p-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between shrink-0">
          <div className="text-xs text-slate-500 font-medium">
            💡 <strong className="text-slate-700">Mẹo:</strong> Mọi thay đổi trong bảng được lưu tự động ngay lập tức, hoặc bạn có thể tick chọn nhiều bài tập và dùng thanh công cụ phía trên để đổi đồng loạt!
          </div>
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold text-xs rounded-xl shadow-md shadow-indigo-200 transition-all active:scale-95"
          >
            Hoàn tất & Đóng
          </button>
        </div>

      </div>
    </div>
  );
}
