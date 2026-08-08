import React, { useState } from 'react';
import { BookOpen, Calendar, LayoutDashboard, Microscope, Users, BellRing, Menu, X, Phone, User as UserIcon, LogOut, Check, Sparkles, ShieldCheck, Edit2 } from 'lucide-react';
import { Role, User } from '../types';

export function getAvatarInitial(name?: string): string {
  if (!name || !name.trim()) return 'U';
  let cleanName = name.trim().replace(/^(Cô|Thầy|Ths|Ts|Mr|Mrs|Ms)\s+/i, '');
  if (!cleanName) cleanName = name.trim();
  return cleanName.charAt(0).toUpperCase();
}

interface LayoutProps {
  children: React.ReactNode;
  user: User;
  onRoleChange: (role: Role) => void;
  activeTab: string;
  onTabChange: (tab: string) => void;
  onUpdateUser?: (user: User) => void;
  onLogout?: () => void;
}

export function Layout({ children, user, onRoleChange, activeTab, onTabChange, onUpdateUser, onLogout }: LayoutProps) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const isTeacher = user.role === 'teacher';

  const [academicYear, setAcademicYear] = useState(() => {
    return localStorage.getItem('academic_year') || 'Khóa 2024 - 2025';
  });
  const [isEditingYear, setIsEditingYear] = useState(false);
  const [tempYear, setTempYear] = useState(academicYear);

  const handleSaveYear = () => {
    const trimmed = tempYear.trim();
    if (trimmed) {
      setAcademicYear(trimmed);
      localStorage.setItem('academic_year', trimmed);
    }
    setIsEditingYear(false);
  };

  const [showProfileModal, setShowProfileModal] = useState(false);
  const [profileName, setProfileName] = useState(user.name);
  const [profileDob, setProfileDob] = useState(user.dob || '');
  const [profilePhoneStudent, setProfilePhoneStudent] = useState(user.phoneStudent || '');
  const [profilePhoneParent, setProfilePhoneParent] = useState(user.phoneParent || '');
  const [profileClassName, setProfileClassName] = useState(user.className || '');
  const [selectedAvatar, setSelectedAvatar] = useState(user.avatar);
  const [isEditing, setIsEditing] = useState(false);

  React.useEffect(() => {
    setProfileName(user.name);
    setProfileDob(user.dob || '');
    setProfilePhoneStudent(user.phoneStudent || '');
    setProfilePhoneParent(user.phoneParent || '');
    setProfileClassName(user.className || '');
    setSelectedAvatar(user.avatar);
    setIsEditing(false);
  }, [user]);

  React.useEffect(() => {
    const handleStorageChange = () => {
      setAcademicYear(localStorage.getItem('academic_year') || 'Khóa 2024 - 2025');
    };
    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, []);

  const avatarOptions = [
    { name: 'An (3D)', url: 'https://images.unsplash.com/photo-1607990283143-e81e7a2c93ab?auto=format&fit=crop&q=80&w=256&h=256' },
    { name: 'Bình (3D)', url: 'https://images.unsplash.com/photo-1628157582853-a796fa650a6a?auto=format&fit=crop&q=80&w=256&h=256' },
    { name: 'Sáng (3D)', url: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&q=80&w=256&h=256' },
    { name: 'Hoa (3D)', url: 'https://images.unsplash.com/photo-1624561172888-ac93c696e10c?auto=format&fit=crop&q=80&w=256&h=256' },
  ];

  const handleSaveProfile = () => {
    if (onUpdateUser) {
      onUpdateUser({
        ...user,
        name: profileName,
        dob: profileDob,
        phoneStudent: profilePhoneStudent,
        phoneParent: profilePhoneParent,
        className: profileClassName,
        avatar: selectedAvatar,
      });
    }
    setIsEditing(false);
  };

  const navItems = [
    { id: 'dashboard', label: 'Trang chủ', icon: LayoutDashboard },
    ...(isTeacher ? [{ id: 'students', label: 'Học sinh', icon: Users }] : []),
    { id: 'assignments', label: 'Bài tập', icon: BookOpen },
    { id: 'schedule', label: 'Lịch học', icon: Calendar },
    { id: 'simulations', label: 'Mô phỏng', icon: Microscope },
  ];

  const handleTabClick = (tabId: string) => {
    onTabChange(tabId);
    setMobileMenuOpen(false);
  };

  return (
    <div className="flex h-screen w-full overflow-hidden font-sans text-slate-800 bg-[#f8fafc]">
      
      {/* Desktop Sidebar Navigation */}
      <aside className="hidden md:flex group w-20 hover:w-64 bg-white text-slate-600 flex-col border-r border-slate-200 absolute z-50 transition-all duration-300 ease-in-out shadow-[4px_0_24px_rgba(0,0,0,0.02)] hover:shadow-[12px_0_32px_rgba(0,0,0,0.05)] overflow-hidden h-full left-0 top-0">
        <div className="p-5 flex items-center gap-4 border-b border-slate-100 whitespace-nowrap min-h-[80px]">
          <div className="shrink-0 w-10 h-10 bg-gradient-to-br from-indigo-600 to-blue-600 rounded-xl flex items-center justify-center text-white font-bold shadow-md shadow-indigo-200 text-lg">E</div>
          <span className="text-xl font-bold text-slate-900 tracking-tight opacity-0 group-hover:opacity-100 transition-opacity duration-300">EduSync Pro</span>
        </div>
        <nav className="flex-1 px-3 space-y-2 overflow-y-auto mt-6 custom-scrollbar">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => handleTabClick(item.id)}
                className={`w-full flex items-center gap-4 px-3 py-3 text-sm rounded-xl transition-all font-medium whitespace-nowrap overflow-hidden ${
                  isActive
                    ? 'bg-indigo-50 text-indigo-600 border border-indigo-100'
                    : 'hover:bg-slate-50 text-slate-600 hover:text-slate-900 border border-transparent'
                }`}
              >
                <div className="shrink-0 w-8 h-8 flex items-center justify-center">
                  <Icon className={`w-5 h-5 ${isActive ? 'text-indigo-600' : 'text-slate-400'}`} />
                </div>
                <span className="opacity-0 group-hover:opacity-100 transition-opacity duration-300 truncate">
                  {item.label}
                </span>
              </button>
            );
          })}
        </nav>
        <div className="p-3 mt-auto overflow-hidden whitespace-nowrap">
          <div 
            onClick={() => setShowProfileModal(true)}
            title="Xem thông tin cá nhân"
            className="flex flex-col p-2 group-hover:p-3 bg-slate-50 hover:bg-indigo-50/50 rounded-xl border border-slate-100 hover:border-indigo-100 transition-all duration-300 cursor-pointer"
          >
             <div className="flex items-center gap-3">
               <div className="w-10 h-10 rounded-full bg-indigo-600 text-white font-extrabold flex items-center justify-center text-sm shadow-sm shrink-0 ml-0.5 group-hover:ml-0 border border-indigo-400">
                 {getAvatarInitial(user.name)}
               </div>
               <div className="flex-1 min-w-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300 w-0 group-hover:w-auto">
                 <p className="text-sm font-bold text-slate-900 truncate">{user.name}</p>
                 <p className="text-[11px] font-medium text-slate-500 truncate capitalize mt-0.5">
                   {user.role === 'teacher' ? 'Giáo viên' : 'Học sinh'}
                 </p>
               </div>
             </div>
          </div>
        </div>
      </aside>

      {/* Mobile Slide-Over Drawer */}
      {mobileMenuOpen && (
        <div className="fixed inset-0 z-50 flex md:hidden">
          <div 
            className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm transition-opacity"
            onClick={() => setMobileMenuOpen(false)}
          />
          <div className="relative w-4/5 max-w-xs bg-white h-full flex flex-col p-5 shadow-2xl z-10 border-r border-slate-200">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-gradient-to-br from-indigo-600 to-blue-600 rounded-xl flex items-center justify-center text-white font-bold shadow-md shadow-indigo-200 text-lg">E</div>
                <span className="text-lg font-bold text-slate-900">EduSync Pro</span>
              </div>
              <button 
                onClick={() => setMobileMenuOpen(false)} 
                className="p-2 text-slate-400 hover:text-slate-700 rounded-xl hover:bg-slate-100 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <nav className="flex-1 space-y-2 mt-6 overflow-y-auto">
              {navItems.map((item) => {
                const Icon = item.icon;
                const isActive = activeTab === item.id;
                return (
                  <button
                    key={item.id}
                    onClick={() => handleTabClick(item.id)}
                    className={`w-full flex items-center gap-3 px-4 py-3 text-sm rounded-xl transition-all font-medium ${
                      isActive
                        ? 'bg-indigo-50 text-indigo-600 border border-indigo-100 font-bold'
                        : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                    }`}
                  >
                    <Icon className={`w-5 h-5 ${isActive ? 'text-indigo-600' : 'text-slate-400'}`} />
                    <span>{item.label}</span>
                  </button>
                );
              })}
            </nav>

            <div className="mt-auto pt-4 border-t border-slate-100 space-y-3">
              <div 
                onClick={() => {
                  setMobileMenuOpen(false);
                  setShowProfileModal(true);
                }}
                title="Xem thông tin cá nhân"
                className="p-3 bg-slate-50 hover:bg-indigo-50/50 rounded-xl border border-slate-100 hover:border-indigo-100 flex items-center gap-3 cursor-pointer transition-colors"
              >
                <div className="w-10 h-10 rounded-full bg-indigo-600 text-white font-extrabold flex items-center justify-center text-sm shadow-sm border border-indigo-400 shrink-0">
                  {getAvatarInitial(user.name)}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-bold text-slate-900 truncate">{user.name}</p>
                  <p className="text-xs text-slate-500 capitalize">
                    {user.role === 'teacher' ? 'Giáo viên' : 'Học sinh'}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col min-w-0 overflow-hidden relative ml-0 md:ml-20 transition-all duration-300 bg-[#f8fafc] pb-16 md:pb-0">
        {/* Top Header */}
        <header className="h-16 sm:h-20 bg-white/90 backdrop-blur-xl border-b border-slate-200 flex items-center justify-between px-4 sm:px-8 shrink-0 z-10 sticky top-0 shadow-sm">
          <div className="flex items-center gap-3 sm:gap-4 min-w-0">
            <button 
              onClick={() => setMobileMenuOpen(true)}
              className="md:hidden p-2 text-slate-600 hover:bg-slate-100 rounded-xl transition-colors shrink-0"
            >
              <Menu className="w-5 h-5" />
            </button>
            <h2 className="text-base sm:text-xl font-bold text-slate-900 tracking-tight truncate">
              {navItems.find(item => item.id === activeTab)?.label || 'Bảng điều khiển'}
            </h2>
            {isEditingYear ? (
              <div className="hidden sm:flex items-center gap-1.5 bg-white border border-indigo-300 rounded-full px-2.5 py-0.5 shadow-sm shrink-0 z-20">
                <input
                  type="text"
                  value={tempYear}
                  onChange={(e) => setTempYear(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleSaveYear();
                    if (e.key === 'Escape') {
                      setTempYear(academicYear);
                      setIsEditingYear(false);
                    }
                  }}
                  autoFocus
                  className="bg-transparent text-xs font-semibold text-indigo-700 px-1 py-0.5 outline-none w-28 text-center"
                />
                <button
                  type="button"
                  onClick={handleSaveYear}
                  className="p-1 text-emerald-600 hover:bg-emerald-50 rounded-full transition-colors flex items-center justify-center"
                  title="Lưu"
                >
                  <Check className="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setTempYear(academicYear);
                    setIsEditingYear(false);
                  }}
                  className="p-1 text-rose-500 hover:bg-rose-50 rounded-full transition-colors flex items-center justify-center"
                  title="Hủy"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            ) : (
              <div className="hidden sm:flex items-center gap-1 bg-indigo-50 text-indigo-700 px-3 py-1 rounded-full text-xs font-semibold border border-indigo-100 shrink-0 select-none group/year">
                <span>{academicYear}</span>
                {isTeacher && (
                  <button
                    type="button"
                    onClick={() => {
                      setTempYear(academicYear);
                      setIsEditingYear(true);
                    }}
                    className="opacity-0 group-hover/year:opacity-100 transition-opacity ml-1.5 p-0.5 text-indigo-500 hover:text-indigo-800 hover:bg-indigo-100/50 rounded-md flex items-center justify-center"
                    title="Chỉnh sửa khóa học"
                  >
                    <Edit2 className="w-3 h-3" />
                  </button>
                )}
              </div>
            )}
          </div>
          
          <div className="flex items-center gap-3 sm:gap-5 shrink-0">
            <button className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-50 rounded-full transition-colors relative">
              <BellRing className="w-5 h-5" />
              <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-rose-500 rounded-full border-2 border-white"></span>
            </button>
            <div 
              onClick={() => setShowProfileModal(true)}
              title="Xem thông tin cá nhân"
              className="flex items-center gap-3 pl-3 sm:pl-5 border-l border-slate-200 cursor-pointer hover:opacity-80 transition-opacity"
            >
              <div className="text-right hidden sm:block">
                <p className="text-sm font-bold text-slate-900">{user.name}</p>
                <p className="text-xs font-medium text-slate-500">{user.role === 'teacher' ? 'Quản trị viên' : 'Học viên'}</p>
              </div>
              <div className="w-8 h-8 sm:w-10 sm:h-10 bg-indigo-600 text-white rounded-full font-extrabold flex items-center justify-center text-sm sm:text-base border border-indigo-400 shadow-sm shrink-0">
                {getAvatarInitial(user.name)}
              </div>
            </div>
          </div>
        </header>
        
        <div className="flex-1 overflow-auto p-3 sm:p-6 md:p-8 custom-scrollbar">
          <div className="w-full h-full max-w-7xl mx-auto">
            {children}
          </div>
        </div>
      </main>

      {/* Mobile Bottom Navigation Bar */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-white/95 backdrop-blur-md border-t border-slate-200 z-40 px-2 py-1.5 flex items-center justify-around shadow-[0_-4px_20px_rgba(0,0,0,0.04)]">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => handleTabClick(item.id)}
              className={`flex flex-col items-center justify-center py-1 px-2.5 rounded-xl transition-all min-w-[56px] ${
                isActive ? 'text-indigo-600 font-bold' : 'text-slate-400 hover:text-slate-600'
              }`}
            >
              <div className={`p-1 rounded-xl transition-colors ${isActive ? 'bg-indigo-50' : ''}`}>
                <Icon className="w-5 h-5" />
              </div>
              <span className="text-[10px] mt-0.5 truncate max-w-[64px]">{item.label}</span>
            </button>
          );
        })}
      </nav>

      {/* Profile Modal */}
      {showProfileModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full border border-slate-200 shadow-2xl overflow-hidden flex flex-col max-h-[90vh] animate-in fade-in zoom-in-95 duration-200">
            {/* Modal Header */}
            <div className="p-5 border-b border-slate-100 flex items-center justify-between bg-gradient-to-r from-slate-50 to-indigo-50/20">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-indigo-50 flex items-center justify-center text-indigo-600">
                  <UserIcon className="w-4.5 h-4.5" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-900 text-base">Thông tin cá nhân</h3>
                  <p className="text-xs text-slate-500">Xem và cập nhật hồ sơ của bạn</p>
                </div>
              </div>
              <button 
                onClick={() => {
                  setShowProfileModal(false);
                  setIsEditing(false);
                }}
                className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Content */}
            <div className="p-6 overflow-y-auto space-y-6 custom-scrollbar">
              {/* Profile Card Summary */}
              <div className="flex flex-col items-center text-center space-y-3 bg-slate-50 p-5 rounded-2xl border border-slate-100">
                <div className="relative">
                  <div className="w-20 h-20 rounded-full bg-indigo-600 text-white font-black flex items-center justify-center text-3xl border-2 border-indigo-400 shadow-md">
                    {getAvatarInitial(profileName || user.name)}
                  </div>
                  {isEditing && (
                    <div className="absolute -bottom-1 -right-1 bg-indigo-600 text-white p-1.5 rounded-full border border-white shadow-sm">
                      <Sparkles className="w-3 h-3" />
                    </div>
                  )}
                </div>
                <div>
                  <h4 className="font-bold text-slate-900 text-lg">{profileName}</h4>
                  <div className="flex items-center justify-center gap-1.5 mt-1">
                    <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold border ${
                      user.role === 'teacher' 
                        ? 'bg-amber-50 text-amber-700 border-amber-100' 
                        : 'bg-indigo-50 text-indigo-700 border-indigo-100'
                    }`}>
                      {user.role === 'teacher' ? 'Giáo viên' : 'Học sinh'}
                    </span>
                    <span className="flex items-center gap-1 text-xs font-medium text-emerald-600">
                      <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                      Đang hoạt động
                    </span>
                  </div>
                </div>
              </div>

              {/* Avatar Selector (Only visible during edit mode) */}
              {isEditing && (
                <div className="p-3 bg-indigo-50/60 rounded-2xl border border-indigo-100 text-center">
                  <p className="text-xs font-bold text-indigo-900">Ảnh đại diện được tự động cập nhật theo chữ cái đầu tiên của tên bạn</p>
                </div>
              )}

              {/* Fields */}
              <div className="space-y-4">
                {/* Họ tên */}
                <div>
                  <label className="block text-xs font-bold text-slate-500 mb-1">Họ và tên</label>
                  {isEditing ? (
                    <input
                      type="text"
                      value={profileName}
                      onChange={(e) => setProfileName(e.target.value)}
                      className="w-full px-4 py-2.5 rounded-2xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 font-medium text-sm transition-shadow"
                    />
                  ) : (
                    <div className="px-4 py-2.5 bg-slate-50 rounded-xl border border-slate-100 text-sm font-semibold text-slate-800">
                      {profileName}
                    </div>
                  )}
                </div>

                {/* Ngày sinh */}
                <div>
                  <label className="block text-xs font-bold text-slate-500 mb-1">Ngày sinh</label>
                  {isEditing ? (
                    <input
                      type="date"
                      value={profileDob}
                      onChange={(e) => setProfileDob(e.target.value)}
                      className="w-full px-4 py-2.5 rounded-2xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 font-medium text-sm transition-shadow"
                    />
                  ) : (
                    <div className="px-4 py-2.5 bg-slate-50 rounded-xl border border-slate-100 text-sm font-semibold text-slate-800 flex items-center gap-2">
                      <Calendar className="w-4 h-4 text-indigo-500" />
                      {profileDob ? profileDob.split('-').reverse().join('/') : 'Chưa cập nhật'}
                    </div>
                  )}
                </div>

                {/* Lớp / Chức vụ */}
                <div>
                  <label className="block text-xs font-bold text-slate-500 mb-1">
                    {user.role === 'teacher' ? 'Chức vụ / Nhiệm vụ' : 'Lớp học'}
                  </label>
                  {isEditing ? (
                    <input
                      type="text"
                      value={profileClassName}
                      onChange={(e) => setProfileClassName(e.target.value)}
                      className="w-full px-4 py-2.5 rounded-2xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 font-medium text-sm transition-shadow"
                    />
                  ) : (
                    <div className="px-4 py-2.5 bg-slate-50 rounded-xl border border-slate-100 text-sm font-semibold text-slate-800">
                      {profileClassName || 'Chưa cập nhật'}
                    </div>
                  )}
                </div>

                {/* SĐT Học sinh / Giáo viên */}
                <div>
                  <label className="block text-xs font-bold text-slate-500 mb-1 font-semibold">Số điện thoại liên hệ</label>
                  {isEditing ? (
                    <input
                      type="text"
                      value={profilePhoneStudent}
                      onChange={(e) => setProfilePhoneStudent(e.target.value)}
                      className="w-full px-4 py-2.5 rounded-2xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 font-medium text-sm transition-shadow"
                    />
                  ) : (
                    <div className="px-4 py-2.5 bg-slate-50 rounded-xl border border-slate-100 text-sm font-semibold text-slate-800 flex items-center gap-2">
                      <Phone className="w-4 h-4 text-slate-400" />
                      {profilePhoneStudent || 'Chưa cập nhật'}
                    </div>
                  )}
                </div>

                {/* SĐT Phụ huynh (Chỉ dành cho học sinh) */}
                {user.role === 'student' && (
                  <div>
                    <label className="block text-xs font-bold text-slate-500 mb-1 font-semibold">Số điện thoại Phụ huynh</label>
                    {isEditing ? (
                      <input
                        type="text"
                        value={profilePhoneParent}
                        onChange={(e) => setProfilePhoneParent(e.target.value)}
                        className="w-full px-4 py-2.5 rounded-2xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 font-medium text-sm transition-shadow"
                      />
                    ) : (
                      <div className="px-4 py-2.5 bg-slate-50 rounded-xl border border-slate-100 text-sm font-semibold text-slate-800 flex items-center gap-2">
                        <Phone className="w-4 h-4 text-slate-400" />
                        {profilePhoneParent || 'Chưa cập nhật'}
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Account Switching Action */}
              {!isEditing && (
                <div className="pt-4 border-t border-slate-100">
                  <div className="p-4 bg-indigo-50/50 rounded-2xl border border-indigo-100 flex flex-col gap-3">
                    <div className="flex items-center gap-2">
                      <ShieldCheck className="w-5 h-5 text-indigo-600" />
                      <p className="text-xs font-bold text-indigo-900">Tính năng thử nghiệm đa vai trò</p>
                    </div>
                    <p className="text-xs text-indigo-700">
                      Bạn có thể chuyển đổi nhanh vai trò để trải nghiệm cả hai giao diện Học sinh & Giáo viên chủ nhiệm.
                    </p>
                    <button
                      type="button"
                      onClick={() => {
                        const targetRole = user.role === 'teacher' ? 'student' : 'teacher';
                        onRoleChange(targetRole);
                        setShowProfileModal(false);
                      }}
                      className="w-full py-2 bg-indigo-600 text-white font-bold text-xs rounded-xl hover:bg-indigo-700 transition-colors shadow-sm"
                    >
                      Chuyển sang vai trò {user.role === 'teacher' ? 'Học sinh' : 'Giáo viên'}
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="p-5 border-t border-slate-100 bg-slate-50 flex items-center justify-between">
              {isEditing ? (
                <>
                  <button
                    type="button"
                    onClick={() => {
                      setIsEditing(false);
                      // Reset states
                      setProfileName(user.name);
                      setProfileDob(user.dob || '');
                      setProfilePhoneStudent(user.phoneStudent || '');
                      setProfilePhoneParent(user.phoneParent || '');
                      setProfileClassName(user.className || '');
                      setSelectedAvatar(user.avatar);
                    }}
                    className="px-4 py-2 bg-white border border-slate-200 text-slate-600 font-bold text-xs rounded-xl hover:bg-slate-50 transition-colors"
                  >
                    Hủy bỏ
                  </button>
                  <button
                    type="button"
                    onClick={handleSaveProfile}
                    className="px-5 py-2.5 bg-indigo-600 text-white font-bold text-xs rounded-xl hover:bg-indigo-700 transition-colors shadow-sm flex items-center gap-1.5"
                  >
                    <Check className="w-4 h-4" />
                    Lưu thay đổi
                  </button>
                </>
              ) : (
                <>
                  <button
                    type="button"
                    onClick={() => {
                      if (onLogout) {
                        onLogout();
                        setShowProfileModal(false);
                      }
                    }}
                    className="flex items-center gap-1.5 px-4 py-2 text-rose-600 hover:bg-rose-50 rounded-xl font-bold text-xs transition-colors"
                  >
                    <LogOut className="w-4 h-4" />
                    Đăng xuất
                  </button>
                  <button
                    type="button"
                    onClick={() => setIsEditing(true)}
                    className="px-5 py-2.5 bg-slate-900 text-white font-bold text-xs rounded-xl hover:bg-slate-800 transition-colors shadow-sm flex items-center gap-1.5"
                  >
                    <Edit2 className="w-3.5 h-3.5" />
                    Chỉnh sửa hồ sơ
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      )}

    </div>
  );
}

