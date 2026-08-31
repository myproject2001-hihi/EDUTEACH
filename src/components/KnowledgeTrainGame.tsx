import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { RotateCw, CheckCircle2, Train, X, ChevronLeft, ChevronRight, Volume2, VolumeX } from 'lucide-react';
import confetti from 'canvas-confetti';
import { MarkdownMath } from './MarkdownMath';
import { ParsedQuestionItem, cleanQuestionText } from '../views/AssignmentsView';

export interface KnowledgeTrainGameProps {
  questions: ParsedQuestionItem[];
  onClose: () => void;
  isStudentMode?: boolean;
  onSubmitWork?: (score: number, correctAnswers: number, answersMap: Record<string, number>) => void;
}

interface LearningPair {
  id: string;
  q: string;
  a: string;
  img?: string;
}

interface CarriageData {
  id: string;
  prevAns: string;
  nextQ: string;
  nextImg?: string;
}

// Default educational pairs for fallback
const DEFAULT_LEARNING_PAIRS: LearningPair[] = [
  { id: '1', q: "Thủ đô của Việt Nam là thành phố nào?", a: "Hà Nội" },
  { id: '2', q: "Đây là hình dạng hình học nào?", a: "Hình thang" },
  { id: '3', q: "Ngọn núi nào cao nhất Việt Nam?", a: "Fansipan" },
  { id: '4', q: "Phép tính: 8 × 5 = ?", a: "40" },
  { id: '5', q: "Quốc kỳ Việt Nam có ngôi sao màu gì?", a: "Màu vàng" }
];

