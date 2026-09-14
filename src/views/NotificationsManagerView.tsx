import React, { useState, useEffect, useMemo } from 'react';
import { User, SystemNotification, LoveLetter } from '../types';
import { db, handleFirestoreError, OperationType } from '../firebase';
import { collection, onSnapshot, setDoc, doc, deleteDoc, updateDoc } from 'firebase/firestore';
import { 
  BellRing, 
  Plus, 
  Trash2, 
  Search, 
  Sparkles, 
  Check, 
  Clock, 
  Shield, 
  Award, 
  BookOpen, 
  Volume2, 
  Heart, 
  Mail, 
  Radio, 
  Edit2, 
  CheckSquare, 
  Square, 
  X, 
  Filter, 
  Layers, 
  Wifi, 
  Tv, 
  Users, 
  ChevronRight,
  AlertCircle
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { NotificationListSkeleton } from '../components/Skeletons';
import { LoveLetterManager } from '../components/LoveLetterManager';
import { CustomSelect } from '../components/CustomSelect';
import { ConfirmModal } from '../components/ConfirmModal';

interface NotificationsManagerViewProps {
  user: User;
  loveLetters?: LoveLetter[];
  usersList?: User[];
  classesList?: string[];
}

export function NotificationsManagerView({ user, loveLetters = [], usersList = [], classesList = [] }: NotificationsManagerViewProps) {
  const isAdmin = user.role === 'admin';
  const isTeacher = user.role === 'teacher' || isAdmin;

  const [activeSubTab, setActiveSubTab] = useState<'notifications' | 'letters'>('notifications');
  const [notifList, setNotifList] = useState<SystemNotification[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Selection State
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  
  // Filter & Search State
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState<string>('all');

  // Create Form State
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [type, setType] = useState<'system_update' | 'badge_info' | 'class_reminder' | 'announcement'>(
    isAdmin ? 'system_update' : 'badge_info'
  );
  const [badge, setBadge] = useState(isAdmin ? '🎉 Cập nhật' : '🏆 Huy hiệu');
  const [badgeColor, setBadgeColor] = useState(isAdmin ? 'emerald' : 'indigo');
  const [targetScope, setTargetScope] = useState<'all' | 'class'>('all');
  const [targetClass, setTargetClass] = useState('');
  const [isOnAir, setIsOnAir] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Edit Modal State
  const [editingNotif, setEditingNotif] = useState<SystemNotification | null>(null);
  const [editTitle, setEditTitle] = useState('');
  const [editContent, setEditContent] = useState('');
  const [editType, setEditType] = useState<'system_update' | 'badge_info' | 'class_reminder' | 'announcement'>('announcement');
  const [editBadge, setEditBadge] = useState('');
  const [editBadgeColor, setEditBadgeColor] = useState('indigo');
  const [editTargetScope, setEditTargetScope] = useState<'all' | 'class'>('all');
  const [editTargetClass, setEditTargetClass] = useState('');
  const [editIsOnAir, setEditIsOnAir] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);

  // Confirm Delete Modal State
  const [confirmDelete, setConfirmDelete] = useState<{
    isOpen: boolean;
    ids: string[];
    title: string;
    message: string;
  }>({
    isOpen: false,
    ids: [],
    title: '',
    message: ''
  });

  useEffect(() => {
    if (classesList.length > 0 && !targetClass) {
      setTargetClass(classesList[0]);
    }
  }, [classesList, targetClass]);

  const showNotify = (type: 'success' | 'error' | 'info', msg: string) => {
    setMessage({ type: type === 'info' ? 'success' : type, text: msg });
  };

  useEffect(() => {
    // Listen to notifications in real-time
    const unsub = onSnapshot(
      collection(db, 'system_notifications'),
      (snapshot) => {
        const list: SystemNotification[] = [];
        snapshot.forEach((docSnap) => {
          const data = docSnap.data() as SystemNotification;
          if (!data.targetStudentId) {
            list.push(data);
          }
        });
        // Sort: On-Air first, then newest createdAt
        list.sort((a, b) => {
          if (a.isOnAir && !b.isOnAir) return -1;
          if (!a.isOnAir && b.isOnAir) return 1;
          return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
        });
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

  // Filtered Notifications
  const filteredNotifications = useMemo(() => {
    return notifList.filter((item) => {
      // Search query filter
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchTitle = item.title?.toLowerCase().includes(q);
        const matchContent = item.content?.toLowerCase().includes(q);
        const matchBadge = item.badge?.toLowerCase().includes(q);
        const matchClass = item.targetClass?.toLowerCase().includes(q);
        if (!matchTitle && !matchContent && !matchBadge && !matchClass) return false;
      }

      // Type / On Air filter
      if (filterType === 'on_air') {
        return !!item.isOnAir;
      }
      if (filterType !== 'all') {
        return item.type === filterType;
      }

      return true;
    });
  }, [notifList, searchQuery, filterType]);

  const onAirCount = useMemo(() => {
    return notifList.filter(n => n.isOnAir).length;
  }, [notifList]);

  // Selection Handlers
  const handleToggleSelect = (id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const handleSelectAll = () => {
    if (selectedIds.size === filteredNotifications.length && filteredNotifications.length > 0) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filteredNotifications.map(n => n.id)));
    }
  };

  const handleClearSelection = () => {
    setSelectedIds(new Set());
  };

  // Toggle ON AIR for single item
  const handleToggleOnAir = async (notif: SystemNotification) => {
    const newStatus = !notif.isOnAir;
    try {
      await setDoc(doc(db, 'system_notifications', notif.id), {
        ...notif,
        isOnAir: newStatus
      }, { merge: true });

      showNotify(
        'success', 
        newStatus 
          ? `🔴 Đã BẬT ON AIR phát sóng trực tiếp cho "${notif.title}"!` 
          : `⚪ Đã TẮT ON AIR cho "${notif.title}".`
      );
    } catch (err: any) {
      console.error(err);
      showNotify('error', `Lỗi cập nhật ON AIR: ${err.message}`);
    }
  };

  // Bulk toggle ON AIR
  const handleBulkOnAir = async (turnOn: boolean) => {
    if (selectedIds.size === 0) return;
    try {
      const promises = Array.from(selectedIds).map(id => {
        const notif = notifList.find(n => n.id === id);
        if (!notif) return Promise.resolve();
        return setDoc(doc(db, 'system_notifications', id), {
          ...notif,
          isOnAir: turnOn
        }, { merge: true });
      });

      await Promise.all(promises);
      showNotify(
        'success', 
        turnOn 
          ? `🔴 Đã BẬT ON AIR cho ${selectedIds.size} thông báo đã chọn!` 
          : `⚪ Đã TẮT ON AIR cho ${selectedIds.size} thông báo đã chọn!`
      );
      setSelectedIds(new Set());
    } catch (err: any) {
      console.error(err);
      showNotify('error', `Lỗi thao tác hàng loạt: ${err.message}`);
    }
  };

  // Open Edit Modal
  const handleOpenEdit = (notif: SystemNotification) => {
    setEditingNotif(notif);
    setEditTitle(notif.title);
    setEditContent(notif.content);
    const validTypes: ('system_update' | 'badge_info' | 'class_reminder' | 'announcement')[] = ['system_update', 'badge_info', 'class_reminder', 'announcement'];
    setEditType(validTypes.includes(notif.type as any) ? (notif.type as any) : 'announcement');
    setEditBadge(notif.badge || '📢 Thông báo');
    setEditBadgeColor(notif.badgeColor || 'indigo');
    setEditTargetScope(notif.targetScope === 'class' ? 'class' : 'all');
    setEditTargetClass(notif.targetClass || (classesList[0] || ''));
    setEditIsOnAir(!!notif.isOnAir);
  };

  // Save Edit
  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingNotif) return;
    if (!editTitle.trim() || !editContent.trim()) {
      showNotify('error', 'Vui lòng điền đầy đủ tiêu đề và nội dung thông báo!');
      return;
    }

    setIsUpdating(true);
    try {
      const updatedNotif: SystemNotification = {
        ...editingNotif,
        title: editTitle.trim(),
        content: editContent.trim(),
        type: editType,
        badge: editBadge.trim(),
        badgeColor: editBadgeColor,
        targetScope: editTargetScope,
        targetClass: editTargetScope === 'class' ? editTargetClass : '',
        isOnAir: editIsOnAir
      };

      await setDoc(doc(db, 'system_notifications', editingNotif.id), updatedNotif, { merge: true });
      showNotify('success', 'Đã lưu thay đổi thông báo thành công!');
      setEditingNotif(null);
    } catch (err: any) {
      console.error(err);
      showNotify('error', `Lỗi khi lưu thông báo: ${err.message}`);
    } finally {
      setIsUpdating(false);
    }
  };

  // Confirm Single Delete
  const handleRequestDeleteSingle = (notif: SystemNotification) => {
    setConfirmDelete({
      isOpen: true,
      ids: [notif.id],
      title: 'Xác nhận xóa thông báo',
      message: `Bạn có chắc chắn muốn xóa thông báo "${notif.title}" không? Thao tác này không thể hoàn tác.`
    });
  };

  // Confirm Bulk Delete
  const handleRequestDeleteBulk = () => {
    if (selectedIds.size === 0) return;
    setConfirmDelete({
      isOpen: true,
      ids: Array.from(selectedIds),
      title: 'Xác nhận xóa hàng loạt',
      message: `Bạn có chắc chắn muốn xóa ${selectedIds.size} thông báo đã chọn không? Thao tác này sẽ xóa vĩnh viễn khỏi hệ thống.`
    });
  };

  // Execute Delete
  const handleExecuteDelete = async () => {
    if (confirmDelete.ids.length === 0) return;
    try {
      const promises = confirmDelete.ids.map(id => deleteDoc(doc(db, 'system_notifications', id)));
      await Promise.all(promises);
      
      showNotify('success', `Đã xóa thành công ${confirmDelete.ids.length} thông báo.`);
      setSelectedIds(prev => {
        const next = new Set(prev);
        confirmDelete.ids.forEach(id => next.delete(id));
        return next;
      });
      setConfirmDelete({ isOpen: false, ids: [], title: '', message: '' });
    } catch (err: any) {
      console.error(err);
      showNotify('error', `Lỗi khi xóa: ${err.message}`);
    }
  };

  // Publish New Notification
  const handlePublish = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !content.trim()) {
      showNotify('error', 'Vui lòng điền đầy đủ tiêu đề và nội dung thông báo!');
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
        targetScope,
        targetClass: targetScope === 'class' ? targetClass : '',
        teacherId: user.id,
        isOnAir
      };

      await setDoc(doc(db, 'system_notifications', newNotif.id), newNotif);
      
      showNotify('success', isOnAir ? '🔴 Đã xuất bản và PHÁT SÓNG ON AIR thông báo thành công!' : 'Xuất bản thông báo thành công!');
      setTitle('');
      setContent('');
      setIsOnAir(false);
      
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
      showNotify('error', `Lỗi xuất bản: ${err.message || 'Lỗi hệ thống'}`);
    } finally {
      setPublishing(false);
    }
  };

  const selectPreset = (preset: { title: string; content: string; type: any; badge: string; badgeColor: string }) => {
    setTitle(preset.title);
    setContent(preset.content);
    setType(preset.type);
    setBadge(preset.badge);
    setBadgeColor(preset.badgeColor);
  };

  // Notification Type Options for CustomSelect
  const notificationTypeOptions = useMemo(() => {
    const opts = [
      { value: 'announcement', label: 'Thông báo chung', icon: <Volume2 className="w-4 h-4 text-slate-600" /> },
      { value: 'class_reminder', label: 'Báo bài tập đã chấm', icon: <BookOpen className="w-4 h-4 text-amber-600" /> },
      { value: 'badge_info', label: 'Điểm số & Huy hiệu', icon: <Award className="w-4 h-4 text-indigo-600" /> },
    ];
    if (isAdmin) {
      opts.unshift({ value: 'system_update', label: 'Cập nhật hệ thống', icon: <Shield className="w-4 h-4 text-emerald-600" /> });
    }
    return opts;
  }, [isAdmin]);

  // Badge Color Options for CustomSelect
  const badgeColorOptions = [
    { value: 'emerald', label: 'Emerald (Xanh lục)', icon: <span className="w-3.5 h-3.5 rounded-full bg-emerald-500 inline-block shrink-0 shadow-2xs" /> },
    { value: 'indigo', label: 'Indigo (Xanh dương)', icon: <span className="w-3.5 h-3.5 rounded-full bg-indigo-500 inline-block shrink-0 shadow-2xs" /> },
    { value: 'amber', label: 'Amber (Vàng cam)', icon: <span className="w-3.5 h-3.5 rounded-full bg-amber-500 inline-block shrink-0 shadow-2xs" /> },
    { value: 'rose', label: 'Rose (Đỏ rực)', icon: <span className="w-3.5 h-3.5 rounded-full bg-rose-500 inline-block shrink-0 shadow-2xs" /> },
    { value: 'slate', label: 'Gray (Màu xám)', icon: <span className="w-3.5 h-3.5 rounded-full bg-slate-400 inline-block shrink-0 shadow-2xs" /> },
  ];

  // Class Options for CustomSelect
  const classSelectOptions = useMemo(() => {
    return classesList.map(cls => ({
      value: cls,
      label: cls.startsWith('Lớp') || cls.startsWith('lop') ? cls : `Lớp ${cls}`
    }));
  }, [classesList]);

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-10 px-4 md:px-0">
      
      {/* Header & Navigation Subtabs */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-slate-200 pb-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
            Trung Tâm Truyền Thông & Thư Nhắn
            {onAirCount > 0 && (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-black bg-rose-50 text-rose-700 border border-rose-200 animate-pulse">
                <span className="w-2 h-2 rounded-full bg-rose-600 animate-ping"></span>
                {onAirCount} ON AIR
              </span>
            )}
          </h2>
          <p className="text-slate-500 text-sm mt-0.5">
            {isAdmin 
              ? 'Tạo thông báo bảng tin, phát sóng On Air trực tiếp, hoặc gửi thư phong bì đến học sinh & giáo viên.' 
              : 'Gửi thông báo bài tập, huy hiệu, phát sóng On Air hoặc soạn bức thư phong bì chào mừng học sinh.'}
          </p>
        </div>

        {/* Subtab Buttons */}
        <div className="flex items-center gap-2 p-1.5 bg-slate-100 rounded-2xl border border-slate-200/80">
          <button
            onClick={() => setActiveSubTab('notifications')}
            className={`px-4 py-2 rounded-xl text-xs font-black transition-all flex items-center gap-2 ${
              activeSubTab === 'notifications'
                ? 'bg-white text-indigo-700 shadow-sm'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <BellRing className="w-4 h-4 text-indigo-600" />
            <span>Thông Báo Bảng Tin ({notifList.length})</span>
          </button>

          <button
            onClick={() => setActiveSubTab('letters')}
            className={`px-4 py-2 rounded-xl text-xs font-black transition-all flex items-center gap-2 ${
              activeSubTab === 'letters'
                ? 'bg-white text-rose-700 shadow-sm'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Heart className="w-4 h-4 text-rose-500 fill-rose-100" />
            <span>Thư Yêu Thương ({loveLetters.length})</span>
          </button>
        </div>
      </div>

      {message && (
        <div className={`p-4 rounded-2xl border text-xs font-bold flex items-center justify-between gap-2 transition-all ${
          message.type === 'success' 
            ? 'bg-emerald-50 border-emerald-200 text-emerald-800' 
            : 'bg-rose-50 border-rose-200 text-rose-800'
        }`}>
          <div className="flex items-center gap-2">
            <Check className="w-4 h-4 shrink-0" />
            <span>{message.text}</span>
          </div>
          <button 
            type="button" 
            onClick={() => setMessage(null)}
            className="p-1 hover:bg-black/5 rounded-lg text-slate-500"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {activeSubTab === 'letters' ? (
        <LoveLetterManager
          currentUser={user}
          letters={loveLetters}
          usersList={usersList}
          classesList={classesList}
          showNotify={showNotify}
        />
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          
          {/* Create Form (Left column - 4.5 cols) */}
          <div className="lg:col-span-5 bg-white p-6 rounded-3xl border border-slate-200 shadow-sm space-y-6">
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
                <label className="block text-xs font-bold text-slate-600 uppercase">Tiêu đề thông báo *</label>
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
                <label className="block text-xs font-bold text-slate-600 uppercase">Nội dung chi tiết *</label>
                <textarea
                  required
                  rows={4}
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  placeholder="Nhập nội dung thông báo..."
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs font-medium focus:ring-2 focus:ring-indigo-500 focus:outline-none resize-none"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="block text-xs font-bold text-slate-600 uppercase">Loại thông báo</label>
                  <CustomSelect
                    value={type}
                    onChange={(val) => {
                      const selectedVal = val as any;
                      setType(selectedVal);
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
                    options={notificationTypeOptions}
                    size="md"
                  />
                </div>

                <div className="space-y-1">
                  <label className="block text-xs font-bold text-slate-600 uppercase">Màu sắc Thẻ</label>
                  <CustomSelect
                    value={badgeColor}
                    onChange={(val) => setBadgeColor(val)}
                    options={badgeColorOptions}
                    size="md"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="block text-xs font-bold text-slate-600 uppercase">Badge (Biểu tượng & chữ)</label>
                <input
                  type="text"
                  required
                  value={badge}
                  onChange={(e) => setBadge(e.target.value)}
                  placeholder="Ví dụ: 🎉 Cập nhật"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs font-medium focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                />
              </div>

              {/* Target Audience Area */}
              <div className="bg-slate-50/70 p-4 rounded-2xl border border-slate-200/80 space-y-3">
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
                  🎯 Đối tượng nhận thông báo
                </label>
                
                {isAdmin ? (
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => setTargetScope('all')}
                      className={`py-2 px-3 rounded-xl text-xs font-black border transition-all text-center ${
                        targetScope === 'all'
                          ? 'bg-indigo-600 border-indigo-600 text-white shadow-sm'
                          : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                      }`}
                    >
                      🌐 Toàn hệ thống
                    </button>
                    <button
                      type="button"
                      onClick={() => setTargetScope('class')}
                      className={`py-2 px-3 rounded-xl text-xs font-black border transition-all text-center ${
                        targetScope === 'class'
                          ? 'bg-indigo-600 border-indigo-600 text-white shadow-sm'
                          : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                      }`}
                    >
                      🏫 Chọn Lớp Cụ Thể
                    </button>
                  </div>
                ) : (
                  <div className="text-xs text-indigo-700 font-bold bg-indigo-50 p-2.5 rounded-xl border border-indigo-100 flex items-center gap-1.5">
                    <Shield className="w-4 h-4 shrink-0" />
                    <span>Giáo viên gửi thông báo đến lớp học của mình</span>
                  </div>
                )}

                {(targetScope === 'class' || !isAdmin) && (
                  <div className="space-y-1 mt-2">
                    <label className="block text-[10px] font-bold text-slate-500 uppercase">
                      Chọn lớp học nhận tin:
                    </label>
                    {classesList.length > 0 ? (
                      <CustomSelect
                        value={targetClass}
                        onChange={(val) => setTargetClass(val)}
                        options={classSelectOptions}
                        size="md"
                      />
                    ) : (
                      <input
                        type="text"
                        required
                        value={targetClass}
                        onChange={(e) => setTargetClass(e.target.value)}
                        placeholder="Nhập tên lớp học (ví dụ: 12A1)..."
                        className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs font-medium focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                      />
                    )}
                  </div>
                )}
              </div>

              {/* ON AIR Switch in Create Form */}
              <div className="p-3.5 rounded-2xl bg-gradient-to-r from-rose-50 to-amber-50 border border-rose-200/80 flex items-center justify-between gap-3">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-xl bg-rose-600 text-white flex items-center justify-center font-bold shrink-0 shadow-sm shadow-rose-200">
                    <Radio className="w-4 h-4 animate-pulse" />
                  </div>
                  <div>
                    <div className="flex items-center gap-1.5">
                      <span className="text-xs font-black text-rose-950">Phát sóng trực tiếp (ON AIR)</span>
                      <span className="text-[9px] font-black uppercase tracking-wider px-1.5 py-0.2 bg-rose-200 text-rose-800 rounded">Live</span>
                    </div>
                    <p className="text-[10px] text-rose-700 font-medium leading-tight mt-0.5">
                      Ghim thông báo lên đầu và làm nổi bật tức thì
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setIsOnAir(!isOnAir)}
                  className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                    isOnAir ? 'bg-rose-600' : 'bg-slate-300'
                  }`}
                  role="switch"
                  aria-checked={isOnAir}
                >
                  <span
                    aria-hidden="true"
                    className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-md ring-0 transition duration-200 ease-in-out ${
                      isOnAir ? 'translate-x-5' : 'translate-x-0'
                    }`}
                  />
                </button>
              </div>

              <button
                type="submit"
                disabled={publishing}
                className={`w-full py-3 text-white font-extrabold text-xs rounded-xl transition-all shadow-md flex items-center justify-center gap-2 ${
                  isOnAir 
                    ? 'bg-rose-600 hover:bg-rose-700 shadow-rose-200' 
                    : 'bg-indigo-600 hover:bg-indigo-700 shadow-indigo-200'
                }`}
              >
                {publishing ? (
                  <span>Đang xử lý...</span>
                ) : isOnAir ? (
                  <>
                    <Radio className="w-4 h-4 animate-pulse" />
                    <span>Xuất bản & Phát sóng ON AIR ngay</span>
                  </>
                ) : (
                  <>
                    <Plus className="w-4 h-4" />
                    <span>Xuất bản thông báo</span>
                  </>
                )}
              </button>
            </form>
          </div>

          {/* List of Existing Notifications (Right column - 7.5 cols) */}
          <div className="lg:col-span-7 bg-white p-6 rounded-3xl border border-slate-200 shadow-sm space-y-4">
            
            {/* Header with Search & Filter */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-4">
              <div>
                <h3 className="text-lg font-black text-slate-900 flex items-center gap-2">
                  <Search className="w-5 h-5 text-indigo-600" />
                  Thông báo đang hoạt động ({notifList.length})
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">Danh sách các thông báo được lưu trữ và đồng bộ hóa thời gian thực</p>
              </div>

              {/* Master Select All Checkbox */}
              {notifList.length > 0 && (
                <button
                  type="button"
                  onClick={handleSelectAll}
                  className="self-start sm:self-auto px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl flex items-center gap-1.5 transition-all"
                >
                  {selectedIds.size === filteredNotifications.length && filteredNotifications.length > 0 ? (
                    <>
                      <CheckSquare className="w-4 h-4 text-indigo-600" />
                      <span>Bỏ chọn tất cả ({selectedIds.size})</span>
                    </>
                  ) : (
                    <>
                      <Square className="w-4 h-4 text-slate-500" />
                      <span>Chọn tất cả ({filteredNotifications.length})</span>
                    </>
                  )}
                </button>
              )}
            </div>

            {/* Filter Tabs & Search Bar */}
            <div className="space-y-3">
              <div className="relative">
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Tìm kiếm theo tiêu đề, nội dung, lớp học..."
                  className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 focus:bg-white outline-none transition-all"
                />
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                {searchQuery && (
                  <button
                    onClick={() => setSearchQuery('')}
                    className="p-1 hover:bg-slate-200 rounded-md text-slate-400 absolute right-2.5 top-1/2 -translate-y-1/2"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>

              {/* Quick Filter Pills */}
              <div className="flex flex-wrap items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => setFilterType('all')}
                  className={`px-3 py-1 text-xs font-bold rounded-xl transition-all ${
                    filterType === 'all'
                      ? 'bg-slate-900 text-white shadow-sm'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  Tất cả ({notifList.length})
                </button>

                <button
                  type="button"
                  onClick={() => setFilterType('on_air')}
                  className={`px-3 py-1 text-xs font-bold rounded-xl transition-all flex items-center gap-1.5 ${
                    filterType === 'on_air'
                      ? 'bg-rose-600 text-white shadow-sm shadow-rose-200'
                      : 'bg-rose-50 text-rose-700 hover:bg-rose-100 border border-rose-200/60'
                  }`}
                >
                  <span className={`w-2 h-2 rounded-full ${filterType === 'on_air' ? 'bg-white' : 'bg-rose-600'} animate-ping`}></span>
                  <span>🔴 Đang ON AIR ({onAirCount})</span>
                </button>

                <button
                  type="button"
                  onClick={() => setFilterType('class_reminder')}
                  className={`px-3 py-1 text-xs font-bold rounded-xl transition-all ${
                    filterType === 'class_reminder'
                      ? 'bg-amber-500 text-white shadow-sm'
                      : 'bg-amber-50 text-amber-800 hover:bg-amber-100 border border-amber-200/60'
                  }`}
                >
                  📝 Chấm bài
                </button>

                <button
                  type="button"
                  onClick={() => setFilterType('badge_info')}
                  className={`px-3 py-1 text-xs font-bold rounded-xl transition-all ${
                    filterType === 'badge_info'
                      ? 'bg-indigo-600 text-white shadow-sm'
                      : 'bg-indigo-50 text-indigo-700 hover:bg-indigo-100 border border-indigo-200/60'
                  }`}
                >
                  🏆 Huy hiệu
                </button>

                {isAdmin && (
                  <button
                    type="button"
                    onClick={() => setFilterType('system_update')}
                    className={`px-3 py-1 text-xs font-bold rounded-xl transition-all ${
                      filterType === 'system_update'
                        ? 'bg-emerald-600 text-white shadow-sm'
                        : 'bg-emerald-50 text-emerald-800 hover:bg-emerald-100 border border-emerald-200/60'
                    }`}
                  >
                    ⚙️ Hệ thống
                  </button>
                )}
              </div>
            </div>

            {/* Batch Action Toolbar (When 1+ items selected) */}
            <AnimatePresence>
              {selectedIds.size > 0 && (
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="p-3 bg-indigo-50/90 border border-indigo-200 rounded-2xl flex flex-wrap items-center justify-between gap-3 shadow-sm"
                >
                  <div className="flex items-center gap-2">
                    <span className="w-6 h-6 rounded-lg bg-indigo-600 text-white text-xs font-black flex items-center justify-center">
                      {selectedIds.size}
                    </span>
                    <span className="text-xs font-extrabold text-indigo-950">
                      Đang chọn {selectedIds.size} thông báo
                    </span>
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    {/* Bulk On Air */}
                    <button
                      type="button"
                      onClick={() => handleBulkOnAir(true)}
                      className="px-2.5 py-1.5 bg-rose-600 hover:bg-rose-700 text-white text-[11px] font-black rounded-xl transition-all shadow-sm flex items-center gap-1"
                      title="Bật On Air cho tất cả mục đã chọn"
                    >
                      <Radio className="w-3.5 h-3.5" />
                      <span>Bật On Air</span>
                    </button>

                    {/* Bulk Off Air */}
                    <button
                      type="button"
                      onClick={() => handleBulkOnAir(false)}
                      className="px-2.5 py-1.5 bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 text-[11px] font-bold rounded-xl transition-all flex items-center gap-1"
                      title="Tắt On Air cho tất cả mục đã chọn"
                    >
                      <span>Tắt On Air</span>
                    </button>

                    {/* Bulk Delete */}
                    <button
                      type="button"
                      onClick={handleRequestDeleteBulk}
                      className="px-2.5 py-1.5 bg-red-600 hover:bg-red-700 text-white text-[11px] font-black rounded-xl transition-all shadow-sm flex items-center gap-1"
                      title="Xóa tất cả mục đã chọn"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>Xóa ({selectedIds.size})</span>
                    </button>

                    {/* Deselect */}
                    <button
                      type="button"
                      onClick={handleClearSelection}
                      className="p-1.5 hover:bg-indigo-100 text-indigo-700 rounded-lg transition-all"
                      title="Hủy chọn"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {loading ? (
              <NotificationListSkeleton count={3} />
            ) : filteredNotifications.length === 0 ? (
              <div className="text-center py-16 bg-slate-50 border border-dashed border-slate-200 rounded-3xl">
                <BellRing className="w-10 h-10 text-slate-300 mx-auto mb-2" />
                <p className="text-sm font-bold text-slate-500">Không tìm thấy thông báo nào</p>
                <p className="text-xs text-slate-400 mt-1">
                  {searchQuery || filterType !== 'all' 
                    ? 'Thử thay đổi từ khóa tìm kiếm hoặc bỏ bộ lọc.' 
                    : 'Hãy soạn và gửi thông báo đầu tiên bằng bảng biểu bên trái.'}
                </p>
              </div>
            ) : (
              <div className="space-y-3 max-h-[600px] overflow-y-auto pr-1 overflow-x-hidden">
                <AnimatePresence initial={false}>
                  {filteredNotifications.map((notif) => {
                    const isSelected = selectedIds.has(notif.id);
                    const isOnAirActive = !!notif.isOnAir;
                    
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
                    } else if (notif.badgeColor === "rose") {
                      bgCol = "bg-rose-50 border-rose-100 text-rose-600";
                      IconRef = Radio;
                    }

                    return (
                      <motion.div
                        key={notif.id}
                        layout
                        initial={{ opacity: 0, y: 15, scale: 0.98 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, x: -30, scale: 0.95, transition: { duration: 0.2 } }}
                        transition={{ type: "spring", stiffness: 500, damping: 40 }}
                        className={`p-4 rounded-2xl border transition-all relative group flex items-start gap-3.5 ${
                          isOnAirActive 
                            ? 'bg-gradient-to-r from-rose-50/50 via-white to-amber-50/30 border-rose-300 ring-2 ring-rose-500/20 shadow-md'
                            : isSelected
                            ? 'bg-indigo-50/40 border-indigo-300 shadow-sm'
                            : 'bg-slate-50/50 hover:bg-slate-50 border-slate-200/80'
                        }`}
                      >
                        {/* Checkbox for Multi-Selection */}
                        <div className="pt-1 shrink-0">
                          <button
                            type="button"
                            onClick={() => handleToggleSelect(notif.id)}
                            className="p-1 rounded-lg hover:bg-slate-200/60 text-slate-500 transition-colors focus:outline-none"
                            title={isSelected ? "Bỏ chọn" : "Chọn thông báo này"}
                          >
                            {isSelected ? (
                              <CheckSquare className="w-5 h-5 text-indigo-600 fill-indigo-50" />
                            ) : (
                              <Square className="w-5 h-5 text-slate-300 hover:text-slate-400" />
                            )}
                          </button>
                        </div>

                        {/* Icon */}
                        <div className={`w-10 h-10 rounded-xl ${bgCol} border flex items-center justify-center font-bold text-lg shrink-0 mt-0.5 relative`}>
                          <IconRef className="w-5 h-5" />
                          {isOnAirActive && (
                            <span className="absolute -top-1 -right-1 flex h-3 w-3">
                              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75"></span>
                              <span className="relative inline-flex rounded-full h-3 w-3 bg-rose-600"></span>
                            </span>
                          )}
                        </div>

                        {/* Content & Actions */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between gap-3">
                            <div className="space-y-1">
                              {/* Badges Bar */}
                              <div className="flex flex-wrap items-center gap-1.5">
                                <span className="text-[10px] bg-slate-200/70 border border-slate-300/50 text-slate-700 px-2 py-0.5 rounded-md font-bold">
                                  {notif.badge}
                                </span>

                                {isOnAirActive && (
                                  <span className="inline-flex items-center gap-1 text-[10px] font-black text-rose-700 bg-rose-100 border border-rose-300 px-2 py-0.5 rounded-md animate-pulse">
                                    <span className="w-1.5 h-1.5 rounded-full bg-rose-600 animate-ping"></span>
                                    🔴 ON AIR
                                  </span>
                                )}

                                {notif.type === 'system_update' && (
                                  <span className="text-[10px] bg-indigo-50 text-indigo-700 px-2 py-0.5 rounded-md font-black border border-indigo-100">
                                    ADMIN
                                  </span>
                                )}

                                {notif.targetScope === 'class' && notif.targetClass && (
                                  <span className="text-[10px] bg-purple-50 text-purple-700 px-2 py-0.5 rounded-md font-extrabold border border-purple-100">
                                    🏫 Lớp {notif.targetClass}
                                  </span>
                                )}

                                {(!notif.targetScope || notif.targetScope === 'all') && (
                                  <span className="text-[10px] bg-slate-100 text-slate-600 px-2 py-0.5 rounded-md font-bold">
                                    🌐 Toàn trường
                                  </span>
                                )}
                              </div>

                              <h4 className="font-bold text-slate-900 text-sm">{notif.title}</h4>
                              <p className="text-xs text-slate-600 font-medium leading-relaxed break-words">{notif.content}</p>
                            </div>

                            {/* Action Buttons: ON AIR toggle, Edit, Delete */}
                            <div className="flex items-center gap-1 shrink-0">
                              {/* ON AIR Button */}
                              <button
                                type="button"
                                onClick={() => handleToggleOnAir(notif)}
                                className={`px-2 py-1 rounded-xl text-[10px] font-black transition-all flex items-center gap-1 border ${
                                  isOnAirActive
                                    ? 'bg-rose-600 text-white border-rose-600 hover:bg-rose-700 shadow-sm shadow-rose-200'
                                    : 'bg-white hover:bg-rose-50 text-slate-600 hover:text-rose-600 border-slate-200'
                                }`}
                                title={isOnAirActive ? "Tắt On Air phát sóng" : "Bật On Air phát sóng trực tiếp"}
                              >
                                <Radio className={`w-3.5 h-3.5 ${isOnAirActive ? 'animate-pulse' : ''}`} />
                                <span className="hidden sm:inline">{isOnAirActive ? 'ON AIR' : 'Off Air'}</span>
                              </button>

                              {/* Edit Button */}
                              <button
                                type="button"
                                onClick={() => handleOpenEdit(notif)}
                                className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-xl transition-all"
                                title="Chỉnh sửa thông báo"
                              >
                                <Edit2 className="w-4 h-4" />
                              </button>

                              {/* Delete Button */}
                              <button
                                type="button"
                                onClick={() => handleRequestDeleteSingle(notif)}
                                className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-all"
                                title="Xóa thông báo"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          </div>

                          {/* Footer Timestamp */}
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
      )}

      {/* Edit Notification Modal */}
      <AnimatePresence>
        {editingNotif && (
          <div className="fixed inset-0 z-[150] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => !isUpdating && setEditingNotif(null)}
              className="absolute inset-0"
            />

            <motion.div
              initial={{ scale: 0.85, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.85, opacity: 0 }}
              transition={{ type: 'spring', damping: 25, stiffness: 350 }}
              className="relative z-10 bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-slate-100 space-y-5 max-h-[90vh] overflow-y-auto"
            >
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center font-bold">
                    <Edit2 className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="font-extrabold text-slate-900 text-sm">Chỉnh sửa thông báo</h3>
                    <p className="text-[11px] text-slate-400">Cập nhật nội dung và tùy chọn phát sóng</p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setEditingNotif(null)}
                  disabled={isUpdating}
                  className="p-1.5 text-slate-400 hover:text-slate-600 rounded-xl hover:bg-slate-100 transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <form onSubmit={handleSaveEdit} className="space-y-4">
                <div className="space-y-1">
                  <label className="block text-xs font-bold text-slate-600 uppercase">Tiêu đề thông báo *</label>
                  <input
                    type="text"
                    required
                    value={editTitle}
                    onChange={(e) => setEditTitle(e.target.value)}
                    placeholder="Nhập tiêu đề..."
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs font-medium focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                  />
                </div>

                <div className="space-y-1">
                  <label className="block text-xs font-bold text-slate-600 uppercase">Nội dung chi tiết *</label>
                  <textarea
                    required
                    rows={4}
                    value={editContent}
                    onChange={(e) => setEditContent(e.target.value)}
                    placeholder="Nhập nội dung..."
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs font-medium focus:ring-2 focus:ring-indigo-500 focus:outline-none resize-none"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="block text-xs font-bold text-slate-600 uppercase">Loại thông báo</label>
                    <CustomSelect
                      value={editType}
                      onChange={(val) => setEditType(val as any)}
                      options={notificationTypeOptions}
                      size="md"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="block text-xs font-bold text-slate-600 uppercase">Màu sắc thẻ</label>
                    <CustomSelect
                      value={editBadgeColor}
                      onChange={(val) => setEditBadgeColor(val)}
                      options={badgeColorOptions}
                      size="md"
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="block text-xs font-bold text-slate-600 uppercase">Badge (Icon & chữ)</label>
                  <input
                    type="text"
                    required
                    value={editBadge}
                    onChange={(e) => setEditBadge(e.target.value)}
                    placeholder="Ví dụ: 🎉 Cập nhật"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs font-medium focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                  />
                </div>

                {/* Target Audience */}
                <div className="bg-slate-50/70 p-3.5 rounded-2xl border border-slate-200/80 space-y-3">
                  <label className="block text-xs font-bold text-slate-700 uppercase">
                    🎯 Đối tượng nhận
                  </label>
                  
                  {isAdmin ? (
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        type="button"
                        onClick={() => setEditTargetScope('all')}
                        className={`py-2 px-3 rounded-xl text-xs font-black border transition-all text-center ${
                          editTargetScope === 'all'
                            ? 'bg-indigo-600 border-indigo-600 text-white shadow-sm'
                            : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                        }`}
                      >
                        🌐 Toàn hệ thống
                      </button>
                      <button
                        type="button"
                        onClick={() => setEditTargetScope('class')}
                        className={`py-2 px-3 rounded-xl text-xs font-black border transition-all text-center ${
                          editTargetScope === 'class'
                            ? 'bg-indigo-600 border-indigo-600 text-white shadow-sm'
                            : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                        }`}
                      >
                        🏫 Chọn Lớp Cụ Thể
                      </button>
                    </div>
                  ) : null}

                  {(editTargetScope === 'class' || !isAdmin) && (
                    <div className="space-y-1">
                      <label className="block text-[10px] font-bold text-slate-500 uppercase">
                        Chọn lớp học nhận tin:
                      </label>
                      {classesList.length > 0 ? (
                        <CustomSelect
                          value={editTargetClass}
                          onChange={(val) => setEditTargetClass(val)}
                          options={classSelectOptions}
                          size="md"
                        />
                      ) : (
                        <input
                          type="text"
                          required
                          value={editTargetClass}
                          onChange={(e) => setEditTargetClass(e.target.value)}
                          placeholder="Nhập tên lớp..."
                          className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs font-medium focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                        />
                      )}
                    </div>
                  )}
                </div>

                {/* ON AIR Switch in Edit Form */}
                <div className="p-3.5 rounded-2xl bg-gradient-to-r from-rose-50 to-amber-50 border border-rose-200/80 flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-xl bg-rose-600 text-white flex items-center justify-center font-bold shrink-0 shadow-sm shadow-rose-200">
                      <Radio className="w-4 h-4 animate-pulse" />
                    </div>
                    <div>
                      <div className="flex items-center gap-1.5">
                        <span className="text-xs font-black text-rose-950">Phát sóng trực tiếp (ON AIR)</span>
                        <span className="text-[9px] font-black uppercase tracking-wider px-1.5 py-0.2 bg-rose-200 text-rose-800 rounded">Live</span>
                      </div>
                      <p className="text-[10px] text-rose-700 font-medium leading-tight mt-0.5">
                        Ghim thông báo lên đầu và phát sóng trực tiếp
                      </p>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => setEditIsOnAir(!editIsOnAir)}
                    className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                      editIsOnAir ? 'bg-rose-600' : 'bg-slate-300'
                    }`}
                    role="switch"
                    aria-checked={editIsOnAir}
                  >
                    <span
                      aria-hidden="true"
                      className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-md ring-0 transition duration-200 ease-in-out ${
                        editIsOnAir ? 'translate-x-5' : 'translate-x-0'
                      }`}
                    />
                  </button>
                </div>

                <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() => setEditingNotif(null)}
                    disabled={isUpdating}
                    className="px-4 py-2.5 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50 font-bold text-xs transition-colors"
                  >
                    Hủy bỏ
                  </button>
                  <button
                    type="submit"
                    disabled={isUpdating}
                    className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-black text-xs transition-all shadow-md flex items-center gap-1.5"
                  >
                    {isUpdating ? 'Đang lưu...' : 'Lưu thay đổi'}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Confirmation Modal for Delete */}
      <ConfirmModal
        isOpen={confirmDelete.isOpen}
        onClose={() => setConfirmDelete({ isOpen: false, ids: [], title: '', message: '' })}
        onConfirm={handleExecuteDelete}
        title={confirmDelete.title}
        message={confirmDelete.message}
        confirmText="Xác nhận xóa"
        cancelText="Hủy bỏ"
        variant="danger"
      />
    </div>
  );
}
