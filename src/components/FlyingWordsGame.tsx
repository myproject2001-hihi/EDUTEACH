import React, { useState, useEffect, useRef } from 'react';
import { Star, Trophy, Sparkles, RotateCw, CheckCircle2, ArrowRight } from 'lucide-react';
import { MarkdownMath } from './MarkdownMath';
import { ParsedQuestionItem, cleanQuestionText } from '../views/AssignmentsView';

export interface LevelData {
  sentence: string[];
  distractors: string[];
  hint: string;
}

export interface WordObj {
  id: string;
  text: string;
  x: number;
  y: number;
  vx: number;
  vy: number;
  w: number;
  h: number;
  isCaught: boolean;
  slotIndex: number;
  colorClass: string;
  isWrongTemp?: boolean;
}

export interface SlotObj {
  index: number;
  expectedText: string;
  currentWordId: string | null;
}

export interface FlyingWordsGameProps {
  questions: ParsedQuestionItem[];
  onClose: () => void;
  isStudentMode?: boolean;
  onSubmitWork?: (score: number, correctAnswers: number, answersMap: Record<string, number>) => void;
}

// Built-in default levels if no questions supplied or for fallback
const DEFAULT_LEVEL_DATA: LevelData[] = [
  {
    sentence: ["Học", "đi", "đôi", "với", "hành"],
    distractors: ["chơi", "ngủ", "nói"],
    hint: "Tục ngữ: Lý thuyết phải đi liền với thực tiễn."
  },
  {
    sentence: ["Con", "mèo", "thích", "bắt", "chuột"],
    distractors: ["chó", "cá", "bay", "gặm"],
    hint: "Loài vật nào là khắc tinh của loài chuột?"
  },
  {
    sentence: ["Uống", "nước", "nhớ", "nguồn"],
    distractors: ["ăn", "cây", "sông", "biển"],
    hint: "Tục ngữ khuyên chúng ta phải biết ơn người đi trước."
  },
  {
    sentence: ["Lá", "lành", "đùm", "lá", "rách"],
    distractors: ["cây", "rụng", "gió", "xanh"],
    hint: "Tục ngữ về tinh thần tương thân tương ái, giúp đỡ nhau."
  },
  {
    sentence: ["Có", "công", "mài", "sắt", "có", "ngày", "nên", "kim"],
    distractors: ["chờ", "vàng", "búa", "kéo"],
    hint: "Tục ngữ khuyên chúng ta phải kiên trì, nhẫn nại."
  }
];

const BUBBLE_COLORS = [
  'from-pink-400 to-rose-500 border-rose-300 shadow-rose-200',
  'from-purple-400 to-violet-500 border-violet-300 shadow-violet-200',
  'from-blue-400 to-indigo-500 border-indigo-300 shadow-indigo-200',
  'from-teal-400 to-emerald-500 border-emerald-300 shadow-emerald-200',
  'from-orange-400 to-amber-500 border-amber-300 shadow-amber-200',
  'from-fuchsia-400 to-pink-500 border-fuchsia-300 shadow-fuchsia-200'
];

function getRandomColor(index: number) {
  return BUBBLE_COLORS[index % BUBBLE_COLORS.length];
}

