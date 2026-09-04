import React, { useState, useEffect } from 'react';
import { User, RedeemedRewardItem, Role } from '../types';
import { ShoppingBag, Gift, Sparkles, Check, Lock, Star, PackageCheck, Search, ShieldCheck, HeartHandshake, Plus, Pencil, Trash2, AlertCircle } from 'lucide-react';
import { doc, updateDoc, arrayUnion, increment, collection, getDocs, addDoc, deleteDoc, setDoc } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../firebase';
import confetti from 'canvas-confetti';
import { UserAvatar } from '../components/UserAvatar';

interface RewardStoreViewProps {
  user: User;
  classesList?: string[];
  onUpdateUser?: (updated: Partial<User>) => void;
  onAwardPoints?: (points: number, reason?: string) => void;
  onNavigateToTab?: (tab: string) => void;
}

export interface StoreItem {
  id: string;
  title: string;
  category: 'perk' | 'mystery';
  cost: number;
  icon: string;
  color: string;
  bgColor: string;
  borderColor: string;
  description: string;
  perkDetail?: string;
  className?: string;
  isPopular?: boolean;
}

const DEFAULT_CATALOG: StoreItem[] = [
  // ĐẶC QUYỀN VẬT PHẨM ẢO
  {
    id: 'perk_free_pass',
    title: 'Phiếu Miễn 1 Bài Kiểm Tra Nhỏ (Virtual)',
    category: 'perk',
    cost: 800,
    icon: '🎫',
    color: 'from-emerald-500 to-teal-600',
    bgColor: 'bg-emerald-50',
    borderColor: 'border-emerald-300',
    description: 'Đặc quyền đổi 800 điểm lấy 1 phiếu miễn 1 bài kiểm tra 15 phút ảo (hoặc đổi điểm cộng trực tiếp).',
    perkDetail: 'Xuất trình phiếu ảo này cho Giáo viên bộ môn để xác nhận cộng điểm bonus!'
  },
  {
    id: 'perk_bubble_tea',
    title: 'Vé Thưởng Trà Sữa Virtual 🧋',
    category: 'perk',
    cost: 120,
    icon: '☕',
    color: 'from-amber-600 to-orange-500',
    bgColor: 'bg-amber-50',
    borderColor: 'border-amber-200',
    description: 'Phần quà trà sữa ảo siêu dễ thương để lưu vào tủ đồ và khoe với bạn bè.',
    perkDetail: 'Món quà khích lệ tinh thần học tập vui vẻ!'
  },
  {
    id: 'perk_honor_cert',
    title: 'Bằng Khen Bảng Vàng Cá Nhân Hóa 📜',
    category: 'perk',
    cost: 500,
    icon: '📜',
    color: 'from-blue-600 to-indigo-700',
    bgColor: 'bg-blue-50',
    borderColor: 'border-blue-200',
    description: 'Bằng khen điện tử chính thức từ hệ thống vinh danh thành tích học tập xuất sắc.',
    perkDetail: 'Có thể hiển thị trên trang cá nhân và chia sẻ.'
  },

  // HỘP QUÀ MAY MẮN
  {
    id: 'mystery_box',
    title: 'Hộp Quà May Mắn 🎁',
    category: 'mystery',
    cost: 100,
    icon: '🎁',
    color: 'from-rose-500 to-purple-600',
    bgColor: 'bg-rose-50',
    borderColor: 'border-rose-300',
    description: 'Mở nhận ngẫu nhiên phần thưởng bất ngờ: Từ +50 điểm đến +300 điểm thưởng!',
    isPopular: true
  }
];

