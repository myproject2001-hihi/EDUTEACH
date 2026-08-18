import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Mail, Send, Heart, Eye, CheckCircle2, User, Sparkles, Clock, Trash2, BookOpen, Type } from 'lucide-react';
import { LoveLetter, User as UserType, ClassSession } from '../types';
import { db, handleFirestoreError, OperationType } from '../firebase';
import { collection, doc, setDoc, deleteDoc, onSnapshot, query, where } from 'firebase/firestore';
import { LoveLetterModal } from './LoveLetterModal';

export const HANDWRITING_FONTS = [
  { id: 'itim', name: 'Nắn Nót', font: "'Itim', cursive", desc: 'Chữ viết tay học sinh tròn trịa, chuẩn dấu tiếng Việt' },
  { id: 'patrick', name: 'Tự Nhiên', font: "'Patrick Hand', cursive", desc: 'Nét bút bi mộc mạc, phóng khoáng' },
  { id: 'mali', name: 'Dễ Thương', font: "'Mali', cursive", desc: 'Nét chữ nhí nhảnh, mềm mại' },
  { id: 'sriracha', name: 'Bút Mực', font: "'Sriracha', cursive", desc: 'Nét bút mực cổ điển ấm áp' },
];

interface StudentLoveLetterFormProps {
  currentUser: UserType;
  classes: ClassSession[];
  usersList: UserType[];
  showNotify?: (type: 'success' | 'error' | 'info', msg: string) => void;
}

