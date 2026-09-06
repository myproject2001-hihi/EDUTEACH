import React, { useState } from 'react';
import { motion } from 'motion/react';
import { Mail, Send, Heart, Trash2, Users, User, Sparkles, Plus, Eye, CheckCircle2, Shield, Search, Type, Edit, MessageSquareHeart, CheckSquare, Square, MinusSquare, AlertCircle } from 'lucide-react';
import { LoveLetter, User as UserType } from '../types';
import { db, handleFirestoreError, OperationType } from '../firebase';
import { collection, doc, setDoc, deleteDoc } from 'firebase/firestore';
import { LoveLetterModal } from './LoveLetterModal';
import { LoveLetterReadersRepliesModal } from './LoveLetterReadersRepliesModal';

export const HANDWRITING_FONTS = [
  { id: 'itim', name: 'Nắn Nót', font: "'Itim', cursive", desc: 'Chữ viết tay học sinh tròn trịa, chuẩn dấu tiếng Việt' },
  { id: 'patrick', name: 'Tự Nhiên', font: "'Patrick Hand', cursive", desc: 'Nét bút bi mộc mạc, phóng khoáng' },
  { id: 'mali', name: 'Dễ Thương', font: "'Mali', cursive", desc: 'Nét chữ nhí nhảnh, mềm mại' },
  { id: 'sriracha', name: 'Bút Mực', font: "'Sriracha', cursive", desc: 'Nét bút mực cổ điển ấm áp' },
];

interface LoveLetterManagerProps {
  currentUser: UserType;
  letters: LoveLetter[];
  usersList: UserType[];
  classesList: string[];
  showNotify: (type: 'success' | 'error' | 'info', msg: string) => void;
}

