import React, { useState, useEffect } from 'react';
import { User, SystemNotification } from '../types';
import { db, handleFirestoreError, OperationType } from '../firebase';
import { collection, onSnapshot, setDoc, doc, deleteDoc } from 'firebase/firestore';
import { BellRing, Plus, Trash2, Search, Sparkles, Check, Clock, Shield, Award, BookOpen, Volume2 } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface NotificationsManagerViewProps {
  user: User;
}

export function NotificationsManagerView({ user }: NotificationsManagerViewProps) {
  const isAdmin = user.role === 'admin';
  const isTeacher = user.role === 'teacher' || isAdmin;

  const [notifList, setNotifList] = useState<SystemNotification[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Form State
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [type, setType] = useState<'system_update' | 'badge_info' | 'class_reminder' | 'announcement'>(
    isAdmin ? 'system_update' : 'badge_info'
  );
  const [badge, setBadge] = useState(isAdmin ? '🎉 Cập nhật' : '🏆 Huy hiệu');
  const [badgeColor, setBadgeColor] = useState(isAdmin ? 'emerald' : 'indigo');
  const [publishing, setPublishing] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  useEffect(() => {
    // Listen to notifications
    const unsub = onSnapshot(
      collection(db, 'system_notifications'),
      (snapshot) => {
        const list: SystemNotification[] = [];
        snapshot.forEach((docSnap) => {
          list.push(docSnap.data() as SystemNotification);
        });
        list.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
        setNotifList(list);
        setLoading(false);
      },
      (err) => {
        console.error(err);
        setLoading(false);
      }
    );

    return () => unsub();
  }, []);

  const handlePublish = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !content.trim()) {
      setMessage({ type: 'error', text: 'Vui lòng điền đầy đủ tiêu đề và nội dung thông báo!' });
      return;
    }

    setPublishing(true);
    setMessage(null);

    try {
      const newNotif: SystemNotification = {
        id: 'notif_' + Date.now(),
        title: title.trim(),
        content: content.trim(),
        type,
        badge: badge.trim(),
        badgeColor,
        createdAt: new Date().toISOString(),
      };

      await setDoc(doc(db, 'system_notifications', newNotif.id), newNotif);
      
      setMessage({ type: 'success', text: 'Xuất bản thông báo thành công!' });
      setTitle('');
      setContent('');
      
      // Auto-set matching badge defaults for clean experience
      if (isAdmin) {
        setType('system_update');
        setBadge('🎉 Cập nhật');
        setBadgeColor('emerald');
      } else {
        setType('badge_info');
        setBadge('🏆 Huy hiệu');
        setBadgeColor('indigo');
      }
    } catch (err: any) {
      console.error(err);
      setMessage({ type: 'error', text: `Lỗi xuất bản: ${err.message || 'Lỗi hệ thống'}` });
    } finally {
      setPublishing(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('Bạn có chắc chắn muốn xóa thông báo này?')) return;
    try {
      await deleteDoc(doc(db, 'system_notifications', id));
      setMessage({ type: 'success', text: 'Đã xóa thông báo thành công.' });
    } catch (err: any) {
      console.error(err);
      setMessage({ type: 'error', text: `Lỗi khi xóa: ${err.message}` });
    }
  };

  const selectPreset = (preset: { title: string; content: string; type: any; badge: string; badgeColor: string }) => {
    setTitle(preset.title);
    setContent(preset.content);
    setType(preset.type);
    setBadge(preset.badge);
    setBadgeColor(preset.badgeColor);
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-10 px-4 md:px-0">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-900 tracking-tight">Quản lý Bảng thông báo</h2>
          <p className="text-slate-500 text-sm mt-0.5">
            {isAdmin 
              ? 'Tạo cập nhật hệ thống, báo điểm số, huy hiệu hoặc gửi thông báo chung đến bảng tin của học sinh.' 
              : 'Gửi thông báo bài tập đã chấm, cập nhật điểm, huy hiệu học tập hoặc gửi lời nhắc nhở.'}
          </p>
        </div>
      </div>

      {message && (
        <div className={`p-4 rounded-2xl border text-xs font-bold flex items-center gap-2 ${
          message.type === 'success' 
            ? 'bg-emerald-50 border-emerald-200 text-emerald-800' 
            : 'bg-rose-50 border-rose-200 text-rose-800'
        }`}>
          <Check className="w-4 h-4 shrink-0" />
          <span>{message.text}</span>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Create Form */}
        <div className="lg:col-span-1 bg-white p-6 rounded-3xl border border-slate-200 shadow-sm space-y-6">
          <div>
            <h3 className="text-lg font-black text-slate-900 flex items-center gap-2">
              <BellRing className="w-5 h-5 text-indigo-600" />
              Đăng thông báo mới
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">Soạn thảo và đẩy thông báo xuống bảng tin học sinh tức thì</p>
          </div>

          {/* Quick presets depending on role */}
          <div className="space-y-2">
            <label className="block text-xs font-bold text-slate-500 uppercase">Mẫu thông báo nhanh:</label>
            <div className="flex flex-wrap gap-1.5">
              {isAdmin && (
                <button
                  type="button"
                  onClick={() => selectPreset({
                    title: 'Cập nhật hệ thống thành công',
                    content: 'Đã tối ưu hóa tốc độ tải và cải tiến giao diện tương tác Game của học sinh!',
                    type: 'system_update',
                    badge: '🎉 Cập nhật',
                    badgeColor: 'emerald'
                  })}
                  className="px-2.5 py-1.5 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 text-[11px] font-bold text-emerald-800 rounded-lg transition-all"
                >
                  🎉 Hệ thống (Admin)
                </button>
              )}

              <button
                type="button"
                onClick={() => selectPreset({
                  title: 'Đã hoàn tất chấm điểm bài tập',
                  content: 'Cô đã chấm điểm và phản hồi chi tiết các bài tập nộp gần nhất. Các em vào kiểm tra nhé!',
                  type: 'class_reminder',
                  badge: '📝 Chấm bài',
                  badgeColor: 'amber'
                })}
                className="px-2.5 py-1.5 bg-amber-50 hover:bg-amber-100 border border-amber-200 text-[11px] font-bold text-amber-800 rounded-lg transition-all"
              >
                📝 Báo bài tập đã chấm
              </button>

              <button
                type="button"
                onClick={() => selectPreset({
                  title: 'Cập nhật Huy hiệu & Điểm thi đua',
                  content: 'Cực kỳ bùng nổ! Nhiều bạn đã thăng cấp Huy hiệu lên Chiến binh Chăm chỉ tuần này. Hãy tiếp tục cố gắng!',
                  type: 'badge_info',
                  badge: '🏆 Huy hiệu',
                  badgeColor: 'indigo'
                })}
                className="px-2.5 py-1.5 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 text-[11px] font-bold text-indigo-800 rounded-lg transition-all"
              >
                🏆 Điểm & Huy hiệu
              </button>
            </div>
          </div>

          <form onSubmit={handlePublish} className="space-y-4">
            <div className="space-y-1">
              <label className="block text-xs font-bold text-slate-500 uppercase">Tiêu đề thông báo</label>
              <input
                type="text"
                required
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Nhập tiêu đề..."
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs font-medium focus:ring-2 focus:ring-indigo-500 focus:outline-none"
              />
            </div>

            <div className="space-y-1">
              <label className="block text-xs font-bold text-slate-500 uppercase">Nội dung chi tiết</label>
              <textarea
                required
                rows={4}
                value={content}
                onChange={(e) => setContent(e.target.value)}
                placeholder="Nhập nội dung thông báo..."
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs font-medium focus:ring-2 focus:ring-indigo-500 focus:outline-none resize-none"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="block text-xs font-bold text-slate-500 uppercase">Loại thông báo</label>
                <select
                  value={type}
                  onChange={(e) => {
                    const selectedVal = e.target.value as any;
                    setType(selectedVal);
                    // Match default colors and badges automatically to make it easy
                    if (selectedVal === 'system_update') {
                      setBadge('🎉 Cập nhật');
                      setBadgeColor('emerald');
                    } else if (selectedVal === 'badge_info') {
                      setBadge('🏆 Huy hiệu');
                      setBadgeColor('indigo');
                    } else if (selectedVal === 'class_reminder') {
                      setBadge('📝 Chấm bài');
                      setBadgeColor('amber');
                    } else {
                      setBadge('📢 Thông báo');
                      setBadgeColor('slate');
                    }
                  }}
                  className="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-xs font-bold focus:ring-2 focus:ring-indigo-500 focus:outline-none text-slate-700 bg-white"
                >
                  {isAdmin && <option value="system_update">⚙️ Cập nhật hệ thống</option>}
                  <option value="badge_info">🏆 Điểm số & Huy hiệu</option>
                  <option value="class_reminder">📝 Báo bài tập đã chấm</option>
                  <option value="announcement">📢 Thông báo chung</option>
                </select>
              </div>

              <div className="space-y-1">
                <label className="block text-xs font-bold text-slate-500 uppercase">Màu sắc Thẻ</label>
                <select
                  value={badgeColor}
                  onChange={(e) => setBadgeColor(e.target.value)}
                  className="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-xs font-bold focus:ring-2 focus:ring-indigo-500 focus:outline-none text-slate-700 bg-white"
                >
                  <option value="emerald">🟢 Emerald (Xanh lục)</option>
                  <option value="indigo">🔵 Indigo (Xanh dương)</option>
                  <option value="amber">🟡 Amber (Vàng nhạt)</option>
                  <option value="slate">⚪ Gray (Màu xám)</option>
                </select>
              </div>
            </div>

            <div className="space-y-1">
              <label className="block text-xs font-bold text-slate-500 uppercase">Badge (Biểu tượng & chữ)</label>
              <input
                type="text"
                required
                value={badge}
                onChange={(e) => setBadge(e.target.value)}
                placeholder="Ví dụ: 🎉 Cập nhật"
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs font-medium focus:ring-2 focus:ring-indigo-500 focus:outline-none"
              />
            </div>

            <button
              type="submit"
              disabled={publishing}
              className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-xl transition-all shadow-md flex items-center justify-center gap-1.5"
            >
              {publishing ? 'Đang gửi...' : 'Xuất bản thông báo'}
            </button>
          </form>
        </div>

        {/* List of Existing Notifications */}
        <div className="lg:col-span-2 bg-white p-6 rounded-3xl border border-slate-200 shadow-sm space-y-4">
          <div>
            <h3 className="text-lg font-black text-slate-900 flex items-center gap-2">
              <Search className="w-5 h-5 text-indigo-600" />
              Thông báo đang hoạt động ({notifList.length})
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">Danh sách các thông báo được lưu trữ và đồng bộ hóa thời gian thực</p>
          </div>

          {loading ? (
            <div className="text-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600 mx-auto" />
              <p className="text-xs text-slate-400 mt-2">Đang tải danh sách...</p>
            </div>
          ) : notifList.length === 0 ? (
            <div className="text-center py-16 bg-slate-50 border border-dashed border-slate-200 rounded-3xl">
              <BellRing className="w-10 h-10 text-slate-300 mx-auto mb-2" />
              <p className="text-sm font-bold text-slate-500">Chưa có thông báo nào được tạo</p>
              <p className="text-xs text-slate-400 mt-1">Hãy soạn và gửi thông báo đầu tiên bằng bảng biểu bên trái.</p>
            </div>
          ) : (
            <div className="space-y-3 max-h-[550px] overflow-y-auto pr-1 overflow-x-hidden">
              <AnimatePresence initial={false}>
                {notifList.map((notif) => {
                  const badgeEmoji = notif.badge?.split(' ')[0] || '📢';
                  
                  let bgCol = "bg-slate-50 border-slate-100 text-slate-600";
                  let IconRef = Volume2;

                  if (notif.type === "system_update" || notif.badgeColor === "emerald") {
                    bgCol = "bg-emerald-50 border-emerald-100 text-emerald-600";
                    IconRef = Shield;
                  } else if (notif.type === "badge_info" || notif.badgeColor === "indigo") {
                    bgCol = "bg-indigo-50 border-indigo-100 text-indigo-600";
                    IconRef = Award;
                  } else if (notif.type === "class_reminder" || notif.badgeColor === "amber") {
                    bgCol = "bg-amber-50 border-amber-100 text-amber-600";
                    IconRef = BookOpen;
                  }

                  return (
                    <motion.div
                      key={notif.id}
                      layout
                      initial={{ opacity: 0, y: 15, scale: 0.98 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, x: -30, scale: 0.95, transition: { duration: 0.2 } }}
                      transition={{ type: "spring", stiffness: 500, damping: 40 }}
                      className="p-4 bg-slate-50/50 hover:bg-slate-50 border border-slate-200/80 rounded-2xl flex items-start gap-4 transition-all group"
                    >
                      <div className={`w-10 h-10 rounded-xl ${bgCol} border flex items-center justify-center font-bold text-lg shrink-0 mt-0.5`}>
                        <IconRef className="w-5 h-5" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-4">
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="text-[10px] bg-slate-200/60 border border-slate-300/40 text-slate-700 px-2 py-0.5 rounded-md font-bold">
                                {notif.badge}
                              </span>
                              {notif.type === 'system_update' && (
                                <span className="text-[10px] bg-indigo-50 text-indigo-700 px-2 py-0.5 rounded-md font-black">
                                  ADMIN
                                </span>
                              )}
                            </div>
                            <h4 className="font-bold text-slate-900 text-sm mt-1.5">{notif.title}</h4>
                            <p className="text-xs text-slate-500 mt-0.5 font-medium leading-relaxed break-words">{notif.content}</p>
                          </div>
                          <button
                            type="button"
                            onClick={() => handleDelete(notif.id)}
                            className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-all"
                            title="Xóa thông báo"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                        <div className="flex items-center gap-3 mt-3 border-t border-slate-100 pt-2.5">
                          <span className="text-[10px] text-slate-400 font-semibold flex items-center gap-1">
                            <Clock className="w-3.5 h-3.5" />
                            {new Date(notif.createdAt).toLocaleString('vi-VN')}
                          </span>
                        </div>
                      </div>
                    </motion.div>
                  );
                })}
              </AnimatePresence>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
