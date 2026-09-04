import React, { useState, useEffect } from 'react';
import { User, Role, Assignment, ClassSession, HTMLSimulation, SystemNotification, Submission, LoveLetter } from '../types';
import { db, auth, handleFirestoreError, OperationType } from '../firebase';
import { collection, getDocs, doc, updateDoc, deleteDoc, query, orderBy, onSnapshot, setDoc } from 'firebase/firestore';
import { signOut } from 'firebase/auth';
import { Shield, Users, BookOpen, Key, Check, X, Search, Edit3, UserCheck, Trash2, Calendar, FileText, Cpu, AlertCircle, RefreshCw, Lock, Sparkles, RotateCcw, BellRing, Eye, Filter, UploadCloud, Clock, Layers, ExternalLink, LayoutGrid, ListFilter, Heart, Mail, History, Gamepad2, Radio, Play, GraduationCap, School } from 'lucide-react';
import { useGameStatuses, getSampleQuestionsForGame } from '../lib/gameConfig';
import { GamePreview } from '../components/GamePreview';
import { ConfirmModal } from '../components/ConfirmModal';
import { UserAvatar, combineName, getFirstName, getLastName } from '../components/UserAvatar';
import { NotificationsManagerView } from './NotificationsManagerView';
import { TableSkeleton, NotificationListSkeleton } from '../components/Skeletons';
import { LoveLetterManager } from '../components/LoveLetterManager';
import { ActivityLogsView } from './ActivityLogsView';
import { logActivity } from '../lib/activityLogger';

export interface AuditItemDetails {
  description?: string;
  dueDate?: string;
  questionCount?: number;
  pdfUrl?: string;
  simulationUrl?: string;
  gameType?: string;
  flashcardsCount?: number;
  isMandatory?: boolean;
  thumbnail?: string;
  category?: string;
  timeRange?: string;
  subject?: string;
  grade?: number;
  feedback?: string;
  imageCount?: number;
  fileUrl?: string;
}

export interface AuditItem {
  id: string;
  title: string;
  categoryType: 'assignment' | 'simulation' | 'class' | 'submission';
  categoryLabel: string;
  uploaderName: string;
  uploaderRole: 'teacher' | 'student' | 'admin' | 'unknown';
  createdAtFormatted: string;
  relativeTime: string;
  timestamp: number;
  classSessionTitle?: string;
  collectionName: 'assignments' | 'simulations' | 'class_sessions' | 'submissions';
  details: AuditItemDetails;
  rawObj: any;
}

interface AdminConsoleViewProps {
  user: User;
  assignments: Assignment[];
  classes: ClassSession[];
  simulations: HTMLSimulation[];
  submissions?: Submission[];
  loveLetters?: LoveLetter[];
  isLoadingAssignments?: boolean;
}

