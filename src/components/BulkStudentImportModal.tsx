import React, { useState, useRef } from 'react';
import { 
  Upload, FileSpreadsheet, Download, Check, AlertCircle, X, 
  Users, Trash2, ArrowRight, Sparkles, CheckCircle2, ShieldAlert
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { parseStudentFile, generateStudentTemplateExcel, ParsedStudentRow } from '../utils/studentExcelHelper';
import { db } from '../firebase';
import { doc, writeBatch, setDoc, getDocs, collection, query, where } from 'firebase/firestore';
import { CustomSelect } from './CustomSelect';

interface BulkStudentImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentClassName?: string;
  defaultClassName?: string;
  availableClasses?: string[];
  currentUser?: any;
  onSuccess?: (importedCount: number) => void;
  onImportSuccess?: () => void;
}

export function BulkStudentImportModal({
  isOpen,
  onClose,
  currentClassName,
  defaultClassName,
  availableClasses = [],
  currentUser,
  onSuccess,
  onImportSuccess
}: BulkStudentImportModalProps) {
  const effectiveClassName = currentClassName || defaultClassName || '123456';
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isParsing, setIsParsing] = useState(false);
  const [parsedStudents, setParsedStudents] = useState<ParsedStudentRow[]>([]);
  const [targetClass, setTargetClass] = useState<string>(effectiveClassName);
  const [useFileClass, setUseFileClass] = useState(true);
  const [rawText, setRawText] = useState('');
  const [inputMode, setInputMode] = useState<'file' | 'paste'>('file');
  const [isSaving, setIsSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    processFile(file);
  };

  const processFile = async (file: File) => {
    setSelectedFile(file);
    setIsParsing(true);
    setErrorMessage(null);

    try {
      const rows = await parseStudentFile(file, targetClass);
      if (rows.length === 0) {
        setErrorMessage('Không tìm thấy học sinh nào trong file. Vui lòng kiểm tra lại cấu trúc cột.');
        setParsedStudents([]);
      } else {
        setParsedStudents(rows);
      }
    } catch (err: any) {
      console.error(err);
      setErrorMessage(`Lỗi khi đọc file: ${err.message || 'File không hợp lệ hoặc sai định dạng'}`);
      setParsedStudents([]);
    } finally {
      setIsParsing(false);
    }
  };

  const handleParseRawText = () => {
    if (!rawText.trim()) {
      setErrorMessage('Vui lòng dán danh sách học sinh từ Excel hoặc Word');
      return;
    }
    setErrorMessage(null);

    const lines = rawText.trim().split('\n');
    const result: ParsedStudentRow[] = [];

    lines.forEach((line, idx) => {
      const parts = line.split('\t').map(p => p.trim()).filter(Boolean);
      if (parts.length === 0) return;

      // If comma separated
      const finalParts = parts.length > 1 ? parts : line.split(',').map(p => p.trim()).filter(Boolean);

      let name = '';
      let code = '';
      let cls = targetClass;
      let phone = '';

      if (finalParts.length === 1) {
        name = finalParts[0];
      } else if (finalParts.length === 2) {
        name = finalParts[0];
        code = finalParts[1];
      } else if (finalParts.length >= 3) {
        name = finalParts[0];
        code = finalParts[1];
        cls = finalParts[2] || targetClass;
        phone = finalParts[3] || '';
      }

      if (name && !name.toLowerCase().startsWith('stt') && !name.toLowerCase().startsWith('họ và tên')) {
        result.push({
          name,
          studentCode: code || `HS-${(cls || 'LOP').replace(/\s+/g, '')}-${(result.length + 1).toString().padStart(2, '0')}`,
          className: cls || targetClass,
          phone,
          isOffline: true
        });
      }
    });

    if (result.length === 0) {
      setErrorMessage('Không nhận diện được tên học sinh từ văn bản đã dán.');
    } else {
      setParsedStudents(result);
    }
  };

  const handleRemoveStudent = (index: number) => {
    setParsedStudents(prev => prev.filter((_, i) => i !== index));
  };

  const handleSaveToSystem = async () => {
    if (parsedStudents.length === 0) return;
    setIsSaving(true);
    setErrorMessage(null);

    try {
      const batch = writeBatch(db);
      const timestamp = new Date().toISOString();

      parsedStudents.forEach((student, idx) => {
        const studentId = `student_offline_${Date.now()}_${idx}_${Math.random().toString(36).substring(2, 6)}`;
        const assignedClass = useFileClass && student.className ? student.className : targetClass;
        const studentCode = student.studentCode || `HS-${assignedClass.replace(/\s+/g, '')}-${(idx + 1).toString().padStart(2, '0')}`;

        const userDocRef = doc(db, 'users', studentId);
        batch.set(userDocRef, {
          id: studentId,
          name: student.name,
          role: 'student',
          className: assignedClass,
          connectionCode: studentCode,
          studentCode: studentCode,
          phone: student.phone || '',
          parentPhone: student.parentPhone || '',
          birthDate: student.birthDate || '',
          gender: student.gender || '',
          notes: student.notes || '',
          isOffline: true, // Marked as offline / unregistered student
          accountStatus: 'unregistered',
          points: 0,
          meritPoints: 0,
          attendanceRate: 100,
          createdAt: timestamp,
          createdByTeacherId: currentUser?.id || '',
          avatar: `https://api.dicebear.com/7.x/bottts/svg?seed=${encodeURIComponent(student.name)}`
        });
      });

      await batch.commit();
      if (onSuccess) onSuccess(parsedStudents.length);
      if (onImportSuccess) onImportSuccess();
      onClose();
    } catch (err: any) {
      console.error('Lỗi khi lưu danh sách học sinh:', err);
      setErrorMessage(`Lỗi khi lưu vào cơ sở dữ liệu: ${err.message || 'Thao tác không thành công'}`);
    } finally {
      setIsSaving(false);
    }
  };

  const classOptions = [
    { value: currentClassName || '123456', label: `Lớp hiện tại (${currentClassName || '123456'})` },
    ...availableClasses.filter(c => c && c !== currentClassName).map(c => ({ value: c, label: `Lớp ${c}` }))
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
      <motion.div 
        initial={{ opacity: 0, scale: 0.95, y: 10 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 10 }}
        className="bg-white w-full max-w-3xl rounded-3xl shadow-2xl border border-slate-100 overflow-hidden flex flex-col max-h-[90vh]"
      >
        {/* Header */}
        <div className="px-6 py-5 bg-gradient-to-r from-indigo-700 via-indigo-600 to-violet-700 text-white flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 bg-white/15 rounded-2xl flex items-center justify-center backdrop-blur-md shadow-inner">
              <FileSpreadsheet className="w-6 h-6 text-white" />
            </div>
            <div>
              <h3 className="text-lg font-black tracking-tight text-white flex items-center gap-2">
                Nhập Danh Sách Lớp Tự Động (Excel / CSV)
              </h3>
              <p className="text-xs text-indigo-100 font-medium">
                Tự động nhận diện toàn bộ học sinh trong lớp mà không cần thêm từng bạn
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

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto custom-scrollbar flex-1 space-y-5 bg-slate-50/50">
          {/* Top Options & Instructions Bar */}
          <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-slate-600 shrink-0">Lớp mục tiêu:</span>
              <div className="w-48">
                <CustomSelect
                  value={targetClass}
                  onChange={setTargetClass}
                  options={classOptions}
                  className="w-full"
                />
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => generateStudentTemplateExcel(targetClass)}
                className="px-3 py-2 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 text-emerald-700 rounded-xl text-xs font-bold transition-all flex items-center gap-2"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Tải file Excel mẫu (.xlsx)</span>
              </button>
            </div>
          </div>

          {/* Mode Switcher Tabs */}
          <div className="flex items-center p-1 bg-slate-200/70 rounded-xl max-w-sm">
            <button
              type="button"
              onClick={() => setInputMode('file')}
              className={`flex-1 py-1.5 px-3 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
                inputMode === 'file' ? 'bg-white text-indigo-700 shadow-xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Upload className="w-3.5 h-3.5" />
              <span>Tải file Excel / CSV</span>
            </button>
            <button
              type="button"
              onClick={() => setInputMode('paste')}
              className={`flex-1 py-1.5 px-3 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
                inputMode === 'paste' ? 'bg-white text-indigo-700 shadow-xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>Dán văn bản / Bảng</span>
            </button>
          </div>

          {/* Input Area */}
          {inputMode === 'file' ? (
            <div 
              onClick={() => fileInputRef.current?.click()}
              className="border-2 border-dashed border-indigo-200 hover:border-indigo-400 bg-indigo-50/30 hover:bg-indigo-50/60 rounded-3xl p-6 text-center cursor-pointer transition-all flex flex-col items-center justify-center gap-3 group"
            >
              <input 
                ref={fileInputRef} 
                type="file" 
                accept=".xlsx, .xls, .csv, .tsv" 
                onChange={handleFileChange} 
                className="hidden" 
              />
              <div className="w-14 h-14 bg-indigo-100 text-indigo-600 rounded-2xl flex items-center justify-center group-hover:scale-105 transition-transform shadow-xs">
                <Upload className="w-7 h-7 stroke-[2.2]" />
              </div>
              <div>
                <p className="text-sm font-black text-slate-800">
                  {selectedFile ? selectedFile.name : 'Bấm để chọn hoặc kéo thả file Excel / CSV vào đây'}
                </p>
                <p className="text-xs text-slate-500 mt-1">
                  Hỗ trợ các định dạng .xlsx, .xls, .csv (tự động nhận diện Họ tên, Mã HS, Lớp, Số điện thoại)
                </p>
              </div>
              {isParsing && (
                <div className="flex items-center gap-2 text-indigo-600 text-xs font-bold">
                  <div className="w-4 h-4 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin" />
                  <span>Đang đọc và xử lý danh sách...</span>
                </div>
              )}
            </div>
          ) : (
            <div className="space-y-2">
              <textarea
                value={rawText}
                onChange={e => setRawText(e.target.value)}
                placeholder="Dán dữ liệu học sinh từ Excel hoặc Word vào đây (ví dụ: Nguyễn Văn An  HS-01  10A1  0912345678)..."
                rows={5}
                className="w-full bg-white border border-slate-200 rounded-2xl p-3 text-xs focus:ring-2 focus:ring-indigo-500 focus:outline-hidden font-mono"
              />
              <div className="flex justify-end">
                <button
                  type="button"
                  onClick={handleParseRawText}
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition-all flex items-center gap-1.5"
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>Nhận diện danh sách</span>
                </button>
              </div>
            </div>
          )}

          {/* Error Message */}
          {errorMessage && (
            <div className="p-3.5 rounded-2xl bg-rose-50 border border-rose-200 text-rose-800 text-xs font-bold flex items-center gap-2.5">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* Parsed List Preview */}
          {parsedStudents.length > 0 && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-black text-slate-900">
                    Danh sách nhận diện thành công:
                  </span>
                  <span className="px-2.5 py-0.5 rounded-full bg-indigo-100 text-indigo-800 text-xs font-extrabold">
                    {parsedStudents.length} học sinh
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  <label className="flex items-center gap-2 text-xs font-bold text-slate-700 cursor-pointer">
                    <input 
                      type="checkbox" 
                      checked={useFileClass} 
                      onChange={e => setUseFileClass(e.target.checked)}
                      className="rounded text-indigo-600 focus:ring-indigo-500 w-4 h-4"
                    />
                    <span>Ưu tiên lấy Lớp từ file</span>
                  </label>
                </div>
              </div>

              {/* Table preview */}
              <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-xs max-h-60 overflow-y-auto custom-scrollbar">
                <table className="w-full text-left border-collapse text-xs">
                  <thead className="bg-slate-100/80 sticky top-0 text-slate-600 font-extrabold border-b border-slate-200">
                    <tr>
                      <th className="p-2.5 w-10 text-center">STT</th>
                      <th className="p-2.5">Họ và Tên</th>
                      <th className="p-2.5">Mã Học Sinh</th>
                      <th className="p-2.5">Lớp Học</th>
                      <th className="p-2.5">Số Điện Thoại</th>
                      <th className="p-2.5 w-10 text-center">Xóa</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
                    {parsedStudents.map((st, idx) => (
                      <tr key={idx} className="hover:bg-slate-50 transition-colors">
                        <td className="p-2.5 text-center text-slate-400 font-bold">{idx + 1}</td>
                        <td className="p-2.5 font-bold text-slate-900">{st.name}</td>
                        <td className="p-2.5 font-mono text-indigo-700 font-bold">{st.studentCode}</td>
                        <td className="p-2.5 font-semibold">
                          <span className="px-2 py-0.5 bg-slate-100 rounded-md text-slate-800 text-[11px]">
                            {useFileClass && st.className ? st.className : targetClass}
                          </span>
                        </td>
                        <td className="p-2.5 text-slate-500">{st.phone || st.parentPhone || '—'}</td>
                        <td className="p-2.5 text-center">
                          <button
                            type="button"
                            onClick={() => handleRemoveStudent(idx)}
                            className="p-1 hover:bg-rose-50 text-slate-400 hover:text-rose-600 rounded-md transition-colors"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Note about offline / non-account student tracking */}
              <div className="p-3 bg-amber-50 border border-amber-200 rounded-2xl flex items-start gap-2.5 text-xs text-amber-900 font-medium">
                <ShieldAlert className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                <p>
                  <strong>Chế độ theo dõi linh hoạt:</strong> Các học sinh này sẽ được lưu vào hệ thống quản lý lớp học. Giáo viên có thể theo dõi tiến độ, chấm điểm chuyên cần, ghi điểm tích cực ngay cả khi học sinh <u>chưa tự tạo tài khoản</u>.
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="px-6 py-4 bg-white border-t border-slate-200 flex items-center justify-between shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl transition-all"
          >
            Đóng
          </button>

          <button
            type="button"
            disabled={parsedStudents.length === 0 || isSaving}
            onClick={handleSaveToSystem}
            className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-300 text-white font-extrabold text-xs rounded-xl shadow-md shadow-indigo-600/20 transition-all flex items-center gap-2 active:scale-95"
          >
            {isSaving ? (
              <>
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                <span>Đang nhập dữ liệu ({parsedStudents.length})...</span>
              </>
            ) : (
              <>
                <CheckCircle2 className="w-4 h-4" />
                <span>Xác nhận Nhập {parsedStudents.length} Học Sinh vào Hệ Thống</span>
              </>
            )}
          </button>
        </div>
      </motion.div>
    </div>
  );
}
