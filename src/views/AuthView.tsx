import React, { useState } from 'react';
import { Mail, Lock, User, Phone, BookOpen, UserPlus, LogIn } from 'lucide-react';
import { Role } from '../types';
import { auth, db } from '../firebase';
import { signInWithEmailAndPassword, createUserWithEmailAndPassword } from 'firebase/auth';
import { doc, getDoc, setDoc } from 'firebase/firestore';

interface AuthViewProps {
  onLogin: (role: Role) => void;
}

export function AuthView({ onLogin }: AuthViewProps) {
  const [isSignUp, setIsSignUp] = useState(false);
  const [signupRole, setSignupRole] = useState<Role>('student');
  const [loginUsername, setLoginUsername] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  
  const [signupName, setSignupName] = useState('');
  const [signupUsername, setSignupUsername] = useState('');
  const [signupPhoneParent, setSignupPhoneParent] = useState('');
  const [signupPhoneStudent, setSignupPhoneStudent] = useState('');
  const [signupClass, setSignupClass] = useState('');
  const [signupPassword, setSignupPassword] = useState('');
  const [signupConfirmPassword, setSignupConfirmPassword] = useState('');
  
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  
  const showAdminContact = () => {
    alert("Vui lòng liên hệ Admin qua hotline: 1900 xxxx để cấp lại mật khẩu.");
  };

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-3 sm:p-6 relative overflow-hidden font-sans">
      {/* Background decorations */}
      <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] rounded-full bg-blue-600/15 blur-[120px] pointer-events-none"></div>
      <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] rounded-full bg-indigo-600/15 blur-[120px] pointer-events-none"></div>

      <style>{`
        @media (min-width: 768px) {
          .auth-container {
            perspective: 1000px;
          }
          .overlay-container {
            display: block;
            position: absolute;
            top: 24px;
            bottom: 24px;
            left: 50%;
            width: calc(50% - 24px);
            z-index: 100;
            perspective: 1200px;
            transition: transform 900ms cubic-bezier(.77, 0, .18, 1);
          }
          .auth-container.active .overlay-container {
            transform: translateX(-100%);
          }
          .overlay-card {
            width: 100%;
            height: 100%;
            position: relative;
            transform-style: preserve-3d;
            transition: transform 900ms cubic-bezier(.77, 0, .18, 1);
            border-radius: 24px;
            box-shadow: 0 20px 50px rgba(0,0,0,0.3);
          }
          .auth-container.active .overlay-card {
            transform: rotateY(-180deg);
          }
          .overlay-front, .overlay-back {
            position: absolute;
            width: 100%;
            height: 100%;
            backface-visibility: hidden;
            border-radius: 24px;
            overflow: hidden;
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            padding: 2.5rem;
            text-align: center;
            color: white;
          }
          .overlay-front {
            background: linear-gradient(135deg, #1E293B, #0F172A);
          }
          .overlay-back {
            background: linear-gradient(135deg, #0F172A, #1E293B);
            transform: rotateY(180deg);
          }
          .form-panel {
            position: absolute;
            top: 0;
            height: 100%;
            width: 50%;
            transition: all 900ms cubic-bezier(.77, 0, .18, 1);
          }
          .form-panel--login {
            left: 0;
            opacity: 1;
            transform: translateX(0);
            filter: blur(0);
            pointer-events: auto;
          }
          .auth-container.active .form-panel--login {
            opacity: 0;
            transform: translateX(-80px);
            filter: blur(6px);
            pointer-events: none;
          }
          .form-panel--signup {
            left: 50%;
            opacity: 0;
            transform: translateX(80px);
            filter: blur(6px);
            pointer-events: none;
          }
          .auth-container.active .form-panel--signup {
            opacity: 1;
            transform: translateX(0);
            filter: blur(0);
            pointer-events: auto;
          }
        }

        @media (max-width: 767px) {
          .overlay-container {
            display: none;
          }
          .form-panel {
            position: relative;
            width: 100%;
            height: auto;
          }
          .form-panel--login {
            display: ${isSignUp ? 'none' : 'flex'};
          }
          .form-panel--signup {
            display: ${isSignUp ? 'flex' : 'none'};
          }
        }

        .custom-scrollbar::-webkit-scrollbar {
          width: 4px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: transparent;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: #cbd5e1;
          border-radius: 4px;
        }
      `}</style>

      <div className={`auth-container relative w-full max-w-[1000px] md:h-[650px] bg-white rounded-3xl overflow-hidden shadow-2xl border border-slate-200 ${isSignUp ? 'active' : ''}`}>
        
        {/* Mobile Tab Segment Switcher */}
        <div className="md:hidden flex border-b border-slate-100 bg-slate-50/80 p-1.5 gap-1">
          <button
            type="button"
            onClick={() => setIsSignUp(false)}
            className={`flex-1 py-3 text-sm font-bold rounded-2xl flex items-center justify-center gap-2 transition-all ${
              !isSignUp ? 'bg-white text-indigo-600 shadow-sm border border-slate-200' : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            <LogIn className="w-4 h-4" />
            Đăng nhập
          </button>
          <button
            type="button"
            onClick={() => setIsSignUp(true)}
            className={`flex-1 py-3 text-sm font-bold rounded-2xl flex items-center justify-center gap-2 transition-all ${
              isSignUp ? 'bg-indigo-600 text-white shadow-sm' : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            <UserPlus className="w-4 h-4" />
            Tạo tài khoản
          </button>
        </div>

        {/* Login Form (Left on desktop) */}
        <div className="form-panel form-panel--login flex flex-col justify-center px-5 sm:px-12 md:px-16 py-8 md:py-0 z-0">
          <div className="mb-6 md:mb-10 text-center">
            <div className="inline-block p-3 bg-indigo-50 rounded-2xl mb-3 border border-indigo-100">
               <Lock className="w-6 h-6 text-indigo-600" />
            </div>
            <h2 className="text-2xl sm:text-3xl font-bold text-slate-900 mb-1.5 tracking-tight">Chào mừng</h2>
            <p className="text-slate-500 text-xs sm:text-sm">Đăng nhập để tiếp tục quá trình học tập</p>
          </div>

          {errorMessage && (
            <div className="mb-4 p-3.5 bg-red-50 border border-red-100 text-red-700 text-xs rounded-2xl font-bold">
              ⚠️ {errorMessage}
            </div>
          )}

          <form className="space-y-4 sm:space-y-5" onSubmit={async (e) => { 
            e.preventDefault(); 
            setLoading(true);
            setErrorMessage(null);
            try {
              let email = loginUsername.trim();
              if (!email.includes('@')) {
                email = `${email.toLowerCase()}@educonnect.com`;
              }
              const userCredential = await signInWithEmailAndPassword(auth, email, loginPassword);
              const userDocRef = doc(db, 'users', userCredential.user.uid);
              const userDocSnap = await getDoc(userDocRef);
              if (userDocSnap.exists()) {
                const userData = userDocSnap.data();
                onLogin(userData.role as Role);
              } else {
                const detectedRole = loginUsername.toLowerCase().includes('teacher') ? 'teacher' : 'student';
                await setDoc(userDocRef, {
                  id: userCredential.user.uid,
                  name: loginUsername,
                  role: detectedRole,
                  avatar: detectedRole === 'teacher' 
                    ? 'https://images.unsplash.com/photo-1624561172888-ac93c696e10c?auto=format&fit=crop&q=80&w=256&h=256'
                    : 'https://images.unsplash.com/photo-1607990283143-e81e7a2c93ab?auto=format&fit=crop&q=80&w=256&h=256',
                  username: loginUsername,
                  createdAt: new Date().toISOString()
                });
                onLogin(detectedRole);
              }
            } catch (err: any) {
              console.error(err);
              let friendlyMessage = 'Đăng nhập thất bại. Vui lòng kiểm tra lại tài khoản hoặc mật khẩu.';
              if (err.code === 'auth/user-not-found' || err.code === 'auth/wrong-password' || err.code === 'auth/invalid-credential') {
                friendlyMessage = 'Tên đăng nhập hoặc mật khẩu không chính xác.';
              } else if (err.code === 'auth/network-request-failed') {
                friendlyMessage = 'Lỗi kết nối mạng. Vui lòng thử lại sau.';
              }
              setErrorMessage(friendlyMessage);
            } finally {
              setLoading(false);
            }
          }}>
            <div className="space-y-3 sm:space-y-4 bg-slate-50/80 p-4 sm:p-6 rounded-2xl border border-slate-200/80 shadow-sm">
              <div className="relative group">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                  <User className="h-5 w-5 text-slate-400 group-focus-within:text-indigo-600 transition-colors" />
                </div>
                <input 
                  type="text" 
                  placeholder="Tên đăng nhập" 
                  className="w-full bg-white border border-slate-200 text-slate-900 rounded-xl pl-12 pr-4 py-3 sm:py-3.5 focus:outline-none focus:border-indigo-600 focus:ring-1 focus:ring-indigo-600 transition-all placeholder:text-slate-400 text-sm hover:border-slate-300" 
                  required 
                  disabled={loading}
                  value={loginUsername}
                  onChange={(e) => setLoginUsername(e.target.value)}
                />
              </div>
              <div className="relative group">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                  <Lock className="h-5 w-5 text-slate-400 group-focus-within:text-indigo-600 transition-colors" />
                </div>
                <input 
                  type="password" 
                  placeholder="Mật khẩu" 
                  className="w-full bg-white border border-slate-200 text-slate-900 rounded-xl pl-12 pr-4 py-3 sm:py-3.5 focus:outline-none focus:border-indigo-600 focus:ring-1 focus:ring-indigo-600 transition-all placeholder:text-slate-400 text-sm hover:border-slate-300" 
                  required 
                  disabled={loading}
                  value={loginPassword}
                  onChange={(e) => setLoginPassword(e.target.value)}
                />
              </div>
            </div>
            
            <div className="flex items-center justify-between text-xs sm:text-sm px-1">
              <label className="flex items-center text-slate-600 cursor-pointer hover:text-slate-900 transition-colors">
                <input type="checkbox" className="mr-2 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500" disabled={loading} />
                Ghi nhớ tài khoản
              </label>
              <button type="button" onClick={showAdminContact} className="text-indigo-600 hover:text-indigo-700 font-semibold transition-colors">Quên mật khẩu?</button>
            </div>

            <button type="submit" disabled={loading} className="w-full bg-gradient-to-r from-indigo-600 to-blue-600 hover:from-indigo-700 hover:to-blue-700 text-white font-bold py-3.5 sm:py-4 rounded-xl transition-all transform active:scale-[0.98] shadow-lg shadow-indigo-500/25 disabled:opacity-50">
              {loading ? 'ĐANG XỬ LÝ...' : 'ĐĂNG NHẬP'}
            </button>
          </form>
        </div>

        {/* Sign Up Form (Right on desktop) */}
        <div className="form-panel form-panel--signup flex flex-col justify-center px-5 sm:px-12 md:px-12 py-8 md:py-0 z-0">
          <div className="mb-3 sm:mb-4">
            <h3 className="text-indigo-600 text-xs font-bold tracking-widest uppercase mb-1">Thành viên mới</h3>
            <h2 className="text-2xl sm:text-3xl font-bold text-slate-900 mb-1">Tạo tài khoản</h2>
            <p className="text-slate-500 text-xs sm:text-sm">Chỉ mất vài giây để bắt đầu.</p>
          </div>

          {errorMessage && (
            <div className="mb-3 p-3 bg-red-50 border border-red-100 text-red-700 text-xs rounded-2xl font-bold">
              ⚠️ {errorMessage}
            </div>
          )}

          <div className="flex gap-3 mb-4">
            <button
              type="button"
              disabled={loading}
              onClick={() => setSignupRole('student')}
              className={`flex-1 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition-all duration-300 ${signupRole === 'student' ? 'bg-blue-600 text-white shadow-md shadow-blue-500/20' : 'bg-slate-100 text-slate-600 border border-slate-200 hover:border-slate-300'} disabled:opacity-50`}
            >
              Học sinh
            </button>
            <button
              type="button"
              disabled={loading}
              onClick={() => setSignupRole('teacher')}
              className={`flex-1 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition-all duration-300 ${signupRole === 'teacher' ? 'bg-indigo-600 text-white shadow-md shadow-indigo-500/20' : 'bg-slate-100 text-slate-600 border border-slate-200 hover:border-slate-300'} disabled:opacity-50`}
            >
              Giáo viên
            </button>
          </div>

          <form className="space-y-3 custom-scrollbar max-h-[380px] md:max-h-[350px] overflow-y-auto pr-1 pb-2" onSubmit={async (e) => { 
            e.preventDefault(); 
            if (signupPassword !== signupConfirmPassword) {
              setErrorMessage('Mật khẩu xác nhận không khớp.');
              return;
            }
            setLoading(true);
            setErrorMessage(null);
            try {
              let email = signupUsername.trim();
              if (!email.includes('@')) {
                email = `${email.toLowerCase()}@educonnect.com`;
              }
              const userCredential = await createUserWithEmailAndPassword(auth, email, signupPassword);
              const uid = userCredential.user.uid;
              
              const avatarUrl = signupRole === 'teacher' 
                ? 'https://images.unsplash.com/photo-1624561172888-ac93c696e10c?auto=format&fit=crop&q=80&w=256&h=256'
                : 'https://images.unsplash.com/photo-1607990283143-e81e7a2c93ab?auto=format&fit=crop&q=80&w=256&h=256';

              const newUserProfile = {
                id: uid,
                name: signupName,
                role: signupRole,
                avatar: avatarUrl,
                username: signupUsername,
                phoneParent: signupRole === 'student' ? signupPhoneParent : '',
                phoneStudent: signupRole === 'student' ? signupPhoneStudent : '',
                className: signupRole === 'student' ? signupClass : 'Giáo viên',
                createdAt: new Date().toISOString()
              };

              await setDoc(doc(db, 'users', uid), newUserProfile);
              
              setIsSignUp(false);
              onLogin(signupRole);
            } catch (err: any) {
              console.error(err);
              let friendlyMessage = 'Đăng ký tài khoản thất bại. Vui lòng thử lại.';
              if (err.code === 'auth/email-already-in-use') {
                friendlyMessage = 'Tên đăng nhập đã tồn tại trên hệ thống.';
              } else if (err.code === 'auth/weak-password') {
                friendlyMessage = 'Mật khẩu quá yếu (phải có ít nhất 6 ký tự).';
              } else if (err.code === 'auth/network-request-failed') {
                friendlyMessage = 'Lỗi kết nối mạng. Vui lòng thử lại sau.';
              }
              setErrorMessage(friendlyMessage);
            } finally {
              setLoading(false);
            }
          }}>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                <User className="h-5 w-5 text-slate-400" />
              </div>
              <input 
                type="text" 
                placeholder="Họ và tên" 
                className="w-full bg-white border border-slate-200 text-slate-900 rounded-xl pl-12 pr-4 py-3 focus:outline-none focus:border-indigo-600 focus:ring-1 focus:ring-indigo-600 transition-colors placeholder:text-slate-400 text-sm" 
                required 
                disabled={loading}
                value={signupName}
                onChange={(e) => setSignupName(e.target.value)}
              />
            </div>
            
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                <User className="h-5 w-5 text-slate-400" />
              </div>
              <input 
                type="text" 
                placeholder="Tên đăng nhập" 
                className="w-full bg-white border border-slate-200 text-slate-900 rounded-xl pl-12 pr-4 py-3 focus:outline-none focus:border-indigo-600 focus:ring-1 focus:ring-indigo-600 transition-colors placeholder:text-slate-400 text-sm" 
                required 
                disabled={loading}
                value={signupUsername}
                onChange={(e) => setSignupUsername(e.target.value)}
              />
            </div>

            {signupRole === 'student' && (
              <>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                    <Phone className="h-5 w-5 text-slate-400" />
                  </div>
                  <input 
                    type="tel" 
                    placeholder="SĐT Phụ huynh" 
                    className="w-full bg-white border border-slate-200 text-slate-900 rounded-xl pl-12 pr-4 py-3 focus:outline-none focus:border-indigo-600 focus:ring-1 focus:ring-indigo-600 transition-colors placeholder:text-slate-400 text-sm" 
                    required 
                    disabled={loading}
                    value={signupPhoneParent}
                    onChange={(e) => setSignupPhoneParent(e.target.value)}
                  />
                </div>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                    <BookOpen className="h-5 w-5 text-slate-400" />
                  </div>
                  <input 
                    type="text" 
                    placeholder="Lớp (VD: 10A1)" 
                    className="w-full bg-white border border-slate-200 text-slate-900 rounded-xl pl-12 pr-4 py-3 focus:outline-none focus:border-indigo-600 focus:ring-1 focus:ring-indigo-600 transition-colors placeholder:text-slate-400 text-sm" 
                    required 
                    disabled={loading}
                    value={signupClass}
                    onChange={(e) => setSignupClass(e.target.value)}
                  />
                </div>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                    <Phone className="h-5 w-5 text-slate-400" />
                  </div>
                  <input 
                    type="tel" 
                    placeholder="SĐT Học sinh (nếu có)" 
                    className="w-full bg-white border border-slate-200 text-slate-900 rounded-xl pl-12 pr-4 py-3 focus:outline-none focus:border-indigo-600 focus:ring-1 focus:ring-indigo-600 transition-colors placeholder:text-slate-400 text-sm" 
                    disabled={loading}
                    value={signupPhoneStudent}
                    onChange={(e) => setSignupPhoneStudent(e.target.value)}
                  />
                </div>
              </>
            )}

            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                <Lock className="h-5 w-5 text-slate-400" />
              </div>
              <input 
                type="password" 
                placeholder="Mật khẩu" 
                className="w-full bg-white border border-slate-200 text-slate-900 rounded-xl pl-12 pr-4 py-3 focus:outline-none focus:border-indigo-600 focus:ring-1 focus:ring-indigo-600 transition-colors placeholder:text-slate-400 text-sm" 
                required 
                disabled={loading}
                value={signupPassword}
                onChange={(e) => setSignupPassword(e.target.value)}
              />
            </div>
            
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                <Lock className="h-5 w-5 text-slate-400" />
              </div>
              <input 
                type="password" 
                placeholder="Xác nhận mật khẩu" 
                className="w-full bg-white border border-slate-200 text-slate-900 rounded-xl pl-12 pr-4 py-3 focus:outline-none focus:border-indigo-600 focus:ring-1 focus:ring-indigo-600 transition-colors placeholder:text-slate-400 text-sm" 
                required 
                disabled={loading}
                value={signupConfirmPassword}
                onChange={(e) => setSignupConfirmPassword(e.target.value)}
              />
            </div>
            
            <div className="pt-2 text-center">
              <button type="submit" disabled={loading} className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-bold py-3.5 rounded-xl hover:opacity-95 transition-all shadow-md shadow-indigo-500/20 disabled:opacity-50">
                {loading ? 'ĐANG XỬ LÝ...' : 'TẠO TÀI KHOẢN'}
              </button>
              <button type="button" onClick={() => setIsSignUp(false)} className="mt-3 text-slate-500 hover:text-slate-900 text-xs sm:text-sm transition-colors font-medium">
                Đã có tài khoản? Đăng nhập
              </button>
            </div>
          </form>
        </div>

        {/* Floating Card Overlay (Desktop only) */}
        <div className="overlay-container">
          <div className="overlay-card shadow-2xl">
            
            {/* Front of Card (Shows when Login is active) */}
            <div className="overlay-front relative overflow-hidden p-8">
               <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-br from-[#1E293B] to-[#0F172A] opacity-95"></div>
               <div className="absolute -top-10 -right-10 w-40 h-40 bg-indigo-500/30 rounded-full blur-3xl"></div>
               <div className="absolute bottom-10 left-10 w-20 h-20 bg-blue-500/20 rounded-full blur-2xl"></div>
               
               <div className="relative z-10 w-full h-full flex flex-col justify-between text-left">
                  <div className="flex justify-between items-start">
                     <div>
                       <h3 className="text-indigo-400 font-bold tracking-wider text-xs">MEMBERSHIP</h3>
                       <p className="text-slate-400 text-[10px] mt-0.5 uppercase tracking-widest">Hệ thống giáo dục</p>
                     </div>
                     <div className="w-10 h-7 bg-gradient-to-br from-yellow-200 via-yellow-400 to-yellow-600 rounded-md opacity-90 flex items-center justify-center overflow-hidden">
                        <div className="w-full h-px bg-black/20 absolute"></div>
                        <div className="w-px h-full bg-black/20 absolute"></div>
                     </div>
                  </div>

                  <div className="mt-auto mb-6">
                     <p className="text-slate-400 text-[10px] tracking-wider mb-1">CHỦ THẺ</p>
                     <p className="text-white text-lg font-mono tracking-widest uppercase truncate mb-4">
                       {loginUsername || 'STUDENT NAME'}
                     </p>

                     <div className="space-y-2 bg-white/5 p-3 rounded-xl border border-white/10">
                        <div className="flex justify-between items-center">
                           <span className="text-white/60 text-[10px] uppercase">Tài khoản</span>
                           <span className="text-white text-xs font-mono">{loginUsername || '...'}</span>
                        </div>
                        <div className="flex justify-between items-center">
                           <span className="text-white/60 text-[10px] uppercase">Mật khẩu</span>
                           <span className="text-white text-xs font-mono">{loginPassword ? '*'.repeat(loginPassword.length) : '...'}</span>
                        </div>
                     </div>
                  </div>

                  <div className="flex justify-end items-end">
                     <div className="flex flex-col items-end gap-2">
                       <p className="text-slate-400 text-xs">Bạn là người mới?</p>
                       <button 
                        onClick={() => setIsSignUp(true)}
                        className="px-5 py-2.5 bg-gradient-to-r from-indigo-600 to-blue-600 hover:from-indigo-500 hover:to-blue-500 rounded-xl font-bold transition-all shadow-lg shadow-indigo-500/20 text-xs text-white"
                      >
                        Tạo tài khoản
                      </button>
                    </div>
                  </div>
               </div>
            </div>

            {/* Back of Card (Shows when Signup is active) */}
            <div className="overlay-back relative overflow-hidden p-8">
               <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-br from-[#1E293B] to-[#0F172A] opacity-95"></div>
               <div className="absolute -bottom-10 -left-10 w-40 h-40 bg-blue-500/30 rounded-full blur-3xl"></div>
               <div className="absolute top-10 right-10 w-20 h-20 bg-indigo-500/20 rounded-full blur-2xl"></div>
               
               <div className="relative z-10 w-full h-full flex flex-col justify-between text-left">
                  <div className="flex justify-between items-start">
                     <div>
                       <h3 className="text-blue-400 font-bold tracking-wider text-xs">MEMBERSHIP</h3>
                       <p className="text-slate-400 text-[10px] mt-0.5 uppercase tracking-widest">Thẻ thành viên mới</p>
                     </div>
                     <div className="w-10 h-7 bg-gradient-to-br from-yellow-200 via-yellow-400 to-yellow-600 rounded-md opacity-90 flex items-center justify-center overflow-hidden">
                        <div className="w-full h-px bg-black/20 absolute"></div>
                        <div className="w-px h-full bg-black/20 absolute"></div>
                     </div>
                  </div>

                  <div className="mt-auto mb-6">
                     <p className="text-slate-400 text-[10px] tracking-wider mb-1">CHỦ THẺ</p>
                     <p className="text-white text-lg font-mono tracking-widest uppercase truncate mb-4">
                       {signupName || 'NEW MEMBER'}
                     </p>

                     <div className="space-y-2 bg-white/5 p-3 rounded-xl border border-white/10">
                        <div className="flex justify-between items-center">
                           <span className="text-white/60 text-[10px] uppercase">Tài khoản</span>
                           <span className="text-white text-xs font-mono">{signupUsername || '...'}</span>
                        </div>
                        {signupRole === 'student' && (
                           <>
                             <div className="flex justify-between items-center">
                                <span className="text-white/60 text-[10px] uppercase">SĐT Phụ huynh</span>
                                <span className="text-white text-xs font-mono">{signupPhoneParent || '...'}</span>
                             </div>
                             <div className="flex justify-between items-center">
                                <span className="text-white/60 text-[10px] uppercase">Lớp</span>
                                <span className="text-white text-xs font-mono">{signupClass || '...'}</span>
                             </div>
                             <div className="flex justify-between items-center">
                                <span className="text-white/60 text-[10px] uppercase">SĐT Học sinh</span>
                                <span className="text-white text-xs font-mono">{signupPhoneStudent || '...'}</span>
                             </div>
                           </>
                        )}
                        <div className="flex justify-between items-center">
                           <span className="text-white/60 text-[10px] uppercase">Mật khẩu</span>
                           <span className="text-white text-xs font-mono">{signupPassword ? '*'.repeat(signupPassword.length) : '...'}</span>
                        </div>
                     </div>
                  </div>

                  <div className="flex justify-between items-end">
                     <div>
                        <p className="text-slate-400 text-[10px] tracking-wider mb-1">VAI TRÒ</p>
                        <p className="text-slate-200 font-medium text-sm">
                          {signupRole === 'teacher' ? 'Giáo viên' : 'Học sinh'}
                        </p>
                     </div>
                     <button 
                       onClick={() => setIsSignUp(false)}
                       className="px-5 py-2.5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 rounded-xl font-bold transition-all shadow-lg shadow-blue-500/20 text-xs text-white"
                     >
                       Quay lại Đăng nhập
                     </button>
                  </div>
               </div>
            </div>

          </div>
        </div>

      </div>
    </div>
  );
}

