import React, { useState, useEffect, useRef } from 'react';
import { 
  Save, Settings, CheckCircle, AlertCircle, Sparkles, Camera, LayoutGrid, 
  List, Upload, Check, Image as ImageIcon, Volume2, VolumeX, Music, Play, Square, Sliders, Volume1
} from 'lucide-react';
import { db, handleFirestoreError, OperationType } from '../firebase';
import { doc, getDoc, updateDoc, setDoc } from 'firebase/firestore';
import { User } from '../types';
import { CameraCapture } from '../components/CameraCapture';
import { gameAudio, getSoundConfig, saveSoundConfig, GameSoundConfig } from '../utils/gameAudio';

interface SettingsViewProps {
  user: User;
  onUpdateUser?: (user: User) => void;
}

const DEFAULT_AVATARS = [
  { id: 'av_1', label: '🎓 Siêu trí tuệ', url: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=200' },
  { id: 'av_2', label: '🚀 Khám phá', url: 'https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?auto=format&fit=crop&q=80&w=200' },
  { id: 'av_3', label: '🎨 Sáng tạo', url: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?auto=format&fit=crop&q=80&w=200' },
  { id: 'av_4', label: '🐱 Mèo thông thái', url: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&q=80&w=200' },
  { id: 'av_5', label: '🦊 Cáo cần mẫn', url: 'https://images.unsplash.com/photo-1501196354995-cbb51c65aaea?auto=format&fit=crop&q=80&w=200' },
  { id: 'av_6', label: '🦁 Sư tử can đảm', url: 'https://images.unsplash.com/photo-1492562080023-ab3db95bfbce?auto=format&fit=crop&q=80&w=200' },
  { id: 'av_7', label: '🐼 Gấu chăm chỉ', url: 'https://images.unsplash.com/photo-1524504388940-b1c1722653e1?auto=format&fit=crop&q=80&w=200' },
  { id: 'av_8', label: '🦉 Cú tri thức', url: 'https://images.unsplash.com/photo-1488426862026-3ee34a7d66df?auto=format&fit=crop&q=80&w=200' },
  { id: 'av_9', label: '🤖 Smart Bot', url: 'https://api.dicebear.com/7.x/bottts/svg?seed=SmartBot' },
  { id: 'av_10', label: '🦸 Siêu học sinh', url: 'https://api.dicebear.com/7.x/adventurer/svg?seed=HeroStudent' },
  { id: 'av_11', label: '🌟 Ngôi sao xanh', url: 'https://api.dicebear.com/7.x/avataaars/svg?seed=BrightStar' },
  { id: 'av_12', label: '🌱 Mầm tri thức', url: 'https://api.dicebear.com/7.x/adventurer/svg?seed=GreenSprout' },
];

const compressAndResizeImage = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const MAX = 250;
        let width = img.width;
        let height = img.height;
        if (width > height) {
          if (width > MAX) {
            height = Math.round((height * MAX) / width);
            width = MAX;
          }
        } else {
          if (height > MAX) {
            width = Math.round((width * MAX) / height);
            height = MAX;
          }
        }
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(img, 0, 0, width, height);
          resolve(canvas.toDataURL('image/jpeg', 0.85));
        } else {
          resolve(e.target?.result as string);
        }
      };
      img.onerror = reject;
      img.src = e.target?.result as string;
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
};

