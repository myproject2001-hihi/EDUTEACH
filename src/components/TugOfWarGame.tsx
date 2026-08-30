import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { Volume2, VolumeX, RotateCw, Maximize2, Minimize2, Trophy, Bot, Users } from 'lucide-react';
import confetti from 'canvas-confetti';
import { MarkdownMath } from './MarkdownMath';
import { ParsedQuestionItem, cleanQuestionText } from '../views/AssignmentsView';
import tugOfWarTeamsImg from '../assets/images/tug_of_war_teams_1788107383919.jpg';

export interface TugOfWarGameProps {
  questions: ParsedQuestionItem[];
  onClose: () => void;
  isStudentMode?: boolean;
  onSubmitWork?: (score: number, correctAnswers: number, answersMap: Record<string, number>) => void;
}

interface ProcessedQuestion {
  id: string;
  q: string;
  options: string[];
  correctIdx: number;
}

// Default educational question bank for fallback
const DEFAULT_QUESTIONS: ProcessedQuestion[] = [
  {
    id: 'def_1',
    q: "Tính diện tích hình tròn bán kính r = 5 cm?",
    options: ["10π cm²", "50π cm²", "25π cm²", "5π cm²"],
    correctIdx: 2
  },
  {
    id: 'def_2',
    q: "Phương trình 2x + 6 = 0 có nghiệm là?",
    options: ["x = 6", "x = -6", "x = -3", "x = 3"],
    correctIdx: 2
  },
  {
    id: 'def_3',
    q: "Thủ đô của Việt Nam là thành phố nào?",
    options: ["Đà Nẵng", "Hà Nội", "TP. Hồ Chí Minh", "Cần Thơ"],
    correctIdx: 1
  },
  {
    id: 'def_4',
    q: "Giá trị của biểu thức: 8 × 7 = ?",
    options: ["54", "56", "64", "48"],
    correctIdx: 1
  },
  {
    id: 'def_5',
    q: "Số nào sau đây là số nguyên tố?",
    options: ["9", "15", "17", "21"],
    correctIdx: 2
  },
  {
    id: 'def_6',
    q: "Đỉnh núi nào cao nhất Việt Nam?",
    options: ["Fansipan", "Mẫu Sơn", "Bà Đen", "Pù Luông"],
    correctIdx: 0
  },
  {
    id: 'def_7',
    q: "Chu vi hình vuông có cạnh a = 6 cm là?",
    options: ["36 cm", "24 cm", "12 cm", "18 cm"],
    correctIdx: 1
  },
  {
    id: 'def_8',
    q: "Tổng các góc trong một tam giác bằng bao nhiêu độ?",
    options: ["90°", "360°", "180°", "270°"],
    correctIdx: 2
  },
  {
    id: 'def_9',
    q: "Phép tính 125 : 5 có kết quả là?",
    options: ["20", "25", "30", "15"],
    correctIdx: 1
  },
  {
    id: 'def_10',
    q: "Hình nào có 4 cạnh bằng nhau và 4 góc vuông?",
    options: ["Hình chữ nhật", "Hình thoi", "Hình vuông", "Hình thang"],
    correctIdx: 2
  }
];

