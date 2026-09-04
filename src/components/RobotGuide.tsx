import React, { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  X,
  ChevronRight,
  ChevronLeft,
  Sparkles,
  HelpCircle,
  Bot,
  Zap,
  Star,
  Trophy,
  ArrowRight,
  CheckCircle,
  FileText,
  RefreshCw,
  Layers,
  Send,
  MessageSquare,
  Compass,
  User,
  Gift,
  ExternalLink,
} from "lucide-react";
import { User as UserType } from "../types";

interface TourStep {
  tabId: string; // The corresponding tab to activate
  title: string;
  content: string;
  highlightSelector?: string;
  sandboxType: "none" | "flashcard" | "assignment" | "game";
}

interface RobotGuideProps {
  user: UserType | null;
  activeTab?: string;
  onTabChange?: (tab: string) => void;
  onClose?: () => void;
  isOpen?: boolean;
  onOpenChange?: (open: boolean) => void;
}

interface ChatMessage {
  role: "user" | "model";
  text: string;
  time: string;
}

export function RobotGuide({
  user,
  activeTab,
  onTabChange,
  onClose,
  isOpen: controlledIsOpen,
  onOpenChange,
}: RobotGuideProps) {
  const [internalIsOpen, setInternalIsOpen] = useState(false);
  const isOpen = controlledIsOpen !== undefined ? controlledIsOpen : internalIsOpen;
  
  const setIsOpen = (val: boolean | ((prev: boolean) => boolean)) => {
    const nextVal = typeof val === "function" ? val(isOpen) : val;
    if (onOpenChange) {
      onOpenChange(nextVal);
    } else {
      setInternalIsOpen(nextVal);
    }
  };

  const [currentStep, setCurrentStep] = useState(0);
  const [typedText, setTypedText] = useState("");
  const [isSpeaking, setIsSpeaking] = useState(false);
  const isTeacher = user?.role === "teacher" || user?.role === "admin";
  const typingTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Mode: tour (floating companion card)
  const [showSandbox, setShowSandbox] = useState(false);

  // Virtual Sandbox states
  const [virtualPoints, setVirtualPoints] = useState(0);
  const [fcFlipped, setFcFlipped] = useState(false);
  const [fcLearned, setFcLearned] = useState(false);
  const [asnText, setAsnText] = useState("");
  const [asnFileAttached, setAsnFileAttached] = useState(false);
  const [asnStatus, setAsnStatus] = useState<"idle" | "submitting" | "done">("idle");
  const [gameSelectedAns, setGameSelectedAns] = useState<string | null>(null);
  const [gameStatus, setGameStatus] = useState<"playing" | "correct" | "wrong">("playing");

  // Define steps based on role
  const steps: TourStep[] = isTeacher
    ? [
        {
          tabId: "dashboard",
          title: "Chào mừng Thầy/Cô! 👋",
          content:
            "Chào mừng Thầy/Cô đến với nền tảng EduTeach! Em là Robot Lễ Tân kiêm Hướng Dẫn Viên ảo. Hãy cùng em tham gia chuyến tham quan ngắn để làm quen với các công cụ tuyệt vời giúp Thầy/Cô quản lý lớp học dễ dàng hơn nhé!",
          sandboxType: "none",
        },
        {
          tabId: "dashboard",
          title: "Bảng Điều Khiển Học Tập 📊",
          content:
            "Đây là Bảng điều khiển chính. Tại đây, Thầy/Cô có thể bao quát toàn bộ tình hình lớp học: xem sĩ số, theo dõi lịch báo giảng, và nắm bắt nhanh tiến độ nộp bài của học sinh trong ngày.",
          highlightSelector: '[data-tour="dashboard"]',
          sandboxType: "none",
        },
        {
          tabId: "students",
          title: "Quản Lý Học Sinh & Thi Đua 👥",
          content:
            "Tab này là nơi Thầy/Cô quản lý danh sách lớp. Thầy/Cô có thể duyệt học sinh mới, xem bảng xếp hạng thi đua, và trực tiếp cộng điểm thưởng để khích lệ tinh thần học tập của các em.",
          highlightSelector: '[data-tour="students"]',
          sandboxType: "none",
        },
        {
          tabId: "notifications-manager",
          title: "Hòm Thư Yêu Thương ✉️",
          content:
            "Một tính năng vô cùng đặc biệt! Thầy/Cô có thể tự tay thiết kế những bức thư khen 3D sinh động hoặc gửi thông báo biểu dương tự động đến từng học sinh và phụ huynh để tạo động lực.",
          highlightSelector: '[data-tour="notifications-manager"]',
          sandboxType: "none",
        },
        {
          tabId: "flashcards",
          title: "Hệ Thống Flashcard Ảnh 2 Mặt 🗂️",
          content:
            "Công cụ tạo Flashcard giúp Thầy/Cô số hóa bài giảng. Thầy/Cô có thể dễ dàng tạo các thẻ ghi nhớ với hình ảnh sinh động ở cả 2 mặt, thêm từ vựng hàng loạt và tạo ngay các trò chơi lật thẻ ghép cặp thú vị.",
          highlightSelector: '[data-tour="flashcards"]',
          sandboxType: "none",
        },
        {
          tabId: "assignments",
          title: "Kho Bài Tập & Bản Nháp (On Air) 📝",
          content:
            "Khu vực giao bài tập và tài liệu. Với chế độ 'Bản nháp' (On Air), Thầy/Cô có thể soạn bài trước, kiểm tra kỹ lưỡng và chỉ phát hành khi đã sẵn sàng. Thầy/Cô cũng có thể trao đổi trực tiếp 1-1 với học sinh tại đây.",
          highlightSelector: '[data-tour="assignments"]',
          sandboxType: "none",
        },
        {
          tabId: "games",
          title: "Chơi Và Học - Mini Games 🎮",
          content:
            "Khu vực biến kiến thức thành niềm vui! Thầy/Cô chỉ cần nhập câu hỏi, hệ thống sẽ tự động tạo ra các đấu trường kịch tính như 'Kéo co tri thức' giúp học sinh vô cùng hào hứng ôn bài.",
          highlightSelector: '[data-tour="games"]',
          sandboxType: "none",
        },
        {
          tabId: "rewards-store",
          title: "Cửa Hàng Đổi Quà Thưởng 🎁",
          content:
            "Góc khích lệ học tập! Thầy/Cô có thể thiết lập các phần thưởng để học sinh dùng điểm thi đua quy đổi, ví dụ như huy hiệu vinh danh, khung avatar hay các phần quà động viên khác.",
          highlightSelector: '[data-tour="rewards-store"]',
          sandboxType: "none",
        },
        {
          tabId: "schedule",
          title: "Lịch Học & Phòng Trực Tuyến 📅",
          content:
            "Nơi Thầy/Cô lên lịch báo giảng và quản lý thời khóa biểu. Thầy/Cô có thể gắn sẵn đường dẫn Google Meet hoặc Zoom để học sinh tham gia lớp học trực tuyến chỉ với một cú click chuột.",
          highlightSelector: '[data-tour="schedule"]',
          sandboxType: "none",
        },
        {
          tabId: "simulations",
          title: "Phòng Thí Nghiệm Mô Phỏng 🔬",
          content:
            "Không gian thực hành trực quan! Nơi đây cung cấp các công cụ mô phỏng thí nghiệm Vật lý, Hóa học và Lập trình trực tuyến, giúp bài giảng lý thuyết trở nên sinh động và dễ hiểu hơn.",
          highlightSelector: '[data-tour="simulations"]',
          sandboxType: "none",
        },
      ]
    : [
        {
          tabId: "dashboard",
          title: "Chào bạn học sinh thân mến! 🌟",
          content:
            "Chào mừng bạn đến với góc học tập mới! Mình là Robot đồng hành cùng bạn. Mình sẽ dẫn bạn đi thăm quan một vòng để xem chúng ta có thể làm gì để học thật vui và nhận nhiều phần thưởng nhé!",
          sandboxType: "none",
        },
        {
          tabId: "dashboard",
          title: "Góc Học Tập & Xếp Hạng 📊",
          content:
            "Đây là trang chính của bạn. Mỗi ngày vào học, bạn sẽ xem được điểm số hiện tại, thứ hạng thi đua trong lớp và các danh hiệu cá nhân mà mình đã đạt được.",
          highlightSelector: '[data-tour="dashboard"]',
          sandboxType: "none",
        },
        {
          tabId: "rewards-store",
          title: "Cửa Hàng Đổi Quà & Trang Bị 🎁",
          content:
            "Góc được yêu thích nhất! Hãy dùng số Xu ảo bạn kiếm được từ việc học để mua khung Avatar phát sáng, huy hiệu VIP, hoặc mở những Hộp quà may mắn cực ngầu.",
          highlightSelector: '[data-tour="rewards-store"]',
          sandboxType: "none",
        },
        {
          tabId: "flashcards",
          title: "Trải Nghiệm Flashcard Hình Ảnh 🗂️",
          content:
            "Nơi giúp bạn học từ vựng siêu tốc! Bạn có thể lật các thẻ bài để xem hình ảnh và ý nghĩa, hoặc thử thách bản thân với các màn chơi ghép thẻ nhớ nhanh.",
          highlightSelector: '[data-tour="flashcards"]',
          sandboxType: "flashcard",
        },
        {
          tabId: "assignments",
          title: "Làm Bài Tập & Chat Với Giáo Viên 📝",
          content:
            "Mọi bài tập Thầy/Cô giao sẽ xuất hiện ở đây. Bạn có thể nộp bài nhanh chóng và nếu có câu hỏi nào khó, hãy nhắn tin trực tiếp ngay tại bài tập để nhờ Thầy/Cô hướng dẫn thêm nhé.",
          highlightSelector: '[data-tour="assignments"]',
          sandboxType: "assignment",
        },
        {
          tabId: "games",
          title: "Đấu Trí Mini-Game Đầy Kịch Tính 🎮",
          content:
            "Vừa học vừa chơi! Hãy tham gia vào các đấu trường như Kéo co tri thức. Trả lời đúng, bạn sẽ kéo được dây về đội mình và giành lấy Xu thưởng rủng rỉnh.",
          highlightSelector: '[data-tour="games"]',
          sandboxType: "game",
        },
        {
          tabId: "schedule",
          title: "Lịch Học & Phòng Trực Tuyến 📅",
          content:
            "Xem thời khóa biểu để không quên buổi học nào nhé. Bạn chỉ cần bấm 'Vào phòng học' là sẽ được kết nối ngay đến lớp học trực tuyến của Thầy/Cô mà không sợ trễ giờ.",
          highlightSelector: '[data-tour="schedule"]',
          sandboxType: "none",
        },
        {
          tabId: "simulations",
          title: "Phòng Thí Nghiệm Mô Phỏng 🔬",
          content:
            "Biến máy tính thành phòng thí nghiệm thu nhỏ! Bạn có thể tự tay làm các thí nghiệm Vật lý, Hóa học ảo hoặc thử lập trình các khối lệnh siêu thú vị ngay tại đây.",
          highlightSelector: '[data-tour="simulations"]',
          sandboxType: "none",
        },
      ];

  const currentStepData = steps[currentStep] || steps[0];

  // Auto typewriter effect
  useEffect(() => {
    if (!isOpen) return;

    if (typingTimerRef.current) {
      clearInterval(typingTimerRef.current);
    }

    setTypedText("");
    setIsSpeaking(true);

    const normalizedText = currentStepData.content.normalize("NFC");
    const charsArray = Array.from(normalizedText);
    let index = 0;
    let accumulated = "";

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
    }, 12);

    return () => {
      if (typingTimerRef.current) {
        clearInterval(typingTimerRef.current);
      }
    };
  }, [currentStep, isOpen, currentStepData.content]);

  // Synchronize Tab Switching directly in background on Step Navigation
  useEffect(() => {
    if (isOpen && currentStepData.tabId && onTabChange) {
      onTabChange(currentStepData.tabId);
    }
  }, [currentStep, isOpen, currentStepData.tabId]);

  // Handle element highlight
  useEffect(() => {
    if (!isOpen || !currentStepData.highlightSelector) return;

    const el = document.querySelector(
      currentStepData.highlightSelector
    ) as HTMLElement;
    if (el) {
      el.scrollIntoView({ behavior: "smooth", block: "center" });
      el.classList.add(
        "ring-4",
        "ring-indigo-600",
        "ring-offset-2",
        "scale-[1.01]",
        "transition-all",
        "duration-500",
        "z-30"
      );

      return () => {
        el.classList.remove(
          "ring-4",
          "ring-indigo-600",
          "ring-offset-2",
          "scale-[1.01]",
          "z-30"
        );
      };
    }
  }, [currentStep, isOpen, currentStepData.highlightSelector]);

  const handleCloseGuide = () => {
    setIsOpen(false);
    if (user?.id) {
      localStorage.setItem(`robotGuideDismissed_${user.id}`, 'true');
      sessionStorage.setItem(`robotGuideDismissed_${user.id}`, 'true');
    }
    if (onClose) onClose();
  };

  const handleNext = () => {
    if (currentStep < steps.length - 1) {
      setCurrentStep((prev) => prev + 1);
      setShowSandbox(false);
    } else {
      handleCloseGuide();
      setCurrentStep(0);
    }
  };

  const handleBack = () => {
    if (currentStep > 0) {
      setCurrentStep((prev) => prev - 1);
      setShowSandbox(false);
    }
  };

  // Sandbox handlers
  const handleFlippedCard = () => {
    setFcFlipped(!fcFlipped);
  };

  const handleLearnCard = () => {
    if (!fcLearned) {
      setFcLearned(true);
      setVirtualPoints((prev) => prev + 15);
    }
  };

  const handleAsnSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!asnText.trim()) return;
    setAsnStatus("submitting");
    setTimeout(() => {
      setAsnStatus("done");
      setVirtualPoints((prev) => prev + 20);
    }, 1200);
  };

  const handleAttachMockFile = () => {
    setAsnFileAttached(true);
  };

  const handleGameAnswer = (choice: string) => {
    setGameSelectedAns(choice);
    if (choice === "Sao Thuỷ") {
      setGameStatus("correct");
      setVirtualPoints((prev) => prev + 30);
    } else {
      setGameStatus("wrong");
    }
  };

  const resetGame = () => {
    setGameSelectedAns(null);
    setGameStatus("playing");
  };

  // SVG Robot Component (White eyes)
  const renderRobotSvg = (size = "small") => {
    const w = size === "small" ? 44 : 65;
    const h = size === "small" ? 56 : 84;
    return (
      <svg
        width={w}
        height={h}
        viewBox="0 0 692 945.1"
        xmlns="http://www.w3.org/2000/svg"
        className="drop-shadow-md select-none pointer-events-none"
        style={{ animation: "robot-float 3.5s ease-in-out infinite" }}
      >
        <defs>
          <radialGradient
            id="robot-shadow-grad-dock"
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
        <g style={{ isolation: "isolate" }}>
          <ellipse
            fill="url(#robot-shadow-grad-dock)"
            style={{ mixBlendMode: "multiply" }}
            cx="346"
            cy="880.7"
            rx="346"
            ry="64.5"
          />
          <path
            id="robot-arm-left"
            fill="#4f46e5"
            d="M422.6,548.8s133.5-95.1,204.8-86.1c71.3,9-133.7,210.3-175.8,193.8"
            style={{
              transformOrigin: "422px 548px",
              animation: isSpeaking
                ? "robot-arm-wave 1s ease-in-out infinite"
                : "robot-arm-idle 3s ease-in-out infinite",
            }}
          />
          <path
            id="robot-arm-right"
            fill="#4f46e5"
            d="M194.1,659.2s-123.2-108-130.9-179.5c-7.6-71.5,235.4,81.7,229,126.5"
            style={{
              transformOrigin: "194px 659px",
              animation: "robot-arm-idle-right 4s ease-in-out infinite",
            }}
          />
          <path
            fill="#e0e7ff"
            d="M347,475.8h0c81.4,0,147.4,66,147.4,147.4v50.1c0,81.4-66,147.4-147.4,147.4h0c-81.4,0-147.4-66-147.4-147.4v-50.1c0-81.4,66-147.4,147.4-147.4Z"
          />
          <path
            fill="#312e81"
            d="M347,549.2h0c46.7,0,84.6,37.9,84.6,84.6v28.7c0,46.7-37.9,84.6-84.6,84.6h0c-46.7,0-84.6-37.9-84.6-84.6v-28.7c0-46.7,37.9-84.6,84.6-84.6Z"
          />
          <polygon fill="#1e1b4b" points="395.2 204.3 318.2 200.9 339.8 38.5 373.2 40 395.2 204.3" />
          <path
            fill="#1e1b4b"
            d="M536.4,465.9h0c-29.5-1.3-52.4-26.3-51.1-55.8l2.5-56.3c1.3-29.5,26.3-52.4,55.8-51.1h0c29.5,1.3,52.4,26.3,51.1,55.8l-2.5,56.3c-1.3,29.5-26.3,52.4-55.8,51.1h0Z"
          />
          <path
            fill="#1e1b4b"
            d="M154.7,449.1h0c-29.5-1.3-52.4-26.3-51.1-55.8l2.5-56.3c1.3-29.5,26.3-52.4,55.8-51.1h0c29.5,1.3,52.4,26.3,51.1,55.8l-2.5,56.3c-1.3,29.5-26.3,52.4-55.8,51.1h0Z"
          />
          <path
            fill="#ffffff"
            d="M559.3,383.4c-4.8,109-100.6,143.6-216.7,138.5-116.1-5.1-208.5-48.1-203.7-157,4.8-109,102.8-193.1,218.9-188,116.1,5.1,206.3,97.6,201.5,206.5h0Z"
          />
          <path
            fill="#1e1b4b"
            d="M470.6,369c-2.8,62.7-57.9,82.7-124.8,79.7-66.8-2.9-120-27.7-117.3-90.4s59.2-111.2,126-108.2c66.8,2.9,118.8,56.2,116,118.9Z"
          />
          {/* WHITE EYES */}
          <circle fill="#ffffff" className="animate-pulse" cx="299" cy="343.7" r="24" />
          <circle fill="#ffffff" className="animate-pulse" cx="416.1" cy="348.9" r="24" />
          <path
            id="robot-mouth"
            fill="#ffffff"
            d="M352.3,424.4c22,1,40.5-16,41.5-38l-79.5-3.5c-1,22,16,40.5,38,41.5h0Z"
            style={{
              transformOrigin: "352px 424px",
              animation: isSpeaking ? "robot-mouth-speak 0.12s ease-in-out infinite" : "none",
            }}
          />
          <circle fill="#6366f1" cx="363" cy="58.7" r="58.7" />
          <circle fill="#1e1b4b" cx="363" cy="58.7" r="27.2" />
        </g>
      </svg>
    );
  };

  return (
    <>
      <AnimatePresence>
        {/* WHEN ROBOT IS OPEN: FLOATING IN-TAB COMPANION CARD */}
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 30, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            transition={{ type: "spring", stiffness: 300, damping: 25 }}
            className="fixed bottom-[72px] left-3 right-3 sm:left-auto sm:right-6 sm:bottom-6 z-50 w-auto sm:w-[420px] max-w-lg bg-white/95 backdrop-blur-xl border-2 border-indigo-200 shadow-2xl rounded-3xl p-4 sm:p-5 pointer-events-auto"
          >
            {/* Header: Title, Step badge, Mode toggle & Close */}
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 gap-2">
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="shrink-0">{renderRobotSvg("small")}</div>
                <div className="min-w-0">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span className="text-[9px] uppercase font-black tracking-wider text-indigo-700 bg-indigo-50 border border-indigo-200 px-2 py-0.5 rounded-md">
                      BƯỚC {currentStep + 1}/{steps.length}
                    </span>
                    <span className="text-[10px] text-slate-400 font-bold truncate">
                      Tab: {currentStepData.tabId}
                    </span>
                  </div>
                  <h4 className="font-extrabold text-slate-800 text-xs sm:text-sm truncate mt-0.5">
                    {currentStepData.title}
                  </h4>
                </div>
              </div>

              {/* Action buttons */}
              <div className="flex items-center gap-1 shrink-0">
                <button
                  onClick={handleCloseGuide}
                  className="w-9 h-9 bg-slate-100 hover:bg-slate-200 text-slate-500 rounded-full flex items-center justify-center transition-all min-h-[44px] min-w-[44px] cursor-pointer"
                  title="Đóng hướng dẫn"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Typewriter Explanation Text Box */}
            <div className="py-3">
              <div className="bg-slate-50 p-3.5 rounded-2xl border border-slate-100 text-xs text-slate-700 leading-relaxed font-semibold min-h-[64px] max-h-[140px] overflow-y-auto custom-scrollbar">
                {typedText}
              </div>
            </div>

            {/* Interactive Sandbox Toggle if available */}
            {currentStepData.sandboxType !== "none" && (
              <div className="mb-3">
                <button
                  onClick={() => setShowSandbox(!showSandbox)}
                  className="w-full py-2 bg-amber-50 hover:bg-amber-100 border border-amber-200 text-amber-800 rounded-xl text-xs font-black transition-all flex items-center justify-center gap-1.5 min-h-[44px] cursor-pointer"
                >
                  <Sparkles className="w-3.5 h-3.5 text-amber-600" />
                  <span>{showSandbox ? "Ẩn khung trải nghiệm ảo" : "Mở khung trải nghiệm ảo (+Xu ảo)"}</span>
                </button>

                {showSandbox && (
                  <div className="mt-2.5 p-3.5 bg-indigo-50/70 border border-indigo-100 rounded-2xl space-y-2">
                    {currentStepData.sandboxType === "flashcard" && (
                      <div className="space-y-2 text-center">
                        <p className="text-[11px] text-slate-600 font-bold">Lật thẻ để học định nghĩa:</p>
                        <div
                          onClick={handleFlippedCard}
                          className="bg-white border-2 border-indigo-200 rounded-xl p-3 text-center cursor-pointer shadow-sm hover:border-indigo-400 transition-all"
                        >
                          {!fcFlipped ? (
                            <p className="font-black text-slate-800 text-xs">Photosynthesis (Quang hợp)</p>
                          ) : (
                            <p className="text-[11px] text-indigo-700 font-bold">Cây xanh tổng hợp dinh dưỡng & nhả O₂</p>
                          )}
                        </div>
                        <button
                          onClick={handleLearnCard}
                          disabled={fcLearned}
                          className="w-full py-2 bg-indigo-600 text-white rounded-xl text-xs font-bold disabled:bg-emerald-600 min-h-[44px]"
                        >
                          {fcLearned ? "✓ Đã học xong (+15 Xu)" : "Học xong thẻ này"}
                        </button>
                      </div>
                    )}

                    {currentStepData.sandboxType === "assignment" && (
                      <div className="space-y-2">
                        <p className="text-[11px] text-slate-600 font-bold">Thử nộp bài tập ảo:</p>
                        <form onSubmit={handleAsnSubmit} className="space-y-2">
                          <input
                            type="text"
                            placeholder="Nhập câu trả lời..."
                            value={asnText}
                            onChange={(e) => setAsnText(e.target.value)}
                            disabled={asnStatus === "done"}
                            className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl outline-none bg-white font-mono"
                          />
                          <button
                            type="submit"
                            disabled={asnStatus !== "idle" || !asnText.trim()}
                            className="w-full py-2 bg-rose-600 text-white rounded-xl text-xs font-bold disabled:opacity-50 min-h-[44px]"
                          >
                            {asnStatus === "submitting" ? "Đang gửi..." : asnStatus === "done" ? "✓ Đã nộp thành công (+20 Xu)" : "Nộp bài thử"}
                          </button>
                        </form>
                      </div>
                    )}

                    {currentStepData.sandboxType === "game" && (
                      <div className="space-y-2 text-center">
                        <p className="text-[11px] text-slate-600 font-bold">Kéo co: Hành tinh nào gần Mặt trời nhất?</p>
                        <div className="grid grid-cols-3 gap-1">
                          {["Sao Hoả", "Sao Kim", "Sao Thuỷ"].map((choice) => (
                            <button
                              key={choice}
                              onClick={() => handleGameAnswer(choice)}
                              disabled={gameStatus !== "playing"}
                              className={`py-2 rounded-xl text-[10px] font-bold border ${
                                gameSelectedAns === choice
                                  ? choice === "Sao Thuỷ"
                                    ? "bg-emerald-500 text-white"
                                    : "bg-rose-500 text-white"
                                  : "bg-white text-slate-700"
                              } min-h-[44px]`}
                            >
                              {choice}
                            </button>
                          ))}
                        </div>
                        {gameStatus === "correct" && (
                          <p className="text-[10px] text-emerald-600 font-black">🎉 Bạn đã thắng! +30 Xu!</p>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* Step Progress Dots */}
            <div className="flex items-center justify-between pt-1 pb-2">
              <div className="flex gap-1.5 items-center">
                {steps.map((_, i) => (
                  <button
                    key={i}
                    onClick={() => setCurrentStep(i)}
                    className={`h-1.5 rounded-full transition-all duration-300 ${
                      i === currentStep ? "w-5 bg-indigo-600" : "w-1.5 bg-slate-200 hover:bg-slate-300"
                    }`}
                    title={`Chuyển tới bước ${i + 1}`}
                  />
                ))}
              </div>

              {onTabChange && currentStepData.tabId && (
                <button
                  onClick={() => onTabChange(currentStepData.tabId)}
                  className="text-[10px] font-extrabold text-indigo-600 hover:underline flex items-center gap-1"
                >
                  <span>Mở Tab này</span>
                  <ExternalLink className="w-3 h-3" />
                </button>
              )}
            </div>

            {/* Bottom Controls: Back & Next */}
            <div className="flex items-center justify-between gap-2 pt-2 border-t border-slate-100">
              <button
                onClick={handleBack}
                disabled={currentStep === 0}
                className="flex-1 py-2.5 px-3 border border-slate-200 hover:bg-slate-50 text-slate-600 disabled:opacity-40 rounded-xl font-extrabold text-xs transition-all flex items-center justify-center gap-1 min-h-[44px] cursor-pointer"
              >
                <ChevronLeft className="w-4 h-4" />
                <span>Quay lại</span>
              </button>

              <button
                onClick={handleNext}
                className="flex-1 py-2.5 px-4 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-extrabold text-xs transition-all shadow-md shadow-indigo-100 flex items-center justify-center gap-1 min-h-[44px] cursor-pointer"
              >
                <span>{currentStep === steps.length - 1 ? "Hoàn thành 🎉" : "Tiếp tục"}</span>
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Embedded Animations */}
      <style>{`
        @keyframes robot-float {
          0%, 100% { transform: translateY(0px) rotate(0deg); }
          50% { transform: translateY(-5px) rotate(1deg); }
        }
        @keyframes robot-arm-wave {
          0%, 100% { transform: rotate(0deg); }
          50% { transform: rotate(25deg); }
        }
        @keyframes robot-arm-idle {
          0%, 100% { transform: rotate(0deg); }
          50% { transform: rotate(-4deg); }
        }
        @keyframes robot-arm-idle-right {
          0%, 100% { transform: rotate(0deg); }
          50% { transform: rotate(4deg); }
        }
        @keyframes robot-mouth-speak {
          0%, 100% { transform: scaleY(1); }
          50% { transform: scaleY(0.4) translateY(2.5px); }
        }
      `}</style>
    </>
  );
}