export function RewardStoreView({ user, classesList, onUpdateUser, onAwardPoints, onNavigateToTab }: RewardStoreViewProps) {
  const isTeacher = user.role === 'teacher' || user.role === 'admin';
  const [activeTab, setActiveTab] = useState<'all' | 'perk' | 'mystery' | 'inventory'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [redeemingItemId, setRedeemingItemId] = useState<string | null>(null);

  // For fetching custom perks
  const [customPerks, setCustomPerks] = useState<StoreItem[]>([]);
  const [isLoadingPerks, setIsLoadingPerks] = useState(true);

  // For Teacher Form
  const [showAddForm, setShowAddForm] = useState(false);
  const [newPerk, setNewPerk] = useState({ title: '', cost: 100, description: '', perkDetail: '', icon: '🌟', className: '' });
  const [isSubmitting, setIsSubmitting] = useState(false);

  // For Teacher Edit & Delete
  const [editingPerk, setEditingPerk] = useState<StoreItem | null>(null);
  const [isUpdating, setIsUpdating] = useState(false);
  const [deletingPerk, setDeletingPerk] = useState<StoreItem | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [toastMessage, setToastMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  const showToast = (text: string, type: 'success' | 'error' = 'success') => {
    setToastMessage({ text, type });
    setTimeout(() => setToastMessage(null), 3500);
  };

  const fullCatalog = [...customPerks];

  const availableClasses = React.useMemo(() => {
    if (classesList !== undefined) {
      return [...classesList].sort((a, b) => 
        a.localeCompare(b, undefined, { numeric: true, sensitivity: 'base' })
      );
    }
    
    // Fallback if classesList is not provided
    const classSet = new Set<string>();
    if (user.className) classSet.add(user.className.trim());
    fullCatalog.forEach(i => {
      if (i.className) classSet.add(i.className.trim());
    });
    const defaults = ['10A1', '10A2', '11A1', '11A2', '12A1', '12A2'];
    defaults.forEach(d => classSet.add(d));
    return Array.from(classSet).filter(Boolean).sort((a, b) => 
      a.localeCompare(b, undefined, { numeric: true, sensitivity: 'base' })
    );
  }, [user.className, fullCatalog, classesList]);

  // Modal celebration state for unlocked item or mystery box
  const [celebratingItem, setCelebratingItem] = useState<{
    item: StoreItem;
    mysteryReward?: { pointsEarned?: number };
  } | null>(null);

  const fetchPerks = async () => {
    try {
      setIsLoadingPerks(true);
      const snap = await getDocs(collection(db, 'privilege_cards'));
      let fetched: StoreItem[] = [];
      
      if (snap.empty) {
        // Seed default catalog to Firestore to make them editable/deletable
        for (const item of DEFAULT_CATALOG) {
          const docRef = doc(db, 'privilege_cards', item.id);
          await setDoc(docRef, {
            title: item.title,
            category: item.category,
            cost: item.cost,
            icon: item.icon,
            color: item.color,
            bgColor: item.bgColor,
            borderColor: item.borderColor,
            description: item.description,
            perkDetail: item.perkDetail || '',
            className: item.className || null,
            isPopular: item.isPopular || false,
            createdAt: new Date().toISOString()
          });
          fetched.push({ ...item });
        }
      } else {
        snap.forEach(docSnap => {
          const data = docSnap.data();
          fetched.push({
            id: docSnap.id,
            title: data.title,
            category: data.category || 'perk',
            cost: data.cost,
            icon: data.icon || '🌟',
            color: data.color || (data.category === 'mystery' ? 'from-rose-500 to-purple-600' : 'from-emerald-500 to-teal-600'),
            bgColor: data.bgColor || (data.category === 'mystery' ? 'bg-rose-50' : 'bg-emerald-50'),
            borderColor: data.borderColor || (data.category === 'mystery' ? 'border-rose-300' : 'border-emerald-300'),
            description: data.description,
            perkDetail: data.perkDetail,
            className: data.className,
            isPopular: data.isPopular || false
          });
        });
      }
      setCustomPerks(fetched);
    } catch (err) {
      console.error("Lỗi khi tải thẻ đặc quyền:", err);
    } finally {
      setIsLoadingPerks(false);
    }
  };

  useEffect(() => {
    fetchPerks();
  }, []);

  const userPoints = user.points || 0;
  const userRedeemed = user.redeemedRewards || [];

  // Filter items
  const filteredCatalog = fullCatalog.filter(item => {
    const isClassMatching = (assignClass: string | undefined | null, userClass: string | undefined | null): boolean => {
      if (!assignClass || assignClass.trim() === '') return true;
      if (!userClass || userClass.trim() === '') return false;
      const clean = (s: string) => {
        return s.trim()
          .toLowerCase()
          .replace(/^(lớp|lop|class)\s+/gi, '')
          .replace(/\s+/g, '');
      };
      return clean(assignClass) === clean(userClass);
    };

    // Hide class-specific items for students if they don't belong to the class
    if (!isTeacher && user.role !== 'admin' && !isClassMatching(item.className, user.className)) return false;

    if (activeTab === 'inventory') return false;
    if (activeTab !== 'all' && item.category !== activeTab) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      return item.title.toLowerCase().includes(q) || item.description.toLowerCase().includes(q);
    }
    return true;
  });

  const isItemOwned = (itemId: string) => {
    if (itemId === 'mystery_box') return false; // Mystery box can be bought repeatedly
    return userRedeemed.some(r => r.id === itemId);
  };

  const handleRedeem = async (item: StoreItem) => {
    if (userPoints < item.cost) {
      alert(`⚠️ Bạn hiện có ${userPoints} điểm, còn thiếu ${item.cost - userPoints} điểm nữa để đổi phần quà "${item.title}". Hãy tích cực làm bài tập & tham gia game học tập nhé!`);
      return;
    }

    if (isItemOwned(item.id)) {
      alert(`🎉 Bạn đã sở hữu phần quà "${item.title}" rồi! Kiểm tra trong tab "Tủ đồ của tôi".`);
      return;
    }

    setRedeemingItemId(item.id);

    try {
      const redeemedRecord: RedeemedRewardItem = {
        id: item.id,
        title: item.title,
        type: item.category as 'badge' | 'frame' | 'perk' | 'mystery',
        description: item.description,
        icon: item.icon,
        redeemedAt: new Date().toISOString(),
        cost: item.cost
      };

      const userRef = doc(db, 'users', user.id);
      let mysteryRewardResult: { pointsEarned?: number } | undefined = undefined;

      const updates: any = {
        points: increment(-item.cost),
        redeemedRewards: arrayUnion(redeemedRecord)
      };

      if (item.category === 'mystery') {
        const pts = Math.floor(Math.random() * 200) + 50; // 50 to 250
        updates.points = increment(-item.cost + pts);
        mysteryRewardResult = { pointsEarned: pts };
      }

      await updateDoc(userRef, updates);

      const updatedUser: Partial<User> = {
        points: Math.max(0, userPoints - item.cost + (mysteryRewardResult?.pointsEarned || 0)),
        redeemedRewards: [...userRedeemed, redeemedRecord]
      };

      if (onUpdateUser) {
        onUpdateUser(updatedUser);
      }

      confetti({
        particleCount: 120,
        spread: 80,
        origin: { y: 0.6 }
      });

      setCelebratingItem({
        item,
        mysteryReward: mysteryRewardResult
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `users/${user.id}`);
      alert('Đã xảy ra lỗi khi thực hiện đổi quà. Vui lòng thử lại sau.');
    } finally {
      setRedeemingItemId(null);
    }
  };

  const handleAddPerk = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPerk.title.trim() || newPerk.cost <= 0) return;
    setIsSubmitting(true);
    try {
      await addDoc(collection(db, 'privilege_cards'), {
        title: newPerk.title,
        cost: newPerk.cost,
        description: newPerk.description,
        perkDetail: newPerk.perkDetail,
        icon: newPerk.icon,
        className: newPerk.className.trim() || null,
        createdAt: new Date().toISOString()
      });
      setShowAddForm(false);
      setNewPerk({ title: '', cost: 100, description: '', perkDetail: '', icon: '🌟', className: '' });
      fetchPerks();
      showToast('Thêm thẻ đặc quyền thành công!', 'success');
    } catch (err) {
      console.error(err);
      showToast('Lỗi khi thêm thẻ đặc quyền.', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleConfirmDeletePerk = async () => {
    if (!deletingPerk) return;
    setIsDeleting(true);
    try {
      await deleteDoc(doc(db, 'privilege_cards', deletingPerk.id));
      setDeletingPerk(null);
      fetchPerks();
      showToast('Đã xóa thẻ đặc quyền thành công!', 'success');
    } catch (err) {
      console.error(err);
      showToast('Lỗi khi xóa thẻ đặc quyền.', 'error');
    } finally {
      setIsDeleting(false);
    }
  };

  const handleUpdatePerk = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingPerk || !editingPerk.title.trim() || editingPerk.cost <= 0) return;
    setIsUpdating(true);
    try {
      await updateDoc(doc(db, 'privilege_cards', editingPerk.id), {
        title: editingPerk.title,
        cost: editingPerk.cost,
        description: editingPerk.description,
        perkDetail: editingPerk.perkDetail || '',
        icon: editingPerk.icon,
        className: editingPerk.className?.trim() || null
      });
      setEditingPerk(null);
      fetchPerks();
      showToast('Cập nhật thẻ đặc quyền thành công!', 'success');
    } catch (err) {
      console.error(err);
      showToast('Lỗi khi cập nhật thẻ đặc quyền.', 'error');
    } finally {
      setIsUpdating(false);
    }
  };

  if (isTeacher) {
    return (
      <div className="space-y-6 max-w-7xl mx-auto pb-12 animate-in fade-in duration-300">
        <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-emerald-900 via-teal-900 to-slate-900 text-white p-6 sm:p-8 shadow-2xl border border-emerald-500/30">
          <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
            <div className="space-y-3 max-w-2xl">
              <div className="inline-flex items-center gap-2 px-3 py-1 bg-amber-500/20 border border-amber-400/40 rounded-full text-amber-300 text-xs font-black uppercase tracking-wider shadow-inner">
                <ShieldCheck className="w-3.5 h-3.5" />
                <span>Quản Lý Đặc Quyền Học Sinh</span>
              </div>
              <h1 className="text-2xl sm:text-4xl font-black text-white tracking-tight flex items-center gap-3">
                Thiết Lập Thẻ Đặc Quyền
              </h1>
              <p className="text-slate-300 text-xs sm:text-sm font-medium leading-relaxed">
                Tại đây Thầy/Cô có thể tạo thêm các Thẻ Đặc Quyền (Ví dụ: Miễn kiểm tra, Đổi điểm lấy quà, Voucher trà sữa...) để học sinh dùng điểm thưởng quy đổi.
              </p>
            </div>
            
            <button
              onClick={() => setShowAddForm(!showAddForm)}
              className="px-4 py-2.5 bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl text-sm font-extrabold transition-all border border-emerald-400 flex items-center gap-2 shadow-lg"
            >
              {showAddForm ? <Check className="w-5 h-5" /> : <Plus className="w-5 h-5" />}
              <span>{showAddForm ? 'Đóng form' : 'Thêm Thẻ Đặc Quyền'}</span>
            </button>
          </div>
        </div>

        {showAddForm && (
          <form onSubmit={handleAddPerk} className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 space-y-4">
            <h3 className="font-bold text-lg text-slate-800">Tạo Thẻ Đặc Quyền Mới</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-600 mb-1">Tên thẻ đặc quyền <span className="text-red-500">*</span></label>
                <input required value={newPerk.title} onChange={e => setNewPerk({...newPerk, title: e.target.value})} className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm" placeholder="VD: Bút Bi Thiên Long..." />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-600 mb-1">Giá trị điểm <span className="text-red-500">*</span></label>
                <input type="number" required min={1} value={newPerk.cost} onChange={e => setNewPerk({...newPerk, cost: Number(e.target.value)})} className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm" />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-600 mb-1">Mô tả ngắn</label>
                <input value={newPerk.description} onChange={e => setNewPerk({...newPerk, description: e.target.value})} className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm" placeholder="Mô tả công dụng..." />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-600 mb-1">Chi tiết sử dụng (Tùy chọn)</label>
                <input value={newPerk.perkDetail} onChange={e => setNewPerk({...newPerk, perkDetail: e.target.value})} className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm" placeholder="Hướng dẫn đổi quà thực tế..." />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-600 mb-1">Biểu tượng (Emoji)</label>
                <input value={newPerk.icon} onChange={e => setNewPerk({...newPerk, icon: e.target.value})} className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm" placeholder="VD: 🎫, 🍔..." />
              </div>
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-xs font-bold text-slate-600">Lớp áp dụng (Tùy chọn)</label>
                  {newPerk.className && (
                    <button
                      type="button"
                      onClick={() => setNewPerk({ ...newPerk, className: '' })}
                      className="text-[11px] text-slate-400 hover:text-rose-500 font-bold transition-colors"
                    >
                      Toàn trường
                    </button>
                  )}
                </div>
                <select
                  value={availableClasses.includes(newPerk.className || '') ? newPerk.className : (newPerk.className ? '__custom__' : '')}
                  onChange={e => {
                    if (e.target.value === '__custom__') {
                      // keep
                    } else {
                      setNewPerk({ ...newPerk, className: e.target.value });
                    }
                  }}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs font-semibold mb-1"
                >
                  <option value="">🌐 Toàn bộ học sinh (Áp dụng toàn trường)</option>
                  <optgroup label="Danh sách các lớp trong hệ thống">
                    {availableClasses.map((cls) => (
                      <option key={cls} value={cls}>
                        🏫 Lớp {cls}
                      </option>
                    ))}
                  </optgroup>
                </select>
                <div className="flex flex-wrap gap-1">
                  {availableClasses.map((clsTitle) => {
                    const isSelected = newPerk.className === clsTitle;
                    return (
                      <button
                        key={clsTitle}
                        type="button"
                        onClick={() => setNewPerk({ ...newPerk, className: isSelected ? '' : clsTitle })}
                        className={`px-2 py-0.5 text-[10px] rounded-lg font-bold border transition-all ${
                          isSelected
                            ? 'bg-indigo-600 border-indigo-600 text-white'
                            : 'bg-white border-slate-200 text-slate-600 hover:bg-indigo-50 hover:text-indigo-600'
                        }`}
                      >
                        {clsTitle}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
            <button type="submit" disabled={isSubmitting} className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-bold rounded-xl">
              {isSubmitting ? 'Đang lưu...' : 'Lưu Đặc Quyền'}
            </button>
          </form>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {fullCatalog.filter(i => i.category === 'perk').map(item => {
            return (
              <div key={item.id} className={`reward-card-item group relative bg-white rounded-3xl border-2 border-indigo-100 shadow-sm p-5 hover:shadow-xl hover:border-indigo-200 transition-all flex flex-col h-full`}>
                <div className="flex items-start justify-between mb-3">
                  <div className={`w-14 h-14 rounded-2xl bg-gradient-to-br ${item.color || 'from-emerald-500 to-teal-600'} flex items-center justify-center text-2xl shadow-lg transform group-hover:scale-110 transition-transform`}>
                    {item.icon}
                  </div>
                  <div className="flex flex-col items-end gap-1.5">
                    <div className="px-2.5 py-1 bg-amber-50 text-amber-700 border border-amber-200 rounded-lg text-xs font-black flex items-center gap-1">
                      <Star className="w-3.5 h-3.5 fill-current" />
                      <span>{item.cost}</span>
                    </div>
                    {item.className ? (
                      <span className="px-2 py-0.5 bg-indigo-50 border border-indigo-100 text-indigo-700 text-[10px] font-black rounded-md">
                        🏫 Lớp {item.className}
                      </span>
                    ) : (
                      <span className="px-2 py-0.5 bg-slate-100 border border-slate-200 text-slate-500 text-[10px] font-black rounded-md">
                        🌐 Toàn trường
                      </span>
                    )}
                  </div>
                </div>

                <h3 className="font-extrabold text-slate-800 text-lg leading-tight mb-2 group-hover:text-indigo-700 transition-colors">
                  {item.title}
                </h3>
                
                <p className="text-slate-500 text-xs font-medium leading-relaxed mb-4 flex-1">
                  {item.description}
                </p>

                {item.perkDetail && (
                  <div className="mb-4 p-2.5 bg-slate-50/80 rounded-xl border border-slate-100 text-[11px] font-semibold text-slate-500">
                    💡 {item.perkDetail}
                  </div>
                )}

                {/* Edit & Delete Action Buttons */}
                <div className="pt-4 border-t border-slate-100 flex items-center justify-between gap-2 mt-auto">
                  <div className="flex items-center gap-2 w-full justify-end">
                    <button 
                      type="button"
                      onClick={() => setEditingPerk(item)} 
                      className="px-3 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 active:scale-95 rounded-xl transition-all flex items-center gap-1.5 border border-indigo-100 text-xs font-bold cursor-pointer"
                      title="Chỉnh sửa thẻ đặc quyền này"
                    >
                      <Pencil className="w-3.5 h-3.5" />
                      <span>Sửa</span>
                    </button>
                    <button 
                      type="button"
                      onClick={() => setDeletingPerk(item)} 
                      className="px-3 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-600 active:scale-95 rounded-xl transition-all flex items-center gap-1.5 border border-rose-100 text-xs font-bold cursor-pointer" 
                      title="Xóa thẻ đặc quyền này"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>Xóa</span>
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
          {isLoadingPerks && <div className="col-span-full text-center py-10 text-slate-500 font-medium text-sm">Đang tải thẻ đặc quyền...</div>}
        </div>

        {/* TOAST NOTIFICATION */}
        {toastMessage && (
          <div className="fixed bottom-6 right-6 z-[120] animate-in slide-in-from-bottom-5 duration-300">
            <div className={`flex items-center gap-2.5 px-4 py-3 rounded-2xl shadow-xl border text-sm font-bold ${
              toastMessage.type === 'error'
                ? 'bg-rose-600 text-white border-rose-700'
                : 'bg-emerald-600 text-white border-emerald-700'
            }`}>
              {toastMessage.type === 'error' ? <AlertCircle className="w-5 h-5" /> : <Check className="w-5 h-5" />}
              <span>{toastMessage.text}</span>
            </div>
          </div>
        )}

        {/* CONFIRM DELETE MODAL */}
        {deletingPerk && (
          <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="bg-white rounded-3xl w-full max-w-md p-6 sm:p-7 shadow-2xl relative text-left overflow-hidden animate-in zoom-in-95 duration-200 border border-slate-100">
              <div className="w-12 h-12 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center mb-4 border border-rose-100">
                <Trash2 className="w-6 h-6" />
              </div>
              <h3 className="text-xl font-black text-slate-800 mb-2">
                Xác nhận xóa thẻ đặc quyền
              </h3>
              <p className="text-sm text-slate-600 mb-6 leading-relaxed">
                Thầy/Cô có chắc chắn muốn xóa thẻ <strong className="text-slate-900">"{deletingPerk.title}"</strong> không? Học sinh sẽ không thể đổi thẻ này nữa.
              </p>
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => setDeletingPerk(null)}
                  className="flex-1 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl text-sm transition-all"
                >
                  Hủy bỏ
                </button>
                <button
                  type="button"
                  disabled={isDeleting}
                  onClick={handleConfirmDeletePerk}
                  className="flex-1 py-2.5 bg-rose-600 hover:bg-rose-700 disabled:opacity-50 text-white font-bold rounded-xl text-sm transition-all flex items-center justify-center gap-2 shadow-md shadow-rose-600/20"
                >
                  {isDeleting ? (
                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  ) : (
                    <span>Xác nhận xóa</span>
                  )}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* EDIT PERK MODAL */}
        {editingPerk && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="bg-white rounded-3xl w-full max-w-lg p-6 sm:p-8 shadow-2xl relative text-left overflow-hidden animate-in zoom-in-95 duration-300 max-h-[90vh] overflow-y-auto custom-scrollbar">
              <h3 className="text-xl font-black text-slate-800 mb-4 flex items-center gap-2 pb-3 border-b border-slate-100">
                <Pencil className="w-5 h-5 text-indigo-600" />
                <span>Chỉnh Sửa Thẻ Đặc Quyền</span>
              </h3>

              <form onSubmit={handleUpdatePerk} className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-slate-600 mb-1">
                    Tên thẻ đặc quyền <span className="text-red-500">*</span>
                  </label>
                  <input
                    required
                    value={editingPerk.title}
                    onChange={e => setEditingPerk({ ...editingPerk, title: e.target.value })}
                    className="w-full px-3 py-2.5 border border-slate-300 rounded-xl text-sm font-semibold outline-none focus:ring-2 focus:ring-indigo-500/20"
                    placeholder="VD: Phiếu miễn bài kiểm tra..."
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-600 mb-1">
                      Giá trị điểm <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="number"
                      required
                      min={1}
                      value={editingPerk.cost}
                      onChange={e => setEditingPerk({ ...editingPerk, cost: Number(e.target.value) })}
                      className="w-full px-3 py-2.5 border border-slate-300 rounded-xl text-sm font-semibold outline-none focus:ring-2 focus:ring-indigo-500/20"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-600 mb-1">
                      Biểu tượng (Emoji)
                    </label>
                    <input
                      value={editingPerk.icon}
                      onChange={e => setEditingPerk({ ...editingPerk, icon: e.target.value })}
                      className="w-full px-3 py-2.5 border border-slate-300 rounded-xl text-sm font-semibold outline-none focus:ring-2 focus:ring-indigo-500/20"
                      placeholder="VD: 🎫, 🎁..."
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-600 mb-1">
                    Mô tả ngắn
                  </label>
                  <textarea
                    value={editingPerk.description}
                    onChange={e => setEditingPerk({ ...editingPerk, description: e.target.value })}
                    className="w-full px-3 py-2.5 border border-slate-300 rounded-xl text-sm font-semibold outline-none focus:ring-2 focus:ring-indigo-500/20 h-20 resize-none"
                    placeholder="Mô tả công dụng của thẻ đặc quyền..."
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-600 mb-1">
                    Chi tiết sử dụng (Tùy chọn)
                  </label>
                  <input
                    value={editingPerk.perkDetail || ''}
                    onChange={e => setEditingPerk({ ...editingPerk, perkDetail: e.target.value })}
                    className="w-full px-3 py-2.5 border border-slate-300 rounded-xl text-sm font-semibold outline-none focus:ring-2 focus:ring-indigo-500/20"
                    placeholder="VD: Xuất trình phiếu cho Giáo viên bộ môn..."
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-600 mb-1">
                    Lớp áp dụng (Tùy chọn)
                  </label>
                  <select
                    value={editingPerk.className || ''}
                    onChange={e => setEditingPerk({ ...editingPerk, className: e.target.value })}
                    className="w-full px-3 py-2.5 border border-slate-300 rounded-xl text-xs font-semibold outline-none focus:ring-2 focus:ring-indigo-500/20"
                  >
                    <option value="">🌐 Toàn bộ học sinh (Áp dụng toàn trường)</option>
                    {availableClasses.map((cls) => (
                      <option key={cls} value={cls}>
                        🏫 Lớp {cls}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="flex gap-3 pt-4 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() => setEditingPerk(null)}
                    className="flex-1 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-bold transition-all text-sm"
                  >
                    Hủy bỏ
                  </button>
                  <button
                    type="submit"
                    disabled={isUpdating}
                    className="flex-1 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold transition-all text-sm flex items-center justify-center gap-2"
                  >
                    {isUpdating ? (
                      <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    ) : (
                      <span>Lưu Thay Đổi</span>
                    )}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12 animate-in fade-in duration-300">
      
      {/* HEADER BANNER CARD */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-indigo-950 via-purple-900 to-slate-900 text-white p-6 sm:p-8 shadow-2xl border border-indigo-500/30">
        <div className="absolute -right-10 -bottom-10 w-72 h-72 bg-indigo-500/20 rounded-full blur-3xl pointer-events-none"></div>
        <div className="absolute right-1/3 -top-12 w-48 h-48 bg-purple-500/20 rounded-full blur-2xl pointer-events-none"></div>
        
        <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
          <div className="space-y-3 max-w-2xl">
            <div className="inline-flex items-center gap-2 px-3 py-1 bg-amber-500/20 border border-amber-400/40 rounded-full text-amber-300 text-xs font-black uppercase tracking-wider shadow-inner">
              <Sparkles className="w-3.5 h-3.5 text-amber-400 animate-spin" />
              <span>Cửa Hàng Đổi Quà Thưởng Học Đường</span>
            </div>
            <h1 className="text-2xl sm:text-4xl font-black text-white tracking-tight flex items-center gap-3">
              <span>Đổi Điểm Tích Lũy lấy Quà Thưởng</span>
              <Gift className="w-8 h-8 text-amber-400 animate-bounce hidden sm:inline-block" />
            </h1>
            <p className="text-slate-300 text-xs sm:text-sm font-medium leading-relaxed">
              Sử dụng điểm tích lũy học tập của bạn tại đây để đổi lấy các Thẻ đặc quyền ưu tiên và Hộp quà may mắn cực chất!
            </p>
          </div>

          {/* User Points Card Display */}
          <div className="w-full md:w-auto bg-white/10 backdrop-blur-md border border-white/20 p-5 rounded-2xl flex items-center justify-between md:justify-start gap-4 shadow-xl shrink-0">
            <div className="flex items-center gap-3">
              <UserAvatar name={user.name} firstName={user.firstName} avatar={user.avatar} size="lg" />
              <div>
                <p className="text-[11px] font-bold text-indigo-200 uppercase tracking-wider">Số điểm hiện có</p>
                <div className="flex items-baseline gap-1.5">
                  <span className="text-3xl font-black text-amber-400 font-mono drop-shadow">{userPoints}</span>
                  <span className="text-xs font-extrabold text-amber-200 uppercase">XP / Điểm</span>
                </div>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setActiveTab('inventory')}
              className="px-3.5 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-extrabold transition-all border border-indigo-400 flex items-center gap-1.5 shadow-md shrink-0 active:scale-95"
            >
              <PackageCheck className="w-4 h-4 text-amber-300" />
              <span>Tủ đồ của tôi ({userRedeemed.length})</span>
            </button>
          </div>
        </div>
      </div>

      {/* NAVIGATION TABS & SEARCH */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4 bg-white p-2.5 rounded-2xl border border-slate-200 shadow-sm">
        {/* Category Tabs */}
        <div className="flex items-center gap-1 overflow-x-auto custom-scrollbar pb-1 sm:pb-0">
          <button
            type="button"
            onClick={() => setActiveTab('all')}
            className={`px-4 py-2 rounded-xl text-xs font-black whitespace-nowrap transition-all flex items-center gap-2 ${
              activeTab === 'all'
                ? 'bg-indigo-600 text-white shadow-md'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            <ShoppingBag className="w-4 h-4" />
            <span>Tất Cả Phần Quà</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('perk')}
            className={`px-4 py-2 rounded-xl text-xs font-black whitespace-nowrap transition-all flex items-center gap-2 ${
              activeTab === 'perk'
                ? 'bg-emerald-600 text-white shadow-md'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            <HeartHandshake className="w-4 h-4" />
            <span>Thẻ Đặc Quyền</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('mystery')}
            className={`px-4 py-2 rounded-xl text-xs font-black whitespace-nowrap transition-all flex items-center gap-2 ${
              activeTab === 'mystery'
                ? 'bg-rose-600 text-white shadow-md'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            <Gift className="w-4 h-4" />
            <span>Hộp Quà May Mắn</span>
          </button>
        </div>

        {/* Search */}
        <div className="relative flex-1 sm:max-w-xs">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Tìm kiếm phần quà..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-indigo-500 transition-all font-medium"
          />
        </div>
      </div>

      {/* RENDER INVENTORY TAB */}
      {activeTab === 'inventory' && (
        <div className="bg-white rounded-3xl border border-slate-200 p-6 sm:p-8 shadow-sm">
          <div className="flex items-center gap-3 mb-6 pb-4 border-b border-slate-100">
            <div className="w-10 h-10 rounded-xl bg-indigo-100 text-indigo-600 flex items-center justify-center">
              <PackageCheck className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-xl font-black text-slate-800">Tủ đồ của tôi</h2>
              <p className="text-sm text-slate-500 font-medium">Danh sách vật phẩm bạn đã sở hữu</p>
            </div>
          </div>

          {userRedeemed.length === 0 ? (
            <div className="text-center py-12">
              <div className="w-20 h-20 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-4 border-2 border-dashed border-slate-200">
                <Gift className="w-8 h-8 text-slate-300" />
              </div>
              <h3 className="text-lg font-bold text-slate-700 mb-1">Tủ đồ trống</h3>
              <p className="text-slate-500 text-sm">Bạn chưa đổi phần quà nào. Hãy tích lũy thêm điểm nhé!</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {userRedeemed.map((item, idx) => (
                <div key={`${item.id}-${idx}`} className="flex gap-4 p-4 rounded-2xl bg-slate-50 border border-slate-200 hover:border-indigo-200 transition-colors">
                  <div className="w-12 h-12 rounded-xl bg-white shadow-sm border border-slate-100 flex items-center justify-center text-2xl shrink-0">
                    {item.icon}
                  </div>
                  <div>
                    <h4 className="font-bold text-slate-800 text-sm mb-1">{item.title}</h4>
                    <span className="inline-block px-2 py-0.5 bg-slate-200 text-slate-600 text-[10px] font-bold rounded uppercase tracking-wider mb-2">
                      {item.type === 'perk' ? 'Đặc quyền' : 'Hộp quà'}
                    </span>
                    <p className="text-xs text-slate-500 line-clamp-2 leading-relaxed">
                      {item.description}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* STORE ITEMS GRID */}
      {activeTab !== 'inventory' && (
        <>
          {filteredCatalog.length === 0 ? (
            <div className="text-center py-16 bg-white rounded-3xl border border-slate-200 border-dashed">
              <p className="text-slate-500 font-medium">Không tìm thấy phần thưởng nào phù hợp.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5 xl:gap-6">
              {filteredCatalog.map(item => {
                const owned = isItemOwned(item.id);
                const canAfford = userPoints >= item.cost;
                const isRedeeming = redeemingItemId === item.id;

                return (
                  <div 
                    key={item.id} 
                    className={`reward-card-item group relative bg-white rounded-3xl border-2 ${
                      owned ? 'border-indigo-100 bg-indigo-50/30' : 'border-slate-100'
                    } p-5 sm:p-6 shadow-sm hover:shadow-xl hover:border-indigo-200 transition-all flex flex-col h-full`}
                  >
                    {item.isPopular && !owned && (
                      <div className="absolute -top-3 -right-3 px-3 py-1 bg-gradient-to-r from-rose-500 to-pink-500 text-white text-[10px] font-black uppercase tracking-wider rounded-full shadow-md shadow-rose-200 transform rotate-12 group-hover:scale-110 transition-transform">
                        Hot 🔥
                      </div>
                    )}
                    
                    {owned && item.category !== 'mystery' && (
                      <div className="absolute -top-3 -right-3 w-8 h-8 bg-indigo-600 text-white rounded-full flex items-center justify-center shadow-md">
                        <Check className="w-4 h-4" />
                      </div>
                    )}

                    <div className="flex items-start justify-between mb-4">
                      <div className={`w-14 h-14 sm:w-16 sm:h-16 rounded-2xl bg-gradient-to-br ${item.color} flex items-center justify-center text-2xl sm:text-3xl shadow-lg transform group-hover:scale-110 transition-transform`}>
                        {item.icon}
                      </div>
                      <div className={`px-2.5 py-1 ${canAfford ? 'bg-amber-50 text-amber-700 border-amber-200' : 'bg-slate-100 text-slate-500 border-slate-200'} border rounded-lg text-xs sm:text-sm font-black flex items-center gap-1.5`}>
                        <Star className={`w-3.5 h-3.5 ${canAfford ? 'fill-current' : ''}`} />
                        <span>{item.cost}</span>
                      </div>
                    </div>

                    <h3 className="font-extrabold text-slate-800 text-lg leading-tight mb-2 group-hover:text-indigo-700 transition-colors">
                      {item.title}
                    </h3>
                    
                    <p className="text-slate-500 text-xs font-medium leading-relaxed mb-4 flex-1">
                      {item.description}
                    </p>

                    {item.category === 'perk' && item.perkDetail && (
                      <div className="mb-5 p-3 bg-slate-50 rounded-xl border border-slate-100">
                        <div className="flex items-start gap-2">
                          <ShieldCheck className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                          <p className="text-[11px] font-semibold text-slate-600 leading-snug">
                            {item.perkDetail}
                          </p>
                        </div>
                      </div>
                    )}

                    <button
                      onClick={() => handleRedeem(item)}
                      disabled={isRedeeming || (owned && item.category !== 'mystery')}
                      className={`w-full py-2.5 rounded-xl text-sm font-bold transition-all flex items-center justify-center gap-2 ${
                        owned && item.category !== 'mystery'
                          ? 'bg-indigo-50 text-indigo-700 border border-indigo-200'
                          : canAfford
                            ? 'bg-indigo-600 hover:bg-indigo-700 text-white shadow-md hover:shadow-lg hover:-translate-y-0.5'
                            : 'bg-slate-100 text-slate-400 cursor-not-allowed'
                      }`}
                    >
                      {isRedeeming ? (
                        <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      ) : owned && item.category !== 'mystery' ? (
                        <>
                          <Check className="w-4 h-4" />
                          <span>Đã sở hữu</span>
                        </>
                      ) : (
                        <>
                          {canAfford ? <Gift className="w-4 h-4" /> : <Lock className="w-4 h-4" />}
                          <span>{canAfford ? 'Đổi Quà Ngay' : 'Chưa đủ điểm'}</span>
                        </>
                      )}
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </>
      )}

      {/* CELEBRATION MODAL */}
      {celebratingItem && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl w-full max-w-sm p-6 sm:p-8 shadow-2xl relative text-center overflow-hidden animate-in zoom-in-95 duration-300">
            <div className={`absolute top-0 left-0 w-full h-32 bg-gradient-to-br ${celebratingItem.item.color} opacity-20`}></div>
            
            <button 
              onClick={() => setCelebratingItem(null)}
              className="absolute top-4 right-4 w-8 h-8 bg-black/5 hover:bg-black/10 rounded-full flex items-center justify-center transition-colors z-10"
            >
              <Check className="w-4 h-4 text-slate-600" />
            </button>

            <div className={`w-24 h-24 mx-auto rounded-2xl bg-gradient-to-br ${celebratingItem.item.color} flex items-center justify-center text-4xl shadow-xl relative z-10 mb-6 transform -rotate-6`}>
              {celebratingItem.item.icon}
            </div>

            <h3 className="text-2xl font-black text-slate-800 mb-2 relative z-10">
              Đổi quà thành công!
            </h3>
            
            <p className="text-slate-600 font-medium text-sm mb-6 relative z-10">
              Bạn đã sở hữu <strong className="text-indigo-600">{celebratingItem.item.title}</strong>.
            </p>

            {celebratingItem.mysteryReward && (
              <div className="mb-6 p-4 bg-amber-50 rounded-2xl border border-amber-200">
                <p className="text-xs font-bold text-amber-600 uppercase tracking-wider mb-2">Phần thưởng bí ẩn</p>
                {celebratingItem.mysteryReward.pointsEarned && (
                  <div className="flex items-center justify-center gap-2 text-xl font-black text-amber-500">
                    <Star className="w-5 h-5 fill-current" />
                    <span>+{celebratingItem.mysteryReward.pointsEarned} XP</span>
                  </div>
                )}
              </div>
            )}

            <button 
              onClick={() => setCelebratingItem(null)}
              className="w-full py-3 bg-slate-900 hover:bg-slate-800 text-white rounded-xl font-bold transition-all relative z-10"
            >
              Tuyệt vời!
            </button>
          </div>
        </div>
      )}

      {/* EDIT PERK MODAL */}
      {editingPerk && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl w-full max-w-lg p-6 sm:p-8 shadow-2xl relative text-left overflow-hidden animate-in zoom-in-95 duration-300 max-h-[90vh] overflow-y-auto custom-scrollbar">
            <h3 className="text-xl font-black text-slate-800 mb-4 flex items-center gap-2 pb-3 border-b border-slate-100">
              <Pencil className="w-5 h-5 text-indigo-600" />
              <span>Chỉnh Sửa Thẻ Đặc Quyền</span>
            </h3>

            <form onSubmit={handleUpdatePerk} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-600 mb-1">
                  Tên thẻ đặc quyền <span className="text-red-500">*</span>
                </label>
                <input
                  required
                  value={editingPerk.title}
                  onChange={e => setEditingPerk({ ...editingPerk, title: e.target.value })}
                  className="w-full px-3 py-2.5 border border-slate-300 rounded-xl text-sm font-semibold outline-none focus:ring-2 focus:ring-indigo-500/20"
                  placeholder="VD: Phiếu miễn bài kiểm tra..."
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-600 mb-1">
                    Giá trị điểm <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="number"
                    required
                    min={1}
                    value={editingPerk.cost}
                    onChange={e => setEditingPerk({ ...editingPerk, cost: Number(e.target.value) })}
                    className="w-full px-3 py-2.5 border border-slate-300 rounded-xl text-sm font-semibold outline-none focus:ring-2 focus:ring-indigo-500/20"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-600 mb-1">
                    Biểu tượng (Emoji)
                  </label>
                  <input
                    value={editingPerk.icon}
                    onChange={e => setEditingPerk({ ...editingPerk, icon: e.target.value })}
                    className="w-full px-3 py-2.5 border border-slate-300 rounded-xl text-sm font-semibold outline-none focus:ring-2 focus:ring-indigo-500/20"
                    placeholder="VD: 🎫, 🎁..."
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-600 mb-1">
                  Mô tả ngắn
                </label>
                <textarea
                  value={editingPerk.description}
                  onChange={e => setEditingPerk({ ...editingPerk, description: e.target.value })}
                  className="w-full px-3 py-2.5 border border-slate-300 rounded-xl text-sm font-semibold outline-none focus:ring-2 focus:ring-indigo-500/20 h-20 resize-none"
                  placeholder="Mô tả công dụng của thẻ đặc quyền..."
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-600 mb-1">
                  Chi tiết sử dụng (Tùy chọn)
                </label>
                <input
                  value={editingPerk.perkDetail || ''}
                  onChange={e => setEditingPerk({ ...editingPerk, perkDetail: e.target.value })}
                  className="w-full px-3 py-2.5 border border-slate-300 rounded-xl text-sm font-semibold outline-none focus:ring-2 focus:ring-indigo-500/20"
                  placeholder="VD: Xuất trình phiếu cho Giáo viên bộ môn..."
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-600 mb-1">
                  Lớp áp dụng (Tùy chọn)
                </label>
                <select
                  value={editingPerk.className || ''}
                  onChange={e => setEditingPerk({ ...editingPerk, className: e.target.value })}
                  className="w-full px-3 py-2.5 border border-slate-300 rounded-xl text-xs font-semibold outline-none focus:ring-2 focus:ring-indigo-500/20"
                >
                  <option value="">🌐 Toàn bộ học sinh (Áp dụng toàn trường)</option>
                  {availableClasses.map((cls) => (
                    <option key={cls} value={cls}>
                      🏫 Lớp {cls}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex gap-3 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setEditingPerk(null)}
                  className="flex-1 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-bold transition-all text-sm"
                >
                  Hủy bỏ
                </button>
                <button
                  type="submit"
                  disabled={isUpdating}
                  className="flex-1 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold transition-all text-sm flex items-center justify-center gap-2"
                >
                  {isUpdating ? (
                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  ) : (
                    <span>Lưu Thay Đổi</span>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
