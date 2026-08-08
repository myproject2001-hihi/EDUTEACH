import React, { useState } from 'react';
import { Mail, Lock, User, Phone, BookOpen, UserPlus, LogIn, Eye, EyeOff, X, HelpCircle, Calendar, AlertCircle, Check, Award, Key } from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';
import { Role } from '../types';
import { auth, db, handleFirestoreError, OperationType } from '../firebase';
import { signInWithEmailAndPassword, createUserWithEmailAndPassword, sendPasswordResetEmail } from 'firebase/auth';
import { doc, getDoc, setDoc, collection, query, where, getDocs } from 'firebase/firestore';

interface AuthViewProps {
  onLogin: (role: Role) => void;
}

export function AuthView({ onLogin }: AuthViewProps) {
  const [isSignUp, setIsSignUp] = useState(false);
  const [signupRole, setSignupRole] = useState<Role>('student');
  const [loginUsername, setLoginUsername] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  
  const [signupName, setSignupName] = useState('');
  const [signupDob, setSignupDob] = useState('');
  const [signupUsername, setSignupUsername] = useState('');
  const [signupPhoneParent, setSignupPhoneParent] = useState('');
  const [signupPhoneStudent, setSignupPhoneStudent] = useState('');
  const [signupClass, setSignupClass] = useState('');
  const [signupPassword, setSignupPassword] = useState('');
  const [signupConfirmPassword, setSignupConfirmPassword] = useState('');
  
  const [signupRecoveryEmail, setSignupRecoveryEmail] = useState('');
  const [resetUsername, setResetUsername] = useState('');
  const [resetPhone, setResetPhone] = useState('');
  const [resetStudentName, setResetStudentName] = useState('');
  const [resetClassName, setResetClassName] = useState('');
  const [resetMessage, setResetMessage] = useState('');

  // Custom Form Validation State
  const [resetStudentNameError, setResetStudentNameError] = useState('');
  const [resetUsernameError, setResetUsernameError] = useState('');
  const [resetClassNameError, setResetClassNameError] = useState('');
  const [resetPhoneError, setResetPhoneError] = useState('');
  
  const [lookupUsernameError, setLookupUsernameError] = useState('');
  const [lookupPhoneError, setLookupPhoneError] = useState('');
  
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  
  const [showLoginPassword, setShowLoginPassword] = useState(false);
  const [showSignupPassword, setShowSignupPassword] = useState(false);
  const [showSignupConfirmPassword, setShowSignupConfirmPassword] = useState(false);
  const [showAdminModal, setShowAdminModal] = useState(false);
  const [resetEmail, setResetEmail] = useState('');
  const [resetSuccessMessage, setResetSuccessMessage] = useState<string | null>(null);
  const [resetErrorMessage, setResetErrorMessage] = useState<string | null>(null);
  const [resetLoading, setResetLoading] = useState(false);

  // States for Reset Request Lookup
  const [lookupUsername, setLookupUsername] = useState('');
  const [lookupPhone, setLookupPhone] = useState('');
  const [lookupResult, setLookupResult] = useState<any>(null);
  const [lookupError, setLookupError] = useState<string | null>(null);
  const [lookupLoading, setLookupLoading] = useState(false);
  const [recoveryTab, setRecoveryTab] = useState<'request' | 'lookup'>('request');
  const [copied, setCopied] = useState(false);
  const [pasteWarning, setPasteWarning] = useState(false);
  
  const handleToggleSignUp = (val: boolean) => {
    setIsSignUp(val);
    setErrorMessage(null);
    setSuccessMessage(null);
  };
  
  const showAdminContact = () => {
    setResetUsername('');
    setResetStudentName('');
    setResetClassName('');
    setResetPhone('');
    setResetMessage('');
    setResetSuccessMessage(null);
    setResetErrorMessage(null);
    setResetLoading(false);
    
    setResetStudentNameError('');
    setResetUsernameError('');
    setResetClassNameError('');
    setResetPhoneError('');
    
    setLookupUsername('');
    setLookupPhone('');
    setLookupResult(null);
    setLookupError(null);
    setLookupUsernameError('');
    setLookupPhoneError('');
    setRecoveryTab('request');
    
    setShowAdminModal(true);
  };

  const handleRequestLookup = async (e: React.FormEvent) => {
    e.preventDefault();
    let hasError = false;
    
    if (!lookupUsername.trim()) {
      setLookupUsernameError('Vui lòng nhập tên đăng nhập cần tra cứu');
      hasError = true;
    } else {
      setLookupUsernameError('');
    }
    
    if (!lookupPhone.trim()) {
      setLookupPhoneError('Vui lòng nhập số điện thoại liên hệ đã gửi');
      hasError = true;
    } else {
      setLookupPhoneError('');
    }
    
    if (hasError) return;
    
    setLookupLoading(true);
    setLookupError(null);
    setLookupResult(null);

    let searchUsername = lookupUsername.trim().toLowerCase();
    if (searchUsername.includes('@')) {
      searchUsername = searchUsername.split('@')[0];
    }

    try {
      const q = query(
        collection(db, 'reset_requests'),
        where('username', '==', searchUsername)
      );
      const querySnapshot = await getDocs(q);

      if (querySnapshot.empty) {
        setLookupError('Không tìm thấy yêu cầu khôi phục nào cho tài khoản này. Vui lòng gửi yêu cầu trước.');
        setLookupLoading(false);
        return;
      }

      const requestDoc = querySnapshot.docs[0];
      const requestData = requestDoc.data();

      // Đối chiếu số điện thoại
      const inputPhone = lookupPhone.trim();
      const registeredPhone = (requestData.phone || '').trim();
      if (inputPhone !== registeredPhone) {
        setLookupError('Số điện thoại không trùng khớp với số điện thoại đã điền trong yêu cầu.');
        setLookupLoading(false);
        return;
      }

      setLookupResult(requestData);
    } catch (err) {
      console.error(err);
      setLookupError('Có lỗi xảy ra trong quá trình tra cứu. Vui lòng thử lại sau.');
    } finally {
      setLookupLoading(false);
    }
  };

  const handlePasswordReset = async (e: React.FormEvent) => {
    e.preventDefault();
    let hasError = false;
    
    if (!resetStudentName.trim()) {
      setResetStudentNameError('Vui lòng điền họ và tên');
      hasError = true;
    } else {
      setResetStudentNameError('');
    }
    
    if (!resetUsername.trim()) {
      setResetUsernameError('Vui lòng điền tên đăng nhập');
      hasError = true;
    } else {
      setResetUsernameError('');
    }
    
    if (!resetClassName.trim()) {
      setResetClassNameError('Vui lòng điền lớp học hoặc đơn vị công tác');
      hasError = true;
    } else {
      setResetClassNameError('');
    }
    
    if (!resetPhone.trim()) {
      setResetPhoneError('Vui lòng điền số điện thoại liên hệ');
      hasError = true;
    } else {
      setResetPhoneError('');
    }
    
    if (hasError) return;
    
    setResetLoading(true);
    setResetErrorMessage(null);
    setResetSuccessMessage(null);
    
    let searchUsername = resetUsername.trim();
    if (searchUsername.includes('@')) {
      searchUsername = searchUsername.split('@')[0];
    }
    searchUsername = searchUsername.toLowerCase();
    
    try {
      // 1. Truy vấn Firestore tìm người dùng theo username
      const usersRef = collection(db, 'users');
      const q = query(usersRef, where('username', '==', searchUsername));
      const querySnapshot = await getDocs(q);
      
      if (querySnapshot.empty) {
        setResetErrorMessage('Tên đăng nhập không tồn tại trên hệ thống. Vui lòng kiểm tra kỹ hoặc liên hệ trực tiếp Thầy cô để đăng ký.');
        setResetLoading(false);
        return;
      }
      
      const userDoc = querySnapshot.docs[0];
      const userData = userDoc.data();
      
      // 2. Tạo yêu cầu trong Firestore để Giáo viên/Admin duyệt nhanh chóng
      const requestPayload = {
        userId: userData.id,
        username: searchUsername,
        name: resetStudentName.trim(),
        className: resetClassName.trim(),
        phone: resetPhone.trim(),
        message: resetMessage.trim() || 'Cần cấp lại mật khẩu mới',
        status: 'pending',
        createdAt: new Date().toISOString()
      };
      
      await setDoc(doc(db, 'reset_requests', userData.id), requestPayload);
      
      setResetSuccessMessage(`Gửi yêu cầu thành công! Yêu cầu cấp lại mật khẩu của học sinh ${resetStudentName.trim()} đã được gửi đến Thầy cô phụ trách để duyệt và cấp lại mật khẩu tạm thời. Vui lòng chuyển sang tab "Tra cứu trạng thái duyệt" để kiểm tra kết quả phê duyệt.`);
    } catch (err: any) {
      console.error(err);
      let friendlyError = 'Không thể gửi yêu cầu khôi phục. Vui lòng kiểm tra lại kết nối mạng.';
      if (err.message) {
        if (err.message.includes('permission-denied') || err.message.includes('Permission denied') || err.message.includes('Missing or insufficient permissions')) {
          friendlyError = 'Lỗi bảo mật (Permission Denied): Quyền truy cập bị từ chối. Vui lòng triển khai Firestore Security Rules mới.';
        } else {
          friendlyError = `Lỗi gửi yêu cầu khôi phục: ${err.message}`;
        }
      } else if (err.code) {
        friendlyError = `Lỗi gửi yêu cầu khôi phục: ${err.code}`;
      }
      setResetErrorMessage(friendlyError);
    } finally {
      setResetLoading(false);
    }
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
            onClick={() => handleToggleSignUp(false)}
            className={`flex-1 py-3 text-sm font-bold rounded-2xl flex items-center justify-center gap-2 transition-all ${
              !isSignUp ? 'bg-white text-indigo-600 shadow-sm border border-slate-200' : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            <LogIn className="w-4 h-4" />
            Đăng nhập
          </button>
          <button
            type="button"
            onClick={() => handleToggleSignUp(true)}
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

          {successMessage && (
            <div className="mb-4 p-3.5 bg-green-50 border border-green-100 text-green-700 text-xs rounded-2xl font-bold flex items-center gap-2">
              <Check className="w-4 h-4 text-green-600 flex-shrink-0" />
              <span>{successMessage}</span>
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
              let userDocSnap;
              try {
                userDocSnap = await getDoc(userDocRef);
              } catch (getErr) {
                handleFirestoreError(getErr, OperationType.GET, `users/${userCredential.user.uid}`);
              }

              if (userDocSnap && userDocSnap.exists()) {
                const userData = userDocSnap.data();
                onLogin(userData.role as Role);
              } else {
                const detectedRole = loginUsername.toLowerCase().includes('teacher') ? 'teacher' : 'student';
                const profilePayload = {
                  id: userCredential.user.uid,
                  name: loginUsername,
                  role: detectedRole,
                  avatar: detectedRole === 'teacher' 
                    ? 'https://images.unsplash.com/photo-1624561172888-ac93c696e10c?auto=format&fit=crop&q=80&w=256&h=256'
                    : 'https://images.unsplash.com/photo-1607990283143-e81e7a2c93ab?auto=format&fit=crop&q=80&w=256&h=256',
                  username: loginUsername,
                  createdAt: new Date().toISOString()
                };
                try {
                  await setDoc(userDocRef, profilePayload);
                } catch (setErr) {
                  handleFirestoreError(setErr, OperationType.CREATE, `users/${userCredential.user.uid}`);
                }
                onLogin(detectedRole);
              }
            } catch (err: any) {
              console.error(err);
              let friendlyMessage = 'Đăng nhập thất bại. Vui lòng kiểm tra lại tài khoản hoặc mật khẩu.';
              if (err.code) {
                if (err.code === 'auth/user-not-found' || err.code === 'auth/wrong-password' || err.code === 'auth/invalid-credential' || err.code === 'auth/invalid-email') {
                  friendlyMessage = 'Tên đăng nhập hoặc mật khẩu không chính xác. Nếu bạn chưa có tài khoản, vui lòng chọn ĐĂNG KÝ để tạo tài khoản mới.';
                } else if (err.code === 'auth/network-request-failed') {
                  friendlyMessage = 'Lỗi kết nối mạng. Vui lòng thử lại sau.';
                } else if (err.code === 'auth/operation-not-allowed') {
                  friendlyMessage = 'Đăng nhập Email/Mật khẩu chưa được kích hoạt trong Firebase Auth Console. Vui lòng truy cập Firebase Console -> Authentication -> Sign-in method và BẬT "Email/Password".';
                } else {
                  friendlyMessage = `Đăng nhập thất bại: ${err.message || err.code}`;
                }
              } else {
                try {
                  const parsed = JSON.parse(err.message);
                  if (parsed && parsed.error) {
                    friendlyMessage = `Lỗi truy xuất cơ sở dữ liệu (Firestore): ${parsed.error}`;
                  } else {
                    friendlyMessage = `Đăng nhập thất bại: ${err.message || err}`;
                  }
                } catch {
                  friendlyMessage = `Đăng nhập thất bại: ${err.message || err}`;
                }
              }
              setErrorMessage(friendlyMessage);
            } finally {
              setLoading(false);
            }
          }}>
            <div className="space-y-4 bg-slate-50/80 p-4 sm:p-6 rounded-2xl border border-slate-200/80 shadow-sm">
              <div className="space-y-1">
                <label className="block text-xs font-bold text-slate-700">Tên đăng nhập</label>
                <div className="relative group">
                  <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                    <User className="h-4 w-4 text-slate-400 group-focus-within:text-indigo-600 transition-colors" />
                  </div>
                  <input 
                    type="text" 
                    placeholder="nguyenvana" 
                    className="w-full bg-white border border-slate-200 text-slate-900 rounded-xl pl-11 pr-4 py-2.5 sm:py-3 focus:outline-none focus:border-indigo-600 focus:ring-1 focus:ring-indigo-600 transition-all placeholder:text-slate-400 text-sm hover:border-slate-300" 
                    required 
                    disabled={loading}
                    value={loginUsername}
                    onChange={(e) => setLoginUsername(e.target.value)}
                  />
                </div>
              </div>
              <div className="space-y-1">
                <label className="block text-xs font-bold text-slate-700">Mật khẩu</label>
                <div className="relative group">
                  <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                    <Lock className="h-4 w-4 text-slate-400 group-focus-within:text-indigo-600 transition-colors" />
                  </div>
                  <input 
                    type={showLoginPassword ? "text" : "password"} 
                    placeholder="Nhập mật khẩu của bạn" 
                    className="w-full bg-white border border-slate-200 text-slate-900 rounded-xl pl-11 pr-12 py-2.5 sm:py-3 focus:outline-none focus:border-indigo-600 focus:ring-1 focus:ring-indigo-600 transition-all placeholder:text-slate-400 text-sm hover:border-slate-300" 
                    required 
                    disabled={loading}
                    value={loginPassword}
                    onChange={(e) => setLoginPassword(e.target.value)}
                  />
                   <button
                    type="button"
                    onMouseDown={() => setShowLoginPassword(true)}
                    onMouseUp={() => setShowLoginPassword(false)}
                    onMouseLeave={() => setShowLoginPassword(false)}
                    onTouchStart={(e) => { e.preventDefault(); setShowLoginPassword(true); }}
                    onTouchEnd={(e) => { e.preventDefault(); setShowLoginPassword(false); }}
                    onTouchCancel={(e) => { e.preventDefault(); setShowLoginPassword(false); }}
                    className="absolute inset-y-0 right-0 pr-4 flex items-center text-slate-400 hover:text-indigo-600 transition-colors focus:outline-none select-none touch-none cursor-pointer"
                  >
                    {showLoginPassword ? <Eye className="h-4 w-4 text-indigo-600" /> : <EyeOff className="h-4 w-4" />}
                  </button>
                </div>
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
              sessionStorage.setItem('isSigningUp', 'true');
              let email = signupUsername.trim();
              if (!email.includes('@')) {
                email = `${email.toLowerCase()}@educonnect.com`;
              }
              const userCredential = await createUserWithEmailAndPassword(auth, email, signupPassword);
              const uid = userCredential.user.uid;
              const generatedConnectionCode = Math.floor(100000 + Math.random() * 900000).toString();
              
              const avatarUrl = signupRole === 'teacher' 
                ? 'https://images.unsplash.com/photo-1624561172888-ac93c696e10c?auto=format&fit=crop&q=80&w=256&h=256'
                : 'https://images.unsplash.com/photo-1607990283143-e81e7a2c93ab?auto=format&fit=crop&q=80&w=256&h=256';

              const newUserProfile = {
                id: uid,
                name: signupName,
                dob: signupDob,
                role: signupRole,
                avatar: avatarUrl,
                username: signupUsername,
                recoveryEmail: signupRecoveryEmail.trim().toLowerCase(),
                phoneParent: signupRole === 'student' ? signupPhoneParent : '',
                phoneStudent: signupRole === 'student' ? signupPhoneStudent : '',
                className: signupRole === 'student' ? signupClass : signupRole === 'admin' ? 'Ban BGH / Admin' : 'Giáo viên',
                connectionCode: generatedConnectionCode,
                createdAt: new Date().toISOString()
              };

              try {
                await setDoc(doc(db, 'users', uid), newUserProfile);
              } catch (setErr) {
                handleFirestoreError(setErr, OperationType.CREATE, `users/${uid}`);
              }
              
              try {
                await auth.signOut();
              } catch (signOutErr) {
                console.error('Error signing out after registration:', signOutErr);
              }
              
              sessionStorage.removeItem('isSigningUp');

              setIsSignUp(false);
              setLoginUsername(signupUsername);
              setLoginPassword(signupPassword);
              setSuccessMessage('Đăng ký tài khoản thành công! Vui lòng kiểm tra lại thông tin và nhấn "ĐĂNG NHẬP" để bắt đầu.');
            } catch (err: any) {
              console.error(err);
              let friendlyMessage = 'Đăng ký tài khoản thất bại. Vui lòng thử lại.';
              if (err.code) {
                if (err.code === 'auth/email-already-in-use') {
                  friendlyMessage = 'Tên đăng nhập đã tồn tại trên hệ thống.';
                } else if (err.code === 'auth/weak-password') {
                  friendlyMessage = 'Mật khẩu quá yếu (phải có ít nhất 6 ký tự).';
                } else if (err.code === 'auth/network-request-failed') {
                  friendlyMessage = 'Lỗi kết nối mạng. Vui lòng thử lại sau.';
                } else if (err.code === 'auth/operation-not-allowed') {
                  friendlyMessage = 'Đăng ký bằng Email/Mật khẩu chưa được kích hoạt trong Firebase Auth. Vui lòng truy cập Firebase Console -> Authentication -> Sign-in method và BẬT "Email/Password".';
                } else {
                  friendlyMessage = `Đăng ký thất bại: ${err.message || err.code}`;
                }
              } else {
                try {
                  const parsed = JSON.parse(err.message);
                  if (parsed && parsed.error) {
                    friendlyMessage = `Lỗi ghi cơ sở dữ liệu (Firestore): ${parsed.error}`;
                  } else {
                    friendlyMessage = `Đăng ký thất bại: ${err.message || err}`;
                  }
                } catch {
                  friendlyMessage = `Đăng ký thất bại: ${err.message || err}`;
                }
              }
              setErrorMessage(friendlyMessage);
            } finally {
              sessionStorage.removeItem('isSigningUp');
              setLoading(false);
            }
          }}>
            <div className="space-y-3 pb-2">
              <div className="space-y-1">
                <label className="block text-xs font-bold text-slate-700">Họ và tên</label>
                <div className="relative group">
                  <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                    <User className="h-4 w-4 text-slate-400" />
                  </div>
                  <input 
                    type="text" 
                    placeholder="Nguyễn Văn A" 
                    className="w-full bg-white border border-slate-200 text-slate-900 rounded-xl pl-11 pr-4 py-2.5 focus:outline-none focus:border-indigo-600 focus:ring-1 focus:ring-indigo-600 transition-colors placeholder:text-slate-400 text-sm hover:border-slate-300" 
                    required 
                    disabled={loading}
                    value={signupName}
                    onChange={(e) => setSignupName(e.target.value)}
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="block text-xs font-bold text-slate-700">Ngày sinh</label>
                <div className="relative group">
                  <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                    <Calendar className="h-4 w-4 text-slate-400" />
                  </div>
                  <input 
                    type="date" 
                    className="w-full bg-white border border-slate-200 text-slate-900 rounded-xl pl-11 pr-4 py-2.5 focus:outline-none focus:border-indigo-600 focus:ring-1 focus:ring-indigo-600 transition-colors text-sm hover:border-slate-300" 
                    required 
                    disabled={loading}
                    value={signupDob}
                    onChange={(e) => setSignupDob(e.target.value)}
                  />
                </div>
              </div>
              
              <div className="space-y-1">
                <label className="block text-xs font-bold text-slate-700">Tên đăng nhập</label>
                <div className="relative group">
                  <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                    <User className="h-4 w-4 text-slate-400" />
                  </div>
                  <input 
                    type="text" 
                    placeholder="nguyenvana" 
                    className="w-full bg-white border border-slate-200 text-slate-900 rounded-xl pl-11 pr-4 py-2.5 focus:outline-none focus:border-indigo-600 focus:ring-1 focus:ring-indigo-600 transition-colors placeholder:text-slate-400 text-sm hover:border-slate-300" 
                    required 
                    disabled={loading}
                    value={signupUsername}
                    onChange={(e) => setSignupUsername(e.target.value)}
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="block text-xs font-bold text-slate-700">Email khôi phục (Gmail)</label>
                <div className="relative group">
                  <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                    <Mail className="h-4 w-4 text-slate-400" />
                  </div>
                  <input 
                    type="email" 
                    placeholder="vi-du@gmail.com" 
                    className="w-full bg-white border border-slate-200 text-slate-900 rounded-xl pl-11 pr-4 py-2.5 focus:outline-none focus:border-indigo-600 focus:ring-1 focus:ring-indigo-600 transition-colors placeholder:text-slate-400 text-sm hover:border-slate-300" 
                    required 
                    disabled={loading}
                    value={signupRecoveryEmail}
                    onChange={(e) => setSignupRecoveryEmail(e.target.value)}
                  />
                </div>
              </div>

              {signupRole === 'student' && (
                <>
                  <div className="space-y-1">
                    <label className="block text-xs font-bold text-slate-700">SĐT Phụ huynh</label>
                    <div className="relative group">
                      <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                        <Phone className="h-4 w-4 text-slate-400" />
                      </div>
                      <input 
                        type="tel" 
                        placeholder="0912345678" 
                        className="w-full bg-white border border-slate-200 text-slate-900 rounded-xl pl-11 pr-4 py-2.5 focus:outline-none focus:border-indigo-600 focus:ring-1 focus:ring-indigo-600 transition-colors placeholder:text-slate-400 text-sm hover:border-slate-300" 
                        required 
                        disabled={loading}
                        value={signupPhoneParent}
                        onChange={(e) => setSignupPhoneParent(e.target.value)}
                      />
                    </div>
                  </div>
                  <div className="space-y-1">
                    <label className="block text-xs font-bold text-slate-700">Mã Lớp Học (Tùy chọn - Chọn GV sau)</label>
                    <div className="relative group">
                      <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                        <Key className="h-4 w-4 text-slate-400" />
                      </div>
                      <input 
                        type="text" 
                        placeholder="VD: 123456 (Để trống nếu chọn sau)" 
                        className="w-full bg-white border border-slate-200 text-slate-900 rounded-xl pl-11 pr-4 py-2.5 focus:outline-none focus:border-indigo-600 focus:ring-1 focus:ring-indigo-600 transition-colors placeholder:text-slate-400 font-mono text-sm uppercase tracking-widest hover:border-slate-300" 
                        maxLength={6}
                        disabled={loading}
                        value={signupClass}
                        onChange={(e) => setSignupClass(e.target.value.toUpperCase())}
                      />
                    </div>
                  </div>
                  <div className="space-y-1">
                    <label className="block text-xs font-bold text-slate-700">SĐT Học sinh (nếu có)</label>
                    <div className="relative group">
                      <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                        <Phone className="h-4 w-4 text-slate-400" />
                      </div>
                      <input 
                        type="tel" 
                        placeholder="0987654321" 
                        className="w-full bg-white border border-slate-200 text-slate-900 rounded-xl pl-11 pr-4 py-2.5 focus:outline-none focus:border-indigo-600 focus:ring-1 focus:ring-indigo-600 transition-colors placeholder:text-slate-400 text-sm hover:border-slate-300" 
                        disabled={loading}
                        value={signupPhoneStudent}
                        onChange={(e) => setSignupPhoneStudent(e.target.value)}
                      />
                    </div>
                  </div>
                </>
              )}

              <div className="space-y-1">
                <label className="block text-xs font-bold text-slate-700">Mật khẩu</label>
                <div className="relative group">
                  <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                    <Lock className="h-4 w-4 text-slate-400" />
                  </div>
                  <input 
                    type={showSignupPassword ? "text" : "password"} 
                    placeholder="Nhập mật khẩu ít nhất 6 ký tự" 
                    className="w-full bg-white border border-slate-200 text-slate-900 rounded-xl pl-11 pr-12 py-2.5 focus:outline-none focus:border-indigo-600 focus:ring-1 focus:ring-indigo-600 transition-colors placeholder:text-slate-400 text-sm hover:border-slate-300" 
                    required 
                    disabled={loading}
                    value={signupPassword}
                    onChange={(e) => setSignupPassword(e.target.value)}
                  />
                   <button
                    type="button"
                    onMouseDown={() => setShowSignupPassword(true)}
                    onMouseUp={() => setShowSignupPassword(false)}
                    onMouseLeave={() => setShowSignupPassword(false)}
                    onTouchStart={(e) => { e.preventDefault(); setShowSignupPassword(true); }}
                    onTouchEnd={(e) => { e.preventDefault(); setShowSignupPassword(false); }}
                    onTouchCancel={(e) => { e.preventDefault(); setShowSignupPassword(false); }}
                    className="absolute inset-y-0 right-0 pr-4 flex items-center text-slate-400 hover:text-indigo-600 transition-colors focus:outline-none select-none touch-none cursor-pointer"
                  >
                    {showSignupPassword ? <Eye className="h-4 w-4 text-indigo-600" /> : <EyeOff className="h-4 w-4" />}
                  </button>
                </div>
              </div>
              
              <div className="space-y-1">
                <label className="block text-xs font-bold text-slate-700">Xác nhận mật khẩu</label>
                <div className="relative group">
                  <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                    <Lock className="h-4 w-4 text-slate-400" />
                  </div>
                  <input 
                    type={showSignupConfirmPassword ? "text" : "password"} 
                    placeholder="Nhập lại mật khẩu để xác nhận" 
                    className={`w-full bg-white border text-slate-900 rounded-xl pl-11 pr-12 py-2.5 focus:outline-none focus:ring-1 transition-all placeholder:text-slate-400 text-sm hover:border-slate-300 ${
                      pasteWarning 
                        ? 'border-rose-500 focus:border-rose-500 focus:ring-rose-500 bg-rose-50/10' 
                        : 'border-slate-200 focus:border-indigo-600 focus:ring-indigo-600'
                    }`}
                    required 
                    disabled={loading}
                    value={signupConfirmPassword}
                    onChange={(e) => {
                      setSignupConfirmPassword(e.target.value);
                      if (pasteWarning) setPasteWarning(false);
                    }}
                    onPaste={(e) => {
                      e.preventDefault();
                      setPasteWarning(true);
                    }}
                    onCopy={(e) => {
                      e.preventDefault();
                    }}
                    onDrop={(e) => {
                      e.preventDefault();
                    }}
                    autoComplete="off"
                  />
                  <button
                    type="button"
                    onMouseDown={() => setShowSignupConfirmPassword(true)}
                    onMouseUp={() => setShowSignupConfirmPassword(false)}
                    onMouseLeave={() => setShowSignupConfirmPassword(false)}
                    onTouchStart={(e) => { e.preventDefault(); setShowSignupConfirmPassword(true); }}
                    onTouchEnd={(e) => { e.preventDefault(); setShowSignupConfirmPassword(false); }}
                    onTouchCancel={(e) => { e.preventDefault(); setShowSignupConfirmPassword(false); }}
                    className="absolute inset-y-0 right-0 pr-4 flex items-center text-slate-400 hover:text-indigo-600 transition-colors focus:outline-none select-none touch-none cursor-pointer"
                  >
                    {showSignupConfirmPassword ? <Eye className="h-4 w-4 text-indigo-600" /> : <EyeOff className="h-4 w-4" />}
                  </button>
                </div>
                {pasteWarning && (
                  <p className="text-rose-500 text-[11px] font-medium mt-1 flex items-center gap-1 pl-1 animate-fadeIn">
                    <AlertCircle className="w-3.5 h-3.5 flex-shrink-0" />
                    Vui lòng tự gõ tay mật khẩu xác nhận, không thể sao chép!
                  </p>
                )}
              </div>
            </div>
            
            <div className="pt-2 text-center">
              <button type="submit" disabled={loading} className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-bold py-3.5 rounded-xl hover:opacity-95 transition-all shadow-md shadow-indigo-500/20 disabled:opacity-50">
                {loading ? 'ĐANG XỬ LÝ...' : 'TẠO TÀI KHOẢN'}
              </button>
              <button type="button" onClick={() => handleToggleSignUp(false)} className="mt-3 text-slate-500 hover:text-slate-900 text-xs sm:text-sm transition-colors font-medium">
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
                        onClick={() => handleToggleSignUp(true)}
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
                                <span className="text-white/60 text-[10px] uppercase">Mã lớp</span>
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

                  </div>
               </div>
            </div>

          </div>
        </div>

      </div>

      <AnimatePresence>
        {showAdminModal && (
          <div className="fixed inset-0 z-[1000] flex items-center justify-center p-4">
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowAdminModal(false)}
              className="absolute inset-0 bg-slate-900/60 backdrop-blur-md"
            />
            
            {/* Modal Box */}
            <motion.div
              initial={{ scale: 0.85, opacity: 0, y: 20 }}
              animate={{ 
                scale: 1, 
                opacity: 1, 
                y: 0,
                transition: {
                  type: "spring",
                  damping: 25,
                  stiffness: 350
                }
              }}
              exit={{ 
                scale: 0.9, 
                opacity: 0, 
                y: 10,
                transition: { duration: 0.15 }
              }}
              className="bg-white rounded-3xl border border-slate-100 shadow-2xl max-w-lg w-full relative z-[1010] text-left flex flex-col max-h-[85vh] sm:max-h-[90vh] overflow-hidden"
            >
              {/* Close Button */}
              <button
                onClick={() => setShowAdminModal(false)}
                className="absolute top-5 right-5 text-slate-400 hover:text-slate-600 hover:bg-slate-50 rounded-full p-2 transition-all duration-200 z-[1020]"
              >
                <X className="h-5 w-5" />
              </button>

              {/* Fixed Header Section */}
              <div className="pt-6 px-6 sm:pt-8 sm:px-8 pb-4 border-b border-slate-100 flex flex-col bg-white">
                <div className="flex items-center gap-4 mb-4">
                  <div className="bg-indigo-50 text-indigo-600 rounded-2xl p-3 w-12 h-12 flex items-center justify-center shadow-sm">
                    <HelpCircle className="h-6 w-6" />
                  </div>
                  <div>
                    <h3 className="text-xl font-bold text-slate-900 tracking-tight">
                      Khôi phục mật khẩu
                    </h3>
                    <p className="text-xs text-slate-500 font-medium">Cổng xác thực & Cấp lại mật khẩu an toàn</p>
                  </div>
                </div>

                {/* Tab Selector Inside Modal */}
                <div className="flex p-1 bg-slate-50 rounded-2xl gap-1">
                  <button
                    type="button"
                    onClick={() => setRecoveryTab('request')}
                    className={`flex-1 py-2 text-xs font-bold rounded-xl transition-all ${
                      recoveryTab === 'request'
                        ? 'bg-white text-indigo-600 shadow-sm border border-slate-200/60'
                        : 'text-slate-500 hover:text-slate-800'
                    }`}
                  >
                    Gửi yêu cầu khôi phục
                  </button>
                  <button
                    type="button"
                    onClick={() => setRecoveryTab('lookup')}
                    className={`flex-1 py-2 text-xs font-bold rounded-xl transition-all ${
                      recoveryTab === 'lookup'
                        ? 'bg-white text-indigo-600 shadow-sm border border-slate-200/60'
                        : 'text-slate-500 hover:text-slate-800'
                    }`}
                  >
                    Tra cứu trạng thái duyệt
                  </button>
                </div>
              </div>

              {/* Scrollable Content Section */}
              <div className="flex-1 overflow-y-auto px-6 sm:px-8 py-5 space-y-4 [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:bg-slate-200 [&::-webkit-scrollbar-thumb]:rounded-full hover:[&::-webkit-scrollbar-thumb]:bg-slate-300">
                {recoveryTab === 'request' ? (
                <>
                  <div className="mb-6 pb-6 border-b border-slate-100">
                    <h4 className="text-sm font-bold text-slate-800 mb-2 flex items-center gap-2">
                      <span className="flex items-center justify-center w-5 h-5 bg-indigo-100 text-indigo-600 rounded-full text-xs font-bold">1</span>
                      Gửi thông tin khôi phục đến Thầy cô hoặc Admin
                    </h4>
                    <p className="text-xs text-slate-500 mb-3 leading-relaxed">
                      Vui lòng nhập chính xác thông tin cá nhân của bạn dưới đây để gửi yêu cầu đặt lại mật khẩu đến Giáo viên chủ nhiệm hoặc Thầy cô quản trị phê duyệt trực tiếp.
                    </p>

                    <form onSubmit={handlePasswordReset} className="space-y-3">
                      {/* Họ tên học sinh */}
                      <div className="space-y-1 animate-fadeIn">
                        <label className="block text-xs font-semibold text-slate-600 flex items-center gap-1">
                          Họ và tên (Học sinh/Phụ huynh/Giáo viên)
                          <span className="text-rose-500">*</span>
                        </label>
                        <div className="relative">
                          <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                            <User className={`h-4 w-4 ${resetStudentNameError ? 'text-rose-400' : 'text-slate-400'}`} />
                          </div>
                          <input 
                            type="text"
                            placeholder="Nhập họ và tên đầy đủ"
                            value={resetStudentName}
                            onChange={(e) => {
                              setResetStudentName(e.target.value);
                              if (resetStudentNameError) setResetStudentNameError('');
                            }}
                            className={`w-full bg-white border text-slate-900 rounded-xl pl-10 pr-4 py-2.5 text-sm focus:outline-none focus:ring-1 transition-all placeholder:text-slate-400 ${
                              resetStudentNameError 
                                ? 'border-rose-500 focus:border-rose-500 focus:ring-rose-500 bg-rose-50/10' 
                                : 'border-slate-200 focus:border-indigo-600 focus:ring-indigo-600'
                            }`}
                            disabled={resetLoading}
                          />
                        </div>
                        {resetStudentNameError && (
                          <p className="text-rose-500 text-[11px] font-medium mt-1 flex items-center gap-1 pl-1">
                            <AlertCircle className="w-3.5 h-3.5 flex-shrink-0" />
                            {resetStudentNameError}
                          </p>
                        )}
                      </div>

                      {/* Tên đăng nhập */}
                      <div className="space-y-1">
                        <label className="block text-xs font-semibold text-slate-600 flex items-center gap-1">
                          Tên đăng nhập tài khoản cần đặt lại
                          <span className="text-rose-500">*</span>
                        </label>
                        <div className="relative">
                          <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                            <User className={`h-4 w-4 ${resetUsernameError ? 'text-rose-400' : 'text-slate-400'}`} />
                          </div>
                          <input 
                            type="text"
                            placeholder="nguyenvana"
                            value={resetUsername}
                            onChange={(e) => {
                              setResetUsername(e.target.value);
                              if (resetUsernameError) setResetUsernameError('');
                            }}
                            className={`w-full bg-white border text-slate-900 rounded-xl pl-10 pr-4 py-2.5 text-sm focus:outline-none focus:ring-1 transition-all placeholder:text-slate-400 ${
                              resetUsernameError 
                                ? 'border-rose-500 focus:border-rose-500 focus:ring-rose-500 bg-rose-50/10' 
                                : 'border-slate-200 focus:border-indigo-600 focus:ring-indigo-600'
                            }`}
                            disabled={resetLoading}
                          />
                        </div>
                        {resetUsernameError && (
                          <p className="text-rose-500 text-[11px] font-medium mt-1 flex items-center gap-1 pl-1">
                            <AlertCircle className="w-3.5 h-3.5 flex-shrink-0" />
                            {resetUsernameError}
                          </p>
                        )}
                      </div>

                      {/* Lớp học */}
                      <div className="space-y-1">
                        <label className="block text-xs font-semibold text-slate-600 flex items-center gap-1">
                          Lớp học / Đơn vị công tác
                          <span className="text-rose-500">*</span>
                        </label>
                        <div className="relative">
                          <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                            <Award className={`h-4 w-4 ${resetClassNameError ? 'text-rose-400' : 'text-slate-400'}`} />
                          </div>
                          <input 
                            type="text"
                            placeholder="Ví dụ: 10A1, Tổ Toán, Phụ huynh em Nguyễn Văn A..."
                            value={resetClassName}
                            onChange={(e) => {
                              setResetClassName(e.target.value);
                              if (resetClassNameError) setResetClassNameError('');
                            }}
                            className={`w-full bg-white border text-slate-900 rounded-xl pl-10 pr-4 py-2.5 text-sm focus:outline-none focus:ring-1 transition-all placeholder:text-slate-400 ${
                              resetClassNameError 
                                ? 'border-rose-500 focus:border-rose-500 focus:ring-rose-500 bg-rose-50/10' 
                                : 'border-slate-200 focus:border-indigo-600 focus:ring-indigo-600'
                            }`}
                            disabled={resetLoading}
                          />
                        </div>
                        {resetClassNameError && (
                          <p className="text-rose-500 text-[11px] font-medium mt-1 flex items-center gap-1 pl-1">
                            <AlertCircle className="w-3.5 h-3.5 flex-shrink-0" />
                            {resetClassNameError}
                          </p>
                        )}
                      </div>

                      {/* Số điện thoại */}
                      <div className="space-y-1">
                        <label className="block text-xs font-semibold text-slate-600 flex items-center gap-1">
                          Số điện thoại liên hệ
                          <span className="text-rose-500">*</span>
                        </label>
                        <div className="relative">
                          <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                            <Phone className={`h-4 w-4 ${resetPhoneError ? 'text-rose-400' : 'text-slate-400'}`} />
                          </div>
                          <input 
                            type="tel"
                            placeholder="Nhập số điện thoại liên hệ của bạn"
                            value={resetPhone}
                            onChange={(e) => {
                              setResetPhone(e.target.value);
                              if (resetPhoneError) setResetPhoneError('');
                            }}
                            className={`w-full bg-white border text-slate-900 rounded-xl pl-10 pr-4 py-2.5 text-sm focus:outline-none focus:ring-1 transition-all placeholder:text-slate-400 ${
                              resetPhoneError 
                                ? 'border-rose-500 focus:border-rose-500 focus:ring-rose-500 bg-rose-50/10' 
                                : 'border-slate-200 focus:border-indigo-600 focus:ring-indigo-600'
                            }`}
                            disabled={resetLoading}
                          />
                        </div>
                        {resetPhoneError && (
                          <p className="text-rose-500 text-[11px] font-medium mt-1 flex items-center gap-1 pl-1">
                            <AlertCircle className="w-3.5 h-3.5 flex-shrink-0" />
                            {resetPhoneError}
                          </p>
                        )}
                      </div>

                      {/* Lời nhắn */}
                      <div className="space-y-1">
                        <label className="block text-xs font-semibold text-slate-600">Lời nhắn đến Thầy cô hoặc Admin (Tùy chọn)</label>
                        <textarea 
                          placeholder="Nhập lý do hoặc lời nhắn thêm..."
                          value={resetMessage}
                          onChange={(e) => setResetMessage(e.target.value)}
                          className="w-full bg-white border border-slate-200 text-slate-900 rounded-xl px-4 py-2 text-sm focus:outline-none focus:border-indigo-600 focus:ring-1 focus:ring-indigo-600 transition-all placeholder:text-slate-400 h-16 resize-none"
                          disabled={resetLoading}
                        />
                      </div>

                      {resetErrorMessage && (
                        <div className="bg-rose-50 border border-rose-100 text-rose-600 rounded-xl px-3 py-2 text-xs flex items-start gap-2">
                          <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                          <span>{resetErrorMessage}</span>
                        </div>
                      )}

                      {resetSuccessMessage && (
                        <div className="bg-emerald-50 border border-emerald-100 text-emerald-700 rounded-xl px-3 py-2.5 text-xs flex items-start gap-2 leading-relaxed">
                          <Check className="w-4 h-4 text-emerald-600 flex-shrink-0 mt-0.5" />
                          <span>{resetSuccessMessage}</span>
                        </div>
                      )}

                      <button
                        type="submit"
                        disabled={resetLoading}
                        className="w-full bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold py-3 px-4 rounded-xl transition-all active:scale-[0.98] flex items-center justify-center gap-2 disabled:opacity-50 shadow-sm"
                      >
                        {resetLoading ? 'Đang gửi yêu cầu...' : 'Gửi yêu cầu khôi phục đến Thầy cô / Admin'}
                      </button>
                    </form>
                  </div>

                  {/* Option 2: Contact Teacher / Admin directly */}
                  <div className="mt-6 mb-2">
                    <h4 className="text-sm font-bold text-slate-800 mb-2 flex items-center gap-2">
                      <span className="flex items-center justify-center w-5 h-5 bg-indigo-100 text-indigo-600 rounded-full text-xs font-bold">2</span>
                      Liên hệ trực tiếp Giáo viên hoặc Admin
                    </h4>
                    <p className="text-xs text-slate-500 leading-relaxed mb-3">
                      Trong trường hợp khẩn cấp (như cần mật khẩu gấp để vào làm bài thi, nộp bài, hoặc chấm điểm), học sinh, phụ huynh và giáo viên có thể liên hệ trực tiếp với Giáo viên chủ nhiệm hoặc Ban quản trị qua Zalo để được duyệt nhanh nhất.
                    </p>
                    
                    <div className="bg-slate-50 border border-slate-200/60 rounded-2xl p-4 text-xs text-slate-600 space-y-2">
                      <p className="font-semibold text-slate-800 flex items-center gap-1.5">
                        <Phone className="w-3.5 h-3.5 text-indigo-500" />
                        Hướng dẫn xử lý nhanh:
                      </p>
                      <ul className="list-disc list-inside space-y-1 text-slate-700">
                        <li>Thầy cô hoặc Admin duyệt ngay yêu cầu của bạn trên trang quản lý tài khoản.</li>
                        <li>Mật khẩu tạm thời sẽ được cấp trực tiếp mà không cần qua Email.</li>
                        <li>Bạn có thể tra cứu kết quả duyệt ở tab <strong>"Tra cứu trạng thái duyệt"</strong>.</li>
                      </ul>
                    </div>
                  </div>
                </>
              ) : (
                /* REQUEST LOOKUP PANEL FOR STUDENTS */
                <div className="space-y-4">
                  <p className="text-xs text-slate-500 leading-relaxed">
                    Sau khi gửi yêu cầu khôi phục, bạn hãy nhập tên đăng nhập cùng số điện thoại liên hệ đã điền để tra cứu trạng thái phê duyệt và lấy mật khẩu tạm thời.
                  </p>

                  <form onSubmit={handleRequestLookup} className="space-y-3">
                    <div className="space-y-1">
                      <label className="block text-xs font-semibold text-slate-600 flex items-center gap-1">
                        Tên đăng nhập cần kiểm tra
                        <span className="text-rose-500">*</span>
                      </label>
                      <div className="relative">
                        <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                          <User className={`h-4 w-4 ${lookupUsernameError ? 'text-rose-400' : 'text-slate-400'}`} />
                        </div>
                        <input 
                          type="text"
                          placeholder="Nhập tên đăng nhập của bạn"
                          value={lookupUsername}
                          onChange={(e) => {
                            setLookupUsername(e.target.value);
                            if (lookupUsernameError) setLookupUsernameError('');
                          }}
                          className={`w-full bg-white border text-slate-900 rounded-xl pl-10 pr-4 py-2.5 text-sm focus:outline-none focus:ring-1 transition-all placeholder:text-slate-400 ${
                            lookupUsernameError 
                              ? 'border-rose-500 focus:border-rose-500 focus:ring-rose-500 bg-rose-50/10' 
                              : 'border-slate-200 focus:border-indigo-600 focus:ring-indigo-600'
                          }`}
                          disabled={lookupLoading}
                        />
                      </div>
                      {lookupUsernameError && (
                        <p className="text-rose-500 text-[11px] font-medium mt-1 flex items-center gap-1 pl-1">
                          <AlertCircle className="w-3.5 h-3.5 flex-shrink-0" />
                          {lookupUsernameError}
                        </p>
                      )}
                    </div>

                    <div className="space-y-1">
                      <label className="block text-xs font-semibold text-slate-600 flex items-center gap-1">
                        Số điện thoại liên hệ (Đã điền trong yêu cầu)
                        <span className="text-rose-500">*</span>
                      </label>
                      <div className="relative">
                        <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                          <Phone className={`h-4 w-4 ${lookupPhoneError ? 'text-rose-400' : 'text-slate-400'}`} />
                        </div>
                        <input 
                          type="tel"
                          placeholder="Nhập số điện thoại liên hệ để đối chiếu"
                          value={lookupPhone}
                          onChange={(e) => {
                            setLookupPhone(e.target.value);
                            if (lookupPhoneError) setLookupPhoneError('');
                          }}
                          className={`w-full bg-white border text-slate-900 rounded-xl pl-10 pr-4 py-2.5 text-sm focus:outline-none focus:ring-1 transition-all placeholder:text-slate-400 ${
                            lookupPhoneError 
                              ? 'border-rose-500 focus:border-rose-500 focus:ring-rose-500 bg-rose-50/10' 
                              : 'border-slate-200 focus:border-indigo-600 focus:ring-indigo-600'
                          }`}
                          disabled={lookupLoading}
                        />
                      </div>
                      {lookupPhoneError && (
                        <p className="text-rose-500 text-[11px] font-medium mt-1 flex items-center gap-1 pl-1">
                          <AlertCircle className="w-3.5 h-3.5 flex-shrink-0" />
                          {lookupPhoneError}
                        </p>
                      )}
                    </div>

                    {lookupError && (
                      <div className="bg-rose-50 border border-rose-100 text-rose-600 rounded-xl px-3 py-2 text-xs flex items-start gap-2">
                        <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                        <span>{lookupError}</span>
                      </div>
                    )}

                    <button
                      type="submit"
                      disabled={lookupLoading}
                      className="w-full bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold py-2.5 px-4 rounded-xl transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                    >
                      {lookupLoading ? 'Đang tìm kiếm...' : 'Tra cứu kết quả duyệt'}
                    </button>
                  </form>

                  {lookupResult && (
                    <div className="mt-4 p-4 rounded-2xl border border-indigo-100 bg-indigo-50/40 space-y-3 animate-fadeIn">
                      <h4 className="text-xs font-extrabold text-indigo-950 uppercase tracking-wide">Kết quả tra cứu yêu cầu:</h4>
                      
                      <div className="text-xs text-slate-600 space-y-1">
                        <p>👤 Họ và tên: <strong className="text-slate-800">{lookupResult.name}</strong></p>
                        <p>🏫 Lớp học / Đơn vị: <span className="text-slate-800 font-semibold">{lookupResult.className}</span></p>
                        <p>📅 Ngày gửi: <span className="text-slate-800">{new Date(lookupResult.createdAt).toLocaleDateString('vi-VN')}</span></p>
                        
                        <div className="pt-2 border-t border-indigo-100/60 mt-2">
                          <span className="text-[10px] font-bold text-slate-400 uppercase block mb-1">Trạng thái phê duyệt:</span>
                          {lookupResult.status === 'pending' ? (
                            <div className="inline-flex items-center gap-1.5 bg-amber-100 text-amber-800 border border-amber-200 px-3 py-1.5 rounded-xl font-bold animate-pulse">
                              <AlertCircle className="w-4 h-4 text-amber-600" />
                              Đang chờ Thầy cô / Admin phê duyệt
                            </div>
                          ) : (
                            <div className="space-y-2">
                              <div className="inline-flex items-center gap-1.5 bg-emerald-100 text-emerald-800 border border-emerald-200 px-3 py-1.5 rounded-xl font-bold">
                                <Check className="w-4 h-4 text-emerald-600" />
                                Đã được phê duyệt thành công!
                              </div>
                              <div className="p-3 bg-white border border-emerald-100 rounded-xl mt-2">
                                <p className="text-[10px] text-emerald-700 font-bold uppercase mb-1">Mật khẩu tạm thời của bạn:</p>
                                <div className="flex items-center justify-between gap-2">
                                  <code className="bg-emerald-50 px-2.5 py-1 rounded font-mono text-sm font-black text-emerald-700 select-all">
                                    {lookupResult.tempPassword}
                                  </code>
                                  <button
                                    onClick={() => {
                                      navigator.clipboard.writeText(lookupResult.tempPassword);
                                      setCopied(true);
                                      setTimeout(() => setCopied(false), 2000);
                                    }}
                                    className={`text-[10px] font-bold px-2.5 py-1 rounded-lg transition-all ${
                                      copied 
                                        ? 'bg-emerald-500 text-white' 
                                        : 'text-indigo-600 hover:bg-slate-50'
                                    }`}
                                  >
                                    {copied ? 'Đã sao chép!' : 'Sao chép'}
                                  </button>
                                </div>
                                <p className="text-[10px] text-slate-400 mt-2 italic">
                                  * Hãy sử dụng mật khẩu này để đăng nhập ngay và đổi lại mật khẩu cá nhân mới của bạn trong phần Cấu hình tài khoản.
                                </p>
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}

              </div>

              {/* Fixed Footer Section */}
              <div className="p-4 sm:p-6 border-t border-slate-100 bg-slate-50/50 flex gap-3">
                <button
                  type="button"
                  onClick={() => setShowAdminModal(false)}
                  className="w-full bg-slate-100 hover:bg-slate-200 text-slate-700 text-sm font-bold py-3 px-4 rounded-xl transition-all duration-200 active:scale-[0.98] text-center"
                >
                  Đóng cửa sổ
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}