// Parse input questions into FlyingWords LevelData
export function parseQuestionToLevel(q: ParsedQuestionItem, index: number): LevelData {
  let hint = cleanQuestionText(q.question) || `Thử thách ${index + 1}`;
  let sentence: string[] = [];
  let distractors: string[] = [];

  // Look for "Gợi ý:" in question text
  const hintMatch = q.question.match(/Gợi ý:\s*([^\n]+)/i);
  if (hintMatch) {
    hint = hintMatch[1].trim();
  }

  // Check if correctAnswer has pipe '|' syntax
  if (typeof q.correctAnswer === 'string' && q.correctAnswer.includes('|')) {
    sentence = q.correctAnswer.split('|').map(s => s.trim()).filter(Boolean);
  } else if (typeof q.correctAnswer === 'string' && q.correctAnswer.trim().length > 0) {
    sentence = q.correctAnswer.trim().split(/\s+/).filter(Boolean);
  } else if (q.options && q.options.length > 0) {
    // If multiple choice
    const correctIdx = typeof q.correctAnswer === 'number' ? q.correctAnswer : 0;
    const correctOptionText = q.options[correctIdx] || q.options[0] || '';
    
    if (correctOptionText.includes('|')) {
      sentence = correctOptionText.split('|').map(s => s.trim()).filter(Boolean);
    } else {
      sentence = correctOptionText.trim().split(/\s+/).filter(Boolean);
    }

    // Wrong options as distractors
    q.options.forEach((opt, idx) => {
      if (idx !== correctIdx && opt) {
        const words = opt.split(/\s+/).filter(w => w.length > 0);
        words.forEach(w => {
          if (!sentence.includes(w) && !distractors.includes(w) && distractors.length < 5) {
            distractors.push(w);
          }
        });
      }
    });
  }

  // Look for "Nhiễu:" in solutionText or question
  const noiseSource = (q.solutionText || '') + ' ' + q.question;
  const noiseMatch = noiseSource.match(/(?:Nhiễu|Từ nhiễu|Distractors):\s*([^\n]+)/i);
  if (noiseMatch) {
    const rawNoise = noiseMatch[1].trim();
    const noiseWords = rawNoise.includes('|') ? rawNoise.split('|') : rawNoise.split(/[,;\s]+/);
    distractors = noiseWords.map(w => w.trim()).filter(Boolean);
  }

  // Fallback defaults if sentence is empty
  if (sentence.length === 0) {
    const fallback = DEFAULT_LEVEL_DATA[index % DEFAULT_LEVEL_DATA.length];
    sentence = fallback.sentence;
    distractors = fallback.distractors;
    if (!hint || hint.startsWith('Thử thách')) {
      hint = fallback.hint;
    }
  }

  return { sentence, distractors, hint };
}

