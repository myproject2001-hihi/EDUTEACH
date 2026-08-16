import React, { useState, useEffect, useRef } from 'react';
import { ArrowLeft, Star, Keyboard } from 'lucide-react';
import { MarkdownMath } from './MarkdownMath';
import { cleanQuestionText } from '../views/AssignmentsView';
import grassTexture from '../assets/images/minesweeper_grass_texture_1786870331143.jpg';

interface Answer {
  id: string;
  text: string;
  isCorrect: boolean;
  displayId?: string;
  x?: number;
  y?: number;
}

interface Question {
  question: string;
  options?: string[];
  answers?: Answer[];
  [key: string]: any;
}

interface MinesweeperGameProps {
  questions: any[];
  onClose: () => void;
  isStudentMode?: boolean;
  onSubmitWork?: (score: number, correctAnswers: number, answersMap: Record<string, number>) => void;
}

// Particle Pool Interface
interface PooledParticle {
  active: boolean;
  x: number;
  y: number;
  tx: number;
  ty: number;
  color: string;
}

// Explosion Pool Interface
interface PooledExplosion {
  active: boolean;
  x: number;
  y: number;
}

const PARTICLE_POOL_SIZE = 20;
const EXPLOSION_POOL_SIZE = 2;

// Memoized Answer Nodes to prevent re-rendering Math/Markdown on every movement frame
const AnswerNodesList = React.memo(({ answers, onNodeClick }: { answers: Answer[]; onNodeClick: (e: React.MouseEvent, ans: Answer) => void }) => {
  return (
    <>
      {answers.map((ans, idx) => (
        <div
          key={ans.id || idx}
          onClick={(e) => onNodeClick(e, ans)}
          className="absolute transform -translate-x-1/2 -translate-y-1/2 flex flex-col items-center justify-center cursor-pointer group z-10 transition-all duration-200 active:scale-90"
          style={{
            left: `${ans.x}%`,
            top: `${ans.y}%`,
          }}
        >
          {/* Floating Balloon Pin with responsive sizes */}
          <div className="relative flex flex-col items-center">
            <div className="w-9 h-9 sm:w-11 sm:h-11 md:w-12 md:h-12 lg:w-14 lg:h-14 rounded-full border-[3px] sm:border-4 border-white flex items-center justify-center text-white font-black text-xs sm:text-sm md:text-base lg:text-lg shadow-xl transition-all duration-200 bg-indigo-600 group-hover:scale-110 group-hover:bg-indigo-700">
              {ans.displayId}
            </div>
            
            {/* Answer Banner tag with responsive text sizes */}
            <div className="mt-1 px-2.5 py-0.5 sm:px-3.5 sm:py-1 bg-white border border-indigo-100 rounded-full text-[9px] sm:text-[10px] md:text-xs lg:text-sm font-extrabold text-indigo-950 shadow-md whitespace-nowrap group-hover:border-indigo-300 transition-all max-w-[140px] sm:max-w-[200px] lg:max-w-[280px] truncate text-center">
              <MarkdownMath content={ans.text} />
            </div>
          </div>
        </div>
      ))}
    </>
  );
});

// Memoized Soldier Avatar with responsive scaling
const SoldierAvatar = React.memo(({ x, y }: { x: number; y: number }) => {
  return (
    <div 
      className="absolute z-20 pointer-events-none transform -translate-x-1/2 -translate-y-1/2 transition-transform duration-75"
      style={{
        left: `${x}%`,
        top: `${y}%`,
        willChange: 'left, top'
      }}
    >
      <div className="relative w-10 h-10 sm:w-12 sm:h-12 md:w-14 md:h-14 flex flex-col items-center justify-center">
        {/* Helmet cap circle */}
        <div className="absolute top-0 w-8 h-8 sm:w-10 sm:h-10 md:w-11 md:h-11 bg-emerald-600 rounded-full border-2 border-emerald-800 shadow-2xl z-20 flex items-center justify-center">
          {/* Yellow star insignia */}
          <div className="w-2 h-2 sm:w-2.5 sm:h-2.5 bg-yellow-400 rounded-full border border-yellow-600 animate-pulse" />
        </div>
        {/* Wide rim of pith helmet */}
        <div className="absolute top-1.5 w-10 h-6 sm:w-12 sm:h-7 md:w-13 md:h-8 bg-emerald-700 rounded-full border border-emerald-800 z-10" />
        {/* Backpack bag */}
        <div className="absolute bottom-0 w-6 h-3.5 sm:w-8 sm:h-4 bg-amber-600 rounded-md border border-amber-700 z-0" />
        {/* Torso */}
        <div className="absolute top-3.5 sm:top-4 w-7 h-5 sm:w-9 sm:h-6 bg-emerald-500 rounded-xl border border-emerald-700 z-10" />
      </div>
    </div>
  );
});

