import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { 
  Volume2, VolumeX, RotateCw, Trophy, HelpCircle, Flame, Clock, 
  Sparkles, Award, CheckCircle2, XCircle, ArrowRight, Play, 
  ChevronRight, X, Music
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import confetti from 'canvas-confetti';
import { MarkdownMath } from './MarkdownMath';
import { ParsedQuestionItem, cleanQuestionText } from '../views/AssignmentsView';
import { gameAudio, getSoundConfig, saveSoundConfig } from '../utils/gameAudio';

export interface WhackAMoleGameProps {
  questions: ParsedQuestionItem[];
  onClose: () => void;
  isStudentMode?: boolean;
  onSubmitWork?: (score: number, correctAnswers: number, answersMap: Record<string, number>) => void;
  isReady?: boolean;
}

export interface MoleQuestion {
  id: string;
  question: string;
  options: string[];
  correctIndex: number;
  explanation?: string;
  img?: string;
}

interface FloatingHitFx {
  id: number;
  x: number;
  y: number;
  text: string;
  isPositive: boolean;
}

interface QuestionReviewItem {
  question: string;
  userChoice: string;
  correctChoice: string;
  isCorrect: boolean;
  explanation?: string;
}

const DEFAULT_MOLE_QUESTIONS: MoleQuestion[] = [
  {
    id: 'm_1',
    question: "Tính kết quả phép tính: 15 + 28 = ?",
    options: ["41", "43", "33", "53"],
    correctIndex: 1,
    explanation: "15 + 28 = 43."
  },
  {
    id: 'm_2',
    question: "Số nào lớn nhất trong các số sau?",
    options: ["89", "98", "88", "92"],
    correctIndex: 1,
    explanation: "Số 98 lớn hơn 89, 88 và 92."
  },
  {
    id: 'm_3',
    question: "Kết quả của phép nhân: 7 × 8 = ?",
    options: ["54", "56", "64", "48"],
    correctIndex: 1,
    explanation: "7 × 8 = 56."
  },
  {
    id: 'm_4',
    question: "Một hình vuông có cạnh 5cm. Chu vi hình vuông là bao nhiêu?",
    options: ["20 cm", "25 cm", "15 cm", "10 cm"],
    correctIndex: 0,
    explanation: "Chu vi = Cạnh × 4 = 5 × 4 = 20 cm."
  },
  {
    id: 'm_5',
    question: "Thủ đô của nước CHXHCN Việt Nam là thành phố nào?",
    options: ["TP. Hồ Chí Minh", "Hà Nội", "Đà Nẵng", "Huế"],
    correctIndex: 1,
    explanation: "Thủ đô của Việt Nam là Hà Nội."
  }
];

export function WhackAMoleGame({
  questions,
  onClose,
  isStudentMode = false,
  onSubmitWork,
  isReady = true
}: WhackAMoleGameProps) {
  // Parse incoming questions
  const parsedQuestions = useMemo<MoleQuestion[]>(() => {
    if (!questions || questions.length === 0) {
      return DEFAULT_MOLE_QUESTIONS;
    }

    const list: MoleQuestion[] = [];
    questions.forEach((q, idx) => {
      const qText = cleanQuestionText(q.question || `Câu hỏi ${idx + 1}`);
      let opts = q.options && q.options.length > 0 ? [...q.options] : [];
      let cIdx = typeof q.correctAnswer === 'number' ? q.correctAnswer : 0;

      // True/False question format normalization
      if (q.type === 'true_false' && opts.length === 0) {
        opts = ['Đúng', 'Sai'];
        cIdx = (q.correctAnswer as any) === true || q.correctAnswer === 0 ? 0 : 1;
      }

      // If matching question
      if (q.matchingPairs && q.matchingPairs.length > 0 && opts.length === 0) {
        const firstPair = q.matchingPairs[0];
        opts = q.matchingPairs.map(p => p.right);
        cIdx = 0;
      }

      if (opts.length < 2) {
        opts = ['Đáp án A', 'Đáp án B', 'Đáp án C', 'Đáp án D'];
      }

      list.push({
        id: q.id || `q_${idx}`,
        question: qText,
        options: opts,
        correctIndex: Math.max(0, Math.min(cIdx, opts.length - 1)),
        explanation: (q as any).explanation || (q as any).hint || '',
        img: (q as any).image || (q as any).imageUrl
      });
    });

    return list.length > 0 ? list : DEFAULT_MOLE_QUESTIONS;
  }, [questions]);

  // Game flow states
  const [currentScreen, setCurrentScreen] = useState<'game' | 'results'>('game');
  const [currentQIndex, setCurrentQIndex] = useState(0);

  // Settings
  const [timerSetting, setTimerSetting] = useState(30); // 15, 30, 60, 0 (infinite)
  const [speedLevel, setSpeedLevel] = useState<1 | 2 | 3>(2); // 1: Chậm, 2: Vừa, 3: Nhanh

  // In-game stats
  const [score, setScore] = useState(0);
  const [streak, setStreak] = useState(0);
  const [maxStreak, setMaxStreak] = useState(0);
  const [timeLeft, setTimeLeft] = useState(30);
  const [soundConfig, setSoundConfig] = useState(getSoundConfig);
  const [questionHistory, setQuestionHistory] = useState<QuestionReviewItem[]>([]);

  // Mole state: 6 holes
  // up: boolean, hit: boolean, optionText: string, isCorrect: boolean
  const [moles, setMoles] = useState<Array<{
    up: boolean;
    hit: boolean;
    text: string;
    isCorrect: boolean;
  }>>([
    { up: false, hit: false, text: '', isCorrect: false },
    { up: false, hit: false, text: '', isCorrect: false },
    { up: false, hit: false, text: '', isCorrect: false },
    { up: false, hit: false, text: '', isCorrect: false },
    { up: false, hit: false, text: '', isCorrect: false },
    { up: false, hit: false, text: '', isCorrect: false }
  ]);

  // Floating hit FX
  const [hitEffects, setHitEffects] = useState<FloatingHitFx[]>([]);

  // Hammer position & animation refs
  const [hammerPos, setHammerPos] = useState({ x: -100, y: -100 });
  const [isHammerSwinging, setIsHammerSwinging] = useState(false);
  const [showHammer, setShowHammer] = useState(false);
  const [showHelpModal, setShowHelpModal] = useState(false);

  // Refs for high performance DOM mutation & timers
  const hammerRef = useRef<HTMLDivElement>(null);
  const rafIdRef = useRef<number | null>(null);
  const timerIntervalRef = useRef<number | NodeJS.Timeout | null>(null);
  const moleLoopTimersRef = useRef<Array<number | NodeJS.Timeout>>([]);
  const gameContainerRef = useRef<HTMLDivElement>(null);

  // Sound Synthesizer via centralized gameAudio
  const playSound = useCallback((type: 'whack' | 'correct' | 'wrong' | 'pop' | 'swing' | 'combo' | 'miss') => {
    if (type === 'whack') gameAudio.playWhack();
    else if (type === 'correct') gameAudio.playWhackCorrect();
    else if (type === 'wrong') gameAudio.playWhackWrong();
    else if (type === 'miss') gameAudio.playWhackMiss();
    else if (type === 'pop') gameAudio.playMolePop();
    else if (type === 'swing') gameAudio.playHammerSwing();
    else if (type === 'combo') gameAudio.playCombo(streak);
  }, [streak]);

  // Listen to external sound settings changes
  useEffect(() => {
    const handleSoundChange = (e: any) => {
      if (e.detail) setSoundConfig(e.detail);
    };
    window.addEventListener('game-sound-config-changed', handleSoundChange);
    return () => {
      window.removeEventListener('game-sound-config-changed', handleSoundChange);
    };
  }, []);

  // Background Music (BGM) lifecycle in Whack A Mole
  useEffect(() => {
    if (currentScreen === 'game' && isReady) {
      gameAudio.startBgm('arcade');
    } else {
      gameAudio.stopBgm();
    }
    return () => {
      gameAudio.stopBgm();
    };
  }, [currentScreen, isReady]);

  // Quick sound mode toggle
  const toggleSound = () => {
    const nextMaster = !soundConfig.masterEnabled;
    const updated = saveSoundConfig({ masterEnabled: nextMaster });
    setSoundConfig(updated);
  };

  const toggleBgm = () => {
    const nextBgm = !soundConfig.bgmEnabled;
    const updated = saveSoundConfig({ bgmEnabled: nextBgm });
    setSoundConfig(updated);
    if (nextBgm && soundConfig.masterEnabled && currentScreen === 'game') {
      gameAudio.startBgm('arcade');
    } else {
      gameAudio.stopBgm();
    }
  };

  // Haptic feedback function for mobile devices
  const triggerVibration = useCallback((pattern: number | number[] = 40) => {
    try {
      if (typeof window !== 'undefined' && 'navigator' in window && typeof navigator.vibrate === 'function') {
        navigator.vibrate(pattern);
      }
    } catch {
      // Ignore vibration unsupported errors
    }
  }, []);

  // Clean all timers
  const clearAllTimers = useCallback(() => {
    if (timerIntervalRef.current !== null) {
      clearInterval(timerIntervalRef.current as any);
      cancelAnimationFrame(timerIntervalRef.current as any);
      timerIntervalRef.current = null;
    }
    moleLoopTimersRef.current.forEach(t => {
      clearTimeout(t as any);
      clearInterval(t as any);
      cancelAnimationFrame(t as any);
    });
    moleLoopTimersRef.current = [];
  }, []);

  useEffect(() => {
    return () => {
      clearAllTimers();
      gameAudio.stopBgm();
    };
  }, [clearAllTimers]);

  // Trigger hammer swing
  const triggerHammerSwing = (clientX?: number, clientY?: number) => {
    if (clientX !== undefined && clientY !== undefined) {
      const x = clientX - 25;
      const y = clientY - 45;
      setHammerPos({ x, y });
      if (hammerRef.current) {
        hammerRef.current.style.transform = `translate3d(${x - 12}px, ${y - 12}px, 0)`;
      }
    }
    setIsHammerSwinging(false);
    setTimeout(() => setIsHammerSwinging(true), 10);
    setTimeout(() => setIsHammerSwinging(false), 200);
  };

  // High-performance Mouse move handler for hammer using RAF
  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (currentScreen === 'game') {
      if (!showHammer) setShowHammer(true);
      const x = e.clientX - 25;
      const y = e.clientY - 45;
      if (rafIdRef.current) cancelAnimationFrame(rafIdRef.current);
      rafIdRef.current = requestAnimationFrame(() => {
        if (hammerRef.current) {
          hammerRef.current.style.transform = `translate3d(${x - 12}px, ${y - 12}px, 0)`;
        }
      });
    }
  };

  // Touch move handler
  const handleTouchMove = (e: React.TouchEvent<HTMLDivElement>) => {
    if (currentScreen === 'game' && e.touches.length > 0) {
      if (!showHammer) setShowHammer(true);
      const touch = e.touches[0];
      const x = touch.clientX - 25;
      const y = touch.clientY - 45;
      if (rafIdRef.current) cancelAnimationFrame(rafIdRef.current);
      rafIdRef.current = requestAnimationFrame(() => {
        if (hammerRef.current) {
          hammerRef.current.style.transform = `translate3d(${x - 12}px, ${y - 12}px, 0)`;
        }
      });
    }
  };

  // Spawn visual hit effect
  const spawnHitFx = (x: number, y: number, text: string, isPositive: boolean) => {
    const newFx: FloatingHitFx = {
      id: Date.now() + Math.random(),
      x,
      y,
      text,
      isPositive
    };
    setHitEffects(prev => [...prev, newFx]);
    setTimeout(() => {
      setHitEffects(prev => prev.filter(item => item.id !== newFx.id));
    }, 800);
  };

  // Start Mole Popping Engine for current question
  const startMolePopping = useCallback((currentQuestion: MoleQuestion) => {
    clearAllTimers();

    const popInterval = speedLevel === 3 ? 1100 : speedLevel === 2 ? 1600 : 2300;
    const stayUpTime = speedLevel === 3 ? 1400 : speedLevel === 2 ? 2000 : 2800;

    // Distribute options across 6 holes
    const optionsPool: Array<{ text: string; isCorrect: boolean }> = [];
    currentQuestion.options.forEach((opt, idx) => {
      optionsPool.push({
        text: opt,
        isCorrect: idx === currentQuestion.correctIndex
      });
    });

    // Fill distractors if < 6
    const distractors = ["Thử lại nhé!", "Chưa đúng!", "Gần đúng!", "Sai rồi!"];
    let distractorIdx = 0;
    while (optionsPool.length < 6) {
      optionsPool.push({
        text: distractors[distractorIdx % distractors.length],
        isCorrect: false
      });
      distractorIdx++;
    }

    // Set initial mole array with down state
    setMoles(optionsPool.map(op => ({
      up: false,
      hit: false,
      text: op.text,
      isCorrect: op.isCorrect
    })));

    // Mole popping function
    const popRandomMole = () => {
      setMoles(prevMoles => {
        const inactiveIndices: number[] = [];
        prevMoles.forEach((m, i) => {
          if (!m.up && !m.hit) inactiveIndices.push(i);
        });

        if (inactiveIndices.length === 0) return prevMoles;

        const pickIndex = inactiveIndices[Math.floor(Math.random() * inactiveIndices.length)];
        playSound('pop');

        // Schedule pull down
        const downTimer = setTimeout(() => {
          setMoles(curMoles => {
            if (curMoles[pickIndex] && curMoles[pickIndex].up && !curMoles[pickIndex].hit) {
              return curMoles.map((m, idx) => idx === pickIndex ? { ...m, up: false } : m);
            }
            return curMoles;
          });
        }, stayUpTime);

        moleLoopTimersRef.current.push(downTimer);

        return prevMoles.map((m, idx) => idx === pickIndex ? { ...m, up: true } : m);
      });
    };

    // Pop first 2 moles quickly
    popRandomMole();
    const t1 = setTimeout(popRandomMole, 450);
    moleLoopTimersRef.current.push(t1);

    // Continuous pop loop using requestAnimationFrame
    let lastPopTime = performance.now();
    let popRafId: number;

    const loopStep = (now: number) => {
      if (now - lastPopTime >= popInterval) {
        popRandomMole();
        lastPopTime = now;
      }
      popRafId = requestAnimationFrame(loopStep);
    };

    popRafId = requestAnimationFrame(loopStep);
    moleLoopTimersRef.current.push(popRafId);
  }, [speedLevel, clearAllTimers, playSound]);

  // Handle Question Timeout
  const handleTimeout = useCallback(() => {
    playSound('wrong');
    setStreak(0);

    const q = parsedQuestions[currentQIndex];
    setQuestionHistory(prev => [
      ...prev,
      {
        question: q.question,
        userChoice: "Hết thời gian",
        correctChoice: q.options[q.correctIndex] || '',
        isCorrect: false,
        explanation: q.explanation
      }
    ]);

    // Next question or End Game
    setTimeout(() => {
      if (currentQIndex + 1 < parsedQuestions.length) {
        setCurrentQIndex(prev => prev + 1);
      } else {
        finishGame();
      }
    }, 900);
  }, [currentQIndex, parsedQuestions, playSound]);

  // Load question setup
  useEffect(() => {
    if (currentScreen !== 'game') return;

    if (!isReady) {
      clearAllTimers();
      return;
    }

    if (currentQIndex >= parsedQuestions.length) {
      finishGame();
      return;
    }

    const curQ = parsedQuestions[currentQIndex];
    startMolePopping(curQ);

    // Setup Timer with requestAnimationFrame
    if (timerSetting > 0) {
      setTimeLeft(timerSetting);
      if (timerIntervalRef.current !== null) {
        clearInterval(timerIntervalRef.current as any);
        cancelAnimationFrame(timerIntervalRef.current as any);
      }

      let lastSecTime = performance.now();
      let timerRafId: number;

      const stepTimer = (now: number) => {
        if (now - lastSecTime >= 1000) {
          lastSecTime = now;
          setTimeLeft(prev => {
            if (prev <= 1) {
              cancelAnimationFrame(timerRafId);
              handleTimeout();
              return 0;
            }
            return prev - 1;
          });
        }
        timerRafId = requestAnimationFrame(stepTimer);
        timerIntervalRef.current = timerRafId;
      };

      timerRafId = requestAnimationFrame(stepTimer);
      timerIntervalRef.current = timerRafId;
    } else {
      setTimeLeft(0);
    }

    return () => {
      clearAllTimers();
    };
  }, [currentScreen, currentQIndex, parsedQuestions, timerSetting, startMolePopping, handleTimeout, clearAllTimers, isReady]);

  // Field click handler for misses (clicking empty grass / missed mole hole)
  const handleFieldClickMiss = (e: React.MouseEvent | React.TouchEvent) => {
    let clientX = window.innerWidth / 2;
    let clientY = window.innerHeight / 2;
    if ('clientX' in e && typeof e.clientX === 'number') {
      clientX = e.clientX;
      clientY = e.clientY;
    } else if ('touches' in e && e.touches.length > 0) {
      clientX = e.touches[0].clientX;
      clientY = e.touches[0].clientY;
    }

    triggerHammerSwing(clientX, clientY);
    playSound('miss');
    spawnHitFx(clientX, clientY, 'Trượt!', false);
  };

  // Whack mole handler
  const handleWhackMole = (moleIdx: number, e: React.MouseEvent | React.TouchEvent) => {
    e.stopPropagation();

    // Coordinates for FX
    let clientX = window.innerWidth / 2;
    let clientY = window.innerHeight / 2;
    if ('clientX' in e && typeof e.clientX === 'number') {
      clientX = e.clientX;
      clientY = e.clientY;
    } else if ('touches' in e && e.touches.length > 0) {
      clientX = e.touches[0].clientX;
      clientY = e.touches[0].clientY;
    }

    triggerHammerSwing(clientX, clientY);

    const targetMole = moles[moleIdx];
    if (!targetMole || !targetMole.up || targetMole.hit) {
      playSound('miss');
      spawnHitFx(clientX, clientY, 'Trượt!', false);
      return;
    }

    // Mark mole as hit
    setMoles(prev => prev.map((m, idx) => idx === moleIdx ? { ...m, hit: true } : m));

    const curQ = parsedQuestions[currentQIndex];
    const isCorrect = targetMole.isCorrect;

    spawnHitFx(clientX, clientY, isCorrect ? `+${100 + (streak * 10)}` : '-50', isCorrect);

    if (isCorrect) {
      triggerVibration([30, 40, 60]); // Light rhythmic vibration on correct whack
      playSound('correct');
      if (streak >= 1) {
        setTimeout(() => playSound('combo'), 150);
      }
      const addScore = 100 + (streak * 10);
      setScore(prev => prev + addScore);
      setStreak(prev => {
        const nextStreak = prev + 1;
        setMaxStreak(ms => Math.max(ms, nextStreak));
        return nextStreak;
      });

      setQuestionHistory(prev => [
        ...prev,
        {
          question: curQ.question,
          userChoice: targetMole.text,
          correctChoice: curQ.options[curQ.correctIndex] || '',
          isCorrect: true,
          explanation: curQ.explanation
        }
      ]);

      clearAllTimers();

      // Next Question
      setTimeout(() => {
        if (currentQIndex + 1 < parsedQuestions.length) {
          setCurrentQIndex(prev => prev + 1);
        } else {
          finishGame();
        }
      }, 800);
    } else {
      triggerVibration([60, 50, 60]); // Double buzz on wrong whack
      playSound('wrong');
      setScore(prev => Math.max(0, prev - 50));
      setStreak(0);

      // Hide wrong mole after flash
      setTimeout(() => {
        setMoles(prev => prev.map((m, idx) => idx === moleIdx ? { ...m, up: false, hit: false } : m));
      }, 500);
    }
  };

  // Start Game from Menu
  const startGame = () => {
    setScore(0);
    setStreak(0);
    setMaxStreak(0);
    setCurrentQIndex(0);
    setQuestionHistory([]);
    setCurrentScreen('game');
  };

  // Finish Game & Show Results
  const finishGame = () => {
    clearAllTimers();
    gameAudio.stopBgm();
    gameAudio.playVictory();
    setCurrentScreen('results');
    confetti({
      particleCount: 80,
      spread: 70,
      origin: { y: 0.6 }
    });
  };

  // Submit Work for Assignment
  const handleSubmitWork = () => {
    if (onSubmitWork) {
      const correctCount = questionHistory.filter(q => q.isCorrect).length;
      const answersMap: Record<string, number> = {};
      parsedQuestions.forEach((q, idx) => {
        const hist = questionHistory[idx];
        answersMap[q.id] = hist && hist.isCorrect ? 1 : 0;
      });
      onSubmitWork(score, correctCount, answersMap);
    }
    onClose();
  };

  // Results calculation
  const totalQ = parsedQuestions.length;
  const correctCount = questionHistory.filter(q => q.isCorrect).length;
  const accuracy = totalQ > 0 ? Math.round((correctCount / totalQ) * 100) : 0;

  return (
    <div
      ref={gameContainerRef}
      onMouseMove={handleMouseMove}
      onTouchMove={handleTouchMove}
      className={`w-full h-full flex flex-col text-slate-800 select-none overflow-hidden relative font-sans rounded-2xl sm:rounded-3xl border border-emerald-400/30 shadow-inner ${
        currentScreen === 'game' ? 'cursor-none' : ''
      }`}
      style={{
        background: 'linear-gradient(180deg, #38bdf8 0%, #7dd3fc 38%, #4ade80 38%, #16a34a 70%, #15803d 100%)'
      }}
      id="whack-a-mole-container"
    >
      {/* Dynamic Style Animations */}
      <style>{`
        .mole-wrapper {
          transition: transform 0.24s cubic-bezier(0.175, 0.885, 0.32, 1.275);
          transform: translateY(115%);
          will-change: transform;
        }
        .mole-wrapper.up {
          transform: translateY(0%);
        }
        .mole-wrapper.hit {
          transform: translateY(28%) scale(0.95);
          transition: transform 0.1s ease-in;
        }
        .hammer-swing {
          animation: hammerSwingAnim 0.22s cubic-bezier(0.2, 0.8, 0.2, 1);
        }
        @keyframes hammerSwingAnim {
          0% { transform: rotate(0deg) scale(1); }
          30% { transform: rotate(-35deg) scale(1.1) translate(-4px, -6px); }
          70% { transform: rotate(32deg) scale(1.18) translate(4px, 6px); }
          100% { transform: rotate(0deg) scale(1); }
        }
        .hit-effect-float {
          position: absolute;
          pointer-events: none;
          animation: floatUpFade 0.8s ease-out forwards;
          z-index: 100;
        }
        @keyframes floatUpFade {
          0% { opacity: 1; transform: translateY(0) scale(0.8); }
          50% { opacity: 1; transform: translateY(-25px) scale(1.2); }
          100% { opacity: 0; transform: translateY(-50px) scale(1); }
        }
        .bubble-arrow::after {
          content: '';
          position: absolute;
          bottom: -10px;
          left: 50%;
          transform: translateX(-50%);
          border-width: 10px 10px 0;
          border-style: solid;
          border-color: #ffffff transparent;
          display: block;
          width: 0;
        }
      `}</style>

      {/* CUSTOM HAMMER CURSOR (Visible in active gameplay) */}
      {currentScreen === 'game' && showHammer && (
        <div
          ref={hammerRef}
          className={`fixed pointer-events-none z-50 w-20 h-20 sm:w-24 sm:h-24 md:w-28 md:h-28 drop-shadow-md ${
            isHammerSwinging ? 'hammer-swing' : ''
          }`}
          style={{
            top: 0,
            left: 0,
            transform: `translate3d(${hammerPos.x - 12}px, ${hammerPos.y - 12}px, 0)`,
            transformOrigin: '78% 78%',
            willChange: 'transform'
          }}
        >
          <svg viewBox="0 0 120 120" className="w-full h-full overflow-visible">
            <defs>
              {/* Wood Handle Gradient */}
              <linearGradient id="hammerHandleGrad" x1="0%" y1="100%" x2="100%" y2="0%">
                <stop offset="0%" stopColor="#5c2e0b" />
                <stop offset="30%" stopColor="#9a3412" />
                <stop offset="60%" stopColor="#d97706" />
                <stop offset="100%" stopColor="#78350f" />
              </linearGradient>

              {/* Leather Wrap Gradient */}
              <linearGradient id="hammerWrapGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#451a03" />
                <stop offset="50%" stopColor="#78350f" />
                <stop offset="100%" stopColor="#3b1502" />
              </linearGradient>

              {/* Gold Ring & Trims Gradient */}
              <linearGradient id="hammerGoldGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#ca8a04" />
                <stop offset="25%" stopColor="#fef08a" />
                <stop offset="55%" stopColor="#eab308" />
                <stop offset="85%" stopColor="#a16207" />
                <stop offset="100%" stopColor="#713f12" />
              </linearGradient>

              {/* Arcade Mallet Head Gradient */}
              <linearGradient id="hammerHeadGrad" x1="0%" y1="0%" x2="0%" y2="100%">
                <stop offset="0%" stopColor="#ea580c" />
                <stop offset="20%" stopColor="#f97316" />
                <stop offset="50%" stopColor="#c2410c" />
                <stop offset="80%" stopColor="#9a3412" />
                <stop offset="100%" stopColor="#7c2d12" />
              </linearGradient>

              {/* Chrome/Steel Striking Bumpers Gradient */}
              <linearGradient id="hammerSteelGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#f8fafc" />
                <stop offset="30%" stopColor="#e2e8f0" />
                <stop offset="70%" stopColor="#94a3b8" />
                <stop offset="100%" stopColor="#475569" />
              </linearGradient>

              {/* Star Emblem Gradient */}
              <linearGradient id="hammerStarGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#ffffff" />
                <stop offset="40%" stopColor="#fef08a" />
                <stop offset="100%" stopColor="#eab308" />
              </linearGradient>
            </defs>

            {/* HAMMER HANDLE */}
            <g>
              {/* Main Wooden Shaft */}
              <path
                d="M 52,50 L 88,86 C 92,90 92,96 87,100 C 83,104 77,103 73,99 L 42,59 Z"
                fill="url(#hammerHandleGrad)"
                stroke="#431407"
                strokeWidth="2"
                strokeLinejoin="round"
              />

              {/* Handle Grip Wrap Textures (Spiral Cross Straps) */}
              <path d="M 55,64 L 66,75" stroke="url(#hammerWrapGrad)" strokeWidth="6" strokeLinecap="round" />
              <path d="M 64,73 L 75,84" stroke="url(#hammerWrapGrad)" strokeWidth="6" strokeLinecap="round" />
              <path d="M 72,81 L 82,91" stroke="url(#hammerWrapGrad)" strokeWidth="6" strokeLinecap="round" />
              
              {/* Grip Stitch Lines */}
              <path d="M 57,63 L 83,89" stroke="#fef08a" strokeWidth="1.2" strokeDasharray="2 3" opacity="0.75" />

              {/* Handle Golden Collar / Ferrule */}
              <rect
                x="41"
                y="48"
                width="14"
                height="7"
                rx="2"
                transform="rotate(45 48 51.5)"
                fill="url(#hammerGoldGrad)"
                stroke="#713f12"
                strokeWidth="1.5"
              />

              {/* Handle Pommel at Base */}
              <circle
                cx="84"
                cy="96"
                r="7.5"
                fill="url(#hammerGoldGrad)"
                stroke="#713f12"
                strokeWidth="1.8"
              />
              <circle cx="84" cy="96" r="3" fill="#fef08a" opacity="0.8" />
            </g>

            {/* HAMMER MALLET HEAD (Tilted Barrel Mallet) */}
            <g transform="rotate(-33 46 36)">
              {/* Left Striking Face Bumper (Chrome) */}
              <rect
                x="14"
                y="19"
                width="7"
                height="34"
                rx="3.5"
                fill="url(#hammerSteelGrad)"
                stroke="#334155"
                strokeWidth="1.8"
              />
              <path d="M 16,23 L 16,49" stroke="#ffffff" strokeWidth="1.5" strokeLinecap="round" opacity="0.9" />

              {/* Main Barrel Body */}
              <rect
                x="19"
                y="17"
                width="54"
                height="38"
                rx="8"
                fill="url(#hammerHeadGrad)"
                stroke="#451a03"
                strokeWidth="2.2"
              />

              {/* Right Striking Face Bumper */}
              <rect
                x="71"
                y="19"
                width="7"
                height="34"
                rx="3.5"
                fill="url(#hammerSteelGrad)"
                stroke="#334155"
                strokeWidth="1.8"
              />

              {/* Top Specular 3D Gloss Highlight */}
              <path
                d="M 23,22 Q 46,19 69,22"
                fill="none"
                stroke="#fed7aa"
                strokeWidth="3.5"
                strokeLinecap="round"
                opacity="0.85"
              />
              <path
                d="M 25,26 Q 46,24 67,26"
                fill="none"
                stroke="#ffffff"
                strokeWidth="1.5"
                strokeLinecap="round"
                opacity="0.9"
              />

              {/* Gold Reinforcement Rings */}
              <rect
                x="24"
                y="15.5"
                width="6"
                height="41"
                rx="2"
                fill="url(#hammerGoldGrad)"
                stroke="#713f12"
                strokeWidth="1.2"
              />
              <rect
                x="62"
                y="15.5"
                width="6"
                height="41"
                rx="2"
                fill="url(#hammerGoldGrad)"
                stroke="#713f12"
                strokeWidth="1.2"
              />

              {/* Center Emblem: Golden Star with Bevel */}
              <g transform="translate(46, 36) scale(0.95)">
                <path
                  d="M 0,-11 L 3.2,-3.5 L 11.2,-3.5 L 4.8,1.4 L 7.2,9 L 0,4.2 L -7.2,9 L -4.8,1.4 L -11.2,-3.5 L -3.2,-3.5 Z"
                  fill="url(#hammerStarGrad)"
                  stroke="#854d0e"
                  strokeWidth="1.2"
                  strokeLinejoin="round"
                />
                <circle cx="0" cy="0" r="2" fill="#ffffff" opacity="0.9" />
              </g>

              {/* Bottom Shadow Line */}
              <path
                d="M 23,51 Q 46,54 69,51"
                fill="none"
                stroke="#431407"
                strokeWidth="2.5"
                strokeLinecap="round"
                opacity="0.6"
              />
            </g>

            {/* Dynamic Sparkle / Star Glint at Striking Edge */}
            <path
              d="M 18,12 L 20,16 L 24,16 L 21,19 L 22,23 L 18,20 L 14,23 L 15,19 L 12,16 L 16,16 Z"
              fill="#ffffff"
              stroke="#fef08a"
              strokeWidth="0.8"
              className="drop-shadow-sm"
            />
          </svg>
        </div>
      )}

      {/* FLOATING HIT EFFECTS (+100 / -50) WITH FRAMER MOTION */}
      <AnimatePresence>
        {hitEffects.map(fx => (
          <motion.div
            key={fx.id}
            initial={{ opacity: 0, y: 0, scale: 0.6 }}
            animate={{ 
              opacity: [0, 1, 1, 0], 
              y: -55, 
              scale: [0.6, 1.35, 1.1, 0.9] 
            }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.85, ease: 'easeOut' }}
            className={`fixed pointer-events-none font-black text-xl sm:text-2xl z-[100] ${
              fx.isPositive 
                ? 'text-yellow-300 drop-shadow-[0_2px_6px_rgba(0,0,0,0.9)]' 
                : 'text-rose-500 drop-shadow-[0_2px_6px_rgba(0,0,0,0.9)]'
            }`}
            style={{
              left: `${fx.x - 24}px`,
              top: `${fx.y - 36}px`
            }}
          >
            {fx.text}
          </motion.div>
        ))}
      </AnimatePresence>

      {/* ================= GAMEPLAY ARENA ================= */}
      {currentScreen === 'game' && parsedQuestions[currentQIndex] && (
        <div className="flex-1 min-h-0 p-1.5 sm:p-3 flex flex-col items-center justify-between gap-1.5 sm:gap-2.5 overflow-hidden w-full h-full">
          
          {/* DASHBOARD BAR: Progress, Timer, Score, Streak, & Restart controls */}
          <div className="w-full max-w-5xl bg-slate-900/90 backdrop-blur-md rounded-xl sm:rounded-2xl p-2 sm:p-2.5 border border-slate-700/60 text-white flex items-center justify-between gap-2 shadow-lg shrink-0">
            {/* Question Progress */}
            <div className="flex items-center gap-1.5 bg-slate-800/80 px-2.5 py-1 rounded-lg sm:rounded-xl border border-slate-700 shrink-0">
              <span className="text-[10px] sm:text-xs font-bold text-slate-400">Câu:</span>
              <span className="font-black text-amber-400 text-xs sm:text-sm">
                {currentQIndex + 1}/{parsedQuestions.length}
              </span>
            </div>

            {/* Timer Bar */}
            <div className="flex-1 max-w-sm mx-1 sm:mx-3 min-w-[100px]">
              <div className="flex justify-between text-[10px] sm:text-xs font-bold mb-0.5 text-slate-300">
                <span className="flex items-center gap-1"><Clock className="w-3 h-3" /> <span className="hidden sm:inline">Thời gian:</span></span>
                <span className="font-mono text-amber-300 font-black">{timerSetting > 0 ? `${timeLeft}s` : '∞'}</span>
              </div>
              <div className="w-full bg-slate-950/80 rounded-full h-2 sm:h-2.5 border border-slate-700 overflow-hidden p-0.5">
                <div
                  className="bg-gradient-to-r from-emerald-400 via-amber-400 to-rose-500 h-full rounded-full transition-all duration-300"
                  style={{
                    width: timerSetting > 0 ? `${Math.max(0, (timeLeft / timerSetting) * 100)}%` : '100%'
                  }}
                />
              </div>
            </div>

            {/* Score & Streak & Home Button */}
            <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
              <div className="bg-slate-800/80 px-2 sm:px-2.5 py-1 rounded-lg sm:rounded-xl border border-slate-700 text-right">
                <span className="text-[9px] sm:text-[10px] font-bold text-slate-400 block leading-none">Điểm</span>
                <span className="font-black text-xs sm:text-base text-yellow-400 leading-tight">{score}</span>
              </div>
              <div className="bg-slate-800/80 px-2 sm:px-2.5 py-1 rounded-lg sm:rounded-xl border border-slate-700 text-center min-w-[45px] sm:min-w-[55px]">
                <span className="text-[9px] sm:text-[10px] font-bold text-slate-400 block leading-none flex items-center justify-center gap-0.5">
                  <Flame className="w-2.5 h-2.5 text-orange-400" /> <span className="hidden sm:inline">Chuỗi</span>
                </span>
                <span className="font-black text-xs sm:text-sm text-orange-400 leading-tight">🔥{streak}</span>
              </div>

              {/* Quick Sound/BGM controls */}
              <button
                type="button"
                onClick={toggleBgm}
                className={`p-1.5 rounded-lg sm:rounded-xl border transition active:scale-95 flex items-center justify-center ${
                  soundConfig.masterEnabled && soundConfig.bgmEnabled
                    ? 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                    : 'bg-slate-800 text-slate-500 border-slate-700'
                }`}
                title={soundConfig.bgmEnabled ? 'Đang bật nhạc nền (Bấm để tắt BGM)' : 'Đang tắt nhạc nền (Bấm để bật BGM)'}
              >
                <Music className={`w-4 h-4 ${soundConfig.masterEnabled && soundConfig.bgmEnabled ? 'animate-pulse' : 'opacity-40'}`} />
              </button>

              <button
                type="button"
                onClick={toggleSound}
                className={`p-1.5 rounded-lg sm:rounded-xl border transition active:scale-95 flex items-center justify-center ${
                  soundConfig.masterEnabled
                    ? 'bg-indigo-500/20 text-indigo-300 border-indigo-500/40'
                    : 'bg-slate-800 text-rose-400 border-slate-700'
                }`}
                title={soundConfig.masterEnabled ? 'Âm thanh: BẬT' : 'Âm thanh: TẮT'}
              >
                {soundConfig.masterEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
              </button>

              {!isStudentMode && (
                <button
                  type="button"
                  onClick={startGame}
                  className="p-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white rounded-lg sm:rounded-xl border border-slate-700 transition active:scale-95"
                  title="Chơi lại từ đầu"
                >
                  <RotateCw className="w-4 h-4" />
                </button>
              )}
            </div>
          </div>

          {/* QUESTION BANNER */}
          <div className="w-full max-w-5xl bg-white rounded-xl sm:rounded-2xl p-2.5 sm:p-4 shadow-md border border-slate-200/90 text-center relative bubble-arrow shrink-0">
            <div className="inline-flex items-center gap-1 bg-amber-50 text-amber-800 text-[10px] sm:text-xs font-bold px-2 py-0.5 rounded-full uppercase tracking-wider mb-1 border border-amber-200">
              <HelpCircle className="w-3 h-3" />
              <span>Đập con chuột có đáp án ĐÚNG</span>
            </div>
            <h2 className="text-sm sm:text-base md:text-lg font-bold text-slate-800 leading-snug">
              <MarkdownMath content={parsedQuestions[currentQIndex].question} />
            </h2>
            {parsedQuestions[currentQIndex].img && (
              <div className="max-h-20 sm:max-h-28 flex justify-center mt-1.5">
                <img
                  src={parsedQuestions[currentQIndex].img}
                  alt="Question Thumbnail"
                  className="max-h-full max-w-full object-contain rounded-lg border border-slate-200 shadow-2xs"
                />
              </div>
            )}
          </div>

          {/* GAME FIELD: 6 MOLE HOLES GRID */}
          <div 
            onClick={handleFieldClickMiss}
            className="w-full max-w-5xl flex-1 min-h-0 grid grid-cols-3 gap-2 sm:gap-3.5 p-2 sm:p-3.5 rounded-xl sm:rounded-2xl bg-emerald-950/90 border border-emerald-500/40 shadow-xl items-stretch cursor-crosshair"
          >
            {moles.map((mole, idx) => (
              <div key={idx} className="flex flex-col items-center justify-center w-full h-full min-h-0">
                <div
                  className="w-full h-full min-h-[90px] sm:min-h-[120px] bg-gradient-to-b from-amber-950 via-stone-900 to-stone-950 border-b-4 sm:border-b-8 border-stone-950 shadow-inner relative flex justify-center items-end overflow-hidden"
                  style={{
                    borderRadius: '50% 50% 40% 40% / 60% 60% 40% 40%'
                  }}
                >
                  {/* MOLE CHARACTER WRAPPER WITH MOTION */}
                  <motion.div
                    onClick={(e) => handleWhackMole(idx, e)}
                    onTouchStart={(e) => handleWhackMole(idx, e)}
                    animate={{
                      y: mole.up ? (mole.hit ? '35%' : '0%') : '115%',
                      scale: mole.hit ? [1, 0.88, 1.05, 0.9] : (mole.up ? 1 : 0.8),
                      rotate: mole.hit ? [-8, 8, -4, 0] : 0
                    }}
                    transition={{
                      type: mole.hit ? 'keyframes' : 'spring',
                      stiffness: 300,
                      damping: 22,
                      duration: mole.hit ? 0.35 : undefined
                    }}
                    className="absolute bottom-0 w-5/6 sm:w-4/5 h-full flex flex-col items-center justify-end cursor-pointer will-change-transform select-none"
                  >
                    {/* MOLE SIGN (Holding Option Text) */}
                    <motion.div 
                      animate={mole.hit ? { scale: 0.9, y: 4 } : { scale: 1, y: 0 }}
                      className="bg-amber-100 border border-amber-800 text-amber-950 font-black text-[10px] sm:text-xs md:text-sm px-1.5 sm:px-2 py-0.5 sm:py-1 rounded-lg sm:rounded-xl shadow-md text-center max-w-[95%] mb-[-8px] sm:mb-[-10px] z-20 hover:scale-105 transition truncate"
                    >
                      <span className="line-clamp-2 leading-tight">
                        <MarkdownMath content={mole.text} />
                      </span>
                    </motion.div>

                    {/* MOLE SVG BODY */}
                    <div className="w-full h-3/4 relative z-10">
                      <svg viewBox="0 0 100 100" className="w-full h-full drop-shadow-md">
                        {/* Body */}
                        <ellipse cx="50" cy="65" rx="38" ry="32" fill="#78350f"/>
                        <ellipse cx="50" cy="70" rx="26" ry="22" fill="#fde68a"/>
                        {/* Ears */}
                        <circle cx="22" cy="62" r="7" fill="#fde68a" stroke="#78350f" strokeWidth="2"/>
                        <circle cx="78" cy="62" r="7" fill="#fde68a" stroke="#78350f" strokeWidth="2"/>
                        {/* Head */}
                        <circle cx="50" cy="40" r="28" fill="#78350f"/>
                        {/* Snout */}
                        <ellipse cx="50" cy="46" rx="14" ry="10" fill="#fde68a"/>
                        <ellipse cx="50" cy="42" rx="6" ry="4" fill="#1e293b"/>
                        
                        {/* Normal Eyes vs Dizzy Hit Eyes */}
                        {!mole.hit ? (
                          <g>
                            <circle cx="38" cy="34" r="4" fill="#000"/>
                            <circle cx="62" cy="34" r="4" fill="#000"/>
                            <circle cx="40" cy="32" r="1.5" fill="#fff"/>
                            <circle cx="64" cy="32" r="1.5" fill="#fff"/>
                          </g>
                        ) : (
                          <g>
                            {/* Dizzy X Eyes */}
                            <path d="M 34,30 L 42,38 M 42,30 L 34,38" stroke="#000" strokeWidth="3" strokeLinecap="round"/>
                            <path d="M 58,30 L 66,38 M 66,30 L 58,38" stroke="#000" strokeWidth="3" strokeLinecap="round"/>
                            {/* Stars circling dizzy head */}
                            <path d="M 50,14 L 52,19 L 57,19 L 53,22 L 55,27 L 50,24 L 45,27 L 47,22 L 43,19 L 48,19 Z" fill="#fbbf24" stroke="#d97706" strokeWidth="0.8"/>
                          </g>
                        )}
                        {/* Cheeks */}
                        <ellipse cx="32" cy="42" rx="4" ry="2.5" fill="#f43f5e" opacity="0.6"/>
                        <ellipse cx="68" cy="42" rx="4" ry="2.5" fill="#f43f5e" opacity="0.6"/>
                      </svg>
                    </div>
                  </motion.div>

                  {/* Hole Grass Foreground Mask */}
                  <div className="absolute -bottom-2 w-full h-1/3 bg-gradient-to-t from-amber-900 to-amber-950 rounded-t-full border-t-2 sm:border-t-4 border-amber-800 z-30 pointer-events-none" />
                  <div className="absolute -bottom-3 w-full h-1/4 bg-emerald-700/80 rounded-t-full z-30 pointer-events-none" />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ================= SCREEN 3: RESULTS & CLASSROOM REVIEW ================= */}
      {currentScreen === 'results' && (
        <div className="flex-1 min-h-0 p-3 sm:p-6 flex items-center justify-center overflow-y-auto">
          <div className="w-full max-w-3xl bg-white/95 backdrop-blur-md rounded-2xl p-5 sm:p-7 shadow-xl border border-slate-200/80 text-center space-y-4 sm:space-y-5 my-auto">
            
            {/* Stars & Title */}
            <div>
              <div className="text-4xl sm:text-5xl mb-1">
                {accuracy >= 80 ? '⭐⭐⭐' : accuracy >= 50 ? '⭐⭐' : '⭐'}
              </div>
              <h2 className="text-2xl sm:text-3xl font-black text-slate-800">
                {accuracy >= 80 ? 'XUẤT SẮC!' : accuracy >= 50 ? 'LÀM TỐT LẮM!' : 'CỐ GẮNG HƠN NHÉ!'}
              </h2>
              <p className="text-xs sm:text-sm font-medium text-slate-500">
                Bạn đã hoàn thành thử thách đập chuột chũi kiến thức!
              </p>
            </div>

            {/* Stats Overview */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
              <div className="bg-amber-50/80 p-3 rounded-xl border border-amber-200/80 text-center">
                <span className="text-[10px] sm:text-xs font-bold text-amber-700 block">Tổng điểm</span>
                <span className="text-lg sm:text-2xl font-black text-amber-900">{score}</span>
              </div>
              <div className="bg-emerald-50/80 p-3 rounded-xl border border-emerald-200/80 text-center">
                <span className="text-[10px] sm:text-xs font-bold text-emerald-700 block">Chính xác</span>
                <span className="text-lg sm:text-2xl font-black text-emerald-900">{accuracy}%</span>
              </div>
              <div className="bg-orange-50/80 p-3 rounded-xl border border-orange-200/80 text-center">
                <span className="text-[10px] sm:text-xs font-bold text-orange-700 block">Chuỗi cao nhất</span>
                <span className="text-lg sm:text-2xl font-black text-orange-900">🔥 {maxStreak}</span>
              </div>
              <div className="bg-indigo-50/80 p-3 rounded-xl border border-indigo-200/80 text-center">
                <span className="text-[10px] sm:text-xs font-bold text-indigo-700 block">Số câu đúng</span>
                <span className="text-lg sm:text-2xl font-black text-indigo-900">{correctCount}/{totalQ}</span>
              </div>
            </div>

            {/* Detailed Question Review List */}
            <div className="bg-slate-50 rounded-xl p-3 border border-slate-200 text-left max-h-48 sm:max-h-56 overflow-y-auto space-y-2">
              <h3 className="font-bold text-slate-700 text-xs sm:text-sm flex items-center gap-1.5">
                <Award className="w-4 h-4 text-indigo-600" />
                <span>BẢNG ÔN TẬP CÂU HỎI</span>
              </h3>
              {questionHistory.map((item, idx) => (
                <div
                  key={idx}
                  className={`p-2.5 rounded-lg border text-xs ${
                    item.isCorrect ? 'bg-emerald-50 border-emerald-200' : 'bg-rose-50 border-rose-200'
                  }`}
                >
                  <div className="flex justify-between items-start font-bold mb-0.5">
                    <span className="text-slate-800">
                      Câu {idx + 1}: <MarkdownMath content={item.question} />
                    </span>
                    <span className={item.isCorrect ? 'text-emerald-600 shrink-0 ml-1' : 'text-rose-600 shrink-0 ml-1'}>
                      {item.isCorrect ? <CheckCircle2 className="w-4 h-4" /> : <XCircle className="w-4 h-4" />}
                    </span>
                  </div>
                  <div className="text-[11px] text-slate-600 space-y-0.5">
                    <p>Đã chọn: <span className="font-bold">{item.userChoice}</span></p>
                    {!item.isCorrect && (
                      <p className="text-emerald-700 font-bold">Đáp án đúng: {item.correctChoice}</p>
                    )}
                    {item.explanation && (
                      <p className="italic text-slate-500">💡 Giải thích: {item.explanation}</p>
                    )}
                  </div>
                </div>
              ))}
            </div>

            {/* Action Buttons */}
            <div className="flex gap-2 sm:gap-3 pt-1">
              {!isStudentMode && (
                <button
                  type="button"
                  onClick={startGame}
                  className="flex-1 py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-300 font-bold text-xs sm:text-sm rounded-xl active:scale-95 transition-all flex items-center justify-center gap-1.5"
                >
                  <RotateCw className="w-4 h-4" />
                  <span>Chơi Lại</span>
                </button>
              )}
              <button
                type="button"
                onClick={isStudentMode ? handleSubmitWork : onClose}
                className="flex-1 py-3 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white font-bold text-xs sm:text-sm rounded-xl active:scale-95 transition-all shadow-md flex items-center justify-center gap-1.5"
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>{isStudentMode ? 'Nộp Bài & Kết Thúc' : 'Hoàn Thành'}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* QUICK HELP MODAL */}
      {showHelpModal && (
        <div
          className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-50 flex items-center justify-center p-4"
          onClick={() => setShowHelpModal(false)}
        >
          <div
            className="bg-white rounded-2xl max-w-md w-full p-5 sm:p-6 shadow-2xl border border-slate-200 space-y-4 text-center relative"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              type="button"
              onClick={() => setShowHelpModal(false)}
              className="absolute top-3 right-3 p-1 text-slate-400 hover:text-slate-700 rounded-full"
            >
              <X className="w-5 h-5" />
            </button>
            <div className="w-10 h-10 bg-indigo-50 rounded-full flex items-center justify-center text-indigo-600 font-black text-xl mx-auto">
              <HelpCircle className="w-6 h-6" />
            </div>
            <h3 className="text-base sm:text-lg font-black text-slate-800">CÁCH CHƠI ĐẬP CHUỘT</h3>
            <div className="space-y-2 text-xs sm:text-sm text-slate-700 font-medium text-left">
              <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-200">
                🎯 <strong className="text-indigo-800">Nhiệm vụ:</strong> Quan sát câu hỏi và đập trúng con chuột mang biển đáp án ĐÚNG.
              </div>
              <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-200">
                🔨 <strong className="text-amber-800">Cầm búa:</strong> Khi vào game, chiếc búa sẽ xuất hiện theo con trỏ chuột hoặc ngón tay chạm của bạn.
              </div>
              <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-200">
                ⭐ <strong className="text-emerald-800">Điểm số:</strong> Trả lời liên tục đúng sẽ kích hoạt Chuỗi (Streak) để nhân thêm điểm thưởng.
              </div>
            </div>
            <button
              type="button"
              onClick={() => setShowHelpModal(false)}
              className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-sm rounded-xl shadow"
            >
              ĐÃ HIỂU
            </button>
          </div>
        </div>
      )}

    </div>
  );
}
