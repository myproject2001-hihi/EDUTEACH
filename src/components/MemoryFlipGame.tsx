import React, { useState, useEffect, useRef, useMemo } from 'react';
import { RotateCw, CheckCircle2, Brain, Hand, HelpCircle, Lightbulb } from 'lucide-react';
import { MarkdownMath } from './MarkdownMath';
import { ParsedQuestionItem, cleanQuestionText } from '../views/AssignmentsView';

export interface MemoryFlipGameProps {
  questions: ParsedQuestionItem[];
  onClose: () => void;
  isStudentMode?: boolean;
  onSubmitWork?: (score: number, correctAnswers: number, answersMap: Record<string, number>) => void;
}

export interface CardItem {
  uid: string;      // Unique instance ID for rendering
  pairId: string;   // Identifier for matching pair
  type: 'q' | 'a';  // Question card or Answer card
  content: string;  // Text or LaTeX string
  isFlipped: boolean;
  isMatched: boolean;
  isShaking: boolean;
}

interface LearningPair {
  id: string;
  q: string;
  a: string;
}

// Fallback Educational Pairs
const DEFAULT_LEARNING_PAIRS: LearningPair[] = [
  { id: 'pair1', q: "Thủ đô của Việt Nam?", a: "Hà Nội" },
  { id: 'pair2', q: "7 x 8 = ?", a: "56" },
  { id: 'pair3', q: "H2O là công thức hóa học của gì?", a: "Nước" },
  { id: 'pair4', q: "Hành tinh lớn nhất hệ Mặt Trời?", a: "Sao Mộc" },
  { id: 'pair5', q: "Tác giả Truyện Kiều?", a: "Nguyễn Du" },
  { id: 'pair6', q: "Vị vua đầu tiên của nhà Lý?", a: "Lý Thái Tổ" }
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

export function MemoryFlipGame({
  questions,
  onClose,
  isStudentMode = false,
  onSubmitWork
}: MemoryFlipGameProps) {
  // Extract topic & pairs from questions
  const { topic, learningPairs } = useMemo(() => {
    let extractedTopic = "Ghép Nối Kiến Thức";
    const pairs: LearningPair[] = [];

    if (questions && questions.length > 0) {
      questions.forEach((q, idx) => {
        if (q.groupTitle) {
          extractedTopic = q.groupTitle;
        }

        // If matching type question with explicit matchingPairs
        if (q.matchingPairs && q.matchingPairs.length > 0) {
          q.matchingPairs.forEach((mp, mpIdx) => {
            if (mp.left && mp.right) {
              pairs.push({
                id: `q_${idx}_mp_${mpIdx}`,
                q: mp.left,
                a: mp.right
              });
            }
          });
        }
        // If standard question with question & correctAnswer
        else if (q.question) {
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
              id: `q_${idx}`,
              q: rawQ,
              a: rawA
            });
          }
        }
      });
    }

    // Fallback if not enough pairs
    if (pairs.length < 3) {
      DEFAULT_LEARNING_PAIRS.forEach(dp => {
        if (!pairs.some(p => p.id === dp.id)) {
          pairs.push(dp);
        }
      });
    }

    // Limit to max 8 pairs (16 cards total) for ideal mobile/desktop display
    return {
      topic: extractedTopic,
      learningPairs: pairs.slice(0, 8)
    };
  }, [questions]);

  // Game state
  const [cards, setCards] = useState<CardItem[]>([]);
  const [flippedUids, setFlippedUids] = useState<string[]>([]);
  const [isLockBoard, setIsLockBoard] = useState(false);
  const [moves, setMoves] = useState(0);
  const [matchedPairsCount, setMatchedPairsCount] = useState(0);
  const [timeElapsed, setTimeElapsed] = useState(0);
  const [gameStarted, setGameStarted] = useState(false);
  const [isWinModalOpen, setIsWinModalOpen] = useState(false);

  const timerRef = useRef<NodeJS.Timeout | null>(null);

  // Initialize Game
  const initGame = () => {
    if (timerRef.current) clearInterval(timerRef.current);

    const generatedCards: CardItem[] = [];
    learningPairs.forEach(pair => {
      // Question card
      generatedCards.push({
        uid: `${pair.id}_q`,
        pairId: pair.id,
        type: 'q',
        content: pair.q,
        isFlipped: false,
        isMatched: false,
        isShaking: false
      });
      // Answer card
      generatedCards.push({
        uid: `${pair.id}_a`,
        pairId: pair.id,
        type: 'a',
        content: pair.a,
        isFlipped: false,
        isMatched: false,
        isShaking: false
      });
    });

    const shuffled = shuffleArray(generatedCards);
    setCards(shuffled);
    setFlippedUids([]);
    setIsLockBoard(false);
    setMoves(0);
    setMatchedPairsCount(0);
    setTimeElapsed(0);
    setGameStarted(false);
    setIsWinModalOpen(false);
  };

  useEffect(() => {
    initGame();
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [learningPairs]);

  // Timer Effect
  useEffect(() => {
    if (gameStarted && !isWinModalOpen) {
      timerRef.current = setInterval(() => {
        setTimeElapsed(prev => prev + 1);
      }, 1000);
    } else if (timerRef.current) {
      clearInterval(timerRef.current);
    }

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [gameStarted, isWinModalOpen]);

  // Handle Card Click
  const handleCardClick = (card: CardItem) => {
    if (isLockBoard) return;
    if (card.isFlipped || card.isMatched) return;

    if (!gameStarted) {
      setGameStarted(true);
    }

    // Flip current card
    const nextFlippedUids = [...flippedUids, card.uid];

    setCards(prevCards =>
      prevCards.map(c => (c.uid === card.uid ? { ...c, isFlipped: true } : c))
    );

    if (nextFlippedUids.length === 1) {
      setFlippedUids(nextFlippedUids);
      return;
    }

    // Second card flipped
    setFlippedUids([]);
    setIsLockBoard(true);
    setMoves(prev => prev + 1);

    const firstCardUid = nextFlippedUids[0];
    const secondCardUid = nextFlippedUids[1];

    const firstCard = cards.find(c => c.uid === firstCardUid);
    const secondCard = card;

    if (!firstCard) return;

    // Check Match
    const isMatch =
      firstCard.pairId === secondCard.pairId && firstCard.type !== secondCard.type;

    if (isMatch) {
      // Success match
      setTimeout(() => {
        setCards(prevCards =>
          prevCards.map(c =>
            c.uid === firstCard.uid || c.uid === secondCard.uid
              ? { ...c, isMatched: true, isFlipped: true }
              : c
          )
        );
        setIsLockBoard(false);

        const nextMatchedCount = matchedPairsCount + 1;
        setMatchedPairsCount(nextMatchedCount);

        // Check Victory
        if (nextMatchedCount === learningPairs.length) {
          setTimeout(() => {
            setIsWinModalOpen(true);
          }, 500);
        }
      }, 300);
    } else {
      // Wrong match: Shake and Flip Back
      setTimeout(() => {
        setCards(prevCards =>
          prevCards.map(c =>
            c.uid === firstCard.uid || c.uid === secondCard.uid
              ? { ...c, isShaking: true }
              : c
          )
        );
      }, 200);

      setTimeout(() => {
        setCards(prevCards =>
          prevCards.map(c =>
            c.uid === firstCard.uid || c.uid === secondCard.uid
              ? { ...c, isFlipped: false, isShaking: false }
              : c
          )
        );
        setIsLockBoard(false);
      }, 1100);
    }
  };

  // Format Time MM:SS
  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60)
      .toString()
      .padStart(2, '0');
    const s = (seconds % 60)
      .toString()
      .padStart(2, '0');
    return `${m}:${s}`;
  };

  // Score Calculation
  const score = useMemo(() => {
    if (learningPairs.length === 0) return 0;
    const baseScore = matchedPairsCount * 15;
    const penalty = Math.max(0, (moves - learningPairs.length) * 2);
    return Math.max(10 * matchedPairsCount, baseScore - penalty);
  }, [matchedPairsCount, moves, learningPairs.length]);

  const handleFinish = () => {
    if (onSubmitWork) {
      const answersMap: Record<string, number> = {};
      questions.forEach((q, idx) => {
        answersMap[q.id || `q_${idx}`] = 1;
      });
      onSubmitWork(score, matchedPairsCount, answersMap);
    }
    onClose();
  };

  return (
    <div
      className="w-full h-full flex-1 min-h-0 text-slate-800 select-none overflow-hidden relative rounded-2xl border border-slate-200/80 shadow-xl flex flex-col custom-game-container bg-slate-50"
      style={{
        backgroundImage: 'radial-gradient(circle at 50% 20%, #f8fafc 0%, #f1f5f9 60%, #e2e8f0 100%)'
      }}
      id="game-container"
    >
      {/* Dynamic Style Animations */}
      <style>{`
        .perspective-1000 {
          perspective: 1000px;
        }
        .preserve-3d {
          transform-style: preserve-3d;
        }
        .backface-hidden {
          backface-visibility: hidden;
          -webkit-backface-visibility: hidden;
        }
        .rotate-y-180 {
          transform: rotateY(180deg);
        }
        .card-inner-flip {
          transition: transform 0.5s cubic-bezier(0.4, 0.0, 0.2, 1);
        }
        .shake-anim {
          animation: shakeError 0.5s cubic-bezier(0.36, 0.07, 0.19, 0.97) both;
        }
        @keyframes shakeError {
          0%, 100% { transform: rotateY(180deg) translateX(0); }
          20%, 60% { transform: rotateY(180deg) translateX(-6px); }
          40%, 80% { transform: rotateY(180deg) translateX(6px); }
        }
        .match-pop {
          animation: matchSuccess 0.5s ease-out forwards;
        }
        @keyframes matchSuccess {
          0% { transform: rotateY(180deg) scale(1); }
          50% { transform: rotateY(180deg) scale(1.06); }
          100% { transform: rotateY(180deg) scale(1); }
        }
      `}</style>

      {/* TOP HEADER BAR */}
      <div className="p-2.5 sm:p-3.5 bg-white/90 backdrop-blur-md border-b border-slate-200/80 flex items-center justify-between gap-2 sm:gap-4 shrink-0 z-20 shadow-xs">
        <div className="flex items-center gap-2 sm:gap-3">
          <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-2xl bg-gradient-to-tr from-indigo-500 to-purple-500 flex items-center justify-center text-white shadow-md shadow-indigo-500/20 shrink-0">
            <Brain className="w-4 h-4 sm:w-5 sm:h-5" />
          </div>
          <div>
            <h1 className="text-xs sm:text-base md:text-lg font-black text-slate-800 uppercase tracking-wide">
              Lật Mảnh Ghép Kiến Thức
            </h1>
          </div>
        </div>

        {/* STATUS COUNTERS */}
        <div className="flex items-center gap-1.5 sm:gap-3">
          {/* Moves */}
          <div className="bg-rose-50 border border-rose-200/80 px-2 sm:px-3 py-1 rounded-xl flex items-center gap-1 shadow-2xs">
            <Hand className="w-3.5 h-3.5 text-rose-500 shrink-0" />
            <span className="text-[10px] sm:text-xs font-bold text-rose-700/80 hidden xs:inline">Lượt:</span>
            <span className="font-black text-rose-600 text-xs sm:text-sm">{moves}</span>
          </div>

          {/* Matches */}
          <div className="bg-emerald-50 border border-emerald-200/80 px-2 sm:px-3 py-1 rounded-xl flex items-center gap-1 shadow-2xs">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
            <span className="text-[10px] sm:text-xs font-bold text-emerald-700/80 hidden xs:inline">Khớp:</span>
            <span className="font-black text-emerald-600 text-xs sm:text-sm">
              {matchedPairsCount}/{learningPairs.length}
            </span>
          </div>
        </div>
      </div>

      {/* MAIN CARDS GRID */}
      <div className="flex-1 min-h-0 p-2 sm:p-4 flex items-center justify-center overflow-hidden z-10 w-full h-full">
        <div className="w-full h-full max-w-4xl max-h-full mx-auto flex flex-col justify-center items-center">
          {(() => {
            const totalCards = cards.length;
            const colCount = totalCards > 12 ? 4 : totalCards > 8 ? 4 : 3;
            const rowCount = Math.ceil(totalCards / colCount) || 3;

            return (
              <div
                className="grid gap-2 sm:gap-3 w-full h-full max-h-full justify-center items-stretch perspective-1000 p-1"
                style={{
                  gridTemplateColumns: `repeat(${colCount}, minmax(0, 1fr))`,
                  gridTemplateRows: `repeat(${rowCount}, minmax(0, 1fr))`
                }}
              >
                {cards.map(card => {
                  const isFlipped = card.isFlipped || card.isMatched;

                  return (
                    <div
                      key={card.uid}
                      onClick={() => handleCardClick(card)}
                      className={`w-full h-full min-h-0 relative cursor-pointer select-none rounded-xl sm:rounded-2xl ${
                        card.isShaking ? 'shake-anim' : ''
                      }`}
                    >
                      <div
                        className="w-full h-full relative rounded-xl sm:rounded-2xl shadow-md"
                        style={{
                          transformStyle: 'preserve-3d',
                          WebkitTransformStyle: 'preserve-3d',
                          transition: 'transform 0.5s cubic-bezier(0.4, 0.0, 0.2, 1)',
                          transform: isFlipped ? 'rotateY(180deg)' : 'rotateY(0deg)'
                        }}
                      >
                        {/* BACK FACE (KHI ÚP THẺ) */}
                        <div
                          className="absolute inset-0 w-full h-full bg-gradient-to-br from-indigo-500 via-indigo-600 to-purple-600 border-2 border-indigo-300/40 rounded-xl sm:rounded-2xl flex flex-col items-center justify-center p-2 text-white shadow-sm hover:shadow-indigo-500/25 hover:scale-[1.01] transition-all"
                          style={{
                            backfaceVisibility: 'hidden',
                            WebkitBackfaceVisibility: 'hidden',
                            transform: 'rotateY(0deg)'
                          }}
                        >
                          <div className="w-7 h-7 sm:w-10 sm:h-10 rounded-xl bg-white/10 border border-white/20 flex items-center justify-center text-white/90 shadow-inner mb-0.5 sm:mb-1">
                            <Brain className="w-4 h-4 sm:w-5 sm:h-5 opacity-90" />
                          </div>
                          <span className="text-[9px] sm:text-[11px] font-black uppercase tracking-wider text-indigo-100/80">
                            Ghép Nối
                          </span>
                        </div>

                        {/* FRONT FACE (KHI LẬT THẺ) */}
                        <div
                          className={`absolute inset-0 w-full h-full rounded-xl sm:rounded-2xl border-2 p-1.5 sm:p-2.5 flex flex-col items-center justify-between text-center overflow-hidden transition-colors ${
                            card.isMatched
                              ? 'bg-emerald-50/95 border-emerald-300 text-emerald-900 match-pop shadow-md shadow-emerald-500/10'
                              : 'bg-white border-slate-200 text-slate-800 shadow-md'
                          }`}
                          style={{
                            backfaceVisibility: 'hidden',
                            WebkitBackfaceVisibility: 'hidden',
                            transform: 'rotateY(180deg)'
                          }}
                        >
                          {/* Card Type Header Tag */}
                          <div
                            className={`w-full px-1.5 py-0.5 rounded-md text-[8px] sm:text-[10px] font-black uppercase tracking-wider flex items-center justify-center gap-1 shrink-0 ${
                              card.isMatched
                                ? 'bg-emerald-100 text-emerald-700'
                                : card.type === 'q'
                                  ? 'bg-indigo-50 text-indigo-700 border border-indigo-100'
                                  : 'bg-amber-50 text-amber-700 border border-amber-100'
                            }`}
                          >
                            {card.type === 'q' ? (
                              <>
                                <HelpCircle className="w-2.5 h-2.5 sm:w-3 sm:h-3 text-indigo-500 shrink-0" />
                                <span>Câu Hỏi</span>
                              </>
                            ) : (
                              <>
                                <Lightbulb className="w-2.5 h-2.5 sm:w-3 sm:h-3 text-amber-500 shrink-0" />
                                <span>Đáp Án</span>
                              </>
                            )}
                          </div>

                          {/* Card Body Content with LaTeX support */}
                          <div className="flex-1 w-full min-h-0 flex items-center justify-center overflow-y-auto custom-scrollbar my-0.5 sm:my-1">
                            <div className="text-[11px] sm:text-xs md:text-sm font-bold leading-tight break-words max-w-full">
                              <MarkdownMath content={card.content} />
                            </div>
                          </div>

                          {/* Bottom Status Icon */}
                          {card.isMatched && (
                            <div className="text-emerald-600 font-extrabold text-[9px] sm:text-[10px] flex items-center gap-1 shrink-0">
                              <CheckCircle2 className="w-3 h-3 text-emerald-500" />
                              <span>Đã Khớp</span>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            );
          })()}
        </div>
      </div>

      {/* WIN MODAL OVERLAY */}
      {isWinModalOpen && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-md flex items-center justify-center z-50 p-4">
          <div className="bg-white border-2 border-indigo-300 rounded-3xl p-6 sm:p-8 max-w-md w-full text-center shadow-2xl space-y-5 animate-pop">
            <div className="w-20 h-20 bg-gradient-to-tr from-indigo-100 to-purple-100 text-indigo-600 border-2 border-indigo-200 rounded-3xl flex items-center justify-center text-4xl mx-auto shadow-sm">
              🏆
            </div>

            <div>
              <h2 className="text-2xl sm:text-3xl font-black text-transparent bg-clip-text bg-gradient-to-r from-indigo-600 to-purple-600">
                Xuất Sắc Hoàn Thành!
              </h2>
              <p className="text-slate-600 font-semibold text-xs sm:text-sm mt-1">
                Bạn đã ghép nối thành công toàn bộ mảnh ghép kiến thức!
              </p>
            </div>

            <div className="bg-slate-50 border border-slate-200/80 rounded-2xl p-4 grid grid-cols-2 gap-4 text-center shadow-inner">
              <div>
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Số Lượt</span>
                <div className="text-xl sm:text-2xl font-black text-rose-500">{moves}</div>
              </div>
              <div>
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Điểm Số</span>
                <div className="text-xl sm:text-2xl font-black text-amber-500">{score}</div>
              </div>
            </div>

            <div className="flex gap-3 pt-2">
              {!isStudentMode && (
                <button
                  type="button"
                  onClick={initGame}
                  className="flex-1 py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200 font-extrabold text-xs sm:text-sm rounded-xl active:scale-95 transition-all flex items-center justify-center gap-2"
                >
                  <RotateCw className="w-4 h-4 text-slate-600" /> Chơi Lại Ngay
                </button>
              )}
              <button
                type="button"
                onClick={handleFinish}
                className="flex-1 py-3 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white font-extrabold text-xs sm:text-sm rounded-xl active:scale-95 transition-all shadow-md shadow-indigo-500/20 flex items-center justify-center gap-2"
              >
                <CheckCircle2 className="w-4 h-4" />
                {isStudentMode ? 'Nộp Bài & Kết Thúc' : 'Thoát'}
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
