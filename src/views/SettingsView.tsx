import React, { useState, useEffect } from 'react';
import { Save, Settings, CheckCircle, AlertCircle, Sparkles } from 'lucide-react';
import { db } from '../firebase';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { User } from '../types';

interface SettingsViewProps {
  user: User;
}

export function SettingsView({ user }: SettingsViewProps) {
  const [academicYear, setAcademicYear] = useState(() => {
    return localStorage.getItem('academic_year') || 'Khóa 2024 - 2025';
  });
  const [className, setClassName] = useState('');
  const [connectionCode, setConnectionCode] = useState('');
  
  const [isLoading, setIsLoading] = useState(false);
  const [notification, setNotification] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  useEffect(() => {
    const loadConfig = async () => {
      try {
        if (user.role === 'teacher' || user.role === 'admin') {
          const userDocRef = doc(db, 'users', user.id);
          const userDocSnap = await getDoc(userDocRef);
          if (userDocSnap.exists()) {
            const uData = userDocSnap.data();
            if (uData.connectionCode) setConnectionCode(uData.connectionCode);
            if (uData.className) setClassName(uData.className);
          } else {
            if (user.connectionCode) setConnectionCode(user.connectionCode);
            if (user.className) setClassName(user.className);
          }
        }
      } catch (err) {
        console.error("Lỗi tải cấu hình:", err);
      }
    };
    loadConfig();
  }, [user]);

  const handleSaveConfig = async () => {
    setIsLoading(true);
    setNotification(null);
    try {
      localStorage.setItem('academic_year', academicYear);
      // Dispatch storage event to update layout instantly
      window.dispatchEvent(new Event('storage'));

      if (user.role === 'teacher' || user.role === 'admin') {
        await updateDoc(doc(db, 'users', user.id), {
          connectionCode: connectionCode || user.id.substring(0, 6).toUpperCase(),
          className: className
        });
      }

      setNotification({ message: 'Lưu cài đặt hệ thống thành công!', type: 'success' });
    } catch (err) {
      console.error(err);
      setNotification({ message: 'Có lỗi xảy ra khi lưu cấu hình.', type: 'error' });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto pb-10 space-y-6">
      <div className="bg-white p-6 rounded-3xl border border-slate-200/80 shadow-sm flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
            <Settings className="w-7 h-7 text-indigo-600" />
            Cấu hình Hệ thống
          </h2>
          <p className="text-slate-500 text-sm mt-0.5">Quản lý niên khóa, thông tin lớp học và các thông số chung của hệ thống.</p>
        </div>
      </div>

      {notification && (
        <div className={`p-4 rounded-2xl border flex items-start gap-3 ${
          notification.type === 'success' ? 'bg-emerald-50 border-emerald-200 text-emerald-800' : 'bg-rose-50 border-rose-200 text-rose-800'
        }`}>
          {notification.type === 'success' ? <CheckCircle className="w-5 h-5 shrink-0 mt-0.5" /> : <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />}
          <div className="text-sm font-semibold">{notification.message}</div>
        </div>
      )}

      <div className="bg-white rounded-3xl border border-slate-200/80 shadow-sm overflow-hidden">
        <div className="p-6 space-y-6">
          <div className="space-y-4">
            <h3 className="text-lg font-bold text-slate-900 border-b pb-2">1. Thông tin chung</h3>
            
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-1.5">Niên khóa học tập</label>
              <input
                type="text"
                value={academicYear}
                onChange={(e) => setAcademicYear(e.target.value)}
                placeholder="VD: Khóa 2024 - 2025"
                className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm font-medium text-slate-800 focus:ring-2 focus:ring-indigo-500 outline-none"
              />
              <p className="mt-1 text-[11px] text-slate-500">Hiển thị trên tiêu đề bảng điều khiển của giáo viên và học sinh.</p>
            </div>
          </div>

          {(user.role === 'teacher' || user.role === 'admin') && (
            <div className="space-y-4 pt-4 border-t border-slate-100">
              <h3 className="text-lg font-bold text-slate-900 border-b pb-2">2. Cấu hình Lớp học</h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1.5">Mã lớp kết nối</label>
                  <input
                    type="text"
                    value={connectionCode}
                    onChange={(e) => setConnectionCode(e.target.value.toUpperCase())}
                    placeholder="VD: CLASS01"
                    className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm font-mono font-bold text-indigo-600 focus:ring-2 focus:ring-indigo-500 outline-none"
                  />
                  <p className="mt-1 text-[11px] text-slate-500">Mã kết nối dành cho học sinh gia nhập lớp học của bạn.</p>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1.5">Tên lớp / Nhóm giảng dạy</label>
                  <input
                    type="text"
                    value={className}
                    onChange={(e) => setClassName(e.target.value)}
                    placeholder="VD: Lớp Toán Thầy Minh - Khóa 2024"
                    className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm font-medium text-slate-800 focus:ring-2 focus:ring-indigo-500 outline-none"
                  />
                  <p className="mt-1 text-[11px] text-slate-500">Tên lớp hiển thị trên bảng điều khiển của học sinh.</p>
                </div>
              </div>
            </div>
          )}

          <div className="pt-6 border-t border-slate-100 flex items-center justify-end">
            <button
              onClick={handleSaveConfig}
              disabled={isLoading}
              className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-bold rounded-xl flex items-center gap-2 transition-colors shadow-sm disabled:opacity-70"
            >
              <Save className="w-4 h-4" />
              {isLoading ? 'Đang lưu...' : 'Lưu cài đặt'}
            </button>
          </div>
          
        </div>
      </div>

      <div className="bg-indigo-50/50 rounded-3xl border border-indigo-100 p-6 flex items-start gap-4">
        <div className="w-10 h-10 rounded-2xl bg-indigo-100 text-indigo-600 flex items-center justify-center shrink-0">
          <Sparkles className="w-5 h-5" />
        </div>
        <div>
          <h4 className="font-bold text-slate-900 text-sm">Cập nhật hệ thống: Đợt phát triển tiếp theo</h4>
          <p className="text-xs text-slate-600 leading-relaxed mt-1">
            Các tính năng thông báo tự động, tích hợp mạng xã hội và các dịch vụ bên thứ ba tạm thời được ẩn để bảo trì và nâng cấp. Chúng tôi đang thiết kế một trải nghiệm hoàn toàn mới chuẩn bị ra mắt trong đợt cập nhật lớn sắp tới.
          </p>
        </div>
      </div>
    </div>
  );
}
