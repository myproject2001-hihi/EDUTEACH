import React, { useState, useEffect } from 'react';
import { User, Role, Assignment, ClassSession, HTMLSimulation, SystemNotification } from '../types';
import { db, auth, handleFirestoreError, OperationType } from '../firebase';
import { collection, getDocs, doc, updateDoc, deleteDoc, query, orderBy, onSnapshot, setDoc } from 'firebase/firestore';
import { signOut } from 'firebase/auth';
import { Shield, Users, BookOpen, Key, Check, X, Search, Edit3, UserCheck, Trash2, Calendar, FileText, Cpu, AlertCircle, RefreshCw, Lock, Sparkles, RotateCcw, BellRing } from 'lucide-react';
import { ConfirmModal } from '../components/ConfirmModal';
import { UserAvatar, combineName, getFirstName, getLastName } from '../components/UserAvatar';
import { NotificationsManagerView } from './NotificationsManagerView';
import { TableSkeleton, NotificationListSkeleton } from '../components/Skeletons';

interface AdminConsoleViewProps {
  user: User;
  assignments: Assignment[];
  classes: ClassSession[];
  simulations: HTMLSimulation[];
  isLoadingAssignments?: boolean;
}

export function AdminConsoleView({ user, assignments, classes, simulations }: AdminConsoleViewProps) {
  const [activeTab, setActiveTab] = useState<'users' | 'resets' | 'resources' | 'notifications'>('users');
  const [usersList, setUsersList] = useState<User[]>([]);
  const [resetRequests, setResetRequests] = useState<any[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(true);
  const [loadingResets, setLoadingResets] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState<'all' | 'admin' | 'teacher' | 'student'>('all');

  // Notification manager state
  const [notifList, setNotifList] = useState<SystemNotification[]>([]);
  const [loadingNotifs, setLoadingNotifs] = useState(true);
  const [notifTitle, setNotifTitle] = useState('');
  const [notifContent, setNotifContent] = useState('');
  const [notifType, setNotifType] = useState<'system_update' | 'badge_info' | 'class_reminder' | 'announcement'>('system_update');
  const [notifBadge, setNotifBadge] = useState('🎉 Cập nhật');
  const [notifBadgeColor, setNotifBadgeColor] = useState('emerald');
  const [publishingNotif, setPublishingNotif] = useState(false);

  // Modal / Form state for user role change or password reset
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [editLastName, setEditLastName] = useState('');
  const [editFirstName, setEditFirstName] = useState('');
  const [editClassName, setEditClassName] = useState('');
  const [newRole, setNewRole] = useState<Role>('student');
  const [makeSuperAdmin, setMakeSuperAdmin] = useState(false);
  const [updatingRole, setUpdatingRole] = useState(false);

  // Delete confirm modal state
  const [deleteConfirmUser, setDeleteConfirmUser] = useState<{ id: string; name: string } | null>(null);
  const [deletingUser, setDeletingUser] = useState(false);

  // Reset request handling
  const [handlingResetId, setHandlingResetId] = useState<string | null>(null);
  const [tempPasswordInput, setTempPasswordInput] = useState('');

  const [notification, setNotification] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // Super admin logic: Find if any user is registered as Super Admin
  const superAdminUser = usersList.find(u => u.isSuperAdmin);
  const isCurrentSuperAdmin = user.isSuperAdmin || (superAdminUser ? superAdminUser.id === user.id : (user.role === 'admin' || user.id === 'admin'));

  useEffect(() => {
    // Sync all users from Firestore
    const unsubUsers = onSnapshot(collection(db, 'users'), (snapshot) => {
      const list: User[] = [];
      snapshot.forEach((docSnap) => {
        list.push({ id: docSnap.id, ...docSnap.data() } as User);
      });
      setUsersList(list);
      setLoadingUsers(false);
    }, (err) => {
      console.error(err);
      setLoadingUsers(false);
    });

    // Sync all password reset requests
    const unsubResets = onSnapshot(collection(db, 'reset_requests'), (snapshot) => {
      const list: any[] = [];
      snapshot.forEach((docSnap) => {
        list.push({ id: docSnap.id, ...docSnap.data() });
      });
      list.sort((a, b) => new Date(b.requestedAt || 0).getTime() - new Date(a.requestedAt || 0).getTime());
      setResetRequests(list);
      setLoadingResets(false);
    }, (err) => {
      console.error(err);
      setLoadingResets(false);
    });

    // Sync all system notifications
    const unsubNotifs = onSnapshot(collection(db, 'system_notifications'), (snapshot) => {
      const list: SystemNotification[] = [];
      snapshot.forEach((docSnap) => {
        const data = docSnap.data() as SystemNotification;
        if (!data.targetStudentId) {
          list.push(data);
        }
      });
      list.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      setNotifList(list);
      setLoadingNotifs(false);
    }, (err) => {
      console.error(err);
      setLoadingNotifs(false);
    });

    return () => {
      unsubUsers();
      unsubResets();
      unsubNotifs();
    };
  }, []);

  const showNotify = (type: 'success' | 'error', message: string) => {
    setNotification({ type, message });
    setTimeout(() => setNotification(null), 4000);
  };

  const handleClaimSuperAdmin = async () => {
    const existingSuper = usersList.find(u => u.isSuperAdmin);
    if (existingSuper && existingSuper.id !== user.id) {
      showNotify('error', `Hệ thống đã có Quản trị viên chính là ${existingSuper.name}. Bạn không thể tự kích hoạt quyền này.`);
      return;
    }
    try {
      await updateDoc(doc(db, 'users', user.id), {
        role: 'admin',
        isSuperAdmin: true
      });
      showNotify('success', 'Bạn đã được xác nhận là Quản trị viên chính (Super Admin) của hệ thống!');
    } catch (err) {
      console.error(err);
      showNotify('error', 'Không thể cập nhật quyền Quản trị viên chính.');
    }
  };

  const handleUpdateRole = async (targetUser: User, roleToSet: Role, setSuperAdminFlag?: boolean) => {
    if (roleToSet === 'admin' && !isCurrentSuperAdmin) {
      showNotify('error', 'Chỉ Quản trị viên chính mới có quyền phân quyền Quản trị viên cho người khác!');
      return;
    }
    setUpdatingRole(true);
    const updatedFullName = combineName(editLastName, editFirstName) || targetUser.name;
    try {
      await updateDoc(doc(db, 'users', targetUser.id), {
        role: roleToSet,
        isSuperAdmin: roleToSet === 'admin' ? !!setSuperAdminFlag : false,
        name: updatedFullName,
        lastName: editLastName,
        firstName: editFirstName,
        className: editClassName
      });
      setUsersList(prev => prev.map(u => u.id === targetUser.id ? {
        ...u,
        role: roleToSet,
        isSuperAdmin: roleToSet === 'admin' ? !!setSuperAdminFlag : false,
        name: updatedFullName,
        lastName: editLastName,
        firstName: editFirstName,
        className: editClassName
      } : u));
      showNotify('success', `Đã cập nhật thông tin và vai trò của ${updatedFullName} thành công!`);
      setEditingUser(null);
    } catch (err: any) {
      console.error(err);
      handleFirestoreError(err, OperationType.UPDATE, `users/${targetUser.id}`);
      showNotify('error', 'Lỗi khi cập nhật thông tin người dùng.');
    } finally {
      setUpdatingRole(false);
    }
  };

  const handleApproveResetRequest = async (requestId: string, reqUsername: string) => {
    if (!tempPasswordInput.trim()) {
      showNotify('error', 'Vui lòng nhập mật khẩu mới hoặc mật khẩu tạm thời cho người dùng!');
      return;
    }

    setHandlingResetId(requestId);
    try {
      // Find matching user doc by username
      const userMatch = usersList.find(u => u.id === reqUsername || u.name.toLowerCase() === reqUsername.toLowerCase());
      
      await updateDoc(doc(db, 'reset_requests', requestId), {
        status: 'approved',
        tempPassword: tempPasswordInput.trim(),
        processedAt: new Date().toISOString(),
        processedBy: user.name,
      });

      showNotify('success', `Đã duyệt yêu cầu và cấp mật khẩu mới "${tempPasswordInput.trim()}" cho tài khoản ${reqUsername}`);
      setTempPasswordInput('');
    } catch (err) {
      console.error(err);
      showNotify('error', 'Lỗi khi xử lý yêu cầu khôi phục mật khẩu.');
    } finally {
      setHandlingResetId(null);
    }
  };

  const handleRejectResetRequest = async (requestId: string) => {
    setHandlingResetId(requestId);
    try {
      await updateDoc(doc(db, 'reset_requests', requestId), {
        status: 'rejected',
        processedAt: new Date().toISOString(),
        processedBy: user.name,
      });
      showNotify('success', 'Đã từ chối yêu cầu cấp lại mật khẩu.');
    } catch (err) {
      console.error(err);
      showNotify('error', 'Lỗi khi từ chối yêu cầu.');
    } finally {
      setHandlingResetId(null);
    }
  };

  const confirmDeleteUser = async () => {
    if (!deleteConfirmUser) return;
    setDeletingUser(true);
    try {
      await deleteDoc(doc(db, 'users', deleteConfirmUser.id));
      setUsersList(prev => prev.filter(u => u.id !== deleteConfirmUser.id));
      showNotify('success', `Đã xóa thành công tài khoản ${deleteConfirmUser.name}`);
      setDeleteConfirmUser(null);
    } catch (err: any) {
      console.error(err);
      handleFirestoreError(err, OperationType.DELETE, `users/${deleteConfirmUser.id}`);
      showNotify('error', `Không thể xóa tài khoản người dùng: ${err.message || 'Lỗi hệ thống'}`);
    } finally {
      setDeletingUser(false);
    }
  };

  const handlePublishNotification = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!notifTitle.trim() || !notifContent.trim()) {
      showNotify('error', 'Vui lòng điền đầy đủ tiêu đề và nội dung thông báo!');
      return;
    }
    setPublishingNotif(true);
    try {
      const newNotif: SystemNotification = {
        id: 'notif_' + Date.now(),
        title: notifTitle.trim(),
        content: notifContent.trim(),
        type: notifType,
        badge: notifBadge,
        badgeColor: notifBadgeColor,
        createdAt: new Date().toISOString(),
      };
      await setDoc(doc(db, 'system_notifications', newNotif.id), newNotif);
      showNotify('success', 'Đã xuất bản thông báo hệ thống mới thành công!');
      // Reset form
      setNotifTitle('');
      setNotifContent('');
    } catch (err: any) {
      console.error(err);
      showNotify('error', `Lỗi khi xuất bản thông báo: ${err.message || 'Lỗi hệ thống'}`);
    } finally {
      setPublishingNotif(false);
    }
  };

  const handleDeleteNotification = async (id: string) => {
    if (!window.confirm('Bạn có chắc chắn muốn xóa thông báo này?')) return;
    try {
      await deleteDoc(doc(db, 'system_notifications', id));
      showNotify('success', 'Đã xóa thông báo thành công.');
    } catch (err: any) {
      console.error(err);
      showNotify('error', `Lỗi khi xóa thông báo: ${err.message}`);
    }
  };

  const handleSystemReset = async () => {
    if (!window.confirm('Bạn có chắc chắn muốn reset lại toàn bộ hệ thống và khởi động lại từ đầu không? Thao tác này sẽ xóa cache, đăng xuất và làm mới ứng dụng.')) {
      return;
    }
    try {
      localStorage.clear();
      sessionStorage.clear();
      await signOut(auth);
    } catch (e) {
      console.error(e);
    }
    window.location.reload();
  };

  const filteredUsers = usersList.filter(u => {
    const matchSearch = u.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
                        (u.className && u.className.toLowerCase().includes(searchTerm.toLowerCase())) ||
                        (u.connectionCode && u.connectionCode.toLowerCase().includes(searchTerm.toLowerCase()));
    const matchRole = roleFilter === 'all' || u.role === roleFilter;
    return matchSearch && matchRole;
  });

  const teacherCount = usersList.filter(u => u.role === 'teacher').length;
  const studentCount = usersList.filter(u => u.role === 'student').length;
  const adminCount = usersList.filter(u => u.role === 'admin').length;
  const pendingResetCount = resetRequests.filter(r => r.status === 'pending' || !r.status).length;

  return (
    <div className="p-6 md:p-8 max-w-7xl mx-auto space-y-8 animate-in fade-in duration-300">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-blue-50/95 via-sky-50 to-indigo-50/95 border border-indigo-100 rounded-3xl p-6 md:p-8 text-slate-800 shadow-sm relative overflow-hidden">
        <div className="absolute right-0 top-0 bottom-0 w-1/3 bg-indigo-200/10 blur-3xl pointer-events-none" />
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 relative z-10">
          <div className="space-y-2">
            <div className="flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center gap-2 px-3 py-1 bg-indigo-100/60 border border-indigo-200 text-indigo-700 rounded-full text-xs font-bold uppercase tracking-wider">
                <Shield className="w-3.5 h-3.5" />
                Trung tâm Quản trị viên (Admin Console)
              </span>
              {superAdminUser ? (
                <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-amber-100/60 border border-amber-200 text-amber-800 rounded-full text-xs font-black">
                  <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                  Quản trị viên chính: {superAdminUser.name}
                </span>
              ) : (
                <button
                  onClick={handleClaimSuperAdmin}
                  className="inline-flex items-center gap-1.5 px-3 py-1 bg-amber-400 hover:bg-amber-300 text-slate-900 rounded-full text-xs font-black shadow-md transition-all animate-bounce"
                >
                  <Sparkles className="w-3.5 h-3.5 text-slate-900" />
                  Kích hoạt vai trò Quản trị viên chính
                </button>
              )}
            </div>
            <h1 className="text-2xl md:text-3xl font-black text-slate-900 tracking-tight">
              Quản Lý Toàn Bộ Hệ Thống & Phân Quyền Admin
            </h1>
            <p className="text-sm text-slate-600 max-w-2xl leading-relaxed">
              Quản trị viên chính có đặc quyền phân quyền Admin cho các thành viên khác, quản lý tài khoản Giáo viên / Học sinh và giám sát tài nguyên.
            </p>
          </div>

          <div className="flex items-center gap-3 shrink-0">
            <div className="bg-white/10 backdrop-blur-md border border-white/10 p-4 rounded-2xl flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-amber-500/20 text-amber-400 flex items-center justify-center font-bold">
                <Key className="w-5 h-5" />
              </div>
              <div>
                <p className="text-xs text-slate-300 font-medium">Yêu cầu quên mật khẩu</p>
                <p className="text-xl font-black text-amber-400">{pendingResetCount} chờ xử lý</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Notifications */}
      {notification && (
        <div className={`p-4 rounded-2xl border flex items-center gap-3 text-sm font-semibold shadow-md animate-in slide-in-from-top-2 duration-200 ${
          notification.type === 'success' 
            ? 'bg-emerald-50 border-emerald-200 text-emerald-800' 
            : 'bg-rose-50 border-rose-200 text-rose-800'
        }`}>
          {notification.type === 'success' ? <Check className="w-5 h-5 shrink-0 text-emerald-600" /> : <AlertCircle className="w-5 h-5 shrink-0 text-rose-600" />}
          <span>{notification.message}</span>
        </div>
      )}

      {/* Quick Overview Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center font-bold">
            <Users className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs text-slate-500 font-bold uppercase">Tổng người dùng</p>
            <p className="text-2xl font-black text-slate-900">{usersList.length}</p>
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center font-bold">
            <UserCheck className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs text-slate-500 font-bold uppercase">Giáo viên</p>
            <p className="text-2xl font-black text-blue-600">{teacherCount}</p>
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold">
            <BookOpen className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs text-slate-500 font-bold uppercase">Học sinh</p>
            <p className="text-2xl font-black text-emerald-600">{studentCount}</p>
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-purple-50 text-purple-600 flex items-center justify-center font-bold">
            <Shield className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs text-slate-500 font-bold uppercase">Quản trị viên</p>
            <p className="text-2xl font-black text-purple-600">{adminCount}</p>
          </div>
        </div>
      </div>

      {/* Main Tabs Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between border-b border-slate-200 gap-4 pb-0">
        <div className="flex gap-8 overflow-x-auto w-full sm:w-auto">
          <button
            onClick={() => setActiveTab('users')}
            className={`pb-4 text-sm font-bold flex items-center gap-2 border-b-2 transition-colors whitespace-nowrap ${
              activeTab === 'users'
                ? 'border-indigo-600 text-indigo-600'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <Users className="w-4 h-4" />
            Quản Lý Tài Khoản & Phân Quyền ({usersList.length})
          </button>

          <button
            onClick={() => setActiveTab('resets')}
            className={`pb-4 text-sm font-bold flex items-center gap-2 border-b-2 transition-colors relative whitespace-nowrap ${
              activeTab === 'resets'
                ? 'border-indigo-600 text-indigo-600'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <Key className="w-4 h-4" />
            Duyệt Cấp Lại Mật Khẩu
            {pendingResetCount > 0 && (
              <span className="bg-amber-500 text-white text-[10px] font-black px-2 py-0.5 rounded-full">
                {pendingResetCount}
              </span>
            )}
          </button>

          <button
            onClick={() => setActiveTab('resources')}
            className={`pb-4 text-sm font-bold flex items-center gap-2 border-b-2 transition-colors whitespace-nowrap ${
              activeTab === 'resources'
                ? 'border-indigo-600 text-indigo-600'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <BookOpen className="w-4 h-4" />
            Tài Nguyên Hệ Thống (Bài tập/Lớp/Mô phỏng)
          </button>

          <button
            onClick={() => setActiveTab('notifications')}
            className={`pb-4 text-sm font-bold flex items-center gap-2 border-b-2 transition-colors whitespace-nowrap ${
              activeTab === 'notifications'
                ? 'border-indigo-600 text-indigo-600'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <BellRing className="w-4 h-4" />
            Thông báo Hệ thống ({notifList.length})
          </button>
        </div>

        <button
          type="button"
          onClick={handleSystemReset}
          className="mb-4 sm:mb-0 px-4 py-2 bg-rose-50 hover:bg-rose-100 text-rose-700 text-xs font-bold rounded-xl transition-colors flex items-center gap-1.5 border border-rose-200 shadow-sm"
        >
          <RotateCcw className="w-3.5 h-3.5" />
          <span>Reset lại hệ thống</span>
        </button>
      </div>

      {/* TAB 1: USER MANAGEMENT */}
      {activeTab === 'users' && (
        <div className="space-y-6">
          <div className="bg-slate-50 border border-slate-200/80 rounded-2xl p-4 flex flex-col md:flex-row gap-4 items-stretch md:items-center justify-between">
            <div className="relative flex-1 max-w-md">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Tìm tên, lớp, mã kết nối..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl text-xs font-bold focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all shadow-sm"
              />
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs font-bold text-slate-500 mr-2">Lọc vai trò:</span>
              {(['all', 'admin', 'teacher', 'student'] as const).map((r) => (
                <button
                  key={r}
                  onClick={() => setRoleFilter(r)}
                  className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all border whitespace-nowrap ${
                    roleFilter === r
                      ? 'bg-indigo-600 text-white border-indigo-600 shadow-md shadow-indigo-100'
                      : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                  }`}
                >
                  {r === 'all' ? 'Tất cả' : r === 'admin' ? '🛡️ Admin' : r === 'teacher' ? '👨‍🏫 Giáo viên' : '🎓 Học sinh'}
                </button>
              ))}
            </div>
          </div>

          {loadingUsers ? (
            <TableSkeleton rows={5} />
          ) : filteredUsers.length === 0 ? (
            <div className="p-8 bg-slate-50 rounded-2xl border border-slate-200 text-center text-slate-500 text-sm">
              Không tìm thấy người dùng nào phù hợp.
            </div>
          ) : (
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
              <div className="overflow-x-auto custom-scrollbar">
                <table className="min-w-[850px] w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-200 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                      <th className="py-4 px-5 whitespace-nowrap">Người dùng</th>
                      <th className="py-4 px-5 whitespace-nowrap">Vai trò</th>
                      <th className="py-4 px-5 whitespace-nowrap">Lớp / Mã kết nối</th>
                      <th className="py-4 px-5 whitespace-nowrap">SĐT HS / Phụ huynh</th>
                      <th className="py-4 px-5 text-right whitespace-nowrap">Thao tác Quản trị</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-xs font-medium">
                    {filteredUsers.map((u) => (
                      <tr key={u.id} className="hover:bg-slate-50/80 transition-colors">
                        <td className="py-4 px-5">
                          <div className="flex items-center gap-3">
                            <UserAvatar name={u.name} firstName={u.firstName} avatar={u.avatar} size="md" />
                            <div>
                              <p className="font-extrabold text-slate-900 text-sm whitespace-nowrap">{u.name}</p>
                              <p className="text-[11px] text-slate-400 font-mono">ID: {u.id.substring(0, 8)}...</p>
                            </div>
                          </div>
                        </td>

                        <td className="py-4 px-5">
                          {u.isSuperAdmin ? (
                            <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-[11px] font-black bg-amber-100 text-amber-900 border border-amber-300 whitespace-nowrap">
                              👑 Quản trị viên chính
                            </span>
                          ) : u.role === 'admin' ? (
                            <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-[11px] font-extrabold bg-purple-100 text-purple-800 border border-purple-200 whitespace-nowrap">
                              🛡️ Quản trị viên
                            </span>
                          ) : u.role === 'teacher' ? (
                            <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-[11px] font-extrabold bg-blue-100 text-blue-800 border border-blue-200 whitespace-nowrap">
                              👨‍🏫 Giáo viên
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-[11px] font-extrabold bg-emerald-100 text-emerald-800 border border-emerald-200 whitespace-nowrap">
                              🎓 Học sinh
                            </span>
                          )}
                        </td>

                        <td className="py-4 px-5 text-slate-600 whitespace-nowrap">
                          {u.className || u.connectionCode ? (
                            <span className="font-mono text-indigo-600 font-extrabold bg-indigo-50 px-2.5 py-1 rounded-lg border border-indigo-100 inline-block">
                              {u.className || u.connectionCode}
                            </span>
                          ) : (
                            <span className="text-slate-400 italic">Chưa tạo lớp</span>
                          )}
                        </td>

                        <td className="py-4 px-5 text-slate-600 whitespace-nowrap">
                          <p className="font-bold text-slate-800">{u.phoneStudent || '—'}</p>
                          {u.phoneParent && <p className="text-[11px] text-slate-400">PH: {u.phoneParent}</p>}
                        </td>

                        <td className="py-4 px-5 text-right whitespace-nowrap">
                          <div className="flex items-center justify-end gap-2">
                            <button
                              onClick={() => {
                                setEditingUser(u);
                                setNewRole(u.role);
                                setMakeSuperAdmin(!!u.isSuperAdmin);
                                setEditLastName(getLastName(u.name, u.lastName));
                                setEditFirstName(getFirstName(u.name, u.firstName));
                                setEditClassName(u.className || u.connectionCode || '');
                              }}
                              className="px-3.5 py-1.5 bg-indigo-50 text-indigo-600 hover:bg-indigo-100 font-bold rounded-xl transition-colors flex items-center gap-1 border border-indigo-100/50"
                            >
                              <Edit3 className="w-3.5 h-3.5" />
                              Đổi vai trò
                            </button>

                            {u.id !== user.id && (
                              <button
                                onClick={() => setDeleteConfirmUser({ id: u.id, name: u.name })}
                                className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-colors border border-transparent hover:border-rose-100"
                                title="Xóa tài khoản"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* TAB 2: PASSWORD RESETS APPROVAL */}
      {activeTab === 'resets' && (
        <div className="space-y-6">
          <div className="p-4 bg-amber-50 border border-amber-200 rounded-2xl flex items-start gap-3 text-amber-900 text-xs leading-relaxed">
            <AlertCircle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
            <div>
              <p className="font-bold text-amber-950">Quy trình duyệt cấp lại mật khẩu cho Học sinh / Giáo viên:</p>
              <p>Khi người dùng bấm "Quên mật khẩu", thông tin sẽ gửi về đây. Quản trị viên nhập mật khẩu mới (ví dụ: <code className="font-mono font-bold">123456</code>) rồi nhấn <strong>"Cấp mật khẩu & Duyệt"</strong>. Người dùng sẽ nhận được mật khẩu này khi quay lại tra cứu.</p>
            </div>
          </div>

          {loadingResets ? (
            <NotificationListSkeleton count={3} />
          ) : resetRequests.length === 0 ? (
            <div className="p-8 bg-slate-50 rounded-2xl border border-slate-200 text-center text-slate-500 text-sm">
              Hiện chưa có yêu cầu khôi phục mật khẩu nào từ người dùng.
            </div>
          ) : (
            <div className="space-y-4">
              {resetRequests.map((req) => {
                const isPending = !req.status || req.status === 'pending';
                const isApproved = req.status === 'approved';

                return (
                  <div
                    key={req.id}
                    className={`p-5 rounded-2xl border transition-all ${
                      isPending 
                        ? 'bg-amber-50/40 border-amber-200 shadow-sm' 
                        : isApproved 
                        ? 'bg-emerald-50/30 border-emerald-200' 
                        : 'bg-slate-50 border-slate-200 opacity-75'
                    }`}
                  >
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-slate-900 text-base">{req.studentName || req.username}</span>
                          <span className={`text-[10px] font-extrabold px-2.5 py-0.5 rounded-full uppercase ${
                            isPending 
                              ? 'bg-amber-100 text-amber-800 border border-amber-200' 
                              : isApproved 
                              ? 'bg-emerald-100 text-emerald-800' 
                              : 'bg-rose-100 text-rose-800'
                          }`}>
                            {isPending ? 'Chờ duyệt' : isApproved ? 'Đã cấp mật khẩu' : 'Đã từ chối'}
                          </span>
                        </div>

                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-x-6 gap-y-1 text-xs text-slate-600 pt-1">
                          <p><strong>Tên ĐN:</strong> <code className="font-mono text-indigo-600 font-bold">{req.username}</code></p>
                          <p><strong>Lớp/Đơn vị:</strong> {req.className || '—'}</p>
                          <p><strong>SĐT liên hệ:</strong> {req.phone || '—'}</p>
                          <p><strong>Thời gian:</strong> {req.requestedAt ? new Date(req.requestedAt).toLocaleString('vi-VN') : '—'}</p>
                        </div>

                        {req.note && (
                          <p className="text-xs text-slate-500 italic mt-1">Lý do/Ghi chú: "{req.note}"</p>
                        )}

                        {isApproved && req.tempPassword && (
                          <div className="mt-2 p-2 bg-emerald-100/80 rounded-xl text-emerald-900 text-xs font-mono font-bold inline-flex items-center gap-2">
                            <span>Mật khẩu đã cấp:</span>
                            <span className="bg-white px-2 py-0.5 rounded border border-emerald-300 text-emerald-800">{req.tempPassword}</span>
                          </div>
                        )}
                      </div>

                      {/* Actions */}
                      {isPending && (
                        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 shrink-0 bg-white p-3 rounded-2xl border border-slate-200 shadow-sm">
                          <input
                            type="text"
                            placeholder="Mật khẩu mới (ví dụ: 123456)"
                            value={tempPasswordInput}
                            onChange={(e) => setTempPasswordInput(e.target.value)}
                            className="px-3 py-1.5 text-xs font-mono bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500"
                          />
                          <button
                            onClick={() => handleApproveResetRequest(req.id, req.username)}
                            disabled={handlingResetId === req.id}
                            className="px-4 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl transition-colors flex items-center justify-center gap-1 shadow-sm"
                          >
                            <Check className="w-4 h-4" />
                            Cấp & Duyệt
                          </button>
                          <button
                            onClick={() => handleRejectResetRequest(req.id)}
                            disabled={handlingResetId === req.id}
                            className="px-3 py-1.5 bg-slate-100 hover:bg-rose-100 text-slate-600 hover:text-rose-700 font-bold text-xs rounded-xl transition-colors flex items-center justify-center gap-1"
                          >
                            <X className="w-4 h-4" />
                            Từ chối
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* TAB 3: SYSTEM RESOURCES */}
      {activeTab === 'resources' && (
        <div className="space-y-8">
          {/* Section: Classes */}
          <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                  <Calendar className="w-5 h-5 text-indigo-600" />
                  Toàn bộ Buổi Học / Lịch Học Toàn Hệ Thống ({classes.length})
                </h3>
                <p className="text-xs text-slate-500">Quản trị viên có thể xem và kiểm tra tất cả các buổi học do bất kỳ giáo viên nào tạo ra</p>
              </div>
            </div>

            {classes.length === 0 ? (
              <p className="text-xs text-slate-400 italic">Chưa có buổi học nào trên hệ thống.</p>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {classes.map((c) => (
                  <div key={c.id} className="p-4 bg-slate-50 rounded-2xl border border-slate-200 flex items-center justify-between">
                    <div>
                      <h4 className="font-bold text-slate-900 text-sm">{c.title}</h4>
                      <p className="text-xs text-slate-500">{c.startTime} - {c.endTime} {c.subject && `• ${c.subject}`}</p>
                      <p className="text-[11px] text-indigo-600 font-medium mt-1">
                        Tạo bởi: {c.teacherName || 'Giáo viên'}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Section: Assignments */}
          <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm space-y-4">
            <div>
              <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                <FileText className="w-5 h-5 text-indigo-600" />
                Toàn bộ Bài Tập / Đề Kiểm Tra ({assignments.length})
              </h3>
              <p className="text-xs text-slate-500">Danh sách bài tập tự luận & trắc nghiệm online từ tất cả các lớp</p>
            </div>

            {assignments.length === 0 ? (
              <p className="text-xs text-slate-400 italic">Chưa có bài tập nào trên hệ thống.</p>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {assignments.map((a) => (
                  <div key={a.id} className="p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-1">
                    <div className="flex items-center justify-between">
                      <h4 className="font-bold text-slate-900 text-sm">{a.title}</h4>
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-indigo-100 text-indigo-700 uppercase">
                        {a.type === 'online_test' ? 'Trắc nghiệm' : 'Nộp file'}
                      </span>
                    </div>
                    <p className="text-xs text-slate-500">Hạn nộp: {a.dueDate}</p>
                    <p className="text-[11px] text-indigo-600 font-medium">
                      Giáo viên phụ trách: {a.teacherName || 'Giáo viên'}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Section: Simulations */}
          <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm space-y-4">
            <div>
              <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                <Cpu className="w-5 h-5 text-indigo-600" />
                Toàn bộ Thí Nghiệm & Mô Phỏng Thực Tế Ảo ({simulations.length})
              </h3>
              <p className="text-xs text-slate-500">Thí nghiệm tương tác HTML5 / PhET do giáo viên tải lên hoặc tích hợp</p>
            </div>

            {simulations.length === 0 ? (
              <p className="text-xs text-slate-400 italic">Chưa có mô phỏng nào trên hệ thống.</p>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {simulations.map((s) => (
                  <div key={s.id} className="p-3 bg-slate-50 rounded-2xl border border-slate-200 flex items-center gap-3">
                    <img src={s.thumbnail} alt={s.title} className="w-12 h-12 rounded-xl object-cover" />
                    <div>
                      <h4 className="font-bold text-slate-900 text-xs line-clamp-1">{s.title}</h4>
                      <p className="text-[11px] text-slate-400">{s.category || 'Mô phỏng'}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 4: SYSTEM NOTIFICATIONS */}
      {activeTab === 'notifications' && (
        <NotificationsManagerView user={user} />
      )}

      {/* MODAL: CHANGE ROLE */}
      {editingUser && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[110] flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 border border-slate-200 shadow-2xl space-y-6">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <h3 className="font-bold text-slate-900 text-lg flex items-center gap-2">
                <UserCheck className="w-5 h-5 text-indigo-600" />
                Thay đổi vai trò người dùng
              </h3>
              <button
                onClick={() => setEditingUser(null)}
                className="p-1.5 text-slate-400 hover:text-slate-600 rounded-xl"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4">
              <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-200 flex items-center gap-3">
                <UserAvatar name={combineName(editLastName, editFirstName) || editingUser.name} firstName={editFirstName} avatar={editingUser.avatar} size="md" />
                <div>
                  <p className="font-bold text-slate-900 text-sm">{combineName(editLastName, editFirstName) || editingUser.name}</p>
                  <p className="text-xs text-slate-500">Mã lớp: {editingUser.className || '—'}</p>
                </div>
              </div>

              {/* Chỉnh sửa Họ & Tên */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Họ và tên đệm</label>
                  <input
                    type="text"
                    value={editLastName}
                    onChange={(e) => setEditLastName(e.target.value)}
                    placeholder="Nguyễn Văn"
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs font-medium focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Tên</label>
                  <input
                    type="text"
                    value={editFirstName}
                    onChange={(e) => setEditFirstName(e.target.value)}
                    placeholder="An"
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs font-medium focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                  />
                </div>
              </div>

              {/* Chỉnh sửa Mã lớp / Tên lớp */}
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Mã lớp / Tên lớp học</label>
                <input
                  type="text"
                  value={editClassName}
                  onChange={(e) => setEditClassName(e.target.value)}
                  placeholder="Ví dụ: 123456 hoặc Lớp 10A1"
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs font-medium focus:ring-2 focus:ring-indigo-500 focus:outline-none font-mono text-indigo-700 font-bold"
                />
                <p className="text-[10px] text-slate-400 mt-1">Gán đúng mã lớp của Giáo viên để tự động link học sinh về lớp.</p>
              </div>

              <div className="space-y-2">
                <label className="block text-xs font-bold text-slate-500 uppercase">Chọn vai trò mới:</label>
                
                <div className="space-y-2">
                  {[
                    { key: 'student', label: '🎓 Học sinh', desc: 'Làm bài tập, xem điểm, theo dõi lịch học' },
                    { key: 'teacher', label: '👨‍🏫 Giáo viên', desc: 'Tạo lớp học, đăng bài tập, giao bài & chấm điểm lớp mình' },
                    { key: 'admin', label: '🛡️ Quản trị viên (Admin)', desc: 'Toàn quyền điều hành tài nguyên, tài khoản & hệ thống' },
                  ].map((item) => {
                    const isAdminOption = item.key === 'admin';
                    const isDisabled = isAdminOption && !isCurrentSuperAdmin;

                    return (
                      <div
                        key={item.key}
                        onClick={() => {
                          if (isDisabled) {
                            showNotify('error', 'Chỉ Quản trị viên chính mới có quyền phân quyền Quản trị viên!');
                            return;
                          }
                          setNewRole(item.key as Role);
                        }}
                        className={`p-3.5 rounded-2xl border transition-all ${
                          isDisabled 
                            ? 'bg-slate-50 border-slate-200 opacity-60 cursor-not-allowed'
                            : newRole === item.key
                            ? 'bg-indigo-50 border-indigo-500 ring-1 ring-indigo-500 cursor-pointer'
                            : 'bg-white border-slate-200 hover:border-slate-300 cursor-pointer'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <p className="font-bold text-slate-900 text-sm">{item.label}</p>
                          {isDisabled && (
                            <span className="text-[10px] font-bold text-amber-700 bg-amber-50 px-2 py-0.5 rounded-md border border-amber-200">
                              Yêu cầu Quản trị viên chính
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-slate-500 mt-0.5">{item.desc}</p>
                      </div>
                    );
                  })}
                </div>

                {newRole === 'admin' && isCurrentSuperAdmin && (
                  <label className="flex items-start gap-3 p-3.5 bg-amber-50/80 border border-amber-200 rounded-2xl cursor-pointer mt-3 transition-all hover:bg-amber-50">
                    <input
                      type="checkbox"
                      checked={makeSuperAdmin}
                      onChange={(e) => setMakeSuperAdmin(e.target.checked)}
                      className="w-4 h-4 mt-0.5 text-amber-600 rounded border-amber-300 focus:ring-amber-500"
                    />
                    <div>
                      <p className="text-xs font-black text-amber-950 flex items-center gap-1">
                        <Sparkles className="w-3.5 h-3.5 text-amber-600" />
                        Giao quyền Quản trị viên chính (Super Admin)
                      </p>
                      <p className="text-[11px] text-amber-800 leading-snug mt-0.5">
                        Cho phép tài khoản này cùng bạn nắm toàn bộ quyền cao nhất trong hệ thống (giao quyền Admin cho người khác).
                      </p>
                    </div>
                  </label>
                )}
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                onClick={() => setEditingUser(null)}
                className="px-4 py-2 text-slate-600 font-bold text-xs rounded-xl hover:bg-slate-100"
              >
                Hủy bỏ
              </button>
              <button
                onClick={() => handleUpdateRole(editingUser, newRole, makeSuperAdmin)}
                disabled={updatingRole}
                className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-xl transition-colors shadow-sm"
              >
                {updatingRole ? 'Đang lưu...' : 'Xác nhận thay đổi'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Custom Center-Zoom Confirmation Modal for User Deletion */}
      <ConfirmModal
        isOpen={!!deleteConfirmUser}
        onClose={() => setDeleteConfirmUser(null)}
        onConfirm={confirmDeleteUser}
        title="Xác nhận xóa tài khoản"
        message={`Bạn có chắc chắn muốn xóa người dùng "${deleteConfirmUser?.name}" khỏi hệ thống? Thao tác này sẽ gỡ bỏ hoàn toàn thông tin người dùng khỏi Firestore.`}
        confirmText="Xóa tài khoản"
        cancelText="Hủy bỏ"
        variant="danger"
        loading={deletingUser}
      />
    </div>
  );
}
