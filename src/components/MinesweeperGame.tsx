import React, { useState, useEffect, useRef } from 'react';
import { ArrowLeft, Star, Volume2, Shield, Keyboard, Zap, Play } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { MarkdownMath } from './MarkdownMath';

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
  options?: string[]; // compatibility
  answers?: Answer[]; // custom
}

interface MinesweeperGameProps {
  questions: any[];
  onClose: () => void;
  isStudentMode?: boolean;
  onSubmitWork?: (score: number, correctAnswers: number, answersMap: Record<string, number>) => void;
}

interface FireworkParticle {
  id: string;
  x: number;
  y: number;
  tx: number;
  ty: number;
  color: string;
}

interface ExplosionEffect {
  id: string;
  x: number;
  y: number;
}

export function MinesweeperGame({ questions, onClose, isStudentMode = false, onSubmitWork }: MinesweeperGameProps) {
  // Convert basic questions to have answers property if they only have options
  const gameQuestions = React.useMemo(() => {
    return questions.map((q) => {
      if (q.answers) return q;
      // Convert options array to answers format
      const options = q.options || ['Đúng', 'Sai'];
      const answersList = options.map((opt: string, idx: number) => {
        // Assume first option is correct if not specified, or match based on typical quiz options
        return {
          id: String.fromCharCode(65 + idx), // A, B, C, D
          text: opt,
          isCorrect: idx === 0 // default fallback
        };
      });
      return {
        question: q.question,
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
  
  // Soldier position (percentage %)
  const [playerPos, setPlayerPos] = useState({ x: 50, y: 80 });
  const playerPosRef = useRef({ x: 50, y: 80 });
  
  // Screen shake animation
  const [isShaking, setIsShaking] = useState(false);
  
  // VFX state arrays
  const [fireworks, setFireworks] = useState<FireworkParticle[]>([]);
  const [explosions, setExplosions] = useState<ExplosionEffect[]>([]);
  
  // Shuffled and positioned answers for the current question
  const [currentAnswers, setCurrentAnswers] = useState<Answer[]>([]);

  const boardRef = useRef<HTMLDivElement>(null);
  const animationFrameIdRef = useRef<number | null>(null);
  const keysPressedRef = useRef<Record<string, boolean>>({});

  const playerSpeed = 0.8; // Percent per frame
  const hitRadius = 35; // Collision radius in pixels

  // Sync state coordinates to ref
  useEffect(() => {
    playerPosRef.current = playerPos;
  }, [playerPos]);

  // Load a new question and generate random coordinates for options on the grass field
  const loadQuestion = (index: number) => {
    if (index >= gameQuestions.length) {
      setIsGameOver(true);
      return;
    }

    setIsProcessingAnswer(false);
    setIsAutoMoving(false);
    if (animationFrameIdRef.current) {
      cancelAnimationFrame(animationFrameIdRef.current);
    }

    // Reset player position back to start base
    setPlayerPos({ x: 50, y: 80 });
    playerPosRef.current = { x: 50, y: 80 };

    const q = gameQuestions[index];
    const originalAnswers = q.answers || [];

    // Position presets (percentage coordinates around the field)
    const presetPositions = [
      { x: 25, y: 25 },
      { x: 75, y: 25 },
      { x: 25, y: 55 },
      { x: 75, y: 55 },
      { x: 50, y: 40 },
      { x: 15, y: 40 },
      { x: 85, y: 40 }
    ];

    // Shuffle positions
    const shuffledPositions = [...presetPositions].sort(() => Math.random() - 0.5);
    
    // Shuffle the answers
    const shuffledAnswers = [...originalAnswers].sort(() => Math.random() - 0.5);
    const labels = ['A', 'B', 'C', 'D', 'E', 'F'];

    const formattedAnswers = shuffledAnswers.map((ans, idx) => ({
      ...ans,
      displayId: labels[idx],
      x: shuffledPositions[idx]?.x || 50,
      y: shuffledPositions[idx]?.y || 50
    }));

    setCurrentAnswers(formattedAnswers);
  };

  // Load first question on mount
  useEffect(() => {
    if (gameQuestions.length > 0) {
      loadQuestion(0);
    }
  }, [gameQuestions]);

  // Auto-move navigation handler (A* / Vector translation approximation)
  const startAutoMove = (targetX: number, targetY: number, onArrival?: () => void) => {
    if (isGameOver || isProcessingAnswer) return;
    setIsAutoMoving(true);

    if (animationFrameIdRef.current) {
      cancelAnimationFrame(animationFrameIdRef.current);
    }

    const stepMove = () => {
      const current = playerPosRef.current;
      const dx = targetX - current.x;
      const dy = targetY - current.y;
      const distance = Math.sqrt(dx * dx + dy * dy);

      if (distance < playerSpeed * 1.5) {
        setPlayerPos({ x: targetX, y: targetY });
        setIsAutoMoving(false);
        if (onArrival) onArrival();
        return;
      }

      const ratio = playerSpeed / distance;
      const nextX = current.x + dx * ratio;
      const nextY = current.y + dy * ratio;

      setPlayerPos({ x: nextX, y: nextY });
      animationFrameIdRef.current = requestAnimationFrame(stepMove);
    };

    animationFrameIdRef.current = requestAnimationFrame(stepMove);
  };

  // Keyboard navigation loop
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'w', 'a', 's', 'd'].includes(e.key)) {
        e.preventDefault();
      }
      keysPressedRef.current[e.key.toLowerCase()] = true;

      if (!isGameOver && !isProcessingAnswer && !isAutoMoving) {
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
  }, [isGameOver, isProcessingAnswer, isAutoMoving]);

  const movePlayerWithKeys = () => {
    if (isGameOver || isProcessingAnswer || isAutoMoving) {
      animationFrameIdRef.current = null;
      return;
    }

    let moved = false;
    const current = playerPosRef.current;
    let nextX = current.x;
    let nextY = current.y;

    const manualSpeed = playerSpeed * 1.3;
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

    // Limit screen bounds
    nextX = Math.max(5, Math.min(95, nextX));
    nextY = Math.max(5, Math.min(95, nextY));

    if (moved) {
      setPlayerPos({ x: nextX, y: nextY });
      checkCollisionWithAnswers(nextX, nextY);
    }

    // Continue frame loop if keys are still active
    const anyKeyPressed = ['arrowup', 'arrowdown', 'arrowleft', 'arrowright', 'w', 'a', 's', 'd'].some(
      (k) => keysPressedRef.current[k]
    );

    if (anyKeyPressed) {
      animationFrameIdRef.current = requestAnimationFrame(movePlayerWithKeys);
    } else {
      animationFrameIdRef.current = null;
    }
  };

  const checkCollisionWithAnswers = (px: number, py: number) => {
    if (!boardRef.current) return;
    const boardWidth = boardRef.current.clientWidth;
    const boardHeight = boardRef.current.clientHeight;

    // Convert player % coordinates to absolute pixels
    const playerAbsX = (px / 100) * boardWidth;
    const playerAbsY = (py / 100) * boardHeight;

    currentAnswers.forEach((ans) => {
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
    if (isProcessingAnswer) return;
    setIsProcessingAnswer(true);

    if (animationFrameIdRef.current) {
      cancelAnimationFrame(animationFrameIdRef.current);
      animationFrameIdRef.current = null;
    }

    const currentQ = gameQuestions[currentQuestionIndex];
    const originalAnswers = currentQ.answers || [];
    const optionIndex = originalAnswers.findIndex((a) => a.id === answer.id);

    const nextScore = answer.isCorrect ? score + 10 : score;
    const nextCorrectCount = answer.isCorrect ? correctAnswersCount + 1 : correctAnswersCount;
    const nextAnswersMap = { ...answersMap, [currentQuestionIndex.toString()]: optionIndex >= 0 ? optionIndex : 0 };

    setScore(nextScore);
    setCorrectAnswersCount(nextCorrectCount);
    setAnswersMap(nextAnswersMap);

    // Locate explosion/particle point
    if (answer.x !== undefined && answer.y !== undefined && boardRef.current) {
      const boardWidth = boardRef.current.clientWidth;
      const boardHeight = boardRef.current.clientHeight;
      const xPixel = (answer.x / 100) * boardWidth;
      const yPixel = (answer.y / 100) * boardHeight;

      if (answer.isCorrect) {
        // Award points & play fireworks sparks
        triggerFireworks(xPixel, yPixel);
      } else {
        // Shake screen and detonate landmine!
        setIsShaking(true);
        triggerExplosion(xPixel, yPixel);
        setTimeout(() => setIsShaking(false), 600);
      }
    }

    // Proceed to next question with brief delays
    setTimeout(() => {
      const nextIdx = currentQuestionIndex + 1;
      if (nextIdx >= gameQuestions.length) {
        setIsGameOver(true);
        if (onSubmitWork) {
          onSubmitWork(nextScore, nextCorrectCount, nextAnswersMap);
        }
      } else {
        setCurrentQuestionIndex(nextIdx);
        loadQuestion(nextIdx);
      }
    }, answer.isCorrect ? 2500 : 2000);
  };

  const triggerFireworks = (x: number, y: number) => {
    const colors = ['#ffd700', '#4ade80', '#60a5fa', '#f472b6', '#c084fc', '#fb923c'];
    const pCount = 35;
    const newParticles: FireworkParticle[] = [];

    for (let i = 0; i < pCount; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 3 + Math.random() * 5;
      newParticles.push({
        id: `firework-${i}-${Date.now()}`,
        x,
        y,
        tx: Math.cos(angle) * speed * 35,
        ty: Math.sin(angle) * speed * 35,
        color: colors[Math.floor(Math.random() * colors.length)]
      });
    }
    setFireworks(newParticles);
    setTimeout(() => setFireworks([]), 1800);
  };

  const triggerExplosion = (x: number, y: number) => {
    const newId = `explosion-${Date.now()}`;
    setExplosions([{ id: newId, x, y }]);
    setTimeout(() => setExplosions([]), 800);
  };

  const handleBoardClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (isGameOver || isProcessingAnswer || isAutoMoving || !boardRef.current) return;
    const rect = boardRef.current.getBoundingClientRect();
    const clickX = ((e.clientX - rect.left) / rect.width) * 100;
    const clickY = ((e.clientY - rect.top) / rect.height) * 100;
    
    startAutoMove(clickX, clickY, () => {
      checkCollisionWithAnswers(clickX, clickY);
    });
  };

  const handleNodeClick = (e: React.MouseEvent, ans: Answer) => {
    e.stopPropagation();
    if (isGameOver || isProcessingAnswer || isAutoMoving) return;
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
    setIsGameOver(false);
    setIsProcessingAnswer(false);
    setIsAutoMoving(false);
    setTimeout(() => loadQuestion(0), 100);
  };

  const q = gameQuestions[currentQuestionIndex];

  return (
    <div className="flex flex-row h-[550px] sm:h-[600px] w-full text-slate-800 select-none overflow-hidden relative rounded-2xl border border-indigo-100 bg-white shadow-xl custom-game-container">
      
      {/* LEFT: QUESTION AND SCOREBOARD PANEL */}
      <div className="w-72 sm:w-80 bg-slate-50 border-r border-indigo-100/80 p-4 sm:p-5 flex flex-col justify-between shrink-0 relative z-30 shadow-sm">
        <div className="space-y-4">
          <button 
            onClick={onClose}
            className="flex items-center gap-1.5 px-3 py-2 bg-indigo-50 hover:bg-indigo-100 text-xs font-black text-indigo-700 rounded-xl transition shadow-sm border border-indigo-200"
          >
            <ArrowLeft className="w-3.5 h-3.5" /> Quay lại
          </button>

          <div className="bg-white border-2 border-indigo-100/80 p-4 rounded-2xl shadow-sm relative overflow-hidden min-h-[220px] flex flex-col justify-between">
            {isGameOver ? (
              <div className="text-center space-y-4 py-6 animate-scaleIn flex-1 flex flex-col items-center justify-center">
                <div className="w-12 h-12 bg-emerald-100 border border-emerald-300 rounded-full flex items-center justify-center text-emerald-600 text-xl font-bold animate-bounce shadow-sm">
                  🏆
                </div>
                <h4 className="text-base font-black text-slate-800">Hoàn Thành!</h4>
                <p className="text-[11px] text-slate-500 font-medium">
                  Chúc mừng bạn đã rà phá thành công bãi mìn!
                </p>
                <div className="text-xl font-black text-indigo-600 bg-indigo-50 px-4 py-1.5 rounded-full border border-indigo-100">
                  {score} Điểm
                </div>
                <button 
                  onClick={restartGame}
                  className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white font-black text-xs rounded-xl active:scale-95 transition-all shadow-md shadow-indigo-100"
                >
                  Chơi lại
                </button>
              </div>
            ) : (
              <>
                <div className="text-center border-b border-indigo-50 pb-2">
                  <span className="text-indigo-600 font-extrabold text-[10px] tracking-widest uppercase bg-indigo-50 px-2.5 py-1 rounded-full border border-indigo-100">
                    Câu hỏi {currentQuestionIndex + 1} / {gameQuestions.length}
                  </span>
                </div>

                <div className="flex-1 flex items-center justify-center py-4">
                  <div className="text-sm sm:text-base font-extrabold text-slate-800 text-center leading-relaxed">
                    <MarkdownMath content={q?.question || 'Câu hỏi...'} />
                  </div>
                </div>

                <div className="text-[10px] text-slate-500 flex items-center gap-1 justify-center border-t border-indigo-50 pt-2 font-medium">
                  <Keyboard className="w-3.5 h-3.5 text-indigo-500" /> Sử dụng WASD / Phím mũi tên để di chuyển
                </div>
              </>
            )}
          </div>
        </div>

        {/* HUD control map details */}
        <div className="mt-4 p-3.5 bg-indigo-50/50 border border-indigo-100 rounded-xl space-y-2 hidden sm:block">
          <span className="text-[9px] font-black uppercase text-indigo-600 tracking-wider block">
            Cách phá mìn an toàn:
          </span>
          <p className="text-[10px] text-indigo-950/80 leading-normal font-medium">
            Nhấp chuột trực tiếp lên các ô nhãn chữ <span className="font-bold text-indigo-600 bg-indigo-50 px-1 py-0.5 rounded">A, B, C, D</span> trên bãi cỏ để lính rà mìn tự động đi tới và gỡ mìn tương ứng!
          </p>
        </div>
      </div>

      {/* RIGHT: INTERACTIVE MILITARY GRASS MAP */}
      <div className="flex-1 h-full relative bg-slate-100 overflow-hidden" id="game-container">
        
        {/* Float Status Ribbon */}
        <div className="absolute top-4 left-0 right-0 z-20 flex justify-center pointer-events-none">
          <div className="bg-white/95 text-slate-800 px-5 py-2 rounded-full border border-indigo-100 shadow-xl flex items-center gap-4 pointer-events-auto">
            <div className="flex items-center gap-1.5">
              <Star className="w-4 h-4 text-amber-500 fill-amber-500 animate-spin-slow" />
              <span className="font-black text-lg text-amber-500">{score}</span>
              <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Điểm</span>
            </div>
            <div className="w-px h-4 bg-indigo-100" />
            <div className="text-xs font-black text-indigo-600">
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
          }`}
          style={{
            backgroundColor: '#86efac',
            backgroundImage: `
              radial-gradient(#4ade80 20%, transparent 20%),
              radial-gradient(#4ade80 20%, transparent 20%)
            `,
            backgroundSize: '32px 32px',
            backgroundPosition: '0 0, 16px 16px'
          }}
        >
          {/* Answer Nodes on field */}
          {!isGameOver && currentAnswers.map((ans, idx) => (
            <div
              key={idx}
              onClick={(e) => handleNodeClick(e, ans)}
              className="absolute transform -translate-x-1/2 -translate-y-1/2 flex flex-col items-center justify-center cursor-pointer group z-10"
              style={{
                left: `${ans.x}%`,
                top: `${ans.y}%`,
                animation: `bounce ${2 + idx * 0.3}s infinite ease-in-out`
              }}
            >
              {/* Floating Balloon Pin */}
              <div className="relative flex flex-col items-center">
                <div className="w-11 h-11 rounded-full border-4 border-white flex items-center justify-center text-white font-black text-sm shadow-xl transition-all duration-200 bg-indigo-600 group-hover:scale-110 group-hover:bg-indigo-700">
                  {ans.displayId}
                </div>
                
                {/* Answer Banner tag */}
                <div className="mt-1.5 px-3 py-1 bg-white border border-indigo-100 rounded-full text-[10px] font-extrabold text-indigo-950 shadow-md whitespace-nowrap group-hover:border-indigo-300 transition-all">
                  <MarkdownMath content={ans.text} />
                </div>
              </div>
            </div>
          ))}

          {/* Player avatar representation (Mũ Cối Soldier) */}
          <div 
            className="absolute z-20 transform -translate-x-1/2 -translate-y-1/2 transition-all duration-75"
            style={{
              left: `${playerPos.x}%`,
              top: `${playerPos.y}%`
            }}
          >
            <div className="relative w-12 h-12 flex flex-col items-center justify-center">
              {/* Helmet cap circle */}
              <div className="absolute top-0 w-10 h-10 bg-emerald-600 rounded-full border-2 border-emerald-800 shadow-2xl z-20 flex items-center justify-center">
                {/* Yellow star insignia */}
                <div className="w-2.5 h-2.5 bg-yellow-400 rounded-full border border-yellow-600 animate-pulse" />
              </div>
              {/* Wide rim of pith helmet */}
              <div className="absolute top-1.5 w-12 h-7 bg-emerald-700 rounded-full border border-emerald-800 z-10" />
              {/* Backpack bag */}
              <div className="absolute bottom-0 w-8 h-4 bg-amber-600 rounded-md border border-amber-700 z-0" />
              {/* Torso */}
              <div className="absolute top-4 w-9 h-6 bg-emerald-500 rounded-xl border border-emerald-700 z-10" />
            </div>
          </div>

          {/* Particle Systems inside Canvas Container */}
          {fireworks.map((p) => (
            <div
              key={p.id}
              className="absolute w-2 h-2 rounded-full pointer-events-none"
              style={{
                left: `${p.x}px`,
                top: `${p.y}px`,
                backgroundColor: p.color,
                boxShadow: `0 0 8px ${p.color}`,
                transform: `translate(${p.tx}px, ${p.ty}px)`,
                opacity: 0,
                transition: 'transform 1.5s cubic-bezier(0.1, 0.8, 0.3, 1), opacity 1.5s ease-out'
              }}
              ref={(el) => {
                if (el) {
                  // Force reflow and schedule transformation for seamless firework emission
                  requestAnimationFrame(() => {
                    el.style.transform = `translate(${p.tx}px, ${p.ty}px) scale(0)`;
                    el.style.opacity = '1';
                  });
                }
              }}
            />
          ))}

          {/* Explosion Detonation Circles */}
          {explosions.map((exp) => (
            <div
              key={exp.id}
              className="absolute rounded-full pointer-events-none z-30"
              style={{
                left: `${exp.x}px`,
                top: `${exp.y}px`,
                width: '80px',
                height: '80px',
                marginLeft: '-40px',
                marginTop: '-40px',
                background: 'radial-gradient(circle, #ffe600 10%, #ff5d00 45%, #ff0000 75%, transparent 100%)',
                animation: 'pop-big 0.7s cubic-bezier(0.15, 0.9, 0.3, 1.2) forwards'
              }}
            />
          ))}
        </div>
      </div>

      {/* Explosion animation custom injection */}
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
        /* Custom scrollbar styling specifically matching system indigo theme */
        ::-webkit-scrollbar {
          width: 8px;
          height: 8px;
        }
        ::-webkit-scrollbar-track {
          background: #f8fafc;
          border-radius: 9999px;
        }
        ::-webkit-scrollbar-thumb {
          background: #c7d2fe;
          border-radius: 9999px;
          border: 2px solid #f8fafc;
        }
        ::-webkit-scrollbar-thumb:hover {
          background: #818cf8;
        }
      `}</style>
    </div>
  );
}