export function FlyingWordsGame({
  questions,
  onClose,
  isStudentMode = false,
  onSubmitWork
}: FlyingWordsGameProps) {
  // Convert questions to levels
  const levels: LevelData[] = React.useMemo(() => {
    if (!questions || questions.length === 0) {
      return DEFAULT_LEVEL_DATA;
    }
    return questions.map((q, idx) => parseQuestionToLevel(q, idx));
  }, [questions]);

  const [currentLevelIndex, setCurrentLevelIndex] = useState(0);
  const [score, setScore] = useState(0);
  const [correctAnswersCount, setCorrectAnswersCount] = useState(0);
  const [answersMap, setAnswersMap] = useState<Record<string, number>>({});
  
  const [words, setWords] = useState<WordObj[]>([]);
  const [slots, setSlots] = useState<SlotObj[]>([]);
  const [isLevelWon, setIsLevelWon] = useState(false);
  const [isGameFinished, setIsGameFinished] = useState(false);
  const [isShaking, setIsShaking] = useState(false);

  const playAreaRef = useRef<HTMLDivElement>(null);
  const animationFrameRef = useRef<number | null>(null);
  const wordsRef = useRef<WordObj[]>([]);

  // Keep wordsRef synced with words state for physics loop
  useEffect(() => {
    wordsRef.current = words;
  }, [words]);

  const currentLevel = levels[currentLevelIndex] || levels[0];

  // Load Level
  const loadLevel = (levelIdx: number) => {
    setIsLevelWon(false);
    setIsShaking(false);

    const level = levels[levelIdx] || levels[0];
    
    // Create Slots
    const newSlots: SlotObj[] = level.sentence.map((word, i) => ({
      index: i,
      expectedText: word,
      currentWordId: null
    }));
    setSlots(newSlots);

    // Combine correct words and distractors
    const allWordTexts = [...level.sentence, ...level.distractors];
    // Shuffle
    const shuffled = [...allWordTexts].sort(() => Math.random() - 0.5);

    // Initial words setup
    const initialWords: WordObj[] = shuffled.map((text, i) => {
      // Random position percentage inside play area
      const startX = 10 + Math.random() * 70; // 10% to 80%
      const startY = 10 + Math.random() * 60; // 10% to 70%

      const speed = 1.2 + Math.random() * 1.5;
      const angle = Math.random() * Math.PI * 2;
      const vx = Math.cos(angle) * speed;
      const vy = Math.sin(angle) * speed;

      return {
        id: `word_${levelIdx}_${i}_${Date.now()}`,
        text,
        x: startX,
        y: startY,
        vx,
        vy,
        w: 90,
        h: 44,
        isCaught: false,
        slotIndex: -1,
        colorClass: getRandomColor(i)
      };
    });

    setWords(initialWords);
    wordsRef.current = initialWords;
  };

  // Initialize level when currentLevelIndex changes
  useEffect(() => {
    loadLevel(currentLevelIndex);
  }, [currentLevelIndex, levels]);

  // Physics animation loop
  useEffect(() => {
    const gameLoop = () => {
      if (!playAreaRef.current) {
        animationFrameRef.current = requestAnimationFrame(gameLoop);
        return;
      }

      const rect = playAreaRef.current.getBoundingClientRect();
      const pWidth = rect.width || 800;
      const pHeight = rect.height || 400;

      let hasUpdate = false;
      const updatedWords = wordsRef.current.map(w => {
        if (w.isCaught) return w;

        hasUpdate = true;
        let newX = w.x + (w.vx / pWidth) * 100;
        let newY = w.y + (w.vy / pHeight) * 100;
        let newVx = w.vx;
        let newVy = w.vy;

        // Bounce boundaries (%)
        if (newX <= 2) {
          newX = 2;
          newVx = Math.abs(newVx);
        } else if (newX >= 82) {
          newX = 82;
          newVx = -Math.abs(newVx);
        }

        if (newY <= 2) {
          newY = 2;
          newVy = Math.abs(newVy);
        } else if (newY >= 78) {
          newY = 78;
          newVy = -Math.abs(newVy);
        }

        return {
          ...w,
          x: newX,
          y: newY,
          vx: newVx,
          vy: newVy
        };
      });

      if (hasUpdate) {
        wordsRef.current = updatedWords;
        setWords(updatedWords);
      }

      animationFrameRef.current = requestAnimationFrame(gameLoop);
    };

    animationFrameRef.current = requestAnimationFrame(gameLoop);

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, []);

  // Catch a flying word into slot
  const handleCatchWord = (wordObj: WordObj) => {
    if (wordObj.isCaught || isLevelWon) return;

    // Find first empty slot
    const emptySlot = slots.find(s => s.currentWordId === null);
    if (!emptySlot) {
      // Slots are full, shake target area
      triggerShake();
      return;
    }

    const slotIdx = emptySlot.index;

    // Update word state
    const nextWords = words.map(w => {
      if (w.id === wordObj.id) {
        return {
          ...w,
          isCaught: true,
          slotIndex: slotIdx,
          isWrongTemp: false
        };
      }
      return w;
    });

    // Update slot state
    const nextSlots = slots.map(s => {
      if (s.index === slotIdx) {
        return { ...s, currentWordId: wordObj.id };
      }
      return s;
    });

    setWords(nextWords);
    wordsRef.current = nextWords;
    setSlots(nextSlots);

    // Check win condition after update
    checkWinCondition(nextSlots, nextWords);
  };

  // Release a caught word back to flying sky
  const handleReleaseWord = (slotObj: SlotObj) => {
    if (!slotObj.currentWordId || isLevelWon) return;

    const wordId = slotObj.currentWordId;

    // Clear slot
    const nextSlots = slots.map(s => {
      if (s.index === slotObj.index) {
        return { ...s, currentWordId: null };
      }
      return s;
    });

    // Pop word back into sky above slots
    const nextWords = words.map(w => {
      if (w.id === wordId) {
        return {
          ...w,
          isCaught: false,
          slotIndex: -1,
          x: 20 + Math.random() * 60,
          y: 60,
          vy: -(1.5 + Math.random() * 1.5),
          vx: (Math.random() - 0.5) * 3,
          isWrongTemp: false
        };
      }
      return w;
    });

    setSlots(nextSlots);
    setWords(nextWords);
    wordsRef.current = nextWords;
  };

  const triggerShake = () => {
    setIsShaking(true);
    setTimeout(() => setIsShaking(false), 500);
  };

  // Check if all slots filled and correct
  const checkWinCondition = (currentSlots: SlotObj[], currentWords: WordObj[]) => {
    const allFilled = currentSlots.every(s => s.currentWordId !== null);
    if (!allFilled) return;

    let isCorrect = true;
    currentSlots.forEach(slot => {
      const placedWord = currentWords.find(w => w.id === slot.currentWordId);
      if (!placedWord || placedWord.text !== slot.expectedText) {
        isCorrect = false;
      }
    });

    if (isCorrect) {
      handleWin();
    } else {
      handleWrong(currentSlots, currentWords);
    }
  };

  const handleWrong = (currentSlots: SlotObj[], currentWords: WordObj[]) => {
    triggerShake();

    // Mark incorrect words temporarily in red
    const updatedWords = currentWords.map(w => {
      if (w.slotIndex !== -1) {
        const slot = currentSlots[w.slotIndex];
        if (slot && w.text !== slot.expectedText) {
          return { ...w, isWrongTemp: true };
        }
      }
      return w;
    });
    setWords(updatedWords);
    wordsRef.current = updatedWords;

    // Auto-eject wrong words after a brief feedback delay
    setTimeout(() => {
      let latestWords = wordsRef.current;
      let latestSlots = [...currentSlots];

      latestSlots = latestSlots.map(slot => {
        const word = latestWords.find(w => w.id === slot.currentWordId);
        if (word && word.text !== slot.expectedText) {
          // Release wrong word
          latestWords = latestWords.map(w => {
            if (w.id === word.id) {
              return {
                ...w,
                isCaught: false,
                slotIndex: -1,
                x: 15 + Math.random() * 70,
                y: 50,
                vy: -(1.5 + Math.random() * 1.5),
                vx: (Math.random() - 0.5) * 3,
                isWrongTemp: false
              };
            }
            return w;
          });
          return { ...slot, currentWordId: null };
        }
        return slot;
      });

      setSlots(latestSlots);
      setWords(latestWords);
      wordsRef.current = latestWords;
    }, 550);
  };

  const handleWin = () => {
    setIsLevelWon(true);

    const nextScore = score + 10;
    const nextCorrectCount = correctAnswersCount + 1;
    const qId = questions[currentLevelIndex]?.id || `q_${currentLevelIndex}`;
    const nextAnswersMap = { ...answersMap, [qId]: 1 };

    setScore(nextScore);
    setCorrectAnswersCount(nextCorrectCount);
    setAnswersMap(nextAnswersMap);

    // Auto notify submission handler in student mode
    if (onSubmitWork) {
      onSubmitWork(nextScore, nextCorrectCount, nextAnswersMap);
    }
  };

  const handleNextLevel = () => {
    if (currentLevelIndex + 1 < levels.length) {
      setCurrentLevelIndex(prev => prev + 1);
    } else {
      setIsGameFinished(true);
    }
  };

  const restartGame = () => {
    setCurrentLevelIndex(0);
    setScore(0);
    setCorrectAnswersCount(0);
    setAnswersMap({});
    setIsGameFinished(false);
    loadLevel(0);
  };

  return (
    <div 
      className="w-full h-full flex-1 min-h-0 text-slate-800 select-none overflow-hidden relative rounded-2xl border border-sky-200 shadow-2xl flex flex-col custom-game-container"
      style={{ background: 'linear-gradient(180deg, #38bdf8 0%, #bae6fd 50%, #e0f2fe 100%)' }}
      id="game-container"
    >
      {/* Dynamic Keyframe Animations */}
      <style>{`
        @keyframes floatCloud {
          0% { transform: translateX(100vw); }
          100% { transform: translateX(-200px); }
        }
        @keyframes shakeError {
          0%, 100% { transform: translateX(0); }
          20%, 60% { transform: translateX(-8px); }
          40%, 80% { transform: translateX(8px); }
        }
        .animate-shake {
          animation: shakeError 0.4s ease-in-out;
        }
        @keyframes popSuccess {
          0% { transform: scale(0.8); opacity: 0; }
          50% { transform: scale(1.1); }
          100% { transform: scale(1); opacity: 1; }
        }
        .animate-pop {
          animation: popSuccess 0.35s cubic-bezier(0.175, 0.885, 0.32, 1.275) forwards;
        }
      `}</style>

      {/* Background Animated Clouds */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none opacity-60">
        <div 
          className="absolute top-8 left-0 w-28 h-9 bg-white rounded-full blur-[1px] shadow-sm"
          style={{ animation: 'floatCloud 38s linear infinite' }}
        />
        <div 
          className="absolute top-24 left-0 w-36 h-11 bg-white rounded-full blur-[1px] shadow-sm"
          style={{ animation: 'floatCloud 52s linear infinite', animationDelay: '-15s' }}
        />
        <div 
          className="absolute top-16 left-0 w-24 h-8 bg-white rounded-full blur-[1px] shadow-sm"
          style={{ animation: 'floatCloud 44s linear infinite', animationDelay: '-8s' }}
        />
      </div>

      {/* TOP HEADER BAR (UNIFIED FLEX LAYOUT - NO OVERLAPPING & NO BACK BUTTON) */}
      <div className="absolute top-2.5 sm:top-4 left-2.5 sm:left-4 right-2.5 sm:right-4 z-30 pointer-events-none flex items-start justify-between gap-2 sm:gap-4">
        
        {/* LEFT: QUESTION / LEVEL BADGE */}
        <div className="bg-white/95 backdrop-blur-md px-3 py-2 sm:px-4 sm:py-2.5 rounded-2xl border-2 border-sky-200 shadow-xl pointer-events-auto shrink-0 flex items-center justify-center">
          <span className="text-sky-700 font-black text-xs sm:text-sm tracking-wide">
            Cấp độ: {currentLevelIndex + 1}/{levels.length}
          </span>
        </div>

        {/* CENTER: FLOATING QUESTION / HINT CARD */}
        <div className="bg-white/95 backdrop-blur-md border-2 border-sky-200/90 px-4 py-2 sm:px-6 sm:py-2.5 rounded-2xl sm:rounded-3xl shadow-2xl pointer-events-auto flex-1 max-w-2xl text-center flex flex-col items-center justify-center min-h-[48px]">
          <div className="text-xs sm:text-sm md:text-base lg:text-lg font-black text-slate-800 leading-snug max-h-[75px] sm:max-h-[95px] overflow-y-auto custom-scrollbar w-full px-1">
            <span className="text-sky-600 font-bold mr-1">Gợi ý:</span>
            <MarkdownMath content={currentLevel.hint} />
          </div>
        </div>

        {/* RIGHT: SCORE RIBBON */}
        <div className="bg-white/95 backdrop-blur-md text-slate-800 px-3 py-2 sm:px-5 sm:py-2.5 rounded-2xl border-2 border-sky-200 shadow-xl flex items-center gap-1.5 sm:gap-2.5 pointer-events-auto shrink-0">
          <Star className="w-4 h-4 sm:w-5 sm:h-5 text-amber-500 fill-amber-500 animate-spin-slow" />
          <span className="font-black text-sm sm:text-lg lg:text-xl text-amber-500">{score}</span>
          <span className="text-[9px] sm:text-[10px] font-black text-slate-400 uppercase tracking-widest hidden sm:inline">Điểm</span>
        </div>

      </div>

      {/* PLAY AREA (Where word bubbles fly and bounce) */}
      <div 
        ref={playAreaRef}
        className="flex-1 relative w-full overflow-hidden mt-16 sm:mt-20 z-10"
      >
        {words.filter(w => !w.isCaught).map((wordObj) => (
          <div
            key={wordObj.id}
            onClick={() => handleCatchWord(wordObj)}
            style={{
              left: `${wordObj.x}%`,
              top: `${wordObj.y}%`,
              transition: 'transform 0.15s ease-out'
            }}
            className="absolute cursor-pointer pointer-events-auto transform hover:scale-110 active:scale-95 transition-transform"
          >
            <div className={`px-4 py-2 sm:px-5 sm:py-2.5 rounded-2xl sm:rounded-3xl bg-gradient-to-r ${wordObj.colorClass} border-2 text-white font-extrabold text-sm sm:text-base lg:text-lg shadow-lg tracking-wide select-none flex items-center justify-center whitespace-nowrap`}>
              {wordObj.text}
            </div>
          </div>
        ))}
      </div>

      {/* TARGET AREA (Where slots sit) */}
      <div 
        className={`w-full min-h-[140px] sm:min-h-[160px] bg-white/40 backdrop-blur-md border-t-4 border-white/60 p-3 sm:p-4 pb-6 flex flex-col items-center justify-center z-20 relative shadow-[0_-10px_30px_rgba(0,0,0,0.05)] ${isShaking ? 'animate-shake' : ''}`}
      >
        <div className="text-xs font-extrabold text-sky-800/80 uppercase tracking-wider mb-2">
          Chạm bóng từ ngữ để ghép thành câu hoàn chỉnh
        </div>

        <div className="flex flex-wrap items-center justify-center gap-2 sm:gap-3 max-w-4xl w-full px-2">
          {slots.map((slot) => {
            const placedWord = words.find(w => w.id === slot.currentWordId);

            return (
              <div
                key={slot.index}
                onClick={() => handleReleaseWord(slot)}
                className={`w-16 h-12 sm:w-24 sm:h-14 md:w-28 md:h-14 border-3 border-dashed rounded-2xl flex items-center justify-center relative transition-all duration-200 cursor-pointer ${
                  placedWord 
                    ? 'border-transparent bg-transparent' 
                    : 'border-sky-300/80 bg-white/50 hover:bg-white/70 hover:border-sky-400'
                }`}
              >
                {placedWord && (
                  <div className={`animate-pop w-full h-full px-3 py-2 rounded-2xl sm:rounded-3xl border-2 text-white font-extrabold text-xs sm:text-sm md:text-base shadow-md flex items-center justify-center text-center select-none whitespace-nowrap ${
                    placedWord.isWrongTemp 
                      ? 'bg-gradient-to-r from-red-500 to-rose-600 border-red-300' 
                      : isLevelWon 
                        ? 'bg-emerald-500 border-emerald-300 shadow-emerald-200' 
                        : `bg-gradient-to-r ${placedWord.colorClass}`
                  }`}>
                    {placedWord.text}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* WIN OVERLAY MODAL */}
      {isLevelWon && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-3xl p-6 sm:p-8 flex flex-col items-center shadow-2xl animate-pop border-4 border-emerald-400 max-w-sm w-full text-center space-y-4">
            <div className="w-16 h-16 bg-emerald-100 text-emerald-600 rounded-2xl flex items-center justify-center text-4xl shadow-inner">
              🎉
            </div>
            <div>
              <h2 className="text-2xl sm:text-3xl font-black text-emerald-600">Chính Xác!</h2>
              <p className="text-slate-600 font-bold mt-2 text-sm sm:text-base bg-emerald-50 p-3 rounded-2xl border border-emerald-100">
                "{currentLevel.sentence.join(' ')}"
              </p>
            </div>
            
            <button
              onClick={handleNextLevel}
              className="w-full py-3.5 bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white font-black text-base rounded-2xl shadow-xl hover:scale-105 active:scale-95 transition-all flex items-center justify-center gap-2"
            >
              <span>{currentLevelIndex + 1 < levels.length ? 'Câu Tiếp Theo' : 'Xem Kết Quả'}</span>
              <ArrowRight className="w-5 h-5" />
            </button>
          </div>
        </div>
      )}

      {/* GAME FINISHED OVERLAY */}
      {isGameFinished && (
        <div className="fixed inset-0 bg-slate-900/75 backdrop-blur-md flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-3xl p-6 sm:p-8 flex flex-col items-center shadow-2xl animate-pop border-4 border-sky-400 max-w-md w-full text-center space-y-5">
            <div className="w-20 h-20 bg-amber-100 text-amber-500 rounded-3xl flex items-center justify-center text-5xl shadow-inner">
              🏆
            </div>
            <div>
              <h2 className="text-3xl font-black text-sky-600">Tuyệt Vời!</h2>
              <p className="text-slate-500 font-bold text-sm sm:text-base mt-1">
                Bạn đã xuất sắc hoàn thành tất cả thử thách!
              </p>
            </div>

            <div className="bg-sky-50 border border-sky-200 rounded-2xl p-4 w-full flex items-center justify-around">
              <div>
                <span className="text-xs font-bold text-slate-400 uppercase">Tổng điểm</span>
                <div className="text-2xl font-black text-amber-500">{score} Điểm</div>
              </div>
              <div className="h-8 w-[1px] bg-sky-200" />
              <div>
                <span className="text-xs font-bold text-slate-400 uppercase">Hoàn thành</span>
                <div className="text-2xl font-black text-sky-600">{levels.length}/{levels.length} Cầu</div>
              </div>
            </div>

            <div className="flex gap-3 w-full pt-2">
              {!isStudentMode && (
                <button
                  onClick={restartGame}
                  className="flex-1 py-3.5 bg-indigo-600 hover:bg-indigo-500 text-white font-black text-sm rounded-2xl active:scale-95 transition-all shadow-lg shadow-indigo-200 flex items-center justify-center gap-2"
                >
                  <RotateCw className="w-4 h-4" /> Chơi Lại
                </button>
              )}
              <button
                onClick={() => {
                  if (isStudentMode && onSubmitWork) {
                    onSubmitWork(score, correctAnswersCount, answersMap);
                  }
                  onClose();
                }}
                className="flex-1 py-3.5 bg-emerald-600 hover:bg-emerald-500 text-white font-black text-sm rounded-2xl active:scale-95 transition-all shadow-lg shadow-emerald-200 flex items-center justify-center gap-2"
              >
                <CheckCircle2 className="w-4 h-4" />
                {isStudentMode ? 'Nộp bài & Kết thúc' : 'Thoát'}
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
