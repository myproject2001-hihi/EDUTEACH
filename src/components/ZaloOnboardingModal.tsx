import React, { useState, useEffect } from 'react';
import { Bot, Copy, ExternalLink, X, Check, Search, ShieldCheck, MessageCircle, User as UserIcon, Sparkles } from 'lucide-react';
import { User } from '../types';
import { collection, query, where, getDocs, doc, updateDoc } from 'firebase/firestore';
import { db } from '../firebase';

interface ZaloOnboardingModalProps {
  user: User;
  onClose: () => void;
}

export function ZaloOnboardingModal({ user, onClose }: ZaloOnboardingModalProps) {
  const [teachers, setTeachers] = useState<User[]>([]);
  const [selectedTeacher, setSelectedTeacher] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    fetchTeachers();
  }, []);

  const fetchTeachers = async () => {
    setLoading(true);
    try {
      const q = query(collection(db, 'users'), where('role', '==', 'teacher'));
      const querySnapshot = await getDocs(q);
      const list: User[] = [];
      querySnapshot.forEach((docSnap) => {
        list.push(docSnap.data() as User);
      });
      setTeachers(list);

      // If user already has a className or connectionCode matched with a teacher, select that teacher
      if (user.className && list.length > 0) {
        const matched = list.find(t => t.connectionCode === user.className?.toUpperCase() || t.className === user.className);
        if (matched) {
          setSelectedTeacher(matched);
        } else if (list.length === 1) {
          setSelectedTeacher(list[0]);
        }
      } else if (list.length === 1) {
        setSelectedTeacher(list[0]);
      }
    } catch (err) {
      console.error('Lỗi lấy danh sách giáo viên:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSelectTeacher = async (teacher: User) => {
    setSelectedTeacher(teacher);
    const teacherCode = teacher.connectionCode || teacher.id.substring(0, 6).toUpperCase();
    if (user.className !== teacherCode) {
      try {
        await updateDoc(doc(db, 'users', user.id), { className: teacherCode });
      } catch (e) {
        console.error('Lỗi cập nhật lớp học sinh:', e);
      }
    }
  };

  const handleCopy = () => {
    const codeToCopy = `/start ${user.connectionCode || user.id.substring(0, 6).toUpperCase()}`;
    navigator.clipboard.writeText(codeToCopy);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const filteredTeachers = teachers.filter(t => 
    t.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
    (t.className && t.className.toLowerCase().includes(searchTerm.toLowerCase())) ||
    (t.connectionCode && t.connectionCode.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4 animate-in fade-in duration-200">
      <div className="bg-white rounded-3xl max-w-lg w-full border border-slate-200 shadow-2xl overflow-hidden flex flex-col max-h-[90vh] animate-in zoom-in-95 duration-300">
        {/* Modal Header */}
        <div className="p-5 border-b border-slate-100 flex items-center justify-between bg-gradient-to-r from-indigo-50 via-blue-50 to-indigo-50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-indigo-600 text-white flex items-center justify-center shadow-md shadow-indigo-200">
              <Bot className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-slate-900 text-lg flex items-center gap-2">
                Kết nối Zalo Bot Lớp Học
                <span className="text-[10px] font-extrabold bg-indigo-100 text-indigo-700 px-2 py-0.5 rounded-full uppercase">Tự động</span>
              </h3>
              <p className="text-xs text-slate-500">Nhận thông báo bài tập & kết quả học tập trực tiếp qua Zalo</p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-600 hover:bg-white/80 rounded-xl transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Content */}
        <div className="p-6 overflow-y-auto custom-scrollbar space-y-6">
          {/* Section 1: Choose Teacher / Class */}
          <div className="space-y-3">
            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider">
              1. Chọn Giáo viên & Lớp học của bạn
            </label>

            {loading ? (
              <div className="py-8 text-center text-slate-400 text-sm font-medium animate-pulse">
                Đang tải danh sách giáo viên...
              </div>
            ) : teachers.length === 0 ? (
              <div className="p-4 bg-amber-50 border border-amber-200 rounded-2xl text-amber-800 text-xs font-medium text-center">
                Chưa có tài khoản Giáo viên nào trên hệ thống. Vui lòng liên hệ quản trị viên!
              </div>
            ) : (
              <div className="space-y-2">
                {teachers.length > 3 && (
                  <div className="relative mb-2">
                    <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      placeholder="Tìm tên giáo viên hoặc mã lớp..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>
                )}

                <div className="grid grid-cols-1 gap-2.5 max-h-48 overflow-y-auto p-1 custom-scrollbar">
                  {filteredTeachers.map((t) => {
                    const isSelected = selectedTeacher?.id === t.id;
                    return (
                      <div
                        key={t.id}
                        onClick={() => handleSelectTeacher(t)}
                        className={`p-3 rounded-2xl border transition-all cursor-pointer flex items-center justify-between ${
                          isSelected 
                            ? 'bg-indigo-50/80 border-indigo-500 shadow-sm ring-1 ring-indigo-500' 
                            : 'bg-white border-slate-200 hover:border-indigo-200 hover:bg-slate-50'
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <img 
                            src={t.avatar || 'https://images.unsplash.com/photo-1624561172888-ac93c696e10c?auto=format&fit=crop&q=80&w=256&h=256'} 
                            alt={t.name} 
                            className="w-10 h-10 rounded-full object-cover border-2 border-white shadow-sm"
                          />
                          <div>
                            <h4 className="font-bold text-slate-900 text-sm">{t.name}</h4>
                            <p className="text-xs text-slate-500 flex items-center gap-1.5">
                              <span>Mã lớp: <strong className="font-mono text-indigo-600">{t.connectionCode || t.id.substring(0, 6).toUpperCase()}</strong></span>
                              {t.className && <span>• {t.className}</span>}
                            </p>
                          </div>
                        </div>
                        <div className={`w-6 h-6 rounded-full flex items-center justify-center transition-colors ${isSelected ? 'bg-indigo-600 text-white' : 'border border-slate-300'}`}>
                          {isSelected && <Check className="w-3.5 h-3.5" />}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          {/* Section 2: Setup Instructions when teacher selected */}
          {selectedTeacher && (
            <div className="space-y-4 pt-4 border-t border-slate-100 animate-in fade-in slide-in-from-bottom-2 duration-300">
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
                <ShieldCheck className="w-4 h-4 text-emerald-600" />
                2. Hướng dẫn kích hoạt Zalo Bot
              </label>

              <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 space-y-4">
                {/* Step A: Copy Code */}
                <div>
                  <p className="text-xs font-bold text-slate-700 mb-1.5 flex items-center gap-1.5">
                    <span className="w-5 h-5 rounded-full bg-indigo-600 text-white text-[11px] font-black flex items-center justify-center">A</span>
                    Sao chép cú pháp kết nối cá nhân:
                  </p>
                  <div className="bg-white border border-slate-200 rounded-xl p-2 flex items-center justify-between shadow-sm">
                    <code className="text-base font-mono font-bold text-indigo-600 px-2 tracking-wider">
                      /start {user.connectionCode || user.id.substring(0, 6).toUpperCase()}
                    </code>
                    <button 
                      onClick={handleCopy}
                      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-bold text-xs transition-colors ${
                        copied 
                          ? 'bg-emerald-500 text-white' 
                          : 'bg-indigo-50 text-indigo-600 hover:bg-indigo-100'
                      }`}
                    >
                      {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                      {copied ? 'Đã chép' : 'Sao chép'}
                    </button>
                  </div>
                </div>

                {/* Step B: Open Zalo Bot */}
                <div>
                  <p className="text-xs font-bold text-slate-700 mb-1.5 flex items-center gap-1.5">
                    <span className="w-5 h-5 rounded-full bg-indigo-600 text-white text-[11px] font-black flex items-center justify-center">B</span>
                    Mở Zalo Bot của Giáo viên {selectedTeacher.name}:
                  </p>
                  {selectedTeacher.zaloBotLink ? (
                    <a 
                      href={selectedTeacher.zaloBotLink} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="w-full inline-flex items-center justify-center gap-2 px-4 py-3 bg-[#0068ff] hover:bg-[#0054cc] text-white font-bold text-sm rounded-xl transition-colors shadow-sm"
                    >
                      <MessageCircle className="w-5 h-5" />
                      Mở ứng dụng Zalo Bot
                      <ExternalLink className="w-4 h-4" />
                    </a>
                  ) : (
                    <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-amber-800 text-xs font-medium flex items-center gap-2">
                      <Sparkles className="w-4 h-4 shrink-0 text-amber-600" />
                      <span>Giáo viên chưa dán Link Zalo Bot. Em vẫn có thể bấm nút <strong>"Sao chép"</strong> ở trên và gửi mã này cho cô qua Zalo nha!</span>
                    </div>
                  )}
                </div>

                {/* Step C: Message hint */}
                <div className="p-3 bg-blue-50/60 border border-blue-100 rounded-xl space-y-1">
                  <p className="text-xs font-bold text-blue-900">
                    💡 Sau khi mở Zalo Bot:
                  </p>
                  <p className="text-xs text-blue-700 leading-relaxed">
                    Dán đoạn mã vừa sao chép (ví dụ: <code className="font-mono font-bold">/start {user.connectionCode || user.id.substring(0, 6).toUpperCase()}</code>) vào ô tin nhắn. Bot sẽ gửi lời chào mừng xác nhận kết nối thành công!
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="p-4 border-t border-slate-100 bg-slate-50 flex items-center justify-between">
          <p className="text-xs text-slate-400 font-medium hidden sm:block">Dễ dàng cho học sinh mọi lứa tuổi</p>
          <button
            onClick={onClose}
            className="w-full sm:w-auto px-6 py-2.5 bg-indigo-600 text-white font-bold text-xs rounded-xl hover:bg-indigo-700 transition-colors shadow-sm"
          >
            Đã hiểu & Vào học ngay
          </button>
        </div>
      </div>
    </div>
  );
}