export const StudentLoveLetterForm: React.FC<StudentLoveLetterFormProps> = ({
  currentUser,
  classes,
  usersList,
  showNotify
}) => {
  const [activeSubTab, setActiveSubTab] = useState<'create' | 'sent'>('create');
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [fontStyle, setFontStyle] = useState<string>('itim');
  const [envelopeStyle, setEnvelopeStyle] = useState<'rose_love' | 'pastel_gold' | 'ocean_blue' | 'vintage_warm'>('rose_love');
  const [targetTeacherId, setTargetTeacherId] = useState('');
  const [sending, setSending] = useState(false);
  const [sentLetters, setSentLetters] = useState<LoveLetter[]>([]);
  const [previewLetter, setPreviewLetter] = useState<LoveLetter | null>(null);
  const [localNotify, setLocalNotify] = useState<{type: 'success' | 'error' | 'info', msg: string} | null>(null);

  const activeFontObj = HANDWRITING_FONTS.find(f => f.id === fontStyle) || HANDWRITING_FONTS[0];

  const triggerNotify = (type: 'success' | 'error' | 'info', msg: string) => {
    if (showNotify) {
      showNotify(type, msg);
    } else {
      setLocalNotify({ type, msg });
      setTimeout(() => setLocalNotify(null), 4000);
    }
  };

  // 1. Fetch letters sent by this student
  useEffect(() => {
    if (!currentUser) return;
    
    const q = query(
      collection(db, 'love_letters'),
      where('senderId', '==', currentUser.id)
    );

    const unsub = onSnapshot(q, (snapshot) => {
      const list: LoveLetter[] = [];
      snapshot.forEach((docSnap) => {
        list.push({ id: docSnap.id, ...docSnap.data() } as LoveLetter);
      });
      list.sort((a, b) => {
        const timeA = new Date(a.createdAt || 0).getTime();
        const timeB = new Date(b.createdAt || 0).getTime();
        return timeB - timeA;
      });
      setSentLetters(list);
    }, (error) => {
      console.error('Lỗi khi lấy danh sách thư đã gửi:', error);
    });

    return () => unsub();
  }, [currentUser]);

  // 2. Filter list of teachers
  const teachers = useMemo(() => {
    const allTeachers = usersList.filter(u => u.role === 'teacher' || u.role === 'admin');
    
    // Sort teachers who teach sessions in this student's class to the top
    const myClassSessions = classes.filter(c => {
      const studentClass = currentUser.className?.toLowerCase().trim();
      const sessionTitle = c.title?.toLowerCase().trim();
      return studentClass && sessionTitle && (sessionTitle.includes(studentClass) || studentClass.includes(sessionTitle));
    });

    const myTeacherIds = new Set(myClassSessions.map(s => s.teacherId).filter(Boolean) as string[]);

    return allTeachers.map(t => ({
      ...t,
      isMyTeacher: myTeacherIds.has(t.id)
    })).sort((a, b) => {
      if (a.isMyTeacher && !b.isMyTeacher) return -1;
      if (!a.isMyTeacher && b.isMyTeacher) return 1;
      return a.name.localeCompare(b.name);
    });
  }, [usersList, classes, currentUser]);

  // Set default teacher recipient when list loads
  useEffect(() => {
    if (teachers.length > 0 && !targetTeacherId) {
      setTargetTeacherId(teachers[0].id);
    }
  }, [teachers, targetTeacherId]);

  const handleSendLetter = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !content.trim()) {
      triggerNotify('error', 'Vui lòng điền đầy đủ tiêu đề và nội dung bức thư tri ân!');
      return;
    }

    if (!targetTeacherId) {
      triggerNotify('error', 'Vui lòng chọn Thầy/Cô nhận thư!');
      return;
    }

    setSending(true);
    try {
      const selectedTeacher = teachers.find(t => t.id === targetTeacherId);
      const newLetterId = `letter_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
      
      const newLetter: LoveLetter = {
        id: newLetterId,
        senderId: currentUser.id,
        senderName: currentUser.name,
        senderRole: 'student',
        title: title.trim(),
        content: content.trim(),
        fontStyle,
        envelopeStyle,
        targetType: 'specific_user',
        targetValue: targetTeacherId,
        targetUserName: selectedTeacher ? selectedTeacher.name : 'Giáo viên',
        createdAt: new Date().toISOString(),
        readByUsers: []
      };

      await setDoc(doc(db, 'love_letters', newLetterId), newLetter);
      triggerNotify('success', `Đã gửi Bức Thư Tri Ân tới Thầy/Cô ${selectedTeacher?.name || ''} thành công! ❤️`);
      
      // Reset form
      setTitle('');
      setContent('');
      setActiveSubTab('sent');
    } catch (err: any) {
      console.error(err);
      handleFirestoreError(err, OperationType.CREATE, 'love_letters');
      triggerNotify('error', 'Không thể gửi bức thư: ' + (err.message || 'Lỗi Firestore'));
    } finally {
      setSending(false);
    }
  };

  const handlePreviewCurrentLetter = () => {
    if (!title.trim() || !content.trim()) {
      triggerNotify('error', 'Vui lòng nhập tiêu đề và nội dung bức thư để xem trước!');
      return;
    }

    const selectedTeacher = teachers.find(t => t.id === targetTeacherId);
    
    const dummyLetter: LoveLetter = {
      id: 'preview_temp_id',
      senderId: currentUser.id,
      senderName: currentUser.name,
      senderRole: 'student',
      title: title.trim(),
      content: content.trim(),
      fontStyle,
      envelopeStyle,
      targetType: 'specific_user',
      targetValue: targetTeacherId,
      targetUserName: selectedTeacher ? selectedTeacher.name : 'Giáo viên',
      createdAt: new Date().toISOString(),
      readByUsers: []
    };

    setPreviewLetter(dummyLetter);
  };

  const handleDeleteLetter = async (letterId: string, letterTitle: string) => {
    try {
      await deleteDoc(doc(db, 'love_letters', letterId));
      triggerNotify('success', `Đã thu hồi bức thư "${letterTitle}".`);
    } catch (err: any) {
      console.error(err);
      handleFirestoreError(err, OperationType.DELETE, `love_letters/${letterId}`);
      triggerNotify('error', 'Không thể thu hồi bức thư: ' + err.message);
    }
  };

  return (
    <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden flex flex-col">
      {/* Top Header tab controls */}
      <div className="bg-slate-50 border-b border-slate-200 px-6 py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h3 className="text-lg font-bold text-slate-950 flex items-center gap-2">
            <Heart className="w-5 h-5 text-rose-500 fill-rose-500/20" />
            Hòm Thư Tri Ân Thầy Cô ✉️
          </h3>
          <p className="text-xs text-slate-500 mt-1">Gửi những lời nhắn nhủ, lời chúc và tình cảm ấm áp đến Thầy/Cô dạy mình</p>
        </div>

        <div className="flex bg-slate-200/60 p-1 rounded-xl self-start sm:self-center">
          <button
            onClick={() => setActiveSubTab('create')}
            className={`px-4 py-1.5 text-xs font-black rounded-lg transition-all ${
              activeSubTab === 'create'
                ? 'bg-white text-indigo-700 shadow-sm'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Soạn thư tri ân
          </button>
          <button
            onClick={() => setActiveSubTab('sent')}
            className={`px-4 py-1.5 text-xs font-black rounded-lg transition-all flex items-center gap-1.5 ${
              activeSubTab === 'sent'
                ? 'bg-white text-indigo-700 shadow-sm'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Thư đã gửi ({sentLetters.length})
          </button>
        </div>
      </div>

      <div className="p-6">
        {activeSubTab === 'create' ? (
          <form onSubmit={handleSendLetter} className="space-y-5">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              {/* Left Column Controls */}
              <div className="space-y-4">
                <div>
                  <label className="text-xs font-black text-slate-700 uppercase tracking-wider block mb-1.5">
                    Người Nhận (Thầy/Cô Giáo) <span className="text-rose-500">*</span>
                  </label>
                  <select
                    required
                    value={targetTeacherId}
                    onChange={(e) => setTargetTeacherId(e.target.value)}
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-xs font-extrabold text-slate-800 outline-none focus:bg-white focus:ring-2 focus:ring-rose-500 transition-all"
                  >
                    <option value="" disabled>-- Chọn Thầy/Cô nhận thư --</option>
                    {teachers.map(t => (
                      <option key={t.id} value={t.id} className="font-bold">
                        Thầy/Cô: {t.name} {t.isMyTeacher ? '⭐️ (Dạy lớp của em)' : ''}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-xs font-black text-slate-700 uppercase tracking-wider block mb-1.5">
                    Tiêu Đề Lời Nhắn <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Ví dụ: Lời chúc ngày mới gửi Thầy/Cô! 🌸"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-xs font-extrabold text-slate-800 outline-none focus:bg-white focus:ring-2 focus:ring-rose-500 transition-all"
                  />
                </div>

                {/* KIỂU CHỮ VIẾT TAY NẰM Ở NGOÀI DƯỚI KHUNG TIÊU ĐỀ */}
                <div>
                  <label className="text-xs font-black text-slate-700 uppercase tracking-wider flex items-center gap-1.5 mb-1.5">
                    <Type className="w-3.5 h-3.5 text-rose-500" />
                    Chọn Kiểu Chữ Viết Tay
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
                    Chọn Giao Diện Phong Bì
                  </label>
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <button
                      type="button"
                      onClick={() => setEnvelopeStyle('rose_love')}
                      className={`p-2.5 rounded-xl border text-left flex items-center gap-1.5 transition-all ${
                        envelopeStyle === 'rose_love' ? 'bg-rose-50 border-rose-300 font-bold text-rose-900 ring-2 ring-rose-300' : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100'
                      }`}
                    >
                      <span className="w-3 h-3 rounded-full bg-rose-400 shrink-0" />
                      <span className="truncate">Hồng Lãng Mạn</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setEnvelopeStyle('pastel_gold')}
                      className={`p-2.5 rounded-xl border text-left flex items-center gap-1.5 transition-all ${
                        envelopeStyle === 'pastel_gold' ? 'bg-amber-50 border-amber-300 font-bold text-amber-900 ring-2 ring-amber-300' : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100'
                      }`}
                    >
                      <span className="w-3 h-3 rounded-full bg-amber-400 shrink-0" />
                      <span className="truncate">Vàng Hoàng Gia</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setEnvelopeStyle('ocean_blue')}
                      className={`p-2.5 rounded-xl border text-left flex items-center gap-1.5 transition-all ${
                        envelopeStyle === 'ocean_blue' ? 'bg-sky-50 border-sky-300 font-bold text-sky-900 ring-2 ring-sky-300' : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100'
                      }`}
                    >
                      <span className="w-3 h-3 rounded-full bg-sky-400 shrink-0" />
                      <span className="truncate">Xanh Tươi Sáng</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setEnvelopeStyle('vintage_warm')}
                      className={`p-2.5 rounded-xl border text-left flex items-center gap-1.5 transition-all ${
                        envelopeStyle === 'vintage_warm' ? 'bg-stone-100 border-stone-300 font-bold text-stone-900 ring-2 ring-stone-300' : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100'
                      }`}
                    >
                      <span className="w-3 h-3 rounded-full bg-stone-500 shrink-0" />
                      <span className="truncate">Vintage Cổ Điển</span>
                    </button>
                  </div>
                </div>
              </div>

              {/* Right Column handwritten body textarea */}
              <div className="flex flex-col justify-between space-y-4">
                <div>
                  <label className="text-xs font-black text-slate-700 uppercase tracking-wider block mb-1.5">
                    Nội Dung Bức Thư Viết Tay <span className="text-rose-500">*</span>
                  </label>
                  <textarea
                    required
                    rows={8}
                    placeholder="Hãy viết những suy nghĩ, câu hỏi, lời cảm ơn sâu sắc hay những tình cảm chân thành gửi đến thầy cô nhé..."
                    value={content}
                    onChange={(e) => setContent(e.target.value)}
                    className="w-full p-4 border border-amber-200 rounded-2xl text-lg text-slate-900 focus:bg-white focus:ring-2 focus:ring-rose-500 outline-none leading-relaxed transition-all shadow-inner"
                    style={{ fontFamily: activeFontObj.font, backgroundColor: '#fdfbf7' }}
                  />
                </div>

                <div className="flex items-center justify-end gap-2.5 pt-1">
                  <button
                    type="button"
                    onClick={handlePreviewCurrentLetter}
                    className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-extrabold text-xs rounded-xl transition-all flex items-center gap-1.5"
                  >
                    <Eye className="w-4 h-4 text-slate-600" />
                    <span>Xem trước</span>
                  </button>

                  <button
                    type="submit"
                    disabled={sending}
                    className="px-5 py-2 bg-rose-600 hover:bg-rose-700 text-white font-extrabold text-xs rounded-xl shadow-md shadow-rose-200 transition-all flex items-center gap-1.5 disabled:opacity-50"
                  >
                    <Send className="w-4 h-4" />
                    <span>{sending ? 'Đang gửi...' : 'Gửi Thư Tri Ân'}</span>
                  </button>
                </div>
              </div>
            </div>
          </form>
        ) : (
          /* SENT LETTERS LOG */
          <div className="space-y-4">
            {sentLetters.length === 0 ? (
              <div className="text-center py-10 space-y-2">
                <Mail className="w-10 h-10 text-slate-300 mx-auto" />
                <p className="text-slate-500 font-bold text-xs">Em chưa gửi bức thư tri ân nào.</p>
                <button
                  type="button"
                  onClick={() => setActiveSubTab('create')}
                  className="text-xs text-rose-600 font-black hover:underline"
                >
                  Hãy viết bức thư đầu tiên ngay thôi! ❤️
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-h-[400px] overflow-y-auto pr-1 custom-scrollbar">
                {sentLetters.map((letter) => {
                  const isRead = letter.readByUsers && letter.readByUsers.includes(letter.targetValue || '');
                  return (
                    <div
                      key={letter.id}
                      className="p-4 rounded-2xl border border-slate-200 bg-gradient-to-br from-slate-50/50 to-white hover:shadow-sm transition-all flex flex-col justify-between gap-3"
                    >
                      <div className="space-y-1.5">
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-indigo-50 border border-indigo-100 text-indigo-700">
                            Thầy/Cô: {letter.targetUserName || 'Giáo viên'}
                          </span>
                          <span className="text-[9px] text-slate-400 font-semibold">
                            {new Date(letter.createdAt).toLocaleDateString('vi-VN')}
                          </span>
                        </div>

                        <h4 className="font-bold text-slate-900 text-sm leading-snug">{letter.title}</h4>
                        <p className="text-xs text-slate-500 line-clamp-2 italic" style={{ fontFamily: "'Itim', cursive" }}>
                          "{letter.content}"
                        </p>
                      </div>

                      <div className="pt-2 border-t border-slate-100 flex items-center justify-between">
                        <span className="text-[10px] flex items-center gap-1 font-extrabold">
                          {isRead ? (
                            <>
                              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                              <span className="text-emerald-600">Thầy cô đã đọc ❤️</span>
                            </>
                          ) : (
                            <>
                              <Clock className="w-3.5 h-3.5 text-amber-500" />
                              <span className="text-amber-600">Chờ thầy cô mở đọc</span>
                            </>
                          )}
                        </span>

                        <div className="flex items-center gap-1">
                          <button
                            type="button"
                            onClick={() => setPreviewLetter(letter)}
                            className="px-2 py-1 text-slate-600 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors text-[10px] font-bold border border-slate-200"
                          >
                            Xem thư
                          </button>

                          {!isRead && (
                            <button
                              type="button"
                              onClick={() => handleDeleteLetter(letter.id, letter.title)}
                              className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                              title="Thu hồi thư chưa đọc"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Love Letter Preview Modal */}
      {previewLetter && (
        <LoveLetterModal
          letter={previewLetter}
          currentUser={currentUser}
          onClose={() => setPreviewLetter(null)}
        />
      )}

      {/* Local Toast Notification Fallback */}
      <AnimatePresence>
        {localNotify && (
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            className={`fixed bottom-6 right-6 z-[60] px-5 py-3.5 rounded-2xl shadow-xl flex items-center gap-2.5 text-xs font-extrabold text-white ${
              localNotify.type === 'success' ? 'bg-emerald-600' : localNotify.type === 'error' ? 'bg-rose-600' : 'bg-slate-800'
            }`}
          >
            <Sparkles className="w-4 h-4 text-amber-300" />
            <span>{localNotify.msg}</span>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