export function SettingsView({ user, onUpdateUser }: SettingsViewProps) {
  const [academicYear, setAcademicYear] = useState(() => {
    return localStorage.getItem('academic_year') || 'Khóa 2024 - 2025';
  });
  const [layoutDensity, setLayoutDensity] = useState<'comfortable' | 'compact'>(() => {
    return (localStorage.getItem('layout_density') as 'comfortable' | 'compact') || 'comfortable';
  });
  const [className, setClassName] = useState('');
  const [connectionCode, setConnectionCode] = useState('');
  
  // Game Audio Configuration State
  const [soundConfig, setSoundConfig] = useState<GameSoundConfig>(getSoundConfig);
  const [isPlayingBgmTest, setIsPlayingBgmTest] = useState(false);
  const bgmTestTimerRef = useRef<NodeJS.Timeout | null>(null);

  const [isLoading, setIsLoading] = useState(false);
  const [notification, setNotification] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
  const [showCamera, setShowCamera] = useState(false);
  
  const fileInputRef = useRef<HTMLInputElement>(null);

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
            if (uData.layoutDensity) setLayoutDensity(uData.layoutDensity);
            if (uData.gameSoundConfig) {
              setSoundConfig(prev => {
                const merged = { ...prev, ...uData.gameSoundConfig };
                saveSoundConfig(merged);
                return merged;
              });
            }
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

    return () => {
      if (bgmTestTimerRef.current) clearTimeout(bgmTestTimerRef.current);
      gameAudio.stopBgm();
    };
  }, [user]);

  const updateSoundField = (field: keyof GameSoundConfig, val: any) => {
    const updated = saveSoundConfig({ [field]: val });
    setSoundConfig(updated);
  };

  const handleTestBgm = () => {
    if (isPlayingBgmTest) {
      if (bgmTestTimerRef.current) clearTimeout(bgmTestTimerRef.current);
      gameAudio.stopBgm();
      setIsPlayingBgmTest(false);
    } else {
      gameAudio.startBgm('arcade');
      setIsPlayingBgmTest(true);
      bgmTestTimerRef.current = setTimeout(() => {
        gameAudio.stopBgm();
        setIsPlayingBgmTest(false);
      }, 5000);
    }
  };

  const handleTestSfx = () => {
    gameAudio.playCardFlip();
    setTimeout(() => gameAudio.playWhack(), 250);
    setTimeout(() => gameAudio.playMolePop(), 550);
    setTimeout(() => gameAudio.playCorrect(), 850);
  };

  // Save new avatar to Firestore immediately and sync local state
  const saveAvatarToFirestore = async (newAvatarUrl: string, sourceName: string) => {
    setIsLoading(true);
    setNotification(null);
    try {
      const userRef = doc(db, 'users', user.id);
      await updateDoc(userRef, {
        avatar: newAvatarUrl,
        updatedAt: new Date().toISOString()
      });
      if (onUpdateUser) {
        onUpdateUser({ ...user, avatar: newAvatarUrl });
      }
      setNotification({ message: `Cập nhật ảnh đại diện mới thành công (${sourceName})!`, type: 'success' });
    } catch (err) {
      console.error("Lỗi cập nhật Firestore avatar:", err);
      try {
        await setDoc(doc(db, 'users', user.id), { avatar: newAvatarUrl }, { merge: true });
        if (onUpdateUser) {
          onUpdateUser({ ...user, avatar: newAvatarUrl });
        }
        setNotification({ message: `Cập nhật ảnh đại diện thành công (${sourceName})!`, type: 'success' });
      } catch (e2) {
        handleFirestoreError(e2, OperationType.UPDATE, `users/${user.id}`);
        setNotification({ message: 'Không thể cập nhật ảnh đại diện vào hệ thống.', type: 'error' });
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleCaptureAvatar = async (dataUrl: string) => {
    setShowCamera(false);
    await saveAvatarToFirestore(dataUrl, 'Chụp từ Camera');
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      setNotification({ message: 'Vui lòng chọn tệp định dạng hình ảnh (PNG, JPG, WEBP, GIF).', type: 'error' });
      return;
    }
    if (file.size > 8 * 1024 * 1024) {
      setNotification({ message: 'Kích thước ảnh vượt quá 8MB. Vui lòng chọn tệp nhỏ hơn.', type: 'error' });
      return;
    }

    try {
      const dataUrl = await compressAndResizeImage(file);
      await saveAvatarToFirestore(dataUrl, 'Tải lên từ thiết bị');
    } catch (err) {
      console.error("Lỗi đọc file ảnh:", err);
      setNotification({ message: 'Không thể đọc tệp ảnh đã chọn.', type: 'error' });
    } finally {
      if (e.target) e.target.value = '';
    }
  };

  const handleSelectDefaultAvatar = async (avatarUrl: string, label: string) => {
    await saveAvatarToFirestore(avatarUrl, label);
  };

  const handleSaveConfig = async () => {
    setIsLoading(true);
    setNotification(null);
    try {
      localStorage.setItem('academic_year', academicYear);
      localStorage.setItem('layout_density', layoutDensity);
      saveSoundConfig(soundConfig);
      window.dispatchEvent(new Event('storage'));

      if (user.role === 'teacher' || user.role === 'admin') {
        await updateDoc(doc(db, 'users', user.id), {
          connectionCode: connectionCode || user.id.substring(0, 6).toUpperCase(),
          className: className,
          layoutDensity: layoutDensity,
          gameSoundConfig: soundConfig
        });
      }

      setNotification({ message: 'Lưu cài đặt thành công!', type: 'success' });
    } catch (err) {
      console.error(err);
      handleFirestoreError(err, OperationType.UPDATE, `users/${user.id}`);
      setNotification({ message: 'Có lỗi xảy ra khi lưu cấu hình.', type: 'error' });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto pb-10 space-y-6">
      {/* Header banner */}
      <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
            <Settings className="w-7 h-7 text-indigo-600" />
            {user.role === 'student' ? 'Cài đặt Cá nhân & Ảnh đại diện' : 'Cấu hình Hệ thống'}
          </h2>
          <p className="text-slate-500 text-sm mt-0.5">
            {user.role === 'student'
              ? 'Tùy chỉnh ảnh đại diện, giao diện học tập và thông tin cá nhân của bạn.'
              : 'Quản lý niên khóa, thông tin lớp học và các thông số chung của hệ thống.'}
          </p>
        </div>
      </div>

      {/* Alert / Notification banner */}
      {notification && (
        <div className={`p-4 rounded-2xl border flex items-start gap-3 transition-all animate-fadeIn ${
          notification.type === 'success' ? 'bg-emerald-50 border-emerald-200 text-emerald-800' : 'bg-rose-50 border-rose-200 text-rose-800'
        }`}>
          {notification.type === 'success' ? <CheckCircle className="w-5 h-5 shrink-0 mt-0.5" /> : <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />}
          <div className="text-sm font-semibold">{notification.message}</div>
        </div>
      )}

      <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-6 space-y-6">
          
          {/* Section 1: Avatar & Personal Info */}
          <div className="space-y-5">
            <h3 className="text-lg font-bold text-slate-900 border-b pb-2 flex items-center gap-2">
              <span>👤</span> 1. Ảnh đại diện & Thông tin tài khoản
            </h3>
            
            <div className="flex flex-col md:flex-row items-center md:items-start gap-6 bg-slate-50 p-6 rounded-2xl border border-slate-200/80">
              {/* Current Avatar preview */}
              <div className="flex flex-col items-center gap-2 shrink-0">
                <div className="relative group">
                  <div className="w-28 h-28 sm:w-32 sm:h-32 rounded-full overflow-hidden border-4 border-white shadow-lg bg-indigo-50 flex items-center justify-center shrink-0">
                    {user.avatar ? (
                      <img 
                        src={user.avatar} 
                        alt={user.name} 
                        className="w-full h-full object-cover"
                        referrerPolicy="no-referrer"
                      />
                    ) : (
                      <div className="text-indigo-600 font-extrabold text-4xl">
                        {user.name?.charAt(0).toUpperCase()}
                      </div>
                    )}
                  </div>
                  
                  <button
                    type="button"
                    onClick={() => setShowCamera(true)}
                    className="absolute bottom-1 right-1 p-2 bg-indigo-600 text-white rounded-full shadow-lg hover:bg-indigo-700 active:scale-95 transition-all flex items-center justify-center"
                    title="Chụp ảnh mới bằng camera"
                  >
                    <Camera className="w-4 h-4" />
                  </button>
                </div>
                <span className="text-[11px] font-bold text-emerald-600 bg-emerald-50 border border-emerald-200 px-2.5 py-0.5 rounded-full mt-1 flex items-center gap-1">
                  <Check className="w-3 h-3" /> Đã cập nhật
                </span>
              </div>
              
              {/* Action buttons & info */}
              <div className="flex-1 text-center md:text-left space-y-3">
                <div>
                  <h4 className="text-lg font-extrabold text-slate-900">{user.name}</h4>
                  <p className="text-xs font-semibold text-slate-500 capitalize mt-0.5">
                    Vai trò: {user.role === 'admin' ? 'Quản trị viên' : user.role === 'teacher' ? 'Giáo viên' : 'Học sinh'}
                    {user.className ? ` • Lớp: ${user.className}` : ''}
                  </p>
                </div>

                <p className="text-xs text-slate-600 max-w-lg leading-relaxed">
                  Thay đổi ảnh đại diện cá nhân bằng cách tải ảnh lên từ thiết bị, chụp ảnh mới qua Camera, hoặc chọn từ bộ Avatar mặc định ấn tượng bên dưới. Ảnh sẽ được tự động đồng bộ ngay vào cơ sở dữ liệu Firestore.
                </p>

                {/* Upload from file input */}
                <input 
                  type="file" 
                  ref={fileInputRef} 
                  onChange={handleFileUpload} 
                  accept="image/*" 
                  className="hidden" 
                />

                <div className="pt-1 flex flex-wrap justify-center md:justify-start gap-2.5">
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={isLoading}
                    className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition-all shadow-sm flex items-center gap-2 active:scale-95 disabled:opacity-60"
                  >
                    <Upload className="w-4 h-4" />
                    Tải ảnh từ máy tính / ĐT
                  </button>

                  <button
                    type="button"
                    onClick={() => setShowCamera(true)}
                    disabled={isLoading}
                    className="px-4 py-2 bg-white border border-slate-200 text-slate-700 hover:text-indigo-600 hover:border-indigo-200 rounded-xl text-xs font-bold transition-all shadow-sm flex items-center gap-2 active:scale-95 disabled:opacity-60"
                  >
                    <Camera className="w-4 h-4 text-indigo-500" />
                    Chụp bằng Camera
                  </button>
                </div>
              </div>
            </div>

            {/* Default Avatar Gallery */}
            <div className="bg-slate-50/70 p-5 rounded-2xl border border-slate-200/70 space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="text-sm font-extrabold text-slate-800 flex items-center gap-2">
                  <ImageIcon className="w-4 h-4 text-indigo-600" />
                  Bộ Avatar Mặc Định Hệ Thống (Chọn 1-touch để cập nhật ngay)
                </h4>
                <span className="text-[11px] font-semibold text-slate-500">12 lựa chọn độc đáo</span>
              </div>

              <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-3 pt-1">
                {DEFAULT_AVATARS.map((av) => {
                  const isSelected = user.avatar === av.url;
                  return (
                    <button
                      key={av.id}
                      type="button"
                      onClick={() => handleSelectDefaultAvatar(av.url, av.label)}
                      disabled={isLoading}
                      className={`group relative p-2 rounded-2xl border-2 transition-all flex flex-col items-center gap-1.5 text-center bg-white ${
                        isSelected 
                          ? 'border-indigo-600 ring-2 ring-indigo-600/20 shadow-md bg-indigo-50/50' 
                          : 'border-slate-200 hover:border-indigo-300 hover:shadow-sm'
                      }`}
                    >
                      <div className="w-14 h-14 rounded-full overflow-hidden border border-slate-100 bg-slate-50 shrink-0">
                        <img 
                          src={av.url} 
                          alt={av.label} 
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
                          referrerPolicy="no-referrer"
                        />
                      </div>
                      <span className="text-[10px] font-extrabold text-slate-700 truncate w-full px-1">
                        {av.label}
                      </span>

                      {isSelected && (
                        <div className="absolute top-1 right-1 w-4 h-4 bg-indigo-600 text-white rounded-full flex items-center justify-center shadow-xs">
                          <Check className="w-2.5 h-2.5 stroke-[3]" />
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Section 2: Layout & Display settings */}
          <div className="space-y-4 pt-4 border-t border-slate-100">
            <h3 className="text-lg font-bold text-slate-900 border-b pb-2 flex items-center justify-between">
              <span>2. Thông tin chung & Mật độ hiển thị</span>
            </h3>
            
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

            <div className="pt-3">
              <label className="block text-sm font-semibold text-slate-700 mb-1.5">Mật độ hiển thị Bài tập & Flashcards (Density Toggle)</label>
              <p className="text-xs text-slate-500 mb-3">Tùy chỉnh chế độ hiển thị danh sách bài tập và thẻ Flashcard phù hợp với kích thước màn hình thiết bị.</p>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Option 1: Comfortable / Grid View */}
                <div 
                  onClick={() => {
                    setLayoutDensity('comfortable');
                    localStorage.setItem('layout_density', 'comfortable');
                    window.dispatchEvent(new Event('storage'));
                  }}
                  className={`p-4 rounded-2xl border-2 cursor-pointer transition-all flex items-start gap-3.5 ${
                    layoutDensity === 'comfortable'
                      ? 'bg-indigo-50/80 border-indigo-600 ring-2 ring-indigo-600/20 shadow-sm'
                      : 'bg-white border-slate-200 hover:border-slate-300 hover:bg-slate-50'
                  }`}
                >
                  <div className={`p-2.5 rounded-xl shrink-0 ${layoutDensity === 'comfortable' ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-600'}`}>
                    <LayoutGrid className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h4 className="font-extrabold text-sm text-slate-900">Xem dạng Lưới (Grid / Comfortable)</h4>
                      {layoutDensity === 'comfortable' && <span className="text-[10px] font-bold bg-indigo-600 text-white px-2 py-0.5 rounded-full">Đang bật</span>}
                    </div>
                    <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                      Hiển thị dạng ô thẻ rộng rãi với khoảng cách thông thoáng, tối ưu cho màn hình Desktop & Tablet.
                    </p>
                  </div>
                </div>

                {/* Option 2: Compact / List View */}
                <div 
                  onClick={() => {
                    setLayoutDensity('compact');
                    localStorage.setItem('layout_density', 'compact');
                    window.dispatchEvent(new Event('storage'));
                  }}
                  className={`p-4 rounded-2xl border-2 cursor-pointer transition-all flex items-start gap-3.5 ${
                    layoutDensity === 'compact'
                      ? 'bg-indigo-50/80 border-indigo-600 ring-2 ring-indigo-600/20 shadow-sm'
                      : 'bg-white border-slate-200 hover:border-slate-300 hover:bg-slate-50'
                  }`}
                >
                  <div className={`p-2.5 rounded-xl shrink-0 ${layoutDensity === 'compact' ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-600'}`}>
                    <List className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h4 className="font-extrabold text-sm text-slate-900">Xem dạng Danh sách (List / Compact)</h4>
                      {layoutDensity === 'compact' && <span className="text-[10px] font-bold bg-indigo-600 text-white px-2 py-0.5 rounded-full">Đang bật</span>}
                    </div>
                    <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                      Hiển thị dạng dòng thu gọn cô đọng, tiết kiệm không gian, phù hợp quét nhanh trên thiết bị nhỏ.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Section 3: Game Sound & BGM Configuration */}
          <div className="space-y-4 pt-4 border-t border-slate-100">
            <div className="flex items-center justify-between border-b pb-2">
              <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                <Volume2 className="w-5 h-5 text-indigo-600" />
                3. Âm thanh Trò chơi & Nhạc nền (Game Audio)
              </h3>
              <span className="text-xs font-semibold px-2.5 py-1 bg-amber-50 text-amber-700 border border-amber-200 rounded-full">
                Đập chuột chũi & Lật thẻ bài
              </span>
            </div>

            <div className="bg-slate-50/70 p-4 sm:p-5 rounded-2xl border border-slate-200/80 space-y-4">
              {/* Master Audio Switch */}
              <div className="flex items-center justify-between gap-4 p-3.5 bg-white rounded-xl border border-slate-200 shadow-2xs">
                <div className="flex items-center gap-3">
                  <div className={`p-2 rounded-lg ${soundConfig.masterEnabled ? 'bg-indigo-100 text-indigo-600' : 'bg-slate-100 text-slate-400'}`}>
                    {soundConfig.masterEnabled ? <Volume2 className="w-5 h-5" /> : <VolumeX className="w-5 h-5" />}
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-slate-900">Bật / Tắt tất cả âm thanh game</h4>
                    <p className="text-xs text-slate-500 mt-0.5">Tổng thể âm thanh bao gồm nhạc nền và các hiệu ứng khi học sinh làm bài tập/chơi game.</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => updateSoundField('masterEnabled', !soundConfig.masterEnabled)}
                  className={`w-12 h-6 rounded-full transition-colors relative shrink-0 p-0.5 ${
                    soundConfig.masterEnabled ? 'bg-indigo-600' : 'bg-slate-300'
                  }`}
                >
                  <div
                    className={`w-5 h-5 rounded-full bg-white shadow-md transform transition-transform ${
                      soundConfig.masterEnabled ? 'translate-x-6' : 'translate-x-0'
                    }`}
                  />
                </button>
              </div>

              {/* Background Music (BGM) */}
              <div className={`p-4 rounded-xl border transition-all ${soundConfig.masterEnabled ? 'bg-white border-slate-200 shadow-2xs' : 'bg-slate-100 border-slate-200 opacity-60 pointer-events-none'}`}>
                <div className="flex items-center justify-between gap-4 mb-3">
                  <div className="flex items-center gap-3">
                    <div className={`p-2 rounded-lg ${soundConfig.bgmEnabled ? 'bg-amber-100 text-amber-600' : 'bg-slate-100 text-slate-400'}`}>
                      <Music className="w-5 h-5" />
                    </div>
                    <div>
                      <h4 className="text-sm font-bold text-slate-900">Nhạc nền trò chơi (BGM)</h4>
                      <p className="text-xs text-slate-500 mt-0.5">Giai điệu vui tươi, êm dịu tăng sự hào hứng và tập trung khi học.</p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => updateSoundField('bgmEnabled', !soundConfig.bgmEnabled)}
                    className={`w-12 h-6 rounded-full transition-colors relative shrink-0 p-0.5 ${
                      soundConfig.bgmEnabled ? 'bg-amber-500' : 'bg-slate-300'
                    }`}
                  >
                    <div
                      className={`w-5 h-5 rounded-full bg-white shadow-md transform transition-transform ${
                        soundConfig.bgmEnabled ? 'translate-x-6' : 'translate-x-0'
                      }`}
                    />
                  </button>
                </div>

                {soundConfig.bgmEnabled && (
                  <div className="pt-3 border-t border-slate-100 flex flex-wrap items-center justify-between gap-3">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-semibold text-slate-600">Âm lượng nhạc nền:</span>
                      <div className="flex items-center gap-1.5">
                        {[
                          { label: 'Nhẹ 15%', vol: 0.15 },
                          { label: 'Vừa 25%', vol: 0.25 },
                          { label: 'Rõ 45%', vol: 0.45 },
                        ].map(preset => (
                          <button
                            key={preset.vol}
                            type="button"
                            onClick={() => updateSoundField('bgmVolume', preset.vol)}
                            className={`px-2.5 py-1 rounded-lg text-xs font-bold transition ${
                              Math.abs(soundConfig.bgmVolume - preset.vol) < 0.05
                                ? 'bg-amber-500 text-white shadow-2xs'
                                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                            }`}
                          >
                            {preset.label}
                          </button>
                        ))}
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={handleTestBgm}
                      className={`px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition active:scale-95 ${
                        isPlayingBgmTest
                          ? 'bg-rose-500 text-white shadow-sm'
                          : 'bg-amber-50 text-amber-800 border border-amber-200 hover:bg-amber-100'
                      }`}
                    >
                      {isPlayingBgmTest ? (
                        <>
                          <Square className="w-3.5 h-3.5 fill-white" />
                          <span>Dừng nghe thử</span>
                        </>
                      ) : (
                        <>
                          <Play className="w-3.5 h-3.5 fill-amber-700" />
                          <span>🎵 Nghe thử nhạc nền</span>
                        </>
                      )}
                    </button>
                  </div>
                )}
              </div>

              {/* Sound Effects (SFX) */}
              <div className={`p-4 rounded-xl border transition-all ${soundConfig.masterEnabled ? 'bg-white border-slate-200 shadow-2xs' : 'bg-slate-100 border-slate-200 opacity-60 pointer-events-none'}`}>
                <div className="flex items-center justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <div className={`p-2 rounded-lg ${soundConfig.sfxEnabled ? 'bg-emerald-100 text-emerald-600' : 'bg-slate-100 text-slate-400'}`}>
                      <Volume1 className="w-5 h-5" />
                    </div>
                    <div>
                      <h4 className="text-sm font-bold text-slate-900">Hiệu ứng âm thanh tương tác (SFX)</h4>
                      <p className="text-xs text-slate-500 mt-0.5">Tiếng đập búa, lật mảnh ghép, chuông đúng/sai, âm thanh chuỗi combo và kèn chiến thắng.</p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => updateSoundField('sfxEnabled', !soundConfig.sfxEnabled)}
                    className={`w-12 h-6 rounded-full transition-colors relative shrink-0 p-0.5 ${
                      soundConfig.sfxEnabled ? 'bg-emerald-600' : 'bg-slate-300'
                    }`}
                  >
                    <div
                      className={`w-5 h-5 rounded-full bg-white shadow-md transform transition-transform ${
                        soundConfig.sfxEnabled ? 'translate-x-6' : 'translate-x-0'
                      }`}
                    />
                  </button>
                </div>

                {soundConfig.sfxEnabled && (
                  <div className="pt-3 mt-3 border-t border-slate-100 flex items-center justify-between gap-2">
                    <span className="text-xs text-slate-500">Phản hồi âm thanh tức thì khi tương tác.</span>
                    <button
                      type="button"
                      onClick={handleTestSfx}
                      className="px-3 py-1.5 rounded-xl text-xs font-bold bg-emerald-50 text-emerald-800 border border-emerald-200 hover:bg-emerald-100 flex items-center gap-1.5 transition active:scale-95"
                    >
                      <Volume2 className="w-3.5 h-3.5" />
                      <span>🔊 Thử hiệu ứng (Đập & Lật)</span>
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>

          {(user.role === 'teacher' || user.role === 'admin') && (
            <div className="space-y-4 pt-4 border-t border-slate-100">
              <h3 className="text-lg font-bold text-slate-900 border-b pb-2">4. Cấu hình Lớp học & Thông báo</h3>
              
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

          <div className="pt-6 border-t border-slate-100 flex items-center justify-end gap-3">
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
      
      {showCamera && (
        <CameraCapture 
          mode="avatar" 
          onCapture={handleCaptureAvatar} 
          onCancel={() => setShowCamera(false)} 
        />
      )}
    </div>
  );
}