export const LoveLetterManager: React.FC<LoveLetterManagerProps> = ({
  currentUser,
  letters,
  usersList,
  classesList,
  showNotify
}) => {
  const [isCreating, setIsCreating] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [fontStyle, setFontStyle] = useState<string>('itim');
  const [envelopeStyle, setEnvelopeStyle] = useState<'rose_love' | 'pastel_gold' | 'ocean_blue' | 'vintage_warm'>('rose_love');
  const [targetType, setTargetType] = useState<'next_registered' | 'class' | 'specific_user' | 'all_teachers' | 'all_students'>('next_registered');
  const [targetValue, setTargetValue] = useState('');
  const [userSearchTerm, setUserSearchTerm] = useState('');
  const [sending, setSending] = useState(false);
  const [previewLetter, setPreviewLetter] = useState<LoveLetter | null>(null);
  const [inspectedLetter, setInspectedLetter] = useState<LoveLetter | null>(null);
  const [selectedLetterIds, setSelectedLetterIds] = useState<string[]>([]);
  const [isBulkDeleting, setIsBulkDeleting] = useState(false);
  const [confirmBulkDelete, setConfirmBulkDelete] = useState(false);

  const activeFontObj = HANDWRITING_FONTS.find(f => f.id === fontStyle) || HANDWRITING_FONTS[0];

  // Filter users for specific target picker
  const filteredUsers = usersList.filter(u => 
    u.name.toLowerCase().includes(userSearchTerm.toLowerCase()) ||
    (u.className && u.className.toLowerCase().includes(userSearchTerm.toLowerCase()))
  );

  const isAllLettersSelected = letters.length > 0 && letters.every(l => selectedLetterIds.includes(l.id));
  const isSomeLettersSelected = letters.some(l => selectedLetterIds.includes(l.id)) && !isAllLettersSelected;

  const handleToggleSelectAll = () => {
    if (isAllLettersSelected) {
      setSelectedLetterIds([]);
    } else {
      setSelectedLetterIds(letters.map(l => l.id));
    }
  };

  const handleToggleSelectLetter = (id: string) => {
    setSelectedLetterIds(prev => 
      prev.includes(id) ? prev.filter(item => item !== id) : [...prev, id]
    );
  };

  const handleBulkDelete = async () => {
    if (selectedLetterIds.length === 0) return;
    setIsBulkDeleting(true);
    try {
      const deletePromises = selectedLetterIds.map(id => deleteDoc(doc(db, 'love_letters', id)));
      await Promise.all(deletePromises);
      showNotify('success', `Đã xóa thành công ${selectedLetterIds.length} bức thư đã chọn!`);
      setSelectedLetterIds([]);
      setConfirmBulkDelete(false);
    } catch (err: any) {
      console.error('Lỗi khi xóa đồng loạt:', err);
      handleFirestoreError(err, OperationType.DELETE, 'love_letters');
      showNotify('error', 'Lỗi khi xóa đồng loạt: ' + err.message);
    } finally {
      setIsBulkDeleting(false);
    }
  };

  const handleSendLetter = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !content.trim()) {
      showNotify('error', 'Vui lòng điền đầy đủ tiêu đề và nội dung bức thư!');
      return;
    }

    if (targetType === 'class' && !targetValue.trim()) {
      showNotify('error', 'Vui lòng chọn hoặc nhập tên lớp học nhận thư!');
      return;
    }

    if (targetType === 'specific_user' && !targetValue) {
      showNotify('error', 'Vui lòng chọn người nhận cụ thể!');
      return;
    }

    setSending(true);
    try {
      const selectedUserObj = targetType === 'specific_user' ? usersList.find(u => u.id === targetValue) : null;
      const finalLetterId = editingId || `letter_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
      
      const newLetter: LoveLetter = {
        id: finalLetterId,
        senderId: currentUser.id,
        senderName: currentUser.name,
        senderRole: currentUser.role === 'admin' ? 'admin' : 'teacher',
        title: title.trim(),
        content: content.trim(),
        fontStyle,
        envelopeStyle,
        targetType,
        targetValue: targetValue || '',
        targetUserName: selectedUserObj ? selectedUserObj.name : 'Người nhận',
        createdAt: editingId ? (letters.find(l => l.id === editingId)?.createdAt || new Date().toISOString()) : new Date().toISOString(),
        readByUsers: editingId ? (letters.find(l => l.id === editingId)?.readByUsers || []) : []
      };

      await setDoc(doc(db, 'love_letters', finalLetterId), newLetter);
      showNotify('success', editingId ? 'Đã cập nhật Bức Thư Yêu Thương thành công!' : 'Đã tạo và gửi Bức Thư Yêu Thương thành công!');
      
      // Reset form
      setTitle('');
      setContent('');
      setEditingId(null);
      setIsCreating(false);
    } catch (err: any) {
      console.error(err);
      handleFirestoreError(err, OperationType.CREATE, 'love_letters');
      showNotify('error', 'Không thể gửi bức thư: ' + (err.message || 'Lỗi Firestore'));
    } finally {
      setSending(false);
    }
  };

  const handlePreviewCurrentLetter = () => {
    if (!title.trim() || !content.trim()) {
      showNotify('error', 'Vui lòng nhập tiêu đề và nội dung bức thư để xem trước!');
      return;
    }

    const selectedUserObj = targetType === 'specific_user' ? usersList.find(u => u.id === targetValue) : null;
    
    const dummyLetter: LoveLetter = {
      id: 'preview_temp_id',
      senderId: currentUser.id,
      senderName: currentUser.name,
      senderRole: currentUser.role === 'admin' ? 'admin' : 'teacher',
      title: title.trim(),
      content: content.trim(),
      fontStyle,
      envelopeStyle,
      targetType,
      targetValue: targetValue || '',
      targetUserName: selectedUserObj ? selectedUserObj.name : 'Người nhận',
      createdAt: new Date().toISOString(),
      readByUsers: []
    };

    setPreviewLetter(dummyLetter);
  };

  const handleDeleteLetter = async (letterId: string, letterTitle: string) => {
    try {
      await deleteDoc(doc(db, 'love_letters', letterId));
      showNotify('success', `Đã xóa bức thư "${letterTitle}".`);
    } catch (err: any) {
      console.error(err);
      handleFirestoreError(err, OperationType.DELETE, `love_letters/${letterId}`);
      showNotify('error', 'Không thể xóa bức thư: ' + err.message);
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="bg-gradient-to-r from-pink-500 via-rose-500 to-purple-600 rounded-3xl p-6 text-white shadow-xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-white/20 backdrop-blur-md rounded-full text-xs font-bold uppercase tracking-wider">
            <Heart className="w-3.5 h-3.5 fill-current text-pink-200" />
            <span>Hòm Thư Yêu Thương & Lời Chào Mừng</span>
          </div>
          <h2 className="text-xl sm:text-2xl font-black">Gửi Thư Nhắn Phong Bì Cho Học Sinh & Giáo Viên</h2>
          <p className="text-xs sm:text-sm text-pink-100 max-w-xl leading-relaxed">
            Tạo bức thư đính kèm phong bì mở tự động khi học sinh/giáo viên đăng nhập, kèm hiệu ứng viết tay chạy chữ đầy ấm áp và cảm xúc!
          </p>
        </div>

        <button
          onClick={() => {
            if (isCreating) {
              setIsCreating(false);
              setEditingId(null);
              setTitle('');
              setContent('');
            } else {
              setIsCreating(true);
            }
          }}
          className="px-5 py-3 bg-white text-rose-600 hover:bg-rose-50 font-extrabold text-xs rounded-2xl shadow-lg transition-all flex items-center gap-2 shrink-0 transform hover:scale-[1.02]"
        >
          {isCreating ? (
            <>Quay lại danh sách</>
          ) : (
            <>
              <Plus className="w-4 h-4" />
              <span>Soạn Thư Mới</span>
            </>
          )}
        </button>
      </div>

      {/* CREATE FORM */}
      {isCreating ? (
        <motion.form
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          onSubmit={handleSendLetter}
          className="bg-white p-6 sm:p-8 rounded-3xl border border-rose-200 shadow-xl space-y-6"
        >
          <div className="flex items-center gap-2 border-b border-rose-100 pb-4">
            <div className="p-2.5 bg-rose-100 text-rose-600 rounded-2xl">
              <Mail className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-extrabold text-slate-900 text-lg">
                {editingId ? 'Chỉnh Sửa Bức Thư Yêu Thương' : 'Soạn Bức Thư Yêu Thương'}
              </h3>
              <p className="text-xs text-slate-500">Tùy chỉnh phong cách phong bì, người nhận và dòng chữ viết tay</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Left Col: Inputs */}
            <div className="space-y-4">
              <div>
                <label className="text-xs font-black text-slate-700 uppercase tracking-wider block mb-1.5">
                  1. Tiêu Đề Bức Thư <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ví dụ: Chào Mừng Em Đến Với Lớp Học! 🌸"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-xs font-extrabold focus:bg-white focus:ring-2 focus:ring-rose-500 outline-none"
                />
              </div>

              {/* KIỂU CHỮ VIẾT TAY DƯỚI KHUNG TIÊU ĐỀ */}
              <div>
                <label className="text-xs font-black text-slate-700 uppercase tracking-wider flex items-center gap-1.5 mb-1.5">
                  <Type className="w-3.5 h-3.5 text-rose-500" />
                  2. Chọn Kiểu Chữ Viết Tay
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {HANDWRITING_FONTS.map(f => (
                    <button
                      key={f.id}
                      type="button"
                      onClick={() => setFontStyle(f.id)}
                      className={`p-2.5 rounded-xl border text-left flex flex-col justify-center transition-all ${
                        fontStyle === f.id
                          ? 'bg-rose-50 border-rose-400 ring-2 ring-rose-400 text-rose-950 font-bold shadow-sm'
                          : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100'
                      }`}
                    >
                      <span className="text-sm font-bold truncate leading-tight" style={{ fontFamily: f.font }}>
                        {f.name}
                      </span>
                      <span className="text-[9px] text-slate-400 truncate mt-0.5">
                        {f.desc.split(',')[0]}
                      </span>
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="text-xs font-black text-slate-700 uppercase tracking-wider block mb-1.5">
                  3. Chọn Phong Phong Bì (Theme)
                </label>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <button
                    type="button"
                    onClick={() => setEnvelopeStyle('rose_love')}
                    className={`p-3 rounded-2xl border text-left flex items-center gap-2 transition-all ${
                      envelopeStyle === 'rose_love' ? 'bg-rose-50 border-rose-400 font-bold text-rose-900 ring-2 ring-rose-400' : 'bg-slate-50 border-slate-200 text-slate-700'
                    }`}
                  >
                    <span className="w-4 h-4 rounded-full bg-rose-400 shrink-0" />
                    <span>Hồng Lãng Mạn</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setEnvelopeStyle('pastel_gold')}
                    className={`p-3 rounded-2xl border text-left flex items-center gap-2 transition-all ${
                      envelopeStyle === 'pastel_gold' ? 'bg-amber-50 border-amber-400 font-bold text-amber-900 ring-2 ring-amber-400' : 'bg-slate-50 border-slate-200 text-slate-700'
                    }`}
                  >
                    <span className="w-4 h-4 rounded-full bg-amber-400 shrink-0" />
                    <span>Vàng Hoàng Gia</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setEnvelopeStyle('ocean_blue')}
                    className={`p-3 rounded-2xl border text-left flex items-center gap-2 transition-all ${
                      envelopeStyle === 'ocean_blue' ? 'bg-sky-50 border-sky-400 font-bold text-sky-900 ring-2 ring-sky-400' : 'bg-slate-50 border-slate-200 text-slate-700'
                    }`}
                  >
                    <span className="w-4 h-4 rounded-full bg-sky-400 shrink-0" />
                    <span>Xanh Tươi Sáng</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setEnvelopeStyle('vintage_warm')}
                    className={`p-3 rounded-2xl border text-left flex items-center gap-2 transition-all ${
                      envelopeStyle === 'vintage_warm' ? 'bg-stone-100 border-amber-500 font-bold text-stone-900 ring-2 ring-amber-500' : 'bg-slate-50 border-slate-200 text-slate-700'
                    }`}
                  >
                    <span className="w-4 h-4 rounded-full bg-stone-500 shrink-0" />
                    <span>Vintage Cổ Điển</span>
                  </button>
                </div>
              </div>

              {/* Target Recipient Scope */}
              <div>
                <label className="text-xs font-black text-slate-700 uppercase tracking-wider block mb-1.5">
                  4. Đối Tượng Nhận Thư <span className="text-rose-500">*</span>
                </label>
                <div className="space-y-2 text-xs">
                  <label className="flex items-center gap-2 p-2.5 bg-slate-50 rounded-xl border border-slate-200 cursor-pointer">
                    <input
                      type="radio"
                      name="targetType"
                      checked={targetType === 'next_registered'}
                      onChange={() => { setTargetType('next_registered'); setTargetValue(''); }}
                      className="text-rose-600 focus:ring-rose-500"
                    />
                    <div>
                      <p className="font-bold text-slate-900">✨ Thành viên tiếp theo đăng ký (Tự động chào mừng)</p>
                      <p className="text-[10px] text-slate-500">Người dùng mới đăng ký vào hệ thống sẽ thấy thư này ngay lần đăng nhập đầu tiên</p>
                    </div>
                  </label>

                  <label className="flex items-center gap-2 p-2.5 bg-slate-50 rounded-xl border border-slate-200 cursor-pointer">
                    <input
                      type="radio"
                      name="targetType"
                      checked={targetType === 'class'}
                      onChange={() => { setTargetType('class'); setTargetValue(classesList[0] || 'Lớp của bạn'); }}
                      className="text-rose-600 focus:ring-rose-500"
                    />
                    <div>
                      <p className="font-bold text-slate-900">🏫 Theo Lớp Học</p>
                      <p className="text-[10px] text-slate-500">Tất cả học sinh thuộc mã lớp học được chọn</p>
                    </div>
                  </label>

                  {targetType === 'class' && (
                    <div className="pl-6 pt-1">
                      <select
                        value={targetValue}
                        onChange={(e) => setTargetValue(e.target.value)}
                        className="w-full p-2 bg-white border border-rose-300 rounded-xl text-xs font-bold text-slate-800 outline-none"
                      >
                        {classesList.map(c => (
                          <option key={c} value={c}>Lớp: {c}</option>
                        ))}
                      </select>
                    </div>
                  )}

                  <label className="flex items-center gap-2 p-2.5 bg-slate-50 rounded-xl border border-slate-200 cursor-pointer">
                    <input
                      type="radio"
                      name="targetType"
                      checked={targetType === 'specific_user'}
                      onChange={() => { setTargetType('specific_user'); setTargetValue(''); }}
                      className="text-rose-600 focus:ring-rose-500"
                    />
                    <div>
                      <p className="font-bold text-slate-900">👤 Người dùng cụ thể (Học sinh / Giáo viên)</p>
                      <p className="text-[10px] text-slate-500">Chọn đích danh 1 người dùng trong danh sách</p>
                    </div>
                  </label>

                  {targetType === 'specific_user' && (
                    <div className="pl-6 pt-1 space-y-2">
                      <div className="relative">
                        <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5" />
                        <input
                          type="text"
                          placeholder="Tìm tên hoặc lớp..."
                          value={userSearchTerm}
                          onChange={(e) => setUserSearchTerm(e.target.value)}
                          className="w-full pl-8 pr-3 py-1.5 bg-white border border-slate-200 rounded-xl text-xs outline-none"
                        />
                      </div>
                      <select
                        value={targetValue}
                        onChange={(e) => setTargetValue(e.target.value)}
                        className="w-full p-2 bg-white border border-rose-300 rounded-xl text-xs font-bold text-slate-800 outline-none max-h-32"
                      >
                        <option value="">-- Tích chọn người nhận --</option>
                        {filteredUsers.map(u => (
                          <option key={u.id} value={u.id}>
                            {u.name} ({u.role === 'student' ? `Học sinh - ${u.className || 'Chưa gán lớp'}` : 'Giáo viên'})
                          </option>
                        ))}
                      </select>
                    </div>
                  )}

                  <label className="flex items-center gap-2 p-2.5 bg-slate-50 rounded-xl border border-slate-200 cursor-pointer">
                    <input
                      type="radio"
                      name="targetType"
                      checked={targetType === 'all_students'}
                      onChange={() => { setTargetType('all_students'); setTargetValue(''); }}
                      className="text-rose-600 focus:ring-rose-500"
                    />
                    <div>
                      <p className="font-bold text-slate-900">🎓 Tất cả Học sinh trên hệ thống</p>
                    </div>
                  </label>

                  {currentUser.role === 'admin' && (
                    <label className="flex items-center gap-2 p-2.5 bg-slate-50 rounded-xl border border-slate-200 cursor-pointer">
                      <input
                        type="radio"
                        name="targetType"
                        checked={targetType === 'all_teachers'}
                        onChange={() => { setTargetType('all_teachers'); setTargetValue(''); }}
                        className="text-rose-600 focus:ring-rose-500"
                      />
                      <div>
                        <p className="font-bold text-slate-900">👩‍🏫 Tất cả Giáo viên phụ trách (Thư Admin gửi Giáo viên)</p>
                      </div>
                    </label>
                  )}
                </div>
              </div>
            </div>

            {/* Right Col: Content Writing & Preview */}
            <div className="space-y-4 flex flex-col justify-between">
              <div>
                <label className="text-xs font-black text-slate-700 uppercase tracking-wider block mb-1.5">
                  5. Nội Dung Bức Thư Viết Tay <span className="text-rose-500">*</span>
                </label>
                <textarea
                  required
                  rows={8}
                  placeholder="Viết những dòng chia sẻ, động viên hoặc lời chào mừng ấm áp dành cho học sinh/giáo viên..."
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  className="w-full p-4 bg-amber-50/50 border border-amber-200 rounded-2xl text-lg text-slate-900 focus:bg-white focus:ring-2 focus:ring-rose-500 outline-none leading-relaxed transition-all"
                  style={{ fontFamily: activeFontObj.font }}
                />
              </div>

              <div className="pt-2 flex items-center justify-end gap-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => {
                    setIsCreating(false);
                    setEditingId(null);
                    setTitle('');
                    setContent('');
                  }}
                  className="px-4 py-2.5 text-xs font-bold text-slate-500 hover:bg-slate-100 rounded-xl transition-colors"
                >
                  Hủy bỏ
                </button>
                <button
                  type="button"
                  onClick={handlePreviewCurrentLetter}
                  className="px-4 py-2.5 bg-rose-50 hover:bg-rose-100 text-rose-700 font-extrabold text-xs rounded-xl border border-rose-200 transition-all flex items-center gap-2"
                >
                  <Eye className="w-4 h-4 text-rose-600" />
                  <span>Xem Trước Phong Bì</span>
                </button>
                <button
                  type="submit"
                  disabled={sending}
                  className="px-6 py-2.5 bg-rose-600 hover:bg-rose-700 text-white font-extrabold text-xs rounded-xl shadow-md shadow-rose-200 transition-all flex items-center gap-2 disabled:opacity-50"
                >
                  <Send className="w-4 h-4" />
                  <span>{sending ? 'Đang lưu...' : editingId ? 'Cập Nhật Thư' : 'Gửi Thư Phong Bì'}</span>
                </button>
              </div>
            </div>
          </div>
        </motion.form>
      ) : (
        /* SENT LETTERS LIST */
        <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-xl space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3 flex-wrap gap-2">
            <div className="flex items-center gap-3">
              <h3 className="font-extrabold text-slate-900 text-base flex items-center gap-2">
                <Mail className="w-4 h-4 text-rose-500" />
                Danh Sách Bức Thư Đã Tạo ({letters.length})
              </h3>
              {letters.length > 0 && (
                <button
                  type="button"
                  onClick={handleToggleSelectAll}
                  className="flex items-center gap-1.5 text-xs font-bold text-slate-600 hover:text-rose-600 transition-colors ml-2 bg-slate-50 hover:bg-rose-50 px-2.5 py-1 rounded-lg border border-slate-200"
                >
                  {isAllLettersSelected ? (
                    <CheckSquare className="w-4 h-4 text-rose-600" />
                  ) : isSomeLettersSelected ? (
                    <MinusSquare className="w-4 h-4 text-rose-600" />
                  ) : (
                    <Square className="w-4 h-4 text-slate-400" />
                  )}
                  <span>Chọn tất cả ({letters.length})</span>
                </button>
              )}
            </div>

            {selectedLetterIds.length > 0 && (
              <div className="flex items-center gap-2">
                <span className="text-xs font-extrabold text-rose-700 bg-rose-50 border border-rose-200 px-2.5 py-1 rounded-lg">
                  Đã chọn {selectedLetterIds.length} thư
                </span>
                <button
                  type="button"
                  onClick={() => setConfirmBulkDelete(true)}
                  disabled={isBulkDeleting}
                  className="px-3 py-1 bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs rounded-lg shadow-xs transition-all flex items-center gap-1.5"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Xóa {selectedLetterIds.length} thư đã chọn</span>
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedLetterIds([])}
                  className="px-2 py-1 text-slate-500 hover:text-slate-800 text-xs font-semibold"
                >
                  Bỏ chọn
                </button>
              </div>
            )}
          </div>

          {letters.length === 0 ? (
            <div className="text-center py-12 space-y-3">
              <Mail className="w-12 h-12 text-slate-300 mx-auto" />
              <p className="text-slate-500 font-bold text-sm">Chưa có bức thư phong bì nào được khởi tạo</p>
              <button
                onClick={() => setIsCreating(true)}
                className="px-4 py-2 bg-rose-50 text-rose-700 font-bold text-xs rounded-xl hover:bg-rose-100 transition-colors inline-flex items-center gap-1.5"
              >
                <Plus className="w-4 h-4" /> Soạn thư đầu tiên
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {letters.map((letter) => {
                const readCount = letter.readByUsers?.length || 0;
                const isSelected = selectedLetterIds.includes(letter.id);
                return (
                  <div
                    key={letter.id}
                    onClick={() => handleToggleSelectLetter(letter.id)}
                    className={`p-5 rounded-2xl border transition-all space-y-3 flex flex-col justify-between cursor-pointer select-none group ${
                      isSelected
                        ? 'border-rose-400 bg-rose-50/50 shadow-md ring-1 ring-rose-400'
                        : 'border-rose-100 bg-gradient-to-br from-rose-50/40 via-white to-pink-50/20 shadow-sm hover:shadow-md hover:border-rose-300'
                    }`}
                  >
                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2 min-w-0">
                          <div
                            className="shrink-0 p-0.5 text-slate-400 group-hover:text-rose-600 transition-colors"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleToggleSelectLetter(letter.id);
                            }}
                          >
                            {isSelected ? (
                              <CheckSquare className="w-4 h-4 text-rose-600" />
                            ) : (
                              <Square className="w-4 h-4 text-slate-300" />
                            )}
                          </div>
                          <span className="text-[10px] font-extrabold px-2.5 py-0.5 rounded-md bg-rose-100 text-rose-800 uppercase truncate">
                            {letter.targetType === 'next_registered' ? '✨ Đăng ký tiếp theo' :
                             letter.targetType === 'class' ? `🏫 Lớp ${letter.targetValue}` :
                             letter.targetType === 'specific_user' ? `👤 ${letter.targetUserName || 'Cá nhân'}` :
                             letter.targetType === 'all_teachers' ? '👩‍🏫 Tất cả GV' : '🎓 Tất cả học sinh'}
                          </span>
                        </div>
                        <span className="text-[10px] text-slate-400 font-medium shrink-0">
                          {new Date(letter.createdAt).toLocaleDateString('vi-VN')}
                        </span>
                      </div>

                      <h4 className="font-extrabold text-slate-900 text-base leading-snug">{letter.title}</h4>
                      <p className="text-xs text-slate-600 line-clamp-2 italic font-serif" style={{ fontFamily: '"Caveat", cursive' }}>
                        "{letter.content}"
                      </p>
                    </div>

                    <div 
                      className="pt-2 border-t border-slate-100 flex flex-wrap items-center justify-between gap-2 text-xs"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <button
                          type="button"
                          onClick={() => setInspectedLetter(letter)}
                          className="text-[11px] text-slate-600 hover:text-rose-700 bg-rose-50/70 hover:bg-rose-100/80 px-2.5 py-1 rounded-lg border border-rose-200/70 transition-colors flex items-center gap-1 font-medium active:scale-95"
                          title="Bấm để xem danh sách chi tiết ai đã đọc và xóa người xem"
                        >
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                          <span>Đã có <strong>{readCount}</strong> lượt đọc</span>
                        </button>

                        {(letter.replies?.length || 0) > 0 && (
                          <button
                            type="button"
                            onClick={() => setInspectedLetter(letter)}
                            className="text-[11px] text-rose-700 hover:text-rose-900 bg-pink-100/70 hover:bg-pink-200/80 px-2.5 py-1 rounded-lg border border-pink-300/70 transition-colors flex items-center gap-1 font-bold active:scale-95"
                            title="Bấm để xem danh sách lời cảm ơn & thư phản hồi"
                          >
                            <MessageSquareHeart className="w-3.5 h-3.5 text-rose-600" />
                            <span>{letter.replies?.length} phản hồi</span>
                          </button>
                        )}
                      </div>

                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => setInspectedLetter(letter)}
                          className="px-2.5 py-1 text-rose-700 bg-rose-50 hover:bg-rose-100 rounded-lg transition-colors flex items-center gap-1 text-[11px] font-bold border border-rose-200"
                          title="Xem danh sách người xem & thư phản hồi"
                        >
                          <Users className="w-3.5 h-3.5 text-rose-600" />
                          <span className="hidden sm:inline">Người xem</span>
                        </button>

                        <button
                          onClick={() => {
                            setEditingId(letter.id);
                            setTitle(letter.title);
                            setContent(letter.content);
                            setFontStyle(letter.fontStyle || 'itim');
                            setEnvelopeStyle(letter.envelopeStyle || 'rose_love');
                            setTargetType(letter.targetType || 'next_registered');
                            setTargetValue(letter.targetValue || '');
                            setIsCreating(true);
                          }}
                          className="px-2.5 py-1 text-slate-600 hover:text-indigo-700 hover:bg-indigo-50 rounded-lg transition-colors flex items-center gap-1 text-[11px] font-bold border border-slate-200 hover:border-indigo-200"
                          title="Chỉnh sửa nội dung thư"
                        >
                          <Edit className="w-3.5 h-3.5 text-indigo-600" />
                          <span className="hidden sm:inline">Chỉnh sửa</span>
                        </button>

                        <button
                          onClick={() => setPreviewLetter(letter)}
                          className="px-2.5 py-1 text-slate-600 hover:text-rose-700 hover:bg-rose-50 rounded-lg transition-colors flex items-center gap-1 text-[11px] font-bold border border-slate-200 hover:border-rose-200"
                          title="Xem trước giao diện phong bì mở thư"
                        >
                          <Eye className="w-3.5 h-3.5 text-rose-600" />
                          <span className="hidden sm:inline">Xem trước</span>
                        </button>

                        <button
                          onClick={() => handleDeleteLetter(letter.id, letter.title)}
                          className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                          title="Xóa thư này"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Love Letter Preview Modal */}
      {previewLetter && (
        <LoveLetterModal
          letter={previewLetter}
          currentUser={currentUser}
          onClose={() => setPreviewLetter(null)}
        />
      )}

      {/* Love Letter Readers & Replies Modal */}
      {inspectedLetter && (
        <LoveLetterReadersRepliesModal
          letter={inspectedLetter}
          currentUser={currentUser}
          allUsers={usersList}
          onClose={() => setInspectedLetter(null)}
          onLetterUpdated={(updated) => {
            setInspectedLetter(updated);
          }}
          showNotify={showNotify}
        />
      )}

      {/* Confirmation Modal: Bulk Delete Letters */}
      {confirmBulkDelete && (
        <div className="fixed inset-0 z-[300] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="bg-white rounded-2xl p-5 max-w-md w-full shadow-2xl border border-slate-200 space-y-4"
          >
            <div className="flex items-center gap-3 text-rose-600">
              <div className="w-10 h-10 rounded-xl bg-rose-100 flex items-center justify-center shrink-0">
                <Trash2 className="w-5 h-5" />
              </div>
              <div>
                <h4 className="text-sm font-extrabold text-slate-900">Xóa đồng loạt bức thư</h4>
                <p className="text-xs text-slate-500">Xóa {selectedLetterIds.length} bức thư đã chọn</p>
              </div>
            </div>

            <p className="text-xs text-slate-600 leading-relaxed">
              Bạn có chắc chắn muốn xóa vĩnh viễn <strong>{selectedLetterIds.length} bức thư</strong> đã chọn? Toàn bộ nội dung, danh sách người xem và phản hồi liên quan sẽ bị xóa.
            </p>

            <div className="max-h-32 overflow-y-auto p-2.5 bg-slate-50 rounded-xl border border-slate-200 text-[11px] text-slate-700 space-y-1">
              {letters.filter(l => selectedLetterIds.includes(l.id)).map(l => (
                <div key={l.id} className="truncate font-semibold text-slate-800">
                  • {l.title}
                </div>
              ))}
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setConfirmBulkDelete(false)}
                className="px-3.5 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl transition-colors"
              >
                Hủy bỏ
              </button>
              <button
                type="button"
                onClick={handleBulkDelete}
                disabled={isBulkDeleting}
                className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white font-extrabold text-xs rounded-xl shadow-md shadow-rose-200 transition-all flex items-center gap-1.5"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>{isBulkDeleting ? 'Đang xóa...' : `Xác nhận xóa (${selectedLetterIds.length})`}</span>
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
};