export function AdminConsoleView({ user, assignments, classes, simulations, submissions, loveLetters = [] }: AdminConsoleViewProps) {
  const [activeTab, setActiveTab] = useState<'users' | 'resets' | 'resources' | 'notifications' | 'letters' | 'logs' | 'games'>('users');
  const { gameStatuses, toggleGameStatus } = useGameStatuses();
  const [adminGameSearch, setAdminGameSearch] = useState('');
  const [adminGameStatusFilter, setAdminGameStatusFilter] = useState<'all' | 'on_air' | 'coming_soon'>('all');
  const [adminPreviewGame, setAdminPreviewGame] = useState<{
    id: string;
    name: string;
    emoji: string;
    category: string;
    desc: string;
    tugOfWarMode: 'bot' | 'pvp';
  } | null>(null);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && adminPreviewGame) {
        setAdminPreviewGame(null);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [adminPreviewGame]);
  const [usersList, setUsersList] = useState<User[]>([]);
  const [resetRequests, setResetRequests] = useState<any[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(true);
  const [loadingResets, setLoadingResets] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState<'all' | 'admin' | 'teacher' | 'student'>('all');

  // Teacher Class Lookup Board state
  const [selectedTeacherId, setSelectedTeacherId] = useState<string>('');

  const selectedTeacher = React.useMemo(() => {
    return usersList.find(u => u.id === selectedTeacherId && u.role === 'teacher');
  }, [usersList, selectedTeacherId]);

  const teacherClasses = React.useMemo(() => {
    if (!selectedTeacher) return [];

    const classMap = new Map<string, {
      className: string;
      sources: ('profile' | 'session' | 'assignment')[];
      sessionsCount: number;
      assignmentsCount: number;
    }>();

    const addClass = (className: string, source: 'profile' | 'session' | 'assignment') => {
      const name = className.trim();
      if (!name) return;
      if (!classMap.has(name)) {
        classMap.set(name, {
          className: name,
          sources: [source],
          sessionsCount: 0,
          assignmentsCount: 0,
        });
      } else {
        const item = classMap.get(name)!;
        if (!item.sources.includes(source)) {
          item.sources.push(source);
        }
      }
    };

    // 1. Check teacher's profile className
    if (selectedTeacher.className) {
      addClass(selectedTeacher.className, 'profile');
    }

    // 2. Check classes/sessions
    classes.forEach(c => {
      if (c.teacherId === selectedTeacher.id || c.teacherName === selectedTeacher.name || c.teacherId === selectedTeacher.connectionCode) {
        if (c.className) {
          addClass(c.className, 'session');
          const item = classMap.get(c.className.trim())!;
          item.sessionsCount += 1;
        }
        if (c.title && c.title !== c.className) {
          addClass(c.title, 'session');
          const item = classMap.get(c.title.trim())!;
          item.sessionsCount += 1;
        }
      }
    });

    // 3. Check assignments list
    assignments.forEach(a => {
      const isOwner = a.teacherId === selectedTeacher.id || a.teacherName === selectedTeacher.name;
      if (isOwner) {
        if (a.className) {
          addClass(a.className, 'assignment');
          const item = classMap.get(a.className.trim())!;
          item.assignmentsCount += 1;
        }
      }
    });

    return Array.from(classMap.values());
  }, [selectedTeacher, classes, assignments]);

  // Resource Audit Console state
  const [resSearchTerm, setResSearchTerm] = useState('');
  const [resCategoryFilter, setResCategoryFilter] = useState<'all' | 'assignment' | 'simulation' | 'class' | 'submission'>('all');
  const [resUploaderFilter, setResUploaderFilter] = useState<string>('all');
  const [resSortOrder, setResSortOrder] = useState<'newest' | 'oldest' | 'title'>('newest');
  const [resDisplayMode, setResDisplayMode] = useState<'table' | 'cards'>('table');
  const [inspectItem, setInspectItem] = useState<AuditItem | null>(null);

  // Auto scroll to top when changing admin tabs or inspecting items
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
    document.documentElement.scrollTop = 0;
    document.body.scrollTop = 0;
  }, [activeTab, inspectItem]);
  const [deleteConfirmResource, setDeleteConfirmResource] = useState<{ id: string; title: string; collectionName: string } | null>(null);
  const [deletingResource, setDeletingResource] = useState(false);

  // Multi-select & Batch Actions state for Audit Table
  const [selectedItemKeys, setSelectedItemKeys] = useState<string[]>([]);
  const [isBatchAssignModalOpen, setIsBatchAssignModalOpen] = useState(false);
  const [isBatchDeleting, setIsBatchDeleting] = useState(false);

  // Resource Class Allocation state
  const [assignClassResource, setAssignClassResource] = useState<AuditItem | null>(null);
  const [targetClassScopeOption, setTargetClassScopeOption] = useState<'all' | 'specific' | 'custom'>('all');
  const [selectedClassesList, setSelectedClassesList] = useState<string[]>([]);
  const [customClassInput, setCustomClassInput] = useState<string>('');
  const [savingClassAllocation, setSavingClassAllocation] = useState(false);

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
      
      logActivity({
        user,
        category: 'user_management',
        actionType: 'user_role_change',
        title: `Cập nhật thông tin & phân quyền cho "${updatedFullName}"`,
        description: `Vai trò mới: ${roleToSet === 'admin' ? 'Quản trị viên' : roleToSet === 'teacher' ? 'Giáo viên' : 'Học sinh'}, Lớp: ${editClassName || 'Không'}`,
        targetId: targetUser.id,
        targetName: updatedFullName,
        meta: { newRole: roleToSet, className: editClassName }
      });

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

      logActivity({
        user,
        category: 'auth',
        actionType: 'auth_reset_approve',
        title: `Duyệt cấp lại mật khẩu cho tài khoản: ${reqUsername}`,
        description: `Mật khẩu tạm thời đã cấp: ${tempPasswordInput.trim()}`,
        targetId: requestId,
        targetName: reqUsername
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

      logActivity({
        user,
        category: 'auth',
        actionType: 'auth_reset_reject',
        title: `Từ chối yêu cầu cấp lại mật khẩu`,
        description: `Mã yêu cầu: ${requestId}`,
        targetId: requestId
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
      
      logActivity({
        user,
        category: 'user_management',
        actionType: 'user_delete',
        title: `Xóa tài khoản người dùng: "${deleteConfirmUser.name}"`,
        description: `Tài khoản / ID: ${deleteConfirmUser.id}`,
        targetId: deleteConfirmUser.id,
        targetName: deleteConfirmUser.name
      });

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
    try {
      await deleteDoc(doc(db, 'system_notifications', id));
      showNotify('success', 'Đã xóa thông báo thành công.');
    } catch (err: any) {
      console.error(err);
      showNotify('error', `Lỗi khi xóa thông báo: ${err.message}`);
    }
  };

  const availableClassOptions = Array.from(new Set([
    ...classes.map(c => c.title),
    ...classes.map(c => c.subject).filter(Boolean),
    ...usersList.map(u => u.className).filter(Boolean) as string[],
    'Lớp 10A1', 'Lớp 10A2', 'Lớp 11A1', 'Lớp 11A2', 'Lớp 12A1', 'Lớp 12A2', 'Khối 10', 'Khối 11', 'Khối 12', 'Đội tuyển Học sinh giỏi'
  ])).filter(Boolean);

  const handleOpenAssignModal = (item: AuditItem) => {
    setAssignClassResource(item);
    const existingTitle = item.classSessionTitle || 'Toàn bộ học sinh';
    if (existingTitle === 'Toàn bộ học sinh' || existingTitle === 'Toàn hệ thống' || existingTitle === 'Kho Mô phỏng chung') {
      setTargetClassScopeOption('all');
      setSelectedClassesList([]);
      setCustomClassInput('');
    } else {
      setTargetClassScopeOption('specific');
      const parts = existingTitle.split(',').map(s => s.trim()).filter(Boolean);
      setSelectedClassesList(parts);
      setCustomClassInput('');
    }
  };

  const handleSaveClassAllocation = async () => {
    if (!assignClassResource) return;
    setSavingClassAllocation(true);
    try {
      let finalScopeText = '';
      if (targetClassScopeOption === 'all') {
        finalScopeText = 'Toàn bộ học sinh';
      } else if (targetClassScopeOption === 'specific') {
        if (selectedClassesList.length === 0) {
          showNotify('error', 'Vui lòng chọn ít nhất 1 lớp học phù hợp!');
          setSavingClassAllocation(false);
          return;
        }
        finalScopeText = selectedClassesList.join(', ');
      } else {
        if (!customClassInput.trim()) {
          showNotify('error', 'Vui lòng nhập tên lớp hoặc phạm vi tùy chỉnh!');
          setSavingClassAllocation(false);
          return;
        }
        finalScopeText = customClassInput.trim();
      }

      const ref = doc(db, assignClassResource.collectionName, assignClassResource.id);
      if (assignClassResource.collectionName === 'assignments') {
        await updateDoc(ref, { classSessionTitle: finalScopeText });
      } else if (assignClassResource.collectionName === 'simulations') {
        await updateDoc(ref, { category: finalScopeText, classSessionTitle: finalScopeText });
      } else if (assignClassResource.collectionName === 'class_sessions') {
        await updateDoc(ref, { subject: finalScopeText, classSessionTitle: finalScopeText });
      } else if (assignClassResource.collectionName === 'submissions') {
        await updateDoc(ref, { assignmentTitle: `${assignClassResource.rawObj.assignmentTitle || 'Bài làm'} (${finalScopeText})` });
      }

      showNotify('success', `Đã thiết lập phân bổ tài nguyên "${assignClassResource.title}" đến lớp: ${finalScopeText}`);
      setAssignClassResource(null);
      if (inspectItem?.id === assignClassResource.id) {
        setInspectItem({ ...inspectItem, classSessionTitle: finalScopeText });
      }
    } catch (err: any) {
      console.error(err);
      showNotify('error', `Không thể cập nhật phân bổ lớp: ${err.message || 'Lỗi hệ thống'}`);
    } finally {
      setSavingClassAllocation(false);
    }
  };

  // Batch Multi-Select Handlers
  const toggleSelectItem = (key: string) => {
    setSelectedItemKeys(prev => 
      prev.includes(key) ? prev.filter(k => k !== key) : [...prev, key]
    );
  };

  const handleBatchDelete = async () => {
    if (selectedItemKeys.length === 0) return;
    if (!window.confirm(`XÁC NHẬN XÓA HÀNG LOẠT:\n\nBạn có chắc chắn muốn XÓA VĨNH VIỄN ${selectedItemKeys.length} tài nguyên/bài làm đã chọn khỏi Firestore? Thao tác này không thể hoàn tác.`)) return;

    setIsBatchDeleting(true);
    try {
      let count = 0;
      for (const key of selectedItemKeys) {
        const item = filteredAuditItems.find(i => `${i.collectionName}_${i.id}` === key);
        if (item) {
          await deleteDoc(doc(db, item.collectionName, item.id));
          count++;
        }
      }
      showNotify('success', `Đã xóa thành công ${count} tài nguyên khỏi hệ thống!`);
      setSelectedItemKeys([]);
    } catch (err: any) {
      console.error('Batch delete error:', err);
      showNotify('error', `Lỗi khi xóa hàng loạt: ${err.message || 'Lỗi hệ thống'}`);
    } finally {
      setIsBatchDeleting(false);
    }
  };

  const handleSaveBatchClassAllocation = async () => {
    if (selectedItemKeys.length === 0) return;
    setSavingClassAllocation(true);
    try {
      let finalScopeText = '';
      if (targetClassScopeOption === 'all') {
        finalScopeText = 'Toàn bộ học sinh';
      } else if (targetClassScopeOption === 'specific') {
        if (selectedClassesList.length === 0) {
          showNotify('error', 'Vui lòng chọn ít nhất 1 lớp học phù hợp!');
          setSavingClassAllocation(false);
          return;
        }
        finalScopeText = selectedClassesList.join(', ');
      } else {
        if (!customClassInput.trim()) {
          showNotify('error', 'Vui lòng nhập tên lớp hoặc phạm vi tùy chỉnh!');
          setSavingClassAllocation(false);
          return;
        }
        finalScopeText = customClassInput.trim();
      }

      let count = 0;
      for (const key of selectedItemKeys) {
        const item = filteredAuditItems.find(i => `${i.collectionName}_${i.id}` === key);
        if (item) {
          const ref = doc(db, item.collectionName, item.id);
          if (item.collectionName === 'assignments') {
            await updateDoc(ref, { classSessionTitle: finalScopeText, className: finalScopeText });
          } else if (item.collectionName === 'simulations') {
            await updateDoc(ref, { category: finalScopeText, classSessionTitle: finalScopeText });
          } else if (item.collectionName === 'class_sessions') {
            await updateDoc(ref, { subject: finalScopeText, classSessionTitle: finalScopeText });
          } else if (item.collectionName === 'submissions') {
            await updateDoc(ref, { assignmentTitle: `${item.rawObj.assignmentTitle || 'Bài làm'} (${finalScopeText})` });
          }
          count++;
        }
      }

      showNotify('success', `Đã phân bổ hàng loạt ${count} tài nguyên đến lớp/phạm vi: ${finalScopeText}`);
      setIsBatchAssignModalOpen(false);
      setSelectedItemKeys([]);
    } catch (err: any) {
      console.error('Batch assign error:', err);
      showNotify('error', `Lỗi khi phân bổ hàng loạt: ${err.message || 'Lỗi hệ thống'}`);
    } finally {
      setSavingClassAllocation(false);
    }
  };

  // Helper to format audit timestamps
  const formatAuditDate = (dateStr?: string) => {
    if (!dateStr) {
      return { full: 'Ghi nhận hệ thống', relative: 'Tự động', timestamp: 0 };
    }
    try {
      const d = new Date(dateStr);
      if (isNaN(d.getTime())) {
        return { full: dateStr, relative: 'Ghi nhận', timestamp: 0 };
      }
      const full = d.toLocaleString('vi-VN', {
        day: '2-digit', month: '2-digit', year: 'numeric',
        hour: '2-digit', minute: '2-digit', second: '2-digit'
      });
      
      const diffMs = Date.now() - d.getTime();
      const diffMins = Math.floor(diffMs / (1000 * 60));
      const diffHours = Math.floor(diffMins / 60);
      const diffDays = Math.floor(diffHours / 24);

      let relative = '';
      if (diffMins < 1) relative = 'Vừa xong';
      else if (diffMins < 60) relative = `${diffMins} phút trước`;
      else if (diffHours < 24) relative = `${diffHours} giờ trước`;
      else relative = `${diffDays} ngày trước`;

      return { full, relative, timestamp: d.getTime() };
    } catch {
      return { full: dateStr, relative: '', timestamp: 0 };
    }
  };

  // Consolidate all system resources into unified Audit list
  const rawAuditItems: AuditItem[] = [
    ...assignments.map(a => {
      const timeInfo = formatAuditDate(a.createdAt || a.dueDate);
      return {
        id: a.id,
        title: a.title,
        categoryType: 'assignment' as const,
        categoryLabel: a.type === 'online_test' ? 'Đề kiểm tra Trắc nghiệm' 
                     : a.type === 'game' ? 'Trò chơi học tập' 
                     : a.type === 'flashcard' ? 'Bộ Flashcards' 
                     : a.type === 'simulation' ? 'Bài tập Mô phỏng'
                     : 'Bài tập Tự luận',
        uploaderName: a.teacherName || 'Giáo viên phụ trách',
        uploaderRole: 'teacher' as const,
        createdAtFormatted: timeInfo.full,
        relativeTime: timeInfo.relative,
        timestamp: timeInfo.timestamp,
        classSessionTitle: a.classSessionTitle || 'Toàn bộ học sinh',
        collectionName: 'assignments' as const,
        details: {
          description: a.description,
          dueDate: a.dueDate ? formatAuditDate(a.dueDate).full : 'Không có',
          questionCount: a.questions?.length || 0,
          pdfUrl: a.pdfUrl,
          simulationUrl: a.simulationUrl,
          gameType: a.gameType,
          flashcardsCount: a.flashcards?.length || a.subFlashcardSets?.reduce((acc, s) => acc + (s.flashcards?.length || 0), 0) || 0,
          isMandatory: a.isMandatory
        },
        rawObj: a
      };
    }),
    ...simulations.map(s => {
      const timeInfo = formatAuditDate(s.createdAt);
      return {
        id: s.id,
        title: s.title,
        categoryType: 'simulation' as const,
        categoryLabel: `Thí nghiệm HTML5 (${s.category || 'Tương tác'})`,
        uploaderName: s.teacherName || 'Giáo viên / Admin',
        uploaderRole: 'teacher' as const,
        createdAtFormatted: timeInfo.full,
        relativeTime: timeInfo.relative,
        timestamp: timeInfo.timestamp,
        classSessionTitle: 'Kho Mô phỏng chung',
        collectionName: 'simulations' as const,
        details: {
          description: s.description,
          simulationUrl: s.url,
          thumbnail: s.thumbnail,
          category: s.category
        },
        rawObj: s
      };
    }),
    ...classes.map(c => {
      const timeInfo = formatAuditDate(c.createdAt);
      return {
        id: c.id,
        title: c.title,
        categoryType: 'class' as const,
        categoryLabel: 'Lịch học / Buổi học',
        uploaderName: c.teacherName || 'Giáo viên',
        uploaderRole: 'teacher' as const,
        createdAtFormatted: timeInfo.full,
        relativeTime: timeInfo.relative,
        timestamp: timeInfo.timestamp,
        classSessionTitle: c.subject || 'Nhiều lớp',
        collectionName: 'class_sessions' as const,
        details: {
          description: c.description,
          timeRange: `${c.startTime} - ${c.endTime}`,
          subject: c.subject
        },
        rawObj: c
      };
    }),
    ...(submissions || []).map(sub => {
      const timeInfo = formatAuditDate(sub.submittedAt);
      return {
        id: sub.id,
        title: `Bài làm: ${sub.studentName || 'Học sinh'} (${sub.assignmentTitle || 'Bài tập'})`,
        categoryType: 'submission' as const,
        categoryLabel: 'Bài nộp Học sinh',
        uploaderName: sub.studentName || 'Học sinh',
        uploaderRole: 'student' as const,
        createdAtFormatted: timeInfo.full,
        relativeTime: timeInfo.relative,
        timestamp: timeInfo.timestamp,
        classSessionTitle: 'Bài làm cá nhân',
        collectionName: 'submissions' as const,
        details: {
          description: sub.content,
          grade: sub.grade,
          feedback: sub.feedback,
          imageCount: sub.imageUrls?.length || 0,
          fileUrl: sub.fileUrl
        },
        rawObj: sub
      };
    })
  ];

  // List of unique uploader names for filter dropdown
  const uniqueUploaders = Array.from(new Set(rawAuditItems.map(item => item.uploaderName))).filter(Boolean);

  // Filter and sort audit list
  const filteredAuditItems = rawAuditItems.filter(item => {
    const queryStr = resSearchTerm.toLowerCase();
    const matchesSearch = item.title.toLowerCase().includes(queryStr) ||
                          item.uploaderName.toLowerCase().includes(queryStr) ||
                          (item.classSessionTitle && item.classSessionTitle.toLowerCase().includes(queryStr)) ||
                          item.id.toLowerCase().includes(queryStr);
    
    const matchesCategory = resCategoryFilter === 'all' || item.categoryType === resCategoryFilter;
    const matchesUploader = resUploaderFilter === 'all' || item.uploaderName === resUploaderFilter;

    return matchesSearch && matchesCategory && matchesUploader;
  }).sort((a, b) => {
    if (resSortOrder === 'newest') return b.timestamp - a.timestamp;
    if (resSortOrder === 'oldest') return a.timestamp - b.timestamp;
    return a.title.localeCompare(b.title);
  });

  const confirmDeleteResource = async () => {
    if (!deleteConfirmResource) return;
    setDeletingResource(true);
    try {
      await deleteDoc(doc(db, deleteConfirmResource.collectionName, deleteConfirmResource.id));
      showNotify('success', `Đã xóa tài nguyên "${deleteConfirmResource.title}" khỏi Firestore thành công!`);
      if (inspectItem?.id === deleteConfirmResource.id) {
        setInspectItem(null);
      }
      setDeleteConfirmResource(null);
    } catch (err: any) {
      console.error(err);
      showNotify('error', `Không thể xóa tài nguyên: ${err.message || 'Lỗi hệ thống'}`);
    } finally {
      setDeletingResource(false);
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
                Trung tâm Quản trị viên
              </span>
              {superAdminUser && (
                <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-amber-100/60 border border-amber-200 text-amber-800 rounded-full text-xs font-black">
                  <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                  Quản trị viên chính: {superAdminUser.name}
                </span>
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
            <div className="bg-white border border-amber-200/90 shadow-sm p-4 rounded-2xl flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-amber-100 text-amber-700 flex items-center justify-center font-bold shrink-0">
                <Key className="w-5 h-5" />
              </div>
              <div>
                <p className="text-xs text-slate-800 font-bold uppercase tracking-wide">Yêu cầu quên mật khẩu</p>
                <p className="text-xl font-black text-amber-600">{pendingResetCount} chờ xử lý</p>
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
            Cấp Lại Mật Khẩu
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
            Tài Nguyên Hệ Thống
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

          <button
            onClick={() => setActiveTab('letters')}
            className={`pb-4 text-sm font-bold flex items-center gap-2 border-b-2 transition-colors whitespace-nowrap ${
              activeTab === 'letters'
                ? 'border-indigo-600 text-rose-600'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <Heart className="w-4 h-4 text-rose-500 fill-rose-100" />
            Thư Yêu Thương ({loveLetters.length})
          </button>

          <button
            onClick={() => setActiveTab('logs')}
            className={`pb-4 text-sm font-bold flex items-center gap-2 border-b-2 transition-colors whitespace-nowrap ${
              activeTab === 'logs'
                ? 'border-indigo-600 text-indigo-600'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <History className="w-4 h-4 text-indigo-500" />
            Lịch Sử Thao Tác
          </button>

          <button
            onClick={() => setActiveTab('games')}
            className={`pb-4 text-sm font-bold flex items-center gap-2 border-b-2 transition-colors whitespace-nowrap ${
              activeTab === 'games'
                ? 'border-indigo-600 text-indigo-600'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <Gamepad2 className="w-4 h-4 text-emerald-500" />
            Quản Lý Game On Air
          </button>
        </div>

        <button
          type="button"
          onClick={handleSystemReset}
          className="mb-4 sm:mb-0 px-4 py-2 bg-rose-50 hover:bg-rose-100 text-rose-700 text-xs font-bold rounded-xl transition-colors flex items-center gap-1.5 border border-rose-200 shadow-sm"
        >
          <RotateCcw className="w-3.5 h-3.5" />
          <span>Reset</span>
        </button>
      </div>

      {/* TAB 1: USER MANAGEMENT */}
      {activeTab === 'users' && (
        <div className="space-y-6">
          {/* TEACHER CLASS LOOKUP BOARD */}
          <div className="bg-white border border-slate-200/80 rounded-3xl p-5 sm:p-6 shadow-sm">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 bg-indigo-50 text-indigo-600 rounded-xl flex items-center justify-center">
                <School className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-black text-slate-900">Bảng Tra Cứu Lớp Dạy Của Giáo Viên</h3>
                <p className="text-xs font-semibold text-slate-500">Xem nhanh danh sách tất cả các lớp học thực tế mà từng giáo viên đang phụ trách.</p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {/* Left Column: Teacher Selector */}
              <div className="space-y-3">
                <label className="block text-xs font-bold text-slate-700">Chọn giáo viên giảng dạy:</label>
                <div className="relative">
                  <select
                    value={selectedTeacherId}
                    onChange={(e) => setSelectedTeacherId(e.target.value)}
                    className="w-full bg-white border border-slate-200 hover:border-indigo-300 rounded-xl px-4 py-3 text-xs font-bold text-slate-800 focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 focus:outline-none transition-all cursor-pointer appearance-none pr-10"
                  >
                    <option value="">-- Chọn giáo viên --</option>
                    {usersList
                      .filter(u => u.role === 'teacher')
                      .map(t => (
                        <option key={t.id} value={t.id}>
                          👨‍🏫 {t.name} {t.className ? `(Lớp: ${t.className})` : ''}
                        </option>
                      ))}
                  </select>
                  <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-3 text-slate-400">
                    <Filter className="w-4 h-4" />
                  </div>
                </div>

                {selectedTeacher && (
                  <div className="p-4 bg-slate-50 border border-slate-100 rounded-2xl flex items-center gap-3">
                    <UserAvatar name={selectedTeacher.name} firstName={selectedTeacher.firstName} avatar={selectedTeacher.avatar} size="md" />
                    <div className="min-w-0">
                      <p className="text-sm font-black text-slate-900 truncate">{selectedTeacher.name}</p>
                      <p className="text-[11px] text-slate-400">ID: {selectedTeacher.id.substring(0, 8)}</p>
                      {selectedTeacher.className && (
                        <span className="inline-block mt-1 text-[10px] font-bold text-indigo-600 bg-indigo-50/50 border border-indigo-100 px-1.5 py-0.5 rounded-md">
                          Lớp chính: {selectedTeacher.className}
                        </span>
                      )}
                    </div>
                  </div>
                )}
              </div>

              {/* Right Columns: Class List & Details */}
              <div className="md:col-span-2 border-t md:border-t-0 md:border-l border-slate-100 md:pl-6 pt-5 md:pt-0">
                {!selectedTeacher ? (
                  <div className="h-full min-h-[140px] flex flex-col items-center justify-center text-center p-4 bg-slate-50/50 rounded-2xl border border-dashed border-slate-200">
                    <GraduationCap className="w-8 h-8 text-slate-300 mb-2" />
                    <p className="text-xs font-bold text-slate-500">Chưa chọn giáo viên</p>
                    <p className="text-[11px] text-slate-400 max-w-xs">Vui lòng chọn một giáo viên ở danh sách bên trái để kiểm tra các lớp học họ đang phụ trách.</p>
                  </div>
                ) : teacherClasses.length === 0 ? (
                  <div className="h-full min-h-[140px] flex flex-col items-center justify-center text-center p-4 bg-amber-50/30 rounded-2xl border border-dashed border-amber-200">
                    <AlertCircle className="w-8 h-8 text-amber-500/60 mb-2" />
                    <p className="text-xs font-bold text-amber-800">Không tìm thấy lớp học nào</p>
                    <p className="text-[11px] text-amber-600/80 max-w-xs">Giáo viên này hiện chưa được liên kết với bất kỳ lớp học, bài kiểm tra hay bài học nào trong hệ thống.</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    <div className="flex items-center justify-between text-xs font-bold text-slate-500">
                      <span>Các lớp đang phụ trách ({teacherClasses.length}):</span>
                      <span className="text-indigo-600">Dữ liệu thực tế</span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-[220px] overflow-y-auto pr-1.5 custom-scrollbar">
                      {teacherClasses.map((cls) => (
                        <div key={cls.className} className="p-3 bg-white border border-slate-200 rounded-2xl shadow-sm hover:border-indigo-200 transition-all">
                          <div className="flex items-start justify-between gap-2">
                            <span className="text-sm font-extrabold text-slate-800 font-mono bg-slate-50 px-2 py-0.5 rounded-lg border border-slate-100">
                              Lớp {cls.className}
                            </span>
                            <div className="flex flex-wrap gap-1">
                              {cls.sources.map(src => (
                                <span key={src} className={`text-[9px] font-bold px-1.5 py-0.5 rounded-md border ${
                                  src === 'profile'
                                    ? 'bg-purple-50 text-purple-700 border-purple-150'
                                    : src === 'session'
                                    ? 'bg-blue-50 text-blue-700 border-blue-150'
                                    : 'bg-emerald-50 text-emerald-700 border-emerald-150'
                                }`}>
                                  {src === 'profile' ? 'Hồ sơ' : src === 'session' ? 'Lớp học' : 'Bài tập'}
                                </span>
                              ))}
                            </div>
                          </div>

                          <div className="mt-2 flex items-center justify-between text-[11px] text-slate-500">
                            <span>Bài giảng trực tuyến:</span>
                            <span className="font-bold text-slate-700">{cls.sessionsCount} bài</span>
                          </div>
                          <div className="flex items-center justify-between text-[11px] text-slate-500">
                            <span>Nhiệm vụ & Bài tập:</span>
                            <span className="font-bold text-slate-700">{cls.assignmentsCount} bài</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

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

      {/* TAB 3: RESOURCE AUDIT CONSOLE */}
      {activeTab === 'resources' && (
        <div className="space-y-6">
          {/* Audit Dashboard Overview Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
            <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600 font-bold shrink-0">
                <Layers className="w-5 h-5" />
              </div>
              <div>
                <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Tổng tài nguyên</p>
                <p className="text-xl font-black text-slate-900">{rawAuditItems.length}</p>
              </div>
            </div>

            <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-blue-50 border border-blue-100 flex items-center justify-center text-blue-600 font-bold shrink-0">
                <FileText className="w-5 h-5" />
              </div>
              <div>
                <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Bài tập & Đề thi</p>
                <p className="text-xl font-black text-slate-900">{assignments.length}</p>
              </div>
            </div>

            <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-purple-50 border border-purple-100 flex items-center justify-center text-purple-600 font-bold shrink-0">
                <Cpu className="w-5 h-5" />
              </div>
              <div>
                <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Mô phỏng HTML5</p>
                <p className="text-xl font-black text-slate-900">{simulations.length}</p>
              </div>
            </div>

            <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-amber-50 border border-amber-100 flex items-center justify-center text-amber-600 font-bold shrink-0">
                <Calendar className="w-5 h-5" />
              </div>
              <div>
                <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Buổi học / Lịch</p>
                <p className="text-xl font-black text-slate-900">{classes.length}</p>
              </div>
            </div>

            <div className="col-span-2 sm:col-span-1 bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-50 border border-emerald-100 flex items-center justify-center text-emerald-600 font-bold shrink-0">
                <UploadCloud className="w-5 h-5" />
              </div>
              <div>
                <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Bài nộp học sinh</p>
                <p className="text-xl font-black text-slate-900">{submissions?.length || 0}</p>
              </div>
            </div>
          </div>

          {/* Search, Filter & Controls Bar */}
          <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-sm space-y-4">
            <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4">
              {/* Search Box */}
              <div className="relative flex-1">
                <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Tìm theo tên bài đăng, người tải lên, tên lớp, ID..."
                  value={resSearchTerm}
                  onChange={(e) => setResSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-2xl text-xs font-medium focus:bg-white focus:ring-2 focus:ring-indigo-500 transition-all outline-none"
                />
                {resSearchTerm && (
                  <button 
                    onClick={() => setResSearchTerm('')}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-1"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>

              {/* Uploader Dropdown */}
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-slate-500 whitespace-nowrap">Người đăng:</span>
                <select
                  value={resUploaderFilter}
                  onChange={(e) => setResUploaderFilter(e.target.value)}
                  className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 outline-none focus:ring-2 focus:ring-indigo-500 cursor-pointer"
                >
                  <option value="all">Tất cả người đăng ({uniqueUploaders.length})</option>
                  {uniqueUploaders.map((name) => (
                    <option key={name} value={name}>{name}</option>
                  ))}
                </select>
              </div>

              {/* Sort Order */}
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-slate-500 whitespace-nowrap">Sắp xếp:</span>
                <select
                  value={resSortOrder}
                  onChange={(e) => setResSortOrder(e.target.value as any)}
                  className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 outline-none focus:ring-2 focus:ring-indigo-500 cursor-pointer"
                >
                  <option value="newest">⏰ Mới nhất trước</option>
                  <option value="oldest">⌛ Cũ nhất trước</option>
                  <option value="title">🔤 Theo tên (A-Z)</option>
                </select>
              </div>

              {/* Display Mode Toggle */}
              <div className="flex items-center bg-slate-100 p-1 rounded-xl shrink-0">
                <button
                  onClick={() => setResDisplayMode('table')}
                  className={`px-3 py-1.5 text-xs font-bold rounded-lg flex items-center gap-1.5 transition-all ${
                    resDisplayMode === 'table' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'
                  }`}
                >
                  <ListFilter className="w-3.5 h-3.5" />
                  Bảng
                </button>
                <button
                  onClick={() => setResDisplayMode('cards')}
                  className={`px-3 py-1.5 text-xs font-bold rounded-lg flex items-center gap-1.5 transition-all ${
                    resDisplayMode === 'cards' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'
                  }`}
                >
                  <LayoutGrid className="w-3.5 h-3.5" />
                  Thẻ
                </button>
              </div>
            </div>

            {/* Category Filter Pills */}
            <div className="flex items-center gap-2 overflow-x-auto pb-1 pt-2 scrollbar-none">
              {[
                { key: 'all', label: `Tất cả (${rawAuditItems.length})`, icon: Layers },
                { key: 'assignment', label: `Bài tập / Đề thi (${assignments.length})`, icon: FileText },
                { key: 'simulation', label: `Mô phỏng HTML5 (${simulations.length})`, icon: Cpu },
                { key: 'class', label: `Lịch / Buổi học (${classes.length})`, icon: Calendar },
                { key: 'submission', label: `Bài nộp học sinh (${submissions?.length || 0})`, icon: UploadCloud },
              ].map((btn) => {
                const Icon = btn.icon;
                const isSelected = resCategoryFilter === btn.key;
                return (
                  <button
                    key={btn.key}
                    onClick={() => setResCategoryFilter(btn.key as any)}
                    className={`px-3.5 py-1.5 rounded-full text-xs font-bold flex items-center gap-1.5 whitespace-nowrap transition-all ${
                      isSelected
                        ? 'bg-indigo-600 text-white shadow-sm'
                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                    }`}
                  >
                    <Icon className="w-3.5 h-3.5" />
                    {btn.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Audit Items Render (Table / Grid) */}
          {/* BULK ACTIONS TOOLBAR */}
          {selectedItemKeys.length > 0 && (
            <div className="bg-slate-900 text-white p-3.5 sm:p-4 rounded-2xl shadow-xl flex flex-wrap items-center justify-between gap-3 border border-slate-700 animate-in fade-in slide-in-from-top-2 duration-200">
              <div className="flex items-center gap-2.5 font-bold text-xs sm:text-sm">
                <span className="w-8 h-8 rounded-xl bg-amber-500/20 text-amber-400 flex items-center justify-center font-black">
                  ✓
                </span>
                <span>Đã chọn <strong className="text-amber-400 font-extrabold text-sm">{selectedItemKeys.length}</strong> tài nguyên</span>
              </div>

              <div className="flex items-center gap-2 flex-wrap">
                <button
                  type="button"
                  onClick={() => setIsBatchAssignModalOpen(true)}
                  className="px-3.5 py-2 bg-amber-500 hover:bg-amber-600 active:scale-95 text-slate-950 font-extrabold text-xs rounded-xl shadow-xs transition-all flex items-center gap-1.5 cursor-pointer"
                  title="Thay đổi quyền / Phân bổ lớp hàng loạt cho tất cả mục đã chọn"
                >
                  <Shield className="w-4 h-4" />
                  <span>⚡ Phân bổ lớp hàng loạt</span>
                </button>

                <button
                  type="button"
                  disabled={isBatchDeleting}
                  onClick={handleBatchDelete}
                  className="px-3.5 py-2 bg-rose-600 hover:bg-rose-700 active:scale-95 text-white font-extrabold text-xs rounded-xl shadow-xs transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                  title="Xóa tất cả các mục đã chọn"
                >
                  <Trash2 className="w-4 h-4" />
                  <span>{isBatchDeleting ? 'Đang xóa...' : `🗑️ Xóa hàng loạt (${selectedItemKeys.length})`}</span>
                </button>

                <button
                  type="button"
                  onClick={() => setSelectedItemKeys([])}
                  className="px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs rounded-xl transition-all cursor-pointer"
                >
                  Bỏ chọn
                </button>
              </div>
            </div>
          )}

          {filteredAuditItems.length === 0 ? (
            <div className="bg-white p-12 rounded-3xl border border-slate-200 text-center space-y-3">
              <div className="w-12 h-12 bg-slate-100 text-slate-400 rounded-full flex items-center justify-center mx-auto">
                <Search className="w-6 h-6" />
              </div>
              <p className="font-bold text-slate-700 text-sm">Không tìm thấy tài nguyên phù hợp</p>
              <p className="text-xs text-slate-400 max-w-sm mx-auto">
                Thử thay đổi từ khóa tìm kiếm hoặc bỏ chọn các bộ lọc theo loại/người đăng.
              </p>
            </div>
          ) : resDisplayMode === 'table' ? (
            /* Table View */
            <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-50/80 border-b border-slate-200 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                      <th className="py-3.5 px-3 w-10 text-center">
                        <input
                          type="checkbox"
                          checked={filteredAuditItems.length > 0 && filteredAuditItems.every(i => selectedItemKeys.includes(`${i.collectionName}_${i.id}`))}
                          onChange={() => {
                            const isAll = filteredAuditItems.length > 0 && filteredAuditItems.every(i => selectedItemKeys.includes(`${i.collectionName}_${i.id}`));
                            if (isAll) {
                              setSelectedItemKeys([]);
                            } else {
                              setSelectedItemKeys(filteredAuditItems.map(i => `${i.collectionName}_${i.id}`));
                            }
                          }}
                          className="w-4 h-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                          title="Chọn / Bỏ chọn tất cả"
                        />
                      </th>
                      <th className="py-3.5 px-4">Tài nguyên & Mã Firestore</th>
                      <th className="py-3.5 px-4">Người tải lên / Tác giả</th>
                      <th className="py-3.5 px-4">Thời gian ghi nhận</th>
                      <th className="py-3.5 px-4">Thông số / Phạm vi</th>
                      <th className="py-3.5 px-4 text-right">Thao tác Admin</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-xs font-medium">
                    {filteredAuditItems.map((item) => {
                      const itemKey = `${item.collectionName}_${item.id}`;
                      const isSelected = selectedItemKeys.includes(itemKey);

                      return (
                        <tr key={itemKey} className={`transition-colors ${isSelected ? 'bg-indigo-50/60' : 'hover:bg-slate-50/60'}`}>
                          {/* Checkbox Cell */}
                          <td className="py-3.5 px-3 text-center">
                            <input
                              type="checkbox"
                              checked={isSelected}
                              onChange={() => toggleSelectItem(itemKey)}
                              className="w-4 h-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                            />
                          </td>

                          {/* Title & Category Badge */}
                          <td className="py-3.5 px-4">
                            <div className="flex items-start gap-3">
                              <div className={`p-2 rounded-xl shrink-0 mt-0.5 ${
                                item.categoryType === 'assignment' ? 'bg-blue-50 text-blue-600' :
                                item.categoryType === 'simulation' ? 'bg-purple-50 text-purple-600' :
                                item.categoryType === 'class' ? 'bg-amber-50 text-amber-600' :
                                'bg-emerald-50 text-emerald-600'
                              }`}>
                                {item.categoryType === 'assignment' && <FileText className="w-4 h-4" />}
                                {item.categoryType === 'simulation' && <Cpu className="w-4 h-4" />}
                                {item.categoryType === 'class' && <Calendar className="w-4 h-4" />}
                                {item.categoryType === 'submission' && <UploadCloud className="w-4 h-4" />}
                              </div>
                              <div className="space-y-0.5 max-w-md">
                                <p className="font-bold text-slate-900 text-xs line-clamp-1">{item.title}</p>
                                <div className="flex items-center gap-2">
                                  <span className="inline-block text-[10px] font-bold px-2 py-0.5 rounded-md bg-slate-100 text-slate-600">
                                    {item.categoryLabel}
                                  </span>
                                  <span className="text-[10px] text-slate-400 font-mono">ID: {item.id}</span>
                                </div>
                              </div>
                            </div>
                          </td>

                          {/* Uploader Info */}
                          <td className="py-3.5 px-4 whitespace-nowrap">
                            <div className="flex items-center gap-2">
                              <div className="w-7 h-7 rounded-full bg-indigo-100 text-indigo-700 font-black text-xs flex items-center justify-center">
                                {item.uploaderName.charAt(0).toUpperCase()}
                              </div>
                              <div>
                                <p className="font-bold text-slate-800 text-xs">{item.uploaderName}</p>
                                <span className={`text-[9px] font-extrabold px-1.5 py-0.2 rounded uppercase ${
                                  item.uploaderRole === 'student' ? 'bg-amber-50 text-amber-700' : 'bg-indigo-50 text-indigo-700'
                                }`}>
                                  {item.uploaderRole === 'student' ? 'Học sinh' : 'Giáo viên'}
                                </span>
                              </div>
                            </div>
                          </td>

                          {/* Timestamp Info */}
                          <td className="py-3.5 px-4 whitespace-nowrap">
                            <div className="space-y-0.5">
                              <p className="font-bold text-slate-800 text-xs flex items-center gap-1">
                                <Clock className="w-3 h-3 text-slate-400" />
                                {item.createdAtFormatted}
                              </p>
                              {item.relativeTime && (
                                <p className="text-[10px] font-semibold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-full inline-block">
                                  {item.relativeTime}
                                </p>
                              )}
                            </div>
                          </td>

                          {/* Specific Details */}
                          <td className="py-3.5 px-4 text-slate-600">
                            <div className="space-y-0.5 text-xs">
                              {item.classSessionTitle && (
                                <p className="text-[11px] font-semibold text-slate-700">🏫 Lớp: {item.classSessionTitle}</p>
                              )}
                              {item.details.questionCount > 0 && (
                                <p className="text-[11px] text-slate-500">❓ {item.details.questionCount} câu hỏi trắc nghiệm</p>
                              )}
                              {item.details.dueDate && (
                                <p className="text-[11px] text-slate-500">⏳ Hạn: {item.details.dueDate}</p>
                              )}
                              {item.details.grade !== undefined && (
                                <p className="text-[11px] font-bold text-emerald-600">💯 Điểm: {item.details.grade}</p>
                              )}
                            </div>
                          </td>

                          {/* Admin Action Buttons */}
                          <td className="py-3.5 px-4 text-right whitespace-nowrap">
                            <div className="flex items-center justify-end gap-1.5">
                              <button
                                onClick={() => handleOpenAssignModal(item)}
                                className="px-2.5 py-1.5 bg-amber-50 hover:bg-amber-100 text-amber-800 font-bold text-xs rounded-xl transition-colors flex items-center gap-1"
                                title="Thiết lập phân bổ tài nguyên cho lớp học phù hợp"
                              >
                                <Shield className="w-3.5 h-3.5 text-amber-600" />
                                Phân bổ lớp
                              </button>
                              <button
                                onClick={() => setInspectItem(item)}
                                className="px-2.5 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-bold text-xs rounded-xl transition-colors flex items-center gap-1"
                                title="Xem chi tiết thông tin nhật ký"
                              >
                                <Eye className="w-3.5 h-3.5" />
                                Chi tiết
                              </button>
                              <button
                                onClick={() => setDeleteConfirmResource({ id: item.id, title: item.title, collectionName: item.collectionName })}
                                className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-colors"
                                title="Xóa tài nguyên khỏi hệ thống"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          ) : (
            /* Cards View */
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredAuditItems.map((item) => (
                <div key={`${item.collectionName}_${item.id}`} className="bg-white p-5 rounded-3xl border border-slate-200 shadow-sm space-y-3 hover:border-indigo-200 transition-all">
                  <div className="flex items-start justify-between gap-2">
                    <span className={`text-[10px] font-bold px-2.5 py-1 rounded-full uppercase flex items-center gap-1 ${
                      item.categoryType === 'assignment' ? 'bg-blue-50 text-blue-700' :
                      item.categoryType === 'simulation' ? 'bg-purple-50 text-purple-700' :
                      item.categoryType === 'class' ? 'bg-amber-50 text-amber-700' :
                      'bg-emerald-50 text-emerald-700'
                    }`}>
                      {item.categoryType === 'assignment' && <FileText className="w-3 h-3" />}
                      {item.categoryType === 'simulation' && <Cpu className="w-3 h-3" />}
                      {item.categoryType === 'class' && <Calendar className="w-3 h-3" />}
                      {item.categoryType === 'submission' && <UploadCloud className="w-3 h-3" />}
                      {item.categoryLabel}
                    </span>

                    <span className="text-[10px] font-mono text-slate-400">ID: {item.id.slice(0, 8)}...</span>
                  </div>

                  <h4 className="font-bold text-slate-900 text-sm line-clamp-2">{item.title}</h4>

                  <div className="p-3 bg-slate-50 rounded-2xl border border-slate-100 space-y-2 text-xs">
                    <div className="flex items-center justify-between">
                      <span className="text-slate-500 font-medium">Tác giả đăng:</span>
                      <span className="font-bold text-slate-800">{item.uploaderName}</span>
                    </div>

                    <div className="flex items-center justify-between">
                      <span className="text-slate-500 font-medium">Thời gian:</span>
                      <span className="font-bold text-indigo-600">{item.createdAtFormatted}</span>
                    </div>

                    {item.classSessionTitle && (
                      <div className="flex items-center justify-between">
                        <span className="text-slate-500 font-medium">Phạm vi / Lớp:</span>
                        <span className="font-medium text-slate-700">{item.classSessionTitle}</span>
                      </div>
                    )}
                  </div>

                  <div className="flex items-center justify-between pt-1 border-t border-slate-100">
                    <button
                      onClick={() => handleOpenAssignModal(item)}
                      className="px-3 py-1.5 bg-amber-50 hover:bg-amber-100 text-amber-800 font-bold text-xs rounded-xl transition-colors flex items-center gap-1"
                    >
                      <Shield className="w-3.5 h-3.5 text-amber-600" />
                      Phân bổ lớp
                    </button>
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => setInspectItem(item)}
                        className="px-3 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-bold text-xs rounded-xl transition-colors flex items-center gap-1"
                      >
                        <Eye className="w-3.5 h-3.5" />
                        Chi tiết
                      </button>
                      <button
                        onClick={() => setDeleteConfirmResource({ id: item.id, title: item.title, collectionName: item.collectionName })}
                        className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-colors"
                        title="Xóa tài nguyên"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* TAB 4: SYSTEM NOTIFICATIONS */}
      {activeTab === 'notifications' && (
        <NotificationsManagerView
          user={user}
          loveLetters={loveLetters}
          usersList={usersList}
          classesList={classes.map(c => c.title || c.id)}
        />
      )}

      {/* TAB 5: LOVE LETTERS */}
      {activeTab === 'letters' && (
        <LoveLetterManager
          currentUser={user}
          letters={loveLetters}
          usersList={usersList}
          classesList={classes.map(c => c.title || c.id)}
          showNotify={showNotify}
        />
      )}

      {/* TAB 6: ACTIVITY LOGS */}
      {activeTab === 'logs' && (
        <ActivityLogsView
          currentUser={user}
        />
      )}

      {/* TAB 7: GAME STATUS MANAGEMENT */}
      {activeTab === 'games' && (
        <div className="space-y-6">
          {/* Header Dashboard Banner */}
          <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white p-6 rounded-3xl shadow-xl border border-indigo-900/50 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
            <div className="space-y-2 max-w-2xl">
              <div className="flex items-center gap-2">
                <span className="px-3 py-1 bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-xs font-black uppercase tracking-wider rounded-full flex items-center gap-1.5">
                  <Radio className="w-3.5 h-3.5 animate-pulse" /> Control Center
                </span>
                <span className="px-3 py-1 bg-white/10 text-white/80 text-xs font-bold rounded-full">
                  Real-time Sync
                </span>
              </div>
              <h3 className="text-xl sm:text-2xl font-black flex items-center gap-2 text-white">
                <span>🎮</span> Quản Lý Trạng Thái Game (On Air / Coming Soon)
              </h3>
              <p className="text-xs sm:text-sm text-slate-300 leading-relaxed font-medium">
                Admin được quyền **tạo & thử nghiệm tất cả game** (kể cả game Coming Soon). Khi game hoàn thiện thử nghiệm, Admin có thể **Bật On Air** để mở cho Giáo viên sử dụng ngay lập tức.
              </p>
            </div>

            {/* Quick Stat Cards */}
            <div className="flex items-center gap-3 shrink-0 w-full md:w-auto">
              <div className="flex-1 md:flex-initial bg-white/10 backdrop-blur-md border border-white/10 p-3.5 rounded-2xl text-center min-w-[100px]">
                <div className="text-2xl font-black text-white">
                  {Object.keys(gameStatuses).length}
                </div>
                <div className="text-[10px] font-bold text-slate-300 uppercase tracking-wider mt-0.5">Tổng số Game</div>
              </div>

              <div className="flex-1 md:flex-initial bg-emerald-500/20 backdrop-blur-md border border-emerald-500/30 p-3.5 rounded-2xl text-center min-w-[100px]">
                <div className="text-2xl font-black text-emerald-400 flex items-center justify-center gap-1">
                  <span>📡</span>
                  <span>{Object.values(gameStatuses).filter(s => s === 'on_air').length}</span>
                </div>
                <div className="text-[10px] font-bold text-emerald-200 uppercase tracking-wider mt-0.5">Đang On Air</div>
              </div>

              <div className="flex-1 md:flex-initial bg-amber-500/20 backdrop-blur-md border border-amber-500/30 p-3.5 rounded-2xl text-center min-w-[100px]">
                <div className="text-2xl font-black text-amber-300 flex items-center justify-center gap-1">
                  <span>🔒</span>
                  <span>{Object.values(gameStatuses).filter(s => s === 'coming_soon').length}</span>
                </div>
                <div className="text-[10px] font-bold text-amber-200 uppercase tracking-wider mt-0.5">Coming Soon</div>
              </div>
            </div>
          </div>

          {/* Filter & Search Toolbar */}
          <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="relative w-full sm:w-80">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Tìm tên game..."
                value={adminGameSearch}
                onChange={(e) => setAdminGameSearch(e.target.value)}
                className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:outline-none focus:border-indigo-500 focus:bg-white transition-all"
              />
              {adminGameSearch && (
                <button onClick={() => setAdminGameSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            <div className="flex items-center gap-2 w-full sm:w-auto">
              <button
                onClick={() => setAdminGameStatusFilter('all')}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all border ${adminGameStatusFilter === 'all' ? 'bg-indigo-600 text-white border-indigo-600 shadow-sm' : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'}`}
              >
                Tất cả ({Object.keys(gameStatuses).length})
              </button>
              <button
                onClick={() => setAdminGameStatusFilter('on_air')}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all border flex items-center gap-1.5 ${adminGameStatusFilter === 'on_air' ? 'bg-emerald-600 text-white border-emerald-600 shadow-sm' : 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100'}`}
              >
                <Radio className="w-3.5 h-3.5" /> On Air ({Object.values(gameStatuses).filter(s => s === 'on_air').length})
              </button>
              <button
                onClick={() => setAdminGameStatusFilter('coming_soon')}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all border flex items-center gap-1.5 ${adminGameStatusFilter === 'coming_soon' ? 'bg-amber-500 text-white border-amber-500 shadow-sm' : 'bg-amber-50 text-amber-700 border-amber-200 hover:bg-amber-100'}`}
              >
                <Lock className="w-3.5 h-3.5" /> Coming Soon ({Object.values(gameStatuses).filter(s => s === 'coming_soon').length})
              </button>
            </div>
          </div>

          {/* Games Grid List */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {[
              { id: 'quiz_nghieng_dau', name: 'Quiz Nghiêng Đầu', category: 'AI Camera', desc: 'Sử dụng camera nghiêng đầu để chọn đáp án A, B, C, D', emoji: '🧠' },
              { id: 'cuoc_dua_ngon_tay', name: 'Cuộc Đua Ngón Tay', category: 'Tốc độ', desc: 'Đua xe trả lời đúng để bứt tốc vượt đối thủ', emoji: '🏎️' },
              { id: 'do_min', name: 'Dò Mìn', category: 'Giải đố', desc: 'Dò mìn an toàn thông qua giải toán', emoji: '💣' },
              { id: 'doan_tau_tri_thuc', name: 'Đoàn Tàu Tri Thức', category: 'Giải đố', desc: 'Đưa đoàn tàu vượt các ga học liệu', emoji: '🚂' },
              { id: 'keo_co', name: 'Kéo Co Kiến Thức', category: 'Tốc độ', desc: 'Đấu trí kéo co kịch tính', emoji: '🪢' },
              { id: 'game_map', name: 'Game Map (Bản đồ thử thách)', category: 'Phiêu lưu', desc: 'Bản đồ truy tìm kho báu toán học cổ xưa', emoji: '🗺️' },
              { id: 'tu_ngu_biet_bay', name: 'Từ Ngữ Biết Bay', category: 'Phiêu lưu', desc: 'Chạm từ chuyển động đúng chính tả', emoji: '🛸' },
              { id: 'keo_tha_noi_y', name: 'Kéo Thả Nối Ý', category: 'Phiêu lưu', desc: 'Ghép nối vế trái logic với vế phải', emoji: '🔗' },
              { id: 'o_chu_khoa', name: 'Ô Chữ Khóa Bí Mật', category: 'Giải đố', desc: 'Giải ô chữ giải mã từ khóa cốt lõi', emoji: '🔐' },
              { id: 'san_kho_bau', name: 'Săn Kho Báu', category: 'Phiêu lưu', desc: 'Săn rương vàng cổ vật thử thách toán học', emoji: '🏴‍☠️' },
              { id: 'lat_manh_ghep', name: 'Lật Mảnh Ghép', category: 'Giải đố', desc: 'Lật và ghép nối các cặp câu hỏi', emoji: '🧩' },
              { id: 'domino', name: 'Đấu Trường Domino', category: 'Giải đố', desc: 'Chuỗi ghép nối domino liên tiếp', emoji: '🀄' },
              { id: 'dao_chu', name: 'Đảo Chữ Anagram', category: 'Giải đố', desc: 'Xáo trộn ký tự xếp thuật ngữ', emoji: '🔠' },
              { id: 'mo_hop', name: 'Mở Hộp Bí Mật', category: 'Giải đố', desc: 'Hộp quà thử thách toán học bất ngờ', emoji: '🎁' },
              { id: 'gan_nhan_so_do', name: 'Gắn Nhãn Sơ Đồ', category: 'Phiêu lưu', desc: 'Gắn nhãn vào sơ đồ hình học', emoji: '📊' },
              { id: 'no_bong_bay', name: 'Nổ Bóng Bay', category: 'Tốc độ', desc: 'Chạm nổ bóng bay đáp án đúng', emoji: '🎈' },
              { id: 'dap_chuot_chui', name: 'Đập Chuột Chũi', category: 'Tốc độ', desc: 'Đập búa chú chuột mang đáp án đúng', emoji: '🔨' }
            ].filter(g => {
              const st = gameStatuses[g.id] || 'coming_soon';
              if (adminGameStatusFilter !== 'all' && st !== adminGameStatusFilter) return false;
              if (adminGameSearch && !g.name.toLowerCase().includes(adminGameSearch.toLowerCase()) && !g.desc.toLowerCase().includes(adminGameSearch.toLowerCase())) return false;
              return true;
            }).map(g => {
              const st = gameStatuses[g.id] || 'coming_soon';
              const isComingSoon = st === 'coming_soon';

              return (
                <div
                  key={g.id}
                  className={`p-4 rounded-2xl border-2 transition-all flex flex-col justify-between gap-3 ${
                    isComingSoon
                      ? 'bg-amber-50/40 border-amber-200 hover:border-amber-300'
                      : 'bg-emerald-50/30 border-emerald-200 hover:border-emerald-300'
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <div className="w-12 h-12 rounded-2xl bg-white border border-slate-200 shadow-sm flex items-center justify-center text-2xl shrink-0">
                      {g.emoji}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-1">
                        <h4 className="font-extrabold text-slate-800 text-sm truncate">{g.name}</h4>
                        <span className="text-[10px] bg-white border border-slate-200 text-slate-500 font-bold px-2 py-0.5 rounded-md shrink-0">
                          {g.category}
                        </span>
                      </div>
                      <p className="text-xs text-slate-500 font-medium mt-1 leading-snug line-clamp-2">
                        {g.desc}
                      </p>
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center justify-between gap-2 pt-3 border-t border-slate-200/80">
                    <div className="flex items-center gap-1.5">
                      {isComingSoon ? (
                        <span className="inline-flex items-center gap-1 text-[11px] bg-amber-100 text-amber-800 border border-amber-300 font-bold px-2 py-0.5 rounded-xl">
                          <Lock className="w-3 h-3 text-amber-600" />
                          <span>Coming Soon</span>
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-[11px] bg-emerald-100 text-emerald-800 border border-emerald-300 font-bold px-2 py-0.5 rounded-xl">
                          <Radio className="w-3 h-3 text-emerald-600 animate-pulse" />
                          <span>On Air</span>
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          setAdminPreviewGame({
                            id: g.id,
                            name: g.name,
                            emoji: g.emoji,
                            category: g.category,
                            desc: g.desc,
                            tugOfWarMode: 'bot'
                          });
                        }}
                        className="px-3 py-1.5 rounded-xl text-xs font-black bg-indigo-600 hover:bg-indigo-700 active:scale-95 text-white transition-all shadow-sm border border-indigo-500 flex items-center gap-1.5 shrink-0"
                        title="Chạy thử nghiệm trò chơi học tập này"
                      >
                        <Play className="w-3.5 h-3.5 fill-white" />
                        <span>Chạy Thử</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          toggleGameStatus(g.id);
                          showNotify('success', `Đã chuyển trạng thái game "${g.name}" sang ${isComingSoon ? 'On Air (Cho GV dùng)' : 'Coming Soon'}`);
                        }}
                        className={`px-3 py-1.5 rounded-xl text-xs font-black transition-all shadow-sm border flex items-center gap-1.5 shrink-0 active:scale-95 ${
                          isComingSoon
                            ? 'bg-emerald-600 hover:bg-emerald-700 text-white border-emerald-700 hover:shadow-emerald-200'
                            : 'bg-amber-100 hover:bg-amber-200 text-amber-900 border-amber-300'
                        }`}
                      >
                        {isComingSoon ? (
                          <>
                            <Radio className="w-3.5 h-3.5 text-white" />
                            <span>Bật On Air</span>
                          </>
                        ) : (
                          <>
                            <Lock className="w-3.5 h-3.5 text-amber-700" />
                            <span>Chuyển Coming Soon</span>
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ADMIN GAME PREVIEW MODAL / OVERLAY */}
      {adminPreviewGame && (
        <div className="fixed inset-0 bg-slate-950/90 backdrop-blur-md z-[99999] flex flex-col p-2 sm:p-4 overflow-hidden animate-in fade-in duration-200">
          {/* Top Admin Sandbox Control Bar */}
          <div className="bg-slate-900 border border-slate-700/80 rounded-2xl p-3 mb-2 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shrink-0 shadow-xl">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-indigo-600/30 border border-indigo-500/50 flex items-center justify-center text-xl shrink-0">
                {adminPreviewGame.emoji}
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="px-2 py-0.5 bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 text-[10px] font-black uppercase tracking-wider rounded-md">
                    🎯 Admin Sandbox Preview
                  </span>
                  {gameStatuses[adminPreviewGame.id] === 'coming_soon' ? (
                    <span className="inline-flex items-center gap-1 text-[10px] bg-amber-500/20 text-amber-300 border border-amber-500/30 font-extrabold px-2 py-0.5 rounded-md">
                      <Lock className="w-3 h-3 text-amber-400" /> Coming Soon
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 text-[10px] bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 font-extrabold px-2 py-0.5 rounded-md">
                      <Radio className="w-3.5 h-3.5 text-emerald-400 animate-pulse" /> On Air
                    </span>
                  )}
                </div>
                <h3 className="text-white font-extrabold text-sm sm:text-base flex items-center gap-1.5 mt-0.5">
                  <span>Trải nghiệm chạy thử: {adminPreviewGame.name}</span>
                </h3>
              </div>
            </div>

            <div className="flex items-center gap-2.5 w-full sm:w-auto justify-end">
              {/* If Tug of War, allow mode switch */}
              {adminPreviewGame.id === 'keo_co' && (
                <div className="flex items-center gap-1 bg-slate-800 p-1 rounded-xl border border-slate-700">
                  <button
                    type="button"
                    onClick={() => setAdminPreviewGame(prev => prev ? { ...prev, tugOfWarMode: 'bot' } : null)}
                    className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all ${adminPreviewGame.tugOfWarMode === 'bot' ? 'bg-indigo-600 text-white shadow-xs' : 'text-slate-400 hover:text-white'}`}
                  >
                    🤖 Đấu BOT
                  </button>
                  <button
                    type="button"
                    onClick={() => setAdminPreviewGame(prev => prev ? { ...prev, tugOfWarMode: 'pvp' } : null)}
                    className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all ${adminPreviewGame.tugOfWarMode === 'pvp' ? 'bg-indigo-600 text-white shadow-xs' : 'text-slate-400 hover:text-white'}`}
                  >
                    ⚔️ Đấu PvP
                  </button>
                </div>
              )}

              {/* One-click Toggle On Air / Coming Soon */}
              <button
                type="button"
                onClick={() => {
                  const currentSt = gameStatuses[adminPreviewGame.id] || 'coming_soon';
                  const nextSt = currentSt === 'coming_soon' ? 'On Air (Cho GV dùng)' : 'Coming Soon';
                  toggleGameStatus(adminPreviewGame.id);
                  showNotify('success', `Đã chuyển game "${adminPreviewGame.name}" sang ${nextSt}`);
                }}
                className={`px-3 py-1.5 rounded-xl text-xs font-black transition-all border flex items-center gap-1.5 shadow-sm active:scale-95 ${
                  gameStatuses[adminPreviewGame.id] === 'coming_soon'
                    ? 'bg-emerald-600 hover:bg-emerald-500 text-white border-emerald-500'
                    : 'bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border-amber-500/40'
                }`}
              >
                {gameStatuses[adminPreviewGame.id] === 'coming_soon' ? (
                  <>
                    <Radio className="w-3.5 h-3.5 text-white" />
                    <span>Bật On Air ngay</span>
                  </>
                ) : (
                  <>
                    <Lock className="w-3.5 h-3.5 text-amber-400" />
                    <span>Khóa về Coming Soon</span>
                  </>
                )}
              </button>

              {/* Close Button */}
              <button
                type="button"
                onClick={() => setAdminPreviewGame(null)}
                className="p-2 bg-slate-800 hover:bg-rose-600/80 text-slate-300 hover:text-white rounded-xl transition-all border border-slate-700 flex items-center justify-center shrink-0"
                title="Thoát chế độ chạy thử (Esc)"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Game Canvas Container */}
          <div className="flex-1 min-h-0 w-full bg-slate-900 rounded-2xl overflow-hidden border border-slate-800 relative">
            <GamePreview
              gameType={adminPreviewGame.id}
              questions={getSampleQuestionsForGame(adminPreviewGame.id)}
              tugOfWarMode={adminPreviewGame.tugOfWarMode}
              onClose={() => setAdminPreviewGame(null)}
            />
          </div>
        </div>
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

      {/* MODAL: RESOURCE AUDIT DETAIL INSPECTION */}
      {inspectItem && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[110] flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl max-w-2xl w-full p-6 border border-slate-200 shadow-2xl space-y-6 max-h-[90vh] overflow-y-auto">
            <div className="flex items-start justify-between border-b border-slate-100 pb-4">
              <div className="space-y-1">
                <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-md bg-indigo-50 text-indigo-700 uppercase">
                  {inspectItem.categoryLabel}
                </span>
                <h3 className="font-extrabold text-slate-900 text-lg">{inspectItem.title}</h3>
                <p className="text-xs text-slate-400 font-mono">Firestore Doc ID: {inspectItem.id}</p>
              </div>
              <button
                onClick={() => setInspectItem(null)}
                className="p-1.5 text-slate-400 hover:text-slate-600 rounded-xl"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Audit Log Box */}
            <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 space-y-3">
              <h4 className="text-xs font-black uppercase text-slate-500 tracking-wider flex items-center gap-1.5">
                <Clock className="w-4 h-4 text-indigo-600" />
                Thông Tin Nhật Ký Tải Lên System Audit
              </h4>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                <div className="bg-white p-3 rounded-xl border border-slate-100 space-y-1">
                  <p className="text-slate-400 font-bold text-[10px] uppercase">Tác giả thực hiện:</p>
                  <p className="font-extrabold text-slate-800 text-sm">{inspectItem.uploaderName}</p>
                  <span className="inline-block text-[10px] font-bold px-2 py-0.5 rounded bg-slate-100 text-slate-600 uppercase">
                    {inspectItem.uploaderRole === 'student' ? 'Học sinh' : 'Giáo viên phụ trách'}
                  </span>
                </div>

                <div className="bg-white p-3 rounded-xl border border-slate-100 space-y-1">
                  <p className="text-slate-400 font-bold text-[10px] uppercase">Thời gian ghi nhận:</p>
                  <p className="font-extrabold text-indigo-600 text-sm">{inspectItem.createdAtFormatted}</p>
                  {inspectItem.relativeTime && (
                    <p className="text-[10px] font-medium text-slate-500">({inspectItem.relativeTime})</p>
                  )}
                </div>

                <div className="bg-white p-3 rounded-xl border border-slate-100 space-y-1">
                  <p className="text-slate-400 font-bold text-[10px] uppercase">Bộ sưu tập Firestore:</p>
                  <p className="font-mono text-slate-700 font-bold">{inspectItem.collectionName}</p>
                </div>

                <div className="bg-white p-3 rounded-xl border border-slate-100 space-y-1">
                  <p className="text-slate-400 font-bold text-[10px] uppercase">Phạm vi / Buổi học:</p>
                  <p className="font-bold text-slate-800">{inspectItem.classSessionTitle || 'Toàn hệ thống'}</p>
                </div>
              </div>
            </div>

            {/* Specific Details Section */}
            <div className="space-y-3">
              <h4 className="text-xs font-black uppercase text-slate-500 tracking-wider">Chi Tiết Nội Dung</h4>

              {inspectItem.details.description && (
                <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200">
                  <p className="text-xs font-bold text-slate-500 mb-1">Mô tả / Lời nhắn:</p>
                  <p className="text-xs text-slate-800 whitespace-pre-wrap leading-relaxed">{inspectItem.details.description}</p>
                </div>
              )}

              {/* PDF link or Simulation URL */}
              {inspectItem.details.pdfUrl && (
                <a
                  href={inspectItem.details.pdfUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="p-3 bg-indigo-50 border border-indigo-200 rounded-xl flex items-center justify-between text-indigo-700 font-bold text-xs hover:bg-indigo-100 transition-colors"
                >
                  <span className="flex items-center gap-2">
                    <FileText className="w-4 h-4" />
                    Mở tệp đính kèm (PDF)
                  </span>
                  <ExternalLink className="w-4 h-4" />
                </a>
              )}

              {inspectItem.details.simulationUrl && (
                <a
                  href={inspectItem.details.simulationUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="p-3 bg-purple-50 border border-purple-200 rounded-xl flex items-center justify-between text-purple-700 font-bold text-xs hover:bg-purple-100 transition-colors"
                >
                  <span className="flex items-center gap-2">
                    <Cpu className="w-4 h-4" />
                    Mở đường dẫn mô phỏng thực tế ảo HTML5
                  </span>
                  <ExternalLink className="w-4 h-4" />
                </a>
              )}

              {/* Questions list if assignment */}
              {inspectItem.categoryType === 'assignment' && inspectItem.rawObj.questions && (
                <div className="space-y-2">
                  <p className="text-xs font-bold text-slate-700">Danh sách câu hỏi trắc nghiệm ({inspectItem.rawObj.questions.length}):</p>
                  <div className="max-h-48 overflow-y-auto space-y-2 pr-1">
                    {inspectItem.rawObj.questions.map((q: any, idx: number) => (
                      <div key={idx} className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-xs space-y-1">
                        <p className="font-bold text-slate-800">Câu {idx + 1}: {q.question}</p>
                        {q.options && q.options.length > 0 && (
                          <div className="grid grid-cols-2 gap-1 text-[11px] text-slate-600 pl-2">
                            {q.options.map((opt: string, optIdx: number) => (
                              <p key={optIdx} className={q.correctAnswer === optIdx ? 'font-bold text-emerald-600' : ''}>
                                {String.fromCharCode(65 + optIdx)}. {opt}
                              </p>
                            ))}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Bottom Actions */}
            <div className="flex items-center justify-between pt-3 border-t border-slate-100">
              <div className="flex items-center gap-2">
                <button
                  onClick={() => handleOpenAssignModal(inspectItem)}
                  className="px-4 py-2 bg-amber-50 hover:bg-amber-100 text-amber-800 font-bold text-xs rounded-xl transition-colors flex items-center gap-1.5"
                >
                  <Shield className="w-4 h-4 text-amber-600" />
                  Thiết lập lớp áp dụng
                </button>
                <button
                  onClick={() => {
                    setDeleteConfirmResource({
                      id: inspectItem.id,
                      title: inspectItem.title,
                      collectionName: inspectItem.collectionName
                    });
                  }}
                  className="px-4 py-2 bg-rose-50 hover:bg-rose-100 text-rose-700 font-bold text-xs rounded-xl transition-colors flex items-center gap-1.5"
                >
                  <Trash2 className="w-4 h-4" />
                  Xóa tài nguyên
                </button>
              </div>

              <button
                onClick={() => setInspectItem(null)}
                className="px-5 py-2 bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs rounded-xl transition-colors"
              >
                Đóng
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: RESOURCE CLASS ALLOCATION SETUP */}
      {assignClassResource && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[120] flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 border border-slate-200 shadow-2xl space-y-5">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <div className="p-2 bg-indigo-50 text-indigo-600 rounded-xl">
                  <Shield className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-extrabold text-slate-900 text-base">Thiết Lập Phân Bổ Lớp Áp Dụng</h3>
                  <p className="text-xs text-slate-500">Quyền Admin nhận định & gán tài nguyên cho lớp học phù hợp</p>
                </div>
              </div>
              <button onClick={() => setAssignClassResource(null)} className="p-1 text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Resource Summary */}
            <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-200 text-xs space-y-1">
              <p className="font-bold text-slate-400 text-[10px] uppercase">Tài nguyên đang chọn:</p>
              <p className="font-extrabold text-slate-900 text-sm line-clamp-1">{assignClassResource.title}</p>
              <div className="flex items-center gap-2 pt-1">
                <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-indigo-100 text-indigo-700">
                  {assignClassResource.categoryLabel}
                </span>
                <span className="text-[10px] text-slate-500">Tác giả: {assignClassResource.uploaderName}</span>
              </div>
            </div>

            {/* Scope Selector Options */}
            <div className="space-y-3">
              <label className="text-xs font-black text-slate-700 uppercase tracking-wider block">
                Chọn Phạm Vi Lớp Học Áp Dụng
              </label>

              <div className="space-y-2 text-xs">
                <label className={`flex items-center justify-between p-3 rounded-2xl border cursor-pointer transition-all ${
                  targetClassScopeOption === 'all' ? 'bg-indigo-50/60 border-indigo-300 font-bold text-indigo-900' : 'bg-white border-slate-200 text-slate-700'
                }`}>
                  <div className="flex items-center gap-2.5">
                    <input
                      type="radio"
                      name="scopeOpt"
                      checked={targetClassScopeOption === 'all'}
                      onChange={() => setTargetClassScopeOption('all')}
                      className="text-indigo-600 focus:ring-indigo-500"
                    />
                    <div>
                      <p className="font-bold">🌐 Toàn bộ học sinh / Tất cả các lớp</p>
                      <p className="text-[11px] text-slate-400 font-normal">Mọi học sinh trên hệ thống đều có thể xem và hoàn thành</p>
                    </div>
                  </div>
                </label>

                <label className={`flex items-center justify-between p-3 rounded-2xl border cursor-pointer transition-all ${
                  targetClassScopeOption === 'specific' ? 'bg-indigo-50/60 border-indigo-300 font-bold text-indigo-900' : 'bg-white border-slate-200 text-slate-700'
                }`}>
                  <div className="flex items-center gap-2.5">
                    <input
                      type="radio"
                      name="scopeOpt"
                      checked={targetClassScopeOption === 'specific'}
                      onChange={() => setTargetClassScopeOption('specific')}
                      className="text-indigo-600 focus:ring-indigo-500"
                    />
                    <div>
                      <p className="font-bold">🏫 Lựa chọn các lớp cụ thể từ danh sách</p>
                      <p className="text-[11px] text-slate-400 font-normal">Tích chọn một hoặc nhiều lớp học trong hệ thống</p>
                    </div>
                  </div>
                </label>

                <label className={`flex items-center justify-between p-3 rounded-2xl border cursor-pointer transition-all ${
                  targetClassScopeOption === 'custom' ? 'bg-indigo-50/60 border-indigo-300 font-bold text-indigo-900' : 'bg-white border-slate-200 text-slate-700'
                }`}>
                  <div className="flex items-center gap-2.5">
                    <input
                      type="radio"
                      name="scopeOpt"
                      checked={targetClassScopeOption === 'custom'}
                      onChange={() => setTargetClassScopeOption('custom')}
                      className="text-indigo-600 focus:ring-indigo-500"
                    />
                    <div>
                      <p className="font-bold">✍️ Tùy chỉnh tên lớp / Khối học đặc biệt</p>
                      <p className="text-[11px] text-slate-400 font-normal">Tự nhập phạm vi (vd: Lớp Chuyên Toán, Đội Tuyển HG, Khối 12...)</p>
                    </div>
                  </div>
                </label>
              </div>

              {/* Specific Classes Selection List */}
              {targetClassScopeOption === 'specific' && (
                <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-200 space-y-2 max-h-40 overflow-y-auto">
                  <p className="text-[11px] font-bold text-slate-500 uppercase">Tích chọn lớp phù hợp:</p>
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    {availableClassOptions.map((clsName) => {
                      const isChecked = selectedClassesList.includes(clsName);
                      return (
                        <label
                          key={clsName}
                          className={`flex items-center gap-2 p-2 rounded-xl border text-xs cursor-pointer transition-colors ${
                            isChecked ? 'bg-indigo-100 border-indigo-300 text-indigo-900 font-bold' : 'bg-white border-slate-200 text-slate-700'
                          }`}
                        >
                          <input
                            type="checkbox"
                            checked={isChecked}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setSelectedClassesList([...selectedClassesList, clsName]);
                              } else {
                                setSelectedClassesList(selectedClassesList.filter(c => c !== clsName));
                              }
                            }}
                            className="rounded text-indigo-600 focus:ring-indigo-500"
                          />
                          <span className="truncate">{clsName}</span>
                        </label>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Custom Class Text Input */}
              {targetClassScopeOption === 'custom' && (
                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-slate-500 uppercase">Nhập tên lớp / nhóm học áp dụng:</label>
                  <input
                    type="text"
                    placeholder="Ví dụ: Lớp 10A1 Specialist, Khối 11 Bồi dưỡng..."
                    value={customClassInput}
                    onChange={(e) => setCustomClassInput(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold focus:bg-white focus:ring-2 focus:ring-indigo-500 outline-none"
                  />
                </div>
              )}
            </div>

            {/* Buttons */}
            <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
              <button
                onClick={() => setAssignClassResource(null)}
                className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl transition-colors"
              >
                Hủy bỏ
              </button>
              <button
                onClick={handleSaveClassAllocation}
                disabled={savingClassAllocation}
                className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-xl shadow-md shadow-indigo-200 transition-all flex items-center gap-1.5 disabled:opacity-50"
              >
                {savingClassAllocation ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    Đang lưu...
                  </>
                ) : (
                  <>
                    <Check className="w-3.5 h-3.5" />
                    Xác Nhận Phân Bổ
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* BATCH CLASS ALLOCATION MODAL */}
      {isBatchAssignModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[120] flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 border border-slate-200 shadow-2xl space-y-5">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <div className="p-2 bg-amber-100 text-amber-800 rounded-xl">
                  <Shield className="w-5 h-5 text-amber-600" />
                </div>
                <div>
                  <h3 className="font-extrabold text-slate-900 text-base">Phân Bổ Lớp Hàng Loạt ({selectedItemKeys.length} Mục)</h3>
                  <p className="text-xs text-slate-500">Áp dụng lớp học/phạm vi mới cho toàn bộ tài nguyên được chọn</p>
                </div>
              </div>
              <button onClick={() => setIsBatchAssignModalOpen(false)} className="p-1 text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Scope Selector Options */}
            <div className="space-y-3">
              <label className="text-xs font-black text-slate-700 uppercase tracking-wider block">
                Chọn Phạm Vi Lớp Áp Dụng Cho Hàng Loạt
              </label>

              <div className="space-y-2 text-xs">
                <label className={`flex items-center justify-between p-3 rounded-2xl border cursor-pointer transition-all ${
                  targetClassScopeOption === 'all' ? 'bg-indigo-50/60 border-indigo-300 font-bold text-indigo-900' : 'bg-white border-slate-200 text-slate-700'
                }`}>
                  <div className="flex items-center gap-2.5">
                    <input
                      type="radio"
                      name="batchScopeOpt"
                      checked={targetClassScopeOption === 'all'}
                      onChange={() => setTargetClassScopeOption('all')}
                      className="text-indigo-600 focus:ring-indigo-500"
                    />
                    <span>🌐 Toàn bộ học sinh (Áp dụng tất cả các lớp)</span>
                  </div>
                </label>

                <label className={`flex items-center justify-between p-3 rounded-2xl border cursor-pointer transition-all ${
                  targetClassScopeOption === 'specific' ? 'bg-indigo-50/60 border-indigo-300 font-bold text-indigo-900' : 'bg-white border-slate-200 text-slate-700'
                }`}>
                  <div className="flex items-center gap-2.5">
                    <input
                      type="radio"
                      name="batchScopeOpt"
                      checked={targetClassScopeOption === 'specific'}
                      onChange={() => setTargetClassScopeOption('specific')}
                      className="text-indigo-600 focus:ring-indigo-500"
                    />
                    <span>🏫 Phân bổ cho Danh sách Lớp cụ thể</span>
                  </div>
                </label>

                <label className={`flex items-center justify-between p-3 rounded-2xl border cursor-pointer transition-all ${
                  targetClassScopeOption === 'custom' ? 'bg-indigo-50/60 border-indigo-300 font-bold text-indigo-900' : 'bg-white border-slate-200 text-slate-700'
                }`}>
                  <div className="flex items-center gap-2.5">
                    <input
                      type="radio"
                      name="batchScopeOpt"
                      checked={targetClassScopeOption === 'custom'}
                      onChange={() => setTargetClassScopeOption('custom')}
                      className="text-indigo-600 focus:ring-indigo-500"
                    />
                    <span>✏️ Nhập tên Lớp / Nhóm tùy chỉnh</span>
                  </div>
                </label>
              </div>

              {/* Class Selection Checkboxes */}
              {targetClassScopeOption === 'specific' && (
                <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-200 space-y-2 max-h-40 overflow-y-auto">
                  <p className="text-[11px] font-bold text-slate-500 uppercase">Tích chọn các lớp áp dụng:</p>
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    {availableClassOptions.map((clsName) => {
                      const isChecked = selectedClassesList.includes(clsName);
                      return (
                        <label
                          key={clsName}
                          className={`flex items-center gap-2 p-2 rounded-xl border text-xs cursor-pointer transition-colors ${
                            isChecked ? 'bg-indigo-100 border-indigo-300 text-indigo-900 font-bold' : 'bg-white border-slate-200 text-slate-700'
                          }`}
                        >
                          <input
                            type="checkbox"
                            checked={isChecked}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setSelectedClassesList([...selectedClassesList, clsName]);
                              } else {
                                setSelectedClassesList(selectedClassesList.filter(c => c !== clsName));
                              }
                            }}
                            className="rounded text-indigo-600 focus:ring-indigo-500"
                          />
                          <span className="truncate">{clsName}</span>
                        </label>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Custom Class Text Input */}
              {targetClassScopeOption === 'custom' && (
                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-slate-500 uppercase">Nhập tên lớp / nhóm học áp dụng:</label>
                  <input
                    type="text"
                    placeholder="Ví dụ: Lớp 10A1 Specialist, Khối 11 Bồi dưỡng..."
                    value={customClassInput}
                    onChange={(e) => setCustomClassInput(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold focus:bg-white focus:ring-2 focus:ring-indigo-500 outline-none"
                  />
                </div>
              )}
            </div>

            {/* Buttons */}
            <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
              <button
                onClick={() => setIsBatchAssignModalOpen(false)}
                className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl transition-colors"
              >
                Hủy bỏ
              </button>
              <button
                onClick={handleSaveBatchClassAllocation}
                disabled={savingClassAllocation}
                className="px-5 py-2 bg-amber-500 hover:bg-amber-600 text-slate-950 font-extrabold text-xs rounded-xl shadow-md transition-all flex items-center gap-1.5 disabled:opacity-50"
              >
                {savingClassAllocation ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    Đang lưu...
                  </>
                ) : (
                  <>
                    <Check className="w-3.5 h-3.5" />
                    Áp Dụng Phân Bổ Hàng Loạt ({selectedItemKeys.length})
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Confirmation Modal for Resource Deletion */}
      <ConfirmModal
        isOpen={!!deleteConfirmResource}
        onClose={() => setDeleteConfirmResource(null)}
        onConfirm={confirmDeleteResource}
        title="Xác nhận xóa tài nguyên hệ thống"
        message={`Bạn có chắc chắn muốn xóa tài nguyên "${deleteConfirmResource?.title}" khỏi Firestore? Thao tác này sẽ gỡ bỏ hoàn toàn bài đăng khỏi hệ thống.`}
        confirmText="Xóa vĩnh viễn"
        cancelText="Hủy bỏ"
        variant="danger"
        loading={deletingResource}
      />

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
