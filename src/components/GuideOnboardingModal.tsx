import React, { useState, useEffect } from 'react';
import { 
  X, Check, Search, User as UserIcon, BookOpen, CheckCircle2, 
  LayoutDashboard, Calendar, Gamepad2, Layers, Gift, HelpCircle
} from 'lucide-react';
import { User, Role } from '../types';
import { collection, query, where, getDocs, doc, updateDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { GUIDE_CONTENT } from '../data/guideContent';

interface GuideOnboardingModalProps {
  user: User;
  onClose: () => void;
  activeTab?: string;
}

const iconMap: Record<string, any> = {
  LayoutDashboard,
  BookOpen,
  Calendar,
  Gamepad2,
  Layers,
  Gift,
  HelpCircle
};

export function GuideOnboardingModal({ user, onClose, activeTab = 'dashboard' }: GuideOnboardingModalProps) {
  const [teachers, setTeachers] = useState<User[]>([]);
  const [selectedTeacher, setSelectedTeacher] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  const isTeacher = user.role === 'teacher' || user.role === 'admin';
  const roleKey = isTeacher ? (user.role === 'admin' ? 'admin' : 'teacher') : 'student';

  // Fallback to dashboard if activeTab not found
  const tabContent = GUIDE_CONTENT[activeTab]?.[roleKey] || GUIDE_CONTENT['dashboard']?.[roleKey];
  const IconComponent = iconMap[tabContent?.icon] || HelpCircle;

  useEffect(() => {
    if (!isTeacher && activeTab === 'dashboard') {
      fetchTeachers();
    } else {
      setLoading(false);
    }
  }, [isTeacher, activeTab]);

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

  const filteredTeachers = teachers.filter(t => 
    t.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
    (t.className && t.className.toLowerCase().includes(searchTerm.toLowerCase())) ||
    (t.connectionCode && t.connectionCode.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4 animate-in fade-in duration-200">
      <div className="bg-white rounded-3xl max-w-xl w-full border border-slate-200 shadow-2xl overflow-hidden flex flex-col max-h-[90vh] animate-in zoom-in-95 duration-300">
        
        {/* Modal Header */}
        <div className="p-5 border-b border-slate-100 flex flex-col gap-3 bg-gradient-to-r from-indigo-50 via-blue-50 to-indigo-50">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-indigo-600 text-white flex items-center justify-center shadow-md shadow-indigo-200">
                <IconComponent className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-extrabold text-slate-900 text-base sm:text-lg flex items-center gap-2">
                  {tabContent?.title || 'Hướng dẫn sử dụng'}
                  <span className={`text-[10px] font-extrabold px-2 py-0.5 rounded-full uppercase ${isTeacher ? 'bg-amber-100 text-amber-800' : 'bg-indigo-100 text-indigo-700'}`}>
                    {isTeacher ? 'Dành cho Giáo viên' : 'Dành cho Học sinh'}
                  </span>
                </h3>
                <p className="text-xs text-slate-500">Quy trình từng bước giúp bạn làm quen và sử dụng thành thạo</p>
              </div>
            </div>
            <button 
              onClick={onClose}
              className="p-2 text-slate-400 hover:text-slate-600 hover:bg-white/80 rounded-xl transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Modal Content */}
        <div className="p-6 overflow-y-auto custom-scrollbar space-y-6">
          
          {/* Student: Choose Teacher / Class (Only on Dashboard) */}
          {!isTeacher && activeTab === 'dashboard' && (
            <div className="space-y-3 pb-4 border-b border-slate-100">
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
                <UserIcon className="w-4 h-4 text-indigo-600" />
                Chọn Giáo viên chủ nhiệm & Lớp học
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

                  <div className="grid grid-cols-1 gap-2.5 max-h-44 overflow-y-auto p-1 custom-scrollbar">
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
          )}

          {/* Dynamic Guide Content */}
          <div className="space-y-4 animate-in fade-in duration-300">
            {tabContent?.sections.map((section, idx) => (
              <div key={idx} className="p-4 bg-slate-50 border border-slate-200 rounded-2xl flex items-start gap-3">
                <div className="w-8 h-8 rounded-xl bg-indigo-100 text-indigo-700 flex items-center justify-center shrink-0 mt-0.5 font-bold">
                  <span className="text-sm">{idx + 1}</span>
                </div>
                <div>
                  <h5 className="font-bold text-slate-900 text-xs sm:text-sm">{section.title}</h5>
                  <ul className="mt-2 space-y-1">
                    {section.steps.map((step, stepIdx) => (
                      <li key={stepIdx} className="text-xs text-slate-500 leading-relaxed flex items-start gap-1.5">
                        <span className="text-indigo-400 mt-0.5">•</span>
                        <span>{step}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            ))}
          </div>

        </div>

        {/* Modal Footer */}
        <div className="p-4 border-t border-slate-100 bg-slate-50 flex items-center justify-between">
          <button
            onClick={onClose}
            className="w-full py-2.5 bg-indigo-600 text-white font-bold text-xs rounded-xl hover:bg-indigo-700 transition-colors shadow-sm flex items-center justify-center gap-2"
          >
            <CheckCircle2 className="w-4 h-4" />
            <span>Đã hiểu & Bắt đầu sử dụng</span>
          </button>
        </div>

      </div>
    </div>
  );
}