function shuffleArray<T>(array: T[]): T[] {
  const arr = [...array];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

export function TugOfWarGame({
  questions,
  onClose,
  isStudentMode = false,
  onSubmitWork
}: TugOfWarGameProps) {
  // Parse input questions
  const formattedQuestions = useMemo<ProcessedQuestion[]>(() => {
    const list: ProcessedQuestion[] = [];

    if (questions && questions.length > 0) {
      questions.forEach((q, idx) => {
        if (q.question) {
          const rawQ = cleanQuestionText(q.question);
          let opts: string[] = [];
          let correctIdx = 0;

          if (q.options && q.options.length >= 2) {
            opts = q.options.map(o => cleanQuestionText(o));
            if (typeof q.correctAnswer === 'number' && q.correctAnswer >= 0 && q.correctAnswer < opts.length) {
              correctIdx = q.correctAnswer;
            }
          } else if (q.matchingPairs && q.matchingPairs.length >= 2) {
            // For matching questions, convert pair to question & options
            const pair = q.matchingPairs[0];
            rawQ.concat(` (${pair.left})`);
            const allRights = q.matchingPairs.map(p => p.right);
            opts = shuffleArray(allRights);
            correctIdx = opts.indexOf(pair.right);
            if (correctIdx === -1) correctIdx = 0;
          }

          if (rawQ && opts.length >= 2) {
            list.push({
              id: `q_${idx}`,
              q: rawQ,
              options: opts.slice(0, 4),
              correctIdx
            });
          }
        }
      });
    }

    if (list.length < 3) {
      // Append fallback questions if list is small
      DEFAULT_QUESTIONS.forEach((dq) => {
        if (!list.some(item => item.q === dq.q)) {
          list.push(dq);
        }
      });
    }

    return list;
  }, [questions]);

  // State
  const [vsBotMode, setVsBotMode] = useState<boolean>(true); // Default Vs Bot mode
  const [scoreBlue, setScoreBlue] = useState<number>(0);
  const [scoreRed, setScoreRed] = useState<number>(0);
  const [ropeOffset, setRopeOffset] = useState<number>(0); // Range: -140 (Blue wins) to +140 (Red wins)
  const [timeLeft, setTimeLeft] = useState<number>(120); // 2 minutes
  const [isGameOver, setIsGameOver] = useState<boolean>(false);
  const [isMuted, setIsMuted] = useState<boolean>(false);
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);

  // Deck Index
  const [blueDeck, setBlueDeck] = useState<ProcessedQuestion[]>([]);
  const [redDeck, setRedDeck] = useState<ProcessedQuestion[]>([]);
  const [blueIdx, setBlueIdx] = useState<number>(0);
  const [redIdx, setRedIdx] = useState<number>(0);

  // Button flash states
  const [blueFlash, setBlueFlash] = useState<{ idx: number; type: 'correct' | 'wrong' } | null>(null);
  const [redFlash, setRedFlash] = useState<{ idx: number; type: 'correct' | 'wrong' } | null>(null);
  const [pullAnim, setPullAnim] = useState<'left' | 'right' | null>(null);

  // Modal State
  const [modalState, setModalState] = useState<{
    isOpen: boolean;
    title: string;
    desc: string;
    emoji: string;
    type: 'blue' | 'red' | 'draw';
  }>({
    isOpen: false,
    title: '',
    desc: '',
    emoji: '🏆',
    type: 'blue'
  });

  const audioCtxRef = useRef<AudioContext | null>(null);
  const gameContainerRef = useRef<HTMLDivElement>(null);

  // Audio Synthesizer
  const playSound = useCallback((type: 'correct' | 'wrong' | 'tug' | 'win') => {
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
      const now = ctx.currentTime;

      if (type === 'correct') {
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(523.25, now);
        osc.frequency.setValueAtTime(659.25, now + 0.08);
        osc.frequency.setValueAtTime(783.99, now + 0.16);
        gain.gain.setValueAtTime(0.25, now);
        gain.gain.exponentialRampToValueAtTime(0.01, now + 0.35);
        osc.start(now);
        osc.stop(now + 0.35);
      } else if (type === 'wrong') {
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(220, now);
        osc.frequency.setValueAtTime(160, now + 0.12);
        gain.gain.setValueAtTime(0.25, now);
        gain.gain.exponentialRampToValueAtTime(0.01, now + 0.3);
        osc.start(now);
        osc.stop(now + 0.3);
      } else if (type === 'tug') {
        osc.type = 'sine';
        osc.frequency.setValueAtTime(150, now);
        osc.frequency.exponentialRampToValueAtTime(300, now + 0.1);
        gain.gain.setValueAtTime(0.2, now);
        gain.gain.exponentialRampToValueAtTime(0.01, now + 0.15);
        osc.start(now);
        osc.stop(now + 0.15);
      } else if (type === 'win') {
        osc.type = 'square';
        osc.frequency.setValueAtTime(440, now);
        osc.frequency.setValueAtTime(554.37, now + 0.12);
        osc.frequency.setValueAtTime(659.25, now + 0.24);
        osc.frequency.setValueAtTime(880, now + 0.36);
        gain.gain.setValueAtTime(0.3, now);
        gain.gain.exponentialRampToValueAtTime(0.01, now + 0.6);
        osc.start(now);
        osc.stop(now + 0.6);
      }
    } catch {
      // Ignore audio error
    }
  }, [isMuted]);

  // Init Game
  const initGame = useCallback(() => {
    setScoreBlue(0);
    setScoreRed(0);
    setRopeOffset(0);
    setTimeLeft(120);
    setIsGameOver(false);
    setBlueFlash(null);
    setRedFlash(null);
    setPullAnim(null);
    setModalState({ isOpen: false, title: '', desc: '', emoji: '🏆', type: 'blue' });

    setBlueDeck(shuffleArray(formattedQuestions));
    setRedDeck(shuffleArray(formattedQuestions));
    setBlueIdx(0);
    setRedIdx(0);
  }, [formattedQuestions]);

  useEffect(() => {
    initGame();
  }, [initGame, vsBotMode]);

  // Finish Game
  const finishGame = useCallback((reason: 'blue_knockout' | 'red_knockout' | 'timeup', finalBlue: number, finalRed: number, finalOffset: number) => {
    setIsGameOver(true);
    playSound('win');

    let winnerType: 'blue' | 'red' | 'draw' = 'draw';
    let title = 'TRẬN ĐẤU HÒA!';
    let desc = 'Cả hai đội có phong độ ngang tài ngang sức!';
    let emoji = '🤝';

    if (reason === 'blue_knockout' || (reason === 'timeup' && (finalBlue > finalRed || finalOffset < 0))) {
      winnerType = 'blue';
      title = 'ĐỘI XANH CHIẾN THẮNG! 🏆';
      desc = 'Đội Xanh đã xuất sắc kéo ngã đối thủ và giành cúp vô địch!';
      emoji = '🏆';
      confetti({ particleCount: 100, spread: 80, origin: { y: 0.6 } });
    } else if (reason === 'red_knockout' || (reason === 'timeup' && (finalRed > finalBlue || finalOffset > 0))) {
      winnerType = 'red';
      title = 'ĐỘI ĐỎ CHIẾN THẮNG! 🏆';
      desc = 'Đội Đỏ đã áp đảo đối thủ và đoạt cúp vô địch!';
      emoji = '🏆';
      confetti({ particleCount: 100, spread: 80, origin: { y: 0.6 } });
    }

    setModalState({
      isOpen: true,
      title,
      desc,
      emoji,
      type: winnerType
    });

    if (onSubmitWork) {
      const correctRatio = winnerType === 'blue' ? 100 : winnerType === 'draw' ? 50 : 20;
      onSubmitWork(correctRatio, Math.floor(finalBlue / 10), {});
    }
  }, [playSound, onSubmitWork]);

  // Timer countdown
  useEffect(() => {
    if (isGameOver) return;

    const timer = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) {
          clearInterval(timer);
          finishGame('timeup', scoreBlue, scoreRed, ropeOffset);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [isGameOver, scoreBlue, scoreRed, ropeOffset, finishGame]);

  // Pull animation trigger
  const triggerPull = (dir: 'left' | 'right') => {
    setPullAnim(dir);
    setTimeout(() => setPullAnim(null), 400);
  };

  // Handle Answer
  const handleAnswer = (team: 'blue' | 'red', selectedIdx: number) => {
    if (isGameOver) return;

    if (team === 'blue') {
      const qObj = blueDeck[blueIdx % blueDeck.length];
      if (!qObj) return;

      if (selectedIdx === qObj.correctIdx) {
        playSound('correct');
        playSound('tug');
        setBlueFlash({ idx: selectedIdx, type: 'correct' });

        const newScore = scoreBlue + 10;
        const newOffset = Math.max(-140, ropeOffset - 24);
        setScoreBlue(newScore);
        setRopeOffset(newOffset);
        triggerPull('left');

        if (newOffset <= -130) {
          setTimeout(() => finishGame('blue_knockout', newScore, scoreRed, newOffset), 400);
          return;
        }

        setTimeout(() => {
          setBlueFlash(null);
          setBlueIdx(prev => prev + 1);
        }, 350);
      } else {
        playSound('wrong');
        setBlueFlash({ idx: selectedIdx, type: 'wrong' });
        const newOffset = Math.min(140, ropeOffset + 8);
        setRopeOffset(newOffset);
        triggerPull('right');

        if (newOffset >= 130) {
          setTimeout(() => finishGame('red_knockout', scoreBlue, scoreRed, newOffset), 400);
          return;
        }

        setTimeout(() => {
          setBlueFlash(null);
        }, 400);
      }
    } else {
      // Red team
      const qObj = redDeck[redIdx % redDeck.length];
      if (!qObj) return;

      if (selectedIdx === qObj.correctIdx) {
        playSound('correct');
        playSound('tug');
        setRedFlash({ idx: selectedIdx, type: 'correct' });

        const newScore = scoreRed + 10;
        const newOffset = Math.min(140, ropeOffset + 24);
        setScoreRed(newScore);
        setRopeOffset(newOffset);
        triggerPull('right');

        if (newOffset >= 130) {
          setTimeout(() => finishGame('red_knockout', scoreBlue, newScore, newOffset), 400);
          return;
        }

        setTimeout(() => {
          setRedFlash(null);
          setRedIdx(prev => prev + 1);
        }, 350);
      } else {
        playSound('wrong');
        setRedFlash({ idx: selectedIdx, type: 'wrong' });
        const newOffset = Math.max(-140, ropeOffset - 8);
        setRopeOffset(newOffset);
        triggerPull('left');

        if (newOffset <= -130) {
          setTimeout(() => finishGame('blue_knockout', scoreBlue, scoreRed, newOffset), 400);
          return;
        }

        setTimeout(() => {
          setRedFlash(null);
        }, 400);
      }
    }
  };

  // Bot Logic (if vsBotMode is enabled)
  useEffect(() => {
    if (!vsBotMode || isGameOver) return;

    // Bot acts every 3.5 - 5 seconds
    const intervalTime = Math.floor(Math.random() * 1500) + 3500;
    const botTimer = setTimeout(() => {
      if (isGameOver) return;
      const qObj = redDeck[redIdx % redDeck.length];
      if (!qObj) return;

      // Bot has 75% accuracy
      const isCorrect = Math.random() < 0.75;
      let chosenIdx = qObj.correctIdx;
      if (!isCorrect && qObj.options.length > 1) {
        const wrongOpts = qObj.options.map((_, i) => i).filter(i => i !== qObj.correctIdx);
        chosenIdx = wrongOpts[Math.floor(Math.random() * wrongOpts.length)];
      }

      handleAnswer('red', chosenIdx);
    }, intervalTime);

    return () => clearTimeout(botTimer);
  }, [vsBotMode, isGameOver, redDeck, redIdx, ropeOffset, scoreBlue, scoreRed]);

  // Fullscreen toggle
  const toggleFullscreen = () => {
    if (!gameContainerRef.current) return;
    if (!document.fullscreenElement) {
      gameContainerRef.current.requestFullscreen().catch(() => {});
      setIsFullscreen(true);
    } else {
      document.exitFullscreen().catch(() => {});
      setIsFullscreen(false);
    }
  };

  const currentBlueQ = blueDeck[blueIdx % blueDeck.length] || DEFAULT_QUESTIONS[0];
  const currentRedQ = redDeck[redIdx % redDeck.length] || DEFAULT_QUESTIONS[0];

  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  return (
    <div
      ref={gameContainerRef}
      className="flex flex-col h-full w-full bg-slate-950 text-slate-100 overflow-hidden select-none font-sans relative"
    >
      <style>{`
        .q-card-blue {
          background: linear-gradient(145deg, #1e3a8a, #1d4ed8);
          border: 2px solid #3b82f6;
          box-shadow: 0 10px 25px -5px rgba(29, 78, 216, 0.4);
        }
        .q-card-red {
          background: linear-gradient(145deg, #831843, #be123c);
          border: 2px solid #f43f5e;
          box-shadow: 0 10px 25px -5px rgba(190, 18, 60, 0.4);
        }
        .option-btn {
          background-color: #ffffff;
          color: #0f172a;
          border-radius: 16px;
          font-weight: 800;
          font-size: 0.95rem;
          transition: all 0.15s ease-in-out;
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 10px 8px;
          min-height: 52px;
          cursor: pointer;
          border: 3px solid #e2e8f0;
          text-align: center;
        }
        .option-btn:hover {
          transform: translateY(-2px) scale(1.02);
          box-shadow: 0 8px 18px rgba(0, 0, 0, 0.25);
          border-color: #cbd5e1;
        }
        .option-btn:active {
          transform: translateY(1px) scale(0.98);
        }
        .option-btn.correct-flash {
          background-color: #22c55e !important;
          color: #ffffff !important;
          border-color: #16a34a !important;
          animation: pulseSuccess 0.4s ease;
        }
        .option-btn.wrong-flash {
          background-color: #ef4444 !important;
          color: #ffffff !important;
          border-color: #dc2626 !important;
          animation: shakeError 0.4s ease;
        }
        @keyframes pulseSuccess {
          0% { transform: scale(1); }
          50% { transform: scale(1.06); }
          100% { transform: scale(1); }
        }
        @keyframes shakeError {
          0%, 100% { transform: translateX(0); }
          20%, 60% { transform: translateX(-6px); }
          40%, 80% { transform: translateX(6px); }
        }
        .tug-assembly {
          transition: transform 0.4s cubic-bezier(0.34, 1.56, 0.64, 1);
        }
        .pull-left-anim {
          animation: animPullLeft 0.4s ease-in-out;
        }
        .pull-right-anim {
          animation: animPullRight 0.4s ease-in-out;
        }
        @keyframes animPullLeft {
          0% { transform: translateX(${ropeOffset}px); }
          50% { transform: translateX(${ropeOffset - 24}px) rotate(-1.5deg); }
          100% { transform: translateX(${ropeOffset}px); }
        }
        @keyframes animPullRight {
          0% { transform: translateX(${ropeOffset}px); }
          50% { transform: translateX(${ropeOffset + 24}px) rotate(1.5deg); }
          100% { transform: translateX(${ropeOffset}px); }
        }
      `}</style>

      <>
        {/* HEADER CONTROL BAR */}
          <header className="h-14 sm:h-16 bg-slate-900 border-b border-slate-800 px-3 sm:px-5 flex items-center justify-between shrink-0 z-20">
            {/* Title */}
            <div className="flex items-center gap-2 sm:gap-3">
              <span className="text-xl sm:text-2xl">🪢</span>
              <h1 className="text-base sm:text-xl font-black tracking-wide text-amber-400 flex items-center gap-2">
                <span>Kéo Co Kiến Thức</span>
                <span className="text-[10px] sm:text-xs text-slate-300 font-bold px-2 py-0.5 bg-slate-800 rounded-full border border-slate-700 hidden md:inline">
                  {vsBotMode ? 'Đấu Máy' : 'Đối Kháng'}
                </span>
              </h1>
            </div>

            {/* Center Scores & Timer */}
            <div className="flex items-center gap-2 sm:gap-4">
              {/* Blue Score */}
              <div className="bg-gradient-to-r from-blue-700 to-blue-500 border-2 border-blue-400 px-3 py-1 sm:px-4 sm:py-1.5 rounded-full flex items-center gap-1.5 shadow-md">
                <span className="w-2.5 h-2.5 rounded-full bg-blue-300 animate-pulse" />
                <span className="text-xs font-black uppercase text-blue-100 hidden sm:inline">Đội Xanh</span>
                <span className="text-base sm:text-xl font-black text-white">{scoreBlue}</span>
              </div>

              {/* Timer */}
              <div className="bg-slate-900 border-2 border-slate-700 px-3 py-1 sm:px-5 sm:py-1.5 rounded-2xl flex items-center gap-1.5 shadow-md">
                <span className="text-base sm:text-lg">⏰</span>
                <span className={`text-base sm:text-xl font-black font-mono tracking-wider ${timeLeft <= 20 ? 'text-rose-400 animate-ping' : 'text-amber-300'}`}>
                  {formatTime(timeLeft)}
                </span>
              </div>

              {/* Red Score */}
              <div className="bg-gradient-to-r from-rose-700 to-rose-500 border-2 border-rose-400 px-3 py-1 sm:px-4 sm:py-1.5 rounded-full flex items-center gap-1.5 shadow-md">
                <span className="text-base sm:text-xl font-black text-white">{scoreRed}</span>
                <span className="text-xs font-black uppercase text-rose-100 hidden sm:inline">
                  {vsBotMode ? 'Máy (Đỏ)' : 'Đội Đỏ'}
                </span>
                <span className="w-2.5 h-2.5 rounded-full bg-rose-300 animate-pulse" />
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex items-center gap-1.5 sm:gap-2">
              {/* Mode Switcher */}
              <button
                type="button"
                onClick={() => setVsBotMode(!vsBotMode)}
                className="px-2.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold rounded-xl border border-slate-700 flex items-center gap-1.5 transition active:scale-95"
                title={vsBotMode ? "Chuyển sang Chế độ Đối Kháng" : "Chuyển sang Chế độ Đấu Với Máy"}
              >
                {vsBotMode ? <Bot className="w-4 h-4 text-rose-400" /> : <Users className="w-4 h-4 text-emerald-400" />}
                <span className="hidden lg:inline">{vsBotMode ? 'Chơi Với Máy' : 'Chơi Đối Kháng'}</span>
              </button>

              {/* Sound */}
              <button
                type="button"
                onClick={() => setIsMuted(!isMuted)}
                className="p-2 sm:px-3 sm:py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold rounded-xl border border-slate-700 flex items-center gap-1.5 transition active:scale-95"
              >
                {isMuted ? <VolumeX className="w-4 h-4 text-slate-400" /> : <Volume2 className="w-4 h-4 text-amber-400" />}
                <span className="hidden xl:inline">Âm thanh</span>
              </button>

              {/* Fullscreen */}
              <button
                type="button"
                onClick={toggleFullscreen}
                className="p-2 sm:px-3 sm:py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold rounded-xl border border-slate-700 flex items-center gap-1.5 transition active:scale-95"
              >
                {isFullscreen ? <Minimize2 className="w-4 h-4 text-cyan-400" /> : <Maximize2 className="w-4 h-4 text-cyan-400" />}
              </button>

              {/* Restart */}
              <button
                type="button"
                onClick={initGame}
                className="p-2 sm:px-3 sm:py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold rounded-xl border border-slate-700 flex items-center gap-1.5 transition active:scale-95"
                title="Chơi lại"
              >
                <RotateCw className="w-4 h-4 text-emerald-400" />
              </button>
            </div>
          </header>

          {/* MAIN ARENA GRID (3 Columns) */}
          <main className="flex-1 grid grid-cols-1 lg:grid-cols-12 p-2 sm:p-3 md:p-4 gap-3 overflow-hidden relative">
            
            {/* ================= LEFT COLUMN: ĐỘI XANH ================= */}
            <section className="lg:col-span-4 flex flex-col justify-between gap-2.5 h-full">
              {/* Question Card */}
              <div className="q-card-blue rounded-2xl p-4 sm:p-5 flex-1 flex flex-col justify-center items-center text-center relative overflow-hidden min-h-[140px]">
                <div className="absolute top-2.5 left-3 text-[10px] sm:text-xs font-black uppercase text-blue-200 tracking-wider flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-blue-300" /> Đội Xanh - Câu hỏi
                </div>
                <div className="text-base sm:text-xl font-black text-white leading-relaxed my-auto pt-4">
                  <MarkdownMath content={currentBlueQ.q} />
                </div>
              </div>

              {/* Options Grid (2x2) */}
              <div className="grid grid-cols-2 gap-2 sm:gap-2.5 h-44 sm:h-48 shrink-0">
                {currentBlueQ.options.map((optText, i) => {
                  const isCorrectFlash = blueFlash?.idx === i && blueFlash.type === 'correct';
                  const isWrongFlash = blueFlash?.idx === i && blueFlash.type === 'wrong';

                  return (
                    <button
                      key={i}
                      type="button"
                      onClick={() => handleAnswer('blue', i)}
                      className={`option-btn ${isCorrectFlash ? 'correct-flash' : ''} ${isWrongFlash ? 'wrong-flash' : ''}`}
                    >
                      <MarkdownMath content={optText} />
                    </button>
                  );
                })}
              </div>
            </section>

            {/* ================= CENTER COLUMN: TUG OF WAR ARENA ================= */}
            <section className="lg:col-span-4 bg-slate-50 rounded-2xl border-2 border-slate-200 shadow-2xl flex flex-col items-center justify-between p-2 sm:p-3 relative overflow-hidden h-full">
              {/* Banner */}
              <div className="w-full flex justify-between items-center px-3 py-1 bg-slate-200/80 rounded-xl text-[10px] sm:text-xs font-black text-slate-700">
                <span className="text-blue-700">◀ ĐỘI XANH</span>
                <span className="text-amber-700 font-extrabold">VẠCH GIỮA</span>
                <span className="text-rose-700">{vsBotMode ? 'MÁY (ĐỎ) ▶' : 'ĐỘI ĐỎ ▶'}</span>
              </div>

              {/* Tug Arena Graphic with Illustration */}
              <div className="w-full flex-1 flex flex-col items-center justify-center relative my-auto overflow-hidden min-h-[220px]">
                {/* Center Line Marker & Win Thresholds */}
                <div className="absolute inset-y-2 left-1/2 w-0.5 border-l-2 border-dashed border-emerald-500/70 z-10 pointer-events-none flex flex-col items-center justify-between py-1">
                  <span className="text-[9px] font-black uppercase tracking-wider bg-emerald-600/90 text-white px-2 py-0.5 rounded-full shadow-sm">
                    Vạch Giữa
                  </span>
                  <div className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
                </div>

                {/* Blue Win Zone Indicator (Left) */}
                <div className="absolute left-2 inset-y-6 w-1 border-r-2 border-dashed border-blue-400/40 pointer-events-none flex items-center">
                  <span className="text-[8px] font-black text-blue-500 -rotate-90 origin-left uppercase tracking-tighter">Thắng (Xanh)</span>
                </div>

                {/* Red Win Zone Indicator (Right) */}
                <div className="absolute right-2 inset-y-6 w-1 border-l-2 border-dashed border-rose-400/40 pointer-events-none flex items-center justify-end">
                  <span className="text-[8px] font-black text-rose-500 rotate-90 origin-right uppercase tracking-tighter">Thắng (Đỏ)</span>
                </div>

                {/* TUG OF WAR ILLUSTRATION (Translated smoothly with ropeOffset) */}
                <div
                  className={`tug-assembly w-full flex items-center justify-center transition-transform duration-300 ${
                    pullAnim === 'left' ? 'pull-left-anim' : pullAnim === 'right' ? 'pull-right-anim' : ''
                  }`}
                  style={{
                    transform: `translateX(${ropeOffset * 1.35}px)`
                  }}
                >
                  <img
                    src={tugOfWarTeamsImg}
                    alt="Đội Kéo Co Kiến Thức"
                    className="w-full max-w-[560px] max-h-[260px] object-contain drop-shadow-lg select-none pointer-events-none mix-blend-multiply"
                    referrerPolicy="no-referrer"
                  />
                </div>
              </div>

              {/* Status Bar */}
              <div className="w-full text-center py-1.5 px-3 bg-slate-100 rounded-xl font-black text-xs sm:text-sm text-slate-800 shadow-inner">
                {ropeOffset < -40 ? (
                  <span className="text-blue-600">🔥 Đội Xanh đang thế thượng phong! Kéo tiếp nào!</span>
                ) : ropeOffset > 40 ? (
                  <span className="text-rose-600">🔥 Đội Đỏ đang lấn lướt! Nhanh tay lên nào!</span>
                ) : (
                  <span>⚡ Chọn đáp án đúng để kéo dây về phía đội mình!</span>
                )}
              </div>
            </section>

            {/* ================= RIGHT COLUMN: ĐỘI ĐỎ ================= */}
            <section className="lg:col-span-4 flex flex-col justify-between gap-2.5 h-full">
              {/* Question Card */}
              <div className="q-card-red rounded-2xl p-4 sm:p-5 flex-1 flex flex-col justify-center items-center text-center relative overflow-hidden min-h-[140px]">
                <div className="absolute top-2.5 right-3 text-[10px] sm:text-xs font-black uppercase text-rose-200 tracking-wider flex items-center gap-1.5">
                  {vsBotMode ? 'Máy (Đỏ) - Câu hỏi' : 'Đội Đỏ - Câu hỏi'} <span className="w-2 h-2 rounded-full bg-rose-300" />
                </div>
                <div className="text-base sm:text-xl font-black text-white leading-relaxed my-auto pt-4">
                  <MarkdownMath content={currentRedQ.q} />
                </div>
              </div>

              {/* Options Grid (2x2) */}
              <div className="grid grid-cols-2 gap-2 sm:gap-2.5 h-44 sm:h-48 shrink-0">
                {currentRedQ.options.map((optText, i) => {
                  const isCorrectFlash = redFlash?.idx === i && redFlash.type === 'correct';
                  const isWrongFlash = redFlash?.idx === i && redFlash.type === 'wrong';

                  return (
                    <button
                      key={i}
                      type="button"
                      disabled={vsBotMode}
                      onClick={() => handleAnswer('red', i)}
                      className={`option-btn ${isCorrectFlash ? 'correct-flash' : ''} ${isWrongFlash ? 'wrong-flash' : ''} ${
                        vsBotMode ? 'cursor-not-allowed opacity-90' : ''
                      }`}
                    >
                      <MarkdownMath content={optText} />
                    </button>
                  );
                })}
              </div>
            </section>
          </main>

          {/* GAME OVER MODAL OVERLAY */}
          {modalState.isOpen && (
            <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4 z-50 animate-fade-in">
              <div className="bg-slate-900 border-4 border-amber-400 p-6 sm:p-8 rounded-3xl text-center max-w-md w-full shadow-2xl relative flex flex-col items-center">
                <div className="text-5xl sm:text-7xl mb-3 animate-bounce">
                  {modalState.emoji}
                </div>
                <h2 className="text-xl sm:text-3xl font-black text-amber-400 mb-2">
                  {modalState.title}
                </h2>
                <p className="text-slate-300 font-bold mb-6 text-xs sm:text-sm leading-relaxed">
                  {modalState.desc}
                </p>

                {/* Final Score Board */}
                <div className="flex justify-center items-center gap-6 bg-slate-800/90 p-4 rounded-2xl mb-6 border border-slate-700 w-full">
                  <div className="text-center flex-1">
                    <div className="text-xs text-blue-400 font-black uppercase">Đội Xanh</div>
                    <div className="text-2xl sm:text-3xl font-black text-white">{scoreBlue}</div>
                  </div>
                  <div className="text-2xl font-black text-slate-500">:</div>
                  <div className="text-center flex-1">
                    <div className="text-xs text-rose-400 font-black uppercase">
                      {vsBotMode ? 'Máy (Đỏ)' : 'Đội Đỏ'}
                    </div>
                    <div className="text-2xl sm:text-3xl font-black text-white">{scoreRed}</div>
                  </div>
                </div>

                <div className="flex flex-col gap-2.5 w-full">
                  <button
                    type="button"
                    onClick={initGame}
                    className="w-full bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-black py-3 px-6 rounded-2xl shadow-lg text-sm sm:text-base transition transform active:scale-95 flex items-center justify-center gap-2"
                  >
                    <RotateCw className="w-5 h-5" />
                    <span>CHƠI LẠI TRẬN MỚI</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setVsBotMode(!vsBotMode);
                      setModalState(prev => ({ ...prev, isOpen: false }));
                    }}
                    className="w-full bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold py-3 px-6 rounded-2xl border border-slate-700 transition transform active:scale-95 flex items-center justify-center gap-2"
                  >
                    {vsBotMode ? <Users className="w-4 h-4 text-emerald-400" /> : <Bot className="w-4 h-4 text-rose-400" />}
                    <span>{vsBotMode ? 'CHUYỂN SANG ĐỐI KHÁNG' : 'CHUYỂN SANG ĐẤU MÁY'}</span>
                  </button>
                </div>
              </div>
            </div>
          )}
        </>
    </div>
  );
}
