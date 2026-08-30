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

  // --- MODE & MOBILE PORT SUPPORT STATES ---
  const [mode, setMode] = useState<"tour" | "chat">("tour");
  const [mobileActivePanel, setMobileActivePanel] = useState<"robot" | "sandbox">("robot");

  // --- AI RECEPTIONIST CHAT STATES ---
  const [chatHistory, setChatHistory] = useState<ChatMessage[]>([]);
  const [chatInput, setChatInput] = useState("");
  const [isChatLoading, setIsChatLoading] = useState(false);
  const chatEndRef = useRef<HTMLDivElement | null>(null);

  // --- VIRTUAL SANDBOX STATES ---
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
          title: "Xin chào Thầy/Cô! 👋",
          content:
            "Em là Robot Lễ Tân kiêm Hướng Dẫn Viên ảo. Hệ thống vừa cập nhật thêm tính năng Quản lý Phát sóng (On Air), Flashcard ảnh 2 mặt và Liên kết Zalo OA! Hãy cùng em khám phá nhé!",
          sandboxType: "none",
        },
        {
          tabId: "dashboard",
          title: "Bảng Điều Khiển Học Tập 📊",
          content:
            "Đây là trung tâm điều hành chính! Thầy/Cô có thể theo dõi tổng quan số học sinh trực tuyến, thông báo hệ thống, lịch nhắc nhở lớp học, trạng thái nộp bài của học sinh và bật tắt nhanh On Air cho các bài tập.",
          highlightSelector: '[data-tour="dashboard"]',
          sandboxType: "none",
        },
        {
          tabId: "students",
          title: "Quản Lý Học Sinh & Thi Đua 👥",
          content:
            "Tại mục Học sinh, Thầy/Cô quản lý danh sách học viên của các lớp, duyệt tài khoản học sinh đăng ký, xem xếp hạng học tập thi đua, tiến tiến trình hoàn thành bài và điều chỉnh trực tiếp điểm số tích lũy cho các em.",
          highlightSelector: '[data-tour="students"]',
          sandboxType: "none",
        },
        {
          tabId: "notifications-manager",
          title: "Hòm Thư Yêu Thương & Zalo OA ✉️",
          content:
            "Độc quyền đầy nhân văn! Gửi thư khen thưởng viết tay 3D. Hơn nữa, Thầy/Cô có thể kết nối Zalo OA để tự động bắn thông báo điểm số, bài tập mới về ngay Zalo của học sinh hoặc phụ huynh.",
          highlightSelector: '[data-tour="notifications-manager"]',
          sandboxType: "none",
        },
        {
          tabId: "flashcards",
          title: "Hệ Thống Thẻ Ghi Nhớ Flashcard 🗂️",
          content:
            "Đã hỗ trợ chèn Ảnh 2 mặt cực nét! Thầy/Cô có thể Tải ảnh hàng loạt (Batch upload), tự động tạo tên thẻ và gộp nhiều bộ thẻ để sinh bài Quiz/trò chơi Lật thẻ ghép cặp tự động.",
          highlightSelector: '[data-tour="flashcards"]',
          sandboxType: "none",
        },
        {
          tabId: "assignments",
          title: "Kho Bài Tập & Bản Nháp (On Air) 📝",
          content:
            "Soạn bài an toàn hơn với chế độ Bản Nháp (On Air)! Thầy/Cô có thể lưu tạm, kiểm tra trước nội dung rồi mới click Phát Hành. Ngoài ra, học sinh giờ có thể Chat trực tiếp đặt câu hỏi ở mỗi bài tập.",
          highlightSelector: '[data-tour="assignments"]',
          sandboxType: "none",
        },
        {
          tabId: "games",
          title: "Chơi Và Học - Tương Tác Hai Chiều 🎮",
          content:
            "Tích hợp các mini-game giáo dục lôi cuốn như Kéo co tri thức, Đuổi hình bắt chữ... Thầy/Cô chỉ cần biên soạn câu hỏi, hệ thống sẽ tự động chuyển hóa thành các trò chơi kịch tính kích thích thi đua.",
          highlightSelector: '[data-tour="games"]',
          sandboxType: "none",
        },
        {
          tabId: "schedule",
          title: "Lịch Học & Phòng Học Trực Tuyến 📅",
          content:
            "Giúp Thầy/Cô dễ dàng quản lý lịch dạy, đính kèm đường dẫn Google Meet / Zoom để học sinh click tham gia trực tuyến chỉ bằng một nút bấm duy nhất trên giao diện.",
          highlightSelector: '[data-tour="schedule"]',
          sandboxType: "none",
        },
        {
          tabId: "simulations",
          title: "Phòng Thí Nghiệm & Mô Phỏng Virtual 🔬",
          content:
            "Cuối cùng là Phòng mô phỏng thí nghiệm vật lý, hóa học, lập trình kéo thả trực quan. Giúp bài học lý thuyết khô khan trở nên trực quan sinh động hơn bao giờ hết!",
          highlightSelector: '[data-tour="simulations"]',
          sandboxType: "none",
        },
      ]
    : [
        {
          tabId: "dashboard",
          title: "Chào bạn học sinh thân mến! 🌟",
          content:
            "Mình là Robot đồng hành cùng bạn. Hệ thống vừa có vô vàn cập nhật siêu ngầu như Flashcard hình ảnh, trò chơi Lật thẻ và Kết nối Zalo! Cùng dạo một vòng nhé!",
          sandboxType: "none",
        },
        {
          tabId: "dashboard",
          title: "Góc Học Tập & Zalo 📊",
          content:
            "Đây là Trang chủ của bạn. Bạn có thể theo dõi xếp hạng, điểm số. Đừng quên click \"Kết nối Zalo\" để Robot gửi ngay bài tập và điểm số mới về tin nhắn Zalo cho bạn nhé!",
          highlightSelector: '[data-tour="dashboard"]',
          sandboxType: "none",
        },
        {
          tabId: "flashcards",
          title: "Trải Nghiệm Flashcard Hình Ảnh 🗂️",
          content:
            "Flashcard giờ đã có hình ảnh 2 mặt siêu sinh động! Bạn còn có thể kiểm tra kiến thức qua bài Quiz trắc nghiệm và thử tài nhanh tay với trò chơi Lật thẻ ghép cặp. Hãy thử ngay!",
          highlightSelector: '[data-tour="flashcards"]',
          sandboxType: "flashcard",
        },
        {
          tabId: "assignments",
          title: "Làm Bài Tập & Chat Với Giáo Viên 📝",
          content:
            "Nơi hiển thị các nhiệm vụ thầy cô giao. Nếu có câu hỏi khó, bạn có thể bấm nút Chat trực tiếp với Giáo viên ngay trong bài để được giải đáp 1-1. Hãy thử \"Nộp bài\" ở khung ảo nhé!",
          highlightSelector: '[data-tour="assignments"]',
          sandboxType: "assignment",
        },
        {
          tabId: "games",
          title: "Đấu Trí Mini-Game Đầy Kịch Tính 🎮",
          content:
            "Học mà chơi cực vui! Vừa chơi kéo co, vừa trả lời câu hỏi ôn bài để chiến thắng bạn bè. Hãy thử giải câu hỏi kéo co ảo ở khung bên phải để xem cách rinh điểm thi đua nhé!",
          highlightSelector: '[data-tour="games"]',
          sandboxType: "game",
        },
        {
          tabId: "schedule",
          title: "Lịch Học & Phòng Trực Tuyến 📅",
          content:
            "Xem toàn bộ lịch học, lịch thi và click \"Tham gia phòng học\" Zoom/Meet của thầy cô chỉ với một cái chạm màn hình, không lo quên giờ học!",
          highlightSelector: '[data-tour="schedule"]',
          sandboxType: "none",
        },
        {
          tabId: "simulations",
          title: "Phòng Thí Nghiệm Mô Phỏng 🔬",
          content:
            "Khám phá thế giới khoa học sinh động qua các bài thực hành ảo, lắp ráp linh kiện mạch điện hay lập trình kéo thả đầy mê hoặc!",
          highlightSelector: '[data-tour="simulations"]',
          sandboxType: "none",
        },
      ];

  const currentStepData = steps[currentStep];

  // Auto typewriter effect & mouth coordination
  useEffect(() => {
    if (!isOpen || mode !== "tour") return;

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
  }, [currentStep, isOpen, mode, currentStepData.content]);

  // Synchronize Tab Switching on Step Navigation
  useEffect(() => {
    if (isOpen && mode === "tour" && currentStepData.tabId && onTabChange) {
      onTabChange(currentStepData.tabId);
    }
  }, [currentStep, isOpen, mode, currentStepData.tabId]);

  // Handle locating the elements & flashing highlight effect
  useEffect(() => {
    if (!isOpen || mode !== "tour" || !currentStepData.highlightSelector) return;

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
  }, [currentStep, isOpen, mode, currentStepData.highlightSelector]);

  // Initial Chat Welcome Message based on role
  useEffect(() => {
    if (chatHistory.length === 0) {
      const welcomeMsg = isTeacher
        ? "Chào Thầy/Cô! Em là Robot Lễ Tân EduTeach. Thầy/Cô có câu hỏi nào về cách quản lý học viên, liên kết Zalo, bật On Air tài nguyên hay thiết kế Flashcard hình ảnh không ạ? Em rất sẵn lòng giải đáp hóm hỉnh cho Thầy/Cô! 🤖"
        : "Chào bạn học sinh năng động! Mình là Robot đồng hành Lễ Tân. Bạn có muốn biết cách tích lũy xu thi đấu, chơi game Kéo Co ôn bài, hay liên kết Zalo để nhận điểm số tức thì không? Hỏi mình bất kỳ điều gì nhé! 🚀";
      
      setChatHistory([
        {
          role: "model",
          text: welcomeMsg,
          time: new Date().toLocaleTimeString("vi-VN", {
            hour: "2-digit",
            minute: "2-digit",
          }),
        },
      ]);
    }
  }, [isTeacher]);

  // Auto scroll to chat bottom
  useEffect(() => {
    if (chatEndRef.current) {
      chatEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [chatHistory, isChatLoading]);

  const handleNext = () => {
    if (currentStep < steps.length - 1) {
      setCurrentStep((prev) => prev + 1);
      setMobileActivePanel("robot");
    } else {
      setIsOpen(false);
      setCurrentStep(0);
      if (onClose) onClose();
    }
  };

  const handleBack = () => {
    if (currentStep > 0) {
      setCurrentStep((prev) => prev - 1);
      setMobileActivePanel("robot");
    }
  };

  // --- Send AI chat query ---
  const handleSendChat = async (textToSend?: string) => {
    const text = textToSend !== undefined ? textToSend : chatInput;
    if (!text.trim() || isChatLoading) return;

    if (textToSend === undefined) {
      setChatInput("");
    }

    const newMsg: ChatMessage = {
      role: "user",
      text,
      time: new Date().toLocaleTimeString("vi-VN", {
        hour: "2-digit",
        minute: "2-digit",
      }),
    };

    setChatHistory((prev) => [...prev, newMsg]);
    setIsChatLoading(true);
    setIsSpeaking(true);

    try {
      // Map existing messages to correct roles for history formatting
      const historyPayload = chatHistory.map((c) => ({
        role: c.role,
        text: c.text,
      }));

      const res = await fetch("/api/robot/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: text,
          history: historyPayload,
          role: isTeacher ? "teacher" : "student",
        }),
      });

      const data = await res.json();
      const replyText = data.reply || "Xin lỗi bạn, mình vừa bị gián đoạn sóng một xíu. Bạn có thể hỏi lại không?";

      setChatHistory((prev) => [
        ...prev,
        {
          role: "model",
          text: replyText,
          time: new Date().toLocaleTimeString("vi-VN", {
            hour: "2-digit",
            minute: "2-digit",
          }),
        },
      ]);
    } catch (err) {
      console.error("Error communicating with receptionist AI:", err);
      setChatHistory((prev) => [
        ...prev,
        {
          role: "model",
          text: "Hệ thống truyền thông tin đang bận một chút. Đừng lo lắng, Thầy/Cô hãy thử kiểm tra lại kết nối mạng hoặc thử gạt công tắc On Air nhé! 🤖",
          time: new Date().toLocaleTimeString("vi-VN", {
            hour: "2-digit",
            minute: "2-digit",
          }),
        },
      ]);
    } finally {
      setIsChatLoading(false);
      setIsSpeaking(false);
    }
  };

  // Quick Chips for Touch interactions
  const quickChips = isTeacher
    ? [
        "Cách dùng Bản Nháp On Air? 🟢",
        "Liên kết Zalo OA như thế nào? 📱",
        "Tạo Flashcard hình ảnh 2 mặt? 🗂️",
        "Có những Trò chơi học tập gì? 🎮",
      ]
    : [
        "Làm sao nhận được xu ảo? 🏆",
        "Kéo co tri thức chơi ở đâu? 🚩",
        "Liên kết Zalo nhận báo điểm? 📱",
        "Xem Phòng mô phỏng thí nghiệm? 🔬",
      ];

  // --- Virtual Sandbox handlers ---
  const handleFlippedCard = () => {
    setFcFlipped(!fcFlipped);
  };

  const handleLearnCard = () => {
    if (!fcLearned) {
      setFcLearned(true);
      setVirtualPoints((prev) => prev + 15);
    }
  };

  const handleAttachMockFile = () => {
    setAsnFileAttached(true);
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

  const handleGameAnswer = (ans: string) => {
    setGameSelectedAns(ans);
    if (ans === "Sao Thuỷ") {
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

  // Determine whether to show the sandbox on student mode
  const showSandbox = !isTeacher && currentStepData.sandboxType !== "none";

  return (
    <>
      <AnimatePresence>
        {isOpen && (
          /* Dark backdrop blur on mobile for intense readability, side dock placement on large screens */
          <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 md:p-8 bg-slate-900/60 backdrop-blur-sm overflow-y-auto pointer-events-auto">
            {/* Outer Box Layer */}
            <div className="flex flex-col items-stretch w-full max-w-sm sm:max-w-md xl:max-w-5xl bg-slate-100/90 border border-slate-200/80 shadow-[0_32px_64px_rgba(15,23,42,0.22)] rounded-[32px] p-2.5 sm:p-4 gap-4 max-h-[92vh] overflow-hidden my-auto relative">
              {/* Top Header - Controls Close & Mode Switching */}
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 border-b border-slate-200 pb-3">
                <div className="flex items-center gap-2">
                  <div className="w-9 h-9 rounded-xl bg-indigo-600 flex items-center justify-center text-white shadow-md shadow-indigo-100">
                    <Bot className="w-5 h-5 animate-pulse" />
                  </div>
                  <div>
                    <h3 className="font-extrabold text-slate-800 text-sm leading-none flex items-center gap-1.5">
                      Robot Lễ Tân & Hướng Dẫn Viên
                      <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[9px] font-black uppercase tracking-wider bg-indigo-50 border border-indigo-200 text-indigo-700 animate-bounce">
                        New
                      </span>
                    </h3>
                    <p className="text-[10px] text-slate-500 font-bold mt-1">
                      Hệ thống hỗ trợ thông minh đa chức năng
                    </p>
                  </div>
                </div>

                {/* Switch Modes tab list: Tour guide vs AI chatbot receptionist */}
                <div className="flex bg-slate-200/80 p-1 rounded-2xl gap-1 shrink-0 self-stretch sm:self-auto">
                  <button
                    onClick={() => setMode("tour")}
                    className={`flex-1 sm:flex-none px-3 py-1.5 rounded-xl text-xs font-black transition-all flex items-center justify-center gap-1.5 ${
                      mode === "tour"
                        ? "bg-white text-indigo-700 shadow-sm"
                        : "text-slate-500 hover:text-slate-800"
                    }`}
                  >
                    <Compass className="w-3.5 h-3.5" />
                    <span>Hướng Dẫn 🧭</span>
                  </button>
                  <button
                    onClick={() => setMode("chat")}
                    className={`flex-1 sm:flex-none px-3 py-1.5 rounded-xl text-xs font-black transition-all flex items-center justify-center gap-1.5 ${
                      mode === "chat"
                        ? "bg-white text-indigo-700 shadow-sm"
                        : "text-slate-500 hover:text-slate-800"
                    }`}
                  >
                    <MessageSquare className="w-3.5 h-3.5 animate-bounce" />
                    <span>Hỏi Đáp Lễ Tân 💬</span>
                  </button>
                </div>

                {/* Close modal */}
                <button
                  onClick={() => setIsOpen(false)}
                  className="absolute sm:relative top-2.5 right-2.5 sm:top-auto sm:right-auto bg-white hover:bg-slate-50 border border-slate-200 text-slate-400 hover:text-slate-600 p-2 rounded-full shadow-sm transition-all cursor-pointer z-30"
                  style={{ minWidth: "36px", minHeight: "36px" }}
                  title="Đóng bảng robot"
                >
                  <X className="w-4 h-4 mx-auto" />
                </button>
              </div>

              {/* Mobile Only: Tab pills to switch between Robot & Sandbox to avoid stacked crowding */}
              {showSandbox && mode === "tour" && (
                <div className="flex xl:hidden bg-slate-200 p-1 rounded-xl gap-1 shrink-0">
                  <button
                    onClick={() => setMobileActivePanel("robot")}
                    className={`flex-1 py-2 rounded-lg text-xs font-extrabold transition-all ${
                      mobileActivePanel === "robot"
                        ? "bg-white text-indigo-700 shadow-sm"
                        : "text-slate-500 hover:text-slate-800"
                    }`}
                  >
                    🤖 Hướng Dẫn Robot
                  </button>
                  <button
                    onClick={() => setMobileActivePanel("sandbox")}
                    className={`flex-1 py-2 rounded-lg text-xs font-extrabold transition-all relative ${
                      mobileActivePanel === "sandbox"
                        ? "bg-white text-indigo-700 shadow-sm"
                        : "text-slate-500 hover:text-slate-800"
                    }`}
                  >
                    🎮 Khu Trải Nghiệm Ảo
                    {virtualPoints > 0 && (
                      <span className="absolute -top-1 -right-1 bg-amber-500 text-white text-[8px] px-1.5 py-0.5 rounded-full font-black">
                        +{virtualPoints}
                      </span>
                    )}
                  </button>
                </div>
              )}

              {/* Main Content Area */}
              <div className="flex-1 flex flex-col xl:flex-row items-stretch justify-center gap-4 sm:gap-5 overflow-hidden">
                {/* COLUMN 1: PANEL 1 (THE ROBOT PANEL) */}
                <div
                  className={`flex-1 bg-white border border-slate-200 shadow-sm rounded-2xl p-4 sm:p-5 flex flex-col items-stretch justify-between overflow-hidden relative ${
                    showSandbox && mobileActivePanel !== "robot" && mode === "tour"
                      ? "hidden xl:flex"
                      : "flex"
                  }`}
                >
                  {/* MODE A: GUIDED TOUR */}
                  {mode === "tour" ? (
                    <div className="flex-1 flex flex-col sm:flex-row items-stretch gap-4 sm:gap-5 overflow-hidden">
                      {/* Left: SVG animated Robot - scaled nicely for device viewports */}
                      <div className="flex flex-col items-center justify-center select-none shrink-0 relative pt-1 sm:border-r sm:border-slate-100 sm:pr-4">
                        <div id="robot-guide-svg-container" className="relative flex flex-col items-center">
                          <svg
                            width="90"
                            height="115"
                            viewBox="0 0 692 945.1"
                            xmlns="http://www.w3.org/2000/svg"
                            className="drop-shadow-md select-none pointer-events-none"
                            style={{ animation: "robot-float 3.5s ease-in-out infinite" }}
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
                            <g style={{ isolation: "isolate" }}>
                              <ellipse
                                fill="url(#robot-shadow-grad-tour)"
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
                              <circle fill="#6366f1" className="animate-pulse" cx="299" cy="343.7" r="24" />
                              <circle fill="#6366f1" className="animate-pulse" cx="416.1" cy="348.9" r="24" />
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
                        </div>

                        {/* Dot progress indicators */}
                        <div className="flex gap-1.5 mt-3 justify-center">
                          {steps.map((_, i) => (
                            <button
                              key={i}
                              onClick={() => {
                                setCurrentStep(i);
                                setMobileActivePanel("robot");
                              }}
                              className={`h-1.5 rounded-full transition-all duration-300 ${
                                i === currentStep ? "w-4 bg-indigo-600" : "w-1.5 bg-slate-200 hover:bg-slate-300"
                              }`}
                              title={`Bước ${i + 1}`}
                            />
                          ))}
                        </div>
                      </div>

                      {/* Right: Steps contents text - with explicit scroll and high-contrast styling */}
                      <div className="flex-1 flex flex-col justify-between overflow-hidden">
                        <div className="space-y-2 overflow-y-auto max-h-[220px] sm:max-h-[280px] pr-1.5 custom-scrollbar">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className="text-[9px] uppercase font-black tracking-widest text-indigo-700 bg-indigo-50 border border-indigo-100 px-2.5 py-0.5 rounded-md">
                              HƯỚNG DẪN • BƯỚC {currentStep + 1}/{steps.length}
                            </span>
                            <Sparkles className="w-3.5 h-3.5 text-amber-500 animate-spin" style={{ animationDuration: "12s" }} />
                          </div>

                          <h4 className="font-extrabold text-slate-800 text-sm sm:text-base leading-snug">
                            {currentStepData.title}
                          </h4>

                          <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-100 text-xs text-slate-600 leading-relaxed font-semibold">
                            {typedText}
                          </div>
                        </div>

                        {/* Control buttons */}
                        <div className="flex items-center justify-between border-t border-slate-100 pt-3 mt-4">
                          <button
                            onClick={handleBack}
                            disabled={currentStep === 0}
                            className="px-4 py-2 border border-slate-200 hover:border-slate-300 text-slate-500 hover:text-slate-700 disabled:opacity-40 disabled:hover:border-slate-200 disabled:hover:text-slate-400 rounded-xl transition-all flex items-center justify-center gap-1 text-xs font-extrabold cursor-pointer"
                            style={{ minHeight: "44px" }}
                          >
                            <ChevronLeft className="w-4 h-4" />
                            <span>Quay lại</span>
                          </button>

                          <button
                            onClick={handleNext}
                            className="py-2 px-5 bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold text-xs rounded-xl transition-all shadow-md shadow-indigo-100 hover:shadow-indigo-200 flex items-center justify-center gap-1 min-w-[85px] cursor-pointer"
                            style={{ minHeight: "44px" }}
                          >
                            <span>{currentStep === steps.length - 1 ? "Hoàn thành 🎉" : "Tiếp tục"}</span>
                            <ChevronRight className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    </div>
                  ) : (
                    /* MODE B: SMART AI CHATBOT RECEPTIONIST */
                    <div className="flex-1 flex flex-col justify-between overflow-hidden h-[340px] sm:h-[390px]">
                      {/* Chat Logs scroll section */}
                      <div className="flex-1 overflow-y-auto space-y-3.5 pr-1.5 custom-scrollbar pb-3">
                        {chatHistory.map((msg, i) => (
                          <div
                            key={i}
                            className={`flex items-start gap-2.5 ${
                              msg.role === "user" ? "flex-row-reverse" : "flex-row"
                            }`}
                          >
                            <div
                              className={`w-7 h-7 rounded-lg shrink-0 flex items-center justify-center text-xs font-black shadow-sm ${
                                msg.role === "user" ? "bg-indigo-600 text-white" : "bg-emerald-500 text-white"
                              }`}
                            >
                              {msg.role === "user" ? <User className="w-4 h-4" /> : <Bot className="w-4 h-4" />}
                            </div>

                            <div className="space-y-1 max-w-[80%]">
                              <div
                                className={`p-3 rounded-2xl text-xs font-semibold leading-relaxed ${
                                  msg.role === "user"
                                    ? "bg-indigo-600 text-white rounded-tr-none"
                                    : "bg-slate-100 text-slate-700 rounded-tl-none border border-slate-200/50"
                                }`}
                              >
                                {msg.text}
                              </div>
                              <p className="text-[8px] text-slate-400 font-bold px-1 text-right">
                                {msg.time}
                              </p>
                            </div>
                          </div>
                        ))}

                        {isChatLoading && (
                          <div className="flex items-start gap-2.5">
                            <div className="w-7 h-7 rounded-lg bg-emerald-500 text-white shrink-0 flex items-center justify-center text-xs">
                              <Bot className="w-4 h-4 animate-spin" />
                            </div>
                            <div className="bg-slate-100 border border-slate-200/50 p-3 rounded-2xl rounded-tl-none text-xs font-bold text-slate-500 flex items-center gap-1.5">
                              <span>Robot Lễ tân đang suy nghĩ...</span>
                              <span className="flex gap-1">
                                <span className="w-1.5 h-1.5 rounded-full bg-slate-400 animate-bounce" style={{ animationDelay: "0ms" }} />
                                <span className="w-1.5 h-1.5 rounded-full bg-slate-400 animate-bounce" style={{ animationDelay: "150ms" }} />
                                <span className="w-1.5 h-1.5 rounded-full bg-slate-400 animate-bounce" style={{ animationDelay: "300ms" }} />
                              </span>
                            </div>
                          </div>
                        )}
                        <div ref={chatEndRef} />
                      </div>

                      {/* Interactive Touch Chip prompts for speedy clicks */}
                      <div className="border-t border-slate-100 pt-2.5 pb-2.5">
                        <p className="text-[9px] text-indigo-600 font-extrabold uppercase tracking-wider mb-1.5 flex items-center gap-1">
                          <Sparkles className="w-3 h-3 animate-pulse" />
                          Gợi ý chạm nhanh dành cho {isTeacher ? "Thầy Cô" : "Học Sinh"}:
                        </p>
                        <div className="flex flex-wrap gap-1.5 max-h-[50px] overflow-y-auto pr-1">
                          {quickChips.map((chip) => (
                            <button
                              key={chip}
                              onClick={() => handleSendChat(chip.replace(/[^a-zA-Z0-9\s_À-ỹ]/g, "").trim())}
                              className="text-[10px] bg-slate-50 hover:bg-indigo-50 border border-slate-200 hover:border-indigo-200 px-2.5 py-1 rounded-xl font-bold text-slate-600 hover:text-indigo-700 transition-all text-left whitespace-nowrap cursor-pointer"
                              style={{ minHeight: "28px" }}
                            >
                              {chip}
                            </button>
                          ))}
                        </div>
                      </div>

                      {/* Input send message group */}
                      <form
                        onSubmit={(e) => {
                          e.preventDefault();
                          handleSendChat();
                        }}
                        className="flex items-center gap-2 border-t border-slate-100 pt-2.5"
                      >
                        <input
                          type="text"
                          placeholder="Hỏi robot bất kỳ điều gì về tính năng, phòng học..."
                          value={chatInput}
                          onChange={(e) => setChatInput(e.target.value)}
                          disabled={isChatLoading}
                          className="flex-1 px-3 py-2.5 border border-slate-200 outline-none rounded-xl text-xs focus:ring-2 focus:ring-indigo-500 bg-white shadow-inner font-semibold disabled:bg-slate-50"
                          style={{ minHeight: "44px" }}
                        />
                        <button
                          type="submit"
                          disabled={!chatInput.trim() || isChatLoading}
                          className="w-10 h-10 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl flex items-center justify-center shadow-md shadow-indigo-100 transition-all cursor-pointer disabled:opacity-45 shrink-0"
                          style={{ minHeight: "44px", minWidth: "44px" }}
                        >
                          <Send className="w-4 h-4" />
                        </button>
                      </form>
                    </div>
                  )}
                </div>

                {/* COLUMN 2: INTEGRATED VIRTUAL PLAYGROUND SANDBOX */}
                {showSandbox && mode === "tour" && (
                  <div
                    className={`xl:w-96 bg-white border border-slate-200/95 shadow-sm rounded-2xl p-4 sm:p-5 flex flex-col justify-between overflow-hidden relative ${
                      mobileActivePanel !== "sandbox" ? "hidden xl:flex" : "flex w-full"
                    }`}
                  >
                    {/* Decorative badge header */}
                    <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-3.5">
                      <div className="flex items-center gap-2">
                        <div className="w-7 h-7 rounded-lg bg-amber-500/15 text-amber-600 flex items-center justify-center font-bold text-xs shrink-0">
                          🎮
                        </div>
                        <div>
                          <span className="text-[10px] font-black text-amber-600 uppercase tracking-widest block">
                            KHU TRẢI NGHIỆM
                          </span>
                          <h5 className="font-extrabold text-slate-800 text-xs leading-none mt-0.5">
                            Thực hành ảo thời gian thực
                          </h5>
                        </div>
                      </div>

                      {/* Virtual points counter */}
                      <div className="flex items-center gap-1 bg-amber-500/10 border border-amber-500/20 px-2.5 py-1 rounded-full text-xs font-black text-amber-700 shrink-0 shadow-inner">
                        <Star className="w-3.5 h-3.5 text-amber-500 fill-amber-500 animate-pulse" />
                        <span>{virtualPoints} Xu ảo</span>
                      </div>
                    </div>

                    {/* DYNAMIC SANDBOX CONTENT */}
                    <div className="flex-1 flex flex-col justify-center min-h-[190px] sm:min-h-[220px]">
                      {/* CASE 1: FLASHCARD SANDBOX */}
                      {currentStepData.sandboxType === "flashcard" && (
                        <div className="space-y-4 text-center">
                          <p className="text-[11px] text-slate-500 font-bold">
                            Chạm vào thẻ bên dưới để lật hai mặt xem định nghĩa:
                          </p>

                          {/* 3D Flipping Card Container */}
                          <motion.div
                            className="perspective-1000 w-full max-w-[210px] h-28 mx-auto cursor-pointer"
                            onClick={handleFlippedCard}
                            whileHover={{ scale: 1.03 }}
                            whileTap={{ scale: 0.97 }}
                            transition={{ type: "spring", stiffness: 350, damping: 25 }}
                          >
                            <motion.div
                              animate={{ rotateY: fcFlipped ? 180 : 0 }}
                              transition={{ duration: 0.5, ease: [0.2, 0.8, 0.2, 1] }}
                              className="relative w-full h-full transform-style-3d"
                            >
                              {/* FRONT SIDE */}
                              <div className="absolute inset-0 backface-hidden bg-white border-2 border-indigo-100 rounded-2xl shadow-sm p-4 flex flex-col items-center justify-center gap-1">
                                <Layers className="w-5 h-5 text-indigo-500" />
                                <span className="text-[10px] text-indigo-700 font-extrabold tracking-wider uppercase">
                                  Vocabulary Card
                                </span>
                                <p className="font-black text-slate-800 text-xs sm:text-sm">Photosynthesis</p>
                                <span className="text-[9px] text-slate-400 font-semibold italic">(Click to flip)</span>
                              </div>

                              {/* BACK SIDE */}
                              <div className="absolute inset-0 backface-hidden rotate-y-180 bg-gradient-to-br from-indigo-50 to-blue-50 border-2 border-indigo-200 rounded-2xl p-4 flex flex-col items-center justify-center text-center">
                                <span className="text-[9px] text-indigo-600 font-black tracking-wider uppercase">
                                  ĐỊNH NGHĨA
                                </span>
                                <p className="text-[11px] text-slate-700 font-bold mt-1 leading-snug">
                                  Quá trình quang hợp: Cây xanh hấp thụ ánh sáng mặt trời để tổng hợp chất hữu cơ & sinh
                                  ra khí oxi.
                                </p>
                              </div>
                            </motion.div>
                          </motion.div>

                          <div className="flex items-center justify-center gap-2 pt-1.5">
                            <button
                              onClick={handleLearnCard}
                              disabled={fcLearned}
                              className={`px-4 py-2 rounded-xl text-xs font-black transition-all shadow-sm flex items-center gap-1.5 cursor-pointer ${
                                fcLearned
                                  ? "bg-emerald-500 text-white shadow-emerald-100"
                                  : "bg-indigo-600 hover:bg-indigo-700 text-white shadow-indigo-100"
                              }`}
                              style={{ minHeight: "44px" }}
                            >
                              {fcLearned ? <CheckCircle className="w-4 h-4" /> : <Sparkles className="w-4 h-4" />}
                              <span>{fcLearned ? "Đã thuộc lòng bài!" : "Xác nhận đã thuộc"}</span>
                            </button>

                            {fcLearned && (
                              <button
                                onClick={() => {
                                  setFcLearned(false);
                                  setFcFlipped(false);
                                }}
                                className="p-2 border border-slate-200 hover:bg-slate-50 rounded-xl transition-colors text-slate-500 cursor-pointer"
                                style={{ minHeight: "44px", minWidth: "44px" }}
                                title="Học lại"
                              >
                                <RefreshCw className="w-4 h-4 mx-auto" />
                              </button>
                            )}
                          </div>

                          {fcLearned && (
                            <p className="text-[10px] text-emerald-600 font-black animate-bounce mt-1">
                              🎉 Bạn vừa hoàn tất học và rinh ngay +15 Xu thưởng!
                            </p>
                          )}
                        </div>
                      )}

                      {/* CASE 2: ASSIGNMENT SANDBOX */}
                      {currentStepData.sandboxType === "assignment" && (
                        <div className="space-y-3">
                          <div className="bg-slate-50 p-3 rounded-xl border border-slate-100 space-y-1">
                            <span className="text-[9px] font-black uppercase text-rose-500 bg-rose-50 px-2 py-0.5 rounded-md">
                              BÀI TẬP PHỔ THÔNG
                            </span>
                            <h6 className="text-xs font-black text-slate-800">
                              Cân bằng phương trình: H₂ + O₂ ➔ H₂O
                            </h6>
                            <p className="text-[10px] text-slate-500 font-semibold leading-normal">
                              Điền hệ số chính xác vào ô dưới đây để thử nộp bài:
                            </p>
                          </div>

                          <form onSubmit={handleAsnSubmit} className="space-y-2.5">
                            <textarea
                              required
                              rows={2}
                              placeholder="Nhập câu trả lời (Ví dụ: 2H2 + O2 = 2H2O)"
                              value={asnText}
                              onChange={(e) => setAsnText(e.target.value)}
                              disabled={asnStatus === "done"}
                              className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500 bg-white disabled:bg-slate-50 disabled:text-slate-500 font-mono"
                            />

                            <div className="flex items-center justify-between gap-2">
                              <button
                                type="button"
                                onClick={handleAttachMockFile}
                                disabled={asnFileAttached || asnStatus === "done"}
                                className={`px-2.5 py-1.5 rounded-lg border text-[10px] font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
                                  asnFileAttached
                                    ? "bg-emerald-50 border-emerald-200 text-emerald-700"
                                    : "bg-white border-slate-200 text-slate-600 hover:bg-slate-50"
                                }`}
                                style={{ minHeight: "36px" }}
                              >
                                <FileText className="w-3.5 h-3.5" />
                                <span>{asnFileAttached ? "vo_ghi.png" : "Đính kèm ảnh vỡ"}</span>
                              </button>

                              <button
                                type="submit"
                                disabled={asnStatus !== "idle" || !asnText.trim()}
                                className="px-4 py-1.5 bg-rose-600 hover:bg-rose-700 text-white font-extrabold text-[10px] rounded-xl shadow-md shadow-rose-100 transition-all cursor-pointer disabled:opacity-50 flex items-center gap-1"
                                style={{ minHeight: "36px" }}
                              >
                                {asnStatus === "submitting" ? "Đang gửi..." : asnStatus === "done" ? "Đã nộp!" : "Gửi bài nộp"}
                              </button>
                            </div>
                          </form>

                          {asnStatus === "done" && (
                            <div className="p-2.5 bg-emerald-50 border border-emerald-100 rounded-xl space-y-1 mt-1">
                              <p className="text-[10px] text-emerald-800 font-black flex items-center gap-1">
                                <CheckCircle className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                                <span>Nộp bài thành công! +20 Xu</span>
                              </p>
                              <p className="text-[9px] text-slate-500 leading-normal italic">
                                Thầy cô chấm: <span className="font-extrabold text-indigo-700">10/10 điểm! Xuất sắc!</span>
                              </p>
                            </div>
                          )}
                        </div>
                      )}

                      {/* CASE 3: GAME SANDBOX */}
                      {currentStepData.sandboxType === "game" && (
                        <div className="space-y-3 text-center">
                          <div className="bg-gradient-to-r from-blue-500/10 to-indigo-500/10 p-2.5 rounded-xl border border-indigo-100 space-y-1">
                            <span className="text-[9px] text-indigo-700 font-extrabold uppercase bg-white px-2 py-0.5 rounded shadow-sm">
                              KÉO CO TRI THỨC 🚩
                            </span>
                            <p className="text-[11px] font-black text-slate-800">Hành tinh nào nằm gần Mặt trời nhất?</p>
                          </div>

                          {/* Interactive rope visual simulator based on selection */}
                          <div className="h-10 bg-slate-100 rounded-lg border border-slate-200 flex items-center justify-between px-3 relative overflow-hidden">
                            <span className="text-[10px] font-bold text-indigo-600">Đội Bạn 🧑‍🎓</span>

                            {/* Simulated rope */}
                            <div className="flex-1 h-1 bg-amber-500 mx-2 relative flex items-center justify-center">
                              {/* Flag marker */}
                              <motion.div
                                animate={{
                                  x: gameStatus === "correct" ? -35 : gameStatus === "wrong" ? 35 : 0,
                                }}
                                transition={{ type: "spring", stiffness: 100 }}
                                className="w-3 h-3 bg-rose-600 rotate-45 absolute shadow"
                              />
                            </div>

                            <span className="text-[10px] font-bold text-slate-500">Robot Đối Thủ 🤖</span>
                          </div>

                          {/* Answers list */}
                          <div className="grid grid-cols-3 gap-1.5 pt-1">
                            {["Sao Hoả", "Sao Kim", "Sao Thuỷ"].map((choice) => {
                              const isSelected = gameSelectedAns === choice;
                              const isCorrect = choice === "Sao Thuỷ";
                              return (
                                <button
                                  key={choice}
                                  type="button"
                                  disabled={gameStatus !== "playing"}
                                  onClick={() => handleGameAnswer(choice)}
                                  className={`p-2 rounded-xl text-[10px] font-extrabold transition-all border text-center cursor-pointer ${
                                    isSelected
                                      ? isCorrect
                                        ? "bg-emerald-500 border-emerald-500 text-white shadow"
                                        : "bg-rose-500 border-rose-500 text-white shadow"
                                      : "bg-white border-slate-200 text-slate-700 hover:bg-slate-50"
                                  }`}
                                  style={{ minHeight: "36px" }}
                                >
                                  {choice}
                                </button>
                              );
                            })}
                          </div>

                          {gameStatus === "correct" && (
                            <div className="space-y-1.5 mt-2">
                              <p className="text-[10px] text-emerald-600 font-black animate-pulse">
                                🏆 Trả lời đúng và kéo đổ đối thủ! +30 Xu!
                              </p>
                              <button
                                onClick={resetGame}
                                className="text-[9px] text-indigo-600 font-bold hover:underline flex items-center justify-center gap-1 mx-auto cursor-pointer"
                              >
                                <span>Lượt tiếp theo</span>
                                <ArrowRight className="w-3 h-3" />
                              </button>
                            </div>
                          )}

                          {gameStatus === "wrong" && (
                            <div className="space-y-1.5 mt-2">
                              <p className="text-[10px] text-rose-600 font-bold">
                                Tiếc quá! Đối thủ đang kéo mạnh hơn. Hãy chọn hành tinh khác nhé!
                              </p>
                              <button
                                onClick={resetGame}
                                className="text-[9px] text-indigo-600 font-bold hover:underline flex items-center justify-center gap-1 mx-auto cursor-pointer"
                              >
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
                        <Zap className="w-3.5 h-3.5 text-amber-500 animate-bounce" />
                        Xu thi đua hôm nay: +150
                      </span>
                      <span className="flex items-center gap-1">
                        <Trophy className="w-3.5 h-3.5 text-indigo-500" />
                        Xếp hạng: Top 3 lớp
                      </span>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </AnimatePresence>

      {/* Embedded Styles for Robot & Card animations */}
      <style>{`
        @keyframes robot-float {
          0%, 100% { transform: translateY(0px) rotate(0deg); }
          50% { transform: translateY(-7px) rotate(1deg); }
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
