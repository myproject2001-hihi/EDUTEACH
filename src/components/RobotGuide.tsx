import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, ChevronRight, ChevronLeft, Sparkles, HelpCircle, Bot, Zap, Star, Trophy, ArrowRight, CheckCircle, FileText, RefreshCw, Layers } from 'lucide-react';
import { User } from '../types';

interface TourStep {
  tabId: string; // The corresponding tab to activate
  title: string;
  content: string;
  highlightSelector?: string;
  sandboxType: 'none' | 'flashcard' | 'assignment' | 'game';
}

interface RobotGuideProps {
  user: User | null;
  activeTab?: string;
  onTabChange?: (tab: string) => void;
  onClose?: () => void;
  isOpen?: boolean;
  onOpenChange?: (open: boolean) => void;
}

export function RobotGuide({ user, activeTab, onTabChange, onClose, isOpen: controlledIsOpen, onOpenChange }: RobotGuideProps) {
  const [internalIsOpen, setInternalIsOpen] = useState(false);
  const isOpen = controlledIsOpen !== undefined ? controlledIsOpen : internalIsOpen;
  const setIsOpen = (val: boolean | ((prev: boolean) => boolean)) => {
    const nextVal = typeof val === 'function' ? val(isOpen) : val;
    if (onOpenChange) {
      onOpenChange(nextVal);
    } else {
      setInternalIsOpen(nextVal);
    }
  };
  const [currentStep, setCurrentStep] = useState(0);
  const [typedText, setTypedText] = useState('');
  const [isSpeaking, setIsSpeaking] = useState(false);
  const isTeacher = user?.role === 'teacher' || user?.role === 'admin';
  const typingTimerRef = useRef<NodeJS.Timeout | null>(null);

  // --- VIRTUAL SANDBOX STATES ---
  const [virtualPoints, setVirtualPoints] = useState(0);
  
  // Flashcard states
  const [fcFlipped, setFcFlipped] = useState(false);
  const [fcLearned, setFcLearned] = useState(false);

  // Assignment states
  const [asnText, setAsnText] = useState('');
  const [asnFileAttached, setAsnFileAttached] = useState(false);
  const [asnStatus, setAsnStatus] = useState<'idle' | 'submitting' | 'done'>('idle');

  // Game states
  const [gameSelectedAns, setGameSelectedAns] = useState<string | null>(null);
  const [gameStatus, setGameStatus] = useState<'playing' | 'correct' | 'wrong'>('playing');

  // Define steps based on role
  const steps: TourStep[] = isTeacher
    ? [
        {
          tabId: 'dashboard',
          title: 'Xin chào Thầy/Cô! 👋',
          content: 'Em là Robot Hướng Dẫn viên. Hôm nay em rất vinh dự được đồng hành cùng Thầy/Cô khám phá hệ thống dạy học tương tác thông minh này nhé!',
          sandboxType: 'none',
        },
        {
          tabId: 'dashboard',
          title: 'Bảng Điều Khiển Học Tập 📊',
          content: 'Đây là trung tâm điều hành chính! Thầy/Cô có thể theo dõi tổng quan số học sinh trực tuyến, thông báo hệ thống, lịch nhắc nhở lớp học, trạng thái nộp bài của học sinh và cập nhật lịch sử hoạt động thời gian thực.',
          highlightSelector: '[data-tour="dashboard"]',
          sandboxType: 'none',
        },
        {
          tabId: 'students',
          title: 'Quản Lý Học Sinh & Thi Đua 👥',
          content: 'Tại mục Học sinh, Thầy/Cô quản lý danh sách học viên của các lớp, duyệt tài khoản học sinh đăng ký, xem xếp hạng học tập thi đua, tiến trình hoàn thành bài và điều chỉnh trực tiếp điểm số tích lũy cho các em.',
          highlightSelector: '[data-tour="students"]',
          sandboxType: 'none',
        },
        {
          tabId: 'notifications-manager',
          title: 'Hòm Thư Yêu Thương & Thông Báo ✉️',
          content: 'Đây là tính năng độc quyền đầy tính nhân văn! Thầy/Cô có thể soạn thảo tin tức chung, hoặc gửi phong bì viết tay 3D chuyển động bồng bềnh lấp lánh chứa thông điệp yêu thương, khen thưởng đến từng học sinh.',
          highlightSelector: '[data-tour="notifications-manager"]',
          sandboxType: 'none',
        },
        {
          tabId: 'flashcards',
          title: 'Hệ Thống Thẻ Ghi Nhớ Flashcard 🗂️',
          content: 'Thầy/Cô có thể thiết kế các bộ thẻ ghi nhớ thông minh, lưu định nghĩa học tập, công thức toán lý hóa, hỗ trợ học sinh tự học ôn tập từ vựng chủ động, ghi nhớ bài cực lâu.',
          highlightSelector: '[data-tour="flashcards"]',
          sandboxType: 'none',
        },
        {
          tabId: 'assignments',
          title: 'Kho Bài Tập & Đề Thi Sinh Động 📝',
          content: 'Mục Bài tập là nơi Thầy/Cô giao bài tự luận, trắc nghiệm tự động chấm điểm, hay tải tài liệu học tập PDF/hình ảnh. Hệ thống tự động theo dõi danh sách học sinh chưa nộp bài.',
          highlightSelector: '[data-tour="assignments"]',
          sandboxType: 'none',
        },
        {
          tabId: 'games',
          title: 'Chơi Và Học - Tương Tác Hai Chiều 🎮',
          content: 'Tích hợp các mini-game giáo dục lôi cuốn như Kéo co tri thức, Đuổi hình bắt chữ... Thầy/Cô chỉ cần biên soạn câu hỏi, hệ thống sẽ tự động chuyển hóa thành các trò chơi kịch tính kích thích thi đua.',
          highlightSelector: '[data-tour="games"]',
          sandboxType: 'none',
        },
        {
          tabId: 'schedule',
          title: 'Lịch Học & Phòng Học Trực Tuyến 📅',
          content: 'Giúp Thầy/Cô dễ dàng quản lý lịch dạy, đính kèm đường dẫn Google Meet / Zoom để học sinh click tham gia trực tuyến chỉ bằng một nút bấm duy nhất trên giao diện.',
          highlightSelector: '[data-tour="schedule"]',
          sandboxType: 'none',
        },
        {
          tabId: 'simulations',
          title: 'Phòng Thí Nghiệm & Mô Phỏng Virtual 🔬',
          content: 'Cuối cùng là Phòng mô phỏng thí nghiệm vật lý, hóa học, lập trình kéo thả trực quan. Giúp bài học lý thuyết khô khan trở nên trực quan sinh động hơn bao giờ hết!',
          highlightSelector: '[data-tour="simulations"]',
          sandboxType: 'none',
        }
      ]
    : [
        {
          tabId: 'dashboard',
          title: 'Chào bạn học sinh thân mến! 🌟',
          content: 'Mình là Robot đồng hành cùng bạn. Hãy cùng dạo một vòng để khám phá cách học tập vui vẻ, nộp bài xuất sắc và rinh thật nhiều quà xu thưởng nhé!',
          sandboxType: 'none',
        },
        {
          tabId: 'dashboard',
          title: 'Góc Học Tập Đa Sắc Màu 📊',
          content: 'Đây là Trang chủ của bạn. Bạn sẽ theo dõi được số bài tập cần làm, lịch nhắc nhở hôm nay, thứ hạng thi đua trong lớp và tổng số xu tích lũy được từ hoạt động học tập!',
          highlightSelector: '[data-tour="dashboard"]',
          sandboxType: 'none',
        },
        {
          tabId: 'flashcards',
          title: 'Trải Nghiệm Flashcard Thần Kỳ 🗂️',
          content: 'Mục Flashcard giúp bạn ghi nhớ từ vựng, công thức siêu tốc. Hãy tương tác thử với chiếc thẻ Flashcard mô phỏng ở khung bên phải để xem cách học và nhận xu thưởng nhé!',
          highlightSelector: '[data-tour="flashcards"]',
          sandboxType: 'flashcard',
        },
        {
          tabId: 'assignments',
          title: 'Làm Bài Tập & Gửi Nộp Bài 📝',
          content: 'Nơi hiển thị các nhiệm vụ thầy cô giao. Bạn có thể tự viết câu trả lời, đính kèm hình ảnh chụp vở. Hãy thử soạn câu trả lời và click "Nộp bài thử nghiệm" ở khung ảo bên phải nhé!',
          highlightSelector: '[data-tour="assignments"]',
          sandboxType: 'assignment',
        },
        {
          tabId: 'games',
          title: 'Đấu Trí Mini-Game Đầy Kịch Tính 🎮',
          content: 'Học mà chơi cực vui! Vừa chơi kéo co, vừa trả lời câu hỏi ôn bài để chiến thắng bạn bè. Hãy thử giải câu hỏi kéo co ảo ở khung bên phải để xem cách rinh điểm thi đua nhé!',
          highlightSelector: '[data-tour="games"]',
          sandboxType: 'game',
        },
        {
          tabId: 'schedule',
          title: 'Lịch Học & Phòng Trực Tuyến 📅',
          content: 'Xem toàn bộ lịch học, lịch thi và click "Tham gia phòng học" Zoom/Meet của thầy cô chỉ với một cái chạm màn hình, không lo quên giờ học!',
          highlightSelector: '[data-tour="schedule"]',
          sandboxType: 'none',
        },
        {
          tabId: 'simulations',
          title: 'Phòng Thí Nghiệm Mô Phỏng 🔬',
          content: 'Khám phá thế giới khoa học sinh động qua các bài thực hành ảo, lắp ráp linh kiện mạch điện hay lập trình kéo thả đầy mê hoặc!',
          highlightSelector: '[data-tour="simulations"]',
          sandboxType: 'none',
        }
      ];

  const currentStepData = steps[currentStep];

  // Auto typewriter effect & mouth nhép coordination
  useEffect(() => {
    if (!isOpen) return;
    
    // Clear any active typing timer
    if (typingTimerRef.current) {
      clearInterval(typingTimerRef.current);
    }

    setTypedText('');
    setIsSpeaking(true);
    
    // Normalize and convert string to an array of characters
    const normalizedText = currentStepData.content.normalize('NFC');
    const charsArray = Array.from(normalizedText);
    let index = 0;
    let accumulated = '';

    typingTimerRef.current = setInterval(() => {
      if (index < charsArray.length) {
        accumulated += charsArray[index];
        setTypedText(accumulated);
        index++;
      } else {
        if (typingTimerRef.current) {
          clearInterval(typingTimerRef.current);
        }
        setIsSpeaking(false);
      }
    }, 15); // Fast and smooth typing speed

    return () => {
      if (typingTimerRef.current) {
        clearInterval(typingTimerRef.current);
      }
    };
  }, [currentStep, isOpen]);

  // Synchronize Tab Switching on Step Navigation
  useEffect(() => {
    if (isOpen && currentStepData.tabId && onTabChange) {
      // Trigger navigation on app backend to match current robot explanation
      onTabChange(currentStepData.tabId);
    }
  }, [currentStep, isOpen, currentStepData.tabId]);

  // Handle locating the elements & flashing highlight effect
  useEffect(() => {
    if (!isOpen || !currentStepData.highlightSelector) return;

    const el = document.querySelector(currentStepData.highlightSelector) as HTMLElement;
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'center' });
      el.classList.add('ring-4', 'ring-indigo-600', 'ring-offset-2', 'scale-[1.01]', 'transition-all', 'duration-500', 'z-30');
      
      return () => {
        el.classList.remove('ring-4', 'ring-indigo-600', 'ring-offset-2', 'scale-[1.01]', 'z-30');
      };
    }
  }, [currentStep, isOpen, currentStepData.highlightSelector]);

  const handleNext = () => {
    if (currentStep < steps.length - 1) {
      setCurrentStep((prev) => prev + 1);
    } else {
      setIsOpen(false);
      setCurrentStep(0);
      if (onClose) onClose();
    }
  };

  const handleBack = () => {
    if (currentStep > 0) {
      setCurrentStep((prev) => prev - 1);
    }
  };

  const handleTriggerTour = () => {
    setIsOpen(true);
    setCurrentStep(0);
    // Reset sandbox
    setVirtualPoints(0);
    setFcFlipped(false);
    setFcLearned(false);
    setAsnText('');
    setAsnFileAttached(false);
    setAsnStatus('idle');
    setGameSelectedAns(null);
    setGameStatus('playing');
  };

  // --- Virtual Sandbox handlers ---
  const handleFlippedCard = () => {
    setFcFlipped(!fcFlipped);
  };

  const handleLearnCard = () => {
    if (!fcLearned) {
      setFcLearned(true);
      setVirtualPoints(prev => prev + 15);
    }
  };

  const handleAttachMockFile = () => {
    setAsnFileAttached(true);
  };

  const handleAsnSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!asnText.trim()) return;

    setAsnStatus('submitting');
    setTimeout(() => {
      setAsnStatus('done');
      setVirtualPoints(prev => prev + 20);
    }, 1200);
  };

  const handleGameAnswer = (ans: string) => {
    setGameSelectedAns(ans);
    if (ans === 'Sao Thuỷ') {
      setGameStatus('correct');
      setVirtualPoints(prev => prev + 30);
    } else {
      setGameStatus('wrong');
    }
  };

  const resetGame = () => {
    setGameSelectedAns(null);
    setGameStatus('playing');
  };

  return (
    <>
      {/* Main Guided Tour Assistant Overlays */}
      <AnimatePresence>
        {isOpen && (
          /* Responsive container with backdrop blur on mobile for clarity, side dock on desktop/TV */
          <div className="fixed inset-0 z-50 pointer-events-none flex items-center md:items-center justify-center md:justify-end p-2 sm:p-4 md:p-8 bg-black/20 md:bg-transparent overflow-y-auto">
            
            {/* Horizontal Flex container: Robot Guide panel & Virtual Sandbox (attached side-by-side) */}
            <div className="flex flex-col xl:flex-row items-stretch justify-center gap-4 sm:gap-5 w-full max-w-sm sm:max-w-md xl:max-w-4xl max-h-[90vh] overflow-y-auto custom-scrollbar pointer-events-none my-auto">
              
              {/* PANEL 1: THE ROBOT GUIDE */}
              <motion.div
                initial={{ opacity: 0, scale: 0.9, y: 40 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.9, y: 40 }}
                className="bg-white border border-slate-200 shadow-[0_25px_60px_rgba(0,0,0,0.18)] rounded-3xl w-full xl:max-w-md overflow-hidden flex flex-col sm:flex-row items-stretch p-4 sm:p-6 gap-4 sm:gap-5 pointer-events-auto bg-gradient-to-b from-white to-slate-50 relative"
              >
                {/* Close Button */}
                <button
                  onClick={() => setIsOpen(false)}
                  className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 p-2 rounded-full hover:bg-slate-100 transition-colors z-20"
                >
                  <X className="w-4 h-4" />
                </button>

                {/* Left side column: Waving SVG Robot */}
                <div className="flex flex-col items-center justify-between select-none shrink-0 relative pt-2">
                  <div id="robot-guide" className="relative flex flex-col items-center">
                    <svg 
                      width="100" 
                      height="125" 
                      viewBox="0 0 692 945.1" 
                      xmlns="http://www.w3.org/2000/svg"
                      className="drop-shadow-lg"
                      style={{
                        animation: 'robot-float 3.5s ease-in-out infinite'
                      }}
                    >
                      <defs>
                        <radialGradient 
                          id="robot-shadow-grad-tour" 
                          cx="346" 
                          cy="4808.8" 
                          fx="346" 
                          fy="4808.8"
                          r="346" 
                          gradientTransform="translate(0 1780.8) scale(1 -.2)"
                          gradientUnits="userSpaceOnUse"
                        >
                          <stop offset="0" stopColor="#999" stopOpacity="0.8" />
                          <stop offset="1" stopColor="#fff" stopOpacity="0" />
                        </radialGradient>
                      </defs>
                      <g style={{ isolation: 'isolate' }}>
                        <ellipse fill="url(#robot-shadow-grad-tour)" style={{ mixBlendMode: 'multiply' }} cx="346" cy="880.7" rx="346" ry="64.5" />
                        <path id="robot-arm-left" fill="#282f39" d="M422.6,548.8s133.5-95.1,204.8-86.1c71.3,9-133.7,210.3-175.8,193.8" style={{ transformOrigin: '422px 548px', animation: isSpeaking ? 'robot-arm-wave 1.2s ease-in-out infinite' : 'robot-arm-idle 3s ease-in-out infinite' }} />
                        <path id="robot-arm-right" fill="#282f39" d="M194.1,659.2s-123.2-108-130.9-179.5c-7.6-71.5,235.4,81.7,229,126.5" style={{ transformOrigin: '194px 659px', animation: 'robot-arm-idle-right 4s ease-in-out infinite' }} />
                        <path fill="#fff" d="M347,475.8h0c81.4,0,147.4,66,147.4,147.4v50.1c0,81.4-66,147.4-147.4,147.4h0c-81.4,0-147.4-66-147.4-147.4v-50.1c0-81.4,66-147.4,147.4-147.4Z" />
                        <path fill="#282f39" d="M347,549.2h0c46.7,0,84.6,37.9,84.6,84.6v28.7c0,46.7-37.9,84.6-84.6,84.6h0c-46.7,0-84.6-37.9-84.6-84.6v-28.7c0-46.7,37.9-84.6,84.6-84.6Z" />
                        <polygon fill="#282f39" points="395.2 204.3 318.2 200.9 339.8 38.5 373.2 40 395.2 204.3" />
                        <path fill="#282f39" d="M536.4,465.9h0c-29.5-1.3-52.4-26.3-51.1-55.8l2.5-56.3c1.3-29.5,26.3-52.4,55.8-51.1h0c29.5,1.3,52.4,26.3,51.1,55.8l-2.5,56.3c-1.3,29.5-26.3,52.4-55.8,51.1h0Z" />
                        <path fill="#282f39" d="M154.7,449.1h0c-29.5-1.3-52.4-26.3-51.1-55.8l2.5-56.3c1.3-29.5,26.3-52.4,55.8-51.1h0c29.5,1.3,52.4,26.3,51.1,55.8l-2.5,56.3c-1.3,29.5-26.3,52.4-55.8,51.1h0Z" />
                        <path fill="#fff" d="M559.3,383.4c-4.8,109-100.6,143.6-216.7,138.5-116.1-5.1-208.5-48.1-203.7-157,4.8-109,102.8-193.1,218.9-188,116.1,5.1,206.3,97.6,201.5,206.5h0Z" />
                        <path fill="#282f39" d="M470.6,369c-2.8,62.7-57.9,82.7-124.8,79.7-66.8-2.9-120-27.7-117.3-90.4s59.2-111.2,126-108.2c66.8,2.9,118.8,56.2,116,118.9Z" />
                        <circle fill="#6366f1" className="animate-pulse" cx="299" cy="343.7" r="23.5" />
                        <circle fill="#6366f1" className="animate-pulse" cx="416.1" cy="348.9" r="23.5" />
                        <path id="robot-mouth" fill="#fff" d="M352.3,424.4c22,1,40.5-16,41.5-38l-79.5-3.5c-1,22,16,40.5,38,41.5h0Z" style={{ transformOrigin: '352px 424px', animation: isSpeaking ? 'robot-mouth-speak 0.12s ease-in-out infinite' : 'none' }} />
                        <circle fill="#fff" cx="363" cy="58.7" r="58.7" />
                        <circle fill="#282f39" cx="363" cy="58.7" r="27.2" />
                      </g>
                    </svg>
                  </div>

                  {/* Progress Dot Indicators */}
                  <div className="flex gap-1.5 mt-4 justify-center">
                    {steps.map((_, i) => (
                      <button 
                        key={i} 
                        onClick={() => setCurrentStep(i)}
                        className={`h-1.5 rounded-full transition-all duration-300 ${
                          i === currentStep ? 'w-5 bg-indigo-600' : 'w-1.5 bg-slate-200 hover:bg-slate-300'
                        }`}
                        title={`Bước ${i + 1}`}
                      />
                    ))}
                  </div>
                </div>

                {/* Right side column: Chat Bubble Content */}
                <div className="flex-1 flex flex-col justify-between">
                  <div className="space-y-3">
                    <div className="flex items-center gap-1.5">
                      <span className="text-[9px] uppercase font-black tracking-widest text-indigo-700 bg-indigo-50 border border-indigo-100 px-2 py-0.5 rounded-md">
                        HƯỚNG DẪN • BƯỚC {currentStep + 1}/{steps.length}
                      </span>
                      <Sparkles className="w-3.5 h-3.5 text-amber-500 animate-spin" style={{ animationDuration: '8s' }} />
                    </div>
                    
                    <h4 className="font-black text-slate-900 text-sm sm:text-base leading-tight flex items-center gap-1.5">
                      {currentStepData.title}
                    </h4>
                    
                    <div className="bg-slate-50/50 p-3 rounded-2xl border border-slate-100 min-h-[90px] flex items-start">
                      <p className="text-xs text-slate-600 leading-relaxed font-medium">
                        {typedText}
                      </p>
                    </div>
                  </div>

                  {/* Controls Bar */}
                  <div className="flex items-center justify-between mt-5 pt-3 border-t border-slate-100">
                    <button
                      onClick={handleBack}
                      disabled={currentStep === 0}
                      className="px-3 py-1.5 border border-slate-200 hover:border-slate-300 text-slate-500 hover:text-slate-700 disabled:opacity-45 disabled:hover:border-slate-200 disabled:hover:text-slate-400 rounded-xl transition-all flex items-center justify-center gap-1 text-[11px] font-extrabold"
                    >
                      <ChevronLeft className="w-3.5 h-3.5" />
                      <span>Quay lại</span>
                    </button>

                    <button
                      onClick={handleNext}
                      className="py-1.5 px-4 bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold text-[11px] rounded-xl transition-all shadow-md shadow-indigo-100 hover:shadow-indigo-200 flex items-center gap-1"
                    >
                      <span>{currentStep === steps.length - 1 ? 'Hoàn thành 🎉' : 'Tiếp tục'}</span>
                      <ChevronRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </motion.div>

              {/* PANEL 2: INTEGRATED VIRTUAL PLAYGROUND SANDBOX */}
              {/* Only displays for student roles when a sandboxType is active */}
              {!isTeacher && currentStepData.sandboxType !== 'none' && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.9, x: 40 }}
                  animate={{ opacity: 1, scale: 1, x: 0 }}
                  exit={{ opacity: 0, scale: 0.9, x: 40 }}
                  className="bg-white border border-slate-200/90 shadow-[0_25px_60px_rgba(0,0,0,0.18)] rounded-3xl w-full xl:w-96 p-5 flex flex-col justify-between bg-gradient-to-b from-white to-amber-50/10 pointer-events-auto shrink-0 relative"
                >
                  {/* Decorative badge header */}
                  <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-4">
                    <div className="flex items-center gap-2">
                      <div className="w-7 h-7 rounded-lg bg-amber-500/15 text-amber-600 flex items-center justify-center font-bold text-xs">
                        🎮
                      </div>
                      <div>
                        <span className="text-[10px] font-black text-amber-600 uppercase tracking-widest block">KHU TRẢI NGHIỆM</span>
                        <h5 className="font-extrabold text-slate-800 text-xs">Thực hành ảo thời gian thực</h5>
                      </div>
                    </div>

                    {/* Virtual points counter */}
                    <div className="flex items-center gap-1.5 bg-amber-500/10 border border-amber-500/20 px-2.5 py-1 rounded-full text-xs font-black text-amber-700">
                      <Star className="w-3.5 h-3.5 text-amber-500 fill-amber-500" />
                      <span>{virtualPoints} Xu ảo</span>
                    </div>
                  </div>

                  {/* DYNAMIC SANDBOX RENDERER */}
                  <div className="flex-1 flex flex-col justify-center min-h-[220px]">
                    {/* CASE 1: FLASHCARD SANDBOX */}
                    {currentStepData.sandboxType === 'flashcard' && (
                      <div className="space-y-4 text-center">
                        <p className="text-[11px] text-slate-500 font-bold">Nhấn chiếc thẻ dưới đây để học từ vựng:</p>
                        
                        {/* 3D Flipping Card Container */}
                        <div className="perspective-1000 w-full max-w-[240px] h-32 mx-auto cursor-pointer" onClick={handleFlippedCard}>
                          <div className={`relative w-full h-full transform-style-3d transition-transform duration-500 ${fcFlipped ? 'rotate-y-180' : ''}`}>
                            {/* FRONT SIDE */}
                            <div className="absolute inset-0 backface-hidden bg-white border-2 border-indigo-100 rounded-2xl shadow-sm p-4 flex flex-col items-center justify-center gap-1.5">
                              <Layers className="w-6 h-6 text-indigo-500" />
                              <span className="text-xs text-indigo-700 font-extrabold tracking-wider uppercase">Vocabulary</span>
                              <p className="font-black text-slate-800 text-sm">Photosynthesis</p>
                              <span className="text-[9px] text-slate-400 font-semibold italic">(Click to flip)</span>
                            </div>

                            {/* BACK SIDE */}
                            <div className="absolute inset-0 backface-hidden rotate-y-180 bg-gradient-to-br from-indigo-50 to-blue-50 border-2 border-indigo-200 rounded-2xl p-4 flex flex-col items-center justify-center text-center">
                              <span className="text-[10px] text-indigo-600 font-black tracking-wider uppercase">ĐỊNH NGHĨA</span>
                              <p className="text-[11px] text-slate-700 font-bold mt-1 leading-snug">
                                Quá trình quang hợp: Cây xanh hấp thụ ánh sáng mặt trời tạo oxi & dinh dưỡng.
                              </p>
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center justify-center gap-2 pt-2">
                          <button
                            onClick={handleLearnCard}
                            disabled={fcLearned}
                            className={`px-4 py-2 rounded-xl text-xs font-black transition-all shadow-sm flex items-center gap-1.5 ${
                              fcLearned 
                                ? 'bg-emerald-500 text-white shadow-emerald-100'
                                : 'bg-indigo-600 hover:bg-indigo-700 text-white shadow-indigo-100'
                            }`}
                          >
                            {fcLearned ? <CheckCircle className="w-3.5 h-3.5" /> : <Sparkles className="w-3.5 h-3.5" />}
                            <span>{fcLearned ? 'Đã thuộc lòng bài!' : 'Xác nhận đã thuộc'}</span>
                          </button>

                          {fcLearned && (
                            <button
                              onClick={() => { setFcLearned(false); setFcFlipped(false); }}
                              className="p-2 border border-slate-200 hover:bg-slate-50 rounded-xl transition-colors text-slate-500"
                              title="Học lại"
                            >
                              <RefreshCw className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>

                        {fcLearned && (
                          <p className="text-[10px] text-emerald-600 font-black animate-bounce mt-1">
                            🎉 Chúc mừng! Bạn học thuộc từ vựng mới và nhận +15 Xu thưởng!
                          </p>
                        )}
                      </div>
                    )}

                    {/* CASE 2: ASSIGNMENT SANDBOX */}
                    {currentStepData.sandboxType === 'assignment' && (
                      <div className="space-y-3">
                        <div className="bg-slate-50 p-3 rounded-xl border border-slate-100 space-y-1">
                          <span className="text-[9px] font-black uppercase text-rose-500 bg-rose-50 px-2 py-0.5 rounded-md">
                            BÀI TẬP PHỔ THÔNG
                          </span>
                          <h6 className="text-xs font-black text-slate-800">Cân bằng phương trình: H₂ + O₂ ➔ H₂O</h6>
                          <p className="text-[10px] text-slate-500 font-semibold leading-normal">
                            Điền đáp án chính xác của bạn vào ô bên dưới để hoàn tất nộp bài thử nghiệm:
                          </p>
                        </div>

                        <form onSubmit={handleAsnSubmit} className="space-y-2.5">
                          <textarea
                            required
                            rows={2}
                            placeholder="Nhập câu trả lời của em tại đây (Ví dụ: 2H2 + O2 = 2H2O)"
                            value={asnText}
                            onChange={(e) => setAsnText(e.target.value)}
                            disabled={asnStatus === 'done'}
                            className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500 bg-white disabled:bg-slate-50 disabled:text-slate-500 font-mono"
                          />

                          <div className="flex items-center justify-between gap-2">
                            <button
                              type="button"
                              onClick={handleAttachMockFile}
                              disabled={asnFileAttached || asnStatus === 'done'}
                              className={`px-2.5 py-1.5 rounded-lg border text-[10px] font-bold flex items-center gap-1.5 transition-all ${
                                asnFileAttached 
                                  ? 'bg-emerald-50 border-emerald-200 text-emerald-700' 
                                  : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                              }`}
                            >
                              <FileText className="w-3 h-3" />
                              <span>{asnFileAttached ? 'Đính kèm: vo_ghi.png' : 'Đính kèm ảnh bài vở'}</span>
                            </button>

                            <button
                              type="submit"
                              disabled={asnStatus !== 'idle'}
                              className="px-4 py-1.5 bg-rose-600 hover:bg-rose-700 text-white font-extrabold text-[10px] rounded-xl shadow-md shadow-rose-100 transition-all disabled:opacity-50 flex items-center gap-1"
                            >
                              {asnStatus === 'submitting' ? 'Đang gửi...' : asnStatus === 'done' ? 'Đã nộp!' : 'Gửi bài nộp'}
                            </button>
                          </div>
                        </form>

                        {asnStatus === 'done' && (
                          <div className="p-2.5 bg-emerald-50 border border-emerald-100 rounded-xl space-y-1 mt-1">
                            <p className="text-[10px] text-emerald-800 font-black flex items-center gap-1">
                              <CheckCircle className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                              <span>Nộp bài thành công! +20 Xu</span>
                            </p>
                            <p className="text-[9px] text-slate-500 leading-normal italic">
                              Thầy cô chấm điểm: <span className="font-extrabold text-indigo-700">10/10 điểm! Xuất sắc lắm!</span>
                            </p>
                          </div>
                        )}
                      </div>
                    )}

                    {/* CASE 3: GAME SANDBOX */}
                    {currentStepData.sandboxType === 'game' && (
                      <div className="space-y-3 text-center">
                        <div className="bg-gradient-to-r from-blue-500/10 to-indigo-500/10 p-2.5 rounded-xl border border-indigo-100 space-y-1">
                          <span className="text-[9px] text-indigo-700 font-extrabold uppercase bg-white px-2 py-0.5 rounded shadow-sm">
                            KÉO CO TRI THỨC 🚩
                          </span>
                          <p className="text-[11px] font-black text-slate-800">
                            Hành tinh nào nằm gần Mặt trời nhất?
                          </p>
                        </div>

                        {/* Interactive rope visual simulator based on selection */}
                        <div className="h-10 bg-slate-100 rounded-lg border border-slate-200 flex items-center justify-between px-3 relative overflow-hidden">
                          <span className="text-xs font-bold text-indigo-600">Team Em 🧑‍🎓</span>
                          
                          {/* Simulated rope */}
                          <div className="flex-1 h-1 bg-amber-500 mx-2 relative flex items-center justify-center">
                            {/* Flag marker */}
                            <motion.div 
                              animate={{ 
                                x: gameStatus === 'correct' ? -35 : gameStatus === 'wrong' ? 35 : 0 
                              }}
                              transition={{ type: 'spring', stiffness: 100 }}
                              className="w-3 h-3 bg-rose-600 rotate-45 absolute" 
                            />
                          </div>

                          <span className="text-xs font-bold text-slate-500">Robot Đối Thủ 🤖</span>
                        </div>

                        {/* Answers list */}
                        <div className="grid grid-cols-3 gap-1.5 pt-1">
                          {['Sao Hoả', 'Sao Kim', 'Sao Thuỷ'].map((choice) => {
                            const isSelected = gameSelectedAns === choice;
                            const isCorrect = choice === 'Sao Thuỷ';
                            return (
                              <button
                                key={choice}
                                type="button"
                                disabled={gameStatus !== 'playing'}
                                onClick={() => handleGameAnswer(choice)}
                                className={`p-2 rounded-xl text-[10px] font-extrabold transition-all border text-center ${
                                  isSelected
                                    ? isCorrect 
                                      ? 'bg-emerald-500 border-emerald-500 text-white' 
                                      : 'bg-rose-500 border-rose-500 text-white'
                                    : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                                }`}
                              >
                                {choice}
                              </button>
                            );
                          })}
                        </div>

                        {gameStatus === 'correct' && (
                          <div className="space-y-1.5 mt-2">
                            <p className="text-[10px] text-emerald-600 font-black animate-pulse">
                              🏆 Kéo ngã đối thủ thành công! Trả lời chính xác và nhận +30 Xu!
                            </p>
                            <button onClick={resetGame} className="text-[9px] text-indigo-600 font-bold hover:underline flex items-center justify-center gap-1 mx-auto">
                              <span>Chơi lại vòng mới</span>
                              <ArrowRight className="w-3 h-3" />
                            </button>
                          </div>
                        )}

                        {gameStatus === 'wrong' && (
                          <div className="space-y-1.5 mt-2">
                            <p className="text-[10px] text-rose-600 font-bold">
                              Tiếc quá! Đối thủ đã kéo mạnh hơn rồi. Hãy chọn hành tinh khác nhé!
                            </p>
                            <button onClick={resetGame} className="text-[9px] text-indigo-600 font-bold hover:underline flex items-center justify-center gap-1 mx-auto">
                              <span>Thử lại câu hỏi</span>
                            </button>
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Sandbox footer statistics overlay */}
                  <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-[10px] text-slate-400 font-medium">
                    <span className="flex items-center gap-1">
                      <Zap className="w-3.5 h-3.5 text-amber-500" />
                      Điểm thi đua thi đấu ảo: +150
                    </span>
                    <span className="flex items-center gap-1">
                      <Trophy className="w-3.5 h-3.5 text-indigo-500" />
                      Hạng hôm nay: Top 3 lớp
                    </span>
                  </div>
                </motion.div>
              )}

            </div>
          </div>
        )}
      </AnimatePresence>

      {/* Embedded Styles for Robot & Card animations */}
      <style>{`
        @keyframes robot-float {
          0%, 100% { transform: translateY(0px) rotate(0deg); }
          50% { transform: translateY(-8px) rotate(1deg); }
        }
        @keyframes robot-arm-wave {
          0%, 100% { transform: rotate(0deg); }
          50% { transform: rotate(25deg); }
        }
        @keyframes robot-arm-idle {
          0%, 100% { transform: rotate(0deg); }
          50% { transform: rotate(-5deg); }
        }
        @keyframes robot-arm-idle-right {
          0%, 100% { transform: rotate(0deg); }
          50% { transform: rotate(5deg); }
        }
        @keyframes robot-mouth-speak {
          0%, 100% { transform: scaleY(1); }
          50% { transform: scaleY(0.4) translateY(3px); }
        }
        
        /* 3D Transform Utilities for Flipping Cards */
        .perspective-1000 {
          perspective: 1000px;
        }
        .transform-style-3d {
          transform-style: preserve-3d;
        }
        .backface-hidden {
          backface-visibility: hidden;
        }
        .rotate-y-180 {
          transform: rotateY(180deg);
        }
      `}</style>
    </>
  );
}