// Object Pooled Particle Canvas Overlay
const ParticleOverlay = React.memo(({ particles }: { particles: PooledParticle[] }) => {
  return (
    <>
      {particles.map((p, idx) => {
        if (!p.active) return null;
        return (
          <div
            key={idx}
            className="absolute w-2.5 h-2.5 rounded-full pointer-events-none transition-all duration-1000 ease-out"
            style={{
              left: `${p.x}px`,
              top: `${p.y}px`,
              backgroundColor: p.color,
              boxShadow: `0 0 8px ${p.color}`,
              transform: `translate3d(${p.tx}px, ${p.ty}px, 0) scale(0.2)`,
              opacity: p.active ? 1 : 0,
              willChange: 'transform, opacity'
            }}
          />
        );
      })}
    </>
  );
});

// Object Pooled Explosion Overlay
const ExplosionOverlay = React.memo(({ explosions }: { explosions: PooledExplosion[] }) => {
  return (
    <>
      {explosions.map((exp, idx) => {
        if (!exp.active) return null;
        return (
          <div
            key={idx}
            className="absolute rounded-full pointer-events-none z-30"
            style={{
              left: `${exp.x}px`,
              top: `${exp.y}px`,
              width: '80px',
              height: '80px',
              marginLeft: '-40px',
              marginTop: '-40px',
              background: 'radial-gradient(circle, #ffe600 10%, #ff5d00 45%, #ff0000 75%, transparent 100%)',
              animation: 'pop-big 0.6s cubic-bezier(0.15, 0.9, 0.3, 1.2) forwards',
              willChange: 'transform, opacity'
            }}
          />
        );
      })}
    </>
  );
});