// Fisher-Yates Shuffle
function shuffleArray<T>(array: T[]): T[] {
  const arr = [...array];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

export function KnowledgeTrainGame({
  questions,
  onClose,
  isStudentMode = false,
  onSubmitWork
}: KnowledgeTrainGameProps) {
  // Extract pairs from questions
  const { startQuestion, startImg, carriages, totalSlots } = useMemo(() => {
    const pairs: LearningPair[] = [];

    if (questions && questions.length > 0) {
      questions.forEach((q, idx) => {
        if (q.matchingPairs && q.matchingPairs.length > 0) {
          q.matchingPairs.forEach((mp, mpIdx) => {
            if (mp.left && mp.right) {
              pairs.push({
                id: `p_${idx}_${mpIdx}`,
                q: mp.left,
                a: mp.right
              });
            }
          });
        } else if (q.question) {
          const rawQ = cleanQuestionText(q.question);
          let rawA = '';
          if (typeof q.correctAnswer === 'number' && q.options && q.options[q.correctAnswer]) {
            rawA = q.options[q.correctAnswer];
          } else if (q.correctAnswer !== undefined) {
            rawA = String(q.correctAnswer).trim();
          } else if (q.options && q.options.length > 0) {
            rawA = q.options[0];
          }

          if (rawQ && rawA) {
            pairs.push({
              id: `p_${idx}`,
              q: rawQ,
              a: rawA,
              img: (q as any).image || (q as any).imageUrl || (q as any).thumb
            });
          }
        }
      });
    }

    // Fallback if less than 2 pairs
    if (pairs.length < 2) {
      DEFAULT_LEARNING_PAIRS.forEach((dp, idx) => {
        if (pairs.length < 5) {
          pairs.push({
            id: `def_${idx + 1}`,
            q: dp.q,
            a: dp.a
          });
        }
      });
    }

    // Limit to max 7 pairs for optimal screen fit
    const limitedPairs = pairs.slice(0, 7);

    // Initial question on locomotive card
    const firstQ = limitedPairs[0]?.q || "Câu hỏi mở đầu...";

    // Build domino carriage data
    const carriageList: CarriageData[] = limitedPairs.map((pair, idx) => {
      const nextPair = limitedPairs[idx + 1];
      return {
        id: pair.id,
        prevAns: pair.a,
        nextQ: nextPair ? nextPair.q : "🎉 Đích đến tuyệt vời!",
        nextImg: nextPair ? nextPair.img : undefined
      };
    });

    return {
      startQuestion: firstQ,
      startImg: limitedPairs[0]?.img,
      carriages: carriageList,
      totalSlots: carriageList.length
    };
  }, [questions]);

  // State
  const [slots, setSlots] = useState<(CarriageData | null)[]>(() => new Array(totalSlots).fill(null));
  const [inventory, setInventory] = useState<CarriageData[]>([]);
  const [modalState, setModalState] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    type: 'success' | 'error' | 'info';
  }>({
    isOpen: false,
    title: '',
    message: '',
    type: 'info'
  });
  const [isMuted, setIsMuted] = useState<boolean>(false);

  // Dragging state
  const [activeCar, setActiveCar] = useState<CarriageData | null>(null);
  const [dragPos, setDragPos] = useState<{ x: number; y: number } | null>(null);
  const [hoveredSlotIdx, setHoveredSlotIdx] = useState<number | null>(null);
  const [hoveredInventory, setHoveredInventory] = useState<boolean>(false);

  // Refs for scrolling
  const stageScrollRef = useRef<HTMLDivElement>(null);
  const inventoryScrollRef = useRef<HTMLDivElement>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const dragStartRef = useRef<{ x: number; y: number; car: CarriageData; fromSlot: number } | null>(null);

  // Initialize or reset game
  const initGame = useCallback(() => {
    setSlots(new Array(totalSlots).fill(null));
    setInventory(shuffleArray(carriages));
    setModalState({ isOpen: false, title: '', message: '', type: 'info' });
    if (stageScrollRef.current) stageScrollRef.current.scrollLeft = 0;
    if (inventoryScrollRef.current) inventoryScrollRef.current.scrollLeft = 0;
  }, [carriages, totalSlots]);

  useEffect(() => {
    initGame();
  }, [initGame]);

  // Audio Synthesizer
  const playSound = useCallback((type: 'pop' | 'slide' | 'error' | 'win') => {
    if (isMuted) return;
    try {
      if (!audioCtxRef.current) {
        const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
        audioCtxRef.current = new AudioCtx();
      }
      if (audioCtxRef.current.state === 'suspended') {
        audioCtxRef.current.resume();
      }

      const ctx = audioCtxRef.current;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);

      if (type === 'pop') {
        osc.type = 'sine';
        osc.frequency.setValueAtTime(600, ctx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(1100, ctx.currentTime + 0.08);
        gain.gain.setValueAtTime(0.3, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.08);
        osc.start();
        osc.stop(ctx.currentTime + 0.08);
      } else if (type === 'slide') {
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(350, ctx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(180, ctx.currentTime + 0.12);
        gain.gain.setValueAtTime(0.2, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.12);
        osc.start();
        osc.stop(ctx.currentTime + 0.12);
      } else if (type === 'error') {
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(220, ctx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(110, ctx.currentTime + 0.2);
        gain.gain.setValueAtTime(0.25, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.2);
        osc.start();
        osc.stop(ctx.currentTime + 0.2);
      } else if (type === 'win') {
        const now = ctx.currentTime;
        [523.25, 659.25, 783.99, 1046.5].forEach((freq, i) => {
          const o = ctx.createOscillator();
          const g = ctx.createGain();
          o.connect(g);
          g.connect(ctx.destination);
          o.type = 'triangle';
          o.frequency.setValueAtTime(freq, now + i * 0.08);
          g.gain.setValueAtTime(0.2, now + i * 0.08);
          g.gain.exponentialRampToValueAtTime(0.001, now + i * 0.08 + 0.3);
          o.start(now + i * 0.08);
          o.stop(now + i * 0.08 + 0.3);
        });
      }
    } catch {
      // Ignore audio context autoplay errors
    }
  }, [isMuted]);

  // Scroll Helpers
  const scrollStage = (amount: number) => {
    if (stageScrollRef.current) {
      stageScrollRef.current.scrollBy({ left: amount, behavior: 'smooth' });
    }
  };

  const scrollInventory = (amount: number) => {
    if (inventoryScrollRef.current) {
      inventoryScrollRef.current.scrollBy({ left: amount, behavior: 'smooth' });
    }
  };

  // Click Carriage handler
  const handleCarriageClick = (car: CarriageData, fromSlotIdx: number = -1) => {
    if (fromSlotIdx !== -1) {
      // Remove from slot & return to inventory
      setSlots(prev => {
        const next = [...prev];
        next[fromSlotIdx] = null;
        return next;
      });
      setInventory(prev => [...prev, car]);
      playSound('slide');
    } else {
      // Find first empty slot
      const emptyIdx = slots.findIndex(s => s === null);
      if (emptyIdx !== -1) {
        setSlots(prev => {
          const next = [...prev];
          next[emptyIdx] = car;
          return next;
        });
        setInventory(prev => prev.filter(c => c.id !== car.id));
        playSound('pop');
      } else {
        playSound('error');
        setModalState({
          isOpen: true,
          title: 'Đoàn tàu đã đầy! 🚂',
          message: 'Em hãy kiểm tra lại vị trí các toa tàu hoặc nhấp vào toa bài trên đường ray để gỡ ra nhé.',
          type: 'info'
        });
      }
    }
  };

  // Drag & Pointer Events
  const handlePointerDown = (e: React.PointerEvent, car: CarriageData, fromSlotIdx: number = -1) => {
    if (e.button !== 0 && e.pointerType === 'mouse') return;

    dragStartRef.current = {
      x: e.clientX,
      y: e.clientY,
      car,
      fromSlot: fromSlotIdx
    };

    e.currentTarget.setPointerCapture(e.pointerId);
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!dragStartRef.current) return;

    const dx = e.clientX - dragStartRef.current.x;
    const dy = e.clientY - dragStartRef.current.y;

    if (!activeCar && (Math.abs(dx) > 8 || Math.abs(dy) > 8)) {
      setActiveCar(dragStartRef.current.car);
      playSound('slide');
    }

    if (activeCar) {
      setDragPos({ x: e.clientX, y: e.clientY });

      const elements = document.elementsFromPoint(e.clientX, e.clientY);
      let foundSlotIdx: number | null = null;
      let foundInv = false;

      for (const el of elements) {
        const slotAttr = el.getAttribute('data-slot-idx');
        if (slotAttr !== null) {
          foundSlotIdx = parseInt(slotAttr, 10);
          break;
        }
        if (el.getAttribute('data-inventory-dock') === 'true') {
          foundInv = true;
        }
      }

      setHoveredSlotIdx(foundSlotIdx);
      setHoveredInventory(foundInv);
    }
  };

  const handlePointerUp = (e: React.PointerEvent) => {
    if (!dragStartRef.current) return;

    try {
      e.currentTarget.releasePointerCapture(e.pointerId);
    } catch {
      // Ignore if capture was lost
    }

    if (activeCar && dragStartRef.current) {
      const { car, fromSlot } = dragStartRef.current;

      if (hoveredSlotIdx !== null && slots[hoveredSlotIdx] === null) {
        setSlots(prev => {
          const next = [...prev];
          if (fromSlot !== -1) next[fromSlot] = null;
          next[hoveredSlotIdx] = car;
          return next;
        });

        if (fromSlot === -1) {
          setInventory(prev => prev.filter(c => c.id !== car.id));
        }
        playSound('pop');
      } else if (hoveredInventory && fromSlot !== -1) {
        setSlots(prev => {
          const next = [...prev];
          next[fromSlot] = null;
          return next;
        });
        setInventory(prev => [...prev, car]);
        playSound('slide');
      } else {
        handleCarriageClick(car, fromSlot);
      }
    } else if (dragStartRef.current) {
      const { car, fromSlot } = dragStartRef.current;
      handleCarriageClick(car, fromSlot);
    }

    dragStartRef.current = null;
    setActiveCar(null);
    setDragPos(null);
    setHoveredSlotIdx(null);
    setHoveredInventory(false);
  };

  // Check answers
  const checkAnswers = () => {
    if (slots.some(s => s === null)) {
      playSound('error');
      setModalState({
        isOpen: true,
        title: 'Chưa hoàn thành!',
        message: 'Em cần ghép đủ tất cả các toa tàu lên đường ray trước khi kiểm tra nhé.',
        type: 'info'
      });
      return;
    }

    let isCorrect = true;
    for (let i = 0; i < carriages.length; i++) {
      if (slots[i]?.id !== carriages[i].id) {
        isCorrect = false;
        break;
      }
    }

    if (isCorrect) {
      playSound('win');
      confetti({
        particleCount: 90,
        spread: 80,
        origin: { y: 0.6 }
      });

      setModalState({
        isOpen: true,
        title: 'Xuất Sắc! 🎉',
        message: 'Em đã nối thành công Đoàn Tàu Tri Thức. Tàu chuẩn bị xuất phát cất cánh!',
        type: 'success'
      });

      if (onSubmitWork) {
        const answersMap: Record<string, number> = {};
        carriages.forEach((c, idx) => {
          answersMap[`train_car_${idx}`] = 1;
        });
        onSubmitWork(100, carriages.length, answersMap);
      }
    } else {
      playSound('error');
      setModalState({
        isOpen: true,
        title: 'Thử Lại Nhé! 🤔',
        message: 'Có toa tàu bị xếp nhầm vị trí logic. Em hãy đọc kỹ câu hỏi trên toa trước đó và xếp lại nhé.',
        type: 'error'
      });
    }
  };

  return (
    <div className="flex flex-col h-full w-full bg-[#38bdf8] overflow-hidden select-none relative font-sans">
      <style>{`
        .cloud {
          position: absolute;
          background: rgba(255, 255, 255, 0.92);
          border-radius: 50px;
          opacity: 0.9;
          animation: floatCloud 35s linear infinite;
        }
        .cloud::before, .cloud::after {
          content: '';
          position: absolute;
          background: rgba(255, 255, 255, 0.92);
          border-radius: 50%;
        }
        .cloud-1 { top: 6%; width: 140px; height: 45px; animation-duration: 40s; }
        .cloud-1::before { width: 60px; height: 60px; top: -25px; left: 20px; }
        .cloud-1::after { width: 50px; height: 50px; top: -15px; left: 65px; }

        .cloud-2 { top: 18%; width: 180px; height: 55px; animation-duration: 55s; animation-delay: -15s; }
        .cloud-2::before { width: 75px; height: 75px; top: -30px; left: 30px; }
        .cloud-2::after { width: 60px; height: 60px; top: -20px; left: 90px; }

        @keyframes floatCloud {
          from { transform: translateX(-200px); }
          to { transform: translateX(105vw); }
        }

        .no-scrollbar::-webkit-scrollbar { display: none; }
        .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
      `}</style>

      {/* TOP SCENERY STAGE */}
      <div className="relative flex-1 bg-gradient-to-b from-[#38bdf8] via-[#7dd3fc] to-[#bae6fd] overflow-hidden flex flex-col justify-between">
        {/* Animated Clouds */}
        <div className="cloud cloud-1" />
        <div className="cloud cloud-2" />

        {/* Rolling Hills SVGs */}
        <div className="absolute bottom-10 left-0 right-0 h-[140px] bg-repeat-x pointer-events-none opacity-90"
             style={{
               backgroundImage: `url("data:image/svg+xml;utf8,<svg viewBox='0 0 1440 320' xmlns='http://www.w3.org/2000/svg'><path fill='%234ade80' d='M0,192L60,186.7C120,181,240,171,360,181.3C480,192,600,224,720,218.7C840,213,960,171,1080,165.3C1200,160,1320,192,1380,208L1440,224L1440,320L1380,320C1320,320,1200,320,1080,320C960,320,840,320,720,320C600,320,240,320,120,320,60,320L0,320Z'></path></svg>")`,
               backgroundSize: '1440px 140px'
             }}
        />
        <div className="absolute bottom-6 left-0 right-0 h-[110px] bg-repeat-x pointer-events-none"
             style={{
               backgroundImage: `url("data:image/svg+xml;utf8,<svg viewBox='0 0 1440 320' xmlns='http://www.w3.org/2000/svg'><path fill='%2322c55e' d='M0,128L80,149.3C160,171,320,213,480,202.7C640,192,800,128,960,122.7C1120,117,1280,171,1360,197.3L1440,224L1440,320L1360,320C1280,320,1120,320,960,320C800,320,640,320,480,320C320,320,160,320,80,320L0,320Z'></path></svg>")`,
               backgroundSize: '1440px 110px'
             }}
        />

        {/* TOP HEADER CONTROLS */}
        <div className="absolute top-3 left-3 right-3 sm:left-4 sm:right-4 z-30 flex items-center justify-between gap-2 pointer-events-auto">
          {/* Title Badge */}
          <div className="bg-white/95 backdrop-blur-md px-3 py-1.5 sm:px-4 sm:py-2 rounded-2xl border-2 border-sky-400 shadow-md flex items-center gap-2">
            <Train className="w-5 h-5 sm:w-6 sm:h-6 text-red-500 shrink-0" />
            <h1 className="text-xs sm:text-base md:text-lg font-black text-sky-800 uppercase tracking-wide">
              Đoàn Tàu Tri Thức
            </h1>
          </div>

          {/* Right Action Icons */}
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setIsMuted(!isMuted)}
              className="w-9 h-9 sm:w-10 sm:h-10 rounded-2xl bg-white/95 border-2 border-sky-200 text-sky-700 flex items-center justify-center hover:bg-sky-50 transition-all shadow-md active:scale-95"
              title={isMuted ? "Mở âm thanh" : "Tắt âm thanh"}
            >
              {isMuted ? <VolumeX className="w-4 h-4 sm:w-5 sm:h-5 text-slate-400" /> : <Volume2 className="w-4 h-4 sm:w-5 sm:h-5" />}
            </button>

            {/* Close button removed as requested */}
          </div>
        </div>

        {/* TRACK STAGE VIEWPORT */}
        <div className="relative w-full h-full flex-1 z-20 flex flex-col justify-end">
          {/* Scroll Left Button */}
          <button
            type="button"
            onClick={() => scrollStage(-300)}
            className="absolute left-2 top-1/2 -translate-y-1/2 z-40 w-8 h-16 sm:w-10 sm:h-24 bg-emerald-500/90 hover:bg-emerald-600 active:scale-95 text-white rounded-2xl flex items-center justify-center shadow-lg border-2 border-white/80 transition-transform"
          >
            <ChevronLeft className="w-5 h-5 sm:w-6 sm:h-6" />
          </button>

          {/* Scroll Right Button */}
          <button
            type="button"
            onClick={() => scrollStage(300)}
            className="absolute right-2 top-1/2 -translate-y-1/2 z-40 w-8 h-16 sm:w-10 sm:h-24 bg-emerald-500/90 hover:bg-emerald-600 active:scale-95 text-white rounded-2xl flex items-center justify-center shadow-lg border-2 border-white/80 transition-transform"
          >
            <ChevronRight className="w-5 h-5 sm:w-6 sm:h-6" />
          </button>

          {/* Scrollable Stage Content */}
          <div
            ref={stageScrollRef}
            className="w-full overflow-x-auto overflow-y-hidden no-scrollbar flex items-end pb-3 scroll-smooth relative"
          >
            <div className="relative min-w-max px-10 sm:px-16 flex items-end pb-1">
              
              {/* Train Line Container */}
              <div className="flex items-end gap-3 sm:gap-4 relative z-10 pb-2">
                
                {/* LOCOMOTIVE ENGINE & ATTACHED START CARD */}
                <div className="flex items-end relative shrink-0">
                  {/* Locomotive Graphic SVG */}
                  <div className="w-[130px] sm:w-[170px] h-[135px] sm:h-[155px] relative shrink-0 z-15">
                    <svg viewBox="0 0 170 155" className="w-full h-full">
                      {/* Chimney Smoke */}
                      <circle cx="35" cy="20" r="8" fill="#e2e8f0" opacity="0.8">
                        <animate attributeName="cy" values="20; -10" dur="2s" repeatCount="indefinite" />
                        <animate attributeName="r" values="8; 18" dur="2s" repeatCount="indefinite" />
                        <animate attributeName="opacity" values="0.8; 0" dur="2s" repeatCount="indefinite" />
                      </circle>

                      {/* Cowcatcher */}
                      <polygon points="5,135 30,135 25,115 5,115" fill="#475569" stroke="#1e293b" strokeWidth="2" />
                      {/* Chimney */}
                      <rect x="25" y="40" width="22" height="40" rx="3" fill="#1e293b" />
                      <rect x="20" y="36" width="32" height="8" rx="3" fill="#ef4444" />

                      {/* Boiler Main Tank */}
                      <rect x="20" y="75" width="85" height="50" rx="20" fill="#ef4444" stroke="#1e293b" strokeWidth="3" />
                      {/* Gold Boiler Rings */}
                      <rect x="45" y="75" width="6" height="50" fill="#f59e0b" />
                      <rect x="75" y="75" width="6" height="50" fill="#f59e0b" />

                      {/* Cab Room */}
                      <rect x="90" y="30" width="75" height="95" rx="8" fill="#f59e0b" stroke="#1e293b" strokeWidth="3" />
                      {/* Cab Roof */}
                      <path d="M 82 30 Q 130 15 172 30 Z" fill="#2563eb" stroke="#1e293b" strokeWidth="3" />
                      {/* Cab Window */}
                      <rect x="105" y="48" width="45" height="38" rx="6" fill="#93c5fd" stroke="#1e293b" strokeWidth="3" />
                      <line x1="127.5" y1="48" x2="127.5" y2="86" stroke="#1e293b" strokeWidth="2" />

                      {/* Engine Wheels */}
                      <circle cx="42" cy="132" r="16" fill="#cbd5e1" stroke="#1e293b" strokeWidth="4" />
                      <circle cx="42" cy="132" r="6" fill="#475569" />

                      <circle cx="82" cy="132" r="16" fill="#cbd5e1" stroke="#1e293b" strokeWidth="4" />
                      <circle cx="82" cy="132" r="6" fill="#475569" />

                      <circle cx="132" cy="128" r="22" fill="#cbd5e1" stroke="#1e293b" strokeWidth="5" />
                      <circle cx="132" cy="128" r="8" fill="#475569" />
                    </svg>
                  </div>

                  {/* Attached Start Question Card - Perfectly aligned with Domino Carriages */}
                  <div className="w-[200px] sm:w-[255px] h-[135px] sm:h-[155px] bg-white rounded-2xl border-3 border-blue-500 shadow-md flex flex-col relative shrink-0 overflow-hidden -ml-2 z-10">
                    <div className="w-full bg-blue-600 text-white text-[10px] sm:text-xs font-black py-1 px-2 text-center uppercase tracking-wider flex items-center justify-center gap-1 shrink-0">
                      <span>🚂 Toa Mở Đầu: Câu Hỏi</span>
                    </div>
                    <div className="flex-1 p-2 sm:p-3 flex flex-col items-center justify-center text-center font-bold text-slate-800 text-xs sm:text-sm leading-snug gap-1.5">
                      {startImg && (
                        <div className="h-10 sm:h-12 w-full overflow-hidden flex items-center justify-center">
                          <img src={startImg} alt="Question" referrerPolicy="no-referrer" className="max-h-full w-auto object-contain rounded-md" />
                        </div>
                      )}
                      <MarkdownMath content={startQuestion} />
                    </div>
                    {/* Wheels */}
                    <div className="absolute -bottom-4 left-0 right-0 flex justify-between px-6 sm:px-7 pointer-events-none z-12">
                      <div className="w-7 h-7 sm:w-8 sm:h-8 bg-slate-700 rounded-full border-4 border-slate-400 shadow-md flex items-center justify-center">
                        <div className="w-2.5 h-2.5 bg-slate-300 rounded-full" />
                      </div>
                      <div className="w-7 h-7 sm:w-8 sm:h-8 bg-slate-700 rounded-full border-4 border-slate-400 shadow-md flex items-center justify-center">
                        <div className="w-2.5 h-2.5 bg-slate-300 rounded-full" />
                      </div>
                    </div>
                  </div>
                </div>

                {/* SLOTS FOR DOMINO CARRIAGES */}
                {slots.map((slotData, slotIdx) => {
                  const isHovered = hoveredSlotIdx === slotIdx;

                  return (
                    <div
                      key={slotIdx}
                      data-slot-idx={slotIdx}
                      className={`w-[200px] sm:w-[255px] h-[135px] sm:h-[155px] rounded-2xl flex items-center justify-center relative transition-all duration-200 shrink-0 ${
                        slotData
                          ? 'border-none bg-transparent'
                          : isHovered
                          ? 'border-3 border-dashed border-blue-600 bg-white/70 shadow-xl scale-102'
                          : 'border-3 border-dashed border-white/90 bg-white/40 backdrop-blur-xs'
                      }`}
                    >
                      {slotData ? (
                        <DominoCarriage
                          data={slotData}
                          fromSlotIdx={slotIdx}
                          onPointerDown={handlePointerDown}
                          onPointerMove={handlePointerMove}
                          onPointerUp={handlePointerUp}
                        />
                      ) : (
                        <div className="flex flex-col items-center justify-center gap-1">
                          <span className="text-3xl sm:text-5xl font-black text-amber-400 drop-shadow-[2px_3px_0px_#ffffff]">
                            {slotIdx + 1}
                          </span>
                          <span className="text-[10px] sm:text-xs font-bold text-slate-700 bg-white/80 px-2 py-0.5 rounded-full">
                            Kéo hoặc chọn toa
                          </span>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>

              {/* REALISTIC BROWN WOODEN RAILWAY TRACK */}
              <div className="absolute bottom-0 left-0 right-0 h-[38px] sm:h-[42px] pointer-events-none z-1 flex flex-col justify-end">
                {/* Steel Rail Line Top */}
                <div className="w-full h-1.5 bg-gradient-to-r from-slate-600 via-slate-300 to-slate-600 border-t border-slate-200 shadow-xs z-2 relative" />
                
                {/* Brown Wooden Ties / Sleepers (Tà vẹt gỗ màu nâu) */}
                <div className="w-full h-6 sm:h-7 bg-[#78350f] border-y-2 border-[#451a03] relative z-1 overflow-hidden shadow-inner">
                  <div className="w-full h-full bg-[repeating-linear-gradient(90deg,#92400e_0px,#92400e_16px,#451a03_16px,#451a03_22px,transparent_22px,transparent_46px)] opacity-95" />
                </div>

                {/* Steel Rail Line Bottom */}
                <div className="w-full h-1.5 bg-gradient-to-r from-slate-700 via-slate-400 to-slate-700 border-b border-slate-900 z-2 relative" />

                {/* Ballast Gravel Base */}
                <div className="w-full h-2 bg-[#57534e]" />
              </div>

            </div>
          </div>
        </div>
      </div>

      {/* BOTTOM INVENTORY DOCK */}
      <div
        data-inventory-dock="true"
        className={`h-[180px] sm:h-[220px] bg-slate-50 border-t-4 transition-colors ${
          hoveredInventory ? 'border-amber-400 bg-amber-50/70' : 'border-slate-200'
        } shadow-2xl relative flex flex-col justify-between py-2 z-30 shrink-0`}
        style={{
          backgroundImage: 'radial-gradient(#cbd5e1 1.5px, transparent 1.5px)',
          backgroundSize: '24px 24px'
        }}
      >
        {/* Navigation buttons for inventory */}
        <button
          type="button"
          onClick={() => scrollInventory(-280)}
          className="absolute left-2 top-10 sm:top-12 z-40 w-8 h-14 sm:w-9 sm:h-18 bg-amber-500 hover:bg-amber-600 active:scale-95 text-white rounded-xl flex items-center justify-center shadow-md border-2 border-white transition-transform"
        >
          <ChevronLeft className="w-5 h-5" />
        </button>

        <button
          type="button"
          onClick={() => scrollInventory(280)}
          className="absolute right-2 top-10 sm:top-12 z-40 w-8 h-14 sm:w-9 sm:h-18 bg-amber-500 hover:bg-amber-600 active:scale-95 text-white rounded-xl flex items-center justify-center shadow-md border-2 border-white transition-transform"
        >
          <ChevronRight className="w-5 h-5" />
        </button>

        {/* Scrollable Carriages Inventory */}
        <div
          ref={inventoryScrollRef}
          className="w-full flex-1 flex items-center gap-3 sm:gap-4 px-12 sm:px-16 overflow-x-auto no-scrollbar scroll-smooth"
        >
          {inventory.map(car => (
            <DominoCarriage
              key={car.id}
              data={car}
              fromSlotIdx={-1}
              onPointerDown={handlePointerDown}
              onPointerMove={handlePointerMove}
              onPointerUp={handlePointerUp}
            />
          ))}

          {inventory.length === 0 && (
            <div className="w-full text-center text-slate-500 font-bold text-xs sm:text-sm italic py-2">
              🎉 Đã sắp xếp tất cả các toa lên đường ray! Nhấn "Kiểm tra" để hoàn thành.
            </div>
          )}
        </div>

        {/* Action Controls Bar */}
        <div className="flex items-center justify-center gap-3 sm:gap-4 pt-1 pb-1">
          <button
            type="button"
            onClick={initGame}
            className="bg-white text-slate-700 hover:bg-slate-100 border-2 border-slate-300 font-extrabold px-4 py-1.5 sm:px-5 sm:py-2 rounded-xl shadow-xs flex items-center gap-1.5 sm:gap-2 active:scale-95 transition-all text-xs sm:text-sm"
          >
            <RotateCw className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-sky-500" />
            <span>Làm lại</span>
          </button>

          <button
            type="button"
            onClick={checkAnswers}
            className="bg-gradient-to-r from-violet-600 to-purple-600 hover:from-violet-700 hover:to-purple-700 text-white font-extrabold px-6 py-2 sm:px-7 sm:py-2.5 rounded-xl shadow-md flex items-center gap-2 active:scale-95 transition-all text-xs sm:text-base"
          >
            <CheckCircle2 className="w-4 h-4 sm:w-5 sm:h-5 text-emerald-300" />
            <span>Kiểm tra</span>
          </button>
        </div>
      </div>

      {/* DRAG GHOST OVERLAY */}
      {activeCar && dragPos && (
        <div
          className="fixed pointer-events-none z-50 scale-105 rotate-[-2deg] opacity-90 shadow-2xl"
          style={{
            left: dragPos.x - 100,
            top: dragPos.y - 65
          }}
        >
          <DominoCarriageDisplay data={activeCar} />
        </div>
      )}

      {/* FEEDBACK MODAL OVERLAY */}
      {modalState.isOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fade-in">
          <div className="bg-white rounded-3xl p-5 sm:p-8 max-w-sm w-full text-center shadow-2xl border-4 border-slate-100 flex flex-col items-center">
            <div className="text-4xl sm:text-6xl mb-3">
              {modalState.type === 'success' ? '🌟' : modalState.type === 'error' ? '🧩' : '🚂'}
            </div>
            <h2 className={`text-lg sm:text-2xl font-black mb-2 ${
              modalState.type === 'success' ? 'text-emerald-600' : modalState.type === 'error' ? 'text-rose-600' : 'text-amber-600'
            }`}>
              {modalState.title}
            </h2>
            <p className="text-slate-600 font-bold mb-5 text-xs sm:text-sm leading-relaxed">
              {modalState.message}
            </p>
            <button
              type="button"
              onClick={() => setModalState(prev => ({ ...prev, isOpen: false }))}
              className="bg-blue-600 hover:bg-blue-700 active:scale-95 text-white font-black py-2 px-7 rounded-xl shadow-md transition-all text-xs sm:text-base"
            >
              Đồng ý
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// DOMINO CARRIAGE DISPLAY COMPONENT
function DominoCarriageDisplay({ data }: { data: CarriageData }) {
  return (
    <div className="w-[200px] sm:w-[255px] h-[135px] sm:h-[155px] bg-white rounded-2xl border-3 border-slate-300 shadow-md flex relative shrink-0">
      {/* Coupler bar on left */}
      <div className="absolute -left-3.5 bottom-5 w-3.5 h-2.5 bg-slate-600 rounded-sm z-2" />

      {/* Left side: prevAns */}
      <div className="w-[38%] bg-white rounded-l-2xl border-r-2 border-dashed border-slate-300 flex items-center justify-center p-2 text-center font-black text-blue-700 text-xs sm:text-sm leading-tight break-words">
        <MarkdownMath content={data.prevAns} />
      </div>

      {/* Right side: nextQ */}
      <div className="w-[62%] bg-white rounded-r-2xl flex flex-col items-center justify-center p-2.5 text-center font-bold text-slate-800 text-[10px] sm:text-xs leading-snug relative gap-1">
        {/* Blue bead dot indicator */}
        <div className="absolute top-2 right-2 w-2.5 h-2.5 sm:w-3 sm:h-3 rounded-full bg-gradient-to-br from-blue-400 to-blue-700 border border-white shadow-xs" />
        {data.nextImg && (
          <div className="h-10 sm:h-12 w-full overflow-hidden flex items-center justify-center">
             <img src={data.nextImg} alt="Question" referrerPolicy="no-referrer" className="max-h-full w-auto object-contain rounded-md" />
          </div>
        )}
        <MarkdownMath content={data.nextQ} />
      </div>

      {/* Wheels */}
      <div className="absolute -bottom-4 left-0 right-0 flex justify-between px-6 sm:px-7 pointer-events-none z-12">
        <div className="w-7 h-7 sm:w-8 sm:h-8 bg-slate-700 rounded-full border-4 border-slate-400 shadow-md flex items-center justify-center">
          <div className="w-2.5 h-2.5 bg-slate-300 rounded-full" />
        </div>
        <div className="w-7 h-7 sm:w-8 sm:h-8 bg-slate-700 rounded-full border-4 border-slate-400 shadow-md flex items-center justify-center">
          <div className="w-2.5 h-2.5 bg-slate-300 rounded-full" />
        </div>
      </div>
    </div>
  );
}

// INTERACTIVE DOMINO CARRIAGE WRAPPER
function DominoCarriage({
  data,
  fromSlotIdx,
  onPointerDown,
  onPointerMove,
  onPointerUp
}: {
  data: CarriageData;
  fromSlotIdx: number;
  onPointerDown: (e: React.PointerEvent, car: CarriageData, fromSlot: number) => void;
  onPointerMove: (e: React.PointerEvent) => void;
  onPointerUp: (e: React.PointerEvent) => void;
}) {
  return (
    <div
      onPointerDown={(e) => onPointerDown(e, data, fromSlotIdx)}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      className="cursor-grab active:cursor-grabbing touch-none select-none shrink-0"
    >
      <DominoCarriageDisplay data={data} />
    </div>
  );
}
