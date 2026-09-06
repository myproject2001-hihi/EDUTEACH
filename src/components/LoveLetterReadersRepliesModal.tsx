import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  X, Users, MessageSquareHeart, Trash2, Search, CheckCircle2, 
  User as UserIcon, Clock, Heart, Shield, Sparkles, RefreshCw, 
  AlertCircle, CheckSquare, Square, MinusSquare, Check, RotateCcw
} from 'lucide-react';
import { LoveLetter, LoveLetterReadDetail, LoveLetterReply, User as UserType } from '../types';
import { db, handleFirestoreError, OperationType } from '../firebase';
import { doc, updateDoc, onSnapshot, collection, getDocs, deleteDoc } from 'firebase/firestore';
import { BatchActionBar } from './BatchActionBar';

interface LoveLetterReadersRepliesModalProps {
  letter: LoveLetter;
  currentUser: UserType;
  allUsers?: UserType[];
  onClose: () => void;
  onLetterUpdated?: (updatedLetter: LoveLetter) => void;
  showNotify?: (type: 'success' | 'error' | 'info', msg: string) => void;
}

export const LoveLetterReadersRepliesModal: React.FC<LoveLetterReadersRepliesModalProps> = ({
  letter: initialLetter,
  currentUser,
  allUsers = [],
  onClose,
  onLetterUpdated,
  showNotify
}) => {
  const [currentLetter, setCurrentLetter] = useState<LoveLetter>(initialLetter);
  const [activeTab, setActiveTab] = useState<'readers' | 'replies'>('readers');
  const [searchTerm, setSearchTerm] = useState('');
  const [isDeleting, setIsDeleting] = useState<string | null>(null);
  const [isSyncing, setIsSyncing] = useState(false);

  // Bulk selection states
  const [selectedViewerIds, setSelectedViewerIds] = useState<string[]>([]);
  const [selectedReplyIds, setSelectedReplyIds] = useState<string[]>([]);

  // Confirmation modal states
  const [confirmDeleteViewer, setConfirmDeleteViewer] = useState<{ id: string; name: string } | null>(null);
  const [confirmBulkDeleteViewers, setConfirmBulkDeleteViewers] = useState(false);
  const [confirmDeleteReply, setConfirmDeleteReply] = useState<{ id: string; senderName: string } | null>(null);
  const [confirmBulkDeleteReplies, setConfirmBulkDeleteReplies] = useState(false);
  const [confirmResetAll, setConfirmResetAll] = useState(false);

  const notify = (type: 'success' | 'error' | 'info', msg: string) => {
    if (showNotify) {
      showNotify(type, msg);
    }
  };

  // 1. Real-time listener for current letter document
  useEffect(() => {
    const unsub = onSnapshot(doc(db, 'love_letters', initialLetter.id), (snapshot) => {
      if (snapshot.exists()) {
        const data = { id: snapshot.id, ...snapshot.data() } as LoveLetter;
        setCurrentLetter(data);
        if (onLetterUpdated) {
          onLetterUpdated(data);
        }
      }
    }, (err) => {
      console.warn('Realtime listener error on love_letter:', err);
    });

    return () => unsub();
  }, [initialLetter.id]);

  // 2. Real-time / Active scan of system_notifications to recover any replies
  useEffect(() => {
    const unsubNotifs = onSnapshot(collection(db, 'system_notifications'), (snapshot) => {
      try {
        const foundReplies: LoveLetterReply[] = [];
        const existingReplyIds = new Set((currentLetter.replies || []).map(r => r.id));

        snapshot.docs.forEach(d => {
          const data = d.data() as any;
          const notifId = d.id;

          // Check if this notification is a reply to THIS letter
          // If data has a loveLetterId, it MUST match currentLetter.id
          if (data.loveLetterId && data.loveLetterId !== currentLetter.id) {
            return;
          }

          const isDirectMatch = data.loveLetterId === currentLetter.id;
          const isLetterTitleMatch = Boolean(
            !data.loveLetterId && currentLetter.title && (
              (data.content && typeof data.content === 'string' && data.content.includes(currentLetter.title)) ||
              (data.title && typeof data.title === 'string' && data.title.includes(currentLetter.title))
            )
          );

          if (isDirectMatch || isLetterTitleMatch) {
            // Parse content
            let cleanContent = data.content || '';
            const matchQuote = cleanContent.match(/^"([^"]+)"/);
            if (matchQuote && matchQuote[1]) {
              cleanContent = matchQuote[1];
            } else if (cleanContent.includes('(Phản hồi')) {
              cleanContent = cleanContent.split('(Phản hồi')[0].replace(/^"|"$/g, '').trim();
            }

            // Parse sender name
            let senderName = data.senderName || data.authorName || '';
            if (!senderName && data.title && data.title.includes('đã gửi lời cảm ơn')) {
              const nameMatch = data.title.match(/💌\s*(.+?)\s*đã gửi lời cảm ơn/);
              if (nameMatch && nameMatch[1]) {
                senderName = nameMatch[1].trim();
              }
            }
            if (!senderName) {
              const foundUser = allUsers.find(u => u.id === data.senderId || u.id === data.authorId);
              senderName = foundUser?.name || 'Người nhận thư';
            }

            const replyObj: LoveLetterReply = {
              id: notifId,
              senderId: data.senderId || data.authorId || data.targetStudentId || 'unknown',
              senderName: senderName,
              senderRole: data.senderRole || 'student',
              senderAvatar: data.senderAvatar || '',
              senderClass: data.senderClass || '',
              content: cleanContent || data.content || 'Đã nhận thư và gửi lời cảm ơn!',
              createdAt: data.createdAt || new Date().toISOString()
            };

            foundReplies.push(replyObj);
          }
        });

        // Merge replies without duplicates
        if (foundReplies.length > 0) {
          const currentReplies = currentLetter.replies || [];
          const merged = [...currentReplies];
          let hasNew = false;

          foundReplies.forEach(fr => {
            const alreadyExists = merged.some(r => 
              r.id === fr.id || 
              (r.senderName === fr.senderName && r.content === fr.content)
            );
            if (!alreadyExists) {
              merged.push(fr);
              hasNew = true;
            }
          });

          if (hasNew) {
            // Save to Firestore so it stays synced
            updateDoc(doc(db, 'love_letters', currentLetter.id), {
              replies: merged
            }).catch(e => console.warn('Could not sync recovered replies to love_letter:', e));

            setCurrentLetter(prev => ({
              ...prev,
              replies: merged
            }));
          }
        }
      } catch (err) {
        console.warn('Error syncing replies from notifications:', err);
      }
    });

    return () => unsubNotifs();
  }, [currentLetter.id, currentLetter.title, currentLetter.senderId, allUsers]);

  // Compute viewer list combining readDetails with readByUsers and allUsers
  const viewers = useMemo(() => {
    const rawIds = currentLetter.readByUsers || [];
    const detailsMap = new Map<string, LoveLetterReadDetail>();
    
    (currentLetter.readDetails || []).forEach(d => {
      detailsMap.set(d.userId, d);
    });

    const userMap = new Map<string, UserType>();
    allUsers.forEach(u => {
      userMap.set(u.id, u);
    });

    return rawIds.map(uid => {
      const detail = detailsMap.get(uid);
      const userObj = userMap.get(uid);

      return {
        userId: uid,
        name: detail?.userName || userObj?.name || 'Người dùng (' + uid.substring(0, 5) + ')',
        role: detail?.userRole || userObj?.role || 'student',
        className: detail?.userClass || userObj?.className || '',
        avatar: detail?.userAvatar || userObj?.avatar || '',
        readAt: detail?.readAt || currentLetter.createdAt
      };
    });
  }, [currentLetter, allUsers]);

  const filteredViewers = useMemo(() => {
    const q = searchTerm.toLowerCase().trim();
    if (!q) return viewers;
    return viewers.filter(v => 
      v.name.toLowerCase().includes(q) ||
      v.className.toLowerCase().includes(q) ||
      v.role.toLowerCase().includes(q)
    );
  }, [viewers, searchTerm]);

  const replies = useMemo(() => {
    return currentLetter.replies || [];
  }, [currentLetter.replies]);

  const filteredReplies = useMemo(() => {
    const q = searchTerm.toLowerCase().trim();
    if (!q) return replies;
    return replies.filter(r =>
      r.senderName.toLowerCase().includes(q) ||
      r.content.toLowerCase().includes(q) ||
      (r.senderClass && r.senderClass.toLowerCase().includes(q))
    );
  }, [replies, searchTerm]);

  // --------------------------------------------------------------------------
  // Selection Handlers for Viewers
  // --------------------------------------------------------------------------
  const isAllViewersSelected = filteredViewers.length > 0 && filteredViewers.every(v => selectedViewerIds.includes(v.userId));
  const isSomeViewersSelected = filteredViewers.some(v => selectedViewerIds.includes(v.userId)) && !isAllViewersSelected;

  const handleToggleSelectAllViewers = () => {
    if (isAllViewersSelected) {
      // Unselect filtered
      const filteredIds = new Set(filteredViewers.map(v => v.userId));
      setSelectedViewerIds(prev => prev.filter(id => !filteredIds.has(id)));
    } else {
      // Select all filtered
      const newSet = new Set(selectedViewerIds);
      filteredViewers.forEach(v => newSet.add(v.userId));
      setSelectedViewerIds(Array.from(newSet));
    }
  };

  const handleToggleViewerSelection = (userId: string) => {
    setSelectedViewerIds(prev => 
      prev.includes(userId) ? prev.filter(id => id !== userId) : [...prev, userId]
    );
  };

  // Remove a single viewer from readByUsers and readDetails
  const handleRemoveViewer = async (viewerId: string, viewerName: string) => {
    setIsDeleting(viewerId);
    try {
      const updatedReadByUsers = (currentLetter.readByUsers || []).filter(id => id !== viewerId);
      const updatedReadDetails = (currentLetter.readDetails || []).filter(d => d.userId !== viewerId);

      const letterRef = doc(db, 'love_letters', currentLetter.id);
      await updateDoc(letterRef, {
        readByUsers: updatedReadByUsers,
        readDetails: updatedReadDetails
      });

      const updated: LoveLetter = {
        ...currentLetter,
        readByUsers: updatedReadByUsers,
        readDetails: updatedReadDetails
      };

      setCurrentLetter(updated);
      setSelectedViewerIds(prev => prev.filter(id => id !== viewerId));

      if (onLetterUpdated) {
        onLetterUpdated(updated);
      }

      notify('success', `Đã xóa người xem "${viewerName}". Người này sẽ nhận lại phong bì thư khi đăng nhập!`);
      setConfirmDeleteViewer(null);
    } catch (err: any) {
      console.error('Lỗi khi xóa người xem:', err);
      handleFirestoreError(err, OperationType.UPDATE, `love_letters/${currentLetter.id}`);
      notify('error', 'Không thể xóa người xem: ' + (err.message || 'Lỗi'));
    } finally {
      setIsDeleting(null);
    }
  };

  // Bulk Remove selected viewers
  const handleBulkRemoveViewers = async () => {
    if (selectedViewerIds.length === 0) return;
    setIsDeleting('bulk_viewers');
    try {
      const selectedSet = new Set(selectedViewerIds);
      const updatedReadByUsers = (currentLetter.readByUsers || []).filter(id => !selectedSet.has(id));
      const updatedReadDetails = (currentLetter.readDetails || []).filter(d => !selectedSet.has(d.userId));

      const letterRef = doc(db, 'love_letters', currentLetter.id);
      await updateDoc(letterRef, {
        readByUsers: updatedReadByUsers,
        readDetails: updatedReadDetails
      });

      const updated: LoveLetter = {
        ...currentLetter,
        readByUsers: updatedReadByUsers,
        readDetails: updatedReadDetails
      };

      const deletedCount = selectedViewerIds.length;
      setCurrentLetter(updated);
      setSelectedViewerIds([]);
      setConfirmBulkDeleteViewers(false);

      if (onLetterUpdated) {
        onLetterUpdated(updated);
      }

      notify('success', `Đã xóa đồng loạt ${deletedCount} người xem! Tất cả những người này sẽ thấy lại phong bì thư.`);
    } catch (err: any) {
      console.error('Lỗi khi xóa đồng loạt người xem:', err);
      handleFirestoreError(err, OperationType.UPDATE, `love_letters/${currentLetter.id}`);
      notify('error', 'Lỗi khi xóa đồng loạt: ' + (err.message || 'Lỗi'));
    } finally {
      setIsDeleting(null);
    }
  };

  // Reset all viewers
  const handleResetAllViewers = async () => {
    setIsDeleting('all');
    try {
      const letterRef = doc(db, 'love_letters', currentLetter.id);
      await updateDoc(letterRef, {
        readByUsers: [],
        readDetails: []
      });

      const updated: LoveLetter = {
        ...currentLetter,
        readByUsers: [],
        readDetails: []
      };

      setCurrentLetter(updated);
      setSelectedViewerIds([]);
      setConfirmResetAll(false);

      if (onLetterUpdated) {
        onLetterUpdated(updated);
      }

      notify('success', 'Đã đặt lại trạng thái: Tất cả người nhận sẽ thấy lại phong bì thư!');
    } catch (err: any) {
      console.error('Lỗi khi đặt lại người xem:', err);
      handleFirestoreError(err, OperationType.UPDATE, `love_letters/${currentLetter.id}`);
      notify('error', 'Không thể đặt lại: ' + (err.message || 'Lỗi'));
    } finally {
      setIsDeleting(null);
    }
  };

  // --------------------------------------------------------------------------
  // Selection Handlers for Replies
  // --------------------------------------------------------------------------
  const isAllRepliesSelected = filteredReplies.length > 0 && filteredReplies.every(r => selectedReplyIds.includes(r.id));
  const isSomeRepliesSelected = filteredReplies.some(r => selectedReplyIds.includes(r.id)) && !isAllRepliesSelected;

  const handleToggleSelectAllReplies = () => {
    if (isAllRepliesSelected) {
      const filteredIds = new Set(filteredReplies.map(r => r.id));
      setSelectedReplyIds(prev => prev.filter(id => !filteredIds.has(id)));
    } else {
      const newSet = new Set(selectedReplyIds);
      filteredReplies.forEach(r => newSet.add(r.id));
      setSelectedReplyIds(Array.from(newSet));
    }
  };

  const handleToggleReplySelection = (replyId: string) => {
    setSelectedReplyIds(prev =>
      prev.includes(replyId) ? prev.filter(id => id !== replyId) : [...prev, replyId]
    );
  };

  // Delete a single reply
  const handleDeleteReply = async (replyId: string, senderName: string) => {
    setIsDeleting(replyId);
    try {
      const updatedReplies = (currentLetter.replies || []).filter(r => r.id !== replyId);
      const letterRef = doc(db, 'love_letters', currentLetter.id);
      await updateDoc(letterRef, {
        replies: updatedReplies
      });

      // Also clean up notification if it has the same ID
      try {
        if (replyId.startsWith('notif_reply_')) {
          await deleteDoc(doc(db, 'system_notifications', replyId));
        }
      } catch (e) {
        // Silent
      }

      const updated: LoveLetter = {
        ...currentLetter,
        replies: updatedReplies
      };

      setCurrentLetter(updated);
      setSelectedReplyIds(prev => prev.filter(id => id !== replyId));
      setConfirmDeleteReply(null);

      if (onLetterUpdated) {
        onLetterUpdated(updated);
      }

      notify('success', `Đã xóa phản hồi của "${senderName}"!`);
    } catch (err: any) {
      console.error('Lỗi khi xóa phản hồi:', err);
      handleFirestoreError(err, OperationType.UPDATE, `love_letters/${currentLetter.id}`);
      notify('error', 'Lỗi khi xóa phản hồi: ' + err.message);
    } finally {
      setIsDeleting(null);
    }
  };

  // Bulk Delete selected replies
  const handleBulkDeleteReplies = async () => {
    if (selectedReplyIds.length === 0) return;
    setIsDeleting('bulk_replies');
    try {
      const selectedSet = new Set(selectedReplyIds);
      const updatedReplies = (currentLetter.replies || []).filter(r => !selectedSet.has(r.id));

      const letterRef = doc(db, 'love_letters', currentLetter.id);
      await updateDoc(letterRef, {
        replies: updatedReplies
      });

      // Also clean up notifications if matching
      const deleteNotifPromises = selectedReplyIds
        .filter(id => id.startsWith('notif_reply_'))
        .map(id => deleteDoc(doc(db, 'system_notifications', id)).catch(() => {}));
      await Promise.all(deleteNotifPromises);

      const count = selectedReplyIds.length;
      const updated: LoveLetter = {
        ...currentLetter,
        replies: updatedReplies
      };

      setCurrentLetter(updated);
      setSelectedReplyIds([]);
      setConfirmBulkDeleteReplies(false);

      if (onLetterUpdated) {
        onLetterUpdated(updated);
      }

      notify('success', `Đã xóa đồng loạt ${count} thư phản hồi thành công!`);
    } catch (err: any) {
      console.error('Lỗi khi xóa đồng loạt phản hồi:', err);
      handleFirestoreError(err, OperationType.UPDATE, `love_letters/${currentLetter.id}`);
      notify('error', 'Lỗi khi xóa đồng loạt: ' + (err.message || 'Lỗi'));
    } finally {
      setIsDeleting(null);
    }
  };

  // Force Manual Refresh/Sync
  const handleManualSync = async () => {
    setIsSyncing(true);
    try {
      const notifSnap = await getDocs(collection(db, 'system_notifications'));
      const foundReplies: LoveLetterReply[] = [];

      notifSnap.docs.forEach(d => {
        const data = d.data() as any;
        const notifId = d.id;

        const isDirectMatch = data.loveLetterId === currentLetter.id;
        const isLetterTitleMatch = (
          (data.content && typeof data.content === 'string' && data.content.includes(currentLetter.title)) ||
          (data.title && typeof data.title === 'string' && data.title.includes(currentLetter.title))
        );
        const isReplyBadgeMatch = (
          (data.badge === '💌 Lời Cảm Ơn' || data.id?.startsWith('notif_reply_') || data.title?.includes('gửi lời cảm ơn')) &&
          (data.targetUserId === currentLetter.senderId || data.targetStudentId === currentLetter.senderId || data.teacherId === currentLetter.senderId)
        );

        if (isDirectMatch || isLetterTitleMatch || isReplyBadgeMatch) {
          let cleanContent = data.content || '';
          const matchQuote = cleanContent.match(/^"([^"]+)"/);
          if (matchQuote && matchQuote[1]) {
            cleanContent = matchQuote[1];
          } else if (cleanContent.includes('(Phản hồi')) {
            cleanContent = cleanContent.split('(Phản hồi')[0].replace(/^"|"$/g, '').trim();
          }

          let senderName = data.senderName || data.authorName || '';
          if (!senderName && data.title && data.title.includes('đã gửi lời cảm ơn')) {
            const nameMatch = data.title.match(/💌\s*(.+?)\s*đã gửi lời cảm ơn/);
            if (nameMatch && nameMatch[1]) {
              senderName = nameMatch[1].trim();
            }
          }
          if (!senderName) {
            const foundUser = allUsers.find(u => u.id === data.senderId || u.id === data.authorId);
            senderName = foundUser?.name || 'Người nhận thư';
          }

          foundReplies.push({
            id: notifId,
            senderId: data.senderId || data.authorId || data.targetStudentId || 'unknown',
            senderName: senderName,
            senderRole: data.senderRole || 'student',
            senderAvatar: data.senderAvatar || '',
            senderClass: data.senderClass || '',
            content: cleanContent || data.content || 'Đã nhận thư và gửi lời cảm ơn!',
            createdAt: data.createdAt || new Date().toISOString()
          });
        }
      });

      const currentReplies = currentLetter.replies || [];
      const merged = [...currentReplies];
      let newCount = 0;

      foundReplies.forEach(fr => {
        const exists = merged.some(r => r.id === fr.id || (r.senderName === fr.senderName && r.content === fr.content));
        if (!exists) {
          merged.push(fr);
          newCount++;
        }
      });

      if (newCount > 0) {
        await updateDoc(doc(db, 'love_letters', currentLetter.id), {
          replies: merged
        });
        setCurrentLetter(prev => ({ ...prev, replies: merged }));
        notify('success', `Đã tìm thấy và đồng bộ thêm ${newCount} phản hồi mới!`);
      } else {
        notify('info', 'Dữ liệu đã được đồng bộ mới nhất!');
      }
    } catch (err: any) {
      console.warn('Sync error:', err);
      notify('info', 'Đã làm mới dữ liệu!');
    } finally {
      setTimeout(() => setIsSyncing(false), 500);
    }
  };

  const formatDateTime = (isoString?: string) => {
    if (!isoString) return 'Gần đây';
    try {
      const d = new Date(isoString);
      return d.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }) + ' - ' + d.toLocaleDateString('vi-VN');
    } catch {
      return isoString;
    }
  };

  return (
    <div className="fixed inset-0 z-[250] flex items-center justify-center p-3 sm:p-6 bg-slate-950/70 backdrop-blur-md">
      <motion.div
        initial={{ scale: 0.94, opacity: 0, y: 15 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        exit={{ scale: 0.94, opacity: 0, y: 15 }}
        className="bg-white rounded-3xl w-full max-w-3xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[90vh]"
      >
        {/* Header */}
        <div className="px-6 py-4 bg-gradient-to-r from-rose-50 via-pink-50 to-amber-50 border-b border-rose-100 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-2xl bg-rose-500 text-white flex items-center justify-center shadow-md shadow-rose-200 shrink-0">
              <Heart className="w-5 h-5 fill-current" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="text-base sm:text-lg font-black text-slate-900 truncate max-w-[240px] sm:max-w-md">
                  {currentLetter.title}
                </h3>
                <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-rose-100 text-rose-800 uppercase shrink-0">
                  {currentLetter.envelopeStyle === 'rose_love' ? 'Hoa Hồng' :
                   currentLetter.envelopeStyle === 'pastel_gold' ? 'Hoàng Kim' :
                   currentLetter.envelopeStyle === 'ocean_blue' ? 'Đại Dương' : 'Cổ Điển'}
                </span>
              </div>
              <p className="text-xs text-slate-500 font-medium truncate">
                Người gửi: <strong className="text-indigo-600">{currentLetter.senderName}</strong> • {formatDateTime(currentLetter.createdAt)}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1 shrink-0">
            <button
              type="button"
              onClick={handleManualSync}
              disabled={isSyncing}
              className={`p-2 text-slate-500 hover:text-rose-600 hover:bg-white/80 rounded-xl transition-all ${isSyncing ? 'animate-spin text-rose-600' : ''}`}
              title="Đồng bộ & Tìm kiếm phản hồi mới"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
            <button
              onClick={onClose}
              className="p-2 text-slate-400 hover:text-slate-700 hover:bg-white/80 rounded-full transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Tab Navigation & Bulk Actions Bar */}
        <div className="px-6 pt-3 pb-2 bg-white border-b border-slate-100 flex flex-wrap items-center justify-between gap-2 shrink-0">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => {
                setActiveTab('readers');
                setSearchTerm('');
              }}
              className={`px-4 py-2 rounded-xl text-xs font-black transition-all flex items-center gap-2 ${
                activeTab === 'readers'
                  ? 'bg-rose-50 text-rose-700 border border-rose-200 shadow-xs'
                  : 'text-slate-600 hover:bg-slate-50'
              }`}
            >
              <Users className="w-4 h-4" />
              <span>Người Đã Xem ({viewers.length})</span>
            </button>

            <button
              type="button"
              onClick={() => {
                setActiveTab('replies');
                setSearchTerm('');
              }}
              className={`px-4 py-2 rounded-xl text-xs font-black transition-all flex items-center gap-2 ${
                activeTab === 'replies'
                  ? 'bg-rose-50 text-rose-700 border border-rose-200 shadow-xs'
                  : 'text-slate-600 hover:bg-slate-50'
              }`}
            >
              <MessageSquareHeart className="w-4 h-4 text-rose-500" />
              <span>Thư Phản Hồi ({replies.length})</span>
            </button>
          </div>

          {activeTab === 'readers' && viewers.length > 0 && (
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setConfirmResetAll(true)}
                className="px-3 py-1.5 text-[11px] font-bold text-slate-600 hover:text-rose-600 hover:bg-rose-50 border border-slate-200 rounded-xl transition-colors flex items-center gap-1.5"
                title="Đặt lại để toàn bộ người nhận có thể thấy lại thư phong bì"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Đặt lại tất cả</span>
              </button>
            </div>
          )}
        </div>

        {/* Bulk Selection Bar (Shows when items exist) */}
        {activeTab === 'readers' && filteredViewers.length > 0 && (
          <div className="px-6 py-2 bg-slate-50 border-b border-slate-200 flex items-center justify-between text-xs shrink-0 flex-wrap gap-2">
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={handleToggleSelectAllViewers}
                className="flex items-center gap-1.5 font-bold text-slate-700 hover:text-rose-600 transition-colors"
              >
                {isAllViewersSelected ? (
                  <CheckSquare className="w-4 h-4 text-rose-600" />
                ) : isSomeViewersSelected ? (
                  <MinusSquare className="w-4 h-4 text-rose-600" />
                ) : (
                  <Square className="w-4 h-4 text-slate-400" />
                )}
                <span>Chọn tất cả ({filteredViewers.length})</span>
              </button>
            </div>
          </div>
        )}

        {activeTab === 'replies' && filteredReplies.length > 0 && (
          <div className="px-6 py-2 bg-slate-50 border-b border-slate-200 flex items-center justify-between text-xs shrink-0 flex-wrap gap-2">
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={handleToggleSelectAllReplies}
                className="flex items-center gap-1.5 font-bold text-slate-700 hover:text-rose-600 transition-colors"
              >
                {isAllRepliesSelected ? (
                  <CheckSquare className="w-4 h-4 text-rose-600" />
                ) : isSomeRepliesSelected ? (
                  <MinusSquare className="w-4 h-4 text-rose-600" />
                ) : (
                  <Square className="w-4 h-4 text-slate-400" />
                )}
                <span>Chọn tất cả ({filteredReplies.length})</span>
              </button>
            </div>
          </div>
        )}

        {/* Tab Content */}
        <div className="p-6 overflow-y-auto custom-scrollbar flex-1 bg-slate-50/50 space-y-4">
          {/* Synchronized Batch Action Bar for Readers */}
          {activeTab === 'readers' && selectedViewerIds.length > 0 && (
            <BatchActionBar
              count={selectedViewerIds.length}
              itemLabel="người xem đã chọn"
              actionLabel="Xóa người xem đã chọn"
              description="Xóa người xem sẽ cho phép người đó nhận lại bức thư này khi vào hệ thống."
              onDeselectAll={() => setSelectedViewerIds([])}
              onAction={() => setConfirmBulkDeleteViewers(true)}
              isActionLoading={isDeleting === 'bulk_viewers'}
            />
          )}

          {/* Synchronized Batch Action Bar for Replies */}
          {activeTab === 'replies' && selectedReplyIds.length > 0 && (
            <BatchActionBar
              count={selectedReplyIds.length}
              itemLabel="phản hồi đã chọn"
              actionLabel="Xóa phản hồi đã chọn"
              description="Bạn có thể xóa hàng loạt các lời cảm ơn / phản hồi đã chọn này."
              onDeselectAll={() => setSelectedReplyIds([])}
              onAction={() => setConfirmBulkDeleteReplies(true)}
              isActionLoading={isDeleting === 'bulk_replies'}
            />
          )}

          {activeTab === 'readers' ? (
            <div className="space-y-4">
              {/* Search bar */}
              {viewers.length > 0 && (
                <div className="relative">
                  <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    placeholder="Tìm kiếm người xem theo tên, lớp học, vai trò..."
                    className="w-full pl-9 pr-4 py-2 bg-white border border-slate-200 rounded-xl text-xs outline-none focus:ring-2 focus:ring-rose-500 font-medium shadow-xs"
                  />
                </div>
              )}

              {viewers.length === 0 ? (
                <div className="text-center py-12 space-y-3 bg-white rounded-2xl border border-slate-200">
                  <Users className="w-12 h-12 text-slate-300 mx-auto" />
                  <div className="space-y-1">
                    <p className="font-extrabold text-slate-700 text-sm">Chưa có người nào mở xem thư</p>
                    <p className="text-xs text-slate-400">
                      Khi học sinh hoặc giáo viên được gửi mở phong bì, thông tin người xem sẽ xuất hiện tại đây
                    </p>
                  </div>
                </div>
              ) : filteredViewers.length === 0 ? (
                <div className="text-center py-8 text-xs text-slate-500 bg-white rounded-2xl border border-slate-200">
                  Không tìm thấy người xem nào khớp với "{searchTerm}"
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {filteredViewers.map((viewer) => {
                    const isSelected = selectedViewerIds.includes(viewer.userId);
                    return (
                      <div
                        key={viewer.userId}
                        onClick={() => handleToggleViewerSelection(viewer.userId)}
                        className={`p-3.5 bg-white border rounded-2xl shadow-xs flex items-center justify-between gap-3 transition-all cursor-pointer select-none group ${
                          isSelected 
                            ? 'border-rose-400 bg-rose-50/40 ring-1 ring-rose-400' 
                            : 'border-slate-200 hover:border-rose-200 hover:bg-slate-50/50'
                        }`}
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          {/* Checkbox */}
                          <div 
                            className="shrink-0 p-1 text-slate-400 group-hover:text-rose-600 transition-colors"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleToggleViewerSelection(viewer.userId);
                            }}
                          >
                            {isSelected ? (
                              <CheckSquare className="w-4 h-4 text-rose-600" />
                            ) : (
                              <Square className="w-4 h-4 text-slate-300" />
                            )}
                          </div>

                          {viewer.avatar ? (
                            <img
                              src={viewer.avatar}
                              alt={viewer.name}
                              referrerPolicy="no-referrer"
                              className="w-10 h-10 rounded-full object-cover border border-slate-200 shrink-0"
                            />
                          ) : (
                            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-rose-100 to-pink-200 text-rose-700 font-black text-xs flex items-center justify-center shrink-0 border border-rose-200">
                              {viewer.name.charAt(0).toUpperCase()}
                            </div>
                          )}

                          <div className="min-w-0">
                            <h4 className="text-xs font-black text-slate-900 truncate" title={viewer.name}>
                              {viewer.name}
                            </h4>
                            <div className="flex items-center gap-1.5 text-[10px] text-slate-500 font-medium mt-0.5">
                              <span className={`px-1.5 py-0.2 rounded font-bold ${
                                viewer.role === 'teacher' ? 'bg-amber-100 text-amber-800' :
                                viewer.role === 'admin' ? 'bg-purple-100 text-purple-800' : 'bg-indigo-100 text-indigo-800'
                              }`}>
                                {viewer.role === 'teacher' ? 'GV' : viewer.role === 'admin' ? 'Admin' : 'HS'}
                              </span>
                              {viewer.className && (
                                <span className="font-bold text-slate-700">Lớp {viewer.className}</span>
                              )}
                            </div>
                            <p className="text-[9px] text-slate-400 mt-1 flex items-center gap-1">
                              <Clock className="w-2.5 h-2.5" />
                              {formatDateTime(viewer.readAt)}
                            </p>
                          </div>
                        </div>

                        {/* Remove viewer single button */}
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setConfirmDeleteViewer({ id: viewer.userId, name: viewer.name });
                          }}
                          disabled={isDeleting === viewer.userId}
                          className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-100/60 rounded-xl transition-all shrink-0 active:scale-95"
                          title={`Xóa người xem "${viewer.name}" (cho phép nhận lại thư)`}
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          ) : (
            /* TAB 2: REPLIES / CẢM ƠN */
            <div className="space-y-4">
              {/* Search bar for replies */}
              {replies.length > 0 && (
                <div className="relative">
                  <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    placeholder="Tìm kiếm theo người gửi, nội dung cảm ơn..."
                    className="w-full pl-9 pr-4 py-2 bg-white border border-slate-200 rounded-xl text-xs outline-none focus:ring-2 focus:ring-rose-500 font-medium shadow-xs"
                  />
                </div>
              )}

              {replies.length === 0 ? (
                <div className="text-center py-12 space-y-3 bg-white rounded-2xl border border-slate-200">
                  <MessageSquareHeart className="w-12 h-12 text-rose-300 mx-auto" />
                  <div className="space-y-1">
                    <p className="font-extrabold text-slate-700 text-sm">Chưa có phản hồi nào</p>
                    <p className="text-xs text-slate-400 max-w-sm mx-auto">
                      Khi người nhận bấm "Đã Nhận & Cảm Ơn" và gửi lời chúc, lời nhắn tri ân sẽ tự động xuất hiện tại đây.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={handleManualSync}
                    disabled={isSyncing}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-rose-600 bg-rose-50 hover:bg-rose-100 border border-rose-200 rounded-xl transition-colors"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin' : ''}`} />
                    <span>Kiểm tra lại dữ liệu phản hồi</span>
                  </button>
                </div>
              ) : filteredReplies.length === 0 ? (
                <div className="text-center py-8 text-xs text-slate-500 bg-white rounded-2xl border border-slate-200">
                  Không tìm thấy phản hồi nào khớp với "{searchTerm}"
                </div>
              ) : (
                <div className="space-y-3">
                  {filteredReplies.map((reply) => {
                    const isSelected = selectedReplyIds.includes(reply.id);
                    return (
                      <div
                        key={reply.id}
                        onClick={() => handleToggleReplySelection(reply.id)}
                        className={`p-4 bg-white border rounded-2xl shadow-xs space-y-2 relative transition-all cursor-pointer select-none group ${
                          isSelected
                            ? 'border-rose-400 bg-rose-50/40 ring-1 ring-rose-400'
                            : 'border-rose-100 hover:border-rose-300 hover:bg-rose-50/20'
                        }`}
                      >
                        <div className="flex items-center justify-between gap-2">
                          <div className="flex items-center gap-2.5 min-w-0">
                            {/* Checkbox */}
                            <div
                              className="shrink-0 p-0.5 text-slate-400 group-hover:text-rose-600 transition-colors"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleToggleReplySelection(reply.id);
                              }}
                            >
                              {isSelected ? (
                                <CheckSquare className="w-4 h-4 text-rose-600" />
                              ) : (
                                <Square className="w-4 h-4 text-slate-300" />
                              )}
                            </div>

                            {reply.senderAvatar ? (
                              <img
                                src={reply.senderAvatar}
                                alt={reply.senderName}
                                referrerPolicy="no-referrer"
                                className="w-8 h-8 rounded-full object-cover border border-slate-200 shrink-0"
                              />
                            ) : (
                              <div className="w-8 h-8 rounded-full bg-rose-100 text-rose-700 font-black text-xs flex items-center justify-center shrink-0">
                                {reply.senderName.charAt(0).toUpperCase()}
                              </div>
                            )}

                            <div className="min-w-0">
                              <div className="flex items-center gap-1.5 flex-wrap">
                                <span className="font-extrabold text-slate-900 text-xs truncate">{reply.senderName}</span>
                                {reply.senderClass && (
                                  <span className="text-[10px] text-slate-500 font-bold bg-slate-100 px-1.5 py-0.5 rounded">
                                    Lớp {reply.senderClass}
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>

                          <div className="flex items-center gap-2 shrink-0">
                            <span className="text-[10px] text-slate-400 font-medium">
                              {formatDateTime(reply.createdAt)}
                            </span>
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                setConfirmDeleteReply({ id: reply.id, senderName: reply.senderName });
                              }}
                              className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-100/60 rounded-lg transition-colors"
                              title="Xóa phản hồi này"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>

                        <div 
                          className="p-3 bg-rose-50/70 rounded-xl border border-rose-100 text-xs font-serif italic text-rose-950 leading-relaxed pl-4" 
                          style={{ fontFamily: "'Patrick Hand', cursive, sans-serif", fontSize: '15px' }}
                        >
                          "{reply.content}"
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-3.5 bg-white border-t border-slate-200 flex items-center justify-between shrink-0 flex-wrap gap-2">
          <p className="text-xs text-slate-400 font-medium">
            💡 Xóa người xem sẽ cho phép người đó nhận lại bức thư phong bì khi vào hệ thống
          </p>
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2 bg-slate-800 hover:bg-slate-900 text-white font-bold text-xs rounded-xl transition-all ml-auto"
          >
            Đóng
          </button>
        </div>
      </motion.div>

      {/* Confirmation Modal: Delete Single Viewer */}
      {confirmDeleteViewer && (
        <div className="fixed inset-0 z-[300] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="bg-white rounded-2xl p-5 max-w-sm w-full shadow-2xl border border-slate-200 space-y-4"
          >
            <div className="flex items-center gap-3 text-rose-600">
              <div className="w-10 h-10 rounded-xl bg-rose-100 flex items-center justify-center shrink-0">
                <AlertCircle className="w-5 h-5" />
              </div>
              <div>
                <h4 className="text-sm font-extrabold text-slate-900">Xóa người xem thư?</h4>
                <p className="text-xs text-slate-500">Xác nhận thao tác</p>
              </div>
            </div>

            <p className="text-xs text-slate-600 leading-relaxed">
              Bạn có chắc chắn muốn xóa <strong>"{confirmDeleteViewer.name}"</strong> khỏi danh sách đã xem? Người này sẽ nhìn thấy bức thư phong bì xuất hiện lại ở lần đăng nhập tới.
            </p>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setConfirmDeleteViewer(null)}
                className="px-3.5 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl transition-colors"
              >
                Hủy bỏ
              </button>
              <button
                type="button"
                onClick={() => handleRemoveViewer(confirmDeleteViewer.id, confirmDeleteViewer.name)}
                disabled={isDeleting === confirmDeleteViewer.id}
                className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white font-extrabold text-xs rounded-xl shadow-md shadow-rose-200 transition-all flex items-center gap-1.5"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>{isDeleting === confirmDeleteViewer.id ? 'Đang xóa...' : 'Xác nhận xóa'}</span>
              </button>
            </div>
          </motion.div>
        </div>
      )}

      {/* Confirmation Modal: Bulk Delete Viewers */}
      {confirmBulkDeleteViewers && (
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
                <h4 className="text-sm font-extrabold text-slate-900">Xóa đồng loạt người xem</h4>
                <p className="text-xs text-slate-500">Xóa {selectedViewerIds.length} người đã chọn</p>
              </div>
            </div>

            <p className="text-xs text-slate-600 leading-relaxed">
              Bạn có chắc chắn muốn xóa đồng loạt <strong>{selectedViewerIds.length} người xem</strong> đã chọn khỏi danh sách? Tất cả những người này sẽ nhìn thấy lại phong bì thư khi đăng nhập.
            </p>

            <div className="max-h-32 overflow-y-auto p-2.5 bg-slate-50 rounded-xl border border-slate-200 text-[11px] text-slate-700 space-y-1">
              {viewers.filter(v => selectedViewerIds.includes(v.userId)).map(v => (
                <div key={v.userId} className="flex items-center justify-between font-medium">
                  <span>• {v.name} {v.className ? `(Lớp ${v.className})` : ''}</span>
                  <span className="text-[10px] text-slate-400">{formatDateTime(v.readAt)}</span>
                </div>
              ))}
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setConfirmBulkDeleteViewers(false)}
                className="px-3.5 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl transition-colors"
              >
                Hủy bỏ
              </button>
              <button
                type="button"
                onClick={handleBulkRemoveViewers}
                disabled={isDeleting === 'bulk_viewers'}
                className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white font-extrabold text-xs rounded-xl shadow-md shadow-rose-200 transition-all flex items-center gap-1.5"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>{isDeleting === 'bulk_viewers' ? 'Đang xóa...' : `Xác nhận xóa (${selectedViewerIds.length})`}</span>
              </button>
            </div>
          </motion.div>
        </div>
      )}

      {/* Confirmation Modal: Delete Single Reply */}
      {confirmDeleteReply && (
        <div className="fixed inset-0 z-[300] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="bg-white rounded-2xl p-5 max-w-sm w-full shadow-2xl border border-slate-200 space-y-4"
          >
            <div className="flex items-center gap-3 text-rose-600">
              <div className="w-10 h-10 rounded-xl bg-rose-100 flex items-center justify-center shrink-0">
                <AlertCircle className="w-5 h-5" />
              </div>
              <div>
                <h4 className="text-sm font-extrabold text-slate-900">Xóa thư phản hồi?</h4>
                <p className="text-xs text-slate-500">Xác nhận thao tác</p>
              </div>
            </div>

            <p className="text-xs text-slate-600 leading-relaxed">
              Bạn có chắc chắn muốn xóa thư phản hồi từ <strong>"{confirmDeleteReply.senderName}"</strong> không?
            </p>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setConfirmDeleteReply(null)}
                className="px-3.5 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl transition-colors"
              >
                Hủy bỏ
              </button>
              <button
                type="button"
                onClick={() => handleDeleteReply(confirmDeleteReply.id, confirmDeleteReply.senderName)}
                disabled={isDeleting === confirmDeleteReply.id}
                className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white font-extrabold text-xs rounded-xl shadow-md shadow-rose-200 transition-all flex items-center gap-1.5"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>{isDeleting === confirmDeleteReply.id ? 'Đang xóa...' : 'Xác nhận xóa'}</span>
              </button>
            </div>
          </motion.div>
        </div>
      )}

      {/* Confirmation Modal: Bulk Delete Replies */}
      {confirmBulkDeleteReplies && (
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
                <h4 className="text-sm font-extrabold text-slate-900">Xóa đồng loạt phản hồi</h4>
                <p className="text-xs text-slate-500">Xóa {selectedReplyIds.length} phản hồi đã chọn</p>
              </div>
            </div>

            <p className="text-xs text-slate-600 leading-relaxed">
              Bạn có chắc chắn muốn xóa đồng loạt <strong>{selectedReplyIds.length} thư phản hồi</strong> đã chọn? Thao tác này không thể hoàn tác.
            </p>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setConfirmBulkDeleteReplies(false)}
                className="px-3.5 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl transition-colors"
              >
                Hủy bỏ
              </button>
              <button
                type="button"
                onClick={handleBulkDeleteReplies}
                disabled={isDeleting === 'bulk_replies'}
                className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white font-extrabold text-xs rounded-xl shadow-md shadow-rose-200 transition-all flex items-center gap-1.5"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>{isDeleting === 'bulk_replies' ? 'Đang xóa...' : `Xác nhận xóa (${selectedReplyIds.length})`}</span>
              </button>
            </div>
          </motion.div>
        </div>
      )}

      {/* Confirmation Modal: Reset All Viewers */}
      {confirmResetAll && (
        <div className="fixed inset-0 z-[300] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="bg-white rounded-2xl p-5 max-w-sm w-full shadow-2xl border border-slate-200 space-y-4"
          >
            <div className="flex items-center gap-3 text-amber-600">
              <div className="w-10 h-10 rounded-xl bg-amber-100 flex items-center justify-center shrink-0">
                <RotateCcw className="w-5 h-5" />
              </div>
              <div>
                <h4 className="text-sm font-extrabold text-slate-900">Đặt lại toàn bộ người xem?</h4>
                <p className="text-xs text-slate-500">Gửi lại phong bì cho tất cả</p>
              </div>
            </div>

            <p className="text-xs text-slate-600 leading-relaxed">
              Thao tác này sẽ xóa toàn bộ danh sách đã xem của bức thư này. Tất cả học sinh/giáo viên mục tiêu sẽ thấy lại phong bì thư chào mừng.
            </p>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setConfirmResetAll(false)}
                className="px-3.5 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl transition-colors"
              >
                Hủy bỏ
              </button>
              <button
                type="button"
                onClick={handleResetAllViewers}
                disabled={isDeleting === 'all'}
                className="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white font-extrabold text-xs rounded-xl shadow-md shadow-amber-200 transition-all flex items-center gap-1.5"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>{isDeleting === 'all' ? 'Đang đặt lại...' : 'Xác nhận đặt lại'}</span>
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
};