export function MinesweeperGame({ questions, onClose, isStudentMode = false, onSubmitWork }: MinesweeperGameProps) {
  // Normalize external questions robustly
  const gameQuestions = React.useMemo(() => {
    if (!questions || questions.length === 0) {
      return [
        {
          question: 'Câu 1: Cho hai số a = 5, b = 3. Tính a + b?',
          answers: [
            { id: 'A', text: '8', isCorrect: true },
            { id: 'B', text: '15', isCorrect: false },
            { id: 'C', text: '2', isCorrect: false },
            { id: 'D', text: '12', isCorrect: false }
          ]
        },
        {
          question: 'Câu 2: Công thức tính diện tích hình tròn có bán kính R là?',
          answers: [
            { id: 'A', text: 'S = πR²', isCorrect: true },
            { id: 'B', text: 'S = 2πR', isCorrect: false },
            { id: 'C', text: 'S = πD', isCorrect: false },
            { id: 'D', text: 'S = 4πR²', isCorrect: false }
          ]
        }
      ];
    }

    return questions.map((q, qIdx) => {
      let qText = cleanQuestionText(q.question || q.text || q.title || '');
      if (!qText) qText = `Câu hỏi ${qIdx + 1}`;

      let rawOptions: string[] = [];
      if (Array.isArray(q.options) && q.options.length > 0) {
        rawOptions = q.options;
      } else if (Array.isArray(q.answers) && q.answers.length > 0) {
        rawOptions = q.answers.map((a: any) => (typeof a === 'string' ? a : (a.text || a.title || '')));
      } else if (Array.isArray(q.subOptions) && q.subOptions.length > 0) {
        rawOptions = q.subOptions;
      } else {
        rawOptions = ['Đúng', 'Sai'];
      }

      const validOptions = rawOptions.filter(opt => opt !== undefined && opt !== null && String(opt).trim() !== '');
      const options = validOptions.length >= 2 ? validOptions : (rawOptions.length >= 2 ? rawOptions : ['Đúng', 'Sai']);

      let correctIdx = 0;
      if (typeof q.correctAnswer === 'number') {
        correctIdx = q.correctAnswer;
      } else if (typeof q.correctOption === 'number') {
        correctIdx = q.correctOption;
      } else if (typeof q.answerIndex === 'number') {
        correctIdx = q.answerIndex;
      } else if (typeof q.correctAnswer === 'string') {
        const ca = q.correctAnswer.trim();
        const u = ca.toUpperCase();
        if (u === 'A' || ca === '0') correctIdx = 0;
        else if (u === 'B' || ca === '1') correctIdx = 1;
        else if (u === 'C' || ca === '2') correctIdx = 2;
        else if (u === 'D' || ca === '3') correctIdx = 3;
        else {
          const matchOpt = options.findIndex((opt: string) => String(opt).trim().toLowerCase() === ca.toLowerCase());
          if (matchOpt !== -1) correctIdx = matchOpt;
        }
      } else if (Array.isArray(q.correctAnswer) && q.correctAnswer.length > 0) {
        correctIdx = Number(q.correctAnswer[0]) || 0;
      } else if (Array.isArray(q.answers) && q.answers.length > 0) {
        const foundCorrect = q.answers.findIndex((a: any) => typeof a === 'object' && a.isCorrect === true);
        if (foundCorrect !== -1) correctIdx = foundCorrect;
      }

      const answersList = options.map((opt: string, idx: number) => ({
        id: String.fromCharCode(65 + idx),
        text: String(opt),
        isCorrect: idx === correctIdx
      }));

      return {
        question: qText,
        answers: answersList
      };
    });
  }, [questions]);

  // Game state
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [score, setScore] = useState(0);
  const [correctAnswersCount, setCorrectAnswersCount] = useState(0);
  const [answersMap, setAnswersMap] = useState<Record<string, number>>({});
  const [isGameOver, setIsGameOver] = useState(false);
  const [isProcessingAnswer, setIsProcessingAnswer] = useState(false);
  const [isAutoMoving, setIsAutoMoving] = useState(false);

  // Refs for synchronous loop tracking
  const isGameOverRef = useRef(false);
  const isProcessingAnswerRef = useRef(false);
  const isAutoMovingRef = useRef(false);
  const lastFrameTimeRef = useRef<number>(0);
  
  // Soldier position (percentage %)
  const [playerPos, setPlayerPos] = useState({ x: 50, y: 80 });
  const playerPosRef = useRef({ x: 50, y: 80 });
  
  // Screen shake animation
  const [isShaking, setIsShaking] = useState(false);

  // Object Pools
  const particlePoolRef = useRef<PooledParticle[]>(
    Array.from({ length: PARTICLE_POOL_SIZE }, () => ({
      active: false,
      x: 0,
      y: 0,
      tx: 0,
      ty: 0,
      color: '#f59e0b'
    }))
  );
  const [particlePool, setParticlePool] = useState<PooledParticle[]>(particlePoolRef.current);

  const explosionPoolRef = useRef<PooledExplosion[]>(
    Array.from({ length: EXPLOSION_POOL_SIZE }, () => ({
      active: false,
      x: 0,
      y: 0
    }))
  );
  const [explosionPool, setExplosionPool] = useState<PooledExplosion[]>(explosionPoolRef.current);
  
  // Current question answers
  const [currentAnswers, setCurrentAnswers] = useState<Answer[]>([]);
  const currentAnswersRef = useRef<Answer[]>([]);

  const boardRef = useRef<HTMLDivElement>(null);
  const animationFrameIdRef = useRef<number | null>(null);
  const keysPressedRef = useRef<Record<string, boolean>>({});

  const playerSpeed = 1.8;
  const hitRadius = 45;

  // Sync setters
  const setAutoMoving = (val: boolean) => {
    isAutoMovingRef.current = val;
    setIsAutoMoving(val);
  };

  const setProcessingAnswer = (val: boolean) => {
    isProcessingAnswerRef.current = val;
    setIsProcessingAnswer(val);
  };

  const setGameOver = (val: boolean) => {
    isGameOverRef.current = val;
    setIsGameOver(val);
  };

  useEffect(() => {
    playerPosRef.current = playerPos;
  }, [playerPos]);

  // Load a new question
  const loadQuestion = (index: number) => {
    if (index >= gameQuestions.length) {
      setGameOver(true);
      return;
    }

    setProcessingAnswer(false);
    setAutoMoving(false);
    if (animationFrameIdRef.current) {
      cancelAnimationFrame(animationFrameIdRef.current);
      animationFrameIdRef.current = null;
    }

    setPlayerPos({ x: 50, y: 80 });
    playerPosRef.current = { x: 50, y: 80 };

    const q = gameQuestions[index];
    const originalAnswers = q?.answers || [];

    const presetPositions = [
      { x: 25, y: 25 },
      { x: 75, y: 25 },
      { x: 25, y: 60 },
      { x: 75, y: 60 },
      { x: 50, y: 40 },
      { x: 15, y: 42 },
      { x: 85, y: 42 }
    ];

    const shuffledPositions = [...presetPositions].sort(() => Math.random() - 0.5);
    const shuffledAnswers = [...originalAnswers].sort(() => Math.random() - 0.5);
    const labels = ['A', 'B', 'C', 'D', 'E', 'F'];

    const formattedAnswers = shuffledAnswers.map((ans, idx) => ({
      ...ans,
      displayId: labels[idx],
      x: shuffledPositions[idx]?.x || 50,
      y: shuffledPositions[idx]?.y || 50
    }));

    currentAnswersRef.current = formattedAnswers;
    setCurrentAnswers(formattedAnswers);
  };

  useEffect(() => {
    if (gameQuestions.length > 0) {
      loadQuestion(0);
    }
  }, [gameQuestions]);

  // Throttled Auto-move navigation handler
  const startAutoMove = (targetX: number, targetY: number, onArrival?: () => void) => {
    if (isGameOver || isGameOverRef.current || isProcessingAnswer || isProcessingAnswerRef.current) return;
    
    setAutoMoving(true);

    if (animationFrameIdRef.current) {
      cancelAnimationFrame(animationFrameIdRef.current);
      animationFrameIdRef.current = null;
    }

    const stepMove = (timestamp: number) => {
      if (isGameOver || isGameOverRef.current || isProcessingAnswer || isProcessingAnswerRef.current) {
        setAutoMoving(false);
        animationFrameIdRef.current = null;
        return;
      }

      // Delta-time throttle ~60 FPS
      if (timestamp - lastFrameTimeRef.current < 14) {
        animationFrameIdRef.current = requestAnimationFrame(stepMove);
        return;
      }
      lastFrameTimeRef.current = timestamp;

      const current = playerPosRef.current;
      const dx = targetX - current.x;
      const dy = targetY - current.y;
      const distance = Math.hypot(dx, dy);

      if (distance < playerSpeed * 1.5) {
        playerPosRef.current = { x: targetX, y: targetY };
        setPlayerPos({ x: targetX, y: targetY });
        setAutoMoving(false);
        animationFrameIdRef.current = null;
        if (onArrival) onArrival();
        return;
      }

      const ratio = playerSpeed / distance;
      const nextX = current.x + dx * ratio;
      const nextY = current.y + dy * ratio;

      playerPosRef.current = { x: nextX, y: nextY };
      setPlayerPos({ x: nextX, y: nextY });

      animationFrameIdRef.current = requestAnimationFrame(stepMove);
    };

    animationFrameIdRef.current = requestAnimationFrame(stepMove);
  };

  // Throttled Keyboard navigation loop
  const movePlayerWithKeys = (timestamp: number) => {
    if (isGameOver || isGameOverRef.current || isProcessingAnswer || isProcessingAnswerRef.current) {
      animationFrameIdRef.current = null;
      return;
    }

    // Delta-time throttle ~60 FPS
    if (timestamp - lastFrameTimeRef.current < 14) {
      animationFrameIdRef.current = requestAnimationFrame(movePlayerWithKeys);
      return;
    }
    lastFrameTimeRef.current = timestamp;

    let moved = false;
    const current = playerPosRef.current;
    let nextX = current.x;
    let nextY = current.y;

    const manualSpeed = playerSpeed * 1.2;
    const keys = keysPressedRef.current;

    if (keys['arrowup'] || keys['w']) {
      nextY -= manualSpeed;
      moved = true;
    }
    if (keys['arrowdown'] || keys['s']) {
      nextY += manualSpeed;
      moved = true;
    }
    if (keys['arrowleft'] || keys['a']) {
      nextX -= manualSpeed;
      moved = true;
    }
    if (keys['arrowright'] || keys['d']) {
      nextX += manualSpeed;
      moved = true;
    }

    nextX = Math.max(5, Math.min(95, nextX));
    nextY = Math.max(5, Math.min(95, nextY));

    if (moved) {
      playerPosRef.current = { x: nextX, y: nextY };
      setPlayerPos({ x: nextX, y: nextY });
      checkCollisionWithAnswers(nextX, nextY);
    }

    const anyKeyPressed = ['arrowup', 'arrowdown', 'arrowleft', 'arrowright', 'w', 'a', 's', 'd'].some(
      (k) => keysPressedRef.current[k]
    );

    if (anyKeyPressed && !isGameOver && !isGameOverRef.current && !isProcessingAnswer && !isProcessingAnswerRef.current) {
      animationFrameIdRef.current = requestAnimationFrame(movePlayerWithKeys);
    } else {
      animationFrameIdRef.current = null;
    }
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (isGameOver || isGameOverRef.current) return;
      const key = e.key.toLowerCase();
      if (['arrowup', 'arrowdown', 'arrowleft', 'arrowright', 'w', 'a', 's', 'd'].includes(key)) {
        e.preventDefault();
      }
      keysPressedRef.current[key] = true;

      if (!isGameOver && !isGameOverRef.current && !isProcessingAnswer && !isProcessingAnswerRef.current) {
        if (isAutoMovingRef.current) {
          setAutoMoving(false);
          if (animationFrameIdRef.current) {
            cancelAnimationFrame(animationFrameIdRef.current);
            animationFrameIdRef.current = null;
          }
        }
        if (!animationFrameIdRef.current) {
          animationFrameIdRef.current = requestAnimationFrame(movePlayerWithKeys);
        }
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      keysPressedRef.current[e.key.toLowerCase()] = false;
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
      if (animationFrameIdRef.current) {
        cancelAnimationFrame(animationFrameIdRef.current);
      }
    };
  }, [isGameOver]);

  const checkCollisionWithAnswers = (px: number, py: number) => {
    if (!boardRef.current || isProcessingAnswer || isProcessingAnswerRef.current || isGameOver || isGameOverRef.current) return;
    const boardWidth = boardRef.current.clientWidth;
    const boardHeight = boardRef.current.clientHeight;

    const playerAbsX = (px / 100) * boardWidth;
    const playerAbsY = (py / 100) * boardHeight;

    currentAnswersRef.current.forEach((ans) => {
      if (ans.x === undefined || ans.y === undefined) return;
      const ansAbsX = (ans.x / 100) * boardWidth;
      const ansAbsY = (ans.y / 100) * boardHeight;

      const dist = Math.hypot(playerAbsX - ansAbsX, playerAbsY - ansAbsY);
      if (dist < hitRadius) {
        evaluateAnswer(ans);
      }
    });
  };

  const evaluateAnswer = (answer: Answer) => {
    if (isProcessingAnswer || isProcessingAnswerRef.current || isGameOver || isGameOverRef.current) return;
    setProcessingAnswer(true);
    setAutoMoving(false);

    if (animationFrameIdRef.current) {
      cancelAnimationFrame(animationFrameIdRef.current);
      animationFrameIdRef.current = null;
    }

    const currentQ = gameQuestions[currentQuestionIndex];
    const originalAnswers = currentQ?.answers || [];
    const optionIndex = originalAnswers.findIndex((a) => a.id === answer.id);

    const nextScore = answer.isCorrect ? score + 10 : score;
    const nextCorrectCount = answer.isCorrect ? correctAnswersCount + 1 : correctAnswersCount;
    const nextAnswersMap = { ...answersMap, [currentQuestionIndex.toString()]: optionIndex >= 0 ? optionIndex : 0 };

    setScore(nextScore);
    setCorrectAnswersCount(nextCorrectCount);
    setAnswersMap(nextAnswersMap);

    if (answer.x !== undefined && answer.y !== undefined && boardRef.current) {
      const boardWidth = boardRef.current.clientWidth;
      const boardHeight = boardRef.current.clientHeight;
      const xPixel = (answer.x / 100) * boardWidth;
      const yPixel = (answer.y / 100) * boardHeight;

      if (answer.isCorrect) {
        triggerFireworks(xPixel, yPixel);
      } else {
        setIsShaking(true);
        triggerExplosion(xPixel, yPixel);
        setTimeout(() => setIsShaking(false), 600);
      }
    }

    setTimeout(() => {
      const nextIdx = currentQuestionIndex + 1;
      if (nextIdx >= gameQuestions.length) {
        setGameOver(true);
        if (onSubmitWork) {
          onSubmitWork(nextScore, nextCorrectCount, nextAnswersMap);
        }
      } else {
        setCurrentQuestionIndex(nextIdx);
        loadQuestion(nextIdx);
      }
    }, 1200);
  };

  // Object Pooling Trigger for Fireworks
  const triggerFireworks = (x: number, y: number) => {
    if (isGameOver || isGameOverRef.current) return;
    const colors = ['#f59e0b', '#10b981', '#3b82f6', '#8b5cf6', '#ec4899'];
    const pCount = 16;

    for (let i = 0; i < PARTICLE_POOL_SIZE; i++) {
      if (i < pCount) {
        const angle = Math.random() * Math.PI * 2;
        const speed = 3 + Math.random() * 5;
        particlePoolRef.current[i] = {
          active: true,
          x,
          y,
          tx: Math.cos(angle) * speed * 35,
          ty: Math.sin(angle) * speed * 35,
          color: colors[i % colors.length]
        };
      } else {
        particlePoolRef.current[i].active = false;
      }
    }
    setParticlePool([...particlePoolRef.current]);

    // Recycles pool without DOM element destruction
    setTimeout(() => {
      particlePoolRef.current.forEach(p => (p.active = false));
      setParticlePool([...particlePoolRef.current]);
    }, 1100);
  };

  // Object Pooling Trigger for Explosions
  const triggerExplosion = (x: number, y: number) => {
    if (isGameOver || isGameOverRef.current) return;
    explosionPoolRef.current[0] = { active: true, x, y };
    setExplosionPool([...explosionPoolRef.current]);

    setTimeout(() => {
      explosionPoolRef.current[0].active = false;
      setExplosionPool([...explosionPoolRef.current]);
    }, 650);
  };

  const handleBoardClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (isGameOver || isGameOverRef.current || isProcessingAnswer || isProcessingAnswerRef.current || !boardRef.current) return;
    const rect = boardRef.current.getBoundingClientRect();
    const clickX = Math.max(5, Math.min(95, ((e.clientX - rect.left) / rect.width) * 100));
    const clickY = Math.max(5, Math.min(95, ((e.clientY - rect.top) / rect.height) * 100));
    
    startAutoMove(clickX, clickY, () => {
      checkCollisionWithAnswers(clickX, clickY);
    });
  };

  const handleNodeClick = (e: React.MouseEvent, ans: Answer) => {
    e.stopPropagation();
    if (isGameOver || isGameOverRef.current || isProcessingAnswer || isProcessingAnswerRef.current) return;
    if (ans.x === undefined || ans.y === undefined) return;

    startAutoMove(ans.x, ans.y, () => {
      evaluateAnswer(ans);
    });
  };

  const restartGame = () => {
    setScore(0);
    setCorrectAnswersCount(0);
    setAnswersMap({});
    setCurrentQuestionIndex(0);
    setGameOver(false);
    setProcessingAnswer(false);
    setAutoMoving(false);
    setTimeout(() => loadQuestion(0), 100);
  };

  const q = gameQuestions[currentQuestionIndex];

  return (
    <div className="flex flex-col md:flex-row h-full w-full flex-1 min-h-0 text-slate-800 select-none overflow-hidden relative rounded-2xl border border-indigo-100 bg-white shadow-xl custom-game-container">
      
      {/* LEFT: QUESTION AND SCOREBOARD PANEL */}
      <div className="w-full md:w-80 lg:w-96 bg-slate-50 border-b md:border-b-0 md:border-r border-indigo-100/80 p-3 sm:p-5 flex flex-row md:flex-col justify-between shrink-0 relative z-30 shadow-sm gap-3">
        <div className="space-y-3 sm:space-y-4 flex-1 md:flex-initial flex flex-row md:flex-col items-center md:items-stretch gap-2 md:gap-0">
          <button 
            onClick={onClose}
            className="flex items-center gap-1.5 px-2.5 py-1.5 sm:px-3 sm:py-2 bg-indigo-50 hover:bg-indigo-100 text-[10px] sm:text-xs font-black text-indigo-700 rounded-xl transition shadow-sm border border-indigo-200 shrink-0"
          >
            <ArrowLeft className="w-3.5 h-3.5" /> Quay lại
          </button>

          <div className="bg-white border-2 border-indigo-100/80 p-3 sm:p-4 rounded-2xl shadow-sm relative overflow-hidden min-h-[90px] md:min-h-[220px] lg:min-h-[260px] flex-1 md:flex-none flex flex-col justify-between">
            {isGameOver ? (
              <div className="text-center space-y-2 sm:space-y-4 py-2 sm:py-6 animate-scaleIn flex-1 flex flex-col items-center justify-center">
                <div className="w-10 h-10 sm:w-12 sm:h-12 bg-emerald-100 border border-emerald-300 rounded-full flex items-center justify-center text-emerald-600 text-lg sm:text-xl font-bold animate-bounce shadow-sm">
                  🏆
                </div>
                <h4 className="text-sm sm:text-base font-black text-slate-800">Hoàn Thành!</h4>
                <p className="text-[9px] sm:text-[11px] text-slate-500 font-medium hidden sm:block">
                  Chúc mừng bạn đã rà phá thành công bãi mìn!
                </p>
                <div className="text-lg sm:text-xl lg:text-2xl font-black text-indigo-600 bg-indigo-50 px-3 py-1 sm:px-4 sm:py-1.5 rounded-full border border-indigo-100">
                  {score} Điểm
                </div>
                <button 
                  onClick={restartGame}
                  className="w-full py-1.5 sm:py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white font-black text-[10px] sm:text-xs rounded-xl active:scale-95 transition-all shadow-md shadow-indigo-100"
                >
                  Chơi lại
                </button>
              </div>
            ) : (
              <>
                <div className="text-center border-b border-indigo-50 pb-1.5 hidden sm:block">
                  <span className="text-indigo-600 font-extrabold text-[9px] sm:text-[10px] md:text-xs tracking-widest uppercase bg-indigo-50 px-2.5 py-1 rounded-full border border-indigo-100">
                    Câu hỏi {currentQuestionIndex + 1} / {gameQuestions.length}
                  </span>
                </div>

                <div className="flex-1 flex items-center justify-center py-2 sm:py-3">
                  <div className="text-xs sm:text-sm md:text-base lg:text-lg xl:text-xl font-extrabold text-slate-800 text-center leading-relaxed">
                    <MarkdownMath content={q?.question || 'Câu hỏi...'} />
                  </div>
                </div>

                <div className="text-[9px] sm:text-[10px] text-slate-400 flex items-center gap-1 justify-center border-t border-indigo-50 pt-1.5 font-semibold hidden md:flex">
                  <Keyboard className="w-3.5 h-3.5 text-indigo-500" /> Sử dụng WASD / Phím mũi tên để di chuyển
                </div>
              </>
            )}
          </div>
        </div>

        {/* HUD control details */}
        <div className="mt-1 p-2 bg-indigo-50/50 border border-indigo-100 rounded-xl space-y-1 hidden md:block">
          <span className="text-[8px] sm:text-[9px] md:text-[10px] font-black uppercase text-indigo-600 tracking-wider block">
            Cách phá mìn an toàn:
          </span>
          <p className="text-[9px] sm:text-[10px] text-indigo-950/80 leading-normal font-medium">
            Nhấp chuột trực tiếp lên ô nhãn chữ <span className="font-bold text-indigo-600 bg-indigo-50 px-1 py-0.5 rounded">A, B, C, D</span> trên bãi cỏ để lính tự động rà mìn tương ứng!
          </p>
        </div>
      </div>

      {/* RIGHT: INTERACTIVE MILITARY GRASS MAP */}
      <div className="flex-1 h-full relative bg-emerald-100 overflow-hidden" id="game-container">
        
        {/* Float Status Ribbon */}
        <div className="absolute top-2.5 sm:top-4 left-0 right-0 z-20 flex justify-center pointer-events-none">
          <div className="bg-white/95 text-slate-800 px-4 py-1 sm:px-6 sm:py-2 rounded-full border border-indigo-100 shadow-xl flex items-center gap-3 sm:gap-5 pointer-events-auto">
            <div className="flex items-center gap-1 sm:gap-1.5">
              <Star className="w-3.5 h-3.5 sm:w-4.5 sm:h-4.5 text-amber-500 fill-amber-500 animate-spin-slow" />
              <span className="font-black text-sm sm:text-lg lg:text-xl text-amber-500">{score}</span>
              <span className="text-[8px] sm:text-[9px] lg:text-[10px] font-black text-slate-400 uppercase tracking-widest">Điểm</span>
            </div>
            <div className="w-px h-3 sm:h-4 bg-indigo-100" />
            <div className="text-[10px] sm:text-xs lg:text-sm font-black text-indigo-600">
              GA: {currentQuestionIndex + 1} / {gameQuestions.length}
            </div>
          </div>
        </div>

        {/* Grass Battlefield */}
        <div 
          ref={boardRef}
          onClick={handleBoardClick}
          className={`w-full h-full relative cursor-crosshair overflow-hidden transition-all duration-75 ${
            isShaking ? 'shake-hard' : ''
          } ${isGameOver ? 'pointer-events-none opacity-90' : ''}`}
          style={{
            backgroundColor: '#4ade80',
            backgroundImage: `url(${grassTexture})`,
            backgroundSize: '200px 200px',
            backgroundRepeat: 'repeat'
          }}
        >
          {/* Answer Nodes on field */}
          {!isGameOver && (
            <AnswerNodesList answers={currentAnswers} onNodeClick={handleNodeClick} />
          )}

          {/* Player avatar representation */}
          <SoldierAvatar x={playerPos.x} y={playerPos.y} />

          {/* Object Pooled Particle System */}
          <ParticleOverlay particles={particlePool} />

          {/* Object Pooled Explosion System */}
          <ExplosionOverlay explosions={explosionPool} />
        </div>
      </div>

      <style>{`
        @keyframes pop-big {
          0% { transform: scale(0.2); opacity: 1; }
          40% { transform: scale(1.6); opacity: 0.9; }
          100% { transform: scale(2.8); opacity: 0; }
        }
        .shake-hard {
          animation: shake-hard 0.5s cubic-bezier(.36,.07,.19,.97) both;
        }
        @keyframes shake-hard {
          10%, 90% { transform: translate3d(-2px, 0, 0); }
          20%, 80% { transform: translate3d(4px, 0, 0); }
          30%, 50%, 70% { transform: translate3d(-6px, 0, 0); }
          40%, 60% { transform: translate3d(6px, 0, 0); }
        }
      `}</style>
    </div>
  );
}
