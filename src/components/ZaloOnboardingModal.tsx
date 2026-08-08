import React, { useState, useEffect } from 'react';
import { Bot, Copy, ExternalLink, X, Check, Search, User as UserIcon, ArrowRight, ShieldCheck, MessageCircle } from 'lucide-react';
import { User } from '../types';
import { collection, query, where, getDocs, doc, updateDoc } from 'firebase/firestore';
import { db } from '../firebase';

interface ZaloOnboardingModalProps {
  user: User;
  onClose: () => void;
}

export function ZaloOnboardingModal({ user, onClose }: ZaloOnboardingModalProps) {
  const [teacher, setTeacher] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);
  const [step, setStep] = useState(1);
  const [searchCode, setSearchCode] = useState(user.className || '');
  const [searchError, setSearchError] = useState('');

  useEffect(() => {
    if (user.className && user.className.length === 6) {
      findTeacher(user.className);
    } else {
      setLoading(false);
    }
  }, []);

  const findTeacher = async (code: string) => {
    if (!code) {
        setSearchError('Vui lòng nhập mã lớp!');
        return;
    }
    setLoading(true);
    setSearchError('');
    try {
      const q = query(collection(db, 'users'), where('role', '==', 'teacher'), where('connectionCode', '==', code.toUpperCase()));
      const querySnapshot = await getDocs(q);
      
      if (!querySnapshot.empty) {
        setTeacher(querySnapshot.docs[0].data() as User);
        setStep(2);
        
        if (user.className !== code.toUpperCase()) {
            await updateDoc(doc(db, 'users', user.id), { className: code.toUpperCase() });
        }
      } else {
        // Fallback: search by class name exact match if connection code doesn't work, though connectionCode is better
        setSearchError('Không tìm thấy Giáo viên với mã này. Vui lòng kiểm tra lại!');
      }
    } catch (err) {
      console.error(err);
      setSearchError('Lỗi khi kết nối tìm kiếm giáo viên.');
    } finally {
      setLoading(false);
    }
  };

  const handleCopy = () => {
    const codeToCopy = `/start ${user.connectionCode || user.id.substring(0, 6).toUpperCase()}`;
    navigator.clipboard.writeText(codeToCopy);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4 animate-in fade-in duration-200">
      <div className="bg-white rounded-3xl max-w-lg w-full border border-slate-200 shadow-2xl overflow-hidden flex flex-col max-h-[90vh] animate-in zoom-in-95 duration-300">
        <div className="p-5 border-b border-slate-100 flex items-center justify-between bg-gradient-to-r from-blue-50 to-indigo-50/50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-100 flex items-center justify-center text-blue-600">
              <Bot className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-slate-900 text-lg">Kết nối Zalo Bot</h3>
              <p className="text-xs text-slate-500">Thiết lập kết nối với giáo viên của bạn</p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-600 hover:bg-white rounded-xl transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 overflow-y-auto">
          {step === 1 && (
            <div className="space-y-6">
              <div className="text-center space-y-2">
                <div className="w-16 h-16 bg-indigo-50 rounded-full flex items-center justify-center mx-auto mb-4 text-indigo-600">
                  <Search className="w-8 h-8" />
                </div>
                <h4 className="text-xl font-bold text-slate-900">Tìm lớp học của bạn</h4>
                <p className="text-sm text-slate-500">Vui lòng nhập Mã Lớp Học (gồm 6 chữ số) do giáo viên cung cấp để kết nối đúng lớp.</p>
              </div>

              <div className="space-y-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Mã Lớp Học (Mã kết nối của GV)</label>
                  <input
                    type="text"
                    value={searchCode}
                    onChange={(e) => setSearchCode(e.target.value.toUpperCase())}
                    placeholder="VD: 123456"
                    maxLength={6}
                    className="w-full text-center tracking-[0.5em] font-mono text-2xl font-bold px-4 py-4 bg-slate-50 border border-slate-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-shadow"
                  />
                </div>
                {searchError && (
                  <p className="text-sm text-rose-600 font-medium text-center bg-rose-50 p-2 rounded-lg">{searchError}</p>
                )}
                <button
                  onClick={() => findTeacher(searchCode)}
                  disabled={loading || searchCode.length < 5}
                  className="w-full py-3.5 bg-indigo-600 text-white font-bold rounded-2xl hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-sm flex items-center justify-center gap-2"
                >
                  {loading ? 'Đang tìm kiếm...' : 'Tiếp tục'}
                  {!loading && <ArrowRight className="w-5 h-5" />}
                </button>
              </div>
            </div>
          )}

          {step === 2 && teacher && (
            <div className="space-y-6">
              <div className="bg-emerald-50 border border-emerald-100 rounded-2xl p-4 flex flex-col items-center text-center space-y-3">
                <div className="w-16 h-16 rounded-full border-4 border-white shadow-md overflow-hidden bg-white">
                    <img src={teacher.avatar} alt={teacher.name} className="w-full h-full object-cover" />
                </div>
                <div>
                    <h4 className="font-bold text-slate-900 text-lg">Đã tìm thấy giáo viên!</h4>
                    <p className="text-sm text-emerald-700 font-medium">{teacher.name}</p>
                </div>
              </div>

              <div className="space-y-4">
                <h5 className="font-bold text-slate-800 text-base flex items-center gap-2">
                  <ShieldCheck className="w-5 h-5 text-indigo-500" />
                  Hướng dẫn kích hoạt Zalo Bot
                </h5>
                
                <div className="relative pl-8 space-y-5 before:absolute before:inset-y-0 before:left-3 before:w-0.5 before:bg-slate-100">
                  <div className="relative">
                    <div className="absolute -left-8 w-6 h-6 bg-indigo-100 text-indigo-600 rounded-full flex items-center justify-center text-xs font-bold ring-4 ring-white">1</div>
                    <p className="text-sm text-slate-600 font-medium mb-2">Sao chép mã kết nối cá nhân của bạn:</p>
                    <div className="bg-slate-50 border border-slate-200 rounded-xl p-1 flex items-center justify-between">
                        <code className="text-lg font-mono font-bold text-indigo-600 px-3 py-2 bg-indigo-50/50 rounded-lg">/start {user.connectionCode || user.id.substring(0, 6).toUpperCase()}</code>
                        <button 
                            onClick={handleCopy}
                            className={`flex items-center gap-1.5 px-3 py-2 rounded-lg font-bold text-xs transition-colors ${copied ? 'bg-emerald-100 text-emerald-700' : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-100'}`}
                        >
                            {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                            {copied ? 'Đã sao chép' : 'Sao chép mã'}
                        </button>
                    </div>
                  </div>

                  <div className="relative">
                    <div className="absolute -left-8 w-6 h-6 bg-indigo-100 text-indigo-600 rounded-full flex items-center justify-center text-xs font-bold ring-4 ring-white">2</div>
                    <p className="text-sm text-slate-600 font-medium mb-2">Mở Zalo Bot của giáo viên:</p>
                    {teacher.zaloBotLink ? (
                      <a 
                        href={teacher.zaloBotLink} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-2 px-4 py-2.5 bg-[#0068ff] text-white font-bold text-sm rounded-xl hover:bg-[#0054cc] transition-colors shadow-sm"
                      >
                        <MessageCircle className="w-4 h-4" />
                        Mở Zalo Bot
                        <ExternalLink className="w-4 h-4" />
                      </a>
                    ) : (
                      <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-amber-700 text-sm font-medium">
                        Giáo viên chưa cập nhật đường link Zalo Bot. Vui lòng liên hệ trực tiếp giáo viên.
                      </div>
                    )}
                  </div>

                  <div className="relative">
                    <div className="absolute -left-8 w-6 h-6 bg-indigo-100 text-indigo-600 rounded-full flex items-center justify-center text-xs font-bold ring-4 ring-white">3</div>
                    <p className="text-sm text-slate-600 font-medium">
                      Gửi tin nhắn chứa mã vừa sao chép vào Zalo Bot. Bot sẽ phản hồi xác nhận liên kết thành công!
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
        
        {step === 2 && (
            <div className="p-5 border-t border-slate-100 bg-slate-50 flex justify-end">
                <button
                    onClick={onClose}
                    className="px-6 py-2.5 bg-indigo-600 text-white font-bold rounded-xl hover:bg-indigo-700 transition-colors shadow-sm"
                >
                    Đã hiểu và Đóng
                </button>
            </div>
        )}
      </div>
    </div>
  );
}
